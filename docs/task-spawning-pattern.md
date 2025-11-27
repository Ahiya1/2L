# Task Spawning Pattern Documentation

## Overview

This document describes the discovered pattern for spawning Task agents from bash command files in the 2L framework.

**Discovery Date:** 2025-11-27
**Context:** Builder-1, Iteration 8, implementing real exploration phase for `/2l-improve`

## Pattern Discovery

After researching the 2L codebase, I discovered that:

1. **Most command files are pure markdown** (e.g., `/2l-task.md`, `/2l-mvp.md`) - these are instructions to Claude Code
2. **Only `/2l-improve.md` has a bash shebang** - it's a hybrid bash/markdown file
3. **Claude Code interprets markdown command files** - when it encounters Task spawning syntax, it invokes the Task tool

## Task Spawning Syntax

### In Pure Markdown Commands (e.g., `/2l-task.md`)

```markdown
Use Task tool with subagent_type: "agent-name"

Prompt:
"Full prompt text here including all instructions, context, and output paths.

Multiple lines are supported.

Variables can be referenced if in execution context."
```

### In Bash Command Files (e.g., `/2l-improve.md`)

**Key Insight:** Even in bash command files, Task spawning uses markdown syntax (not bash function calls).

```bash
#!/usr/bin/env bash

# Regular bash code...
echo "Spawning agent..."

# Event logging (optional)
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Agent description" "phase" "agent-id"
fi

# Task spawning - MARKDOWN SYNTAX, not bash!
Use Task tool with subagent_type: "2l-explorer"

Prompt:
"Explorer 1: Architecture Analysis

Iteration: ${global_iter}
Context: ${exploration_dir}/context.md
Output: ${exploration_dir}/explorer-1-report.md

Focus Area: Architecture & Structure

Instructions:
- Analyze X
- Document Y
- Create report at specified path

Include sections:
- Section 1
- Section 2"

# Continue with bash code...
echo "Waiting for agent to complete..."
```

## Variable Substitution

**Bash variables CAN be used in prompts:**

```bash
# Define bash variables
pattern_id="PATTERN-001"
exploration_dir=".2L/plan-9/exploration"

# Use in prompt
Use Task tool with subagent_type: "2l-explorer"

Prompt:
"Analyze pattern: ${pattern_id}
Output to: ${exploration_dir}/report.md"
```

Claude Code substitutes bash variables when interpreting the prompt.

## Multiple Parallel Agents

To spawn multiple agents in parallel:

```bash
# Spawn Agent 1
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Agent-1" "phase" "agent-1"
fi

Use Task tool with subagent_type: "2l-explorer"
Prompt:
"Agent 1 instructions..."

# Spawn Agent 2
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Agent-2" "phase" "agent-2"
fi

Use Task tool with subagent_type: "2l-explorer"
Prompt:
"Agent 2 instructions..."

# Spawn Agent 3
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Agent-3" "phase" "agent-3"
fi

Use Task tool with subagent_type: "2l-explorer"
Prompt:
"Agent 3 instructions..."

# Wait for all to complete
echo "Waiting for agents..."
max_wait=300
elapsed=0
all_complete=false

while [ $elapsed -lt $max_wait ]; do
    if [ -f "report1.md" ] && [ -f "report2.md" ] && [ -f "report3.md" ]; then
        all_complete=true
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
done

if [ "$all_complete" = false ]; then
    echo "ERROR: Timeout waiting for agents"
    exit 1
fi

echo "All agents completed in ${elapsed}s"
```

## Synchronization Pattern

**Important:** Task tool spawning is asynchronous. You must:

1. Spawn all agents
2. Implement polling loop to check for output files
3. Use timeout to prevent infinite waiting
4. Handle missing reports gracefully

### Example Synchronization

```bash
# After spawning N agents...

max_wait=300  # 5 minutes
elapsed=0
all_complete=false

while [ $elapsed -lt $max_wait ]; do
    # Check if all expected output files exist
    if [ -f "$output1" ] && [ -f "$output2" ] && [ -f "$output3" ]; then
        all_complete=true
        break
    fi

    sleep 5  # Check every 5 seconds
    elapsed=$((elapsed + 5))
done

# Handle timeout
if [ "$all_complete" = false ]; then
    echo "ERROR: Agent timeout after ${max_wait}s"

    # Show which agents failed
    [ ! -f "$output1" ] && echo "Missing: Agent 1"
    [ ! -f "$output2" ] && echo "Missing: Agent 2"
    [ ! -f "$output3" ] && echo "Missing: Agent 3"

    exit 1
fi

echo "All agents completed (${elapsed}s)"
```

## Validation Pattern

After agents complete, validate report quality:

```bash
for i in 1 2 3; do
    report="explorer-${i}-report.md"

    # Check for placeholder text
    if grep -q "Placeholder" "$report"; then
        echo "WARNING: $report contains placeholder text"
    fi

    # Check minimum length
    line_count=$(wc -l < "$report")
    if [ $line_count -lt 50 ]; then
        echo "WARNING: $report seems short (${line_count} lines)"
    fi
done
```

## Agent Types in 2L Framework

Standard agent types (defined in `agents/*.md`):

- `2l-explorer` - Reconnaissance and analysis
- `2l-planner` - Planning and task breakdown
- `2l-builder` - Feature implementation
- `2l-integrator` - Integration and merging
- `2l-validator` - Testing and validation
- `2l-healer` - Issue resolution
- `2l-master-explorer` - High-level strategic analysis
- `2l-orchestrator` - (Not typically spawned, directly executed)

## Complete Example: /2l-improve Exploration Phase

See `/home/ahiya/Ahiya/2L/commands/2l-improve.md` lines 357-523 for the complete working implementation:

1. Creates context file with pattern details
2. Spawns 3 explorers in parallel with detailed prompts
3. Emits agent_spawn events for each
4. Implements 5-minute timeout with polling loop
5. Validates reports after completion
6. Emits exploration_complete event

## Key Learnings

1. **Markdown syntax works in bash files**: Even though `/2l-improve.md` has a bash shebang, Claude Code interprets the markdown Task spawning syntax
2. **No bash function**: There is no `spawn_task()` bash function - it's a markdown directive
3. **Parallel by default**: Multiple Task spawning directives execute in parallel
4. **Manual synchronization required**: Must implement polling to wait for completion
5. **Event logging optional**: Always wrap in `if [ "$EVENT_LOGGING_ENABLED" = true ]`
6. **Agents are autonomous**: Once spawned, agents complete their work independently

## Future Considerations

- Consider creating a helper script if this pattern needs to be reused across many commands
- Could add retry logic for failed agents
- May want agent status tracking beyond file existence
- Consider structured agent output format for easier validation

## References

- `/2l-improve.md` (lines 357-523) - Working implementation
- `/2l-task.md` - Pure markdown Task spawning examples
- `/2l-mvp.md` - Pseudocode placeholders (not yet implemented)
- `agents/*.md` - Agent definitions

---

**Pattern Status:** VALIDATED and WORKING
**Last Updated:** 2025-11-27
**Author:** Builder-1, Iteration 8
