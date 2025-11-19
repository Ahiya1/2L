# Builder Task Breakdown

## Overview

2 primary builders will work in parallel to implement learning capture and re-validation infrastructure.

**Estimated Total Time:** 6-8 hours
- Builder 1: 2-3 hours (Learning Capture - Validator Extension)
- Builder 2: 4-5 hours (Re-validation + Orchestrator Reflection)

**Complexity Distribution:**
- Builder 1: LOW complexity (simple validator extension)
- Builder 2: MEDIUM complexity (orchestrator flow modifications)

**No splits expected:** Both tasks are well-scoped and focused.

---

## Builder-1: Learning Capture in Validator

### Scope

Extend the validator agent to automatically create `learnings.yaml` when validation fails. Extract structured learnings from validation report issues and write them to iteration directory.

**What this builder is responsible for:**
- Extending `agents/2l-validator.md` with learning capture logic
- Parsing validation report to extract issues, root causes, solutions
- Generating unique learning IDs in format: `{project}-{YYYYMMDD}-{NNN}`
- Creating `learnings.yaml` in iteration validation directory
- Implementing graceful degradation (failures don't block validation)
- Creating Python helper functions for learning extraction

### Complexity Estimate

**LOW**

**Rationale:**
- Validator already extracts issues for validation report
- Reuse existing issue extraction logic
- Simple YAML file write (not atomic - single validator write)
- No complex orchestration changes
- Clear input/output contract

### Success Criteria

- [ ] Validator creates `learnings.yaml` when validation status is FAIL
- [ ] Learning format matches schema in `patterns.md` (schema_version, project, learnings array)
- [ ] Each learning includes: id, iteration, category, severity, issue, root_cause, solution, recurrence_risk, affected_files
- [ ] Learning IDs follow format: `{project}-{YYYYMMDD}-{NNN}`
- [ ] Graceful degradation: If YAML write fails, log warning but validation continues
- [ ] User-friendly output: Print "Created learnings.yaml with N learning(s)" message
- [ ] No learning capture on PASS status (only FAIL, PARTIAL, UNCERTAIN, INCOMPLETE)

### Files to Create

**New Files:**
- None (extends existing validator agent)

**Files to Modify:**
- `~/.claude/agents/2l-validator.md` - Add learning capture section after validation report generation
  - Add Python code block for `create_learnings_yaml()` function
  - Add call to learning capture after writing validation-report.md
  - Add graceful degradation error handling

**Python Helper Functions to Add (in validator agent):**
```python
# Add these functions to validator agent Python section:
- generate_learning_id(project_name, existing_learnings)
- extract_learnings_from_validation_report(validation_report_path)
- create_learnings_yaml(validation_dir, project_name, plan_id, iteration_id)
```

### Dependencies

**Depends on:** None (no other builders)

**Blocks:** Builder-2 (orchestrator reflection needs learnings.yaml to exist)

**External Dependencies:**
- PyYAML library (already available - confirmed)
- Python 3.x (already available)

### Implementation Notes

**Integration point with validator report:**
- Validator already creates validation-report.md with structured issues
- After report is written, parse it to extract learnings
- Focus on "Critical Issues" section (severity: critical)
- Also parse "Major Issues" section (severity: medium)
- Ignore "Minor Issues" (severity: low, not worth capturing for MVP)

**Issue extraction heuristics:**
- Category: Extract from issue header (TypeScript, Test, Build, etc.)
- Severity: Critical Issues → critical, Major Issues → medium
- Issue: First line of issue description
- Root cause: "Impact" field from validation report (or "UNKNOWN" if unclear)
- Solution: "Suggested fix" field from validation report
- Recurrence risk: Heuristic based on category (TypeScript errors = high, linting = low)
- Affected files: Extract from "Location" field

**Graceful degradation pattern:**
```python
try:
    create_learnings_yaml(...)
    print("   📝 Created learnings.yaml with N learning(s)")
except Exception as e:
    print(f"   ⚠️  Warning: Failed to create learnings.yaml: {e}")
    print(f"   ⚠️  Continuing without learning capture (non-critical)")
    # Don't raise - validation continues
```

**Edge cases to handle:**
- Validation report has no issues (PASS status) → Don't create learnings.yaml
- Validation report parsing fails → Log warning, skip learning capture
- Directory doesn't exist → Create it before writing learnings.yaml
- Multiple issues with same root cause → Create separate learnings (dedupe in iteration 2)

### Patterns to Follow

**Reference patterns from `patterns.md`:**
- Per-Iteration Learnings Schema (YAML structure)
- Learning ID Generation Pattern (`generate_learning_id()`)
- Validator Learning Capture Pattern (`create_learnings_yaml()`)
- Graceful Degradation Error Handling

**Naming conventions:**
- Python functions: snake_case
- YAML fields: lowercase with underscores
- Learning IDs: `{project}-{YYYYMMDD}-{NNN}`

**Code style:**
- Add docstrings to all functions
- Use descriptive variable names
- Include error messages with context

### Testing Requirements

**Manual testing approach:**

**Test Case 1: Successful learning capture**
```bash
# 1. Create intentional TypeScript error
echo "import { Fake } from 'fake';" >> src/test.ts

# 2. Run validator
# (validator should detect error and create learnings.yaml)

# 3. Verify learnings.yaml exists
test -f .2L/plan-*/iteration-*/validation/learnings.yaml
echo "PASS: learnings.yaml created"

# 4. Verify YAML structure
python3 -c "import yaml; data = yaml.safe_load(open('.2L/plan-*/iteration-*/validation/learnings.yaml')); assert data['schema_version'] == '1.0'; print('PASS: Schema valid')"

# 5. Verify learning fields
cat .2L/plan-*/iteration-*/validation/learnings.yaml | grep -E "id:|severity:|issue:|root_cause:"

# 6. Cleanup
git checkout src/test.ts
```

**Test Case 2: Graceful degradation**
```bash
# 1. Make validation directory read-only (force write failure)
chmod 555 .2L/plan-*/iteration-*/validation/

# 2. Run validator with error
# (should log warning but complete validation)

# 3. Verify validator completes (no crash)
echo "PASS: Validator completed despite YAML write failure"

# 4. Restore permissions
chmod 755 .2L/plan-*/iteration-*/validation/
```

**Test Case 3: Learning ID uniqueness**
```bash
# 1. Force multiple validation failures in same day

# 2. Verify learning IDs increment correctly
# wealth-20251119-001, wealth-20251119-002, etc.

# 3. Check for duplicates
cat .2L/plan-*/iteration-*/validation/learnings.yaml | grep "^  - id:" | sort | uniq -d
# (should be empty - no duplicates)
```

**Coverage target:** 100% of FAIL validations create learnings.yaml

**Integration test:** Builder-2 will test that orchestrator reflection can read learnings.yaml

---

## Builder-2: Re-validation Checkpoint & Orchestrator Reflection

### Scope

Extend orchestrator to re-run validation after healing completes, and add reflection logic to merge iteration learnings into global knowledge base. Also create YAML helper library for atomic writes and learning aggregation.

**What this builder is responsible for:**
- Extending `commands/2l-mvp.md` with re-validation checkpoint logic
- Implementing healing loop with max 2 attempts
- Re-spawning validator after healing completes
- Checking re-validation status and handling outcomes (PASS/FAIL)
- Implementing orchestrator reflection after validation PASS
- Creating `lib/2l-yaml-helpers.py` for YAML operations
- Implementing atomic write pattern for global-learnings.yaml
- Merging iteration learnings into global with metadata enrichment
- Emitting events for re-validation and reflection

### Complexity Estimate

**MEDIUM**

**Rationale:**
- Modifies complex orchestrator healing loop
- Must prevent infinite healing loops (max attempts logic)
- Requires atomic write pattern for file safety
- YAML merge logic with deduplication
- Multiple integration points (validator, healer, events)
- Edge case handling (healing introduces new bugs, healing makes no changes)

### Success Criteria

- [ ] After healing completes, orchestrator re-spawns validator automatically
- [ ] Re-validation runs same checks as original validation
- [ ] If re-validation PASS: Mark iteration complete, proceed to reflection
- [ ] If re-validation FAIL (attempt 1): Try healing again (max 2 total attempts)
- [ ] If re-validation FAIL (attempt 2): Escalate to manual intervention with clear message
- [ ] Edge case: If healing makes no git changes, escalate immediately (don't waste 2nd attempt)
- [ ] Orchestrator reflection runs after validation PASS, before git commit
- [ ] If learnings.yaml exists, merge into .2L/global-learnings.yaml
- [ ] Global learnings include status: IDENTIFIED and metadata (discovered_in, discovered_at)
- [ ] Iteration metadata enriched: duration_seconds, healing_rounds, files_modified
- [ ] Atomic writes prevent global-learnings.yaml corruption
- [ ] Backup created before each global merge (.bak file)
- [ ] Events emitted: phase_change (re-validation start), validation_result (re-validation outcome), reflection_complete
- [ ] Graceful degradation: Reflection failure is warning, not error

### Files to Create

**New Files:**
- `~/.claude/lib/2l-yaml-helpers.py` - YAML operations library
  - `atomic_write_yaml(file_path, data)`
  - `backup_before_write(file_path)`
  - `merge_learnings(iteration_learnings_path, global_learnings_path, ...)`
  - `find_similar_pattern(existing_patterns, new_pattern)`
  - `generate_pattern_id(existing_patterns)`
  - CLI interface for Bash orchestrator to call

**Files to Modify:**
- `~/.claude/commands/2l-mvp.md` - Orchestrator command
  - Add re-validation checkpoint in healing loop
  - Add healing attempt counter and max limit (MAX_HEALING_ATTEMPTS=2)
  - Add orchestrator reflection function
  - Add call to reflection after validation PASS
  - Add event emissions for re-validation and reflection

**Data Files Created (by orchestrator at runtime):**
- `.2L/global-learnings.yaml` - Global learning aggregation (created on first merge)
- `.2L/global-learnings.yaml.bak` - Backup before each merge

### Dependencies

**Depends on:** Builder-1 (needs learnings.yaml format defined)

**Blocks:** None (final builder in iteration)

**External Dependencies:**
- PyYAML library (already available)
- Event logger library (already exists at ~/.claude/lib/2l-event-logger.sh)
- Python 3.x (already available)

### Implementation Notes

**Re-validation checkpoint logic:**

Location in orchestrator: After healing completes, before marking iteration complete

```bash
# Healing loop structure:
MAX_HEALING_ATTEMPTS=2
healing_attempt=1

while [ $healing_attempt -le $MAX_HEALING_ATTEMPTS ]; do
    # Spawn healers
    # Wait for healing

    # NEW: Re-validation checkpoint
    spawn_validator  # Re-run all checks

    if re_validation == PASS:
        break  # Success!
    elif healing_attempt < MAX_HEALING_ATTEMPTS:
        # Check git diff (healing made changes?)
        healing_attempt++
        continue  # Try again
    else:
        escalate_to_manual_intervention()
fi
```

**Orchestrator reflection logic:**

Location in orchestrator: After validation PASS, before git commit

```bash
# After validation PASS:
if [ -f "$iteration_dir/learnings.yaml" ]; then
    # Calculate iteration metadata
    duration_seconds=$(...)
    healing_rounds=$(...)
    files_modified=$(...)

    # Call Python helper to merge
    python3 lib/2l-yaml-helpers.py merge_learnings \
        --iteration-learnings "$iteration_dir/learnings.yaml" \
        --global-learnings ".2L/global-learnings.yaml" \
        --discovered-in "plan-${plan_id}-iter-${global_iter}" \
        --duration "$duration_seconds" \
        --healing-rounds "$healing_rounds" \
        --files-modified "$files_modified"

    # Emit reflection_complete event
fi

# Git commit (includes learnings files)
```

**YAML merge algorithm:**

1. Read iteration learnings.yaml
2. Read or initialize global-learnings.yaml (create if first time)
3. For each iteration learning:
   - Convert to global pattern format
   - Check if similar pattern exists (exact root_cause match)
   - If exists: Increment occurrences, add project to list, add source_learning
   - If new: Add as new pattern with status: IDENTIFIED
4. Enrich with iteration metadata
5. Update aggregated_at timestamp
6. Backup existing global file to .bak
7. Atomic write to global file

**Pattern similarity logic (conservative for MVP):**
- Exact match on `root_cause` field
- Also check `severity` matches
- If both match: Same pattern (increment occurrences)
- If either differs: Different pattern (add new entry)

**Event emission points:**
- Re-validation start: `phase_change` event with "Starting re-validation after healing attempt N"
- Re-validation result: `validation_result` event with "Re-validation attempt N: PASS/FAIL"
- Iteration complete (after healing): `iteration_complete` event with "Iteration N completed after M healing round(s)"
- Reflection complete: `reflection_complete` event with "N learnings added to global knowledge base"

**Edge cases to handle:**

1. **Healing makes no changes:**
   - Check `git diff --stat` after healing
   - If empty: Escalate immediately (don't waste 2nd attempt)

2. **Healing introduces new bugs:**
   - Re-validation catches them
   - Counts as same healing attempt (healing failed)

3. **Global learnings file doesn't exist:**
   - Initialize new file with schema_version, empty patterns array
   - This is expected on first run

4. **Iteration has no learnings.yaml:**
   - Skip reflection (log "No learnings to merge")
   - This is normal for iterations with no failures

5. **YAML merge fails:**
   - Log error with backup file location
   - Don't crash orchestrator (graceful degradation)
   - Reflection failure is warning, not blocker

6. **Re-validation takes long time:**
   - No timeout (trust validator to complete)
   - Same as first-pass validation behavior

### Patterns to Follow

**Reference patterns from `patterns.md`:**
- Atomic File Write Pattern (`atomic_write_yaml()`)
- Backup Before Write Pattern (`backup_before_write()`)
- Python YAML Merge Pattern (`merge_learnings()`)
- Orchestrator Re-validation Pattern (healing loop modifications)
- Orchestrator Reflection Pattern (reflection function)
- Event Emission Pattern (graceful event logging)
- Global Learnings Schema (YAML structure)

**Naming conventions:**
- Bash functions: snake_case (`orchestrator_reflection`)
- Python functions: snake_case (`merge_learnings`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_HEALING_ATTEMPTS`)
- Pattern IDs: `PATTERN-{NNN}` format

**Code style:**
- Bash: Quote all variables, use `set -e` for error propagation
- Python: Docstrings for all functions, descriptive variable names
- Error messages: Include context (file paths, iteration info)

### Testing Requirements

**Manual testing approach:**

**Test Case 1: Re-validation after successful healing**
```bash
# 1. Create fixable TypeScript error
echo "const x: number = 'wrong';" >> src/test.ts

# 2. Run orchestration
/2l-mvp

# 3. Observe healing + re-validation flow
# Should see: "Healing attempt 1..." → "Re-validating..." → "✅ Re-validation passed!"

# 4. Verify iteration marked complete
grep "iteration_complete" .2L/events.jsonl | tail -1

# 5. Verify only 1 healing attempt
ls .2L/plan-*/iteration-*/healing-* | wc -l
# Should be: 1
```

**Test Case 2: Re-validation after failed healing (escalation)**
```bash
# 1. Create unfixable error (or error healer can't detect)
# (e.g., logic bug in algorithm)

# 2. Run orchestration
/2l-mvp

# 3. Observe max healing attempts
# Should see: "Healing attempt 1..." → "Re-validating..." → "❌ Re-validation failed"
# Then: "Healing attempt 2..." → "Re-validating..." → "❌ Re-validation failed"
# Finally: "⚠️  MANUAL INTERVENTION REQUIRED"

# 4. Verify 2 healing attempts
ls .2L/plan-*/iteration-*/healing-* | wc -l
# Should be: 2

# 5. Verify orchestrator exited with error
echo $?
# Should be: 1 (non-zero exit code)
```

**Test Case 3: Orchestrator reflection merges learnings**
```bash
# 1. Complete iteration with validation failure (creates learnings.yaml)
# (From Builder-1 test)

# 2. Fix error manually, run validation (PASS)

# 3. Verify global-learnings.yaml created/updated
test -f .2L/global-learnings.yaml
echo "PASS: Global learnings file exists"

# 4. Verify learning merged with status: IDENTIFIED
grep -A 10 "status: IDENTIFIED" .2L/global-learnings.yaml

# 5. Verify metadata enriched
grep -E "discovered_in:|duration_seconds:|healing_rounds:" .2L/global-learnings.yaml
```

**Test Case 4: Atomic write safety**
```bash
# 1. Add delay to atomic_write_yaml() (in lib/2l-yaml-helpers.py)
# import time
# time.sleep(5)  # Before shutil.move()

# 2. Run reflection in background
python3 lib/2l-yaml-helpers.py merge_learnings ... &

# 3. Kill process mid-write
sleep 2
kill -9 $!

# 4. Verify global-learnings.yaml not corrupted
python3 -c "import yaml; yaml.safe_load(open('.2L/global-learnings.yaml')); print('PASS: File valid')"

# 5. Verify .bak backup exists
test -f .2L/global-learnings.yaml.bak
echo "PASS: Backup created"

# 6. Verify no orphaned temp files
ls .2L/.tmp_*.yaml 2>/dev/null
# (should not exist - cleaned up)
```

**Test Case 5: Healing makes no changes (immediate escalation)**
```bash
# 1. Create error that healer can't fix (no changes made)

# 2. Run orchestration

# 3. Verify escalation after 1st attempt (not 2nd)
# Should see: "⚠️  ERROR: Healing made no changes. Escalating to manual intervention."

# 4. Verify only 1 healing attempt
ls .2L/plan-*/iteration-*/healing-* | wc -l
# Should be: 1 (not 2)
```

**Test Case 6: Event emission for re-validation**
```bash
# 1. Run orchestration with healing

# 2. Check events.jsonl for re-validation events
grep "re-validation" .2L/events.jsonl

# 3. Verify event sequence:
# - phase_change: "Starting re-validation after healing attempt 1"
# - validation_result: "Re-validation attempt 1: PASS"
# - iteration_complete: "Iteration N completed after 1 healing round(s)"

# 4. Verify reflection_complete event
grep "reflection_complete" .2L/events.jsonl
```

**Coverage target:**
- 100% of healing attempts trigger re-validation
- 100% of iterations with learnings.yaml trigger reflection
- 0% false iteration completion (must pass re-validation)

**Integration test:** After Builder-1 and Builder-2 merge, test end-to-end pipeline:
1. Force validation failure (Builder-1 creates learnings.yaml)
2. Healing runs
3. Re-validation runs (Builder-2)
4. Iteration completes
5. Orchestrator reflection merges learnings (Builder-2)
6. Verify global-learnings.yaml contains learning with metadata

### Potential Split Strategy

**Likelihood of split:** LOW (15%)

**If complexity proves too high, consider splitting into:**

**Foundation (Primary Builder-2):**
- Re-validation checkpoint logic
- Healing loop modifications
- Event emission
- Basic orchestrator reflection hook (calls Python script)

**Sub-builder 2A: YAML Operations Library**
- Create lib/2l-yaml-helpers.py
- Implement atomic write pattern
- Implement merge_learnings() function
- Implement pattern similarity detection
- CLI interface for Bash orchestrator

**Sub-builder 2B: Global Learnings Schema**
- Define global-learnings.yaml structure
- Implement pattern ID generation
- Implement metadata enrichment logic
- Test YAML merge deduplication

**Rationale for not splitting (primary plan):**
- YAML operations are well-defined (clear patterns in patterns.md)
- Atomic write pattern is standard (temp file + rename)
- Merge logic is conservative (exact root_cause match only)
- Total estimated time still within builder capacity (4-5 hours)

---

## Builder Execution Order

### Parallel Group 1 (No dependencies)

**Builder-1: Learning Capture**
- Can start immediately
- No dependencies on other builders
- Estimated: 2-3 hours

**Builder-2: Re-validation + Reflection**
- Can start immediately (patterns defined upfront)
- Reads learnings.yaml format from patterns.md (not from Builder-1 code)
- Estimated: 4-5 hours

**Parallelization rationale:**
- Builders work on different files (validator agent vs. orchestrator command)
- Learnings.yaml schema defined in patterns.md (shared contract)
- No code dependencies between builders
- Integration happens after both complete

### Integration Notes

**How builder outputs come together:**

1. **Builder-1 completes first** (simpler task):
   - Validator agent extended with learning capture
   - Manual test: Force validation failure, verify learnings.yaml created

2. **Builder-2 completes** (more complex):
   - Orchestrator extended with re-validation and reflection
   - YAML helper library created
   - Manual test: Run orchestration with healing, verify reflection

3. **Integrator merges**:
   - Verify learnings.yaml schema matches what orchestrator reflection expects
   - Test end-to-end: validation failure → learning capture → healing → re-validation → reflection → global merge

**Potential conflict areas:**

**Low conflict risk:**
- Different files modified (validator vs. orchestrator)
- File-based integration (learnings.yaml contract)
- No shared code between builders

**Integration verification checklist:**
- [ ] Validator creates learnings.yaml with correct schema
- [ ] Orchestrator reflection can parse learnings.yaml
- [ ] Re-validation spawns validator correctly
- [ ] Events emitted for both learning capture and reflection
- [ ] Global-learnings.yaml created with correct schema
- [ ] Atomic writes prevent corruption
- [ ] Graceful degradation works in both builders

**Shared files that need coordination:**

None. Builders work on separate files:
- Builder-1: `agents/2l-validator.md`
- Builder-2: `commands/2l-mvp.md`, `lib/2l-yaml-helpers.py` (new)

**Integration timeline:**
- Total building: 4-5 hours (parallel)
- Integration: 30 minutes (low conflict, file-based contract)
- Validation: 20 minutes (manual tests from both builders)
- Total iteration: ~6-8 hours

---

## Final Validation Checklist

After integration, validator runs these checks:

**Functional Tests:**
- [ ] Validator creates learnings.yaml on FAIL (Builder-1)
- [ ] Learning IDs are unique and follow format (Builder-1)
- [ ] Re-validation runs after healing (Builder-2)
- [ ] Max 2 healing attempts enforced (Builder-2)
- [ ] Orchestrator reflection merges learnings (Builder-2)
- [ ] Global learnings include status: IDENTIFIED (Builder-2)
- [ ] Iteration metadata enriched correctly (Builder-2)

**Safety Tests:**
- [ ] Learning capture failure doesn't block validation (Builder-1)
- [ ] Reflection failure doesn't block iteration completion (Builder-2)
- [ ] Atomic writes prevent global file corruption (Builder-2)
- [ ] Backup files created before merge (Builder-2)

**Event Tests:**
- [ ] Re-validation events emitted to events.jsonl (Builder-2)
- [ ] Reflection events emitted to events.jsonl (Builder-2)

**Integration Tests:**
- [ ] End-to-end: Validation failure → learning → healing → re-validation → reflection
- [ ] Global learnings file accumulates across multiple iterations
- [ ] Pattern similarity detection works (same root_cause merges)

**Edge Case Tests:**
- [ ] Healing makes no changes → immediate escalation (Builder-2)
- [ ] Healing introduces new bugs → re-validation catches them (Builder-2)
- [ ] First iteration initializes global-learnings.yaml correctly (Builder-2)
- [ ] Iteration with no failures skips learning capture (Builder-1)

---

## Success Metrics

**Iteration is successful when:**

1. **Learning Capture Works (Builder-1)**
   - Metric: Run 5 validation failures, check learnings.yaml creation
   - Target: 100% of FAIL validations create learnings.yaml

2. **Re-validation Prevents False Completion (Builder-2)**
   - Metric: Trigger healing that doesn't fix issue, verify escalation
   - Target: 0% false COMPLETE status (healing must pass re-validation)

3. **Orchestrator Reflection Works (Builder-2)**
   - Metric: Complete 3 iterations with learnings, verify global merge
   - Target: All learnings appear in global-learnings.yaml with correct status

4. **Safety Guarantees Hold (Builder-2)**
   - Metric: Kill process mid-merge, verify no corruption
   - Target: 100% of atomic writes succeed or rollback (never partial)

---

## Deployment Plan

**After integration and validation:**

1. Git commit:
   ```bash
   git add .2L/global-learnings.yaml
   git add .2L/plan-5/iteration-6/
   git commit -m "plan-5-iter-6: Learning capture and re-validation foundation

   - Extended validator for learning capture (Builder-1)
   - Added re-validation checkpoint to orchestrator (Builder-2)
   - Implemented orchestrator reflection (Builder-2)
   - Created YAML helper library for atomic writes (Builder-2)

   Features:
   - Validators create learnings.yaml on FAIL
   - Re-validation prevents false iteration completion
   - Global learnings aggregation with status tracking
   - Atomic writes prevent data corruption"
   ```

2. Changes are immediately live (symlinks: ~/.claude/ → ~/Ahiya/2L/)

3. Next orchestrations will use new learning capture system

4. Monitor events.jsonl for re-validation and reflection events

---

**Builder Tasks Complete**

This breakdown provides clear, isolated tasks for 2 builders with minimal overlap and well-defined integration points. Both builders can work in parallel with confidence that their outputs will merge cleanly.
