# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

This exploration analyzes the 2L framework's technology patterns, focusing on Python utilities, YAML/JSONL data structures, git safety mechanisms, event emission, and error handling. The findings reveal a mature pattern ecosystem with atomic operations, graceful degradation, and strong safety guarantees - providing a solid foundation for implementing the Pattern Lifecycle Management system.

**Key Findings:**
- Python utilities use atomic write patterns with temp-file-and-rename for safety
- YAML for structured config (human-editable), JSONL for append-only logs (streamable)
- Git checkpoint pattern: commit + tag with timestamp for rollback capability
- Event logging is fire-and-forget with silent failures (graceful degradation)
- Consistent error handling with try/except, sys.exit codes, and stderr messages

## Discoveries

### Python Utility Architecture

**Pattern: Atomic File Operations**
All YAML modifications use atomic writes to prevent corruption:

```python
# lib/2l-yaml-helpers.py lines 19-52
def atomic_write_yaml(file_path, data):
    """Write YAML atomically using temp file + rename"""
    temp_fd, temp_path = tempfile.mkstemp(
        dir=os.path.dirname(file_path) or '.',
        prefix='.tmp_',
        suffix='.yaml'
    )
    try:
        with os.fdopen(temp_fd, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)
        shutil.move(temp_path, file_path)  # Atomic rename
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e
```

**Why this matters:** Pattern lifecycle updates MUST be atomic - if /2l-improve crashes mid-write, global-learnings.yaml stays consistent.

**Pattern: Backup Before Modification**

```python
# lib/2l-yaml-helpers.py lines 54-69
def backup_before_write(file_path):
    """Create .bak backup before modifying"""
    if os.path.exists(file_path):
        backup_path = file_path + '.bak'
        shutil.copy2(file_path, backup_path)
        return backup_path
    return None
```

Applied before every atomic write (line 137: `backup_before_write(global_learnings_path)`).

**Pattern: CLI Argument Parsing**

```python
# lib/2l-pattern-detector.py lines 107-114
parser = argparse.ArgumentParser(description='...')
parser.add_argument('--global-learnings', required=True)
parser.add_argument('--min-occurrences', type=int, default=2)
parser.add_argument('--output', default='-')  # stdout by default
args = parser.parse_args()
```

All utilities follow same CLI structure:
- Required args with `required=True`
- Optional args with sensible defaults
- `--output -` for stdout (pipeline-friendly)
- argparse auto-generates `--help`

### YAML/JSONL Data Structure Patterns

**YAML Structure: Global Learnings**

```yaml
# .2L/global-learnings.yaml
schema_version: '1.0'
aggregated_at: '2025-11-19T09:00:00Z'
total_projects: 1
total_learnings: 1

patterns:
  - pattern_id: PATTERN-001
    name: "..."
    occurrences: 2
    projects: ["project-1", "project-2"]
    severity: medium  # critical|medium|low
    root_cause: "..."
    proposed_solution: "..."
    status: IDENTIFIED  # IDENTIFIED|IMPLEMENTED|VERIFIED|REGRESSED
    discovered_in: "plan-5-iter-7"
    discovered_at: "2025-11-19T09:00:00Z"
    source_learnings: ["learning-001", "learning-002"]
    iteration_metadata:
      duration_seconds: 3600
      healing_rounds: 0
      files_modified: 1
    affected_files:
      - "commands/2l-improve.md"
```

**Key Design Decisions:**
- `status` field tracks lifecycle: `IDENTIFIED → IMPLEMENTED → VERIFIED → REGRESSED`
- `source_learnings` maintains provenance (array of learning IDs)
- `iteration_metadata` stores averages for impact scoring
- Human-readable (not normalized) for grep-ability

**JSONL Structure: Event Logs**

```jsonl
{"timestamp":"2025-10-08T18:00:00Z","event_type":"plan_start","phase":"initialization","agent_id":"orchestrator","data":"Plan test-plan started in MASTER mode"}
{"timestamp":"2025-10-08T18:00:01Z","event_type":"iteration_start","phase":"initialization","agent_id":"orchestrator","data":"Iteration 1 starting"}
```

**Why JSONL for events:**
- Append-only (concurrent-safe, no race conditions)
- Streamable (tail -f, grep, jq processing)
- No parsing entire file to add entry
- Natural chronological ordering

**Missing: global-learnings.jsonl**

Vision requires `.2L/global-learnings.jsonl` for raw learning history:

```jsonl
{"learning_id":"plan-5-iter-7-learning-001","timestamp":"2025-11-19T09:00:00Z","project":"2L-self-improvement","plan":"plan-5","iteration":7,"category":"functionality","issue":"Missing exploration phase","severity":"medium","root_cause":"...","suggested_fix":"...","pattern_id":"PATTERN-001"}
```

**Implementation note:** Reflection aggregator should append to JSONL, then update YAML summary.

### Git Safety Checkpoint Pattern

**Pattern: Pre-Modification Safety Checkpoint**

From `commands/2l-improve.md` lines 726-745:

```bash
function create_safety_checkpoint() {
    local pattern_id="$1"
    
    echo "   Creating pre-modification safety checkpoint..."
    
    # Commit current state (allow empty for idempotence)
    git add -A
    git commit -m "Pre-improvement checkpoint: ${pattern_id}" \
        --allow-empty > /dev/null 2>&1 || {
        echo "      (No changes to commit - working directory clean)"
    }
    
    # Tag checkpoint with timestamp
    local timestamp=$(date +%s)
    local checkpoint_tag="pre-${pattern_id}-${timestamp}"
    git tag "$checkpoint_tag"
    
    echo "   ✅ Safety checkpoint: $checkpoint_tag"
    echo "$checkpoint_tag"  # Return tag name
}
```

**Key Elements:**
1. `git add -A` stages all changes (modified, new, deleted)
2. `--allow-empty` makes idempotent (safe to call multiple times)
3. Timestamp ensures unique tags: `pre-PATTERN-001-1732680123`
4. Returns tag name for logging/rollback reference

**Pattern: Git Clean Validation**

From `commands/2l-improve.md` lines 677-708:

```bash
function verify_git_clean() {
    if ! git diff-index --quiet HEAD --; then
        echo "❌ ERROR: Git working directory has uncommitted changes"
        echo ""
        git status --short
        read -p "Override and proceed anyway? (y/N): " override
        if [[ ! "$override" =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    return 0
}
```

**Safety principle:** Never create checkpoint with dirty working tree (prevents confusion about what's being backed up).

**Pattern: Rollback Capability**

```bash
# From commands/2l-rollback.md
git tag -l "2l-*" | while read tag; do
    echo "  $tag"
done

# Rollback execution
git checkout "$TAG"
```

Tags are never deleted, providing full audit trail.

### Event Emission Patterns

**Pattern: Bash Event Logger Library**

From `lib/2l-event-logger.sh`:

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
  
  # Create .2L directory if needed (silent)
  mkdir -p .2L 2>/dev/null || true
  
  # Escape double quotes in data
  event_type="${event_type//\"/\\\"}"
  data="${data//\"/\\\"}"
  
  # Build JSON and append
  local json_event="{\"timestamp\":\"$timestamp\",\"event_type\":\"$event_type\",\"phase\":\"$phase\",\"agent_id\":\"$agent_id\",\"data\":\"$data\"}"
  echo "$json_event" >> "$event_file" 2>/dev/null || true
}

export -f log_2l_event
```

**Key Design Decisions:**

1. **Fire-and-forget:** Always returns success (|| true), never blocks execution
2. **Graceful degradation:** Missing .2L directory? Create it. Can't write? Silent failure.
3. **Exported function:** Available to all sourcing scripts
4. **ISO timestamps:** Consistent, sortable format
5. **JSON escaping:** Prevents injection attacks

**Usage Pattern in Agents:**

```bash
# Source library (graceful if missing)
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  log_2l_event "agent_start" "Explorer-2: Starting..." "exploration" "explorer-2"
fi
```

**Pattern Lifecycle Events (Required):**

```bash
# When pattern status changes
log_2l_event "pattern_implemented" \
             "Pattern ${PATTERN_ID} implemented in ${PLAN_ID}" \
             "self_modification" \
             "2l-improve"

log_2l_event "pattern_verified" \
             "Pattern ${PATTERN_ID} verified (no recurrence in 3 iterations)" \
             "monitoring" \
             "pattern-lifecycle-monitor"

log_2l_event "pattern_regressed" \
             "Pattern ${PATTERN_ID} recurred in ${PLAN_ID}" \
             "monitoring" \
             "pattern-lifecycle-monitor"
```

### Error Handling & Graceful Degradation Patterns

**Pattern: Try/Except with Informative Errors**

From `lib/2l-pattern-detector.py` lines 140-146:

```python
try:
    patterns = detect_recurring_patterns(...)
    # ... output logic
except FileNotFoundError as e:
    print(f"ERROR: Global learnings file not found: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"ERROR: Pattern detection failed: {e}", file=sys.stderr)
    sys.exit(1)
```

**Exit codes:**
- `0` = Success
- `1` = Validation/logic error (recoverable)
- `2` = Safety abort (orchestrator exclusion, symlink failure)

**Pattern: Validation with Clear Error Messages**

From `lib/2l-yaml-helpers.py` lines 256-257:

```python
if not pattern_found:
    raise ValueError(f"Pattern {pattern_id} not found in global learnings")
```

Messages include:
- What failed (pattern not found)
- Context (pattern_id value)
- Where to look (global learnings file)

**Pattern: Graceful Optional Features**

```bash
# Symlink verification (non-critical)
if [ -f "$HOME/.claude/lib/verify-symlinks.sh" ]; then
    bash "$HOME/.claude/lib/verify-symlinks.sh"
else
    echo "   ⚠️  WARNING: Symlink verification script not found"
    echo "      Skipping symlink check (not critical)"
    return 0  # Continue execution
fi
```

**Pattern: Idempotent Operations**

```python
# lib/2l-yaml-helpers.py lines 240-242
if current_status == 'IMPLEMENTED' and new_status == 'IMPLEMENTED':
    # Idempotent - no-op if already IMPLEMENTED
    print(f"Pattern {pattern_id} already {new_status}")
    return pattern
```

Safe to call multiple times without side effects.

## Patterns Identified

### Pattern Type: Atomic State Updates

**Description:** All global state modifications use atomic writes (temp-file-and-rename) to prevent corruption from crashes or concurrent access.

**Use Case:** Updating pattern status in global-learnings.yaml during /2l-improve execution

**Example:**

```python
# lib/2l-pattern-lifecycle.py (to be created)
def update_pattern_status(pattern_id, new_status, metadata=None):
    """Update pattern status atomically"""
    backup_before_write(GLOBAL_LEARNINGS)
    data = yaml.safe_load(open(GLOBAL_LEARNINGS))
    
    # Find and update pattern
    for pattern in data['patterns']:
        if pattern['pattern_id'] == pattern_id:
            pattern['status'] = new_status
            if metadata:
                pattern.update(metadata)
            break
    
    # Atomic write
    atomic_write_yaml(GLOBAL_LEARNINGS, data)
```

**Recommendation:** MUST use atomic_write_yaml for pattern lifecycle updates.

### Pattern Type: Fire-and-Forget Event Logging

**Description:** Event emission never blocks execution. Failures are silent, ensuring orchestration continues even if event logging breaks.

**Use Case:** Pattern lifecycle state transitions should emit events without risking the update

**Example:**

```python
# After updating pattern status
try:
    if EVENT_LOGGING_ENABLED:
        log_event("pattern_implemented", f"Pattern {pattern_id} -> IMPLEMENTED")
except:
    pass  # Silent failure - state update is what matters
```

**Recommendation:** Use bash log_2l_event or Python equivalent with try/except guard.

### Pattern Type: Validation Before Modification

**Description:** Verify preconditions (git clean, symlinks valid, orchestrator excluded) before making changes.

**Use Case:** Pattern lifecycle manager should validate state machine transitions before updating

**Example:**

```python
def validate_status_transition(current_status, new_status):
    """Validate status transition is legal"""
    valid_transitions = {
        'IDENTIFIED': ['IMPLEMENTED'],
        'IMPLEMENTED': ['VERIFIED', 'REGRESSED'],
        'VERIFIED': ['REGRESSED'],
        'REGRESSED': ['IMPLEMENTED']
    }
    
    if new_status not in valid_transitions.get(current_status, []):
        raise ValueError(
            f"Invalid transition: {current_status} -> {new_status}. "
            f"Valid: {valid_transitions.get(current_status, [])}"
        )
```

**Recommendation:** Pattern lifecycle MUST validate state machine before updates.

### Pattern Type: Dual Storage (YAML + JSONL)

**Description:** YAML for current state (structured, queryable), JSONL for history (append-only, audit trail).

**Use Case:** Pattern lifecycle needs both global-learnings.yaml (current status) and global-learnings.jsonl (full history)

**Example:**

```python
# Update YAML state
update_pattern_status(pattern_id, 'IMPLEMENTED')

# Append to JSONL history
append_to_jsonl('.2L/global-learnings.jsonl', {
    'timestamp': datetime.now().isoformat(),
    'event': 'status_change',
    'pattern_id': pattern_id,
    'old_status': 'IDENTIFIED',
    'new_status': 'IMPLEMENTED',
    'plan_id': current_plan
})
```

**Recommendation:** Implement both for pattern lifecycle (YAML for queries, JSONL for audit).

## Complexity Assessment

### High Complexity Areas

**Pattern Lifecycle State Machine (Feature 4)** - HIGH COMPLEXITY
- **Why complex:**
  - State validation (4 states: IDENTIFIED, IMPLEMENTED, VERIFIED, REGRESSED)
  - Transition rules enforcement (prevent IDENTIFIED → VERIFIED)
  - Monitoring across multiple iterations (3-iteration lookback window)
  - Atomic updates with event emission
  - Regression detection (requires comparing current learnings to historical patterns)

- **Estimated builder splits:** 2 builders
  - Builder A: Core state machine + IDENTIFIED → IMPLEMENTED transition
  - Builder B: Verification monitoring + REGRESSED detection

- **Complexity drivers:**
  - Temporal dependency (monitoring 3 future iterations)
  - Integration with /2l-improve (post-mvp hook)
  - Integration with reflection aggregator (detect recurrence)

### Medium Complexity Areas

**Reflection Aggregator (Feature 5)** - MEDIUM COMPLEXITY
- **Why medium:**
  - Fuzzy matching for pattern grouping (similarity threshold = 0.8)
  - Impact score calculation (frequency × category_weight × severity)
  - Dual-storage writes (YAML + JSONL)

- **Complexity notes:**
  - Well-defined algorithm (no state machine)
  - Single-pass operation (no monitoring)
  - Existing patterns in 2l-yaml-helpers.py reusable

**Git Safety Checkpoints** - MEDIUM COMPLEXITY
- **Why medium:**
  - Multiple safety checks (git clean, symlinks, orchestrator exclusion)
  - Rollback capability requires tag management
  - Integration with /2l-improve command

- **Complexity notes:**
  - Patterns already exist in 2l-improve.md
  - Mostly bash scripting (fewer moving parts than Python)

### Low Complexity Areas

**Event Emission for Lifecycle** - LOW COMPLEXITY
- **Why low:**
  - Existing log_2l_event pattern well-established
  - Fire-and-forget design (no error handling needed)
  - Simple function calls in pattern lifecycle utility

**Atomic YAML Writes** - LOW COMPLEXITY
- **Why low:**
  - Pattern already implemented (atomic_write_yaml, backup_before_write)
  - Reuse existing utilities from 2l-yaml-helpers.py
  - No new patterns to establish

## Technology Recommendations

### Primary Stack

**Python 3.8+ with Type Hints**
- **Rationale:** All existing utilities use Python 3, type hints aid maintainability
- **Example:**
  ```python
  def update_pattern_status(pattern_id: str, new_status: str, 
                           metadata: Optional[Dict] = None) -> Dict:
      """Update pattern status with type safety"""
  ```

**YAML for Config, JSONL for Logs**
- **Rationale:** Established pattern across 2L framework
- **YAML:** global-learnings.yaml (structured state, human-editable)
- **JSONL:** global-learnings.jsonl (append-only history, streamable)

**Bash for Orchestration, Python for Data Processing**
- **Rationale:** /2l-improve is bash, data manipulation is Python
- **Bash:** Git operations, event emission, command orchestration
- **Python:** Pattern detection, lifecycle management, reflection aggregation

### Supporting Libraries

**PyYAML (yaml.safe_load, yaml.dump)**
- **Purpose:** YAML parsing and writing
- **Already installed:** Used by 2l-pattern-detector.py, 2l-yaml-helpers.py
- **Safety:** safe_load prevents code injection

**argparse (standard library)**
- **Purpose:** CLI argument parsing
- **Pattern:** All utilities use argparse for consistent UX
- **Example:** `--pattern-id PATTERN-001 --status IMPLEMENTED`

**datetime (standard library)**
- **Purpose:** ISO 8601 timestamps
- **Pattern:** `datetime.now().isoformat()` for consistency
- **Why:** Sortable, timezone-aware, human-readable

**tempfile + shutil (standard library)**
- **Purpose:** Atomic file operations
- **Pattern:** tempfile.mkstemp + shutil.move for atomic writes
- **Why:** OS-level atomic rename guarantees

**pathlib (standard library, optional)**
- **Purpose:** Path manipulation (more readable than os.path)
- **Example:** `Path.home() / 'Ahiya' / '2L' / '.2L' / 'global-learnings.yaml'`
- **Not currently used:** Could improve readability in new utilities

## Integration Points

### Pattern Lifecycle → /2l-improve

**Hook Point:** After `/2l-mvp` completes successfully

```bash
# commands/2l-improve.md (after line 850)
# Step 6: Update Pattern Status to IMPLEMENTED
if /2l-mvp exits with success; then
    python3 "$HOME/.claude/lib/2l-pattern-lifecycle.py" \
        update-status \
        --pattern-id "$selected_pattern_id" \
        --status IMPLEMENTED \
        --metadata-json "{\"implemented_in_plan\":\"$next_plan_id\",\"implemented_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
fi
```

### Pattern Lifecycle → Reflection Aggregator

**Hook Point:** Detect recurrence during reflection aggregation

```python
# lib/2l-reflection-aggregator.py
def aggregate_reflections(reflection_path):
    """Aggregate reflections and detect pattern recurrence"""
    # ... normal aggregation ...
    
    # Check if learning matches IMPLEMENTED pattern
    for pattern in global_learnings['patterns']:
        if pattern['status'] == 'IMPLEMENTED':
            if is_same_issue(learning, pattern):
                # Pattern recurred! Mark as REGRESSED
                update_pattern_status(pattern['pattern_id'], 'REGRESSED',
                    metadata={'regressed_in': current_plan})
```

### Pattern Lifecycle → Monitoring (3-Iteration Window)

**Hook Point:** After each iteration completes (validator finishes)

```python
# Monitoring script (new utility: lib/2l-pattern-monitor.py)
def check_verification_window():
    """Check if IMPLEMENTED patterns should become VERIFIED"""
    for pattern in get_patterns_by_status('IMPLEMENTED'):
        implemented_at = pattern.get('implemented_at')
        iterations_since = count_iterations_since(implemented_at)
        
        if iterations_since >= 3:
            # 3 iterations passed, check for recurrence
            if not pattern_recurred(pattern):
                update_pattern_status(pattern['pattern_id'], 'VERIFIED',
                    metadata={'verified_at': datetime.now().isoformat()})
```

**Integration:** Call from /2l-mvp after validation passes (optional for MVP, recommended for post-MVP)

### Event Logging Integration

**All lifecycle transitions emit events:**

```bash
# In lib/2l-pattern-lifecycle.py (Python wrapper around bash)
def emit_lifecycle_event(event_type, pattern_id, status):
    """Emit event using bash logger"""
    subprocess.run([
        'bash', '-c',
        f'source ~/.claude/lib/2l-event-logger.sh && '
        f'log_2l_event "{event_type}" "Pattern {pattern_id} -> {status}" "lifecycle" "pattern-lifecycle"'
    ])
```

## Risks & Challenges

### Technical Risks

**Risk: Race Condition in Pattern Status Updates**
- **Impact:** If multiple /2l-improve instances run concurrently, pattern status could be corrupted
- **Mitigation:**
  - Use atomic_write_yaml (temp-file-and-rename is atomic at OS level)
  - Add file locking via `fcntl.flock()` (Python) or `flock` command (bash)
  - Document: "Only run one /2l-improve instance at a time"

**Risk: JSONL Growth Over Time**
- **Impact:** global-learnings.jsonl grows unbounded (one entry per learning)
- **Mitigation:**
  - Acceptable for MVP (JSONL is streamable, grep-able)
  - Post-MVP: Add rotation (archive old entries to global-learnings-YYYY.jsonl.gz)
  - Post-MVP: Consider SQLite for efficient querying (out of scope for now)

**Risk: Pattern Similarity Matching Too Conservative/Liberal**
- **Impact:** 
  - Too conservative: Duplicate patterns with different IDs
  - Too liberal: Unrelated patterns merged incorrectly
- **Mitigation:**
  - Start with exact root_cause match (conservative, current implementation)
  - Iteration 2+: Add fuzzy matching with configurable threshold
  - Let data guide tuning (observe false positives/negatives)

### Complexity Risks

**Risk: Pattern Lifecycle Monitoring Across Iterations**
- **Likelihood:** HIGH - temporal dependency is inherently complex
- **Builder split recommendation:**
  - Builder A: Basic state machine (IDENTIFIED → IMPLEMENTED)
  - Builder B: Monitoring system (IMPLEMENTED → VERIFIED after 3 iterations)
- **Rationale:** Different concerns (state validation vs. temporal tracking)

**Risk: Integration with /2l-mvp Orchestration**
- **Likelihood:** MEDIUM - /2l-improve calls /2l-mvp, needs post-completion hook
- **Challenge:** /2l-mvp exit code determines if pattern should be marked IMPLEMENTED
- **Mitigation:**
  - Simple integration: Check exit code in /2l-improve after /2l-mvp
  - Event-based: /2l-mvp emits "iteration_complete" event, pattern lifecycle listens

## Recommendations for Planner

### 1. Use Existing Atomic Write Utilities

**Recommendation:** Pattern lifecycle utility MUST use `atomic_write_yaml()` from 2l-yaml-helpers.py

**Rationale:**
- Already tested and proven (used by update_pattern_status)
- Handles temp file cleanup on errors
- Backup before write included

**Implementation:**
```python
# lib/2l-pattern-lifecycle.py
from lib.2l_yaml_helpers import atomic_write_yaml, backup_before_write

def update_pattern_lifecycle(pattern_id, new_status, metadata):
    backup_before_write(GLOBAL_LEARNINGS_PATH)
    data = load_global_learnings()
    validate_transition(pattern['status'], new_status)  # State machine
    pattern['status'] = new_status
    atomic_write_yaml(GLOBAL_LEARNINGS_PATH, data)
```

### 2. Implement State Machine Validation Early

**Recommendation:** Builder A should implement complete state machine validation (all transitions, not just IDENTIFIED → IMPLEMENTED)

**Rationale:**
- Prevents invalid states from being saved
- Acts as guard clause for future features
- Low incremental cost (just a dict + validation function)

**Implementation:**
```python
VALID_TRANSITIONS = {
    'IDENTIFIED': ['IMPLEMENTED'],
    'IMPLEMENTED': ['VERIFIED', 'REGRESSED'],
    'VERIFIED': ['REGRESSED'],
    'REGRESSED': ['IMPLEMENTED']  # Fix-and-retry cycle
}

def validate_transition(current, new):
    if new not in VALID_TRANSITIONS.get(current, []):
        raise ValueError(f"Invalid: {current} -> {new}")
```

### 3. Create Dual Storage (YAML + JSONL) from Start

**Recommendation:** Even if MVP doesn't query JSONL, create it for audit trail

**Rationale:**
- JSONL append is cheap (one line per event)
- Provides full history for debugging
- Enables post-MVP analytics (pattern trends, recurrence analysis)

**Implementation:**
```python
def append_lifecycle_event(pattern_id, old_status, new_status):
    """Append to JSONL history"""
    event = {
        'timestamp': datetime.now().isoformat(),
        'event': 'status_change',
        'pattern_id': pattern_id,
        'old_status': old_status,
        'new_status': new_status,
        'plan_id': get_current_plan()
    }
    with open('.2L/global-learnings.jsonl', 'a') as f:
        f.write(json.dumps(event) + '\n')
```

### 4. Split Pattern Lifecycle into 2 Builders

**Recommendation:** 
- **Builder A (Foundation):** Core state machine + IDENTIFIED → IMPLEMENTED
- **Builder B (Monitoring):** IMPLEMENTED → VERIFIED detection + regression monitoring

**Rationale:**
- Different temporal scopes (immediate vs. 3-iteration window)
- Builder B depends on Builder A's state machine
- Monitoring logic is complex (requires iteration counting, recurrence detection)

**Builder A delivers:**
- `lib/2l-pattern-lifecycle.py` with `update_status()` function
- State machine validation
- Integration hook in /2l-improve (post-mvp completion)
- Event emission for pattern_implemented

**Builder B delivers:**
- Monitoring script: `lib/2l-pattern-monitor.py`
- Verification detection (3 iterations without recurrence)
- Regression detection (pattern recurs after IMPLEMENTED)
- Events: pattern_verified, pattern_regressed

### 5. Make Event Logging Fire-and-Forget

**Recommendation:** All event emission should use try/except with silent failures

**Rationale:**
- Pattern lifecycle updates are critical
- Event logging is nice-to-have (observability)
- Never block state updates due to event logging failures

**Implementation:**
```python
def update_pattern_status_with_events(pattern_id, new_status):
    """Update status with optional event emission"""
    # Critical: State update
    old_status = update_pattern_status(pattern_id, new_status)
    
    # Best-effort: Event emission
    try:
        emit_lifecycle_event('pattern_' + new_status.lower(), 
                            pattern_id, new_status)
    except:
        pass  # Silent failure
```

### 6. Implement Smoke Tests for Post-Modification Validation

**Recommendation:** Create smoke test script: `lib/2l-smoke-tests.sh`

**Rationale:**
- /2l-improve modifies 2L's own code (meta-circular)
- Need to verify 2L still works after changes
- Fast sanity checks (not full validation)

**Smoke Tests:**
```bash
#!/usr/bin/env bash
# lib/2l-smoke-tests.sh

echo "Running 2L smoke tests..."

# Test 1: Event logging works
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    log_2l_event "smoke_test" "Event logging functional" "testing" "smoke-tester"
    [ -f .2L/events.jsonl ] || { echo "FAIL: Event logging"; exit 1; }
fi

# Test 2: Pattern detection runs
python3 "$HOME/.claude/lib/2l-pattern-detector.py" \
    --global-learnings .2L/global-learnings.yaml \
    --output /dev/null || { echo "FAIL: Pattern detector"; exit 1; }

# Test 3: Symlinks valid
bash "$HOME/.claude/lib/verify-symlinks.sh" || { echo "FAIL: Symlinks"; exit 1; }

# Test 4: Commands are executable
for cmd in /2l-status /2l-improve /2l-mvp; do
    which "$cmd" >/dev/null || { echo "FAIL: $cmd not found"; exit 1; }
done

echo "✅ All smoke tests passed"
```

**Integration:** Run after /2l-improve completes, before marking pattern IMPLEMENTED

## Resource Map

### Critical Files/Directories

**Existing Files to Study:**

- **lib/2l-yaml-helpers.py** - Atomic write utilities (atomic_write_yaml, backup_before_write, update_pattern_status)
- **lib/2l-pattern-detector.py** - Pattern filtering and impact scoring (calculate_impact_score, detect_recurring_patterns)
- **lib/2l-vision-generator.py** - Template substitution patterns (generate_improvement_vision)
- **lib/2l-event-logger.sh** - Event emission pattern (log_2l_event, exported function)
- **commands/2l-improve.md** - Git checkpoint creation (create_safety_checkpoint, verify_git_clean)
- **.2L/global-learnings.yaml** - YAML structure for patterns
- **.2L/events.jsonl** - JSONL structure for events
- **templates/improvement-vision.md** - Vision template with placeholders

**Files to Create:**

- **lib/2l-pattern-lifecycle.py** - State machine for pattern status transitions
  - Functions: `update_status()`, `validate_transition()`, `emit_lifecycle_event()`
  - CLI: `--pattern-id PATTERN-001 --status IMPLEMENTED --metadata-json {...}`

- **lib/2l-pattern-monitor.py** - Monitor patterns for verification
  - Functions: `check_verification_window()`, `detect_regression()`
  - CLI: `--check-verification` (run after each iteration)

- **lib/2l-smoke-tests.sh** - Post-modification validation
  - Tests: event logging, pattern detection, symlinks, command availability

- **.2L/global-learnings.jsonl** - JSONL history (append-only)
  - Structure: One line per learning/status change

**Files to Modify:**

- **commands/2l-improve.md** - Add pattern lifecycle update after /2l-mvp
  - Line ~850: Call `2l-pattern-lifecycle.py update-status`
  - Line ~870: Run smoke tests before marking IMPLEMENTED

### Key Dependencies

**Python Standard Library:**
- `yaml` (PyYAML) - YAML parsing
- `json` - JSONL writing
- `argparse` - CLI parsing
- `datetime` - ISO timestamps
- `tempfile` + `shutil` - Atomic writes
- `subprocess` - Call bash scripts from Python
- `pathlib` - Path manipulation (optional)

**Bash Utilities:**
- `git` - Checkpoint creation, rollback
- `date` - Timestamp generation
- `jq` - JSONL querying (optional, for debugging)

**2L Utilities:**
- `lib/2l-yaml-helpers.py` - Atomic YAML operations
- `lib/2l-event-logger.sh` - Event emission
- `lib/verify-symlinks.sh` - Symlink validation

### Testing Infrastructure

**Unit Tests (Python - pytest)**
```python
# tests/test_pattern_lifecycle.py
def test_validate_transition_valid():
    validate_transition('IDENTIFIED', 'IMPLEMENTED')  # Should pass

def test_validate_transition_invalid():
    with pytest.raises(ValueError):
        validate_transition('IDENTIFIED', 'VERIFIED')  # Should fail

def test_update_status_atomic():
    # Test that partial writes don't corrupt YAML
    # Mock file system error mid-write
```

**Integration Tests (Bash)**
```bash
# tests/test_pattern_lifecycle_integration.sh

# Setup: Create test global-learnings.yaml with IDENTIFIED pattern
# Action: Update to IMPLEMENTED
# Assert: YAML has correct status, JSONL has event, events.jsonl has log
```

**Smoke Tests (Post-Deployment)**
```bash
# lib/2l-smoke-tests.sh (documented above)
# Run after /2l-improve modifies 2L code
```

## Questions for Planner

### Q1: Should pattern lifecycle monitoring be active (daemon) or passive (on-demand)?

**Option A (Passive):** Run monitoring check after each iteration completes
- **Pros:** Simple, no background process, easy to debug
- **Cons:** Delayed verification (up to 3 iterations)

**Option B (Active):** Background daemon monitors patterns continuously
- **Pros:** Real-time alerts, faster verification
- **Cons:** Complexity, resource usage, requires process management

**Recommendation:** Option A (passive) for MVP. On-demand is sufficient for 3-iteration window.

### Q2: Should JSONL history include all pattern updates or just status changes?

**Option A (Status changes only):** `{event: 'status_change', old: 'IDENTIFIED', new: 'IMPLEMENTED'}`
- **Pros:** Minimal storage, focused on lifecycle
- **Cons:** Loses metadata updates (e.g., changing affected_files)

**Option B (All updates):** Include metadata changes too
- **Pros:** Complete audit trail
- **Cons:** Larger file size, more noise

**Recommendation:** Option A for MVP (status changes only). Metadata changes are rare.

### Q3: How to handle pattern ID collisions (if two /2l-improve instances run)?

**Option A (Fail fast):** Detect collision, abort second instance
- **Pros:** Safe, no corruption
- **Cons:** User must manually resolve

**Option B (Auto-increment):** Generate next available ID (PATTERN-002, PATTERN-003, ...)
- **Pros:** Automatic resolution
- **Cons:** Could hide real issues

**Recommendation:** Option A (fail fast). Document: "Only run one /2l-improve at a time."

### Q4: Should smoke tests be mandatory or optional?

**Option A (Mandatory):** Abort if smoke tests fail, don't mark pattern IMPLEMENTED
- **Pros:** Safety guarantee
- **Cons:** Blocks progress if tests are too strict

**Option B (Optional):** Warning if tests fail, let user decide
- **Pros:** Flexibility
- **Cons:** Could ship broken 2L code

**Recommendation:** Option A (mandatory) with `--skip-smoke-tests` flag for emergencies.

### Q5: Where should pattern lifecycle events be stored?

**Option A (Same file):** Append to `.2L/events.jsonl` (all events together)
- **Pros:** Single event stream, existing infrastructure
- **Cons:** Harder to filter lifecycle-specific events

**Option B (Separate file):** New `.2L/pattern-lifecycle-events.jsonl`
- **Pros:** Focused analytics, easier querying
- **Cons:** Multiple event files to monitor

**Recommendation:** Option A (same file) for MVP. Event types are already filterable.

---

**Report Status:** COMPLETE  
**Next Step:** Planner synthesizes all 3 explorer reports into master plan  
**Confidence:** HIGH (95%) - All technology patterns are well-established and proven

