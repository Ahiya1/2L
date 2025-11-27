# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Complete the meta-circular learning loop by federating learnings from all Prod/* projects into the meditation space's /2l-improve workflow, enabling ecosystem-wide framework improvement.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 5 must-have features
- **User stories/acceptance criteria:** 25 acceptance criteria across 5 core features
- **Estimated total work:** 8-12 hours

### Complexity Rating
**Overall Complexity: MEDIUM**

**Rationale:**
- **Moderate scope:** 5 well-defined features with clear boundaries (multi-source discovery, filtering, aggregation, source tracking, priority fixes)
- **Existing infrastructure:** Builds on established reflection generator and aggregator components (incremental changes, not greenfield)
- **Clear architectural pattern:** Extends existing JSONL → YAML aggregation pipeline with multi-source capability
- **Technical challenges:** Glob-based discovery, framework vs project heuristics, backward compatibility considerations
- **Low risk:** Non-breaking changes (additive schema fields), graceful degradation on missing files

---

## Architectural Analysis

### Major Components Identified

1. **Multi-Source Learning Discovery**
   - **Purpose:** Discover and read global-learnings.jsonl files from meditation space + all Prod/* projects
   - **Complexity:** LOW-MEDIUM
   - **Why critical:** Foundation for federation - without discovery, no ecosystem-wide aggregation possible
   - **Implementation approach:**
     - Glob pattern matching: `~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl`
     - Meditation space hardcoded: `~/Ahiya/2L/.2L/global-learnings.jsonl`
     - Graceful handling of missing files (new projects without learnings)

2. **Reflection Generator Enhancement (Framework Filtering)**
   - **Purpose:** Filter reflection to capture only framework issues, not project-specific bugs/features
   - **Complexity:** MEDIUM
   - **Why critical:** Signal-to-noise ratio - prevents pollution of framework learnings with app-specific issues
   - **Implementation approach:**
     - Enhanced keyword detection (existing FRAMEWORK_KEYWORDS expanded)
     - Path-based heuristics (commands/, lib/, agents/ vs app/, src/, components/)
     - Conservative bias (prefer false negatives to avoid noise)
     - Documentation of classification rules

3. **Reflection Aggregator Enhancement (Multi-Source)**
   - **Purpose:** Accept and process learnings from multiple JSONL sources, preserve source tracking
   - **Complexity:** LOW-MEDIUM
   - **Why critical:** Merges ecosystem-wide learnings into unified pattern set with cross-project evidence
   - **Implementation approach:**
     - Extend `read_jsonl()` to accept list of paths
     - Add `source_project` field extraction (derive from directory path)
     - Aggregate `source_projects` list in patterns (merge on similarity match)
     - Add `evidence_count` field to patterns

4. **Source Project Tracking**
   - **Purpose:** Tag each learning with originating project for cross-project pattern confidence assessment
   - **Complexity:** LOW
   - **Why critical:** Enables pattern confidence: 1 project = possible fluke, 3+ projects = high-confidence issue
   - **Implementation approach:**
     - Add `source_project` field to learning JSONL schema
     - Derive from directory structure (e.g., Prod/StatViz → "StatViz", meditation space → "meditation-space")
     - Preserve through aggregation pipeline
     - Display in dashboard and vision generation

5. **Priority Classification Refinement**
   - **Purpose:** Clarify P1/P2/P3 to focus on framework (not app) issues
   - **Complexity:** LOW
   - **Why critical:** Prevents misclassification (e.g., "app is slow" marked P3 instead of "framework is slow")
   - **Implementation approach:**
     - Update docstrings in reflection-generator.py
     - Refine priority categorization logic
     - Add examples in reflection template
     - P1 = 2L workflow broken, P2 = 2L missing features, P3 = 2L framework performance

---

### Technology Stack Implications

**Existing Stack (No Changes Required)**
- **Language:** Python 3 for aggregation/reflection scripts, Bash for orchestration commands
- **Data Formats:** JSONL for append-only learnings, YAML for aggregated patterns
- **File System:** Glob pattern matching via Python's `glob` module
- **Rationale:** Existing tools are sufficient - no new dependencies needed

**Data Schema Evolution**
- **Learning Entry (JSONL):**
  - New field: `source_project` (string, e.g., "StatViz", "meditation-space")
  - Backward compatible: Existing entries without field handled gracefully
- **Pattern (YAML):**
  - New field: `source_projects` (list of strings, e.g., ["StatViz", "TaskManager"])
  - New field: `evidence_count` (integer, count of supporting learnings)
  - Backward compatible: Existing patterns without fields handled gracefully

**Discovery Configuration**
- **Options:**
  1. Hardcoded glob pattern in /2l-improve
  2. Configuration file (.2L/config.yaml with `learning_sources` array)
  3. Environment variable (2L_PROD_DIR)
- **Recommendation:** Hardcoded for MVP (~/Ahiya/2L/Prod/*)
- **Rationale:** Simplest implementation, matches current meditation space convention, configurable later if needed

---

## Iteration Breakdown Recommendation

### Recommendation: SINGLE ITERATION

**Rationale:**
- **Cohesive scope:** All 5 features are tightly coupled (discovery feeds aggregation, filtering ensures quality, source tracking enables confidence)
- **Incremental changes:** Extends existing components (reflection-generator.py, reflection-aggregator.py) rather than greenfield development
- **Clear dependency chain:** Discovery → Filtering → Aggregation → Source Tracking → Priority Fixes (but can be built sequentially within one iteration)
- **Modest estimated duration:** 8-12 hours (fits well within single focused iteration)
- **Low integration risk:** All changes localized to 2 Python scripts + /2l-improve command
- **Testing simplicity:** Single end-to-end validation flow (run /2l-improve, verify cross-project patterns)

**Single Iteration Vision:**
- **Iteration 1: Cross-Project Learning Federation (Complete MVP)**
  - Scope: Implement all 5 must-have features
  - Duration: 8-12 hours
  - Risk: LOW-MEDIUM (well-understood tech, clear requirements)
  - Success criteria: /2l-improve discovers learnings from Prod/*, patterns show source_projects list, reflections contain only framework issues

---

## Dependency Graph

```
Single Iteration: Cross-Project Learning Federation

Foundation Layer (can build in parallel):
├── Feature 1: Multi-Source Discovery
│   └── Glob pattern matching in /2l-improve
│   └── Pass multiple paths to aggregator
│
└── Feature 2: Framework-Only Filtering
    └── Enhanced keyword detection in reflection-generator.py
    └── Path-based heuristics
    └── Priority classification refinement

Core Layer (depends on foundation):
├── Feature 3: Source Project Tracking
│   └── Add source_project field to JSONL
│   └── Derive from directory path
│   └── Preserve through aggregation
│
└── Feature 4: Multi-Source Aggregation
    └── Extend read_jsonl() for multiple sources
    └── Aggregate source_projects list
    └── Add evidence_count field

Integration Layer (depends on core):
└── Feature 5: End-to-End Validation
    └── Test with existing Prod/* projects
    └── Verify cross-project pattern detection
    └── Dashboard displays source breakdown
```

**Key Insight:** While there are dependencies, they're all within a single logical unit of work. Building these sequentially in one iteration is more efficient than splitting across multiple iterations (which would require intermediate states and more integration overhead).

---

## Risk Assessment

### Medium Risks

- **Risk:** Framework vs project classification heuristics may have false positives/negatives
  - **Impact:** Learnings incorrectly categorized (framework issues missed OR project noise included)
  - **Mitigation:**
    - Conservative bias (prefer false negatives - skip if uncertain)
    - Comprehensive keyword list (FRAMEWORK_KEYWORDS + path patterns)
    - Manual review of first 10-20 learnings from Prod/* projects
    - Document edge cases and classification rules
  - **Recommendation:** Build classification, test with StatViz learnings, refine before full rollout

- **Risk:** Glob pattern may not find all intended projects (nested structures, symlinks, non-standard naming)
  - **Impact:** Some Prod/* projects excluded from federation
  - **Mitigation:**
    - Test glob pattern against actual Prod/ directory structure
    - Log discovered sources (so user sees what's included)
    - Graceful handling of missing files
    - Document discovery assumptions (e.g., Prod/{ProjectName}/.2L/global-learnings.jsonl)
  - **Recommendation:** Validate discovery in builder phase with actual Prod/* directory

- **Risk:** Source project name derivation ambiguous for nested/complex paths
  - **Impact:** Incorrect source_project tags (e.g., "clients" instead of "acme-dashboard")
  - **Mitigation:**
    - Use immediate parent directory of .2L as source name
    - Document naming convention (Prod/{SourceName}/.2L)
    - Future enhancement: Allow manual override in config
  - **Recommendation:** Start simple (immediate parent), refine if needed in post-MVP

### Low Risks

- **Risk:** Backward compatibility with existing learnings (no source_project field)
  - **Impact:** Old learnings without source_project field cause errors
  - **Mitigation:** Graceful handling (default to "unknown" or "meditation-space"), already addressed in design
  - **Recommendation:** Test with existing .2L/global-learnings.jsonl (which lacks source_project)

- **Risk:** Performance degradation with 100+ learnings from 10+ projects
  - **Impact:** /2l-improve takes >5s for aggregation
  - **Mitigation:**
    - Incremental aggregation mode (only process new learnings)
    - JSONL append is O(1), aggregation is O(n*m) where n=learnings, m=patterns
    - With 100 learnings and 20 patterns, ~2000 comparisons (fast with difflib)
  - **Recommendation:** Monitor aggregation time, optimize only if exceeds 5s threshold

---

## Integration Considerations

### Cross-Phase Integration Points
- **Reflection generator ↔ Aggregator:** Schema consistency (source_project field must be preserved)
- **Aggregator ↔ Vision generator:** Pattern schema (source_projects list used in vision context)
- **Discovery ↔ Aggregator:** Path handling (absolute vs relative paths, consistent handling)

### Potential Integration Challenges

- **Challenge:** /2l-improve command modification (Step 2.5 exploration already uses explorers, need to avoid conflicts)
  - **Description:** /2l-improve currently spawns explorers for self-analysis. Adding discovery logic before vision generation requires careful integration.
  - **Why it matters:** Don't want to break existing exploration phase
  - **Recommendation:** Add discovery BEFORE exploration (Step 2.0), pass discovered sources to aggregator after exploration completes

- **Challenge:** Vision generator expects single pattern, but now pattern has multi-source evidence
  - **Description:** Vision template may need updates to display cross-project evidence
  - **Why it matters:** User should see "detected in StatViz, TaskManager" in vision
  - **Recommendation:** Extend vision-generator.py to include source_projects list in vision context

---

## Recommendations for Master Plan

1. **Single iteration approach recommended**
   - All 5 features are tightly coupled and build on each other
   - Splitting would create awkward intermediate states (e.g., aggregator that can handle multi-source but discovery doesn't provide it)
   - Total scope (8-12 hours) fits comfortably in one focused iteration

2. **Prioritize framework filtering early in builder sequence**
   - Build and test filtering heuristics FIRST (before multi-source discovery)
   - Rationale: No point federating learnings from Prod/* if they're polluted with project noise
   - Validation: Run reflection generator on existing StatViz iterations, manually verify only framework issues captured

3. **Use existing Prod/* projects as validation dataset**
   - StatViz, mirror-of-dreams, wealth likely have learnings
   - Test discovery against real directory structure (not mocks)
   - Verify cross-project pattern detection with actual data

4. **Graceful degradation throughout**
   - Missing Prod/* projects: Skip gracefully, log warning
   - Missing JSONL files: Skip gracefully (new projects without learnings yet)
   - Malformed JSONL: Log error, continue with valid sources
   - Rationale: Federation should be additive (meditation space learnings always work, Prod/* is bonus)

5. **Defer dashboard enhancements to post-MVP**
   - Vision lists source_projects breakdown (sufficient for MVP)
   - Dashboard cross-project drill-down is "should-have" not "must-have"
   - Rationale: Focus on core aggregation, UI polish comes later

---

## Technology Recommendations

### Existing Codebase Findings

- **Stack detected:** Python 3 (reflection/aggregation scripts), Bash (orchestration commands), YAML (structured data), JSONL (append-only log)
- **Patterns observed:**
  - Glob-based discovery (used in other parts of 2L, e.g., plan directory discovery)
  - Graceful error handling (try/except with logged warnings, continue on error)
  - File locking for concurrent writes (fcntl in reflection-generator.py)
  - Atomic writes for YAML updates (2l-yaml-helpers.py)
  - Event logging for observability (2l-event-logger.sh)
- **Opportunities:**
  - Reuse existing patterns (glob discovery, graceful error handling, file locking)
  - Extend existing scripts (don't create new ones)
  - Follow established naming conventions (2l-{component}.py)
- **Constraints:**
  - Must maintain backward compatibility (existing learnings without source_project)
  - Must run in meditation space only (don't federate from arbitrary directories)
  - Must preserve existing aggregation semantics (incremental vs full mode)

### Greenfield Recommendations
N/A - This is brownfield (extending existing components)

---

## Component Architecture Breakdown

### Component 1: /2l-improve Command (Bash)
**Location:** `commands/2l-improve.md`

**Current Responsibilities:**
- Pattern detection from global-learnings.yaml
- Pattern selection (auto-select top or manual via --pattern flag)
- System exploration (spawn 3 explorers to analyze 2L codebase)
- Vision generation from pattern
- Confirmation workflow
- Self-modification execution (safety checks, /2l-mvp invocation, git commit)

**Proposed Changes:**
- **New Step 1.5: Multi-Source Discovery** (insert after pattern detection, before selection)
  - Glob `~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl`
  - Collect paths into array
  - Log discovered sources
  - Pass to aggregator (modify aggregation invocation)
- **Modified Aggregation Invocation:**
  - Currently: Reads meditation space global-learnings.jsonl only
  - New: Pass multiple --jsonl paths OR auto-discover in aggregator
  - Preferred: Auto-discover in aggregator (keeps /2l-improve simple)

**Complexity:** LOW (add discovery logic, modify aggregator call)

---

### Component 2: Reflection Generator (Python)
**Location:** `lib/2l-reflection-generator.py`

**Current Responsibilities:**
- Parse validation-report.md from iteration artifacts
- Extract framework issues using keyword/path matching
- Categorize by priority (P1/P2/P3)
- Generate REFLECTION.md
- Append learnings to global-learnings.jsonl

**Proposed Changes:**
- **Enhanced Framework Filtering:**
  - Expand FRAMEWORK_KEYWORDS list (current: orchestrator, explorer, builder, integrator, validator, healer, task tool, agent spawn, event logging, pattern detection, reflection, aggregation)
  - Add PROJECT_PATHS exclusion (app/, src/, components/, pages/, api/, public/, styles/, utils/, hooks/)
  - Refine is_framework_issue() heuristic (multi-level checks: path → keywords → conservative default)
- **Priority Classification Clarification:**
  - Update categorize_by_priority() docstring
  - P1 = 2L workflow broken (agent crashes, orchestrator fails)
  - P2 = 2L missing features (no healing, can't spawn tasks)
  - P3 = 2L framework performance (agent spawn slow, integration slow) - NOT app performance
  - Add examples in code comments
- **Source Project Tracking:**
  - Add `source_project` field to learning JSONL entries
  - Derive from working directory or explicit parameter
  - Default: "meditation-space" if in ~/Ahiya/2L, else extract from path

**Complexity:** MEDIUM (logic refinement, schema addition)

---

### Component 3: Reflection Aggregator (Python)
**Location:** `lib/2l-reflection-aggregator.py`

**Current Responsibilities:**
- Read learnings from single JSONL file
- Group similar learnings into patterns (difflib similarity matching, 0.8 threshold)
- Merge into existing patterns or create new
- Write to global-learnings.yaml

**Proposed Changes:**
- **Multi-Source JSONL Reading:**
  - Extend read_jsonl() to accept list of paths
  - OR auto-discover via glob pattern (preferred for simplicity)
  - Merge learnings from all sources into single list
  - Preserve source_project field from each learning
- **Source Tracking in Patterns:**
  - Add `source_projects` list field (merge on pattern match)
  - Add `evidence_count` integer field (count of learnings)
  - Update merge_into_pattern() to aggregate source_projects (deduplicate)
- **Deduplication Across Sources:**
  - If StatViz and TaskManager both have same learning (high similarity), merge into single pattern
  - Track both projects in source_projects list
  - Increment evidence_count
- **Backward Compatibility:**
  - Handle learnings without source_project (default to "unknown")
  - Handle patterns without source_projects (initialize to empty list)

**Complexity:** LOW-MEDIUM (extend existing logic, schema additions)

---

### Component 4: Vision Generator (Python)
**Location:** `lib/2l-vision-generator.py`

**Current Responsibilities:**
- Read pattern JSON
- Read exploration reports (explorer-1, explorer-2, explorer-3)
- Populate vision template with pattern + exploration context
- Write vision.md

**Proposed Changes:**
- **Cross-Project Evidence Display:**
  - Include source_projects list in vision context
  - Example: "This pattern detected in: StatViz (3 times), TaskManager (2 times), meditation-space (1 time)"
  - Add evidence_count to vision summary
- **Template Enhancement:**
  - Update improvement-vision.md template to display cross-project evidence
  - Show pattern confidence based on number of source projects

**Complexity:** LOW (template modification, add source context)

---

### Component 5: Dashboard (Future Enhancement)
**Location:** TBD (not in MVP scope)

**Proposed Future Enhancement:**
- Cross-project drill-down (see all learnings from specific project)
- Pattern confidence scoring (weight by source_projects count)
- Project health metrics (which projects hit most framework issues)

**Complexity:** N/A (out of scope for MVP)

---

## Build Sequence Recommendation

**Optimal builder assignment for single iteration:**

1. **Builder-1: Foundation (Discovery + Filtering)**
   - Implement multi-source discovery in /2l-improve
   - Enhance framework filtering in reflection-generator.py
   - Add source_project tracking to reflection generator
   - Refine priority classification
   - **Deliverable:** Reflection generator creates framework-only learnings with source tags
   - **Validation:** Run on StatViz, verify only framework issues captured

2. **Builder-2: Aggregation + Integration**
   - Extend aggregator for multi-source JSONL reading
   - Add source_projects and evidence_count to pattern schema
   - Update vision generator to display cross-project evidence
   - **Deliverable:** Aggregator merges multi-source learnings, vision shows source breakdown
   - **Validation:** Run /2l-improve, verify patterns list source_projects

3. **Builder-3: End-to-End Validation + Documentation**
   - Test with actual Prod/* projects (StatViz, mirror-of-dreams, wealth)
   - Verify cross-project pattern detection
   - Update /2l-improve help text and documentation
   - **Deliverable:** Fully functional cross-project federation
   - **Validation:** All acceptance criteria met

**Rationale for sequence:**
- Builder-1 establishes data quality (filtering) and schema (source tracking)
- Builder-2 builds on clean data to implement federation
- Builder-3 validates everything end-to-end with real data
- Clean handoffs between builders (Builder-1 outputs feed Builder-2, Builder-2 outputs validated by Builder-3)

---

## Notes & Observations

### Strategic Insights

1. **Meta-circular completeness:** This iteration closes the self-improvement loop. Previously, 2L learned from its own iterations (meditation space). Now it learns from ALL projects using it (ecosystem-wide). This is a significant milestone in meta-circular capability.

2. **Signal vs noise trade-off:** Framework filtering is critical. Without it, learnings would be polluted with app-specific issues (e.g., "React component slow" instead of "Integrator phase slow"). Conservative bias preferred (miss some framework issues rather than include project noise).

3. **Pattern confidence through convergence:** Cross-project evidence is powerful. If 3 different projects independently discover "integration phase slow", that's high-confidence signal. Single-project patterns might be flukes or project-specific.

4. **Graceful degradation philosophy:** Federation should be additive, not breaking. If Prod/* has no learnings, meditation space still works. If one project has malformed JSONL, others still contribute. This robustness is essential for meta-circular reliability.

5. **Incremental data model evolution:** Schema additions are backward compatible. Existing learnings without source_project still work (default to "unknown"). Existing patterns without source_projects initialize to empty list. This allows smooth migration without breaking existing workflows.

### Technical Considerations

- **Glob pattern testing:** Before MVP completion, verify glob matches actual Prod/ structure. Edge cases: symlinks, nested directories, non-standard naming.
- **Performance monitoring:** Track aggregation time with realistic data volumes (100+ learnings from 10+ projects). If exceeds 5s, consider optimizations (caching, parallelization).
- **Discovery logging:** User should see clear log output: "Discovered learnings from 4 sources: meditation-space, StatViz, TaskManager, mirror-of-dreams". Transparency builds trust in federation.

### Out of Scope (Document for Future)

- **Bidirectional sync:** Pattern status updates (VERIFIED, REGRESSED) don't flow back to Prod/* projects. This is intentional (meditation space is source of truth for patterns). Future enhancement could propagate status updates.
- **Real-time federation:** Learnings discovered lazily on /2l-improve run. Not pushed from Prod/* to meditation space in real-time. This is fine (meditation space improvements happen periodically, not continuously).
- **Selective federation:** Config option to exclude specific Prod/* projects. Not needed for MVP (all projects included by default). Future enhancement for control.

---

*Exploration completed: 2025-11-27T16:30:00Z*
*This report informs master planning decisions*
