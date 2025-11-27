#!/usr/bin/env bash
# Test script for Pattern Lifecycle Manager

set -e

echo "Testing Pattern Lifecycle Manager..."
echo

# Test 1: List all patterns
echo "Test 1: List all patterns"
python3 lib/2l-pattern-lifecycle.py list
echo

# Test 2: Get status of PATTERN-001
echo "Test 2: Get status of PATTERN-001"
python3 lib/2l-pattern-lifecycle.py get-status --pattern-id PATTERN-001
echo

# Test 3: Test invalid transition (should fail)
echo "Test 3: Test invalid transition (IDENTIFIED -> VERIFIED should fail)"
if python3 lib/2l-pattern-lifecycle.py update --pattern-id PATTERN-001 --status VERIFIED 2>&1; then
    echo "ERROR: Invalid transition was allowed!"
    exit 1
else
    echo "✓ Invalid transition correctly rejected"
fi
echo

# Test 4: Test valid transition (IDENTIFIED -> IMPLEMENTED)
echo "Test 4: Test valid transition (IDENTIFIED -> IMPLEMENTED)"
python3 lib/2l-pattern-lifecycle.py update --pattern-id PATTERN-001 --status IMPLEMENTED --plan-id plan-test --iteration 1
echo

# Test 5: Verify status changed
echo "Test 5: Verify status changed"
status=$(python3 lib/2l-pattern-lifecycle.py get-status --pattern-id PATTERN-001 | grep "Status:" | awk '{print $2}')
if [ "$status" = "IMPLEMENTED" ]; then
    echo "✓ Status correctly updated to IMPLEMENTED"
else
    echo "ERROR: Status is $status, expected IMPLEMENTED"
    exit 1
fi
echo

# Test 6: Test idempotence (same transition should be no-op)
echo "Test 6: Test idempotence (calling IMPLEMENTED again)"
python3 lib/2l-pattern-lifecycle.py update --pattern-id PATTERN-001 --status IMPLEMENTED --plan-id plan-test --iteration 1
echo

# Test 7: Verify backup created
echo "Test 7: Verify backup created"
if [ -f .2L/global-learnings.yaml.bak ]; then
    echo "✓ Backup file exists"
else
    echo "ERROR: Backup file not created"
    exit 1
fi
echo

# Test 8: Verify JSONL audit trail
echo "Test 8: Verify JSONL audit trail"
if [ -f .2L/global-learnings.jsonl ]; then
    event_count=$(wc -l < .2L/global-learnings.jsonl)
    echo "✓ JSONL audit trail exists with $event_count event(s)"
    cat .2L/global-learnings.jsonl
else
    echo "ERROR: JSONL audit trail not created"
    exit 1
fi
echo

# Test 9: Test next transition (IMPLEMENTED -> VERIFIED)
echo "Test 9: Test next transition (IMPLEMENTED -> VERIFIED)"
python3 lib/2l-pattern-lifecycle.py update --pattern-id PATTERN-001 --status VERIFIED --iteration 4
echo

# Test 10: Test regression (VERIFIED -> REGRESSED)
echo "Test 10: Test regression (VERIFIED -> REGRESSED)"
python3 lib/2l-pattern-lifecycle.py update --pattern-id PATTERN-001 --status REGRESSED --plan-id plan-test-2 --iteration 5
echo

# Test 11: Test fix-retry cycle (REGRESSED -> IMPLEMENTED)
echo "Test 11: Test fix-retry cycle (REGRESSED -> IMPLEMENTED)"
python3 lib/2l-pattern-lifecycle.py update --pattern-id PATTERN-001 --status IMPLEMENTED --plan-id plan-test-3 --iteration 6
echo

# Test 12: List IMPLEMENTED patterns
echo "Test 12: List IMPLEMENTED patterns"
python3 lib/2l-pattern-lifecycle.py list --status IMPLEMENTED
echo

echo "✅ All tests passed!"
echo
echo "Cleaning up test changes..."
# Restore original state
cp .2L/global-learnings.yaml.bak .2L/global-learnings.yaml
rm -f .2L/global-learnings.jsonl
echo "✓ Original state restored"
