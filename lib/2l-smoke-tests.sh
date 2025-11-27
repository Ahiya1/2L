#!/usr/bin/env bash
# 2L Smoke Tests - Validate framework health post-modification

set -e  # Exit on first failure

echo "Running 2L smoke tests..."

# Source event logger for test events
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    EVENT_LOGGING_ENABLED=true
    log_2l_event "validation_start" "Running smoke tests" "validation" "smoke-tester"
else
    EVENT_LOGGING_ENABLED=false
fi

# Test 1: Event logging works
echo "  Testing event logging..."
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    log_2l_event "smoke_test" "Event logging functional" "testing" "smoke-tester"

    if [ -f .2L/events.jsonl ]; then
        echo "    ✓ Event logging"
    else
        echo "    ❌ FAIL: events.jsonl not created"
        exit 1
    fi
else
    echo "    ⚠️  WARNING: Event logger not found (non-critical)"
fi

# Test 2: Pattern detection runs
echo "  Testing pattern detector..."
if [ -f "$HOME/.claude/lib/2l-pattern-detector.py" ]; then
    if [ -f .2L/global-learnings.yaml ]; then
        python3 "$HOME/.claude/lib/2l-pattern-detector.py" \
            --global-learnings .2L/global-learnings.yaml \
            --output /dev/null 2>&1 || {
            echo "    ❌ FAIL: Pattern detector crashed"
            exit 1
        }
        echo "    ✓ Pattern detector"
    else
        echo "    ⚠️  WARNING: global-learnings.yaml not found (skipping)"
    fi
else
    echo "    ⚠️  WARNING: Pattern detector not found (skipping)"
fi

# Test 3: Symlinks valid
echo "  Testing symlink integrity..."
if [ -f "$HOME/.claude/lib/verify-symlinks.sh" ]; then
    bash "$HOME/.claude/lib/verify-symlinks.sh" > /dev/null 2>&1 || {
        echo "    ❌ FAIL: Symlink verification failed"
        exit 1
    }
    echo "    ✓ Symlinks"
else
    echo "    ⚠️  WARNING: Symlink verifier not found (skipping)"
fi

# Test 4: Commands exist
echo "  Testing command availability..."
critical_commands_found=0
commands_dir="$HOME/Ahiya/2L/commands"

for cmd in 2l-improve.md 2l-mvp.md; do
    if [ -f "$commands_dir/$cmd" ]; then
        critical_commands_found=$((critical_commands_found + 1))
    fi
done

if [ $critical_commands_found -ge 2 ]; then
    echo "    ✓ Commands ($critical_commands_found critical commands found)"
else
    echo "    ❌ FAIL: Critical 2L commands missing from $commands_dir"
    exit 1
fi

# Test 5: Agent definitions valid (frontmatter check)
echo "  Testing agent definitions..."
if [ -d "$HOME/.claude/agents" ]; then
    for agent in "$HOME/.claude/agents"/*.md; do
        if [ -f "$agent" ]; then
            if ! grep -q "^---$" "$agent" 2>/dev/null; then
                echo "    ❌ FAIL: Invalid frontmatter in $(basename $agent)"
                exit 1
            fi
        fi
    done
    echo "    ✓ Agent definitions"
else
    echo "    ⚠️  WARNING: agents/ directory not found (skipping)"
fi

# Test 6: Python dependencies available
echo "  Testing Python dependencies..."
python3 -c "import yaml, json, argparse, tempfile, shutil" 2>/dev/null || {
    echo "    ❌ FAIL: Python dependencies missing"
    exit 1
}
echo "    ✓ Python dependencies"

# All tests passed
echo "✅ All smoke tests passed"

# Emit success event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "validation_pass" "All smoke tests passed" "validation" "smoke-tester"
fi

exit 0
