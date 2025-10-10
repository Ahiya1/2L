# Code Patterns & Conventions

## File Structure

```
~/.claude/                    # 2L configuration home
├── commands/                 # Executable commands
│   ├── 2l-mvp.md            # Main orchestrator (UPDATE)
│   ├── 2l-dashboard.md      # NEW: Dashboard server start
│   └── 2l-dashboard-stop.md # NEW: Dashboard server stop
├── agents/                   # Agent definitions
│   ├── 2l-builder.md        # UPDATE: Add Event Emission
│   ├── 2l-explorer.md       # UPDATE: Add Event Emission
│   ├── 2l-planner.md        # UPDATE: Add Event Emission
│   ├── 2l-integrator.md     # UPDATE: Add Event Emission
│   ├── 2l-iplanner.md       # UPDATE: Add Event Emission
│   ├── 2l-ivalidator.md     # UPDATE: Add Event Emission
│   ├── 2l-validator.md      # UPDATE: Add Event Emission
│   ├── 2l-healer.md         # UPDATE: Add Event Emission
│   ├── 2l-master-explorer.md # UPDATE: Add Event Emission
│   └── 2l-dashboard-builder.md # No changes (already complete)
└── lib/                      # Shared libraries
    ├── 2l-event-logger.sh   # Event logging (EXISTS)
    └── 2l-dashboard-template.html # Dashboard template (EXISTS)

Project directory structure:
.2L/                          # Project state directory
├── events.jsonl             # Event stream (auto-created)
├── config.yaml              # Project config
└── dashboard/               # Dashboard runtime
    ├── index.html           # Generated dashboard (by builder agent)
    ├── .server-port         # HTTP server port
    └── .server-pid          # HTTP server PID
```

## Naming Conventions

**Files:**
- Commands: `2l-command-name.md` (kebab-case with 2l- prefix)
- Agents: `2l-agent-name.md` (kebab-case with 2l- prefix)
- Libraries: `2l-library-name.sh` (kebab-case with 2l- prefix)

**Variables (Bash):**
- Global constants: `SCREAMING_SNAKE_CASE` (e.g., `EVENT_LOGGING_ENABLED`)
- Local variables: `snake_case` (e.g., `dashboard_port`)
- Environment: `SCREAMING_SNAKE_CASE` (e.g., `HOME`)

**Event Types:**
- Format: `lowercase_with_underscores` (e.g., `agent_start`, `phase_change`)
- Standardized set - see Event System Patterns below

**Agent IDs:**
- Format: `lowercase-with-dashes` (e.g., `explorer-1`, `builder-2`, `orchestrator`)
- Pattern: `agent-type-number` for numbered agents

**Phases:**
- Format: `lowercase` single word (e.g., `exploration`, `planning`, `building`, `integration`, `validation`)

## Event System Patterns

### Pattern: Event Logger Initialization

**When to use:** At the start of orchestrator or any script that emits events

**Code example:**
```bash
#!/bin/bash

# Initialize event logging with backward compatibility
EVENT_LOGGING_ENABLED=false
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  EVENT_LOGGING_ENABLED=true
fi

# Later in script, check before emitting
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "plan_start" "Starting plan-2" "initialization" "orchestrator"
fi
```

**Key points:**
- Set `EVENT_LOGGING_ENABLED=false` first (backward compatibility)
- Source library with full path: `$HOME/.claude/lib/2l-event-logger.sh`
- Only set to `true` if library exists and sources successfully
- Always guard event emission with conditional check
- System works even if library missing (graceful degradation)

### Pattern: Orchestrator Event Emission

**When to use:** At every phase transition, iteration boundary, and major decision point in orchestrator

**Code example:**
```bash
# Phase change event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "phase_change" "Starting Exploration phase" "exploration" "orchestrator"
fi

# Iteration start event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "iteration_start" "Iteration 1 starting" "initialization" "orchestrator"
fi

# Complexity decision event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "complexity_decision" "Complexity: MEDIUM, Explorers: 2" "master-exploration" "orchestrator"
fi

# Iteration complete event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "iteration_complete" "Iteration 1 complete, MVP ready" "completion" "orchestrator"
fi
```

**Key points:**
- Always use conditional guard: `if [ "$EVENT_LOGGING_ENABLED" = true ]`
- Use descriptive data field - appears in dashboard
- Phase field should match current orchestration phase
- Agent ID is always "orchestrator" for orchestrator events
- Event types: `plan_start`, `iteration_start`, `phase_change`, `complexity_decision`, `validation_result`, `iteration_complete`

### Pattern: Agent Event Emission (In Markdown Files)

**When to use:** Every agent must emit exactly 2 events during execution

**Code example (Agent Start):**
```bash
# Source event logger if available
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"

  # Emit agent_start event
  log_2l_event "agent_start" "Explorer-1: Starting architecture analysis" "exploration" "explorer-1"
fi
```

**Code example (Agent Complete):**
```bash
# Emit agent_complete event before writing final report
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"

  log_2l_event "agent_complete" "Explorer-1: Architecture analysis complete" "exploration" "explorer-1"
fi
```

**Key points:**
- Agent markdown files show example bash code (agents execute bash via Task tool)
- Source library every time (agents may run in different shell contexts)
- Always check if library file exists (graceful degradation)
- Agent start: Emit AFTER reading inputs, BEFORE starting work
- Agent complete: Emit AFTER finishing work, BEFORE writing report
- Use descriptive data field that identifies agent and action
- Phase field should match current orchestration phase (exploration, planning, building, etc.)
- Agent ID format: `agent-type-number` (e.g., `explorer-1`, `builder-3`, `planner`)

### Pattern: Agent Markdown Event Emission Section

**When to use:** Every agent markdown file needs this section added

**Location in file:** After "Available MCP Servers" section, before "Your Process" section

**Full section template:**
```markdown
## Event Emission

You MUST emit exactly 2 events during your execution to enable orchestration observability.

### 1. Agent Start Event

**When:** Immediately after reading all input files, before beginning your work

**Purpose:** Signal the orchestrator that you have started processing

**Code:**
```bash
# Source event logger if available
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"

  # Emit agent_start event
  # Replace {AGENT_TYPE}-{NUMBER} and {DESCRIPTION} with your specifics
  log_2l_event "agent_start" "{AGENT_TYPE}-{NUMBER}: {DESCRIPTION}" "{PHASE}" "{AGENT_TYPE}-{NUMBER}"
fi
```

**Example for Explorer-1:**
```bash
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  log_2l_event "agent_start" "Explorer-1: Starting architecture analysis" "exploration" "explorer-1"
fi
```

### 2. Agent Complete Event

**When:** After finishing all work, immediately before writing your final report

**Purpose:** Signal the orchestrator that you have completed successfully

**Code:**
```bash
# Emit agent_complete event
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"

  # Replace {AGENT_TYPE}-{NUMBER} and {DESCRIPTION} with your specifics
  log_2l_event "agent_complete" "{AGENT_TYPE}-{NUMBER}: {DESCRIPTION}" "{PHASE}" "{AGENT_TYPE}-{NUMBER}"
fi
```

**Example for Builder-2:**
```bash
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  log_2l_event "agent_complete" "Builder-2: Dashboard commands implementation complete" "building" "builder-2"
fi
```

### Important Notes

- Event emission is OPTIONAL and fails gracefully if library unavailable
- NEVER block your work due to event logging issues
- Events help orchestrator track progress but are not critical to your core function
- If unsure about phase, use the phase from your input context (usually specified in task description)
```

**Customization per agent:**
- Replace `{AGENT_TYPE}-{NUMBER}` with actual agent ID (e.g., `explorer-1`, `builder-2`, `planner`, `validator`)
- Replace `{DESCRIPTION}` with agent-specific work description
- Replace `{PHASE}` with current phase (exploration, planning, building, integration, validation)

## Dashboard Command Patterns

### Pattern: Dashboard Server Start

**When to use:** Implementation of `/2l-dashboard` command

**Code example:**
```bash
#!/bin/bash

# Check if dashboard HTML exists, spawn builder if missing
if [ ! -f ".2L/dashboard/index.html" ]; then
  echo "Dashboard not found, generating..."
  # Spawn dashboard-builder agent via Claude Task tool
  # (Implementation depends on how commands invoke agents)
fi

# Find available port in range 8080-8099
DASHBOARD_PORT=""
for port in {8080..8099}; do
  if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    DASHBOARD_PORT=$port
    break
  fi
done

if [ -z "$DASHBOARD_PORT" ]; then
  echo "Error: All dashboard ports (8080-8099) are in use"
  echo "Run '/2l-dashboard-stop' on another project to free a port"
  exit 1
fi

# Start Python HTTP server in background
cd .2L/dashboard
python3 -m http.server $DASHBOARD_PORT > /dev/null 2>&1 &
SERVER_PID=$!

# Store port and PID for reuse and cleanup
echo $DASHBOARD_PORT > .server-port
echo $SERVER_PID > .server-pid

echo "Dashboard started on port $DASHBOARD_PORT (PID: $SERVER_PID)"
echo "Opening browser to http://localhost:$DASHBOARD_PORT/index.html"

# Open browser (platform-specific)
if command -v xdg-open >/dev/null; then
  xdg-open "http://localhost:$DASHBOARD_PORT/index.html" >/dev/null 2>&1 &
elif command -v open >/dev/null; then
  open "http://localhost:$DASHBOARD_PORT/index.html"
else
  echo "Please open: http://localhost:$DASHBOARD_PORT/index.html"
fi
```

**Key points:**
- Check for dashboard HTML first, generate if missing
- Iterate ports 8080-8099 to find available one
- Use `lsof` to check port availability (standard on Linux/macOS)
- Start server in background with `&`
- Capture PID immediately with `$!`
- Store port and PID in `.2L/dashboard/.server-port` and `.server-pid`
- Open browser using platform-specific command (xdg-open on Linux, open on macOS)
- Redirect server output to /dev/null (silent operation)

### Pattern: Dashboard Server Stop

**When to use:** Implementation of `/2l-dashboard-stop` command

**Code example:**
```bash
#!/bin/bash

# Check if PID file exists
if [ ! -f ".2L/dashboard/.server-pid" ]; then
  echo "No dashboard server found (PID file missing)"
  exit 0
fi

# Read PID from file
SERVER_PID=$(cat .2L/dashboard/.server-pid)

# Check if process is still running
if ps -p $SERVER_PID > /dev/null 2>&1; then
  # Kill the server process
  kill $SERVER_PID
  echo "Dashboard server stopped (PID: $SERVER_PID)"
else
  echo "Dashboard server already stopped (PID $SERVER_PID not found)"
fi

# Clean up state files
rm -f .2L/dashboard/.server-pid
rm -f .2L/dashboard/.server-port

# Read port for confirmation message
if [ -f ".2L/dashboard/.server-port" ]; then
  DASHBOARD_PORT=$(cat .2L/dashboard/.server-port)
  echo "Port $DASHBOARD_PORT is now available"
  rm -f .2L/dashboard/.server-port
fi
```

**Key points:**
- Check if PID file exists before attempting stop
- Read PID from `.2L/dashboard/.server-pid`
- Verify process still running with `ps -p $SERVER_PID`
- Use `kill` (SIGTERM) for graceful shutdown
- Clean up both `.server-pid` and `.server-port` files
- Graceful handling if server already stopped
- Show confirmation message with freed port

### Pattern: Port Reuse (Enhancement)

**When to use:** Reuse existing port if server still running

**Code example:**
```bash
# Check if port file exists and server is still running
if [ -f ".2L/dashboard/.server-port" ] && [ -f ".2L/dashboard/.server-pid" ]; then
  STORED_PORT=$(cat .2L/dashboard/.server-port)
  STORED_PID=$(cat .2L/dashboard/.server-pid)

  # Verify process still running
  if ps -p $STORED_PID > /dev/null 2>&1; then
    echo "Dashboard already running on port $STORED_PORT (PID: $STORED_PID)"
    echo "Opening browser to http://localhost:$STORED_PORT/index.html"

    # Open browser to existing server
    if command -v xdg-open >/dev/null; then
      xdg-open "http://localhost:$STORED_PORT/index.html" >/dev/null 2>&1 &
    elif command -v open >/dev/null; then
      open "http://localhost:$STORED_PORT/index.html"
    fi

    exit 0
  else
    # Process died, clean up stale files
    rm -f .2L/dashboard/.server-pid .2L/dashboard/.server-port
  fi
fi

# Continue with normal port allocation if no reuse...
```

**Key points:**
- Check both port and PID files exist
- Verify process still running before reuse
- Clean up stale files if process died
- Exit early if reusing (no need to start new server)
- Opens browser to existing server URL

## Dashboard Builder Agent Pattern

**When to use:** Dashboard HTML generation (agent already exists, no changes needed)

**Pattern (for reference only):**
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

**Key points:**
- This agent already exists and is complete
- No modifications needed for iteration 1
- Dashboard command spawns this agent if HTML missing
- Pattern uses bash string replacement: `${var//search/replace}`

## Validation Patterns

### Pattern: Event Format Validation

**When to use:** Testing phase - validate all events are properly formatted

**Code example:**
```bash
#!/bin/bash

echo "Validating event format in .2L/events.jsonl..."

# Check file exists
if [ ! -f ".2L/events.jsonl" ]; then
  echo "ERROR: events.jsonl not found"
  exit 1
fi

# Validate JSON syntax with jq
if ! jq . .2L/events.jsonl > /dev/null 2>&1; then
  echo "ERROR: Invalid JSON in events.jsonl"
  jq . .2L/events.jsonl  # Show error
  exit 1
fi

# Check required fields in each event
required_fields=("timestamp" "event_type" "phase" "agent_id" "data")
line_num=0

while IFS= read -r line; do
  line_num=$((line_num + 1))

  for field in "${required_fields[@]}"; do
    if ! echo "$line" | jq -e ".$field" > /dev/null 2>&1; then
      echo "ERROR: Line $line_num missing required field: $field"
      echo "$line"
      exit 1
    fi
  done
done < .2L/events.jsonl

echo "SUCCESS: All events properly formatted"
echo "Total events: $(wc -l < .2L/events.jsonl)"
```

**Key points:**
- Validate entire file with `jq .` first (catches JSON syntax errors)
- Check each required field exists in every line
- JSONL format: one JSON object per line
- Required fields: timestamp, event_type, phase, agent_id, data
- Exit with error code if validation fails

### Pattern: Event Type Validation

**When to use:** Testing phase - verify all event types are from standardized set

**Code example:**
```bash
#!/bin/bash

# Standardized event types
VALID_EVENT_TYPES=(
  "plan_start"
  "iteration_start"
  "phase_change"
  "complexity_decision"
  "agent_start"
  "agent_complete"
  "validation_result"
  "iteration_complete"
)

echo "Checking event types..."

# Extract all event types from events.jsonl
event_types=$(jq -r '.event_type' .2L/events.jsonl | sort | uniq)

# Check each event type is valid
invalid_found=false
while IFS= read -r event_type; do
  valid=false
  for valid_type in "${VALID_EVENT_TYPES[@]}"; do
    if [ "$event_type" = "$valid_type" ]; then
      valid=true
      break
    fi
  done

  if [ "$valid" = false ]; then
    echo "WARNING: Invalid event type found: $event_type"
    invalid_found=true
  fi
done <<< "$event_types"

if [ "$invalid_found" = true ]; then
  echo "Some invalid event types found (see warnings above)"
  exit 1
fi

echo "SUCCESS: All event types are valid"

# Show event type distribution
echo ""
echo "Event type distribution:"
jq -r '.event_type' .2L/events.jsonl | sort | uniq -c
```

**Key points:**
- Define standardized event type list
- Extract all unique event types from events.jsonl
- Compare each against valid list
- Show warnings for invalid types
- Display event type distribution for debugging

### Pattern: End-to-End Dashboard Test

**When to use:** Final validation - test complete event flow

**Code example:**
```bash
#!/bin/bash

echo "=== End-to-End Dashboard Test ==="

# Step 1: Start dashboard
echo "1. Starting dashboard..."
/2l-dashboard
sleep 2

# Step 2: Verify server running
PORT=$(cat .2L/dashboard/.server-port 2>/dev/null)
if [ -z "$PORT" ]; then
  echo "ERROR: Dashboard port file not created"
  exit 1
fi

PID=$(cat .2L/dashboard/.server-pid 2>/dev/null)
if [ -z "$PID" ] || ! ps -p $PID > /dev/null 2>&1; then
  echo "ERROR: Dashboard server not running"
  exit 1
fi

echo "   Server running on port $PORT (PID: $PID)"

# Step 3: Verify HTTP response
echo "2. Testing HTTP server..."
if ! curl -s "http://localhost:$PORT/index.html" > /dev/null; then
  echo "ERROR: HTTP request failed"
  exit 1
fi
echo "   HTTP server responding"

# Step 4: Verify dashboard HTML loads
echo "3. Checking dashboard HTML..."
response=$(curl -s "http://localhost:$PORT/index.html")
if ! echo "$response" | grep -q "2L Dashboard"; then
  echo "ERROR: Dashboard HTML incomplete"
  exit 1
fi
echo "   Dashboard HTML valid"

# Step 5: Verify events.jsonl accessible
echo "4. Testing event file access..."
if ! curl -s "http://localhost:$PORT/../events.jsonl" > /dev/null; then
  echo "ERROR: Events file not accessible via HTTP"
  exit 1
fi
echo "   Events file accessible"

# Step 6: Stop dashboard
echo "5. Stopping dashboard..."
/2l-dashboard-stop

# Step 7: Verify cleanup
if [ -f ".2L/dashboard/.server-pid" ] || [ -f ".2L/dashboard/.server-port" ]; then
  echo "ERROR: State files not cleaned up"
  exit 1
fi
echo "   Cleanup successful"

echo ""
echo "=== All Tests Passed ==="
```

**Key points:**
- Test complete lifecycle: start → verify → stop → cleanup
- Check port and PID files created
- Verify process is running
- Test HTTP server responds
- Verify dashboard HTML loads correctly
- Verify events.jsonl accessible via HTTP
- Verify cleanup on stop
- Exit with error code if any step fails

## Error Handling Patterns

### Pattern: Graceful Degradation

**When to use:** All event emission and dashboard operations

**Code example:**
```bash
# Event logging - fails silently
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "phase_change" "Starting building phase" "building" "orchestrator" || true
fi

# Dashboard start - clear error message
if [ -z "$DASHBOARD_PORT" ]; then
  echo "Error: All dashboard ports (8080-8099) are in use"
  echo "Run '/2l-dashboard-stop' on another project to free a port"
  exit 1
fi

# MCP availability - informational only
if ! command -v playwright >/dev/null 2>&1; then
  echo "Note: Playwright MCP not available (some features will be limited)"
fi
```

**Key points:**
- Event emission never crashes orchestration (use `|| true`)
- Dashboard errors show clear resolution steps
- MCP unavailability is informational, not blocking
- System works with degraded functionality

## Import/Source Order Convention

**For bash scripts:**
```bash
#!/bin/bash

# 1. Set shell options
set -e  # Exit on error (if needed)

# 2. Define global constants
EVENT_LOGGING_ENABLED=false
DASHBOARD_PORT_RANGE_START=8080
DASHBOARD_PORT_RANGE_END=8099

# 3. Source external libraries
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  EVENT_LOGGING_ENABLED=true
fi

# 4. Define local variables
project_dir=$(pwd)
events_file=".2L/events.jsonl"

# 5. Main script logic
# ...
```

**Key points:**
- Shell options first (set -e, set -u, etc.)
- Global constants before sourcing
- Source libraries with conditional checks
- Local variables after sourcing
- Main logic last

## Code Quality Standards

**Bash Quoting:**
- Always quote variables: `"$variable"` not `$variable`
- Use `"${variable}"` for clarity in complex expressions
- Quote command substitutions: `"$(command)"`

**Error Checking:**
- Check file existence: `[ -f "file" ]` before reading
- Check command availability: `command -v cmd >/dev/null`
- Check process running: `ps -p $pid > /dev/null 2>&1`

**Defensive Coding:**
```bash
# Check directory exists before cd
if [ -d ".2L/dashboard" ]; then
  cd .2L/dashboard
else
  echo "Error: Dashboard directory not found"
  exit 1
fi

# Check file exists before cat
if [ -f ".server-port" ]; then
  port=$(cat .server-port)
else
  echo "Error: Port file not found"
  exit 1
fi

# Use || true for non-critical operations
log_2l_event "agent_start" "Starting work" "building" "builder-1" || true
```

## Performance Patterns

**Minimize Event Payload Size:**
```bash
# Good - concise data field
log_2l_event "agent_start" "Explorer-1 started" "exploration" "explorer-1"

# Bad - excessive data (avoid)
log_2l_event "agent_start" "Explorer-1 started with full context: $(cat context.md)" "exploration" "explorer-1"
```

**Optimize Dashboard Polling:**
```javascript
// In dashboard template (for reference)
// Poll every 2 seconds - balance between responsiveness and load
setInterval(fetchEvents, 2000);

// Only parse new events (track last line read)
const newEvents = allLines.slice(lastLineRead);
```

**Port Checking Optimization:**
```bash
# Fast port check with timeout
if ! timeout 0.1 lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
  DASHBOARD_PORT=$port
  break
fi
```

## Security Patterns

**Input Sanitization for Events:**
```bash
# Event logger handles this automatically
# Quotes are escaped in library: data="${data//\"/\\\"}"

# When passing user input, it's already safe
user_message="User's input with \"quotes\""
log_2l_event "custom_event" "$user_message" "building" "builder-1"
# Results in properly escaped JSON
```

**Localhost Binding Only:**
```bash
# Always bind HTTP server to localhost
python3 -m http.server $PORT --bind 127.0.0.1

# Never bind to 0.0.0.0 (external access)
```

**PID Verification Before Kill:**
```bash
# Verify PID exists and is owned by current user before killing
if ps -p $SERVER_PID -o user= | grep -q "^$(whoami)$"; then
  kill $SERVER_PID
else
  echo "Error: PID $SERVER_PID not owned by current user"
  exit 1
fi
```
