# Technology Stack

## Core Event Logging

**Decision:** Pure Bash + JSONL (JSON Lines) format

**Rationale:**
- **Zero Dependencies**: Bash is already required for 2L system; no additional tools needed
- **Concurrent Safety**: Append-only writes using `>>` operator are atomic on POSIX filesystems (tested with 5 parallel writers, no corruption)
- **Performance**: Tested at 100 events in 177ms sequential (1.77ms per event), negligible overhead for orchestration
- **Industry Standard**: JSONL is standard format for streaming logs, widely supported, easy to parse line-by-line
- **Cross-Platform**: Works on all Unix-like systems (Linux, macOS, WSL on Windows)
- **Simplicity**: Single function with string interpolation and append operation

**Alternatives Considered:**
- **SQLite Database**: Requires binary dependency, overkill for append-only logging, adds complexity
- **CSV Format**: Harder to represent nested data, no standard for escaping special characters
- **JSON Array**: Requires reading and rewriting entire file on each event (performance killer)
- **Node.js/Python Logging**: Requires language runtime, adds external dependency

**Schema Strategy:**
Every event is one JSON object per line with fixed schema:
```json
{"timestamp":"ISO8601","event_type":"string","phase":"string","agent_id":"string","data":"string"}
```

**File Location:** `.2L/events.jsonl` (per-project, append-only, manual cleanup)

## Dashboard Frontend

**Decision:** Vanilla HTML/CSS/JS (ES6+) - Single self-contained file

**Rationale:**
- **Single File Requirement**: Vision specifies <500 lines total with inline CSS/JS, eliminates build tools
- **No Dependencies**: No npm packages, no CDN imports, works offline via `file://` protocol
- **Fast Generation**: Dashboard builder agent can generate or customize template without build step
- **Browser Support**: All modern browsers support fetch(), Promises, ES6 features needed
- **Portability**: Dashboard is single HTML file, can be copied/shared easily
- **Multi-Project Isolation**: `file://` protocol ensures each project's dashboard is isolated

**Alternatives Considered:**
- **React/Vue**: Requires build step, npm dependencies, overkill for simple dashboard
- **Web Components**: Browser compatibility issues, adds complexity
- **Server-Side Rendering**: Requires server, violates `file://` protocol requirement
- **Template Engine**: Adds dependency, build step required

**Implementation Notes:**
- Inline `<style>` tag with ~100-150 lines CSS
- Inline `<script>` tag with ~200-250 lines JavaScript
- HTML structure ~50-100 lines
- Total: ~450 lines (within 500-line budget)

## Dashboard Polling Mechanism

**Decision:** fetch() API + setInterval() every 2 seconds

**Rationale:**
- **Standard Pattern**: Fetch + polling is standard for file:// dashboards without server
- **Browser Support**: fetch() works with `file://` protocol in Chrome/Firefox (Safari has restrictions but documented)
- **Simple Error Handling**: Try-catch on fetch and JSON.parse, graceful degradation
- **Acceptable Latency**: 2-second polling interval meets "real-time" requirement for monitoring
- **Non-Intrusive**: Doesn't block browser, runs in background

**Alternatives Considered:**
- **XMLHttpRequest**: Older API, more verbose, same result as fetch()
- **FileReader API**: Requires file input element, not suitable for automatic polling
- **WebSockets**: Requires server, violates `file://` protocol and zero-dependency requirement
- **File System Access API**: Newer API, limited browser support, overkill

**Implementation:**
```javascript
async function pollEvents() {
  try {
    const response = await fetch('../events.jsonl');
    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line);
    lines.forEach(line => {
      const event = JSON.parse(line);
      renderEvent(event);
    });
  } catch (e) {
    console.error('Polling failed:', e);
  }
}
setInterval(pollEvents, 2000);
```

## Dashboard Generation Strategy

**Decision:** Template-Based Generation (Not Generative)

**Rationale:**
- **Safety**: Template with placeholders is much safer than agent generating 450 lines from scratch
- **Predictability**: Complete working HTML/CSS/JS template ensures syntax correctness
- **Speed**: Agent only replaces `{PROJECT_NAME}`, `{EVENTS_PATH}`, `{TIMESTAMP}` markers (fast)
- **Maintainability**: Template can be tested, versioned, refined independently
- **Reduced Risk**: Eliminates "dashboard builder generates invalid HTML" risk

**Alternatives Considered:**
- **Generative Approach**: Agent writes HTML from scratch (riskier, slower, less predictable)
- **Static Template**: No customization per project (less flexible)
- **Multi-File Dashboard**: Split HTML/CSS/JS into separate files (violates single-file requirement)

**Template Placeholders:**
- `{PROJECT_NAME}` - Project name from config or directory
- `{EVENTS_PATH}` - Relative path to events.jsonl (always `../events.jsonl`)
- `{TIMESTAMP}` - Dashboard generation timestamp for footer

**Agent Role:**
1. Read `lib/2l-dashboard-template.html`
2. Replace all `{PLACEHOLDER}` markers with project-specific values
3. Write complete HTML to `.2L/dashboard/index.html`

## CSS Styling Framework

**Decision:** Hand-Crafted Inline CSS with GitHub Dark Theme Palette

**Rationale:**
- **No External CSS**: <500 line budget doesn't allow framework like Bootstrap/Tailwind
- **Self-Contained**: Inline styles keep file single and portable
- **GitHub Dark Theme**: Proven color palette, comfortable for developers, widely recognized
- **Simplicity**: Flexbox for layout (no CSS Grid needed), minimal complexity

**Color Palette:**
- Background: `#0d1117` (dark gray-blue)
- Surface: `#161b22` (cards/sections)
- Border: `#30363d` (subtle borders)
- Text: `#c9d1d9` (light gray)
- Accent: `#58a6ff` (blue for links/metrics)
- Success: `#3fb950` (green for active agents)
- Warning: `#f85149` (red for errors)

**Typography:**
- Font: System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Sizes: 14px base, 24px headers, 12px small text

**Layout:**
- Flexbox for metrics bar (horizontal row of stats)
- Block layout for sections (stacked vertically)
- Single media query at 768px for mobile (stack metrics vertically)

**Responsive Strategy:**
```css
@media (max-width: 768px) {
  .metrics { flex-direction: column; }
  .metric { width: 100%; }
}
```

## Dashboard Sections & Features

**Decision:** 5 Core Sections (prioritized for 500-line budget)

### 1. Header Section (MUST HAVE)
- Project name
- Plan ID
- Current iteration
- Current phase
- Overall status (running/complete/failed)

### 2. Metrics Bar (MUST HAVE)
- Elapsed time (since plan_start)
- Total events logged
- Active agents count (spawned but not completed)
- Cost tracking (DEFERRED - placeholder only for MVP)

### 3. Active Agents Section (NICE TO HAVE)
- List of currently running agents
- Agent type and ID
- Task description
- Duration (elapsed time since spawn)
- Real-time updates as agents spawn/complete

### 4. Event Log Section (MUST HAVE)
- Last 50 events displayed (newest first)
- Each event shows: timestamp, type, phase, agent, data
- Color-coded by event type
- Auto-scrolls to newest event
- Truncate long data strings

### 5. MCP Status Section (OPTIONAL)
- 3 working MCPs: Playwright, Chrome DevTools, Supabase
- Status: "Available" (hardcoded for MVP, no actual checking)
- Can be removed if exceeds line budget

**Priority:** If dashboard exceeds 500 lines, remove MCP Status section first.

## Event Type Schema

**Decision:** 8 Event Types for Iteration 1

**Event Types:**
1. `plan_start` - Orchestration begins (MODE detection complete)
2. `iteration_start` - New iteration begins (with iteration number and vision summary)
3. `phase_change` - Phase transitions (exploration → planning → building → integration → validation → healing)
4. `agent_spawn` - Agent spawned (type, id, task description)
5. `agent_complete` - Agent finished (type, id, status, duration)
6. `cost_update` - Token/cost tracking update (DEFERRED - placeholder only)
7. `validation_result` - Validation result (pass/fail/uncertain, issue count)
8. `iteration_complete` - Iteration finishes (status, total duration)

**Schema:**
```json
{
  "timestamp": "2025-10-03T14:23:45Z",
  "event_type": "agent_spawn",
  "phase": "exploration",
  "agent_id": "master-explorer-1",
  "data": "Architecture & Complexity analysis"
}
```

**Rationale:**
- Covers all critical orchestration checkpoints
- Enables dashboard to show progress and active state
- Simple string-based data field (no nested objects for MVP)
- Timestamp in ISO 8601 format (universally parseable)

## Dashboard Builder Agent

**Decision:** Agent-Based Template Customization

**Agent Specification:**
- **Type**: `2l-dashboard-builder` (new agent type)
- **Tools**: Read (for template), Write (for output)
- **Input**: Project name, events path, timestamp
- **Output**: `.2L/dashboard/index.html` (single file)
- **Trigger**: Spawned by `2l-mvp.md` if dashboard doesn't exist

**Agent Prompt Structure:**
- Read template from `~/.claude/lib/2l-dashboard-template.html`
- Replace placeholders: `{PROJECT_NAME}`, `{EVENTS_PATH}`, `{TIMESTAMP}`
- Write complete HTML to `.2L/dashboard/index.html`
- Validate: Check all tags closed, no syntax errors
- Report: Confirm dashboard created, print file path

**Rationale:**
- Follows 2L pattern (agents generate code, not scripts)
- Simple task (replace placeholders, write file)
- Testable independently before integration
- Non-blocking: If fails, log warning and continue orchestration

## Orchestration Integration

**Decision:** Bash Library + Hook Pattern

**Library:** `~/.claude/lib/2l-event-logger.sh`

**Function Signature:**
```bash
log_2l_event "event_type" "data" "phase" "agent_id"
```

**Integration Pattern:**
1. Source library at top of `2l-mvp.md`: `. ~/.claude/lib/2l-event-logger.sh`
2. Check if library exists before sourcing (backward compatibility)
3. Wrap all log calls with `|| true` (graceful degradation)
4. Add hook points at 8 orchestration checkpoints

**Hook Points in 2l-mvp.md:**
1. After MODE detection → `log_2l_event "plan_start" "Plan $PLAN_ID started"`
2. Start of execute_iteration → `log_2l_event "iteration_start" "Iteration $ITER_ID"`
3. Before each phase → `log_2l_event "phase_change" "Phase: Exploration"`
4. Around spawn_task → `log_2l_event "agent_spawn" "$AGENT_TYPE"`
5. After agent completes → `log_2l_event "agent_complete" "$AGENT_TYPE completed"`
6. Before validation → `log_2l_event "phase_change" "Phase: Validation"`
7. After validation → `log_2l_event "validation_result" "$STATUS"`
8. End of iteration → `log_2l_event "iteration_complete" "Duration: $DURATION"`

**Backward Compatibility:**
```bash
# Check if event logger exists
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  EVENT_LOGGING_ENABLED=true
else
  EVENT_LOGGING_ENABLED=false
fi

# Log events only if enabled
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "plan_start" "Plan started" || true
fi
```

## Environment Variables

**No environment variables required.** All configuration is file-based or passed as function parameters.

**Project Context:**
- Project name: From `config.yaml` or directory name (`basename $(pwd)`)
- Events path: Always `.2L/events.jsonl` (relative to project root)
- Dashboard path: Always `.2L/dashboard/index.html`

## Dependencies Overview

### System Dependencies (Required)
- **Bash 4.0+**: Event logger uses string interpolation, date command
  - **Availability**: Default on Linux/macOS, available on Windows via WSL/Git Bash
  - **Fallback**: None (required for entire 2L system)

- **date Command**: Generate ISO 8601 timestamps
  - **Availability**: Default on all Unix-like systems
  - **Format**: `date -u +"%Y-%m-%dT%H:%M:%SZ"`
  - **Fallback**: None (required)

- **POSIX Filesystem**: Atomic append-only writes
  - **Availability**: Linux, macOS, WSL on Windows
  - **Fallback**: None (event logging may have race conditions on non-POSIX filesystems)

### User Dependencies (Required for Dashboard)
- **Modern Browser**: Dashboard uses fetch API, ES6 JavaScript, CSS flexbox
  - **Minimum Versions**: Chrome 42+, Firefox 39+, Safari 10.1+, Edge 14+
  - **Fallback**: If fetch blocked on `file://`, serve via `python3 -m http.server 8000`
  - **Documentation**: Dashboard displays error message with troubleshooting steps

### 2L System Dependencies (Built-In)
- **Task Tool**: Spawn dashboard builder agent
- **Write Tool**: Dashboard builder writes HTML file
- **Read Tool**: Dashboard builder reads template

**No External Packages:** Zero npm, pip, gem, or other package manager dependencies.

## Performance Targets

### Event Logging Performance
- **Write Latency**: <2ms per event (tested: 1.77ms average)
- **Concurrent Safety**: 5+ parallel writers without corruption
- **File Size**: ~95 bytes per event (100 events = 9.5KB)
- **Throughput**: 100 events in <200ms sequential

### Dashboard Performance
- **Initial Load**: <2 seconds for 100 events
- **Polling Interval**: 2 seconds (acceptable latency for monitoring)
- **Memory Usage**: <50MB with 1000+ events
- **Render Time**: <100ms to update DOM with 50 events
- **Display Limit**: Last 50 events to prevent memory bloat

### Orchestration Impact
- **Overhead**: <1% orchestration time (event logging is fast)
- **Non-Blocking**: All log calls use `|| true` pattern
- **Graceful Degradation**: Orchestration continues if logging fails

## Security Considerations

### File Access
- **Dashboard Access**: `file://` protocol means local filesystem access only (no remote exposure)
- **Event Log**: `.2L/events.jsonl` is local file, no network access
- **Multi-Project Isolation**: Each project's dashboard reads only its own events.jsonl

### XSS Prevention
- **Dashboard Rendering**: Escape HTML in event data when rendering to DOM
- **Pattern**: Use `textContent` instead of `innerHTML` for user-provided data
- **Example**: `element.textContent = event.data` (safe from XSS)

### Concurrent Write Safety
- **Append Operations**: Using `>>` is atomic on POSIX filesystems
- **No File Locking**: Not needed for append-only writes
- **Tested**: 5 parallel writers, no corruption detected

### Backward Compatibility Safety
- **Optional Feature**: Event logging doesn't break existing plans
- **Graceful Degradation**: All errors caught with `|| true` pattern
- **Version Detection**: Check for library existence before sourcing

## Testing Strategy

### Unit Tests
- **Event Logger Function**: Source library, call function 100 times, verify JSONL output
- **Dashboard Template**: Validate HTML structure, CSS syntax, JavaScript syntax
- **Placeholder Replacement**: Verify all markers replaced correctly

### Integration Tests
- **Dashboard Generation**: Spawn builder agent, verify HTML created, open in browser
- **Event Streaming**: Run orchestration, verify events logged in real-time
- **Dashboard Polling**: Create events, verify dashboard updates every 2 seconds

### Performance Tests
- **Large Event File**: Generate 1000 events, measure dashboard load time and memory
- **Concurrent Logging**: 5 parallel agents logging simultaneously, verify no corruption
- **Orchestration Overhead**: Measure orchestration time with/without event logging

### Compatibility Tests
- **Multi-Browser**: Test dashboard in Chrome, Firefox, Safari, Edge
- **file:// Protocol**: Verify fetch() works or document limitations
- **Mobile Responsive**: Test on mobile browsers, verify layout adapts

### Backward Compatibility Tests
- **Old Plans**: Run existing plan without dashboard, verify orchestration works
- **Missing Library**: Delete event logger, verify orchestration continues gracefully
- **Resume Detection**: Interrupt and resume plan, verify events continue appending

## Future Enhancements (Out of Scope)

### Iteration 2+ Candidates
- **Cost Tracking**: Parse Claude API responses for token counts and costs
- **Event Rotation**: Archive events.jsonl after 1000 events
- **Advanced Filtering**: Filter events by type, phase, agent in dashboard
- **Real-Time Notifications**: Browser notifications for validation failures
- **Dashboard Customization**: User-configurable sections and colors
- **Export Functionality**: Download events as JSON/CSV
- **MCP Status Validation**: Actually check MCP availability instead of hardcoded status
- **Performance Metrics**: Track phase durations, builder speed, validation time
- **Error Analytics**: Aggregate and visualize error patterns
- **Historical Comparison**: Compare current iteration metrics with previous iterations

**MVP Focus:** Prove the architecture works with minimal features. Enhancements added based on user feedback.
