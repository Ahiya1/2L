# Technology Stack

## Core Framework

**Decision:** Bash scripting with markdown documentation (2L standard pattern)

**Rationale:**
- 2L's existing architecture uses markdown files with embedded bash scripts for all commands and agents
- Event logging library already implemented in Bash (`~/.claude/lib/2l-event-logger.sh`)
- Orchestrator runs as bash script, agents execute via Claude reading markdown
- Zero additional dependencies - works with existing 2L infrastructure
- Maintains consistency with 10+ existing commands and agents

**Alternatives Considered:**
- Python scripts: Would require rewriting orchestrator, breaks 2L architecture pattern
- Node.js: Adds dependency, incompatible with markdown-based agent system
- Standalone binaries: Over-engineered for file I/O and text processing

**Implementation Notes:**
- All bash code blocks in markdown files are executable
- Event emission uses sourcing pattern: `. ~/.claude/lib/2l-event-logger.sh`
- Backward compatibility via conditional execution: `if [ "$EVENT_LOGGING_ENABLED" = true ]`

## Event System

**Decision:** JSONL (JSON Lines) format via Bash function library

**Rationale:**
- Event logger library (`2l-event-logger.sh`) is already complete and production-ready
- JSONL is append-only, thread-safe, simple to parse incrementally
- Each event is independent JSON object on separate line
- No database required - plain text file at `.2L/events.jsonl`
- Dashboard can poll file directly via HTTP fetch()

**Schema:**
```json
{
  "timestamp": "2025-10-08T14:37:00Z",
  "event_type": "phase_change",
  "phase": "exploration",
  "agent_id": "orchestrator",
  "data": "Starting exploration phase"
}
```

**Event Types (Standardized):**
- `plan_start` - Orchestration begins
- `iteration_start` - New iteration begins
- `phase_change` - Phase transition (exploration → planning → building → integration → validation)
- `complexity_decision` - Master mode decision made
- `agent_start` - Agent begins work
- `agent_complete` - Agent finishes work
- `validation_result` - Validation status
- `iteration_complete` - Iteration finishes

**Function Signature:**
```bash
log_2l_event "event_type" "data" "phase" "agent_id"
```

**Safety Features:**
- Atomic append operations (thread-safe for concurrent agents)
- Fails silently on errors (never crashes orchestration)
- Auto-creates `.2L/` directory if missing
- Quote escaping for JSON safety

**Alternatives Considered:**
- Structured logging libraries: Over-engineered, adds dependencies
- Database (SQLite): Requires install, adds complexity for simple event stream
- Cloud logging: Requires network, breaks offline capability

## Dashboard

**Decision:** Static HTML/CSS/JavaScript (ES6) with Python HTTP server

**Frontend Technology:**
- **File:** `~/.claude/lib/2l-dashboard-template.html` (482 lines, complete)
- **JavaScript:** Vanilla ES6+ (no frameworks, no build step)
- **CSS:** Inline GitHub dark theme styling
- **Dependencies:** ZERO - fully self-contained single HTML file

**Frontend Features:**
- Event log display (last 50 events with color coding)
- Active agent tracking with duration calculation
- Real-time metrics bar (elapsed time, total events, active agents)
- Auto-refresh every 2 seconds via fetch() polling

**HTTP Server:**
- **Choice:** Python 3 `http.server` module (standard library)
- **Command:** `python3 -m http.server $PORT --directory .2L/dashboard`
- **Port Range:** 8080-8099 (20 concurrent project dashboards)
- **Process Management:** PID stored in `.2L/dashboard/.server-pid` for shutdown

**Rationale:**
- Dashboard template already exists and is tested (481 lines of working code)
- Python 3 is pre-installed on all Linux/macOS systems (version 3.12.3 confirmed)
- HTTP server required because file:// protocol blocks fetch() in Safari/Firefox
- No npm, no webpack, no dependencies - works immediately
- Polling architecture is simple and robust (no WebSocket complexity)

**Placeholder System:**
- `{PROJECT_NAME}` - replaced with directory name
- `{EVENTS_PATH}` - relative path to events file (`../events.jsonl`)
- `{TIMESTAMP}` - dashboard generation timestamp

**Browser Compatibility:**
- Chrome 42+ (ES6 support)
- Firefox 39+ (ES6 support)
- Safari 10.1+ (ES6 support)

**Alternatives Considered:**
- React/Vue dashboard: Requires npm build, over-engineered for simple polling UI
- WebSocket server: Complex implementation, not needed for 2-second polling
- Electron app: Over-engineered, adds massive dependencies
- Built-in server (Python http.server): SELECTED - simplest solution that works

## Dashboard Builder

**Decision:** Existing `2l-dashboard-builder.md` agent (no changes needed)

**Rationale:**
- Agent already complete and functional (173 lines)
- Reads template, replaces placeholders, writes to `.2L/dashboard/index.html`
- Spawned on-demand by `/2l-dashboard` command if HTML doesn't exist
- No modifications required for this iteration

**Implementation:**
- Dashboard command checks if `.2L/dashboard/index.html` exists
- If missing, spawns `2l-dashboard-builder` agent via Task tool
- Agent performs simple sed-based placeholder replacement
- Writes self-contained HTML to project directory

## Port Allocation

**Decision:** Dynamic port finder with config persistence

**Range:** 8080-8099 (20 concurrent dashboards)

**Strategy:**
```bash
# Find available port
for port in {8080..8099}; do
  if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    DASHBOARD_PORT=$port
    break
  fi
done
```

**Persistence:**
- Store port in `.2L/dashboard/.server-port` file
- Store PID in `.2L/dashboard/.server-pid` file
- Reuse port on subsequent `/2l-dashboard` runs if server still running
- Clean up files on `/2l-dashboard-stop`

**Rationale:**
- 20 ports sufficient for realistic multi-project usage
- File-based storage is simple and portable (no YAML dependency for this)
- Port reuse prevents orphaned servers on different ports
- lsof is standard on Linux/macOS for port checking

**Alternatives Considered:**
- Random high port (>10000): Harder to remember, harder to document
- Single fixed port (8080): Prevents multi-project dashboards
- YAML config storage: Over-engineered for simple port/PID tracking

## Command Implementation

**Decision:** Markdown files with embedded bash (2L standard pattern)

**New Commands:**
1. `/2l-dashboard.md` - Start dashboard HTTP server and open browser
2. `/2l-dashboard-stop.md` - Stop dashboard HTTP server gracefully

**Pattern:**
- Self-documenting markdown with usage instructions
- Embedded bash code blocks marked with language identifier
- Tool registration via custom_instructions.md (Claude MCP)
- Commands accessible via `/` prefix in Claude chat

**Rationale:**
- Consistent with existing 2L commands (/2l-mvp, /2l-status, etc.)
- Self-documenting - markdown provides usage guide
- No separate installation or path configuration needed
- Claude reads and executes directly from markdown

## Development Tools

### Testing

**Framework:** Bash-based manual testing (no test framework needed)

**Coverage target:** 100% of core workflows

**Strategy:**
```bash
# Event logging test
tail -f .2L/events.jsonl &
/2l-mvp "simple test project"

# Dashboard command test
/2l-dashboard
# Verify: HTTP server starts, browser opens, events display

# Multi-project test
cd ../other-project
/2l-dashboard
# Verify: Different port allocated, both dashboards work

# Cleanup test
/2l-dashboard-stop
# Verify: Server stopped, port freed
```

**Validation:**
- Event format: `jq . .2L/events.jsonl` (validates JSON syntax)
- Event types: `grep -o '"event_type":"[^"]*"' .2L/events.jsonl | sort | uniq -c`
- HTTP server: `curl http://localhost:8080/index.html` (HTTP 200 check)
- Port cleanup: `lsof -i :8080` (should show nothing after stop)

### Code Quality

**Linter:** shellcheck (bash linting)
- Run on all bash code blocks extracted from markdown
- Focus: Quoting, variable expansion, error handling

**Formatter:** None (bash formatting is manual)
- Follow 2L conventions: 2-space indent, clear variable names

**Type Checking:** None (bash is untyped)
- Defensive coding: Check file existence, command availability, graceful degradation

### Build & Deploy

**Build tool:** None (no compilation needed)

**Deployment target:** ~/.claude/ directory
- `~/.claude/commands/*.md` - Command files
- `~/.claude/agents/*.md` - Agent files
- `~/.claude/lib/*.sh` - Library files (already exist)

**CI/CD:** None (manual deployment for MVP)

## Environment Variables

**Required:**

None. All configuration is file-based.

**Optional:**

- `EVENT_LOGGING_ENABLED` - Set to "true" by orchestrator if event logger available
  - Purpose: Controls event emission throughout orchestration
  - Set by: Orchestrator during initialization
  - Default: false (backward compatibility)

**Runtime State (Files):**

- `.2L/events.jsonl` - Event stream (auto-created by event logger)
- `.2L/dashboard/.server-port` - Dashboard HTTP server port (created by /2l-dashboard)
- `.2L/dashboard/.server-pid` - Dashboard HTTP server PID (created by /2l-dashboard)
- `.2L/dashboard/index.html` - Generated dashboard HTML (created by dashboard-builder agent)

## Dependencies Overview

**System Dependencies (All Available):**
- `bash` 4.0+ - Shell for orchestrator and commands
- `python3` 3.12.3 - HTTP server for dashboard (confirmed installed at /usr/bin/python3)
- `date` - Timestamp generation (standard Unix utility)
- `lsof` - Port availability checking (standard on Linux/macOS)
- `ps`, `kill` - Process management (standard Unix utilities)

**Optional Dependencies:**
- `jq` - JSON validation (for testing, not runtime)
- `shellcheck` - Bash linting (for development, not runtime)

**2L Internal Dependencies:**
- `~/.claude/lib/2l-event-logger.sh` - Event logging library (EXISTS, complete)
- `~/.claude/lib/2l-dashboard-template.html` - Dashboard template (EXISTS, complete)
- `~/.claude/agents/2l-dashboard-builder.md` - Dashboard generator (EXISTS, complete)

**NOT Required:**
- npm/Node.js - Dashboard is static HTML
- pip packages - Python stdlib only
- yq - YAML not used for dashboard state (using simple text files)

## Performance Targets

**Event Emission:**
- Per-event overhead: <1ms (simple file append)
- Impact on orchestration: <0.1% total time (events are lightweight)

**Dashboard Refresh:**
- Polling interval: 2 seconds
- File read time: <10ms for typical events.jsonl (<100 events)
- Browser render time: <50ms (vanilla JS, no framework overhead)

**HTTP Server Startup:**
- Server start time: <500ms (Python http.server)
- Port allocation time: <100ms (iterate 20 ports)
- Browser open time: <1s (OS-dependent)

**Multi-Project Support:**
- Max concurrent dashboards: 20 (port range 8080-8099)
- Port conflict resolution: <200ms (check 20 ports sequentially)

## Security Considerations

**Event File Security:**
- Events written to project directory (`.2L/events.jsonl`)
- Contains orchestration data (phase names, agent IDs, progress messages)
- NOT sensitive - only development workflow data
- Approach: No encryption needed, standard file permissions (644)

**HTTP Server Security:**
- Binds to localhost only (127.0.0.1)
- No external network access
- Serves static files from `.2L/dashboard/` only
- Approach: Safe for local development, no authentication needed

**Port Allocation Security:**
- Port range 8080-8099 is unprivileged (>1024)
- No sudo required
- Port conflicts detected before binding
- Approach: First-available allocation, graceful failure if exhausted

**Process Management Security:**
- PID stored in `.2L/dashboard/.server-pid`
- Only kills processes owned by current user
- PID file cleaned up on stop
- Approach: Standard Unix process ownership model

**Bash Injection Prevention:**
- Event data is quoted before JSON emission
- Event logger escapes quotes: `data="${data//\"/\\\"}"`
- No eval() of user input
- Approach: Input sanitization at event emission layer
