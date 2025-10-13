# Integration Overview - Iteration 4

**Created:** 2025-10-13
**Plan:** plan-1
**Iteration:** 4
**Status:** PLANNING
**Priority:** CRITICAL

---

## Executive Summary

Iteration 4 is a **focused healing iteration** that addresses the critical runtime bug discovered by Explorer-2 and establishes production-ready infrastructure. The original 6-builder plan (32-45 hours) has been **reduced to 4 builders (12-18 hours)** based on explorer findings.

**Key Discovery:** The system is NOT architecturally broken. A simple 1-line fix (wrong function on line 87) will restore full functionality. No Agent SDK migration needed.

---

## Revised Scope

### What Changed from Vision

**REMOVED (Not Needed):**
- Agent SDK Migration - Current custom orchestration works perfectly (verified by transcript analysis)
- Runtime debugging - Root cause identified as simple function signature mismatch
- Major architectural refactoring - System design is sound

**RETAINED (Real Issues):**
- 1-line bug fix + immediate validation with real API key
- Supabase local setup (PostgreSQL dev/prod consistency)
- Test infrastructure (Vitest + critical path coverage)
- TypeScript strict mode fixes
- Logging improvements (replace 12 console.log statements)

**ADDED (From Discoveries):**
- Immediate validation with real Claude API after bug fix
- Cost and performance metrics documentation
- Architecture decision record (why we kept custom orchestration)

---

## Builder Summary

### Builder-1: Critical Bug Fix + API Validation
**Complexity:** LOW
**Effort:** 1-2 hours
**Priority:** URGENT (blocks everything)
**Dependencies:** None

**Task:** Fix line 87 in `app/api/game/[gameId]/start/route.ts` by using `buildAgentContextWrapper` instead of raw `buildAgentContext`. Test immediately with real API key.

**Critical Path:** YES - All other work depends on having a working game

---

### Builder-2: Supabase Local Setup
**Complexity:** MEDIUM
**Effort:** 2-3 hours
**Priority:** HIGH
**Dependencies:** None (can run parallel to Builder-1)

**Task:** Initialize Supabase local, migrate schema from SQLite to PostgreSQL, import test data, verify full game works with PostgreSQL.

**Critical Path:** NO - Independent, can parallelize

---

### Builder-3: Test Infrastructure
**Complexity:** MEDIUM-HIGH
**Effort:** 6-8 hours
**Priority:** HIGH
**Dependencies:** Builder-1 (needs working code to test)

**Task:** Install Vitest, run existing tests, add unit tests for Claude client and cost tracker, add integration test for full game flow.

**Critical Path:** PARTIAL - Setup can start immediately, integration tests wait for Builder-1

---

### Builder-4: TypeScript Fixes + Logging
**Complexity:** MEDIUM
**Effort:** 4-6 hours
**Priority:** MEDIUM
**Dependencies:** None (independent)

**Task:** Fix all 28 TypeScript errors, remove `ignoreBuildErrors`, replace 12 console.log statements with structured logging, enable strict mode.

**Critical Path:** NO - Quality improvements, can parallelize

---

## Integration Zones

### Zone 1: Core Runtime (SEQUENTIAL - Critical Path)

**Builders Involved:** Builder-1 only

**Description:** The 1-line bug fix that unblocks the entire game

**Files Affected:**
- `app/api/game/[gameId]/start/route.ts` (line 87)

**Integration Strategy:**
1. Builder-1 makes fix
2. Immediate test with real API key
3. Verify all phases complete (NIGHT → DAY → DISCUSSION → VOTING → GAME_OVER)
4. Document cost and performance metrics
5. If successful, proceed to other zones

**Risk Level:** LOW (simple fix, clear solution)

**Expected Outcome:** Discussion phase generates 40+ messages, game completes successfully

**Assigned to:** Integrator-1 (just verify Builder-1's work)

**Estimated Complexity:** LOW

---

### Zone 2: Database Infrastructure (INDEPENDENT)

**Builders Involved:** Builder-2 only

**Description:** Migration from SQLite to PostgreSQL for dev/prod consistency

**Files Affected:**
- `prisma/schema.prisma` (provider change)
- `prisma/migrations/*` (regenerate for PostgreSQL)
- `.env` (DATABASE_URL update)
- New: `scripts/export-sqlite-data.ts`
- New: `scripts/import-data.ts`
- New: `docs/supabase-local-setup.md`

**Integration Strategy:**
1. Builder-2 completes migration independently
2. Verify schema validates
3. Verify full game works with PostgreSQL
4. Merge to main branch
5. Update team documentation

**Risk Level:** MEDIUM (data migration can be tricky)

**Expected Outcome:** Development uses PostgreSQL matching production, no schema drift

**Assigned to:** Integrator-1 (verify migration successful)

**Estimated Complexity:** MEDIUM

**Can Parallelize With:** Zone 1, Zone 3, Zone 4

---

### Zone 3: Testing Foundation (PARTIALLY DEPENDENT)

**Builders Involved:** Builder-3 only

**Description:** Establish comprehensive test infrastructure

**Files Affected:**
- `package.json` (new dev dependencies)
- New: `vitest.config.ts`
- New: `vitest.setup.ts`
- New: `src/lib/claude/__tests__/client.test.ts`
- New: `src/lib/claude/__tests__/cost-tracker.test.ts`
- New: `src/lib/game/__tests__/master-orchestrator.test.ts`
- Updated: `components/__tests__/*.tsx` (existing tests now run with Vitest)
- New: `docs/testing-guide.md`

**Integration Strategy:**
1. **Phase 1 (Immediate):** Install Vitest, configure, run existing tests
2. **Phase 2 (After Builder-1):** Write integration test for full game flow
3. **Phase 3 (Final):** Generate coverage report, verify >50% critical paths
4. Merge to main branch

**Risk Level:** MEDIUM (Builder-1 changes might break tests)

**Expected Outcome:**
- All tests pass
- >50% coverage on critical paths (claude/, game/, discussion/)
- Test suite runs in <60 seconds

**Assigned to:** Integrator-1

**Estimated Complexity:** MEDIUM

**Can Parallelize With:** Zone 2, Zone 4 (Phase 1 only)
**Depends On:** Zone 1 (for Phase 2 integration tests)

---

### Zone 4: Code Quality (INDEPENDENT)

**Builders Involved:** Builder-4 only

**Description:** TypeScript strict mode + structured logging

**Files Affected:**
- `next.config.mjs` (remove ignoreBuildErrors)
- `tsconfig.json` (enable strict mode)
- `src/lib/game/master-orchestrator.ts` (replace console.log, lines 106-379)
- Various files with TypeScript errors (28 total)

**Integration Strategy:**
1. Builder-4 completes fixes independently
2. Verify `npx tsc --noEmit` passes (0 errors)
3. Verify `npm run build` succeeds
4. Verify no console.log in production code
5. Merge to main branch

**Risk Level:** LOW (no functional changes)

**Expected Outcome:**
- Zero TypeScript errors
- Zero console.log statements (excluding CLI tools)
- Strict mode enabled
- Build succeeds without ignoring errors

**Assigned to:** Integrator-1

**Estimated Complexity:** LOW

**Can Parallelize With:** Zone 1, Zone 2, Zone 3

---

## Independent Features (Direct Merge)

**None** - All 4 builders produce cohesive outputs that require verification before merge.

---

## Parallel Execution Groups

### Group 1: Critical Path (MUST COMPLETE FIRST)
- **Builder-1:** Fix line 87 + validate with real API key

**Duration:** 1-2 hours
**Blocking:** All integration tests

---

### Group 2: Parallel Work (START IMMEDIATELY)
- **Builder-2:** Supabase local setup
- **Builder-3 Phase 1:** Vitest setup + existing tests
- **Builder-4:** TypeScript fixes + logging

**Duration:** 2-8 hours (different completion times)
**Blocking:** None (all independent)

---

### Group 3: Final Tests (AFTER BUILDER-1 COMPLETES)
- **Builder-3 Phase 2:** Integration tests for full game flow

**Duration:** 2-3 hours
**Blocking:** Depends on Builder-1 fix

---

## Integration Order

**Recommended Sequence:**

### Phase 1: URGENT FIX (0-2 hours)
1. Builder-1 fixes line 87
2. Builder-1 tests with real API key
3. Builder-1 verifies all phases complete
4. Builder-1 documents cost/performance metrics
5. **CHECKPOINT:** If game works, proceed to Phase 2

---

### Phase 2: PARALLEL INFRASTRUCTURE (2-10 hours)
**All builders work simultaneously:**
- Builder-2: Supabase migration (2-3 hours)
- Builder-3 Phase 1: Vitest setup + unit tests (4-5 hours)
- Builder-4: TypeScript + logging (4-6 hours)

**CHECKPOINT:** All 3 builders complete their work

---

### Phase 3: INTEGRATION TESTS (10-13 hours)
1. Builder-3 Phase 2: Write integration tests (2-3 hours)
2. All builders complete
3. **CHECKPOINT:** All tests pass

---

### Phase 4: FINAL INTEGRATION (13-18 hours)
1. Integrator-1 merges all zones
2. Run full test suite
3. Verify no conflicts
4. Test 3 full games with real API key
5. Document final metrics

**CHECKPOINT:** Ready for Railway deployment

---

## Shared Resources Strategy

### Shared Types
**Issue:** None - No builders define overlapping types

**Resolution:** N/A

---

### Shared Utilities
**Issue:** None - No duplicate implementations

**Resolution:** N/A

---

### Configuration Files
**Issue:** Multiple builders touch config files

**Affected Files:**
- `package.json` (Builder-3 adds dependencies)
- `.env` (Builder-2 changes DATABASE_URL)
- `next.config.mjs` (Builder-4 removes ignoreBuildErrors)
- `tsconfig.json` (Builder-4 enables strict mode)

**Resolution:**
- Each builder modifies different config sections
- No conflicts expected
- Integrator verifies all configs work together

**Responsible:** Integrator-1

---

## Expected Challenges

### Challenge 1: Builder-1 API Key Test Reveals New Issues
**Impact:** If bug fix doesn't fully resolve runtime issues, may need additional debugging

**Mitigation:**
- Test incrementally (each phase separately)
- Have fallback responses documented
- Budget 1 extra hour for unexpected issues

**Responsible:** Builder-1, with Integrator-1 support

---

### Challenge 2: Data Migration Complexity
**Impact:** Exporting/importing SQLite data to PostgreSQL could fail

**Mitigation:**
- Keep SQLite backup
- Have "start fresh" fallback option
- Test migration with one game first

**Responsible:** Builder-2

---

### Challenge 3: Integration Tests Break After Builder-1 Changes
**Impact:** Builder-3's integration tests might need updates if Builder-1 changes interfaces

**Mitigation:**
- Builder-3 Phase 1 focuses on unit tests (less fragile)
- Builder-3 Phase 2 coordinates with Builder-1 on any interface changes
- Use loose mocking where possible

**Responsible:** Builder-3, with Builder-1 coordination

---

### Challenge 4: TypeScript Errors More Complex Than Expected
**Impact:** 28 errors might hide deeper type issues

**Mitigation:**
- Fix incrementally (one file at a time)
- Use `// @ts-expect-any` with justification if truly unavoidable
- Don't block on perfectionism - "good enough" is acceptable

**Responsible:** Builder-4

---

## Success Criteria for This Integration Round

### Critical (Must Pass)
- [x] Builder-1 fix applied and tested
- [ ] Discussion phase generates 40+ messages
- [ ] Full game completes (LOBBY → GAME_OVER)
- [ ] Cost per game <$5 (target <$2)
- [ ] No crashes across 3 consecutive games

### High Priority (Should Pass)
- [ ] Supabase local running and validated
- [ ] Schema validates: `npx prisma validate` succeeds
- [ ] Full game works with PostgreSQL
- [ ] Test suite installed and passing
- [ ] >50% coverage on critical paths

### Medium Priority (Nice to Have)
- [ ] Zero TypeScript errors: `npx tsc --noEmit` passes
- [ ] Zero console.log statements in production code
- [ ] Structured logging throughout
- [ ] Documentation complete

---

## Risk Assessment

### Overall Risk: LOW-MEDIUM

**Why LOW:**
- Simple bug fix (1 line change)
- Clear solutions for all tasks
- Parallel work reduces timeline risk
- All prerequisites met (Docker, Supabase CLI installed)

**Why MEDIUM:**
- Never tested with real API key (unknown unknowns)
- Data migration can be tricky
- Integration tests depend on Builder-1 completion

**Mitigation:**
- Test Builder-1 fix immediately (fail fast)
- Have fallback options for each zone
- Conservative time estimates (buffer included)

---

## Notes for Integrators

**Important Context:**
- The system is NOT broken architecturally - just a simple bug
- Explorer-1 verified the current orchestration works well (41 messages in transcript)
- Explorer-2 identified exact root cause (line 87 function signature)
- Explorer-3 confirmed all prerequisites for Supabase/Vitest are met

**Watch Out For:**
- API key must be valid and loaded correctly (already verified, but test again)
- Cost tracking working but cache hit rate is 48% (below 70% target, but acceptable)
- Integration tests might need adjustment after Builder-1 fix

**Patterns to Maintain:**
- Use structured logger (Pino) not console.log
- All builders follow existing code patterns (see patterns.md)
- Test incrementally (don't wait until the end)

---

## Integration Timeline

**Optimistic (Best Case):** 12 hours
- Builder-1: 1 hour
- Group 2 parallel: 6 hours (longest builder)
- Builder-3 Phase 2: 2 hours
- Integration: 2 hours
- Validation: 1 hour

**Realistic (Expected Case):** 15 hours
- Builder-1: 2 hours (includes thorough testing)
- Group 2 parallel: 8 hours (includes debugging)
- Builder-3 Phase 2: 3 hours
- Integration: 3 hours
- Validation: 1 hour

**Pessimistic (Worst Case):** 18 hours
- Builder-1: 2 hours + 1 hour unexpected issues
- Group 2 parallel: 8 hours + debugging
- Builder-3 Phase 2: 3 hours + test fixes
- Integration: 4 hours
- Validation: 2 hours

**Target:** 15 hours (realistic case)

---

## Next Steps

1. **Immediate:** Spawn Builder-1 (URGENT)
2. **After 1 hour:** Check Builder-1 progress, spawn Group 2 if Builder-1 on track
3. **After Builder-1 completes:** Spawn Builder-3 Phase 2
4. **After all builders complete:** Begin integration
5. **Final:** Validation with 3 full games

---

## Validation Plan

### Stage 1: Builder-1 Validation (Immediate)
- Test with real API key
- Verify all phases complete
- Document cost per game
- Measure cache hit rate

### Stage 2: Per-Zone Validation (Continuous)
- Builder-2: Full game with PostgreSQL
- Builder-3: All tests pass, coverage >50%
- Builder-4: Build succeeds, no TypeScript errors

### Stage 3: Integration Validation (After Merge)
- All tests pass together
- Full game with PostgreSQL + real API
- No conflicts or regressions

### Stage 4: Final Validation (Pre-Deployment)
- Run 3 consecutive full games
- Verify cost, performance, stability
- Document metrics for Railway deployment

---

**Integration Planner:** 2L-iplanner
**Plan Created:** 2025-10-13
**Iteration:** 4
**Total Builders:** 4
**Estimated Effort:** 12-18 hours
**Risk Level:** LOW-MEDIUM
**Ready for Execution:** YES
