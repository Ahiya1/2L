# Code Patterns & Conventions

## File Structure

```
~/.claude/                          # 2L system installation
├── commands/
│   ├── 2l-mvp.md                  # Main orchestration (MODIFIED)
│   ├── 2l-plan.md                 # Plan-only orchestration (MODIFIED)
│   ├── 2l-continue.md             # Resume detection (MODIFIED)
│   └── 2l-task.md                 # Task orchestration (unchanged)
├── agents/
│   ├── 2l-master-explorer.md      # Explorer definitions (MODIFIED)
│   ├── 2l-healer.md               # Healer agent (MODIFIED)
│   ├── 2l-planner.md              # Planner agent (unchanged)
│   └── ...
└── lib/
    └── 2l-event-logger.sh         # Event logging (optional, iteration 1)

{project-root}/
└── .2L/
    ├── config.yaml                # Orchestration state (MODIFIED SCHEMA)
    └── plan-N/
        ├── master-exploration/
        │   ├── master-explorer-1-report.md
        │   ├── master-explorer-2-report.md
        │   ├── master-explorer-3-report.md  # NEW (conditional)
        │   └── master-explorer-4-report.md  # NEW (conditional)
        └── iteration-M/
            └── healing-N/
                └── exploration/    # EXISTING (verify)
                    ├── healing-explorer-1-report.md
                    └── healing-explorer-2-report.md
```

## Naming Conventions

- **Config fields:** snake_case (`num_explorers`, `complexity_level`)
- **Bash variables:** SCREAMING_SNAKE_CASE for constants (`EXPECTED`, `ACTUAL`), snake_case for local (`feature_count`)
- **File names:** kebab-case (`master-explorer-3-report.md`)
- **Agent IDs:** hyphenated (`master-explorer-3`, `healing-explorer-1`)
- **Functions:** snake_case (`calculate_num_explorers`, `spawn_explorer`)

---

## Adaptive Explorer Spawning Pattern

### When to use
Spawn variable number of master explorers (2-4) based on vision complexity analysis.

### Code Example (2l-mvp.md, Phase 1: Master Exploration)

```bash
# ==========================================
# PHASE 1: MASTER EXPLORATION
# ==========================================

echo "Starting Phase 1: Master Exploration"

# Read vision document
VISION_FILE=".2L/plan-${PLAN_ID}/vision.md"
if [ ! -f "$VISION_FILE" ]; then
    echo "ERROR: Vision file not found: $VISION_FILE"
    exit 1
fi

# Calculate complexity and determine number of explorers
feature_count=$(grep -c "^## " "$VISION_FILE" || echo 0)
integration_count=$(grep -cE "API|integration|external|webhook|OAuth|third-party" "$VISION_FILE" || echo 0)

# Decision logic
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

echo "Vision complexity: $complexity"
echo "  - Features: $feature_count"
echo "  - Integrations: $integration_count"
echo "  - Spawning: $num_explorers master explorers"

# Store in config for resume detection
yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.num_explorers = $num_explorers" -i .2L/config.yaml
yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.complexity_level = \"$complexity\"" -i .2L/config.yaml

# Create master exploration directory
mkdir -p ".2L/plan-${PLAN_ID}/master-exploration"

# Spawn explorers in parallel (1 to num_explorers)
echo "Spawning $num_explorers master explorers in parallel..."

for explorer_id in $(seq 1 $num_explorers); do
    REPORT_FILE=".2L/plan-${PLAN_ID}/master-exploration/master-explorer-${explorer_id}-report.md"

    if [ -f "$REPORT_FILE" ]; then
        echo "  Explorer $explorer_id already complete (report exists)"
        continue
    fi

    # Determine focus area based on explorer ID
    case $explorer_id in
        1)
            FOCUS_AREA="Architecture & Complexity Analysis"
            ;;
        2)
            FOCUS_AREA="Dependencies & Risk Assessment"
            ;;
        3)
            FOCUS_AREA="User Experience & Integration Points"
            ;;
        4)
            FOCUS_AREA="Scalability & Performance Considerations"
            ;;
    esac

    echo "  Spawning Explorer $explorer_id: $FOCUS_AREA"

    # Spawn explorer using task tool (parallel execution)
    # NOTE: This is pseudocode - actual implementation uses Claude's task spawning
    /agent-use 2l-master-explorer <<EOF
You are Master Explorer $explorer_id.

Your focus area: $FOCUS_AREA

Analyze the vision document at: $VISION_FILE

Create a comprehensive exploration report at: $REPORT_FILE

Follow the report structure template in your agent definition.
EOF

done

echo "Waiting for all $num_explorers explorers to complete..."
# (Orchestrator waits for all explorer tasks to finish)

echo "Phase 1 Complete: Master Exploration"
```

### Key Points

- Feature counting uses `grep -c` with fallback (`|| echo 0` prevents errors)
- Conservative thresholds (bias toward fewer explorers)
- Config stores both `num_explorers` and `complexity_level` for transparency
- Explorer spawning uses `seq` loop (flexible count)
- Focus area determined by `case` statement
- Parallel execution (all explorers spawn before waiting)

---

## Config-Driven Resume Detection Pattern

### When to use
Resume detection needs to know expected number of explorers from config.yaml.

### Code Example (2l-continue.md, Resume Master Exploration)

```bash
# ==========================================
# CHECK: Master Exploration Incomplete
# ==========================================

echo "Checking master exploration status..."

# Read expected number of explorers from config (default to 2 for backward compatibility)
EXPECTED=$(yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.num_explorers // 2" .2L/config.yaml)

# Count actual explorer reports
ACTUAL=$(ls .2L/plan-${PLAN_ID}/master-exploration/master-explorer-*-report.md 2>/dev/null | wc -l)

if [ "$ACTUAL" -lt "$EXPECTED" ]; then
    echo "Master exploration incomplete: $ACTUAL/$EXPECTED explorers complete"

    # Spawn missing explorers (from ACTUAL+1 to EXPECTED)
    for explorer_id in $(seq $((ACTUAL + 1)) $EXPECTED); do
        REPORT_FILE=".2L/plan-${PLAN_ID}/master-exploration/master-explorer-${explorer_id}-report.md"

        # Determine focus area
        case $explorer_id in
            1) FOCUS_AREA="Architecture & Complexity Analysis" ;;
            2) FOCUS_AREA="Dependencies & Risk Assessment" ;;
            3) FOCUS_AREA="User Experience & Integration Points" ;;
            4) FOCUS_AREA="Scalability & Performance Considerations" ;;
        esac

        echo "  Resuming Explorer $explorer_id: $FOCUS_AREA"

        # Spawn explorer
        /agent-use 2l-master-explorer <<EOF
You are Master Explorer $explorer_id.
Your focus area: $FOCUS_AREA
Vision: .2L/plan-${PLAN_ID}/vision.md
Report: $REPORT_FILE
EOF
    done

    echo "Waiting for explorers to complete..."
    # (Wait for completion)

else
    echo "Master exploration complete: $ACTUAL/$EXPECTED explorers"
fi
```

### Key Points

- Use `yq` default value operator: `// 2` for backward compatibility
- Count actual reports with `2>/dev/null` to suppress "file not found" errors
- Loop from `ACTUAL+1` to `EXPECTED` (only spawn missing explorers)
- Same focus area logic as initial spawning (consistency)

---

## Config.yaml Schema Pattern

### When to use
Store adaptive spawning decisions for resume detection and debugging.

### Schema Structure

```yaml
# .2L/config.yaml
plans:
  - plan_id: plan-1
    status: IN_PROGRESS

    # Master exploration phase
    master_exploration:
      num_explorers: 3              # NEW: 2-4 based on complexity
      complexity_level: "MEDIUM"    # NEW: SIMPLE | MEDIUM | COMPLEX
      status: COMPLETE
      reports:
        - master-explorer-1-report.md
        - master-explorer-2-report.md
        - master-explorer-3-report.md

    # Iterations (unchanged)
    iterations:
      - iteration_id: 1
        status: COMPLETE
        # ...
```

### Read Pattern

```bash
# Read with default value (backward compatible)
num_explorers=$(yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.num_explorers // 2" .2L/config.yaml)

# Read complexity level (optional field)
complexity=$(yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.complexity_level // \"UNKNOWN\"" .2L/config.yaml)
```

### Write Pattern

```bash
# Write num_explorers field
yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.num_explorers = $num_explorers" -i .2L/config.yaml

# Write complexity_level field
yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.complexity_level = \"$complexity\"" -i .2L/config.yaml

# Write status
yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.status = \"COMPLETE\"" -i .2L/config.yaml
```

### Key Points

- Use `.plans[]` array selector with `select()` filter
- Default value operator `// 2` ensures backward compatibility
- Write with `-i` flag for in-place editing
- Quote string values in YAML writes

---

## Master Plan Synthesis Pattern

### When to use
Master planner needs to read and synthesize variable number of explorer reports (2-4).

### Code Example (2l-mvp.md, Phase 2: Master Planning)

```bash
# ==========================================
# PHASE 2: MASTER PLANNING
# ==========================================

echo "Starting Phase 2: Master Planning"

# Read all explorer reports dynamically
EXPLORER_REPORTS=""
REPORT_COUNT=0

for report in .2L/plan-${PLAN_ID}/master-exploration/master-explorer-*-report.md; do
    if [ -f "$report" ]; then
        REPORT_COUNT=$((REPORT_COUNT + 1))
        REPORT_NAME=$(basename "$report")
        EXPLORER_ID=$(echo "$REPORT_NAME" | sed 's/master-explorer-\([0-9]\)-report.md/\1/')

        EXPLORER_REPORTS="$EXPLORER_REPORTS

========================================
EXPLORER $EXPLORER_ID REPORT: $REPORT_NAME
========================================

$(cat "$report")
"
    fi
done

echo "Found $REPORT_COUNT explorer reports to synthesize"

# Spawn master planner with all reports
/agent-use 2l-planner <<EOF
You are the Master Planner.

Read the vision document:
$(cat .2L/plan-${PLAN_ID}/vision.md)

---

Synthesize insights from the following $REPORT_COUNT explorer reports:

$EXPLORER_REPORTS

---

Create a comprehensive master plan with:
1. overview.md - Project vision and success criteria
2. tech-stack.md - Technology decisions with rationale
3. patterns.md - Code patterns and conventions
4. builder-tasks.md - Builder task breakdown

Output directory: .2L/plan-${PLAN_ID}/plan/
EOF

echo "Phase 2 Complete: Master Planning"
```

### Key Points

- Use glob pattern `master-explorer-*-report.md` to match all reports
- Count reports for logging/debugging
- Extract explorer ID from filename for clarity
- Concatenate all reports with clear separators
- Pass report count to planner for context

---

## Explorer Agent Definition Pattern

### When to use
Define focus areas for all 4 explorers with clear boundaries to prevent overlap.

### Code Example (agents/2l-master-explorer.md)

```markdown
# 2L Master Explorer Agent

## Your Role

You are a Master Explorer analyzing project requirements for strategic planning.

## Your Focus Area

You will be assigned ONE of the following focus areas:

### Explorer 1: Architecture & Complexity Analysis (ALWAYS SPAWNED)

**What to analyze:**
- Major system components and their relationships
- Technology stack recommendations
- Overall architectural patterns (monolith, microservices, serverless, etc.)
- Code organization and module structure
- Build and deployment pipeline requirements
- Overall complexity assessment (SIMPLE | MEDIUM | COMPLEX | VERY COMPLEX)

**What NOT to analyze (other explorers cover this):**
- Dependency chains between features (Explorer 2)
- User flows and UX patterns (Explorer 3)
- Performance optimization strategies (Explorer 4)

**Report focus:**
Provide architectural blueprint and complexity assessment.

---

### Explorer 2: Dependencies & Risk Assessment (ALWAYS SPAWNED)

**What to analyze:**
- Dependency chains between features
- Critical path analysis (which features block others)
- Third-party library/service dependencies
- Risk factors (technical debt, security, licensing)
- Timeline estimates and resource requirements
- Recommended iteration breakdown

**What NOT to analyze:**
- Component architecture details (Explorer 1)
- User interaction flows (Explorer 3)
- Infrastructure scaling (Explorer 4)

**Report focus:**
Provide dependency map and risk mitigation strategies.

---

### Explorer 3: User Experience & Integration Points (SPAWNED IF num_explorers >= 3)

**What to analyze:**
- Frontend/backend integration complexity
- User flow dependencies and critical paths
- External API integrations and third-party services
- Data flow patterns across system boundaries
- Form handling, navigation, state management
- Real-time features (WebSockets, polling, SSE)
- Error handling and edge case flows
- Accessibility and responsive design requirements

**What NOT to analyze:**
- Component architecture (Explorer 1 handles)
- Performance optimization (Explorer 4 handles)
- Build pipeline (Explorer 1 handles)

**Report focus:**
Provide UX integration strategy and data flow maps.

---

### Explorer 4: Scalability & Performance Considerations (SPAWNED IF num_explorers == 4)

**What to analyze:**
- Performance bottlenecks (database queries, API latency, rendering)
- Scalability concerns (concurrent users, data volume growth)
- Infrastructure requirements (database sizing, caching strategy, CDN)
- Deployment complexity (CI/CD, environments, rollback strategy)
- Monitoring and observability needs
- Resource optimization strategies (lazy loading, code splitting, image optimization)
- Load testing requirements and acceptance criteria

**What NOT to analyze:**
- Basic architecture (Explorer 1 handles)
- User flows (Explorer 3 handles)
- Feature dependencies (Explorer 2 handles)

**Report focus:**
Provide scalability roadmap and performance optimization strategy.

---

## Report Structure Template

\`\`\`markdown
# Master Exploration Report

## Explorer ID
master-explorer-{1|2|3|4}

## Focus Area
{Your assigned focus area from above}

## Vision Summary
{1-2 sentence summary of what the project is building}

---

## {Focus-Specific Analysis Section}

### {Sub-Category 1}
- Finding 1
- Finding 2

### {Sub-Category 2}
- Finding 1

{Continue with analysis specific to your focus area}

---

## Complexity Assessment
- Overall Complexity: {SIMPLE | MEDIUM | COMPLEX | VERY COMPLEX}
- Reasoning: {1-2 sentences explaining the assessment}

## Iteration Breakdown Recommendation
- Single iteration? Or multi-iteration?
- If multi: Recommended phases with rationale

## Critical Risks
1. {Risk}: {Impact} - {Mitigation}
2. {Risk}: {Impact} - {Mitigation}

## Resource Estimates
- Estimated effort: {X-Y hours range}
- Recommended team size: {N builders}

## Questions for Master Planner
- {Question 1}
- {Question 2}
\`\`\`

## Your Process

1. **Read vision document** - Understand project goals and requirements
2. **Focus on your assigned area** - Don't overlap with other explorers
3. **Analyze deeply** - Provide specific, actionable insights
4. **Assess complexity** - Be honest about challenges and risks
5. **Make recommendations** - Guide the master planner's decisions
6. **Write comprehensive report** - Follow the template above

## Quality Standards

- **Specific over generic:** "Use React Query for server state, Zustand for client state" NOT "consider state management"
- **Evidence-based:** "3 external APIs (Stripe, Plaid, SendGrid) require integration" NOT "many integrations"
- **Actionable:** "Split payment flow into separate builder (high complexity)" NOT "payments are complex"
- **Focused:** Stay in your lane - don't duplicate other explorers' work

## Examples

### Good Explorer 3 Finding (UX/Integration):
"User onboarding flow requires 5 sequential API calls (auth, profile, preferences, subscription, analytics). Recommend optimizing to 2 calls (auth+profile combined, preferences async) to reduce latency. Integration complexity: MEDIUM."

### Bad Explorer 3 Finding (too generic):
"The app has user flows that need APIs."

### Good Explorer 4 Finding (Scalability):
"Database query for transaction history is O(n) without pagination. For 10k+ transactions, expect 2-3 second load times. Recommend: Add pagination (50 per page), create index on user_id + created_at columns. Performance impact: HIGH."

### Bad Explorer 4 Finding (too vague):
"Database might be slow."
```

### Key Points

- Clear focus area boundaries with "What to analyze" and "What NOT to analyze"
- Explicit spawning conditions (always for 1-2, conditional for 3-4)
- Consistent report template across all explorers
- Quality standards with examples
- Negative examples to prevent common mistakes

---

## Healing Exploration Verification Pattern

### When to use
Verify existing healing exploration implementation and ensure healers use exploration reports.

### Code Example (commands/2l-mvp.md, Phase 6: Healing)

```bash
# ==========================================
# PHASE 6: HEALING (if validation failed)
# ==========================================

# EXISTING IMPLEMENTATION (Lines 878-972)
# This phase is already implemented in Iteration 1
# Verification task: Ensure it works correctly

# Phase 6.1: Healing Exploration (ALREADY EXISTS)
echo "Phase 6.1: Healing Exploration"

HEALING_DIR=".2L/plan-${PLAN_ID}/iteration-${ITERATION_ID}/healing-${HEALING_ATTEMPT}"
EXPLORATION_DIR="${HEALING_DIR}/exploration"
mkdir -p "$EXPLORATION_DIR"

# Spawn healing-explorer-1 (always)
echo "Spawning Healing Explorer 1: Root Cause Analysis"
/agent-use 2l-healer-explorer <<EOF
You are Healing Explorer 1.

Task: Analyze validation failures and identify root causes.

Validation report: ${HEALING_DIR}/../validation-report.md

Create report: ${EXPLORATION_DIR}/healing-explorer-1-report.md

Include:
- Failure categorization
- Root cause analysis (not symptoms)
- Affected files
- Recommended fix strategies
EOF

# Count failure categories (for conditional explorer 2)
num_categories=$(grep -c "^### Category" "${HEALING_DIR}/../validation-report.md" || echo 1)

if [ "$num_categories" -gt 3 ]; then
    echo "Spawning Healing Explorer 2: Dependency Analysis ($num_categories categories)"
    /agent-use 2l-healer-explorer <<EOF
You are Healing Explorer 2.

Task: Analyze dependencies and conflicts between failure categories.

Validation report: ${HEALING_DIR}/../validation-report.md
Explorer 1 report: ${EXPLORATION_DIR}/healing-explorer-1-report.md

Create report: ${EXPLORATION_DIR}/healing-explorer-2-report.md

Include:
- Inter-category dependencies
- Conflict risks
- Recommended healing order
EOF
fi

# Phase 6.2: Healing (EXISTING, with exploration integration)
echo "Phase 6.2: Healing (using exploration insights)"

# Extract categories and spawn healers
for category in $(extract_categories_from_validation); do
    echo "Spawning Healer for category: $category"

    /agent-use 2l-healer <<EOF
You are a Healer fixing category: $category

**Inputs:**
1. Validation report: ${HEALING_DIR}/../validation-report.md
2. Exploration report 1: ${EXPLORATION_DIR}/healing-explorer-1-report.md
3. Exploration report 2 (if exists): ${EXPLORATION_DIR}/healing-explorer-2-report.md

**Process:**
1. Read validation failures in your category
2. Read exploration root cause analysis
3. Apply fix strategies recommended by exploration
4. Verify fixes don't introduce new issues

**Output:**
Report: ${HEALING_DIR}/healer-${category}-report.md
EOF
done

# Phase 6.3: Re-validation (EXISTING)
echo "Phase 6.3: Re-validation"
# (Run validation again)
```

### Verification Checklist

- [ ] Healing exploration directory created (`healing-N/exploration/`)
- [ ] Explorer 1 always spawns (root cause analysis)
- [ ] Explorer 2 spawns if >3 failure categories
- [ ] Healers receive exploration report paths in prompt
- [ ] Healers explicitly instructed to read exploration reports
- [ ] Exploration reports provide actionable fix strategies

---

## Healer Agent Updates Pattern

### When to use
Update healer agent to emphasize exploration report usage.

### Code Example (agents/2l-healer.md)

```markdown
# 2L Healer Agent

## Your Inputs

You receive THREE inputs for informed healing:

1. **Validation Report** - What failed and why
2. **Healing Exploration Report 1** - Root cause analysis and fix strategies
3. **Healing Exploration Report 2** (if exists) - Dependency analysis

**IMPORTANT:** Read ALL exploration reports before starting fixes. They provide:
- Root causes (not just symptoms)
- Recommended fix strategies
- File locations to modify
- Dependencies to consider

## Your Process

1. **Read validation failures** - Understand what's broken in your category
2. **Read exploration analysis** - Understand WHY it's broken and HOW to fix it
3. **Apply fix strategies** - Use exploration recommendations
4. **Verify fixes** - Ensure no new issues introduced
5. **Document work** - Write comprehensive report

## Example: Exploration-Informed Healing

**Bad Healing (symptom fix):**
- Validation: "TypeScript error: Property 'id' does not exist on type 'User'"
- Fix: Add `id` to User type
- Problem: Doesn't fix root cause (missing database column)

**Good Healing (exploration-informed):**
- Validation: Same error
- Exploration finding: "Root cause: Database schema missing user.id column. Migration never ran."
- Fix: Create migration, add column, update type, run migration
- Result: Complete fix addressing root cause

## Quality Standards

- Always reference exploration reports in your healer report
- Quote specific exploration recommendations you're implementing
- If exploration suggests strategy A but you use strategy B, explain why
- Document which exploration insights were most helpful
```

### Key Points

- Emphasize THREE inputs (not just validation report)
- Provide example of exploration-informed vs symptom-only healing
- Require healers to reference exploration in their reports
- Quality standard: Quote exploration recommendations

---

## Error Handling Patterns

### Safe Grep Pattern

```bash
# Don't use: grep "pattern" file (exits with error if no matches)
# Use: grep "pattern" file || echo 0

feature_count=$(grep -c "^## " vision.md || echo 0)
```

### File Existence Check

```bash
# Check before reading
if [ -f "$FILE" ]; then
    content=$(cat "$FILE")
else
    echo "WARNING: File not found: $FILE"
    content=""
fi
```

### Config Read with Default

```bash
# Use yq default value operator
num_explorers=$(yq eval '.master_exploration.num_explorers // 2' config.yaml)
```

### Null Suppression

```bash
# Suppress expected errors
ACTUAL=$(ls master-exploration/*.md 2>/dev/null | wc -l)
```

---

## Testing Patterns

### Test Vision Creation

```bash
# Create test vision with known complexity
create_test_vision() {
    local name=$1
    local num_features=$2
    local num_integrations=$3

    cat > ".2L/plan-test/vision-${name}.md" <<EOF
# Test Vision: $name

$(for i in $(seq 1 $num_features); do
    echo "## Feature $i"
    echo "Description of feature $i"
    echo ""
done)

$(for i in $(seq 1 $num_integrations); do
    echo "## External Integration $i"
    echo "API integration with third-party service"
    echo ""
done)
EOF
}
```

### Test Assertions

```bash
# Assert num_explorers equals expected
assert_num_explorers_equals() {
    local expected=$1
    local actual=$(yq eval '.master_exploration.num_explorers' .2L/config.yaml)

    if [ "$actual" -eq "$expected" ]; then
        echo "✓ PASS: num_explorers = $expected"
    else
        echo "✗ FAIL: Expected $expected, got $actual"
        exit 1
    fi
}

# Assert file exists
assert_file_exists() {
    local file=$1
    if [ -f "$file" ]; then
        echo "✓ PASS: File exists: $file"
    else
        echo "✗ FAIL: File missing: $file"
        exit 1
    fi
}
```

---

## Import/Include Convention

No imports needed (all bash scripts sourced directly).

For event logging (optional):
```bash
# Source event logger if available
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
    source "$HOME/.claude/lib/2l-event-logger.sh"
    log_2l_event "complexity_decision" "Spawning $num_explorers explorers (complexity: $complexity)"
else
    # Gracefully skip logging if not available
    echo "Event logging not available (iteration 1 not deployed)"
fi
```

---

## Code Quality Checklist

Before committing code, verify:

- [ ] All variables quoted (`"$var"` not `$var`)
- [ ] Grep uses `|| echo 0` fallback
- [ ] File reads check existence first
- [ ] Config reads use `// default` operator
- [ ] Error messages go to stderr (`>&2`)
- [ ] Success messages go to stdout
- [ ] Consistent indentation (4 spaces)
- [ ] Comments explain WHY not WHAT
- [ ] No hardcoded paths (use variables)
- [ ] Bash scripts start with `#!/bin/bash`
- [ ] Pseudocode marked with `# (pseudocode)`
