# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

Iteration 2 (MCP Cleanup + Honest Validation) requires implementing honest uncertainty reporting in validators to prevent false positives/negatives. Current validator agents (2l-validator.md, 2l-ivalidator.md) use binary PASS/FAIL statuses which force validators to either over-report success or be overly cautious. The 80% confidence rule and new status types (UNCERTAIN, PARTIAL, INCOMPLETE) provide validators with tools to accurately represent validation outcomes. Implementation is straightforward: add reporting standards sections, update status enums, modify report templates, and provide decision frameworks with concrete examples. Zero external dependencies. Estimated 3-4 hours for complete implementation across both validator agents.

**Key Finding:** Honest validation is a **cultural/guidance change**, not a technical architecture change. The validation tools and processes already exist - we're adding decision frameworks and permission structures to report uncertainty.

## Discoveries

### Current Validation Status Model

**Existing binary model in 2l-validator.md and 2l-ivalidator.md:**
- **PASS**: All checks passed, ready for deployment
- **FAIL**: Issues found, requires healing

**Problems with binary model:**
1. **No middle ground**: Validator forced to choose between "perfect" and "broken"
2. **Uncertainty hidden**: Validator may be 60% confident but reports PASS (optimistic) or FAIL (pessimistic)
3. **Partial completion invisible**: 10 of 12 success criteria met → FAIL (discards partial progress information)
4. **Incomplete checks unreported**: Can't run browser test → silently skip or conservatively FAIL
5. **Confidence levels missing**: User can't distinguish high-confidence PASS from uncertain PASS

### Honest Validation Status Model

**New 5-status model from vision.md:**
- **PASS** (✅): High confidence (>80%), all critical checks passed, ready for deployment
- **UNCERTAIN** (⚠️): Medium confidence (60-80%), checks passed but validator has doubts about completeness/correctness
- **PARTIAL** (⚠️): Some checks passed, others incomplete, progress made but not deployment-ready
- **INCOMPLETE** (⚠️): Cannot complete validation due to missing dependencies, tools, or information
- **FAIL** (❌): Clear failures identified, definitive issues that block deployment

**Benefits of 5-status model:**
1. **Captures uncertainty**: Validator can report "tests pass but I couldn't verify X"
2. **Shows partial progress**: "10 of 12 criteria met" → PARTIAL (not binary failure)
3. **Distinguishes inability from failure**: "Can't run Playwright" → INCOMPLETE (not FAIL)
4. **Builds user trust**: Honest reports prevent surprises in production
5. **Enables better orchestration decisions**: UNCERTAIN → investigate manually vs FAIL → auto-heal

### The 80% Confidence Rule

**Core principle from vision.md:**
> "If <80% confident in PASS → report as UNCERTAIN or PARTIAL"

**What this means in practice:**

**Scenario 1: All tests pass but validator unsure about completeness**
- Tests: ✅ TypeScript compiles, ✅ linting passes, ✅ unit tests pass
- Missing: ❌ Integration tests don't exist, ❌ E2E tests not run
- Confidence: ~65% (tests that exist pass, but coverage uncertain)
- **Honest status**: UNCERTAIN
- **Old behavior**: Would report PASS (optimistic) or FAIL (pessimistic)

**Scenario 2: Most criteria met, some incomplete**
- Success criteria: 10 of 12 met
- Missing: 2 criteria couldn't be verified (missing MCP server)
- Confidence: ~75% (10/12 is good, but 2 unknowns reduce confidence)
- **Honest status**: PARTIAL
- **Old behavior**: Would report FAIL (loses partial progress info)

**Scenario 3: Can't validate due to missing tool**
- Playwright MCP not available
- Can't run E2E tests
- All other checks pass
- Confidence: N/A (incomplete information)
- **Honest status**: INCOMPLETE
- **Old behavior**: Would report FAIL or skip silently

**Scenario 4: High confidence, comprehensive validation**
- All automated checks pass
- All success criteria verified
- Manual inspection shows quality code
- Confidence: >90%
- **Honest status**: PASS
- **Same as old behavior**: This is when PASS is appropriate

### Validation Report Template Changes

**Current report structure (from 2l-validator.md lines 250-490):**
```markdown
## Status
**PASS** / **FAIL**

## Validation Results

### TypeScript Compilation
**Status:** ✅ PASS / ❌ FAIL
...
```

**New report structure with confidence:**
```markdown
## Status
**PASS** | **UNCERTAIN** | **PARTIAL** | **INCOMPLETE** | **FAIL**

**Confidence Level:** {HIGH|MEDIUM|LOW} ({percentage}%)

**Confidence Rationale:**
{Explain why this confidence level - what was verified vs what's uncertain}

## Validation Results

### TypeScript Compilation
**Status:** ✅ PASS / ❌ FAIL / ⚠️ SKIPPED
**Confidence:** {HIGH|MEDIUM|LOW}
**Notes:** {If confidence <HIGH, explain uncertainty}
...

## Confidence Assessment

### What We Know (High Confidence)
- {Check 1}: Fully verified, high confidence
- {Check 2}: Comprehensive testing completed

### What We're Uncertain About (Medium Confidence)
- {Check 3}: Tests pass but coverage unclear
- {Check 4}: Validation incomplete due to {reason}

### What We Couldn't Verify (Low/No Confidence)
- {Check 5}: {Tool} unavailable, skipped
- {Check 6}: {Information} missing, cannot validate
```

**Key additions:**
1. 5-status enum at top of report
2. Overall confidence level with percentage
3. Confidence rationale explaining the assessment
4. Per-check confidence levels (not just PASS/FAIL)
5. Explicit "Confidence Assessment" section separating known vs uncertain vs unverifiable

### Examples of Honest vs Optimistic Reporting

**Example 1: MCP Server Unavailable**

**Optimistic report (current pattern):**
```markdown
## Status
**PASS**

### E2E Testing
**Status:** ✅ PASS

**Result:** Skipped E2E tests (Playwright not available). All other tests pass.
```
**Problem:** Reports PASS despite skipping critical E2E validation

**Honest report (new pattern):**
```markdown
## Status
**INCOMPLETE**

**Confidence Level:** MEDIUM (70%)

**Confidence Rationale:**
All executable checks passed (TypeScript, linting, unit tests, build). However, 
E2E testing could not be performed due to Playwright MCP unavailability. Cannot 
verify user flow correctness with 80%+ confidence.

### E2E Testing
**Status:** ⚠️ SKIPPED
**Confidence:** N/A

**Result:** Playwright MCP not available. E2E tests not run. User flows unverified.

**Recommendation:** Deploy with caution. Manual E2E testing recommended before 
production use.
```
**Improvement:** Clearly communicates what wasn't validated, prevents false confidence

**Example 2: Partial Success Criteria**

**Optimistic report (current pattern):**
```markdown
## Status
**FAIL**

### Success Criteria Verification
10 of 12 criteria met

**Failed criteria:**
- Dashboard auto-refresh: Not implemented
- Cost tracking: Missing
```
**Problem:** Binary FAIL hides that 83% of criteria are met

**Honest report (new pattern):**
```markdown
## Status
**PARTIAL**

**Confidence Level:** MEDIUM (75%)

**Confidence Rationale:**
Strong partial completion: 10 of 12 success criteria met (83%). Core functionality 
verified and working. Two enhancement features missing but don't block MVP usage.

### Success Criteria Verification
**Status:** ⚠️ PARTIAL (10 of 12 met)
**Confidence:** HIGH (for the 10 met criteria)

**Met criteria (10):**
- ✅ [List of 10 criteria]

**Unmet criteria (2):**
- ❌ Dashboard auto-refresh: Not implemented (enhancement)
- ❌ Cost tracking: Missing (optional feature per vision.md)

**Recommendation:** MVP is functional for core use cases. Missing features are 
enhancements, not blockers. Consider deploying core functionality now, add 
enhancements in future iteration.
```
**Improvement:** Shows partial progress, enables informed deployment decision

**Example 3: Tests Pass But Coverage Uncertain**

**Optimistic report (current pattern):**
```markdown
## Status
**PASS**

### Unit Tests
**Status:** ✅ PASS

**Tests run:** 42
**Tests passed:** 42
**Coverage:** 85%
```
**Problem:** Reports PASS but validator uncertain if coverage is meaningful

**Honest report (new pattern):**
```markdown
## Status
**UNCERTAIN**

**Confidence Level:** MEDIUM (65%)

**Confidence Rationale:**
All 42 unit tests pass and coverage is 85%, which meets quantitative threshold. 
However, tests appear to focus on happy paths. Edge cases and error conditions 
have limited coverage. Cannot verify robustness with 80%+ confidence.

### Unit Tests
**Status:** ✅ PASS
**Confidence:** MEDIUM

**Tests run:** 42
**Tests passed:** 42
**Coverage:** 85% (quantitative goal met)

**Coverage concerns:**
- ✅ Happy path coverage: Excellent (90%+)
- ⚠️ Edge case coverage: Limited (~40%)
- ⚠️ Error condition coverage: Minimal (~20%)
- ⚠️ Integration point coverage: Uncertain

**Recommendation:** Tests pass but robustness uncertain. Consider adding edge case 
and error condition tests before production deployment.
```
**Improvement:** Distinguishes between "tests pass" and "comprehensive testing confirms quality"

### Integration Validator (Ivalidator) Honesty Patterns

**Current ivalidator gray area handling (from 2l-ivalidator.md lines 669-676):**
```markdown
## When in Doubt:
**Favor FAIL if:**
- Issues will compound in validation phase
- Quality is clearly compromised
- Would be hard to refactor later

**Favor PASS if:**
- Issues are cosmetic
- Can be addressed post-MVP
- Core cohesion is strong
```

**Problem:** Binary decision still required in gray areas

**New ivalidator gray area handling:**
```markdown
## When in Doubt:

**Report UNCERTAIN if:**
- Potential duplication vs intentional separation unclear
- Import patterns inconsistent but both valid approaches used
- Architecture quality good but some design choices questionable
- Evidence suggests cohesion but some areas need investigation

**Report PARTIAL if:**
- Most cohesion checks pass but 1-2 have minor issues
- Type consistency good except one gray area
- Patterns followed except for edge cases with unclear guidance

**Report INCOMPLETE if:**
- Can't determine if duplication exists (need more context)
- Missing information to assess architecture decisions
- Type definitions present but relationships unclear

**Favor FAIL only if:**
- Clear circular dependencies detected
- Obvious duplicate implementations (same function, different files)
- Type conflicts that will break compilation
```

**Improvement:** Provides vocabulary for gray areas instead of forcing binary choice

### Confidence Decision Framework

**Decision tree for overall validation status:**

```
1. Can all required checks be executed?
   NO → INCOMPLETE
   YES → Continue to 2

2. Do all executed checks pass?
   NO → Are failures clear and blocking?
      YES → FAIL
      NO → PARTIAL (some pass, some fail)
   YES → Continue to 3

3. What is confidence level in PASS assessment?
   >80% → PASS
   60-80% → UNCERTAIN
   <60% → INCOMPLETE (insufficient information)
```

**Per-check confidence assessment:**

```
HIGH confidence (>80%):
- Check executed successfully
- Results are definitive
- Coverage is comprehensive
- No known gaps in validation

MEDIUM confidence (60-80%):
- Check executed successfully
- Results appear correct
- Coverage has known gaps
- Some uncertainty about completeness

LOW confidence (<60%):
- Check executed with warnings
- Results ambiguous
- Coverage minimal
- Significant uncertainty

NO confidence (skipped):
- Check could not be executed
- Missing tools/dependencies
- Insufficient information
```

## Patterns Identified

### Pattern 1: Confidence-Based Status Selection

**Description:** Use confidence level to determine overall validation status

**Use Case:** Validator has run all checks but uncertain about completeness

**Implementation:**
```markdown
## Confidence Assessment Process

1. Calculate overall confidence:
   - List all required validations
   - For each validation, assess confidence (HIGH/MEDIUM/LOW/SKIPPED)
   - Weight by importance (critical checks weighted higher)
   - Calculate weighted confidence percentage

2. Apply 80% rule:
   - If weighted confidence ≥80% → PASS
   - If weighted confidence 60-79% → UNCERTAIN
   - If weighted confidence <60% → PARTIAL or INCOMPLETE

3. Override with failures:
   - If clear failures exist → FAIL (regardless of confidence)
   - If checks skipped → INCOMPLETE (even if other checks pass)
```

**Recommendation:** REQUIRED - This is the core pattern for honest validation

### Pattern 2: Tripartite Confidence Reporting

**Description:** Separate validation results into "What We Know", "What We're Uncertain About", "What We Couldn't Verify"

**Use Case:** User needs to understand validation completeness

**Implementation:**
```markdown
## Confidence Assessment

### What We Know (High Confidence)
{List checks that were comprehensive and definitive}

### What We're Uncertain About (Medium Confidence)
{List checks that passed but have caveats or limited coverage}

### What We Couldn't Verify (Low/No Confidence)
{List checks that were skipped or blocked}
```

**Recommendation:** REQUIRED - Makes uncertainty explicit and actionable

### Pattern 3: Confidence Rationale

**Description:** Always explain confidence level assessment

**Use Case:** User needs to understand why status is UNCERTAIN vs PASS

**Implementation:**
```markdown
**Confidence Level:** MEDIUM (70%)

**Confidence Rationale:**
TypeScript compilation passed with zero errors (high confidence). Unit tests 
passed with 85% coverage, meeting quantitative threshold (medium confidence - 
coverage metric met but test quality uncertain). E2E tests not run due to 
Playwright MCP unavailability (low confidence - user flows unverified). 

Overall: Core code quality verified (high confidence) but user flow correctness 
uncertain (medium confidence). 70% overall confidence is below 80% threshold 
for PASS status.
```

**Recommendation:** REQUIRED - Rationale enables trust and learning

### Pattern 4: Per-Check Confidence Metadata

**Description:** Each validation check includes confidence level, not just PASS/FAIL

**Use Case:** Validator wants to report test passing but with caveats

**Implementation:**
```markdown
### Unit Tests
**Status:** ✅ PASS
**Confidence:** MEDIUM

**Tests run:** 42
**Tests passed:** 42
**Coverage:** 85%

**Confidence notes:**
Tests pass and coverage meets threshold (85% > 80%). However, manual inspection 
shows tests focus on happy paths. Edge case and error condition coverage appears 
limited. Quantitatively sufficient but qualitatively uncertain.
```

**Recommendation:** RECOMMENDED - Provides granular uncertainty information

### Pattern 5: Graceful MCP Degradation

**Description:** Report INCOMPLETE when MCP unavailable, not FAIL

**Use Case:** Validator can't run Playwright tests due to MCP unavailability

**Implementation:**
```markdown
### E2E Testing
**Status:** ⚠️ SKIPPED
**Confidence:** N/A

**Result:** Playwright MCP not available. E2E tests cannot be executed.

**Impact on Overall Status:** INCOMPLETE

**Recommendation:** 
- If MCP becomes available: Re-run validation to verify E2E flows
- If MCP remains unavailable: Deploy with manual E2E testing
- Consider documenting MCP dependencies in project README
```

**Recommendation:** REQUIRED - Part of MCP cleanup, enables graceful degradation

### Pattern 6: PARTIAL Status for Incremental Progress

**Description:** Use PARTIAL when significant progress made but not 100% complete

**Use Case:** 10 of 12 success criteria met

**Implementation:**
```markdown
## Status
**PARTIAL**

**Completion:** 10 of 12 criteria (83%)

**What's Complete:**
{List 10 met criteria}

**What's Incomplete:**
{List 2 unmet criteria with context on whether they're blockers}

**Deployment Recommendation:**
Core functionality is complete and validated. Missing criteria are enhancements. 
Consider phased deployment: ship core now, add enhancements in iteration 2.
```

**Recommendation:** RECOMMENDED - Enables incremental delivery decisions

### Pattern 7: Honesty Examples in Agent Prompt

**Description:** Provide concrete examples in agent prompt showing honest vs optimistic reporting

**Use Case:** Validator learns by example what constitutes honest reporting

**Implementation in 2l-validator.md:**
```markdown
## Examples of Honest vs Optimistic Reporting

### Example 1: Tests Pass But Coverage Uncertain
**Scenario:** All unit tests pass. Coverage is 85%. Manual inspection shows tests 
focus on happy paths, limited edge case coverage.

**Optimistic Report:**
Status: PASS
Reason: Tests pass, coverage meets threshold.

**Honest Report:**
Status: UNCERTAIN
Confidence: MEDIUM (65%)
Reason: Tests pass quantitatively but edge case coverage limited. Cannot verify 
robustness with >80% confidence.

### Example 2: MCP Unavailable
...
```

**Recommendation:** REQUIRED - Examples teach the pattern

## Complexity Assessment

### High Complexity Areas

None. This is a guidance/cultural change, not technical complexity.

### Medium Complexity Areas

**1. Decision Framework Design**
- Defining when to use each status (UNCERTAIN vs PARTIAL vs INCOMPLETE)
- Creating confidence calculation methodology
- Balancing objective metrics with subjective judgment

**Mitigation:** Provide decision tree, examples, and explicit guidance

**2. Report Template Updates**
- Modifying existing validation report structure
- Adding confidence sections without bloating reports
- Maintaining backward compatibility with report readers

**Mitigation:** Extend template, don't replace. Keep old sections, add new.

### Low Complexity Areas

**1. Adding Status Enum**
- Straightforward: Change "PASS/FAIL" to "PASS/UNCERTAIN/PARTIAL/INCOMPLETE/FAIL"
- Simple text replacement in report template

**2. Examples Section**
- Copy examples from this exploration report into agent prompts
- Minimal editing needed

**3. Confidence Level Field**
- Add one line to report template: "**Confidence Level:** {percentage}%"

## Technology Recommendations

### Primary Stack

**No new technologies required.** This is entirely a process/guidance change.

**Existing technologies used:**
- Markdown - Report format (no changes)
- Bash - Orchestration (no changes to tech, only to agent prompts)
- Agent prompts - Text files in `~/.claude/agents/` (content changes only)

### Implementation Approach

**Template-based modification (not generative):**
1. Read existing 2l-validator.md and 2l-ivalidator.md
2. Insert new sections at strategic points
3. Update existing report template sections
4. Add examples inline

**Why template approach:**
- Low risk: Not rewriting agents, just enhancing
- Preserves existing logic: All current guidance remains
- Incremental: Can add sections one at a time
- Testable: Can verify changes with side-by-side comparison

## Integration Points

### Internal Integrations

**Integration 1: Validators → Orchestration**
- How they connect: Validators write validation-report.md, orchestrator reads status
- Current behavior: Orchestrator checks for PASS/FAIL in report
- New behavior: Orchestrator checks for PASS/UNCERTAIN/PARTIAL/INCOMPLETE/FAIL
- **Breaking change risk:** LOW - Orchestrator regex/parsing may need update
- **Mitigation:** Keep "Status:" line format, just expand enum

**Integration 2: Validators → Healing Phase**
- How they connect: Healers read validation reports to understand what to fix
- Current behavior: Healers see FAIL and list of issues
- New behavior: Healers see FAIL/PARTIAL/UNCERTAIN and confidence assessment
- **Compatibility:** IMPROVED - More information helps healers prioritize
- **No code changes needed:** Healers already read free-text reports

**Integration 3: Ivalidator → Integrators**
- How they connect: Ivalidator reports PASS/FAIL, integrators proceed or iterate
- Current behavior: PASS → proceed to validation, FAIL → integration round 2
- New behavior: PASS → proceed, UNCERTAIN/PARTIAL → proceed with notes, FAIL → round 2
- **Breaking change risk:** MEDIUM - Orchestration logic may need update
- **Mitigation:** UNCERTAIN/PARTIAL treated as "proceed with caution" (same as PASS)

### External Dependencies

None. This is a self-contained agent prompt modification.

### Orchestration Impact

**Potential orchestration logic changes needed:**

**Current logic (pseudocode from 2l-mvp.md):**
```bash
if grep "Status: PASS" validation-report.md; then
  echo "Validation passed"
  exit 0
elif grep "Status: FAIL" validation-report.md; then
  echo "Validation failed, starting healing"
  start_healing_phase
fi
```

**Updated logic needed:**
```bash
STATUS=$(grep "^## Status" validation-report.md | grep -o "PASS\|UNCERTAIN\|PARTIAL\|INCOMPLETE\|FAIL")

case "$STATUS" in
  PASS)
    echo "✅ Validation passed with high confidence"
    exit 0
    ;;
  UNCERTAIN|PARTIAL)
    echo "⚠️ Validation passed with reservations ($STATUS)"
    echo "Review validation-report.md for details"
    exit 0  # Proceed but log uncertainty
    ;;
  INCOMPLETE)
    echo "⚠️ Validation incomplete (missing tools/information)"
    echo "Review validation-report.md for missing components"
    exit 0  # Proceed but log incompleteness
    ;;
  FAIL)
    echo "❌ Validation failed, starting healing phase"
    start_healing_phase
    ;;
esac
```

**Note:** This orchestration change is **NOT** part of Iteration 2 scope (validator changes only). Document as future enhancement or include in Iteration 3.

## Risks & Challenges

### Technical Risks

**Risk 1: Validators Don't Adopt Honest Reporting**
- **Impact:** New statuses available but validators continue using binary PASS/FAIL
- **Likelihood:** MEDIUM (cultural change requires explicit guidance)
- **Mitigation:**
  - Add prominent "Honesty Over Optimism" section at top of agent prompts
  - Provide 5+ concrete examples showing when to use each status
  - Include decision tree for status selection
  - Add reminder in report template: "Use UNCERTAIN if <80% confident"

**Risk 2: Status Proliferation Confuses Users**
- **Impact:** 5 statuses instead of 2 makes reports harder to interpret
- **Likelihood:** LOW (statuses are intuitive: PASS, FAIL, and 3 "in-between" states)
- **Mitigation:**
  - Use emoji markers (✅ ⚠️ ❌) for visual clarity
  - Group statuses: PASS (good), FAIL (bad), UNCERTAIN/PARTIAL/INCOMPLETE (proceed with caution)
  - Include "Confidence Rationale" explaining what each status means for this report

**Risk 3: Orchestration Breaks on New Statuses**
- **Impact:** Orchestration expects PASS/FAIL, crashes on UNCERTAIN
- **Likelihood:** MEDIUM (depends on how orchestration parses status)
- **Mitigation:**
  - Test orchestration status parsing with all 5 statuses
  - Update orchestration to handle new statuses (may be Iteration 3 scope)
  - Backward compatible: Treat UNCERTAIN/PARTIAL as "conditional PASS" initially

### Complexity Risks

**Risk 4: Confidence Calculation Too Subjective**
- **Impact:** Two validators assess same codebase, report different confidence levels
- **Likelihood:** MEDIUM (confidence inherently subjective without strict formula)
- **Mitigation:**
  - Provide confidence calculation framework (weighted check importance)
  - Use 80% rule as objective threshold
  - Emphasize: Confidence is validator's honest assessment, not mathematical precision
  - Examples show subjective reasoning, normalizing variability

**Risk 5: Reports Become Too Long**
- **Impact:** Adding confidence sections doubles report length
- **Likelihood:** LOW (most additions are structured, not verbose)
- **Mitigation:**
  - Keep confidence rationale to 2-3 sentences
  - Use bulleted lists for "What We Know" sections
  - Tripartite confidence reporting is concise (just categorizes existing checks)

## Recommendations for Planner

1. **Implement Honesty Changes in Two Phases**
   - **Phase 1 (Iteration 2):** Add sections and examples to validator agent prompts (2l-validator.md, 2l-ivalidator.md)
   - **Phase 2 (Future/Iteration 3):** Update orchestration to handle new statuses gracefully
   - **Rationale:** Phase 1 is low-risk (backward compatible - UNCERTAIN treated as PASS). Phase 2 requires orchestration logic changes (higher risk).

2. **Use Template-Based Modification, Not Rewriting**
   - Read existing validator agents
   - Insert new sections without removing existing content
   - Preserve all current validation checks and quality standards
   - **Rationale:** Minimizes risk of breaking existing validation logic. Additive change, not replacement.

3. **Provide 5+ Concrete Examples**
   - Include in agent prompts, not separate documentation
   - Cover common scenarios: MCP unavailable, tests pass but coverage uncertain, partial criteria
   - Show both "optimistic" and "honest" report for each scenario
   - **Rationale:** Examples teach pattern better than abstract guidance. Validators learn by comparing.

4. **Add Prominent "Honesty Over Optimism" Section**
   - Place near top of validator agent prompts (after "Your Mission", before "Your Process")
   - Include 80% confidence rule explicitly
   - Use bold/emphasis to highlight importance
   - **Rationale:** Cultural change requires explicit permission and encouragement to report uncertainty.

5. **Create Decision Tree for Status Selection**
   - Visual flowchart or numbered decision process
   - Helps validator quickly determine correct status
   - Include in both 2l-validator.md and 2l-ivalidator.md
   - **Rationale:** Reduces cognitive load, ensures consistency across validation reports.

6. **Update Report Templates Incrementally**
   - Add confidence fields without removing existing fields
   - Old fields remain for backward compatibility
   - New fields enhance information without breaking parsers
   - **Rationale:** Graceful enhancement, not disruptive redesign.

7. **Document Orchestration Impact for Future Work**
   - Create note in iteration 2 report: "Orchestration may need updates to handle UNCERTAIN/PARTIAL/INCOMPLETE"
   - Defer orchestration changes to iteration 3 or post-MVP
   - Initial behavior: Treat UNCERTAIN/PARTIAL as PASS (proceed with caution)
   - **Rationale:** Decouples validator changes from orchestration changes, reduces iteration 2 scope and risk.

8. **Test with Real Validation Scenarios**
   - After agent prompts updated, run validation on test project
   - Verify validator uses new statuses appropriately
   - Check that reports include confidence rationale
   - **Rationale:** Validation of the validation system ensures guidance is clear and effective.

## Resource Map

### Critical Files/Directories

#### agents/2l-validator.md (MODIFIED)
- **Purpose:** Main validator agent prompt
- **Current size:** 601 lines (from Read tool output)
- **Changes needed:** +150 lines estimated
  - Add "Reporting Standards: Honesty Over Optimism" section (30 lines)
  - Add 80% confidence rule (10 lines)
  - Add status enum definition (15 lines)
  - Add decision framework (40 lines)
  - Add 5 examples of honest vs optimistic reporting (50 lines)
  - Update report template with confidence fields (5 lines scattered)
- **Risk:** LOW (additive changes, no removal of existing guidance)

#### agents/2l-ivalidator.md (MODIFIED)
- **Purpose:** Integration validator agent prompt
- **Current size:** 717 lines (from Read tool output)
- **Changes needed:** +100 lines estimated
  - Add "Honesty in Cohesion Assessment" section (20 lines)
  - Add gray area handling with new statuses (30 lines)
  - Update "When in Doubt" section with UNCERTAIN/PARTIAL/INCOMPLETE (20 lines)
  - Add examples for cohesion uncertainty (25 lines)
  - Update report template with confidence fields (5 lines scattered)
- **Risk:** LOW (extends existing gray area guidance)

### Files NOT Modified (Out of Scope)

**commands/2l-mvp.md** - Orchestration logic
- Would need updates to handle new statuses
- Deferred to Iteration 3 or post-MVP
- Current behavior: UNCERTAIN/PARTIAL treated as PASS (acceptable interim state)

**validation-report.md** (generated files)
- Templates updated in agent prompts
- Actual reports generated by validators using new templates
- No direct file modification needed

### Key Dependencies

**None.** This is a pure agent prompt modification.

**Existing dependencies remain:**
- Bash 4.0+ (for orchestration, unchanged)
- Agent execution environment (unchanged)
- Markdown formatting (unchanged)

### Testing Infrastructure

#### Test 1: Validator Prompt Validation
**Approach:** Verify updated agent prompts are valid and complete
**Method:**
- Check file syntax (valid markdown, no broken formatting)
- Verify all sections present (Honesty section, examples, decision framework)
- Count lines to ensure additions within estimates
**Pass criteria:** Prompts readable, all required sections present

#### Test 2: Example Scenario Testing
**Approach:** Run validator on test project with known characteristics
**Scenarios:**
1. **All checks pass, high confidence** → Should report PASS
2. **Tests pass, MCP unavailable** → Should report INCOMPLETE
3. **10 of 12 criteria met** → Should report PARTIAL
4. **Tests pass, coverage uncertain** → Should report UNCERTAIN
5. **Clear failures detected** → Should report FAIL
**Pass criteria:** Validator uses appropriate status for each scenario

#### Test 3: Report Format Validation
**Approach:** Generate validation reports using new template
**Checks:**
- Status line includes 5 statuses (PASS|UNCERTAIN|PARTIAL|INCOMPLETE|FAIL)
- Confidence level present
- Confidence rationale present
- Tripartite confidence assessment present (What We Know / Uncertain / Couldn't Verify)
**Pass criteria:** All new fields present and populated

#### Test 4: Backward Compatibility
**Approach:** Verify orchestration can still read validation reports
**Method:**
- Generate validation report with PASS status
- Check orchestration parses status correctly
- Repeat with FAIL status
**Pass criteria:** Orchestration continues working with enhanced reports

#### Test 5: Decision Tree Usability
**Approach:** External reviewer (not report author) uses decision tree
**Method:**
- Provide reviewer with validation scenario
- Ask them to use decision tree to select status
- Verify their selection matches expected status
**Pass criteria:** Decision tree leads to correct status choice

## Questions for Planner

### Q1: Should Orchestration Changes Be in Iteration 2 or Deferred?
**Context:** Validator changes are iteration 2 scope. Orchestration handling of new statuses could be iteration 2 or iteration 3.
**Options:**
- **A)** Include in iteration 2 (comprehensive: validators + orchestration together)
- **B)** Defer to iteration 3 (validators only in iteration 2, orchestration in iteration 3)
**Recommendation:** **Option B** - Defer orchestration changes. Validators can start using new statuses immediately. Orchestration treats UNCERTAIN/PARTIAL as PASS initially (safe default). Decouples changes, reduces iteration 2 scope.

### Q2: How Prescriptive Should Confidence Calculation Be?
**Context:** Confidence percentage could be strict formula or subjective judgment.
**Options:**
- **A)** Strict formula: (checks_passed / total_checks) * importance_weights
- **B)** Guided judgment: Framework provided, validator uses professional judgment
**Recommendation:** **Option B** - Guided judgment. Provide framework and examples, but allow validator discretion. Confidence is inherently contextual - strict formula can't capture all nuances.

### Q3: Should UNCERTAIN and PARTIAL Be Distinct or Merged?
**Context:** Vision.md defines both. Could simplify to 4 statuses instead of 5.
**Options:**
- **A)** Keep separate: UNCERTAIN (doubts), PARTIAL (incomplete progress)
- **B)** Merge into single "WARNING" status
**Recommendation:** **Option A** - Keep separate. They represent different situations:
- UNCERTAIN = "Checks passed but I'm not sure they're comprehensive"
- PARTIAL = "Some checks passed, others didn't"
User needs this distinction to make informed decisions.

### Q4: Should Examples Be in Agent Prompts or Separate Documentation?
**Context:** Examples are lengthy (5 scenarios × 2 reports each = ~50 lines)
**Options:**
- **A)** Inline in agent prompts (accessible during validation)
- **B)** Separate docs/examples.md file (keeps prompts concise)
**Recommendation:** **Option A** - Inline in agent prompts. Validators reference examples during validation work. Having them in-prompt reduces context switching.

### Q5: Should Gray Area Thresholds Be Explicit or Implicit?
**Context:** When exactly is 70% confidence UNCERTAIN vs 75% PARTIAL vs 80% PASS?
**Options:**
- **A)** Explicit thresholds: >80% PASS, 60-80% UNCERTAIN, <60% PARTIAL
- **B)** Implicit guidance: "Use UNCERTAIN when moderately confident"
**Recommendation:** **Option A** - Explicit thresholds. 80% rule is already explicit for PASS. Extend to other statuses for consistency. Validators appreciate concrete numbers.

### Q6: How Should Confidence Be Represented?
**Context:** Confidence could be percentage, category (HIGH/MEDIUM/LOW), or both
**Options:**
- **A)** Percentage only: "Confidence: 75%"
- **B)** Category only: "Confidence: MEDIUM"
- **C)** Both: "Confidence: MEDIUM (75%)"
**Recommendation:** **Option C** - Both. Category is human-friendly. Percentage is precise. Together they provide clarity without ambiguity.

### Q7: Should Ivalidator Use Same Statuses as Validator?
**Context:** Ivalidator validates integration cohesion. Validator validates production readiness.
**Options:**
- **A)** Same 5 statuses for both (consistency)
- **B)** Different statuses for ivalidator (specialized vocabulary)
**Recommendation:** **Option A** - Same statuses. Cohesion validation has same uncertainty needs:
- PASS = Cohesion excellent
- UNCERTAIN = Cohesion good but some gray areas
- PARTIAL = Most checks pass, some cohesion issues
- INCOMPLETE = Can't determine cohesion (missing info)
- FAIL = Clear cohesion problems

### Q8: Should Orchestration Distinguish UNCERTAIN from PARTIAL?
**Context:** When orchestration is updated (iteration 3), how should it treat different ⚠️ statuses?
**Options:**
- **A)** All ⚠️ statuses treated equally (proceed with caution)
- **B)** Different handling: UNCERTAIN proceed, PARTIAL request review, INCOMPLETE block
**Recommendation:** **Option A** for iteration 2/3 - Treat equally as "proceed with caution". Option B could be future enhancement once we have data on how often each status occurs and what outcomes result.

---

**Exploration completed:** 2025-10-03

**Key Takeaways:**
1. Honest validation is a **cultural change**, not a technical one - we're giving validators permission and tools to report uncertainty
2. The **80% confidence rule** is the core principle - anything below 80% confidence in PASS should use UNCERTAIN or PARTIAL
3. **5 statuses** (PASS, UNCERTAIN, PARTIAL, INCOMPLETE, FAIL) cover the validation outcome spectrum without being overwhelming
4. **Examples teach better than rules** - include 5+ concrete scenarios showing honest vs optimistic reporting
5. **Template-based modification** is safest approach - add sections to existing validators, don't rewrite
6. **Orchestration changes deferred** to iteration 3 - validators can use new statuses immediately, orchestration treats ⚠️ as "proceed with caution"
7. **Zero external dependencies** - purely agent prompt text changes
8. **Estimated 3-4 hours** total implementation time across both validator agents

This exploration provides complete foundation for implementing honest validation reporting in iteration 2.
