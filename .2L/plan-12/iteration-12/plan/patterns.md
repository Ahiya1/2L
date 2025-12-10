# Code Patterns & Conventions

This document defines patterns for the 2L Production Hardening iteration. All builders must follow these patterns when modifying agent markdown files.

## File Structure

```
~/Ahiya/2L/
├── commands/
│   ├── 2l-mvp.md           # Existing MVP command (minor updates)
│   ├── 2l-prod.md          # NEW: Production command
│   ├── 2l-vision.md        # Unchanged
│   └── 2l-continue.md      # Unchanged
├── agents/
│   ├── 2l-builder.md       # Updates for test/CI generation
│   ├── 2l-validator.md     # Updates for coverage/security gates
│   ├── 2l-planner.md       # Updates for production patterns
│   ├── 2l-healer.md        # Updates for test/security healing
│   └── [other agents]      # Unchanged
└── .2L/
    └── plan-12/
        └── iteration-12/
            └── plan/       # This plan
```

## Naming Conventions

- Commands: kebab-case (`2l-prod.md`, `2l-mvp.md`)
- Agents: kebab-case (`2l-builder.md`, `2l-validator.md`)
- Sections: Title Case with markdown headers (`## Production Mode Requirements`)
- Code blocks: Appropriate language tag (```typescript, ```bash, ```yaml)

## Agent Prompt Patterns

### Section Structure Pattern

All new sections in agent files should follow this structure:

```markdown
## {Section Title}

{Brief description of what this section covers}

### {Subsection}

**When to use:** {Condition or trigger}

**Requirements:**
- Requirement 1
- Requirement 2
- Requirement 3

**Example:**
\`\`\`{language}
{Working code example}
\`\`\`

**Important notes:**
- Note 1
- Note 2
```

### Mode-Conditional Pattern

When adding mode-dependent behavior:

```markdown
## Production Mode Requirements

When `mode=production` (default in /2l-prod):

1. **{Requirement 1}**
   - Detail A
   - Detail B

2. **{Requirement 2}**
   - Detail A
   - Detail B

## MVP Mode Behavior

When `mode=mvp` (default in /2l-mvp):

- {Relaxed requirement or skip}
- {Relaxed requirement or skip}
```

---

## Testing Patterns

### Test File Structure Pattern

For generated project tests:

```typescript
// Standard test file structure
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import module under test
import { functionToTest } from '../module';

// Import types if needed
import type { SomeType } from '@/types';

describe('Module Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('functionToTest', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      expect(() => functionToTest(null)).toThrow('Expected error');
    });
  });
});
```

### Test Generation Pattern (for builder agent)

```markdown
### Test Generation Requirements (Production Mode)

When `mode=production`, every feature MUST include tests:

1. **Unit tests for all new functions**
   \`\`\`typescript
   // For every new function in lib/, server/, utils/
   describe('functionName', () => {
     it('should handle happy path', () => { /* ... */ });
     it('should handle edge cases', () => { /* ... */ });
     it('should handle errors', () => { /* ... */ });
   });
   \`\`\`

2. **Integration tests for API routes**
   \`\`\`typescript
   // For every new API endpoint
   describe('POST /api/resource', () => {
     it('should create resource with valid input', async () => { /* ... */ });
     it('should return 400 for invalid input', async () => { /* ... */ });
     it('should return 401 for unauthenticated request', async () => { /* ... */ });
   });
   \`\`\`

3. **Component tests for React components** (if applicable)
   \`\`\`typescript
   // For every new component
   describe('ComponentName', () => {
     it('should render correctly', () => { /* ... */ });
     it('should handle user interactions', () => { /* ... */ });
   });
   \`\`\`
```

### Coverage Verification Pattern (for validator agent)

```markdown
### Test Coverage Gate (Production Mode)

**Command:**
\`\`\`bash
npm run test:coverage
# Or: vitest run --coverage
\`\`\`

**Pass criteria (production mode):**
- Overall coverage >= 70%
- No uncovered security-sensitive code

**Coverage assessment:**
| Metric | Threshold | Status |
|--------|-----------|--------|
| Statements | >= 70% | {PASS/FAIL} |
| Branches | >= 70% | {PASS/FAIL} |
| Functions | >= 70% | {PASS/FAIL} |
| Lines | >= 70% | {PASS/FAIL} |

**MVP mode:** Coverage check skipped
```

---

## Security Patterns

### Input Validation Pattern

```typescript
// lib/validation.ts - Standard input validation
import { z } from 'zod';

// Define schema
export const userInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().positive().optional(),
});

// Type inference
export type UserInput = z.infer<typeof userInputSchema>;

// Validation function
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
```

### Authentication Check Pattern

```typescript
// server/auth.ts - Standard auth check
export async function requireAuth(req: Request) {
  const session = await getSession(req);
  if (!session?.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return session.user;
}

// Usage in API route
export async function POST(req: Request) {
  const user = await requireAuth(req);
  // ... proceed with authenticated user
}
```

### Environment Variable Pattern

```typescript
// lib/env.ts - Type-safe environment variables
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex
});

export const env = envSchema.parse(process.env);
```

### SQL Injection Prevention Pattern

```typescript
// NEVER do this:
// const user = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;

// ALWAYS use parameterized queries:
const user = await prisma.user.findUnique({
  where: { id: userId }, // Prisma handles parameterization
});

// If raw SQL is necessary, use parameterization:
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE role = ${role}::text
`;
```

### Security Checklist Pattern (for validator agent)

```markdown
### Security Validation (Production Mode)

**Checks performed:**

1. **Hardcoded Secrets Detection**
   \`\`\`bash
   # Check for hardcoded secrets
   grep -rn "API_KEY\s*=\s*['\"]" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env"
   grep -rn "SECRET\s*=\s*['\"]" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env"
   grep -rn "PASSWORD\s*=\s*['\"]" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env"
   \`\`\`
   **Pass criteria:** No matches (all secrets from env vars)

2. **XSS Vulnerability Check**
   \`\`\`bash
   # Check for dangerous HTML rendering
   grep -rn "dangerouslySetInnerHTML" src/ --include="*.tsx"
   \`\`\`
   **Pass criteria:** Zero usage OR each usage reviewed and sanitized

3. **SQL Injection Check**
   \`\`\`bash
   # Check for raw SQL with string interpolation
   grep -rn "\$queryRaw\`" src/ --include="*.ts" | grep -v "::text"
   grep -rn "query(" src/ --include="*.ts" | head -10
   \`\`\`
   **Pass criteria:** All queries use parameterization

4. **Dependency Vulnerabilities**
   \`\`\`bash
   npm audit --audit-level=high
   \`\`\`
   **Pass criteria:** No high or critical vulnerabilities

5. **Auth Middleware Check**
   \`\`\`bash
   # Verify protected routes have auth
   grep -rn "requireAuth\|getSession\|auth(" src/app/api/ --include="*.ts"
   \`\`\`
   **Pass criteria:** All protected endpoints have auth checks

**Security status:** {PASS/FAIL}
**Issues found:** {List if any}
```

---

## CI/CD Patterns

### GitHub Actions Workflow Pattern

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [quality, test]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
```

### CI/CD Generation Pattern (for builder agent)

```markdown
### CI/CD Generation (Production Mode)

When `mode=production`, check for and generate CI/CD:

1. **Check if CI workflow exists:**
   \`\`\`bash
   ls .github/workflows/ci.yml 2>/dev/null
   \`\`\`

2. **If not exists, create from template:**
   - Create `.github/workflows/` directory
   - Generate `ci.yml` with quality -> test -> build pipeline
   - Include TypeScript check, lint, test with coverage, build stages

3. **Workflow requirements:**
   - Triggers on push to main and pull_request
   - Uses concurrency to cancel in-progress runs
   - Jobs have proper dependencies (test needs quality, build needs both)
   - Coverage artifacts uploaded
```

### CI/CD Verification Pattern (for validator agent)

```markdown
### CI/CD Verification (Production Mode)

**Check 1: Workflow exists**
\`\`\`bash
test -f .github/workflows/ci.yml && echo "EXISTS" || echo "MISSING"
\`\`\`
**Pass criteria:** EXISTS

**Check 2: Required stages present**
\`\`\`bash
grep -E "(tsc|typecheck|lint|test|build)" .github/workflows/ci.yml
\`\`\`
**Pass criteria:** All four stages present (typecheck, lint, test, build)

**Check 3: Trigger configuration**
\`\`\`bash
grep -E "(push:|pull_request:)" .github/workflows/ci.yml
\`\`\`
**Pass criteria:** Both triggers configured

**CI/CD status:** {PASS/FAIL}
```

---

## Error Handling Patterns

### API Error Response Pattern

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 'NOT_FOUND', 404);
  }
}
```

### Error Handling in API Routes Pattern

```typescript
// app/api/resource/route.ts
import { NextResponse } from 'next/server';
import { AppError, ValidationError } from '@/lib/errors';
import { resourceSchema } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = resourceSchema.parse(body);

    // ... process request

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    // Unknown error - log and return generic message
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Healer Category Patterns

### Test Failure Healing Pattern

```markdown
## Test Failures

**Common causes:**
- Broken assertions (expected vs actual mismatch)
- Missing mocks (undefined dependencies)
- Async test issues (missing await)
- Snapshot mismatches
- Test environment not setup
- Incorrect mock data

**Fix approach:**
1. Read test to understand intent
2. Run test in isolation: `npm test -- --run {testFile}`
3. Compare expected vs actual output
4. Determine if test or code is wrong:
   - If code is wrong: Fix the implementation
   - If test is wrong: Update assertions
5. Verify fix with full test suite

**Example fix (async issue):**
\`\`\`typescript
// Before (failing):
it('should fetch data', () => {
  const result = fetchData(); // Missing await!
  expect(result).toEqual(expected);
});

// After (passing):
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toEqual(expected);
});
\`\`\`
```

### Security Issue Healing Pattern

```markdown
## Security Concerns

**Common causes:**
- Hardcoded secrets in code
- Missing input validation
- Insufficient authorization checks
- Vulnerable dependencies
- Improper error exposure
- Missing rate limiting

**Fix approach:**
1. Move hardcoded secrets to environment variables
2. Add Zod validation schemas at API boundaries
3. Add authorization middleware to protected routes
4. Update vulnerable dependencies: `npm update {package}`
5. Sanitize error messages (don't expose stack traces)
6. Add rate limiting configuration if needed

**Example fix (hardcoded secret):**
\`\`\`typescript
// Before (security issue):
const apiKey = "sk-abc123secret";

// After (secure):
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('API_KEY not configured');
\`\`\`
```

---

## Import Order Convention

```typescript
// 1. Node.js built-ins
import path from 'path';
import crypto from 'crypto';

// 2. External packages
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

// 3. Internal aliases (@/)
import { env } from '@/lib/env';
import { validateInput } from '@/lib/validation';

// 4. Relative imports
import { localHelper } from './helpers';
import type { LocalType } from './types';

// 5. Type-only imports last
import type { User } from '@/types';
```

## Code Quality Standards

- **TypeScript strict mode:** All code must compile with strict: true
- **No any types:** Use proper types or unknown with type guards
- **No console.log in production:** Use proper logging or remove
- **Proper error handling:** All async code must handle errors
- **Comments for complexity:** Add comments for non-obvious logic
- **Self-documenting code:** Clear variable and function names

## Markdown Conventions for Agent Files

- Use `##` for major sections
- Use `###` for subsections
- Use `####` sparingly for deep nesting
- Use code blocks with language tags for all code
- Use bullet lists for requirements
- Use numbered lists for sequential steps
- Use bold for important terms
- Use inline code for file names, commands, and variables
