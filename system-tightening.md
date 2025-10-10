# System Tightening: Dashboard + MCP Cleanup + Master Explorer Expansion

**Created:** 2025-10-03
**Status:** READY FOR IMPLEMENTATION
**Estimated Time:** 4-6 hours total

---

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Identified Improvements (Eagle's View)](#identified-improvements-eagles-view)
4. [Focus Areas](#focus-areas)
5. [Master Explorer Expansion (NEW)](#master-explorer-expansion-new)
6. [Part 1: Dashboard Implementation](#part-1-dashboard-implementation)
7. [Part 2: MCP Integration Cleanup](#part-2-mcp-integration-cleanup)
8. [Part 3: Honesty in Validation Reports](#part-3-honesty-in-validation-reports)
9. [Part 4: Testing & Validation](#part-4-testing--validation)
10. [Implementation Checklist](#implementation-checklist)
11. [File Change Summary](#file-change-summary)
12. [Expected Outcomes](#expected-outcomes)

---

## Overview

The 2L meta-system is an impressive autonomous development framework with 9 specialized agents and 17 commands. After comprehensive review, two critical areas need tightening:

1. **Dashboard** - Real-time monitoring of orchestration progress
2. **MCP Integration** - Clean up broken MCPs, keep only working ones
3. **Master Explorers** - Expand from 2 to up to 4 for better strategic analysis

These are not "v2 features" but **hard-fought lessons** that need immediate attention.

---

## Current State Analysis

### 2L System Architecture

**Core Principle:**
- Human-invoked commands → Session BECOMES that agent (no spawning)
- Agent-invoked operations → Spawned as sub-agents via Task tool

**9 Specialized Agents:**
1. `2l-master-explorer` - Strategic exploration for master planning
2. `2l-explorer` - Iteration-level codebase analysis
3. `2l-planner` - Creates comprehensive 4-file plans
4. `2l-builder` - Implements features (can SPLIT)
5. `2l-iplanner` - Creates zone-based integration plans
6. `2l-integrator` - Merges code by zones
7. `2l-ivalidator` - Validates organic cohesion (8 checks)
8. `2l-validator` - Final production readiness validation
9. `2l-healer` - Fixes specific issue categories

**17 Commands:**
- Core: `/2l-vision`, `/2l-plan`, `/2l-mvp`, `/2l-continue`, `/2l-task`
- Navigation: `/2l-status`, `/2l-next`, `/2l-list-plans`, `/2l-list-iterations`
- Rollback: `/2l-rollback`, `/2l-rollback-to-plan`, `/2l-abandon-plan`

**Workflow Phases:**
1. Exploration → 2. Planning → 3. Building → 4. Integration (multi-round) → 5. Validation → 6. Healing

**File Structure:**
```
.2L/
├── config.yaml
└── plan-N/
    ├── vision.md
    ├── master-exploration/
    ├── master-plan.yaml
    └── iteration-M/
        ├── exploration/
        ├── plan/
        ├── building/
        ├── integration/
        ├── validation/
        └── healing-{1,2}/
```

### MCP Server Status (Current)

**✅ WORKING (3):**
- **Playwright MCP** - E2E testing, browser automation
- **Chrome DevTools MCP** - Performance profiling, debugging
- **Supabase Local MCP** - Database validation (PostgreSQL 15.6 on port 5432)

**❌ BROKEN (2):**
- **GitHub MCP** - Authentication failed ("Bad credentials")
- **Screenshot MCP** - Platform incompatible (expects macOS, we're on Linux)

**Problem:** Agent prompts list all 5 MCPs without knowing which work. Agents may try to use broken ones and fail confusingly.

---

## Identified Improvements (Eagle's View)

From 30,000 feet, here are 10 potential improvement areas:

### High Priority (Addressing in This Plan)
1. ✅ **Observability & Control** - No real-time status, hard to debug
2. ✅ **MCP Integration** - Hacky, not well integrated, broken servers referenced

### Medium Priority (Future Work)
3. **Cost & Resource Management** - No token tracking or cost estimation
4. **Hardcoded Limits** - 3 integration rounds, 2 healing attempts (inflexible)
5. **Partial Success Handling** - 9/10 builders succeed → treats as failure

### Lower Priority (Future Work)
6. **Cross-Plan Intelligence** - Plans are isolated, no cumulative learning
7. **State Corruption Recovery** - No transaction guarantees
8. **Scale Challenges** - 20 parallel builders, context explosion
9. **Team Collaboration** - Single-user, no PR workflow
10. **Learning & Improvement** - No feedback loop, estimates don't improve

**Decision:** Focus on #1 and #2 as they're "tightening" issues, not distant features.

---

## Focus Areas

### Why Dashboard?
**Problem:**
- Once `/2l-mvp` starts, user just waits
- No visibility into which agents are running
- Can't debug "what went wrong in integration round 2?"
- No cost tracking

**Solution:**
- Self-building dashboard inside `.2L/dashboard/`
- Real-time agent status, event log, cost tracking
- Each project has its own isolated dashboard
- No external dependencies

### Why MCP Cleanup?
**Problem:**
- Agent prompts mention 5 MCP servers
- 2 are broken (GitHub auth, Screenshot platform issue)
- Agents don't know which work
- Results in confusing errors or silent failures

**Solution:**
- Remove GitHub/Screenshot MCP references entirely
- Keep only 3 working MCPs (Playwright, Chrome DevTools, Supabase)
- Update all agent prompts with clean, accurate MCP info
- Add "use gracefully, skip if unavailable" guidance

### Why More Master Explorers?
**Problem:**
- Currently limited to 2 master explorers
- Complex projects need deeper analysis
- 2 explorers can't cover all strategic dimensions

**Solution:**
- Expand to **up to 4 master explorers** (configurable)
- Each focuses on specific strategic dimension
- Better coverage for VERY COMPLEX projects
- Still runs in parallel (no time penalty)

---

## Master Explorer Expansion (NEW)

### Current State (2 Explorers)

**Explorer 1:** Architecture & Complexity Analysis
**Explorer 2:** Dependencies & Risk Assessment

**Problem:** Only 2 dimensions covered. Complex projects need more.

### New State (Up to 4 Explorers)

**Explorer 1:** Architecture & Complexity Analysis
- Major components and layers
- Technology stack implications
- Overall complexity assessment (SIMPLE/MEDIUM/COMPLEX/VERY COMPLEX)

**Explorer 2:** Dependencies & Risk Assessment
- Dependency chains and phases
- Risk factors (technical, integration, timeline)
- Critical path identification

**Explorer 3:** User Experience & Integration Points *(NEW)*
- Frontend/backend integration complexity
- User flow dependencies
- External API integration challenges
- Data flow and state management patterns

**Explorer 4:** Scalability & Performance Considerations *(NEW)*
- Performance bottlenecks and optimization needs
- Scalability concerns (database, API, frontend)
- Infrastructure requirements
- Deployment complexity

### Adaptive Spawning Logic

**In `/2l-plan` and `/2l-mvp` master exploration phase:**

```python
# Determine number of explorers based on vision complexity
vision_content = read_file(f"{PLAN_DIR}/vision.md")

# Count features, user stories, external integrations
feature_count = count_features(vision_content)
integration_count = count_external_integrations(vision_content)
has_performance_requirements = check_performance_requirements(vision_content)

# Decide explorer count
if feature_count < 5:
    num_explorers = 2  # Simple project
elif feature_count < 15 and integration_count < 3:
    num_explorers = 3  # Medium complexity
else:
    num_explorers = 4  # Complex/Very Complex

print(f"🔍 Spawning {num_explorers} master explorers for strategic analysis...")

# Spawn explorers in parallel
explorer_configs = {
    1: "Architecture & Complexity Analysis",
    2: "Dependencies & Risk Assessment",
    3: "User Experience & Integration Points",
    4: "Scalability & Performance Considerations"
}

for i in range(1, num_explorers + 1):
    spawn_master_explorer(
        id=i,
        focus=explorer_configs[i],
        vision_file=f"{PLAN_DIR}/vision.md",
        output_file=f"{PLAN_DIR}/master-exploration/master-explorer-{i}-report.md"
    )
```

### Update 2l-master-explorer.md Agent

**Add focus area definitions:**

```markdown
# Your Mission

Understand the BIG PICTURE to help the orchestrator decide:
- Single iteration or multi-iteration approach?
- If multi: How many iterations and what's the breakdown?
- What are the major architectural phases?
- What are the critical dependencies and risks?

# Your Focus Area

You will be assigned a specific focus area by the orchestrator:

- **Explorer 1:** Architecture & Complexity Analysis
- **Explorer 2:** Dependencies & Risk Assessment
- **Explorer 3:** User Experience & Integration Points *(if spawned)*
- **Explorer 4:** Scalability & Performance Considerations *(if spawned)*

Read your assignment and focus accordingly.

---

## Explorer 3: User Experience & Integration Points

**If you are Explorer 3, focus on:**

### Frontend/Backend Integration
- How do frontend and backend communicate? (REST, GraphQL, tRPC, etc.)
- Are there multiple frontend platforms? (Web, mobile, desktop)
- Complexity of state management (simple local state vs complex global state)

### User Flow Dependencies
- Do user flows span multiple features?
- Example: "User registration → profile setup → dashboard access"
- Which flows must be built together vs separately?

### External API Integration
- Third-party services (Stripe, Auth0, SendGrid, etc.)
- Data import/export requirements
- Webhook handling complexity

### Data Flow Patterns
- Client → Server → Database patterns
- Real-time requirements (WebSocket, SSE, polling)
- Caching strategies needed

**Your output should recommend:**
- Whether frontend/backend should be separate iterations
- Which integrations are high-risk and should be tackled early
- Where tight coupling requires coordinated development

---

## Explorer 4: Scalability & Performance Considerations

**If you are Explorer 4, focus on:**

### Performance Bottlenecks
- Database query complexity (N+1 queries, joins, indexes)
- API response time requirements
- Frontend bundle size and load time
- Real-time data update frequencies

### Scalability Concerns
- Expected data volume (rows in DB, API requests/second)
- Concurrent user requirements
- Horizontal vs vertical scaling needs
- Background job processing requirements

### Infrastructure Needs
- Database choice implications (PostgreSQL, MySQL, MongoDB, Redis)
- Caching layer requirements (Redis, in-memory)
- CDN needs for static assets
- Server-side rendering vs client-side rendering

### Deployment Complexity
- Containerization needs (Docker, Kubernetes)
- CI/CD pipeline requirements
- Environment management (dev, staging, prod)
- Database migration strategy

**Your output should recommend:**
- Whether performance optimization needs its own iteration
- Infrastructure setup that should happen in iteration 1
- Scalability constraints that affect architecture decisions
```

### Update Master Planning Logic

**In `/2l-plan` synthesis phase:**

```markdown
## Step 3: Read and Synthesize

Read all planning inputs:

1. **Vision document:** `{PLAN_DIR}/vision.md`
2. **Explorer reports:** All `master-explorer-{N}-report.md` files (2-4 explorers)

Synthesize findings across all explorers:
- Combine insights from all available reports
- Look for agreement and disagreement between explorers
- Weighted synthesis: All explorer recommendations matter

**Example with 4 explorers:**
- Explorer 1: "COMPLEX - recommend 3 iterations"
- Explorer 2: "HIGH RISK - recommend 3 iterations, put auth first"
- Explorer 3: "Frontend/backend tightly coupled - build together in each iteration"
- Explorer 4: "Database needs careful design - dedicate iteration 1 to foundation"

**Synthesis:**
- Complexity: COMPLEX (consensus)
- Iterations: 3 (consensus)
- Iteration 1: Auth + Database foundation (addresses Risk + Scalability concerns)
- Frontend/backend: Build together per iteration (addresses Integration concern)
```

### Validation Logic Updates

**Update resume points in `/2l-continue`:**

```bash
# Count completed master explorers
EXPLORER_COUNT=$(ls ${EXPLORATION_DIR}/master-explorer-*-report.md 2>/dev/null | wc -l)

# Determine expected count from config or default to 2
EXPECTED_EXPLORERS=$(yq eval '.master_exploration.num_explorers // 2' .2L/config.yaml)

if [ $EXPLORER_COUNT -lt $EXPECTED_EXPLORERS ]; then
    echo "📍 Master exploration incomplete ($EXPLORER_COUNT/$EXPECTED_EXPLORERS explorers)"
    echo "▶️ Resuming master exploration..."

    # Spawn remaining explorers
    # ...
fi
```

**Benefits of 4 Explorers:**
- ✅ Deeper strategic analysis for complex projects
- ✅ Catches integration challenges early
- ✅ Better performance/scalability planning
- ✅ Still parallel (no time penalty)
- ✅ Adaptive (simple projects still use 2)
- ✅ Better master plan quality

---

## Part 1: Dashboard Implementation

**Estimated Time:** 2-3 hours

### Design Decisions

**Stack:**
- Pure HTML/CSS/JavaScript (no build step)
- Single `index.html` file (< 500 lines total)
- Reads `.2L/config.yaml` + `.2L/events.jsonl`
- Polls for updates every 2 seconds

**Why This Approach:**
- ✅ Zero dependencies (no npm install)
- ✅ Double-click to open
- ✅ Built by an agent in < 2 minutes
- ✅ Works offline (no CDN imports)
- ✅ Mobile-friendly

**Multi-Project Support:**
- Each project has its own `.2L/dashboard/`
- Use `file://` protocol (recommended) - no port conflicts
- Or `python -m http.server` with dynamic ports
- Browser tabs show project name for easy identification

### File Structure

```
.2L/
├── config.yaml              # Add dashboard + mcp sections
├── events.jsonl             # Event stream (append-only)
└── dashboard/
    ├── index.html           # Complete dashboard
    └── README.md            # Usage instructions
```

### Event Stream Format

**File:** `.2L/events.jsonl`

Each line is a JSON event:
```jsonl
{"type":"plan_start","plan":"plan-3","timestamp":"2025-10-03T14:30:00Z"}
{"type":"iteration_start","iter":12,"phase":"exploration","timestamp":"2025-10-03T14:30:15Z"}
{"type":"agent_spawn","agent":"explorer-1","id":"exp-1-abc123","timestamp":"2025-10-03T14:30:20Z"}
{"type":"agent_complete","agent":"explorer-1","id":"exp-1-abc123","duration":45,"timestamp":"2025-10-03T14:31:05Z"}
{"type":"phase_change","from":"exploration","to":"planning","timestamp":"2025-10-03T14:32:00Z"}
{"type":"cost_update","tokens":12500,"cost_usd":0.15,"timestamp":"2025-10-03T14:32:00Z"}
{"type":"validation_result","status":"PASS","issues":0,"timestamp":"2025-10-03T14:35:00Z"}
{"type":"iteration_complete","iteration":12,"commit":"a3f4c21","timestamp":"2025-10-03T14:35:30Z"}
```

### Dashboard Features

**Minimal v1 (implement this):**

```
┌─────────────────────────────────────────────────┐
│ 2L Dashboard                    🟢 RUNNING      │
│ Project: finance-tracker                        │
├─────────────────────────────────────────────────┤
│ Plan: plan-3 (Finance Tracker MVP)              │
│ Iteration: 4/5 (global #12)                     │
│ Phase: Integration Round 2                      │
│ Cost: $4.32 | Elapsed: 12m 34s                  │
├─────────────────────────────────────────────────┤
│ Active Agents (3)                               │
│ ├─ integrator-1 [zone:db]    ⏱ 2m 15s          │
│ ├─ integrator-2 [zone:api]   ⏱ 1m 50s          │
│ └─ integrator-3 [zone:ui]    ⏱ 1m 45s          │
├─────────────────────────────────────────────────┤
│ MCP Servers                                     │
│ ├─ 🟢 Playwright                                │
│ ├─ 🟢 Chrome DevTools                           │
│ └─ 🟢 Supabase Local                            │
├─────────────────────────────────────────────────┤
│ Recent Events                                   │
│ 14:32:05  ✓ iplanner completed (12s)           │
│ 14:31:50  → integrator-3 spawned               │
│ 14:31:50  → integrator-2 spawned               │
│ 14:31:50  → integrator-1 spawned               │
│ 14:31:45  ✓ builder-2B completed (1m 34s)     │
└─────────────────────────────────────────────────┘
```

**Sections:**
1. **Header** - Project name, plan, iteration, phase, status
2. **Metrics Bar** - Cost, elapsed time, tokens
3. **Active Agents** - Currently running (no completion event yet)
4. **MCP Status** - Available servers
5. **Event Log** - Last 20 events, newest first

### Implementation Steps

#### Step 1.1: Create Event Logging Helper

**File:** `~/.claude/lib/2l-event-logger.sh` *(NEW)*

```bash
#!/bin/bash
# 2L Event Logger
# Usage: log_2l_event "type" "data_json"

log_2l_event() {
    local type=$1
    local data=$2
    local timestamp=$(date -Iseconds)

    # Ensure events file exists
    mkdir -p .2L
    touch .2L/events.jsonl

    # Build event JSON
    local event=$(jq -n \
        --arg type "$type" \
        --arg ts "$timestamp" \
        --argjson data "$data" \
        '{type: $type, timestamp: $ts} + $data')

    # Append to events file
    echo "$event" >> .2L/events.jsonl
}

# Export for use in commands
export -f log_2l_event
```

**Purpose:** Centralized event logging for all orchestration phases.

#### Step 1.2: Create Dashboard Builder Agent

**File:** `~/.claude/agents/2l-dashboard-builder.md` *(NEW)*

```markdown
---
name: 2l-dashboard-builder
description: Creates a real-time monitoring dashboard for 2L workflows
tools: Write
---

You are the 2L Dashboard Builder. Your mission: Create a self-contained HTML dashboard for monitoring 2L orchestration in real-time.

# Your Task

Create a single-file dashboard at: `.2L/dashboard/index.html`

# Requirements

## Technical
1. **Single HTML file** - HTML + CSS + JS inline (< 500 lines total)
2. **No dependencies** - Pure JavaScript, no npm, no build step, no CDN imports
3. **Real-time updates** - Poll `.2L/events.jsonl` every 2 seconds
4. **YAML parsing** - Read `.2L/config.yaml` for current state
5. **Works offline** - Can open via file:// protocol
6. **Mobile-friendly** - Responsive design

## Dashboard Structure

### 1. Header Section
```html
<header>
  <h1>2L Dashboard</h1>
  <div class="project-info">
    <strong id="project-name">Loading...</strong>
    <span id="project-path">/path/to/project</span>
  </div>
  <div id="status" class="status">🟢 RUNNING</div>
</header>
```

**JavaScript to populate:**
```javascript
// Detect project from file path
const path = window.location.pathname;
const projectPath = path.replace('/index.html', '').replace('/.2L/dashboard', '');
const projectName = projectPath.split('/').filter(x => x).pop() || 'Unknown Project';

// Set page title for browser tab identification
document.title = `2L Dashboard - ${projectName}`;

// Display in header
document.getElementById('project-name').textContent = projectName;
document.getElementById('project-path').textContent = projectPath;
```

### 2. Plan & Iteration Section
```html
<section class="plan-info">
  <div>Plan: <span id="plan-id">-</span> (<span id="plan-name">-</span>)</div>
  <div>Iteration: <span id="iteration-current">-</span>/<span id="iteration-total">-</span> (global #<span id="iteration-global">-</span>)</div>
  <div>Phase: <span id="current-phase">-</span></div>
</section>
```

### 3. Metrics Bar
```html
<section class="metrics">
  <div>Cost: $<span id="cost">0.00</span></div>
  <div>Elapsed: <span id="elapsed">0s</span></div>
  <div>Tokens: <span id="tokens">0</span></div>
</section>
```

### 4. Active Agents
```html
<section class="agents">
  <h2>Active Agents (<span id="agent-count">0</span>)</h2>
  <ul id="agent-list">
    <!-- Populated via JavaScript -->
  </ul>
</section>
```

**JavaScript logic:**
```javascript
// Track spawned agents
const activeAgents = new Map(); // id -> {agent, spawnTime}

events.forEach(event => {
  if (event.type === 'agent_spawn') {
    activeAgents.set(event.id, {
      agent: event.agent,
      spawnTime: new Date(event.timestamp)
    });
  } else if (event.type === 'agent_complete') {
    activeAgents.delete(event.id);
  }
});

// Render active agents
const agentList = document.getElementById('agent-list');
agentList.innerHTML = '';
activeAgents.forEach((data, id) => {
  const elapsed = Math.floor((Date.now() - data.spawnTime) / 1000);
  const li = document.createElement('li');
  li.textContent = `${data.agent} [${id.slice(0, 8)}] ⏱ ${formatDuration(elapsed)}`;
  agentList.appendChild(li);
});
```

### 5. MCP Server Status
```html
<section class="mcp-status">
  <h2>MCP Servers</h2>
  <ul>
    <li id="mcp-playwright">🟢 Playwright</li>
    <li id="mcp-chrome">🟢 Chrome DevTools</li>
    <li id="mcp-supabase">🟢 Supabase Local</li>
  </ul>
</section>
```

**Read from config.yaml:**
```javascript
fetch('./../config.yaml')
  .then(r => r.text())
  .then(yaml => {
    // Simple regex parsing (works for flat YAML)
    const playwrightEnabled = /playwright:\s*\n\s*enabled:\s*true/.test(yaml);
    const chromeEnabled = /chrome_devtools:\s*\n\s*enabled:\s*true/.test(yaml);
    const supabaseEnabled = /supabase:\s*\n\s*enabled:\s*true/.test(yaml);

    // Update UI
    document.getElementById('mcp-playwright').textContent =
      (playwrightEnabled ? '🟢' : '⚪') + ' Playwright';
    // ... etc
  });
```

### 6. Event Log
```html
<section class="events">
  <h2>Recent Events</h2>
  <ul id="event-list">
    <!-- Last 20 events, newest first -->
  </ul>
</section>
```

**JavaScript logic:**
```javascript
function renderEvents(events) {
  const eventList = document.getElementById('event-list');
  eventList.innerHTML = '';

  // Take last 20, reverse to show newest first
  const recentEvents = events.slice(-20).reverse();

  recentEvents.forEach(event => {
    const li = document.createElement('li');
    const time = new Date(event.timestamp).toLocaleTimeString();
    const icon = getEventIcon(event.type);

    li.innerHTML = `<span class="time">${time}</span> ${icon} ${formatEvent(event)}`;
    eventList.appendChild(li);
  });
}

function getEventIcon(type) {
  const icons = {
    'agent_spawn': '→',
    'agent_complete': '✓',
    'phase_change': '⚡',
    'validation_result': '🔍',
    'iteration_complete': '✅',
    'cost_update': '💰'
  };
  return icons[type] || '•';
}
```

## Reading JSONL

```javascript
function loadEvents() {
  fetch('./../events.jsonl')
    .then(r => r.text())
    .then(text => {
      const lines = text.trim().split('\n').filter(line => line);
      const events = lines.map(line => JSON.parse(line));
      processEvents(events);
    })
    .catch(err => {
      console.error('Failed to load events:', err);
    });
}

// Auto-refresh every 2 seconds
setInterval(loadEvents, 2000);
loadEvents(); // Initial load
```

## Styling

**Use dark theme:**
```css
body {
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

header {
  border-bottom: 2px solid #3a3a3a;
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.status {
  float: right;
  font-size: 1.2em;
}

section {
  background: #252526;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 5px;
}

h2 {
  margin-top: 0;
  color: #569cd6;
}

.metrics {
  display: flex;
  gap: 30px;
}

#agent-list li {
  padding: 5px 0;
  font-family: monospace;
}

.events .time {
  color: #858585;
  margin-right: 10px;
}
```

**Color coding:**
- Green (#4ec9b0): Success, complete
- Yellow (#dcdcaa): In progress, warnings
- Red (#f48771): Errors, failures
- Blue (#569cd6): Info, phase changes

## Output Files

### 1. `.2L/dashboard/index.html`
Complete self-contained dashboard (HTML + CSS + JS inline).

### 2. `.2L/dashboard/README.md`

```markdown
# 2L Dashboard

Real-time monitoring for 2L workflows.

## Usage

### Option 1: File Protocol (Recommended)
Open directly in browser - no server needed:

**macOS/Linux:**
```bash
open file://$(pwd)/.2L/dashboard/index.html
```

**Or manually:**
- Navigate to `.2L/dashboard/`
- Double-click `index.html`
- Opens in default browser

**Benefits:**
- ✅ No port conflicts
- ✅ Multiple projects simultaneously
- ✅ No server process to manage

### Option 2: Local Server (If Needed)
Use dynamic port to avoid conflicts:

```bash
cd .2L/dashboard

# Random available port
PORT=$(python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()")
python3 -m http.server $PORT

# Or use launch script
./launch.sh
```

**Multiple projects:**
```bash
# Project A - Terminal 1
cd ~/project-A/.2L/dashboard
python3 -m http.server 8001

# Project B - Terminal 2
cd ~/project-B/.2L/dashboard
python3 -m http.server 8002
```

### Option 3: Quick Launch Script

Create `.2L/dashboard/launch.sh`:
```bash
#!/bin/bash
PROJECT_NAME=$(basename $(cd ../.. && pwd))
PORT=$(shuf -i 8000-9000 -n 1)

echo "🚀 Starting dashboard for: $PROJECT_NAME"
echo "   URL: http://localhost:$PORT"
python3 -m http.server $PORT
```

Make executable: `chmod +x launch.sh`

## Features

- **Real-time updates** - Polls events every 2 seconds
- **Active agent monitoring** - See what's running now
- **Cost tracking** - Estimate token usage and costs
- **Event history** - Last 20 events with timestamps
- **MCP status** - Which servers are available
- **Multi-project support** - Each project isolated

## Browser Tab Identification

When multiple dashboards open, browser tabs show:
- Tab 1: "2L Dashboard - project-A"
- Tab 2: "2L Dashboard - project-B"
- Tab 3: "2L Dashboard - finance-tracker"

## Auto-Refresh

Dashboard polls `.2L/events.jsonl` every 2 seconds.
No manual refresh needed.

## Troubleshooting

**Dashboard not updating:**
- Check `.2L/events.jsonl` exists and has content
- Verify file:// permissions (some browsers restrict)
- Try http server option instead

**Multiple projects conflicting:**
- Use file:// protocol (no conflicts)
- Or use different ports for http server

**Styling issues:**
- Clear browser cache
- Ensure modern browser (Chrome, Firefox, Safari, Edge)
```

# Important Constraints

- **< 500 lines total** - Keep it lean
- **No external dependencies** - Everything inline
- **No CDN imports** - Must work offline
- **Works on file://** - No server required
- **Mobile responsive** - Works on narrow screens

# Implementation Note

You're creating a tool for developers watching long-running orchestration.
Prioritize clarity and real-time feedback over fancy features.

Now create the dashboard!
```

#### Step 1.3: Integrate Dashboard into `/2l-mvp`

**File:** `~/.claude/commands/2l-mvp.md`

**Add after mode detection, before Phase 1 (Exploration):**

```markdown
---

## Dashboard Initialization

echo "📊 Initializing dashboard..."

# Check if dashboard exists
if [ ! -f ".2L/dashboard/index.html" ]; then
    echo "   Creating dashboard (first run)..."

    mkdir -p .2L/dashboard

    # Spawn dashboard builder (fast, < 2 min)
    spawn_task(
        type="2l-dashboard-builder",
        description="Create dashboard",
        prompt="Create real-time monitoring dashboard for 2L orchestration.

Output files:
- .2L/dashboard/index.html (complete dashboard, < 500 lines)
- .2L/dashboard/README.md (usage instructions)

Requirements:
- Single HTML file (HTML + CSS + JS inline)
- No dependencies, works offline
- Polls .2L/events.jsonl every 2 seconds
- Shows: active agents, cost, events, MCP status
- Dark theme, mobile-friendly
- Project name in page title

Follow the detailed specifications in your agent definition."
    )

    echo "   ✅ Dashboard created!"
else
    echo "   ✅ Dashboard exists"
fi

# Display dashboard access info
echo ""
echo "📊 Dashboard available:"
echo "   file://$(pwd)/.2L/dashboard/index.html"
echo ""
echo "💡 Open in browser to watch progress in real-time!"
echo ""

# Initialize event stream
mkdir -p .2L
touch .2L/events.jsonl

# Source event logger
source ~/.claude/lib/2l-event-logger.sh

# Log plan start
log_2l_event "plan_start" "{\"plan\":\"${plan_id}\",\"level\":${LEVEL}}"

---
```

#### Step 1.4: Add Event Logging Throughout Orchestration

**In `/2l-mvp.md`, add logging at key orchestration points:**

**Master Exploration Phase:**
```bash
# Before spawning master explorers
log_2l_event "phase_change" "{\"from\":\"init\",\"to\":\"master_exploration\"}"

# When spawning each explorer
for explorer_id in $(seq 1 $num_explorers); do
    log_2l_event "agent_spawn" "{\"agent\":\"master-explorer-${explorer_id}\",\"id\":\"mexp-${explorer_id}-${RANDOM}\"}"
done

# After explorers complete
log_2l_event "agent_complete" "{\"agent\":\"master-explorer-${explorer_id}\",\"id\":\"mexp-${explorer_id}-${id}\",\"duration\":${elapsed_seconds}}"
```

**Iteration Phases:**
```bash
# Iteration start
log_2l_event "iteration_start" "{\"iteration\":${global_iter},\"phase\":\"exploration\"}"

# Phase transitions
log_2l_event "phase_change" "{\"from\":\"exploration\",\"to\":\"planning\",\"iteration\":${global_iter}}"
log_2l_event "phase_change" "{\"from\":\"planning\",\"to\":\"building\",\"iteration\":${global_iter}}"
log_2l_event "phase_change" "{\"from\":\"building\",\"to\":\"integration\",\"iteration\":${global_iter}}"

# Agent spawning (builders, integrators, etc.)
log_2l_event "agent_spawn" "{\"agent\":\"builder-${builder_id}\",\"id\":\"build-${builder_id}-${RANDOM}\",\"iteration\":${global_iter}}"
log_2l_event "agent_spawn" "{\"agent\":\"integrator-${int_id}\",\"id\":\"int-${int_id}-${RANDOM}\",\"iteration\":${global_iter},\"zone\":\"${zone_name}\"}"

# Agent completion
log_2l_event "agent_complete" "{\"agent\":\"builder-${builder_id}\",\"id\":\"${agent_id}\",\"duration\":${duration_sec},\"status\":\"${status}\"}"

# Validation
log_2l_event "phase_change" "{\"from\":\"integration\",\"to\":\"validation\",\"iteration\":${global_iter}}"
log_2l_event "validation_result" "{\"iteration\":${global_iter},\"status\":\"${validation_status}\",\"issues\":${issue_count}}"

# Healing (if needed)
log_2l_event "phase_change" "{\"from\":\"validation\",\"to\":\"healing\",\"iteration\":${global_iter},\"attempt\":${healing_attempt}}"

# Iteration complete
log_2l_event "iteration_complete" "{\"iteration\":${global_iter},\"commit\":\"${commit_hash}\",\"tag\":\"${git_tag}\"}"

# Cost tracking (estimate: ~$0.015 per 1k tokens for Sonnet 4)
# Track token usage throughout, log periodically
log_2l_event "cost_update" "{\"tokens\":${total_tokens},\"cost_usd\":${estimated_cost}}"
```

**Key Events to Log:**
1. `plan_start` - When `/2l-mvp` begins
2. `phase_change` - Every phase transition
3. `agent_spawn` - Every agent spawned
4. `agent_complete` - Every agent finishes
5. `cost_update` - Periodic token/cost updates
6. `validation_result` - Validation pass/fail
7. `iteration_complete` - Iteration done + commit
8. `error` - Any errors encountered

#### Step 1.5: Update config.yaml Structure

**Add dashboard and mcp sections:**

```yaml
# Global 2L Configuration
# Created: {timestamp}

# Current active plan
current_plan: plan-3

# Global iteration counter (across all plans)
global_iteration_counter: 12

# Current phase (for resumability)
current_phase: integration

# Dashboard configuration
dashboard:
  enabled: true
  created_at: "2025-10-03T14:30:00Z"
  url: "file://{project_path}/.2L/dashboard/index.html"

# MCP Server configuration (verified working)
mcp:
  playwright:
    enabled: true
    purpose: "E2E testing, browser automation"
  chrome_devtools:
    enabled: true
    purpose: "Performance profiling, console monitoring"
  supabase:
    enabled: true
    host: "127.0.0.1"
    port: 5432
    purpose: "Database validation, query testing"

# Master exploration configuration
master_exploration:
  num_explorers: 2  # or 3, 4 based on complexity

# Plans history
plans:
  - plan_id: plan-3
    name: "Finance Tracker MVP"
    status: IN_PROGRESS
    created_at: "2025-10-01T10:00:00Z"
    vision_file: .2L/plan-3/vision.md
    master_plan_file: .2L/plan-3/master-plan.yaml
    iterations:
      - iteration-10
      - iteration-11
      - iteration-12
      - iteration-13
      - iteration-14

# Next available iteration number
next_iteration_number: 15
```

---

## Part 2: MCP Integration Cleanup

**Estimated Time:** 1-2 hours

### Current Problems

1. **Agent prompts mention 5 MCPs** - 2 are broken
2. **No graceful degradation** - Agents don't know which work
3. **Confusing errors** - "GitHub auth failed" during validation
4. **Not essential** - GitHub/Screenshot aren't core to 2L workflow

### Solution Approach

**Keep these 3 MCPs (all verified working):**
- ✅ **Playwright MCP** - E2E testing, browser automation
- ✅ **Chrome DevTools MCP** - Performance profiling, debugging
- ✅ **Supabase Local MCP** - Database validation (PostgreSQL 15.6)

**Remove references to these 2:**
- ❌ **GitHub MCP** - Auth broken, not essential for core workflow
- ❌ **Screenshot MCP** - Platform incompatible (Linux), not essential

**Strategy:**
- Static config (hardcode 3 working MCPs)
- Remove all GitHub/Screenshot references
- Standardize MCP sections across all agents
- Add "optional, skip gracefully" guidance

### Implementation Steps

#### Step 2.1: Update config.yaml MCP Section

**Already shown in Step 1.5 above.** Config only lists 3 working MCPs.

#### Step 2.2: Standardized MCP Section Template

**Use this template in all agent prompts:**

```markdown
# MCP Integration

You have access to 3 verified MCP servers for enhanced {validation/building/testing}:

**1. Playwright MCP** - E2E testing, browser automation
   - Test complete user journeys
   - Verify forms submit correctly
   - Check navigation flows
   - Validate error handling in UI

**2. Chrome DevTools MCP** - Performance profiling, debugging
   - Record performance traces (Core Web Vitals: LCP, FCP, CLS)
   - Monitor console errors and warnings
   - Analyze network requests
   - Test under CPU/network throttling

**3. Supabase Local MCP** - Database validation
   - Verify schema migrations applied
   - Check RLS policies enabled
   - Test queries and constraints
   - Validate seed data exists

**Usage Notes:**
- MCPs are **optional** but highly recommended
- If MCP call fails, skip gracefully and note in report
- Don't block on MCP issues - core validation can proceed without them
```

#### Step 2.3: Update Each Agent File

**Files to modify (6 total):**

##### 1. `~/.claude/agents/2l-validator.md`

**BEFORE (lines ~4-44):**
```markdown
# Available MCP Servers

You have access to powerful validation tools via MCP:

## 1. Playwright MCP (E2E Testing)
...

## 2. Chrome DevTools MCP (Performance & Debugging)
...

## 3. Supabase Local MCP (Database Validation)
...

## 4. Screenshot MCP (Visual Testing)
**Use for:** UI validation and documentation
- Capture current UI state
- Compare against design requirements
- Document visual bugs
```

**AFTER:**
```markdown
# MCP Integration

You have access to 3 verified MCP servers for enhanced validation:

**1. Playwright MCP** - E2E testing, browser automation
   - Test complete user journeys
   - Verify forms submit correctly
   - Check navigation flows
   - Validate error handling in UI

**2. Chrome DevTools MCP** - Performance profiling, debugging
   - Record performance traces (Core Web Vitals: LCP, FCP, CLS)
   - Monitor console errors and warnings
   - Analyze network requests
   - Test under CPU/network throttling

**3. Supabase Local MCP** - Database validation
   - Verify schema migrations applied
   - Check RLS policies enabled
   - Test queries and constraints
   - Validate seed data exists

**Usage Notes:**
- MCPs are **optional** but highly recommended
- If MCP call fails, skip gracefully and note in report
- Don't block on MCP issues - core validation can proceed without them

**MCP-Based Validation Section (Step 9):**

After running standard checks (TypeScript, tests, build), use MCPs for deeper validation:

### A. Chrome DevTools Performance Check
```bash
# Example pseudo-code for what validator should attempt
if mcp_available("chrome-devtools"); then
  navigate_to_app()
  start_performance_trace()
  interact_with_key_features()
  metrics = stop_trace_and_analyze()

  # Check Core Web Vitals
  # - First Contentful Paint < 1.5s
  # - Largest Contentful Paint < 2.5s
  # - Cumulative Layout Shift < 0.1

  report_metrics(metrics)
else
  note("Chrome DevTools MCP unavailable, skipping performance validation")
fi
```

### B. Console Error Monitoring
```bash
if mcp_available("chrome-devtools"); then
  navigate_through_all_routes()
  console_messages = capture_console()

  errors = filter_errors(console_messages)
  warnings = filter_warnings(console_messages)

  report_console_health(errors, warnings)
else
  note("Chrome DevTools MCP unavailable, skipping console monitoring")
fi
```

### C. Playwright E2E Validation
```bash
if mcp_available("playwright"); then
  test_critical_user_flows()
  # Examples:
  # - User registration/login
  # - Core feature usage
  # - Form submissions
  # - Navigation between pages
  # - Error state handling

  report_e2e_results()
else
  note("Playwright MCP unavailable, skipping E2E tests")
fi
```

### D. Database Validation
```sql
-- If Supabase MCP available

-- 1. Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- 2. Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 3. Verify seed data
SELECT count(*) FROM {main_tables};

-- 4. Test foreign key constraints
-- Attempt queries with joins

-- If unavailable, note and skip
```

**In validation report template, add MCP section:**
```markdown
### MCP-Based Validation

**Playwright E2E Tests:**
Status: ✅ PASS / ⚠️ SKIPPED / ❌ FAIL
Result: {details}

**Chrome DevTools Performance:**
Status: ✅ PASS / ⚠️ SKIPPED / ❌ FAIL
Core Web Vitals: {metrics}

**Supabase Database Checks:**
Status: ✅ PASS / ⚠️ SKIPPED / ❌ FAIL
Schema validation: {details}
```
```

##### 2. `~/.claude/agents/2l-builder.md`

**Find and update MCP section (if exists, around line ~20-40):**

**REPLACE with:**
```markdown
# MCP Integration

You have access to 3 verified MCP servers to enhance your build:

**1. Playwright MCP** - E2E testing
   - Test the components/features you build
   - Verify user flows work end-to-end
   - Check form submissions and navigation

**2. Chrome DevTools MCP** - Development debugging
   - Verify no console errors in your code
   - Check performance of what you built
   - Monitor network requests

**3. Supabase Local MCP** - Database operations
   - Test database queries you write
   - Verify schema changes work
   - Check data validation

**Usage:**
- Use MCPs when appropriate for your build
- If unavailable, continue without them
- Note in your report what you tested and how
```

##### 3. `~/.claude/agents/2l-healer.md`

**Find and update MCP section:**

**REPLACE with:**
```markdown
# MCP Integration

You have access to 3 verified MCP servers for debugging and fixing:

**1. Playwright MCP** - Test fixes in browser
   - Verify fix works in real browser
   - Test user flows after fix
   - Check error states resolved

**2. Chrome DevTools MCP** - Debug issues
   - Monitor console for errors
   - Check network requests
   - Profile performance issues

**3. Supabase Local MCP** - Database debugging
   - Test database queries
   - Verify data integrity
   - Check constraint fixes

**Usage:**
- Use MCPs to verify your fixes work
- If unavailable, test fixes manually and note in report
- Don't block on MCP availability
```

##### 4. `~/.claude/agents/2l-planner.md`

**Add new section after tech-stack.md specification:**

```markdown
## 3. patterns.md (MOST IMPORTANT FOR BUILDERS)

...existing patterns.md spec...

### MCP Integration Patterns

At the end of patterns.md, include MCP usage patterns:

```markdown
## MCP Integration Patterns

You have access to 3 MCP servers for enhanced development and testing.

### Playwright MCP - E2E Testing

**When to use:** Testing complete user flows

**Example pattern:**
\`\`\`javascript
// E2E test for login flow
async function testLoginFlow() {
  await playwright.navigate('http://localhost:3000');
  await playwright.fill('#email', 'test@example.com');
  await playwright.fill('#password', 'password123');
  await playwright.click('#login-button');
  await playwright.waitFor('text=Dashboard');

  // Verify successful login
  const url = await playwright.getUrl();
  assert(url.includes('/dashboard'));
}
\`\`\`

### Chrome DevTools MCP - Performance

**When to use:** Checking Core Web Vitals, debugging

**Example pattern:**
\`\`\`javascript
// Performance trace
async function checkPerformance() {
  await chromeDevTools.navigate('http://localhost:3000');
  await chromeDevTools.startPerformanceTrace();

  // Interact with page
  await chromeDevTools.click('#load-data');
  await chromeDevTools.wait(2000);

  const metrics = await chromeDevTools.stopPerformanceTrace();

  // Check Core Web Vitals
  console.log('LCP:', metrics.largestContentfulPaint); // Target: < 2.5s
  console.log('FCP:', metrics.firstContentfulPaint);   // Target: < 1.5s
  console.log('CLS:', metrics.cumulativeLayoutShift);  // Target: < 0.1
}
\`\`\`

### Supabase Local MCP - Database

**When to use:** Schema validation, query testing

**Example pattern:**
\`\`\`sql
-- Verify table schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check RLS policies active
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Test query with joins
SELECT u.email, COUNT(t.id) as transaction_count
FROM users u
LEFT JOIN transactions t ON t.user_id = u.id
GROUP BY u.id;
\`\`\`

**Note:** All MCP tools are optional. If unavailable, skip gracefully.
```
```

##### 5. `~/.claude/commands/2l-task.md`

**Find MCP section (around line ~90-150), REPLACE with:**

```markdown
# MCP Integration

You have access to 3 verified MCP servers:

**1. Playwright MCP** - E2E testing, browser automation
**2. Chrome DevTools MCP** - Performance profiling, debugging
**3. Supabase Local MCP** - Database operations

These are available to both builder and healer agents in task mode.

**Example usage in agent prompt:**

"You are a 2L {Builder/Healer} in Quick Task mode.

Task: $ARGUMENTS

Available MCP tools:
- Playwright MCP: Test in browser
- Chrome DevTools MCP: Debug and profile
- Supabase MCP: Database operations

Use MCPs when helpful. If unavailable, continue without them."
```

##### 6. `~/.claude/commands/2l-mvp.md`

**Update MCP server list in comments (around line ~1004):**

**BEFORE:**
```markdown
## MCP Server Availability

You have access to powerful Model Context Protocol servers:

- **Playwright MCP** - Browser automation and testing
- **Chrome DevTools MCP** - Performance profiling and debugging
- **Supabase Local MCP** - Database operations (port 5432)
- **GitHub MCP** - Code research and pattern discovery
- **Screenshot MCP** - Visual testing and documentation

These are available to all agents throughout the 2L workflow.
```

**AFTER:**
```markdown
## MCP Server Availability

You have access to 3 verified Model Context Protocol servers:

- **Playwright MCP** - Browser automation, E2E testing
- **Chrome DevTools MCP** - Performance profiling, console monitoring
- **Supabase Local MCP** - Database operations (PostgreSQL on port 5432)

These are available to all agents throughout the 2L workflow.
MCPs are optional - agents should skip gracefully if unavailable.
```

#### Step 2.4: Remove All GitHub/Screenshot References

**Search and remove strategy:**

```bash
cd ~/.claude

# Find all files mentioning GitHub MCP
grep -r "GitHub MCP" agents/ commands/ 2>/dev/null

# Find all files mentioning Screenshot MCP
grep -r "Screenshot MCP" agents/ commands/ 2>/dev/null

# Manually edit each file found to remove those sections
```

**Expected files with references:**
- `agents/2l-validator.md` - Remove GitHub/Screenshot sections ✅ (already done above)
- `agents/2l-builder.md` - Remove Screenshot references ✅ (already done above)
- `commands/2l-task.md` - Remove GitHub/Screenshot ✅ (already done above)
- `commands/2l-mvp.md` - Update MCP list ✅ (already done above)

**Verification:**
```bash
# After edits, verify removal
grep -r "GitHub MCP" ~/.claude/ && echo "❌ Still found" || echo "✅ Removed"
grep -r "Screenshot MCP" ~/.claude/ && echo "❌ Still found" || echo "✅ Removed"

# Verify 3 MCPs still mentioned
grep -r "Playwright MCP" ~/.claude/ | wc -l  # Should be ~5-6 files
grep -r "Chrome DevTools MCP" ~/.claude/ | wc -l  # Should be ~5-6 files
grep -r "Supabase.*MCP" ~/.claude/ | wc -l  # Should be ~5-6 files
```

---

## Part 3: Honesty in Validation Reports

**Estimated Time:** 30 minutes

### Problem

Validators/ivalidators might report optimistic results to "complete" their task. This wastes time and creates false confidence.

**Better:** Report uncertainty, incomplete checks, or partial success honestly.

### Principle

> **"Better to report false incompletion than false completion."**

### Implementation

#### Step 3.1: Update 2l-validator.md

**Add new section after "Your Mission":**

```markdown
# Reporting Standards: Honesty Over Optimism

**CRITICAL PRINCIPLE:**
Better to report uncertainty or incompletion than false success.

## Decision Framework

When in doubt about a validation result:

1. **Report PARTIAL** not PASS
2. **Note confidence level** (%, LOW/MEDIUM/HIGH)
3. **Explain what you couldn't verify**
4. **Provide specific file/line references**
5. **Recommend next action** (accept with caveat, manual review, extend healing)

## Examples of Honest Reporting

### Example 1: Uncertain About Type Safety

**✅ GOOD:**
```markdown
## TypeScript Compilation
Status: ⚠️ UNCERTAIN

Result: Build completed but with 3 warnings about implicit 'any' types.
Files affected:
- src/auth/oauth.ts:45-67
- src/utils/format.ts:23

Confidence: 70% - types compile but may not be fully sound.

Recommendation:
- Accept if implicit 'any' is intentional
- Or: Manual review of type annotations
- Or: Extend healing to add explicit types
```

**❌ BAD:**
```markdown
## TypeScript Compilation
Status: ✅ PASS

Result: Build completed successfully. A few warnings but nothing critical.
```

### Example 2: Incomplete Test Coverage

**✅ GOOD:**
```markdown
## Test Coverage
Status: ⚠️ PARTIAL

Coverage: 78% (target: 80%)
Untested areas:
- File: src/api/auth.ts (45% coverage)
  - Lines 89-134: Complex async error handling
  - Reason: Test setup for OAuth mocking proved difficult

Confidence: 60% - Core flows tested, edge cases not fully covered.

Recommendation:
- Accept with caveat: Document untested paths
- Or: Extend healing to improve auth.ts test coverage
- Or: Manual verification of OAuth error flows
```

**❌ BAD:**
```markdown
## Test Coverage
Status: ✅ PASS

Coverage: 78% (close enough to 80% target)
Most important code is tested.
```

### Example 3: MCP Unavailable

**✅ GOOD:**
```markdown
## E2E Testing
Status: ⚠️ SKIPPED

Reason: Playwright MCP connection timeout after 30s (unknown cause).

Alternative validation performed:
- Manual smoke test of 3 critical flows: ✓
  - Login flow: Works
  - Transaction creation: Works
  - Dashboard navigation: Partial (one tab throws console error)

Confidence: 60% - Manual testing suggests mostly functional, but not comprehensive.

Recommendation:
- Investigate Playwright MCP connectivity issue
- Or: Accept with caveat that E2E testing incomplete
- Or: Schedule manual QA session
```

**❌ BAD:**
```markdown
## E2E Testing
Status: ✅ PASS

Tested manually - everything works fine.
```

### Example 4: Gray Area on Validation Check

**✅ GOOD:**
```markdown
## Performance Validation
Status: ⚠️ UNCERTAIN

Core Web Vitals measured:
- LCP: 2.7s (target: < 2.5s) ❌ Slightly over
- FCP: 1.3s (target: < 1.5s) ✅
- CLS: 0.05 (target: < 0.1) ✅

Uncertainty: LCP is 0.2s over target (8% deviation).
- Measured on localhost (production may differ)
- Not a hard failure, but borderline

Recommendation:
- Accept if localhost performance acceptable
- Or: Optimize LCP before deployment (image lazy-loading?)
- Or: Test on production-like environment for final verdict
```

**❌ BAD:**
```markdown
## Performance Validation
Status: ✅ PASS

Core Web Vitals look good. LCP slightly over but close enough.
```

## When You Cannot Complete a Check

**Report the gap explicitly:**

```markdown
### Check: Shared Code Utilization
Status: ⚠️ INCOMPLETE

Attempted analysis:
- Builder-1 created `formatDate()` utility in utils.ts
- Builder-3 appears to have similar date formatting logic
- Could not determine if Builder-3 imports utils.ts or reimplements

Reason: Build output doesn't preserve import metadata clearly enough for automated analysis.

Confidence: 40% - insufficient evidence to validate this check.

Recommendation:
- Manual code review of Builder-3's date formatting code
- Or: Accept with caveat that code duplication may exist
- Or: Add import analysis tooling for future iterations
```

## The 80% Confidence Rule

**If you're less than 80% confident in a PASS verdict:**
- Report as ⚠️ UNCERTAIN or ⚠️ PARTIAL
- Explain your confidence level and why
- List what would increase confidence to 80%+

## Remember

**Your job:** Provide accurate signal, not optimistic noise.

**Users prefer:**
- Honest "PARTIAL - here's what's incomplete"
- Over false "PASS - everything's great!"

When unsure, flag it. Let humans make the final call.
```

#### Step 3.2: Update 2l-ivalidator.md

**Add similar section after "Your Mission":**

```markdown
# Honesty in Cohesion Assessment

Your job is to validate **organic cohesion** - whether code fits together naturally. This is often subjective and nuanced.

## When Checks Have Gray Areas

Not all cohesion checks are binary PASS/FAIL. When uncertain:

### Example 1: Possible Duplication vs. Intentional Separation

**✅ GOOD:**
```markdown
### Check 3: Type Consistency
Status: ⚠️ UNCERTAIN

Findings:
- Two similar types found:
  - `User` (src/types/user.ts) - Has: id, email, name, createdAt
  - `UserProfile` (src/types/profile.ts) - Has: id, email, name, bio, avatar
- Overlap: 75% of fields (email, name)

Uncertainty: Are these intentionally separate concerns or accidental duplication?
- If separate: User = auth, UserProfile = display → Acceptable
- If duplication: Should consolidate → Needs fixing

Evidence insufficient to determine intent from code alone.

Recommendation:
- Review builder reports for context
- Or: Accept with documentation requirement
- Or: Flag for manual review with builders
```

**❌ BAD:**
```markdown
### Check 3: Type Consistency
Status: ✅ PASS

Two user types found but they look different enough. Probably intentional.
```

### Example 2: Import Pattern Unclear

**✅ GOOD:**
```markdown
### Check 5: Import Consistency
Status: ⚠️ PARTIAL

Analysis:
- Builder-1 uses absolute imports: `import { User } from '@/types/user'`
- Builder-2 uses relative imports: `import { formatDate } from '../utils/format'`
- Builder-3 mixes both styles

Findings:
- 60% absolute imports
- 40% relative imports
- No clear pattern established in patterns.md

Is this acceptable?
- If no convention specified: PARTIAL (inconsistent but not broken)
- If convention exists: FAIL (should follow patterns.md)

Could not find import convention in patterns.md.

Recommendation:
- Accept with note: Establish import convention for future
- Or: Standardize in healing phase (minor refactor)
```

**❌ BAD:**
```markdown
### Check 5: Import Consistency
Status: ✅ PASS

Imports work fine. Some variation is normal.
```

### Example 3: Evidence Insufficient

**✅ GOOD:**
```markdown
### Check 6: Shared Code Utilization
Status: ⚠️ INCOMPLETE

Analysis attempted:
- Builder-1 created `formatCurrency()` utility
- Builder-3 has currency formatting logic
- Cannot verify if Builder-3 imports utils or reimplements

Reason: Static analysis of build output doesn't preserve import graph.

Confidence: 40% - cannot fully validate this check with available data.

Alternative approach needed:
- Runtime import analysis
- Or: Manual code review
- Or: Accept limitation and note for future tooling

Recommendation: Accept with caveat that shared code usage validation incomplete.
```

**❌ BAD:**
```markdown
### Check 6: Shared Code Utilization
Status: ✅ PASS

Utilities seem to be reused where appropriate.
```

## The 80% Confidence Rule

If your confidence in a cohesion PASS is below 80%:
1. Report as ⚠️ UNCERTAIN or ⚠️ INCOMPLETE
2. Explain confidence level numerically (e.g., "Confidence: 65%")
3. State what evidence would increase confidence
4. Recommend next action (accept with caveat, manual review, extend round)

## Integration Round Recommendations

Based on your assessment:

**If PASS (high confidence):**
```markdown
Status: ✅ PASS
Recommendation: Proceed to validation phase.
```

**If UNCERTAIN (medium confidence):**
```markdown
Status: ⚠️ UNCERTAIN
Recommendation:
- Accept and proceed (if time-constrained)
- Or: Manual review of flagged areas
- Or: Another integration round with focused fixes
```

**If FAIL (clear issues):**
```markdown
Status: ❌ FAIL
Critical issues: {count}
Recommendation: Start integration round {N+1} to address issues.
```

**If INCOMPLETE (evidence lacking):**
```markdown
Status: ⚠️ INCOMPLETE
Checks incomplete: {list}
Recommendation:
- Accept with documented limitations
- Or: Add tooling/analysis for missing checks
- Or: Manual validation of incomplete areas
```

## Remember

**Organic cohesion is subjective.** Your honest assessment of uncertainty is MORE valuable than false confidence.

**Orchestrator trusts your signal.** If you say PASS, healing is skipped. If you say UNCERTAIN, humans can decide.

When in doubt, flag it. Provide evidence. Let the system adapt.
```

---

## Part 4: Testing & Validation

**Estimated Time:** 1 hour

### Step 4.1: Test Dashboard Creation

```bash
cd /home/ahiya/Ahiya/2L

# Create minimal test structure
mkdir -p .2L
cat > .2L/config.yaml <<EOF
current_plan: plan-test
global_iteration_counter: 1
mcp:
  playwright:
    enabled: true
  chrome_devtools:
    enabled: true
  supabase:
    enabled: true
EOF

# Manually test dashboard builder (or trigger via /2l-mvp stub)
# Expected: .2L/dashboard/index.html created
# Expected: .2L/dashboard/README.md created

# Verify dashboard file
ls -lh .2L/dashboard/
file .2L/dashboard/index.html  # Should be HTML

# Verify file size (should be < 50KB for ~500 lines)
du -h .2L/dashboard/index.html

# Test opening dashboard
xdg-open file://$(pwd)/.2L/dashboard/index.html
# Or: firefox file://$(pwd)/.2L/dashboard/index.html

# Verify dashboard renders
# Expected: Shows "Project: 2L", empty events, 3 green MCP dots
```

### Step 4.2: Test Event Logging

```bash
# Source event logger
source ~/.claude/lib/2l-event-logger.sh

# Generate test events
log_2l_event "plan_start" '{"plan":"plan-test","level":1}'
log_2l_event "agent_spawn" '{"agent":"test-agent","id":"test-123"}'
sleep 5
log_2l_event "agent_complete" '{"agent":"test-agent","id":"test-123","duration":5}'
log_2l_event "phase_change" '{"from":"test","to":"complete"}'

# Verify events.jsonl
cat .2L/events.jsonl
# Expected: 4 JSON lines

# Refresh dashboard (or wait 2s for auto-refresh)
# Expected: Events appear in "Recent Events" section
# Expected: Agent appears briefly in "Active Agents", then removed after completion
```

### Step 4.3: Test Multi-Dashboard Support

```bash
# Simulate two concurrent projects

# Project A
cd /tmp/project-a
mkdir -p .2L/dashboard
echo "current_plan: plan-a" > .2L/config.yaml
echo '{"type":"test","project":"A"}' > .2L/events.jsonl
# Copy dashboard from 2L folder or create stub
cp /home/ahiya/Ahiya/2L/.2L/dashboard/index.html .2L/dashboard/

# Project B
cd /tmp/project-b
mkdir -p .2L/dashboard
echo "current_plan: plan-b" > .2L/config.yaml
echo '{"type":"test","project":"B"}' > .2L/events.jsonl
cp /home/ahiya/Ahiya/2L/.2L/dashboard/index.html .2L/dashboard/

# Open both dashboards
firefox file:///tmp/project-a/.2L/dashboard/index.html &
firefox file:///tmp/project-b/.2L/dashboard/index.html &

# Verify:
# - Browser tab 1: "2L Dashboard - project-a"
# - Browser tab 2: "2L Dashboard - project-b"
# - Each shows its own events
# - No cross-contamination
```

### Step 4.4: Test MCP References

```bash
cd ~/.claude

# Verify GitHub MCP removed
grep -r "GitHub MCP" agents/ commands/ 2>/dev/null
# Expected: No output (or only in git history)

# Verify Screenshot MCP removed
grep -r "Screenshot MCP" agents/ commands/ 2>/dev/null
# Expected: No output

# Verify 3 MCPs mentioned correctly
grep -r "Playwright MCP" agents/ commands/ | wc -l
# Expected: ~5-6 occurrences

grep -r "Chrome DevTools MCP" agents/ commands/ | wc -l
# Expected: ~5-6 occurrences

grep -r "Supabase.*MCP" agents/ commands/ | wc -l
# Expected: ~5-6 occurrences

# Check for consistent MCP sections
grep -A10 "# MCP Integration" agents/2l-validator.md
grep -A10 "# MCP Integration" agents/2l-builder.md
grep -A10 "# MCP Integration" agents/2l-healer.md
# Should all follow similar format
```

### Step 4.5: Test Master Explorer Expansion

```bash
# Test adaptive spawning logic
cd /home/ahiya/Ahiya/2L

# Create test vision with varying complexity
cat > .2L/plan-test/vision.md <<EOF
# Test Vision

## Features
1. User auth
2. Dashboard
3. Transactions
4. Reports
5. Settings
EOF

# Check explorer count logic
# Simple (< 5 features): Should spawn 2 explorers
# Expected: 2 master-explorer agents

# Add more features
cat >> .2L/plan-test/vision.md <<EOF
6. Budgets
7. Goals
8. Categories
9. Export
10. Import
11. Notifications
12. Multi-currency
13. Recurring transactions
14. Analytics
15. API integration
EOF

# Complex (15 features): Should spawn 4 explorers
# Expected: 4 master-explorer agents

# Verify config tracks explorer count
cat .2L/config.yaml | grep num_explorers
# Expected: num_explorers: 4
```

### Step 4.6: End-to-End Test

```bash
# Run a quick task with dashboard
cd /home/ahiya/Ahiya/2L
/2l-task "Add console.log to main.ts for testing"

# Verify sequence:
# 1. Dashboard created (if first run)
# 2. Events logged to .2L/events.jsonl
# 3. Dashboard shows agent activity
# 4. No errors about missing MCPs
# 5. Task completes

# Check dashboard
xdg-open file://$(pwd)/.2L/dashboard/index.html

# Verify event log shows:
# - plan_start (or task_start)
# - agent_spawn (builder or healer)
# - agent_complete
# - validation events
# - task complete

# Check for MCP errors
grep -i "github" .2L/tasks/*/builder-report.md  # Should be none
grep -i "screenshot" .2L/tasks/*/builder-report.md  # Should be none
```

---

## Implementation Checklist

### Phase 1: Dashboard (2-3 hours)

**Setup:**
- [ ] Create `~/.claude/lib/2l-event-logger.sh`
- [ ] Test event logger manually
- [ ] Create `~/.claude/agents/2l-dashboard-builder.md`

**Integration:**
- [ ] Update `/2l-mvp` to initialize dashboard
- [ ] Add event logging to master exploration phase
- [ ] Add event logging to iteration start
- [ ] Add event logging to phase transitions
- [ ] Add event logging to agent spawning (all types)
- [ ] Add event logging to agent completion (all types)
- [ ] Add event logging to validation results
- [ ] Add event logging to iteration completion
- [ ] Add cost tracking events (estimate tokens)

**Config:**
- [ ] Update `config.yaml` structure (add dashboard section)
- [ ] Update `config.yaml` structure (add mcp section)

**Testing:**
- [ ] Test dashboard creation
- [ ] Test event stream generation
- [ ] Test dashboard rendering
- [ ] Test multi-project support
- [ ] Test file:// vs http server modes

### Phase 2: MCP Cleanup (1-2 hours)

**Agent Updates:**
- [ ] Update `2l-validator.md` (remove GitHub/Screenshot, add honesty section)
- [ ] Update `2l-builder.md` (standardize MCP section)
- [ ] Update `2l-healer.md` (standardize MCP section)
- [ ] Update `2l-planner.md` (add MCP patterns generation)
- [ ] Update `2l-task.md` (standardize MCP section)
- [ ] Update `2l-mvp.md` (update MCP server list)

**Cleanup:**
- [ ] Search for "GitHub MCP" references
- [ ] Remove all GitHub MCP sections
- [ ] Search for "Screenshot MCP" references
- [ ] Remove all Screenshot MCP sections
- [ ] Verify 3 MCPs consistently mentioned

**Testing:**
- [ ] Grep verification (no GitHub/Screenshot found)
- [ ] Grep verification (3 MCPs found in expected files)
- [ ] Read through each updated file manually
- [ ] Test that validator doesn't error on missing MCPs

### Phase 3: Master Explorer Expansion (30 min)

**Agent Update:**
- [ ] Update `2l-master-explorer.md` (add Explorer 3 & 4 definitions)
- [ ] Add adaptive spawning logic to `/2l-mvp`
- [ ] Add adaptive spawning logic to `/2l-plan`
- [ ] Update resume detection in `/2l-continue`
- [ ] Update config to track `num_explorers`

**Testing:**
- [ ] Test with simple vision (2 explorers)
- [ ] Test with complex vision (4 explorers)
- [ ] Verify parallel execution
- [ ] Verify master plan synthesis uses all reports

### Phase 4: Honesty Guidance (30 min)

**Agent Updates:**
- [ ] Add honesty section to `2l-validator.md`
- [ ] Add honesty section to `2l-ivalidator.md`
- [ ] Update validation report templates with confidence levels
- [ ] Update ivalidation report templates with uncertainty flags

**Testing:**
- [ ] Manual review of updated guidance
- [ ] Verify examples are clear and actionable

### Phase 5: End-to-End Testing (1 hour)

- [ ] Run `/2l-task` test
- [ ] Verify dashboard created
- [ ] Verify events logged
- [ ] Verify dashboard updates in real-time
- [ ] Verify no MCP errors
- [ ] Verify cost tracking
- [ ] Test multi-project scenario
- [ ] Test master explorer adaptive count

**Total estimated:** ~5-7 hours

---

## File Change Summary

### New Files (3)

1. **`~/.claude/lib/2l-event-logger.sh`**
   - Event logging helper function
   - Appends JSON events to `.2L/events.jsonl`
   - ~30 lines

2. **`~/.claude/agents/2l-dashboard-builder.md`**
   - Agent that creates dashboard
   - Builds single HTML file with inline CSS/JS
   - ~250 lines

3. **`.2L/dashboard/index.html`** *(generated by agent)*
   - Self-contained dashboard
   - Polls events.jsonl, displays real-time status
   - ~450 lines (HTML + CSS + JS)

### Modified Files (8)

4. **`~/.claude/commands/2l-mvp.md`**
   - Add dashboard initialization
   - Add event logging throughout orchestration
   - Add master explorer adaptive spawning
   - Update MCP server list
   - ~50 lines added, ~10 lines modified

5. **`~/.claude/commands/2l-plan.md`**
   - Add master explorer adaptive spawning
   - Update synthesis to handle 2-4 explorer reports
   - ~30 lines added

6. **`~/.claude/commands/2l-continue.md`**
   - Update master exploration resume detection
   - Check for 2-4 explorers based on config
   - ~15 lines modified

7. **`~/.claude/agents/2l-master-explorer.md`**
   - Add Explorer 3 & 4 focus areas
   - Define 4 strategic dimensions
   - ~80 lines added

8. **`~/.claude/agents/2l-validator.md`**
   - Remove GitHub/Screenshot MCP sections
   - Add honesty in reporting guidance
   - Standardize MCP section (3 MCPs only)
   - Update validation report template
   - ~60 lines added, ~40 lines removed

9. **`~/.claude/agents/2l-ivalidator.md`**
   - Add honesty in cohesion assessment guidance
   - Update ivalidation report template
   - ~50 lines added

10. **`~/.claude/agents/2l-builder.md`**
    - Standardize MCP section (3 MCPs only)
    - Remove Screenshot references
    - ~10 lines modified

11. **`~/.claude/agents/2l-healer.md`**
    - Standardize MCP section (3 MCPs only)
    - ~10 lines modified

12. **`~/.claude/agents/2l-planner.md`**
    - Add MCP patterns generation to patterns.md spec
    - ~40 lines added

13. **`~/.claude/commands/2l-task.md`**
    - Update MCP section (3 MCPs only)
    - Remove GitHub/Screenshot
    - ~15 lines modified

### Config Changes

14. **`.2L/config.yaml`** *(updated structure)*
    - Add `dashboard:` section
    - Add `mcp:` section
    - Add `master_exploration.num_explorers` field
    - Template changes, not a file edit

### Total Changes

- **3 new files** (~700 lines)
- **10 modified files** (~350 lines added/modified)
- **~1050 total lines of implementation**

---

## Expected Outcomes

### After Implementation

**1. Dashboard Experience**

User runs `/2l-mvp`:
```bash
$ /2l-mvp "Build todo app with auth"

📊 Initializing dashboard...
   Creating dashboard (first run)...
   ✅ Dashboard created!

📊 Dashboard available:
   file:///home/ahiya/projects/todo-app/.2L/dashboard/index.html

💡 Open in browser to watch progress in real-time!

📝 Generating vision from inline requirements...
✅ Vision created
🔍 Running master exploration (2 explorers for simple project)...
```

User opens dashboard → sees:
- "Project: todo-app"
- "Plan: plan-1 | Iteration: 1/1 | Phase: exploration"
- "Active Agents (2): explorer-1 [⏱ 15s], explorer-2 [⏱ 12s]"
- "MCP Servers: 🟢 Playwright, 🟢 Chrome DevTools, 🟢 Supabase"
- Events updating every 2s

**2. Multi-Project Support**

User can run multiple orchestrations simultaneously:
```bash
# Terminal 1
cd ~/project-a
/2l-mvp "Feature A"
# Opens: file://.../project-a/.2L/dashboard/index.html

# Terminal 2 (simultaneously)
cd ~/project-b
/2l-mvp "Feature B"
# Opens: file://.../project-b/.2L/dashboard/index.html

# Both dashboards work independently
# Browser tabs: "2L Dashboard - project-a" | "2L Dashboard - project-b"
```

**3. Clean MCP Integration**

Agents only reference working MCPs:
- No confusing GitHub auth errors
- No Screenshot platform errors
- Clear "3 MCPs available" messaging
- Graceful skipping if MCP unavailable

**4. Honest Validation**

Validator reports look like:
```markdown
## TypeScript Compilation
Status: ⚠️ UNCERTAIN

Confidence: 75% - Build succeeds with 2 implicit 'any' warnings
Recommendation: Accept or manually review types in auth.ts:45-67
```

Instead of:
```markdown
## TypeScript Compilation
Status: ✅ PASS

Build completed successfully!
```

**5. Better Master Planning**

Complex projects get 4 explorers instead of 2:
- Explorer 1: Architecture
- Explorer 2: Dependencies
- Explorer 3: Integration Points
- Explorer 4: Scalability
- → Better strategic analysis → Better iteration breakdown

### User Benefits

✅ **Real-time visibility** - No more "wait and hope"
✅ **Multi-project workflows** - Run multiple builds simultaneously
✅ **Cost awareness** - See estimated costs accumulating
✅ **Debugging ease** - Event log shows exactly what happened
✅ **Trustworthy validation** - Reports are honest, not optimistic
✅ **Clean MCP experience** - Only working tools, no confusing errors
✅ **Better planning** - 4 explorers for complex projects

### Technical Improvements

✅ **No external dependencies** - Dashboard is pure HTML/CSS/JS
✅ **Works offline** - file:// protocol, no server needed
✅ **Event-driven architecture** - Loosely coupled, extensible
✅ **Append-only event log** - Safe for concurrent access
✅ **Adaptive complexity** - 2-4 explorers based on need
✅ **Honest reporting culture** - Validators flag uncertainty

---

## Next Steps

**To implement this plan:**

1. **Read this document thoroughly**
2. **Follow implementation checklist systematically**
3. **Test each phase before moving to next**
4. **Verify file changes with diff/grep**
5. **Run end-to-end test at the end**

**Estimated timeline:**
- Day 1: Dashboard (2-3 hours) + MCP cleanup (1-2 hours)
- Day 2: Master explorers (30 min) + Honesty (30 min) + Testing (1 hour)
- Total: ~5-7 hours of focused work

**Success criteria:**
- [ ] Dashboard auto-creates on first `/2l-mvp` run
- [ ] Events stream to dashboard in real-time
- [ ] Multiple projects can run simultaneously
- [ ] No GitHub/Screenshot MCP errors
- [ ] Validators report uncertainty when appropriate
- [ ] Complex projects spawn 4 explorers automatically

---

## Appendix: Quick Reference

### Event Types

```typescript
type EventType =
  | "plan_start"
  | "iteration_start"
  | "phase_change"
  | "agent_spawn"
  | "agent_complete"
  | "cost_update"
  | "validation_result"
  | "iteration_complete"
  | "error";
```

### MCP Capabilities Summary

| MCP Server | Capabilities | Use Cases |
|------------|--------------|-----------|
| **Playwright** | Browser automation, E2E testing, form filling, navigation | Test user flows, verify UI behavior |
| **Chrome DevTools** | Performance tracing, console monitoring, network analysis | Check Core Web Vitals, debug errors |
| **Supabase Local** | PostgreSQL queries, schema validation, RLS checks | Verify DB migrations, test queries |

### Dashboard Endpoints

```
file://<project-path>/.2L/dashboard/index.html  # Direct file access
http://localhost:8001                           # HTTP server (project A)
http://localhost:8002                           # HTTP server (project B)
```

### Master Explorer Focus Areas

1. **Explorer 1:** Architecture & Complexity
2. **Explorer 2:** Dependencies & Risk
3. **Explorer 3:** Integration Points *(if 3-4 explorers)*
4. **Explorer 4:** Scalability & Performance *(if 4 explorers)*

---

**Document Complete. Ready for Implementation.**

*Created: 2025-10-03*
*Version: 1.0*
*Status: APPROVED FOR EXECUTION*
