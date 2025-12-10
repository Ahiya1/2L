# Project Vision: 2L Production Hardening

**Created:** 2025-12-10T09:00:00Z
**Plan:** plan-12

---

## Problem Statement

2L builds excellent MVPs with modern tech stacks, good architecture, and type safety. However, the outputs lack production-readiness:

**Current pain points:**
- Testing is inconsistent (only 3/13 projects have real test coverage)
- CI/CD is rare (only 2 projects have GitHub Actions workflows)
- Security vulnerabilities may exist undetected (no systematic scanning)
- No enforced quality gates before PASS validation
- Builders focus on features, not production concerns

**Root cause:** Production concerns are optional/afterthought, not embedded in the workflow.

---

## Target Users

**Primary user:** 2L framework (self-improvement)
- The agents themselves will be updated
- Future projects built by 2L will automatically be production-ready

**Secondary users:** Developers using 2L
- Get production-quality output by default
- Can opt-out with `--mode=mvp` for quick prototypes

---

## Core Value Proposition

**2L outputs production-ready applications by default, not just MVPs.**

**Key benefits:**
1. Every feature comes with tests (70%+ coverage required for PASS)
2. Every project gets CI/CD pipeline (GitHub Actions generated automatically)
3. Security vulnerabilities caught before deployment (XSS, SQL injection, etc.)
4. Clean code enforced (linting, formatting, type safety)
5. Quick prototyping still possible via `--mode=mvp` flag

---

## Feature Breakdown

### Must-Have (MVP)

1. **Separate /2l-prod Command**
   - Description: Create new `/2l-prod` command for production-ready builds, keep `/2l-mvp` for quick prototypes
   - User story: As an operator, I want separate commands for MVP vs production so that intent is explicit
   - Acceptance criteria:
     - [ ] New `commands/2l-prod.md` created (based on 2l-mvp.md)
     - [ ] `/2l-prod` enforces: tests required, CI/CD generated, security scan
     - [ ] `/2l-mvp` remains fast: tests optional, no CI/CD requirement
     - [ ] Both commands share core orchestration logic, differ in quality gates
     - [ ] Mode (mvp|production) stored in iteration config and passed to all agents

2. **Builder: Test Generation**
   - Description: Builders must output tests alongside features in production mode
   - User story: As a user, I want every feature to come with tests so that I can verify it works
   - Acceptance criteria:
     - [ ] Builder agent prompt updated to require test files
     - [ ] Builder outputs `*.test.ts` or `*.spec.ts` files for each feature
     - [ ] Tests cover happy path + at least one error case
     - [ ] Builder report includes test file locations

3. **Builder: CI/CD Generation**
   - Description: Builders generate GitHub Actions workflow in production mode
   - User story: As a user, I want automated pipelines so that code is verified on every push
   - Acceptance criteria:
     - [ ] Builder generates `.github/workflows/ci.yml` if not exists
     - [ ] Workflow includes: type-check, lint, test, build stages
     - [ ] Workflow triggers on push and pull_request
     - [ ] Jobs have proper dependencies (test depends on lint, build depends on test)

4. **Validator: Test Coverage Enforcement**
   - Description: Validator requires 70%+ test coverage for PASS in production mode
   - User story: As a user, I want coverage enforced so that untested code doesn't ship
   - Acceptance criteria:
     - [ ] Validator runs `vitest --coverage` or equivalent
     - [ ] Coverage < 70% = FAIL status (production mode)
     - [ ] Coverage 70-85% = PASS status
     - [ ] Coverage > 85% = PASS with commendation
     - [ ] MVP mode: coverage check skipped

5. **Validator: Security Checklist**
   - Description: Validator performs security vulnerability scan
   - User story: As a user, I want security issues caught before deployment
   - Acceptance criteria:
     - [ ] Check for hardcoded secrets (API keys, passwords in code)
     - [ ] Check for XSS vulnerabilities (unescaped user input in JSX)
     - [ ] Check for SQL injection (raw queries with string interpolation)
     - [ ] Check for insecure dependencies (`npm audit`)
     - [ ] Check for missing input validation at API boundaries
     - [ ] Check for proper auth middleware on protected routes
     - [ ] Security issues = FAIL status

6. **Planner: Production Patterns**
   - Description: Planner includes production patterns in `patterns.md`
   - User story: As a builder, I want clear patterns so that I write production-quality code
   - Acceptance criteria:
     - [ ] patterns.md includes Testing Patterns section
     - [ ] patterns.md includes Security Patterns section
     - [ ] patterns.md includes Error Handling Patterns section
     - [ ] patterns.md includes CI/CD Patterns section
     - [ ] Patterns are project-specific, not generic boilerplate

7. **Healer: Test Fixing**
   - Description: Healer can fix failing tests, not just code
   - User story: As a user, I want the healing cycle to fix test issues too
   - Acceptance criteria:
     - [ ] Healer recognizes "test failures" as a category
     - [ ] Healer can modify test files to fix assertions
     - [ ] Healer can modify code to make tests pass (preferred)
     - [ ] Healer report distinguishes test fixes from code fixes

### Should-Have (Post-MVP / Same Plan If Time)

1. **Security Pattern Library**
   - Pre-built secure patterns for common vulnerabilities
   - Builders reference these patterns instead of inventing solutions
   - Examples: sanitization helpers, auth middleware templates, CSP configs

2. **Coverage Reporting**
   - Generate coverage report artifact after validation
   - Store in `.2L/plan-{N}/iteration-{M}/validation/coverage/`
   - Include in validation report summary

3. **Dependency Security**
   - Run `npm audit` as part of validation
   - Flag high/critical vulnerabilities as FAIL
   - Suggest fixes in validation report

### Could-Have (Future Plans)

1. **Monitoring/Observability Templates**
   - Sentry integration templates
   - Structured logging setup
   - Health check endpoints

2. **Specialized Security Validator Agent**
   - If security checklist becomes too heavy for main validator
   - Deep security scanning with OWASP checks
   - Penetration testing suggestions

3. **Performance Testing**
   - Load testing templates
   - Performance budgets in CI
   - Lighthouse CI integration

---

## Changes to Existing Agents

### 2l-builder.md Updates

```markdown
## Production Mode Requirements (default)

When mode=production:
1. Every feature MUST include tests
   - Unit tests for business logic
   - Integration tests for API routes
   - Component tests for UI (if applicable)

2. Generate CI/CD if not exists
   - Check for .github/workflows/ci.yml
   - If missing, create standard workflow

3. Follow security patterns from patterns.md
   - Never interpolate user input into SQL
   - Always sanitize user input before rendering
   - Use parameterized queries
   - Validate all inputs with Zod schemas

## MVP Mode

When mode=mvp:
- Tests optional
- CI/CD generation skipped
- Security patterns still followed (basic hygiene)
```

### 2l-validator.md Updates

```markdown
## Production Mode Validation (default)

### Test Coverage Gate
- Run test suite with coverage
- FAIL if coverage < 70%
- PASS if coverage >= 70%
- Note exceptional coverage (>85%) in report

### Security Scan
- [ ] No hardcoded secrets (grep for API_KEY, SECRET, PASSWORD in code)
- [ ] No XSS vulnerabilities (dangerouslySetInnerHTML audit)
- [ ] No SQL injection (raw query string interpolation)
- [ ] npm audit --audit-level=high passes
- [ ] Input validation present at API boundaries
- [ ] Auth middleware on protected routes

### CI/CD Verification
- [ ] .github/workflows/ci.yml exists
- [ ] Workflow includes required stages (lint, test, build)

## MVP Mode Validation

When mode=mvp:
- Skip coverage gate
- Skip CI/CD verification
- Basic security only (hardcoded secrets check)
- Standard compilation/type/lint checks remain
```

### 2l-planner.md Updates

```markdown
## patterns.md Structure (Production Mode)

The patterns.md file MUST include these sections:

### Testing Patterns
- Test file naming conventions
- Mocking strategies for the project
- Test data factories if applicable
- Coverage expectations per module

### Security Patterns
- Input validation approach (Zod schemas)
- Authentication/authorization patterns
- Data sanitization utilities
- Secure API endpoint patterns

### Error Handling Patterns
- Error boundary usage
- API error response format
- Logging approach
- User-facing error messages

### CI/CD Patterns
- Branch strategy (main, feature branches)
- Deployment triggers
- Environment configuration
```

### 2l-healer.md Updates

```markdown
## Healing Categories

Add to existing categories:

### Test Failures
- Broken assertions (expected vs actual mismatch)
- Missing mocks (undefined dependencies)
- Async test issues (missing await)
- Snapshot mismatches

### Security Issues
- Hardcoded secrets (move to env vars)
- Missing input validation (add Zod schema)
- Unescaped output (add sanitization)
```

---

## User Flows

### Flow 1: Standard Production Build

**Steps:**
1. User runs `/2l-mvp "Build feature X"` (no mode flag = production)
2. Planner includes testing/security/CI patterns in patterns.md
3. Builders implement features WITH tests
4. Builders generate CI/CD workflow if missing
5. Integrator merges code AND test files
6. Validator runs tests, checks coverage (must be 70%+), runs security scan
7. If PASS: commit includes tested, secure code with CI pipeline
8. If FAIL: Healer fixes issues (including test fixes)

**Edge cases:**
- Coverage at 69%: FAIL, healer adds more tests or removes dead code
- Security vulnerability found: FAIL, healer fixes or flags for human review
- CI workflow exists but incomplete: Validator flags, healer updates

### Flow 2: Quick Prototype (MVP Mode)

**Steps:**
1. User runs `/2l-mvp --mode=mvp "Prototype feature X"`
2. Mode flag propagated to all agents
3. Builders skip test generation
4. Builders skip CI/CD generation
5. Validator skips coverage check, does basic security only
6. Faster iteration for throwaway prototypes

**Important:** User explicitly chose lower quality - this is intentional.

---

## Technical Requirements

**Must support:**
- Vitest for test running and coverage (already in most projects)
- GitHub Actions for CI/CD (already proven in wealth, mirror-of-dreams)
- TypeScript strict mode (already standard)
- Zod for validation (already standard)

**Constraints:**
- No new dependencies in 2L framework itself
- Changes are to agent prompts and validation logic only
- Must not slow down MVP mode significantly

**Preferences:**
- Coverage tool: Vitest with v8 coverage provider
- CI platform: GitHub Actions (primary), scripts (fallback)
- Security scanning: Static analysis via code review patterns (no external tools required)

---

## Success Criteria

**The plan is successful when:**

1. **Test Coverage Enforcement Works**
   - Metric: Validator correctly fails builds with <70% coverage
   - Target: 100% of production mode builds are coverage-gated

2. **Builders Output Tests**
   - Metric: Builder reports include test file paths
   - Target: Every builder in production mode outputs ≥1 test file per feature

3. **CI/CD Generated**
   - Metric: Projects have .github/workflows/ci.yml after build
   - Target: 100% of new production-mode projects have CI pipeline

4. **Security Vulnerabilities Caught**
   - Metric: Validator security checklist runs and can detect issues
   - Target: Can detect hardcoded secrets, XSS patterns, SQL injection patterns

5. **MVP Mode Still Fast**
   - Metric: MVP mode iteration time vs current
   - Target: No more than 10% slower than current (skip heavy checks)

6. **Self-Verification**
   - Metric: Run production mode on a test project
   - Target: Output includes tests, CI/CD, passes security scan

---

## Out of Scope

**Explicitly not included in this plan:**
- Monitoring/observability setup (future plan)
- Performance testing (future plan)
- Specialized security-validator agent (extract later if needed)
- E2E test generation (complex, future enhancement)
- Deployment automation beyond CI (Vercel/etc deployment is manual)

**Why:** Focus on the core quality gates first. Monitoring and advanced security can be layered on once the foundation works.

---

## Assumptions

1. Vitest is the test runner for all new projects (can be configured in tech-stack.md)
2. GitHub is the primary git platform (GitHub Actions)
3. Projects use TypeScript (coverage tools assume TS)
4. Security scan is static analysis only (no runtime/DAST)
5. 70% coverage is achievable without excessive effort

---

## Open Questions

1. Should coverage threshold be configurable per-project in vision.md?
2. Should security scan severity levels be configurable (fail on high only vs all)?
3. How to handle projects that intentionally have low-test areas (e.g., generated code)?

---

## Files to Modify

| File | Change |
|------|--------|
| `agents/2l-builder.md` | Add test generation, CI/CD generation, security patterns |
| `agents/2l-validator.md` | Add coverage gate, security checklist, CI/CD verification |
| `agents/2l-planner.md` | Add production patterns sections to patterns.md template |
| `agents/2l-healer.md` | Add test-fixing and security-fixing categories |
| `commands/2l-prod.md` | NEW: Production command (based on 2l-mvp.md with production gates) |
| `commands/2l-mvp.md` | Minor updates to set mode=mvp in config |
| `templates/patterns-template.md` | Create template with production sections (if needed) |

---

## Implementation Strategy

**Recommended approach:** Single iteration, 4 builders

| Builder | Focus |
|---------|-------|
| Builder 1 | New /2l-prod command + 2l-mvp.md mode updates |
| Builder 2 | 2l-builder.md updates (tests, CI/CD, security patterns) |
| Builder 3 | 2l-validator.md updates (coverage gate, security scan) |
| Builder 4 | 2l-planner.md + 2l-healer.md updates |

**Why single iteration:** Changes are to prompt files, not complex code. Parallel work on different agents, integrate at end.

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** VISIONED
**Ready for:** Master Planning
