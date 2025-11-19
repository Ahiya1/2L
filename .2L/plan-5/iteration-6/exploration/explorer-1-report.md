# Explorer 1 Report: Architecture & Structure

## Executive Summary

The learning capture system represents a meta-circular architecture where 2L extends itself to systematically learn from its own orchestrations. The system has 7 major components spanning 3 architectural layers (data capture, aggregation, self-improvement) with well-defined integration boundaries. The architecture leverages existing patterns (event logging, YAML config, symlinks) while introducing new reflection logic at critical orchestration checkpoints.

**Key Finding:** The meditation space architecture at `~/Ahiya/2L/` enables recursive self-improvement by treating the 2L repository as both source code AND an orchestration workspace. Changes made during `/2l-improve` are immediately live via symlinks.

## Discoveries

### Discovery Category 1: Meta-Circular Architecture Pattern

**The Meditation Space Dual-Purpose Design:**
- `~/Ahiya/2L/` serves two roles simultaneously:
  1. **Source repository** - Contains agents/, commands/, lib/ that define 2L behavior
  2. **Reflection workspace** - Contains .2L/ for self-orchestration and Prod/ for evidence

**Directory Structure:**
```
~/Ahiya/2L/
├── .2L/                        # 2L's self-reflection space
│   ├── config.yaml             # Global state (current_plan, iteration counters)
│   ├── events.jsonl            # Orchestration event log
│   ├── global-learnings.yaml   # NEW: Aggregated learnings across projects
│   └── plan-{N}/               # Per-plan orchestration artifacts
│       ├── vision.md
│       ├── master-plan.yaml
│       └── iteration-{M}/
│           ├── exploration/
│           ├── plan/
│           ├── building/
│           ├── integration/
│           ├── validation/
│           ├── healing-{N}/    # Healing rounds (if needed)
│           └── learnings.yaml  # NEW: Per-iteration learnings
│
├── Prod/                       # Evidence of 2L's capabilities
│   ├── SplitEasy/.2L/
│   ├── ai-mafia/.2L/
│   └── wealth/.2L/
│       └── learnings.yaml      # NEW: Project-specific learnings
│
├── agents/                     # What gets improved during /2l-improve
├── commands/                   # What gets improved during /2l-improve
└── lib/                        # What gets improved during /2l-improve
```

**Symlink Activation:**
```
~/.claude/agents/   -> ~/Ahiya/2L/agents/
~/.claude/commands/ -> ~/Ahiya/2L/commands/
~/.claude/lib/      -> ~/Ahiya/2L/lib/
```

When `/2l-improve` modifies `~/Ahiya/2L/agents/2l-validator.md`, the change is **immediately live** in `~/.claude/agents/2l-validator.md`.

**Meta-circular insight:** 2L can use itself to improve itself because the meditation space IS the source repository.

---

### Discovery Category 2: Component Architecture

**7 Major Components Identified:**

#### Component 1: Learning Capture Extension (Validator)
- **File:** `agents/2l-validator.md` (extension to existing agent)
- **Location:** Section after event emission, before report writing
- **Responsibility:** Detect validation failures, extract structured learnings
- **Output:** `.2L/iteration-{N}/learnings.yaml`
- **Triggers:** FAIL, PARTIAL, UNCERTAIN validation statuses

**New validator workflow:**
```
Validator reads validation inputs
  ↓
Runs comprehensive validation checks
  ↓
Determines status (PASS/FAIL/UNCERTAIN/PARTIAL/INCOMPLETE)
  ↓
IF status != PASS:
  → Extract learnings (issue, root_cause, solution, severity, affected_files)
  → Write learnings.yaml
  ↓
Write validation-report.md
  ↓
Emit agent_complete event
```

#### Component 2: Re-validation Checkpoint (Orchestrator Extension)
- **File:** `commands/2l-mvp.md` (extension to existing orchestrator)
- **Location:** After healing completes, before iteration_complete
- **Responsibility:** Re-spawn validator to verify healing worked
- **Logic:**
  ```python
  if validation_status == FAIL:
      spawn_healer()
      healer_completes()
      
      # NEW: Re-validation checkpoint
      spawn_validator()  # Second validation run
      
      if re_validation_status == PASS:
          mark_iteration_complete()
          commit_to_git()
      elif re_validation_status == FAIL:
          if healing_rounds < 2:
              spawn_healer()  # Second healing attempt
              # ... recursive re-validation
          else:
              escalate_to_user()  # Manual intervention needed
  ```

#### Component 3: Orchestrator Reflection Module
- **File:** `commands/2l-mvp.md` (extension to existing orchestrator)
- **Location:** After validation PASSES, before git commit
- **Responsibility:** Merge iteration learnings into global knowledge base
- **Logic:**
  ```python
  def reflect_on_iteration():
      iteration_learnings_path = f".2L/{plan_id}/iteration-{iter_id}/learnings.yaml"
      
      if file_exists(iteration_learnings_path):
          learnings = read_yaml(iteration_learnings_path)
          
          # Enrich with iteration metadata
          for learning in learnings:
              learning['status'] = 'IDENTIFIED'
              learning['discovered_in'] = f"{plan_id}-iter-{iter_id}"
              learning['discovered_at'] = current_timestamp()
              learning['iteration_metadata'] = {
                  'duration_seconds': iteration_duration,
                  'healing_rounds': healing_rounds_count,
                  'files_modified': count_modified_files()
              }
          
          # Merge into global learnings
          merge_into_global_learnings(learnings)
          
          log_event("reflection_complete", 
                    f"{len(learnings)} learnings added to global knowledge base")
  ```

#### Component 4: Global Learnings Aggregator
- **File:** Part of orchestrator reflection module
- **Location:** `.2L/global-learnings.yaml`
- **Responsibility:** Maintain single source of truth for all learnings
- **Schema:**
  ```yaml
  aggregated: 2025-11-19T04:00:00Z
  total_projects: 5
  total_learnings: 23
  
  patterns:
    - pattern_id: PATTERN-001
      name: "Integration re-validation gap"
      occurrences: 3
      projects: [SplitEasy, ai-mafia, ShipLog]
      severity: high
      root_cause: "Healing runs but success not verified"
      proposed_solution: "Add validation checkpoint after healing"
      status: IDENTIFIED | IMPLEMENTED | VERIFIED
      discovered_in: plan-3-iter-2
      discovered_at: 2025-11-10T08:47:00Z
      implemented_in: plan-5-iter-1  # Set when /2l-improve fixes it
      verified_at: 2025-11-20T10:00:00Z  # Set after validation passes
  ```

#### Component 5: Learning Deduplication Logic
- **File:** Part of global learnings aggregator
- **Responsibility:** Detect duplicate learnings across projects
- **Algorithm:**
  ```python
  def detect_duplicate(new_learning, existing_patterns):
      for pattern in existing_patterns:
          # Similarity checks
          if similar_issue(new_learning.issue, pattern.name):
              if similar_root_cause(new_learning.root_cause, pattern.root_cause):
                  # This is the same pattern
                  pattern.occurrences += 1
                  pattern.projects.append(new_learning.project)
                  return pattern  # Merge into existing
      
      # New unique pattern
      return create_new_pattern(new_learning)
  ```

#### Component 6: Status Lifecycle Tracker
- **File:** Part of global learnings YAML structure
- **Responsibility:** Track learning lifecycle to prevent duplicate fixes
- **States:**
  - `IDENTIFIED` - New learning, not yet fixed (shows in /2l-improve)
  - `IMPLEMENTED` - Fix applied via /2l-improve (hidden from /2l-improve)
  - `VERIFIED` - Validation confirmed fix works (archived)

**Prevents duplicate work:**
```python
def get_learnings_for_improve():
    all_learnings = read_global_learnings()
    return [l for l in all_learnings if l.status == 'IDENTIFIED']
```

#### Component 7: /2l-improve Command (Future - Iteration 2)
- **File:** `commands/2l-improve.md` (NEW command)
- **Responsibility:** Data-driven self-improvement workflow
- **Workflow:**
  1. Read `.2L/global-learnings.yaml`
  2. Filter to `status: IDENTIFIED`
  3. Detect patterns (severity × occurrences)
  4. Auto-generate vision.md from top patterns
  5. Confirm with user
  6. Auto-run `/2l-mvp` in meditation space
  7. Update learnings to `status: IMPLEMENTED`

---

### Discovery Category 3: Integration Boundaries

**3 Critical Integration Points:**

#### Integration Point 1: Validator → Orchestrator
- **Direction:** Validator outputs learnings.yaml → Orchestrator reads it
- **Contract:** 
  - Validator MUST create learnings.yaml when status != PASS
  - Format: YAML with required fields (issue, root_cause, solution, severity, affected_files)
  - Location: `.2L/{plan}/iteration-{N}/learnings.yaml`
- **Edge case:** If learnings.yaml write fails, validator logs warning but continues (graceful degradation)

#### Integration Point 2: Orchestrator → Healer
- **Direction:** Orchestrator spawns healer → Healer fixes issues → Orchestrator re-validates
- **Contract:**
  - Healer reports COMPLETE status
  - Orchestrator ALWAYS re-spawns validator after healing (NEW behavior)
  - If re-validation FAIL: Second healing round OR escalate
- **Re-validation loop prevention:** Max 2 healing rounds before manual escalation

#### Integration Point 3: Healer → Validator (Re-validation)
- **Direction:** Healer completes → Orchestrator re-spawns validator
- **Contract:**
  - Validator runs SAME checks as original validation
  - If PASS: Healing confirmed successful
  - If FAIL: Healing did not fix the issue (or introduced new issues)
- **Event tracking:** 
  - `validation_result` event with `re_validation: true` flag
  - Distinguishes original validation from re-validation in events.jsonl

---

### Discovery Category 4: File/Folder Structure

**Per-Iteration Learning Storage:**
```
.2L/{plan-id}/iteration-{N}/
├── exploration/
├── plan/
├── building/
├── integration/
│   └── round-1/
├── validation/
│   └── validation-report.md
├── healing-1/                    # First healing round (if needed)
│   ├── exploration/
│   │   ├── healing-explorer-1-report.md
│   │   └── healing-explorer-2-report.md (optional)
│   ├── healer-1-report.md
│   ├── healer-2-report.md
│   └── validation-report.md      # Re-validation after healing
├── healing-2/                    # Second healing round (if needed)
│   └── ...
└── learnings.yaml                # NEW: Iteration learnings (created by validator)
```

**Global Learning Storage:**
```
.2L/
├── config.yaml
├── events.jsonl
├── global-learnings.yaml         # NEW: Aggregated learnings
└── plan-{N}/
    └── iteration-{M}/
        └── learnings.yaml        # Source data for global-learnings.yaml
```

**Production Project Learning Storage:**
```
Prod/{project}/.2L/
├── config.yaml
├── events.jsonl
├── plan-{N}/
│   └── iteration-{M}/
│       └── learnings.yaml        # Project-specific learnings
└── learnings.yaml                # OPTIONAL: Project-level summary
```

**Aggregation flow:**
```
Prod/SplitEasy/.2L/plan-1/iteration-2/learnings.yaml
Prod/ai-mafia/.2L/plan-1/iteration-3/learnings.yaml
~/Ahiya/2L/.2L/plan-4/iteration-5/learnings.yaml
              ↓
         AGGREGATION
              ↓
~/Ahiya/2L/.2L/global-learnings.yaml
```

---

### Discovery Category 5: Entry Points

**4 Entry Points Where Learnings Are Created:**

#### Entry Point 1: Validator Detects Issues
- **File:** `agents/2l-validator.md`
- **Trigger:** Validation status != PASS
- **Action:** Extract learnings from validation failures
- **Code location:** After running all checks, before writing validation-report.md
- **Pseudo-code:**
  ```python
  # In validator agent
  validation_status = run_all_checks()
  
  if validation_status != PASS:
      learnings = extract_learnings_from_failures()
      write_yaml(f".2L/{plan}/iteration-{N}/learnings.yaml", learnings)
  
  write_validation_report(validation_status)
  ```

#### Entry Point 2: Orchestrator Spawns Validator After Healing
- **File:** `commands/2l-mvp.md`
- **Trigger:** Healer reports COMPLETE status
- **Action:** Re-spawn validator to verify healing worked
- **Code location:** After healing phase, before iteration_complete
- **Pseudo-code:**
  ```python
  # In orchestrator
  if initial_validation == FAIL:
      spawn_healer()
      healer_status = wait_for_healer()
      
      # NEW: Re-validation checkpoint
      re_validation_status = spawn_validator()
      
      if re_validation_status == PASS:
          mark_iteration_complete()
      elif healing_rounds < 2:
          spawn_healer()  # Second attempt
      else:
          escalate_to_user()
  ```

#### Entry Point 3: Orchestrator Reflection (After Iteration Complete)
- **File:** `commands/2l-mvp.md`
- **Trigger:** Validation PASSES (original or after healing)
- **Action:** Merge iteration learnings into global-learnings.yaml
- **Code location:** After validation PASS, before git commit
- **Pseudo-code:**
  ```python
  # In orchestrator
  if validation_status == PASS:
      reflect_on_iteration()  # Merge learnings
      git_commit()
      mark_iteration_complete()
  ```

#### Entry Point 4: Manual Learning Addition (Out of Scope for MVP)
- **File:** N/A (future feature)
- **Trigger:** User manually edits global-learnings.yaml
- **Action:** Add learnings not caught by automated validation

---

## Patterns Identified

### Pattern Type: Meta-Circular Reflection

**Description:** The system modifies its own agents/commands by orchestrating changes to `~/Ahiya/2L/` which is symlinked to `~/.claude/`. This creates a feedback loop where 2L improves itself using the same orchestration logic it uses to build projects.

**Use Case:** When `/2l-improve` detects a recurring validation pattern (e.g., "grep pattern too broad"), it auto-generates a vision to fix the validator agent, then uses `/2l-mvp` to orchestrate the fix.

**Example:**
```yaml
# global-learnings.yaml
patterns:
  - pattern_id: PATTERN-002
    name: "Grep pattern validation failures"
    occurrences: 3
    projects: [SplitEasy, ai-mafia, wealth]
    severity: medium
    root_cause: "Validation uses '{.*}' which matches CSS braces"
    proposed_solution: "Use '{[A-Z_]+}' for placeholder validation"
    status: IDENTIFIED
```

**Vision auto-generated by /2l-improve:**
```markdown
# Vision: Fix Grep Pattern Validation

## Problem
Validator uses overly broad regex '{.*}' which matches CSS braces 
instead of just placeholders.

## Solution
Update agents/2l-validator.md validation logic to use '{[A-Z_]+}' 
pattern that only matches uppercase placeholder names.

## Success Criteria
- [ ] Grep validation no longer matches CSS braces
- [ ] Placeholder validation still works correctly
- [ ] All 3 affected projects (SplitEasy, ai-mafia, wealth) pass validation
```

**Recommendation:** Use this pattern. It's the core innovation of plan-5.

---

### Pattern Type: Graceful Degradation for Learning Capture

**Description:** Learning capture is OPTIONAL - if `learnings.yaml` write fails, the orchestration continues normally. This prevents learning infrastructure from blocking actual work.

**Use Case:** If disk is full or permissions issue prevents YAML write, validator logs warning but still completes validation.

**Example:**
```python
# In validator
try:
    write_yaml(learnings_path, learnings)
    log("Learnings captured successfully")
except Exception as e:
    log_warning(f"Failed to write learnings.yaml: {e}")
    # Continue anyway - learning capture is nice-to-have, not critical
```

**Recommendation:** Use this pattern for backward compatibility and resilience.

---

### Pattern Type: Status Lifecycle for Deduplication

**Description:** Track learning status (IDENTIFIED → IMPLEMENTED → VERIFIED) to prevent `/2l-improve` from trying to fix the same issue multiple times.

**Use Case:** After `/2l-improve` fixes "grep pattern validation", the learning is marked `IMPLEMENTED`. Next time `/2l-improve` runs, it skips this learning because status != IDENTIFIED.

**Example:**
```yaml
# Before /2l-improve
patterns:
  - pattern_id: PATTERN-002
    status: IDENTIFIED  # Shows in /2l-improve
    
# After /2l-improve completes
patterns:
  - pattern_id: PATTERN-002
    status: IMPLEMENTED  # Hidden from /2l-improve
    implemented_in: plan-5-iter-1
    implemented_at: 2025-11-19T15:30:00Z
    
# After validation confirms fix works
patterns:
  - pattern_id: PATTERN-002
    status: VERIFIED  # Archived success
    verified_at: 2025-11-20T10:00:00Z
```

**Recommendation:** Essential for preventing duplicate work. Implement in iteration 1.

---

### Pattern Type: Re-validation Checkpoint

**Description:** After healing completes, ALWAYS re-run validation before marking iteration complete. This prevents false "healing worked" assumptions.

**Use Case:** Healer fixes TypeScript errors but accidentally breaks tests. Re-validation catches this before git commit.

**Example:**
```python
# Orchestrator flow
initial_validation = spawn_validator()

if initial_validation == FAIL:
    spawn_healer()
    
    # Re-validation checkpoint (NEW)
    re_validation = spawn_validator()
    
    if re_validation == PASS:
        ✅ Healing confirmed successful
    elif re_validation == FAIL:
        ❌ Healing did not fix issue (or broke something else)
        → Second healing round OR manual escalation
```

**Recommendation:** Critical for reliability. Implement in iteration 1.

---

## Complexity Assessment

### High Complexity Areas

#### 1. Orchestrator Reflection Logic (Feature 4)
**Why it's complex:**
- Orchestrator must merge learnings atomically (no partial writes)
- Must handle concurrent access if multiple iterations run (unlikely but possible)
- Must detect duplicates when merging iteration learnings into global
- Must enrich learnings with iteration metadata

**Estimated builder splits needed:** 1 builder (no split)

**Complexity details:**
- YAML parsing and merging: MEDIUM
- Duplicate detection: MEDIUM
- Atomic writes: LOW (use temp file + rename pattern)
- Metadata enrichment: LOW

**Recommendation:** Single builder can handle this. Use established YAML merge patterns.

---

#### 2. Re-validation Checkpoint Logic (Feature 2)
**Why it's complex:**
- Orchestrator must track healing rounds (prevent infinite loops)
- Must differentiate original validation from re-validation in events
- Must handle edge cases:
  - Healer reports COMPLETE but didn't fix issue
  - Healer fixes issue but breaks something else
  - Multiple healing rounds needed

**Estimated builder splits needed:** 1 builder (no split)

**Complexity details:**
- Healing round counter: LOW
- Re-validation spawn logic: MEDIUM
- Event differentiation: LOW
- Edge case handling: MEDIUM

**Recommendation:** Straightforward orchestrator extension. Single builder sufficient.

---

### Medium Complexity Areas

#### 1. Learning Capture in Validator (Feature 1)
**Why it's medium complexity:**
- Must extract structured learnings from validation failures
- Must infer root causes (not always obvious from error messages)
- Must categorize severity (critical vs medium vs low)
- Must identify affected files

**Estimated builder splits needed:** 1 builder (no split)

**Complexity details:**
- Extraction logic: MEDIUM (pattern matching on validation output)
- Root cause inference: MEDIUM (heuristics needed)
- Severity classification: LOW (rule-based)
- File identification: LOW (already in validation report)

**Recommendation:** Extend existing validator agent. Template-driven extraction.

---

### Low Complexity Areas

#### 1. YAML Schema Definition
**Why it's straightforward:**
- Well-defined data structure
- No complex validation logic
- Standard YAML format

**Recommendation:** Define schema upfront in iteration 1 planning.

---

#### 2. Event Emission for Re-validation
**Why it's straightforward:**
- Reuse existing event logger library
- Add `re_validation: true` flag to distinguish from original validation

**Recommendation:** Minimal code change. Use existing patterns.

---

## Technology Recommendations

### Primary Stack

**Framework:** No framework needed - Bash orchestration logic
- **Rationale:** Orchestrator is Bash-based (2l-mvp.md), reflection logic extends this

**Data Format:** YAML for learnings
- **Rationale:** 
  - Consistent with existing config.yaml pattern
  - Human-readable and editable
  - Well-supported YAML parsing in Bash (yq or python helper)

**Event System:** Existing lib/2l-event-logger.sh
- **Rationale:** Already established, no changes needed

**File System:** Standard POSIX file operations
- **Rationale:** Learning files are simple YAML - standard read/write sufficient

---

### Supporting Libraries

**YAML Parser:** yq (command-line YAML processor)
- **Purpose:** Parse and merge YAML in orchestrator reflection logic
- **Why needed:** Bash doesn't have native YAML support

**Python (optional):** For complex YAML manipulation
- **Purpose:** Orchestrator can spawn Python helper script for YAML merging
- **Why needed:** More robust than yq for complex merge operations

---

## Integration Points

### External APIs
None - All local file system operations

---

### Internal Integrations

#### Integration 1: Validator ↔ Orchestrator
**How they connect:** Validator writes learnings.yaml → Orchestrator reads it during reflection

**Contract:**
- **Validator responsibility:** Create `.2L/{plan}/iteration-{N}/learnings.yaml` when status != PASS
- **Orchestrator responsibility:** Read learnings.yaml after validation PASS, merge into global

**Data flow:**
```
Validator detects failures
  ↓
Extracts structured learnings
  ↓
Writes learnings.yaml
  ↓
Orchestrator reflection reads learnings.yaml
  ↓
Merges into global-learnings.yaml
```

---

#### Integration 2: Orchestrator ↔ Healer (Re-validation)
**How they connect:** Orchestrator spawns healer → waits for completion → re-spawns validator

**Contract:**
- **Orchestrator responsibility:** Re-spawn validator after healing, track healing rounds
- **Healer responsibility:** Report COMPLETE status (same as before)
- **Validator responsibility:** Run same checks, create new validation-report.md

**Data flow:**
```
Validation FAIL
  ↓
Orchestrator spawns healer
  ↓
Healer reports COMPLETE
  ↓
Orchestrator re-spawns validator
  ↓
Re-validation runs (same checks)
  ↓
If PASS: iteration complete
If FAIL: second healing round OR escalate
```

---

#### Integration 3: Global Learnings ↔ /2l-improve (Future)
**How they connect:** /2l-improve reads global-learnings.yaml → filters IDENTIFIED → auto-generates vision

**Contract:**
- **Orchestrator responsibility:** Maintain global-learnings.yaml with status tracking
- **/2l-improve responsibility:** Read global learnings, filter by status, generate vision

**Data flow:**
```
/2l-improve reads .2L/global-learnings.yaml
  ↓
Filters patterns with status: IDENTIFIED
  ↓
Ranks by severity × occurrences
  ↓
Auto-generates vision.md from top patterns
  ↓
User confirms
  ↓
Runs /2l-mvp to implement fixes
  ↓
Updates learnings to status: IMPLEMENTED
```

---

## Risks & Challenges

### Technical Risks

#### Risk 1: YAML Merge Conflicts
**Impact:** If multiple learnings have same pattern_id, merging could create duplicates

**Mitigation strategy:**
1. Use atomic writes (temp file + rename)
2. Implement deduplication logic based on issue similarity
3. Lock global-learnings.yaml during merge (simple file lock)

**Likelihood:** LOW (single orchestration at a time)

---

#### Risk 2: Learning Quality Depends on Validator Insight
**Impact:** If validator can't determine root cause, learnings will be shallow

**Mitigation strategy:**
1. Allow `root_cause: UNKNOWN - requires investigation` placeholder
2. Manual refinement of global-learnings.yaml allowed
3. Healing explorers can enrich learnings with deeper analysis

**Likelihood:** MEDIUM (some failures have non-obvious root causes)

---

#### Risk 3: Symlink Integrity
**Impact:** If symlinks break, `/2l-improve` modifications won't be live

**Mitigation strategy:**
1. Verify symlinks exist before `/2l-improve` runs
2. Fail with clear error message if symlinks broken
3. Document symlink setup in README

**Likelihood:** LOW (symlinks established during installation)

---

### Complexity Risks

#### Risk 1: Orchestrator Reflection Might Need Split
**Likelihood of builder needing to split:** LOW (15%)

**Rationale:** Reflection logic is straightforward YAML merge. If YAML complexity grows, builder might split into:
- Sub-builder A: YAML parsing and validation
- Sub-builder B: Deduplication and merging
- Sub-builder C: Metadata enrichment

**Mitigation:** Define clear YAML schema upfront. Use existing merge patterns.

---

#### Risk 2: Re-validation Loop Prevention
**Likelihood of builder needing to split:** LOW (10%)

**Rationale:** Healing round tracking is simple counter. Edge cases are well-defined. No split expected unless healing logic becomes complex.

---

## Recommendations for Planner

### 1. Define YAML Schema First
**Rationale:** Learning schema is foundational. All components depend on it. Define in planning phase before building.

**Suggested schema:**
```yaml
# Per-iteration learnings.yaml
project: {project_name}
learnings:
  - id: {project}-{YYYYMMDD}-{NNN}
    iteration: {plan}-iter-{N}
    category: validation | integration | healing
    severity: critical | medium | low
    issue: "Brief description of failure"
    root_cause: "Why this happened (or UNKNOWN)"
    solution: "How to fix (or proposed approach)"
    recurrence_risk: high | medium | low
    affected_files:
      - "path/to/file.ts"
```

---

### 2. Extend Existing Agents, Don't Create New Ones
**Rationale:** 
- Validator already has validation logic → Add learning extraction
- Orchestrator already has iteration flow → Add reflection checkpoint
- This maintains architecture consistency

**Recommended approach:**
- Builder 1: Extend `agents/2l-validator.md` for learning capture
- Builder 2: Extend `commands/2l-mvp.md` for re-validation and reflection
- Builder 3 (if needed): Create helper scripts for YAML merging

---

### 3. Implement Graceful Degradation
**Rationale:** Learning infrastructure should never block orchestrations. If learning capture fails, log warning and continue.

**Implementation:**
```python
try:
    write_learnings_yaml()
except Exception as e:
    log_warning(f"Learning capture failed: {e}")
    # Continue - learning is optional
```

---

### 4. Use Existing Event System
**Rationale:** Re-validation events should follow established patterns. No new event types needed.

**Events to emit:**
- `phase_change` - "Starting Re-validation" (when re-spawning validator)
- `validation_result` - "Re-validation: PASS/FAIL" (distinguishes from original)
- `reflection_complete` - "N learnings added to global knowledge base"

---

### 5. Plan for Manual Learning Refinement
**Rationale:** Some learnings may need human insight. Allow manual edits to global-learnings.yaml.

**Recommendation:** Document that global-learnings.yaml is human-editable. Add comments in YAML to guide manual additions.

---

## Resource Map

### Critical Files/Directories

#### Source Files (To Be Modified)
- `agents/2l-validator.md` - Add learning extraction logic
- `commands/2l-mvp.md` - Add re-validation and reflection logic
- `lib/2l-event-logger.sh` - No changes needed (already sufficient)

#### Data Files (To Be Created)
- `.2L/global-learnings.yaml` - Global learning aggregation
- `.2L/{plan}/iteration-{N}/learnings.yaml` - Per-iteration learnings
- `Prod/{project}/.2L/{plan}/iteration-{N}/learnings.yaml` - Project learnings

#### Documentation Files
- `.2L/plan-5/vision.md` - Already exists (defines requirements)
- `.2L/plan-5/master-plan.yaml` - Already exists (defines iterations)
- `README.md` - Update with learning capture explanation

---

### Key Dependencies

#### External Dependencies
- `yq` - YAML processor (install via: `brew install yq` or `apt install yq`)
  - **Why needed:** Bash doesn't have native YAML parsing
  - **Alternative:** Python helper script for YAML operations

#### Internal Dependencies
- Event logger library (`lib/2l-event-logger.sh`) - Already exists
- Config management (`lib/config-helpers.sh`) - May need creation for YAML ops
- Orchestrator state tracking - Already established in 2l-mvp.md

---

### Testing Infrastructure

#### Unit Testing
**Tool/Approach:** Manual testing via `/2l-mvp` orchestration

**Rationale:** Orchestrator logic is hard to unit test. End-to-end testing via actual orchestrations is more practical.

**Test cases:**
1. **Learning capture:** Run orchestration that fails validation, verify learnings.yaml created
2. **Re-validation:** Trigger healing, verify validator re-runs and catches incomplete fixes
3. **Reflection:** Complete iteration with learnings, verify global-learnings.yaml updated
4. **Status tracking:** Run /2l-improve twice, verify IMPLEMENTED learnings are skipped

#### Integration Testing
**Tool/Approach:** Test on actual Prod/ projects (SplitEasy, ai-mafia, wealth)

**Test flow:**
1. Run validation on SplitEasy (known to have issues)
2. Verify learnings.yaml created with correct structure
3. Run orchestrator reflection
4. Verify global-learnings.yaml aggregates SplitEasy learnings
5. Repeat for ai-mafia and wealth
6. Verify deduplication (same patterns merged)

#### Validation Testing
**Tool/Approach:** Re-validation checkpoint testing

**Test scenarios:**
1. **Successful healing:** Healer fixes issue, re-validation PASS
2. **Incomplete healing:** Healer reports COMPLETE but issue persists, re-validation FAIL
3. **Healing introduces new issue:** Re-validation catches regression
4. **Max healing rounds:** Verify escalation after 2 rounds

---

## Questions for Planner

### Question 1: YAML Merge Strategy
When merging iteration learnings into global, should we:
- **Option A:** Append all learnings (allow duplicates, deduplicate later)
- **Option B:** Deduplicate during merge (more complex but cleaner)

**Recommendation:** Option B for cleaner data, but requires similarity detection logic.

---

### Question 2: Learning ID Format
Should learning IDs be:
- **Option A:** `{project}-{YYYYMMDD}-{NNN}` (e.g., SplitEasy-20251119-001)
- **Option B:** UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)
- **Option C:** Sequential counter (e.g., LEARNING-001, LEARNING-002)

**Recommendation:** Option A for human readability and project traceability.

---

### Question 3: Re-validation Healing Round Limit
How many healing rounds before escalating to user?
- **Option A:** 1 round (fail fast)
- **Option B:** 2 rounds (give healing a second chance)
- **Option C:** 3 rounds (more attempts but risk wasted time)

**Recommendation:** Option B (2 rounds) - balances automated fixing with time efficiency.

---

### Question 4: Learning Severity Classification
How should validator determine severity?
- **Option A:** Rule-based (TypeScript errors = critical, linting = low)
- **Option B:** Manual classification (validator asks user)
- **Option C:** Heuristic (based on number of affected files, type of failure)

**Recommendation:** Option A (rule-based) for automation, with ability to manually override in global-learnings.yaml.

---

**Report completed:** 2025-11-19T04:30:00Z
**Explorer:** Explorer-1
**Confidence:** HIGH (90%)
