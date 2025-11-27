#!/usr/bin/env bash
# Test suite for Pattern Lifecycle Recurrence Detection
#
# Tests check_recurrence() method, similarity algorithm, verification window,
# and CLI exit codes for the pattern lifecycle manager.

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Pattern Lifecycle Recurrence Tests${NC}"
echo -e "${BLUE}======================================${NC}"
echo

# Setup: Create temporary test environment
ORIGINAL_DIR="$PWD"
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo -e "${YELLOW}Test Setup:${NC} Using temp directory $TEST_DIR"
echo

mkdir -p .2L/plan-9/iteration-8
mkdir -p .2L/plan-9/iteration-9
mkdir -p .2L/plan-9/iteration-10
mkdir -p .2L/plan-9/iteration-11
mkdir -p .2L/plan-9/iteration-12

PASSED=0
FAILED=0

# Helper function for test assertions
assert_exit_code() {
    local expected=$1
    local actual=$2
    local test_name=$3

    if [ "$expected" -eq "$actual" ]; then
        echo -e "${GREEN}✅ PASS:${NC} $test_name"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL:${NC} $test_name"
        echo -e "   Expected exit code: $expected, got: $actual"
        ((FAILED++))
        return 1
    fi
}

# ===================================================================
# Test 1: Recurrence detection with exact match
# ===================================================================
echo -e "${BLUE}Test 1: Recurrence detection with exact match${NC}"

# Create test global-learnings.yaml
cat > .2L/global-learnings.yaml << 'EOF'
patterns:
  - pattern_id: TEST-PATTERN-001
    name: "Test pattern for recurrence"
    status: IMPLEMENTED
    category: functionality
    root_cause: "Missing error handling"
    implemented_in_iteration: 8
    verification_start_iteration: 9
    discovered_at: '2025-11-27T01:00:00Z'
    implemented_at: '2025-11-27T02:00:00Z'
EOF

# Create iteration 9 learnings with MATCHING root_cause
cat > .2L/plan-9/iteration-9/learnings.yaml << 'EOF'
learnings:
  - learning_id: plan-9-iter-9-learning-001
    root_cause: "Missing error handling"
    category: functionality
    iteration: 9
    plan_id: plan-9
EOF

# Run check-recurrence
exit_code=0
result=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-PATTERN-001 \
    --current-iteration 9 \
    --global-learnings .2L/global-learnings.yaml 2>&1) || exit_code=$?

# Assert: exit code 2 (REGRESSED)
assert_exit_code 2 $exit_code "Exact match triggers REGRESSED"

# Assert: pattern status updated to REGRESSED
status=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" get-status \
    --pattern-id TEST-PATTERN-001 \
    --global-learnings .2L/global-learnings.yaml 2>&1)

if echo "$status" | grep -q "Status: REGRESSED"; then
    echo -e "${GREEN}✅ PASS:${NC} Pattern status updated to REGRESSED"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL:${NC} Pattern status not updated to REGRESSED"
    echo "$status"
    ((FAILED++))
fi

echo

# ===================================================================
# Test 2: Recurrence detection with fuzzy match
# ===================================================================
echo -e "${BLUE}Test 2: Recurrence detection with fuzzy match (>0.8 similarity)${NC}"

# Reset pattern to IMPLEMENTED
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" update \
    --pattern-id TEST-PATTERN-001 \
    --status IMPLEMENTED \
    --iteration 8 \
    --global-learnings .2L/global-learnings.yaml > /dev/null 2>&1

# Update verification_start_iteration manually (since we're resetting)
python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
for p in data['patterns']:
    if p['pattern_id'] == 'TEST-PATTERN-001':
        p['verification_start_iteration'] = 9
with open('.2L/global-learnings.yaml', 'w') as f:
    yaml.dump(data, f, default_flow_style=False, sort_keys=False)
"

# Create iteration 10 learnings with SIMILAR root_cause (fuzzy match)
cat > .2L/plan-9/iteration-10/learnings.yaml << 'EOF'
learnings:
  - learning_id: plan-9-iter-10-learning-001
    root_cause: "Error handling is missing"
    category: functionality
    iteration: 10
    plan_id: plan-9
EOF

# Run check-recurrence
exit_code=0
result=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-PATTERN-001 \
    --current-iteration 10 \
    --global-learnings .2L/global-learnings.yaml 2>&1) || exit_code=$?

# Assert: exit code 2 (REGRESSED) - fuzzy match should trigger
assert_exit_code 2 $exit_code "Fuzzy match (>0.8 similarity) triggers REGRESSED"

echo

# ===================================================================
# Test 3: Category mismatch prevents false positive
# ===================================================================
echo -e "${BLUE}Test 3: Category mismatch prevents false positive${NC}"

# Reset pattern to IMPLEMENTED
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" update \
    --pattern-id TEST-PATTERN-001 \
    --status IMPLEMENTED \
    --iteration 8 \
    --global-learnings .2L/global-learnings.yaml > /dev/null 2>&1

# Update verification_start_iteration
python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
for p in data['patterns']:
    if p['pattern_id'] == 'TEST-PATTERN-001':
        p['verification_start_iteration'] = 9
with open('.2L/global-learnings.yaml', 'w') as f:
    yaml.dump(data, f, default_flow_style=False, sort_keys=False)
"

# Create iteration 9 learnings with SIMILAR root_cause but DIFFERENT category
cat > .2L/plan-9/iteration-9/learnings.yaml << 'EOF'
learnings:
  - learning_id: plan-9-iter-9-learning-002
    root_cause: "Missing error handling in validation"
    category: speed
    iteration: 9
    plan_id: plan-9
EOF

# Run check-recurrence
exit_code=0
result=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-PATTERN-001 \
    --current-iteration 9 \
    --global-learnings .2L/global-learnings.yaml 2>&1) || exit_code=$?

# Assert: exit code 0 (monitoring) - category mismatch prevents regression
assert_exit_code 0 $exit_code "Category mismatch prevents false positive"

echo

# ===================================================================
# Test 4: Verification after 3 clean iterations
# ===================================================================
echo -e "${BLUE}Test 4: Verification after 3 clean iterations${NC}"

# Reset pattern to IMPLEMENTED
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" update \
    --pattern-id TEST-PATTERN-001 \
    --status IMPLEMENTED \
    --iteration 8 \
    --global-learnings .2L/global-learnings.yaml > /dev/null 2>&1

# Update verification_start_iteration to 9
python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
for p in data['patterns']:
    if p['pattern_id'] == 'TEST-PATTERN-001':
        p['verification_start_iteration'] = 9
with open('.2L/global-learnings.yaml', 'w') as f:
    yaml.dump(data, f, default_flow_style=False, sort_keys=False)
"

# Create iterations 9, 10, 11 learnings with DIFFERENT issues (no recurrence)
cat > .2L/plan-9/iteration-9/learnings.yaml << 'EOF'
learnings:
  - learning_id: plan-9-iter-9-learning-001
    root_cause: "Performance issue in sorting algorithm"
    category: speed
    iteration: 9
    plan_id: plan-9
EOF

cat > .2L/plan-9/iteration-10/learnings.yaml << 'EOF'
learnings:
  - learning_id: plan-9-iter-10-learning-001
    root_cause: "UI alignment off by 2 pixels"
    category: completeness
    iteration: 10
    plan_id: plan-9
EOF

cat > .2L/plan-9/iteration-11/learnings.yaml << 'EOF'
learnings:
  - learning_id: plan-9-iter-11-learning-001
    root_cause: "Documentation has typo in example"
    category: completeness
    iteration: 11
    plan_id: plan-9
EOF

# Check at iteration 11 (2 of 3 complete)
exit_code=0
result=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-PATTERN-001 \
    --current-iteration 11 \
    --global-learnings .2L/global-learnings.yaml 2>&1) || exit_code=$?

# Assert: exit code 1 (VERIFIED) at iteration 11 (3 iterations monitored: 9, 10, 11)
assert_exit_code 1 $exit_code "Pattern VERIFIED after 3 clean iterations"

# Assert: pattern status updated to VERIFIED
status=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" get-status \
    --pattern-id TEST-PATTERN-001 \
    --global-learnings .2L/global-learnings.yaml 2>&1)

if echo "$status" | grep -q "Status: VERIFIED"; then
    echo -e "${GREEN}✅ PASS:${NC} Pattern status updated to VERIFIED"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL:${NC} Pattern status not updated to VERIFIED"
    echo "$status"
    ((FAILED++))
fi

echo

# ===================================================================
# Test 5: Still monitoring (iteration 2 of 3)
# ===================================================================
echo -e "${BLUE}Test 5: Still monitoring (iteration 2 of 3)${NC}"

# Reset pattern to IMPLEMENTED
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" update \
    --pattern-id TEST-PATTERN-001 \
    --status IMPLEMENTED \
    --iteration 8 \
    --global-learnings .2L/global-learnings.yaml > /dev/null 2>&1

# Update verification_start_iteration to 9
python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
for p in data['patterns']:
    if p['pattern_id'] == 'TEST-PATTERN-001':
        p['verification_start_iteration'] = 9
with open('.2L/global-learnings.yaml', 'w') as f:
    yaml.dump(data, f, default_flow_style=False, sort_keys=False)
"

# Check at iteration 10 (2 of 3)
exit_code=0
result=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-PATTERN-001 \
    --current-iteration 10 \
    --global-learnings .2L/global-learnings.yaml 2>&1) || exit_code=$?

# Assert: exit code 0 (monitoring)
assert_exit_code 0 $exit_code "Still monitoring at iteration 2 of 3"

# Verify message contains "Monitoring iteration 2 of 3"
if echo "$result" | grep -q "Monitoring iteration 2 of 3"; then
    echo -e "${GREEN}✅ PASS:${NC} Correct monitoring message"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL:${NC} Incorrect monitoring message"
    echo "Got: $result"
    ((FAILED++))
fi

echo

# ===================================================================
# Test 6: Missing learnings file (graceful failure)
# ===================================================================
echo -e "${BLUE}Test 6: Missing learnings file (graceful failure)${NC}"

# Reset pattern to IMPLEMENTED
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" update \
    --pattern-id TEST-PATTERN-001 \
    --status IMPLEMENTED \
    --iteration 8 \
    --global-learnings .2L/global-learnings.yaml > /dev/null 2>&1

# Update verification_start_iteration
python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
for p in data['patterns']:
    if p['pattern_id'] == 'TEST-PATTERN-001':
        p['verification_start_iteration'] = 9
with open('.2L/global-learnings.yaml', 'w') as f:
    yaml.dump(data, f, default_flow_style=False, sort_keys=False)
"

# Remove learnings file for iteration 12
rm -f .2L/plan-9/iteration-12/learnings.yaml 2>/dev/null || true

# Run check-recurrence at iteration 12 (learnings file missing)
exit_code=0
result=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-PATTERN-001 \
    --current-iteration 12 \
    --global-learnings .2L/global-learnings.yaml 2>&1) || exit_code=$?

# Assert: exit code 0 (monitoring) - graceful failure
assert_exit_code 0 $exit_code "Missing learnings file handled gracefully"

# Verify message mentions learnings not found
if echo "$result" | grep -q "not found"; then
    echo -e "${GREEN}✅ PASS:${NC} Correct error message for missing learnings"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL:${NC} Missing learnings message not found"
    echo "Got: $result"
    ((FAILED++))
fi

echo

# ===================================================================
# Test 7: Empty learnings list (no recurrence)
# ===================================================================
echo -e "${BLUE}Test 7: Empty learnings list (no recurrence)${NC}"

# Create iteration 12 learnings with empty list
cat > .2L/plan-9/iteration-12/learnings.yaml << 'EOF'
learnings: []
EOF

# Run check-recurrence
exit_code=0
result=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-PATTERN-001 \
    --current-iteration 12 \
    --global-learnings .2L/global-learnings.yaml 2>&1) || exit_code=$?

# Assert: exit code 1 (VERIFIED) - no learnings = no recurrence, window passed
assert_exit_code 1 $exit_code "Empty learnings list results in VERIFIED (window complete)"

echo

# ===================================================================
# Test 8: Pattern not in IMPLEMENTED status (skip monitoring)
# ===================================================================
echo -e "${BLUE}Test 8: Pattern not in IMPLEMENTED status (skip monitoring)${NC}"

# Update pattern to IDENTIFIED
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" update \
    --pattern-id TEST-PATTERN-001 \
    --status REGRESSED \
    --iteration 8 \
    --global-learnings .2L/global-learnings.yaml > /dev/null 2>&1

# Note: We can transition VERIFIED -> REGRESSED, let's set it properly
python3 -c "
import yaml
with open('.2L/global-learnings.yaml', 'r') as f:
    data = yaml.safe_load(f)
for p in data['patterns']:
    if p['pattern_id'] == 'TEST-PATTERN-001':
        p['status'] = 'IDENTIFIED'
with open('.2L/global-learnings.yaml', 'w') as f:
    yaml.dump(data, f, default_flow_style=False, sort_keys=False)
"

# Run check-recurrence
exit_code=0
result=$(python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-PATTERN-001 \
    --current-iteration 9 \
    --global-learnings .2L/global-learnings.yaml 2>&1) || exit_code=$?

# Assert: exit code 0 (monitoring/skip)
assert_exit_code 0 $exit_code "Non-IMPLEMENTED pattern skips monitoring"

# Verify message mentions status is not IMPLEMENTED
if echo "$result" | grep -q "not IMPLEMENTED"; then
    echo -e "${GREEN}✅ PASS:${NC} Correct skip message for non-IMPLEMENTED pattern"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL:${NC} Skip message not found"
    echo "Got: $result"
    ((FAILED++))
fi

echo

# ===================================================================
# Test 9: Similarity algorithm consistency
# ===================================================================
echo -e "${BLUE}Test 9: Similarity algorithm consistency with aggregator${NC}"

# Test that our similarity calculation matches expected behavior
python3 << 'EOF'
import sys
sys.path.insert(0, '$ORIGINAL_DIR/lib')
from pathlib import Path
sys.path[0] = str(Path('$ORIGINAL_DIR/lib').resolve())

# Import our lifecycle manager
import importlib.util
spec = importlib.util.spec_from_file_location("lifecycle", "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py")
lifecycle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lifecycle)

manager = lifecycle.PatternLifecycleManager('.2L/global-learnings.yaml')

# Test cases
test_cases = [
    ("Missing error handling", "Missing error handling", 1.0),  # Identical
    ("Missing error handling", "Error handling missing", 0.8),  # High similarity
    ("Missing error handling", "Performance issue", 0.0),  # Different
]

passed = True
for text1, text2, expected_min in test_cases:
    similarity = manager._calculate_similarity(text1, text2)
    if expected_min == 1.0:
        if similarity != 1.0:
            print(f"FAIL: Expected 1.0, got {similarity}")
            passed = False
    elif expected_min == 0.8:
        if similarity < 0.8:
            print(f"FAIL: Expected >= 0.8, got {similarity}")
            passed = False
    else:
        if similarity >= 0.8:
            print(f"FAIL: Expected < 0.8, got {similarity}")
            passed = False

if passed:
    print("PASS")
    sys.exit(0)
else:
    sys.exit(1)
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASS:${NC} Similarity algorithm works correctly"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL:${NC} Similarity algorithm test failed"
    ((FAILED++))
fi

echo

# ===================================================================
# Cleanup and Summary
# ===================================================================
cd "$ORIGINAL_DIR"
rm -rf "$TEST_DIR"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All recurrence detection tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review output above.${NC}"
    exit 1
fi
