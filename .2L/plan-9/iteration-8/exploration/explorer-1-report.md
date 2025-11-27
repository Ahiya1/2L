# Explorer 1 Report: Architecture & Structure for /2l-improve Exploration Phase

## Executive Summary

The `/2l-improve` command (lines 358-410) currently creates placeholder exploration reports instead of spawning real Task agents to analyze the meditation space codebase. This analysis reveals that implementing real exploration requires understanding: (1) how Task tool spawning works in the 2L orchestrator, (2) the existing agent architecture and communication patterns, (3) safety mechanisms for meta-circular modification, and (4) integration points between `/2l-improve` and existing utilities. The architecture is well-suited for this enhancement - the pattern is established in `/2l-mvp`, event logging infrastructure exists, and safety checkpoints are already in place.

## Discoveries

### Current /2l-improve Implementation Architecture

**File:** `commands/2l-improve.md` (bash script, 922 lines)

**Orchestration Flow:**
1. **Pattern Detection** (lines 102-174): Calls `lib/2l-pattern-detector.py` to find recurring patterns
2. **Pattern Selection** (lines 176-265): Auto-selects top pattern by impact score  
3. **Exploration Phase** (lines 279-421): **PLACEHOLDER MODE** - creates dummy reports
4. **Vision Generation** (lines 423-471): Calls `lib/2l-vision-generator.py` with pattern data
5. **Confirmation** (lines 500-645): Safety checks and user confirmation
6. **Self-Modification** (lines 647-913): Invokes `/2l-mvp` in meditation space

**Critical Gap at Lines 358-410:**
- Creates static placeholder files instead of spawning 3 Task agents
- Placeholder reports document the need but don't provide analysis
- Vision generation proceeds without architectural context

### Agent Architecture in 2L

**Agent Definitions Location:** `agents/*.md` (10 agent files)

**Agent Frontmatter Format:**
```yaml
---
name: 2l-explorer
description: Analyzes codebase architecture, patterns, and complexity for planning
tools: Read, Glob, Grep, Bash
---
```

**Agent Communication Patterns:**
1. **Input:** Agents receive instructions via Task tool prompt
2. **Output:** Agents write markdown reports to `.2L/plan-N/iteration-M/phase/agent-N-report.md`
3. **Events:** Agents emit `agent_start` and `agent_complete` events via `lib/2l-event-logger.sh`
4. **Context Passing:** Orchestrator creates context files (e.g., `context.md`) for agents to read

**Key Agent: 2l-explorer**
- Focus Areas: Architecture (Explorer-1), Tech Patterns (Explorer-2), Complexity (Explorer-3)
- Report Structure: Executive Summary → Discoveries → Patterns → Complexity → Recommendations
- Event Emission: Required at start and completion
- Tools: Read, Glob, Grep, Bash

### Task Tool Spawning Pattern

**Pattern from /2l-mvp (lines 515-530):**
```python
spawn_task(
    type="2l-master-explorer",
    prompt=f"You are Master Explorer {explorer_id}.

Focus Area: {FOCUS_AREA}
Plan: {plan_id}
Vision: {PLAN_DIR}/vision.md
Output: {MASTER_EXPLORATION}/master-explorer-{explorer_id}-report.md

Analyze the vision document and create a comprehensive exploration report.
Create your report at: {MASTER_EXPLORATION}/master-explorer-{explorer_id}-report.md"
)
```

**Key Characteristics:**
- `spawn_task()` spawns agents using pseudocode representation
- `type` parameter maps to agent frontmatter `name` field
- `prompt` provides agent-specific instructions
- Task tool handles waiting for agent completion
- Agents run in parallel when spawned consecutively

**Event Logging Pattern:**
```bash
# Before spawn
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "agent_spawn" "Explorer-1: Architecture" "exploration" "explorer-1"
fi

# Spawn
spawn_task(...)

# Agents emit their own agent_complete events
```

### Event Logging Infrastructure

**File:** `lib/2l-event-logger.sh` (52 lines)

**Function Signature:**
```bash
log_2l_event "event_type" "data" "phase" "agent_id"
```

**Usage Pattern:**
1. Source at script start: `. "$HOME/.claude/lib/2l-event-logger.sh"`
2. Set flag: `EVENT_LOGGING_ENABLED=true`
3. Emit conditionally: `if [ "$EVENT_LOGGING_ENABLED" = true ]; then log_2l_event ...; fi`
4. Graceful degradation: Library may not exist, script continues

**Event Types for Exploration:**
- `exploration_start` - Beginning of exploration phase
- `agent_spawn` - Per-agent spawn notification (× 3 for explorers)
- `agent_complete` - Per-agent completion (emitted by agents themselves)
- `exploration_complete` - End of exploration phase

**Output:** Events append to `.2L/events.jsonl` in JSON Lines format

### Safety Mechanisms in /2l-improve

**Existing Safety Functions (lines 654-745):**

1. **`verify_orchestrator_exclusion()`** - Blocks modifications to `commands/2l-mvp.md`
2. **`verify_git_clean()`** - Checks for uncommitted changes  
3. **`verify_symlinks()`** - Validates symlink integrity
4. **`create_safety_checkpoint()`** - Creates git commit before self-modification

**Execution Flow:**
```bash
verify_orchestrator_exclusion "$vision_path" || exit 2  # Fail fast
verify_git_clean || exit 1
verify_symlinks || exit 1
checkpoint_tag=$(create_safety_checkpoint "$selected_pattern_id")
# Then invoke /2l-mvp
```

### Integration Points Between Components

**Pattern Detection → Exploration:**
- Pattern details passed via `context.md` file
- Data: `selected_pattern_id`, `pattern_name`, `root_cause`, `proposed_solution`

**Exploration → Vision Generation:**
- Vision generator must read exploration reports (currently doesn't)
- Reports provide architectural context, affected components, integration guidance

**Vision → /2l-mvp:**
- Vision path passed to orchestrator for implementation

## Patterns Identified

### Pattern 1: Task Tool Spawning

**Description:** Standard pattern for spawning agents in 2L architecture

**Use Case:** Any command that needs to delegate work to specialized agents

**Example from /2l-mvp:**
```python
spawn_task(
    type="2l-explorer",
    prompt=f"Explorer 1: Architecture & Structure

Iteration: {global_iter}
Requirements: {ITER_DIR}/../vision.md
Output: {exploration_dir}/explorer-1-report.md

Analyze:
- Application architecture
- Main components and relationships

Create report at: {exploration_dir}/explorer-1-report.md"
)
```

**Recommendation:** Apply this pattern directly in `/2l-improve` lines 358-410

### Pattern 2: Context File Creation

**Description:** Create context files that agents read for domain-specific information

**Use Case:** Providing agents with focused instructions beyond the prompt

**Current Implementation:** Lines 289-344 create `context.md` with pattern details

**Recommendation:** Keep existing context.md creation - it provides pattern-specific guidance

### Pattern 3: Event-Driven Orchestration  

**Description:** Emit events at phase boundaries and agent lifecycle points

**Recommendation:** Add 5 event emissions:
1. `exploration_start` (before spawning)
2. `agent_spawn` × 3 (one per explorer)
3. `exploration_complete` (after all reports exist)

### Pattern 4: Graceful Degradation

**Description:** All optional features (events, utilities) fail silently

**Current Implementation:** Lines 17-22 implement this for event logging

**Recommendation:** Maintain this pattern for all new event emissions

## Complexity Assessment

### High Complexity Areas

**Task Tool Integration (lines 358-410 replacement)**
- Why Complex: Requires understanding spawn_task() implementation
- Builder Effort: Medium - straightforward pattern copy from `/2l-mvp`
- Split Needed: No - single builder can implement
- Dependencies: Must understand agent prompt format

**Vision Generator Enhancement (lib/2l-vision-generator.py)**
- Why Complex: Must read 3 exploration reports and incorporate findings
- Builder Effort: Medium - add file reading + template variable substitution  
- Split Needed: No - isolated Python script modification
- Dependencies: Exploration reports must exist first

### Medium Complexity Areas

**Event Logging Integration**
- Complexity: Straightforward pattern application (5 new events)
- Builder Effort: Low - copy existing event emission patterns

**Report Validation**
- Complexity: Add validation between exploration and vision generation
- Builder Effort: Low - simple file existence checks

### Low Complexity Areas

**Safety Mechanisms**
- Implementation: Already complete (lines 654-745)
- Changes Needed: None - existing checks are sufficient

**Pattern Lifecycle Updates**
- Implementation: Already complete (lines 847-866)
- Changes Needed: None for exploration phase

## Technology Recommendations

### Primary Stack (Already Established)

- **Orchestration:** Bash - `/2l-improve` is already bash, maintain consistency
- **Agent Spawning:** Task tool - Standard pattern in `/2l-mvp`, proven reliable
- **Event Logging:** JSONL - Existing infrastructure (`lib/2l-event-logger.sh`)
- **Configuration:** YAML - `global-learnings.yaml` uses YAML, human-readable
- **Utilities:** Python 3 - Pattern detection, vision generation already Python

### Supporting Libraries

- **PyYAML:** Pattern and vision file manipulation
- **Git:** Safety checkpoints, rollback capability
- **Bash builtins:** File operations, temp file creation

### Key Implementation Pattern

**Task Tool Spawning:**
```bash
# Emit spawn event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Explorer-1: 2L Architecture" "exploration" "explorer-1"
fi

# Spawn using Task tool
spawn_task(
    type="2l-explorer",
    prompt="Explorer 1: Architecture & Structure

Iteration: 8
Requirements: .2L/${next_plan_id}/exploration/context.md
Output: $exploration_dir/explorer-1-report.md

Focus Area: 2L Architecture & Agent Flow

Analyze:
- How does /2l-mvp orchestrate agents?
- Agent responsibilities and interfaces
- Agent communication (reports, events)

Working Directory: ~/Ahiya/2L (meditation space)
Create report at: $exploration_dir/explorer-1-report.md"
)
```

## Integration Points

### Internal Integrations

**Pattern Detection → Exploration:**
- Connection: Pattern details passed via `context.md`
- Data Flow: Pattern metadata → context file → explorer prompts
- File: `exploration_dir/context.md` (created lines 289-344)

**Exploration → Vision Generation:**
- Connection: Vision generator reads exploration reports
- Data Flow: Explorer reports → vision generator → enhanced vision
- Required Change: Vision generator must read reports

**Vision → /2l-mvp:**
- Connection: Vision path passed to orchestrator
- Data Flow: Vision markdown → plan creation → implementation

### External Integrations

**Event Logger:** `lib/2l-event-logger.sh`
- Function: `log_2l_event(event_type, data, phase, agent_id)`
- Integration: Sourced at line 19, used conditionally
- New Events: 5 exploration-related events

**Vision Generator:** `lib/2l-vision-generator.py`  
- Integration: Called at line 450
- Enhancement Needed: Add `--exploration-dir` parameter

**YAML Helpers:** `lib/2l-yaml-helpers.py`
- Integration: Called at line 847 for status updates
- Function: `update_pattern_status(pattern_id, "IMPLEMENTED", metadata)`

## Risks & Challenges

### Technical Risks

**Risk 1: Task Tool API Mismatch**
- Impact: HIGH - Explorers won't spawn if API doesn't match pseudocode
- Mitigation: Study actual `/2l-mvp` implementation, test in isolation
- Detection: Explorers fail to spawn, reports not created
- Fallback: Keep placeholder mode as emergency fallback

**Risk 2: Meditation Space Modification Safety**  
- Impact: CRITICAL - Self-modification could corrupt 2L framework
- Mitigation: Existing safety checks already robust
- Additional Safety: Verify symlinks before AND after `/2l-mvp`
- Rollback: Safety checkpoint enables `git reset --hard`

**Risk 3: Vision Generator Doesn't Use Reports**
- Impact: MEDIUM - Visions remain pattern-only
- Mitigation: Builder must enhance `lib/2l-vision-generator.py`
- Detection: Generated vision lacks "Architectural Context" section

### Complexity Risks

**Risk 1: Builder Confusion on spawn_task() Syntax**
- Likelihood: MEDIUM - Pseudocode may differ from actual API
- Mitigation: Provide clear example in builder task
- Builder Split: No - single builder handles exploration spawning

**Risk 2: Missing Reports Break Vision Generation**
- Likelihood: LOW - Can add report existence check
- Mitigation: Validate reports exist before vision generation
- Code Location: Between line 421 and 450

## Recommendations for Planner

### 1. Builder Task Breakdown (2 Builders Recommended)

**Builder-1: Real Exploration Phase**
- File: `commands/2l-improve.md` (lines 358-410)
- Task: Replace placeholder creation with 3 Task tool spawn calls
- Complexity: MEDIUM
- Acceptance Criteria:
  - spawn_task() calls for explorers 1, 2, 3
  - Event emissions: exploration_start, agent_spawn × 3, exploration_complete
  - Report validation after exploration
  - Placeholder code removed

**Builder-2: Vision Generator Enhancement + Template**
- Files: `lib/2l-vision-generator.py`, `templates/improvement-vision.md`
- Task: Read exploration reports and incorporate into vision
- Complexity: MEDIUM
- Acceptance Criteria:
  - Add `--exploration-dir` CLI parameter
  - Read explorer-{1,2,3}-report.md files
  - Extract and incorporate key findings
  - Update template with new sections

### 2. Safety-First Approach

- DO NOT modify `commands/2l-mvp.md` - orchestrator exclusion enforced
- Git checkpoints already in place (line 783)
- Test exploration spawning in isolation first
- Document rollback procedure

### 3. Event Logging as Optional Enhancement

- Priority: SHOULD-HAVE (not MUST-HAVE)
- Rationale: Enables dashboard but not critical for functionality
- Implementation: Use existing graceful degradation pattern

### 4. Report Validation Between Phases

Add validation between exploration and vision generation:
```bash
# After line 421, before vision at line 424
for explorer_id in 1 2 3; do
    if [ ! -f "$exploration_dir/explorer-${explorer_id}-report.md" ]; then
        echo "ERROR: Missing explorer-${explorer_id}-report.md"
        exit 1
    fi
done
```

### 5. Meditation Space Validation

Add validation before exploration spawning:
```bash
# Before line 358
if [ "$PWD" != "$HOME/Ahiya/2L" ]; then
    echo "ERROR: Must run from meditation space"
    exit 1
fi

for required_dir in agents commands lib; do
    if [ ! -d "$required_dir" ]; then
        echo "ERROR: Missing directory: $required_dir"
        exit 1
    fi
done
```

## Resource Map

### Critical Files for Modification

**Primary Target:**
- `commands/2l-improve.md` (lines 358-410): Replace placeholder exploration

**Secondary Targets:**
- `lib/2l-vision-generator.py`: Add exploration report reading
- `templates/improvement-vision.md`: Add exploration context sections

**Reference Files (Read-Only):**
- `commands/2l-mvp.md` (lines 770-850): spawn_task() examples
- `agents/2l-explorer.md`: Explorer expectations
- `lib/2l-event-logger.sh`: Event emission API

### Key Directories

**Meditation Space:**
- `~/Ahiya/2L/` - Working directory for self-improvement
- `.2L/plan-N/exploration/` - Explorer reports output
- `agents/` - Agent definitions (explorers analyze this)
- `commands/` - Commands (explorers analyze this)
- `lib/` - Utilities (explorers analyze this)

**Configuration:**
- `.2L/global-learnings.yaml` - Pattern database
- `.2L/events.jsonl` - Event log for dashboard

### Key Dependencies

**Python Libraries:**
- PyYAML - Pattern and vision file manipulation
- json - Pattern data exchange (stdlib)
- argparse - CLI parsing (stdlib)

**Bash Utilities:**
- git - Safety checkpoints and rollback
- mkdir -p - Directory creation
- cat - File content generation

**2L Utilities:**
- `lib/2l-event-logger.sh` - Event emission
- `lib/2l-pattern-detector.py` - Pattern detection
- `lib/2l-vision-generator.py` - Vision generation (to enhance)
- `lib/2l-yaml-helpers.py` - YAML manipulation

### Testing Infrastructure

**Unit Testing:**
- Test vision generator with sample exploration reports
- Validate event logging doesn't block on failure

**Integration Testing:**
- Run `/2l-improve --dry-run` to verify flow
- Test exploration phase in isolation  
- Full end-to-end test with PATTERN-001

**Safety Testing:**
- Verify orchestrator exclusion works
- Test git checkpoint and rollback
- Validate symlink integrity

## Questions for Planner

### 1. Should Explorer-3 Focus Be Dynamic?

**Question:** Should Explorer-3's focus area be customized per pattern?

**Options:**
- A) Generic focus (complexity & integration) - same for all patterns
- B) Dynamic focus based on pattern root cause keywords
- C) Pattern-specific prompt generated by `/2l-improve`

**Recommendation:** Option C - generate pattern-specific Explorer-3 prompt

**Example:**
```bash
# For PATTERN-001
explorer_3_focus="Analyze how /2l-improve should spawn explorers. Study /2l-mvp orchestration patterns. Identify exact code changes needed in /2l-improve lines 358-410."
```

### 2. What If Exploration Reports Are Low Quality?

**Question:** How should low-quality explorer reports be handled?

**Options:**
- A) Report quality validation after generation  
- B) Retry with enhanced prompts if reports too short
- C) Accept any report (trust agent quality)
- D) Human review before vision generation

**Recommendation:** Option C for MVP, Option A for post-MVP

### 3. Should Vision Generation Be Mandatory After Exploration?

**Question:** Should exploration findings be able to block vision creation?

**Scenarios:**
- Exploration reveals pattern cannot be auto-fixed
- Exploration identifies different root cause
- Exploration recommends NOT implementing

**Recommendation:** Always generate vision for MVP, add concerns section post-MVP

### 4. How Should Parallel Explorer Spawning Work?

**Question:** Sequential or parallel spawning?

**Options:**
- A) Sequential spawning (spawn → wait → spawn)
- B) Parallel spawning (spawn × 3, wait for all)
- C) Spawn 1 & 2 in parallel, then 3

**Recommendation:** Option B - parallel (same as `/2l-mvp`)

```bash
spawn_task(...explorer-1...)
spawn_task(...explorer-2...)
spawn_task(...explorer-3...)
echo "Waiting for 3 explorers..."
# Task tool waits for all
```

### 5. Should Meditation Space Be Validated Before Exploration?

**Question:** Should `/2l-improve` validate working directory?

**Checks:**
- Verify `pwd == ~/Ahiya/2L`
- Verify agents/ directory exists
- Verify commands/ directory exists

**Recommendation:** YES - add validation before exploration spawning

---

## Appendix: Complete Implementation Pseudocode

**Replacement for lines 358-410:**

```bash
# Validate meditation space
if [ "$PWD" != "$HOME/Ahiya/2L" ]; then
    echo "ERROR: /2l-improve must run from meditation space"
    exit 1
fi

# Emit exploration start
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "exploration_start"                  "Starting system exploration for ${selected_pattern_id}"                  "exploration"                  "2l-improve"
fi

# Spawn Explorer-1
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Explorer-1: 2L Architecture" "exploration" "explorer-1"
fi

spawn_task(
    type="2l-explorer",
    prompt="Explorer 1: Architecture & Structure

Iteration: 8
Requirements: $exploration_context
Output: $exploration_dir/explorer-1-report.md

Focus Area: 2L Architecture & Agent Flow

Analyze:
- /2l-mvp orchestration patterns
- Agent responsibilities (agents/*.md)
- Communication patterns (reports, events)

Working Directory: ~/Ahiya/2L
Create report at: $exploration_dir/explorer-1-report.md"
)

# Spawn Explorer-2
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Explorer-2: Tech Patterns" "exploration" "explorer-2"
fi

spawn_task(
    type="2l-explorer",
    prompt="Explorer 2: Technology Patterns & Dependencies

Iteration: 8
Requirements: $exploration_context
Output: $exploration_dir/explorer-2-report.md

Focus Area: Tech Stack & Patterns

Analyze:
- Bash patterns (commands/*.md)
- Python utilities (lib/*.py)
- YAML structures (.2L/)
- Event logging patterns

Working Directory: ~/Ahiya/2L
Create report at: $exploration_dir/explorer-2-report.md"
)

# Spawn Explorer-3
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" "Explorer-3: Pattern Analysis" "exploration" "explorer-3"
fi

spawn_task(
    type="2l-explorer",
    prompt="Explorer 3: Pattern-Specific Analysis

Iteration: 8
Requirements: $exploration_context
Output: $exploration_dir/explorer-3-report.md

Focus Area: ${selected_pattern_id} - ${pattern_name}

Analyze:
- Root cause location in codebase
- Affected files/functions (exact paths)
- Integration guidance for builders

Root Cause: ${root_cause}
Proposed Solution: ${proposed_solution}

Working Directory: ~/Ahiya/2L
Create report at: $exploration_dir/explorer-3-report.md"
)

echo "   Waiting for 3 explorers to complete..."

# Validate all reports exist
missing_reports=0
for explorer_id in 1 2 3; do
    if [ ! -f "$exploration_dir/explorer-${explorer_id}-report.md" ]; then
        echo "   ❌ Missing: explorer-${explorer_id}-report.md"
        missing_reports=$((missing_reports + 1))
    else
        echo "   ✅ Found: explorer-${explorer_id}-report.md"
    fi
done

if [ $missing_reports -gt 0 ]; then
    echo "ERROR: Exploration incomplete ($missing_reports reports missing)"
    exit 1
fi

echo "   ✅ All exploration reports validated"

# Emit exploration complete
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "exploration_complete"                  "System exploration complete (3 reports generated)"                  "exploration"                  "2l-improve"
fi
```

---

**End of Explorer 1 Report**
