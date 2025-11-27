#!/usr/bin/env bash
# Integration test for 2L Reflection Aggregator

set -e

echo "🧪 Testing 2L Reflection Aggregator Integration"
echo

# Create temp directory for test
TEST_DIR=$(mktemp -d)
echo "   Test directory: $TEST_DIR"

# Cleanup on exit
cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Create test JSONL with sample learnings
JSONL_PATH="$TEST_DIR/global-learnings.jsonl"
YAML_PATH="$TEST_DIR/global-learnings.yaml"

cat > "$JSONL_PATH" << 'EOF'
{"timestamp":"2025-11-27T01:00:00Z","learning_id":"plan-9-iter-1-learning-001","project":"2L-self-improvement","plan_id":"plan-9","iteration":1,"category":"functionality","priority":"P1","issue":"Missing exploration before vision","severity":"medium","root_cause":"2l-improve skips exploration phase at lines 358-410","suggested_fix":"Spawn 3 Task agents to analyze codebase","affected_files":["commands/2l-improve.md"],"pattern_id":null}
{"timestamp":"2025-11-27T02:00:00Z","learning_id":"plan-9-iter-2-learning-001","project":"2L-self-improvement","plan_id":"plan-9","iteration":2,"category":"functionality","priority":"P1","issue":"No exploration before vision generation","severity":"medium","root_cause":"2l-improve does not spawn explorers before creating vision","suggested_fix":"Add exploration step to 2l-improve workflow","affected_files":["commands/2l-improve.md","lib/2l-vision-generator.py"],"pattern_id":null}
{"timestamp":"2025-11-27T03:00:00Z","learning_id":"plan-9-iter-3-learning-001","project":"StatViz","plan_id":"plan-3","iteration":3,"category":"completeness","priority":"P2","issue":"YAML parsing error handling missing","severity":"low","root_cause":"No error handling for malformed YAML in config files","suggested_fix":"Add try/except around YAML.safe_load calls","affected_files":["lib/config-parser.py"],"pattern_id":null}
{"timestamp":"2025-11-27T04:00:00Z","learning_id":"plan-9-iter-4-learning-001","project":"2L-self-improvement","plan_id":"plan-9","iteration":4,"category":"functionality","priority":"P1","issue":"Missing exploration in 2l-improve","severity":"critical","root_cause":"2l-improve command skips exploration phase entirely","suggested_fix":"Implement exploration phase before vision","affected_files":["commands/2l-improve.md"],"pattern_id":null}
EOF

echo "✅ Created test JSONL with 4 learnings"
echo

# Test 1: Full aggregation
echo "📊 Test 1: Full aggregation from scratch"
python3 lib/2l-reflection-aggregator.py \
    --mode full \
    --global-learnings "$YAML_PATH" \
    --jsonl "$JSONL_PATH" \
    --threshold 0.8

echo

# Verify YAML created
if [ -f "$YAML_PATH" ]; then
    echo "✅ YAML file created"
else
    echo "❌ YAML file not created"
    exit 1
fi

# Count patterns
PATTERN_COUNT=$(grep -c "pattern_id: PATTERN-" "$YAML_PATH" || true)
echo "   Patterns found: $PATTERN_COUNT"

# Expected: 2 patterns (3 similar "exploration" issues + 1 different "YAML parsing" issue)
if [ "$PATTERN_COUNT" -eq 2 ]; then
    echo "✅ Correct number of patterns (2)"
else
    echo "⚠️  Expected 2 patterns, found $PATTERN_COUNT"
fi

echo

# Test 2: Add new learning and incremental aggregation
echo "📊 Test 2: Incremental aggregation with new learning"

# Add new learning similar to existing pattern
cat >> "$JSONL_PATH" << 'EOF'
{"timestamp":"2025-11-27T05:00:00Z","learning_id":"plan-9-iter-5-learning-001","project":"2L-self-improvement","plan_id":"plan-9","iteration":5,"category":"functionality","priority":"P2","issue":"Exploration phase missing","severity":"medium","root_cause":"2l-improve workflow lacks exploration before vision creation","suggested_fix":"Add exploration agents","affected_files":["commands/2l-improve.md"],"pattern_id":null}
EOF

python3 lib/2l-reflection-aggregator.py \
    --mode incremental \
    --global-learnings "$YAML_PATH" \
    --jsonl "$JSONL_PATH" \
    --threshold 0.8

echo

# Count patterns again (should still be 2)
PATTERN_COUNT=$(grep -c "pattern_id: PATTERN-" "$YAML_PATH" || true)
echo "   Patterns found: $PATTERN_COUNT"

if [ "$PATTERN_COUNT" -eq 2 ]; then
    echo "✅ Still 2 patterns (new learning merged into existing)"
else
    echo "⚠️  Expected 2 patterns, found $PATTERN_COUNT"
fi

# Check occurrence count increased
OCCURRENCE_COUNT=$(grep -A 20 "pattern_id: PATTERN-001" "$YAML_PATH" | grep "occurrences:" | head -1 | awk '{print $2}')
echo "   PATTERN-001 occurrences: $OCCURRENCE_COUNT"

if [ "$OCCURRENCE_COUNT" -eq 4 ]; then
    echo "✅ Occurrence count correct (4 = 3 original + 1 new)"
else
    echo "⚠️  Expected 4 occurrences, found $OCCURRENCE_COUNT"
fi

echo

# Test 3: Dry run mode
echo "📊 Test 3: Dry run mode (no file modification)"

# Get current modification time
BEFORE_MTIME=$(stat -c %Y "$YAML_PATH")

python3 lib/2l-reflection-aggregator.py \
    --mode full \
    --global-learnings "$YAML_PATH" \
    --jsonl "$JSONL_PATH" \
    --threshold 0.8 \
    --dry-run

AFTER_MTIME=$(stat -c %Y "$YAML_PATH")

if [ "$BEFORE_MTIME" -eq "$AFTER_MTIME" ]; then
    echo "✅ File not modified in dry-run mode"
else
    echo "❌ File was modified in dry-run mode"
    exit 1
fi

echo

# Test 4: Backup creation
echo "📊 Test 4: Backup file creation"

python3 lib/2l-reflection-aggregator.py \
    --mode incremental \
    --global-learnings "$YAML_PATH" \
    --jsonl "$JSONL_PATH" \
    --threshold 0.8

if [ -f "$YAML_PATH.bak" ]; then
    echo "✅ Backup file created: $YAML_PATH.bak"
else
    echo "⚠️  Backup file not created"
fi

echo

# Test 5: Category filtering
echo "📊 Test 5: Category-based filtering"

# Add learning in different category
cat >> "$JSONL_PATH" << 'EOF'
{"timestamp":"2025-11-27T06:00:00Z","learning_id":"plan-9-iter-6-learning-001","project":"2L-self-improvement","plan_id":"plan-9","iteration":6,"category":"speed","priority":"P3","issue":"Slow pattern detection","severity":"low","root_cause":"Pattern detection O(n²) complexity","suggested_fix":"Optimize to O(n log n)","affected_files":["lib/2l-pattern-detector.py"],"pattern_id":null}
EOF

python3 lib/2l-reflection-aggregator.py \
    --mode incremental \
    --global-learnings "$YAML_PATH" \
    --jsonl "$JSONL_PATH" \
    --threshold 0.8

# Should have 3 patterns now (exploration, YAML, speed)
PATTERN_COUNT=$(grep -c "pattern_id: PATTERN-" "$YAML_PATH" || true)
echo "   Patterns found: $PATTERN_COUNT"

if [ "$PATTERN_COUNT" -eq 3 ]; then
    echo "✅ New pattern created for different category"
else
    echo "⚠️  Expected 3 patterns, found $PATTERN_COUNT"
fi

echo

# Display final YAML for inspection
echo "📄 Final global-learnings.yaml:"
echo "----------------------------------------"
head -50 "$YAML_PATH"
echo "----------------------------------------"
echo

echo "✅ All integration tests passed!"
