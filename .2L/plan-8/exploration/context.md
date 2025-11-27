# 2L System Exploration Context

**Purpose:** Self-improvement exploration - analyze 2L's own codebase

**Selected Pattern:** PATTERN-001 - Missing system exploration before vision generation
**Root Cause:** /2l-improve generates visions from patterns without analyzing the target codebase (meditation space). Visions lack architectural context about where improvements should be applied.
**Proposed Solution:** Add exploration phase (Step 2.5) that spawns 2-3 explorers to analyze 2L's own codebase before generating vision. Explorers should document: (1) agent architecture, (2) tech patterns, (3) pattern-specific integration points.

## Exploration Goals

Analyze the meditation space (2L's own codebase) to understand:

1. **Current Architecture** - How agents, commands, and orchestration work
2. **Technology Patterns** - Bash/Python/YAML patterns used throughout
3. **Integration Points** - Where improvements should be applied

## Target Codebase

- **Location:** ~/Ahiya/2L (meditation space)
- **Key Directories:**
  - agents/ - Agent prompts (2l-builder, 2l-planner, 2l-integrator, etc.)
  - commands/ - Slash commands (2l-mvp, 2l-improve, etc.)
  - lib/ - Python and bash utilities
  - templates/ - Vision and prompt templates

## Focus Areas by Explorer

### Explorer 1: 2L Architecture & Agent Flow
- How does /2l-mvp orchestrate agents?
- What are agent responsibilities and interfaces?
- How do agents communicate (reports, events)?
- Document orchestration patterns

### Explorer 2: Tech Stack & Patterns
- Bash patterns in commands/
- Python patterns in lib/
- YAML structure in .2L/
- Event logging and observability
- Report generation patterns

### Explorer 3: Related to Pattern PATTERN-001
- Where in the codebase does this pattern's root cause live?
- Which agents/commands are affected?
- What files need modification?
- Provide specific integration guidance

## Output Format

Standard explorer reports at:
- .2L/plan-8/exploration/explorer-1-report.md
- .2L/plan-8/exploration/explorer-2-report.md
- .2L/plan-8/exploration/explorer-3-report.md

