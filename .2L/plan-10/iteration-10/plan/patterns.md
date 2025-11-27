# Code Patterns & Conventions

## File Structure

```
~/Ahiya/2L/                          # Meditation space (framework's own codebase)
├── .2L/
│   ├── config.yaml                  # Plan tracking, iteration counter
│   ├── events.jsonl                 # Event log for dashboard
│   ├── global-learnings.yaml        # Aggregated patterns
│   ├── global-learnings.jsonl       # Raw learnings (meditation space)
│   └── plan-*/
│       ├── vision.md
│       ├── master-plan.yaml
│       └── iteration-*/
│           ├── exploration/
│           ├── plan/
│           ├── building/
│           ├── integration/
│           └── validation/
├── agents/                          # Agent markdown prompts
│   ├── 2l-explorer.md
│   ├── 2l-builder.md
│   └── ...
├── commands/                        # Slash commands (markdown)
│   ├── 2l-improve.md               # MODIFY: Add multi-source discovery
│   ├── 2l-mvp.md
│   └── ...
├── lib/                            # Python/bash utilities
│   ├── 2l-reflection-generator.py  # MODIFY: Add source_project field
│   ├── 2l-reflection-aggregator.py # MODIFY: Multi-source support
│   ├── 2l-vision-generator.py      # MODIFY: Cross-project evidence
│   ├── 2l-pattern-lifecycle.py
│   ├── 2l-yaml-helpers.py
│   └── 2l-event-logger.sh
└── Prod/                           # Production projects
    ├── StatViz/.2L/global-learnings.jsonl      # READ: Federation source
    ├── wealth/.2L/global-learnings.jsonl       # READ: Federation source
    └── ...
```

## Naming Conventions

- **Python files:** Lowercase with hyphens (`2l-reflection-aggregator.py`)
- **Functions:** snake_case (`infer_source_project()`)
- **Classes:** PascalCase (`ReflectionGenerator`)
- **Constants:** SCREAMING_SNAKE_CASE (`FRAMEWORK_KEYWORDS`)
- **Variables:** snake_case (`source_project`, `jsonl_path`)
- **Project names:** Derived from directory (`Prod/StatViz` → `"StatViz"`)

## Multi-Source Discovery Pattern

**When to use:** In `/2l-improve` command when running in meditation space, discover all Prod/* learnings.

**Code example:**

```python
import glob
import os
from pathlib import Path
from typing import List

def discover_prod_learnings() -> List[Path]:
    """
    Discover all global-learnings.jsonl files in Prod/* projects.

    Returns:
        List of valid JSONL file paths (empty list if none found or error)

    Examples:
        >>> discover_prod_learnings()
        [PosixPath('.../Prod/StatViz/.2L/global-learnings.jsonl'),
         PosixPath('.../Prod/wealth/.2L/global-learnings.jsonl')]
    """
    # Expand ~ to home directory
    pattern = os.path.expanduser('~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl')

    try:
        matches = glob.glob(pattern)
    except (PermissionError, OSError) as e:
        print(f"WARNING: Cannot access Prod/* directories: {e}", file=sys.stderr)
        return []

    # Validate paths exist and are files
    valid_paths = []
    for match in matches:
        path = Path(match)
        if path.exists() and path.is_file():
            valid_paths.append(path)
        else:
            print(f"WARNING: Skipping invalid path: {match}", file=sys.stderr)

    return valid_paths
```

**Usage in /2l-improve:**

```bash
# In commands/2l-improve.md, before aggregation step

# Discover all learning sources
meditation_learnings=".2L/global-learnings.jsonl"

# Discover Prod/* learnings using Python helper
prod_learnings=$(python3 -c "
import glob
import os
pattern = os.path.expanduser('~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl')
for path in glob.glob(pattern):
    if os.path.exists(path):
        print(path)
" 2>/dev/null | tr '\n' ',' | sed 's/,$//')

# Combine sources for aggregator
all_sources="$meditation_learnings"
if [ -n "$prod_learnings" ]; then
    all_sources="$all_sources,$prod_learnings"
fi

echo "Discovered learning sources: $all_sources"
```

**Key points:**
- Gracefully handles missing Prod/* directory (returns empty list)
- Uses absolute path expansion (`os.path.expanduser`)
- Validates each discovered path before returning
- Logs warnings to stderr, never fails the command

---

## Source Project Derivation Pattern

**When to use:** In reflection generator when creating learning entries, derive project name from current directory.

**Code example:**

```python
from pathlib import Path
from typing import Optional

def infer_source_project(jsonl_path: Optional[Path] = None) -> str:
    """
    Extract source project name from JSONL path or current directory.

    Args:
        jsonl_path: Path to global-learnings.jsonl (optional, uses cwd if None)

    Returns:
        Project name string (e.g., "StatViz", "meditation-space")

    Examples:
        >>> infer_source_project(Path("~/Ahiya/2L/Prod/StatViz/.2L/global-learnings.jsonl"))
        'StatViz'
        >>> infer_source_project(Path("~/Ahiya/2L/.2L/global-learnings.jsonl"))
        'meditation-space'
        >>> infer_source_project(Path("~/Ahiya/2L/Prod/clients/acme/dashboard/.2L/..."))
        'clients-acme-dashboard'
    """
    # Use current working directory if no path provided
    if jsonl_path is None:
        jsonl_path = Path.cwd()

    parts = jsonl_path.parts

    # Check if in Prod/* directory
    if 'Prod' in parts:
        prod_index = parts.index('Prod')

        # Get all parts between 'Prod' and '.2L' (or end)
        project_parts = []
        for i in range(prod_index + 1, len(parts)):
            if parts[i] == '.2L':
                break
            project_parts.append(parts[i])

        # Join with dash for nested projects
        if project_parts:
            return '-'.join(project_parts)

    # Default: Meditation space (2L's own iterations)
    return "meditation-space"
```

**Usage in reflection generator:**

```python
# In lib/2l-reflection-generator.py, when creating learning entry

source_project = infer_source_project()  # Derive from cwd

learning = {
    'learning_id': f"{args.plan_id}-iter-{args.iteration}-learning-{idx:03d}",
    'timestamp': datetime.now(timezone.utc).isoformat(),
    'source_project': source_project,  # NEW FIELD
    'project': reflection['metadata']['project'],
    'plan_id': args.plan_id,
    'iteration': args.iteration,
    'category': issue.get('category', 'functionality'),
    'priority': issue.get('priority', 'P2'),
    'root_cause': issue.get('root_cause', 'Unknown'),
    'context': issue.get('context', ''),
    'pattern_id': None
}
```

---

## Multi-Source JSONL Reading Pattern

**When to use:** In aggregator when processing multiple learning sources.

**Code example:**

```python
import json
import sys
from pathlib import Path
from typing import List, Dict

def read_multi_source_jsonl(jsonl_paths: List[Path]) -> List[Dict]:
    """
    Read learnings from multiple JSONL sources with source tracking.

    Args:
        jsonl_paths: List of paths to global-learnings.jsonl files

    Returns:
        List of learning dictionaries with source_project field added

    Error Handling:
        - Missing files: Log warning, skip
        - Malformed JSON: Log warning, skip line
        - Permission denied: Log warning, skip file
    """
    all_learnings = []

    for jsonl_path in jsonl_paths:
        # Derive source project from path
        source_project = infer_source_project(jsonl_path)

        # Read learnings from this source
        learnings = read_jsonl_with_recovery(jsonl_path)

        # Tag each learning with source_project
        for learning in learnings:
            # Add field if missing (backwards compatibility)
            if 'source_project' not in learning:
                learning['source_project'] = source_project

            all_learnings.append(learning)

        print(f"Loaded {len(learnings)} learnings from {source_project}",
              file=sys.stderr)

    return all_learnings

def read_jsonl_with_recovery(jsonl_path: Path) -> List[Dict]:
    """
    Read JSONL file with line-by-line error recovery.

    Returns:
        List of valid learning dictionaries (empty if file unreadable)
    """
    learnings = []

    try:
        with open(jsonl_path, 'r') as f:
            for line_num, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue  # Skip empty lines

                try:
                    learnings.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"WARNING: Malformed JSON at {jsonl_path}:{line_num}: {e}",
                          file=sys.stderr)
                    continue
    except (FileNotFoundError, PermissionError) as e:
        print(f"WARNING: Cannot read {jsonl_path}: {e}", file=sys.stderr)
        return []

    return learnings
```

**Usage in aggregator:**

```python
# In lib/2l-reflection-aggregator.py main()

# Parse JSONL sources from CLI
jsonl_sources = args.jsonl.split(',') if args.jsonl else []
jsonl_paths = [Path(src.strip()) for src in jsonl_sources if src.strip()]

# Read all sources
learnings = read_multi_source_jsonl(jsonl_paths)

print(f"Total learnings from {len(jsonl_paths)} sources: {len(learnings)}",
      file=sys.stderr)
```

---

## Pattern Merging with Source Tracking

**When to use:** In aggregator when merging a learning into an existing pattern.

**Code example:**

```python
def merge_into_pattern(learning: Dict, pattern: Dict) -> Dict:
    """
    Merge learning into existing pattern, tracking source projects.

    Args:
        learning: Learning dictionary with source_project field
        pattern: Existing pattern dictionary

    Returns:
        Updated pattern dictionary

    Side Effects:
        Modifies pattern in-place
    """
    # Increment occurrence count
    pattern["occurrences"] = pattern.get("occurrences", 1) + 1

    # Track source learning IDs
    if "source_learnings" not in pattern:
        pattern["source_learnings"] = []
    pattern["source_learnings"].append(learning["learning_id"])

    # Track projects (existing field)
    project = learning.get("project", "unknown")
    if "projects" not in pattern:
        pattern["projects"] = []
    if project not in pattern["projects"]:
        pattern["projects"].append(project)

    # NEW: Track source_projects for cross-project evidence
    source_project = learning.get("source_project", "unknown")
    if "source_projects" not in pattern:
        pattern["source_projects"] = []
    if source_project not in pattern["source_projects"]:
        pattern["source_projects"].append(source_project)

    # NEW: Increment evidence count
    pattern["evidence_count"] = len(pattern["source_learnings"])

    # Escalate severity if needed
    if learning.get("priority") == "P1" and pattern.get("severity") != "critical":
        pattern["severity"] = "critical"

    return pattern

def create_new_pattern(learning: Dict, pattern_id: str) -> Dict:
    """
    Create new pattern from learning.

    Args:
        learning: Learning dictionary with source_project field
        pattern_id: Generated pattern ID (e.g., "PATTERN-001")

    Returns:
        New pattern dictionary
    """
    return {
        "pattern_id": pattern_id,
        "name": learning["root_cause"][:50] + "...",  # Truncate for name
        "status": "IDENTIFIED",
        "category": learning.get("category", "functionality"),
        "severity": "critical" if learning.get("priority") == "P1" else "medium",
        "occurrences": 1,
        "projects": [learning.get("project", "unknown")],
        "source_projects": [learning.get("source_project", "unknown")],  # NEW
        "evidence_count": 1,  # NEW
        "root_cause": learning["root_cause"],
        "proposed_solution": "",  # To be filled by vision generator
        "source_learnings": [learning["learning_id"]],
        "discovered_in": f"{learning['plan_id']}-iter-{learning['iteration']}",
        "discovered_at": learning["timestamp"],
        "affected_files": [],
        "verification_start_iteration": None,
        "implemented_at": None,
        "verified_at": None,
        "regressed_at": None
    }
```

**Key points:**
- `source_projects` is a list of unique project names where this pattern was detected
- `evidence_count` is the total number of learnings (len(source_learnings))
- Backwards compatible: patterns without these fields get them added on first merge
- Both fields are used for cross-project pattern confidence assessment

---

## Framework Issue Filtering Pattern

**When to use:** In reflection generator when determining if an issue should be captured.

**Code example:**

```python
# Constants at top of file
FRAMEWORK_KEYWORDS = [
    # Agent names
    'orchestrator', 'explorer', 'builder', 'integrator', 'validator', 'healer',
    # Agent lifecycle
    'task tool', 'agent spawn', 'agent_start', 'agent_complete',
    # Commands
    '2l-mvp', '2l-improve', '2l-dashboard', '2l-vision',
    # Core systems
    'event logging', 'pattern detection', 'reflection', 'aggregation',
    # Plan-10 specific
    'federation', 'cross-project', 'multi-source',
    # Data layer
    'JSONL', 'YAML parsing', 'global-learnings', 'pattern lifecycle',
    # Performance (framework-specific)
    'aggregation slow', 'reflection generation', 'pattern matching slow',
    'agent spawn timeout', 'integration phase slow', 'validation phase slow'
]

FRAMEWORK_PATHS = [
    'commands/', 'lib/', 'agents/', 'templates/', '.2L/',
    '2l-', 'lib/2l-', '~/.claude/'
]

PROJECT_PATHS = [
    'app/', 'src/', 'components/', 'pages/', 'api/',
    'public/', 'styles/', 'utils/', 'hooks/', 'services/',
    'models/', 'views/', 'controllers/', 'middleware/'
]

def is_framework_issue(issue: Dict) -> bool:
    """
    Determine if issue is about 2L framework vs project code.

    Args:
        issue: Issue dictionary with 'issue', 'root_cause', 'location' fields

    Returns:
        True if framework issue, False if project issue

    Heuristic:
        1. Path-based (highest confidence): framework paths = True, project paths = False
        2. Keyword-based (medium confidence): framework keywords + no project path = True
        3. Conservative default: False (when uncertain, don't capture)

    Examples:
        >>> is_framework_issue({'location': 'lib/2l-reflection-aggregator.py', ...})
        True
        >>> is_framework_issue({'location': 'app/services/auth.ts', ...})
        False
        >>> is_framework_issue({'issue': 'Integration phase slow', 'location': ''})
        True
        >>> is_framework_issue({'issue': 'Database query slow', 'location': ''})
        False
    """
    location = issue.get('location', '').lower()

    # Signal 1: File path matching (highest confidence)
    for framework_path in FRAMEWORK_PATHS:
        if framework_path in location:
            return True

    # Signal 2: Exclude project paths (high confidence for exclusion)
    for project_path in PROJECT_PATHS:
        if project_path in location:
            return False

    # Signal 3: Keyword matching with context
    issue_text = (
        issue.get('issue', '') + ' ' +
        issue.get('root_cause', '') + ' ' +
        issue.get('context', '')
    ).lower()

    has_framework_keyword = any(
        keyword.lower() in issue_text
        for keyword in FRAMEWORK_KEYWORDS
    )

    # Framework keyword without project path = likely framework issue
    if has_framework_keyword and not any(pp in location for pp in PROJECT_PATHS):
        return True

    # Conservative default: NOT framework issue
    return False
```

**Priority classification (clear P1/P2/P3 semantics):**

```python
def classify_priority(issue: Dict) -> str:
    """
    Classify issue priority based on framework impact.

    Priority Levels (FRAMEWORK-FOCUSED):
        P1 (Functionality): 2L workflow broken
            - Agent crashes, orchestrator fails, command errors
            - Example: "Builder agent crashes on complex tasks"

        P2 (Completeness): 2L missing features
            - Workflow gaps, missing capabilities
            - Example: "No healing phase for failed integrations"

        P3 (Speed): 2L framework performance
            - Agent spawn slow, integration slow, aggregation slow
            - NOT app performance (database slow, build slow)
            - Example: "Integration phase takes 45s for 4 builders"

    Args:
        issue: Issue dictionary

    Returns:
        "P1", "P2", or "P3"
    """
    issue_text = (issue.get('issue', '') + ' ' + issue.get('root_cause', '')).lower()

    # P1: Functionality (workflow broken)
    p1_keywords = [
        'crash', 'fail', 'error', 'exception', 'broken',
        'agent spawn failed', 'orchestrator failed', 'command error'
    ]
    if any(kw in issue_text for kw in p1_keywords):
        return "P1"

    # P3: Speed (framework performance)
    p3_keywords = [
        'slow', 'timeout', 'performance', 'takes too long',
        'agent spawn slow', 'integration phase slow', 'aggregation slow',
        'reflection generation slow', 'pattern matching slow'
    ]
    if any(kw in issue_text for kw in p3_keywords):
        return "P3"

    # P2: Completeness (default for framework issues)
    return "P2"
```

---

## Vision Generation with Cross-Project Evidence

**When to use:** In vision generator when creating improvement plan from pattern.

**Code example:**

```python
def format_cross_project_evidence(pattern: Dict) -> str:
    """
    Format cross-project evidence for vision display.

    Args:
        pattern: Pattern dictionary with source_projects and evidence_count

    Returns:
        Formatted string for vision markdown
    """
    source_projects = pattern.get('source_projects', [])
    evidence_count = pattern.get('evidence_count', 0)

    if len(source_projects) == 0:
        return "Evidence: None (legacy pattern)"

    if len(source_projects) == 1:
        return f"Evidence: {evidence_count} occurrence(s) in {source_projects[0]}"

    # Multiple projects - show cross-project evidence
    confidence = "HIGH" if len(source_projects) >= 3 else "MEDIUM"
    projects_str = ", ".join(source_projects)

    return f"""Cross-Project Evidence:
- **Confidence:** {confidence} ({len(source_projects)} projects affected)
- **Projects:** {projects_str}
- **Total occurrences:** {evidence_count}
- **Impact:** Framework issue detected across multiple production projects"""

# Usage in vision template
vision_content = f"""## Pattern Evidence

{format_cross_project_evidence(pattern)}

## Root Cause

{pattern['root_cause']}

## Proposed Solution

{pattern.get('proposed_solution', 'To be determined during exploration phase')}
"""
```

---

## Backwards Compatibility Pattern

**When to use:** Everywhere that accesses `source_project` or `source_projects` fields.

**Code example:**

```python
# Reading learnings - provide default for missing field
def tag_source_project(learning: Dict, source_project: str) -> Dict:
    """
    Add source_project field if missing (backwards compatibility).

    Args:
        learning: Learning dictionary (may lack source_project)
        source_project: Derived source project name

    Returns:
        Learning dictionary with source_project field
    """
    if 'source_project' not in learning:
        learning['source_project'] = source_project
    return learning

# Reading patterns - handle missing source_projects field
def get_source_projects(pattern: Dict) -> List[str]:
    """
    Get source_projects list with backwards compatibility.

    Args:
        pattern: Pattern dictionary (may lack source_projects)

    Returns:
        List of source project names (empty list if field missing)
    """
    return pattern.get('source_projects', [])

# Example usage throughout codebase
source_project = learning.get('source_project', 'meditation-space')
source_projects = pattern.get('source_projects', [])
evidence_count = pattern.get('evidence_count', len(pattern.get('source_learnings', [])))
```

**Key points:**
- Always use `.get()` with sensible defaults
- Never assume new fields exist in old data
- Default `source_project` to `"meditation-space"` for legacy learnings
- Default `source_projects` to `[]` for legacy patterns
- Calculate `evidence_count` from `source_learnings` if field missing

---

## Error Logging Convention

**When to use:** Throughout all new code for debugging and monitoring.

**Code example:**

```python
import sys

# Informational messages (to stderr, not stdout)
print(f"Discovered {len(valid_paths)} Prod/* projects", file=sys.stderr)
print(f"Loaded {len(learnings)} learnings from {source_project}", file=sys.stderr)

# Warnings (recoverable errors)
print(f"WARNING: Cannot read {jsonl_path}: {e}", file=sys.stderr)
print(f"WARNING: Malformed JSON at {jsonl_path}:{line_num}", file=sys.stderr)
print(f"WARNING: Skipping invalid path: {match}", file=sys.stderr)

# Performance metrics
print(f"⏱️  Aggregation complete: {elapsed:.2f}s", file=sys.stderr)
print(f"   Learnings processed: {len(learnings)}", file=sys.stderr)
print(f"   Patterns updated: {len(updated_patterns)}", file=sys.stderr)

# Performance warnings
if elapsed > 5.0:
    print(f"⚠️  WARNING: Aggregation exceeded 5s target ({elapsed:.2f}s)",
          file=sys.stderr)
```

**Key points:**
- All logs go to stderr (stdout reserved for data output)
- Use `WARNING:` prefix for recoverable errors
- Use emoji sparingly (⏱️ for timing, ⚠️ for warnings)
- Include context (file path, line number, actual values)

---

## Import Order Convention

```python
# Standard library imports (alphabetical)
import glob
import json
import os
import sys
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Third-party imports (none for Plan-10)

# Local imports (2L utilities)
from 2l_yaml_helpers import atomic_write_yaml, generate_pattern_id

# Note: Hyphenated filenames require special import handling
import importlib.util
spec = importlib.util.spec_from_file_location(
    "yaml_helpers",
    Path(__file__).parent / "2l-yaml-helpers.py"
)
yaml_helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(yaml_helpers)
```

---

## Testing Pattern

**When to use:** For unit tests of new functions.

**Code example:**

```python
# In lib/test_multi_source_aggregation.py

import unittest
from pathlib import Path
from 2l_reflection_aggregator import infer_source_project, read_multi_source_jsonl

class TestMultiSourceAggregation(unittest.TestCase):
    """Test multi-source learning aggregation."""

    def test_infer_source_project_meditation_space(self):
        """Test meditation space detection."""
        path = Path("/home/user/Ahiya/2L/.2L/global-learnings.jsonl")
        self.assertEqual(infer_source_project(path), "meditation-space")

    def test_infer_source_project_prod_simple(self):
        """Test simple Prod/* project detection."""
        path = Path("/home/user/Ahiya/2L/Prod/StatViz/.2L/global-learnings.jsonl")
        self.assertEqual(infer_source_project(path), "StatViz")

    def test_infer_source_project_prod_nested(self):
        """Test nested Prod/* project detection."""
        path = Path("/home/user/Ahiya/2L/Prod/clients/acme/dashboard/.2L/...")
        self.assertEqual(infer_source_project(path), "clients-acme-dashboard")

    def test_backwards_compatibility_missing_source_project(self):
        """Test that learnings without source_project field still work."""
        # Create mock learning without source_project
        learning = {
            'learning_id': 'test-001',
            'root_cause': 'Test issue'
        }

        # Should default to 'unknown' or provided value
        tagged = tag_source_project(learning, 'meditation-space')
        self.assertEqual(tagged['source_project'], 'meditation-space')

if __name__ == '__main__':
    unittest.main()
```

**Key points:**
- Test all edge cases (meditation space, Prod/*, nested paths)
- Test backwards compatibility (missing fields)
- Use descriptive test names
- Include docstrings explaining what's tested
