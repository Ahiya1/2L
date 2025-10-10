# Explorer 1 Report: Architecture & Structure

## Executive Summary

The 2L event system architecture is already 90% implemented but requires integration wiring. The event logger library (`2l-event-logger.sh`) exists and is functional, the dashboard template is complete and self-contained, and the orchestrator (`/2l-mvp.md`) has documented event emission points. The primary work is **coordination not creation** - adding event emission calls at orchestrator checkpoints and standardizing agent event patterns across 10 agent files.

**Key findings:**
- Event infrastructure is production-ready (library + template)
- Orchestrator has 12+ documented event emission points needing implementation
- Agent architecture follows consistent markdown structure - adding Event Emission sections is straightforward pattern replication
- Dashboard is static HTML with JavaScript polling - no server-side complexity
- File modification scope: 10 agents + 1 orchestrator + 1 new command = 12 files

## Discoveries

### Current Event System Architecture

**Event Logger Library (`~/.claude/lib/2l-event-logger.sh`)**
- **Status:** Complete and production-ready
- **Function signature:** `log_2l_event "event_type" "data" "phase" "agent_id"`
- **Output format:** JSONL (JSON Lines) appended to `.2L/events.jsonl`
- **Event schema:** 
  ```json
  {
    "timestamp": "2025-10-08T14:37:00Z",
    "event_type": "plan_start",
    "phase": "exploration", 
    "agent_id": "orchestrator",
    "data": "Plan plan-2 started"
  }
  ```
- **Safety features:**
  - Atomic append operations (thread-safe)
  - Fails silently on errors (doesn't crash orchestration)
  - Auto-creates `.2L/` directory if missing
  - Quote escaping for JSON safety

**Dashboard Template (`~/.claude/lib/2l-dashboard-template.html`)**
- **Status:** Complete, 481 lines of self-contained HTML/CSS/JS
- **Architecture:** Static single-page application
  - No external dependencies (no CDN, no npm packages)
  - Inline CSS (GitHub dark theme styling)
  - Inline JavaScript (ES6, uses fetch API)
- **Dynamic features:**
  - Polls `events.jsonl` every 2 seconds via `fetch()`
  - Parses JSONL incrementally (only new lines)
  - Real-time metrics: elapsed time, total events, active agents
  - Event log displays last 50 events with color coding
  - Active agent tracking with duration calculation
- **Placeholder system:**
  - `{PROJECT_NAME}` - replaced with directory name
  - `{EVENTS_PATH}` - relative path to events file (`../events.jsonl`)
  - `{TIMESTAMP}` - generation timestamp
- **Browser compatibility:** Chrome 42+, Firefox 39+, Safari 10.1+ (with `file://` fetch caveat)

**Dashboard Builder Agent (`~/.claude/agents/2l-dashboard-builder.md`)**
- **Status:** Complete agent definition (173 lines)
- **Purpose:** Reads template, replaces placeholders, writes to `.2L/dashboard/index.html`
- **Invocation:** Can be spawned via Task tool
- **Output:** Self-contained HTML at `.2L/dashboard/index.html`
- **Limitation:** Only creates dashboard file - doesn't serve it

### Orchestrator Event Emission Points

**Analyzed `/2l-mvp.md` (1576 lines)**

The orchestrator documentation already specifies 12+ event emission points with exact locations and payload examples:

1. **Initialization Events (Lines 110-177)**
   - `plan_start` - Level 1 (Full Autonomy): Line 111
   - `plan_start` - Level 2 (Vision Control): Line 149
   - `plan_start` - Level 3 (Full Control): Line 164
   - `plan_start` - Resume (IN_PROGRESS): Line 176

2. **Master Mode Events (Lines 302-378)**
   - `complexity_decision` - Line 303 (after determining num_explorers)
   - `phase_change` - Line 312 ("Starting Master Exploration phase")
   - `agent_spawn` - Line 347 (for each master explorer)
   - `agent_complete` - Line 375 (for each completed explorer)
   - `phase_change` - Line 386 ("Starting Master Planning phase")

3. **Iteration Execution Events (Lines 516-934)**
   - `iteration_complete` - Line 517 (successful iteration)
   - `iteration_start` - Line 556 (at iteration beginning)
   - `phase_change` - Line 564 ("Starting Exploration phase")
   - `agent_spawn` - Lines 577, 599 (explorers)
   - `agent_complete` - Lines 643-645 (explorers done)
   - `phase_change` - Line 652 ("Starting Planning phase")
   - `agent_spawn` - Line 665 (planner)
   - `agent_complete` - Line 690 (planner done)
   - `phase_change` - Line 698 ("Starting Building phase")
   - `agent_spawn` - Line 718 (for each builder)
   - `phase_change` - Line 778 ("Starting Integration phase")
   - `phase_change` - Line 897 ("Starting Validation phase")
   - `validation_result` - Line 934 (validation status)
   - `phase_change` - Line 947 ("Starting Healing phase")
   - `iteration_complete` - Line 1132 (after successful healing)

**Pattern discovered:** All event calls follow bash conditional:
```bash
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "event_type" "data" "phase" "agent_id"
fi
```

**Implementation status:** Documentation exists, calls need to be added to actual orchestrator implementation

### Agent Architecture Analysis

**Examined 10 agent files in `~/.claude/agents/`:**

All agents follow consistent structure:
1. YAML frontmatter (name, description, tools)
2. Mission statement
3. Available MCP Servers section
4. Process/Workflow section (numbered steps)
5. Output/Report requirements

**Current event emission status:**
- **0 out of 10 agents** have "Event Emission" sections
- All agents execute via Task tool spawning
- Agents have clear workflow entry/exit points for events:
  - **Entry point:** After reading context files, before actual work
  - **Exit point:** After completing work, before writing report

**Agent workflow consistency:**
- All agents read input from `.2L/` directories
- All agents write output reports to `.2L/` directories  
- All agents have defined "Your Process" sections with clear steps
- All agents already handle MCP unavailability gracefully

**Optimal insertion point for Event Emission section:**
After "MCP Availability Handling" (if present) or after "Available MCP Servers", before "Your Process"

### Dashboard Command Requirements

**Current state:**
- No `/2l-dashboard` command exists
- No dashboard server infrastructure
- Dashboard HTML can be opened via `file://` but has `fetch()` limitations in some browsers

**Required architecture for `/2l-dashboard` command:**

```
Command flow:
1. Check if dashboard HTML exists → spawn dashboard-builder if missing
2. Start Python HTTP server in .2L/dashboard/ directory
3. Allocate port (8080-8099, find available)
4. Store port in .2L/config.yaml (for reuse and multi-project support)
5. Open browser to http://localhost:{port}/index.html
6. Keep server running in background
7. Store PID for shutdown

Supporting command: /2l-dashboard-stop
1. Read port from config.yaml
2. Find process by PID or port
3. Kill server gracefully
4. Clean up config entry
```

**Multi-project consideration:**
- Each project gets unique port (8080-8099 = 20 concurrent dashboards)
- Port stored in project-specific `.2L/config.yaml`
- Dashboard polls project-specific `.2L/events.jsonl`

### File Structure Mapping

**Files requiring modification:**

**Category 1: Agent Markdown Files (10 files)**
Location: `~/.claude/agents/`
- `2l-builder.md` (12,385 bytes)
- `2l-explorer.md` (8,495 bytes)
- `2l-planner.md` (10,740 bytes)
- `2l-integrator.md` (14,949 bytes)
- `2l-iplanner.md` (12,971 bytes)
- `2l-ivalidator.md` (22,235 bytes)
- `2l-validator.md` (23,956 bytes)
- `2l-healer.md` (16,467 bytes)
- `2l-master-explorer.md` (19,189 bytes)
- `2l-dashboard-builder.md` (5,495 bytes) - already complete, no changes needed

**Category 2: Orchestrator Documentation (1 file)**
Location: `~/.claude/commands/`
- `2l-mvp.md` (48,061 bytes) - Add event emission examples to existing documented points

**Category 3: New Commands (2 files)**
Location: `~/.claude/commands/`
- `2l-dashboard.md` (new) - Dashboard server start command
- `2l-dashboard-stop.md` (new) - Dashboard server stop command

**Category 4: Library (no changes)**
- `~/.claude/lib/2l-event-logger.sh` - Already complete
- `~/.claude/lib/2l-dashboard-template.html` - Already complete

**Total modification scope:** 10 agent files + 1 orchestrator + 2 new commands = 13 files

## Patterns Identified

### Pattern 1: Agent Event Emission Standard

**Description:** Two-event lifecycle for all agents (start + complete)

**Use Case:** Every agent invocation (explorers, planners, builders, integrators, validators, healers)

**Example:**
```markdown
## Event Emission

You MUST emit exactly 2 events during your execution:

### 1. Agent Start Event
**When:** Immediately after reading all input files, before beginning work
**Purpose:** Signal orchestrator that you've started processing

```bash
# Source event logger if available
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  
  # Emit agent_start event
  log_2l_event "agent_start" "Explorer-1: Starting architecture analysis" "exploration" "explorer-1"
fi
```

### 2. Agent Complete Event  
**When:** After finishing all work, immediately before writing final report
**Purpose:** Signal orchestrator that you've completed successfully

```bash
# Emit agent_complete event
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  
  log_2l_event "agent_complete" "Explorer-1: Architecture analysis complete" "exploration" "explorer-1"
fi
```

**Important:** Event emission is optional (fails gracefully if library unavailable). Never block your work due to event logging issues.
```

**Recommendation:** Use this exact pattern for all 10 agents (only change: agent_id and description)

### Pattern 2: Orchestrator Event Emission Guards

**Description:** Conditional event emission with backward compatibility

**Use Case:** All orchestrator event emission points

**Example:**
```bash
# Initialize event logging (at orchestrator start)
EVENT_LOGGING_ENABLED=false
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  EVENT_LOGGING_ENABLED=true
fi

# Later, at each emission point:
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "phase_change" "Starting Exploration phase" "exploration" "orchestrator"
fi
```

**Recommendation:** Apply this guard pattern at all 12+ orchestrator event points documented in `/2l-mvp.md`

### Pattern 3: Dashboard Placeholder Replacement

**Description:** Simple string replacement for template customization

**Use Case:** Dashboard builder agent (already implemented in `2l-dashboard-builder.md`)

**Example:**
```bash
PROJECT_NAME=$(basename "$(pwd)")
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Read template
template=$(cat ~/.claude/lib/2l-dashboard-template.html)

# Replace placeholders
dashboard="${template//\{PROJECT_NAME\}/$PROJECT_NAME}"
dashboard="${dashboard//\{EVENTS_PATH\}/..\/events.jsonl}"
dashboard="${dashboard//\{TIMESTAMP\}/$TIMESTAMP}"

# Write output
mkdir -p .2L/dashboard
echo "$dashboard" > .2L/dashboard/index.html
```

**Recommendation:** Pattern already implemented correctly in existing agent

### Pattern 4: Port Allocation Strategy

**Description:** Dynamic port finding with config persistence

**Use Case:** `/2l-dashboard` command for multi-project support

**Example:**
```bash
# Find available port in range 8080-8099
for port in {8080..8099}; do
  if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    DASHBOARD_PORT=$port
    break
  fi
done

# Store in project config
yq eval ".dashboard.port = $DASHBOARD_PORT" -i .2L/config.yaml
yq eval ".dashboard.pid = $SERVER_PID" -i .2L/config.yaml

# Reuse on subsequent runs
STORED_PORT=$(yq eval '.dashboard.port // ""' .2L/config.yaml)
if [ -n "$STORED_PORT" ] && ! lsof -Pi :$STORED_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  # Port available, reuse it
  DASHBOARD_PORT=$STORED_PORT
fi
```

**Recommendation:** Use this pattern in new `/2l-dashboard` command for reliable multi-project dashboard support

## Complexity Assessment

### High Complexity Areas

**None** - This iteration has no high-complexity features. All components already exist.

### Medium Complexity Areas

**1. Orchestrator Event Integration (Builder split: NO)**
- **What:** Add 12+ event emission calls to orchestrator implementation
- **Complexity factors:**
  - Events already documented in `/2l-mvp.md` with exact line numbers
  - Need to translate documentation to actual implementation
  - Must maintain backward compatibility (EVENT_LOGGING_ENABLED guards)
- **Builder assignment:** Single builder can handle this (documentation → implementation mapping)
- **Estimated time:** 1-2 hours

**2. Agent Event Standardization (Builder split: POSSIBLE if >6 agents)**
- **What:** Add identical "Event Emission" section to 10 agent markdown files
- **Complexity factors:**
  - Highly repetitive work (same pattern, different agent IDs)
  - Need to find optimal insertion point in each agent (after MCP section)
  - Must preserve existing agent structure
- **Builder assignment:** Single builder for 6 agents, split if more efficient
- **Estimated time:** 30-60 minutes for all 10 agents

**3. Dashboard Command Implementation (Builder split: NO)**
- **What:** Create `/2l-dashboard` and `/2l-dashboard-stop` commands
- **Complexity factors:**
  - Port allocation logic with conflict detection
  - Config.yaml updates for port persistence
  - Python HTTP server management (start/stop/PID tracking)
  - Browser opening (cross-platform: Linux/macOS)
- **Builder assignment:** Single builder (commands are small, 100-150 lines each)
- **Estimated time:** 1-2 hours

### Low Complexity Areas

**1. Dashboard Builder Verification (Builder split: NO)**
- **What:** Verify `2l-dashboard-builder.md` agent works correctly
- **Complexity:** Pattern replacement only, agent already complete
- **Estimated time:** 15-30 minutes (testing)

**2. Event Validation Testing (Builder split: NO)**
- **What:** End-to-end test of event emission → dashboard display
- **Complexity:** Run orchestrator, verify events appear in dashboard
- **Estimated time:** 30 minutes (validation phase)

## Technology Recommendations

### Primary Stack

**Event Logging:**
- **Choice:** Bash functions with JSONL output
- **Rationale:**
  - Already implemented and tested (`2l-event-logger.sh`)
  - JSONL is simple, append-only, parsing-friendly
  - Bash functions integrate seamlessly with orchestrator
  - No external dependencies

**Dashboard:**
- **Choice:** Static HTML/CSS/JavaScript (ES6)
- **Rationale:**
  - Template already complete and tested
  - No build step, no npm packages, no complexity
  - Works offline, no server required (with `file://` caveats)
  - Polling architecture is simple and robust

**Dashboard Server:**
- **Choice:** Python built-in HTTP server (`python3 -m http.server`)
- **Rationale:**
  - Pre-installed on all Linux/macOS systems
  - Zero dependencies
  - Simple to start/stop via bash
  - Sufficient for local development dashboard

**Config Storage:**
- **Choice:** YAML (continue using existing `.2L/config.yaml`)
- **Rationale:**
  - Already in use throughout 2L system
  - `yq` tool available for CLI manipulation
  - Human-readable for debugging

### Supporting Libraries

**None required** - All infrastructure exists:
- Event logger: `~/.claude/lib/2l-event-logger.sh`
- Dashboard template: `~/.claude/lib/2l-dashboard-template.html`
- Dashboard builder: `~/.claude/agents/2l-dashboard-builder.md`

## Integration Points

### Internal Integrations

**Orchestrator ↔ Event Logger**
- **How they connect:** Orchestrator sources `2l-event-logger.sh` and calls `log_2l_event()` at checkpoints
- **Data flow:** Orchestrator → Event Logger → `.2L/events.jsonl` file
- **Integration complexity:** LOW (simple function calls)

**Agents ↔ Event Logger**
- **How they connect:** Agents source library and emit start/complete events
- **Data flow:** Agent → Event Logger → `.2L/events.jsonl` file (same as orchestrator)
- **Integration complexity:** LOW (identical pattern across all agents)

**Dashboard ↔ Events File**
- **How they connect:** JavaScript `fetch()` polls `events.jsonl` every 2 seconds
- **Data flow:** Events file → Dashboard (read-only, incremental parsing)
- **Integration complexity:** LOW (already implemented in template)

**Dashboard Command ↔ Config**
- **How they connect:** Command reads/writes port and PID to `.2L/config.yaml`
- **Data flow:** Bidirectional (read port on start, write port/PID on allocation)
- **Integration complexity:** LOW (simple YAML key updates)

### External APIs

**None** - This iteration is entirely self-contained infrastructure work. No external API integrations required.

## Risks & Challenges

### Technical Risks

**Risk 1: Browser `file://` Protocol Fetch Restrictions**
- **Impact:** Safari and some Firefox configs block `fetch()` on `file://` URLs
- **Likelihood:** HIGH (known browser security restriction)
- **Mitigation:**
  - Primary: Use HTTP server via `/2l-dashboard` command (solves issue)
  - Fallback: Document workaround in dashboard footer
  - Already documented in `2l-dashboard-builder.md` lines 162-168

**Risk 2: Port Conflicts in Multi-Project Scenarios**
- **Impact:** If 20+ projects open dashboards, ports 8080-8099 exhausted
- **Likelihood:** LOW (20 concurrent 2L projects unlikely)
- **Mitigation:**
  - Port range 8080-8099 = 20 slots
  - Config tracks which projects use which ports
  - `/2l-dashboard-stop` frees up ports
  - Clear error message if all ports taken

**Risk 3: Event File Corruption (Malformed JSON)**
- **Impact:** Dashboard parsing fails, events stop displaying
- **Likelihood:** VERY LOW (event logger escapes quotes)
- **Mitigation:**
  - Event logger already has quote escaping (line 38-41 of `2l-event-logger.sh`)
  - Dashboard uses try/catch on JSON.parse (line 458-463 of template)
  - Dashboard skips malformed lines, continues parsing

### Complexity Risks

**Risk 1: Agent File Updates Are Repetitive**
- **Likelihood:** CERTAIN (10 identical updates)
- **Mitigation:**
  - Builder can create Event Emission template once
  - Apply template to all 10 agents via systematic editing
  - Validation: grep for "Event Emission" section in all agent files

**Risk 2: Orchestrator Event Points Scattered Across Large File**
- **Likelihood:** CERTAIN (1576-line file, 12+ insertion points)
- **Mitigation:**
  - Event points already documented with line numbers in `/2l-mvp.md`
  - Builder follows documentation systematically
  - Use grep to verify all EVENT_LOGGING_ENABLED checks added

## Recommendations for Planner

### 1. Single-Builder Strategy for Agent Updates
**Rationale:** All 10 agents need identical Event Emission section. Repetitive work benefits from single-builder consistency rather than parallel execution with merge conflicts.

**Approach:**
- Builder-1: Add Event Emission section to all 10 agents systematically
- Use template-based approach (define pattern once, apply 10 times)
- Validation: Automated check that all agents have section

**Alternative (if time-critical):** Split into Builder-1 (5 agents) + Builder-1A (5 agents), but coordination overhead may negate speed gain.

### 2. Orchestrator Events as Priority Foundation
**Rationale:** Dashboard is useless without events. Orchestrator events provide immediate value (can test with `cat .2L/events.jsonl` even before dashboard works).

**Recommended build order:**
1. Builder-1: Implement orchestrator event emission
2. Builder-2: Update agent markdown files  
3. Builder-3: Implement dashboard commands
4. Integration: Verify end-to-end event flow

### 3. Defer Dashboard Builder Spawning
**Rationale:** The `2l-dashboard-builder.md` agent already exists and is complete. Dashboard creation is on-demand (when user runs `/2l-dashboard`).

**Approach:**
- No builder work needed for dashboard-builder agent
- Dashboard command spawns dashboard-builder agent if HTML missing
- Focus builder effort on orchestrator + agent updates

### 4. Test Strategy: Incremental Validation
**Rationale:** Event system has multiple integration points. Test each layer independently.

**Recommended test sequence:**
1. After Builder-1: Test orchestrator events (`tail -f .2L/events.jsonl` during `/2l-mvp` run)
2. After Builder-2: Test agent events (verify agent_start/agent_complete appear)
3. After Builder-3: Test dashboard command (HTTP server starts, browser opens)
4. Final validation: Full orchestration with dashboard open in browser

### 5. Documentation Embedding in Commands
**Rationale:** Users need to know dashboard commands exist and how to use them.

**Approach:**
- Update `/2l-status` command to show dashboard URL if server running
- Update `/2l-mvp` orchestrator to mention dashboard at completion
- Add dashboard commands to README under "Commands" section

### 6. Backward Compatibility is Critical
**Rationale:** Event logging is new. Existing 2L installations may not have library yet.

**Mandatory pattern:**
```bash
# All event emission must be guarded
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event ...
fi
```

**Validation:** grep all event calls to ensure guards present

## Resource Map

### Critical Files/Directories

**Event Infrastructure:**
- `~/.claude/lib/2l-event-logger.sh` - Event logging library (COMPLETE)
- `~/.claude/lib/2l-dashboard-template.html` - Dashboard HTML template (COMPLETE)
- `~/.claude/agents/2l-dashboard-builder.md` - Dashboard generator agent (COMPLETE)

**Orchestrator:**
- `~/.claude/commands/2l-mvp.md` - Main orchestrator (NEEDS: event emission implementation)

**Agents (all need Event Emission section):**
- `~/.claude/agents/2l-builder.md`
- `~/.claude/agents/2l-explorer.md`
- `~/.claude/agents/2l-planner.md`
- `~/.claude/agents/2l-integrator.md`
- `~/.claude/agents/2l-iplanner.md`
- `~/.claude/agents/2l-ivalidator.md`
- `~/.claude/agents/2l-validator.md`
- `~/.claude/agents/2l-healer.md`
- `~/.claude/agents/2l-master-explorer.md`

**New Commands (to be created):**
- `~/.claude/commands/2l-dashboard.md`
- `~/.claude/commands/2l-dashboard-stop.md`

**Runtime Output:**
- `.2L/events.jsonl` - Event stream (created by event logger)
- `.2L/dashboard/index.html` - Project dashboard (created by dashboard-builder agent)
- `.2L/config.yaml` - Dashboard port/PID storage (updated by dashboard command)

### Key Dependencies

**System Dependencies:**
- `bash` or `zsh` - Shell for orchestrator and event logger
- `python3` - HTTP server for dashboard serving (`python3 -m http.server`)
- `yq` - YAML manipulation for config updates (already used in 2L)
- `lsof` - Port availability checking (standard on Linux/macOS)

**2L Internal Dependencies:**
- Event logger must exist for any events to work
- Dashboard template must exist for dashboard-builder to work
- Dashboard-builder agent must run before dashboard command opens browser

**Dependency order:**
1. Event logger (already exists)
2. Dashboard template (already exists)
3. Orchestrator event implementation (Builder-1)
4. Agent event sections (Builder-2)
5. Dashboard commands (Builder-3)
6. End-to-end testing (Validator)

### Testing Infrastructure

**Manual Testing:**
- `tail -f .2L/events.jsonl` - Monitor events in real-time during orchestration
- `python3 -m http.server 8080` - Manually start server to test dashboard
- `lsof -i :8080` - Check if port is in use

**Automated Testing (Validator phase):**
- Run `/2l-mvp` on simple project → verify events.jsonl populated
- Check event format: `jq . .2L/events.jsonl` (validate JSON)
- Count event types: `grep -o '"event_type":"[^"]*"' .2L/events.jsonl | sort | uniq -c`
- Verify dashboard: `curl http://localhost:8080/index.html` (check HTTP 200)

**End-to-End Test:**
1. Create new 2L project: `/2l-mvp "simple test"`
2. During execution, run: `/2l-dashboard`
3. Verify browser opens with dashboard
4. Watch events populate in real-time
5. After completion, run: `/2l-dashboard-stop`
6. Verify server stopped, port freed

## Questions for Planner

### Q1: Should agent event emission be mandatory or optional?
**Context:** Current recommendation is optional (fails gracefully). This means 2L works even if event logger is missing.

**Options:**
- A) Optional (recommended): Backward compatible, no breaking changes
- B) Mandatory: Simpler code (no guards), but breaks old 2L installs

**Recommendation:** Optional - matches 2L philosophy of graceful degradation

### Q2: Should `/2l-dashboard` auto-start on every `/2l-mvp` run?
**Context:** Currently proposed as manual command. Could auto-start dashboard when orchestration begins.

**Options:**
- A) Manual command only (proposed): User controls when dashboard opens
- B) Auto-start with opt-out flag: Automatic unless `--no-dashboard` flag
- C) Auto-start always: Dashboard opens on every orchestration

**Recommendation:** Manual (A) for now, can add auto-start in iteration 2 based on user feedback

### Q3: Should dashboard support historical event viewing across orchestrations?
**Context:** Currently `.2L/events.jsonl` is append-only across multiple orchestrations. Dashboard shows all events.

**Options:**
- A) Keep append-only: Dashboard shows full history (proposed)
- B) Clear events on new orchestration: Only current orchestration visible
- C) Archive per iteration: `.2L/iteration-N/events.jsonl` separate files

**Recommendation:** Keep append-only (A) - simplest, user can manually clear file if desired

### Q4: What happens if dashboard port range (8080-8099) is exhausted?
**Context:** 20-port limit could be exceeded if user has 21+ concurrent 2L projects.

**Options:**
- A) Error message: "All dashboard ports in use, run /2l-dashboard-stop on another project"
- B) Extend range: Use 8080-8199 (120 ports)
- C) Random high port: Use system-assigned port (harder to remember)

**Recommendation:** A (error with guidance) - 20 concurrent projects is unlikely, clear error is better than complex port logic

---

**Report Status:** COMPLETE  
**Ready for:** Planning phase  
**Next Steps:** Planner synthesizes this report + Explorer-2 findings → creates builder task breakdown
