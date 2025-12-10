# Builder Task Breakdown

## Overview

4 primary builders will work in parallel. All builders modify markdown agent files with no cross-dependencies.

## Builder Assignment Strategy

- Each builder owns specific files with no overlap
- No builder dependencies (all work in parallel)
- Changes are additive to existing agent prompts
- Use patterns from existing production projects (wealth, mirror-of-dreams)

---

## Builder-1: Command System

### Scope

Create the new `/2l-prod` command and make minor updates to `/2l-mvp` for explicit mode separation.

### Complexity Estimate

**MEDIUM**

The `/2l-prod` command is largely based on `/2l-mvp` with production-specific additions.

### Success Criteria

- [ ] `commands/2l-prod.md` exists and is syntactically valid
- [ ] `/2l-prod` sets `mode: production` in spawn_task contexts
- [ ] `/2l-prod` includes production quality gates (tests required, CI/CD required)
- [ ] `/2l-prod` has three-level access like `/2l-mvp`
- [ ] `commands/2l-mvp.md` continues to work for MVP prototyping
- [ ] `/2l-mvp` explicitly sets `mode: mvp` when spawning agents

### Files to Create/Modify

- `commands/2l-prod.md` - **NEW**: Production command (based on 2l-mvp.md)
- `commands/2l-mvp.md` - **MINOR UPDATES**: Add explicit `mode: mvp` to agent contexts

### Implementation Notes

#### For `commands/2l-prod.md`:

1. **Copy structure from `commands/2l-mvp.md`** (1943 lines)
   - Keep: Three-level access logic, config management, phase orchestration
   - Modify: Add production-specific context to all spawn_task prompts

2. **Add production mode context to spawn_task prompts:**

   ```python
   spawn_task(
       type="2l-builder",
       prompt=f"""Build assigned feature.

   Iteration: {global_iter}
   Your ID: Builder-{builder_id}
   Mode: PRODUCTION  # <-- ADD THIS

   # ... rest of prompt ...

   PRODUCTION MODE REQUIREMENTS:
   - You MUST generate tests for all features
   - You MUST generate CI/CD workflow if missing
   - You MUST follow security patterns from patterns.md

   Create report at: {building_dir}/builder-{builder_id}-report.md"""
   )
   ```

3. **Add production context to ALL agent spawn_task calls:**
   - Explorers: Add `Mode: PRODUCTION`
   - Planner: Add `Mode: PRODUCTION` (triggers production pattern sections)
   - Builders: Add `Mode: PRODUCTION` (triggers test/CI generation)
   - Validators: Add `Mode: PRODUCTION` (triggers coverage/security gates)
   - Healers: Add `Mode: PRODUCTION` (enables test/security healing)

4. **Update header to differentiate from /2l-mvp:**

   ```markdown
   # 2L Production - Full Autonomous Development with Production Quality

   Execute complete 2L protocol with production-grade outputs: comprehensive tests, CI/CD pipelines, and security validation.

   **CRITICAL:** This command produces production-ready applications, not quick prototypes.
   ```

#### For `commands/2l-mvp.md`:

1. **Add explicit `Mode: MVP` to spawn_task prompts** (lines ~843-1029)

   ```python
   spawn_task(
       type="2l-builder",
       prompt=f"""Build assigned feature.

   Iteration: {global_iter}
   Your ID: Builder-{builder_id}
   Mode: MVP  # <-- ADD THIS

   # ... rest of prompt ...

   MVP MODE:
   - Tests are optional (but encouraged)
   - CI/CD generation is optional
   - Focus on feature completion and speed

   Create report at: {building_dir}/builder-{builder_id}-report.md"""
   )
   ```

2. **Update header to clarify MVP purpose:**

   ```markdown
   # 2L MVP - Full Autonomous Development Orchestrator (Rapid Prototyping)

   Execute complete 2L protocol for quick prototypes and MVPs.

   **Note:** For production-ready applications with tests and CI/CD, use `/2l-prod`.
   ```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use "Mode-Conditional Pattern" for mode propagation
- Use "Agent Prompt Patterns" for section structure

### Testing Requirements

- Verify `2l-prod.md` is valid markdown with no syntax errors
- Verify spawn_task prompts include `Mode: PRODUCTION`
- Verify `2l-mvp.md` spawn_task prompts include `Mode: MVP`

---

## Builder-2: Builder Agent Updates

### Scope

Update `agents/2l-builder.md` to generate tests and CI/CD workflows in production mode.

### Complexity Estimate

**MEDIUM**

Adding new sections to existing agent prompt without changing core logic.

### Success Criteria

- [ ] Builder agent has "Production Mode Requirements" section
- [ ] Builder generates test files in production mode
- [ ] Builder generates CI/CD workflow if missing (production mode)
- [ ] Builder follows security patterns from patterns.md
- [ ] MVP mode behavior documented (tests optional)
- [ ] Builder report template includes test/CI sections

### Files to Modify

- `agents/2l-builder.md` - Add production mode requirements

### Implementation Notes

#### Add new section after "Step 3a: COMPLETE Path" (around line 223):

```markdown
## Production Mode Requirements

When `Mode: PRODUCTION` is specified in your task:

### 1. Test Generation (REQUIRED)

Every feature MUST include tests:

**Unit tests:**
\`\`\`typescript
// Create {feature}.test.ts for each new module
describe('{ModuleName}', () => {
  describe('happy path', () => {
    it('should {expected behavior}', () => { /* ... */ });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => { /* ... */ });
    it('should handle null/undefined', () => { /* ... */ });
  });

  describe('error handling', () => {
    it('should throw on invalid input', () => { /* ... */ });
  });
});
\`\`\`

**Integration tests for API routes:**
\`\`\`typescript
describe('POST /api/{resource}', () => {
  it('should succeed with valid input', async () => { /* ... */ });
  it('should return 400 for invalid input', async () => { /* ... */ });
  it('should return 401 for unauthenticated request', async () => { /* ... */ });
});
\`\`\`

**Coverage target:** Aim for 80%+ coverage on your feature

### 2. CI/CD Generation (if missing)

Check if `.github/workflows/ci.yml` exists:

\`\`\`bash
ls .github/workflows/ci.yml 2>/dev/null
\`\`\`

**If missing, create it:**

\`\`\`yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [quality, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
\`\`\`

### 3. Security Patterns (REQUIRED)

Follow security patterns from `patterns.md`:

- **Never** hardcode secrets (use environment variables)
- **Always** validate input with Zod schemas at API boundaries
- **Always** use parameterized queries (Prisma handles this)
- **Never** use `dangerouslySetInnerHTML` without sanitization
- **Always** add auth middleware to protected routes

## MVP Mode Behavior

When `Mode: MVP` is specified:

- Tests are optional (but encouraged for complex features)
- CI/CD generation is skipped
- Security patterns still followed (basic hygiene)
- Focus on feature completion and speed
```

#### Update "Create Report" section (around line 263) to add test summary:

```markdown
## Test Generation Summary (Production Mode)
- **Test files created:** {List of test files}
- **Unit tests:** {Number} tests
- **Integration tests:** {Number} tests
- **Estimated coverage:** {Percentage}%

## CI/CD Status
- **Workflow exists:** Yes / No
- **Workflow created:** Yes / No (if created, note the path)
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use "Test File Structure Pattern" for test examples
- Use "CI/CD Generation Pattern" for workflow template
- Use "Security Patterns" for security requirements

### Testing Requirements

- Verify new sections are valid markdown
- Verify test generation pattern is copy-pasteable
- Verify CI/CD template is valid YAML

---

## Builder-3: Validator Agent Updates

### Scope

Update `agents/2l-validator.md` to enforce coverage thresholds and security scanning in production mode.

### Complexity Estimate

**MEDIUM**

Adding coverage gate and security checklist sections to existing validation flow.

### Success Criteria

- [ ] Validator has coverage gate section (70% threshold for production mode)
- [ ] Validator has security checklist section
- [ ] Validator has CI/CD verification section
- [ ] MVP mode behavior documented (skip coverage/CI checks)
- [ ] Validation report template includes coverage and security sections

### Files to Modify

- `agents/2l-validator.md` - Add production validation gates

### Implementation Notes

#### Add new section after "### 4. Unit Tests" (around line 484):

```markdown
### 4b. Test Coverage Analysis (Production Mode Only)

**Skip this check if `Mode: MVP`**

\`\`\`bash
npm run test:coverage
# Or: vitest run --coverage
\`\`\`

**Pass criteria (production mode):**
- Overall coverage >= 70%
- Statement coverage >= 70%
- Branch coverage >= 70%
- Function coverage >= 70%
- Line coverage >= 70%

**Coverage assessment:**

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Statements | {X}% | >= 70% | {PASS/FAIL} |
| Branches | {X}% | >= 70% | {PASS/FAIL} |
| Functions | {X}% | >= 70% | {PASS/FAIL} |
| Lines | {X}% | >= 70% | {PASS/FAIL} |

**Coverage status:** {PASS/FAIL}

**Note:** Coverage < 70% in production mode = FAIL status
**Exceptional coverage (>85%):** Note in report as commendation
```

#### Add new section after "### 8. Success Criteria Check" (around line 519):

```markdown
### 9. Security Validation (Production Mode Only)

**Skip this check if `Mode: MVP`**

#### 9.1 Hardcoded Secrets Detection

\`\`\`bash
# Check for hardcoded API keys
grep -rn "API_KEY\s*=\s*['\"]" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env" | grep -v ".test."

# Check for hardcoded secrets
grep -rn "SECRET\s*=\s*['\"]" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env" | grep -v ".test."

# Check for hardcoded passwords
grep -rn "PASSWORD\s*=\s*['\"]" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env" | grep -v ".test."
\`\`\`

**Pass criteria:** No hardcoded secrets (all from env vars)

#### 9.2 XSS Vulnerability Check

\`\`\`bash
# Check for dangerous HTML rendering
grep -rn "dangerouslySetInnerHTML" src/ --include="*.tsx"
\`\`\`

**Pass criteria:** Zero usage OR each usage reviewed and sanitized

#### 9.3 SQL Injection Check

\`\`\`bash
# Check for raw SQL with string interpolation
grep -rn "\$queryRaw" src/ --include="*.ts"
grep -rn "\$executeRaw" src/ --include="*.ts"
\`\`\`

**Pass criteria:** All queries use parameterized syntax

#### 9.4 Dependency Vulnerabilities

\`\`\`bash
npm audit --audit-level=high
\`\`\`

**Pass criteria:** No high or critical vulnerabilities

#### 9.5 Input Validation Check

\`\`\`bash
# Verify Zod schemas at API boundaries
grep -rn "z\.\|zod" src/app/api/ --include="*.ts" | head -20
\`\`\`

**Pass criteria:** API routes validate input with Zod

#### 9.6 Auth Middleware Check

\`\`\`bash
# Verify protected routes have auth
grep -rn "requireAuth\|getSession\|auth(" src/app/api/ --include="*.ts" | head -20
\`\`\`

**Pass criteria:** Protected endpoints have auth checks

**Security checklist:**
- [ ] No hardcoded secrets
- [ ] No XSS vulnerabilities (or all sanitized)
- [ ] No SQL injection patterns
- [ ] No high/critical dependency vulnerabilities
- [ ] Input validation at API boundaries
- [ ] Auth on protected routes

**Security status:** {PASS/FAIL}
**Issues found:** {List if any}
```

#### Add new section after security validation:

```markdown
### 10. CI/CD Verification (Production Mode Only)

**Skip this check if `Mode: MVP`**

#### 10.1 Workflow Exists

\`\`\`bash
test -f .github/workflows/ci.yml && echo "EXISTS" || echo "MISSING"
\`\`\`

**Pass criteria:** EXISTS

#### 10.2 Required Stages Present

\`\`\`bash
grep -E "(tsc|typecheck|noEmit)" .github/workflows/ci.yml && echo "TypeCheck: YES"
grep -E "lint" .github/workflows/ci.yml && echo "Lint: YES"
grep -E "test" .github/workflows/ci.yml && echo "Test: YES"
grep -E "build" .github/workflows/ci.yml && echo "Build: YES"
\`\`\`

**Pass criteria:** All four stages present

**CI/CD status:** {PASS/FAIL}
```

#### Update validation report template (around line 850) to include new sections:

```markdown
## Coverage Analysis (Production Mode)

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Statements | {X}% | >= 70% | {PASS/FAIL} |
| Branches | {X}% | >= 70% | {PASS/FAIL} |
| Functions | {X}% | >= 70% | {PASS/FAIL} |
| Lines | {X}% | >= 70% | {PASS/FAIL} |

**Coverage status:** {PASS/FAIL}

---

## Security Validation (Production Mode)

### Checks Performed
- [ ] Hardcoded secrets: {PASS/FAIL}
- [ ] XSS vulnerabilities: {PASS/FAIL}
- [ ] SQL injection patterns: {PASS/FAIL}
- [ ] Dependency vulnerabilities: {PASS/FAIL}
- [ ] Input validation: {PASS/FAIL}
- [ ] Auth middleware: {PASS/FAIL}

**Security status:** {PASS/FAIL}
**Issues found:** {List if any}

---

## CI/CD Verification (Production Mode)

**Workflow exists:** {Yes/No}
**Required stages present:** {Yes/No}
- TypeScript check: {Yes/No}
- Lint: {Yes/No}
- Test: {Yes/No}
- Build: {Yes/No}

**CI/CD status:** {PASS/FAIL}
```

#### Add mode handling to decision section (around line 887):

```markdown
## Mode-Specific Pass Criteria

### Production Mode (Mode: PRODUCTION)
- All standard checks must pass
- Coverage >= 70% (REQUIRED)
- Security checklist clear (REQUIRED)
- CI/CD workflow exists (REQUIRED)

### MVP Mode (Mode: MVP)
- All standard checks must pass (TypeScript, lint, build)
- Coverage check: SKIPPED
- Security checklist: Basic only (hardcoded secrets check)
- CI/CD verification: SKIPPED
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use "Coverage Verification Pattern" for coverage checks
- Use "Security Checklist Pattern" for security validation
- Use "CI/CD Verification Pattern" for pipeline checks

### Testing Requirements

- Verify new sections are valid markdown
- Verify bash commands are executable
- Verify report template is complete

---

## Builder-4: Planner & Healer Updates

### Scope

Update `agents/2l-planner.md` to include production pattern sections and update `agents/2l-healer.md` for test and security healing categories.

### Complexity Estimate

**MEDIUM**

Two files to modify with additive changes.

### Success Criteria

- [ ] Planner includes Testing Patterns section requirement
- [ ] Planner includes Security Patterns section requirement
- [ ] Planner includes Error Handling Patterns section requirement
- [ ] Planner includes CI/CD Patterns section requirement
- [ ] Healer has "Test Failures" healing category
- [ ] Healer has "Security Concerns" healing category

### Files to Modify

- `agents/2l-planner.md` - Add production pattern requirements
- `agents/2l-healer.md` - Add test and security healing categories

### Implementation Notes

#### For `agents/2l-planner.md`:

Add new section after "## 3. patterns.md" (around line 356):

```markdown
## Production Mode Pattern Requirements

When `Mode: PRODUCTION` is specified, patterns.md MUST include these additional sections:

### Testing Patterns (REQUIRED in Production Mode)

Include copy-pasteable patterns for:

\`\`\`markdown
## Testing Patterns

### Test File Structure
\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { functionToTest } from '../module';

describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionToTest', () => {
    it('should handle normal case', () => {
      const result = functionToTest('input');
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      expect(() => functionToTest(null)).toThrow();
    });
  });
});
\`\`\`

### API Route Test Pattern
\`\`\`typescript
describe('POST /api/resource', () => {
  it('should create with valid input', async () => {
    const response = await POST(mockRequest({ data: validData }));
    expect(response.status).toBe(200);
  });

  it('should return 400 for invalid input', async () => {
    const response = await POST(mockRequest({ data: invalidData }));
    expect(response.status).toBe(400);
  });
});
\`\`\`

### Mock Patterns
\`\`\`typescript
// Mock external dependencies
vi.mock('@/lib/external', () => ({
  externalFunction: vi.fn().mockResolvedValue('mocked'),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));
\`\`\`
\`\`\`

### Security Patterns (REQUIRED in Production Mode)

Include copy-pasteable patterns for:

\`\`\`markdown
## Security Patterns

### Input Validation Pattern
\`\`\`typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
\`\`\`

### Auth Check Pattern
\`\`\`typescript
export async function requireAuth(req: Request) {
  const session = await getSession(req);
  if (!session?.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return session.user;
}
\`\`\`

### Environment Variable Pattern
\`\`\`typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env);
\`\`\`

### Rate Limiting Pattern
\`\`\`typescript
const RATE_LIMITS = {
  auth: { requests: 5, window: '1m' },
  ai: { requests: 10, window: '1m' },
  write: { requests: 30, window: '1m' },
  global: { requests: 100, window: '1m' },
};
\`\`\`
\`\`\`

### Error Handling Patterns (REQUIRED in Production Mode)

\`\`\`markdown
## Error Handling Patterns

### Custom Error Classes
\`\`\`typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
\`\`\`

### API Error Response Pattern
\`\`\`typescript
try {
  // ... operation
} catch (error) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error('Unexpected error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
\`\`\`
\`\`\`

### CI/CD Patterns (REQUIRED in Production Mode)

\`\`\`markdown
## CI/CD Patterns

### GitHub Actions Workflow
\`\`\`yaml
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
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint

  test:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:coverage

  build:
    needs: [quality, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
\`\`\`
\`\`\`
```

#### For `agents/2l-healer.md`:

Add to "Healing Strategies by Category" section (around line 558), add after "Integration Problems":

```markdown
## Test Failures

**Common causes:**
- Broken assertions (expected vs actual mismatch)
- Missing mocks (undefined dependencies)
- Async test issues (missing await)
- Snapshot mismatches
- Test environment not setup
- Incorrect mock data
- Timing issues in async tests

**Fix approach:**
1. Read test to understand intent
2. Run test in isolation: `npm test -- --run {testFile}`
3. Add console.log to see actual vs expected
4. Determine if test or code is wrong:
   - If code is wrong: Fix the implementation
   - If test is wrong: Update assertions
5. For async issues: Add proper await/async handling
6. For mock issues: Ensure all dependencies are mocked
7. Verify fix with full test suite

**Example fix (missing await):**
\`\`\`typescript
// Before (failing):
it('should fetch data', () => {
  const result = fetchData();
  expect(result).toEqual(expected);
});

// After (passing):
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toEqual(expected);
});
\`\`\`

**Example fix (mock not setup):**
\`\`\`typescript
// Before (failing - prisma is real):
it('should get user', async () => {
  const user = await getUser('123');
  expect(user).toBeDefined();
});

// After (passing - prisma is mocked):
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue({ id: '123', name: 'Test' }) }
  }
}));

it('should get user', async () => {
  const user = await getUser('123');
  expect(user).toBeDefined();
});
\`\`\`

---

## Security Concerns

**Common causes:**
- Hardcoded secrets in code
- Missing input validation
- Insufficient authorization checks
- Vulnerable dependencies
- Improper error exposure
- SQL injection patterns
- XSS vulnerabilities

**Fix approach:**
1. **Hardcoded secrets:** Move to environment variables
   \`\`\`typescript
   // Before:
   const apiKey = "sk-abc123";
   // After:
   const apiKey = process.env.API_KEY;
   \`\`\`

2. **Missing input validation:** Add Zod schemas
   \`\`\`typescript
   // Add at API boundary:
   const input = schema.parse(await req.json());
   \`\`\`

3. **Missing auth:** Add requireAuth check
   \`\`\`typescript
   // Add at start of protected route:
   const user = await requireAuth(req);
   \`\`\`

4. **Vulnerable dependencies:** Update packages
   \`\`\`bash
   npm audit fix
   # Or for specific package:
   npm update {vulnerable-package}
   \`\`\`

5. **Error exposure:** Sanitize error messages
   \`\`\`typescript
   // Before:
   return NextResponse.json({ error: error.message, stack: error.stack });
   // After:
   console.error(error); // Log for debugging
   return NextResponse.json({ error: 'Internal server error' });
   \`\`\`

6. **XSS prevention:** Sanitize user content
   \`\`\`typescript
   // If dangerouslySetInnerHTML is necessary:
   import DOMPurify from 'dompurify';
   const sanitized = DOMPurify.sanitize(userContent);
   \`\`\`
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use "Section Structure Pattern" for new sections
- Use "Test Failure Healing Pattern" for healer
- Use "Security Issue Healing Pattern" for healer

### Testing Requirements

- Verify new sections are valid markdown
- Verify code examples are complete and copy-pasteable
- Verify section headers follow existing conventions

---

## Builder Execution Order

### Parallel Group 1 (All Independent)

All 4 builders work in parallel with no dependencies:

- **Builder-1:** Command System (2l-prod.md, 2l-mvp.md)
- **Builder-2:** Builder Agent Updates (2l-builder.md)
- **Builder-3:** Validator Agent Updates (2l-validator.md)
- **Builder-4:** Planner & Healer Updates (2l-planner.md, 2l-healer.md)

### Integration Notes

**No file conflicts expected.** Each builder owns distinct files:

| Builder | Files |
|---------|-------|
| Builder-1 | `commands/2l-prod.md` (new), `commands/2l-mvp.md` |
| Builder-2 | `agents/2l-builder.md` |
| Builder-3 | `agents/2l-validator.md` |
| Builder-4 | `agents/2l-planner.md`, `agents/2l-healer.md` |

**Integration verification:**
1. All modified files exist and are valid markdown
2. Cross-references between agents use consistent terminology
3. Mode names are consistent: `Mode: PRODUCTION` and `Mode: MVP`
4. Coverage threshold is consistently 70% across all references
