# Code Patterns & Conventions

## File Structure

```
2L/
├── .2L/
│   ├── global-learnings.yaml          # Pattern database (read/write)
│   ├── global-learnings.jsonl         # Learning stream (append-only)
│   ├── events.jsonl                   # Event log (append-only)
│   ├── config.yaml                    # Global iteration counter
│   └── plan-9/
│       └── iteration-10/
│           ├── exploration/           # Explorer reports
│           ├── plan/                  # This document
│           ├── building/              # Builder reports
│           └── validation/            # Test results
├── commands/
│   └── 2l-mvp.md                      # Orchestrator (integration points)
└── lib/
    ├── 2l-pattern-lifecycle.py        # Lifecycle manager (extend this)
    ├── 2l-reflection-aggregator.py    # Reference for similarity algorithm
    ├── 2l-event-logger.sh             # Event emission library
    ├── test-pattern-lifecycle.sh      # Existing tests (don't break)
    └── test-pattern-lifecycle-recurrence.sh  # New tests (create this)
```

## Naming Conventions

- **Python Files:** `2l-pattern-lifecycle.py` (lowercase, hyphen-separated)
- **Bash Functions:** `check_pattern_lifecycle()` (snake_case)
- **Python Methods:** `check_recurrence()`, `_calculate_similarity()` (snake_case, private prefixed with _)
- **Python Classes:** `PatternLifecycleManager`, `RecurrenceDetector` (PascalCase)
- **Constants:** `VERIFICATION_WINDOW_SIZE`, `RECURRENCE_THRESHOLD` (SCREAMING_SNAKE_CASE)
- **Variables:** `pattern_id`, `current_iteration`, `verification_start` (snake_case)
- **CLI Commands:** `check-recurrence`, `update`, `get-status` (hyphen-separated)

## Pattern Lifecycle State Machine

### State Transitions Diagram

```
IDENTIFIED
    |
    | (implement fix)
    v
IMPLEMENTED ────────────────┐
    |                       |
    | (3 iterations,        | (recurrence detected)
    |  no recurrence)       |
    v                       v
VERIFIED ────────> REGRESSED
    |                       |
    | (recurrence)          | (fix again)
    └───────────────────────┘
```

### YAML Schema for Pattern Status

```yaml
patterns:
  - pattern_id: PATTERN-001
    name: "Missing exploration phase"
    status: IMPLEMENTED  # Current state
    category: functionality
    root_cause: "2l-improve generates visions without analyzing target codebase"

    # Status history metadata
    discovered_at: '2025-11-27T01:00:00Z'
    implemented_at: '2025-11-27T03:43:47Z'
    implemented_in_plan: plan-9
    implemented_in_iteration: 8

    # Verification tracking (NEW in iteration 10)
    verification_start_iteration: 9  # Start monitoring from iteration 9
    verified_at: '2025-11-27T10:30:00Z'  # Populated when VERIFIED
    verified_in_iteration: 11  # Which iteration verified it

    # Regression tracking (NEW in iteration 10)
    regressed_at: '2025-11-27T11:00:00Z'  # Populated when REGRESSED
    regressed_in_iteration: 12  # Which iteration detected regression
    recurrence_similarity: 0.87  # Similarity score of matching learning
    matched_learning_id: "plan-9-iter-12-learning-003"  # Learning that triggered regression
```

## Recurrence Detection Patterns

### Pattern 1: Similarity Calculation (Core Algorithm)

**When to use:** Compare two text strings for similarity (root causes, descriptions)

**Code example:**

```python
from difflib import SequenceMatcher

def _calculate_similarity(self, text1: str, text2: str) -> float:
    """
    Calculate similarity ratio between two strings using Ratcliff-Obershelp algorithm.

    This is copied from lib/2l-reflection-aggregator.py::calculate_similarity()
    to avoid circular imports and ensure consistency in recurrence detection.

    Args:
        text1: First text string (e.g., pattern root_cause)
        text2: Second text string (e.g., learning root_cause)

    Returns:
        Similarity ratio in range [0.0, 1.0]
        - 0.0 = completely different
        - 0.8+ = very similar (threshold for recurrence)
        - 1.0 = identical

    Example:
        >>> self._calculate_similarity(
        ...     "Missing exploration phase",
        ...     "Exploration phase missing"
        ... )
        0.923  # High similarity, would trigger recurrence detection
    """
    # Normalize: lowercase for case-insensitive comparison
    norm1 = text1.lower().strip()
    norm2 = text2.lower().strip()

    # Calculate similarity using SequenceMatcher
    return SequenceMatcher(None, norm1, norm2).ratio()
```

**Key points:**
- Always normalize to lowercase before comparison
- SequenceMatcher implements Ratcliff-Obershelp gestalt pattern matching
- Threshold 0.8 chosen empirically (80% similarity = strong match)
- This exact algorithm is used in reflection aggregator (proven effective)

---

### Pattern 2: Load Iteration Learnings (JSONL Parsing)

**When to use:** Get learnings from a specific iteration for recurrence checking

**Code example:**

```python
import glob
import yaml
from pathlib import Path

def _load_iteration_learnings(self, iteration: int) -> List[Dict]:
    """
    Load learnings from specific iteration's learnings.yaml file.

    Searches for learnings.yaml in .2L/plan-*/iteration-{iteration}/learnings.yaml

    Args:
        iteration: Global iteration number (e.g., 10)

    Returns:
        List of learning dictionaries, each with:
        - learning_id: Unique identifier
        - root_cause: Description of issue
        - category: functionality/completeness/speed
        - iteration: When learning was created

    Raises:
        FileNotFoundError: If no learnings file found for iteration

    Example:
        >>> learnings = self._load_iteration_learnings(10)
        >>> learnings[0]
        {
            'learning_id': 'plan-9-iter-10-learning-001',
            'root_cause': 'Missing error handling in recurrence detection',
            'category': 'completeness',
            'iteration': 10
        }
    """
    # Find learnings file for this iteration
    # Pattern: .2L/plan-*/iteration-{iteration}/learnings.yaml
    pattern = f'.2L/plan-*/iteration-{iteration}/learnings.yaml'
    matches = glob.glob(pattern)

    if not matches:
        raise FileNotFoundError(
            f"No learnings file found for iteration {iteration}. "
            f"Searched: {pattern}"
        )

    # Use first match (should only be one per iteration)
    learnings_path = Path(matches[0])

    with open(learnings_path, 'r') as f:
        data = yaml.safe_load(f)

    # Return learnings list (empty list if key missing)
    return data.get('learnings', [])
```

**Key points:**
- Use glob to find learnings across different plans
- Graceful handling if file doesn't exist
- Return empty list if 'learnings' key missing (not an error)
- yaml.safe_load prevents code execution attacks

---

### Pattern 3: Check Recurrence (Main Logic)

**When to use:** Determine if IMPLEMENTED pattern recurred in current iteration

**Code example:**

```python
def check_recurrence(self, pattern_id: str, current_iteration: int) -> Dict:
    """
    Check if IMPLEMENTED pattern recurred in current iteration.

    This method implements the core verification/regression logic:
    1. Load current iteration's learnings
    2. Compare against pattern's root_cause using similarity matching
    3. If match found (>= 0.8 similarity): Mark as REGRESSED
    4. If 3 iterations passed without match: Mark as VERIFIED
    5. Otherwise: Still monitoring

    Args:
        pattern_id: Pattern identifier (e.g., 'PATTERN-001')
        current_iteration: Current global iteration number

    Returns:
        Dict with keys:
            'recurred': bool - Whether pattern recurred this iteration
            'status_update': str | None - New status (VERIFIED/REGRESSED) or None
            'reason': str - Human-readable explanation
            'exit_code': int - 0=monitoring, 1=verified, 2=regressed

    Raises:
        ValueError: If pattern not found or not in IMPLEMENTED status

    Example (No recurrence, still monitoring):
        >>> result = manager.check_recurrence('PATTERN-001', 9)
        >>> result
        {
            'recurred': False,
            'status_update': None,
            'reason': 'Monitoring iteration 1 of 3',
            'exit_code': 0
        }

    Example (Recurrence detected):
        >>> result = manager.check_recurrence('PATTERN-001', 9)
        >>> result
        {
            'recurred': True,
            'status_update': 'REGRESSED',
            'reason': 'Matched learning plan-9-iter-9-learning-002 (similarity: 0.87)',
            'exit_code': 2
        }

    Example (Verified after 3 iterations):
        >>> result = manager.check_recurrence('PATTERN-001', 12)
        >>> result
        {
            'recurred': False,
            'status_update': 'VERIFIED',
            'reason': 'No recurrence in 3 iterations',
            'exit_code': 1
        }
    """
    # Load pattern data
    data = self._load_learnings()
    pattern = self._find_pattern(data, pattern_id)

    if not pattern:
        raise ValueError(f"Pattern {pattern_id} not found in global-learnings.yaml")

    current_status = pattern.get('status', 'IDENTIFIED')

    # Only check IMPLEMENTED patterns (VERIFIED/REGRESSED/IDENTIFIED skip monitoring)
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
            'reason': 'No verification_start_iteration set (pattern may predate iteration 8)',
            'exit_code': 0
        }

    # Load current iteration learnings
    try:
        current_learnings = self._load_iteration_learnings(current_iteration)
    except FileNotFoundError:
        # Learnings file doesn't exist (iteration may have failed validation)
        return {
            'recurred': False,
            'status_update': None,
            'reason': f'Learnings for iteration {current_iteration} not found',
            'exit_code': 0
        }

    # Check for recurrence (similarity matching)
    pattern_root_cause = pattern.get('root_cause', '')
    pattern_category = pattern.get('category', '')

    for learning in current_learnings:
        learning_root_cause = learning.get('root_cause', '')
        learning_category = learning.get('category', '')

        # Calculate similarity
        similarity = self._calculate_similarity(pattern_root_cause, learning_root_cause)

        # Check if recurrence (high similarity + same category)
        if similarity >= 0.8 and pattern_category == learning_category:
            # Recurrence detected! Mark as REGRESSED
            metadata = {
                'plan_id': learning.get('plan_id'),
                'iteration': current_iteration,
                'recurrence_similarity': similarity,
                'matched_learning_id': learning.get('learning_id')
            }

            # Update pattern status to REGRESSED
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
        # Verification window complete (3 iterations: start, start+1, start+2)
        # Pattern verified!
        metadata = {
            'iteration': current_iteration,
            'verification_iterations': iterations_monitored
        }

        # Update pattern status to VERIFIED
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

**Key points:**
- Return dict with consistent structure for easy bash parsing
- Exit codes: 0=monitoring, 1=verified, 2=regressed (bash-friendly)
- Category matching prevents false positives (similar but different issues)
- Window calculation: `iterations_monitored = current - start + 1`
- Graceful handling of missing files, malformed data

---

## CLI Integration Patterns

### Pattern 4: CLI Subcommand Definition

**When to use:** Add new subcommand to lifecycle manager CLI

**Code example:**

```python
# In lib/2l-pattern-lifecycle.py main() function

import argparse
import sys

def main():
    parser = argparse.ArgumentParser(
        description='Pattern Lifecycle Manager - Track pattern status transitions',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # ... existing commands (update, get-status, list) ...

    # NEW: check-recurrence command
    recurrence_parser = subparsers.add_parser(
        'check-recurrence',
        help='Check if pattern recurred in current iteration',
        description='Monitors IMPLEMENTED patterns for recurrence and handles verification.'
    )
    recurrence_parser.add_argument(
        '--pattern-id',
        required=True,
        help='Pattern identifier (e.g., PATTERN-001)'
    )
    recurrence_parser.add_argument(
        '--current-iteration',
        type=int,
        required=True,
        help='Current global iteration number'
    )
    recurrence_parser.add_argument(
        '--global-learnings',
        default='.2L/global-learnings.yaml',
        help='Path to global learnings file (default: .2L/global-learnings.yaml)'
    )

    # Parse arguments
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # ... existing command handling (update, get-status, list) ...

    # NEW: Handle check-recurrence command
    elif args.command == 'check-recurrence':
        manager = PatternLifecycleManager(args.global_learnings)

        try:
            result = manager.check_recurrence(args.pattern_id, args.current_iteration)

            # Output result for bash scripting
            if result['status_update']:
                print(f"{result['status_update']}: {result['reason']}")
            else:
                print(f"MONITORING: {result['reason']}")

            # Exit with appropriate code (0=monitoring, 1=verified, 2=regressed)
            sys.exit(result['exit_code'])

        except ValueError as e:
            print(f"ERROR: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == '__main__':
    main()
```

**Key points:**
- Use subparsers for clean command structure
- Exit codes communicate status to bash
- Print to stdout for success, stderr for errors
- Help text explains usage clearly

---

## Bash Integration Patterns

### Pattern 5: Lifecycle Monitoring Function

**When to use:** Check pattern lifecycle after reflection creation in /2l-mvp

**Code example:**

```bash
# In commands/2l-mvp.md (define before first usage, around line 1190)

check_pattern_lifecycle() {
    local global_iter="$1"

    echo "   🔍 Checking pattern lifecycle status..."

    # Get all IMPLEMENTED patterns from global-learnings.yaml
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
except Exception as e:
    # Graceful failure - don't block iteration
    sys.exit(0)
" 2>/dev/null || echo "")

    # Handle case: no patterns to monitor
    if [ -z "$implemented_patterns" ]; then
        echo "      ℹ️  No patterns to monitor"
        return 0
    fi

    # Check each IMPLEMENTED pattern for recurrence/verification
    while IFS= read -r pattern_id; do
        # Call lifecycle manager
        local result
        result=$(python3 "$HOME/.claude/lib/2l-pattern-lifecycle.py" check-recurrence \
            --pattern-id "$pattern_id" \
            --current-iteration "$global_iter" 2>&1)

        local exit_code=$?

        # Handle exit codes
        if [ $exit_code -eq 2 ]; then
            # Pattern regressed (exit code 2)
            echo "      ⚠️  $pattern_id REGRESSED: $result"

            # Emit event if logging enabled
            if [ "$EVENT_LOGGING_ENABLED" = true ]; then
                log_2l_event "pattern_regressed" \
                             "Pattern ${pattern_id} recurred in iteration ${global_iter}" \
                             "lifecycle" \
                             "orchestrator"
            fi

        elif [ $exit_code -eq 1 ]; then
            # Pattern verified (exit code 1)
            echo "      ✅ $pattern_id VERIFIED: $result"

            # Emit event if logging enabled
            if [ "$EVENT_LOGGING_ENABLED" = true ]; then
                log_2l_event "pattern_verified" \
                             "Pattern ${pattern_id} verified after 3 iterations" \
                             "lifecycle" \
                             "orchestrator"
            fi

        else
            # Still monitoring (exit code 0)
            echo "      📊 $pattern_id: $result"
        fi

    done <<< "$implemented_patterns"
}
```

**Key points:**
- Graceful failure if global-learnings.yaml missing
- Handle empty pattern list (no-op, don't error)
- Exit codes distinguish monitoring/verified/regressed
- Event emission conditional on EVENT_LOGGING_ENABLED
- Non-blocking (errors logged but don't stop iteration)

---

### Pattern 6: Integration Call Sites

**When to use:** Call lifecycle monitoring after reflection creation

**Code example:**

```bash
# In commands/2l-mvp.md, FIRST CALL SITE (after line ~1199)

# After first-pass validation PASS, orchestrator_reflection runs:
orchestrator_reflection(plan_id, global_iter, ITER_DIR)

# Generate iteration reflection (added in iteration 9)
echo "   📝 Generating iteration reflection..."
python3 "$HOME/.claude/lib/2l-reflection-generator.py" \
    --project-root "." \
    --iteration "$global_iter" \
    --output ".2L/plan-${plan_id}/iteration-${global_iter}/REFLECTION.md" \
    > /dev/null 2>&1 || true

# NEW: Pattern Lifecycle - Check for verification/regression
check_pattern_lifecycle "$global_iter"

# EVENT: iteration_complete
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "iteration_complete" "..." "building" "orchestrator"
fi
```

```bash
# In commands/2l-mvp.md, SECOND CALL SITE (after line ~1438)

# After healing validation PASS, orchestrator_reflection runs:
orchestrator_reflection(plan_id, global_iter, ITER_DIR)

# Generate iteration reflection (added in iteration 9)
echo "   📝 Generating iteration reflection..."
python3 "$HOME/.claude/lib/2l-reflection-generator.py" \
    --project-root "." \
    --iteration "$global_iter" \
    --output ".2L/plan-${plan_id}/iteration-${global_iter}/REFLECTION.md" \
    > /dev/null 2>&1 || true

# NEW: Pattern Lifecycle - Check for verification/regression
check_pattern_lifecycle "$global_iter"

# EVENT: iteration_complete
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "iteration_complete" "..." "healing" "orchestrator"
fi
```

**Key points:**
- Exact same call in both locations (first-pass and healing)
- Runs AFTER reflection creation (learnings must exist)
- Runs BEFORE iteration_complete event
- Non-blocking (function has error handling)

---

## Event Emission Patterns

### Pattern 7: Python Event Emission

**When to use:** Emit events from Python code (lifecycle manager)

**Code example:**

```python
import json
from datetime import datetime
from pathlib import Path

def _emit_event(self, event_type: str, data: str, phase: str = "monitoring"):
    """
    Emit event to .2L/events.jsonl (graceful degradation).

    This method appends a JSON event to the events log. If the operation fails
    for any reason (permissions, disk full, etc.), it fails silently to avoid
    blocking critical operations.

    Args:
        event_type: Type of event ('pattern_verified', 'pattern_regressed')
        data: Event data/message (human-readable description)
        phase: Orchestration phase (default: 'monitoring')

    Example:
        >>> self._emit_event(
        ...     'pattern_verified',
        ...     'Pattern PATTERN-001 verified in iteration 11 (no recurrence)'
        ... )
        # Writes to .2L/events.jsonl:
        # {"timestamp": "2025-11-27T10:30:00Z", "event_type": "pattern_verified", ...}
    """
    try:
        # Get event file path relative to global-learnings.yaml
        event_file = self.learnings_path.parent / 'events.jsonl'

        # Build event object
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'phase': phase,
            'agent_id': 'pattern-lifecycle',
            'data': data
        }

        # Append to JSONL file (atomic at line level)
        with open(event_file, 'a') as f:
            f.write(json.dumps(event) + '\n')

    except Exception:
        # Silent failure - don't block on event emission errors
        # Events are nice-to-have, not critical
        pass
```

**Usage in update_status:**

```python
def update_status(self, pattern_id: str, new_status: str, metadata: Dict = None):
    # ... existing status update logic ...

    # Emit events for lifecycle transitions
    if new_status == 'VERIFIED':
        self._emit_event(
            'pattern_verified',
            f"Pattern {pattern_id} verified in iteration {metadata.get('iteration')}"
        )
    elif new_status == 'REGRESSED':
        self._emit_event(
            'pattern_regressed',
            f"Pattern {pattern_id} regressed in iteration {metadata.get('iteration')}"
        )
```

**Key points:**
- Fire-and-forget pattern (silent failure)
- JSONL append is atomic at line level
- Events are supplementary (don't block on errors)
- Timestamp in ISO 8601 format

---

### Pattern 8: Bash Event Emission

**When to use:** Emit events from bash scripts (orchestrators)

**Code example:**

```bash
# In commands/2l-mvp.md (after sourcing event logger)

# Source event logging library
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    source "$HOME/.claude/lib/2l-event-logger.sh"
    EVENT_LOGGING_ENABLED=true
else
    EVENT_LOGGING_ENABLED=false
fi

# Later, in check_pattern_lifecycle function:
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "pattern_verified" \
                 "Pattern ${pattern_id} verified after 3 iterations" \
                 "lifecycle" \
                 "orchestrator"
fi
```

**Event logging function signature:**

```bash
log_2l_event "event_type" "data" "phase" "agent_id"
#            ^required     ^required  ^optional  ^optional
```

**Key points:**
- Check EVENT_LOGGING_ENABLED before calling
- Fails silently if library not available
- Arguments: event_type, data (required), phase, agent_id (optional)

---

## Testing Patterns

### Pattern 9: Unit Test Structure

**When to use:** Test individual components in isolation

**Code example:**

```bash
#!/usr/bin/env bash
# lib/test-pattern-lifecycle-recurrence.sh

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'  # No color

echo "Testing Pattern Lifecycle Recurrence Detection..."
echo

# Setup: Create temporary test environment
ORIGINAL_DIR="$PWD"
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

mkdir -p .2L/plan-9/iteration-9
mkdir -p .2L/plan-9/iteration-10
mkdir -p .2L/plan-9/iteration-11

# Create test global-learnings.yaml
cat > .2L/global-learnings.yaml << 'EOF'
patterns:
  - pattern_id: TEST-PATTERN-001
    name: "Test pattern for recurrence"
    status: IMPLEMENTED
    category: functionality
    root_cause: "Missing error handling"
    implemented_in_iteration: 8
    verification_start_iteration: 9
EOF

# Test 1: Recurrence detection (exact match)
echo "Test 1: Recurrence detection with exact match"

# Create iteration 9 learnings with MATCHING root_cause
cat > .2L/plan-9/iteration-9/learnings.yaml << 'EOF'
learnings:
  - learning_id: plan-9-iter-9-learning-001
    root_cause: "Missing error handling"
    category: functionality
    iteration: 9
EOF

# Run check-recurrence
result=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-PATTERN-001 \
    --current-iteration 9 \
    --global-learnings .2L/global-learnings.yaml 2>&1) || exit_code=$?

# Assert: exit code 2 (REGRESSED)
if [ "$exit_code" -ne 2 ]; then
    echo -e "${RED}❌ FAILED: Expected exit code 2 (REGRESSED), got $exit_code${NC}"
    exit 1
fi

# Assert: pattern status updated to REGRESSED
status=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" get-status \
    --pattern-id TEST-PATTERN-001 \
    --global-learnings .2L/global-learnings.yaml | grep "Status:")

if ! echo "$status" | grep -q "REGRESSED"; then
    echo -e "${RED}❌ FAILED: Pattern status not updated to REGRESSED${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Test 1 passed${NC}"
echo

# Test 2: Verification after 3 iterations
echo "Test 2: Verification after 3 clean iterations"

# Reset pattern to IMPLEMENTED
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" update \
    --pattern-id TEST-PATTERN-001 \
    --status IMPLEMENTED \
    --iteration 8 \
    --global-learnings .2L/global-learnings.yaml

# Create iterations 9, 10, 11 learnings with DIFFERENT issues
cat > .2L/plan-9/iteration-9/learnings.yaml << 'EOF'
learnings:
  - learning_id: plan-9-iter-9-learning-001
    root_cause: "Performance issue in sorting"
    category: speed
    iteration: 9
EOF

cat > .2L/plan-9/iteration-10/learnings.yaml << 'EOF'
learnings:
  - learning_id: plan-9-iter-10-learning-001
    root_cause: "UI alignment off by 2px"
    category: completeness
    iteration: 10
EOF

cat > .2L/plan-9/iteration-11/learnings.yaml << 'EOF'
learnings:
  - learning_id: plan-9-iter-11-learning-001
    root_cause: "Documentation typo"
    category: completeness
    iteration: 11
EOF

# Check recurrence at iteration 12 (after 3-iteration window)
exit_code=0
result=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-PATTERN-001 \
    --current-iteration 12 \
    --global-learnings .2L/global-learnings.yaml 2>&1) || exit_code=$?

# Assert: exit code 1 (VERIFIED)
if [ "$exit_code" -ne 1 ]; then
    echo -e "${RED}❌ FAILED: Expected exit code 1 (VERIFIED), got $exit_code${NC}"
    exit 1
fi

# Assert: pattern status updated to VERIFIED
status=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" get-status \
    --pattern-id TEST-PATTERN-001 \
    --global-learnings .2L/global-learnings.yaml | grep "Status:")

if ! echo "$status" | grep -q "VERIFIED"; then
    echo -e "${RED}❌ FAILED: Pattern status not updated to VERIFIED${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Test 2 passed${NC}"
echo

# Cleanup
cd "$ORIGINAL_DIR"
rm -rf "$TEST_DIR"

echo -e "${GREEN}✅ All recurrence detection tests passed!${NC}"
```

**Key points:**
- Use temporary directory for isolation
- Create minimal test data (not full production YAML)
- Test exit codes and side effects (YAML updates)
- Clean up after tests
- Color-coded output for readability

---

### Pattern 10: End-to-End Integration Test

**When to use:** Test full workflow with PATTERN-001

**Code example:**

```bash
#!/usr/bin/env bash
# End-to-end test with PATTERN-001

echo "End-to-End Test: PATTERN-001 Verification Flow"
echo

# Pre-condition: PATTERN-001 exists in IMPLEMENTED status
status=$(python3 ~/.claude/lib/2l-pattern-lifecycle.py get-status \
    --pattern-id PATTERN-001 2>&1)

if ! echo "$status" | grep -q "IMPLEMENTED"; then
    echo "Setting up PATTERN-001 as IMPLEMENTED..."
    python3 ~/.claude/lib/2l-pattern-lifecycle.py update \
        --pattern-id PATTERN-001 \
        --status IMPLEMENTED \
        --iteration 8
fi

# Simulate 3 iterations without recurrence
for iter in 9 10 11; do
    echo "Simulating iteration $iter..."

    # Check recurrence (should return exit code 0 = monitoring)
    python3 ~/.claude/lib/2l-pattern-lifecycle.py check-recurrence \
        --pattern-id PATTERN-001 \
        --current-iteration $iter || exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo "ERROR: Unexpected exit code $exit_code at iteration $iter"
        exit 1
    fi

    echo "  Iteration $iter: Monitoring..."
done

# Iteration 12: Should auto-verify
echo "Simulating iteration 12 (verification)..."
python3 ~/.claude/lib/2l-pattern-lifecycle.py check-recurrence \
    --pattern-id PATTERN-001 \
    --current-iteration 12 || exit_code=$?

if [ $exit_code -ne 1 ]; then
    echo "ERROR: Expected exit code 1 (VERIFIED), got $exit_code"
    exit 1
fi

# Verify status updated
status=$(python3 ~/.claude/lib/2l-pattern-lifecycle.py get-status \
    --pattern-id PATTERN-001 | grep "Status:")

if echo "$status" | grep -q "VERIFIED"; then
    echo "✅ PATTERN-001 successfully verified after 3 iterations!"
else
    echo "ERROR: PATTERN-001 status not updated to VERIFIED"
    exit 1
fi
```

**Key points:**
- Test realistic scenario with PATTERN-001
- Simulate multiple iterations in sequence
- Verify both exit codes and database updates
- Clear success/failure messages

---

## Import Order Convention

```python
# Standard library imports (alphabetical)
import argparse
import glob
import json
import sys
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path

# Third-party imports (alphabetical)
import yaml  # PyYAML

# Local imports (if any)
# (None for this iteration - lifecycle manager is standalone)
```

## Code Quality Standards

**Docstrings:**
- All public methods have docstrings with Args, Returns, Raises, Example
- Follow Google style docstrings

**Error Messages:**
- Include context: pattern ID, iteration number, file path
- Example: `f"Pattern {pattern_id} not found in global-learnings.yaml"`

**Variable Naming:**
- Use full words: `verification_start_iteration` not `ver_start`
- Boolean variables: `is_recurred`, `has_verification_start`
- Iteration numbers: `current_iteration`, not `iter` (reserved keyword)

**Exit Codes:**
- 0: Success or monitoring (no status change)
- 1: Success with status change to VERIFIED
- 2: Success with status change to REGRESSED
- Non-zero (other): Error

**File Operations:**
- Always use `with open()` context managers
- Use `yaml.safe_load()` not `yaml.load()` (security)
- Handle FileNotFoundError explicitly
- Close files automatically (context managers)

## Performance Patterns

**Early Exit on Match:**

```python
# Good: Stop searching after first recurrence
for learning in current_learnings:
    similarity = self._calculate_similarity(pattern_root_cause, learning_root_cause)
    if similarity >= 0.8:
        return True, learning  # Found match, stop searching

# Bad: Check all learnings even after finding match
matches = [learning for learning in current_learnings
           if self._calculate_similarity(...) >= 0.8]
```

**Filter JSONL by Iteration:**

```python
# Good: Only parse current iteration
for line in f:
    entry = json.loads(line)
    if entry.get('iteration') == current_iteration:
        learnings.append(entry)

# Bad: Load all learnings then filter
all_learnings = [json.loads(line) for line in f]
current_learnings = [l for l in all_learnings if l['iteration'] == current_iteration]
```

## Security Patterns

**Safe YAML Loading:**

```python
# Good: Prevents arbitrary code execution
with open(yaml_path, 'r') as f:
    data = yaml.safe_load(f)

# Bad: Allows code execution via YAML tags
with open(yaml_path, 'r') as f:
    data = yaml.load(f)  # NEVER USE THIS
```

**Input Sanitization:**

```python
# Pattern IDs validated (alphanumeric + hyphens)
import re

def _validate_pattern_id(pattern_id: str) -> bool:
    """Validate pattern ID format."""
    return bool(re.match(r'^[A-Z]+-\d+$', pattern_id))
```

---

**This patterns document provides complete, copy-pasteable code for all major operations in iteration 10. Builders should follow these patterns exactly to ensure consistency with the existing 2L codebase.**
