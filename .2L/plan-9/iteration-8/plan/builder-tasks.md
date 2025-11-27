# Builder Task Breakdown

## Overview

**4 primary builders** will work to implement iteration 8 features.

**Complexity Distribution:**
- 1 VERY HIGH complexity task (Task spawning - Builder-1)
- 2 MEDIUM complexity tasks (Vision enhancement, Pattern lifecycle)
- 1 LOW complexity task (Integration)

**Estimated Total Time:** 7.5-8.5 hours

**Split Strategy:**
- Builder-1 MAY split into sub-builders if Task spawning research reveals unexpected complexity
- All other builders self-contained (no splits expected)

**Dependencies:**
- Builder-2 depends on Builder-1 (needs exploration reports to test)
- Builder-4 depends on Builder-3 (calls lifecycle utility)
- Builder-1 and Builder-3 can work in parallel

---

## Builder-1: Task Spawning Infrastructure & Explorer Implementation

### Scope

Replace lines 358-410 of `/2l-improve` with actual Task agent spawning for 3 explorers. This is the highest-risk component as Task tool invocation from bash is undocumented. Builder must research, prototype, and implement the spawning pattern.

### Complexity Estimate

**VERY HIGH**

**Reasoning:**
- No existing bash→Task tool pattern in 2L codebase
- Task tool API must be researched from first principles
- Synchronization logic (waiting for 3 parallel agents) complex
- Event logging integration for each explorer
- Failure of any explorer blocks vision generation
- Multiple retry/timeout scenarios to handle

### Success Criteria

- [ ] Lines 358-410 replaced with Task spawning logic (not placeholders)
- [ ] Explorer-1 spawns and generates real architecture analysis report
- [ ] Explorer-2 spawns and generates real technology patterns report
- [ ] Explorer-3 spawns and generates real pattern-specific analysis report
- [ ] All 3 explorers run in parallel (not sequential)
- [ ] Synchronization logic waits for all completions (max 5 min timeout)
- [ ] Report validation: check for "Placeholder" text, minimum 50 lines
- [ ] Events emitted: `exploration_start`, `agent_spawn` x3, `exploration_complete`
- [ ] Graceful error handling: missing reports cause clear error messages
- [ ] Documentation: Task spawning pattern documented for future reuse

### Files to Create

**Primary:**
- None (modifying existing file)

**Optional (if helper pattern needed):**
- `lib/2l-task-spawner.sh` - Reusable Task spawning helper (if inline approach fails)
- `docs/task-spawning-pattern.md` - Documentation of discovered pattern

### Files to Modify

**`commands/2l-improve.md`**

**Location 1: Lines 358-410 (REPLACE ENTIRELY)**

Current: Placeholder creation

New: Task spawning with synchronization

**Detailed changes:**
```bash
# BEFORE (lines 358-410):
cat > "$exploration_dir/explorer-1-report.md" << 'EOF'
# Explorer 1 Report: 2L Architecture
**Status:** Placeholder (explorers not yet spawned)
EOF

# (Similar for explorers 2 and 3)

# AFTER (lines 358-410):
# Emit exploration start event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "exploration_start" \
                 "Starting system exploration for ${selected_pattern_id}" \
                 "exploration" \
                 "2l-improve"
fi

# Spawn Explorer 1: Architecture
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" \
                 "Explorer-1: Architecture Analysis" \
                 "exploration" \
                 "explorer-1"
fi

spawn_task(
    type="2l-explorer",
    prompt="Explorer 1: Architecture & Structure

Iteration: ${global_iter}
Requirements: ${exploration_context}
Output: ${exploration_dir}/explorer-1-report.md

Focus Area: 2L Architecture & Agent Flow

Analyze the following in meditation space (~/Ahiya/2L):
- How does /2l-mvp orchestrate agents? (commands/2l-mvp.md)
- What are agent responsibilities? (agents/*.md)
- How do agents communicate? (reports, events)
- What is the Task spawning pattern?

Create comprehensive report at: ${exploration_dir}/explorer-1-report.md"
)

# Spawn Explorer 2: Tech Patterns
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" \
                 "Explorer-2: Tech Patterns" \
                 "exploration" \
                 "explorer-2"
fi

spawn_task(
    type="2l-explorer",
    prompt="Explorer 2: Technology Patterns & Dependencies

Iteration: ${global_iter}
Requirements: ${exploration_context}
Output: ${exploration_dir}/explorer-2-report.md

Focus Area: Tech Stack & Patterns

Analyze the following in meditation space (~/Ahiya/2L):
- Bash patterns (commands/*.md)
- Python utilities (lib/*.py)
- YAML structures (.2L/global-learnings.yaml)
- Event logging patterns (lib/2l-event-logger.sh)

Create comprehensive report at: ${exploration_dir}/explorer-2-report.md"
)

# Spawn Explorer 3: Pattern-Specific Analysis
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" \
                 "Explorer-3: Pattern Analysis" \
                 "exploration" \
                 "explorer-3"
fi

spawn_task(
    type="2l-explorer",
    prompt="Explorer 3: Pattern-Specific Analysis

Iteration: ${global_iter}
Requirements: ${exploration_context}
Output: ${exploration_dir}/explorer-3-report.md

Focus Area: ${selected_pattern_id} - ${pattern_name}

Analyze the following in meditation space (~/Ahiya/2L):
- Root cause location in codebase
- Affected files/functions (exact paths)
- Integration guidance for builders
- Complexity assessment

Root Cause: ${root_cause}
Proposed Solution: ${proposed_solution}

Create comprehensive report at: ${exploration_dir}/explorer-3-report.md"
)

# Wait for all explorers with timeout
echo "   Waiting for 3 explorers to complete..."
max_wait=300  # 5 minutes
elapsed=0
all_complete=false

while [ $elapsed -lt $max_wait ]; do
    if [ -f "$exploration_dir/explorer-1-report.md" ] && \
       [ -f "$exploration_dir/explorer-2-report.md" ] && \
       [ -f "$exploration_dir/explorer-3-report.md" ]; then
        all_complete=true
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
done

if [ "$all_complete" = false ]; then
    echo "   ❌ ERROR: Explorer timeout after ${max_wait}s"
    for i in 1 2 3; do
        [ ! -f "$exploration_dir/explorer-${i}-report.md" ] && \
            echo "      Missing: explorer-${i}-report.md"
    done
    exit 1
fi

echo "   ✅ All explorers completed (${elapsed}s)"

# Validate reports
for i in 1 2 3; do
    report="$exploration_dir/explorer-${i}-report.md"

    if grep -q "Placeholder" "$report"; then
        echo "   ⚠️  WARNING: explorer-${i} contains placeholder text"
    fi

    line_count=$(wc -l < "$report")
    if [ $line_count -lt 50 ]; then
        echo "   ⚠️  WARNING: explorer-${i} seems short (${line_count} lines)"
    fi
done

# Emit completion event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "exploration_complete" \
                 "System exploration complete (3 reports in ${elapsed}s)" \
                 "exploration" \
                 "2l-improve"
fi
```

**Lines to delete:** 358-410 (53 lines)
**Lines to add:** ~90 lines
**Net change:** +37 lines

**Location 2: Line 450 (ADD PARAMETER)**

Current: Vision generator call without exploration

New: Add `--exploration-dir` parameter

```bash
# BEFORE:
python3 ~/.claude/lib/2l-vision-generator.py \
    --pattern-json "$selected_pattern_json" \
    --template ~/.claude/templates/improvement-vision.md \
    --output "$vision_path" \
    --plan-id "$next_plan_id"

# AFTER:
python3 ~/.claude/lib/2l-vision-generator.py \
    --pattern-json "$selected_pattern_json" \
    --template ~/.claude/templates/improvement-vision.md \
    --output "$vision_path" \
    --plan-id "$next_plan_id" \
    --exploration-dir "$exploration_dir"
```

**Lines to modify:** 1 line (add parameter)

### Dependencies

**Depends on:** None (foundation layer)

**Blocks:** Builder-2 (vision enhancement needs exploration reports to test)

### Implementation Notes

**Task Spawning Research (CRITICAL):**
- Allocate 1-2 hours for researching Task tool API
- Test with minimal example before full implementation
- Document exact syntax discovered for future reference
- Pattern in `/2l-mvp` uses spawn_task() but context is different (agent vs orchestrator)

**Synchronization Strategy:**
- Polling loop checks for file existence every 5 seconds
- 5-minute timeout allows generous time for analysis
- Clear error messages show which explorer(s) failed

**Event Logging:**
- All events optional (graceful degradation)
- EVENT_LOGGING_ENABLED flag already set in /2l-improve
- Events enable dashboard observability but don't block execution

**Validation:**
- Check for "Placeholder" text indicates explorer didn't override template
- Minimum 50 lines ensures substantial analysis (not just headers)
- Warnings don't block, but alert user to potential quality issues

### Patterns to Follow

**From patterns.md:**

- **Task Tool Spawning Pattern** (see patterns.md section "Task Tool Spawning Pattern")
  - Use spawn_task() pseudocode representation
  - type="2l-explorer" maps to agent name
  - prompt provides full context and instructions

- **Event Emission with Graceful Degradation** (see patterns.md section "Event Logging Patterns")
  - Conditional: `if [ "$EVENT_LOGGING_ENABLED" = true ]; then`
  - Fire-and-forget: Never blocks execution

- **Bash Error Handling** (see patterns.md section "Error Handling Standards")
  - Clear error messages with context
  - Show which specific explorers failed
  - Exit code 1 for failures

### Testing Requirements

**Unit Testing:**
- Test timeout logic with artificially delayed file creation
- Test validation logic with short/placeholder reports
- Test event emission (verify events.jsonl updated)

**Integration Testing:**
- Run `/2l-improve` with real pattern (PATTERN-001 if available)
- Verify 3 explorer reports generated
- Verify reports contain real analysis (not placeholders)
- Verify reports pass validation (>50 lines, no placeholder text)
- Measure total exploration time (should be <5 minutes)

**Edge Cases:**
- One explorer fails: Should timeout and show which one
- All explorers timeout: Should show clear error
- Placeholder reports: Should show warnings
- Missing context.md: Explorers should handle gracefully

### Potential Split Strategy

**IF** Task spawning research reveals EXTREME complexity (>4 hours estimated):

**Foundation (Builder-1):**
- Research Task tool API and document pattern
- Create helper script `lib/2l-task-spawner.sh` if needed
- Implement Explorer-1 spawning as prototype
- Test and validate approach

**Sub-builder 1A (Explorer 2-3 Implementation):**
- Apply discovered pattern to Explorer-2
- Apply discovered pattern to Explorer-3
- Implement wait synchronization
- Add validation and event logging

**Rationale for split:**
- Research is high-uncertainty, isolated from implementation
- Once pattern known, implementation is mechanical
- Allows early validation before scaling to 3 explorers

**When to split:**
- If Builder-1 reports >50% uncertainty after 1 hour of research
- If Task tool API significantly differs from assumptions
- If helper script approach needed (adds file creation complexity)

---

## Builder-2: Vision Generator Enhancement

### Scope

Enhance `lib/2l-vision-generator.py` to read exploration reports and incorporate findings into improvement visions. Update vision template to include exploration context section.

### Complexity Estimate

**MEDIUM**

**Reasoning:**
- Python file modification with clear requirements
- Report parsing via regex (moderate complexity)
- Template variable substitution (straightforward)
- Graceful degradation if reports missing (simple logic)
- Multiple coordinated changes across 2 files

### Success Criteria

- [ ] `lib/2l-vision-generator.py` accepts `--exploration-dir` parameter
- [ ] Function signature updated: `generate_improvement_vision(..., exploration_dir=None)`
- [ ] Helper function created: `_read_exploration_reports(exploration_dir)`
- [ ] Helper function created: `_extract_key_sections(markdown_text, explorer_id)`
- [ ] Extraction includes: Executive Summary, Integration Points, Recommendations
- [ ] Long sections truncated to prevent vision bloat (max 500 chars per section)
- [ ] Template variable `{EXPLORATION_CONTEXT}` populated with findings
- [ ] Graceful handling: If no reports, context = "No exploration data available"
- [ ] `templates/improvement-vision.md` updated with {EXPLORATION_CONTEXT} section
- [ ] Backward compatibility: Works without exploration_dir parameter

### Files to Create

None (modifying existing files)

### Files to Modify

**`lib/2l-vision-generator.py`**

**Location 1: Function Signature (Line ~55)**

```python
# BEFORE:
def generate_improvement_vision(pattern, plan_id, template_path):
    """Generate improvement vision from pattern."""

# AFTER:
def generate_improvement_vision(pattern, plan_id, template_path, exploration_dir=None):
    """Generate improvement vision with optional exploration context."""
```

**Location 2: Exploration Reading (NEW, after template read ~Line 60)**

```python
# NEW CODE:
# Extract exploration context if available
exploration_context = ""
if exploration_dir and os.path.exists(exploration_dir):
    exploration_context = _read_exploration_reports(exploration_dir)
```

**Location 3: Template Replacements (Line ~70)**

```python
# ADD TO replacements dict:
replacements = {
    # ... existing replacements ...
    '{EXPLORATION_CONTEXT}': exploration_context or "No exploration data available (explorers not run)"
}
```

**Location 4: Helper Functions (NEW, end of file before main())**

```python
def _read_exploration_reports(exploration_dir: str) -> str:
    """Read all explorer reports and extract key sections."""
    context = "\n## Exploration Findings\n\n"

    for i in range(1, 4):
        report_path = os.path.join(exploration_dir, f"explorer-{i}-report.md")

        if not os.path.exists(report_path):
            context += f"### Explorer {i}\n⚠️ Report not found\n\n"
            continue

        with open(report_path, 'r') as f:
            report_content = f.read()

        context += _extract_key_sections(report_content, i)

    return context


def _extract_key_sections(markdown_text: str, explorer_id: int) -> str:
    """Extract relevant sections from explorer report."""
    import re

    output = f"### Explorer {explorer_id} Findings\n\n"

    sections = ["Executive Summary", "Integration Points", "Recommendations", "Affected Components"]

    for section in sections:
        pattern = rf"## {section}.*?(?=\n## |\Z)"
        match = re.search(pattern, markdown_text, re.DOTALL)

        if match:
            section_content = match.group(0)
            # Truncate if too long
            if len(section_content) > 500:
                section_content = section_content[:500] + "\n...(truncated)"
            output += section_content + "\n\n"

    return output
```

**Total new code:** ~40 lines

**Location 5: CLI Argument (Line ~140)**

```python
# ADD AFTER --plan-id:
parser.add_argument('--exploration-dir', help='Path to exploration reports directory')
```

**Location 6: Function Call (Line ~150)**

```python
# BEFORE:
vision_content = generate_improvement_vision(pattern, args.plan_id, args.template)

# AFTER:
vision_content = generate_improvement_vision(pattern, args.plan_id, args.template, args.exploration_dir)
```

**`templates/improvement-vision.md`**

**Location: After "Components to Modify" section (Line ~61)**

```markdown
# BEFORE:
**Components to Modify:**
{AFFECTED_COMPONENTS_LIST}

**Validation Strategy:**

# AFTER:
**Components to Modify:**
{AFFECTED_COMPONENTS_LIST}

**Exploration Findings:**

{EXPLORATION_CONTEXT}

**Validation Strategy:**
```

**Lines added:** 3

### Dependencies

**Depends on:** Builder-1 (needs exploration reports to test integration)

**Blocks:** None (vision enhancement independent of lifecycle)

### Implementation Notes

**Section Extraction:**
- Regex pattern matches from section header to next ## or end of file
- DOTALL flag allows matching across multiple lines
- Truncation at 500 chars prevents vision from becoming too long

**Graceful Degradation:**
- Missing exploration_dir: context = "No exploration data available"
- Missing specific report: Shows "⚠️ Report not found" for that explorer
- Missing section in report: Simply skipped (no error)

**Backward Compatibility:**
- exploration_dir parameter is optional (defaults to None)
- Existing callers without parameter continue to work
- Only `/2l-improve` line 450 needs update (Builder-1 handles this)

### Patterns to Follow

**From patterns.md:**

- **Vision Enhancement Pattern** (see patterns.md section "Vision Enhancement Patterns")
  - Use `_read_exploration_reports()` helper
  - Extract specific sections via regex
  - Truncate long content

- **Python Error Handling** (see patterns.md section "Error Handling Standards")
  - Try/except for file operations
  - Graceful fallbacks for missing files

- **Import Order Convention** (see patterns.md section "Import Order Convention")
  - Standard library imports first
  - Third-party (yaml) second
  - Local imports last

### Testing Requirements

**Unit Testing:**
- Test with no exploration_dir: Should use default message
- Test with missing report files: Should show warnings per missing file
- Test with real reports: Should extract correct sections
- Test section truncation: Verify >500 char sections truncated
- Test backward compatibility: Call without exploration_dir parameter

**Integration Testing:**
- Run vision generator with exploration reports from Builder-1
- Verify vision contains "Exploration Findings" section
- Verify all 3 explorer findings included
- Verify sections properly formatted (markdown headers intact)

**Coverage Target:** 90%

---

## Builder-3: Pattern Lifecycle Manager

### Scope

Create `lib/2l-pattern-lifecycle.py` utility to manage pattern status transitions through lifecycle: IDENTIFIED → IMPLEMENTED → VERIFIED → REGRESSED. Implement state machine validation, atomic YAML updates, and JSONL audit trail.

### Complexity Estimate

**MEDIUM**

**Reasoning:**
- Well-defined state machine (4 states, clear transitions)
- Python implementation (cleaner than bash)
- Atomic write pattern exists in `lib/2l-yaml-helpers.py` as reference
- YAML parsing straightforward with PyYAML
- File locking adds moderate complexity
- CLI interface with argparse (standard pattern)

### Success Criteria

- [ ] File created: `lib/2l-pattern-lifecycle.py`
- [ ] Class created: `PatternLifecycleManager`
- [ ] State validation: VALID_TRANSITIONS dict enforced
- [ ] Method: `update_status(pattern_id, new_status, metadata)` implemented
- [ ] Atomic YAML writes using temp-file-and-rename pattern
- [ ] Backup created before every write (`.bak` file)
- [ ] JSONL history appended: `.2L/global-learnings.jsonl`
- [ ] CLI interface: `update`, `get-status`, `list` commands
- [ ] Type hints on all methods
- [ ] Comprehensive docstrings
- [ ] Idempotent operations (safe to call multiple times)
- [ ] Exit codes: 0=success, 1=validation error

### Files to Create

**`lib/2l-pattern-lifecycle.py`** (~250 lines)

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
        # Implementation (see patterns.md for full code)

    def _validate_transition(self, current: str, new: str):
        """Validate state machine transition."""
        # Implementation

    def _find_pattern(self, data: Dict, pattern_id: str) -> Optional[Dict]:
        """Find pattern by ID."""
        # Implementation

    def _load_learnings(self) -> Dict:
        """Load global learnings YAML."""
        # Implementation

    def _atomic_write_yaml(self, data: Dict):
        """Write YAML atomically using temp file + rename."""
        # Implementation

    def _backup_before_write(self):
        """Create .bak backup before modifying."""
        # Implementation

    def _append_lifecycle_event(self, pattern_id: str, old: str, new: str):
        """Append status change to JSONL history."""
        # Implementation


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Manage pattern lifecycle')

    subparsers = parser.add_subparsers(dest='command', help='Command')

    # update command
    update_parser = subparsers.add_parser('update', help='Update status')
    update_parser.add_argument('--pattern-id', required=True)
    update_parser.add_argument('--status', required=True, choices=[...])
    update_parser.add_argument('--plan-id')
    update_parser.add_argument('--iteration', type=int)
    update_parser.add_argument('--global-learnings', default='.2L/global-learnings.yaml')

    args = parser.parse_args()

    # Execute command
    # ...


if __name__ == '__main__':
    main()
```

**See patterns.md "Pattern Lifecycle Management Patterns" for complete implementation.**

### Dependencies

**Depends on:** None (independent utility)

**Blocks:** Builder-4 (integration calls this utility)

### Implementation Notes

**State Machine (CRITICAL):**
- IDENTIFIED can only transition to IMPLEMENTED
- IMPLEMENTED can go to VERIFIED (success) or REGRESSED (recurrence)
- VERIFIED can only go to REGRESSED (if pattern recurs later)
- REGRESSED can return to IMPLEMENTED (fix-and-retry cycle)

**Metadata Handling:**
- IMPLEMENTED: Add `implemented_at`, `implemented_in_plan`, `verification_start_iteration`
- VERIFIED: Add `verified_at`
- REGRESSED: Add `regressed_at`, `regressed_in_plan`, `regressed_in_iteration`

**Atomic Writes:**
- Use temp-file-and-rename pattern (OS-level atomic guarantee)
- Always backup before write (`.bak` file for recovery)
- Clean up temp file on errors

**JSONL History:**
- Append to `.2L/global-learnings.jsonl`
- One line per status change
- Structure: `{timestamp, event, pattern_id, old_status, new_status}`
- Enables full audit trail and analytics

### Patterns to Follow

**From patterns.md:**

- **Pattern Lifecycle Management Patterns** (see patterns.md section "Pattern Lifecycle Management Patterns")
  - Complete code example provided
  - State machine validation
  - Atomic write pattern

- **Python Error Handling** (see patterns.md section "Error Handling Standards")
  - Specific exceptions before generic
  - Exit codes: 0=success, 1=error

- **Code Quality Standards** (see patterns.md section "Code Quality Standards")
  - Type hints on all methods
  - Comprehensive docstrings
  - Import order convention

### Testing Requirements

**Unit Testing (pytest):**

```python
# test_pattern_lifecycle.py

def test_validate_transition_valid():
    """Test valid state transitions."""
    manager = PatternLifecycleManager()
    # Should not raise
    manager._validate_transition('IDENTIFIED', 'IMPLEMENTED')
    manager._validate_transition('IMPLEMENTED', 'VERIFIED')

def test_validate_transition_invalid():
    """Test invalid state transitions."""
    manager = PatternLifecycleManager()
    with pytest.raises(ValueError):
        manager._validate_transition('IDENTIFIED', 'VERIFIED')

def test_update_status_idempotent():
    """Test updating to same status is idempotent."""
    # Setup: Create test YAML with IDENTIFIED pattern
    # Action: Update to IDENTIFIED twice
    # Assert: No error, single entry in JSONL

def test_atomic_write_on_error():
    """Test atomic write cleans up on error."""
    # Mock file system error during write
    # Assert: Temp file cleaned up, original YAML unchanged

def test_backup_created():
    """Test backup file created before write."""
    # Setup: Existing YAML
    # Action: Update status
    # Assert: .bak file exists with original content
```

**Integration Testing:**

```bash
# Create test global-learnings.yaml
cat > .2L/global-learnings.yaml << 'EOF'
patterns:
  - pattern_id: TEST-001
    status: IDENTIFIED
    name: Test Pattern
EOF

# Test update to IMPLEMENTED
python3 lib/2l-pattern-lifecycle.py update \
    --pattern-id TEST-001 \
    --status IMPLEMENTED \
    --plan-id plan-test \
    --iteration 1

# Verify: Status changed in YAML
# Verify: Event appended to JSONL
# Verify: Backup created

# Test invalid transition
python3 lib/2l-pattern-lifecycle.py update \
    --pattern-id TEST-001 \
    --status VERIFIED  # Should fail (IMPLEMENTED -> VERIFIED not direct)

# Verify: Exit code 1, error message clear
```

**Coverage Target:** 85%

---

## Builder-4: Lifecycle Integration & Smoke Tests

### Scope

Integrate pattern lifecycle manager into `/2l-improve` and create smoke test suite for post-modification validation. This builder handles the "wiring" that connects lifecycle utility to orchestration flow.

### Complexity Estimate

**LOW**

**Reasoning:**
- Straightforward bash script modifications
- Clear integration points (post-`/2l-mvp` completion)
- Smoke test script follows established pattern
- No complex logic or algorithms
- Minimal dependencies

### Success Criteria

- [ ] `/2l-improve` lines 855-866 updated to call lifecycle manager
- [ ] Pattern status updated to IMPLEMENTED after successful `/2l-mvp` run
- [ ] Event emitted: `pattern_implemented`
- [ ] Smoke test script created: `lib/2l-smoke-tests.sh`
- [ ] Smoke tests include: event logging, pattern detector, symlinks, commands, agents
- [ ] Smoke tests called from `/2l-improve` before marking pattern IMPLEMENTED
- [ ] Clear error messages if smoke tests fail
- [ ] Rollback recommendation displayed if tests fail
- [ ] Exit codes: 0=success, 1=test failure, 2=critical safety violation

### Files to Create

**`lib/2l-smoke-tests.sh`** (~80 lines)

**See patterns.md "Safety Patterns" section for complete implementation.**

**Structure:**
- Test 1: Event logging works
- Test 2: Pattern detection runs
- Test 3: Symlinks valid
- Test 4: Commands executable
- Test 5: Agent definitions valid
- Test 6: Python dependencies available

**All tests** must pass for exit code 0.

### Files to Modify

**`commands/2l-improve.md`**

**Location 1: Lines 855-866 (REPLACE)**

Current: Direct YAML helper call

New: Lifecycle manager call

```bash
# BEFORE (lines 855-866):
python3 ~/.claude/lib/2l-yaml-helpers.py update_pattern_status \
    --global-learnings "$GLOBAL_LEARNINGS" \
    --pattern-id "$selected_pattern_id" \
    --status "IMPLEMENTED" \
    --metadata-json "{...}"

# AFTER (lines 855-866):
echo "   Running post-modification smoke tests..."

if [ -f "$HOME/.claude/lib/2l-smoke-tests.sh" ]; then
    bash "$HOME/.claude/lib/2l-smoke-tests.sh"

    if [ $? -eq 0 ]; then
        echo "   ✅ Smoke tests passed - 2L framework healthy"
    else
        echo "   ❌ CRITICAL: Smoke tests failed"
        echo "      Self-modification may have broken 2L framework"
        echo "      Rollback: git reset --hard $checkpoint_tag"
        exit 2
    fi
else
    echo "   ⚠️  WARNING: Smoke tests not found, skipping validation"
fi

echo "   Updating pattern status to IMPLEMENTED..."

python3 "$HOME/.claude/lib/2l-pattern-lifecycle.py" update \
    --pattern-id "$selected_pattern_id" \
    --status "IMPLEMENTED" \
    --plan-id "$next_plan_id" \
    --iteration "$global_iter" \
    --global-learnings ".2L/global-learnings.yaml"

if [ $? -eq 0 ]; then
    echo "   ✅ Pattern status: IDENTIFIED → IMPLEMENTED"
    echo "   📊 Monitoring next 3 iterations for recurrence"

    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "pattern_implemented" \
                     "Pattern ${selected_pattern_id} implemented in ${next_plan_id}" \
                     "self_modification" \
                     "2l-improve"
    fi
else
    echo "   ⚠️  WARNING: Pattern status update failed"
fi
```

**Lines to replace:** 12 lines
**Lines to add:** ~30 lines
**Net change:** +18 lines

### Dependencies

**Depends on:** Builder-3 (calls lifecycle manager utility)

**Blocks:** None (final integration step)

### Implementation Notes

**Smoke Test Execution:**
- Run after `/2l-mvp` completes but before pattern status update
- Failure triggers critical error and rollback recommendation
- Missing script shows warning but allows continuation (graceful degradation)

**Pattern Status Update:**
- Only called if smoke tests pass
- Provides plan_id and iteration for metadata
- Success emits `pattern_implemented` event
- Failure shows warning but doesn't abort (status remains IDENTIFIED)

**Error Handling:**
- Exit code 2 for critical failures (smoke tests failed)
- Exit code 1 for validation failures (pattern not found, etc.)
- Exit code 0 for success

### Patterns to Follow

**From patterns.md:**

- **Call Lifecycle Manager from Bash** (see patterns.md section "Pattern Lifecycle Management Patterns")
  - Exit code checking
  - Event emission after success

- **Smoke Tests** (see patterns.md section "Safety Patterns")
  - Complete implementation provided
  - Each test validates critical component

- **Bash Error Handling** (see patterns.md section "Error Handling Standards")
  - Clear error messages
  - Rollback instructions

### Testing Requirements

**Integration Testing:**

```bash
# Setup: Run /2l-improve with test pattern
/2l-improve --pattern TEST-001

# Verify smoke tests executed:
grep "smoke_test" .2L/events.jsonl

# Verify pattern status updated:
python3 -c "
import yaml
with open('.2L/global-learnings.yaml') as f:
    data = yaml.safe_load(f)
    for p in data['patterns']:
        if p['pattern_id'] == 'TEST-001':
            assert p['status'] == 'IMPLEMENTED'
            print('✓ Status updated')
"

# Verify event emitted:
grep "pattern_implemented" .2L/events.jsonl

# Test smoke test failure scenario:
# Temporarily break symlinks
rm ~/.claude/lib/2l-event-logger.sh
/2l-improve --pattern TEST-001
# Verify: Exit code 2, error message clear
# Restore symlinks
```

**Coverage Target:** 75% (mainly integration paths)

---

## Builder Execution Order

### Parallel Group 1: Foundation (No dependencies)

**Start simultaneously:**
- **Builder-1:** Task spawning infrastructure
- **Builder-3:** Pattern lifecycle manager

**Estimated Duration:** 3-4 hours (Builder-1), 2 hours (Builder-3)

**Synchronization Point:** Both builders complete before proceeding to Group 2

### Parallel Group 2: Enhancement (Depends on Group 1)

**Start simultaneously:**
- **Builder-2:** Vision enhancement (needs Builder-1 exploration reports for testing)
- **Builder-4:** Lifecycle integration (needs Builder-3 utility to call)

**Estimated Duration:** 1.5 hours (Builder-2), 1 hour (Builder-4)

**Synchronization Point:** Both builders complete before integration phase

---

## Integration Notes

### File Conflict Prevention

**`commands/2l-improve.md`:**
- Builder-1 modifies: Lines 358-410 + Line 450 (exploration spawning + vision call)
- Builder-4 modifies: Lines 855-866 (lifecycle integration)
- **No conflict:** Different line ranges with clear boundaries

**`lib/2l-vision-generator.py`:**
- Builder-2 modifies: Multiple locations (function signature, helpers, CLI)
- **No conflict:** Only builder touching this file

**`templates/improvement-vision.md`:**
- Builder-2 modifies: Line 61 (add exploration section)
- **No conflict:** Only builder touching this file

**`lib/2l-pattern-lifecycle.py`:**
- Builder-3 creates: New file
- **No conflict:** File doesn't exist yet

**`lib/2l-smoke-tests.sh`:**
- Builder-4 creates: New file
- **No conflict:** File doesn't exist yet

**Risk Assessment:** VERY LOW conflict risk due to clear file ownership

### Shared Dependencies

**Event Logger Library:** All builders use `lib/2l-event-logger.sh`
- Already exists
- Read-only usage (no modifications)
- Graceful degradation built-in

**YAML Helpers:** Builder-3 references atomic write patterns
- Already exists in `lib/2l-yaml-helpers.py`
- Read-only usage (pattern reference, not modification)

**Git Safety:** Builder-1 and Builder-4 verify safety mechanisms
- Already exists in `/2l-improve`
- Read-only verification (no modifications)

### Integration Testing Checklist

After all builders complete:

- [ ] Run `/2l-improve` with test pattern
- [ ] Verify 3 explorer reports generated (Builder-1)
- [ ] Verify reports contain real analysis (not placeholders)
- [ ] Verify vision contains exploration context (Builder-2)
- [ ] Verify pattern status updates to IMPLEMENTED (Builder-3, Builder-4)
- [ ] Verify smoke tests execute (Builder-4)
- [ ] Verify events logged throughout (all builders)
- [ ] Run smoke tests manually to validate 2L health
- [ ] Verify git checkpoint created
- [ ] Test rollback procedure

---

## Risk Mitigation Summary

### High-Risk Areas

**Builder-1: Task Spawning Unknown**
- Mitigation: Extra research time allocated (1-2 hours)
- Mitigation: Prototype with single explorer before scaling
- Mitigation: Split option if complexity exceeds estimates
- Fallback: Helper script approach if inline fails

**Builder-3: YAML Corruption**
- Mitigation: Atomic writes (temp-file-and-rename)
- Mitigation: Backup before every write
- Mitigation: File locking (optional enhancement)

### Medium-Risk Areas

**Builder-1: Explorer Timeout**
- Mitigation: 5-minute timeout (generous)
- Mitigation: Clear error messages
- Mitigation: Graceful degradation in vision generator

**Builder-2: Low-Quality Reports**
- Mitigation: Validation checks (length, placeholder text)
- Mitigation: Warnings but not blockers (MVP approach)

### Coordination Risks

**Builder-4 Depends on Builder-3**
- Mitigation: Builder-3 lower complexity (likely completes first)
- Mitigation: Builder-4 can prepare integration code while waiting
- Impact: Low (Builder-4 is fast once Builder-3 ready)

**Builder-2 Depends on Builder-1**
- Mitigation: Builder-2 can implement core logic without reports
- Mitigation: Testing happens after Builder-1 completes
- Impact: Medium (Builder-2 needs real reports for full validation)

---

## Final Deliverables

### Builder-1 Deliverables
- Modified `commands/2l-improve.md` (lines 358-410 replaced, line 450 modified)
- Optional: `lib/2l-task-spawner.sh` if helper approach used
- Optional: `docs/task-spawning-pattern.md` documentation
- Integration report detailing Task spawning pattern discovered

### Builder-2 Deliverables
- Modified `lib/2l-vision-generator.py` (5 locations updated, 2 new functions)
- Modified `templates/improvement-vision.md` (3 lines added)
- Test coverage report (target: 90%)

### Builder-3 Deliverables
- New file `lib/2l-pattern-lifecycle.py` (~250 lines)
- Test coverage report (target: 85%)
- CLI usage examples

### Builder-4 Deliverables
- Modified `commands/2l-improve.md` (lines 855-866 replaced)
- New file `lib/2l-smoke-tests.sh` (~80 lines)
- Integration test results
- End-to-end validation report

---

**Task Breakdown Complete**
**Total Builders:** 4 (potential +2 if Builder-1 splits)
**Total Estimated Time:** 7.5-8.5 hours
**Confidence:** 80% (Task spawning uncertainty, rest well-defined)
**Ready for:** Building phase execution
