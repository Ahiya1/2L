# Manual Testing Guide - Builder-2

## Prerequisites
- Builder-1 changes applied (logging fixed, phaseStartTime added to events)
- Dev server running: `npm run dev`
- Supabase Local running on port 54322

## Test 1: Timer Sync Verification

### Setup
1. Create a new game:
```bash
curl -X POST http://localhost:3001/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"playerCount": 10}'
```

2. Extract `gameId` from response (e.g., `abc123`)

3. Start the game:
```bash
curl -X POST http://localhost:3001/api/game/abc123/start
```

4. Open game in browser:
```
http://localhost:3001/game/abc123
```

### Test Steps
1. **Wait for DISCUSSION phase** (NIGHT → DAY_ANNOUNCEMENT → DISCUSSION)
   - DISCUSSION phase has 180-second (3-minute) timer

2. **Note the timer value** (e.g., "2:45" = 165 seconds remaining)

3. **Immediately refresh the page** (F5 or Cmd+R)

4. **Check timer after refresh:**
   - ✅ **PASS**: Timer shows similar value (±2 seconds, e.g., "2:43" or "2:47")
   - ❌ **FAIL**: Timer shows "3:00" (180 seconds) - timer reset to full duration

5. **Repeat test 10 times at different points:**
   - Refresh at 2:30, 2:00, 1:30, 1:00, 0:30, etc.
   - All refreshes should maintain consistent time (±2 seconds)

### Debug Console Output
Check browser console for debug logs:
```
[TIMER DEBUG] Phase: DISCUSSION
[TIMER DEBUG] phaseStartTime: 2025-10-13T15:30:00.000Z
[TIMER DEBUG] phaseEndTime: 2025-10-13T15:33:00.000Z
[TIMER DEBUG] timeRemaining: 165 seconds
```

**Verify:**
- `phaseStartTime` is server time (not `undefined` or changing on refresh)
- `timeRemaining` decreases each second
- After refresh, `phaseStartTime` stays the same (server-authoritative)

---

## Test 2: Message Display Verification

### Test Steps
1. **Wait for DISCUSSION phase** (agents start speaking)

2. **Watch DiscussionFeed component:**
   - Messages should appear every 5-10 seconds
   - Expected: 40+ messages over 3-minute discussion

3. **Count messages in UI:**
   - Look at "X messages" counter in feed header
   - Count should increase as agents speak

4. **Compare to database:**
```bash
# Connect to database
psql -U postgres -h 127.0.0.1 -p 54322 -d postgres

# Query message count
SELECT COUNT(*) FROM "DiscussionMessage" WHERE "gameId" = 'abc123';

# Exit
\q
```

5. **Verify counts match:**
   - ✅ **PASS**: UI count matches database count (±1 message acceptable)
   - ❌ **FAIL**: UI count is significantly lower (e.g., UI shows 10, DB shows 44)

### Debug Console Output
Check browser console for message logs:
```
[MESSAGE DEBUG] Total message events: 15
[MESSAGE DEBUG] Latest message: "I think Agent-Alpha is suspicious because they've been unusually quiet."
```

**Verify:**
- Message count increases as discussion progresses
- Latest message matches what you see in the feed
- No duplicate messages (check message IDs)

---

## Test 3: SSE Connection Stability

### Test Steps
1. **Open browser DevTools → Network tab**

2. **Filter by "EventStream"**

3. **Verify connection status:**
   - ✅ Connection shows "pending" (stays open)
   - ✅ "Connected" badge shows green in ConnectionStatus component
   - ❌ Connection shows "failed" or repeatedly reconnects

4. **Monitor for 10+ minutes:**
   - Connection should never close during entire game
   - Expected: Zero reconnection attempts
   - Expected: Zero "worker has exited" errors in terminal

5. **Check terminal logs:**
```
# Should NOT see:
"worker has exited"
"SSE connection error"

# Should see:
[GameEventsContext] SSE connected
{"level":"info","module":"orchestrator","msg":"Starting NIGHT phase"}
```

---

## Test 4: Full Game Validation (Run 3 Times)

### Test Steps
For each of 3 consecutive games:

1. **Create and start game** (see Test 1 setup)

2. **Monitor throughout entire game:**
   - Timer displays countdown (not "0:00")
   - Timer syncs across refresh (±2 seconds)
   - Messages appear in real-time (40+)
   - SSE connection stays "Connected" (green)
   - Auto-scroll works (new messages scroll into view)

3. **Verify in console:**
   - No "[TIMER DEBUG] phaseStartTime: undefined"
   - No "[MESSAGE DEBUG] Total message events: 0"
   - No errors or warnings

4. **Record results:**
   - Game 1: ✅/❌
   - Game 2: ✅/❌
   - Game 3: ✅/❌

### Success Criteria
- [ ] 3/3 games complete without SSE disconnections
- [ ] 3/3 games show correct timer sync (±2 seconds on refresh)
- [ ] 3/3 games display 40+ messages
- [ ] 3/3 games have stable SSE connection (no reconnects)
- [ ] Zero "worker has exited" errors in terminal

---

## Test 5: Backend Tests (Regression Check)

### Test Steps
```bash
cd /home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app
npm test -- --run
```

### Expected Results
- **Core tests PASS:**
  - phase-config.test.ts (9 tests)
  - turn-scheduler.test.ts
  - threading.test.ts
  - avatar-colors.test.ts
  - message-classification.test.ts
  - claude/client.test.ts
  - cost-tracker.test.ts

- **Known Pre-Existing Failures:**
  - repetition-tracker.test.ts (9 tests) - Agent name format changes (not related to this iteration)

### Success Criteria
- [ ] All core tests pass (no new failures introduced)
- [ ] Zero TypeScript errors
- [ ] Build completes successfully

---

## Troubleshooting

### Timer Still Resets on Refresh
**Issue:** Timer shows "3:00" after refresh (resets to full duration)

**Debug:**
1. Check console for `[TIMER DEBUG] phaseStartTime: undefined`
2. Verify phase_change events include phaseStartTime field:
```bash
curl -N http://localhost:3001/api/game/abc123/stream | grep phase_change
```

**Expected output:**
```json
data: {"gameId":"abc123","type":"phase_change","payload":{"from":"NIGHT","to":"DISCUSSION","round":1,"phaseStartTime":"2025-10-13T15:30:00.000Z","phaseEndTime":"2025-10-13T15:33:00.000Z"}}
```

**Fix:**
- If `phaseStartTime` is missing → Builder-1 changes not applied
- If `phaseStartTime` is present but timer resets → Check PhaseIndicator.tsx lines 54-63

---

### Messages Don't Appear
**Issue:** DiscussionFeed shows "Waiting for discussion to start..."

**Debug:**
1. Check console for `[MESSAGE DEBUG] Total message events: 0`
2. Verify SSE connection status (should be green "Connected")
3. Check terminal for "worker has exited" errors

**Fix:**
- If SSE disconnected → Builder-1 logging fix not applied
- If messages in database but not UI → Check DiscussionFeed event filtering

---

### SSE Connection Fails
**Issue:** ConnectionStatus shows red "Disconnected" or yellow "Reconnecting..."

**Debug:**
1. Check terminal logs for errors:
```
"worker has exited"
"[GameEventsContext] SSE connection error"
```

2. Verify logger.ts has no pino-pretty transport (Builder-1 fix)

3. Check SSE endpoint:
```bash
curl -N http://localhost:3001/api/game/abc123/stream
```

**Expected:** Stream stays open, receives events

**Fix:**
- If terminal shows "worker has exited" → Builder-1 logging fix not applied
- If curl fails → SSE endpoint issue (verify route.ts)

---

## Completion Checklist

Before marking Builder-2 as COMPLETE:

- [ ] Timer sync verified (10 refresh tests, all ±2 seconds)
- [ ] Message display verified (3 games, 40+ messages each)
- [ ] SSE connection stable (3 games, 10+ minutes each)
- [ ] Backend tests pass (no new failures)
- [ ] Debug logging removed (search for "TIMER DEBUG" and "MESSAGE DEBUG")
- [ ] Zero TypeScript errors
- [ ] Manual testing report written

---

**Status:** Ready for testing
**Estimated Time:** 2-3 hours for full validation (3 games × 10 minutes + analysis)
