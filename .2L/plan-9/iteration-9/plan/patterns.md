# Code Patterns & Conventions

## File Structure

```
~/Ahiya/2L/
├── commands/
│   ├── 2l-mvp.md              # Orchestrator (MODIFY: add reflection calls)
│   └── 2l-improve.md          # Self-improvement command
├── lib/
│   ├── 2l-yaml-helpers.py     # EXISTING: atomic YAML writes
│   ├── 2l-event-logger.sh     # EXISTING: event emission
│   ├── 2l-pattern-detector.py # EXISTING: pattern detection
│   ├── 2l-pattern-lifecycle.py # EXISTING: pattern status management
│   ├── 2l-reflection-generator.py   # NEW: Builder-1
│   └── 2l-reflection-aggregator.py  # NEW: Builder-2
├── templates/
│   └── reflection-template.md # NEW: Builder-1
└── .2L/
    ├── global-learnings.yaml  # Pattern database
    ├── global-learnings.yaml.bak  # Backup
    ├── global-learnings.jsonl # Learning stream (NEW)
    ├── events.jsonl           # Event log
    └── plan-N/
        └── iteration-M/
            ├── validation/
            │   └── validation-report.md
            ├── learnings.yaml (if healing occurred)
            └── REFLECTION.md  # NEW: Created by reflection generator
```

## Naming Conventions

- **Python files:** lowercase with hyphens (`2l-reflection-generator.py`)
- **Functions:** snake_case (`extract_framework_issues()`)
- **Classes:** PascalCase (`ReflectionGenerator`, `ReflectionAggregator`)
- **Constants:** SCREAMING_SNAKE_CASE (`SIMILARITY_THRESHOLD = 0.8`)
- **Variables:** snake_case (`reflection_path`, `pattern_id`)
- **File extensions:** `.py` (Python), `.md` (Markdown), `.yaml` (YAML), `.jsonl` (JSON Lines)

## Python Utility Pattern

### Standard Utility Structure

**When to use:** All new Python utilities in lib/

**Code example:**
```python
#!/usr/bin/env python3
"""
2L Reflection Generator - Create structured reflections from iteration artifacts

Usage:
    python3 2l-reflection-generator.py \
        --iteration-dir .2L/plan-3/iteration-2 \
        --plan-id plan-3 \
        --iteration 2 \
        --output .2L/plan-3/iteration-2/REFLECTION.md \
        --jsonl .2L/global-learnings.jsonl

Environment:
    Runs in meditation space (~/Ahiya/2L) or project directories

Exit Codes:
    0: Success (reflection created)
    1: Error (parsing failed, file missing)
    2: Safety abort (invalid inputs)
"""

import sys
import yaml
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Constants
SCHEMA_VERSION = "1.0"
PRIORITY_WEIGHTS = {
    'P1': 3.0,  # Functionality (breaks workflow)
    'P2': 2.0,  # Completeness (missing features)
    'P3': 1.0   # Speed (performance only)
}

# Core implementation classes/functions
class ReflectionGenerator:
    """Generate REFLECTION.md from iteration artifacts."""

    def __init__(self, iteration_dir: Path):
        self.iteration_dir = iteration_dir
        self.validation_report = iteration_dir / "validation" / "validation-report.md"
        self.learnings_file = iteration_dir / "learnings.yaml"

    def generate(self) -> Dict:
        """Generate reflection dictionary."""
        # Implementation here
        pass

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Generate iteration reflection from execution artifacts',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate reflection for iteration 2
  %(prog)s --iteration-dir .2L/plan-3/iteration-2 \\
           --plan-id plan-3 \\
           --iteration 2 \\
           --output .2L/plan-3/iteration-2/REFLECTION.md \\
           --jsonl .2L/global-learnings.jsonl

  # Dry run (don't write files)
  %(prog)s --iteration-dir .2L/plan-3/iteration-2 \\
           --plan-id plan-3 \\
           --iteration 2 \\
           --dry-run
"""
    )

    parser.add_argument('--iteration-dir', required=True,
                        help='Path to iteration directory')
    parser.add_argument('--plan-id', required=True,
                        help='Plan ID (e.g., plan-3)')
    parser.add_argument('--iteration', type=int, required=True,
                        help='Global iteration number')
    parser.add_argument('--output', required=True,
                        help='Path to output REFLECTION.md')
    parser.add_argument('--jsonl', required=True,
                        help='Path to global-learnings.jsonl')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show output without writing files')

    args = parser.parse_args()

    try:
        # Validate inputs
        iteration_dir = Path(args.iteration_dir)
        if not iteration_dir.exists():
            print(f"ERROR: Iteration directory not found: {iteration_dir}",
                  file=sys.stderr)
            sys.exit(2)

        # Generate reflection
        generator = ReflectionGenerator(iteration_dir)
        reflection = generator.generate()

        # Write output
        if args.dry_run:
            print(f"Would write to: {args.output}")
            print(reflection)
        else:
            # Write files here
            pass

        sys.exit(0)

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
```

**Key points:**
- Shebang for direct execution
- Docstring with usage examples
- argparse with rich help text
- Type hints for clarity
- Try/except with error logging
- Exit codes (0=success, 1=error, 2=safety)

## Atomic File Write Pattern

### YAML Atomic Write

**When to use:** Any modification to YAML files (especially global-learnings.yaml)

**Code example:**
```python
import os
import sys
import yaml
import tempfile
import shutil
from pathlib import Path

def atomic_write_yaml(file_path: Path, data: dict) -> None:
    """
    Write YAML file atomically (temp file + rename).

    Args:
        file_path: Path to YAML file
        data: Dictionary to write

    Raises:
        IOError: If write fails
    """
    # Ensure parent directory exists
    file_path.parent.mkdir(parents=True, exist_ok=True)

    # Create temp file in same directory (ensures same filesystem)
    dir_path = file_path.parent
    temp_fd, temp_path = tempfile.mkstemp(
        dir=str(dir_path),
        prefix='.tmp_',
        suffix='.yaml'
    )

    try:
        # Write to temp file
        with os.fdopen(temp_fd, 'w') as f:
            yaml.dump(data, f,
                     default_flow_style=False,
                     sort_keys=False,
                     allow_unicode=True)

        # Atomic rename (OS-level guarantee)
        shutil.move(temp_path, str(file_path))

    except Exception as e:
        # Cleanup temp file on error
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise IOError(f"Failed to write {file_path}: {e}")

def backup_before_write(file_path: Path) -> Optional[Path]:
    """
    Create .bak backup before modifying file.

    Args:
        file_path: Path to file to backup

    Returns:
        Path to backup file, or None if source doesn't exist
    """
    if not file_path.exists():
        return None

    backup_path = file_path.with_suffix(file_path.suffix + '.bak')
    shutil.copy2(file_path, backup_path)
    return backup_path

# Usage example
def update_global_learnings(patterns: List[dict]):
    """Update global learnings with new patterns."""
    learnings_path = Path('.2L/global-learnings.yaml')

    # Backup before modification
    backup_path = backup_before_write(learnings_path)
    if backup_path:
        print(f"Created backup: {backup_path}")

    # Load existing data
    if learnings_path.exists():
        with open(learnings_path) as f:
            data = yaml.safe_load(f) or {}
    else:
        data = {
            'schema_version': '1.0',
            'total_projects': 0,
            'total_learnings': 0,
            'patterns': []
        }

    # Update patterns
    data['patterns'].extend(patterns)
    data['total_learnings'] = len(data['patterns'])
    data['aggregated_at'] = datetime.now().isoformat()

    # Atomic write
    atomic_write_yaml(learnings_path, data)
    print(f"Updated: {learnings_path}")
```

**Key points:**
- Temp file in same directory (same filesystem = atomic rename)
- Cleanup temp file on error
- Backup before modification (.bak file)
- YAML dump with readable formatting (no flow style, preserve order)

## JSONL Append Pattern

### Append-Only Learning Log

**When to use:** Appending learnings to global-learnings.jsonl

**Code example:**
```python
import json
import fcntl
from pathlib import Path
from datetime import datetime
from typing import Dict

def append_learning_to_jsonl(learning: Dict, jsonl_path: Path) -> None:
    """
    Append learning to JSONL file (thread-safe with file locking).

    Args:
        learning: Learning dictionary
        jsonl_path: Path to .jsonl file

    Raises:
        IOError: If append fails
    """
    # Ensure parent directory exists
    jsonl_path.parent.mkdir(parents=True, exist_ok=True)

    # Add timestamp if not present
    if 'timestamp' not in learning:
        learning['timestamp'] = datetime.now().isoformat()

    # Open in append mode
    with open(jsonl_path, 'a') as f:
        try:
            # Acquire exclusive lock (prevents concurrent writes)
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)

            # Write single JSON line
            f.write(json.dumps(learning, ensure_ascii=False) + '\n')
            f.flush()  # Ensure written to disk

        finally:
            # Release lock
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)

def read_jsonl(jsonl_path: Path) -> List[Dict]:
    """
    Read all entries from JSONL file.

    Args:
        jsonl_path: Path to .jsonl file

    Returns:
        List of dictionaries (one per line)
    """
    if not jsonl_path.exists():
        return []

    learnings = []
    with open(jsonl_path) as f:
        for line_num, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue  # Skip empty lines

            try:
                learnings.append(json.loads(line))
            except json.JSONDecodeError as e:
                # Log error but continue (graceful degradation)
                print(f"WARNING: Malformed JSON at line {line_num}: {e}",
                      file=sys.stderr)
                continue

    return learnings

# Usage example
def log_framework_issue(issue: Dict):
    """Log framework issue to global learnings."""
    learning = {
        'learning_id': f"plan-{issue['plan']}-iter-{issue['iteration']}-learning-001",
        'project': issue['project'],
        'plan_id': issue['plan'],
        'iteration': issue['iteration'],
        'category': issue['category'],
        'priority': issue['priority'],
        'issue': issue['issue'],
        'severity': issue['severity'],
        'root_cause': issue['root_cause'],
        'suggested_fix': issue['suggested_fix'],
        'affected_files': issue['affected_files'],
        'pattern_id': None  # Assigned during aggregation
    }

    jsonl_path = Path('.2L/global-learnings.jsonl')
    append_learning_to_jsonl(learning, jsonl_path)
```

**Key points:**
- File locking prevents corruption (fcntl on Unix)
- One JSON object per line (no arrays)
- Graceful handling of malformed lines
- Timestamp added automatically
- flush() ensures disk write

## Similarity Matching Pattern

### Fuzzy String Comparison

**When to use:** Grouping similar learnings in aggregator

**Code example:**
```python
from difflib import SequenceMatcher
from typing import Set, List, Dict

def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity ratio between two strings using difflib.

    Uses Ratcliff-Obershelp algorithm (gestalt pattern matching).

    Args:
        text1: First string
        text2: Second string

    Returns:
        Similarity ratio in [0.0, 1.0]
        - 0.0 = completely different
        - 0.8+ = very similar (recommended threshold)
        - 1.0 = identical
    """
    # Normalize (lowercase for case-insensitive comparison)
    norm1 = text1.lower().strip()
    norm2 = text2.lower().strip()

    # Calculate similarity
    return SequenceMatcher(None, norm1, norm2).ratio()

def find_best_match(text: str, candidates: List[Dict],
                    threshold: float = 0.8) -> Optional[Dict]:
    """
    Find best matching candidate above similarity threshold.

    Args:
        text: Text to match
        candidates: List of candidate dictionaries (must have 'root_cause' key)
        threshold: Minimum similarity (0.0-1.0)

    Returns:
        Best matching candidate, or None if no match above threshold
    """
    best_match = None
    best_score = 0.0

    for candidate in candidates:
        candidate_text = candidate.get('root_cause', '')
        score = calculate_similarity(text, candidate_text)

        if score >= threshold and score > best_score:
            best_match = candidate
            best_score = score

    return best_match

# Usage example in aggregator
class ReflectionAggregator:
    SIMILARITY_THRESHOLD = 0.8

    def merge_or_create_pattern(self, learning: Dict,
                                existing_patterns: List[Dict]) -> tuple:
        """
        Merge learning into existing pattern or create new one.

        Args:
            learning: New learning to process
            existing_patterns: Existing pattern list

        Returns:
            (updated_patterns, is_new_pattern)
        """
        root_cause = learning['root_cause']

        # Find best match among existing patterns
        best_match = find_best_match(root_cause, existing_patterns,
                                     self.SIMILARITY_THRESHOLD)

        if best_match:
            # Merge into existing pattern
            best_match['occurrences'] += 1
            best_match['source_learnings'].append(learning['learning_id'])

            # Add project if not already in list
            if learning['project'] not in best_match['projects']:
                best_match['projects'].append(learning['project'])

            return existing_patterns, False  # Not new

        else:
            # Create new pattern
            new_pattern = {
                'pattern_id': self._generate_pattern_id(),
                'name': learning['issue'][:60],  # Truncate to 60 chars
                'occurrences': 1,
                'projects': [learning['project']],
                'severity': learning['severity'],
                'category': learning['category'],
                'root_cause': learning['root_cause'],
                'proposed_solution': learning['suggested_fix'],
                'status': 'IDENTIFIED',
                'discovered_in': f"plan-{learning['plan_id']}-iter-{learning['iteration']}",
                'discovered_at': learning['timestamp'],
                'source_learnings': [learning['learning_id']],
                'affected_files': learning['affected_files']
            }

            existing_patterns.append(new_pattern)
            return existing_patterns, True  # New pattern created
```

**Key points:**
- Use difflib.SequenceMatcher (stdlib, no dependencies)
- 0.8 threshold balances precision vs recall
- Normalize text (lowercase, strip)
- Return best match above threshold
- Log similarity scores for tuning

## Event Emission Pattern

### Bash Event Logging

**When to use:** After significant operations in bash scripts

**Code example:**
```bash
#!/usr/bin/env bash

# Source event logger (graceful degradation if missing)
EVENT_LOGGING_ENABLED=false
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    source "$HOME/.claude/lib/2l-event-logger.sh"
    EVENT_LOGGING_ENABLED=true
fi

# Function to log events safely
log_event() {
    local event_type="$1"
    local data="$2"
    local phase="$3"
    local agent_id="$4"

    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "$event_type" "$data" "$phase" "$agent_id"
    fi
}

# Usage in /2l-mvp after reflection creation
create_iteration_reflection() {
    local plan_id="$1"
    local global_iter="$2"
    local iter_dir="$3"

    local reflection_path="$iter_dir/REFLECTION.md"
    local global_learnings_jsonl=".2L/global-learnings.jsonl"

    echo "   📝 Generating iteration reflection..."

    # Call Python reflection generator
    python3 "$HOME/.claude/lib/2l-reflection-generator.py" \
        --iteration-dir "$iter_dir" \
        --plan-id "$plan_id" \
        --iteration "$global_iter" \
        --output "$reflection_path" \
        --jsonl "$global_learnings_jsonl" 2>/dev/null

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "      ✅ Reflection created: $reflection_path"

        # Emit success event
        log_event "reflection_created" \
                  "Iteration ${global_iter} reflection created" \
                  "reflection" \
                  "orchestrator"

        return 0
    else
        echo "      ⚠️  Reflection generation failed (non-critical, continuing)"

        # Emit failure event (for monitoring, but don't block)
        log_event "reflection_failed" \
                  "Iteration ${global_iter} reflection generation failed with exit code ${exit_code}" \
                  "reflection" \
                  "orchestrator"

        return 1  # Non-blocking failure
    fi
}
```

**Key points:**
- Graceful degradation (check library exists)
- Never block orchestrator on event logging
- 4 parameters: event_type, data, phase, agent_id
- Use descriptive event names (past tense: reflection_created)
- Log both successes and failures

## Markdown Parsing Pattern

### Extract Sections from REFLECTION.md

**When to use:** Aggregator parsing reflections

**Code example:**
```python
import re
from pathlib import Path
from typing import Dict, List

def parse_reflection_markdown(reflection_path: Path) -> Dict:
    """
    Parse REFLECTION.md into structured dictionary.

    Args:
        reflection_path: Path to REFLECTION.md

    Returns:
        Dictionary with parsed sections
    """
    with open(reflection_path) as f:
        content = f.read()

    # Extract metadata (top of file)
    metadata = {}
    metadata_pattern = r'\*\*(\w+):\*\* (.+)'
    for match in re.finditer(metadata_pattern, content):
        key = match.group(1).lower()
        value = match.group(2).strip()
        metadata[key] = value

    # Extract "What Went Well" section
    went_well = []
    went_well_section = re.search(
        r'## What Went Well\s*\n(.*?)\n##',
        content,
        re.DOTALL
    )
    if went_well_section:
        for line in went_well_section.group(1).strip().split('\n'):
            if line.strip().startswith('-'):
                went_well.append(line.strip()[2:])  # Remove '- '

    # Extract framework issues
    issues = []
    issue_pattern = r'### Issue \d+: (.+?) - (\w+)\s*\n\*\*Problem:\*\* (.+?)\n\*\*Root Cause:\*\* (.+?)\n\*\*Suggested Fix:\*\* (.+?)\n\*\*Affected Components:\*\* (.+?)(?:\n\n|\n###|$)'

    for match in re.finditer(issue_pattern, content, re.DOTALL):
        category = match.group(1).strip()
        priority = match.group(2).strip()
        problem = match.group(3).strip()
        root_cause = match.group(4).strip()
        suggested_fix = match.group(5).strip()
        affected = match.group(6).strip()

        issues.append({
            'category': category,
            'priority': priority,
            'issue': problem,
            'root_cause': root_cause,
            'suggested_fix': suggested_fix,
            'affected_files': [f.strip() for f in affected.split(',')]
        })

    return {
        'metadata': metadata,
        'what_went_well': went_well,
        'framework_issues': issues
    }

# Usage example
def extract_learnings_from_reflection(reflection_path: Path,
                                      plan_id: str,
                                      iteration: int,
                                      project: str) -> List[Dict]:
    """Extract learnings suitable for JSONL log."""
    parsed = parse_reflection_markdown(reflection_path)

    learnings = []
    for idx, issue in enumerate(parsed['framework_issues'], start=1):
        learning = {
            'learning_id': f"{plan_id}-iter-{iteration}-learning-{idx:03d}",
            'project': project,
            'plan_id': plan_id,
            'iteration': iteration,
            'category': issue['category'],
            'priority': issue['priority'],
            'issue': issue['issue'],
            'severity': _priority_to_severity(issue['priority']),
            'root_cause': issue['root_cause'],
            'suggested_fix': issue['suggested_fix'],
            'affected_files': issue['affected_files'],
            'pattern_id': None
        }
        learnings.append(learning)

    return learnings

def _priority_to_severity(priority: str) -> str:
    """Convert priority (P1/P2/P3) to severity (critical/medium/low)."""
    mapping = {
        'P1': 'critical',
        'P2': 'medium',
        'P3': 'low'
    }
    return mapping.get(priority, 'medium')
```

**Key points:**
- Use regex for structured sections
- Graceful handling if sections missing
- Multi-line regex with re.DOTALL
- Extract into dictionaries for easy processing

## Import Order Convention

```python
# Standard library imports (alphabetical)
import argparse
import json
import os
import re
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Third-party imports (alphabetical)
import yaml

# Local imports (relative to lib/)
# (None for standalone utilities)
```

## Error Handling Standards

### Standard Error Handling

**Code example:**
```python
def safe_operation():
    """Example of standard error handling."""
    try:
        # Attempt operation
        result = risky_operation()
        return result

    except FileNotFoundError as e:
        print(f"ERROR: Required file not found: {e}", file=sys.stderr)
        sys.exit(2)  # Safety abort

    except yaml.YAMLError as e:
        print(f"ERROR: Invalid YAML format: {e}", file=sys.stderr)
        sys.exit(1)  # Error

    except Exception as e:
        print(f"ERROR: Unexpected failure: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
```

**Key points:**
- Specific exceptions first, generic Exception last
- Print to stderr (not stdout)
- Exit code 2 for safety aborts (invalid inputs)
- Exit code 1 for errors (parsing failures, etc.)
- Print traceback for debugging

## Code Quality Standards

1. **Type hints:** Use for function signatures (args and return types)
2. **Docstrings:** All public functions/classes (Args, Returns, Raises)
3. **Comments:** Explain "why" not "what" (code should be self-documenting)
4. **Line length:** Prefer <100 chars, hard limit 120
5. **Constants:** SCREAMING_SNAKE_CASE at module level
6. **Defensive programming:** Validate inputs, check file existence, handle errors

## Performance Patterns

### Incremental Processing

**Pattern:** Process only new items, skip already-processed

**Code example:**
```python
def incremental_aggregation(jsonl_path: Path,
                           learnings_path: Path,
                           last_processed_timestamp: str) -> None:
    """
    Aggregate only new learnings since last run.

    Args:
        jsonl_path: Learning stream
        learnings_path: Pattern database
        last_processed_timestamp: ISO timestamp of last aggregation
    """
    # Load existing patterns
    patterns = load_patterns(learnings_path)

    # Get last processed timestamp from patterns
    if not last_processed_timestamp and patterns:
        last_processed_timestamp = max(
            p.get('discovered_at', '2000-01-01T00:00:00')
            for p in patterns
        )

    # Read only new learnings
    new_count = 0
    for learning in read_jsonl(jsonl_path):
        timestamp = learning.get('timestamp', '')

        # Skip if already processed
        if timestamp <= last_processed_timestamp:
            continue

        # Process new learning
        patterns, is_new = merge_or_create_pattern(learning, patterns)
        new_count += 1

    print(f"Processed {new_count} new learnings")
```

**Key points:**
- Track last processed timestamp
- Skip items before timestamp
- O(n) complexity (linear scan)
- Works with append-only JSONL

## Security Patterns

### Path Validation

**Pattern:** Validate file paths before use

**Code example:**
```python
def validate_iteration_dir(path: str) -> Path:
    """
    Validate iteration directory path.

    Args:
        path: Path string to validate

    Returns:
        Validated Path object

    Raises:
        ValueError: If path invalid or dangerous
    """
    # Convert to Path object
    p = Path(path).resolve()  # Resolve symlinks, make absolute

    # Check for directory traversal attempts
    if '..' in p.parts:
        raise ValueError(f"Invalid path (contains '..'): {path}")

    # Check exists
    if not p.exists():
        raise ValueError(f"Path does not exist: {path}")

    # Check is directory
    if not p.is_dir():
        raise ValueError(f"Path is not a directory: {path}")

    # Check has expected structure
    validation_dir = p / "validation"
    if not validation_dir.exists():
        raise ValueError(f"Invalid iteration directory (missing validation/): {path}")

    return p
```

**Key points:**
- Resolve symlinks and relative paths
- Check for directory traversal
- Validate structure before processing
- Raise specific errors
