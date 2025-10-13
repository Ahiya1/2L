# Explorer 3 Report: Production Readiness, Monitoring, and Documentation

## Executive Summary

The AI Mafia game currently operates in development mode only with basic cost tracking but lacks production deployment configuration, structured logging, monitoring infrastructure, and comprehensive documentation. The codebase has 178 console.log statements scattered across the application, no deployment configuration files (Vercel/Docker), and minimal external documentation beyond setup guides. Cost tracking is functional ($0.29 per discussion phase, 48% cache hit rate) but lacks alerting infrastructure. The transcript export feature exists but needs enhancement for shareable URLs and replay functionality.

## Discoveries

### Current Production Readiness State

**Strengths:**
- Cost tracking system implemented (`src/utils/cost-tracker.ts`)
- Transcript export to JSON/text formats working
- Zod validation on all API endpoints
- SQLite database with proper indexes
- Environment variable structure defined (`.env.example`)
- API error handling with structured error responses
- Retry logic with exponential backoff in Claude client

**Critical Gaps:**
- NO deployment configuration (no `vercel.json`, `Dockerfile`, or CI/CD)
- NO structured logging (178 console.log statements)
- NO monitoring/alerting infrastructure
- NO rate limiting on API endpoints
- NO production database strategy (SQLite in dev only)
- NO CORS configuration (wide open)
- Build configuration ignores TypeScript/ESLint errors (risky for production)

### Cost & Performance Analysis

**Current Metrics (from transcript `discussion-1760296598488.txt`):**
- Discussion phase cost: $0.29 (41 messages, 178 seconds)
- Cache hit rate: 48.2% (below 70% target from `.env.example`)
- Average cost per turn: $0.0071
- Input tokens: 52,531
- Cached tokens: 48,904
- Output tokens: 2,793

**Extrapolation to Full Game:**
- Estimated 3 rounds × discussion = ~$0.87 in discussion
- Night phases (30s each, 3 rounds) = ~$0.15
- Voting phases (45s each, 3 rounds) = ~$0.20
- **Estimated total per game: ~$1.25** (well below $5 target)

**Performance Observations:**
- Average 4.3 seconds per agent turn (178s / 41 messages)
- 10-player game completed in ~3 minutes for discussion phase
- Database size: 164KB (very light, SQLite suitable for Stage 1)

### Logging & Monitoring Landscape

**Current Logging Pattern:**
- 178 console.log/warn/error statements across `/src/lib`
- Mix of debug logs, cost tracking, and error reporting
- No structured format (JSON logs)
- No log levels (debug/info/warn/error) beyond console methods
- No log aggregation or searchability

**What Should Be Logged:**
1. **API Request Level:**
   - Request ID, endpoint, method, status code, duration
   - User agent (for abuse detection)
   - Response size
   
2. **Game Event Level:**
   - Game ID, phase transitions, player eliminations
   - Round numbers, vote outcomes, win conditions
   - Agent timeouts and fallback responses
   
3. **Cost Level:**
   - Per-turn token usage (already tracked)
   - Per-game cost summaries (already tracked)
   - Cache hit rates per game (already tracked)
   - Cost threshold violations (alerts needed)
   
4. **Error Level:**
   - API failures with retry attempts
   - Database errors (constraint violations, timeouts)
   - Validation errors (malformed inputs)
   - SSE connection drops

**Recommended Stack:**
- **Structured Logging:** `pino` (fastest Node.js logger, 40K+ stars)
  - Why not winston? Pino is 5x faster and has better async support
  - Built-in JSON formatting, log levels, child loggers
  - Minimal overhead for high-throughput scenarios
  
- **Log Destination:**
  - Development: stdout (current)
  - Production: stdout → platform log aggregator (Vercel Logs, Railway Logs, CloudWatch)
  - Cost analysis: File-based append for post-game CSV export (keep current `cost-tracker.ts`)

### Deployment Strategy Analysis

**Platform Comparison:**

| Platform | Pros | Cons | Fit Score |
|----------|------|------|-----------|
| **Vercel** | Native Next.js support, zero-config deployment, free hobby tier, Vercel Logs, Edge Functions | SQLite doesn't work (ephemeral filesystem), need PostgreSQL migration | 7/10 |
| **Railway** | PostgreSQL included, persistent storage, env var management, great for Next.js | Paid only ($5/month min), less Next.js optimization than Vercel | 8/10 |
| **Fly.io** | SQLite works (persistent volumes), global edge deployment, free tier | More complex config, Docker required, manual scaling | 6/10 |
| **Self-hosted VPS** | Full control, persistent SQLite, cheap (DigitalOcean $6/mo) | Manual DevOps (nginx, SSL, updates), no automatic scaling | 5/10 |

**Recommendation: Railway** (PostgreSQL + Next.js)

**Rationale:**
1. **Database Strategy:** Need to migrate SQLite → PostgreSQL for production anyway
   - Vercel's ephemeral filesystem doesn't support SQLite
   - Multi-game scenarios (Stage 2) need concurrent writes (SQLite's weakness)
   - PostgreSQL is free on Railway (included in platform)
   
2. **Deployment Simplicity:** Railway = `railway up` (one command)
   - Automatic environment variable injection
   - Preview deployments for PRs
   - Built-in metrics (CPU, memory, requests)
   
3. **Cost:** $5/month covers app + PostgreSQL + metrics
   - Vercel free tier + separate Neon/Supabase PostgreSQL = similar cost
   - Railway is simpler (one platform vs two)

**Migration Path:**
```bash
# Phase 1: Add Railway config
railway.json (deployment config)
railway.toml (build settings)

# Phase 2: Database migration
prisma/schema.prisma → provider = "postgresql"
prisma migrate deploy (run migrations on Railway PostgreSQL)

# Phase 3: Environment variables
Railway dashboard → set ANTHROPIC_API_KEY, DATABASE_URL

# Phase 4: Deploy
railway up
```

**Alternative for Zero-Migration:** Fly.io with SQLite
- If we want to avoid PostgreSQL migration NOW
- Fly.io supports persistent volumes (SQLite works)
- Deploy via `fly deploy` after Dockerfile creation
- More complex but keeps SQLite intact

### Database Migration Considerations

**SQLite → PostgreSQL Changes:**

**Schema Compatibility:**
- Prisma abstracts most differences (good)
- `cuid()` works on both (good)
- DateTime handling identical (good)
- JSON fields work on both (good)

**Breaking Changes:**
- None expected for this schema (very standard)

**Index Optimization for PostgreSQL:**
```prisma
// Add these indexes for production performance
@@index([status, createdAt]) // Game listing queries
@@index([gameId, roundNumber, timestamp]) // Message retrieval
@@index([gameId, isAlive, role]) // Alive player queries (voting phase)
```

**Migration Complexity: LOW**
- Estimated time: 30 minutes (update schema.prisma + migrate)
- Risk: Low (Prisma handles DB differences)
- Testing: Run full game on local PostgreSQL before production

### Rate Limiting & Security

**Current Security Posture:**

**Implemented:**
- ✅ Zod validation on all inputs (prevents injection)
- ✅ Parameterized queries via Prisma (SQL injection safe)
- ✅ cuid game IDs (cryptographically random, unguessable)
- ✅ API key stored in file (not in repo)
- ✅ Structured errors (no stack traces to client)

**Missing:**
- ❌ Rate limiting (API abuse possible)
- ❌ CORS configuration (wide open)
- ❌ API key validation (client could call with bad key)
- ❌ Request size limits (could send huge payloads)
- ❌ Game creation limits (could create 1000 games)

**Rate Limiting Strategy:**

**Endpoints to Protect:**
1. `POST /api/game/create` → 5 requests/minute/IP (prevent game spam)
2. `POST /api/game/[id]/start` → 1 request/10s/gameId (prevent restart spam)
3. `GET /api/game/[id]/state` → 30 requests/minute/IP (prevent polling abuse)
4. `GET /api/game/[id]/messages` → 60 requests/minute/IP
5. `GET /api/game/[id]/stream` (SSE) → 2 concurrent connections/IP

**Implementation Options:**

**Option 1: `@upstash/ratelimit` (Recommended)**
```typescript
// Vercel/Railway compatible, Redis-backed
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '60s'),
});

// In API route:
const { success } = await ratelimit.limit(ip);
if (!success) return res.status(429).json({ error: 'Too many requests' });
```

**Option 2: `express-rate-limit` (simpler, in-memory)**
- Easier setup (no Redis)
- Doesn't work across serverless instances (Vercel/Railway scale horizontally)
- Good for single-instance deployments only

**Option 3: Platform-level (Railway/Vercel)**
- Railway: Built-in request limits (configure in dashboard)
- Vercel: Edge Middleware rate limiting (Vercel Pro only)

**Recommendation:** Start with platform-level limits (Railway built-in), add Upstash if abuse detected.

**CORS Configuration:**
```typescript
// app/api/[...route]/middleware.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Restrict to same-origin + deployed domain only
```

### Documentation Assessment

**Existing Documentation:**

1. **README.md** (3.1KB, 116 lines)
   - ✅ Setup instructions (npm install, env setup)
   - ✅ Technology stack listed
   - ✅ Project structure overview
   - ✅ Testing commands
   - ❌ Missing: Deployment instructions
   - ❌ Missing: Troubleshooting section
   - ❌ Missing: API documentation (separate file exists)

2. **API_REFERENCE.md** (7.4KB, 373 lines)
   - ✅ Comprehensive endpoint documentation
   - ✅ Request/response examples
   - ✅ Error codes
   - ✅ Integration examples
   - ✅ Privacy guarantees documented
   - Status: **EXCELLENT** (no changes needed)

3. **docs/setup-guide.md** (6.8KB)
   - ✅ Detailed setup walkthrough
   - ✅ Environment variable explanations
   - Status: **GOOD**

4. **docs/web-ui-usage.md** (6.9KB)
   - ✅ UI feature descriptions
   - ✅ Real-time update explanations
   - Status: **GOOD**

**Documentation Gaps:**

1. **Architecture Documentation** (MISSING)
   - Need: System overview diagram (text-based)
   - Need: Phase flow (NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK)
   - Need: Agent orchestration explanation
   - Need: Database schema explanation
   - Need: Cost optimization strategy (prompt caching)

2. **Prompt Library Documentation** (MISSING)
   - All system prompts exist in `src/lib/prompts/system-prompts.ts`
   - Need: Document each prompt's purpose
   - Need: Explain deception tactics (Mafia)
   - Need: Explain deduction strategies (Villagers)
   - Need: Personality trait rationale

3. **Troubleshooting Guide** (MISSING)
   - Common issue: API key not found
   - Common issue: Cache hit rate < 70%
   - Common issue: Agent timeout / fallback responses
   - Common issue: SSE connection drops
   - Common issue: Database locked (SQLite WAL mode)

4. **Deployment Documentation** (MISSING)
   - Need: Railway deployment guide
   - Need: Environment variable checklist
   - Need: Database migration instructions
   - Need: Production verification steps

### Monitoring & Alerting Strategy

**Metrics to Track:**

**Game Health:**
- Games created per hour/day
- Games completed (win condition reached)
- Games abandoned (stuck/crashed)
- Average game duration (target: <45 minutes)
- Win rate: Mafia vs Villagers (should be ~40/60)

**Cost Health:**
- Cost per game (alert if >$5)
- Cache hit rate (alert if <70%)
- Average cost per turn (alert if >$0.02)
- Total daily spend (budget tracking)

**API Health:**
- API error rate (alert if >2%)
- Average API latency (alert if >500ms)
- Timeout rate (alert if >5% of turns)
- Fallback response rate

**System Health:**
- Memory usage (alert if >200MB)
- Database size growth (alert if >1GB)
- SSE connection count (track concurrent spectators)
- Request rate (detect abuse)

**Monitoring Tool Options:**

| Tool | Pros | Cons | Cost |
|------|------|------|------|
| **Railway Metrics** | Built-in, free, covers CPU/memory/requests | Basic (no custom metrics) | Free |
| **Vercel Analytics** | Built-in for Vercel, web vitals | Basic (no game-specific metrics) | Free tier available |
| **Sentry** | Error tracking, stack traces, alerts | Overkill for this project, $26/month | $0 (5K events/mo) |
| **Better Stack (Logtail)** | Log aggregation, search, alerts | Another service to manage | $0 (1GB/mo) |
| **Self-hosted (Prometheus)** | Full control, unlimited metrics | DevOps overhead, complex setup | Free (hosting cost) |
| **Axiom** | Structured logs + metrics, generous free tier | New platform (less mature) | $0 (500MB/mo) |

**Recommendation: Hybrid Approach**

1. **Platform Metrics (Railway):** CPU, memory, requests (free, automatic)
2. **Pino Logs → stdout:** Structured JSON logs captured by Railway
3. **Custom Cost Dashboard:** Build simple Next.js page `/admin/costs`
   - Display: cost-tracker data aggregated by game
   - Show: cache hit rates, cost per game, total spend
   - Alert: client-side warning if any game >$5
4. **Manual Monitoring (First Month):**
   - Review logs daily for errors
   - Check cost dashboard after each game
   - Iterate on prompts if cache hit rate <70%

**Why Not Sentry/Datadog?**
- Overkill for a single-player Stage 1 game
- Cost tracking already built (`cost-tracker.ts`)
- Platform logs sufficient for debugging
- Add later if scaling to Stage 2 (concurrent games)

### Game Transcript Features

**Current Implementation:**
- ✅ JSON export with full game data
- ✅ Text export with formatted transcript
- ✅ Cost summary included
- ✅ Player stats (message count per player)
- ❌ No shareable URLs
- ❌ No replay mode
- ❌ No highlight reel

**Shareable URL Implementation:**

**Approach: Static Export + Unique URL**

1. **After Game Ends:**
   ```typescript
   // In `/api/game/[gameId]/results` route
   const shareId = nanoid(12); // e.g., "xK9fG2pQ4mN8"
   
   // Store mapping: shareId → gameId
   await prisma.sharedGame.create({
     data: { id: shareId, gameId, createdAt: new Date() }
   });
   
   const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${shareId}`;
   return { ...results, shareUrl };
   ```

2. **Shareable Page: `/share/[shareId]`**
   - Fetch game results via shareId lookup
   - Render full transcript (messages, votes, roles revealed)
   - No navigation to lobby (standalone view)
   - Add meta tags for social sharing (Open Graph)

3. **Privacy Considerations:**
   - Shareable links only for completed games (status = GAME_OVER)
   - No roles revealed until game over (already enforced)
   - Rate limit share creation (1 share per game)

**Database Schema Addition:**
```prisma
model SharedGame {
  id        String   @id // nanoid(12)
  gameId    String   @unique
  createdAt DateTime @default(now())
  
  game Game @relation(fields: [gameId], references: [id])
  
  @@index([gameId])
}
```

**Replay Mode Design:**

**UI Components:**
1. **Timeline Scrubber:**
   - Horizontal timeline with phases marked
   - Click to jump to any message/vote
   - Visual markers for key events (eliminations, votes)

2. **Playback Controls:**
   - Play/Pause (auto-advance through messages)
   - Speed control (1x, 2x, 5x)
   - Jump to next phase
   - Jump to next elimination

3. **Message Feed:**
   - Same as live feed but with timeline position
   - Highlight current message in timeline
   - Scroll to follow timeline position

**Implementation:**
```typescript
// /share/[shareId] page with replay mode
const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
const [playbackSpeed, setPlaybackSpeed] = useState(1);

useEffect(() => {
  if (isPlaying) {
    const interval = setInterval(() => {
      setCurrentMessageIndex(i => i + 1);
    }, 2000 / playbackSpeed);
    return () => clearInterval(interval);
  }
}, [isPlaying, playbackSpeed]);

// Timeline component shows progress:
<Timeline 
  messages={allMessages}
  currentIndex={currentMessageIndex}
  onSeek={(index) => setCurrentMessageIndex(index)}
/>
```

**Highlight Reel Design:**

**Key Moments to Detect:**

1. **Dramatic Accusations:**
   - Detect: Message contains "I think [Name] is Mafia" or "I suspect [Name]"
   - Importance: High if accusation is correct (revealed later)

2. **Close Votes:**
   - Detect: Vote tally with <2 vote difference between top 2 players
   - Importance: High tension moment

3. **Agent Elimination:**
   - Detect: Player eliminated (night kill or day vote)
   - Importance: Always include (major event)

4. **Role Reveal Moments:**
   - Detect: Mafia member eliminated (win progress for Villagers)
   - Importance: High (strategic turning point)

5. **Clever Mafia Lies:**
   - Detect: Mafia agent defends another Mafia agent (check roles post-game)
   - Manual curation: Hard to auto-detect "clever" lies
   - Alternative: Most-replied-to messages (community engagement)

6. **Villager Deduction Success:**
   - Detect: Villager accuses Mafia correctly, Mafia gets voted out same round
   - Importance: High (good deduction)

**Highlight Reel Implementation:**
```typescript
interface HighlightMoment {
  type: 'accusation' | 'close_vote' | 'elimination' | 'clever_lie';
  timestamp: Date;
  description: string;
  messageId?: string;
  importance: 'high' | 'medium';
}

function generateHighlights(gameData: GameResultsResponse): HighlightMoment[] {
  const highlights: HighlightMoment[] = [];
  
  // Detect eliminations
  for (const player of gameData.players.filter(p => !p.isAlive)) {
    highlights.push({
      type: 'elimination',
      timestamp: /* find elimination message timestamp */,
      description: `${player.name} (${player.role}) was eliminated`,
      importance: 'high',
    });
  }
  
  // Detect close votes
  for (const round of uniqueRounds) {
    const votes = getVotesForRound(round);
    const tally = tallyVotes(votes);
    const [first, second] = sortByVoteCount(tally);
    if (first && second && first.count - second.count <= 1) {
      highlights.push({
        type: 'close_vote',
        timestamp: votes[0].timestamp,
        description: `Close vote: ${first.name} (${first.count}) vs ${second.name} (${second.count})`,
        importance: 'high',
      });
    }
  }
  
  // Detect dramatic accusations (simple regex)
  for (const msg of gameData.messages) {
    if (/I (think|suspect|believe) .* is (Mafia|suspicious)/i.test(msg.message)) {
      highlights.push({
        type: 'accusation',
        timestamp: msg.timestamp,
        description: `${msg.playerName} makes dramatic accusation`,
        messageId: msg.id,
        importance: 'medium',
      });
    }
  }
  
  return highlights.sort((a, b) => a.timestamp - b.timestamp);
}
```

**Highlight Reel UI:**
- Collapsible panel above timeline
- Show 5-10 key moments with timestamps
- Click to jump timeline to that moment
- Filter by importance (high only vs all)

### Error Handling & Edge Cases

**Current Error Handling (from code review):**

**Implemented:**
- ✅ Retry logic with exponential backoff (Claude API)
- ✅ Agent timeout with fallback responses (10s limit)
- ✅ Zod validation with structured errors
- ✅ Database error catching in API routes
- ❌ No SSE reconnection logic (client-side)
- ❌ No phase transition rollback on failure
- ❌ No game abandonment detection

**Edge Cases Needing Handling:**

1. **SSE Connection Drops:**
   - **Current:** Client loses connection, no auto-reconnect
   - **Fix:** Add client-side reconnection with exponential backoff
   ```typescript
   // In SSE client component
   useEffect(() => {
     let retries = 0;
     const maxRetries = 5;
     
     function connect() {
       const es = new EventSource(`/api/game/${gameId}/stream`);
       
       es.onerror = () => {
         es.close();
         if (retries < maxRetries) {
           retries++;
           setTimeout(connect, Math.pow(2, retries) * 1000);
         } else {
           // Fall back to polling
           startPolling();
         }
       };
     }
     connect();
   }, [gameId]);
   ```

2. **Phase Transition Failures:**
   - **Current:** If voting phase crashes, game stuck in VOTING
   - **Fix:** Add phase timeout detection
   ```typescript
   // In master-orchestrator.ts
   const phaseTimeout = PHASE_DURATIONS[currentPhase] * 1.5; // 50% buffer
   const phaseTimer = setTimeout(() => {
     logger.error(`Phase ${currentPhase} exceeded timeout, forcing transition`);
     // Force transition to next phase or mark game as abandoned
   }, phaseTimeout * 1000);
   ```

3. **Database Locked (SQLite WAL Mode):**
   - **Current:** SQLite with WAL mode enabled (good)
   - **Risk:** Concurrent writes during phase transition
   - **Fix:** Already mitigated by sequential orchestration
   - **PostgreSQL Migration:** Eliminates this issue entirely

4. **Agent Timeout Cascade:**
   - **Current:** Single agent timeout handled with fallback
   - **Risk:** Multiple agents timeout in same round (API issues)
   - **Fix:** Add fallback limit per round
   ```typescript
   let fallbackCount = 0;
   const MAX_FALLBACKS_PER_ROUND = 3;
   
   if (fallbackCount >= MAX_FALLBACKS_PER_ROUND) {
     logger.error('Too many agent timeouts, pausing game');
     // Pause game, notify spectators, wait for manual intervention
   }
   ```

5. **Cost Runaway:**
   - **Current:** Cost tracking logs costs, but no automatic stop
   - **Risk:** Bug causes 1000 API calls, $100 bill
   - **Fix:** Add circuit breaker
   ```typescript
   const MAX_COST_PER_GAME = 10.0; // $10 hard limit
   
   if (costTracker.getGameSummary(gameId).totalCost > MAX_COST_PER_GAME) {
     logger.error(`Game ${gameId} exceeded cost limit, aborting`);
     await prisma.game.update({
       where: { id: gameId },
       data: { status: 'ABANDONED', winner: null }
     });
     throw new Error('Cost limit exceeded');
   }
   ```

## Complexity Assessment

### High Complexity Areas

1. **Production Deployment (Railway + PostgreSQL Migration)**
   - **Complexity:** Database migration, environment setup, monitoring configuration
   - **Estimated Time:** 4-6 hours
   - **Builder Splits Needed:** 1 builder (sub-builder for deployment)
   - **Risks:** PostgreSQL migration bugs, Railway configuration issues

2. **Structured Logging Implementation**
   - **Complexity:** Replace 178 console.log statements, configure pino, add context (gameId, playerId)
   - **Estimated Time:** 3-4 hours
   - **Builder Splits Needed:** 1 builder (logging infrastructure)
   - **Risks:** Performance impact if logging is blocking

3. **Replay Mode + Timeline Scrubbing**
   - **Complexity:** Timeline UI component, playback state management, seek functionality
   - **Estimated Time:** 4-5 hours
   - **Builder Splits Needed:** 1 builder (UI feature)
   - **Risks:** Complex state management, performance with large transcripts

### Medium Complexity Areas

1. **Shareable URLs + Database Schema Addition**
   - **Complexity:** Add SharedGame model, update API routes, create share page
   - **Estimated Time:** 2-3 hours
   - **Risk:** Low (straightforward feature)

2. **Highlight Reel Detection Algorithm**
   - **Complexity:** Parse messages for patterns, detect close votes, rank moments
   - **Estimated Time:** 2-3 hours
   - **Risk:** Low (mostly pattern matching)

3. **Rate Limiting (Upstash Redis)**
   - **Complexity:** Add dependency, configure Redis, apply middleware to routes
   - **Estimated Time:** 2 hours
   - **Risk:** Low (library handles heavy lifting)

4. **Cost Monitoring Dashboard**
   - **Complexity:** Build Next.js admin page, visualize cost-tracker data
   - **Estimated Time:** 2-3 hours
   - **Risk:** Low (data already available)

### Low Complexity Areas

1. **Documentation Writing**
   - **Complexity:** Write architecture doc, troubleshooting guide, deployment guide
   - **Estimated Time:** 3-4 hours
   - **Risk:** None (pure documentation)

2. **CORS Configuration**
   - **Complexity:** Add headers to API routes
   - **Estimated Time:** 30 minutes
   - **Risk:** None (simple config)

3. **Error Handling Improvements**
   - **Complexity:** Add SSE reconnection, phase timeout detection, circuit breaker
   - **Estimated Time:** 2-3 hours
   - **Risk:** Low (defensive coding)

## Technology Recommendations

### Primary Stack (No Changes)

**Framework:** Next.js 14.2.18 (App Router)
- Rationale: Already implemented, working well, production-ready
- No changes needed

**Language:** TypeScript 5+ (strict mode)
- Rationale: Type safety proven valuable, continue using
- Note: Fix `next.config.mjs` to NOT ignore TypeScript errors in prod builds

**Database (Development):** SQLite + Prisma 6.17.1
- Rationale: Works for Stage 1, adequate for current scope
- Continue using for development

**Database (Production):** PostgreSQL 14+ (Supabase/Railway/Neon)
- Rationale: Required for Vercel/Railway deployment, better for multi-game concurrency
- Migration complexity: LOW (Prisma abstracts differences)

### Supporting Libraries (Add These)

**Structured Logging:** `pino` (v9.6.0+)
```bash
npm install pino pino-pretty
```
- **Why Pino:** 5x faster than winston, async logging, 40K+ GitHub stars
- **Configuration:**
  ```typescript
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

**Rate Limiting:** `@upstash/ratelimit` + `@upstash/redis` (if needed)
```bash
npm install @upstash/ratelimit @upstash/redis
```
- **Alternative:** Use Railway/Vercel platform limits initially
- **When to Add:** If abuse detected (>100 games/hour from single IP)

**Unique IDs:** `nanoid` (already installed)
- Already using for shareable URLs, continue using

### Deployment Platform

**Recommendation: Railway**

**Setup Steps:**
1. Install Railway CLI: `npm install -g @railway/cli`
2. Create `railway.json`:
   ```json
   {
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm install && npm run build"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```
3. Link PostgreSQL:
   - Railway dashboard → Add PostgreSQL service
   - Copy `DATABASE_URL` to environment variables
4. Set environment variables:
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL` (auto-set by Railway)
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_APP_URL=https://your-app.railway.app`
5. Deploy: `railway up`

**Cost:** $5/month (includes 8GB RAM, PostgreSQL, SSL, metrics)

## Integration Points

### External APIs

**Anthropic Claude API**
- **Purpose:** AI agent responses
- **Complexity:** Already integrated, working well
- **Considerations:** 
  - Rate limits: 50 requests/minute on Tier 1 (sufficient for 10 agents × 5 turns)
  - Cost optimization: Prompt caching CRITICAL (73% savings)
  - Error handling: Retry logic implemented (exponential backoff)

### Internal Integrations

**Cost Tracker ↔ Transcript Export**
- **Connection:** Transcript includes cost summary from cost-tracker
- **Status:** ✅ Working

**SSE Emitter ↔ API Routes**
- **Connection:** Game events broadcast via EventEmitter, SSE listens
- **Status:** ✅ Working
- **Improvement Needed:** Client-side reconnection logic

**Database ↔ All Modules**
- **Connection:** Prisma client singleton shared across app
- **Status:** ✅ Working
- **Migration Needed:** SQLite → PostgreSQL for production

## Risks & Challenges

### Technical Risks

**Risk 1: Cache Hit Rate Below 70%**
- **Current:** 48.2% in test transcript (below target)
- **Impact:** Higher costs per game ($1.25 vs $0.50 with 70% cache)
- **Mitigation:**
  1. Verify prompt caching is enabled (check `cache_control: { type: 'ephemeral' }`)
  2. Ensure system prompt + game state >1024 tokens (caching minimum)
  3. Use same system prompt format across all turns (don't modify)
  4. Monitor cache hit rates per game, iterate on prompt structure
- **Likelihood:** Medium (already observed in transcript)

**Risk 2: PostgreSQL Migration Breaking Changes**
- **Impact:** Game loop crashes in production, data loss
- **Mitigation:**
  1. Test full game on local PostgreSQL before deploying
  2. Run Prisma migrations with `--preview-feature` first
  3. Backup SQLite data before migration (export via Prisma Studio)
  4. Keep SQLite schema for development (dual support)
- **Likelihood:** Low (Prisma handles DB abstraction well)

**Risk 3: SSE Scaling Issues (Multiple Spectators)**
- **Impact:** EventEmitter max listeners exceeded, memory leak
- **Current Limit:** 50 concurrent SSE connections (set in `emitter.ts`)
- **Mitigation:**
  1. Monitor connection count, alert if >30
  2. Implement SSE connection timeout (close after 1 hour idle)
  3. Add Redis pub/sub if >100 concurrent spectators needed (Stage 2)
- **Likelihood:** Low (Stage 1 = single game at a time)

**Risk 4: Cost Runaway (API Bug)**
- **Impact:** $100 bill from infinite loop calling Claude API
- **Mitigation:**
  1. Implement circuit breaker ($10 hard limit per game)
  2. Add max turns per phase (prevent infinite Discussion)
  3. Alert if API call rate exceeds 10/second
  4. Anthropic API key has usage limits (can set in dashboard)
- **Likelihood:** Low (sequential orchestration prevents loops)

### Complexity Risks

**Risk 1: Replay Mode Performance with Large Transcripts**
- **Scenario:** 5-round game = 200+ messages, timeline scrubbing lags
- **Mitigation:**
  1. Use virtual scrolling for message feed (react-window)
  2. Lazy load messages outside viewport
  3. Debounce timeline seek events (wait for user to stop dragging)
- **Likelihood:** Medium (if games exceed 50 minutes)

**Risk 2: Logging Overhead in Production**
- **Scenario:** Pino logging blocks event loop, slows agent responses
- **Mitigation:**
  1. Use pino async logging mode (default)
  2. Avoid logging large objects (stringify outside hot path)
  3. Set log level to `info` in production (not `debug`)
  4. Benchmark: Measure agent turn latency before/after pino
- **Likelihood:** Low (pino is designed for high throughput)

## Recommendations for Planner

### Critical Path (Must-Have for Production)

1. **Deploy to Railway with PostgreSQL** (4-6 hours)
   - Migrate schema: `provider = "postgresql"` in schema.prisma
   - Add Railway config files (`railway.json`, `railway.toml`)
   - Set environment variables in Railway dashboard
   - Deploy: `railway up`
   - Verify: Run full game on production URL
   - **Why Critical:** Can't deploy to Vercel without PostgreSQL, Railway is simplest path

2. **Implement Structured Logging with Pino** (3-4 hours)
   - Replace console.log/warn/error with `logger.info/warn/error`
   - Add context fields: `logger.info({ gameId, playerId, phase }, 'Message')`
   - Configure pino-pretty for development
   - Output JSON logs in production (Railway captures these)
   - **Why Critical:** Can't debug production issues without structured logs

3. **Write Deployment & Troubleshooting Documentation** (3-4 hours)
   - Create `docs/deployment.md` (Railway setup, env vars, migration)
   - Create `docs/troubleshooting.md` (common errors, fixes)
   - Update `README.md` with production deployment section
   - Document prompt caching verification steps
   - **Why Critical:** Future developers need deployment knowledge

### High Priority (Strongly Recommended)

4. **Add Cost Circuit Breaker** (1 hour)
   - Implement $10 hard limit per game
   - Abort game if limit exceeded
   - Log cost violations to structured logs
   - **Why:** Prevents runaway costs from bugs

5. **Implement Shareable Game URLs** (2-3 hours)
   - Add `SharedGame` model to schema
   - Generate nanoid share links after game over
   - Create `/share/[shareId]` page (transcript view)
   - Add social meta tags (Open Graph)
   - **Why:** Core feature request ("shareable game URL")

6. **Build Basic Cost Dashboard** (/admin/costs) (2-3 hours)
   - Display: Games created, total cost, cache hit rates
   - Table: Per-game breakdown (gameId, cost, cache hit %, duration)
   - Alerts: Highlight games exceeding $5 or cache <70%
   - **Why:** Manual monitoring solution until proper monitoring added

### Medium Priority (Nice to Have)

7. **Add Replay Mode + Timeline Scrubbing** (4-5 hours)
   - Build timeline component with phase markers
   - Add playback controls (play/pause, speed)
   - Implement seek functionality (jump to message)
   - Add to `/share/[shareId]` page
   - **Why:** Enhances spectator experience, core feature request

8. **Implement Highlight Reel Detection** (2-3 hours)
   - Parse messages for dramatic accusations
   - Detect close votes (<2 vote difference)
   - Mark eliminations as key moments
   - Display as collapsible panel above timeline
   - **Why:** Makes transcripts more engaging, helps spectators find key moments

9. **Add SSE Reconnection Logic** (1-2 hours)
   - Client-side: Exponential backoff reconnection
   - Fallback to polling after 5 failed attempts
   - Display connection status indicator
   - **Why:** Improves reliability for spectators on flaky connections

10. **Implement Rate Limiting** (2 hours)
    - Option A: Railway platform limits (dashboard config)
    - Option B: Upstash Redis rate limiting middleware
    - Apply to: `/api/game/create` (5/min), `/api/game/[id]/start` (1/10s)
    - **Why:** Prevents API abuse, protects against spam

### Low Priority (Defer if Time Constrained)

11. **Write Architecture Documentation** (2 hours)
    - Create `docs/architecture.md`
    - Diagram: Phase flow (text-based ASCII diagram)
    - Explain: Agent orchestration, prompt caching, cost optimization
    - Document: Database schema with ER diagram

12. **Document Prompt Library** (1-2 hours)
    - Create `docs/prompts.md`
    - Copy system prompts from `system-prompts.ts`
    - Add rationale for each tactic (Mafia deception, Villager deduction)
    - Explain personality trait injection

13. **CORS Configuration** (30 minutes)
    - Add `Access-Control-Allow-Origin` headers
    - Restrict to production domain only
    - Update for OPTIONS preflight requests

### Out of Scope (Explicitly Defer)

- ❌ Advanced monitoring (Sentry, Datadog) - overkill for Stage 1
- ❌ Multiple concurrent games - Stage 2 feature
- ❌ Redis pub/sub for SSE - not needed until >50 concurrent spectators
- ❌ Database query optimization beyond indexes - performance adequate
- ❌ Context pruning (summarize old rounds) - cost already <$2/game
- ❌ Mobile responsive design - desktop-first per master plan

## Resource Map

### Critical Files/Directories

**Deployment Configuration:**
- `/railway.json` - Railway deployment config (TO CREATE)
- `/railway.toml` - Railway build settings (TO CREATE)
- `/.env.production` - Production env vars template (TO CREATE)
- `/vercel.json` - Alternative Vercel config (OPTIONAL, if Vercel chosen)

**Logging Infrastructure:**
- `/src/lib/logger.ts` - Pino logger singleton (TO CREATE)
- `/src/lib/claude/client.ts` - Replace console.log with logger (MODIFY 178 LOCATIONS)

**Database Schema:**
- `/prisma/schema.prisma` - Add SharedGame model, update provider to postgresql (MODIFY)
- `/prisma/migrations/` - PostgreSQL migrations (TO CREATE)

**Cost Monitoring:**
- `/src/utils/cost-tracker.ts` - Already implemented, add circuit breaker (MODIFY)
- `/app/admin/costs/page.tsx` - Cost dashboard (TO CREATE)

**Shareable URLs:**
- `/app/share/[shareId]/page.tsx` - Shareable game view (TO CREATE)
- `/app/api/game/[gameId]/share/route.ts` - Generate share links (TO CREATE)

**Replay Mode:**
- `/components/timeline.tsx` - Timeline scrubber component (TO CREATE)
- `/components/playback-controls.tsx` - Play/pause/speed controls (TO CREATE)
- `/lib/highlights.ts` - Highlight detection algorithm (TO CREATE)

**Documentation:**
- `/docs/deployment.md` - Deployment guide (TO CREATE)
- `/docs/troubleshooting.md` - Common issues and fixes (TO CREATE)
- `/docs/architecture.md` - System overview (TO CREATE)
- `/docs/prompts.md` - Prompt library documentation (TO CREATE)
- `/README.md` - Update with deployment section (MODIFY)

### Key Dependencies

**Current (Keep):**
- `@anthropic-ai/sdk` (^0.65.0) - Claude API client
- `@prisma/client` (^6.17.1) - Database ORM
- `next` (14.2.18) - Framework
- `zod` (^3.25.76) - Validation
- `nanoid` (^5.1.6) - Unique IDs for shareable URLs

**Add for Production:**
- `pino` (^9.6.0) - Structured logging
- `pino-pretty` (^13.0.0) - Development log formatting (devDependency)
- `@upstash/ratelimit` (^2.0.0) - Rate limiting (OPTIONAL, if needed)
- `@upstash/redis` (^1.28.0) - Redis client (OPTIONAL, if rate limiting added)

**Platform-Specific:**
- Railway CLI: `npm install -g @railway/cli`
- PostgreSQL client: `pg` (already included via Prisma)

### Testing Infrastructure

**Current Testing Approach:**
- Manual testing via CLI: `npm run test-discussion`
- Browser testing: `npm run dev` + manual UI interaction
- Cost tracking: Verified via transcript logs

**Production Testing Checklist (after deployment):**

1. **Deployment Verification:**
   - [ ] Railway app deploys successfully
   - [ ] Environment variables set (ANTHROPIC_API_KEY, DATABASE_URL)
   - [ ] PostgreSQL connection works (check Railway logs)
   - [ ] Next.js build completes without errors

2. **Full Game Playthrough:**
   - [ ] Create game: `POST /api/game/create` with playerCount=10
   - [ ] Start game: `POST /api/game/[id]/start`
   - [ ] Verify Night phase completes (check logs for Mafia coordination)
   - [ ] Verify Discussion phase completes (41+ messages)
   - [ ] Verify Voting phase completes (all votes cast)
   - [ ] Verify Win condition detected (Mafia or Villagers win)
   - [ ] Verify Game Over state (status = "GAME_OVER")

3. **Cost Validation:**
   - [ ] Game total cost <$2 (below $5 budget)
   - [ ] Cache hit rate >70% (verify in logs)
   - [ ] No cost warnings in structured logs
   - [ ] Cost dashboard shows accurate data

4. **API Endpoint Testing:**
   - [ ] GET `/api/game/[id]/state` returns correct status
   - [ ] GET `/api/game/[id]/messages` returns all messages
   - [ ] GET `/api/game/[id]/votes` returns vote tally
   - [ ] GET `/api/game/[id]/results` returns roles revealed
   - [ ] GET `/api/game/[id]/stream` (SSE) sends real-time events

5. **Shareable URL Testing:**
   - [ ] Share link generated after game over
   - [ ] `/share/[shareId]` page loads full transcript
   - [ ] Roles revealed on share page
   - [ ] Share page accessible without login

6. **Replay Mode Testing (if implemented):**
   - [ ] Timeline scrubber shows all messages
   - [ ] Play/pause controls work
   - [ ] Speed control (1x, 2x, 5x) works
   - [ ] Seek (click timeline) jumps to correct message
   - [ ] Highlight reel shows key moments

7. **Error Handling Testing:**
   - [ ] Invalid API key → error logged, returns 500
   - [ ] Invalid player count → 400 error with Zod message
   - [ ] Game not found → 404 error
   - [ ] SSE disconnect → client reconnects automatically
   - [ ] Cost exceeds $10 → game aborted, logged

8. **Performance Testing:**
   - [ ] Average agent turn latency <5 seconds
   - [ ] Full game completes in <45 minutes
   - [ ] Memory usage <200MB (check Railway metrics)
   - [ ] No memory leaks (run 3 consecutive games)

9. **Monitoring Validation:**
   - [ ] Structured logs visible in Railway dashboard
   - [ ] Log entries include gameId, playerId context
   - [ ] Cost data visible in /admin/costs dashboard
   - [ ] No errors or warnings in logs (clean run)

10. **Documentation Verification:**
    - [ ] Deployment guide allows fresh setup (test with teammate)
    - [ ] Troubleshooting guide covers observed errors
    - [ ] README.md deployment section accurate

## Questions for Planner

1. **Database Decision:** Migrate to PostgreSQL now (4-6 hours) or defer and deploy Fly.io with SQLite (simpler but limits scaling)?
   - **Recommendation:** PostgreSQL now. Inevitable for Stage 2, Railway makes it easy.

2. **Monitoring Approach:** Build simple cost dashboard (/admin/costs) or integrate third-party (Sentry/Axiom)?
   - **Recommendation:** Cost dashboard. Third-party overkill for Stage 1, defer to Stage 2.

3. **Rate Limiting Priority:** Implement now (2 hours) or wait for abuse evidence?
   - **Recommendation:** Wait. Use Railway platform limits initially, add Upstash if needed.

4. **Replay Mode Scope:** Full timeline scrubbing (4-5 hours) or simpler "jump to highlight" (2 hours)?
   - **Recommendation:** Full timeline. Core feature, worth investment for spectator experience.

5. **Documentation Depth:** Comprehensive architecture diagrams or minimal deployment guide only?
   - **Recommendation:** Minimal first (deployment + troubleshooting), expand if time permits.

6. **Highlight Reel Complexity:** Auto-detect key moments (2-3 hours) or manual curation (admin selects highlights)?
   - **Recommendation:** Auto-detect. Provides immediate value, manual curation is maintenance overhead.

7. **Testing Strategy:** Automated tests (Jest/Playwright, +6 hours) or manual checklist (current approach)?
   - **Recommendation:** Manual checklist. Automated tests valuable for Stage 2, manual sufficient for now.

8. **Shareable URL Privacy:** Public (anyone with link) or auth-gated (login required)?
   - **Recommendation:** Public. Matches typical game share expectations (chess.com, etc.).

9. **Cache Hit Rate Priority:** Iterate on prompts now to reach 70% (unknown time) or accept 48% and monitor?
   - **Recommendation:** Monitor and iterate. 48% = $1.25/game (acceptable), improve if cost grows.

10. **Platform Choice Confirmation:** Railway (PostgreSQL required) or Fly.io (keep SQLite)?
    - **Recommendation:** Railway. PostgreSQL is better long-term investment, Railway deployment is simpler.

---

**Total Estimated Effort for Iteration 3 (Critical Path):**
- Deployment (Railway + PostgreSQL): 4-6 hours
- Structured Logging (Pino): 3-4 hours
- Cost Circuit Breaker: 1 hour
- Shareable URLs: 2-3 hours
- Cost Dashboard: 2-3 hours
- Documentation: 3-4 hours
- **Total: 15-21 hours**

**With Optional Features (Replay Mode, Highlights, Rate Limiting):**
- Replay Mode: 4-5 hours
- Highlight Reel: 2-3 hours
- Rate Limiting: 2 hours
- SSE Reconnection: 1-2 hours
- **Total: 24-33 hours**

**Recommendation:** Prioritize critical path (15-21 hours) for production readiness. Add replay mode + highlights if time permits (core feature requests). Defer rate limiting unless abuse observed.
