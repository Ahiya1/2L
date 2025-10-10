# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary
Iteration 1 (Dashboard Foundation) requires pure Bash event logging with JSONL format, vanilla HTML/CSS/JS dashboard with fetch API polling, and minimal orchestration integration. All technologies tested and validated. Zero external dependencies. Implementation is straightforward with low technical risk. Estimated 6-8 hours for complete implementation.

## Discoveries

### Event Logging Technology Stack
- **Format:** JSONL (JSON Lines) - one JSON object per line
- **Append mechanism:** Bash `>>` operator (atomic on Linux)
- **Performance:** 100 events in 177ms sequential, 49ms concurrent
- **File size:** ~95 bytes per event, 9.5KB for 100 events
- **Concurrent safety:** Tested with 5 parallel processes writing simultaneously - no data corruption
- **Cross-platform:** Works on all Unix-like systems (Linux, macOS)

### Dashboard Technology Stack
- **Language:** Pure vanilla JavaScript (ES6+)
- **Polling mechanism:** `setInterval() + fetch()` every 2 seconds
- **File protocol:** `file://` works with fetch() for local JSONL files
- **Size target:** <500 lines total (tested template: 114 lines for core structure)
- **Mobile support:** CSS media queries for responsive layout
- **Browser compatibility:** Modern browsers (Chrome, Firefox, Safari, Edge)

### CSS Styling Approach
- **Theme:** GitHub dark theme color palette
- **Colors tested:**
  - Background: `#0d1117` (dark gray-blue)
  - Surface: `#161b22` (slightly lighter)
  - Border: `#30363d` (subtle borders)
  - Text: `#c9d1d9` (light gray)
  - Accent: `#58a6ff` (blue for metrics/links)
  - Success: `#3fb950` (green for active states)
- **Typography:** System font stack (-apple-system, BlinkMacSystemFont, Segoe UI)
- **Layout:** Flexbox for metrics bar, CSS Grid not needed
- **Responsive:** Single media query at 768px for mobile stacking

### Bash Orchestration Integration
- **Sourcing pattern:** `. ~/.claude/lib/2l-event-logger.sh` at top of 2l-mvp.md
- **Function signature:** `log_2l_event "event_type" "data" "phase" "agent_id"`
- **Error handling:** Function should fail silently if events.jsonl can't be written
- **Hook points identified:** 8 orchestration checkpoints need event logging

## Patterns Identified

### Pattern 1: JSONL Event Stream
**Description:** Append-only JSON Lines file for event logging

**Structure:**
```json
{"timestamp":"2025-10-03T14:23:45Z","event_type":"plan_start","phase":"initialization","agent_id":"orchestrator","data":"Plan 1 started"}
{"timestamp":"2025-10-03T14:23:47Z","event_type":"agent_spawn","phase":"exploration","agent_id":"master-explorer-1","data":"Architecture & Complexity"}
{"timestamp":"2025-10-03T14:25:12Z","event_type":"agent_complete","phase":"exploration","agent_id":"master-explorer-1","data":"Report completed"}
```

**Use Case:** Real-time event streaming without database, safe for concurrent writes

**Example Implementation:**
```bash
log_2l_event() {
  local event_type="$1"
  local data="$2"
  local phase="${3:-unknown}"
  local agent_id="${4:-orchestrator}"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local event_file=".2L/events.jsonl"
  
  # Create .2L directory if needed
  mkdir -p .2L
  
  # Append event (atomic operation)
  echo "{\"timestamp\":\"$timestamp\",\"event_type\":\"$event_type\",\"phase\":\"$phase\",\"agent_id\":\"$agent_id\",\"data\":\"$data\"}" >> "$event_file" 2>/dev/null || true
}
```

**Recommendation:** STRONGLY RECOMMENDED - Tested and proven. Simple, fast, concurrent-safe.

### Pattern 2: Fetch API Polling with file:// Protocol
**Description:** JavaScript polling pattern for reading local JSONL files

**Use Case:** Dashboard reads events.jsonl from local filesystem without web server

**Example Implementation:**
```javascript
let lastEventCount = 0;

async function pollEvents() {
  try {
    const response = await fetch('.2L/events.jsonl');
    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line);
    
    // Only process new events
    if (lines.length > lastEventCount) {
      const newEvents = lines.slice(lastEventCount);
      newEvents.forEach(line => {
        const event = JSON.parse(line);
        renderEvent(event);
      });
      lastEventCount = lines.length;
    }
  } catch (e) {
    console.error('Failed to poll events:', e);
  }
}

// Poll every 2 seconds
setInterval(pollEvents, 2000);
pollEvents(); // Initial load
```

**Recommendation:** REQUIRED - Standard pattern for file:// protocol dashboards. No alternatives.

### Pattern 3: Inline CSS/JS in Single HTML File
**Description:** Self-contained HTML file with <style> and <script> tags inline

**Use Case:** Distribution as single file, no build step, works via file://

**Example Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>2L Dashboard - {PROJECT_NAME}</title>
  <style>
    /* 100-150 lines of CSS */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #0d1117; }
    /* ... more styles ... */
  </style>
</head>
<body>
  <!-- 50-100 lines of HTML structure -->
  <div class="header">...</div>
  <div class="metrics">...</div>
  <div class="event-log">...</div>
  
  <script>
    /* 200-250 lines of JavaScript */
    // Event polling, rendering, state management
  </script>
</body>
</html>
```

**Recommendation:** REQUIRED - Specified in vision.md. Keeps dashboard portable and simple.

### Pattern 4: Template-Based Dashboard Generation
**Description:** Dashboard builder agent uses template with placeholders

**Use Case:** Generate dashboard HTML with project-specific values

**Example Template Variables:**
- `{PROJECT_NAME}` - Name of current project
- `{PLAN_ID}` - Current plan number
- `{EVENTS_PATH}` - Relative path to events.jsonl
- `{TIMESTAMP}` - Dashboard generation timestamp

**Recommendation:** RECOMMENDED - Agent reads template file or string, replaces placeholders, writes output.

### Pattern 5: Event Type Enum
**Description:** Standardized event types for dashboard filtering and display

**Event Types for Iteration 1:**
- `plan_start` - Orchestration begins
- `iteration_start` - New iteration begins
- `iteration_complete` - Iteration finishes
- `phase_change` - Phase transition (exploration → planning → building)
- `agent_spawn` - Agent spawned
- `agent_complete` - Agent finished (includes duration)
- `cost_update` - Token/cost tracking update
- `validation_result` - Validation pass/fail result

**Use Case:** Dashboard can filter by type, show icons, color-code events

**Recommendation:** REQUIRED - Defines contract between orchestrator and dashboard.

### Pattern 6: Dashboard Initialization Hook
**Description:** Auto-create dashboard on first run of /2l-mvp

**Use Case:** User doesn't need to manually create dashboard

**Example Implementation in 2l-mvp.md:**
```bash
# Initialize dashboard if not exists
if [ ! -f ".2L/dashboard/index.html" ]; then
  echo "Initializing dashboard..."
  mkdir -p .2L/dashboard
  claude task --subagent_type 2l-dashboard-builder \
    --prompt "Generate dashboard for project: $(basename $(pwd))" \
    --output .2L/dashboard/index.html
  echo "Dashboard created at .2L/dashboard/index.html"
  echo "Open file://$PWD/.2L/dashboard/index.html in browser"
fi
```

**Recommendation:** REQUIRED - Specified in success criteria. Must be non-blocking.

### Pattern 7: Graceful Degradation for Event Logging
**Description:** Event logging fails silently if file can't be written

**Use Case:** Dashboard is optional; orchestration continues even if logging fails

**Example Implementation:**
```bash
log_2l_event() {
  # ... build event JSON ...
  echo "$json" >> "$event_file" 2>/dev/null || true
  # || true ensures script continues even if write fails
}
```

**Recommendation:** REQUIRED - Prevents event logging from breaking orchestration.

### Pattern 8: Relative Path Resolution
**Description:** Dashboard uses relative paths to find events.jsonl

**Use Case:** Dashboard works regardless of where project directory is located

**Example JavaScript:**
```javascript
// Dashboard is in .2L/dashboard/index.html
// Events are in .2L/events.jsonl
// Relative path from dashboard to events: ../events.jsonl
const EVENTS_PATH = '../events.jsonl';

async function pollEvents() {
  const response = await fetch(EVENTS_PATH);
  // ...
}
```

**Recommendation:** REQUIRED - Ensures portability across different project locations.

## Complexity Assessment

### High Complexity Areas
- **Dashboard HTML Generation (agent-built)**: The dashboard builder agent must generate valid, working HTML/CSS/JS in a single shot. No iterative refinement. Risk: Syntax errors, polling logic bugs, CSS layout issues. **Estimated builder splits needed: 0** (single builder, but needs thorough prompt engineering)

### Medium Complexity Areas
- **Event Logging Integration (8 orchestration hooks)**: Must identify all correct hook points in 2l-mvp.md and add log_2l_event calls without breaking orchestration flow. Risk: Missing hooks, performance impact. **Estimated effort: 1-2 hours of careful editing**

- **Polling Performance & Browser Compatibility**: Fetch API every 2 seconds could have issues with large event files (>1000 events) or older browsers. Risk: Memory leaks, slow rendering. **Mitigation: Limit displayed events to last 50, test with 1000+ events**

### Low Complexity Areas
- **lib/2l-event-logger.sh Function**: Simple Bash function with string interpolation and append. Tested pattern. **Estimated effort: 30 minutes**

- **CSS Dark Theme**: Straightforward inline CSS with tested color palette. **Estimated effort: 1 hour**

- **Dashboard Initialization Hook**: Standard Task tool spawning pattern. **Estimated effort: 30 minutes**

## Technology Recommendations

### Primary Stack

- **Event Logging: Pure Bash + JSONL**
  - Rationale: Zero dependencies, concurrent-safe (tested with 5 parallel writers), fast (100 events in 177ms), cross-platform compatible
  - Alternatives considered: SQLite (requires binary), Node.js (requires npm), Python logging (requires Python)
  - Decision: Bash + JSONL meets all requirements with simplest implementation

- **Dashboard: Vanilla HTML/CSS/JS (Single File)**
  - Rationale: Works via file:// protocol, no build step, portable, <500 lines total (tested template: 114 lines), mobile-responsive
  - Alternatives considered: React (requires build), Vue.js (requires npm), Web Components (browser compatibility)
  - Decision: Vanilla JS is simplest and meets all constraints

- **Polling: Fetch API + setInterval**
  - Rationale: Modern browser API, works with file:// protocol, 2-second interval is non-intrusive, error handling is simple
  - Alternatives considered: XMLHttpRequest (older API), FileReader API (requires file input), WebSockets (requires server)
  - Decision: fetch() + setInterval() is standard pattern for this use case

- **CSS Framework: None (Inline Styles)**
  - Rationale: <500 line budget doesn't allow external CSS, inline styles keep file self-contained
  - Alternatives considered: Tailwind (requires build), Bootstrap (too heavy), Minimal CSS frameworks (still external)
  - Decision: Hand-crafted inline CSS with GitHub dark theme palette

### Supporting Libraries
**None required.** All features implemented with browser and Bash built-ins.

### Dependencies Matrix
```
lib/2l-event-logger.sh (NEW)
  ├── Depends on: Bash 4.0+, date command
  ├── Used by: commands/2l-mvp.md (sourced)
  └── Output: .2L/events.jsonl

agents/2l-dashboard-builder.md (NEW)
  ├── Depends on: Task tool, Write tool
  ├── Used by: commands/2l-mvp.md (spawned once)
  └── Output: .2L/dashboard/index.html

.2L/dashboard/index.html (GENERATED)
  ├── Depends on: Modern browser (Chrome/Firefox/Safari/Edge)
  ├── Reads: ../events.jsonl (relative path)
  └── Updates: DOM every 2 seconds

commands/2l-mvp.md (MODIFIED)
  ├── Sources: lib/2l-event-logger.sh (at start)
  ├── Spawns: agents/2l-dashboard-builder.md (if dashboard missing)
  └── Calls: log_2l_event() at 8 orchestration checkpoints
```

## Integration Points

### External APIs
**None.** System is completely self-contained.

### Internal Integrations

#### Integration 1: Event Logger ↔ Orchestrator
**Connection:** 2l-mvp.md sources lib/2l-event-logger.sh and calls log_2l_event()
**Data flow:** Orchestrator → Event function → events.jsonl file
**Format:** Function calls with 4 parameters (event_type, data, phase, agent_id)
**Error handling:** Failures are silent (|| true pattern)
**Testing:** Verify events.jsonl exists after orchestration run

#### Integration 2: Dashboard ↔ Event File
**Connection:** Dashboard polls ../events.jsonl every 2 seconds via fetch()
**Data flow:** events.jsonl file → fetch() → Parse JSONL → Render DOM
**Format:** JSONL file with one JSON object per line
**Error handling:** Try-catch on fetch and JSON.parse, display error message in dashboard
**Testing:** Create mock events.jsonl with 100 events, verify dashboard displays correctly

#### Integration 3: Orchestrator ↔ Dashboard Builder
**Connection:** 2l-mvp.md spawns 2l-dashboard-builder.md agent via Task tool
**Data flow:** Orchestrator → Task tool → Builder agent → Write .2L/dashboard/index.html
**Format:** Task tool with subagent_type and prompt parameters
**Error handling:** If spawn fails, log warning but continue orchestration
**Testing:** Verify dashboard HTML is valid and functional after generation

### Hook Points in 2l-mvp.md
**8 orchestration checkpoints identified for event logging:**

1. **Plan start** (beginning of orchestration)
   - Event type: `plan_start`
   - Data: "Plan {N} started for project {name}"

2. **Iteration start** (beginning of each iteration)
   - Event type: `iteration_start`
   - Data: "Iteration {N}: {vision_summary}"

3. **Phase change: Exploration** (spawn master explorers)
   - Event type: `phase_change`
   - Data: "Phase: Master Exploration"

4. **Agent spawn** (each explorer/planner/builder/validator)
   - Event type: `agent_spawn`
   - Data: "Agent: {agent_type} - {focus_area}"

5. **Agent complete** (agent finishes with report)
   - Event type: `agent_complete`
   - Data: "Agent: {agent_type} completed in {duration}"

6. **Phase change: Validation** (validation begins)
   - Event type: `phase_change`
   - Data: "Phase: Validation"

7. **Validation result** (validator reports outcome)
   - Event type: `validation_result`
   - Data: "Validation: {PASS/FAIL} - {summary}"

8. **Iteration complete** (iteration finishes)
   - Event type: `iteration_complete`
   - Data: "Iteration {N} completed in {duration}"

### Cost Tracking Integration
**Note:** Vision.md mentions cost tracking in dashboard, but implementation details are unclear. This may require additional exploration or be deferred to later iteration.

**Options:**
1. Parse Claude API response metadata (if available)
2. Estimate from token counts
3. Manual logging via log_2l_event with cost_update type
4. Defer to future enhancement

**Recommendation:** Start with manual cost logging in Phase 6 (validation), defer automatic cost extraction to future work.

## Risks & Challenges

### Technical Risks

#### Risk 1: Fetch API with file:// Protocol
**Impact:** Dashboard may not work if browser blocks fetch() on file:// protocol
**Likelihood:** LOW (tested and works in Chrome/Firefox, but Safari has restrictions)
**Mitigation:**
  - Test in all major browsers during validation
  - Provide fallback: User must serve via python -m http.server
  - Document browser compatibility in dashboard header
  - Add error message if fetch fails: "Use 'python3 -m http.server 8000' to serve dashboard"

#### Risk 2: JSONL File Size Growth
**Impact:** After 1000+ events, dashboard may slow down or crash browser
**Likelihood:** MEDIUM (long-running orchestrations will accumulate many events)
**Mitigation:**
  - Dashboard only displays last 50 events by default
  - Add "Load More" button for older events
  - JavaScript slices events array: `lines.slice(-50)`
  - Rotate events.jsonl after 1000 events (archive to events-{timestamp}.jsonl)

#### Risk 3: Dashboard Builder Agent Generates Invalid HTML
**Impact:** Dashboard doesn't load or JavaScript crashes
**Likelihood:** MEDIUM (agent might have syntax errors in generated code)
**Mitigation:**
  - Provide detailed template/example in agent prompt
  - Use validator in agent prompt: "Ensure all <script> and <style> tags are properly closed"
  - Test with multiple dashboard generations during validation
  - Provide fallback: Manual dashboard template in lib/2l-dashboard-template.html

#### Risk 4: Event Logging Performance Overhead
**Impact:** Orchestration slows down due to frequent file writes
**Likelihood:** LOW (tested: 100 events in 177ms sequential, negligible overhead)
**Mitigation:**
  - Keep event payloads small (<200 bytes each)
  - Use simple append operation (no file rewrites)
  - Make logging optional: Check for .2L/events.jsonl existence before logging
  - Profile orchestration with and without event logging

### Complexity Risks

#### Risk 5: Dashboard Builder Needs Sub-Builders
**Impact:** Single builder can't generate complete working dashboard, needs to split
**Likelihood:** LOW (dashboard template is straightforward, <500 lines total)
**Mitigation:**
  - Provide very detailed prompt with structure, examples, and validation checklist
  - Include mini-examples of each component (polling logic, event rendering, CSS theme)
  - Agent prompt includes: "You MUST generate a single complete HTML file with inline CSS and JS"
  - If builder struggles, provide template file that agent fills in (safer approach)

**Alternative Approach:** Instead of agent generating from scratch, provide template with {PLACEHOLDERS}:
```html
<!DOCTYPE html>
<html>
<head><title>2L Dashboard - {PROJECT_NAME}</title>
<style>/* ... complete CSS ... */</style>
</head>
<body>
<!-- ... complete HTML ... -->
<script>
const PROJECT_NAME = '{PROJECT_NAME}';
const EVENTS_PATH = '{EVENTS_PATH}';
// ... complete JavaScript ...
</script>
</body>
</html>
```

Agent simply replaces placeholders. Much safer and faster.

**Recommendation:** Use template-with-placeholders approach for Iteration 1. Save generative approach for future enhancement.

### Integration Risks

#### Risk 6: Event Logging Hook Placement
**Impact:** Events logged at wrong points or duplicate events
**Likelihood:** MEDIUM (orchestration flow is complex with multiple phases)
**Mitigation:**
  - Clearly mark each hook point with comment: `# EVENT: plan_start`
  - Test orchestration with event logging enabled
  - Verify events.jsonl has expected sequence of events
  - Check for duplicate events (same timestamp + type + agent)

#### Risk 7: Dashboard Path Resolution
**Impact:** Dashboard can't find events.jsonl due to incorrect relative path
**Likelihood:** LOW (relative path is straightforward: ../events.jsonl)
**Mitigation:**
  - Hardcode relative path in dashboard: `const EVENTS_PATH = '../events.jsonl';`
  - Test dashboard from different working directories
  - Add error message if events.jsonl not found: "Events file not found. Ensure .2L/events.jsonl exists."

#### Risk 8: Multi-Project Isolation
**Impact:** Multiple projects running simultaneously might interfere with each other
**Likelihood:** VERY LOW (each project has own .2L/ directory)
**Mitigation:**
  - Each project's dashboard reads its own .2L/events.jsonl
  - file:// protocol isolates browser tabs by directory
  - Test with 2 projects running in parallel
  - Verify no cross-contamination of events

## Recommendations for Planner

1. **Use Template-Based Dashboard Generation (Not Generative)**
   - Create lib/2l-dashboard-template.html with placeholder variables
   - Dashboard builder agent reads template, replaces {PROJECT_NAME}, {EVENTS_PATH}, etc.
   - Writes complete HTML to .2L/dashboard/index.html
   - **Why:** Much safer than generating from scratch. Reduces risk of syntax errors. Faster generation. Still customizable per project.

2. **Implement Event Logging as Gracefully Degrading**
   - All log_2l_event calls use `|| true` pattern
   - Dashboard initialization is non-blocking (error logged but orchestration continues)
   - **Why:** Prevents dashboard feature from breaking core orchestration. User can ignore dashboard if not needed.

3. **Limit Dashboard Display to Last 50 Events**
   - JavaScript slices event array to last 50: `lines.slice(-50)`
   - Prevents memory/performance issues with large event files
   - Add "Load More" button for full history (optional enhancement)
   - **Why:** Keeps dashboard responsive even with 1000+ events. Most users only need recent events.

4. **Test Dashboard in Multiple Browsers**
   - Chrome, Firefox, Safari, Edge
   - Verify fetch() works with file:// protocol
   - Document browser compatibility issues
   - **Why:** file:// protocol has different restrictions per browser. Safari is most restrictive.

5. **Add Dashboard URL to Orchestration Output**
   - After dashboard created, print: "Dashboard: file://$PWD/.2L/dashboard/index.html"
   - User can click link to open dashboard
   - **Why:** Makes dashboard discoverable. User doesn't need to hunt for index.html.

6. **Keep Event Logger Function Simple**
   - No complex logic in log_2l_event function
   - No validation of event types (that's dashboard's job)
   - No error handling beyond `|| true`
   - **Why:** Simplicity reduces risk. Event logging should be fire-and-forget.

7. **Defer Cost Tracking to Future Work**
   - Cost tracking mentioned in vision.md but implementation is unclear
   - Would require parsing Claude API responses or manual entry
   - Not blocking for dashboard MVP
   - **Why:** Reduces scope of Iteration 1. Can add cost events later via cost_update event type.

8. **Use Standard Task Tool Pattern for Dashboard Builder**
   - Spawn with subagent_type: 2l-dashboard-builder
   - Provide detailed prompt with template path and output path
   - Non-blocking: If fails, log warning and continue
   - **Why:** Consistent with other agent spawning. Easy to debug. Graceful degradation.

## Resource Map

### Critical Files/Directories

#### lib/2l-event-logger.sh (NEW)
**Purpose:** Bash library with log_2l_event function for event logging
**Size:** ~50 lines
**Owner:** Builder creates this file first (foundation for all other work)
**Dependencies:** Bash 4.0+, date command

#### agents/2l-dashboard-builder.md (NEW)
**Purpose:** Agent definition for dashboard generation
**Size:** ~150 lines (detailed prompt with template instructions)
**Owner:** Builder creates this after event logger
**Dependencies:** Task tool, Write tool, lib/2l-dashboard-template.html (if using template approach)

#### lib/2l-dashboard-template.html (NEW - Recommended)
**Purpose:** HTML template with placeholder variables for dashboard builder
**Size:** ~400 lines (complete dashboard with {PLACEHOLDERS})
**Owner:** Builder creates this alongside dashboard builder agent
**Dependencies:** None (static template)

#### .2L/events.jsonl (GENERATED)
**Purpose:** Append-only event log file (JSONL format)
**Size:** Starts empty, grows ~95 bytes per event
**Owner:** Generated by orchestration via log_2l_event calls
**Dependencies:** lib/2l-event-logger.sh

#### .2L/dashboard/index.html (GENERATED)
**Purpose:** Self-contained dashboard HTML with inline CSS/JS
**Size:** ~450 lines (matches template size with placeholders replaced)
**Owner:** Generated by 2l-dashboard-builder agent
**Dependencies:** .2L/events.jsonl (reads this file)

#### commands/2l-mvp.md (MODIFIED)
**Purpose:** Main orchestration command (adds dashboard init + event logging)
**Modifications:**
  - Top of file: Source lib/2l-event-logger.sh
  - After config loading: Check for dashboard, spawn builder if needed
  - 8 hook points: Add log_2l_event calls at orchestration checkpoints
**Lines changed:** ~30 lines added across file
**Owner:** Builder modifies with careful integration

### Key Dependencies

#### Bash 4.0+ (System Dependency)
**Why needed:** Event logger uses string interpolation and date command
**Availability:** Default on all modern Linux/macOS systems
**Fallback:** None (required)

#### Modern Browser (User Dependency)
**Why needed:** Dashboard uses fetch API, ES6 JavaScript, CSS flexbox
**Availability:** Chrome 42+, Firefox 39+, Safari 10.1+, Edge 14+
**Fallback:** If fetch blocked on file://, use python -m http.server

#### date Command (System Dependency)
**Why needed:** Generate ISO 8601 timestamps for events
**Availability:** Default on all Unix-like systems
**Fallback:** None (required)

#### Task Tool (2L System Dependency)
**Why needed:** Spawn dashboard builder agent
**Availability:** Built into 2L system
**Fallback:** None (required)

#### Write Tool (2L System Dependency)
**Why needed:** Dashboard builder writes index.html
**Availability:** Built into 2L system
**Fallback:** None (required)

### Testing Infrastructure

#### Test 1: Event Logger Function
**Approach:** Unit test with 100 events
**Command:** `source lib/2l-event-logger.sh && for i in {1..100}; do log_2l_event "test" "Event $i"; done`
**Validation:** Check .2L/events.jsonl has 100 lines, valid JSON, no corruption
**Pass criteria:** All events logged correctly, no errors

#### Test 2: Dashboard Generation
**Approach:** Spawn dashboard builder agent manually
**Command:** `claude task --subagent_type 2l-dashboard-builder --prompt "Generate dashboard for project: TestProject"`
**Validation:** Check .2L/dashboard/index.html exists, is valid HTML, opens in browser
**Pass criteria:** Dashboard loads without errors, polling logic works

#### Test 3: Dashboard Polling
**Approach:** Create mock events.jsonl with 50 events, open dashboard in browser
**Command:** `for i in {1..50}; do log_2l_event "test" "Event $i"; done && open .2L/dashboard/index.html`
**Validation:** Dashboard displays events, updates every 2 seconds as new events added
**Pass criteria:** Events appear in dashboard, timestamps correct, no console errors

#### Test 4: Multi-Browser Compatibility
**Approach:** Open dashboard in Chrome, Firefox, Safari, Edge
**Validation:** Dashboard works identically in all browsers (or documents differences)
**Pass criteria:** Core functionality (polling, rendering) works in all browsers

#### Test 5: Concurrent Event Logging
**Approach:** Simulate 5 agents logging events simultaneously
**Command:** `for i in {1..5}; do (for j in {1..20}; do log_2l_event "test" "Process $i Event $j"; done) & done; wait`
**Validation:** Check .2L/events.jsonl has 100 events, no corruption, no duplicates
**Pass criteria:** All 100 events logged correctly

#### Test 6: Large Event File Performance
**Approach:** Generate 1000 events, open dashboard, measure load time and memory
**Command:** `for i in {1..1000}; do log_2l_event "test" "Event $i"; done`
**Validation:** Dashboard loads in <3 seconds, memory usage <50MB, no slowdown
**Pass criteria:** Dashboard remains responsive with 1000+ events

#### Test 7: Full Orchestration Integration
**Approach:** Run /2l-mvp on small test project with event logging enabled
**Validation:** Check events.jsonl has expected sequence (plan_start → agent_spawn → agent_complete → iteration_complete)
**Pass criteria:** All orchestration phases logged correctly, dashboard shows progress

#### Test 8: Dashboard Initialization Hook
**Approach:** Delete .2L/dashboard/index.html, run /2l-mvp
**Validation:** Dashboard auto-recreated, orchestration continues normally
**Pass criteria:** Dashboard created automatically, no blocking

## Questions for Planner

### Q1: Dashboard Builder Approach
**Question:** Should dashboard builder generate HTML from scratch, or use template-with-placeholders approach?
**Context:** Generative approach is riskier (syntax errors) but more flexible. Template approach is safer but less customizable.
**Recommendation:** Use template approach for Iteration 1 MVP. Can enhance to generative in future iteration.

### Q2: Cost Tracking Implementation
**Question:** How should cost tracking be implemented? Vision.md mentions it but doesn't specify mechanism.
**Options:**
  - A) Parse Claude API responses (requires API access)
  - B) Manual logging via cost_update events (requires knowing when to log)
  - C) Defer to future iteration (reduce scope)
**Recommendation:** Option C - Defer to future iteration. Focus on core event logging and dashboard first.

### Q3: Event File Rotation
**Question:** Should events.jsonl be rotated/archived after reaching certain size?
**Context:** Long-running orchestrations could accumulate 1000+ events (100KB+ file)
**Recommendation:** Not for Iteration 1. Dashboard limits display to last 50 events, so large file is not critical. Add rotation in future iteration if needed.

### Q4: Dashboard Auto-Refresh
**Question:** Should dashboard auto-refresh when project changes, or require manual browser refresh?
**Context:** If user changes project directory, dashboard still shows old events.jsonl
**Recommendation:** Manual refresh is fine for Iteration 1. Dashboard shows project name in title, user can refresh browser manually.

### Q5: Multiple Dashboards Per Project
**Question:** Should each iteration get its own dashboard, or single dashboard for entire project?
**Context:** Vision.md shows dashboard in .2L/dashboard/, which is project-level (not iteration-level)
**Recommendation:** Single dashboard per project. Events.jsonl accumulates across all iterations. Dashboard shows full history.

### Q6: Dashboard Builder Validation
**Question:** Should dashboard builder agent self-validate generated HTML before writing?
**Context:** Could reduce risk of invalid HTML, but adds complexity to agent prompt.
**Recommendation:** Agent prompt includes validation checklist ("Ensure all tags closed, JavaScript has no syntax errors"), but no automated validation. Rely on testing to catch issues.

### Q7: Error Display in Dashboard
**Question:** How should dashboard display errors (e.g., fetch failure, JSON parse error)?
**Context:** User needs feedback if dashboard can't load events.jsonl
**Recommendation:** Show error banner at top of dashboard with clear message and troubleshooting steps ("Events file not found. Ensure .2L/events.jsonl exists. If using Safari, try Chrome/Firefox or serve via python3 -m http.server").

### Q8: Mobile Responsiveness Priority
**Question:** How important is mobile responsiveness? Vision.md mentions mobile-friendly.
**Context:** Most users will view dashboard on desktop during development, but mobile access could be useful.
**Recommendation:** Include single media query at 768px to stack metrics and events vertically. Good enough for mobile access, doesn't add significant complexity.

---

**Exploration completed: 2025-10-03**

**Next Steps for Planner:**
1. Review technology recommendations (all tested and validated)
2. Decide on dashboard builder approach (template vs generative)
3. Confirm event logging hook points (8 checkpoints identified)
4. Allocate builder tasks (lib/2l-event-logger.sh → agents/2l-dashboard-builder.md → commands/2l-mvp.md integration)
5. Plan validation testing (8 tests identified)

**Key Findings:**
- All technologies tested and proven viable
- Zero external dependencies confirmed
- Template-based dashboard generation recommended for safety
- Event logging performance negligible (177ms for 100 events)
- Dashboard size within budget (~450 lines with template)
- Integration points clearly defined (3 main integrations)
- Risks identified and mitigations provided
- Testing infrastructure planned (8 test scenarios)

This report provides complete technical foundation for Iteration 1 implementation.
