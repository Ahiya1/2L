# Integration Plan - Round 1

**Created:** 2025-11-27T03:30:00Z
**Iteration:** plan-9/iteration-8
**Total builders to integrate:** 4

---

## Executive Summary

This integration brings together four builders that implement the self-improvement foundation for the 2L framework. All builders completed successfully with clean separation of concerns and no file conflicts. The integration is straightforward with two independent zones that can be merged in parallel.

Key insights:
- Builder-1 successfully discovered and documented the Task spawning pattern (critical unknown resolved)
- All file modifications occur in separate line ranges (zero merge conflicts expected)
- Two completely independent integration zones (Builder-1/2 for exploration, Builder-3/4 for lifecycle)
- All builders followed patterns.md consistently and comprehensively
- Testing is 100% passing across all builders (12 lifecycle tests + 6 smoke tests + unit tests)

---

## Builders to Integrate

### Primary Builders
- **Builder-1:** Task Spawning Infrastructure - Status: COMPLETE
- **Builder-2:** Vision Enhancement - Status: COMPLETE
- **Builder-3:** Pattern Lifecycle Manager - Status: COMPLETE
- **Builder-4:** Lifecycle Integration & Smoke Tests - Status: COMPLETE

### Sub-Builders
None - Builder-1 did not split (Task spawning complexity manageable)

**Total outputs to integrate:** 4

---

## Integration Zones

### Zone 1: Exploration System (Real Task Spawning + Vision Enhancement)

**Builders involved:** Builder-1, Builder-2

**Conflict type:** Dependency coordination

**Risk level:** LOW

**Description:**
Builder-1 implements real Task agent spawning for the exploration phase in `/2l-improve`, replacing placeholder code with actual parallel explorer execution. Builder-2 enhances the vision generator to read exploration reports and incorporate findings into visions. These builders work together to create the complete exploration-to-vision pipeline.

**Files affected:**
- `commands/2l-improve.md` - Builder-1 modifies lines 357-523, 560-565, 574-579 (exploration spawning + vision call)
- `lib/2l-vision-generator.py` - Builder-2 adds exploration report reading (~60 new lines)
- `templates/improvement-vision.md` - Builder-2 adds exploration context section (3 lines)
- `docs/task-spawning-pattern.md` - Builder-1 creates documentation (NEW FILE)

**Integration strategy:**

1. **Verify Builder-1's exploration spawning code:**
   - Check Task spawning markdown syntax is correct
   - Verify all 3 explorers spawn with proper prompts
   - Confirm synchronization loop logic (5-min timeout, file polling)
   - Validate event emissions (exploration_start, agent_spawn x3, exploration_complete)

2. **Verify Builder-2's vision enhancement:**
   - Check `--exploration-dir` parameter added to CLI
   - Verify `_read_exploration_reports()` function implemented
   - Verify `_extract_key_sections()` function implemented
   - Confirm graceful degradation (missing reports handled)
   - Check template has `{EXPLORATION_CONTEXT}` placeholder

3. **Integration dependency:**
   - Builder-1's `/2l-improve` line 565 passes `--exploration-dir` to vision generator
   - Builder-2's vision generator must accept this parameter
   - **Verification:** Both sides of the integration match (parameter name, path structure)

4. **Test combined functionality:**
   - Builder-1 spawns explorers → generates reports in exploration_dir
   - Builder-2 reads reports from exploration_dir → incorporates into vision
   - End-to-end: `/2l-improve` creates vision with "Exploration Findings" section

**Expected outcome:**
The `/2l-improve` command will spawn real Task agents for exploration, wait for their reports, then generate an improvement vision incorporating architectural context, technology patterns, and integration guidance from the explorer analysis.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW

---

### Zone 2: Pattern Lifecycle System (State Machine + Integration)

**Builders involved:** Builder-3, Builder-4

**Conflict type:** Dependency coordination

**Risk level:** LOW

**Description:**
Builder-3 implements the pattern lifecycle manager utility with state machine validation, atomic YAML updates, and JSONL audit trail. Builder-4 integrates this utility into `/2l-improve` and creates a smoke test suite for post-modification validation. These builders work together to enable automatic pattern status tracking through the lifecycle.

**Files affected:**
- `lib/2l-pattern-lifecycle.py` - Builder-3 creates utility (~270 lines, NEW FILE)
- `lib/test-pattern-lifecycle.sh` - Builder-3 creates tests (~80 lines, NEW FILE)
- `commands/2l-improve.md` - Builder-4 modifies lines 963-1016 (lifecycle integration)
- `lib/2l-smoke-tests.sh` - Builder-4 creates tests (~120 lines, NEW FILE)

**Integration strategy:**

1. **Verify Builder-3's lifecycle manager:**
   - Check state machine validation (VALID_TRANSITIONS dict)
   - Verify atomic YAML writes (temp-file-and-rename pattern)
   - Confirm backup creation (`.bak` file before write)
   - Check JSONL audit trail (appends to global-learnings.jsonl)
   - Validate CLI interface (update, get-status, list commands)
   - Run test suite: `bash lib/test-pattern-lifecycle.sh` (12 tests must pass)

2. **Verify Builder-4's smoke tests:**
   - Check 6 tests implemented (event logging, pattern detector, symlinks, commands, agents, Python deps)
   - Verify graceful degradation (optional features warn, not fail)
   - Confirm exit codes (0=success, 1=test failure)
   - Run test suite: `bash lib/2l-smoke-tests.sh` (6 tests must pass)

3. **Verify Builder-4's lifecycle integration:**
   - Check smoke tests execute BEFORE pattern status update
   - Verify lifecycle manager called with correct parameters (pattern_id, status, plan_id, iteration)
   - Confirm `pattern_implemented` event emission on success
   - Check rollback recommendation on smoke test failure (exit 2)
   - Validate error handling (non-fatal lifecycle update failures)

4. **Integration dependency:**
   - Builder-4's `/2l-improve` calls Builder-3's lifecycle manager
   - **Verification:** CLI parameters match (--pattern-id, --status, --plan-id, --iteration)
   - Exit code handling correct (0=success, 1=validation error)

5. **Test combined functionality:**
   - Builder-3 provides lifecycle manager → updates pattern status with validation
   - Builder-4 calls lifecycle manager → pattern IDENTIFIED → IMPLEMENTED
   - Smoke tests validate framework health → prevents broken self-modification
   - Events emitted throughout → observability maintained

**Expected outcome:**
The `/2l-improve` command will run smoke tests after successful iteration completion, then update pattern status to IMPLEMENTED with full audit trail, enabling tracking of pattern lifecycle from identification through verification.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW

---

## Independent Features (Direct Merge)

These builder outputs have no conflicts and can be merged directly:

- **Builder-1:** Task spawning documentation (`docs/task-spawning-pattern.md`) - Independent reference file
- **Builder-3:** Test suite (`lib/test-pattern-lifecycle.sh`) - Standalone validation script

**Assigned to:** Integrator-1 (quick merge alongside zone work)

---

## Parallel Execution Groups

### Group 1 (Parallel)
- **Integrator-1:** Zone 1 (Exploration System) + Zone 2 (Lifecycle System) + Independent features

**Rationale:** Single integrator sufficient because:
- Total of 2 zones, both LOW complexity
- No conflicts between zones (completely independent)
- No dependencies between zones (can be tested separately)
- File modifications are in separate areas of codebase
- Estimated integration time: 30-45 minutes total

### Group 2 (Sequential - Not needed)
No sequential work required. All zones are independent.

---

## Integration Order

**Recommended sequence:**

1. **Zone 2: Pattern Lifecycle System** (15-20 minutes)
   - Merge Builder-3's lifecycle manager utility
   - Merge Builder-3's test suite
   - Merge Builder-4's smoke test suite
   - Merge Builder-4's `/2l-improve` lifecycle integration
   - Run lifecycle manager tests (12 tests)
   - Run smoke tests (6 tests)
   - Verify: All tests passing

2. **Zone 1: Exploration System** (15-20 minutes)
   - Merge Builder-1's `/2l-improve` exploration spawning
   - Merge Builder-1's task spawning documentation
   - Merge Builder-2's vision generator enhancement
   - Merge Builder-2's template updates
   - Verify: Bash syntax valid
   - Verify: Python syntax valid
   - Verify: Parameter integration correct

3. **Final consistency check** (5-10 minutes)
   - Run full smoke test suite
   - Verify event logger accessible
   - Check symlink integrity
   - Validate all command files
   - Verify no file conflicts remain

**Total estimated time:** 35-50 minutes

**Why this order:**
- Zone 2 first because it has comprehensive test suites (can validate immediately)
- Zone 1 second because it builds on Zone 2's passing tests
- Final checks ensure overall integration health

---

## Shared Resources Strategy

### Shared Types
**Issue:** Multiple builders reference pattern metadata fields

**Resolution:**
- Builder-3 defines canonical pattern metadata fields (status, implemented_at, etc.)
- Builder-4 uses these fields in lifecycle integration
- No conflicts: Builder-3 is authoritative source, Builder-4 just calls it

**Responsible:** Integrator-1 in Zone 2

### Shared Utilities
**Issue:** Multiple builders use event logger library

**Resolution:**
- All builders use existing `lib/2l-event-logger.sh` (read-only)
- No modifications to shared library
- Graceful degradation built into all callers

**Responsible:** No action needed (already implemented correctly)

### Configuration Files
**Issue:** Multiple builders modify `/2l-improve.md`

**Resolution:**
- Builder-1: Lines 357-523, 560-565, 574-579 (exploration)
- Builder-4: Lines 963-1016 (lifecycle integration)
- **No overlap:** Clear line range separation, safe to merge both

**Responsible:** Integrator-1 (verify no overlap during merge)

---

## Expected Challenges

### Challenge 1: Task Spawning Syntax Validation
**Impact:** If Task spawning markdown syntax doesn't work, explorers won't spawn
**Mitigation:** Builder-1 validated syntax against existing patterns in codebase
**Responsible:** Integrator-1
**Test:** Grep for "Use Task tool" in integrated `/2l-improve.md`, verify format matches pattern

### Challenge 2: Exploration Directory Path Consistency
**Impact:** Vision generator won't find reports if path mismatches Builder-1's output
**Mitigation:** Both builders use `$exploration_dir` variable from `/2l-improve`
**Responsible:** Integrator-1
**Test:** Verify line 565 passes `--exploration-dir "$exploration_dir"` (matches Builder-2's parameter name)

### Challenge 3: Lifecycle Manager CLI Parameter Mismatch
**Impact:** Pattern status won't update if parameters don't match CLI expectations
**Mitigation:** Builder-4 tested with Builder-3's CLI directly
**Responsible:** Integrator-1
**Test:** Check Builder-4's call matches Builder-3's argparse definition

---

## Success Criteria for This Integration Round

- [ ] All zones successfully resolved
- [ ] No duplicate code remaining
- [ ] All imports resolve correctly
- [ ] Bash files have valid syntax (bash -n)
- [ ] Python files have valid syntax (python3 -m py_compile)
- [ ] Consistent patterns across integrated code
- [ ] No conflicts in shared files
- [ ] All builder functionality preserved
- [ ] Zone 2 tests passing (12 lifecycle + 6 smoke tests)
- [ ] Zone 1 parameter integration verified
- [ ] Event logging functional across all components
- [ ] Documentation complete and accessible

---

## Notes for Integrators

**Important context:**
- Builder-1 made critical breakthrough discovering Task spawning pattern (was unknown risk)
- All builders followed patterns.md comprehensively (high code quality)
- Testing is exceptionally complete (18 automated tests + manual validation)
- No builder split occurred (complexity estimates accurate)

**Watch out for:**
- Line number references in builder reports may shift during merge (use context, not exact line numbers)
- Both zones modify `/2l-improve.md` - verify no overlap before committing
- Event logging must gracefully degrade (don't fail if library missing)

**Patterns to maintain:**
- Reference `patterns.md` for all conventions
- Ensure error handling is consistent
- Keep naming conventions aligned
- Event emission always optional (fire-and-forget)
- Atomic YAML writes for all modifications
- Exit codes: 0=success, 1=validation error, 2=critical failure

---

## Next Steps

1. Spawn Integrator-1 according to execution order
2. Integrator-1 executes Zone 2 (lifecycle system)
3. Integrator-1 executes Zone 1 (exploration system)
4. Integrator-1 performs final consistency check
5. Integrator-1 creates integration report
6. Proceed to ivalidator

---

## File Conflict Analysis

### `/2l-improve.md` Modifications

**Builder-1 changes:**
- Lines 357-523: Exploration phase (167 lines replacing 53 lines) = +114 lines
- Line 565: Add `--exploration-dir` parameter = +1 line
- Lines 574-579: Vision validation = +6 lines
- Total: +121 net lines

**Builder-4 changes:**
- Lines 963-1016: Lifecycle integration (54 lines replacing 22 lines) = +32 lines
- Total: +32 net lines

**Conflict risk:** ZERO
- No line range overlap
- Builder-1 ends at line 579
- Builder-4 starts at line 963
- Clear 384-line gap between modifications

**Integration strategy:**
1. Apply Builder-1 changes first (earlier in file)
2. Apply Builder-4 changes second (later in file, line numbers shift by +121)
3. Adjusted Builder-4 range: Lines 1084-1137 (963+121 to 1016+121)

### Other Files

**No conflicts:**
- `lib/2l-vision-generator.py` - Only Builder-2 modifies
- `templates/improvement-vision.md` - Only Builder-2 modifies
- `lib/2l-pattern-lifecycle.py` - Builder-3 creates (NEW)
- `lib/2l-smoke-tests.sh` - Builder-4 creates (NEW)
- `lib/test-pattern-lifecycle.sh` - Builder-3 creates (NEW)
- `docs/task-spawning-pattern.md` - Builder-1 creates (NEW)

---

## Testing Strategy

### Zone 1 Testing (Exploration System)

**Unit tests:**
- Builder-2's vision generator unit tests (all passing)

**Integration tests:**
1. Verify Builder-1's exploration spawning syntax (grep for "Use Task tool")
2. Verify Builder-2's parameter handling (grep for "--exploration-dir")
3. Validate bash syntax: `bash -n commands/2l-improve.md`
4. Validate Python syntax: `python3 -m py_compile lib/2l-vision-generator.py`
5. Test vision generation without exploration (backward compatibility)
6. Test vision generation with mock exploration reports

**End-to-end test (post-integration):**
Run `/2l-improve` with test pattern → verify explorers spawn → verify vision contains exploration context

### Zone 2 Testing (Lifecycle System)

**Unit tests:**
- Builder-3's lifecycle manager tests (12 tests, all passing)
- Builder-4's smoke tests (6 tests, all passing)

**Integration tests:**
1. Run lifecycle manager test suite: `bash lib/test-pattern-lifecycle.sh`
2. Run smoke test suite: `bash lib/2l-smoke-tests.sh`
3. Validate Python syntax: `python3 -m py_compile lib/2l-pattern-lifecycle.py`
4. Validate bash syntax: `bash -n lib/2l-smoke-tests.sh`
5. Test lifecycle manager CLI: `python3 lib/2l-pattern-lifecycle.py --help`
6. Test lifecycle manager integration in `/2l-improve` (manual parameter check)

**End-to-end test (post-integration):**
Mock successful `/2l-mvp` completion → verify smoke tests run → verify pattern status updates → verify events emitted

### Final Integration Tests

1. **Smoke test validation:**
   ```bash
   bash lib/2l-smoke-tests.sh
   # Expected: All 6 tests pass
   ```

2. **Event logging verification:**
   ```bash
   # Check event logger available
   ls -l ~/.claude/lib/2l-event-logger.sh
   # Source and test
   source ~/.claude/lib/2l-event-logger.sh
   log_2l_event "test" "Integration test" "integration" "integrator-1"
   grep "integration_test" .2L/events.jsonl
   ```

3. **Pattern lifecycle verification:**
   ```bash
   # List patterns
   python3 lib/2l-pattern-lifecycle.py list
   # Get status
   python3 lib/2l-pattern-lifecycle.py get-status --pattern-id PATTERN-001
   ```

4. **Vision generator verification:**
   ```bash
   # Test with mock data
   python3 lib/2l-vision-generator.py --help
   # Verify --exploration-dir parameter present
   ```

5. **File syntax validation:**
   ```bash
   bash -n commands/2l-improve.md
   bash -n lib/2l-smoke-tests.sh
   bash -n lib/test-pattern-lifecycle.sh
   python3 -m py_compile lib/2l-vision-generator.py
   python3 -m py_compile lib/2l-pattern-lifecycle.py
   ```

---

## Integration Verification Checklist

### Pre-Integration
- [x] All 4 builders completed successfully
- [x] All builder reports reviewed
- [x] File conflict analysis complete
- [x] Integration zones identified
- [x] Test strategy defined

### Zone 2: Lifecycle System
- [ ] Builder-3 lifecycle manager merged
- [ ] Builder-3 test suite merged
- [ ] Builder-4 smoke tests merged
- [ ] Builder-4 `/2l-improve` integration merged
- [ ] Lifecycle manager tests passing (12/12)
- [ ] Smoke tests passing (6/6)
- [ ] Python syntax valid (both utilities)
- [ ] Bash syntax valid (both test scripts)

### Zone 1: Exploration System
- [ ] Builder-1 exploration spawning merged
- [ ] Builder-1 documentation merged
- [ ] Builder-2 vision enhancement merged
- [ ] Builder-2 template update merged
- [ ] Bash syntax valid (`/2l-improve.md`)
- [ ] Python syntax valid (`2l-vision-generator.py`)
- [ ] Parameter integration verified (--exploration-dir)
- [ ] Vision generator backward compatible

### Final Checks
- [ ] All files syntax validated
- [ ] Smoke tests passing (6/6)
- [ ] Event logging functional
- [ ] Symlinks valid
- [ ] No duplicate code
- [ ] All imports resolve
- [ ] Documentation accessible
- [ ] Git checkpoint created
- [ ] Integration report written

---

## Risk Assessment Summary

### Overall Risk: LOW

**Mitigating factors:**
- Clean file separation (no merge conflicts)
- Comprehensive test coverage (18 automated tests)
- All builders followed patterns.md consistently
- Critical unknown resolved (Task spawning pattern discovered)
- Both zones independent (can fail independently)

**Remaining risks:**
- Task spawning might not work in production (only validated syntactically)
- Explorer quality depends on Claude's analysis (not controllable)
- End-to-end testing limited until full `/2l-improve` run

**Contingency plans:**
- If Task spawning fails: Revert Builder-1 changes, use placeholders temporarily
- If vision enhancement fails: Visions still generate (graceful degradation)
- If lifecycle manager fails: Pattern status can be manually updated
- If smoke tests fail: Framework health already validated pre-integration

---

## Integration Timeline

**Zone 2 (Lifecycle System):** 15-20 minutes
- File merging: 5 minutes
- Test execution: 5 minutes
- Validation: 5-10 minutes

**Zone 1 (Exploration System):** 15-20 minutes
- File merging: 5 minutes
- Syntax validation: 5 minutes
- Parameter verification: 5-10 minutes

**Final checks:** 5-10 minutes
- Smoke tests: 2 minutes
- Event logging: 1 minute
- Documentation review: 2-5 minutes

**Total:** 35-50 minutes

---

## Builder Quality Summary

### Builder-1: EXCELLENT
- Resolved critical unknown (Task spawning pattern)
- Comprehensive documentation created
- Clean code with proper error handling
- Event logging integrated
- Testing thorough (within constraints)

### Builder-2: EXCELLENT
- Backward compatible implementation
- Comprehensive unit testing
- Graceful error handling
- Clear documentation
- Follows all patterns

### Builder-3: EXCELLENT
- Complete state machine implementation
- Atomic operations for safety
- Comprehensive test suite (12 tests, all passing)
- Type hints and docstrings
- CLI interface well-designed

### Builder-4: EXCELLENT
- Comprehensive smoke tests (6 tests)
- Clear integration logic
- Proper error handling with exit codes
- Safety-first approach (tests before status update)
- Clean separation of concerns

**Overall:** All builders delivered high-quality, well-tested, well-documented code following established patterns.

---

**Integration Planner:** 2l-iplanner
**Plan created:** 2025-11-27T03:30:00Z
**Round:** 1
**Zones:** 2 (both LOW complexity)
**Estimated time:** 35-50 minutes
**Confidence:** 95% (high certainty, comprehensive testing, clean separation)
