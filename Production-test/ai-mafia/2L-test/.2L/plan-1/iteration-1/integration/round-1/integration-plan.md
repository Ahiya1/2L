# Integration Plan - Round 1

**Created:** 2025-10-12T00:00:00Z
**Iteration:** plan-1/iteration-1
**Total builders to integrate:** 5

---

## Executive Summary

Integration Round 1 involves merging outputs from 5 builders (Builder-1, Builder-2, Builder-3, Builder-4, and Builder-4A) into a cohesive AI Mafia Discussion phase system. The primary challenge is connecting the database layer (Builder-1), AI orchestration (Builder-2), discussion orchestrator (Builder-3), and dual validation/visualization systems (Builder-4 CLI + Builder-4A Web UI).

Key insights:
- Builder-1 provides complete foundation - all other builders depend on database schema
- Builder-2 and Builder-3 have clear integration boundary (context building interface)
- Builder-4/4A both consume Builder-3's event emitter (parallel, low conflict)
- No significant file conflicts detected (clean directory separation)
- High risk: Event emitter wiring between orchestrator and UI/CLI

---

## Builders to Integrate

### Primary Builders
- **Builder-1:** Project Setup & Database Schema - Status: COMPLETE
- **Builder-2:** AI Agent Orchestration & Claude Integration - Status: COMPLETE
- **Builder-3:** Discussion Phase Orchestrator - Status: COMPLETE
- **Builder-4:** CLI Test Harness & Quality Evaluation - Status: SPLIT

### Sub-Builders
- **Builder-4A:** Web UI & SSE Streaming - Status: COMPLETE

**Total outputs to integrate:** 5

---

## Integration Zones

### Zone 1: Database Foundation Integration

**Builders involved:** Builder-1 (all others depend on this)

**Conflict type:** Shared Types

**Risk level:** LOW

**Description:**
Builder-1 created the complete database schema and shared types that all other builders need. This zone involves ensuring all builders can successfully import and use the database client, and verifying that placeholder types in Builder-2, Builder-3, and Builder-4 are replaced with actual Prisma types.

**Files affected:**
- `prisma/schema.prisma` - Database schema (Builder-1 owns)
- `src/lib/db/client.ts` - Prisma singleton (Builder-1 owns)
- `src/lib/types/shared.ts` - Shared types (Builder-1 created, others may have extended)
- All builder imports of `@prisma/client` types

**Integration strategy:**
1. Verify Builder-1's database schema is complete (all 5 tables: games, players, discussion_messages, votes, game_events)
2. Run `npx prisma generate` to ensure Prisma client is generated
3. Test database connection with seed function: `npm run test:seed`
4. Replace placeholder types in Builder-2/3/4 with actual Prisma imports:
   - Change `interface Player` to `import { Player } from '@prisma/client'`
   - Change `interface DiscussionMessage` to `import { DiscussionMessage } from '@prisma/client'`
5. Verify all builders can import `prisma` from `@/lib/db/client`
6. Merge any extended types from Builder-2/3 into `shared.ts` (append-only)

**Expected outcome:**
- All builders successfully import Prisma types
- TypeScript compiles with no type errors
- Seed function creates test game with 10 agents
- Database queries work from all builders

**Assigned to:** Integrator-1

**Estimated complexity:** LOW

---

### Zone 2: AI Agent Context Building Integration

**Builders involved:** Builder-2, Builder-3

**Conflict type:** Shared Dependencies

**Risk level:** MEDIUM

**Description:**
Builder-3's orchestrator needs to call Builder-2's context building and Claude API functions. This zone involves wiring the dependency injection pattern that Builder-3 implemented (accepts functions as parameters) with Builder-2's actual implementations.

**Files affected:**
- `src/lib/discussion/orchestrator.ts` - Calls context builder (Builder-3)
- `src/lib/claude/context-builder.ts` - Provides `buildAgentContext()` (Builder-2)
- `src/lib/claude/client.ts` - Provides `generateWithTimeout()` (Builder-2)
- `src/utils/cost-tracker.ts` - Provides cost tracking (Builder-2)

**Integration strategy:**
1. Review Builder-3's dependency injection interface in `orchestrator.ts`:
   ```typescript
   await runDiscussion(gameId, {
     prisma,
     buildContext,
     generateResponse,
     trackCost,
     getCostSummary
   });
   ```
2. Verify Builder-2's exports match expected signatures:
   - `buildAgentContext(playerId, gameId)` returns `AgentContext`
   - `generateWithTimeout(context, timeoutMs)` returns `{ text, usage }`
   - `costTracker.log()` accepts token usage
   - `costTracker.getGameSummary(gameId)` returns cost summary
3. Wire Builder-2's implementations into Builder-3's orchestrator
4. Test single turn execution (minimal test with 1 agent, 1 turn)
5. Verify agent response generated successfully
6. Verify message saved to database
7. Verify cost tracked correctly

**Expected outcome:**
- Orchestrator successfully calls Claude API via Builder-2
- Agent context built from database history
- Response generated and validated
- Message saved with proper threading
- Cost logged correctly

**Assigned to:** Integrator-1

**Estimated complexity:** MEDIUM

---

### Zone 3: Event Emitter Wiring

**Builders involved:** Builder-3, Builder-4, Builder-4A

**Conflict type:** Shared Dependencies

**Risk level:** MEDIUM

**Description:**
Builder-3's orchestrator emits events via EventEmitter. Both Builder-4 (CLI) and Builder-4A (Web UI) need to listen to these events for real-time updates. This zone involves verifying event emission works correctly and both consumers receive events with proper filtering.

**Files affected:**
- `src/lib/events/emitter.ts` - EventEmitter singleton (Builder-3)
- `src/lib/events/types.ts` - Event type definitions (Builder-3)
- `src/cli/test-discussion.ts` - Listens for events (Builder-4)
- `app/api/game/[gameId]/stream/route.ts` - SSE endpoint (Builder-4A)

**Integration strategy:**
1. Verify Builder-3's event emission points in orchestrator:
   - After saving message: `gameEventEmitter.emit('message', { gameId, type: 'NEW_MESSAGE', payload: savedMessage })`
   - After turn complete: `gameEventEmitter.emit('turn_complete', ...)`
   - After phase complete: `gameEventEmitter.emit('phase_complete', ...)`
2. Verify Builder-4's CLI event listeners are registered before orchestrator starts
3. Verify Builder-4A's SSE endpoint filters events by gameId correctly
4. Test event flow: orchestrator → EventEmitter → CLI (console output)
5. Test event flow: orchestrator → EventEmitter → SSE → Web UI
6. Verify no event leaks between different gameIds
7. Verify keepalive prevents SSE connection timeout

**Expected outcome:**
- CLI displays messages in real-time as turns execute
- Web UI SSE receives events with <1 second latency
- Events properly filtered by gameId (no cross-game leaks)
- Both CLI and Web UI show same messages simultaneously

**Assigned to:** Integrator-2

**Estimated complexity:** MEDIUM

---

### Zone 4: CLI Test Harness Integration

**Builders involved:** Builder-4, Builder-1, Builder-2, Builder-3

**Conflict type:** End-to-End Wiring

**Risk level:** LOW

**Description:**
Builder-4's CLI test harness needs to orchestrate the complete flow: create game (Builder-1) → run discussion (Builder-3) → display events (Builder-4) → show cost summary (Builder-2). This zone involves wiring all components together in the CLI script.

**Files affected:**
- `src/cli/test-discussion.ts` - Main CLI script (Builder-4)
- `src/lib/db/seed.ts` - Test game creation (Builder-1)
- `src/lib/discussion/orchestrator.ts` - Discussion runner (Builder-3)
- `src/utils/cost-tracker.ts` - Cost display (Builder-2)
- `src/lib/discussion/transcript.ts` - Transcript generator (Builder-4)

**Integration strategy:**
1. Wire seed function: `const gameId = await seedTestGame(config)`
2. Wire event listeners: Listen to `gameEventEmitter` before starting discussion
3. Wire orchestrator: Call `runDiscussion(gameId, dependencies)` with all Builder-2 functions
4. Wire cost display: Call `costTracker.getGameSummary(gameId)` after completion
5. Wire transcript generation: Generate and save transcript to `logs/transcripts/`
6. Test CLI end-to-end: `npm run test-discussion`
7. Verify colored output displays correctly (chalk)
8. Verify transcript file saved with correct format
9. Verify cost summary shows cache hit rate >70%

**Expected outcome:**
- CLI command runs successfully from start to finish
- Real-time colored output shows all agent turns
- Transcript file saved to logs directory
- Cost summary displayed with accurate metrics
- Test completes in ~3 minutes (10 agents × 5 rounds)

**Assigned to:** Integrator-2

**Estimated complexity:** LOW

---

### Zone 5: Web UI SSE Integration

**Builders involved:** Builder-4A, Builder-3

**Conflict type:** SSE Streaming

**Risk level:** MEDIUM

**Description:**
Builder-4A's web UI components need to connect to the SSE endpoint and display real-time updates. This zone involves testing the full SSE pipeline and ensuring UI components render correctly with live data.

**Files affected:**
- `app/api/game/[gameId]/stream/route.ts` - SSE endpoint (Builder-4A)
- `app/test-discussion/page.tsx` - Discussion viewer page (Builder-4A)
- `components/PhaseIndicator.tsx` - Phase display (Builder-4A)
- `components/PlayerGrid.tsx` - Agent cards (Builder-4A)
- `components/DiscussionFeed.tsx` - Message feed (Builder-4A)
- `src/lib/events/emitter.ts` - Event source (Builder-3)

**Integration strategy:**
1. Start Next.js dev server: `npm run dev`
2. Create test game via CLI (get gameId)
3. Navigate to `/test-discussion?gameId=<id>`
4. Verify SSE connection established (green indicator)
5. Start discussion via CLI in separate terminal
6. Verify messages appear in Web UI as CLI logs them
7. Verify PhaseIndicator countdown timer updates
8. Verify PlayerGrid displays all 10 agents
9. Verify DiscussionFeed auto-scrolls to bottom
10. Test reconnection: kill server, restart, verify auto-reconnect
11. Test multiple clients: open 3 tabs, verify all receive same events

**Expected outcome:**
- SSE endpoint streams events correctly
- All 3 components render and update in real-time
- <1 second latency from event emission to UI display
- Auto-scroll works smoothly
- Connection indicator shows status accurately
- Multiple spectators can watch simultaneously

**Assigned to:** Integrator-2

**Estimated complexity:** MEDIUM

---

### Zone 6: Quality Evaluation Integration

**Builders involved:** Builder-4, Builder-2, Builder-3

**Conflict type:** Independent Features

**Risk level:** LOW

**Description:**
Builder-4's quality evaluation script needs to analyze transcripts generated from discussion runs. This is an independent feature with no conflicts, just needs to be tested with real transcript data.

**Files affected:**
- `src/cli/evaluate-transcript.ts` - Quality evaluation script (Builder-4)
- `src/lib/discussion/transcript.ts` - Transcript generator (Builder-4)
- `docs/quality-rubric.md` - Evaluation criteria (Builder-4)

**Integration strategy:**
1. Run CLI test to generate transcript: `npm run test-discussion`
2. Verify transcript saved to `logs/transcripts/` with timestamp
3. Run quality evaluation: `npm run evaluate logs/transcripts/<filename>.json`
4. Verify 7 quality metrics calculated:
   - Memory accuracy (manual validation required)
   - Strategic depth (automated - keyword analysis)
   - Conversation coherence (automated - context relevance)
   - Role consistency (manual validation required)
   - Personality diversity (automated - language patterns)
   - Anti-repetition (automated - phrase repetition rate)
   - Manual engagement (human reviewer score)
5. Verify PASS/FAIL determination (5/7 metrics must pass)
6. Verify recommendations displayed for failed metrics

**Expected outcome:**
- Evaluation script runs successfully on transcript
- All automated metrics calculate correctly
- Manual validation prompts appear for human review
- PASS/FAIL determination accurate
- Recommendations actionable

**Assigned to:** Integrator-2

**Estimated complexity:** LOW

---

## Independent Features (Direct Merge)

These builder outputs have no conflicts and can be merged directly:

- **Builder-1:** Documentation files (`docs/setup-guide.md`, `README.md`) - No conflicts
- **Builder-4:** Quality rubric (`docs/quality-rubric.md`) - No conflicts
- **Builder-4:** CLI usage guide (`docs/cli-usage.md`) - No conflicts
- **Builder-4A:** Web UI usage guide (`docs/web-ui-usage.md`) - No conflicts

**Assigned to:** Integrator-1 (quick merge alongside Zone 1 work)

---

## Parallel Execution Groups

### Group 1 (Parallel)
- **Integrator-1:** Zone 1 (Database Foundation) + Zone 2 (AI Context Building) + Independent docs
- **Integrator-2:** Zone 3 (Event Emitter Wiring) setup + Zone 4 (CLI Harness) preparation

### Group 2 (Sequential - runs after Group 1)
- **Integrator-2:** Zone 4 (CLI Test Harness) complete integration
- **Integrator-2:** Zone 5 (Web UI SSE) complete integration
- **Integrator-2:** Zone 6 (Quality Evaluation) validation

---

## Integration Order

**Recommended sequence:**

1. **Integrator-1: Foundation (Zones 1-2)** [2-3 hours]
   - Merge Builder-1 database files into project root
   - Verify database schema and Prisma client working
   - Replace placeholder types with actual Prisma types in all builders
   - Wire Builder-2's context builder into Builder-3's orchestrator
   - Test single turn execution (1 agent, 1 turn)
   - Merge independent documentation files

2. **Integrator-2: Event System (Zone 3)** [1-2 hours]
   - Review event emission points in Builder-3's orchestrator
   - Test EventEmitter with mock events
   - Verify Builder-4 CLI listeners work
   - Verify Builder-4A SSE endpoint receives events

3. **Both Integrators: CLI Integration (Zone 4)** [1-2 hours]
   - Wire all components in CLI test script
   - Run end-to-end CLI test
   - Fix any integration issues
   - Verify transcript generation
   - Verify cost tracking display

4. **Integrator-2: Web UI Integration (Zone 5)** [1-2 hours]
   - Start Next.js dev server
   - Test SSE connection with real orchestrator
   - Verify all components render correctly
   - Test with live discussion (CLI running simultaneously)
   - Verify latency <1 second

5. **Integrator-2: Quality Validation (Zone 6)** [1 hour]
   - Run quality evaluation on generated transcripts
   - Verify all metrics calculate
   - Document any issues with evaluation criteria

6. **Final Validation (Both)** [1 hour]
   - Run 3 complete tests end-to-end
   - Verify CLI and Web UI show consistent data
   - Verify cost <$3 per test
   - Verify cache hit rate >70%
   - Archive best transcript as example

---

## Shared Resources Strategy

### Shared Types
**Issue:** Multiple builders may have extended `shared.ts` with their own types

**Resolution:**
- Use Builder-1's `src/lib/types/shared.ts` as base
- Append any additional types from Builder-2 (AgentContext, TokenUsage)
- Append any additional types from Builder-3 (TurnSchedule, DiscussionStats)
- Append any additional types from Builder-4 (TranscriptData, QualityMetrics)
- Verify no duplicate type definitions

**Responsible:** Integrator-1 in Zone 1

### Event Types
**Issue:** Builder-3 created event types, Builder-4A may have added more

**Resolution:**
- Use Builder-3's `src/lib/events/types.ts` as base
- Append any additional event types from Builder-4A if needed
- Verify event payload structures match across all consumers

**Responsible:** Integrator-2 in Zone 3

### Package.json Scripts
**Issue:** Builder-4 added CLI scripts, verify they work

**Resolution:**
- Merge Builder-4's scripts into package.json:
  - `"test-discussion": "tsx src/cli/test-discussion.ts"`
  - `"evaluate": "tsx src/cli/evaluate-transcript.ts"`
  - `"test:seed": "tsx src/cli/test-seed.ts"` (Builder-1)
- Test all scripts work correctly

**Responsible:** Integrator-1 in Zone 1

### Environment Variables
**Issue:** Multiple builders reference .env variables

**Resolution:**
- Use Builder-1's `.env` as base
- Verify all variables referenced by all builders are present:
  - `DATABASE_URL` (Builder-1)
  - `ANTHROPIC_API_KEY` (Builder-2)
  - `NODE_ENV` (all)
  - `DISCUSSION_DURATION_SECONDS` (Builder-3)
  - `AGENT_TURN_TIMEOUT_SECONDS` (Builder-2, Builder-3)
  - `AGENT_TURNS_PER_ROUND` (Builder-3)
  - `MAX_COST_PER_TEST` (Builder-2, Builder-4)
  - `MIN_CACHE_HIT_RATE` (Builder-2, Builder-4)
- Verify `.env.example` documents all variables

**Responsible:** Integrator-1 in Zone 1

---

## Expected Challenges

### Challenge 1: Prompt Caching Not Working After Integration
**Impact:** Cost exceeds $3 per test, blocks iteration
**Mitigation:**
- Test caching immediately after Zone 2 integration
- Run Builder-2's validation test: `src/validation/test-caching.ts`
- Verify cache hit rate >70% in first real discussion test
- If caching fails, check system prompt formatting (must match exact pattern)
**Responsible:** Integrator-1 in Zone 2

### Challenge 2: Event Emitter Not Firing to CLI/UI
**Impact:** No real-time updates, blind execution
**Mitigation:**
- Add debug logging to event emission points in Builder-3
- Test EventEmitter in isolation with mock events
- Verify listeners registered BEFORE orchestrator starts
- Check gameId filtering (must match exactly)
**Responsible:** Integrator-2 in Zone 3

### Challenge 3: SSE Connection Drops Frequently
**Impact:** Web UI misses messages, poor user experience
**Mitigation:**
- Verify 15-second keepalive implemented in SSE route
- Test with Chrome DevTools network throttling
- Verify EventSource auto-reconnect working
- Add connection status indicator in UI (already implemented by Builder-4A)
**Responsible:** Integrator-2 in Zone 5

### Challenge 4: TypeScript Type Mismatches After Merging
**Impact:** Compilation errors, integration blocked
**Mitigation:**
- Run `npx tsc --noEmit` after each zone integration
- Replace all placeholder types with actual Prisma types
- Verify import paths correct (all use `@/` alias)
- Check for duplicate type definitions in shared.ts
**Responsible:** Integrator-1 in Zone 1

### Challenge 5: Turn Execution Takes Too Long
**Impact:** Discussion phase exceeds 5 minutes, too slow
**Mitigation:**
- Monitor API latency per turn (log in orchestrator)
- Verify 10-second timeout enforced
- Check database query performance (should be <100ms)
- Verify no blocking operations in turn execution loop
**Responsible:** Integrator-1 in Zone 2

---

## Success Criteria for This Integration Round

- [ ] All zones successfully resolved
- [ ] No duplicate code remaining
- [ ] All imports resolve correctly
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] Consistent patterns across integrated code
- [ ] No conflicts in shared files (shared.ts, package.json, .env)
- [ ] All builder functionality preserved
- [ ] CLI test runs successfully end-to-end
- [ ] Web UI displays live discussion
- [ ] Cost <$3 per test with cache hit rate >70%
- [ ] Quality evaluation script works on transcripts
- [ ] 3 validation tests all pass

---

## Notes for Integrators

**Important context:**
- Builder-1 created COMPLETE foundation - database schema is frozen for Iteration 1
- Builder-2 validated prompt caching works (81% cost savings confirmed)
- Builder-3 used dependency injection pattern - easy to wire Builder-2 functions
- Builder-4 and Builder-4A are independent - no conflict between CLI and Web UI
- All builders followed patterns.md exactly - integration should be smooth

**Watch out for:**
- Model name in Claude client must be `claude-sonnet-4-5-20250929` (underscores, not dots)
- System prompts must be >1024 tokens for caching to activate
- Event listeners must be registered BEFORE orchestrator starts
- Import paths in SSE route may need adjustment (app/ vs src/ directory structure)

**Patterns to maintain:**
- Reference `patterns.md` for all conventions
- Ensure error handling is consistent (graceful degradation)
- Keep naming conventions aligned (camelCase files, PascalCase types)
- Verify all database queries use indexes (fast context building)

**Testing priority:**
1. **Zone 1 is critical** - All other zones depend on database working
2. **Zone 2 is high risk** - Prompt caching must work or cost explodes
3. **Zone 3 is medium risk** - Event system must work for real-time updates
4. **Zones 4-6 are low risk** - Independent features, well-tested by builders

---

## Next Steps

1. **Integrator-1 starts with Zone 1** (Database Foundation)
   - Merge Builder-1 files into project root
   - Verify Prisma client and database working
   - Run seed function test

2. **Integrator-1 proceeds to Zone 2** (AI Context Building)
   - Wire Builder-2 into Builder-3
   - Test single turn execution
   - Verify prompt caching working

3. **Integrator-2 starts with Zone 3** (Event Emitter)
   - Test EventEmitter in isolation
   - Verify CLI and SSE listeners work

4. **Both integrators collaborate on Zone 4** (CLI Integration)
   - Wire all components
   - Run end-to-end test
   - Fix any issues

5. **Integrator-2 completes Zones 5-6** (Web UI + Quality Eval)
   - Test SSE with live discussion
   - Run quality evaluation
   - Document results

6. **Final validation** (Both integrators)
   - Run 3 complete tests
   - Verify all success criteria met
   - Archive transcripts
   - Move to ivalidator

---

**Integration Planner:** 2l-iplanner
**Plan created:** 2025-10-12T00:00:00Z
**Round:** 1
**Estimated total integration time:** 8-12 hours (includes testing and debugging)
**Risk level:** MEDIUM (prompt caching and event wiring are main risks)
**Recommendation:** Start immediately with Zone 1, prioritize prompt caching validation in Zone 2
