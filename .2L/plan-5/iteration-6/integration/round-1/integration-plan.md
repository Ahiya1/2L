# Integration Plan - Round 1

**Created:** 2025-11-19T18:45:00Z
**Iteration:** plan-5/iteration-6
**Total builders to integrate:** 2

---

## Executive Summary

Integration of learning capture and re-validation infrastructure for 2L's self-reflection system. Both builders completed successfully with zero file overlap, enabling straightforward parallel integration.

Key insights:
- **Zero file conflicts**: Builder-1 modified validator agent, Builder-2 modified orchestrator command - completely separate files
- **File-based integration**: learnings.yaml schema acts as clean contract between builders
- **High quality outputs**: Both builders met all success criteria with comprehensive testing
- **Low integration risk**: No shared code, no duplicate implementations, clear boundaries

---

## Builders to Integrate

### Primary Builders
- **Builder-1:** Learning Capture in Validator - Status: COMPLETE
- **Builder-2:** Re-validation Checkpoint & Orchestrator Reflection - Status: COMPLETE

### Sub-Builders
None - both builders completed without splitting

**Total outputs to integrate:** 2

---

## Integration Zones

### Zone 1: Validator Learning Capture (Independent)

**Builders involved:** Builder-1

**Conflict type:** Independent feature (no conflicts)

**Risk level:** LOW

**Description:**
Builder-1 extended the validator agent (`~/.claude/agents/2l-validator.md`) with embedded Python functions for automatic learning capture. When validation fails, the validator now creates `learnings.yaml` with structured data about issues, root causes, and solutions.

This is a completely independent extension to the validator agent with no integration dependencies. The validator creates files that Builder-2's orchestrator reflection will consume, but the schema was pre-defined in patterns.md, so there's no actual dependency between the builder implementations.

**Files affected:**
- `~/.claude/agents/2l-validator.md` - Extended with learning capture logic (lines 990-1260)

**Integration strategy:**
Direct merge - no conflicts, no dependencies on other zones.

Steps:
1. Verify validator agent extension follows patterns.md schema
2. Copy extended validator agent to meditation space
3. Quick smoke test: Create validation failure, verify learnings.yaml created
4. Confirm YAML structure matches patterns.md specification

**Expected outcome:**
Validator agent live with learning capture capability. Any validation failure will create learnings.yaml automatically.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW

---

### Zone 2: Orchestrator Re-validation & Reflection (Independent)

**Builders involved:** Builder-2

**Conflict type:** Independent feature (no conflicts)

**Risk level:** LOW

**Description:**
Builder-2 extended the orchestrator command (`~/.claude/commands/2l-mvp.md`) with two major capabilities:

1. **Re-validation Checkpoint**: After healing completes, orchestrator re-spawns validator to verify healing actually fixed the issues. Prevents false iteration completion. Max 2 healing attempts with graceful escalation.

2. **Orchestrator Reflection**: After validation passes, orchestrator merges iteration learnings into global-learnings.yaml with metadata enrichment (duration, healing rounds, files modified). Uses atomic writes via existing YAML helpers library.

This is completely independent from Builder-1. Builder-2 reads the learnings.yaml schema from patterns.md (not from Builder-1's code), so there's no implementation dependency.

**Files affected:**
- `~/.claude/commands/2l-mvp.md` - Extended with re-validation checkpoint and reflection (lines 737, 1369-1425, 1676-1768)

**Integration strategy:**
Direct merge - no conflicts, reads learnings.yaml via pre-defined schema.

Steps:
1. Verify orchestrator extension follows patterns.md conventions
2. Copy extended orchestrator command to meditation space
3. Verify re-validation logic has MAX_HEALING_ATTEMPTS=2
4. Confirm orchestrator_reflection() function properly integrated
5. Verify event emissions for re-validation and reflection

**Expected outcome:**
Orchestrator live with re-validation checkpoint and reflection capability. Any healing will trigger re-validation, and successful iterations will merge learnings into global knowledge base.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW

---

### Zone 3: End-to-End Pipeline Verification (Integration Test)

**Builders involved:** Builder-1, Builder-2

**Conflict type:** Integration verification (no conflicts, just testing)

**Risk level:** MEDIUM

**Description:**
While the builders don't conflict, we need to verify the full data pipeline works end-to-end:

1. Validator creates learnings.yaml (Builder-1)
2. Orchestrator triggers healing (existing)
3. Re-validation runs after healing (Builder-2)
4. Orchestrator reflection merges learnings (Builder-2)
5. Global-learnings.yaml contains learning with metadata (Builder-2)

This is the critical integration test to ensure the learnings.yaml schema actually matches what orchestrator reflection expects, and that the full learning capture → reflection pipeline works.

**Files affected:**
- `.2L/plan-5/iteration-6/validation/learnings.yaml` (created by validator)
- `.2L/global-learnings.yaml` (created/updated by orchestrator reflection)
- `.2L/events.jsonl` (event emissions from both builders)

**Integration strategy:**
End-to-end integration test after both zones merged.

Steps:
1. Create intentional TypeScript error (force validation failure)
2. Run full orchestration cycle
3. Verify learnings.yaml created with correct schema (Builder-1 success)
4. Verify re-validation triggered after healing (Builder-2 success)
5. Verify orchestrator reflection merged learnings (Builder-2 success)
6. Verify global-learnings.yaml has status: IDENTIFIED and metadata
7. Verify events.jsonl contains re-validation and reflection events
8. Test graceful degradation (make validator directory read-only, verify warnings)
9. Test healing escalation (max 2 attempts)

**Expected outcome:**
Full learning capture pipeline working end-to-end. Validation failures create learnings, orchestrator merges them into global knowledge base with full metadata.

**Assigned to:** Integrator-1

**Estimated complexity:** MEDIUM (comprehensive testing required)

---

## Independent Features (Direct Merge)

Both builders create independent features with zero overlap:

- **Builder-1:** Validator learning capture - Files: `~/.claude/agents/2l-validator.md`
- **Builder-2:** Orchestrator re-validation + reflection - Files: `~/.claude/commands/2l-mvp.md`

**Assigned to:** Integrator-1 (merge alongside zone work)

---

## Parallel Execution Groups

### Group 1 (All zones can be done sequentially by single integrator)
- **Integrator-1:**
  - Zone 1: Merge validator extension (5 min)
  - Zone 2: Merge orchestrator extension (5 min)
  - Zone 3: End-to-end pipeline verification (20 min)

**Rationale for single integrator:**
- Total integration time: ~30 minutes
- Zero file conflicts
- Simple verification workflow
- No parallelization benefit (would add coordination overhead)

---

## Integration Order

**Recommended sequence:**

1. **Merge Zone 1: Validator Learning Capture** (5 minutes)
   - Copy extended validator agent to meditation space
   - Quick verification: learnings.yaml schema matches patterns.md

2. **Merge Zone 2: Orchestrator Re-validation + Reflection** (5 minutes)
   - Copy extended orchestrator command to meditation space
   - Quick verification: re-validation logic present, reflection function integrated

3. **Execute Zone 3: End-to-End Pipeline Verification** (20 minutes)
   - Run full orchestration with intentional validation failure
   - Verify entire learning capture → reflection pipeline
   - Test edge cases (graceful degradation, healing escalation)
   - Verify event emissions

4. **Final consistency check**
   - All success criteria met
   - Events.jsonl has expected events
   - Move to ivalidator

---

## Shared Resources Strategy

### Shared Schema: learnings.yaml

**Issue:** Both builders need to agree on learnings.yaml format

**Resolution:**
- Schema pre-defined in `patterns.md` (lines 79-110)
- Builder-1 implemented exact schema for creation
- Builder-2 reads exact schema for consumption
- No conflict - both reference same specification

**Verification approach:**
1. Extract learnings.yaml created by Builder-1 validator
2. Verify all required fields present (schema_version, project, plan, iteration, created_at, learnings)
3. Verify each learning has 9 required fields (id, iteration, category, severity, issue, root_cause, solution, recurrence_risk, affected_files)
4. Run Builder-2 orchestrator reflection on this file
5. Verify successful merge into global-learnings.yaml

**Responsible:** Integrator-1 in Zone 3

### Shared Dependency: YAML Helpers Library

**Issue:** Builder-2 uses `~/.claude/lib/2l-yaml-helpers.py` for atomic writes

**Resolution:**
- YAML helpers library already exists (mentioned in Builder-2 report line 24-25)
- Builder-2 uses existing `merge_learnings()` CLI
- No new YAML helpers needed
- No conflict

**Verification approach:**
1. Confirm `~/.claude/lib/2l-yaml-helpers.py` exists
2. Verify it has `merge_learnings()` function
3. Test CLI interface works: `python3 ~/.claude/lib/2l-yaml-helpers.py merge_learnings --help`

**Responsible:** Integrator-1 before Zone 2

### Event Emissions

**Issue:** Both builders emit events to `.2L/events.jsonl`

**Resolution:**
- Builder-1: No new event types (uses existing validation_result)
- Builder-2: Adds new event types (re-validation variants, reflection_complete)
- No conflict - event logger supports multiple event types
- Event emissions are append-only (no conflicts)

**Verification approach:**
1. Run full orchestration
2. Check events.jsonl for expected sequence:
   - validation_result: "Validation: FAIL"
   - phase_change: "Starting re-validation after healing attempt 1"
   - validation_result: "Re-validation attempt 1: PASS"
   - reflection_complete: "N learnings added to global knowledge base"
   - iteration_complete: "Iteration N completed after 1 healing round(s)"

**Responsible:** Integrator-1 in Zone 3

---

## Expected Challenges

### Challenge 1: YAML Schema Mismatch

**Impact:** If Builder-1's learnings.yaml doesn't match what Builder-2 expects, reflection will fail

**Likelihood:** VERY LOW (both reference patterns.md specification)

**Mitigation:**
1. Early verification in Zone 3: Create learnings.yaml via Builder-1 validator
2. Test Builder-2 reflection can parse it successfully
3. If mismatch found: Manual correction to align schemas (likely just field name differences)

**Responsible:** Integrator-1

### Challenge 2: YAML Helpers Library Missing Functions

**Impact:** If merge_learnings() function doesn't exist in YAML helpers, reflection will fail

**Likelihood:** LOW (Builder-2 report claims it exists)

**Mitigation:**
1. Verify YAML helpers library before Zone 2 merge
2. If missing: Check if Builder-2 created it (may be in building output)
3. If truly missing: Create from patterns.md specification (patterns.md has full implementation)

**Responsible:** Integrator-1

### Challenge 3: Event Logger Syntax Differences

**Impact:** Event emissions might fail if syntax doesn't match existing event logger

**Likelihood:** LOW (both builders follow existing patterns)

**Mitigation:**
1. Review event emission code in both builders
2. Verify matches existing `~/.claude/lib/2l-event-logger.sh` syntax
3. Test event emissions during Zone 3 verification
4. If issues: Correct syntax to match existing patterns

**Responsible:** Integrator-1

---

## Success Criteria for This Integration Round

- [x] All zones successfully resolved (none have conflicts)
- [x] No duplicate code remaining (builders work on separate files)
- [x] All imports resolve correctly (no imports between builders)
- [ ] Validator creates learnings.yaml on FAIL (Builder-1 test)
- [ ] Re-validation runs after healing (Builder-2 test)
- [ ] Orchestrator reflection merges learnings (Builder-2 test)
- [ ] Global-learnings.yaml created with correct schema (Zone 3 test)
- [ ] Events emitted for re-validation and reflection (Zone 3 test)
- [ ] Graceful degradation works (Zone 3 test)
- [x] Consistent patterns across integrated code (both follow patterns.md)
- [x] No conflicts in shared files (no shared files modified)
- [x] All builder functionality preserved (independent features)

---

## Notes for Integrators

**Important context:**
- This is plan-5 iteration-6 (global iteration 6)
- Building learning capture and re-validation infrastructure
- Part of larger self-reflection system (future iterations will add /2l-improve)
- Changes are live immediately via symlinks (~/.claude/ → ~/Ahiya/2L/)

**Watch out for:**
- Verify YAML helpers library exists before merging Builder-2
- Test full pipeline end-to-end (don't assume schema matches)
- Check events.jsonl for proper event sequence
- Test graceful degradation (learning capture failures shouldn't block orchestration)

**Patterns to maintain:**
- Reference `patterns.md` for all conventions
- Ensure error handling is graceful (warnings, not blockers)
- Keep learnings.yaml schema consistent with patterns.md
- Maintain backward compatibility (orchestrations without learning capture still work)

---

## Next Steps

1. Integrator-1 executes all 3 zones sequentially (~30 min total)
2. Integrator-1 creates integration report with verification results
3. Proceed to ivalidator for final iteration validation
4. If ivalidator PASS: Git commit, iteration complete
5. If ivalidator FAIL: Spawn healer, re-validate (test new re-validation checkpoint!)

---

**Integration Planner:** 2l-iplanner
**Plan created:** 2025-11-19T18:45:00Z
**Round:** 1
**Complexity:** LOW (independent features, zero conflicts)
**Estimated integration time:** 30 minutes
