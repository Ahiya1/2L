# 2L Iteration Plan - Pattern Lifecycle Verification & Monitoring

## Project Vision

Complete the self-improvement feedback loop by implementing automated pattern verification and regression detection. This iteration adds the final states (VERIFIED, REGRESSED) to the pattern lifecycle system, enabling the 2L framework to automatically track whether implemented fixes successfully resolve recurring issues.

**The Big Picture:** After this iteration, 2L will have complete meta-circular self-improvement:
1. **Exploration** (Iter 8): Real Task agents analyze the codebase
2. **Reflection** (Iter 9): Learnings captured and patterns detected
3. **Verification** (Iter 10): Patterns monitored for 3 iterations, auto-verified or marked regressed

This closes the learning loop - the framework can now learn from its own iterations and verify improvements stick.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] Pattern lifecycle supports VERIFIED and REGRESSED states with automatic transitions
- [ ] Recurrence detection implemented using 0.8 similarity threshold (same as aggregator)
- [ ] 3-iteration verification window correctly tracks patterns from IMPLEMENTED → VERIFIED
- [ ] Regression detection marks patterns REGRESSED when they recur after implementation
- [ ] Integration with /2l-mvp at both reflection points (first-pass and healing)
- [ ] Events emitted: `pattern_verified`, `pattern_regressed` in .2L/events.jsonl
- [ ] PATTERN-001 end-to-end test passes: IMPLEMENTED → 3 iterations → VERIFIED
- [ ] PATTERN-001 regression test passes: Re-introduce bug → REGRESSED detection
- [ ] Existing functionality unaffected (all previous tests still pass)
- [ ] Vision enhancement validation confirms iteration 8 implementation still works

## MVP Scope

**In Scope:**

- Pattern lifecycle manager extensions (check_recurrence method)
- Recurrence detection via similarity matching (reuse SequenceMatcher)
- Automatic VERIFIED transition after 3 clean iterations
- Automatic REGRESSED detection when pattern recurs
- /2l-mvp integration at reflection points
- Event emission for lifecycle transitions
- Testing infrastructure (unit + integration tests)
- PATTERN-001 end-to-end validation

**Out of Scope (Post-MVP):**

- Configurable verification window (hardcoded 3 iterations for MVP)
- Pattern-specific similarity thresholds (0.8 for all patterns)
- Manual override CLI commands (use existing `update` command)
- Dashboard notifications for verification/regression
- VERIFIED pattern monitoring (only IMPLEMENTED patterns checked)
- Performance optimizations (JSONL indexing, caching)
- Multi-plan pattern tracking (assumes single meditation space)

## Development Phases

1. **Exploration** ✅ Complete (3 explorer reports analyzed)
2. **Planning** 🔄 Current (creating comprehensive plan)
3. **Building** ⏳ 6-7 hours (3 builders, potentially parallel)
4. **Integration** ⏳ 30 minutes (merge builder outputs)
5. **Validation** ⏳ 45 minutes (PATTERN-001 end-to-end tests)
6. **Deployment** ⏳ Final (no deployment, local framework update)

## Timeline Estimate

- **Exploration:** Complete (3 hours actual)
- **Planning:** Complete (this document - 1.5 hours)
- **Building:** 6-7 hours total
  - Builder-1 (Recurrence Logic): 3-4 hours
  - Builder-2 (/2l-mvp Integration): 1.5-2 hours
  - Builder-3 (Testing & Validation): 1.5-2 hours
- **Integration:** 30 minutes (builders have clear boundaries)
- **Validation:** 45 minutes (PATTERN-001 tests, smoke tests)
- **Total:** ~11-13 hours

## Risk Assessment

### High Risks

**Risk: False Positive Recurrence Detection**
- **Impact:** Pattern incorrectly marked REGRESSED, user confusion, wasted effort
- **Likelihood:** MEDIUM (40%)
- **Mitigation Strategy:**
  - Use proven 0.8 similarity threshold from reflection aggregator
  - Require category match (functionality/completeness/speed) in addition to similarity
  - Log similarity scores in REGRESSED metadata for manual review
  - Emit events for monitoring (can manually correct via `update` command)
  - Post-MVP: Require 2+ recurrences before auto-regression

**Risk: Off-By-One Errors in Verification Window**
- **Impact:** Pattern verified too early (2 iterations) or never verified (stuck)
- **Likelihood:** MEDIUM (30%)
- **Mitigation Strategy:**
  - Explicit test cases covering all boundary conditions
  - Clear documentation: "3 iterations = verification_start, +1, +2"
  - Use `>=` comparison carefully: `current_iteration >= verification_start + 3`
  - Test with PATTERN-001 real-world scenario
  - Code review focusing on iteration arithmetic

### Medium Risks

**Risk: Aggregator Test Regression**
- **Impact:** Breaking existing reflection aggregator tests (21/21 passing in iter-9)
- **Likelihood:** LOW (15%)
- **Mitigation Strategy:**
  - Copy (don't modify) calculate_similarity from aggregator
  - Run existing test suite before and after changes
  - Document code provenance to avoid future conflicts
  - No runtime coupling between aggregator and lifecycle manager

**Risk: JSONL Parsing Performance**
- **Impact:** Slow verification checks block /2l-mvp iteration completion
- **Likelihood:** LOW (20%)
- **Mitigation Strategy:**
  - Early exit on first recurrence match (don't scan all learnings)
  - Only parse current iteration's JSONL entries (not entire file)
  - 5-second timeout for verification check
  - Non-blocking execution (log error, continue iteration)
  - Post-MVP: Add JSONL indexing if needed

### Low Risks

**Risk: Missing Learnings File Edge Case**
- **Impact:** Verification check fails when iteration has no learnings.yaml
- **Likelihood:** LOW (most iterations complete successfully)
- **Mitigation Strategy:**
  - Try/except around learnings file loading
  - Return "still monitoring" status if file missing
  - Don't block iteration completion
  - Log warning for debugging

## Integration Strategy

**How Builder Outputs Will Be Merged:**

1. **Builder-1 delivers standalone utility** (`lib/2l-pattern-lifecycle.py` extensions)
   - Self-contained: check_recurrence() method, CLI command, helpers
   - No external dependencies beyond standard library
   - Tested independently with unit tests
   - Integrator simply verifies file exists and tests pass

2. **Builder-2 delivers /2l-mvp integration** (bash function + 2 call sites)
   - Clear insertion points documented by Explorer-3
   - Bash function defined once, called twice (lines 1199, 1438)
   - Events emitted using existing log_2l_event
   - Integration test verifies both code paths execute

3. **Builder-3 delivers test suite** (end-to-end validation)
   - Test script: lib/test-pattern-lifecycle-recurrence.sh
   - PATTERN-001 validation scenarios
   - Edge case coverage (missing files, empty learnings)
   - Integrator runs test suite as acceptance criteria

**Conflict Prevention:**

- No shared files between builders (clean separation)
- Builder-1 owns lib/2l-pattern-lifecycle.py
- Builder-2 owns commands/2l-mvp.md
- Builder-3 creates new test file
- All builders read (but don't modify) global-learnings.yaml

**Integration Checklist:**

- [ ] Builder-1: check_recurrence() CLI command exists and works
- [ ] Builder-2: check_pattern_lifecycle() bash function defined
- [ ] Builder-2: Function called at lines ~1199 and ~1438 in /2l-mvp
- [ ] Builder-3: test-pattern-lifecycle-recurrence.sh passes all tests
- [ ] Integration: Run full /2l-mvp with PATTERN-001, verify end-to-end
- [ ] Validation: Existing tests still pass (no regression)

## Deployment Plan

**How the MVP Will Be Deployed:**

This iteration updates the local 2L framework - no external deployment needed.

**Deployment Steps:**

1. **Code Integration:** Merge builder outputs to main branch
2. **Smoke Test:** Run /2l-mvp on test project, verify no crashes
3. **PATTERN-001 Test:** Verify end-to-end lifecycle (IMPLEMENTED → VERIFIED)
4. **Documentation:** Update .2L/plan-9/iteration-10/ITERATION_COMPLETE.md
5. **Event Log Check:** Verify pattern_verified/pattern_regressed events in .2L/events.jsonl
6. **Reflection Creation:** Document learnings from iteration 10
7. **Aggregation:** Run reflection aggregator to update global-learnings.yaml
8. **Self-Verification:** This iteration's reflection should NOT match existing patterns (new functionality)

**Rollback Plan:**

If verification/regression logic has critical bugs:
1. Revert lib/2l-pattern-lifecycle.py to iteration 9 version
2. Revert commands/2l-mvp.md integration points
3. Pattern lifecycle still functional (IDENTIFIED → IMPLEMENTED works)
4. Document issues in global-learnings.yaml as new pattern
5. Re-plan iteration 10 with fixes

**Success Indicators:**

- [ ] /2l-mvp completes iterations without errors
- [ ] Pattern lifecycle transitions work automatically
- [ ] Events appear in .2L/events.jsonl
- [ ] PATTERN-001 reaches VERIFIED status after 3 clean iterations
- [ ] No false positives in recurrence detection (manual review of events)
- [ ] All previous functionality intact (reflection, aggregation, vision)

## Completion Definition

**Iteration 10 is COMPLETE when:**

1. All 3 builders have submitted reports
2. Integration complete (all files merged)
3. PATTERN-001 end-to-end test passes
4. Existing test suites pass (no regression)
5. Event logging verified (pattern_verified, pattern_regressed)
6. Vision enhancement validated (iteration 8 feature still works)
7. Validation report created documenting success
8. ITERATION_COMPLETE.md written
9. Reflection created and aggregated
10. Plan-9 marked COMPLETE in master-plan.yaml

**Final Deliverables:**

- lib/2l-pattern-lifecycle.py (extended with verification logic)
- commands/2l-mvp.md (integrated lifecycle monitoring)
- lib/test-pattern-lifecycle-recurrence.sh (test suite)
- .2L/plan-9/iteration-10/validation/validation-report.md
- .2L/plan-9/PLAN_COMPLETE.md (plan-9 final summary)

---

**This is the final iteration of Plan-9.** Upon completion, the 2L framework will have full self-improvement capabilities: exploration, reflection, aggregation, and verification. The meta-circular loop is closed.
