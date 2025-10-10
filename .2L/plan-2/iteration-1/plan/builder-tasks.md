# Builder Task Breakdown

## Overview

**3 primary builders** will work in parallel on isolated file sets. No builder splitting expected - all tasks are LOW-MEDIUM complexity.

**Total estimated time:** 6-8 hours with parallel execution

**Builder assignment strategy:**
- Builder-1: Orchestrator event documentation (isolated work)
- Builder-2: Agent template updates (10 files, repetitive pattern)
- Builder-3: Dashboard commands (2 new files, isolated work)

**Dependencies:** Minimal cross-builder dependencies. All builders can start immediately.

---

## Builder-1: Orchestrator Event Documentation

### Scope

Document all event emission points in the `/2l-mvp.md` orchestrator command file. This is **documentation work** (adding comments and examples), not implementation (the orchestrator is a markdown file that describes how the orchestrator should work when executed as bash).

### Complexity Estimate

**MEDIUM**

This is documentation work on a large file (1576 lines) with 12+ insertion points. Requires careful reading of orchestrator workflow to identify correct event emission locations.

### Success Criteria

- [ ] All 12+ event emission points documented in `/2l-mvp.md`
- [ ] Each emission point has code example showing `log_2l_event` call with correct parameters
- [ ] Event types used: `plan_start`, `iteration_start`, `phase_change`, `complexity_decision`, `validation_result`, `iteration_complete`
- [ ] All event examples use backward compatibility guard: `if [ "$EVENT_LOGGING_ENABLED" = true ]`
- [ ] Event emission examples show correct phase names (exploration, planning, building, integration, validation)
- [ ] Documentation explains when each event is emitted and why
- [ ] Payload examples are descriptive and consistent

### Files to Create/Update

**Files to update:**
- `~/.claude/commands/2l-mvp.md` - Add event emission documentation throughout

**No new files.**

### Dependencies

**Depends on:** None (can start immediately)

**Blocks:** None (builders work on isolated files)

### Implementation Notes

**Event emission points identified by Explorer-1:**

The orchestrator already has documented event emission points with line numbers. Your job is to add detailed event emission examples at these locations:

1. **Initialization Events (Lines 110-177)**
   - `plan_start` - Level 1 (Full Autonomy): Line 111
   - `plan_start` - Level 2 (Vision Control): Line 149
   - `plan_start` - Level 3 (Full Control): Line 164
   - `plan_start` - Resume (IN_PROGRESS): Line 176

2. **Master Mode Events (Lines 302-378)**
   - `complexity_decision` - After determining num_explorers (Line 303)
   - `phase_change` - "Starting Master Exploration phase" (Line 312)
   - `agent_spawn` - For each master explorer (Line 347)
   - `agent_complete` - For each completed explorer (Line 375)
   - `phase_change` - "Starting Master Planning phase" (Line 386)

3. **Iteration Execution Events (Lines 516-934)**
   - `iteration_start` - At iteration beginning (Line 556)
   - `phase_change` - "Starting Exploration phase" (Line 564)
   - `agent_spawn` - For explorers (Lines 577, 599)
   - `agent_complete` - Explorers done (Lines 643-645)
   - `phase_change` - "Starting Planning phase" (Line 652)
   - `agent_spawn` - For planner (Line 665)
   - `agent_complete` - Planner done (Line 690)
   - `phase_change` - "Starting Building phase" (Line 698)
   - `agent_spawn` - For each builder (Line 718)
   - `phase_change` - "Starting Integration phase" (Line 778)
   - `phase_change` - "Starting Validation phase" (Line 897)
   - `validation_result` - Validation status (Line 934)
   - `phase_change` - "Starting Healing phase" (Line 947)
   - `iteration_complete` - After successful iteration (Line 517, 1132)

**Example documentation to add:**

```markdown
### Event Emission: Plan Start

At this point, emit a `plan_start` event to signal orchestration beginning:

```bash
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "plan_start" "Plan $PLAN_ID started in full autonomy mode" "initialization" "orchestrator"
fi
```
\```

**Important notes:**
- The `/2l-mvp.md` file is a command definition, not executable bash - it describes the orchestrator workflow
- Add documentation comments and code examples showing HOW to emit events
- Use the event logger initialization pattern from `patterns.md`
- All event examples must use the conditional guard pattern
- Event data field should be descriptive of what's happening

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use **Event Logger Initialization** pattern at orchestrator start
- Use **Orchestrator Event Emission** pattern for all event examples
- Follow **Event System Patterns** for event types and parameters
- Maintain **Graceful Degradation** - events are optional

### Testing Requirements

**Unit tests:**
- None (this is documentation work)

**Integration tests:**
- Validator will test actual orchestrator implementation follows this documentation
- Validator will verify all event types are emitted during real orchestration

**Coverage target:** 100% of documented event points

### Potential Split Strategy

**NO SPLIT RECOMMENDED.** Medium complexity task suitable for single builder.

If complexity proves higher than expected (unlikely), could split into:

**Foundation:** Update initialization and master mode events (first 400 lines)
- Lines 110-177: Initialization events
- Lines 302-378: Master mode events
- **Estimate:** 30-45 minutes

**Sub-builder 1A:** Update iteration execution events (exploration, planning, building phases)
- Lines 516-718: Exploration and planning phase events
- **Estimate:** 30-45 minutes

**Sub-builder 1B:** Update iteration execution events (integration, validation, healing phases)
- Lines 778-1132: Integration through completion events
- **Estimate:** 30-45 minutes

**BUT:** Splitting documentation work creates coordination overhead. Single builder is more efficient.

---

## Builder-2: Agent Event Emission Sections

### Scope

Add standardized "Event Emission" section to **10 agent markdown files**. Each agent needs identical section structure with customized agent ID and description.

### Complexity Estimate

**MEDIUM**

Repetitive work across 10 files. Pattern is simple but requires careful attention to detail for consistency. Incorrect agent IDs or phase names will break dashboard tracking.

### Success Criteria

- [ ] All 10 agent files have "Event Emission" section added
- [ ] Section inserted after "Available MCP Servers" and before "Your Process"
- [ ] Each agent has agent_start event example with correct agent ID
- [ ] Each agent has agent_complete event example with correct agent ID
- [ ] Agent IDs follow naming convention: `agent-type-number` (e.g., `explorer-1`, `builder-2`)
- [ ] Event emission examples use correct phase for each agent type
- [ ] All examples use graceful degradation pattern (check if library exists)
- [ ] Section includes notes about optional emission and backward compatibility
- [ ] Formatting is consistent across all 10 agents

### Files to Create/Update

**Files to update:**
- `~/.claude/agents/2l-builder.md`
- `~/.claude/agents/2l-explorer.md`
- `~/.claude/agents/2l-planner.md`
- `~/.claude/agents/2l-integrator.md`
- `~/.claude/agents/2l-iplanner.md`
- `~/.claude/agents/2l-ivalidator.md`
- `~/.claude/agents/2l-validator.md`
- `~/.claude/agents/2l-healer.md`
- `~/.claude/agents/2l-master-explorer.md`
- `~/.claude/agents/2l-dashboard-builder.md` - **NOTE:** Already complete, verify only

**No new files.**

### Dependencies

**Depends on:** None (can start immediately)

**Blocks:** None (isolated file updates)

### Implementation Notes

**Agent type to phase mapping:**
- `explorer` → phase: `exploration`
- `planner` → phase: `planning`
- `builder` → phase: `building`
- `integrator` → phase: `integration`
- `validator` → phase: `validation`
- `healer` → phase: `healing`
- `iplanner` → phase: `planning` (iteration planning)
- `ivalidator` → phase: `validation` (iteration validation)
- `master-explorer` → phase: `master-exploration`
- `dashboard-builder` → phase: `building` (but NO CHANGES needed - already complete)

**Agent ID format:**
- Numbered agents: `agent-type-number` (e.g., `explorer-1`, `builder-3`)
- Singleton agents: `agent-type` (e.g., `planner`, `integrator`, `validator`)
- Multi-iteration agents: `agent-type` (e.g., `iplanner`, `ivalidator`, `healer`)

**Template to use for each agent:**

Use the **Agent Markdown Event Emission Section** pattern from `patterns.md`. Customize:
- `{AGENT_TYPE}-{NUMBER}` → actual agent ID
- `{DESCRIPTION}` → agent-specific work description
- `{PHASE}` → correct phase for agent type

**Insertion point:**
- Find "Available MCP Servers" section
- Insert "Event Emission" section AFTER that section
- Insert BEFORE "Your Process" or "Your Mission" section

**Example customization for Explorer-1:**

```markdown
## Event Emission

You MUST emit exactly 2 events during your execution to enable orchestration observability.

### 1. Agent Start Event

**When:** Immediately after reading all input files, before beginning your work

**Purpose:** Signal the orchestrator that you have started processing

**Code:**
```bash
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  log_2l_event "agent_start" "Explorer-1: Starting architecture analysis" "exploration" "explorer-1"
fi
\```

[... continue with agent_complete event ...]
```

**Validation checklist for each agent:**
- [ ] Section inserted at correct location
- [ ] Agent ID matches filename (e.g., 2l-builder.md → builder agent)
- [ ] Phase is correct for agent type
- [ ] Event emission code is valid bash
- [ ] Library sourcing uses full path: `$HOME/.claude/lib/2l-event-logger.sh`
- [ ] Graceful degradation: checks if library file exists

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use **Agent Event Emission (In Markdown Files)** pattern for code examples
- Use **Agent Markdown Event Emission Section** pattern for full section template
- Follow **Event System Patterns** for event type names and parameter order
- Maintain **Graceful Degradation** throughout

### Testing Requirements

**Unit tests:**
- None (markdown documentation)

**Integration tests:**
- Validator will verify all 10 agents have section (grep check)
- Validator will run sample orchestration and verify agent events emitted

**Coverage target:** 100% (all 10 agents updated)

### Potential Split Strategy

**OPTIONAL SPLIT** if time-critical or parallelization beneficial:

**Foundation:** Create Event Emission template section (before splitting)
- Define template with placeholders
- Validate template structure
- **Estimate:** 15 minutes

**Primary Builder-2:** Update 5 agents
- 2l-builder.md
- 2l-explorer.md
- 2l-planner.md
- 2l-integrator.md
- 2l-iplanner.md
- **Estimate:** 45-60 minutes

**Sub-builder 2A:** Update remaining 5 agents
- 2l-ivalidator.md
- 2l-validator.md
- 2l-healer.md
- 2l-master-explorer.md
- 2l-dashboard-builder.md (verify only, no changes)
- **Estimate:** 45-60 minutes

**Integration:** Validator checks all 10 agents for consistency

**Recommendation:** Single builder is simpler. Only split if you want maximum parallelization.

---

## Builder-3: Dashboard Commands

### Scope

Create two new command files: `/2l-dashboard` (start dashboard HTTP server) and `/2l-dashboard-stop` (stop dashboard server). Implement port allocation, process management, and browser opening.

### Complexity Estimate

**MEDIUM-HIGH**

Most complex builder task. Involves process management, port allocation logic, platform-specific browser commands, and state persistence. Requires careful error handling and testing.

### Success Criteria

- [ ] `/2l-dashboard` command file created in `~/.claude/commands/`
- [ ] Command finds available port in range 8080-8099
- [ ] Port allocation uses `lsof` to check availability
- [ ] Python HTTP server starts in background serving `.2L/dashboard/` directory
- [ ] Server PID captured and stored in `.2L/dashboard/.server-pid`
- [ ] Server port stored in `.2L/dashboard/.server-port`
- [ ] Browser opens automatically to `http://localhost:{port}/index.html`
- [ ] Platform-specific browser opening (xdg-open on Linux, open on macOS)
- [ ] Port reuse: If server already running, reuse existing port and just open browser
- [ ] Clear error message if all 20 ports are occupied
- [ ] `/2l-dashboard-stop` command file created
- [ ] Stop command reads PID from file and kills process gracefully
- [ ] Stop command cleans up `.server-pid` and `.server-port` files
- [ ] Stop command handles case where server already stopped (no error)
- [ ] Both commands work with graceful degradation (clear error messages)

### Files to Create/Update

**Files to create:**
- `~/.claude/commands/2l-dashboard.md` - Dashboard server start command
- `~/.claude/commands/2l-dashboard-stop.md` - Dashboard server stop command

**Runtime files (auto-created):**
- `.2L/dashboard/.server-pid` - HTTP server process ID
- `.2L/dashboard/.server-port` - HTTP server port number

### Dependencies

**Depends on:** None (can start immediately)

**Blocks:** None (new files, no conflicts)

**Runtime dependencies:**
- Dashboard HTML must exist (command checks and spawns builder agent if missing)
- Python 3 must be installed (verified: python3 at /usr/bin/python3)
- `lsof` must be available (standard on Linux/macOS)

### Implementation Notes

**Command structure (markdown format):**

Both commands should follow 2L command pattern:
1. YAML frontmatter with command metadata
2. Description and usage instructions
3. Embedded bash script in code block

**Dashboard start workflow:**

```
1. Check if .2L/dashboard/index.html exists
   → If missing: Spawn 2l-dashboard-builder agent
   → Wait for generation to complete

2. Check if server already running (port/PID files exist and process running)
   → If yes: Reuse existing port, open browser, exit
   → If no: Continue to port allocation

3. Find available port (8080-8099)
   → Iterate through range
   → Use lsof to check if port listening
   → Take first available port

4. Start Python HTTP server
   → Command: python3 -m http.server $PORT --directory .2L/dashboard
   → Run in background (&)
   → Capture PID with $!
   → Redirect output to /dev/null

5. Store state
   → Write port to .2L/dashboard/.server-port
   → Write PID to .2L/dashboard/.server-pid

6. Open browser
   → Linux: xdg-open http://localhost:$PORT/index.html
   → macOS: open http://localhost:$PORT/index.html
   → Fallback: Print URL for manual opening

7. Show confirmation
   → "Dashboard started on port $PORT (PID: $PID)"
   → "Opening browser to http://localhost:$PORT/index.html"
```

**Dashboard stop workflow:**

```
1. Check if PID file exists
   → If missing: "No dashboard server found", exit 0

2. Read PID from file
   → Read .2L/dashboard/.server-pid

3. Check if process still running
   → Use: ps -p $PID > /dev/null 2>&1
   → If running: kill $PID
   → If not: "Server already stopped"

4. Clean up state files
   → rm .2L/dashboard/.server-pid
   → rm .2L/dashboard/.server-port

5. Show confirmation
   → "Dashboard server stopped (PID: $PID)"
   → "Port $PORT is now available"
```

**Error handling:**

- **All ports occupied:** Clear error with resolution steps
- **Python not available:** Check with `command -v python3`, show install instructions
- **Dashboard HTML missing:** Spawn builder agent, handle spawn failures
- **PID file exists but process dead:** Clean up stale files, continue normally
- **Permission issues:** Show clear error (e.g., can't write to .2L/dashboard/)

**Multi-project support:**

Each project has its own:
- `.2L/dashboard/` directory
- `.server-pid` and `.server-port` files
- HTTP server process on unique port

Port range 8080-8099 provides 20 concurrent project dashboards system-wide.

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use **Dashboard Server Start** pattern for `/2l-dashboard` implementation
- Use **Dashboard Server Stop** pattern for `/2l-dashboard-stop` implementation
- Use **Port Reuse (Enhancement)** pattern for checking existing server
- Follow **Error Handling Patterns** for graceful degradation
- Use **Code Quality Standards** for bash quoting and error checking

### Testing Requirements

**Unit tests:**
- Port availability checking (lsof command works)
- PID file read/write
- Port file read/write
- Process verification (ps -p command)

**Integration tests:**
- Start dashboard → verify server running
- Start dashboard twice → verify port reuse
- Stop dashboard → verify process killed and files cleaned
- Start on all 20 ports → verify error message on 21st
- Dashboard HTML missing → verify builder agent spawned

**Coverage target:** 100% of error paths tested

### Potential Split Strategy

**NO SPLIT RECOMMENDED** unless complexity proves higher than expected.

This is cohesive work - start and stop commands are tightly coupled (share state files and patterns). Splitting would create coordination overhead.

If absolutely necessary to split:

**Foundation:** Create `/2l-dashboard` start command
- Port allocation logic
- HTTP server startup
- State file management
- Browser opening
- **Estimate:** 2-3 hours

**Sub-builder 3A:** Create `/2l-dashboard-stop` stop command
- PID reading
- Process termination
- State cleanup
- **Estimate:** 45-60 minutes

**Integration:** Test start/stop lifecycle together

**Recommendation:** Keep together. Single builder ensures consistency in state file format and error handling.

---

## Builder Execution Order

### Parallel Group 1 (No dependencies - START IMMEDIATELY)

All builders can start in parallel:
- **Builder-1** (Orchestrator Documentation)
- **Builder-2** (Agent Templates)
- **Builder-3** (Dashboard Commands)

**No dependencies between builders.**

### Integration Phase (After all builders complete)

**Integration tasks:**

1. **File Collection**
   - Gather all updated/created files from builders
   - Verify file counts: 1 updated orchestrator + 10 updated agents + 2 new commands = 13 files

2. **Consistency Validation**
   - Verify all 10 agents have "Event Emission" section (grep check)
   - Verify orchestrator has event documentation at all expected points
   - Verify dashboard commands exist and are properly formatted

3. **Merge to ~/.claude/**
   - Backup current state: `cp -r ~/.claude/agents ~/.claude/commands .2L/backups/pre-iter1/`
   - Copy updated agents to `~/.claude/agents/`
   - Copy updated orchestrator to `~/.claude/commands/`
   - Copy new dashboard commands to `~/.claude/commands/`

4. **End-to-End Testing**
   - Run simple orchestration: `/2l-mvp "test project"`
   - Verify `.2L/events.jsonl` created with events
   - Run `/2l-dashboard`
   - Verify HTTP server starts and browser opens
   - Watch events populate in dashboard
   - Run `/2l-dashboard-stop`
   - Verify cleanup successful

5. **Format Validation**
   - Parse events.jsonl with jq: `jq . .2L/events.jsonl`
   - Verify all events have required fields
   - Check event types are from standardized set
   - Verify agent IDs match expected format

**Estimated integration time:** 30-60 minutes

### Validation Phase (After integration)

**Validation checklist:**

- [ ] Events emitted during orchestration (.2L/events.jsonl exists and populated)
- [ ] All event types present: plan_start, iteration_start, phase_change, agent_start, agent_complete, iteration_complete
- [ ] Event format valid: All events pass jq validation
- [ ] All required fields present: timestamp, event_type, phase, agent_id, data
- [ ] Dashboard command works: Server starts, browser opens
- [ ] Dashboard displays events: Timeline visible, agents tracked, metrics shown
- [ ] Multi-project test: Two concurrent dashboards on different ports
- [ ] Dashboard stop works: Process killed, files cleaned up
- [ ] Port reuse works: Second `/2l-dashboard` reuses existing port
- [ ] Graceful degradation: System works if event logger missing
- [ ] Documentation complete: All 13 files properly updated/created

**Estimated validation time:** 1 hour

---

## Integration Notes

**Potential conflict areas:** NONE

Builders work on completely isolated files:
- Builder-1: Single file (2l-mvp.md)
- Builder-2: 10 agent files (no overlap)
- Builder-3: 2 new files (no existing files)

**Shared dependencies:** Event logger library and dashboard template (both read-only, no modifications)

**Coordination requirements:** MINIMAL

Only coordination needed:
- Consistent event types across all builders (standardized list in patterns.md)
- Consistent agent ID format (patterns.md defines this)
- Consistent event schema (patterns.md documents this)

**Integration testing order:**

1. Test event logger library (verify it exists and works)
2. Test orchestrator documentation (manually review for completeness)
3. Test agent sections (grep for "Event Emission" in all 10 files)
4. Test dashboard commands (unit tests for port finding, PID management)
5. Test end-to-end (full orchestration with dashboard open)

---

## Success Metrics

**Code metrics:**
- 13 files updated/created (1 orchestrator + 10 agents + 2 commands)
- 0 syntax errors in bash code blocks
- 100% of agents have Event Emission section
- 100% of orchestrator event points documented

**Functional metrics:**
- Events emitted during test orchestration
- Dashboard displays events in real-time
- Multi-project dashboards work concurrently
- Port allocation and cleanup work correctly

**Quality metrics:**
- All event types from standardized list
- All events have required fields
- All bash code follows quoting conventions
- All error cases have clear messages

**Time metrics:**
- Building phase: 6-8 hours (target)
- Integration phase: 30-60 minutes (target)
- Validation phase: 1 hour (target)
- Total: 8-10 hours (target)

---

## Risk Mitigation

**Risk: Event format inconsistency**
- **Mitigation:** Single builder (Builder-2) handles all agent updates for consistency
- **Validation:** Automated format checking during integration

**Risk: Dashboard command complexity**
- **Mitigation:** Comprehensive patterns.md with working code examples
- **Validation:** Thorough unit and integration testing in validation phase

**Risk: Port conflicts**
- **Mitigation:** 20-port range, clear error messages, port reuse logic
- **Validation:** Multi-project test during validation phase

**Risk: Stale state files**
- **Mitigation:** Dashboard stop command cleans up, start command checks process still running
- **Validation:** Test orphaned PID file handling

**Risk: Platform-specific issues**
- **Mitigation:** Platform detection for browser opening, fallback to manual URL
- **Validation:** Test on both Linux and macOS if possible (at minimum, Linux)

---

**Builder tasks defined. Ready for builder execution phase.**
