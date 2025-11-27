# Explorer 3 Report: Complexity & Integration Points

## Executive Summary

Iteration 8 implements two interdependent features: **Feature 1 (Real Exploration Phase)** and **Feature 4 (Pattern Lifecycle Management)**. This is meta-circular development - 2L improving itself.

**Critical Complexity:** Lines 358-410 of `/2l-improve` must be transformed from placeholder code into actual Task tool spawning. This pattern doesn't exist in any current 2L bash command, requiring creation from first principles.

**Recommendation:** Split Feature 1 into sub-builders (Foundation → Explorer 1 → Explorer 2 → Explorer 3) to manage the high-risk Task spawning implementation.

---

## Feature 1: Real Exploration Phase - Detailed Analysis

### Complexity Rating: VERY HIGH

**Root Cause of Complexity:**
- No existing bash→Task tool pattern in codebase
- /2l-mvp uses Task but as agent (markdown), not from bash script
- Must coordinate 3 parallel spawns with synchronous waiting
- Event logging integration required for each explorer
- Failure of any explorer blocks vision generation

### Precise File Modifications

#### Modification 1: commands/2l-improve.md (Lines 358-410)

**Current Code (Placeholder):**
```bash
cat > "$exploration_dir/explorer-1-report.md" << 'EOF'
# Explorer 1 Report: 2L Architecture & Agent Flow
**Status:** Placeholder (explorers not yet spawned)
EOF
```

**Required Change:** REPLACE entire section with Task spawning logic

**Target Implementation Pattern:**
```bash
# Spawn Explorer 1: Architecture Analysis
if [ ! -f "$exploration_dir/explorer-1-report.md" ]; then
    # Emit spawn event
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "agent_spawn" "Explorer-1: Architecture Analysis" "exploration" "explorer-1"
    fi
    
    # CRITICAL: Invoke Task tool to spawn 2l-explorer agent
    # Task spawning happens within Claude Code session
    # Must create context file with:
    #   - Focus area (Architecture)
    #   - Inputs (context.md, vision.md, 2L codebase)
    #   - Output path (explorer-1-report.md)
    
    # Pattern to implement (research Task tool API first):
    spawn_2l_explorer 1 "Architecture & Agent Flow" "$exploration_dir"
fi
```

**Complexity Factors:**
1. Task tool invocation from bash (no documentation exists)
2. Synchronous waiting (explorers must complete before proceeding)
3. Error handling (timeout, partial failures)
4. Event coordination (spawn before, complete after)

**Line Numbers:**
- Replace: Lines 365-382 (Explorer 1)
- Replace: Lines 384-397 (Explorer 2)
- Replace: Lines 399-409 (Explorer 3)
- Total: ~45 lines deleted, ~90 lines added

#### Modification 2: commands/2l-improve.md (Line 450)

**Current Code:**
```bash
python3 ~/.claude/lib/2l-vision-generator.py \
    --pattern-json "$selected_pattern_json" \
    --template ~/.claude/templates/improvement-vision.md \
    --output "$vision_path" \
    --plan-id "$next_plan_id"
```

**Required Change:** Add --exploration-dir parameter

**New Code:**
```bash
python3 ~/.claude/lib/2l-vision-generator.py \
    --pattern-json "$selected_pattern_json" \
    --template ~/.claude/templates/improvement-vision.md \
    --output "$vision_path" \
    --plan-id "$next_plan_id" \
    --exploration-dir "$exploration_dir"
```

**Complexity:** LOW (single line addition)

#### Modification 3: lib/2l-vision-generator.py (Multiple Locations)

**Location A: Function Signature (Line 55)**

**Current:**
```python
def generate_improvement_vision(pattern, plan_id, template_path):
```

**New:**
```python
def generate_improvement_vision(pattern, plan_id, template_path, exploration_dir=None):
    # ... existing template reading ...
    
    # NEW: Read exploration reports
    exploration_context = ""
    if exploration_dir and os.path.exists(exploration_dir):
        for i in range(1, 4):
            report_path = f"{exploration_dir}/explorer-{i}-report.md"
            if os.path.exists(report_path):
                with open(report_path, 'r') as f:
                    report = f.read()
                    # Extract key sections
                    exploration_context += extract_key_sections(report, i)
    
    # Add to replacements
    replacements['{EXPLORATION_CONTEXT}'] = exploration_context or "No exploration data available"
```

**Location B: Helper Function (NEW, ~Line 160)**

```python
def extract_key_sections(markdown_text, explorer_id):
    """Extract relevant sections from explorer report."""
    import re
    
    output = f"\n### Explorer {explorer_id} Findings\n\n"
    
    # Extract sections: Integration Points, Affected Components, Recommendations
    for section in ["Integration Points", "Affected Components", "Recommendations"]:
        pattern = f"## {section}.*?(?=\n## |\Z)"
        match = re.search(pattern, markdown_text, re.DOTALL)
        if match:
            output += match.group(0) + "\n\n"
    
    return output
```

**Location C: CLI Arguments (Line 140)**

**Current:**
```python
parser.add_argument('--plan-id', required=True, help='Plan ID (e.g., plan-6)')
```

**New (after):**
```python
parser.add_argument('--exploration-dir', help='Path to exploration reports directory')
```

**Location D: Function Call (Line 149)**

**Current:**
```python
vision_content = generate_improvement_vision(pattern, args.plan_id, args.template)
```

**New:**
```python
vision_content = generate_improvement_vision(pattern, args.plan_id, args.template, args.exploration_dir)
```

**Complexity:** MEDIUM (multiple coordinated changes)
**Total Lines:** ~30 added, ~5 modified

#### Modification 4: templates/improvement-vision.md (Line 61)

**Current:**
```markdown
**Components to Modify:**
{AFFECTED_COMPONENTS_LIST}

**Validation Strategy:**
```

**New:**
```markdown
**Components to Modify:**
{AFFECTED_COMPONENTS_LIST}

**Exploration Findings:**

{EXPLORATION_CONTEXT}

**Validation Strategy:**
```

**Complexity:** LOW (3 lines added)

### Feature 1 Integration Points

**Critical Dependency Chain:**
```
Task spawning research (Builder 1)
    ↓
Implement spawn for Explorer 1 (Builder 1)
    ↓
Replicate for Explorers 2 & 3 (Builders 1A, 1B)
    ↓
3 explorer reports exist
    ↓
Vision generator reads reports (Builder 2)
    ↓
Template includes context (Builder 2)
    ↓
Vision generated with architectural guidance
```

**Wait Synchronization (CRITICAL):**

After line 410 in /2l-improve, MUST add:

```bash
# Wait for all explorers to complete
max_wait=300  # 5 minutes
elapsed=0

while [ $elapsed -lt $max_wait ]; do
    if [ -f "$exploration_dir/explorer-1-report.md" ] && \
       [ -f "$exploration_dir/explorer-2-report.md" ] && \
       [ -f "$exploration_dir/explorer-3-report.md" ]; then
        echo "   ✅ All explorers completed"
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
done

if [ $elapsed -ge $max_wait ]; then
    echo "   ❌ ERROR: Explorer timeout after ${max_wait}s"
    exit 1
fi

# Emit completion events
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_complete" "Explorer-1 completed" "exploration" "explorer-1"
    log_2l_event "agent_complete" "Explorer-2 completed" "exploration" "explorer-2"
    log_2l_event "agent_complete" "Explorer-3 completed" "exploration" "explorer-3"
fi
```

**Complexity:** HIGH (timeout handling, partial failure scenarios)

---

## Feature 4: Pattern Lifecycle Management - Detailed Analysis

### Complexity Rating: MEDIUM

**Lower Complexity Because:**
- State machine well-defined (4 states, clear transitions)
- Python implementation (cleaner than bash)
- Limited integration points (2 commands)
- YAML update pattern exists (lib/2l-yaml-helpers.py as reference)

### Precise File Modifications

#### Modification 1: lib/2l-pattern-lifecycle.py (NEW FILE)

**Purpose:** Manage pattern status through lifecycle: IDENTIFIED → IMPLEMENTED → VERIFIED

**File Structure:**
```python
#!/usr/bin/env python3
"""Pattern Lifecycle Manager - Track patterns from detection to verification."""

import yaml, argparse, sys, os
from datetime import datetime
from pathlib import Path

class PatternLifecycleManager:
    VALID_STATUSES = ['IDENTIFIED', 'IMPLEMENTED', 'VERIFIED', 'REGRESSED']
    VERIFICATION_WINDOW = 3  # iterations
    
    def update_status(self, pattern_id, new_status, metadata=None):
        """Update pattern status with validation and timestamps."""
        # Load global-learnings.yaml
        # Validate state transition
        # Update status + metadata
        # Atomic write (temp + rename)
        pass
    
    def check_recurrence(self, pattern_id, current_iteration):
        """Check if IMPLEMENTED pattern recurred in current iteration."""
        # Read current iteration learnings
        # Fuzzy match against pattern root cause
        # If match: update to REGRESSED, return exit code 2
        # If no match + window passed: update to VERIFIED
        # Return exit code 0
        pass
    
    def _is_pattern_match(self, learning, pattern):
        """Fuzzy matching using keyword similarity."""
        # Jaccard similarity on keywords
        # Threshold: 0.6 (configurable)
        pass
```

**Key Functions:**

1. **update_status(pattern_id, new_status, metadata)**
   - Lines: ~40
   - Validates: IDENTIFIED→IMPLEMENTED, IMPLEMENTED→VERIFIED/REGRESSED
   - Adds: status_updated_at, implemented_at, verified_at timestamps
   - Metadata: plan_id, iteration, verification_start_iteration

2. **check_recurrence(pattern_id, current_iteration)**
   - Lines: ~60
   - Checks: Is pattern in IMPLEMENTED status?
   - Checks: Are we in verification window? (start + 3 iterations)
   - Reads: .2L/plan-N/iteration-M/learnings.yaml
   - Compares: Learning vs pattern (fuzzy match)
   - Auto-verifies: If window passed without recurrence

3. **_is_pattern_match(learning, pattern)**
   - Lines: ~20
   - Algorithm: Jaccard similarity on keywords
   - Threshold: 0.6 (60% keyword overlap)
   - Returns: True if recurrence detected

**CLI Interface:**

```bash
# Update status
python3 lib/2l-pattern-lifecycle.py update \
    --pattern-id PATTERN-001 \
    --status IMPLEMENTED \
    --plan-id plan-9 \
    --iteration 8

# Check recurrence
python3 lib/2l-pattern-lifecycle.py check-recurrence \
    --pattern-id PATTERN-001 \
    --current-iteration 11
# Exit codes: 0=no recurrence, 2=recurred

# Manual verify
python3 lib/2l-pattern-lifecycle.py verify \
    --pattern-id PATTERN-001
```

**Total Lines:** ~250
**Complexity:** MEDIUM

#### Modification 2: commands/2l-improve.md (Lines 855-866)

**Current Code:**
```bash
python3 ~/.claude/lib/2l-yaml-helpers.py update_pattern_status \
    --global-learnings "$GLOBAL_LEARNINGS" \
    --pattern-id "$selected_pattern_id" \
    --status "IMPLEMENTED" \
    --metadata-json "{...}"
```

**New Code:**
```bash
python3 ~/.claude/lib/2l-pattern-lifecycle.py update \
    --pattern-id "$selected_pattern_id" \
    --status "IMPLEMENTED" \
    --plan-id "$next_plan_id" \
    --iteration "$global_iter"

echo "   ✅ Pattern status: IDENTIFIED → IMPLEMENTED"
echo "   📊 Monitoring next 3 iterations for recurrence"
```

**Complexity:** LOW (direct replacement)
**Lines:** ~5 changed

#### Modification 3: commands/2l-mvp.md (After Line 1435)

**Location:** Between `orchestrator_reflection()` and `iteration_complete` event

**Purpose:** Check all IMPLEMENTED patterns for recurrence in current iteration

**New Code:**
```bash
# Pattern Lifecycle: Monitor for regressions
echo "   🔍 Checking for pattern regressions..."

# Get all IMPLEMENTED patterns
implemented_patterns=$(python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
    patterns = [p['pattern_id'] for p in data.get('patterns', []) if p.get('status') == 'IMPLEMENTED']
    print('\n'.join(patterns))
" 2>/dev/null || echo "")

if [ -n "$implemented_patterns" ]; then
    while IFS= read -r pattern_id; do
        python3 ~/.claude/lib/2l-pattern-lifecycle.py check-recurrence \
            --pattern-id "$pattern_id" \
            --current-iteration "$global_iter" > /dev/null 2>&1
        
        exit_code=$?
        
        if [ $exit_code -eq 2 ]; then
            echo "   ⚠️  Pattern $pattern_id REGRESSED"
            
            if [ "$EVENT_LOGGING_ENABLED" = true ]; then
                log_2l_event "pattern_regressed" \
                             "Pattern ${pattern_id} recurred in iteration ${global_iter}" \
                             "reflection" \
                             "orchestrator"
            fi
        elif [ $exit_code -eq 0 ]; then
            echo "   ✓ Pattern $pattern_id: No recurrence"
        fi
    done <<< "$implemented_patterns"
else
    echo "   ℹ️  No patterns to monitor"
fi
```

**Complexity:** MEDIUM
**Lines:** ~30 added
**Critical:** Must run AFTER learnings.yaml created, BEFORE iteration_complete event

### Feature 4 Integration Points

**Dependency Chain:**
```
Pattern status: IDENTIFIED (in global-learnings.yaml)
    ↓
/2l-improve completes → update_status(IMPLEMENTED)
    ↓
verification_start_iteration set to current + 1
    ↓
Next 3 iterations: /2l-mvp calls check_recurrence()
    ↓
If no match: Auto-update to VERIFIED
If match: Update to REGRESSED, emit event
```

**State Transitions:**
```
IDENTIFIED
    ↓ (after /2l-improve + /2l-mvp complete)
IMPLEMENTED
    ↓ (after 3 iterations, no recurrence)
VERIFIED
    
IMPLEMENTED
    ↓ (if pattern recurs)
REGRESSED
    ↓ (after re-implementation)
IMPLEMENTED (again)
```

---

## Integration Between Features 1 and 4

### Sequential Dependency

**Feature 1 enhances Feature 4 (but not required):**

- **Without Feature 1:** Pattern lifecycle works (status tracking, recurrence detection via fuzzy matching)
- **With Feature 1:** Recurrence detection more accurate (knows exact affected files from exploration)

**Recommended Build Order:**
1. Feature 1: Create Task spawning infrastructure
2. Feature 1: Implement explorer spawning
3. Feature 1: Enhance vision generator
4. Feature 4: Create lifecycle manager
5. Feature 4: Integrate into /2l-improve and /2l-mvp

**Why This Order:**
- Feature 1 is higher risk (Task spawning unknown)
- Early validation of Task spawning reduces downstream risk
- Feature 4 can leverage exploration findings if available
- Parallel implementation possible after Feature 1 foundation

### Integration Test Scenario

**Full Cycle Test:**
```bash
# Setup: PATTERN-001 in IDENTIFIED state
echo "patterns: [{pattern_id: PATTERN-001, status: IDENTIFIED, ...}]" > .2L/global-learnings.yaml

# Step 1: Run /2l-improve
/2l-improve --pattern PATTERN-001

# Verify:
# - 3 explorer reports generated (not placeholders)
# - Vision contains exploration context
# - Pattern status: IMPLEMENTED
# - verification_start_iteration set

# Step 2: Run /2l-mvp (implements fix)
/2l-mvp

# Verify:
# - commands/2l-improve.md modified (explorers spawn)
# - Pattern remains IMPLEMENTED

# Step 3: Simulate 3 iterations (no recurrence)
for i in {1..3}; do
    # Create iteration with no matching learning
    mkdir -p .2L/plan-9/iteration-$((8+i))
    echo "learnings: [{issue: 'Different issue', ...}]" > .2L/plan-9/iteration-$((8+i))/learnings.yaml
    
    # Run recurrence check
    python3 lib/2l-pattern-lifecycle.py check-recurrence \
        --pattern-id PATTERN-001 \
        --current-iteration $((8+i))
done

# Verify: Pattern status auto-updated to VERIFIED

# Step 4: Test recurrence detection
mkdir -p .2L/plan-9/iteration-12
echo "learnings: [{issue: 'Missing system exploration', root_cause: '...'}]" > .2L/plan-9/iteration-12/learnings.yaml

python3 lib/2l-pattern-lifecycle.py check-recurrence \
    --pattern-id PATTERN-001 \
    --current-iteration 12

# Verify: Exit code 2, status → REGRESSED, event logged
```

---

## Builder Task Breakdown

### Builder 1: Task Spawning Infrastructure (Foundation)

**Complexity:** VERY HIGH
**Estimated Hours:** 3-4
**Risk:** HIGH

**Deliverables:**
1. Research Task tool API in Claude Code
2. Create prototype: spawn single 2l-explorer agent
3. Test: Verify explorer-1-report.md generated
4. Document pattern (inline or lib/2l-task-spawner.sh)

**Acceptance Criteria:**
- [ ] Task tool spawning works for Explorer 1
- [ ] Report contains real analysis (not placeholder)
- [ ] Event logging functional (agent_spawn, agent_complete)
- [ ] Pattern documented for reuse

**SPLIT Recommendation:** If complexity exceeds capacity:
- Builder-1: Create Task spawning pattern + Explorer 1
- Builder-1A: Apply to Explorer 2
- Builder-1B: Apply to Explorer 3 with pattern context

### Builder 2: Vision Enhancement

**Complexity:** MEDIUM
**Estimated Hours:** 1.5
**Risk:** LOW
**Dependencies:** Builder 1 (explorers must exist)

**Deliverables:**
1. Add exploration_dir parameter to lib/2l-vision-generator.py
2. Implement extract_key_sections() helper
3. Update templates/improvement-vision.md
4. Update /2l-improve line 450

**Acceptance Criteria:**
- [ ] Vision contains {EXPLORATION_CONTEXT} section
- [ ] Gracefully handles missing exploration
- [ ] All 3 explorer findings included
- [ ] Template renders correctly

### Builder 3: Pattern Lifecycle Manager

**Complexity:** MEDIUM
**Estimated Hours:** 2
**Risk:** MEDIUM
**Dependencies:** None (independent)

**Deliverables:**
1. Create lib/2l-pattern-lifecycle.py
2. Implement PatternLifecycleManager class
3. Implement CLI (update, check-recurrence, verify)
4. Add file locking for YAML safety

**Acceptance Criteria:**
- [ ] Status updates work (IDENTIFIED → IMPLEMENTED)
- [ ] Recurrence detection functional
- [ ] Verification after 3 iterations
- [ ] File locking prevents corruption

### Builder 4: Lifecycle Integration

**Complexity:** LOW
**Estimated Hours:** 1
**Risk:** LOW
**Dependencies:** Builder 3

**Deliverables:**
1. Update /2l-improve lines 855-866
2. Add recurrence check to /2l-mvp after line 1435
3. Add event logging (pattern_implemented, pattern_verified, pattern_regressed)

**Acceptance Criteria:**
- [ ] /2l-improve uses lifecycle manager
- [ ] /2l-mvp checks recurrence every iteration
- [ ] Events logged correctly
- [ ] Auto-verification works

---

## Risk Assessment

### HIGH RISKS

**Risk 1: Task Tool Spawning Unknown**
- **Likelihood:** HIGH
- **Impact:** CRITICAL (Feature 1 blocked)
- **Mitigation:**
  - Extra research time (1-2 hours)
  - Prototype with single explorer first
  - Document pattern thoroughly
  - Fallback: Manual explorer execution instructions

**Risk 2: YAML Corruption from Concurrent Updates**
- **Likelihood:** MEDIUM
- **Impact:** HIGH (data loss)
- **Mitigation:**
  - File locking in lifecycle manager
  - Atomic write (temp + rename)
  - Backup before each update
  - Corruption detection + auto-repair

### MEDIUM RISKS

**Risk 3: Explorer Timeout/Failure**
- **Likelihood:** MEDIUM
- **Impact:** MEDIUM (vision generation blocked)
- **Mitigation:**
  - 5-minute timeout per explorer
  - Graceful degradation in vision generator
  - Clear error messages
  - Manual recovery instructions

**Risk 4: Pattern Recurrence False Positives**
- **Likelihood:** MEDIUM
- **Impact:** MEDIUM (incorrect REGRESSED status)
- **Mitigation:**
  - Tune similarity threshold (0.6 default)
  - Log matching details for debugging
  - Manual override CLI command
  - Improve with ML post-MVP

### LOW RISKS

**Risk 5: Vision Template Unreplaced Placeholders**
- **Likelihood:** LOW
- **Impact:** LOW (cosmetic)
- **Mitigation:**
  - Validation in vision generator (line 126)
  - Warning logs
  - Fallback values

---

## File Modification Summary

### New Files (1)
1. lib/2l-pattern-lifecycle.py (~250 lines)

### Modified Files (4)

1. **commands/2l-improve.md**
   - Lines 358-410: Task spawning (~60 lines modified)
   - Line 450: Add --exploration-dir (1 line)
   - Lines 855-866: Lifecycle manager (5 lines modified)
   - Total: ~66 lines modified

2. **lib/2l-vision-generator.py**
   - Lines 55-70: Add exploration reading (~30 lines added)
   - Lines 120-130: Add {EXPLORATION_CONTEXT} (5 lines added)
   - New function: extract_key_sections() (~20 lines)
   - Line 140: CLI argument (1 line)
   - Line 149: Function call (1 line modified)
   - Total: ~57 lines added/modified

3. **templates/improvement-vision.md**
   - After line 61: Exploration findings section (3 lines added)

4. **commands/2l-mvp.md**
   - After line 1435: Recurrence check (~30 lines added)

**Total Code Volume:**
- New: ~250 lines
- Modified: ~156 lines
- Grand Total: ~406 lines across 5 files

---

## Critical Success Factors

1. **Task Spawning Research (Builder 1)**
   - Allocate sufficient time for API discovery
   - Create working prototype early
   - Document pattern comprehensively

2. **Integration Testing**
   - Test each builder's output before proceeding
   - Validate full cycle (pattern → exploration → vision → implementation → verification)
   - Use plan-8 as reference (has placeholder reports)

3. **File Locking Safety (Builder 3)**
   - Implement atomic writes
   - Test concurrent access scenarios
   - Backup before modifications

4. **Event Logging Consistency**
   - Ensure all agent spawns emit events
   - Verify completion events emitted
   - Test dashboard observability

---

## Recommendations for Planner

1. **Split Builder 1 into Sub-Builders**
   - Task spawning is uncharted territory
   - Foundation + 3 explorers = 4 sub-builders
   - Allows early validation and course correction

2. **Implement Features Sequentially (Not Parallel)**
   - Feature 1 first (higher risk)
   - Feature 4 second (can leverage exploration)
   - Easier integration testing

3. **Create Safety Checkpoints**
   - Git checkpoint before /2l-mvp self-modification
   - Backup .2L/global-learnings.yaml before lifecycle updates
   - Document rollback procedure

4. **Document Task Spawning Pattern**
   - First use of Task tool from bash command
   - Create docs/task-spawning-pattern.md
   - Valuable for future commands (potential reuse)

---

## Questions for Planner

1. **Task spawning approach:** Helper script (lib/2l-task-spawner.sh) or inline in /2l-improve?
   - Helper: Reusable, cleaner
   - Inline: Simpler MVP, fewer files

2. **Fuzzy matching threshold:** Default 0.6 (60% keyword overlap) for pattern recurrence?
   - Lower: More false positives
   - Higher: Miss genuine recurrences

3. **Verification window:** 3 iterations sufficient?
   - Some patterns might need longer monitoring
   - Should it be configurable?

4. **Manual override needed:** CLI command to force VERIFIED status?
   - For intentional changes that trigger false recurrence
   - Example: /2l-pattern override --pattern-id PATTERN-001 --status VERIFIED

---

**Report Complete**
**Generated:** 2025-11-27T12:00:00Z
**Explorer:** Explorer-3 (Complexity & Integration Points)
**Focus:** Precise modifications, integration sequence, risk mitigation
**Status:** READY FOR PLANNING
