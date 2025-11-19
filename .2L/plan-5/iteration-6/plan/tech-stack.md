# Technology Stack

## Core Framework

**Decision:** Bash orchestration + Python for YAML manipulation

**Rationale:**
- Orchestrator is Bash-based (commands/2l-mvp.md) - extend existing pattern
- Python for structured data operations (YAML parsing, merging, atomic writes)
- No new framework needed - leverage existing 2L architecture
- Bash handles orchestration flow, Python handles data manipulation
- Proven pattern: Orchestrator spawns Python helper scripts for complex operations

**Alternatives Considered:**
- Pure Bash with yq: yq binary not available, adds external dependency
- Pure Python orchestrator: Would require rewriting 2l-mvp.md (out of scope)
- JSON instead of YAML: Less human-readable, breaks consistency with config.yaml

**Implementation Notes:**
- Orchestrator extensions in Bash (re-validation loop, reflection hooks)
- Python helper library for YAML operations: `lib/2l-yaml-helpers.py`
- Python version: 3.x (available, PyYAML confirmed working)

---

## Data Persistence

**Decision:** YAML via PyYAML

**Rationale:**
- Consistent with existing patterns (config.yaml, master-plan.yaml)
- Human-readable and manually editable (debugging, manual learning additions)
- PyYAML library confirmed available (python3 -c "import yaml" successful)
- Supports nested structures needed for learnings (metadata, arrays)
- No additional dependencies required

**Schema Strategy:**

**Per-iteration learnings.yaml:**
```yaml
schema_version: "1.0"
project: "wealth"
plan: "plan-3"
iteration: "iteration-2"
created_at: "2025-11-19T15:30:00Z"

learnings:
  - id: "wealth-20251119-001"
    iteration: "plan-3-iter-2"
    category: "validation"  # validation | integration | healing
    severity: "critical"    # critical | medium | low
    issue: "TypeScript compilation failed: Cannot find module 'lib/supabase'"
    root_cause: "Missing import path in tsconfig.json paths configuration"
    solution: "Add 'lib/*': ['src/lib/*'] to tsconfig.json compilerOptions.paths"
    recurrence_risk: "high"  # high | medium | low
    affected_files:
      - "tsconfig.json"
      - "src/components/AuthProvider.tsx"
```

**Global learnings aggregation (.2L/global-learnings.yaml):**
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
    status: "IDENTIFIED"  # IDENTIFIED | IMPLEMENTED | VERIFIED
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
```

**Forward Compatibility:**
- schema_version field enables future schema migrations
- If reading schema_version > known version, emit warning but continue
- Document schema changes in .2L/SCHEMA_CHANGELOG.md

**Alternatives Considered:**
- JSON: Less human-readable, no comments, breaks consistency
- SQLite: Overkill for small data volumes, harder to manually edit
- Plain text: No structure, harder to parse and query

---

## File I/O Safety

**Decision:** Atomic writes via tempfile + shutil.move()

**Rationale:**
- Prevents corruption if orchestrator crashes during YAML merge
- Global-learnings.yaml is append-only (never delete historical data)
- Python's shutil.move() uses os.rename() which is atomic on POSIX systems
- Temp file created in same directory ensures same filesystem (true atomic rename)
- Backup to .bak before each write provides additional safety net

**Implementation:**
```python
import os
import tempfile
import shutil
import yaml

def atomic_write_yaml(file_path, data):
    """
    Write YAML data atomically to prevent corruption.
    Uses temp file + rename for atomic operation.
    """
    # Create temp file in same directory (ensures same filesystem)
    dir_path = os.path.dirname(file_path)
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
```

**Backup Strategy:**
```python
# Before atomic write, backup existing file
if os.path.exists(global_learnings_path):
    backup_path = global_learnings_path + '.bak'
    shutil.copy2(global_learnings_path, backup_path)

# Atomic write
atomic_write_yaml(global_learnings_path, global_data)
```

**Why This Pattern:**
- If process crashes mid-write, file is either old version or new version (never corrupted)
- Temp file cleanup on error prevents disk clutter
- Backup provides rollback capability if corruption detected

**Alternatives Considered:**
- Direct write: Risky, partial writes corrupt file
- File locking: Unnecessary (single orchestrator at a time)
- Database transactions: Overkill for file-based system

---

## Event System

**Decision:** Existing lib/2l-event-logger.sh

**Rationale:**
- Already integrated into orchestrator and agents
- Graceful degradation (fails silently if unavailable)
- JSON Lines format (events.jsonl) for dashboard parsing
- No new event types needed (reuse existing: phase_change, validation_result, iteration_complete)

**Re-validation Events:**
```bash
# Source event logger if available
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"

  # Re-validation start
  log_2l_event "phase_change" "Starting re-validation after healing" "validation" "orchestrator"

  # Re-validation result
  log_2l_event "validation_result" "Re-validation: PASS" "validation" "validator-revalidation"

  # Iteration complete after healing
  log_2l_event "iteration_complete" "Iteration completed after successful healing" "complete" "orchestrator"
fi
```

**Orchestrator Reflection Events:**
```bash
# Reflection complete
log_2l_event "reflection_complete" "3 learnings added to global knowledge base" "reflection" "orchestrator"
```

**Event Types Used:**
- `phase_change` - Re-validation starting
- `validation_result` - Re-validation outcome
- `iteration_complete` - Iteration done after healing
- `reflection_complete` - NEW: Learnings merged to global

**No Changes Needed:**
- Event logger library already supports all needed event types
- Graceful degradation already implemented
- JSON Lines format already established

---

## Python Standard Library

**Decision:** Use os, tempfile, shutil, datetime modules

**Rationale:**
- Included with Python 3 (no external dependencies)
- os: File operations, path manipulation
- tempfile: Atomic write temp file creation
- shutil: Atomic file moves, backups
- datetime: Timestamp generation for learning IDs and metadata

**Usage:**
- Learning ID generation: datetime.now().strftime("%Y%m%d")
- Timestamp fields: datetime.now().isoformat()
- Atomic writes: tempfile.mkstemp() + shutil.move()
- File existence checks: os.path.exists()
- Directory operations: os.path.dirname()

**No External Dependencies Required:**
- PyYAML: Already available (confirmed)
- All other operations use standard library

---

## Learning ID Format

**Decision:** {project}-{YYYYMMDD}-{NNN} format

**Rationale:**
- Human-readable and sortable by date
- Project context clear from ID alone
- Sequence number prevents collisions within same day
- Easier to debug than UUIDs
- Format: `wealth-20251119-001`, `ai-mafia-20251120-003`

**Implementation:**
```python
def generate_learning_id(project_name, learnings_dir):
    """
    Generate unique learning ID: project-YYYYMMDD-NNN
    """
    # Get date in YYYYMMDD format
    date_str = datetime.now().strftime("%Y%m%d")

    # Count existing learnings for this project+date
    existing_count = 0
    if os.path.exists(learnings_dir):
        with open(learnings_dir, 'r') as f:
            data = yaml.safe_load(f)
            existing_count = len(data.get('learnings', []))

    # Next sequence number
    next_seq = existing_count + 1

    # Format: project-YYYYMMDD-NNN
    return f"{project_name}-{date_str}-{next_seq:03d}"
```

**Alternatives Considered:**
- UUID v4: Not human-readable, harder to debug
- Sequential counter: No date context, requires global counter
- plan-iteration-sequence: Too verbose, loses date information

---

## Symlink Architecture

**Decision:** Continue using ~/.claude/ → ~/Ahiya/2L/ symlinks

**Rationale:**
- Already established and working
- Changes to ~/Ahiya/2L/ immediately affect running agents
- Enables future /2l-improve self-modification (iteration 2)
- No installation step needed (symlinks make changes instant)

**Verification:**
```bash
# Verify symlinks before self-modification (iteration 2)
verify_symlinks() {
    local agents_target=$(readlink -f ~/.claude/agents)
    local expected_target="$HOME/Ahiya/2L/agents"

    if [ "$agents_target" != "$expected_target" ]; then
        echo "ERROR: Symlinks broken or misconfigured"
        return 1
    fi
    return 0
}
```

**Current Symlinks:**
- ~/.claude/agents → ~/Ahiya/2L/agents
- ~/.claude/commands → ~/Ahiya/2L/commands
- ~/.claude/lib → ~/Ahiya/2L/lib

**Backup Mechanism:**
- agents.backup.* directories exist for safety
- Git provides version control for rollback

---

## Git Integration

**Decision:** Auto-commit after iteration completion

**Rationale:**
- Orchestrator already commits after each iteration
- Learning infrastructure doesn't change commit strategy
- Learnings included in iteration commit (learnings.yaml + global-learnings.yaml)

**Commit Flow:**
```
Validation PASSES
  ↓
Orchestrator reflection (merge learnings)
  ↓
Git add .2L/global-learnings.yaml
Git add .2L/plan-{N}/iteration-{M}/learnings.yaml
  ↓
Git commit -m "plan-5-iter-6: Learning capture and re-validation foundation"
  ↓
Iteration marked COMPLETE
```

**Safety Tags (Future - Iteration 2):**
```bash
# Before self-modification via /2l-improve
git tag "2l-pre-improve-$(date +%Y%m%d-%H%M%S)"
```

---

## Development Tools

### Testing

**Framework:** Manual testing (no automated test framework)

**Coverage target:** N/A (orchestrator logic hard to unit test)

**Strategy:** End-to-end testing via actual orchestrations

**Test Cases:**
1. **Learning capture:** Force validation failure, verify learnings.yaml created
2. **Re-validation:** Trigger healing, verify validator re-runs
3. **Reflection:** Complete iteration, verify global-learnings.yaml updated
4. **Atomic write safety:** Kill Python process mid-merge, verify no corruption
5. **Infinite loop prevention:** Create unfixable bug, verify escalation after 2 attempts

### Code Quality

**Linter:** None (Bash + Python orchestration scripts)

**Formatter:** None (manual code review)

**Type Checking:** None (Python type hints optional, not enforced)

**Rationale:** Orchestrator code is operational scripts, not production app code. Manual review during integration phase provides quality control.

### Build & Deploy

**Build tool:** None (no compilation needed)

**Deployment target:** ~/.claude/ (symlinked to ~/Ahiya/2L/)

**CI/CD:** None (manual git commit after validation passes)

**Rationale:** 2L orchestrator is dev tool, not deployed app. Git provides version control, symlinks provide instant deployment.

---

## Environment Variables

**None Required**

This iteration uses only local file operations. No external API keys or configuration needed.

**Future (Iteration 2 - /2l-improve):**
- May need ANTHROPIC_API_KEY for meta-orchestration (2L improving itself)
- Already available in existing orchestrations

---

## Dependencies Overview

**Required Dependencies:**

- **Python 3.x:** Available (confirmed)
  - Purpose: YAML manipulation, atomic writes, learning aggregation
  - Installation: System Python

- **PyYAML (yaml module):** Available (confirmed via python3 -c "import yaml")
  - Purpose: Parse and write YAML files
  - Installation: Already installed

- **Python Standard Library (os, tempfile, shutil, datetime):** Available
  - Purpose: File I/O, atomic writes, timestamps
  - Installation: Included with Python

- **Event Logger (lib/2l-event-logger.sh):** Exists
  - Purpose: Re-validation event emission
  - Installation: Already at ~/.claude/lib/2l-event-logger.sh

**No External Dependencies:**
- No npm packages
- No pip install needed (PyYAML already available)
- No yq binary required (Python handles YAML)

---

## Performance Targets

**Learning Capture:**
- Validator creates learnings.yaml: < 1 second
- No impact on validation time (happens after checks complete)

**Re-validation:**
- Validator re-run time: Same as first validation (no overhead)
- Healing round limit prevents infinite loops (max 2 attempts)

**Orchestrator Reflection:**
- YAML merge time: < 2 seconds
- Atomic write overhead: Negligible (temp file creation + rename)
- No impact on iteration completion time

**Global Learnings File Size:**
- Estimated: < 100KB even after 50+ learnings
- No performance concerns at this scale
- Future optimization: Compress old learnings (post-MVP)

---

## Security Considerations

**File Permission Safety:**
- learnings.yaml created with default permissions (644)
- global-learnings.yaml readable by user only
- No sensitive data in learnings (only code issues and file paths)

**Atomic Write Safety:**
- Temp files use mkstemp() for secure temp file creation
- Temp files cleaned up on error (no orphaned files)
- Backup files (.bak) provide corruption recovery

**Git Commit Safety:**
- Learnings committed to git (version control)
- No credentials or secrets in learning data
- Public repo safe (learnings are project diagnostics)

**Self-Modification Safety (Future - Iteration 2):**
- Symlink verification before /2l-improve runs
- Git tag before self-modification (rollback capability)
- Never modify orchestrator (only agents/commands)
- Abort on dirty working directory (uncommitted changes)

---

## Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Orchestration | Bash | System default | Orchestrator extensions (re-validation, reflection) |
| Data Manipulation | Python | 3.x | YAML operations, atomic writes, learning merge |
| Data Format | YAML | - | Learnings storage (per-iteration + global) |
| YAML Library | PyYAML | Any | Parse/write YAML files |
| File I/O | Python stdlib | 3.x | os, tempfile, shutil, datetime |
| Event System | 2l-event-logger.sh | Existing | Re-validation events, reflection tracking |
| Symlinks | POSIX | - | Immediate deployment (changes live instantly) |
| Version Control | Git | System default | Iteration commits, learning history |

**Architecture Philosophy:**
- Extend existing patterns (Bash orchestrator, YAML config)
- Minimal dependencies (Python stdlib + PyYAML only)
- File-based integration (learnings.yaml contract)
- Graceful degradation (learning capture failures don't block orchestrations)
- Atomic operations (prevent corruption via temp file + rename)
- Human-readable data (YAML, not binary, for debugging)

**Future Iterations:**
- Iteration 2: Add /2l-improve command (Python script)
- Iteration 2: Pattern detection and deduplication logic
- Iteration 2: Vision auto-generation from learnings
- Post-MVP: Learning query interface, analytics dashboard
