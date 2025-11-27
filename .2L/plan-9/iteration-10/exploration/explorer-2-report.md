# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

Iteration 10 extends the pattern lifecycle system with verification and regression detection capabilities. This report analyzes technology patterns for implementing VERIFIED and REGRESSED states, monitoring windows across 3 iterations, recurrence detection algorithms, and event emission patterns.

**Key Findings:**
- Verification window tracking requires temporal state in pattern YAML (verification_start_iteration field already exists)
- Recurrence detection should reuse SequenceMatcher from reflection-aggregator.py (0.8 similarity threshold)
- State transitions need new monitoring loop in /2l-mvp after each iteration
- Event emission follows existing fire-and-forget pattern with graceful degradation
- Testing requires temporal mocking (simulating 3-iteration windows)

---

## Discoveries

### State Machine Extension Patterns

**Current Implementation (from lib/2l-pattern-lifecycle.py):**

```python
VALID_STATUSES = ['IDENTIFIED', 'IMPLEMENTED', 'VERIFIED', 'REGRESSED']

VALID_TRANSITIONS = {
    'IDENTIFIED': ['IMPLEMENTED'],
    'IMPLEMENTED': ['VERIFIED', 'REGRESSED'],
    'VERIFIED': ['REGRESSED'],
    'REGRESSED': ['IMPLEMENTED']
}
```

**Existing Status Update Logic:**

```python
# Lines 88-93: When transitioning to IMPLEMENTED
if new_status == 'IMPLEMENTED':
    pattern['implemented_at'] = datetime.now().isoformat()
    if metadata:
        pattern['implemented_in_plan'] = metadata.get('plan_id')
        pattern['implemented_in_iteration'] = metadata.get('iteration')
        # Start monitoring for verification (3 iterations from now)
        pattern['verification_start_iteration'] = metadata.get('iteration', 0) + 1
```

**Pattern Discovery:** `verification_start_iteration` field ALREADY EXISTS in implementation. The monitoring window is defined as:
- Start: iteration when pattern marked IMPLEMENTED + 1
- End: verification_start_iteration + 3
- Duration: 3 iterations

**New Transitions to Implement:**

```python
# IMPLEMENTED → VERIFIED transition
elif new_status == 'VERIFIED':
    pattern['verified_at'] = datetime.now().isoformat()
    if metadata:
        pattern['verified_in_iteration'] = metadata.get('iteration')
        # Clear monitoring metadata (no longer needed)
        pattern['verification_window_complete'] = True

# IMPLEMENTED → REGRESSED transition  
elif new_status == 'REGRESSED':
    pattern['regressed_at'] = datetime.now().isoformat()
    if metadata:
        pattern['regressed_in_plan'] = metadata.get('plan_id')
        pattern['regressed_in_iteration'] = metadata.get('iteration')
        pattern['recurrence_details'] = metadata.get('recurrence_details')
    # Reset verification tracking for re-implementation
    pattern.pop('verification_start_iteration', None)
    pattern.pop('verification_window_complete', None)

# VERIFIED → REGRESSED transition (rare but possible)
# Same as IMPLEMENTED → REGRESSED above
```

**State Validation Pattern (already exists):**

```python
def _validate_transition(self, current: str, new: str):
    """Validate state machine transition."""
    if new not in self.VALID_TRANSITIONS.get(current, []):
        valid = self.VALID_TRANSITIONS.get(current, [])
        raise ValueError(
            f"Invalid transition: {current} → {new}. "
            f"Valid transitions from {current}: {valid}"
        )
```

**No changes needed** - existing validation handles new states.

---

### Monitoring Window Data Structures

**Current Pattern Schema (from global-learnings.yaml):**

```yaml
patterns:
  - pattern_id: PATTERN-001
    name: "Missing system exploration before vision generation"
    status: IMPLEMENTED
    implemented_at: '2025-11-27T03:43:47.813170'
    implemented_in_plan: plan-9
    implemented_in_iteration: 8
    verification_start_iteration: 9  # Start monitoring from iteration 9
    # ... other fields
```

**Verification Window Calculation:**

```python
def is_in_verification_window(pattern: Dict, current_iteration: int) -> bool:
    """Check if pattern is in 3-iteration verification window."""
    if pattern.get('status') != 'IMPLEMENTED':
        return False
    
    verification_start = pattern.get('verification_start_iteration')
    if verification_start is None:
        return False
    
    # Window is [start, start+3)
    # Example: start=9 → monitor iterations 9, 10, 11 → verify at 12
    window_end = verification_start + 3
    return verification_start <= current_iteration < window_end

def should_auto_verify(pattern: Dict, current_iteration: int) -> bool:
    """Check if pattern window has completed without recurrence."""
    if pattern.get('status') != 'IMPLEMENTED':
        return False
    
    verification_start = pattern.get('verification_start_iteration')
    if verification_start is None:
        return False
    
    # Verify after window ends (iteration >= start+3)
    window_end = verification_start + 3
    return current_iteration >= window_end
```

**Tracking Structure Recommendation:**

```python
# Add to PatternLifecycleManager class
class VerificationTracker:
    """Track patterns in verification window."""
    
    def __init__(self, global_learnings_path: str):
        self.learnings_path = Path(global_learnings_path)
    
    def get_patterns_to_monitor(self, current_iteration: int) -> List[Dict]:
        """Get all IMPLEMENTED patterns in verification window."""
        data = self._load_learnings()
        patterns_to_check = []
        
        for pattern in data.get('patterns', []):
            if is_in_verification_window(pattern, current_iteration):
                patterns_to_check.append(pattern)
        
        return patterns_to_check
    
    def get_patterns_to_verify(self, current_iteration: int) -> List[Dict]:
        """Get patterns whose window completed without recurrence."""
        data = self._load_learnings()
        patterns_to_verify = []
        
        for pattern in data.get('patterns', []):
            if should_auto_verify(pattern, current_iteration):
                patterns_to_verify.append(pattern)
        
        return patterns_to_verify
```

**Data Flow:**

```
/2l-mvp iteration completes
    ↓
Create REFLECTION.md (existing)
    ↓
Aggregate reflection to JSONL (existing)
    ↓
NEW: Check verification windows
    ↓
For each IMPLEMENTED pattern:
    - If in window (iterations 9-11) → Check for recurrence
    - If window complete (iteration 12+) → Auto-verify
    ↓
Update pattern status (VERIFIED or REGRESSED)
    ↓
Emit event (pattern_verified or pattern_regressed)
```

---

### Recurrence Detection Algorithms

**Existing Similarity Algorithm (from 2l-reflection-aggregator.py):**

```python
from difflib import SequenceMatcher

def calculate_similarity(self, text1: str, text2: str) -> float:
    """Calculate similarity ratio using Ratcliff-Obershelp algorithm."""
    norm1 = text1.lower().strip()
    norm2 = text2.lower().strip()
    return SequenceMatcher(None, norm1, norm2).ratio()
```

**Threshold:** 0.8 (80% similarity) - proven in aggregator testing

**Recurrence Detection Pattern:**

```python
class RecurrenceDetector:
    """Detect if pattern recurred in current iteration."""
    
    RECURRENCE_THRESHOLD = 0.8  # Same as aggregation threshold
    
    def __init__(self, global_learnings_path: str, similarity_threshold: float = 0.8):
        self.learnings_path = Path(global_learnings_path)
        self.threshold = similarity_threshold
    
    def check_recurrence(self, pattern: Dict, current_iteration: int) -> Tuple[bool, Optional[Dict]]:
        """
        Check if pattern recurred in current iteration's reflection.
        
        Args:
            pattern: Pattern dict with 'root_cause' field
            current_iteration: Current global iteration number
        
        Returns:
            Tuple of (recurred: bool, matching_learning: Optional[Dict])
        """
        # Read current iteration's learnings from JSONL
        current_learnings = self._get_iteration_learnings(current_iteration)
        
        pattern_root_cause = pattern.get('root_cause', '')
        
        for learning in current_learnings:
            learning_root_cause = learning.get('root_cause', '')
            
            # Calculate similarity
            similarity = self._calculate_similarity(
                pattern_root_cause,
                learning_root_cause
            )
            
            # Check threshold
            if similarity >= self.threshold:
                # Also check category match for precision
                if pattern.get('category') == learning.get('category'):
                    return True, {
                        'learning_id': learning.get('learning_id'),
                        'similarity': similarity,
                        'iteration': current_iteration,
                        'root_cause': learning_root_cause
                    }
        
        return False, None
    
    def _get_iteration_learnings(self, iteration: int) -> List[Dict]:
        """Read learnings from JSONL for specific iteration."""
        jsonl_path = self.learnings_path.parent / 'global-learnings.jsonl'
        
        if not jsonl_path.exists():
            return []
        
        learnings = []
        with open(jsonl_path) as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    if entry.get('iteration') == iteration:
                        learnings.append(entry)
                except json.JSONDecodeError:
                    continue
        
        return learnings
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Reuse SequenceMatcher algorithm."""
        from difflib import SequenceMatcher
        norm1 = text1.lower().strip()
        norm2 = text2.lower().strip()
        return SequenceMatcher(None, norm1, norm2).ratio()
```

**False Positive Mitigation:**

1. **Category matching:** Only compare patterns within same category (functionality/completeness/speed)
2. **High threshold:** 0.8 similarity requires substantial overlap
3. **Manual override option:** CLI flag `--force-verify` to bypass auto-detection

**Integration with PatternLifecycleManager:**

```python
# Add to lib/2l-pattern-lifecycle.py

def monitor_verification_windows(self, current_iteration: int) -> Dict[str, List[str]]:
    """
    Check all patterns in verification window for recurrence.
    
    Returns:
        Dict with 'verified', 'regressed', 'still_monitoring' pattern lists
    """
    results = {
        'verified': [],
        'regressed': [],
        'still_monitoring': []
    }
    
    data = self._load_learnings()
    detector = RecurrenceDetector(str(self.learnings_path))
    
    for pattern in data.get('patterns', []):
        if pattern.get('status') != 'IMPLEMENTED':
            continue
        
        pattern_id = pattern.get('pattern_id')
        
        # Check if in verification window
        if is_in_verification_window(pattern, current_iteration):
            # Check for recurrence
            recurred, details = detector.check_recurrence(pattern, current_iteration)
            
            if recurred:
                # Mark as REGRESSED
                self.update_status(pattern_id, 'REGRESSED', {
                    'iteration': current_iteration,
                    'recurrence_details': details
                })
                results['regressed'].append(pattern_id)
            else:
                results['still_monitoring'].append(pattern_id)
        
        # Check if window completed
        elif should_auto_verify(pattern, current_iteration):
            # Mark as VERIFIED
            self.update_status(pattern_id, 'VERIFIED', {
                'iteration': current_iteration
            })
            results['verified'].append(pattern_id)
    
    return results
```

---

### Event Emission Patterns

**Existing Event Logger Pattern (from lib/2l-event-logger.sh):**

```bash
log_2l_event() {
  local event_type="$1"
  local data="$2"
  local phase="${3:-unknown}"
  local agent_id="${4:-orchestrator}"
  
  # Validate required parameters
  if [ -z "$event_type" ] || [ -z "$data" ]; then
    return 1  # Silent failure
  fi
  
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local event_file=".2L/events.jsonl"
  
  # Fire-and-forget: always || true
  mkdir -p .2L 2>/dev/null || true
  
  # Escape quotes
  event_type="${event_type//\"/\\\"}"
  data="${data//\"/\\\"}"
  
  # Build JSON and append
  local json_event="{\"timestamp\":\"$timestamp\",\"event_type\":\"$event_type\",\"phase\":\"$phase\",\"agent_id\":\"$agent_id\",\"data\":\"$data\"}"
  echo "$json_event" >> "$event_file" 2>/dev/null || true
}
```

**New Events for Verification:**

```bash
# Event 1: Pattern verified (no recurrence in 3 iterations)
log_2l_event "pattern_verified" \
             "Pattern ${pattern_id} verified in iteration ${current_iteration} (no recurrence)" \
             "monitoring" \
             "pattern-lifecycle"

# Event 2: Pattern regressed (recurred after implementation)
log_2l_event "pattern_regressed" \
             "Pattern ${pattern_id} regressed in iteration ${current_iteration} (similarity: ${similarity})" \
             "monitoring" \
             "pattern-lifecycle"

# Event 3: Monitoring check performed
log_2l_event "verification_check" \
             "Checked ${pattern_count} patterns (${still_monitoring} still monitoring)" \
             "monitoring" \
             "pattern-lifecycle"
```

**Python Event Emission Pattern (for lifecycle manager):**

```python
# Add to lib/2l-pattern-lifecycle.py

def _emit_event(self, event_type: str, data: str, phase: str = "monitoring"):
    """Emit event to JSONL (graceful degradation)."""
    try:
        event_file = self.learnings_path.parent / 'events.jsonl'
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'phase': phase,
            'agent_id': 'pattern-lifecycle',
            'data': data
        }
        
        with open(event_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
    except Exception:
        # Silent failure - don't block on event emission errors
        pass

# Call in update_status after successful transition
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

**Event Schema:**

```json
{
  "timestamp": "2025-11-27T10:00:00Z",
  "event_type": "pattern_verified",
  "phase": "monitoring",
  "agent_id": "pattern-lifecycle",
  "data": "Pattern PATTERN-001 verified in iteration 12 (no recurrence)"
}
```

---

## Patterns Identified

### Pattern 1: Temporal State Tracking

**Description:** Track time-based verification windows using iteration counters

**Use Case:** Pattern needs monitoring across next 3 iterations after IMPLEMENTED

**Example:**

```python
# Pattern marked IMPLEMENTED at iteration 8
pattern['verification_start_iteration'] = 9  # Start monitoring at 9

# Monitoring iterations: 9, 10, 11
# Auto-verify at iteration 12 if no recurrence
```

**Recommendation:** Use existing `verification_start_iteration` field (no schema change needed)

---

### Pattern 2: Similarity-Based Recurrence Detection

**Description:** Reuse SequenceMatcher algorithm from reflection-aggregator.py

**Use Case:** Detect if new learning matches existing pattern (indicates recurrence)

**Example:**

```python
from difflib import SequenceMatcher

similarity = SequenceMatcher(
    None,
    pattern['root_cause'].lower(),
    learning['root_cause'].lower()
).ratio()

if similarity >= 0.8 and pattern['category'] == learning['category']:
    # Recurrence detected
    transition_to_REGRESSED(pattern)
```

**Recommendation:** Extract to shared utility function to avoid duplication

---

### Pattern 3: Batch Monitoring After Iterations

**Description:** Check all IMPLEMENTED patterns at once after each iteration completes

**Use Case:** Scalable monitoring (O(n) not O(n²) across iterations)

**Example:**

```bash
# In /2l-mvp after iteration completes
python3 ~/.claude/lib/2l-pattern-lifecycle.py monitor \
    --current-iteration "$global_iter" \
    --global-learnings .2L/global-learnings.yaml

# Exit code 0: Monitoring complete
# Outputs: JSON with verified/regressed pattern lists
```

**Recommendation:** New CLI subcommand `monitor` for batch checking

---

### Pattern 4: Auto-Verification on Window Expiry

**Description:** Automatically transition IMPLEMENTED → VERIFIED when 3 iterations pass without recurrence

**Use Case:** Reduce manual intervention, confirm pattern fix effectiveness

**Example:**

```python
# Pattern implemented at iteration 8, start monitoring at 9
# Current iteration is 12
if current_iteration >= verification_start + 3:
    # Window complete: iterations 9, 10, 11 monitored
    # No recurrence detected
    update_status(pattern_id, 'VERIFIED', metadata={'iteration': 12})
```

**Recommendation:** Implement as part of `monitor` command logic

---

## Complexity Assessment

### High Complexity Areas

**Recurrence Detection Logic (RecurrenceDetector class)**
- **Why complex:** Multi-factor matching (similarity + category + temporal window)
- **Estimated splits:** 1 builder (manageable with existing SequenceMatcher pattern)
- **Risk:** False positives (detecting recurrence when issue is different)
- **Mitigation:** High threshold (0.8), category matching, manual override option

**Verification Window State Management**
- **Why complex:** Temporal logic spanning multiple iterations, need to track "last checked" state
- **Estimated splits:** 1 builder (integrate into existing lifecycle manager)
- **Risk:** Off-by-one errors in iteration counting
- **Mitigation:** Comprehensive unit tests with temporal mocking

### Medium Complexity Areas

**Event Emission for Verification/Regression**
- **Why moderate:** Follows existing fire-and-forget pattern
- **Integration:** Add to PatternLifecycleManager._emit_event() method
- **Risk:** Low (graceful degradation already established)

**CLI Extension for Monitor Command**
- **Why moderate:** New argparse subcommand, follows existing pattern
- **Integration:** Add to main() in 2l-pattern-lifecycle.py
- **Risk:** Low (similar to existing update/get-status/list commands)

### Low Complexity Areas

**State Transition Logic (VERIFIED/REGRESSED)**
- **Why simple:** State machine already exists, just adding new transitions
- **Integration:** Update metadata sections in update_status()
- **Risk:** Very low (validation logic already handles all states)

**YAML Schema Extension**
- **Why simple:** Fields like verified_at, regressed_at follow existing pattern
- **Integration:** Add to elif blocks in update_status()
- **Risk:** Very low (no breaking changes to existing schema)

---

## Technology Recommendations

### Primary Stack

**Similarity Detection:**
- **Choice:** `difflib.SequenceMatcher` (Python standard library)
- **Rationale:** 
  - Already proven in 2l-reflection-aggregator.py (21 tests, 100% pass)
  - No external dependencies (ships with Python)
  - Ratcliff-Obershelp algorithm is robust for text similarity
  - 0.8 threshold empirically validated

**State Management:**
- **Choice:** YAML fields in global-learnings.yaml
- **Rationale:**
  - Existing pattern lifecycle already uses this structure
  - Atomic writes with backup (via 2l-yaml-helpers.py)
  - Human-readable for debugging
  - No schema migration needed (verification_start_iteration already exists)

**Event Logging:**
- **Choice:** JSONL append via Python json.dumps()
- **Rationale:**
  - Matches existing event emission pattern
  - Concurrent-safe (append-only)
  - Streamable for real-time monitoring
  - Graceful degradation (fire-and-forget)

**Temporal Logic:**
- **Choice:** Iteration counter comparison (not timestamps)
- **Rationale:**
  - Simpler than datetime math
  - Aligns with global_iteration_counter in .2L/config.yaml
  - Easier to test (mock iteration numbers, not dates)
  - Clear window semantics (iterations 9, 10, 11 → verify at 12)

### Supporting Libraries

**None required** - All functionality uses Python standard library:
- `difflib` - Similarity matching
- `yaml` - Already installed (PyYAML)
- `json` - JSONL parsing and event emission
- `datetime` - Timestamps
- `pathlib` - File path handling

---

## Integration Points

### External APIs

**None** - All integration is internal to 2L framework

### Internal Integrations

**Integration 1: /2l-mvp Orchestrator**

**Location:** `commands/2l-mvp.md` after line ~1435 (after reflection creation)

**Code to add:**

```bash
# Pattern Lifecycle: Monitor verification windows
echo "   🔍 Checking pattern verification windows..."

python3 ~/.claude/lib/2l-pattern-lifecycle.py monitor \
    --current-iteration "$global_iter" \
    --global-learnings .2L/global-learnings.yaml > /tmp/monitor-result.json 2>&1

if [ $? -eq 0 ] && [ -f /tmp/monitor-result.json ]; then
    verified_count=$(jq -r '.verified | length' /tmp/monitor-result.json 2>/dev/null || echo "0")
    regressed_count=$(jq -r '.regressed | length' /tmp/monitor-result.json 2>/dev/null || echo "0")
    
    if [ "$verified_count" -gt 0 ]; then
        echo "   ✅ $verified_count pattern(s) verified (no recurrence)"
    fi
    
    if [ "$regressed_count" -gt 0 ]; then
        echo "   ⚠️  $regressed_count pattern(s) regressed (recurred)"
        jq -r '.regressed[]' /tmp/monitor-result.json 2>/dev/null || true
    fi
fi

rm -f /tmp/monitor-result.json
```

**Integration 2: PatternLifecycleManager Extension**

**Location:** `lib/2l-pattern-lifecycle.py`

**New methods to add:**

1. `monitor_verification_windows(current_iteration)` - Check all patterns
2. `RecurrenceDetector` class - Similarity-based detection
3. `_emit_event(event_type, data)` - Event emission helper

**Integration 3: CLI Subcommand**

**Location:** `lib/2l-pattern-lifecycle.py` main() function

**New argparse subcommand:**

```python
# monitor command
monitor_parser = subparsers.add_parser('monitor', help='Check verification windows')
monitor_parser.add_argument('--current-iteration', type=int, required=True,
                           help='Current global iteration number')
monitor_parser.add_argument('--global-learnings', default='.2L/global-learnings.yaml',
                           help='Path to global learnings file')
monitor_parser.add_argument('--output', default='-',
                           help='Output file for results ("-" for stdout)')
```

---

## Risks & Challenges

### Technical Risks

**Risk 1: False Positive Recurrence Detection**
- **Impact:** Pattern incorrectly marked REGRESSED when issue is actually different
- **Likelihood:** MEDIUM (0.8 threshold may catch similar but distinct issues)
- **Mitigation:**
  - Require category match (functionality/completeness/speed)
  - Log similarity scores for manual review
  - Add `--force-verify` CLI flag to override false positives
  - Include recurrence details in REGRESSED metadata for debugging

**Risk 2: Off-By-One Errors in Window Counting**
- **Impact:** Pattern verified too early or too late
- **Likelihood:** LOW (but common temporal logic bug)
- **Mitigation:**
  - Comprehensive unit tests with iteration scenarios:
    - Start at 9, check 9 → still monitoring
    - Start at 9, check 10 → still monitoring
    - Start at 9, check 11 → still monitoring
    - Start at 9, check 12 → auto-verify
  - Clear documentation: "Window is [start, start+3) - half-open interval"
  - Explicit test: `assert current_iteration >= verification_start + 3`

**Risk 3: JSONL Parsing Performance at Scale**
- **Impact:** Slow recurrence checking if global-learnings.jsonl grows large (1000+ entries)
- **Likelihood:** LOW (2L is for framework improvements, not high-volume production)
- **Mitigation:**
  - Index by iteration number during parsing (early exit optimization)
  - Only read learnings for current iteration (not entire file)
  - Future: SQLite migration if performance degrades

### Complexity Risks

**Risk 1: Monitoring Logic Integration into /2l-mvp**
- **Impact:** Builder needs to understand orchestrator flow, find correct insertion point
- **Likelihood:** MEDIUM (orchestrator is complex)
- **Mitigation:**
  - Explorer-1 will specify exact line numbers and context
  - Provide complete code snippet (not just description)
  - Test in isolation before integration

---

## Recommendations for Planner

### Recommendation 1: Extract Similarity to Shared Utility

**Rationale:** `calculate_similarity()` is used in both:
- `lib/2l-reflection-aggregator.py` (existing)
- `lib/2l-pattern-lifecycle.py` (new RecurrenceDetector)

**Suggestion:** Create `lib/2l-similarity-utils.py` with:

```python
from difflib import SequenceMatcher

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculate similarity using Ratcliff-Obershelp algorithm."""
    norm1 = text1.lower().strip()
    norm2 = text2.lower().strip()
    return SequenceMatcher(None, norm1, norm2).ratio()
```

**Benefits:**
- DRY principle (single source of truth)
- Consistent threshold across aggregation and recurrence detection
- Easier to upgrade algorithm if needed (e.g., switch to fuzzy-wuzzy)

**Alternative:** Duplicate code (simpler, but violates DRY)

---

### Recommendation 2: Implement Monitor as Batch Operation

**Rationale:** Checking patterns individually (N calls) is inefficient vs. batch (1 call)

**Suggestion:** CLI design:

```bash
# RECOMMENDED: Single batch call
python3 lib/2l-pattern-lifecycle.py monitor \
    --current-iteration 12 \
    --global-learnings .2L/global-learnings.yaml

# NOT: Individual calls per pattern
for pattern in $(list_patterns); do
    python3 lib/2l-pattern-lifecycle.py check $pattern ...
done
```

**Benefits:**
- O(n) file reads instead of O(n²)
- Single YAML write at end (atomic)
- JSON output for easy parsing in bash

---

### Recommendation 3: Add Dry-Run Mode for Testing

**Rationale:** Testing verification logic without modifying global-learnings.yaml

**Suggestion:** Add `--dry-run` flag:

```bash
python3 lib/2l-pattern-lifecycle.py monitor \
    --current-iteration 12 \
    --dry-run

# Output:
# Would verify: PATTERN-001 (window complete)
# Would mark REGRESSED: PATTERN-002 (similarity: 0.87)
# Still monitoring: PATTERN-003 (iteration 10/12)
```

**Benefits:**
- Safe testing during development
- Preview verification results before committing
- Useful for debugging false positives

---

### Recommendation 4: Consider Manual Override for Edge Cases

**Rationale:** Auto-verification may be wrong in rare cases (e.g., pattern recurs in different form)

**Suggestion:** Add manual commands:

```bash
# Force verify (even if window not complete)
python3 lib/2l-pattern-lifecycle.py verify \
    --pattern-id PATTERN-001 \
    --force

# Force regress (if auto-detection missed recurrence)
python3 lib/2l-pattern-lifecycle.py regress \
    --pattern-id PATTERN-001 \
    --reason "Recurred in different form"
```

**Benefits:**
- Human-in-the-loop for ambiguous cases
- Override auto-detection errors
- Flexibility for special scenarios

---

## Resource Map

### Critical Files/Directories

**Existing Files to Modify:**

- `lib/2l-pattern-lifecycle.py` (~370 lines → ~550 lines after extension)
  - Add RecurrenceDetector class (~100 lines)
  - Add monitor_verification_windows() method (~80 lines)
  - Add monitor CLI subcommand (~30 lines)

- `commands/2l-mvp.md` (lines ~1435-1450)
  - Add monitoring check after reflection creation (~15 lines)

**Files to Read:**

- `.2L/global-learnings.yaml` - Pattern database with status tracking
- `.2L/global-learnings.jsonl` - Learning stream for recurrence detection
- `.2L/config.yaml` - Global iteration counter

**Files to Write:**

- `.2L/global-learnings.yaml` - Update pattern status (VERIFIED/REGRESSED)
- `.2L/global-learnings.yaml.bak` - Backup before modification
- `.2L/events.jsonl` - Verification/regression events

**Optional Utility (if Recommendation 1 accepted):**

- `lib/2l-similarity-utils.py` - Shared similarity calculation (~30 lines)

---

### Key Dependencies

**Python Standard Library:**
- `difflib.SequenceMatcher` - Similarity calculation (already used)
- `yaml` (PyYAML) - YAML parsing (already installed)
- `json` - JSONL parsing and event emission
- `argparse` - CLI parsing
- `datetime` - Timestamps
- `pathlib` - File path handling

**2L Existing Utilities:**
- `lib/2l-yaml-helpers.py::atomic_write_yaml()` - Atomic YAML updates
- `lib/2l-yaml-helpers.py::backup_before_write()` - Backup creation
- `lib/2l-event-logger.sh::log_2l_event()` - Event emission (from bash)

**Data Dependencies:**
- `verification_start_iteration` field (already exists in YAML schema)
- `global_iteration_counter` from `.2L/config.yaml`
- JSONL learnings from reflection-generator.py output

---

### Testing Infrastructure

**Unit Tests (to create):**

`lib/test_pattern_lifecycle_verification.py` (~300 lines):

```python
import unittest
from pathlib import Path
import tempfile
import yaml

class TestVerificationWindow(unittest.TestCase):
    """Test verification window logic."""
    
    def test_window_calculation(self):
        """Test 3-iteration window bounds."""
        # Pattern implemented at iter 8, monitoring starts at 9
        pattern = {'verification_start_iteration': 9}
        
        # Still in window
        self.assertTrue(is_in_verification_window(pattern, 9))
        self.assertTrue(is_in_verification_window(pattern, 10))
        self.assertTrue(is_in_verification_window(pattern, 11))
        
        # Window complete
        self.assertFalse(is_in_verification_window(pattern, 12))
        self.assertTrue(should_auto_verify(pattern, 12))
    
    def test_recurrence_detection_exact_match(self):
        """Test exact root cause match."""
        detector = RecurrenceDetector()
        pattern = {
            'root_cause': 'Missing exploration phase',
            'category': 'functionality'
        }
        learning = {
            'root_cause': 'Missing exploration phase',
            'category': 'functionality'
        }
        
        recurred, details = detector.check_recurrence_match(pattern, learning)
        self.assertTrue(recurred)
        self.assertGreater(details['similarity'], 0.99)
    
    def test_recurrence_detection_similar_match(self):
        """Test fuzzy match above threshold."""
        detector = RecurrenceDetector()
        pattern = {
            'root_cause': 'Exploration phase missing from improve command',
            'category': 'functionality'
        }
        learning = {
            'root_cause': 'Missing exploration in improve workflow',
            'category': 'functionality'
        }
        
        recurred, details = detector.check_recurrence_match(pattern, learning)
        self.assertTrue(recurred)  # Should match (similar root cause)
    
    def test_recurrence_detection_category_mismatch(self):
        """Test that category mismatch prevents false positive."""
        detector = RecurrenceDetector()
        pattern = {
            'root_cause': 'Slow performance',
            'category': 'speed'
        }
        learning = {
            'root_cause': 'Slow performance',  # Same text
            'category': 'functionality'  # Different category
        }
        
        recurred, details = detector.check_recurrence_match(pattern, learning)
        self.assertFalse(recurred)  # Should NOT match

class TestMonitorCommand(unittest.TestCase):
    """Test monitor CLI command."""
    
    def test_monitor_batch_processing(self):
        """Test monitoring multiple patterns in single call."""
        # Create test YAML with 3 patterns
        # Pattern-1: window complete → should verify
        # Pattern-2: recurrence detected → should regress
        # Pattern-3: still in window → still monitoring
        pass
```

**Integration Test Script:**

`lib/test_verification_integration.sh`:

```bash
#!/usr/bin/env bash
# Test full verification workflow

set -e

echo "Test 1: Pattern lifecycle with verification"

# Setup: Create test pattern
python3 lib/2l-pattern-lifecycle.py update \
    --pattern-id PATTERN-TEST \
    --status IMPLEMENTED \
    --iteration 8

# Verify verification_start_iteration set
status=$(python3 lib/2l-pattern-lifecycle.py get-status --pattern-id PATTERN-TEST)
echo "$status" | grep -q "verification_start_iteration: 9"

# Test monitoring at iteration 9 (in window)
python3 lib/2l-pattern-lifecycle.py monitor \
    --current-iteration 9 \
    --dry-run

# Test auto-verify at iteration 12 (window complete)
python3 lib/2l-pattern-lifecycle.py monitor \
    --current-iteration 12

# Verify status changed to VERIFIED
status=$(python3 lib/2l-pattern-lifecycle.py get-status --pattern-id PATTERN-TEST)
echo "$status" | grep -q "Status: VERIFIED"

echo "✅ All tests passed"
```

---

## Questions for Planner

### Question 1: Similarity Threshold Configuration

**Context:** Aggregator uses 0.8 threshold, but recurrence detection may need different value

**Options:**
- A) Use same 0.8 threshold (consistency)
- B) Use higher threshold like 0.85 (reduce false positives)
- C) Make configurable via CLI flag `--recurrence-threshold`

**Recommendation:** Option A (consistency) - 0.8 has been validated through testing

---

### Question 2: Verification Window Duration

**Context:** Current design is 3 iterations, but this is arbitrary

**Options:**
- A) Keep 3 iterations (reasonable for most patterns)
- B) Make configurable per-pattern (e.g., critical patterns need 5 iterations)
- C) Make configurable globally via config.yaml

**Recommendation:** Option A for MVP, Option B for post-MVP (pattern-specific tuning)

---

### Question 3: Handling Partial Iterations

**Context:** What if iteration fails validation? Does it count toward verification window?

**Options:**
- A) Only count successful iterations (skip failed ones)
- B) Count all iterations (including failed)
- C) Pause monitoring during failed iterations

**Recommendation:** Option A - Only count iterations that complete successfully and create reflections. Failed iterations don't generate learnings, so can't detect recurrence.

---

### Question 4: Multi-Pattern Batching

**Context:** What if 10 patterns all need monitoring? One call or multiple?

**Options:**
- A) Batch all patterns in single `monitor` call (efficient)
- B) Individual calls per pattern (simpler logic)

**Recommendation:** Option A (already recommended in section above)

---

## Appendix: Code Examples

### Complete RecurrenceDetector Class

```python
class RecurrenceDetector:
    """Detect pattern recurrence via similarity matching."""
    
    RECURRENCE_THRESHOLD = 0.8
    
    def __init__(self, global_learnings_path: str, similarity_threshold: float = 0.8):
        self.learnings_path = Path(global_learnings_path)
        self.threshold = similarity_threshold
    
    def check_recurrence(self, pattern: Dict, current_iteration: int) -> Tuple[bool, Optional[Dict]]:
        """Check if pattern recurred in current iteration."""
        current_learnings = self._get_iteration_learnings(current_iteration)
        pattern_root_cause = pattern.get('root_cause', '')
        
        for learning in current_learnings:
            learning_root_cause = learning.get('root_cause', '')
            
            similarity = self._calculate_similarity(
                pattern_root_cause,
                learning_root_cause
            )
            
            if similarity >= self.threshold:
                if pattern.get('category') == learning.get('category'):
                    return True, {
                        'learning_id': learning.get('learning_id'),
                        'similarity': similarity,
                        'iteration': current_iteration,
                        'root_cause': learning_root_cause
                    }
        
        return False, None
    
    def _get_iteration_learnings(self, iteration: int) -> List[Dict]:
        """Read learnings from JSONL for specific iteration."""
        jsonl_path = self.learnings_path.parent / 'global-learnings.jsonl'
        
        if not jsonl_path.exists():
            return []
        
        learnings = []
        with open(jsonl_path) as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    if entry.get('iteration') == iteration:
                        learnings.append(entry)
                except json.JSONDecodeError:
                    continue
        
        return learnings
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity using SequenceMatcher."""
        from difflib import SequenceMatcher
        norm1 = text1.lower().strip()
        norm2 = text2.lower().strip()
        return SequenceMatcher(None, norm1, norm2).ratio()
```

### Complete monitor_verification_windows Method

```python
def monitor_verification_windows(self, current_iteration: int) -> Dict[str, List[str]]:
    """
    Check all patterns in verification window for recurrence.
    
    Args:
        current_iteration: Current global iteration number
    
    Returns:
        Dict with 'verified', 'regressed', 'still_monitoring' pattern lists
    """
    results = {
        'verified': [],
        'regressed': [],
        'still_monitoring': []
    }
    
    data = self._load_learnings()
    detector = RecurrenceDetector(str(self.learnings_path), self.threshold)
    
    for pattern in data.get('patterns', []):
        if pattern.get('status') != 'IMPLEMENTED':
            continue
        
        pattern_id = pattern.get('pattern_id')
        verification_start = pattern.get('verification_start_iteration')
        
        if verification_start is None:
            continue
        
        # Check if in verification window [start, start+3)
        window_end = verification_start + 3
        
        if verification_start <= current_iteration < window_end:
            # In window - check for recurrence
            recurred, details = detector.check_recurrence(pattern, current_iteration)
            
            if recurred:
                self.update_status(pattern_id, 'REGRESSED', {
                    'iteration': current_iteration,
                    'plan_id': details.get('plan_id'),
                    'recurrence_details': details
                })
                results['regressed'].append(pattern_id)
            else:
                results['still_monitoring'].append(pattern_id)
        
        elif current_iteration >= window_end:
            # Window complete - auto-verify
            self.update_status(pattern_id, 'VERIFIED', {
                'iteration': current_iteration
            })
            results['verified'].append(pattern_id)
    
    return results
```

---

**Explorer-2 Status:** COMPLETE
**Quality:** HIGH
**Confidence:** 95%
**Integration ready:** YES
