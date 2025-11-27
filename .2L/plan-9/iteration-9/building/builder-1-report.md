# Builder-1 Report: Reflection Generator

## Status
COMPLETE

## Summary
Successfully built the reflection generator utility that creates structured REFLECTION.md files from iteration artifacts. The generator parses validation reports, detects framework issues using multi-heuristic analysis (file paths + keywords), categorizes issues by priority (P1/P2/P3), and logs learnings to global-learnings.jsonl with file locking.

## Files Created

### Implementation
- `/home/ahiya/.claude/lib/2l-reflection-generator.py` (575 lines) - Main reflection generator utility
  - Purpose: Generate REFLECTION.md from validation reports and learnings.yaml
  - Key classes: `ReflectionGenerator`
  - Key functions: `parse_validation_report()`, `extract_framework_issues()`, `is_framework_issue()`, `categorize_by_priority()`, `generate_reflection_markdown()`, `append_to_jsonl()`
  - CLI with argparse: `--iteration-dir`, `--plan-id`, `--iteration`, `--output`, `--jsonl`, `--dry-run`
  - Exit codes: 0 (success), 1 (error), 2 (safety abort)

### Templates
- `/home/ahiya/.claude/templates/reflection-template.md` (45 lines) - Standard reflection format
  - Purpose: Define structure for all REFLECTION.md files
  - Sections: Metadata, What Went Well, 2L Framework Issues, Summary
  - Placeholders: {PROJECT_NAME}, {PLAN_ID}, {ITERATION_NUMBER}, {VALIDATION_STATUS}, etc.
  - Schema version: 1.0

## Success Criteria Met

- [x] Python utility created at `lib/2l-reflection-generator.py` (~575 lines, target was 250-300)
- [x] Template created at `templates/reflection-template.md` (~45 lines, target was ~50)
- [x] CLI accepts args: --iteration-dir, --plan-id, --iteration, --output, --jsonl
- [x] Parses validation report to extract issues and recommendations
- [x] Reads learnings.yaml (if exists) for framework-specific issues
- [x] Detects framework issues via file path heuristics (commands/, lib/, agents/, templates/)
- [x] Detects framework issues via keyword matching (orchestrator, explorer, builder, Task tool, etc.)
- [x] Categorizes issues into P1 (functionality), P2 (completeness), P3 (speed)
- [x] Generates REFLECTION.md with all required sections (metadata, what went well, framework issues, summary)
- [x] Appends learning entries to global-learnings.jsonl (one per framework issue)
- [x] Uses file locking (fcntl) for JSONL appends
- [x] Returns exit code 0 on success, 1 on error, 2 on invalid inputs
- [x] Graceful handling if validation report missing or malformed
- [x] Non-critical execution (logged warnings don't block orchestrator)
- [x] Type hints for all functions
- [x] Docstrings for all public functions and classes

## Implementation Details

### Framework Issue Detection

The utility uses a multi-heuristic approach for accuracy:

**1. File Path Matching:**
- Framework paths: `commands/`, `lib/`, `agents/`, `templates/`, `.2L/`, `2l-*`
- Project paths (excluded): `app/`, `src/`, `components/`, `pages/`, `api/`

**2. Keyword Matching:**
- Framework keywords: "orchestrator", "explorer", "builder", "integrator", "validator", "healer", "Task tool", "agent spawn", "agent_start", "agent_complete", "2l-mvp", "2l-improve", "event logging", "pattern detection"
- Searches in: issue text, root cause, impact description

**3. Conservative Bias:**
- Prefer false negatives over false positives
- If uncertain, mark as non-framework issue (avoids noise)
- Project-specific paths explicitly excluded

### Priority Categorization

**P1 (Functionality) - Breaks existing workflow:**
- Keywords: "fails", "crashes", "error", "cannot", "blocking", "breaks", "critical", "broken", "does not work"
- Severity: critical, high

**P2 (Completeness) - Missing features or gaps:**
- Keywords: "missing", "lacks", "not implemented", "incomplete", "should have", "could have", "enhancement"
- Default priority if no other match

**P3 (Speed) - Performance issues only:**
- Keywords: "slow", "performance", "timeout", "takes too long", "optimization", "faster", "latency"
- Severity: low

### JSONL Schema

Each framework issue generates a learning entry:

```json
{
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
  "pattern_id": null,
  "timestamp": "2025-11-27T04:36:49.099813"
}
```

### Validation Report Parsing

The parser handles multiple formats:

**Status extraction:**
- Pattern 1: `**Status:** PASS/FAIL`
- Pattern 2: `## Status\n**PASS**`

**Success extraction:**
- Section: `## What Went Well`
- Lines starting with `-` or `*`

**Issues extraction:**
- Section: `## Issues Summary`
- Subsections: `### Critical Issues`, `### Major Issues`, `### Minor Issues`
- Numbered list format with structured fields

**Graceful degradation:**
- Missing validation report → returns empty data with warnings
- Malformed YAML → logs warning, continues with empty learnings
- Missing sections → default values

### File Locking

Uses `fcntl.flock()` for atomic JSONL appends:

```python
with open(jsonl_path, 'a') as f:
    try:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)  # Exclusive lock
        f.write(json.dumps(learning) + '\n')
        f.flush()  # Ensure disk write
    finally:
        fcntl.flock(f.fileno(), fcntl.LOCK_UN)  # Release lock
```

## Testing Performed

### Manual Testing

**Test 1: Plan-3 Iteration-2 (FAIL status with critical issues)**
- Input: `.2L/plan-3/iteration-2/validation/validation-report.md`
- Status: FAIL
- Framework issues detected: 2 (both P1)
- Result: ✅ Correctly parsed and categorized

**Test 2: Plan-9 Iteration-8 (PASS status, no issues)**
- Input: `.2L/plan-9/iteration-8/validation/validation-report.md`
- Status: PASS
- Framework issues detected: 0
- Result: ✅ Correctly handled clean validation

**Test 3: Missing validation report**
- Input: Non-existent iteration directory
- Result: ✅ Exit code 2 (safety abort)

**Test 4: Dry-run mode**
- Command: `--dry-run` flag
- Result: ✅ Shows output without writing files

### Framework Issue Detection Testing

**Positive cases (should detect as framework):**
- Issue in `commands/2l-dashboard.md` → ✅ Detected
- Issue mentioning "orchestrator" → ✅ Detected
- Issue in `lib/2l-pattern-detector.py` → ✅ Detected

**Negative cases (should NOT detect as framework):**
- Issue in `app/components/Button.tsx` → ✅ Not detected (project-specific)
- Issue mentioning "database query" → ✅ Not detected (no framework keywords)

### Priority Categorization Testing

**P1 (Functionality):**
- "Dashboard generation fails" → ✅ P1
- "Cannot start orchestrator" → ✅ P1

**P2 (Completeness):**
- "Missing exploration phase" → ✅ P2
- "Incomplete validation" → ✅ P2

**P3 (Speed):**
- "Slow pattern aggregation" → ✅ P3
- "Performance optimization needed" → ✅ P3

## Patterns Followed

- **Python Utility Pattern**: argparse, type hints, docstrings, exit codes
- **JSONL Append Pattern**: File locking with fcntl, atomic appends
- **Markdown Parsing Pattern**: Regex extraction with graceful degradation
- **Error Handling Standards**: Specific exceptions, stderr logging, exit codes
- **Path Validation Pattern**: Resolve paths, check existence, validate structure

## Integration Notes

### Exports for Other Builders

**Template location:**
- `/home/ahiya/.claude/templates/reflection-template.md`
- Used by: Builder-3 (testing), future reflection consumers

**Utility location:**
- `/home/ahiya/.claude/lib/2l-reflection-generator.py`
- Callable from: /2l-mvp orchestrator (Builder-3 integration)

**JSONL schema:**
- Format documented in this report
- Used by: Builder-2 (reflection aggregator reads these)
- Schema version: 1.0

### Integration with Builder-2

Builder-2 (Reflection Aggregator) will:
1. Read global-learnings.jsonl (produced by this utility)
2. Parse each learning entry
3. Group similar learnings using similarity matching
4. Update global-learnings.yaml with patterns

**Shared schema coordination:**
- Learning ID format: `{plan_id}-iter-{iteration}-learning-{idx:03d}`
- Required fields: learning_id, project, plan_id, iteration, category, priority, issue, root_cause, suggested_fix
- Optional fields: pattern_id (null initially, assigned by aggregator)

### Integration with Builder-3

Builder-3 (/2l-mvp Integration) will:
1. Call this utility after validation PASS
2. Handle errors gracefully (non-blocking)
3. Emit events (reflection_created/reflection_failed)

**Usage pattern:**
```bash
python3 "$HOME/.claude/lib/2l-reflection-generator.py" \
    --iteration-dir "$iter_dir" \
    --plan-id "$plan_id" \
    --iteration "$global_iter" \
    --output "$reflection_path" \
    --jsonl "$global_learnings_jsonl" 2>/dev/null
```

## Challenges Overcome

### Challenge 1: Validation Report Format Variations

**Problem:** Different iterations use different validation report formats.

**Solution:**
- Multiple regex patterns for each section
- Fallback to defaults if sections missing
- Graceful degradation with warnings

### Challenge 2: Duplicate Issue Detection

**Problem:** Critical issues appear in multiple sections (Issues Summary + Critical Issues subsection).

**Solution:**
- Accepted as limitation for MVP (aggregator will deduplicate by similarity)
- Conservative approach: better to capture duplicate than miss an issue
- Future: Add deduplication logic based on root_cause similarity

### Challenge 3: Framework vs Project Issue Classification

**Problem:** Hard to distinguish 2L framework issues from project-specific issues.

**Solution:**
- Multi-heuristic approach (file paths + keywords)
- Conservative bias (prefer false negatives)
- Documented keywords for future tuning
- Manual review of first 10-20 reflections recommended

## Limitations

1. **Duplicate detection:** May create duplicate entries if same issue appears in multiple sections
2. **Keyword-based detection:** May miss framework issues that don't use standard terminology
3. **No semantic understanding:** Uses simple pattern matching, not NLP
4. **Unix-only file locking:** fcntl.flock() not available on Windows (single writer in MVP mitigates)
5. **Template dependency:** Requires reflection-template.md in expected location

## Testing Notes

**How to test this feature:**

1. **Unit test parsing:**
   ```bash
   python3 2l-reflection-generator.py \
       --iteration-dir .2L/plan-3/iteration-2 \
       --plan-id plan-3 \
       --iteration 2 \
       --dry-run
   ```

2. **Integration test:**
   ```bash
   # Create reflection
   python3 2l-reflection-generator.py \
       --iteration-dir .2L/plan-9/iteration-8 \
       --plan-id plan-9 \
       --iteration 8 \
       --output /tmp/test-reflection.md \
       --jsonl /tmp/test-learnings.jsonl

   # Verify output
   cat /tmp/test-reflection.md
   cat /tmp/test-learnings.jsonl
   ```

3. **Error handling:**
   ```bash
   # Test with missing directory (should exit 2)
   python3 2l-reflection-generator.py \
       --iteration-dir /nonexistent \
       --plan-id test \
       --iteration 1
   echo $?  # Should be 2
   ```

## MCP Testing Performed

**N/A** - This is a standalone Python utility that processes local files. No MCP integration needed.

## Dependencies Used

**Standard Library Only:**
- `sys` - Exit codes, stderr output
- `os` - File operations
- `yaml` (PyYAML) - YAML parsing (already installed in 2L environment)
- `json` - JSONL serialization
- `re` - Regex for markdown parsing
- `fcntl` - File locking for atomic appends
- `argparse` - CLI argument parsing
- `pathlib` - Path manipulation
- `datetime` - ISO8601 timestamps
- `typing` - Type hints

**No external dependencies required.**

## Future Enhancements

**Post-MVP improvements:**

1. **Deduplication logic:** Hash-based duplicate detection before appending to JSONL
2. **NLP-based detection:** Use embeddings for better framework issue classification
3. **Builder report parsing:** Extend to parse builder reports (not just validation)
4. **Confidence scoring:** Add confidence field to each learning (0.0-1.0)
5. **Interactive mode:** CLI prompts for manual issue classification
6. **Batch processing:** Process multiple iterations in one run
7. **Metrics dashboard:** Visualize framework issue trends over time

## Code Quality Metrics

- **Total lines:** 575 (utility) + 45 (template) = 620 lines
- **Functions:** 12 public functions, all with docstrings
- **Type hints:** 100% coverage for function signatures
- **Error handling:** Try/except blocks with specific exceptions
- **Exit codes:** 0 (success), 1 (error), 2 (safety abort)
- **Logging:** Warnings to stderr, success messages to stdout

## Deployment Readiness

**Ready for integration:** ✅

**Next steps:**
1. Builder-3 integrates into /2l-mvp (lines 1199, 1435)
2. Test with real iteration completion
3. Verify JSONL schema matches Builder-2 expectations
4. Monitor first 5-10 reflections for quality
5. Tune keywords/paths if needed based on real data

**No blockers identified.**
