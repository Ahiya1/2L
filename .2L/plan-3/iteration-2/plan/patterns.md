# Code Patterns & Conventions - Iteration 2

## File Structure

```
2L/
├── .2L/                          # Project orchestration directory
│   ├── events.jsonl              # Event stream (JSONL format)
│   ├── dashboard/                # Dashboard HTML and server state
│   │   ├── index.html           # Generated dashboard (by command, not agent)
│   │   ├── .server-port         # Port number (8080-8099)
│   │   └── .server-pid          # Server process ID
│   └── plan-3/                   # Current plan
│       └── iteration-2/          # Current iteration
│           ├── exploration/      # Explorer reports
│           ├── plan/             # This directory (planner output)
│           └── building/         # Builder outputs (future)
│
├── README.md                     # User documentation (to be restructured)
├── 2l.sh                         # Installation script (from Iteration 1)
│
└── [project files]               # User's actual project code

~/.claude/                        # Claude configuration (installed by 2l.sh)
├── commands/
│   ├── 2l-dashboard.md          # Dashboard command (to be modified)
│   ├── 2l-dashboard-stop.md     # Dashboard stop command (unchanged)
│   ├── 2l-setup-db.md           # Database setup (from Iteration 1)
│   └── 2l-setup-mcps.md         # MCP setup (from Iteration 1)
│
├── lib/
│   ├── 2l-dashboard-template.html   # Dashboard template (to be modified)
│   └── 2l-event-logger.sh           # Event logger (unchanged)
│
└── agents/
    ├── 2l-dashboard-builder.md      # Agent (to be deprecated)
    └── [other agents]
```

---

## Naming Conventions

### Bash Variables
- **SCREAMING_SNAKE_CASE** for constants: `DASHBOARD_PORT`, `EVENTS_PATH`
- **snake_case** for local variables: `project_name`, `template_path`
- **Descriptive names:** `stored_port` not `port`, `server_pid` not `pid`

### Files and Directories
- **kebab-case** for commands: `2l-dashboard.md`, `2l-dashboard-stop.md`
- **kebab-case** for libraries: `2l-event-logger.sh`, `2l-dashboard-template.html`
- **Lowercase** for directories: `.2L/dashboard/`, `.2L/events.jsonl`

### Event Types
- **snake_case** for event types: `agent_start`, `agent_complete`, `phase_change`
- **Consistent naming:** Use exact event types from event logger (no variations)

### HTML/CSS/JavaScript
- **kebab-case** for CSS classes: `.event-type-agent_start`, `.active-agents`
- **camelCase** for JavaScript variables: `activeAgents`, `currentPhase`
- **PascalCase** for JavaScript constants: `EVENTS_PATH`, `POLL_INTERVAL`

---

## Bash Patterns

### Pattern 1: Template String Replacement

**When to use:** Replacing placeholders in template files (HTML, markdown, config files)

**Code example:**
```bash
#!/bin/bash

# Read template file
TEMPLATE=$(cat ~/.claude/lib/2l-dashboard-template.html)

# Get replacement values
PROJECT_NAME=$(basename "$(pwd)")
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
EVENTS_PATH="../events.jsonl"

# Replace placeholders using bash parameter expansion (bash 4.0+)
HTML="${TEMPLATE//\{PROJECT_NAME\}/$PROJECT_NAME}"
HTML="${HTML//\{TIMESTAMP\}/$TIMESTAMP}"
HTML="${HTML//\{EVENTS_PATH\}/$EVENTS_PATH}"

# Validate replacement completed (no remaining placeholders)
if echo "$HTML" | grep -q '{.*}'; then
  echo "Error: Template replacement incomplete"
  echo "Remaining placeholders found in output"
  exit 1
fi

# Write output
mkdir -p .2L/dashboard
echo "$HTML" > .2L/dashboard/index.html

echo "✓ Dashboard HTML generated successfully"
```

**Key points:**
- Use `//` for global replacement (all occurrences)
- Escape braces in pattern: `\{PLACEHOLDER\}`
- Always validate output (grep for remaining `{`)
- Create output directory before writing (`mkdir -p`)

**Fallback for bash <4.0:**
```bash
# If bash version < 4.0, use sed
HTML=$(echo "$TEMPLATE" | sed "s|{PROJECT_NAME}|$PROJECT_NAME|g")
HTML=$(echo "$HTML" | sed "s|{TIMESTAMP}|$TIMESTAMP|g")
HTML=$(echo "$HTML" | sed "s|{EVENTS_PATH}|$EVENTS_PATH|g")
```

---

### Pattern 2: Port Allocation and Reuse

**When to use:** Multi-project server management with port allocation

**Code example:**
```bash
#!/bin/bash

# Check if server already running (reuse existing port)
if [ -f ".2L/dashboard/.server-port" ] && [ -f ".2L/dashboard/.server-pid" ]; then
  STORED_PORT=$(cat .2L/dashboard/.server-port)
  STORED_PID=$(cat .2L/dashboard/.server-pid)

  # Verify process still alive
  if ps -p "$STORED_PID" > /dev/null 2>&1; then
    echo "Dashboard already running on port $STORED_PORT (PID: $STORED_PID)"
    echo "Opening browser to http://localhost:$STORED_PORT/dashboard/index.html"

    # Open browser (platform-specific)
    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "http://localhost:$STORED_PORT/dashboard/index.html" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then
      open "http://localhost:$STORED_PORT/dashboard/index.html"
    fi

    exit 0
  else
    # Process died, clean up stale files
    echo "Cleaning up stale server files (process $STORED_PID not running)"
    rm -f .2L/dashboard/.server-pid .2L/dashboard/.server-port
  fi
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
  echo ""
  echo "To free a port, navigate to another project and run: /2l-dashboard-stop"
  exit 1
fi

# Start server and store state
cd .2L || exit 1
python3 -m http.server "$DASHBOARD_PORT" --bind 127.0.0.1 > /dev/null 2>&1 &
SERVER_PID=$!

# Wait briefly for server to start
sleep 0.5

# Verify server is running
if ! ps -p "$SERVER_PID" > /dev/null 2>&1; then
  echo "Error: Failed to start HTTP server"
  exit 1
fi

# Store port and PID for reuse
echo "$DASHBOARD_PORT" > dashboard/.server-port
echo "$SERVER_PID" > dashboard/.server-pid

cd ..

echo "✓ Dashboard server started on port $DASHBOARD_PORT (PID: $SERVER_PID)"
```

**Key points:**
- Always check for existing server before allocating new port
- Verify process is alive using `ps -p $PID`
- Clean up stale state files if process died
- Use `lsof` to check port availability
- Store port and PID for future reuse
- Bind server to localhost only (127.0.0.1)

**CRITICAL:** This pattern must be preserved exactly - DO NOT MODIFY

---

### Pattern 3: Pre-Flight Dependency Check

**When to use:** Before executing commands that require specific tools

**Code example:**
```bash
#!/bin/bash

# Check Python 3 availability
if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: Python 3 not found"
  echo ""
  echo "Dashboard requires Python 3 for HTTP server."
  echo ""
  echo "Install Python 3:"
  echo "  - Ubuntu/Debian: sudo apt install python3"
  echo "  - macOS: brew install python3"
  echo "  - Or download from: https://www.python.org/downloads/"
  exit 1
fi

# Check template file exists
if [ ! -f "$HOME/.claude/lib/2l-dashboard-template.html" ]; then
  echo "Error: Dashboard template not found"
  echo ""
  echo "Expected location: $HOME/.claude/lib/2l-dashboard-template.html"
  echo ""
  echo "Run installation: ./2l.sh install"
  exit 1
fi

# Check bash version for parameter expansion
BASH_VERSION_MAJOR=$(echo "$BASH_VERSION" | cut -d. -f1)
if [ "$BASH_VERSION_MAJOR" -lt 4 ]; then
  echo "Warning: Bash version < 4.0 detected (current: $BASH_VERSION)"
  echo "Using sed fallback for string replacement"
  USE_SED_FALLBACK=true
else
  USE_SED_FALLBACK=false
fi

echo "✓ All dependencies available"
```

**Key points:**
- Check before executing (fail fast)
- Provide clear error messages with installation instructions
- Offer fallback strategies when possible
- Always check file existence before reading

---

### Pattern 4: Idempotent File Operations

**When to use:** Creating directories, writing files that may already exist

**Code example:**
```bash
#!/bin/bash

# Create directory (idempotent)
mkdir -p .2L/dashboard

# Write file (overwrites existing)
cat > .2L/dashboard/index.html <<EOF
<!DOCTYPE html>
<html>
...
</html>
EOF

# Conditional write (only if doesn't exist)
if [ ! -f .2L/events.jsonl ]; then
  touch .2L/events.jsonl
fi

# Append to file (safe for JSONL)
echo '{"timestamp":"2025-10-10T10:00:00Z","event_type":"agent_start"}' >> .2L/events.jsonl
```

**Key points:**
- Use `mkdir -p` (creates parents, no error if exists)
- Overwrite when content should match exactly
- Check existence before conditional write
- Append for event logging (order matters)

---

## JavaScript Patterns (Dashboard)

### Pattern 1: Event Processing

**When to use:** Processing JSONL events and updating dashboard state

**Code example:**
```javascript
// Global state
const activeAgents = new Map();  // agent_id -> {task, startTime}
let allEvents = [];
let currentPhase = 'idle';
let currentIteration = '-';
let startTime = null;

// Process single event
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

    case 'agent_start':  // CORRECT: Match actual event type
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

// Update active agents list
function updateActiveAgents() {
  const container = document.getElementById('active-agents-list');
  container.innerHTML = '';

  if (activeAgents.size === 0) {
    container.innerHTML = '<div class="no-agents">No active agents</div>';
    return;
  }

  activeAgents.forEach((info, agentId) => {
    const duration = Math.floor((Date.now() - info.startTime) / 1000);
    const div = document.createElement('div');
    div.className = 'active-agent';
    div.innerHTML = `
      <strong>${agentId}</strong>
      <span class="duration">${duration}s</span>
      <div class="task">${info.task}</div>
    `;
    container.appendChild(div);
  });
}
```

**Key points:**
- Use Map for active agents (fast lookups, easy delete)
- Store timestamp as Date object for duration calculation
- Update all affected UI elements after state change
- Handle missing events gracefully (optional chaining `?.`)

**CRITICAL:** Use `agent_start` not `agent_spawn` for active agent tracking

---

### Pattern 2: Event Polling with Error Handling

**When to use:** Fetching event file from HTTP server with robust error handling

**Code example:**
```javascript
const EVENTS_PATH = '../events.jsonl';  // Relative to dashboard HTML location
const POLL_INTERVAL = 2000;  // 2 seconds
let lastEventCount = 0;

async function pollEvents() {
  try {
    const response = await fetch(EVENTS_PATH);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();

    // Parse JSONL (one JSON object per line)
    const lines = text.trim().split('\n').filter(line => line.trim());

    // Process only new events
    const newEvents = lines.slice(lastEventCount);

    newEvents.forEach(line => {
      try {
        const event = JSON.parse(line);
        allEvents.push(event);
        processEvent(event);
      } catch (parseError) {
        console.warn('Failed to parse event:', line, parseError);
        // Continue processing other events (don't break entire loop)
      }
    });

    lastEventCount = lines.length;

  } catch (error) {
    console.error('Error polling events:', error);
    // Show user-friendly message (don't crash dashboard)
    document.getElementById('status').textContent = 'Error loading events';
  }
}

// Start polling
setInterval(pollEvents, POLL_INTERVAL);
pollEvents();  // Initial load
```

**Key points:**
- Use try-catch around fetch and JSON.parse
- Parse JSONL line by line (split on newline)
- Filter empty lines before parsing
- Track event count to avoid reprocessing
- Log parse errors but continue processing other events
- Don't crash dashboard on single malformed event

---

### Pattern 3: Real-Time Duration Calculation

**When to use:** Showing elapsed time for active agents

**Code example:**
```javascript
// Update active agents duration every second
setInterval(() => {
  if (activeAgents.size > 0) {
    updateActiveAgents();  // Recalculate and re-render durations
  }
}, 1000);

function updateActiveAgents() {
  const container = document.getElementById('active-agents-list');
  container.innerHTML = '';

  if (activeAgents.size === 0) {
    container.innerHTML = '<div class="no-agents">No active agents</div>';
    return;
  }

  const now = Date.now();

  activeAgents.forEach((info, agentId) => {
    // Calculate duration in seconds
    const durationSeconds = Math.floor((now - info.startTime) / 1000);

    // Format duration (e.g., "2m 30s" or "45s")
    let durationText;
    if (durationSeconds >= 60) {
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      durationText = `${minutes}m ${seconds}s`;
    } else {
      durationText = `${durationSeconds}s`;
    }

    const div = document.createElement('div');
    div.className = 'active-agent';
    div.innerHTML = `
      <strong>${agentId}</strong>
      <span class="duration">${durationText}</span>
      <div class="task">${info.task}</div>
    `;
    container.appendChild(div);
  });
}
```

**Key points:**
- Update every 1 second for real-time feel
- Only update if agents exist (performance)
- Calculate duration from stored startTime
- Format duration for readability (minutes + seconds)
- Re-render entire list (simple, performant for <20 agents)

---

### Pattern 4: Event Rendering with Color Coding

**When to use:** Displaying events in timeline with visual distinction

**Code example:**
```javascript
function renderEvent(event) {
  const container = document.getElementById('events-timeline');

  const eventDiv = document.createElement('div');
  eventDiv.className = `event event-type-${event.event_type}`;

  // Format timestamp
  const timestamp = new Date(event.timestamp).toLocaleTimeString();

  // Build event HTML
  eventDiv.innerHTML = `
    <div class="event-header">
      <span class="event-time">${timestamp}</span>
      <span class="event-type">${event.event_type}</span>
      ${event.phase ? `<span class="event-phase">${event.phase}</span>` : ''}
    </div>
    <div class="event-data">${event.data}</div>
  `;

  // Prepend (newest first)
  container.insertBefore(eventDiv, container.firstChild);

  // Limit to 50 events (performance)
  while (container.children.length > 50) {
    container.removeChild(container.lastChild);
  }
}
```

**CSS for color coding:**
```css
/* Event type colors */
.event-type-plan_start {
  background: #58a6ff;  /* Blue */
  color: #fff;
}

.event-type-iteration_start {
  background: #a371f7;  /* Purple */
  color: #fff;
}

.event-type-phase_change {
  background: #ffa657;  /* Orange */
  color: #000;
}

.event-type-agent_start {
  background: #3fb950;  /* Green */
  color: #000;
}

.event-type-agent_complete {
  background: #3fb950;  /* Green */
  color: #000;
}

.event-type-validation_result {
  background: #f85149;  /* Red (if fail) */
  color: #fff;
}
```

**Key points:**
- Use CSS class based on event_type for styling
- Format timestamp for local time zone
- Newest events first (prepend, not append)
- Limit displayed events for performance
- Conditional rendering (phase only if present)

---

## Markdown Patterns (README)

### Pattern 1: Quick Start Section

**When to use:** Top of README, first thing users see

**Code example:**
```markdown
# 2L - Two-Level Orchestration System

**One-line pitch:** AI agent orchestration for building MVPs with full observability.

---

## Quick Start (5 Minutes)

Get up and running with 2L in 5 simple steps:

### 1. Clone Repository
```bash
git clone https://github.com/user/2L.git && cd 2L
```

### 2. Install 2L
```bash
./2l.sh install
```

This installs all agents and commands to `~/.claude/`.

### 3. Setup Database Access
```bash
/2l-setup-db
```

Configures Claude to access Supabase local database (requires sudo password).

### 4. (Optional) Setup MCPs
```bash
/2l-setup-mcps
```

Guided setup for Playwright and Chrome DevTools MCP servers.

### 5. Start Building
```bash
cd ~/your-project
/2l-mvp "build a todo app with React and Supabase"
```

In another terminal, monitor progress:
```bash
/2l-dashboard
```

**Done!** Your first orchestration is running.

---

## Table of Contents

- [Quick Start](#quick-start-5-minutes)
- [What is 2L?](#what-is-2l)
- [Core Workflow](#core-workflow)
- [Event System Architecture](#event-system-architecture)
- [Dashboard Access](#dashboard-access)
- [Advanced Topics](#advanced-topics)
  - [MCP Integration](#mcp-integration)
  - [GitHub Integration](#github-integration)
  - [Architecture Decisions](#architecture-decisions)
- [Troubleshooting](#troubleshooting)

---

[Rest of content follows...]
```

**Key points:**
- Quick Start at top (above Table of Contents)
- 5 steps maximum (actionable, not conceptual)
- Each step has code block (copy-pasteable)
- Brief explanation after each code block
- Link to dashboard for monitoring
- TOC immediately after Quick Start

---

### Pattern 2: Progressive Disclosure

**When to use:** Organizing documentation from simple to complex

**Code example:**
```markdown
## What is 2L?

2L (Two-Level) orchestrates AI agents to build software projects automatically.

**Core idea:** Break complex development into iterations, each executed by specialized agents.

[Simple explanation here - 2-3 paragraphs]

---

## Core Workflow

[How 2L works - visual diagram, steps]

---

## Event System Architecture

**Why Events?**
- Observability: See what each agent is doing
- Debugging: Trace problems to specific agents
- Historical record: Full audit trail

[Detailed technical content...]

---

## Advanced Topics

### MCP Integration

[Deep dive into MCPs - for advanced users]

### GitHub Integration

[Deep dive into GitHub setup - optional feature]

### Architecture Decisions

[Design rationale - for contributors]
```

**Key points:**
- Start simple (What is 2L?)
- Progress to implementation (Core Workflow)
- Then advanced topics (Event System, MCPs)
- Group advanced content under one heading
- Use "Why?" sections to motivate complexity

---

### Pattern 3: Code Block Conventions

**When to use:** Showing commands, code examples, configuration

**Code example:**
```markdown
### Running the Dashboard

Start the dashboard server:

```bash
/2l-dashboard
```

The dashboard will:
- Find an available port (8080-8099)
- Start a local HTTP server
- Open your browser automatically

**Output:**
```
✓ Dashboard server started

  URL: http://localhost:8080/dashboard/index.html
  Port: 8080
  PID: 12345

Opening browser...
```

**To stop:**

```bash
/2l-dashboard-stop
```
```

**Key points:**
- Always specify language for syntax highlighting (\`\`\`bash, \`\`\`javascript)
- Show command, then explain what it does
- Include expected output when helpful
- Link related commands (start/stop)

---

### Pattern 4: Troubleshooting Section

**When to use:** Bottom of README, after all tutorials

**Code example:**
```markdown
## Troubleshooting

### Dashboard Won't Start

**Symptom:** `/2l-dashboard` shows "Error: Python 3 not found"

**Solution:**
```bash
# Ubuntu/Debian
sudo apt install python3

# macOS
brew install python3
```

Verify installation:
```bash
python3 --version
```

---

### Active Agents Not Showing

**Symptom:** Dashboard shows "No active agents" during orchestration

**Possible causes:**
1. Events file not updating: Check `.2L/events.jsonl` exists
2. Browser console errors: Open DevTools (F12), check Console tab
3. Event polling failed: Check Network tab, verify `/events.jsonl` requests

**Debug steps:**
```bash
# Check events file
cat .2L/events.jsonl | grep agent_start

# Verify agent_start events exist (not agent_spawn)
```

If events show `agent_spawn` instead of `agent_start`, update dashboard template:
```bash
./2l.sh install --update
```

---

### Port Already in Use

**Symptom:** "Error: All dashboard ports (8080-8099) are in use"

**Solution:**
```bash
# Check which ports are occupied
lsof -i :8080-8099

# Stop unused dashboards
cd /path/to/old/project
/2l-dashboard-stop
```
```

**Key points:**
- Symptom → Cause → Solution format
- Provide exact commands to fix issue
- Include verification steps
- Link to related sections if complex

---

## Import Order Convention

**Not applicable for Iteration 2** - No JavaScript modules, no import statements.

For future JavaScript dashboard enhancements:
```javascript
// 1. External libraries (if any)
// 2. Internal modules
// 3. Constants
// 4. State variables
// 5. Functions
// 6. Event listeners
```

---

## Error Handling Patterns

### Bash Error Handling

**Pattern: Fail fast with helpful message**

```bash
#!/bin/bash

# Exit on error
set -e

# Function for error messages
error_exit() {
  echo "Error: $1"
  echo ""
  echo "$2"  # Helpful next steps
  exit 1
}

# Pre-flight checks
[ -f "$TEMPLATE_FILE" ] || error_exit \
  "Template file not found" \
  "Run: ./2l.sh install"

command -v python3 >/dev/null 2>&1 || error_exit \
  "Python 3 not found" \
  "Install: sudo apt install python3"

# Main logic
echo "✓ All checks passed"
```

**Key points:**
- Use `set -e` to exit on any error
- Create reusable error function
- Always provide next steps in error message
- Check all dependencies before main logic

---

### JavaScript Error Handling

**Pattern: Try-catch with graceful degradation**

```javascript
async function pollEvents() {
  try {
    const response = await fetch(EVENTS_PATH);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line.trim());

    lines.forEach(line => {
      try {
        const event = JSON.parse(line);
        processEvent(event);
      } catch (parseError) {
        console.warn('Skipping malformed event:', line);
        // Continue processing other events
      }
    });

  } catch (error) {
    console.error('Event polling failed:', error);
    // Don't crash - show error state
    document.getElementById('status').textContent = 'Error loading events';
  }
}
```

**Key points:**
- Nested try-catch for granular error handling
- Warn on parse errors (don't crash)
- Log errors to console for debugging
- Show user-friendly error state
- Never break entire dashboard for one bad event

---

## Validation Patterns

### Template Validation

**Pattern: Verify placeholder replacement completed**

```bash
#!/bin/bash

# After string replacement
if echo "$HTML" | grep -q '{.*}'; then
  echo "Error: Template replacement incomplete"
  echo ""
  echo "Placeholders remaining:"
  echo "$HTML" | grep -o '{[^}]*}'
  exit 1
fi

# Verify output is valid HTML (optional)
if ! echo "$HTML" | grep -q '<!DOCTYPE html>'; then
  echo "Warning: Output may not be valid HTML"
fi

echo "✓ Template validation passed"
```

---

### Event Validation

**Pattern: Validate JSONL schema**

```javascript
function validateEvent(event) {
  // Required fields
  if (!event.timestamp || !event.event_type) {
    console.warn('Invalid event (missing required fields):', event);
    return false;
  }

  // Valid timestamp
  if (isNaN(Date.parse(event.timestamp))) {
    console.warn('Invalid timestamp:', event.timestamp);
    return false;
  }

  // Known event type (optional - gracefully handle unknown types)
  const knownTypes = [
    'plan_start', 'iteration_start', 'phase_change',
    'agent_start', 'agent_complete', 'validation_result',
    'iteration_complete', 'complexity_decision', 'agent_spawn'
  ];

  if (!knownTypes.includes(event.event_type)) {
    console.info('Unknown event type (displaying anyway):', event.event_type);
    // Don't return false - display unknown events
  }

  return true;
}

// Use in event processing
lines.forEach(line => {
  try {
    const event = JSON.parse(line);
    if (validateEvent(event)) {
      allEvents.push(event);
      processEvent(event);
    }
  } catch (error) {
    console.warn('Event parsing failed:', line, error);
  }
});
```

---

## Performance Patterns

### Pattern: Limit DOM Updates

**When to use:** Rendering large lists (events timeline, active agents)

```javascript
// Limit displayed events to 50 (most recent)
function renderEvent(event) {
  const container = document.getElementById('events-timeline');

  // Create new event element
  const eventDiv = document.createElement('div');
  eventDiv.className = `event event-type-${event.event_type}`;
  eventDiv.innerHTML = `...`;

  // Prepend (newest first)
  container.insertBefore(eventDiv, container.firstChild);

  // Remove excess events
  while (container.children.length > 50) {
    container.removeChild(container.lastChild);
  }
}
```

**Key points:**
- Cap displayed elements (50 events, 20 agents)
- Newest first (prepend instead of append)
- Remove old elements to prevent memory bloat

---

### Pattern: Throttle Updates

**When to use:** Real-time duration calculation

```javascript
// Update durations every 1 second (not on every event)
setInterval(() => {
  if (activeAgents.size > 0) {
    updateActiveAgents();
  }
}, 1000);

// Don't update if no agents (skip unnecessary work)
```

**Key points:**
- Fixed interval updates (1s) regardless of event frequency
- Skip update if state unchanged (no active agents)
- Separate polling (2s) from rendering (1s)

---

## Security Patterns

### Pattern: Localhost-Only Server

**When to use:** Development dashboard, local tools

```bash
# Bind to localhost only (not 0.0.0.0)
python3 -m http.server "$DASHBOARD_PORT" --bind 127.0.0.1
```

**Key points:**
- Use `--bind 127.0.0.1` (no external access)
- Port range 8080-8099 (non-privileged)
- No authentication needed (local only)

---

### Pattern: Safe String Substitution

**When to use:** User input in templates

```bash
# Project name from directory (could contain special chars)
PROJECT_NAME=$(basename "$(pwd)")

# Safe: Bash parameter expansion handles most special chars
HTML="${TEMPLATE//\{PROJECT_NAME\}/$PROJECT_NAME}"

# Extra safety: Validate output
if echo "$HTML" | grep -q '{'; then
  echo "Error: Unsafe characters in project name"
  exit 1
fi
```

**Key points:**
- Bash parameter expansion is safe (no eval)
- Always validate output (check for remaining `{`)
- Fail if replacement incomplete

---

## Testing Patterns

### Manual Testing Checklist

**Dashboard Generation:**
```bash
# Clean slate
rm -rf .2L/dashboard

# Generate dashboard
time /2l-dashboard

# Verify
[ -f .2L/dashboard/index.html ] || echo "FAIL: HTML not created"
grep -q '{' .2L/dashboard/index.html && echo "FAIL: Placeholders remain"
grep -q "<!DOCTYPE html>" .2L/dashboard/index.html || echo "FAIL: Invalid HTML"

# Performance
# Should complete in <2s
```

**Active Agents Tracking:**
```bash
# Generate real events
/2l-mvp "simple test task"

# Open dashboard in browser
# Verify:
# 1. Active agents section shows agents during execution
# 2. Duration updates every second
# 3. Agents disappear on completion
# 4. No JavaScript errors in console (F12)
```

**Edge Cases:**
```bash
# Project name with space
mkdir "test project" && cd "test project"
/2l-dashboard  # Should work

# Project name with special chars
mkdir "test-app_v2.0" && cd "test-app_v2.0"
/2l-dashboard  # Should work
```

---

## Summary

**Key Patterns for Iteration 2:**

1. **Bash String Replacement:** Use parameter expansion `${VAR//pattern/replacement}`
2. **Port Allocation:** Preserve existing pattern (lines 97-117) - DO NOT MODIFY
3. **Event Processing:** Use `agent_start` not `agent_spawn` for active agents
4. **Error Handling:** Fail fast (bash) or graceful degradation (JavaScript)
5. **Validation:** Always validate template replacement and JSONL parsing
6. **Performance:** Limit DOM elements (50 events), throttle updates (1s duration)
7. **README Structure:** Quick Start first, progressive disclosure, troubleshooting last

**Files to Modify:**
- `/home/ahiya/2l-claude-config/commands/2l-dashboard.md` (lines 54-64)
- `/home/ahiya/2l-claude-config/lib/2l-dashboard-template.html` (line 421, add CSS)
- `/home/ahiya/Ahiya/2L/README.md` (structure only, preserve content)

**Critical: DO NOT MODIFY:**
- Port allocation logic (2l-dashboard.md lines 97-117)
- Server management (2l-dashboard.md lines 66-95, 132-149)
- Event system format (.2L/events.jsonl JSONL structure)

All patterns are battle-tested from Iteration 1 or proven in explorer analysis. Follow these exactly for success.
