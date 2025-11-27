# Explorer 1 Report: Architecture & Structure

## Executive Summary

The 2L MVP system requires automatic reflection creation and aggregation infrastructure to complete the self-improvement cycle. Based on analysis of the orchestration architecture (`/2l-mvp`), existing learning infrastructure (`orchestrator_reflection` at lines 1680-1773), and the event system, this report identifies exact integration points for:

1. **Automatic REFLECTION.md creation** - Hook after validation PASS in `/2l-mvp` (line ~1199)
2. **Reflection aggregation system** - New Python utility to convert reflections into patterns
3. **Enhanced vision generation** - Integration of exploration context (partially complete in iteration 8)

The architecture follows an event-driven, file-based coordination model with atomic operations and graceful degradation.

## Discoveries

### Discovery Category 1: Existing Reflection Infrastructure

**Finding 1: `orchestrator_reflection` function exists (lines 1680-1773)**
- **Location:** `/home/ahiya/Ahiya/2L/commands/2l-mvp.md` lines 1680-1773
- **Purpose:** Merges iteration learnings into global knowledge base
- **Hook point:** Called after validation PASSES (line 1199 and 1435)
- **Current behavior:**
  - Reads `{iteration_dir}/learnings.yaml` (created by healers during healing phase)
  - Calls `lib/2l-yaml-helpers.py merge_learnings` to aggregate into `.2L/global-learnings.yaml`
  - Emits `reflection_complete` event
  - Returns learning count

**Finding 2: Learnings only created during HEALING**
- **Current trigger:** Healers create `learnings.yaml` when fixing validation failures
- **Gap:** NO learnings captured for first-pass validation success
- **Impact:** Iterations that pass validation without healing generate NO reflection data
- **Evidence:** `orchestrator_reflection` returns 0 if `learnings.yaml` doesn't exist (line 1700)

**Finding 3: Reflection hook placement**
- **Line 1199:** First-pass validation PASS - calls `orchestrator_reflection(plan_id, global_iter, ITER_DIR)`
- **Line 1435:** Post-healing validation PASS - calls `orchestrator_reflection(plan_id, global_iter, ITER_DIR)`
- **Architecture:** Reflection happens BEFORE `iteration_complete` event and auto-commit
- **Timing:** Perfect location for new REFLECTION.md creation

### Discovery Category 2: Validation Report Structure

**Finding 1: Validation report format**
- **Location:** `.2L/plan-{N}/iteration-{M}/validation/validation-report.md`
- **Example analyzed:** `/home/ahiya/Ahiya/2L/.2L/plan-3/iteration-2/validation/validation-report.md`
- **Key sections:**
  1. Status: PASS/FAIL
  2. Confidence Level: HIGH/MEDIUM/LOW (percentage)
  3. Executive Summary
  4. Validation Results (per check category)
  5. Issues Summary (Critical/Major/Minor)
  6. Success Criteria Verification
  7. Quality Assessment
  8. Recommendations

**Finding 2: Rich metadata available**
- Validation duration (timestamp in report)
- Healing rounds count (check for `healing-{N}` directories)
- Files modified (git diff count)
- Integration rounds (check `integration/round-{N}` directories)
- Builder count (count `builder-{N}-report.md` files)

**Finding 3: Issue categorization patterns**
```markdown
### Critical Issues (Block deployment)
1. **Issue title**
   - Category: TypeScript / Logic error / etc
   - Location: file.ts lines X-Y
   - Impact: Description
   - Root cause: Analysis
   - Suggested fix: Code block
```

### Discovery Category 3: Event System Architecture

**Finding 1: Event logger library**
- **Location:** `/home/ahiya/Ahiya/2L/lib/2l-event-logger.sh`
- **Function:** `log_2l_event "event_type" "data" "phase" "agent_id"`
- **Storage:** `.2L/events.jsonl` (JSON Lines format)
- **Schema:**
  ```json
  {
    "timestamp": "2025-11-27T02:15:49Z",
    "event_type": "agent_start",
    "phase": "exploration",
    "agent_id": "explorer-1",
    "data": "Explorer-1: Starting architecture analysis"
  }
  ```

**Finding 2: Event emission pattern**
- **Conditional execution:** All events wrapped in `if [ "$EVENT_LOGGING_ENABLED" = true ]`
- **Graceful degradation:** No crashes if logger missing
- **Fire-and-forget:** Never blocks orchestration
- **4 parameters required:** event_type, data, phase, agent_id

**Finding 3: New event type needed**
- **Name:** `reflection_created` (consistent with `reflection_complete` for aggregation)
- **Phase:** `reflection` (new phase between validation and complete)
- **Agent ID:** `orchestrator` (reflection is orchestrator responsibility)
- **Data format:** `"REFLECTION.md created: {learning_count} insights captured"`

### Discovery Category 4: File Structure Conventions

**Finding 1: Iteration directory structure**
```
.2L/plan-{N}/iteration-{M}/
├── exploration/
│   ├── explorer-1-report.md
│   ├── explorer-2-report.md
│   └── explorer-3-report.md
├── plan/
│   ├── overview.md
│   ├── tech-stack.md
│   ├── patterns.md
│   └── builder-tasks.md
├── building/
│   ├── builder-1-report.md
│   └── builder-N-report.md
├── integration/
│   ├── round-1/
│   │   ├── integration-plan.md
│   │   ├── integrator-1-report.md
│   │   └── ivalidation-report.md
│   └── final-integration-report.md
├── validation/
│   └── validation-report.md
├── healing-{N}/ (if validation failed)
│   ├── exploration/
│   ├── healer-{M}-report.md
│   └── validation-report.md
├── learnings.yaml (created by healers, if healing occurred)
└── REFLECTION.md (NEW - to be created after validation PASS)
```

**Finding 2: Storage locations**
- **Iteration-specific:** `{iteration_dir}/REFLECTION.md` (captures THIS iteration)
- **Global patterns:** `.2L/global-learnings.yaml` (aggregated patterns across projects)
- **Audit trail:** `.2L/pattern-lifecycle.jsonl` (state transitions over time)

**Finding 3: Atomic write pattern**
- **Python helper:** `lib/2l-yaml-helpers.py` has `atomic_write_yaml()` function
- **Temp file + rename:** Prevents corruption on write failure
- **Backup pattern:** `.bak` file created before modification
- **Used by:** `merge_learnings`, `update_pattern_status`

## Patterns Identified

### Pattern Type: Post-Validation Reflection Hook

**Description:** Orchestrator creates REFLECTION.md after validation passes, capturing insights from the iteration regardless of whether healing occurred.

**Use Case:** Apply after line 1199 (first-pass PASS) and line 1435 (post-healing PASS)

**Example:**
```bash
# Line 1199 in execute_iteration() - after first-pass validation PASS
if validation_status == 'PASS':
    print(f"   ✅ Validation PASSED")

    # NEW: Create iteration reflection (Feature 2)
    create_iteration_reflection(plan_id, global_iter, ITER_DIR)

    # EXISTING: Orchestrator Reflection (merge learnings)
    orchestrator_reflection(plan_id, global_iter, ITER_DIR)

    return  # Iteration complete!
```

**Recommendation:** YES - Add new `create_iteration_reflection()` function before existing `orchestrator_reflection()` call

### Pattern Type: Reflection Document Format

**Description:** REFLECTION.md captures structured insights about iteration success/failure

**Use Case:** Standard format for all iterations, enables aggregation into patterns

**Example:**
```markdown
# Iteration Reflection

## Metadata
- **Iteration:** {global_iter}
- **Plan:** {plan_id}
- **Status:** PASS/FAIL
- **Duration:** {seconds}s
- **Healing Rounds:** {count}
- **Files Modified:** {count}
- **Timestamp:** {ISO8601}

## What Worked Well
- {Insight from successful validation checks}
- {Insight from builder quality}
- {Insight from integration smoothness}

## What Could Improve
- {Insight from warnings in validation}
- {Insight from minor issues}
- {Insight from integration challenges}

## Key Learnings
1. **{Learning title}**
   - Context: {What happened}
   - Root Cause: {Why it happened}
   - Solution: {How it was resolved}
   - Severity: HIGH/MEDIUM/LOW
   - Recurrence Risk: HIGH/MEDIUM/LOW

## Metrics
- Validation confidence: {percentage}
- Integration rounds: {count}
- Builder success rate: {count}/{total}
- Code quality score: {metric}

## Recommendations for Future Iterations
- {Actionable recommendation}
- {Actionable recommendation}
```

**Recommendation:** YES - Implement this structure in reflection generator

### Pattern Type: Reflection Aggregation Pipeline

**Description:** Convert REFLECTION.md files into global patterns using similarity detection

**Use Case:** Run periodically or on-demand to detect recurring issues across iterations

**Example Python architecture:**
```python
# lib/2l-reflection-aggregator.py

class ReflectionAggregator:
    def __init__(self, global_learnings_path, similarity_threshold=0.8):
        self.global_learnings = self.load_global_learnings()
        self.similarity_threshold = similarity_threshold
    
    def aggregate_reflections(self, reflection_files):
        """
        Read multiple REFLECTION.md files and group similar learnings
        
        Returns:
            new_patterns: List of patterns to add to global learnings
            updated_patterns: List of patterns to update (increment occurrences)
        """
        learnings = self.extract_learnings(reflection_files)
        grouped = self.group_similar_learnings(learnings)
        return self.convert_to_patterns(grouped)
    
    def group_similar_learnings(self, learnings):
        """
        Use fuzzy matching on root_cause text to detect similar issues
        Threshold: 0.8 similarity (80% string match)
        """
        # Use difflib.SequenceMatcher for similarity scoring
        # Group learnings with >80% similarity in root_cause
        pass
    
    def convert_to_patterns(self, grouped_learnings):
        """
        Convert grouped learnings into PATTERN-{NNN} format
        
        Pattern structure:
        - pattern_id: PATTERN-{next_id}
        - name: Learning title (truncated to 60 chars)
        - occurrences: Count of similar learnings
        - projects: List of unique project names
        - severity: Highest severity from group
        - root_cause: Canonical root cause text
        - proposed_solution: Most common solution
        - status: IDENTIFIED
        - discovered_in: plan-{N}-iter-{M}
        - source_reflections: List of iteration identifiers
        """
        pass
```

**Recommendation:** YES - Implement as separate utility, not inline in orchestrator

### Pattern Type: Event-Driven Observability

**Description:** Emit events at reflection creation and pattern detection for dashboard visibility

**Use Case:** Track reflection pipeline progress in real-time

**Example:**
```bash
# After creating REFLECTION.md
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "reflection_created" \
                 "REFLECTION.md created: ${learning_count} insights captured" \
                 "reflection" \
                 "orchestrator"
fi

# After aggregation detects new pattern
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "pattern_detected" \
                 "New pattern detected: ${pattern_id} (${occurrences} occurrences)" \
                 "aggregation" \
                 "reflection-aggregator"
fi
```

**Recommendation:** YES - Add events for observability

## Complexity Assessment

### High Complexity Areas

**Feature 2: Automatic Reflection Creation**
- **Complexity:** MEDIUM
- **Why:** Requires parsing validation reports, extracting metadata, generating structured markdown
- **Estimated builder splits:** 1 builder (self-contained Python utility)
- **Integration points:** 2 hook locations in `/2l-mvp` (lines 1199, 1435)
- **Files to create:**
  1. `lib/2l-reflection-generator.py` - Main reflection generator
  2. `templates/REFLECTION.md.template` - Reflection document template
- **Files to modify:**
  1. `commands/2l-mvp.md` - Add `create_iteration_reflection()` function call

**Feature 5: Reflection Aggregation System**
- **Complexity:** MEDIUM-HIGH
- **Why:** Similarity detection, fuzzy matching, pattern grouping, incremental updates
- **Estimated builder splits:** 1 builder (focused utility with clear API)
- **Integration points:** 
  - CLI invocation (standalone utility)
  - Optional hook in `/2l-improve` to aggregate before pattern detection
- **Files to create:**
  1. `lib/2l-reflection-aggregator.py` - Aggregation engine with similarity detection
  2. `lib/2l-similarity.py` - Reusable similarity scoring module
- **Files to modify:**
  1. NONE (pure addition, callable as needed)

**Feature 3: Enhanced Vision Generation (BASIC integration)**
- **Complexity:** LOW (partially complete in iteration 8)
- **Why:** Vision generator already receives `--exploration-dir` parameter
- **Estimated builder splits:** 1 builder (enhancement to existing utility)
- **Integration points:** Already integrated at line 562-565 of `/2l-improve`
- **Files to modify:**
  1. `lib/2l-vision-generator.py` - Add reflection reading logic
  2. `templates/improvement-vision.md` - Add {REFLECTION_SUMMARY} placeholder

### Medium Complexity Areas

**Metadata Extraction**
- **Complexity notes:** Parsing markdown validation reports, counting files, calculating durations
- **Mitigation:** Use existing bash utilities (grep, wc, find) and git commands
- **Files:** All metadata available via filesystem inspection and git diff

**Similarity Detection**
- **Complexity notes:** Fuzzy string matching with threshold tuning
- **Mitigation:** Use Python `difflib.SequenceMatcher` (stdlib, no dependencies)
- **Threshold:** Start with 0.8 (80% similarity), make configurable

### Low Complexity Areas

**Event Emission**
- **Straightforward:** Existing `log_2l_event` library handles all event logging
- **Pattern:** Copy from existing orchestrator code (lines 1751-1754)

**Template Rendering**
- **Straightforward:** Python string formatting with f-strings or `.format()`
- **Pattern:** Similar to existing vision generator template system

## Technology Recommendations

### Primary Stack

**Language Choice:**
- **Python 3:** For reflection generator and aggregator utilities
- **Rationale:** 
  - Existing 2L infrastructure uses Python (`2l-yaml-helpers.py`, `2l-pattern-detector.py`)
  - Rich text processing capabilities (difflib, yaml, datetime)
  - No new dependencies (use stdlib only)
  - Easy CLI integration via argparse

**Storage Format:**
- **Markdown:** For REFLECTION.md documents
- **Rationale:**
  - Human-readable (easy manual review)
  - Consistent with all other 2L reports
  - Easy parsing (extract sections with regex)
  - Git-friendly (diffs show changes clearly)

- **YAML:** For pattern metadata in global-learnings.yaml
- **Rationale:**
  - Existing format (don't break compatibility)
  - Atomic writes via `2l-yaml-helpers.py` library
  - Human-editable if needed

### Supporting Libraries

**difflib (Python stdlib):**
- **Purpose:** Similarity scoring for reflection aggregation
- **API:** `difflib.SequenceMatcher(None, str1, str2).ratio()`
- **Threshold:** 0.8 (configurable via CLI flag)

**yaml (PyYAML):**
- **Purpose:** Reading global-learnings.yaml
- **Already used by:** `2l-yaml-helpers.py`, `2l-pattern-detector.py`
- **Installation:** Already installed in 2L environment

**datetime (Python stdlib):**
- **Purpose:** ISO8601 timestamp generation
- **API:** `datetime.now().isoformat()`

**argparse (Python stdlib):**
- **Purpose:** CLI interface for utilities
- **Pattern:** Copy from `2l-yaml-helpers.py` CLI structure

## Integration Points

### External APIs

**NONE** - All processing is local filesystem operations

### Internal Integrations

**Integration 1: /2l-mvp → Reflection Generator**
- **Hook location:** Line 1199 and line 1435 in `commands/2l-mvp.md`
- **How they connect:**
  ```bash
  # New function in /2l-mvp.md
  def create_iteration_reflection(plan_id, global_iter, iteration_dir):
      """
      Create REFLECTION.md for this iteration after validation passes.
      """
      reflection_path = f"{iteration_dir}/REFLECTION.md"
      
      # Call Python reflection generator
      python3 ~/.claude/lib/2l-reflection-generator.py \
          --iteration-dir "$iteration_dir" \
          --plan-id "$plan_id" \
          --global-iter "$global_iter" \
          --output "$reflection_path"
      
      if [ $? -eq 0 ]; then
          # Emit event
          if [ "$EVENT_LOGGING_ENABLED" = true ]; then
              log_2l_event "reflection_created" \
                           "REFLECTION.md created for iteration ${global_iter}" \
                           "reflection" \
                           "orchestrator"
          fi
      fi
  ```

**Integration 2: Reflection Generator → Validation Report**
- **Data flow:** Generator reads validation report to extract insights
- **Location:** `{iteration_dir}/validation/validation-report.md`
- **Extraction targets:**
  - Status (PASS/FAIL)
  - Confidence level
  - Executive summary
  - Issues by category (Critical/Major/Minor)
  - Success criteria results
  - Quality assessment
  - Recommendations

**Integration 3: Reflection Aggregator → Global Learnings**
- **Data flow:** Aggregator reads REFLECTION.md files, updates global-learnings.yaml
- **Library used:** `lib/2l-yaml-helpers.py` for atomic writes
- **How they connect:**
  ```python
  # In 2l-reflection-aggregator.py
  from lib.2l_yaml_helpers import atomic_write_yaml, backup_before_write
  
  # Read reflections
  reflections = self.load_reflections(reflection_files)
  
  # Detect patterns
  new_patterns = self.aggregate_reflections(reflections)
  
  # Update global learnings atomically
  backup_before_write(global_learnings_path)
  updated_data = self.merge_patterns(global_data, new_patterns)
  atomic_write_yaml(global_learnings_path, updated_data)
  ```

**Integration 4: Vision Generator → Exploration Reports (EXISTING)**
- **Current state:** Line 562-565 of `/2l-improve` passes `--exploration-dir` to vision generator
- **Enhancement needed:** Vision generator should also read REFLECTION.md from previous iterations
- **How they connect:**
  ```python
  # In 2l-vision-generator.py
  if args.exploration_dir and os.path.exists(args.exploration_dir):
      # Read explorer reports (ALREADY IMPLEMENTED)
      exploration_context = self.load_exploration_reports(args.exploration_dir)
      
      # NEW: Also read reflection summary
      if os.path.exists(f"{args.exploration_dir}/../REFLECTION.md"):
          reflection_summary = self.load_reflection_summary(...)
          exploration_context += f"\n\n## Previous Iteration Insights\n{reflection_summary}"
  ```

## Risks & Challenges

### Technical Risks

**Risk 1: Reflection creation overhead delays iteration completion**
- **Impact:** HIGH - Blocks iteration_complete event and auto-commit
- **Mitigation strategy:**
  - Keep reflection generator FAST (<5 seconds)
  - Validate report exists before parsing (fail fast)
  - Emit reflection_created event before aggregation (don't block on aggregation)
  - Aggregation runs async or on-demand (not inline in critical path)

**Risk 2: Similarity threshold too high/low**
- **Impact:** MEDIUM - Too high = duplicate patterns, too low = missed groupings
- **Mitigation strategy:**
  - Start with 0.8 (80% similarity)
  - Make threshold configurable via CLI flag
  - Add manual review mode to show grouped learnings before committing
  - Log similarity scores for tuning

**Risk 3: Reflection format drift over time**
- **Impact:** LOW - Parser breaks if reflection template changes
- **Mitigation strategy:**
  - Use section markers (## headers) instead of line numbers
  - Graceful degradation (skip unparseable sections, log warnings)
  - Version reflection schema (`schema_version: "1.0"` in YAML metadata)
  - Backward compatibility for old reflections

### Complexity Risks

**Risk 1: Builder-2 (aggregation) needs splitting**
- **Likelihood:** LOW-MEDIUM
- **Indicators:**
  - Similarity detection requires >150 lines
  - Incremental update logic is complex
  - Testing requires extensive fixtures
- **Mitigation:**
  - Design clear API boundary (aggregator vs similarity module)
  - Split if aggregator.py exceeds 300 lines
  - Create `lib/2l-similarity.py` as separate module if reusable

**Risk 2: Integration testing complexity**
- **Likelihood:** MEDIUM
- **Challenge:** Need test iterations with real validation reports and reflections
- **Mitigation:**
  - Create minimal test fixtures (1-2 simple reflections)
  - Use iteration 8 validation report as real-world test case
  - Test reflection generator in isolation first
  - Test aggregator with pre-created reflections

## Recommendations for Planner

### Recommendation 1: Split Feature 2 into foundation + enhancement

**Rationale:**
- REFLECTION.md creation is core (needed for aggregation to work)
- Event emission is simple add-on
- Metadata extraction could be enhanced post-MVP

**Suggested split:**
- **Builder-1:** Core reflection generator (create REFLECTION.md from validation report)
- **Builder-1 stretch goal:** Event emission and hook integration

### Recommendation 2: Feature 5 aggregation should be ON-DEMAND, not automatic

**Rationale:**
- Aggregation is expensive (O(n²) similarity comparisons)
- Not critical path for iteration completion
- Allows manual review of pattern groupings

**Suggested approach:**
- Create standalone CLI utility: `python3 lib/2l-reflection-aggregator.py --scan .2L/plan-*/iteration-*/REFLECTION.md`
- Add OPTIONAL hook in `/2l-improve` to run before pattern detection
- Document in README as "run weekly to detect new patterns"

### Recommendation 3: Feature 3 vision enhancement is LOWEST priority

**Rationale:**
- Vision generator already receives exploration context (iteration 8)
- Reflection integration is nice-to-have enhancement
- Can be deferred to iteration 10 (verification phase)

**Suggested approach:**
- Mark as BASIC (read reflections if available, gracefully skip if not)
- Focus on reflection CREATION and AGGREGATION first
- Vision enhancement is polish, not core functionality

### Recommendation 4: Use existing patterns for atomic writes

**Rationale:**
- `lib/2l-yaml-helpers.py` already has `atomic_write_yaml()`
- No need to reinvent file locking or backup strategies
- Proven reliable in `orchestrator_reflection` usage

**Suggested approach:**
- Builder-2 imports and uses `atomic_write_yaml()` from yaml-helpers
- Builder-1 writes markdown (no locking needed, single writer)

### Recommendation 5: Event types should follow existing naming convention

**New events to add:**
- `reflection_created` - Emitted by orchestrator after REFLECTION.md written
- `pattern_detected` - Emitted by aggregator when grouping finds new pattern
- `pattern_updated` - Emitted when existing pattern occurrence count increments

**Naming rationale:**
- Matches existing `reflection_complete` (for merge_learnings)
- Matches existing `pattern_implemented` (from lifecycle manager)
- Verb_past_tense format (consistent with `iteration_complete`, `agent_spawn`)

## Resource Map

### Critical Files/Directories

**Commands:**
- `/home/ahiya/Ahiya/2L/commands/2l-mvp.md` - Lines 1680-1773 (existing orchestrator_reflection)
- `/home/ahiya/Ahiya/2L/commands/2l-mvp.md` - Lines 1199, 1435 (hook points for reflection creation)
- `/home/ahiya/Ahiya/2L/commands/2l-improve.md` - Line 112-116 (pattern detector invocation - potential aggregation hook)

**Libraries:**
- `/home/ahiya/Ahiya/2L/lib/2l-yaml-helpers.py` - Atomic write utilities (lines 19-52)
- `/home/ahiya/Ahiya/2L/lib/2l-event-logger.sh` - Event emission (lines 17-51)
- `/home/ahiya/Ahiya/2L/lib/2l-pattern-detector.py` - Reference for CLI structure

**Templates:**
- `~/.claude/templates/improvement-vision.md` - Vision template (to enhance with reflections)

**Storage:**
- `.2L/plan-{N}/iteration-{M}/REFLECTION.md` - NEW iteration reflection document
- `.2L/global-learnings.yaml` - Global pattern storage (updated by aggregator)
- `.2L/events.jsonl` - Event log (updated by reflection_created events)

**Reference Examples:**
- `/home/ahiya/Ahiya/2L/.2L/plan-3/iteration-2/validation/validation-report.md` - Example validation report
- `/home/ahiya/Ahiya/2L/.2L/plan-9/iteration-8/building/builder-1-report.md` - Example builder report

### Key Dependencies

**Python stdlib:**
- `yaml` (PyYAML) - Reading/writing YAML files
- `datetime` - ISO8601 timestamps
- `argparse` - CLI argument parsing
- `difflib` - Similarity scoring (SequenceMatcher)
- `os`, `sys`, `tempfile`, `shutil` - File operations

**Bash:**
- `grep`, `wc`, `find` - Metadata extraction
- `git diff` - File modification counts
- Event logger library (optional, graceful degradation)

**2L Libraries:**
- `lib/2l-yaml-helpers.py::atomic_write_yaml()` - Safe YAML updates
- `lib/2l-event-logger.sh::log_2l_event()` - Event emission

### Testing Infrastructure

**Unit Testing:**
- Test reflection generator with sample validation report
- Test similarity scorer with known similar/dissimilar strings
- Test atomic write behavior (temp file + rename)

**Integration Testing:**
- Create test iteration with real validation report
- Generate REFLECTION.md and verify structure
- Run aggregator on test reflections, verify pattern creation
- Check events.jsonl for reflection_created events

**Smoke Testing:**
- Add reflection creation to smoke test suite
- Verify REFLECTION.md created after /2l-mvp run
- Verify events emitted correctly

## Questions for Planner

**Question 1: Should reflection creation BLOCK iteration completion?**
- Current design: YES (happens before iteration_complete event)
- Alternative: NO (spawn async Task agent to create reflection)
- Tradeoff: Blocking ensures reflection exists, async prevents delays

**Question 2: What is the minimum viable REFLECTION.md format?**
- Full format (all sections): ~15 sections, requires extensive parsing
- Minimal format: Metadata + key learnings only (5 sections)
- Recommendation: Start minimal, enhance in iteration 10

**Question 3: Should aggregator run automatically or on-demand?**
- Automatic: Hook in `/2l-improve` runs before pattern detection
- On-demand: User runs manually when they want to refresh patterns
- Hybrid: Auto-run if >5 new reflections since last aggregation
- Recommendation: On-demand for MVP, auto-run in iteration 10

**Question 4: How to handle reflections from FAILED iterations?**
- Option A: Only create reflections for PASS iterations
- Option B: Create reflections for all iterations (PASS and FAIL)
- Option C: Different reflection format for FAIL (focus on root causes)
- Recommendation: Option A (PASS only) for MVP, Option B for completeness later

**Question 5: Should reflection generator extract learnings from builder reports?**
- Current scope: Only validation report insights
- Extended scope: Also parse builder-{N}-report.md for "Challenges Overcome" sections
- Tradeoff: Richer learnings vs complexity
- Recommendation: Validation report only for MVP (lower risk)

---

**Explorer-1 Status:** COMPLETE
**Quality:** HIGH
**Confidence:** 95%
**Key recommendation:** Start with minimal reflection format, on-demand aggregation, PASS-only iterations
**Integration complexity:** LOW (2 hook points in /2l-mvp, existing libraries handle hard parts)
