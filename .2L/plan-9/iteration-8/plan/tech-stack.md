# Technology Stack

## Core Framework

**Decision:** Bash (5.0+) for orchestration, Python 3.8+ for data processing

**Rationale:**
- `/2l-improve` is already a bash script (922 lines) - maintain consistency
- Task spawning from bash script maintains existing orchestrator pattern
- Python utilities handle complex data manipulation (YAML, JSONL, pattern matching)
- Bash excels at: process orchestration, git operations, file system management
- Python excels at: structured data parsing, state machines, fuzzy matching
- Hybrid approach proven in existing 2L utilities (pattern detector, vision generator)

**Alternatives Considered:**
- Pure Python: Rejected - would require rewriting `/2l-improve`, breaking compatibility
- Pure Bash: Rejected - YAML parsing and state machines too complex in bash
- Node.js: Rejected - adds runtime dependency, no existing 2L infrastructure

**Implementation Notes:**
- Bash scripts use `#!/usr/bin/env bash` shebang for portability
- Python scripts use `#!/usr/bin/env python3` with type hints
- Cross-language integration via subprocess calls with JSON data exchange

---

## Task Tool Integration

**Decision:** Claude Code Task tool for agent spawning

**Rationale:**
- Task tool is the only mechanism for spawning parallel agents in Claude Code environment
- Proven in `/2l-mvp` orchestrator (master exploration, iteration explorers)
- Supports parallel execution (3 explorers spawn simultaneously)
- Automatic waiting for agent completion
- Agent isolation (separate contexts, no shared state)

**Alternatives Considered:**
- Background bash processes: Rejected - no agent context, can't access specialized tools
- Sequential execution: Rejected - 3x slower, loses parallelism benefit
- External API calls: Rejected - requires Claude API key, complexity overhead

**Implementation Pattern:**

```bash
# Spawn pattern (based on /2l-mvp analysis)
spawn_task(
    type="2l-explorer",
    prompt="Explorer 1: Architecture & Structure

Iteration: ${global_iter}
Requirements: ${exploration_context}
Output: ${exploration_dir}/explorer-1-report.md

Focus Area: 2L Architecture & Agent Flow

Analyze:
- /2l-mvp orchestration patterns
- Agent responsibilities (agents/*.md)
- Communication patterns (reports, events)

Working Directory: ~/Ahiya/2L
Create report at: ${exploration_dir}/explorer-1-report.md"
)
```

**Key Characteristics:**
- `type` parameter maps to agent frontmatter `name` field
- `prompt` provides agent-specific instructions with context
- Task tool handles synchronization (waits for completion)
- Agents emit their own `agent_complete` events

**Unknown Risk:** Task tool bash invocation syntax not documented
- Mitigation: Builder-1 allocated extra research time
- Fallback: Helper script `lib/2l-task-spawner.sh` if inline approach fails

---

## Data Storage

### YAML - Structured Configuration

**Decision:** PyYAML for `global-learnings.yaml` pattern database

**Rationale:**
- Human-readable and editable (developers can inspect/debug patterns)
- Hierarchical structure for complex data (patterns, metadata, source learnings)
- Already used in vision files, master plans, configuration
- Supports comments for documentation
- `yaml.safe_load()` prevents code injection attacks

**Schema Strategy:**

```yaml
schema_version: '1.0'
aggregated_at: '2025-11-27T12:00:00Z'
total_projects: 1
total_learnings: 5

patterns:
  - pattern_id: PATTERN-001
    name: "Missing System Exploration Phase"
    occurrences: 3
    projects: ["2L-self-improvement"]
    severity: medium  # critical|medium|low
    root_cause: "Lines 358-410 create placeholders not real explorers"
    proposed_solution: "Spawn 3 Task agents to analyze meditation space"
    status: IDENTIFIED  # IDENTIFIED|IMPLEMENTED|VERIFIED|REGRESSED
    discovered_in: "plan-5-iter-7"
    discovered_at: "2025-11-19T09:00:00Z"
    implemented_at: null  # ISO 8601 timestamp when IMPLEMENTED
    verified_at: null     # ISO 8601 timestamp when VERIFIED
    verification_start_iteration: null  # Iteration number when monitoring starts
    source_learnings: ["plan-5-iter-7-learning-001", "plan-6-iter-2-learning-003"]
    affected_files:
      - "commands/2l-improve.md"
      - "lib/2l-vision-generator.py"
      - "templates/improvement-vision.md"
    iteration_metadata:
      avg_duration_seconds: 3600
      avg_healing_rounds: 0
      avg_files_modified: 3
```

**Atomic Write Pattern:**

```python
# From lib/2l-yaml-helpers.py
import tempfile, shutil, yaml

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
        shutil.move(temp_path, file_path)  # OS-level atomic rename
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e
```

**Backup Strategy:**

```python
# From lib/2l-yaml-helpers.py
def backup_before_write(file_path):
    """Create .bak backup before modifying"""
    if os.path.exists(file_path):
        backup_path = file_path + '.bak'
        shutil.copy2(file_path, backup_path)
        return backup_path
    return None
```

### JSONL - Append-Only Event Logs

**Decision:** JSON Lines format for `.2L/events.jsonl` and `.2L/global-learnings.jsonl`

**Rationale:**
- Append-only guarantees no file corruption from partial writes
- Streamable (can process with `tail -f`, `grep`, `jq`)
- No need to parse entire file to add entry (O(1) append)
- Natural chronological ordering
- Concurrent-safe (appends are atomic at filesystem level)
- Easy to analyze with standard Unix tools

**Event Log Structure:**

```jsonl
{"timestamp":"2025-11-27T12:00:00Z","event_type":"exploration_start","phase":"exploration","agent_id":"2l-improve","data":"Starting system exploration for PATTERN-001"}
{"timestamp":"2025-11-27T12:00:01Z","event_type":"agent_spawn","phase":"exploration","agent_id":"explorer-1","data":"Explorer-1: Architecture Analysis"}
{"timestamp":"2025-11-27T12:05:23Z","event_type":"agent_complete","phase":"exploration","agent_id":"explorer-1","data":"Completed architecture analysis"}
{"timestamp":"2025-11-27T12:30:00Z","event_type":"pattern_implemented","phase":"self_modification","agent_id":"2l-improve","data":"Pattern PATTERN-001 -> IMPLEMENTED"}
```

**Learning History Structure:**

```jsonl
{"learning_id":"plan-9-iter-8-learning-001","timestamp":"2025-11-27T12:00:00Z","project":"2L-self-improvement","plan":"plan-9","iteration":8,"category":"functionality","issue":"Task spawning from bash unknown","severity":"high","root_cause":"No documentation for Task tool invocation","suggested_fix":"Research and document pattern","pattern_id":"PATTERN-002"}
```

**Append Pattern:**

```python
import json
from datetime import datetime

def append_lifecycle_event(pattern_id, old_status, new_status):
    """Append status change to JSONL history"""
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

---

## Git Safety Infrastructure

**Decision:** Git checkpoints with tagged commits for rollback capability

**Rationale:**
- Meditation space is a git repository (`~/Ahiya/2L`)
- Checkpoints provide instant rollback if self-modification fails
- Tags persist indefinitely (never garbage collected)
- Commit + tag is atomic operation
- No external dependencies (git already required)

**Checkpoint Pattern:**

```bash
# From commands/2l-improve.md
function create_safety_checkpoint() {
    local pattern_id="$1"

    echo "   Creating pre-modification safety checkpoint..."

    # Commit current state (allow empty for idempotence)
    git add -A
    git commit -m "Pre-improvement checkpoint: ${pattern_id}" \
        --allow-empty > /dev/null 2>&1 || {
        echo "      (No changes to commit - working directory clean)"
    }

    # Tag checkpoint with timestamp for uniqueness
    local timestamp=$(date +%s)
    local checkpoint_tag="pre-${pattern_id}-${timestamp}"
    git tag "$checkpoint_tag"

    echo "   ✅ Safety checkpoint: $checkpoint_tag"
    echo "$checkpoint_tag"  # Return tag name for logging
}
```

**Rollback Pattern:**

```bash
# List available checkpoints
git tag -l "pre-PATTERN-*"

# Rollback to specific checkpoint
git reset --hard <checkpoint_tag>

# Verify symlinks after rollback
bash ~/.claude/lib/verify-symlinks.sh
```

**Safety Validations:**

```bash
# 1. Git Clean Check
function verify_git_clean() {
    if ! git diff-index --quiet HEAD --; then
        echo "❌ ERROR: Git working directory has uncommitted changes"
        git status --short
        read -p "Override and proceed anyway? (y/N): " override
        [[ "$override" =~ ^[Yy]$ ]] || return 1
    fi
    return 0
}

# 2. Orchestrator Exclusion (CRITICAL)
function verify_orchestrator_exclusion() {
    local vision_path="$1"

    if grep -q "commands/2l-mvp.md" "$vision_path"; then
        echo "❌ CRITICAL: Vision attempts to modify orchestrator"
        echo "   Orchestrator exclusion policy violated"
        return 2  # Fatal error
    fi
    return 0
}

# 3. Symlink Validation
function verify_symlinks() {
    bash "$HOME/.claude/lib/verify-symlinks.sh" || {
        echo "❌ ERROR: Symlink integrity check failed"
        return 1
    }
    return 0
}
```

---

## Event Emission

**Decision:** Bash event logger library with fire-and-forget pattern

**Rationale:**
- Centralized event emission logic in `lib/2l-event-logger.sh`
- Graceful degradation (events never block execution)
- Exported function available to all sourcing scripts
- JSON format for structured logging
- ISO 8601 timestamps for consistency

**Event Logger Library:**

```bash
# lib/2l-event-logger.sh
log_2l_event() {
  local event_type="$1"
  local data="$2"
  local phase="${3:-unknown}"
  local agent_id="${4:-orchestrator}"

  # Validate required parameters
  [ -z "$event_type" ] || [ -z "$data" ] && return 1

  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local event_file=".2L/events.jsonl"

  # Create .2L directory if needed (silent)
  mkdir -p .2L 2>/dev/null || true

  # Escape double quotes in data
  event_type="${event_type//\"/\\\"}"
  data="${data//\"/\\\"}"

  # Build JSON and append (atomic, fails silently)
  local json_event="{\"timestamp\":\"$timestamp\",\"event_type\":\"$event_type\",\"phase\":\"$phase\",\"agent_id\":\"$agent_id\",\"data\":\"$data\"}"
  echo "$json_event" >> "$event_file" 2>/dev/null || true
}

export -f log_2l_event
```

**Usage Pattern:**

```bash
# Source library (graceful if missing)
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"

    # Emit events conditionally
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "agent_spawn" "Explorer-1: Architecture" "exploration" "explorer-1"
    fi
fi
```

**Event Types for Iteration 8:**

| Event Type | Phase | Description |
|------------|-------|-------------|
| `exploration_start` | exploration | Beginning of exploration phase |
| `agent_spawn` | exploration | Per-agent spawn notification (x3) |
| `agent_complete` | exploration | Per-agent completion (emitted by agents) |
| `exploration_complete` | exploration | All explorers finished |
| `pattern_implemented` | self_modification | Pattern status → IMPLEMENTED |
| `validation_start` | validation | Smoke tests beginning |
| `validation_pass` | validation | Smoke tests succeeded |

---

## Python Utilities Architecture

### Pattern Lifecycle Manager

**Decision:** Python 3.8+ with type hints, dataclasses, and pathlib

**File:** `lib/2l-pattern-lifecycle.py`

**Structure:**

```python
#!/usr/bin/env python3
"""Pattern Lifecycle Manager - Track patterns from detection to verification."""

import yaml
import json
import argparse
import sys
import os
import tempfile
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List

class PatternLifecycleManager:
    """Manage pattern status transitions with state validation."""

    VALID_STATUSES = ['IDENTIFIED', 'IMPLEMENTED', 'VERIFIED', 'REGRESSED']

    VALID_TRANSITIONS = {
        'IDENTIFIED': ['IMPLEMENTED'],
        'IMPLEMENTED': ['VERIFIED', 'REGRESSED'],
        'VERIFIED': ['REGRESSED'],
        'REGRESSED': ['IMPLEMENTED']
    }

    def __init__(self, global_learnings_path: str = '.2L/global-learnings.yaml'):
        self.learnings_path = Path(global_learnings_path)

    def update_status(self, pattern_id: str, new_status: str,
                     metadata: Optional[Dict] = None) -> Dict:
        """Update pattern status with validation and atomic write."""
        # Load current state
        data = self._load_learnings()

        # Find pattern
        pattern = self._find_pattern(data, pattern_id)
        if not pattern:
            raise ValueError(f"Pattern {pattern_id} not found")

        # Validate transition
        current_status = pattern.get('status', 'IDENTIFIED')
        self._validate_transition(current_status, new_status)

        # Update status and metadata
        pattern['status'] = new_status
        pattern['status_updated_at'] = datetime.now().isoformat()

        if new_status == 'IMPLEMENTED':
            pattern['implemented_at'] = datetime.now().isoformat()
            if metadata:
                pattern['implemented_in_plan'] = metadata.get('plan_id')
                pattern['verification_start_iteration'] = metadata.get('iteration', 0) + 1

        if metadata:
            pattern.update(metadata)

        # Atomic write with backup
        self._backup_before_write()
        self._atomic_write_yaml(data)

        # Append to JSONL history
        self._append_lifecycle_event(pattern_id, current_status, new_status)

        return pattern

    def _validate_transition(self, current: str, new: str):
        """Validate state machine transition."""
        if new not in self.VALID_TRANSITIONS.get(current, []):
            valid = self.VALID_TRANSITIONS.get(current, [])
            raise ValueError(
                f"Invalid transition: {current} -> {new}. "
                f"Valid transitions from {current}: {valid}"
            )

    def _atomic_write_yaml(self, data: Dict):
        """Write YAML atomically using temp file + rename."""
        temp_fd, temp_path = tempfile.mkstemp(
            dir=self.learnings_path.parent,
            prefix='.tmp_',
            suffix='.yaml'
        )
        try:
            with os.fdopen(temp_fd, 'w') as f:
                yaml.dump(data, f, default_flow_style=False, sort_keys=False)
            shutil.move(temp_path, self.learnings_path)
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    def _backup_before_write(self):
        """Create .bak backup before modifying."""
        if self.learnings_path.exists():
            backup_path = str(self.learnings_path) + '.bak'
            shutil.copy2(self.learnings_path, backup_path)

    def _append_lifecycle_event(self, pattern_id: str, old_status: str, new_status: str):
        """Append status change to JSONL history."""
        event = {
            'timestamp': datetime.now().isoformat(),
            'event': 'status_change',
            'pattern_id': pattern_id,
            'old_status': old_status,
            'new_status': new_status
        }

        jsonl_path = self.learnings_path.parent / 'global-learnings.jsonl'
        with open(jsonl_path, 'a') as f:
            f.write(json.dumps(event) + '\n')
```

**CLI Interface:**

```bash
# Update pattern status
python3 lib/2l-pattern-lifecycle.py update \
    --pattern-id PATTERN-001 \
    --status IMPLEMENTED \
    --plan-id plan-9 \
    --iteration 8

# Get pattern status
python3 lib/2l-pattern-lifecycle.py get-status \
    --pattern-id PATTERN-001

# List patterns by status
python3 lib/2l-pattern-lifecycle.py list \
    --status IMPLEMENTED
```

### Vision Generator Enhancement

**File:** `lib/2l-vision-generator.py` (modify existing)

**New Functionality:**

```python
def generate_improvement_vision(pattern, plan_id, template_path, exploration_dir=None):
    """Generate vision with optional exploration context."""

    # Read template
    with open(template_path, 'r') as f:
        template = f.read()

    # Extract exploration context if available
    exploration_context = ""
    if exploration_dir and os.path.exists(exploration_dir):
        for i in range(1, 4):
            report_path = f"{exploration_dir}/explorer-{i}-report.md"
            if os.path.exists(report_path):
                with open(report_path, 'r') as f:
                    report = f.read()
                    exploration_context += extract_key_sections(report, i)

    # Build replacements
    replacements = {
        '{PATTERN_ID}': pattern['pattern_id'],
        '{PATTERN_NAME}': pattern['name'],
        '{ROOT_CAUSE}': pattern['root_cause'],
        '{PROPOSED_SOLUTION}': pattern['proposed_solution'],
        '{PLAN_ID}': plan_id,
        '{EXPLORATION_CONTEXT}': exploration_context or "No exploration data available"
    }

    # Apply replacements
    vision = template
    for placeholder, value in replacements.items():
        vision = vision.replace(placeholder, value)

    return vision

def extract_key_sections(markdown_text, explorer_id):
    """Extract relevant sections from explorer report."""
    import re

    output = f"\n### Explorer {explorer_id} Findings\n\n"

    # Extract sections
    for section in ["Integration Points", "Affected Components", "Recommendations"]:
        pattern = f"## {section}.*?(?=\n## |\Z)"
        match = re.search(pattern, markdown_text, re.DOTALL)
        if match:
            output += match.group(0) + "\n\n"

    return output
```

---

## Testing Infrastructure

### Smoke Tests

**Decision:** Bash script (`lib/2l-smoke-tests.sh`) for post-modification validation

**Purpose:** Verify 2L framework still functional after self-modification

**Tests:**

```bash
#!/usr/bin/env bash
# lib/2l-smoke-tests.sh
# Post-modification smoke tests to verify 2L framework health

set -e

echo "Running 2L smoke tests..."

# Test 1: Event logging works
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    log_2l_event "smoke_test" "Event logging functional" "testing" "smoke-tester"
    [ -f .2L/events.jsonl ] || { echo "FAIL: Event logging"; exit 1; }
    echo "  ✓ Event logging"
fi

# Test 2: Pattern detection runs
python3 "$HOME/.claude/lib/2l-pattern-detector.py" \
    --global-learnings .2L/global-learnings.yaml \
    --output /dev/null || { echo "FAIL: Pattern detector"; exit 1; }
echo "  ✓ Pattern detector"

# Test 3: Symlinks valid
bash "$HOME/.claude/lib/verify-symlinks.sh" || { echo "FAIL: Symlinks"; exit 1; }
echo "  ✓ Symlinks"

# Test 4: Commands executable
for cmd in /2l-status /2l-improve /2l-mvp; do
    which "$cmd" >/dev/null || { echo "FAIL: $cmd not found"; exit 1; }
done
echo "  ✓ Commands"

# Test 5: Agent definitions valid
for agent in ~/.claude/agents/*.md; do
    grep -q "^---$" "$agent" || { echo "FAIL: Invalid frontmatter in $agent"; exit 1; }
done
echo "  ✓ Agent definitions"

echo "✅ All smoke tests passed"
```

### Integration Tests

**Decision:** Manual end-to-end test with PATTERN-001 as validation case

**Test Scenario:**

```bash
# Setup
echo "Testing complete /2l-improve cycle..."

# Step 1: Verify PATTERN-001 exists in IDENTIFIED state
pattern_status=$(python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
    for p in data.get('patterns', []):
        if p['pattern_id'] == 'PATTERN-001':
            print(p['status'])
")

[ "$pattern_status" = "IDENTIFIED" ] || {
    echo "FAIL: PATTERN-001 not in IDENTIFIED state"
    exit 1
}

# Step 2: Run /2l-improve
/2l-improve --pattern PATTERN-001

# Step 3: Verify explorers generated real reports
for i in 1 2 3; do
    report=".2L/plan-9/exploration/explorer-${i}-report.md"
    [ -f "$report" ] || { echo "FAIL: Missing $report"; exit 1; }

    # Verify not placeholder
    grep -q "Placeholder" "$report" && {
        echo "FAIL: $report is still placeholder"
        exit 1
    }
done
echo "✓ Explorer reports generated"

# Step 4: Verify vision contains exploration context
vision=".2L/plan-9/vision.md"
grep -q "Exploration Findings" "$vision" || {
    echo "FAIL: Vision missing exploration context"
    exit 1
}
echo "✓ Vision enhanced with exploration"

# Step 5: Verify pattern status updated to IMPLEMENTED
new_status=$(python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
    for p in data.get('patterns', []):
        if p['pattern_id'] == 'PATTERN-001':
            print(p['status'])
")

[ "$new_status" = "IMPLEMENTED" ] || {
    echo "FAIL: Pattern not marked IMPLEMENTED"
    exit 1
}
echo "✓ Pattern lifecycle updated"

echo "✅ Integration test passed"
```

---

## Environment Variables

**Required:**
- None - all utilities use filesystem paths

**Optional:**
- `EVENT_LOGGING_ENABLED` - Set to `true` to enable event emission (default: true)
- `GLOBAL_LEARNINGS` - Override path to global-learnings.yaml (default: `.2L/global-learnings.yaml`)

---

## Dependencies Overview

### Python Packages
- **PyYAML** (`pip install pyyaml`) - YAML parsing and writing
  - Version: 6.0+
  - Purpose: Pattern database, vision files, master plans
- **Standard Library:**
  - `argparse` - CLI parsing
  - `json` - JSONL writing
  - `datetime` - ISO 8601 timestamps
  - `tempfile` + `shutil` - Atomic file operations
  - `pathlib` - Path manipulation
  - `subprocess` - Bash script invocation from Python
  - `re` - Regular expressions for report parsing

### Bash Utilities
- **git** (2.0+) - Safety checkpoints, rollback
- **date** - ISO 8601 timestamp generation
- **jq** (optional) - JSONL querying and analysis
- **grep**, **sed**, **awk** - Text processing

### 2L Framework Libraries
- `lib/2l-event-logger.sh` - Event emission
- `lib/2l-yaml-helpers.py` - Atomic YAML operations
- `lib/verify-symlinks.sh` - Symlink validation
- `lib/2l-pattern-detector.py` - Pattern detection (reference)
- `lib/2l-vision-generator.py` - Vision generation (to enhance)

---

## Performance Targets

**Exploration Phase:**
- Explorer spawn time: < 5 seconds (3 agents in parallel)
- Individual explorer execution: < 2 minutes per agent
- Total exploration phase: < 3 minutes (including synchronization)

**Pattern Lifecycle Update:**
- Status transition: < 100ms (YAML read + write + backup)
- JSONL append: < 10ms (single line write)

**Vision Generation:**
- With exploration context: < 5 seconds (template + 3 report parsing)
- Without exploration: < 1 second (template only)

**Safety Checkpoints:**
- Git commit + tag: < 2 seconds
- Symlink verification: < 1 second

**Total `/2l-improve` Execution:**
- Pattern detection: 1-2 seconds
- Exploration: 2-3 minutes
- Vision generation: 5 seconds
- Safety validation: 3 seconds
- `/2l-mvp` invocation: 6-10 hours (full iteration)
- Pattern status update: < 1 second
- **Total (excluding `/2l-mvp`):** < 4 minutes overhead

---

## Security Considerations

**1. Orchestrator Exclusion (CRITICAL)**
- How addressed: `verify_orchestrator_exclusion()` function in `/2l-improve`
- Validation: Vision content scanned for `commands/2l-mvp.md` references
- Action: Fatal error (exit code 2) if violation detected
- Rationale: Prevent meta-circular recursion bugs that corrupt orchestrator

**2. YAML Code Injection**
- How addressed: `yaml.safe_load()` instead of `yaml.load()`
- Mitigation: safe_load prevents arbitrary code execution
- Validation: All YAML parsing uses safe methods

**3. File System Race Conditions**
- How addressed: Atomic writes (temp-file-and-rename pattern)
- Guarantee: OS-level atomic rename prevents partial writes
- Backup: `.bak` file created before every modification

**4. Git Checkpoint Integrity**
- How addressed: `--allow-empty` prevents commit failures on clean state
- Uniqueness: Timestamp in tag name prevents collisions
- Persistence: Tags never deleted (full audit trail)

**5. Event Injection Attacks**
- How addressed: Quote escaping in event logger
- Pattern: `event_type="${event_type//\"/\\\"}"`
- Result: Double quotes in data escaped before JSON serialization

**6. Symlink Manipulation**
- How addressed: Validation before and after self-modification
- Script: `lib/verify-symlinks.sh` checks all critical symlinks
- Critical paths: `~/.claude/agents/`, `~/.claude/commands/`, `~/.claude/lib/`

---

**Tech Stack Status:** COMPREHENSIVE
**Confidence:** 95% (High on established patterns, medium on Task tool API)
**Next:** patterns.md - Detailed code examples for all operations
