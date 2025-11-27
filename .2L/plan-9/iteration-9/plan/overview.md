# 2L Iteration Plan - Self-Improvement Reflection System

## Project Vision

Implement automatic reflection creation and aggregation infrastructure to complete the self-improvement learning cycle. This iteration delivers Feature 2 (Automatic Reflection Creation) and Feature 5 (Reflection Aggregation System) from plan-9, enabling 2L to capture and learn from every iteration's experiences with the framework itself.

**What we're building:** A comprehensive learning pipeline that automatically generates structured reflections after iteration completion, aggregates similar issues across iterations into patterns, and feeds these patterns back into the /2l-improve command for continuous framework enhancement.

**Why it matters:** Currently, iterations complete without capturing 2L framework learnings. This creates a knowledge gap - we identify issues during execution but lose those insights. This system closes that loop, enabling true continuous improvement.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] **Reflection Generation:** /2l-mvp creates REFLECTION.md after validation PASS (both first-pass and post-healing)
- [ ] **Reflection Format:** All reflections follow standard template with Priority 1/2/3 categorization
- [ ] **Framework Issue Detection:** Reflections correctly distinguish 2L framework issues from project-specific issues
- [ ] **JSONL Logging:** All reflections appended to .2L/global-learnings.jsonl with proper schema
- [ ] **Aggregation Functionality:** Reflection aggregator groups similar issues with 0.8 similarity threshold
- [ ] **Pattern Creation:** Aggregator creates new patterns or merges into existing patterns in global-learnings.yaml
- [ ] **Incremental Processing:** O(n) aggregation time (compares to patterns, not all learnings)
- [ ] **Event Emission:** reflection_created, pattern_detected, pattern_merged events logged
- [ ] **Integration Testing:** End-to-end test from iteration completion → reflection → aggregation → pattern creation
- [ ] **Backward Compatibility:** Existing /2l-mvp iterations continue working if reflection generation fails
- [ ] **Vision Enhancement (Basic):** Vision generator can read exploration context (if available)

## MVP Scope

**In Scope:**

- Reflection generator utility (lib/2l-reflection-generator.py)
- Reflection aggregator utility (lib/2l-reflection-aggregator.py)
- Reflection template (templates/reflection-template.md)
- Integration hooks in /2l-mvp (lines 1199, 1435)
- JSONL append-only learning log (.2L/global-learnings.jsonl)
- Incremental aggregation with difflib.SequenceMatcher (0.8 threshold)
- Basic vision enhancement (read exploration reports if present)
- Event logging (reflection_created, pattern_detected, pattern_merged)
- Atomic YAML writes via existing 2l-yaml-helpers.py
- Framework issue detection via file path + keyword heuristics

**Out of Scope (Post-MVP):**

- Automatic aggregation after every reflection (manual trigger only for MVP)
- Advanced similarity algorithms (ML-based embeddings, LSH)
- REFLECTION.md from builder reports (validation report only)
- Reflection editing UI
- Pattern merging/splitting tools
- Cross-project learning transfer
- Real-time aggregation dashboard
- YAML → JSONL rebuild utility (can be added later if needed)

## Development Phases

1. **Exploration** ✅ Complete
2. **Planning** 🔄 Current
3. **Building** ⏳ 7-8 hours (3 builders)
4. **Integration** ⏳ 45-60 minutes (1 integrator)
5. **Validation** ⏳ 30 minutes
6. **Deployment** ⏳ Final (smoke test + commit)

## Timeline Estimate

- **Exploration:** ✅ Complete (3 explorer reports)
- **Planning:** ✅ Complete (this document)
- **Building:** 7-8 hours
  - Builder-1 (Reflection Generator): 2.5 hours
  - Builder-2 (Reflection Aggregator): 3.5 hours
  - Builder-3 (/2l-mvp Integration): 1.5 hours
- **Integration:** 45-60 minutes
  - Integrator-1: Merge all components, test end-to-end
- **Validation:** 30 minutes
  - Create test iteration, verify reflection → aggregation flow
- **Total:** ~9-10 hours

## Risk Assessment

### High Risks

**Risk: Reflection generation blocks iteration completion**
- **Impact:** If reflection generator hangs or crashes, iterations cannot complete
- **Likelihood:** Medium
- **Mitigation strategy:**
  - Timeout on reflection generation (5 seconds max)
  - Try/except wrapper around generator invocation
  - Non-critical execution (log warning if fails, continue)
  - Graceful degradation (empty REFLECTION.md if parsing fails)

**Risk: Similarity threshold too loose (false positives)**
- **Impact:** Unrelated issues grouped into same pattern
- **Likelihood:** Medium (0.8 is educated guess, needs tuning)
- **Mitigation strategy:**
  - Start with 0.8 (based on Explorer-2 analysis)
  - Log all similarity scores in [0.75, 0.85] range for manual review
  - Make threshold configurable via CLI flag (--threshold)
  - Dry-run mode to preview groupings before committing
  - JSONL as source-of-truth allows re-aggregation with different threshold

### Medium Risks

**Risk: JSONL concurrent write corruption**
- **Impact:** Data loss if multiple processes append simultaneously
- **Likelihood:** Low (single writer in MVP: orchestrator only)
- **Mitigation strategy:**
  - Use file locking (fcntl) for appends
  - Atomic append operations (write + flush)
  - Backup .yaml before aggregation (.yaml.bak)
  - JSONL repair utility (detect malformed lines, skip)

**Risk: Framework issue detection accuracy**
- **Impact:** Project issues classified as framework issues (noise in patterns)
- **Likelihood:** Medium (heuristic-based detection)
- **Mitigation strategy:**
  - Multi-heuristic approach (file paths + keywords + context)
  - Conservative bias (prefer false negatives over false positives)
  - Manual review of first 20 reflections
  - Tunable keyword list (can extend post-MVP)

**Risk: Aggregation performance degradation**
- **Impact:** Slow aggregation as learnings accumulate (100s → 1000s)
- **Likelihood:** Low (incremental design prevents O(n²))
- **Mitigation strategy:**
  - Incremental aggregation (O(patterns), not O(learnings))
  - Category-based indexing (only compare within same category)
  - Performance benchmarks (10, 100, 1000 learnings)
  - Alert if aggregation >5 seconds

### Low Risks

**Risk: Reflection template drift**
- **Impact:** Parser breaks if template changes
- **Likelihood:** Low (controlled by us)
- **Mitigation strategy:**
  - Use section markers (## headers) not line numbers
  - Lenient parser (skip unparseable sections)
  - Schema version in template (schema_version: "1.0")
  - Backward compatibility for old reflections

## Integration Strategy

**How builder outputs will be merged:**

All three builders work on separate files (no conflicts):

1. **Builder-1 (Reflection Generator):**
   - Creates: lib/2l-reflection-generator.py, templates/reflection-template.md
   - No conflicts (new files)

2. **Builder-2 (Reflection Aggregator):**
   - Creates: lib/2l-reflection-aggregator.py
   - No conflicts (new file)

3. **Builder-3 (Integration):**
   - Modifies: commands/2l-mvp.md (lines 1199, 1435)
   - Uses outputs from Builder-1 and Builder-2
   - Sequential dependency (builds after 1 and 2 complete)

**Integration approach:**

- **Phase 1:** Builders 1 and 2 execute in parallel (no dependencies)
- **Phase 2:** Builder-3 executes after 1 and 2 complete (needs both utilities)
- **Phase 3:** Integrator-1 tests end-to-end flow, creates test fixtures
- **No merge conflicts:** All builders touch different files
- **Testing coordination:** Builder-3 validates that Builder-1 and Builder-2 outputs work correctly

**Shared dependencies:**

- Builder-2 and Builder-3 both use lib/2l-yaml-helpers.py (existing utility)
- Builder-3 validates that Builder-1's output schema matches Builder-2's input schema
- All builders use templates/reflection-template.md (Builder-1 creates, Builder-2/3 reference)

## Deployment Plan

**How the MVP will be deployed:**

1. **Pre-deployment validation:**
   - Run all unit tests (Builder-1: reflection parsing, Builder-2: similarity matching)
   - Integration test: Create test iteration → generate reflection → run aggregation
   - Verify REFLECTION.md format matches template
   - Verify global-learnings.jsonl appended correctly
   - Verify global-learnings.yaml updated with new pattern

2. **Deployment steps:**
   - Commit all changes to meditation space (~/Ahiya/2L)
   - Run smoke test: /2l-status verifies all commands executable
   - Test with real iteration (plan-9, iteration-9 itself)
   - Verify reflection created at .2L/plan-9/iteration-9/REFLECTION.md
   - Manually trigger aggregation: `python3 lib/2l-reflection-aggregator.py --mode full`
   - Verify pattern appears in global-learnings.yaml

3. **Rollback plan:**
   - Git tag before changes: `git tag iteration-9-pre-deployment`
   - If issues: `git reset --hard iteration-9-pre-deployment`
   - Restore global-learnings.yaml from .yaml.bak if corrupted
   - JSONL provides source-of-truth for re-aggregation

4. **Monitoring:**
   - Check .2L/events.jsonl for reflection_created events
   - Monitor reflection creation time (<5 seconds expected)
   - Review first 5 reflections for format consistency
   - Validate framework issue detection accuracy (manual spot-check)

5. **Success indicators:**
   - REFLECTION.md created after iteration-9 validation
   - global-learnings.jsonl contains iteration-9 entry
   - global-learnings.yaml updated (if patterns detected)
   - No errors in orchestrator output
   - /2l-mvp continues working normally

**Post-deployment:**

- Run /2l-improve (should read new patterns if any)
- Monitor next 2-3 iterations for reflection consistency
- Tune similarity threshold if needed (based on manual review)
- Document reflection format for future reference
