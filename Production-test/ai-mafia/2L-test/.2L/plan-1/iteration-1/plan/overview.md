# 2L Iteration Plan - AI Mafia Game

## Project Vision
Build Stage 1 of AI Mafia where 8-12 Claude 4.5 Sonnet agents autonomously play Mafia while spectators watch. The game features strategic multi-turn conversations, Mafia deception, and Villager logical deduction. **Iteration 1 focuses exclusively on the Discussion phase** - the highest-risk, most critical component where agents must debate, accuse, defend, and build cases based on conversation memory.

## Iteration 1: Foundation & Discussion Core

**Primary Goal:** Prove that Claude 4.5 Sonnet agents can engage in strategic, multi-turn Mafia conversation that is "fascinating to watch."

**Phase Focus:** Build Discussion phase orchestration in isolation before investing in full game implementation.

## Success Criteria

Iteration 1 must pass ALL 7 quality gates before proceeding to Iteration 2:

- [ ] **Conversation Coherence** - Agents respond to prior statements (not random monologues). Target: 70% of responses contextually relevant to last 3 messages.

- [ ] **Memory Accuracy** - Agents reference past events correctly. Target: >80% accurate references when citing previous rounds, votes, or statements.

- [ ] **Strategic Behavior** - Mafia agents deflect/lie convincingly, Villagers question/deduce logically. Target: 80% of statements are role-appropriate (manual evaluation of 3+ test games).

- [ ] **Natural Flow** - Conversation builds toward conclusion, not repetitive. Target: <10% phrase repetition rate across 50 messages.

- [ ] **Fascinating Factor** - Human evaluator rates conversation 3+/5 "interesting to watch" using defined rubric.

- [ ] **Technical Stability** - Discussion completes without crashes. Target: API error rate <5%, orchestrator handles timeouts gracefully.

- [ ] **Cost Validation** - Prompt caching working. Target: Cost <$2 per Discussion test (verify via logs showing >70% cache hit rate).

**Critical Gate:** If conversation quality doesn't meet "fascinating" threshold after 15 hours of prompt iteration, escalate or pivot strategy. DO NOT proceed to Iteration 2 with boring AI agents.

## MVP Scope

### In Scope (Iteration 1)

**Core Technical Infrastructure:**
- Next.js 14 App Router + TypeScript strict mode
- Prisma + SQLite with WAL mode enabled
- @anthropic-ai/sdk integration (claude-sonnet-4.5-20250929)
- Environment: .anthropic-key.txt API key management
- Tailwind CSS for minimal styling

**Database Schema:**
- `games` table: game state, status, phase timing
- `players` table: agent names, roles, personalities, alive status
- `discussion_messages` table: all agent statements, threading, timestamps
- `votes` table: voting records with justifications (structure only, not used in Iteration 1)
- `game_events` table: phase transitions, eliminations (structure only)
- Strategic indexes: (gameId, roundNumber), (gameId, timestamp) for sub-2s context queries

**AI Agent Orchestration System:**
- Agent State Manager: Create/manage 8-12 agent instances with roles and personalities
- Context Builder: Compile game history (messages, votes, deaths) into Claude API context
- Conversation Memory: Query database for full game history, format for agent consumption
- System Prompts: Role-specific prompts for Mafia (deception) vs Villager (deduction)
- Personality Injection: 5 personality traits (analytical, aggressive, cautious, social, suspicious) for diversity
- **Prompt Caching (MANDATORY):** Cache game history to achieve 73% cost reduction ($17 → $4.62 per game)

**Discussion Phase Orchestrator:**
- Turn Scheduler: Sequential turn management (round-robin with 3-5 rounds per agent)
- Turn Execution: For each turn, fetch context → call Claude API → save message → broadcast
- Response Timeout: 10-second hard limit per agent turn with graceful fallback
- Conversation Threading: Store inReplyTo field for basic response chains
- Phase Timer: 3-5 minute Discussion phase duration with completion logic
- Multi-round System: Each agent speaks 3-5 times per Discussion, building on prior statements

**Claude 4.5 Sonnet Integration:**
- API client with retry logic (exponential backoff for 429/500 errors)
- Prompt engineering: Embed Mafia strategy (deflect, lie, blend in) and Villager strategy (pattern analysis, questioning)
- Response validation: Minimum 15 words, game-relevant keywords present
- Token usage logging: Track input/output tokens and cost per game (verify caching effectiveness)
- Temperature: 0.8 for creative deception and varied responses
- Max tokens: 150-200 (control output length and cost)

**CLI Test Harness (PRIMARY VALIDATION TOOL):**
- Command: `npm run test-discussion`
- Manual game setup: Create 10 agents (3 Mafia, 7 Villagers) with random personalities
- Run 5-minute Discussion with 40-50 agent responses
- Log full conversation transcript to file for manual review
- Display real-time conversation in terminal (agent name + message)
- Cost tracking: Report total tokens and API cost after test
- Quality evaluation: Calculate 7 quality metrics from transcript

**Basic Web UI (Discussion Viewer):**
- Simple page at `/test-discussion` to view live Discussion
- Display: Phase indicator with countdown, player grid (names, roles HIDDEN), scrolling discussion feed
- Real-time updates via Server-Sent Events (SSE)
- Fallback: 2-second polling if SSE unavailable (defer to QA)
- No lobby, no full game loop yet - just Discussion phase viewer
- Minimal styling: functional layout only (polish deferred to Iteration 3)

### Out of Scope (Defer to Iteration 2)

- Night phase (Mafia private coordination)
- Voting phase
- Day announcement
- Win condition checking
- Full game loop (multi-phase state machine)
- Role reveal UI
- Vote tally UI
- Lobby screen with player count selection
- Game over screen

### Out of Scope (Defer to Iteration 3)

- Advanced conversation threading visualization (lines/graphs)
- Strategic pattern highlights (voting blocs, accusation networks)
- Agent "typing" indicators
- Post-game analytics dashboard
- Multiple concurrent games
- Mobile responsive design

## Development Phases

1. **Exploration** - Complete
2. **Planning** - Current
3. **Building** - 18-22 hours estimated (4 parallel builders)
4. **Integration** - 30 minutes (minimal - Discussion phase is self-contained)
5. **Validation** - 15 test runs × 3 minutes = 45 minutes runtime + manual evaluation
6. **Deployment** - Not required for Iteration 1 (local development only)

## Timeline Estimate

**Exploration:** Complete

**Planning:** Complete

**Building:** 18-22 hours (4 builders working in parallel)
- Builder 1 (Project Setup + Database): 4-5 hours
- Builder 2 (AI Agent Orchestration + Claude): 8-10 hours
- Builder 3 (Discussion Orchestrator): 8-10 hours
- Builder 4 (CLI Harness + Basic UI): 6-8 hours

**Integration:** 30 minutes (builders integrate through shared database schema)

**Validation:** 10-15 test runs
- Baseline: 3 tests (1 hour)
- Iteration Cycle 1: 3 tests (1 hour)
- Iteration Cycle 2: 3 tests (1 hour)
- Iteration Cycle 3: 3 tests (1 hour)
- Final Validation: 3 tests (1 hour)
- Total: 5 hours runtime + 8-10 hours manual evaluation and prompt refinement

**Total:** 18-22 hours building + 5 hours testing runtime + 8-10 hours prompt iteration = **31-37 hours**

**Critical Path:** Prompt engineering quality (unpredictable, high variance)

## Risk Assessment

### High Risks

**Risk: Discussion conversation quality is poor (boring, robotic, not strategic)**
- **Impact:** Project fails primary success criterion, cannot proceed to Iteration 2
- **Likelihood:** MEDIUM (prompt engineering requires iteration)
- **Mitigation Strategy:**
  1. Start with detailed base prompts from Explorer 2 report (not from scratch)
  2. Allocate 8-10 hours specifically for prompt iteration (not just 2-3 hours)
  3. Use A/B testing methodology (one change per cycle, compare results)
  4. Define measurable quality metrics (7 dimensions with thresholds)
  5. Run 10-15 test games minimum (not just 3-5)
  6. Document all prompt changes and reasoning
- **Fallback:** If quality doesn't improve after 15 hours, escalate for expert prompt engineering support

**Risk: Prompt caching not working correctly**
- **Impact:** Cost increases from $4 to $17 per game (prohibitive for testing, blocks iteration)
- **Likelihood:** MEDIUM (cache invalidation is sensitive to exact content structure)
- **Mitigation Strategy:**
  1. Implement token usage logging from Day 1
  2. Display cache hit rate after EVERY test (target: >70%)
  3. FAIL test if cost >$3 (indicates caching broken)
  4. Test caching with single agent before full orchestration
  5. Review Anthropic prompt caching documentation thoroughly
- **Fallback:** If caching fails, reduce test duration (1-2 minutes) to stay under budget

**Risk: Claude API latency too high**
- **Impact:** Discussion phase becomes too slow, spectators lose interest
- **Likelihood:** MEDIUM (API latency can spike to 10-15 seconds unpredictably)
- **Mitigation Strategy:**
  1. Implement 10-second timeout per turn (MANDATORY, not optional)
  2. Generate fallback responses for timeouts ("Agent is thinking carefully...")
  3. Monitor API latency per request (log P50, P95, P99)
  4. Use "Agent is thinking..." UI indicator during API calls
- **Fallback:** Reduce player count (8 instead of 10) or reduce turns per agent (3 instead of 5)

### Medium Risks

**Risk: Database query performance degrades**
- **Impact:** Context building takes >2 seconds, slows turn execution
- **Likelihood:** LOW (SQLite handles 50-500 messages easily with proper indexes)
- **Mitigation Strategy:**
  1. Implement all recommended indexes in initial migration
  2. Use EXPLAIN QUERY PLAN to verify index usage
  3. Test with 200+ message scenarios (load test)
  4. Set query time alert: fail if context query >2 seconds
- **Fallback:** Switch to PostgreSQL or implement context pruning

**Risk: Discussion orchestrator deadlocks**
- **Impact:** Game hangs, no error messages, requires manual intervention
- **Likelihood:** LOW (sequential turn logic is straightforward)
- **Mitigation Strategy:**
  1. Use explicit state tracking (currentTurn, nextTurn variables)
  2. Implement orchestrator-level timeout (30 seconds per turn max)
  3. Log turn start/end timestamps
  4. Graceful degradation: skip agent if turn fails
- **Fallback:** Add deadlock detection (alert if no turn completes in 30s)

**Risk: SSE connections drop frequently**
- **Impact:** Spectators miss messages (but game continues)
- **Likelihood:** MEDIUM (SSE can be flaky on poor networks)
- **Mitigation Strategy:**
  1. EventSource automatically reconnects (native feature)
  2. Implement state catchup (fetch missed messages on reconnect)
  3. Display connection status indicator
  4. Test with throttled network in Chrome DevTools
- **Fallback:** Implement 2-second polling fallback (only if SSE proves unreliable in QA)

## Integration Strategy

**Integration Approach:** Shared database schema as contract

Builders work independently but share:
1. **Database schema** (Prisma): Single source of truth for all data structures
2. **Event emitter** (in-memory): Orchestrator → SSE communication
3. **API types** (TypeScript): Shared interfaces for Claude API responses
4. **Environment variables** (.env): Shared configuration

**Integration Points:**

1. **Builder 1 → All Builders:**
   - Creates database schema (Prisma migration)
   - Other builders import `@prisma/client` for queries
   - Conflict risk: LOW (schema designed upfront)

2. **Builder 2 → Builder 3:**
   - Builder 2 creates agent context builder
   - Builder 3 imports and uses in orchestrator
   - Conflict risk: LOW (clear function interface)

3. **Builder 3 → Builder 4:**
   - Builder 3 emits game events via EventEmitter
   - Builder 4 listens for SSE streaming
   - Conflict risk: MEDIUM (event payload structure must match)

4. **Builder 2 → Builder 4:**
   - Builder 2 implements cost tracking
   - Builder 4 displays in CLI summary
   - Conflict risk: LOW (data passed via return values)

**Integration Testing:**
- After Builder 1 completes: All builders test database queries
- After Builder 2 completes: Builder 3 tests context building
- After Builder 3 completes: Builder 4 tests event emission
- Final integration: Run CLI test harness end-to-end

**Conflict Prevention:**
- Builders commit types/ directory first (shared interfaces)
- Use Git feature branches (builder-1, builder-2, etc.)
- Merge to main only after successful integration test

## Deployment Plan

**Iteration 1 does NOT require deployment.**

All validation happens locally:
- CLI test harness: `npm run test-discussion` (local execution)
- Web UI: `http://localhost:3000/test-discussion` (local Next.js dev server)
- Database: SQLite file (`dev.db`) in project root

**Deployment deferred to Iteration 2** after full game loop is complete.

## Validation Strategy

**Primary Validation Method:** Manual transcript review using CLI test harness

**Process:**

1. **Baseline Tests (3 games):**
   - Run: `npm run test-discussion` × 3
   - Review transcripts: Identify weaknesses (robotic? repetitive? off-topic?)
   - Calculate quality metrics: Memory, strategy, coherence, role consistency, personality diversity, repetition, engagement
   - Result: Establish baseline scores

2. **Iteration Cycle 1 (3 games):**
   - Adjust prompts: Make ONE change (e.g., add anti-repetition instructions)
   - Run: `npm run test-discussion` × 3
   - Compare metrics: Did scores improve?
   - Decision: Keep change if improved, revert if not

3. **Iteration Cycle 2 (3 games):**
   - Adjust prompts: Make next change (e.g., add Mafia deception examples)
   - Run: `npm run test-discussion` × 3
   - Compare metrics: Track improvement trend
   - Decision: Keep or revert

4. **Iteration Cycle 3 (3 games):**
   - Adjust prompts: Final refinements
   - Run: `npm run test-discussion` × 3
   - Validate: Are 5/7 quality gates passing?

5. **Final Validation (3 games):**
   - Lock prompts (no more changes)
   - Run: `npm run test-discussion` × 3
   - Prove stability: All 3 tests must pass quality gates
   - Document: Save transcripts as examples

**Quality Gates Pass/Fail Criteria:**

Pass if:
- 5/7 automated metrics pass thresholds
- Engagement rating ≥3/5 (MANDATORY)
- Cost <$2 per test (cache hit rate >70%)
- 3/3 final validation tests pass

Fail if:
- Engagement rating <3/5 (even if automated metrics pass)
- Cost >$3 per test (caching broken)
- <5/7 automated metrics pass thresholds

**Total Testing Budget:**
- 15 tests × $2/test = $30 (acceptable)
- Runtime: 15 tests × 3 minutes = 45 minutes
- Manual evaluation: 8-10 hours (reading transcripts, adjusting prompts)

## Critical Success Factors

1. **Prompt Caching MUST Work:** Without 73% cost reduction, testing is prohibitively expensive. Validate on Day 1.

2. **CLI Test Harness is Primary Tool:** Web UI is secondary. Focus 60% of validation effort on CLI transcripts.

3. **Prompt Engineering Requires Time:** Allocate 8-10 hours for iteration, not just 2-3 hours. First prompts will NOT be perfect.

4. **Quality Metrics Must Be Defined Early:** Can't validate "fascinating" without concrete success criteria. Define rubric before first test.

5. **A/B Testing Methodology:** Make one change at a time, compare results systematically. Don't make random changes.

6. **Manual Evaluation is Critical:** Automated metrics are proxies. Human judgment of "fascinating to watch" is ultimate gate.

7. **Cost Tracking is Non-Negotiable:** Display cost after EVERY test. Alert if >$3 (caching failure).

## Handoff Criteria to Iteration 2

All 7 items MUST be complete before Iteration 2 begins:

1. CLI test harness functional: `npm run test-discussion` runs successfully
2. Web UI displays Discussion: `/test-discussion` shows live agent conversation
3. SSE streaming works: Messages appear <2 seconds after generation
4. Cost tracking validates caching: Cache hit rate >70% across 10+ tests
5. Quality gates pass: 5/7 dimensions meet thresholds across 3 final validation tests
6. Transcripts archived: 10+ test transcripts saved to `logs/` directory
7. Documentation complete:
   - `docs/quality-rubric.md` (evaluation criteria)
   - `docs/prompt-iteration-log.md` (all prompt changes documented)
   - `docs/setup-guide.md` (how to run tests)
   - 3-5 example transcripts committed to git

**Deliverables for Iteration 2 Builder:**
- Working Discussion orchestrator (integrate into full game loop)
- Validated system prompts (Mafia + Villager strategies)
- Database schema (extend for Night/Voting phases)
- CLI test harness pattern (replicate for full game testing)
- SSE implementation (extend for all game phases)

---

**Plan Status:** READY FOR BUILDING
**Estimated Completion:** 31-37 hours
**Risk Level:** HIGH (prompt engineering quality gate)
**Recommendation:** Start with Builder 1 (database schema) immediately, then parallelize Builders 2, 3, 4.
