#!/usr/bin/env bash
#
# Unit Test: Orchestrator Exclusion
# Tests that vision containing "2l-mvp.md" is rejected
#

set -e

echo "Testing orchestrator exclusion..."
echo ""

# Create test vision with 2l-mvp.md mention
test_vision="/tmp/test-vision-with-mvp.md"
cat > "$test_vision" <<'EOF'
# Test Vision

## Affected Components

- commands/2l-mvp.md - DO NOT MODIFY THIS
- agents/2l-planner.md - Safe to modify

EOF

# Define the verification function (same as in 2l-improve.md)
function verify_orchestrator_exclusion() {
    local vision_path="$1"

    # Check if vision mentions 2l-mvp.md
    if grep -q "2l-mvp\.md" "$vision_path"; then
        echo "ERROR: Vision suggests modifying orchestrator (commands/2l-mvp.md)"
        return 1
    fi

    return 0
}

# Test 1: Vision with 2l-mvp.md should FAIL
echo "Test 1: Vision containing 2l-mvp.md"
if verify_orchestrator_exclusion "$test_vision"; then
    echo "   FAIL: Should have detected 2l-mvp.md"
    exit 1
else
    echo "   PASS: Correctly rejected vision with 2l-mvp.md"
fi

echo ""

# Test 2: Vision without 2l-mvp.md should PASS
echo "Test 2: Vision without orchestrator mention"
cat > "$test_vision" <<'EOF'
# Test Vision

## Affected Components

- agents/2l-planner.md - Safe to modify
- agents/2l-builder.md - Safe to modify

EOF

if verify_orchestrator_exclusion "$test_vision"; then
    echo "   PASS: Correctly accepted safe vision"
else
    echo "   FAIL: Should have accepted safe vision"
    exit 1
fi

echo ""

# Cleanup
rm -f "$test_vision"

echo "All orchestrator exclusion tests passed!"
