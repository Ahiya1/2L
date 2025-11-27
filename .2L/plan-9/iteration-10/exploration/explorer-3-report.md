# Explorer 3 Report: Complexity & Integration Points

## Executive Summary

Iteration 10 completes the self-improvement lifecycle by implementing **VERIFIED/REGRESSED transitions** and **end-to-end monitoring**. This is the capstone iteration that closes the learning loop.

**Critical Insight:** The lifecycle manager already supports VERIFIED/REGRESSED states (lines 30-36, 95-104 in lib/2l-pattern-lifecycle.py), BUT lacks the automatic recurrence detection logic. We must ADD a new method `check_recurrence()` and integrate it into /2l-mvp.

**Integration Complexity:** MEDIUM-HIGH
- Pattern recurrence detection requires similarity matching (reuse aggregator algorithm)
- Integration spans /2l-mvp at two points (reflection and lifecycle monitoring)
- Testing requires multi-iteration simulation with PATTERN-001

**Recommendation:** Use 3 builders with clear separation: Recurrence Detection (Builder-1) → Integration (Builder-2) → Testing & Validation (Builder-3)

---

## Discoveries

### Discovery Category 1: Existing Lifecycle Infrastructure

**Finding 1:** Pattern lifecycle manager ALREADY supports all 4 states
- lib/2l-pattern-lifecycle.py lines 30-36: VALID_STATUSES includes VERIFIED, REGRESSED
- Lines 95-104: Status update logic for VERIFIED/REGRESSED transitions
- Lines 92-93: `verification_start_iteration` metadata field exists
- **Gap:** No automatic recurrence checking - only manual status updates

**Finding 2:** Reflection aggregator's similarity algorithm is REUSABLE
- lib/2l-reflection-aggregator.py lines 79-100: calculate_similarity() using SequenceMatcher
- Default threshold 0.8 works for pattern aggregation
- **Opportunity:** Reuse this exact algorithm for recurrence detection
- **Rationale:** Consistency across system, proven effective

**Finding 3:** Pattern status transitions are WELL-TESTED
- lib/test-pattern-lifecycle.sh lines 72-85: Tests IMPLEMENTED→VERIFIED and VERIFIED→REGRESSED
- Manual transitions work correctly
- **Gap:** No test for automatic recurrence detection

### Discovery Category 2: Integration Points with Existing Systems

**Finding 1:** Reflection aggregator already detects pattern recurrence implicitly
- Lines 267-279: find_best_match() searches for similar existing patterns
- When creating reflection, it checks if issue matches existing pattern
- **Insight:** We can leverage this SAME logic in lifecycle manager

**Finding 2:** /2l-mvp has TWO natural insertion points for lifecycle monitoring
- After line 1199: First-pass validation PASS (after orchestrator_reflection)
- After line 1438: Healing validation PASS (after orchestrator_reflection)
- **Both locations:** After reflection creation, before iteration_complete event
- **Rationale:** Reflection contains latest issues - check if they match IMPLEMENTED patterns

**Finding 3:** Event logging infrastructure is mature
- lib/2l-event-logger.sh already sources in /2l-mvp
- Iteration 9 added reflection_created events
- **Need:** pattern_verified and pattern_regressed events

### Discovery Category 3: PATTERN-001 as Test Case

**Finding 1:** PATTERN-001 has complete lifecycle history
- .2L/global-learnings.yaml lines 6-43: Full metadata trail
- Status: REGRESSED (already cycled through IMPLEMENTED→VERIFIED→REGRESSED)
- verification_start_iteration: 2 (set when IMPLEMENTED)
- **Perfect test case:** Real pattern with known behavior

**Finding 2:** PATTERN-001 recurrence is detectable in iteration 9
- Root cause: "2l-improve generates visions without analyzing target codebase"
- Iteration 9 implemented reflection system (different issue)
- **Test scenario:** If we re-introduce exploration gap, should detect recurrence

**Finding 3:** Verification window is 3 iterations (hardcoded assumption)
- lib/2l-pattern-lifecycle.py line 92-93: verification_start_iteration = current + 1
- Assumption: Check next 3 iterations for recurrence
- **Need:** Implement 3-iteration window logic in check_recurrence()

---

## Patterns Identified

### Pattern Type: Recurrence Detection Pattern

**Description:** Standard pattern for checking if implemented pattern recurred in current iteration

**Use Case:** After reflection creation, check all IMPLEMENTED patterns for recurrence

**Example:**
```python
def check_recurrence(self, pattern_id: str, current_iteration: int) -> Dict:
    """Check if pattern recurred in current iteration.
    
    Returns:
        {
            'recurred': bool,
            'status_update': 'VERIFIED' | 'REGRESSED' | None,
            'reason': str
        }
    """
    pattern = self._find_pattern(pattern_id)
    
    # Check if in monitoring window
    start = pattern.get('verification_start_iteration')
    if not start:
        return {'recurred': False, 'status_update': None, 'reason': 'Not monitoring'}
    
    # Check if pattern recurred (similarity matching)
    current_learnings = self._load_iteration_learnings(current_iteration)
    for learning in current_learnings:
        similarity = self._calculate_similarity(
            learning.get('root_cause', ''),
            pattern.get('root_cause', '')
        )
        if similarity >= 0.8:
            # Recurrence detected
            return {
                'recurred': True,
                'status_update': 'REGRESSED',
                'reason': f'Matched learning {learning["learning_id"]} (similarity: {similarity:.2f})'
            }
    
    # Check if verification window passed
    if current_iteration >= start + 3:
        # 3 iterations passed without recurrence
        return {
            'recurred': False,
            'status_update': 'VERIFIED',
            'reason': f'No recurrence in {current_iteration - start} iterations'
        }
    
    # Still monitoring
    return {
        'recurred': False,
        'status_update': None,
        'reason': f'Monitoring iteration {current_iteration - start + 1} of 3'
    }
```

**Recommendation:** Implement this in lib/2l-pattern-lifecycle.py as new method

### Pattern Type: Multi-Iteration Lifecycle Integration Pattern

**Description:** Integration pattern for monitoring patterns across multiple iterations

**Use Case:** Track pattern status through verification window

**Example (Bash integration in /2l-mvp):**
```bash
# After reflection creation
echo "   🔍 Checking pattern lifecycle status..."

# Get all IMPLEMENTED patterns
implemented_patterns=$(python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
    patterns = [p['pattern_id'] for p in data.get('patterns', []) 
                if p.get('status') == 'IMPLEMENTED']
    print('\n'.join(patterns))
" 2>/dev/null || echo "")

if [ -n "$implemented_patterns" ]; then
    while IFS= read -r pattern_id; do
        # Check recurrence
        result=$(python3 ~/.claude/lib/2l-pattern-lifecycle.py check-recurrence \
            --pattern-id "$pattern_id" \
            --current-iteration "$global_iter" 2>&1)
        
        exit_code=$?
        
        if [ $exit_code -eq 2 ]; then
            # Pattern regressed
            echo "      ⚠️  $pattern_id REGRESSED"
            if [ "$EVENT_LOGGING_ENABLED" = true ]; then
                log_2l_event "pattern_regressed" \
                             "Pattern ${pattern_id} recurred in iteration ${global_iter}" \
                             "lifecycle" \
                             "orchestrator"
            fi
        elif [ $exit_code -eq 1 ]; then
            # Pattern verified
            echo "      ✅ $pattern_id VERIFIED"
            if [ "$EVENT_LOGGING_ENABLED" = true ]; then
                log_2l_event "pattern_verified" \
                             "Pattern ${pattern_id} verified after 3 iterations" \
                             "lifecycle" \
                             "orchestrator"
            fi
        else
            # Still monitoring
            echo "      📊 $pattern_id monitoring..."
        fi
    done <<< "$implemented_patterns"
else
    echo "      ℹ️  No patterns to monitor"
fi
```

**Recommendation:** Add this after reflection creation in /2l-mvp (lines 1199, 1438)

---

## Complexity Assessment

### High Complexity Areas

**Recurrence Detection Algorithm (lib/2l-pattern-lifecycle.py::check_recurrence)**
- Why complex: Multi-heuristic approach (similarity + window + status transitions)
- Estimated builder splits: 1 builder (no split needed, but ~3 hours)
- Algorithm complexity: O(n·m) where n=learnings, m=patterns
- Mitigation: Reuse reflection aggregator's similarity code, clear test cases

**Integration with Iteration Learnings (Reading current iteration data)**
- Why complex: Must load learnings from .2L/plan-N/iteration-M/learnings.yaml
- Edge cases: File may not exist, malformed YAML, empty learnings
- Estimated effort: ~1.5 hours
- Mitigation: Graceful error handling, use existing YAML loading patterns

### Medium Complexity Areas

**/2l-mvp Integration (Two insertion points)**
- Complexity: Duplicate logic at lines 1199 and 1438
- Why medium: Similar to reflection integration (iteration 9 pattern)
- Estimated effort: ~1.5 hours
- Mitigation: Create bash function to avoid duplication

**Verification Window Logic (3-iteration tracking)**
- Complexity: Must track iterations relative to verification_start_iteration
- Edge cases: Pattern implemented mid-plan, iteration counter reset
- Estimated effort: ~1 hour
- Mitigation: Use absolute iteration numbers (global_iter), not relative

### Low Complexity Areas

**CLI Interface Extension (add check-recurrence command)**
- Straightforward argparse extension
- Follows existing update/get-status/list pattern
- Estimated effort: 30 minutes

**Event Emission (pattern_verified, pattern_regressed)**
- Copy-paste from reflection events (iteration 9)
- Estimated effort: 15 minutes

**Testing with PATTERN-001**
- Existing pattern with known behavior
- Can simulate recurrence by re-adding same issue
- Estimated effort: 1 hour

---

## Technology Recommendations

### Primary Stack

- **Similarity Algorithm: difflib.SequenceMatcher (REUSE)** - Rationale: Already used in reflection aggregator, proven effective, 0.8 threshold works
- **Data Loading: yaml.safe_load (EXISTING)** - Rationale: Existing pattern, tested, secure
- **Exit Codes: 0=monitoring, 1=verified, 2=regressed** - Rationale: Bash-friendly, clear semantics
- **Window Size: 3 iterations (CONFIGURABLE)** - Rationale: Master plan specifies 3, but make it a constant for future tuning

### Supporting Libraries

**Standard Library Only (Consistent with Iteration 9):**
- yaml - Global learnings YAML read/write
- pathlib - Path manipulation
- datetime - Timestamps
- difflib - SequenceMatcher for similarity
- argparse - CLI argument parsing

**Code Reuse Opportunities:**
- lib/2l-reflection-aggregator.py::calculate_similarity() - Copy to lifecycle manager
- lib/2l-yaml-helpers.py::atomic_write_yaml() - Already used in lifecycle manager
- lib/2l-event-logger.sh::log_2l_event() - Already integrated in /2l-mvp

---

## Integration Points

### Internal Integrations

**Integration A: Lifecycle Manager ↔ Reflection Aggregator**
- Connection: Share similarity algorithm (calculate_similarity)
- Data flow: Lifecycle manager uses same 0.8 threshold
- Coupling: Code duplication (copy method), loose on runtime
- **Recommendation:** Copy calculate_similarity() to avoid circular import

**Integration B: Lifecycle Manager ↔ Iteration Learnings**
- Connection: check_recurrence() loads .2L/plan-N/iteration-M/learnings.yaml
- Data flow: Read current iteration's learnings for comparison
- Coupling: Tight on file path convention, loose on schema
- **Edge case:** Handle missing learnings.yaml gracefully (iteration may have failed)

**Integration C: /2l-mvp ↔ Lifecycle Manager**
- Connection: /2l-mvp calls check-recurrence after reflection creation
- Data flow: Iteration number → check_recurrence() → exit code → event emission
- Coupling: Loose (subprocess invocation), tight on exit code semantics
- **Critical:** Must happen AFTER reflection creation (learnings must be in JSONL)

**Integration D: Lifecycle Manager ↔ Global Learnings**
- Connection: Read IMPLEMENTED patterns, update to VERIFIED/REGRESSED
- Data flow: global-learnings.yaml read → status update → atomic write
- Coupling: Tight on YAML schema (already established in iteration 8)
- **Safety:** Atomic writes with backup (already implemented)

---

## Risks & Challenges

### Technical Risks

**Risk 1: False Positive Recurrence Detection**
- Impact: Pattern incorrectly marked REGRESSED
- Likelihood: MEDIUM (0.8 threshold may be too low for some patterns)
- Mitigation: 
  - Use same 0.8 threshold as aggregator (consistency)
  - Log similarity scores for debugging
  - Manual override: `--status VERIFIED` to correct false positives
  - Post-MVP: Tune threshold per pattern category

**Risk 2: Missing Learnings File (Iteration Failed)**
- Impact: check_recurrence() crashes or skips monitoring
- Likelihood: LOW (most iterations succeed, but edge case exists)
- Mitigation:
  - Try/except when loading learnings.yaml
  - If missing, return "monitoring" status (no change)
  - Log warning for debugging
  - Don't block iteration completion

**Risk 3: Verification Window Edge Cases**
- Impact: Pattern never verifies (iteration counter reset, plan changes)
- Likelihood: LOW (global_iter is monotonic within meditation space)
- Edge case: User deletes .2L directory, counter resets
- Mitigation:
  - Use absolute iteration numbers (global_iter)
  - Document assumption: global_iter monotonically increasing
  - Post-MVP: Add verification timestamp fallback (30 days)

### Complexity Risks

**Risk 4: Integration Point Duplication (Lines 1199, 1438)**
- Likelihood: MEDIUM (easy to forget one location)
- Impact: Lifecycle monitoring incomplete (only checks first-pass, not healing)
- Mitigation:
  - Create bash function: check_pattern_lifecycle()
  - Call from both locations
  - Add comment linking both sites
  - Include in integration test (verify both paths)

**Risk 5: Similarity Algorithm Inconsistency**
- Likelihood: LOW (if we copy code correctly)
- Impact: Recurrence detection differs from aggregation
- Mitigation:
  - Copy exact code from reflection aggregator
  - Add unit test comparing outputs
  - Document code provenance (comment: "Copied from 2l-reflection-aggregator.py")

---

## Recommendations for Planner

1. **Reuse Reflection Aggregator's Similarity Code**
   - Copy calculate_similarity() method to lifecycle manager
   - Use identical 0.8 threshold for consistency
   - Document provenance to enable future refactoring
   - Rationale: Proven algorithm, consistent behavior, no circular imports

2. **Create Bash Helper Function for Lifecycle Monitoring**
   - Name: check_pattern_lifecycle()
   - Location: Define in /2l-mvp before first usage
   - Call from both integration points (lines 1199, 1438)
   - Rationale: Avoid duplication, easier testing, consistent behavior

3. **Use Exit Codes for Status Communication**
   - 0: Still monitoring (no change)
   - 1: Pattern verified (update to VERIFIED)
   - 2: Pattern regressed (update to REGRESSED)
   - Rationale: Bash-friendly, clear semantics, easy to test

4. **Test End-to-End with PATTERN-001**
   - Scenario 1: Implement fix, verify after 3 iterations
   - Scenario 2: Re-introduce bug, detect regression
   - Scenario 3: Multiple patterns monitored simultaneously
   - Rationale: PATTERN-001 has complete history, realistic test case

5. **Make Verification Window Configurable (Post-MVP)**
   - Current: Hardcoded 3 iterations
   - Future: Class constant VERIFICATION_WINDOW = 3
   - Rationale: Some patterns may need longer monitoring (e.g., performance issues)

---

## Resource Map

### Critical Files/Directories

**Modified Files:**
- lib/2l-pattern-lifecycle.py (~150 lines added)
  - New method: check_recurrence() (~100 lines)
  - New method: _calculate_similarity() (copied, ~20 lines)
  - New method: _load_iteration_learnings() (~30 lines)
  - New CLI command: check-recurrence (argparse, ~15 lines)

- commands/2l-mvp.md (~60 lines added)
  - New function: check_pattern_lifecycle() (~40 lines)
  - Integration at line 1199 (~10 lines)
  - Integration at line 1438 (~10 lines)

**Test Files (New):**
- lib/test-pattern-lifecycle-recurrence.sh (~100 lines)
  - Test recurrence detection with synthetic data
  - Test verification after 3 iterations
  - Test PATTERN-001 end-to-end

**Data Files (Existing, Read/Write):**
- .2L/global-learnings.yaml - Pattern status updates
- .2L/plan-N/iteration-M/learnings.yaml - Recurrence detection source
- .2L/events.jsonl - pattern_verified, pattern_regressed events

### Key Dependencies

**From Iteration 8:**
- lib/2l-pattern-lifecycle.py - Base lifecycle manager
- Atomic YAML writes, backup logic
- VALID_STATUSES, VALID_TRANSITIONS state machine

**From Iteration 9:**
- lib/2l-reflection-aggregator.py::calculate_similarity() - Reuse algorithm
- Reflection creation integration pattern (lines 1199, 1438)
- Event logging infrastructure

**Standard Library:**
- yaml, pathlib, datetime, difflib, argparse

### Testing Infrastructure

**Unit Tests:**
- Test calculate_similarity() produces same results as aggregator
- Test check_recurrence() with synthetic patterns
- Test verification window logic (3 iterations)

**Integration Tests:**
- Test /2l-mvp integration (both code paths)
- Test PATTERN-001 verification flow
- Test PATTERN-001 regression detection
- Test multiple patterns monitored simultaneously

**End-to-End Test:**
- Simulate 5 iterations with PATTERN-001
- Iteration 1: Implement fix (IDENTIFIED → IMPLEMENTED)
- Iterations 2-4: No recurrence (monitoring)
- Iteration 5: Auto-verify (IMPLEMENTED → VERIFIED)
- Iteration 6: Re-introduce bug (VERIFIED → REGRESSED)

---

## Precise Modification Details

### File: lib/2l-pattern-lifecycle.py

#### Modification 1: Add check_recurrence() method (NEW, after line 149)

**Purpose:** Automatically check if pattern recurred in current iteration

**Code:**
```python
def check_recurrence(self, pattern_id: str, current_iteration: int) -> Dict:
    """Check if IMPLEMENTED pattern recurred in current iteration.
    
    This method:
    1. Loads current iteration's learnings
    2. Compares against pattern's root_cause using similarity matching
    3. If match found: Updates pattern to REGRESSED, returns exit code 2
    4. If 3 iterations passed without match: Updates to VERIFIED, returns exit code 1
    5. Otherwise: Still monitoring, returns exit code 0
    
    Args:
        pattern_id: Pattern identifier (e.g., 'PATTERN-001')
        current_iteration: Current global iteration number
    
    Returns:
        Dict with keys:
            'recurred': bool - Whether pattern recurred
            'status_update': str | None - New status (VERIFIED/REGRESSED) or None
            'reason': str - Human-readable explanation
            'exit_code': int - 0=monitoring, 1=verified, 2=regressed
    
    Raises:
        ValueError: If pattern not found or not in IMPLEMENTED status
    """
    # Load pattern
    data = self._load_learnings()
    pattern = self._find_pattern(data, pattern_id)
    
    if not pattern:
        raise ValueError(f"Pattern {pattern_id} not found")
    
    current_status = pattern.get('status', 'IDENTIFIED')
    
    # Only check IMPLEMENTED patterns
    if current_status != 'IMPLEMENTED':
        return {
            'recurred': False,
            'status_update': None,
            'reason': f'Pattern status is {current_status}, not IMPLEMENTED',
            'exit_code': 0
        }
    
    # Get verification window boundaries
    start_iteration = pattern.get('verification_start_iteration')
    if not start_iteration:
        return {
            'recurred': False,
            'status_update': None,
            'reason': 'No verification_start_iteration set',
            'exit_code': 0
        }
    
    # Load current iteration learnings
    try:
        current_learnings = self._load_iteration_learnings(current_iteration)
    except FileNotFoundError:
        # Learnings file doesn't exist (iteration may have failed)
        return {
            'recurred': False,
            'status_update': None,
            'reason': f'Learnings for iteration {current_iteration} not found',
            'exit_code': 0
        }
    
    # Check for recurrence (similarity matching)
    pattern_root_cause = pattern.get('root_cause', '')
    
    for learning in current_learnings:
        learning_root_cause = learning.get('root_cause', '')
        similarity = self._calculate_similarity(pattern_root_cause, learning_root_cause)
        
        if similarity >= 0.8:
            # Recurrence detected!
            metadata = {
                'plan_id': learning.get('plan_id'),
                'iteration': current_iteration,
                'recurrence_similarity': similarity,
                'matched_learning_id': learning.get('learning_id')
            }
            
            # Update pattern to REGRESSED
            self.update_status(pattern_id, 'REGRESSED', metadata)
            
            return {
                'recurred': True,
                'status_update': 'REGRESSED',
                'reason': f'Matched learning {learning.get("learning_id")} (similarity: {similarity:.2f})',
                'exit_code': 2
            }
    
    # No recurrence detected - check if verification window passed
    iterations_monitored = current_iteration - start_iteration + 1
    
    if iterations_monitored >= 3:
        # Verification window complete - pattern verified!
        metadata = {
            'iteration': current_iteration,
            'verification_iterations': iterations_monitored
        }
        
        # Update pattern to VERIFIED
        self.update_status(pattern_id, 'VERIFIED', metadata)
        
        return {
            'recurred': False,
            'status_update': 'VERIFIED',
            'reason': f'No recurrence in {iterations_monitored} iterations',
            'exit_code': 1
        }
    
    # Still within monitoring window
    return {
        'recurred': False,
        'status_update': None,
        'reason': f'Monitoring iteration {iterations_monitored} of 3',
        'exit_code': 0
    }
```

**Lines Added:** ~100

#### Modification 2: Add _calculate_similarity() helper method (NEW, after check_recurrence)

**Purpose:** Calculate similarity between two texts (copied from reflection aggregator)

**Code:**
```python
def _calculate_similarity(self, text1: str, text2: str) -> float:
    """Calculate similarity ratio between two strings.
    
    Uses Ratcliff-Obershelp algorithm (gestalt pattern matching) via difflib.
    
    NOTE: This is copied from lib/2l-reflection-aggregator.py::calculate_similarity()
    to avoid circular imports and ensure consistency in recurrence detection.
    
    Args:
        text1: First string
        text2: Second string
    
    Returns:
        Similarity ratio in [0.0, 1.0]
        - 0.0 = completely different
        - 0.8+ = very similar (threshold used)
        - 1.0 = identical
    """
    from difflib import SequenceMatcher
    
    # Normalize (lowercase for case-insensitive comparison)
    norm1 = text1.lower().strip()
    norm2 = text2.lower().strip()
    
    # Calculate similarity
    return SequenceMatcher(None, norm1, norm2).ratio()
```

**Lines Added:** ~25

#### Modification 3: Add _load_iteration_learnings() helper method (NEW, after _calculate_similarity)

**Purpose:** Load learnings from specific iteration

**Code:**
```python
def _load_iteration_learnings(self, iteration: int) -> List[Dict]:
    """Load learnings from specific iteration.
    
    Searches for learnings.yaml in .2L/plan-*/iteration-{iteration}/learnings.yaml
    
    Args:
        iteration: Global iteration number
    
    Returns:
        List of learning dictionaries
    
    Raises:
        FileNotFoundError: If no learnings file found for iteration
    """
    import glob
    
    # Find learnings file for this iteration
    # Pattern: .2L/plan-*/iteration-{iteration}/learnings.yaml
    pattern = f'.2L/plan-*/iteration-{iteration}/learnings.yaml'
    matches = glob.glob(pattern)
    
    if not matches:
        raise FileNotFoundError(f"No learnings file found for iteration {iteration}")
    
    # Use first match (should only be one)
    learnings_path = Path(matches[0])
    
    with open(learnings_path, 'r') as f:
        data = yaml.safe_load(f)
    
    return data.get('learnings', [])
```

**Lines Added:** ~30

#### Modification 4: Add check-recurrence CLI command (Line ~270, in main())

**Location:** In argparse subparsers section, after list command

**Code:**
```python
# check-recurrence command
recurrence_parser = subparsers.add_parser('check-recurrence', 
                                         help='Check if pattern recurred in current iteration')
recurrence_parser.add_argument('--pattern-id', required=True, help='Pattern ID')
recurrence_parser.add_argument('--current-iteration', type=int, required=True, 
                              help='Current global iteration number')
recurrence_parser.add_argument('--global-learnings', default='.2L/global-learnings.yaml',
                              help='Path to global learnings file')
```

**Location:** In command execution section (after list command handling, ~Line 349)

**Code:**
```python
elif args.command == 'check-recurrence':
    manager = PatternLifecycleManager(args.global_learnings)
    result = manager.check_recurrence(args.pattern_id, args.current_iteration)
    
    # Output result for bash scripting
    if result['status_update']:
        print(f"{result['status_update']}: {result['reason']}")
    else:
        print(f"MONITORING: {result['reason']}")
    
    # Exit with appropriate code (0=monitoring, 1=verified, 2=regressed)
    sys.exit(result['exit_code'])
```

**Lines Added:** ~20 total

**Total for lib/2l-pattern-lifecycle.py:** ~175 lines added

---

### File: commands/2l-mvp.md

#### Modification 1: Add check_pattern_lifecycle() bash function (NEW, before line 1199)

**Location:** In functions section, after orchestrator_reflection() function definition

**Purpose:** Reusable function for pattern lifecycle monitoring

**Code:**
```bash
check_pattern_lifecycle() {
    local global_iter="$1"
    
    echo "   🔍 Checking pattern lifecycle status..."
    
    # Get all IMPLEMENTED patterns
    local implemented_patterns
    implemented_patterns=$(python3 -c "
import yaml
import sys
try:
    with open('.2L/global-learnings.yaml', 'r') as f:
        data = yaml.safe_load(f)
        patterns = [p['pattern_id'] for p in data.get('patterns', []) 
                    if p.get('status') == 'IMPLEMENTED']
        print('\n'.join(patterns))
except Exception:
    sys.exit(0)  # Graceful failure
" 2>/dev/null || echo "")
    
    if [ -z "$implemented_patterns" ]; then
        echo "      ℹ️  No patterns to monitor"
        return 0
    fi
    
    # Check each IMPLEMENTED pattern
    while IFS= read -r pattern_id; do
        # Call lifecycle manager
        local result
        result=$(python3 "$HOME/.claude/lib/2l-pattern-lifecycle.py" check-recurrence \
            --pattern-id "$pattern_id" \
            --current-iteration "$global_iter" 2>&1)
        
        local exit_code=$?
        
        if [ $exit_code -eq 2 ]; then
            # Pattern regressed
            echo "      ⚠️  $pattern_id REGRESSED: $result"
            
            if [ "$EVENT_LOGGING_ENABLED" = true ]; then
                log_2l_event "pattern_regressed" \
                             "Pattern ${pattern_id} recurred in iteration ${global_iter}" \
                             "lifecycle" \
                             "orchestrator"
            fi
            
        elif [ $exit_code -eq 1 ]; then
            # Pattern verified
            echo "      ✅ $pattern_id VERIFIED: $result"
            
            if [ "$EVENT_LOGGING_ENABLED" = true ]; then
                log_2l_event "pattern_verified" \
                             "Pattern ${pattern_id} verified after 3 iterations" \
                             "lifecycle" \
                             "orchestrator"
            fi
            
        else
            # Still monitoring (exit_code = 0)
            echo "      📊 $pattern_id: $result"
        fi
        
    done <<< "$implemented_patterns"
}
```

**Lines Added:** ~60

#### Modification 2: Call check_pattern_lifecycle() after first-pass reflection (Line ~1199)

**Location:** After orchestrator_reflection() call, after reflection creation (iteration 9), before iteration_complete event

**Context (existing code at ~line 1199):**
```bash
# Orchestrator Reflection: Merge learnings before iteration complete
orchestrator_reflection(plan_id, global_iter, ITER_DIR)

# Generate iteration reflection (Added in iteration 9)
echo "   📝 Generating iteration reflection..."
# ... reflection creation code ...

# EVENT: iteration_complete
```

**NEW code to insert AFTER reflection creation, BEFORE iteration_complete:**
```bash
# Pattern Lifecycle: Check for verification/regression
check_pattern_lifecycle "$global_iter"

# EVENT: iteration_complete
```

**Lines Added:** ~3

#### Modification 3: Call check_pattern_lifecycle() after healing reflection (Line ~1438)

**Location:** After orchestrator_reflection() call in healing path, after reflection creation, before iteration_complete event

**Same pattern as Modification 2 - insert same 3 lines**

**Lines Added:** ~3

**Total for commands/2l-mvp.md:** ~66 lines added

---

### File: lib/test-pattern-lifecycle-recurrence.sh (NEW FILE)

**Purpose:** Test recurrence detection end-to-end

**Code structure:**
```bash
#!/usr/bin/env bash
# Test pattern recurrence detection

set -e

echo "Testing Pattern Lifecycle Recurrence Detection..."
echo

# Setup: Create test pattern in IMPLEMENTED status
# Test 1: No recurrence, still monitoring (iteration 1 of 3)
# Test 2: No recurrence, still monitoring (iteration 2 of 3)
# Test 3: No recurrence, auto-verify (iteration 3 of 3)
# Test 4: Recurrence detected, auto-regress
# Test 5: Multiple patterns monitored simultaneously
# Cleanup

echo "✅ All recurrence detection tests passed!"
```

**Lines:** ~150 (following test-pattern-lifecycle.sh structure)

---

## Integration Sequence (Builder Execution Order)

### Builder 1: Recurrence Detection Logic

**Deliverables:**
1. Implement check_recurrence() method in lib/2l-pattern-lifecycle.py
2. Implement _calculate_similarity() helper (copy from aggregator)
3. Implement _load_iteration_learnings() helper
4. Add check-recurrence CLI command
5. Unit tests for recurrence detection

**Dependencies:** None (extends existing lifecycle manager)

**Estimated Time:** 3-4 hours

**Acceptance Criteria:**
- check_recurrence() correctly detects recurrence (0.8 similarity)
- Verification window logic works (3 iterations)
- Exit codes correct (0=monitoring, 1=verified, 2=regressed)
- Graceful error handling (missing learnings file)

---

### Builder 2: Integration with /2l-mvp

**Deliverables:**
1. Create check_pattern_lifecycle() bash function
2. Integrate at line 1199 (first-pass completion)
3. Integrate at line 1438 (healing completion)
4. Add event emission (pattern_verified, pattern_regressed)
5. Integration tests (verify both code paths execute)

**Dependencies:** Builder 1 (requires check_recurrence() CLI command)

**Estimated Time:** 1.5-2 hours

**Acceptance Criteria:**
- check_pattern_lifecycle() called in both locations
- Events emitted correctly
- Non-blocking (failures don't abort iteration)
- Works with zero IMPLEMENTED patterns (graceful no-op)

---

### Builder 3: End-to-End Testing & Validation

**Deliverables:**
1. Test recurrence detection with PATTERN-001
2. Test verification after 3 iterations
3. Test regression detection
4. Test multiple patterns simultaneously
5. Create test-pattern-lifecycle-recurrence.sh
6. Update validation checklist

**Dependencies:** Builder 1, Builder 2

**Estimated Time:** 1.5-2 hours

**Acceptance Criteria:**
- PATTERN-001 verification flow works end-to-end
- PATTERN-001 regression detection works
- All edge cases tested (missing files, malformed YAML)
- Test script runs without errors

---

## Testing Strategy for Full Self-Improvement Cycle

### Test Scenario 1: PATTERN-001 Verification (No Recurrence)

**Setup:**
1. Set PATTERN-001 status to IMPLEMENTED
2. Set verification_start_iteration to 8 (current iteration)

**Execution:**
1. Simulate iteration 8: Create learnings.yaml with DIFFERENT issue
2. Run check-recurrence → Expected: exit code 0 (monitoring 1 of 3)
3. Simulate iteration 9: Create learnings.yaml with DIFFERENT issue
4. Run check-recurrence → Expected: exit code 0 (monitoring 2 of 3)
5. Simulate iteration 10: Create learnings.yaml with DIFFERENT issue
6. Run check-recurrence → Expected: exit code 1 (VERIFIED)

**Validation:**
- PATTERN-001 status updated to VERIFIED
- verified_at timestamp set
- verified_in_iteration = 10
- Event: pattern_verified emitted

---

### Test Scenario 2: PATTERN-001 Regression (Recurrence Detected)

**Setup:**
1. Set PATTERN-001 status to IMPLEMENTED
2. Set verification_start_iteration to 8

**Execution:**
1. Simulate iteration 8: Create learnings.yaml with SAME issue (high similarity)
2. Run check-recurrence → Expected: exit code 2 (REGRESSED)

**Validation:**
- PATTERN-001 status updated to REGRESSED
- regressed_at timestamp set
- regressed_in_iteration = 8
- matched_learning_id recorded
- Event: pattern_regressed emitted

---

### Test Scenario 3: Multiple Patterns Monitored Simultaneously

**Setup:**
1. Create PATTERN-002, PATTERN-003 in IMPLEMENTED status
2. Set verification_start_iteration for all 3 patterns

**Execution:**
1. Simulate iteration with learnings that:
   - Don't match PATTERN-001 (monitoring)
   - Match PATTERN-002 (regression)
   - Don't match PATTERN-003 (monitoring)

**Validation:**
- PATTERN-001: Still IMPLEMENTED (monitoring)
- PATTERN-002: Updated to REGRESSED
- PATTERN-003: Still IMPLEMENTED (monitoring)
- Only pattern_regressed event for PATTERN-002

---

### Test Scenario 4: Edge Cases

**Test 4A: Missing Learnings File**
- Iteration learnings.yaml doesn't exist
- Expected: Graceful no-op, continue monitoring

**Test 4B: Empty Learnings**
- Learnings.yaml exists but has no learnings
- Expected: No recurrence detected, continue monitoring

**Test 4C: Pattern Not IMPLEMENTED**
- Pattern status is IDENTIFIED or VERIFIED
- Expected: Skip monitoring (exit code 0, no status change)

**Test 4D: No verification_start_iteration**
- Pattern missing verification_start_iteration field
- Expected: Skip monitoring, log reason

---

## Questions for Planner

**Q1: Similarity threshold**
- Should we use exact same 0.8 as reflection aggregator?
- Or make it configurable per pattern?
- **Recommendation:** 0.8 for consistency, add configurability post-MVP

**Q2: Verification window**
- Is 3 iterations sufficient for all pattern types?
- Performance issues may need longer monitoring (5-7 iterations)
- **Recommendation:** Hardcode 3 for MVP, add VERIFICATION_WINDOW constant for future tuning

**Q3: Manual override needed**
- Should we add CLI command to force VERIFIED? (for false positives)
- Example: `python3 lib/2l-pattern-lifecycle.py override --pattern-id PATTERN-001 --status VERIFIED`
- **Recommendation:** Use existing `update` command for MVP, add `override` with confirmation post-MVP

**Q4: Notification on verification**
- Should we notify user when pattern verified? (not just silent status update)
- Options: Dashboard alert, console message, email (post-MVP)
- **Recommendation:** Event logging sufficient for MVP, add dashboard integration post-MVP

**Q5: Recurrence detection scope**
- Should we check VERIFIED patterns too? (not just IMPLEMENTED)
- VERIFIED patterns can regress (state machine allows VERIFIED→REGRESSED)
- **Recommendation:** YES - check both IMPLEMENTED and VERIFIED patterns (update bash function)

---

## File Modification Summary

### New Files (1)
1. lib/test-pattern-lifecycle-recurrence.sh (~150 lines)

### Modified Files (2)

1. **lib/2l-pattern-lifecycle.py**
   - Line ~150: Add check_recurrence() method (~100 lines)
   - Line ~250: Add _calculate_similarity() helper (~25 lines)
   - Line ~275: Add _load_iteration_learnings() helper (~30 lines)
   - Line ~270: Add check-recurrence CLI command (~20 lines)
   - Total: ~175 lines added

2. **commands/2l-mvp.md**
   - Before line 1199: Add check_pattern_lifecycle() function (~60 lines)
   - Line ~1199: Call check_pattern_lifecycle() (~3 lines)
   - Line ~1438: Call check_pattern_lifecycle() (~3 lines)
   - Total: ~66 lines added

**Total Code Volume:**
- New: ~150 lines (test file)
- Modified: ~241 lines
- Grand Total: ~391 lines across 3 files

---

## Critical Success Factors

1. **Similarity Algorithm Consistency**
   - Use exact copy of reflection aggregator's calculate_similarity()
   - Test that outputs match for same inputs
   - Document code provenance

2. **Integration Point Completeness**
   - Both locations in /2l-mvp must call lifecycle check
   - Test both first-pass and healing paths
   - Non-blocking error handling

3. **PATTERN-001 End-to-End Validation**
   - Test complete verification flow (3 iterations)
   - Test regression detection
   - Use as acceptance test

4. **Event Logging**
   - pattern_verified events for dashboard
   - pattern_regressed events for alerts
   - Test event emission in both paths

---

**Report Complete**
**Generated:** 2025-11-27T05:15:00Z
**Explorer:** Explorer-3 (Complexity & Integration Points)
**Focus:** Precise modifications for VERIFIED/REGRESSED transitions, integration with reflection aggregator, testing strategy for PATTERN-001
**Status:** READY FOR PLANNING
