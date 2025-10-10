# Explorer 1 Report: Architecture & Structure

## Executive Summary

Iteration 2 builds upon a solid foundation established in Iteration 1, focusing on UX improvements and documentation polish. The architecture is straightforward: modify the existing dashboard command to directly generate HTML (eliminating the 30-second agent spawn overhead), fix JavaScript event parsing logic in the dashboard template, and restructure the README for beginner accessibility. All components are isolated with clear boundaries and minimal cross-dependencies.

## Discoveries

### Current Architecture (Iteration 1 Deliverables)

**Installation Infrastructure:**
- `2l.sh` - Main installation script (516 lines bash, production-ready)
- `~/.claude/agents/` - Agent definitions (markdown files)
- `~/.claude/commands/` - Command definitions (markdown with embedded bash)
- `~/.claude/lib/` - Shared libraries (event logger, dashboard template)
- `.2L/.2l-install.yaml` - Installation state tracking

**Dashboard System:**
- **Current Flow:** Command → Spawns agent → Agent reads template → Agent replaces placeholders → Agent writes HTML → Server starts
- **Issue:** 30-second overhead from agent spawning just to perform simple string replacement
- **Target Flow:** Command → Read template → Replace placeholders inline → Write HTML → Server starts

**Event System:**
- Event types: `plan_start`, `iteration_start`, `phase_change`, `agent_start`, `agent_complete`, `validation_result`, `iteration_complete`, `complexity_decision`, `agent_spawn`
- Format: JSONL (JSON Lines) in `.2L/events.jsonl`
- Library: `~/.claude/lib/2l-event-logger.sh` (52 lines, production-ready)

### Dashboard Template Analysis

**File:** `/home/ahiya/2l-claude-config/lib/2l-dashboard-template.html` (482 lines)

**Placeholders:**
- `{PROJECT_NAME}` - Replaced with directory basename
- `{EVENTS_PATH}` - Relative path to events file (always `../events.jsonl`)
- `{TIMESTAMP}` - Generation timestamp (UTC format)

**JavaScript Event Processing (Lines 402-442):**
```javascript
case 'agent_spawn':  // ISSUE: Should be 'agent_start'
  activeAgents.set(event.agent_id, {
    task: event.data,
    startTime: new Date(event.timestamp)
  });
  break;

case 'agent_complete':  // CORRECT: Matches actual event type
  activeAgents.delete(event.agent_id);
  break;
```

**Problem Identified:** Dashboard listens for `agent_spawn` events but agents emit `agent_start` events. This mismatch prevents active agent tracking from working.

**Evidence from events.jsonl:**
- Line 11: `"event_type":"agent_spawn"` (orchestrator spawning agents)
- Line 15-18: `"event_type":"agent_start"` (agents starting work)
- Line 19-20: `"event_type":"agent_complete"` (agents completing work)

**Two Event Types Exist:**
1. `agent_spawn` - Emitted by orchestrator when spawning agents (not when agent actually starts)
2. `agent_start` - Emitted by agent when beginning work (what dashboard should track)

### File Structure for Iteration 2

**Modified Files:**
1. `/home/ahiya/2l-claude-config/commands/2l-dashboard.md` (187 lines)
   - Remove agent spawning logic (lines 54-63)
   - Add inline template processing
   - Maintain all existing functionality (port allocation, server management)

2. `/home/ahiya/2l-claude-config/lib/2l-dashboard-template.html` (482 lines)
   - Fix line 421: Change `case 'agent_spawn':` to `case 'agent_start':`
   - Add CSS styling for `agent_start` event type (currently missing)
   - Test with real events.jsonl to verify parsing

3. `/home/ahiya/Ahiya/2L/README.md` (1213 lines)
   - Restructure top section (lines 1-60)
   - Add Quick Start section (5 steps max)
   - Move advanced content down
   - Preserve all existing documentation

**New Files:**
None - All work is modification of existing files

**Dependencies:**
- Iteration 1 complete (lib directory exists with template and event logger)
- `~/.claude/lib/2l-dashboard-template.html` must exist
- Bash string manipulation capabilities (sed, awk, or bash parameter expansion)

## Patterns Identified

### Pattern 1: Direct Template Processing Pattern

**Description:** Command reads template, performs string replacement inline, writes output

**Use Case:** When template customization is simple (3 placeholders, no complex logic)

**Example:**
```bash
# Read template
TEMPLATE=$(cat "$HOME/.claude/lib/2l-dashboard-template.html")

# Get values
PROJECT_NAME=$(basename "$(pwd)")
EVENTS_PATH="../events.jsonl"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Replace placeholders
HTML="${TEMPLATE//\{PROJECT_NAME\}/$PROJECT_NAME}"
HTML="${HTML//\{EVENTS_PATH\}/$EVENTS_PATH}"
HTML="${HTML//\{TIMESTAMP\}/$TIMESTAMP}"

# Write output
mkdir -p .2L/dashboard
echo "$HTML" > .2L/dashboard/index.html
```

**Recommendation:** YES - Use for dashboard generation. Simple, fast (<2s), eliminates agent overhead.

### Pattern 2: Event Type Alignment Pattern

**Description:** Dashboard event handlers must match event types emitted by system

**Use Case:** Real-time tracking of agent activity in dashboard

**Example:**
```javascript
// CORRECT: Listen for actual event types from events.jsonl
case 'agent_start':  // Matches what agents emit
  activeAgents.set(event.agent_id, {
    task: event.data,
    startTime: new Date(event.timestamp)
  });
  break;

case 'agent_complete':  // Matches what agents emit
  activeAgents.delete(event.agent_id);
  break;
```

**Recommendation:** YES - Fix dashboard template to use `agent_start` instead of `agent_spawn`.

### Pattern 3: Documentation Progressive Disclosure Pattern

**Description:** Show simple quick start first, defer complexity to later sections

**Use Case:** README restructuring for beginner-friendly onboarding

**Example:**
```markdown
# Quick Start (5 steps)
1. git clone https://github.com/user/2L.git && cd 2L
2. ./2l.sh install
3. /2l-setup-db
4. /2l-mvp "build a todo app"
5. /2l-dashboard (in another terminal)

# [Advanced Topics Below - Detailed Sections]
```

**Recommendation:** YES - Use for README restructure. Reduces cognitive load for new users.

### Pattern 4: Command Idempotency Pattern

**Description:** Commands can be run multiple times safely, reusing existing resources

**Use Case:** Dashboard command checks if server already running, reuses port

**Implementation in 2l-dashboard.md (lines 67-95):**
- Checks `.server-port` and `.server-pid` files
- Verifies process still running via `ps -p $PID`
- Reuses existing server if alive
- Cleans up stale files if process died

**Recommendation:** PRESERVE - This pattern is already implemented correctly. Maintain during refactor.

## Complexity Assessment

### High Complexity Areas

**None** - All features are straightforward modifications

### Medium Complexity Areas

**1. Dashboard Command Refactor**
- **Complexity:** String replacement with bash (moderate)
- **Challenge:** Handle special characters in placeholders correctly
- **Estimated Lines:** ~30 lines of new bash code
- **Builder Splits:** No split needed - single builder can complete

**2. Dashboard Template Event Fix**
- **Complexity:** JavaScript event handler modification (low-medium)
- **Challenge:** Update both switch case and CSS styling
- **Estimated Lines:** ~5 lines changed (1 case statement + 1 CSS rule)
- **Builder Splits:** No split needed - bundled with dashboard refactor

### Low Complexity Areas

**1. README Restructuring**
- **Complexity:** Content reorganization (low)
- **Challenge:** Preserve all existing information while reordering
- **Estimated Lines:** ~50 lines moved/restructured
- **Builder Splits:** No split needed - simple content editing

## Technology Recommendations

### Primary Stack

**Bash Scripting**
- **Choice:** Bash 4.0+ with parameter expansion
- **Rationale:** 
  - Already used in all Iteration 1 deliverables
  - Native string replacement: `${VAR//pattern/replacement}`
  - No external dependencies (sed/awk optional)
  - Fast execution (<1s for template processing)
  - Proven stable in production (Iteration 1 validation: 10/10 runs successful)

**Markdown**
- **Choice:** Standard markdown for command definitions
- **Rationale:**
  - Existing pattern from Iteration 1 (all commands in markdown)
  - Embedded bash blocks with triple backticks
  - Human-readable documentation format
  - No build step required

### Supporting Libraries

**Event Logger (Existing)**
- **Library:** `~/.claude/lib/2l-event-logger.sh`
- **Purpose:** Optional event emission (graceful degradation)
- **Status:** Already implemented, no changes needed

**Dashboard Template (Existing)**
- **File:** `~/.claude/lib/2l-dashboard-template.html`
- **Purpose:** HTML/CSS/JS template for project dashboards
- **Status:** Requires 1-line fix (agent_spawn → agent_start)

## Integration Points

### Internal Integrations

**Dashboard Command ↔ Dashboard Template**
- **Connection:** Command reads template from `~/.claude/lib/`, replaces placeholders
- **Data Flow:** Template (with placeholders) → Command (string replacement) → HTML output
- **Dependency:** Template must exist before command runs
- **Risk:** LOW - Template created by Iteration 1, file existence check in place

**Dashboard Template ↔ Events File**
- **Connection:** JavaScript polls `.2L/events.jsonl` every 2 seconds
- **Data Flow:** events.jsonl (JSONL) → fetch() → JSON.parse() → processEvent()
- **Dependency:** Events file created by orchestrator/agents
- **Risk:** LOW - Graceful degradation if file missing (displays "Waiting for events...")

**Installation Script ↔ Command Files**
- **Connection:** `2l.sh install` copies commands to `~/.claude/commands/`
- **Data Flow:** `/home/ahiya/2l-claude-config/commands/` → `~/.claude/commands/`
- **Dependency:** Modified command must be in source directory before install
- **Risk:** LOW - Standard copy operation, proven idempotent in Iteration 1

### External Integrations

**Python HTTP Server (Existing)**
- **Integration:** Dashboard command spawns `python3 -m http.server`
- **Purpose:** Serve dashboard HTML and events.jsonl (CORS requirement)
- **Dependency:** Python 3 installed on system
- **Risk:** LOW - Iteration 1 validation confirmed Python 3 availability check works

**Browser (Existing)**
- **Integration:** Dashboard opens in browser via `xdg-open` (Linux) or `open` (macOS)
- **Purpose:** Display dashboard UI to user
- **Dependency:** Desktop environment with browser
- **Risk:** LOW - Fallback message if auto-open fails

## Risks & Challenges

### Technical Risks

**Risk 1: Bash String Replacement with Special Characters**
- **Impact:** MEDIUM - Incorrect escaping could break HTML output
- **Likelihood:** LOW - Placeholders are simple alphanumeric strings
- **Mitigation:**
  - Use bash parameter expansion: `${VAR//pattern/replacement}`
  - Test with project names containing spaces, hyphens, underscores
  - Validate HTML output after generation (check for unescaped `{` characters)
- **Example Test Cases:**
  - Project name: "my-app" → Should work
  - Project name: "my app" (space) → Should work
  - Project name: "my_app_2.0" → Should work

**Risk 2: Dashboard Template CSS Missing for agent_start**
- **Impact:** LOW - Event styling missing, but functionality works
- **Likelihood:** HIGH - Currently no CSS rule for `.event-type-agent_start`
- **Mitigation:**
  - Add CSS rule: `.event-type-agent_start { background: #3fb950; color: #000; }` (same as agent_complete)
  - Test with real events.jsonl to verify color-coding
- **Fix:** 1 line addition to template

**Risk 3: README Restructure Loses Critical Information**
- **Impact:** HIGH - Missing setup steps could break user onboarding
- **Likelihood:** LOW - Content reorganization, not deletion
- **Mitigation:**
  - Use Table of Contents to map old sections to new sections
  - Diff before/after to ensure all headings preserved
  - Validate all links still work (no broken anchors)
- **Validation:** Word count should remain ~same (1213 lines → ~1250 lines)

### Complexity Risks

**Risk 1: Builder Attempts to Over-Engineer Dashboard Generation**
- **Likelihood:** MEDIUM - Simple task might tempt unnecessary complexity
- **Impact:** MEDIUM - Wasted time, potential bugs from complex logic
- **Mitigation:**
  - Planner provides exact bash pattern to use (parameter expansion)
  - Builder instructions emphasize simplicity: "No sed/awk unless parameter expansion fails"
  - Acceptance criteria: <30 lines of new bash code

**Risk 2: Event Type Confusion (agent_spawn vs agent_start)**
- **Likelihood:** MEDIUM - Builder might not understand two separate events
- **Impact:** MEDIUM - Fix might target wrong event type
- **Mitigation:**
  - Planner provides clear explanation of both event types
  - Builder instructions include grep command to verify actual events in events.jsonl
  - Testing requirement: Validate with real orchestration (spawn agent, check dashboard)

## Recommendations for Planner

### 1. Single Builder Strategy

**Recommendation:** Assign all 3 features to one builder (Builder-1).

**Rationale:**
- Total estimated work: ~50 lines of code changes
- All changes are isolated (no conflicts between features)
- Single context: Dashboard/documentation theme
- Low complexity across all features
- No integration dependencies between features

**Risk:** LOW - Builder can complete in single session (<2 hours estimated)

### 2. Clear Bash Pattern Specification

**Recommendation:** Provide exact bash code pattern for template replacement in builder task.

**Pattern to Specify:**
```bash
# Read template
TEMPLATE=$(cat "$HOME/.claude/lib/2l-dashboard-template.html")

# Get replacement values
PROJECT_NAME=$(basename "$(pwd)")
EVENTS_PATH="../events.jsonl"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Replace placeholders (bash parameter expansion)
HTML="${TEMPLATE//\{PROJECT_NAME\}/$PROJECT_NAME}"
HTML="${HTML//\{EVENTS_PATH\}/$EVENTS_PATH}"
HTML="${HTML//\{TIMESTAMP\}/$TIMESTAMP}"

# Validate (check no placeholders remain)
if echo "$HTML" | grep -q '{'; then
  echo "Error: Template replacement incomplete"
  exit 1
fi

# Write output
mkdir -p .2L/dashboard
echo "$HTML" > .2L/dashboard/index.html
```

**Benefit:** Eliminates builder decision-making, ensures correct implementation, reduces risk.

### 3. Testing Strategy for Active Agents Fix

**Recommendation:** Require builder to test with real orchestration events.

**Test Procedure:**
```bash
# 1. Generate fresh events with agent_start/agent_complete
/2l-mvp "simple test task"  # Spawns agents, generates events

# 2. Start dashboard
/2l-dashboard

# 3. Verify active agents section shows agents during execution
# 4. Verify agents disappear when complete
# 5. Check browser console for errors
```

**Acceptance Criteria:**
- Active agents section populates during orchestration
- Duration updates in real-time (every 1 second)
- Agents removed from list on completion
- Zero JavaScript console errors

### 4. README Validation Checklist

**Recommendation:** Provide pre/post restructure checklist for builder.

**Checklist:**
- [ ] Quick Start section at top (lines 1-60)
- [ ] 5 steps or fewer in Quick Start
- [ ] First mention of `2l.sh install` in Quick Start
- [ ] Table of Contents updated with new structure
- [ ] All original sections preserved (count headings: before = after)
- [ ] All links functional (test anchors like `#event-system-architecture`)
- [ ] Word count within 10% of original (1213 lines ± 120 lines)
- [ ] Code examples unchanged (don't modify working examples)

### 5. Performance Target Enforcement

**Recommendation:** Set strict performance criteria for dashboard startup.

**Targets:**
- Dashboard generation: <0.5 seconds (bash string replacement)
- Server startup: <1 second (Python HTTP server)
- Total /2l-dashboard execution: <2 seconds (measured wall-clock time)

**Measurement:**
```bash
time /2l-dashboard
# Expected: real <2s
```

**Validation:** Run 5 times, all runs must complete in <2s.

## Resource Map

### Critical Files/Directories

**Source Configuration (Read-Only):**
- `/home/ahiya/2l-claude-config/commands/2l-dashboard.md` - Dashboard command definition
- `/home/ahiya/2l-claude-config/lib/2l-dashboard-template.html` - Dashboard HTML template
- `/home/ahiya/2l-claude-config/agents/2l-dashboard-builder.md` - Agent to be deprecated (not deleted, kept for reference)

**Working Directory:**
- `/home/ahiya/Ahiya/2L/README.md` - Main documentation file (1213 lines)
- `/home/ahiya/Ahiya/2L/2l.sh` - Installation script (references commands in README)

**Runtime Files (Generated):**
- `.2L/dashboard/index.html` - Generated dashboard (replaced by command, not agent)
- `.2L/dashboard/.server-port` - Server port allocation (8080-8099)
- `.2L/dashboard/.server-pid` - Server process ID
- `.2L/events.jsonl` - Event stream (read by dashboard)

**Installation Target (Post-Install):**
- `~/.claude/commands/2l-dashboard.md` - Installed command (copied by 2l.sh install)
- `~/.claude/lib/2l-dashboard-template.html` - Installed template
- `~/.claude/lib/2l-event-logger.sh` - Event logging library

### Key Dependencies

**Bash 4.0+**
- **Why Needed:** Parameter expansion syntax `${VAR//pattern/replacement}`
- **Check Command:** `bash --version | grep -oE '[0-9]+\.[0-9]+' | head -1`
- **Fallback:** Use sed if bash <4.0: `sed "s/{PROJECT_NAME}/$PROJECT_NAME/g"`

**Python 3**
- **Why Needed:** HTTP server for dashboard (already validated in Iteration 1)
- **Check Command:** `python3 --version`
- **Error Handling:** Already implemented in 2l-dashboard.md (lines 119-130)

**Iteration 1 Deliverables**
- **Why Needed:** Template and library files must exist
- **Validation:** Iteration 1 passed with 95% confidence (see validation report)
- **Risk:** NONE - Iteration 1 complete and validated

### Testing Infrastructure

**Manual Testing:**
- **Dashboard Generation:** Run `/2l-dashboard`, verify HTML created in <2s
- **Active Agents Tracking:** Run `/2l-mvp`, watch dashboard update in real-time
- **README Clarity:** Fresh user reads Quick Start, completes setup in <5 minutes

**Automated Validation:**
- **Bash Syntax:** `bash -n` on modified command file
- **HTML Validation:** Check for unescaped placeholders: `grep '{' .2L/dashboard/index.html`
- **Link Validation:** `grep -o '\[.*\](#.*)' README.md` (verify anchors exist)

**Performance Validation:**
- **Dashboard Startup:** `time /2l-dashboard` (must be <2s for 5 consecutive runs)
- **Template Size:** `wc -l .2L/dashboard/index.html` (should match template: 482 lines)

## Questions for Planner

### Question 1: Agent Deprecation Strategy

**Question:** Should `2l-dashboard-builder.md` agent file be deleted or marked deprecated?

**Context:** Agent no longer needed after command modification. File exists at `/home/ahiya/2l-claude-config/agents/2l-dashboard-builder.md`.

**Options:**
1. Delete file (clean removal, reduces agent count)
2. Rename to `2l-dashboard-builder.deprecated.md` (preserves reference)
3. Keep file with deprecation notice in header (documentation)

**Recommendation:** Option 3 - Keep file with deprecation notice. Useful for understanding historical implementation.

### Question 2: README Quick Start Content

**Question:** Which 5 steps should Quick Start include?

**Proposed Steps:**
1. `git clone https://github.com/user/2L.git && cd 2L`
2. `./2l.sh install`
3. `/2l-setup-db` (optional? requires sudo)
4. `/2l-setup-mcps` (optional? requires MCP installation)
5. `/2l-mvp "build a todo app"`
6. `/2l-dashboard` (monitor progress)

**Issue:** 6 steps proposed, target is 5 max.

**Options:**
1. Combine setup steps: "3. Run setup: `/2l-setup-db && /2l-setup-mcps`"
2. Make setup optional: "3. Optional: `/2l-setup-db` and `/2l-setup-mcps`"
3. Move dashboard to separate section: "Monitoring" (not in Quick Start)

**Recommendation:** Option 2 - Emphasize optional setup, keep Quick Start to core workflow.

### Question 3: Event Type Naming Consistency

**Question:** Should orchestrator also emit `agent_start` instead of `agent_spawn`?

**Context:** Currently two event types exist:
- `agent_spawn` (orchestrator emits when spawning agent)
- `agent_start` (agent emits when starting work)

**Issue:** Slight time gap between spawn and start (~1-2 seconds). Dashboard wants to show when agent is actively working (start), not when spawned.

**Options:**
1. Keep both events (orchestrator: spawn, agent: start) - current behavior
2. Deprecate `agent_spawn`, orchestrator only emits `agent_start` when agent confirms readiness
3. Dashboard tracks both: "Spawned" → "Active" state transition

**Recommendation:** Option 1 - Keep both events. They represent different moments in agent lifecycle. Dashboard fix is correct (track agent_start, not agent_spawn).

---

**Report Generated:** 2025-10-10 08:09 UTC  
**Explorer:** Explorer-1 (Architecture & Structure)  
**Iteration:** 2 (Dashboard UX & Documentation Polish)  
**Status:** COMPLETE
