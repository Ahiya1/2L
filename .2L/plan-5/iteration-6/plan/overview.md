# 2L Iteration Plan - Self-Reflection Infrastructure (Iteration 1)

## Project Vision

Build the foundational learning capture system that enables 2L to systematically learn from its orchestrations. This iteration establishes the data pipeline: validators capture learnings on failure, orchestrator reflection merges them into global knowledge base, and re-validation checkpoints prevent false completion states.

**What we're building:** The reflection infrastructure that closes the learning loop - from validation failures to structured learnings to global knowledge aggregation.

**Why it matters:** 2L already improves itself (4 completed plans prove it), but these improvements require manual analysis. This plan adds systematic reflection so every project makes 2L better for the next one.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] Validators create `learnings.yaml` on FAIL with structured data (100% coverage)
- [ ] Re-validation checkpoint prevents false iteration completion (0% false COMPLETE states)
- [ ] Global learnings file accumulates entries automatically after each iteration
- [ ] Learning format includes: issue, root_cause, solution, severity, affected_files
- [ ] Orchestrator reflection merges iteration learnings with status: IDENTIFIED
- [ ] All re-validation events logged to events.jsonl for dashboard visibility
- [ ] Graceful degradation: Learning capture failures don't block orchestrations
- [ ] Atomic writes prevent global-learnings.yaml corruption

## MVP Scope

**In Scope:**

**Feature 1: Per-iteration Learning Capture**
- Validators create learnings.yaml when validation fails
- Structured format: issue, root_cause, solution, severity, affected_files
- Graceful degradation if YAML write fails
- Learning IDs: {project}-{YYYYMMDD}-{NNN} format

**Feature 2: Re-validation Checkpoint**
- After healing completes, automatically re-spawn validator
- If PASS: mark iteration complete, commit to git
- If FAIL: second healing round (max 2 attempts total)
- Emit re-validation events to events.jsonl
- Escalate to manual intervention after 2 failed healing attempts

**Feature 4: Orchestrator Reflection (Partial)**
- After validation PASSES, before git commit
- If learnings.yaml exists in iteration directory, merge into .2L/global-learnings.yaml
- Mark new learnings with status: IDENTIFIED
- Add iteration metadata: duration, healing_rounds, files_modified
- Use atomic writes to prevent corruption
- Track learning provenance: discovered_in, discovered_at

**Out of Scope (Post-MVP):**

- Feature 3: Full learning aggregation system (deferred to iteration 2)
- Feature 5: /2l-improve command (deferred to iteration 2)
- Success pattern extraction (capture what worked well)
- Learning deduplication across projects (basic merge only)
- Pattern detection and ranking
- Vision auto-generation from learnings
- Meta-orchestration (2L improving itself)

## Development Phases

1. **Exploration** - COMPLETE
2. **Planning** - Current
3. **Building** - 6-8 hours (2 builders)
4. **Integration** - 30 minutes
5. **Validation** - 20 minutes
6. **Deployment** - Auto-commit to git

## Timeline Estimate

- Exploration: Complete (2 explorer reports)
- Planning: Complete
- Building: 6-8 hours
  - Builder 1 (Learning Capture): 2-3 hours
  - Builder 2 (Re-validation + Reflection): 4-5 hours
- Integration: 30 minutes (low conflict potential)
- Validation: 20 minutes (manual testing)
- Total: ~8-10 hours

## Risk Assessment

### High Risks

**Global Learnings File Corruption**
- Risk: Orchestrator crashes during YAML merge, corrupting global-learnings.yaml
- Impact: Loss of all accumulated learnings across projects
- Mitigation: Atomic writes via temp file + rename, backup to .bak before each merge
- Likelihood: LOW (single orchestrator at a time, atomic writes prevent partial writes)

**Infinite Healing Loop**
- Risk: Re-validation fails repeatedly, orchestrator never completes iteration
- Impact: Wasted time and resources, orchestration hangs
- Mitigation: Hard limit of 2 healing attempts, escalate to manual intervention after limit
- Likelihood: LOW (hard-coded limit prevents infinite loops)

### Medium Risks

**Learning Quality Depends on Validator Insight**
- Risk: Validators can't always determine root cause, learnings may be shallow
- Impact: Less actionable learnings, manual refinement needed
- Mitigation: Allow `root_cause: UNKNOWN - requires investigation` placeholder
- Likelihood: MEDIUM (some failures have non-obvious root causes)

**YAML Merge Conflicts**
- Risk: Multiple learnings with similar patterns create duplicates in global file
- Impact: Bloated global-learnings.yaml, duplicate work in future iterations
- Mitigation: Basic similarity check on root_cause, full deduplication in iteration 2
- Likelihood: MEDIUM (conservative merge strategy mitigates)

## Integration Strategy

**Builder Isolation:**
- Builder 1 extends `agents/2l-validator.md` (learning capture)
- Builder 2 extends `commands/2l-mvp.md` (re-validation + reflection)
- Minimal file overlap (different files modified)

**Integration Points:**
- Validator creates learnings.yaml → Orchestrator reads it during reflection
- File-based contract: learnings.yaml YAML schema
- No API integration needed (local file operations only)

**Conflict Prevention:**
- Builders work on different files (validator agent vs. orchestrator command)
- Shared YAML helper library created by Builder 2, used by both
- Clear YAML schema defined in planning phase (shared contract)

**Merge Strategy:**
1. Builder 1 completes first (validator extension simpler)
2. Builder 2 integrates against Builder 1's changes
3. Integrator verifies learnings.yaml → reflection pipeline works end-to-end

## Deployment Plan

**Target Environment:** ~/.claude/ (symlinked to ~/Ahiya/2L/)

**Deployment Steps:**
1. Integrator merges builder outputs into meditation space
2. Validator runs manual tests (force validation failure, verify learnings.yaml)
3. Orchestrator tests (complete iteration with learnings, verify global merge)
4. Git commit with message: "plan-5-iter-6: Learning capture and re-validation foundation"
5. Changes immediately live via symlinks

**Rollback Plan:**
- Git tag created before deployment: `2l-pre-iter-6`
- If critical issues found: `git reset --hard 2l-pre-iter-6`
- Symlinks ensure rollback is immediate (no installation step)

**Validation Tests:**
- Force TypeScript error, run validator, verify learnings.yaml created
- Trigger healing, verify re-validation occurs, iteration only completes on PASS
- Complete iteration, verify global-learnings.yaml updated with status: IDENTIFIED
- Kill Python process mid-merge, verify no corruption (atomic write test)

## Orchestrator Reflection Architecture

**When:** After validation PASSES, before git commit

**What it does:**
1. Checks if `.2L/{plan}/iteration-{N}/learnings.yaml` exists
2. If exists, reads iteration learnings
3. Converts learnings to global pattern format
4. Merges into `.2L/global-learnings.yaml` using atomic writes
5. Adds metadata: status: IDENTIFIED, discovered_in, discovered_at
6. Enriches with iteration metadata: duration, healing_rounds, files_modified
7. Emits reflection_complete event

**Implementation:**
- Python helper script: `lib/2l-yaml-helpers.py`
- Called from orchestrator after validation PASS
- Uses atomic write pattern (temp file + rename)
- Graceful degradation if reflection fails (logs warning, continues)

**Data Flow:**
```
Validator creates learnings.yaml (on FAIL)
  ↓
Orchestrator spawns healing (if needed)
  ↓
Re-validation runs (NEW: verify healing worked)
  ↓
Validation PASSES (first-pass or after healing)
  ↓
Orchestrator reflection reads learnings.yaml
  ↓
Merges into global-learnings.yaml with metadata
  ↓
Git commit (iteration complete)
```

## Re-validation Checkpoint Logic

**When:** After healing completes, before marking iteration complete

**What it does:**
1. Healer reports COMPLETE status
2. Orchestrator re-spawns validator (same checks as original validation)
3. Validator creates new validation-report.md in healing-{N}/ directory
4. Orchestrator checks re-validation status
5. If PASS: Mark iteration complete, proceed to reflection
6. If FAIL: Attempt second healing (max 2 total) OR escalate to manual intervention

**Infinite Loop Prevention:**
- Hard-coded limit: `max_healing_attempts = 2`
- After 2 failed re-validations, raise exception with clear message
- Edge case: If healing makes no git changes, escalate immediately (don't waste 2nd attempt)

**Event Tracking:**
- `phase_change` - "Starting re-validation after healing" (orchestrator)
- `validation_result` - "Re-validation: PASS/FAIL" (validator)
- `iteration_complete` - "Iteration completed after successful healing" (orchestrator)

**Implementation:**
- Extend orchestrator healing loop in `commands/2l-mvp.md`
- Reuse existing validator agent (no new agent needed)
- Emit events for dashboard observability

## File Structure

**Data Files Created:**
```
~/Ahiya/2L/.2L/
├── global-learnings.yaml          # NEW: Global learning aggregation
└── plan-5/
    └── iteration-6/
        ├── exploration/
        ├── plan/
        ├── building/
        ├── integration/
        ├── validation/
        ├── healing-1/              # If healing needed
        │   └── validation-report.md  # Re-validation result
        └── learnings.yaml          # NEW: Iteration learnings
```

**Source Files Modified:**
```
~/.claude/
├── agents/
│   └── 2l-validator.md           # Extended for learning capture
├── commands/
│   └── 2l-mvp.md                 # Extended for re-validation + reflection
└── lib/
    └── 2l-yaml-helpers.py        # NEW: YAML operations + atomic writes
```

## Key Architectural Decisions

**Decision 1: Extend Existing Agents vs. Create New Ones**
- Choice: Extend 2l-validator.md and 2l-mvp.md
- Rationale: Validator already extracts issues, orchestrator already has iteration flow
- Impact: Less code, maintains architectural consistency, no new agent coordination

**Decision 2: YAML for Learning Persistence**
- Choice: PyYAML for all learning data
- Rationale: Consistent with config.yaml pattern, human-readable, Python support confirmed
- Impact: Easy debugging, manual refinement possible, no new dependencies

**Decision 3: Atomic Writes for Global State**
- Choice: Temp file + shutil.move() pattern
- Rationale: Prevents corruption if orchestrator crashes mid-merge
- Impact: Safety at cost of slight complexity (~20 lines for atomic write helper)

**Decision 4: Re-validation Hard Limit**
- Choice: Max 2 healing attempts before escalation
- Rationale: Prevents infinite loops, 2 attempts sufficient for most cases
- Impact: Orchestrations never hang, manual intervention after 2 failures

**Decision 5: Graceful Degradation**
- Choice: Learning capture failures don't block orchestrations
- Rationale: Learning infrastructure is observability, not critical path
- Impact: Backward compatibility, orchestrations continue even if YAML write fails

## Next Steps

1. Planner creates 4 comprehensive plan files (this file + 3 more)
2. Orchestrator spawns 2 builders in parallel
3. Builder 1: Extend validator for learning capture
4. Builder 2: Extend orchestrator for re-validation + reflection
5. Integration: Merge builder outputs, verify end-to-end pipeline
6. Validation: Manual tests (force failure, verify learnings, verify re-validation)
7. Deployment: Git commit, changes live via symlinks

---

**Plan Status:** PLANNED
**Ready for:** Building Phase
**Global Iteration:** 6 (plan-5, iteration-1)
**Complexity:** MEDIUM (8-10 hours, 2 builders)
