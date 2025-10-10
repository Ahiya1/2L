# Technology Stack

## Core Technologies

### Bash Orchestration
**Decision:** Bash scripts for orchestration logic (existing pattern)

**Rationale:**
- All 2L command files already use bash with Python-style pseudocode comments
- Native file system operations (no dependencies)
- Direct integration with Claude's task spawning
- Lightweight and fast for orchestration tasks
- Standard Unix tools (grep, wc, ls) available everywhere

**Alternatives Considered:**
- Python orchestration: Adds dependency, slower startup, unnecessary for simple logic
- Pure Python: Breaks existing 2L pattern, requires rewriting all commands
- Node.js: Wrong ecosystem for system-level orchestration

**Implementation Notes:**
- Continue using Python-style pseudocode in comments for clarity
- Use bash for actual execution (variable assignment, conditionals, loops)
- Keep functions pure (no side effects in calculation logic)

---

## Configuration Management

### YAML + yq
**Decision:** YAML for config.yaml schema, yq for read/write operations

**Rationale:**
- Config.yaml already uses YAML for orchestration state
- `yq` already installed and working in 2L system
- Supports nested structures (plans → master_exploration → num_explorers)
- JSON-like path syntax for field access
- In-place editing with `-i` flag

**Example:**
```bash
# Read with default value
num_explorers=$(yq eval '.master_exploration.num_explorers // 2' config.yaml)

# Write field
yq eval ".master_exploration.num_explorers = $num_explorers" -i config.yaml
```

**Alternatives Considered:**
- JSON: Less human-readable, no existing 2L usage
- TOML: Not in 2L ecosystem
- Custom parser: Fragile, unnecessary complexity

**Schema Extension:**
```yaml
master_exploration:
  num_explorers: 3          # NEW: 2-4 based on complexity
  complexity_level: "MEDIUM" # NEW: SIMPLE | MEDIUM | COMPLEX
  status: COMPLETE
  reports:
    - master-explorer-1-report.md
    - master-explorer-2-report.md
    - master-explorer-3-report.md
```

---

## Complexity Analysis

### Regex-Based Feature Counting
**Decision:** grep + wc for counting features and integrations in vision.md

**Rationale:**
- Vision documents use consistent markdown structure (## headers, bullet points)
- Pattern matching sufficient for heuristic analysis (not ML)
- Zero dependencies (standard Unix tools)
- Fast execution (<100ms for typical vision)
- Conservative heuristic acceptable (bias toward fewer explorers)

**Patterns Used:**
```bash
# Count major features (## headers)
feature_count=$(grep -c "^## " vision.md || echo 0)

# Count integrations (keywords)
integration_count=$(grep -cE "API|integration|external|webhook|OAuth|third-party" vision.md || echo 0)
```

**Alternatives Considered:**
- NLP/LLM analysis: Overkill, slow, costly for simple counting
- Manual specification in vision frontmatter: Requires user input, error-prone
- YAML parsing of structured vision: Not all visions use YAML frontmatter

**Heuristic Algorithm:**
```bash
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
```

**Rationale for Thresholds:**
- <5 features: Simple project, core analysis sufficient (Explorers 1 & 2)
- 5-14 features + <3 integrations: Medium, add UX analysis (Explorer 3)
- 15+ features OR 3+ integrations: Complex, add scalability analysis (Explorer 4)
- Conservative bias: When in doubt, spawn fewer explorers

---

## Agent Definitions

### Markdown Prompt Templates
**Decision:** Continue using markdown with YAML frontmatter for agent definitions

**Rationale:**
- All existing agents use this pattern (2l-master-explorer.md, 2l-healer.md, etc.)
- Human-readable and easy to edit
- Direct integration with Claude's `/agent-use` command
- Version control friendly (git diffs work well)
- No compilation or build step

**New Sections for 2l-master-explorer.md:**
```markdown
## Explorer 3: User Experience & Integration Points

### Focus Areas
- Frontend/backend integration complexity
- User flow dependencies and critical paths
- External API integrations and third-party services
- Data flow patterns across system boundaries
- Form handling, navigation, state management

### Report Structure
# Master Exploration Report
## Explorer ID: master-explorer-3
## Focus Area: User Experience & Integration Points
...
```

**Agent Versioning:**
- No version numbers in agent files (latest is always used)
- Backward compatible prompts (new explorers don't break old behavior)
- Clear conditional spawning docs in agent file

---

## Resume Detection

### Config-Driven State Management
**Decision:** Store num_explorers in config.yaml, use for resume detection

**Rationale:**
- Config.yaml is already single source of truth for orchestration state
- Resume detection needs to know "what does complete mean?"
- Enables variable explorer counts without hardcoded checks
- Supports backward compatibility (default to 2 if field missing)

**Pattern:**
```bash
# Resume detection in 2l-continue.md
EXPECTED=$(yq eval '.master_exploration.num_explorers // 2' config.yaml)
ACTUAL=$(ls master-exploration/master-explorer-*-report.md 2>/dev/null | wc -l)

if [ "$ACTUAL" -lt "$EXPECTED" ]; then
    echo "Master exploration incomplete ($ACTUAL/$EXPECTED explorers)"
    for i in $(seq $((ACTUAL + 1)) $EXPECTED); do
        spawn_explorer_$i
    done
fi
```

**Backward Compatibility:**
- Use `yq` default value operator: `// 2`
- Old configs without num_explorers default to 2 (existing behavior)
- No migration script needed (graceful degradation)

---

## Report Synthesis

### Glob-Based Dynamic Report Reading
**Decision:** Use glob patterns to read all available explorer reports

**Rationale:**
- Master planner must handle 2-4 reports (not hardcoded to 2)
- Glob pattern `master-explorer-*-report.md` matches all reports
- Already used in integration phase for builder reports
- No hardcoded report-1, report-2 references

**Pattern:**
```bash
# Read all explorer reports dynamically
reports=""
for report in master-exploration/master-explorer-*-report.md; do
    reports="$reports\n\n=== $(basename $report) ===\n$(cat $report)"
done

# Synthesis prompt includes all reports
cat <<EOF
You are the Master Planner. Synthesize insights from the following explorer reports:

$reports

Create a comprehensive master plan...
EOF
```

**Report Consistency:**
- All explorers use same report structure template
- Explorer ID clearly marked in each report
- Focus area specified in header
- Planner adapts to variable report count

---

## Testing Infrastructure

### Bash Scripts + File Inspection
**Decision:** Test scenarios using bash scripts and file existence checks

**Rationale:**
- No testing framework needed (orchestration is file-based)
- Test by creating test visions, running commands, checking outputs
- Assertions via file counts, config field values, report content
- Fast execution (no test runner overhead)

**Test Approach:**
```bash
# Test 1: Simple vision
create_test_vision "simple" 3 features 0 integrations
run_2l_plan
assert_num_explorers_equals 2

# Test 2: Medium vision
create_test_vision "medium" 10 features 2 integrations
run_2l_plan
assert_num_explorers_equals 3

# Test 3: Complex vision
create_test_vision "complex" 20 features 5 integrations
run_2l_plan
assert_num_explorers_equals 4
```

**No MCP Dependencies:**
- This iteration doesn't require Playwright, Chrome DevTools, or Supabase
- All testing via file system operations
- Validation can use MCPs but not required for core functionality

---

## Environment Variables

No new environment variables required. All configuration in config.yaml and vision.md files.

**Existing Variables (unchanged):**
- `HOME`: User home directory (for ~/.claude/ paths)
- `PWD`: Current working directory (for .2L/ paths)

---

## Dependencies Overview

**Standard Unix Tools (already available):**
- `grep`: Pattern matching for feature counting
- `wc`: Line counting for heuristic analysis
- `ls`: File existence checks for resume detection
- `cat`: File reading for report synthesis
- `seq`: Loop iteration for explorer spawning

**Installed Tools (already in 2L system):**
- `yq`: YAML processor for config.yaml read/write

**Claude Integration:**
- Task tool: Agent spawning (existing integration)
- Read tool: File reading in agent execution
- Write tool: Report generation by agents

**No External Dependencies:**
- No npm packages
- No Python libraries
- No API calls
- No database connections

---

## Performance Targets

**Adaptive Spawning Decision:**
- Vision analysis: <100ms (grep + wc execution)
- Config write: <50ms (yq in-place edit)
- Total overhead: <200ms per orchestration run

**Explorer Spawning:**
- 2 explorers: ~10 minutes total (parallel execution)
- 3 explorers: ~10 minutes total (parallel execution)
- 4 explorers: ~10 minutes total (parallel execution)
- No serial dependency between explorers

**Resume Detection:**
- Config read: <50ms
- File count: <10ms
- Decision logic: <10ms
- Total resume overhead: <100ms

**Master Plan Synthesis:**
- Report reading (2-4 reports): <500ms
- Synthesis execution: ~5 minutes (Claude processing)
- No significant overhead from variable report count

---

## Security Considerations

**Config.yaml Integrity:**
- Single source of truth for orchestration state
- No external writes to config (only orchestrator)
- Resume detection trusts config values
- **Risk:** Manual config edits could break resume detection
- **Mitigation:** Validate config structure before reading, default to safe values

**Vision.md Analysis:**
- User-provided content analyzed via regex
- No code execution during analysis (only pattern matching)
- No injection vulnerabilities (counts are integers)
- **Risk:** Malicious vision with extreme content (10,000+ features)
- **Mitigation:** Cap num_explorers at 4 (hard limit)

**File System Operations:**
- All operations in .2L/ directory (isolated)
- No cross-project file access
- Resume detection uses relative paths
- **Risk:** Path traversal in report names
- **Mitigation:** Use glob patterns, no user-supplied paths

**Backward Compatibility:**
- Old configs without num_explorers default to 2 (safe)
- No breaking changes to existing plans
- Graceful degradation for missing fields
- **Risk:** Version mismatch during transition
- **Mitigation:** Default value operator (`// 2`) ensures safety

---

## Code Quality Standards

**Bash Scripting:**
- Use `set -e` for error propagation (exit on error)
- Use `|| echo 0` for safe grep/wc operations (no crash if no matches)
- Quote all variables (`"$variable"` not `$variable`)
- Use `2>/dev/null` to suppress expected stderr (file not found)

**Python-Style Pseudocode:**
- Use comments for clarity: `# Calculate complexity based on feature count`
- Indent logic blocks consistently
- Use descriptive variable names (`num_explorers` not `n`)

**YAML Formatting:**
- 2-space indentation
- Consistent field ordering
- Comments for non-obvious fields

**Agent Definitions:**
- Clear section headers (`## Explorer 3: ...`)
- Example reports in comments
- Focus area descriptions before analysis frameworks
- Negative examples to prevent overlap

**Error Handling:**
- Default to safe values (2 explorers if calculation fails)
- Log decisions for debugging (if event logger available)
- Graceful degradation (continue with fewer explorers rather than fail)

---

## Patterns to Follow

See `patterns.md` for detailed code examples. Key patterns:

1. **Adaptive Agent Spawning:** Variable agent count based on runtime analysis
2. **Config-Driven Resume Detection:** Read expected state from config, compare to actual
3. **Glob-Based Dynamic Report Reading:** Handle variable report counts
4. **Backward Compatible Config Reads:** Use default value operator
5. **Parallel Explorer Spawning:** All explorers spawn simultaneously (no dependencies)

---

## Version Compatibility

**2L System Version:**
- Target: 2L v1.3+ (includes config.yaml schema)
- Backward compatible with: 2L v1.0+ (defaults to 2 explorers)
- Forward compatible: Yes (new fields optional)

**Claude API:**
- No API version dependencies
- Uses standard task spawning (stable interface)

**Operating System:**
- Linux: Primary target (Ubuntu 20.04+)
- macOS: Compatible (bash 3.2+, modern yq)
- Windows: Not tested (WSL recommended)

---

## Future Enhancements (Out of Scope)

- Dashboard integration showing explorer progress
- Manual num_explorers override in vision frontmatter
- Advanced NLP for feature counting (LLM-based analysis)
- Quality validation for explorer reports (automated scoring)
- Event logging for adaptive spawning decisions
- Configurable thresholds per project (override heuristic)
