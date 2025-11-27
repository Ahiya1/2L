#!/usr/bin/env bash
#
# /2l-improve - Recursive self-improvement command
#
# Aggregates learnings from global knowledge base, detects recurring patterns,
# auto-generates improvement visions, and orchestrates 2L to improve itself.
#
# Usage:
#   /2l-improve                    # Interactive mode (detect, confirm, execute)
#   /2l-improve --dry-run          # Show what would happen without modifications
#   /2l-improve --manual           # Save vision and exit (user runs /2l-mvp manually)
#   /2l-improve --pattern PATTERN-ID  # Skip selection, use specific pattern
#

set -e

# Source event logger if available
EVENT_LOGGING_ENABLED=false
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    . "$HOME/.claude/lib/2l-event-logger.sh"
    EVENT_LOGGING_ENABLED=true
fi

# Configuration
GLOBAL_LEARNINGS=".2L/global-learnings.yaml"
MIN_OCCURRENCES=2
MIN_SEVERITY="medium"

# Parse arguments
mode="interactive"
specified_pattern=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            mode="dry-run"
            shift
            ;;
        --manual)
            mode="manual"
            shift
            ;;
        --pattern)
            specified_pattern="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: /2l-improve [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run           Show what would happen without modifications"
            echo "  --manual            Save vision and exit (you run /2l-mvp manually)"
            echo "  --pattern PATTERN-ID  Use specific pattern (skip selection)"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Description:"
            echo "  Detects recurring patterns from global learnings and orchestrates"
            echo "  2L to improve itself by fixing the most impactful issues."
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Emit command start event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "command_start" \
                 "/2l-improve started (mode: ${mode})" \
                 "aggregation" \
                 "2l-improve"
fi

# Display header
echo ""
echo "=========================================="
echo "2L SELF-IMPROVEMENT"
echo "=========================================="
echo ""

if [ "$mode" = "dry-run" ]; then
    echo "MODE: DRY-RUN (simulation only, no modifications)"
elif [ "$mode" = "manual" ]; then
    echo "MODE: MANUAL (save vision, you run /2l-mvp)"
else
    echo "MODE: INTERACTIVE (automated self-improvement)"
fi

echo ""

# Verify global learnings exists
if [ ! -f "$GLOBAL_LEARNINGS" ]; then
    echo "❌ ERROR: Global learnings file not found: $GLOBAL_LEARNINGS"
    echo ""
    echo "   Run /2l-mvp on a project first to accumulate learnings."
    exit 1
fi

# Step 1: Pattern Detection
echo "📊 Step 1: Pattern Detection"
echo "   Loading learnings from: $GLOBAL_LEARNINGS"
echo ""

# Create temp file for patterns JSON
patterns_json=$(mktemp)
trap "rm -f $patterns_json" EXIT

# Run pattern detector
python3 ~/.claude/lib/2l-pattern-detector.py \
    --global-learnings "$GLOBAL_LEARNINGS" \
    --min-occurrences "$MIN_OCCURRENCES" \
    --min-severity "$MIN_SEVERITY" \
    --output "$patterns_json" 2>&1

# Check if detection succeeded
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Pattern detection failed"
    exit 1
fi

# Parse results
pattern_count=$(python3 -c "import json; print(json.load(open('$patterns_json'))['patterns_found'])" 2>/dev/null || echo "0")

# Emit learnings loaded event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    total_patterns=$(python3 -c "import yaml; data=yaml.safe_load(open('$GLOBAL_LEARNINGS')); print(len(data.get('patterns', [])))" 2>/dev/null || echo "0")
    log_2l_event "learnings_loaded" \
                 "Loaded ${total_patterns} patterns from global learnings" \
                 "aggregation" \
                 "2l-improve"
fi

# Emit pattern detection event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "pattern_detection" \
                 "Detected ${pattern_count} recurring patterns (min occurrences: ${MIN_OCCURRENCES}, min severity: ${MIN_SEVERITY})" \
                 "pattern_detection" \
                 "2l-improve"
fi

# Check if any patterns found
if [ "$pattern_count" -eq 0 ]; then
    echo "✅ No recurring patterns detected"
    echo "   All IDENTIFIED patterns have been addressed or don't meet thresholds."
    echo ""
    echo "   Thresholds:"
    echo "   - Minimum occurrences: $MIN_OCCURRENCES"
    echo "   - Minimum severity: $MIN_SEVERITY"
    echo "   - Status filter: IDENTIFIED only"
    exit 0
fi

echo "   ✅ Found $pattern_count recurring pattern(s)"
echo ""

# Display top patterns
echo "   Top patterns by impact score:"
echo ""
python3 -c "
import json
data = json.load(open('$patterns_json'))
patterns = data['patterns']
for i, p in enumerate(patterns[:5], 1):
    print(f\"   {i}. {p['name']} ({p['pattern_id']})\")
    print(f\"      Severity: {p['severity']} | Occurrences: {p['occurrences']} | Projects: {len(p['projects'])} | Impact: {p['impact_score']:.1f}\")
    if i < min(5, len(patterns)):
        print()
"

echo ""

# Step 2: Pattern Selection
echo "📊 Step 2: Pattern Selection"
echo ""

if [ -n "$specified_pattern" ]; then
    # User specified a pattern via --pattern flag
    selected_pattern_id="$specified_pattern"
    echo "   Using specified pattern: $selected_pattern_id"

    # Verify pattern exists in detected patterns
    pattern_exists=$(python3 -c "
import json
data = json.load(open('$patterns_json'))
patterns = data['patterns']
exists = any(p['pattern_id'] == '$selected_pattern_id' for p in patterns)
print('1' if exists else '0')
" 2>/dev/null || echo "0")

    if [ "$pattern_exists" = "0" ]; then
        echo "❌ ERROR: Specified pattern $selected_pattern_id not found in detected patterns"
        echo "   Run without --pattern to see available patterns"
        exit 1
    fi
else
    # Auto-select top pattern (single-pattern MVP)
    selected_pattern_id=$(python3 -c "
import json
data = json.load(open('$patterns_json'))
patterns = data['patterns']
if patterns:
    print(patterns[0]['pattern_id'])
else:
    print('')
" 2>/dev/null || echo "")

    if [ -z "$selected_pattern_id" ]; then
        echo "❌ ERROR: Could not select pattern"
        exit 1
    fi

    echo "   Auto-selected top pattern: $selected_pattern_id"
fi

# Extract selected pattern details to temp file (avoid IFS parsing issues)
pattern_details_file=$(mktemp)
python3 -c "
import json
data = json.load(open('$patterns_json'))
patterns = data['patterns']
pattern = next((p for p in patterns if p['pattern_id'] == '$selected_pattern_id'), None)
if pattern:
    with open('$pattern_details_file', 'w') as f:
        f.write(f\"{pattern['name']}\n\")
        f.write(f\"{pattern['severity']}\n\")
        f.write(f\"{pattern['occurrences']}\n\")
        f.write(f\"{len(pattern['projects'])}\n\")
        f.write(f\"{pattern['root_cause']}\n\")
        f.write(f\"{pattern['proposed_solution']}\n\")
        f.write(f\"{pattern['impact_score']:.1f}\n\")
" 2>/dev/null

if [ ! -s "$pattern_details_file" ]; then
    echo "❌ ERROR: Could not extract pattern details"
    rm -f "$pattern_details_file"
    exit 1
fi

# Parse pattern details
pattern_name=$(sed -n '1p' "$pattern_details_file")
severity=$(sed -n '2p' "$pattern_details_file")
occurrences=$(sed -n '3p' "$pattern_details_file")
project_count=$(sed -n '4p' "$pattern_details_file")
root_cause=$(sed -n '5p' "$pattern_details_file")
proposed_solution=$(sed -n '6p' "$pattern_details_file")
impact_score=$(sed -n '7p' "$pattern_details_file")
rm -f "$pattern_details_file"

echo ""
echo "   Pattern: $pattern_name"
echo "   Severity: $severity"
echo "   Occurrences: $occurrences across $project_count project(s)"
echo "   Impact Score: $impact_score"
echo ""

# Emit pattern selected event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "pattern_selected" \
                 "${selected_pattern_id}: ${pattern_name} (impact: ${impact_score})" \
                 "pattern_selection" \
                 "2l-improve"
fi

# Determine next plan ID (needed for exploration phase)
next_plan_id=$(python3 -c "
import os
import re
plan_dirs = [d for d in os.listdir('.2L') if re.match(r'plan-\d+', d)]
if plan_dirs:
    max_plan = max([int(re.findall(r'\d+', d)[0]) for d in plan_dirs])
    print(f'plan-{max_plan + 1}')
else:
    print('plan-1')
" 2>/dev/null || echo "plan-6")

# Step 2.5: System Exploration - Analyze 2L's own codebase
echo "📊 Step 2.5: System Exploration"
echo "   Analyzing 2L's own codebase to inform improvement vision..."
echo ""

# Create exploration directory
exploration_dir=".2L/${next_plan_id}/exploration"
mkdir -p "$exploration_dir"

# Create exploration context file
exploration_context="$exploration_dir/context.md"
cat > "$exploration_context" << EOF
# 2L System Exploration Context

**Purpose:** Self-improvement exploration - analyze 2L's own codebase

**Selected Pattern:** ${selected_pattern_id} - ${pattern_name}
**Root Cause:** ${root_cause}
**Proposed Solution:** ${proposed_solution}

## Exploration Goals

Analyze the meditation space (2L's own codebase) to understand:

1. **Current Architecture** - How agents, commands, and orchestration work
2. **Technology Patterns** - Bash/Python/YAML patterns used throughout
3. **Integration Points** - Where improvements should be applied

## Target Codebase

- **Location:** ~/Ahiya/2L (meditation space)
- **Key Directories:**
  - agents/ - Agent prompts (2l-builder, 2l-planner, 2l-integrator, etc.)
  - commands/ - Slash commands (2l-mvp, 2l-improve, etc.)
  - lib/ - Python and bash utilities
  - templates/ - Vision and prompt templates

## Focus Areas by Explorer

### Explorer 1: 2L Architecture & Agent Flow
- How does /2l-mvp orchestrate agents?
- What are agent responsibilities and interfaces?
- How do agents communicate (reports, events)?
- Document orchestration patterns

### Explorer 2: Tech Stack & Patterns
- Bash patterns in commands/
- Python patterns in lib/
- YAML structure in .2L/
- Event logging and observability
- Report generation patterns

### Explorer 3: Related to Pattern ${selected_pattern_id}
- Where in the codebase does this pattern's root cause live?
- Which agents/commands are affected?
- What files need modification?
- Provide specific integration guidance

## Output Format

Standard explorer reports at:
- $exploration_dir/explorer-1-report.md
- $exploration_dir/explorer-2-report.md
- $exploration_dir/explorer-3-report.md

EOF

echo "   ✅ Exploration context created: $exploration_context"
echo ""

# Emit exploration start event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "exploration_start" \
                 "Starting system exploration for ${selected_pattern_id}" \
                 "exploration" \
                 "2l-improve"
fi

# Spawn explorers (3 parallel explorers for self-analysis)
echo "   Spawning 3 explorers to analyze 2L system..."
echo ""

# Create exploration context file
cat > "$exploration_dir/context.md" << EOF
# Exploration Context

**Pattern:** ${selected_pattern_id}
**Name:** ${pattern_name}
**Root Cause:** ${root_cause}
**Proposed Solution:** ${proposed_solution}

**Meditation Space:** ~/Ahiya/2L
**Focus:** Analyze 2L framework architecture to enable informed improvements
EOF

# Spawn Explorer 1: Architecture Analysis
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" \
                 "Explorer-1: Architecture Analysis" \
                 "exploration" \
                 "explorer-1"
fi

Use Task tool with subagent_type: "2l-explorer"

Prompt:
"Explorer 1: Architecture & Structure

Iteration: ${global_iter}
Context: ${exploration_dir}/context.md
Output: ${exploration_dir}/explorer-1-report.md

Focus Area: 2L Architecture & Agent Flow

Analyze the following in meditation space (~/Ahiya/2L):
- How does /2l-mvp orchestrate agents? (commands/2l-mvp.md)
- What are agent responsibilities? (agents/*.md)
- How do agents communicate? (reports, events)
- What is the Task spawning pattern?
- Integration points for improvements

Create comprehensive report at: ${exploration_dir}/explorer-1-report.md

Include sections:
- Executive Summary
- Architecture Overview
- Agent Communication Patterns
- Integration Points
- Recommendations"

# Spawn Explorer 2: Tech Patterns
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" \
                 "Explorer-2: Tech Patterns" \
                 "exploration" \
                 "explorer-2"
fi

Use Task tool with subagent_type: "2l-explorer"

Prompt:
"Explorer 2: Technology Patterns & Dependencies

Iteration: ${global_iter}
Context: ${exploration_dir}/context.md
Output: ${exploration_dir}/explorer-2-report.md

Focus Area: Tech Stack & Patterns

Analyze the following in meditation space (~/Ahiya/2L):
- Bash patterns (commands/*.md)
- Python utilities (lib/*.py)
- YAML structures (.2L/global-learnings.yaml)
- Event logging patterns (lib/2l-event-logger.sh)
- File organization and naming conventions

Create comprehensive report at: ${exploration_dir}/explorer-2-report.md

Include sections:
- Executive Summary
- Technology Stack Overview
- Code Patterns and Conventions
- Affected Components
- Recommendations"

# Spawn Explorer 3: Pattern-Specific Analysis
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "agent_spawn" \
                 "Explorer-3: Pattern Analysis" \
                 "exploration" \
                 "explorer-3"
fi

Use Task tool with subagent_type: "2l-explorer"

Prompt:
"Explorer 3: Pattern-Specific Analysis

Iteration: ${global_iter}
Context: ${exploration_dir}/context.md
Output: ${exploration_dir}/explorer-3-report.md

Focus Area: ${selected_pattern_id} - ${pattern_name}

Analyze the following in meditation space (~/Ahiya/2L):
- Root cause location in codebase
- Affected files/functions (exact paths)
- Integration guidance for builders
- Complexity assessment

Root Cause: ${root_cause}
Proposed Solution: ${proposed_solution}

Create comprehensive report at: ${exploration_dir}/explorer-3-report.md

Include sections:
- Executive Summary
- Root Cause Analysis
- Affected Components (with exact file paths)
- Integration Points
- Recommendations
- Complexity Assessment"

# Wait for all explorers to complete with timeout
echo "   Waiting for 3 explorers to complete..."
max_wait=300  # 5 minutes
elapsed=0
all_complete=false

while [ $elapsed -lt $max_wait ]; do
    if [ -f "$exploration_dir/explorer-1-report.md" ] && \
       [ -f "$exploration_dir/explorer-2-report.md" ] && \
       [ -f "$exploration_dir/explorer-3-report.md" ]; then
        all_complete=true
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
done

if [ "$all_complete" = false ]; then
    echo "   ❌ ERROR: Explorer timeout after ${max_wait}s"
    for i in 1 2 3; do
        [ ! -f "$exploration_dir/explorer-${i}-report.md" ] && \
            echo "      Missing: explorer-${i}-report.md"
    done
    exit 1
fi

echo "   ✅ All explorers completed (${elapsed}s)"

# Validate reports
for i in 1 2 3; do
    report="$exploration_dir/explorer-${i}-report.md"

    if grep -q "Placeholder" "$report"; then
        echo "   ⚠️  WARNING: explorer-${i} contains placeholder text"
    fi

    line_count=$(wc -l < "$report")
    if [ $line_count -lt 50 ]; then
        echo "   ⚠️  WARNING: explorer-${i} seems short (${line_count} lines)"
    fi
done
echo ""

# Emit exploration complete event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "exploration_complete" \
                 "System exploration complete (3 reports in ${elapsed}s)" \
                 "exploration" \
                 "2l-improve"
fi

# Step 3: Vision Generation
echo "📊 Step 3: Vision Generation"
echo ""

# Vision path (next_plan_id already determined in Step 2.5)
vision_path=".2L/${next_plan_id}/vision.md"

echo "   Next plan ID: $next_plan_id"
echo "   Vision path: $vision_path"

# Create plan directory
mkdir -p ".2L/${next_plan_id}"

# Extract selected pattern to JSON file
selected_pattern_json=$(mktemp)
trap "rm -f $selected_pattern_json" EXIT
python3 -c "
import json
data = json.load(open('$patterns_json'))
patterns = data['patterns']
pattern = next((p for p in patterns if p['pattern_id'] == '$selected_pattern_id'), None)
if pattern:
    with open('$selected_pattern_json', 'w') as f:
        json.dump(pattern, f, indent=2)
" 2>/dev/null

# Generate vision from pattern
python3 ~/.claude/lib/2l-vision-generator.py \
    --pattern-json "$selected_pattern_json" \
    --template ~/.claude/templates/improvement-vision.md \
    --output "$vision_path" \
    --plan-id "$next_plan_id" \
    --exploration-dir "$exploration_dir"

if [ $? -ne 0 ]; then
    echo "   ❌ ERROR: Vision generation failed"
    exit 1
fi

echo "   ✅ Vision generated: $vision_path"

# Verify exploration context included
if grep -q "Exploration Findings" "$vision_path"; then
    echo "      ✓ Exploration context included"
else
    echo "      ⚠️  WARNING: Vision may lack exploration context"
fi

# Emit vision generated event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "vision_generated" \
                 "Auto-generated vision for ${selected_pattern_id} in ${vision_path}" \
                 "vision_generation" \
                 "2l-improve"
fi

echo ""

# For dry-run mode, stop here
if [ "$mode" = "dry-run" ]; then
    echo "=========================================="
    echo "DRY-RUN COMPLETE"
    echo "=========================================="
    echo ""
    echo "Summary of what would happen:"
    echo ""
    echo "1. Pattern detected: $selected_pattern_id ($pattern_name)"
    echo "2. Vision would be generated from pattern"
    echo "3. Confirmation workflow would display:"
    echo "   - Pattern evidence (severity, occurrences, root cause)"
    echo "   - Generated vision preview"
    echo "   - Safety checks (orchestrator exclusion, git status, symlinks)"
    echo "4. On user confirmation:"
    echo "   - Pre-modification git checkpoint created"
    echo "   - /2l-mvp would be invoked to implement improvement"
    echo "   - Pattern status would update: IDENTIFIED → IMPLEMENTED"
    echo "   - Changes committed with tag: 2l-improve-${selected_pattern_id}"
    echo ""
    echo "To actually execute:"
    echo "  /2l-improve              # Interactive mode"
    echo "  /2l-improve --manual     # Manual mode (save vision, you run /2l-mvp)"
    echo ""
    exit 0
fi

# Step 4: Confirmation Workflow (Builder-1 implements this)
echo "📊 Step 4: Confirmation Workflow"
echo ""

# Display improvement confirmation
echo "=========================================="
echo "SELF-IMPROVEMENT CONFIRMATION"
echo "=========================================="
echo ""
echo "Proposed improvement:"
echo ""
echo "Pattern: $pattern_name ($selected_pattern_id)"
echo "Severity: $(echo $severity | tr '[:lower:]' '[:upper:]')"
echo "Occurrences: $occurrences across $project_count project(s)"
echo ""
echo "Root Cause:"
echo "  $root_cause"
echo ""
echo "Proposed Solution:"
echo "  $proposed_solution"
echo ""
echo "=========================================="
echo "SAFETY CHECKS"
echo "=========================================="
echo ""
echo "✅ Orchestrator exclusion: commands/2l-mvp.md will NOT be modified"
echo "✅ Status filter: Only IDENTIFIED patterns considered"

# Git status check
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "✅ Git status: Working directory clean"
else
    echo "⚠️  Git status: Uncommitted changes detected"
fi

echo ""
echo "=========================================="
echo "WHAT WILL HAPPEN"
echo "=========================================="
echo ""
echo "1. Generate vision.md from pattern data"
echo "2. Create pre-modification git checkpoint (safety)"
echo "3. Run /2l-mvp to implement the improvement"
echo "4. 2L will modify its own agent/command files"
echo "5. Update pattern status: IDENTIFIED → IMPLEMENTED"
echo "6. Git commit all changes with tag: 2l-improve-${selected_pattern_id}"
echo ""
echo "⚠️  This is meta-circular self-improvement."
echo "   2L will modify its own codebase to fix this recurring issue."
echo ""

# Emit confirmation prompt event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "confirmation_prompt" \
                 "Waiting for user confirmation to proceed with self-modification" \
                 "confirmation" \
                 "2l-improve"
fi

if [ "$mode" = "manual" ]; then
    # Manual mode - save vision and exit
    echo "Manual mode: Vision will be saved, you run /2l-mvp manually"
    echo ""
    echo "📝 Vision saved: $vision_path"
    echo ""
    echo "To implement manually:"
    echo "  1. Review vision: cat .2L/plan-X/vision.md"
    echo "  2. Edit if needed: vim .2L/plan-X/vision.md"
    echo "  3. Run /2l-mvp when ready"
    echo ""
    echo "Note: You'll need to update pattern status manually after /2l-mvp completes:"
    echo "  python3 ~/.claude/lib/2l-yaml-helpers.py update_pattern_status \\"
    echo "    --pattern-id \"$selected_pattern_id\" \\"
    echo "    --status \"IMPLEMENTED\" \\"
    echo "    --metadata-json '{\"implemented_in_plan\": \"plan-X\", \"implemented_at\": \"ISO-TIMESTAMP\", \"vision_file\": \".2L/plan-X/vision.md\"}'"

    # Emit event
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "user_deferred" \
                     "User chose manual mode for ${selected_pattern_id}" \
                     "confirmation" \
                     "2l-improve"
    fi

    exit 0
fi

# Interactive mode - prompt for confirmation
echo "Options:"
echo "  [P]roceed - Execute self-improvement (recommended)"
echo "  [E]dit    - Save vision and exit (you run /2l-mvp manually after editing)"
echo "  [C]ancel  - Abort without any changes"
echo ""
read -p "Your choice (P/E/C): " choice

case "$choice" in
    [Pp]*)
        echo ""
        echo "✅ Proceeding with self-improvement..."

        # Emit confirmation event
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "user_confirmed" \
                         "User confirmed self-improvement for ${selected_pattern_id}" \
                         "confirmation" \
                         "2l-improve"
        fi
        ;;
    [Ee]*)
        echo ""
        echo "📝 Vision saved: $vision_path"
        echo ""
        echo "To implement manually:"
        echo "  1. Review vision: cat .2L/plan-X/vision.md"
        echo "  2. Edit if needed: vim .2L/plan-X/vision.md"
        echo "  3. Run /2l-mvp when ready"
        echo ""
        echo "Note: You'll need to update pattern status manually after /2l-mvp completes"

        # Emit event
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "user_deferred" \
                         "User chose edit mode for ${selected_pattern_id}" \
                         "confirmation" \
                         "2l-improve"
        fi

        exit 0
        ;;
    *)
        echo ""
        echo "❌ Self-improvement cancelled"
        echo ""
        echo "No changes made. Pattern remains IDENTIFIED."

        # Emit event
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "user_cancelled" \
                         "User cancelled self-improvement for ${selected_pattern_id}" \
                         "confirmation" \
                         "2l-improve"
        fi

        exit 0
        ;;
esac

# Step 5: Self-Modification Execution (Builder-2 implementation)
echo ""
echo "=========================================="
echo "EXECUTING SELF-MODIFICATION"
echo "=========================================="
echo ""

# Safety Function 1: Orchestrator Exclusion Check
function verify_orchestrator_exclusion() {
    local vision_path="$1"

    # Check if vision mentions 2l-mvp.md
    if grep -q "2l-mvp\.md" "$vision_path"; then
        echo "❌ ERROR: Vision suggests modifying orchestrator (commands/2l-mvp.md)"
        echo "   This is blocked for meta-circular safety."
        echo ""
        echo "   Vision file: $vision_path"
        echo "   Affected components section likely includes 2l-mvp.md"
        echo ""
        echo "   This is a CRITICAL safety violation. Aborting."
        return 1
    fi

    return 0
}

# Safety Function 2: Git Status Check
function verify_git_clean() {
    echo "   Checking git status..."

    # Check if in git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "   ⚠️  WARNING: Not in a git repository"
        echo "      Self-modification will not be tracked in git"
        read -p "   Proceed anyway? (y/N): " proceed
        if [ "$proceed" != "y" ] && [ "$proceed" != "Y" ]; then
            return 1
        fi
        return 0
    fi

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo "   ⚠️  WARNING: Uncommitted changes detected"
        echo ""
        git status --short | head -10 | sed 's/^/      /'
        echo ""
        echo "      Recommendation: Commit or stash changes before self-modification"
        read -p "   Proceed anyway? (y/N): " proceed
        if [ "$proceed" != "y" ] && [ "$proceed" != "Y" ]; then
            return 1
        fi
    fi

    return 0
}

# Safety Function 3: Symlink Verification
function verify_symlinks() {
    echo "   Checking symlink integrity..."

    if [ -f "$HOME/.claude/lib/verify-symlinks.sh" ]; then
        if bash "$HOME/.claude/lib/verify-symlinks.sh" > /dev/null 2>&1; then
            return 0
        else
            # Verbose error output
            echo "   ❌ Symlink integrity check failed:"
            echo ""
            bash "$HOME/.claude/lib/verify-symlinks.sh" | sed 's/^/      /'
            echo ""
            return 1
        fi
    else
        echo "   ⚠️  WARNING: Symlink verification script not found"
        echo "      Skipping symlink check (not critical)"
        return 0
    fi
}

# Safety Function 4: Pre-Modification Safety Checkpoint
function create_safety_checkpoint() {
    local pattern_id="$1"

    echo "   Creating pre-modification safety checkpoint..."

    # Commit current state
    git add -A
    git commit -m "Pre-improvement checkpoint: ${pattern_id}" --allow-empty > /dev/null 2>&1 || {
        echo "      (No changes to commit - working directory clean)"
    }

    # Tag checkpoint
    local timestamp=$(date +%s)
    local checkpoint_tag="pre-${pattern_id}-${timestamp}"
    git tag "$checkpoint_tag"

    echo "   ✅ Safety checkpoint: $checkpoint_tag"
    echo "$checkpoint_tag"  # Return tag name
}

# Verify orchestrator exclusion FIRST (fail fast)
echo "   Step 5.1: Orchestrator Exclusion Check"
if ! verify_orchestrator_exclusion "$vision_path"; then
    exit 2  # Safety abort exit code
fi
echo "   ✅ Orchestrator exclusion verified"
echo ""

# Verify git clean (with override option)
echo "   Step 5.2: Git Status Check"
if ! verify_git_clean; then
    echo ""
    echo "❌ Aborted due to git status check"
    exit 1
fi
echo "   ✅ Git status OK"
echo ""

# Verify symlinks
echo "   Step 5.3: Symlink Verification"
if ! verify_symlinks; then
    echo ""
    echo "❌ Aborted due to symlink integrity check"
    echo "   Fix symlinks before proceeding with self-modification."
    exit 1
fi
echo "   ✅ Symlinks verified"
echo ""

# Create safety checkpoint
echo "   Step 5.4: Safety Checkpoint"
cd ~/Ahiya/2L || {
    echo "❌ ERROR: Cannot change to meditation space"
    exit 1
}

checkpoint_tag=$(create_safety_checkpoint "$selected_pattern_id")
echo ""

# Emit event: self-modification start
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "self_modification_start" \
                 "Invoking /2l-mvp for pattern ${selected_pattern_id}" \
                 "self_modification" \
                 "2l-improve"
fi

# Run /2l-mvp
echo "   Step 5.5: /2l-mvp Invocation"
echo "   🚀 Invoking /2l-mvp to implement improvement..."
echo "      Vision: $vision_path"
echo "      Checkpoint: $checkpoint_tag"
echo ""

mvp_log=".2L/${next_plan_id}/2l-improve-mvp-execution.log"
claude-ai "/2l-mvp" 2>&1 | tee "$mvp_log"
mvp_exit_code=${PIPESTATUS[0]}

echo ""

# Check exit code
if [ $mvp_exit_code -eq 0 ]; then
    echo "   ✅ Self-modification complete: /2l-mvp succeeded"
    echo ""

    # Emit event: self-modification complete
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "self_modification_complete" \
                     "Pattern ${selected_pattern_id} implemented successfully" \
                     "self_modification" \
                     "2l-improve"
    fi

    # Post-modification commit
    echo "   Step 5.6: Post-Modification Git Commit"
    git add -A
    commit_msg="Self-improvement: ${selected_pattern_id}

Pattern: ${selected_pattern_id}
Plan: ${next_plan_id}
Status: IDENTIFIED → IMPLEMENTED

🤖 Generated with /2l-improve
Co-Authored-By: Claude <noreply@anthropic.com>"

    git commit -m "$commit_msg"

    # Tag improvement
    git tag "2l-improve-${selected_pattern_id}"

    echo "   ✅ Changes committed and tagged: 2l-improve-${selected_pattern_id}"
    echo ""

    # Show modified files
    echo "   Files modified:"
    git diff --name-only "${checkpoint_tag}..HEAD" | sed 's/^/      - /'
    echo ""

    # Run smoke tests to validate 2L framework health
    echo "   Step 5.7: Post-Modification Smoke Tests"
    echo "   Running smoke tests to validate 2L framework health..."
    echo ""

    if [ -f "$HOME/.claude/lib/2l-smoke-tests.sh" ]; then
        bash "$HOME/.claude/lib/2l-smoke-tests.sh"

        if [ $? -eq 0 ]; then
            echo ""
            echo "   ✅ Smoke tests passed - 2L framework healthy"
            echo ""
        else
            echo ""
            echo "   ❌ CRITICAL: Smoke tests failed"
            echo "      Self-modification may have broken 2L framework"
            echo "      Rollback recommended: git reset --hard $checkpoint_tag"
            echo ""
            exit 2
        fi
    else
        echo "   ⚠️  WARNING: Smoke test script not found"
        echo "      Skipping validation (consider this risky)"
        echo ""
    fi

    # Update pattern status using lifecycle manager
    echo "   Step 5.8: Pattern Lifecycle Update"
    echo "   Updating pattern status to IMPLEMENTED..."

    python3 "$HOME/.claude/lib/2l-pattern-lifecycle.py" update \
        --pattern-id "$selected_pattern_id" \
        --status "IMPLEMENTED" \
        --plan-id "$next_plan_id" \
        --iteration "$global_iter" \
        --global-learnings ".2L/global-learnings.yaml"

    if [ $? -eq 0 ]; then
        echo "   ✅ Pattern status: IDENTIFIED → IMPLEMENTED"
        echo "   📊 Monitoring next 3 iterations for recurrence"
        echo ""

        # Emit pattern_implemented event
        if [ "$EVENT_LOGGING_ENABLED" = true ]; then
            log_2l_event "pattern_implemented" \
                         "Pattern ${selected_pattern_id} implemented in ${next_plan_id}" \
                         "self_modification" \
                         "2l-improve"
        fi
    else
        echo "   ⚠️  WARNING: Pattern status update failed"
        echo "      Pattern remains in previous state"
        echo ""
    fi

    # Success summary
    echo "=========================================="
    echo "SELF-IMPROVEMENT COMPLETE"
    echo "=========================================="
    echo ""
    echo "Pattern: $pattern_name ($selected_pattern_id)"
    echo "Status: IMPLEMENTED"
    echo "Plan: $next_plan_id"
    echo "Vision: $vision_path"
    echo "Git tag: 2l-improve-${selected_pattern_id}"
    echo ""
    echo "The improvement is now live via symlinks."
    echo "Monitor next 3 iterations to verify pattern no longer recurs."
    echo ""

else
    echo "   ❌ Self-modification FAILED: /2l-mvp exit code $mvp_exit_code"
    echo ""
    echo "   Rollback available:"
    echo "      git reset --hard $checkpoint_tag"
    echo ""
    echo "   Or investigate logs:"
    echo "      cat $mvp_log"
    echo ""

    # Emit event: self-modification failed
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "self_modification_failed" \
                     "Pattern ${selected_pattern_id} implementation failed (exit: $mvp_exit_code)" \
                     "self_modification" \
                     "2l-improve"
    fi

    # Optional: auto-rollback
    read -p "   Auto-rollback to checkpoint? (y/N): " rollback
    if [ "$rollback" = "y" ] || [ "$rollback" = "Y" ]; then
        git reset --hard "$checkpoint_tag"
        echo "   ✅ Rolled back to: $checkpoint_tag"
        echo "   Pattern status remains: IDENTIFIED"
    fi

    echo ""
    echo "❌ Self-improvement failed"
    echo "   Pattern ${selected_pattern_id} status remains: IDENTIFIED"
    exit 1
fi

# Emit command complete event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "command_complete" \
                 "/2l-improve completed successfully (pattern: ${selected_pattern_id})" \
                 "complete" \
                 "2l-improve"
fi
