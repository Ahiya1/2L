# Code Patterns & Conventions

## File Structure
```
ai-mafia/app/
├── app/
│   ├── api/
│   │   └── game/
│   │       └── [gameId]/
│   │           ├── stream/
│   │           │   └── route.ts        # SSE endpoint (Builder 1 verifies)
│   │           ├── state/
│   │           │   └── route.ts        # Game state API
│   │           └── messages/
│   │               └── route.ts        # Messages API
│   ├── game/
│   │   └── [gameId]/
│   │       └── page.tsx                # Game page (uses GameEventsContext)
│   └── page.tsx                        # Lobby
├── components/
│   ├── PhaseIndicator.tsx              # Phase display + timer (Builder 2 modifies)
│   ├── DiscussionFeed.tsx              # Message list (Builder 2 verifies)
│   ├── PlayerGrid.tsx                  # Player cards
│   ├── VoteTally.tsx                   # Vote display
│   └── ConnectionStatus.tsx            # SSE status indicator
├── contexts/
│   └── GameEventsContext.tsx           # SSE client (Builder 1 verifies)
├── src/
│   ├── lib/
│   │   ├── logger.ts                   # Pino config (Builder 1 MODIFIES)
│   │   ├── events/
│   │   │   ├── emitter.ts              # EventEmitter singleton
│   │   │   └── types.ts                # Event type definitions
│   │   └── game/
│   │       └── master-orchestrator.ts  # Game loop (Builder 1 modifies event payload)
│   └── utils/
│       └── cost-tracker.ts             # Cost logging
└── package.json
```

## Naming Conventions
- **Components**: PascalCase (`PhaseIndicator.tsx`, `DiscussionFeed.tsx`)
- **Files**: camelCase (`logger.ts`, `cost-tracker.ts`)
- **Types**: PascalCase (`GameEvent`, `GameEventType`, `PhaseConfig`)
- **Functions**: camelCase (`emitGameEvent()`, `calculatePhaseEndTime()`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`, `KEEPALIVE_INTERVAL`)
- **Event types**: lowercase (`'message'`, `'phase_change'`, `'turn_start'`)

---

## Logging Patterns

### Pattern 1: Remove pino-pretty Transport (CRITICAL - Builder 1)

**When to use:** Fix logging crashes caused by pino-pretty worker threads

**File:** `src/lib/logger.ts` (line 1-28)

**BEFORE (lines 9-16):**
```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',  // ← REMOVE THIS (causes crashes)
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
});
```

**AFTER (FIXED):**
```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Transport removed - Pino writes JSON directly to stdout (no worker threads)
});
```

**Key points:**
- Remove entire `transport` configuration (lines 9-16)
- Keep `level` and `formatters` unchanged
- Pino now writes JSON logs directly to stdout (no worker threads, no crashes)
- All 97 existing logger calls work unchanged (zero code changes needed)

**Output format:**
```json
{"level":"info","time":1697200000000,"module":"orchestrator","gameId":"abc123","msg":"Starting NIGHT phase"}
```

**Validation:**
```bash
# After changing logger.ts
npm test  # All 47 tests must pass
npm run dev  # Start server
# Monitor logs for 10 minutes - expect zero "worker has exited" errors
```

---

### Pattern 2: Structured Logging Calls (DO NOT MODIFY - Builder 1)

**When to use:** Adding new log statements (context: NOT needed for this iteration, just for reference)

**Context object + message pattern:**
```typescript
// Good: Structured logging with context object
orchestratorLogger.info({ gameId, roundNumber, phase: 'NIGHT' }, 'Starting NIGHT phase');

// Context object is queryable JSON
// Message is human-readable string
```

**Error logging with stack traces:**
```typescript
orchestratorLogger.error({ gameId, error: error.message, stack: error.stack }, 'Failed to run Night phase');
```

**Child loggers (already exported from logger.ts):**
```typescript
import { orchestratorLogger, discussionLogger, nightLogger, votingLogger } from '@/lib/logger';

// Use appropriate child logger for context
orchestratorLogger.info({ gameId, phase: 'VOTING' }, 'Starting voting phase');
discussionLogger.info({ gameId, turn: 1, playerId: 'player-1' }, 'Agent speaking');
nightLogger.info({ gameId, mafiaMembersCount: 3 }, 'Mafia coordination begins');
```

**Key points:**
- First argument: Context object (queryable fields)
- Second argument: Human-readable message
- Use child loggers for module-specific context (orchestratorLogger, discussionLogger, etc.)
- Never use console.log (Iteration 4 removed these)

---

## SSE (Server-Sent Events) Patterns

### Pattern 3: Verify SSE Endpoint Stability (Builder 1)

**When to use:** After fixing logging, verify SSE connection doesn't crash

**File:** `app/api/game/[gameId]/stream/route.ts` (line 1-100)

**Current implementation (DO NOT MODIFY, just verify):**
```typescript
export async function GET(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const gameId = params.gameId;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Keepalive every 15 seconds
      const keepaliveInterval = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 15000);

      // Event handlers
      const messageHandler = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Subscribe to 6 event types (lowercase)
      gameEventEmitter.on('message', messageHandler);
      gameEventEmitter.on('turn_start', messageHandler);
      gameEventEmitter.on('turn_end', messageHandler);
      gameEventEmitter.on('phase_change', messageHandler);
      gameEventEmitter.on('phase_complete', messageHandler);
      gameEventEmitter.on('discussion_complete', messageHandler);

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        gameEventEmitter.off('message', messageHandler);
        gameEventEmitter.off('turn_start', messageHandler);
        gameEventEmitter.off('turn_end', messageHandler);
        gameEventEmitter.off('phase_change', messageHandler);
        gameEventEmitter.off('phase_complete', messageHandler);
        gameEventEmitter.off('discussion_complete', messageHandler);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

**Verification steps (Builder 1):**
1. Start game via API
2. Open game page in browser
3. Check DevTools → Network tab → Filter by "EventStream"
4. Verify connection shows "pending" (stays open)
5. Monitor for 10+ minutes
6. Expected: Connection never closes, no "failed" status

**Debug logging (temporary, add if needed):**
```typescript
// Add inside messageHandler (remove after debugging)
const messageHandler = (data: any) => {
  console.log('[SSE DEBUG] Emitting event:', data.type, 'for game:', data.gameId);
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
};
```

**Key points:**
- Event types are lowercase: `'message'`, `'phase_change'`, not `'NEW_MESSAGE'`, `'PHASE_CHANGE'`
- Keepalive prevents proxy timeouts (15 seconds is standard)
- Cleanup on abort prevents memory leaks (removes all listeners)
- Headers must include `text/event-stream` and `no-cache`

---

### Pattern 4: Add phaseStartTime to Event Payload (Builder 1)

**When to use:** Fix timer sync by adding server time to phase_change events

**File:** `src/lib/game/master-orchestrator.ts` (around line 75, search for `phase_change` event emission)

**BEFORE (current broken implementation):**
```typescript
gameEventEmitter.emitGameEvent('phase_change', {
  gameId,
  type: 'phase_change',
  payload: {
    from: previousPhase,
    to: currentPhase,
    round: roundNumber,
    // MISSING: phaseStartTime and phaseEndTime
  },
});
```

**AFTER (FIXED):**
```typescript
gameEventEmitter.emitGameEvent('phase_change', {
  gameId,
  type: 'phase_change',
  payload: {
    from: previousPhase,
    to: currentPhase,
    round: roundNumber,
    phaseStartTime: new Date().toISOString(), // ADD THIS - ISO 8601 format
    phaseEndTime: calculatePhaseEndTime(currentPhase).toISOString(), // ADD THIS
  },
});
```

**Calculate phaseEndTime helper:**
```typescript
function calculatePhaseEndTime(phase: string): Date {
  const phaseConfig = getPhaseConfig(phase); // From phase-config.ts
  const durationMs = phaseConfig.duration * 1000; // Convert seconds to milliseconds
  return new Date(Date.now() + durationMs);
}
```

**Example event payload (after fix):**
```json
{
  "gameId": "abc123",
  "type": "phase_change",
  "payload": {
    "from": "NIGHT",
    "to": "DAY_ANNOUNCEMENT",
    "round": 1,
    "phaseStartTime": "2025-10-13T14:30:00.000Z",
    "phaseEndTime": "2025-10-13T14:30:30.000Z"
  }
}
```

**Key points:**
- Use `new Date().toISOString()` for current time (UTC, ISO 8601 format)
- Calculate phaseEndTime from phase duration (phase-config.ts has duration in seconds)
- Both fields are strings (ISO 8601 timestamps)
- Builder 2 will extract these fields in PhaseIndicator.tsx

---

### Pattern 5: Frontend SSE Client (DO NOT MODIFY - Builder 1 verifies only)

**When to use:** Understand how GameEventsContext receives SSE events

**File:** `contexts/GameEventsContext.tsx` (line 1-200)

**Relevant sections (DO NOT MODIFY, just understand):**
```typescript
useEffect(() => {
  if (!gameId) return;

  const eventSource = new EventSource(`/api/game/${gameId}/stream`);

  eventSource.onopen = () => {
    setIsConnected(true);
    setError(null);
    setReconnectAttempts(0);
  };

  eventSource.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      setEvents((prev) => [...prev, event]);
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  };

  eventSource.onerror = (error) => {
    setIsConnected(false);
    eventSource.close();

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const newAttempt = reconnectAttempts + 1;
    setReconnectAttempts(newAttempt);

    if (newAttempt < MAX_RETRIES) {
      const delay = Math.pow(2, newAttempt) * 1000;
      setTimeout(() => { /* reconnect */ }, delay);
    } else {
      // Fall back to polling after 5 failed retries
      setUsePolling(true);
    }
  };

  return () => {
    eventSource.close();
  };
}, [gameId]);
```

**Key points:**
- EventSource auto-reconnects on disconnect (browser behavior)
- GameEventsContext adds exponential backoff (1s → 16s)
- After 5 failures, switches to polling (every 2 seconds)
- All events stored in `events` array state
- Components subscribe via `useGameEvents()` hook

**Verification (Builder 1):**
- Check ConnectionStatus component shows "Connected" (green)
- If shows "Disconnected" (red), SSE is broken
- If shows "Reconnecting..." (yellow), reconnection logic is working

---

## Timer Synchronization Patterns

### Pattern 6: Extract phaseStartTime from Events (Builder 2)

**When to use:** Fix timer desync by using server time instead of client approximation

**File:** `components/PhaseIndicator.tsx` (line 54-62)

**BEFORE (lines 59-61, BROKEN):**
```typescript
const phaseStartTime = useMemo<Date | null>(() => {
  // In real implementation, this would come from the phase_change event payload
  // For now, use current time as approximation
  return new Date(); // ← BUG: Uses client time, resets on refresh
}, [events]);
```

**AFTER (FIXED):**
```typescript
const phaseStartTime = useMemo<Date | null>(() => {
  // Extract latest phase_change event
  const phaseEvents = events.filter((e) => e.type === 'phase_change');
  if (phaseEvents.length === 0) return null;

  const latestPhase = phaseEvents[phaseEvents.length - 1];
  if (!latestPhase?.payload?.phaseStartTime) return null;

  // Use server-provided phaseStartTime (ISO 8601 string)
  return new Date(latestPhase.payload.phaseStartTime);
}, [events]);
```

**Calculate timeRemaining (existing logic, no changes needed):**
```typescript
const timeRemaining = useMemo(() => {
  if (!phaseStartTime || !currentPhase) return null;

  const phaseConfig = getPhaseConfig(currentPhase.name);
  const phaseEndTime = new Date(phaseStartTime.getTime() + phaseConfig.duration * 1000);

  const now = Date.now();
  const remainingMs = phaseEndTime.getTime() - now;

  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000); // Convert to seconds
}, [phaseStartTime, currentPhase]);
```

**Alternative approach (use phaseEndTime directly if available):**
```typescript
const timeRemaining = useMemo(() => {
  const phaseEvents = events.filter((e) => e.type === 'phase_change');
  if (phaseEvents.length === 0) return null;

  const latestPhase = phaseEvents[phaseEvents.length - 1];
  if (!latestPhase?.payload?.phaseEndTime) return null;

  const phaseEndTime = new Date(latestPhase.payload.phaseEndTime);
  const now = Date.now();
  const remainingMs = phaseEndTime.getTime() - now;

  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000);
}, [events]);
```

**Key points:**
- Extract phaseStartTime from latest phase_change event
- Parse ISO 8601 string to Date object: `new Date(isoString)`
- Calculate timeRemaining = phaseEndTime - Date.now()
- Update every second via existing setInterval (line 67-73, no changes needed)
- Timer now syncs across refresh (server-authoritative time)

**Validation (Builder 2):**
```typescript
// Temporary debug logging (remove after testing)
useEffect(() => {
  const phaseEvents = events.filter((e) => e.type === 'phase_change');
  if (phaseEvents.length > 0) {
    const latestPhase = phaseEvents[phaseEvents.length - 1];
    console.log('[TIMER DEBUG] phaseStartTime:', latestPhase.payload.phaseStartTime);
    console.log('[TIMER DEBUG] phaseEndTime:', latestPhase.payload.phaseEndTime);
    console.log('[TIMER DEBUG] timeRemaining:', timeRemaining);
  }
}, [events, timeRemaining]);
```

---

## Message Display Patterns

### Pattern 7: Verify Message Event Extraction (Builder 2)

**When to use:** Confirm DiscussionFeed receives message events after SSE fix

**File:** `components/DiscussionFeed.tsx` (line 62-80)

**Current implementation (DO NOT MODIFY, just verify):**
```typescript
const messages = useMemo(() => {
  // Filter for 'message' type events
  const messageEvents = events.filter((e) => e.type === 'message');

  // Map to DiscussionMessage format
  return messageEvents.map((e) => ({
    id: e.payload.id,
    gameId: e.payload.gameId,
    roundNumber: e.payload.roundNumber,
    turn: e.payload.turn,
    playerId: e.payload.playerId,
    playerName: e.payload.playerName || 'Unknown',
    message: e.payload.message,
    timestamp: new Date(e.payload.timestamp),
    isLastInThread: e.payload.isLastInThread || false,
  }));
}, [events]);
```

**Verification steps (Builder 2):**
1. Start game, wait for DISCUSSION phase
2. Watch DiscussionFeed component
3. Expected: Messages appear as agents speak (5-10 seconds apart)
4. Count messages: Should match database count (40+)

**Debug logging (temporary, remove after testing):**
```typescript
useEffect(() => {
  const messageEvents = events.filter((e) => e.type === 'message');
  console.log('[MESSAGE DEBUG] Total message events:', messageEvents.length);
  console.log('[MESSAGE DEBUG] Latest message:', messageEvents[messageEvents.length - 1]?.payload.message);
}, [events]);
```

**Key points:**
- DiscussionFeed filters events by type: `e.type === 'message'`
- Each message event has payload with id, playerId, message, timestamp
- Component auto-scrolls to new messages (line 85-95, no changes needed)
- If no messages appear, SSE is broken (Builder 1's responsibility)

**Success criteria:**
- [ ] 40+ messages appear during discussion phase
- [ ] Messages display in chronological order
- [ ] Auto-scroll works (new messages scroll into view)
- [ ] Message count matches database: `SELECT COUNT(*) FROM DiscussionMessage WHERE gameId = '{gameId}'`

---

## Event Emission Patterns

### Pattern 8: Emit Events from Backend (DO NOT MODIFY - Reference only)

**When to use:** Understand how backend emits events (context for debugging)

**File:** Various orchestrator files (master-orchestrator.ts, discussion/orchestrator.ts, voting-phase.ts)

**Example: Emit discussion message event**
```typescript
// src/lib/discussion/turn-executor.ts (around line 100)
import { gameEventEmitter } from '@/lib/events/emitter';

// After saving message to database
await prisma.discussionMessage.create({
  data: {
    gameId,
    roundNumber,
    turn,
    playerId,
    message: agentResponse,
    timestamp: new Date(),
  },
});

// Emit event for SSE
gameEventEmitter.emitGameEvent('message', {
  gameId,
  type: 'message',
  payload: {
    id: message.id,
    gameId,
    roundNumber,
    turn,
    playerId,
    playerName: player.name,
    message: agentResponse,
    timestamp: new Date().toISOString(),
  },
});
```

**Example: Emit phase change event (Builder 1 modifies this)**
```typescript
// src/lib/game/master-orchestrator.ts (around line 75)
gameEventEmitter.emitGameEvent('phase_change', {
  gameId,
  type: 'phase_change',
  payload: {
    from: previousPhase,
    to: currentPhase,
    round: roundNumber,
    phaseStartTime: new Date().toISOString(), // ADD THIS (Builder 1)
    phaseEndTime: calculatePhaseEndTime(currentPhase).toISOString(), // ADD THIS (Builder 1)
  },
});
```

**Key points:**
- Event type is lowercase: `'message'`, `'phase_change'`, not `'NEW_MESSAGE'`, `'PHASE_CHANGE'`
- Event structure: `{ gameId, type, payload }`
- Emit AFTER database write (ensures data persisted before SSE)
- Use ISO 8601 timestamps: `new Date().toISOString()`

---

## Testing Patterns

### Pattern 9: Manual SSE Connection Test (Builder 1)

**When to use:** Verify SSE endpoint works after logging fix

**Method 1: Browser DevTools**
```bash
# Start dev server
npm run dev

# Create game via API
curl -X POST http://localhost:3001/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"playerCount": 10}'

# Start game
curl -X POST http://localhost:3001/api/game/{gameId}/start

# Open browser: http://localhost:3001/game/{gameId}
# Open DevTools → Network tab → Filter: "EventStream"
# Expected: Connection shows "pending" (stays open)
# Monitor for 10+ minutes - connection should never close
```

**Method 2: curl test**
```bash
# Stream SSE events via curl
curl -N http://localhost:3001/api/game/{gameId}/stream

# Expected output:
: keepalive

data: {"gameId":"abc123","type":"phase_change","payload":{...}}

data: {"gameId":"abc123","type":"message","payload":{...}}

: keepalive

# Press Ctrl+C to stop
```

**Method 3: Check ConnectionStatus component**
```typescript
// components/ConnectionStatus.tsx shows SSE status
// Expected: Green "Connected" badge
// If red "Disconnected" or yellow "Reconnecting..." → SSE broken
```

---

### Pattern 10: Timer Sync Validation (Builder 2)

**When to use:** Verify timer doesn't reset on refresh

**Manual test:**
```bash
# Start game, wait for DISCUSSION phase (5-minute timer)
# Note timer value: e.g., "4:32"
# Refresh page immediately
# Check timer after refresh: Should be "4:30" or "4:28" (±2 seconds acceptable)
# NOT "5:00" (that means timer reset, bug still present)
```

**Validation script (Builder 2 can add temporarily):**
```typescript
// Add to PhaseIndicator.tsx for debugging
useEffect(() => {
  if (timeRemaining !== null) {
    console.log('[TIMER VALIDATION] Current time remaining:', timeRemaining, 'seconds');
    console.log('[TIMER VALIDATION] Server phaseStartTime:', phaseStartTime?.toISOString());
  }
}, [timeRemaining, phaseStartTime]);

// After refresh, check console:
// If phaseStartTime changes, timer will reset (bug)
// If phaseStartTime stays same, timer continues (fixed)
```

---

### Pattern 11: Message Count Validation (Builder 2)

**When to use:** Verify all messages appear in UI

**Method 1: Compare UI vs Database**
```bash
# Count messages in UI (watch DiscussionFeed)
# Count messages in database:
psql -U postgres -h 127.0.0.1 -p 54322 -d postgres \
  -c "SELECT COUNT(*) FROM \"DiscussionMessage\" WHERE \"gameId\" = '{gameId}';"

# Expected: Counts match (40+ messages)
```

**Method 2: Console logging (temporary)**
```typescript
// Add to DiscussionFeed.tsx
useEffect(() => {
  const messageCount = events.filter((e) => e.type === 'message').length;
  console.log('[MESSAGE VALIDATION] Total messages in UI:', messageCount);
}, [events]);

// Expected: Count increases during discussion phase (40+)
```

---

### Pattern 12: Backend Test Validation (CRITICAL - Builder 1)

**When to use:** Verify Iteration 4 backend code still works

**Command:**
```bash
npm test
```

**Expected output:**
```
 ✓ lib/game/__tests__/phase-config.test.ts (9 tests)
 ✓ src/lib/discussion/threading.test.ts
 ✓ src/lib/discussion/turn-scheduler.test.ts
 ✓ src/utils/__tests__/avatar-colors.test.ts
 ✓ src/utils/__tests__/message-classification.test.ts
 ✓ src/utils/repetition-tracker.test.ts
 ✓ src/lib/claude/__tests__/client.test.ts
 ✓ src/utils/__tests__/cost-tracker.test.ts
 ✓ src/lib/claude/__tests__/client.simple.test.ts

Test Files  9 passed (9)
     Tests  47 passed (47)
  Start at  14:30:00
  Duration  8.50s
```

**If any tests fail:**
1. **STOP** - Do not proceed with other work
2. Identify which test failed
3. Rollback logger.ts changes
4. Debug why test failed
5. Fix test before continuing

**Gate for iteration completion:**
- ✅ All 47 tests passing → Proceed to next phase
- ❌ Any test fails → STOP, fix before continuing

---

## Import Order Convention

```typescript
// 1. External libraries
import { EventEmitter } from 'events';
import pino from 'pino';

// 2. Next.js imports
import { NextRequest, NextResponse } from 'next/server';

// 3. React imports
import { useState, useEffect, useMemo } from 'react';

// 4. Internal absolute imports (@/)
import { gameEventEmitter } from '@/lib/events/emitter';
import { orchestratorLogger } from '@/lib/logger';
import { getPhaseConfig } from '@/lib/game/phase-config';

// 5. Relative imports
import { Button } from './ui/button';
import { Card } from './ui/card';

// 6. Type imports (if separated)
import type { GameEvent, GameEventType } from '@/lib/events/types';
```

---

## Code Quality Standards

**TypeScript Strict Mode:**
- Zero TypeScript errors (Iteration 4 achieved this, maintain it)
- Use explicit types for function parameters and return values
- Avoid `any` type (use `unknown` if type truly unknown)

**Error Handling:**
- Wrap async operations in try/catch
- Log errors with context: `logger.error({ gameId, error: error.message }, 'Operation failed')`
- Don't swallow errors silently

**Logging:**
- Use structured logging with context object: `logger.info({ gameId, phase }, 'Message')`
- Never use console.log (except temporary debug statements, remove after testing)
- Use appropriate log level: debug (verbose), info (standard), warn (unexpected), error (failures)

**SSE Best Practices:**
- Always clean up listeners on disconnect (prevent memory leaks)
- Use keepalive to prevent proxy timeouts (15 seconds is standard)
- Set proper headers: `text/event-stream`, `no-cache`, `keep-alive`

**React Best Practices:**
- Use useMemo for expensive calculations (event filtering)
- Use useEffect for side effects (SSE connection, timers)
- Clean up effects in return function (close connections, clear timers)

---

## Performance Patterns

**Event Filtering:**
```typescript
// Good: useMemo for filtered events
const messages = useMemo(() => {
  return events.filter((e) => e.type === 'message');
}, [events]);

// Bad: Filter on every render
const messages = events.filter((e) => e.type === 'message'); // Re-filters unnecessarily
```

**Timer Updates:**
```typescript
// Good: setInterval with cleanup
useEffect(() => {
  const interval = setInterval(() => {
    setTimeRemaining(calculateTimeRemaining());
  }, 1000);

  return () => clearInterval(interval); // Cleanup on unmount
}, []);
```

**SSE Connection:**
```typescript
// Good: Close connection on unmount
useEffect(() => {
  const eventSource = new EventSource(url);

  return () => eventSource.close(); // Prevent memory leak
}, [url]);
```

---

## Security Patterns

**Logging Security:**
```typescript
// Good: Exclude sensitive data
logger.info({ gameId, playerId }, 'Agent response generated');

// Bad: Log API keys or sensitive data
logger.info({ apiKey: process.env.ANTHROPIC_API_KEY }, 'Calling Claude'); // DON'T DO THIS
```

**SSE Security:**
```typescript
// Good: Validate gameId exists
const game = await prisma.game.findUnique({ where: { id: gameId } });
if (!game) {
  return NextResponse.json({ error: 'Game not found' }, { status: 404 });
}

// Then start SSE stream
```

---

## Debugging Patterns

### Pattern 13: Add Temporary Debug Logging

**When to use:** Debugging SSE, timer, or message issues

**Add to relevant file:**
```typescript
// TEMPORARY DEBUG LOGGING (REMOVE AFTER TESTING)
console.log('[DEBUG] SSE event received:', event.type, event.payload);
console.log('[DEBUG] Timer calculation:', { phaseStartTime, phaseEndTime, timeRemaining });
console.log('[DEBUG] Message count:', messages.length);
```

**Remember to remove before committing:**
```bash
# Search for debug statements before commit
grep -r "DEBUG" app/components/
grep -r "console.log" app/components/

# Remove all debug logs
```

---

## Summary Checklist for Builders

**Builder 1 (Logging & SSE):**
- [ ] Remove pino-pretty transport from `src/lib/logger.ts`
- [ ] Run `npm test` - verify 47 tests pass
- [ ] Verify SSE connection stays open for 10+ minutes
- [ ] Add phaseStartTime + phaseEndTime to phase_change events in master-orchestrator.ts
- [ ] Test event emission with debug logging
- [ ] Remove debug logging before completion

**Builder 2 (Timer & Message Verification):**
- [ ] Extract phaseStartTime from phase_change events in PhaseIndicator.tsx
- [ ] Test timer sync: refresh page, verify timer consistent (±2 seconds)
- [ ] Verify message display: count messages in UI, compare to database
- [ ] Test 3 consecutive games without crashes
- [ ] Verify 44/44 messages appear in all 3 games
- [ ] Remove debug logging before completion

**Both Builders:**
- [ ] Follow logging patterns (structured context, no console.log)
- [ ] Follow import order convention
- [ ] Zero TypeScript errors
- [ ] Clean up temporary debug statements
- [ ] Document any unexpected issues in completion report

---

**Patterns Status:** COMPREHENSIVE - All critical patterns documented
**Next Phase:** Builder task breakdown (builder-tasks.md)
