# Integration Plan - Round 1

**Created:** 2025-10-13T00:00:00Z
**Iteration:** plan-1/iteration-2
**Total builders to integrate:** 8 (5 primary + 3 sub-builders)

---

## Executive Summary

Iteration 2 brings the full game loop to life with 8 builders contributing backend game phases, API layer, and complete UI. Analysis reveals excellent coordination with most builders already performing partial integration. Key challenges are merging overlapping file modifications (master-orchestrator.ts modified by 3 builders) and validating the full stack works end-to-end.

Key insights:
- **High pre-integration:** Builders 2 and 3 already integrated their phases into master-orchestrator
- **Clean separation:** UI builders (5, 6A, 6B, 6C) have zero file conflicts with backend builders
- **Critical path:** Master-orchestrator modifications must merge cleanly to enable game loop
- **Testing blocked:** Full integration testing requires all components merged and TypeScript compilation successful

---

## Builders to Integrate

### Primary Builders
- **Builder-1:** Master Orchestrator & Phase Transitions - Status: COMPLETE
- **Builder-2:** Night Phase + Day Announcement - Status: COMPLETE (already integrated)
- **Builder-3:** Voting Phase + Win Conditions + Role Assignment - Status: COMPLETE (already integrated)
- **Builder-4:** API Layer (6 endpoints) - Status: COMPLETE (TypeScript errors present)
- **Builder-5:** Lobby + Game Over Screens - Status: COMPLETE

### Sub-Builders (Builder-6 split)
- **Sub-Builder-6A:** Page Shell + Phase Indicator + Player Grid - Status: COMPLETE
- **Sub-Builder-6B:** Discussion Feed + Vote Tally - Status: COMPLETE
- **Sub-Builder-6C:** Integration + Error Handling + Testing - Status: COMPLETE

**Total outputs to integrate:** 8 builders

---

## Integration Zones

### Zone 1: Master Orchestrator File Conflicts (HIGH RISK)

**Builders involved:** Builder-1, Builder-2, Builder-3

**Conflict type:** File modifications (same file modified by 3 builders)

**Risk level:** HIGH

**Description:**
The file `app/src/lib/game/master-orchestrator.ts` was created by Builder-1 with mock implementations, then modified by Builder-2 to replace Night and Day mocks with real implementations, and further modified by Builder-3 to replace Voting mock with real implementation. This creates a 3-way merge conflict.

**Files affected:**
- `app/src/lib/game/master-orchestrator.ts` - Modified by Builders 1, 2, and 3
  - Builder-1: Created with mocks at lines 405-540
  - Builder-2: Replaced Night mock (lines 405-443) and Day mock (lines 453-495)
  - Builder-3: Replaced Voting mock (lines 505-540) and win condition checker (lines 106, 166)

**Integration strategy:**
1. Start with Builder-1's base file (complete structure)
2. Apply Builder-2's changes:
   - Add imports: `runNightPhase` and `runDayAnnouncement`
   - Replace `runNightPhaseMock` call with `runNightPhase` in NIGHT case
   - Replace `runDayAnnouncementMock` call with `runDayAnnouncement` in DAY_ANNOUNCEMENT case
   - Remove mock function implementations (lines 405-495)
3. Apply Builder-3's changes:
   - Add import: `runVotingPhase` and `checkWinConditionReal`
   - Replace `runVotingPhaseMock` call with `runVotingPhase` in VOTING case
   - Replace `checkWinCondition` calls with `checkWinConditionReal` (2 locations)
   - Remove voting mock implementation (lines 505-540)
4. Verify all imports resolve correctly
5. Run TypeScript compilation: `npx tsc --noEmit`

**Expected outcome:**
Single master-orchestrator.ts file with all real implementations, no mocks remaining, 5 phase cases fully functional.

**Assigned to:** Integrator-1

**Estimated complexity:** MEDIUM (3-way merge but changes are non-overlapping)

---

### Zone 2: Shared Types and Event Types (MEDIUM RISK)

**Builders involved:** Builder-1, Builder-2, Builder-3, Builder-4, Builder-6A

**Conflict type:** Shared type definitions (potential duplicates)

**Risk level:** MEDIUM

**Description:**
Multiple builders define or extend event types and game types. Need to verify all event types are unified in a single source of truth and no duplicate type definitions exist.

**Files affected:**
- `app/src/lib/events/types.ts` - Extended by Builder-1 with 9 new event types
- `app/src/lib/game/types.ts` - Created by Builder-1 with phase types and interfaces
- `app/lib/events/types.ts` - Created by Sub-builder-6A as re-export bridge
- `app/src/lib/api/validation.ts` - Created by Builder-4 with API types
- `app/src/lib/types/shared.ts` - Extended by Builder-1 with NightMessage type

**Integration strategy:**
1. Verify Builder-1's event type extensions are comprehensive
2. Check Sub-builder-6A's re-export bridge correctly points to Builder-1's types
3. Confirm Builder-4's API types don't duplicate game types
4. Validate Builder-2 and Builder-3's event emissions match type definitions
5. Check for any missing event types in `events/types.ts`
6. Verify no circular type dependencies

**Expected outcome:**
Unified type system with:
- `app/src/lib/events/types.ts` - Canonical event type definitions
- `app/lib/events/types.ts` - Re-export bridge for frontend
- `app/src/lib/game/types.ts` - Game phase types
- `app/src/lib/api/validation.ts` - API-specific types
- No duplicate definitions

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (verification task, no conflicts detected)

---

### Zone 3: Database Schema Integration (MEDIUM RISK)

**Builders involved:** Builder-1, Builder-4

**Conflict type:** Database schema extensions + migration

**Risk level:** MEDIUM

**Description:**
Builder-1 extended the Prisma schema with NightMessage table and new fields on existing tables. Builder-4 may have assumptions about schema that need verification. Migration must be applied before any code runs.

**Files affected:**
- `app/prisma/schema.prisma` - Extended by Builder-1
  - Added `NightMessage` table
  - Extended `Game` model with `phaseStartTime`, `nightVictim`
  - Extended `Player` model with `eliminatedInRound`, `eliminationType`
  - Extended `Vote` model with `phaseType`, `voteOrder`
  - Added indexes for performance
- `app/prisma/migrations/20251012212038_iteration_2_phases/migration.sql` - Generated by Builder-1

**Integration strategy:**
1. Review schema.prisma for consistency
2. Verify migration file is valid SQL
3. Apply migration to development database: `npx prisma migrate dev`
4. Regenerate Prisma client: `npx prisma generate`
5. Verify Builder-4's API routes use correct schema fields
6. Test query performance with new indexes
7. Verify NightMessage table separation for privacy

**Expected outcome:**
- Database schema updated successfully
- Prisma client regenerated with new types
- All API routes use correct field names
- Privacy guaranteed (NightMessage separate from DiscussionMessage)

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (straightforward migration)

---

### Zone 4: API Layer Dependencies (LOW RISK)

**Builders involved:** Builder-4, Builder-5, Sub-Builder-6A, Sub-Builder-6C

**Conflict type:** Shared dependencies (API consumers depend on Builder-4)

**Risk level:** LOW

**Description:**
Builders 5 and 6 depend on Builder-4's API endpoints. Need to verify endpoints work and response types match expectations.

**Files affected:**
- `app/app/api/game/create/route.ts` - Created by Builder-4
- `app/app/api/game/[gameId]/start/route.ts` - Created by Builder-4
- `app/app/api/game/[gameId]/state/route.ts` - Created by Builder-4
- `app/app/api/game/[gameId]/messages/route.ts` - Created by Builder-4
- `app/app/api/game/[gameId]/votes/route.ts` - Created by Builder-4
- `app/app/api/game/[gameId]/results/route.ts` - Created by Builder-4
- `app/app/page.tsx` - Lobby (Builder-5) calls `/api/game/create` and `/start`
- `app/app/game/[gameId]/results/page.tsx` - Results (Builder-5) calls `/api/game/[gameId]/results`
- `app/app/game/[gameId]/page.tsx` - Live game (Sub-6C) calls `/api/game/[gameId]/state`

**Integration strategy:**
1. Verify all API route files compile (resolve TypeScript import errors)
2. Test each endpoint independently using test-api.sh
3. Verify response types match Builder-4's exported types
4. Test Builder-5's Lobby page creates and starts game
5. Test Sub-6C's live game page fetches state
6. Test Builder-5's Results page fetches final results
7. Verify error responses match expected format (400, 403, 404, 500)

**Expected outcome:**
- All 6 API endpoints functional
- Lobby creates games successfully
- Live game page fetches state successfully
- Results page shows final game data
- Error handling graceful

**Assigned to:** Integrator-2 (parallel with Zone 5)

**Estimated complexity:** LOW (API testing)

---

### Zone 5: UI Component Integration (LOW RISK)

**Builders involved:** Sub-Builder-6A, Sub-Builder-6B, Sub-Builder-6C

**Conflict type:** Component integration (Sub-6C integrates Sub-6A and Sub-6B work)

**Risk level:** LOW

**Description:**
Sub-Builder-6C already integrated DiscussionFeed and VoteTally into the live game page. Need to verify integration is complete and all components render correctly.

**Files affected:**
- `app/app/game/[gameId]/page.tsx` - Live game page (Sub-6C integrated Sub-6A and Sub-6B)
- `app/components/PhaseIndicator.tsx` - Enhanced by Sub-6A
- `app/components/PlayerGrid.tsx` - Enhanced by Sub-6A
- `app/components/DiscussionFeed.tsx` - Enhanced by Sub-6B
- `app/components/VoteTally.tsx` - Created by Sub-6B
- `app/components/ConnectionStatus.tsx` - Created by Sub-6C
- `app/app/game/[gameId]/error.tsx` - Error boundary created by Sub-6C

**Integration strategy:**
1. Verify live game page imports all components correctly
2. Check playerNames prop passed to DiscussionFeed
3. Check alivePlayers.length passed to VoteTally
4. Verify VoteTally conditionally renders during VOTING phase
5. Test ConnectionStatus displays SSE connection state
6. Test error boundary catches component errors
7. Verify single SSE connection shared via GameEventsContext
8. Test responsive layout at 375px, 768px, 1024px widths

**Expected outcome:**
- All UI components integrated into live game page
- PhaseIndicator shows current phase with countdown
- PlayerGrid shows all players with real-time elimination updates
- DiscussionFeed shows messages with accusation highlighting
- VoteTally appears during VOTING phase with real-time vote aggregation
- ConnectionStatus shows connection health
- Error boundary catches errors gracefully
- Single SSE connection confirmed in DevTools

**Assigned to:** Integrator-2 (parallel with Zone 4)

**Estimated complexity:** LOW (already integrated by Sub-6C, just verify)

---

### Zone 6: Game Loop Integration (HIGH RISK)

**Builders involved:** Builder-1, Builder-2, Builder-3, Builder-4

**Conflict type:** Full stack integration (backend game loop → API → SSE events)

**Risk level:** HIGH

**Description:**
The complete game loop must execute end-to-end: NIGHT → DAY_ANNOUNCEMENT → DISCUSSION → VOTING → WIN_CHECK. This depends on all backend builders working together and API layer exposing game state correctly.

**Files affected:**
- `app/src/lib/game/master-orchestrator.ts` - Main game loop (Zone 1 output)
- `app/src/lib/game/night-phase.ts` - Builder-2
- `app/src/lib/game/day-announcement.ts` - Builder-2
- `app/src/lib/game/voting-phase.ts` - Builder-3
- `app/src/lib/game/win-conditions.ts` - Builder-3
- `app/src/lib/discussion/orchestrator.ts` - Iteration 1 (reused)
- `app/app/api/game/[gameId]/start/route.ts` - Builder-4 (triggers game loop)
- `app/app/api/game/[gameId]/stream/route.ts` - SSE endpoint (Iteration 1)

**Integration strategy:**
1. Merge Zone 1 output (master-orchestrator.ts with all real phases)
2. Run CLI test harness: `npx tsx src/cli/test-full-game.ts`
3. Verify all 5 phases execute sequentially
4. Check database state updates after each phase
5. Verify SSE events emitted for all phase transitions
6. Test nightkill victim selection (consensus algorithm)
7. Test voting elimination (sequential voting + tallying)
8. Test win condition detection (after nightkill and after voting)
9. Verify game ends when win condition met
10. Check cost tracking works across all phases
11. Monitor for errors or timeouts in phase execution

**Expected outcome:**
- Full game loop runs from NIGHT to GAME_OVER
- All phases complete without errors
- Database state consistent throughout
- SSE events stream correctly
- Win conditions detected accurately
- Costs tracked per phase
- Game ends with winner announced

**Assigned to:** Integrator-1 (after Zone 1 complete)

**Estimated complexity:** HIGH (end-to-end integration)

---

## Independent Features (Direct Merge)

These builder outputs have no conflicts and can be merged directly:

- **Builder-4:** API validation schemas (`app/src/lib/api/validation.ts`)
- **Builder-5:** UI primitives (`app/components/ui/Card.tsx`, `Button.tsx`, `Badge.tsx`, `GameOverBanner.tsx`)
- **Builder-2:** Prompt files (`app/src/lib/prompts/night-prompts.ts`)
- **Builder-3:** Prompt files (`app/src/lib/prompts/voting-prompts.ts`)
- **Sub-Builder-6A:** Event type re-export bridge (`app/lib/events/types.ts`)

**Assigned to:** Integrator-1 (quick merge alongside Zone work)

---

## Parallel Execution Groups

### Group 1 (Parallel)
- **Integrator-1:** Zone 1 (Master Orchestrator merge), Zone 2 (Type verification), Zone 3 (Database migration), Independent features
- **Integrator-2:** Zone 4 (API testing), Zone 5 (UI component verification)

### Group 2 (Sequential - runs after Group 1)
- **Integrator-1:** Zone 6 (Full game loop integration - depends on Zone 1 completion)

---

## Integration Order

**Recommended sequence:**

1. **Parallel execution of Group 1** (Estimated: 60-90 minutes)
   - Integrator-1 handles:
     - Zone 1: Master orchestrator 3-way merge (30 min)
     - Zone 3: Database migration (10 min)
     - Zone 2: Type verification (10 min)
     - Independent features: Direct file copies (10 min)
   - Integrator-2 handles:
     - Zone 4: API endpoint testing (20 min)
     - Zone 5: UI component verification (20 min)
   - **Checkpoint:** Both integrators complete, codebase compiles with no TypeScript errors

2. **Sequential execution of Group 2** (Estimated: 40-60 minutes)
   - Integrator-1 handles:
     - Zone 6: Full game loop testing (40-60 min)
   - **Checkpoint:** Full game runs from start to GAME_OVER, all phases work

3. **Final consistency check** (Estimated: 20 minutes)
   - All integrators verify no regressions
   - Run full test suite
   - Check UI renders correctly with real game data
   - Verify SSE connection stable
   - Document any issues found

**Total estimated time:** 2-3 hours

---

## Shared Resources Strategy

### Shared Types
**Issue:** Event types defined by Builder-1, used by Builders 2, 3, 4, 6

**Resolution:**
- Keep `app/src/lib/events/types.ts` as canonical source
- Sub-6A's re-export bridge (`app/lib/events/types.ts`) enables frontend imports
- All builders import from correct location
- No duplicate type definitions

**Responsible:** Integrator-1 in Zone 2

### Shared Utilities
**Issue:** Phase execution utilities reused across Night, Discussion, Voting phases

**Resolution:**
- `app/src/lib/discussion/turn-scheduler.ts` remains shared utility (Iteration 1)
- Night phase (Builder-2) imports turn scheduler functions
- Voting phase (Builder-3) does not reuse turn scheduler (sequential voting pattern)
- No duplicates, all imports resolve

**Responsible:** Integrator-1 (verify during Zone 1)

### Configuration Files
**Issue:** Prisma schema extended by Builder-1

**Resolution:**
- Single schema.prisma file (Builder-1's extension)
- Migration applied once
- All code uses regenerated Prisma client
- No conflicting migrations

**Responsible:** Integrator-1 in Zone 3

---

## Expected Challenges

### Challenge 1: Master Orchestrator 3-Way Merge
**Impact:** If merge is done incorrectly, game loop will fail with import errors or undefined function calls

**Mitigation:**
- Use Builder-2's report as reference for Night/Day changes
- Use Builder-3's report as reference for Voting/Win changes
- Verify all imports resolve after merge
- Run TypeScript compiler after merge
- Test each phase individually before full game loop

**Responsible:** Integrator-1

### Challenge 2: TypeScript Path Alias Errors
**Impact:** Builder-4 reports TypeScript import errors in API routes, may block compilation

**Mitigation:**
- These are expected in Next.js (runtime resolution works)
- Verify tsconfig.json has correct path mappings
- Test API endpoints via HTTP requests (not TypeScript compilation)
- If blocking, add proper type declarations

**Responsible:** Integrator-2

### Challenge 3: SSE Connection Stability
**Impact:** If SSE disconnects frequently, UI will miss events and show stale state

**Mitigation:**
- Sub-6C implemented ConnectionStatus indicator
- GameEventsContext has reconnection logic
- Test with Chrome DevTools Network tab
- Monitor for memory leaks in long-running games
- Add polling fallback if SSE unreliable

**Responsible:** Integrator-2

### Challenge 4: Consensus Algorithm Accuracy
**Impact:** Night phase victim selection may not reflect Mafia coordination correctly

**Mitigation:**
- Builder-2's simple majority algorithm is MVP approach
- Test with known Mafia messages mentioning specific Villagers
- Verify random fallback works when no consensus
- Log consensus detection for debugging
- Future enhancement: LLM-based intent extraction

**Responsible:** Integrator-1 during Zone 6 testing

### Challenge 5: Win Condition Edge Cases
**Impact:** Game may not end when it should, or end prematurely

**Mitigation:**
- Builder-3 implemented simple counting logic (tested in Builder-1)
- Test both win conditions: All Mafia eliminated, Mafia >= Villagers
- Verify check runs after both nightkill and daykill
- Log win condition checks for debugging
- Add MAX_ROUNDS failsafe (Builder-1 has 10 rounds max)

**Responsible:** Integrator-1 during Zone 6 testing

---

## Success Criteria for This Integration Round

- [ ] Zone 1: Master orchestrator merged with all real phase implementations
- [ ] Zone 2: All type definitions unified, no duplicates
- [ ] Zone 3: Database migration applied, Prisma client regenerated
- [ ] Zone 4: All 6 API endpoints functional and tested
- [ ] Zone 5: All UI components integrated and rendering
- [ ] Zone 6: Full game loop executes from NIGHT to GAME_OVER
- [ ] TypeScript compiles with 0 errors (excluding Builder-4's runtime-only errors)
- [ ] SSE connection stable (single EventSource per game)
- [ ] No console errors during game execution
- [ ] All builder functionality preserved (no regressions)
- [ ] Manual test scenarios pass (Sub-6C's test guide)

---

## Notes for Integrators

**Important context:**
- Builder-2 and Builder-3 already integrated their work into master-orchestrator.ts
- This means you have 3 versions of master-orchestrator.ts to reconcile
- Builder-1's version is the "base" with mocks
- Builder-2's version replaces Night and Day mocks
- Builder-3's version replaces Voting and Win mocks
- **Strategy:** Take Builder-3's version (most recent), verify it has Builder-2's changes, compare to Builder-1 to ensure no missing pieces

**Watch out for:**
- Event type names must be lowercase with underscores (e.g., `vote_cast`, not `voteCast`)
- NightMessage table is separate from DiscussionMessage (privacy guarantee)
- VoteTally only renders during VOTING phase (conditional in Sub-6C)
- PhaseIndicator uses approximate phase start time (should enhance later)
- Voting phase uses sequential voting (each agent sees prior votes)

**Patterns to maintain:**
- Reference `patterns.md` for all conventions
- Error handling: Try-catch at top level, log with context
- Event emission: Immediately after database updates
- Privacy: Never expose NightMessage to Villagers
- Type safety: All functions have explicit return types

---

## Next Steps

1. **Spawn integrators according to parallel groups:**
   - Integrator-1: Backend integration (Zones 1, 2, 3, 6)
   - Integrator-2: API and UI integration (Zones 4, 5)

2. **Integrator-1 execution:**
   - Merge master-orchestrator.ts (Zone 1)
   - Apply database migration (Zone 3)
   - Verify types unified (Zone 2)
   - Copy independent features
   - Test full game loop (Zone 6)

3. **Integrator-2 execution:**
   - Test all API endpoints (Zone 4)
   - Verify UI components integrated (Zone 5)
   - Test end-to-end with real game data

4. **Final validation:**
   - Both integrators complete
   - Run full manual test suite (Sub-6C's guide)
   - Document results
   - Proceed to ivalidator

---

**Integration Planner:** 2l-iplanner
**Plan created:** 2025-10-13T00:00:00Z
**Round:** 1

---

## File Dependency Graph

```
Master Orchestrator (Builder-1)
  ├─> Night Phase (Builder-2)
  │   ├─> night-prompts.ts
  │   ├─> turn-scheduler (Iteration 1)
  │   └─> NightMessage table
  │
  ├─> Day Announcement (Builder-2)
  │   ├─> night-prompts.ts
  │   └─> DiscussionMessage table
  │
  ├─> Discussion (Iteration 1)
  │   ├─> turn-scheduler
  │   └─> DiscussionMessage table
  │
  ├─> Voting Phase (Builder-3)
  │   ├─> voting-prompts.ts
  │   └─> Vote table
  │
  └─> Win Conditions (Builder-3)
      └─> Player table

API Layer (Builder-4)
  ├─> Master Orchestrator (triggers via /start)
  ├─> Database (all tables)
  └─> validation schemas

Lobby UI (Builder-5)
  └─> API /create, /start

Live Game UI (Sub-6A, 6B, 6C)
  ├─> API /state, /stream
  ├─> GameEventsContext
  ├─> PhaseIndicator (Sub-6A)
  ├─> PlayerGrid (Sub-6A)
  ├─> DiscussionFeed (Sub-6B)
  ├─> VoteTally (Sub-6B)
  └─> ConnectionStatus (Sub-6C)

Results UI (Builder-5)
  └─> API /results
```

---

## Risk Assessment Summary

| Zone | Risk Level | Reason | Mitigation |
|------|-----------|--------|------------|
| Zone 1 | HIGH | 3-way file merge | Use Builder-3's version as base, verify all changes |
| Zone 2 | MEDIUM | Type definitions across 5 files | Verification task, no actual conflicts |
| Zone 3 | MEDIUM | Database migration | Standard migration, low risk but critical |
| Zone 4 | LOW | API testing | Independent endpoints, parallel testing |
| Zone 5 | LOW | Already integrated by Sub-6C | Just verify |
| Zone 6 | HIGH | End-to-end integration | Depends on Zone 1, full testing required |

**Overall risk:** MEDIUM-HIGH due to Zone 1 and Zone 6 complexity, but mitigated by excellent builder coordination.

---

## Testing Strategy

### Unit Tests
- Builder-1: CLI test harness for win conditions (already exists)
- Builder-2: Night consensus algorithm (manual testing via CLI)
- Builder-3: Vote parsing and tallying (manual testing via CLI)
- Sub-6B: Unit tests created but not runnable (no test framework)

### Integration Tests
- Zone 1: TypeScript compilation after merge
- Zone 3: Database migration verification
- Zone 4: API endpoint testing via test-api.sh
- Zone 6: Full game loop via CLI test harness

### Manual Tests
- Sub-6C: Comprehensive 34-test manual test guide
- Test all UI components with real game data
- Test responsive layout at multiple widths
- Test SSE connection stability

### End-to-End Test
- Create game via Lobby
- Start game via Lobby
- Watch live game page through all phases
- Verify game ends correctly
- View results page

---

## Deliverables

After integration complete:
- Merged codebase with all builder contributions
- Database schema updated with migration applied
- All API endpoints functional
- All UI pages rendering
- Full game loop working end-to-end
- Integration report documenting results
- List of any issues found
- Recommendations for ivalidator

**Expected completion:** 2-3 hours from integration start
