#!/usr/bin/env bash
#
# Symlink Verification Script
# Verifies that ~/.claude/ symlinks point to ~/Ahiya/2L/ meditation space
#
# Exit codes:
#   0: All symlinks valid
#   1: At least one issue detected
#

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Track if any issues found
issues_found=0

echo "Verifying ~/.claude/ symlink integrity..."
echo ""

# Check agents symlink
echo -n "Checking agents/ symlink... "
if [ -L "$HOME/.claude/agents" ]; then
    actual_target=$(readlink -f "$HOME/.claude/agents")
    expected_target=$(readlink -f "$HOME/Ahiya/2L/agents")

    if [ -d "$actual_target" ]; then
        if [ "$actual_target" = "$expected_target" ]; then
            echo -e "${GREEN}✓ Valid${NC}"
        else
            echo -e "${RED}✗ Points to wrong target${NC}"
            echo "  Expected: $expected_target"
            echo "  Actual:   $actual_target"
            issues_found=1
        fi
    else
        echo -e "${RED}✗ Target does not exist${NC}"
        echo "  Target: $actual_target"
        issues_found=1
    fi
else
    echo -e "${RED}✗ Not a symlink${NC}"
    issues_found=1
fi

# Check commands symlink
echo -n "Checking commands/ symlink... "
if [ -L "$HOME/.claude/commands" ]; then
    actual_target=$(readlink -f "$HOME/.claude/commands")
    expected_target=$(readlink -f "$HOME/Ahiya/2L/commands")

    if [ -d "$actual_target" ]; then
        if [ "$actual_target" = "$expected_target" ]; then
            echo -e "${GREEN}✓ Valid${NC}"
        else
            echo -e "${RED}✗ Points to wrong target${NC}"
            echo "  Expected: $expected_target"
            echo "  Actual:   $actual_target"
            issues_found=1
        fi
    else
        echo -e "${RED}✗ Target does not exist${NC}"
        echo "  Target: $actual_target"
        issues_found=1
    fi
else
    echo -e "${RED}✗ Not a symlink${NC}"
    issues_found=1
fi

# Check lib symlink
echo -n "Checking lib/ symlink... "
if [ -L "$HOME/.claude/lib" ]; then
    actual_target=$(readlink -f "$HOME/.claude/lib")
    expected_target=$(readlink -f "$HOME/Ahiya/2L/lib")

    if [ -d "$actual_target" ]; then
        if [ "$actual_target" = "$expected_target" ]; then
            echo -e "${GREEN}✓ Valid${NC}"
        else
            echo -e "${RED}✗ Points to wrong target${NC}"
            echo "  Expected: $expected_target"
            echo "  Actual:   $actual_target"
            issues_found=1
        fi
    else
        echo -e "${RED}✗ Target does not exist${NC}"
        echo "  Target: $actual_target"
        issues_found=1
    fi
else
    echo -e "${RED}✗ Not a symlink${NC}"
    issues_found=1
fi

echo ""

# Report results
if [ $issues_found -eq 0 ]; then
    echo -e "${GREEN}All symlinks valid${NC}"
    exit 0
else
    echo -e "${RED}Symlink integrity check failed${NC}"
    echo ""
    echo "To fix symlink issues:"
    echo "  1. Navigate to meditation space: cd ~/Ahiya/2L"
    echo "  2. Re-create symlinks manually:"
    echo "     ln -sf ~/Ahiya/2L/agents ~/.claude/agents"
    echo "     ln -sf ~/Ahiya/2L/commands ~/.claude/commands"
    echo "     ln -sf ~/Ahiya/2L/lib ~/.claude/lib"
    echo ""
    echo "Do NOT proceed with self-modification until symlinks are fixed."
    exit 1
fi
