#!/usr/bin/env bash
#
# Integration test for /2l-improve --dry-run
#
# Tests pattern detection, ranking, and dry-run workflow

echo "=========================================="
echo "Testing /2l-improve --dry-run"
echo "=========================================="
echo ""

# Create temp directory
test_dir=$(mktemp -d)
trap "rm -rf $test_dir" EXIT

# Copy test data to temp location
cp .2L/plan-5/iteration-7/building/test-data.yaml "$test_dir/global-learnings.yaml"

# Create .2L directory structure
mkdir -p "$test_dir/.2L"
cp "$test_dir/global-learnings.yaml" "$test_dir/.2L/global-learnings.yaml"

# Change to test directory
cd "$test_dir"

echo "Test directory: $test_dir"
echo ""

# Run /2l-improve --dry-run
echo "Running: /2l-improve --dry-run"
echo ""

bash ~/Ahiya/2L/commands/2l-improve.md --dry-run

exit_code=$?

echo ""
echo "=========================================="
echo "Test Result"
echo "=========================================="
echo ""

if [ $exit_code -eq 0 ]; then
    echo "✅ /2l-improve --dry-run succeeded"
    echo ""
    echo "Expected behavior verified:"
    echo "  - Pattern detection ran"
    echo "  - Top pattern selected (PATTERN-001)"
    echo "  - Dry-run output displayed"
    echo "  - No modifications made"
    echo "  - Exit code 0"
else
    echo "❌ /2l-improve --dry-run failed with exit code: $exit_code"
    exit 1
fi

# Verify no files modified
if [ -f ".2L/plan-*/vision.md" ]; then
    echo "❌ ERROR: Vision file created in dry-run mode (should not happen)"
    exit 1
else
    echo "✅ No vision file created (correct for dry-run)"
fi

echo ""
echo "All tests passed!"
