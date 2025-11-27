# Builder Task Breakdown

## Overview

3 primary builders will work sequentially (Builder-3 depends on Builder-1 and Builder-2).

**Execution order:**
- **Parallel Group 1:** Builder-1, Builder-2 (no dependencies)
- **Sequential Group 2:** Builder-3 (depends on Group 1)

**Estimated total time:** 7-8 hours

---

## Builder-1: Reflection Generator

### Scope

Create Python utility to generate REFLECTION.md files from iteration artifacts. This utility analyzes validation reports, learnings, and events to produce structured reflections that distinguish 2L framework issues from project-specific issues.

### Complexity Estimate

**MEDIUM**

This task involves parsing markdown validation reports, YAML learnings files, and categorizing issues by priority. The framework issue detection heuristics add complexity, but the overall scope is well-defined and self-contained.

### Success Criteria

- [ ] Python utility created at `lib/2l-reflection-generator.py` (~250-300 lines)
- [ ] Template created at `templates/reflection-template.md` (~50 lines)
- [ ] CLI accepts args: --iteration-dir, --plan-id, --iteration, --output, --jsonl
- [ ] Parses validation report to extract issues and recommendations
- [ ] Reads learnings.yaml (if exists) for framework-specific issues
- [ ] Detects framework issues via file path heuristics (commands/, lib/, agents/, templates/)
- [ ] Detects framework issues via keyword matching (orchestrator, explorer, builder, Task tool, etc.)
- [ ] Categorizes issues into P1 (functionality), P2 (completeness), P3 (speed)
- [ ] Generates REFLECTION.md with all required sections (metadata, what went well, framework issues, summary)
- [ ] Appends learning entries to global-learnings.jsonl (one per framework issue)
- [ ] Uses file locking (fcntl) for JSONL appends
- [ ] Returns exit code 0 on success, 1 on error, 2 on invalid inputs
- [ ] Graceful handling if validation report missing or malformed
- [ ] Non-critical execution (logged warnings don't block orchestrator)
- [ ] Type hints for all functions
- [ ] Docstrings for all public functions and classes

### Files to Create

1. **`lib/2l-reflection-generator.py`** - Main reflection generator utility
   - Purpose: Generate REFLECTION.md from iteration artifacts
   - Key classes: `ReflectionGenerator`
   - Key functions: `parse_validation_report()`, `extract_framework_issues()`, `is_framework_issue()`, `categorize_by_priority()`, `generate_reflection_markdown()`, `append_to_jsonl()`

2. **`templates/reflection-template.md`** - Standard reflection format
   - Purpose: Define structure for all REFLECTION.md files
   - Sections: Metadata, What Went Well, 2L Framework Issues, Summary
   - Issue format: Priority (P1/P2/P3), Category, Problem, Root Cause, Suggested Fix, Affected Components

### Dependencies

**Depends on:** None (standalone, first in sequence)

**Blocks:** Builder-3 (integration needs this utility to exist)

### Implementation Notes

**Framework issue detection heuristics:**

Use multi-heuristic approach for accuracy:

1. **File path matching:**
   - If `affected_files` contains: `commands/`, `lib/`, `agents/`, `templates/`, `.2L/` → framework issue
   - If `affected_files` contains: `app/`, `src/`, `components/`, project-specific dirs → project issue

2. **Keyword matching in root cause/issue:**
   - Framework keywords: "orchestrator", "explorer", "builder", "integrator", "validator", "healer", "Task tool", "agent spawn", "2l-mvp", "2l-improve", "event logging", "pattern detection"
   - Project keywords: (none for 2L self-improvement, but could be "button", "API", "database" for other projects)

3. **Conservative bias:**
   - Prefer false negatives over false positives
   - If uncertain, mark as project issue (avoids noise in patterns)
   - Manual review of first 10-20 reflections to tune heuristics

**Priority categorization:**

- **P1 (Functionality):** Breaks existing workflow (critical path failures)
  - Keywords: "fails", "crashes", "error", "cannot", "blocking", "breaks"
  - Example: "Explorer spawning timeout blocks /2l-improve"

- **P2 (Completeness):** Missing features or gaps (workflow incomplete but doesn't crash)
  - Keywords: "missing", "lacks", "not implemented", "incomplete", "should have"
  - Example: "Missing reflection creation after validation"

- **P3 (Speed):** Performance issues only (workflow works but slow)
  - Keywords: "slow", "performance", "timeout", "takes too long", "optimization"
  - Example: "Pattern aggregation O(n²) slow at 1000 learnings"

**JSONL schema:**
```json
{
  "timestamp": "2025-11-27T04:16:46.280496",
  "learning_id": "plan-9-iter-9-learning-001",
  "project": "2L-self-improvement",
  "plan_id": "plan-9",
  "iteration": 9,
  "category": "functionality",
  "priority": "P1",
  "issue": "Missing exploration before vision",
  "severity": "critical",
  "root_cause": "/2l-improve creates placeholder reports",
  "suggested_fix": "Spawn 3 Task agents at lines 358-410",
  "affected_files": ["commands/2l-improve.md"],
  "pattern_id": null
}
```

**Error handling gotchas:**

- Validation report might not exist (failed iterations)
- Validation report might be malformed (incomplete writes)
- learnings.yaml might not exist (first-pass PASS, no healing)
- JSONL file might be locked (concurrent access)
- File permissions might prevent writing

**Testing approach:**

1. Unit test with iteration 8 validation report (real data)
2. Unit test with synthetic malformed validation report (error handling)
3. Unit test framework issue detection (file paths + keywords)
4. Unit test priority categorization (P1/P2/P3 logic)
5. Integration test: Generate reflection → verify REFLECTION.md format → verify JSONL appended

### Patterns to Follow

Reference patterns from `patterns.md`:

- Use **Python Utility Pattern** for CLI structure (argparse, exit codes, error handling)
- Use **JSONL Append Pattern** for logging learnings (file locking, atomic appends)
- Use **Markdown Parsing Pattern** for reading validation reports (regex extraction)
- Use **Event Emission Pattern** for logging (if called from bash context)
- Use **Error Handling Standards** (specific exceptions, stderr logging, exit codes)
- Use **Path Validation Pattern** for iteration directory checks

### Testing Requirements

- **Unit tests:**
  - `test_parse_validation_report()` - Extract issues from markdown
  - `test_is_framework_issue()` - File path + keyword detection
  - `test_categorize_by_priority()` - P1/P2/P3 classification
  - `test_append_to_jsonl()` - File locking, atomic append

- **Integration tests:**
  - Create test iteration with real validation report
  - Run reflection generator
  - Verify REFLECTION.md created with correct format
  - Verify JSONL appended with correct schema
  - Verify exit code 0 on success

- **Coverage target:** 80% for core logic (parsing, detection, categorization)

### Potential Split Strategy

**This task should NOT require splitting** (complexity is MEDIUM, well within single builder scope).

However, if implementation proves complex (>4 hours), consider:

**Foundation:** Builder-1 creates minimal reflection generator
- Basic REFLECTION.md creation (metadata + summary only)
- No framework issue detection (mark all as framework issues)
- No JSONL logging (just create markdown file)

**Sub-builder 1A:** Framework Issue Detection
- Add file path + keyword heuristics
- Filter out project-specific issues
- Tune detection accuracy

**Sub-builder 1B:** JSONL Integration
- Add append_to_jsonl() functionality
- File locking and error handling
- Schema validation

---

## Builder-2: Reflection Aggregator

### Scope

Create Python utility to aggregate reflections into patterns using incremental similarity matching. This utility reads global-learnings.jsonl, groups similar issues using difflib.SequenceMatcher with 0.8 threshold, and updates global-learnings.yaml with pattern candidates.

### Complexity Estimate

**MEDIUM-HIGH**

This task involves similarity detection (difflib), incremental pattern merging (O(n) not O(n²)), pattern creation logic, and atomic YAML updates. The similarity threshold tuning adds complexity, but the incremental design mitigates performance concerns.

### Success Criteria

- [ ] Python utility created at `lib/2l-reflection-aggregator.py` (~350-400 lines)
- [ ] CLI accepts args: --mode (full|incremental), --threshold, --global-learnings, --dry-run
- [ ] Reads all learnings from global-learnings.jsonl
- [ ] Loads existing patterns from global-learnings.yaml
- [ ] Implements incremental aggregation (O(n·m) where n=learnings, m=patterns)
- [ ] Uses difflib.SequenceMatcher for similarity calculation
- [ ] Threshold default: 0.8 (configurable via --threshold)
- [ ] Groups learnings by best-match (if similarity >= threshold)
- [ ] Creates new pattern if no match above threshold
- [ ] Merges learning into existing pattern (increment occurrence, add to source_learnings)
- [ ] Updates pattern metadata (projects list, affected_files)
- [ ] Writes updated patterns to global-learnings.yaml (atomic write with backup)
- [ ] Dry-run mode shows what would be created without modifying files
- [ ] Logs similarity scores for borderline matches (0.75-0.85)
- [ ] Emits events: pattern_detected (new), pattern_merged (existing)
- [ ] Returns exit code 0 on success, 1 on error
- [ ] Type hints for all functions
- [ ] Docstrings for all public functions and classes

### Files to Create

1. **`lib/2l-reflection-aggregator.py`** - Main aggregation utility
   - Purpose: Convert reflections to patterns via similarity matching
   - Key classes: `ReflectionAggregator`
   - Key functions: `aggregate_learnings()`, `find_best_match()`, `calculate_similarity()`, `merge_into_pattern()`, `create_new_pattern()`, `generate_pattern_id()`, `update_global_learnings()`

### Dependencies

**Depends on:** None (standalone, parallel with Builder-1)

**Blocks:** Builder-3 (integration needs this utility to exist)

### Implementation Notes

**Incremental aggregation algorithm:**

```python
# Pseudo-code for incremental aggregation
def aggregate_learnings(learnings, existing_patterns, threshold=0.8):
    """
    O(n·m) algorithm where n=learnings, m=patterns
    Much faster than O(n²) full re-aggregation
    """
    new_patterns = []
    merged_count = 0

    for learning in learnings:
        # Find best match among existing patterns (O(m))
        best_match = find_best_match(
            learning['root_cause'],
            existing_patterns,
            threshold
        )

        if best_match:
            # Merge into existing pattern
            best_match['occurrences'] += 1
            best_match['source_learnings'].append(learning['learning_id'])
            merged_count += 1
        else:
            # Create new pattern
            new_pattern = create_pattern_from_learning(learning)
            existing_patterns.append(new_pattern)
            new_patterns.append(new_pattern)

    return existing_patterns, new_patterns, merged_count
```

**Similarity calculation:**

Use `difflib.SequenceMatcher` (stdlib, no dependencies):

```python
from difflib import SequenceMatcher

def calculate_similarity(text1: str, text2: str) -> float:
    """
    Ratcliff-Obershelp gestalt pattern matching.
    Returns ratio in [0.0, 1.0].
    """
    norm1 = text1.lower().strip()
    norm2 = text2.lower().strip()
    return SequenceMatcher(None, norm1, norm2).ratio()
```

**Threshold tuning:**

- Default: 0.8 (80% similarity)
- Log all matches in [0.75, 0.85] range for manual review
- Provide --threshold flag for experimentation
- Dry-run mode to preview groupings before committing

**Pattern ID generation:**

Sequential numbering (PATTERN-001, PATTERN-002, ...):

```python
def generate_pattern_id(existing_patterns: List[Dict]) -> str:
    """Generate next pattern ID."""
    if not existing_patterns:
        return "PATTERN-001"

    # Extract numbers from existing IDs
    pattern_nums = []
    for p in existing_patterns:
        match = re.match(r'PATTERN-(\d+)', p['pattern_id'])
        if match:
            pattern_nums.append(int(match.group(1)))

    next_num = max(pattern_nums) + 1 if pattern_nums else 1
    return f"PATTERN-{next_num:03d}"
```

**Atomic YAML write:**

Reuse `lib/2l-yaml-helpers.py::atomic_write_yaml()`:

```python
# Import from existing utility
sys.path.insert(0, str(Path(__file__).parent))
from 2l_yaml_helpers import atomic_write_yaml, backup_before_write

# Usage
backup_before_write(learnings_path)
atomic_write_yaml(learnings_path, updated_data)
```

**Error handling gotchas:**

- global-learnings.yaml might not exist (first run)
- global-learnings.jsonl might be empty (no reflections yet)
- Malformed YAML (corrupted file)
- Malformed JSONL lines (skip with warning)
- Pattern ID collision (regenerate if exists)

**Testing approach:**

1. Unit test similarity calculation (known similar/dissimilar pairs)
2. Unit test best match finding (threshold behavior)
3. Unit test pattern creation (schema validation)
4. Unit test pattern merging (occurrence counting, source_learnings list)
5. Integration test: Create 3 reflections → aggregate → verify patterns created
6. Performance test: Benchmark with 10, 100, 1000 learnings

### Patterns to Follow

Reference patterns from `patterns.md`:

- Use **Python Utility Pattern** for CLI structure
- Use **Atomic File Write Pattern** for YAML updates (reuse 2l-yaml-helpers.py)
- Use **Similarity Matching Pattern** for difflib usage
- Use **JSONL Append Pattern** for reading learnings
- Use **Error Handling Standards** for graceful degradation
- Use **Performance Patterns** for incremental processing

### Testing Requirements

- **Unit tests:**
  - `test_calculate_similarity()` - Verify threshold behavior
  - `test_find_best_match()` - Best match selection
  - `test_merge_into_pattern()` - Occurrence increment, metadata update
  - `test_create_new_pattern()` - Schema validation
  - `test_generate_pattern_id()` - Sequential numbering

- **Integration tests:**
  - Create test JSONL with 5 learnings (3 similar, 2 different)
  - Run aggregator
  - Verify 2 patterns created (1 with 3 occurrences, 1 with 2)
  - Verify global-learnings.yaml updated correctly

- **Performance tests:**
  - 10 learnings: <100ms
  - 100 learnings: <1s
  - 1000 learnings: <10s

- **Coverage target:** 80% for core logic (similarity, merging, pattern creation)

### Potential Split Strategy

**This task should NOT require splitting** (complexity is MEDIUM-HIGH but manageable).

However, if implementation proves complex (>5 hours), consider:

**Foundation:** Builder-2 creates basic aggregator
- Simple similarity matching (difflib only, no tuning)
- Pattern creation (new patterns only, no merging)
- Basic YAML write (no backup, no atomic)

**Sub-builder 2A:** Incremental Merging
- Add best-match finding logic
- Merge into existing patterns
- Occurrence counting and metadata updates

**Sub-builder 2B:** Production Hardening
- Atomic writes with backup
- Error handling and graceful degradation
- Dry-run mode and logging
- Performance optimizations

---

## Builder-3: Integration & Testing

### Scope

Integrate reflection generator and aggregator into /2l-mvp orchestrator. Add reflection creation hooks at two locations (lines 1199 and 1435), emit events, and create end-to-end integration tests. Also implement basic vision enhancement (read exploration context if available).

### Complexity Estimate

**MEDIUM**

This task modifies /2l-mvp (critical orchestrator), requires testing both code paths (first-pass PASS and post-healing PASS), and needs end-to-end validation. The integration logic is straightforward, but testing thoroughness adds complexity.

### Success Criteria

- [ ] Modified `commands/2l-mvp.md` at line 1199 (first-pass validation PASS)
- [ ] Modified `commands/2l-mvp.md` at line 1435 (post-healing validation PASS)
- [ ] Bash function `create_iteration_reflection()` added to /2l-mvp
- [ ] Function calls reflection generator with correct arguments
- [ ] Function handles errors gracefully (non-blocking failures)
- [ ] Function emits `reflection_created` event on success
- [ ] Function emits `reflection_failed` event on error (non-blocking)
- [ ] Reflection creation happens BEFORE `iteration_complete` event
- [ ] Integration test: Run /2l-mvp iteration → verify REFLECTION.md created
- [ ] Integration test: Verify JSONL appended correctly
- [ ] Integration test: Run aggregator → verify patterns created
- [ ] Modified `lib/2l-vision-generator.py` to read exploration context (BASIC)
- [ ] Vision generator reads exploration reports if `--exploration-dir` provided
- [ ] Vision includes exploration summary in output (optional section)
- [ ] Backward compatibility: /2l-mvp works even if reflection generator fails

### Files to Create

None (all modifications to existing files)

### Files to Modify

1. **`commands/2l-mvp.md`** - Add reflection creation hooks
   - Line 1199: After first-pass validation PASS, before iteration_complete
   - Line 1435: After post-healing validation PASS, before iteration_complete
   - New function: `create_iteration_reflection()` (~30 lines)
   - Error handling: Try/catch wrapper, non-blocking failures

2. **`lib/2l-vision-generator.py`** - Add exploration context reading (BASIC)
   - Read exploration reports from `--exploration-dir` if provided
   - Extract key findings and integration points
   - Add "Exploration Context" section to vision output
   - Graceful degradation if exploration reports missing

### Dependencies

**Depends on:** Builder-1 (needs reflection generator), Builder-2 (needs aggregator for testing)

**Blocks:** None (final builder in sequence)

### Implementation Notes

**Bash function to add to /2l-mvp:**

```bash
create_iteration_reflection() {
    local plan_id="$1"
    local global_iter="$2"
    local iter_dir="$3"

    local reflection_path="$iter_dir/REFLECTION.md"
    local global_learnings_jsonl=".2L/global-learnings.jsonl"

    echo "   📝 Generating iteration reflection..."

    # Call Python reflection generator (redirect errors to suppress noise)
    python3 "$HOME/.claude/lib/2l-reflection-generator.py" \
        --iteration-dir "$iter_dir" \
        --plan-id "$plan_id" \
        --iteration "$global_iter" \
        --output "$reflection_path" \
        --jsonl "$global_learnings_jsonl" 2>/dev/null

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "      ✅ Reflection created: $reflection_path"

        # Emit success event
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "reflection_created" \
                         "Iteration ${global_iter} reflection created" \
                         "reflection" \
                         "orchestrator"
        fi

        return 0
    else
        echo "      ⚠️  Reflection generation failed (non-critical, continuing)"

        # Emit failure event (for monitoring, but don't block)
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "reflection_failed" \
                         "Exit code: ${exit_code}" \
                         "reflection" \
                         "orchestrator"
        fi

        return 1  # Non-blocking failure
    fi
}
```

**Integration points in /2l-mvp:**

**Line 1199 context:**
```bash
if validation_status == 'PASS':
    print(f"   ✅ Validation PASSED!")

    # Orchestrator Reflection: Merge learnings before iteration complete
    orchestrator_reflection(plan_id, global_iter, ITER_DIR)

    # NEW: Create iteration reflection
    create_iteration_reflection "$plan_id" "$global_iter" "$ITER_DIR"

    # EVENT: iteration_complete
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "iteration_complete" ...
    fi
```

**Line 1435 context:** (identical insertion)

**Vision enhancement (BASIC):**

Add to `lib/2l-vision-generator.py`:

```python
def read_exploration_context(exploration_dir: Path) -> str:
    """
    Read exploration reports and extract key context.

    Returns:
        Formatted exploration summary for vision
    """
    if not exploration_dir or not exploration_dir.exists():
        return ""

    context = "\n## Exploration Context\n\n"

    # Read explorer reports
    for report_path in sorted(exploration_dir.glob("explorer-*-report.md")):
        with open(report_path) as f:
            content = f.read()

        # Extract key findings (simple heuristic: lines after "## Key Findings")
        findings_match = re.search(r'## Key Findings\s*\n(.*?)\n##',
                                   content, re.DOTALL)
        if findings_match:
            context += f"### {report_path.stem}\n\n"
            context += findings_match.group(1).strip() + "\n\n"

    return context if len(context) > 30 else ""  # Empty if no content found
```

**Error handling gotchas:**

- Reflection generator might not exist (first deployment)
- Python might not be installed (constrained environment)
- JSONL file permissions (write access)
- /2l-mvp must continue even if reflection fails (non-blocking)
- Event logger might not be loaded (graceful degradation)

**Testing approach:**

1. Integration test: Create test plan, run iteration, verify reflection created
2. Integration test: Verify JSONL appended with correct schema
3. Integration test: Modify test data to trigger framework issue detection
4. Integration test: Run aggregator on test JSONL, verify pattern created
5. End-to-end test: /2l-mvp → reflection → aggregation → /2l-improve (reads pattern)
6. Failure test: Delete reflection generator, verify /2l-mvp continues normally

### Patterns to Follow

Reference patterns from `patterns.md`:

- Use **Event Emission Pattern** for bash event logging
- Use **Error Handling Standards** for non-blocking failures
- Use **Markdown Parsing Pattern** for vision enhancement (reading exploration reports)
- Use **Path Validation Pattern** for iteration directory checks
- Follow bash function conventions (local variables, return codes)

### Testing Requirements

- **Integration tests:**
  - Create test iteration (plan-test, iteration-1)
  - Run /2l-mvp through validation PASS
  - Verify REFLECTION.md created at expected location
  - Verify JSONL appended to global-learnings.jsonl
  - Parse JSONL, verify schema matches expected format
  - Run aggregator on test data
  - Verify global-learnings.yaml updated with pattern

- **End-to-end test:**
  - Full /2l-mvp iteration → reflection → aggregation → pattern detection
  - Use real iteration artifacts from iteration 8 as test data
  - Verify all files created in expected locations
  - Verify events logged to .2L/events.jsonl

- **Failure tests:**
  - Delete reflection generator, run /2l-mvp, verify continues
  - Corrupt JSONL file, run aggregator, verify graceful degradation
  - Missing validation report, run reflection generator, verify error handling

- **Coverage target:** 100% for integration code paths (both line 1199 and 1435)

### Potential Split Strategy

**This task should NOT require splitting** (complexity is MEDIUM, straightforward integration).

No sub-builders recommended (3 file modifications with clear requirements).

---

## Builder Execution Order

### Parallel Group 1 (No dependencies)

**Execute simultaneously:**
- Builder-1 (Reflection Generator)
- Builder-2 (Reflection Aggregator)

**Why parallel:** Both create new files, no shared dependencies, no conflicts

**Estimated time:** 2.5 hours (Builder-1) + 3.5 hours (Builder-2) = ~3.5 hours (parallel)

### Sequential Group 2 (Depends on Group 1)

**Execute after Group 1 completes:**
- Builder-3 (Integration & Testing)

**Why sequential:** Needs both utilities from Builder-1 and Builder-2 to exist for testing

**Estimated time:** 1.5 hours

### Total Timeline

- **Parallel phase:** 3.5 hours (Builder-1 and Builder-2 in parallel)
- **Sequential phase:** 1.5 hours (Builder-3)
- **Integration phase:** 45-60 minutes (Integrator-1)
- **Validation phase:** 30 minutes
- **Total:** ~6.5-7 hours

---

## Integration Notes

### How builder outputs will come together

**No merge conflicts expected:**
- Builder-1 creates: lib/2l-reflection-generator.py, templates/reflection-template.md
- Builder-2 creates: lib/2l-reflection-aggregator.py
- Builder-3 modifies: commands/2l-mvp.md, lib/2l-vision-generator.py

**No file overlap** - each builder touches different files.

**Integration testing:**

Builder-3 is responsible for end-to-end testing:
1. Test Builder-1 output (reflection generator works standalone)
2. Test Builder-2 output (aggregator works standalone)
3. Test integrated flow (/2l-mvp → reflection → aggregation)
4. Test both code paths (line 1199 and line 1435)

**Shared schema coordination:**

Builder-1 defines JSONL schema (learning entries):
- Builder-2 reads this schema (documented in patterns.md)
- Builder-3 validates schema in integration tests
- Schema documented in builder-1 report

**Potential conflict areas:**

None expected (different files), but watch for:
- Template format changes (Builder-1 creates, Builder-3 tests)
- JSONL schema changes (Builder-1 writes, Builder-2 reads)
- Event names (Builder-1 and Builder-3 emit events, must match naming convention)

**Resolution strategy:**

If conflicts arise:
1. Builder-3 acts as arbiter (final say on schema/format)
2. Document decisions in integration report
3. Update Builder-1/Builder-2 outputs if needed (coordination via chat)
