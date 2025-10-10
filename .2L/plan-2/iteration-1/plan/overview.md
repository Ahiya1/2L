# 2L Iteration Plan - Core Observability System

## Project Vision

Make 2L orchestration visible and debuggable in real-time by implementing event emission throughout the system and providing a working dashboard with HTTP server for observing orchestration progress.

**The Problem:** Currently, developers cannot observe what's happening during orchestration. The dashboard infrastructure exists but shows no data because events aren't being emitted. This makes debugging difficult and the orchestration process feels like a black box.

**The Solution:** Implement event emission at all orchestration checkpoints (orchestrator + 10 agents), create dashboard commands with HTTP server support, and enable real-time visualization of orchestration progress.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] **Events are emitted**: `.2L/events.jsonl` file is created and populated during orchestration
- [ ] **Orchestrator lifecycle tracked**: All phase transitions (exploration, planning, building, integration, validation) emit `phase_change` events
- [ ] **Agent lifecycle tracked**: Every agent (all 10 types) emits exactly 2 events: `agent_start` and `agent_complete`
- [ ] **Dashboard command works**: `/2l-dashboard` finds available port (8080-8099), starts HTTP server, opens browser automatically
- [ ] **Dashboard displays events**: Open dashboard during orchestration and see real-time event timeline with phases and active agents
- [ ] **Multi-project support**: Can run dashboards for 2+ concurrent projects on different ports without conflicts
- [ ] **Event format validated**: All events follow schema: `{"timestamp":"ISO8601","event_type":"string","phase":"string","agent_id":"string","data":"string"}`
- [ ] **Graceful degradation**: System works even if event logger library is missing (backward compatibility maintained)

## MVP Scope

**In Scope:**

- Event System Foundation: Orchestrator event emission (plan_start, phase_change, iteration_start/complete, complexity_decision)
- Agent Event Integration: Add "Event Emission" sections to all 10 agent markdown files
- Dashboard Implementation: `/2l-dashboard` command with HTTP server, dynamic port allocation (8080-8099), browser opening
- Dashboard Access: `/2l-dashboard-stop` command, port reuse from config, multi-project support
- Orchestrator Documentation: Update `/2l-mvp.md` with all event emission points and payload examples
- Event Validation: End-to-end test of event emission, dashboard parsing, and display

**Out of Scope (Post-MVP):**

- Event analytics and aggregation (average times, failure rates)
- WebSocket real-time streaming (using polling for now)
- Event filtering in dashboard (by phase, agent, time range)
- Event replay functionality for debugging
- Historical event database across multiple orchestrations
- MCP verification tools (deferred to iteration 2)
- README comprehensive updates (deferred to iteration 2)
- GitHub CLI verification (deferred to iteration 2)

## Development Phases

1. **Exploration** ✅ Complete (2 explorers analyzed architecture, tech stack, dependencies)
2. **Planning** 🔄 Current (Creating comprehensive build plan)
3. **Building** ⏳ 6-8 hours (3 parallel builders)
4. **Integration** ⏳ 30 minutes (Minimal - builders work on isolated files)
5. **Validation** ⏳ 1 hour (End-to-end testing, event format validation)
6. **Deployment** ⏳ Immediate (Files deployed to ~/.claude/)

## Timeline Estimate

- **Exploration**: Complete (2 explorers, comprehensive analysis)
- **Planning**: Complete (this document)
- **Building**: 6-8 hours (3 builders working in parallel)
  - Builder-1 (Orchestrator Events): 1-2 hours
  - Builder-2 (Agent Templates): 2-3 hours
  - Builder-3 (Dashboard Commands): 3-4 hours
- **Integration**: 30 minutes (merge builder outputs, resolve conflicts)
- **Validation**: 1 hour (end-to-end testing, format validation)
- **Total**: ~8-10 hours wall time with parallel builders

## Risk Assessment

### High Risks

**None identified.** All infrastructure exists and is tested.

### Medium Risks

**Risk: Event format inconsistency across orchestrator and 10 agents**
- **Impact**: Dashboard parsing fails if event format varies
- **Likelihood**: MEDIUM (10+ files to update with identical format)
- **Mitigation**: Provide exact code templates in patterns.md, validation checks in testing phase, single builder handles all agent updates for consistency

**Risk: Orchestrator event placement at wrong workflow points**
- **Impact**: Events emitted at wrong times, confusing dashboard timeline
- **Likelihood**: MEDIUM (12+ insertion points in complex orchestrator file)
- **Mitigation**: Event points already documented in /2l-mvp.md with line numbers, builder follows documentation systematically, validation testing verifies event sequence

**Risk: Dashboard port conflicts in multi-project scenarios**
- **Impact**: Dashboard fails to start if all 20 ports (8080-8099) are occupied
- **Likelihood**: LOW (20 concurrent 2L projects unlikely)
- **Mitigation**: Port range provides 20 slots, config tracks which projects use which ports, /2l-dashboard-stop command frees ports, clear error message if exhausted

### Low Risks

**Risk: Browser file:// protocol fetch restrictions**
- **Impact**: Dashboard can't poll events.jsonl when opened via file:// in Safari/Firefox
- **Likelihood**: HIGH (known browser security restriction)
- **Mitigation**: HTTP server via /2l-dashboard command solves issue completely, documented workaround in dashboard footer as fallback

**Risk: Event file corruption from malformed JSON**
- **Impact**: Dashboard parsing fails
- **Likelihood**: VERY LOW (event logger has quote escaping)
- **Mitigation**: Event logger escapes quotes, dashboard uses try/catch on JSON.parse, skips malformed lines and continues parsing

## Integration Strategy

**Builder outputs are naturally isolated:**

- Builder-1 updates orchestrator documentation (commands/2l-mvp.md)
- Builder-2 updates 10 agent files (agents/*.md) - no conflicts between files
- Builder-3 creates 2 new commands (commands/2l-dashboard.md, commands/2l-dashboard-stop.md)

**No shared files, minimal merge conflicts.**

**Integration phase workflow:**

1. **File merge**: Copy all builder outputs to ~/.claude/ directory structure
2. **Validation checks**:
   - Verify all 10 agents have "Event Emission" section (grep check)
   - Verify orchestrator has EVENT_LOGGING_ENABLED guards (grep check)
   - Verify dashboard commands exist and have executable bash blocks
3. **End-to-end test**:
   - Run simple /2l-mvp orchestration
   - Verify .2L/events.jsonl created with events
   - Run /2l-dashboard command
   - Verify HTTP server starts and browser opens
   - Watch events populate in real-time
   - Run /2l-dashboard-stop to verify cleanup
4. **Format validation**:
   - Parse events.jsonl with jq to verify valid JSON
   - Check all events have required fields: timestamp, event_type, phase, agent_id, data
   - Verify event_type values match expected set

**Conflict resolution strategy:** None needed - builders work on isolated files.

## Deployment Plan

**Target environment:** ~/.claude/ directory (2L configuration home)

**Deployment steps:**

1. **Backup current state**: Copy ~/.claude/agents/ and ~/.claude/commands/ to .2L/backups/pre-iter1/
2. **Deploy agent updates**: Copy all 10 updated agent markdown files to ~/.claude/agents/
3. **Deploy orchestrator update**: Copy updated /2l-mvp.md to ~/.claude/commands/
4. **Deploy new commands**: Copy /2l-dashboard.md and /2l-dashboard-stop.md to ~/.claude/commands/
5. **Verify infrastructure**: Confirm ~/.claude/lib/2l-event-logger.sh and ~/.claude/lib/2l-dashboard-template.html exist
6. **Test deployment**: Run validation suite (see Integration Strategy)
7. **Rollback plan**: If validation fails, restore from .2L/backups/pre-iter1/

**Deployment validation:**

- All 13 files copied to correct locations
- No syntax errors in bash code blocks
- Event logger library accessible
- Dashboard template accessible
- /2l-dashboard command executable
- End-to-end test passes

**Post-deployment:**

- Document deployment in .2L/plan-2/iteration-1/deployment-log.md
- Create iteration-1-complete tag if all validation passes
- Prepare iteration 2 scope (MCP verification, README updates, GitHub CLI validation)
