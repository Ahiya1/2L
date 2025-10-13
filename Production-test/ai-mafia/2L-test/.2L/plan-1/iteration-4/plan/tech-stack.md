# Technology Stack - Iteration 4

## Core Framework

**Decision:** Next.js 14 (App Router) - NO CHANGE

**Version:** 14.x (current)

**Rationale:**
- Already implemented in Iterations 1-3
- App Router provides excellent Server Components and SSE support
- No framework issues discovered during exploration
- API routes handle game orchestration well
- SSE streaming works correctly for real-time updates

**Alternatives Considered:**
- None - framework is working as expected

**Implementation Notes:**
- Continue using App Router patterns
- Server Components for static content
- Client Components for interactive elements
- API routes for game logic and SSE

---

## Database

**Decision:** PostgreSQL via Supabase Local (Development) + Railway (Production)

**Previous:** SQLite (dev) + PostgreSQL (prod) - CAUSES SCHEMA DRIFT

**Version:**
- PostgreSQL: 15.x
- Supabase CLI: v2.48.3 (installed)
- Prisma: v6.17.1 (current)

**Rationale:**
- **Critical Issue**: SQLite in dev vs PostgreSQL in prod causes schema mismatches
- **PRAGMA Incompatibility**: SQLite migrations use PRAGMA statements that fail in PostgreSQL
- **Production Parity**: Same database engine eliminates migration issues
- **Supabase Benefits**: Studio UI for data inspection, easy future cloud migration
- **Prerequisites Met**: Docker and Supabase CLI already installed

**Alternatives Considered:**
- **Plain Docker PostgreSQL**: Viable but loses Supabase Studio UI
- **Keep SQLite for Dev**: Rejected due to ongoing schema drift issues
- **Cloud Database for Dev**: Unnecessary cost, local is faster

**Schema Strategy:**
- Keep existing 7 models (Game, Player, DiscussionMessage, NightMessage, Vote, GameEvent, SharedGame)
- Regenerate migrations for PostgreSQL (delete old SQLite migrations)
- Export existing SQLite data (8 games, 76 players, 41 messages)
- Import data to PostgreSQL for test continuity

**Connection URL:**
```bash
# Development (Supabase Local)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Production (Railway)
DATABASE_URL="<Railway PostgreSQL URL>" # Already configured
```

**Migration Commands:**
```bash
# Start Supabase Local
supabase init
supabase start

# Generate PostgreSQL migrations
rm -rf prisma/migrations
npx prisma migrate dev --name init

# Validate schema
npx prisma validate
npx prisma studio  # Visual inspection
```

---

## AI Integration

**Decision:** Anthropic Claude API with @anthropic-ai/sdk v0.65.0 - NO CHANGE

**Model:** claude-sonnet-4-5-20250929

**Rationale:**
- **Verified Working**: Generates 40+ messages per game successfully
- **Cost Optimized**: Prompt caching reduces costs by 73% (48% hit rate achieved)
- **NO SDK Migration**: Agent SDK (v0.1.14) is wrong tool - designed for code generation, not game simulation
- **Custom Orchestration**: Current system is optimal for turn-based game mechanics

**Implementation Notes:**
- API key loading from `.anthropic-key.txt` or `ANTHROPIC_API_KEY` env var
- Retry logic: 3 attempts with exponential backoff
- Timeout: 10 seconds per turn
- Fallback responses on failure (graceful degradation)
- Cost tracking: $3/M input, $0.30/M cache read, $15/M output, $3.75/M cache write

**Caching Strategy:**
```typescript
system: [
  {
    type: 'text',
    text: systemPrompt,
    cache_control: { type: 'ephemeral' }  // 5-minute TTL
  },
  {
    type: 'text',
    text: gameStateContext,
    cache_control: { type: 'ephemeral' }
  }
]
```

**Configuration:**
- Max tokens per turn: 200
- Temperature: 1.0 (creative responses)
- Model: claude-sonnet-4-5-20250929 (best for conversation)

---

## Type Safety

**Decision:** TypeScript 5.x with Strict Mode ENABLED

**Previous:** `ignoreBuildErrors: true` - MASKS 28 ERRORS

**Rationale:**
- Current state: 28 TypeScript errors hidden by ignore flag
- Type safety prevents runtime bugs (like signature mismatch)
- Strict mode catches issues at compile time
- Production code should have zero type errors

**Configuration Changes:**

**next.config.mjs:**
```javascript
// BEFORE (WRONG)
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true  // ❌ REMOVE THIS
  }
};

// AFTER (CORRECT)
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false  // ✅ Enforce type checking
  }
};
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Type Error Categories (from exploration):**
- `any` types without explicit justification
- Component prop type mismatches
- Missing type imports
- Incorrect generic usage

**Acceptance Criteria:**
- `npx tsc --noEmit` passes with 0 errors
- `npm run build` succeeds
- All `any` types have `// @ts-expect-error` with reason OR proper types

---

## Testing Infrastructure

**Decision:** Vitest v1.x (NEW)

**Previous:** Zero test coverage

**Rationale:**
- **Existing Tests Use Vitest Syntax**: Tests already written (`vi.fn()`, not `jest.fn()`)
- **Zero Migration Effort**: Just install packages and run
- **10x Faster than Jest**: ES modules, Vite caching, parallel execution
- **Modern DX**: Watch mode, UI, coverage built-in
- **Next.js Compatible**: Official support for App Router

**Alternatives Considered:**
- **Jest**: Would require rewriting existing tests (2-3 hours)
- **Node Test Runner**: Missing React testing utilities, too basic

**Package Installation:**
```bash
npm install -D vitest@^1.0.0 \
  @vitest/ui@^1.0.0 \
  @testing-library/react@^14.0.0 \
  @testing-library/dom@^9.0.0 \
  @testing-library/jest-dom@^6.0.0 \
  happy-dom@^12.0.0 \
  vitest-mock-extended@^1.3.0
```

**Configuration:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './components'),
    },
  },
});
```

**Test Scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Coverage Targets:**
- Overall: >60%
- Critical paths (Claude client, cost tracker): >80%
- Test execution time: <60 seconds (excluding E2E)

---

## Logging

**Decision:** Pino (structured logging) - ALREADY IN USE, ENFORCE CONSISTENCY

**Version:** v10.0.0 (current)

**Rationale:**
- Already used in most of codebase
- Fast, low overhead, JSON output
- Child loggers for modules (discussion, claude, orchestrator)
- Environment-aware log levels

**Issue Found:**
- 12 console.log statements remain in `master-orchestrator.ts`
- Should use structured logger instead

**Correct Usage:**
```typescript
// BEFORE (WRONG)
console.log(`[Master Orchestrator] Starting DISCUSSION phase`);

// AFTER (CORRECT)
orchestratorLogger.info({
  gameId,
  roundNumber,
  phase: 'DISCUSSION'
}, 'Starting DISCUSSION phase');
```

**Log Levels:**
- `debug`: Detailed flow information (dev only)
- `info`: Important events (phase transitions, completions)
- `warn`: Recoverable issues (fallback responses, retries)
- `error`: Unrecoverable errors (API failures, database errors)

**Configuration:**
```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

// Module-specific loggers
export const claudeLogger = logger.child({ module: 'claude' });
export const orchestratorLogger = logger.child({ module: 'orchestrator' });
export const discussionLogger = logger.child({ module: 'discussion' });
```

**Debug Mode:**
```bash
# Enable verbose logging
LOG_LEVEL=debug npm run dev

# Production logging
LOG_LEVEL=info npm start
```

---

## Orchestration Pattern

**Decision:** Custom Round-Robin Turn-Taking - NO CHANGE

**Rationale:**
- **Verified Working**: Generates 40+ messages with proper agent coordination
- **Optimal for Use Case**: Turn-based game with sequential player actions
- **Better than Frameworks**: LangGraph/AutoGen are overkill for simple round-robin
- **Cost Optimized**: Custom caching strategy reduces costs by 73%
- **Type Safe**: TypeScript throughout with strong typing

**Architecture:**
```
Master Orchestrator (runGameLoop)
    ↓
Discussion Orchestrator (runDiscussion)
    ↓
Turn Scheduler (createTurnSchedule, advanceToNextTurn)
    ↓
Turn Executor (executeTurn)
    ↓
Context Builder (buildAgentContext)
    ↓
Claude Client (generateValidResponse)
```

**Key Features:**
- Graceful error handling with fallbacks
- Cost circuit breaker ($10 limit)
- Anti-repetition tracking
- Context window management (150K tokens)
- Event-driven real-time updates (SSE)

**Documentation:**
- Create `docs/architecture-decision-records/ADR-001-multi-agent-orchestration.md`
- Document why custom solution chosen over frameworks
- Reference Explorer-1 report for detailed analysis

---

## External Integrations

### Anthropic Claude API

**Purpose:** Generate AI agent responses

**SDK:** `@anthropic-ai/sdk` v0.65.0

**Implementation:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 200,
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' }
    }
  ],
  messages: conversationHistory
});
```

**Error Handling:**
- 429 (Rate Limit): Retry with exponential backoff
- 500+ (Server Error): Retry up to 3 times
- Timeout (>10s): Use fallback response
- 401/403/404: Throw immediately (configuration error)

---

## Environment Variables

**Required:**

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Anthropic API
ANTHROPIC_API_KEY="sk-ant-api03-..."  # OR use .anthropic-key.txt

# Node Environment
NODE_ENV="development"  # or "production"

# Logging
LOG_LEVEL="debug"  # or "info" for production

# Cost Tracking
MAX_COST_PER_GAME="10.00"  # Circuit breaker limit
```

**Optional:**

```bash
# Railway Deployment
RAILWAY_ENVIRONMENT="production"

# Next.js
PORT="3000"
```

---

## Dependencies Overview

**Core Dependencies (No Changes):**
- `next`: ^14.x - Web framework
- `react`: ^18.x - UI library
- `@anthropic-ai/sdk`: 0.65.0 - Claude API client
- `@prisma/client`: 6.17.1 - Database ORM
- `pino`: 10.0.0 - Structured logging
- `zod`: 3.25.76 - Schema validation

**New Dependencies (Testing):**
- `vitest`: ^1.0.0 - Test runner
- `@vitest/ui`: ^1.0.0 - Test UI
- `@testing-library/react`: ^14.0.0 - React testing
- `@testing-library/dom`: ^9.0.0 - DOM testing
- `@testing-library/jest-dom`: ^6.0.0 - DOM matchers
- `happy-dom`: ^12.0.0 - DOM environment
- `vitest-mock-extended`: ^1.3.0 - Advanced mocking

**Development Tools (No Changes):**
- `typescript`: ^5.x - Type checking
- `tsx`: 4.20.6 - TypeScript execution
- `prettier`: 3.6.2 - Code formatting
- `eslint`: ^8.x - Linting

**Infrastructure:**
- Docker: 28.5.1 (for Supabase Local)
- Supabase CLI: 2.48.3 (for local PostgreSQL)

---

## Performance Targets

**API Performance:**
- Response generation: <10s per turn (timeout enforced)
- Full discussion phase: 3-5 minutes
- Complete game: <45 minutes

**Cost Targets:**
- Per game: <$2 (with caching)
- Cache hit rate: >48% (achieved baseline)
- Circuit breaker: $10 hard limit

**Bundle Size:**
- Client bundle: <500KB (current acceptable)
- No optimization needed this iteration

**Database Performance:**
- Query time: <100ms for game state
- Connection pool: Default Prisma settings
- No optimization needed this iteration

---

## Security Considerations

**API Key Management:**
- File-based: `.anthropic-key.txt` (gitignored)
- Environment: `ANTHROPIC_API_KEY` variable
- Never commit keys to repository
- Railway environment variables for production

**Database Security:**
- Development: localhost only (Supabase Local)
- Production: Railway managed PostgreSQL (SSL enabled)
- No public access to database

**Cost Protection:**
- Circuit breaker prevents runaway costs
- Hard limit: $10 per game (configurable)
- Cost tracking on every API call
- Alerts if approaching limit

**Input Validation:**
- Zod schemas for API inputs
- Prisma for database type safety
- TypeScript strict mode for compile-time checks

---

## Build & Deployment

**Build Tool:** Next.js built-in (Webpack/Turbopack)

**Build Command:**
```bash
npm run build
```

**Deployment Target:** Railway (already configured)

**CI/CD:** Not in scope for Iteration 4 (manual deployment)

**Environment Setup:**
```bash
# Development
npm install
supabase start
npx prisma migrate dev
npm run dev

# Production (Railway)
npm install
npx prisma migrate deploy
npm run build
npm start
```

---

## Development Tools

**Code Quality:**
- ESLint: Linting rules
- Prettier: Code formatting
- TypeScript: Strict type checking
- Vitest: Unit and integration testing

**Database Tools:**
- Prisma Studio: Visual database browser
- Supabase Studio: PostgreSQL dashboard (http://localhost:54323)
- psql: Command-line PostgreSQL client

**Debugging:**
- Pino logs: Structured logging with context
- Debug mode: `LOG_LEVEL=debug npm run dev`
- Debugging guide: `docs/debugging-runtime-issues.md` (to be created)

---

## Key Decisions Summary

1. **NO Agent SDK Migration**: Custom orchestration works excellently
2. **Supabase Local for Dev**: Eliminates schema drift with production
3. **Vitest for Testing**: Zero migration effort, modern DX
4. **Strict TypeScript**: Catch errors at compile time
5. **Structured Logging**: Consistent Pino usage throughout
6. **Keep Current Stack**: Framework and libraries work well, no changes needed

---

**Tech Stack Status:** DEFINED
**Risk Level:** LOW (minimal changes to working system)
**Ready for Implementation:** YES
