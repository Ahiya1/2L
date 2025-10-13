# Iteration 3: Technology Stack

## Core Stack (Unchanged)

### Framework & Runtime
- **Next.js 14.2.18** (App Router)
  - Production-ready, optimized builds
  - Server-Side Events (SSE) support
  - Built-in API routes
  
- **React 18**
  - Component library for UI
  - Hooks for state management
  
- **TypeScript 5+** (strict mode)
  - Type safety across frontend/backend
  - **Note:** Re-enable type checking in next.config.mjs (remove ignoreBuildErrors)

- **Node.js 18+**
  - Runtime for backend

### Database (Development)
- **SQLite**
  - Continue using for local development
  - WAL mode for concurrent reads
  - Prisma ORM for schema management

### Database (Production - NEW)
- **PostgreSQL 14+**
  - Required for Vercel/Railway deployment (ephemeral filesystems)
  - Better concurrency than SQLite
  - Included with Railway platform
  - Prisma migration path: Change `provider = "postgresql"` in schema.prisma

### AI Model
- **Claude 4.5 Sonnet** (`claude-sonnet-4-5-20250929`)
  - Via `@anthropic-ai/sdk` (^0.65.0)
  - Prompt caching enabled (target: 70% hit rate)
  - Cost: ~$1.25-2 per game (with 48-70% caching)

## New Dependencies (Add These)

### Structured Logging
```bash
npm install pino pino-pretty
```

- **pino** (^9.6.0) - Production logger
  - 5x faster than winston
  - Async logging (non-blocking)
  - JSON structured logs
  - 40K+ GitHub stars
  
- **pino-pretty** (^13.0.0) - Dev dependency
  - Human-readable logs in development
  - Colorized console output
  - Only used in dev (not bundled)

**Configuration:**
```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true },
  } : undefined,
});
```

### Deployment Platform
**Railway** (recommended)
- PostgreSQL included (free within platform)
- One-command deployment: `railway up`
- Environment variable management
- Built-in metrics (CPU, memory, requests)
- Cost: $5/month (includes app + database + SSL + metrics)

**Alternative: Fly.io** (if keeping SQLite)
- Persistent volumes support SQLite
- Docker-based deployment
- More complex configuration
- Only consider if avoiding PostgreSQL migration

### Supporting Libraries

**Unique IDs:**
```bash
npm install nanoid
```
- Already installed (used for shareable URLs)
- Generate short, URL-safe IDs: `nanoid(12)` → `xK9fG2pQ4mN8`

**Rate Limiting (Optional - defer unless abuse detected):**
```bash
npm install @upstash/ratelimit @upstash/redis
```
- **@upstash/ratelimit** (^2.0.0) - Redis-backed rate limiting
- **@upstash/redis** (^1.28.0) - Upstash Redis client
- **When to add:** If API abuse detected (>100 games/hour from single IP)
- **Alternative:** Use Railway/Vercel platform limits initially

## Deployment Configuration

### Railway Setup

**1. Install Railway CLI:**
```bash
npm install -g @railway/cli
```

**2. Create `railway.json`:**
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma migrate deploy && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100
  }
}
```

**3. Create `railway.toml`:**
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
```

**4. Environment Variables (set in Railway dashboard):**
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
DATABASE_URL=postgresql://... (auto-set by Railway)
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
LOG_LEVEL=info
```

### Database Migration

**Update `prisma/schema.prisma`:**
```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

**Add production-specific indexes:**
```prisma
model Game {
  // ... existing fields ...
  
  @@index([status, createdAt])  // Game listing queries
}

model DiscussionMessage {
  // ... existing fields ...
  
  @@index([gameId, timestamp])  // Full game history (remove roundNumber from this index)
}

model Player {
  // ... existing fields ...
  
  @@index([gameId, isAlive, role])  // Alive player queries (voting phase)
}
```

**Run migration:**
```bash
# Development (SQLite)
npx prisma migrate dev --name add_production_indexes

# Production (PostgreSQL - runs automatically via railway.json buildCommand)
npx prisma migrate deploy
```

## UI/UX Libraries (Optional)

### Animation (Nice-to-Have)
```bash
npm install framer-motion
```
- **framer-motion** (^11+) - React animation library
- Use for: Message fade-in, phase transitions, typing indicators
- 20KB gzipped (small footprint)
- **When to add:** Builder-3 (UI/UX Polish) if animations requested

### Virtual Scrolling (Deferred - Not Needed)
```bash
npm install react-window
```
- **react-window** (^1.8.10) - Virtual scrolling
- **Why deferred:** 100 messages render fine, marginal benefit (10-20ms)
- **When to add:** Only if games exceed 200+ messages

## Performance Optimization Libraries

### Bundle Analysis (Dev Dependency)
```bash
npm install --save-dev @next/bundle-analyzer
```
- **@next/bundle-analyzer** (^14.2.18)
- Visualize webpack bundle composition
- Identify large dependencies to code-split
- **Usage:** `ANALYZE=true npm run build`

**Add to `next.config.mjs`:**
```javascript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
```

## Monitoring & Observability

### Platform-Level (Free with Railway)
- **Railway Metrics Dashboard**
  - CPU usage
  - Memory usage
  - Request count
  - Response time (p50, p95, p99)
  - Automatic alerting for crashes

### Application-Level (Custom Build)
- **Cost Dashboard** (`/admin/costs`)
  - Display cost-tracker.ts data
  - Show: total cost, cache hit rate, cost per turn
  - Alert if game exceeds $5 or cache <70%
  - Built with React components (no external service)

### Logs (Pino → Railway)
- Pino outputs JSON logs to stdout
- Railway captures and displays in dashboard
- Searchable by gameId, playerId, phase
- Filterable by log level (info, warn, error)

### Future Monitoring (Stage 2 - If Needed)
- **Sentry** (error tracking) - $0 for 5K events/month
- **Better Stack/Logtail** (log aggregation) - $0 for 1GB/month
- **Axiom** (structured logs + metrics) - $0 for 500MB/month
- **Recommendation:** Defer until concurrent games or scaling needed

## Excluded Technologies

### Not Adding (Rationale)

**❌ Redis/Memcached**
- Reason: Overkill for single-instance deployment
- SQLite/PostgreSQL query performance adequate
- In-memory caching (Map) sufficient for now

**❌ GraphQL**
- Reason: REST API is simpler and sufficient
- No complex nested queries needed
- All data fetched in straightforward patterns

**❌ TypeORM**
- Reason: Prisma already in use and working well
- Migration would add risk with no benefit

**❌ Socket.io**
- Reason: SSE with polling fallback is sufficient
- Simpler than WebSockets (no bidirectional needed)
- SSE natively supported by Next.js

**❌ Lodash**
- Reason: Modern JS has built-in array methods
- Reduces bundle size (no extra dependency)
- Native performance is better

**❌ React Testing Library / Jest**
- Reason: Manual testing via CLI sufficient for Stage 1
- Automated tests valuable for Stage 2 (refactoring protection)
- Time better spent on features now

**❌ Tailwind CSS Plugins (Advanced)**
- Reason: Base Tailwind sufficient
- Custom utility classes can be added as needed
- No complex design system required

## Technology Decision Matrix

| Decision | Option A | Option B | Choice | Rationale |
|----------|----------|----------|--------|-----------|
| **Database (Prod)** | PostgreSQL | SQLite (Fly.io) | PostgreSQL | Required for Railway/Vercel, better for Stage 2 concurrency |
| **Deployment** | Railway | Fly.io | Railway | Simpler config, PostgreSQL included, better Next.js support |
| **Logging** | Pino | Winston | Pino | 5x faster, async mode, JSON structured |
| **Rate Limiting** | Upstash Redis | express-rate-limit | Platform limits (defer) | Simplest, add Upstash only if abuse detected |
| **Monitoring** | Custom dashboard | Sentry/Datadog | Custom | Cost already tracked, platform metrics sufficient |
| **Animation** | framer-motion | CSS animations | framer-motion | Better DX, declarative, 20KB cost acceptable |
| **Virtual Scroll** | react-window | None | None (defer) | Marginal benefit, 100 messages render fine |
| **Bundle Analyzer** | @next/bundle-analyzer | webpack-bundle-analyzer | @next/bundle-analyzer | Next.js native integration |

## Package.json Scripts (Update)

```json
{
  "scripts": {
    "dev": "next dev -p ${PORT:-3000}",
    "build": "prisma generate && next build",
    "start": "next start -p ${PORT:-3000}",
    "lint": "next lint",
    "postinstall": "prisma generate",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "analyze": "ANALYZE=true npm run build",
    "test:discussion": "tsx src/cli/test-discussion.ts",
    "test:full-game": "tsx src/cli/test-full-game.ts",
    "evaluate": "tsx src/cli/evaluate-transcript.ts"
  }
}
```

## Environment Variables

### Development (`.env`)
```env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sk-ant-api03-..."
NODE_ENV="development"
LOG_LEVEL="debug"
```

### Production (Railway Dashboard)
```env
DATABASE_URL=postgresql://... (auto-set by Railway)
ANTHROPIC_API_KEY=sk-ant-api03-...
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
LOG_LEVEL=info
```

### Optional (for rate limiting)
```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Compatibility Matrix

| Technology | Version | Compatibility Notes |
|------------|---------|---------------------|
| Node.js | 18.x - 20.x | Tested on 18.17.0, Railway default is 20.x |
| npm | 9.x - 10.x | Lock file uses npm 9 |
| Next.js | 14.2.18 | Stable, no upgrade needed |
| Prisma | 6.17.1 | PostgreSQL support built-in |
| TypeScript | 5.6.3 | Strict mode enabled |
| React | 18.3.1 | Latest stable |
| Pino | 9.6.0+ | Node 18+ required |
| Railway CLI | Latest | Auto-updates on install |

## Final Stack Summary

**Backend:**
- Next.js 14 (App Router) + TypeScript 5
- PostgreSQL 14 (production) / SQLite (dev)
- Prisma 6.17.1 (ORM)
- Pino 9.6 (logging)
- Claude 4.5 Sonnet (AI)

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS 3
- Next.js built-in components
- framer-motion (animations, optional)

**Deployment:**
- Railway (platform)
- PostgreSQL (managed database)
- Next.js SSR/SSG build
- SSL/HTTPS (automatic)

**Monitoring:**
- Railway metrics (CPU, memory, requests)
- Pino JSON logs → Railway dashboard
- Custom cost dashboard (`/admin/costs`)

**Development:**
- tsx (TypeScript execution)
- pino-pretty (dev logs)
- @next/bundle-analyzer (bundle analysis)
- Prisma Studio (database GUI)
