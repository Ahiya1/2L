# Project Vision: Cross-Project Learning Aggregation

**Created:** 2025-11-27T16:20:00Z
**Plan:** plan-10
**Context:** Meta-circular framework improvement for 2L orchestrator

---

## Problem Statement

The 2L framework's self-improvement loop is incomplete. While Plan-9 implemented automatic reflection generation and pattern aggregation, the system currently suffers from two critical gaps:

**Gap 1: Learning Isolation**
- Framework issues discovered during real project work in `~/Ahiya/2L/Prod/*` stay isolated in those projects
- `/2l-improve` only reads `~/Ahiya/2L/.2L/global-learnings.jsonl` (meditation space's own iterations)
- Misses valuable framework issues discovered across the entire production project ecosystem

**Gap 2: Reflection Scope Confusion**
- Reflection generator doesn't distinguish between **framework issues** vs **project issues**
- Currently captures app bugs, app performance, and app features as "learnings"
- Should ONLY capture issues with the 2L orchestrator/agents/tools themselves
- Priority categorization is unclear:
  - P3 should be **framework performance** (agent spawn slow, integration slow)
  - NOT app performance (project builds slow, app queries slow)

**Impact:**
- The meditation space doesn't learn from real-world usage patterns
- Framework issues get rediscovered multiple times across different projects
- Pattern aggregation misses cross-project evidence
- Reflection files contain noise (project-specific issues mixed with framework issues)

---

## Target Users

**Primary user:** Framework maintainer (you) working in `~/Ahiya/2L` meditation space

**Usage context:**
- Running `/2l-improve` in meditation space to fix framework issues
- Expecting to see patterns from ALL Prod/* projects
- Need clear signal (framework issues) vs noise (project issues)

---

## Core Value Proposition

Complete the meta-circular learning loop: the 2L framework learns from ALL projects using it, creating an ecosystem-wide feedback loop between production usage and framework improvement.

**Key benefits:**
1. **Ecosystem-wide learning**: See framework issues discovered across StatViz, TaskManager, BlogEngine, etc.
2. **Cross-project pattern evidence**: "Integration phase slow" detected in 3 different projects → high-confidence pattern
3. **Clean signal**: Reflections only capture framework issues, not project bugs
4. **Zero manual work**: Automatic federation when projects run in Prod/* directory

---

## Feature Breakdown

### Must-Have (MVP)

1. **Multi-Source Learning Discovery**
   - Description: `/2l-improve` discovers and reads learnings from all Prod/* projects
   - User story: As a framework maintainer, I want `/2l-improve` to aggregate learnings from all production projects so I can see framework issues discovered across my entire ecosystem
   - Acceptance criteria:
     - [ ] Glob pattern finds all `~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl` files
     - [ ] Aggregator combines learnings from meditation space + all Prod/* projects
     - [ ] Missing files handled gracefully (new projects without learnings yet)
     - [ ] Only runs when in meditation space (`~/Ahiya/2L`)

2. **Framework-Only Filtering**
   - Description: Reflection generator only captures framework issues, not project issues
   - User story: As a framework maintainer, I want reflections to contain only 2L orchestrator/agent issues so I don't waste time on project-specific bugs
   - Acceptance criteria:
     - [ ] Framework keywords expanded and refined (orchestrator, explorer, builder, integrator, validator, healer, task tool, agent spawn, etc.)
     - [ ] Project-specific issues filtered out (app bugs, business logic, UI issues)
     - [ ] Clear heuristic: "Is this an issue with the 2L framework itself?" → YES = capture, NO = ignore
     - [ ] Documentation of what qualifies as "framework issue"

3. **Priority Classification Clarity**
   - Description: Fix P1/P2/P3 categorization to focus on framework, not projects
   - User story: As a framework maintainer, I want P3 to mean "framework is slow" not "app is slow" so I can prioritize framework performance improvements correctly
   - Acceptance criteria:
     - [ ] P1 (Functionality): 2L workflow broken (agent crashes, orchestrator fails, etc.)
     - [ ] P2 (Completeness): 2L missing features (no healing phase, can't spawn tasks, etc.)
     - [ ] P3 (Speed): 2L framework performance (agent spawn slow, integration phase slow, NOT app build slow)
     - [ ] Updated docstrings and comments clarifying priority semantics
     - [ ] Examples in reflection template

4. **Source Project Tracking**
   - Description: Tag each learning with source project for cross-project pattern evidence
   - User story: As a framework maintainer, I want to see which projects discovered each pattern so I can assess confidence (1 project = possible fluke, 3 projects = real issue)
   - Acceptance criteria:
     - [ ] Learning entries include `source_project` field (e.g., "StatViz", "meditation-space")
     - [ ] Pattern aggregation shows evidence: "Detected in: StatViz, TaskManager"
     - [ ] Vision generator includes cross-project evidence in improvement plans
     - [ ] Dashboard shows source breakdown per pattern

5. **Multi-Source Aggregation**
   - Description: Aggregator handles learnings from multiple JSONL sources
   - User story: As a framework maintainer, I want the aggregator to combine learnings from all projects so patterns emerge from ecosystem-wide data
   - Acceptance criteria:
     - [ ] Aggregator accepts multiple `--jsonl` paths OR discovers them automatically
     - [ ] Deduplication across sources (same learning from multiple projects = count as one)
     - [ ] Source tracking preserved through aggregation pipeline
     - [ ] Performance acceptable (100+ learnings from 10+ projects in <5s)

### Should-Have (Post-MVP)

1. **Dashboard Cross-Project View** - Show pattern evidence breakdown by project
2. **Selective Federation** - Config option to exclude specific Prod/* projects
3. **Historical Import** - One-time import of existing learnings from Prod/* projects

### Could-Have (Future)

1. **Pattern Confidence Scoring** - Weight patterns by number of source projects
2. **Project Health Metrics** - Track which projects hit most framework issues
3. **Bidirectional Sync** - Pattern status updates (VERIFIED/REGRESSED) sync to Prod/* projects

---

## User Flows

### Flow 1: Run /2l-improve in Meditation Space

**Steps:**
1. User in `~/Ahiya/2L` runs `/2l-improve`
2. System detects meditation space context
3. Discovers learnings:
   - Reads `~/Ahiya/2L/.2L/global-learnings.jsonl`
   - Globs `~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl`
   - Finds: StatViz, TaskManager, BlogEngine learnings
4. Filters for framework issues only
5. Aggregator combines all sources:
   - 15 learnings from meditation space
   - 8 learnings from StatViz
   - 12 learnings from TaskManager
   - 5 learnings from BlogEngine
6. Pattern detection:
   - PATTERN-002: "Integration phase slow" (detected in StatViz, TaskManager)
   - PATTERN-003: "Agent spawn timeout" (detected in meditation-space, BlogEngine)
7. Vision generator creates improvement plan with cross-project evidence
8. User reviews vision, sees pattern confidence from multiple sources

**Edge cases:**
- No Prod/* projects yet: Only use meditation space learnings
- Prod/* project has no .2L directory: Skip gracefully
- Prod/* project has .2L but no learnings yet: Skip gracefully

**Error handling:**
- Missing JSONL file: Log warning, continue with available sources
- Malformed JSONL: Log error with file path, skip that source
- Permission denied: Log error, continue with accessible sources

---

### Flow 2: Project Iteration Creates Reflection (Prod/* Project)

**Steps:**
1. User in `~/Ahiya/2L/Prod/StatViz` runs `/2l-mvp`
2. Iteration completes (exploration, planning, building, integration, validation)
3. Reflection generator runs:
   - Scans validation report for issues
   - Detects: "Integrator took 45s - expected <10s"
   - **Framework issue check:** Is this about 2L integrator? YES
   - **Priority:** P3 (framework performance)
   - **Source:** StatViz
4. Appends to `~/Ahiya/2L/Prod/StatViz/.2L/global-learnings.jsonl`:
   ```json
   {
     "learning_id": "learning-47",
     "timestamp": "2025-11-27T16:30:00Z",
     "iteration": 5,
     "plan_id": "plan-2",
     "source_project": "StatViz",
     "category": "framework-performance",
     "priority": "P3",
     "root_cause": "Integration phase slow - 45s for 4 builders",
     "context": "Integrator agent took 45s to merge 4 builder outputs..."
   }
   ```
5. Local aggregation (StatViz's own patterns updated)
6. No automatic sync to meditation space (happens lazily on next `/2l-improve`)

**Edge cases:**
- Project has app-specific issues (slow database query): NOT captured (filtered out)
- Project has framework issue + app issue: Only framework issue captured
- Validation passed perfectly: No framework issues detected, reflection says "No issues"

**Error handling:**
- Reflection generator can't determine if issue is framework vs app: Default to NOT capturing (conservative)
- JSONL append fails: Log error, continue iteration (non-blocking)

---

## Data Model Overview

**Key entities:**

1. **Learning Entry (JSONL)**
   - Fields: `learning_id`, `timestamp`, `iteration`, `plan_id`, **`source_project`**, `category`, `priority`, `root_cause`, `context`
   - New field: **`source_project`** (e.g., "StatViz", "meditation-space")
   - Relationships: Aggregated into Patterns

2. **Pattern (YAML)**
   - Fields: `pattern_id`, `status`, `category`, `root_cause`, **`source_projects`**, `evidence_count`, `verification_start_iteration`, etc.
   - New field: **`source_projects`** (list, e.g., ["StatViz", "TaskManager"])
   - New field: **`evidence_count`** (int, how many learnings support this pattern)

3. **Discovery Configuration**
   - Location: Hardcoded for now (Prod/* glob pattern)
   - Future: `.2L/config.yaml` with `learning_sources` array

---

## Technical Requirements

**Must support:**
- Glob pattern matching for `~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl`
- Multi-source JSONL reading with error handling
- Framework vs project issue classification heuristic
- Source tracking through aggregation pipeline
- Backward compatibility (existing learnings without `source_project` field)

**Constraints:**
- Must run in meditation space only (don't federate from arbitrary projects)
- Non-blocking (missing Prod/* learnings don't stop `/2l-improve`)
- Performance: <5s aggregation for 100+ learnings from 10+ projects

**Preferences:**
- Use Python's `glob` module for discovery
- Extend existing `2l-reflection-generator.py` and `2l-reflection-aggregator.py`
- Minimal changes to data schema (additive only)
- Clear logging of sources discovered

---

## Success Criteria

**The MVP is successful when:**

1. **Cross-Project Discovery Works**
   - Metric: Run `/2l-improve` in meditation space, check how many sources discovered
   - Target: Discovers meditation space + all existing Prod/* projects with learnings
   - Validation: Dashboard shows "Aggregated learnings from 4 sources: meditation-space, StatViz, TaskManager, BlogEngine"

2. **Framework-Only Filtering Works**
   - Metric: Create reflection in Prod/* project with both framework and app issues
   - Target: Only framework issues captured in global-learnings.jsonl
   - Validation: App bugs/performance not in learnings file

3. **Cross-Project Patterns Detected**
   - Metric: Run `/2l-improve` after 2+ Prod/* projects hit same framework issue
   - Target: Pattern shows evidence from multiple projects
   - Validation: `.2L/global-learnings.yaml` shows `source_projects: [StatViz, TaskManager]`

4. **Priority Classification Clear**
   - Metric: Check P3 learnings in global-learnings.jsonl
   - Target: All P3 entries are framework performance (not app performance)
   - Validation: Manual review finds 0 false positives

---

## Out of Scope

**Explicitly not included in MVP:**
- Bidirectional sync (pattern status updates don't flow back to Prod/* projects)
- Real-time federation (learnings discovered lazily on `/2l-improve`, not pushed)
- Dashboard drill-down (no UI for viewing per-project breakdown)
- Confidence scoring (pattern confidence based on evidence count comes later)
- Historical import (existing learnings before Plan-10 stay where they are)

**Why:** Focus on core aggregation first. These are valuable enhancements but not blocking the main use case.

---

## Assumptions

1. All production projects live under `~/Ahiya/2L/Prod/*`
2. Learnings file is always `.2L/global-learnings.jsonl` (consistent naming)
3. Framework issues are detectable via keyword matching + context heuristics
4. Source project name can be derived from directory name (Prod/StatViz → "StatViz")
5. Meditation space is always `~/Ahiya/2L` (not configurable)

---

## Open Questions

1. **Deduplication strategy:** If StatViz iteration-3 and TaskManager iteration-5 both discover "integration slow", do we:
   - Create 2 separate learning entries (current approach)?
   - Deduplicate and merge into 1 entry with multiple sources?
   - **Proposed answer:** Keep separate entries, aggregator merges into single pattern

2. **Framework issue classification edge cases:**
   - "Builder took 2 minutes to write code" - is this framework slow or just complex code generation?
   - "Validator found type errors" - is this framework issue or builder quality issue?
   - **Proposed answer:** Document heuristics, err on side of NOT capturing (conservative)

3. **Source project naming:**
   - What if project directory is `Prod/my-app-v2` - source_project = "my-app-v2"?
   - What about nested projects `Prod/clients/acme/dashboard`?
   - **Proposed answer:** Use immediate parent directory name for now

---

## Implementation Strategy

### Phase 1: Discovery (1-2h)
- Modify `/2l-improve` (or create `/commands/2l-improve.md`) to:
  - Detect meditation space context
  - Glob `Prod/*/.2L/global-learnings.jsonl`
  - Pass multiple sources to aggregator

### Phase 2: Filtering (2-3h)
- Enhance `lib/2l-reflection-generator.py`:
  - Refine framework keyword detection
  - Add framework vs project heuristics
  - Update priority classification logic
  - Add examples to docstrings

### Phase 3: Multi-Source Aggregation (2-3h)
- Extend `lib/2l-reflection-aggregator.py`:
  - Accept multiple JSONL sources
  - Track `source_project` through pipeline
  - Aggregate `source_projects` list in patterns
  - Add `evidence_count` field

### Phase 4: Testing & Validation (1-2h)
- Create test scenarios with multiple mock projects
- Validate cross-project pattern detection
- Verify filtering works (framework vs app issues)
- Test edge cases (missing files, malformed JSON)

**Total estimate:** 6-10 hours (SIMPLE to MEDIUM complexity, likely 1 iteration)

---

## Next Steps

- [ ] Review this vision for completeness
- [ ] Run `/2l-mvp` to auto-plan and execute
- [ ] Test with existing Prod/* projects (StatViz, etc.)
- [ ] Validate cross-project pattern detection works
- [ ] Document new capabilities in `/2l-improve` help text

---

**Vision Status:** VISIONED
**Ready for:** Master Planning and Execution
**Complexity:** SIMPLE-MEDIUM (1 iteration expected)
