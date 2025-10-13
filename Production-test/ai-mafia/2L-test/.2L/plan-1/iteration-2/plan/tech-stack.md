# Technology Stack - Iteration 2

## Core Framework

**Decision:** Next.js 14.2.18 (App Router) + React 18 + TypeScript 5.6.3 (Strict Mode)

**Rationale:**
- Already validated in Iteration 1 - zero migration cost
- App Router provides file-based routing for `/game/[gameId]` and `/game/[gameId]/results`
- Server Components for initial data fetching, Client Components for real-time updates
- TypeScript strict mode caught 100% of type errors in Iteration 1

**Alternatives Considered:**
- Remix: Rejected - would require full rewrite, no compelling benefit over Next.js for this use case
- Plain React SPA: Rejected - loses SSR benefits, complicates API routing

**Implementation Notes:**
- Continue using App Router patterns from Iteration 1
- Client components marked with `'use client'` directive
- Server components for `/game/[gameId]/results` initial load

## Database

**Decision:** SQLite 3.x + Prisma 6.17.1 (ORM)

**Rationale:**
- Already configured in Iteration 1 with excellent performance
- WAL mode handles concurrent reads (10+ spectators tested successfully)
- Single-game scenario doesn't require PostgreSQL scale
- Prisma migrations enable incremental schema changes

**Schema Strategy:**

**New Table:**
```prisma
model NightMessage {
  id          String   @id @default(cuid())
  gameId      String
  roundNumber Int
  playerId    String
  message     String
  inReplyToId String?
  timestamp   DateTime @default(now())
  turn        Int

  game      Game          @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player    Player        @relation("NightMessageAuthor", fields: [playerId], references: [id], onDelete: Cascade)
  inReplyTo NightMessage? @relation("NightReplyThread", fields: [inReplyToId], references: [id], onDelete: SetNull)
  replies   NightMessage[] @relation("NightReplyThread")

  @@index([gameId, roundNumber, timestamp])
  @@index([gameId, playerId])
}
```

**Extended Tables:**
```prisma
// Game table additions
model Game {
  // Existing fields from Iteration 1...
  currentPhase      String?       // "NIGHT" | "DAY" | "DISCUSSION" | "VOTING" | "GAME_OVER"
  phaseStartTime    DateTime?     // When current phase started
  nightVictim       String?       // Victim ID for Day reveal (cleared after announcement)

  nightMessages     NightMessage[]
}

// Player table additions
model Player {
  // Existing fields from Iteration 1...
  eliminatedInRound Int?          // Which round player was eliminated
  eliminationType   String?       // "NIGHTKILL" | "DAYKILL"

  nightMessages     NightMessage[] @relation("NightMessageAuthor")
}

// Vote table additions
model Vote {
  // Existing fields from Iteration 1...
  phaseType         String        // "VOTING" (vs future "NIGHT" if we add Mafia voting)
  voteOrder         Int           // Sequence within voting phase
}
```

**Migration Strategy:**
- Run `npx prisma migrate dev --name iteration-2-phases`
- All changes are additive (no breaking changes)
- Default values ensure backward compatibility
- Test migration on copy of Iteration 1 database first

**New Indexes:**
```prisma
@@index([gameId, role, isAlive]) // on Player - for Mafia/alive queries
@@index([gameId, roundNumber, targetId]) // on Vote - for tally queries
@@index([status]) // on Game - for filtering active games
```

## AI Model

**Decision:** Claude 4.5 Sonnet (`claude-sonnet-4.5-20250929`)

**Rationale:**
- Validated in Iteration 1 Discussion phase
- 200K context window sufficient for full game history
- Prompt caching CRITICAL - 73% cost reduction verified in Iteration 1
- Temperature 0.8 produces strategic variety without incoherence

**Prompt Caching Strategy:**
- Extend Iteration 1 caching to Night and Voting phases
- Cache structure: System prompt + full game history (unchanging)
- Dynamic context: Current phase instructions (uncached)
- Expected cost per game: $3-5 (Night: $0.50, Discussion: $1.50, Voting: $0.80, Day: $0.20)

**Phase-Specific Prompts:**

**Night Phase (Mafia-only):**
```typescript
const NIGHT_PHASE_PROMPT = `
NIGHT PHASE - PRIVATE MAFIA COORDINATION

You are meeting privately with fellow Mafia members to choose tonight's victim.

Instructions:
1. Propose a Villager to eliminate (avoid targeting Mafia teammates)
2. Discuss strategic reasoning (which Villager poses the greatest threat?)
3. Build consensus - you'll vote after coordination completes

Keep responses brief (15-30 words). Coordinate efficiently.

Remember: Villagers cannot see this conversation. Be candid about your strategy.
`;
```

**Voting Phase:**
```typescript
const VOTING_PHASE_PROMPT = `
VOTING PHASE

Based on the Discussion phase, vote to eliminate one player.

Instructions:
1. State: "I vote for Agent-X"
2. Provide 2-3 sentence justification citing specific Discussion evidence
3. You cannot abstain

Strategy:
- If Mafia: Vote to eliminate Villagers, deflect suspicion from allies
- If Villager: Vote for who you believe is Mafia based on Discussion patterns
`;
```

**Day Announcement:**
```typescript
const DAY_REACTION_PROMPT = `
MORNING ANNOUNCEMENT

Agent {victimName} was eliminated last night by the Mafia.

React to this news in 1-2 sentences.
- If Mafia: Act surprised, blend in
- If Villager: Express shock or voice suspicions

Keep it brief.
`;
```

**Implementation Notes:**
- Reuse Iteration 1 Claude client wrapper
- Same timeout handling (10 seconds per turn with Promise.race)
- Same fallback response generation on timeout
- Same cost tracking with phase field added

## API Layer

**Decision:** Next.js Route Handlers + Zod (NOT tRPC)

**Rationale:**
- Simple project scale (6 new endpoints) doesn't justify tRPC overhead
- Already using Next.js API routes for SSE endpoint in Iteration 1
- Zod already in dependencies (Prisma seed scripts)
- Team familiar with Next.js patterns
- Type safety via exported response types

**Alternatives Considered:**
- tRPC: Rejected - setup overhead (@trpc/server, @trpc/client, @trpc/next, @trpc/react-query), learning curve, overkill for 6 endpoints

**New API Endpoints:**

```typescript
// 1. POST /api/game/create
// Body: { playerCount: number }
// Returns: { gameId: string }

// 2. POST /api/game/[gameId]/start
// Body: {}
// Returns: { success: true, gameId: string }

// 3. GET /api/game/[gameId]/state
// Returns: {
//   game: Game,
//   players: Player[],
//   currentPhase: string,
//   phaseEndTime: string | null,
//   roundNumber: number
// }

// 4. GET /api/game/[gameId]/messages?round=2
// Returns: {
//   messages: DiscussionMessage[],
//   total: number,
//   hasMore: boolean
// }

// 5. GET /api/game/[gameId]/votes?round=1
// Returns: {
//   votes: Vote[],
//   tally: Record<string, number>
// }

// 6. GET /api/game/[gameId]/results
// Returns: {
//   game: Game,
//   players: Player[], // roles revealed
//   messages: DiscussionMessage[],
//   votes: Vote[],
//   nightMessages: NightMessage[] // for post-game analysis
// }
```

**Validation Pattern:**
```typescript
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const CreateGameSchema = z.object({
  playerCount: z.number().int().min(8).max(12),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerCount } = CreateGameSchema.parse(body);

    // ... create game logic

    return NextResponse.json({ gameId: game.id });
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
```typescript
// Export response types from API routes
export type GameStateResponse = {
  game: Game;
  players: Player[];
  currentPhase: string;
  phaseEndTime: string | null;
  roundNumber: number;
};

// Import in components
import type { GameStateResponse } from '@/app/api/game/[gameId]/state/route';
```

## Frontend

**Decision:** React 18 with TypeScript (Client Components)

**UI Component Library:** None (Tailwind-only)

**Styling:** Tailwind CSS 3.4.1

**Rationale:**
- Iteration 1 proved Tailwind-only approach works well
- No component library lock-in
- Small bundle size
- Fast iteration without learning new component APIs
- Create 3 reusable primitives (Card, Button, Badge) to reduce verbosity

**Responsive Strategy:**
- Mobile-first approach (contradicts vision doc "desktop-first" but more practical)
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px)
- Live Game layout: Vertical stack on mobile, 2-column on tablet, 3-column on desktop

**State Management:**
- React hooks (useState, useEffect, useReducer)
- Context API for shared SSE connection (no Zustand/Redux needed)
- No global state beyond SSE events

**Component Primitives:**
```typescript
// components/ui/Card.tsx
export const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-white border border-gray-300 rounded-lg p-4 shadow-sm ${className}`}>
    {children}
  </div>
);

// components/ui/Button.tsx
export const Button = ({ variant = 'primary', children, ...props }: ButtonProps) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  };
  return (
    <button
      className={`px-4 py-2 rounded font-medium ${variants[variant]}`}
      {...props}
    >
      {children}
    </button>
  );
};

// components/ui/Badge.tsx
export const Badge = ({ variant, children }: BadgeProps) => {
  const variants = {
    alive: 'bg-green-100 text-green-800',
    dead: 'bg-red-100 text-red-800',
    mafia: 'bg-purple-100 text-purple-800',
    villager: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};
```

## Real-time Updates

**Decision:** Server-Sent Events (SSE) with polling fallback

**Rationale:**
- Already implemented successfully in Iteration 1
- Simpler than WebSockets for unidirectional updates
- EventSource API auto-reconnects on disconnect
- Works with Next.js Route Handlers

**Extended Event Types:**
```typescript
export type GameEventType =
  // Iteration 1 events
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete'
  // Iteration 2 new events
  | 'night_start'
  | 'night_complete'
  | 'nightkill'           // Day announcement of victim
  | 'day_reaction'        // Agent reacts to death
  | 'vote_cast'           // Real-time vote submission
  | 'voting_complete'     // All votes tallied
  | 'player_eliminated'   // Death announcement
  | 'round_start'         // New round begins
  | 'game_over';          // Win condition met
```

**SSE Implementation:**
- Existing `/api/game/[gameId]/stream` endpoint extends event subscriptions
- 15-second keepalive heartbeat (unchanged from Iteration 1)
- Max listeners: 50 (sufficient for spectator load)
- Cleanup on client disconnect via `req.signal.addEventListener('abort')`

**Polling Fallback:**
```typescript
// Client-side polling after 3 SSE failures
const [sseFailures, setSseFailures] = useState(0);
const [usePolling, setUsePolling] = useState(false);

useEffect(() => {
  if (usePolling) {
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
        if (f + 1 >= 3) setUsePolling(true);
        return f + 1;
      });
    };
    return () => es.close();
  }
}, [gameId, usePolling]);
```

**State Catchup Pattern:**
```typescript
// Prevent race condition when spectator joins mid-game
const [gameState, setGameState] = useState<GameState | null>(null);
const [eventQueue, setEventQueue] = useState<GameEvent[]>([]);

// 1. Fetch initial state
useEffect(() => {
  fetch(`/api/game/${gameId}/state`)
    .then(res => res.json())
    .then(state => {
      setGameState(state);
      // Apply queued events
      eventQueue.forEach(applyEvent);
      setEventQueue([]);
    });
}, [gameId]);

// 2. Queue events until initial state loaded
useEffect(() => {
  const es = new EventSource(`/api/game/${gameId}/stream`);
  es.onmessage = (e) => {
    const event = JSON.parse(e.data);
    if (gameState) {
      applyEvent(event);
    } else {
      setEventQueue(q => [...q, event]);
    }
  };
}, [gameId, gameState]);
```

## External Integrations

**Anthropic Claude API:**
- Library: `@anthropic-ai/sdk@0.65.0` (already installed)
- Authentication: `ANTHROPIC_API_KEY` environment variable (read from `.anthropic-key.txt`)
- Model: `claude-sonnet-4.5-20250929`
- Features used: Messages API, Prompt Caching
- No changes from Iteration 1 integration

## Development Tools

### Testing

**Framework:** Manual testing + CLI test harness (no automated test framework)

**Coverage target:** N/A for MVP

**Strategy:**
- Unit tests for critical logic: Win checker, vote tally, consensus algorithm (if time permits)
- Integration test: CLI harness runs full game loop
- Manual UI testing: 5+ full games with different player counts

**CLI Test Harness:**
```bash
npm run test-full-game
# Runs: NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK (repeat until win)
# Logs: Full transcript, cost per phase, event sequence
# Output: logs/full-game-{timestamp}.txt
```

### Code Quality

**Linter:** ESLint (default Next.js config)

**Formatter:** Prettier (default Next.js config)

**Type Checking:** TypeScript strict mode (enabled)

**Pre-commit:** None (manual lint before commits)

### Build & Deploy

**Build tool:** Next.js built-in (Turbopack for dev, Webpack for prod)

**Deployment target:** Vercel (Next.js native platform)

**CI/CD:** Manual deployment for MVP (automatic deploys in Iteration 3)

## Environment Variables

All required environment variables:

- `ANTHROPIC_API_KEY`: Claude API key (read from `.anthropic-key.txt` in root)
- `DATABASE_URL`: SQLite connection string (default: `file:./prisma/dev.db`)
- `NODE_ENV`: `development` | `production`
- `NEXT_PUBLIC_APP_URL`: Base URL for sharing game links (optional)

## Dependencies Overview

**Core Dependencies (No Changes):**
- `next@14.2.18`: Framework
- `react@18`: UI library
- `@prisma/client@6.17.1`: Database ORM
- `@anthropic-ai/sdk@0.65.0`: Claude API client
- `zod@3.25.76`: Schema validation
- `tailwindcss@3.4.1`: Styling

**Supporting Libraries (Already Installed):**
- `date-fns@3.6.0`: Countdown timer formatting
- `nanoid@5.1.6`: Game ID generation

**No New Dependencies Needed:**
- SSE via native EventSource API
- Routing via Next.js App Router
- State management via React Context API
- Styling via Tailwind utilities

## Performance Targets

- First Contentful Paint: < 1.5s (acceptable for spectator app)
- Bundle size: < 250KB (current: ~180KB from Iteration 1)
- API response time: < 200ms (database queries)
- SSE latency: < 500ms (message delivery)
- Full game duration: 30-40 minutes (5 phases × 3 rounds)
- Cost per game: < $5 (with prompt caching)

## Security Considerations

**API Key Protection:**
- `.anthropic-key.txt` in `.gitignore` (already configured)
- Never expose API key to client
- Server-side API calls only

**Database Security:**
- No SQL injection risk (Prisma parameterized queries)
- Cascade deletes prevent orphaned records
- No authentication needed (single-player spectator app)

**Role Hiding:**
- Roles never sent to client until `game.status === 'GAME_OVER'`
- API endpoint `/api/game/[gameId]/roles` returns 403 until game over
- Night messages never included in public message queries

**Rate Limiting:**
- Not implemented in MVP (single-user scenario)
- Add in Iteration 3 if deploying publicly

## Migration Path from Iteration 1

**Database Migration:**
1. Run `npx prisma migrate dev --name iteration-2-phases`
2. Verify migration with `npx prisma migrate status`
3. Test on copy of Iteration 1 database first
4. Backup database before production migration

**Code Integration:**
- Import Discussion orchestrator: `import { runDiscussion } from '@/lib/discussion/orchestrator'`
- Reuse turn scheduler: `import { createTurnSchedule, getNextPlayer } from '@/lib/discussion/turn-scheduler'`
- Extend event types: Add to `src/lib/events/types.ts`
- No changes to existing Iteration 1 files

**Cost Tracking Extension:**
```typescript
// Add phase field to cost tracking
trackCost({
  gameId,
  phase: 'NIGHT', // NEW: 'NIGHT' | 'DISCUSSION' | 'VOTING'
  inputTokens,
  outputTokens,
  cost
});

// Get phase breakdown
const summary = getGameSummary(gameId);
console.log(summary.phaseBreakdown);
// { night: 0.50, discussion: 1.50, voting: 0.80 }
```

## Technology Decision Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | Next.js 14 App Router | Already validated, zero migration cost |
| Language | TypeScript 5.6.3 (strict) | Type safety, catches errors at compile time |
| Database | SQLite + Prisma | Sufficient for single-game, easy migrations |
| AI Model | Claude 4.5 Sonnet | Validated in Iteration 1, prompt caching critical |
| API Layer | Next.js Route Handlers + Zod | Simple, type-safe, no tRPC overhead |
| UI | React 18 + Tailwind | Fast iteration, no component library needed |
| Real-time | SSE + polling fallback | Already working, simpler than WebSockets |
| State | React Context API | Sufficient for SSE event distribution |
| Testing | Manual + CLI harness | Pragmatic for MVP, automate in Iteration 3 |
| Deployment | Vercel | Next.js native platform |
