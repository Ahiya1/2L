# Iteration 3: Polish & Real-time Enhancements - Plan Overview

## Executive Summary

Iteration 3 focuses on production readiness, UI/UX polish, and performance optimization. The primary goal is to make the game "fascinating to watch" while ensuring it's deployable and maintainable in production.

**Key Priorities:**
1. **Production Deployment** (Critical Path): Railway + PostgreSQL migration
2. **Structured Logging**: Replace 178 console.log statements with Pino
3. **UI/UX Polish**: Conversation threading, color-coding, animations  
4. **Prompt Engineering**: Expand personalities 5→10, anti-repetition
5. **Shareable URLs**: Game transcript export with replay mode
6. **Cost Monitoring**: Dashboard + circuit breaker

## Scope Decisions

### In Scope (Must-Have)

**Production Readiness (15-21 hours):**
- Railway deployment configuration
- PostgreSQL migration from SQLite
- Structured logging (Pino)
- Cost circuit breaker ($10 hard limit)
- Environment variable configuration
- Deployment documentation

**Shareable URLs (2-3 hours):**
- Generate share links after game over
- `/share/[shareId]` page with full transcript
- SharedGame database model

**Cost Monitoring (2-3 hours):**
- `/admin/costs` dashboard page
- Display: cost per game, cache hit rate, total spend
- Alerts for games exceeding $5 or cache <70%

**UI/UX Enhancements (6-9 hours):**
- Conversation threading (CSS indentation)
- Color-coded message types (accusations, defenses, questions)
- Agent avatars (deterministic color-based)
- Message timestamps
- Phase progress indicators

**Prompt Engineering (2-3 hours):**
- Expand personalities from 5 to 10
- Anti-repetition tracking (last 3 phrases per agent)
- Enhanced deception tactics for Mafia
- Enhanced deduction strategies for Villagers

### In Scope (Nice-to-Have)

**Replay Mode (4-5 hours):**
- Timeline scrubber with phase markers
- Playback controls (play/pause, speed)
- Seek functionality (jump to message)
- Add to shareable game page

**Highlight Reel (2-3 hours):**
- Auto-detect key moments (accusations, eliminations, close votes)
- Display as collapsible panel
- Click to jump to moment in timeline

**Performance Optimization (1-2 hours):**
- Bundle size optimization (lazy load VoteTally)
- Database query pagination (limit to last 50 messages)
- React performance (useMemo for highlightAccusations)

### Out of Scope (Explicitly Deferred)

- ❌ Context summarization (complex, high risk, not needed for 5-round games)
- ❌ Virtual scrolling (marginal benefit, 100 messages render fine)
- ❌ Advanced monitoring (Sentry/Datadog - overkill for Stage 1)
- ❌ Rate limiting (use platform limits, add Upstash if abuse detected)
- ❌ Multiple concurrent games (Stage 2 feature)
- ❌ Special roles (Detective, Doctor - Stage 2)

## Builder Allocation

### 6 Builders Recommended

**Builder-1: Production Deployment (PostgreSQL + Railway)**
- Estimated: 4-6 hours
- Complexity: MEDIUM-HIGH
- Split potential: Could split if PostgreSQL migration encounters issues
- Dependencies: None (can start immediately)

**Builder-2: Structured Logging + Error Handling**
- Estimated: 3-4 hours
- Complexity: MEDIUM
- Split potential: Low (straightforward replacement pattern)
- Dependencies: None

**Builder-3: UI/UX Polish (Threading, Colors, Avatars)**
- Estimated: 6-9 hours
- Complexity: MEDIUM-HIGH
- Split potential: HIGH (could split into 2 sub-builders if needed)
- Dependencies: None

**Builder-4: Prompt Engineering Expansion**
- Estimated: 2-3 hours
- Complexity: MEDIUM
- Split potential: Low
- Dependencies: None

**Builder-5: Shareable URLs + Cost Dashboard**
- Estimated: 4-6 hours
- Complexity: MEDIUM
- Split potential: Could split (ShareableURLs + CostDashboard separate)
- Dependencies: Builder-1 (needs SharedGame model migration)

**Builder-6: Replay Mode + Highlights (Optional)**
- Estimated: 6-8 hours
- Complexity: MEDIUM-HIGH
- Split potential: HIGH (could split into ReplayMode + Highlights)
- Dependencies: Builder-5 (needs shareable game page)

## Success Criteria

### All 7 Original Criteria Must Pass

1. ✓ Multi-turn discussion with logical responses
2. ✓ Mafia coordination (private) + convincing lies (public)
3. ✓ Villager deduction detects patterns and builds cases
4. ✓ Natural conversation flow (not robotic)
5. ✓ Memory accuracy (agents reference past events correctly)
6. ✓ Complete playthrough (game reaches win condition reliably)
7. ✓ **Fascinating to watch** (spectators engaged, strategy visible)

### Performance Targets

- Cost per game: <$5 (target: <$2 with 70% cache hit rate)
- Discussion phase: 3-5 minutes actual
- Full game: <45 minutes total
- SSE latency: <500ms
- Memory usage: <200MB

### Production Criteria

- ✅ Deploys successfully to Railway
- ✅ No crashes in 10 consecutive games
- ✅ API error rate <2%
- ✅ All error scenarios handled gracefully
- ✅ Documentation complete (deployment + troubleshooting)
- ✅ Structured logs captured in Railway dashboard
- ✅ Cost circuit breaker prevents runaway costs

## Risk Mitigation

### High-Risk Areas

**PostgreSQL Migration:**
- Risk: Breaking changes, data loss
- Mitigation: Test on local PostgreSQL first, Prisma abstracts differences well
- Rollback: Keep SQLite for development (dual support)

**Cache Hit Rate Below 70%:**
- Current: 48.2% observed in test (below target)
- Impact: Higher costs ($1.25 vs $0.50 per game)
- Mitigation: Monitor, iterate on prompt structure if needed

**Builder-6 May Need to Split:**
- Replay mode + highlights = 6-8 hours combined
- Decision: Split into sub-builders if timeline tight
- Alternative: Defer highlights to Iteration 4

### Medium-Risk Areas

**Logging Overhead:**
- Risk: Pino logging slows agent responses
- Mitigation: Use async mode, benchmark before/after

**Prompt Quality Regression:**
- Risk: New personalities reduce strategic depth
- Mitigation: A/B test (5 games old vs 5 games new prompts)

## Timeline Estimate

**Critical Path (Must-Have): 15-21 hours**
- Builder-1: 4-6 hours (Railway deployment)
- Builder-2: 3-4 hours (Structured logging)
- Builder-3: 6-9 hours (UI/UX polish)
- Builder-4: 2-3 hours (Prompt engineering)
- Builder-5: 4-6 hours (Shareable URLs + Cost dashboard)

**With Optional Features: 24-33 hours**
- Add Builder-6: 6-8 hours (Replay + Highlights)
- Add performance optimization: 1-2 hours (quick wins)

**Recommendation:** Execute critical path first, add Builder-6 if time permits after integration.

## Integration Strategy

**Phase 1: Core Infrastructure (Builders 1-2)**
- Deploy Builder-1 first (Railway + PostgreSQL)
- Deploy Builder-2 second (logging depends on production environment)
- Integration zone: Database migration, environment variables

**Phase 2: Features (Builders 3-5)**
- Deploy in parallel (independent)
- Builder-3: UI components (no backend dependencies)
- Builder-4: Prompts (isolated file changes)
- Builder-5: API endpoints + database models
- Integration zone: Shared Game model, API routes

**Phase 3: Optional (Builder-6)**
- Deploy after Phase 2 integration validated
- Depends on Builder-5 (shareable game page)
- Integration zone: Timeline component, highlight algorithm

## Validation Criteria

### Build Validation
- ✅ `npm run build` succeeds with 0 TypeScript errors
- ✅ `npm run lint` passes (no ignoring errors in next.config.mjs)
- ✅ Database migrations apply successfully to PostgreSQL

### Functional Validation
- ✅ Full game playthrough on Railway (create → start → game over)
- ✅ All API endpoints return correct responses
- ✅ SSE updates work in production
- ✅ Shareable URL loads full transcript
- ✅ Cost dashboard displays accurate data

### Quality Validation
- ✅ Cost per game <$5 (measure across 5 test games)
- ✅ Cache hit rate measured and logged
- ✅ No errors in structured logs during clean run
- ✅ Memory usage <200MB (check Railway metrics)
- ✅ 7 success criteria pass (run evaluation script)

## Next Steps

1. **Iplanner** creates integration plan with zones
2. **Spawn 5-6 builders** (potentially split Builder-6 into sub-builders)
3. **Integrators** merge builder outputs by zone
4. **Ivalidator** checks cohesion (target: >8/10)
5. **Validator** runs full game on Railway, verifies success criteria
6. **Session Complete** document results, next steps
