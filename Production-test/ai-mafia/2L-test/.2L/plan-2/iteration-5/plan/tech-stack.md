# Technology Stack

## Core Framework

**Decision:** Next.js 14.2.18 (App Router) + React 18

**Rationale:**
- SSE implementation is architecturally correct (uses ReadableStream for streaming responses)
- App Router supports Route Handlers with proper streaming patterns
- Server Components + Client Components separation is clean (GameEventsContext, PhaseIndicator are 'use client')
- No framework changes needed - problem is operational (logging), not architectural

**Alternatives Considered:**
- **WebSockets**: Overkill for one-way server→client updates, SSE is simpler and sufficient
- **Polling only**: Already exists as fallback in GameEventsContext, but SSE is preferred for efficiency

**Implementation Notes:**
- Keep existing Next.js 14 App Router patterns
- SSE endpoint at `/api/game/[gameId]/stream/route.ts` uses ReadableStream with TextEncoder
- Headers already correct: `text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`

---

## Database

**Decision:** PostgreSQL 16 via Supabase Local + Prisma 6.17.1

**Rationale:**
- Schema is complete and stable (Iteration 4 validated)
- All tables exist (Game, Player, DiscussionMessage, NightMessage, Vote, GameEvent)
- Zero schema changes needed for this iteration
- Prisma ORM provides type-safe queries with excellent developer experience

**Schema Strategy:**
- **No changes needed** - All data structures already exist
- Game.phaseStartTime and Game.phaseEndTime fields already exist (just need to use them)
- EventEmitter is in-memory (no database writes for SSE events)

**Connection:**
- Supabase Local running on port 54322
- DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Connection pooling handled by Prisma

---

## Logging System

**Decision:** Pino 10.0.0 (WITHOUT pino-pretty transport)

**Rationale:**
- Pino provides structured JSON logging (queryable, production-ready)
- Current issue: pino-pretty transport spawns worker threads that crash under load
- Fix: Remove transport configuration, use basic Pino with direct JSON output to stdout
- Preserves all 97 existing logger.info/error/warn/debug calls (zero code changes)
- Maintains Iteration 4 success criterion (zero console.log statements)

**Configuration (Before):**
```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',  // ← REMOVE THIS (causes worker thread crashes)
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
});
```

**Configuration (After):**
```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Transport removed - Pino writes JSON directly to stdout (no worker threads)
});
```

**Output Format:**
```json
{"level":"info","time":1697200000000,"module":"orchestrator","gameId":"abc123","roundNumber":1,"phase":"NIGHT","msg":"Starting NIGHT phase"}
```

**Developer Experience:**
- JSON logs are less readable manually, but developers can pipe to pino-pretty CLI:
  ```bash
  npm run dev | npx pino-pretty
  ```
- Add npm script for convenience:
  ```json
  "scripts": {
    "dev": "next dev",
    "dev:pretty": "npm run dev | pino-pretty"
  }
  ```

**Alternative (Fallback):**
- If Pino still causes issues after removing transport, implement logger abstraction layer
- Switch to console.log temporarily (Pattern 3 from patterns.md)
- Recommendation: Try basic Pino first (very unlikely to fail)

---

## Real-Time Updates

**Decision:** Server-Sent Events (SSE) with polling fallback

**Rationale:**
- SSE is one-way (server→client), perfect for game state updates
- Browser native EventSource API (no additional libraries)
- Automatic reconnection built into browser + GameEventsContext exponential backoff
- Polling fallback already implemented (after 5 SSE failures, poll every 2 seconds)

**SSE Implementation:**
- **Backend**: Route Handler with ReadableStream (`/api/game/[gameId]/stream/route.ts`)
- **Frontend**: EventSource in GameEventsContext with reconnection logic
- **Event Emitter**: Node.js EventEmitter singleton (gameEventEmitter) with 50 max listeners
- **Keepalive**: 15-second heartbeat prevents proxy timeouts
- **Cleanup**: Proper listener removal on disconnect (no memory leaks)

**Event Types Subscribed:**
1. `message` - Discussion messages
2. `turn_start` - Turn begins
3. `turn_end` - Turn completes
4. `phase_change` - Phase transitions (NIGHT → DAY → DISCUSSION → VOTING)
5. `phase_complete` - Phase ends
6. `discussion_complete` - Discussion phase done

**Event Payload Structure:**
```typescript
interface GameEvent {
  gameId: string;
  type: 'message' | 'turn_start' | 'turn_end' | 'phase_change' | 'phase_complete' | 'discussion_complete';
  payload: any;
  timestamp?: string;
}
```

**Critical Fix Needed:**
- Add `phaseStartTime` and `phaseEndTime` to phase_change event payload
- Currently missing, needed for timer synchronization

**Alternatives Considered:**
- **WebSockets**: Two-way communication, more complex, unnecessary for spectator-only app
- **GraphQL Subscriptions**: Overkill, adds complexity and dependencies
- **Polling only**: Works as fallback, but SSE is more efficient (no constant HTTP requests)

---

## Frontend UI

**Decision:** React 18 + Tailwind CSS + shadcn/ui components

**Rationale:**
- Components already built and well-designed (PhaseIndicator, DiscussionFeed, PlayerGrid, VoteTally)
- Tailwind utility classes provide consistent styling
- shadcn/ui components (Card, Badge, Button) are reusable and accessible
- No UI framework changes needed - just need to fix SSE data flow

**Component Library:** shadcn/ui (Tailwind-based, unstyled components)
- Badge component: Role badges, status indicators
- Card component: Containers for player cards, message threads
- Button component: Actions (start game, refresh, etc.)

**Styling:** Tailwind CSS v3
- Utility-first approach
- Responsive design with breakpoints (sm, md, lg, xl)
- Custom colors for Mafia (red) and Villager (blue) - deferred to Iteration 6

**State Management:**
- React Context API (GameEventsContext) for SSE event state
- useState + useEffect for component-local state
- useMemo for derived state (filtered events, phase calculations)

---

## Event System

**Decision:** Node.js EventEmitter singleton (gameEventEmitter)

**Rationale:**
- Simple in-memory pub/sub pattern, perfect for single-server architecture
- 50 max listeners supports multiple spectators (local dev + testing)
- Proper listener cleanup prevents memory leaks
- Well-tested pattern, no issues detected in codebase

**Implementation:**
```typescript
// src/lib/events/emitter.ts
import { EventEmitter } from 'events';

class GameEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Support multiple spectators
  }

  emitGameEvent(type: string, data: any) {
    this.emit(type, data);
  }
}

export const gameEventEmitter = new GameEventEmitter();
```

**Usage Pattern:**
```typescript
// Backend (master-orchestrator.ts):
gameEventEmitter.emitGameEvent('phase_change', {
  gameId,
  type: 'phase_change',
  payload: {
    from: 'NIGHT',
    to: 'DAY_ANNOUNCEMENT',
    round: 1,
    phaseStartTime: new Date().toISOString(), // ADD THIS
    phaseEndTime: calculatePhaseEndTime().toISOString(), // ADD THIS
  },
});

// SSE Route (stream/route.ts):
gameEventEmitter.on('phase_change', (data) => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
});

// Frontend (GameEventsContext.tsx):
eventSource.onmessage = (e) => {
  const event = JSON.parse(e.data);
  setEvents([...prev, event]);
};
```

**Scaling Considerations:**
- Current: In-memory EventEmitter (single server)
- Future: Redis pub/sub or WebSocket clusters for multi-server scaling
- MVP: Single server is sufficient (local dev + testing)

---

## Testing

**Framework:** Vitest 1.6.1 (unit tests - already installed)

**Coverage target:** Maintain 89.47% backend coverage (47 tests must keep passing)

**Strategy:**
- **Backend tests**: All existing tests MUST pass (gate for iteration completion)
- **Frontend tests**: Zero tests exist, manual testing sufficient for this iteration
- **E2E tests**: Deferred to Iteration 7 (Playwright infrastructure missing)

**Test Execution:**
```bash
npm test  # Run all 47 backend tests (must pass)
```

**Test Files (9 files, 47 tests):**
1. `lib/game/__tests__/phase-config.test.ts` (9 tests)
2. `src/lib/discussion/threading.test.ts`
3. `src/lib/discussion/turn-scheduler.test.ts`
4. `src/utils/__tests__/avatar-colors.test.ts`
5. `src/utils/__tests__/message-classification.test.ts`
6. `src/utils/repetition-tracker.test.ts`
7. `src/lib/claude/__tests__/client.test.ts`
8. `src/utils/__tests__/cost-tracker.test.ts`
9. `src/lib/claude/__tests__/client.simple.test.ts`

**Manual Testing Plan:**
- Create game via API
- Start game via API
- Open game page in browser
- Monitor SSE connection for 10+ minutes
- Verify messages appear (40+)
- Refresh page mid-phase, verify timer consistent
- Run 3 consecutive games without crashes

---

## Development Tools

### Code Quality
- **TypeScript:** Strict mode enabled, 0 errors (Iteration 4 achieved this)
- **ESLint:** Configured, must pass linting
- **Prettier:** Code formatting consistent

### Build & Deploy
- **Build tool:** Next.js (Turbopack for dev, Webpack for production)
- **Deployment target:** Local dev only (no production deployment for this iteration)
- **Dev server:** `npm run dev` on port 3001
- **Database:** Supabase Local on port 54322

---

## Environment Variables

List all required env vars:

**Required:**
- `ANTHROPIC_API_KEY` - Claude API key for agent conversations
- `DATABASE_URL` - PostgreSQL connection string (Supabase Local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)

**Optional:**
- `LOG_LEVEL` - Logging verbosity (default: `info` in production, `debug` in development)
  - Options: `debug`, `info`, `warn`, `error`
- `NODE_ENV` - Environment (default: `development`)

**Not Used (Pattern 2 alternative):**
- `USE_PRETTY_LOGS` - Enable pino-pretty transport (NOT RECOMMENDED, causes crashes)

**.env.example:**
```bash
# Claude API
ANTHROPIC_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Logging (optional)
LOG_LEVEL=info  # Options: debug, info, warn, error
```

---

## Dependencies Overview

**Key packages with versions:**

**Production:**
- `next@14.2.18` - Framework for SSR, SSE, API routes
- `react@18` - UI library
- `@prisma/client@6.17.1` - Database ORM (type-safe queries)
- `pino@10.0.0` - Structured logging (JSON output)
- `@anthropic-ai/sdk@0.65.0` - Claude API client
- `date-fns@3.x` - Time formatting and calculations

**Development:**
- `typescript@5.x` - Type safety and IntelliSense
- `vitest@1.6.1` - Unit testing framework
- `@types/node@20.x` - Node.js type definitions
- `prisma@6.17.1` - Database migrations and schema management
- `pino-pretty@13.1.2` - Pretty-printing logs (CLI tool only, not transport)

**Not Installing:**
- `@playwright/test` - E2E testing (deferred to Iteration 7)

---

## Performance Targets

**SSE Connection:**
- Target: 100% uptime during 10-minute game
- Metric: Zero disconnections, no reconnection attempts
- Validation: Monitor Network tab in DevTools for EventStream connection

**Message Rendering:**
- Target: <100ms per message render
- Metric: 40+ messages render in <5 seconds total
- Validation: Watch DiscussionFeed during discussion phase

**Timer Accuracy:**
- Target: ±2 seconds from server time
- Metric: Timer difference <2 seconds after refresh
- Validation: Refresh page 10 times, measure timer delta

**API Response Time:**
- Target: <500ms for game state API
- Metric: `/api/game/[gameId]/state` responds in <500ms
- Validation: Check Network tab request timing

**Backend Test Execution:**
- Target: <30 seconds for all 47 tests
- Metric: `npm test` completes in <30 seconds
- Validation: Run tests, measure duration

---

## Security Considerations

**Logging Security:**
- No sensitive data in logs (API keys, passwords excluded)
- Logs written to stdout (no files, no network)
- JSON structure prevents log injection attacks

**SSE Security:**
- No authentication needed (local dev only, spectator-facing)
- Connection scoped to gameId (no cross-game data leakage)
- Future: Add authentication for production deployment

**Database Security:**
- Prisma ORM prevents SQL injection (parameterized queries)
- Connection string in .env (not committed to git)
- Supabase Local on localhost (not exposed to internet)

**API Security:**
- Local dev only (no CORS, no auth needed for MVP)
- Future: Add API key authentication for production
- Rate limiting not needed (local testing only)

---

## Technology Decisions Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | Next.js 14 App Router | SSE support, well-designed architecture |
| Database | PostgreSQL + Prisma | Schema complete, zero changes needed |
| Logging | Pino (no transport) | Structured JSON logs, no worker threads |
| Real-time | SSE + Polling fallback | One-way updates, browser native, resilient |
| UI | React 18 + Tailwind | Components built, just need data flow fix |
| Event System | Node.js EventEmitter | Simple in-memory pub/sub, proven pattern |
| Testing | Vitest (backend only) | 47 tests must keep passing |
| Deployment | Local dev | No production deployment this iteration |

---

**Tech Stack Status:** STABLE - No major changes needed
**Risk Level:** LOW - Tactical fixes to existing infrastructure
**Next Phase:** Implement patterns from patterns.md
