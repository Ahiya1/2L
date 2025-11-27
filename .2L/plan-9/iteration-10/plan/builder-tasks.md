# Builder Task Breakdown

## Overview

3 primary builders will work in **sequence** (due to dependencies).

**Estimated Total Time:** 6-7 hours

**Complexity Distribution:**
- Builder-1: HIGH complexity (recurrence detection logic)
- Builder-2: MEDIUM complexity (orchestrator integration)
- Builder-3: MEDIUM complexity (testing and validation)

**Success Metric:** PATTERN-001 verified after 3 iterations without recurrence

---

## Builder-1: Pattern Lifecycle Recurrence Detection

### Scope

Implement the core recurrence detection logic in the pattern lifecycle manager. This builder extends `lib/2l-pattern-lifecycle.py` with methods to check if IMPLEMENTED patterns recurred in the current iteration, and automatically transition patterns to VERIFIED or REGRESSED based on the 3-iteration monitoring window.

**What this builder is responsible for:**
- Add `check_recurrence()` method to PatternLifecycleManager class
- Add helper method `_calculate_similarity()` (copied from aggregator)
- Add helper method `_load_iteration_learnings()` for JSONL parsing
- Add `check-recurrence` CLI subcommand with argparse
- Implement 3-iteration verification window logic
- Unit tests for recurrence detection algorithm

**What this builder is NOT responsible for:**
- Integration with /2l-mvp orchestrator (Builder-2)
- Event emission from bash (Builder-2)
- End-to-end testing with PATTERN-001 (Builder-3)

### Complexity Estimate

**HIGH**

**Justification:**
- Multi-condition verification logic (similarity + category + window)
- JSONL parsing with edge case handling
- Similarity algorithm copy (must match aggregator exactly)
- State machine integration (IMPLEMENTED → VERIFIED/REGRESSED)
- CLI interface extension with exit code semantics

**Recommend SPLIT:** No - Manageable by single builder with clear specification

### Success Criteria

- [ ] `check_recurrence()` method implemented and functional
- [ ] Recurrence detection using 0.8 similarity threshold works
- [ ] Category matching prevents false positives (different categories don't match)
- [ ] 3-iteration verification window logic correct (verify at start+3)
- [ ] Exit codes: 0=monitoring, 1=verified, 2=regressed
- [ ] CLI command `check-recurrence` accepts --pattern-id, --current-iteration, --global-learnings
- [ ] Graceful error handling: missing learnings file, malformed YAML, pattern not found
- [ ] Unit tests pass: exact match, fuzzy match, category mismatch, window boundaries
- [ ] Similarity algorithm produces same results as reflection aggregator (consistency test)
- [ ] Atomic YAML updates with backup (reuse existing pattern)

### Files to Create

- `lib/test-pattern-lifecycle-recurrence.sh` - Unit test suite (~150 lines)

### Files to Modify

- `lib/2l-pattern-lifecycle.py` - Add ~175 lines:
  - Line ~150: `check_recurrence()` method (~100 lines)
  - Line ~250: `_calculate_similarity()` helper (~25 lines)
  - Line ~275: `_load_iteration_learnings()` helper (~30 lines)
  - Line ~270 (argparse section): `check-recurrence` CLI command (~20 lines)

### Dependencies

**Depends on:** None (extends existing lifecycle manager)

**Blocks:** Builder-2 (needs check-recurrence CLI command), Builder-3 (needs logic to test)

### Implementation Notes

**Key Algorithm - Similarity Matching:**

```python
from difflib import SequenceMatcher

def _calculate_similarity(self, text1: str, text2: str) -> float:
    """
    Copy this EXACT code from lib/2l-reflection-aggregator.py (lines 79-85).
    DO NOT modify the algorithm - consistency is critical.
    """
    norm1 = text1.lower().strip()
    norm2 = text2.lower().strip()
    return SequenceMatcher(None, norm1, norm2).ratio()
```

**Key Algorithm - Verification Window:**

```python
# Pattern implemented at iteration 8, verification starts at 9
verification_start = pattern['verification_start_iteration']  # 9

# Monitor iterations: 9, 10, 11 (3 iterations)
# Verify at iteration 12 (start + 3)
if current_iteration >= verification_start + 3:
    # Window complete, pattern verified
```

**Gotchas:**
- Off-by-one errors in iteration counting (use `>=` not `>` for window end)
- Missing `verification_start_iteration` field (patterns before iteration 8)
- Learnings file may not exist (iteration failed validation)
- Empty learnings list is valid (not an error)

**Critical Files to Reference:**
- `lib/2l-reflection-aggregator.py` lines 79-85: Copy calculate_similarity()
- `lib/2l-pattern-lifecycle.py` lines 88-94: See verification_start_iteration pattern
- `lib/2l-pattern-lifecycle.py` lines 151-166: See state transition validation pattern

### Patterns to Follow

Reference patterns from `patterns.md`:

- **Pattern 1:** Similarity Calculation (copy exact code from aggregator)
- **Pattern 2:** Load Iteration Learnings (JSONL parsing with glob)
- **Pattern 3:** Check Recurrence (main logic with 3-iteration window)
- **Pattern 4:** CLI Subcommand Definition (argparse pattern)
- **Pattern 9:** Unit Test Structure (bash test script)

### Testing Requirements

**Unit Tests (in test-pattern-lifecycle-recurrence.sh):**

1. **Test: Recurrence detection with exact match**
   - Setup: Pattern with root_cause "Missing error handling"
   - Current learning: Same root_cause, same category
   - Expected: exit code 2 (REGRESSED), status updated

2. **Test: Recurrence detection with fuzzy match**
   - Setup: Pattern root_cause "Missing exploration phase"
   - Current learning: "Exploration phase missing" (similar, 0.85 similarity)
   - Expected: exit code 2 (REGRESSED)

3. **Test: Category mismatch prevents false positive**
   - Setup: Pattern category "functionality", learning category "speed"
   - Root causes similar (0.9 similarity)
   - Expected: exit code 0 (monitoring), no REGRESSED

4. **Test: Verification after 3 iterations**
   - Setup: verification_start=9, current_iteration=12
   - No recurrences in iterations 9, 10, 11
   - Expected: exit code 1 (VERIFIED), status updated

5. **Test: Still monitoring (iteration 2 of 3)**
   - Setup: verification_start=9, current_iteration=10
   - Expected: exit code 0 (monitoring), no status change

6. **Test: Missing learnings file**
   - Setup: Learnings file doesn't exist for current iteration
   - Expected: exit code 0 (monitoring), graceful failure

**Coverage target:** 90%+ of recurrence detection code paths

### Potential Split Strategy

**Foundation (if complexity proves too high):**

This task should NOT need splitting. However, if builder encounters difficulty:

**Primary builder creates:**
- `check_recurrence()` method skeleton
- `_calculate_similarity()` helper (simple copy)
- Basic CLI command structure
- Tests for similarity algorithm only

**Sub-builder 1A: Window Logic & JSONL Parsing**
- Implement `_load_iteration_learnings()`
- Implement verification window logic
- Tests for window boundaries

**Sub-builder 1B: CLI & Integration**
- Complete CLI subcommand handling
- Exit code logic
- Error handling and edge cases

**Estimate if split:** 2 hours (primary) + 1.5 hours (1A) + 1 hour (1B) = 4.5 hours total

**Recommendation:** Avoid split - specification is clear, algorithm is proven

---

## Builder-2: /2l-mvp Orchestrator Integration

### Scope

Integrate the pattern lifecycle monitoring into the /2l-mvp orchestrator at the two reflection points (first-pass completion and healing completion). This builder creates a bash function that checks all IMPLEMENTED patterns after each iteration's reflection is created, and emits appropriate events.

**What this builder is responsible for:**
- Create `check_pattern_lifecycle()` bash function in /2l-mvp
- Integrate function call at line ~1199 (after first-pass reflection)
- Integrate function call at line ~1438 (after healing reflection)
- Event emission: `pattern_verified`, `pattern_regressed`
- Error handling: non-blocking execution, graceful failures
- Integration testing: verify both code paths execute

**What this builder is NOT responsible for:**
- Pattern lifecycle manager logic (Builder-1)
- End-to-end validation with PATTERN-001 (Builder-3)
- Modifying reflection creation (already complete from iteration 9)

### Complexity Estimate

**MEDIUM**

**Justification:**
- Bash scripting (moderate complexity)
- Two integration points (duplication risk)
- Event emission pattern (existing pattern to follow)
- Error handling in orchestrator context
- Testing integration requires mock iteration environment

**Recommend SPLIT:** No - Clear integration points, existing patterns to follow

### Success Criteria

- [ ] `check_pattern_lifecycle()` function defined in /2l-mvp before first usage
- [ ] Function called after reflection creation at line ~1199 (first-pass path)
- [ ] Function called after reflection creation at line ~1438 (healing path)
- [ ] Function handles zero IMPLEMENTED patterns gracefully (no-op)
- [ ] Exit code 1 triggers pattern_verified event emission
- [ ] Exit code 2 triggers pattern_regressed event emission
- [ ] Exit code 0 shows monitoring status (no event)
- [ ] Errors in lifecycle check don't block iteration completion
- [ ] Integration test confirms both code paths execute
- [ ] Function logs clear status messages (verified/regressed/monitoring)

### Files to Create

None (only modifies existing file)

### Files to Modify

- `commands/2l-mvp.md` - Add ~66 lines:
  - Before line 1199: Define `check_pattern_lifecycle()` function (~60 lines)
  - Line ~1199: Call `check_pattern_lifecycle "$global_iter"` (~3 lines)
  - Line ~1438: Call `check_pattern_lifecycle "$global_iter"` (~3 lines)

### Dependencies

**Depends on:** Builder-1 (requires check-recurrence CLI command)

**Blocks:** Builder-3 (testing needs integration complete)

### Implementation Notes

**Integration Point 1 - First-Pass Completion (Line ~1199):**

```bash
# Context: After orchestrator_reflection(), after REFLECTION.md creation

# Generate iteration reflection (existing from iteration 9)
echo "   📝 Generating iteration reflection..."
python3 "$HOME/.claude/lib/2l-reflection-generator.py" \
    --project-root "." \
    --iteration "$global_iter" \
    --output ".2L/plan-${plan_id}/iteration-${global_iter}/REFLECTION.md" \
    > /dev/null 2>&1 || true

# NEW: Pattern Lifecycle - Check for verification/regression
check_pattern_lifecycle "$global_iter"

# EVENT: iteration_complete (existing)
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "iteration_complete" "..." "building" "orchestrator"
fi
```

**Integration Point 2 - Healing Completion (Line ~1438):**

Same pattern as Integration Point 1 - exact same code.

**Gotchas:**
- Function must be defined BEFORE line 1199 (first call site)
- Both call sites must use same function (no duplication)
- Event logging conditional on EVENT_LOGGING_ENABLED flag
- Non-blocking execution (errors logged but don't stop iteration)

**Critical Files to Reference:**
- `lib/2l-event-logger.sh`: Event emission pattern
- `commands/2l-mvp.md` lines 1199, 1438: Reflection creation context
- Iteration 9 integration: Reflection generator integration pattern

### Patterns to Follow

Reference patterns from `patterns.md`:

- **Pattern 5:** Lifecycle Monitoring Function (complete bash implementation)
- **Pattern 6:** Integration Call Sites (exact insertion points)
- **Pattern 8:** Bash Event Emission (log_2l_event usage)

### Testing Requirements

**Integration Tests:**

1. **Test: Function defined before first usage**
   - Verify `check_pattern_lifecycle` function exists before line 1199
   - Run /2l-mvp with test iteration, check no "command not found" errors

2. **Test: Both code paths execute**
   - First-pass path: Run /2l-mvp with passing iteration
   - Healing path: Run /2l-mvp with failing then healing iteration
   - Verify lifecycle check runs in both cases

3. **Test: Zero IMPLEMENTED patterns (graceful no-op)**
   - Setup: Empty patterns list in global-learnings.yaml
   - Expected: "No patterns to monitor" message, no errors

4. **Test: Event emission on verification**
   - Setup: Pattern ready to verify (iteration 12, start=9)
   - Expected: pattern_verified event in .2L/events.jsonl

5. **Test: Event emission on regression**
   - Setup: Pattern with recurrence
   - Expected: pattern_regressed event in .2L/events.jsonl

6. **Test: Non-blocking on lifecycle error**
   - Setup: Corrupt global-learnings.yaml
   - Expected: Lifecycle check fails gracefully, iteration completes

**Coverage target:** Both integration points (first-pass and healing) tested

### Potential Split Strategy

**Not recommended** - Integration is straightforward, clear insertion points.

If split needed:

**Primary builder:**
- Define `check_pattern_lifecycle()` function
- Integrate at line 1199 (first-pass only)

**Sub-builder 2A:**
- Integrate at line 1438 (healing path)
- Test both paths

**Estimate if split:** 1.5 hours (primary) + 0.5 hours (2A) = 2 hours total

---

## Builder-3: Testing & End-to-End Validation

### Scope

Create comprehensive test suite and validate the complete pattern lifecycle verification system end-to-end using PATTERN-001 as the test case. This builder ensures all components work together and that the verification/regression logic is correct in realistic scenarios.

**What this builder is responsible for:**
- End-to-end test: PATTERN-001 verification after 3 iterations
- End-to-end test: PATTERN-001 regression detection
- Smoke tests: Existing functionality unaffected
- Vision enhancement validation (iteration 8 feature still works)
- Edge case testing: multiple patterns, missing files, malformed data
- Documentation: Validation report summarizing all test results
- Success criteria verification checklist

**What this builder is NOT responsible for:**
- Implementing pattern lifecycle logic (Builder-1)
- Implementing /2l-mvp integration (Builder-2)
- Unit tests for recurrence detection (Builder-1)

### Complexity Estimate

**MEDIUM**

**Justification:**
- End-to-end testing requires orchestrating multiple components
- PATTERN-001 has real history (need to understand state)
- Multiple test scenarios (verification, regression, edge cases)
- Validation report requires summarizing results
- Need to verify no regression in existing features

**Recommend SPLIT:** No - Testing is sequential, single builder maintains context

### Success Criteria

- [ ] PATTERN-001 end-to-end test passes: IMPLEMENTED → 3 iterations → VERIFIED
- [ ] PATTERN-001 regression test passes: Re-introduce issue → REGRESSED detection
- [ ] Multiple patterns test passes: 3 patterns monitored simultaneously
- [ ] Edge case tests pass: missing files, empty learnings, malformed YAML
- [ ] Smoke test passes: Existing lifecycle tests (test-pattern-lifecycle.sh) still pass
- [ ] Vision enhancement validation: Iteration 8 vision generator still works
- [ ] Event log verification: pattern_verified and pattern_regressed events present
- [ ] Validation report created documenting all test results
- [ ] Test execution time < 5 minutes total
- [ ] All tests automated (can run without manual intervention)

### Files to Create

- `.2L/plan-9/iteration-10/validation/validation-report.md` - Test results summary

### Files to Modify

None (only runs existing tests and creates new validation report)

### Dependencies

**Depends on:** Builder-1 (needs lifecycle logic), Builder-2 (needs integration)

**Blocks:** None (final validation before iteration complete)

### Implementation Notes

**PATTERN-001 Context:**

```yaml
# Current state (check .2L/global-learnings.yaml)
pattern_id: PATTERN-001
name: "Missing exploration phase in 2l-improve"
status: IMPLEMENTED  # (May be VERIFIED if previous test ran)
implemented_in_iteration: 8
verification_start_iteration: 9
root_cause: "2l-improve generates visions without analyzing target codebase"
category: functionality
```

**Test Scenario 1: Verification Flow**

1. Reset PATTERN-001 to IMPLEMENTED (if needed)
2. Simulate iterations 9, 10, 11 with different issues (no recurrence)
3. Run check-recurrence at iteration 12
4. Verify: status=VERIFIED, event emitted, verified_in_iteration=12

**Test Scenario 2: Regression Flow**

1. Reset PATTERN-001 to IMPLEMENTED
2. Create iteration 9 learnings with similar root_cause (0.85+ similarity)
3. Run check-recurrence at iteration 9
4. Verify: status=REGRESSED, event emitted, similarity score logged

**Gotchas:**
- PATTERN-001 may already be VERIFIED from previous runs (reset before test)
- Need to create realistic learnings files (not empty)
- Similarity threshold is 0.8 (need 0.8+ for match)
- Category must match for recurrence (both "functionality")

**Critical Files to Reference:**
- `.2L/global-learnings.yaml`: PATTERN-001 current state
- `lib/test-pattern-lifecycle.sh`: Existing test pattern to follow
- `.2L/events.jsonl`: Event log for verification

### Patterns to Follow

Reference patterns from `patterns.md`:

- **Pattern 9:** Unit Test Structure (test script organization)
- **Pattern 10:** End-to-End Integration Test (PATTERN-001 workflow)

### Testing Requirements

**Test Suite (validation/validation-report.md will document):**

1. **End-to-End: PATTERN-001 Verification**
   - Setup: PATTERN-001 IMPLEMENTED, verification_start=9
   - Run: check-recurrence at iterations 9, 10, 11 (monitoring)
   - Run: check-recurrence at iteration 12 (verify)
   - Assert: status=VERIFIED, event logged
   - Duration: ~30 seconds

2. **End-to-End: PATTERN-001 Regression**
   - Setup: PATTERN-001 IMPLEMENTED
   - Create: Iteration learnings with matching root_cause
   - Run: check-recurrence
   - Assert: status=REGRESSED, similarity score logged
   - Duration: ~20 seconds

3. **Multi-Pattern Monitoring**
   - Setup: Create 3 test patterns in IMPLEMENTED status
   - Simulate: Iteration with mixed outcomes (1 verify, 1 regress, 1 monitor)
   - Assert: Correct transitions for each pattern
   - Duration: ~40 seconds

4. **Edge Case: Missing Learnings File**
   - Setup: Pattern ready to check, but learnings.yaml missing
   - Run: check-recurrence
   - Assert: Graceful failure (monitoring status, no crash)
   - Duration: ~10 seconds

5. **Edge Case: Empty Learnings**
   - Setup: learnings.yaml exists but learnings list empty
   - Run: check-recurrence
   - Assert: No recurrence detected (monitoring continues)
   - Duration: ~10 seconds

6. **Smoke Test: Existing Functionality**
   - Run: lib/test-pattern-lifecycle.sh (existing tests)
   - Assert: All tests pass (no regression)
   - Duration: ~30 seconds

7. **Vision Enhancement Validation**
   - Run: 2l-vision-generator.py with exploration directory
   - Assert: Exploration context included in vision
   - Verify: Feature from iteration 8 still works
   - Duration: ~20 seconds

8. **Event Log Verification**
   - Check: .2L/events.jsonl contains pattern_verified events
   - Check: .2L/events.jsonl contains pattern_regressed events
   - Assert: Event schema correct (timestamp, event_type, data)
   - Duration: ~10 seconds

**Total Test Duration:** ~3 minutes

### Potential Split Strategy

**Not recommended** - Test suite is cohesive, single builder maintains context.

If split needed:

**Primary builder:**
- End-to-end tests (verification, regression)
- PATTERN-001 scenarios
- Validation report

**Sub-builder 3A:**
- Edge case tests
- Smoke tests
- Event log verification

**Estimate if split:** 1.5 hours (primary) + 0.5 hours (3A) = 2 hours total

---

## Builder Execution Order

### Sequential Execution (Strict Dependencies)

**Phase 1: Core Logic (Builder-1)**
- **Who:** Builder-1
- **Duration:** 3-4 hours
- **Deliverable:** Pattern lifecycle manager with recurrence detection
- **Blocks:** All other builders

**Phase 2: Integration (Builder-2)**
- **Who:** Builder-2
- **Duration:** 1.5-2 hours
- **Depends on:** Builder-1 complete (needs check-recurrence CLI)
- **Deliverable:** /2l-mvp orchestrator integration
- **Blocks:** Builder-3

**Phase 3: Validation (Builder-3)**
- **Who:** Builder-3
- **Duration:** 1.5-2 hours
- **Depends on:** Builder-1, Builder-2 complete
- **Deliverable:** Test suite and validation report
- **Blocks:** None (final phase)

**Total Sequential Duration:** 6-8 hours

**Why Sequential:**
- Builder-2 needs Builder-1's CLI command to integrate
- Builder-3 needs both Builder-1 and Builder-2 to test end-to-end
- No parallel work possible due to tight coupling

### Integration Notes

**How builder outputs will come together:**

1. **After Builder-1:**
   - File created: `lib/test-pattern-lifecycle-recurrence.sh`
   - File modified: `lib/2l-pattern-lifecycle.py` (+175 lines)
   - Integrator verifies: CLI command works standalone
   - Integrator runs: Unit tests pass

2. **After Builder-2:**
   - File modified: `commands/2l-mvp.md` (+66 lines)
   - Integrator verifies: Function defined before usage
   - Integrator verifies: Both call sites present (lines 1199, 1438)
   - Integrator runs: Integration test (mock iteration)

3. **After Builder-3:**
   - File created: `.2L/plan-9/iteration-10/validation/validation-report.md`
   - Integrator verifies: All test scenarios pass
   - Integrator verifies: PATTERN-001 reaches VERIFIED status
   - Integrator verifies: No regression in existing tests

**Conflict Prevention:**

- No shared files between builders (clean separation)
- Builder-1 owns `lib/2l-pattern-lifecycle.py`
- Builder-2 owns `commands/2l-mvp.md`
- Builder-3 creates new validation file (no conflicts)
- All read `global-learnings.yaml` but only Builder-1's code modifies it

**Integration Checklist:**

```bash
# After Builder-1
✓ lib/2l-pattern-lifecycle.py has check_recurrence() method
✓ CLI command exists: python3 lib/2l-pattern-lifecycle.py check-recurrence --help
✓ Unit tests pass: bash lib/test-pattern-lifecycle-recurrence.sh

# After Builder-2
✓ commands/2l-mvp.md has check_pattern_lifecycle() function
✓ Function called at line ~1199 (first-pass)
✓ Function called at line ~1438 (healing)
✓ Integration test passes (both paths execute)

# After Builder-3
✓ PATTERN-001 verification test passes
✓ PATTERN-001 regression test passes
✓ All edge case tests pass
✓ Existing test suite still passes (no regression)
✓ Validation report created and comprehensive

# Final Integration
✓ Run full /2l-mvp iteration with PATTERN-001
✓ Verify pattern lifecycle monitoring executes
✓ Check .2L/events.jsonl for verification/regression events
✓ Confirm iteration completes successfully
```

---

## Special Considerations

### PATTERN-001 as Living Test Case

PATTERN-001 is the first real pattern in the 2L system. It has complete history:
- Discovered in iteration 8
- Implemented in iteration 8 (exploration phase added)
- Should verify in iteration 11 (3 clean iterations: 9, 10, 11)

**Important:** PATTERN-001 is a real pattern, not test data. Don't delete it after testing.

**Recommendation:** Document PATTERN-001's journey in validation report as proof of concept.

### Event Logging Best Practices

All builders should follow event logging conventions:

```bash
# Check if logging enabled
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "event_type" "data" "phase" "agent_id"
fi
```

**Don't block on event failures** - logging is best-effort, not critical.

### Backward Compatibility

**Critical:** Existing test suite must still pass after iteration 10.

**Tests that must not break:**
- `lib/test-pattern-lifecycle.sh` (basic lifecycle transitions)
- `lib/test-reflection-aggregator.py` (similarity algorithm)
- Any /2l-mvp smoke tests

**Verification:** Builder-3 includes smoke test suite run.

### Performance Monitoring

If pattern lifecycle checks add >500ms overhead to /2l-mvp:
1. Profile with `time` command
2. Identify bottleneck (likely JSONL parsing)
3. Add early exit optimizations
4. Document in validation report

**Target:** <200ms per iteration for lifecycle monitoring

---

## Final Deliverables Summary

**Builder-1 Deliverables:**
- [ ] `lib/2l-pattern-lifecycle.py` with check_recurrence() (+175 lines)
- [ ] `lib/test-pattern-lifecycle-recurrence.sh` (unit tests)
- [ ] Builder-1 report documenting implementation

**Builder-2 Deliverables:**
- [ ] `commands/2l-mvp.md` with integration (+66 lines)
- [ ] Integration test results (both paths verified)
- [ ] Builder-2 report documenting integration

**Builder-3 Deliverables:**
- [ ] `.2L/plan-9/iteration-10/validation/validation-report.md`
- [ ] PATTERN-001 test results (verification + regression)
- [ ] Edge case test results
- [ ] Builder-3 report documenting validation

**Integration Deliverables:**
- [ ] All files merged to main working tree
- [ ] All tests passing
- [ ] PATTERN-001 in VERIFIED status (or documented regression)
- [ ] Events in .2L/events.jsonl

---

**Total Estimated Time:** 6-8 hours (sequential execution)

**Risk Level:** MEDIUM (complex logic, but well-specified)

**Success Definition:** PATTERN-001 reaches VERIFIED status after 3 iterations without manual intervention
