# Master Exploration Report

## Explorer ID
master-explorer-2

## Focus Area
Dependencies & Risk Assessment

## Vision Summary
Complete the meta-circular learning loop by enabling /2l-improve to aggregate framework issues from all Prod/* projects (StatViz, wealth, SplitEasy, mirror-of-dreams, ai-mafia, etc.) for ecosystem-wide improvement, creating automatic federation and cross-project pattern evidence.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 5 must-have features
- **User stories/acceptance criteria:** 23 distinct acceptance criteria
- **Estimated total work:** 8-12 hours

### Complexity Rating
**Overall Complexity: MEDIUM**

**Rationale:**
- **Well-defined scope:** 5 features with clear boundaries, all focused on aggregation and filtering
- **Existing infrastructure:** Robust foundation already exists (reflection-generator.py, reflection-aggregator.py, pattern lifecycle manager)
- **Additive changes:** No breaking changes - only extending existing functionality
- **Known patterns:** File globbing, JSONL reading, source tracking are well-understood operations
- **5+ existing Prod projects:** Real production targets already available for testing (StatViz, wealth, SplitEasy, mirror-of-dreams, ai-mafia)

---

## Dependency Graph

### Critical Path Analysis

```
Foundation Layer (NO dependencies)
├── Feature 1: Multi-Source Learning Discovery
│   └── Glob Prod/*/.2L/global-learnings.jsonl
│   └── Read meditation space .2L/global-learnings.jsonl
│   └── Graceful handling of missing files
│
└── Feature 2: Framework-Only Filtering
    └── Expand FRAMEWORK_KEYWORDS list
    └── Refine is_framework_issue() heuristics
    └── Document filtering criteria

    ↓

Integration Layer (Depends on Foundation)
├── Feature 3: Priority Classification Clarity
│   └── REQUIRES: Feature 2 (framework filtering must work first)
│   └── Update P1/P2/P3 categorization logic
│   └── Add docstring examples
│
├── Feature 4: Source Project Tracking
│   └── REQUIRES: Feature 1 (must discover source files)
│   └── Add source_project field to learning entries
│   └── Derive project name from directory path
│
└── Feature 5: Multi-Source Aggregation
    └── REQUIRES: Feature 1 (multi-source discovery)
    └── REQUIRES: Feature 4 (source tracking)
    └── Aggregator combines learnings from multiple sources
    └── Deduplication across sources
    └── Source tracking preserved through pipeline
```

### Dependency Chains

**Chain 1: Discovery → Tracking → Aggregation**
```
Feature 1 (Multi-Source Discovery)
  ↓
Feature 4 (Source Project Tracking)
  ↓
Feature 5 (Multi-Source Aggregation)
```
This is the **critical path** - these features must be implemented in sequence.

**Chain 2: Filtering → Priority Classification**
```
Feature 2 (Framework-Only Filtering)
  ↓
Feature 3 (Priority Classification Clarity)
```
This is **lower priority** - can be done in parallel with Chain 1 or after.

### Feature Independence Matrix

| Feature | Depends On | Can Block |
|---------|------------|-----------|
| Feature 1: Multi-Source Discovery | None | Features 4, 5 |
| Feature 2: Framework Filtering | None | Feature 3 |
| Feature 3: Priority Classification | Feature 2 | None |
| Feature 4: Source Tracking | Feature 1 | Feature 5 |
| Feature 5: Multi-Source Aggregation | Features 1, 4 | None |

### Integration Points

**External Dependencies:**
- **Python standard library:** `glob`, `pathlib`, `json` (already imported, zero risk)
- **Existing utilities:** `2l-reflection-generator.py`, `2l-reflection-aggregator.py`, `2l-pattern-lifecycle.py` (all present, 610 + 549 + ~200 LOC)
- **File system:** Prod/* directory structure (already exists with 5 projects)

**Internal Dependencies:**
- **Global learnings schema:** Must extend YAML pattern schema with `source_projects` field (additive only, backward compatible)
- **Learning entry schema:** Must add `source_project` field to JSONL entries (additive only, graceful handling of missing field)
- **Aggregator pipeline:** Must accept multiple input JSONL paths (currently single `--jsonl` arg)

---

## Risk Assessment

### High Risks
**None identified.** This is a mature codebase with clear extension points.

### Medium Risks

#### Risk 1: Prod/* Directory Assumption
- **Description:** Vision assumes all production projects live under `~/Ahiya/2L/Prod/*`
- **Impact:** If projects exist elsewhere, they won't be discovered
- **Likelihood:** Medium (user might create projects in other locations)
- **Mitigation:**
  - Document the Prod/* convention clearly in /2l-improve help text
  - Add configurable `learning_sources` array to .2L/config.yaml for future flexibility
  - Log discovered sources so user can verify correctness
- **Recommendation:** Accept this assumption for MVP, make configurable in post-MVP iteration

#### Risk 2: Framework vs Project Classification Edge Cases
- **Description:** Ambiguous cases where issue could be framework OR project-specific
  - Example: "Builder took 2 minutes to write code" - framework slow or complex generation?
  - Example: "Validator found type errors" - framework issue or builder quality issue?
- **Impact:** False positives (project issues captured as framework) or false negatives (framework issues missed)
- **Likelihood:** Medium (real-world issues often have ambiguous classification)
- **Mitigation:**
  - Conservative approach: err on side of NOT capturing (prefer false negatives)
  - Document heuristics with examples in reflection-generator.py docstrings
  - Add --verbose mode to log borderline cases for manual review
  - Future: Add manual classification override in reflection template
- **Recommendation:** Implement conservative filter in iteration 1, add manual override in post-MVP

#### Risk 3: No Existing Learnings in Prod/* Projects
- **Description:** Currently, Prod/* projects have .2L directories but no `global-learnings.jsonl` files yet
- **Impact:** Feature 1 will discover 0 additional sources on first run
- **Likelihood:** High (confirmed via file system check)
- **Mitigation:**
  - Graceful handling already specified (skip missing files with log warning)
  - System still functional with only meditation space learnings
  - Learnings will accumulate as projects run /2l-mvp in the future
- **Recommendation:** Not blocking - system works with meditation space only, scales as Prod/* projects accumulate learnings

#### Risk 4: Deduplication Strategy Complexity
- **Description:** If StatViz iteration-3 and wealth iteration-5 both discover "integration slow", unclear how to handle
- **Impact:** Could create duplicate patterns or lose source attribution
- **Likelihood:** Medium (cross-project patterns are expected)
- **Mitigation:**
  - Keep separate learning entries (as proposed in vision)
  - Aggregator merges into single pattern with multiple sources
  - Track `source_projects` list and `evidence_count` in pattern
  - Example: `source_projects: [StatViz, wealth]`, `evidence_count: 2`
- **Recommendation:** Implement as specified in vision (separate entries → merged pattern)

### Low Risks

#### Risk 5: Performance with Many Projects
- **Description:** Aggregation with 100+ learnings from 10+ projects might be slow
- **Impact:** /2l-improve takes >5s to aggregate
- **Likelihood:** Low (vision targets <5s, current aggregator is fast)
- **Mitigation:**
  - Vision already specifies <5s performance requirement
  - Current aggregator uses efficient SequenceMatcher (O(n²) but with 0.8 threshold early exit)
  - Can optimize later with caching or incremental mode
- **Recommendation:** Monitor but not blocking for MVP

#### Risk 6: Backward Compatibility with Existing Learnings
- **Description:** Existing learnings in meditation space don't have `source_project` field
- **Impact:** Could break aggregator or display
- **Likelihood:** Low (vision explicitly mentions backward compatibility)
- **Mitigation:**
  - Gracefully handle missing `source_project` field
  - Default to "meditation-space" or "unknown" for old entries
  - Additive schema changes only (never remove fields)
- **Recommendation:** Test with existing .2L/global-learnings.yaml

#### Risk 7: File System Permissions
- **Description:** /2l-improve might not have read access to Prod/* projects
- **Impact:** Discovery fails or aggregation incomplete
- **Likelihood:** Low (all projects owned by same user)
- **Mitigation:**
  - Log permission errors with file path
  - Continue with accessible sources (graceful degradation)
  - Document permission requirements
- **Recommendation:** Standard error handling, not a blocking concern

---

## Technology Stack Assessment

### Existing Stack (No Changes Needed)
- **Python 3:** All utilities already in Python (reflection-generator, aggregator, pattern-lifecycle)
- **YAML:** Global learnings schema already YAML (PyYAML library)
- **JSONL:** Learning entries already JSONL format (newline-delimited JSON)
- **Bash:** /2l-improve command is Bash script with Python callouts

### New Patterns Required

**Pattern 1: Multi-File JSONL Reading**
```python
# Current (single source):
learnings = read_jsonl(".2L/global-learnings.jsonl")

# New (multi-source):
sources = glob.glob("Prod/*/.2L/global-learnings.jsonl")
sources.append(".2L/global-learnings.jsonl")
all_learnings = []
for source in sources:
    all_learnings.extend(read_jsonl(source, source_project=derive_project(source)))
```

**Pattern 2: Source Project Derivation**
```python
def derive_project_name(jsonl_path: str) -> str:
    """Extract project name from file path.

    Examples:
        ~/Ahiya/2L/Prod/StatViz/.2L/global-learnings.jsonl → "StatViz"
        ~/Ahiya/2L/.2L/global-learnings.jsonl → "meditation-space"
    """
    path = Path(jsonl_path)
    if "Prod" in path.parts:
        idx = path.parts.index("Prod")
        return path.parts[idx + 1]  # Next part is project name
    return "meditation-space"
```

**Pattern 3: Schema Extension (Backward Compatible)**
```python
# Reading learning entry:
learning = json.loads(line)
source_project = learning.get("source_project", "unknown")  # Graceful fallback

# Writing learning entry (reflection-generator.py):
learning = {
    "learning_id": "...",
    "source_project": derive_project_name(cwd),  # NEW FIELD
    # ... existing fields ...
}
```

### Dependencies on Existing Code

**File: `lib/2l-reflection-generator.py` (610 LOC)**
- **Changes:** Add `source_project` field to learning entries (line ~583-596)
- **Complexity:** LOW (single field addition)
- **Risk:** LOW (additive only, no breaking changes)

**File: `lib/2l-reflection-aggregator.py` (549 LOC)**
- **Changes:**
  - Accept multiple `--jsonl` paths or auto-discover (line ~450-460)
  - Track `source_projects` list in patterns (line ~165-174)
  - Add `evidence_count` field (line ~161)
- **Complexity:** MEDIUM (multi-source logic, deduplication)
- **Risk:** LOW (existing structure well-suited for extension)

**File: `commands/2l-improve.md` (1072 LOC)**
- **Changes:**
  - Add source discovery logic before aggregation (line ~100-117)
  - Pass multiple sources to aggregator
  - Log discovered sources for transparency
- **Complexity:** LOW (add glob + loop)
- **Risk:** LOW (non-blocking, graceful failure mode)

---

## Timeline Estimation

### Iteration Breakdown Recommendation

**Recommendation: SINGLE ITERATION**

**Rationale:**
- **Tight coupling:** Features 1, 4, 5 form a dependency chain that's awkward to split
- **Small scope:** 5 features, 3 files to modify, ~200 LOC changes total
- **Clear interfaces:** Existing code has clean extension points
- **No experimentation:** All patterns are well-understood (file globbing, JSONL reading, schema extension)
- **Risk tolerance:** Medium complexity but low risk justifies single iteration

### Estimated Duration: 8-12 hours

**Phase Breakdown:**

**Phase 1: Multi-Source Discovery (2-3h)**
- Implement glob pattern for Prod/*/.2L/global-learnings.jsonl
- Add source discovery to /2l-improve
- Implement derive_project_name() utility
- Test with existing Prod/* directory structure
- Handle missing files gracefully

**Phase 2: Source Tracking (2-3h)**
- Add `source_project` field to reflection-generator.py
- Update learning entry creation logic
- Test backward compatibility with existing learnings
- Validate source derivation for meditation space vs Prod/* projects

**Phase 3: Multi-Source Aggregation (2-3h)**
- Extend aggregator to accept multiple JSONL sources
- Implement `source_projects` list aggregation in patterns
- Add `evidence_count` field to patterns
- Update pattern schema in global-learnings.yaml
- Test cross-project pattern detection

**Phase 4: Framework Filtering & Priority (1-2h)**
- Refine FRAMEWORK_KEYWORDS list
- Update is_framework_issue() heuristics
- Clarify P1/P2/P3 categorization
- Add docstring examples and documentation

**Phase 5: Integration & Testing (1-2h)**
- End-to-end test: Run /2l-improve with multiple sources
- Verify dashboard shows cross-project evidence
- Test edge cases (missing files, malformed JSON, no Prod/* projects)
- Validate performance (<5s for 100+ learnings from 10+ projects)

### Resource Requirements
- **Developer time:** 1 iteration, 8-12 hours
- **Testing time:** 1-2 hours (included in Phase 5)
- **Documentation time:** 30 minutes (update /2l-improve help text)

---

## Integration Considerations

### Cross-Component Integration Points

**Integration Point 1: /2l-improve ↔ Reflection Aggregator**
- **Current:** Single `--jsonl` argument
- **New:** Multiple `--jsonl` arguments OR auto-discovery
- **Challenge:** Maintain backward compatibility (single source still works)
- **Solution:** Make multiple sources optional, default to meditation space only

**Integration Point 2: Reflection Generator ↔ Learning Entries**
- **Current:** Learning entries created in reflection-generator.py
- **New:** Must include `source_project` field
- **Challenge:** Determine project context (meditation space vs Prod/*)
- **Solution:** Derive from current working directory at generation time

**Integration Point 3: Aggregator ↔ Pattern Schema**
- **Current:** Patterns have single `projects` list
- **New:** Patterns need `source_projects` list and `evidence_count`
- **Challenge:** Backward compatibility with existing patterns
- **Solution:** Additive fields only, gracefully handle missing fields

### Potential Integration Challenges

**Challenge 1: Circular Dependency with /2l-improve**
- **Issue:** /2l-improve calls reflection-generator, which needs project context
- **Impact:** How does reflection-generator know if it's in meditation space or Prod/*?
- **Solution:** Pass `--source-project` flag to reflection-generator, derive from cwd

**Challenge 2: Pattern Deduplication Logic**
- **Issue:** Same root cause from multiple projects should merge into one pattern
- **Impact:** Risk of duplicate patterns if aggregator can't match cross-project
- **Solution:** Category-based matching (already implemented) + similarity threshold 0.8

**Challenge 3: Vision Generator Context**
- **Issue:** Vision generator needs to show cross-project evidence
- **Impact:** Visions should say "Detected in: StatViz, wealth" for high confidence
- **Solution:** Extend vision-generator.py to read `source_projects` from pattern

---

## Recommendations for Master Plan

### Primary Recommendation: Single-Iteration Approach

**Reasoning:**
1. **Tight coupling:** Splitting Features 1 → 4 → 5 creates awkward intermediate states
2. **Small scope:** 5 features, ~200 LOC changes, well-defined boundaries
3. **Low risk:** Existing infrastructure is solid, changes are additive only
4. **Clear deliverable:** Cross-project learning aggregation is atomic (either works end-to-end or doesn't)

### Iteration 1: Complete Cross-Project Learning Aggregation (8-12h)

**Scope:**
- All 5 must-have features
- End-to-end testing with existing Prod/* projects
- Documentation updates

**Success Criteria:**
- Run /2l-improve in meditation space
- System discovers 5+ Prod/* projects
- Aggregator combines learnings from all sources
- Patterns show `source_projects` list
- Dashboard displays cross-project evidence

**Risk Mitigation:**
- Start with Feature 1 (discovery) to validate Prod/* directory structure
- Test with meditation space only first (baseline)
- Add Prod/* sources incrementally
- Validate backward compatibility at each step

### Alternative: Two-Iteration Approach (If Risk Tolerance is Low)

**Iteration 1A: Discovery + Tracking (4-6h)**
- Feature 1: Multi-Source Discovery
- Feature 4: Source Tracking
- Test with multiple sources, verify source attribution

**Iteration 1B: Aggregation + Filtering (4-6h)**
- Feature 5: Multi-Source Aggregation
- Features 2 & 3: Framework Filtering + Priority
- Test cross-project pattern detection

**Why NOT recommended:**
- Iteration 1A delivers incomplete value (can discover but can't aggregate)
- Increases overhead (2 planning phases, 2 integration phases)
- Total time increases to 10-14h due to context switching

---

## Testing Strategy

### Unit Test Scenarios

**Test 1: Source Discovery**
- **Given:** 5 Prod/* projects with .2L directories
- **When:** /2l-improve runs
- **Then:** Discovers meditation space + 5 Prod/* sources (6 total)

**Test 2: Graceful Missing Files**
- **Given:** Prod/ai-mafia/.2L exists but no global-learnings.jsonl
- **When:** /2l-improve runs
- **Then:** Logs warning, continues with other sources

**Test 3: Source Attribution**
- **Given:** Learning created in Prod/StatViz
- **When:** Reflection generated
- **Then:** Learning has `source_project: "StatViz"`

**Test 4: Cross-Project Pattern**
- **Given:** StatViz and wealth both report "integration slow"
- **When:** Aggregator runs
- **Then:** Single pattern with `source_projects: [StatViz, wealth]`, `evidence_count: 2`

**Test 5: Framework Filtering**
- **Given:** Validation report with app bug and framework issue
- **When:** Reflection generator runs
- **Then:** Only framework issue captured in global-learnings.jsonl

**Test 6: Backward Compatibility**
- **Given:** Existing learnings without `source_project` field
- **When:** Aggregator runs
- **Then:** Gracefully defaults to "unknown" or "meditation-space"

### Integration Test Scenarios

**Test 7: End-to-End /2l-improve**
- **Given:** Meditation space + 2 Prod/* projects with learnings
- **When:** /2l-improve runs
- **Then:**
  - Discovers 3 sources
  - Aggregates learnings from all
  - Detects patterns with cross-project evidence
  - Generates vision with source attribution

**Test 8: Performance at Scale**
- **Given:** 100 learnings from 10 projects
- **When:** Aggregator runs
- **Then:** Completes in <5s

### Edge Case Testing

**Edge Case 1: Nested Prod/* Projects**
- **Path:** `Prod/clients/acme/dashboard/.2L/global-learnings.jsonl`
- **Expected:** `source_project: "acme"` (parent of .2L)
- **Risk:** Medium (vision assumes flat structure)

**Edge Case 2: Symlinked Projects**
- **Path:** `Prod/symlink-to-external/.2L/global-learnings.jsonl`
- **Expected:** Follow symlink, derive from target path
- **Risk:** Low (rare scenario)

**Edge Case 3: Malformed JSONL**
- **Given:** Prod/StatViz/.2L/global-learnings.jsonl has invalid JSON on line 5
- **Expected:** Log error with file path and line number, skip that line, continue
- **Risk:** Low (existing aggregator already handles this)

---

## Success Metrics

### Functional Metrics

**Metric 1: Source Discovery Rate**
- **Target:** 100% of Prod/* projects with .2L directories discovered
- **Measurement:** Count discovered sources, compare to `find Prod -name .2L -type d`
- **Baseline:** Currently 5 projects (StatViz, wealth, SplitEasy, mirror-of-dreams, ai-mafia)

**Metric 2: Cross-Project Pattern Detection**
- **Target:** Patterns with 2+ source projects correctly merged
- **Measurement:** Check global-learnings.yaml for patterns with `evidence_count >= 2`
- **Acceptance:** At least 1 cross-project pattern detected (if data exists)

**Metric 3: Framework Filtering Precision**
- **Target:** 0 false positives (project issues captured as framework)
- **Measurement:** Manual review of global-learnings.jsonl entries
- **Acceptance:** All P3 entries are framework performance, not app performance

**Metric 4: Backward Compatibility**
- **Target:** Existing learnings still work without `source_project` field
- **Measurement:** Run aggregator on pre-plan-10 learnings
- **Acceptance:** No errors, defaults to "meditation-space"

### Performance Metrics

**Metric 5: Aggregation Speed**
- **Target:** <5s for 100+ learnings from 10+ projects
- **Measurement:** Time `python3 2l-reflection-aggregator.py` with realistic dataset
- **Acceptance:** Completes in <5s on typical development machine

**Metric 6: /2l-improve Latency**
- **Target:** <10s additional overhead for source discovery
- **Measurement:** Time /2l-improve with vs without Prod/* discovery
- **Acceptance:** Discovery adds <10s to total runtime

### Quality Metrics

**Metric 7: Documentation Completeness**
- **Target:** User can understand Prod/* convention without reading code
- **Measurement:** `/2l-improve --help` mentions Prod/* directory
- **Acceptance:** Help text includes example: "Discovers learnings from ~/Ahiya/2L/Prod/*"

**Metric 8: Error Handling Robustness**
- **Target:** Graceful degradation with missing/malformed sources
- **Measurement:** Test with 0 Prod/* projects, malformed JSONL, permission errors
- **Acceptance:** System continues with available sources, logs clear warnings

---

## Open Questions & Proposed Answers

### Question 1: Deduplication Strategy
**Question:** If StatViz iteration-3 and wealth iteration-5 both discover "integration slow", do we:
- Create 2 separate learning entries (current approach)?
- Deduplicate and merge into 1 entry with multiple sources?

**Proposed Answer:** Keep separate entries, aggregator merges into single pattern (as specified in vision).

**Rationale:**
- Learning entries are immutable audit trail (should not deduplicate)
- Patterns are aggregated view (should merge similar learnings)
- Enables tracking: "This pattern was discovered independently by 2 projects"
- Existing aggregator already implements this pattern

**Risk:** None - this is the existing pattern.

### Question 2: Framework Issue Classification Edge Cases
**Question:** "Builder took 2 minutes to write code" - is this framework slow or just complex code generation?

**Proposed Answer:** Use conservative heuristic:
1. Check if "builder" keyword in issue text → likely framework
2. Check if mentions "slow" or "performance" → likely P3 framework performance
3. Check if location is lib/2l-builder*.py → definitely framework
4. If uncertain, default to NOT capturing (prefer false negatives)

**Rationale:**
- Conservative approach prevents noise (project issues leaking into framework learnings)
- Manual override can be added later for edge cases
- Real framework issues will recur and be captured eventually

**Risk:** Low - false negatives are acceptable for MVP.

### Question 3: Source Project Naming
**Question:** What if project directory is `Prod/my-app-v2` - source_project = "my-app-v2"?

**Proposed Answer:** Use immediate parent directory name after "Prod/" for now.

**Examples:**
- `Prod/StatViz/.2L/...` → `source_project: "StatViz"`
- `Prod/my-app-v2/.2L/...` → `source_project: "my-app-v2"`
- `Prod/clients/acme/.2L/...` → `source_project: "acme"` (nested case)
- `~/Ahiya/2L/.2L/...` → `source_project: "meditation-space"` (special case)

**Rationale:**
- Simple, predictable naming convention
- Handles 95% of cases correctly
- Edge cases can be handled with config override in post-MVP

**Risk:** Low - only affects display, doesn't break functionality.

### Question 4: Bidirectional Sync (Out of Scope)
**Question:** Should pattern status updates (IMPLEMENTED, VERIFIED) sync back to Prod/* projects?

**Proposed Answer:** NO for MVP (explicitly out of scope in vision).

**Rationale:**
- Adds significant complexity (write access to Prod/* projects)
- Lazy federation (read-only) is simpler and safer
- Pattern status lives in meditation space global-learnings.yaml
- Prod/* projects don't need to know about pattern lifecycle

**Future Enhancement:** Add bidirectional sync in Plan-11 if needed.

**Risk:** None - this is explicitly deferred.

---

## Dependencies on External Systems

### File System Dependencies
- **Prod/* directory structure:** Must exist at `~/Ahiya/2L/Prod/*` (already exists with 5 projects)
- **.2L directories in projects:** Expected pattern (4/5 projects already have .2L)
- **global-learnings.jsonl files:** Created by reflection-generator (none exist yet, but will accumulate)

### Python Dependencies
- **Standard library only:** No new pip packages required
- **Existing imports:** `glob`, `pathlib`, `json`, `yaml`, `difflib` (all present in existing code)

### Bash Dependencies
- **Standard Unix tools:** `find`, `ls`, `grep` (available on all systems)
- **No new commands:** All functionality in Python utilities

---

## Risk Mitigation Strategies

### Strategy 1: Incremental Development
- **Phase 1:** Implement discovery only, test with meditation space
- **Phase 2:** Add Prod/* discovery, verify sources found
- **Phase 3:** Enable aggregation, test with mock data
- **Phase 4:** End-to-end test with real Prod/* projects

### Strategy 2: Graceful Degradation
- **Missing files:** Log warning, continue with available sources
- **Malformed JSONL:** Log error with line number, skip line, continue
- **Permission errors:** Log error with path, continue with accessible sources
- **No Prod/* projects:** Fall back to meditation space only (existing behavior)

### Strategy 3: Backward Compatibility
- **Old learning entries:** Gracefully handle missing `source_project` field
- **Existing patterns:** Additive schema changes only (no field removal)
- **Single-source mode:** /2l-improve still works with only meditation space

### Strategy 4: Comprehensive Logging
- **Source discovery:** Log each source found (meditation space + Prod/* list)
- **Aggregation:** Log merge events ("Merged learning X into pattern Y from project Z")
- **Errors:** Log file path, line number, error message for debugging

---

## Notes & Observations

### Observation 1: Mature Codebase
The existing reflection infrastructure (generator, aggregator, pattern lifecycle) is well-architected with clear extension points. This significantly reduces implementation risk.

### Observation 2: Real Production Data Available
5 Prod/* projects already exist (StatViz, wealth, SplitEasy, mirror-of-dreams, ai-mafia) with .2L directories, providing real test targets immediately.

### Observation 3: No Breaking Changes
All changes are additive (new fields, new sources, new logic), with backward compatibility baked in. This is a low-risk evolution of existing functionality.

### Observation 4: Performance is Not a Bottleneck
Current aggregator is fast (SequenceMatcher with 0.8 threshold), and vision's <5s target is easily achievable even with 100+ learnings from 10+ projects.

### Observation 5: Framework Filtering is Critical
The quality of cross-project patterns depends entirely on filtering out project-specific issues. Conservative heuristics are essential to prevent noise.

### Observation 6: Vision is Well-Scoped
Vision explicitly defers bidirectional sync, confidence scoring, and historical import to post-MVP, keeping iteration 1 focused and achievable.

---

## Final Recommendation

**Execute as SINGLE ITERATION with 8-12 hour estimate.**

**Confidence Level: HIGH**
- Low risk (additive changes, mature codebase)
- Clear scope (5 features, well-defined boundaries)
- Real test targets (5 Prod/* projects ready)
- Strong foundation (reflection infrastructure already robust)

**Critical Success Factors:**
1. Conservative framework filtering (prevent false positives)
2. Graceful error handling (missing files, malformed JSON)
3. Clear logging (source discovery, aggregation events)
4. Backward compatibility (existing learnings still work)

**Monitoring After Implementation:**
- Watch for false positives in framework filtering
- Monitor aggregation performance as Prod/* projects accumulate learnings
- Track cross-project pattern evidence quality
- Validate user understanding of Prod/* convention

---

*Exploration completed: 2025-11-27T16:45:00Z*
*This report informs master planning decisions for Plan-10*
