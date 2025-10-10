#!/bin/bash

# Test the complexity calculation logic

test_vision() {
    local vision_file=$1
    local expected_explorers=$2
    local expected_complexity=$3

    echo "Testing: $(basename $vision_file)"

    # Count features (## headers in vision.md)
    feature_count=$(grep -c "^## " "$vision_file" || echo 0)

    # Count integrations (keywords indicating external integrations)
    integration_count=$(grep -cE "API|integration|external|webhook|OAuth|third-party" "$vision_file" || echo 0)

    # Decision logic for num_explorers
    if [ "$feature_count" -lt 5 ]; then
        num_explorers=2
        complexity="SIMPLE"
    elif [ "$feature_count" -ge 15 ] || [ "$integration_count" -ge 3 ]; then
        num_explorers=4
        complexity="COMPLEX"
    else
        num_explorers=3
        complexity="MEDIUM"
    fi

    echo "  Features: $feature_count"
    echo "  Integrations: $integration_count"
    echo "  Complexity: $complexity"
    echo "  Explorers: $num_explorers"

    # Verify expectations
    if [ "$num_explorers" -eq "$expected_explorers" ] && [ "$complexity" = "$expected_complexity" ]; then
        echo "  ✓ PASS"
    else
        echo "  ✗ FAIL (expected $expected_explorers explorers, $expected_complexity complexity)"
    fi
    echo ""
}

echo "========================================="
echo "Adaptive Spawning Logic Tests"
echo "========================================="
echo ""

# Test 1: Simple vision (3 features, 0 integrations) -> 2 explorers
test_vision "test-simple-vision.md" 2 "SIMPLE"

# Test 2: Medium vision (10 features, 0 integrations) -> 3 explorers
test_vision "test-medium-vision.md" 3 "MEDIUM"

# Test 3: Complex vision (20 features, 8 integrations) -> 4 explorers
test_vision "test-complex-vision.md" 4 "COMPLEX"

echo "========================================="
echo "All tests completed"
echo "========================================="
