# Builder Task Breakdown - Iteration 2

## Overview

**1 primary builder** will complete all 3 features sequentially in this iteration.

**Why single builder:**
- Total estimated work: ~60 lines of code changes
- All features are isolated (no file conflicts)
- Single theme: Dashboard/documentation improvements
- Low complexity across all features
- No integration dependencies between features

**Estimated total time:** 5-7 hours (single session)

**No builder splits expected** - All tasks are LOW-MEDIUM complexity, well within single builder capacity.

---

## Builder-1: Dashboard UX & Documentation Polish

### Scope

Complete all 3 features for Iteration 2:
1. **Active Agents Dashboard Fix** - Fix event type bug in JavaScript (agent_spawn → agent_start)
2. **Direct Dashboard Start** - Remove agent spawning, generate HTML inline with bash
3. **Simplified README** - Restructure documentation for beginner accessibility

All changes are isolated refactoring with clear patterns. No new features, no new dependencies.

### Complexity Estimate

**MEDIUM**

**Breakdown:**
- Task 1 (Active Agents Fix): LOW-MEDIUM (JavaScript bug fix + edge cases)
- Task 2 (Direct Dashboard): MEDIUM (bash refactoring, preserve critical logic)
- Task 3 (README): LOW (content reorganization only)

**Split recommendation:** NO SPLIT - Total work is manageable in single session (5-7 hours)

### Success Criteria

- [ ] Dashboard startup time <2 seconds (measured with `time /2l-dashboard`)
- [ ] Active agents section displays agents correctly during orchestration
- [ ] Active agents duration updates in real-time (every 1 second)
- [ ] Completed agents removed from active list
- [ ] No JavaScript errors in browser console
- [ ] Template replacement validated (no remaining `{` placeholders)
- [ ] README Quick Start appears first (5 steps)
- [ ] All README links functional (test anchor navigation)
- [ ] All existing dashboard functionality preserved (port allocation, server management)

### Files to Modify

#### 1. `/home/ahiya/2l-claude-config/lib/2l-dashboard-template.html`
**Purpose:** Fix active agents event tracking

**Changes:**
- Line ~421: Change `case 'agent_spawn':` to `case 'agent_start':`
- Add CSS rule for `.event-type-agent_start` (same styling as agent_complete)

**Critical:** Test with real events.jsonl to verify parsing

#### 2. `/home/ahiya/2l-claude-config/commands/2l-dashboard.md`
**Purpose:** Generate dashboard HTML directly (no agent spawning)

**Changes:**
- Lines 54-64: Remove agent spawning logic
- Add inline template processing:
  ```bash
  TEMPLATE=$(cat ~/.claude/lib/2l-dashboard-template.html)
  PROJECT_NAME=$(basename "$(pwd)")
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
  EVENTS_PATH="../events.jsonl"

  HTML="${TEMPLATE//\{PROJECT_NAME\}/$PROJECT_NAME}"
  HTML="${HTML//\{TIMESTAMP\}/$TIMESTAMP}"
  HTML="${HTML//\{EVENTS_PATH\}/$EVENTS_PATH}"

  # Validate
  if echo "$HTML" | grep -q '{'; then
    echo "Error: Template replacement incomplete"
    exit 1
  fi

  mkdir -p .2L/dashboard
  echo "$HTML" > .2L/dashboard/index.html
  ```

**Critical:** DO NOT modify lines 97-117 (port allocation) or 132-149 (server startup)

#### 3. `/home/ahiya/Ahiya/2L/README.md`
**Purpose:** Restructure for beginner accessibility

**Changes:**
- Add Quick Start section at top (before line 5)
- Add Table of Contents after Quick Start
- Move "What is 2L?" conceptual content below Quick Start
- Preserve ALL existing content (reorganize, don't delete)

**Critical:** Test all anchor links after restructuring

### Dependencies

**External (from Iteration 1):**
- ✅ `~/.claude/lib/2l-dashboard-template.html` exists
- ✅ `~/.claude/lib/2l-event-logger.sh` exists
- ✅ Bash 4.0+ available (parameter expansion)
- ✅ Python 3 available (http.server)

**Internal (between tasks):**
- Task 1 independent (can start immediately)
- Task 2 independent (can start immediately)
- Task 3 independent (can start immediately)
- **Recommendation:** Execute in order 1→2→3 for logical flow

### Implementation Notes

#### Task 1: Active Agents Dashboard Fix

**File:** `/home/ahiya/2l-claude-config/lib/2l-dashboard-template.html`

**Step 1: Fix event type**
```javascript
// Find line ~421 (search for "case 'agent_spawn':")
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

**Step 2: Add CSS styling**
```css
/* Add to CSS section (around line 100-200) */
.event-type-agent_start {
  background: #3fb950;  /* Green - same as agent_complete */
  color: #000;
}
```

**Step 3: Edge case handling (optional enhancement)**
```javascript
// In processEvent function, add defensive checks:
case 'agent_start':
  if (event.agent_id && event.timestamp) {  // Validate required fields
    activeAgents.set(event.agent_id, {
      task: event.data || 'Unknown task',
      startTime: new Date(event.timestamp)
    });
  }
  break;
```

**Validation:**
1. Test with real orchestration: `/2l-mvp "test task"`
2. Verify active agents appear in dashboard
3. Verify duration updates every second
4. Check browser console for errors (should be zero)

---

#### Task 2: Direct Dashboard Start

**File:** `/home/ahiya/2l-claude-config/commands/2l-dashboard.md`

**Step 1: Replace lines 54-64**

Find this section:
```bash
# Check if dashboard HTML exists, spawn builder if missing
if [ ! -f ".2L/dashboard/index.html" ]; then
  echo "Dashboard HTML not found. Generating..."
  echo ""
  echo "Please run the 2l-dashboard-builder agent to generate the dashboard:"
  echo "  1. In Claude chat, type: @2l-dashboard-builder"
  echo "  2. Or use Task tool to spawn the agent"
  echo ""
  echo "After the agent completes, run /2l-dashboard again."
  exit 1
fi
```

Replace with:
```bash
# Generate dashboard HTML directly (no agent spawning)
TEMPLATE_PATH="$HOME/.claude/lib/2l-dashboard-template.html"

# Pre-flight check
if [ ! -f "$TEMPLATE_PATH" ]; then
  echo "Error: Dashboard template not found at $TEMPLATE_PATH"
  echo ""
  echo "Run installation: ./2l.sh install"
  exit 1
fi

# Read template
TEMPLATE=$(cat "$TEMPLATE_PATH")

# Get replacement values
PROJECT_NAME=$(basename "$(pwd)")
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
EVENTS_PATH="../events.jsonl"

# Replace placeholders (bash 4.0+ parameter expansion)
HTML="${TEMPLATE//\{PROJECT_NAME\}/$PROJECT_NAME}"
HTML="${HTML//\{TIMESTAMP\}/$TIMESTAMP}"
HTML="${HTML//\{EVENTS_PATH\}/$EVENTS_PATH}"

# Validate replacement completed
if echo "$HTML" | grep -q '{.*}'; then
  echo "Error: Template replacement incomplete"
  echo ""
  echo "Remaining placeholders found in output:"
  echo "$HTML" | grep -o '{[^}]*}' | head -5
  exit 1
fi

# Write output
mkdir -p .2L/dashboard
echo "$HTML" > .2L/dashboard/index.html

echo "✓ Dashboard HTML generated successfully"
echo ""
```

**Step 2: Verify bash version compatibility (optional)**
```bash
# Add after TEMPLATE_PATH definition (optional enhancement)
BASH_VERSION_MAJOR=$(echo "$BASH_VERSION" | cut -d. -f1)
if [ "$BASH_VERSION_MAJOR" -lt 4 ]; then
  echo "Warning: Bash version < 4.0 detected"
  echo "Using sed fallback for string replacement"
  HTML=$(echo "$TEMPLATE" | sed "s|{PROJECT_NAME}|$PROJECT_NAME|g")
  HTML=$(echo "$HTML" | sed "s|{TIMESTAMP}|$TIMESTAMP|g")
  HTML=$(echo "$HTML" | sed "s|{EVENTS_PATH}|$EVENTS_PATH|g")
else
  # Bash 4.0+ parameter expansion (preferred)
  HTML="${TEMPLATE//\{PROJECT_NAME\}/$PROJECT_NAME}"
  HTML="${HTML//\{TIMESTAMP\}/$TIMESTAMP}"
  HTML="${HTML//\{EVENTS_PATH\}/$EVENTS_PATH}"
fi
```

**Critical Warnings:**
- ⚠️ **DO NOT MODIFY** lines 97-117 (port allocation logic)
- ⚠️ **DO NOT MODIFY** lines 66-95 (server reuse logic)
- ⚠️ **DO NOT MODIFY** lines 132-149 (server startup logic)
- ⚠️ **ONLY MODIFY** lines 54-64 (agent spawning section)

**Validation:**
1. Performance test: `time /2l-dashboard` (must be <2s)
2. HTML validation: `grep '{' .2L/dashboard/index.html` (should return nothing)
3. Multi-project test: Start dashboards in 2 different projects (should get different ports)
4. Reuse test: Run `/2l-dashboard` twice (should reuse same port)

---

#### Task 3: Simplified README

**File:** `/home/ahiya/Ahiya/2L/README.md`

**Step 1: Add Quick Start section (before line 5)**
```markdown
# 2L - Two-Level Orchestration System

2L is an AI agent orchestration system that breaks down complex development tasks into manageable iterations executed by specialized agents.

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
```

**Step 2: Add Table of Contents**
```markdown
## Table of Contents

- [Quick Start](#quick-start-5-minutes)
- [What is 2L?](#what-is-2l)
- [Core Workflow](#core-workflow)
- [Event System Architecture](#event-system-architecture)
- [Dashboard Access](#dashboard-access)
- [Advanced Topics](#advanced-topics)
  - [MCP Integration](#mcp-integration)
  - [GitHub Integration](#github-integration)
  - [Setup Verification](#setup-verification)
  - [Architecture Decisions](#architecture-decisions)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

---
```

**Step 3: Reorganize existing content**
- Move "Overview & Quick Start" conceptual content to "What is 2L?" section
- Keep all existing sections intact
- Group advanced topics under "Advanced Topics" heading
- Preserve all code examples, links, and documentation

**Step 4: Update existing "Quick Example" section**
```markdown
## Core Workflow

[Keep existing diagram and explanation]

### Quick Example

```bash
# Navigate to your project directory
cd ~/projects/my-app

# Start orchestration
/2l-mvp "Create a REST API with authentication and user management"

# Open dashboard in another terminal to watch progress
/2l-dashboard
```

The dashboard will show:
- Real-time event timeline
- Active agents and their progress
- Current phase and metrics
- All events color-coded by type

[Keep rest of content]
```

**Validation Checklist:**
- [ ] Quick Start section appears first (before existing "Overview & Quick Start")
- [ ] Table of Contents with working anchor links
- [ ] All original sections preserved (count headings: before = after)
- [ ] Code examples unchanged (verify bash blocks intact)
- [ ] Links functional (test navigation from TOC)
- [ ] Word count within 10% of original (~1213 lines → ~1250 lines)
- [ ] GitHub preview renders correctly

---

### Patterns to Follow

**From `patterns.md`:**

1. **Bash String Replacement Pattern** (for Task 2)
   - Use parameter expansion: `${VAR//pattern/replacement}`
   - Validate output: `grep -q '{' && error`
   - Create directories: `mkdir -p .2L/dashboard`

2. **JavaScript Event Processing Pattern** (for Task 1)
   - Use Map for active agents: `activeAgents.set(id, data)`
   - Store timestamp as Date: `new Date(event.timestamp)`
   - Update duration in real-time: `setInterval(updateDurations, 1000)`

3. **Markdown Progressive Disclosure Pattern** (for Task 3)
   - Quick Start first (actionable steps)
   - Conceptual content second (What is 2L?)
   - Advanced topics last (grouped under one heading)

4. **Error Handling Pattern**
   - Bash: Fail fast with helpful message
   - JavaScript: try-catch with graceful degradation
   - Always validate inputs before processing

5. **Port Allocation Pattern** (PRESERVE, DO NOT MODIFY)
   - Check existing server (reuse port if alive)
   - Find available port (8080-8099 range)
   - Store port and PID for future reuse

### Testing Requirements

#### Unit Tests (Manual Validation)

**Test 1: Template Replacement**
```bash
cd ~/test-project
rm -rf .2L/dashboard
/2l-dashboard

# Verify HTML contains project name
grep "$(basename $(pwd))" .2L/dashboard/index.html || echo "FAIL: Project name not replaced"

# Verify no placeholders remain
grep '{' .2L/dashboard/index.html && echo "FAIL: Placeholders remain" || echo "PASS"
```

**Test 2: Active Agents Tracking**
```bash
# Generate real events
/2l-mvp "simple test task"

# Open dashboard in browser
# Manual verification:
# 1. Active agents section shows agents during execution ✓
# 2. Duration increments every second ✓
# 3. Agents disappear on completion ✓
# 4. Browser console shows zero errors ✓
```

**Test 3: Performance**
```bash
# Run 5 times, all must complete in <2s
for i in {1..5}; do
  rm -rf .2L/dashboard
  time /2l-dashboard 2>&1 | grep real
done
```

**Test 4: Edge Cases**
```bash
# Project name with special chars
mkdir "test-app_v2.0" && cd "test-app_v2.0"
/2l-dashboard || echo "FAIL: Special chars in project name"

# Multiple concurrent dashboards
cd ~/project1 && /2l-dashboard &
cd ~/project2 && /2l-dashboard &
# Verify different ports allocated

# Orphaned agent_start event
# Create test .2L/events.jsonl with only agent_start (no complete)
# Verify dashboard keeps agent in active list
```

**Test 5: README Validation**
```bash
# GitHub preview test (manual)
# 1. Open README.md in GitHub preview
# 2. Click all TOC links (should jump to sections)
# 3. Verify Quick Start appears first
# 4. Verify all code blocks render with syntax highlighting
```

#### Integration Tests

**Not applicable** - Single builder, no integration between tasks needed.

#### Performance Tests

**Dashboard Startup Benchmark:**
```bash
# Baseline (current with agent): ~30 seconds
# Target (new direct): <2 seconds

# Run benchmark
cd ~/test-project
rm -rf .2L/dashboard

start_time=$(date +%s)
/2l-dashboard >/dev/null 2>&1
end_time=$(date +%s)
duration=$((end_time - start_time))

if [ $duration -lt 2 ]; then
  echo "PASS: Dashboard started in ${duration}s"
else
  echo "FAIL: Dashboard took ${duration}s (target: <2s)"
fi
```

**Event Polling Performance:**
```bash
# Verify polling doesn't slow down with many events
# Create 100-event test file
for i in {1..100}; do
  echo "{\"timestamp\":\"2025-10-10T10:00:${i}Z\",\"event_type\":\"agent_start\",\"agent_id\":\"test-$i\",\"data\":\"Test\"}" >> .2L/events.jsonl
done

# Open dashboard, verify:
# - Only 50 most recent events displayed (performance limit)
# - Polling interval remains 2s (check Network tab)
# - No JavaScript lag or freezing
```

### Coverage Target

**100% coverage for modified code** (manual testing)

**Checklist:**
- [x] Template replacement with 3 placeholders
- [x] Validation of placeholder replacement
- [x] Event type change (agent_spawn → agent_start)
- [x] CSS styling for agent_start events
- [x] README Quick Start section
- [x] README Table of Contents
- [x] Port allocation (preserved, not modified)
- [x] Server startup (preserved, not modified)
- [x] Edge cases (special chars, orphaned events, concurrent dashboards)

### Potential Split Strategy

**If this task proves too complex, consider splitting:**

**NOT RECOMMENDED** - All tasks are LOW-MEDIUM complexity and can be completed by single builder in 5-7 hours.

However, if builder encounters unexpected complexity:

**Foundation:** Primary Builder-1 completes Tasks 1 & 2
- Active agents fix (1-2 hours)
- Direct dashboard start (2-3 hours)

**Sub-builder 1A:** README Restructure (only if time constrained)
- Estimated: LOW complexity, 1-2 hours
- Scope: Reorganize README.md for progressive disclosure
- Files: `/home/ahiya/Ahiya/2L/README.md`
- Success: Quick Start first, TOC functional, all content preserved

**Split decision criteria:**
- Builder-1 reports >8 hours total estimated time
- Unexpected complexity in dashboard refactoring (e.g., bash version issues)
- Critical bug discovered requiring extensive debugging

**Most likely outcome:** NO SPLIT (single builder completes all in one session)

---

## Builder Execution Order

### Sequential Execution (Recommended)

**Phase 1: Active Agents Fix** (1-2 hours)
- Builder-1 starts with Task 1
- Quickest win, validates approach early
- Tests event understanding immediately

**Phase 2: Direct Dashboard Start** (2-3 hours)
- Builder-1 continues with Task 2
- Core performance improvement (30s → <2s)
- Validates bash refactoring skills

**Phase 3: README Simplification** (1-2 hours)
- Builder-1 completes with Task 3
- Documentation polish, independent task
- Can be done while testing dashboard changes

### Total Timeline: 5-7 hours

**Parallel execution NOT recommended** - Single builder, all tasks benefit from sequential learning.

### Integration Notes

**No integration phase needed** - Single builder, all changes isolated:
- Task 1: Dashboard template JavaScript
- Task 2: Dashboard command bash
- Task 3: README markdown

**No shared files** - No conflict risk between tasks.

**Deployment:** After builder completes, run:
```bash
cd /home/ahiya/Ahiya/2L
./2l.sh install --update
```

This copies modified files from `/home/ahiya/2l-claude-config/` to `~/.claude/`.

---

## Risk Mitigation

### Risk 1: Port Allocation Regression
**Mitigation:** Explicit warning in Task 2 implementation notes - DO NOT MODIFY lines 97-117

**Verification:**
```bash
# Test multi-project port allocation
cd ~/project1 && /2l-dashboard  # Gets port 8080
cd ~/project2 && /2l-dashboard  # Gets port 8081
cd ~/project1 && /2l-dashboard  # Reuses port 8080
```

### Risk 2: Special Characters in Project Name
**Mitigation:** Validation step in bash (grep for remaining `{`)

**Test cases:**
```bash
# Test in directories with various names
mkdir "test-app" && cd "test-app" && /2l-dashboard
mkdir "test_app" && cd "test_app" && /2l-dashboard
mkdir "test app" && cd "test app" && /2l-dashboard
mkdir "test.app.2.0" && cd "test.app.2.0" && /2l-dashboard
```

### Risk 3: README Link Breakage
**Mitigation:** GitHub preview testing before finalizing

**Verification:**
```bash
# Extract all anchor links
grep -o '\[.*\](#.*)' README.md > links.txt

# Extract all heading IDs
grep '^#' README.md | sed 's/#* //' | tr '[:upper:]' '[:lower:]' | tr ' ' '-' > headings.txt

# Verify all links have matching headings (manual check)
```

### Risk 4: Event Parsing Edge Cases
**Mitigation:** try-catch in JavaScript, test with malformed events

**Test file:** `.2L/test-events.jsonl`
```jsonl
{"timestamp":"2025-10-10T10:00:00Z","event_type":"agent_start","agent_id":"test-1","data":"Normal event"}
{"timestamp":"invalid","event_type":"agent_start","agent_id":"test-2","data":"Bad timestamp"}
INVALID JSON LINE
{"event_type":"agent_start","agent_id":"test-3","data":"Missing timestamp"}
{"timestamp":"2025-10-10T10:00:00Z","event_type":"agent_complete","agent_id":"test-1","data":"Normal complete"}
```

Dashboard should:
- Display normal events (test-1 start and complete)
- Log warnings for invalid events (console)
- Continue functioning (no crash)

---

## Success Metrics

### Quantitative
- Dashboard startup: <2s (measured with `time /2l-dashboard`)
- Active agents accuracy: 100% (shows all active agents during orchestration)
- README comprehension: 90% (new users complete setup in <5 min)
- Zero JavaScript errors (browser console)
- Zero bash errors (command execution)

### Qualitative
- Dashboard feels instant (user perception)
- Active agents provide real-time visibility
- README Quick Start is self-explanatory
- No confusion about dashboard behavior

---

## Final Checklist

Before marking iteration complete:

- [ ] All 3 tasks completed by Builder-1
- [ ] Dashboard generates in <2s (5 consecutive runs)
- [ ] Active agents display correctly (test with real orchestration)
- [ ] No JavaScript errors in browser console
- [ ] README Quick Start appears first
- [ ] All README anchor links functional
- [ ] All existing functionality preserved
- [ ] No regressions (port allocation, server management)
- [ ] Deployment ready: `./2l.sh install --update` tested
- [ ] Documentation updated (if needed)

---

## Conclusion

**Builder-1 Scope Summary:**
- 3 isolated features
- ~60 lines of code changes
- 5-7 hours estimated
- LOW-MEDIUM complexity
- NO SPLIT needed

**Key Success Factors:**
1. Preserve critical infrastructure (port allocation, server management)
2. Test with real orchestration events (not mock data)
3. Validate all outputs (HTML, JSONL parsing, README links)
4. Follow patterns exactly (from patterns.md)

Builder-1 can proceed with confidence - all patterns proven, all dependencies validated, clear success criteria defined.
