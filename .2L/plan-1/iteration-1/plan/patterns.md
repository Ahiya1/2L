# Code Patterns & Conventions

## File Structure

```
~/.claude/                          # 2L system directory
├── commands/
│   ├── 2l-mvp.md                  # Main orchestration (MODIFIED)
│   ├── 2l-plan.md
│   └── ...
├── agents/
│   ├── 2l-dashboard-builder.md    # Dashboard builder agent (NEW)
│   ├── 2l-builder.md
│   └── ...
└── lib/                            # Shared libraries directory (NEW)
    ├── 2l-event-logger.sh         # Event logging library (NEW)
    └── 2l-dashboard-template.html # Dashboard template (NEW)

{project-root}/                     # Any 2L project
├── .2L/
│   ├── config.yaml                # Project config
│   ├── events.jsonl               # Event stream (GENERATED)
│   ├── dashboard/                 # Dashboard directory (GENERATED)
│   │   └── index.html            # Self-contained dashboard
│   ├── plan-1/
│   │   └── iteration-1/
│   │       ├── exploration/
│   │       ├── plan/
│   │       └── ...
│   └── ...
└── ...
```

## Naming Conventions

- **Files**: kebab-case for Bash/MD files (`2l-event-logger.sh`, `dashboard-builder.md`)
- **Functions**: snake_case for Bash functions (`log_2l_event`, `init_dashboard`)
- **Variables**: SCREAMING_SNAKE_CASE for globals (`EVENT_LOGGING_ENABLED`), lowercase for locals (`event_type`)
- **Constants**: SCREAMING_SNAKE_CASE (`EVENTS_FILE=".2L/events.jsonl"`)
- **Placeholders**: Uppercase in braces (`{PROJECT_NAME}`, `{EVENTS_PATH}`)
- **CSS Classes**: kebab-case (`.event-log`, `.metrics-bar`, `.active-agent`)
- **JavaScript Functions**: camelCase (`pollEvents`, `renderEvent`, `updateMetrics`)

## Event Logging Patterns

### Pattern 1: Event Logger Library (lib/2l-event-logger.sh)

**When to use:** Creating the core event logging library

**Full implementation:**

```bash
#!/usr/bin/env bash
#
# 2L Event Logger Library
# Provides log_2l_event function for streaming orchestration events to .2L/events.jsonl
#
# Usage:
#   source ~/.claude/lib/2l-event-logger.sh
#   log_2l_event "event_type" "data" "phase" "agent_id"
#

# Event logging function
# Arguments:
#   $1 - event_type (required): Type of event (plan_start, agent_spawn, etc.)
#   $2 - data (required): Event data/message
#   $3 - phase (optional): Current orchestration phase (defaults to "unknown")
#   $4 - agent_id (optional): Agent identifier (defaults to "orchestrator")
log_2l_event() {
  local event_type="$1"
  local data="$2"
  local phase="${3:-unknown}"
  local agent_id="${4:-orchestrator}"

  # Validate required parameters
  if [ -z "$event_type" ] || [ -z "$data" ]; then
    return 1
  fi

  # Generate ISO 8601 timestamp
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Event file location
  local event_file=".2L/events.jsonl"

  # Create .2L directory if needed
  mkdir -p .2L 2>/dev/null || true

  # Escape double quotes in data fields
  event_type="${event_type//\"/\\\"}"
  data="${data//\"/\\\"}"
  phase="${phase//\"/\\\"}"
  agent_id="${agent_id//\"/\\\"}"

  # Build JSON event object
  local json_event="{\"timestamp\":\"$timestamp\",\"event_type\":\"$event_type\",\"phase\":\"$phase\",\"agent_id\":\"$agent_id\",\"data\":\"$data\"}"

  # Append to event file (atomic operation, fails silently)
  echo "$json_event" >> "$event_file" 2>/dev/null || true
}

# Export function for use in other scripts
export -f log_2l_event
```

**Key points:**
- Function takes 4 parameters: event_type, data, phase (optional), agent_id (optional)
- Generates ISO 8601 timestamps automatically
- Escapes double quotes in all string fields to prevent JSON corruption
- Creates `.2L` directory if needed (silent failure acceptable)
- Appends to `.2L/events.jsonl` using `>>` (atomic on POSIX filesystems)
- All errors suppressed with `2>/dev/null || true` (graceful degradation)
- Exports function so it's available in subshells

### Pattern 2: Sourcing Event Logger in Orchestration

**When to use:** At the top of `commands/2l-mvp.md` (or any orchestration script)

**Full implementation:**

```bash
#!/usr/bin/env bash
#
# 2L MVP Orchestration Command
#

# ... existing setup code ...

# Source event logger library if available
EVENT_LOGGING_ENABLED=false
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  EVENT_LOGGING_ENABLED=true
  echo "[2L] Event logging enabled"
else
  echo "[2L] Event logging not available (continuing without dashboard)"
fi

# ... rest of orchestration ...
```

**Key points:**
- Check for library existence before sourcing (backward compatibility)
- Set global flag `EVENT_LOGGING_ENABLED` to track availability
- Use `. filename` (dot sourcing) to load functions into current shell
- Fail gracefully if library missing (no error, just info message)

### Pattern 3: Logging Events at Orchestration Checkpoints

**When to use:** At critical orchestration points (plan start, phase changes, agent lifecycle)

**Full implementation examples:**

```bash
# 1. Plan Start (after MODE detection)
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "plan_start" "Plan $PLAN_ID started in $MODE mode" "initialization" "orchestrator"
fi

# 2. Iteration Start (beginning of execute_iteration function)
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "iteration_start" "Iteration $ITER_ID: $(head -n 1 .2L/plan-$PLAN_ID/iteration-$ITER_ID/vision.md)" "initialization" "orchestrator"
fi

# 3. Phase Change (before each major phase)
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "phase_change" "Starting Exploration phase" "exploration" "orchestrator"
fi

# 4. Agent Spawn (before spawning agent)
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "agent_spawn" "Explorer-1: Architecture & Complexity" "exploration" "master-explorer-1"
fi

# 5. Agent Complete (after agent finishes)
AGENT_START_TIME=$(date +%s)
# ... spawn agent and wait for completion ...
AGENT_END_TIME=$(date +%s)
DURATION=$((AGENT_END_TIME - AGENT_START_TIME))
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "agent_complete" "Explorer-1 completed in ${DURATION}s" "exploration" "master-explorer-1"
fi

# 6. Validation Result (after validation)
VALIDATION_STATUS="PASS"  # or FAIL, UNCERTAIN
ISSUES_COUNT=0
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "validation_result" "Validation: $VALIDATION_STATUS with $ISSUES_COUNT issues" "validation" "validator-1"
fi

# 7. Iteration Complete (end of iteration)
ITERATION_START_TIME=$(date +%s)
# ... execute iteration ...
ITERATION_END_TIME=$(date +%s)
ITERATION_DURATION=$((ITERATION_END_TIME - ITERATION_START_TIME))
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "iteration_complete" "Iteration $ITER_ID completed in ${ITERATION_DURATION}s" "complete" "orchestrator"
fi

# 8. Cost Update (optional, if cost tracking available)
TOKENS_USED=12500
COST_USD="0.15"
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "cost_update" "Tokens: $TOKENS_USED, Cost: \$$COST_USD" "validation" "orchestrator"
fi
```

**Key points:**
- Always wrap log calls in `if [ "$EVENT_LOGGING_ENABLED" = true ]` check
- Use consistent event_type strings (lowercase, underscore-separated)
- Provide context-rich data messages (include IDs, durations, statuses)
- Track timestamps for duration calculations
- No need for `|| true` here since it's already in log_2l_event function

## Dashboard Builder Patterns

### Pattern 4: Dashboard Builder Agent Definition

**When to use:** Creating `agents/2l-dashboard-builder.md`

**Full implementation:**

```markdown
---
name: 2l-dashboard-builder
description: Agent that generates project-specific dashboard HTML from template
tools:
  - Read
  - Write
---

# Role: Dashboard Builder

You are the 2L Dashboard Builder Agent. Your job is to generate a self-contained HTML dashboard for the current 2L project by customizing a template.

## Your Task

1. **Read the dashboard template** from `~/.claude/lib/2l-dashboard-template.html`
2. **Gather project context**:
   - Project name: Use directory name via `basename $(pwd)` or read from `.2L/config.yaml`
   - Events path: Always `../events.jsonl` (relative from `.2L/dashboard/index.html`)
   - Generation timestamp: Current date/time
3. **Replace placeholders** in template:
   - `{PROJECT_NAME}` → Actual project name
   - `{EVENTS_PATH}` → Always `../events.jsonl`
   - `{TIMESTAMP}` → Generation timestamp in format "2025-10-03 14:23:45 UTC"
4. **Write customized HTML** to `.2L/dashboard/index.html`
5. **Report completion** with full file path

## Template Placeholders

The template contains these markers (replace exactly, including braces):

- **{PROJECT_NAME}**: Project name (string)
- **{EVENTS_PATH}**: Relative path to events.jsonl (string)
- **{TIMESTAMP}**: Dashboard generation timestamp (string)

## Requirements

- Output MUST be valid HTML5
- All `<style>` and `<script>` tags must be properly closed
- File MUST be under 500 lines total
- No external dependencies (no CDN links, no imports)
- Preserve all inline CSS and JavaScript from template

## Validation Checklist

Before writing the file, verify:
- [ ] All placeholders replaced (search for any remaining `{` characters)
- [ ] HTML tags are balanced (every open tag has closing tag)
- [ ] JavaScript has no syntax errors (check quotes, semicolons, brackets)
- [ ] CSS has no syntax errors (check braces, semicolons)
- [ ] File is under 500 lines

## Output Location

Write the final HTML to: `.2L/dashboard/index.html`

Create the directory if needed: `mkdir -p .2L/dashboard`

## Error Handling

If template file is missing or unreadable:
- Report error clearly
- Suggest checking that `~/.claude/lib/2l-dashboard-template.html` exists
- Exit with error (don't create empty or broken dashboard)

## Success Response

After successful creation, output:
```
Dashboard created successfully!
Location: {absolute_path_to_dashboard}
Open in browser: file://{absolute_path_to_dashboard}
```

## Example Execution

Input:
- Template: `~/.claude/lib/2l-dashboard-template.html` (contains `{PROJECT_NAME}`)
- Project: In `/home/user/my-project`
- Directory name: `my-project`

Output:
- File: `/home/user/my-project/.2L/dashboard/index.html`
- Placeholder replaced: `{PROJECT_NAME}` → `my-project`

---

**Remember:** You are generating a COMPLETE working dashboard from a template. Your job is customization, not creation from scratch.
```

**Key points:**
- Agent uses template-based approach (safer than generative)
- Clear step-by-step instructions
- Validation checklist prevents common errors
- Error handling guidance included
- Success response provides clickable link

### Pattern 5: Dashboard Initialization in Orchestration

**When to use:** In `commands/2l-mvp.md` after config loading, before orchestration begins

**Full implementation:**

```bash
#!/usr/bin/env bash
#
# Part of 2l-mvp.md orchestration
#

# ... config loading ...

# Initialize dashboard if not exists
echo ""
echo "=== Dashboard Initialization ==="
if [ ! -f ".2L/dashboard/index.html" ]; then
  echo "[2L] Dashboard not found, creating..."

  # Create dashboard directory
  mkdir -p .2L/dashboard

  # Spawn dashboard builder agent
  PROJECT_NAME=$(basename "$(pwd)")

  # Use Task tool to spawn dashboard builder
  if command -v claude &> /dev/null; then
    claude task \
      --agent-type "2l-dashboard-builder" \
      --context "Project: $PROJECT_NAME" \
      --output ".2L/dashboard/index.html" \
      2>&1 | tee .2L/dashboard-builder.log

    if [ -f ".2L/dashboard/index.html" ]; then
      DASHBOARD_PATH="$(pwd)/.2L/dashboard/index.html"
      echo "[2L] ✓ Dashboard created successfully"
      echo "[2L] Open dashboard: file://$DASHBOARD_PATH"
      echo ""
    else
      echo "[2L] ⚠ Dashboard creation failed (continuing without dashboard)"
      echo "[2L] Check .2L/dashboard-builder.log for details"
    fi
  else
    echo "[2L] ⚠ Claude CLI not available (skipping dashboard creation)"
  fi
else
  DASHBOARD_PATH="$(pwd)/.2L/dashboard/index.html"
  echo "[2L] ✓ Dashboard already exists"
  echo "[2L] Open dashboard: file://$DASHBOARD_PATH"
  echo ""
fi

# ... continue with orchestration ...
```

**Key points:**
- Check for dashboard existence first (don't regenerate unnecessarily)
- Create directory before spawning agent
- Use Task tool to spawn dashboard builder agent
- Log output to `.2L/dashboard-builder.log` for debugging
- Print clickable `file://` URL after creation
- Fail gracefully if dashboard creation fails (non-blocking)

## Dashboard Template Patterns

### Pattern 6: Dashboard HTML Template Structure

**When to use:** Creating `lib/2l-dashboard-template.html`

**Full implementation:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2L Dashboard - {PROJECT_NAME}</title>
  <style>
    /* Reset */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* Base Styles */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      padding: 20px;
      font-size: 14px;
      line-height: 1.5;
    }

    /* Header */
    .header {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .header h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #58a6ff;
    }

    .header-info {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .header-info span {
      color: #8b949e;
    }

    .header-info strong {
      color: #c9d1d9;
    }

    /* Metrics Bar */
    .metrics {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .metric {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 15px 20px;
      flex: 1;
      min-width: 200px;
    }

    .metric-label {
      font-size: 12px;
      color: #8b949e;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #58a6ff;
    }

    /* Active Agents */
    .section {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 18px;
      margin-bottom: 15px;
      color: #c9d1d9;
      border-bottom: 1px solid #30363d;
      padding-bottom: 10px;
    }

    .agent-item {
      padding: 10px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .agent-item strong {
      color: #3fb950;
    }

    .agent-duration {
      color: #8b949e;
      font-size: 12px;
    }

    /* Event Log */
    .event-log {
      max-height: 500px;
      overflow-y: auto;
    }

    .event-item {
      padding: 8px;
      border-bottom: 1px solid #30363d;
      font-size: 13px;
    }

    .event-item:hover {
      background: #0d1117;
    }

    .event-timestamp {
      color: #8b949e;
      font-size: 11px;
      margin-right: 10px;
    }

    .event-type {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
      margin-right: 10px;
    }

    .event-type-plan_start { background: #58a6ff; color: #000; }
    .event-type-iteration_start { background: #58a6ff; color: #000; }
    .event-type-phase_change { background: #a371f7; color: #000; }
    .event-type-agent_spawn { background: #3fb950; color: #000; }
    .event-type-agent_complete { background: #3fb950; color: #000; }
    .event-type-validation_result { background: #f85149; color: #fff; }
    .event-type-iteration_complete { background: #58a6ff; color: #000; }

    .event-data {
      color: #c9d1d9;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 20px;
      color: #8b949e;
      font-size: 12px;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .metrics {
        flex-direction: column;
      }

      .metric {
        width: 100%;
      }

      .header-info {
        flex-direction: column;
        gap: 5px;
      }
    }

    /* Scrollbar Styling */
    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #0d1117;
    }

    ::-webkit-scrollbar-thumb {
      background: #30363d;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #484f58;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>2L Dashboard - {PROJECT_NAME}</h1>
    <div class="header-info">
      <span><strong>Status:</strong> <span id="status">Loading...</span></span>
      <span><strong>Phase:</strong> <span id="phase">-</span></span>
      <span><strong>Iteration:</strong> <span id="iteration">-</span></span>
    </div>
  </div>

  <!-- Metrics Bar -->
  <div class="metrics">
    <div class="metric">
      <div class="metric-label">Elapsed Time</div>
      <div class="metric-value" id="elapsed-time">0s</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Events</div>
      <div class="metric-value" id="total-events">0</div>
    </div>
    <div class="metric">
      <div class="metric-label">Active Agents</div>
      <div class="metric-value" id="active-agents">0</div>
    </div>
  </div>

  <!-- Active Agents Section -->
  <div class="section">
    <div class="section-title">Active Agents</div>
    <div id="active-agents-list">
      <p style="color: #8b949e;">No active agents</p>
    </div>
  </div>

  <!-- Event Log Section -->
  <div class="section">
    <div class="section-title">Event Log (Last 50 Events)</div>
    <div class="event-log" id="event-log">
      <p style="color: #8b949e; padding: 10px;">Waiting for events...</p>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    Dashboard generated on {TIMESTAMP} | Polling: {EVENTS_PATH} | Auto-refresh: 2s
  </div>

  <script>
    // Configuration
    const EVENTS_PATH = '{EVENTS_PATH}';
    const POLL_INTERVAL = 2000; // 2 seconds
    const MAX_EVENTS_DISPLAY = 50;

    // State
    let allEvents = [];
    let activeAgents = new Map();
    let startTime = null;
    let currentPhase = null;
    let currentIteration = null;

    // Format timestamp for display
    function formatTimestamp(isoString) {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { hour12: false });
    }

    // Calculate elapsed time
    function updateElapsedTime() {
      if (!startTime) return;
      const now = new Date();
      const elapsed = Math.floor((now - startTime) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;

      let display = '';
      if (hours > 0) display += `${hours}h `;
      if (minutes > 0 || hours > 0) display += `${minutes}m `;
      display += `${seconds}s`;

      document.getElementById('elapsed-time').textContent = display;
    }

    // Render event in log
    function renderEvent(event) {
      const eventLog = document.getElementById('event-log');

      // Remove "waiting" message on first event
      if (eventLog.querySelector('p')) {
        eventLog.innerHTML = '';
      }

      const eventItem = document.createElement('div');
      eventItem.className = 'event-item';

      const timestamp = document.createElement('span');
      timestamp.className = 'event-timestamp';
      timestamp.textContent = formatTimestamp(event.timestamp);

      const type = document.createElement('span');
      type.className = `event-type event-type-${event.event_type}`;
      type.textContent = event.event_type.replace(/_/g, ' ').toUpperCase();

      const data = document.createElement('span');
      data.className = 'event-data';
      data.textContent = event.data;

      eventItem.appendChild(timestamp);
      eventItem.appendChild(type);
      eventItem.appendChild(data);

      // Insert at top (newest first)
      eventLog.insertBefore(eventItem, eventLog.firstChild);

      // Limit display to MAX_EVENTS_DISPLAY
      while (eventLog.children.length > MAX_EVENTS_DISPLAY) {
        eventLog.removeChild(eventLog.lastChild);
      }
    }

    // Update active agents list
    function updateActiveAgents() {
      const container = document.getElementById('active-agents-list');

      if (activeAgents.size === 0) {
        container.innerHTML = '<p style="color: #8b949e;">No active agents</p>';
        return;
      }

      container.innerHTML = '';
      activeAgents.forEach((agent, agentId) => {
        const item = document.createElement('div');
        item.className = 'agent-item';

        const now = new Date();
        const elapsed = Math.floor((now - agent.startTime) / 1000);

        item.innerHTML = `
          <strong>${agentId}</strong>: ${agent.task}
          <div class="agent-duration">Running for ${elapsed}s</div>
        `;

        container.appendChild(item);
      });
    }

    // Process event and update state
    function processEvent(event) {
      // Update metrics based on event type
      switch (event.event_type) {
        case 'plan_start':
          startTime = new Date(event.timestamp);
          document.getElementById('status').textContent = 'Running';
          break;

        case 'iteration_start':
          currentIteration = event.data.match(/Iteration (\d+)/)?.[1] || '-';
          document.getElementById('iteration').textContent = currentIteration;
          break;

        case 'phase_change':
          currentPhase = event.data.replace('Phase: ', '').replace('Starting ', '');
          document.getElementById('phase').textContent = currentPhase;
          break;

        case 'agent_spawn':
          activeAgents.set(event.agent_id, {
            task: event.data,
            startTime: new Date(event.timestamp)
          });
          break;

        case 'agent_complete':
          activeAgents.delete(event.agent_id);
          break;

        case 'iteration_complete':
          document.getElementById('status').textContent = 'Complete';
          break;
      }

      // Update displays
      document.getElementById('total-events').textContent = allEvents.length;
      document.getElementById('active-agents').textContent = activeAgents.size;
      updateActiveAgents();
      renderEvent(event);
    }

    // Poll events file
    async function pollEvents() {
      try {
        const response = await fetch(EVENTS_PATH);
        if (!response.ok) throw new Error('Failed to fetch events');

        const text = await response.text();
        const lines = text.trim().split('\n').filter(line => line);

        // Process only new events
        if (lines.length > allEvents.length) {
          const newLines = lines.slice(allEvents.length);
          newLines.forEach(line => {
            try {
              const event = JSON.parse(line);
              allEvents.push(event);
              processEvent(event);
            } catch (e) {
              console.error('Invalid JSON:', line, e);
            }
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
        document.getElementById('status').textContent = 'Error loading events';
      }

      // Update elapsed time
      updateElapsedTime();
    }

    // Initialize polling
    pollEvents(); // Initial load
    setInterval(pollEvents, POLL_INTERVAL);
    setInterval(updateElapsedTime, 1000); // Update time every second
  </script>
</body>
</html>
```

**Key points:**
- Complete working dashboard with all 5 sections
- GitHub dark theme styling
- Placeholders: `{PROJECT_NAME}`, `{EVENTS_PATH}`, `{TIMESTAMP}`
- Inline CSS (no external stylesheets)
- Inline JavaScript with polling logic
- Mobile responsive (media query at 768px)
- Color-coded event types
- Displays last 50 events
- Updates every 2 seconds
- Calculates active agents from spawn/complete events
- Under 500 lines total (~450 lines)

**Usage:**
- Agent reads this template
- Replaces `{PROJECT_NAME}` with actual project name
- Replaces `{EVENTS_PATH}` with `../events.jsonl`
- Replaces `{TIMESTAMP}` with generation time
- Writes result to `.2L/dashboard/index.html`

## Testing Patterns

### Pattern 7: Testing Event Logger Function

**When to use:** Unit testing the event logger library

**Full test script:**

```bash
#!/usr/bin/env bash
#
# Test: Event Logger Function
#

echo "=== Testing Event Logger ==="

# Create test directory
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

# Source event logger
source "$HOME/.claude/lib/2l-event-logger.sh"

# Test 1: Single event
echo "Test 1: Single event log"
log_2l_event "test_event" "Test message" "test_phase" "test_agent"

if [ -f ".2L/events.jsonl" ]; then
  echo "✓ Event file created"
  EVENT_COUNT=$(wc -l < .2L/events.jsonl)
  if [ "$EVENT_COUNT" -eq 1 ]; then
    echo "✓ Event logged (1 line)"
  else
    echo "✗ Wrong line count: $EVENT_COUNT"
  fi
else
  echo "✗ Event file not created"
fi

# Test 2: Multiple events
echo ""
echo "Test 2: Multiple events (100 sequential)"
START_TIME=$(date +%s)
for i in {1..100}; do
  log_2l_event "test_event" "Event $i" "test_phase" "test_agent_$i"
done
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

EVENT_COUNT=$(wc -l < .2L/events.jsonl)
if [ "$EVENT_COUNT" -eq 101 ]; then
  echo "✓ All events logged (101 total: 1 + 100)"
  echo "  Duration: ${DURATION}s"
else
  echo "✗ Wrong event count: $EVENT_COUNT (expected 101)"
fi

# Test 3: JSON validation
echo ""
echo "Test 3: JSON validation"
VALID_JSON=true
while IFS= read -r line; do
  if ! echo "$line" | python3 -m json.tool > /dev/null 2>&1; then
    echo "✗ Invalid JSON: $line"
    VALID_JSON=false
    break
  fi
done < .2L/events.jsonl

if [ "$VALID_JSON" = true ]; then
  echo "✓ All events are valid JSON"
fi

# Test 4: Special characters
echo ""
echo "Test 4: Special characters in data"
log_2l_event "test_event" "Message with \"quotes\" and 'apostrophes'" "test_phase" "test_agent"
LAST_EVENT=$(tail -n 1 .2L/events.jsonl)
if echo "$LAST_EVENT" | python3 -m json.tool > /dev/null 2>&1; then
  echo "✓ Special characters escaped correctly"
else
  echo "✗ JSON invalid with special characters"
fi

# Test 5: Concurrent writes
echo ""
echo "Test 5: Concurrent writes (5 parallel processes)"
rm -f .2L/events.jsonl
for i in {1..5}; do
  (
    for j in {1..20}; do
      log_2l_event "concurrent_test" "Process $i Event $j" "test" "agent_$i"
    done
  ) &
done
wait

EVENT_COUNT=$(wc -l < .2L/events.jsonl)
if [ "$EVENT_COUNT" -eq 100 ]; then
  echo "✓ All concurrent events logged (100)"

  # Check for corruption
  VALID_JSON=true
  while IFS= read -r line; do
    if ! echo "$line" | python3 -m json.tool > /dev/null 2>&1; then
      VALID_JSON=false
      break
    fi
  done < .2L/events.jsonl

  if [ "$VALID_JSON" = true ]; then
    echo "✓ No corruption detected"
  else
    echo "✗ JSON corruption detected"
  fi
else
  echo "✗ Wrong event count: $EVENT_COUNT (expected 100)"
fi

# Cleanup
cd -
rm -rf "$TEST_DIR"

echo ""
echo "=== Event Logger Tests Complete ==="
```

**Key points:**
- Creates isolated test directory
- Tests single event, multiple events, JSON validity, special characters, concurrent writes
- Uses `python3 -m json.tool` for JSON validation
- Cleans up test directory after completion
- Reports pass/fail for each test

### Pattern 8: Testing Dashboard in Browser

**When to use:** Manual validation of dashboard functionality

**Test procedure:**

```bash
#!/usr/bin/env bash
#
# Test: Dashboard Display and Polling
#

echo "=== Testing Dashboard ==="

# Create test project
TEST_PROJECT=$(mktemp -d)
cd "$TEST_PROJECT"
mkdir -p .2L/dashboard

# Copy dashboard template
cp "$HOME/.claude/lib/2l-dashboard-template.html" .2L/dashboard/index.html

# Replace placeholders
sed -i "s/{PROJECT_NAME}/TestProject/g" .2L/dashboard/index.html
sed -i "s/{EVENTS_PATH}/..\/events.jsonl/g" .2L/dashboard/index.html
sed -i "s/{TIMESTAMP}/$(date -u +"%Y-%m-%d %H:%M:%S UTC")/g" .2L/dashboard/index.html

# Generate sample events
source "$HOME/.claude/lib/2l-event-logger.sh"

log_2l_event "plan_start" "Plan 1 started" "initialization" "orchestrator"
sleep 1

log_2l_event "iteration_start" "Iteration 1: Test iteration" "initialization" "orchestrator"
sleep 1

log_2l_event "phase_change" "Starting Exploration phase" "exploration" "orchestrator"
sleep 1

log_2l_event "agent_spawn" "Explorer-1: Architecture analysis" "exploration" "master-explorer-1"
sleep 1

log_2l_event "agent_spawn" "Explorer-2: Dependencies analysis" "exploration" "master-explorer-2"
sleep 5

log_2l_event "agent_complete" "Explorer-1 completed in 5s" "exploration" "master-explorer-1"
sleep 3

log_2l_event "agent_complete" "Explorer-2 completed in 8s" "exploration" "master-explorer-2"
sleep 1

log_2l_event "phase_change" "Starting Planning phase" "planning" "orchestrator"
sleep 1

log_2l_event "validation_result" "Validation: PASS with 0 issues" "validation" "validator-1"
sleep 1

log_2l_event "iteration_complete" "Iteration 1 completed in 45s" "complete" "orchestrator"

# Open dashboard in browser
DASHBOARD_PATH="$TEST_PROJECT/.2L/dashboard/index.html"
echo ""
echo "✓ Test events generated"
echo "✓ Dashboard ready"
echo ""
echo "Open dashboard in browser:"
echo "  file://$DASHBOARD_PATH"
echo ""
echo "Expected behavior:"
echo "  - Header shows 'TestProject'"
echo "  - Metrics show elapsed time, event count, active agents"
echo "  - Event log shows all 10 events (newest first)"
echo "  - Events are color-coded by type"
echo "  - Dashboard updates every 2 seconds if you add more events"
echo ""
echo "To add more events, run:"
echo "  cd $TEST_PROJECT && source ~/.claude/lib/2l-event-logger.sh && log_2l_event 'test' 'New event' 'test' 'test'"
echo ""
echo "Press Ctrl+C when done testing. Cleanup: rm -rf $TEST_PROJECT"
```

**Key points:**
- Creates test project with sample events
- Generates realistic event sequence (spawn agents, wait, complete)
- Provides manual validation checklist
- Shows how to add more events while testing
- Provides cleanup command

## Import Order Convention

**For Bash Scripts:**
```bash
#!/usr/bin/env bash
#
# Script description
#

# 1. Shebang and header comments

# 2. Strict mode (if needed)
set -euo pipefail

# 3. Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly EVENTS_FILE=".2L/events.jsonl"

# 4. Source external libraries
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
fi

# 5. Global variables
EVENT_LOGGING_ENABLED=false

# 6. Function definitions
function main() {
  # ...
}

# 7. Script execution
main "$@"
```

**For HTML (Dashboard Template):**
```html
<!DOCTYPE html>
<!-- 1. DOCTYPE and html tag -->
<html lang="en">
<head>
  <!-- 2. Meta tags -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- 3. Title -->
  <title>...</title>

  <!-- 4. Inline styles -->
  <style>
    /* CSS here */
  </style>
</head>
<body>
  <!-- 5. HTML structure -->

  <!-- 6. Inline scripts (at end of body) -->
  <script>
    // JavaScript here
  </script>
</body>
</html>
```

## Code Quality Standards

### Bash Standards
- **Quoting**: Always quote variables: `"$VAR"` not `$VAR`
- **Error Handling**: Use `|| true` for optional operations
- **Conditionals**: Use `[[ ]]` for tests, not `[ ]`
- **Functions**: Use `function` keyword for clarity
- **Comments**: Explain WHY, not WHAT
- **Indentation**: 2 spaces, no tabs

### HTML/CSS/JS Standards
- **HTML**: Valid HTML5, all tags closed, proper nesting
- **CSS**: BEM-like naming (`.section-title`), mobile-first responsive
- **JavaScript**: ES6+ features, const/let (no var), async/await for promises
- **Comments**: Explain complex logic, section markers
- **Indentation**: 2 spaces consistent across HTML/CSS/JS

### JSON Standards
- **JSONL**: One JSON object per line, no trailing commas
- **Escaping**: Escape double quotes in string values
- **ISO 8601**: Use for all timestamps
- **No Pretty Print**: JSONL is single-line, not formatted

## Performance Patterns

### Pattern: Limit Displayed Events
**Problem:** Large event files (1000+ events) slow dashboard rendering

**Solution:**
```javascript
// In dashboard polling function
const MAX_DISPLAY = 50;
const lines = text.trim().split('\n').filter(line => line);

// Only keep last MAX_DISPLAY events in memory
if (allEvents.length > MAX_DISPLAY) {
  allEvents = allEvents.slice(-MAX_DISPLAY);
}

// Render only displayed events
lines.slice(-MAX_DISPLAY).forEach(line => {
  const event = JSON.parse(line);
  renderEvent(event);
});
```

### Pattern: Incremental Event Processing
**Problem:** Re-parsing entire file on every poll is wasteful

**Solution:**
```javascript
let lastEventCount = 0;

async function pollEvents() {
  const response = await fetch(EVENTS_PATH);
  const text = await response.text();
  const lines = text.trim().split('\n').filter(line => line);

  // Only process new events since last poll
  if (lines.length > lastEventCount) {
    const newEvents = lines.slice(lastEventCount);
    newEvents.forEach(line => processEvent(JSON.parse(line)));
    lastEventCount = lines.length;
  }
}
```

## Security Patterns

### Pattern: Escape User Data in Dashboard
**Problem:** Event data might contain HTML/JavaScript that could cause XSS

**Solution:**
```javascript
// BAD: innerHTML with user data (XSS risk)
element.innerHTML = event.data;

// GOOD: textContent (safe)
element.textContent = event.data;

// GOOD: Create text node
const textNode = document.createTextNode(event.data);
element.appendChild(textNode);
```

### Pattern: Validate JSON Before Processing
**Problem:** Malformed JSON in events.jsonl crashes dashboard

**Solution:**
```javascript
lines.forEach(line => {
  try {
    const event = JSON.parse(line);
    processEvent(event);
  } catch (error) {
    console.error('Invalid JSON, skipping:', line);
    // Continue processing other events
  }
});
```

---

**Remember:** These patterns are tested and proven. Copy-paste and adapt as needed. Consistency across all files ensures smooth integration.
