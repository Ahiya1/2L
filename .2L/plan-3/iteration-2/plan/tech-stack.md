# Technology Stack - Iteration 2

## Executive Summary

Iteration 2 requires **ZERO new technologies**. All work leverages the validated stack from Iteration 1. The focus is on refactoring existing patterns to improve performance and usability.

**Key Decision:** Continue using bash for dashboard generation (remove agent spawning overhead) and vanilla JavaScript for dashboard UI (fix event type bug).

---

## Core Technologies

### Bash 4.0+ (Command Scripting)

**Decision:** Bash 4.0+ with parameter expansion for template processing

**Rationale:**
1. **Proven in Iteration 1:** Installation script (516 lines) validated at 95% confidence
2. **Native String Replacement:** `${VAR//pattern/replacement}` syntax handles all 3 placeholders
3. **Performance:** Template substitution completes in <1 second for 481-line file
4. **Zero Dependencies:** No external tools required (sed/awk optional fallback)
5. **Consistency:** All 2L commands already written in bash
6. **Cross-Platform:** Works on Ubuntu/Debian and macOS (POSIX-compliant)

**Alternatives Considered:**
- **Python script:** Rejected - Adds runtime dependency, bash is sufficient for 3 placeholder replacements
- **Agent-based generation:** Current approach - 30s overhead, eliminated in this iteration
- **sed/awk only:** Rejected - Less readable than bash parameter expansion, harder to maintain

**Version Requirements:**
- Minimum: Bash 4.0 (for `${VAR//pattern/replacement}` syntax)
- Tested on: Bash 5.1.16 (Ubuntu 24.04), Bash 5.2 (macOS Sonoma)
- Fallback: sed if bash <4.0 (documented in patterns.md)

**Implementation Notes:**
```bash
# Primary approach (bash 4.0+)
HTML="${TEMPLATE//\{PROJECT_NAME\}/$PROJECT_NAME}"

# Fallback (bash <4.0)
HTML=$(echo "$TEMPLATE" | sed "s|{PROJECT_NAME}|$PROJECT_NAME|g")
```

---

### HTML + CSS + Vanilla JavaScript (Dashboard UI)

**Decision:** Continue using vanilla JavaScript in dashboard template (no frameworks)

**Rationale:**
1. **Template Already Exists:** 481-line file with complete dashboard UI
2. **Single Bug Fix:** Only need to change `agent_spawn` to `agent_start` (1 line)
3. **No Build Step:** Pure HTML/CSS/JS, works in all modern browsers
4. **Performance:** Event polling (2s interval) is efficient for <50 events display
5. **Maintainability:** Simple code, no framework lock-in, easy to debug
6. **Browser Support:** Works in Chrome, Firefox, Safari (all modern browsers)

**Alternatives Considered:**
- **React/Vue dashboard:** Rejected - Over-engineering for MVP, adds build complexity, current template works
- **WebSocket for events:** Rejected - Polling is sufficient for 2s update interval, no real-time requirement
- **Dashboard framework (Grafana, etc.):** Rejected - Too heavy for simple event timeline display

**Event Handling Pattern:**
```javascript
// Current (BROKEN)
case 'agent_spawn':
  activeAgents.set(event.agent_id, {...});
  break;

// Fixed (this iteration)
case 'agent_start':
  activeAgents.set(event.agent_id, {...});
  break;
```

**Browser Compatibility:**
- Chrome/Chromium 90+ (primary testing target)
- Firefox 88+ (secondary)
- Safari 14+ (macOS testing)
- Edge 90+ (chromium-based, same as Chrome)

**JavaScript Features Used:**
- ES6 Map for active agents tracking (supported in all modern browsers)
- Fetch API for event polling (supported in all modern browsers)
- Async/await syntax (supported in all modern browsers)
- Template literals (supported in all modern browsers)

---

### Markdown (Documentation Format)

**Decision:** Standard GitHub-flavored Markdown for README

**Rationale:**
1. **GitHub Native:** Renders beautifully on GitHub with TOC auto-generation
2. **No Tooling:** Manual editing, no build step required
3. **Version Control Friendly:** Line-by-line diffs, easy to review changes
4. **Anchor Links:** Native support for `[Link](#section-id)` syntax
5. **Code Blocks:** Syntax highlighting for bash/javascript examples

**Alternatives Considered:**
- **MkDocs/Docusaurus:** Rejected - Over-engineering for single README file, adds build complexity
- **AsciiDoc:** Rejected - Less familiar to developers, GitHub markdown is standard
- **reStructuredText:** Rejected - Python ecosystem, not needed for simple documentation

**Markdown Features Used:**
- Headers (H1-H4) for structure
- Code blocks with syntax highlighting (\`\`\`bash, \`\`\`javascript)
- Anchor links for Table of Contents
- Lists (ordered and unordered)
- Bold/italic for emphasis
- Blockquotes for important notes

**GitHub-Specific Extensions:**
- Automatic TOC generation from headers
- Anchor IDs auto-generated from header text
- Task lists `- [ ]` and `- [x]`
- Syntax highlighting in code blocks

---

## Supporting Tools & Libraries

### sed (Text Substitution) - Fallback Only

**Purpose:** Template placeholder replacement (fallback if bash <4.0)

**Installation:** Pre-installed on all Unix systems (part of GNU coreutils)

**Usage:**
```bash
sed 's|{PROJECT_NAME}|MyProject|g' template.html > output.html
```

**When to Use:**
- Primary: Bash parameter expansion (faster, more readable)
- Fallback: sed if bash version <4.0 detected

**Version Requirements:** Any POSIX sed (GNU sed 4.0+ or BSD sed)

---

### Python 3 http.server (HTTP Server) - UNCHANGED

**Purpose:** Serve dashboard HTML to browser

**Installation:** Already required by 2L (validated in Iteration 1)

**Usage:**
```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

**Version Requirements:** Python 3.x (any version)

**Notes for Iteration 2:**
- NO changes to server configuration
- NO changes to port allocation logic
- NO changes to PID tracking
- This is a critical piece of infrastructure - DO NOT MODIFY

---

### lsof (Port Detection) - UNCHANGED

**Purpose:** Find available ports for dashboard server (8080-8099 range)

**Installation:** Pre-installed on Ubuntu/macOS

**Usage:**
```bash
lsof -Pi :8080 -sTCP:LISTEN -t  # Returns PID if port occupied, nothing if free
```

**Version Requirements:** Any lsof version

**Notes for Iteration 2:**
- NO changes to port allocation logic
- NO changes to port range (8080-8099)
- This is a critical piece of infrastructure - DO NOT MODIFY

---

### Event Logger Library (From Iteration 1) - UNCHANGED

**File:** `~/.claude/lib/2l-event-logger.sh` (51 lines)

**Purpose:** Provides `log_2l_event` function for agents

**Usage:**
```bash
source ~/.claude/lib/2l-event-logger.sh
log_2l_event "agent_start" "Builder-1: Starting work" "building" "builder-1"
```

**Event Schema:**
```json
{
  "timestamp": "2025-10-10T10:00:00Z",
  "event_type": "agent_start",
  "phase": "building",
  "agent_id": "builder-1",
  "data": "Builder-1: Starting work"
}
```

**Notes for Iteration 2:**
- NO changes to event schema
- NO changes to event types (we're fixing dashboard to match actual events)
- Graceful degradation if library unavailable

---

## Data Formats

### JSONL (JSON Lines) for Events

**Format:** `.2L/events.jsonl` - One JSON object per line

**Schema:**
```json
{"timestamp":"ISO8601","event_type":"string","phase":"string","agent_id":"string","data":"string"}
```

**Event Types (from event logger):**
- `plan_start` - Orchestrator begins
- `iteration_start` - New iteration begins
- `phase_change` - Phase transition (exploration → planning → building → etc.)
- `agent_spawn` - Orchestrator spawns agent (NOT tracked by dashboard)
- `agent_start` - Agent begins work (TRACKED by dashboard)
- `agent_complete` - Agent finishes work (TRACKED by dashboard)
- `validation_result` - Validation outcome
- `iteration_complete` - Iteration finishes
- `complexity_decision` - Builder splits or continues

**Key Insight:** Dashboard should track `agent_start`/`agent_complete` (agent work) NOT `agent_spawn` (orchestrator action). This is the bug we're fixing.

---

### HTML Template Placeholders

**Template:** `~/.claude/lib/2l-dashboard-template.html`

**Placeholders:**
1. `{PROJECT_NAME}` - Current directory basename
   - Example: `/home/user/my-app` → `my-app`
   - Bash: `PROJECT_NAME=$(basename "$(pwd)")`

2. `{TIMESTAMP}` - Dashboard generation timestamp
   - Format: `2025-10-10 10:30:45 UTC`
   - Bash: `TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")`

3. `{EVENTS_PATH}` - Relative path to events.jsonl
   - Value: Always `../events.jsonl` (dashboard in `.2L/dashboard/`, events in `.2L/`)
   - Static: `EVENTS_PATH="../events.jsonl"`

**Substitution Pattern:**
```bash
# Read template
TEMPLATE=$(cat ~/.claude/lib/2l-dashboard-template.html)

# Get values
PROJECT_NAME=$(basename "$(pwd)")
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
EVENTS_PATH="../events.jsonl"

# Replace placeholders (bash 4.0+)
HTML="${TEMPLATE//\{PROJECT_NAME\}/$PROJECT_NAME}"
HTML="${HTML//\{TIMESTAMP\}/$TIMESTAMP}"
HTML="${HTML//\{EVENTS_PATH\}/$EVENTS_PATH}"

# Validate (no placeholders remain)
if echo "$HTML" | grep -q '{'; then
  echo "Error: Template replacement incomplete"
  exit 1
fi

# Write output
mkdir -p .2L/dashboard
echo "$HTML" > .2L/dashboard/index.html
```

---

## Architecture Decisions

### Decision 1: Remove Agent Spawning from Dashboard Generation

**Context:** Current `/2l-dashboard` command spawns `2l-dashboard-builder` agent to generate HTML, adding ~30 seconds overhead.

**Decision:** Remove agent spawning, generate HTML directly in bash command.

**Rationale:**
1. **Performance:** <1s string replacement vs 30s agent spawn
2. **Simplicity:** 3 placeholder replacements don't need agent intelligence
3. **Reliability:** No dependency on agent spawning infrastructure
4. **Maintenance:** Easier to debug bash script than agent workflow

**Trade-offs:**
- ✅ Pro: 93% reduction in dashboard startup time (30s → <2s)
- ✅ Pro: Simpler code path (fewer moving parts)
- ✅ Pro: No agent context overhead
- ❌ Con: Less flexible if templates become complex (unlikely - template is stable)
- ❌ Con: Deprecated agent file remains (can mark deprecated, not delete)

**Implementation:**
```bash
# OLD (lines 54-63 in 2l-dashboard.md)
if [ ! -f ".2L/dashboard/index.html" ]; then
  echo "Dashboard HTML not found. Generating..."
  echo "Please run the 2l-dashboard-builder agent..."
  exit 1
fi

# NEW (replace lines 54-63)
# Generate dashboard HTML directly
TEMPLATE=$(cat ~/.claude/lib/2l-dashboard-template.html)
PROJECT_NAME=$(basename "$(pwd)")
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
EVENTS_PATH="../events.jsonl"

HTML="${TEMPLATE//\{PROJECT_NAME\}/$PROJECT_NAME}"
HTML="${HTML//\{TIMESTAMP\}/$TIMESTAMP}"
HTML="${HTML//\{EVENTS_PATH\}/$EVENTS_PATH}"

mkdir -p .2L/dashboard
echo "$HTML" > .2L/dashboard/index.html
```

---

### Decision 2: Fix Event Type from agent_spawn to agent_start

**Context:** Dashboard JavaScript listens for `agent_spawn` but agents emit `agent_start`.

**Decision:** Change dashboard template to listen for `agent_start`.

**Rationale:**
1. **Correctness:** Match actual event types from event logger
2. **Semantic Accuracy:** `agent_start` means agent is actively working (what we want to track)
3. **Agent Lifecycle:** `agent_spawn` is orchestrator action, `agent_start` is agent action
4. **Breaking Change OK:** Internal tool, single developer, no backward compatibility needed

**Event Types Comparison:**
```
Orchestrator emits:
- agent_spawn: "Spawning builder-1 for Task X"  (orchestrator action)

Agent emits:
- agent_start: "Builder-1: Starting work"        (agent action) ← TRACK THIS
- agent_complete: "Builder-1: Complete"          (agent action) ← TRACK THIS
```

**Implementation:**
```javascript
// Line 421 in 2l-dashboard-template.html
// CHANGE FROM:
case 'agent_spawn':
  activeAgents.set(event.agent_id, {
    task: event.data,
    startTime: new Date(event.timestamp)
  });
  break;

// CHANGE TO:
case 'agent_start':
  activeAgents.set(event.agent_id, {
    task: event.data,
    startTime: new Date(event.timestamp)
  });
  break;
```

**CSS Addition:**
```css
/* Add styling for agent_start events (same as agent_complete) */
.event-type-agent_start {
  background: #3fb950;  /* Green */
  color: #000;
}
```

---

### Decision 3: Reorganize README, Don't Rewrite

**Context:** Current README is comprehensive but overwhelming for new users.

**Decision:** Restructure content for progressive disclosure, preserve all existing information.

**Rationale:**
1. **Content Quality:** Existing documentation is excellent, well-written
2. **Minimal Risk:** Moving sections is safer than rewriting
3. **Quick Win:** Reorganization can be done in 1-2 hours
4. **Validation:** Easy to verify no content lost (word count, heading count)

**Structure Changes:**
```markdown
# OLD STRUCTURE (current)
1. Overview & Quick Start (conceptual, no step-by-step)
2. Event System Architecture (deep dive)
3. Dashboard Access (how to use)
4. MCP Integration (advanced)
5. GitHub Integration (advanced)
6. Setup Verification (troubleshooting)
7. Architecture Decisions (deep dive)

# NEW STRUCTURE (Iteration 2)
1. Quick Start (5 steps, actionable) ← NEW SECTION
2. Table of Contents ← NEW
3. What is 2L? (conceptual overview) ← MOVED UP
4. Core Workflow (how it works) ← MOVED UP
5. Event System Architecture (unchanged)
6. Dashboard Access (unchanged)
7. Advanced Topics (MCP, GitHub, Architecture) ← GROUPED
8. Troubleshooting (unchanged)
```

**Quick Start Content (NEW):**
```markdown
## Quick Start (5 Minutes)

1. **Clone Repository:**
   ```bash
   git clone https://github.com/user/2L.git && cd 2L
   ```

2. **Install 2L:**
   ```bash
   ./2l.sh install
   ```

3. **Setup Database:**
   ```bash
   /2l-setup-db
   ```

4. **Optional - Setup MCPs:**
   ```bash
   /2l-setup-mcps
   ```

5. **Start Building:**
   ```bash
   /2l-mvp "build a todo app with React"
   /2l-dashboard  # In another terminal
   ```
```

---

## Environment Variables

**None required for Iteration 2.**

All configuration is implicit:
- Template path: `~/.claude/lib/2l-dashboard-template.html`
- Events path: `.2L/events.jsonl` (relative to project root)
- Dashboard output: `.2L/dashboard/index.html`
- Port range: 8080-8099 (hardcoded, no configuration needed)

---

## Performance Targets

### Dashboard Generation
- **Template Read:** <100ms (481-line file)
- **String Replacement:** <200ms (3 placeholders)
- **File Write:** <100ms (output HTML)
- **Validation:** <100ms (grep for `{`)
- **Total:** <500ms (<1 second target met)

### Dashboard Startup
- **HTML Generation:** <1s (new direct approach)
- **Server Start:** <1s (Python http.server)
- **Browser Open:** <0.5s (xdg-open/open command)
- **Total:** <2.5s (<3 second P95 target met, <2s P50 expected)

### Event Processing (JavaScript)
- **Polling Interval:** 2 seconds (unchanged)
- **JSON Parse:** <10ms per event
- **DOM Update:** <50ms (active agents list)
- **Duration Calculation:** Real-time (1s interval, negligible overhead)

### README Load Time
- **File Size:** ~60KB (1213 lines → ~1250 lines after restructure)
- **GitHub Render:** <2s (standard markdown rendering)
- **TOC Generation:** Instant (GitHub auto-generates)

---

## Security Considerations

### Dashboard Security
- **Localhost Only:** Server binds to 127.0.0.1 (no external access)
- **Port Range:** 8080-8099 (non-privileged ports, safe)
- **No Authentication:** Not needed (local development tool)
- **File Access:** Serves `.2L/` directory only (project-scoped)

### Template Processing
- **No Code Injection:** Bash parameter expansion is safe (no eval)
- **Special Character Handling:** Project names are used in HTML context
  - Risk: Low (most project names are alphanumeric)
  - Mitigation: Validation step checks for incomplete replacement
- **No Remote Templates:** Template always local (`~/.claude/lib/`)

### Events File
- **Read-Only Access:** Dashboard only reads events.jsonl (no writes)
- **JSONL Parsing:** try-catch around JSON.parse() prevents errors
- **No Sensitive Data:** Events contain agent names and task descriptions only

---

## Testing Strategy

### Unit Testing (Manual)
**Not applicable** - Iteration 2 is pure refactoring, no new business logic to unit test.

### Integration Testing (Manual)

**Test 1: Dashboard Generation**
```bash
cd ~/test-project
rm -rf .2L/dashboard  # Clean slate
time /2l-dashboard    # Must complete in <2s
grep '{' .2L/dashboard/index.html  # Should return nothing
```

**Test 2: Active Agents Tracking**
```bash
/2l-mvp "simple task"   # Generate real agent_start/agent_complete events
# Verify dashboard shows agents in "Active Agents" section
# Verify duration updates in real-time
# Verify agents disappear on completion
```

**Test 3: Edge Cases**
```bash
# Test with project name containing space
mkdir "my app" && cd "my app"
/2l-dashboard  # Should generate valid HTML

# Test with orphaned agent_start (no complete)
# Create test events.jsonl with only agent_start
# Verify dashboard keeps agent in active list
```

**Test 4: README Validation**
```bash
# Open README.md in GitHub preview
# Click all TOC links
# Verify Quick Start appears first
# Verify all code examples still present
```

### Performance Testing

**Dashboard Startup Benchmark:**
```bash
for i in {1..5}; do
  rm -rf .2L/dashboard
  time /2l-dashboard
done
# All runs must complete in <2s
```

**Browser Console Check:**
```bash
# Open dashboard in Chrome
# Open DevTools Console (F12)
# Verify zero JavaScript errors
# Verify event polling works (Network tab shows /events.jsonl requests every 2s)
```

---

## Dependency Matrix

| Component | Depends On | Version | Status |
|-----------|-----------|---------|--------|
| `/2l-dashboard` command | Bash 4.0+ | Any | ✅ Validated |
| Template processing | `~/.claude/lib/2l-dashboard-template.html` | Iteration 1 | ✅ Exists |
| Dashboard HTML | Python 3 http.server | 3.x | ✅ Validated |
| Port allocation | lsof | Any | ✅ Pre-installed |
| Event logging | `~/.claude/lib/2l-event-logger.sh` | Iteration 1 | ✅ Exists |
| README | Markdown renderer (GitHub) | N/A | ✅ Standard |

**Critical Path:** Iteration 1 → Iteration 2 (fully dependent)

**No Circular Dependencies:** All dependencies flow one direction (Iteration 1 → Iteration 2)

---

## Migration Notes

### From Current Dashboard (Agent-Based)

**What Changes:**
1. `/2l-dashboard` command lines 54-64 replaced with inline template processing
2. Dashboard template line 421: `agent_spawn` → `agent_start`
3. Dashboard template: Add CSS for `.event-type-agent_start`
4. README structure reorganized (content unchanged)

**What Stays the Same:**
1. Port allocation logic (lines 97-117)
2. Server PID tracking (lines 66-95)
3. Python HTTP server configuration (lines 132-149)
4. Event system format (JSONL schema)
5. All existing dashboard features (metrics, timeline, phase visualization)

**Breaking Changes:**
- Old dashboard templates (if any exist) will not show active agents until updated
- This is acceptable (internal tool, single developer)

**Rollback Procedure:**
If new dashboard fails, restore from backup:
```bash
cd ~/.claude/.2l-backups/$(ls -t ~/.claude/.2l-backups/ | head -1)
cp commands/2l-dashboard.md ~/.claude/commands/
cp lib/2l-dashboard-template.html ~/.claude/lib/
```

---

## Conclusion

**Technology Stack Summary:**
- ✅ Bash 4.0+ for template processing (validated, proven)
- ✅ HTML/CSS/JavaScript for dashboard UI (fix 1 bug, add 1 CSS rule)
- ✅ Markdown for README (reorganize, don't rewrite)
- ✅ Python 3 http.server for dashboard serving (unchanged)
- ✅ JSONL for event format (unchanged)

**Key Success Factors:**
1. ZERO new dependencies (everything from Iteration 1)
2. Simple bash string replacement (30s → <2s improvement)
3. Single event type fix (agent_spawn → agent_start)
4. README reorganization preserves all content

**Risk Level: LOW**
- All technologies proven in Iteration 1
- No complex integrations
- Isolated changes with clear rollback path

The planner can confidently proceed with builder task creation using this validated technology stack.
