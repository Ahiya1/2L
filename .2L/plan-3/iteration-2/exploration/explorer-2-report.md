# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

Iteration 2 builds on a solid bash-based foundation from Iteration 1, requiring minimal new technology. The focus is on **refactoring existing patterns** rather than introducing new frameworks. All three features (Direct Dashboard Start, Active Agents Fix, Simplified README) can be implemented using technologies already validated in Iteration 1.

**Key Finding:** The dashboard command currently spawns an unnecessary agent to generate HTML, adding ~30 seconds of overhead. The template already exists in `~/.claude/lib/2l-dashboard-template.html` (481 lines) - we just need bash string substitution to replace 3 placeholders and write the file directly.

**Active Agents Bug:** Dashboard JavaScript looks for `agent_spawn` events but actual events use `agent_start` (confirmed in events.jsonl). Simple find-replace fix in JavaScript.

## Discoveries

### Discovery 1: Dashboard Template Ready for Direct Use
The template at `~/.claude/lib/2l-dashboard-template.html` has only 3 placeholders:
- `{PROJECT_NAME}` - Current directory basename
- `{TIMESTAMP}` - ISO 8601 timestamp
- `{EVENTS_PATH}` - Path to events.jsonl (always `/events.jsonl` relative to dashboard)

**Implication:** No agent spawning needed. Bash can do inline substitution in <2 seconds.

### Discovery 2: Event Type Mismatch in Dashboard
**Current template (line 421-428):**
```javascript
case 'agent_spawn':
  activeAgents.set(event.agent_id, {
    task: event.data,
    startTime: new Date(event.timestamp)
  });
  break;

case 'agent_complete':
  activeAgents.delete(event.agent_id);
  break;
```

**Actual events in events.jsonl:**
```json
{"event_type":"agent_start","agent_id":"explorer-1","data":"Explorer-1: Starting..."}
{"event_type":"agent_complete","agent_id":"explorer-1","data":"Explorer-1: Complete"}
```

**Root Cause:** Template uses legacy event type `agent_spawn` instead of current `agent_start`.

### Discovery 3: README Structure is Well-Organized
Current README has 9 major sections, well-written but overwhelming for newcomers:
1. Overview & Quick Start (lines 1-61)
2. Event System Architecture (62-208)
3. Dashboard Access (209-364)
4. MCP Integration (365-526)
5. GitHub Integration (527-704)
6. Setup Verification (705-842)
7. Troubleshooting (843-1013)
8. Architecture Decisions (1014-1165)
9. Additional Resources (1166+)

**Issue:** No dedicated "Quick Start" at top. "Overview & Quick Start" section contains conceptual info but lacks step-by-step setup.

**Solution Needed:** Add new "Quick Start" section before line 5, referencing installation commands from Iteration 1.

### Discovery 4: Iteration 1 Provides All Dependencies
Iteration 1 delivered:
- `2l.sh` - Installation script (516 lines, bash)
- `~/.claude/lib/2l-dashboard-template.html` - Dashboard template (481 lines)
- `~/.claude/lib/2l-event-logger.sh` - Event logging library (51 lines)
- `/2l-setup-db` - Database setup command
- `/2l-setup-mcps` - MCP setup command

**All iteration 2 work depends on these existing files** - no new libraries needed.

## Patterns Identified

### Pattern 1: Bash Template Substitution
**Description:** Replace placeholders in template files using bash string manipulation

**Use Case:** Dashboard HTML generation without spawning agent

**Example:**
```bash
# Read template
TEMPLATE=$(cat ~/.claude/lib/2l-dashboard-template.html)

# Get values
PROJECT_NAME=$(basename "$PWD")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EVENTS_PATH="/events.jsonl"

# Substitute placeholders
echo "$TEMPLATE" | \
  sed "s|{PROJECT_NAME}|$PROJECT_NAME|g" | \
  sed "s|{TIMESTAMP}|$TIMESTAMP|g" | \
  sed "s|{EVENTS_PATH}|$EVENTS_PATH|g" > .2L/dashboard/index.html
```

**Recommendation:** Use this pattern. Performance: <1 second for 481-line template.

### Pattern 2: JavaScript Event Type Fix
**Description:** Fix event type from agent_spawn to agent_start in dashboard template

**Use Case:** Display active agents correctly in dashboard

**Implementation:**
```javascript
case 'agent_start':
  activeAgents.set(event.agent_id, {
    task: event.data,
    startTime: new Date(event.timestamp)
  });
  break;

case 'agent_complete':
  activeAgents.delete(event.agent_id);
  break;
```

**Recommendation:** Direct fix. Change agent_spawn to agent_start in template. Cleaner than compatibility layer.

### Pattern 3: README Restructuring (Markdown)
**Description:** Move sections without rewriting content, add table of contents

**Use Case:** Make README beginner-friendly while preserving advanced documentation

**Structure Recommendation:**
```markdown
# 2L - Two-Level Orchestration System

## Quick Start (5 minutes)
1. Clone repository
2. Run ./2l.sh install
3. Run /2l-setup-db
4. (Optional) Run /2l-setup-mcps
5. Start building: /2l-mvp "your idea"

## Table of Contents
- Quick Start
- What is 2L?
- Core Concepts
- Event System
- Dashboard
- Advanced Topics
- Troubleshooting

[Rest of sections follow...]
```

**Recommendation:** Restructure, don't rewrite. Content quality is excellent, just needs better organization.

### Pattern 4: Port Allocation and PID Tracking
**Description:** Multi-project dashboard support via port range 8080-8099

**Current Implementation (already working):**
```bash
# Find available port
for port in {8080..8099}; do
  if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    DASHBOARD_PORT=$port
    break
  fi
done

# Store port and PID
echo "$DASHBOARD_PORT" > .2L/dashboard/.server-port
echo "$SERVER_PID" > .2L/dashboard/.server-pid
```

**Iteration 2 Task:** Preserve this pattern exactly. No changes needed.

**Recommendation:** Keep as-is. Pattern is solid and tested in Iteration 1.

## Complexity Assessment

### High Complexity Areas
**None.** All features are straightforward refactoring tasks.

### Medium Complexity Areas

#### 1. Dashboard Command Refactoring (Medium)
**Why Medium:**
- Must remove agent spawning logic safely
- Template substitution is simple but must handle edge cases (special chars in project name)
- Port allocation logic must be preserved exactly
- HTTP server startup must remain unchanged

**Builder Split Recommendation:** No split needed. Single builder can complete in 2-3 hours.

**Edge Cases:**
- Project names with spaces: Escape for shell safety
- Project names with special chars: Escape for HTML safety
- Missing template file: Pre-flight check before substitution

#### 2. Active Agents Dashboard Fix (Medium)
**Why Medium:**
- JavaScript event parsing already exists, just needs correction
- Must handle edge cases: orphaned starts, duplicate events, out-of-order events
- Real-time duration calculation needs testing
- Must work with concurrent agents (multiple builders)

**Builder Split Recommendation:** No split needed. Single builder can implement and test in 2-3 hours.

**Edge Cases:**
- Orphaned agent_start without agent_complete: Keep in active list with visual indicator
- Duplicate events: Use Map to prevent duplicates
- Out-of-order events: Sort by timestamp before processing
- Concurrent agents: Map structure already handles multiple agents correctly

### Low Complexity Areas

#### 3. Simplified README (Low)
**Why Low:**
- Pure markdown restructuring, no code changes
- Content is excellent, just needs reorganization
- Table of contents generation is manual (no automation needed)
- 5 steps for Quick Start section (already defined in vision.md)

**Builder Split Recommendation:** No split needed. Single builder can complete in 1-2 hours.

**Tasks:**
- Add "Quick Start" section at top (5 steps: clone, install, setup-db, setup-mcps, mvp)
- Add table of contents with anchor links
- Move "What is 2L?" conceptual content below Quick Start
- Keep all other sections unchanged
- Test all anchor links work

## Technology Recommendations

### Primary Stack (No Changes from Iteration 1)

#### Bash 4.x+ (Script Language)
**Choice:** Continue using bash for dashboard command
**Rationale:**
- Iteration 1 validated bash patterns work excellently
- All string manipulation tools available: sed, awk, basename
- Template substitution is trivial with sed
- Preserves consistency with 2l.sh installation script
- Zero new dependencies

**Alternative Considered:** Python script
**Why Not Python:** Adds runtime dependency, bash is sufficient for 3 placeholder replacements

#### HTML + CSS + JavaScript (Dashboard UI)
**Choice:** Continue using vanilla JavaScript in template
**Rationale:**
- No framework needed for simple event polling
- Template already implements all features correctly (except event type bug)
- Performance is excellent (2-second polling, <50 events display)
- No build step required
- Works in all modern browsers

**Alternative Considered:** React/Vue dashboard
**Why Not Framework:** Over-engineering for MVP, adds build complexity, template already works

#### Markdown (Documentation)
**Choice:** Continue using markdown for README
**Rationale:**
- GitHub renders markdown beautifully
- Table of contents with anchor links is native markdown feature
- No tooling required (manual editing)
- Version control friendly (line-by-line diffs)

**Alternative Considered:** Documentation generator (MkDocs, Docusaurus)
**Why Not Generator:** Over-engineering for single README file, adds build step

### Supporting Libraries (From Iteration 1)

#### sed (Text Substitution)
**Purpose:** Replace template placeholders
**Installation:** Pre-installed on all Unix systems (part of coreutils)
**Usage:**
```bash
sed 's|{PROJECT_NAME}|MyProject|g' template.html > output.html
```

#### lsof (Port Detection)
**Purpose:** Find available ports for dashboard server
**Installation:** Pre-installed on Ubuntu/macOS
**Usage:** Check if port occupied: `lsof -Pi :8080 -sTCP:LISTEN -t`

#### Python 3 http.server (HTTP Server)
**Purpose:** Serve dashboard HTML to browser
**Installation:** Already required by 2L (validated in Iteration 1)
**Usage:** `python3 -m http.server 8080 --bind 127.0.0.1`

## Integration Points

### Internal Integrations

#### 1. Dashboard Command -> Dashboard Template
**Connection:** /2l-dashboard reads ~/.claude/lib/2l-dashboard-template.html
**Data Flow:**
1. Command reads template file into variable
2. Bash substitutes 3 placeholders (PROJECT_NAME, TIMESTAMP, EVENTS_PATH)
3. Writes substituted HTML to .2L/dashboard/index.html
4. Starts HTTP server pointing to .2L/dashboard/

**Dependencies:**
- Template must exist: Pre-flight check in command
- .2L/dashboard/ directory must exist: mkdir -p .2L/dashboard
- No circular dependencies

#### 2. Dashboard HTML -> events.jsonl
**Connection:** JavaScript polls /events.jsonl every 2 seconds
**Data Flow:**
1. fetch('/events.jsonl') via HTTP server
2. Parse JSONL line by line
3. Update UI based on event types
4. Track active agents in Map structure

**Dependencies:**
- events.jsonl must be valid JSONL: Each line must be valid JSON
- Event schema must match: {timestamp, event_type, phase, agent_id, data}
- HTTP server must serve .2L/ directory: Already configured correctly

#### 3. Event Logger -> Dashboard
**Connection:** Agents emit events via 2l-event-logger.sh, dashboard consumes events
**Data Flow:**
1. Agent sources event logger library
2. Calls log_2l_event "agent_start" "message" "phase" "agent-id"
3. Library appends JSON to .2L/events.jsonl
4. Dashboard polls file and displays new events

**Dependencies:**
- Event types must match between emitter and consumer
- JSONL format must be valid (one JSON object per line)
- No file locking required (append-only operations)

### External Integrations
**None.** Iteration 2 has no external API dependencies.

## Risks & Challenges

### Technical Risks

#### Risk 1: Template Placeholder Edge Cases (Low Risk)
**Impact:** HTML corruption if project name contains special characters
**Example:** Project name with quotes or HTML tags could break rendering
**Mitigation:**
- HTML-escape project name before substitution
- Validate project name matches safe pattern
- Fallback to "2L Dashboard" if validation fails

**Likelihood:** Low (most project names are simple)
**Severity:** Low (breaks dashboard for one project only, easy to fix)

#### Risk 2: Event Type Migration (Low Risk)
**Impact:** Existing dashboards show no active agents until event type fix deployed
**Mitigation:**
- Fix agent_spawn to agent_start in template
- Test with real event files
- Document breaking change in commit message

**Likelihood:** Low (internal tool, single developer)
**Severity:** Low (visual bug only, no data loss)

#### Risk 3: README Link Breakage (Low Risk)
**Impact:** Internal anchor links break if section headings renamed
**Mitigation:**
- Test all anchor links after restructuring
- Use GitHub's markdown preview to verify rendering
- Keep heading IDs stable (GitHub auto-generates from heading text)

**Likelihood:** Medium (manual link creation is error-prone)
**Severity:** Low (cosmetic issue, easy to fix)

### Complexity Risks

#### Risk 4: Port Allocation Logic Regression (Medium Risk)
**Impact:** Dashboard fails to start if port allocation code is modified incorrectly
**Mitigation:**
- DO NOT modify port allocation logic (proven working in Iteration 1)
- Only change template substitution section
- Comprehensive testing on localhost with multiple projects

**Likelihood:** Low (risk awareness prevents modification)
**Severity:** High (breaks dashboard completely, but local fix is quick)

#### Risk 5: JavaScript Event Parsing Edge Cases (Medium Risk)
**Impact:** Active agents dashboard shows incorrect state with malformed events
**Mitigation:**
- Add try-catch around JSON.parse()
- Log parsing errors to browser console
- Skip malformed events gracefully
- Test with: orphaned starts, duplicates, out-of-order events

**Example Edge Cases:**
```javascript
// Orphaned agent_start (no matching agent_complete)
// Solution: Keep in active list, show duration continuously

// Duplicate agent_start for same agent_id
// Solution: Update existing entry, don't create duplicate

// Events out of order (agent_complete before agent_start)
// Solution: Sort by timestamp before processing
```

**Likelihood:** Medium (real orchestrations produce varied event patterns)
**Severity:** Medium (confusing UI, but orchestration still works)

## Recommendations for Planner

### 1. Single Builder Can Complete Entire Iteration (High Confidence)
**Rationale:**
- All 3 features are low-medium complexity
- No interdependencies between features (can be built sequentially)
- Estimated total: 6-8 hours for complete iteration
- No sub-builder spawning needed

**Recommendation:** Assign to Builder-1, no splitting required.

### 2. Preserve Iteration 1 Patterns Exactly (Critical)
**Rationale:**
- Iteration 1 delivered high-quality, tested patterns
- Dashboard command port allocation must not change
- Event logging format must remain compatible
- Template structure is already optimal

**Recommendation:**
- Copy /2l-dashboard.md to builder workspace
- Modify only lines 52-64 (agent spawning section)
- Replace with template substitution logic
- Test extensively before committing

### 3. Fix Dashboard Event Type Bug First (Priority)
**Rationale:**
- Simple change (2 lines of JavaScript)
- Unblocks active agents feature testing
- Validates event schema understanding early

**Build Order:**
1. Task 1: Fix active agents (change agent_spawn to agent_start)
2. Task 2: Direct dashboard start (remove agent spawning)
3. Task 3: Simplified README (documentation polish)

**Why This Order:**
- Task 1 is quickest win, validates approach
- Task 2 provides performance improvement (30s to <2s)
- Task 3 is independent, can be done last

### 4. Test Dashboard with Real Orchestration Events (Must-Do)
**Rationale:**
- Edge cases only appear with real agent workflows
- Concurrent agents, orphaned events, out-of-order events
- Performance validation under load (50+ events)

**Testing Approach:**
1. Run /2l-mvp "simple task" to generate real events
2. Open dashboard in browser while orchestration runs
3. Verify active agents appear and disappear correctly
4. Check duration calculations update in real-time
5. Confirm no JavaScript errors in browser console

### 5. README Quick Start Must Reference Iteration 1 Commands (Critical)
**Rationale:**
- Quick Start section depends on installation script from Iteration 1
- Must use exact command names: ./2l.sh install, /2l-setup-db, /2l-setup-mcps
- Validates 5-minute setup workflow end-to-end

**Quick Start Content (5 steps max):**
```markdown
## Quick Start (5 Minutes)

1. Clone Repository: git clone <repo> && cd 2L
2. Install 2L: ./2l.sh install
3. Setup Database: /2l-setup-db
4. (Optional) Setup MCPs: /2l-setup-mcps
5. Start Building: /2l-mvp "build a todo app"
```

**Recommendation:** Use this exact structure in planner's task description.

## Resource Map

### Critical Files/Directories

#### From Iteration 1 (Dependencies)
- `~/.claude/lib/2l-dashboard-template.html` - Dashboard template (481 lines)
  - Purpose: HTML template with 3 placeholders
  - Used by: /2l-dashboard command for direct generation

- `~/.claude/lib/2l-event-logger.sh` - Event logging library (51 lines)
  - Purpose: Provides log_2l_event function
  - Used by: All agents and orchestrator for event emission

- `~/.claude/commands/2l-dashboard.md` - Dashboard command (187 lines)
  - Purpose: Start dashboard HTTP server
  - Needs: Refactoring to remove agent spawning (lines 52-64)

- `~/.claude/commands/2l-dashboard-stop.md` - Dashboard stop command
  - Purpose: Stop dashboard server and cleanup
  - Needs: No changes

#### To Be Modified in Iteration 2
- `/home/ahiya/Ahiya/2L/README.md` - Main documentation (1213 lines)
  - Purpose: User documentation
  - Needs: Restructuring (add Quick Start, add TOC)

- `.2L/dashboard/index.html` - Generated dashboard HTML
  - Purpose: Dashboard web interface
  - Needs: Direct generation via bash (no agent spawning)

### Key Dependencies

#### Bash String Substitution (sed)
**Why Needed:** Replace template placeholders
**Version:** Any (POSIX standard)
**Installation:** Pre-installed on all Unix systems
**Usage Example:**
```bash
sed 's|{PROJECT_NAME}|MyApp|g' template.html > output.html
```

#### Python 3 HTTP Server (http.server)
**Why Needed:** Serve dashboard to browser
**Version:** Python 3.x (any)
**Installation:** Already validated in Iteration 1
**Usage:** `python3 -m http.server 8080`
**Note:** No changes to server logic in Iteration 2

#### lsof (List Open Files)
**Why Needed:** Port availability checking
**Version:** Any
**Installation:** Pre-installed on Ubuntu/macOS
**Usage:** `lsof -Pi :8080 -sTCP:LISTEN -t`
**Note:** No changes to port allocation in Iteration 2

### Testing Infrastructure

#### Browser Testing (Manual)
**Browsers to Test:**
- Chrome/Chromium (primary)
- Firefox (secondary)
- Safari on macOS (if available)

**Test Cases:**
1. Dashboard loads without errors
2. Events appear in timeline
3. Active agents section updates correctly
4. Duration calculations increment
5. Completed agents are removed
6. JavaScript console shows no errors

#### Edge Case Event Files (Create for Testing)
Test files to validate edge case handling in dashboard JavaScript.

**File 1: orphaned-events.jsonl**
```jsonl
{"timestamp":"2025-10-10T10:00:00Z","event_type":"agent_start","phase":"exploration","agent_id":"explorer-1","data":"Explorer-1: Starting"}
{"timestamp":"2025-10-10T10:05:00Z","event_type":"agent_start","phase":"planning","agent_id":"planner-1","data":"Planner-1: Starting"}
{"timestamp":"2025-10-10T10:10:00Z","event_type":"agent_complete","phase":"exploration","agent_id":"explorer-1","data":"Explorer-1: Complete"}
```
Expected Result: planner-1 stays in active list (no completion event)

**File 2: duplicate-events.jsonl**
```jsonl
{"timestamp":"2025-10-10T10:00:00Z","event_type":"agent_start","phase":"building","agent_id":"builder-1","data":"Builder-1: Starting"}
{"timestamp":"2025-10-10T10:01:00Z","event_type":"agent_start","phase":"building","agent_id":"builder-1","data":"Builder-1: Starting"}
{"timestamp":"2025-10-10T10:10:00Z","event_type":"agent_complete","phase":"building","agent_id":"builder-1","data":"Builder-1: Complete"}
```
Expected Result: Only one builder-1 in active list (update existing entry on duplicate)

**File 3: out-of-order-events.jsonl**
```jsonl
{"timestamp":"2025-10-10T10:00:00Z","event_type":"agent_start","phase":"validation","agent_id":"validator-1","data":"Validator-1: Starting"}
{"timestamp":"2025-10-10T10:05:00Z","event_type":"agent_complete","phase":"integration","agent_id":"integrator-1","data":"Integrator-1: Complete"}
{"timestamp":"2025-10-10T10:02:00Z","event_type":"agent_start","phase":"integration","agent_id":"integrator-1","data":"Integrator-1: Starting"}
```
Expected Result: Events sorted by timestamp before processing, correct active agent display

## Questions for Planner

### Question 1: Should Dashboard Support Legacy agent_spawn Events?
**Context:** Current template uses agent_spawn, actual events use agent_start
**Options:**
- A: Fix template only (breaking change, cleaner code)
- B: Support both event types (backward compatibility, more code)

**Recommendation:** Option A (fix template). Rationale: Internal tool, no external users, cleaner code.

### Question 2: Should README Include Installation Video?
**Context:** 5-minute setup might benefit from visual walkthrough
**Options:**
- A: Text-only Quick Start (faster to create, always up-to-date)
- B: Add video link to Quick Start (better UX, requires video creation)

**Recommendation:** Option A for MVP. Video can be added post-MVP if user feedback requests it.

### Question 3: Should Dashboard Template Be Versioned?
**Context:** Template might evolve in future iterations
**Options:**
- A: Add version comment in template HTML header
- B: No versioning (template is internal, breaking changes OK)

**Recommendation:** Option B for MVP. Add versioning if template becomes external dependency.

### Question 4: Should Active Agents Show Task Description?
**Context:** Currently shows full event.data field (can be long)
**Options:**
- A: Show full data (current behavior)
- B: Truncate to 50 chars with "..." (cleaner UI)
- C: Show agent_id only (minimal)

**Recommendation:** Option A for MVP. Truncation can be added if UI becomes cluttered.

### Question 5: Should README Quick Start Mention Python 3?
**Context:** Python 3 is required for dashboard but not explicitly mentioned in setup
**Options:**
- A: Add "Prerequisite: Python 3 installed" before step 1
- B: Mention in troubleshooting only (assume Python 3 present)

**Recommendation:** Option A. Explicit prerequisites prevent setup failures.

## MCP Testing Performed

**Note:** No MCP testing required for Iteration 2.

**Rationale:**
- No new MCP integrations added
- Dashboard is pure frontend (HTML/CSS/JS)
- All bash operations use POSIX standard tools (sed, basename, date)
- Event logging library already tested in Iteration 1

**If MCPs were used, testing would include:**
- Playwright: Test dashboard UI rendering (out of scope for MVP)
- Chrome DevTools: Profile dashboard performance (out of scope for MVP)
- Supabase: Not applicable (no database operations in Iteration 2)

## Conclusion

Iteration 2 is a low-complexity polish iteration that refines the excellent foundation from Iteration 1. All required technologies are already in place and validated. The primary work is refactoring existing bash scripts and fixing a simple JavaScript bug.

**Technology Stack (No Changes):**
- Bash 4.x+: Template substitution, string manipulation
- HTML/CSS/JavaScript: Dashboard UI (fix event type bug)
- Markdown: README restructuring
- Python 3 http.server: Dashboard HTTP server (unchanged)

**Key Success Factors:**
1. Preserve Iteration 1 patterns exactly (port allocation, event logging)
2. Test dashboard with real orchestration events (edge cases)
3. Quick Start section references exact commands from Iteration 1
4. Single builder completes all 3 features sequentially (6-8 hours total)

**Complexity Assessment:**
- Direct Dashboard Start: Medium (template substitution, preserve port logic)
- Active Agents Fix: Medium (JavaScript bug fix, edge case handling)
- Simplified README: Low (restructuring only, no content rewrite)

**Overall Iteration Complexity: LOW-MEDIUM** - Perfect for single builder, no splitting needed.

The planner can confidently create a sequential task plan with minimal risk, leveraging proven patterns from Iteration 1.
