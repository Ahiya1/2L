# Explorer 1 Report: Architecture & Structure

## Executive Summary

Iteration 3 enhances 2L orchestration with intelligent healing exploration and adaptive master explorer scaling. The architecture involves two independent but complementary subsystems: (1) Healing exploration phase that inserts a root cause analysis step before healers execute fixes, spawning 1-2 explorers based on failure complexity; (2) Master explorer expansion from fixed 2 explorers to adaptive 2-4 explorers based on project scope. Both modifications primarily target commands/2l-mvp.md and agents/ definitions. Complexity is HIGH due to orchestration logic modifications and conditional spawning algorithms, but the two subsystems are loosely coupled and can be validated independently. The healing exploration architecture follows the proven explore-plan-build pattern already established in iterations, while master explorer scaling reuses existing explorer infrastructure.

## Discoveries

### Current Healing Flow Architecture (Lines 878-1076 in 2l-mvp.md)

**Existing Implementation:**
- Phase 6.1: Healing Exploration (lines 878-972) - ALREADY IMPLEMENTED in Iteration 1
- Step 6.1 spawns healing-explorer-1 (always) for root cause analysis
- Step 6.1 spawns healing-explorer-2 (conditionally) if >3 failure categories
- Exploration reports created in healing-{N}/exploration/ directory
- Step 6.2: Healers receive both validation report AND exploration insights (line 1002)
- Healers reference healing_exploration_dir in prompts (line 1002-1010)

**Current Directory Structure:**
```
iteration-M/
  healing-{N}/
    exploration/
      healing-explorer-1-report.md  (root cause analysis)
      healing-explorer-2-report.md  (optional: dependency analysis)
    healer-{id}-report.md  (category-specific fixes)
    validation-report.md   (re-validation after healing)
```

**Integration Points:**
- Line 881: Healing exploration directory creation
- Line 884-930: Explorer 1 spawn logic with detailed prompt
- Line 932-970: Explorer 2 conditional spawn (if num_categories > 3)
- Line 977-984: Exploration insights read into healers
- Line 1002: Healers receive exploration report path

**CRITICAL FINDING:** Healing exploration phase is ALREADY IMPLEMENTED as of Iteration 1. Vision document states "Iteration 1 already added healing exploration to 2l-mvp.md (lines 878-972), verify current state." This is confirmed - the exploration phase exists and is functional.

### Master Explorer Current Architecture (2 Fixed Explorers)

**Current Implementation in 2l-mvp.md:**
- Lines 267-315: Master exploration phase spawns exactly 2 explorers
- Explorer 1: Architecture & Complexity Analysis (lines 501-521)
- Explorer 2: Dependencies & Risk Assessment (lines 523-543)
- Reports output to: `.2L/plan-{N}/master-exploration/master-explorer-{1,2}-report.md`

**Current Master Explorer Agent Definition (agents/2l-master-explorer.md):**
- Focus areas defined for Explorer 1 and Explorer 2 only (lines 21-23)
- Template includes "Explorer ID: master-explorer-{1 or 2}" (line 134)
- No provisions for Explorer 3 or 4

**Current Resume Detection (commands/2l-continue.md):**
- Line 95: Checks for "fewer than 2 master explorer reports"
- Hardcoded assumption of 2 explorers

**Config Tracking:**
- No current tracking of num_explorers in config.yaml
- Master plan synthesis reads fixed 2 reports

### Proposed Healing Exploration Enhancement Architecture

**Gap Analysis:**
Since healing exploration already exists, the enhancement scope narrows to:

1. **Verification and Testing** - Ensure existing implementation is robust
2. **Documentation** - Confirm healer agents understand exploration inputs
3. **Integration Validation** - Test explore→heal→validate flow end-to-end
4. **Potential Refinements:**
   - Improve explorer prompt quality (more specific guidance)
   - Add better failure categorization logic (extract_issues_by_category helper)
   - Enhance explorer report templates for healer consumption

**No Major Architectural Changes Needed** - The foundation is solid.

### Proposed Master Explorer Scaling Architecture

**Adaptive Spawning Logic:**

Location: commands/2l-mvp.md Phase 1 (Master Exploration) and commands/2l-plan.md

```python
def calculate_num_explorers(vision_content):
    """
    Adaptive master explorer spawning based on project complexity.
    
    Returns: 2, 3, or 4 explorers
    """
    # Count features
    feature_count = count_features_in_vision(vision_content)
    
    # Count external integrations
    integration_patterns = [
        r'API', r'webhook', r'OAuth', r'third-party',
        r'Stripe', r'Plaid', r'Twilio', r'SendGrid',
        r'external service', r'integration'
    ]
    integration_count = count_pattern_matches(vision_content, integration_patterns)
    
    # Count user flows / user stories
    user_flow_count = count_user_flows(vision_content)
    
    # Decision logic
    if feature_count < 5:
        return 2  # SIMPLE: Core explorers only
    elif feature_count < 15 and integration_count < 3:
        return 3  # MEDIUM: Add UX/Integration explorer
    else:
        return 4  # COMPLEX/VERY COMPLEX: Add Scalability explorer
```

**Explorer 3: User Experience & Integration Points**

Focus areas (to be added to agents/2l-master-explorer.md):
- Frontend/backend integration complexity
- User flow dependencies and critical paths
- External API integrations and third-party services
- Data flow patterns across system boundaries
- Form handling, navigation, state management
- Real-time features (WebSockets, polling, etc.)
- Error handling and edge case flows

**Explorer 4: Scalability & Performance Considerations**

Focus areas (to be added to agents/2l-master-explorer.md):
- Performance bottlenecks (database queries, API latency)
- Scalability concerns (concurrent users, data volume)
- Infrastructure requirements (database sizing, caching)
- Deployment complexity (CI/CD, environments)
- Monitoring and observability needs
- Resource optimization strategies
- Load testing requirements

**Report Structure Template for Explorers 3 & 4:**

```markdown
# Master Exploration Report

## Explorer ID
master-explorer-{3 or 4}

## Focus Area
{User Experience & Integration Points | Scalability & Performance}

## Vision Summary
{1-2 sentence summary}

---

## {Focus-Specific Analysis Section}

### {Sub-Category 1}
- Finding 1
- Finding 2

### {Sub-Category 2}
- Finding 1

---

## Complexity Assessment
- Overall Complexity: {SIMPLE | MEDIUM | COMPLEX | VERY COMPLEX}
- Reasoning: {1-2 sentences}

## Iteration Breakdown Recommendation
- Single iteration? Or multi-iteration?
- If multi: Recommended phases and rationale

## Critical Risks
1. {Risk}: {Impact} - {Mitigation}
2. {Risk}: {Impact} - {Mitigation}

## Resource Estimates
- Estimated effort: {hours range}
- Recommended team size: {builder count}

## Questions for Master Planner
- {Question 1}
- {Question 2}
```

### File Structure for Iteration 3 Scope

**Files to Modify (5 total):**

1. **commands/2l-mvp.md** (Lines to modify: 267-315 for master exploration, 878-972 verification only)
   - Add adaptive explorer spawning logic (calculate_num_explorers)
   - Spawn 2-4 explorers in parallel based on calculation
   - Update master plan synthesis to read all available reports
   - Healing exploration: Verify existing implementation, potentially refine prompts
   - Impact: ~60 new/modified lines
   - Risk: MEDIUM (critical orchestration file)

2. **agents/2l-master-explorer.md** (Add sections after line 23)
   - Add Explorer 3 focus area definition
   - Add Explorer 4 focus area definition
   - Update "Your Focus Area" section to list all 4 explorers
   - Update report template to support 4 explorer types
   - Add detailed guidance for each explorer's analysis approach
   - Impact: ~150 new lines
   - Risk: LOW (agent definitions are additive)

3. **agents/2l-healer.md** (Verification primarily)
   - Verify healer reads exploration reports (already mentioned in inputs)
   - Add explicit guidance on using exploration insights
   - Add examples of exploration-informed healing
   - Impact: ~30 modified/new lines
   - Risk: LOW (clarification only)

4. **commands/2l-plan.md** (Master explorer spawning section)
   - Add adaptive spawning logic (same as 2l-mvp.md)
   - Update master plan synthesis to handle 2-4 reports
   - Impact: ~50 modified lines
   - Risk: LOW (mirrors changes in 2l-mvp.md)

5. **commands/2l-continue.md** (Resume detection for explorers)
   - Update line 95 logic to check for 2-4 explorer reports
   - Read num_explorers from config.yaml
   - Determine which explorers are missing and spawn appropriately
   - Impact: ~20 modified lines
   - Risk: LOW (resume detection enhancement)

**No New Files Required** - All changes are modifications to existing architecture.

**Config.yaml Schema Addition:**
```yaml
plans:
  - plan_id: plan-1
    master_exploration:
      num_explorers: 4  # NEW FIELD: Tracks how many explorers spawned
      status: COMPLETE
```

### Integration Points with Existing Architecture

**Integration Point 1: Master Explorer Spawning (2l-mvp.md Phase 1)**
- Location: Lines 267-315 (Master Exploration phase)
- Current: Hardcoded loop spawning explorer 1 and 2
- New: Adaptive loop spawning 2-4 explorers based on vision complexity
- Data flow: Read vision → Calculate num_explorers → Spawn N explorers → Write to config
- Coupling: Loose (explorer spawning is parallel, no dependencies between explorers)
- Testing: Test with simple vision (2 explorers), medium vision (3 explorers), complex vision (4 explorers)

**Integration Point 2: Master Plan Synthesis (2l-mvp.md Phase 2)**
- Location: Lines 316-387 (Master Planning phase)
- Current: Master planner reads exactly 2 explorer reports
- New: Master planner reads 2-4 explorer reports (dynamic based on config)
- Data flow: Read num_explorers from config → Read N explorer reports → Synthesize master plan
- Coupling: Loose (planner adapts to available reports)
- Testing: Verify planner uses all available explorer insights in master plan

**Integration Point 3: Resume Detection (2l-continue.md)**
- Location: Line 95 (Master Exploration Incomplete check)
- Current: Checks for "fewer than 2 master explorer reports"
- New: Reads num_explorers from config, checks for that many reports
- Data flow: Read config → Get expected num_explorers → Check actual reports → Resume if incomplete
- Coupling: Medium (resume depends on config accuracy)
- Testing: Test resume with 2/3/4 explorers, test with partially complete exploration

**Integration Point 4: Healing Explorer to Healer (2l-mvp.md Phase 6)**
- Location: Lines 977-1014 (Healer spawning in healing phase)
- Current: Healers receive exploration_report_1 path in prompt (line 1002)
- Enhancement: Verify healers actually read and use insights, add explicit guidance
- Data flow: Explorers write reports → Healers read both validation + exploration → Apply fix strategies
- Coupling: Medium (healers depend on exploration quality)
- Testing: Test healing with exploration reports, verify healers reference insights

**Integration Point 5: Config Tracking**
- Location: config.yaml write operations
- New: Add master_exploration.num_explorers field
- Data flow: Calculate num_explorers → Write to config → Resume reads config
- Coupling: Low (config is single source of truth)
- Testing: Verify config writes correctly, test resume with config

## Patterns Identified

### Pattern 1: Conditional Agent Spawning Based on Complexity

**Description:** Spawn variable number of agents (1-2 healing explorers, 2-4 master explorers) based on runtime analysis of complexity signals

**Use Case:** Avoid over-engineering simple projects while providing thorough analysis for complex ones

**Example:**
```python
# Healing: Spawn explorer 2 only if >3 failure categories
num_categories = len(extract_issues_by_category(validation_report))
if num_categories > 3:
    spawn_healing_explorer_2()

# Master: Spawn 2-4 explorers based on feature count + integration count
num_explorers = calculate_num_explorers(vision_content)
for explorer_id in range(1, num_explorers + 1):
    spawn_master_explorer(explorer_id)
```

**Recommendation:** Use this pattern. It's efficient (doesn't waste resources on unnecessary analysis) and scales gracefully. Healing explorers already implement this successfully; master explorers should adopt the same approach.

### Pattern 2: Exploration-Informed Execution

**Description:** Explorers analyze problems/requirements, then executors (healers/builders) receive exploration insights as inputs

**Use Case:** Separate analysis from execution for better decision-making and cleaner separation of concerns

**Example:**
```python
# Phase 6.1: Analyze (Healing Explorers)
spawn_explorer_1(validation_report)  # Root cause analysis
spawn_explorer_2(validation_report)  # Dependency analysis

# Phase 6.2: Execute (Healers)
for category in failure_categories:
    spawn_healer(
        validation_report=validation_report,
        exploration_insights=read_exploration_reports()  # Healers receive analysis
    )
```

**Recommendation:** Use this pattern universally. It's the core principle of 2L architecture (explore → plan → build). Healing already implements it; ensure quality of explorer reports is high enough to actually inform healer decisions.

### Pattern 3: Parallel Spawning with Independent Reports

**Description:** Spawn multiple explorers in parallel, each writing independent reports, synthesized later by planner

**Use Case:** Speed up exploration phase when explorer tasks are independent

**Example:**
```python
# All explorers spawn in parallel (no sequential dependencies)
spawn_master_explorer_1()  # Architecture
spawn_master_explorer_2()  # Dependencies
spawn_master_explorer_3()  # UX/Integration (if needed)
spawn_master_explorer_4()  # Scalability (if needed)

# Planner waits for all to complete, then synthesizes
wait_for_all_explorers()
master_planner.synthesize(all_explorer_reports)
```

**Recommendation:** Use this pattern. Explorers 1-4 analyze different aspects of the same vision - no interdependencies. Parallel execution saves time (4 explorers complete in ~same time as 1).

### Pattern 4: Config-Driven Resume Detection

**Description:** Store orchestration decisions (like num_explorers) in config.yaml for resume logic

**Use Case:** Resume detection needs to know what "complete" means for each phase

**Example:**
```yaml
# config.yaml tracks decision
plans:
  - plan_id: plan-1
    master_exploration:
      num_explorers: 3  # Resume knows to expect 3 reports
      status: IN_PROGRESS

# Resume logic
expected = config.master_exploration.num_explorers
actual = count_explorer_reports()
if actual < expected:
    resume_master_exploration(expected - actual)
```

**Recommendation:** Use this pattern. Config is already the source of truth for orchestration state. Adding num_explorers field is natural extension.

## Complexity Assessment

### High Complexity Areas

**Adaptive Master Explorer Spawning Logic** (Builder workload: 1 builder, should NOT split)
- Why complex: Must analyze vision content to extract feature count, integration count, user flow count. Requires pattern matching on unstructured text. Decision algorithm must be robust to edge cases (e.g., vision mentions "integration testing" vs "API integration"). Must write num_explorers to config correctly for resume detection.
- Estimated builder splits: Should NOT split (logic is cohesive, ~100 lines total including helper functions). If builder determines it's too complex, should simplify decision algorithm (e.g., simple feature count threshold only).
- Mitigation: Provide clear decision tree in planner specification. Include test cases with sample visions and expected num_explorers output.
- Files affected: commands/2l-mvp.md, commands/2l-plan.md

**Master Explorer 3 & 4 Agent Definitions** (Builder workload: 1 builder, might split into 2 sub-builders)
- Why complex: Must define two new explorer focus areas with clear, non-overlapping scope. Each needs detailed analysis framework (what to look for, what questions to answer, how to structure report). Must align with existing Explorer 1 & 2 patterns while covering new domains (UX, scalability). Report templates must be specific enough to guide explorers but flexible enough for diverse projects.
- Estimated builder splits: Might SPLIT into Sub-builder A (Explorer 3 definition), Sub-builder B (Explorer 4 definition) if builder determines definitions are too large (>300 lines combined).
- Mitigation: Study existing Explorer 1 & 2 definitions for patterns. Reuse report structure template. Provide clear examples of UX analysis (e.g., "Identify 3-5 critical user flows, map data flow for each, assess frontend-backend integration complexity").
- Files affected: agents/2l-master-explorer.md

**Healing Exploration Validation and Refinement** (Builder workload: 0.5 builder - verification task)
- Why medium-high: Existing implementation must be tested end-to-end. Edge cases need validation (e.g., what if healing-explorer-1 fails? what if exploration reports are incomplete?). Healer prompts might need enhancement to better leverage exploration insights. Error handling for missing exploration reports.
- Estimated builder splits: Should NOT split (verification and refinement of existing code).
- Mitigation: Create test scenario with intentional validation failures. Run healing flow, verify exploration phase executes, verify healers reference exploration reports in their work.
- Files affected: commands/2l-mvp.md (verification), agents/2l-healer.md (refinement)

### Medium Complexity Areas

**Resume Detection for 2-4 Explorers** (commands/2l-continue.md)
- Why medium: Must read num_explorers from config (new field). Check which explorer reports exist. Spawn missing explorers only. Handle case where config.yaml is from old format (no num_explorers field - default to 2).
- Straightforward implementation: Read config, count reports, spawn delta. ~30 lines of logic.

**Config.yaml Schema Extension**
- Why medium: Must add master_exploration.num_explorers field to config structure. Update config write operations in 2l-mvp.md to include this field. Ensure backward compatibility (old configs without field).
- Straightforward: Add one field to YAML schema, update write operations.

**Master Plan Synthesis Update**
- Why medium: Master planner must read 2-4 explorer reports (currently reads 2). Logic must adapt to variable number of reports. All reports must be considered in synthesis.
- Straightforward: Change from reading fixed 2 reports to reading glob pattern `master-explorer-*-report.md`, iterate through all.

### Low Complexity Areas

**Explorer Spawn Prompts in 2l-mvp.md**
- Trivial: Copy existing explorer 1 & 2 spawn logic, parameterize for explorers 3 & 4. ~40 lines total.

**Healer Prompt Enhancement**
- Straightforward: Add explicit "Read the healing exploration report" guidance. Add examples of using exploration insights. ~20 lines.

**Testing Infrastructure**
- Straightforward: Create test visions of varying complexity (simple: 3 features, medium: 8 features + 1 integration, complex: 20 features + 5 integrations). Run full orchestration, verify correct num_explorers spawned.

## Technology Recommendations

### Primary Stack

**Adaptive Spawning: Python-style Pseudocode in 2l-mvp.md**
- Rationale: 2l-mvp.md already uses Python-style pseudocode for orchestration logic. Feature counting can use simple regex patterns on vision content. No external dependencies needed (Read tool for vision, string matching for patterns).
- Alternatives considered: Bash script with grep/wc (less readable, harder to maintain), Separate analysis agent (overkill for simple counting).

**Explorer Agent Definitions: Markdown Prompt Templates**
- Rationale: All existing agents use markdown format with YAML frontmatter. Explorer 3 & 4 follow same pattern. Reuse existing report templates with focus area customization.
- Alternatives considered: JSON/YAML agent definitions (breaks existing pattern), Code-based agent definitions (2L uses prompt-based agents).

**Config Extension: YAML Schema**
- Rationale: config.yaml already uses YAML for orchestration state. Adding num_explorers field is natural. YAML supports nested structures (plans → master_exploration → num_explorers).
- Alternatives considered: Separate config file for explorers (unnecessary complexity), Derive from filesystem (fragile, resume would fail if reports deleted).

### Supporting Libraries

**Pattern Matching for Feature/Integration Counting:**
- Approach: Regex patterns in Python pseudocode
- Patterns needed:
  - Features: Lines starting with numbers (1., 2., 3.) or bullet points (-, *) in feature sections
  - Integrations: Keywords (API, OAuth, webhook, third-party service names)
  - User flows: Keywords (user story, user flow, acceptance criteria)
- Implementation: Simple string matching, no NLP required

**No External Dependencies Required.** All functionality implemented with existing 2L tools (Read for vision content, string manipulation for counting, Write for config updates).

## Integration Points

### External APIs

None. Iteration 3 is internal orchestration logic only.

### Internal Integrations

**Integration 1: Vision Content → Adaptive Spawning Logic**
- How they connect: 2l-mvp.md reads vision.md, passes content to calculate_num_explorers function
- Data flow: vision.md (static) → read by orchestrator → analyzed for feature/integration count → determines num_explorers → spawns that many explorers
- Coupling: Loose (vision structure can vary, counting is heuristic-based)
- Testing: Test with different vision formats (numbered lists, bullet points, prose paragraphs)

**Integration 2: Explorer Reports → Master Planner**
- How they connect: Master planner reads all explorer reports (2-4 reports) from master-exploration/ directory
- Data flow: Explorers write reports → Master planner reads glob pattern master-explorer-*.md → Synthesizes insights → Writes master-plan.yaml
- Coupling: Loose (planner adapts to available reports)
- Testing: Test with 2, 3, and 4 explorer reports, verify planner synthesizes all insights

**Integration 3: Num_Explorers → Config → Resume Detection**
- How they connect: Orchestrator writes num_explorers to config.yaml, resume detection reads it to know how many explorer reports to expect
- Data flow: calculate_num_explorers() → write to config → resume reads config → checks for that many reports → spawns missing explorers
- Coupling: Medium (resume depends on config accuracy)
- Testing: Test resume with incomplete exploration (e.g., only 2 of 4 explorers completed)

**Integration 4: Healing Exploration Reports → Healers**
- How they connect: Healers receive exploration_report path in spawn prompt, read reports for root cause insights
- Data flow: Validation fails → Explorers analyze failures → Write exploration reports → Healers read reports → Apply fix strategies from exploration
- Coupling: Medium (healer effectiveness depends on exploration quality)
- Testing: Test healing with good exploration reports (detailed root causes) vs minimal reports (basic categorization), measure healing success rate

**Integration 5: Explorer Agent Definitions → Claude Agent Spawn**
- How they connect: Orchestrator invokes Claude agents using /agent-use with 2l-master-explorer agent definition
- Data flow: Orchestrator specifies explorer focus area → Claude loads 2l-master-explorer.md → Reads focus area section → Executes analysis → Writes report
- Coupling: Tight (agent definition determines explorer behavior)
- Testing: Test each explorer focus area independently, verify report structure matches template

## Risks & Challenges

### Technical Risks

**Risk 1: Feature Counting Heuristic Inaccuracy**
- Impact: Incorrect num_explorers calculation (e.g., spawn 4 explorers for simple 3-feature project)
- Probability: MEDIUM (unstructured text analysis is inherently heuristic)
- Mitigation: Use conservative thresholds (bias toward fewer explorers). Provide override mechanism in vision (e.g., "# Expected Complexity: SIMPLE" comment). Test with diverse vision formats. Fallback: If heuristic fails, default to 2 explorers (existing behavior).
- Owner: Adaptive spawning logic in 2l-mvp.md

**Risk 2: Explorer 3 & 4 Focus Area Overlap with Explorers 1 & 2**
- Impact: Redundant analysis, confusion in master plan synthesis
- Probability: MEDIUM (UX analysis overlaps with architecture, scalability overlaps with risk assessment)
- Mitigation: Define clear boundaries in agent definitions. Explorer 1 focuses on component architecture, Explorer 3 focuses on user interaction flows. Explorer 2 focuses on dependency risks, Explorer 4 focuses on performance/scaling. Provide negative examples ("Explorer 3 does NOT analyze component architecture - that's Explorer 1's job").
- Owner: agents/2l-master-explorer.md definitions

**Risk 3: Config.yaml Backward Compatibility**
- Impact: Old plans without num_explorers field break resume detection
- Probability: MEDIUM (existing plans in wild)
- Mitigation: Default to 2 explorers if num_explorers field missing. Check for field existence before reading. Add migration note in 2L changelog.
- Owner: commands/2l-continue.md resume logic

**Risk 4: Healing Exploration Reports Not Actionable for Healers**
- Impact: Healers ignore exploration reports, fix symptoms instead of root causes
- Probability: MEDIUM (exploration quality varies)
- Mitigation: Enhance healing explorer prompts with specific guidance on what healers need (e.g., "For each failure category, provide a concrete fix strategy with file locations and code patterns"). Add examples of good exploration reports to explorer agent definition. Test healing flow, verify healers reference exploration insights in their reports.
- Owner: Explorer prompts in 2l-mvp.md lines 892-970, agents/2l-healer.md guidance

### Complexity Risks

**Risk 1: Adaptive Spawning Logic Breaks Orchestration**
- Impact: Orchestration fails during master exploration phase, no explorers spawned or wrong number spawned
- Probability: LOW (logic is straightforward, but critical path)
- Mitigation: Extensive testing with edge cases (empty vision, malformed vision, very large vision). Fallback to 2 explorers if calculation fails. Add error handling around calculate_num_explorers function. Log decision reasoning for debugging.
- Builder should NOT split: Adaptive spawning is cohesive logic (~100 lines), splitting would create unnecessary coordination overhead.

**Risk 2: Master Explorer Definitions Too Complex for Single Builder**
- Impact: Builder splits into sub-builders, coordination overhead increases
- Probability: MEDIUM (150+ lines of new agent definitions)
- Mitigation: Provide clear template for explorer definitions (reuse Explorer 1 & 2 structure). If builder chooses to split, split by explorer (Sub-builder A: Explorer 3, Sub-builder B: Explorer 4) rather than by section. Each sub-builder can work independently since explorers don't depend on each other.
- Builder might SPLIT: If total agent definition updates exceed 300 lines, builder may split into 2 sub-builders (Explorer 3 definition + Explorer 4 definition).

**Risk 3: Iteration 3 Scope Too Large for Single Iteration**
- Impact: Iteration takes >8 hours, builders struggle with coordination
- Probability: LOW (two loosely coupled subsystems)
- Mitigation: Healing exploration is verification-only (mostly done), master explorers are independent additions. If iteration proves too large during planning, split into: Iteration 3A (Master explorer scaling only), Iteration 3B (Healing exploration refinement). Test healing exploration first (quick validation), then proceed to master explorers (larger implementation).

## Recommendations for Planner

1. **Prioritize master explorer scaling over healing exploration refinement**
   - Rationale: Healing exploration already exists and is functional (lines 878-972 in 2l-mvp.md). Master explorer scaling is greenfield work that provides more value (better strategic planning for complex projects). Healing refinement can be minimal validation and documentation improvements.
   - Recommended builder sequence: Builder 1 implements adaptive spawning logic (2-3 hours), Builder 2 adds Explorer 3 & 4 definitions (3-4 hours), Builder 3 updates resume detection and config (1-2 hours), Builder 4 validates healing exploration (1 hour).

2. **Use heuristic feature counting with conservative thresholds**
   - Rationale: Perfect accuracy is impossible with unstructured text. Biasing toward fewer explorers (2-3 instead of 3-4) is safer - underspawning is better than overspawning for simple projects.
   - Implementation: Set thresholds at <5 features (2 explorers), <15 features (3 explorers), ≥15 features (4 explorers). Err on side of fewer explorers.
   - Testing: Provide 5-6 sample visions with known expected num_explorers for validation.

3. **Define clear, non-overlapping focus areas for Explorers 3 & 4**
   - Rationale: Overlap between explorers creates confusion and redundant analysis. Master plan quality depends on each explorer providing unique insights.
   - Implementation: Explorer 3 focuses on USER-FACING concerns (flows, forms, navigation, error states), Explorer 4 focuses on INFRASTRUCTURE concerns (database performance, caching, deployment, monitoring). Provide negative examples in agent definitions.
   - Testing: Review explorer reports from test run, verify no significant overlap in findings.

4. **Make healing exploration validation lightweight (1-2 hour task)**
   - Rationale: Implementation already exists and appears complete. Validation should verify it works, not rebuild it.
   - Implementation: Create test scenario with intentional failures (TypeScript errors, failing tests, lint issues). Run healing phase. Verify: (1) Exploration reports generated, (2) Healers reference exploration in their reports, (3) Healing succeeds. If validation reveals issues, refine prompts only (don't restructure).
   - Scope: If validation takes >2 hours, stop and flag for future iteration.

5. **Implement config.yaml backward compatibility from day one**
   - Rationale: Existing plans in production (e.g., this very plan!) will resume after Iteration 3. Broken resume detection is critical failure.
   - Implementation: All config reads check for num_explorers field existence. If missing, default to 2 (existing behavior). Add migration logic: "If config.yaml version < 1.3, assume 2 explorers."
   - Testing: Test resume with old config format (no num_explorers field), verify defaults to 2 explorers.

6. **Consider config override for num_explorers in vision document**
   - Rationale: Heuristic analysis may be wrong. Power users should be able to specify desired num_explorers explicitly.
   - Implementation: Add optional frontmatter to vision.md: `# Meta: num_explorers = 3`. Orchestrator checks for this, uses explicit value if present, otherwise calculates heuristically.
   - Priority: NICE TO HAVE (not required for Iteration 3 success).

7. **Test master explorer scaling with real diverse visions**
   - Rationale: This iteration's vision (5 features, 0 external integrations) would spawn 2-3 explorers. Need to validate with complex visions too.
   - Implementation: Create 3 test visions: Simple (3 features, 0 integrations → expect 2 explorers), Medium (10 features, 2 integrations → expect 3 explorers), Complex (20 features, 5 integrations → expect 4 explorers). Run master exploration phase on each, verify correct spawning.
   - Timing: Test BEFORE marking iteration complete.

## Resource Map

### Critical Files/Directories

**commands/2l-mvp.md** (MODIFIED FILE - Primary orchestration)
- Current size: 1176 lines
- Changes for master explorers: Lines 267-315 (master exploration phase) + lines 316-387 (master plan synthesis)
  - Add calculate_num_explorers function (~40 lines)
  - Update explorer spawning loop to be dynamic (~20 modified lines)
  - Update planner to read N explorer reports (~10 modified lines)
  - Add config write for num_explorers (~5 lines)
- Changes for healing exploration: Lines 878-972 (verification only, potential prompt refinements)
  - Add comments documenting existing logic (~10 lines)
  - Potentially enhance explorer prompts (~20 modified lines)
- Total impact: ~105 new/modified lines
- Risk: MEDIUM (critical orchestration file, but changes are localized)
- Testing: Full orchestration flow with 2/3/4 explorer scenarios

**agents/2l-master-explorer.md** (MODIFIED FILE - Agent definitions)
- Current size: ~400 lines (estimated)
- Changes:
  - Update "Your Focus Area" section to list all 4 explorers (~10 lines)
  - Add Explorer 3 definition (~70 lines: description, analysis framework, report template)
  - Add Explorer 4 definition (~70 lines: description, analysis framework, report template)
  - Update report template examples to cover all 4 explorers (~10 lines)
- Total impact: ~160 new lines
- Risk: LOW (agent definitions are additive, no breaking changes)
- Testing: Spawn each explorer independently, verify report structure

**agents/2l-healer.md** (MODIFIED FILE - Verification and enhancement)
- Current size: ~500 lines (estimated)
- Changes:
  - Add explicit guidance on reading exploration reports (~30 lines)
  - Add examples of exploration-informed healing (~40 lines)
  - Update "Your Inputs" section to highlight exploration reports (~10 lines)
- Total impact: ~80 new lines
- Risk: LOW (clarification and guidance, not logic changes)
- Testing: Run healing phase, verify healers reference exploration reports

**commands/2l-plan.md** (MODIFIED FILE - Master planning orchestration)
- Current size: ~300 lines (estimated)
- Changes:
  - Add calculate_num_explorers function (copy from 2l-mvp.md, ~40 lines)
  - Update explorer spawning logic (~20 lines)
  - Update master plan synthesis for N reports (~10 lines)
- Total impact: ~70 new/modified lines
- Risk: LOW (mirrors changes in 2l-mvp.md)
- Testing: Run /2l-plan with diverse visions

**commands/2l-continue.md** (MODIFIED FILE - Resume detection)
- Current size: ~400 lines (estimated)
- Changes:
  - Update master exploration incomplete check (line ~95, ~20 modified lines)
  - Add config read for num_explorers (~10 lines)
  - Add fallback for missing num_explorers field (~10 lines)
- Total impact: ~40 new/modified lines
- Risk: LOW (resume enhancement, backward compatible)
- Testing: Test resume with incomplete exploration, verify correct explorer spawning

**config.yaml** (SCHEMA EXTENSION)
- New field: master_exploration.num_explorers
- Example:
```yaml
plans:
  - plan_id: plan-1
    master_exploration:
      num_explorers: 3  # NEW FIELD
      status: COMPLETE
      explorers:
        - id: 1
          report: master-exploration/master-explorer-1-report.md
        - id: 2
          report: master-exploration/master-explorer-2-report.md
        - id: 3
          report: master-exploration/master-explorer-3-report.md
```
- Risk: LOW (additive schema change)
- Testing: Verify config writes correctly, test resume with new schema

**.2L/plan-{N}/master-exploration/** (DIRECTORY - Explorer reports)
- Purpose: Store 2-4 master explorer reports
- Contents: master-explorer-{1,2,3,4}-report.md (based on num_explorers)
- Lifecycle: Created during master exploration phase, read by master planner
- Growth: 2-4 files per plan (no cleanup needed, reports are permanent artifacts)

**.2L/plan-{N}/iteration-{M}/healing-{N}/exploration/** (DIRECTORY - Healing explorer reports)
- Purpose: Store 1-2 healing explorer reports per healing attempt
- Contents: healing-explorer-1-report.md (always), healing-explorer-2-report.md (conditional)
- Lifecycle: Created during healing exploration phase, read by healers
- Status: ALREADY EXISTS in current architecture (lines 881-883 in 2l-mvp.md)

### Key Dependencies

**Vision Document (vision.md)** (Input dependency)
- Why needed: Source of feature/integration counts for adaptive spawning
- Format: Markdown with features listed in numbered/bulleted sections
- Availability: Must exist before master exploration phase
- Fallback: If vision missing, default to 2 explorers (safe default)

**Config.yaml Schema** (State dependency)
- Why needed: Tracks num_explorers for resume detection
- Format: YAML with nested structure
- Availability: Written by orchestrator, read by resume logic
- Fallback: If num_explorers field missing, default to 2 (backward compatible)

**Explorer Agent Definition (agents/2l-master-explorer.md)** (Agent dependency)
- Why needed: Defines behavior of explorers 1-4
- Format: Markdown prompt template with YAML frontmatter
- Availability: Must be updated before spawning explorers 3 & 4
- Fallback: None (if agent definition incomplete, explorer spawning fails)

**Healing Exploration Implementation (2l-mvp.md lines 878-972)** (Existing dependency)
- Why needed: Foundation for healing exploration validation
- Format: Python-style pseudocode in orchestration logic
- Availability: Already exists (implemented in Iteration 1)
- Fallback: None needed (implementation is complete)

### Testing Infrastructure

**Testing Approach: Stratified Complexity Testing**
- Rationale: Master explorer scaling depends on vision complexity. Must test across spectrum (simple/medium/complex) to validate adaptive spawning.

**Test 1: Simple Vision (2 Explorers Expected)**
- Setup: Create vision with 3 features, 0 external integrations, minimal user flows
- Execute: Run /2l-mvp (or /2l-plan) master exploration phase
- Verify: Exactly 2 explorers spawned (explorer 1 and 2), config.yaml has num_explorers=2, master planner reads 2 reports
- Edge cases: Very minimal vision (1 feature), vision with only descriptions (no explicit features listed)

**Test 2: Medium Vision (3 Explorers Expected)**
- Setup: Create vision with 10 features, 2 external integrations (e.g., Stripe API, email service), 3-4 user flows
- Execute: Run /2l-mvp master exploration phase
- Verify: Exactly 3 explorers spawned (explorer 1, 2, 3), config.yaml has num_explorers=3, master planner reads 3 reports, Explorer 3 report covers UX/integration points
- Edge cases: Vision with many integrations but few features (should still trigger Explorer 3)

**Test 3: Complex Vision (4 Explorers Expected)**
- Setup: Create vision with 20+ features, 5+ external integrations, complex user flows, performance requirements mentioned
- Execute: Run /2l-mvp master exploration phase
- Verify: Exactly 4 explorers spawned, config.yaml has num_explorers=4, master planner reads 4 reports, Explorer 4 report covers scalability/performance
- Edge cases: Vision with scalability keywords but <15 features (verify Explorer 4 still spawned if complexity signals present)

**Test 4: Healing Exploration Flow**
- Setup: Create iteration that will fail validation (e.g., introduce TypeScript errors, failing tests, lint issues across multiple categories)
- Execute: Run full iteration, let validation fail, observe healing phase
- Verify: Healing exploration phase executes (healing-{1}/exploration/ directory created), healing-explorer-1-report.md generated with root cause analysis, healers spawned with exploration report path, healers reference exploration insights in their reports, healing succeeds
- Edge cases: Single failure category (verify no explorer 2), >3 failure categories (verify explorer 2 spawns), healing fails (verify re-attempts include fresh exploration)

**Test 5: Resume Detection with Variable Explorers**
- Setup: Start master exploration with 4 explorers, interrupt after 2 complete
- Execute: Run /2l-continue
- Verify: Resume reads config (num_explorers=4), detects 2 reports exist, spawns explorers 3 and 4 only (not 1 and 2), continues to master planning after all 4 complete
- Edge cases: Resume with old config format (no num_explorers field, defaults to 2), resume with all explorers complete (skips directly to planning)

**Test 6: Backward Compatibility**
- Setup: Use config.yaml from before Iteration 3 (no num_explorers field)
- Execute: Run /2l-continue or /2l-mvp
- Verify: System defaults to 2 explorers, no errors, orchestration continues normally
- Edge cases: Resume with partially complete old-style exploration (2 explorers only)

**Test 7: Explorer Report Quality**
- Setup: Run master exploration with 4 explorers on diverse vision
- Execute: Read all 4 explorer reports
- Verify: No significant overlap in findings between explorers, each explorer covers its focus area thoroughly, master plan synthesizes insights from all 4 reports
- Metrics: Check for duplicate recommendations (should be <10%), verify each explorer report is >50 lines (substantial analysis)

**Test 8: End-to-End Integration**
- Setup: Create complex vision (20 features, 5 integrations), run full orchestration
- Execute: Master exploration (4 explorers) → Master planning → Iteration execution → Healing (if needed)
- Verify: All phases complete successfully, event logging tracks all 4 explorers, dashboard shows all 4 explorer agents, final build quality high (leveraging all explorer insights)
- Success metric: Project completes in single iteration (or planned iterations), no manual intervention needed

## Questions for Planner

**Q1: Should calculate_num_explorers be a helper function or inline logic?**
- Context: Feature counting can be implemented as separate helper function (calculate_num_explorers) or inline in orchestration.
- Options: Helper function (reusable between 2l-mvp.md and 2l-plan.md, cleaner), Inline logic (simpler, no function overhead).
- Recommendation: Helper function (both files need same logic, DRY principle).

**Q2: What if feature counting heuristic is completely wrong?**
- Context: Unstructured text analysis can miscount (e.g., "3 main features with 10 sub-features" might count as 3 or 13).
- Options: Accept inaccuracy (bias toward fewer explorers), Add override in vision (e.g., "# Meta: num_explorers = 4"), Use LLM to count features (expensive, adds latency).
- Recommendation: Accept inaccuracy with conservative thresholds, add vision override as nice-to-have. Document limitation in 2L user guide.

**Q3: Should healing explorer 2 threshold be adjustable?**
- Context: Currently spawns if >3 failure categories. Some projects might need different threshold.
- Options: Hardcoded 3 (simple, works for most cases), Configurable in vision or config (flexible but adds complexity).
- Recommendation: Hardcoded 3 for Iteration 3 (keeps scope manageable). Future iteration can add configurability if users request it.

**Q4: What if Explorer 3 or 4 reports are low quality (too generic)?**
- Context: New explorer focus areas might not produce actionable insights initially.
- Options: Fail iteration (strict quality control), Accept and iterate (explorers improve over time), Validation phase checks report quality (adds complexity).
- Recommendation: Accept and iterate. Monitor first few uses of Explorers 3 & 4, refine prompts in subsequent iteration if needed. Add quality guidance to agent definitions (e.g., "Provide 5-10 specific recommendations, not general principles").

**Q5: Should num_explorers be visible to user in dashboard?**
- Context: Dashboard shows active agents. Users might want to know how many explorers are running.
- Options: Show in dashboard (transparency), Don't show (internal implementation detail), Show only during master exploration phase (contextual).
- Recommendation: Show during master exploration phase ("Master Exploration: 3/4 explorers complete"). Helps user understand why exploration is taking longer for complex projects. Requires dashboard enhancement (out of scope for Iteration 3, but logged for future).

**Q6: Should healers validate exploration report quality before using it?**
- Context: If exploration report is minimal or low-quality, healer might misinterpret.
- Options: Trust exploration reports (simple, fast), Validate quality (healer checks report has minimum content), Fallback to validation-only healing (if exploration poor, healer ignores it).
- Recommendation: Trust exploration reports for Iteration 3. If healing success rate drops after this iteration, add validation in future iteration. Log healer feedback ("Exploration report was helpful" / "Exploration report was insufficient").

---

**Exploration completed: 2025-10-03**

**Key Takeaway:** Iteration 3 has two independent subsystems: (1) Healing exploration is already implemented (lines 878-972) and needs validation only (~1 hour work), (2) Master explorer scaling is greenfield work requiring adaptive spawning logic, Explorer 3 & 4 definitions, and resume detection updates (~6-7 hours work). Total complexity is HIGH but manageable in single iteration because subsystems are loosely coupled and can be tested independently. Main risk is adaptive spawning heuristic accuracy - mitigate with conservative thresholds and fallback to 2 explorers. Recommended builder split: 3-4 builders (adaptive logic, explorer definitions, resume detection, healing validation) working in parallel on independent components.
