# Technology Stack - Iteration 3

## Core Framework (Unchanged)

**Decision:** Next.js 14.2.18 (App Router)

**Rationale:**
- Already implemented and stable in current codebase
- Server Components reduce client bundle for dashboard-heavy features
- App Router provides built-in API routes for cost tracking endpoints
- SSE support via Route Handlers (existing `/api/game/[gameId]/stream` endpoint)

**No Changes Required:** Framework remains unchanged from Iterations 1-2

---

## Database

**Decision:** PostgreSQL 15+ via Prisma 6.17.1

**Rationale:**
- Railway requires PostgreSQL (no SQLite support in production)
- Prisma already configured, migration path is straightforward
- PostgreSQL provides better concurrency for multi-game scenarios
- Full ACID compliance for game state consistency
- Connection pooling for Railway's scaling

**Migration Strategy:**
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

**Breaking Changes:**
- Change `@db.Text` to `@db.VarChar(8000)` for long text fields
- Replace SQLite-specific date functions with PostgreSQL equivalents
- Update connection string format: `postgresql://user:password@host:port/db`

**Development Workflow:**
- Local dev: Continue using SQLite (optional, or use local PostgreSQL via Docker)
- Production: Railway-managed PostgreSQL
- Migrations: `prisma migrate deploy` on Railway

---

## Animation Library

**Decision:** Framer Motion 11.x

**Rationale:**
- Declarative React API (no imperative DOM manipulation)
- Spring physics for natural motion feel
- AnimatePresence for enter/exit transitions (perfect for message feed)
- 60fps performance with GPU-accelerated transforms
- Respects `prefers-reduced-motion` automatically
- ~30KB gzipped (acceptable for polish iteration)

**Installation:**
```bash
npm install framer-motion
```

**Key Features Used:**
- `motion.div` for message animations (fade-in, slide-in)
- `AnimatePresence` for message list updates
- `useAnimation` for programmatic control (typing indicators)
- `variants` for orchestrated animations (phase transitions)

**Performance Consideration:**
- Lazy load via dynamic imports for non-critical animations
- Disable on mobile if performance issues detected

---

## Logging Infrastructure

**Decision:** Pino 9.x (Structured Logging)

**Rationale:**
- JSON-structured logs (Railway log aggregation friendly)
- Extremely fast (asynchronous logging, minimal overhead)
- Child loggers with contextual metadata (game_id, player_id)
- Log levels (ERROR, WARN, INFO, DEBUG) for filtering
- ~20KB browser bundle (server logging is heavier, but acceptable)
- Better than Winston (faster), Bunyan (unmaintained), or console.log

**Installation:**
```bash
npm install pino pino-pretty
```

**Configuration:**
```typescript
// src/lib/logger/index.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  browser: {
    asObject: true,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export default logger;
```

**Usage Pattern:**
```typescript
import logger from '@/lib/logger';

// Replace console.log
logger.info({ gameId, playerId }, 'Turn started');

// Replace console.error
logger.error({ error, gameId }, 'Game creation failed');

// Child logger with context
const gameLogger = logger.child({ gameId: game.id });
gameLogger.debug('Processing agent turn');
```

**Migration:**
- Replace 178 instances of `console.log`, `console.error`, `console.warn`
- Add contextual metadata to all log calls
- Configure Railway to parse JSON logs

---

## Shareable URLs

**Decision:** nanoid 5.1.6 (Already Installed)

**Rationale:**
- Already in `package.json` (used elsewhere in codebase)
- URL-safe, collision-resistant IDs (21 characters default)
- Faster and smaller than UUID
- Perfect for shareable game URLs: `https://app.com/game/V1StGXR8_Z5jdHi6B-myT`

**No New Installation Required:** Package already exists

**Implementation:**
```typescript
import { nanoid } from 'nanoid';

// Generate shareable game ID
const shareableId = nanoid(); // "V1StGXR8_Z5jdHi6B-myT"
```

**Database Schema Addition:**
```prisma
model SharedGame {
  id        String   @id @default(cuid())
  shareId   String   @unique // nanoid generated
  gameId    String
  game      Game     @relation(fields: [gameId], references: [id])
  createdAt DateTime @default(now())
  expiresAt DateTime? // Optional expiration
}
```

---

## External Integrations

### Anthropic Claude API (Unchanged)

**Purpose:** Agent conversation generation
**Library:** `@anthropic-ai/sdk` 0.65.0 (already installed)
**Model:** `claude-3-5-sonnet-20241022`

**No Changes Required:** Existing integration remains unchanged

**Cost Tracking Enhancement:**
- Track `usage.input_tokens` and `usage.output_tokens` from API responses
- Store in database for dashboard aggregation
- Calculate cost: `(input_tokens * $3 / 1M) + (output_tokens * $15 / 1M)`

---

## Development Tools

### Testing (Unchanged)

**Framework:** None currently (no Jest/Vitest in package.json)
**Coverage target:** N/A for this iteration
**Strategy:** Manual testing + build validation

**Future Consideration:** Add Vitest for unit tests in Iteration 4

---

### Code Quality

**Linter:** ESLint 8.x (already configured via `eslint-config-next`)
**Formatter:** Prettier 3.6.2 (already installed)
**Type Checking:** TypeScript 5.x (already configured)

**No Changes Required:** Existing tooling is sufficient

**Pre-commit Validation:**
```bash
npm run lint        # ESLint
npm run build       # TypeScript type checking
```

---

### Build & Deploy

**Build tool:** Next.js built-in (Turbopack in dev, Webpack in production)
**Deployment target:** Railway
**CI/CD:** Railway auto-deploy on GitHub push

**Railway Configuration:**
```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## Environment Variables

### Required for Development
```env
# Database (local SQLite or PostgreSQL)
DATABASE_URL="file:./dev.db"

# Anthropic API
ANTHROPIC_API_KEY="sk-ant-..."

# App Configuration
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
LOG_LEVEL="debug"
```

### Required for Production (Railway)
```env
# Database (Railway-managed PostgreSQL)
DATABASE_URL="${POSTGRESQL_URL}"  # Auto-injected by Railway

# Anthropic API (copy from local .env)
ANTHROPIC_API_KEY="sk-ant-..."

# App Configuration
NEXT_PUBLIC_BASE_URL="https://${RAILWAY_PUBLIC_DOMAIN}"
LOG_LEVEL="info"

# Cost Circuit Breaker
COST_THRESHOLD_USD="50"
COST_ALERT_EMAIL="admin@example.com"
```

**Security:**
- Never commit `.env` to Git
- Use Railway's secret management UI for production secrets
- Rotate `ANTHROPIC_API_KEY` if exposed

---

## Dependencies Overview

### New Dependencies (This Iteration)
```json
{
  "framer-motion": "^11.0.0",      // Animation library (~30KB)
  "pino": "^9.0.0",                // Structured logging (~20KB)
  "pino-pretty": "^11.0.0"         // Dev log formatting (devDep)
}
```

### Existing Dependencies (Unchanged)
```json
{
  "@anthropic-ai/sdk": "^0.65.0",  // Claude API client
  "@prisma/client": "^6.17.1",     // Database ORM
  "nanoid": "^5.1.6",              // ID generation (already present)
  "next": "14.2.18",               // Framework
  "react": "^18",                  // UI library
  "react-dom": "^18",              // React renderer
  "zod": "^3.25.76",               // Schema validation
  "date-fns": "^3.6.0"             // Date utilities
}
```

### Deferred Dependencies (Not in This Iteration)
```json
{
  "recharts": "^2.12.0",           // Graph visualization (defer to analytics)
  "clsx": "^2.1.0",                // Class name utility (optional, use cn helper)
  "tailwind-merge": "^2.2.0"       // Tailwind class merging (optional)
}
```

---

## Performance Targets

### Bundle Size Analysis
```
Page                                  Size     First Load JS
┌ ○ /                                142 B          87.2 kB
├ ○ /game/[gameId]                   2.1 kB         350 kB    ← Main bundle
└ λ /api/game/[gameId]/stream        0 B            0 B
```

**Current Baseline:** ~350KB gzipped for main game page

**Post-Iteration Target:** <500KB gzipped
- Framer Motion: +30KB
- Pino (browser): +20KB
- New UI components: +50KB
- **Projected total:** ~450KB (within budget)

**Optimization Strategies:**
- Code splitting: Lazy load replay mode and cost dashboard
- Tree shaking: Only import used Framer Motion components
- Dynamic imports: Load Pino only when needed

---

### API Response Time Targets

**Game Creation:**
- Target: <2s (includes database write + initial turn)
- Current: ~1.5s (measured in local testing)
- No regression expected

**Turn Processing (Claude API):**
- Target: <5s per turn (depends on Claude API latency)
- Current: ~3-4s average
- Risk: Anti-repetition prompts may increase token count → slightly slower

**SSE Event Stream:**
- Target: <200ms latency from event publish to client receive
- Current: ~100ms (measured with SSE polling)
- No regression expected

---

### Database Performance

**Connection Pooling (Railway PostgreSQL):**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 20  // Railway free tier limit
}
```

**Query Optimization:**
- Add index on `Game.id` (already exists as primary key)
- Add index on `Turn.gameId` for turn lookups
- Add index on `SharedGame.shareId` for URL resolution

**Expected Query Times:**
- Game lookup by ID: <50ms
- Turn history fetch: <100ms (with limit 100)
- Vote aggregation: <150ms (requires join, acceptable)

---

## Security Considerations

### API Key Management
- **How addressed**: Store `ANTHROPIC_API_KEY` in Railway environment variables, never in code
- **Validation**: App fails fast on startup if key missing

### Cost Circuit Breaker
- **How addressed**: Middleware checks total API spend before each Claude API call
- **Threshold**: Configurable via `COST_THRESHOLD_USD` (default $50)
- **Graceful degradation**: Return 429 status with retry-after header

### Database Access
- **How addressed**: Prisma client-side usage only (no direct SQL injection risk)
- **Connection security**: PostgreSQL connection uses TLS in production
- **Railway VPN**: Database not publicly accessible (only app can connect)

### Shareable URLs
- **How addressed**: Nanoid generates cryptographically random IDs (collision risk ~1 in 10^15)
- **Expiration**: Optional `expiresAt` field for temporary shares
- **Rate limiting**: Consider adding rate limit for share generation (not in this iteration)

### Logging Sensitive Data
- **How addressed**: Pino redact configuration for sensitive fields
- **Never log**: API keys, user passwords (N/A for this app), PII
- **Sanitization**: Truncate long message content in logs (first 200 chars)

**Pino Redact Example:**
```typescript
const logger = pino({
  redact: {
    paths: ['req.headers.authorization', 'apiKey'],
    remove: true,
  },
});
```

---

## Deployment Architecture

### Railway Services
1. **Web Service**: Next.js application
   - Region: us-west1 (closest to users, configurable)
   - Resources: 512MB RAM, 1 vCPU (Railway free tier)
   - Auto-scaling: Disabled (single instance)

2. **PostgreSQL Database**: Managed addon
   - Version: PostgreSQL 15
   - Storage: 1GB (Railway free tier)
   - Backups: Daily automatic backups (7-day retention)
   - Connection limit: 20 concurrent connections

### Environment Separation
- **Development**: Local SQLite, local server (localhost:3000)
- **Production**: Railway PostgreSQL, Railway hosting (https://ai-mafia.up.railway.app)

**No staging environment** for this iteration (defer to Iteration 4 if needed)

---

## Technology Decision Rationale Summary

| Technology | Decision | Why Not Alternatives? |
|------------|----------|----------------------|
| **Database** | PostgreSQL | Railway requirement, no SQLite in prod |
| **Animation** | Framer Motion | Better than CSS-only (declarative API), lighter than GSAP |
| **Logging** | Pino | Faster than Winston, more maintained than Bunyan |
| **IDs** | nanoid | Already installed, better than UUID (shorter, URL-safe) |
| **Deployment** | Railway | Easier than Vercel (PostgreSQL addon), cheaper than AWS |
| **No Recharts** | Defer to Iteration 4 | Complex, 90KB bundle, not critical for MVP |
| **No Socket.io** | SSE sufficient | Avoids WebSocket infrastructure, SSE works for read-only events |
| **No Virtualization** | Games <200 msgs | Premature optimization, adds complexity |

---

## Migration Checklist

### Database Migration (Builder-3)
- [ ] Update `prisma/schema.prisma` to use `postgresql` provider
- [ ] Replace SQLite-specific syntax (e.g., `@db.Text` → `@db.VarChar(8000)`)
- [ ] Add `SharedGame` model with `shareId` field
- [ ] Test migrations locally with PostgreSQL Docker container
- [ ] Create Railway PostgreSQL addon
- [ ] Run `prisma migrate deploy` on Railway
- [ ] Verify all existing queries work with PostgreSQL

### Dependency Installation (All Builders)
- [ ] Run `npm install framer-motion pino pino-pretty`
- [ ] Update `package.json` with new dependencies
- [ ] Verify no dependency conflicts (`npm audit`)

### Environment Configuration (Deployment)
- [ ] Copy all required env vars to Railway
- [ ] Update `DATABASE_URL` to Railway PostgreSQL connection string
- [ ] Set `NEXT_PUBLIC_BASE_URL` to Railway domain
- [ ] Configure `LOG_LEVEL=info` for production
- [ ] Set `COST_THRESHOLD_USD=50` for circuit breaker

### Build Validation (Integration)
- [ ] Run `npm run build` locally to catch type errors
- [ ] Verify bundle size: `next build` output <500KB
- [ ] Test app with production build: `npm start`
- [ ] Check for console errors in browser DevTools

---

**Tech Stack Status**: FINALIZED
**Breaking Changes**: PostgreSQL migration only
**Risk Level**: LOW (well-understood technologies)
**Next Steps**: Builders proceed with implementation
