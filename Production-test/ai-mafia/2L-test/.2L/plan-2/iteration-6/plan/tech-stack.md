# Technology Stack - Iteration 6

**Iteration:** 6 (Global Iteration 6)
**Plan:** plan-2
**Focus:** Transparency Features

---

## Core Framework

**Decision:** Next.js 14 (App Router) + React 18

**Rationale:**
- Already in use from Iteration 1 (proven stable)
- App Router provides Server Components + Client Components separation
- Server-Sent Events (SSE) integration stable after Iteration 1 fixes
- Zero framework changes needed - build on existing foundation

**Alternatives Considered:**
- None - Preserve existing stack to avoid breaking Iteration 1 work

**Key Features Used:**
- React Server Components for initial state fetch
- React Client Components for real-time updates (SSE)
- API Routes for backend endpoints
- Middleware for request handling

---

## Database

**Decision:** PostgreSQL (Supabase Local) + Prisma ORM 5.x

**Rationale:**
- NightMessage table already exists with all required fields
- Player.role field already exists in schema
- Indexes optimized for queries (`[gameId, roundNumber, timestamp]`)
- Zero schema changes needed for transparency features

**Schema Strategy:**
- No migrations required
- Existing data model is complete
- Query patterns proven stable

**Key Tables Used:**
- `Player` - role field exposes "MAFIA" or "VILLAGER"
- `NightMessage` - Mafia coordination messages
- `Game` - current phase, round, status
- `DiscussionMessage` - Public messages (for comparison)

---

## Real-Time Updates (SSE)

**Decision:** Server-Sent Events (SSE) with EventEmitter

**Rationale:**
- Stable after Iteration 1 fixes (logging issues resolved)
- Proven pattern for phase_change, message, vote_cast events
- Simple to extend with night_message event type
- No WebSocket complexity needed (one-way communication)

**Architecture:**
- **Event Emitter:** Node.js EventEmitter singleton (`gameEventEmitter`)
- **SSE Endpoint:** `/api/game/[gameId]/stream` (ReadableStream)
- **Keepalive:** 15-second heartbeat (proven stable)
- **Reconnection:** Automatic client-side reconnection on disconnect

**New Event Type:**
```typescript
// Add to GameEventType union
type GameEventType =
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete'
  | 'night_message'; // NEW

// Event payload structure
{
  gameId: string;
  type: 'NIGHT_MESSAGE';
  payload: {
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: string; // ISO 8601
    roundNumber: number;
    turn: number;
  };
}
```

**Performance Targets:**
- Event latency: <500ms from emission to client reception
- Connection uptime: 100% during 10-minute game
- Max listeners: 50 (supports multiple SSE connections)

---

## API Layer

**Decision:** Next.js API Routes (REST)

**Rationale:**
- Consistent with existing endpoint patterns
- Simple GET requests for historical data
- SSE for real-time updates (proven stable)

**New Endpoint:**

### `/api/game/[gameId]/night-messages`

**Method:** GET

**Query Params:**
- `round` (optional): Filter by round number (e.g., `?round=1`)

**Response:**
```json
{
  "messages": [
    {
      "id": "night1",
      "playerId": "mafia1",
      "playerName": "Agent-2",
      "message": "Let's eliminate Agent-5, they're too vocal",
      "timestamp": "2025-10-13T14:25:00Z",
      "roundNumber": 1,
      "turn": 1,
      "inReplyToId": null
    }
  ],
  "total": 6,
  "hasMore": false
}
```

**Implementation Pattern:**
- Copy from `/api/game/[gameId]/messages/route.ts`
- Replace `discussionMessage` with `nightMessage`
- Same query structure, response format

**Modified Endpoint:**

### `/api/game/[gameId]/state` (Add role field)

**Before:**
```json
{
  "players": [
    {
      "id": "p1",
      "name": "Agent-1",
      "isAlive": true,
      // role NOT included
    }
  ]
}
```

**After:**
```json
{
  "players": [
    {
      "id": "p1",
      "name": "Agent-1",
      "role": "MAFIA", // ADD THIS
      "isAlive": true,
    }
  ]
}
```

---

## Frontend

**Decision:** React 18 + TypeScript + Tailwind CSS

**Rationale:**
- Existing stack proven stable
- TypeScript provides type safety for API contracts
- Tailwind CSS used throughout (consistent styling)
- shadcn/ui component patterns established

**UI Component Library:** shadcn/ui-inspired (custom components)

**Components:**
- Badge (mafia, villager variants already defined)
- Card (consistent panel wrapper)
- Button (primary, secondary variants)

**Styling:** Tailwind CSS 3.x

**Color Scheme:**
- Mafia: Red (bg-red-100, text-red-700, border-red-300)
- Villager: Blue (bg-blue-100, text-blue-700, border-blue-300)
- Phase indicators: Purple (Night), Orange (Day), Blue (Discussion), Red (Voting)

**Responsive Strategy:**
- Desktop-first design
- Split screen on desktop: `grid-cols-2`
- Stack vertically on mobile: `grid-cols-1 md:grid-cols-2`

**New Components:**

### MafiaChatPanel
```tsx
// Location: app/components/MafiaChatPanel.tsx
// Copy pattern from: app/components/DiscussionFeed.tsx
// Subscribes to: night_message events
// Shows/hides: Based on currentPhase === 'NIGHT'
```

### PhaseTimeline (Optional)
```tsx
// Location: app/components/PhaseTimeline.tsx
// Displays: Horizontal timeline of phases
// Highlights: Current phase
```

---

## External Integrations

### None Required
All transparency features use existing internal data:
- Player roles from database
- Night messages from database
- SSE events from internal event emitter

---

## Development Tools

### Testing

**Framework:** Playwright (via Playwright MCP)

**Coverage Target:** Critical paths (role display, Mafia chat, phase visualization)

**Strategy:**
- Validator uses Playwright MCP to open real browser
- Automated game creation and observation
- Screenshot capture for evidence
- PASS/FAIL determination based on visual validation

**Playwright Usage Pattern:**
```typescript
// Example: Validate role display
const page = await browser.newPage();
await page.goto('http://localhost:3001/game/abc123');

// Wait for player grid to load
await page.waitForSelector('[data-testid="player-grid"]');

// Verify role badges exist
const mafiaCount = await page.locator('[data-badge="mafia"]').count();
const villagerCount = await page.locator('[data-badge="villager"]').count();

// Take screenshot
await page.screenshot({ path: 'role-display.png' });
```

**Manual Testing:**
- curl for API endpoints
- Browser DevTools Network tab for SSE inspection
- Console logs for event debugging

### Code Quality

**Linter:** ESLint (Next.js default config)

**Formatter:** Prettier (if configured)

**Type Checking:** TypeScript strict mode

**Pre-commit Checks:**
- `npm run type-check` (TypeScript compilation)
- `npm test` (47 backend tests must pass)

### Build & Deploy

**Build Tool:** Next.js (Turbopack)

**Deployment Target:** Local development only (localhost:3001)

**CI/CD:** None (local dev iteration)

---

## Environment Variables

All existing from Iteration 1 - no new variables needed:

- `DATABASE_URL`: Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `ANTHROPIC_API_KEY`: Claude API key for agent generation
- `NODE_ENV`: development

**Optional (Future):**
- `TRANSPARENCY_MODE`: "true" (future-proofing for toggling transparency)

---

## Dependencies Overview

### Core Dependencies (No Changes)

**Runtime:**
- `next`: 14.x - App Router, API Routes, SSE
- `react`: 18.x - UI framework
- `react-dom`: 18.x - React rendering
- `@prisma/client`: 5.x - Database ORM
- `tailwindcss`: 3.x - CSS framework

**AI Generation:**
- `@anthropic-ai/sdk`: Claude API client

**Utilities:**
- `date-fns`: Relative timestamps ("2 minutes ago")
- `zod`: API validation schemas

### Dev Dependencies (No Changes)

- `typescript`: 5.x
- `@types/react`: 18.x
- `@types/node`: 20.x
- `eslint`: Next.js config
- `vitest`: Backend unit tests

**New Dependencies:**
- None - All features use existing packages

---

## Performance Targets

**API Response Time:**
- `/api/game/[gameId]/state`: <100ms
- `/api/game/[gameId]/night-messages`: <200ms (6-9 messages max)

**SSE Event Latency:**
- `night_message` events: <500ms from emission to client reception

**Frontend Rendering:**
- First Contentful Paint: <2s
- MafiaChatPanel mount: <100ms
- Role badge display: Instant (server-rendered)

**Bundle Size:**
- No significant increase (reusing existing components)
- MafiaChatPanel: ~10KB (copy of DiscussionFeed)

---

## Security Considerations

**API Endpoints:**
- Game ID validation (404 if not found)
- No authentication required (spectator-only mode)
- SQL injection prevention (Prisma parameterized queries)

**SSE Connections:**
- Game ID scoped (only receive events for specific game)
- No sensitive data exposure (all AI agents, no human players)
- Connection cleanup on disconnect

**Frontend:**
- XSS prevention (React auto-escapes text)
- No user input validation needed (read-only spectator UI)

**Transparency Mode:**
- All data intentionally public (AI vs AI, no privacy concerns)
- Future: Add `TRANSPARENCY_MODE` env var if human players added

---

## Playwright MCP Integration

**Tool:** Playwright MCP (Model Context Protocol)

**Purpose:** Automated browser testing with visual validation

**Usage Pattern:**

### 1. Server Management
```typescript
// Start dev server
await startDevServer({ port: 3001 });

// Check if server is ready
await waitForServer('http://localhost:3001');
```

### 2. Browser Automation
```typescript
// Launch browser via Playwright MCP
const browser = await playwright.chromium.launch({ headless: true });
const page = await browser.newPage();

// Navigate to game
await page.goto('http://localhost:3001/');
await page.click('button:has-text("Start Game")');
```

### 3. Visual Validation
```typescript
// Wait for element
await page.waitForSelector('[data-testid="mafia-chat-panel"]');

// Verify visibility
const isVisible = await page.isVisible('[data-badge="mafia"]');

// Capture screenshot
await page.screenshot({
  path: '.2L/plan-2/iteration-6/validation/screenshots/mafia-chat.png',
  fullPage: true
});
```

### 4. Event Validation
```typescript
// Wait for SSE connection
await page.waitForSelector('[data-connection-status="connected"]');

// Wait for Night phase
await page.waitForSelector('[data-phase="NIGHT"]');

// Wait for first Mafia message
await page.waitForSelector('[data-message-type="night_message"]', { timeout: 60000 });
```

**Validation Deliverables:**
- Screenshots of key features
- PASS/FAIL determination
- Console log output (no errors)
- Test execution time

---

## SSE Event Emission Pattern

### Backend Event Emission

**Location:** `src/lib/game/night-phase.ts` (line 269)

**Pattern:**
```typescript
// After saving to database
const savedMessage = await prisma.nightMessage.create({
  data: {
    gameId,
    playerId,
    roundNumber,
    message: text,
    turn,
    timestamp: new Date(),
  },
});

// Emit SSE event (TRANSPARENCY MODE)
gameEventEmitter.emitGameEvent('night_message', {
  gameId,
  type: 'NIGHT_MESSAGE',
  payload: {
    id: savedMessage.id,
    playerId: player.id,
    playerName: player.name,
    message: text,
    timestamp: savedMessage.timestamp.toISOString(),
    roundNumber,
    turn,
  },
});
```

**Why this pattern:**
- Emit AFTER database save (consistency guaranteed)
- Payload matches NEW_MESSAGE structure (proven stable)
- Includes all fields frontend needs

### Frontend Event Subscription

**Location:** `app/components/MafiaChatPanel.tsx`

**Pattern:**
```typescript
const { events } = useGameEvents(); // SSE hook

useEffect(() => {
  const nightMessages = events.filter((e) => e.type === 'night_message');
  setMessages(nightMessages);
}, [events]);
```

**Why this pattern:**
- Matches DiscussionFeed pattern (proven stable)
- Filters by event type
- Reactive to new events

---

## API Validation Patterns

### Request Validation
```typescript
// Validate game exists
const game = await prisma.game.findUnique({ where: { id: gameId } });
if (!game) {
  return NextResponse.json({ error: 'Game not found' }, { status: 404 });
}
```

### Response Formatting
```typescript
// Consistent response structure
return NextResponse.json({
  messages: messages.map((msg) => ({
    id: msg.id,
    playerId: msg.playerId,
    playerName: msg.player.name,
    message: msg.message,
    timestamp: msg.timestamp.toISOString(),
    roundNumber: msg.roundNumber,
    turn: msg.turn,
  })),
  total: messages.length,
  hasMore: false,
});
```

---

## Type Safety

### Event Types
```typescript
// src/lib/events/types.ts
export type GameEventType =
  | 'message'
  | 'night_message' // ADD THIS
  | 'phase_change'
  | /* ... */;

export type GameEvent =
  | { type: 'NEW_MESSAGE'; payload: MessagePayload }
  | { type: 'NIGHT_MESSAGE'; payload: NightMessagePayload } // ADD THIS
  | /* ... */;
```

### API Response Types
```typescript
// src/lib/api/validation.ts
interface GameStateResponse {
  game: GameInfo;
  players: Array<{
    id: string;
    name: string;
    role: string; // ADD THIS
    isAlive: boolean;
    /* ... */
  }>;
  phaseEndTime: string | null;
}
```

---

## Summary

**Tech Stack Changes:**
- ZERO new dependencies
- ZERO framework changes
- MINIMAL code additions (new API endpoint, new component, event emission)

**Proven Patterns Reused:**
- SSE event system (Iteration 1)
- API endpoint structure (messages pattern)
- React component patterns (DiscussionFeed → MafiaChatPanel)
- Tailwind styling conventions

**Risk Level:** LOW
- All changes additive
- No breaking modifications to stable code
- TypeScript provides compile-time safety
- Playwright validation catches runtime issues

**Confidence:** 95% - Building on proven stable foundation
