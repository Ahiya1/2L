# Project Vision: 2L Self-Improvement - Complete `/2l-improve` Implementation

**Created:** 2025-11-27T02:00:00Z
**Plan:** plan-9
**Type:** Self-Improvement (Meta-Circular Enhancement)

---

## Problem Statement

The `/2l-improve` command currently has critical gaps that prevent effective self-improvement cycles. The 2L framework can detect recurring patterns across projects, but cannot effectively fix them due to missing implementation in the exploration phase.

**Current pain points:**

- **Lines 358-410 of `/2l-improve`:** Creates placeholder exploration reports instead of spawning real Task agents
- **No automatic reflection system:** Iterations complete without capturing 2L framework learnings
- **Visions lack architectural context:** Pattern-based visions are generated without analyzing the meditation space codebase
- **Integration guidance missing:** Builders don't know exactly which files/functions to modify
- **No verification loop:** Patterns marked IMPLEMENTED but never validated for non-recurrence

**Impact:**
- Self-improvement cycles fail at the exploration phase
- Pattern PATTERN-001 identified but cannot be auto-fixed
- Manual intervention required for every 2L framework improvement
- Knowledge accumulates but doesn't translate to action

---

## Target Users

**Primary user:** Ahiya (2L Framework Developer)
- Runs `/2l-improve` to fix recurring 2L framework issues
- Needs self-improvement to work end-to-end without manual coding
- Expects pattern detection → vision → implementation → verification

**Secondary user:** 2L Orchestrator (`/2l-mvp`)
- Consumes improved agents/commands/utilities
- Benefits from reflection-based learning
- Requires backward compatibility and safety

---

## Core Value Proposition

A fully functional meta-circular self-improvement system where 2L analyzes its own execution traces, detects recurring patterns, explores its own codebase, and autonomously implements improvements using its standard orchestration workflow.

**Key benefits:**
1. **Autonomous Evolution:** 2L improves itself without manual coding
2. **Knowledge Accumulation:** Every iteration creates reflections that feed future improvements
3. **Pattern-Driven:** High-impact issues fixed based on frequency and severity
4. **Safe Meta-Circularity:** Orchestrator exclusion and safety checkpoints prevent self-corruption
5. **Continuous Learning:** Improvement → Verification → Continuous monitoring cycle

---

## Feature Breakdown

### Must-Have (MVP)

#### 1. **Real Exploration Phase in `/2l-improve`**
   - Description: Replace placeholder reports with actual Task agent spawning to analyze meditation space
   - User story: As the `/2l-improve` orchestrator, I need to understand the 2L codebase architecture before generating visions so that improvement plans are actionable
   - Acceptance criteria:
     - [ ] Lines 358-410 spawn 3 Task agents (not create placeholders)
     - [ ] Explorer-1: Analyzes 2L agent architecture (`agents/*.md`)
     - [ ] Explorer-2: Analyzes tech patterns (`commands/*.md`, `lib/*.py`, `lib/*.sh`)
     - [ ] Explorer-3: Pattern-specific analysis (identifies exact files/functions for modification)
     - [ ] All 3 explorer reports generated before vision creation
     - [ ] Exploration context file created with pattern details
     - [ ] Explorers work in meditation space (`~/Ahiya/2L`)
     - [ ] Emit proper events: `exploration_start`, `agent_spawn` × 3, `agent_complete` × 3

#### 2. **Automatic Reflection Creation After Iterations**
   - Description: Add reflection generation to `/2l-mvp` orchestrator after successful iteration completion
   - User story: As the 2L orchestrator, I need to capture learnings about framework issues after each iteration so that patterns can be detected later
   - Acceptance criteria:
     - [ ] `/2l-mvp` creates `REFLECTION.md` after iteration validates successfully
     - [ ] Reflection categorizes issues by priority: Functionality > Completeness > Speed
     - [ ] Reflection format includes: What Went Well, 2L Framework Issues, Root Causes, Suggested Improvements
     - [ ] Reflection stored at `.2L/plan-N/iteration-M/REFLECTION.md`
     - [ ] Reflection appended to `global-learnings.jsonl` via Python utility
     - [ ] Event emitted: `reflection_created`
     - [ ] Works in both project directories and meditation space

#### 3. **Enhanced Vision Generation with Exploration Context**
   - Description: Improve vision generator to incorporate exploration findings
   - User story: As a vision generator, I need exploration context so that visions specify exactly where to make changes
   - Acceptance criteria:
     - [ ] `lib/2l-vision-generator.py` reads exploration reports
     - [ ] Vision includes "Affected Components" section with specific file paths
     - [ ] Vision includes "Integration Points" from explorer-3 report
     - [ ] Vision includes "Architectural Context" from explorer-1 report
     - [ ] Vision includes "Technical Patterns" from explorer-2 report
     - [ ] Acceptance criteria reference specific functions/sections to modify
     - [ ] Template: `templates/improvement-vision.md` enhanced

#### 4. **Pattern Lifecycle Management**
   - Description: Track patterns through full lifecycle with verification
   - User story: As `/2l-improve`, I need to track pattern status from detection to verification so that improvements are confirmed
   - Acceptance criteria:
     - [ ] Pattern states: IDENTIFIED → IMPLEMENTED → VERIFIED → (REGRESSED if recurs)
     - [ ] Update to IMPLEMENTED after successful `/2l-mvp` completion
     - [ ] Monitor next 3 iterations for recurrence
     - [ ] Transition IMPLEMENTED → VERIFIED if no recurrence in 3 iterations
     - [ ] Transition IMPLEMENTED → REGRESSED if pattern recurs
     - [ ] Python utility: `lib/2l-pattern-lifecycle.py`
     - [ ] Events: `pattern_implemented`, `pattern_verified`, `pattern_regressed`

#### 5. **Reflection Aggregation System**
   - Description: Convert iteration reflections into global learnings database
   - User story: As `/2l-mvp`, I need to aggregate reflections into patterns so that `/2l-improve` can detect recurring issues
   - Acceptance criteria:
     - [ ] Python utility: `lib/2l-reflection-aggregator.py`
     - [ ] Reads all `REFLECTION.md` files across projects
     - [ ] Groups similar issues by root cause (fuzzy matching)
     - [ ] Calculates occurrence count, project count, severity
     - [ ] Computes impact score: `frequency × category_weight × severity_weight`
     - [ ] Category weights: functionality=3.0, completeness=2.0, speed=1.0
     - [ ] Updates `global-learnings.yaml` with new patterns
     - [ ] Appends raw learnings to `global-learnings.jsonl`
     - [ ] Called automatically after each iteration

### Should-Have (Post-MVP)

1. **Post-Modification Smoke Tests** - Validate 2L still works after self-improvement
2. **Pattern Recurrence Alerts** - Notify user when VERIFIED patterns regress
3. **Multi-Pattern Improvement** - Handle multiple patterns in single `/2l-improve` run
4. **Exploration Report Templates** - Standardize explorer output formats
5. **Learning Statistics Dashboard** - Visualize pattern trends over time

### Could-Have (Future)

1. **Machine Learning Pattern Detection** - Use embeddings for better grouping
2. **Automated Rollback on Regression** - Auto-revert if pattern recurs
3. **Cross-Project Learning Transfer** - Apply learnings from one project to others
4. **Interactive Pattern Prioritization** - Let user adjust impact scores
5. **SQLite Event/Learning Storage** - More efficient than JSONL for large datasets

---

## User Flows

### Flow 1: Complete Self-Improvement Cycle

**Steps:**
1. User runs `/2l-mvp` on any project → Iteration completes successfully
2. Orchestrator creates `REFLECTION.md` capturing 2L framework issues encountered
3. Reflection aggregator appends to `global-learnings.jsonl` and updates patterns
4. (After multiple iterations) User runs `/2l-improve`
5. Pattern detector finds recurring issue (e.g., PATTERN-001)
6. `/2l-improve` spawns 3 explorers to analyze meditation space
7. Explorers generate reports with architectural context
8. Vision generator creates improvement vision with specific file targets
9. User confirms self-improvement
10. `/2l-improve` invokes `/2l-mvp` in meditation space
11. `/2l-mvp` explores, plans, builds, integrates, validates improvement
12. Pattern status updates: IDENTIFIED → IMPLEMENTED
13. Next 3 iterations monitored for recurrence
14. If no recurrence: IMPLEMENTED → VERIFIED

**Edge cases:**
- Explorer reports missing: `/2l-improve` aborts with clear error
- Vision generation fails: User shown error, can retry or edit pattern
- `/2l-mvp` fails during self-modification: Auto-rollback to safety checkpoint
- Pattern recurs after fix: Status → REGRESSED, alerts user

**Error handling:**
- All errors logged to `.2L/plan-N/2l-improve-errors.log`
- Safety checkpoint created before self-modification
- Rollback available via git tag
- Smoke tests validate 2L still functional after changes

### Flow 2: Reflection Creation During Normal Development

**Steps:**
1. User runs `/2l-mvp` on project (e.g., StatViz)
2. Iteration completes (exploration → planning → building → integration → validation → PASS)
3. Orchestrator prompts itself: "What 2L framework issues did we encounter?"
4. Orchestrator analyzes iteration traces (.2L/plan-N/iteration-M/)
5. Creates `REFLECTION.md` with categorized issues
6. Calls `lib/2l-reflection-aggregator.py` to append to global learnings
7. User continues with next iteration
8. (Background) Aggregator updates pattern database

**Edge cases:**
- Iteration failed (healing): Reflection still created, includes healing issues
- No 2L issues encountered: Reflection records "No framework issues"
- Global learnings file locked: Retry with exponential backoff

---

## Data Model Overview

### Key Entities

#### 1. **Pattern**
   - Fields: `pattern_id`, `name`, `occurrences`, `projects[]`, `severity`, `root_cause`, `proposed_solution`, `status`, `discovered_at`, `implemented_at`, `verified_at`, `affected_files[]`
   - Relationships: Has many Learnings (source_learnings)
   - Storage: `global-learnings.yaml` (patterns section)

#### 2. **Learning**
   - Fields: `learning_id`, `timestamp`, `project`, `plan`, `iteration`, `category`, `issue`, `severity`, `root_cause`, `suggested_fix`, `pattern_id`
   - Relationships: Belongs to Pattern (via pattern_id)
   - Storage: `global-learnings.jsonl` (append-only)

#### 3. **Reflection**
   - Fields: `project`, `plan`, `iteration`, `what_went_well[]`, `framework_issues[]`, `root_causes[]`, `suggested_improvements[]`
   - Relationships: Generates multiple Learnings
   - Storage: `.2L/plan-N/iteration-M/REFLECTION.md` (per iteration)

#### 4. **Exploration Report**
   - Fields: `explorer_id`, `focus_area`, `files_analyzed[]`, `key_findings[]`, `integration_points[]`, `recommendations[]`
   - Relationships: Used by Vision Generator
   - Storage: `.2L/plan-N/exploration/explorer-{N}-report.md`

---

## Technical Requirements

### Must Support

- **Bash orchestration:** `/2l-improve` command remains bash script
- **Python utilities:** Pattern detection, reflection aggregation, vision generation
- **Task tool spawning:** Agents spawned via Claude Code Task tool
- **Event logging:** All phases emit events to `.2L/events.jsonl`
- **Git safety:** Checkpoints, rollback, symlink integrity
- **YAML/JSONL storage:** Human-readable, append-only, grep-able

### Constraints

- **Orchestrator exclusion:** NEVER modify `commands/2l-mvp.md`
- **Backward compatibility:** Graceful degradation if utilities missing
- **No database required:** File-based storage only
- **Meditation space isolation:** Self-improvement happens in `~/Ahiya/2L`
- **Symlink preservation:** All changes maintain symlinks to `~/.claude/`

### Preferences

- **Python 3.8+:** Use type hints, dataclasses, pathlib
- **YAML for config:** Human-editable configuration
- **JSONL for logs:** Streamable, append-only learning storage
- **Markdown for reports:** Human-readable exploration/reflection output
- **Event-driven:** Every phase change emits events

---

## Success Criteria

**The MVP is successful when:**

### 1. **End-to-End Self-Improvement Works**
   - Metric: Successfully fix PATTERN-001 using `/2l-improve`
   - Target:
     - Run `/2l-improve` → Selects PATTERN-001
     - Explorers spawn and generate reports
     - Vision created with specific file targets
     - `/2l-mvp` implements fix
     - Pattern status: IDENTIFIED → IMPLEMENTED
     - Verification: No recurrence in next 3 iterations → VERIFIED

### 2. **Reflections Accumulate Automatically**
   - Metric: Percentage of iterations that create reflections
   - Target: 100% of successful iterations have `REFLECTION.md`

### 3. **Exploration Phase Functional**
   - Metric: Zero placeholder reports in exploration phase
   - Target: All 3 explorer reports contain real analysis (not "Placeholder...")

### 4. **Pattern Detection Accurate**
   - Metric: Detected patterns match actual recurring issues
   - Target: Manual validation of 5 patterns shows 100% accuracy

### 5. **Safety Maintained**
   - Metric: Post-modification smoke tests pass
   - Target:
     - All commands executable
     - All agents have valid frontmatter
     - Event logging works
     - Symlinks valid
     - `/2l-status` runs without error

---

## Out of Scope

**Explicitly not included in MVP:**

- **Orchestrator modifications:** `commands/2l-mvp.md` remains untouched (safety)
- **Multi-pattern improvements:** Only one pattern per `/2l-improve` run
- **Interactive pattern selection:** Auto-selects top pattern by impact score
- **Regression auto-rollback:** Manual rollback only (automated in post-MVP)
- **Cross-project learning transfer:** Patterns detected but not auto-applied to other projects
- **ML-based pattern grouping:** Simple string similarity only
- **Real-time monitoring UI:** Dashboard shows events but not pattern trends

**Why:** Focus on getting core self-improvement cycle working end-to-end. Advanced features after MVP proven.

---

## Assumptions

1. **Meditation space is `~/Ahiya/2L`:** Self-improvement happens in 2L's own directory
2. **Global learnings in `.2L/global-learnings.yaml`:** Centralized pattern database
3. **Python 3 available:** All utilities require Python 3.8+
4. **Git repository exists:** Safety checkpoints require git
5. **Symlinks from `~/.claude/` to meditation space:** Install via `2l.sh install`
6. **Task tool available:** Claude Code environment with Task tool access
7. **Event logging library exists:** `~/.claude/lib/2l-event-logger.sh`

---

## Open Questions

1. **Should reflection creation be optional?** Or always mandatory after successful iterations?
   - **Recommendation:** Always create reflections (zero overhead, high value)

2. **How to handle exploration failures?** If one explorer fails, abort or continue?
   - **Recommendation:** Require all 3 explorers (critical for informed visions)

3. **Pattern similarity threshold?** What fuzzy match score groups issues as same pattern?
   - **Recommendation:** 0.8 similarity (80% match) - tune after data collection

4. **Verification lookback window?** How many iterations to monitor for recurrence?
   - **Recommendation:** 3 iterations (balances confidence vs. speed)

5. **Should patterns auto-detect from existing code?** Or only from reflections?
   - **Recommendation:** Reflections only (explicit issues, not speculation)

---

## Affected Components

Based on exploration and pattern analysis:

### Files to Create

1. **`lib/2l-reflection-aggregator.py`** - Aggregates reflections into patterns
2. **`lib/2l-pattern-lifecycle.py`** - Manages pattern status transitions
3. **`templates/improvement-vision.md`** - Vision template with exploration context
4. **`templates/reflection-template.md`** - Standard reflection format

### Files to Modify

1. **`commands/2l-improve.md`**
   - Lines 358-410: Replace placeholders with Task agent spawning
   - Add pattern lifecycle updates after `/2l-mvp` completion
   - Enhance safety checks with smoke tests

2. **`commands/2l-mvp.md`**
   - Add reflection creation after successful iteration
   - Call reflection aggregator
   - Emit `reflection_created` event

3. **`lib/2l-vision-generator.py`**
   - Read exploration reports from `.2L/plan-N/exploration/`
   - Incorporate architectural context into vision
   - Generate specific file/function targets

4. **`lib/2l-pattern-detector.py`**
   - Add category-based impact scoring
   - Filter by pattern status (only IDENTIFIED)
   - Enhanced pattern grouping logic

### Integration Points

- **Exploration spawning:** Use Task tool with 3 parallel agents
- **Reflection aggregation:** Hook into iteration completion flow
- **Vision generation:** Pipeline: Pattern → Exploration → Vision
- **Event logging:** All phases emit to `.2L/events.jsonl`
- **Safety validation:** Post-modification smoke tests

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning (or auto-plan via `/2l-mvp`)
- [ ] Execute plan to implement complete self-improvement system
- [ ] Test end-to-end with PATTERN-001 as validation case
- [ ] Monitor for 3 iterations to verify pattern no longer recurs

---

**Vision Status:** VISIONED
**Ready for:** Master Planning (`/2l-plan`) or Auto-Execution (`/2l-mvp`)
**Priority:** HIGH (Core meta-circular capability)
**Complexity Estimate:** COMPLEX (7-9 components, bash + Python, meta-circular)
