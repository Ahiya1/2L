# Iteration 4: Healing, Agent SDK Migration & Production Validation

**Created:** 2025-10-13  
**Plan:** plan-1  
**Status:** HEALING  
**Priority:** CRITICAL - Production is broken

---

## Problem Statement

**Current State:** Iterations 1-3 built the infrastructure and UI, but the game is NOT FUNCTIONAL in production:

### Critical Issues Discovered
1. **Runtime Failure:** Discussion phase stuck at 0 messages - AI agents not generating responses
2. **Wrong SDK:** Using basic `@anthropic-ai/sdk` instead of Agent SDK (no multi-agent orchestration)
3. **Database Inconsistency:** SQLite dev vs PostgreSQL prod causes schema mismatches
4. **Type Safety Broken:** 28 TypeScript errors with `ignoreBuildErrors: true` masking problems
5. **Incomplete Logging:** 12 console.log statements remain, hampering debugging
6. **No Tests:** Zero test coverage means we can't validate fixes
7. **Untested with API Key:** Never ran a complete game with real Claude API

**Impact:** The MVP cannot be deployed. It looks good but doesn't work.

---

## Core Objective

**Make the AI Mafia game ACTUALLY WORK in production with proper architecture.**

Transform from "it builds" to "it runs reliably with real AI agents playing complete games."

---

## Target Users

**Primary:** Developers (us) - need a working, debuggable system  
**Secondary:** End users - need a reliable, deployed game

**Success = Confidence:** Deploy to Railway and run 3 consecutive full games without crashes.

---

## Core Deliverables (6 Builders)

### 1. Agent SDK Migration (CRITICAL - Architectural Fix)

**Problem:** Using `@anthropic-ai/sdk` which is designed for single-agent interactions. We're manually managing:
- Conversation history per agent
- Context windows
- State transitions
- Multi-agent coordination

**Solution:** Migrate to proper multi-agent SDK or architecture pattern

**Acceptance Criteria:**
- [ ] Research: Confirm if Anthropic has Agent SDK or use proven pattern (e.g., LangGraph, AutoGen, custom orchestrator)
- [ ] Each agent has persistent identity and memory
- [ ] Conversation history managed automatically
- [ ] Context window optimization built-in
- [ ] 10 agents can play simultaneously without memory issues

**Risk:** This is a major refactor. May need to rewrite `claude/client.ts` and `discussion/orchestrator.ts`.

---

### 2. Runtime Error Healing (CRITICAL - Make It Work)

**Problem:** Discussion phase never generates messages. Screenshot shows:
- "Discussion" phase active
- "Waiting for discussion to start..."
- 0 messages generated
- No errors in console (because logging is incomplete)

**Root Causes to Investigate:**
- Is API key being loaded correctly?
- Is `generateAgentResponse()` being called?
- Are API requests failing silently?
- Is orchestrator stuck in a loop?
- Is turn execution timing out?

**Solution:** 
- Add extensive debug logging to orchestrator
- Test with real API key end-to-end
- Fix all blocking errors

**Acceptance Criteria:**
- [ ] Create game with 10 players
- [ ] Start game triggers NIGHT phase
- [ ] NIGHT phase generates Mafia messages
- [ ] DISCUSSION phase generates 40+ messages
- [ ] VOTING phase collects all votes
- [ ] Game reaches GAME_OVER with winner
- [ ] All phases complete without crashes
- [ ] Cost tracking shows accurate totals
- [ ] Cache hit rate >70%

---

### 3. Supabase Local Setup (Infrastructure Fix)

**Problem:** 
- Dev uses SQLite (`file:./dev.db`)
- Prod uses PostgreSQL (Railway)
- Schema drift between dev/prod causes issues
- Prisma migrations fail validation

**Solution:** Use Supabase local for development
- Consistent PostgreSQL in dev and prod
- Docker-based local PostgreSQL
- Same migrations work everywhere

**Acceptance Criteria:**
- [ ] Install Supabase CLI
- [ ] Initialize Supabase local project
- [ ] Migrate existing SQLite data to local PostgreSQL
- [ ] Update `.env` to use Supabase local URL
- [ ] Schema validates: `npx prisma validate` succeeds
- [ ] Migrations work: `npx prisma migrate dev` succeeds
- [ ] Full game works with local PostgreSQL
- [ ] Documentation: `docs/supabase-local-setup.md`

---

### 4. TypeScript Error Fixes (Quality Fix)

**Problem:** 28 TypeScript errors masked by `ignoreBuildErrors: true`

**Identified Error Types:**
- `any` types without explicit justification
- Component prop type mismatches
- Missing type imports
- Incorrect generic usage

**Solution:** Fix all errors, enable strict type checking

**Acceptance Criteria:**
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] Remove `ignoreBuildErrors: true` from `next.config.mjs`
- [ ] Remove `ignoreBuildErrors: true` from TypeScript config
- [ ] All `any` types have explicit `// @ts-expect-error` with reason OR proper types
- [ ] Build succeeds with strict mode
- [ ] No type-related runtime errors

---

### 5. Test Infrastructure (Validation)

**Problem:** Zero test coverage means:
- Can't validate fixes work
- Can't prevent regressions
- Can't refactor safely

**Solution:** Add critical path tests

**Acceptance Criteria:**
- [ ] Unit tests for `claude/client.ts` (API mocking)
- [ ] Unit tests for `cost-tracker.ts` (circuit breaker)
- [ ] Unit tests for `repetition-tracker.ts` (phrase extraction)
- [ ] Integration test: Create game → Start → Verify phases execute
- [ ] Integration test: Full game with mocked Claude API
- [ ] Test runner: `npm test` passes
- [ ] Coverage: >50% for critical paths
- [ ] CI: Tests run on every commit (optional)

---

### 6. Complete Logging + Debugging Guide (Observability)

**Problem:**
- 12 console.log remain in `master-orchestrator.ts`
- No runtime debugging guide
- Hard to diagnose issues without logs

**Solution:** 
- Replace all remaining console.log
- Create debugging playbook
- Add debug mode with verbose logging

**Acceptance Criteria:**
- [ ] Zero console.log statements: `grep -r "console\." src/ app/` returns 0 (excluding CLI tools)
- [ ] All critical paths use structured logger with context
- [ ] Debug mode: `LOG_LEVEL=debug npm run dev` shows detailed flow
- [ ] Documentation: `docs/debugging-runtime-issues.md`
- [ ] Covers: How to debug stuck phases, API failures, cost issues, memory leaks
- [ ] Example debug session walkthrough

---

## Success Criteria (All Must Pass)

### Runtime Success (CRITICAL)
1. **Complete Game Playthrough**
   - Create game with 10 players
   - Start game
   - All 7 phases complete: NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK → GAME_OVER
   - Winner declared (Mafia or Villagers)
   - No crashes, no infinite loops
   - Duration: <45 minutes

2. **AI Agent Quality**
   - NIGHT: Mafia coordinate (2-3 messages minimum)
   - DISCUSSION: 40+ messages generated (varied, not repetitive)
   - VOTING: All alive players vote
   - Strategic behavior visible (accusations, defenses, alliances)

3. **Cost & Performance**
   - Cost per game: <$5 (target <$2)
   - Cache hit rate: >70%
   - Memory usage: <500MB
   - No memory leaks (test 3 consecutive games)

### Build Success
4. **Zero TypeScript Errors**
   - `npx tsc --noEmit` passes
   - `npm run build` succeeds
   - No `ignoreBuildErrors` config

5. **Test Coverage**
   - `npm test` passes
   - >50% coverage on critical paths
   - Integration tests pass

### Production Readiness
6. **Supabase Local Working**
   - Schema validates
   - Migrations apply cleanly
   - Full game works with local PostgreSQL

7. **Complete Observability**
   - Zero console.log (excluding CLI)
   - Structured logs capture all events
   - Debug mode available

### Deployment Success
8. **Railway Deployment**
   - Deploy to Railway with PostgreSQL
   - Health check returns 200
   - Run 3 consecutive full games without crashes
   - Cost tracking accurate
   - Share URLs work

---

## Out of Scope (Defer to Later)

**Explicitly NOT in Iteration 4:**
- ❌ New features (human players, special roles, replay mode)
- ❌ UI redesign (current UI is sufficient)
- ❌ Performance optimization (unless blocking)
- ❌ Advanced monitoring (Sentry, Datadog)
- ❌ Mobile responsive design
- ❌ Social features (user accounts, leaderboards)

**Rationale:** This is a HEALING iteration. Focus = make existing features work reliably.

---

## Technical Requirements

### Must Fix
- API key loading and usage
- Agent response generation
- Phase orchestration timing
- Database schema consistency
- Type safety throughout

### Must Support
- 10 concurrent AI agents
- PostgreSQL (local + production)
- Claude 4.5 Sonnet API
- Cost tracking with circuit breaker
- Structured logging with Pino

### Constraints
- Cannot break existing Iterations 1-3 work
- Must maintain backward compatibility with current schema
- API key must be configurable (file or env var)

---

## Architecture Decisions

### Agent SDK vs Custom Orchestration

**Option A: Anthropic Agent SDK** (if exists)
- Pros: Built for multi-agent, state management included
- Cons: May not exist yet, learning curve

**Option B: LangGraph Multi-Agent** 
- Pros: Proven, good docs, built for this
- Cons: New dependency, requires refactor

**Option C: Custom Orchestrator (improve existing)**
- Pros: Keep existing code, incremental fix
- Cons: We maintain all complexity

**Decision:** Explorer-1 will research and recommend based on:
- Does Anthropic have Agent SDK?
- How much refactor is each option?
- Which gives best reliability?

### Database Strategy

**Decision: Supabase Local + Railway PostgreSQL**
- Dev: Supabase local (Docker PostgreSQL)
- Prod: Railway managed PostgreSQL
- Same database engine everywhere
- Migrations work consistently

---

## Risk Assessment

### High Risk Areas

**Risk 1: Agent SDK Migration Too Complex**
- Impact: HIGH - Could take 2-3 days instead of 1 day
- Mitigation: Explorer-1 assesses complexity first, recommend COMPLETE vs SPLIT
- Fallback: Improve existing orchestrator instead of full migration

**Risk 2: Root Cause Unknown**
- Impact: HIGH - Can't fix if we don't know what's broken
- Mitigation: Extensive debug logging + step-by-step testing
- Approach: Add logs, run game, analyze where it stops

**Risk 3: API Key Issues**
- Impact: MEDIUM - Could be simple config problem
- Mitigation: Test API key loading early, verify with simple test script
- Check: `.anthropic-key.txt` exists, can be read, key is valid

**Risk 4: Supabase Local Setup Issues**
- Impact: MEDIUM - Docker/networking problems
- Mitigation: Follow official Supabase docs, test incrementally
- Fallback: Keep SQLite for dev if Supabase fails (document differences)

---

## Builder Allocation

### 6 Builders Recommended

**Builder-1: Agent SDK Research & Architecture Decision** (4-6 hours)
- Research available options
- Prototype with each option
- Recommend approach with pros/cons
- If migrating: Create migration plan
- If improving: Document fixes needed

**Builder-2: Runtime Error Healing** (6-8 hours) 
- Add extensive debug logging
- Test each phase independently
- Fix API key loading
- Fix orchestrator bugs
- Verify full game works

**Builder-3: Supabase Local Setup** (3-4 hours)
- Install Supabase CLI
- Initialize local project
- Migrate schema + data
- Update dev environment
- Document setup

**Builder-4: TypeScript Error Fixes** (4-6 hours)
- Fix all 28 errors
- Remove ignoreBuildErrors
- Add proper types
- Verify build succeeds

**Builder-5: Test Infrastructure** (4-6 hours)
- Add Jest/Vitest setup
- Unit tests for critical functions
- Integration tests for game flow
- Mocked API tests
- CI configuration (optional)

**Builder-6: Complete Logging + Debug Guide** (2-3 hours)
- Replace remaining 12 console.log
- Add debug mode
- Create debugging guide
- Document common issues

**Total Estimated:** 23-33 hours (expect splits on Builder-1 or Builder-2)

---

## Integration Strategy

### Phase 1: Architecture + Healing (Critical Path)
- Builder-1 (SDK research) completes first
- Builder-2 (runtime healing) waits for Builder-1 decision
- Builder-3 (Supabase) can run in parallel

### Phase 2: Quality + Testing
- Builder-4 (TypeScript) independent
- Builder-5 (tests) waits for Builder-2 (need working code to test)
- Builder-6 (logging) independent

### Phase 3: Integration + Validation
- Integrators merge all fixes
- Validator runs full game with real API key
- Deploy to Railway and verify

---

## Validation Approach

### Stage 1: Unit Tests
- All new tests pass
- Critical functions validated

### Stage 2: Integration Tests  
- Full game completes with mocked API
- All phases execute in sequence

### Stage 3: Real API Testing
- Run 3 games with real Claude API
- Measure cost, cache hit rate
- Verify all 8 success criteria

### Stage 4: Production Deployment
- Deploy to Railway
- Run 3 games in production
- Monitor for crashes, errors
- Validate cost tracking

---

## Timeline Estimate

**Exploration:** 2-3 hours (3 explorers in parallel)  
**Planning:** 1 hour (iplanner)  
**Building:** 23-33 hours (6 builders, some sequential)  
**Integration:** 4-6 hours (2 integrators)  
**Validation:** 2-3 hours (testing with real API)  

**Total:** ~32-45 hours (2-3 days of intensive work)

---

## Open Questions for Explorers

1. **Does Anthropic have an Agent SDK?** If yes, how mature is it?
2. **What is the root cause** of Discussion phase stuck at 0 messages?
3. **How complex is Agent SDK migration?** Can it be done in 1 builder or needs split?
4. **What are the 28 TypeScript errors?** Are they quick fixes or deep issues?
5. **Can we migrate SQLite data to PostgreSQL** or start fresh?
6. **What test framework** should we use? (Jest, Vitest, or Playwright?)

---

## Success Definition

**Iteration 4 is successful when:**

✅ We can deploy to Railway  
✅ Create a game with 10 AI players  
✅ Start the game and watch it complete all phases  
✅ Game reaches GAME_OVER with a winner (Mafia or Villagers)  
✅ Cost is <$5 per game (ideally <$2)  
✅ Cache hit rate is >70%  
✅ Zero crashes across 3 consecutive games  
✅ TypeScript compiles with strict mode  
✅ Tests pass and provide confidence  

**Then we have a working MVP ready for users! 🎉**

---

## Next Steps

1. ✅ Create this vision document
2. **Spawn 3 explorers** to assess issues:
   - Explorer-1: Agent SDK options + architecture analysis
   - Explorer-2: Runtime debugging + root cause analysis  
   - Explorer-3: Database migration + testing infrastructure
3. **Create planning documents** (iplanner)
4. **Execute 6 builders** with proper orchestration
5. **Integrate and validate** with real API testing
6. **Deploy to Railway** and celebrate! 🚀

---

**Vision Status:** CREATED  
**Priority:** CRITICAL  
**Estimated Effort:** 32-45 hours  
**Target:** Working production deployment
