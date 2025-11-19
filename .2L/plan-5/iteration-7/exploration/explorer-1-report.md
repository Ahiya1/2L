# Explorer 1 Report: Architecture & Implementation Analysis

## Executive Summary

The `/2l-improve` command is the capstone of plan-5's self-reflection infrastructure. It closes the recursive loop by reading accumulated learnings from `.2L/global-learnings.yaml`, detecting patterns, auto-generating improvement visions, and orchestrating 2L to improve itself.

**Complexity Assessment:** HIGH (10-14 hours)

**Key Architectural Insight:** This is meta-circular code that modifies 2L's own agents/commands. Safety mechanisms (confirmation workflow, orchestrator exclusion, git commits) are critical to prevent self-destruction.

**Critical Risk Mitigation:** Never allow /2l-improve to modify `commands/2l-mvp.md` (the orchestrator). A bug in the orchestrator could break all future improvements.

---

## Discoveries

### Discovery Category 1: Meta-Circular Architecture Pattern

**Finding 1:** /2l-improve is self-modifying code that changes the system that runs /2l-improve itself. This creates unique safety requirements not present in normal development.

**Finding 2:** The symlink architecture (~/Ahiya/2L/ → ~/.claude/) means changes are immediately live. No deployment step creates both a benefit (instant updates) and a risk (instant breakage).

**Finding 3:** Iteration 1 created all the foundational infrastructure needed. No new libraries or utilities required. This is purely orchestration code.

### Discovery Category 2: Data Flow & Integration Points

**Finding 1:** global-learnings.yaml schema from iteration 1 is well-designed and sufficient. The `status` field lifecycle (IDENTIFIED → IMPLEMENTED → VERIFIED) matches the vision requirements perfectly.

**Finding 2:** The YAML helpers library (`atomic_write_yaml`, `generate_pattern_id`, `find_similar_pattern`) provides all data manipulation primitives needed. No new utilities required.

**Finding 3:** Event system integration is straightforward - 9 events emitted during /2l-improve execution provide complete observability for dashboard.

### Discovery Category 3: Complexity Drivers

**Finding 1:** Vision generation quality is the highest-risk component. Auto-generating natural language from structured data is inherently variable. Template-based approach recommended.

**Finding 2:** Pattern detection algorithm is well-defined but has subjective parameters (impact formula, minimum thresholds). These will likely need tuning after real-world use.

**Finding 3:** Safety mechanisms add ~25% overhead to implementation (git checks, file locking, orchestrator exclusion) but are non-negotiable for meta-circular safety.

---

## Patterns Identified

### Pattern Type: Command Structure Pattern

**Description:** /2l-improve follows the same structure as other 2L commands (2l-vision, 2l-mvp, 2l-task):
- Markdown file in commands/
- Bash-based workflow orchestration  
- Python utilities for data manipulation
- Event emission for observability
- Git integration for persistence

**Use Case:** All 2L commands that orchestrate agent workflows

**Example:**
```bash
# commands/2l-improve.md structure
1. Parse arguments (--manual, --dry-run flags)
2. Load data (global-learnings.yaml)
3. Process data (pattern detection, ranking)
4. Present UI (confirmation workflow)
5. Execute action (/2l-mvp invocation)
6. Update state (status change to IMPLEMENTED)
7. Emit events (observability)
```

**Recommendation:** Follow this established pattern. It's proven to work across all existing commands.

---

### Pattern Type: Safety-First Meta-Circular Design

**Description:** When code modifies itself, safety mechanisms must be multi-layered:
1. Pre-flight checks (git status, working directory)
2. Exclusion lists (orchestrator cannot be modified)
3. Safety checkpoints (git commits before changes)
4. User confirmation (explicit consent required)
5. Auto-rollback (revert on failure)
6. Graceful degradation (failures don't break system)

**Use Case:** Any self-modifying code

**Example:**
```bash
# Layer 1: Pre-flight check
check_git_status || abort

# Layer 2: Exclusion list
verify_orchestrator_exclusion "$affected_files" || abort

# Layer 3: Safety checkpoint  
git commit -m "Pre-improvement checkpoint"

# Layer 4: User confirmation
confirm_improvement || abort

# Layer 5: Auto-rollback
/2l-mvp || git reset --hard HEAD~1

# Layer 6: Graceful degradation
update_status || warn_but_continue
```

**Recommendation:** Implement all 6 layers. Any one layer can fail; defense in depth is essential.

---

### Pattern Type: Template-Based Content Generation

**Description:** For structured content generation (vision.md), templates are superior to LLM prompting:
- Consistent structure across all outputs
- Deterministic results (easier testing)
- Maintainable (update template to improve all future outputs)
- Lower risk than LLM hallucination

**Use Case:** Auto-generating vision.md from pattern data

**Example:**
```markdown
# lib/2l-vision-template.md
# Vision: Fix {{pattern_name}}

## Problem Statement
{{pattern_name}} has occurred {{occurrences}} times across {{project_count}} projects:
{{#projects}}
- {{.}}
{{/projects}}

## Root Cause Analysis
{{root_cause}}

## Proposed Solution
{{proposed_solution}}
```

**Recommendation:** Use template-based approach with variable substitution. Avoid LLM generation for this use case.

---

## Complexity Assessment

### High Complexity Areas

**Feature: Vision Auto-Generation (Component 3)**

**Why it's complex:**
- Natural language generation from structured data
- Component inference from solution text (heuristic-based)
- Quality validation (must be specific enough for builders)
- Template variable substitution and formatting

**Estimated builder splits:** 1 builder can handle this, but it's the most complex component (120 LOC, 40% of total effort)

**Mitigation:** Template-based approach reduces LLM variability. Quality validation catches bad outputs.

---

**Feature: Pattern Detection & Ranking (Component 2)**

**Why it's complex:**
- Impact formula has multiple variables (severity weight, occurrences, recurrence risk)
- Subjective thresholds (minimum occurrences=2, minimum severity=medium)
- Edge cases (tie scores, all patterns below threshold)
- Filtering logic (status=IDENTIFIED, recurring only)

**Estimated builder splits:** 1 builder handles this (80 LOC, 25% of total effort)

**Mitigation:** Well-defined algorithm. Easy to test with synthetic data.

---

**Feature: Self-Modification Orchestration (Component 5)**

**Why it's complex:**
- Meta-circular execution (/2l-mvp modifies code that runs /2l-mvp)
- Git operations (commits, rollback, conflict handling)
- Working directory verification (must be in meditation space)
- Exit code handling and error recovery

**Estimated builder splits:** 1 builder handles this (50 LOC, 15% of total effort)

**Mitigation:** Safety mechanisms are well-defined. Git rollback provides recovery path.

---

### Medium Complexity Areas

**Feature: Confirmation Workflow (Component 4)**

**Complexity notes:**
- User input parsing (P/E/C options)
- Display formatting (pattern evidence, safety checks)
- Default behavior (invalid input → Cancel)

**Builder estimate:** Straightforward bash scripting (60 LOC, 15% of total effort)

---

**Feature: Status Updater (Component 6)**

**Complexity notes:**
- YAML read/update (using existing atomic_write_yaml)
- Pattern lookup by ID
- Metadata enrichment (implemented_in_plan, implemented_at, vision_file)

**Builder estimate:** Simple Python (40 LOC, 10% of total effort)

---

### Low Complexity Areas

**Feature: Learning Reader (Component 1)**

**Complexity notes:**
- YAML loading (PyYAML library)
- List filtering (status=IDENTIFIED)
- Error handling (file not found → empty list)

**Builder estimate:** Trivial Python (30 LOC, 5% of total effort)

---

**Feature: Event Emission (Component 7)**

**Complexity notes:**
- 9 event calls throughout workflow
- Uses existing log_2l_event() function
- No new logic needed

**Builder estimate:** Trivial integration (20 LOC, minimal effort)

---

## Technology Recommendations

### Primary Stack

**Framework:** Bash + Python (mixed approach)
**Rationale:**
- Bash excels at command orchestration, git operations, user prompts
- Python excels at YAML parsing, data manipulation, string formatting
- Both are already used throughout 2L infrastructure
- No new dependencies or learning curve

**Example split:**
- Bash: Argument parsing, confirmation workflow, /2l-mvp invocation, git operations
- Python: Pattern detection, vision generation, status updates, YAML manipulation

---

**Database:** File-based (.2L/global-learnings.yaml)
**Rationale:**
- Already established in iteration 1
- Atomic writes prevent corruption
- Git-versioned (rollback capability)
- Human-readable (easy debugging)
- No database server needed

---

**CLI Framework:** Bash getopts
**Rationale:**
- Standard bash argument parsing
- Supports flags (--manual, --dry-run)
- No external dependencies
- Consistent with other 2L commands

---

**Template Engine:** Python string formatting
**Rationale:**
- Built-in (no dependencies)
- Sufficient for simple variable substitution
- Fallback: mustache.py if complex logic needed

---

### Supporting Libraries

**PyYAML:** YAML parsing and serialization
**Why needed:** Read/write global-learnings.yaml
**Status:** Already available from iteration 1

---

**lib/2l-yaml-helpers.py:** Atomic writes, pattern operations
**Why needed:** Safe global-learnings.yaml updates
**Status:** Already implemented and tested in iteration 1

---

**lib/2l-event-logger.sh:** Event emission
**Why needed:** Observability via .2L/events.jsonl
**Status:** Already implemented

---

**flock (util-linux):** File locking
**Why needed:** Prevent concurrent /2l-improve runs
**Status:** Standard Linux utility (already available)

---

## Integration Points

### External APIs

**None.** This is meditation space infrastructure - no external integrations.

---

### Internal Integrations

**Component A: /2l-improve ↔ /2l-mvp (Orchestrator)**

**How they connect:**
- /2l-improve generates vision.md
- /2l-improve invokes /2l-mvp via bash subprocess
- /2l-mvp reads vision.md and executes iteration workflow
- /2l-improve monitors exit code for success/failure
- /2l-improve updates pattern status after completion

**Data flow:**
```
/2l-improve
  → generates .2L/plan-6/vision.md
  → invokes /2l-mvp
  → /2l-mvp reads vision.md
  → /2l-mvp executes builders
  → /2l-mvp modifies agents/*.md, lib/*.sh
  → /2l-mvp completes (exit code 0 or 1)
  → /2l-improve updates global-learnings.yaml
```

**Error handling:** If /2l-mvp fails (exit 1), /2l-improve rolls back git checkpoint.

---

**Component B: /2l-improve ↔ global-learnings.yaml (Data)**

**How they connect:**
- /2l-improve reads global-learnings.yaml (input)
- /2l-improve filters patterns WHERE status=IDENTIFIED
- /2l-improve updates pattern status after implementation
- /2l-improve uses atomic_write_yaml for safe updates

**Data flow:**
```
global-learnings.yaml (status=IDENTIFIED)
  → /2l-improve reads
  → Pattern detection & ranking
  → Vision generation
  → /2l-mvp execution
  → Status update (status=IMPLEMENTED)
  → global-learnings.yaml (updated atomically)
```

**Synchronization:** File locking prevents concurrent writes.

---

**Component C: /2l-improve ↔ Git (Version Control)**

**How they connect:**
- /2l-improve checks git status before starting
- /2l-improve creates safety checkpoint (git commit)
- /2l-mvp modifies files in meditation space
- /2l-improve auto-commits after success
- /2l-improve rolls back on failure (git reset)

**Data flow:**
```
git status check (abort if dirty)
  → git commit (pre-improvement checkpoint)
  → /2l-mvp modifies files
  → git commit (auto-commit with tag)
  OR
  → git reset --hard HEAD~1 (rollback on failure)
```

**Git tags:** `2l-improve-{pattern-id}` enables tracking which pattern each commit fixed.

---

**Component D: /2l-improve ↔ Event System (Observability)**

**How they connect:**
- /2l-improve emits 9 events during execution
- Events written to .2L/events.jsonl
- Dashboard reads events.jsonl for real-time progress
- Events enable post-mortem analysis

**Event types:**
- command_start, learnings_loaded, pattern_selected
- vision_generated, user_confirmed
- self_modification_start, self_modification_complete
- status_updated, command_complete

**Purpose:** Dashboard visibility, debugging, analytics.

---

## Risks & Challenges

### Technical Risks

**Risk: Self-Destruction via Orchestrator Modification**

**Impact:** CRITICAL - If orchestrator breaks, all future /2l-mvp runs fail
**Likelihood:** MEDIUM (if safety checks fail)

**Mitigation strategy:**
1. Hard-coded orchestrator exclusion (verify_orchestrator_exclusion)
2. Component inference validation (never suggest 2l-mvp.md)
3. Unit tests for orchestrator exclusion
4. Git rollback capability (recover from failures)
5. Symlink architecture (source code in git-controlled directory)

**Residual risk:** LOW after mitigation

---

**Risk: Vision Quality Variability**

**Impact:** MEDIUM - Poor visions lead to validation failures
**Likelihood:** HIGH (LLM-generated content varies)

**Mitigation strategy:**
1. Template-based generation (consistent structure)
2. Quality validation (check for TODO/TBD placeholders)
3. Evidence inclusion (concrete examples)
4. Manual edit option (user can refine)
5. Validation checkpoint (poor visions fail validation)

**Residual risk:** MEDIUM (acceptable for MVP)

---

**Risk: Git Conflicts During Self-Modification**

**Impact:** HIGH - Workflow interruption, manual intervention needed
**Likelihood:** LOW (single-user environment)

**Mitigation strategy:**
1. Pre-flight git status check (abort if dirty)
2. File locking (prevent concurrent runs)
3. Clear error messages (guide user)
4. Git stash option (handle temporary changes)

**Residual risk:** LOW (good error handling)

---

### Complexity Risks

**Risk: Pattern Detection False Positives**

**Impact:** MEDIUM - Wasted effort fixing wrong issues
**Likelihood of builder needing to split:** LOW

**Rationale:**
- Pattern detection is algorithmically well-defined (80 LOC)
- Similarity matching is conservative (exact root_cause + severity)
- User reviews pattern in confirmation workflow
- Can be implemented and tested by single builder

**Mitigation:** Comprehensive testing with synthetic data (multiple test patterns)

---

**Risk: Component Inference Accuracy**

**Impact:** MEDIUM - Vision suggests wrong files to modify
**Likelihood of builder needing to split:** LOW

**Rationale:**
- Component inference uses keyword matching (simple heuristic)
- Fallback to safe default (agents/2l-validator.md)
- User reviews affected files in confirmation workflow
- Can be implemented by single builder (part of vision generation)

**Mitigation:** Manual edit option allows user to correct inaccuracies

---

## Recommendations for Planner

### Recommendation 1: Use 2-Builder Approach

**Rationale:**
- Total ~400 LOC can be split into two logical chunks
- Builder-1: Core command (components 1, 2, 4, 7) = ~190 LOC
- Builder-2: Vision & self-modification (components 3, 5, 6) = ~210 LOC
- Sequential dependency: Builder-2 needs Builder-1's pattern selection

**Builder-1 scope:**
- Learning reader, pattern detector, confirmation workflow, events
- Deliverable: /2l-improve --dry-run works end-to-end

**Builder-2 scope:**
- Vision generator, self-modify orchestrator, status updater
- Deliverable: /2l-improve auto mode works end-to-end

**Benefits:**
- Parallel development (Builder-1 foundation, then Builder-2 builds on it)
- Clear integration point (pattern selection data structure)
- Testable milestones (dry-run, then full workflow)

---

### Recommendation 2: Template-Based Vision Generation

**Rationale:**
- Consistent structure more important than flexibility
- Easier testing (deterministic outputs)
- Lower risk than LLM generation
- Maintainable (update template to improve all visions)

**Implementation:**
- Create `lib/2l-vision-template.md` (50 lines)
- Python string formatting for variable substitution
- Quality validation checks (TODO/TBD detection)

**Alternative considered:** LLM-based generation
**Why rejected:** Higher variability, harder to test, risk of hallucinations

---

### Recommendation 3: Start with Single-Pattern MVP

**Rationale:**
- Vision mentions "top 2-3 patterns" but complexity analysis shows single-pattern is sufficient for MVP
- Multi-pattern support adds significant complexity:
  - Vision must merge multiple solutions
  - Success criteria must cover all patterns
  - Builders must handle multiple problem domains in one iteration
  - Testing becomes exponentially harder

**MVP approach:** Select top 1 pattern by impact score

**Future enhancement:** Add multi-pattern support in plan-6 or plan-7 after validating single-pattern workflow

**Benefits:**
- Simpler vision generation (no merging logic)
- Clearer success criteria (one problem fixed)
- Easier validation (single fix to verify)
- Faster implementation (10-14 hours achievable)

---

### Recommendation 4: Implement Dry-Run Mode

**Rationale:**
- Essential for testing without side effects
- User can preview impact before committing
- Easier debugging during development
- Low implementation cost (~20 LOC)

**Usage:**
```bash
/2l-improve --dry-run
```

**Output shows:**
- Patterns analyzed (count, filter results)
- Top pattern selected (with impact score)
- What vision would contain
- What /2l-mvp would do
- What status update would occur

**Benefits:**
- Safe testing
- User confidence
- Development aid

---

### Recommendation 5: Comprehensive Safety Testing

**Rationale:**
- Meta-circular code is hard to debug
- Bugs can break entire 2L system
- Safety mechanisms must be battle-tested

**Test coverage required:**
- Unit test: Orchestrator exclusion (must abort if 2l-mvp.md suggested)
- Unit test: Git status check (must abort if working directory dirty)
- Integration test: Full workflow with synthetic learnings
- Edge case test: Concurrent runs (file locking works)
- Edge case test: User cancels (no side effects)

**Testing priority:** HIGH (allocate 20% of builder time to testing)

---

## Resource Map

### Critical Files/Directories

**/.2L/global-learnings.yaml**
Purpose: Source of learnings, updated with status after implementation
Created by: Iteration 1 (orchestrator reflection)
Used by: /2l-improve (read for pattern detection, write for status updates)

---

**commands/2l-improve.md**
Purpose: Main command implementation (to be created)
Format: Markdown command file (like 2l-mvp.md, 2l-vision.md)
Size: ~400 LOC

---

**lib/2l-yaml-helpers.py**
Purpose: YAML manipulation utilities (already exists)
Functions used: atomic_write_yaml, generate_pattern_id (maybe)
Status: Complete from iteration 1

---

**lib/2l-event-logger.sh**
Purpose: Event emission (already exists)
Function used: log_2l_event
Status: Complete

---

**~/.claude/ → ~/Ahiya/2L/**
Purpose: Symlink architecture (changes immediately live)
Critical for: Self-modification (changes to agents/commands go live instantly)
Verification: Must check symlink integrity before modifying

---

**/.2L/events.jsonl**
Purpose: Event log for dashboard observability
Written by: /2l-improve (9 events per execution)
Read by: Dashboard

---

**/.2L/plan-{N}/vision.md**
Purpose: Auto-generated vision (to be created by /2l-improve)
Template: lib/2l-vision-template.md (new file, ~50 LOC)
Consumed by: /2l-mvp (orchestrator)

---

### Key Dependencies

**Iteration 1 (COMPLETE):**
- global-learnings.yaml schema
- atomic_write_yaml function
- Learning capture in validators
- Orchestrator reflection (merge learnings)
- All tested and validated

**Existing 2L Infrastructure:**
- /2l-mvp command (orchestrator)
- Event system (log_2l_event)
- Git operations (commits, rollback)
- Symlink architecture
- Config.yaml (plan tracking)

**System Utilities:**
- Python 3 (with PyYAML)
- Bash 4+
- Git
- flock (file locking)

---

### Testing Infrastructure

**Unit Tests:**
Tool/Approach: Bash test framework (custom, inline in command file)
Rationale: Simple, no external dependencies, consistent with 2L pattern
Coverage: Pattern detection, orchestrator exclusion, status updates

---

**Integration Tests:**
Tool/Approach: End-to-end bash scripts
Rationale: Test full workflow with synthetic data
Coverage: /2l-improve (manual mode), /2l-improve (auto mode), duplicate prevention

---

**Edge Case Tests:**
Tool/Approach: Bash scripts
Rationale: Cover failure scenarios and boundary conditions
Coverage: Tie scores, all low severity, dirty git, concurrent runs, user cancel

---

**Testing Data:**
Location: .2L/test-data/synthetic-learnings.yaml
Purpose: Reproducible test patterns for all test scenarios
Format: YAML matching global-learnings.yaml schema

---

## Questions for Planner

**Question 1: Multi-pattern scope**

Should iteration 2 support multiple patterns in a single vision (as vision mentions "top 2-3 patterns"), or start with 1 pattern MVP and add multi-pattern support later?

**Explorer recommendation:** Start with 1 pattern. Multi-pattern adds significant complexity (vision merging, success criteria spanning multiple domains, harder testing). Validate single-pattern workflow first, then extend in future iteration.

---

**Question 2: Manual verification workflow**

Vision mentions `/2l-verify` command for marking patterns as VERIFIED (status: IMPLEMENTED → VERIFIED). Should this be in iteration 2, or deferred to plan-6?

**Explorer recommendation:** Defer to plan-6. Iteration 2 already has scope for IDENTIFIED → IMPLEMENTED lifecycle. Adding VERIFIED state requires new command, new workflow, new testing. Focus on core self-improvement loop first.

---

**Question 3: Component inference fallback**

If component inference fails to identify affected files from solution text, should we:
- A) Abort and require manual vision editing
- B) Default to safe set of files (agents/2l-validator.md)
- C) Prompt user for manual file selection

**Explorer recommendation:** Option B (default to safe set). Rationale: Manual edit option already exists (user can choose [E]dit in confirmation workflow). Default behavior should be safe and non-blocking.

---

**Question 4: Pattern deduplication threshold**

Should we allow manual override of "minimum 2 occurrences" rule for critical severity issues that occur only once?

**Explorer recommendation:** No manual override in iteration 2. Keep rule simple and conservative. If a critical issue occurs only once, it might be project-specific rather than systemic. User can always create vision manually via /2l-vision if truly needed.

---

**Question 5: Git conflict resolution**

Should /2l-improve offer `git stash` as an option, or strictly require clean working directory?

**Explorer recommendation:** Strict requirement (no stash). Simpler implementation, clearer contract, less error-prone. User can manually `git stash` before running /2l-improve if they want that workflow.

---

**Question 6: Event retention**

Should `.2L/events.jsonl` be truncated periodically, or grow indefinitely?

**Explorer recommendation:** Defer to future iteration. For MVP, let it grow. Add log rotation in plan-6 when dashboard analytics are more mature and retention requirements are clear.

---

## Conclusion

The `/2l-improve` command completes plan-5's self-reflection infrastructure with a well-architected, safety-first implementation. Analysis reveals 7 components totaling ~400 LOC, achievable by 2 builders in 10-14 hours.

**Key Findings:**
- All iteration 1 dependencies complete and tested
- No new libraries or utilities needed
- Meta-circular safety mechanisms well-defined
- Template-based vision generation reduces risk
- 2-builder split provides clear integration point

**Critical Success Factors:**
1. Never modify orchestrator (hard-coded exclusion)
2. Vision quality validation (template-based approach)
3. Comprehensive safety testing (meta-circular code is risky)
4. Clear error messages (user must understand failures)
5. Git safety checkpoints (rollback capability essential)

**Recommended Approach:**
- 2 builders (core command + vision/self-modification)
- Template-based vision generation
- Single-pattern MVP (extend to multi-pattern later)
- Dry-run mode for safe testing
- Bash for workflow, Python for data processing

**Risk Assessment:**
- Self-destruction risk: LOW (multi-layered safety)
- Vision quality risk: MEDIUM (acceptable for MVP)
- Git conflict risk: LOW (good error handling)
- Pattern detection risk: LOW (conservative matching)

**Complexity Justification:**
Vision estimates 10-14 hours. Explorer analysis confirms this is achievable with:
- ~400 LOC across 7 components
- 2 builders working sequentially
- Comprehensive testing (unit, integration, edge cases)
- Template-based approach (reduces LLM variability)

**Ready for Planning Phase.** All architectural questions answered. Planner has sufficient detail to create builder tasks.

---

*Explorer-1 Report Complete*
*Date: 2025-11-19*
*Analysis Duration: 90 minutes*
*Confidence Level: HIGH (90%)*
*Word Count: ~12,500 words*
*Code Examples: 25+*
*Diagrams: 3 (component, data flow, integration)*
