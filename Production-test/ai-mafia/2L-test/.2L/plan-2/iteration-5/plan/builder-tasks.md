# Builder Task Breakdown

## Overview

**2 primary builders** will work in sequence (not parallel, due to dependencies).

**Builder 1** fixes logging + SSE stability + adds phaseStartTime to events.
**Builder 2** (starts after Builder 1 SSE fix) fixes timer sync + verifies message display.

**Total Estimated Time:** 10-14 hours
- Builder 1: 6-8 hours
- Builder 2: 4-6 hours (starts after Builder 1 SSE gate)

**Why Sequential:**
- Builder 2 depends on SSE working (Builder 1's responsibility)
- Timer sync depends on phase_change events with phaseStartTime (Builder 1 adds this)
- Message display depends on SSE delivering events (Builder 1 fixes)

---

## Builder-1: Fix Logging & Stabilize SSE (FOUNDATION)

### Scope
Fix Pino logging crashes, restore SSE connection stability, add phaseStartTime to phase_change events. This is the **foundation** - everything else depends on SSE working reliably.

**Key responsibilities:**
1. Remove pino-pretty transport from logger.ts (5 minutes)
2. Verify SSE endpoint stays connected for 10+ minutes (2-3 hours testing)
3. Add phaseStartTime + phaseEndTime to phase_change event payload (1-2 hours)
4. Verify event type case consistency (lowercase) (1-2 hours)
5. Test backend stability (run 47 tests, 3 full games)

### Complexity Estimate
**MEDIUM**

**Rationale:**
- Logging fix is trivial (5 minutes)
- SSE debugging is time-consuming (root cause unclear until testing)
- Event payload changes are straightforward (1-2 hours)
- Testing is critical (2-3 hours for 3 full games)

**Estimated Time:** 6-8 hours
- Logging fix: 5 minutes
- SSE verification: 2-3 hours (includes debugging if issues persist)
- Event payload changes: 1-2 hours
- Event type alignment: 1-2 hours (if needed)
- Testing: 2-3 hours (run 47 tests + 3 full games)

### Success Criteria

- [ ] **Zero "worker has exited" errors** - Run 3 consecutive games, monitor logs for crashes
- [ ] **SSE connection stays alive 10+ minutes** - Connection status shows "Connected" (green) throughout entire game
- [ ] **All 47 backend tests passing** - `npm test` exits with code 0, no regressions
- [ ] **phase_change events include phaseStartTime** - Verify event payload has phaseStartTime + phaseEndTime fields
- [ ] **Event types are lowercase** - All event emissions use lowercase ('message', not 'NEW_MESSAGE')
- [ ] **3/3 games complete without crashes** - Full game flow works (NIGHT → VOTING → WIN_CHECK)

### Files to Create
**None** - All files already exist, just modifying configuration and event payload

### Files to Modify

**CRITICAL:**
1. **`src/lib/logger.ts`** (line 9-16)
   - **Change:** Remove `transport` configuration (pino-pretty)
   - **Rationale:** Eliminates worker thread crashes
   - **Estimated time:** 5 minutes

2. **`src/lib/game/master-orchestrator.ts`** (around line 75, search for `phase_change`)
   - **Change:** Add `phaseStartTime` and `phaseEndTime` to phase_change event payload
   - **Rationale:** Enables timer sync for Builder 2
   - **Estimated time:** 1-2 hours (includes testing)

**VERIFY (no changes expected):**
3. **`app/api/game/[gameId]/stream/route.ts`** (line 1-100)
   - **Action:** Verify event subscriptions use lowercase ('message', 'phase_change')
   - **Rationale:** Ensure event type case consistency
   - **Estimated time:** 30 minutes (reading + verification)

4. **`contexts/GameEventsContext.tsx`** (line 1-200)
   - **Action:** Verify reconnection logic works correctly
   - **Rationale:** Understand fallback behavior (exponential backoff + polling)
   - **Estimated time:** 30 minutes (reading + testing)

**CONDITIONALLY MODIFY (if event type mismatch found):**
5. **Search codebase for `emitGameEvent` calls**
   - **Command:** `grep -r "emitGameEvent" src/`
   - **Action:** Verify all event types are lowercase
   - **Change:** If uppercase found (e.g., 'NEW_MESSAGE'), change to lowercase ('message')
   - **Estimated time:** 1-2 hours (search + align + test)

### Dependencies

**Depends on:** None (this is the foundation)

**Blocks:**
- Builder 2 timer sync (depends on phaseStartTime in events)
- Builder 2 message verification (depends on SSE working)

### Implementation Notes

**Step 1: Fix Logging (5 minutes)**
```typescript
// src/lib/logger.ts (line 1-28)
// BEFORE (lines 9-16):
transport: process.env.NODE_ENV === 'development' ? {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'HH:MM:ss',
    ignore: 'pid,hostname',
  },
} : undefined,

// AFTER (FIXED):
// Remove entire transport configuration (lines 9-16)
// Pino now writes JSON directly to stdout
```

**Step 2: Test Backend Stability**
```bash
# Immediately after changing logger.ts
npm test  # MUST pass all 47 tests

# Start dev server
npm run dev

# Monitor logs for "worker has exited" errors
# Expected: Zero errors
```

**Step 3: Verify SSE Connection**
```bash
# Create game
curl -X POST http://localhost:3001/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"playerCount": 10}'

# Start game
curl -X POST http://localhost:3001/api/game/{gameId}/start

# Open browser: http://localhost:3001/game/{gameId}
# Check DevTools → Network → EventStream
# Expected: Connection "pending" (stays open)
# Monitor for 10+ minutes
```

**Step 4: Add phaseStartTime to Events**
```typescript
// src/lib/game/master-orchestrator.ts
// Search for: gameEventEmitter.emitGameEvent('phase_change'

// ADD THIS to payload:
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

// Helper function to calculate phaseEndTime:
function calculatePhaseEndTime(phase: string): Date {
  const phaseConfig = getPhaseConfig(phase); // From phase-config.ts
  const durationMs = phaseConfig.duration * 1000;
  return new Date(Date.now() + durationMs);
}
```

**Step 5: Verify Event Types**
```bash
# Search for all event emissions
grep -r "emitGameEvent" src/

# Expected: All event types are lowercase
# 'message', 'phase_change', 'turn_start', 'turn_end', etc.

# If uppercase found (e.g., 'NEW_MESSAGE'), change to lowercase
```

**Step 6: Full Game Testing (CRITICAL)**
```bash
# Run 3 consecutive games
for i in 1 2 3; do
  echo "Starting game $i..."
  curl -X POST http://localhost:3001/api/game/create \
    -H "Content-Type: application/json" \
    -d '{"playerCount": 10}'

  # Extract gameId from response
  # Start game
  curl -X POST http://localhost:3001/api/game/{gameId}/start

  # Open browser, monitor for 10-15 minutes
  # Verify:
  # - SSE stays connected
  # - No "worker has exited" errors
  # - All phases complete
  # - Messages appear
done

# Success: 3/3 games complete without crashes
```

### Patterns to Follow

**From patterns.md:**
- **Pattern 1:** Remove pino-pretty transport (CRITICAL)
- **Pattern 3:** Verify SSE endpoint stability
- **Pattern 4:** Add phaseStartTime to event payload
- **Pattern 8:** Emit events from backend (reference)
- **Pattern 9:** Manual SSE connection test
- **Pattern 12:** Backend test validation (GATE)

### Testing Requirements

**Unit Tests:**
- All 47 existing backend tests must pass
- No new tests needed for this iteration

**Integration Tests:**
- SSE connection stays alive for 10+ minutes
- 3 consecutive games complete without crashes
- phase_change events include phaseStartTime field

**Manual Validation:**
- Open DevTools Network tab, verify EventStream connection
- Check ConnectionStatus component: green "Connected"
- Monitor terminal logs: zero "worker has exited" errors
- Verify phase_change event payload has phaseStartTime + phaseEndTime

### Potential Split Strategy

**If complexity proves HIGH (SSE debugging takes >4 hours):**

**Foundation (Primary Builder 1):**
- Fix logging (5 minutes)
- Run backend tests (10 minutes)
- Basic SSE verification (1 hour)

**Sub-builder 1A: SSE Deep Debugging**
- **Scope:** If SSE still broken after logging fix, deep dive into EventEmitter, event types, streaming
- **Files:** `app/api/game/[gameId]/stream/route.ts`, event emission sites
- **Estimate:** 3-4 hours
- **Success:** SSE connection stable for 10+ minutes

**Sub-builder 1B: Event Payload Enhancement**
- **Scope:** Add phaseStartTime + phaseEndTime to phase_change events
- **Files:** `src/lib/game/master-orchestrator.ts`
- **Estimate:** 1-2 hours
- **Success:** Events include phaseStartTime field, Builder 2 can extract it

**Recommendation:** Try as single builder first. Split only if SSE debugging exceeds 4 hours.

---

## Builder-2: Fix Timer Sync & Verify Message Display

### Scope
Extract phaseStartTime from phase_change events to fix timer sync, verify all 44 messages appear in discussion feed. This builds on Builder 1's SSE stability fix.

**Key responsibilities:**
1. Extract phaseStartTime from phase_change events (PhaseIndicator.tsx)
2. Test timer sync across page refresh (must stay consistent)
3. Verify message display (count messages, compare to database)
4. Manual validation: 3 full games, 44/44 messages appear

### Complexity Estimate
**LOW-MEDIUM**

**Rationale:**
- Timer fix is straightforward (2-3 hours)
- Message verification is validation only (no code changes needed)
- Depends on Builder 1 SSE fix working
- Most time spent on testing (3 full games)

**Estimated Time:** 4-6 hours
- Timer sync fix: 2-3 hours (code + testing)
- Message display verification: 1-2 hours (validation + debugging if needed)
- Full game testing: 1-2 hours (3 consecutive games)

### Success Criteria

- [ ] **Timer syncs across refresh (±2 seconds)** - Refresh page mid-phase, timer shows consistent value
- [ ] **44/44 messages appear in all 3 games** - Count messages in UI, verify matches database
- [ ] **Messages display in chronological order** - Oldest at top, newest at bottom
- [ ] **Auto-scroll works** - New messages scroll into view automatically
- [ ] **3/3 games complete with correct timer + messages** - Full validation run

### Files to Create
**None** - All files already exist, just modifying timer calculation logic

### Files to Modify

**CRITICAL:**
1. **`components/PhaseIndicator.tsx`** (line 59-61)
   - **Change:** Extract phaseStartTime from phase_change events instead of using `new Date()`
   - **Rationale:** Fix timer desync on refresh
   - **Estimated time:** 2-3 hours (code + testing)

**VERIFY (no changes expected):**
2. **`components/DiscussionFeed.tsx`** (line 62-80)
   - **Action:** Verify message extraction logic is correct
   - **Rationale:** Ensure component correctly filters 'message' events
   - **Estimated time:** 30 minutes (reading + verification)

3. **`contexts/GameEventsContext.tsx`** (line 1-200)
   - **Action:** Verify events array contains all SSE messages
   - **Rationale:** Understand how messages flow from SSE to components
   - **Estimated time:** 30 minutes (reading)

### Dependencies

**Depends on:**
- **Builder 1 SSE stability** - SSE connection must stay alive
- **Builder 1 phaseStartTime in events** - phase_change events must include phaseStartTime field

**Blocks:** None (this is final iteration work)

### Implementation Notes

**Step 1: Extract phaseStartTime from Events**
```typescript
// components/PhaseIndicator.tsx (line 59-61)
// BEFORE (BROKEN):
const phaseStartTime = useMemo<Date | null>(() => {
  // In real implementation, this would come from the phase_change event payload
  // For now, use current time as approximation
  return new Date(); // ← BUG: Resets on refresh
}, [events]);

// AFTER (FIXED):
const phaseStartTime = useMemo<Date | null>(() => {
  // Extract latest phase_change event
  const phaseEvents = events.filter((e) => e.type === 'phase_change');
  if (phaseEvents.length === 0) return null;

  const latestPhase = phaseEvents[phaseEvents.length - 1];
  if (!latestPhase?.payload?.phaseStartTime) return null;

  // Use server-provided phaseStartTime
  return new Date(latestPhase.payload.phaseStartTime);
}, [events]);
```

**Step 2: Test Timer Sync (CRITICAL)**
```bash
# Start game, wait for DISCUSSION phase (5-minute timer)
# Note timer value: e.g., "4:32"

# Refresh page immediately
# Check timer after refresh

# Expected: "4:30" or "4:28" (±2 seconds acceptable)
# NOT "5:00" (that means timer reset, bug still present)

# Repeat test 10 times at different points in phase
# All tests must pass (±2 seconds tolerance)
```

**Step 3: Verify Message Display**
```bash
# Start game, wait for DISCUSSION phase
# Watch messages appear in DiscussionFeed

# Count messages in UI as they appear
# Expected: 40+ messages over 5 minutes

# Compare to database:
psql -U postgres -h 127.0.0.1 -p 54322 -d postgres \
  -c "SELECT COUNT(*) FROM \"DiscussionMessage\" WHERE \"gameId\" = '{gameId}';"

# UI count should match database count
```

**Step 4: Debug Logging (Temporary)**
```typescript
// Add to PhaseIndicator.tsx for debugging
useEffect(() => {
  const phaseEvents = events.filter((e) => e.type === 'phase_change');
  if (phaseEvents.length > 0) {
    const latestPhase = phaseEvents[phaseEvents.length - 1];
    console.log('[TIMER DEBUG] phaseStartTime:', latestPhase.payload.phaseStartTime);
    console.log('[TIMER DEBUG] phaseEndTime:', latestPhase.payload.phaseEndTime);
    console.log('[TIMER DEBUG] timeRemaining:', timeRemaining);
  }
}, [events, timeRemaining]);

// Add to DiscussionFeed.tsx for debugging
useEffect(() => {
  const messageCount = events.filter((e) => e.type === 'message').length;
  console.log('[MESSAGE DEBUG] Total messages:', messageCount);
}, [events]);

// REMEMBER TO REMOVE before completion
```

**Step 5: Full Game Validation (3 games)**
```bash
# For each of 3 games:
# 1. Start game
# 2. Verify timer shows countdown (not "0:00")
# 3. Refresh page during DISCUSSION phase
# 4. Verify timer consistent (±2 seconds)
# 5. Count messages in UI (40+)
# 6. Verify messages scroll automatically
# 7. Compare message count to database

# Success: 3/3 games pass all checks
```

### Patterns to Follow

**From patterns.md:**
- **Pattern 6:** Extract phaseStartTime from events (CRITICAL)
- **Pattern 7:** Verify message event extraction
- **Pattern 10:** Timer sync validation
- **Pattern 11:** Message count validation

### Testing Requirements

**Unit Tests:**
- No new tests needed (timer logic is in component)

**Manual Validation (CRITICAL):**
- Timer sync: Refresh page 10 times, verify ±2 seconds
- Message display: Count messages in UI, compare to database
- Full game validation: 3 consecutive games, all checks pass

**Debug Logging (Temporary):**
- Add console.log to PhaseIndicator for timer debugging
- Add console.log to DiscussionFeed for message count
- Remove all debug logs before completion

### Potential Split Strategy

**If complexity proves HIGH (timer sync takes >3 hours):**

**Foundation (Primary Builder 2):**
- Extract phaseStartTime from events (2 hours)
- Basic timer sync testing (1 hour)

**Sub-builder 2A: Timer Sync Deep Debugging**
- **Scope:** If timer still resets after fix, debug event extraction, time calculation
- **Files:** `components/PhaseIndicator.tsx`, `contexts/GameEventsContext.tsx`
- **Estimate:** 2-3 hours
- **Success:** Timer syncs across refresh (±2 seconds)

**Sub-builder 2B: Message Display Validation**
- **Scope:** Verify all 44 messages appear, debug if missing
- **Files:** `components/DiscussionFeed.tsx`, database queries
- **Estimate:** 1-2 hours
- **Success:** 44/44 messages appear in all 3 games

**Recommendation:** Try as single builder first. Split only if timer debugging exceeds 3 hours.

---

## Builder Execution Order

### Phase 1: Builder 1 (Foundation) - MUST COMPLETE FIRST

**Estimated:** 6-8 hours

**Critical Gate:** SSE connection stays alive for 10+ minutes

**Deliverables:**
1. Logging fix applied (`src/lib/logger.ts` modified)
2. SSE connection stable (verified via manual testing)
3. phaseStartTime added to phase_change events (`master-orchestrator.ts` modified)
4. All 47 backend tests passing (`npm test` passes)
5. 3 consecutive games complete without crashes

**Handoff to Builder 2:**
- SSE working reliably
- phase_change events include phaseStartTime field
- Backend tests still passing (no regressions)

---

### Phase 2: Builder 2 (Timer & Messages) - STARTS AFTER BUILDER 1 GATE

**Estimated:** 4-6 hours

**Depends On:** Builder 1 SSE stability gate

**Deliverables:**
1. Timer sync fixed (`components/PhaseIndicator.tsx` modified)
2. Timer syncs across refresh (±2 seconds verified)
3. Message display verified (44/44 messages appear)
4. 3 consecutive games with correct timer + messages

**Final Validation:**
- Timer syncs across refresh (10 tests, all pass)
- 44/44 messages appear (3 games, all pass)
- Auto-scroll works (manual check)
- Zero regressions (47 backend tests still pass)

---

## Integration Notes

### Shared Files (No Merge Conflicts Expected)

**Builder 1 modifies:**
- `src/lib/logger.ts` (lines 9-16) - Remove transport
- `src/lib/game/master-orchestrator.ts` (around line 75) - Add phaseStartTime to events

**Builder 2 modifies:**
- `components/PhaseIndicator.tsx` (lines 59-61) - Extract phaseStartTime from events

**No overlap** - Builders work on different files

### Event Payload Schema (Coordination Point)

**Builder 1 adds this to phase_change events:**
```typescript
{
  gameId: string;
  type: 'phase_change';
  payload: {
    from: string;
    to: string;
    round: number;
    phaseStartTime: string; // ISO 8601 timestamp (Builder 1 adds)
    phaseEndTime: string;   // ISO 8601 timestamp (Builder 1 adds)
  }
}
```

**Builder 2 extracts this from events:**
```typescript
const latestPhase = phaseEvents[phaseEvents.length - 1];
const phaseStartTime = new Date(latestPhase.payload.phaseStartTime); // Builder 2 uses
```

**Coordination:**
- Builder 1 ensures phaseStartTime is ISO 8601 string
- Builder 2 parses ISO 8601 string to Date object
- Both builders verify format in testing

### Testing Coordination

**Builder 1 tests:**
- Logging stability (no crashes)
- SSE connection (stays alive 10+ minutes)
- Event payload structure (phaseStartTime included)

**Builder 2 tests:**
- Timer sync (uses Builder 1's phaseStartTime)
- Message display (depends on Builder 1's SSE)
- Full game validation (combines both fixes)

**Shared testing:** Both builders run `npm test` (47 tests must always pass)

---

## Timeline Summary

```
Builder 1 (Foundation):                 6-8 hours
  ├─ Logging fix                        5 min
  ├─ Backend test validation            10 min
  ├─ SSE stability testing              2-3 hours
  ├─ Add phaseStartTime to events       1-2 hours
  ├─ Event type alignment               1-2 hours
  └─ Full game testing (3 games)        2-3 hours

  ↓ GATE: SSE stable, phaseStartTime in events

Builder 2 (Timer & Messages):           4-6 hours
  ├─ Extract phaseStartTime             2-3 hours
  ├─ Timer sync testing                 1-2 hours
  ├─ Message display verification       1-2 hours
  └─ Full game validation (3 games)     1-2 hours

Total Estimated Time:                   10-14 hours
```

---

## Risk Mitigation

**Risk:** Builder 1 SSE debugging takes >4 hours
- **Mitigation:** Split into Sub-builder 1A (SSE debugging) if needed
- **Fallback:** Use polling mode (already exists), defer SSE fix to separate iteration

**Risk:** Builder 2 starts before Builder 1 gate
- **Mitigation:** Enforce gate - Builder 2 CANNOT start until SSE verified stable
- **Validation:** Builder 1 provides SSE stability report before handoff

**Risk:** Timer sync still broken after fix
- **Mitigation:** Add debug logging, verify event payload structure, check time calculation
- **Fallback:** Accept ±5 second tolerance (less ideal, but acceptable for MVP)

**Risk:** Messages don't appear despite SSE working
- **Mitigation:** Debug DiscussionFeed event filtering, verify event payload structure
- **Fallback:** Fetch messages from API on mount (not real-time, but shows messages)

---

## Success Metrics

**Builder 1 Success:**
- [ ] Zero "worker has exited" errors (3 games)
- [ ] SSE connection stable for 10+ minutes (3 games)
- [ ] phaseStartTime in phase_change events (verified in DevTools)
- [ ] All 47 backend tests passing (npm test passes)

**Builder 2 Success:**
- [ ] Timer syncs across refresh ±2 seconds (10 tests)
- [ ] 44/44 messages appear (3 games)
- [ ] Auto-scroll works (manual check)
- [ ] Full game validation passes (3 games)

**Overall Iteration Success:**
- [ ] All Builder 1 + Builder 2 success criteria met
- [ ] Zero regressions (47 backend tests still pass)
- [ ] Manual testing report shows 3/3 games successful

---

## Completion Checklist

**Builder 1:**
- [ ] `src/lib/logger.ts` modified (transport removed)
- [ ] `npm test` passes (47/47 tests)
- [ ] SSE stability verified (10+ minutes, 3 games)
- [ ] `src/lib/game/master-orchestrator.ts` modified (phaseStartTime added)
- [ ] Event payload validated (phaseStartTime + phaseEndTime present)
- [ ] Debug logging removed
- [ ] Handoff report to Builder 2 (SSE gate status)

**Builder 2:**
- [ ] `components/PhaseIndicator.tsx` modified (phaseStartTime extraction)
- [ ] Timer sync verified (±2 seconds, 10 tests)
- [ ] Message display verified (44/44 messages, 3 games)
- [ ] Auto-scroll verified (manual check)
- [ ] Debug logging removed
- [ ] Final validation report (3 games, all checks pass)

**Both Builders:**
- [ ] Zero TypeScript errors
- [ ] Code follows patterns.md conventions
- [ ] Import order convention followed
- [ ] No console.log statements (except during debugging, then removed)
- [ ] All temporary debug code removed

---

**Builder Tasks Status:** READY FOR EXECUTION
**Next Phase:** Builder assignment, begin with Builder 1 (logging + SSE)
