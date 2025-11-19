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

3. **Learning Aggregation System with Status Tracking**
   - Description: Scan all `.2L/` directories, merge learnings, and track status lifecycle to prevent duplicate fixes
   - User story: As 2L, I want to aggregate learnings and track which ones have been fixed so I don't try to fix the same issue repeatedly
   - Acceptance criteria:
     - [ ] Scan `Prod/**/.2L/learnings.yaml` files
     - [ ] Merge into `.2L/global-learnings.yaml` with project attribution
     - [ ] Detect duplicate learnings (same issue across projects, merge into single pattern)
     - [ ] Track learning status: IDENTIFIED → IMPLEMENTED → VERIFIED
     - [ ] New learnings default to status: IDENTIFIED
     - [ ] After `/2l-improve` implements fix: Update status to IMPLEMENTED, add implemented_in field
     - [ ] After validation passes on fixed issue: Update status to VERIFIED
     - [ ] `/2l-improve` only shows learnings with status: IDENTIFIED (skip already fixed)

4. **Orchestrator Reflection (in `/2l-mvp`)**
   - Description: Add reflection logic to orchestrator at end of each iteration - not a separate agent, just orchestrator code
   - User story: As the orchestrator, I want to aggregate iteration learnings and update global knowledge base after each iteration completes
   - Acceptance criteria:
     - [ ] After validation PASSES (including after healing), before git commit
     - [ ] If learnings.yaml exists in iteration directory, merge into global-learnings.yaml
     - [ ] Mark new learnings with status: IDENTIFIED, add discovered_in field (plan-N-iter-M)
     - [ ] Add iteration metadata to learnings (duration, healing_rounds, files_modified)
     - [ ] No new agent spawned - just orchestrator logic
     - [ ] Happens automatically every iteration (not a command)
     - [ ] Log event: "Reflection complete - N learnings added to global knowledge base"

5. **`/2l-improve` Command**
   - Description: Automated self-improvement workflow - aggregates learnings, detects patterns, auto-generates vision, and orchestrates improvements with confirmation
   - User story: As Ahiya, I want 2L to improve itself based on patterns from past projects without requiring manual vision creation (data-driven, not conversation-driven)
   - Acceptance criteria:
     - [ ] Reads `.2L/global-learnings.yaml` (already aggregated by orchestrator)
     - [ ] Filters to only show learnings with status: IDENTIFIED (skip IMPLEMENTED/VERIFIED)
     - [ ] Detects recurring patterns (same issue across multiple projects)
     - [ ] Ranks by impact (severity × occurrences)
     - [ ] Auto-generates vision.md from top 2-3 high-impact patterns
     - [ ] Presents proposed improvements with severity and affected files
     - [ ] Shows confirmation prompt: "Proceed with /2l-mvp? [Y/n]"
     - [ ] On confirmation, automatically runs /2l-mvp in meditation space
     - [ ] After /2l-mvp completes, marks learnings as status: IMPLEMENTED
     - [ ] Manual override available: /2l-improve --manual (shows patterns, waits for /2l-vision)
     - [ ] Changes are immediately live via symlinks when implemented

### Should-Have (Post-MVP)

1. **Pattern Detection Agent (`2l-meta-analyzer`)** - Identifies recurring issues across projects and suggests systemic improvements
2. **Success Pattern Extraction** - Not just failures - capture what worked well (e.g., "4 parallel explorers consistently reduce blind spots")
3. **Learning Status Dashboard** - Visualize learnings pipeline: identified → planned → implemented → verified

### Could-Have (Future)

1. **Learning Query Interface** - `/2l-learnings grep "validation"` to find related insights
2. **Cross-Project Analytics Dashboard** - Visual analysis: "SplitEasy and ai-mafia both struggled with integration zones - systemic issue?"
3. **Learning Impact Tracking** - Measure before/after metrics when improvements are implemented

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
4. Detects patterns and ranks by impact (e.g., "grep validation failed in 3 projects - HIGH severity")
5. Auto-generates vision.md from top 2-3 patterns (data becomes requirements)
6. Displays proposed changes with affected files
7. Asks: "Proceed with /2l-mvp? [Y/n]"
8. If confirmed: Automatically runs `/2l-mvp` in meditation space
9. 2L orchestrates improvements to itself (modifies agents/commands)
10. Changes committed and pushed to GitHub
11. Next orchestration uses improved system (via symlinks)

**Edge cases:**
- No new learnings since last run: "No patterns detected. System is stable."
- Too many patterns (>5): Prioritize by severity×occurrences, implement top 3
- User declines (n): Vision saved for review, suggests `/2l-vision` for manual refinement
- Manual mode (`/2l-improve --manual`): Shows patterns, waits for user to run `/2l-vision`

**Error handling:**
- Git conflicts during self-modification: Abort orchestration, notify user to resolve manually
- Symlink broken: Cannot modify running system, fail with clear message
- Vision generation fails: Fall back to manual mode, suggest `/2l-vision`

---

## Data Model Overview

**Key entities:**

1. **Learning (Per-iteration)**
   - Fields: id, iteration, category (validation|integration|healing), severity (critical|medium|low), issue, root_cause, solution, recurrence_risk, affected_files
   - Metadata: duration_seconds, healing_rounds, files_modified (added by orchestrator)
   - Relationships: Belongs to project, belongs to iteration

2. **Global Learning Pattern**
   - Fields: pattern_id, name, occurrences, projects[], severity, root_cause, proposed_solution
   - Status: IDENTIFIED (new) | IMPLEMENTED (fixed) | VERIFIED (confirmed working)
   - Tracking: discovered_in (plan-N-iter-M), implemented_in (plan-N-iter-M), verified_at (timestamp)
   - Relationships: Aggregates multiple Learning entries from different projects

3. **Iteration**
   - Fields: iteration_id, status, learnings_file (path to learnings.yaml)
   - Relationships: Has many Learnings
   - Lifecycle: At iteration end, orchestrator merges learnings into global-learnings.yaml

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
- Learning UI/dashboard (CLI only for MVP)
- Learning versioning/history (single global-learnings.yaml for now)
- Cross-repository learning aggregation (only projects in Prod/ for MVP)
- Learning impact metrics (before/after comparison)

**Why:** Focus on closing the reflection loop first. Advanced analytics and automation come after proving the core concept.

---

## Assumptions

1. Validators can reliably identify root causes (or mark as UNKNOWN)
2. Symlinks work correctly on target system (Linux/macOS)
3. Projects in `Prod/` directory all have `.2L/` structure
4. Healing agent can be spawned multiple times per iteration
5. Learnings data is sufficient to auto-generate actionable vision (no human conversation needed)

---

## Open Questions

1. Should learning capture happen on PASS validations too (to capture what worked)?
2. How many healing rounds before escalating to user? (Currently: 2 max)
3. What's the format for learning IDs? (project-YYYYMMDD-NNN? UUID?)
4. Should `/2l-improve` support selective pattern implementation? ("Fix #1 and #3, skip #2")

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

### Two Vision Workflows: Human-Driven vs. Data-Driven

2L supports two distinct workflows for creating visions, each optimized for its use case:

**Human-Driven Vision (`/2l-vision`) - Building NEW Projects**

```bash
Use case: Creating something new (ghstats, SplitEasy, ai-mafia)
Input: Human intent and creativity
Process: Interactive conversation
  - "What problem are you solving?"
  - "Who are the users?"
  - "What are the must-have features?"
Output: vision.md (from human imagination)
Next: /2l-mvp implements the vision
```

**When to use:** You have an idea but no data. Vision comes from your head.

---

**Data-Driven Vision (`/2l-improve`) - Improving 2L ITSELF**

```bash
Use case: Self-improvement based on learnings
Input: Accumulated learnings from past projects
Process: Automated analysis
  - Scans Prod/**/.2L/learnings.yaml
  - Detects recurring patterns
  - Ranks by severity × occurrences
  - Auto-generates vision from top patterns
Output: vision.md (from data analysis)
Confirmation: "Proceed with /2l-mvp? [Y/n]"
Next: Automatically runs /2l-mvp (if confirmed)
```

**When to use:** You have data (learnings). The patterns ARE the requirements.

---

**Why This Distinction Matters:**

For new projects, conversation is essential:
- No existing data
- Requirements emerge through exploration
- Human creativity drives the vision

For self-improvement, conversation is redundant:
- Learnings contain: issue, root_cause, solution, affected_files
- Data is already structured requirements
- Vision writes itself from the patterns

**Example:**

```
Learning says:
  issue: "Grep pattern '{.*}' matched CSS braces"
  root_cause: "Validation pattern too broad"
  solution: "Use '{[A-Z_]+}' for placeholders only"
  affected_files: ["commands/2l-dashboard.md"]

Vision auto-generated:
  Feature: Fix grep validation pattern
  Description: [from root_cause]
  Solution: [from solution]
  Files to modify: [from affected_files]

No conversation needed - data contains full spec.
```

This design respects the source of truth:
- **Human creativity** → `/2l-vision` (conversation reveals requirements)
- **System data** → `/2l-improve` (learnings are requirements)

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
  # New pattern - ready for /2l-improve
  - pattern_id: PATTERN-001
    name: "Integration re-validation gap"
    occurrences: 3
    projects: [SplitEasy, ai-mafia, ShipLog]
    severity: high
    root_cause: "Healing runs but success not verified"
    proposed_solution: "Add validation checkpoint after healing"
    status: IDENTIFIED
    discovered_in: plan-3-iter-2
    discovered_at: 2025-11-10T08:47:00Z

  # Fixed but not yet verified
  - pattern_id: PATTERN-002
    name: "Grep pattern validation failures"
    occurrences: 2
    projects: [ghstats, SplitEasy]
    severity: medium
    root_cause: "Generic regex matches too broadly"
    proposed_solution: "Use '{[A-Z_]+}' for placeholder validation"
    status: IMPLEMENTED
    discovered_in: plan-1-iter-1
    implemented_in: plan-5-iter-1
    implemented_at: 2025-11-19T15:30:00Z

  # Confirmed working - won't show in /2l-improve
  - pattern_id: PATTERN-003
    name: "Parallel explorers reduce blind spots"
    occurrences: 5
    projects: [ALL]
    severity: low
    type: success_pattern
    insight: "4 master explorers consistently identify different architectural concerns"
    recommendation: "Keep current parallel exploration strategy"
    status: VERIFIED
    discovered_in: plan-2-iter-1
    verified_at: 2025-11-08T18:00:00Z
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
