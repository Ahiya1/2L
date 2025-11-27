# 2L Iteration Plan - Self-Improvement Foundation

## Project Vision

Building the foundation for complete meta-circular self-improvement by implementing real exploration in `/2l-improve` and establishing safe pattern lifecycle management. This iteration transforms the `/2l-improve` command from generating placeholder reports to spawning actual Task agents that analyze the 2L codebase architecture, enabling informed improvement decisions.

**Core Problem:** Lines 358-410 of `/2l-improve` create static placeholder files instead of real exploration, causing improvement visions to lack architectural context and integration guidance.

**Solution:** Spawn 3 parallel Task agents (explorers) that analyze the meditation space (`~/Ahiya/2L`), providing detailed reports on architecture, technology patterns, and specific modification points. Combine with pattern lifecycle tracking to monitor implementation success.

## Success Criteria

The MVP is successful when all criteria are met:

### Feature 1: Real Exploration Phase
- [ ] Lines 358-410 of `/2l-improve` spawn 3 Task agents (not placeholders)
- [ ] Explorer-1 analyzes 2L agent architecture and orchestration patterns
- [ ] Explorer-2 analyzes technology stack (bash, Python, YAML, events)
- [ ] Explorer-3 performs pattern-specific analysis with exact file/function targets
- [ ] All 3 exploration reports contain real analysis (no "Placeholder..." text)
- [ ] Reports generated before vision creation with proper wait synchronization
- [ ] Events emitted: `exploration_start`, `agent_spawn` x3, `exploration_complete`

### Feature 4: Pattern Lifecycle Management (BASIC)
- [ ] `lib/2l-pattern-lifecycle.py` utility created with state machine validation
- [ ] Pattern status transitions: IDENTIFIED → IMPLEMENTED (after `/2l-mvp` success)
- [ ] State validation prevents invalid transitions (e.g., IDENTIFIED → VERIFIED)
- [ ] Atomic YAML updates prevent corruption during status changes
- [ ] Events emitted: `pattern_implemented`
- [ ] Integration hook in `/2l-improve` calls lifecycle manager post-completion

### Safety Infrastructure
- [ ] Git safety checkpoint created before any self-modification
- [ ] Orchestrator exclusion enforced (`commands/2l-mvp.md` never modified)
- [ ] Symlink integrity validated before and after changes
- [ ] Smoke tests validate 2L functionality after self-modification
- [ ] Rollback capability via git tags

### Vision Enhancement
- [ ] `lib/2l-vision-generator.py` reads exploration reports
- [ ] Vision template includes {EXPLORATION_CONTEXT} section
- [ ] Generated visions contain architectural context from explorer-1
- [ ] Generated visions contain technology patterns from explorer-2
- [ ] Generated visions contain integration guidance from explorer-3
- [ ] Graceful degradation if exploration reports missing

## MVP Scope

### In Scope

**Feature 1: Real Exploration Phase (COMPLETE)**
- Task tool spawning from bash script (lines 358-410 replacement)
- 3 parallel explorer agents analyzing meditation space architecture
- Wait synchronization ensuring all explorers complete before proceeding
- Event logging for exploration phase lifecycle
- Report validation between exploration and vision generation
- Exploration context file creation with pattern details
- Vision generator enhancement to incorporate exploration findings

**Feature 4: Pattern Lifecycle Management (BASIC transitions only)**
- State machine: IDENTIFIED → IMPLEMENTED
- Python utility: `lib/2l-pattern-lifecycle.py`
- CLI interface: `update-status`, validation, atomic writes
- Integration hook in `/2l-improve` (post-`/2l-mvp` completion)
- Dual storage: YAML (current state) + JSONL (audit trail)
- Event emission for `pattern_implemented`
- File locking to prevent concurrent update corruption

**Safety Infrastructure**
- Git checkpoint pattern (already exists, verify still works)
- Orchestrator exclusion validation (already exists, verify still works)
- Symlink verification (already exists, verify still works)
- Smoke test suite creation (`lib/2l-smoke-tests.sh`)

**Vision Enhancement**
- Exploration report reading in vision generator
- Template updates with exploration context sections
- Graceful handling of missing exploration data

### Out of Scope (Post-MVP)

**Advanced Pattern Lifecycle (Iteration 3)**
- IMPLEMENTED → VERIFIED transition (3-iteration verification window)
- IMPLEMENTED → REGRESSED transition (recurrence detection)
- Automated verification monitoring
- Regression alerts

**Automatic Reflection Creation (Iteration 2)**
- Reflection generation in `/2l-mvp` after iterations
- Reflection aggregation into patterns
- Learning accumulation system

**Quality Enhancements**
- Fuzzy pattern matching for recurrence detection
- Configurable similarity thresholds
- Pattern recurrence analytics
- Multi-pattern improvements
- Interactive pattern selection

## Development Phases

1. **Exploration** ✅ Complete
   - Explorer-1: Architecture analysis (agents, commands, orchestration)
   - Explorer-2: Technology patterns (bash, Python, YAML, events)
   - Explorer-3: Complexity assessment and precise file modifications

2. **Planning** 🔄 Current
   - Synthesizing 3 explorer reports into actionable plan
   - Breaking work into builder tasks
   - Establishing code patterns and conventions
   - Documenting integration strategy

3. **Building** ⏳ 7-9 hours (2-4 builders)
   - Builder-1: Task spawning infrastructure (HIGH complexity)
   - Builder-2: Vision enhancement (MEDIUM complexity)
   - Builder-3: Pattern lifecycle manager (MEDIUM complexity)
   - Builder-4: Lifecycle integration (LOW complexity)
   - Potential sub-builders if Task spawning proves VERY HIGH complexity

4. **Integration** ⏳ 30-45 minutes
   - Merge builder outputs
   - Resolve conflicts (minimal expected)
   - End-to-end smoke tests

5. **Validation** ⏳ 20-30 minutes
   - Test exploration phase with real pattern
   - Verify explorer reports contain analysis
   - Test pattern lifecycle transitions
   - Validate safety mechanisms (rollback, exclusion)

6. **Deployment** ⏳ Final
   - Already in meditation space (no deployment needed)
   - Verification that 2L commands still work

## Timeline Estimate

**Exploration:** Complete (3 reports generated)

**Planning:** Complete (this document + 3 supporting files)

**Building Phase:**
- Builder-1 (Task spawning): 3-4 hours (HIGH risk, VERY HIGH complexity)
  - Research Task tool API: 1 hour
  - Prototype Explorer 1: 1.5 hours
  - Apply to Explorers 2-3: 1 hour
  - Testing: 0.5 hours
- Builder-2 (Vision enhancement): 1.5 hours
- Builder-3 (Pattern lifecycle): 2 hours
- Builder-4 (Integration): 1 hour
- **Total Building:** 7.5-8.5 hours

**Integration:** 30-45 minutes
- Merge outputs from 4 builders
- Smoke test execution
- Conflict resolution (if any)

**Validation:** 20-30 minutes
- End-to-end test with PATTERN-001
- Verify explorer reports quality
- Test lifecycle state transitions
- Safety mechanism verification

**Total Estimated Time:** 8-10 hours (single iteration)

## Risk Assessment

### High Risks

**Risk: Task Tool API Mismatch**
- Description: No existing pattern for spawning Task agents from bash script. API may differ from pseudocode assumptions.
- Impact: CRITICAL - Feature 1 completely blocked
- Likelihood: HIGH (60%)
- Mitigation Strategy:
  - Allocate extra research time (1-2 hours) in Builder-1 task
  - Create minimal prototype with single explorer before scaling to 3
  - Document working pattern comprehensively for reuse
  - Fallback: Create helper script (`lib/2l-task-spawner.sh`) if inline approach fails
  - Emergency fallback: Manual explorer execution with instructions
- Detection: Explorer reports not generated, Task spawning errors
- Contingency: Builder-1 splits into research + implementation sub-tasks

**Risk: YAML Corruption from Concurrent Modifications**
- Description: Multiple `/2l-improve` instances or race conditions could corrupt `global-learnings.yaml`
- Impact: HIGH - Pattern database corruption, data loss
- Likelihood: MEDIUM (30%)
- Mitigation Strategy:
  - Use atomic writes (temp-file-and-rename) from `lib/2l-yaml-helpers.py`
  - Implement file locking via Python `fcntl.flock()`
  - Create `.bak` backup before every write
  - Document: "Only run one `/2l-improve` instance at a time"
  - Add corruption detection on read with auto-repair from backup
- Detection: YAML parse errors, inconsistent pattern statuses
- Recovery: Restore from `.bak` backup file

**Risk: Self-Modification Breaks 2L Framework**
- Description: Meta-circular modification could introduce bugs that break 2L itself
- Impact: CRITICAL - 2L framework unusable
- Likelihood: MEDIUM (25%)
- Mitigation Strategy:
  - Git safety checkpoint before all modifications (already implemented)
  - Smoke test suite validates core functionality post-modification
  - Orchestrator exclusion strictly enforced (never modify `/2l-mvp`)
  - Symlink verification before and after
  - Rollback procedure documented with git tag reference
- Detection: Commands fail to execute, syntax errors, missing files
- Recovery: `git reset --hard <checkpoint_tag>`, restore symlinks

### Medium Risks

**Risk: Explorer Timeout or Failure**
- Description: One or more explorers fail to complete within timeout window
- Impact: MEDIUM - Vision generation blocked, iteration fails
- Likelihood: MEDIUM (35%)
- Mitigation Strategy:
  - 5-minute timeout per explorer (generous for codebase analysis)
  - Graceful degradation in vision generator (proceeds without exploration context)
  - Clear error messages identifying which explorer failed
  - Retry mechanism (manual or automatic with exponential backoff)
  - Manual recovery: Re-run `/2l-improve` with `--force-exploration` flag
- Detection: Timeout reached, missing report files
- Fallback: Vision generated with warning about missing context

**Risk: Low-Quality Explorer Reports**
- Description: Explorers generate reports but content lacks depth or actionable guidance
- Impact: MEDIUM - Visions remain pattern-only without architectural context
- Likelihood: MEDIUM (40%)
- Mitigation Strategy:
  - For MVP: Accept any report content (trust agent quality)
  - Post-MVP: Add report quality validation (length, section completeness)
  - Provide detailed explorer prompts with specific analysis requirements
  - Human review of reports before vision generation (optional gate)
- Detection: Reports < 50 lines, missing key sections, generic content
- Improvement: Enhance explorer prompts with examples in post-MVP

**Risk: Pattern Lifecycle State Machine Bugs**
- Description: Invalid state transitions allowed or automation logic errors
- Impact: MEDIUM - Incorrect pattern status, verification failures
- Likelihood: LOW (20%)
- Mitigation Strategy:
  - Comprehensive state validation before any transition
  - Unit tests for all valid/invalid transition combinations
  - Idempotent operations (safe to call multiple times)
  - JSONL audit trail for debugging state history
  - Manual override CLI command for corrections
- Detection: Patterns in impossible states, validation errors
- Recovery: Manual status correction via CLI

### Low Risks

**Risk: Event Logging Failures**
- Description: Event emission fails due to library missing or permission issues
- Impact: LOW - Observability lost, but functionality unaffected
- Likelihood: LOW (15%)
- Mitigation Strategy:
  - Fire-and-forget pattern (events never block execution)
  - Graceful degradation built into event logger library
  - All event calls wrapped in conditional checks
  - Testing validates events optional
- Detection: Empty `.2L/events.jsonl`, missing events in dashboard
- Impact: Acceptable for MVP (events are observability, not critical path)

## Integration Strategy

### Builder Output Coordination

**File Conflict Prevention:**
- Builder-1 modifies: `commands/2l-improve.md` (lines 358-410 + line 450)
- Builder-2 modifies: `lib/2l-vision-generator.py`, `templates/improvement-vision.md`
- Builder-3 creates: `lib/2l-pattern-lifecycle.py`
- Builder-4 modifies: `commands/2l-improve.md` (lines 855-866)

**Conflict Risk:** Builder-1 and Builder-4 both modify `/2l-improve` at different locations
- Mitigation: Clear line number boundaries in task descriptions
- Integration: Builder-4 applies changes to Builder-1's output file
- Testing: Validate combined `/2l-improve` executes without syntax errors

**Sequential Dependencies:**
1. Builder-1 (Task spawning) → Builder-2 (Vision enhancement uses exploration reports)
2. Builder-3 (Lifecycle utility) → Builder-4 (Integration calls utility)
3. Parallel work: Builder-1/2 can proceed independently of Builder-3/4

### Integration Execution Plan

**Phase 1: Foundation Layer (Builder-1 + Builder-3)**
- Builder-1 delivers: Modified `/2l-improve` with Task spawning
- Builder-3 delivers: `lib/2l-pattern-lifecycle.py` utility
- Test independently before proceeding

**Phase 2: Enhancement Layer (Builder-2 + Builder-4)**
- Builder-2 delivers: Enhanced vision generator with exploration context
- Builder-4 delivers: Lifecycle integration in `/2l-improve` and `/2l-mvp`
- Test with Builder-1 and Builder-3 outputs

**Phase 3: Smoke Testing**
- Run `/2l-improve` with test pattern
- Verify explorers spawn and complete
- Verify vision contains exploration context
- Verify pattern status updates to IMPLEMENTED
- Run smoke tests: event logging, pattern detection, symlinks, commands

**Phase 4: End-to-End Validation**
- Execute full cycle with PATTERN-001
- Measure: time to completion, report quality, vision accuracy
- Validate: safety mechanisms triggered, rollback works

### Shared Components

**Event Logging Library:** `lib/2l-event-logger.sh`
- All builders use for event emission
- Pattern: `log_2l_event "event_type" "data" "phase" "agent_id"`
- Graceful degradation built-in

**YAML Helpers:** `lib/2l-yaml-helpers.py`
- Builder-3 uses: `atomic_write_yaml()`, `backup_before_write()`
- Pattern: temp-file-and-rename for atomic updates

**Git Safety Functions:** In `/2l-improve`
- Builder-1 verifies: Still functional after modifications
- Builder-4 uses: Checkpoint creation before pattern status update

## Deployment Plan

**Target Environment:** Meditation space (`~/Ahiya/2L`)

**Deployment Steps:**
1. All work happens in meditation space (no separate deployment)
2. Changes apply immediately to 2L framework files
3. Symlinks to `~/.claude/` updated automatically (if needed)
4. Git checkpoint created before any self-modification
5. Smoke tests validate functionality after changes

**Validation Checklist:**
- [ ] `/2l-improve` executable and error-free
- [ ] `/2l-mvp` still works (orchestrator exclusion enforced)
- [ ] Event logging functional (`.2L/events.jsonl` updated)
- [ ] Pattern detection still works
- [ ] Symlinks valid (`~/.claude/agents/`, `~/.claude/commands/`, `~/.claude/lib/`)
- [ ] All commands in PATH

**Rollback Procedure:**
1. Identify checkpoint tag: `git tag -l "pre-*"`
2. Reset to checkpoint: `git reset --hard <tag>`
3. Verify symlinks: `bash ~/.claude/lib/verify-symlinks.sh`
4. Test basic commands: `/2l-status`, `/2l-improve --help`

**No External Deployment:** This is self-improvement of the 2L framework itself. Changes take effect immediately in the meditation space and propagate via symlinks to active environment.

---

**Plan Status:** READY FOR EXECUTION
**Complexity:** HIGH (Meta-circular, Task spawning unknown, safety-critical)
**Confidence:** 85% (High on architecture, medium on Task tool API)
**Next Phase:** Building (spawn 2-4 builders based on complexity assessment)
