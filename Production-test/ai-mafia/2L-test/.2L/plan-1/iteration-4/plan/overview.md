# 2L Iteration 4 Plan - AI Mafia Production Healing

## Project Vision

Make the AI Mafia game **actually work in production** by fixing critical bugs discovered during exploration and establishing production-grade infrastructure. This is a HEALING iteration focused on stability, correctness, and confidence.

## Success Criteria

Specific, measurable criteria for iteration completion:

- [ ] **Critical Bug Fixed**: Discussion phase generates 40+ messages (function signature mismatch resolved)
- [ ] **Database Consistency**: Supabase Local running with PostgreSQL matching production
- [ ] **Type Safety**: Zero TypeScript errors with strict mode enabled
- [ ] **Test Coverage**: >60% overall, >80% on critical paths (Claude client, cost tracker)
- [ ] **Clean Logging**: Zero console.log statements in production code
- [ ] **Production Validation**: 3 consecutive full games complete without crashes
- [ ] **Cost Control**: Games cost <$2 with >48% cache hit rate
- [ ] **Documentation**: Debugging guide, architecture decision records, setup instructions

## MVP Scope

**In Scope:**
- Fix function signature mismatch (Critical - 0 messages bug)
- Migrate to Supabase Local for PostgreSQL dev environment
- Fix all 28 TypeScript errors and enable strict mode
- Install Vitest and create critical path tests
- Replace 12 console.log statements with structured logging
- Document architecture decisions and debugging procedures
- Validate with real API key in production environment

**Out of Scope (Post-MVP):**
- New game features (human players, special roles)
- UI redesign or mobile responsive
- Agent SDK migration (current system works well)
- Performance optimization beyond current state
- Advanced monitoring (Sentry, Datadog)
- E2E browser tests with Playwright

## Development Phases

1. **Exploration** - COMPLETE
2. **Planning** - Current
3. **Building** - 12-16 hours (4 builders, some parallel)
4. **Integration** - 2-3 hours
5. **Validation** - 2 hours (real API testing)
6. **Deployment** - 1 hour (Railway + production validation)

## Timeline Estimate

- Exploration: COMPLETE (3 hours)
- Planning: COMPLETE (1 hour)
- Building: 12-16 hours (parallel execution)
  - Builder-1: Critical Bug Fix (1-2 hours)
  - Builder-2: Database Migration (3-4 hours)
  - Builder-3: TypeScript & Logging (3-4 hours)
  - Builder-4: Test Infrastructure (5-6 hours)
- Integration: 2-3 hours
- Validation: 2 hours
- **Total: ~20-25 hours**

## Risk Assessment

### High Risks

**Risk: Database Migration Complexity**
- **Likelihood**: Medium
- **Impact**: High (blocks all development if failed)
- **Mitigation**: Keep SQLite backup, test migration incrementally, rollback script ready
- **Fallback**: Start fresh PostgreSQL (lose test data but acceptable)

**Risk: Test Framework Integration Issues**
- **Likelihood**: Low
- **Impact**: Medium (delays test coverage)
- **Mitigation**: Vitest has official Next.js support, existing tests use Vitest syntax
- **Fallback**: Use Jest if Vitest fails (requires test rewrites +2 hours)

### Medium Risks

**Risk: TypeScript Errors Cascade**
- **Likelihood**: Medium
- **Impact**: Medium (some errors may require refactoring)
- **Mitigation**: Fix incrementally, prioritize functional code over cosmetic
- **Fallback**: Keep `ignoreBuildErrors` for truly intractable issues (document why)

**Risk: Real API Testing Costs**
- **Likelihood**: Low
- **Impact**: Low (budget risk)
- **Mitigation**: Budget $2-5 for validation testing, cost tracker active
- **Fallback**: Use fewer test games if needed

### Low Risks

**Risk: Critical Bug Fix Breaks Other Code**
- **Likelihood**: Low (fix is simple - use existing wrapper function)
- **Impact**: Low (easily testable)
- **Mitigation**: Test immediately after fix, verify with database queries

## Integration Strategy

### Phase 1: Critical Fixes (Sequential)
1. **Builder-1** fixes signature mismatch FIRST (blocks validation)
2. **Builder-2** migrates database (parallel to Builder-1 if desired)
3. Integration checkpoint: Verify game generates messages with PostgreSQL

### Phase 2: Quality Improvements (Parallel)
1. **Builder-3** fixes TypeScript + logging (independent)
2. **Builder-4** sets up tests and writes unit tests (independent)
3. Integration checkpoint: All tests pass, no TypeScript errors

### Phase 3: Final Integration & Validation
1. Merge all builder outputs
2. Run full test suite
3. Test 3 complete games with real API key
4. Document any discovered issues
5. Deploy to Railway for production validation

### Conflict Prevention
- **Shared files**:
  - `route.ts` (Builder-1 only)
  - `master-orchestrator.ts` (Builder-3 only)
  - `prisma/schema.prisma` (Builder-2 only)
- **New files**: All builders create new files, no conflicts
- **Dependencies**: Builder-4 should test Builder-1's fix once merged

## Deployment Plan

### Railway Deployment
1. **Database**: Already using Railway PostgreSQL
2. **Environment**: Update env vars if needed
3. **Validation**: Run 3 full games in production
4. **Monitoring**: Check logs for errors, verify cost tracking
5. **Success**: All games complete, cost <$5, no crashes

### Rollback Plan
If critical issues discovered:
1. Revert to Iteration 3 codebase
2. Cherry-pick only Builder-1 fix (signature mismatch)
3. Test with minimal changes
4. Defer Builder-2/3/4 to Iteration 5

## Key Technical Decisions

### 1. NO Agent SDK Migration
**Decision**: Keep custom orchestration, do not migrate to Agent SDK

**Rationale**:
- Current system generates 40+ messages successfully (verified with transcript)
- Anthropic Agent SDK (v0.1.14) is too new, beta status, wrong use case (code generation not game simulation)
- LangGraph is overkill for round-robin turn-taking
- Migration would cost 30-60 hours with no functional benefit
- Custom solution is optimized for our use case (caching, cost tracking, fallbacks)

**Reference**: See `docs/architecture-decision-records/ADR-001-multi-agent-orchestration.md`

### 2. Use Supabase Local for Development
**Decision**: Replace SQLite with PostgreSQL via Supabase Local

**Rationale**:
- Production uses PostgreSQL (Railway)
- Schema drift causing issues (PRAGMA statements incompatible)
- Docker and Supabase CLI already installed
- Supabase Studio provides excellent data inspection UI
- Easy future migration to Supabase Cloud if needed

### 3. Use Vitest for Testing
**Decision**: Install Vitest, not Jest or Node Test Runner

**Rationale**:
- Existing tests already written in Vitest syntax
- Zero migration effort (just install and run)
- 10x faster than Jest (ES modules, Vite caching)
- Modern, TypeScript-first, great DX
- Official Next.js support

### 4. Fix Critical Bug FIRST
**Decision**: Builder-1 focuses solely on signature mismatch fix

**Rationale**:
- Blocks all validation (0 messages generated)
- Simple fix (5 minutes of code, 1 hour with testing)
- High ROI (unlocks entire discussion phase)
- Other builders can proceed in parallel

## Builder Coordination

### Dependencies Graph
```
Builder-1 (Critical Fix) -----> Integration Checkpoint 1
                                        |
Builder-2 (Database)    -------------->|
                                        |
                                        v
                                Validation Phase
                                        ^
                                        |
Builder-3 (TypeScript)  -------------->|
                                        |
Builder-4 (Tests)       -------------->|
```

### Communication Protocol
- **Builder-1**: Notify when fix merged (unblocks validation)
- **Builder-2**: Notify when PostgreSQL ready (update .env for others)
- **Builder-3**: Notify when TypeScript fixed (may affect type imports)
- **Builder-4**: Coordinate with Builder-1 on testing signature fix

## Validation Approach

### Stage 1: Unit Testing
- Builder-4 creates unit tests with mocked API
- Verify: Claude client, cost tracker, context builder
- Target: >80% coverage on critical functions
- Duration: Included in build phase

### Stage 2: Integration Testing
- Test full game with mocked Claude API
- Verify: All phases execute, messages generated, votes collected
- Target: Game completes start to finish
- Duration: Included in build phase

### Stage 3: Real API Testing (First Complete Game!)
- Create game with 10 AI players
- Start game and observe all phases
- Measure: Cost, cache hit rate, duration, message quality
- Target: Cost <$2, cache >48%, 40+ messages, game completes
- Duration: 15 minutes per game x 3 games = 45 minutes

### Stage 4: Production Deployment
- Deploy to Railway with PostgreSQL
- Update environment variables
- Run 3 full games in production
- Monitor logs for errors
- Validate cost tracking accuracy
- Duration: 1 hour

## Open Questions & Decisions Made

### Q1: Should we migrate SQLite data or start fresh?
**Decision**: Migrate data (8 games of test data valuable for validation)
**Rationale**: Data export/import adds 1.5 hours but preserves test conversations for validation

### Q2: Split Builder-4 into two subtasks?
**Decision**: Keep as single builder with sequential steps (setup → unit tests → integration tests)
**Rationale**: Total effort (5-6 hours) manageable for single builder, splitting adds coordination overhead

### Q3: Should Builder-2 create rollback script?
**Decision**: Yes, create `scripts/rollback-to-sqlite.sh`
**Rationale**: 30 minutes well spent for safety net if PostgreSQL migration fails

### Q4: Priority of existing console test migration?
**Decision**: Low priority - keep as-is for now
**Rationale**: Console tests (`threading.test.ts`, `turn-scheduler.test.ts`) work with tsx, migrate in Iteration 5

### Q5: Cache hit rate target?
**Decision**: Accept 48% as baseline, document expected behavior
**Rationale**: Initial turns have no cache (expected), cost still low ($0.29 vs $5 target), focus on correctness first

## Architecture Insights from Exploration

### What's Working Well
- Multi-agent orchestration (round-robin turn-taking)
- Prompt caching (48% hit rate, 73% potential savings)
- Cost tracking with circuit breaker
- Graceful error handling with fallbacks
- Event-driven architecture for real-time updates
- Structured logging with Pino (in most places)

### What Needs Fixing
1. Function signature mismatch (line 87 in route.ts) - CRITICAL
2. SQLite vs PostgreSQL schema drift
3. 28 TypeScript errors with strict mode disabled
4. Zero test coverage (no validation of fixes)
5. 12 console.log statements (reduces observability)

### What Does NOT Need Fixing
- Agent SDK (current custom solution works excellently)
- API key loading (works correctly)
- Conversation generation (verified 40+ messages)
- Cost calculation (accurate)
- Caching strategy (effective)

## Next Steps After This Iteration

**Iteration 5: Polish & Features**
- E2E browser tests with Playwright
- Performance optimization (if needed)
- Advanced monitoring (Sentry integration)
- Human player mode
- Replay mode
- Social features (leaderboards, sharing)

**Iteration 6: Scale & Deploy**
- Multi-game concurrency
- Load testing
- Production monitoring
- Cost optimization
- Documentation for users

---

**Iteration Status**: PLANNING COMPLETE
**Confidence Level**: HIGH (explorers verified issues and solutions)
**Ready to Build**: YES
