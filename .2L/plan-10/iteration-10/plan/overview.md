# 2L Iteration Plan - Cross-Project Learning Aggregation

## Project Vision

Complete the meta-circular self-improvement loop by enabling the 2L framework to learn from ALL projects using it - not just its own meditation space iterations, but from every production project in the ecosystem. This creates a feedback loop between production usage and framework improvement, where framework issues discovered across StatViz, TaskManager, BlogEngine, and other Prod/* projects automatically feed back into the framework's self-improvement cycle.

**Core Capability:** When `/2l-improve` runs in the meditation space, it will discover and aggregate learnings from all `~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl` files, enabling cross-project pattern detection with source tracking and evidence counting.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] **Multi-Source Discovery Works**: Run `/2l-improve` in meditation space, verify it discovers meditation space + all Prod/* project learnings (log shows "Aggregated from N sources")
- [ ] **Framework-Only Filtering Works**: Create reflection in Prod/* project with both framework and app issues, verify only framework issues captured in global-learnings.jsonl
- [ ] **Cross-Project Patterns Detected**: Run `/2l-improve` after 2+ Prod/* projects hit same framework issue, verify pattern shows `source_projects: [StatViz, TaskManager]` in global-learnings.yaml
- [ ] **Priority Classification Clear**: Check P3 learnings - all must be framework performance (agent spawn slow, integration slow), NOT app performance (database slow, build slow)
- [ ] **Source Tracking Persists**: Every learning entry has `source_project` field, patterns have `source_projects` list and `evidence_count` field
- [ ] **Backwards Compatibility Maintained**: Existing learnings without `source_project` field still aggregate correctly (default to "meditation-space")
- [ ] **Performance Target Met**: Aggregation of 100+ learnings from 10+ projects completes in <5 seconds

## MVP Scope

**In Scope:**

1. Multi-Source Learning Discovery - glob pattern finds all `Prod/*/.2L/global-learnings.jsonl` files
2. Framework-Only Filtering - refined keyword detection prevents app issues from being captured
3. Priority Classification Clarity - P1 (functionality), P2 (completeness), P3 (framework speed) clearly documented
4. Source Project Tracking - each learning tagged with `source_project`, patterns track `source_projects` list
5. Multi-Source Aggregation - aggregator combines learnings from meditation space + all Prod/* projects

**Out of Scope (Post-MVP):**

- Dashboard cross-project view (UI showing pattern evidence breakdown by project)
- Selective federation (config option to exclude specific Prod/* projects)
- Historical import (one-time import of existing learnings from Prod/* projects)
- Pattern confidence scoring (weight patterns by number of source projects - basic tracking included, but not used in prioritization)
- Bidirectional sync (pattern status updates flowing back to Prod/* projects)
- Real-time federation (learnings pushed immediately vs lazy aggregation)

## Development Phases

1. **Exploration** ✅ Complete (3 explorer reports)
2. **Planning** 🔄 Current
3. **Building** ⏳ 4-6 hours (2 sequential builders)
4. **Integration** ⏳ 30 minutes (builders work sequentially, minimal integration)
5. **Validation** ⏳ 30 minutes (manual testing with mock Prod/* projects)
6. **Deployment** ⏳ Final (immediate - changes are in Python libraries and commands)

## Timeline Estimate

- Exploration: ✅ Complete
- Planning: ✅ Complete (this document)
- Building: 4-6 hours (Builder-1: 2-3h, Builder-2: 2-3h)
- Integration: 30 minutes (sequential builders, minimal conflicts)
- Validation: 30 minutes (manual testing + acceptance criteria verification)
- **Total: ~6 hours** (single iteration, MEDIUM complexity)

## Risk Assessment

### High Risks

**Backwards Compatibility Breaking**
- **Risk:** Existing meditation space learnings (without `source_project` field) fail to aggregate
- **Impact:** High - breaks core self-improvement loop
- **Likelihood:** Medium (if not careful with defaults)
- **Mitigation:**
  - Use `learning.get('source_project', 'meditation-space')` everywhere
  - Test aggregator with mixed old/new learnings before integration
  - Add validation test: load existing global-learnings.jsonl and verify aggregation works

**Integration Point Conflicts**
- **Risk:** Builder-1 and Builder-2 both modify `lib/2l-reflection-aggregator.py`, causing merge conflicts
- **Impact:** Medium - delays integration phase
- **Likelihood:** High (both builders touch same code paths)
- **Mitigation:**
  - **Sequential builder execution** (Builder-2 starts after Builder-1 completes)
  - Clear file ownership in builder tasks
  - Integration phase runs after both builders, not during

### Medium Risks

**Framework vs Project Issue Misclassification**
- **Risk:** Heuristic incorrectly flags app issues as framework issues (false positives)
- **Impact:** Medium - noise in global learnings, wasted improvement cycles
- **Likelihood:** Medium (classification is inherently fuzzy)
- **Mitigation:**
  - Conservative bias: "When in doubt, don't capture"
  - Expanded keywords with context-aware filtering
  - Path-based heuristics (framework paths vs project paths)
  - Documentation of edge cases in reflection generator comments

**Performance Degradation with Many Projects**
- **Risk:** Aggregating 100+ learnings from 10+ projects exceeds 5s target
- **Impact:** Low-Medium - slower `/2l-improve` startup
- **Likelihood:** Low (JSONL parsing is fast, glob is fast)
- **Mitigation:**
  - Use incremental mode (only process new learnings)
  - Profile aggregator if needed
  - Existing SequenceMatcher is O(n²) but fast for n<100

**Glob Pattern Fragility**
- **Risk:** Changes to Prod/* directory structure break discovery
- **Impact:** Low - federation stops working but meditation space continues
- **Likelihood:** Low (Prod/* structure is stable)
- **Mitigation:**
  - Document assumption: learnings always at `Prod/<project>/.2L/global-learnings.jsonl`
  - Graceful error handling for permission denied, missing directories
  - Log discovered sources for debugging

## Integration Strategy

**Sequential Builder Approach:**

Builder-1 (Discovery + Filtering) works independently on:
- `/commands/2l-improve.md` - add Prod/* discovery logic
- `lib/2l-reflection-generator.py` - enhance framework filtering keywords

Builder-2 (Source Tracking + Aggregation) starts after Builder-1 completes, works on:
- `lib/2l-reflection-generator.py` - add `source_project` field (extends Builder-1 changes)
- `lib/2l-reflection-aggregator.py` - multi-source support
- `lib/2l-vision-generator.py` - cross-project evidence display

**Why Sequential?**
- Both builders modify `lib/2l-reflection-generator.py` (Builder-1 adds keywords, Builder-2 adds source_project field)
- Builder-2's aggregation depends on Builder-1's discovery mechanism
- Prevents merge conflicts and integration complexity

**Integration Validation:**
1. Builder-1 completes → test filtering with existing meditation space learnings
2. Builder-2 completes → test end-to-end with mock Prod/* projects
3. Integration phase: Run `/2l-improve` in meditation space, verify cross-project aggregation works

**Rollback Plan:**
- If aggregation breaks: Revert `lib/2l-reflection-aggregator.py` to pre-Plan-10 version
- Existing meditation space learnings continue to work
- Worst case: Manually edit `global-learnings.yaml` to remove new fields

## Deployment Plan

**Immediate Deployment (No Separate Deploy Phase):**

Changes are to framework libraries and commands that are already symlinked to all projects:
- `/home/ahiya/.claude/lib/2l-reflection-generator.py` (symlinked)
- `/home/ahiya/.claude/lib/2l-reflection-aggregator.py` (symlinked)
- `/home/ahiya/.claude/commands/2l-improve.md` (symlinked)

**Verification Steps:**
1. Run `/2l-improve` in meditation space
2. Verify discovery of Prod/* projects (check logs)
3. Verify existing learnings still aggregate (backwards compatibility)
4. Create test learning in Prod/* project, verify federation works

**No Migration Required:**
- Old learnings without `source_project` field handled via `.get()` defaults
- New learnings automatically get `source_project` field
- Schema evolution is additive (backwards compatible)

**Success Indicators:**
- `/2l-improve` discovers N sources (meditation space + Prod/* projects found)
- Dashboard shows cross-project patterns with `source_projects` field
- No errors in event log during aggregation
- Performance within 5s target for typical workload (10-50 learnings)
