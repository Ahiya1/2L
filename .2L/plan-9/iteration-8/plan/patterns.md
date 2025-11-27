# Code Patterns & Conventions

## File Structure

```
~/Ahiya/2L/                    # Meditation space (self-improvement target)
├── .2L/
│   ├── events.jsonl           # Event stream
│   ├── global-learnings.yaml  # Pattern database
│   ├── global-learnings.jsonl # Learning history
│   └── plan-9/
│       ├── exploration/
│       │   ├── context.md
│       │   ├── explorer-1-report.md
│       │   ├── explorer-2-report.md
│       │   └── explorer-3-report.md
│       └── vision.md
├── agents/
│   ├── 2l-builder.md
│   ├── 2l-explorer.md
│   └── ...
├── commands/
│   ├── 2l-improve.md          # Main target for modification
│   ├── 2l-mvp.md              # NEVER MODIFY (orchestrator exclusion)
│   └── ...
├── lib/
│   ├── 2l-event-logger.sh
│   ├── 2l-pattern-detector.py
│   ├── 2l-pattern-lifecycle.py  # NEW - Created by Builder-3
│   ├── 2l-vision-generator.py   # Modified by Builder-2
│   ├── 2l-yaml-helpers.py
│   └── 2l-smoke-tests.sh        # NEW - Created by Builder-1 or 4
└── templates/
    └── improvement-vision.md    # Modified by Builder-2
```

---

## Naming Conventions

**Files:**
- Bash scripts: `kebab-case.sh` (e.g., `2l-event-logger.sh`)
- Python utilities: `kebab-case.py` (e.g., `2l-pattern-lifecycle.py`)
- Agent definitions: `kebab-case.md` (e.g., `2l-explorer.md`)
- Templates: `kebab-case.md` (e.g., `improvement-vision.md`)

**Functions (Bash):**
- Public functions: `snake_case` (e.g., `create_safety_checkpoint`)
- Private functions: `_snake_case` with underscore prefix (e.g., `_validate_pattern`)

**Functions (Python):**
- Public methods: `snake_case` (e.g., `update_status`)
- Private methods: `_snake_case` with underscore prefix (e.g., `_validate_transition`)
- Class names: `PascalCase` (e.g., `PatternLifecycleManager`)

**Variables (Bash):**
- Local variables: `snake_case` (e.g., `pattern_id`, `exploration_dir`)
- Environment variables: `SCREAMING_SNAKE_CASE` (e.g., `EVENT_LOGGING_ENABLED`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_WAIT_TIME`)

**Variables (Python):**
- Local variables: `snake_case` (e.g., `pattern_id`, `new_status`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `VALID_STATUSES`)
- Class attributes: `snake_case` (e.g., `learnings_path`)

---

## Task Tool Spawning Pattern

### Pattern: Spawn Task Agent from Bash

**When to use:** Delegating specialized work to Claude Code Task agents

**Code example:**

```bash
# Context: /2l-improve exploration phase (lines 358-410 replacement)

# 1. Create context file for agent
exploration_context="$exploration_dir/context.md"
cat > "$exploration_context" << EOF
# Exploration Context

**Pattern:** ${selected_pattern_id}
**Name:** ${pattern_name}
**Root Cause:** ${root_cause}
**Proposed Solution:** ${proposed_solution}

**Meditation Space:** ~/Ahiya/2L
**Focus:** Analyze 2L framework architecture to enable informed improvements
EOF

# 2. Emit spawn event (optional, graceful degradation)
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" \
                 "Explorer-1: Architecture Analysis" \
                 "exploration" \
                 "explorer-1"
fi

# 3. Spawn Task agent
# CRITICAL: spawn_task is pseudocode representation of Task tool invocation
# Actual syntax may differ - Builder-1 must research and document
spawn_task(
    type="2l-explorer",
    prompt="Explorer 1: Architecture & Structure

Iteration: ${global_iter}
Requirements: ${exploration_context}
Output: ${exploration_dir}/explorer-1-report.md

Focus Area: 2L Architecture & Agent Flow

Analyze the following in the meditation space (~/Ahiya/2L):
- How does /2l-mvp orchestrate agents? (commands/2l-mvp.md)
- What are agent responsibilities? (agents/*.md)
- How do agents communicate? (reports, events)
- What is the Task spawning pattern in existing code?

Create comprehensive report at: ${exploration_dir}/explorer-1-report.md"
)

# 4. Note: Task tool handles waiting for agent completion
# Agent will emit its own agent_complete event upon finishing
```

**Key points:**
- `type` parameter maps to agent frontmatter `name` field (`2l-explorer`)
- `prompt` provides detailed instructions, paths, and output location
- Working directory defaults to meditation space (`~/Ahiya/2L`)
- Task tool automatically waits for completion before proceeding
- Agents are responsible for emitting their own completion events

### Pattern: Parallel Task Spawning with Synchronization

**When to use:** Multiple independent agents analyzing different aspects

**Code example:**

```bash
# Spawn 3 explorers in parallel
echo "   Spawning 3 explorers..."

# Explorer 1: Architecture
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Explorer-1: Architecture" "exploration" "explorer-1"
fi

spawn_task(
    type="2l-explorer",
    prompt="Explorer 1: Architecture & Structure
[... full prompt ...]"
)

# Explorer 2: Technology Patterns
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Explorer-2: Tech Patterns" "exploration" "explorer-2"
fi

spawn_task(
    type="2l-explorer",
    prompt="Explorer 2: Technology Patterns & Dependencies
[... full prompt ...]"
)

# Explorer 3: Pattern-Specific Analysis
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Explorer-3: Pattern Analysis" "exploration" "explorer-3"
fi

spawn_task(
    type="2l-explorer",
    prompt="Explorer 3: Pattern-Specific Analysis
[... full prompt ...]"
)

# Wait for all explorers to complete with timeout
echo "   Waiting for 3 explorers to complete..."
max_wait=300  # 5 minutes
elapsed=0
all_complete=false

while [ $elapsed -lt $max_wait ]; do
    # Check if all reports exist
    if [ -f "$exploration_dir/explorer-1-report.md" ] && \
       [ -f "$exploration_dir/explorer-2-report.md" ] && \
       [ -f "$exploration_dir/explorer-3-report.md" ]; then
        all_complete=true
        break
    fi

    sleep 5
    elapsed=$((elapsed + 5))
done

# Handle timeout
if [ "$all_complete" = false ]; then
    echo "   ❌ ERROR: Explorer timeout after ${max_wait}s"

    # Show which explorers failed
    for i in 1 2 3; do
        if [ ! -f "$exploration_dir/explorer-${i}-report.md" ]; then
            echo "      Missing: explorer-${i}-report.md"
        fi
    done

    exit 1
fi

echo "   ✅ All explorers completed (${elapsed}s)"

# Validate reports contain content (not placeholders)
for i in 1 2 3; do
    report="$exploration_dir/explorer-${i}-report.md"

    # Check for placeholder text
    if grep -q "Placeholder" "$report"; then
        echo "   ⚠️  WARNING: explorer-${i}-report.md appears to be placeholder"
    fi

    # Check minimum length (real analysis should be substantial)
    line_count=$(wc -l < "$report")
    if [ $line_count -lt 50 ]; then
        echo "   ⚠️  WARNING: explorer-${i}-report.md seems short (${line_count} lines)"
    fi
done

# Emit completion event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "exploration_complete" \
                 "System exploration complete (3 reports generated)" \
                 "exploration" \
                 "2l-improve"
fi
```

**Key points:**
- Spawn calls issued sequentially but agents execute in parallel
- Polling loop checks for report file existence
- Timeout prevents infinite waiting (5 minutes default)
- Validation catches placeholder or low-quality reports
- Clear error messages show which explorers failed

---

## Pattern Lifecycle Management Patterns

### Pattern: Update Pattern Status with Validation

**When to use:** Transitioning pattern through lifecycle states

**Code example:**

```python
# File: lib/2l-pattern-lifecycle.py

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
        """Update pattern status with validation and atomic write.

        Args:
            pattern_id: Pattern identifier (e.g., 'PATTERN-001')
            new_status: Target status (IDENTIFIED|IMPLEMENTED|VERIFIED|REGRESSED)
            metadata: Optional dict with plan_id, iteration, etc.

        Returns:
            Updated pattern dict

        Raises:
            ValueError: If pattern not found or invalid transition
        """
        # Load current state
        data = self._load_learnings()

        # Find pattern
        pattern = self._find_pattern(data, pattern_id)
        if not pattern:
            raise ValueError(f"Pattern {pattern_id} not found in global learnings")

        # Validate transition
        current_status = pattern.get('status', 'IDENTIFIED')
        self._validate_transition(current_status, new_status)

        # Idempotent: No-op if already in target status
        if current_status == new_status:
            print(f"Pattern {pattern_id} already {new_status}")
            return pattern

        # Update status and metadata
        pattern['status'] = new_status
        pattern['status_updated_at'] = datetime.now().isoformat()

        # Status-specific metadata
        if new_status == 'IMPLEMENTED':
            pattern['implemented_at'] = datetime.now().isoformat()
            if metadata:
                pattern['implemented_in_plan'] = metadata.get('plan_id')
                pattern['implemented_in_iteration'] = metadata.get('iteration')
                # Start monitoring for verification (3 iterations from now)
                pattern['verification_start_iteration'] = metadata.get('iteration', 0) + 1

        elif new_status == 'VERIFIED':
            pattern['verified_at'] = datetime.now().isoformat()

        elif new_status == 'REGRESSED':
            pattern['regressed_at'] = datetime.now().isoformat()
            if metadata:
                pattern['regressed_in_plan'] = metadata.get('plan_id')
                pattern['regressed_in_iteration'] = metadata.get('iteration')

        # Apply additional metadata
        if metadata:
            for key, value in metadata.items():
                if key not in pattern:  # Don't override existing fields
                    pattern[key] = value

        # Atomic write with backup
        self._backup_before_write()
        self._atomic_write_yaml(data)

        # Append to JSONL history
        self._append_lifecycle_event(pattern_id, current_status, new_status)

        print(f"✓ Pattern {pattern_id}: {current_status} → {new_status}")
        return pattern

    def _validate_transition(self, current: str, new: str):
        """Validate state machine transition."""
        if new not in self.VALID_TRANSITIONS.get(current, []):
            valid = self.VALID_TRANSITIONS.get(current, [])
            raise ValueError(
                f"Invalid transition: {current} → {new}. "
                f"Valid transitions from {current}: {valid}"
            )

    def _find_pattern(self, data: Dict, pattern_id: str) -> Optional[Dict]:
        """Find pattern by ID in global learnings."""
        for pattern in data.get('patterns', []):
            if pattern.get('pattern_id') == pattern_id:
                return pattern
        return None

    def _load_learnings(self) -> Dict:
        """Load global learnings YAML."""
        if not self.learnings_path.exists():
            raise FileNotFoundError(f"Global learnings not found: {self.learnings_path}")

        with open(self.learnings_path, 'r') as f:
            return yaml.safe_load(f)

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
            # Atomic rename (OS-level guarantee)
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


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Manage pattern lifecycle')

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # update command
    update_parser = subparsers.add_parser('update', help='Update pattern status')
    update_parser.add_argument('--pattern-id', required=True, help='Pattern ID')
    update_parser.add_argument('--status', required=True,
                              choices=['IDENTIFIED', 'IMPLEMENTED', 'VERIFIED', 'REGRESSED'],
                              help='New status')
    update_parser.add_argument('--plan-id', help='Plan ID for metadata')
    update_parser.add_argument('--iteration', type=int, help='Iteration number')
    update_parser.add_argument('--global-learnings', default='.2L/global-learnings.yaml',
                              help='Path to global learnings file')

    args = parser.parse_args()

    if args.command == 'update':
        manager = PatternLifecycleManager(args.global_learnings)

        metadata = {}
        if args.plan_id:
            metadata['plan_id'] = args.plan_id
        if args.iteration:
            metadata['iteration'] = args.iteration

        try:
            manager.update_status(args.pattern_id, args.status, metadata)
            sys.exit(0)
        except ValueError as e:
            print(f"ERROR: {e}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"ERROR: Pattern lifecycle update failed: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
```

**Key points:**
- State machine validation prevents invalid transitions
- Atomic writes (temp + rename) prevent corruption
- Backup created before every modification
- JSONL history maintains audit trail
- Idempotent operations (safe to call multiple times)
- Type hints for clarity and IDE support

### Pattern: Call Lifecycle Manager from Bash

**When to use:** Integrating pattern lifecycle into bash orchestration

**Code example:**

```bash
# Context: /2l-improve after successful /2l-mvp completion (lines 855-866)

echo "   Updating pattern status to IMPLEMENTED..."

# Call Python lifecycle manager
python3 "$HOME/.claude/lib/2l-pattern-lifecycle.py" update \
    --pattern-id "$selected_pattern_id" \
    --status "IMPLEMENTED" \
    --plan-id "$next_plan_id" \
    --iteration "$global_iter" \
    --global-learnings ".2L/global-learnings.yaml"

if [ $? -eq 0 ]; then
    echo "   ✅ Pattern status: IDENTIFIED → IMPLEMENTED"
    echo "   📊 Monitoring next 3 iterations for recurrence"

    # Emit event
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "pattern_implemented" \
                     "Pattern ${selected_pattern_id} implemented in ${next_plan_id}" \
                     "self_modification" \
                     "2l-improve"
    fi
else
    echo "   ⚠️  WARNING: Pattern status update failed"
    echo "      Pattern remains in previous state"
fi
```

**Key points:**
- Exit code 0 = success, 1 = error
- Pattern ID and status are required
- Metadata (plan_id, iteration) optional but recommended
- Event emission after successful update
- Graceful handling of failures (warning, not fatal)

---

## Vision Enhancement Patterns

### Pattern: Read Exploration Reports in Vision Generator

**When to use:** Incorporating exploration context into improvement visions

**Code example:**

```python
# File: lib/2l-vision-generator.py (modified function)

import re
import os

def generate_improvement_vision(pattern: Dict, plan_id: str, template_path: str,
                               exploration_dir: Optional[str] = None) -> str:
    """Generate improvement vision with optional exploration context.

    Args:
        pattern: Pattern dict from global-learnings.yaml
        plan_id: Plan identifier (e.g., 'plan-9')
        template_path: Path to vision template markdown
        exploration_dir: Optional path to exploration reports

    Returns:
        Generated vision markdown content
    """
    # Read template
    with open(template_path, 'r') as f:
        template = f.read()

    # Extract exploration context if available
    exploration_context = ""
    if exploration_dir and os.path.exists(exploration_dir):
        exploration_context = _read_exploration_reports(exploration_dir)

    # Build replacements
    replacements = {
        '{PATTERN_ID}': pattern['pattern_id'],
        '{PATTERN_NAME}': pattern['name'],
        '{ROOT_CAUSE}': pattern['root_cause'],
        '{PROPOSED_SOLUTION}': pattern['proposed_solution'],
        '{PLAN_ID}': plan_id,
        '{AFFECTED_FILES}': _format_affected_files(pattern.get('affected_files', [])),
        '{EXPLORATION_CONTEXT}': exploration_context or "No exploration data available (explorers not run)"
    }

    # Apply replacements
    vision = template
    for placeholder, value in replacements.items():
        vision = vision.replace(placeholder, value)

    # Validate no unreplaced placeholders remain
    remaining = re.findall(r'\{[A-Z_]+\}', vision)
    if remaining:
        print(f"WARNING: Unreplaced placeholders: {remaining}", file=sys.stderr)

    return vision


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

        # Extract key sections
        context += _extract_key_sections(report_content, i)

    return context


def _extract_key_sections(markdown_text: str, explorer_id: int) -> str:
    """Extract relevant sections from explorer report.

    Extracts: Executive Summary, Integration Points, Recommendations
    """
    output = f"### Explorer {explorer_id} Findings\n\n"

    # Section headers to extract
    sections = ["Executive Summary", "Integration Points", "Recommendations", "Affected Components"]

    for section in sections:
        # Regex pattern: Match section header until next ## or end of file
        pattern = rf"## {section}.*?(?=\n## |\Z)"
        match = re.search(pattern, markdown_text, re.DOTALL)

        if match:
            section_content = match.group(0)
            # Truncate if too long (keep first 500 chars)
            if len(section_content) > 500:
                section_content = section_content[:500] + "\n...(truncated)"
            output += section_content + "\n\n"

    return output


def _format_affected_files(file_list: List[str]) -> str:
    """Format affected files as markdown list."""
    if not file_list:
        return "- (No files specified)"

    return "\n".join(f"- `{file}`" for file in file_list)


# CLI integration
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate improvement vision')
    parser.add_argument('--pattern-json', required=True, help='Pattern JSON string')
    parser.add_argument('--template', required=True, help='Template file path')
    parser.add_argument('--output', required=True, help='Output vision file path')
    parser.add_argument('--plan-id', required=True, help='Plan ID')
    parser.add_argument('--exploration-dir', help='Path to exploration reports directory')

    args = parser.parse_args()

    # Parse pattern JSON
    pattern = json.loads(args.pattern_json)

    # Generate vision
    vision_content = generate_improvement_vision(
        pattern=pattern,
        plan_id=args.plan_id,
        template_path=args.template,
        exploration_dir=args.exploration_dir
    )

    # Write output
    with open(args.output, 'w') as f:
        f.write(vision_content)

    print(f"✓ Vision generated: {args.output}")
```

**Key points:**
- Graceful degradation if exploration reports missing
- Extracts specific sections (not full reports)
- Truncates long sections to prevent vision bloat
- Validates no unreplaced placeholders remain
- Optional exploration_dir parameter (backward compatible)

### Pattern: Call Enhanced Vision Generator

**When to use:** Generating visions with exploration context

**Code example:**

```bash
# Context: /2l-improve vision generation (line 450)

echo "   Generating improvement vision..."

# Prepare pattern JSON
selected_pattern_json=$(python3 -c "
import yaml, json
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
    for p in data.get('patterns', []):
        if p['pattern_id'] == '$selected_pattern_id':
            print(json.dumps(p))
            break
")

# Generate vision with exploration context
python3 "$HOME/.claude/lib/2l-vision-generator.py" \
    --pattern-json "$selected_pattern_json" \
    --template "$HOME/.claude/templates/improvement-vision.md" \
    --output "$vision_path" \
    --plan-id "$next_plan_id" \
    --exploration-dir "$exploration_dir"

if [ $? -eq 0 ]; then
    echo "   ✅ Vision generated: $vision_path"

    # Verify exploration context included
    if grep -q "Exploration Findings" "$vision_path"; then
        echo "      ✓ Exploration context included"
    else
        echo "      ⚠️  WARNING: Vision may lack exploration context"
    fi
else
    echo "   ❌ ERROR: Vision generation failed"
    exit 1
fi
```

**Key points:**
- Pattern data extracted from YAML and converted to JSON
- exploration-dir parameter passes path to reports
- Post-generation validation checks for exploration content
- Clear success/failure feedback

---

## Event Logging Patterns

### Pattern: Event Emission with Graceful Degradation

**When to use:** Logging orchestration events without blocking execution

**Code example:**

```bash
# Source event logger library (graceful if missing)
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    EVENT_LOGGING_ENABLED=true
else
    EVENT_LOGGING_ENABLED=false
fi

# Function usage example: Exploration phase start
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "exploration_start" \
                 "Starting system exploration for ${selected_pattern_id}" \
                 "exploration" \
                 "2l-improve"
fi

# Agent spawn events
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" \
                 "Explorer-1: Architecture Analysis" \
                 "exploration" \
                 "explorer-1"
fi

# Completion event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "exploration_complete" \
                 "System exploration complete (3 reports generated in ${elapsed}s)" \
                 "exploration" \
                 "2l-improve"
fi
```

**Key points:**
- Conditional execution based on EVENT_LOGGING_ENABLED flag
- Library source wrapped in existence check
- Never blocks execution (fire-and-forget)
- Four parameters: event_type, data, phase, agent_id
- ISO 8601 timestamps generated automatically

### Pattern: Event Types for Iteration 8

**When to use:** Standard event types for this iteration

**Code example:**

```bash
# Exploration phase events
log_2l_event "exploration_start" "..." "exploration" "2l-improve"
log_2l_event "agent_spawn" "Explorer-1: ..." "exploration" "explorer-1"
log_2l_event "agent_complete" "..." "exploration" "explorer-1"  # Emitted by agent
log_2l_event "exploration_complete" "..." "exploration" "2l-improve"

# Pattern lifecycle events
log_2l_event "pattern_implemented" "Pattern PATTERN-001 -> IMPLEMENTED" "self_modification" "2l-improve"

# Safety events
log_2l_event "safety_checkpoint" "Created checkpoint: pre-PATTERN-001-1732680123" "safety" "2l-improve"
log_2l_event "validation_start" "Running smoke tests" "validation" "smoke-tester"
log_2l_event "validation_pass" "All smoke tests passed" "validation" "smoke-tester"
```

---

## Safety Patterns

### Pattern: Git Safety Checkpoint

**When to use:** Before any self-modification of 2L framework

**Code example:**

```bash
# From commands/2l-improve.md (already exists, verify still works)

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

    # Emit event
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "safety_checkpoint" \
                     "Created checkpoint: ${checkpoint_tag}" \
                     "safety" \
                     "2l-improve"
    fi

    # Return tag name for reference
    echo "$checkpoint_tag"
}

# Usage
checkpoint_tag=$(create_safety_checkpoint "$selected_pattern_id")
```

**Key points:**
- `--allow-empty` makes idempotent (safe to call multiple times)
- Timestamp ensures unique tags even for same pattern
- Returns tag name for logging/reference
- Silent failures on git operations (don't block if already committed)

### Pattern: Smoke Tests

**When to use:** Validating 2L framework health after self-modification

**Code example:**

```bash
# File: lib/2l-smoke-tests.sh (NEW - create this)

#!/usr/bin/env bash
# 2L Smoke Tests - Validate framework health post-modification

set -e  # Exit on first failure

echo "Running 2L smoke tests..."

# Source event logger for test events
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    EVENT_LOGGING_ENABLED=true
    log_2l_event "validation_start" "Running smoke tests" "validation" "smoke-tester"
else
    EVENT_LOGGING_ENABLED=false
fi

# Test 1: Event logging works
echo "  Testing event logging..."
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    log_2l_event "smoke_test" "Event logging functional" "testing" "smoke-tester"

    if [ -f .2L/events.jsonl ]; then
        echo "    ✓ Event logging"
    else
        echo "    ❌ FAIL: events.jsonl not created"
        exit 1
    fi
else
    echo "    ⚠️  WARNING: Event logger not found (non-critical)"
fi

# Test 2: Pattern detection runs
echo "  Testing pattern detector..."
python3 "$HOME/.claude/lib/2l-pattern-detector.py" \
    --global-learnings .2L/global-learnings.yaml \
    --output /dev/null 2>&1 || {
    echo "    ❌ FAIL: Pattern detector crashed"
    exit 1
}
echo "    ✓ Pattern detector"

# Test 3: Symlinks valid
echo "  Testing symlink integrity..."
bash "$HOME/.claude/lib/verify-symlinks.sh" > /dev/null 2>&1 || {
    echo "    ❌ FAIL: Symlink verification failed"
    exit 1
}
echo "    ✓ Symlinks"

# Test 4: Commands executable
echo "  Testing command availability..."
for cmd in /2l-status /2l-improve /2l-mvp; do
    if ! which "$cmd" >/dev/null 2>&1; then
        echo "    ❌ FAIL: $cmd not in PATH"
        exit 1
    fi
done
echo "    ✓ Commands"

# Test 5: Agent definitions valid (frontmatter check)
echo "  Testing agent definitions..."
for agent in "$HOME/.claude/agents"/*.md; do
    if ! grep -q "^---$" "$agent" 2>/dev/null; then
        echo "    ❌ FAIL: Invalid frontmatter in $(basename $agent)"
        exit 1
    fi
done
echo "    ✓ Agent definitions"

# Test 6: Python utilities importable
echo "  Testing Python utilities..."
python3 -c "import yaml, json, argparse, tempfile, shutil" 2>/dev/null || {
    echo "    ❌ FAIL: Python dependencies missing"
    exit 1
}
echo "    ✓ Python dependencies"

# All tests passed
echo "✅ All smoke tests passed"

# Emit success event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "validation_pass" "All smoke tests passed" "validation" "smoke-tester"
fi

exit 0
```

**Key points:**
- `set -e` exits on first failure (fail-fast)
- Each test has clear pass/fail output
- Non-critical features (event logging) emit warnings, not failures
- Exit code 0 = success, 1 = failure
- Event emission for observability

### Pattern: Call Smoke Tests from Orchestrator

**When to use:** After self-modification, before marking pattern IMPLEMENTED

**Code example:**

```bash
# Context: /2l-improve after /2l-mvp completes (before status update)

echo "   Running post-modification smoke tests..."

if [ -f "$HOME/.claude/lib/2l-smoke-tests.sh" ]; then
    bash "$HOME/.claude/lib/2l-smoke-tests.sh"

    if [ $? -eq 0 ]; then
        echo "   ✅ Smoke tests passed - 2L framework healthy"
    else
        echo "   ❌ CRITICAL: Smoke tests failed"
        echo "      Self-modification may have broken 2L framework"
        echo "      Rollback recommended: git reset --hard $checkpoint_tag"
        exit 2
    fi
else
    echo "   ⚠️  WARNING: Smoke test script not found"
    echo "      Skipping validation (consider this risky)"
fi
```

**Key points:**
- Only runs if smoke test script exists
- Exit code determines success/failure
- Critical failure triggers rollback recommendation
- Missing script is warning, not error (graceful degradation)

---

## Import Order Convention

**Bash scripts:**

```bash
#!/usr/bin/env bash
# Script header comment

# 1. Set errexit/pipefail if needed
set -e

# 2. Source libraries
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    EVENT_LOGGING_ENABLED=true
else
    EVENT_LOGGING_ENABLED=false
fi

# 3. Define constants
readonly MAX_WAIT_TIME=300
readonly EXPLORATION_DIR=".2L/plan-9/exploration"

# 4. Define functions
function create_safety_checkpoint() {
    # ...
}

# 5. Main execution
echo "Starting orchestration..."
```

**Python scripts:**

```python
#!/usr/bin/env python3
"""Module docstring."""

# 1. Standard library imports
import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List

# 2. Third-party imports
import yaml

# 3. Local imports (if any)
# from lib.helpers import ...

# 4. Constants
VALID_STATUSES = ['IDENTIFIED', 'IMPLEMENTED', 'VERIFIED', 'REGRESSED']

# 5. Classes
class PatternLifecycleManager:
    """Class docstring."""
    pass

# 6. Functions
def main():
    """CLI entry point."""
    pass

# 7. Main execution guard
if __name__ == '__main__':
    main()
```

---

## Error Handling Standards

### Pattern: Bash Error Handling

**Code example:**

```bash
# Validation with clear error messages
function validate_exploration_complete() {
    local exploration_dir="$1"

    echo "   Validating exploration reports..."

    local missing_reports=0

    for explorer_id in 1 2 3; do
        local report="$exploration_dir/explorer-${explorer_id}-report.md"

        if [ ! -f "$report" ]; then
            echo "      ❌ Missing: explorer-${explorer_id}-report.md"
            missing_reports=$((missing_reports + 1))
        else
            # Check for placeholder text
            if grep -q "Placeholder" "$report"; then
                echo "      ⚠️  Warning: explorer-${explorer_id} contains placeholder text"
            fi

            echo "      ✓ Found: explorer-${explorer_id}-report.md"
        fi
    done

    if [ $missing_reports -gt 0 ]; then
        echo "   ❌ ERROR: Exploration incomplete ($missing_reports reports missing)"
        echo "      Cannot proceed to vision generation"
        return 1
    fi

    echo "   ✅ All exploration reports validated"
    return 0
}

# Usage with early exit
validate_exploration_complete "$exploration_dir" || exit 1
```

### Pattern: Python Error Handling

**Code example:**

```python
def update_status(self, pattern_id: str, new_status: str) -> Dict:
    """Update pattern status with comprehensive error handling."""
    try:
        # Load and validate
        data = self._load_learnings()
        pattern = self._find_pattern(data, pattern_id)

        if not pattern:
            raise ValueError(f"Pattern {pattern_id} not found in global learnings")

        # Validate transition
        current_status = pattern.get('status', 'IDENTIFIED')
        self._validate_transition(current_status, new_status)

        # Update
        pattern['status'] = new_status
        self._atomic_write_yaml(data)

        return pattern

    except FileNotFoundError as e:
        print(f"ERROR: Global learnings file not found: {e}", file=sys.stderr)
        sys.exit(1)

    except ValueError as e:
        print(f"ERROR: Validation failed: {e}", file=sys.stderr)
        sys.exit(1)

    except yaml.YAMLError as e:
        print(f"ERROR: YAML parsing failed: {e}", file=sys.stderr)
        print("  Tip: Check .2L/global-learnings.yaml.bak for backup", file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        print(f"ERROR: Unexpected error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
```

**Key points:**
- Specific exceptions caught before generic Exception
- Error messages include context and suggestions
- Exit codes: 0=success, 1=validation error, 2=safety abort
- Traceback printed for unexpected errors

---

## Performance Patterns

### Pattern: Efficient YAML Updates

**When to use:** Updating global-learnings.yaml frequently

**Code example:**

```python
# GOOD: Atomic write with minimal operations
def update_pattern_field(pattern_id: str, field: str, value):
    """Update single field atomically."""
    data = load_yaml()

    for pattern in data['patterns']:
        if pattern['pattern_id'] == pattern_id:
            pattern[field] = value
            break

    atomic_write_yaml(data)  # Single write operation

# BAD: Multiple writes
def update_pattern_fields_bad(pattern_id: str, updates: Dict):
    """Anti-pattern: Multiple writes."""
    for field, value in updates.items():
        update_pattern_field(pattern_id, field, value)  # Multiple writes!
```

### Pattern: JSONL Append Optimization

**When to use:** Appending to event or learning logs

**Code example:**

```python
# GOOD: Single file open, multiple appends
def append_multiple_events(events: List[Dict]):
    """Batch append events."""
    with open('.2L/events.jsonl', 'a') as f:
        for event in events:
            f.write(json.dumps(event) + '\n')

# GOOD: Fire-and-forget (never blocks)
def append_event_safe(event: Dict):
    """Append with error suppression."""
    try:
        with open('.2L/events.jsonl', 'a') as f:
            f.write(json.dumps(event) + '\n')
    except:
        pass  # Silent failure - don't block execution
```

---

## Code Quality Standards

**Standard: Type Hints (Python)**

```python
# GOOD: Full type annotations
def update_status(self, pattern_id: str, new_status: str,
                 metadata: Optional[Dict] = None) -> Dict:
    """Update pattern status."""
    pass

# BAD: No type hints
def update_status(self, pattern_id, new_status, metadata=None):
    """Update pattern status."""
    pass
```

**Standard: Docstrings (Python)**

```python
# GOOD: Comprehensive docstring
def update_status(self, pattern_id: str, new_status: str) -> Dict:
    """Update pattern status with validation.

    Args:
        pattern_id: Pattern identifier (e.g., 'PATTERN-001')
        new_status: Target status (IMPLEMENTED|VERIFIED|REGRESSED)

    Returns:
        Updated pattern dict

    Raises:
        ValueError: If pattern not found or invalid transition
    """
    pass
```

**Standard: Function Comments (Bash)**

```bash
# GOOD: Clear function documentation
# create_safety_checkpoint: Create git commit + tag before self-modification
# Args:
#   $1 - pattern_id: Pattern being implemented
# Returns:
#   Checkpoint tag name (e.g., "pre-PATTERN-001-1732680123")
function create_safety_checkpoint() {
    local pattern_id="$1"
    # ...
}
```

---

## Security Patterns

### Pattern: YAML Safe Loading

**Code example:**

```python
# GOOD: Safe load prevents code execution
import yaml
data = yaml.safe_load(f)

# BAD: Unsafe load allows arbitrary code execution
import yaml
data = yaml.load(f)  # NEVER USE THIS
```

### Pattern: JSON Escaping for Events

**Code example:**

```bash
# Event logger already handles this, but for reference:

# Escape double quotes in data
event_type="${event_type//\"/\\\"}"
data="${data//\"/\\\"}"

# Build JSON
json_event="{\"timestamp\":\"$timestamp\",\"data\":\"$data\"}"
```

### Pattern: Orchestrator Exclusion Validation

**Code example:**

```bash
# CRITICAL: Verify vision doesn't modify orchestrator
function verify_orchestrator_exclusion() {
    local vision_path="$1"

    echo "   Verifying orchestrator exclusion..."

    # Check for any reference to 2l-mvp
    if grep -qi "commands/2l-mvp" "$vision_path"; then
        echo "   ❌ CRITICAL: Vision references orchestrator (commands/2l-mvp.md)"
        echo "      Orchestrator exclusion policy violated"
        echo "      Aborting to prevent meta-circular corruption"
        return 2  # Fatal error code
    fi

    echo "   ✓ Orchestrator exclusion verified"
    return 0
}

# Usage
verify_orchestrator_exclusion "$vision_path" || exit 2
```

---

**Patterns Status:** COMPREHENSIVE
**Coverage:** All major operations for iteration 8
**Next:** builder-tasks.md - Task breakdown with patterns referenced
