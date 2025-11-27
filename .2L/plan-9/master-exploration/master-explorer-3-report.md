# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points

## Vision Summary
Building a complete meta-circular self-improvement system where 2L analyzes its own execution traces, detects recurring patterns, explores its own codebase, and autonomously implements improvements using its standard orchestration workflow.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 5 must-have features
- **User stories/acceptance criteria:** 30+ acceptance criteria across 5 features
- **Estimated total work:** 16-24 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **15+ distinct integration points** between exploration, vision generation, reflection creation, and pattern lifecycle management
- **Meta-circular workflow complexity:** `/2l-improve` invokes `/2l-mvp` on itself (meditation space), requiring careful state management
- **Data flow spans multiple systems:** REFLECTION.md → global-learnings.jsonl → global-learnings.yaml → vision.md → `/2l-mvp` → Pattern status update
- **User flows involve both orchestrator and user interactions:** Automatic reflection creation vs. explicit `/2l-improve` invocation
- **Critical safety requirements:** Must prevent self-corruption when 2L modifies its own codebase

---

## User Experience & Integration Analysis

### 1. Frontend/Backend Integration Points

**Note:** This is a CLI-based meta-framework system (not a web application), so "frontend/backend" translates to:
- **Frontend:** User-facing commands (`/2l-mvp`, `/2l-improve`) and CLI interactions
- **Backend:** Python utilities, bash orchestration logic, and file-based storage (YAML/JSONL)

#### Integration Point 1A: User → `/2l-mvp` → Reflection Creation

**Flow:**
```
User runs /2l-mvp → Iteration completes → Orchestrator self-prompts →
Creates REFLECTION.md → Calls lib/2l-reflection-aggregator.py →
Appends to global-learnings.jsonl → Updates global-learnings.yaml
```

**Data Contract:**
- **Input to orchestrator:** Iteration completion signal (validation PASS)
- **Output from orchestrator:** `.2L/plan-N/iteration-M/REFLECTION.md`
- **Input to aggregator:** REFLECTION.md file path
- **Output from aggregator:** Updated global-learnings.jsonl and global-learnings.yaml

**Integration Complexity:** MEDIUM
- **Challenge:** Orchestrator must analyze its own iteration traces to generate reflection
- **Requirement:** Python utility must be callable from bash without blocking orchestration
- **Edge case:** What if reflection creation fails? Should iteration still be marked complete?

**Recommendation:**
- Reflection creation should be non-blocking (failure logs warning but doesn't abort)
- Emit `reflection_created` event for observability
- If reflection fails, continue but log to `.2L/plan-N/2l-improve-errors.log`

#### Integration Point 1B: User → `/2l-improve` → Exploration Phase

**Flow:**
```
User runs /2l-improve → Pattern detected → Explorers spawn via Task tool →
Explorer-1, 2, 3 analyze meditation space in parallel →
Reports generated → Vision generator reads reports →
Enhanced vision created with file targets
```

**Data Contract:**
- **Input to explorers:** Pattern context file (`.2L/plan-N/exploration/pattern-context.json`)
- **Output from explorers:** Three markdown reports with specific sections
- **Input to vision generator:** All 3 explorer reports + pattern.json
- **Output from vision generator:** Vision.md with "Affected Components" and "Integration Points" sections

**Integration Complexity:** HIGH
- **Challenge:** Explorers analyze 2L's own codebase (meta-circular)
- **Requirement:** Task tool must spawn 3 parallel agents with proper context
- **Edge case:** What if one explorer fails? Abort or continue with 2 reports?

**Recommendation:**
- Require all 3 explorers to succeed (critical for informed visions)
- Create exploration context file before spawning: `.2L/plan-N/exploration/context.json`
- Context includes: pattern details, affected files list, root cause, proposed solution
- Each explorer reads context to focus their analysis

---

### 2. User Flow Dependencies and Critical Paths

#### Flow 1: Complete Self-Improvement Cycle (Primary User Journey)

**Steps:**
1. **User runs `/2l-mvp` on any project** → Iteration completes successfully
2. **Orchestrator auto-creates `REFLECTION.md`** capturing 2L framework issues
3. **Reflection aggregator updates patterns** in background
4. *(After multiple iterations)* **User runs `/2l-improve`**
5. **Pattern detector selects top pattern** by impact score
6. **`/2l-improve` spawns 3 explorers** to analyze meditation space (`~/Ahiya/2L`)
7. **Explorers generate reports** with architectural context
8. **Vision generator creates improvement vision** with specific file targets
9. **User confirms self-improvement** (safety checkpoint)
10. **`/2l-improve` invokes `/2l-mvp` in meditation space** (meta-circular execution)
11. **`/2l-mvp` executes standard workflow:** explore → plan → build → integrate → validate
12. **Pattern status updates:** IDENTIFIED → IMPLEMENTED
13. **Next 3 iterations monitored** for recurrence
14. **If no recurrence:** IMPLEMENTED → VERIFIED

**Critical Dependencies:**
- Step 2 depends on Step 1 (iteration must complete first)
- Step 6 depends on Step 5 (pattern must be selected before exploration)
- Step 8 depends on Step 7 (all 3 explorers must complete)
- Step 11 depends on Step 9 (user must confirm before self-modification)
- Step 13 depends on Step 12 (pattern status must be tracked)

**User Experience Pain Points:**
- **Long feedback loop:** Steps 1-4 may take days (multiple iterations required to detect pattern)
- **Ambiguity at Step 9:** User doesn't know if self-improvement is safe without preview
- **No rollback UI:** If Step 11 fails, user must manually git revert

**UX Improvements Needed:**
- **Step 4 enhancement:** Show pattern detection progress (`/2l-status` shows learning count)
- **Step 9 enhancement:** Show diff preview before confirmation
- **Step 11 enhancement:** Auto-create git tag before self-modification for easy rollback
- **Step 14 enhancement:** Notify user when pattern verified (not just silent status update)

#### Flow 2: Reflection Creation During Normal Development

**Steps:**
1. **User runs `/2l-mvp` on project** (e.g., StatViz)
2. **Iteration completes** (validation PASS)
3. **Orchestrator self-prompts:** "What 2L framework issues did we encounter?"
4. **Orchestrator analyzes iteration traces** (`.2L/plan-N/iteration-M/`)
5. **Creates `REFLECTION.md`** with categorized issues
6. **Calls `lib/2l-reflection-aggregator.py`** to append to global learnings
7. **User continues** with next iteration (transparent to user)
8. **(Background)** Aggregator updates pattern database

**Critical Dependencies:**
- Step 3 depends on Step 2 (can only reflect after completion)
- Step 6 depends on Step 5 (REFLECTION.md must exist before aggregation)
- Step 8 is async (doesn't block Step 7)

**User Experience Considerations:**
- **Transparency:** User should see "Creating reflection..." message (2-3 seconds)
- **Non-blocking:** Reflection creation must not delay next iteration
- **Visibility:** User should be able to read REFLECTION.md after iteration
- **Opt-out?** Should users be able to disable reflection creation? (Recommendation: No, always create)

**Integration Challenges:**
- **Orchestrator self-analysis:** How does orchestrator analyze its own execution?
  - **Solution:** Read validation reports, builder reports, integration reports
  - **Pattern:** Look for healing rounds, validation failures, repeated issues
- **JSONL append atomicity:** Multiple projects might append simultaneously
  - **Solution:** Python utility uses file locking (fcntl) for atomic append
  - **Fallback:** Retry with exponential backoff if lock fails

---

### 3. External API Integrations and Third-Party Dependencies

**No traditional external APIs** (this is a self-contained CLI system), but there are critical **system integrations**:

#### Integration 3A: Git Integration (Safety System)

**Purpose:** Create safety checkpoints before self-modification

**Integration Points:**
- **Before Step 10 (self-improvement):** `git tag 2l-pre-improve-{timestamp}`
- **After Step 11 (if success):** `git tag 2l-post-improve-{pattern-id}`
- **Rollback mechanism:** `git reset --hard 2l-pre-improve-{timestamp}`

**Data Flow:**
```
/2l-improve → git tag (checkpoint) → /2l-mvp modifies files →
git tag (success) OR git reset (failure)
```

**Error Handling:**
- **If git not available:** Abort with error (safety critical)
- **If git not initialized:** Abort with error (safety critical)
- **If working directory dirty:** Warn user, require clean state or force flag

**UX Enhancement:**
- Show git checkpoint creation: "✓ Safety checkpoint created: 2l-pre-improve-20251127-020000"
- Show rollback command: "If issues occur, rollback with: git reset --hard 2l-pre-improve-20251127-020000"

#### Integration 3B: File System Integration (Meditation Space)

**Purpose:** `/2l-improve` operates in meditation space (`~/Ahiya/2L`), while normal `/2l-mvp` operates in project directories

**Integration Challenge:**
- **Context switching:** Orchestrator must switch working directory
- **Symlink preservation:** All changes must maintain symlinks to `~/.claude/`
- **Path resolution:** Absolute vs. relative paths during self-modification

**Data Flow:**
```
/2l-improve (cwd: any) → cd ~/Ahiya/2L → spawn /2l-mvp (cwd: ~/Ahiya/2L) →
builds modify commands/*.md, agents/*.md, lib/*.py →
symlinks validated → cd back to original
```

**Error Handling:**
- **If meditation space not found:** Abort with error and setup instructions
- **If symlinks broken after modification:** Auto-repair or abort?
  - **Recommendation:** Validate symlinks in smoke tests, abort if broken

**UX Enhancement:**
- Show working directory switch: "Entering meditation space: ~/Ahiya/2L"
- Show symlink validation: "✓ Symlinks validated: 12 agents, 8 commands, 5 libs"

#### Integration 3C: Python Utility Integration

**Purpose:** Bash orchestrator calls Python utilities for complex operations

**Integration Points:**
- **Reflection aggregation:** `lib/2l-reflection-aggregator.py`
- **Pattern lifecycle:** `lib/2l-pattern-lifecycle.py`
- **Vision generation:** `lib/2l-vision-generator.py`
- **Pattern detection:** `lib/2l-pattern-detector.py`

**Data Contract (Example: Reflection Aggregator):**
```bash
# Input: REFLECTION.md file path
python3 ~/.claude/lib/2l-reflection-aggregator.py \
  --reflection .2L/plan-9/iteration-1/REFLECTION.md \
  --global-learnings .2L/global-learnings.yaml \
  --output-jsonl .2L/global-learnings.jsonl

# Output: Exit code 0 (success) or 1 (failure)
# Side effects: Appends to global-learnings.jsonl, updates global-learnings.yaml
```

**Error Handling:**
- **If Python not available:** Graceful degradation (skip reflection aggregation, log warning)
- **If utility crashes:** Log error, continue orchestration (non-critical path)
- **If output files locked:** Retry with exponential backoff (3 attempts)

**UX Enhancement:**
- Show utility execution: "Aggregating reflection... (2-3 seconds)"
- Show success/failure: "✓ Reflection aggregated to global learnings" OR "⚠ Reflection aggregation failed (logged)"

---

### 4. Data Flow Patterns Across System Boundaries

#### Data Flow 1: Iteration → Reflection → Pattern → Vision → Implementation

**Complete data pipeline:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ITERATION EXECUTION (Project Directory)                         │
│ /2l-mvp runs → Validation PASS → Iteration complete            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ REFLECTION CREATION (Orchestrator Self-Analysis)                │
│ Orchestrator reads: validation-report.md, builder-*-report.md  │
│ Categorizes issues: Functionality > Completeness > Speed        │
│ Writes: .2L/plan-N/iteration-M/REFLECTION.md                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGGREGATION (Python Utility)                                    │
│ Reads: REFLECTION.md                                            │
│ Groups similar issues (fuzzy matching, 0.8 threshold)           │
│ Appends: global-learnings.jsonl (raw learning)                  │
│ Updates: global-learnings.yaml (pattern entry or occurrence++)  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ PATTERN DETECTION (/2l-improve triggered by user)               │
│ Reads: global-learnings.yaml                                    │
│ Filters: status=IDENTIFIED only                                 │
│ Ranks: impact_score = frequency × category_weight × severity    │
│ Selects: Top pattern                                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ EXPLORATION (3 Task Agents in Meditation Space)                 │
│ Explorer-1: Analyzes agents/*.md (agent architecture)           │
│ Explorer-2: Analyzes commands/*.md, lib/*.py (tech patterns)    │
│ Explorer-3: Analyzes pattern-specific files (integration points)│
│ Writes: .2L/plan-N/exploration/explorer-{1,2,3}-report.md       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ VISION GENERATION (Python Utility)                              │
│ Reads: pattern.json + explorer-*-report.md (all 3)              │
│ Merges: Pattern details + architectural context                 │
│ Writes: vision.md with specific file targets                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ IMPLEMENTATION (/2l-mvp in Meditation Space)                    │
│ Reads: vision.md                                                │
│ Executes: Standard orchestration (explore → plan → build → ...) │
│ Modifies: commands/*.md, agents/*.md, lib/*.py                  │
│ Creates: New utilities (lib/2l-reflection-aggregator.py, etc.)  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ VERIFICATION (Next 3 Iterations)                                │
│ Monitor: Does pattern recur?                                    │
│ If no recurrence: IMPLEMENTED → VERIFIED                        │
│ If recurs: IMPLEMENTED → REGRESSED (alert user)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Integration Points in Data Flow:**

1. **Orchestrator → Reflection:** Orchestrator must read its own trace files
2. **Reflection → Aggregator:** Bash calls Python with file path argument
3. **Aggregator → YAML:** Atomic file updates (lock, read, modify, write, unlock)
4. **Pattern Detector → Exploration Context:** Create JSON with pattern details
5. **Exploration → Vision Generator:** All 3 reports must exist before generation
6. **Vision → `/2l-mvp`:** Standard vision.md format (no changes needed)
7. **Implementation → Pattern Status:** `/2l-improve` updates global-learnings.yaml after `/2l-mvp` completes

**Data Validation Requirements:**
- **REFLECTION.md schema:** Must have sections: What Went Well, Framework Issues, Root Causes, Suggested Improvements
- **global-learnings.jsonl:** Must be valid JSONL (one JSON object per line)
- **global-learnings.yaml:** Must follow schema version 1.0
- **Explorer reports:** Must have required sections (defined in agent spec)
- **Vision.md:** Must have "Affected Components" section with file paths

---

### 5. Form Handling, Navigation, and State Management

**No traditional web forms**, but CLI has equivalent concepts:

#### State Management: Plan and Iteration State

**State Files:**
- `.2L/config.yaml` - Global configuration and plan registry
- `.2L/plan-N/master-plan.yaml` - Iteration breakdown
- `.2L/global-learnings.yaml` - Pattern database
- `.2L/global-learnings.jsonl` - Append-only learning log

**State Transitions:**

**Pattern Lifecycle State Machine:**
```
IDENTIFIED → IMPLEMENTED → VERIFIED
               ↓
            REGRESSED (if pattern recurs after fix)
```

**Integration Challenge:**
- **Concurrent updates:** Multiple projects might update global-learnings.yaml simultaneously
- **Solution:** Use Python utility with file locking (fcntl)
- **State corruption risk:** If process killed during YAML update
- **Solution:** Atomic write pattern (write to .tmp file, rename)

**State Validation:**
- **On `/2l-improve` start:** Validate global-learnings.yaml schema
- **On pattern status update:** Validate transition is legal (IDENTIFIED → IMPLEMENTED, not IDENTIFIED → VERIFIED)
- **On reflection creation:** Validate REFLECTION.md has all required sections

#### CLI Navigation and User Prompts

**User Confirmation Points:**

1. **Pattern Selection Confirmation (Safety Critical):**
```bash
# /2l-improve shows:
Selected pattern: PATTERN-001 - Missing system exploration before vision generation
Occurrences: 2 (across 2 projects)
Severity: MEDIUM
Affected files: commands/2l-improve.md, lib/2l-vision-generator.py

Proceed with self-improvement? [y/N]:
```

**Integration Requirement:** Must show enough detail for informed decision

2. **Post-Exploration Vision Preview:**
```bash
# After explorers complete, before /2l-mvp:
Vision generated: .2L/plan-9/vision.md
Affected components: 2 files to modify
Estimated work: 6-8 hours

Preview vision? [y/N]:
# If yes: cat .2L/plan-9/vision.md | less
```

**UX Enhancement:** Let user review vision before committing to full `/2l-mvp` execution

3. **Safety Checkpoint Confirmation:**
```bash
# Before self-modification:
About to modify 2L meditation space: ~/Ahiya/2L
Git checkpoint: 2l-pre-improve-20251127-020000

⚠ WARNING: This will modify 2L's own codebase.
Rollback command: git reset --hard 2l-pre-improve-20251127-020000

Continue? [y/N]:
```

**Safety Critical:** User must explicitly confirm self-modification

**State Persistence Between Commands:**
- **Resume detection:** If `/2l-improve` crashes, can it resume?
  - **Challenge:** Exploration phase is expensive (3 agents, 15+ minutes)
  - **Solution:** Skip exploration if all 3 reports exist
  - **Implementation:** Check for `.2L/plan-N/exploration/explorer-{1,2,3}-report.md`

---

### 6. Real-Time Features (Event Streaming)

**Event-Driven Architecture:**

The 2L system uses **event logging** for observability:

**Event Flow During Self-Improvement:**
```
/2l-improve emits:
  - exploration_start
  - agent_spawn (×3 for explorers)
  - agent_complete (×3 for explorers)
  - vision_generated
  - self_improvement_start
  - pattern_implemented (after /2l-mvp completes)

/2l-mvp emits (during self-modification):
  - plan_start
  - phase_change (exploration, planning, building, etc.)
  - agent_spawn (builders, integrators, validators)
  - validation_result
  - iteration_complete
```

**Integration Point: Event Aggregation**

**Challenge:** `/2l-improve` spawns `/2l-mvp` as subprocess
- **Question:** Do nested events go to same `.2L/events.jsonl`?
- **Answer:** No - each plan has its own events file
  - `/2l-improve` → `.2L/events.jsonl` (meditation space root)
  - `/2l-mvp` (plan-9) → `~/Ahiya/2L/.2L/plan-9/events.jsonl`

**UX Implication:**
- User runs `/2l-dashboard` in meditation space during `/2l-improve`
- Dashboard shows both `/2l-improve` orchestration AND nested `/2l-mvp` execution
- **Requirement:** Dashboard must handle nested event streams

**Real-Time Observability Needs:**
1. **Progress tracking:** User sees which explorer is running (Explorer-2 analyzing lib/*.py...)
2. **Duration estimates:** Based on past iterations, show "~15 minutes remaining"
3. **Failure detection:** If explorer crashes, show error immediately (not after waiting for all 3)

**Implementation Pattern:**
- Explorers emit `agent_start` at beginning
- Explorers emit `agent_complete` before writing final report
- `/2l-improve` watches for `agent_complete` events to know when to proceed

---

### 7. Error Handling and Edge Case Flows

#### Edge Case 1: Explorer Failure During Exploration Phase

**Scenario:** Explorer-2 crashes while analyzing `lib/*.py`

**Current Flow:**
```
/2l-improve spawns 3 explorers → Explorer-1 ✓ → Explorer-2 ✗ (crash) → Explorer-3 ✓
→ Vision generation expects 3 reports → Only 2 exist → ERROR
```

**Error Handling Strategy:**
- **Recommendation from vision:** Require all 3 explorers (critical for informed visions)
- **Implementation:** Check report count before vision generation
```bash
if [ $(ls ${EXPLORATION_DIR}/explorer-*-report.md 2>/dev/null | wc -l) -lt 3 ]; then
  echo "❌ ERROR: Not all explorers completed (expected 3 reports)"
  echo "Found reports: $(ls ${EXPLORATION_DIR}/explorer-*-report.md 2>/dev/null)"
  exit 1
fi
```

**User Experience:**
- Show clear error: "Explorer-2 failed - check logs: .2L/plan-9/exploration/explorer-2.log"
- Offer retry: "Retry exploration? [y/N]"
- Manual intervention: "Or manually complete explorer-2 and re-run /2l-improve"

#### Edge Case 2: Reflection Creation Fails (Python Utility Crash)

**Scenario:** Iteration completes, but `lib/2l-reflection-aggregator.py` crashes

**Current Flow:**
```
/2l-mvp → Iteration PASS → Call reflection aggregator → Python crashes →
→ Should iteration be marked complete? Or fail?
```

**Error Handling Strategy:**
- **Recommendation:** Non-blocking failure (iteration still completes)
- **Rationale:** Reflection is valuable but not critical to iteration success
- **Implementation:**
```bash
if ! python3 ~/.claude/lib/2l-reflection-aggregator.py ...; then
  echo "⚠ WARNING: Reflection aggregation failed"
  echo "   Error logged to: .2L/plan-N/2l-improve-errors.log"
  # Continue anyway (don't fail iteration)
fi
```

**User Experience:**
- Log warning but don't abort iteration
- Create `.2L/plan-N/2l-improve-errors.log` with error details
- User can manually retry later: `python3 ~/.claude/lib/2l-reflection-aggregator.py ...`

#### Edge Case 3: Pattern Recurs After Fix (Regression)

**Scenario:** Pattern-001 fixed in plan-9, but recurs in plan-10 iteration-3

**Current Flow:**
```
Pattern-001: IMPLEMENTED (after plan-9) → Monitor next 3 iterations →
Iteration-3 has same issue → Pattern recurs → Update status: REGRESSED
```

**Error Handling Strategy:**
- **Detection:** Reflection aggregator detects issue matches IMPLEMENTED pattern
- **Action:** Update pattern status to REGRESSED
- **Notification:** Alert user (don't silently fail)

**Implementation:**
```python
# In lib/2l-reflection-aggregator.py
if issue_matches_implemented_pattern(issue, pattern):
    pattern.status = 'REGRESSED'
    pattern.regressed_at = timestamp
    send_alert(f"⚠ Pattern {pattern.id} regressed in {project}/{iteration}")
```

**User Experience:**
- Email or terminal notification: "⚠ Pattern PATTERN-001 has regressed - check .2L/global-learnings.yaml"
- `/2l-status` shows regression: "❌ 1 regressed pattern detected"
- User can investigate: "View details: .2L/plan-10/iteration-3/REFLECTION.md"

#### Edge Case 4: Global Learnings File Locked (Concurrent Updates)

**Scenario:** Two projects finish iterations simultaneously, both try to append to `global-learnings.jsonl`

**Error Handling Strategy:**
- **File locking:** Use Python fcntl for exclusive lock
- **Retry logic:** Exponential backoff (3 attempts)
- **Graceful degradation:** If still locked after retries, log error and continue

**Implementation:**
```python
import fcntl
import time

def append_to_jsonl(file_path, data, max_retries=3):
    for attempt in range(max_retries):
        try:
            with open(file_path, 'a') as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)  # Exclusive lock
                f.write(json.dumps(data) + '\n')
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)  # Unlock
                return True
        except IOError:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s
            else:
                return False  # Give up after 3 attempts
```

**User Experience:**
- Transparent to user (locking handled internally)
- If all retries fail: "⚠ Warning: Could not append to global learnings (file locked)"

---

### 8. Accessibility Requirements

**CLI Accessibility Considerations:**

While not WCAG-compliant (CLI system), accessibility best practices apply:

1. **Clear Visual Hierarchy:**
   - Use emoji sparingly and meaningfully (✓ success, ❌ error, ⚠ warning)
   - Consistent formatting (bold for section headers, indentation for nested info)

2. **Screen Reader Compatibility:**
   - Avoid ASCII art (some screen readers struggle)
   - Use plain text tables (not box-drawing characters)

3. **Color Independence:**
   - Don't rely on color alone (use symbols: ✓/❌)
   - Avoid ANSI color codes unless user explicitly enables (via config flag)

4. **Keyboard-Only Navigation:**
   - All confirmations via keyboard ([y/N] prompts)
   - No mouse-only interactions (CLI naturally keyboard-only)

5. **Error Message Clarity:**
   - Specific, actionable errors: "Explorer-2 failed: lib/2l-vision-generator.py not found"
   - Not: "Error: Something went wrong"

**Implementation:**
```bash
# Good: Clear, actionable error
echo "❌ ERROR: Vision file not found: .2L/plan-9/vision.md"
echo "   Run '/2l-vision' to create vision before running /2l-improve"

# Bad: Vague error
echo "ERROR: File not found"
```

---

### 9. Responsive Design Requirements

**Not applicable** (CLI system, not web UI)

However, **terminal width responsiveness** matters:

**Terminal Width Handling:**
- Detect terminal width: `tput cols`
- Wrap long lines: Use `fold -s -w $((cols - 4))`
- Truncate file paths: Show `~/.../.2L/plan-9/vision.md` instead of full path if too long

**Example:**
```bash
COLS=$(tput cols)
if [ ${#MESSAGE} -gt $((COLS - 10)) ]; then
  # Truncate message to fit terminal
  echo "${MESSAGE:0:$((COLS - 13))}..."
else
  echo "$MESSAGE"
fi
```

---

### 10. Authentication Flows and Session Management

**Not applicable** (local CLI system, no authentication required)

However, **permission management** is relevant:

**File Permission Requirements:**
- **Meditation space:** User must have write access to `~/Ahiya/2L`
- **Global learnings:** User must have write access to `.2L/global-learnings.yaml`
- **Git operations:** User must be in git repository with commit permissions

**Permission Validation:**
```bash
# Before self-modification
if [ ! -w ~/Ahiya/2L ]; then
  echo "❌ ERROR: No write access to meditation space: ~/Ahiya/2L"
  echo "   Check directory permissions: ls -ld ~/Ahiya/2L"
  exit 1
fi
```

---

## Integration Strategy and Data Flow Maps

### Critical Integration Sequences

#### Sequence 1: Reflection → Pattern Detection → Exploration

**Timeline:** Spans days/weeks (accumulation phase)

```
Day 1: Project A, Iteration 1 completes
  → REFLECTION.md created
  → Appended to global-learnings.jsonl
  → Pattern "tsconfig missing" occurrence: 1

Day 3: Project B, Iteration 2 completes
  → REFLECTION.md created
  → Same issue detected (fuzzy match)
  → Pattern "tsconfig missing" occurrence: 2

Day 5: User runs /2l-improve
  → Pattern detector finds pattern with occurrence=2, severity=medium
  → Calculates impact score: 2 × 2.0 × 0.5 = 2.0
  → Selects as top pattern
  → Spawns 3 explorers
```

**Data Flow Map:**
```
REFLECTION.md (Project A)
         ↓
global-learnings.jsonl (append)
         ↓
global-learnings.yaml (pattern created: occurrence=1)
         ↓
REFLECTION.md (Project B)
         ↓
global-learnings.jsonl (append)
         ↓
global-learnings.yaml (pattern updated: occurrence=2)
         ↓
/2l-improve (user invokes)
         ↓
pattern-detector.py (reads global-learnings.yaml)
         ↓
Selected pattern exported to pattern.json
         ↓
Explorers read pattern.json
```

#### Sequence 2: Exploration → Vision → Implementation

**Timeline:** Single `/2l-improve` execution (1-3 hours)

```
T+0m: /2l-improve starts
  → Pattern selected
  → Creates .2L/plan-9/exploration/context.json

T+2m: Explorers spawn
  → Explorer-1: Analyzing agents/*.md (2-5 minutes)
  → Explorer-2: Analyzing commands/*.md, lib/*.py (2-5 minutes)
  → Explorer-3: Pattern-specific analysis (2-5 minutes)

T+7m: All explorers complete
  → 3 reports exist in .2L/plan-9/exploration/

T+8m: Vision generator runs
  → Reads pattern.json + 3 explorer reports
  → Generates vision.md with file targets

T+10m: User confirms
  → Git checkpoint created

T+12m: /2l-mvp spawns in meditation space
  → Standard orchestration (60-120 minutes)

T+90m: Implementation complete
  → Pattern status: IMPLEMENTED
  → Monitoring begins (next 3 iterations)
```

**Data Flow Map:**
```
pattern.json
    ↓
context.json (for explorers)
    ↓
[Explorer-1 report] + [Explorer-2 report] + [Explorer-3 report]
    ↓
vision-generator.py (merges all inputs)
    ↓
vision.md (with file targets)
    ↓
/2l-mvp (reads vision.md)
    ↓
Modified files (commands/*.md, lib/*.py)
    ↓
global-learnings.yaml (pattern.status = IMPLEMENTED)
```

---

## Recommendations for Master Plan

### 1. Implement Exploration Phase with Robust Error Handling

**Specific recommendation:**
- Replace lines 358-410 of `/2l-improve` with actual Task tool spawning
- Create exploration context file: `.2L/plan-N/exploration/context.json`
- Require all 3 explorers to succeed (abort if any fails)
- Emit events: `exploration_start`, `agent_spawn` × 3, `agent_complete` × 3

**Integration consideration:**
- Explorers must read context.json to understand pattern details
- Vision generator must validate all 3 reports exist before running

### 2. Implement Non-Blocking Reflection Creation

**Specific recommendation:**
- Add reflection creation hook to `/2l-mvp` after iteration PASS
- Reflection failure should log warning but not fail iteration
- Emit `reflection_created` event for observability

**Integration consideration:**
- Python utility must be callable from bash (subprocess.run, capture exit code)
- If utility fails, log to `.2L/plan-N/2l-improve-errors.log`

### 3. Implement Pattern Lifecycle with State Validation

**Specific recommendation:**
- Create `lib/2l-pattern-lifecycle.py` for status transitions
- Validate state machine: IDENTIFIED → IMPLEMENTED → VERIFIED (or REGRESSED)
- Prevent invalid transitions (e.g., IDENTIFIED → VERIFIED directly)

**Integration consideration:**
- File locking for atomic YAML updates (fcntl in Python)
- Emit events: `pattern_implemented`, `pattern_verified`, `pattern_regressed`

### 4. Enhance Vision Generator with Exploration Context

**Specific recommendation:**
- Modify `lib/2l-vision-generator.py` to read explorer reports
- Add sections to vision: "Affected Components" (from Explorer-3), "Architectural Context" (from Explorer-1), "Technical Patterns" (from Explorer-2)
- Include specific file paths and function names

**Integration consideration:**
- Vision generator must validate all 3 reports exist
- If explorer report missing, fail with clear error

### 5. Implement Safety Checkpoints for Self-Modification

**Specific recommendation:**
- Create git tag before `/2l-mvp` modifies meditation space
- Show rollback command to user
- Implement smoke tests after modification (validate symlinks, test commands)

**Integration consideration:**
- Git must be available (fail if not)
- Working directory must be clean (warn if dirty)
- Smoke test failures should trigger auto-rollback

### 6. Add User Confirmation Points

**Specific recommendation:**
- Confirm pattern selection before exploration
- Preview vision before `/2l-mvp` execution
- Confirm self-modification before git checkpoint

**UX consideration:**
- Show enough detail for informed decision (pattern severity, affected files, estimated duration)
- Provide escape hatch: "Cancel? Press Ctrl+C"

---

## Integration Points Summary

### High-Complexity Integration Points (Require Careful Implementation)

1. **Exploration Phase:** Task tool spawning with parallel agents (lines 358-410 of `/2l-improve`)
2. **Meta-Circular Execution:** `/2l-improve` invokes `/2l-mvp` on meditation space
3. **Reflection Aggregation:** Fuzzy matching to group similar issues (0.8 threshold)
4. **Pattern Lifecycle:** State machine validation and atomic YAML updates
5. **Git Safety Checkpoints:** Tag creation, rollback mechanism, smoke tests

### Medium-Complexity Integration Points

6. **Vision Generation:** Merging pattern.json + 3 explorer reports
7. **Event Emission:** Nested event streams (parent `/2l-improve` + child `/2l-mvp`)
8. **File Locking:** Concurrent JSONL appends from multiple projects
9. **Error Recovery:** Graceful degradation when utilities fail

### Low-Complexity Integration Points

10. **REFLECTION.md Creation:** Orchestrator reads iteration traces
11. **Pattern Detection:** Ranking by impact score
12. **User Confirmations:** CLI prompts with [y/N] logic
13. **Terminal Width Responsiveness:** Truncate long paths
14. **Permission Validation:** Check write access before modification

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- **Bash:** Orchestration logic (commands/2l-mvp.md, commands/2l-improve.md)
- **Python 3:** Utilities (lib/2l-*.py)
- **YAML:** Configuration and pattern storage
- **JSONL:** Append-only learning logs
- **Markdown:** Reports and documentation

**Patterns observed:**
- **Event-driven architecture:** All phases emit events to `.2L/events.jsonl`
- **Task tool for parallelism:** Spawn multiple agents concurrently
- **File-based storage:** No database required (YAML/JSONL)
- **Graceful degradation:** System works even if event logger missing

**Opportunities:**
- **Improve fuzzy matching:** Current simple string matching could use Levenshtein distance or embedding similarity
- **Add transaction logs:** For debugging aggregation issues
- **Implement rollback automation:** Auto-rollback on pattern regression

**Constraints:**
- **No database:** Must use file-based storage (YAML/JSONL)
- **Backward compatibility:** New utilities must not break existing workflows
- **Symlink preservation:** All changes must maintain `~/.claude/` symlinks

---

## User Journey Analysis with Focus on Integration Points

### Journey 1: Developer Experiencing 2L Issue → Pattern Fixed

**User:** Ahiya (2L Framework Developer)

**Steps:**
1. **Runs `/2l-mvp` on StatViz project**
   - Integration: Standard orchestration (no changes needed)
   - Duration: 1-2 hours

2. **Iteration completes, reflection auto-created**
   - Integration: Bash → Python utility call
   - UX: "Creating reflection... ✓" (2 seconds)
   - Data: REFLECTION.md → global-learnings.jsonl

3. **Repeats steps 1-2 for other projects**
   - Integration: Concurrent JSONL appends (file locking)
   - UX: Transparent (no user action)
   - Data: Pattern accumulates (occurrence count increases)

4. **Runs `/2l-improve` after pattern recurs**
   - Integration: Pattern detection (reads global-learnings.yaml)
   - UX: "Found 3 patterns, selecting top by impact... PATTERN-001"
   - User confirmation: "Proceed? [y/N]"

5. **Explorers analyze meditation space**
   - Integration: Task tool spawning (3 parallel agents)
   - UX: "Spawning 3 explorers... Explorer-1 (Architecture), Explorer-2 (Tech Patterns), Explorer-3 (Integration Points)"
   - Duration: 5-10 minutes
   - Progress: Event stream shows agent_start, agent_complete

6. **Vision generated with file targets**
   - Integration: Python reads pattern.json + 3 reports
   - UX: "Vision generated: .2L/plan-9/vision.md (2 files to modify)"
   - User preview: "Preview vision? [y/N]"

7. **Confirms self-improvement**
   - Integration: Git checkpoint creation
   - UX: "Creating safety checkpoint... ✓ 2l-pre-improve-20251127-020000"
   - Rollback shown: "Rollback: git reset --hard 2l-pre-improve-20251127-020000"

8. **`/2l-mvp` modifies meditation space**
   - Integration: Meta-circular execution (self-modification)
   - UX: Dashboard shows nested orchestration
   - Duration: 60-120 minutes
   - Data: commands/2l-improve.md modified, lib/2l-reflection-aggregator.py created

9. **Pattern status updated to IMPLEMENTED**
   - Integration: Pattern lifecycle utility
   - UX: "Pattern PATTERN-001 status: IMPLEMENTED (monitoring next 3 iterations)"

10. **Next 3 iterations monitored**
    - Integration: Reflection aggregator checks for recurrence
    - UX: Transparent (no user action)
    - Outcome: If no recurrence → VERIFIED, if recurs → REGRESSED

**Critical Integration Points in This Journey:**
- **Step 2 → 3:** Concurrent file access (locking required)
- **Step 5:** Task tool spawning (must handle failure of any explorer)
- **Step 6:** Multi-source data merge (pattern + 3 reports)
- **Step 7 → 8:** Working directory switch (meditation space isolation)
- **Step 9 → 10:** Pattern status tracking (state machine validation)

---

## Notes & Observations

### Critical UX Insights

1. **Long Feedback Loop is Acceptable**
   - Pattern detection requires multiple iterations (days/weeks)
   - This is inherent to learning system (not a bug)
   - UX mitigation: Show progress in `/2l-status` ("2 learnings collected, 0 patterns identified")

2. **Safety is Paramount for Self-Modification**
   - Users need confidence that `/2l-improve` won't corrupt 2L system
   - Git checkpoints + smoke tests + rollback instructions essential
   - Consider adding "dry run" mode: Show what would change without applying

3. **Exploration Phase is High-Value, High-Cost**
   - 3 parallel explorers = 5-10 minutes compute time
   - But without exploration, visions lack context (PATTERN-001 root cause)
   - Worth the cost for quality improvements

4. **Event-Driven Observability is Critical**
   - Users need visibility into nested orchestration (parent `/2l-improve` + child `/2l-mvp`)
   - Dashboard should show both levels clearly
   - Emit events at key checkpoints (exploration_start, vision_generated, pattern_implemented)

5. **Graceful Degradation Enables Adoption**
   - If reflection creation fails, iteration should still complete
   - If explorers unavailable, `/2l-improve` should fail gracefully with clear error
   - Backward compatibility ensures smooth rollout

### Strategic Observations

1. **Meta-Circularity is the Core Innovation**
   - 2L improving itself is unique capability
   - Must be safe (orchestrator exclusion, git checkpoints, smoke tests)
   - Could be extended: 2L analyzing other 2L instances across projects

2. **Pattern Detection is Knowledge Accumulation**
   - Every reflection adds to collective knowledge
   - Over time, 2L becomes smarter about its own weaknesses
   - Could add ML-based pattern grouping in future (embeddings)

3. **File-Based Storage is Limiting but Pragmatic**
   - YAML/JSONL simple, human-readable, grep-able
   - But fuzzy matching at scale will be slow (100+ patterns)
   - Consider SQLite in future for performance

4. **User Trust is Earned Through Transparency**
   - Show what patterns were detected and why
   - Preview changes before applying
   - Explain status transitions (IMPLEMENTED → VERIFIED)
   - Provide rollback options

---

**Exploration completed: 2025-11-27T03:00:00Z**

**This report informs master planning decisions for Plan-9: 2L Self-Improvement System**
