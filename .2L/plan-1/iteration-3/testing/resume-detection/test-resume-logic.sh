#!/bin/bash
# Test Resume Detection Logic for 2-4 Explorers

echo "=== Test 1: Plan with 3 explorers (MEDIUM complexity) ==="
echo "Config: num_explorers=3"
echo "Scenario: 2 reports exist, 1 missing"

# Simulated values
CURRENT_PLAN="plan-1"
EXPECTED=3  # Would be read from config with: yq eval ".plans[] | select(.plan_id == \"${CURRENT_PLAN}\") | .master_exploration.num_explorers // 2" .2L/config.yaml
ACTUAL=2    # ls count would return 2

echo "EXPECTED: $EXPECTED"
echo "ACTUAL: $ACTUAL"

if [ "$ACTUAL" -lt "$EXPECTED" ]; then
    echo "✓ Master exploration incomplete: $ACTUAL/$EXPECTED explorers complete"
    echo "✓ Would spawn explorers: $(seq $((ACTUAL + 1)) $EXPECTED)"
    
    for explorer_id in $(seq $((ACTUAL + 1)) $EXPECTED); do
        case $explorer_id in
            1) FOCUS_AREA="Architecture & Complexity Analysis" ;;
            2) FOCUS_AREA="Dependencies & Risk Assessment" ;;
            3) FOCUS_AREA="User Experience & Integration Points" ;;
            4) FOCUS_AREA="Scalability & Performance Considerations" ;;
        esac
        echo "  - Would spawn Explorer $explorer_id: $FOCUS_AREA"
    done
else
    echo "Master exploration complete: $ACTUAL/$EXPECTED explorers"
fi

echo ""
echo "=== Test 2: Old plan format (backward compatibility) ==="
echo "Config: no num_explorers field"
echo "Scenario: Should default to 2 explorers"

CURRENT_PLAN="plan-2"
EXPECTED=2  # Default value from: // 2
ACTUAL=1

echo "EXPECTED: $EXPECTED (defaulted)"
echo "ACTUAL: $ACTUAL"

if [ "$ACTUAL" -lt "$EXPECTED" ]; then
    echo "✓ Master exploration incomplete: $ACTUAL/$EXPECTED explorers complete"
    echo "✓ Would spawn explorers: $(seq $((ACTUAL + 1)) $EXPECTED)"
    
    for explorer_id in $(seq $((ACTUAL + 1)) $EXPECTED); do
        case $explorer_id in
            1) FOCUS_AREA="Architecture & Complexity Analysis" ;;
            2) FOCUS_AREA="Dependencies & Risk Assessment" ;;
            3) FOCUS_AREA="User Experience & Integration Points" ;;
            4) FOCUS_AREA="Scalability & Performance Considerations" ;;
        esac
        echo "  - Would spawn Explorer $explorer_id: $FOCUS_AREA"
    done
fi

echo ""
echo "=== Test 3: Complex plan with 4 explorers ==="
echo "Config: num_explorers=4"
echo "Scenario: 3 reports exist, 1 missing"

EXPECTED=4
ACTUAL=3

echo "EXPECTED: $EXPECTED"
echo "ACTUAL: $ACTUAL"

if [ "$ACTUAL" -lt "$EXPECTED" ]; then
    echo "✓ Master exploration incomplete: $ACTUAL/$EXPECTED explorers complete"
    echo "✓ Would spawn explorers: $(seq $((ACTUAL + 1)) $EXPECTED)"
    
    for explorer_id in $(seq $((ACTUAL + 1)) $EXPECTED); do
        case $explorer_id in
            1) FOCUS_AREA="Architecture & Complexity Analysis" ;;
            2) FOCUS_AREA="Dependencies & Risk Assessment" ;;
            3) FOCUS_AREA="User Experience & Integration Points" ;;
            4) FOCUS_AREA="Scalability & Performance Considerations" ;;
        esac
        echo "  - Would spawn Explorer $explorer_id: $FOCUS_AREA"
    done
fi

echo ""
echo "=== Test 4: All explorers complete ==="
echo "Config: num_explorers=3"
echo "Scenario: 3 reports exist"

EXPECTED=3
ACTUAL=3

echo "EXPECTED: $EXPECTED"
echo "ACTUAL: $ACTUAL"

if [ "$ACTUAL" -lt "$EXPECTED" ]; then
    echo "Master exploration incomplete: $ACTUAL/$EXPECTED explorers complete"
else
    echo "✓ Master exploration complete: $ACTUAL/$EXPECTED explorers"
fi

echo ""
echo "=== All Tests Complete ==="
