# Explorer 3 Report: CI/CD and Testing Patterns

## Executive Summary

Analysis of production projects (wealth, mirror-of-dreams, ai-mafia) reveals mature CI/CD and testing patterns that should be standardized for all 2L-built projects. Key findings include a tiered CI workflow architecture, consistent Vitest configuration patterns with coverage thresholds, well-organized test file structures using `__tests__` directories, and robust security patterns for authentication, encryption, and rate limiting.

## CI/CD Workflow Template

### Best Practices from Existing Workflows

**Source Files Analyzed:**
- `/home/ahiya/Ahiya/2L/Prod/wealth/.github/workflows/deploy.yml`
- `/home/ahiya/Ahiya/2L/Prod/wealth/.github/workflows/test.yml`
- `/home/ahiya/Ahiya/2L/Prod/mirror-of-dreams/.github/workflows/ci.yml`

### Workflow Architecture Patterns

#### Pattern 1: Separation of Concerns (wealth)
- **test.yml**: Runs on PRs and non-main branches
- **deploy.yml**: Runs on main branch pushes and manual dispatch

**Strengths:**
- Clear separation between validation and deployment
- Allows manual deployment triggers via `workflow_dispatch`
- Database migrations handled during deploy, not build

#### Pattern 2: Unified CI Pipeline (mirror-of-dreams)
- Single `ci.yml` with three sequential jobs: quality -> test -> build
- Uses `concurrency` to cancel in-progress runs on same branch
- Job dependencies ensure quality gates before expensive operations

**Strengths:**
- Concurrency control prevents resource waste
- Clear job dependency chain
- Coverage artifacts uploaded for analysis

### Recommended CI Workflow Template

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
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript check
        run: npx tsc --noEmit

      - name: Run ESLint
        run: npm run lint

      - name: Check formatting
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
        continue-on-error: true

      - name: Upload coverage report
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

      - name: Build application
        run: npm run build
```

### Deploy Workflow Template (Database Migrations)

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    name: Run Migrations
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
        run: |
          npx prisma migrate deploy --schema=prisma/schema.prisma

      - name: Generate Prisma Client
        run: npx prisma generate --schema=prisma/schema.prisma
```

## Test Configuration Template

### Vitest Configuration Patterns

**Source Files Analyzed:**
- `/home/ahiya/Ahiya/2L/Prod/wealth/vitest.config.ts`
- `/home/ahiya/Ahiya/2L/Prod/mirror-of-dreams/vitest.config.ts`
- `/home/ahiya/Ahiya/2L/Prod/ai-mafia/2L-test/app/vitest.config.ts`

### Pattern 1: Node Environment (Backend/API)

```typescript
// vitest.config.ts - For backend/API testing
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.config.ts',
        'prisma/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Pattern 2: Happy-DOM Environment (Frontend/React)

```typescript
// vitest.config.ts - For React component testing
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

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
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/types': path.resolve(__dirname, './types'),
      '@/server': path.resolve(__dirname, './server'),
      '@/test': path.resolve(__dirname, './test'),
    },
  },
});
```

### Pattern 3: With Coverage Thresholds (Strict)

```typescript
// vitest.config.ts - With enforced coverage thresholds
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/cli/**',
        'src/test-*.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Setup File Template

```typescript
// vitest.setup.ts - Standard test environment setup
import { beforeAll, beforeEach, vi } from 'vitest'
import crypto from 'crypto'

// Set up test environment variables BEFORE any modules load
process.env.NODE_ENV = 'test'

// Generate test encryption key if needed
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')

// Database URLs (local test database)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54432/postgres'
process.env.DIRECT_URL = process.env.DIRECT_URL || 'postgresql://postgres:postgres@localhost:54432/postgres'

// Supabase test config
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54421'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'

// App configuration
process.env.DOMAIN = 'http://localhost:3000'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'

// API keys (test values)
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-test'
process.env.CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret'

// Reset mocks between tests
beforeEach(() => {
  vi.resetAllMocks();
});

// Global fetch mock (can be overridden in individual tests)
global.fetch = vi.fn();

beforeAll(() => {
  console.log('Test environment initialized')
})
```

## Test File Organization

### Directory Structure Pattern

```
src/
  lib/
    __tests__/
      encryption.test.ts
      csvExport.test.ts
      fileParser.service.test.ts
  server/
    api/
      routers/
        __tests__/
          accounts.router.test.ts
          transactions.router.test.ts
      __tests__/
        test-utils.ts
    services/
      __tests__/
        plaid.service.test.ts
        categorize.service.test.ts
    lib/
      __tests__/
        rate-limiter.test.ts
        logger.test.ts
    trpc/
      __tests__/
        middleware.test.ts
        auth-security.test.ts
lib/
  utils/
    __tests__/
      limits.test.ts
      retry.test.ts
```

### Naming Conventions

1. **Test files**: `{module-name}.test.ts` or `{module-name}.test.tsx`
2. **Test directories**: `__tests__/` within the parent module directory
3. **Test utilities**: `test-utils.ts` in shared `__tests__/` directories
4. **Service tests**: `{service-name}.service.test.ts`
5. **Router tests**: `{router-name}.router.test.ts`

### Test Structure Pattern

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

### Test Utilities Template

```typescript
// test-utils.ts - Shared test utilities
import { PrismaClient } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended'

/**
 * Create a mock Prisma client for testing
 */
export function createMockPrisma(): DeepMockProxy<PrismaClient> {
  return mockDeep<PrismaClient>()
}

/**
 * Create a mock tRPC context for testing
 */
export function createMockContext(userId: string = 'test-user-id') {
  const prisma = createMockPrisma()

  return {
    prisma,
    user: {
      id: userId,
      email: 'test@example.com',
      role: 'USER' as const,
    },
    session: {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      user: {
        id: 'auth-id',
        email: 'test@example.com',
      },
    },
  }
}

/**
 * Helper to create test data fixtures
 */
export const fixtures = {
  user: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  // Add more fixtures as needed
}
```

## Security Patterns

### Encryption Pattern

**Source:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/lib/encryption.ts`

```typescript
// lib/encryption.ts - AES-256-GCM encryption for sensitive data
import * as crypto from 'crypto'

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex')
const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(encrypted: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  const parts = encrypted.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format')
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encryptedText = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encryptedText).toString('utf8') + decipher.final('utf8')
}
```

### Rate Limiting Pattern

**Source:** `/home/ahiya/Ahiya/2L/Prod/mirror-of-dreams/server/lib/__tests__/rate-limiter.test.ts`

**Tiered Rate Limits:**
- **Auth endpoints (Tier 1):** 5 requests/minute - Strictest for brute force protection
- **AI endpoints (Tier 2):** 10 requests/minute - Protects expensive AI operations
- **Write endpoints (Tier 3):** 30 requests/minute - Standard write protection
- **Global (Tier 4):** 100 requests/minute - General flood protection

```typescript
// Rate limit configuration
const RATE_LIMITS = {
  auth: { requests: 5, window: '1m' },
  ai: { requests: 10, window: '1m' },
  write: { requests: 30, window: '1m' },
  global: { requests: 100, window: '1m' },
}

// Rate limit bypass for admin/creator
function shouldBypassRateLimit(user: User | null): boolean {
  if (!user) return false;
  return user.isCreator || user.isAdmin;
}

// Client IP extraction
function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
```

### Authentication Cookie Pattern

**Source:** `/home/ahiya/Ahiya/2L/Prod/mirror-of-dreams/server/trpc/__tests__/auth-security.test.ts`

```typescript
// Cookie security configuration
const COOKIE_OPTIONS = {
  httpOnly: true,                                    // Prevents XSS access
  secure: process.env.NODE_ENV === 'production',    // HTTPS only in production
  sameSite: 'lax' as const,                         // CSRF protection
  path: '/',                                        // Available to all routes
  maxAge: 60 * 60 * 24 * 30,                       // 30 days for regular users
}

// Demo user cookie (shorter expiry)
const DEMO_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 60 * 60 * 24 * 7, // 7 days for demo users
}
```

### Security Error Handling Pattern

```typescript
// Don't reveal which field is incorrect (security best practice)
const loginErrorMessage = 'Invalid email or password';

// Rate limit error with retry information
const rateLimitError = {
  code: 'TOO_MANY_REQUESTS',
  message: 'Too many requests. Please try again later.',
  retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
}
```

## Recommended Templates

### Package.json Test Scripts Template

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit"
  }
}
```

### Required Dev Dependencies

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "vitest-mock-extended": "^2.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "happy-dom": "^14.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

### Mock Pattern Template

```typescript
// Mocking external dependencies
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 60000,
    }),
  })),
}));

// Mocking Next.js headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mocking custom modules
vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => mockLoggerInstance),
  },
}));
```

### Time Mocking Pattern

```typescript
describe('Date-dependent tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles date boundaries correctly', () => {
    // Test with fixed date
  });
});
```

## Integration Points

### CI/CD Integration Points

1. **GitHub Actions** - Primary CI/CD platform
2. **Vercel** - Auto-deploy from main branch
3. **Prisma** - Database migrations in deploy workflow
4. **Coverage Reports** - Uploaded as artifacts for review

### Testing Integration Points

1. **Prisma** - Mock with `vitest-mock-extended`
2. **Supabase** - Mock auth and database calls
3. **External APIs** - Mock with `vi.fn()` and `vi.mock()`
4. **Rate Limiting** - Mock Redis/Upstash for unit tests

## Risks and Challenges

### Technical Risks

1. **Coverage Threshold Enforcement** - Starting too high can block development
   - **Mitigation:** Start at 60% and increase gradually

2. **Flaky Tests** - Time-dependent tests can fail intermittently
   - **Mitigation:** Always use `vi.useFakeTimers()` for date-dependent tests

3. **Mock Maintenance** - Mocks can drift from actual implementation
   - **Mitigation:** Integration tests alongside unit tests

### Complexity Risks

1. **Test Setup Complexity** - Environment variables need careful management
   - **Mitigation:** Centralized `vitest.setup.ts` file

2. **CI/CD Pipeline Duration** - Full pipeline can be slow
   - **Mitigation:** Use job dependencies and concurrency controls

## Recommendations for Planner

1. **Adopt the unified CI workflow pattern** from mirror-of-dreams with quality -> test -> build job chain and concurrency controls

2. **Standardize on `__tests__/` directory pattern** for all test files, co-located with the modules they test

3. **Use happy-dom environment** for React component tests, node environment for backend/API tests

4. **Implement tiered rate limiting** (auth: 5/min, AI: 10/min, write: 30/min, global: 100/min)

5. **Use AES-256-GCM encryption** for all sensitive data storage with format: `iv:authTag:encrypted`

6. **Set initial coverage thresholds at 60%** for all metrics (lines, functions, branches, statements)

7. **Always set httpOnly, secure (prod), and sameSite=lax** on authentication cookies

8. **Create shared test utilities** (`test-utils.ts`) with mock contexts and fixtures for each project

## Resource Map

### Critical Files/Directories

| Path | Purpose |
|------|---------|
| `/home/ahiya/Ahiya/2L/Prod/mirror-of-dreams/.github/workflows/ci.yml` | Best CI workflow template |
| `/home/ahiya/Ahiya/2L/Prod/wealth/vitest.config.ts` | Node environment config |
| `/home/ahiya/Ahiya/2L/Prod/mirror-of-dreams/vitest.config.ts` | Happy-dom environment config |
| `/home/ahiya/Ahiya/2L/Prod/wealth/vitest.setup.ts` | Setup file template |
| `/home/ahiya/Ahiya/2L/Prod/wealth/src/lib/encryption.ts` | Encryption implementation |
| `/home/ahiya/Ahiya/2L/Prod/mirror-of-dreams/server/lib/__tests__/rate-limiter.test.ts` | Rate limiting tests |
| `/home/ahiya/Ahiya/2L/Prod/mirror-of-dreams/server/trpc/__tests__/auth-security.test.ts` | Auth security tests |
| `/home/ahiya/Ahiya/2L/Prod/wealth/src/server/api/__tests__/test-utils.ts` | Test utilities template |

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `vitest` | Test runner |
| `@vitest/coverage-v8` | Coverage reporting |
| `vitest-mock-extended` | Deep mocking for Prisma |
| `happy-dom` | DOM environment for React tests |
| `@vitejs/plugin-react` | React support in Vitest |
| `@upstash/ratelimit` | Rate limiting |
| `@upstash/redis` | Redis client for rate limiting |

### Testing Infrastructure

| Tool/Approach | Rationale |
|---------------|-----------|
| Vitest | Fast, Vite-native, excellent DX |
| V8 coverage | Native Node.js coverage, accurate |
| Happy-dom | Faster than jsdom for React tests |
| vitest-mock-extended | Type-safe deep mocking |
| GitHub Actions | Native GitHub integration |

## Questions for Planner

1. Should coverage thresholds be enforced immediately or introduced gradually?

2. Should we create a shared `@2l/testing` package for common test utilities across projects?

3. What is the preferred approach for E2E tests - Playwright or Cypress?

4. Should rate limiting be required for all new projects or opt-in?
