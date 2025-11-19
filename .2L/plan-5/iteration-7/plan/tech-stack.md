# Technology Stack - /2l-improve Command

## Overview

This iteration extends the existing 2L infrastructure with minimal new dependencies. The technology choices align with iteration 1's established patterns and leverage proven components from 4 completed plans.

**Core Principle:** Reuse over reinvent. Every component either exists from iteration 1 or uses standard tools already in 2L's stack.

---

## Core Technologies

### Programming Languages

**Bash (Shell Scripting)**

**Version:** Bash 4+ (system default on Linux)

**Purpose:**
- CLI orchestration (commands/2l-improve.md)
- User interaction (confirmation workflow)
- Git operations (commits, rollback, status checks)
- /2l-mvp invocation
- File system operations

**Rationale:**
- Consistent with all existing 2L commands (2l-mvp, 2l-vision, 2l-task)
- Excels at command orchestration and subprocess management
- Native git integration
- Simple argument parsing via getopts
- No compilation needed (immediate changes)

**Usage:**
- Main CLI: commands/2l-improve.md (~200 LOC)
- Symlink verification: lib/verify-symlinks.sh (~60 LOC)
- Git safety operations: integrated in main command

---

**Python 3**

**Version:** Python 3.8+ (system default)

**Purpose:**
- Data manipulation (YAML parsing, pattern detection)
- Complex algorithms (impact score calculation, similarity matching)
- String formatting (vision template substitution)
- Atomic file operations

**Rationale:**
- Excellent YAML support (PyYAML library)
- Proven in iteration 1 (lib/2l-yaml-helpers.py)
- Better than Bash for data structures and string manipulation
- Standard library rich (tempfile, shutil, datetime, argparse)

**Usage:**
- Pattern detector: lib/2l-pattern-detector.py (~100 LOC)
- Vision generator: lib/2l-vision-generator.py (~110 LOC)
- YAML helpers extension: lib/2l-yaml-helpers.py (+90 LOC)

---

### Data Formats

**YAML**

**Schema Version:** 1.0 (established in iteration 1)

**Purpose:**
- Global learnings storage (.2L/global-learnings.yaml)
- Per-iteration learnings (.2L/plan-X/iteration-Y/learnings.yaml)
- Configuration (consistent with config.yaml)

**Rationale:**
- Human-readable (easy debugging, manual editing)
- Git-friendly (meaningful diffs)
- PyYAML support mature and stable
- Consistent with existing 2L patterns

**Extensions in Iteration 7:**
```yaml
# New field in pattern schema
status: "IDENTIFIED" | "IMPLEMENTED" | "VERIFIED"

# New metadata fields (added when status → IMPLEMENTED)
implemented_in_plan: "plan-5"
implemented_at: "2025-11-20T10:15:00Z"
vision_file: ".2L/plan-5/vision.md"
```

**Backward Compatibility:**
- Status field optional (defaults to IDENTIFIED)
- Metadata fields added progressively
- No migration script needed (graceful degradation)

---

**JSON**

**Purpose:**
- Inter-process communication (pattern detector → vision generator)
- Temporary data exchange
- CLI output formatting

**Rationale:**
- Python's json library (standard library)
- Easier for piping between scripts than YAML
- Lighter weight for temporary data

**Usage:**
```bash
# Pattern detector outputs JSON
python3 lib/2l-pattern-detector.py --output patterns.json

# Vision generator consumes JSON
python3 lib/2l-vision-generator.py --pattern-json patterns.json
```

---

**Markdown**

**Purpose:**
- Vision template (.claude/templates/improvement-vision.md)
- Vision output (.2L/plan-X/vision.md)
- Documentation

**Rationale:**
- Natural format for visions (established pattern)
- Template-based generation simpler than LLM
- Variable substitution via Python string formatting

**Template Engine:** Python string .replace() method (no external library needed)

**Alternative Considered:** Jinja2 templates
**Why Rejected:** Overkill for simple variable substitution, adds dependency

---

### Dependencies

**Python Libraries**

**PyYAML**

**Version:** Latest stable (already installed from iteration 1)

**Purpose:**
- Read/write global-learnings.yaml
- Parse iteration learnings
- Safe YAML operations (yaml.safe_load, yaml.dump)

**Installation:** Pre-installed in iteration 1
```bash
pip3 install pyyaml  # Already available
```

**Usage:**
```python
import yaml
with open('global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
```

---

**Standard Library (No Installation Needed)**

- **argparse:** CLI argument parsing
- **os:** File system operations
- **sys:** System operations, exit codes
- **tempfile:** Secure temp file creation (mkstemp)
- **shutil:** File operations (copy, move)
- **datetime:** Timestamps (ISO 8601 format)
- **json:** JSON serialization

**Rationale:** No external dependencies beyond PyYAML reduces fragility

---

### System Utilities

**Git**

**Version:** Any modern git (2.0+)

**Purpose:**
- Version control for meditation space
- Safety checkpoints (pre-modification commits)
- Rollback mechanism (git reset)
- Status checking (git status, git diff)
- Tagging improvements (git tag 2l-improve-PATTERN-ID)

**Critical Operations:**
```bash
# Pre-flight check
git diff-index --quiet HEAD --

# Safety checkpoint
git commit -m "Pre-improvement checkpoint: PATTERN-003"
git tag "pre-PATTERN-003-$(date +%s)"

# Rollback on failure
git reset --hard pre-PATTERN-003-*
```

---

**flock (util-linux)**

**Version:** System default

**Purpose:**
- File locking to prevent concurrent /2l-improve runs
- Protect global-learnings.yaml from simultaneous writes

**Rationale:**
- Standard Linux utility (always available)
- Simple to use
- Prevents race conditions

**Usage:**
```bash
# In /2l-improve command
flock -n /tmp/2l-improve.lock /2l-improve-internal "$@"
if [ $? -ne 0 ]; then
    echo "ERROR: Another /2l-improve instance is running"
    exit 1
fi
```

---

### File System Patterns

**Atomic Writes (from iteration 1)**

**Library:** lib/2l-yaml-helpers.py (existing)

**Function:** atomic_write_yaml()

**Mechanism:**
1. Create temp file in same directory (tempfile.mkstemp)
2. Write data to temp file
3. Atomic rename (shutil.move → os.rename on POSIX)
4. Clean up temp file on error

**Rationale:**
- Prevents corruption if process crashes mid-write
- POSIX rename is atomic (file is either old or new version, never partial)
- Proven in iteration 1 (95% confidence validation)

---

**Backup Before Modification**

**Library:** lib/2l-yaml-helpers.py (existing)

**Function:** backup_before_write()

**Mechanism:**
1. Copy file to .bak before modification (shutil.copy2)
2. Preserve metadata (timestamps)
3. Manual recovery option if needed

**Rationale:**
- Safety net if atomic write succeeds but data is wrong
- Enables manual inspection and rollback
- Low cost (disk space trivial for YAML files)

---

### Event System

**Event Logger**

**Library:** lib/2l-event-logger.sh (existing)

**Function:** log_2l_event()

**Format:** JSONL (JSON Lines - one JSON object per line)

**Output:** .2L/events.jsonl

**Rationale:**
- Dashboard visibility (real-time progress tracking)
- Post-mortem analysis (debugging failed runs)
- Graceful degradation (failures don't block execution)

**New Event Types for /2l-improve:**
- `command_start`: /2l-improve begins
- `learnings_loaded`: N patterns loaded from global file
- `pattern_detection`: N recurring patterns found
- `pattern_selected`: PATTERN-ID chosen for improvement
- `vision_generated`: vision.md created
- `confirmation_prompt`: waiting for user confirmation
- `user_confirmed`: user approved self-modification
- `self_modification_start`: /2l-mvp invoked
- `self_modification_complete`: /2l-mvp succeeded
- `status_updated`: pattern status IDENTIFIED → IMPLEMENTED
- `command_complete`: /2l-improve finished

**Backward Compatibility:**
- Event logging optional (check if lib/2l-event-logger.sh exists)
- Failures in event emission don't block workflow
- Can run without event system (degrades gracefully)

---

## Integration Points

### With Existing 2L Infrastructure

**1. Orchestrator (/2l-mvp)**

**Integration Type:** Subprocess invocation

**Flow:**
```
/2l-improve generates vision.md
  ↓
Invokes: claude-ai "/2l-mvp"
  ↓
/2l-mvp reads vision.md
  ↓
/2l-mvp spawns builders, integrators, validators
  ↓
/2l-mvp completes (exit code 0 or 1)
  ↓
/2l-improve checks exit code
  ↓
On success: update pattern status
On failure: git rollback
```

**Contract:** Vision.md must follow established format (validated in iteration 1)

---

**2. Global Learnings (from iteration 1)**

**Integration Type:** File-based (read/write YAML)

**Flow:**
```
Iteration 1: Orchestrator reflection → global-learnings.yaml
  ↓
Iteration 7: /2l-improve reads global-learnings.yaml
  ↓
Pattern detection & ranking
  ↓
Vision generation
  ↓
/2l-mvp execution
  ↓
Status update → global-learnings.yaml (IDENTIFIED → IMPLEMENTED)
```

**Contract:** YAML schema version 1.0 (backward compatible extensions)

---

**3. Event System**

**Integration Type:** Shared library (bash sourcing)

**Flow:**
```
/2l-improve sources lib/2l-event-logger.sh
  ↓
Checks if EVENT_LOGGING_ENABLED
  ↓
Emits events throughout workflow
  ↓
Events written to .2L/events.jsonl
  ↓
Dashboard reads events.jsonl (real-time)
```

**Contract:** log_2l_event(type, data, phase, agent_id) signature

---

**4. Symlink Architecture**

**Integration Type:** File system (symlinks)

**Flow:**
```
Source code: ~/Ahiya/2L/ (git-controlled)
  ↓
Symlinks: ~/.claude/ → ~/Ahiya/2L/
  ↓
/2l-improve modifies files in ~/Ahiya/2L/
  ↓
Changes immediately live via symlinks
  ↓
Git commits track changes
```

**Safety Check:** verify-symlinks.sh validates integrity before modification

---

### External APIs

**None.** This is meditation space infrastructure - no external integrations.

All operations are local:
- File system (YAML read/write)
- Git (version control)
- Subprocess (/2l-mvp invocation)
- Event logging (local JSONL file)

**Rationale:** Self-contained system reduces dependencies and failure modes.

---

## Testing Framework

### Unit Testing

**Framework:** Python unittest (standard library)

**Alternative Considered:** pytest
**Why Rejected:** unittest sufficient for this scope, no external dependency

**Test Files:**
- `tests/test_pattern_detector.py`
- `tests/test_vision_generator.py`
- `tests/test_status_updater.py`

**Coverage Target:** 80%+ for core functions

**CI/CD:** Not applicable (meditation space, manual testing acceptable for MVP)

---

### Integration Testing

**Framework:** Bash scripts with synthetic data

**Approach:**
1. Create test global-learnings.yaml with known patterns
2. Run /2l-improve --dry-run
3. Verify output (pattern detection, ranking, vision preview)
4. Run /2l-improve --manual
5. Verify vision.md created correctly
6. Clean up test files

**Test Data:** `.2L/test-data/synthetic-learnings.yaml`

---

### Edge Case Testing

**Framework:** Bash scripts

**Test Scenarios:**
- Empty patterns (no IDENTIFIED)
- Tie scores (multiple patterns same impact)
- Invalid YAML (error handling)
- Concurrent runs (file locking)
- User cancels (no side effects)
- Git dirty (abort or override)
- Symlinks broken (abort with error)

---

## Development Environment

### Required Tools

**Minimum:**
- Bash 4+
- Python 3.8+
- Git 2.0+
- PyYAML

**Optional (for development):**
- pylint (code quality)
- shellcheck (bash linting)

**Installation Verification:**
```bash
# Check versions
bash --version
python3 --version
git --version
python3 -c "import yaml; print(yaml.__version__)"

# All should succeed
```

---

### File Locations

**Source Code:**
- `~/Ahiya/2L/` - Meditation space (git-controlled)

**Live System:**
- `~/.claude/` - Symlinked to ~/Ahiya/2L/

**Data Files:**
- `~/Ahiya/2L/.2L/global-learnings.yaml` - Global knowledge base
- `~/Ahiya/2L/.2L/events.jsonl` - Event log

**Templates:**
- `~/Ahiya/2L/.claude/templates/improvement-vision.md` - Vision template

---

## Performance Targets

### Execution Time

**Pattern Detection:**
- Target: < 2 seconds
- Expected: ~0.5 seconds (trivial data volumes)
- Bottleneck: YAML parsing (~100 patterns max)

**Vision Generation:**
- Target: < 1 second
- Expected: ~0.2 seconds (template substitution)
- Bottleneck: String operations

**Status Update:**
- Target: < 1 second
- Expected: ~0.3 seconds (atomic write + backup)
- Bottleneck: File I/O

**/2l-improve Total (excluding /2l-mvp):**
- Target: < 10 seconds
- Expected: ~2-3 seconds (interactive prompts dominate)

**Note:** /2l-mvp execution time varies (minutes to hours) but is not part of /2l-improve performance.

---

### Data Volumes

**Current Scale (from exploration):**
- Global learnings: ~50 patterns (5KB)
- Events log: ~1000 events (100KB)
- Per-iteration learnings: 1-5 learnings (1KB)

**Projected Scale (3 years):**
- Global learnings: ~500 patterns (50KB)
- Events log: ~10,000 events (1MB)

**Performance Impact:** Trivial. No optimization needed for foreseeable future.

**Scalability Strategy:** If data grows beyond projections, implement:
1. Pattern archival (move VERIFIED to separate file)
2. Event log rotation (monthly files)
3. Indexed search (sqlite for patterns)

**Decision:** Defer optimization until proven necessary.

---

## Security Considerations

### File Permissions

**Global Learnings:**
```bash
chmod 600 .2L/global-learnings.yaml  # User-only read/write
```

**Rationale:** Contains project details, may have sensitive information

---

### Sensitive Data Prevention

**Approach:** Sanitize error messages before storing in learnings

**Implementation:**
```python
def sanitize_error_message(msg):
    """Remove potential secrets from error messages."""
    import re
    # Replace potential API keys
    msg = re.sub(r'[A-Za-z0-9]{32,}', '[REDACTED]', msg)
    # Replace potential passwords
    msg = re.sub(r'password[=:]\s*\S+', 'password=[REDACTED]', msg, flags=re.IGNORECASE)
    return msg
```

**Usage:** Validator sanitizes before writing to learnings.yaml

---

### Git Commit Safety

**Pre-Commit Hook Consideration:**
```bash
# Check for secrets in staged changes
git diff --staged | grep -i "api[_-]key\|password\|secret"
```

**Decision:** Not implemented in iteration 7 (manual review sufficient for meditation space)

**Future:** Consider pre-commit hooks in plan-6 if 2L starts working on projects with real secrets

---

### Symlink Integrity

**Risk:** Broken symlinks cause modifications to wrong location

**Mitigation:** verify-symlinks.sh checks all critical symlinks before modification

**Implementation:**
```bash
# Verify symlink points to expected target
actual_target=$(readlink -f ~/.claude/agents)
expected_target=$(readlink -f ~/Ahiya/2L/agents)

if [ "$actual_target" != "$expected_target" ]; then
    echo "ERROR: Symlink integrity check failed"
    exit 1
fi
```

---

## Migration Strategy

### Backward Compatibility

**Global Learnings Schema:**
- New `status` field defaults to IDENTIFIED
- Existing files without status work (graceful degradation)
- No migration script needed

**Code Compatibility:**
```python
def get_pattern_status(pattern):
    """Get status with backward compatibility."""
    return pattern.get('status', 'IDENTIFIED')  # Default if missing
```

---

### Rollback Capability

**Git-Based Rollback:**
```bash
# Before deployment
git tag pre-2l-improve

# After issues discovered
git reset --hard pre-2l-improve

# Symlinks make rollback immediate (no installation step)
```

**Data Rollback:**
- Backup files (.bak) enable manual data recovery
- Git history tracks global-learnings.yaml changes
- Can cherry-pick specific commits if needed

---

## Technology Decision Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| CLI Orchestration | Bash | 4+ | Standard for 2L commands |
| Data Processing | Python | 3.8+ | YAML + algorithms |
| Data Format | YAML | - | Human-readable, git-friendly |
| Inter-Process | JSON | - | Lightweight, standard library |
| Templates | Markdown | - | Natural format for visions |
| YAML Library | PyYAML | Latest | Mature, proven in iteration 1 |
| Version Control | Git | 2.0+ | Safety + rollback |
| File Locking | flock | System | Prevent concurrent runs |
| Event System | JSONL | - | Dashboard observability |
| Atomic Writes | tempfile + shutil | - | Corruption prevention |
| Testing | unittest + bash | - | Standard library |

---

## Alternatives Considered

### LLM-Based Vision Generation

**Rejected Because:**
- Higher variability (quality inconsistent)
- Harder to test (non-deterministic outputs)
- Risk of hallucination (off-topic content)
- Template-based is simpler and more reliable

**When to Reconsider:** Plan-6 if template quality proves insufficient

---

### SQLite for Global Learnings

**Rejected Because:**
- Data volumes trivial (<500KB projected)
- YAML is human-readable (easier debugging)
- Git diffs more meaningful with YAML
- No performance issues at current scale

**When to Reconsider:** If patterns exceed 1000 (unlikely before 2027)

---

### Jinja2 Template Engine

**Rejected Because:**
- Overkill for simple variable substitution
- Adds external dependency
- Python string .replace() sufficient

**When to Reconsider:** If templates need conditional logic or loops

---

### Agent-Based Architecture

**Rejected Because:**
- /2l-improve is orchestrator, not builder
- Direct Python calls simpler than agent spawning
- No parallel work needed (sequential workflow)
- Faster execution (no agent coordination overhead)

**When to Reconsider:** Never - this is command-level code

---

## Technology Readiness

All technologies ready for use:

✅ Bash - system default
✅ Python 3 - installed and verified
✅ PyYAML - installed in iteration 1
✅ Git - available and configured
✅ flock - standard Linux utility
✅ Event logger - created in previous plans
✅ YAML helpers - validated in iteration 1 (95% confidence PASS)

**No installation or setup required.** Ready to build.

---

**Tech Stack Document Complete**
**Date:** 2025-11-19
**Plan:** plan-5, iteration-7
**Confidence:** HIGH (all dependencies proven)
