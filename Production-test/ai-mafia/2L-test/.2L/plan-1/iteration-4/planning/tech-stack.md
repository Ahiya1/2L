# Technology Stack - Iteration 4

**Created:** 2025-10-13
**Plan:** plan-1
**Iteration:** 4
**Status:** PLANNING

---

## Executive Summary

Iteration 4 makes **NO major technology changes**. The current stack is sound and working. We are adding infrastructure (Supabase local, Vitest) and fixing a bug, not replacing core technologies.

**Key Decision:** Keep current Claude API client (@anthropic-ai/sdk) - NO migration to Agent SDK.

---

## Core Technologies (UNCHANGED)

### Runtime
- **Node.js:** v20.19.5 LTS
- **TypeScript:** v5
- **Next.js:** App Router
- **React:** v18+

**Decision:** Keep current versions. All working correctly.

**Rationale:** Stable, well-tested, no issues identified.

---

### AI/ML
- **Anthropic Claude API:** claude-sonnet-4-5-20250929
- **SDK:** @anthropic-ai/sdk v0.65.0

**Decision:** KEEP current SDK. DO NOT migrate to @anthropic-ai/claude-agent-sdk.

**Rationale (from Explorer-1):**
1. Current custom orchestration works perfectly (verified via transcript analysis)
2. Agent SDK is wrong tool - designed for code generation, not game simulation
3. Agent SDK is too new (v0.1.14, released 2 weeks ago) - beta quality
4. No multi-agent features documented in Agent SDK
5. Migration would cost 40-60 hours with no functional benefit

**Evidence:**
- Recent transcript shows 41 messages generated successfully
- Cost tracking accurate ($0.29 per game)
- Cache hit rate 48.2% (acceptable, though below 70% target)
- All phases complete without crashes

**Architecture Decision Record:** See `docs/architecture-decision-records/ADR-001-multi-agent-orchestration.md` (to be created by Builder-4)

---

### Database (CHANGING FOR DEV)

#### Development Database: SQLite → PostgreSQL (via Supabase Local)

**Current:**
- Provider: SQLite
- Connection: `file:./dev.db`
- Size: 164KB
- Data: 8 games, 76 players, 41 messages

**New:**
- Provider: PostgreSQL v15
- Connection: `postgresql://postgres:postgres@localhost:54322/postgres`
- Tool: Supabase Local (Docker-based)
- Management: Supabase Studio at `http://localhost:54323`

**Decision:** Migrate dev environment from SQLite to PostgreSQL.

**Rationale:**
1. Production uses PostgreSQL (Railway)
2. SQLite vs PostgreSQL schema differences causing issues
3. PRAGMA statements in migrations fail on PostgreSQL
4. Need dev/prod consistency for reliable deployments
5. All prerequisites met (Docker installed, Supabase CLI v2.48.3 installed)

**Impact:**
- Existing migrations need regeneration (PRAGMA incompatible)
- Data must be exported/imported OR start fresh
- .env DATABASE_URL changes
- Prisma schema provider changes from "sqlite" to "postgresql"

**Risk Mitigation:**
- Keep SQLite backup
- Create rollback script
- Test incrementally

---

#### Production Database: PostgreSQL (UNCHANGED)

**Provider:** PostgreSQL (Railway managed)
**Version:** PostgreSQL 14+
**Connection:** Via Railway environment variables

**Decision:** Keep current production database. No changes.

---

### ORM
- **Prisma:** v6.17.1
- **Prisma Client:** v6.17.1

**Decision:** Keep current version.

**Rationale:** Works well, handles SQLite → PostgreSQL migration automatically.

**Migration Notes:**
- Prisma automatically converts DATETIME → TIMESTAMP
- Prisma auto-converts TEXT → VARCHAR appropriately
- BOOLEAN supported natively in PostgreSQL (vs INTEGER in SQLite)
- No manual schema changes needed (Prisma handles it)

---

## New Infrastructure (ADDING)

### Test Framework: Vitest

**Package:** vitest v1.0.0+
**Dependencies:**
- @vitest/ui - Test UI
- @testing-library/react - Component testing
- @testing-library/dom - DOM utilities
- @testing-library/jest-dom - Matchers
- happy-dom - DOM environment for tests
- vitest-mock-extended - Advanced mocking

**Decision:** Use Vitest (NOT Jest, NOT Node built-in test runner).

**Rationale (from Explorer-3):**
1. Existing tests already use Vitest syntax (vi.fn(), vi.mock())
2. Zero migration effort - just install and run
3. Fast (10x faster than Jest with ES modules + Vite caching)
4. Excellent DX (watch mode, UI, coverage built-in)
5. Perfect Next.js compatibility
6. Modern, TypeScript-first

**Alternative Considered:**
- Jest: Slower, requires test rewrites (jest.fn() → vi.fn())
- Node test runner: Too basic, no React testing, would require full rewrites

**Test Strategy:**
- Unit tests: Mock Claude API, test critical functions
- Integration tests: Mock Claude API, test full game flow
- E2E tests: Deferred to Iteration 5 (Playwright)

**Coverage Target:**
- >50% overall
- >80% on critical paths (claude/, game/, discussion/)

**Test Execution:**
- Tests run in <60 seconds
- Excludes full game E2E (10 minutes)

---

### Local Development Environment: Supabase Local

**Tool:** Supabase CLI v2.48.3
**Services Provided:**
- PostgreSQL 15 (via Docker)
- Supabase Studio (pgAdmin-like UI)
- Auth (unused for this project)
- Storage (unused for this project)
- Edge Functions (unused for this project)

**Decision:** Use Supabase Local for dev PostgreSQL.

**Rationale:**
1. Docker + Supabase CLI already installed (prerequisites met)
2. Provides more than plain Docker PostgreSQL (Studio UI is valuable)
3. Easy migration to Supabase Cloud if needed later
4. Consistent PostgreSQL version management
5. Port 5432 available (no conflicts)

**Alternative Considered:**
- Plain Docker PostgreSQL: Simpler but no Studio UI
- Keep SQLite: Unacceptable - schema drift is core issue

**Resources:**
- Port: 54322 (PostgreSQL)
- Port: 54323 (Supabase Studio)
- Disk: ~2GB for PostgreSQL data
- Memory: ~500MB for containers

---

## Logging (ENHANCED)

### Structured Logging
- **Library:** Pino v10.0.0
- **Format:** JSON structured logs
- **Levels:** debug, info, warn, error, fatal
- **Context:** Child loggers per module

**Current State:**
- Partially implemented (claude/, discussion/ use structured logging)
- 12 console.log statements remain in master-orchestrator.ts

**Decision:** Replace ALL console.log with structured logging.

**Implementation:**
```typescript
// Before
console.log(`[Master Orchestrator] Starting DISCUSSION phase`);

// After
orchestratorLogger.info({ gameId, roundNumber, phase: 'DISCUSSION' }, 'Starting DISCUSSION phase');
```

**Environment Variables:**
- `LOG_LEVEL` - Default: "debug" (dev), "info" (prod)
- `LOG_PRETTY` - Default: true (dev), false (prod)

**Debug Mode:**
- `LOG_LEVEL=debug npm run dev` - Verbose logging for troubleshooting

---

## Build Tools (UNCHANGED)

- **Build:** Next.js built-in (Turbopack in dev)
- **TypeScript Compiler:** tsc v5
- **Linter:** ESLint v8
- **Formatter:** Prettier v3.6.2
- **Package Manager:** npm

**Decision:** Keep current build tools.

---

## Type Safety (FIXING)

**Current State:**
- TypeScript strict mode: DISABLED
- ignoreBuildErrors: true (in next.config.mjs)
- 28 TypeScript errors

**Decision:** Enable strict mode, fix all errors, remove ignoreBuildErrors.

**Approach:**
- Fix errors incrementally (one file at a time)
- Use `// @ts-expect-any: <reason>` only when truly necessary
- Remove ignoreBuildErrors flag from config
- Verify `npx tsc --noEmit` passes (0 errors)

**Target:**
- Zero TypeScript errors
- Strict mode enabled
- Build succeeds without ignoring errors

---

## API Keys & Secrets

### Claude API Key
**Current Storage:** File-based (`.anthropic-key.txt`)
**Fallback:** Environment variable (`ANTHROPIC_API_KEY`)

**Decision:** Keep current system (works correctly per Explorer-1).

**Loading Priority:**
1. Environment variable `ANTHROPIC_API_KEY`
2. `.anthropic-key.txt` in current directory
3. `.anthropic-key.txt` in parent directory
4. Error if not found

**Validation:**
- Key format: `sk-ant-...` (108 characters)
- Tested and verified working

---

## Prompt Caching

**Strategy:** Anthropic ephemeral prompt caching
**Implementation:** Cache system prompt + game state
**TTL:** 5 minutes
**Cost Reduction:** 73% potential (90% reduction on cached tokens)

**Current Performance:**
- Cache hit rate: 48.2% (actual)
- Target: 70% (aspirational)
- Status: Acceptable (cost still under budget)

**Decision:** Keep current caching strategy. 48% is reasonable for initial turns.

**Rationale:**
- First turns have no cache (expected)
- Later turns benefit from caching
- Cost per game ($0.29) well under target ($5)
- No optimization needed this iteration

---

## Cost Tracking

**Implementation:** Custom cost tracker
**Circuit Breaker:** $10 per game default
**Features:**
- Token usage tracking
- Cost calculation (input + output + cache tokens)
- Cache hit rate monitoring
- Circuit breaker (throws error at limit)

**Decision:** Keep current system (verified working).

**Cost Formula (Claude Sonnet 4.5):**
- Input tokens: $3 per 1M tokens
- Cache write: $3.75 per 1M tokens (25% markup)
- Cache read: $0.30 per 1M tokens (90% discount)
- Output tokens: $15 per 1M tokens

**Monitoring:**
- Cost per game
- Cache hit rate
- Total tokens consumed

---

## Dependencies Summary

### Production Dependencies (Keep)
```json
{
  "@anthropic-ai/sdk": "^0.65.0",
  "@prisma/client": "^6.17.1",
  "pino": "^10.0.0",
  "zod": "^3.25.76",
  "next": "latest",
  "react": "^18"
}
```

### Development Dependencies (Add)
```json
{
  "vitest": "^1.0.0",
  "@vitest/ui": "^1.0.0",
  "@testing-library/react": "^14.0.0",
  "@testing-library/dom": "^9.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "happy-dom": "^12.0.0",
  "vitest-mock-extended": "^1.3.0"
}
```

### CLI Tools (Already Installed)
- Docker v28.5.1
- Supabase CLI v2.48.3
- Node.js v20.19.5

---

## Architecture Patterns (UNCHANGED)

### Multi-Agent Orchestration
**Pattern:** Custom round-robin turn orchestration
**Implementation:** Sequential turn execution with time-based scheduling
**Status:** Working correctly (verified by Explorer-1)

**Decision:** KEEP custom orchestration. DO NOT migrate to framework.

**Components:**
- Master Orchestrator - Full game loop
- Discussion Orchestrator - Turn scheduling
- Turn Executor - Individual agent turns
- Context Builder - AI context construction
- Claude Client - API interaction

**Evidence of Success:**
- 41 messages generated in recent test
- All phases complete (NIGHT → DAY → DISCUSSION → VOTING → GAME_OVER)
- Cost tracking accurate
- No crashes

---

### Error Handling
**Pattern:** Graceful degradation with fallback responses
**Implementation:** Timeout handling (10s) + retry logic (3 attempts)
**Fallback:** Pre-defined responses if API fails

**Decision:** Keep current pattern (works well).

**Quality:**
- Errors logged with full context
- Game continues despite individual turn failures
- No silent failures (all errors logged)

---

### Event-Driven Updates
**Pattern:** Server-Sent Events (SSE) for real-time UI updates
**Implementation:** Event emitter + SSE stream
**Status:** Working correctly

**Decision:** Keep current implementation (no issues found).

---

## Configuration Files

### Updated by Builders

**Builder-2 (Supabase):**
- `prisma/schema.prisma` - Change provider to "postgresql"
- `.env` - Update DATABASE_URL
- Delete: `prisma/migrations/*` (regenerate)

**Builder-3 (Vitest):**
- `package.json` - Add dev dependencies, test scripts
- New: `vitest.config.ts`
- New: `vitest.setup.ts`

**Builder-4 (TypeScript):**
- `next.config.mjs` - Remove `ignoreBuildErrors: true`
- `tsconfig.json` - Enable strict mode (if not already enabled)

---

## Deployment (UNCHANGED)

**Platform:** Railway
**Database:** Railway PostgreSQL
**Build Command:** `npm run build`
**Start Command:** `npm start`

**Environment Variables:**
- `DATABASE_URL` - Railway provides
- `ANTHROPIC_API_KEY` - Set in Railway dashboard
- `LOG_LEVEL` - "info" for production
- `NODE_ENV` - "production"

**Decision:** Keep current Railway deployment (no changes).

---

## Monitoring & Observability

**Current State:**
- Structured logging with Pino (JSON format)
- Cost tracking per game
- Event emission for debugging

**Future (Deferred to Iteration 5):**
- Sentry error tracking
- Datadog performance monitoring
- Prometheus metrics

**Decision:** Keep current observability. Enhanced monitoring deferred.

---

## Technology Decisions Rationale

### Why NO Agent SDK Migration?

**Explorer-1 Research Findings:**
1. Current system generates 41 messages successfully
2. Agent SDK is code-generation focused (wrong use case)
3. Agent SDK is beta (v0.1.14, 2 weeks old)
4. Migration would cost 40-60 hours
5. No functional benefits identified
6. High risk of breaking working system

**Cost/Benefit:**
- Cost: 40-60 hours + risk of bugs
- Benefit: None (system already works)
- ROI: Negative

**Decision:** Keep custom orchestration. Document decision in ADR.

---

### Why Vitest Over Jest?

**Reasons:**
1. Tests already written in Vitest syntax
2. Zero migration effort
3. 10x faster than Jest
4. Better Next.js integration
5. Modern, TypeScript-first

**Cost/Benefit:**
- Cost: Install packages (15 minutes)
- Benefit: Tests run immediately
- ROI: Positive

---

### Why Supabase Local Over Plain Docker?

**Reasons:**
1. Prerequisites already met (CLI installed)
2. Provides Studio UI (valuable for data inspection)
3. Easy migration to Supabase Cloud later
4. Minimal extra complexity vs plain Docker
5. Better DX overall

**Cost/Benefit:**
- Cost: Same as plain Docker (~2-3 hours)
- Benefit: Studio UI + future flexibility
- ROI: Positive

---

## Technology Risk Assessment

### LOW RISK
- Claude API client (proven, working)
- Prisma ORM (handles migration automatically)
- Supabase Local (CLI + Docker already installed)
- Vitest (tests already written, just install)

### MEDIUM RISK
- SQLite → PostgreSQL migration (data export/import)
- TypeScript strict mode (28 errors to fix)

### ZERO RISK
- Keep current multi-agent orchestration (no changes)
- Keep current logging library (just replace console.log)
- Keep current cost tracking (working correctly)

---

## Next Steps

1. Builders use this tech stack document as reference
2. No technology debates during building phase
3. If issues discovered, document as "lessons learned" for future
4. All technology decisions are FINAL for Iteration 4

---

**Document Status:** COMPLETE
**Approved For:** Builder execution
**Technology Freeze:** YES (no changes without iplanner approval)
