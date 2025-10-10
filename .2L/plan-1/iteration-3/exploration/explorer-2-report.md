# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

The master explorer scaling system (2 to 2-4 adaptive explorers) requires implementing adaptive spawning logic, new explorer definitions, and resume detection updates across 5 command files. The primary technology pattern is YAML-based configuration management with bash orchestration logic. Dependencies are well-isolated with clear integration points through config.yaml, requiring careful state management for infinite resumability. Risk is MEDIUM due to orchestration complexity but mitigated by existing patterns in the codebase.

## Discoveries

### Configuration Management Pattern
- All orchestration state lives in `.2L/config.yaml` (global) and `.2L/plan-N/master-plan.yaml` (plan-specific)
- Event logging optional via `lib/2l-event-logger.sh` (iteration 1 completed)
- State persistence enables infinite resumability across sessions
- YAML parsing via `yq` (already in use across codebase)

### Orchestration Logic Pattern
- Commands act as orchestrators, not spawning sub-orchestrators
- Task tool used for agent spawning with structured prompts
- Parallel spawning via multiple Task calls in single response
- Sequential dependency management through file existence checks

### Explorer Pattern Evolution
- **Current:** 2 fixed explorers (Architecture, Dependencies)
- **Target:** 2-4 adaptive explorers based on complexity heuristics
- **New explorers:**
  - Explorer 3: UX/Integration (spawned if 3-4 needed)
  - Explorer 4: Scalability/Performance (spawned if 4 needed)
- Focus area specialization maintains consistency

### Resume Detection Pattern
- State detection via directory/file existence checks
- Count-based completion verification (`ls | wc -l`)
- Adaptive logic: read config to know expected count
- Graceful handling of partial completion

## Patterns Identified

### Pattern 1: Adaptive Agent Spawning

**Description:** Dynamic agent count based on complexity heuristics

**Use Case:** Scale exploration depth to project complexity without over-engineering simple projects

**Example:**
```bash
# Complexity heuristic (pseudocode from vision.md)
feature_count=$(grep -c "^##" vision.md)
integration_count=$(grep -c "API\|integration\|external" vision.md)

if [ "$feature_count" -lt 5 ]; then
    num_explorers=2  # Simple
elif [ "$feature_count" -lt 15 ] && [ "$integration_count" -lt 3 ]; then
    num_explorers=3  # Medium
else
    num_explorers=4  # Complex/Very Complex
fi

# Store in config for resume detection
yq eval ".master_exploration.num_explorers = $num_explorers" -i config.yaml
```

**Recommendation:** IMPLEMENT - This pattern is mature in other orchestration systems (Kubernetes autoscaling, CI/CD pipeline matrix builds). The heuristic is simple enough to be reliable.

### Pattern 2: Config-Driven Resume Detection

**Description:** Resume detection reads expected state from config, not hardcoded values

**Use Case:** Support variable explorer counts without breaking resume logic

**Example:**
```bash
# Current (hardcoded): 
if [ $(ls master-exploration/master-explorer-*-report.md | wc -l) -lt 2 ]; then
    # Spawn remaining explorers
fi

# New (config-driven):
EXPECTED=$(yq eval '.master_exploration.num_explorers' config.yaml)
ACTUAL=$(ls master-exploration/master-explorer-*-report.md 2>/dev/null | wc -l)
if [ "$ACTUAL" -lt "$EXPECTED" ]; then
    # Spawn remaining explorers
fi
```

**Recommendation:** IMPLEMENT - Critical for adaptive spawning. Aligns with existing config.yaml usage patterns.

### Pattern 3: Conditional Explorer Definitions

**Description:** Explorer definitions exist but spawn conditionally based on complexity

**Use Case:** Maintain single agent file with all 4 explorer definitions, selectively invoke

**Example:**
```markdown
# In 2l-master-explorer.md

## Explorer 1: Architecture & Complexity (ALWAYS SPAWNED)
...

## Explorer 2: Dependencies & Risk (ALWAYS SPAWNED)
...

## Explorer 3: UX & Integration Points (SPAWNED IF num_explorers >= 3)
...

## Explorer 4: Scalability & Performance (SPAWNED IF num_explorers == 4)
...
```

**Recommendation:** IMPLEMENT - Keeps agent definition unified while enabling selective invocation. Agent prompt specifies which focus area to use.

### Pattern 4: Master Plan Synthesis Scaling

**Description:** Master plan synthesis adapts to variable report count

**Use Case:** Read all available explorer reports (2-4) and synthesize findings

**Example:**
```bash
# Dynamic report reading
for report in master-exploration/master-explorer-*-report.md; do
    echo "Reading $(basename $report)..."
    # Extract insights
done

# Synthesis uses all available reports
# No hardcoded report-1, report-2 references
```

**Recommendation:** IMPLEMENT - Already partially used in integration phase (reads all builder reports). Extend pattern to master exploration.

## Complexity Assessment

### High Complexity Areas

**1. Resume Detection Updates (commands/2l-continue.md)**
- **Why complex:** Must handle 2-4 explorers in master exploration AND iteration exploration
- **Affected sections:** 
  - Step 3: Resume Orchestration → "If Master Exploration Incomplete" 
  - Explorer count detection logic
  - Missing explorer spawning logic
- **Estimated builder splits:** 1 sub-builder if split needed (focused on resume logic only)
- **Lines affected:** ~50 lines (lines 103-125 in 2l-continue.md)

**2. Adaptive Spawning Logic (commands/2l-mvp.md + commands/2l-plan.md)**
- **Why complex:** Complexity heuristic must be reliable and consistent
- **Challenge:** Feature counting logic prone to false positives/negatives
- **Risk:** Over-spawning (4 explorers for simple project) or under-spawning (2 for complex)
- **Mitigation:** Conservative heuristic (default to 2, only scale up with clear signals)
- **Estimated builder splits:** None - straightforward if-else logic
- **Lines affected:** ~80 lines total (40 in 2l-mvp.md, 40 in 2l-plan.md)

### Medium Complexity Areas

**3. Master Explorer Agent Expansion (agents/2l-master-explorer.md)**
- **Why medium:** Adding 2 new explorer definitions with clear templates
- **Sections to add:**
  - Explorer 3 focus area definition (~100 lines)
  - Explorer 4 focus area definition (~100 lines)
  - Conditional spawning guidance (~20 lines)
- **Pattern to follow:** Existing Explorer 1 & 2 sections
- **Estimated builder splits:** None - template extension
- **Lines affected:** ~220 lines added

**4. Healer Exploration Integration (agents/2l-healer.md)**
- **Why medium:** Update healer to read exploration reports as input
- **Changes needed:**
  - Add "Healing Exploration Reports" to input section
  - Update process to reference exploration insights
  - Modify prompt examples to show exploration usage
- **Lines affected:** ~40 lines modified/added

### Low Complexity Areas

**5. Config Schema Updates**
- **Why low:** Simple YAML field additions
- **Fields to add:**
  - `master_exploration.num_explorers` (integer)
  - `master_exploration.complexity_level` (string, optional)
- **Backward compatible:** Old configs work (default to 2 if field missing)
- **Estimated builder splits:** None
- **Lines affected:** ~10 lines

**6. Healing Exploration Phase (commands/2l-mvp.md)**
- **Why low:** Pattern already exists (iteration exploration phase)
- **Changes needed:**
  - Add Phase 6.1 before Phase 6.2
  - Spawn 1-2 healing explorers using existing Task tool
  - Create `healing-{N}/exploration/` directory
- **Reuse existing:** Explorer agent definition (same agent, different prompt)
- **Lines affected:** ~100 lines (mostly prompt text)

## Technology Recommendations

### Primary Stack

**No new technologies required** - All features implementable with existing stack:

- **Bash:** Orchestration logic (already in use)
- **YAML:** Configuration management via `yq` (already in use)
- **Markdown:** Agent definitions and reports (existing pattern)
- **Task Tool:** Agent spawning (existing integration)

### Supporting Libraries

**yq (YAML processor)**
- **Current version:** Already installed and working
- **New usage patterns:**
  - Read/write `num_explorers` field
  - Conditional logic based on config values
  - Array iteration over variable-length explorer lists
- **Why needed:** Config-driven resume detection requires YAML manipulation
- **Example:**
  ```bash
  yq eval '.master_exploration.num_explorers' config.yaml
  yq eval '.master_exploration.num_explorers = 3' -i config.yaml
  ```

**grep + wc (Feature counting)**
- **Purpose:** Count features and integrations for complexity heuristic
- **Pattern matching:**
  - Features: `grep -c "^## " vision.md`
  - Integrations: `grep -c "API\|integration\|external\|webhook" vision.md`
- **Why needed:** Adaptive spawning decision logic
- **Risk:** Simple regex may miss nuanced complexity (mitigated by conservative heuristic)

### Complexity Heuristic Algorithm

**Recommended implementation:**

```bash
# Feature counting
feature_count=$(grep -c "^## " "${VISION_FILE}" || echo 0)

# Integration counting (multi-pattern)
integration_count=$(grep -cE "API|integration|external|webhook|OAuth|third-party" "${VISION_FILE}" || echo 0)

# Decision tree
if [ "$feature_count" -lt 5 ]; then
    num_explorers=2
    complexity="SIMPLE"
elif [ "$feature_count" -ge 15 ] || [ "$integration_count" -ge 3 ]; then
    num_explorers=4
    complexity="COMPLEX"
else
    num_explorers=3
    complexity="MEDIUM"
fi

echo "Complexity: $complexity (Features: $feature_count, Integrations: $integration_count)"
echo "Spawning $num_explorers master explorers..."
```

**Rationale:**
- Simple threshold-based logic (easy to debug)
- Conservative (defaults to 2, only scales up with clear signals)
- Considers both feature count AND integration complexity
- Stores result for transparency and debugging

## Integration Points

### Config Schema Integration

**File:** `.2L/config.yaml`

**New fields:**
```yaml
master_exploration:
  num_explorers: 3  # 2-4 based on complexity
  complexity_level: "MEDIUM"  # SIMPLE | MEDIUM | COMPLEX
  completed: true
  reports:
    - master-explorer-1-report.md
    - master-explorer-2-report.md
    - master-explorer-3-report.md
```

**Backward compatibility:**
- Old configs without these fields default to `num_explorers=2`
- Check: `yq eval '.master_exploration.num_explorers // 2' config.yaml`

### Master Plan Synthesis Integration

**File:** `commands/2l-mvp.md` (lines ~320-380)

**Current approach:**
```bash
report1=$(cat master-exploration/master-explorer-1-report.md)
report2=$(cat master-exploration/master-explorer-2-report.md)
# Synthesize from 2 reports
```

**New approach:**
```bash
# Read all available reports
reports=""
for report in master-exploration/master-explorer-*-report.md; do
    reports="$reports\n\n$(cat $report)"
done

# Synthesis logic adapts to variable report count
# Extract complexity from first report (Explorer 1 always provides overall complexity)
```

**Integration challenge:** Synthesis logic must handle 2-4 reports gracefully
**Solution:** All explorers use consistent report structure, synthesis reads from all

### Resume Detection Integration

**Files:** 
- `commands/2l-continue.md` (lines 103-125)
- `commands/2l-mvp.md` (lines 244-317)

**Current check:**
```bash
if [ $(ls master-exploration/master-explorer-*-report.md | wc -l) -lt 2 ]; then
    # Incomplete
fi
```

**New check:**
```bash
EXPECTED=$(yq eval '.master_exploration.num_explorers // 2' config.yaml)
ACTUAL=$(ls master-exploration/master-explorer-*-report.md 2>/dev/null | wc -l)

if [ "$ACTUAL" -lt "$EXPECTED" ]; then
    echo "Master exploration incomplete ($ACTUAL/$EXPECTED explorers)"
    # Spawn remaining explorers (IDs $ACTUAL+1 to $EXPECTED)
fi
```

**Integration challenge:** Must work even if config doesn't have `num_explorers` (old plans)
**Solution:** Use yq's default value operator `// 2`

### Healing Exploration Integration

**File:** `commands/2l-mvp.md` (new Phase 6.1, before existing Phase 6.2)

**Integration point:** Between validation failure and healing

**Flow:**
```
Validation FAILED
    ↓
Phase 6.1: Healing Exploration (NEW)
    - Spawn 1-2 healing explorers
    - Analyze validation report
    - Create root cause analysis
    ↓
Phase 6.2: Healing (EXISTING, MODIFIED)
    - Healers read BOTH validation report AND exploration reports
    - Apply fix strategies from exploration
    ↓
Phase 6.3: Re-validation (EXISTING)
```

**Integration challenge:** Healer agents need updated prompts to reference exploration
**Solution:** Modify `agents/2l-healer.md` to include exploration reports in inputs section

## Risks & Challenges

### Technical Risks

**Risk 1: Complexity Heuristic False Positives/Negatives**
- **Impact:** Over-spawning (waste resources) or under-spawning (miss insights)
- **Likelihood:** MEDIUM (simple regex counting is imperfect)
- **Mitigation:** 
  - Conservative thresholds (default to 2, only scale up with strong signals)
  - Log complexity decision for transparency
  - Allow manual override in config.yaml if needed
- **Severity:** LOW (over-spawning wastes time but doesn't break functionality)

**Risk 2: Resume Detection with Mixed Config States**
- **Impact:** Resume logic fails if some plans have `num_explorers`, others don't
- **Likelihood:** HIGH (during transition period)
- **Mitigation:**
  - Use `yq` default value operator: `.master_exploration.num_explorers // 2`
  - Test resume with old config files
  - Document backward compatibility in code comments
- **Severity:** MEDIUM (breaks resumability, requires manual fix)

**Risk 3: Healing Exploration Adds Orchestration Complexity**
- **Impact:** Longer time to healing, more points of failure
- **Likelihood:** MEDIUM
- **Mitigation:**
  - Make healing exploration optional (skip if <3 failures)
  - Single explorer default (Explorer 2 only if >3 categories)
  - Healers still work without exploration (degraded mode)
- **Severity:** LOW (healing still functions, just less intelligent)

### Complexity Risks

**Risk 4: Multi-File Coordination**
- **Impact:** Changes to 5 command files must stay synchronized
- **Likelihood:** MEDIUM (easy to miss updating one file)
- **Mitigation:**
  - Builder should review all 5 files together
  - Use consistent variable names (`num_explorers`, `EXPECTED`, etc.)
  - Test resume scenario after changes
- **Severity:** MEDIUM (incomplete implementation breaks adaptive spawning)

**Risk 5: Healing Exploration Infinite Loop**
- **Impact:** Explorer analyzes failures → Healer creates new failures → Exploration again
- **Likelihood:** LOW (max healing attempts = 2 prevents infinite loop)
- **Mitigation:**
  - Healing exploration only runs ONCE per healing attempt
  - Existing max attempts limit already in place
  - Clear termination conditions
- **Severity:** LOW (existing safeguards sufficient)

## Recommendations for Planner

1. **Split into 2 builder tasks:**
   - **Builder-1:** Master explorer scaling (2l-master-explorer.md, 2l-mvp.md, 2l-plan.md, 2l-continue.md adaptive logic)
   - **Builder-2:** Healing exploration phase (2l-mvp.md Phase 6.1, 2l-healer.md updates)
   - **Rationale:** Separate concerns, parallel work possible, integration is config.yaml only

2. **Test with 3 complexity scenarios:**
   - Simple vision (<5 features) → Verify 2 explorers spawn
   - Medium vision (10 features, 1 integration) → Verify 3 explorers spawn
   - Complex vision (20 features, 5 integrations) → Verify 4 explorers spawn
   - **Why:** Validate heuristic works across project sizes

3. **Backward compatibility is critical:**
   - All changes must work with old config.yaml files
   - Default to `num_explorers=2` if field missing
   - Test `/2l-continue` resume with pre-iteration-3 plans
   - **Why:** Meta-programming - 2L must not break itself

4. **Use event logging for debugging:**
   - Log complexity decision: `log_2l_event "Complexity: $complexity, spawning $num_explorers explorers"`
   - Log explorer completion: `log_2l_event "agent_complete" "Master Explorer-$i"`
   - **Why:** Dashboard (from iteration 1) provides visibility into adaptive spawning

5. **Conservative heuristic recommended:**
   - Default to 2 explorers for ambiguous cases
   - Only scale to 4 with very clear signals (15+ features AND 3+ integrations)
   - **Why:** Better to under-explore than waste time on simple projects

## Resource Map

### Critical Files/Directories

**Commands (5 files to modify):**
- `/home/ahiya/.claude/commands/2l-mvp.md` - Adaptive spawning + healing exploration
- `/home/ahiya/.claude/commands/2l-plan.md` - Adaptive spawning logic (duplicate)
- `/home/ahiya/.claude/commands/2l-continue.md` - Resume detection for 2-4 explorers
- `/home/ahiya/.claude/commands/2l-task.md` - (No changes needed for this iteration)

**Agents (2 files to modify):**
- `/home/ahiya/.claude/agents/2l-master-explorer.md` - Add Explorer 3 & 4 definitions
- `/home/ahiya/.claude/agents/2l-healer.md` - Read exploration reports as input

**Configuration:**
- `.2L/config.yaml` - Add `master_exploration.num_explorers` field
- `.2L/plan-N/master-plan.yaml` - (No schema changes needed)

**Event Logging (optional dependency):**
- `/home/ahiya/.claude/lib/2l-event-logger.sh` - Already exists (iteration 1)
- Used for logging adaptive spawning decisions

### Key Dependencies

**External Dependencies:**
- `yq` - YAML processor (already installed)
- `grep` - Pattern matching (standard Unix tool)
- `wc` - Line counting (standard Unix tool)

**Internal Dependencies:**
- Task tool - Agent spawning (existing integration)
- Explorer agent - Reused for healing exploration (no new agent needed)
- Event logger - Optional (iteration 1 deliverable, gracefully skipped if absent)

**Dependency Chain:**
```
Adaptive Spawning Logic
    ↓
Config Schema (num_explorers)
    ↓
Resume Detection (reads config)
    ↓
Master Plan Synthesis (reads all reports)
```

**Healing Exploration Chain:**
```
Validation FAIL
    ↓
Healing Exploration (Phase 6.1)
    ↓
Healer reads exploration reports
    ↓
Re-validation (Phase 6.3)
```

### Testing Infrastructure

**Test Scenarios:**

1. **Adaptive Spawning Test:**
   - Create 3 test visions (simple, medium, complex)
   - Run `/2l-plan` on each
   - Verify correct `num_explorers` in config.yaml
   - Verify correct number of explorer reports generated

2. **Resume Detection Test:**
   - Start master exploration with 4 explorers
   - Kill after 2 complete
   - Run `/2l-continue`
   - Verify explorers 3-4 spawn and complete

3. **Backward Compatibility Test:**
   - Use old config.yaml (no `num_explorers` field)
   - Run `/2l-continue`
   - Verify defaults to 2 explorers
   - Verify no errors

4. **Healing Exploration Test:**
   - Force validation failure (introduce TypeScript error)
   - Verify healing exploration spawns
   - Verify healer receives exploration report
   - Verify healing succeeds

**MCP Usage (Optional):**
- No MCP servers required for this iteration
- Playwright/Chrome DevTools/Supabase not needed
- All testing via bash commands and file inspection

## Questions for Planner

1. **Builder Split Decision:** Should healing exploration be separate builder (Builder-2) or combined with master explorer scaling (single builder)? Current recommendation is 2 builders for parallel work.

2. **Complexity Heuristic Tuning:** Are the thresholds (5 features, 15 features, 3 integrations) appropriate? Should we add more sophisticated analysis (e.g., parsing YAML frontmatter in vision.md)?

3. **Healing Explorer Count:** Should we always spawn 2 healing explorers, or make it conditional (1 if <3 failure categories, 2 if >=3)? Current vision.md specifies conditional.

4. **Config Schema Location:** Should `master_exploration.num_explorers` be global (in config.yaml) or plan-specific (in master-plan.yaml)? Current recommendation is config.yaml for resume detection access.

5. **Event Logging Integration:** Should adaptive spawning decisions be logged even if dashboard doesn't exist (backward compatibility)? Recommend yes with graceful skip.

---

**Exploration completed:** 2025-10-03T04:15:00Z  
**This report informs iteration 3 planning decisions**
