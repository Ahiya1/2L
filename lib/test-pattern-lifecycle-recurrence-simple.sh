#!/usr/bin/env bash
# Simplified test suite for Pattern Lifecycle Recurrence Detection
# Focuses on key functionality with faster execution

set -e
set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Pattern Lifecycle Recurrence Tests (Simple)${NC}"
echo

ORIGINAL_DIR="$PWD"
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

mkdir -p .2L/plan-9/iteration-{9,10,11,12}

PASSED=0
FAILED=0

# Test 1: Exact match triggers REGRESSED
echo "Test 1: Exact match -> REGRESSED"
cat > .2L/global-learnings.yaml << 'EOF'
patterns:
  - pattern_id: TEST-001
    status: IMPLEMENTED
    category: functionality
    root_cause: "Missing error handling"
    verification_start_iteration: 9
EOF

cat > .2L/plan-9/iteration-9/learnings.yaml << 'EOF'
learnings:
  - learning_id: test-1
    root_cause: "Missing error handling"
    category: functionality
    iteration: 9
EOF

exit_code=0
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-001 --current-iteration 9 \
    --global-learnings .2L/global-learnings.yaml >/dev/null 2>&1 || exit_code=$?

if [ $exit_code -eq 2 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (expected 2, got $exit_code)${NC}"
    ((FAILED++))
fi

# Test 2: Category mismatch -> no regression
echo "Test 2: Category mismatch -> MONITORING"
cat > .2L/global-learnings.yaml << 'EOF'
patterns:
  - pattern_id: TEST-002
    status: IMPLEMENTED
    category: functionality
    root_cause: "Missing error handling"
    verification_start_iteration: 9
EOF

cat > .2L/plan-9/iteration-9/learnings.yaml << 'EOF'
learnings:
  - learning_id: test-2
    root_cause: "Missing error handling"
    category: speed
    iteration: 9
EOF

exit_code=0
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-002 --current-iteration 9 \
    --global-learnings .2L/global-learnings.yaml >/dev/null 2>&1 || exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (expected 0, got $exit_code)${NC}"
    ((FAILED++))
fi

# Test 3: After 3 iterations -> VERIFIED
echo "Test 3: 3 clean iterations -> VERIFIED"
cat > .2L/global-learnings.yaml << 'EOF'
patterns:
  - pattern_id: TEST-003
    status: IMPLEMENTED
    category: functionality
    root_cause: "Missing error handling"
    verification_start_iteration: 9
EOF

cat > .2L/plan-9/iteration-9/learnings.yaml << 'EOF'
learnings:
  - learning_id: test-3a
    root_cause: "Performance issue"
    category: speed
    iteration: 9
EOF

cat > .2L/plan-9/iteration-10/learnings.yaml << 'EOF'
learnings:
  - learning_id: test-3b
    root_cause: "UI bug"
    category: completeness
    iteration: 10
EOF

cat > .2L/plan-9/iteration-11/learnings.yaml << 'EOF'
learnings:
  - learning_id: test-3c
    root_cause: "Documentation typo"
    category: completeness
    iteration: 11
EOF

exit_code=0
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-003 --current-iteration 11 \
    --global-learnings .2L/global-learnings.yaml >/dev/null 2>&1 || exit_code=$?

if [ $exit_code -eq 1 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (expected 1, got $exit_code)${NC}"
    ((FAILED++))
fi

# Test 4: Iteration 2 of 3 -> still monitoring
echo "Test 4: Iteration 2 of 3 -> MONITORING"
exit_code=0
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-003 --current-iteration 10 \
    --global-learnings .2L/global-learnings.yaml >/dev/null 2>&1 || exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (expected 0, got $exit_code)${NC}"
    ((FAILED++))
fi

# Test 5: Missing learnings file -> graceful
echo "Test 5: Missing learnings -> graceful failure"
cat > .2L/global-learnings.yaml << 'EOF'
patterns:
  - pattern_id: TEST-004
    status: IMPLEMENTED
    category: functionality
    root_cause: "Test"
    verification_start_iteration: 9
EOF

rm -f .2L/plan-9/iteration-12/learnings.yaml

exit_code=0
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-004 --current-iteration 12 \
    --global-learnings .2L/global-learnings.yaml >/dev/null 2>&1 || exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (expected 0, got $exit_code)${NC}"
    ((FAILED++))
fi

# Test 6: Fuzzy match triggers regression
echo "Test 6: Fuzzy match (>0.8) -> REGRESSED"
cat > .2L/global-learnings.yaml << 'EOF'
patterns:
  - pattern_id: TEST-005
    status: IMPLEMENTED
    category: functionality
    root_cause: "Missing error handling"
    verification_start_iteration: 9
EOF

cat > .2L/plan-9/iteration-9/learnings.yaml << 'EOF'
learnings:
  - learning_id: test-5
    root_cause: "Error handling is missing"
    category: functionality
    iteration: 9
EOF

exit_code=0
python3 "$ORIGINAL_DIR/lib/2l-pattern-lifecycle.py" check-recurrence \
    --pattern-id TEST-005 --current-iteration 9 \
    --global-learnings .2L/global-learnings.yaml >/dev/null 2>&1 || exit_code=$?

if [ $exit_code -eq 2 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (expected 2, got $exit_code)${NC}"
    ((FAILED++))
fi

# Cleanup
cd "$ORIGINAL_DIR"
rm -rf "$TEST_DIR"

echo
echo -e "${BLUE}Summary:${NC} ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
