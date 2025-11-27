# Technology Stack

## Core Framework

**Decision:** Python 3.8+ for lifecycle logic, Bash for orchestration integration

**Rationale:**
- Python already used for all lifecycle utilities (lifecycle, aggregator, generator)
- Pattern consistency critical for maintainability across 2L framework
- Bash integration in /2l-mvp matches existing reflection pattern (iteration 9)
- Standard library only - no external dependencies beyond PyYAML (already installed)
- Team familiar with Python + Bash combination from iterations 8-9

**Alternatives Considered:**
- Pure Bash: Why not chosen - Complex similarity matching difficult in Bash, Python YAML libraries mature
- Pure Python: Why not chosen - /2l-mvp orchestrator is Bash, subprocess calls are standard pattern

## Data Storage

**Decision:** YAML for pattern state + JSONL for learning stream

**Rationale:**
- Existing pattern: global-learnings.yaml (current state), global-learnings.jsonl (event stream)
- YAML provides human-readable pattern database with atomic updates
- JSONL enables efficient iteration-based queries (filter by iteration field)
- Proven in iterations 8-9 with reflection aggregator
- Atomic writes via lib/2l-yaml-helpers.py prevent corruption

**Schema Strategy:**

```yaml
# .2L/global-learnings.yaml
patterns:
  - pattern_id: PATTERN-001
    status: IMPLEMENTED  # or VERIFIED, REGRESSED
    verification_start_iteration: 9  # When monitoring started
    verified_at: "2025-11-27T10:30:00Z"  # When verified (if VERIFIED)
    verified_in_iteration: 11  # Which iteration verified
    regressed_at: "2025-11-27T11:00:00Z"  # When regressed (if REGRESSED)
    regressed_in_iteration: 12  # Which iteration regressed
    recurrence_similarity: 0.87  # Similarity score of match
    matched_learning_id: "plan-9-iter-12-learning-003"  # Which learning triggered regression
```

**JSONL Structure:**

```json
{"timestamp": "2025-11-27T10:00:00Z", "event_type": "pattern_verified", "pattern_id": "PATTERN-001", "iteration": 11}
{"timestamp": "2025-11-27T11:00:00Z", "event_type": "pattern_regressed", "pattern_id": "PATTERN-001", "iteration": 12, "similarity": 0.87}
```

## Recurrence Detection

**Decision:** difflib.SequenceMatcher (Python standard library)

**Rationale:**
- Already proven in lib/2l-reflection-aggregator.py (21 unit tests, 100% pass rate)
- Ratcliff-Obershelp algorithm is robust for text similarity
- 0.8 threshold empirically validated in iteration 9
- No external dependencies (ships with Python)
- Consistent behavior across aggregation and verification

**Implementation Notes:**

```python
from difflib import SequenceMatcher

def _calculate_similarity(self, text1: str, text2: str) -> float:
    """
    Calculate similarity using Ratcliff-Obershelp algorithm.

    Copied from lib/2l-reflection-aggregator.py to avoid circular imports.
    Threshold: 0.8 (80% similarity) for recurrence detection.
    """
    norm1 = text1.lower().strip()
    norm2 = text2.lower().strip()
    return SequenceMatcher(None, norm1, norm2).ratio()
```

**Threshold Configuration:**
- Similarity threshold: 0.8 (matches aggregator)
- Category matching required: Must match pattern category (functionality/completeness/speed)
- Rationale: Prevents false positives from similar but unrelated issues

## Verification Window

**Decision:** 3-iteration monitoring window using global iteration counter

**Rationale:**
- Master plan specifies 3 iterations as verification period
- Global iteration counter (global_iter) provides monotonic timeline
- Simpler than timestamp-based monitoring (no date arithmetic)
- Clear semantics: verification_start, +1, +2 (then verify at +3)
- Easier to test (mock iteration numbers, not dates)

**Window Tracking:**

```python
# Pattern implemented at iteration 8
pattern['verification_start_iteration'] = 9  # Start monitoring at next iteration

# Check verification eligibility
if current_iteration >= verification_start + 3:
    # Window complete: iterations 9, 10, 11 monitored
    # Verify at iteration 12
    update_status(pattern_id, 'VERIFIED')
```

**Edge Cases:**
- Missing verification_start_iteration: Skip monitoring (return "not monitoring")
- Iteration learnings missing: Graceful failure (return "still monitoring")
- Pattern deleted mid-window: Handled by _find_pattern returning None

## CLI Framework

**Decision:** argparse with subcommands (Python standard library)

**Rationale:**
- Consistent with existing lifecycle CLI (update, get-status, list)
- Familiar pattern for team
- Good error messages and help text
- Easy to extend post-MVP

**CLI Pattern:**

```bash
# Check recurrence (exit codes: 0=monitoring, 1=verified, 2=regressed)
python3 ~/.claude/lib/2l-pattern-lifecycle.py check-recurrence \
    --pattern-id PATTERN-001 \
    --current-iteration 11 \
    --global-learnings .2L/global-learnings.yaml

# Output: "VERIFIED: No recurrence in 3 iterations" (exit code 1)
```

**Exit Code Semantics:**
- 0: Still monitoring (no status change)
- 1: Pattern verified (IMPLEMENTED → VERIFIED)
- 2: Pattern regressed (IMPLEMENTED → REGRESSED)

## Event Logging

**Decision:** JSONL append via existing lib/2l-event-logger.sh

**Rationale:**
- Proven infrastructure from iterations 8-9
- Fire-and-forget pattern (graceful degradation)
- Concurrent-safe (append-only writes)
- Already integrated in /2l-mvp

**Event Schema:**

```json
{
  "timestamp": "2025-11-27T10:00:00Z",
  "event_type": "pattern_verified",
  "phase": "monitoring",
  "agent_id": "pattern-lifecycle",
  "data": "Pattern PATTERN-001 verified in iteration 11 (no recurrence)"
}
```

**New Event Types:**
- `pattern_verified`: Pattern completed 3-iteration window without recurrence
- `pattern_regressed`: Pattern recurred after being marked IMPLEMENTED

**Integration Pattern:**

```python
# In lib/2l-pattern-lifecycle.py
def _emit_event(self, event_type: str, data: str, phase: str = "monitoring"):
    """Emit event to .2L/events.jsonl (graceful degradation)."""
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
        pass  # Silent failure - don't block on event errors
```

## Integration Architecture

**Decision:** Subprocess invocation from /2l-mvp (Bash → Python CLI)

**Rationale:**
- Matches existing reflection integration pattern (iteration 9)
- Loose coupling (lifecycle manager is standalone utility)
- Easy to test in isolation
- Non-blocking (can timeout if needed)

**Integration Points:**

```bash
# In commands/2l-mvp.md (after reflection creation)
check_pattern_lifecycle() {
    local global_iter="$1"

    # Get IMPLEMENTED patterns
    implemented_patterns=$(python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
    patterns = [p['pattern_id'] for p in data.get('patterns', [])
                if p.get('status') == 'IMPLEMENTED']
    print('\n'.join(patterns))
" 2>/dev/null || echo "")

    # Check each pattern
    while IFS= read -r pattern_id; do
        result=$(python3 ~/.claude/lib/2l-pattern-lifecycle.py check-recurrence \
            --pattern-id "$pattern_id" \
            --current-iteration "$global_iter" 2>&1)

        exit_code=$?

        # Handle exit codes (0=monitoring, 1=verified, 2=regressed)
        if [ $exit_code -eq 2 ]; then
            echo "⚠️  $pattern_id REGRESSED"
            log_2l_event "pattern_regressed" "..." "lifecycle" "orchestrator"
        elif [ $exit_code -eq 1 ]; then
            echo "✅ $pattern_id VERIFIED"
            log_2l_event "pattern_verified" "..." "lifecycle" "orchestrator"
        fi
    done <<< "$implemented_patterns"
}

# Call after reflection creation (lines 1199 and 1438)
check_pattern_lifecycle "$global_iter"
```

## Development Tools

### Testing

**Framework:** Bash test script (matches existing lib/test-pattern-lifecycle.sh)

**Coverage Target:** 90%+ (critical paths + edge cases)

**Strategy:**
- Unit tests: Similarity matching, window logic, status transitions
- Integration tests: /2l-mvp call sites, event emission
- End-to-end: PATTERN-001 verification flow (3 iterations)
- Edge cases: Missing files, malformed YAML, empty learnings

**Test Structure:**

```bash
# lib/test-pattern-lifecycle-recurrence.sh
#!/usr/bin/env bash
set -e

echo "Test 1: Recurrence detection with exact match"
# Setup: Create IMPLEMENTED pattern
# Create current iteration learnings with matching root_cause
# Run check-recurrence
# Assert: exit code 2 (REGRESSED)
# Assert: pattern status updated to REGRESSED
# Assert: event emitted

echo "Test 2: Verification after 3 clean iterations"
# Setup: Pattern at iteration 8, verification_start=9
# Simulate iterations 9, 10, 11 with different issues
# Run check-recurrence at iteration 12
# Assert: exit code 1 (VERIFIED)
# Assert: pattern status updated to VERIFIED

echo "Test 3: Still monitoring (iteration 2 of 3)"
# Setup: verification_start=9, current_iteration=10
# Run check-recurrence
# Assert: exit code 0 (monitoring)
# Assert: no status change

echo "✅ All tests passed"
```

### Code Quality

**Linter:** pycodestyle (already used in 2L project)

**Formatter:** Black (standard Python formatter)

**Type Checking:** None for MVP (Python 3.8+ type hints optional)

**Standards:**
- Follow existing 2L code style (see lib/2l-pattern-lifecycle.py)
- Docstrings for all public methods
- Clear variable names (pattern_id, verification_start_iteration)
- Error messages include context (pattern ID, iteration number)

## Environment Variables

No new environment variables required. All configuration via CLI arguments or hardcoded constants.

**Existing Variables (Read-Only):**
- `$HOME/.claude/lib/*`: Library path for utilities
- `.2L/global-learnings.yaml`: Pattern database path
- `.2L/events.jsonl`: Event log path

**Constants in Code:**

```python
# lib/2l-pattern-lifecycle.py
VERIFICATION_WINDOW_SIZE = 3  # Iterations to monitor before verification
RECURRENCE_THRESHOLD = 0.8  # Similarity threshold (same as aggregator)
```

## Dependencies Overview

**Python Standard Library Only:**

```python
import yaml          # PyYAML (already installed for iterations 8-9)
import json          # JSONL parsing
import pathlib       # Path manipulation
import datetime      # Timestamps
import argparse      # CLI parsing
import sys           # Exit codes
from difflib import SequenceMatcher  # Similarity matching
import glob          # Find learnings files
```

**No External Dependencies:** All functionality using standard library + PyYAML (already installed)

**Shared 2L Utilities (Reuse):**

```python
# From lib/2l-yaml-helpers.py (not imported, pattern copied)
# - atomic_write_yaml() pattern (backup + write)
# - YAML loading with error handling

# From lib/2l-reflection-aggregator.py (code copied, not imported)
# - calculate_similarity() algorithm
# - 0.8 similarity threshold

# From lib/2l-event-logger.sh (used via Bash)
# - log_2l_event() function
```

## Performance Targets

**Verification Check:**
- Target: < 5 seconds per check (all IMPLEMENTED patterns)
- Expected: < 1 second for typical case (1-3 patterns)
- Strategy: Early exit on first recurrence match

**JSONL Parsing:**
- Target: < 500ms for 100 learning entries
- Expected: < 100ms for typical case (5-10 learnings per iteration)
- Strategy: Filter by iteration number, stop after finding current iteration

**Total /2l-mvp Overhead:**
- Target: < 10% additional time per iteration
- Expected: < 200ms for verification check
- Strategy: Non-blocking execution, timeout if needed

**Scalability Limits (MVP):**
- Patterns: Up to 20 IMPLEMENTED patterns (O(n) iteration over patterns)
- Learnings: Up to 100 learnings per iteration (O(m) JSONL parse)
- Total: O(n*m) per iteration, acceptable for MVP scale

**Post-MVP Optimizations:**
- JSONL indexing by iteration number (O(1) lookup)
- Pattern status caching (avoid repeated YAML loads)
- Parallel recurrence checking (multiple patterns simultaneously)

## Security Considerations

**File Permissions:**
- `.2L/global-learnings.yaml`: Read/write by user only (chmod 600)
- `.2L/events.jsonl`: Append-only, readable by user
- Backup files (.bak): Same permissions as originals

**Input Validation:**
- Pattern IDs sanitized (alphanumeric + hyphens only)
- Iteration numbers validated (positive integers)
- YAML parsing uses yaml.safe_load (prevents code execution)
- No shell injection (argparse handles escaping)

**Atomic Operations:**
- YAML writes use atomic pattern (write temp → move)
- Backup created before every modification
- JSONL appends are atomic at OS level

**Error Handling:**
- No sensitive data in error messages
- Stack traces logged but not shown to user
- Graceful degradation (missing files don't crash)

**Threat Model:**
- Malicious YAML injection: Mitigated by yaml.safe_load
- Concurrent modification: Mitigated by atomic writes
- Resource exhaustion: Mitigated by early exit, timeouts
- Privacy: No external network calls, all local filesystem

## Technology Decisions Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Core Language | Python 3.8+ | Existing pattern, standard library rich |
| Orchestration | Bash | /2l-mvp is Bash, subprocess pattern proven |
| Data Storage | YAML + JSONL | Human-readable, atomic updates, streaming |
| Similarity | difflib.SequenceMatcher | Proven in aggregator, no dependencies |
| CLI | argparse | Standard library, consistent with lifecycle |
| Events | JSONL append | Concurrent-safe, fire-and-forget |
| Testing | Bash scripts | Matches existing test-pattern-lifecycle.sh |
| Window Tracking | Iteration counter | Simpler than timestamps, clear semantics |
| Integration | Subprocess calls | Loose coupling, easy to test |
| Error Handling | Try/except + graceful degradation | Non-blocking, logs for debugging |

**All decisions prioritize:**
1. Consistency with existing 2L patterns (iterations 8-9)
2. Standard library only (no new dependencies)
3. Simplicity and testability
4. Non-blocking execution (don't slow down iterations)
5. Graceful degradation (errors don't crash framework)
