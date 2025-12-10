# Master Exploration Report

## Explorer ID
master-explorer-2

## Focus Area
Dependencies & Risk Assessment

## Vision Summary
Embed production concerns (testing, CI/CD, security) into 2L workflow by default, with `--mode=mvp` flag for quick prototypes.

---

## Current Command Structure Analysis

### How 2l-mvp.md Currently Handles Arguments

The command uses a **three-level access system** based on argument presence:

```python
if arguments_provided:
    # LEVEL 1: Full Autonomy - inline requirements string
    inline_requirements = arguments
    # Creates new plan, auto-generates vision
else:
    # LEVEL 2 or 3: Uses existing vision/plan
    # Detects state from config.yaml
```

**Key observations:**

1. **Argument detection is simple** - Checks if arguments exist, treats entire string as requirements
2. **No flag parsing exists** - Currently no `--flag` handling mechanism
3. **Mode is determined by plan state** - Not by user flags

### Agent Spawning Pattern

Agents receive context via `spawn_task()` prompts:

```python
spawn_task(
    type="2l-builder",
    prompt=f"Build assigned feature.

Iteration: {global_iter}
Your ID: Builder-{builder_id}
Plan: {plan_dir}
..."
)
```

**Key observation:** Mode information would need to be injected into these prompts.

### Config.yaml Structure

```yaml
current_plan: plan-12
current_phase: master_exploration
plans:
  - plan_id: plan-12
    status: VISIONED
    # No 'mode' field exists currently
```

---

## Flag Implementation Analysis

### Recommended Approach: Bash Argument Parsing

Following the pattern from `/2l-improve`, add flag parsing to `2l-mvp.md`:

```bash
# Parse arguments (NEW section)
mode="production"  # Default to production
inline_requirements=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --mode=production|--mode=mvp)
            mode="${1#--mode=}"
            shift
            ;;
        --mode)
            mode="$2"
            shift 2
            ;;
        *)
            # Non-flag argument is inline requirements
            if [ -z "$inline_requirements" ]; then
                inline_requirements="$1"
            else
                inline_requirements="$inline_requirements $1"
            fi
            shift
            ;;
    esac
done
```

### Mode Propagation Chain

Mode must flow through:

```
2l-mvp.md (parses flag)
    |
    v
config.yaml (stores mode per-plan)
    |
    v
spawn_task() prompts (injects mode)
    |
    v
Agent markdown files (mode-aware behavior)
```

### Implementation Points

| Component | Change Required | Complexity |
|-----------|-----------------|------------|
| `2l-mvp.md` | Add flag parsing, store in config | LOW |
| `config.yaml` | Add `mode` field per plan | LOW |
| `spawn_task()` | Inject mode into prompts | MEDIUM |
| `2l-builder.md` | Add production mode sections | MEDIUM |
| `2l-validator.md` | Add coverage/security gates | HIGH |
| `2l-planner.md` | Add production patterns template | MEDIUM |
| `2l-healer.md` | Add test-fixing category | LOW |

---

## Risk Assessment

### HIGH RISKS

#### 1. Backward Compatibility Break
**Risk:** Existing projects/workflows expect current behavior

**Impact:**
- Running `/2l-mvp "build something"` would now default to production mode
- Production mode requires 70% test coverage (may fail validation on existing patterns)
- Users accustomed to quick builds might be surprised by stricter validation

**Mitigation:**
- Clear documentation of mode change
- First run with new code could use `--mode=mvp` for transition
- Make coverage threshold configurable in vision.md (open question from vision)

**Recommendation:** Accept this behavioral change - it's the stated goal. Document prominently.

#### 2. Validator Complexity Explosion
**Risk:** Adding coverage gate + security checklist + CI/CD verification to validator significantly increases its scope

**Impact:**
- Validator prompt becomes very long (context limits)
- More failure modes to handle
- Healing phase must handle new failure categories

**Mitigation:**
- Keep validator prompt modular with clear sections
- Each new check has explicit SKIP logic for MVP mode
- Document new failure categories for healers

**Recommendation:** Monitor validator prompt length. Consider extracting security validator to separate agent in future (vision's "Could-Have" section).

### MEDIUM RISKS

#### 3. Test Generation Quality
**Risk:** Builders may generate low-quality tests that pass coverage threshold but provide little value

**Impact:**
- 70% coverage achieved with meaningless tests
- False confidence in code quality
- Tests that don't catch real bugs

**Mitigation:**
- patterns.md includes testing patterns with examples
- Validator checks test quality (not just quantity) - look for happy path + error cases
- Builder prompt emphasizes test intent, not just coverage

**Recommendation:** Include test quality heuristics in validator checklist.

#### 4. CI/CD Generation Conflicts
**Risk:** Generated `.github/workflows/ci.yml` may conflict with existing CI configuration

**Impact:**
- Overwrite existing workflows
- Break existing CI pipelines
- Duplicate workflow runs

**Mitigation:**
- Builder checks `if not exists` before generating
- Validator verifies workflow is valid YAML
- Allow user to opt-out of CI generation via vision.md

**Recommendation:** Add explicit check in builder: "IF .github/workflows/ exists AND has ci.yml, SKIP generation. Note in report."

#### 5. Security Scan False Positives
**Risk:** Static analysis may flag legitimate code as security issues

**Impact:**
- Unnecessary FAIL status
- Developer frustration
- Healing phase wastes time on non-issues

**Mitigation:**
- Security checklist focuses on clear patterns (hardcoded secrets, raw SQL interpolation)
- Allow `// 2l-security-ignore: reason` comments for legitimate exceptions
- Start conservative, expand checklist over time

**Recommendation:** Start with HIGH-confidence security checks only. Expand in future iterations.

### LOW RISKS

#### 6. Mode Persistence Across Sessions
**Risk:** Mode might not persist correctly if context compacts mid-orchestration

**Impact:**
- Resume might lose mode information
- Inconsistent behavior across iterations

**Mitigation:**
- Store mode in config.yaml (already persistent)
- Mode read from config on resume, not from memory

**Recommendation:** Already handled by config.yaml architecture.

#### 7. Healer Test-Fixing Scope Creep
**Risk:** Healer might modify tests to pass rather than fix underlying code

**Impact:**
- Bad tests covering bad code
- Technical debt accumulation

**Mitigation:**
- Healer prompt explicitly states: "prefer modifying code to make tests pass"
- Healing exploration identifies root cause (code bug vs test bug)

**Recommendation:** Add explicit guidance: "If test is wrong, fix test. If code is wrong, fix code. Document which."

---

## Dependencies Between Features

### Dependency Graph

```
1. Mode Flag System (FOUNDATION)
   |
   +---> Must complete first, all other features depend on it
   |
   |
2. Planner: Production Patterns ----+
   |                                 |
   v                                 v
3. Builder: Test Generation    3. Builder: CI/CD Generation
   |                                 |
   +---------------+-----------------+
                   |
                   v
4. Validator: Coverage Gate + Security Checklist + CI/CD Verification
                   |
                   v
5. Healer: Test Fixing (depends on validator identifying test failures)
```

### Feature Dependencies Detailed

| Feature | Depends On | Blocks |
|---------|------------|--------|
| Mode Flag System | Nothing | Everything else |
| Planner: Production Patterns | Mode Flag | Builder (test/security patterns) |
| Builder: Test Generation | Mode Flag, Planner | Validator (coverage) |
| Builder: CI/CD Generation | Mode Flag | Validator (CI verification) |
| Validator: Coverage Gate | Builder (tests exist) | Healer (test failures) |
| Validator: Security Checklist | Nothing | Healer (security issues) |
| Healer: Test Fixing | Validator (identifies failures) | Nothing |

### Critical Path

```
Mode Flag System -> Planner Patterns -> Builder Changes -> Validator Changes -> Healer Changes
```

**Estimated Critical Path Duration:** 4-6 hours (single iteration, parallel builders)

---

## Recommendations for Safe Implementation

### 1. Mode Flag Implementation

**Recommendation:** Use established pattern from `/2l-improve`

```bash
# Default to production
mode="production"

# Parse --mode flag
while [[ $# -gt 0 ]]; do
    case $1 in
        --mode=*)
            mode="${1#--mode=}"
            shift
            ;;
        --mode)
            mode="$2"
            shift 2
            ;;
        *)
            inline_requirements="$inline_requirements $1"
            shift
            ;;
    esac
done

# Validate mode
if [ "$mode" != "production" ] && [ "$mode" != "mvp" ]; then
    echo "ERROR: Invalid mode '$mode'. Use 'production' or 'mvp'"
    exit 1
fi
```

### 2. Config Storage

**Recommendation:** Store mode per-plan in config.yaml

```yaml
plans:
  - plan_id: plan-12
    mode: production  # NEW FIELD
    status: VISIONED
```

### 3. Agent Prompt Injection

**Recommendation:** Add mode context to ALL agent spawn prompts

```python
spawn_task(
    type="2l-builder",
    prompt=f"""Build assigned feature.

Mode: {mode}  # NEW
Iteration: {global_iter}

When mode=production:
- Generate tests (70%+ coverage target)
- Generate CI/CD if not exists
- Follow security patterns

When mode=mvp:
- Tests optional
- CI/CD skipped
- Basic security only
"""
)
```

### 4. Staged Rollout

**Recommendation:** Implement in phases within single iteration

**Builder 1:** Mode flag system + config changes
**Builder 2:** 2l-builder.md updates (tests, CI/CD)
**Builder 3:** 2l-validator.md updates (coverage, security)
**Builder 4:** 2l-planner.md + 2l-healer.md updates

### 5. Backward Compatibility Guardrails

**Recommendation:** Add clear messaging when production mode is active

```bash
if [ "$mode" = "production" ]; then
    echo ""
    echo "MODE: PRODUCTION (default)"
    echo "  - Test coverage required: 70%+"
    echo "  - CI/CD pipeline generated"
    echo "  - Security scan enabled"
    echo ""
    echo "For quick prototyping, use: /2l-mvp --mode=mvp \"...\""
    echo ""
fi
```

### 6. Coverage Threshold Configuration

**Recommendation:** Make coverage configurable per-project

In `vision.md`:
```markdown
## Technical Requirements

**Coverage threshold:** 70%  # Can be adjusted per-project
**Coverage threshold (optional):** 50%  # For specific modules
```

### 7. Security Checklist Scope

**Recommendation:** Start conservative with HIGH-confidence checks

**Include in v1:**
- Hardcoded secrets (grep for `API_KEY=`, `PASSWORD=`, etc. in code)
- `dangerouslySetInnerHTML` without sanitization
- String interpolation in SQL queries

**Defer to v2:**
- Full npm audit integration
- CSRF protection verification
- Rate limiting checks

---

## Iteration Breakdown Recommendation

### Recommendation: SINGLE ITERATION

**Rationale:**
1. All changes are to markdown prompt files (no complex code)
2. Changes are isolated to specific files
3. Features are independent enough for parallel builders
4. Total scope is manageable (7 must-have features)

### Suggested Builder Allocation

| Builder | Scope | Files | Complexity |
|---------|-------|-------|------------|
| Builder-1 | Mode flag system + 2l-mvp.md | `commands/2l-mvp.md` | MEDIUM |
| Builder-2 | 2l-builder.md (tests, CI/CD, security) | `agents/2l-builder.md` | MEDIUM |
| Builder-3 | 2l-validator.md (coverage, security, CI) | `agents/2l-validator.md` | HIGH |
| Builder-4 | 2l-planner.md + 2l-healer.md | `agents/2l-planner.md`, `agents/2l-healer.md` | MEDIUM |

### Estimated Duration

- Building: 3-4 hours (parallel)
- Integration: 30 minutes
- Validation: 30 minutes
- Healing (if needed): 1 hour
- **Total: 4-6 hours**

---

## Notes & Observations

### Open Questions from Vision (Risk-Aware Answers)

1. **Should coverage threshold be configurable per-project?**
   - **Recommendation:** YES. Store in vision.md, planner extracts and propagates.
   - **Default:** 70%
   - **Risk if not configurable:** Generated code coverage varies, may frustrate users.

2. **Should security scan severity be configurable?**
   - **Recommendation:** Start with fixed HIGH-severity only. Configurability adds complexity.
   - **Risk:** Low - starting conservative means fewer false positives.

3. **How to handle low-test areas (generated code)?**
   - **Recommendation:** Allow `// 2l-coverage-ignore` comments in generated files.
   - **Risk:** Could be abused. Validator should flag excessive use.

### Integration Considerations

- **Shared patterns:** patterns.md will include testing and security patterns that all builders reference
- **Type consistency:** No new types needed - mode is simple string
- **Import consistency:** No cross-file imports added

### Potential Future Enhancements

- Specialized security validator agent (if security checklist grows too large)
- E2E test generation (currently out of scope per vision)
- Performance testing integration
- Lighthouse CI integration for frontend projects

---

*Exploration completed: 2025-12-10*
*This report informs master planning decisions*
