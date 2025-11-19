# Code Patterns & Conventions

## File Structure

```
~/Ahiya/2L/
├── .2L/                           # 2L's self-reflection space
│   ├── config.yaml
│   ├── events.jsonl
│   ├── global-learnings.yaml      # NEW: Aggregated learnings
│   └── plan-{N}/
│       └── iteration-{M}/
│           ├── exploration/
│           ├── plan/
│           ├── building/
│           ├── integration/
│           ├── validation/
│           │   └── validation-report.md
│           ├── healing-1/         # If healing needed
│           │   └── validation-report.md  # Re-validation result
│           └── learnings.yaml     # NEW: Per-iteration learnings
│
├── Prod/                          # Projects 2L builds
│   ├── wealth/
│   │   └── .2L/
│   │       └── plan-{N}/iteration-{M}/learnings.yaml
│   └── ai-mafia/
│       └── .2L/
│           └── plan-{N}/iteration-{M}/learnings.yaml
│
├── agents/
│   └── 2l-validator.md           # MODIFIED: Add learning capture
│
├── commands/
│   └── 2l-mvp.md                 # MODIFIED: Add re-validation + reflection
│
└── lib/
    ├── 2l-event-logger.sh        # Existing: Event emission
    └── 2l-yaml-helpers.py        # NEW: YAML operations
```

---

## Naming Conventions

**Files:**
- Learning files: `learnings.yaml` (per-iteration)
- Global aggregation: `global-learnings.yaml`
- YAML helpers: `2l-yaml-helpers.py` (prefix with 2l-)
- Backup files: `global-learnings.yaml.bak`
- Temp files: `.tmp_*.yaml` (prefix with dot, cleaned up on error)

**Functions:**
- Python functions: snake_case (`atomic_write_yaml`, `generate_learning_id`)
- Bash functions: snake_case (`verify_symlinks`, `extract_validation_status`)

**Variables:**
- Python variables: snake_case (`global_data`, `learning_id`)
- Bash variables: snake_case (`validation_status`, `healing_attempt`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_HEALING_ATTEMPTS`)

**YAML Fields:**
- Learning IDs: `{project}-{YYYYMMDD}-{NNN}` (e.g., `wealth-20251119-001`)
- Pattern IDs: `PATTERN-{NNN}` (e.g., `PATTERN-001`)
- Timestamps: ISO 8601 format (`2025-11-19T15:30:00Z`)
- Status values: SCREAMING_SNAKE_CASE (`IDENTIFIED`, `IMPLEMENTED`, `VERIFIED`)

---

## YAML Schema Patterns

### Per-Iteration Learnings Schema

**When to use:** Validator creates this when validation fails

**File location:** `.2L/{plan}/iteration-{N}/learnings.yaml`

**Code example:**
```yaml
schema_version: "1.0"
project: "wealth"
plan: "plan-3"
iteration: "iteration-2"
created_at: "2025-11-19T15:30:00Z"

learnings:
  - id: "wealth-20251119-001"
    iteration: "plan-3-iter-2"
    category: "validation"
    severity: "critical"
    issue: "TypeScript compilation failed: Cannot find module 'lib/supabase'"
    root_cause: "Missing import path in tsconfig.json paths configuration"
    solution: "Add 'lib/*': ['src/lib/*'] to tsconfig.json compilerOptions.paths"
    recurrence_risk: "high"
    affected_files:
      - "tsconfig.json"
      - "src/components/AuthProvider.tsx"

  - id: "wealth-20251119-002"
    iteration: "plan-3-iter-2"
    category: "integration"
    severity: "medium"
    issue: "Duplicate Button component implementations in zones 1 and 3"
    root_cause: "Builders working in parallel created separate implementations"
    solution: "Consolidate to single Button component in src/components/ui/"
    recurrence_risk: "medium"
    affected_files:
      - "src/components/ui/Button.tsx"
      - "src/components/layout/Button.tsx"
```

**Key points:**
- `schema_version` enables future migrations
- `category`: "validation" | "integration" | "healing"
- `severity`: "critical" | "medium" | "low"
- `recurrence_risk`: "high" | "medium" | "low"
- `affected_files`: List of file paths (relative to project root)
- `root_cause`: Use "UNKNOWN - requires investigation" if unclear

---

### Global Learnings Schema

**When to use:** Orchestrator reflection merges iteration learnings here

**File location:** `.2L/global-learnings.yaml`

**Code example:**
```yaml
schema_version: "1.0"
aggregated_at: "2025-11-19T16:00:00Z"
total_projects: 7
total_learnings: 45

patterns:
  - pattern_id: "PATTERN-001"
    name: "TypeScript path resolution failures"
    occurrences: 3
    projects: ["wealth", "ai-mafia", "ShipLog"]
    severity: "critical"
    root_cause: "tsconfig.json paths not configured before builders create imports"
    proposed_solution: "Add tsconfig.json validation to planner phase"
    status: "IDENTIFIED"
    discovered_in: "plan-3-iter-2"
    discovered_at: "2025-11-19T15:30:00Z"
    source_learnings:
      - "wealth-20251119-001"
      - "ai-mafia-20251015-003"
      - "shiplog-20251012-002"
    iteration_metadata:
      duration_seconds: 3240
      healing_rounds: 1
      files_modified: 8

  - pattern_id: "PATTERN-002"
    name: "Duplicate component implementations"
    occurrences: 2
    projects: ["wealth", "SplitEasy"]
    severity: "medium"
    root_cause: "Integration planner doesn't check for duplicate file names across zones"
    proposed_solution: "Add duplicate detection to iplanner zone assignment"
    status: "IMPLEMENTED"
    discovered_in: "plan-2-iter-1"
    implemented_in: "plan-5-iter-2"
    implemented_at: "2025-11-20T10:15:00Z"
    source_learnings:
      - "wealth-20251119-002"
      - "spliteasy-20251110-005"
```

**Key points:**
- `status`: "IDENTIFIED" (new) | "IMPLEMENTED" (fixed) | "VERIFIED" (confirmed working)
- `discovered_in`: plan-iteration where first seen (e.g., "plan-3-iter-2")
- `implemented_in`: plan-iteration where fix applied (set by /2l-improve in iteration 2)
- `verified_at`: timestamp when validation confirmed fix works
- `iteration_metadata`: enriched by orchestrator (duration, healing_rounds, files_modified)

---

## Atomic File Write Pattern

**When to use:** Modifying global-learnings.yaml to prevent corruption

**Code example:**
```python
import os
import tempfile
import shutil
import yaml

def atomic_write_yaml(file_path, data):
    """
    Write YAML data atomically to prevent corruption.
    Uses temp file + rename for atomic operation.

    Args:
        file_path: Target YAML file path
        data: Python dict to write as YAML

    Raises:
        Exception: If write fails (temp file cleaned up automatically)
    """
    # Create temp file in same directory (ensures same filesystem)
    dir_path = os.path.dirname(file_path) or '.'
    temp_fd, temp_path = tempfile.mkstemp(
        dir=dir_path,
        prefix='.tmp_',
        suffix='.yaml'
    )

    try:
        # Write YAML to temp file
        with os.fdopen(temp_fd, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)

        # Atomic rename (replaces existing file)
        shutil.move(temp_path, file_path)

    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e

# Usage example:
global_data = {
    'schema_version': '1.0',
    'aggregated_at': datetime.now().isoformat(),
    'patterns': [...]
}

atomic_write_yaml('.2L/global-learnings.yaml', global_data)
```

**Key points:**
- Temp file in same directory ensures same filesystem (atomic rename)
- Use os.fdopen() with temp file descriptor (secure)
- shutil.move() uses os.rename() which is atomic on POSIX
- Clean up temp file on error (no orphaned files)
- If process crashes, file is either old or new version (never corrupted)

---

## Backup Before Write Pattern

**When to use:** Before modifying global-learnings.yaml

**Code example:**
```python
def backup_before_write(file_path):
    """
    Create .bak backup of file before modifying.

    Args:
        file_path: File to backup

    Returns:
        backup_path: Path to backup file
    """
    if os.path.exists(file_path):
        backup_path = file_path + '.bak'
        shutil.copy2(file_path, backup_path)
        return backup_path
    return None

# Usage example:
global_learnings_path = '.2L/global-learnings.yaml'

# Backup before modification
backup_path = backup_before_write(global_learnings_path)

try:
    # Modify file atomically
    atomic_write_yaml(global_learnings_path, global_data)
except Exception as e:
    print(f"ERROR: Failed to write global learnings: {e}")
    if backup_path:
        print(f"Backup available at: {backup_path}")
    raise
```

**Key points:**
- Use shutil.copy2() to preserve metadata (timestamps)
- Backup before atomic write (safety net if write succeeds but data is wrong)
- Keep backup after successful write (manual recovery option)
- No automatic cleanup of .bak files (human decides when to delete)

---

## Learning ID Generation Pattern

**When to use:** Validator creates learnings.yaml, needs unique IDs

**Code example:**
```python
from datetime import datetime

def generate_learning_id(project_name, existing_learnings):
    """
    Generate unique learning ID: project-YYYYMMDD-NNN

    Args:
        project_name: Name of project (e.g., "wealth", "ai-mafia")
        existing_learnings: List of existing learning dicts in same file

    Returns:
        learning_id: Unique ID string (e.g., "wealth-20251119-001")
    """
    # Get date in YYYYMMDD format
    date_str = datetime.now().strftime("%Y%m%d")

    # Count existing learnings (sequence number)
    next_seq = len(existing_learnings) + 1

    # Format: project-YYYYMMDD-NNN
    return f"{project_name}-{date_str}-{next_seq:03d}"

# Usage example in validator:
project_name = "wealth"
learnings_data = {
    'schema_version': '1.0',
    'project': project_name,
    'learnings': []
}

# Generate ID for first learning
learning_id = generate_learning_id(project_name, learnings_data['learnings'])
# Result: "wealth-20251119-001"

# Add learning
learnings_data['learnings'].append({
    'id': learning_id,
    'iteration': 'plan-3-iter-2',
    # ... rest of learning fields
})

# Generate ID for second learning
learning_id_2 = generate_learning_id(project_name, learnings_data['learnings'])
# Result: "wealth-20251119-002"
```

**Key points:**
- Format: `{project}-{YYYYMMDD}-{NNN}` (human-readable, sortable)
- Sequence number prevents collisions within same day
- Use 3-digit zero-padded sequence (001, 002, ... 999)
- Count existing learnings in current file (not global count)

---

## Validator Learning Capture Pattern

**When to use:** Validator detects FAIL status, needs to create learnings.yaml

**Code example:**
```python
import yaml
from datetime import datetime

def extract_learnings_from_validation_report(validation_report_path):
    """
    Parse validation report to extract learnings.

    Args:
        validation_report_path: Path to validation-report.md

    Returns:
        learnings: List of learning dicts
    """
    learnings = []

    # Read validation report
    with open(validation_report_path, 'r') as f:
        content = f.read()

    # Parse critical issues (example - actual parsing depends on report format)
    # This is a simplified example - real implementation parses markdown structure
    if "### Critical Issues" in content:
        # Extract critical issues
        # For each issue, create learning dict:
        learnings.append({
            'category': 'validation',
            'severity': 'critical',
            'issue': "TypeScript compilation failed: Cannot find module 'lib/supabase'",
            'root_cause': "Missing import path in tsconfig.json",
            'solution': "Add 'lib/*': ['src/lib/*'] to tsconfig.json",
            'recurrence_risk': 'high',
            'affected_files': ['tsconfig.json', 'src/components/AuthProvider.tsx']
        })

    return learnings

def create_learnings_yaml(validation_dir, project_name, plan_id, iteration_id):
    """
    Create learnings.yaml from validation failures.

    Args:
        validation_dir: Directory containing validation-report.md
        project_name: Name of project
        plan_id: Current plan (e.g., "plan-3")
        iteration_id: Current iteration (e.g., "iteration-2")
    """
    validation_report_path = os.path.join(validation_dir, 'validation-report.md')

    # Extract learnings from report
    learnings_list = extract_learnings_from_validation_report(validation_report_path)

    if not learnings_list:
        # No learnings to capture
        return

    # Build learnings data structure
    learnings_data = {
        'schema_version': '1.0',
        'project': project_name,
        'plan': plan_id,
        'iteration': iteration_id,
        'created_at': datetime.now().isoformat(),
        'learnings': []
    }

    # Generate IDs and add learnings
    for learning in learnings_list:
        learning_id = generate_learning_id(project_name, learnings_data['learnings'])
        learning['id'] = learning_id
        learning['iteration'] = f"{plan_id}-{iteration_id.replace('iteration-', 'iter-')}"
        learnings_data['learnings'].append(learning)

    # Write learnings.yaml
    learnings_path = os.path.join(validation_dir, 'learnings.yaml')

    try:
        with open(learnings_path, 'w') as f:
            yaml.dump(learnings_data, f, default_flow_style=False, sort_keys=False)

        print(f"   📝 Created learnings.yaml with {len(learnings_list)} learning(s)")

    except Exception as e:
        # Graceful degradation - log warning but don't block validation
        print(f"   ⚠️  Warning: Failed to create learnings.yaml: {e}")
        print(f"   ⚠️  Continuing without learning capture (non-critical)")

# Usage in validator agent (after writing validation-report.md):
if validation_status == 'FAIL':
    create_learnings_yaml(
        validation_dir='.2L/plan-3/iteration-2/validation',
        project_name='wealth',
        plan_id='plan-3',
        iteration_id='iteration-2'
    )
```

**Key points:**
- Extract learnings after validation report is written
- Parse "Critical Issues" section of validation report
- Use graceful degradation (try/except, log warning, continue on failure)
- Print user-friendly message on success/failure
- Don't block validation if learning capture fails

---

## Orchestrator Re-validation Pattern

**When to use:** Orchestrator needs to re-run validation after healing

**Code example:**
```bash
# In orchestrator healing loop (commands/2l-mvp.md)

MAX_HEALING_ATTEMPTS=2
healing_attempt=1

while [ $healing_attempt -le $MAX_HEALING_ATTEMPTS ]; do
    echo "   🔄 Healing attempt $healing_attempt of $MAX_HEALING_ATTEMPTS..."

    # Spawn healer(s) to fix issues
    spawn_healers

    # Wait for healing to complete
    wait_for_healers

    # Re-validation checkpoint (NEW)
    echo "   🔍 Re-validating after healing..."

    # EVENT: Re-validation start
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "phase_change" "Starting re-validation after healing attempt $healing_attempt" "validation" "orchestrator"
    fi

    # Spawn validator again
    healing_dir=".2L/plan-${plan_id}/iteration-${global_iter}/healing-${healing_attempt}"
    validation_report_path="${healing_dir}/validation-report.md"

    spawn_task \
        type="2l-validator" \
        prompt="Re-validate after healing attempt ${healing_attempt}.

Run full validation suite again to verify healing fixed the issues.

Create report at: ${validation_report_path}"

    # Extract re-validation status
    validation_status=$(extract_validation_status "$validation_report_path")

    # EVENT: Re-validation result
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "validation_result" "Re-validation attempt $healing_attempt: ${validation_status}" "validation" "validator-revalidation"
    fi

    # Check re-validation result
    if [ "$validation_status" = "PASS" ]; then
        echo "      ✅ Re-validation passed! Healing successful."

        # EVENT: Iteration complete after healing
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "iteration_complete" "Iteration ${global_iter} completed after ${healing_attempt} healing round(s)" "complete" "orchestrator"
        fi

        # Proceed to orchestrator reflection
        break

    elif [ $healing_attempt -lt $MAX_HEALING_ATTEMPTS ]; then
        echo "      ❌ Re-validation failed. Attempting healing round 2..."

        # Check if healing made any changes
        git_diff=$(git diff --stat)
        if [ -z "$git_diff" ]; then
            echo "      ⚠️  ERROR: Healing made no changes. Escalating to manual intervention."
            exit 1
        fi

        healing_attempt=$((healing_attempt + 1))
        continue

    else
        echo "      ❌ Re-validation failed after $MAX_HEALING_ATTEMPTS healing attempts."
        echo "      ⚠️  MANUAL INTERVENTION REQUIRED"
        echo "      📄 See validation report: ${validation_report_path}"
        exit 1
    fi
done
```

**Key points:**
- Hard-coded limit: `MAX_HEALING_ATTEMPTS=2`
- Re-spawn validator after each healing attempt
- Emit events for dashboard observability
- Check if healing made changes (git diff) before second attempt
- Escalate to manual intervention after max attempts
- Distinguish re-validation events from first-pass validation

---

## Orchestrator Reflection Pattern

**When to use:** After validation PASSES, before git commit

**Code example:**
```bash
# In orchestrator after validation PASS (commands/2l-mvp.md)

function orchestrator_reflection() {
    local plan_id="$1"
    local global_iter="$2"
    local iteration_dir="$3"

    echo "   🧘 Orchestrator reflection: Merging learnings into global knowledge base..."

    # Check if learnings.yaml exists
    learnings_path="${iteration_dir}/learnings.yaml"

    if [ ! -f "$learnings_path" ]; then
        echo "      ℹ️  No learnings.yaml found. Iteration had no failures to learn from."
        return 0
    fi

    # Calculate iteration metadata
    iteration_start_time=$(cat "${iteration_dir}/.start_time" 2>/dev/null || echo "0")
    iteration_end_time=$(date +%s)
    duration_seconds=$((iteration_end_time - iteration_start_time))

    # Count healing rounds
    healing_rounds=0
    for healing_dir in "${iteration_dir}"/healing-*; do
        if [ -d "$healing_dir" ]; then
            healing_rounds=$((healing_rounds + 1))
        fi
    done

    # Count files modified
    files_modified=$(git diff --name-only HEAD~1 2>/dev/null | wc -l)

    # Call Python helper to merge learnings
    python3 ~/.claude/lib/2l-yaml-helpers.py merge_learnings \
        --iteration-learnings "$learnings_path" \
        --global-learnings ".2L/global-learnings.yaml" \
        --discovered-in "plan-${plan_id}-iter-${global_iter}" \
        --duration "$duration_seconds" \
        --healing-rounds "$healing_rounds" \
        --files-modified "$files_modified"

    if [ $? -eq 0 ]; then
        # Count learnings merged
        learnings_count=$(python3 -c "import yaml; print(len(yaml.safe_load(open('$learnings_path')).get('learnings', [])))")

        echo "      ✅ Reflection complete: ${learnings_count} learning(s) merged into global knowledge base"

        # EVENT: Reflection complete
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "reflection_complete" "${learnings_count} learnings added to global knowledge base" "reflection" "orchestrator"
        fi
    else
        echo "      ⚠️  Warning: Reflection failed (non-critical, continuing)"
    fi
}

# Usage after validation PASS:
if [ "$validation_status" = "PASS" ]; then
    # Orchestrator reflection
    orchestrator_reflection "$plan_id" "$global_iter" "$iteration_dir"

    # Git commit (includes learnings files)
    git add .2L/global-learnings.yaml
    git add "${iteration_dir}/learnings.yaml"
    git commit -m "plan-${plan_id}-iter-${global_iter}: Iteration complete with learnings"

    # Mark iteration complete
    mark_iteration_complete
fi
```

**Key points:**
- Check if learnings.yaml exists (may not exist if no failures)
- Calculate iteration metadata (duration, healing_rounds, files_modified)
- Call Python helper for YAML merge (complex operation)
- Use graceful degradation (reflection failure is warning, not error)
- Emit reflection_complete event
- Commit learnings files to git

---

## Python YAML Merge Pattern

**When to use:** Orchestrator reflection needs to merge iteration learnings into global

**Code example:**
```python
#!/usr/bin/env python3
"""
2L YAML Helpers - Learning aggregation and atomic writes
"""

import os
import sys
import yaml
import argparse
from datetime import datetime

def merge_learnings(iteration_learnings_path, global_learnings_path,
                   discovered_in, duration_seconds, healing_rounds, files_modified):
    """
    Merge iteration learnings into global learnings file.

    Args:
        iteration_learnings_path: Path to iteration learnings.yaml
        global_learnings_path: Path to global-learnings.yaml
        discovered_in: Iteration identifier (e.g., "plan-3-iter-2")
        duration_seconds: Iteration duration
        healing_rounds: Number of healing rounds
        files_modified: Number of files modified
    """
    # Read iteration learnings
    with open(iteration_learnings_path, 'r') as f:
        iteration_data = yaml.safe_load(f)

    # Read or initialize global learnings
    if os.path.exists(global_learnings_path):
        # Backup before modification
        backup_before_write(global_learnings_path)

        with open(global_learnings_path, 'r') as f:
            global_data = yaml.safe_load(f)
    else:
        # Initialize new global learnings file
        global_data = {
            'schema_version': '1.0',
            'aggregated_at': datetime.now().isoformat(),
            'total_projects': 0,
            'total_learnings': 0,
            'patterns': []
        }

    # Merge iteration learnings
    project_name = iteration_data.get('project', 'unknown')

    for learning in iteration_data.get('learnings', []):
        # Convert to global pattern format
        pattern = {
            'pattern_id': generate_pattern_id(global_data['patterns']),
            'name': learning['issue'][:60],  # Truncate for readability
            'occurrences': 1,
            'projects': [project_name],
            'severity': learning['severity'],
            'root_cause': learning['root_cause'],
            'proposed_solution': learning['solution'],
            'status': 'IDENTIFIED',
            'discovered_in': discovered_in,
            'discovered_at': datetime.now().isoformat(),
            'source_learnings': [learning['id']],
            'iteration_metadata': {
                'duration_seconds': duration_seconds,
                'healing_rounds': healing_rounds,
                'files_modified': files_modified
            }
        }

        # Check for similar patterns (basic similarity)
        existing = find_similar_pattern(global_data['patterns'], pattern)

        if existing:
            # Merge into existing pattern
            existing['occurrences'] += 1
            if project_name not in existing['projects']:
                existing['projects'].append(project_name)
            existing['source_learnings'].append(learning['id'])
        else:
            # Add new pattern
            global_data['patterns'].append(pattern)
            global_data['total_learnings'] += 1

    # Update metadata
    global_data['aggregated_at'] = datetime.now().isoformat()

    # Track unique projects
    all_projects = set()
    for pattern in global_data['patterns']:
        all_projects.update(pattern.get('projects', []))
    global_data['total_projects'] = len(all_projects)

    # Atomic write
    atomic_write_yaml(global_learnings_path, global_data)

    print(f"Merged {len(iteration_data.get('learnings', []))} learnings into global knowledge base")

def find_similar_pattern(existing_patterns, new_pattern):
    """
    Find similar pattern in existing patterns (conservative similarity).

    Args:
        existing_patterns: List of existing pattern dicts
        new_pattern: New pattern dict to check

    Returns:
        Existing pattern dict if similar, None otherwise
    """
    for pattern in existing_patterns:
        # Exact match on root_cause (conservative)
        if pattern['root_cause'] == new_pattern['root_cause']:
            # Also check severity matches
            if pattern['severity'] == new_pattern['severity']:
                return pattern
    return None

def generate_pattern_id(existing_patterns):
    """
    Generate next pattern ID: PATTERN-NNN

    Args:
        existing_patterns: List of existing pattern dicts

    Returns:
        pattern_id: Next ID string (e.g., "PATTERN-001")
    """
    # Find highest existing ID
    max_id = 0
    for pattern in existing_patterns:
        pattern_id = pattern.get('pattern_id', 'PATTERN-000')
        # Extract number from PATTERN-NNN
        try:
            num = int(pattern_id.split('-')[1])
            max_id = max(max_id, num)
        except (IndexError, ValueError):
            continue

    # Next ID
    next_id = max_id + 1
    return f"PATTERN-{next_id:03d}"

# Main CLI
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='2L YAML Helpers')
    parser.add_argument('command', choices=['merge_learnings'])
    parser.add_argument('--iteration-learnings', required=True)
    parser.add_argument('--global-learnings', required=True)
    parser.add_argument('--discovered-in', required=True)
    parser.add_argument('--duration', type=int, required=True)
    parser.add_argument('--healing-rounds', type=int, required=True)
    parser.add_argument('--files-modified', type=int, required=True)

    args = parser.parse_args()

    if args.command == 'merge_learnings':
        merge_learnings(
            args.iteration_learnings,
            args.global_learnings,
            args.discovered_in,
            args.duration,
            args.healing_rounds,
            args.files_modified
        )
```

**Key points:**
- CLI interface for Bash orchestrator to call
- Read iteration learnings, merge into global
- Convert learning format to pattern format
- Basic similarity check (exact root_cause match)
- Generate sequential pattern IDs (PATTERN-001, PATTERN-002, ...)
- Use atomic write to prevent corruption
- Backup before modification

---

## Event Emission Pattern

**When to use:** Emit events for dashboard observability

**Code example:**
```bash
# Source event logger at orchestrator startup
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    EVENT_LOGGING_ENABLED=true
else
    EVENT_LOGGING_ENABLED=false
fi

# Emit re-validation start event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "phase_change" \
                 "Starting re-validation after healing attempt ${healing_attempt}" \
                 "validation" \
                 "orchestrator"
fi

# Emit re-validation result event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "validation_result" \
                 "Re-validation attempt ${healing_attempt}: ${validation_status}" \
                 "validation" \
                 "validator-revalidation"
fi

# Emit iteration complete event (after healing)
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "iteration_complete" \
                 "Iteration ${global_iter} completed after ${healing_attempt} healing round(s)" \
                 "complete" \
                 "orchestrator"
fi

# Emit reflection complete event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "reflection_complete" \
                 "${learnings_count} learnings added to global knowledge base" \
                 "reflection" \
                 "orchestrator"
fi
```

**Key points:**
- Check if event logger available (graceful degradation)
- Use existing event types (phase_change, validation_result, iteration_complete)
- Add new event type: reflection_complete
- Distinguish re-validation from first-pass validation (via agent_id)
- Include metadata in event data (healing_attempt, learnings_count)

---

## Import Order Convention

**Python files:**
```python
# Standard library imports
import os
import sys
import tempfile
import shutil
from datetime import datetime

# Third-party imports
import yaml

# Local imports (if any)
from lib.helpers import some_helper
```

**Bash files:**
```bash
#!/usr/bin/env bash

# Source libraries
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
fi

# Define constants
MAX_HEALING_ATTEMPTS=2

# Define functions
function orchestrator_reflection() {
    # ...
}

# Main execution
main() {
    # ...
}

main "$@"
```

---

## Error Handling Patterns

### Graceful Degradation (Learning Capture)

**When to use:** Non-critical operations that shouldn't block orchestration

```python
try:
    create_learnings_yaml(validation_dir, project_name, plan_id, iteration_id)
except Exception as e:
    print(f"   ⚠️  Warning: Failed to create learnings.yaml: {e}")
    print(f"   ⚠️  Continuing without learning capture (non-critical)")
    # Don't raise - graceful degradation
```

### Escalation with Context (Re-validation Failure)

**When to use:** Critical failures that require manual intervention

```bash
if [ $healing_attempt -ge $MAX_HEALING_ATTEMPTS ]; then
    echo "      ❌ Re-validation failed after $MAX_HEALING_ATTEMPTS healing attempts."
    echo "      ⚠️  MANUAL INTERVENTION REQUIRED"
    echo ""
    echo "      📄 Latest validation report: ${validation_report_path}"
    echo "      📊 Healing attempts: ${healing_attempt}"
    echo "      📁 Iteration directory: ${iteration_dir}"
    echo ""
    echo "      Please review validation report and fix issues manually."
    exit 1
fi
```

### Atomic Operation Failure (YAML Write)

**When to use:** Critical file operations that must succeed or rollback

```python
try:
    # Atomic write
    atomic_write_yaml(global_learnings_path, global_data)
except Exception as e:
    print(f"ERROR: Failed to write global learnings: {e}")
    if backup_path and os.path.exists(backup_path):
        print(f"Backup available at: {backup_path}")
        print(f"To restore: cp {backup_path} {global_learnings_path}")
    raise
```

---

## Testing Patterns

### Manual Test: Learning Capture

```bash
# Test learning capture by forcing validation failure

# 1. Create intentional TypeScript error
echo "import { NonExistentModule } from 'fake-module';" >> src/test.ts

# 2. Run validator
claude-ai "Run validation on current project"

# 3. Verify learnings.yaml created
ls -la .2L/plan-*/iteration-*/validation/learnings.yaml

# 4. Verify YAML structure
cat .2L/plan-*/iteration-*/validation/learnings.yaml | head -20

# 5. Cleanup
git checkout src/test.ts
```

### Manual Test: Re-validation Checkpoint

```bash
# Test re-validation by creating bug that healing might not fix

# 1. Create subtle bug (e.g., type mismatch)
echo "const x: string = 123;" >> src/test.ts

# 2. Run orchestration (triggers validation → healing → re-validation)
/2l-mvp

# 3. Observe healing attempts in output
# Should see: "Re-validating after healing attempt 1..."

# 4. Check events.jsonl for re-validation events
grep "re-validation" .2L/events.jsonl

# 5. Verify escalation if healing fails
# Should see: "MANUAL INTERVENTION REQUIRED" after 2 attempts
```

### Manual Test: Orchestrator Reflection

```bash
# Test reflection by completing iteration with learnings

# 1. Force validation failure (creates learnings.yaml)
# ... (create intentional error)

# 2. Fix error manually

# 3. Run validation again (should PASS)
claude-ai "Run validation"

# 4. Verify global-learnings.yaml updated
cat .2L/global-learnings.yaml

# 5. Check for status: IDENTIFIED and metadata
grep -A 5 "status: IDENTIFIED" .2L/global-learnings.yaml
```

### Manual Test: Atomic Write Safety

```bash
# Test atomic write by simulating crash

# 1. Add delay to atomic_write_yaml()
# (in lib/2l-yaml-helpers.py, add time.sleep(5) before shutil.move())

# 2. Run reflection in background
python3 lib/2l-yaml-helpers.py merge_learnings ... &

# 3. Kill process mid-write (during sleep)
sleep 2
kill -9 $!

# 4. Verify global-learnings.yaml not corrupted
python3 -c "import yaml; yaml.safe_load(open('.2L/global-learnings.yaml'))"

# 5. Verify temp file cleaned up
ls -la .2L/.tmp_*.yaml  # Should not exist
```

---

## Code Quality Standards

**YAML Files:**
- Use 2-space indentation (consistent with existing config.yaml)
- Sort keys: False (preserve insertion order)
- Default flow style: False (use block style for readability)
- Include schema_version field for future compatibility

**Python Files:**
- Docstrings for all functions (Args, Returns, Raises)
- Type hints optional (not enforced)
- Error messages user-friendly (include context, file paths)
- Use descriptive variable names (no single-letter vars except loop counters)

**Bash Files:**
- Use `set -e` for error propagation (exit on error)
- Quote all variables: `"$variable"` (prevent word splitting)
- Use functions for reusable logic
- Comment complex sections (especially regex patterns)

---

## Security Patterns

**File Permissions:**
```bash
# Learnings files readable by user only
chmod 600 .2L/global-learnings.yaml

# Temp files use mkstemp (secure by default)
# No need to manually set permissions
```

**Sensitive Data Prevention:**
```python
# Never log sensitive data in learnings
def sanitize_error_message(msg):
    """Remove potential secrets from error messages."""
    # Replace potential API keys
    msg = re.sub(r'[A-Za-z0-9]{32,}', '[REDACTED]', msg)
    # Replace potential passwords
    msg = re.sub(r'password[=:]\s*\S+', 'password=[REDACTED]', msg, flags=re.IGNORECASE)
    return msg

# Usage:
learning['issue'] = sanitize_error_message(raw_error_message)
```

**Git Commit Safety:**
```bash
# Verify no secrets before commit
git diff --staged | grep -i "api[_-]key\|password\|secret"
if [ $? -eq 0 ]; then
    echo "ERROR: Potential secret detected in staged changes"
    exit 1
fi
```

---

**End of Patterns Document**

This patterns file provides builders with copy-pasteable code examples for all major operations in this iteration. Each pattern includes context, implementation, and key considerations.
