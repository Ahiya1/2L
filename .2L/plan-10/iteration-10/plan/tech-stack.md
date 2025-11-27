# Technology Stack

## Core Framework

**Decision:** Python 3.12 with standard library only

**Rationale:**
- **Existing production infrastructure:** Already used for all 2L reflection/aggregation tools
- **Zero installation overhead:** No external dependencies to manage or version conflicts
- **Proven performance:** Current aggregator handles 100+ learnings efficiently
- **File I/O optimized:** Standard library glob, json, yaml libraries are sufficient for filesystem operations

**Alternatives Considered:**
- **External libraries (scikit-learn for similarity matching):** Rejected - adds dependency overhead, existing `difflib.SequenceMatcher` works well with 0.8 threshold
- **Bash-only implementation:** Rejected - complex JSONL/YAML parsing error-prone in bash, Python better for structured data

## Data Storage

**Decision:** JSONL (append-only) + YAML (aggregated state)

**Rationale:**
- **JSONL for learnings:** Append-only audit trail, line-by-line error recovery, concurrent-safe appends with fcntl
- **YAML for patterns:** Human-readable aggregated state, atomic writes with temp file + rename pattern
- **Already production-tested:** Existing reflection pipeline uses this exact schema
- **Federation-friendly:** JSONL files are independent, easy to discover with glob patterns

**Schema Strategy:**

**Learning Entry (JSONL):**
```json
{
  "learning_id": "plan-X-iter-Y-learning-NNN",
  "timestamp": "ISO-8601",
  "iteration": 10,
  "plan_id": "plan-10",
  "source_project": "StatViz",  // NEW FIELD
  "project": "2L-self-improvement",
  "category": "framework-performance",
  "priority": "P1|P2|P3",
  "root_cause": "Integration phase slow...",
  "context": "...",
  "pattern_id": null
}
```

**Pattern Entry (YAML):**
```yaml
pattern_id: PATTERN-001
name: "Pattern name"
status: IDENTIFIED|IMPLEMENTED|VERIFIED|REGRESSED
category: functionality|completeness|speed
severity: low|medium|critical
occurrences: 5
projects: ["2L-self-improvement", "StatViz"]
source_projects: ["StatViz", "TaskManager", "meditation-space"]  # NEW FIELD
evidence_count: 5  # NEW FIELD (count of source_learnings)
root_cause: "..."
proposed_solution: "..."
source_learnings: ["learning-001", "learning-002", ...]
discovered_in: "plan-X-iter-Y"
discovered_at: "ISO-8601"
# Lifecycle tracking
verification_start_iteration: 8
implemented_at: "ISO-8601"
verified_at: "ISO-8601"
regressed_at: "ISO-8601"
```

## Multi-Source Discovery

**Decision:** Glob pattern with graceful degradation

**Rationale:**
- **Simple and reliable:** Python's `glob.glob()` is well-tested for filesystem traversal
- **Non-blocking:** Missing Prod/* projects don't break `/2l-improve` (returns empty list)
- **Lazy federation:** Discovery happens on-demand when `/2l-improve` runs (no background jobs, no daemons)

**Implementation Pattern:**
```python
import glob
import os
from pathlib import Path

def discover_prod_learnings() -> List[Path]:
    """Discover all global-learnings.jsonl files in Prod/* projects."""
    pattern = os.path.expanduser('~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl')

    try:
        matches = glob.glob(pattern)
    except (PermissionError, OSError) as e:
        print(f"WARNING: Cannot access Prod/* directories: {e}", file=sys.stderr)
        return []

    # Validate paths exist
    valid_paths = []
    for match in matches:
        path = Path(match)
        if path.exists() and path.is_file():
            valid_paths.append(path)

    return valid_paths
```

## Framework Issue Classification

**Decision:** Multi-signal heuristic with conservative bias

**Rationale:**
- **Path-based signals:** File path matching has highest confidence (framework paths vs project paths)
- **Keyword-based signals:** Framework-specific terms (orchestrator, explorer, builder, integrator, etc.)
- **Conservative default:** When uncertain, do NOT capture (prefer false negatives over false positives)
- **Production-tested:** Existing `is_framework_issue()` function has proven reliable

**Enhanced Keyword Set:**
```python
FRAMEWORK_KEYWORDS = [
    # Agent names
    'orchestrator', 'explorer', 'builder', 'integrator', 'validator', 'healer',

    # Agent lifecycle
    'task tool', 'agent spawn', 'agent_start', 'agent_complete',

    # Commands
    '2l-mvp', '2l-improve', '2l-dashboard', '2l-vision', '2l-plan', '2l-build',

    # Core systems
    'event logging', 'pattern detection', 'reflection', 'aggregation',

    # Plan-10 specific
    'federation', 'cross-project', 'multi-source', 'Prod/* discovery',

    # Data layer
    'JSONL corruption', 'YAML parsing', 'global-learnings',
    'pattern lifecycle', 'learning aggregation',

    # Performance indicators (framework-specific)
    'aggregation slow', 'reflection generation timeout', 'pattern matching slow',
    'agent spawn timeout', 'integration phase slow', 'validation phase slow'
]

FRAMEWORK_PATHS = [
    'commands/', 'lib/', 'agents/', 'templates/', '.2L/',
    '2l-', 'lib/2l-', 'templates/', '~/.claude/'
]

PROJECT_PATHS = [
    'app/', 'src/', 'components/', 'pages/', 'api/',
    'public/', 'styles/', 'utils/', 'hooks/', 'services/',
    'models/', 'views/', 'controllers/', 'middleware/'
]
```

## Similarity Matching

**Decision:** difflib.SequenceMatcher with 0.8 threshold (keep existing algorithm)

**Rationale:**
- **Production-proven:** Current aggregator uses Ratcliff-Obershelp algorithm successfully
- **Fast enough:** O(n²) complexity acceptable for n<100 learnings per source
- **Tuned threshold:** 0.8 captures similar root causes across projects without over-merging
- **No external dependencies:** Built into Python standard library

**Example:**
```python
from difflib import SequenceMatcher

def calculate_similarity(text1: str, text2: str) -> float:
    """Calculate normalized similarity score between two texts."""
    norm1 = text1.lower().strip()
    norm2 = text2.lower().strip()
    return SequenceMatcher(None, norm1, norm2).ratio()

# Cross-project pattern matching
# "Integration phase slow - 45s for 4 builders" (StatViz)
# "Integrator took 50s to merge outputs" (TaskManager)
# Similarity: 0.82 → MERGE into same pattern
```

## Source Project Derivation

**Decision:** Path parsing with dash-separated naming for nested projects

**Rationale:**
- **Zero configuration:** No need to add project_name to config files
- **Deterministic:** Same path always yields same project name
- **Handles nesting:** `Prod/clients/acme/dashboard` → "clients-acme-dashboard"
- **Readable:** Dash-separated names are human-friendly

**Implementation:**
```python
from pathlib import Path

def infer_source_project(jsonl_path: Path) -> str:
    """
    Extract source project name from JSONL path.

    Examples:
        ~/Ahiya/2L/Prod/StatViz/.2L/global-learnings.jsonl → "StatViz"
        ~/Ahiya/2L/Prod/clients/acme/dashboard/.2L/... → "clients-acme-dashboard"
        ~/Ahiya/2L/.2L/global-learnings.jsonl → "meditation-space"
    """
    parts = jsonl_path.parts

    # Check if in Prod/* directory
    if 'Prod' in parts:
        prod_index = parts.index('Prod')

        # Get all parts between 'Prod' and '.2L'
        project_parts = []
        for i in range(prod_index + 1, len(parts)):
            if parts[i] == '.2L':
                break
            project_parts.append(parts[i])

        # Join with dash for readability
        return '-'.join(project_parts) if project_parts else "unknown"

    # Meditation space (2L's own iterations)
    return "meditation-space"
```

## Error Handling

**Decision:** Graceful degradation with warning logs

**Rationale:**
- **Non-blocking:** One corrupted JSONL file should not break entire aggregation
- **Informative:** Log warnings to stderr for debugging
- **Production-tested:** Existing aggregator already implements line-by-line error recovery

**JSONL Error Recovery:**
```python
def read_jsonl(jsonl_path: Path) -> List[Dict]:
    """Read JSONL file with graceful error handling."""
    learnings = []

    try:
        with open(jsonl_path) as f:
            for line_num, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue  # Skip empty lines

                try:
                    learnings.append(json.loads(line))
                except json.JSONDecodeError as e:
                    # Log error but CONTINUE (graceful degradation)
                    print(f"WARNING: Malformed JSON at {jsonl_path}:{line_num}: {e}",
                          file=sys.stderr)
                    continue
    except (FileNotFoundError, PermissionError) as e:
        print(f"WARNING: Cannot read {jsonl_path}: {e}", file=sys.stderr)
        return []

    return learnings
```

## Atomic YAML Updates

**Decision:** Temp file + rename pattern with backup (keep existing implementation)

**Rationale:**
- **Crash-safe:** OS-level atomic rename guarantees no partial writes
- **Backup safety net:** .bak file created before any modification
- **Production-tested:** Existing `2l-yaml-helpers.py` uses this pattern successfully

**Implementation (already exists, no changes needed):**
```python
import tempfile
import shutil
import os

def atomic_write_yaml(file_path, data):
    """Write YAML atomically to prevent corruption."""
    dir_path = os.path.dirname(file_path)

    # 1. Create backup
    if os.path.exists(file_path):
        shutil.copy2(file_path, file_path + '.bak')

    # 2. Create temp file in SAME directory (same filesystem)
    temp_fd, temp_path = tempfile.mkstemp(
        dir=dir_path,
        prefix='.tmp_',
        suffix='.yaml'
    )

    # 3. Write to temp file
    with os.fdopen(temp_fd, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)

    # 4. Atomic rename (OS-level guarantee)
    shutil.move(temp_path, file_path)
```

## Environment Variables

No environment variables required for Plan-10. All configuration is hardcoded or derived from filesystem structure.

**Assumptions:**
- Meditation space is always `~/Ahiya/2L`
- Production projects are always under `~/Ahiya/2L/Prod/*`
- Learnings files are always `.2L/global-learnings.jsonl`

## Dependencies Overview

**Python Standard Library Only:**

| Package | Version | Purpose |
|---------|---------|---------|
| `glob` | stdlib | Prod/* learnings discovery |
| `pathlib` | stdlib | Cross-platform path manipulation |
| `json` | stdlib | JSONL parsing/writing |
| `yaml` | stdlib | YAML parsing/writing (PyYAML bundled with Python) |
| `difflib` | stdlib | Similarity matching (SequenceMatcher) |
| `fcntl` | stdlib | File locking for concurrent appends (Unix-only) |
| `tempfile` | stdlib | Atomic YAML writes |
| `shutil` | stdlib | File operations (copy, move) |
| `argparse` | stdlib | CLI argument parsing |
| `importlib.util` | stdlib | Dynamic module loading (hyphenated filenames) |

**No external dependencies to install.**

## Performance Targets

**Aggregation Performance:**
- **Target:** <5 seconds for 100+ learnings from 10+ projects
- **Measured with:** Timing instrumentation in aggregator
- **Expected bottleneck:** SequenceMatcher O(n²) in pattern matching
- **Mitigation:** Incremental mode (only process new learnings), category-based filtering before similarity comparison

**Discovery Performance:**
- **Target:** <1 second to glob Prod/*/.2L/global-learnings.jsonl
- **Expected:** ~100ms for 10-20 projects
- **No optimization needed:** Glob is fast for small directory trees

**JSONL Read Performance:**
- **Target:** <1 second to read 100+ learning entries
- **Expected:** ~50ms per file (100 learnings × 200 bytes = 20KB)
- **No optimization needed:** Line-by-line JSON parsing is fast

## Security Considerations

**File Permission Handling**
- **Risk:** Permission denied when reading Prod/* learnings
- **Mitigation:** Try/except around glob and file reads, log warnings, continue with available sources

**JSONL Injection Prevention**
- **Risk:** Malformed JSON in Prod/* learnings could crash aggregator
- **Mitigation:** Line-by-line parsing with error recovery, skip malformed lines

**Path Traversal Prevention**
- **Risk:** Glob pattern could access files outside Prod/* directory
- **Mitigation:** Use absolute path expansion, validate discovered paths before reading

**No Authentication/Authorization**
- **Scope:** All operations are local filesystem reads within user's home directory
- **Risk:** None - user already has access to their own files

## Code Quality Standards

**Linting:** Follow existing 2L codebase style (no formal linter configured)

**Type Hints:** Use Python 3 type hints for new functions:
```python
def discover_prod_learnings() -> List[Path]:
def infer_source_project(jsonl_path: Path) -> str:
def tag_source_project(learning: Dict, source_project: str) -> Dict:
```

**Docstrings:** Use Google-style docstrings for all new functions:
```python
def infer_source_project(jsonl_path: Path) -> str:
    """
    Extract source project name from JSONL path.

    Args:
        jsonl_path: Path to global-learnings.jsonl file

    Returns:
        Project name (e.g., "StatViz", "meditation-space")

    Examples:
        >>> infer_source_project(Path("~/Ahiya/2L/Prod/StatViz/.2L/..."))
        'StatViz'
        >>> infer_source_project(Path("~/Ahiya/2L/.2L/..."))
        'meditation-space'
    """
```

**Error Messages:** Clear, actionable warnings to stderr:
```python
print(f"WARNING: Cannot read {jsonl_path}: {e}", file=sys.stderr)
print(f"⏱️  Aggregation complete: {elapsed:.2f}s", file=sys.stderr)
print(f"⚠️  WARNING: Aggregation exceeded 5s target ({elapsed:.2f}s)", file=sys.stderr)
```

## Testing Strategy

**Unit Testing:** Extend existing `lib/test_reflection_aggregator.py`
- Test source project derivation (meditation space, Prod/*, nested paths)
- Test backwards compatibility (learnings without source_project field)
- Test multi-source aggregation (multiple JSONL inputs)
- Test error handling (missing files, malformed JSON, permission denied)

**Integration Testing:** Manual testing with mock Prod/* projects
- Create mock projects with test learnings
- Run `/2l-improve` in meditation space
- Verify cross-project patterns detected
- Verify source_projects field populated

**Performance Testing:** Timing instrumentation
- Add timing logs to aggregator
- Measure with 100+ learnings from 10+ sources
- Assert elapsed time <5s
- Profile with `cProfile` if threshold exceeded

**No regression testing framework** - existing smoke tests in `lib/2l-smoke-tests.sh` verify framework health after changes.
