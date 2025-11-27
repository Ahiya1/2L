# Integration Plan - Round 1

**Created:** 2025-11-27T14:30:00Z
**Iteration:** plan-9/iteration-10
**Total builders to integrate:** 3

---

## Executive Summary

Integration of pattern lifecycle verification and regression detection system. Builder-1 delivered fully functional recurrence detection logic (241 lines). Builder-2 delivered orchestrator integration code (114 lines). Builder-3 identified a CRITICAL integration issue: Builder-2's bash function calls are inside Python code blocks and will not execute.

Key insights:
- Builder-1's core functionality is complete and tested (100% CLI tests passing)
- Builder-2's integration code is well-structured but placed in the wrong execution context
- Builder-3 discovered the context mismatch and provided detailed fix recommendations
- All 34 functional tests pass; the issue is purely about code placement
- The integration requires a surgical fix to Builder-2's work before deployment

---

## Builders to Integrate

### Primary Builders
- **Builder-1:** Recurrence Detection Logic - Status: COMPLETE
- **Builder-2:** /2l-mvp Integration - Status: COMPLETE (with integration issue)
- **Builder-3:** Testing & Validation - Status: COMPLETE

### Sub-Builders (if applicable)
None - All builders completed without splitting

**Total outputs to integrate:** 3

---

## Integration Zones

### Zone 1: Core Lifecycle Logic (Direct Merge)

**Builders involved:** Builder-1

**Conflict type:** None - Independent feature

**Risk level:** LOW

**Description:**
Builder-1 extended `lib/2l-pattern-lifecycle.py` with recurrence detection methods. This is a clean extension to existing code with no conflicts. The implementation includes:
- `check_recurrence()` method (153 lines)
- `_calculate_similarity()` helper (30 lines) - copied from aggregator
- `_load_iteration_learnings()` helper (48 lines)
- CLI subcommand `check-recurrence` (40 lines total)
- Two comprehensive test suites (650+ lines)

**Files affected:**
- `lib/2l-pattern-lifecycle.py` - +241 lines (extends existing file)
- `lib/test-pattern-lifecycle-recurrence.sh` - NEW file (+450 lines)
- `lib/test-pattern-lifecycle-recurrence-simple.sh` - NEW file (+200 lines)

**Integration strategy:**
1. Verify Builder-1's changes don't conflict with existing code
2. Verify imports are correct (glob, SequenceMatcher added)
3. Run existing test suite: `bash lib/test-pattern-lifecycle.sh`
4. Run new test suite: `bash lib/test-pattern-lifecycle-recurrence-simple.sh`
5. Verify CLI command works: `python3 lib/2l-pattern-lifecycle.py check-recurrence --help`
6. Direct merge - no conflicts expected

**Expected outcome:**
- All existing tests continue to pass (verified by Builder-3)
- New CLI command available and functional
- Exit codes: 0=monitoring, 1=verified, 2=regressed
- YAML updates atomic with backup

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (5 minutes)

---

### Zone 2: Orchestrator Integration Fix (Critical Issue)

**Builders involved:** Builder-2

**Conflict type:** Code context mismatch - Bash calls in Python blocks

**Risk level:** HIGH (blocks functionality)

**Description:**
Builder-2 created excellent bash integration code BUT placed the function calls inside Python code blocks where they cannot execute. Specifically:

**The Problem:**
- Bash function `check_pattern_lifecycle()` defined at line 1693 (inside bash code block)
- Function called at line 1205 (inside Python `execute_iteration()` function)
- Function called at line 1447 (inside Python `execute_iteration()` function)
- Python interpreter will attempt to execute bash syntax and fail

**What Builder-2 Got Right:**
- Function logic is correct and well-structured
- Event emission code is properly conditional
- Error handling is graceful and non-blocking
- Both integration points are at the correct workflow locations (after reflection creation)

**What Needs Fixing:**
The bash function calls must be converted to Python subprocess calls or the execution context must be changed.

**Files affected:**
- `commands/2l-mvp.md` - Lines 1205, 1447, 1693-1788

**Integration strategy:**

**OPTION A: Python Subprocess Calls (RECOMMENDED)**

Replace bash function calls with Python subprocess execution:

```python
# At lines 1205 and 1447, replace:
# check_pattern_lifecycle "$global_iter"

# With this Python code:
import subprocess
import os

print("   🔍 Checking pattern lifecycle status...")

# Query for IMPLEMENTED patterns
try:
    query_result = subprocess.run([
        "python3", "-c",
        """
import yaml
import sys
try:
    with open('.2L/global-learnings.yaml', 'r') as f:
        data = yaml.safe_load(f)
        patterns = [p['pattern_id'] for p in data.get('patterns', [])
                    if p.get('status') == 'IMPLEMENTED']
        for pid in patterns:
            print(pid)
except Exception:
    sys.exit(0)
"""
    ], capture_output=True, text=True, timeout=5)

    implemented_patterns = [p.strip() for p in query_result.stdout.strip().split('\n') if p.strip()]

    if not implemented_patterns:
        print("      ℹ️  No IMPLEMENTED patterns to monitor")
    else:
        # Check each pattern
        for pattern_id in implemented_patterns:
            check_result = subprocess.run([
                "python3",
                os.path.expanduser("~/.claude/lib/2l-pattern-lifecycle.py"),
                "check-recurrence",
                "--pattern-id", pattern_id,
                "--current-iteration", str(global_iter)
            ], capture_output=True, text=True, timeout=5)

            exit_code = check_result.returncode
            output = check_result.stdout.strip()

            if exit_code == 2:
                # Pattern regressed
                print(f"      ⚠️  {pattern_id} REGRESSED: {output}")
                # Emit event if logging enabled (event emission code already in place)
                if hasattr(state, 'event_logging_enabled') and state.event_logging_enabled:
                    emit_event("pattern_regressed",
                              f"Pattern {pattern_id} recurred in iteration {global_iter}",
                              "lifecycle", "orchestrator")
            elif exit_code == 1:
                # Pattern verified
                print(f"      ✅ {pattern_id} VERIFIED: {output}")
                if hasattr(state, 'event_logging_enabled') and state.event_logging_enabled:
                    emit_event("pattern_verified",
                              f"Pattern {pattern_id} verified after 3 iterations",
                              "lifecycle", "orchestrator")
            else:
                # Still monitoring
                print(f"      📊 {pattern_id}: {output}")

except Exception as e:
    print(f"      ⚠️  Pattern lifecycle check error: {e}")
    # Non-blocking - continue iteration
```

**OPTION B: Move to Bash Context (Alternative)**

Move the orchestrator_reflection calls and lifecycle checks to a bash wrapper outside the Python function. This would require significant restructuring of the workflow.

**Recommendation: Use Option A** - Minimal changes, preserves Builder-2's logic, follows Python conventions.

**Expected outcome:**
- Pattern lifecycle monitoring executes during /2l-mvp runs
- Events are emitted to .2L/events.jsonl
- Both code paths (first-pass and healing) execute the check
- Non-blocking execution (errors don't stop iteration)

**Assigned to:** Integrator-1 (priority fix)

**Estimated complexity:** MEDIUM (30-45 minutes)

---

### Zone 3: Validation Artifacts (Documentation)

**Builders involved:** Builder-3

**Conflict type:** None - Documentation only

**Risk level:** NONE

**Description:**
Builder-3 created comprehensive validation documentation and test scripts. These are pure documentation and testing artifacts with no code conflicts.

**Files affected:**
- `.2L/plan-9/iteration-10/validation/validation-report.md` - NEW file (+700 lines)
- `/tmp/test-e2e-pattern-001.sh` - Temporary test script
- `/tmp/test-e2e-pattern-001-regression-v2.sh` - Temporary test script
- `/tmp/test-similarity.sh` - Temporary test script
- `/tmp/test-orchestrator-integration.sh` - Temporary test script

**Integration strategy:**
1. Move validation report to iteration directory (already in place)
2. Archive temporary test scripts for future reference (optional)
3. Review validation report for any additional action items
4. No code integration needed - documentation only

**Expected outcome:**
- Validation report available for reference
- Test procedures documented
- Integration issue clearly documented with fixes
- Success criteria checklist available

**Assigned to:** Integrator-1 (quick review)

**Estimated complexity:** LOW (5 minutes)

---

## Independent Features (Direct Merge)

None - All builder outputs interact in the orchestrator integration zone.

---

## Parallel Execution Groups

### Group 1 (Sequential - all depend on each other)
- **Integrator-1:**
  - Zone 1 (Core lifecycle logic - direct merge)
  - Zone 2 (Orchestrator integration fix - critical)
  - Zone 3 (Validation artifacts - review)

**No parallelization possible** - Single integrator handles all zones sequentially.

---

## Integration Order

**Recommended sequence:**

1. **Zone 1: Core Lifecycle Logic**
   - Direct merge of Builder-1's code
   - Run test suites to verify no regression
   - Verify CLI command available
   - **Duration:** 5 minutes

2. **Zone 2: Orchestrator Integration Fix (CRITICAL)**
   - Implement Option A (Python subprocess calls)
   - Replace bash calls at lines 1205 and 1447
   - Test with PATTERN-001 in IMPLEMENTED status
   - Verify events emitted to .2L/events.jsonl
   - Run end-to-end /2l-mvp iteration
   - **Duration:** 30-45 minutes

3. **Zone 3: Validation Review**
   - Review validation report
   - Confirm all test scenarios documented
   - Check for any additional action items
   - **Duration:** 5 minutes

4. **Final Integration Verification**
   - Run complete /2l-mvp iteration
   - Verify pattern lifecycle monitoring executes
   - Check events in .2L/events.jsonl
   - Confirm PATTERN-001 verification flow works
   - **Duration:** 10 minutes

**Total Integration Time:** ~60 minutes

---

## Shared Resources Strategy

### Shared Types

**Pattern Structure (in global-learnings.yaml):**
```yaml
pattern_id: string          # Unique identifier
status: string              # IDENTIFIED|IMPLEMENTED|VERIFIED|REGRESSED
category: string            # functionality|completeness|speed
root_cause: string          # Issue description
verification_start_iteration: int  # When monitoring began
verified_at: string         # ISO timestamp (if VERIFIED)
verified_in_iteration: int  # Iteration number (if VERIFIED)
regressed_at: string        # ISO timestamp (if REGRESSED)
regressed_in_iteration: int # Iteration number (if REGRESSED)
recurrence_similarity: float # Similarity score (if REGRESSED)
matched_learning_id: string  # Learning that triggered regression
```

**Exit Codes (from Builder-1's CLI):**
- `0` - Pattern still monitoring (no status change)
- `1` - Pattern transitioned to VERIFIED
- `2` - Pattern transitioned to REGRESSED
- Other - Error occurred (logged but non-blocking)

**Event Schema:**
```json
{
  "timestamp": "2025-11-27T14:30:00Z",
  "event_type": "pattern_verified|pattern_regressed",
  "phase": "lifecycle",
  "agent_id": "orchestrator",
  "data": "Pattern PATTERN-001 verified in iteration 11"
}
```

### Shared Utilities

**Similarity Algorithm:**
- Located in: `lib/2l-pattern-lifecycle.py` (lines ~307-336)
- Exact copy from: `lib/2l-reflection-aggregator.py` (lines 79-100)
- Threshold: 0.8 (80% similarity)
- Algorithm: Ratcliff-Obershelp (via difflib.SequenceMatcher)
- No conflicts - Builder-1 copied correctly

### Configuration Files

**Global Learnings:**
- File: `.2L/global-learnings.yaml`
- Modified by: Builder-1's `update_status()` method (atomic writes)
- Read by: All components
- No concurrent modification issues - atomic writes with backup

**Event Log:**
- File: `.2L/events.jsonl`
- Appended by: Builder-1's `_emit_event()` method
- Appended by: Orchestrator (after fix)
- Append-only - no conflicts

---

## Expected Challenges

### Challenge 1: Orchestrator Integration Context

**Impact:** Pattern lifecycle monitoring won't execute without fix

**Mitigation:**
- Detailed fix documented in Zone 2
- Option A (subprocess calls) is straightforward
- Test with PATTERN-001 before declaring complete
- Fallback: If subprocess approach fails, implement Option B (bash wrapper)

**Responsible:** Integrator-1

### Challenge 2: Event Emission in Python Context

**Impact:** Events might not emit correctly after subprocess fix

**Mitigation:**
- Use subprocess to call event logger
- Or implement Python-native event emission (append to JSONL)
- Test event emission before completing integration
- Verify .2L/events.jsonl contains correct schema

**Responsible:** Integrator-1

### Challenge 3: Import Statement Placement

**Impact:** subprocess import might cause issues if placed mid-function

**Mitigation:**
- Place imports at top of execute_iteration function
- Or use inline imports if needed
- Test that Python code still executes after modification

**Responsible:** Integrator-1

---

## Success Criteria for This Integration Round

- [ ] Zone 1: All existing tests pass (lib/test-pattern-lifecycle.sh)
- [ ] Zone 1: New recurrence tests pass (lib/test-pattern-lifecycle-recurrence-simple.sh)
- [ ] Zone 1: CLI command works (`check-recurrence --help`)
- [ ] Zone 2: Orchestrator integration fixed (subprocess calls in place)
- [ ] Zone 2: Pattern lifecycle monitoring executes during /2l-mvp run
- [ ] Zone 2: Events emitted to .2L/events.jsonl (pattern_verified or pattern_regressed)
- [ ] Zone 2: Both code paths tested (first-pass and healing)
- [ ] Zone 3: Validation report reviewed and archived
- [ ] Final: Complete /2l-mvp iteration with PATTERN-001
- [ ] Final: PATTERN-001 verification flow works (IMPLEMENTED → 3 iterations → VERIFIED)
- [ ] Final: No performance degradation (<500ms overhead per iteration)
- [ ] Final: TypeScript compiles with no errors (N/A - Python project)
- [ ] Final: Consistent patterns across integrated code
- [ ] Final: No conflicts in shared files (YAML, JSONL)
- [ ] Final: All builder functionality preserved

---

## Notes for Integrators

**Important context:**
- This is the final iteration of Plan-9 (self-improvement loop completion)
- PATTERN-001 is a real pattern with complete history (iterations 8-10)
- The integration issue (Zone 2) is critical but fixable
- All core functionality is tested and working via CLI
- Focus integration effort on fixing the orchestrator integration

**Watch out for:**
- Don't break existing test suites (regression risk)
- Ensure atomic YAML writes are preserved (Builder-1's update_status)
- Verify event schema matches specification
- Test with real PATTERN-001, not just test data
- Check both code paths (first-pass and healing) execute the lifecycle check

**Patterns to maintain:**
- Reference `patterns.md` for all conventions
- Ensure error handling is consistent (non-blocking)
- Keep naming conventions aligned (snake_case for Python)
- Follow existing event emission patterns
- Preserve similarity algorithm consistency (0.8 threshold)

---

## Detailed Zone 2 Fix Implementation

### Step-by-Step Fix for Orchestrator Integration

**File:** `commands/2l-mvp.md`

**Location 1: Line ~1205 (First-Pass Path)**

**Before (Builder-2's code - won't execute):**
```python
# Generate iteration reflection (added in iteration 9)
echo "   📝 Generating iteration reflection..."
python3 "$HOME/.claude/lib/2l-reflection-generator.py" \
    --project-root "." \
    --iteration "$global_iter" \
    --output ".2L/plan-${plan_id}/iteration-${global_iter}/REFLECTION.md" \
    > /dev/null 2>&1 || true

# NEW: Pattern Lifecycle - Check for verification/regression
check_pattern_lifecycle "$global_iter"  # <-- BASH CALL IN PYTHON CONTEXT!

# EVENT: iteration_complete
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "iteration_complete" "..." "building" "orchestrator"
fi
```

**After (Fixed - Python subprocess calls):**
```python
# Generate iteration reflection (added in iteration 9)
# NOTE: This call might also need subprocess fix depending on context
# For now, focusing on pattern lifecycle monitoring

# NEW: Pattern Lifecycle - Check for verification/regression
print("   🔍 Checking pattern lifecycle status...")

try:
    import subprocess
    import os

    # Query for IMPLEMENTED patterns
    query_result = subprocess.run([
        "python3", "-c",
        """
import yaml
import sys
try:
    with open('.2L/global-learnings.yaml', 'r') as f:
        data = yaml.safe_load(f)
        patterns = [p['pattern_id'] for p in data.get('patterns', [])
                    if p.get('status') == 'IMPLEMENTED']
        for pid in patterns:
            print(pid)
except Exception:
    sys.exit(0)
"""
    ], capture_output=True, text=True, timeout=5)

    implemented_patterns = [p.strip() for p in query_result.stdout.strip().split('\n') if p.strip()]

    if not implemented_patterns:
        print("      ℹ️  No IMPLEMENTED patterns to monitor")
    else:
        # Check each pattern for recurrence/verification
        for pattern_id in implemented_patterns:
            check_result = subprocess.run([
                "python3",
                os.path.expanduser("~/.claude/lib/2l-pattern-lifecycle.py"),
                "check-recurrence",
                "--pattern-id", pattern_id,
                "--current-iteration", str(global_iter)
            ], capture_output=True, text=True, timeout=5)

            exit_code = check_result.returncode
            output = check_result.stdout.strip()

            if exit_code == 2:
                # Pattern regressed
                print(f"      ⚠️  {pattern_id} REGRESSED: {output}")
                # Emit pattern_regressed event
                subprocess.run([
                    "bash", "-c",
                    f"""
                    if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
                        source "$HOME/.claude/lib/2l-event-logger.sh"
                        log_2l_event "pattern_regressed" \
                                     "Pattern {pattern_id} recurred in iteration {global_iter}" \
                                     "lifecycle" \
                                     "orchestrator"
                    fi
                    """
                ], timeout=2)

            elif exit_code == 1:
                # Pattern verified
                print(f"      ✅ {pattern_id} VERIFIED: {output}")
                # Emit pattern_verified event
                subprocess.run([
                    "bash", "-c",
                    f"""
                    if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
                        source "$HOME/.claude/lib/2l-event-logger.sh"
                        log_2l_event "pattern_verified" \
                                     "Pattern {pattern_id} verified after 3 iterations" \
                                     "lifecycle" \
                                     "orchestrator"
                    fi
                    """
                ], timeout=2)
            else:
                # Still monitoring
                print(f"      📊 {pattern_id}: {output}")

except Exception as e:
    print(f"      ⚠️  Pattern lifecycle check error: {e}")
    # Non-blocking - continue iteration
    pass
```

**Location 2: Line ~1447 (Healing Path)**

Apply the same fix as Location 1. The code should be identical at both integration points.

**Bash Function Removal:**

The bash function at lines 1693-1788 can be removed or commented out since we're using Python subprocess calls instead. However, keeping it doesn't hurt and serves as documentation of the intended logic.

### Testing the Fix

**Test 1: Verify Subprocess Calls Work**
```bash
# Run in Python interpreter
python3 << 'EOF'
import subprocess
result = subprocess.run(["python3", "-c", "print('test')"], capture_output=True, text=True)
print(f"Exit code: {result.returncode}")
print(f"Output: {result.stdout}")
EOF
# Expected: Exit code 0, Output: test
```

**Test 2: Verify Pattern Query Works**
```bash
# Ensure global-learnings.yaml exists with IMPLEMENTED pattern
python3 << 'EOF'
import subprocess
result = subprocess.run([
    "python3", "-c",
    """
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
    patterns = [p['pattern_id'] for p in data.get('patterns', [])
                if p.get('status') == 'IMPLEMENTED']
    for pid in patterns:
        print(pid)
"""
], capture_output=True, text=True)
print(result.stdout)
EOF
# Expected: List of IMPLEMENTED pattern IDs
```

**Test 3: Verify CLI Call Works**
```bash
python3 << 'EOF'
import subprocess
import os
result = subprocess.run([
    "python3",
    os.path.expanduser("~/.claude/lib/2l-pattern-lifecycle.py"),
    "check-recurrence",
    "--help"
], capture_output=True, text=True)
print(result.stdout)
EOF
# Expected: Help text for check-recurrence command
```

**Test 4: End-to-End Integration Test**
```bash
# Run full /2l-mvp iteration with PATTERN-001 in IMPLEMENTED status
# Verify lifecycle check executes
# Check .2L/events.jsonl for events
```

---

## Next Steps

1. Integrator-1 executes Zone 1 (5 minutes)
2. Integrator-1 implements Zone 2 fix (30-45 minutes)
3. Integrator-1 reviews Zone 3 (5 minutes)
4. Integrator-1 runs final integration tests (10 minutes)
5. Proceed to ivalidator (validation of integrated system)

---

**Integration Planner:** 2l-iplanner
**Plan created:** 2025-11-27T14:30:00Z
**Round:** 1
**Critical Issue:** Zone 2 (orchestrator integration context mismatch)
**Estimated Integration Time:** 60 minutes
**Risk Level:** MEDIUM (critical fix required but well-documented)
**Success Probability:** HIGH (all components tested individually, fix is straightforward)
