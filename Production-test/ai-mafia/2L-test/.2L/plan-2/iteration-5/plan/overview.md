# 2L Iteration Plan - AI Mafia Critical Fixes (Iteration 5)

## Project Vision
**"Make the frontend actually work"** - Stabilize logging to restore SSE connections, sync timer with server state, and verify all 44 messages appear in real-time. This is a **healing iteration** focused on making existing infrastructure reliable, not adding new features.

The AI Mafia backend works perfectly (validated in Iteration 4: 44 messages generated, 47 tests passing). The problem is purely frontend: broken SSE connections caused by Pino logging crashes prevent real-time updates from reaching spectators.

## Success Criteria
Specific, measurable criteria for MVP completion:

- [ ] **Zero "worker has exited" errors** - No Pino worker thread crashes during 10-minute game
- [ ] **SSE connection stable for 10+ minutes** - Connection status shows "Connected" (green) throughout entire game
- [ ] **Timer syncs with server (±2 seconds)** - Refreshing page shows consistent time remaining
- [ ] **44/44 messages appear** - All discussion messages display in feed, matching database count
- [ ] **All 47 backend tests passing** - Iteration 4 backend code remains stable (no regressions)
- [ ] **All API endpoints return 200 OK** - No 500 errors during game flow

## MVP Scope

**In Scope:**
- Fix Pino logging system (remove pino-pretty transport causing crashes)
- Restore SSE connection stability (event delivery working reliably)
- Fix timer synchronization (use server phaseStartTime from events)
- Verify message display (all 44 messages visible in UI)
- Validate API endpoint stability (no 500 errors)

**Out of Scope (Post-MVP):**
- Transparency features (role display, Mafia chat panel) - Deferred to Iteration 6
- Playwright E2E tests (testing infrastructure) - Deferred to Iteration 7
- Enhanced phase visualization - Deferred to Iteration 6
- Vote visualization improvements - Deferred to Iteration 6
- Visual regression testing - Deferred to Iteration 7

## Development Phases

1. **Exploration** ✅ Complete (2 explorers: Architecture & SSE, Logging & Dependencies)
2. **Planning** 🔄 Current
3. **Building** ⏳ 8-12 hours (2 builders working in sequence)
4. **Integration** ⏳ 30 minutes (builders coordinate SSE fixes)
5. **Validation** ⏳ 1 hour (manual testing, run 3 full games)
6. **Deployment** N/A (local dev only, no production deployment)

## Timeline Estimate

- Exploration: Complete (2 reports analyzed)
- Planning: Complete (this document)
- Building: 8-12 hours total
  - Builder 1 (Logging & SSE): 6-8 hours
  - Builder 2 (Timer & Message Verification): 4-6 hours (starts after Builder 1 SSE fix)
- Integration: 30 minutes (coordinate phaseStartTime event payload)
- Validation: 1 hour (manual testing: 3 consecutive games)
- **Total: ~10-14 hours**

## Risk Assessment

### High Risks

**Risk 1: SSE Root Cause May Not Be Only Logging**
- **Description**: Pino logging fix may not fully resolve SSE issues (could be event type mismatch, EventEmitter timing, or Next.js streaming bug)
- **Impact**: If SSE still broken after logging fix, iteration extends by 4-6 hours for deeper debugging
- **Mitigation**:
  1. Test SSE immediately after logging fix (don't wait for full iteration)
  2. Have fallback plan: Use polling mode (already exists in GameEventsContext)
  3. Check event type case consistency (lowercase vs uppercase mismatch)
- **Likelihood**: MEDIUM (Explorer 1 identified 3 potential bugs, not just logging)

**Risk 2: Breaking Iteration 4 Backend Code**
- **Description**: Logging changes could break 97 structured logging calls across 10 files
- **Impact**: CATASTROPHIC - backend crashes, 47 tests fail, no games can run
- **Mitigation**:
  1. Use Pattern 1 (remove pino-pretty transport) - zero API changes
  2. Run `npm test` immediately after logger.ts change
  3. Preserve all logger.info/error/warn/debug signatures
  4. Rollback plan ready (revert logger.ts change)
- **Likelihood**: LOW (if following Pattern 1)

### Medium Risks

**Risk 3: Timer Sync Accuracy**
- **Description**: Client clock drift or incorrect phaseEndTime calculation could cause ±5 second inaccuracy
- **Impact**: Timer shows wrong countdown, poor UX
- **Mitigation**:
  1. Use server-authoritative phaseStartTime + phaseEndTime from events
  2. Test timer sync across multiple devices with different timezones
  3. Accept ±5 second tolerance (acceptable for spectators)
- **Likelihood**: LOW (straightforward fix)

**Risk 4: Event Type Case Mismatch**
- **Description**: SSE route subscribes to lowercase ('message'), but backend emits uppercase ('NEW_MESSAGE')
- **Impact**: SSE receives no events, even if connection stable
- **Mitigation**:
  1. Align all event emissions to lowercase (matches GameEventType definition)
  2. Grep codebase for `emitGameEvent` calls, verify case consistency
  3. Add console.log in SSE route to debug event reception
- **Likelihood**: MEDIUM (Explorer 1 identified potential mismatch)

### Low Risks

**Risk 5: Message Display Issues Persist**
- **Description**: DiscussionFeed may not display messages even after SSE fix (component bug)
- **Impact**: Messages don't appear despite SSE delivering events
- **Mitigation**:
  1. Add console.log in DiscussionFeed.tsx to track event extraction
  2. Verify event payload structure matches component expectations
  3. Check event filtering logic (events.filter(e => e.type === 'message'))
- **Likelihood**: LOW (DiscussionFeed is correctly implemented per Explorer 1)

## Integration Strategy

**Builder Coordination:**

**Builder 1 → Builder 2 Handoff:**
- Builder 1 completes logging fix + SSE stability testing
- Builder 1 verifies SSE delivers phase_change events
- **Gate**: SSE connection stays alive for 10+ minutes (zero crashes)
- Builder 2 starts timer sync (depends on phase_change events working)

**Phase_change Event Payload (Shared Schema):**
```typescript
{
  gameId: string;
  type: 'phase_change';
  payload: {
    from: string;
    to: string;
    round: number;
    phaseStartTime: string; // ISO 8601 timestamp (ADD THIS - Builder 1)
    phaseEndTime: string;   // ISO 8601 timestamp (ADD THIS - Builder 1)
  }
}
```

**Integration Point:**
- Builder 1: Add phaseStartTime + phaseEndTime to phase_change event emission (master-orchestrator.ts)
- Builder 2: Extract phaseStartTime from events (PhaseIndicator.tsx line 59-61)

**Shared Files (No Merge Conflicts):**
- `src/lib/logger.ts` - Builder 1 only
- `app/api/game/[gameId]/stream/route.ts` - Builder 1 only
- `components/PhaseIndicator.tsx` - Builder 2 only
- `src/lib/game/master-orchestrator.ts` - Builder 1 modifies (phaseStartTime emission)

## Deployment Plan

**No production deployment** - This is a local development stability fix.

**Manual Testing Plan:**
1. **Start dev server**: `npm run dev`
2. **Create game**: `curl -X POST http://localhost:3001/api/game/create -H "Content-Type: application/json" -d '{"playerCount": 10}'`
3. **Start game**: `curl -X POST http://localhost:3001/api/game/{gameId}/start`
4. **Open browser**: Navigate to `http://localhost:3001/game/{gameId}`
5. **Monitor for 10 minutes**:
   - Check DevTools Network tab → EventStream connection (should stay open)
   - Watch connection status indicator (should be green "Connected")
   - Count messages as they appear (should be 40+ during discussion phase)
   - Refresh page mid-phase → verify timer shows same value (±2 seconds)
   - Monitor terminal logs → zero "worker has exited" errors
6. **Run 3 consecutive games** - All must complete without crashes
7. **Run backend tests**: `npm test` - All 47 tests must pass

**Success Gate:**
- ✅ 3/3 games complete without SSE disconnections
- ✅ 44/44 messages appear in all 3 games
- ✅ Timer syncs across refresh in all 3 games
- ✅ 47/47 backend tests passing
- ✅ Zero "worker has exited" errors in logs

## Notes

### Key Insights from Exploration

**Insight 1: Logging is the Root Cause (Explorer 2)**
- Pino v10 uses thread-stream which spawns worker threads for transports
- pino-pretty transport causes worker thread crashes under high logging volume
- When worker exits, server becomes unstable → SSE connections drop
- Fix: Remove pino-pretty transport (5-minute change), use basic Pino JSON output

**Insight 2: SSE Architecture is Sound (Explorer 1)**
- SSE endpoint implementation follows Next.js best practices
- GameEventsContext has proper reconnection logic (exponential backoff + polling fallback)
- EventEmitter pattern is correct (50 max listeners, proper cleanup)
- Problem is operational (logging crashes), not architectural

**Insight 3: Timer Bug is Simple Fix (Explorer 1)**
- PhaseIndicator currently uses `new Date()` approximation (line 61)
- Should use server phaseStartTime from phase_change events
- Fix: Extract phaseStartTime from events, calculate timeRemaining = phaseEndTime - Date.now()
- Estimated: 2-3 hours (backend + frontend + testing)

**Insight 4: Three Tactical Bugs, Not Strategic Issues**
1. Pino logger crashes (worker thread with pino-pretty)
2. Timer uses client-side `new Date()` instead of server phaseStartTime
3. Event type case mismatch (lowercase vs uppercase) - potential, needs verification

**Insight 5: Backend is Stable (Iteration 4 Validation)**
- 44 messages generated successfully
- 47 backend tests passing (100%)
- PostgreSQL migration complete
- All API endpoints structured correctly
- Zero backend changes needed for this iteration

### Complexity Assessment

**Overall Complexity: SIMPLE** (8-12 hours)

**Why SIMPLE:**
- No architectural refactoring needed
- Tactical bug fixes (logging config, timer calculation, event payload)
- Backend is stable (zero backend changes except event payload)
- Components are correctly implemented (just need SSE to work)

**Complexity Drivers:**
- **LOW**: Logging fix (5-minute config change)
- **MEDIUM**: SSE debugging (4-6 hours to verify stability after fix)
- **LOW**: Timer synchronization (2-3 hours)
- **LOW**: Message display verification (1 hour, just validation)

### Constraints

**MUST Preserve:**
- All 47 backend tests passing (Iteration 4 stability)
- All 97 logger method calls (no API changes)
- Zero console.log statements (Iteration 4 explicitly removed these)
- PostgreSQL schema (no migrations)
- Existing API endpoint signatures

**MUST NOT:**
- Break Iteration 4 backend code
- Change logger API (logger.info/error/warn/debug signatures)
- Add console.log statements (revert to structured logging)
- Modify database schema
- Deploy to production (local dev only)

### Deferred to Future Iterations

**Iteration 6 (Transparency Features):**
- Display player roles from start
- Show Mafia private night chat
- Enhanced phase visualization
- Role-colored player cards
- Enhanced vote visualization

**Iteration 7 (E2E Testing & Polish):**
- Playwright E2E test infrastructure (11 test scenarios)
- Visual regression testing
- CI/CD integration (GitHub Actions)
- Test stabilization (flakiness fixes)

---

**Plan Status:** READY FOR BUILDING
**Estimated Completion:** 10-14 hours
**Next Phase:** Builder Assignment (2 builders)
