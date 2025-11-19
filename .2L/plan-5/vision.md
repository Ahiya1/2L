# Project Vision: 2L Self-Reflection Infrastructure

**Created:** 2025-11-19T02:55:00Z
**Plan:** plan-5

---

## Problem Statement

2L orchestrates complex development tasks brilliantly but lacks systematic self-improvement. It catches critical issues during validation (grep pattern bugs, integration failures, healing incompleteness) but these learnings don't feed back into the orchestrator itself.

**Current pain points:**
- Same issues recur across multiple projects (validation found grep pattern bug in SplitEasy, ai-mafia, ShipLog)
- Healing runs but success isn't re-validated (validation → healing → hope it worked)
- No mechanism to aggregate insights from multiple orchestrations
- Improvements to 2L require manual analysis and coding
- The reflection → action loop is incomplete

**The Gap:** 2L can observe its work but cannot systematically learn from it and evolve.

---

## Target Users

**Primary user:** Ahiya - the orchestrator who wants 2L to improve itself through use

**Secondary user:** Future Ahiya - benefiting from accumulated wisdom when running `/2l-improve`

**Tertiary users:** Any developer using 2L who wants the system to get smarter over time

---

## Core Value Proposition

2L becomes self-correcting through use. Every project makes it better for the next one.

**Key benefits:**
1. **Systematic improvement** - No more manual "I should fix that grep pattern" notes scattered across projects
2. **Compound learning** - 10 projects = 10x the wisdom, automatically aggregated and actionable
3. **Meta-orchestration** - 2L uses itself to improve itself (recursive power unlocked)

---

## Feature Breakdown

### Must-Have (MVP)

1. **Per-iteration Learning Capture**
   - Description: Validators automatically output structured learnings when issues are found
   - User story: As a validator agent, I want to emit learnings when I discover bugs so that the system can learn from failures
   - Acceptance criteria:
     - [ ] Validators create `learnings.yaml` in iteration directory when FAIL occurs
     - [ ] Learning format includes: issue, root_cause, solution, severity, affected_files
     - [ ] Learnings created for both critical and medium severity issues
     - [ ] Format is machine-readable YAML for aggregation

2. **Re-validation Checkpoint**
   - Description: After healing completes, automatically re-run validation to verify the fix worked
   - User story: As an orchestrator, I want to verify healing actually fixed the issue before marking iteration complete
   - Acceptance criteria:
     - [ ] After healer completes, spawn validator again
     - [ ] If re-validation FAILS, trigger escalation (second healing round or manual intervention)
     - [ ] Only mark iteration COMPLETE if re-validation PASSES
     - [ ] Log re-validation events to events.jsonl

3. **Learning Aggregation System**
   - Description: Scan all `.2L/` directories across projects and merge learnings into global knowledge base
   - User story: As 2L, I want to aggregate all learnings from past projects so I can identify patterns
   - Acceptance criteria:
     - [ ] Scan `Prod/**/.2L/learnings.yaml` files
     - [ ] Merge into `.2L/global-learnings.yaml` with project attribution
     - [ ] Detect duplicate learnings (same issue across projects)
     - [ ] Track learning status: IDENTIFIED → PLANNED → IMPLEMENTED → VERIFIED

4. **`/2l-improve` Command**
   - Description: Trigger self-improvement orchestration based on accumulated learnings
   - User story: As Ahiya, I want to run `/2l-improve` to have 2L improve itself based on what it learned
   - Acceptance criteria:
     - [ ] Aggregates learnings from all Prod/ projects
     - [ ] Generates vision.md for 2L improvements
     - [ ] Triggers `/2l-mvp` in meditation space (~/Ahiya/2L)
     - [ ] 2L modifies its own agents/commands in place
     - [ ] Changes are immediately live via symlinks

### Should-Have (Post-MVP)

1. **Pattern Detection Agent (`2l-meta-analyzer`)** - Identifies recurring issues across projects and suggests systemic improvements
2. **Success Pattern Extraction** - Not just failures - capture what worked well (e.g., "4 parallel explorers consistently reduce blind spots")
3. **Learning Status Dashboard** - Visualize learnings pipeline: identified → planned → implemented → verified

### Could-Have (Future)

1. **Automatic Improvement Application** - `/2l-improve --auto` runs without human confirmation
2. **Learning Query Interface** - `/2l-learnings grep "validation"` to find related insights
3. **Cross-Project Analytics** - "SplitEasy and ai-mafia both struggled with integration zones - systemic issue?"

---

## User Flows

### Flow 1: Learning Capture During Validation

**Steps:**
1. Orchestrator runs iteration, spawns validator
2. Validator discovers critical bug (e.g., grep pattern matching CSS)
3. Validator creates `learnings.yaml` with structured learning
4. Validator returns FAIL status to orchestrator
5. Orchestrator spawns healer based on learning

**Edge cases:**
- Multiple issues in one validation: Create multiple learning entries in same file
- Issue with unclear root cause: Mark root_cause as "UNKNOWN - requires investigation"

**Error handling:**
- Learning file creation fails: Log warning but continue (graceful degradation)

### Flow 2: Re-validation After Healing

**Steps:**
1. Healer completes work, reports COMPLETE
2. Orchestrator spawns validator again (re-validation)
3. Validator runs same checks as before
4. If PASS: Mark iteration COMPLETE, commit to git
5. If FAIL: Spawn healer again (second attempt) OR escalate to user

**Edge cases:**
- Healing introduced new bugs: Re-validation catches them, triggers second healing round
- Healer reports COMPLETE but didn't actually fix issue: Re-validation catches mismatch

**Error handling:**
- Re-validation fails to spawn: Log error, mark iteration INCOMPLETE, notify user

### Flow 3: Self-Improvement with `/2l-improve`

**Steps:**
1. User runs `/2l-improve` from `~/Ahiya/2L/`
2. Command scans `Prod/**/.2L/learnings.yaml` files
3. Aggregates into `.2L/global-learnings.yaml`
4. Analyzes patterns (e.g., "grep validation failed in 3 projects")
5. Generates vision.md for improvements
6. User reviews vision, runs `/2l-mvp`
7. 2L orchestrates improvements to itself
8. Changes committed and pushed to GitHub

**Edge cases:**
- No learnings found: Inform user "No new learnings since last improvement"
- Conflicting learnings: Present both to vision, let planner decide

**Error handling:**
- Git conflicts during self-modification: Abort, notify user to resolve manually
- Symlink broken: Cannot modify running system, fail gracefully

---

## Data Model Overview

**Key entities:**

1. **Learning**
   - Fields: id, iteration, category (validation|integration|healing), severity (critical|medium|low), issue, root_cause, solution, recurrence_risk, affected_files
   - Relationships: Belongs to project, belongs to iteration

2. **Global Learning Pattern**
   - Fields: pattern_id, name, occurrences, projects[], severity, root_cause, proposed_solution, status (IDENTIFIED|PLANNED|IMPLEMENTED|VERIFIED)
   - Relationships: Aggregates multiple Learning entries

3. **Iteration**
   - Fields: iteration_id, status, learnings_file (path to learnings.yaml)
   - Relationships: Has many Learnings

---

## Technical Requirements

**Must support:**
- YAML format for learnings (machine-readable, human-editable)
- Symlink-based installation (changes to ~/Ahiya/2L/ must affect ~/.claude/ immediately)
- Git integration (auto-commit after self-improvement)
- Graceful degradation (if learning capture fails, orchestration continues)

**Constraints:**
- Cannot break existing orchestrations (backward compatibility)
- Must work with current 10-agent architecture
- Learnings must be append-only (never delete historical data)

**Preferences:**
- Use existing event system for re-validation tracking
- Reuse validator agent (don't create new validator)
- Keep `/2l-improve` command simple (<200 lines)
- Document meditation space concept in README

---

## Success Criteria

**The MVP is successful when:**

1. **Learning capture works**
   - Metric: Run validation on any project, check for learnings.yaml
   - Target: 100% of FAIL validations create learnings.yaml

2. **Re-validation prevents false completion**
   - Metric: Trigger healing that doesn't fix issue, check if iteration stays INCOMPLETE
   - Target: 0% false COMPLETE status (healing must pass re-validation)

3. **Aggregation works**
   - Metric: Run `/2l-improve`, count entries in global-learnings.yaml
   - Target: Aggregate learnings from 3+ projects (ghstats, SplitEasy, ai-mafia)

4. **Self-orchestration works**
   - Metric: `/2l-improve` spawns 2L to modify itself, check git diff
   - Target: 2L successfully modifies at least 1 agent or command file

---

## Out of Scope

**Explicitly not included in MVP:**
- Full meta-analyzer agent (Phase 2 feature)
- Automated learning application (requires human review in MVP)
- Learning UI/dashboard (CLI only for MVP)
- Learning versioning/history (single global-learnings.yaml for now)
- Cross-repository learning aggregation (only projects in Prod/ for MVP)

**Why:** Focus on closing the reflection loop first. Advanced analytics and automation come after proving the core concept.

---

## Assumptions

1. Validators can reliably identify root causes (or mark as UNKNOWN)
2. Symlinks work correctly on target system (Linux/macOS)
3. Projects in `Prod/` directory all have `.2L/` structure
4. Healing agent can be spawned multiple times per iteration
5. User reviews vision before running `/2l-mvp` for self-improvement

---

## Open Questions

1. Should learning capture happen on PASS validations too (to capture what worked)?
2. How many healing rounds before escalating to user? (Currently: 2 max)
3. Should `/2l-improve` auto-generate vision or require user conversation?
4. What's the format for learning IDs? (project-YYYYMMDD-NNN? UUID?)

---

## Implementation Notes

### Meditation Space Architecture

The `~/Ahiya/2L/` directory serves dual purpose:

1. **Source Repository** - Contains agents, commands, lib that define 2L
2. **Meditation Space** - Where 2L reflects on itself through `.2L/` and `Prod/`

```
~/Ahiya/2L/
├── .2L/                     (2L's own evolution)
│   ├── config.yaml
│   ├── global-learnings.yaml
│   └── plan-5/
│
├── Prod/                    (Projects 2L builds - evidence of capability)
│   ├── ghstats/
│   ├── SplitEasy/
│   └── ai-mafia/
│
├── agents/                  (What gets improved)
├── commands/                (What gets improved)
└── lib/                     (What gets improved)
```

**Symlink Strategy:**
```
~/.claude/agents/   -> ~/Ahiya/2L/agents/
~/.claude/commands/ -> ~/Ahiya/2L/commands/
~/.claude/lib/      -> ~/Ahiya/2L/lib/
```

When 2L modifies `~/Ahiya/2L/agents/2l-validator.md` during self-improvement, the change is immediately live in `~/.claude/agents/2l-validator.md`.

### Learning File Format

```yaml
# Prod/ghstats/.2L/plan-1/iteration-1/learnings.yaml
project: ghstats
learnings:
  - id: ghstats-20251119-001
    iteration: plan-1-iter-1
    category: validation
    severity: critical
    issue: "Grep pattern '{.*}' matched CSS braces instead of placeholders"
    root_cause: "Validation pattern too broad - matches any braces"
    solution: "Use '{[A-Z_]+}' to match only uppercase placeholder names"
    recurrence_risk: high
    affected_files:
      - "commands/2l-dashboard.md"
```

### Global Learnings Format

```yaml
# .2L/global-learnings.yaml
aggregated: 2025-11-19T03:00:00Z
total_projects: 5
total_learnings: 23

patterns:
  - pattern_id: PATTERN-001
    name: "Integration re-validation gap"
    occurrences: 3
    projects: [SplitEasy, ai-mafia, ShipLog]
    severity: high
    root_cause: "Healing runs but success not verified"
    proposed_solution: "Add validation checkpoint after healing"
    status: IDENTIFIED

  - pattern_id: PATTERN-002
    name: "Grep pattern validation failures"
    occurrences: 2
    projects: [ghstats, SplitEasy]
    severity: medium
    root_cause: "Generic regex matches too broadly"
    proposed_solution: "Use specific patterns for placeholder validation"
    status: IDENTIFIED
```

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-mvp` to implement self-reflection infrastructure
- [ ] Test learning capture on new project
- [ ] Test `/2l-improve` aggregation
- [ ] Run first self-improvement orchestration

---

**Vision Status:** VISIONED
**Ready for:** Master Planning & Implementation

---

## The Philosophical Foundation

This plan closes the loop that makes 2L truly recursive:

```
Build projects → Learnings accumulate
      ↑                     ↓
  Improved 2L ← /2l-improve ← Reflection
```

2L already **is** a self-improving system (4 completed plans improving itself prove it). This plan adds the **steering wheel** (systematic reflection) and **odometer** (learning aggregation) so it remembers the road it's traveled.

The meditation space is where 2L:
- **Observes** its work across projects
- **Reflects** on patterns and failures
- **Acts** to improve itself
- **Returns** stronger to build the next thing

This is the architecture that **learns**.
