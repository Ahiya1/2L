# Explorer 1 Report: Command Structure Analysis

## Executive Summary

The `/2l-mvp` command implements a sophisticated three-level access system with comprehensive state management. The command acts as the orchestrator itself (not spawning a separate orchestrator). Key mechanisms include: argument-based level detection, config.yaml state persistence, status-driven flow control, and structured context passing to agents via spawn_task prompts. For `/2l-prod`, the same patterns should be adopted with additional production-specific validation hooks.

---

## Command Argument Handling

### Level Detection Logic

The command uses argument presence to determine access level:

```python
if arguments_provided:
    # LEVEL 1: Full Autonomy - inline requirements string
    LEVEL = 1
    inline_requirements = arguments
    # Creates new plan directory
    # Auto-generates vision.md from inline requirements
else:
    # LEVEL 2 or 3 - determined by existing state
    # Read config.yaml to determine current plan state
```

### Argument Parsing Pattern

**Level 1 (Full Autonomy):**
```bash
/2l-mvp "Build a todo app with user auth and categories"
```
- The entire quoted string becomes `inline_requirements`
- No parsing of sub-arguments
- Single string captures full user intent

**Levels 2 & 3 (No arguments):**
```bash
/2l-mvp
```
- Command reads `.2L/config.yaml` to determine current plan
- Status field determines whether VISIONED (Level 2) or PLANNED (Level 3)

### Key Files Referenced

| File | Purpose |
|------|---------|
| `/home/ahiya/Ahiya/2L/commands/2l-mvp.md` | Full command protocol (~1940 lines) |
| `/home/ahiya/Ahiya/2L/.2L/config.yaml` | State persistence |

---

## Three-Level Access Logic

### Level 1: Full Autonomy

**Condition:** Invoked with inline requirements string  
**Entry point:** `if arguments_provided`

**Flow:**
1. Create new `plan-{N}` directory (N = next available number)
2. Auto-generate `vision.md` from inline requirements
3. Set MODE = 'MASTER'
4. Enter master exploration (spawn 2-4 explorers based on complexity)
5. Auto-create `master-plan.yaml`
6. Execute all iterations

**Config Update Pattern:**
```yaml
current_plan: plan-{N}
plans:
  - plan_id: plan-{N}
    status: VISIONED
    created_at: {timestamp}
    vision_file: .2L/plan-{N}/vision.md
```

### Level 2: Vision Control

**Condition:** `plan_status == 'VISIONED' and not has_master_plan`

**Detection Logic:**
```python
has_vision = file_exists(f"{plan_dir}/vision.md")
has_master_plan = file_exists(f"{plan_dir}/master-plan.yaml")

if plan_status == 'VISIONED' and not has_master_plan:
    LEVEL = 2
    MODE = 'MASTER'  # Will auto-create master plan
```

**Flow:**
1. Use existing `vision.md`
2. Spawn master explorers
3. Auto-create `master-plan.yaml` based on exploration
4. Execute all iterations

### Level 3: Full Control

**Condition:** `plan_status == 'PLANNED' and has_master_plan`

**Detection Logic:**
```python
if plan_status == 'PLANNED' and has_master_plan:
    LEVEL = 3
    MODE = 'ITERATION_EXECUTOR'
```

**Flow:**
1. Use existing `vision.md` and `master-plan.yaml`
2. Skip master exploration entirely
3. Execute iterations according to master plan

### Resume Handling (IN_PROGRESS)

**Condition:** `plan_status == 'IN_PROGRESS'`

**Flow:**
1. Read `current_phase` from config.yaml
2. Set MODE = 'ITERATION_EXECUTOR'
3. Resume from detected phase

---

## Config Updates

### Config File Location
`/home/ahiya/Ahiya/2L/.2L/config.yaml`

### Current Config Structure (Plan-12)

```yaml
current_plan: plan-12
global_iteration_counter: 12
current_iteration: 12
current_phase: exploration

plans:
- plan_id: plan-12
  name: 2L Production Hardening
  status: PLANNED
  created_at: '2025-12-10T09:00:00Z'
  vision_file: .2L/plan-12/vision.md
  master_plan_file: .2L/plan-12/master-plan.yaml
  description: 'Create /2l-prod command...'
  master_exploration:
    num_explorers: 3
    complexity_level: MEDIUM
  iterations:
    - 12
```

### Fields Updated During Execution

| Field | When Updated | Purpose |
|-------|--------------|---------|
| `current_plan` | Plan creation | Track active plan |
| `global_iteration_counter` | Iteration start | Global iteration ID |
| `current_iteration` | Iteration start | Current iteration number |
| `current_phase` | Phase transitions | Enable resume from any point |
| `plans[].status` | State changes | VISIONED -> PLANNED -> IN_PROGRESS -> COMPLETE |
| `plans[].master_exploration` | Complexity decision | Store explorer count and complexity level |
| `plans[].github_repo` | GitHub setup | Repository URL |

### Config Update Functions (Pseudocode)

```python
def update_config_plan_status(plan_id, status):
    # Updates: plans[plan_id].status = status

def update_config_current_phase(phase):
    # Updates: current_phase = phase

def update_config_current_iteration(iter_num):
    # Updates: current_iteration = iter_num

def update_config_iteration_commit(iter, hash, tag):
    # Updates: plans[plan_id].iterations[iter].commit = hash
    #          plans[plan_id].iterations[iter].tag = tag
```

---

## Agent Context Propagation

### The spawn_task Pattern

Agents receive context through structured prompts passed to the Task tool:

```python
spawn_task(
    type="2l-builder",
    prompt=f"""Build assigned feature.

Iteration: {global_iter}
Your ID: Builder-{builder_id}
Plan: {plan_dir}
Output: {building_dir}/builder-{builder_id}-report.md

Read your task from: {plan_dir}/builder-tasks.md
Follow patterns from: {plan_dir}/patterns.md

You can COMPLETE or SPLIT if too complex.

Create report at: {building_dir}/builder-{builder_id}-report.md"""
)
```

### Context Components

1. **Identity Context:**
   - Agent type (via `type` parameter)
   - Agent ID (Builder-1, Explorer-2, etc.)

2. **Location Context:**
   - Iteration number
   - Plan directory path
   - Output location (where to write report)

3. **Input Context:**
   - Which files to read for task assignment
   - Where to find patterns/conventions

4. **Behavioral Context:**
   - Allowed actions (COMPLETE/SPLIT for builders)
   - Phase (exploration, building, validation)

### Context Propagation Patterns by Agent Type

| Agent | Key Context Elements |
|-------|---------------------|
| **Master Explorer** | Plan ID, Vision file, Output path, Focus area |
| **Explorer** | Iteration number, Requirements path, Focus area |
| **Planner** | Iteration, Requirements path, Exploration dir, Output dir |
| **Builder** | Iteration, Builder ID, Plan dir, Output path, COMPLETE/SPLIT options |
| **Integrator** | Iteration, Round, Zones assigned, Integration plan path |
| **Validator** | Iteration, Integration dir, Plan dir |
| **Healer** | Iteration, Attempt number, Category, Validation report |

### Event Emission in Agents

Agents emit their own events using:

```bash
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  log_2l_event "agent_start" "Builder-1: Starting feature implementation" "building" "builder-1"
fi
```

Event parameters:
- `event_type`: agent_start, agent_complete
- `data`: Description string
- `phase`: Current phase name
- `agent_id`: Unique agent identifier

---

## Recommendations for /2l-prod

### 1. Argument Handling

Adopt the same three-level pattern:

```python
# Level 1: Full Autonomy with production mode
/2l-prod "Build todo app with auth" --test-requirements "80% coverage, E2E"

# Level 2: Vision Control + Production
/2l-prod  # Uses existing vision, adds production validation

# Level 3: Full Control + Production
/2l-prod  # Uses existing vision + master-plan, adds production validation
```

**Recommended Extensions:**
- Add `--test-requirements` flag for inline test specs
- Add `--ci-provider` flag (github-actions, gitlab-ci, etc.)
- Add `--security-scan` flag for security requirements

### 2. Status Extension

Add production-specific statuses in config.yaml:

```yaml
plans:
- plan_id: plan-X
  status: PROD_VALIDATED  # New status after production checks pass
  prod_status:
    test_coverage: 85%
    security_scan: PASS
    ci_pipeline: generated
```

### 3. Config Updates

New fields for `/2l-prod`:

```yaml
plans[].prod_config:
  test_requirements:
    coverage_threshold: 80
    e2e_required: true
    performance_baseline: true
  ci_provider: github-actions
  security_scan_level: standard
  deployment_target: vercel
```

### 4. Agent Context Extensions

For production builders, add to spawn_task prompt:

```python
spawn_task(
    type="2l-prod-builder",  # New agent type or same builder with mode
    prompt=f"""Build assigned feature with production requirements.

Iteration: {global_iter}
Your ID: Builder-{builder_id}
Mode: PRODUCTION

# Standard context...
Plan: {plan_dir}
Output: {building_dir}/builder-{builder_id}-report.md

# Production-specific context
Test Requirements: {test_requirements_file}
Coverage Threshold: {coverage_threshold}%
Security Checklist: {security_checklist}

You MUST:
1. Write comprehensive tests for your feature
2. Ensure coverage meets threshold
3. Follow security checklist
4. Document API contracts if applicable

Create report at: {building_dir}/builder-{builder_id}-report.md"""
)
```

### 5. Validation Phase Enhancement

Add production validation stage after standard validation:

```python
# Phase 5: Standard Validation (existing)
# Phase 5.5: Production Validation (NEW)

if MODE == 'PRODUCTION':
    spawn_task(
        type="2l-prod-validator",
        prompt=f"""Validate production requirements.

Iteration: {global_iter}
Standard Validation: {validation_dir}/validation-report.md

Production Checks:
1. Test coverage >= {coverage_threshold}%
2. All E2E tests pass
3. Security scan passes
4. Performance baselines met
5. CI pipeline generated and valid

Create report at: {validation_dir}/prod-validation-report.md"""
    )
```

### 6. Implementation Strategy

**Approach:** Extend existing infrastructure rather than duplicate

1. **Reuse existing argument parsing** - add optional flags
2. **Reuse config.yaml structure** - add nested `prod_config` section
3. **Reuse spawn_task pattern** - add production context to prompts
4. **Add production validation phase** - insert after standard validation
5. **Create production-specific agent templates** - or use mode parameter

### 7. Key Differences from /2l-mvp

| Aspect | /2l-mvp | /2l-prod |
|--------|---------|----------|
| Speed | Fast prototype | Thorough production |
| Tests | Optional | Required with threshold |
| Coverage | No requirement | 80%+ required |
| Security | Not checked | Security scan required |
| CI/CD | Not generated | Generated and validated |
| Deployment | Not configured | Deployment-ready |
| Documentation | Builder reports | API docs required |

---

## Critical Code Patterns

### Level Detection (Line 268-383 of 2l-mvp.md)

```python
if arguments_provided:
    LEVEL = 1
    MODE = 'MASTER'
elif plan_status == 'VISIONED' and not has_master_plan:
    LEVEL = 2
    MODE = 'MASTER'
elif plan_status == 'PLANNED' and has_master_plan:
    LEVEL = 3
    MODE = 'ITERATION_EXECUTOR'
elif plan_status == 'IN_PROGRESS':
    MODE = 'ITERATION_EXECUTOR'  # Resume
```

### Config Reading Pattern

```python
CONFIG_FILE = ".2L/config.yaml"
config = read_yaml(CONFIG_FILE)
current_plan = config['current_plan']
plan_status = get_plan_status(current_plan, config)
```

### spawn_task Pattern for Builders (Line 1014-1029)

```python
spawn_task(
    type="2l-builder",
    prompt=f"Build assigned feature.

Iteration: {global_iter}
Your ID: Builder-{builder_id}
Plan: {plan_dir}
Output: {building_dir}/builder-{builder_id}-report.md

Read your task from: {plan_dir}/builder-tasks.md
Follow patterns from: {plan_dir}/patterns.md

You can COMPLETE or SPLIT if too complex.

Create report at: {building_dir}/builder-{builder_id}-report.md"
)
```

---

## Questions for Planner

1. Should `/2l-prod` be a completely separate command or extend `/2l-mvp` with a `--production` flag?

2. Should test requirements be inline arguments or read from a `test-requirements.md` file?

3. Should CI/CD generation be a separate phase or integrated into validation?

4. For security scanning, should we use an MCP or external tool (e.g., `npm audit`, `trivy`)?

5. Should `/2l-prod` always create a new plan or be able to "upgrade" an existing MVP plan to production?

---

*Report generated by Explorer-1*  
*Focus: Command Structure Analysis*  
*Files analyzed:*
- `/home/ahiya/Ahiya/2L/commands/2l-mvp.md` (1940 lines)
- `/home/ahiya/Ahiya/2L/.2L/config.yaml` (109 lines)
- `/home/ahiya/Ahiya/2L/commands/2l-vision.md` (516 lines)
- `/home/ahiya/Ahiya/2L/commands/2l-continue.md` (184 lines)
- `/home/ahiya/Ahiya/2L/agents/2l-builder.md` (200+ lines)
- `/home/ahiya/Ahiya/2L/agents/2l-validator.md` (200+ lines)
