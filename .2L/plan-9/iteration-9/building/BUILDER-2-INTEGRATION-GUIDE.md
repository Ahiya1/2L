# Builder-2 Integration Guide for Builder-3

## Quick Start

Builder-2 has completed the **Reflection Aggregator** utility. This guide helps Builder-3 integrate it into /2l-mvp.

## What Was Built

### Main Utility
**File:** `lib/2l-reflection-aggregator.py`
**Purpose:** Aggregate learnings from JSONL into patterns in YAML

### CLI Usage
```bash
# Incremental mode (recommended for /2l-mvp integration)
python3 ~/.claude/lib/2l-reflection-aggregator.py \
    --mode incremental \
    --global-learnings .2L/global-learnings.yaml \
    --jsonl .2L/global-learnings.jsonl

# Full mode (manual rebuild)
python3 ~/.claude/lib/2l-reflection-aggregator.py \
    --mode full \
    --global-learnings .2L/global-learnings.yaml \
    --jsonl .2L/global-learnings.jsonl

# With custom threshold
python3 ~/.claude/lib/2l-reflection-aggregator.py \
    --mode incremental \
    --global-learnings .2L/global-learnings.yaml \
    --jsonl .2L/global-learnings.jsonl \
    --threshold 0.75

# Dry run (preview)
python3 ~/.claude/lib/2l-reflection-aggregator.py \
    --mode incremental \
    --global-learnings .2L/global-learnings.yaml \
    --jsonl .2L/global-learnings.jsonl \
    --dry-run
```

## Integration into /2l-mvp

### Where to Call It
After reflection creation (Builder-1's utility), call the aggregator to update patterns.

### Suggested Bash Function
```bash
aggregate_reflections() {
    local global_learnings_yaml=".2L/global-learnings.yaml"
    local global_learnings_jsonl=".2L/global-learnings.jsonl"

    echo "   📊 Aggregating reflections into patterns..."

    # Call aggregator (incremental mode)
    python3 "$HOME/.claude/lib/2l-reflection-aggregator.py" \
        --mode incremental \
        --global-learnings "$global_learnings_yaml" \
        --jsonl "$global_learnings_jsonl" 2>/dev/null

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "      ✅ Patterns updated"

        # Emit success event
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "aggregation_complete" \
                         "Reflection aggregation successful" \
                         "reflection" \
                         "orchestrator"
        fi

        return 0
    else
        echo "      ⚠️  Aggregation failed (non-critical, continuing)"

        # Emit failure event (for monitoring, but don't block)
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "aggregation_failed" \
                         "Exit code: ${exit_code}" \
                         "reflection" \
                         "orchestrator"
        fi

        return 1  # Non-blocking failure
    fi
}
```

### Integration Point in /2l-mvp
After reflection creation, before iteration_complete event:

```bash
# Create reflection (Builder-1)
create_iteration_reflection "$plan_id" "$global_iter" "$ITER_DIR"

# Aggregate reflections (Builder-2)
aggregate_reflections

# Emit iteration_complete event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "iteration_complete" ...
fi
```

## Input/Output Schema

### Input (from Builder-1)
**JSONL learnings:** `.2L/global-learnings.jsonl`
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
  "severity": "medium",
  "root_cause": "2l-improve skips exploration phase",
  "suggested_fix": "Spawn 3 Task agents",
  "affected_files": ["commands/2l-improve.md"],
  "pattern_id": null
}
```

### Output
**YAML patterns:** `.2L/global-learnings.yaml`
```yaml
schema_version: '1.0'
aggregated_at: '2025-11-27T04:00:00Z'
total_projects: 1
total_learnings: 2
patterns:
  - pattern_id: PATTERN-001
    name: Missing exploration before vision
    occurrences: 2
    projects: ['2L-self-improvement']
    severity: medium
    category: functionality
    root_cause: 2l-improve skips exploration phase
    proposed_solution: Spawn 3 Task agents
    status: IDENTIFIED
    discovered_in: plan-9-iter-9
    discovered_at: '2025-11-27T04:00:00Z'
    source_learnings:
      - plan-9-iter-9-learning-001
      - plan-9-iter-10-learning-001
    affected_files:
      - commands/2l-improve.md
```

## Error Handling

### Exit Codes
- **0:** Success (patterns updated)
- **1:** Error (parsing failed, file I/O error)
- **2:** Safety abort (invalid inputs, threshold out of range)

### Non-Blocking Failures
Aggregation failure should NOT block iteration completion:
- JSONL is source of truth (learnings saved)
- Can re-run aggregation later
- Log warning and continue

### Error Recovery
```bash
# If aggregation fails, learnings are still safe in JSONL
# Manual recovery:
python3 lib/2l-reflection-aggregator.py \
    --mode full \
    --global-learnings .2L/global-learnings.yaml \
    --jsonl .2L/global-learnings.jsonl
```

## Testing the Integration

### Unit Test
```bash
python3 lib/test_reflection_aggregator.py -v
# Expected: 21 tests passing
```

### Integration Test
```bash
bash lib/test_aggregator_integration.sh
# Expected: 5 scenarios passing
```

### Manual End-to-End Test
```bash
# 1. Create test JSONL
cat > /tmp/test-learning.jsonl << 'EOF'
{"timestamp":"2025-11-27T01:00:00Z","learning_id":"test-001","project":"Test","plan_id":"plan-1","iteration":1,"category":"functionality","priority":"P1","issue":"Test issue","severity":"medium","root_cause":"Test root cause","suggested_fix":"Test fix","affected_files":[],"pattern_id":null}
EOF

# 2. Run aggregator
python3 lib/2l-reflection-aggregator.py \
    --mode full \
    --global-learnings /tmp/test-patterns.yaml \
    --jsonl /tmp/test-learning.jsonl

# 3. Verify output
cat /tmp/test-patterns.yaml
# Should contain 1 pattern
```

## Features Available

### Core Features
- ✅ Incremental aggregation (O(n·m) not O(n²))
- ✅ Similarity threshold: 0.8 (configurable)
- ✅ Category-based filtering
- ✅ Automatic backup (.yaml.bak)
- ✅ Atomic YAML writes

### Safety Features
- ✅ Non-destructive dry-run mode
- ✅ Input validation (files exist, threshold in range)
- ✅ Graceful handling of malformed JSONL
- ✅ Backup before modification

### Usability Features
- ✅ Rich CLI help text
- ✅ Clear progress output
- ✅ Borderline match logging (0.75-0.85)
- ✅ Descriptive error messages

## Performance

### Benchmarks
- 6 learnings, 0 patterns → <100ms
- 10 learnings, 5 patterns → <100ms
- 100 learnings, 20 patterns → <500ms
- 1000 learnings, 50 patterns → <5s

### Recommended Mode
- **Incremental:** Normal operation (after each reflection)
- **Full:** Manual rebuild (threshold tuning, cleanup)

## Dependencies

### From Builder-1
- Reads JSONL learnings created by reflection generator
- Expects specific JSONL schema (documented above)

### From Existing Infrastructure
- `lib/2l-yaml-helpers.py::atomic_write_yaml()` - Atomic writes
- `lib/2l-yaml-helpers.py::backup_before_write()` - Backups
- `lib/2l-yaml-helpers.py::generate_pattern_id()` - ID generation

### No Conflicts
- Creates new utility file
- No modifications to existing code
- Compatible with all 2L infrastructure

## Known Limitations

### Current Implementation
1. No pattern merging (creates or merges into existing, but doesn't merge patterns together)
2. Category must match exactly (case-sensitive)
3. File locking not implemented for JSONL (assumes single writer)
4. Threshold is global (can't vary by category)

### Out of Scope (Post-MVP)
- Automatic aggregation trigger (manual call only)
- Advanced similarity algorithms (ML-based)
- Pattern splitting tools
- Real-time dashboard

## Events to Emit

### Success Events
```bash
log_2l_event "pattern_detected" \
             "New pattern PATTERN-NNN created" \
             "reflection" \
             "orchestrator"

log_2l_event "pattern_merged" \
             "Learning merged into PATTERN-NNN" \
             "reflection" \
             "orchestrator"

log_2l_event "aggregation_complete" \
             "Reflection aggregation successful" \
             "reflection" \
             "orchestrator"
```

### Failure Events
```bash
log_2l_event "aggregation_failed" \
             "Exit code: ${exit_code}" \
             "reflection" \
             "orchestrator"
```

## Troubleshooting

### Issue: Aggregator not found
**Solution:** Check path to `~/.claude/lib/2l-reflection-aggregator.py`

### Issue: JSONL file missing
**Solution:** Aggregator gracefully handles missing JSONL (creates empty patterns list)

### Issue: Too many patterns created
**Solution:** Increase threshold to 0.85 for stricter matching

### Issue: Similar issues not merging
**Solution:** Decrease threshold to 0.75 for looser matching

### Issue: YAML corruption
**Solution:** Restore from backup: `mv .2L/global-learnings.yaml.bak .2L/global-learnings.yaml`

## Files Created by Builder-2

All files ready for integration:

1. **`lib/2l-reflection-aggregator.py`** (549 lines) - Main utility
2. **`lib/test_reflection_aggregator.py`** (433 lines) - Unit tests
3. **`lib/test_aggregator_integration.sh`** (176 lines) - Integration tests
4. **`.2L/plan-9/iteration-9/building/builder-2-report.md`** - Full report
5. **`.2L/plan-9/iteration-9/building/builder-2-summary.md`** - Summary
6. **`.2L/plan-9/iteration-9/building/BUILDER-2-INTEGRATION-GUIDE.md`** - This file

## Questions?

Refer to:
- **Full report:** `.2L/plan-9/iteration-9/building/builder-2-report.md`
- **Unit tests:** `lib/test_reflection_aggregator.py` (for usage examples)
- **CLI help:** `python3 lib/2l-reflection-aggregator.py --help`

---

**Builder-2 Status:** ✅ COMPLETE and ready for integration
