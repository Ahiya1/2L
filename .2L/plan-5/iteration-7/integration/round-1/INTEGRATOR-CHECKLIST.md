# Integrator-1 Checklist

**Integration Round:** 1
**Plan:** plan-5/iteration-7
**Date:** 2025-11-19
**Estimated Time:** 15-20 minutes

---

## Pre-Integration Setup

- [ ] Read integration-plan.md completely
- [ ] Review INTEGRATION-SUMMARY.md for quick reference
- [ ] Review INTEGRATION-FLOW.md for visual guide
- [ ] Read builder-1-report.md (understand Builder-1 outputs)
- [ ] Read builder-2-report.md (understand Builder-2 outputs)
- [ ] Change directory to meditation space: `cd ~/Ahiya/2L`
- [ ] Check git status: `git status` (expect some modified files)
- [ ] Ensure event logger available (optional): `ls -la ~/.claude/lib/2l-event-logger.sh`

---

## Zone 1: Pattern Detection Infrastructure (10 minutes)

### File Verification
- [ ] Check `lib/2l-pattern-detector.py` exists
- [ ] Check `lib/2l-pattern-detector.py` is executable: `ls -la lib/2l-pattern-detector.py`
- [ ] Check `lib/2l-yaml-helpers.py` exists
- [ ] Verify `lib/2l-yaml-helpers.py` line count: `wc -l lib/2l-yaml-helpers.py` (should be ~340 LOC)
- [ ] Check test data exists: `ls -la .2L/plan-5/iteration-7/building/test-data.yaml`
- [ ] Check integration test exists: `ls -la .2L/plan-5/iteration-7/building/test-improve-dry-run.sh`

### Functional Testing
- [ ] Test pattern detector directly:
  ```bash
  python3 lib/2l-pattern-detector.py \
    --global-learnings .2L/plan-5/iteration-7/building/test-data.yaml \
    --min-occurrences 2 \
    --min-severity medium \
    --output /tmp/patterns.json
  ```
- [ ] Verify pattern detector output:
  ```bash
  cat /tmp/patterns.json
  # Expected: patterns_found: 2
  # Pattern 1: PATTERN-001, impact: 45.0
  # Pattern 2: PATTERN-002, impact: 15.0
  ```
- [ ] Test status updater (non-destructive):
  ```bash
  cp .2L/plan-5/iteration-7/building/test-data.yaml /tmp/test-learnings.yaml
  python3 lib/2l-yaml-helpers.py update_pattern_status \
    --global-learnings /tmp/test-learnings.yaml \
    --pattern-id "PATTERN-001" \
    --status "IMPLEMENTED" \
    --metadata-json '{"implemented_in_plan": "plan-TEST"}'
  ```
- [ ] Verify status update:
  ```bash
  grep -A 5 "PATTERN-001" /tmp/test-learnings.yaml
  # Expected: status: IMPLEMENTED, metadata present
  ```
- [ ] Run Builder-1 integration test:
  ```bash
  bash .2L/plan-5/iteration-7/building/test-improve-dry-run.sh
  # Expected: All tests PASSED
  ```

### Zone 1 Sign-Off
- [ ] All files present and executable
- [ ] Pattern detector finds correct patterns
- [ ] Status updater works atomically
- [ ] Integration test passes
- [ ] No syntax errors detected

**Zone 1 Status:** ☐ PASS / ☐ FAIL (if fail, document issues)

---

## Zone 2: Vision Generation Infrastructure (10 minutes)

### File Verification
- [ ] Check `templates/improvement-vision.md` exists
- [ ] Check `lib/2l-vision-generator.py` exists and is executable
- [ ] Check `lib/verify-symlinks.sh` exists and is executable
- [ ] Check test files exist:
  - [ ] `.2L/plan-5/iteration-7/building/test-orchestrator-exclusion.sh`
  - [ ] `.2L/plan-5/iteration-7/building/test-improve-manual.sh`

### Symlink Verification (CRITICAL)
- [ ] Run symlink verifier:
  ```bash
  bash lib/verify-symlinks.sh
  ```
- [ ] Expected output: "All symlinks valid"
- [ ] If failures detected, follow fix instructions and retry
- [ ] Confirm all symlinks valid before proceeding

### Functional Testing
- [ ] Create test pattern JSON:
  ```bash
  cat > /tmp/test-pattern.json <<'EOF'
  {
    "pattern_id": "PATTERN-TEST",
    "name": "Test pattern for integration",
    "severity": "critical",
    "occurrences": 2,
    "projects": ["test1", "test2"],
    "root_cause": "tsconfig paths not configured",
    "proposed_solution": "Add validation step",
    "source_learnings": ["test-001"],
    "iteration_metadata": {
      "healing_rounds": 1,
      "files_modified": 5,
      "duration_seconds": 1800
    },
    "discovered_in": "plan-TEST",
    "discovered_at": "2025-11-19T00:00:00Z"
  }
  EOF
  ```
- [ ] Test vision generator:
  ```bash
  python3 lib/2l-vision-generator.py \
    --pattern-json /tmp/test-pattern.json \
    --template templates/improvement-vision.md \
    --output /tmp/test-vision.md \
    --plan-id plan-TEST
  ```
- [ ] Verify vision output:
  ```bash
  head -50 /tmp/test-vision.md
  # Expected: Valid markdown, pattern name visible, no {PLACEHOLDERS}
  ```
- [ ] Check for unreplaced placeholders:
  ```bash
  grep -E '\{[A-Z_]+\}' /tmp/test-vision.md
  # Expected: No matches (or only in code blocks)
  ```
- [ ] Run orchestrator exclusion test:
  ```bash
  bash .2L/plan-5/iteration-7/building/test-orchestrator-exclusion.sh
  # Expected: All tests passed
  ```
- [ ] Run manual mode integration test:
  ```bash
  bash .2L/plan-5/iteration-7/building/test-improve-manual.sh
  # Expected: All tests PASSED
  ```

### Zone 2 Sign-Off
- [ ] All files present and executable
- [ ] Symlinks verified valid
- [ ] Vision generator creates valid markdown
- [ ] All placeholders replaced
- [ ] Orchestrator exclusion works
- [ ] Manual mode test passes
- [ ] No syntax errors detected

**Zone 2 Status:** ☐ PASS / ☐ FAIL (if fail, document issues)

---

## Zone 3: Command Integration (5 minutes)

### File Verification
- [ ] Check `commands/2l-improve.md` exists and is executable
- [ ] Verify line count:
  ```bash
  wc -l commands/2l-improve.md
  # Expected: 776 lines (Builder-1: 450 + Builder-2: 320 + 6 lines overhead)
  ```
- [ ] Check file is executable:
  ```bash
  ls -la commands/2l-improve.md
  # Expected: -rwxr-xr-x (executable bit set)
  ```

### Integration Verification
- [ ] Read commands/2l-improve.md (quick scan)
- [ ] Verify Builder-1 sections present:
  - [ ] Lines 1-68: Argument parsing, event logger setup
  - [ ] Lines 69-265: Pattern detection, selection
  - [ ] Lines 355-501: Confirmation workflow
- [ ] Verify Builder-2 sections present:
  - [ ] Lines 267-327: Vision generation
  - [ ] Lines 502-776: Self-modification orchestration
- [ ] Check for duplicate functions:
  ```bash
  grep -n "^function\|^[a-z_]*() {" commands/2l-improve.md
  # Review output for duplicates (should be none)
  ```
- [ ] Check for unreplaced placeholders:
  ```bash
  grep -i "builder-[12]:" commands/2l-improve.md
  # Expected: No matches (all placeholders filled)
  ```

### Functional Testing
- [ ] Test help message:
  ```bash
  /2l-improve --help
  # Expected: Usage information displayed
  ```
- [ ] Test dry-run mode (Builder-1 functionality):
  ```bash
  cp .2L/plan-5/iteration-7/building/test-data.yaml .2L/global-learnings.yaml
  /2l-improve --dry-run
  # Expected: Pattern detection, dry-run summary, exit 0
  ```
- [ ] Test manual mode (Builder-2 functionality):
  ```bash
  /2l-improve --manual
  # Expected: Vision generated to .2L/plan-6/vision.md (or next plan)
  ```
- [ ] Verify vision created:
  ```bash
  ls -la .2L/plan-*/vision.md
  cat .2L/plan-*/vision.md | head -30
  # Expected: Valid markdown, pattern name visible
  ```
- [ ] Cleanup test artifacts:
  ```bash
  git restore .2L/global-learnings.yaml
  rm -rf .2L/plan-6/  # Or whichever plan was created
  ```

### Zone 3 Sign-Off
- [ ] Command file has both builder sections
- [ ] No duplicate code detected
- [ ] No unreplaced placeholders
- [ ] Help message works
- [ ] Dry-run mode works (Builder-1)
- [ ] Manual mode works (Builder-2)
- [ ] Vision created successfully
- [ ] No syntax errors

**Zone 3 Status:** ☐ PASS / ☐ FAIL (if fail, document issues)

---

## Final Verification (5 minutes)

### Event Emission Check (Optional)
- [ ] Check if event logger available:
  ```bash
  ls -la ~/.claude/lib/2l-event-logger.sh
  ```
- [ ] If available, check for events:
  ```bash
  tail -30 .2L/events.jsonl | grep 2l-improve
  # Expected: command_start, pattern_detection, vision_generated, etc.
  ```
- [ ] If unavailable, confirm graceful degradation (command still works)

### Regression Testing
- [ ] Test existing 2L commands still work:
  ```bash
  # Quick smoke test (if time allows)
  /2l-mvp --help  # Should still work
  ```

### Code Quality Check
- [ ] Check for critical TODOs:
  ```bash
  grep -r "TODO\|FIXME\|XXX" commands/2l-improve.md lib/2l-pattern-detector.py lib/2l-vision-generator.py
  # Review any found (critical TODOs should be resolved)
  ```
- [ ] Check for syntax errors (Bash):
  ```bash
  bash -n commands/2l-improve.md
  bash -n lib/verify-symlinks.sh
  # Expected: No output (no syntax errors)
  ```
- [ ] Check for syntax errors (Python):
  ```bash
  python3 -m py_compile lib/2l-pattern-detector.py
  python3 -m py_compile lib/2l-vision-generator.py
  # Expected: No output (no syntax errors)
  ```

### Git Status
- [ ] Check git status:
  ```bash
  git status
  # Expected: Modified and new files visible
  ```
- [ ] Verify no unexpected changes:
  ```bash
  git diff --stat
  # Review changes (should match builder outputs)
  ```

---

## Integration Report Creation (2 minutes)

- [ ] Create integrator-1-report.md:
  ```bash
  cat > .2L/plan-5/iteration-7/integration/round-1/integrator-1-report.md <<'EOF'
  # Integrator-1 Report

  ## Status
  COMPLETE

  ## Integration Summary
  - Zone 1: Pattern Detection Infrastructure ✅
  - Zone 2: Vision Generation Infrastructure ✅
  - Zone 3: Command Integration ✅

  ## Files Integrated
  - [x] lib/2l-pattern-detector.py (155 LOC, NEW)
  - [x] lib/2l-yaml-helpers.py (+104 LOC, EXTENDED)
  - [x] lib/2l-vision-generator.py (163 LOC, NEW)
  - [x] lib/verify-symlinks.sh (103 LOC, NEW)
  - [x] templates/improvement-vision.md (173 LOC, NEW)
  - [x] commands/2l-improve.md (776 LOC, MERGED)

  ## Tests Executed
  - [x] test-improve-dry-run.sh - PASSED
  - [x] test-orchestrator-exclusion.sh - PASSED
  - [x] test-improve-manual.sh - PASSED
  - [x] Manual dry-run test - PASSED
  - [x] Manual vision generation test - PASSED
  - [x] Symlink verification - PASSED

  ## Conflicts Resolved
  None. No conflicts detected.

  ## Issues Found
  (None if all tests passed, otherwise list here)

  ## Integration Time
  Actual: XX minutes (Estimated: 15-20 minutes)

  ## Notes
  (Any observations or recommendations)

  ## Next Steps
  - Proceed to ivalidator for final validation
  - Run comprehensive test suite
  - Validate with real pattern data (if available)

  **Integration Status:** COMPLETE ✅
  **Date:** 2025-11-19
  **Integrator:** Integrator-1
  EOF
  ```
- [ ] Edit report with actual times and any issues found
- [ ] Review report for completeness

---

## Final Sign-Off

### Integration Success Criteria
- [ ] All 3 zones verified successfully
- [ ] All builder tests pass
- [ ] End-to-end tests pass
- [ ] No conflicts detected
- [ ] No syntax errors
- [ ] Integration report created
- [ ] Ready for validation phase

### Overall Integration Status
- [ ] ✅ COMPLETE - All zones integrated successfully
- [ ] ⚠️  COMPLETE WITH NOTES - Minor issues documented
- [ ] ❌ FAILED - Critical issues found (requires healing)

**Integration Round 1:** ☐ SUCCESS / ☐ FAILED

---

## Next Steps After Integration

If integration SUCCESSFUL:
1. [ ] Review integrator-1-report.md for completeness
2. [ ] Update .2L/config.yaml (if orchestrator doesn't do automatically):
   ```yaml
   iteration-7:
     status: VALIDATION  # Change from INTEGRATION
   ```
3. [ ] Notify orchestrator: Integration complete, ready for ivalidator
4. [ ] Proceed to validation phase

If integration FAILED:
1. [ ] Document all failures in integrator-1-report.md
2. [ ] Identify root cause (builder error? integration error?)
3. [ ] Recommend healing strategy (what needs to be fixed?)
4. [ ] Notify orchestrator: Integration failed, requires healing
5. [ ] Wait for healer to fix issues, then re-integrate

---

## Troubleshooting Guide

### Problem: Symlink verification fails
**Solution:**
```bash
# Check which symlinks are broken
ls -la ~/.claude/

# Fix broken symlinks
ln -sf ~/Ahiya/2L/agents ~/.claude/agents
ln -sf ~/Ahiya/2L/commands ~/.claude/commands
ln -sf ~/Ahiya/2L/lib ~/.claude/lib
ln -sf ~/Ahiya/2L/templates ~/.claude/templates

# Re-run verification
bash lib/verify-symlinks.sh
```

### Problem: Pattern detector returns wrong count
**Solution:**
- Check test-data.yaml format (should match global-learnings.yaml schema)
- Verify min_occurrences and min_severity thresholds
- Review builder-1-report.md for expected results

### Problem: Vision has unreplaced placeholders
**Solution:**
- Check vision generator implementation (should be tested by Builder-2)
- Verify pattern JSON has all required fields
- Review builder-2-report.md for known issues

### Problem: /2l-improve command not found
**Solution:**
```bash
# Check if command exists
ls -la commands/2l-improve.md

# Check if executable
chmod +x commands/2l-improve.md

# Check if symlinked
ls -la ~/.claude/commands/2l-improve.md

# Re-create symlink if needed
ln -sf ~/Ahiya/2L/commands ~/.claude/commands
```

### Problem: Tests fail with Python errors
**Solution:**
- Check Python version: `python3 --version` (should be 3.8+)
- Check PyYAML installed: `python3 -c "import yaml"` (from iteration 1)
- Review builder reports for dependencies

### Problem: Event logging errors
**Solution:**
- This is expected if event logger unavailable
- Verify graceful degradation: command should still work
- Check EVENT_LOGGING_ENABLED checks in code

---

## Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Pre-integration setup | 2 min | ___ min | |
| Zone 1 verification | 10 min | ___ min | |
| Zone 2 verification | 10 min | ___ min | |
| Zone 3 verification | 5 min | ___ min | |
| Final verification | 5 min | ___ min | |
| Report creation | 2 min | ___ min | |
| **Total** | **34 min** | **___ min** | |

**Efficiency:** ___% (Actual / Estimated × 100)

---

## Notes Section

**Observations during integration:**
(Use this space for any notes, observations, or recommendations)

**Issues encountered:**
(List any issues, even minor ones)

**Recommendations for future iterations:**
(Any suggestions for improving the integration process)

---

**Checklist created by:** 2l-iplanner
**Date:** 2025-11-19
**Integration round:** 1
**Total checklist items:** 100+ (comprehensive verification)
