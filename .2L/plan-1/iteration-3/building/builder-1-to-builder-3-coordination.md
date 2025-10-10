# Builder-1 to Builder-3 Coordination

## Config.yaml Schema (MUST MATCH EXACTLY)

Builder-3 is implementing resume detection and master plan synthesis updates that read from config.yaml.

The config schema **MUST** match these exact field names and structure:

### Schema Structure

```yaml
plans:
  - plan_id: plan-1
    status: IN_PROGRESS

    master_exploration:
      num_explorers: 3              # NEW: 2-4 based on complexity (Builder-1 writes this)
      complexity_level: "MEDIUM"    # NEW: SIMPLE | MEDIUM | COMPLEX (Builder-1 writes this)
      status: COMPLETE
      reports:
        - master-explorer-1-report.md
        - master-explorer-2-report.md
        - master-explorer-3-report.md
```

### Field Names (Critical)

- `num_explorers` (NOT explorer_count, NOT total_explorers, NOT count)
- `complexity_level` (NOT complexity, NOT level, NOT complexity_type)

These are written by Builder-1's adaptive spawning logic:

```bash
yq eval ".plans[] | select(.plan_id == \"${plan_id}\") | .master_exploration.num_explorers = $num_explorers" -i .2L/config.yaml
yq eval ".plans[] | select(.plan_id == \"${plan_id}\") | .master_exploration.complexity_level = \"$complexity\"" -i .2L/config.yaml
```

## Resume Detection Pattern (Builder-3's Responsibility)

Builder-3 must read `num_explorers` from config with backward compatibility:

```bash
# Read expected number of explorers from config (default to 2 for old configs)
EXPECTED=$(yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.num_explorers // 2" .2L/config.yaml)

# Count actual explorer reports
ACTUAL=$(ls .2L/plan-${PLAN_ID}/master-exploration/master-explorer-*-report.md 2>/dev/null | wc -l)

# Spawn missing explorers
if [ "$ACTUAL" -lt "$EXPECTED" ]; then
    echo "Master exploration incomplete: $ACTUAL/$EXPECTED explorers complete"

    for explorer_id in $(seq $((ACTUAL + 1)) $EXPECTED); do
        # Determine focus area (SAME CASE STATEMENT AS BUILDER-1)
        case $explorer_id in
            1) FOCUS_AREA="Architecture & Complexity Analysis" ;;
            2) FOCUS_AREA="Dependencies & Risk Assessment" ;;
            3) FOCUS_AREA="User Experience & Integration Points" ;;
            4) FOCUS_AREA="Scalability & Performance Considerations" ;;
        esac

        echo "  Resuming Explorer $explorer_id: $FOCUS_AREA"

        # Spawn explorer
        # ... (spawn logic)
    done
fi
```

### Critical: Default Value Operator

**MUST USE:** `// 2` (default to 2 explorers if field missing)

This provides backward compatibility with old config.yaml files created before iteration 3.

## Focus Area Names (MUST MATCH BUILDER-1)

Builder-3's resume detection uses the **SAME** case statement as Builder-1's spawning logic:

```bash
case $explorer_id in
    1) FOCUS_AREA="Architecture & Complexity Analysis" ;;
    2) FOCUS_AREA="Dependencies & Risk Assessment" ;;
    3) FOCUS_AREA="User Experience & Integration Points" ;;
    4) FOCUS_AREA="Scalability & Performance Considerations" ;;
esac
```

**DO NOT** modify these strings. Copy them exactly from Builder-1's implementation.

## Master Plan Synthesis Pattern (Builder-3's Responsibility)

Builder-3 must update master plan synthesis to read all reports dynamically.

Builder-1 already implemented this in 2l-mvp.md (lines 376-397). Builder-3 needs to implement the same in 2l-continue.md:

```bash
# Read all explorer reports dynamically (2-4 reports)
EXPLORER_REPORTS=""
REPORT_COUNT=0

for report in .2L/plan-${PLAN_ID}/master-exploration/master-explorer-*-report.md; do
    if [ -f "$report" ]; then
        REPORT_COUNT=$((REPORT_COUNT + 1))
        REPORT_NAME=$(basename "$report")
        EXPLORER_ID=$(echo "$REPORT_NAME" | sed 's/master-explorer-\([0-9]\)-report.md/\1/')

        EXPLORER_REPORTS="$EXPLORER_REPORTS

========================================
EXPLORER $EXPLORER_ID REPORT: $REPORT_NAME
========================================

$(cat "$report")
"
    fi
done

echo "Found $REPORT_COUNT explorer reports to synthesize"
```

## Variable Naming Conventions (Shared)

**Use these exact variable names for consistency:**

- `num_explorers` - Number of explorers to spawn (2-4)
- `complexity` - Complexity level (SIMPLE | MEDIUM | COMPLEX)
- `EXPECTED` - Expected number of explorers from config
- `ACTUAL` - Actual number of explorer reports found
- `explorer_id` - Loop variable for explorer ID (1-4)
- `FOCUS_AREA` - Focus area string from case statement
- `EXPLORER_REPORTS` - Concatenated reports for synthesis
- `REPORT_COUNT` - Count of reports found

## Backward Compatibility Requirements

Builder-3's implementation **MUST** handle these scenarios:

### Scenario 1: Old Config (No num_explorers Field)
```yaml
plans:
  - plan_id: plan-old
    master_exploration:
      status: COMPLETE
      # num_explorers field missing
```

**Expected behavior:** Default to 2 explorers

```bash
EXPECTED=$(yq eval ".plans[] | select(.plan_id == \"plan-old\") | .master_exploration.num_explorers // 2" .2L/config.yaml)
# EXPECTED = 2
```

### Scenario 2: New Config (Has num_explorers Field)
```yaml
plans:
  - plan_id: plan-new
    master_exploration:
      num_explorers: 3
      complexity_level: "MEDIUM"
```

**Expected behavior:** Use value from config

```bash
EXPECTED=$(yq eval ".plans[] | select(.plan_id == \"plan-new\") | .master_exploration.num_explorers // 2" .2L/config.yaml)
# EXPECTED = 3
```

### Scenario 3: Partial Completion
```yaml
plans:
  - plan_id: plan-partial
    master_exploration:
      num_explorers: 4
      status: IN_PROGRESS
```

Reports on disk:
- master-explorer-1-report.md ✓
- master-explorer-2-report.md ✓
- master-explorer-3-report.md (missing)
- master-explorer-4-report.md (missing)

**Expected behavior:** Spawn explorers 3 and 4 only

```bash
ACTUAL=2
EXPECTED=4
for explorer_id in $(seq 3 4); do
    # Spawn explorer 3, then explorer 4
done
```

## Testing Coordination

Builder-3 should test with Builder-1's test visions:

```bash
# Use Builder-1's test visions
/tmp/2l-test-adaptive-spawning/test-simple-vision.md    # num_explorers=2
/tmp/2l-test-adaptive-spawning/test-medium-vision.md    # num_explorers=3
/tmp/2l-test-adaptive-spawning/test-complex-vision.md   # num_explorers=4
```

## Integration Points

### Builder-1 → Builder-3 (Writes Config)
```bash
# Builder-1 writes these fields during master exploration
yq eval ".plans[] | select(.plan_id == \"${plan_id}\") | .master_exploration.num_explorers = $num_explorers" -i .2L/config.yaml
yq eval ".plans[] | select(.plan_id == \"${plan_id}\") | .master_exploration.complexity_level = \"$complexity\"" -i .2L/config.yaml
```

### Builder-3 Reads Config (With Default)
```bash
# Builder-3 reads these fields during resume detection
EXPECTED=$(yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.num_explorers // 2" .2L/config.yaml)
complexity=$(yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.complexity_level // \"UNKNOWN\"" .2L/config.yaml)
```

## Files Modified by Each Builder

**Builder-1 (Already Complete):**
- `~/.claude/commands/2l-mvp.md` - Adaptive spawning + synthesis
- `~/.claude/commands/2l-plan.md` - Adaptive spawning + synthesis

**Builder-3 (To Implement):**
- `~/.claude/commands/2l-continue.md` - Resume detection with config-driven num_explorers
- `~/.claude/commands/2l-mvp.md` (optional) - Master plan synthesis (already done by Builder-1?)

**Clarification Needed:** Check if Builder-1 already implemented synthesis in 2l-mvp.md. If yes, Builder-3 only needs to update 2l-continue.md.

## Verification Checklist

After Builder-3 completes:

- [ ] Resume detection reads num_explorers from config
- [ ] Default value `// 2` used for backward compatibility
- [ ] Missing explorers spawned correctly (ACTUAL+1 to EXPECTED)
- [ ] Focus area case statement matches Builder-1 exactly
- [ ] Master plan synthesis reads all reports (2-4)
- [ ] Test with old config (no num_explorers field) - defaults to 2
- [ ] Test with new config (num_explorers=3) - uses 3
- [ ] Test with partial completion (2/4 done) - spawns 3 and 4

## Questions for Builder-3

If unclear about:
- Config read pattern (yq syntax)
- Default value operator (`// 2`)
- Resume spawning logic
- Integration with Builder-1's changes

Reference patterns.md or coordinate directly.

## Critical Success Factor

Builder-1 has already written `num_explorers` and `complexity_level` to config.yaml during adaptive spawning. Builder-3's job is to **read** these values correctly with backward compatibility.

**DO NOT** write new config fields. Only read existing fields with safe defaults.
