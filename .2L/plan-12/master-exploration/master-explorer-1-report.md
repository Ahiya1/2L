# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Current Agent Analysis

## Vision Summary
Add production hardening capabilities to 2L framework so that outputs include tests (70%+ coverage), CI/CD pipelines, and security scanning by default, with a `--mode=mvp` flag to opt-out for quick prototypes.

---

## Current Agent Architecture

### Overview of 2L Agent System

The 2L framework operates through a pipeline of specialized agents, each with distinct responsibilities:

```
Orchestrator (2l-mvp.md)
    |
    v
Master Explorers (2l-master-explorer.md) --> Master Plan
    |
    v
[Per Iteration]
    Explorers (2l-explorer.md)
        |
        v
    Planner (2l-planner.md)
        |
        v
    Builders (2l-builder.md)
        |
        v
    Integrators (2l-integrator.md, 2l-iplanner.md, 2l-ivalidator.md)
        |
        v
    Validator (2l-validator.md)
        |
        v
    [If FAIL] Healers (2l-healer.md) --> Re-validate
```

### Current Agent Capabilities

#### 1. 2l-builder.md (537 lines)

**Current Responsibilities:**
- Implements features according to plan
- Can COMPLETE or SPLIT if too complex
- Follows patterns.md for code conventions
- Creates implementation files, type definitions, tests
- Supports MCP servers (Playwright, Chrome DevTools, Supabase)

**Current Testing Mentions:**
- Lines 219-225: "Write tests" section exists but is optional
- Lines 495-499: Testing requirements mention >80% coverage target
- No mandatory test generation
- No CI/CD generation capability

**Key Code Patterns Section (Lines 208-234):**
```markdown
### Implementation
1. Follow patterns.md religiously
2. Create all required files
3. Write tests (optional mention)
4. Handle dependencies
5. Verify your work
```

**Report Template (Lines 265-335):**
- Includes "Tests" section in Files Created
- Includes "Tests Summary" with coverage
- No CI/CD or security sections

---

#### 2. 2l-validator.md (1303 lines)

**Current Responsibilities:**
- 5-tier status system: PASS | UNCERTAIN | PARTIAL | INCOMPLETE | FAIL
- Runs TypeScript compilation, linting, formatting, unit tests, integration tests, build
- 80% confidence rule for PASS
- Runtime verification hard cap at 75% if no E2E
- Learning capture on failures
- Quality assessment (code, architecture, test quality)

**Current Testing Approach:**
- Lines 481-485: Unit tests check runs `npm run test`
- Pass criteria: "All tests passing, Coverage >80%"
- No coverage enforcement mechanism (just reports)
- No security scanning
- No CI/CD verification

**Validation Steps (Lines 449-518):**
1. TypeScript Compilation
2. Linting
3. Code Formatting
4. Unit Tests
5. Integration Tests
6. Build Process
7. Development Server
8. Success Criteria Check
9. MCP-Based Validation

**Missing from Current Validator:**
- Coverage threshold enforcement
- Security vulnerability scanning
- CI/CD pipeline verification
- Mode-aware validation logic

---

#### 3. 2l-planner.md (529 lines)

**Current Responsibilities:**
- Creates 4 files: overview.md, tech-stack.md, patterns.md, builder-tasks.md
- Synthesizes exploration findings into actionable plan
- Defines builder task breakdown with complexity estimates

**Current patterns.md Template (Lines 233-356):**
```markdown
# Code Patterns & Conventions
## File Structure
## Naming Conventions
## API Patterns
## Database Patterns
## Frontend Patterns
## Testing Patterns (basic mention)
## Error Handling
## Integration Patterns
## Utility Patterns
## Import Order Convention
## Code Quality Standards
## Performance Patterns
## Security Patterns (basic mention)
```

**Missing from Current Planner:**
- Detailed Testing Patterns section
- Detailed Security Patterns section
- CI/CD Patterns section
- Production-specific guidance

---

#### 4. 2l-healer.md (716 lines)

**Current Responsibilities:**
- Fixes specific categories of issues
- References exploration reports for root cause analysis
- Categories: TypeScript, Test failures, Linting, Build errors, Logic bugs, Integration problems

**Current Test Failure Handling (Lines 576-589):**
```markdown
## Test Failures
Common causes:
- Logic bugs
- Incorrect expectations
- Async timing issues
- Missing test setup
- Mock data problems
```

**Missing from Current Healer:**
- Explicit "Test Failures" as a healing category with detailed guidance
- Security issue healing category
- Coverage improvement strategies

---

#### 5. 2l-mvp.md (1943 lines) - Orchestrator

**Current Responsibilities:**
- Three access levels: Full Autonomy, Vision Control, Full Control
- Mode detection and initialization
- Master exploration with adaptive spawning (2-4 explorers)
- Iteration execution loop
- Event logging for dashboard
- Auto-commit on successful iterations

**Current Mode Handling:**
- `MODE = 'MASTER'` or `MODE = 'ITERATION_EXECUTOR'`
- No production/mvp mode distinction
- No flag handling for `--mode=production|mvp`

**Current Agent Spawning (Example Builder Spawn, Lines 1014-1029):**
```python
spawn_task(
    type="2l-builder",
    prompt=f"Build assigned feature.
    Iteration: {global_iter}
    Your ID: Builder-{builder_id}
    Plan: {plan_dir}
    Output: {building_dir}/builder-{builder_id}-report.md
    ..."
)
```

**No mode propagation to agents currently.**

---

## Integration Points for Production Features

### 1. Mode Flag System Integration Points

#### Entry Point: 2l-mvp.md

**Current (Lines 264-383):**
```python
if arguments_provided:
    LEVEL = 1
    inline_requirements = arguments
    # ...
```

**Required Changes:**
- Parse `--mode=production|mvp` from arguments (default: production)
- Store mode in config.yaml
- Pass mode to all agent spawns

**Integration Location:** Lines 264-383 (Mode Detection section)

#### Propagation Points:

1. **Master Explorer Spawns** (Lines 567-583)
   - Add `MODE` to prompt context

2. **Explorer Spawns** (Lines 843-899)
   - Add `MODE` to prompt context

3. **Planner Spawn** (Lines 948-964)
   - Add `MODE` to prompt context

4. **Builder Spawns** (Lines 1004-1029)
   - Add `MODE` to prompt context
   - Builder behavior changes based on mode

5. **Validator Spawn** (Lines 1209-1231)
   - Add `MODE` to prompt context
   - Critical: Validator enforces or skips gates

6. **Healer Spawns** (Lines 1391-1416)
   - Add `MODE` to prompt context

### 2. Test Generation Integration Points

#### Primary: 2l-builder.md

**Current Testing Section (Lines 219-227):**
```markdown
3. **Write tests**
   - Unit tests for utilities
   - Integration tests for features
   - Aim for >80% coverage
   - Tests should pass!
```

**Required Changes:**
- Make tests mandatory in production mode
- Add test file requirements to report template
- Add CI/CD generation logic

**New Section Needed After Line 227:**
```markdown
## Production Mode Requirements (default)
When mode=production:
1. Every feature MUST include tests
2. Generate CI/CD if not exists
3. Follow security patterns
```

#### Report Template Extension (Lines 265-335):
- Add "CI/CD Generated" section
- Add "Security Patterns Followed" section

### 3. CI/CD Generation Integration Points

#### Primary: 2l-builder.md

**New Capability Needed:**
- Check for `.github/workflows/ci.yml`
- If missing, generate standard workflow
- Include in builder report

**File Location Check Pattern:**
```typescript
if (!fileExists('.github/workflows/ci.yml') && mode === 'production') {
    generateCIWorkflow();
}
```

**Standard CI Template:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - type-check
      - lint
      - test
      - build
```

### 4. Coverage Enforcement Integration Points

#### Primary: 2l-validator.md

**Current Test Validation (Lines 475-485):**
```markdown
### 4. Unit Tests
npm run test
Pass criteria:
- All tests passing
- Coverage >80%
```

**Required Changes:**
- Run `vitest --coverage` or equivalent
- Parse coverage percentage
- Enforce 70% threshold in production mode
- FAIL if below threshold
- Skip check in mvp mode

**Integration Location:** After Line 485, add:
```markdown
### Test Coverage Gate (Production Mode Only)
vitest run --coverage
FAIL if coverage < 70%
PASS if coverage >= 70%
```

### 5. Security Scanning Integration Points

#### Primary: 2l-validator.md

**New Section Needed After Step 9 (Line 590):**
```markdown
### 10. Security Scan (Production Mode Only)
- [ ] No hardcoded secrets (grep for API_KEY, SECRET, PASSWORD)
- [ ] No XSS vulnerabilities (dangerouslySetInnerHTML audit)
- [ ] No SQL injection (raw query string interpolation)
- [ ] npm audit --audit-level=high passes
- [ ] Input validation present at API boundaries
- [ ] Auth middleware on protected routes
```

**Implementation Approach:**
- Static analysis via grep/regex patterns
- npm audit for dependencies
- No external security tools required

### 6. Patterns Enhancement Integration Points

#### Primary: 2l-planner.md

**Current patterns.md Template (Lines 233-356):**
- Has basic Testing Patterns mention
- Has basic Security Patterns mention
- Missing CI/CD Patterns entirely

**Required Enhancements:**
- Expand Testing Patterns with project-specific guidance
- Expand Security Patterns with input validation examples
- Add CI/CD Patterns section

**Integration Location:** After Line 356, enhance template structure.

### 7. Healer Test Fixing Integration Points

#### Primary: 2l-healer.md

**Current Categories (Lines 207-220):**
```markdown
- TypeScript errors
- Test failures (basic)
- Linting issues
- Build errors
- Logic bugs
- Integration problems
```

**Required Enhancements:**
- Expand "Test failures" with sub-categories:
  - Broken assertions
  - Missing mocks
  - Async test issues
  - Coverage gaps

- Add "Security Issues" category:
  - Hardcoded secrets
  - Missing input validation
  - Unescaped output

**Integration Location:** Lines 576-589 (Test Failures section)

---

## Mode Flag Propagation Path

### Flow Diagram

```
User Input: /2l-mvp "..." --mode=production|mvp
                |
                v
    +-------------------+
    | 2l-mvp.md         |
    | - Parse --mode    |
    | - Store in config |
    +-------------------+
                |
                v
    +-------------------+
    | config.yaml       |
    | mode: production  |
    +-------------------+
                |
    +-----------+-----------+
    |           |           |
    v           v           v
Master      Explorers   Planner
Explorers
    |           |           |
    |           |           v
    |           |   +---------------+
    |           |   | patterns.md   |
    |           |   | (mode-aware)  |
    |           |   +---------------+
    |           |           |
    +-----------+-----------+
                |
                v
    +-------------------+
    | Builders          |
    | - Read mode       |
    | - Generate tests  |
    | - Generate CI/CD  |
    +-------------------+
                |
                v
    +-------------------+
    | Validator         |
    | - Mode check      |
    | - Coverage gate   |
    | - Security scan   |
    | - CI/CD verify    |
    +-------------------+
                |
                v
    [If FAIL]
    +-------------------+
    | Healers           |
    | - Test fixes      |
    | - Security fixes  |
    +-------------------+
```

### Storage Mechanism

**config.yaml Entry:**
```yaml
current_plan: plan-12
mode: production  # NEW FIELD

plans:
  - plan_id: plan-12
    mode: production  # Per-plan mode
    status: IN_PROGRESS
```

### Propagation Implementation

**In 2l-mvp.md, Add to All Spawns:**
```python
spawn_task(
    type="2l-builder",
    prompt=f"""
    Mode: {MODE}  # NEW LINE
    Iteration: {global_iter}
    Your ID: Builder-{builder_id}
    ...

    If Mode=production:
    - Generate tests for every feature
    - Generate CI/CD if missing
    - Follow security patterns strictly

    If Mode=mvp:
    - Tests optional
    - Skip CI/CD generation
    - Basic security hygiene only
    """
)
```

### Mode-Specific Behaviors Summary

| Agent | Production Mode | MVP Mode |
|-------|----------------|----------|
| Builder | Tests required, CI/CD generated | Tests optional, CI/CD skipped |
| Validator | Coverage gate (70%), security scan, CI/CD verify | Skip coverage, basic security only |
| Planner | Include Testing/Security/CI patterns | Simpler patterns.md |
| Healer | Fix tests, fix security issues | Focus on core functionality |

---

## Complexity Assessment

### Overall Complexity: MEDIUM

### Rationale

1. **Changes are primarily to markdown prompts (5 files):**
   - 2l-builder.md - Add production mode requirements
   - 2l-validator.md - Add coverage gate, security scan, CI/CD verify
   - 2l-planner.md - Expand patterns.md template
   - 2l-healer.md - Add test/security healing categories
   - 2l-mvp.md - Add mode flag parsing and propagation

2. **No new infrastructure required:**
   - No new agents
   - No new tools
   - No external dependencies

3. **Straightforward integration:**
   - Mode flag is simple string parsing
   - Coverage enforcement uses existing vitest
   - Security scan is static analysis (grep patterns)
   - CI/CD is template generation

4. **Low risk of breaking existing functionality:**
   - Mode defaults to "production" (new behavior)
   - MVP mode preserves current behavior
   - All changes are additive

5. **Complexity factors:**
   - Mode propagation through entire agent chain requires careful coordination
   - Coverage enforcement needs proper parsing of vitest output
   - Security patterns need to be comprehensive yet practical

### Why Not SIMPLE

- Requires changes to 5-6 files
- Mode must propagate correctly through entire pipeline
- Security scanning patterns need careful design
- Testing with both modes needed

### Why Not COMPLEX

- No new agents or architectural changes
- No external tool integration
- No database changes
- Primarily prompt engineering
- Clear success criteria

---

## Recommendations

### 1. Single Iteration Approach

**Recommended: Single iteration with 4 builders (as suggested in vision)**

| Builder | Focus | Files | Complexity |
|---------|-------|-------|------------|
| Builder 1 | Mode flag system + 2l-mvp.md | 2l-mvp.md, config handling | MEDIUM |
| Builder 2 | Builder production mode | 2l-builder.md | MEDIUM |
| Builder 3 | Validator production mode | 2l-validator.md | MEDIUM |
| Builder 4 | Planner + Healer updates | 2l-planner.md, 2l-healer.md | LOW-MEDIUM |

**Rationale:**
- All changes are to prompt files, not complex code
- Parallel work on different agents is natural
- Integration is straightforward (no conflicts between agents)
- 4-6 hours estimated total

### 2. Mode Flag Default

**Strongly recommend: Default to `production` mode**

This ensures:
- All future 2L outputs are production-ready by default
- Users must explicitly opt-out with `--mode=mvp`
- Aligns with vision "production-ready by default"

### 3. Coverage Threshold

**Recommend: Start with 70% as stated, consider configuration later**

- 70% is achievable without excessive effort
- Open question in vision about per-project configuration
- For MVP, hardcode 70% and revisit in future iteration

### 4. Security Scan Scope

**Recommend: Static analysis only for MVP**

Security checks should be:
1. **Hardcoded secrets:** grep for API_KEY, SECRET, PASSWORD, TOKEN patterns
2. **XSS vulnerabilities:** audit `dangerouslySetInnerHTML` usage
3. **SQL injection:** check for raw query string interpolation
4. **Dependency audit:** `npm audit --audit-level=high`
5. **Input validation:** verify Zod schemas at API boundaries
6. **Auth middleware:** verify protected routes have auth

**NOT in scope (future enhancement):**
- DAST (dynamic application security testing)
- OWASP full scan
- Penetration testing suggestions

### 5. CI/CD Template

**Recommend: GitHub Actions with standard stages**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run type-check  # tsc --noEmit
      - run: npm run lint
      - run: npm run test -- --coverage
      - run: npm run build
```

### 6. Testing Requirements for Builders

**Recommend: Specific test file patterns**

- Business logic: `*.test.ts` adjacent to implementation
- API routes: `*.test.ts` in same directory
- UI components: `*.test.tsx` if applicable
- Minimum: Happy path + one error case per feature

### 7. Healer Enhancement Priority

**Recommend: Focus on test fixing first**

Test failures are most common in current 2L workflow. Security issues are less frequent. Healer should:
1. Primary: Fix test assertions and logic
2. Secondary: Add missing tests for coverage
3. Tertiary: Fix security issues

### 8. Validation Order

**Recommend: Fail fast with coverage gate**

```
1. TypeScript compilation (FAIL fast)
2. Lint (FAIL fast)
3. Build (FAIL fast)
4. Tests with coverage (FAIL if <70% in production mode)
5. Security scan (FAIL on critical issues)
6. CI/CD verification (FAIL if missing in production mode)
```

---

## Files to Modify Summary

| File | Changes | Lines Affected (Est.) |
|------|---------|----------------------|
| `commands/2l-mvp.md` | Mode flag parsing, storage, propagation to all agent spawns | +50-80 lines |
| `agents/2l-builder.md` | Production mode requirements, test generation, CI/CD generation | +60-100 lines |
| `agents/2l-validator.md` | Coverage gate, security scan, CI/CD verification | +100-150 lines |
| `agents/2l-planner.md` | Testing/Security/CI patterns sections in patterns.md template | +40-60 lines |
| `agents/2l-healer.md` | Test fixing category, security fixing category | +30-50 lines |
| `templates/patterns-template.md` | Create if needed with production sections | New file ~100 lines |

**Total estimated changes:** ~400-550 lines across 5-6 files

---

## Notes & Observations

1. **Existing Test Mentions:** The current agents already mention testing but don't enforce it. This plan elevates testing from "nice to have" to "required in production mode."

2. **MCP Integration:** Builders already support Playwright and Chrome DevTools MCPs. These can be leveraged for testing but should not block validation if unavailable.

3. **Learning Capture:** The validator already has learning capture on failures (Lines 1001-1286). This will automatically capture test/security failures for future improvement.

4. **Event Logging:** The mode decision should be logged as an event for dashboard visibility:
   ```bash
   log_2l_event "mode_decision" "Mode: production (default)" "initialization" "orchestrator"
   ```

5. **Backward Compatibility:** MVP mode preserves current behavior, so existing users can opt-out of new requirements.

6. **Self-Application:** Once complete, Plan-12 itself should be validated with the new production mode to verify the framework works.

---

*Exploration completed: 2025-12-10*
*This report informs master planning decisions*
