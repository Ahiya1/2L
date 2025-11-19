# Builder Task Breakdown - /2l-improve Command

## Overview

**Total Builders:** 2 (sequential execution)

**Estimated Total Hours:** 10-14

**Complexity Drivers:**
- Meta-circular self-modification safety
- Template-based vision generation
- Status lifecycle management
- Multi-layered safety mechanisms

**Builder Assignment Strategy:**
- Builder-1: Core command infrastructure (pattern detection, confirmation, status updates)
- Builder-2: Vision generation and self-modification orchestration
- Clear integration contract: Pattern JSON → Vision generation
- Sequential dependency: Builder-2 starts after Builder-1 completes

---

## Builder-1: Core Command Infrastructure

### Scope

Implement the foundational /2l-improve command with pattern detection, ranking, filtering, confirmation workflow, and status update capabilities. This builder creates the "read and decide" portion of the workflow.

**What this builder delivers:**
- `/2l-improve --dry-run` works end-to-end (no self-modification, just simulation)
- Pattern detection identifies recurring IDENTIFIED patterns
- Confirmation workflow displays pattern evidence and gets user consent
- Status updater can mark patterns as IMPLEMENTED
- CLI argument parsing (--dry-run, --manual, --pattern PATTERN-ID)

**What this builder does NOT deliver:**
- Vision generation (Builder-2)
- /2l-mvp invocation (Builder-2)
- Symlink verification (Builder-2)

---

### Complexity Estimate

**MEDIUM-HIGH**

**Estimated Hours:** 5-7

**Breakdown:**
- Pattern detector: 2 hours (~100 LOC)
- Status updater: 1 hour (extend existing YAML helpers ~90 LOC)
- Confirmation workflow: 1.5 hours (~80 LOC)
- CLI structure: 1 hour (~60 LOC)
- Testing: 0.5-1.5 hours

**Justification:**
- Pattern detection algorithm is well-defined (impact scoring formula clear)
- Status updater extends proven iteration 1 patterns
- Confirmation workflow is primarily display logic
- No complex dependencies or novel patterns
- Testable with synthetic data

---

### Success Criteria

- [ ] `/2l-improve --dry-run` executes without errors
- [ ] Pattern detector filters WHERE status = IDENTIFIED
- [ ] Pattern detector ranks by impact score (formula: severity × occurrences × recurrence_factor)
- [ ] Confirmation workflow displays: pattern name, severity, occurrences, projects, root cause, solution
- [ ] Confirmation workflow offers [P]roceed / [E]dit / [C]ancel options
- [ ] Status updater updates pattern atomically (uses atomic_write_yaml)
- [ ] Status updater adds metadata: implemented_in_plan, implemented_at, vision_file
- [ ] CLI argument parsing supports: --dry-run, --manual, --pattern PATTERN-ID
- [ ] Events emitted: command_start, learnings_loaded, pattern_detection, pattern_selected, confirmation_prompt
- [ ] Unit tests pass for pattern detection and impact calculation
- [ ] Integration test: dry-run mode works with synthetic learnings

---

### Files to Create

**1. lib/2l-pattern-detector.py** (~100 LOC)

Purpose: Detect and rank recurring patterns from global learnings

Functions:
- `detect_recurring_patterns(global_learnings_path, min_occurrences, min_severity)` → list of patterns sorted by impact
- `calculate_impact_score(pattern)` → float (severity_weight × occurrences × recurrence_factor)
- CLI interface (argparse): `--global-learnings`, `--min-occurrences`, `--min-severity`, `--output`

Output: JSON with patterns_found, patterns list

Example from patterns.md: Pattern 2

---

**2. commands/2l-improve.md** (partial - ~200 LOC in this builder)

Purpose: Main CLI command (foundation)

Sections to implement:
- Argument parsing (--dry-run, --manual, --pattern)
- Event logger sourcing
- Pattern detection invocation
- Pattern selection (interactive or via --pattern flag)
- Confirmation workflow
- Dry-run simulation
- Event emission (9 events total, this builder implements 5)

Example from patterns.md: Pattern 5, Pattern 6, Pattern 7

**Note:** Builder-2 will extend this file with vision generation and self-modification sections.

---

**3. lib/2l-yaml-helpers.py** (extend - +90 LOC)

Purpose: Add status update functionality

New function:
- `update_pattern_status(pattern_id, new_status, metadata=None)`

Extended CLI:
- Add `update_pattern_status` command to argparse choices
- Arguments: `--pattern-id`, `--status`, `--metadata-json`

Example from patterns.md: Pattern 1

**Note:** This file already exists from iteration 1. Extend it, don't replace it.

---

### Dependencies

**On Iteration 1 (COMPLETE):**
- ✅ global-learnings.yaml schema
- ✅ lib/2l-yaml-helpers.py (atomic_write_yaml, backup_before_write)
- ✅ lib/2l-event-logger.sh (log_2l_event)

**On System:**
- ✅ Python 3.8+
- ✅ PyYAML (installed in iteration 1)
- ✅ Bash 4+

**Blocks:**
- Builder-2 (needs pattern detector output format)

---

### Implementation Notes

**Pattern Detection Algorithm:**

Impact score formula (from vision):
```
severity_weight × occurrences × recurrence_factor

where:
  severity_weight = {critical: 10, medium: 5, low: 1}
  occurrences = number of times pattern occurred
  recurrence_factor = 1.5 if multiple projects, else 1.0
```

**Status Transition Validation:**

For iteration 7, only support: IDENTIFIED → IMPLEMENTED

```python
if current_status == 'IMPLEMENTED' and new_status == 'IMPLEMENTED':
    # Idempotent - no-op
    return pattern
```

**Dry-Run Mode:**

- Run pattern detection (real)
- Show pattern selection (top 1)
- Simulate vision generation (show preview of what would be generated)
- Simulate /2l-mvp execution (show command that would run)
- Simulate status update (show what would change)
- Exit code 0 (success)

**Gotchas:**

1. **Backward compatibility:** Patterns without `status` field should default to IDENTIFIED
   ```python
   pattern.get('status', 'IDENTIFIED')
   ```

2. **Empty patterns:** If no IDENTIFIED patterns, exit cleanly with informative message
   ```bash
   echo "✅ No recurring patterns detected"
   echo "   All IDENTIFIED patterns have been addressed."
   exit 0
   ```

3. **Tie scores:** If multiple patterns have same impact score, use alphabetical pattern_id
   ```python
   sorted_patterns = sorted(
       filtered_patterns,
       key=lambda p: (p['impact_score'], p['pattern_id']),
       reverse=True
   )
   ```

4. **JSON piping:** Use temp files, not pipes, for JSON data (easier debugging)
   ```bash
   patterns_json=$(mktemp)
   python3 lib/2l-pattern-detector.py --output "$patterns_json"
   # ... use file
   rm "$patterns_json"  # cleanup
   ```

---

### Patterns to Follow

Reference patterns from `patterns.md`:

- **Pattern 1:** Status Update with Atomic Write
  - Use for: lib/2l-yaml-helpers.py extension
  - Key: Backup before write, atomic_write_yaml, validate pattern exists

- **Pattern 2:** Pattern Detection & Ranking
  - Use for: lib/2l-pattern-detector.py
  - Key: Filter by status, calculate impact, sort descending

- **Pattern 5:** Confirmation Workflow
  - Use for: commands/2l-improve.md confirmation section
  - Key: Display evidence, offer 3 options, emit events

- **Pattern 6:** Event Emission Throughout Workflow
  - Use for: All event calls in 2l-improve.md
  - Key: Check EVENT_LOGGING_ENABLED, graceful degradation, descriptive messages

- **Pattern 7:** Dry-Run Mode
  - Use for: commands/2l-improve.md dry-run logic
  - Key: Real detection, simulated modifications, clear "would do" language

---

### Testing Requirements

**Unit Tests (Python):**

Create `tests/test_pattern_detector.py`:

1. Test `calculate_impact_score()`:
   - Critical + 3 occurrences + multi-project = 45.0
   - Medium + 2 occurrences + single-project = 10.0

2. Test `detect_recurring_patterns()`:
   - Filters WHERE status = IDENTIFIED
   - Filters WHERE occurrences >= min_occurrences
   - Filters WHERE severity >= min_severity
   - Sorts by impact score descending

3. Test edge cases:
   - Empty patterns (returns empty list)
   - All below threshold (returns empty list)
   - Tie scores (alphabetical by pattern_id)

**Coverage Target:** 80%+ for pattern detector

---

**Integration Test (Bash):**

Create `tests/test_2l_improve_dry_run.sh`:

1. Create synthetic global-learnings.yaml with test pattern
2. Run `/2l-improve --dry-run`
3. Verify output contains "DRY-RUN MODE"
4. Verify test pattern detected
5. Verify no files modified
6. Verify exit code 0

**Coverage:** End-to-end dry-run flow

---

**Manual Test Checklist:**

After implementation, manually verify:

- [ ] `/2l-improve --dry-run` shows top pattern
- [ ] `/2l-improve --manual` (should fail in Builder-1, needs Builder-2's vision generation)
- [ ] Pattern detector finds patterns from real global-learnings.yaml (if exists)
- [ ] Confirmation workflow displays all required fields
- [ ] [C]ancel option exits cleanly (no modifications)
- [ ] Events appear in .2L/events.jsonl

---

### Potential Split Strategy

**IF complexity exceeds 7 hours:**

Foundation (Builder-1 creates before splitting):
- lib/2l-pattern-detector.py (complete)
- lib/2l-yaml-helpers.py extension (complete)

**Sub-builder 1A: CLI Framework**
- commands/2l-improve.md structure
- Argument parsing
- Pattern detector invocation
- Dry-run mode
- Estimated: 3 hours

**Sub-builder 1B: Confirmation Workflow**
- Confirmation display function
- User input handling ([P]/[E]/[C])
- Event emission
- Status update invocation (after Builder-2 completes /2l-mvp)
- Estimated: 2-3 hours

**Recommendation:** Don't split unless Builder-1 exceeds 8 hours. The components are cohesive and splitting adds integration overhead.

---

## Builder-2: Vision Generation & Self-Modification

### Scope

Implement vision auto-generation from patterns and self-modification orchestration with multi-layered safety mechanisms. This builder creates the "generate and execute" portion of the workflow.

**What this builder delivers:**
- `/2l-improve` (full auto mode) works end-to-end
- Vision template with variable substitution
- Vision generator creates valid vision.md from pattern data
- Self-modification orchestration invokes /2l-mvp safely
- Orchestrator exclusion (never modify commands/2l-mvp.md)
- Git safety checkpoints and rollback
- Symlink verification

**What this builder integrates with:**
- Builder-1's pattern detector (reads JSON output)
- Builder-1's status updater (calls after /2l-mvp completes)
- Builder-1's confirmation workflow (proceeds if user confirms)

---

### Complexity Estimate

**HIGH**

**Estimated Hours:** 5-7

**Breakdown:**
- Vision template: 1 hour (~80 lines markdown)
- Vision generator: 2 hours (~110 LOC Python)
- Self-modification orchestration: 2 hours (~150 LOC Bash)
- Safety mechanisms: 1 hour (~60 LOC Bash + 60 LOC verify-symlinks.sh)
- Testing: 1 hour

**Justification:**
- Template creation is straightforward (copy vision format)
- Vision generator is mostly string substitution
- Self-modification orchestration has complex safety logic
- Git operations need careful error handling
- Meta-circular safety is critical (multiple safety checks)
- Component inference is heuristic (keyword matching)

---

### Success Criteria

- [ ] Vision template includes all required placeholders (see patterns.md Pattern 3)
- [ ] Vision generator substitutes all variables correctly
- [ ] Vision generator infers affected components from root_cause keywords
- [ ] Generated vision.md is valid markdown with complete sections
- [ ] Self-modification orchestration verifies orchestrator exclusion (fails if 2l-mvp.md suggested)
- [ ] Git status check aborts if working directory dirty (with override option)
- [ ] Symlink verification checks all critical symlinks (agents/, commands/, lib/)
- [ ] Pre-modification git checkpoint created (commit + tag)
- [ ] /2l-mvp invoked correctly with generated vision
- [ ] Post-modification git commit with metadata (pattern ID, plan, tag)
- [ ] Auto-rollback on /2l-mvp failure (git reset to checkpoint)
- [ ] Events emitted: vision_generated, self_modification_start, self_modification_complete, status_updated, command_complete
- [ ] `/2l-improve` (auto mode) completes end-to-end with synthetic data
- [ ] Unit test: orchestrator exclusion blocks 2l-mvp.md modifications

---

### Files to Create

**1. .claude/templates/improvement-vision.md** (~80 lines)

Purpose: Vision template for auto-generated improvements

Placeholders (from patterns.md Pattern 3):
- `{PATTERN_NAME}`, `{PATTERN_ID}`, `{ISO_TIMESTAMP}`, `{PLAN_ID}`
- `{OCCURRENCES}`, `{PROJECT_COUNT}`, `{SEVERITY}`, `{RECURRENCE_RISK}`
- `{PATTERN_ROOT_CAUSE}`, `{PATTERN_PROPOSED_SOLUTION}`
- `{PROJECT_LIST}`, `{SOURCE_LEARNINGS_LIST}`, `{AFFECTED_COMPONENTS_LIST}`
- `{AVG_HEALING_ROUNDS}`, `{AVG_FILES_MODIFIED}`, `{AVG_DURATION_SECONDS}`
- `{AFFECTED_FILES_FROM_PATTERN}`, `{OCCURRENCE_DETAILS}`

Structure:
- Problem Statement (with evidence)
- Impact Analysis (metrics)
- Proposed Solution (from pattern)
- Feature Breakdown (MVP acceptance criteria)
- Success Criteria (measurable)
- Affected Components (inferred)
- Out of Scope (standard exclusions)
- Source Data (traceability)

See patterns.md Pattern 3 for complete example.

---

**2. lib/2l-vision-generator.py** (~110 LOC)

Purpose: Generate vision.md from pattern using template

Functions:
- `infer_affected_components(root_cause)` → list of component descriptions
- `generate_improvement_vision(pattern, plan_id, template_path)` → vision markdown string
- CLI interface: `--pattern-json`, `--template`, `--output`, `--plan-id`

Component Inference Keywords (from patterns.md):
- "tsconfig" | "path" | "import" → agents/2l-planner.md
- "duplicate" → agents/2l-iplanner.md
- "integration" | "conflict" → agents/2l-integrator.md
- "validation" | "test" → agents/2l-validator.md
- "builder" → agents/2l-builder.md
- Default fallback: "TBD - Requires manual analysis"

Quality Validation:
- Check for unreplaced placeholders: `\{[A-Z_]+\}`
- Warn if found (print to stderr)

Example from patterns.md: Pattern 3

---

**3. lib/verify-symlinks.sh** (~60 LOC)

Purpose: Verify ~/.claude/ symlinks point to ~/Ahiya/2L/

Checks:
- `~/.claude/agents` → `~/Ahiya/2L/agents`
- `~/.claude/commands` → `~/Ahiya/2L/commands`
- `~/.claude/lib` → `~/Ahiya/2L/lib`

Validation:
- Symlink exists (`[ -L "$link_path" ]`)
- Target exists (`[ -d "$target_path" ]`)
- Symlink points to correct target (`readlink -f` comparison)

Exit codes:
- 0: All symlinks valid
- 1: At least one issue detected

Output:
- Print status for each symlink (✅ or ❌)
- If failures, print error message with guidance

---

**4. commands/2l-improve.md** (complete - Builder-1's partial + ~200 LOC)

Purpose: Complete /2l-improve command with vision generation and self-modification

Sections to add (Builder-2):
- Vision generation invocation (call 2l-vision-generator.py)
- Self-modification orchestration:
  - `verify_orchestrator_exclusion()` function
  - `verify_git_clean()` function
  - `verify_symlinks()` function
  - `create_safety_checkpoint()` function
  - `execute_self_modification()` function
- /2l-mvp invocation with error handling
- Post-modification git commit
- Rollback on failure
- Status update invocation (call Builder-1's update_pattern_status)
- Event emission (4 additional events)

Example from patterns.md: Pattern 4

---

### Dependencies

**On Builder-1 (MUST COMPLETE FIRST):**
- ⚠️ Pattern detector output format (JSON schema)
- ⚠️ update_pattern_status() function (call after /2l-mvp)
- ⚠️ Confirmation workflow (integrate after user confirms)
- ⚠️ commands/2l-improve.md foundation (extend it)

**On Iteration 1:**
- ✅ atomic_write_yaml (used by status updater)
- ✅ Event system (log_2l_event)

**On System:**
- ✅ Git 2.0+
- ✅ claude-ai command (for /2l-mvp invocation)

**Blocks:**
- Integration phase (needs both builders complete)

---

### Implementation Notes

**Vision Generator Component Inference:**

Use simple keyword matching on root_cause:

```python
root_lower = root_cause.lower()

if 'tsconfig' in root_lower or 'path' in root_lower:
    components.append('agents/2l-planner.md - Add tsconfig validation')

# ... (see patterns.md Pattern 3 for complete list)

# Always include default fallback if no matches
if not components:
    components.append('TBD - Requires manual analysis of root cause')
```

**Rationale:** Heuristic inference is sufficient for MVP. User reviews in confirmation workflow and can edit vision if needed.

---

**Orchestrator Exclusion Safety:**

CRITICAL: Never allow commands/2l-mvp.md to be modified.

Implementation:
```bash
function verify_orchestrator_exclusion() {
    local vision_path="$1"

    # Check if vision mentions 2l-mvp.md
    if grep -q "2l-mvp\.md" "$vision_path"; then
        echo "❌ ERROR: Vision suggests modifying orchestrator"
        echo "   This is blocked for meta-circular safety."
        return 1
    fi

    return 0
}
```

Call this BEFORE user confirmation (fail fast).

---

**Git Safety Checkpoints:**

Three-layer strategy:

1. **Pre-flight check:** Verify working directory clean (or get override consent)
2. **Pre-modification checkpoint:** Git commit + tag before /2l-mvp
3. **Post-modification commit:** Git commit + tag after /2l-mvp success

Tags:
- Pre-modification: `pre-PATTERN-003-1732012345` (pattern ID + timestamp)
- Post-modification: `2l-improve-PATTERN-003` (pattern ID only)

Rollback:
```bash
# On failure:
git reset --hard pre-PATTERN-003-*
```

---

**Error Handling for /2l-mvp:**

Capture exit code and logs:

```bash
mvp_log=".2L/${next_plan_id}/2l-improve-mvp-execution.log"
claude-ai "/2l-mvp" 2>&1 | tee "$mvp_log"
mvp_exit_code=${PIPESTATUS[0]}

if [ $mvp_exit_code -eq 0 ]; then
    # Success path
else
    # Failure path: offer rollback, show log location
fi
```

---

**Gotchas:**

1. **Vision path must be relative to meditation space:**
   ```bash
   vision_path=".2L/${next_plan_id}/vision.md"  # Relative
   # NOT: /home/user/Ahiya/2L/.2L/...  # Absolute breaks portability
   ```

2. **Change directory before /2l-mvp:**
   ```bash
   cd ~/Ahiya/2L || exit 1
   claude-ai "/2l-mvp"
   ```

3. **Pipe exit codes in Bash:**
   ```bash
   command | tee log.txt
   exit_code=${PIPESTATUS[0]}  # Get exit code of 'command', not 'tee'
   ```

4. **Metadata JSON escaping:**
   ```bash
   --metadata-json "{\"key\": \"${variable}\"}"  # Escape quotes
   ```

---

### Patterns to Follow

Reference patterns from `patterns.md`:

- **Pattern 3:** Template-Based Vision Generation
  - Use for: Vision template + generator
  - Key: Variable substitution, component inference, quality validation

- **Pattern 4:** Self-Modification Orchestration with Safety
  - Use for: Self-modification function in 2l-improve.md
  - Key: Multiple safety checks, git checkpoints, rollback capability

- **Pattern 1:** Status Update with Atomic Write
  - Use for: Calling update_pattern_status after /2l-mvp
  - Key: Metadata JSON format, error handling

- **Pattern 6:** Event Emission Throughout Workflow
  - Use for: Vision generated, self-modification start/complete events
  - Key: Descriptive messages, include pattern IDs

---

### Testing Requirements

**Unit Test (Bash):**

Test orchestrator exclusion:

```bash
# tests/test_orchestrator_exclusion.sh

# Create test vision that mentions 2l-mvp.md
echo "Modify commands/2l-mvp.md to add validation" > /tmp/test-vision.md

# Run exclusion check
if verify_orchestrator_exclusion "/tmp/test-vision.md"; then
    echo "❌ TEST FAILED: Should have detected orchestrator modification"
    exit 1
else
    echo "✅ TEST PASSED: Orchestrator exclusion working"
fi

# Clean up
rm /tmp/test-vision.md
```

---

**Integration Test (End-to-End):**

Create `tests/test_2l_improve_full_flow.sh`:

1. Create synthetic global-learnings.yaml with test pattern
2. Create test vision template (simplified)
3. Run `/2l-improve` in test environment (isolated git repo)
4. Mock /2l-mvp (create dummy script that succeeds)
5. Verify:
   - Vision.md created
   - Git checkpoint created
   - Mock /2l-mvp called
   - Post-modification commit created
   - Status updated in global-learnings.yaml
   - Events emitted

**Note:** This is complex. May be deferred to validation phase.

---

**Manual Test Checklist:**

After implementation, manually verify:

- [ ] Vision template has all placeholders
- [ ] Vision generator creates valid markdown
- [ ] Component inference works for common keywords (tsconfig, duplicate, etc.)
- [ ] Orchestrator exclusion blocks 2l-mvp.md
- [ ] Git status check aborts if dirty (with override option working)
- [ ] Symlink verification detects broken symlinks
- [ ] Pre-modification checkpoint created (git tag exists)
- [ ] `/2l-improve` full flow works with test pattern (use real /2l-mvp if brave)
- [ ] Rollback works (git reset to checkpoint)
- [ ] Events appear in .2L/events.jsonl

---

### Potential Split Strategy

**IF complexity exceeds 7 hours:**

Foundation (Builder-2 creates before splitting):
- .claude/templates/improvement-vision.md (complete)
- lib/2l-vision-generator.py (complete)
- lib/verify-symlinks.sh (complete)

**Sub-builder 2A: Vision Integration**
- Integrate vision generator into commands/2l-improve.md
- Handle vision generation errors
- Preview vision in confirmation workflow
- Estimated: 2 hours

**Sub-builder 2B: Self-Modification Orchestration**
- Safety checks (orchestrator exclusion, git, symlinks)
- /2l-mvp invocation
- Git checkpoints and rollback
- Status update integration
- Estimated: 3-4 hours

**Recommendation:** Don't split unless Builder-2 exceeds 8 hours. Self-modification orchestration is tightly coupled and splitting would complicate testing.

---

## Builder Execution Order

### Sequential Execution (Recommended)

**Phase 1: Builder-1**
- Start: After planning complete
- Duration: 5-7 hours
- Deliverable: `/2l-improve --dry-run` working
- Verification: Dry-run shows pattern, confirmation workflow, simulated actions

**Phase 2: Builder-2**
- Start: After Builder-1 complete and verified
- Duration: 5-7 hours
- Deliverable: `/2l-improve` (full auto mode) working
- Verification: Full flow with synthetic data (vision generation → /2l-mvp → status update)

**Why Sequential:**
- Builder-2 depends on Builder-1's pattern detector output format
- Builder-2 extends Builder-1's commands/2l-improve.md
- Builder-2 calls Builder-1's update_pattern_status()
- Integration is trivial (no merge conflicts, clear handoff)

---

## Integration Notes

### Integration Contract

**Builder-1 → Builder-2:**

**Pattern JSON Format:**
```json
{
  "pattern_id": "PATTERN-003",
  "name": "TypeScript path resolution failures",
  "severity": "critical",
  "occurrences": 3,
  "projects": ["wealth", "ai-mafia", "ShipLog"],
  "root_cause": "...",
  "proposed_solution": "...",
  "impact_score": 45.0,
  "source_learnings": ["..."],
  "discovered_in": "plan-3-iter-2",
  "discovered_at": "2025-11-19T15:30:00Z",
  "iteration_metadata": {
    "duration_seconds": 3240,
    "healing_rounds": 1,
    "files_modified": 8
  }
}
```

**Handoff Point:**
```bash
# Builder-1 creates temp JSON file with selected pattern
selected_pattern_json=$(mktemp)
python3 -c "
import json
patterns = json.load(open('$patterns_json'))['patterns']
pattern = next(p for p in patterns if p['pattern_id'] == '$selected_pattern_id')
with open('$selected_pattern_json', 'w') as f:
    json.dump(pattern, f, indent=2)
"

# Builder-2 reads this JSON
python3 lib/2l-vision-generator.py --pattern-json "$selected_pattern_json" ...
```

---

**update_pattern_status() Function Signature:**

```python
# Builder-1 implements:
def update_pattern_status(pattern_id, new_status, metadata=None):
    # ...
    pass

# Builder-2 calls:
python3 lib/2l-yaml-helpers.py update_pattern_status \
    --pattern-id "$selected_pattern_id" \
    --status "IMPLEMENTED" \
    --metadata-json '{"implemented_in_plan": "plan-5", ...}'
```

---

**commands/2l-improve.md Structure:**

```bash
#!/usr/bin/env bash
# commands/2l-improve.md

# ========== Builder-1 Section ==========
# Argument parsing
# Event logger sourcing
# Pattern detection
# Pattern selection
# Confirmation workflow

# ========== Builder-2 Section ==========
# Vision generation
# Self-modification orchestration
# Status update
# Final events

# ========== Main Flow ==========
main() {
    # Builder-1 flow
    parse_args "$@"
    detect_patterns
    select_pattern
    display_confirmation  # Returns if user confirms

    # Builder-2 flow (only if confirmed)
    generate_vision
    execute_self_modification
    update_status
    emit_complete_event
}

main "$@"
```

---

### Potential Conflicts

**Minimal - builders work on different files.**

**Only shared file:** `commands/2l-improve.md`

**Conflict Prevention:**
- Builder-1 creates foundation (top sections)
- Builder-2 extends with new sections (clearly marked)
- Both follow same event emission pattern
- Integration verifies no duplicated code

**If conflict occurs:**
- Builder-2 has newer code (extends Builder-1)
- Keep Builder-2's version of 2l-improve.md
- Verify Builder-1's functions still present (pattern detection, confirmation)

---

### Integration Verification Checklist

After both builders complete:

- [ ] Pattern detector output format matches vision generator input
- [ ] update_pattern_status() callable from Bash with --metadata-json
- [ ] commands/2l-improve.md has all sections (no duplicated code)
- [ ] Event emission consistent (same format, no duplicates)
- [ ] `/2l-improve --dry-run` still works (Builder-1 functionality preserved)
- [ ] `/2l-improve` (auto mode) works end-to-end
- [ ] All 11 events emit correctly
- [ ] Integration test passes (synthetic data → vision → mock /2l-mvp → status update)

---

## Shared Testing Strategy

### Unit Tests (Both Builders)

**Builder-1 Unit Tests:**
- Pattern detection (test_pattern_detector.py)
- Impact score calculation
- Status update (test_status_updater.py - extend 2l-yaml-helpers tests)

**Builder-2 Unit Tests:**
- Component inference (test_vision_generator.py)
- Variable substitution
- Orchestrator exclusion (test_orchestrator_exclusion.sh)

**Total Coverage Target:** 75%+ for Python, manual verification for Bash

---

### Integration Tests (Both Builders)

**Builder-1 Integration Test:**
- Dry-run mode end-to-end (test_2l_improve_dry_run.sh)

**Builder-2 Integration Test:**
- Full flow with mock /2l-mvp (test_2l_improve_full_flow.sh)

**Integrator Test:**
- Real /2l-improve with synthetic learnings (manual, careful)

---

### Edge Case Tests (Integrator)

Test scenarios:
1. **Empty patterns:** No IDENTIFIED patterns → exit cleanly
2. **Tie scores:** Multiple patterns same impact → alphabetical selection
3. **User cancels:** [C] in confirmation → no modifications, clean exit
4. **User edits:** [E] in confirmation → vision saved, exit without /2l-mvp
5. **Dirty git:** Uncommitted changes → abort or override
6. **Broken symlinks:** verify-symlinks.sh fails → abort
7. **Orchestrator in vision:** 2l-mvp.md mentioned → abort before confirmation
8. **/2l-mvp failure:** Exit 1 → rollback offered, status NOT updated

**Execution:** Create test scripts for each scenario

---

## Timeline Summary

**Estimated Total:** 10-14 hours

| Phase | Duration | Activities |
|-------|----------|-----------|
| Builder-1 | 5-7 hours | Pattern detector, confirmation workflow, status updater, CLI foundation |
| Builder-2 | 5-7 hours | Vision template, vision generator, self-modification orchestration, safety |
| Integration | 30-45 min | Merge, verify handoff, integration tests |
| Validation | 30 min | Unit tests, edge cases, manual smoke tests |
| **Total** | **11-15 hours** | Median: 13 hours |

---

## Risk Mitigation

**High Risk:** Meta-circular self-destruction (modifying orchestrator)

**Mitigation:**
- Builder-2 implements hard-coded blacklist check
- Unit test verifies orchestrator exclusion
- Check occurs BEFORE user confirmation (fail fast)
- Multiple layers: blacklist, component inference validation, manual review in confirmation

**Residual Risk:** LOW (multi-layered protection)

---

**Medium Risk:** Vision quality variability

**Mitigation:**
- Template-based generation (not LLM)
- Component inference with fallback ("TBD")
- User reviews vision in confirmation workflow
- [E]dit option allows manual refinement
- Validation checkpoint catches poor visions

**Residual Risk:** MEDIUM (acceptable with manual override option)

---

**Medium Risk:** Git conflicts during self-modification

**Mitigation:**
- Pre-flight git status check
- Override option for advanced users
- Clear error messages with guidance
- Safety checkpoint enables rollback

**Residual Risk:** LOW (good error handling)

---

## Success Metrics

**Builder-1 Success:**
- [ ] `/2l-improve --dry-run` shows pattern detection and confirmation
- [ ] Pattern detector finds all IDENTIFIED patterns
- [ ] Impact score ranking works (critical > medium > low)
- [ ] Confirmation workflow displays complete evidence
- [ ] Status updater works (manual test with synthetic data)

**Builder-2 Success:**
- [ ] Vision generator creates valid markdown
- [ ] Component inference returns reasonable suggestions
- [ ] Self-modification orchestration has all safety checks
- [ ] /2l-mvp invoked successfully (test with mock)
- [ ] Git checkpoints created and rollback works

**Integration Success:**
- [ ] `/2l-improve` completes end-to-end with synthetic data
- [ ] Pattern → vision → /2l-mvp → status update pipeline works
- [ ] All 11 events emitted
- [ ] No regression (dry-run still works)

**Validation Success:**
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration tests pass (both builders)
- [ ] Edge cases handled gracefully (8 scenarios)
- [ ] Manual smoke test with real global-learnings.yaml (if exists)

---

## Post-Integration Checklist

**For Integrator:**

- [ ] Merge Builder-1 and Builder-2 outputs into `.2L/plan-5/iteration-7/building/`
- [ ] Verify commands/2l-improve.md has all sections (no duplicates)
- [ ] Verify pattern JSON format matches between detector and generator
- [ ] Run `/2l-improve --dry-run` (Builder-1 functionality)
- [ ] Run `/2l-improve` with synthetic data (full flow)
- [ ] Verify all 11 events in .2L/events.jsonl
- [ ] Run unit tests (both builders)
- [ ] Run integration tests (both builders)
- [ ] Test orchestrator exclusion (unit test)
- [ ] Create synthetic learnings with test pattern
- [ ] Run full /2l-improve with --manual mode (don't auto-execute)
- [ ] Verify vision.md created correctly
- [ ] Code review: check for anti-patterns (see patterns.md)
- [ ] Update .2L/config.yaml: iteration-7 status BUILDING → INTEGRATION
- [ ] Create integration-report.md summarizing merge

**Ready for Validation:** When all checklist items complete

---

## Builder Communication

**Builder-1 to Builder-2:**

Leave comments in commands/2l-improve.md marking integration points:

```bash
# ========== INTEGRATION POINT FOR BUILDER-2 ==========
# After user confirms ([P]roceed chosen), Builder-2 should:
# 1. Generate vision using selected_pattern_json
# 2. Execute self-modification (verify_orchestrator_exclusion, git checkpoints, /2l-mvp)
# 3. Update status (call update_pattern_status with metadata)
# 4. Emit final events (vision_generated, self_modification_*, status_updated, command_complete)
#
# Pattern data available in variable: $selected_pattern_json (temp file path)
# Vision should be saved to: .2L/${next_plan_id}/vision.md
# ======================================================
```

**Builder-2 to Integrator:**

Document changes in builder-2-report.md:

- Files created (vision template, vision generator, verify-symlinks.sh)
- Functions added to commands/2l-improve.md (list function names)
- Integration points verified (pattern JSON consumed correctly)
- Testing performed (unit tests, manual tests)
- Known issues or limitations

---

**End of Builder Task Breakdown**

This breakdown provides builders with:
- Clear scope per builder
- Specific success criteria
- Detailed file ownership
- Integration contracts
- Testing requirements
- Risk mitigation strategies

**For Orchestrator:** Spawn Builder-1 first, verify completion, then spawn Builder-2.

**For Builders:** Follow patterns.md for all implementations. Ask questions if integration contract unclear.

**Date:** 2025-11-19
**Plan:** plan-5, iteration-7
**Total Estimated Hours:** 10-14 (median: 13)
**Builder Count:** 2 (sequential)
**Integration Complexity:** LOW (clear handoff, minimal file overlap)
