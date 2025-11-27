# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

The 2L framework implements a **Python-centric, file-based orchestration system** with bash command wrappers. The current architecture uses:

- **Python 3.12** for core logic (reflection, aggregation, pattern lifecycle, vision generation)
- **Bash scripts** for command interfaces and orchestration flow
- **YAML** for structured data storage (patterns, learnings, configuration)
- **JSONL** for append-only audit trails and learning streams
- **Standard library only** - zero external Python dependencies (difflib, yaml, pathlib, argparse)

**Key Finding for Plan-10:** Multi-source learning discovery requires **glob-based file system traversal** and **robust JSONL parsing** across potentially incomplete/malformed files from production projects. The existing `2l-reflection-aggregator.py` already implements the core patterns needed, but must be extended for multi-source federation.

## Discoveries

### 1. Python Technology Stack

**Current Dependencies (All Standard Library):**
- `yaml` - YAML parsing/serialization for global-learnings.yaml
- `json` - JSONL reading/writing for audit trails
- `glob` - File pattern matching (already used in 2l-pattern-lifecycle.py)
- `difflib.SequenceMatcher` - Fuzzy similarity matching (0.8 threshold)
- `pathlib.Path` - Cross-platform file path handling
- `argparse` - CLI argument parsing
- `fcntl` - File locking for concurrent JSONL appends (Unix-only)
- `tempfile` + `shutil` - Atomic YAML writes
- `importlib.util` - Dynamic module loading (for hyphenated filenames)

**No External Dependencies:** The framework deliberately avoids external packages to minimize installation complexity. This constraint must be maintained for Plan-10.

### 2. Bash Orchestration Patterns

**Command Structure:**
- All commands in `/commands/*.md` (markdown with embedded bash)
- Event logging via `lib/2l-event-logger.sh` (optional, fails gracefully)
- Multi-stage pipelines: detection → selection → exploration → vision → execution
- Safety checkpoints using git tags before self-modification

**Key Pattern - Graceful Degradation:**
```bash
# Event logging is OPTIONAL - never blocks core functionality
EVENT_LOGGING_ENABLED=false
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    EVENT_LOGGING_ENABLED=true
fi
```

This pattern should be applied to multi-source discovery (missing Prod/* projects should not block /2l-improve).

### 3. Data Schema Patterns

**JSONL Structure (Append-Only):**
```json
{
  "learning_id": "plan-X-iter-Y-learning-NNN",
  "timestamp": "ISO-8601",
  "iteration": 10,
  "plan_id": "plan-10",
  "source_project": "StatViz",  // NEW FIELD for Plan-10
  "category": "framework-performance",
  "priority": "P1|P2|P3",
  "root_cause": "Integration phase slow...",
  "context": "...",
  "pattern_id": null  // null until aggregated
}
```

**YAML Structure (Aggregated State):**
```yaml
schema_version: "1.0"
aggregated_at: "ISO-8601"
total_projects: 1
total_learnings: 1
patterns:
  - pattern_id: PATTERN-001
    name: "Pattern name"
    occurrences: 2
    projects: ["2L-self-improvement", "StatViz"]  // Multi-project tracking
    source_projects: ["StatViz", "TaskManager"]   // NEW for Plan-10
    evidence_count: 5  // NEW for Plan-10 (total learnings)
    severity: "medium|critical"
    category: "functionality|completeness|speed"
    root_cause: "..."
    proposed_solution: "..."
    status: "IDENTIFIED|IMPLEMENTED|VERIFIED|REGRESSED"
    discovered_in: "plan-X-iter-Y"
    discovered_at: "ISO-8601"
    source_learnings: ["learning-001", "learning-002"]
    affected_files: ["path/to/file.py"]
    # Lifecycle fields
    verification_start_iteration: 8
    implemented_at: "ISO-8601"
    verified_at: "ISO-8601"
    regressed_at: "ISO-8601"
```

### 4. Framework Detection Keywords

**Current Implementation (2l-reflection-generator.py lines 45-62):**
```python
FRAMEWORK_KEYWORDS = [
    'orchestrator', 'explorer', 'builder', 'integrator', 'validator', 'healer',
    'task tool', 'agent spawn', 'agent_start', 'agent_complete',
    '2l-mvp', '2l-improve', '2l-dashboard', 'event logging',
    'pattern detection', 'reflection', 'aggregation'
]

FRAMEWORK_PATHS = [
    'commands/', 'lib/', 'agents/', 'templates/', '.2L/',
    '2l-', 'lib/2l-', 'templates/'
]

PROJECT_PATHS = [
    'app/', 'src/', 'components/', 'pages/', 'api/',
    'public/', 'styles/', 'utils/', 'hooks/'
]
```

**Effectiveness Analysis:**
- ✅ Good coverage of agent names and core commands
- ✅ Path-based heuristics separate framework from project code
- ⚠️ May miss: "slow pattern aggregation", "JSONL append timeout" (performance without agent keywords)
- ⚠️ May capture: "builder took 2 minutes" (could be complex code generation, not framework slowness)

**Recommendation for Plan-10:** Expand keywords to include:
- Performance indicators: "aggregation slow", "reflection generation timeout", "pattern matching slow"
- Data layer terms: "JSONL corruption", "YAML parsing", "global-learnings"
- Multi-source terms: "federation", "cross-project", "Prod/* discovery"

## Patterns Identified

### Pattern 1: Atomic File Updates with Backup

**Description:** All YAML mutations use temp file + rename + backup strategy

**Implementation (2l-yaml-helpers.py lines 19-52):**
```python
def atomic_write_yaml(file_path, data):
    # 1. Create temp file in SAME directory (same filesystem)
    temp_fd, temp_path = tempfile.mkstemp(dir=dir_path, prefix='.tmp_', suffix='.yaml')
    
    # 2. Write to temp file
    with os.fdopen(temp_fd, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
    
    # 3. Atomic rename (OS-level guarantee)
    shutil.move(temp_path, file_path)

def backup_before_write(file_path):
    # Create .bak before ANY modification
    shutil.copy2(file_path, file_path + '.bak')
```

**Use Case:** Prevents corruption if process crashes mid-write

**Recommendation:** Apply this pattern to multi-source aggregation. Backup meditation space global-learnings.yaml before merging Prod/* learnings.

### Pattern 2: Similarity-Based Deduplication

**Description:** Uses Ratcliff-Obershelp algorithm for fuzzy matching

**Implementation (2l-reflection-aggregator.py lines 79-100):**
```python
def calculate_similarity(self, text1: str, text2: str) -> float:
    norm1 = text1.lower().strip()
    norm2 = text2.lower().strip()
    return SequenceMatcher(None, norm1, norm2).ratio()

# Threshold: 0.8 (empirically tuned)
# - 1.0 = identical
# - 0.8+ = very similar (merge)
# - <0.8 = different (new pattern)
```

**Use Case:** Detect when "Integration phase slow (45s)" from StatViz matches "Integrator took 50s" from TaskManager

**Cross-Project Pattern Detection:**
```python
def find_best_match(learning, patterns):
    for pattern in patterns:
        # CRITICAL: Only compare within same category
        if pattern['category'] != learning['category']:
            continue
        
        score = calculate_similarity(learning['root_cause'], pattern['root_cause'])
        if score >= 0.8:
            return pattern, score
    return None, 0.0
```

**Recommendation:** Reuse this exact algorithm for cross-project pattern aggregation. No changes needed - already production-tested.

### Pattern 3: Multi-Source JSONL Discovery

**Description:** Glob-based file discovery with graceful error handling

**Current Implementation (2l-pattern-lifecycle.py lines 367-385):**
```python
def _load_iteration_learnings(self, iteration: int) -> List[Dict]:
    pattern = f'.2L/plan-*/iteration-{iteration}/learnings.yaml'
    matches = glob.glob(pattern)
    
    if not matches:
        raise FileNotFoundError(f"No learnings file found for iteration {iteration}")
    
    learnings_path = Path(matches[0])
    with open(learnings_path, 'r') as f:
        data = yaml.safe_load(f)
    
    return data.get('learnings', []) if data else []
```

**Adaptation for Plan-10 (Prod/* Discovery):**
```python
def discover_prod_learnings() -> List[Path]:
    """Discover all global-learnings.jsonl files in Prod/* projects."""
    pattern = os.path.expanduser('~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl')
    matches = glob.glob(pattern)
    
    # Convert to Path objects, verify existence
    valid_paths = []
    for match in matches:
        path = Path(match)
        if path.exists() and path.is_file():
            valid_paths.append(path)
    
    return valid_paths
```

**Recommendation:** Implement as standalone function in 2l-reflection-aggregator.py. Return empty list if no Prod/* projects found (graceful degradation).

### Pattern 4: JSONL Error Recovery

**Description:** Robust line-by-line parsing with skip-on-error

**Implementation (2l-reflection-aggregator.py lines 295-325):**
```python
def read_jsonl(jsonl_path: Path) -> List[Dict]:
    learnings = []
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
    
    return learnings
```

**Use Case:** Prod/* projects may have incomplete iterations with corrupted JSONL

**Recommendation:** Keep this pattern unchanged. Production-tested to handle:
- Incomplete learning entries (mid-write crashes)
- Empty lines (common in append-only logs)
- Mixed encodings (ensure_ascii=False in dumps)

### Pattern 5: Source Project Tracking

**Description:** Infer source project from file path

**Proposed Implementation:**
```python
def infer_source_project(jsonl_path: Path) -> str:
    """
    Extract source project name from JSONL path.
    
    Examples:
        ~/Ahiya/2L/Prod/StatViz/.2L/global-learnings.jsonl -> "StatViz"
        ~/Ahiya/2L/.2L/global-learnings.jsonl -> "meditation-space"
    """
    parts = jsonl_path.parts
    
    # Check if in Prod/* directory
    if 'Prod' in parts:
        prod_index = parts.index('Prod')
        if prod_index + 1 < len(parts):
            return parts[prod_index + 1]  # Project directory name
    
    # Meditation space (2L's own iterations)
    return "meditation-space"
```

**Use Case:** Tag each learning with `source_project` field during aggregation

**Recommendation:** Add this function to 2l-reflection-aggregator.py. Call before processing each JSONL source.

## Technology Recommendations

### Primary Stack (No Changes)

- **Python 3.12** - Current version, standard library only
- **Bash** - Command interfaces and orchestration
- **YAML** - Structured data (global-learnings.yaml)
- **JSONL** - Append-only streams (global-learnings.jsonl)
- **Git** - Version control and safety checkpoints

**Rationale:** Existing stack is production-proven and requires zero installation overhead.

### Supporting Libraries (Standard Library Only)

| Library | Purpose | Why It's Needed |
|---------|---------|-----------------|
| `glob` | File discovery | Find `~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl` |
| `pathlib` | Path manipulation | Cross-platform path handling |
| `difflib` | Similarity matching | Detect cross-project patterns (existing 0.8 threshold) |
| `json` | JSONL parsing | Robust line-by-line learning reads |
| `yaml` | YAML serialization | Update global-learnings.yaml atomically |
| `fcntl` | File locking | Prevent concurrent JSONL corruption (Unix-only, optional) |
| `tempfile` + `shutil` | Atomic writes | Temp file + rename for YAML updates |

**New Usage for Plan-10:**
- `glob.glob('~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl')` - Multi-source discovery
- `os.path.expanduser('~')` - Handle home directory expansion

### File Organization Patterns

**Current Structure:**
```
~/Ahiya/2L/                          # Meditation space
  .2L/
    config.yaml                      # Global config
    global-learnings.jsonl           # Meditation space learnings (JSONL)
    global-learnings.yaml            # Aggregated patterns (YAML)
    events.jsonl                     # Event stream
    plan-*/
      vision.md
      master-plan.yaml
      iteration-*/
        exploration/
        planning/
        building/
        integration/
        validation/
  lib/
    2l-reflection-generator.py       # Create reflections
    2l-reflection-aggregator.py      # Aggregate learnings → patterns
    2l-pattern-lifecycle.py          # Manage pattern states
    2l-vision-generator.py           # Auto-generate visions
    2l-yaml-helpers.py               # Atomic YAML operations
  commands/
    2l-improve.md                    # Self-improvement orchestrator
    2l-mvp.md                        # Main orchestration command

~/Ahiya/2L/Prod/*/                   # Production projects
  .2L/
    global-learnings.jsonl           # Project-specific learnings (FEDERATE THIS)
    global-learnings.yaml            # Project-specific patterns (local aggregation)
```

**Recommendation for Plan-10:**
- `/2l-improve` discovers BOTH meditation space learnings AND Prod/* learnings
- Aggregator combines sources BEFORE pattern detection
- Source tracking field added to each learning during federation

## Integration Points

### External Integrations Required

**None.** All operations are local filesystem reads.

**Assumptions:**
1. All projects under `~/Ahiya/2L/Prod/*` are accessible
2. File permissions allow reading `.2L/global-learnings.jsonl`
3. Projects may be incomplete (missing files handled gracefully)

### Internal Integrations

#### Integration Point 1: /2l-improve → Multi-Source Discovery

**Current Flow:**
```bash
# commands/2l-improve.md (lines 112-116)
python3 ~/.claude/lib/2l-pattern-detector.py \
    --global-learnings "$GLOBAL_LEARNINGS" \
    --min-occurrences "$MIN_OCCURRENCES" \
    --output "$patterns_json"
```

**Enhanced Flow (Plan-10):**
```bash
# Step 1: Discover all JSONL sources
MEDITATION_JSONL=".2L/global-learnings.jsonl"
PROD_JSONL_SOURCES=$(python3 -c "
import glob
import os
pattern = os.path.expanduser('~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl')
for path in glob.glob(pattern):
    if os.path.exists(path):
        print(path)
" | tr '\n' ',')

# Step 2: Pass ALL sources to aggregator
python3 ~/.claude/lib/2l-reflection-aggregator.py \
    --mode incremental \
    --global-learnings ".2L/global-learnings.yaml" \
    --jsonl "$MEDITATION_JSONL,$PROD_JSONL_SOURCES"  # MULTI-SOURCE
```

**Components Modified:**
- `commands/2l-improve.md` - Add discovery step before aggregation
- `lib/2l-reflection-aggregator.py` - Accept comma-separated `--jsonl` paths

#### Integration Point 2: Aggregator → Source Tracking

**Current Signature:**
```python
def aggregate_learnings(learnings: List[Dict], existing_patterns: List[Dict], 
                       mode: str = "incremental") -> Tuple[List[Dict], int, int]
```

**Enhanced Signature (Plan-10):**
```python
def aggregate_learnings(learnings: List[Dict], existing_patterns: List[Dict], 
                       mode: str = "incremental",
                       source_project: str = "unknown") -> Tuple[List[Dict], int, int]
```

**Usage:**
```python
# For each JSONL source
for jsonl_path in jsonl_sources:
    source_project = infer_source_project(jsonl_path)
    learnings = read_jsonl(jsonl_path)
    
    # Tag each learning with source
    for learning in learnings:
        learning['source_project'] = source_project
    
    # Aggregate with source tracking
    patterns, new_count, merged_count = aggregator.aggregate_learnings(
        learnings, patterns, mode='incremental'
    )
```

**Components Modified:**
- `lib/2l-reflection-aggregator.py::merge_into_pattern()` - Track source_projects list
- `lib/2l-reflection-aggregator.py::create_new_pattern()` - Initialize source_projects field

#### Integration Point 3: Pattern Detection → Cross-Project Evidence

**Current Pattern Output:**
```json
{
  "pattern_id": "PATTERN-001",
  "occurrences": 2,
  "projects": ["2L-self-improvement"]
}
```

**Enhanced Output (Plan-10):**
```json
{
  "pattern_id": "PATTERN-001",
  "occurrences": 5,
  "projects": ["2L-self-improvement", "StatViz", "TaskManager"],
  "source_projects": ["StatViz", "TaskManager", "meditation-space"],
  "evidence_count": 5,
  "cross_project_confidence": "HIGH"  // 3+ projects = high
}
```

**Confidence Scoring:**
```python
def calculate_cross_project_confidence(pattern):
    unique_projects = len(set(pattern.get('source_projects', [])))
    if unique_projects >= 3:
        return "HIGH"
    elif unique_projects == 2:
        return "MEDIUM"
    else:
        return "LOW"
```

**Components Modified:**
- `lib/2l-pattern-detector.py` - Add confidence field to output JSON
- `lib/2l-vision-generator.py` - Include cross-project evidence in vision

## Risks & Challenges

### Technical Risks

**Risk 1: JSONL Corruption Across Projects**
- **Impact:** Malformed JSON in Prod/* projects crashes aggregation
- **Mitigation:** Existing error recovery pattern (lines 326-340 in aggregator)
- **Status:** Already handled - skip malformed lines with warning

**Risk 2: Glob Pattern Permission Denied**
- **Impact:** Cannot read Prod/* directories due to file permissions
- **Mitigation:** Wrap glob.glob() in try/except, log warning, continue
- **Implementation:**
```python
try:
    matches = glob.glob(pattern)
except (PermissionError, OSError) as e:
    print(f"WARNING: Cannot access {pattern}: {e}", file=sys.stderr)
    matches = []
```

**Risk 3: Circular Import (hyphenated filenames)**
- **Impact:** Plan-10 code may need to import existing utilities
- **Mitigation:** Use importlib.util pattern (already used in aggregator lines 52-56)
- **Status:** Production-tested pattern available

**Risk 4: YAML Schema Evolution**
- **Impact:** Adding `source_projects` field breaks existing patterns
- **Mitigation:** Backward compatibility - default to empty list if field missing
- **Implementation:**
```python
source_projects = pattern.get('source_projects', [])  # Default to empty
```

### Complexity Risks

**Risk 1: Multi-Source Deduplication Logic**
- **Complexity:** HIGH - "Integration slow" from StatViz + TaskManager = same pattern?
- **Mitigation:** Reuse existing SequenceMatcher (0.8 threshold) - proven in production
- **Evidence:** test_reflection_aggregator.py has 18 passing tests (lines 28-430)

**Risk 2: Source Project Name Collisions**
- **Complexity:** MEDIUM - What if two projects named "dashboard"?
- **Mitigation:** Use full path as fallback: `Prod/clients/acme/dashboard` → "acme-dashboard"
- **Implementation:**
```python
def infer_source_project(jsonl_path: Path) -> str:
    parts = jsonl_path.parts
    if 'Prod' in parts:
        prod_index = parts.index('Prod')
        # Get all parts between Prod and .2L (handle nested projects)
        project_parts = parts[prod_index+1:parts.index('.2L')]
        return '-'.join(project_parts)  # e.g., "clients-acme-dashboard"
    return "meditation-space"
```

**Risk 3: Performance with 10+ Projects**
- **Complexity:** MEDIUM - Aggregating 100+ learnings from 10 projects
- **Constraint:** Must complete in <5s (per vision.md line 225)
- **Mitigation:** 
  - Incremental mode (only process new learnings)
  - Lazy discovery (don't read JSONL until needed)
  - Keep similarity matching (SequenceMatcher is O(n²) but fast for small n)
- **Measurement:** Add timing instrumentation to aggregator

## Recommendations for Planner

### 1. Extend Aggregator for Multi-Source Support

**Why:** Reuse production-tested similarity logic, error handling, and atomic writes

**How:**
- Add `--jsonl` parameter to accept comma-separated paths OR multiple `--jsonl` flags
- Implement `discover_prod_learnings()` function using glob pattern
- Tag each learning with `source_project` before aggregation
- Update `merge_into_pattern()` to track `source_projects` list (distinct from `projects`)

**Complexity:** SIMPLE - Incremental enhancement to existing code

**Files Modified:**
- `lib/2l-reflection-aggregator.py` (60 lines)

### 2. Enhance Framework Issue Detection

**Why:** Prevent false positives like "app slow" being captured as "framework slow"

**How:**
- Expand FRAMEWORK_KEYWORDS to include:
  - Performance: "aggregation slow", "reflection timeout", "pattern matching"
  - Data: "JSONL corruption", "YAML parsing", "global-learnings"
  - Multi-source: "federation", "cross-project", "Prod/* discovery"
- Refine P3 (speed) categorization to require framework-specific keywords

**Complexity:** SIMPLE - Add 10-15 keywords to existing list

**Files Modified:**
- `lib/2l-reflection-generator.py` (10 lines)

### 3. Add Source Tracking Through Pipeline

**Why:** Enable cross-project pattern evidence ("Detected in: StatViz, TaskManager")

**How:**
- Add `source_project` field to learning JSONL schema (backward compatible)
- Store `source_projects` list in pattern YAML (distinct from `projects`)
- Calculate `evidence_count` as len(source_learnings)
- Display in dashboard: "3 projects affected: StatViz, TaskManager, meditation-space"

**Complexity:** SIMPLE - Additive schema change

**Files Modified:**
- `lib/2l-reflection-generator.py` (5 lines - add source_project field)
- `lib/2l-reflection-aggregator.py` (15 lines - track source_projects)
- `.2L/global-learnings.yaml` schema (backward compatible)

### 4. Implement Graceful Multi-Source Discovery

**Why:** Missing Prod/* projects should not block /2l-improve

**How:**
- Use glob.glob() to discover `~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl`
- Wrap in try/except for permission errors
- Log discovered sources: "Aggregating from 4 sources: meditation-space, StatViz, TaskManager, BlogEngine"
- Return empty list if no Prod/* projects found (meditation space only)

**Complexity:** SIMPLE - Apply existing graceful degradation pattern

**Files Modified:**
- `commands/2l-improve.md` (30 lines - add discovery step)
- `lib/2l-reflection-aggregator.py` (20 lines - multi-source read)

### 5. Add Cross-Project Confidence Scoring

**Why:** Higher confidence patterns (detected in 3+ projects) prioritize better

**How:**
- Calculate `len(set(source_projects))` → "HIGH" (3+), "MEDIUM" (2), "LOW" (1)
- Include in vision template: "Confidence: HIGH (detected in 3 projects)"
- Pattern detector can weight by confidence: `impact_score *= confidence_multiplier`

**Complexity:** SIMPLE - Single field calculation

**Files Modified:**
- `lib/2l-pattern-detector.py` (10 lines)
- `lib/2l-vision-generator.py` (5 lines)
- `templates/improvement-vision.md` (1 line)

### 6. Test Multi-Source Aggregation

**Why:** Ensure no regressions in existing aggregation logic

**How:**
- Extend `test_reflection_aggregator.py` with multi-source test cases
- Mock Prod/* directory structure with test JSONL files
- Verify source_project tracking, deduplication, and error handling
- Add integration test: discover → aggregate → verify source_projects field

**Complexity:** MEDIUM - New test coverage for multi-source path

**Files Created:**
- `lib/test_multi_source_aggregation.py` (200 lines)

**Test Cases:**
1. Discovery finds 0 Prod/* projects (empty list returned)
2. Discovery finds 3 Prod/* projects (StatViz, TaskManager, BlogEngine)
3. Malformed JSONL in Prod/StatViz (skipped with warning)
4. Permission denied on Prod/TaskManager (skipped with warning)
5. Cross-project pattern detected (similarity 0.85, same category)
6. Source project name inference (nested projects, meditation space)
7. Backward compatibility (learnings without source_project field)

## Resource Map

### Critical Files/Directories

**Core Aggregation Logic:**
- `lib/2l-reflection-aggregator.py` - Pattern aggregation (similarity matching, incremental mode)
- `lib/2l-reflection-generator.py` - Reflection generation (framework filtering, JSONL append)
- `lib/2l-pattern-lifecycle.py` - Pattern state machine (IDENTIFIED → IMPLEMENTED → VERIFIED)
- `lib/2l-yaml-helpers.py` - Atomic YAML operations (backup, temp file + rename)

**Command Interfaces:**
- `commands/2l-improve.md` - Self-improvement orchestrator (add multi-source discovery here)
- `commands/2l-mvp.md` - Main orchestration (not modified for Plan-10)

**Data Storage:**
- `.2L/global-learnings.jsonl` - Append-only learning stream (meditation space)
- `.2L/global-learnings.yaml` - Aggregated patterns with state (meditation space)
- `Prod/*/.2L/global-learnings.jsonl` - Per-project learning streams (NEW SOURCE)

**Testing Infrastructure:**
- `lib/test_reflection_aggregator.py` - 18 unit tests (similarity, merging, JSONL parsing)
- `lib/test-pattern-lifecycle.sh` - Integration tests (state machine validation)
- `lib/2l-smoke-tests.sh` - Post-modification health checks

### Key Dependencies

| Dependency | Purpose | Version | Source |
|------------|---------|---------|--------|
| Python | Core logic | 3.12.3 | System |
| `yaml` | YAML parsing | stdlib | Built-in |
| `json` | JSONL parsing | stdlib | Built-in |
| `glob` | File discovery | stdlib | Built-in |
| `difflib` | Similarity matching | stdlib | Built-in |
| `pathlib` | Path handling | stdlib | Built-in |
| `fcntl` | File locking | stdlib | Built-in (Unix) |

**External Dependencies:** NONE

### Testing Infrastructure

**Unit Tests (Python):**
- `lib/test_reflection_aggregator.py` - 18 tests covering:
  - Similarity calculation (identical, case-insensitive, threshold)
  - Pattern matching (category filtering, threshold validation)
  - Pattern creation (ID generation, metadata)
  - Pattern merging (occurrences, projects, severity escalation)
  - JSONL reading (empty files, malformed lines, blank lines)
  - Incremental aggregation (skip processed learnings)

**Integration Tests (Bash):**
- `lib/test-pattern-lifecycle.sh` - State machine validation
- `lib/test-pattern-lifecycle-recurrence.sh` - Recurrence detection
- `lib/test_aggregator_integration.sh` - End-to-end aggregation flow

**Smoke Tests:**
- `lib/2l-smoke-tests.sh` - Framework health checks (run after self-modification)
- Verifies: commands exist, symlinks valid, core utilities functional

**Recommendation for Plan-10:**
- Add `lib/test_multi_source_aggregation.py` (new file)
- 7 test cases covering multi-source discovery, error handling, source tracking
- Run before merging to master

## Questions for Planner

### 1. Deduplication Strategy Across Sources

**Question:** If StatViz iteration-3 and TaskManager iteration-5 both log "Integration phase slow (45s)", should we:
- A) Create 2 separate learning entries (current approach, merge into 1 pattern)
- B) Deduplicate at JSONL level (skip duplicate root_cause from different sources)
- C) Keep separate but mark as "cross-project duplicate"

**Recommendation:** **Option A** - Keep separate learning entries, let aggregator merge into single pattern with `source_projects: [StatViz, TaskManager]`. This preserves audit trail and evidence count.

**Rationale:** 
- Each iteration's learnings are independent observations
- Pattern aggregation already handles similarity matching
- Evidence count = len(source_learnings) shows cross-project recurrence
- Aligns with existing incremental aggregation logic

### 2. Framework vs App Issue Edge Cases

**Question:** How to classify these borderline cases:
- "Builder took 2 minutes to write code" - Framework slow? Or just complex generation task?
- "Validator found type errors" - Framework issue? Or builder quality issue?
- "Integrator merged successfully but app has bug" - Not a framework issue, right?

**Recommendation:** **Conservative bias** - If uncertain, do NOT capture as framework issue.

**Heuristic Refinement:**
```python
def is_framework_issue(issue: Dict) -> bool:
    # 1. File path check (highest confidence)
    if any(fp in issue['location'] for fp in FRAMEWORK_PATHS):
        return True
    
    # 2. Keyword check with context (medium confidence)
    issue_text = issue['issue'] + ' ' + issue['root_cause']
    has_framework_keyword = any(kw in issue_text.lower() for kw in FRAMEWORK_KEYWORDS)
    has_project_path = any(pp in issue['location'] for pp in PROJECT_PATHS)
    
    if has_framework_keyword and not has_project_path:
        return True
    
    # 3. Conservative: Default to NOT framework issue
    return False
```

**Edge Case Examples:**
- "Builder took 2 minutes" + location="app/services/auth.ts" → **NOT framework** (app code)
- "Builder took 2 minutes" + location="agents/2l-builder.md" → **FRAMEWORK** (agent prompt issue)
- "Integration phase slow" + no location → **FRAMEWORK** (has framework keyword)

### 3. Source Project Naming Conflicts

**Question:** How to handle nested projects or name collisions?
- `Prod/StatViz/.2L/global-learnings.jsonl` → source_project = "StatViz" ✅
- `Prod/clients/acme/dashboard/.2L/global-learnings.jsonl` → source_project = "dashboard" ❌ (collision risk)
- `Prod/StatViz-v2/.2L/global-learnings.jsonl` → source_project = "StatViz-v2" ✅

**Recommendation:** Use **full relative path from Prod/** for nested projects:
```python
def infer_source_project(jsonl_path: Path) -> str:
    parts = jsonl_path.parts
    
    if 'Prod' in parts:
        prod_index = parts.index('Prod')
        # Get all parts between 'Prod' and '.2L'
        project_parts = []
        for i in range(prod_index + 1, len(parts)):
            if parts[i] == '.2L':
                break
            project_parts.append(parts[i])
        
        # Join with dash for readability
        return '-'.join(project_parts)  # e.g., "clients-acme-dashboard"
    
    return "meditation-space"
```

**Examples:**
- `Prod/StatViz/.2L/...` → "StatViz"
- `Prod/clients/acme/dashboard/.2L/...` → "clients-acme-dashboard"
- `~/Ahiya/2L/.2L/...` → "meditation-space"

### 4. Performance Target Validation

**Question:** Vision.md specifies "<5s aggregation for 100+ learnings from 10+ projects" (line 225). How to validate?

**Recommendation:** Add timing instrumentation to aggregator:

```python
import time

def aggregate_learnings(...):
    start_time = time.time()
    
    # ... existing aggregation logic ...
    
    elapsed = time.time() - start_time
    
    # Log performance metrics
    print(f"⏱️  Aggregation complete: {elapsed:.2f}s", file=sys.stderr)
    print(f"   Learnings processed: {len(learnings)}", file=sys.stderr)
    print(f"   Patterns updated: {len(updated_patterns)}", file=sys.stderr)
    print(f"   Throughput: {len(learnings)/elapsed:.0f} learnings/sec", file=sys.stderr)
    
    # Warn if exceeds target
    if elapsed > 5.0:
        print(f"⚠️  WARNING: Aggregation exceeded 5s target ({elapsed:.2f}s)", file=sys.stderr)
```

**Test Case:**
- Create mock JSONL with 120 learnings across 12 sources
- Run aggregator with timing
- Assert: elapsed < 5.0s
- If fails: Profile with `cProfile` to identify bottleneck

**Expected Bottleneck:** SequenceMatcher O(n²) complexity in find_best_match()

**Mitigation (if needed):** 
- Cache similarity scores between passes
- Limit comparison to top N most recent patterns
- Consider approximate matching (first-pass filter by category + keyword overlap)

### 5. Backward Compatibility with Existing Learnings

**Question:** Existing `.2L/global-learnings.jsonl` entries lack `source_project` field. How to handle?

**Recommendation:** **Default to "meditation-space"** for learnings without source_project:

```python
def tag_source_project(learning: Dict, source_project: str) -> Dict:
    """Add source_project field if missing."""
    if 'source_project' not in learning:
        learning['source_project'] = source_project
    return learning
```

**Aggregation Logic:**
```python
# When reading meditation space JSONL
learnings = read_jsonl('.2L/global-learnings.jsonl')
for learning in learnings:
    tag_source_project(learning, 'meditation-space')

# When reading Prod/* JSONL
for prod_jsonl in discover_prod_learnings():
    source = infer_source_project(prod_jsonl)
    learnings = read_jsonl(prod_jsonl)
    for learning in learnings:
        tag_source_project(learning, source)
```

**YAML Pattern Compatibility:**
- Patterns without `source_projects` field: Default to `[]`
- Dashboard display: Show "Source: meditation-space" for legacy patterns

---

**Report Status:** COMPLETE  
**Technology Stack:** Python 3.12 (stdlib only), Bash, YAML, JSONL  
**Complexity Assessment:** SIMPLE-MEDIUM (incremental enhancements to proven patterns)  
**Key Recommendation:** Reuse existing aggregation logic with multi-source wrapper  
**Performance Target:** <5s for 100+ learnings across 10+ projects (validated via timing instrumentation)
