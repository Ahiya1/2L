# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points

## Vision Summary
Build self-reflection infrastructure that enables 2L to systematically learn from validation failures, automatically re-validate after healing, aggregate learnings across projects, and orchestrate self-improvements through `/2l-improve` command.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 5 must-have features
- **User stories/acceptance criteria:** 32 acceptance criteria across all features
- **Estimated total work:** 18-24 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **Multi-system integration:** Validators, healers, orchestrator, and new `/2l-improve` command must all coordinate
- **State management complexity:** Tracking learning status lifecycle (IDENTIFIED → IMPLEMENTED → VERIFIED) across multiple projects
- **Recursive orchestration:** 2L must use itself to improve itself (meta-orchestration pattern)
- **Data flow spans entire system:** Learnings flow from validators → healers → orchestrator → global aggregation → vision generation → self-improvement

---

## User Experience Flows Analysis

### Flow 1: Learning Capture During Validation (Feature 1)

**User Journey:**
1. Orchestrator runs iteration → spawns validator
2. **Critical Integration Point:** Validator discovers bug (e.g., grep pattern error)
3. **Data Flow:** Validator creates `learnings.yaml` in iteration directory
4. **State Transition:** Validator returns FAIL status to orchestrator
5. **Orchestration Response:** Orchestrator spawns healer based on learning content

**Integration Complexity: MEDIUM**

**Key Integration Points:**
- **Validator → File System:** Validator must write structured YAML during validation phase
- **File System → Orchestrator:** Orchestrator must detect learnings.yaml existence
- **Learnings Data → Healer Prompt:** Learning content informs healer strategy

**Data Flow Map:**
```
Validation Execution
      ↓
Issue Detection (grep pattern fails)
      ↓
Learning Extraction
  - issue: "Pattern '{.*}' too broad"
  - root_cause: "Matches CSS braces"
  - solution: "Use '{[A-Z_]+}'"
  - severity: critical
  - affected_files: ["commands/2l-dashboard.md"]
      ↓
Write learnings.yaml
      ↓
Validator returns FAIL + learnings
      ↓
Orchestrator reads learnings
      ↓
Spawns healer with learning context
```

**Edge Cases & Error Handling:**
- **Multiple issues in single validation:** Create array of learning entries in same YAML file
- **Learning file write fails:** Graceful degradation - validation continues, logs warning, marks learning as LOST
- **Issue with unclear root cause:** Mark as `root_cause: "UNKNOWN - requires investigation"`
- **Validator crashes before writing learnings:** No learnings captured, but validation still fails (orchestrator spawns healer without specific guidance)

**UX Considerations:**
- **Transparency:** User should see learning capture in validation report summary
- **Discoverability:** Learnings.yaml should be referenced in validation-report.md
- **Actionability:** Each learning must have clear solution field to guide healing

---

### Flow 2: Re-validation After Healing (Feature 2)

**User Journey:**
1. Healer completes work → reports COMPLETE status
2. **Critical Integration Point:** Orchestrator automatically spawns validator again (re-validation checkpoint)
3. **Validation Loop:** Validator runs identical checks as original validation
4. **Branching Logic:**
   - If PASS → Mark iteration COMPLETE, commit to git, advance to next iteration
   - If FAIL → Spawn healer again (second healing attempt) OR escalate to user (after 2nd failure)

**Integration Complexity: HIGH**

**Key Integration Points:**
- **Healer → Orchestrator:** Healer completion signals re-validation trigger
- **Orchestrator → Validator (re-invocation):** Must pass same test suite, different output directory
- **Re-validation Result → Iteration Status:** Determines if iteration can commit or needs more healing
- **Event System Integration:** Log re-validation events to `.2L/events.jsonl` for observability

**Data Flow Map:**
```
Healer Reports COMPLETE
      ↓
Orchestrator detects completion
      ↓
Spawn Validator (Round 2)
  - Input: Same test suite
  - Output: healing-{N}/validation-report.md
      ↓
Re-validation Execution
      ↓
Status Decision Point:
  ├─ PASS → Iteration Complete
  │    ↓
  │  Git Commit (iteration success)
  │    ↓
  │  Update master-plan.yaml (status: COMPLETE)
  │    ↓
  │  Orchestrator Reflection (merge learnings to global)
  │    ↓
  │  Advance to next iteration
  │
  └─ FAIL → Check healing attempts
       ↓
    Attempt < 2?
       ├─ YES → Spawn Healer Again (Round 2)
       └─ NO  → Escalate to User
              ↓
            Log error, pause orchestration
            ↓
            Provide manual intervention guide
```

**Edge Cases & Error Handling:**
- **Healing introduced new bugs:** Re-validation catches regression, triggers second healing round with BOTH original issues + new regressions
- **Healer reports COMPLETE but didn't fix issue:** Re-validation catches false completion, orchestrator marks healer as INEFFECTIVE
- **Re-validation fails to spawn:** Log critical error, mark iteration INCOMPLETE, notify user with specific error
- **Infinite healing loop prevention:** Hard cap at 2 healing attempts per iteration before escalation

**UX Considerations:**
- **Progress visibility:** User sees "Re-validating after healing..." message in orchestrator output
- **Failure communication:** Clear diff between first validation failure and re-validation failure
- **Escalation clarity:** If manual intervention needed, provide actionable summary of what was attempted and what remains broken

---

### Flow 3: Self-Improvement with `/2l-improve` (Feature 5)

**User Journey:**
1. **User Action:** Runs `/2l-improve` from `~/Ahiya/2L/` directory (2L's meditation space)
2. **Aggregation Phase:** Command scans `Prod/**/.2L/learnings.yaml` files recursively
3. **Pattern Detection:** Analyze learnings to find recurring issues (same issue across multiple projects)
4. **Deduplication:** Merge duplicate learnings into single patterns (e.g., grep validation failed in 3 projects → PATTERN-001)
5. **Ranking:** Sort patterns by impact (severity × occurrences)
6. **Vision Generation:** Auto-create vision.md from top 2-3 high-impact patterns (data-driven, not conversation-driven)
7. **User Confirmation:** Display proposed improvements with affected files, ask "Proceed with /2l-mvp? [Y/n]"
8. **Auto-orchestration:** If confirmed, automatically run `/2l-mvp` in meditation space
9. **Self-Modification:** 2L orchestrates improvements to its own agents/commands via symlinks
10. **Status Update:** Mark implemented learnings as `status: IMPLEMENTED` in global-learnings.yaml
11. **Git Integration:** Changes committed and pushed to GitHub
12. **Immediate Effect:** Next orchestration uses improved system (via symlink to ~/.claude/)

**Integration Complexity: VERY HIGH**

**Key Integration Points:**

**Point 1: Cross-Project Data Aggregation**
- **Source:** Multiple `Prod/*/. 2L/plan-*/iteration-*/learnings.yaml` files
- **Destination:** Single `.2L/global-learnings.yaml` file
- **Challenge:** Projects may have different learning formats (backward compatibility)
- **Integration Strategy:** Defensive parsing with schema validation, skip malformed entries with warning

**Point 2: Pattern Detection Algorithm**
- **Input:** Array of learning objects from different projects
- **Processing:** Compare `issue` and `root_cause` fields for similarity (fuzzy matching)
- **Output:** Aggregated patterns with occurrence count and project list
- **Challenge:** Distinguishing between similar vs. identical issues (e.g., "TypeScript error" vs. "TypeScript compilation error")

**Point 3: Vision Auto-Generation**
- **Input:** Top 2-3 patterns from ranking algorithm
- **Output:** Structured `vision.md` with features, user stories, acceptance criteria
- **Data Mapping:**
  ```
  Learning Pattern → Vision Feature
  --------------------------------
  pattern.issue         → Feature description
  pattern.root_cause    → Problem statement
  pattern.solution      → Acceptance criteria
  pattern.affected_files → Technical requirements
  pattern.severity      → Priority (must-have/should-have)
  ```
- **Challenge:** Generating coherent vision narrative from structured data (not just dumping fields)

**Point 4: Meta-Orchestration (2L improving itself)**
- **Context Switch:** `/2l-improve` runs in `~/Ahiya/2L/` (source repo) not in a project directory
- **Working Directory:** 2L's own `.2L/` directory becomes the orchestration space
- **Target Files:** `agents/*.md`, `commands/*.md`, `lib/*.sh` (2L's own implementation)
- **Symlink Awareness:** Changes to `~/Ahiya/2L/agents/` immediately affect `~/.claude/agents/` via symlink
- **Risk:** Self-modification bugs could break 2L itself (need validation safeguards)

**Point 5: Learning Status Tracking**
- **Lifecycle:** IDENTIFIED → IMPLEMENTED → VERIFIED
- **Triggers:**
  - IDENTIFIED: Created by validator during learning capture
  - IMPLEMENTED: Updated by `/2l-improve` after /2l-mvp completes
  - VERIFIED: Updated by orchestrator after validation passes on fixed issue
- **Deduplication Logic:** `/2l-improve` filters to `status: IDENTIFIED` only (skip already fixed patterns)

**Data Flow Map:**
```
User: /2l-improve
      ↓
Scan Prod/**/.2L/learnings.yaml (10+ projects)
      ↓
Parse & Validate (skip malformed)
      ↓
Aggregate into global-learnings.yaml
  - 23 learnings → 8 unique patterns
      ↓
Filter: status == IDENTIFIED (skip IMPLEMENTED/VERIFIED)
  - 8 patterns → 5 actionable patterns
      ↓
Rank by Impact (severity × occurrences)
  1. PATTERN-001: Re-validation gap (HIGH, 3 projects) → Score: 9
  2. PATTERN-002: Grep validation (MEDIUM, 2 projects) → Score: 4
  3. PATTERN-003: Integration failures (HIGH, 1 project) → Score: 3
      ↓
Select Top 2-3 Patterns
      ↓
Auto-Generate vision.md
  Feature 1: Add re-validation checkpoint after healing
    Description: [from pattern.issue]
    Problem: [from pattern.root_cause]
    Solution: [from pattern.solution]
    Files to modify: [from pattern.affected_files]
      ↓
Display Proposed Improvements to User
  ```
  Proposed Changes:
  1. Fix re-validation gap (affects: agents/2l-validator.md, commands/2l-mvp.md)
  2. Fix grep validation (affects: commands/2l-dashboard.md)

  Proceed with /2l-mvp? [Y/n]
  ```
      ↓
User Confirms (Y)
      ↓
Auto-run /2l-mvp in ~/Ahiya/2L/
  - Master exploration: Analyze self-improvement vision
  - Master planning: Create iteration breakdown
  - Iteration execution:
      Phase 1: Exploration (analyze 2L's own code)
      Phase 2: Planning (plan modifications to agents)
      Phase 3: Building (modify agent markdown files)
      Phase 4: Integration (merge agent changes)
      Phase 5: Validation (test that 2L still works)
      ↓
Validation PASSES
      ↓
Update Learning Status
  - PATTERN-001: status → IMPLEMENTED
  - PATTERN-001: implemented_in → plan-5-iter-1
  - PATTERN-001: implemented_at → 2025-11-19T15:30:00Z
      ↓
Git Commit & Push
  - Commit: "2L Self-Improvement: Fix re-validation gap"
  - Tag: 2l-plan-5-iter-1
  - Push to GitHub
      ↓
Symlink Effect: Changes immediately live
  - ~/.claude/agents/2l-validator.md → updated version
      ↓
Next /2l-mvp uses improved validator
```

**Edge Cases & Error Handling:**

**Scenario 1: No New Learnings**
- **Trigger:** All patterns in global-learnings.yaml are status: IMPLEMENTED or VERIFIED
- **Response:** "No new patterns detected. System is stable. ✅"
- **User Action:** Continue building projects, learnings will accumulate

**Scenario 2: Too Many Patterns (>5)**
- **Trigger:** Pattern detection finds 8+ actionable patterns
- **Response:** Prioritize top 3 by impact score, defer others to next run
- **User Visibility:** Show "Found 8 patterns, implementing top 3 now. Run /2l-improve again later for remaining patterns."

**Scenario 3: User Declines Auto-Orchestration (n)**
- **Trigger:** User types 'n' when asked "Proceed with /2l-mvp?"
- **Response:** Vision.md saved for review at `.2L/plan-{N}/vision.md`
- **Guidance:** "Vision saved. Review and edit if needed. When ready: /2l-vision (manual mode) or /2l-mvp"

**Scenario 4: Git Conflicts During Self-Modification**
- **Trigger:** `/2l-mvp` modifies `agents/2l-validator.md` but file has uncommitted local changes
- **Response:** Abort orchestration immediately, rollback changes
- **User Action Required:** "Git conflicts detected. Commit or stash local changes, then retry /2l-improve"

**Scenario 5: Symlink Broken**
- **Trigger:** `~/.claude/agents/` is not symlinked to `~/Ahiya/2L/agents/`
- **Detection:** Check if `~/.claude/agents/` is a symlink before proceeding
- **Response:** "Cannot modify running system. ~/.claude/agents/ is not a symlink. Run setup script to fix."

**Scenario 6: Vision Generation Fails**
- **Trigger:** Pattern data insufficient to generate coherent vision (e.g., only 1 pattern with minimal details)
- **Fallback:** Switch to manual mode automatically
- **Response:** "Vision auto-generation failed (insufficient pattern data). Showing patterns for manual review. Use /2l-vision to create vision manually."

**Scenario 7: Manual Mode (`/2l-improve --manual`)**
- **Behavior:** Show aggregated patterns and rankings, but don't auto-generate vision
- **Output:** Print patterns to console with impact scores
- **Next Step:** User reviews patterns, then runs `/2l-vision` to manually craft vision if desired

**UX Considerations:**
- **Transparency:** Show user exactly what will be modified before confirmation
- **Safety:** Make it easy to abort (just press 'n')
- **Reversibility:** Git tags allow rollback if self-modification breaks something
- **Learning:** Show "before/after" summary of what was improved
- **Confidence:** Display impact scores so user understands why certain patterns were prioritized

---

## Integration Architecture Analysis

### Integration Pattern 1: Validator ↔ Learning Capture

**Current State:**
- Validators emit validation reports to `validation/validation-report.md`
- Orchestrator reads validation status (PASS/FAIL) from report
- No structured learning capture mechanism exists

**Required Changes:**

**Validator Agent (`agents/2l-validator.md`):**
- Add new section: "Learning Extraction Logic"
- When validation discovers issue:
  1. Extract issue details (what failed, why, how to fix)
  2. Categorize severity (critical, medium, low)
  3. Identify affected files
  4. Generate learning entry
  5. Write to `learnings.yaml` in iteration directory
- Augment validation report to reference learnings.yaml

**File Structure:**
```
.2L/plan-{N}/iteration-{M}/
├── validation/
│   └── validation-report.md (existing)
└── learnings.yaml (NEW - created by validator when FAIL)
```

**Integration Risk: LOW**
- Validators already write files (validation-report.md)
- Adding learnings.yaml is additive (doesn't break existing workflow)
- Graceful degradation: If learnings.yaml write fails, validation still completes

---

### Integration Pattern 2: Orchestrator ↔ Re-validation Checkpoint

**Current State:**
- Orchestrator spawns validator once per iteration (before healing)
- After healing, orchestrator marks iteration COMPLETE without re-checking
- No validation loop exists

**Required Changes:**

**Orchestrator (`commands/2l-mvp.md`):**
- **Current healing flow:**
  ```
  Validation FAIL → Spawn Healer → Healer COMPLETE → Iteration COMPLETE ✅
  ```
- **New healing flow with re-validation:**
  ```
  Validation FAIL
    → Spawn Healer
    → Healer COMPLETE
    → Spawn Validator (Re-validation)
    → Re-validation Result:
       ├─ PASS → Iteration COMPLETE ✅
       └─ FAIL → Healing Attempt < 2?
            ├─ YES → Spawn Healer (Round 2)
            └─ NO  → Escalate to User ⚠️
  ```

**Code Changes:**
```python
# After healer completes (around line 1350 in /2l-mvp.md)

# EXISTING CODE:
validation_status = extract_validation_status(validation_report_heal)
if validation_status == 'PASS':
    print("✅ Healing successful!")
    return  # Iteration complete!

# NEW CODE (add re-validation logic):
print("🔍 Re-validating to confirm healing success...")

# Spawn validator again (re-validation)
revalidation_report = f"{healing_dir}/revalidation-report.md"
spawn_task(
    type="2l-validator",
    prompt=f"Re-validate after healing attempt {healing_attempt}.

Iteration: {global_iter}
Healing: {healing_dir}
Previous validation: {validation_report}

Run full validation suite to verify healing fixed all issues.

Create report at: {revalidation_report}"
)

# Check re-validation result
revalidation_status = extract_validation_status(revalidation_report)

# EVENT: validation_result (re-validation)
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "validation_result" "Re-validation after healing: ${revalidation_status}" "healing" "validator-revalidation"
fi

if revalidation_status == 'PASS':
    print("✅ Re-validation PASSED - Healing confirmed successful!")

    # EVENT: iteration_complete (after healing + re-validation)
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "iteration_complete" "Iteration ${global_iter} completed after healing" "complete" "orchestrator"
    fi

    return  # Iteration complete!
else:
    print(f"❌ Re-validation FAILED after healing attempt {healing_attempt}")
    # Continue to next healing attempt or escalate
```

**Integration Risk: MEDIUM**
- Requires modifications to core orchestrator loop (high-impact area)
- Re-validation might detect new issues introduced by healing (need to handle regression)
- Event logging must distinguish between first validation and re-validation

---

### Integration Pattern 3: Orchestrator Reflection (Feature 4)

**Current State:**
- After iteration completes, orchestrator commits to git and advances to next iteration
- No learning aggregation step exists
- Global learnings.yaml doesn't exist

**Required Changes:**

**Orchestrator (`commands/2l-mvp.md`):**
- Add new phase: "Reflection" (after validation PASSES, before git commit)
- Reflection logic (executed by orchestrator, not a separate agent):
  1. Check if `learnings.yaml` exists in iteration directory
  2. If exists, read learnings
  3. Load `.2L/global-learnings.yaml` (create if doesn't exist)
  4. For each learning in iteration:
     - Check if pattern already exists in global (match by issue/root_cause)
     - If new: Add to global with status: IDENTIFIED
     - If exists: Increment occurrence count, add project to list
  5. Add iteration metadata (duration, healing_rounds, files_modified)
  6. Write updated global-learnings.yaml
  7. Log reflection event

**Code Placement:**
```python
# In execute_iteration function, after validation PASSES (line ~1191)

if validation_status == 'PASS':
    print(f"✅ Validation PASSED")

    # NEW: Reflection Phase (before git commit)
    print(f"🔍 Reflecting on iteration learnings...")

    learnings_file = f"{ITER_DIR}/learnings.yaml"
    global_learnings_file = ".2L/global-learnings.yaml"

    if file_exists(learnings_file):
        # Read iteration learnings
        iteration_learnings = read_yaml(learnings_file)

        # Load or create global learnings
        if file_exists(global_learnings_file):
            global_learnings = read_yaml(global_learnings_file)
        else:
            global_learnings = {
                'aggregated': datetime.now().isoformat(),
                'total_projects': 0,
                'total_learnings': 0,
                'patterns': []
            }

        # Merge learnings into global
        for learning in iteration_learnings.get('learnings', []):
            # Check if pattern exists
            existing_pattern = find_pattern(global_learnings, learning)

            if existing_pattern:
                # Increment occurrence
                existing_pattern['occurrences'] += 1
                existing_pattern['projects'].append(current_project_name)
            else:
                # Create new pattern
                new_pattern = {
                    'pattern_id': generate_pattern_id(),
                    'name': learning['issue'],
                    'occurrences': 1,
                    'projects': [current_project_name],
                    'severity': learning['severity'],
                    'root_cause': learning['root_cause'],
                    'proposed_solution': learning['solution'],
                    'status': 'IDENTIFIED',
                    'discovered_in': f"{plan_id}-iter-{global_iter}",
                    'discovered_at': datetime.now().isoformat()
                }
                global_learnings['patterns'].append(new_pattern)

        # Update metadata
        global_learnings['total_learnings'] = len(global_learnings['patterns'])
        global_learnings['aggregated'] = datetime.now().isoformat()

        # Write global learnings
        write_yaml(global_learnings_file, global_learnings)

        # Log reflection event
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "reflection_complete" "Merged iteration learnings into global knowledge base" "reflection" "orchestrator"
        fi

        print(f"   ✅ Reflection complete - {len(iteration_learnings['learnings'])} learnings added to global knowledge base")
    else:
        print(f"   No learnings from this iteration (validation passed on first try)")

    # Continue with existing git commit logic
    auto_commit_iteration(plan_id, iter_id, global_iter, iter_vision)
    # ...
```

**Integration Risk: MEDIUM**
- Orchestrator already performs git commits (know-how exists)
- File I/O in orchestrator is new pattern (previously delegated to agents)
- Pattern matching logic (detecting duplicates) requires fuzzy comparison algorithm

---

### Integration Pattern 4: `/2l-improve` Command ↔ Meta-Orchestration

**Current State:**
- No `/2l-improve` command exists
- No mechanism for 2L to improve itself
- Symlinks exist (`~/.claude/agents/` → `~/Ahiya/2L/agents/`) but not leveraged for self-improvement

**Required Changes:**

**New Command: `commands/2l-improve.md`**

**Responsibilities:**
1. **Data Aggregation:** Scan `Prod/**/.2L/learnings.yaml`, merge into `.2L/global-learnings.yaml`
2. **Pattern Detection:** Find recurring patterns across projects
3. **Deduplication:** Filter out learnings with status: IMPLEMENTED or VERIFIED
4. **Ranking:** Sort by impact (severity × occurrences)
5. **Vision Generation:** Auto-create vision.md from top patterns
6. **User Confirmation:** Display proposed changes, ask for approval
7. **Auto-Orchestration:** Run `/2l-mvp` in meditation space if approved
8. **Status Tracking:** Update learning status to IMPLEMENTED after /2l-mvp completes

**Integration Points:**

**Point A: Working Directory Context Switch**
- `/2l-improve` must detect it's running in `~/Ahiya/2L/` (meditation space)
- Error if run in project directory: "This command must run in 2L's meditation space: cd ~/Ahiya/2L && /2l-improve"

**Point B: Orchestrator Invocation**
- After vision generation, `/2l-improve` calls `/2l-mvp` programmatically
- Must pass control to orchestrator while preserving /2l-improve context (for status updates after completion)

**Point C: Learning Status Update**
- After `/2l-mvp` completes successfully, `/2l-improve` updates global-learnings.yaml:
  ```yaml
  - pattern_id: PATTERN-001
    status: IMPLEMENTED  # Changed from IDENTIFIED
    implemented_in: plan-5-iter-1
    implemented_at: 2025-11-19T15:30:00Z
  ```

**Integration Risk: HIGH**
- Meta-orchestration is complex (2L orchestrating changes to itself)
- Vision auto-generation from data is new pattern (no template to follow)
- Status lifecycle tracking requires coordination across multiple commands
- Self-modification risk: Bug in /2l-improve could break 2L

---

## Cross-System Data Flow Map

### End-to-End Learning Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ PROJECT ORCHESTRATION (e.g., Prod/ghstats/)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Validation Phase │
                    └──────────────────┘
                              │
                    Issue Detected (grep pattern fails)
                              │
                              ▼
                    ┌──────────────────┐
                    │ Learning Capture │  (validator creates learnings.yaml)
                    └──────────────────┘
                              │
                    learnings.yaml written:
                      - issue: "Grep pattern too broad"
                      - root_cause: "Matches CSS braces"
                      - solution: "Use '{[A-Z_]+}'"
                      - severity: critical
                      - affected_files: ["commands/2l-dashboard.md"]
                              │
                              ▼
                    ┌──────────────────┐
                    │ Healing Phase    │  (healer reads learnings for guidance)
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Re-validation    │  (NEW: verify healing worked)
                    └──────────────────┘
                              │
                    Validation PASSES
                              │
                              ▼
                    ┌──────────────────┐
                    │ Orchestrator     │  (NEW: reflection phase)
                    │ Reflection       │
                    └──────────────────┘
                              │
                    Merge learnings into global:
                      .2L/global-learnings.yaml
                        ├─ PATTERN-001 (occurrences: 1)
                        └─ status: IDENTIFIED
                              │
                              ▼
                    Git commit iteration
                              │
                    Orchestration continues...
                              │
┌─────────────────────────────────────────────────────────────────┐
│ MEDITATION SPACE (~/Ahiya/2L/)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    User runs /2l-improve
                              │
                              ▼
                    ┌──────────────────┐
                    │ Scan & Aggregate │
                    └──────────────────┘
                              │
                    Scan Prod/**/.2L/learnings.yaml:
                      - ghstats: 1 learning (grep validation)
                      - SplitEasy: 1 learning (grep validation)
                      - ai-mafia: 2 learnings (re-validation gap, integration)
                              │
                              ▼
                    ┌──────────────────┐
                    │ Pattern          │
                    │ Detection        │
                    └──────────────────┘
                              │
                    Merge similar learnings:
                      PATTERN-001: Grep validation (2 projects)
                      PATTERN-002: Re-validation gap (3 projects)
                              │
                              ▼
                    ┌──────────────────┐
                    │ Filter by Status │
                    └──────────────────┘
                              │
                    Show only status: IDENTIFIED:
                      PATTERN-001: ✅ (not fixed yet)
                      PATTERN-002: ✅ (not fixed yet)
                              │
                              ▼
                    ┌──────────────────┐
                    │ Rank by Impact   │
                    └──────────────────┘
                              │
                    Impact scores:
                      PATTERN-002: HIGH severity × 3 projects = 9
                      PATTERN-001: MEDIUM severity × 2 projects = 4
                              │
                              ▼
                    ┌──────────────────┐
                    │ Auto-Generate    │
                    │ Vision           │
                    └──────────────────┘
                              │
                    Create .2L/plan-5/vision.md:
                      Feature 1: Add re-validation checkpoint
                        (from PATTERN-002)
                      Feature 2: Fix grep validation
                        (from PATTERN-001)
                              │
                              ▼
                    ┌──────────────────┐
                    │ User             │
                    │ Confirmation     │
                    └──────────────────┘
                              │
                    Display:
                      "Proceed with /2l-mvp? [Y/n]"
                              │
                    User: Y
                              │
                              ▼
                    ┌──────────────────┐
                    │ Auto-run         │
                    │ /2l-mvp          │
                    └──────────────────┘
                              │
                    Meta-orchestration:
                      - Master exploration (analyze 2L code)
                      - Master planning (plan agent changes)
                      - Iteration 1:
                          ├─ Exploration (understand current validator)
                          ├─ Planning (design re-validation logic)
                          ├─ Building (modify agents/2l-validator.md)
                          ├─ Integration (merge changes)
                          └─ Validation (test improved 2L)
                              │
                    Validation PASSES
                              │
                              ▼
                    ┌──────────────────┐
                    │ Update Learning  │
                    │ Status           │
                    └──────────────────┘
                              │
                    .2L/global-learnings.yaml:
                      PATTERN-001:
                        status: IMPLEMENTED (changed from IDENTIFIED)
                        implemented_in: plan-5-iter-1
                        implemented_at: 2025-11-19T15:30:00Z
                              │
                              ▼
                    ┌──────────────────┐
                    │ Git Commit       │
                    └──────────────────┘
                              │
                    Commit: "2L Self-Improvement: Add re-validation"
                    Tag: 2l-plan-5-iter-1
                    Push to GitHub
                              │
                              ▼
                    ┌──────────────────┐
                    │ Symlink Effect   │
                    └──────────────────┘
                              │
                    ~/.claude/agents/2l-validator.md
                      → Updated version with re-validation
                              │
                    Next project uses improved validator
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ NEXT PROJECT ORCHESTRATION (Prod/next-app/)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Validation runs (with re-validation logic)
                              │
                    Re-validation prevents false COMPLETE
                              │
                    System is now smarter ✅
```

---

## API Contract Definitions

### Learning Data Schema

**File:** `learnings.yaml` (per-iteration)

```yaml
project: string                    # Project name (e.g., "ghstats")
iteration: string                  # Iteration identifier (e.g., "plan-1-iter-1")
created_at: ISO8601 timestamp      # When learnings were captured
learnings:                         # Array of learning objects
  - id: string                     # Unique ID (e.g., "ghstats-20251119-001")
    category: enum                 # validation | integration | healing
    severity: enum                 # critical | medium | low
    issue: string                  # What went wrong (user-readable)
    root_cause: string             # Why it went wrong (analysis)
    solution: string               # How to fix it (actionable)
    recurrence_risk: enum          # high | medium | low
    affected_files: string[]       # List of file paths
```

**Example:**
```yaml
project: ghstats
iteration: plan-1-iter-1
created_at: 2025-11-19T03:45:00Z
learnings:
  - id: ghstats-20251119-001
    category: validation
    severity: critical
    issue: "Grep pattern '{.*}' matched CSS braces instead of placeholders"
    root_cause: "Validation pattern too broad - matches any braces in code"
    solution: "Use '{[A-Z_]+}' to match only uppercase placeholder names"
    recurrence_risk: high
    affected_files:
      - "commands/2l-dashboard.md"
```

---

### Global Learning Pattern Schema

**File:** `.2L/global-learnings.yaml`

```yaml
aggregated: ISO8601 timestamp      # When global learnings were last updated
total_projects: integer            # Number of projects with learnings
total_learnings: integer           # Total unique patterns
patterns:                          # Array of aggregated patterns
  - pattern_id: string             # Unique pattern ID (e.g., "PATTERN-001")
    name: string                   # Human-readable pattern name
    occurrences: integer           # How many times seen across projects
    projects: string[]             # List of affected projects
    severity: enum                 # critical | medium | low
    root_cause: string             # Common root cause
    proposed_solution: string      # General solution strategy
    status: enum                   # IDENTIFIED | IMPLEMENTED | VERIFIED
    discovered_in: string          # Where first seen (e.g., "plan-1-iter-1")
    discovered_at: ISO8601         # When first discovered
    implemented_in: string?        # Where implemented (if status: IMPLEMENTED)
    implemented_at: ISO8601?       # When implemented
    verified_at: ISO8601?          # When verified working (if status: VERIFIED)
```

**Example:**
```yaml
aggregated: 2025-11-19T15:00:00Z
total_projects: 5
total_learnings: 8
patterns:
  - pattern_id: PATTERN-001
    name: "Integration re-validation gap"
    occurrences: 3
    projects: [SplitEasy, ai-mafia, ShipLog]
    severity: high
    root_cause: "Healing runs but success not verified before marking iteration complete"
    proposed_solution: "Add validation checkpoint after healing completes"
    status: IDENTIFIED
    discovered_in: plan-3-iter-2
    discovered_at: 2025-11-10T08:47:00Z

  - pattern_id: PATTERN-002
    name: "Grep pattern validation failures"
    occurrences: 2
    projects: [ghstats, SplitEasy]
    severity: medium
    root_cause: "Generic regex '{.*}' matches too broadly (CSS braces, JSON objects)"
    proposed_solution: "Use '{[A-Z_]+}' for placeholder validation to match uppercase only"
    status: IMPLEMENTED
    discovered_in: plan-1-iter-1
    implemented_in: plan-5-iter-1
    implemented_at: 2025-11-19T15:30:00Z
```

---

### Orchestrator ↔ Validator API Contract

**Validation Request (from orchestrator to validator):**

```
Context:
  - iteration_dir: .2L/plan-{N}/iteration-{M}
  - validation_dir: {iteration_dir}/validation
  - plan_dir: {iteration_dir}/plan
  - integration_dir: {iteration_dir}/integration

Expected Outputs:
  1. validation-report.md (existing, required)
  2. learnings.yaml (NEW, optional - only if FAIL with extractable learnings)

Validator Responsibilities:
  - Run all validation checks
  - Determine status (PASS/FAIL/UNCERTAIN/PARTIAL/INCOMPLETE)
  - If FAIL: Extract learnings from failures
  - Write learnings.yaml with structured issue data
  - Reference learnings.yaml in validation-report.md summary
```

**Validation Response (validator to orchestrator):**

```
Files Created:
  1. validation-report.md
     - Contains: Status, check results, summary
     - Status: PASS | FAIL | UNCERTAIN | PARTIAL | INCOMPLETE

  2. learnings.yaml (if FAIL)
     - Contains: Structured learning entries
     - Schema: As defined in "Learning Data Schema" above
     - Location: Same directory as validation-report.md

Orchestrator Action Based on Response:
  - PASS → Proceed to reflection phase (check for learnings.yaml anyway)
  - FAIL → Read learnings.yaml, spawn healer with learning context
  - UNCERTAIN/PARTIAL/INCOMPLETE → Log warning, may require manual review
```

---

### Orchestrator ↔ Healer API Contract

**Healing Request (from orchestrator to healer):**

```
Context:
  - validation_report: {iteration_dir}/validation/validation-report.md
  - learnings_file: {iteration_dir}/validation/learnings.yaml (if exists)
  - healing_dir: {iteration_dir}/healing-{N}
  - category: string (e.g., "TypeScript Errors", "Test Failures")

Healer Responsibilities:
  - Read validation report for issue details
  - Read learnings.yaml for root cause analysis and proposed solutions
  - Fix all issues in assigned category
  - Write healer-{id}-report.md with changes made
  - Report status: COMPLETE | PARTIAL | FAILED
```

**Healing Response (healer to orchestrator):**

```
Files Created:
  1. healer-{id}-report.md
     - Contains: Issues addressed, changes made, confidence level
     - Status: COMPLETE | PARTIAL | FAILED

Orchestrator Action Based on Response:
  - COMPLETE → Trigger re-validation
  - PARTIAL → Log warning, still trigger re-validation
  - FAILED → Log error, may skip re-validation or escalate immediately
```

---

### `/2l-improve` ↔ Orchestrator API Contract

**Improvement Request (from /2l-improve to orchestrator):**

```
Context:
  - working_directory: ~/Ahiya/2L/ (meditation space)
  - vision_file: .2L/plan-{N}/vision.md (auto-generated)
  - target_files: agents/*.md, commands/*.md, lib/*.sh
  - mode: meta-orchestration (2L improving itself)

Orchestrator Responsibilities:
  - Run full /2l-mvp workflow in meditation space
  - Modify 2L's own source files (agents, commands, lib)
  - Validate that 2L still works after modifications
  - Return success/failure status
```

**Improvement Response (orchestrator to /2l-improve):**

```
Result:
  - status: SUCCESS | FAILURE
  - iteration_completed: plan-{N}-iter-{M}
  - files_modified: string[] (list of changed files)
  - validation_status: PASS | FAIL

/2l-improve Action Based on Response:
  - SUCCESS + PASS → Update learning status to IMPLEMENTED
  - FAILURE or FAIL → Rollback changes, log error, notify user
```

---

## Accessibility & Responsive Design Requirements

**Note:** This project is CLI-focused infrastructure, not a user-facing UI. Traditional accessibility concerns (WCAG compliance, screen reader support) are not applicable.

**CLI Accessibility Considerations:**

1. **Clear Text Output:**
   - Use consistent formatting for status messages
   - Emoji usage is optional (should work without for text-only terminals)
   - Color codes should be optional (respect NO_COLOR environment variable)

2. **Error Messages:**
   - All errors should be actionable (tell user what to do next)
   - Include file paths and line numbers where relevant
   - Provide links to documentation for complex errors

3. **Progress Visibility:**
   - Long-running operations should show progress indicators
   - `/2l-improve` should show each phase: "Scanning... Detecting patterns... Generating vision..."
   - Allow SIGINT (Ctrl+C) to gracefully abort operations

4. **Discoverability:**
   - `/2l-improve --help` should show all options
   - Error messages should suggest relevant commands (e.g., "No learnings found. Try running /2l-mvp to build a project first.")

**Responsive to Environment:**
- Detect if running in CI/CD environment (skip interactive confirmations, auto-answer 'n')
- Respect terminal width for formatted output
- Degrade gracefully if event logging unavailable

---

## Real-Time Features & State Management

### Real-Time Feature 1: Event Streaming to Dashboard

**Current Implementation:**
- Event logger (`lib/2l-event-logger.sh`) appends events to `.2L/events.jsonl`
- Dashboard reads events.jsonl and displays orchestration timeline
- Polling-based (dashboard refreshes every 2 seconds)

**New Events for Plan-5:**

**Re-validation Events:**
```json
{
  "timestamp": "2025-11-19T15:23:45Z",
  "event_type": "validation_result",
  "phase": "healing",
  "agent_id": "validator-revalidation",
  "data": "Re-validation after healing: PASS"
}
```

**Reflection Events:**
```json
{
  "timestamp": "2025-11-19T15:24:10Z",
  "event_type": "reflection_complete",
  "phase": "reflection",
  "agent_id": "orchestrator",
  "data": "Merged 2 iteration learnings into global knowledge base"
}
```

**Meta-Orchestration Events:**
```json
{
  "timestamp": "2025-11-19T15:30:00Z",
  "event_type": "meta_orchestration_start",
  "phase": "initialization",
  "agent_id": "orchestrator",
  "data": "Starting self-improvement orchestration (plan-5)"
}
```

**Dashboard Integration:**
- Add "Re-validation" phase to timeline visualization
- Add "Reflection" phase after validation
- Highlight meta-orchestration runs differently (special color/icon)
- Show learning count in iteration summary

---

### State Management Strategy

**State Persistence:**

**File-Based State (Primary):**
- `.2L/config.yaml` - Current plan, iteration counter, orchestration state
- `.2L/global-learnings.yaml` - Learning patterns with status lifecycle
- `.2L/plan-{N}/master-plan.yaml` - Iteration breakdown and status
- `.2L/plan-{N}/iteration-{M}/learnings.yaml` - Per-iteration learnings

**Event Log (Secondary):**
- `.2L/events.jsonl` - Append-only event stream for observability
- Used by dashboard, not by orchestrator for state decisions

**State Transitions:**

**Learning Status Lifecycle:**
```
IDENTIFIED (created by validator)
     ↓
     | /2l-improve auto-generates vision
     | /2l-mvp implements fix
     ↓
IMPLEMENTED (updated by /2l-improve after successful iteration)
     ↓
     | Next validation on similar issue passes
     ↓
VERIFIED (updated by orchestrator when pattern no longer occurs)
```

**Iteration Status Lifecycle:**
```
PENDING (defined in master-plan.yaml)
     ↓
IN_PROGRESS (orchestrator starts iteration)
     ↓
VALIDATION_FAILED (validator returns FAIL)
     ↓
HEALING (healer spawned)
     ↓
RE_VALIDATION (validator spawned again)
     ↓
COMPLETE (re-validation passes) OR FAILED (2 healing attempts exhausted)
```

**Concurrency Considerations:**
- Only one orchestration can run at a time (no concurrent /2l-mvp instances)
- `/2l-improve` must check if orchestration is in progress before starting
- File writes are atomic (use temp file + rename pattern)
- Global learnings updates are serialized (no parallel writes)

---

## Authentication & Session Management

**Not Applicable:** This is local CLI infrastructure, no authentication required.

**Security Considerations:**
- Learnings may contain file paths and code snippets (ensure `.2L/` is in .gitignore for private projects)
- `/2l-improve` modifies 2L's source code (validate vision before auto-orchestration)
- Git commits include author metadata (respect git config user.name/user.email)

---

## Form Handling & Validation

**User Input Forms:**

**Form 1: `/2l-improve` Confirmation Prompt**

```
Proposed Changes:
1. Add re-validation checkpoint after healing
   - Severity: HIGH
   - Affects: agents/2l-validator.md, commands/2l-mvp.md
   - Projects: SplitEasy, ai-mafia, ShipLog (3 occurrences)

2. Fix grep validation pattern
   - Severity: MEDIUM
   - Affects: commands/2l-dashboard.md
   - Projects: ghstats, SplitEasy (2 occurrences)

Proceed with /2l-mvp? [Y/n]: _
```

**Validation:**
- Accept: Y, y, yes, Yes, YES (case-insensitive)
- Decline: N, n, no, No, NO
- Default: N (if user just presses Enter)
- Invalid input: Re-prompt with "Please enter Y or n:"

**Input Handling:**
```python
while True:
    response = input("Proceed with /2l-mvp? [Y/n]: ").strip().lower()

    if response in ['y', 'yes', '']:
        # Empty string defaults to 'no' for safety
        if response == '':
            print("Defaulting to 'no' (no action taken)")
            return False
        print("Proceeding with self-improvement orchestration...")
        return True
    elif response in ['n', 'no']:
        print("Self-improvement aborted. Vision saved for manual review.")
        return False
    else:
        print("Invalid input. Please enter Y or n:")
```

**Edge Cases:**
- User sends Ctrl+C → Catch KeyboardInterrupt, treat as 'n'
- User sends EOF (Ctrl+D) → Catch EOFError, treat as 'n'
- User enters whitespace → Strip and re-evaluate

---

## Navigation & State Transitions

**User Journey Map:**

**Journey 1: Building a New Project (No Self-Improvement)**
```
/2l-vision → /2l-mvp → [Iteration 1 PASS] → Iteration 2 → ... → Project Complete
                              ↓
                    (No learnings captured, validation passed)
```

**Journey 2: Building a Project with Failures → Learning Capture**
```
/2l-vision → /2l-mvp → [Iteration 1 FAIL] → Healing → Re-validation PASS
                              ↓                                  ↓
                    learnings.yaml created              Reflection phase
                                                                ↓
                                                  global-learnings.yaml updated
                                                                ↓
                                                    Iteration 1 COMPLETE
```

**Journey 3: Self-Improvement Workflow**
```
[Multiple projects built, learnings accumulated]
                    ↓
User: cd ~/Ahiya/2L/
User: /2l-improve
                    ↓
Scan Prod/**/.2L/learnings.yaml (finds 23 learnings)
                    ↓
Aggregate into global-learnings.yaml
                    ↓
Detect patterns (8 unique patterns found)
                    ↓
Filter to status: IDENTIFIED (5 patterns actionable)
                    ↓
Rank by impact (top 2 patterns: re-validation gap, grep validation)
                    ↓
Auto-generate vision.md (plan-5)
                    ↓
Display proposed changes to user
                    ↓
User confirms: Y
                    ↓
Auto-run /2l-mvp (meta-orchestration)
                    ↓
[2L improves itself via normal orchestration flow]
                    ↓
Validation PASSES → Update learning status to IMPLEMENTED
                    ↓
Git commit → Push to GitHub
                    ↓
Symlink effect: ~/.claude/ now has improved agents
                    ↓
User: cd ~/Projects/next-project/
User: /2l-mvp
                    ↓
[Next project uses improved 2L with re-validation]
```

**State Transition Rules:**

**Rule 1: Learning Status Cannot Regress**
- IDENTIFIED → IMPLEMENTED ✅
- IMPLEMENTED → VERIFIED ✅
- VERIFIED → IDENTIFIED ❌ (once verified, pattern is retired)

**Rule 2: Iteration Healing Limit**
- Max 2 healing attempts per iteration
- After 2 failures → Escalate to user (no automatic 3rd attempt)

**Rule 3: `/2l-improve` Prerequisites**
- Must run in `~/Ahiya/2L/` (meditation space)
- Must have at least 1 pattern with status: IDENTIFIED
- Cannot run if orchestration already in progress

---

## Error Handling & Edge Case Flows

### Edge Case 1: Learning Capture Fails During Validation

**Scenario:**
Validator discovers critical bug but `learnings.yaml` write fails (disk full, permission error, etc.)

**Detection:**
```python
try:
    write_yaml(learnings_file, learnings_data)
except IOError as e:
    # Graceful degradation
    log_warning(f"Failed to write learnings.yaml: {e}")
    # Validation continues, but learning is lost
```

**User Impact:**
- Validation still completes and returns FAIL (no blocking error)
- Healer spawns without learning guidance (less effective healing)
- Pattern won't be captured in global learnings (one-time data loss)

**Mitigation:**
- Log warning in validation report: "⚠️ Learning capture failed - manual review recommended"
- Healer can still work from validation report (just without structured guidance)

---

### Edge Case 2: Duplicate Pattern Detection Ambiguity

**Scenario:**
Two learnings from different projects:
- Learning A: "Grep pattern matches too broadly"
- Learning B: "Grep validation fails on CSS files"

Are these the same pattern or different?

**Detection Strategy:**
```python
def is_duplicate_pattern(learning1, learning2):
    # Fuzzy match on issue description
    issue_similarity = fuzzy_match(learning1['issue'], learning2['issue'])

    # Exact match on root_cause (if both have meaningful root_cause)
    root_cause_match = (learning1['root_cause'] == learning2['root_cause'])

    # File overlap (do they affect same files?)
    file_overlap = set(learning1['affected_files']) & set(learning2['affected_files'])

    # Decision logic
    if root_cause_match and len(file_overlap) > 0:
        return True  # Definitely same pattern
    elif issue_similarity > 0.8:
        return True  # Likely same pattern
    else:
        return False  # Treat as separate patterns
```

**Handling Ambiguity:**
- Conservative approach: If unsure, create separate patterns
- User can manually merge patterns in global-learnings.yaml later
- Rationale: Better to have 2 similar patterns than to incorrectly merge unrelated issues

---

### Edge Case 3: `/2l-improve` Detects No Actionable Patterns

**Scenario:**
User runs `/2l-improve` but all patterns are already IMPLEMENTED or VERIFIED.

**Response:**
```
$ /2l-improve

🔍 Scanning learnings from production projects...
   Found 8 patterns across 5 projects

🔍 Filtering to actionable patterns (status: IDENTIFIED)...
   0 actionable patterns found

✅ No new patterns detected. System is stable.

   Breakdown:
   - 5 patterns: VERIFIED (working well)
   - 3 patterns: IMPLEMENTED (awaiting verification)
   - 0 patterns: IDENTIFIED (need fixing)

💡 Continue building projects. Learnings will accumulate as you go.
```

**User Action:**
- No action needed (system is working well)
- Continue building projects, learnings will accumulate naturally

---

### Edge Case 4: Meta-Orchestration Validation Fails

**Scenario:**
`/2l-improve` runs `/2l-mvp` to improve 2L, but validation fails (2L broke itself).

**Response:**
```python
# After /2l-mvp completes in /2l-improve
validation_result = read_validation_status(".2L/plan-5/iteration-1/validation/validation-report.md")

if validation_result != 'PASS':
    print("❌ Self-improvement validation FAILED")
    print("   2L attempted to improve itself but broke something.")
    print("")
    print("Rolling back changes...")

    # Git rollback
    run_command("git reset --hard HEAD~1")

    print("✅ Rollback complete. 2L is back to working state.")
    print("")
    print("Manual review needed:")
    print(f"  - Validation report: .2L/plan-5/iteration-1/validation/validation-report.md")
    print(f"  - Vision that failed: .2L/plan-5/vision.md")
    print("")
    print("Recommendations:")
    print("  1. Review why validation failed")
    print("  2. Consider implementing pattern manually")
    print("  3. Improve validator to catch this issue earlier")

    # Don't update learning status (keep as IDENTIFIED for retry)
    exit(1)
```

**Safety Mechanism:**
- Git tags before self-modification (easy rollback point)
- Validation must pass before committing changes
- Learnings remain in IDENTIFIED state (can retry later)

---

### Edge Case 5: Symlink Not Set Up

**Scenario:**
User runs `/2l-improve` but `~/.claude/agents/` is not symlinked to `~/Ahiya/2L/agents/`.

**Detection:**
```python
import os

# Check if ~/.claude/agents is a symlink
claude_agents_path = os.path.expanduser("~/.claude/agents")

if not os.path.islink(claude_agents_path):
    print("❌ Cannot modify running system")
    print("")
    print("~/.claude/agents/ is not a symlink to ~/Ahiya/2L/agents/")
    print("")
    print("This means changes to 2L source won't affect the running system.")
    print("")
    print("Fix:")
    print("  1. Backup current agents: mv ~/.claude/agents ~/.claude/agents.backup")
    print("  2. Create symlink: ln -s ~/Ahiya/2L/agents ~/.claude/agents")
    print("  3. Verify: ls -la ~/.claude/agents")
    print("  4. Retry: /2l-improve")
    print("")
    exit(1)
```

**User Action:**
- Follow printed instructions to set up symlink
- Retry `/2l-improve` after symlink is configured

---

## Performance Optimization Considerations

**Scalability Concern 1: Scanning Large Production Directory**

**Problem:**
`/2l-improve` scans `Prod/**/.2L/learnings.yaml` recursively. With 50+ projects, this could be slow.

**Optimization:**
```python
# Instead of recursive find + read each file:
# find Prod -name "learnings.yaml" -exec cat {} \;

# Use parallel scanning:
import concurrent.futures
import os

def scan_learnings_parallel(prod_dir):
    learning_files = []

    # Find all learnings.yaml files
    for root, dirs, files in os.walk(prod_dir):
        if 'learnings.yaml' in files:
            learning_files.append(os.path.join(root, 'learnings.yaml'))

    # Read files in parallel (up to 10 concurrent reads)
    learnings = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(read_yaml, f): f for f in learning_files}

        for future in concurrent.futures.as_completed(futures):
            try:
                learning = future.result()
                learnings.append(learning)
            except Exception as e:
                print(f"⚠️ Failed to read {futures[future]}: {e}")

    return learnings
```

**Performance Target:**
- Scan 50 projects in <5 seconds (instead of 30+ seconds with serial reads)

---

**Scalability Concern 2: Large global-learnings.yaml File**

**Problem:**
After 100 projects, global-learnings.yaml might have 200+ patterns. Loading and writing entire file on every update is inefficient.

**Optimization:**
```python
# Current approach: Read entire file, modify, write entire file
global_learnings = read_yaml("global-learnings.yaml")
global_learnings['patterns'].append(new_pattern)
write_yaml("global-learnings.yaml", global_learnings)

# Optimized approach: Append-only for new patterns
def append_learning_pattern(pattern):
    # Read only metadata header
    with open("global-learnings.yaml", 'r') as f:
        lines = f.readlines()

    # Update metadata
    metadata_end_index = find_patterns_section_start(lines)
    lines[1] = f"total_learnings: {extract_count(lines[1]) + 1}\n"
    lines[2] = f"aggregated: {datetime.now().isoformat()}\n"

    # Append new pattern
    with open("global-learnings.yaml", 'a') as f:
        f.write(yaml.dump([pattern], default_flow_style=False))
```

**Performance Target:**
- Update global-learnings.yaml in <100ms (regardless of file size)

---

**Scalability Concern 3: Pattern Detection on Large Dataset**

**Problem:**
Comparing each new learning against 200+ existing patterns is O(n²) complexity.

**Optimization:**
```python
# Current approach: Nested loop comparison
for new_learning in new_learnings:
    for existing_pattern in global_patterns:
        if is_duplicate(new_learning, existing_pattern):
            # Merge

# Optimized approach: Hash-based lookup
pattern_index = {}  # Key: issue_hash, Value: pattern_id

for pattern in global_patterns:
    issue_hash = compute_fuzzy_hash(pattern['issue'])
    pattern_index[issue_hash] = pattern['pattern_id']

for new_learning in new_learnings:
    issue_hash = compute_fuzzy_hash(new_learning['issue'])

    if issue_hash in pattern_index:
        # Duplicate found, merge
        merge_into_pattern(pattern_index[issue_hash], new_learning)
    else:
        # New pattern, create
        create_pattern(new_learning)
```

**Performance Target:**
- Pattern detection completes in <2 seconds for 50 new learnings against 200 existing patterns

---

## Recommendations for Master Plan

### Recommendation 1: Implement Feature 2 (Re-validation) in Iteration 1

**Rationale:**
- Re-validation is the foundation for reliable learning capture
- Without re-validation, learnings from healing are untrustworthy (healer might report COMPLETE but not actually fix issue)
- Other features (aggregation, /2l-improve) depend on accurate learning data

**Suggested Scope for Iteration 1:**
- Feature 2: Re-validation checkpoint (MUST-HAVE)
- Feature 1: Learning capture (MUST-HAVE, pairs with re-validation)
- Feature 4: Orchestrator reflection (SHOULD-HAVE, enables learning persistence)

**Estimated Duration:** 8-10 hours

---

### Recommendation 2: Defer Feature 5 (`/2l-improve`) to Iteration 2

**Rationale:**
- `/2l-improve` requires global-learnings.yaml to exist (depends on Feature 4)
- Meta-orchestration is complex - better to validate Features 1-4 work first
- Allows iteration 1 to accumulate learnings across multiple projects before self-improvement

**Suggested Scope for Iteration 2:**
- Feature 5: `/2l-improve` command (MUST-HAVE)
- Feature 3: Learning aggregation system with status tracking (MUST-HAVE, integrated into `/2l-improve`)
- Pattern detection and vision auto-generation (MUST-HAVE, core of `/2l-improve`)

**Estimated Duration:** 10-14 hours

---

### Recommendation 3: Add Manual Testing Phase After Iteration 2

**Rationale:**
- Self-modification risk: If `/2l-improve` breaks 2L, we need to catch it before it ships
- Test Plan:
  1. Run `/2l-improve` with 3+ patterns in global-learnings.yaml
  2. Confirm vision auto-generation is coherent
  3. Allow /2l-mvp to run (meta-orchestration)
  4. Verify 2L still works after self-modification
  5. Build a new test project with improved 2L to confirm improvements work

**Estimated Duration:** 2-3 hours

---

### Recommendation 4: Consider Iteration Breakdown

**Option A: 2 Iterations (Recommended)**

**Iteration 1: Learning Capture & Re-validation**
- Feature 1: Learning capture during validation
- Feature 2: Re-validation after healing
- Feature 4: Orchestrator reflection
- Outcome: Learnings accumulate across projects

**Iteration 2: Self-Improvement**
- Feature 3: Learning aggregation with status tracking
- Feature 5: `/2l-improve` command
- Outcome: 2L can improve itself from learnings

**Option B: 3 Iterations (If Team Wants Smaller Chunks)**

**Iteration 1: Re-validation Foundation**
- Feature 2: Re-validation checkpoint (only)
- Focus: Get healing verification working correctly

**Iteration 2: Learning Infrastructure**
- Feature 1: Learning capture
- Feature 4: Orchestrator reflection
- Feature 3: Learning aggregation

**Iteration 3: Self-Improvement**
- Feature 5: `/2l-improve` command

---

## Integration Challenges & Recommendations

### Challenge 1: Orchestrator File I/O (New Pattern)

**Current State:**
Orchestrator spawns agents to read/write files. Orchestrator itself only reads config.yaml.

**New Requirement:**
Orchestrator reflection phase (Feature 4) requires orchestrator to read/write global-learnings.yaml directly.

**Recommendation:**
- Add file I/O helper functions to orchestrator
- Use defensive programming (try/except blocks, graceful degradation)
- Document this new pattern in orchestrator code comments

---

### Challenge 2: Vision Auto-Generation (No Template)

**Current State:**
Visions are created through `/2l-vision` conversation or manually written.

**New Requirement:**
`/2l-improve` must auto-generate vision.md from structured learning data.

**Recommendation:**
- Create vision template with placeholders for pattern data
- Map learning fields to vision sections systematically
- Include human review step (show generated vision before auto-orchestration)
- Start with simple template, improve over time based on feedback

**Template Sketch:**
```markdown
# Vision: 2L Self-Improvement - {Pattern Name}

## Problem Statement
{pattern.root_cause}

## Target Users
Primary user: Ahiya (2L orchestrator)
Secondary users: Future projects using improved 2L

## Core Value Proposition
Fix recurring issue that affected {pattern.occurrences} projects.

## Feature Breakdown

### Must-Have (MVP)
1. **{Pattern Name}**
   - Description: {pattern.issue}
   - User story: As 2L, I want to {pattern.proposed_solution}
   - Acceptance criteria:
     - [ ] {Parse pattern.solution into checklist items}
     - [ ] Validation passes on test case
     - [ ] No regressions introduced

## Technical Requirements
**Files to modify:**
{pattern.affected_files}

## Success Criteria
- Test case that previously failed now passes
- No new validation failures introduced
```

---

### Challenge 3: Learning Status Lifecycle Coordination

**Current State:**
No status tracking exists.

**New Requirement:**
Status must transition across multiple commands (validator → orchestrator → /2l-improve).

**Recommendation:**
- Make status transitions explicit and logged
- Create status diagram documentation
- Add status validation (prevent invalid transitions)
- Log status changes to events.jsonl for observability

---

## Technology Recommendations

### Existing Codebase Findings

**Stack Detected:**
- Bash for commands (`commands/*.md` contain bash scripts)
- Markdown for agent definitions (`agents/*.md`)
- YAML for configuration (`.2L/config.yaml`, `master-plan.yaml`)
- Event logging library (`lib/2l-event-logger.sh`)

**Patterns Observed:**
- Commands are self-contained bash scripts in markdown format
- Agents are spawned via Task tool with markdown prompt
- State persisted in YAML files (file-based, not database)
- Event streaming to `.2L/events.jsonl` (append-only log)

**Opportunities:**
- YAML parsing could be standardized (use consistent library: yq, python yaml, etc.)
- Error handling could be more consistent across commands
- File I/O could use shared utility functions (reduce duplication)

**Constraints:**
- Must maintain backward compatibility (existing orchestrations should continue working)
- Must work with current 10-agent architecture (don't break existing agents)
- Learnings must be append-only (never delete historical data for audit trail)

---

### Technology Stack Recommendation for Plan-5

**Language:**
- Bash for `/2l-improve` command (consistency with other commands)
- Python for complex pattern detection logic (better string matching, data structures)

**Libraries:**
- `yq` for YAML manipulation (already used in other commands)
- `jq` for JSON manipulation (event log processing)
- Python `difflib` for fuzzy string matching (pattern deduplication)
- Python `yaml` library for complex YAML operations

**File Format:**
- YAML for learnings and global-learnings (human-readable, editable)
- JSON Lines for events (append-only, easy to parse)
- Markdown for generated visions (compatible with /2l-mvp)

**Integration:**
- Event logging via `lib/2l-event-logger.sh` (already exists)
- Git operations via command-line git (already used in orchestrator)
- File I/O via standard bash/python functions

---

## Notes & Observations

### Observation 1: Recursive Power Unlocked

This plan closes the loop that makes 2L truly recursive:
- 2L builds projects → Learnings accumulate
- Learnings analyzed → Vision auto-generated
- Vision orchestrated → 2L improves itself
- Improved 2L → Builds better projects → More learnings

This is the architecture that **learns**.

---

### Observation 2: Data-Driven Vision Is Novel

Typical `/2l-vision` flow: Human conversation → Requirements emerge → Vision document

Plan-5 `/2l-improve` flow: Learnings data → Patterns detected → Vision auto-generated

Key insight: **The learnings ARE the requirements.** No conversation needed when data contains:
- Issue (what to fix)
- Root cause (why it's broken)
- Solution (how to fix it)
- Affected files (where to make changes)

This is a fundamentally different vision creation paradigm.

---

### Observation 3: Re-validation Is Critical Infrastructure

Without re-validation, the learning feedback loop is broken:
- Healer reports "COMPLETE" (optimistic)
- Orchestrator marks iteration COMPLETE (trusting)
- Learning marked as "fixed" (false)
- Pattern persists in future projects (not actually fixed)

Re-validation adds the verification checkpoint:
- Healer reports "COMPLETE" (optimistic)
- Re-validation runs (skeptical)
- If PASS: Iteration COMPLETE (confirmed)
- If FAIL: Healer runs again (healing wasn't effective)

This prevents false completion and ensures learnings are actionable.

---

### Observation 4: Status Lifecycle Prevents Duplicate Fixes

Without status tracking:
- `/2l-improve` runs → Sees pattern → Generates vision → Fixes issue
- User runs `/2l-improve` again → Sees SAME pattern → Tries to fix AGAIN (duplicate work)

With status tracking:
- `/2l-improve` runs → Sees pattern with status: IDENTIFIED → Fixes issue → Updates status: IMPLEMENTED
- User runs `/2l-improve` again → Filters out status: IMPLEMENTED → Shows only new patterns

This prevents wasted effort on already-fixed issues.

---

### Observation 5: Meditation Space Concept Is Powerful

Traditional project structure:
```
~/Projects/myapp/
└── .2L/ (myapp's orchestration data)
```

2L's meditation space structure:
```
~/Ahiya/2L/
├── .2L/ (2L's own orchestration data)
├── Prod/ (Projects 2L built - evidence of capability)
├── agents/ (What gets improved)
└── commands/ (What gets improved)
```

Key insight: **2L is both the tool and the project.** When `/2l-improve` runs, `~/Ahiya/2L/` becomes the working directory, and 2L orchestrates improvements to itself just like it orchestrates any other project.

This dual-purpose directory structure enables self-reflection.

---

*Exploration completed: 2025-11-19T04:15:00Z*
*This report informs master planning decisions for plan-5*
