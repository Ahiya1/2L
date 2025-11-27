# Builder Task Breakdown

## Overview

2 primary builders will work **sequentially** (not parallel) to implement cross-project learning aggregation.

**Sequential execution is critical** because:
- Both builders modify `lib/2l-reflection-generator.py` (Builder-1 adds keywords, Builder-2 adds source_project field)
- Builder-2's aggregation logic depends on Builder-1's discovery mechanism working
- Prevents merge conflicts in shared files

**Estimated total time:** 6-8 hours (MEDIUM complexity, 1 iteration)

---

## Builder-1: Discovery & Filtering

### Scope

Implement multi-source learning discovery and enhance framework issue filtering. This builder establishes the foundation for cross-project aggregation by making `/2l-improve` discover Prod/* learnings and improving the heuristic that determines which issues are framework-related vs project-specific.

### Complexity Estimate

**MEDIUM** - Straightforward file I/O and keyword enhancement, but requires careful testing of filtering heuristics.

### Success Criteria

- [ ] `/2l-improve` discovers all `Prod/*/.2L/global-learnings.jsonl` files when run in meditation space
- [ ] Discovery gracefully handles missing Prod/* directory (returns empty list, doesn't crash)
- [ ] Discovery logs discovered sources to stderr for debugging
- [ ] `FRAMEWORK_KEYWORDS` expanded with Plan-10 terms (federation, cross-project, aggregation, etc.)
- [ ] `FRAMEWORK_PATHS` and `PROJECT_PATHS` updated if needed
- [ ] `is_framework_issue()` heuristic tested with edge cases (documented examples)
- [ ] Priority classification (P1/P2/P3) clearly documented with framework-focused semantics
- [ ] Existing meditation space learnings still aggregate correctly (no regression)

### Files to Create

None - all modifications to existing files.

### Files to Modify

1. **`/home/ahiya/Ahiya/2L/commands/2l-improve.md`** (lines ~100-120)
   - Purpose: Add Prod/* discovery step before aggregation
   - Add: Glob pattern discovery of `Prod/*/.2L/global-learnings.jsonl`
   - Add: Combine meditation space + Prod/* sources
   - Add: Pass all sources to aggregator via comma-separated `--jsonl` parameter

2. **`/home/ahiya/Ahiya/2L/lib/2l-reflection-generator.py`** (lines ~45-62, ~200-250)
   - Purpose: Enhance framework issue filtering
   - Add: Expanded `FRAMEWORK_KEYWORDS` (10-15 new keywords)
   - Add: Performance-specific keywords (aggregation slow, reflection generation timeout)
   - Add: Plan-10 specific keywords (federation, cross-project, multi-source)
   - Refine: `is_framework_issue()` heuristic with clear edge case handling
   - Document: Add docstring examples of framework vs project issues
   - Document: Update priority classification comments (P1/P2/P3 semantics)

### Dependencies

**Depends on:** None (first builder)

**Blocks:** Builder-2 (source tracking and aggregation depend on discovery working)

### Implementation Notes

**Discovery Pattern:**
- Use Python one-liner in bash: `python3 -c "import glob; ..."` for inline discovery
- Alternative: Create helper function in `2l-reflection-generator.py` and call it
- Must handle permission errors gracefully (try/except, log warning, continue)
- Must validate discovered paths exist before passing to aggregator

**Filtering Heuristic Enhancements:**
- Focus on **false positive reduction** (don't capture app issues as framework issues)
- Conservative bias: "When in doubt, don't capture"
- Test cases to verify:
  - ✅ "Integration phase slow" in validation report → CAPTURE (framework performance)
  - ✅ "Agent spawn timeout" in logs → CAPTURE (framework functionality)
  - ❌ "Database query slow" in app code → DON'T capture (app performance)
  - ❌ "Builder took 2 minutes" in app/services/auth.ts → DON'T capture (app code, not framework)
  - ✅ "Builder took 2 minutes" in agents/2l-builder.md → CAPTURE (agent prompt issue)

**Priority Classification Documentation:**
```python
# P1 (Functionality): 2L workflow broken
#   - Agent crashes, orchestrator fails, command errors
#   - Example: "Builder agent crashes on complex tasks"
#
# P2 (Completeness): 2L missing features
#   - Workflow gaps, missing capabilities
#   - Example: "No healing phase for failed integrations"
#
# P3 (Speed): 2L framework performance
#   - Agent spawn slow, integration slow, aggregation slow
#   - NOT app performance (database slow, build slow)
#   - Example: "Integration phase takes 45s for 4 builders"
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Multi-Source Discovery Pattern** - for `/2l-improve` discovery step
- **Framework Issue Filtering Pattern** - for keyword and heuristic enhancements
- **Error Logging Convention** - for warning messages

### Testing Requirements

**Unit tests (extend existing test_reflection_aggregator.py):**
- Test `is_framework_issue()` with 5-10 edge cases
- Verify framework keywords match expected issues
- Verify project keywords exclude app issues

**Integration tests (manual):**
- Run `/2l-improve` in meditation space with 0 Prod/* projects → succeeds
- Run `/2l-improve` in meditation space with 2+ Prod/* projects → discovers all
- Create mock Prod/* project, verify discovery finds it
- Verify existing meditation space aggregation still works (backwards compatibility)

**Acceptance criteria:**
- Builder-1 changes pass without errors
- `/2l-improve` discovers Prod/* learnings (or gracefully handles none)
- Filtering reduces false positives (manual review of test cases)

---

## Builder-2: Source Tracking & Aggregation

### Scope

Implement source project tracking and multi-source aggregation. This builder adds the `source_project` field to all new learnings, extends the aggregator to handle multiple JSONL inputs, tracks cross-project evidence in patterns, and updates the vision generator to display this evidence.

### Complexity Estimate

**MEDIUM** - Core aggregation logic changes with backwards compatibility requirements. Tightly coupled features that must be implemented together.

### Success Criteria

- [ ] Reflection generator adds `source_project` field to all new learning entries
- [ ] `infer_source_project()` function correctly derives project name from path (meditation space, Prod/*, nested paths)
- [ ] Aggregator accepts comma-separated `--jsonl` paths from `/2l-improve`
- [ ] Aggregator reads learnings from all sources with error recovery
- [ ] Pattern merging tracks `source_projects` list (distinct from `projects`)
- [ ] Pattern creation initializes `source_projects` and `evidence_count` fields
- [ ] Vision generator displays cross-project evidence in generated visions
- [ ] Backwards compatibility: existing learnings without `source_project` still aggregate (default to "meditation-space")
- [ ] Backwards compatibility: existing patterns without `source_projects` handled gracefully

### Files to Create

1. **`/home/ahiya/Ahiya/2L/lib/test_multi_source_aggregation.py`**
   - Purpose: Unit tests for multi-source aggregation features
   - Tests: Source project derivation, multi-source reading, backwards compatibility

### Files to Modify

1. **`/home/ahiya/Ahiya/2L/lib/2l-reflection-generator.py`** (lines ~460-500)
   - Purpose: Add source_project field to learning entries
   - Add: `infer_source_project()` function (derive from cwd or path)
   - Add: Call `infer_source_project()` when creating learning dictionary
   - Add: `source_project` field to learning JSONL entry

2. **`/home/ahiya/Ahiya/2L/lib/2l-reflection-aggregator.py`** (lines ~150-230, ~295-340)
   - Purpose: Multi-source reading and source tracking
   - Add: `discover_prod_learnings()` function (glob Prod/*/.2L/global-learnings.jsonl)
   - Add: `infer_source_project()` function (derive from path)
   - Add: `read_multi_source_jsonl()` function (read from multiple paths with tagging)
   - Modify: `merge_into_pattern()` to track `source_projects` list
   - Modify: `create_new_pattern()` to initialize `source_projects` and `evidence_count`
   - Modify: CLI argument parsing to accept comma-separated `--jsonl` paths
   - Add: Timing instrumentation (log aggregation duration, warn if >5s)

3. **`/home/ahiya/Ahiya/2L/lib/2l-vision-generator.py`** (location varies)
   - Purpose: Display cross-project evidence in visions
   - Add: `format_cross_project_evidence()` function
   - Modify: Vision template to include cross-project evidence section
   - Add: Confidence indicator (HIGH/MEDIUM/LOW based on project count)

### Dependencies

**Depends on:** Builder-1 (discovery mechanism must be in place)

**Blocks:** Integration phase (last builder)

### Implementation Notes

**Source Project Derivation:**
```python
# Handle three cases:
# 1. Meditation space: ~/Ahiya/2L/.2L/... → "meditation-space"
# 2. Simple Prod: ~/Ahiya/2L/Prod/StatViz/.2L/... → "StatViz"
# 3. Nested Prod: ~/Ahiya/2L/Prod/clients/acme/dashboard/.2L/... → "clients-acme-dashboard"

def infer_source_project(jsonl_path: Optional[Path] = None) -> str:
    if jsonl_path is None:
        jsonl_path = Path.cwd()

    parts = jsonl_path.parts

    if 'Prod' in parts:
        prod_index = parts.index('Prod')
        project_parts = []
        for i in range(prod_index + 1, len(parts)):
            if parts[i] == '.2L':
                break
            project_parts.append(parts[i])
        return '-'.join(project_parts) if project_parts else "unknown"

    return "meditation-space"
```

**Multi-Source Reading:**
```python
# Key pattern: Tag each learning with source_project BEFORE aggregation
for jsonl_path in jsonl_paths:
    source_project = infer_source_project(jsonl_path)
    learnings = read_jsonl_with_recovery(jsonl_path)

    for learning in learnings:
        # Backwards compatibility: add field if missing
        if 'source_project' not in learning:
            learning['source_project'] = source_project

    all_learnings.extend(learnings)
```

**Pattern Schema Extensions:**
```python
# In merge_into_pattern():
source_project = learning.get("source_project", "unknown")
if "source_projects" not in pattern:
    pattern["source_projects"] = []
if source_project not in pattern["source_projects"]:
    pattern["source_projects"].append(source_project)

pattern["evidence_count"] = len(pattern["source_learnings"])

# In create_new_pattern():
return {
    "pattern_id": pattern_id,
    # ... existing fields ...
    "source_projects": [learning.get("source_project", "unknown")],
    "evidence_count": 1,
    # ... rest of fields ...
}
```

**Vision Evidence Display:**
```python
# In vision generator:
source_projects = pattern.get('source_projects', [])
evidence_count = pattern.get('evidence_count', 0)

if len(source_projects) >= 3:
    confidence = "HIGH"
elif len(source_projects) == 2:
    confidence = "MEDIUM"
else:
    confidence = "LOW"

evidence_section = f"""## Cross-Project Evidence

- **Confidence:** {confidence} ({len(source_projects)} projects affected)
- **Projects:** {', '.join(source_projects)}
- **Total occurrences:** {evidence_count}

This pattern was detected across {len(source_projects)} production projects, indicating a real framework issue with ecosystem-wide impact.
"""
```

**Backwards Compatibility:**
- Always use `.get('source_project', 'meditation-space')` when reading learnings
- Always use `.get('source_projects', [])` when reading patterns
- Calculate `evidence_count` from `len(source_learnings)` if field missing
- Never assume new fields exist in old data

**Performance Instrumentation:**
```python
import time

start_time = time.time()
# ... aggregation logic ...
elapsed = time.time() - start_time

print(f"⏱️  Aggregation complete: {elapsed:.2f}s", file=sys.stderr)
print(f"   Learnings processed: {len(learnings)}", file=sys.stderr)
print(f"   Patterns updated: {len(updated_patterns)}", file=sys.stderr)

if elapsed > 5.0:
    print(f"⚠️  WARNING: Aggregation exceeded 5s target ({elapsed:.2f}s)",
          file=sys.stderr)
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Source Project Derivation Pattern** - for `infer_source_project()`
- **Multi-Source JSONL Reading Pattern** - for reading multiple sources
- **Pattern Merging with Source Tracking** - for tracking `source_projects`
- **Backwards Compatibility Pattern** - for handling missing fields
- **Error Logging Convention** - for warnings and performance logs

### Testing Requirements

**Unit tests (new file: lib/test_multi_source_aggregation.py):**
- [ ] `infer_source_project()` with meditation space path
- [ ] `infer_source_project()` with simple Prod/* path
- [ ] `infer_source_project()` with nested Prod/* path
- [ ] `read_multi_source_jsonl()` with 0 sources (empty list)
- [ ] `read_multi_source_jsonl()` with 3 sources
- [ ] `merge_into_pattern()` tracks source_projects correctly
- [ ] `create_new_pattern()` initializes source_projects and evidence_count
- [ ] Backwards compatibility: learnings without source_project
- [ ] Backwards compatibility: patterns without source_projects
- [ ] Error recovery: malformed JSONL in one source doesn't break others

**Integration tests (manual with mock Prod/* projects):**

```bash
# Setup: Create mock Prod/* projects
mkdir -p ~/Ahiya/2L/Prod/TestProject1/.2L
mkdir -p ~/Ahiya/2L/Prod/TestProject2/.2L

# Create mock learnings
echo '{"learning_id":"test-1","root_cause":"Integration slow","category":"framework-performance","priority":"P3"}' > ~/Ahiya/2L/Prod/TestProject1/.2L/global-learnings.jsonl
echo '{"learning_id":"test-2","root_cause":"Integration slow","category":"framework-performance","priority":"P3"}' > ~/Ahiya/2L/Prod/TestProject2/.2L/global-learnings.jsonl

# Run /2l-improve
cd ~/Ahiya/2L
/2l-improve

# Verify:
# 1. Check logs for "Discovered N sources"
# 2. Check .2L/global-learnings.yaml for pattern with source_projects: [TestProject1, TestProject2]
# 3. Check evidence_count >= 2
# 4. Check vision shows cross-project evidence

# Cleanup
rm -rf ~/Ahiya/2L/Prod/TestProject1
rm -rf ~/Ahiya/2L/Prod/TestProject2
```

**Acceptance criteria:**
- All unit tests pass
- Integration test detects cross-project pattern
- Existing meditation space learnings still work (no regression)
- Performance within 5s target for 100 learnings from 10 sources

### Potential Split Strategy

**This task should NOT be split.** Source tracking and multi-source aggregation are tightly coupled:
- Source tracking requires aggregator to read from multiple sources
- Multi-source aggregation is useless without source tracking
- Both modify same files (`2l-reflection-aggregator.py`)
- Both are medium complexity individually, simple combined (6-8 hours total is reasonable)

Splitting would create integration overhead and coordination complexity that exceeds the benefit.

---

## Builder Execution Order

### Sequential Execution (Critical)

**Phase 1: Builder-1 (Discovery & Filtering)**
- Duration: 2-3 hours
- Deliverables: `/2l-improve` discovers Prod/*, filtering enhanced
- Validation: Manual test discovery, review filtering test cases

**Phase 2: Builder-2 (Source Tracking & Aggregation)**
- Duration: 3-4 hours
- Deliverables: Full cross-project aggregation working
- Validation: Unit tests pass, integration test shows cross-project pattern

**Phase 3: Integration**
- Duration: 30 minutes
- Validation: Run `/2l-improve` in meditation space, verify all acceptance criteria

**Why Sequential?**
1. Both builders modify `lib/2l-reflection-generator.py`:
   - Builder-1 adds/modifies: `FRAMEWORK_KEYWORDS`, `is_framework_issue()`, priority comments
   - Builder-2 adds: `infer_source_project()`, `source_project` field in learning creation
   - Sequential execution prevents merge conflicts

2. Builder-2 depends on Builder-1's discovery:
   - `/2l-improve` must discover Prod/* sources (Builder-1)
   - Aggregator must receive those sources (Builder-2)
   - Can't test Builder-2 without Builder-1 working

3. Integration is simpler:
   - No parallel builder conflicts to resolve
   - Clear progression: discovery → filtering → aggregation → evidence display
   - Each phase builds on previous (no circular dependencies)

---

## Integration Notes

### Shared Files Coordination

**File: `lib/2l-reflection-generator.py`**
- Builder-1 modifies: Lines ~45-62 (keywords), ~200-250 (filtering function)
- Builder-2 modifies: Lines ~460-500 (learning creation), adds new function (source derivation)
- **Conflict risk:** LOW (different sections of file)
- **Mitigation:** Builder-2 starts after Builder-1 completes

**File: `/2l-improve.md`**
- Builder-1 modifies: Add discovery step before aggregation call
- Builder-2 uses: Discovery results from Builder-1's changes
- **Conflict risk:** NONE (Builder-2 doesn't modify this file)

**File: `lib/2l-reflection-aggregator.py`**
- Builder-1: No changes
- Builder-2: Extensive changes (multi-source support)
- **Conflict risk:** NONE (only Builder-2 touches this file)

### Integration Validation Checklist

After both builders complete:

- [ ] Run `/2l-improve` in meditation space
- [ ] Verify discovery logs show N sources (meditation space + Prod/* count)
- [ ] Verify `.2L/global-learnings.yaml` has patterns with `source_projects` field
- [ ] Verify existing meditation space learnings still aggregate (backwards compatibility)
- [ ] Create test learning in mock Prod/* project, verify it's discovered
- [ ] Verify vision shows cross-project evidence
- [ ] Verify aggregation performance <5s for typical workload
- [ ] Run existing smoke tests (`lib/2l-smoke-tests.sh`) - all pass

### Potential Conflict Areas

**None expected.** Sequential execution and clear file ownership eliminate conflicts.

**If conflicts occur:**
1. Builder-2 has latest changes from Builder-1 (sequential)
2. Manual merge only needed if Builder-1 made unexpected changes
3. Focus areas: `lib/2l-reflection-generator.py` keywords and learning creation

### Rollback Plan

**If Builder-1 breaks existing functionality:**
- Revert `/commands/2l-improve.md` to pre-Plan-10 version
- Revert `lib/2l-reflection-generator.py` keyword changes
- Existing meditation space aggregation continues working

**If Builder-2 breaks existing functionality:**
- Revert `lib/2l-reflection-aggregator.py` to pre-Plan-10 version
- Revert `lib/2l-reflection-generator.py` source_project field addition
- Meditation space learnings aggregate without cross-project evidence

**Recovery steps:**
1. Git reset to last known good commit
2. Re-run `/2l-improve` to verify meditation space works
3. Debug issue, fix, and re-attempt

---

## Success Metrics

**Iteration complete when:**

1. **All acceptance criteria met:**
   - Cross-project discovery works (meditation space + Prod/*)
   - Framework-only filtering reduces false positives
   - Priority classification clear (P1/P2/P3 documented)
   - Source tracking persists through pipeline (learnings → patterns → vision)
   - Backwards compatibility maintained (old data still works)
   - Performance target met (<5s for 100 learnings from 10 projects)

2. **Integration validation passes:**
   - Manual testing with mock Prod/* projects succeeds
   - Cross-project patterns detected and displayed
   - Existing smoke tests still pass

3. **Documentation complete:**
   - Code comments explain new fields and functions
   - Patterns.md used as reference throughout
   - Test coverage documented

**Definition of Done:**
- Both builders' success criteria met
- Integration checklist complete
- Validator accepts work
- No regressions in existing functionality
