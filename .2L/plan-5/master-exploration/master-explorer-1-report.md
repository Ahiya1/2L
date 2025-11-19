# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Build a self-reflection infrastructure that enables 2L to systematically learn from validation failures and orchestration patterns across projects, automatically aggregate those learnings, and orchestrate improvements to itself through the `/2l-improve` command - closing the reflection loop that makes 2L truly recursive.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 5 must-have features
- **User stories/acceptance criteria:** 38 distinct acceptance criteria across 5 core features
- **Estimated total work:** 18-24 hours across 3-4 iterations

**Feature breakdown:**
1. **Per-iteration Learning Capture** (4 criteria) - 3-4 hours
2. **Re-validation Checkpoint** (4 criteria) - 3-4 hours
3. **Learning Aggregation with Status Tracking** (8 criteria) - 5-6 hours
4. **Orchestrator Reflection** (6 criteria) - 4-5 hours
5. **`/2l-improve` Command** (11 criteria) - 5-7 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **Meta-circular architecture:** 2L must modify itself while running (requires careful file system and symlink handling)
- **Multi-component integration:** Affects orchestrator, validator, healer, and introduces new command - 4 architectural layers must coordinate
- **State management across phases:** Learning lifecycle (IDENTIFIED → IMPLEMENTED → VERIFIED) spans multiple orchestration runs with persistent state tracking
- **Data-driven automation:** Must auto-generate vision.md from YAML patterns without human conversation (novel workflow)
- **Backward compatibility requirement:** Cannot break existing orchestrations or 5 completed plans
- **Recursive self-improvement:** 2L uses `/2l-mvp` to modify agents/commands that define `/2l-mvp` itself (complex dependency cycle)

**Why not VERY COMPLEX:**
- Well-defined scope (5 features, clear boundaries)
- Existing patterns to follow (event system, YAML config, symlinks already proven)
- No external integrations (all local file system operations)
- Can be built incrementally (learning capture → aggregation → self-improvement)

---

## Architectural Analysis

### Major Components Identified

1. **Learning Capture System (Validator Extension)**
   - **Purpose:** Emit structured learnings when validation failures occur
   - **Complexity:** MEDIUM
   - **Why critical:** Foundation of entire self-reflection architecture - without learnings data, nothing else works
   - **Implementation:** Extend existing `2l-validator.md` agent to create `learnings.yaml` on FAIL status
   - **Location:** Modifies `/agents/2l-validator.md`
   - **Data flow:** Validator discovers issue → Creates learnings.yaml → Orchestrator reads for healing decisions

2. **Re-validation Loop (Orchestrator Extension)**
   - **Purpose:** Verify healing actually fixed issues before marking iteration complete
   - **Complexity:** MEDIUM
   - **Why critical:** Prevents false completion status that undermines learning quality
   - **Implementation:** Extend `/commands/2l-mvp.md` orchestrator logic to spawn validator after healer completes
   - **Location:** Modifies `/commands/2l-mvp.md` (orchestrator validation phase)
   - **Data flow:** Healer completes → Orchestrator spawns validator again → If PASS continue, if FAIL spawn healer round 2

3. **Orchestrator Reflection Module (Orchestrator Extension)**
   - **Purpose:** Aggregate iteration learnings into global knowledge base automatically
   - **Complexity:** LOW
   - **Why critical:** Bridges gap between per-iteration learnings and global patterns
   - **Implementation:** Add reflection logic to `/commands/2l-mvp.md` after validation passes, before git commit
   - **Location:** Modifies `/commands/2l-mvp.md` (post-validation, pre-commit phase)
   - **Data flow:** Validation PASSES → Check for learnings.yaml → Merge into `.2L/global-learnings.yaml` → Add metadata → Continue to commit

4. **Learning Aggregation Engine (`/2l-improve` Command)**
   - **Purpose:** Scan projects, detect patterns, rank by impact, filter by status
   - **Complexity:** HIGH
   - **Why critical:** Transforms distributed learnings into actionable improvement roadmap
   - **Implementation:** New command `/commands/2l-improve.md` that reads all `Prod/**/.2L/learnings.yaml` files
   - **Location:** Creates `/commands/2l-improve.md`
   - **Data flow:** Scan Prod/ → Aggregate patterns → Rank by severity×occurrences → Filter to IDENTIFIED status → Display top patterns

5. **Vision Auto-Generation System (`/2l-improve` Component)**
   - **Purpose:** Convert learning patterns into structured vision.md without human conversation
   - **Complexity:** MEDIUM
   - **Why critical:** Enables data-driven workflow distinct from human-driven `/2l-vision`
   - **Implementation:** Part of `/2l-improve.md` command - template-based vision generation from YAML
   - **Location:** Within `/commands/2l-improve.md`
   - **Data flow:** Top patterns identified → Template vision.md with features from learnings → Write to `.2L/plan-N/vision.md`

6. **Self-Orchestration Trigger (`/2l-improve` Component)**
   - **Purpose:** Automatically invoke `/2l-mvp` after vision generation with confirmation
   - **Complexity:** LOW
   - **Why critical:** Closes the loop - learnings become improvements without manual intervention
   - **Implementation:** Part of `/2l-improve.md` - prompt user, invoke `/2l-mvp` if confirmed
   - **Location:** Within `/commands/2l-improve.md`
   - **Data flow:** Vision generated → Display to user → Prompt "Proceed with /2l-mvp? [Y/n]" → If Y, run `/2l-mvp` → Mark learnings as IMPLEMENTED

7. **Learning Status Lifecycle Manager (YAML Structure)**
   - **Purpose:** Track learning progression through IDENTIFIED → IMPLEMENTED → VERIFIED states
   - **Complexity:** LOW
   - **Why critical:** Prevents duplicate fixes and tracks improvement effectiveness
   - **Implementation:** YAML schema in `global-learnings.yaml` with status field and metadata
   - **Location:** Data structure in `.2L/global-learnings.yaml`
   - **State transitions:**
     - New learning: status = IDENTIFIED, add discovered_in field
     - After `/2l-improve` runs: status = IMPLEMENTED, add implemented_in field
     - After validation passes on fixed issue: status = VERIFIED, add verified_at timestamp

### Technology Stack Implications

**File System & Data Storage**
- **Options:** YAML files, JSON, SQLite database, plain markdown
- **Recommendation:** YAML for learnings (human-readable, machine-parseable, git-friendly)
- **Rationale:**
  - Consistent with existing config.yaml pattern
  - Human-editable for manual corrections
  - Git diff-friendly for tracking learning evolution
  - No external dependencies (pure file system)
  - Easy to scan/aggregate with bash tools

**Symlink Architecture (Already Established)**
- **Current state:** `~/.claude/{agents,commands,lib}` → `~/Ahiya/2L/{agents,commands,lib}`
- **Implication:** Changes to `~/Ahiya/2L/agents/2l-validator.md` immediately affect running system
- **Risk:** Self-modification during orchestration could affect current run
- **Mitigation:** Modifications happen in meditation space (`.2L/plan-N/`), only affect next orchestration after git commit

**Event System Integration**
- **Current implementation:** `lib/2l-event-logger.sh` writes to `.2L/events.jsonl`
- **Recommendation:** Reuse for re-validation events (validation_result after healing)
- **Rationale:** Already proven, dashboard-compatible, graceful degradation if unavailable

**Git Integration**
- **Current pattern:** Orchestrator commits after iteration completion
- **Recommendation:** Commit learning updates with iteration completion
- **Rationale:** Learnings are part of iteration artifacts, should be versioned together

**Bash vs Other Languages**
- **Options:** Pure bash (existing), Python scripts, Node.js
- **Recommendation:** Stay with bash for consistency
- **Rationale:**
  - All current commands are bash (consistency)
  - YAML parsing available via yq or grep
  - Pattern detection can be bash (count occurrences, sort)
  - Avoids new runtime dependencies

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 phases)

**Rationale:** 38 acceptance criteria across 5 features affecting 4 architectural components cannot be safely completed in one iteration. Natural dependency phases exist (capture → aggregate → improve), and each phase delivers incremental value with clear validation checkpoints.

### Suggested Iteration Phases

**Iteration 1: Foundation - Learning Capture & Re-validation**
- **Vision:** Build the learning capture mechanism and close the validation loop
- **Scope:** Features 1 & 2 (Per-iteration Learning Capture + Re-validation Checkpoint)
  - Extend validator to create learnings.yaml on FAIL
  - Define learning YAML schema (id, iteration, category, severity, issue, root_cause, solution, affected_files)
  - Implement re-validation loop in orchestrator (spawn validator after healer)
  - Handle healing round limits (2 max, then escalate)
  - Test on greenfield project to verify learning creation
  - Document learning file format in README
- **Why first:** Must capture learnings before we can aggregate or act on them. Re-validation ensures learning quality.
- **Estimated duration:** 6-8 hours
- **Risk level:** MEDIUM (extends existing agents, well-defined scope)
- **Success criteria:**
  - Run validation that fails, confirm learnings.yaml created with correct schema
  - Trigger healing that doesn't fix issue, confirm re-validation catches it
  - Iteration stays INCOMPLETE until re-validation passes

**Iteration 2: Aggregation - Global Learning System & Orchestrator Reflection**
- **Vision:** Aggregate learnings across projects and automate reflection
- **Scope:** Features 3 & 4 (Learning Aggregation + Orchestrator Reflection)
  - Create global-learnings.yaml schema with pattern deduplication
  - Implement status tracking (IDENTIFIED → IMPLEMENTED → VERIFIED)
  - Add reflection logic to orchestrator (merge learnings after validation passes)
  - Scan Prod/ directory for existing learnings (backfill from past projects)
  - Detect duplicate patterns (same issue, different projects)
  - Add metadata tracking (discovered_in, implemented_in, verified_at)
  - Test aggregation with 3+ projects (ghstats, SplitEasy, ai-mafia)
- **Dependencies:** Requires iteration 1 complete
  - Learnings.yaml schema must be stable
  - Validator and orchestrator updates from iteration 1 must work
- **Estimated duration:** 6-8 hours
- **Risk level:** MEDIUM (file scanning logic, pattern detection complexity)
- **Success criteria:**
  - Global-learnings.yaml aggregates learnings from 3+ projects
  - Duplicate patterns detected and merged
  - Orchestrator reflection runs automatically after validation
  - New learnings marked with status: IDENTIFIED

**Iteration 3: Self-Improvement - `/2l-improve` Command & Vision Auto-Generation**
- **Vision:** Enable automated self-improvement through data-driven orchestration
- **Scope:** Feature 5 (`/2l-improve` Command with all 11 criteria)
  - Create `/2l-improve.md` command
  - Implement learning aggregation scan (already tested in iteration 2)
  - Filter learnings by status: IDENTIFIED (skip IMPLEMENTED/VERIFIED)
  - Rank patterns by impact (severity × occurrences)
  - Auto-generate vision.md from top 2-3 patterns
  - Implement vision template (feature = learning pattern)
  - Display proposed changes with affected files
  - Add confirmation prompt ("Proceed with /2l-mvp? [Y/n]")
  - Auto-invoke `/2l-mvp` on confirmation
  - Update learning status to IMPLEMENTED after orchestration
  - Support manual mode (`/2l-improve --manual`)
  - Test full loop: learnings → pattern detection → vision → orchestration → status update
- **Dependencies:** Requires iterations 1 & 2 complete
  - Global-learnings.yaml must exist and be populated
  - Status tracking must work
  - Learnings quality must be sufficient for vision generation
- **Estimated duration:** 6-8 hours
- **Risk level:** HIGH (meta-circular self-modification, novel workflow)
- **Success criteria:**
  - `/2l-improve` detects patterns from global-learnings.yaml
  - Vision.md auto-generated from patterns (no human conversation)
  - Confirmation workflow functions correctly
  - `/2l-mvp` modifies 2L codebase successfully
  - Learning status updated to IMPLEMENTED
  - Changes are live immediately (via symlinks)

---

## Dependency Graph

```
Foundation (Iteration 1)
├── Learning Capture (Validator)
│   ├── learnings.yaml schema defined
│   └── FAIL status triggers learning creation
└── Re-validation Loop (Orchestrator)
    ├── Spawn validator after healer completes
    └── Handle multiple healing rounds (max 2)
    ↓
Aggregation (Iteration 2)
├── Global Learning System
│   ├── Scan Prod/**/.2L/learnings.yaml
│   ├── Merge into .2L/global-learnings.yaml
│   ├── Detect duplicate patterns
│   └── Status tracking (IDENTIFIED/IMPLEMENTED/VERIFIED)
└── Orchestrator Reflection
    ├── Run after validation PASSES
    ├── Merge iteration learnings into global
    └── Add metadata (discovered_in, timestamps)
    ↓
Self-Improvement (Iteration 3)
├── Pattern Detection & Ranking
│   ├── Filter by status: IDENTIFIED
│   ├── Rank by severity × occurrences
│   └── Select top 2-3 patterns
├── Vision Auto-Generation
│   ├── Template vision.md from patterns
│   ├── Map learning fields to feature specs
│   └── Write to .2L/plan-N/vision.md
└── Self-Orchestration
    ├── Confirmation prompt
    ├── Auto-invoke /2l-mvp
    ├── Update learning status to IMPLEMENTED
    └── Symlinks make changes live immediately

Critical path: Learning schema stability (iteration 1) →
               Aggregation working (iteration 2) →
               Self-improvement operational (iteration 3)
```

---

## Risk Assessment

### High Risks

**Risk 1: Meta-circular self-modification safety**
- **Impact:** 2L modifying agents/commands that define its own orchestrator could cause runtime failures or infinite loops
- **Mitigation:**
  - Modifications happen in meditation space (`.2L/plan-N/`) separate from source
  - Git commits act as safe checkpoints (can rollback if broken)
  - Symlinks point to versioned source, changes only affect next orchestration
  - Test self-improvement on non-critical agents first (dashboard builder, not orchestrator)
- **Recommendation:** Iteration 3 should include safeguards - backup before self-modification, validation that modified files parse correctly

**Risk 2: Learning quality determines improvement quality**
- **Impact:** If learnings have poor root_cause analysis or vague solutions, auto-generated visions will be low quality
- **Mitigation:**
  - Iteration 1 defines strict learning schema with required fields
  - Validator agent instructions include guidance on root cause analysis
  - Manual review of first 5-10 learnings to establish quality baseline
  - `/2l-improve` can mark learnings as "needs_refinement" if solution is vague
- **Recommendation:** Add learning quality rubric to validator agent definition

**Risk 3: Pattern detection false positives**
- **Impact:** Aggregation system merges learnings that seem similar but are actually distinct issues, leading to incorrect pattern identification
- **Mitigation:**
  - Conservative pattern matching (require exact issue text match + similar affected_files)
  - Human review step in `/2l-improve` before vision generation
  - Manual override flag (`/2l-improve --manual`) to bypass auto-generation
  - Start with strict matching, loosen if too conservative
- **Recommendation:** Iteration 2 should include pattern matching tests with known duplicates

### Medium Risks

**Risk 4: Backward compatibility with existing orchestrations**
- **Impact:** Changes to validator/orchestrator break 5 completed plans or in-progress projects
- **Mitigation:**
  - Learning capture is optional (validator creates learnings.yaml only on FAIL)
  - Re-validation is additional check, doesn't change PASS behavior
  - Orchestrator reflection only runs if learnings.yaml exists
  - All new features gracefully degrade if dependencies missing
- **Recommendation:** Test against past project (SplitEasy or ai-mafia) to verify no regressions

**Risk 5: File system race conditions during aggregation**
- **Impact:** Concurrent orchestrations writing to global-learnings.yaml could corrupt data
- **Mitigation:**
  - Use file locking (flock in bash) when writing global-learnings.yaml
  - Atomic writes (write to temp file, mv to final location)
  - Add retry logic for read/write failures
  - Most likely scenario is single orchestration at a time (low concurrency)
- **Recommendation:** Add file locking in iteration 2 aggregation logic

**Risk 6: Symlink brittleness during self-modification**
- **Impact:** If symlinks break during `/2l-improve` orchestration, 2L stops functioning
- **Mitigation:**
  - Verify symlinks before starting self-improvement
  - Create backup of current agents/commands before modification
  - Test symlink integrity after modification
  - Rollback mechanism if symlinks invalid
- **Recommendation:** Add symlink validation check to `/2l-improve` startup

### Low Risks

**Risk 7: YAML parsing failures**
- **Impact:** Malformed YAML in learnings.yaml breaks aggregation
- **Mitigation:** YAML validation before parsing (yq lint), error handling for parse failures

**Risk 8: Disk space growth from learnings accumulation**
- **Impact:** global-learnings.yaml grows unbounded over time
- **Mitigation:** Learnings are small (KB not MB), compression possible, archival after VERIFIED status

**Risk 9: Git merge conflicts in global-learnings.yaml**
- **Impact:** Multiple branches modifying global learnings create conflicts
- **Mitigation:** Learning IDs prevent duplicates, conflict resolution is append-only (safe to merge)

---

## Integration Considerations

### Cross-Phase Integration Points

**Shared Component 1: Learning YAML Schema**
- **What it is:** Data format for learnings.yaml and global-learnings.yaml
- **Why it spans iterations:**
  - Defined in iteration 1 (validator creates it)
  - Used in iteration 2 (aggregation reads it)
  - Consumed in iteration 3 (vision generation uses fields)
- **Consistency needed:** Schema must remain stable or versioned
- **Recommendation:** Lock schema in iteration 1, document in `schemas/learning.yaml`

**Shared Component 2: Status Lifecycle Management**
- **What it is:** IDENTIFIED → IMPLEMENTED → VERIFIED state transitions
- **Why it spans iterations:**
  - Introduced in iteration 2 (aggregation adds status field)
  - Updated in iteration 3 (`/2l-improve` changes to IMPLEMENTED)
  - Future updates post-iteration 3 (validator changes to VERIFIED when re-validation passes on fixed issue)
- **Consistency needed:** Status transition rules must be well-defined
- **Recommendation:** Document state machine in iteration 2 README

**Shared Component 3: Event Logging for Observability**
- **What it is:** Events.jsonl tracking for reflection and re-validation
- **Why it spans iterations:**
  - Iteration 1 adds validation_result events (after re-validation)
  - Iteration 2 adds reflection_complete events
  - Iteration 3 adds self_improvement_start/complete events
- **Consistency needed:** Event schema must support all event types
- **Recommendation:** Use existing event system, extend with new event types

### Potential Integration Challenges

**Challenge 1: Orchestrator complexity growth**
- **Description:** `/2l-mvp.md` already large (60KB), adding re-validation + reflection logic increases complexity
- **Why it matters:** Harder to maintain, higher risk of bugs
- **Solution:** Extract reflection logic into separate script (`lib/2l-reflect.sh`), invoke from orchestrator
- **When to address:** Iteration 2 planning phase

**Challenge 2: Vision template flexibility**
- **Description:** Auto-generated visions from learnings must match quality of human-written visions
- **Why it matters:** Low-quality visions lead to poor orchestration outcomes
- **Solution:** Create vision template with placeholders, map learning fields carefully, include examples
- **When to address:** Iteration 3 planning phase

**Challenge 3: Learning ID collision**
- **Description:** Multiple projects creating learnings with same ID format (project-YYYYMMDD-NNN)
- **Why it matters:** Duplicate IDs in global-learnings.yaml cause confusion
- **Solution:** Use UUID for learning IDs, or include project name + iteration in ID
- **When to address:** Iteration 1 schema definition

---

## Recommendations for Master Plan

1. **Prioritize iteration 1 quality over speed**
   - Learning schema is foundation for everything else
   - Poorly designed schema requires costly refactoring in iterations 2-3
   - Invest time in schema design, validation, and documentation
   - Include schema examples for common failure types (grep pattern, integration bug, type error)

2. **Build aggregation with extensibility in mind**
   - Iteration 2 should support multiple aggregation strategies (exact match, fuzzy match, manual merge)
   - Pattern detection will evolve as we learn what patterns are useful
   - Design for future: success pattern extraction (not just failures), cross-project analytics

3. **Treat iteration 3 as experimental**
   - Self-improvement is the most novel and risky feature
   - Run first `/2l-improve` orchestration on non-critical improvement (dashboard enhancement, not orchestrator core)
   - Manual mode (`--manual`) should be default until auto-generation proven
   - Include extensive logging and safety checks

4. **Test backward compatibility throughout**
   - Run `/2l-mvp` on existing project (SplitEasy iteration 4) after each iteration completes
   - Verify no regressions in orchestrator behavior
   - Confirm optional features degrade gracefully if dependencies missing

5. **Document meditation space concept prominently**
   - README should explain `~/Ahiya/2L/` as both source repo and meditation space
   - Clarify symlink architecture and its implications for self-improvement
   - Include diagrams of data flow (learnings → aggregation → improvement)

6. **Consider phased rollout of re-validation**
   - Iteration 1 could make re-validation optional (orchestrator flag)
   - Test on 2-3 projects before making mandatory
   - Allows fallback if re-validation introduces issues

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- Bash scripting for commands and orchestration
- Markdown for agent definitions
- YAML for configuration (config.yaml proven pattern)
- Event system (events.jsonl) for observability
- Git for versioning and checkpoints
- Symlinks for live code updates

**Patterns observed:**
- Agents emit events at start and completion
- Orchestrator coordinates agents, handles phase transitions
- Validators return 5-tier status (PASS/UNCERTAIN/PARTIAL/INCOMPLETE/FAIL)
- Graceful degradation when optional features unavailable (MCPs, event logging)
- Idempotent commands (can run multiple times safely)

**Opportunities:**
- Learning capture fits naturally into validator FAIL path
- Reflection fits naturally into orchestrator post-validation phase
- Event system ready for new event types (validation_result, reflection_complete)
- YAML pattern proven for structured data

**Constraints:**
- Must maintain backward compatibility with 5 completed plans
- Cannot introduce runtime dependencies (stay with bash + standard tools)
- Symlinks must remain functional (core to live update architecture)
- Must work without external services (local file system only)

---

## Notes & Observations

**Observation 1: Recursive power is real but must be contained**
The vision states "2L uses itself to improve itself" - this is powerful but dangerous. The key safety mechanism is separation of concerns:
- Source code lives in `~/Ahiya/2L/` (versioned, rollback-able)
- Improvements orchestrated in `.2L/plan-N/` meditation space
- Git commits create checkpoints
- Symlinks provide live updates but point to stable versioned source

**Observation 2: Data-driven workflow is novel for 2L**
All previous plans used `/2l-vision` (human conversation → vision.md). This plan introduces `/2l-improve` (data analysis → vision.md). The distinction is critical:
- Human-driven: Requirements emerge through exploration (new projects)
- Data-driven: Requirements extracted from learnings (self-improvement)

This is a new paradigm that could extend beyond self-improvement (e.g., user feature requests stored as structured data → auto-generated visions).

**Observation 3: Learning quality is the bottleneck**
The entire system depends on validators creating high-quality learnings. If root_cause analysis is shallow or solution is vague, auto-generated visions will be poor. Consider:
- Add learning quality rubric to validator agent
- Include examples of good vs bad learnings
- Human review step for first 10-20 learnings to calibrate quality
- Iterative refinement: learnings can be marked "needs_review" and improved later

**Observation 4: Status tracking enables continuous improvement**
IDENTIFIED → IMPLEMENTED → VERIFIED lifecycle prevents duplicate work and tracks effectiveness:
- Prevents re-implementing same fix across multiple `/2l-improve` runs
- Allows measuring: How many learnings reach VERIFIED? How long does it take?
- Future analytics: Which types of learnings are most actionable?

**Observation 5: Meditation space concept is philosophically rich**
The vision's philosophical foundation is strong: "The meditation space is where 2L observes, reflects, acts, and returns stronger." This maps to:
- **Observe:** Learnings capture (iteration 1)
- **Reflect:** Aggregation and pattern detection (iteration 2)
- **Act:** Self-orchestration (iteration 3)
- **Return:** Symlinks make improvements live for next project

This creates a genuine learning loop, not just data collection.

**Observation 6: Testing self-improvement is meta-challenging**
How do we validate that `/2l-improve` works correctly?
- Run it on known learnings (synthetic test data)
- Verify vision generation quality (manual review)
- Check that orchestration completes successfully
- Validate that resulting code changes are correct
- Confirm symlinks still work post-modification

This requires a "test the tester" approach - possibly manual validation initially, automated later.

---

*Exploration completed: 2025-11-19T04:00:00Z*
*This report informs master planning decisions*
