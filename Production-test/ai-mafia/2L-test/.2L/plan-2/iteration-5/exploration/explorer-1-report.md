# Explorer 1 Report: Architecture & SSE Implementation Analysis

## Executive Summary

The SSE infrastructure is architecturally sound but has **three tactical bugs** preventing real-time updates:

1. **Logging System Crash**: Pino with pino-pretty transport causes worker thread crashes that break SSE connections
2. **Timer Desynchronization**: PhaseIndicator uses client-side `new Date()` instead of server `phaseStartTime` from events
3. **Event Type Mismatch**: SSE route listens for lowercase event types (`message`, `phase_change`) but backend may be emitting uppercase types (`NEW_MESSAGE`, `PHASE_CHANGE`)

**Complexity: SIMPLE** - These are tactical fixes requiring 8-12 hours, not architectural refactoring. The foundation is well-designed; it just needs bug fixes.

---

## Discoveries

### Discovery Category 1: SSE Infrastructure (Well-Designed)

**Current Implementation:**
- **SSE Endpoint**: `/api/game/[gameId]/stream/route.ts` - Uses Next.js ReadableStream with proper headers
- **Event Emitter**: `gameEventEmitter` singleton with 50 max listeners (supports multiple spectators)
- **Frontend Client**: `GameEventsContext` with exponential backoff reconnection and polling fallback
- **Event Types**: 6 event types subscribed (message, turn_start, turn_end, phase_change, phase_complete, discussion_complete)
- **Keepalive**: 15-second heartbeat prevents proxy timeouts
- **Cleanup**: Proper listener removal on disconnect

**Assessment**: The architecture follows Next.js best practices and is production-ready. The problem is not the design.

---

### Discovery Category 2: Root Cause Analysis (Logging Crash)

**Issue**: Pino logger with pino-pretty transport spawns worker thread that crashes under load.

**Evidence**:
- `/app/src/lib/logger.ts` line 9-16: Uses pino-pretty transport in development
- Vision document states: "Worker thread exits causing server instability and broken SSE connections"
- Master explorers confirm: "Pino crashes due to pino-pretty worker thread issues"

**Impact**: When worker thread crashes, server becomes unstable → SSE connections drop → no real-time updates

**Fix**: Remove pino-pretty transport, use basic Pino with JSON output (5-line change)

```typescript
// BEFORE (lines 9-16):
transport: process.env.NODE_ENV === 'development' ? {
  target: 'pino-pretty',
  options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
} : undefined,

// AFTER:
// Remove transport entirely - use basic JSON logs
// (No transport = no worker threads = no crashes)
```

**Estimated Time**: 1 hour (change + testing)

---

### Discovery Category 3: Timer Synchronization Bug

**Issue**: PhaseIndicator calculates timer using client-side `new Date()` instead of server `phaseStartTime`.

**Evidence**:
- `/app/components/PhaseIndicator.tsx` line 59-61:
  ```typescript
  // In real implementation, this would come from the phase_change event payload
  // For now, use current time as approximation
  return new Date(); // BUG: Should use server time from event
  ```

**Impact**: Timer resets on page refresh because it recalculates from "now" instead of actual phase start time.

**Current Event Payload** (from types.ts line 43-48):
```typescript
type: 'PHASE_CHANGE';
payload: {
  from: string;
  to: string;
  // MISSING: phaseStartTime field
}
```

**Fix Approach**:
1. **Backend**: Add `phaseStartTime` and `phaseEndTime` to phase_change event payload (master-orchestrator.ts line ~75)
2. **Frontend**: Extract `phaseStartTime` from event instead of using `new Date()` (PhaseIndicator.tsx line 59-61)

**Estimated Time**: 2-3 hours (backend + frontend + testing)

---

### Discovery Category 4: Event Type Inconsistency

**Issue**: SSE route subscribes to lowercase event types, but event types definition uses uppercase.

**Evidence**:
- SSE route.ts line 45-50 subscribes to: `'message'`, `'turn_start'`, `'phase_change'` (lowercase)
- Event types.ts line 7-13 defines: `GameEventType = 'message' | 'turn_start' | ...` (lowercase)
- BUT actual GameEvent union uses: `type: 'NEW_MESSAGE'`, `type: 'PHASE_CHANGE'` (UPPERCASE)

**Example Mismatch**:
```typescript
// Event emitted (types.ts line 18):
{ gameId: string; type: 'NEW_MESSAGE'; payload: DiscussionMessage }

// SSE listens for (route.ts line 45):
gameEventEmitter.on('message', messageHandler); // 'message' !== 'NEW_MESSAGE'
```

**Fix**: Align event emission to use lowercase types matching SSE subscriptions:
- Change emitter calls from `emitGameEvent('NEW_MESSAGE', ...)` to `emitGameEvent('message', ...)`
- OR change SSE subscriptions from `on('message')` to `on('NEW_MESSAGE')`

**Recommendation**: Use lowercase (matches GameEventType definition in types.ts line 7-13)

**Estimated Time**: 2 hours (search codebase for all event emissions, align case)

---

### Discovery Category 5: Message Display (Dependent on SSE)

**Issue**: DiscussionFeed shows "Waiting for discussion..." despite 44 messages generated.

**Evidence**:
- DiscussionFeed.tsx line 62-80: Extracts messages from `events.filter(e => e.type === 'message')`
- If SSE doesn't deliver events, `events` array is empty → no messages appear

**Root Cause**: Symptom of SSE being broken (issues #1 and #4 above)

**Assessment**: DiscussionFeed component is correctly implemented. Once SSE is fixed, messages will appear automatically.

**Estimated Time**: 1 hour (validation testing after SSE fix, no code changes needed)

---

## Patterns Identified

### Pattern Type: Event-Driven Architecture with SSE

**Description**: Backend emits events via EventEmitter → SSE route streams events → Frontend consumes via EventSource

**Use Case**: Real-time updates for spectator-facing features (messages, phase changes, votes)

**Example**:
```typescript
// Backend (master-orchestrator.ts):
gameEventEmitter.emitGameEvent('phase_change', {
  gameId,
  type: 'phase_change',
  payload: { from: 'NIGHT', to: 'DAY_ANNOUNCEMENT', round: 1 },
});

// SSE route (stream/route.ts):
gameEventEmitter.on('phase_change', (data) => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
});

// Frontend (GameEventsContext.tsx):
eventSource.onmessage = (e) => {
  const event = JSON.parse(e.data);
  setEvents([...prev, event]);
};
```

**Recommendation**: Keep this pattern. It's well-designed for real-time updates.

---

### Pattern Type: State Catchup on Mount

**Description**: GameEventsContext fetches initial state via API, then queues SSE events until state is loaded.

**Use Case**: Late-joiners (spectators joining mid-game) need historical context before receiving live events.

**Example** (GameEventsContext.tsx line 58-89):
```typescript
// 1. Fetch initial state
const response = await fetch(`/api/game/${gameId}/state`);
const state = await response.json();
const initialEvents = stateToEvents(state); // Convert to event format

// 2. Apply queued SSE events
eventQueue.forEach((event) => setEvents([...prev, event]));
```

**Recommendation**: This pattern prevents race conditions (events arriving before initial state). Keep it.

---

### Pattern Type: Exponential Backoff Reconnection

**Description**: If SSE connection drops, retry with increasing delays (1s, 2s, 4s, 8s, 16s), then fall back to polling.

**Use Case**: Graceful degradation when SSE is flaky (proxy issues, network drops).

**Example** (GameEventsContext.tsx line 174-177):
```typescript
const delay = Math.pow(2, newAttempt) * 1000; // 1s, 2s, 4s, 8s, 16s
setTimeout(() => { /* reconnect */ }, delay);

if (newAttempt >= MAX_RETRIES) {
  setUsePolling(true); // Fall back to 2-second polling
}
```

**Recommendation**: Excellent resilience pattern. Keep it.

---

## Complexity Assessment

### High Complexity Areas
**NONE** - This is a healing iteration (tactical bug fixes), not a feature iteration.

### Medium Complexity Areas

**1. SSE Connection Stability** (4-6 hours)
- **Why medium**: Root cause diagnosis (is it logging, event types, or both?)
- **Approach**:
  1. Fix logging (remove pino-pretty) - test SSE connection
  2. If still broken, align event types (lowercase vs uppercase)
  3. If still broken, investigate EventEmitter timing
- **Splits needed**: 0 (single builder can iterate)

**2. Timer Synchronization** (2-3 hours)
- **Why medium**: Requires backend + frontend changes (cross-layer coordination)
- **Approach**:
  1. Add `phaseStartTime` to phase_change event payload (backend)
  2. Extract `phaseStartTime` from event (frontend)
  3. Test timer across refresh (should stay consistent)
- **Splits needed**: 0 (straightforward fix)

### Low Complexity Areas

**1. Logging Fix** (1 hour)
- **Why low**: 5-line config change, no logic changes
- **Approach**: Remove pino-pretty transport from logger.ts

**2. Message Display Verification** (1 hour)
- **Why low**: No code changes, just validation testing after SSE fix
- **Approach**: Run game, count messages in UI, verify matches database (44/44)

**3. Event Type Alignment** (2 hours)
- **Why low**: Search-and-replace task (find all `emitGameEvent` calls, align case)
- **Approach**: Grep for `emitGameEvent`, change uppercase to lowercase

---

## Technology Recommendations

### Primary Stack (Existing - Keep)

**Framework**: Next.js 14 (App Router)
- **Rationale**: SSE implementation is correct, supports ReadableStream for streaming
- **Strength**: Server Components + Client Components separation is clean
- **No changes needed**

**Database**: PostgreSQL via Supabase Local
- **Rationale**: Schema is complete, no changes needed for Iteration 1
- **Strength**: Prisma ORM provides type-safe queries
- **No changes needed**

**Real-time**: Server-Sent Events (SSE)
- **Rationale**: Architecture is sound, just has bugs
- **Alternative considered**: WebSockets (overkill for one-way updates)
- **Recommendation**: Fix SSE, don't replace it

---

### Supporting Libraries

**Logging**: Pino (with fix)
- **Current issue**: pino-pretty transport causes crashes
- **Fix**: Remove transport, use basic Pino with JSON output
- **Alternative**: console.log (temporary fallback if Pino still unstable)
- **Recommendation**: Fix Pino first (1 hour), revert to console.log if still broken (1 hour)

**Event System**: Node.js EventEmitter
- **Assessment**: No issues detected, 50 max listeners is sufficient
- **Recommendation**: Keep as-is

**UI Components**: Tailwind CSS + shadcn/ui
- **Assessment**: PhaseIndicator and DiscussionFeed are well-designed
- **Recommendation**: Keep as-is, no changes needed

---

## Integration Points

### External APIs
**Claude API** (Anthropic)
- **Status**: Working (44 messages generated in backend)
- **Integration**: No changes needed for Iteration 1
- **Note**: Backend is stable, frontend just needs to display messages

### Internal Integrations

**Backend → SSE → Frontend Data Flow**
```
Master Orchestrator (emits events)
  ↓
gameEventEmitter (in-memory pub/sub)
  ↓
SSE Route Handler (streams to client)
  ↓
GameEventsContext (receives and stores events)
  ↓
React Components (subscribe via useGameEvents hook)
```

**Critical Points**:
1. Event emission must use correct types (lowercase)
2. SSE connection must stay alive (fix logging)
3. phase_change events must include `phaseStartTime` (fix timer sync)

---

## Risks & Challenges

### Technical Risks

**Risk 1: SSE Root Cause Unclear** (MEDIUM)
- **Description**: Logging fix may not resolve all SSE issues (could be event types, EventEmitter, or Next.js)
- **Impact**: If SSE still broken after logging fix, iteration extends
- **Mitigation**: Test SSE immediately after each fix (incremental validation)
- **Fallback**: Use polling mode (already exists in GameEventsContext)

**Risk 2: Event Type Inconsistency** (LOW)
- **Description**: Uppercase vs lowercase mismatch may be deeper than expected
- **Impact**: Need to search entire codebase for event emissions
- **Mitigation**: Grep for `emitGameEvent` and `emit\('`, align all calls

**Risk 3: Timer Sync Accuracy** (LOW)
- **Description**: Server clock drift could cause ±5 second inaccuracy
- **Impact**: Minor UX issue (timer slightly off)
- **Mitigation**: Accept ±5 second tolerance (acceptable for spectators)

### Complexity Risks

**No builder splits needed** - All fixes are tactical, can be done by single builder iteratively.

---

## Recommendations for Planner

### 1. Fix Logging FIRST (Critical Path)
**Rationale**: SSE can't work if server crashes. Logging stability is foundation.

**Approach**:
```typescript
// logger.ts - Remove pino-pretty transport
export const logger = pino({
  level: process.env.LOG_LEVEL || 'debug',
  // Remove transport (no pino-pretty, no worker threads)
});
```

**Testing**: Start game, monitor logs for 10 minutes, verify zero crashes.

**Time**: 1 hour

---

### 2. Align Event Types (Fix SSE Event Delivery)
**Rationale**: If event types mismatch, SSE won't deliver events even if logging is stable.

**Approach**:
1. Grep codebase for `emitGameEvent` calls
2. Change all uppercase types to lowercase (match GameEventType definition)
3. OR change SSE subscriptions to uppercase (match GameEvent types)

**Recommendation**: Use lowercase (matches types.ts line 7-13 definition)

**Testing**: Add console.log in SSE route message handler, verify events arrive.

**Time**: 2 hours

---

### 3. Add phaseStartTime to Events (Fix Timer Sync)
**Rationale**: Timer needs server-authoritative time, not client approximation.

**Backend Change** (master-orchestrator.ts):
```typescript
gameEventEmitter.emitGameEvent('phase_change', {
  gameId,
  type: 'phase_change',
  payload: {
    from: previousPhase,
    to: currentPhase,
    round: roundNumber,
    phaseStartTime: new Date().toISOString(), // ADD THIS
    phaseEndTime: calculatePhaseEndTime(currentPhase).toISOString(), // ADD THIS
  },
});
```

**Frontend Change** (PhaseIndicator.tsx line 54-62):
```typescript
const phaseStartTime = useMemo<Date | null>(() => {
  const phaseEvents = events.filter((e) => e.type === 'phase_change');
  if (phaseEvents.length === 0) return null;
  const latestPhase = phaseEvents[phaseEvents.length - 1];
  if (!latestPhase.payload.phaseStartTime) return null;
  return new Date(latestPhase.payload.phaseStartTime); // USE SERVER TIME
}, [events]);
```

**Testing**: Refresh page mid-phase, verify timer continues from correct value (±2 seconds).

**Time**: 3 hours

---

### 4. Verify Message Display (Validation Only)
**Rationale**: Once SSE is fixed, messages should appear automatically (DiscussionFeed is correctly implemented).

**Testing**: Run full game, verify 40+ messages appear in discussion feed.

**Time**: 1 hour

---

### 5. Success Criteria (How to Validate Iteration 1 Complete)

**1. SSE Connection Stable**
- Metric: Connection status shows "Connected" (green) for 10+ minute game
- Test: Run 3 consecutive games, zero "worker has exited" errors
- **Pass condition**: 3/3 games complete without crashes

**2. Messages Appear**
- Metric: Message count in UI matches database count
- Test: Run game with discussion phase, verify 40+ messages appear
- **Pass condition**: 44/44 messages visible in feed

**3. Timer Syncs Across Refresh**
- Metric: Time remaining within ±2 seconds after refresh
- Test: Refresh page mid-phase, compare timer value
- **Pass condition**: Timer difference < 5 seconds across 10 refreshes

**4. Backend Tests Still Passing**
- Metric: All 47 backend tests pass
- Test: Run `npm test` after each fix
- **Pass condition**: 47/47 tests passing

---

## Resource Map

### Critical Files/Directories

**SSE Infrastructure**:
- `/app/app/api/game/[gameId]/stream/route.ts` - SSE endpoint (modify event subscriptions)
- `/app/contexts/GameEventsContext.tsx` - Frontend SSE client (no changes needed)
- `/app/src/lib/events/emitter.ts` - Event emitter singleton (no changes needed)
- `/src/lib/events/types.ts` - Event type definitions (align with route.ts)

**Logging System**:
- `/app/src/lib/logger.ts` - Pino configuration (remove pino-pretty transport)

**Timer Synchronization**:
- `/app/components/PhaseIndicator.tsx` - Timer display (extract phaseStartTime from events)
- `/app/src/lib/game/master-orchestrator.ts` - Backend orchestrator (add phaseStartTime to events)
- `/app/lib/game/phase-config.ts` - Phase configuration (no changes needed)

**Message Display**:
- `/app/components/DiscussionFeed.tsx` - Message list (no changes needed, just validation)

---

### Key Dependencies

**Backend Dependencies**:
- `pino` - Logging library (keep, just fix config)
- `@prisma/client` - Database ORM (no changes needed)
- `events` (Node.js built-in) - EventEmitter (no changes needed)

**Frontend Dependencies**:
- `next` 14.2.18 - Framework (no changes needed)
- `react` 18 - UI library (no changes needed)
- `date-fns` - Time formatting (used in DiscussionFeed, no changes needed)

---

### Testing Infrastructure

**Existing Tests**:
- 47 backend tests (Vitest) - MUST keep passing
- 0 frontend tests - Not needed for Iteration 1 (Iteration 3 scope)

**Manual Testing Checklist**:
1. Start dev server: `npm run dev`
2. Create game: POST `/api/game/create`
3. Start game: POST `/api/game/[gameId]/start`
4. Open game page: `http://localhost:3001/game/[gameId]`
5. Verify SSE connection status: green "Connected"
6. Wait for discussion phase: verify messages appear (count > 40)
7. Refresh page: verify timer stays consistent (±2 seconds)
8. Monitor logs: zero "worker has exited" errors

---

## Questions for Planner

**Q1: Should we fix Pino or revert to console.log?**
- **Recommendation**: Try Pino fix first (1 hour), revert to console.log if still unstable (1 hour)
- **Rationale**: Pino provides structured logging (valuable for debugging), but stability is priority

**Q2: Should we use lowercase or uppercase event types?**
- **Recommendation**: Lowercase (matches GameEventType definition in types.ts)
- **Rationale**: Less code changes (SSE route already uses lowercase), aligns with TypeScript types

**Q3: Do we need E2E tests in Iteration 1?**
- **Recommendation**: No, defer to Iteration 3 (manual testing sufficient for healing iteration)
- **Rationale**: Need working features before writing tests, Iteration 1 is about making it work

**Q4: Should we add phaseEndTime or just phaseStartTime?**
- **Recommendation**: Add both (phaseStartTime + phaseEndTime)
- **Rationale**: Frontend can use phaseEndTime directly instead of calculating (simpler, more accurate)

---

## Estimated Complexity for Iteration 1

**Overall: SIMPLE** (8-12 hours)

**Breakdown**:
1. Fix logging (remove pino-pretty): 1 hour
2. Align event types (lowercase): 2 hours
3. Add phaseStartTime to events: 3 hours
4. Verify message display: 1 hour
5. Testing and validation: 2 hours
6. Buffer for unexpected issues: 3 hours

**Total**: 12 hours (realistic), 8 hours (optimistic)

**Builder allocation**: 1 builder (no splits needed)

---

*Exploration completed: 2025-10-13*
*Report Location: /home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/.2L/plan-2/iteration-5/exploration/explorer-1-report.md*
