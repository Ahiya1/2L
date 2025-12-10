# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
Existing Production Patterns & Templates

## Vision Summary
Enhance 2L to produce production-ready applications by default through embedded testing requirements, CI/CD generation, and security validation gates.

---

## Existing Templates

### 1. `/home/ahiya/Ahiya/2L/templates/improvement-vision.md`

**Purpose:** Template for auto-generated visions addressing recurring patterns
**Structure:**
- Problem Statement with pattern metadata (ID, occurrences, severity)
- Impact Analysis with metrics (healing rounds, files modified, duration)
- Proposed Solution with affected components
- Feature Breakdown with acceptance criteria
- Success Criteria with verification methods
- Affected Components with safety constraints (blocked files list)

**Relevance to Plan-12:**
- Could be adapted for security vulnerability vision templates
- Pattern tracking structure useful for recurring security issues

### 2. `/home/ahiya/Ahiya/2L/templates/reflection-template.md`

**Purpose:** Structured reflection format for capturing learnings
**Structure:**
- Meta section (id, state, sources, pattern_keys, embodiment_links)
- What Happened (factual narrative)
- Tensions (conflicts with identity/protocol)
- Pattern identification
- Implications for 2L

**Relevance to Plan-12:**
- Could inform test failure reflection templates
- Pattern vocabulary useful for categorizing security issues

### Missing Templates Needed for Plan-12
- **NO** patterns-template.md exists (vision mentions creating one)
- **NO** CI/CD workflow template exists
- **NO** test file structure template exists
- **NO** security checklist template exists

---

## CI/CD Patterns from Production Projects

### Pattern 1: wealth - Dual Workflow Strategy

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/.github/workflows/`

#### test.yml (Quality Gates)
```yaml
name: Test
on:
  pull_request:
    branches: [main]
  push:
    branches-ignore: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code (actions/checkout@v4)
      - Setup Node.js 20 with npm cache
      - Install dependencies (npm ci)
      - TypeScript type checking (npx tsc --noEmit)
      - Linting (npm run lint)
      - Tests (npm test) [continue-on-error: true]
```

**Key Patterns:**
- Triggers on PRs to main AND pushes to non-main branches
- Sequential steps: checkout -> node setup -> install -> typecheck -> lint -> test
- Test step uses `continue-on-error: true` (permissive - NOT production-ready)
- No coverage reporting
- No build step in quality workflow

#### deploy.yml (Production Deployment)
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout, Node setup, Install
      - Run database migrations (Prisma)
      - Generate Prisma Client
```

**Key Patterns:**
- Triggers on push to main OR manual dispatch
- Handles database migrations with baseline logic
- Uses secrets for DATABASE_URL and DIRECT_URL
- Assumes Vercel auto-deploys (comment mentions this)

### Pattern 2: mirror-of-dreams - Unified CI Workflow

**Location:** `/home/ahiya/Ahiya/2L/Prod/mirror-of-dreams/.github/workflows/ci.yml`

```yaml
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
    steps:
      - TypeScript check (npm run typecheck)
      - ESLint (npm run lint)
      - Formatting check (npm run format:check)

  test:
    name: Tests
    needs: quality
    steps:
      - Tests with coverage (npm run test:coverage)
      - Upload coverage artifact (actions/upload-artifact@v4)

  build:
    name: Build
    needs: [quality, test]
    steps:
      - Build application (npm run build)
```

**Key Patterns (More Production-Ready):**
- Concurrency control prevents duplicate runs
- Job dependencies: quality -> test -> build
- Separate jobs for quality, test, build (parallel where possible)
- Coverage artifact upload for visibility
- Format checking included
- Uses `npm run test:coverage` (proper coverage command)

### Recommended CI/CD Template for 2L

Based on mirror-of-dreams pattern (more mature):

```yaml
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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
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
      - uses: actions/upload-artifact@v4
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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

---

## Testing Patterns

### Test File Structure

**Pattern 1: Colocated `__tests__` directories (wealth)**
```
src/
  server/
    api/
      routers/
        __tests__/
          transactions.router.test.ts
          goals.router.test.ts
          budgets.router.test.ts
          accounts.router.test.ts
        transactions.router.ts
        goals.router.ts
    services/
      __tests__/
        plaid.service.test.ts
        categorize.service.test.ts
  lib/
    __tests__/
      encryption.test.ts
      csvExport.test.ts
```

**Pattern 2: Naming convention**
- `*.test.ts` for all test files
- Tests named after source file: `encryption.ts` -> `encryption.test.ts`
- Router tests follow: `{name}.router.test.ts`
- Service tests follow: `{name}.service.test.ts`

### Test Structure Pattern

**Good Example: `/home/ahiya/Ahiya/2L/Prod/wealth/src/lib/__tests__/encryption.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../encryption'

describe('Encryption utilities', () => {
  describe('encrypt', () => {
    it('should encrypt a string', () => {
      const plaintext = 'test-token'
      const encrypted = encrypt(plaintext)
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plaintext)
    })

    it('should throw error if ENCRYPTION_KEY is not set', () => {
      const oldKey = process.env.ENCRYPTION_KEY
      delete process.env.ENCRYPTION_KEY
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set')
      process.env.ENCRYPTION_KEY = oldKey
    })
  })

  describe('encrypt/decrypt round-trip', () => {
    it('should handle empty string', () => { ... })
    it('should handle long strings', () => { ... })
    it('should handle Unicode characters', () => { ... })
  })
})
```

**Key Patterns:**
- Nested `describe` blocks for logical grouping
- Happy path tests AND error cases
- Environment variable handling (save/restore)
- Round-trip testing for transformations
- Edge cases (empty, long, unicode)

### Vitest Configuration Patterns

**Pattern 1: Node environment (wealth - backend focused)**
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.config.ts', 'prisma/'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

**Pattern 2: DOM environment (mirror-of-dreams - frontend focused)**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', '.2L'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'server/**/*.ts', 'types/**/*.ts'],
      exclude: ['**/*.d.ts', '**/__tests__/**', '**/test/**'],
    },
    setupFiles: ['./vitest.setup.ts'],
    alias: { '@': path.resolve(__dirname, './'), ... },
  },
})
```

**Key Differences:**
- Backend: `environment: 'node'`
- Frontend: `environment: 'happy-dom'` + `plugins: [react()]`
- Both use v8 coverage provider
- Both use setup files for environment variables

### Test Setup Pattern

**`vitest.setup.ts` template:**
```typescript
import { beforeAll, beforeEach, vi } from 'vitest'
import crypto from 'crypto'

// Set up test environment variables BEFORE any modules load
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:54432/postgres'

// External service mocks (dummy values for unit tests)
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54421'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.ANTHROPIC_API_KEY = 'sk-ant-test'

beforeAll(() => {
  console.log('Test environment initialized')
})

beforeEach(() => {
  vi.resetAllMocks()
})

global.fetch = vi.fn()
```

### Test Utilities Pattern

**`test-utils.ts` template:**
```typescript
import { PrismaClient } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended'

export function createMockPrisma(): DeepMockProxy<PrismaClient> {
  return mockDeep<PrismaClient>()
}

export function createMockContext(userId: string = 'test-user-id') {
  return {
    prisma: createMockPrisma(),
    user: { id: userId, email: 'test@example.com', role: 'USER' },
    session: { access_token: 'test-token', ... },
  }
}

export const fixtures = {
  user: (overrides = {}) => ({ id: 'test-user-id', email: 'test@example.com', ...overrides }),
  account: (overrides = {}) => ({ ... }),
  transaction: (overrides = {}) => ({ ... }),
}
```

---

## Security Patterns

### Pattern 1: Zod Input Validation

**Consistent across both projects:**

```typescript
// Router-level validation
export const transactionsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        accountId: z.string().min(1, 'Account is required'),
        date: z.date(),
        amount: z.number(),
        payee: z.string().min(1, 'Payee is required'),
        categoryId: z.string().min(1, 'Category is required'),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => { ... })
})
```

**Key Patterns:**
- All inputs validated with Zod schemas
- Custom error messages for required fields
- Optional fields explicitly marked
- No raw user input reaches database

### Pattern 2: Centralized Schema Files

**mirror-of-dreams approach (`types/schemas.ts`):**
```typescript
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
})

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  language: z.enum(['en', 'he']).optional(),
})
```

**Benefits:**
- Reusable across routes
- Single source of truth for validation
- Easy to audit for security

### Pattern 3: Authentication Middleware

**tRPC protected procedure pattern:**
```typescript
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.supabaseUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    })
  }
  // Fetch fresh user from database
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
  })
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' })
  }
  return next({ ctx: { user, ... } })
})
```

**Key Patterns:**
- Early auth check before any logic
- Fresh database lookup (don't trust stale context)
- Proper TRPCError codes (UNAUTHORIZED, FORBIDDEN)

### Pattern 4: Authorization Checks in Mutations

```typescript
// Verify resource belongs to user before mutation
const account = await ctx.prisma.account.findUnique({
  where: { id: input.accountId },
})
if (!account || account.userId !== ctx.user!.id) {
  throw new TRPCError({ code: 'NOT_FOUND' })
}
```

**Key Patterns:**
- Always verify ownership before mutations
- Return NOT_FOUND (not FORBIDDEN) to avoid enumeration
- Check AFTER fetching (don't trust client-provided userId)

### Pattern 5: Role-Based Access Control

```typescript
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  // Fetch fresh role from database
  const userWithRole = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { id: true, email: true, role: true }
  })
  if (!userWithRole || userWithRole.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }
  return next({ ctx: { user: userWithRole, ... } })
})
```

### Pattern 6: Error Logging (Sentry Integration)

```typescript
const errorMiddleware = t.middleware(async ({ next, ctx, path, type }) => {
  try {
    return await next({ ctx })
  } catch (error) {
    Sentry.captureException(error, {
      user: ctx.user ? { id: ctx.user.id.substring(0, 3) + '***' } : undefined,
      tags: { endpoint: path },
    })
    throw error
  }
})
```

**Key Patterns:**
- User ID anonymized in logs (only first 3 chars)
- Endpoint tagged for debugging
- Error re-thrown after logging

### Pattern 7: Environment Variable Handling

```typescript
// vitest.setup.ts pattern - secrets in env vars
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')
process.env.DATABASE_URL = 'postgresql://...'

// Runtime validation pattern
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set')
}
```

### Security Patterns NOT Found (Gaps to Address)

1. **No XSS sanitization utilities** - No DOMPurify or similar
2. **No CSP configuration** - No Content-Security-Policy headers
3. **No rate limiting patterns** - No throttling on sensitive endpoints
4. **No SQL injection examples** - All use Prisma (safe), but no explicit warnings
5. **No secret scanning** - No grep for hardcoded secrets in CI

---

## Template Recommendations

### 1. Create `templates/ci-workflow-template.yml`

Based on mirror-of-dreams pattern with enhancements:

```yaml
# Standard 2L CI workflow template
# Copy to: .github/workflows/ci.yml

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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      # Security: Check for hardcoded secrets
      - name: Check for secrets in code
        run: |
          if grep -rE "(API_KEY|SECRET|PASSWORD|TOKEN)\s*=\s*['\"][^'\"]+['\"]" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules .; then
            echo "ERROR: Potential hardcoded secrets found"
            exit 1
          fi

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
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "ERROR: Coverage ($COVERAGE%) is below 70% threshold"
            exit 1
          fi
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm audit --audit-level=high

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [quality, test, security]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

### 2. Create `templates/vitest-config-template.ts`

```typescript
// Standard 2L vitest configuration template
// Adjust environment based on project type

import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Use 'happy-dom' for frontend-heavy projects
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', '.2L', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.ts',
        '**/*.config.js',
        'prisma/',
        '.2L/',
      ],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 3. Create `templates/vitest-setup-template.ts`

```typescript
// Standard 2L test setup template

import { beforeAll, beforeEach, vi } from 'vitest'
import crypto from 'crypto'

// Environment setup - MUST run before module imports
process.env.NODE_ENV = 'test'

// Generate test encryption key if needed
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')
}

// Database URLs (override in CI if needed)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test'

// External service mocks (use dummy values)
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'

beforeAll(() => {
  console.log('Test environment initialized')
})

beforeEach(() => {
  vi.resetAllMocks()
})

// Global fetch mock
global.fetch = vi.fn()
```

### 4. Create `templates/patterns-template.md`

Add production sections to existing patterns.md structure:

```markdown
# Implementation Patterns

## Testing Patterns

### Test File Structure
- Place tests in `__tests__` directories adjacent to source files
- Name test files: `{source}.test.ts` or `{source}.test.tsx`
- Group related tests in `describe` blocks

### Test Requirements
- Every feature must have at least one test file
- Tests must cover:
  - Happy path (normal operation)
  - At least one error case
  - Edge cases for complex logic

### Mocking Strategy
- Use `vitest-mock-extended` for Prisma mocking
- Create `test-utils.ts` with mock context factories
- Use fixtures for consistent test data

## Security Patterns

### Input Validation
- All API inputs MUST use Zod schemas
- Define schemas in `types/schemas.ts` for reuse
- Include custom error messages for user-facing validation

### Authentication
- Use `protectedProcedure` for all authenticated routes
- Never trust client-provided user IDs
- Always verify resource ownership before mutations

### Authorization
- Check ownership: `resource.userId === ctx.user.id`
- Return NOT_FOUND for unauthorized access (prevent enumeration)
- Use `adminProcedure` for admin-only routes

### Secrets Management
- NEVER hardcode API keys, passwords, or secrets
- Use environment variables for all sensitive configuration
- Validate required env vars at startup

## Error Handling Patterns

### API Errors
- Use TRPCError with appropriate codes
- Log errors to Sentry (if configured)
- Anonymize user data in logs

### Validation Errors
- Return Zod errors in standardized format
- Provide user-friendly error messages

## CI/CD Patterns

### GitHub Actions
- Run quality checks first (typecheck, lint)
- Run tests with coverage after quality
- Run security audit (npm audit)
- Build only after all checks pass

### Coverage Requirements
- Minimum 70% line coverage for PASS
- Coverage artifacts uploaded for visibility
```

### 5. Create `templates/security-checklist-template.md`

For validator to use:

```markdown
# Security Validation Checklist

## Input Validation
- [ ] All API endpoints use Zod schemas for input validation
- [ ] No raw user input reaches database without validation
- [ ] File uploads are validated (if applicable)

## Authentication
- [ ] Protected routes use `protectedProcedure` or equivalent
- [ ] Session tokens are properly validated
- [ ] Auth state is fetched fresh from database

## Authorization
- [ ] Resource ownership verified before mutations
- [ ] Admin routes properly gated
- [ ] NOT_FOUND returned for unauthorized access (not FORBIDDEN)

## Secrets
- [ ] No hardcoded API keys in code
- [ ] No hardcoded passwords in code
- [ ] No secrets in git history
- [ ] Environment variables used for sensitive config

## XSS Prevention
- [ ] No use of `dangerouslySetInnerHTML` without sanitization
- [ ] User input escaped in JSX
- [ ] Rich text properly sanitized

## SQL Injection
- [ ] No raw SQL queries with string interpolation
- [ ] Prisma/ORM used for all database queries
- [ ] Raw queries (if any) use parameterized values

## Dependencies
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Dependencies are up to date (no known CVEs)
```

---

## Summary of Findings

### Strengths in Existing Patterns
1. **Consistent Zod validation** across all production projects
2. **Well-structured auth middleware** with proper error codes
3. **Good vitest configuration** with v8 coverage
4. **Test utilities pattern** (mock context, fixtures) exists

### Gaps to Address in Plan-12
1. **No templates directory structure** for production patterns
2. **CI/CD varies between projects** - need standardization
3. **No coverage enforcement** in CI (continue-on-error: true in wealth)
4. **No security scanning** in CI workflows
5. **No explicit security checklist** for validators
6. **Test coverage quality varies** (some placeholder tests)

### Recommendations for Implementation

1. **Builder Updates:**
   - Reference new patterns-template.md for test/security sections
   - Generate CI workflow from template if missing
   - Output test files alongside feature files

2. **Validator Updates:**
   - Add security checklist validation
   - Add coverage threshold checking (70%)
   - Verify CI workflow exists and has required stages

3. **Planner Updates:**
   - Include production patterns sections in patterns.md
   - Reference templates for consistency

4. **Template Priority:**
   - HIGH: `ci-workflow-template.yml` (most reusable)
   - HIGH: `patterns-template.md` (guides builders)
   - MEDIUM: `vitest-config-template.ts` (project setup)
   - MEDIUM: `security-checklist-template.md` (validator reference)

---

*Exploration completed: 2025-12-10*
*This report informs master planning decisions for Plan-12: 2L Production Hardening*
