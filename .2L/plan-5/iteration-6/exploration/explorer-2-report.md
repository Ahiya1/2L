# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

Plan 5 Iteration 1 requires a focused technology stack built on existing 2L infrastructure: YAML for data persistence, Bash for orchestration logic, and Python for YAML manipulation. The implementation extends existing agents (validator, orchestrator) rather than creating new systems. Critical dependencies include PyYAML (available), event logging library (exists), and symlink-based architecture (confirmed working). File I/O safety patterns must use atomic writes via temp files for global-learnings.yaml.

## Discoveries

### Technology Availability Assessment

**YAML Processing:**
- PyYAML library: AVAILABLE (confirmed via python3 -c "import yaml")
- No yq binary available, but not needed (Python YAML handling sufficient)
- YAML format already in use: config.yaml, master-plan.yaml (familiar pattern)

**Event Logging Infrastructure:**
- Event logger library: EXISTS at ~/.claude/lib/2l-event-logger.sh
- Function signature: log_2l_event "event_type" "data" "phase" "agent_id"
- Graceful degradation: Fails silently if unavailable (backward compatible)
- Already integrated into validator and orchestrator

**Symlink Architecture:**
- Confirmed working: ~/.claude/agents -> ~/Ahiya/2L/agents
- Confirmed working: ~/.claude/commands -> ~/Ahiya/2L/commands  
- Confirmed working: ~/.claude/lib -> ~/Ahiya/2L/lib
- Immediate live updates: Changes to ~/Ahiya/2L/ affect running agents instantly
- Backup mechanism exists: agents.backup.* directories for safety

**File System:**
- .2L/ directory structure: ESTABLISHED across all projects
- Atomic write patterns: Referenced in master explorer reports
- Python file I/O: Standard library (os, tempfile, shutil) available

### Existing Code Patterns from Agents

**Validator Agent (2l-validator.md) - Learning Capture Extension Point:**

Current pattern:
```markdown
## Status
**PASS** | **UNCERTAIN** | **PARTIAL** | **INCOMPLETE** | **FAIL**

## Issues Summary

### Critical Issues (Block deployment)
{Issues that MUST be fixed}

1. **{Issue}**
   - Category: {TypeScript / Test / Build / etc.}
   - Location: {File/line}
   - Impact: {Description}
   - Suggested fix: {Recommendation}
```

Extension needed:
- After creating validation-report.md with FAIL status
- Create learnings.yaml with structured data from "Issues Summary" section
- Map "Critical Issues" to severity: critical
- Map "Major Issues" to severity: medium
- Extract category, location, impact, suggested fix as learning fields

**Orchestrator (2l-mvp.md) - Reflection Extension Point:**

Current iteration completion pattern (line 1390-1402):
```python
if validation_status == 'PASS':
    print(f"      ✅ Healing successful!")
    
    # EVENT: iteration_complete
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
      log_2l_event "iteration_complete" "Iteration ${global_iter} completed after healing" "complete" "orchestrator"
    fi
    
    return  # Iteration complete!
```

Extension needed:
- Before `return`, after event emission
- Check if `.2L/plan-{id}/iteration-{N}/learnings.yaml` exists
- If exists, merge into `.2L/global-learnings.yaml`
- Add metadata: discovered_in, status: IDENTIFIED

**Event Logger (lib/2l-event-logger.sh) - Re-validation Events:**

Current event types (from 2l-mvp.md):
- plan_start, complexity_decision, phase_change
- agent_spawn, agent_complete
- iteration_start, validation_result, iteration_complete

Extension needed:
- validation_result already exists
- Can use existing event types for re-validation
- Re-validation is just another validation_result event
- No new event types needed (infrastructure ready)

## Patterns Identified

### Pattern 1: YAML Data Persistence

**Description:** YAML as structured data format for learnings and global aggregation

**Use Case:** 
- Per-iteration learnings: `.2L/plan-{id}/iteration-{N}/learnings.yaml`
- Global aggregation: `.2L/global-learnings.yaml`

**Example Structure (per-iteration):**
```yaml
project: wealth
plan: plan-3
iteration: iteration-2
created_at: "2025-11-19T15:30:00Z"

learnings:
  - id: wealth-20251119-001
    iteration: plan-3-iter-2
    category: validation
    severity: critical
    issue: "TypeScript compilation failed: Cannot find module 'lib/supabase'"
    root_cause: "Missing import path in tsconfig.json paths configuration"
    solution: "Add 'lib/*': ['src/lib/*'] to tsconfig.json compilerOptions.paths"
    recurrence_risk: high
    affected_files:
      - "tsconfig.json"
      - "src/components/AuthProvider.tsx"
  
  - id: wealth-20251119-002
    iteration: plan-3-iter-2
    category: integration
    severity: medium
    issue: "Duplicate Button component implementations in zones 1 and 3"
    root_cause: "Builders working in parallel created separate implementations"
    solution: "Consolidate to single Button component in src/components/ui/"
    recurrence_risk: medium
    affected_files:
      - "src/components/ui/Button.tsx"
      - "src/components/layout/Button.tsx"
```

**Example Structure (global aggregation):**
```yaml
aggregated_at: "2025-11-19T16:00:00Z"
total_projects: 7
total_learnings: 45
schema_version: "1.0"

patterns:
  - pattern_id: PATTERN-001
    name: "TypeScript path resolution failures"
    occurrences: 3
    projects: [wealth, ai-mafia, ShipLog]
    severity: critical
    root_cause: "tsconfig.json paths not configured before builders create imports"
    proposed_solution: "Add tsconfig.json validation to planner phase"
    status: IDENTIFIED
    discovered_in: plan-3-iter-2
    discovered_at: "2025-11-19T15:30:00Z"
    source_learnings:
      - wealth-20251119-001
      - ai-mafia-20251015-003
      - shiplog-20251012-002
  
  - pattern_id: PATTERN-002
    name: "Duplicate component implementations"
    occurrences: 2
    projects: [wealth, SplitEasy]
    severity: medium
    root_cause: "Integration planner doesn't check for duplicate file names across zones"
    proposed_solution: "Add duplicate detection to iplanner zone assignment"
    status: IMPLEMENTED
    discovered_in: plan-2-iter-1
    implemented_in: plan-5-iter-2
    implemented_at: "2025-11-20T10:15:00Z"
    source_learnings:
      - wealth-20251119-002
      - spliteasy-20251110-005
  
  - pattern_id: PATTERN-003
    name: "Healing success not verified"
    occurrences: 4
    projects: [ai-mafia, ShipLog, mirror-of-dreams, ghstats]
    severity: high
    root_cause: "Orchestrator marks iteration complete after healing without re-validation"
    proposed_solution: "Add re-validation checkpoint after healing completes"
    status: VERIFIED
    discovered_in: plan-1-iter-1
    implemented_in: plan-5-iter-1
    verified_at: "2025-11-19T18:00:00Z"
    source_learnings:
      - ai-mafia-20251013-001
      - shiplog-20251012-004
      - mirror-20251105-002
      - ghstats-20251101-001
```

**Recommendation:** Use YAML throughout. Consistent with existing patterns (config.yaml, master-plan.yaml). Human-readable for debugging. Python PyYAML library handles parsing/writing.

---

### Pattern 2: Atomic File Writes for Global State

**Description:** Prevent corrupted global-learnings.yaml via temp file + atomic rename

**Use Case:** 
- Orchestrator reflection merging learnings
- /2l-improve updating learning status (IDENTIFIED → IMPLEMENTED)

**Example Implementation:**
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

# Usage in orchestrator reflection:
def merge_learnings_to_global(iteration_learnings_path, global_learnings_path):
    """
    Merge iteration learnings into global learnings atomically.
    """
    # Read iteration learnings
    with open(iteration_learnings_path, 'r') as f:
        iteration_data = yaml.safe_load(f)
    
    # Read or initialize global learnings
    if os.path.exists(global_learnings_path):
        with open(global_learnings_path, 'r') as f:
            global_data = yaml.safe_load(f)
    else:
        global_data = {
            'aggregated_at': datetime.now().isoformat(),
            'total_projects': 0,
            'total_learnings': 0,
            'schema_version': '1.0',
            'patterns': []
        }
    
    # Merge new learnings
    for learning in iteration_data.get('learnings', []):
        # Convert to pattern format
        pattern = {
            'pattern_id': generate_pattern_id(),
            'name': learning['issue'][:50],  # Truncate for readability
            'occurrences': 1,
            'projects': [iteration_data['project']],
            'severity': learning['severity'],
            'root_cause': learning['root_cause'],
            'proposed_solution': learning['solution'],
            'status': 'IDENTIFIED',
            'discovered_in': learning['iteration'],
            'discovered_at': iteration_data['created_at'],
            'source_learnings': [learning['id']]
        }
        
        # Check for duplicate patterns (same root_cause + issue)
        existing = find_similar_pattern(global_data['patterns'], pattern)
        if existing:
            # Increment occurrence count
            existing['occurrences'] += 1
            if iteration_data['project'] not in existing['projects']:
                existing['projects'].append(iteration_data['project'])
            existing['source_learnings'].append(learning['id'])
        else:
            # Add new pattern
            global_data['patterns'].append(pattern)
            global_data['total_learnings'] += 1
    
    # Update metadata
    global_data['aggregated_at'] = datetime.now().isoformat()
    
    # Atomic write
    atomic_write_yaml(global_learnings_path, global_data)
```

**Why This Pattern:**
- Prevents partial writes if orchestrator crashes mid-merge
- Temp file is in same directory (same filesystem) for true atomic rename
- If process crashes, temp file (.tmp_*.yaml) can be cleaned up manually
- Python's shutil.move() uses os.rename() which is atomic on POSIX systems

**Recommendation:** Use atomic writes for all global-learnings.yaml modifications. Critical for orchestrator reflection and /2l-improve status updates.

---

### Pattern 3: Graceful Event Emission

**Description:** Optional event logging that fails silently if unavailable

**Use Case:** Re-validation checkpoints emitting events for dashboard observability

**Example from validator agent:**
```bash
# Source event logger if available
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"

  # Emit agent_start event
  log_2l_event "agent_start" "Validator: Starting comprehensive validation" "validation" "validator"
fi
```

**Re-validation checkpoint pattern:**
```bash
# In orchestrator after healing completes

# Re-spawn validator for re-validation
echo "      Re-validating after healing..."

# EVENT: Re-validation start
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "phase_change" "Starting re-validation after healing" "validation" "orchestrator"
fi

validation_report_heal = f"{healing_dir}/validation-report.md"

spawn_task(
    type="2l-validator",
    prompt=f"Re-validate after healing attempt {healing_attempt}.
    
Run full validation suite again to verify healing fixed the issues.

Create report at: {healing_dir}/validation-report.md"
)

# Check re-validation result
validation_status = extract_validation_status(validation_report_heal)

# EVENT: Re-validation result
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "validation_result" "Re-validation: ${validation_status}" "validation" "validator-revalidation"
fi

if validation_status == 'PASS':
    # Healing successful
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
      log_2l_event "iteration_complete" "Iteration completed after successful healing" "complete" "orchestrator"
    fi
    return
elif healing_attempt < max_healing_attempts:
    # Try healing again
    healing_attempt += 1
    continue
else:
    # Escalate to user
    raise Exception("Healing failed after max attempts - manual intervention required")
```

**Recommendation:** Continue using graceful event emission pattern. Already proven in existing agents. Enables dashboard observability without breaking backward compatibility.

---

### Pattern 4: Validator Extension for Learning Capture

**Description:** Extend validation report generation to create learnings.yaml when FAIL

**Use Case:** Validators automatically capture structured learnings on failure

**Current validator report structure (relevant sections):**
```markdown
## Status
**FAIL**

## Issues Summary

### Critical Issues (Block deployment)
1. **TypeScript compilation error**
   - Category: TypeScript
   - Location: src/lib/supabase.ts:12
   - Impact: Application won't build
   - Suggested fix: Add missing import for SupabaseClient type

### Major Issues (Should fix before deployment)  
1. **Integration test failure**
   - Category: Test
   - Location: tests/integration/auth.test.ts
   - Impact: Auth flow not verified
   - Suggested fix: Update test to use new Supabase client initialization
```

**Extension logic (add to validator after writing validation-report.md):**
```python
# After validation report is written
if validation_status == 'FAIL':
    # Extract learnings from validation report
    learnings = extract_learnings_from_report(validation_report)
    
    if learnings:
        # Create learnings.yaml
        learnings_path = f"{validation_dir}/learnings.yaml"
        
        learnings_data = {
            'project': get_project_name(),
            'plan': get_current_plan(),
            'iteration': f"iteration-{global_iter}",
            'created_at': datetime.now().isoformat(),
            'learnings': []
        }
        
        # Convert issues to learning format
        for issue in learnings:
            learning = {
                'id': generate_learning_id(),
                'iteration': f"plan-{plan_id}-iter-{global_iter}",
                'category': issue['category'].lower(),
                'severity': 'critical' if issue['is_critical'] else 'medium',
                'issue': issue['title'],
                'root_cause': issue.get('impact', 'Unknown'),
                'solution': issue.get('suggested_fix', 'Requires investigation'),
                'recurrence_risk': estimate_recurrence_risk(issue),
                'affected_files': extract_files_from_location(issue['location'])
            }
            learnings_data['learnings'].append(learning)
        
        # Write learnings.yaml (not atomic - single validator write)
        with open(learnings_path, 'w') as f:
            yaml.dump(learnings_data, f, default_flow_style=False)
        
        print(f"   📝 Created learnings.yaml with {len(learnings)} learning(s)")
```

**Recommendation:** Implement learning capture in validator agent. Minimal code change (~50 lines). Reuses existing issue extraction logic from validation report generation.

## Complexity Assessment

### High Complexity Areas

**Feature 5: /2l-improve Command (COMPLEX)**

Why complex:
- Pattern detection across multiple projects (must scan Prod/**/.2L/)
- Duplicate learning detection (same issue across projects)
- Vision auto-generation from data (novel workflow vs. /2l-vision conversation)
- Orchestrator spawning (meta-circular: 2L improving itself)
- Status lifecycle updates (IDENTIFIED → IMPLEMENTED → VERIFIED)

Estimated builder splits: 2 builders
- Builder 1: Learning aggregation + pattern detection (reads YAML, detects duplicates)
- Builder 2: Vision auto-generation + orchestration trigger (creates vision.md, spawns /2l-mvp)

Complexity factors:
- Must preserve learning history (append-only, never delete)
- Must handle git conflicts during self-modification (abort and notify)
- Must verify symlinks before modifying (safety check)
- Must track status to prevent duplicate fixes

---

### Medium Complexity Areas

**Feature 2: Re-validation Checkpoint (MEDIUM)**

Why medium:
- Extends orchestrator healing loop (existing complex code)
- Must prevent infinite healing loops (max 2 attempts)
- Requires validator re-spawning after healing
- Event emission for dashboard

Estimated builder splits: 1 builder (no split needed)

Complexity factors:
- Modify existing orchestrator logic (careful not to break)
- Must handle healing failure escalation (manual intervention)
- Edge case: healing introduces new bugs (re-validation catches them)

---

**Feature 4: Orchestrator Reflection (MEDIUM)**

Why medium:
- Modifies orchestrator iteration completion flow
- Requires atomic writes to global-learnings.yaml (file corruption risk)
- Must merge learnings from iteration into global patterns
- Duplicate detection when merging

Estimated builder splits: 1 builder (no split needed)

Complexity factors:
- Atomic write pattern required (temp file + rename)
- Must detect similar patterns (same root_cause across projects)
- Metadata enrichment (add discovered_in, status, timestamps)

---

### Low Complexity Areas

**Feature 1: Per-iteration Learning Capture (LOW)**

Why low:
- Simple YAML file creation after validation
- Reuses existing validator issue extraction logic
- No complex data transformations
- Single-file write (no atomicity needed)

Estimated builder splits: 1 builder (no split needed)

Complexity factors:
- Must map validation categories to learning categories
- Must estimate severity (critical vs. medium)
- Must parse file locations from validation report

---

**Feature 3: Learning Aggregation System (LOW-MEDIUM)**

Why low-medium:
- File scanning with find command (simple)
- YAML parsing with PyYAML (straightforward)
- Status tracking is simple enum (IDENTIFIED, IMPLEMENTED, VERIFIED)

Estimated builder splits: 1 builder (combined with Feature 5 Builder 1)

Complexity factors:
- Must scan multiple project directories (Prod/**/.2L/)
- Must preserve existing global-learnings.yaml structure
- Must update status fields without corrupting file

## Technology Recommendations

### Primary Stack

**Language: Bash + Python**
- **Bash:** Orchestrator logic extensions (re-validation, reflection hooks)
- **Python:** YAML manipulation, learning aggregation, pattern detection
- **Rationale:** Consistent with existing orchestrator (Bash) and allows PyYAML for data processing

**Data Format: YAML**
- **Choice:** PyYAML (Python standard library compatible)
- **Rationale:** 
  - Already in use (config.yaml, master-plan.yaml)
  - Human-readable for debugging
  - Supports nested structures (learnings with metadata)
  - Python PyYAML available (confirmed)

**File I/O: Python os + tempfile + shutil**
- **Choice:** Standard library modules
- **Rationale:**
  - Atomic writes via tempfile + shutil.move()
  - No external dependencies
  - Cross-platform (Linux/macOS)

**Event Logging: Existing lib/2l-event-logger.sh**
- **Choice:** Bash function library (already exists)
- **Rationale:**
  - Proven working in orchestrator and agents
  - Graceful degradation (fails silently if unavailable)
  - JSON Lines format for events.jsonl

### Supporting Libraries

**PyYAML (yaml module in Python)**
- **Purpose:** Parse and write YAML files
- **Why needed:** Learning capture, aggregation, global-learnings manipulation
- **Installation:** Already available (confirmed via python3 -c "import yaml")

**Python Standard Library (os, tempfile, shutil, datetime)**
- **Purpose:** File operations, atomic writes, timestamp generation
- **Why needed:** Orchestrator reflection, learning merge, pattern aggregation
- **Installation:** Included with Python (no extra deps)

**Event Logger Library (lib/2l-event-logger.sh)**
- **Purpose:** Emit events for dashboard observability
- **Why needed:** Re-validation checkpoints, orchestrator reflection tracking
- **Installation:** Already exists at ~/.claude/lib/2l-event-logger.sh

## Integration Points

### External APIs

**None required.**

This is a purely internal infrastructure feature. No external API calls needed.

### Internal Integrations

**Validator Agent (2l-validator.md) ↔ Learning Capture**

How they connect:
- Validator creates validation-report.md with status: FAIL
- After report written, validator extracts issues from report
- Validator creates learnings.yaml in same directory as validation-report.md
- Format: Project, iteration, list of learnings with severity

Data flow:
```
Validator runs checks
  ↓
Creates validation-report.md (existing)
  ↓
If status == FAIL:
  Extracts issues from report
  Creates learnings.yaml
  ↓
Orchestrator reads learnings.yaml for reflection
```

Integration challenges:
- Must preserve existing validator report format (backward compatibility)
- Must handle validator failures gracefully (learning capture is optional)
- Must map validation issue categories to learning categories

---

**Orchestrator (2l-mvp.md) ↔ Re-validation Checkpoint**

How they connect:
- Orchestrator detects validation_status == FAIL
- Spawns healer(s) to fix issues
- After healing completes, orchestrator re-spawns validator
- Validator creates new validation-report.md in healing-{N}/ directory
- Orchestrator checks re-validation status

Data flow:
```
Orchestrator runs validation
  ↓
Validation FAILS
  ↓
Orchestrator spawns healers
  ↓
Healers fix issues
  ↓
Orchestrator re-spawns validator (NEW)
  ↓
Validator re-runs all checks
  ↓
If PASS: Mark iteration complete
If FAIL: Try healing again OR escalate
```

Integration challenges:
- Must modify orchestrator healing loop (complex existing code)
- Must prevent infinite healing loops (max 2 attempts)
- Must emit events for dashboard (re-validation start, result)
- Must handle edge case: healing introduces new bugs

---

**Orchestrator (2l-mvp.md) ↔ Orchestrator Reflection**

How they connect:
- After validation PASSES (first-pass or after healing)
- Before git commit
- Orchestrator checks if learnings.yaml exists in iteration directory
- If exists, orchestrator merges into .2L/global-learnings.yaml
- Uses atomic write pattern (temp file + rename)

Data flow:
```
Iteration completes successfully
  ↓
Orchestrator checks for learnings.yaml
  ↓
If exists:
  Read iteration learnings
  Read global-learnings.yaml (or initialize)
  Merge new learnings with status: IDENTIFIED
  Add metadata (discovered_in, discovered_at)
  Atomic write to global-learnings.yaml
  ↓
Emit iteration_complete event
Git commit
```

Integration challenges:
- Must use atomic writes (prevent corruption if orchestrator crashes)
- Must detect duplicate patterns (same root_cause across projects)
- Must preserve learning history (append-only, never delete)
- Must handle missing global-learnings.yaml (first run initialization)

---

**Event Logger (lib/2l-event-logger.sh) ↔ Re-validation Events**

How they connect:
- Orchestrator sources event logger library at startup
- Emits phase_change event for re-validation start
- Validator emits validation_result event for re-validation outcome
- Orchestrator emits iteration_complete event after successful re-validation

Event types for re-validation:
- phase_change: "Starting re-validation after healing" (orchestrator)
- validation_result: "Re-validation: PASS" or "Re-validation: FAIL" (validator)
- iteration_complete: "Iteration completed after successful healing" (orchestrator)

Integration challenges:
- Must preserve backward compatibility (graceful degradation if library unavailable)
- Must use existing event types (no new event types needed)
- Must distinguish re-validation from first-pass validation (via agent_id or data field)

## Risks & Challenges

### Technical Risks

**Risk 1: Global Learnings File Corruption**

Impact: HIGH - Loss of all accumulated learnings if file corrupted during write

Mitigation strategy:
- Use atomic write pattern (temp file + rename)
- Backup global-learnings.yaml before each merge (copy to .bak file)
- Implement schema validation on read (detect corruption early)
- Add checksum/hash field to detect tampering

Code pattern:
```python
# Backup before atomic write
if os.path.exists(global_learnings_path):
    backup_path = global_learnings_path + '.bak'
    shutil.copy2(global_learnings_path, backup_path)

# Atomic write
atomic_write_yaml(global_learnings_path, global_data)
```

---

**Risk 2: Infinite Healing Loop**

Impact: HIGH - Orchestrator never completes iteration, wastes time/resources

Mitigation strategy:
- Hard limit: max 2 healing attempts per iteration
- After 2 attempts, escalate to manual intervention
- Emit event on each healing attempt (dashboard shows loop)
- Validate that healing changed something (git diff check)

Code pattern:
```python
max_healing_attempts = 2
healing_attempt = 1

while healing_attempt <= max_healing_attempts:
    # Healing logic...
    
    # Re-validate
    validation_status = extract_validation_status(validation_report_heal)
    
    if validation_status == 'PASS':
        return  # Success!
    
    elif healing_attempt < max_healing_attempts:
        # Check if healing changed anything
        git_diff = run_command("git diff --stat")
        if not git_diff.strip():
            # Healing made no changes, escalate immediately
            raise Exception("Healing made no changes - manual intervention required")
        
        healing_attempt += 1
        continue
    
    else:
        # Max attempts reached, escalate
        raise Exception(f"Healing failed after {max_healing_attempts} attempts - manual intervention required")
```

---

**Risk 3: Symlink Breakage During Self-Modification**

Impact: CRITICAL - /2l-improve modifies live agents, could break running orchestration

Mitigation strategy:
- Verify symlinks before /2l-improve runs (readlink -f check)
- Never modify orchestrator during self-improvement (only agents/commands)
- Abort if git working directory is dirty (uncommitted changes)
- Create git tag before self-modification (easy rollback)

Code pattern:
```bash
# Verify symlinks before self-modification
verify_symlinks() {
    local agents_target=$(readlink -f ~/.claude/agents)
    local expected_target="$HOME/Ahiya/2L/agents"
    
    if [ "$agents_target" != "$expected_target" ]; then
        echo "❌ ERROR: Symlinks broken or misconfigured"
        echo "   Expected: ~/.claude/agents -> $expected_target"
        echo "   Actual:   ~/.claude/agents -> $agents_target"
        return 1
    fi
    
    # Check commands and lib symlinks similarly
    return 0
}

# Before /2l-improve modifies files
if ! verify_symlinks; then
    echo "❌ Cannot proceed with self-modification - fix symlinks first"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Working directory has uncommitted changes - commit or stash first"
    exit 1
fi

# Create safety tag before modification
git tag "2l-pre-improve-$(date +%Y%m%d-%H%M%S)"

# Proceed with self-modification...
```

### Complexity Risks

**Risk: /2l-improve Pattern Detection False Positives**

Likelihood: MEDIUM - May group unrelated issues as "same pattern"

Impact if occurs:
- Waste time fixing non-recurring issues
- Miss actual high-impact patterns
- Generate bloated vision.md with too many items

Mitigation:
- Use conservative similarity threshold (exact root_cause match)
- Rank by severity × occurrences (prioritize high-impact)
- Limit vision.md to top 2-3 patterns (avoid scope creep)
- Manual override flag: --manual (shows patterns, user picks)

Code pattern:
```python
def find_similar_pattern(existing_patterns, new_pattern):
    """
    Conservative similarity check - exact root_cause match required.
    """
    for pattern in existing_patterns:
        # Exact match on root_cause field (no fuzzy matching)
        if pattern['root_cause'] == new_pattern['root_cause']:
            # Optional: Also check severity matches
            if pattern['severity'] == new_pattern['severity']:
                return pattern
    return None

def rank_patterns_by_impact(patterns):
    """
    Rank patterns by impact: severity × occurrences
    """
    severity_weight = {
        'critical': 10,
        'high': 7,
        'medium': 4,
        'low': 1
    }
    
    for pattern in patterns:
        weight = severity_weight.get(pattern['severity'], 1)
        pattern['impact_score'] = weight * pattern['occurrences']
    
    # Sort by impact score descending
    return sorted(patterns, key=lambda p: p['impact_score'], reverse=True)
```

## Recommendations for Planner

### 1. Use PyYAML for All Data Persistence (HIGH PRIORITY)

**Rationale:**
- Already available (confirmed: python3 -c "import yaml" works)
- Consistent with existing patterns (config.yaml, master-plan.yaml)
- Human-readable format aids debugging
- Supports nested structures needed for learnings

**Implementation:**
- Feature 1 (learning capture): Validator writes learnings.yaml via PyYAML
- Feature 3 (aggregation): Python script reads/merges YAML files
- Feature 4 (reflection): Orchestrator uses Python helper for YAML merge
- Feature 5 (/2l-improve): Python script for pattern detection + vision gen

**Avoid:**
- Don't use yq (not available, adds dependency)
- Don't use JSON (less human-readable, harder to edit manually)
- Don't use shell string manipulation for YAML (fragile, error-prone)

---

### 2. Implement Atomic Writes for Global State (CRITICAL)

**Rationale:**
- Prevents data loss if orchestrator crashes during merge
- Global-learnings.yaml is append-only (never delete historical data)
- Corruption would lose all accumulated wisdom across projects

**Implementation:**
- Use temp file + shutil.move() pattern (atomic on POSIX)
- Create .bak backup before each write (safety net)
- Write to same directory as target file (ensures same filesystem)

**Code location:**
- Helper function: ~/.claude/lib/2l-yaml-helpers.py (new file)
- Used by: Orchestrator reflection, /2l-improve status updates

**Test plan:**
- Verify atomic write works: kill -9 python process mid-write
- Verify backup created: check .bak file exists after merge
- Verify recovery: restore from .bak if corruption detected

---

### 3. Extend Existing Agents Rather Than Create New Ones (HIGH PRIORITY)

**Rationale:**
- Validator agent already extracts issues (reuse logic for learning capture)
- Orchestrator already has iteration completion hook (add reflection there)
- Event logger already exists (no new infrastructure needed)

**Implementation:**
- Validator: Add 50 lines of Python after validation-report.md creation
- Orchestrator: Add 100 lines of Bash/Python after validation PASS
- No new agent files needed (2l-validator.md, 2l-mvp.md modified only)

**Avoid:**
- Don't create 2l-learning-capturer.md (unnecessary new agent)
- Don't create 2l-reflector.md (orchestrator handles reflection)
- Don't create new event types (reuse existing: validation_result, iteration_complete)

---

### 4. Hard-Code Re-validation Limit to 2 Attempts (HIGH PRIORITY)

**Rationale:**
- Prevents infinite healing loops (HIGH risk without limit)
- 2 attempts is sufficient (1st healing fixes obvious issues, 2nd catches edge cases)
- After 2 failures, manual intervention is more efficient than more healing

**Implementation:**
- Orchestrator healing loop: max_healing_attempts = 2
- After 2nd re-validation FAIL, raise exception with clear message
- Exception triggers manual intervention prompt (shows validation report path)

**Edge case handling:**
- If healing makes no git changes: Escalate immediately (don't waste 2nd attempt)
- If re-validation introduces new bugs: Count as same attempt (healer failed)

---

### 5. Defer MCP-Based Validation Enhancement (LOW PRIORITY)

**Rationale:**
- Core learning capture works without MCP enhancements
- MCP servers are optional (graceful degradation already implemented)
- Iteration 1 focus is foundation (learning capture, re-validation, reflection)

**Defer to future iteration:**
- Using Playwright MCP to validate learning quality (optional enhancement)
- Using Chrome DevTools MCP to analyze performance regressions (nice-to-have)

**Current scope:**
- Validators already document MCP unavailability in reports
- Learning capture works from any validation report (MCP or non-MCP)

---

### 6. Design YAML Schema for Forward Compatibility (MEDIUM PRIORITY)

**Rationale:**
- Learning format will evolve (new fields, new severities, new statuses)
- Must not break existing learnings when schema changes
- Version field enables schema migration

**Schema design:**
```yaml
# Per-iteration learnings.yaml
schema_version: "1.0"  # Enable future migrations
project: wealth
# ... rest of structure

# Global learnings.yaml  
schema_version: "1.0"  # Enable future migrations
aggregated_at: "2025-11-19T16:00:00Z"
# ... rest of structure
```

**Future-proofing:**
- Add schema_version field to both formats (default: "1.0")
- If reading schema_version > known version, emit warning but continue
- Document schema changes in .2L/SCHEMA_CHANGELOG.md

**Avoid:**
- Don't assume schema is fixed forever
- Don't use unversioned YAML (makes migration harder)

## Resource Map

### Critical Files/Directories

**~/.claude/agents/2l-validator.md**
- **Purpose:** Validator agent definition (extended for learning capture)
- **Modification:** Add learning capture logic after validation-report.md creation
- **Lines to add:** ~50 lines Python for YAML generation

**~/.claude/commands/2l-mvp.md**
- **Purpose:** Orchestrator command (extended for re-validation and reflection)
- **Modification:** Add re-validation checkpoint in healing loop, add reflection hook after validation PASS
- **Lines to add:** ~150 lines Bash/Python for re-validation + reflection

**~/.claude/lib/2l-event-logger.sh**
- **Purpose:** Event logging library for dashboard observability
- **Modification:** None needed (existing event types sufficient)
- **Usage:** Re-validation emits phase_change, validation_result events

**~/.claude/lib/2l-yaml-helpers.py (NEW)**
- **Purpose:** Python helper library for YAML manipulation and atomic writes
- **Creation:** New file for atomic_write_yaml(), merge_learnings(), find_similar_pattern()
- **Lines:** ~200 lines Python for YAML operations

**~/.claude/commands/2l-improve.md (NEW)**
- **Purpose:** Self-improvement command for automated learning aggregation and meta-orchestration
- **Creation:** New command file (Iteration 2 feature)
- **Lines:** ~300 lines Bash + Python for aggregation, pattern detection, vision gen

**~/Ahiya/2L/.2L/global-learnings.yaml (NEW)**
- **Purpose:** Global learning aggregation across all projects
- **Creation:** Created by orchestrator reflection on first learning merge
- **Format:** YAML with patterns array, metadata, status tracking

**~/Ahiya/2L/Prod/{project}/.2L/plan-{N}/iteration-{M}/learnings.yaml (NEW)**
- **Purpose:** Per-iteration learning capture
- **Creation:** Created by validator when validation FAILS
- **Format:** YAML with project, iteration, learnings array

### Key Dependencies

**PyYAML (Python yaml module)**
- **Why needed:** Parse and write YAML files for learnings and global aggregation
- **Availability:** CONFIRMED (python3 -c "import yaml" successful)
- **Usage:** All YAML read/write operations

**Python Standard Library (os, tempfile, shutil, datetime)**
- **Why needed:** File I/O, atomic writes, timestamp generation
- **Availability:** CONFIRMED (included with Python 3)
- **Usage:** Orchestrator reflection, learning merge, atomic writes

**Event Logger Library (lib/2l-event-logger.sh)**
- **Why needed:** Re-validation event emission for dashboard
- **Availability:** CONFIRMED (exists at ~/.claude/lib/2l-event-logger.sh)
- **Usage:** Re-validation checkpoints, orchestrator reflection tracking

**Symlink Architecture (~/.claude/ → ~/Ahiya/2L/)**
- **Why needed:** Self-modification via /2l-improve (changes immediately live)
- **Availability:** CONFIRMED (readlink shows symlinks active)
- **Usage:** /2l-improve modifies agents/commands, changes take effect instantly

**Git (version control)**
- **Why needed:** Auto-commit after iteration, safety tags before self-modification
- **Availability:** CONFIRMED (repo initialized, commits exist)
- **Usage:** Iteration completion commits, self-improvement rollback

### Testing Infrastructure

**Manual Testing: Learning Capture**
- **Approach:** Force validation failure, verify learnings.yaml created
- **Test case:** Create TypeScript error, run validator, check for learnings.yaml
- **Validation:** YAML parses correctly, contains issue details, severity is correct

**Manual Testing: Re-validation Checkpoint**
- **Approach:** Trigger healing, verify re-validation occurs
- **Test case:** Create fixable bug, observe healing → re-validation flow
- **Validation:** Events.jsonl shows re-validation events, iteration only completes after PASS

**Manual Testing: Orchestrator Reflection**
- **Approach:** Complete iteration with learnings.yaml, verify global merge
- **Test case:** Run iteration end-to-end, check .2L/global-learnings.yaml
- **Validation:** Global file contains iteration learnings, status: IDENTIFIED, metadata correct

**Manual Testing: Atomic Write Safety**
- **Approach:** Kill Python process during global merge, verify no corruption
- **Test case:** Add delay to atomic_write_yaml(), kill -9 mid-write
- **Validation:** Global-learnings.yaml is either old version or new version (never corrupted)

**Manual Testing: Infinite Loop Prevention**
- **Approach:** Create unfixable bug, verify escalation after 2 attempts
- **Test case:** Healing that doesn't change files, observe max attempts
- **Validation:** Orchestrator stops after 2 attempts, shows manual intervention message

## Questions for Planner

### Q1: Should learning capture happen on PASS validations too (to capture what worked)?

**Context:** Vision mentions "Success Pattern Extraction" as post-MVP feature. Should MVP include success learning capture?

**Options:**
- A) MVP: Only capture learnings on FAIL (simpler, focused on fixing problems)
- B) MVP: Capture learnings on PASS too (more data, but doubles YAML creation work)

**Recommendation:** Option A for Iteration 1. Success patterns are post-MVP. Focus on failure learnings first (highest value). Add success pattern extraction in future iteration once failure pipeline proven.

---

### Q2: What format should learning IDs use?

**Context:** Learning IDs must be unique across all projects and iterations.

**Options:**
- A) project-YYYYMMDD-NNN (e.g., wealth-20251119-001)
- B) UUID v4 (e.g., 550e8400-e29b-41d4-a716-446655440000)
- C) plan-iteration-sequence (e.g., plan-3-iter-2-learning-1)

**Recommendation:** Option A (project-YYYYMMDD-NNN). Human-readable, sortable by date, project context clear. Easier to debug than UUIDs. Sequence number prevents collisions within same day.

**Implementation:**
```python
def generate_learning_id(project_name):
    # Get date in YYYYMMDD format
    date_str = datetime.now().strftime("%Y%m%d")
    
    # Find next sequence number for this project+date
    existing_learnings = scan_learnings_for_project(project_name, date_str)
    next_seq = len(existing_learnings) + 1
    
    # Format: project-YYYYMMDD-NNN
    return f"{project_name}-{date_str}-{next_seq:03d}"
```

---

### Q3: Should /2l-improve support selective pattern implementation?

**Context:** /2l-improve may identify 5+ patterns. User might want to fix only 2-3.

**Options:**
- A) MVP: Auto-implement top 2-3 patterns only (simplest)
- B) MVP: Show all patterns, ask user to select which to implement (more control)
- C) MVP: Implement all patterns automatically (risky, could create large changes)

**Recommendation:** Option A for MVP. Auto-implement top 2-3 ranked by severity × occurrences. Add manual override flag --manual for user selection (post-MVP enhancement). Prevents scope creep, keeps /2l-improve automated.

**Implementation:**
```python
# Rank patterns by impact
ranked_patterns = rank_patterns_by_impact(patterns)

# Filter to only IDENTIFIED status
pending_patterns = [p for p in ranked_patterns if p['status'] == 'IDENTIFIED']

if not pending_patterns:
    print("No new patterns to implement. System is stable.")
    return

# Take top 2-3 patterns
top_patterns = pending_patterns[:3]

print(f"Found {len(pending_patterns)} patterns. Implementing top {len(top_patterns)}:")
for i, pattern in enumerate(top_patterns, 1):
    print(f"  {i}. {pattern['name']} (severity: {pattern['severity']}, occurrences: {pattern['occurrences']})")

# Confirmation prompt
response = input("Proceed with /2l-mvp? [Y/n] ")
if response.lower() != 'n':
    # Auto-generate vision from top patterns
    vision_md = generate_vision_from_patterns(top_patterns)
    # Spawn /2l-mvp...
```

---

### Q4: How should status lifecycle transitions be triggered?

**Context:** Learnings have status: IDENTIFIED → IMPLEMENTED → VERIFIED

**Options:**
- A) Manual status updates (user runs /2l-improve --mark-implemented PATTERN-001)
- B) Automatic on /2l-mvp completion (IDENTIFIED → IMPLEMENTED)
- C) Automatic on next validation PASS (IMPLEMENTED → VERIFIED)

**Recommendation:** Option B + C. When /2l-improve completes /2l-mvp orchestration, mark patterns as IMPLEMENTED. When next iteration with same issue validates PASS, mark VERIFIED. Fully automated lifecycle.

**Implementation:**
```python
# After /2l-improve spawns /2l-mvp and it completes
for pattern_id in patterns_addressed:
    update_pattern_status(pattern_id, 'IMPLEMENTED', {
        'implemented_in': get_current_iteration(),
        'implemented_at': datetime.now().isoformat()
    })

# In validator: Check if validation PASS resolves previously IMPLEMENTED patterns
if validation_status == 'PASS':
    # Check for matching patterns that are IMPLEMENTED
    resolved_patterns = find_resolved_patterns(global_learnings)
    for pattern_id in resolved_patterns:
        update_pattern_status(pattern_id, 'VERIFIED', {
            'verified_at': datetime.now().isoformat()
        })
```

---

**End of Explorer 2 Report**

---

**Report Metadata:**
- Explorer ID: explorer-2
- Focus Area: Technology Patterns & Dependencies
- Created: 2025-11-19
- Plan: plan-5
- Iteration: 6 (global)
- Scope: Iteration 1 technologies (YAML, Bash, event logging, atomic writes)
