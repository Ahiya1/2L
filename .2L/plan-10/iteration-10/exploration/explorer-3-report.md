# Explorer 3 Report: Complexity & Integration Points

## Executive Summary

Plan-10 implements **cross-project learning aggregation** - a meta-circular enhancement that enables the 2L framework to learn from all production projects, not just its own meditation space. The project exhibits **LOW-to-MEDIUM complexity** with straightforward file I/O patterns but requires careful attention to integration points across the existing reflection pipeline. The primary complexity lies in **multi-source data aggregation** and **backwards compatibility**, not in algorithmic sophistication.

**Key Findings:**
- **Total complexity: MEDIUM** (6-10 hours, likely 1 iteration)
- **No subdivision needed** - Features are tightly coupled to reflection pipeline
- **3 critical integration points** requiring coordination
- **High backwards compatibility requirement** - must not break existing single-source workflows
- **Low algorithmic complexity** - mostly file I/O and metadata tracking

---

## Discoveries

### Feature Complexity Breakdown

**1. Multi-Source Learning Discovery (SIMPLE)**
- **Complexity Level:** LOW
- **Reason:** Straightforward glob pattern matching + file reading
- **Implementation:** 30-50 lines of Python
- **Integration Risk:** LOW - isolated to /2l-improve command initialization
- **Subdivision:** Not needed

**2. Framework-Only Filtering (SIMPLE)**
- **Complexity Level:** LOW-MEDIUM
- **Reason:** Enhancing existing keyword detection, not building from scratch
- **Implementation:** Refine FRAMEWORK_KEYWORDS list + add heuristics
- **Integration Risk:** MEDIUM - affects what gets captured in global-learnings.jsonl
- **Subdivision:** Not needed

**3. Priority Classification Clarity (SIMPLE)**
- **Complexity Level:** LOW
- **Reason:** Documentation + comment updates, minor logic refinement
- **Implementation:** Update docstrings, add examples, refine P3 detection
- **Integration Risk:** LOW - clarifies existing behavior
- **Subdivision:** Not needed

**4. Source Project Tracking (MEDIUM)**
- **Complexity Level:** MEDIUM
- **Reason:** Schema extension + backwards compatibility + tracking through pipeline
- **Implementation:** Add `source_project` field to learnings, update aggregator
- **Integration Risk:** HIGH - touches multiple files across pipeline
- **Subdivision:** Not needed (tightly coupled to aggregation logic)

**5. Multi-Source Aggregation (MEDIUM)**
- **Complexity Level:** MEDIUM
- **Reason:** Extending aggregator to handle multiple JSONL inputs + deduplication
- **Implementation:** Modify read_jsonl() to accept multiple paths, merge logic
- **Integration Risk:** HIGH - core aggregation logic changes
- **Subdivision:** Not needed (central feature, can't be split)

---

### Complexity Assessment

#### High Complexity Areas

**None.** This project has no high-complexity features. The most complex aspect is multi-source aggregation, which is well-scoped and understood.

#### Medium Complexity Areas

**Feature 4: Source Project Tracking**
- **Why Complex:** Requires schema changes propagated through entire pipeline
- **Files Affected:**
  - `lib/2l-reflection-generator.py` (add source_project field)
  - `lib/2l-reflection-aggregator.py` (track source_project through merge)
  - `.2L/global-learnings.yaml` (schema update for patterns)
- **Builder Splits:** 0 (too tightly coupled)
- **Estimated Time:** 2-3 hours
- **Risk:** Backwards compatibility - existing learnings lack source_project field

**Feature 5: Multi-Source Aggregation**
- **Why Complex:** Core pipeline modification + deduplication logic
- **Files Affected:**
  - `commands/2l-improve.md` (glob discovery + pass multiple sources)
  - `lib/2l-reflection-aggregator.py` (multi-file reading, merge learnings from N sources)
  - `lib/2l-vision-generator.py` (display cross-project evidence in vision)
- **Builder Splits:** 0 (central aggregation logic)
- **Estimated Time:** 2-3 hours
- **Risk:** Performance degradation if 100+ learnings from 10+ projects

#### Low Complexity Areas

**Features 1, 2, 3: Discovery, Filtering, Priority**
- **Why Simple:** Well-defined heuristics, localized changes, minimal integration
- **Estimated Time:** 1-2 hours each
- **Risk:** LOW - mostly additive changes

---

## Patterns Identified

### Pattern Type: Multi-Source Data Aggregation

**Description:** Extending a single-file pipeline to handle multiple input sources while maintaining backwards compatibility.

**Use Case:** When a system needs to aggregate data from N locations instead of 1, but existing consumers expect the same output schema.

**Example (from this project):**
```python
# BEFORE (single source)
def read_jsonl(jsonl_path: Path) -> List[Dict]:
    learnings = []
    with open(jsonl_path) as f:
        for line in f:
            learnings.append(json.loads(line))
    return learnings

# AFTER (multi-source)
def read_jsonl(jsonl_paths: List[Path]) -> List[Dict]:
    learnings = []
    for jsonl_path in jsonl_paths:
        if not jsonl_path.exists():
            print(f"WARNING: {jsonl_path} not found, skipping")
            continue
        with open(jsonl_path) as f:
            for line in f:
                learning = json.loads(line)
                # Add source tracking
                learning['source_project'] = derive_source(jsonl_path)
                learnings.append(learning)
    return learnings
```

**Recommendation:** Use this pattern. It's clean, backwards-compatible (single path wrapped in list), and gracefully handles missing files.

---

### Pattern Type: Schema Evolution with Backwards Compatibility

**Description:** Adding new fields to existing JSONL/YAML data structures without breaking old readers.

**Use Case:** When extending data models but need to support existing data without migration.

**Example (from this project):**
```python
# New learnings have source_project
learning = {
    'learning_id': 'plan-10-iter-10-001',
    'source_project': 'StatViz',  # NEW FIELD
    'root_cause': '...',
    # ... existing fields
}

# Old learnings don't have source_project
# Backwards-compatible access:
source = learning.get('source_project', 'meditation-space')  # Default fallback
```

**Recommendation:** Use this pattern. The vision already specifies backwards compatibility via `.get('source_project', 'unknown')` - this is correct.

---

### Pattern Type: Progressive Enhancement (Filtering)

**Description:** Improving existing heuristic filters by adding more keywords and context, not replacing entire logic.

**Use Case:** When existing keyword matching works but has false positives/negatives.

**Example (from this project):**
```python
# BEFORE
FRAMEWORK_KEYWORDS = [
    'orchestrator', 'explorer', 'builder', 'integrator', 'validator'
]

# AFTER (Plan-10 enhancement)
FRAMEWORK_KEYWORDS = [
    'orchestrator', 'explorer', 'builder', 'integrator', 'validator', 'healer',
    'task tool', 'agent spawn', 'agent_start', 'agent_complete',
    '2l-mvp', '2l-improve', '2l-dashboard', 'event logging',
    'pattern detection', 'reflection', 'aggregation'
]
```

**Recommendation:** Use this pattern. Refining existing keywords is safer than rewriting filter logic.

---

## Integration Points

### Critical Integration Points

#### 1. /2l-improve Command → Aggregator Pipeline

**Location:** `commands/2l-improve.md` (lines 103-134)

**Current Behavior:**
```bash
# Single source only
python3 ~/.claude/lib/2l-reflection-aggregator.py \
    --mode incremental \
    --global-learnings "$GLOBAL_LEARNINGS" \
    --jsonl .2L/global-learnings.jsonl
```

**Required Changes:**
```bash
# Multi-source discovery
meditation_space_learnings=".2L/global-learnings.jsonl"
prod_learnings=$(find ~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl 2>/dev/null || echo "")

# Pass all sources to aggregator (new --jsonl-list parameter)
python3 ~/.claude/lib/2l-reflection-aggregator.py \
    --mode incremental \
    --global-learnings "$GLOBAL_LEARNINGS" \
    --jsonl "$meditation_space_learnings" \
    --jsonl-list "$prod_learnings"  # NEW: support multiple JSONL sources
```

**Integration Risk:** MEDIUM
- Must handle case where no Prod/* projects exist
- Must not break existing single-source workflow
- Aggregator must be modified to accept multiple --jsonl flags OR --jsonl-list

**Builder Guidance:**
- Modify /2l-improve to glob Prod/*/.2L/global-learnings.jsonl
- Only run discovery when in meditation space (check `pwd` == ~/Ahiya/2L)
- Pass discovered paths to aggregator via new parameter

---

#### 2. Reflection Generator → JSONL Schema

**Location:** `lib/2l-reflection-generator.py` (lines 461-596)

**Current Behavior:**
```python
learning = {
    'learning_id': f"{args.plan_id}-iter-{args.iteration}-learning-{idx:03d}",
    'project': reflection['metadata']['project'],
    'plan_id': args.plan_id,
    'iteration': args.iteration,
    'category': issue.get('category', 'functionality'),
    'priority': issue.get('priority', 'P2'),
    'root_cause': issue.get('root_cause', 'Unknown'),
    # ... other fields
}
```

**Required Changes:**
```python
# Add source_project field
learning = {
    'learning_id': f"{args.plan_id}-iter-{args.iteration}-learning-{idx:03d}",
    'source_project': derive_source_project(),  # NEW: derive from directory or config
    'project': reflection['metadata']['project'],
    # ... rest unchanged
}

def derive_source_project() -> str:
    """Derive source project name from current working directory."""
    cwd = Path.cwd()
    
    # If in Prod/*, extract project name
    if 'Prod/' in str(cwd):
        # ~/Ahiya/2L/Prod/StatViz/.2L -> 'StatViz'
        parts = cwd.parts
        prod_idx = parts.index('Prod')
        return parts[prod_idx + 1]
    
    # Otherwise, meditation space
    return 'meditation-space'
```

**Integration Risk:** HIGH
- Every new learning entry must have source_project
- Existing learnings in .jsonl files lack this field (backwards compatibility)
- Aggregator must handle mixed learnings (some with, some without source_project)

**Builder Guidance:**
- Add `derive_source_project()` helper function
- Call it when creating learning dictionary
- Test with both meditation space and Prod/* projects
- Handle edge cases (nested directories, symlinks)

---

#### 3. Aggregator → Pattern Schema

**Location:** `lib/2l-reflection-aggregator.py` (lines 146-226)

**Current Behavior:**
```python
def merge_into_pattern(learning: Dict, pattern: Dict) -> Dict:
    pattern["occurrences"] = pattern.get("occurrences", 1) + 1
    pattern["source_learnings"].append(learning["learning_id"])
    
    # Add project if not already in list
    project = learning.get("project", "unknown")
    if project not in pattern["projects"]:
        pattern["projects"].append(project)
    
    return pattern
```

**Required Changes:**
```python
def merge_into_pattern(learning: Dict, pattern: Dict) -> Dict:
    pattern["occurrences"] = pattern.get("occurrences", 1) + 1
    pattern["source_learnings"].append(learning["learning_id"])
    
    # Track project (existing)
    project = learning.get("project", "unknown")
    if project not in pattern["projects"]:
        pattern["projects"].append(project)
    
    # NEW: Track source_project for cross-project evidence
    source_project = learning.get("source_project", "unknown")
    if "source_projects" not in pattern:
        pattern["source_projects"] = []
    if source_project not in pattern["source_projects"]:
        pattern["source_projects"].append(source_project)
    
    # NEW: Increment evidence count
    pattern["evidence_count"] = pattern.get("evidence_count", 1) + 1
    
    return pattern
```

**Integration Risk:** HIGH
- Pattern schema changes (source_projects, evidence_count fields)
- Must update create_new_pattern() to initialize these fields
- Vision generator must display cross-project evidence
- Dashboard may need updates to show source breakdown

**Builder Guidance:**
- Modify merge_into_pattern() to track source_projects list
- Modify create_new_pattern() to initialize source_projects = [source_project]
- Add evidence_count field (count of learnings supporting pattern)
- Update global-learnings.yaml schema documentation

---

### External Integrations

**None.** This is entirely internal to the 2L framework. No external APIs, databases, or services.

---

### Internal Integrations

#### Reflection Pipeline Flow

```
1. /2l-mvp completes iteration
   ↓
2. Reflection Generator (lib/2l-reflection-generator.py)
   - Reads validation report
   - Extracts framework issues
   - Appends to .2L/global-learnings.jsonl
   - [MODIFIED] Adds source_project field
   ↓
3. /2l-improve invokes Aggregator
   - [MODIFIED] Globs Prod/*/.2L/global-learnings.jsonl
   - [MODIFIED] Passes multiple JSONL paths
   ↓
4. Aggregator (lib/2l-reflection-aggregator.py)
   - [MODIFIED] Reads from multiple JSONL files
   - Merges learnings into patterns
   - [MODIFIED] Tracks source_projects list
   - [MODIFIED] Adds evidence_count
   - Writes .2L/global-learnings.yaml
   ↓
5. Pattern Detector (lib/2l-pattern-detector.py)
   - Reads global-learnings.yaml
   - Filters by status, occurrences, severity
   - [UNMODIFIED] Works with new schema (backwards compatible)
   ↓
6. Vision Generator (lib/2l-vision-generator.py)
   - Reads selected pattern
   - [MODIFIED] Includes cross-project evidence in vision
   - Generates vision.md
```

**Critical Dependencies:**
- Reflection Generator must run BEFORE aggregator
- Aggregator must run BEFORE pattern detector
- Pattern detector must run BEFORE vision generator
- All components must handle missing source_project field gracefully

---

## Risks & Challenges

### Technical Risks

**Risk 1: Backwards Compatibility Breaking**
- **Impact:** Existing meditation space learnings (no source_project) fail to aggregate
- **Likelihood:** MEDIUM (if not careful with .get() defaults)
- **Mitigation:**
  - Use `learning.get('source_project', 'meditation-space')` everywhere
  - Test aggregator with mixed learnings (old + new schema)
  - Add migration script to backfill source_project for existing learnings (optional)

**Risk 2: Performance Degradation**
- **Impact:** Aggregation slows down with 100+ learnings from 10+ projects
- **Likelihood:** LOW (JSONL reading is fast, glob is fast)
- **Mitigation:**
  - Vision specifies <5s target for 100 learnings from 10 projects
  - Profile aggregator if needed
  - Add caching if glob becomes bottleneck (unlikely)

**Risk 3: Glob Pattern Fragility**
- **Impact:** Changes to Prod/* directory structure break discovery
- **Likelihood:** LOW (Prod/* is stable)
- **Mitigation:**
  - Document assumption: Learnings always at `Prod/<project>/.2L/global-learnings.jsonl`
  - Add error handling for permission denied, symlink loops
  - Log discovered sources for debugging

---

### Complexity Risks

**Risk 1: Feature 4 + 5 Conflict**
- **Impact:** Source tracking and multi-source aggregation modify same code paths
- **Likelihood:** HIGH (both touch aggregator merge logic)
- **Mitigation:**
  - Implement Feature 4 (source tracking) first
  - Then implement Feature 5 (multi-source) on top
  - Single builder can handle both (tightly coupled)
  - DO NOT split these features - they must be implemented together

**Risk 2: Framework vs Project Filtering Ambiguity**
- **Impact:** Edge cases where it's unclear if issue is framework or project
- **Likelihood:** MEDIUM
- **Mitigation:**
  - Vision specifies: "err on side of NOT capturing" (conservative)
  - Document heuristics in reflection-generator.py comments
  - Provide examples in docstrings (see Feature 2)
  - Manual override possible (user edits .jsonl directly if needed)

---

## Recommendations for Planner

### 1. Single-Iteration Plan (Do NOT split into multiple iterations)

**Rationale:** All 5 features are tightly coupled to the reflection pipeline. Changes must be atomic to avoid breaking the pipeline mid-iteration.

**Evidence:**
- Feature 4 (source tracking) requires Feature 5 (multi-source) to be useful
- Feature 2 (filtering) affects Feature 1 (discovery) output
- All features modify 3 shared files (generator, aggregator, /2l-improve)

**Recommendation:** Plan as 1 iteration with 2-3 builders working in sequence (not parallel).

---

### 2. Builder Sequencing (Critical)

**Recommended sequence:**

**Builder-1: Discovery + Filtering (Features 1 + 2)**
- Modify /2l-improve to glob Prod/* learnings
- Enhance FRAMEWORK_KEYWORDS in reflection-generator.py
- Add framework issue heuristics
- Update priority classification docstrings (Feature 3)
- **Estimated time:** 2-3 hours
- **Output:** /2l-improve discovers multiple sources, filtering improved

**Builder-2: Source Tracking + Multi-Source Aggregation (Features 4 + 5)**
- Add source_project field to reflection-generator.py
- Modify aggregator to accept multiple JSONL sources
- Track source_projects list in patterns
- Add evidence_count field
- Update vision generator to display cross-project evidence
- **Estimated time:** 3-4 hours
- **Output:** Full cross-project aggregation working

**Why this sequence?**
- Builder-1 work is independent (discovery + filtering)
- Builder-2 work depends on Builder-1 (multi-source requires discovery)
- Builder-2 implements tightly coupled features that can't be split

---

### 3. Integration Strategy

**Pre-Integration Testing:**
- Builder-1: Test filtering with existing meditation space learnings
- Builder-2: Test aggregation with mock Prod/* projects (create test .jsonl files)

**Integration Validation:**
- Run /2l-improve in meditation space
- Verify it discovers 0-N Prod/* projects (graceful if none exist)
- Check global-learnings.yaml has source_projects list
- Verify backwards compatibility: old learnings still aggregate

**Rollback Plan:**
- If aggregation breaks, revert lib/2l-reflection-aggregator.py
- Existing meditation space learnings should still work
- Worst case: manually edit global-learnings.yaml to remove source_projects field

---

### 4. Testing Checklist

**Unit Tests (Builder-2 should create):**
- [ ] derive_source_project() handles meditation space
- [ ] derive_source_project() handles Prod/StatViz
- [ ] derive_source_project() handles nested paths
- [ ] Aggregator handles missing source_project field
- [ ] Aggregator merges source_projects correctly
- [ ] Aggregator handles 0 Prod/* projects

**Integration Tests (Validator should verify):**
- [ ] /2l-improve discovers meditation space learnings
- [ ] /2l-improve discovers 0 Prod/* projects gracefully
- [ ] /2l-improve discovers 1+ Prod/* projects correctly
- [ ] Aggregation with mixed old/new learnings works
- [ ] Vision shows cross-project evidence
- [ ] Pattern status updates still work

---

### 5. Backwards Compatibility Requirements

**Must support:**
- Existing .2L/global-learnings.jsonl files without source_project field
- Existing .2L/global-learnings.yaml patterns without source_projects field
- Running /2l-improve when no Prod/* projects exist
- Running reflection generator in Prod/* projects (new capability)

**Migration NOT required:**
- Old learnings can stay without source_project
- Aggregator defaults source_project to 'meditation-space' for old entries
- New learnings get source_project automatically

---

### 6. Complexity Estimate Validation

**Vision estimate:** 6-10 hours (SIMPLE-MEDIUM, 1 iteration)

**Explorer-3 estimate:** 6-8 hours (MEDIUM, 1 iteration)
- Builder-1: 2-3 hours
- Builder-2: 3-4 hours
- Integration: 1 hour
- Buffer: 0-1 hour

**Confidence:** HIGH - Vision estimate is accurate. No hidden complexity discovered.

---

## Resource Map

### Critical Files/Directories

**Commands:**
- `commands/2l-improve.md` - Discovery logic, aggregator invocation

**Libraries:**
- `lib/2l-reflection-generator.py` - Source project tracking, framework filtering
- `lib/2l-reflection-aggregator.py` - Multi-source reading, pattern merging
- `lib/2l-vision-generator.py` - Cross-project evidence display

**Data:**
- `.2L/global-learnings.jsonl` - Meditation space learnings (single source)
- `Prod/*/.2L/global-learnings.jsonl` - Production project learnings (new sources)
- `.2L/global-learnings.yaml` - Aggregated patterns (schema extends)

**Documentation:**
- `/home/ahiya/Ahiya/2L/.2L/plan-10/vision.md` - Full requirements

---

### Key Dependencies

**Python Standard Library:**
- `glob` - Prod/* discovery
- `pathlib.Path` - File path manipulation
- `json` - JSONL reading/writing
- `yaml` - Pattern YAML reading/writing

**2L Libraries:**
- `lib/2l-yaml-helpers.py` - Atomic YAML writes, pattern ID generation
- `lib/2l-event-logger.sh` - Event emission (optional)

**No external dependencies.** All work uses existing 2L infrastructure.

---

### Testing Infrastructure

**Manual Testing Approach:**
1. Create mock Prod/* projects:
   ```bash
   mkdir -p ~/Ahiya/2L/Prod/TestProject1/.2L
   mkdir -p ~/Ahiya/2L/Prod/TestProject2/.2L
   ```

2. Create mock learnings:
   ```bash
   echo '{"learning_id": "test-1", "source_project": "TestProject1", "root_cause": "test"}' > ~/Ahiya/2L/Prod/TestProject1/.2L/global-learnings.jsonl
   ```

3. Run /2l-improve in meditation space:
   ```bash
   cd ~/Ahiya/2L
   /2l-improve --dry-run
   ```

4. Verify:
   - Discovers 2 test projects
   - Aggregates learnings from all 3 sources (meditation + 2 test)
   - Patterns have source_projects field

**Validator Acceptance Criteria:**
- All 5 features implemented
- Backwards compatibility verified
- Cross-project patterns detected
- No performance regression

---

## Questions for Planner

**Q1: Should we implement historical import (out-of-scope feature)?**
- **Context:** Existing Prod/* projects have no learnings yet (.jsonl files don't exist)
- **Impact:** Currently, no cross-project data to aggregate until Prod/* projects run iterations
- **Recommendation:** Skip for MVP - wait for natural accumulation as projects iterate

**Q2: Should reflection generator auto-detect Prod/* context?**
- **Context:** derive_source_project() assumes specific directory structure
- **Alternatives:** 
  - Read from .2L/config.yaml (project_name field)
  - Pass as CLI argument to reflection generator
- **Recommendation:** Use directory structure (simpler, zero config)

**Q3: What if Prod/* projects use different .2L directory locations?**
- **Context:** Some projects have .2L at root, others nested (e.g., Prod/ShipLog/2L/.2L)
- **Impact:** Glob pattern won't find nested .2L directories
- **Recommendation:** Document assumption, add support for nested paths if needed (can add later)

**Q4: Should we add project exclusion config?**
- **Context:** Vision lists "Selective Federation" as should-have (post-MVP)
- **Use case:** Exclude experimental projects from framework learning aggregation
- **Recommendation:** Skip for MVP - all Prod/* projects included by default

---

## Final Recommendation

**Plan Structure:** Single iteration, 2 builders in sequence

**Builder-1 Responsibilities:**
- Multi-source discovery (Feature 1)
- Framework-only filtering (Feature 2)
- Priority classification clarity (Feature 3)

**Builder-2 Responsibilities:**
- Source project tracking (Feature 4)
- Multi-source aggregation (Feature 5)

**Integration Approach:** Sequential (Builder-2 starts after Builder-1 completes)

**Validation Approach:** 
- Manual testing with mock Prod/* projects
- Validator verifies all acceptance criteria from vision.md

**Risk Mitigation:**
- Backwards compatibility testing with existing learnings
- Performance profiling if >10 projects discovered
- Clear error messages for missing files

**Estimated Completion:** 1 iteration (6-8 hours total)

---

**Report Status:** COMPLETE
**Ready for:** Master Planning
**Confidence Level:** HIGH - Complexity well-understood, integration points mapped, no hidden risks
