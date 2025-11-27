# Technology Stack

## Core Framework

**Decision:** Python 3.8+ for utilities, Bash for orchestration integration

**Rationale:**
- Existing 2L infrastructure uses Python for all utilities (2l-yaml-helpers.py, 2l-pattern-detector.py, 2l-pattern-lifecycle.py)
- Rich standard library for text processing (difflib, yaml, json, datetime, pathlib)
- No external dependencies required (all stdlib)
- Type hints and dataclasses improve code quality
- Bash integration via subprocess calls (proven pattern in /2l-mvp)
- Cross-platform (Linux/macOS) with minimal OS-specific code

**Alternatives Considered:**
- **Node.js:** Rejected - adds dependency, team uses Python
- **Pure Bash:** Rejected - complex parsing/similarity logic awkward in bash
- **Go/Rust:** Rejected - overkill for text processing utilities

## Database

**Decision:** File-based storage (YAML + JSONL), no database

**Rationale:**
- Human-readable for debugging (cat, grep, less)
- Git-friendly (diffs show changes clearly)
- No installation/setup overhead
- Append-friendly (JSONL for logs, YAML for aggregated state)
- Atomic writes via temp file + rename pattern (proven in 2l-yaml-helpers.py)
- Existing infrastructure already uses this pattern

**Schema Strategy:**

**YAML for aggregated patterns (global-learnings.yaml):**
```yaml
schema_version: '1.0'
aggregated_at: '2025-11-27T04:00:00Z'
total_projects: 1
total_learnings: 12
patterns:
  - pattern_id: PATTERN-001
    name: Missing exploration before vision generation
    occurrences: 3
    projects: ['2L-self-improvement']
    severity: medium  # critical | medium | low
    category: functionality  # functionality | completeness | speed
    root_cause: |
      /2l-improve skips exploration phase at lines 358-410,
      creating placeholder reports instead of spawning Task agents
    proposed_solution: |
      Replace placeholder creation with Task.spawn() calls
      to 3 parallel explorers
    status: IDENTIFIED  # IDENTIFIED | IMPLEMENTED | VERIFIED | REGRESSED
    discovered_in: plan-5-iter-7
    discovered_at: '2025-11-19T09:00:00Z'
    source_learnings:
      - plan-5-iter-7-learning-001
      - plan-6-iter-3-learning-002
      - plan-9-iter-8-learning-001
    affected_files:
      - commands/2l-improve.md
      - lib/2l-vision-generator.py
```

**JSONL for raw learning stream (global-learnings.jsonl):**
```json
{"timestamp":"2025-11-27T04:16:46.280496","learning_id":"plan-9-iter-9-learning-001","project":"StatViz","plan_id":"plan-3","iteration":2,"category":"functionality","priority":"P1","issue":"Missing exploration before vision","severity":"medium","root_cause":"/2l-improve creates placeholder reports instead of spawning explorers","suggested_fix":"Spawn 3 Task agents at lines 358-410","affected_files":["commands/2l-improve.md"],"pattern_id":null}
```

**Alternatives Considered:**
- **SQLite:** Rejected - overkill for MVP, adds query complexity
- **PostgreSQL:** Rejected - external dependency, setup overhead
- **Pure JSONL only:** Rejected - hard to read aggregated view

## Authentication

**Decision:** N/A (file-based system, no auth needed)

**Rationale:**
- Single-user system (Ahiya)
- File system permissions provide access control
- No network API to secure
- No sensitive data (learning patterns are not secrets)

## API Layer

**Decision:** CLI-based Python utilities (no REST API)

**Rationale:**
- Utilities invoked via subprocess from bash orchestrator
- argparse for rich CLI with help text and validation
- Exit codes for success/failure signaling
- stdout for data output, stderr for errors
- Proven pattern in existing 2L utilities

**Example invocation:**
```bash
python3 ~/.claude/lib/2l-reflection-generator.py \
    --iteration-dir "$ITER_DIR" \
    --plan-id "$plan_id" \
    --iteration "$global_iter" \
    --output "$reflection_path" \
    --jsonl ".2L/global-learnings.jsonl"
```

**Alternatives Considered:**
- **REST API:** Rejected - unnecessary complexity for local utilities
- **Python library imports:** Rejected - bash orchestrator can't import Python
- **gRPC:** Rejected - overkill for simple utilities

## Frontend

**Decision:** N/A (CLI only, markdown output)

**Rationale:**
- Reflections are markdown files (human-readable in editor/browser)
- No UI needed for MVP
- Future: Could add dashboard to visualize patterns (post-MVP)

## External Integrations

### None Required

All components are local file operations. No external APIs, databases, or services.

## Development Tools

### Testing

**Framework:** Python unittest (standard library)

**Coverage target:** 80% for core logic (similarity matching, pattern merging)

**Strategy:**
- Unit tests for reflection generator (parsing validation reports)
- Unit tests for aggregator (similarity calculation, pattern merging)
- Integration tests for end-to-end flow (reflection → aggregation → pattern creation)
- Test fixtures from real iteration artifacts (plan-9/iteration-8)

### Code Quality

**Linter:** pylint (if available, not required)

**Formatter:** black (if available, not required)

**Type Checking:** mypy (optional, type hints help but not enforced)

**Why minimal tooling:** 2L operates in constrained environments, avoid dependencies

### Build & Deploy

**Build tool:** None (Python scripts don't need compilation)

**Deployment target:** Meditation space (~/Ahiya/2L) via git commit

**CI/CD:** Manual smoke testing (run /2l-status after changes)

## Environment Variables

No environment variables required. All configuration via:
- CLI arguments
- File paths (hardcoded or passed as arguments)
- YAML config files (global-learnings.yaml schema)

## Dependencies Overview

**Python Standard Library Only:**

- **yaml (PyYAML):** Already installed in 2L environment
  - Purpose: Read/write global-learnings.yaml
  - Version: Any recent version (3.x+)

- **json:** Standard library
  - Purpose: JSONL parsing and writing

- **difflib:** Standard library
  - Purpose: Text similarity (SequenceMatcher.ratio())

- **argparse:** Standard library
  - Purpose: CLI argument parsing

- **pathlib:** Standard library
  - Purpose: Path manipulation (cross-platform)

- **datetime:** Standard library
  - Purpose: ISO8601 timestamps

- **tempfile:** Standard library
  - Purpose: Atomic file writes (temp file + rename)

- **shutil:** Standard library
  - Purpose: File operations (copy, move)

- **re:** Standard library
  - Purpose: Regex for markdown parsing, keyword extraction

- **fcntl:** Standard library (Unix only)
  - Purpose: File locking for concurrent JSONL appends
  - Fallback: Skip locking on Windows (single writer in MVP)

**Existing 2L Libraries:**

- **lib/2l-yaml-helpers.py::atomic_write_yaml():** Atomic YAML updates
- **lib/2l-event-logger.sh::log_2l_event():** Event emission

## Performance Targets

- **Reflection generation:** <5 seconds per iteration
- **Aggregation (100 learnings, 10 patterns):** <1 second
- **Aggregation (1000 learnings, 50 patterns):** <10 seconds
- **JSONL append:** <100ms (atomic operation)
- **YAML write:** <500ms (atomic write with backup)

**Why these targets:**
- Reflection shouldn't delay iteration completion significantly
- Aggregation is manual-trigger for MVP (not time-critical)
- Performance scales linearly with pattern count (O(n)), not learning count

## Security Considerations

**File permissions:**
- REFLECTION.md: 644 (user read/write, others read)
- global-learnings.yaml: 644 (user read/write, others read)
- global-learnings.jsonl: 644 (append-only in practice)
- Python utilities: 755 (executable)

**How addressed:**
- Use standard umask settings
- No sensitive data in reflections (learning patterns are public)
- File system permissions provide access control

**Atomic writes prevent corruption:**
- Temp file + rename (OS-level atomic operation)
- Backup before modification (.yaml.bak)
- JSONL source-of-truth for recovery

**Input validation:**
- Validate iteration directory exists before parsing
- Graceful handling of malformed YAML/JSON
- Sanitize file paths (prevent directory traversal)
- Bounded string lengths (prevent memory exhaustion)

**Error handling:**
- Try/except around all file operations
- Print errors to stderr (not stdout)
- Exit codes: 0 (success), 1 (error), 2 (safety abort)
- Non-critical failures logged but don't block orchestrator

**No injection vulnerabilities:**
- No shell command construction from user input
- No eval() or exec() calls
- File paths validated before use
- YAML safe_load (not load)
