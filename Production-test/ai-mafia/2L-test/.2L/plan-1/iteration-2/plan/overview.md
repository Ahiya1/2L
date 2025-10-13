# 2L Iteration Plan - AI Mafia Game (Iteration 2)

## Project Vision

Complete the full Mafia game loop by integrating the validated Discussion phase from Iteration 1 with all remaining game phases (Night, Day Announcement, Voting, Win Conditions). Build a polished spectator web interface enabling real-time viewing of the complete game from lobby to results.

## Success Criteria

Specific, measurable criteria for Iteration 2 completion:

- [ ] Full game executes from LOBBY through multiple rounds to GAME_OVER without crashes
- [ ] Night phase enables private Mafia coordination invisible to Villagers and spectators
- [ ] Voting phase produces strategic votes that reference Discussion arguments (not random)
- [ ] Win conditions correctly trigger (Mafia >= Villagers or all Mafia eliminated)
- [ ] Lobby UI creates games with 8-12 players and assigns roles correctly
- [ ] Live Game UI displays all phases with real-time updates via SSE (<1 second latency)
- [ ] Game Over UI reveals all roles and displays full transcript
- [ ] Agents maintain memory across rounds (reference Round 1 events in Round 3 Discussion)
- [ ] Cost per full game remains under $5 (with prompt caching from Iteration 1)

## MVP Scope

**In Scope:**

- Master game orchestrator coordinating 5 phases (NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK)
- Night phase with Mafia-only coordination and victim selection
- Day Announcement with nightkill reveal and brief reactions
- Voting phase with sequential voting and justifications
- Win condition checker (atomic after each elimination)
- Role assignment algorithm (standard Mafia ratios: 25-33%)
- Lobby screen (player count selection, game creation)
- Live Game screen (phase indicator, player grid, discussion feed, vote tally)
- Game Over screen (winner announcement, role reveal, full transcript)
- 6 new API endpoints (create, start, state, messages, votes, results)
- 6 new SSE event types (vote_cast, player_eliminated, night_complete, day_announcement, game_over, round_start)

**Out of Scope (Post-MVP):**

- Advanced threading visualization (lines/graphs connecting messages)
- Strategic pattern highlights (accusation networks, voting blocs)
- Agent "typing" indicators
- Post-game analytics dashboard
- Multiple concurrent games
- Revoting on ties (random tie-breaking for MVP)
- Human player participation
- Mobile-optimized responsive design (desktop-first acceptable)

## Development Phases

1. **Exploration** ✓ Complete
2. **Planning** 🔄 Current
3. **Building** ⏳ 14-16 hours (parallel builders)
4. **Integration** ⏳ 1-2 hours
5. **Validation** ⏳ 1-2 hours
6. **Deployment** ⏳ Final

## Timeline Estimate

- Exploration: Complete (3 explorer reports)
- Planning: Complete
- Building: 14-16 hours (6 primary builders, some parallel)
- Integration: 1-2 hours
- Validation: 1-2 hours (5+ full game playthroughs)
- **Total: 16-20 hours**

## Risk Assessment

### High Risks

**Risk: Phase Transition Deadlocks**
- Impact: Game stuck in phase, cannot progress
- Mitigation: Implement phase timeouts, manual reset endpoint for testing, atomic database transactions, comprehensive logging at phase boundaries

**Risk: Night Phase Privacy Leaks**
- Impact: Villagers see Mafia coordination, game integrity destroyed
- Mitigation: Separate database table OR isPrivate flag with strict filtering, unit tests verify Villager context excludes Night messages, audit all message queries

**Risk: State Machine Complexity**
- Impact: Master orchestrator becomes difficult to debug/maintain (300+ lines)
- Mitigation: Extract helper functions, use clear switch statements, comprehensive phase boundary logging, state diagram documentation

### Medium Risks

**Risk: Vote Parsing Failures**
- Impact: Invalid votes disrupt voting phase
- Mitigation: Structured prompts with clear format, regex parsing with validation, fallback to random vote on parse failure, retry once with clarification

**Risk: Sequential Voting Performance**
- Impact: 8-12 sequential API calls takes 40-120 seconds
- Mitigation: 10-second timeouts per agent, parallelize context building (fetch once, reuse), batch UI updates every 3 votes

**Risk: State Catchup Race Conditions**
- Impact: Late-joining spectators see duplicated/out-of-order events
- Mitigation: Event ID-based deduplication, queue events during initial state fetch, idempotent event handlers

## Integration Strategy

**Phase Integration:**
- Master orchestrator calls existing Iteration 1 Discussion orchestrator during DISCUSSION phase
- No modifications to Iteration 1 code - pass additional context via dependencies if needed
- Night phase reuses 70-80% of Discussion orchestrator code (same turn scheduler, timeout handling)
- Voting phase adapts Discussion turn executor pattern

**Database Integration:**
- Add NightMessage table for private Mafia coordination
- Extend existing tables: Game (currentPhase, nightVictim), Player (eliminationType), Vote (phaseType, voteOrder)
- All changes are additive - no breaking changes to Iteration 1 schema

**Event Integration:**
- Extend event emitter with 6 new event types
- All phase orchestrators emit events via shared gameEventEmitter
- SSE endpoint subscribes to all event types and broadcasts to spectators

**Code Reuse Strategy:**
- Turn scheduler logic: Shared between Discussion, Night, Voting
- Timeout handling: Shared Promise.race pattern
- Event emission: Shared gameEventEmitter instance
- Cost tracking: Extended with phase field for per-phase breakdown

## Deployment Plan

**Development Environment:**
- Continue using Iteration 1 setup (Next.js dev server, SQLite local)
- Run full games via CLI test harness before UI testing

**Testing Strategy:**
- Unit tests: Win checker, vote tally, consensus algorithm, role assignment
- Integration tests: Full game loop CLI harness (3 rounds, all phases)
- Manual UI tests: 5+ full games with different player counts (8, 10, 12)

**Validation Criteria:**
- 5 consecutive full games complete without crashes
- Both win conditions triggered (Mafia wins at least once, Villagers win at least once)
- Agents reference previous rounds in later Discussions (memory test)
- Cost per game under $5 (verify prompt caching working)
- SSE delivers messages under 1 second latency

**Production Deployment:**
- Deploy to Vercel (or similar) after validation
- Environment variables: ANTHROPIC_API_KEY, DATABASE_URL
- Enable Prisma connection pooling for concurrent spectators
- Monitor: Token usage, API latency, game completion rate

## Builder Coordination

**Parallel Work Enabled:**
- Builder-1 (Master Orchestrator) creates skeleton with mocked phases
- Builders 2-4 implement phases in parallel after Builder-1 completes skeleton
- Builders 5-6 implement UI in parallel with game logic builders

**Integration Points:**
- Builder-1 defines phase orchestrator interfaces (contract-first)
- Builder-4 coordinates with Builder-1 on event types
- Builder-6 may split into 3 sub-builders if Live Game proves too complex

**Critical Dependencies:**
- Builder-2 (Night) and Builder-3 (Voting/Day/Win) depend on Builder-1 skeleton
- Builder-4 (API) depends on game logic being functional
- Builder-5/6 (UI) depend on API endpoints being available
- Integration builder validates all components work together

## Success Validation

**Technical Validation:**
- Run `npm run test-full-game` (CLI harness) - completes successfully
- Load test: 10 concurrent spectators via SSE - no crashes
- Database integrity: All foreign keys valid, no orphaned records
- Memory profiling: No memory leaks in 1-hour test

**Quality Validation:**
- Manual review of 5 full game transcripts
- Strategic voting: At least 70% of votes reference Discussion arguments
- Memory continuity: Agents reference earlier rounds (spot check 10 examples)
- UI responsiveness: Phase transitions visible within 1 second
- Error handling: Graceful degradation on API timeouts (test with artificial delays)

**Cost Validation:**
- Measure cost for 8, 10, 12 player games
- Verify prompt caching hit rate >70%
- Cost per game under $5 threshold
- Log token usage for all phases (Night, Discussion, Voting)

## Timeline Breakdown

**Phase 1: Foundation (Builder-1) - 4 hours**
- Master orchestrator skeleton with mocked phases
- Database migration (NightMessage table + field additions)
- Event type extensions
- Phase transition logic

**Phase 2: Game Logic (Builders 2-3, parallel) - 6-8 hours**
- Builder-2: Night phase orchestrator (3-4 hours)
- Builder-3: Voting + Day + Win checker (3-4 hours)

**Phase 3: API & UI (Builders 4-6, parallel) - 6-8 hours**
- Builder-4: API endpoints (2-3 hours)
- Builder-5: Lobby + Results screens (2-3 hours)
- Builder-6: Live Game screen (2-3 hours, may split into sub-builders)

**Phase 4: Integration - 1-2 hours**
- Replace mocked phases with real implementations
- End-to-end testing via CLI
- Bug fixes

**Phase 5: Validation - 1-2 hours**
- 5+ full game playthroughs
- Manual quality review
- Performance verification

## Post-Iteration Handoff

**Deliverables:**
- Fully functional game from lobby to results
- 4 planning documents (this overview + tech-stack + patterns + builder-tasks)
- Updated database schema with migrations
- 6 new API endpoints documented
- CLI test harness for full game loop
- 5+ recorded full game transcripts for review

**Known Limitations:**
- Random tie-breaking only (no revoting)
- Desktop-first UI (not mobile optimized)
- No threading visualization (basic "Replying to X" text only)
- No strategic pattern highlights
- Single game at a time (no concurrent games)

**Future Work (Iteration 3):**
- Advanced threading visualization
- Strategic pattern analysis
- Performance optimization (lazy loading, virtualized lists)
- Prompt engineering refinement
- Replay mode with timeline scrubbing
- Production monitoring and alerts
