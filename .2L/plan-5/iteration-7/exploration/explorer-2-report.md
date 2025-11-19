# Explorer-2 Report: Code Patterns & Design Analysis

**Focus Area:** Technology Patterns, Dependencies, and Reusable Components  
**Plan:** plan-5  
**Iteration:** 7 (Global)  
**Date:** 2025-11-19  

---

## Executive Summary

Analyzed existing 2L codebase to identify reusable patterns for implementing learning status tracking and the `/2l-improve` command. Found strong pattern consistency across YAML operations, event emission, and orchestration workflows. The existing `2l-yaml-helpers.py` provides excellent foundation for status lifecycle management, and `/2l-mvp.md` shows clear patterns for confirmation workflows.

**Key Finding:** 2L already has all infrastructure patterns needed - this iteration extends existing patterns rather than introducing new ones.

---

## 1. Reusable Patterns from Existing Code

### 1.1 YAML Read/Write Patterns (from `lib/2l-yaml-helpers.py`)

**Pattern:** Atomic Write with Backup

**Purpose:** Prevent corruption of global state files during updates

**Existing Implementation:**
```python
def atomic_write_yaml(file_path, data):
    """
    Write YAML data atomically to prevent corruption.
    Uses temp file + rename for atomic operation.
    """
    # Create temp file in same directory (ensures same filesystem)
    dir_path = os.path.dirname(file_path) or '.'
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

**How to Extend for Status Tracking:**

```python
def update_pattern_status(pattern_id, new_status, metadata=None):
    """
    Update single pattern status in global-learnings.yaml atomically.
    
    Args:
        pattern_id: Pattern identifier (e.g., "PATTERN-001")
        new_status: New status ("IMPLEMENTED", "VERIFIED")
        metadata: Optional dict of metadata to add (implemented_in, verified_at, etc.)
    """
    global_learnings_path = '.2L/global-learnings.yaml'
    
    # Backup before modification
    backup_before_write(global_learnings_path)
    
    # Read current data
    with open(global_learnings_path, 'r') as f:
        global_data = yaml.safe_load(f)
    
    # Find and update pattern
    pattern_found = False
    for pattern in global_data.get('patterns', []):
        if pattern['pattern_id'] == pattern_id:
            pattern['status'] = new_status
            
            # Add metadata if provided
            if metadata:
                pattern.update(metadata)
            
            pattern_found = True
            break
    
    if not pattern_found:
        raise ValueError(f"Pattern {pattern_id} not found in global learnings")
    
    # Update aggregation timestamp
    global_data['aggregated_at'] = datetime.now().isoformat()
    
    # Atomic write
    atomic_write_yaml(global_learnings_path, global_data)
    
    return pattern

# Usage in /2l-improve after /2l-mvp completes:
update_pattern_status(
    pattern_id="PATTERN-003",
    new_status="IMPLEMENTED",
    metadata={
        'implemented_in_plan': 'plan-5',
        'implemented_at': datetime.now().isoformat(),
        'vision_file': '.2L/plan-5/vision.md'
    }
)
```

**Key Principles:**
- Always backup before modification (`.bak` file)
- Use temp file + rename for atomicity (POSIX rename is atomic)
- Clean up temp files on error
- Update metadata timestamps on every write

---

### 1.2 Event Emission Patterns (from `lib/2l-event-logger.sh`)

**Pattern:** Graceful Event Emission with Backward Compatibility

**Existing Implementation:**
```bash
# Source event logger library if available (backward compatible)
EVENT_LOGGING_ENABLED=false
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  EVENT_LOGGING_ENABLED=true
  echo "[2L] Event logging enabled"
else
  echo "[2L] Event logging not available (continuing without dashboard)"
fi

# Emit event with graceful degradation
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "event_type" "description" "phase" "agent_id"
fi
```

**Event Function Signature:**
```bash
log_2l_event() {
  local event_type="$1"     # required: plan_start, agent_spawn, phase_change, etc.
  local data="$2"           # required: descriptive message
  local phase="${3:-unknown}" # optional: exploration, planning, building, etc.
  local agent_id="${4:-orchestrator}" # optional: agent identifier
  
  # ... implementation
}
```

**How to Extend for /2l-improve:**

```bash
# In /2l-improve command

# Source event logger
EVENT_LOGGING_ENABLED=false
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  EVENT_LOGGING_ENABLED=true
fi

# Emit pattern detection event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "pattern_detection" \
               "Detected 5 IDENTIFIED patterns (3 high severity, 2 medium)" \
               "aggregation" \
               "2l-improve"
fi

# Emit vision generation event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "vision_generated" \
               "Auto-generated vision for PATTERN-003 (TypeScript path resolution)" \
               "vision_generation" \
               "2l-improve"
fi

# Emit confirmation prompt event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "confirmation_prompt" \
               "Waiting for user confirmation to proceed with self-modification" \
               "confirmation" \
               "2l-improve"
fi

# Emit self-modification event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "self_modification" \
               "Modified agents/2l-planner.md to add tsconfig validation" \
               "self_modification" \
               "2l-improve"
fi

# Emit status update event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "status_update" \
               "Updated PATTERN-003 status: IDENTIFIED → IMPLEMENTED" \
               "status_update" \
               "2l-improve"
fi
```

**New Event Types for /2l-improve:**
- `pattern_detection` - When recurring patterns identified
- `vision_generated` - When auto-generating vision.md
- `confirmation_prompt` - When waiting for user input
- `self_modification` - When modifying agent/command files
- `status_update` - When updating pattern status in global-learnings.yaml

**Key Principles:**
- Always check `EVENT_LOGGING_ENABLED` before emitting
- Never block execution if event logging fails
- Use descriptive data messages for dashboard display
- Phase should match orchestration context

---

### 1.3 Agent Spawning Patterns (from `commands/2l-mvp.md`)

**Pattern:** Task Tool for Agent Spawning

**Existing Implementation (from 2l-mvp.md):**
```bash
# Spawn explorer using task tool
spawn_task(
    type="2l-explorer",
    prompt=f"You are Explorer {explorer_id}.

Focus Area: {FOCUS_AREA}

Plan: {plan_id}
Vision: {PLAN_DIR}/vision.md
Output: {exploration_dir}/explorer-{explorer_id}-report.md

Analyze the vision document and create a comprehensive exploration report.

Create your report at: {exploration_dir}/explorer-{explorer_id}-report.md"
)
```

**NOT Applicable for /2l-improve:**

The `/2l-improve` command does NOT spawn agents. It is a self-contained command that:
1. Reads global-learnings.yaml directly
2. Detects patterns using Python script
3. Generates vision.md using templates
4. Confirms with user
5. Calls `/2l-mvp` to execute improvement (which then spawns agents)

**Instead, /2l-improve uses subprocess pattern:**

```bash
# In /2l-improve command

# After user confirms improvement
echo "   🚀 Executing improvement via /2l-mvp..."

# Change to meditation space
cd ~/Ahiya/2L

# Run /2l-mvp (which will spawn agents for the improvement)
claude-ai "/2l-mvp" 2>&1 | tee .2L/plan-${next_plan_id}/mvp-execution.log

# Check if /2l-mvp succeeded
if [ $? -eq 0 ]; then
    echo "   ✅ Improvement execution complete"
    
    # Update pattern status
    python3 ~/.claude/lib/2l-yaml-helpers.py update_pattern_status \
        --pattern-id "$selected_pattern_id" \
        --status "IMPLEMENTED" \
        --metadata-json "{\"implemented_in_plan\": \"${next_plan_id}\", \"implemented_at\": \"$(date -Iseconds)\"}"
else
    echo "   ❌ Improvement execution failed"
    exit 1
fi
```

**Key Principles:**
- /2l-improve is orchestrator, not builder
- /2l-mvp handles all agent spawning for improvement execution
- /2l-improve creates vision, /2l-mvp builds from vision

---

### 1.4 Vision Structure Patterns (from `commands/2l-vision.md`)

**Pattern:** Structured Vision Template

**Existing Template Structure:**
```markdown
# Project Vision: {Project Name}

**Created:** {ISO timestamp}
**Plan:** plan-{N}

---

## Problem Statement
{What problem this project solves}

## Target Users
**Primary user:** {Description}

## Core Value Proposition
{One sentence: What makes this valuable}

## Feature Breakdown

### Must-Have (MVP)
1. **{Feature 1}**
   - Description: {What it does}
   - User story: As a {user}, I want to {action} so that {benefit}
   - Acceptance criteria:
     - [ ] {Criterion 1}
     - [ ] {Criterion 2}

### Should-Have (Post-MVP)
1. **{Feature}** - {Brief description}

## Success Criteria
**The MVP is successful when:**
1. **{Measurable criterion 1}**
   - Metric: {How measured}
   - Target: {Specific number/state}

## Out of Scope
**Explicitly not included in MVP:**
- {Feature/aspect 1}
```

**How to Extend for Auto-Generated Improvement Visions:**

Create template at: `.claude/templates/improvement-vision.md`

```markdown
# Vision: Fix Recurring Pattern - {PATTERN_NAME}

**Created:** {ISO_TIMESTAMP}
**Plan:** plan-{PLAN_ID}
**Source Pattern:** {PATTERN_ID} ({OCCURRENCES} occurrences across {PROJECT_COUNT} projects)

---

## Problem Statement

**Recurring Issue:**
{PATTERN_ISSUE_DESCRIPTION}

**Evidence:**
- Occurred in projects: {PROJECT_LIST}
- First discovered: {DISCOVERED_IN}
- Severity: {SEVERITY}
- Recurrence risk: {RECURRENCE_RISK}

**Root Cause:**
{PATTERN_ROOT_CAUSE}

---

## Impact Analysis

**Current State:**
This pattern has caused validation failures in {OCCURRENCES} iteration(s):
{SOURCE_LEARNINGS_LIST}

**Iteration Metrics:**
- Average healing rounds: {AVG_HEALING_ROUNDS}
- Average files modified: {AVG_FILES_MODIFIED}
- Average iteration duration: {AVG_DURATION_SECONDS}s

**Projected Improvement:**
Fixing this pattern will prevent similar failures in future iterations, reducing:
- Re-validation cycles
- Healing overhead
- Developer intervention

---

## Proposed Solution

**Implementation Strategy:**
{PATTERN_PROPOSED_SOLUTION}

**Components to Modify:**
{AFFECTED_COMPONENTS_LIST}

**Validation Strategy:**
- Verify fix prevents recurrence
- Test against historical failure scenarios
- Ensure no regression in other areas

---

## Feature Breakdown

### Must-Have (MVP)

1. **Pattern Prevention Logic**
   - Description: {Specific implementation based on pattern}
   - User story: As 2L, I want to {prevent this pattern} so that {future iterations succeed}
   - Acceptance criteria:
     - [ ] Fix implemented in {affected components}
     - [ ] Validation passes on test scenarios
     - [ ] Pattern marked as IMPLEMENTED in global-learnings.yaml

2. **Regression Testing**
   - Description: Ensure fix doesn't break existing functionality
   - Acceptance criteria:
     - [ ] All existing tests pass
     - [ ] No new issues introduced

---

## Success Criteria

**The improvement is successful when:**

1. **Pattern No Longer Recurs**
   - Metric: Zero new instances of this pattern in next 3 iterations
   - Target: 0 occurrences

2. **Fix Verified**
   - Metric: Re-running historical failure scenarios
   - Target: All scenarios pass

3. **Status Updated**
   - Metric: Pattern status in global-learnings.yaml
   - Target: Status = IMPLEMENTED

---

## Affected Components

**Files to Modify:**
{AFFECTED_FILES_FROM_PATTERN}

**Agent/Command Modifications:**
{INFERRED_FROM_ROOT_CAUSE}

**Critical Safety:**
- DO NOT modify: commands/2l-mvp.md (orchestrator itself)
- Only modify: agents/*.md, commands/2l-*.md (except 2l-mvp), lib/*.sh, lib/*.py

---

## Out of Scope

**Not included in this improvement:**
- Verification of fix (manual /2l-verify in future iteration)
- Historical data cleanup
- Other unrelated patterns

---

## Source Data

**Pattern ID:** {PATTERN_ID}
**Discovered:** {DISCOVERED_AT}
**Source Learnings:** {SOURCE_LEARNING_IDS}
**Occurrence History:** {OCCURRENCE_DETAILS}

---

**Vision Status:** READY_FOR_IMPLEMENTATION
**Auto-Generated:** true
**Generated By:** /2l-improve
**Generated At:** {ISO_TIMESTAMP}
```

**Template Variable Substitution:**

```python
def generate_improvement_vision(pattern, next_plan_id):
    """
    Generate vision.md from pattern using template.
    
    Args:
        pattern: Pattern dict from global-learnings.yaml
        next_plan_id: Next plan ID (e.g., "plan-6")
        
    Returns:
        vision_content: Generated vision markdown
    """
    template_path = os.path.expanduser('~/.claude/templates/improvement-vision.md')
    
    # Read template
    with open(template_path, 'r') as f:
        template = f.read()
    
    # Calculate metrics from iteration_metadata
    avg_healing_rounds = sum(
        p.get('iteration_metadata', {}).get('healing_rounds', 0) 
        for p in [pattern]
    ) / len([pattern])
    
    avg_files_modified = sum(
        p.get('iteration_metadata', {}).get('files_modified', 0)
        for p in [pattern]
    ) / len([pattern])
    
    avg_duration = sum(
        p.get('iteration_metadata', {}).get('duration_seconds', 0)
        for p in [pattern]
    ) / len([pattern])
    
    # Variable substitution
    vision_content = template.replace('{PATTERN_NAME}', pattern['name'])
    vision_content = vision_content.replace('{ISO_TIMESTAMP}', datetime.now().isoformat())
    vision_content = vision_content.replace('{PLAN_ID}', next_plan_id)
    vision_content = vision_content.replace('{PATTERN_ID}', pattern['pattern_id'])
    vision_content = vision_content.replace('{OCCURRENCES}', str(pattern['occurrences']))
    vision_content = vision_content.replace('{PROJECT_COUNT}', str(len(pattern['projects'])))
    vision_content = vision_content.replace('{PATTERN_ISSUE_DESCRIPTION}', pattern['name'])
    vision_content = vision_content.replace('{PROJECT_LIST}', ', '.join(pattern['projects']))
    vision_content = vision_content.replace('{DISCOVERED_IN}', pattern['discovered_in'])
    vision_content = vision_content.replace('{SEVERITY}', pattern['severity'])
    vision_content = vision_content.replace('{RECURRENCE_RISK}', 'high' if pattern['occurrences'] >= 3 else 'medium')
    vision_content = vision_content.replace('{PATTERN_ROOT_CAUSE}', pattern['root_cause'])
    vision_content = vision_content.replace('{SOURCE_LEARNINGS_LIST}', '\n'.join(
        f"- {learning_id}" for learning_id in pattern['source_learnings']
    ))
    vision_content = vision_content.replace('{AVG_HEALING_ROUNDS}', f"{avg_healing_rounds:.1f}")
    vision_content = vision_content.replace('{AVG_FILES_MODIFIED}', f"{avg_files_modified:.1f}")
    vision_content = vision_content.replace('{AVG_DURATION_SECONDS}', f"{avg_duration:.0f}")
    vision_content = vision_content.replace('{PATTERN_PROPOSED_SOLUTION}', pattern['proposed_solution'])
    
    # Infer affected components from root cause
    affected_components = infer_affected_components(pattern['root_cause'])
    vision_content = vision_content.replace('{AFFECTED_COMPONENTS_LIST}', '\n'.join(
        f"- {component}" for component in affected_components
    ))
    
    # Infer affected files (if available in pattern)
    affected_files = pattern.get('affected_files', ['Unknown - see pattern data'])
    vision_content = vision_content.replace('{AFFECTED_FILES_FROM_PATTERN}', '\n'.join(
        f"- {file_path}" for file_path in affected_files
    ))
    
    # Occurrence details
    occurrence_details = '\n'.join(
        f"- {project}: {learning_id}" 
        for project, learning_id in zip(pattern['projects'], pattern['source_learnings'])
    )
    vision_content = vision_content.replace('{OCCURRENCE_DETAILS}', occurrence_details)
    
    vision_content = vision_content.replace('{INFERRED_FROM_ROOT_CAUSE}', infer_agents_to_modify(pattern['root_cause']))
    vision_content = vision_content.replace('{SOURCE_LEARNING_IDS}', ', '.join(pattern['source_learnings']))
    vision_content = vision_content.replace('{DISCOVERED_AT}', pattern['discovered_at'])
    
    return vision_content

def infer_affected_components(root_cause):
    """
    Infer which agents/commands to modify based on root cause.
    
    Args:
        root_cause: Root cause string from pattern
        
    Returns:
        components: List of component names
    """
    components = []
    
    # Pattern matching on root cause keywords
    if 'tsconfig' in root_cause.lower() or 'path' in root_cause.lower():
        components.append('agents/2l-planner.md - Add tsconfig validation step')
    
    if 'duplicate' in root_cause.lower() or 'zone' in root_cause.lower():
        components.append('agents/2l-iplanner.md - Add duplicate file detection')
    
    if 'import' in root_cause.lower():
        components.append('agents/2l-builder.md - Add import verification')
    
    if 'integration' in root_cause.lower():
        components.append('agents/2l-integrator.md - Enhanced conflict detection')
    
    # Default fallback
    if not components:
        components.append('TBD - Requires manual analysis of root cause')
    
    return components

def infer_agents_to_modify(root_cause):
    """
    Generate markdown list of agents to modify.
    """
    components = infer_affected_components(root_cause)
    return '\n'.join(f"- {comp}" for comp in components)
```

**Key Principles:**
- Template-based generation (consistent structure)
- Variable substitution from pattern data
- Inference logic for affected components
- Include source data for traceability
- Mark as auto-generated for transparency

---

### 1.5 Confirmation Workflow Patterns (from `commands/2l-abandon-plan.md`, `commands/2l-rollback.md`)

**Pattern:** Interactive Confirmation with Safety Abort

**Existing Implementation:**
```bash
# From 2l-abandon-plan.md
echo ""
echo "=========================================="
echo "CONFIRM PLAN ABANDONMENT"
echo "=========================================="
echo ""
echo "This will mark plan-${plan_id} as ABANDONED."
echo "This action cannot be undone."
echo ""
read -p "Proceed with abandonment? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo ""
    echo "❌ Abandonment cancelled."
    exit 0
fi

echo ""
echo "✅ Proceeding with abandonment..."
```

**How to Extend for /2l-improve:**

```bash
# In /2l-improve command after pattern detection and vision generation

echo ""
echo "=========================================="
echo "SELF-IMPROVEMENT CONFIRMATION"
echo "=========================================="
echo ""
echo "Proposed improvement:"
echo ""
echo "Pattern: $pattern_name ($pattern_id)"
echo "Severity: $severity"
echo "Occurrences: $occurrences across $project_count projects"
echo ""
echo "Root Cause:"
echo "  $root_cause"
echo ""
echo "Proposed Solution:"
echo "  $proposed_solution"
echo ""
echo "Components to Modify:"
for component in "${components_to_modify[@]}"; do
    echo "  - $component"
done
echo ""
echo "Files to Change:"
for file in "${files_to_change[@]}"; do
    echo "  - $file"
done
echo ""
echo "Vision: .2L/plan-${next_plan_id}/vision.md"
echo ""
echo "=========================================="
echo "SAFETY CHECKS"
echo "=========================================="
echo ""

# Verify no orchestrator modification
if echo "${files_to_change[@]}" | grep -q "2l-mvp.md"; then
    echo "❌ ERROR: Cannot modify orchestrator (commands/2l-mvp.md)"
    echo "   This is blocked for safety reasons."
    exit 1
fi

# Verify symlinks intact
echo "Checking symlink integrity..."
if ! ~/.claude/lib/verify-symlinks.sh; then
    echo "❌ ERROR: Symlink integrity check failed"
    echo "   Fix symlinks before proceeding with self-modification"
    exit 1
fi

# Verify git status clean
echo "Checking git status..."
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  WARNING: Uncommitted changes detected"
    echo "   Commit or stash changes before self-modification"
    read -p "Proceed anyway? (y/N): " proceed_dirty
    if [ "$proceed_dirty" != "y" ] && [ "$proceed_dirty" != "Y" ]; then
        echo "❌ Aborted"
        exit 0
    fi
fi

echo ""
echo "=========================================="
echo "CONFIRMATION"
echo "=========================================="
echo ""
echo "This will:"
echo "  1. Create plan-${next_plan_id} with auto-generated vision"
echo "  2. Run /2l-mvp to implement the improvement"
echo "  3. Modify 2L agent/command files (SELF-MODIFICATION)"
echo "  4. Update pattern status: IDENTIFIED → IMPLEMENTED"
echo "  5. Git commit all changes"
echo ""
echo "⚠️  This is meta-circular self-improvement."
echo "   2L will modify its own codebase."
echo ""
read -p "Proceed with self-improvement? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo ""
    echo "❌ Self-improvement cancelled."
    echo ""
    echo "Options:"
    echo "  1. Review vision: cat .2L/plan-${next_plan_id}/vision.md"
    echo "  2. Run manually: /2l-mvp (after reviewing vision)"
    echo "  3. Adjust scope: edit .2L/plan-${next_plan_id}/vision.md"
    exit 0
fi

echo ""
echo "✅ Proceeding with self-improvement..."

# Emit confirmation event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "confirmation_accepted" \
                 "User confirmed self-improvement for $pattern_id" \
                 "confirmation" \
                 "2l-improve"
fi
```

**Key Principles:**
- Always show what will be modified
- Require explicit "y" or "Y" (not default)
- Provide escape option (any other key aborts)
- Show context and consequences
- Emit event on confirmation acceptance
- Run safety checks before prompting

---

## 2. Pattern Detection Algorithm

### 2.1 Similarity Detection Pattern

**Existing Implementation (from `lib/2l-yaml-helpers.py`):**

```python
def find_similar_pattern(existing_patterns, new_pattern):
    """
    Find similar pattern in existing patterns (conservative similarity).
    
    Uses exact root_cause match to avoid false grouping.
    """
    for pattern in existing_patterns:
        # Exact match on root_cause (conservative)
        if pattern['root_cause'] == new_pattern['root_cause']:
            # Also check severity matches
            if pattern['severity'] == new_pattern['severity']:
                return pattern
    return None
```

**Analysis:** This is TOO conservative for pattern detection. /2l-improve needs more sophisticated matching.

**Recommended Pattern Detection Algorithm:**

```python
def detect_recurring_patterns(global_learnings_path, min_occurrences=2, min_severity='medium'):
    """
    Detect recurring patterns from global learnings.
    
    Args:
        global_learnings_path: Path to global-learnings.yaml
        min_occurrences: Minimum occurrences to consider pattern recurring
        min_severity: Minimum severity ('critical', 'medium', 'low')
        
    Returns:
        patterns: List of pattern dicts, sorted by impact score (descending)
    """
    # Read global learnings
    with open(global_learnings_path, 'r') as f:
        global_data = yaml.safe_load(f)
    
    patterns = global_data.get('patterns', [])
    
    # Filter by status (only IDENTIFIED)
    identified_patterns = [
        p for p in patterns 
        if p.get('status') == 'IDENTIFIED'
    ]
    
    # Filter by minimum occurrences
    recurring_patterns = [
        p for p in identified_patterns
        if p.get('occurrences', 0) >= min_occurrences
    ]
    
    # Filter by minimum severity
    severity_order = {'critical': 3, 'medium': 2, 'low': 1}
    min_severity_level = severity_order.get(min_severity, 2)
    
    filtered_patterns = [
        p for p in recurring_patterns
        if severity_order.get(p.get('severity', 'low'), 1) >= min_severity_level
    ]
    
    # Calculate impact score and rank
    for pattern in filtered_patterns:
        impact_score = calculate_impact_score(pattern)
        pattern['impact_score'] = impact_score
    
    # Sort by impact score (descending)
    sorted_patterns = sorted(
        filtered_patterns,
        key=lambda p: p['impact_score'],
        reverse=True
    )
    
    return sorted_patterns

def calculate_impact_score(pattern):
    """
    Calculate impact score for pattern ranking.
    
    Formula: severity_weight × occurrences × recurrence_factor
    
    Where:
    - severity_weight: critical=10, medium=5, low=1
    - occurrences: number of times pattern occurred
    - recurrence_factor: 1.5 if multiple projects, 1.0 if single project
    """
    # Severity weights
    severity_weights = {
        'critical': 10,
        'medium': 5,
        'low': 1
    }
    
    severity = pattern.get('severity', 'low')
    severity_weight = severity_weights.get(severity, 1)
    
    # Occurrences
    occurrences = pattern.get('occurrences', 1)
    
    # Recurrence factor (higher if multiple projects)
    projects = pattern.get('projects', [])
    recurrence_factor = 1.5 if len(projects) > 1 else 1.0
    
    # Calculate score
    impact_score = severity_weight * occurrences * recurrence_factor
    
    return impact_score

# Example usage:
patterns = detect_recurring_patterns(
    '.2L/global-learnings.yaml',
    min_occurrences=2,
    min_severity='medium'
)

print(f"Found {len(patterns)} recurring patterns:")
for pattern in patterns[:5]:  # Top 5
    print(f"  {pattern['pattern_id']}: {pattern['name']}")
    print(f"    Severity: {pattern['severity']}")
    print(f"    Occurrences: {pattern['occurrences']}")
    print(f"    Projects: {', '.join(pattern['projects'])}")
    print(f"    Impact Score: {pattern['impact_score']:.1f}")
    print()
```

**Tuning Parameters:**

```python
# Default thresholds (conservative)
DEFAULT_MIN_OCCURRENCES = 2  # At least 2 occurrences
DEFAULT_MIN_SEVERITY = 'medium'  # At least medium severity

# Aggressive thresholds (for testing)
AGGRESSIVE_MIN_OCCURRENCES = 1  # Single occurrence
AGGRESSIVE_MIN_SEVERITY = 'low'  # Any severity

# Production thresholds (after validation)
PRODUCTION_MIN_OCCURRENCES = 3  # 3+ occurrences
PRODUCTION_MIN_SEVERITY = 'critical'  # Critical only
```

**Deduplication Logic:**

The existing `find_similar_pattern()` already handles deduplication during orchestrator reflection. For /2l-improve, we DON'T need additional deduplication - we just filter by status:

```python
# Deduplication already happened during merge_learnings()
# /2l-improve only shows IDENTIFIED patterns (not IMPLEMENTED/VERIFIED)
identified_only = [
    p for p in patterns 
    if p.get('status') == 'IDENTIFIED'
]
```

**Key Principles:**
- Filter by status: IDENTIFIED only
- Calculate impact score for ranking
- Support tunable thresholds (min_occurrences, min_severity)
- Sort by impact (highest first)
- Return top N patterns for user review

---

## 3. Status Lifecycle Pattern

### 3.1 Schema Extension (Backward Compatible)

**Existing Schema (from iteration 1):**

```yaml
patterns:
  - pattern_id: "PATTERN-001"
    name: "TypeScript path resolution failures"
    occurrences: 3
    projects: ["wealth", "ai-mafia", "ShipLog"]
    severity: "critical"
    root_cause: "tsconfig.json paths not configured before builders create imports"
    proposed_solution: "Add tsconfig.json validation to planner phase"
    status: "IDENTIFIED"  # NEW: Status field
    discovered_in: "plan-3-iter-2"
    discovered_at: "2025-11-19T15:30:00Z"
    source_learnings: ["wealth-20251119-001", "ai-mafia-20251015-003"]
```

**Extended Schema (with status lifecycle metadata):**

```yaml
patterns:
  - pattern_id: "PATTERN-001"
    name: "TypeScript path resolution failures"
    occurrences: 3
    projects: ["wealth", "ai-mafia", "ShipLog"]
    severity: "critical"
    root_cause: "tsconfig.json paths not configured before builders create imports"
    proposed_solution: "Add tsconfig.json validation to planner phase"
    
    # Status lifecycle fields
    status: "IMPLEMENTED"  # IDENTIFIED → IMPLEMENTED → VERIFIED
    
    # IDENTIFIED metadata (always present)
    discovered_in: "plan-3-iter-2"
    discovered_at: "2025-11-19T15:30:00Z"
    source_learnings: ["wealth-20251119-001", "ai-mafia-20251015-003"]
    
    # IMPLEMENTED metadata (added by /2l-improve after /2l-mvp completes)
    implemented_in_plan: "plan-5"  # NEW
    implemented_at: "2025-11-20T10:15:00Z"  # NEW
    vision_file: ".2L/plan-5/vision.md"  # NEW
    
    # VERIFIED metadata (future - added by /2l-verify)
    # verified_at: "2025-11-21T14:30:00Z"  # FUTURE
    # verified_by: "manual"  # FUTURE
    # verification_notes: "Tested on 3 new iterations, no recurrence"  # FUTURE
```

**Status Transition Rules:**

```python
# Valid status transitions
VALID_TRANSITIONS = {
    'IDENTIFIED': ['IMPLEMENTED'],  # /2l-improve marks as IMPLEMENTED after /2l-mvp
    'IMPLEMENTED': ['VERIFIED'],    # /2l-verify marks as VERIFIED after manual testing
    'VERIFIED': []                  # Terminal state
}

def validate_status_transition(current_status, new_status):
    """
    Validate status transition is allowed.
    
    Args:
        current_status: Current pattern status
        new_status: Proposed new status
        
    Returns:
        valid: True if transition allowed
    
    Raises:
        ValueError: If transition invalid
    """
    if current_status not in VALID_TRANSITIONS:
        raise ValueError(f"Invalid current status: {current_status}")
    
    if new_status not in VALID_TRANSITIONS.get(current_status, []):
        raise ValueError(
            f"Invalid transition: {current_status} → {new_status}. "
            f"Allowed: {VALID_TRANSITIONS[current_status]}"
        )
    
    return True

# Usage in update_pattern_status():
validate_status_transition(pattern['status'], new_status)
```

**Backward Compatibility:**

```python
# Graceful degradation if status field missing
def get_pattern_status(pattern):
    """
    Get pattern status with backward compatibility.
    
    Args:
        pattern: Pattern dict from global-learnings.yaml
        
    Returns:
        status: Status string (defaults to IDENTIFIED if missing)
    """
    return pattern.get('status', 'IDENTIFIED')  # Default to IDENTIFIED

# Filter patterns by status
def filter_by_status(patterns, status):
    """
    Filter patterns by status with backward compatibility.
    
    Args:
        patterns: List of pattern dicts
        status: Status to filter by
        
    Returns:
        filtered: List of patterns with given status
    """
    return [
        p for p in patterns
        if get_pattern_status(p) == status
    ]

# Usage:
identified_patterns = filter_by_status(all_patterns, 'IDENTIFIED')
```

**Key Principles:**
- Status field always present (default: IDENTIFIED)
- Metadata fields added progressively (IDENTIFIED → IMPLEMENTED → VERIFIED)
- Transition validation prevents invalid state changes
- Backward compatibility via defaults
- Atomic updates to prevent partial writes

---

### 3.2 Status Filtering Logic

**Filter Patterns for /2l-improve (Show Only IDENTIFIED):**

```python
def get_actionable_patterns(global_learnings_path):
    """
    Get patterns that need improvement (IDENTIFIED status only).
    
    Args:
        global_learnings_path: Path to global-learnings.yaml
        
    Returns:
        patterns: List of IDENTIFIED patterns, sorted by impact
    """
    # Read global learnings
    with open(global_learnings_path, 'r') as f:
        global_data = yaml.safe_load(f)
    
    all_patterns = global_data.get('patterns', [])
    
    # Filter by status: IDENTIFIED only
    identified_patterns = [
        p for p in all_patterns
        if get_pattern_status(p) == 'IDENTIFIED'
    ]
    
    # Detect recurring patterns
    recurring = detect_recurring_patterns_from_list(
        identified_patterns,
        min_occurrences=2,
        min_severity='medium'
    )
    
    return recurring

# Usage in /2l-improve:
actionable_patterns = get_actionable_patterns('.2L/global-learnings.yaml')

if not actionable_patterns:
    print("✅ No recurring patterns detected.")
    print("   All IDENTIFIED patterns have been addressed.")
    exit(0)

print(f"Found {len(actionable_patterns)} actionable patterns:")
for i, pattern in enumerate(actionable_patterns[:5], 1):
    print(f"  {i}. {pattern['name']} ({pattern['pattern_id']})")
    print(f"     Severity: {pattern['severity']}")
    print(f"     Occurrences: {pattern['occurrences']}")
    print(f"     Impact Score: {pattern['impact_score']:.1f}")
```

**Update Status After /2l-mvp Completes:**

```bash
# In /2l-improve after successful /2l-mvp execution

echo "   📝 Updating pattern status: IDENTIFIED → IMPLEMENTED..."

python3 ~/.claude/lib/2l-yaml-helpers.py update_pattern_status \
    --pattern-id "$selected_pattern_id" \
    --status "IMPLEMENTED" \
    --metadata-json '{
        "implemented_in_plan": "'"$next_plan_id"'",
        "implemented_at": "'"$(date -Iseconds)"'",
        "vision_file": ".2L/'"$next_plan_id"'/vision.md"
    }'

if [ $? -eq 0 ]; then
    echo "   ✅ Pattern status updated successfully"
    
    # Emit status update event
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "status_update" \
                     "Updated $selected_pattern_id: IDENTIFIED → IMPLEMENTED" \
                     "status_update" \
                     "2l-improve"
    fi
else
    echo "   ⚠️  Warning: Failed to update pattern status"
    echo "      You may need to update manually:"
    echo "      Edit .2L/global-learnings.yaml and change status for $selected_pattern_id"
fi
```

**Key Principles:**
- Only show IDENTIFIED patterns to user
- After improvement, mark as IMPLEMENTED
- Include metadata (plan, timestamp, vision file)
- Graceful degradation if update fails
- Emit event for observability

---

## 4. Self-Modification Safety Pattern

### 4.1 Whitelist/Blacklist Approach

**Whitelist (Allowed Modifications):**

```bash
# Whitelist of modifiable files/directories
MODIFIABLE_PATTERNS=(
    "agents/*.md"
    "commands/2l-*.md"  # All 2L commands EXCEPT 2l-mvp.md
    "lib/*.sh"
    "lib/*.py"
)

# Blacklist (Never Modify)
BLACKLIST=(
    "commands/2l-mvp.md"  # CRITICAL: Never modify orchestrator
)

function is_file_modifiable() {
    local file_path="$1"
    
    # Check blacklist first (highest priority)
    for blacklist_pattern in "${BLACKLIST[@]}"; do
        if [[ "$file_path" == $blacklist_pattern ]]; then
            echo "ERROR: File is blacklisted: $file_path"
            echo "       Cannot modify orchestrator for safety reasons"
            return 1
        fi
    done
    
    # Check whitelist
    local matched=false
    for whitelist_pattern in "${MODIFIABLE_PATTERNS[@]}"; do
        if [[ "$file_path" == $whitelist_pattern ]]; then
            matched=true
            break
        fi
    done
    
    if [ "$matched" = false ]; then
        echo "ERROR: File not in whitelist: $file_path"
        echo "       Only agents/*.md, commands/2l-*.md (except 2l-mvp), lib/*.sh, lib/*.py allowed"
        return 1
    fi
    
    return 0
}

# Usage before modification:
for file in "${files_to_modify[@]}"; do
    if ! is_file_modifiable "$file"; then
        echo "❌ Aborting self-modification due to safety check failure"
        exit 1
    fi
done
```

**Key Principles:**
- Blacklist takes precedence over whitelist
- Orchestrator (2l-mvp.md) is NEVER modifiable
- Only specific file patterns allowed
- Pre-modification validation (fail fast)

---

### 4.2 Pre-Modification Validation

**Symlink Integrity Check:**

```bash
#!/usr/bin/env bash
# lib/verify-symlinks.sh

# Verify 2L symlinks are intact
# Returns 0 if all symlinks valid, 1 if any broken

echo "Verifying 2L symlink integrity..."

SYMLINK_BASE="$HOME/.claude"
SOURCE_BASE="$HOME/Ahiya/2L"

# Critical symlinks to check
CRITICAL_SYMLINKS=(
    "agents"
    "commands"
    "lib"
)

all_valid=true

for link_name in "${CRITICAL_SYMLINKS[@]}"; do
    link_path="$SYMLINK_BASE/$link_name"
    target_path="$SOURCE_BASE/$link_name"
    
    # Check if symlink exists
    if [ ! -L "$link_path" ]; then
        echo "❌ Missing symlink: $link_path"
        all_valid=false
        continue
    fi
    
    # Check if target exists
    if [ ! -d "$target_path" ]; then
        echo "❌ Broken symlink: $link_path → $target_path (target missing)"
        all_valid=false
        continue
    fi
    
    # Check if symlink points to correct target
    actual_target=$(readlink -f "$link_path")
    expected_target=$(readlink -f "$target_path")
    
    if [ "$actual_target" != "$expected_target" ]; then
        echo "❌ Incorrect symlink: $link_path → $actual_target (expected: $expected_target)"
        all_valid=false
        continue
    fi
    
    echo "✅ $link_name: OK"
done

if [ "$all_valid" = true ]; then
    echo "✅ All symlinks intact"
    exit 0
else
    echo ""
    echo "❌ Symlink integrity check failed"
    echo "   Fix symlinks before proceeding with self-modification"
    echo "   Run: 2l-setup to recreate symlinks"
    exit 1
fi
```

**Git Status Check:**

```bash
function verify_git_clean() {
    echo "Checking git status..."
    
    # Check if in git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "⚠️  WARNING: Not in a git repository"
        echo "   Self-modification will not be tracked in git"
        read -p "Proceed anyway? (y/N): " proceed
        if [ "$proceed" != "y" ] && [ "$proceed" != "Y" ]; then
            return 1
        fi
        return 0
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo "⚠️  WARNING: Uncommitted changes detected"
        echo ""
        git status --short
        echo ""
        echo "   Recommendation: Commit or stash changes before self-modification"
        read -p "Proceed anyway? (y/N): " proceed
        if [ "$proceed" != "y" ] && [ "$proceed" != "Y" ]; then
            return 1
        fi
    fi
    
    # Check for untracked files in critical directories
    untracked=$(git ls-files --others --exclude-standard agents/ commands/ lib/ 2>/dev/null)
    if [ -n "$untracked" ]; then
        echo "⚠️  WARNING: Untracked files in critical directories:"
        echo "$untracked" | head -5
        echo ""
        read -p "Proceed anyway? (y/N): " proceed
        if [ "$proceed" != "y" ] && [ "$proceed" != "Y" ]; then
            return 1
        fi
    fi
    
    return 0
}

# Usage before self-modification:
if ! verify_git_clean; then
    echo "❌ Aborted due to git status check"
    exit 1
fi
```

**Key Principles:**
- Verify symlinks intact (modifications apply immediately via symlinks)
- Check git status (prevent modification of uncommitted changes)
- Allow override with confirmation (but warn user)
- Pre-flight checks before modification

---

### 4.3 Atomic Modification Pattern

**Git Commit Strategy:**

```bash
function self_modify_with_git_commit() {
    local pattern_id="$1"
    local plan_id="$2"
    
    echo "   🔧 Executing self-modification..."
    
    # Pre-modification commit (safety checkpoint)
    echo "      Creating pre-modification checkpoint..."
    git add -A
    git commit -m "Pre-modification checkpoint: ${pattern_id}" || true
    
    # Tag pre-modification state
    pre_tag="pre-${pattern_id}-$(date +%s)"
    git tag "$pre_tag"
    
    echo "      ✅ Checkpoint: $pre_tag"
    
    # Run /2l-mvp (which will modify files)
    echo "      Running /2l-mvp..."
    if ! claude-ai "/2l-mvp"; then
        echo "      ❌ /2l-mvp failed"
        echo "      Rollback available: git reset --hard $pre_tag"
        exit 1
    fi
    
    # Post-modification commit
    echo "      Creating post-modification commit..."
    git add -A
    
    commit_msg="Self-improvement: ${pattern_id}

Pattern: ${pattern_id}
Plan: ${plan_id}
Status: IDENTIFIED → IMPLEMENTED

🤖 Generated by /2l-improve
Co-Authored-By: Claude <noreply@anthropic.com>"
    
    git commit -m "$commit_msg"
    
    # Tag post-modification state
    post_tag="2l-improve-${pattern_id}"
    git tag "$post_tag"
    
    echo "      ✅ Self-modification committed: $post_tag"
    
    # Show diff
    echo ""
    echo "      Files modified:"
    git diff --name-only "${pre_tag}..HEAD" | sed 's/^/        - /'
    
    return 0
}

# Usage:
self_modify_with_git_commit "$selected_pattern_id" "$next_plan_id"
```

**Rollback Strategy:**

```bash
function rollback_self_modification() {
    local pattern_id="$1"
    
    echo ""
    echo "=========================================="
    echo "ROLLBACK SELF-MODIFICATION"
    echo "=========================================="
    echo ""
    echo "This will revert changes from pattern: $pattern_id"
    echo ""
    
    # Find pre-modification tag
    pre_tag=$(git tag -l "pre-${pattern_id}-*" | head -1)
    
    if [ -z "$pre_tag" ]; then
        echo "❌ ERROR: Pre-modification tag not found for $pattern_id"
        echo "   Cannot rollback automatically"
        exit 1
    fi
    
    echo "Found pre-modification checkpoint: $pre_tag"
    echo ""
    
    # Show what will be reverted
    echo "Files that will be reverted:"
    git diff --name-only "${pre_tag}..HEAD" | sed 's/^/  - /'
    echo ""
    
    read -p "Proceed with rollback? (y/N): " confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "❌ Rollback cancelled"
        exit 0
    fi
    
    # Rollback
    git reset --hard "$pre_tag"
    
    echo "✅ Rolled back to: $pre_tag"
    echo "   Self-modification changes reverted"
}

# Manual rollback command:
# /2l-rollback-improvement PATTERN-003
```

**Key Principles:**
- Pre-modification git commit (safety checkpoint)
- Tag pre/post states for easy rollback
- Atomic commits (all or nothing)
- Clear commit messages with pattern ID
- Rollback capability via git tags

---

## 5. Code Organization Recommendations

### 5.1 Component Structure

**Recommended Structure:**

```
/2l-improve Command (Bash CLI)
├── Pattern Detection (Python Script)
├── Vision Generator (Python Script)
├── Confirmation Workflow (Bash)
├── Orchestrator Caller (Bash → /2l-mvp)
└── Status Updater (Python Script)
```

**File Organization:**

```
commands/
├── 2l-improve.md          # Main CLI command (Bash)

lib/
├── 2l-yaml-helpers.py     # EXTEND: Add status update functions
├── 2l-pattern-detector.py # NEW: Pattern detection logic
├── 2l-vision-generator.py # NEW: Vision auto-generation
└── verify-symlinks.sh     # NEW: Symlink integrity check

.claude/templates/
└── improvement-vision.md  # NEW: Vision template for improvements
```

**Why This Structure:**

1. **CLI in Bash (`commands/2l-improve.md`):**
   - Consistent with existing 2L commands
   - Easy integration with orchestration
   - Simple to test manually
   - Handles user interaction naturally

2. **Logic in Python Scripts (`lib/*.py`):**
   - Complex YAML operations
   - Pattern detection algorithms
   - String templating
   - Reusable functions

3. **Templates Separate (`.claude/templates/`):**
   - Vision template separate from code
   - Easy to modify without code changes
   - Supports future template variants

**Anti-Pattern (AVOID):**

❌ **Don't make /2l-improve one giant Bash script**
- Hard to test individual components
- Difficult to reuse pattern detection logic
- Bash is poor for complex string manipulation
- Hard to maintain

❌ **Don't create new agents for /2l-improve**
- /2l-improve is orchestrator, not agent
- Spawning agents adds complexity
- Direct Python calls are simpler and faster

---

### 5.2 CLI Interface Design

**Main Command:**

```bash
# commands/2l-improve.md

# /2l-improve - Self-Improvement Command
#
# Usage:
#   /2l-improve              # Interactive: show patterns, confirm, improve
#   /2l-improve --manual     # Show patterns, save vision, exit (user runs /2l-mvp)
#   /2l-improve --dry-run    # Show what would be done, don't modify
#   /2l-improve --pattern PATTERN-003  # Improve specific pattern (skip selection)

# Default mode: Interactive
mode="interactive"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --manual)
            mode="manual"
            shift
            ;;
        --dry-run)
            mode="dry-run"
            shift
            ;;
        --pattern)
            selected_pattern_id="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ... (implementation)
```

**Helper Scripts:**

```bash
# lib/2l-pattern-detector.py

#!/usr/bin/env python3
"""
2L Pattern Detector - Identify recurring patterns from global learnings

Usage:
    python3 2l-pattern-detector.py --global-learnings .2L/global-learnings.yaml \
                                   --min-occurrences 2 \
                                   --min-severity medium \
                                   --output patterns.json
"""

import argparse
import yaml
import json

def main():
    parser = argparse.ArgumentParser(description='Detect recurring patterns')
    parser.add_argument('--global-learnings', required=True)
    parser.add_argument('--min-occurrences', type=int, default=2)
    parser.add_argument('--min-severity', default='medium')
    parser.add_argument('--output', default='-')  # stdout by default
    
    args = parser.parse_args()
    
    # Detect patterns
    patterns = detect_recurring_patterns(
        args.global_learnings,
        min_occurrences=args.min_occurrences,
        min_severity=args.min_severity
    )
    
    # Output as JSON
    if args.output == '-':
        print(json.dumps(patterns, indent=2))
    else:
        with open(args.output, 'w') as f:
            json.dump(patterns, f, indent=2)

if __name__ == '__main__':
    main()
```

```bash
# lib/2l-vision-generator.py

#!/usr/bin/env python3
"""
2L Vision Generator - Auto-generate improvement visions from patterns

Usage:
    python3 2l-vision-generator.py --pattern-json pattern.json \
                                   --template .claude/templates/improvement-vision.md \
                                   --output .2L/plan-5/vision.md
"""

import argparse
import json
from datetime import datetime

def main():
    parser = argparse.ArgumentParser(description='Generate improvement vision')
    parser.add_argument('--pattern-json', required=True)
    parser.add_argument('--template', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--plan-id', required=True)
    
    args = parser.parse_args()
    
    # Load pattern
    with open(args.pattern_json, 'r') as f:
        pattern = json.load(f)
    
    # Generate vision
    vision_content = generate_improvement_vision(
        pattern,
        args.plan_id,
        template_path=args.template
    )
    
    # Write vision
    with open(args.output, 'w') as f:
        f.write(vision_content)
    
    print(f"Vision generated: {args.output}")

if __name__ == '__main__':
    main()
```

**Integration in /2l-improve:**

```bash
# In commands/2l-improve.md

# Step 1: Detect patterns
echo "🔍 Detecting recurring patterns..."

patterns_json=$(mktemp)
python3 ~/.claude/lib/2l-pattern-detector.py \
    --global-learnings .2L/global-learnings.yaml \
    --min-occurrences 2 \
    --min-severity medium \
    --output "$patterns_json"

pattern_count=$(python3 -c "import json; print(len(json.load(open('$patterns_json'))))")

if [ "$pattern_count" -eq 0 ]; then
    echo "✅ No recurring patterns detected"
    rm "$patterns_json"
    exit 0
fi

echo "   Found $pattern_count recurring patterns"

# Step 2: Select pattern (interactive)
if [ -z "$selected_pattern_id" ]; then
    # Show top 5 patterns
    python3 -c "
import json
patterns = json.load(open('$patterns_json'))
print('\nTop patterns by impact:')
for i, p in enumerate(patterns[:5], 1):
    print(f'{i}. {p[\"name\"]} ({p[\"pattern_id\"]})')
    print(f'   Severity: {p[\"severity\"]} | Occurrences: {p[\"occurrences\"]} | Impact: {p[\"impact_score\"]:.1f}')
    print()
"
    
    read -p "Select pattern (1-5, or 'q' to quit): " selection
    
    if [ "$selection" = "q" ]; then
        echo "Cancelled"
        rm "$patterns_json"
        exit 0
    fi
    
    selected_pattern_id=$(python3 -c "
import json
patterns = json.load(open('$patterns_json'))
idx = int('$selection') - 1
print(patterns[idx]['pattern_id'])
")
fi

# Extract selected pattern
selected_pattern_json=$(mktemp)
python3 -c "
import json
patterns = json.load(open('$patterns_json'))
pattern = next(p for p in patterns if p['pattern_id'] == '$selected_pattern_id')
with open('$selected_pattern_json', 'w') as f:
    json.dump(pattern, f, indent=2)
"

# Step 3: Generate vision
next_plan_id=$(determine_next_plan_id)
vision_path=".2L/${next_plan_id}/vision.md"

mkdir -p ".2L/${next_plan_id}"

python3 ~/.claude/lib/2l-vision-generator.py \
    --pattern-json "$selected_pattern_json" \
    --template ~/.claude/templates/improvement-vision.md \
    --output "$vision_path" \
    --plan-id "$next_plan_id"

echo "   ✅ Vision generated: $vision_path"

# Cleanup
rm "$patterns_json" "$selected_pattern_json"
```

**Key Principles:**
- Bash for CLI and orchestration
- Python for logic and data processing
- JSON for inter-process communication
- Temp files for intermediate data
- Clean up temp files after use

---

### 5.3 Unit Testing Strategy

**Python Unit Tests:**

```python
# tests/test_pattern_detector.py

import pytest
import yaml
from lib.2l_pattern_detector import (
    detect_recurring_patterns,
    calculate_impact_score,
    filter_by_status
)

def test_detect_recurring_patterns():
    """Test pattern detection with minimum thresholds."""
    # Create test data
    test_data = {
        'schema_version': '1.0',
        'patterns': [
            {
                'pattern_id': 'PATTERN-001',
                'severity': 'critical',
                'occurrences': 3,
                'status': 'IDENTIFIED',
                'projects': ['proj1', 'proj2']
            },
            {
                'pattern_id': 'PATTERN-002',
                'severity': 'medium',
                'occurrences': 1,  # Below threshold
                'status': 'IDENTIFIED',
                'projects': ['proj1']
            },
            {
                'pattern_id': 'PATTERN-003',
                'severity': 'critical',
                'occurrences': 2,
                'status': 'IMPLEMENTED',  # Wrong status
                'projects': ['proj3']
            }
        ]
    }
    
    # Write test file
    with open('/tmp/test-learnings.yaml', 'w') as f:
        yaml.dump(test_data, f)
    
    # Detect patterns
    patterns = detect_recurring_patterns(
        '/tmp/test-learnings.yaml',
        min_occurrences=2,
        min_severity='medium'
    )
    
    # Assertions
    assert len(patterns) == 1, "Should find only PATTERN-001"
    assert patterns[0]['pattern_id'] == 'PATTERN-001'

def test_impact_score_calculation():
    """Test impact score calculation formula."""
    pattern = {
        'severity': 'critical',
        'occurrences': 3,
        'projects': ['proj1', 'proj2']
    }
    
    score = calculate_impact_score(pattern)
    
    # critical=10, occurrences=3, multi-project=1.5
    # Expected: 10 * 3 * 1.5 = 45
    assert score == 45.0

def test_status_filtering():
    """Test filtering patterns by status."""
    patterns = [
        {'pattern_id': 'P1', 'status': 'IDENTIFIED'},
        {'pattern_id': 'P2', 'status': 'IMPLEMENTED'},
        {'pattern_id': 'P3', 'status': 'IDENTIFIED'},
        {'pattern_id': 'P4'},  # Missing status (defaults to IDENTIFIED)
    ]
    
    identified = filter_by_status(patterns, 'IDENTIFIED')
    
    assert len(identified) == 3
    assert identified[0]['pattern_id'] == 'P1'
    assert identified[1]['pattern_id'] == 'P3'
    assert identified[2]['pattern_id'] == 'P4'
```

**Bash Integration Tests:**

```bash
# tests/test_2l_improve.sh

#!/usr/bin/env bash

# Test /2l-improve dry-run mode

test_dry_run() {
    echo "Testing /2l-improve --dry-run..."
    
    # Create test global learnings
    mkdir -p /tmp/2l-test/.2L
    cat > /tmp/2l-test/.2L/global-learnings.yaml <<'EOF'
schema_version: "1.0"
patterns:
  - pattern_id: "PATTERN-001"
    name: "Test pattern"
    severity: "critical"
    occurrences: 3
    status: "IDENTIFIED"
    projects: ["test1", "test2"]
    root_cause: "Test root cause"
    proposed_solution: "Test solution"
