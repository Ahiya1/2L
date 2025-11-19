# Iteration 2/2 Vision: Self-Improvement Automation via /2l-improve

**Global Iteration:** 7
**Plan:** plan-5
**Dependencies:** iteration-1 (COMPLETE)

---

## Vision Summary

Build the `/2l-improve` command that closes the self-reflection loop: aggregates learnings from the global knowledge base, detects recurring patterns, auto-generates improvement visions, and orchestrates automated self-improvement of 2L's own agents and commands.

This iteration completes plan-5 by implementing data-driven vision creation (vs. the existing human-driven `/2l-vision` workflow).

---

## Scope

### Feature 3: Learning Aggregation with Status Tracking (Completion)

**Context:** Iteration 1 established orchestrator reflection that merges learnings into `.2L/global-learnings.yaml` with status: IDENTIFIED. This feature completes the status lifecycle.

**Requirements:**
1. Extend global-learnings.yaml schema with status field per pattern
2. Support status lifecycle: `IDENTIFIED` → `IMPLEMENTED` → `VERIFIED`
3. Filter learnings by status for /2l-improve (show only IDENTIFIED)
4. Track which learnings contributed to which improvement visions
5. Prevent duplicate fixes by checking status before creating vision

**Success Criteria:**
- Global learnings file has `status` field (default: IDENTIFIED)
- /2l-improve only shows IDENTIFIED learnings
- After /2l-mvp completes, status updates to IMPLEMENTED
- Manual verification workflow: /2l-verify marks status as VERIFIED

---

### Feature 5: /2l-improve Command

**Context:** The recursive self-improvement command that makes 2L improve itself by learning from past failures.

**Requirements:**

1. **Learning Aggregation:**
   - Read `.2L/global-learnings.yaml`
   - Filter patterns by status: IDENTIFIED
   - Detect recurring patterns (same root_cause × multiple projects)
   - Rank patterns by impact: `severity × occurrences × recurrence_risk`

2. **Vision Auto-Generation:**
   - Select top 2-3 patterns by impact score
   - Generate vision.md with:
     - Problem statement (synthesized from pattern issues)
     - Root cause analysis (from pattern data)
     - Proposed solution (from pattern solutions)
     - Affected components (agents/commands to modify)
     - Success criteria (prevent recurrence)
   - Use template: `.claude/templates/improvement-vision.md`
   - Save to: `.2L/plan-{N}/vision.md`

3. **Confirmation Workflow:**
   - Display proposed improvements to user
   - Show:
     - Patterns detected (with evidence: project names, occurrence count)
     - Generated vision.md preview
     - Files to be modified (never include commands/2l-mvp.md)
   - Require explicit confirmation before self-modification
   - Options:
     - **Proceed:** Auto-run `/2l-mvp` in meditation space
     - **Edit:** Save vision, wait for manual `/2l-mvp`
     - **Cancel:** Abort without changes

4. **Self-Modification Safety:**
   - **CRITICAL:** Never modify `commands/2l-mvp.md` (orchestrator itself)
   - Only modify: `agents/*.md`, `commands/2l-*.md` (except 2l-mvp), `lib/*.sh`, `lib/*.py`
   - Verify symlinks intact before modifying
   - Git commit after each successful improvement
   - Emit events for observability

5. **Status Update After Completion:**
   - After /2l-mvp completes successfully:
     - Update pattern status: IDENTIFIED → IMPLEMENTED
     - Add metadata: `implemented_in_plan`, `implemented_at`, `vision_file`
   - Save updated global-learnings.yaml

6. **Manual Override:**
   - `/2l-improve --manual`: Show patterns, save vision.md, exit (user runs /2l-mvp manually)
   - `/2l-improve --dry-run`: Show what would be done without making changes

**Success Criteria:**
- /2l-improve aggregates learnings from 3+ projects successfully
- Pattern detection identifies recurring issues (tested with synthetic data)
- Vision auto-generation produces valid vision.md (matches template schema)
- Confirmation workflow prevents accidental self-modification (requires explicit "yes")
- 2L successfully modifies at least 1 agent/command file end-to-end
- Status updates prevent duplicate fixes (re-running /2l-improve skips IMPLEMENTED patterns)
- Events logged for dashboard visibility

---

## Technical Constraints

1. **Meta-Circular Safety:**
   - Never modify the orchestrator (2l-mvp.md) during self-improvement
   - Always git commit before and after modifications
   - Abort on git conflicts, notify user

2. **Data Quality:**
   - Vision auto-generation quality depends on learning data quality
   - Require minimum 2 occurrences for pattern detection
   - Minimum severity: "medium" for auto-improvement

3. **Backward Compatibility:**
   - Existing /2l-vision workflow must continue to work
   - Global-learnings.yaml schema extension must be backward compatible
   - Graceful degradation if status field missing (assume IDENTIFIED)

4. **Performance:**
   - /2l-improve scan time must be <5s (trivial with current data volumes)
   - Vision generation time must be <10s

---

## Integration Points

1. **With Iteration 1:**
   - Reads global-learnings.yaml created by orchestrator reflection
   - Extends schema with status tracking
   - Builds on learning capture foundation

2. **With Existing 2L:**
   - Uses existing /2l-mvp for orchestration
   - Uses existing event system for observability
   - Uses existing symlink architecture for immediate deployment

3. **With Git:**
   - Auto-commits after improvements
   - Tags: `2l-improve-{pattern-id}`
   - Enables rollback if self-modification breaks something

---

## Out of Scope

- Manual verification workflow (/2l-verify) - Future iteration
- Learning deletion/archival - Future iteration
- Pattern visualization dashboard - Future iteration
- Multi-pattern improvements in single vision - Start with 1 pattern per vision for MVP

---

## Estimated Complexity

**Complexity:** HIGH
**Estimated Hours:** 10-14
**Critical Risks:**
- Meta-circular self-modification safety
- Pattern detection false positives
- Vision auto-generation quality
- Git conflicts during self-modification

---

*Derived from: .2L/plan-5/master-plan.yaml iteration 2*
*Created: 2025-11-19T04:15:00Z*
