# Technology Stack

## Overview

This iteration modifies 2L framework agent prompts (markdown files). No new runtime dependencies are introduced. The changes define patterns and requirements that generated projects will follow.

## Core Framework Changes

**Decision:** Modify existing 2L agent markdown files

**Rationale:**
- All changes are prompt engineering, not code changes
- Reuses existing 2L infrastructure (spawn_task, config.yaml, events.jsonl)
- No new dependencies in 2L framework itself
- Backward compatible with existing projects

**Files Modified:**
- `commands/2l-prod.md` (NEW)
- `commands/2l-mvp.md` (minor updates)
- `agents/2l-builder.md`
- `agents/2l-validator.md`
- `agents/2l-planner.md`
- `agents/2l-healer.md`

## Testing Framework (for generated projects)

**Decision:** Vitest with v8 coverage provider

**Rationale:**
- Already standard in 2L-generated projects (wealth, mirror-of-dreams, ai-mafia)
- Fast, Vite-native test runner
- Excellent TypeScript support
- v8 coverage provider is accurate and fast

**Configuration Pattern:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom', // For React components
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## CI/CD Platform

**Decision:** GitHub Actions

**Rationale:**
- Native GitHub integration
- Already proven in wealth and mirror-of-dreams projects
- Free for public repositories
- Supports all required stages (lint, typecheck, test, build)

**Workflow Structure:**
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
```

## Security Scanning

**Decision:** Static analysis via code patterns (no external tools required)

**Rationale:**
- No additional dependencies
- Fast and deterministic
- Catches common vulnerabilities (hardcoded secrets, XSS, SQL injection)
- Can be expanded later with dedicated security agent

**Security Checks:**
1. Hardcoded secrets (grep for API_KEY, SECRET, PASSWORD patterns)
2. XSS vulnerabilities (dangerouslySetInnerHTML usage audit)
3. SQL injection (raw query string interpolation)
4. npm audit for dependency vulnerabilities
5. Environment variable validation
6. Auth middleware presence on protected routes

## Input Validation

**Decision:** Zod schemas at API boundaries

**Rationale:**
- Already standard in 2L projects
- Type-safe runtime validation
- Excellent TypeScript integration
- Clear error messages

**Pattern:**
```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

## Coverage Thresholds

**Decision:** 70% minimum coverage (production mode)

**Rationale:**
- Achievable without excessive effort
- Ensures meaningful test coverage
- Industry standard for MVPs
- MVP mode bypasses this requirement entirely

**Coverage Targets by Code Type:**
- Utility functions: 90%+
- API routes: 85%+
- React components: 80%+
- Configuration: 70%+
- Security-sensitive: 95%+

## Environment Variables

**Decision:** Type-safe env validation with Zod

**Pattern:**
```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env);
```

## Rate Limiting

**Decision:** Tiered rate limits (documented in patterns)

**Tiers:**
- Auth endpoints: 5 requests/minute (brute force protection)
- AI endpoints: 10 requests/minute (cost protection)
- Write endpoints: 30 requests/minute (abuse protection)
- Global: 100 requests/minute (flood protection)

## Mode Configuration

**Decision:** Mode stored in iteration context and propagated to all agents

**Implementation:**
- `/2l-prod` command sets `mode: production` in context
- `/2l-mvp` command sets `mode: mvp` in context (or omits for default MVP behavior)
- All agents receive mode in spawn_task prompt
- Agents conditionally enable/disable features based on mode

## Dependencies Overview

**2L Framework (no changes):**
- Existing markdown-based agent system
- spawn_task for agent invocation
- config.yaml for state persistence
- events.jsonl for observability

**Generated Projects (patterns defined):**
- vitest: ^2.0.0 - Test runner
- @vitest/coverage-v8: ^2.0.0 - Coverage reporting
- zod: ^3.0.0 - Input validation
- typescript: ^5.0.0 - Type checking
- eslint: ^8.0.0 - Linting
- prettier: ^3.0.0 - Code formatting

## Performance Targets

**CI Pipeline:**
- Quality job: < 2 minutes
- Test job: < 5 minutes
- Build job: < 3 minutes
- Total pipeline: < 10 minutes

**Test Execution:**
- Unit tests: < 30 seconds
- Coverage calculation: < 1 minute

## Security Considerations

**Implemented in this iteration:**
- Hardcoded secrets detection
- XSS pattern detection
- SQL injection pattern detection
- Dependency vulnerability scanning (npm audit)
- Input validation requirements

**Out of scope (future):**
- DAST (Dynamic Application Security Testing)
- Penetration testing
- OWASP full checklist
- Security-focused agent specialization
