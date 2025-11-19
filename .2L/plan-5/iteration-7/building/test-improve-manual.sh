#!/usr/bin/env bash
#
# Integration Test: /2l-improve --manual mode
# Tests vision generation without /2l-mvp invocation
#

set -e

echo "Integration Test: /2l-improve --manual mode"
echo "==========================================="
echo ""

# Setup: Copy test data to global learnings
echo "Setting up test environment..."
cp .2L/plan-5/iteration-7/building/test-data.yaml .2L/global-learnings.yaml
echo "   Test data copied to .2L/global-learnings.yaml"
echo ""

# Run /2l-improve in manual mode
echo "Running: /2l-improve --manual"
echo ""

# Use echo to simulate user input (exit after vision generation)
# Since manual mode exits after vision generation, we don't need input
bash commands/2l-improve.md --manual 2>&1 || {
    exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "ERROR: /2l-improve exited with code $exit_code"
        exit 1
    fi
}

echo ""
echo "==========================================="
echo "Test Results"
echo "==========================================="
echo ""

# Verify vision was generated (should be plan-6 since plan-1 through plan-5 exist)
if [ -f .2L/plan-6/vision.md ]; then
    echo "PASS: Vision file created"
    vision_file=".2L/plan-6/vision.md"
    echo "   File: $vision_file"

    # Verify vision contains expected content
    if grep -q "TypeScript path resolution failures" "$vision_file"; then
        echo "PASS: Vision contains expected pattern name"
    else
        echo "FAIL: Vision missing expected content"
        exit 1
    fi

    # Verify all placeholders were replaced
    if grep -q '{[A-Z_]*}' "$vision_file"; then
        echo "WARNING: Vision contains unreplaced placeholders"
        grep -o '{[A-Z_]*}' "$vision_file" | sort -u
    else
        echo "PASS: All template placeholders replaced"
    fi

    # Verify orchestrator not in affected components (only check actual component lists, not warnings)
    # Extract just the component list (lines starting with "- " after the header)
    component_list=$(grep -A 20 "^**Agent/Command Modifications:**" "$vision_file" | grep "^- " | grep -v "WARNING" | grep -v "ALLOWED")

    if echo "$component_list" | grep -q "2l-mvp\.md"; then
        echo "FAIL: Vision suggests modifying orchestrator (2l-mvp.md in component list)"
        echo "Component list:"
        echo "$component_list"
        exit 1
    else
        echo "PASS: Orchestrator exclusion verified (not in affected components)"
    fi

else
    echo "FAIL: Vision file not created"
    exit 1
fi

echo ""

# Cleanup
echo "Cleaning up..."
rm -rf .2L/plan-6/
git restore .2L/global-learnings.yaml 2>/dev/null || rm -f .2L/global-learnings.yaml

echo ""
echo "All tests PASSED!"
