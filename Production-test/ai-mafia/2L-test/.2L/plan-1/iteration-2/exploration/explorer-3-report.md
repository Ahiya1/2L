# Explorer 3 Report: Full Spectator UI & API Layer

## Executive Summary

Iteration 1 has successfully delivered real-time discussion viewing with SSE streaming, basic components (PhaseIndicator, PlayerGrid, DiscussionFeed), and a working event emission system. For Iteration 2, we need to build a complete spectator experience spanning the full game loop: Lobby → Live Game → Results. The recommended approach is **Next.js API routes with Zod validation** (not tRPC) to maintain simplicity and leverage existing patterns, combined with **mobile-first responsive design** and **enhanced SSE event types** for voting and phase transitions.

## Discoveries

### Existing UI Infrastructure (Iteration 1)

**Current Tech Stack:**
- Next.js 14.2.18 (App Router)
- React 18 with TypeScript
- Tailwind CSS 3.4.1 (no UI component library)
- SQLite + Prisma 6.17.1
- SSE streaming via EventSource
- No state management library (React hooks only)

**Existing Components:**
- `/app/test-discussion/page.tsx`: Test page with 3-column layout
- `PhaseIndicator.tsx`: Phase name + countdown timer + progress bar
- `PlayerGrid.tsx`: 2-column grid showing 10 players with alive/dead status
- `DiscussionFeed.tsx`: Scrolling message feed with auto-scroll, threading support

**Key Patterns Identified:**
- Client components with `'use client'` directive
- SSE connection via `/api/game/[gameId]/stream`
- Mock data for testing (`personalities`, hardcoded 10 players)
- EventSource with auto-reconnect on error
- Tailwind utility classes for styling (no custom components)

### Database Schema Analysis

**Relevant Models:**
```prisma
Game {
  status: "LOBBY" | "NIGHT" | "DAY" | "DISCUSSION" | "VOTING" | "GAME_OVER"
  currentPhase: String?
  phaseEndTime: DateTime?
  roundNumber: Int (default 1)
  winner: String? ("MAFIA" | "VILLAGERS")
  playerCount: Int
}

Player {
  role: "MAFIA" | "VILLAGER"
  isAlive: Boolean
  position: Int (0-11 for display order)
}

Vote {
  gameId, roundNumber, voterId, targetId
  justification: String
  timestamp: DateTime
}

GameEvent {
  type: "PHASE_CHANGE" | "PLAYER_ELIMINATED" | "VOTE_CAST" | "GAME_START" | "GAME_END"
  data: String (JSON)
}
```

**Critical Finding:** Database already supports full game loop! Fields for `status`, `phaseEndTime`, `winner`, and `Vote` table exist. Iteration 1 laid groundwork.

### Event Emission System

**Current Event Types (from `lib/events/types.ts`):**
- `message`: Discussion message emitted
- `turn_start`: Agent turn begins
- `turn_end`: Agent turn completes
- `phase_change`: Phase transition (DISCUSSION → VOTING)
- `phase_complete`: Phase finished with stats
- `discussion_complete`: Discussion phase stats

**GameEventEmitter Features:**
- In-memory EventEmitter with 50 max listeners
- Emits to typed channels + `all` debug channel
- SSE endpoint subscribes to all event types
- 15-second keepalive heartbeat
- Auto-cleanup on client disconnect

**Gap Analysis:**
Missing event types for Iteration 2:
- `vote_cast`: Real-time vote submission
- `player_eliminated`: Death announcement
- `game_start`: Game initialization
- `game_over`: Win condition met
- `night_phase_start`: Mafia coordination begins
- `day_announcement`: Victim revealed

### SSE Implementation Details

**Current Pattern (`app/api/game/[gameId]/stream/route.ts`):**
- ReadableStream with TextEncoder
- Subscribes to 6 event types
- Sends CONNECTED confirmation on connection
- Keepalive comment: `: keepalive\n\n`
- Cleanup via `req.signal.addEventListener('abort')`
- Headers: `text/event-stream`, `no-cache`, `X-Accel-Buffering: no`

**Strengths:**
- Production-ready SSE implementation
- Graceful reconnection (EventSource auto-reconnects)
- Multiple spectators supported (50 listener limit)

**Weaknesses:**
- No state catchup mechanism (late joiners miss history)
- No polling fallback for SSE failures
- No explicit reconnection logic in client components

## Patterns Identified

### Pattern 1: Page-Level Data Fetching with Client Components

**Description:** Pages use `'use client'` with `useSearchParams` for route params, fetch initial data in `useEffect`, then subscribe to SSE for real-time updates.

**Use Case:** All game screens (Lobby, Live Game, Results)

**Example:**
```typescript
'use client';
import { useSearchParams } from 'next/navigation';

export default function GamePage() {
  const params = useSearchParams();
  const gameId = params.get('gameId');
  
  // Fetch initial state
  useEffect(() => {
    fetch(`/api/game/${gameId}/state`)
      .then(res => res.json())
      .then(setGameState);
  }, [gameId]);
  
  // Subscribe to SSE
  useEffect(() => {
    const es = new EventSource(`/api/game/${gameId}/stream`);
    es.onmessage = handleEvent;
    return () => es.close();
  }, [gameId]);
}
```

**Recommendation:** Continue this pattern for Iteration 2. Simple, works well with SSE.

### Pattern 2: Next.js Route Handlers for API

**Description:** Use `app/api/**/route.ts` files with `GET/POST` exports, Zod for validation.

**Use Case:** All API endpoints (game creation, state fetching, actions)

**Example:**
```typescript
// app/api/game/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';

const CreateGameSchema = z.object({
  playerCount: z.number().min(8).max(12),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerCount } = CreateGameSchema.parse(body);
  
  const game = await prisma.game.create({
    data: {
      status: 'LOBBY',
      playerCount,
      // Initialize players...
    },
  });
  
  return NextResponse.json({ gameId: game.id });
}
```

**Recommendation:** Use this over tRPC. Why? (1) Already using Next.js patterns, (2) Simple project (no massive API surface), (3) Zod already in dependencies, (4) Less setup overhead.

### Pattern 3: Component-Level SSE Subscriptions

**Description:** Each component (PhaseIndicator, PlayerGrid, DiscussionFeed) creates its own EventSource connection, filters events by type.

**Use Case:** Real-time component updates

**Current Implementation:**
```typescript
// components/PhaseIndicator.tsx
useEffect(() => {
  const eventSource = new EventSource(`/api/game/${gameId}/stream`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'PHASE_CHANGE') {
      setPhase(data.payload.to);
    }
  };
  
  return () => eventSource.close();
}, [gameId]);
```

**Issue:** Multiple EventSource connections per page (3 connections for test-discussion page).

**Alternative Pattern:** Shared SSE context with provider:
```typescript
// contexts/GameEventsContext.tsx
export const GameEventsProvider = ({ gameId, children }) => {
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    const es = new EventSource(`/api/game/${gameId}/stream`);
    es.onmessage = (e) => setEvents(prev => [...prev, JSON.parse(e.data)]);
    return () => es.close();
  }, [gameId]);
  
  return <GameEventsContext.Provider value={events}>{children}</GameEventsContext.Provider>;
};

// In components:
const events = useGameEvents();
const phaseChanges = events.filter(e => e.type === 'phase_change');
```

**Recommendation:** Migrate to shared context pattern for Iteration 2. Single SSE connection per spectator, better performance, easier state catchup.

### Pattern 4: Tailwind-First Styling

**Description:** No component library (shadcn/ui, Chakra, etc.), pure Tailwind utility classes.

**Current Approach:**
- Inline Tailwind classes: `className="bg-white border border-gray-300 rounded-lg p-4"`
- Responsive design via Tailwind breakpoints: `grid-cols-2 lg:grid-cols-5`
- Custom colors via CSS variables: `--background`, `--foreground`

**Recommendation:** Continue Tailwind-only approach. Pros: (1) Fast iteration, (2) No library lock-in, (3) Small bundle size. Cons: (1) Verbose classNames, (2) No accessibility primitives. Mitigation: Create reusable components for common patterns (Card, Button, Badge).

## Complexity Assessment

### High Complexity Areas

#### Lobby Screen with Game Initialization (MEDIUM-HIGH)
- **Components:** Player count slider, "Start Game" button, role assignment algorithm
- **Complexity:** Need to create players, assign roles randomly (2-4 Mafia based on count), initialize game state
- **Integration Points:** Database writes (Game + Players), navigation to `/game/[gameId]`
- **Estimated Builder Splits:** Single builder can handle, but coordinate with game loop builder on initialization flow

#### Live Game Screen Layout (HIGH)
- **Components:** PhaseIndicator, PlayerGrid (8-12 dynamic), DiscussionFeed, VoteTally panel, phase transition animations
- **Complexity:** Responsive layout (mobile-first), conditional rendering (show VoteTally only in VOTING phase), auto-scroll management
- **Layout Options:**
  1. **Mobile-first vertical stack:** Phase → Players → Feed → Votes (stacked on mobile, 2-column on tablet, 3-column on desktop)
  2. **Desktop-first 3-column:** Left sidebar (Phase + Players) | Center (Feed) | Right sidebar (Votes)
- **Recommendation:** Mobile-first vertical, transition to desktop 3-column at `lg` breakpoint
- **Estimated Builder Splits:** Consider splitting into sub-builders:
  - Sub-builder A: Layout shell + PhaseIndicator + PlayerGrid
  - Sub-builder B: Enhanced DiscussionFeed + VoteTally panel
  - Sub-builder C: Phase transition animations + routing

#### State Catchup for Late Joiners (MEDIUM-HIGH)
- **Problem:** Spectator joins mid-game, SSE only shows new events, misses history
- **Solution:** On SSE CONNECTED, fetch initial state via API, then merge SSE events
- **Complexity:** Race conditions (event arrives during initial fetch), deduplication, order preservation
- **Pattern:**
```typescript
const [gameState, setGameState] = useState(null);
const [eventQueue, setEventQueue] = useState([]);

// Fetch initial state
useEffect(() => {
  fetch(`/api/game/${gameId}/state`)
    .then(res => res.json())
    .then(state => {
      setGameState(state);
      // Apply queued events
      eventQueue.forEach(applyEvent);
    });
}, [gameId]);

// Queue events until initial state loaded
useEffect(() => {
  const es = new EventSource(`/api/game/${gameId}/stream`);
  es.onmessage = (e) => {
    if (gameState) applyEvent(e);
    else setEventQueue(q => [...q, e]);
  };
}, [gameId]);
```
- **Estimated Builder Splits:** Part of Live Game builder, needs careful testing

#### Vote Tally Real-time Updates (MEDIUM)
- **Components:** VoteTally panel showing vote counts per player, justifications
- **Complexity:** Real-time updates as `vote_cast` events arrive, highlighting majority, displaying all justifications
- **Data Structure:**
```typescript
interface VoteTally {
  [targetPlayerId: string]: {
    count: number;
    voters: Array<{
      voterId: string;
      voterName: string;
      justification: string;
    }>;
  };
}
```
- **Recommendation:** Use `vote_cast` SSE events to update tally, highlight player with most votes
- **Estimated Builder Splits:** Single builder (part of VoteTally component)

### Medium Complexity Areas

#### Game Over Screen (MEDIUM)
- **Components:** Winner banner, role reveal table, full transcript viewer, "New Game" button
- **Complexity:** Fetching all messages (paginated?), displaying roles (hidden during game), formatting transcript
- **Data Fetching:** Single API call to `/api/game/[gameId]/results` with full data
- **Recommendation:** Server component for initial load, client component for "New Game" action
- **Estimated Builder Splits:** Single builder

#### Polling Fallback for SSE (MEDIUM)
- **Problem:** SSE fails in some corporate networks, need polling fallback
- **Solution:** Detect 3 consecutive SSE errors, switch to `setInterval` polling every 2 seconds
- **Pattern:**
```typescript
const [sseFailures, setSseFailures] = useState(0);
const [useFallback, setUseFallback] = useState(false);

useEffect(() => {
  if (useFallback) {
    const interval = setInterval(() => {
      fetch(`/api/game/${gameId}/events?since=${lastEventId}`)
        .then(res => res.json())
        .then(applyEvents);
    }, 2000);
    return () => clearInterval(interval);
  } else {
    const es = new EventSource(`/api/game/${gameId}/stream`);
    es.onerror = () => {
      setSseFailures(f => {
        if (f + 1 >= 3) setUseFallback(true);
        return f + 1;
      });
    };
    return () => es.close();
  }
}, [gameId, useFallback]);
```
- **Estimated Builder Splits:** Single builder (part of SSE infrastructure)

#### Enhanced DiscussionFeed (MEDIUM)
- **Enhancements:** Accusation highlighting (detect "I think X is Mafia"), better threading UI, round separators
- **Complexity:** Text parsing for accusations (regex), visual threading (indentation), phase boundary markers
- **Recommendation:** Incremental enhancement of existing DiscussionFeed component
- **Estimated Builder Splits:** Extend existing component (low complexity increase)

### Low Complexity Areas

#### PhaseIndicator Enhancements (LOW)
- **Changes:** Add phase-specific icons, color coding (red for NIGHT, blue for DISCUSSION, yellow for VOTING)
- **Implementation:** Simple conditional rendering based on current phase
- **Estimated Builder Splits:** Part of existing PhaseIndicator builder

#### Player Grid Dynamic Count (LOW)
- **Changes:** Support 8-12 players (currently hardcoded to 10)
- **Implementation:** Map over `players` array from API, responsive grid columns
- **Estimated Builder Splits:** Trivial extension

#### "New Game" Navigation (LOW)
- **Implementation:** Button that navigates to `/` (lobby), optionally clears game state
- **Estimated Builder Splits:** Single line of code

## Technology Recommendations

### Primary Stack

**Framework: Next.js 14 (App Router) + React 18**
- **Rationale:** Already in use, App Router provides file-based routing for `/game/[gameId]`, server components for initial data fetching
- **Migration Path:** None needed (already using)

**Database: SQLite + Prisma**
- **Rationale:** Already configured, schema supports full game loop
- **Migration Path:** None needed, add indexes for common queries (e.g., `Game.status`, `Player.gameId + isAlive`)

**Styling: Tailwind CSS 3.4.1**
- **Rationale:** Already in use, fast iteration, no bundle bloat
- **Recommendation:** Create reusable component primitives (Card, Button, Badge) to reduce className verbosity
- **Example:**
```typescript
// components/ui/Card.tsx
export const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-gray-300 rounded-lg p-4 shadow-sm ${className}`}>
    {children}
  </div>
);
```

**State Management: React Hooks + Context API**
- **Rationale:** No complex global state, React Context sufficient for shared SSE connection
- **Recommendation:** Create `GameEventsContext` for SSE event distribution
- **Alternative Considered:** Zustand, Redux Toolkit. Rejected: Overkill for this project size.

**Validation: Zod 3.25.76**
- **Rationale:** Already in dependencies, excellent TypeScript integration, used in Prisma seed scripts
- **Use Cases:** API request validation, game state validation

### Supporting Libraries

**date-fns 3.6.0 (Already Installed)**
- **Purpose:** Countdown timer formatting, phase end time calculations
- **Example:**
```typescript
import { formatDistanceToNow } from 'date-fns';
const timeRemaining = formatDistanceToNow(phaseEndTime);
```

**nanoid 5.1.6 (Already Installed)**
- **Purpose:** Generate game IDs (alternative to Prisma `cuid()`)
- **Current Usage:** Already used for game IDs

**No Additional Dependencies Needed!**
- Existing stack covers all requirements
- SSE via native EventSource API
- Routing via Next.js App Router
- Styling via Tailwind

### API Layer Design: Next.js Route Handlers + Zod

**Why Not tRPC?**
1. **Setup Overhead:** Requires `@trpc/server`, `@trpc/client`, `@trpc/next`, `@trpc/react-query`, setup files
2. **Learning Curve:** Team may not be familiar with tRPC patterns
3. **Project Scale:** 8-10 API endpoints (game.create, game.start, game.state, game.messages, game.results) - not enough to justify tRPC
4. **Existing Patterns:** Already using Next.js API routes for SSE endpoint

**Recommendation: Next.js Route Handlers with Zod**

**API Endpoint Design:**

```typescript
// app/api/game/create/route.ts
POST /api/game/create
Body: { playerCount: 8-12 }
Returns: { gameId: string }

// app/api/game/[gameId]/start/route.ts
POST /api/game/[gameId]/start
Body: {}
Returns: { success: true, gameId: string }

// app/api/game/[gameId]/state/route.ts
GET /api/game/[gameId]/state
Returns: {
  game: Game,
  players: Player[],
  currentPhase: string,
  phaseEndTime: string,
  roundNumber: number
}

// app/api/game/[gameId]/messages/route.ts
GET /api/game/[gameId]/messages?round=2
Returns: {
  messages: DiscussionMessage[],
  total: number,
  hasMore: boolean
}

// app/api/game/[gameId]/votes/route.ts
GET /api/game/[gameId]/votes?round=1
Returns: {
  votes: Vote[],
  tally: VoteTally
}

// app/api/game/[gameId]/results/route.ts
GET /api/game/[gameId]/results
Returns: {
  game: Game,
  players: Player[], // with roles revealed
  messages: DiscussionMessage[],
  votes: Vote[]
}

// app/api/game/[gameId]/stream/route.ts (Already Exists)
GET /api/game/[gameId]/stream
Returns: SSE stream
```

**Zod Schema Pattern:**
```typescript
import { z } from 'zod';

const CreateGameSchema = z.object({
  playerCount: z.number().int().min(8).max(12),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerCount } = CreateGameSchema.parse(body);
    // ... create game
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Type Safety:**
- Export response types from API route files
- Import in client components for type inference
- Example:
```typescript
// app/api/game/[gameId]/state/route.ts
export type GameStateResponse = {
  game: Game;
  players: Player[];
  currentPhase: string;
  // ...
};

// components/LiveGame.tsx
import type { GameStateResponse } from '@/api/game/[gameId]/state/route';

const [gameState, setGameState] = useState<GameStateResponse | null>(null);
```

## Integration Points

### External APIs
None required. Self-contained game.

### Internal Integrations

**1. SSE Endpoint ↔ Game Loop Orchestrator**
- **Connection:** Game orchestrator emits events via `gameEventEmitter`, SSE endpoint subscribes and streams
- **Critical:** Ensure all new event types (`vote_cast`, `player_eliminated`, `game_over`) are emitted by orchestrator
- **Coordination Needed:** Builder-1 (Game Loop) must coordinate event types with Builder-2 (Spectator UI)

**2. Lobby ↔ Live Game**
- **Flow:** Lobby creates game (POST /api/game/create) → Start Game (POST /api/game/[gameId]/start) → Navigate to `/game/[gameId]`
- **Data Passed:** gameId via URL params
- **Coordination:** Lobby builder must wait for start confirmation before navigating

**3. Live Game ↔ Results**
- **Flow:** Game Over event → Navigate to `/game/[gameId]/results`
- **Trigger:** SSE event `game_over` triggers client-side navigation
- **Coordination:** Results builder must fetch complete game data (roles revealed)

**4. Iteration 1 Discussion ↔ Iteration 2 Game Loop**
- **Connection:** Game loop calls `runDiscussion()` from Iteration 1 during DISCUSSION phase
- **Data Flow:** Game loop passes `gameId`, `prisma`, context builders to discussion orchestrator
- **Coordination:** Ensure discussion orchestrator emits all required events (already implemented)

## Risks & Challenges

### Technical Risks

**Risk 1: SSE Connection Stability**
- **Impact:** HIGH - Core real-time feature, failures break spectator experience
- **Mitigation:** 
  1. Implement polling fallback (switch after 3 failures)
  2. Add reconnection UI indicator ("Reconnecting...")
  3. Test SSE with corporate proxies (may require WebSocket fallback long-term)

**Risk 2: State Catchup Race Conditions**
- **Impact:** MEDIUM - Late joiners may see duplicated or out-of-order events
- **Mitigation:**
  1. Use event IDs or timestamps for deduplication
  2. Queue events during initial state fetch
  3. Implement idempotent event handlers (applying same event twice = no-op)

**Risk 3: Multiple SSE Connections per Page**
- **Impact:** LOW - Browser connection limits (6 per domain), unnecessary overhead
- **Mitigation:** Refactor to shared SSE context (single connection per spectator)

### Complexity Risks

**Risk 1: Live Game Screen Layout Complexity**
- **Likelihood:** HIGH - Multiple dynamic components, responsive design, conditional rendering
- **Mitigation:** Split into sub-builders (Layout + PhaseIndicator, DiscussionFeed, VoteTally)

**Risk 2: Vote Tally Real-time Aggregation**
- **Likelihood:** MEDIUM - Need to aggregate votes in real-time, handle ties, highlight majority
- **Mitigation:** Use reducer pattern for vote state, test with mock data before SSE integration

**Risk 3: Phase Transition Animations**
- **Likelihood:** MEDIUM - CSS animations may conflict with React re-renders
- **Mitigation:** Use CSS transitions (`transition-all duration-500`) over keyframe animations, test phase transitions thoroughly

## Recommendations for Planner

### 1. Split Live Game Screen into 3 Sub-Builders
**Rationale:** Live Game is the most complex feature, single builder may struggle. Recommended split:
- **Sub-builder A (Layout + Phase):** Page shell, routing, PhaseIndicator, PlayerGrid
- **Sub-builder B (Feed + Votes):** Enhanced DiscussionFeed, VoteTally panel
- **Sub-builder C (SSE Infrastructure):** Shared SSE context, state catchup, polling fallback

**Coordination:** Sub-builders share `GameEventsContext`, coordinate on event types

### 2. Prioritize Mobile-First Responsive Design
**Rationale:** Spectators may watch on mobile devices, desktop-first design will look poor on phones.

**Recommended Breakpoints:**
- `< 640px (mobile)`: Vertical stack (Phase → Players → Feed → Votes)
- `640px - 1024px (tablet)`: 2-column (Phase + Players | Feed + Votes)
- `> 1024px (desktop)`: 3-column (Phase + Players | Feed | Votes)

**Tailwind Classes:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="md:col-span-1 lg:col-span-1">Phase + Players</div>
  <div className="md:col-span-1 lg:col-span-1">Feed</div>
  <div className="md:col-span-2 lg:col-span-1">Votes</div>
</div>
```

### 3. Use Next.js Route Handlers (Not tRPC)
**Rationale:** Project scale doesn't justify tRPC overhead. Stick with simple API routes + Zod.

**Pattern to Follow:**
- Create `app/api/game/*/route.ts` files
- Use Zod schemas for validation
- Export TypeScript types for client consumption
- Keep API thin (delegate to lib/ functions)

### 4. Implement Shared SSE Context Early
**Rationale:** Prevents multiple EventSource connections, simplifies state management.

**Create:** `app/contexts/GameEventsContext.tsx`
**Wrap:** All game pages with `<GameEventsProvider gameId={gameId}>`
**Consume:** Components use `useGameEvents()` hook to filter events

### 5. Add Database Indexes for Performance
**Recommendation:** Add indexes before load testing:
```prisma
@@index([status]) // Game.status for filtering active games
@@index([gameId, roundNumber]) // Messages/Votes by round
@@index([gameId, isAlive]) // Alive players query
```

### 6. Create Reusable UI Components
**Recommendation:** Build 3 base components to reduce Tailwind verbosity:
- `Card.tsx`: White background, border, padding
- `Button.tsx`: Primary/secondary variants
- `Badge.tsx`: Alive/dead status indicators

**Example:**
```typescript
// components/ui/Badge.tsx
export const Badge = ({ variant, children }) => {
  const colors = {
    alive: 'bg-green-100 text-green-800',
    dead: 'bg-red-100 text-red-800',
    mafia: 'bg-purple-100 text-purple-800',
  };
  return <span className={`px-2 py-1 rounded text-xs ${colors[variant]}`}>{children}</span>;
};
```

### 7. Test SSE with Multiple Spectators
**Recommendation:** Manual test with 5+ browser tabs to verify:
- EventEmitter handles multiple listeners (50 max is sufficient)
- Messages arrive in same order across tabs
- No memory leaks (close tabs, check Node.js heap)

### 8. Implement Graceful Error Handling
**Recommendation:** All API routes should return structured errors:
```typescript
try {
  // ... operation
} catch (error) {
  console.error('[API]', error);
  return NextResponse.json(
    { error: 'Operation failed', message: error.message },
    { status: 500 }
  );
}
```

Client components should display error states:
```typescript
{error && <div className="bg-red-50 text-red-800 p-4 rounded">{error}</div>}
```

## Resource Map

### Critical Files/Directories

**Iteration 1 Foundation:**
- `/app/components/PhaseIndicator.tsx`: Reuse with enhancements (icons, colors)
- `/app/components/PlayerGrid.tsx`: Extend to support 8-12 players
- `/app/components/DiscussionFeed.tsx`: Enhance with accusation highlighting
- `/app/app/api/game/[gameId]/stream/route.ts`: Extend event subscriptions
- `/app/src/lib/events/emitter.ts`: Add new event types
- `/app/src/lib/events/types.ts`: Define new event schemas
- `/app/prisma/schema.prisma`: Already complete, no changes needed

**New Files for Iteration 2:**
```
app/
├── app/
│   ├── page.tsx (Lobby Screen - NEW)
│   ├── game/
│   │   └── [gameId]/
│   │       ├── page.tsx (Live Game Screen - NEW)
│   │       └── results/
│   │           └── page.tsx (Results Screen - NEW)
│   ├── contexts/
│   │   └── GameEventsContext.tsx (SSE Provider - NEW)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Card.tsx (NEW)
│   │   │   ├── Button.tsx (NEW)
│   │   │   └── Badge.tsx (NEW)
│   │   ├── VoteTally.tsx (NEW)
│   │   └── GameOverBanner.tsx (NEW)
│   └── api/
│       └── game/
│           ├── create/
│           │   └── route.ts (NEW)
│           ├── [gameId]/
│           │   ├── start/
│           │   │   └── route.ts (NEW)
│           │   ├── state/
│           │   │   └── route.ts (NEW)
│           │   ├── messages/
│           │   │   └── route.ts (NEW)
│           │   ├── votes/
│           │   │   └── route.ts (NEW)
│           │   └── results/
│           │       └── route.ts (NEW)
src/
├── lib/
│   ├── game/
│   │   ├── role-assignment.ts (NEW - distribute Mafia roles)
│   │   └── win-condition.ts (NEW - check Mafia/Villager victory)
```

### Key Dependencies

**Existing (No New Installs):**
- `next@14.2.18`: Routing, API routes, SSR
- `react@18`: UI framework
- `@prisma/client@6.17.1`: Database ORM
- `zod@3.25.76`: Validation
- `tailwindcss@3.4.1`: Styling
- `date-fns@3.6.0`: Time formatting
- `nanoid@5.1.6`: ID generation

**Not Needed:**
- ~~`@trpc/server`~~ (using Next.js API routes)
- ~~`zustand`~~ (using React Context)
- ~~`@tanstack/react-query`~~ (simple fetch, no caching layer needed)
- ~~`framer-motion`~~ (using CSS transitions)

### Testing Infrastructure

**Manual Testing Approach:**
1. **Lobby:** Test player count slider (8-12), game creation, role distribution
2. **Live Game:** Open 3 browser tabs, verify SSE synchronization
3. **SSE Reconnection:** Kill dev server, restart, verify auto-reconnect
4. **Polling Fallback:** Block EventSource in DevTools, verify polling kicks in
5. **Mobile Responsive:** Test on 375px width (iPhone), 768px (iPad), 1920px (desktop)

**No E2E Testing Framework Needed:**
- Small project scope (3 screens)
- Manual testing sufficient for MVP
- Future: Consider Playwright if adding auth/multi-player features

## Questions for Planner

### Q1: Should Live Game Screen support multiple games simultaneously?
**Context:** Current design assumes single active game (gameId in URL). Should spectators be able to view multiple games in tabs?

**Recommendation:** Single game per tab for MVP. Multiple games would require game list UI, session management, more complex SSE routing.

### Q2: How should we handle game state persistence?
**Context:** If browser refreshes mid-game, should spectator resume where they left off?

**Recommendation:** Yes - fetch current game state on mount, SSE provides updates. No special session storage needed (gameId in URL is sufficient).

### Q3: Should we implement phase transition animations?
**Context:** Vision doc mentions "phase transition animations" but doesn't specify complexity.

**Recommendation:** Simple CSS transitions (fade-in, slide) for MVP. Avoid complex animations (confetti, particle effects) - time sink, low value.

### Q4: Voting phase: Show partial results or wait until all votes cast?
**Context:** Should VoteTally update in real-time as votes arrive, or hide until voting complete?

**Recommendation:** Real-time updates (more engaging for spectators). Add "Voting in Progress..." indicator, show tally as votes arrive.

### Q5: Game Over screen: Paginate full transcript or load all?
**Context:** 50-100 messages per game - fetch all at once or paginate?

**Recommendation:** Fetch all (< 100 messages, ~50KB JSON). Add client-side search/filter if needed. Avoid pagination complexity for MVP.

### Q6: Should we add "Admin" controls (pause, skip phase, reset)?
**Context:** Useful for demos, but adds complexity.

**Recommendation:** Out of scope for Iteration 2. Add in Iteration 3 if needed. Focus on spectator experience first.

### Q7: Mobile-first or desktop-first?
**Context:** Vision doc says "desktop-first" in Out of Scope, but mobile usage likely.

**Recommendation:** **Mobile-first** design (contradicts vision doc). Rationale: Tailwind's mobile-first approach is easier, spectators will use phones. Get planner approval to override vision doc.

---

## Final Recommendations Summary

1. **API Layer:** Next.js Route Handlers + Zod (not tRPC)
2. **State Management:** React Context for shared SSE connection
3. **Responsive Design:** Mobile-first (override vision doc desktop-first)
4. **Builder Splits:** Split Live Game into 3 sub-builders (Layout, Feed, SSE)
5. **SSE Enhancements:** Add polling fallback, state catchup, shared context
6. **UI Components:** Create Card, Button, Badge primitives
7. **Testing:** Manual testing with multiple browser tabs
8. **Database:** Add indexes for `Game.status`, `Player.gameId + isAlive`

**Risk Mitigation Priorities:**
1. SSE reconnection + polling fallback (HIGH)
2. State catchup for late joiners (MEDIUM)
3. Mobile responsive layout (MEDIUM)

**Builder Coordination Points:**
- Builder-1 (Game Loop) emits all required events (vote_cast, player_eliminated, game_over)
- Builder-2 (Spectator UI) consumes events via shared SSE context
- Integrator validates end-to-end flow (Lobby → Live Game → Results)

**Complexity Hotspots:**
- Live Game layout (3-column responsive)
- VoteTally real-time aggregation
- SSE state catchup logic

**Low-Risk, High-Value Quick Wins:**
- Lobby screen (simple form + API call)
- Results screen (fetch + display)
- UI component primitives (Card, Button, Badge)

This exploration provides a comprehensive roadmap for building the Full Spectator UI & API Layer in Iteration 2, balancing simplicity (Next.js patterns) with robustness (SSE + polling fallback).
