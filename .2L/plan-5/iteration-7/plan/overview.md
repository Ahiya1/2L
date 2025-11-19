# 2L Iteration Plan - Self-Improvement Automation via /2l-improve

## Project Vision

Build the `/2l-improve` command that closes the self-reflection loop: reads accumulated learnings from global knowledge base, detects recurring patterns, auto-generates improvement visions, and orchestrates 2L to improve itself.

**What we're building:** The recursive self-improvement command that makes 2L autonomously fix its own recurring issues by learning from past failures.

**Why it matters:** Iteration 1 created the learning pipeline (validators capture → orchestrator reflects → global knowledge base). This iteration completes the loop: learnings → pattern detection → auto-vision → self-modification → status tracking. 2L will literally improve itself without human intervention.

---

## Executive Summary

Iteration 7 implements the `/2l-improve` command, the capstone of plan-5's self-reflection infrastructure. It aggregates learnings, detects patterns, generates visions automatically, and orchestrates self-modification with multi-layered safety mechanisms.

**Scope:** Complete Feature 3 (status lifecycle) and Feature 5 (/2l-improve command) from master plan.

**Approach:** 2 builders working sequentially on well-defined components with clear integration contract.

**Complexity:** HIGH (10-14 hours) due to meta-circular self-modification safety requirements.

---

## Success Criteria

Specific, measurable criteria for MVP completion:

### Core Functionality (Feature 5)

- [ ] `/2l-improve` reads global-learnings.yaml and filters by status: IDENTIFIED
- [ ] Pattern detection identifies recurring patterns (min 2 occurrences, medium+ severity)
- [ ] Impact score ranking works correctly (severity × occurrences × recurrence_factor)
- [ ] Vision auto-generation produces valid vision.md from template
- [ ] Confirmation workflow displays pattern evidence and requires explicit "y/Y" consent
- [ ] /2l-improve invokes /2l-mvp successfully and monitors completion
- [ ] Pattern status updates: IDENTIFIED → IMPLEMENTED after /2l-mvp completes
- [ ] Status update includes metadata: implemented_in_plan, implemented_at, vision_file

### Status Lifecycle (Feature 3)

- [ ] Global-learnings.yaml supports status field (backward compatible)
- [ ] Status transitions validated: IDENTIFIED → IMPLEMENTED (no VERIFIED in iteration 7)
- [ ] Filter logic shows only IDENTIFIED patterns to /2l-improve
- [ ] Status update is atomic (uses existing atomic_write_yaml)

### Safety Mechanisms

- [ ] Orchestrator exclusion: commands/2l-mvp.md NEVER modifiable (hard-coded blacklist)
- [ ] Git status check: abort if working directory dirty (with override option)
- [ ] Symlink verification: check integrity before modification
- [ ] Pre-modification git commit: safety checkpoint with tag
- [ ] Auto-rollback: git reset on /2l-mvp failure

### Usability

- [ ] `--dry-run` mode shows what would happen without modifications
- [ ] `--manual` mode saves vision and exits (user runs /2l-mvp manually)
- [ ] Clear error messages with context (file paths, pattern IDs)
- [ ] Events emitted for observability (9 event types throughout workflow)

### Quality

- [ ] Unit tests for pattern detection, orchestrator exclusion, status updates
- [ ] Integration test: end-to-end with synthetic learnings
- [ ] Edge case tests: tie scores, all below threshold, concurrent runs
- [ ] Template-based vision generation (no LLM variability)

**Overall:** 21 of 21 success criteria must be met for PASS.

---

## Dependencies Met (from Iteration 1)

Iteration 1 (global iteration 6) established all foundational infrastructure needed:

✅ **global-learnings.yaml schema**
- Schema defined and validated
- Pattern format includes all required fields
- Orchestrator reflection populating it automatically

✅ **YAML helpers library (lib/2l-yaml-helpers.py)**
- atomic_write_yaml() prevents corruption
- backup_before_write() creates .bak files
- generate_pattern_id() creates sequential IDs
- find_similar_pattern() for deduplication

✅ **Event system**
- log_2l_event() available
- events.jsonl working
- Dashboard reads events

✅ **Orchestrator reflection**
- Merges iteration learnings into global file
- Adds status: IDENTIFIED
- Enriches with iteration metadata

✅ **Symlink architecture**
- ~/.claude/ → ~/Ahiya/2L/ working
- Changes immediately live
- Git-controlled source

**Validation status:** All iteration 1 deliverables COMPLETE and tested (95% confidence PASS).

---

## MVP Scope

### In Scope

**Feature 3: Learning Aggregation with Status Tracking (Completion)**

1. Extend global-learnings.yaml schema:
   - Add `status` field to each pattern (default: IDENTIFIED)
   - Support metadata: `implemented_in_plan`, `implemented_at`, `vision_file`
   - Validate status transitions: IDENTIFIED → IMPLEMENTED

2. Filter learnings by status:
   - /2l-improve shows only IDENTIFIED patterns
   - Prevents duplicate fixes (skip IMPLEMENTED/VERIFIED)

3. Status update after improvement:
   - Mark pattern as IMPLEMENTED after /2l-mvp completes
   - Add metadata: plan, timestamp, vision file path
   - Use atomic_write_yaml for safety

**Feature 5: /2l-improve Command**

1. **Learning Aggregation:**
   - Read .2L/global-learnings.yaml
   - Filter WHERE status = IDENTIFIED
   - Detect recurring patterns (occurrences >= 2)
   - Rank by impact: severity_weight × occurrences × recurrence_factor

2. **Vision Auto-Generation:**
   - Select top pattern by impact score (single-pattern MVP)
   - Generate vision.md from template: .claude/templates/improvement-vision.md
   - Variable substitution: pattern data → template placeholders
   - Component inference from root_cause (keyword matching)
   - Quality validation: no TODO/TBD placeholders

3. **Confirmation Workflow:**
   - Display pattern evidence (projects, occurrences, severity)
   - Show generated vision preview
   - List files to be modified
   - Safety checks: orchestrator exclusion, symlinks, git status
   - Require explicit "y/Y" confirmation
   - Options: [P]roceed / [E]dit / [C]ancel

4. **Self-Modification Orchestration:**
   - Change to meditation space: ~/Ahiya/2L
   - Create pre-modification git commit (safety checkpoint)
   - Invoke /2l-mvp with generated vision
   - Monitor exit code
   - Rollback on failure (git reset)
   - Auto-commit on success

5. **Status Update:**
   - After /2l-mvp success, update pattern status
   - IDENTIFIED → IMPLEMENTED
   - Add metadata: implemented_in_plan, implemented_at, vision_file
   - Emit status_update event

6. **Command Modes:**
   - Default: Interactive (show patterns, confirm, execute)
   - `--manual`: Save vision, exit (user runs /2l-mvp manually)
   - `--dry-run`: Show what would happen, no modifications
   - `--pattern PATTERN-ID`: Skip selection, use specific pattern

7. **Safety Mechanisms:**
   - NEVER modify commands/2l-mvp.md (hard-coded blacklist)
   - Only modify: agents/*.md, commands/2l-*.md (except 2l-mvp), lib/*.sh, lib/*.py
   - Verify symlinks intact before modification
   - Git status check (abort if dirty, with override option)
   - Pre-modification checkpoint (git commit + tag)
   - Auto-rollback on failure
   - File locking (prevent concurrent /2l-improve runs)

8. **Event Emission:**
   - command_start: /2l-improve begins
   - learnings_loaded: N patterns loaded
   - pattern_detection: N recurring patterns found
   - pattern_selected: PATTERN-ID chosen
   - vision_generated: vision.md created
   - confirmation_prompt: waiting for user
   - user_confirmed: user said yes
   - self_modification_start: /2l-mvp invoked
   - self_modification_complete: /2l-mvp succeeded
   - status_updated: pattern marked IMPLEMENTED
   - command_complete: /2l-improve done

### Out of Scope (Post-MVP)

- **Multi-pattern improvements:** Start with 1 pattern per vision (defer to plan-6)
- **/2l-verify command:** Manual verification workflow for IMPLEMENTED → VERIFIED (plan-6)
- **Learning deletion/archival:** Housekeeping features (plan-6)
- **Pattern visualization dashboard:** UI features (plan-6)
- **Advanced component inference:** LLM-based analysis (plan-6)
- **Automatic conflict resolution:** Git merge strategies (plan-7)
- **Performance optimization:** Current data volumes trivial (<500KB)

---

## Development Phases

1. **Exploration** ✅ COMPLETE (2 explorer reports, 25,000+ words of analysis)
2. **Planning** 🔄 CURRENT (4 comprehensive plan files)
3. **Building** ⏳ 10-14 hours (2 builders sequential)
   - Builder-1 (Core Command): 5-7 hours
   - Builder-2 (Vision & Self-Mod): 5-7 hours
4. **Integration** ⏳ 45 minutes (low conflict, clear contract)
5. **Validation** ⏳ 30 minutes (unit + integration tests)
6. **Deployment** ⏳ Auto-commit to git (changes live via symlinks)

---

## Timeline Estimate

**Total Estimated Hours:** 10-14

**Breakdown:**

- **Exploration:** Complete (2 explorer reports analyzed)
- **Planning:** Complete (4 comprehensive files created)
- **Building:** 10-14 hours
  - Builder-1 (Core): 5-7 hours
    - Pattern detection: 2 hours
    - Confirmation workflow: 1.5 hours
    - CLI interface: 1 hour
    - Event emission: 0.5 hours
  - Builder-2 (Vision/Self-Mod): 5-7 hours
    - Template creation: 1 hour
    - Vision generator: 2 hours
    - Self-modification orchestration: 1.5 hours
    - Status updater: 0.5 hours
    - Safety mechanisms: 2 hours
- **Integration:** 45 minutes
  - Merge builder outputs
  - Verify pattern selection → vision generation pipeline
  - Test end-to-end with synthetic data
- **Validation:** 30 minutes
  - Unit tests (pattern detection, orchestrator exclusion)
  - Integration tests (full workflow)
  - Edge cases (tie scores, empty patterns)
- **Total:** 11-15 hours (median: 13 hours)

**Critical Path:** Builder-2 depends on Builder-1's pattern detection output format.

---

## Risk Assessment

### High Risks

**Meta-Circular Self-Destruction**
- **Risk:** /2l-improve modifies orchestrator (2l-mvp.md), breaking all future orchestrations
- **Impact:** CRITICAL - Complete system failure, manual recovery required
- **Likelihood:** MEDIUM if safety checks fail
- **Mitigation:**
  1. Hard-coded blacklist: commands/2l-mvp.md NEVER modifiable
  2. Unit test: verify orchestrator exclusion logic
  3. Component inference validation: never suggest 2l-mvp.md
  4. Pre-modification review in confirmation workflow
  5. Git rollback capability (tagged checkpoint)
- **Residual Risk:** LOW (multiple layers of protection)

**Vision Quality Variability**
- **Risk:** Auto-generated visions too vague, causing builder failures
- **Impact:** HIGH - Wasted /2l-mvp runs, validation failures
- **Likelihood:** HIGH with LLM generation
- **Mitigation:**
  1. Template-based approach (consistent structure)
  2. Quality validation (check for TODO/TBD placeholders)
  3. Evidence inclusion (concrete examples from patterns)
  4. Manual edit option (user can refine before proceeding)
  5. Validation checkpoint (poor visions fail validation, caught early)
- **Residual Risk:** MEDIUM (acceptable for MVP with manual override)

### Medium Risks

**Git Conflicts During Self-Modification**
- **Risk:** Uncommitted changes interfere with /2l-mvp execution
- **Impact:** MEDIUM - Workflow interruption, manual intervention needed
- **Likelihood:** LOW (single-user environment)
- **Mitigation:**
  1. Pre-flight git status check (abort if dirty)
  2. Override option (user can proceed if they know what they're doing)
  3. File locking (prevent concurrent /2l-improve runs)
  4. Clear error messages (guide user to fix)
- **Residual Risk:** LOW

**Pattern Detection False Positives**
- **Risk:** /2l-improve fixes wrong issues (similar root_cause but different context)
- **Impact:** MEDIUM - Wasted effort, potential new issues introduced
- **Likelihood:** MEDIUM
- **Mitigation:**
  1. Conservative matching (exact root_cause + severity)
  2. User reviews pattern in confirmation workflow
  3. Impact score ranking (prioritize high-confidence patterns)
  4. Dry-run mode (test before executing)
- **Residual Risk:** MEDIUM (user judgment required)

### Low Risks

**Symlink Integrity Issues**
- **Risk:** Symlinks broken, modifications don't apply to live system
- **Impact:** MEDIUM - Changes not live, confusing behavior
- **Likelihood:** VERY LOW (symlinks established and stable)
- **Mitigation:**
  1. Pre-modification symlink verification
  2. Clear error message if check fails
  3. Abort if verification fails
- **Residual Risk:** VERY LOW

**Concurrent /2l-improve Runs**
- **Risk:** Two /2l-improve processes modify global-learnings.yaml simultaneously
- **Impact:** LOW - File corruption prevented by atomic writes
- **Likelihood:** VERY LOW (manual invocation)
- **Mitigation:**
  1. File locking (flock on global-learnings.yaml)
  2. Atomic writes prevent corruption even if concurrent
- **Residual Risk:** VERY LOW

---

## Integration Strategy

### Builder Isolation

**Builder-1: Core Command**
- Creates: `commands/2l-improve.md` (Bash CLI)
- Creates: `lib/2l-pattern-detector.py` (pattern detection logic)
- Extends: `lib/2l-yaml-helpers.py` (add update_pattern_status function)
- No overlap with Builder-2 files

**Builder-2: Vision & Self-Modification**
- Creates: `.claude/templates/improvement-vision.md` (vision template)
- Creates: `lib/2l-vision-generator.py` (vision generation logic)
- Creates: `lib/verify-symlinks.sh` (symlink integrity check)
- Integrates with Builder-1's pattern detector output
- No overlap with Builder-1 files

### Integration Points

**Contract: Pattern Selection Data**

Builder-1 outputs pattern selection as JSON:
```json
{
  "pattern_id": "PATTERN-003",
  "name": "TypeScript path resolution failures",
  "severity": "critical",
  "occurrences": 3,
  "projects": ["wealth", "ai-mafia"],
  "root_cause": "...",
  "proposed_solution": "...",
  "impact_score": 45.0,
  "source_learnings": [...]
}
```

Builder-2 reads this JSON and generates vision.md.

**Contract: Vision Template Variables**

Template uses placeholders: `{PATTERN_NAME}`, `{ROOT_CAUSE}`, etc.
Vision generator performs variable substitution.

**Contract: Status Update Function**

Builder-1 extends lib/2l-yaml-helpers.py with:
```python
def update_pattern_status(pattern_id, new_status, metadata=None):
    # Implementation
```

Builder-2 calls this function after /2l-mvp succeeds.

### Conflict Prevention

- **No file overlap:** Builders modify different files
- **Clear APIs:** Pattern detector → JSON → Vision generator
- **Shared library extension:** Builder-1 adds function, Builder-2 uses it
- **Sequential execution:** Builder-2 starts after Builder-1 completes

### Merge Strategy

1. **Builder-1 completes first:**
   - Pattern detector working
   - Confirmation workflow functional
   - `/2l-improve --dry-run` works end-to-end

2. **Builder-2 integrates against Builder-1:**
   - Uses Builder-1's pattern detector output format
   - Calls Builder-1's update_pattern_status function
   - Adds vision generation and self-modification on top

3. **Integrator verifies:**
   - Full workflow: pattern detection → vision generation → self-modification → status update
   - Test with synthetic global-learnings.yaml
   - Verify orchestrator exclusion safety

---

## Deployment Plan

### Target Environment

**Meditation Space:** ~/Ahiya/2L/ (source code, git-controlled)

**Symlinks:** ~/.claude/ → ~/Ahiya/2L/ (live system)

**Changes Immediately Live:** No installation step, symlinks make modifications instant

### Deployment Steps

1. **Integration Phase:**
   - Integrator merges Builder-1 and Builder-2 outputs
   - Creates .2L/plan-5/iteration-7/ directory with all artifacts
   - Verifies no merge conflicts

2. **Testing:**
   - Create synthetic global-learnings.yaml with test patterns
   - Run `/2l-improve --dry-run` (verify pattern detection + ranking)
   - Run `/2l-improve --manual` (verify vision generation)
   - Verify orchestrator exclusion (unit test)
   - Edge cases: empty patterns, tie scores, concurrent runs

3. **Git Commit:**
   - Stage all changes:
     - commands/2l-improve.md
     - lib/2l-pattern-detector.py
     - lib/2l-vision-generator.py
     - lib/2l-yaml-helpers.py (extended)
     - lib/verify-symlinks.sh
     - .claude/templates/improvement-vision.md
     - .2L/plan-5/iteration-7/ (all iteration artifacts)
   - Commit message: "plan-5-iter-7: /2l-improve command - recursive self-improvement complete"
   - Tag: `2l-plan-5-complete`

4. **Verification:**
   - `/2l-improve --dry-run` (smoke test)
   - Verify symlinks intact
   - Check events.jsonl for command_start event

5. **Go Live:**
   - Changes already live via symlinks
   - Monitor first real /2l-improve run
   - Watch events.jsonl for observability

### Rollback Plan

**Pre-Deployment Checkpoint:**
- Git tag before commit: `pre-2l-improve`
- If critical issues: `git reset --hard pre-2l-improve`
- Symlinks ensure rollback is immediate

**Validation Failure:**
- If validation fails, integrator creates healer tasks
- Max 2 healing rounds before manual intervention
- Git history enables bisecting issues

### Validation Tests

**Automated Tests (run during validation phase):**

1. **Unit Tests:**
   - Pattern detection with synthetic data
   - Impact score calculation
   - Orchestrator exclusion (blacklist check)
   - Status update atomicity
   - Vision template variable substitution

2. **Integration Tests:**
   - Full workflow with test global-learnings.yaml
   - /2l-improve --dry-run end-to-end
   - /2l-improve --manual (vision generation only)
   - Status update verification

3. **Edge Cases:**
   - Empty patterns (no IDENTIFIED)
   - Tie scores (multiple patterns same impact)
   - Invalid YAML (error handling)
   - Concurrent runs (file locking)
   - User cancels (no side effects)

**Success Criteria for Deployment:**
- All automated tests pass
- Dry-run mode works end-to-end
- Orchestrator exclusion verified
- No syntax errors in Bash/Python
- Events emit correctly

---

## File Structure

### New Files Created

```
~/Ahiya/2L/
├── commands/
│   └── 2l-improve.md              # NEW: Main /2l-improve command (Bash)
│
├── lib/
│   ├── 2l-pattern-detector.py     # NEW: Pattern detection + ranking
│   ├── 2l-vision-generator.py     # NEW: Vision auto-generation
│   ├── 2l-yaml-helpers.py         # MODIFIED: Add update_pattern_status()
│   └── verify-symlinks.sh         # NEW: Symlink integrity check
│
└── .claude/templates/
    └── improvement-vision.md      # NEW: Vision template for improvements
```

### Modified Files

```
~/Ahiya/2L/
├── lib/
│   └── 2l-yaml-helpers.py         # EXTEND: Add update_pattern_status()
│
└── .2L/
    ├── global-learnings.yaml      # EXTEND: status field usage
    └── config.yaml                # UPDATE: plan-5 iteration-7 status
```

### Iteration Artifacts

```
~/Ahiya/2L/.2L/plan-5/iteration-7/
├── vision.md                      # Iteration vision
├── exploration/
│   ├── explorer-1-report.md       # Architecture analysis
│   └── explorer-2-report.md       # Patterns analysis
├── plan/
│   ├── overview.md                # This file
│   ├── tech-stack.md              # Technology decisions
│   ├── patterns.md                # Code patterns
│   └── builder-tasks.md           # Builder breakdown
├── building/
│   ├── builder-1-report.md        # Core command builder
│   └── builder-2-report.md        # Vision/self-mod builder
├── integration/
│   └── integration-report.md      # Integration summary
└── validation/
    └── validation-report.md       # Validation results
```

---

## Next Steps

1. **Planner completes all 4 plan files** (current step)
   - overview.md (this file) ✅
   - tech-stack.md ⏳
   - patterns.md ⏳
   - builder-tasks.md ⏳

2. **Orchestrator spawns Builder-1**
   - Scope: Core command, pattern detection, confirmation workflow
   - Deliverable: `/2l-improve --dry-run` works

3. **Builder-1 completes, Orchestrator spawns Builder-2**
   - Scope: Vision generation, self-modification, status updates
   - Deliverable: `/2l-improve` auto mode works end-to-end

4. **Integration Phase**
   - Merge builder outputs
   - Test full workflow with synthetic data
   - Verify orchestrator exclusion

5. **Validation Phase**
   - Run unit tests
   - Run integration tests
   - Run edge case tests
   - Manual smoke test

6. **Deployment**
   - Git commit with tag
   - Changes live via symlinks
   - Monitor first real run

---

## Key Architectural Decisions

### Decision 1: 2 Builders (not 3-4)

**Choice:** Split into Builder-1 (Core) and Builder-2 (Vision/Self-Mod)

**Rationale:**
- Clear integration contract (pattern JSON)
- Sequential dependency manageable
- Avoids over-splitting (integration overhead)
- ~400 LOC total fits 2 builders well

**Impact:** Simpler coordination, faster integration

---

### Decision 2: Template-Based Vision Generation

**Choice:** Use markdown template with variable substitution (not LLM)

**Rationale:**
- Consistent structure across all visions
- Deterministic outputs (easier testing)
- Lower risk than LLM hallucination
- Maintainable (update template improves all future visions)

**Impact:** More reliable vision quality, easier validation

**Alternative Considered:** LLM-based generation
**Why Rejected:** Higher variability, harder to test, risk of off-topic content

---

### Decision 3: Single-Pattern MVP

**Choice:** Select top 1 pattern by impact score (not 2-3)

**Rationale:**
- Vision mentions "top 2-3" but complexity analysis shows single is sufficient
- Multi-pattern requires merging solutions, complex success criteria, harder testing
- Validates workflow with simpler case first
- Can extend to multi-pattern in plan-6 after proving single works

**Impact:** Faster implementation (10-14 hours achievable), clearer success criteria

---

### Decision 4: No /2l-verify in Iteration 7

**Choice:** Defer IMPLEMENTED → VERIFIED transition to plan-6

**Rationale:**
- Iteration 7 scope already HIGH complexity
- VERIFIED state requires new command, new workflow, new testing
- Focus on core self-improvement loop first (IDENTIFIED → IMPLEMENTED)
- Manual verification can be done informally for now

**Impact:** Reduced scope, achievable timeline

---

### Decision 5: Dry-Run Mode Essential

**Choice:** Implement `--dry-run` as core feature (not optional enhancement)

**Rationale:**
- Essential for safe testing during development
- User confidence (preview before committing)
- Low implementation cost (~20 LOC)
- Debugging aid

**Impact:** Safer development, better UX

---

### Decision 6: Hard-Coded Orchestrator Exclusion

**Choice:** Never allow 2l-mvp.md modification (hard-coded blacklist)

**Rationale:**
- Meta-circular safety: orchestrator bug breaks entire system
- Multiple layers: blacklist check, component inference validation, unit tests
- Git rollback mitigates but prevention better than recovery

**Impact:** System-level safety guarantee

---

## Metadata

**Plan Status:** PLANNED
**Ready for:** Building Phase
**Global Iteration:** 7 (plan-5, iteration-2/2)
**Complexity:** HIGH (10-14 hours, 2 builders)
**Critical Success Factors:**
1. Orchestrator exclusion safety (never modify 2l-mvp.md)
2. Template-based vision generation (consistent quality)
3. Comprehensive testing (meta-circular code is risky)
4. Clear error messages (user must understand failures)
5. Git safety checkpoints (rollback capability)

---

**Plan Created:** 2025-11-19
**Planner:** 2L Planner Agent
**Based On:**
- Vision: .2L/plan-5/iteration-7/vision.md
- Master Plan: .2L/plan-5/master-plan.yaml
- Explorer-1: Architecture & Complexity Analysis (12,500 words)
- Explorer-2: Patterns & Code Organization (13,000+ words)
- Iteration-1 Context: Complete and validated (PASS, 95% confidence)

**Plan Confidence:** 95% (HIGH)
**Estimated Success Probability:** 90% (comprehensive exploration, clear patterns, proven foundation)
