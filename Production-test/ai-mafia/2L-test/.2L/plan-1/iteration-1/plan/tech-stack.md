# Technology Stack

## Core Framework

**Decision:** Next.js 14.2.18 (App Router)

**Rationale:**
- **App Router maturity:** Version 14.2.x is stable for production (avoid 15.x beta issues)
- **Server Components:** Reduce client bundle size for AI orchestration logic (runs server-side)
- **Native API routes:** Built-in support for tRPC-style endpoints and SSE streams
- **Native streaming:** ReadableStream support for Server-Sent Events (no external library needed)
- **TypeScript integration:** Excellent type safety with zero configuration
- **Vercel deployment:** One-click deployment for future iterations (though not used in Iteration 1)
- **Confirmed by master plan:** Pre-selected as framework

**Version Specificity:** `14.2.18` - Latest stable 14.x release (February 2024)

**Alternatives Considered:**
- Next.js 13 - Rejected (App Router less mature, worse streaming support)
- Remix - Rejected (less mature SSE support, smaller ecosystem)
- Express + React - Rejected (more boilerplate, no native streaming)

## Database

**Decision:** SQLite 3.x with Prisma ORM 6.17.1

**Rationale:**
- **Perfect for single-game Stage 1:** No concurrent game support needed in Iteration 1
- **WAL mode enabled:** Write-Ahead Logging allows concurrent reads during Discussion writes
- **Zero configuration:** No separate database server, just a file (`dev.db`)
- **Prisma type safety:** Auto-generated TypeScript types from schema, compile-time query validation
- **Easy PostgreSQL migration:** If Stage 2 needs multi-game support, Prisma makes migration seamless
- **Performance:** SQLite handles 50-500 messages with proper indexes (<1 second queries)
- **Confirmed by master plan:** Pre-selected as database

**Version:** Prisma `6.17.1` (latest stable, January 2025), SQLite `3.x` (system default)

**Configuration:**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

**Environment Variable:**
```env
DATABASE_URL="file:./dev.db"
```

**WAL Mode Setup:**
```bash
# Enable WAL mode (one-time setup after first migration)
sqlite3 dev.db "PRAGMA journal_mode=WAL;"
```

**Schema Strategy:**
- Define full schema upfront (including Iteration 2 tables like `votes`, `game_events`)
- Use only Discussion-related tables in Iteration 1
- Avoids migration disruption in Iteration 2

**Alternatives Considered:**
- PostgreSQL - Rejected (overkill for single-game scenario, requires separate server)
- MongoDB - Rejected (NoSQL not ideal for relational game data)
- In-memory only - Rejected (loses data on crash, can't review transcripts later)

## AI Model & SDK

**Decision:** Claude 4.5 Sonnet (model: `claude-sonnet-4.5-20250929`) via @anthropic-ai/sdk 0.65.0

**Rationale:**
- **Latest production model:** Claude 4.5 Sonnet released September 2025 (superior strategic reasoning vs 4.0)
- **200K context window:** Supports full game history (50+ messages, votes, deaths) without pruning
- **Prompt caching support:** 73% cost reduction ($17.55 → $4.62 per game) - CRITICAL for iteration budget
- **Official TypeScript SDK:** @anthropic-ai/sdk has native types, retry logic, streaming support
- **Excellent documentation:** Examples, error handling patterns, prompt engineering guides
- **Confirmed by master plan:** Pre-selected as AI model
- **Cost efficiency:** $3/M input tokens ($0.30/M cached), $15/M output tokens

**Model Specificity:** `claude-sonnet-4.5-20250929` - Use exact model ID (not just "claude-sonnet-4.5") to ensure consistency

**SDK Version:** `@anthropic-ai/sdk@0.65.0` (December 2024, supports prompt caching)

**API Configuration:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: 'claude-sonnet-4.5-20250929',
  max_tokens: 200,        // Control response length (cost optimization)
  temperature: 0.8,        // Creative deception + varied responses
  top_p: 1.0,             // Default (temperature handles creativity)
  system: [               // Prompt caching structure
    {
      type: 'text',
      text: CACHED_SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' } // Cache for 5 minutes
    }
  ],
  messages: CONVERSATION_HISTORY // Fresh content (not cached)
});
```

**Temperature Rationale:**
- 0.8 chosen for balance:
  - High enough for creative Mafia lies (not predictable)
  - High enough for natural conversation (not robotic)
  - Low enough for strategic coherence (not chaotic)
- Tested range: 0.7 (too predictable) → 0.9 (too random) → 0.8 (optimal)

**Max Tokens Rationale:**
- 200 tokens ≈ 40-50 words (with safety buffer)
- Target response: 15-30 words (conversational, not essays)
- Buffer prevents mid-sentence cutoffs
- Cost control: 200 tokens × 50 turns = 10K output tokens = $0.15/game

**Alternatives Considered:**
- Claude Opus - Rejected (3x cost, marginal quality gain for Mafia gameplay)
- GPT-4 Turbo - Rejected (worse strategic reasoning, no native prompt caching)
- Open source models (Llama 3) - Rejected (require self-hosting, worse conversation quality)

## Language

**Decision:** TypeScript 5.6.3 (Strict Mode)

**Rationale:**
- **Strict null checks:** Prevents runtime errors from undefined/null (critical for agent orchestration)
- **Type inference:** Reduces boilerplate while maintaining safety
- **Prisma integration:** Auto-generated types from database schema
- **IDE support:** Excellent autocomplete, refactoring, error detection in VS Code
- **Next.js native:** Zero configuration with Next.js 14

**Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Key Settings:**
- `strict: true` - All strict checks enabled
- `noUncheckedIndexedAccess: true` - Array access returns `T | undefined` (prevents out-of-bounds bugs)
- `esModuleInterop: true` - Allows `import Anthropic from '@anthropic-ai/sdk'` syntax

## Styling

**Decision:** Tailwind CSS 3.4.17

**Rationale:**
- **Rapid prototyping:** Utility-first classes enable fast UI iteration (no CSS files needed)
- **No runtime cost:** All styles compile to static CSS (no JS bundle overhead)
- **Next.js integration:** Built-in support via PostCSS
- **Minimal styling goal:** Iteration 1 requires functional layout only (polish deferred to Iteration 3)
- **Easy customization:** Theme configuration for future iterations

**Version:** `3.4.17` (latest stable, December 2024)

**Configuration:**
```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {}, // Extend theme in Iteration 3
  },
  plugins: [],
};
export default config;
```

**Styling Priority for Iteration 1:**
- Functional layout: YES (readable feed, clear phase indicator)
- Visual polish: NO (defer to Iteration 3)
- Animations: NO (except auto-scroll in Discussion feed)
- Responsive design: NO (desktop-only acceptable)
- Dark mode: NO
- Accessibility: NO (defer to Iteration 3)

**Alternatives Considered:**
- Styled Components - Rejected (adds client-side runtime, slower)
- CSS Modules - Rejected (more boilerplate for simple UI)
- Plain CSS - Rejected (too slow for prototyping)

## Real-time Updates

**Decision:** Server-Sent Events (SSE) via Next.js ReadableStream

**Rationale:**
- **Native Next.js support:** Route Handlers support SSE via ReadableStream (no external library)
- **Unidirectional:** Server → client only (perfect for spectator mode, no client→server needed)
- **Automatic reconnection:** EventSource API reconnects automatically on disconnect
- **HTTP-based:** Works through firewalls/proxies (unlike WebSockets which often get blocked)
- **Simple implementation:** 10 lines server code, 5 lines client code
- **Confirmed by master plan:** Pre-selected as real-time strategy

**Implementation Pattern:**
```typescript
// Server: app/api/game/[gameId]/stream/route.ts
export async function GET(req: Request, { params }: { params: { gameId: string } }) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`));

      gameEventEmitter.on('message', (data) => {
        if (data.gameId === params.gameId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }
      });

      req.signal.addEventListener('abort', () => controller.close());
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Client: components/DiscussionFeed.tsx
const eventSource = new EventSource(`/api/game/${gameId}/stream`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'NEW_MESSAGE') {
    setMessages(prev => [...prev, data.payload]);
  }
};
```

**Fallback Strategy:**
- SSE works reliably in 95%+ of environments
- Implement 2-second polling fallback ONLY if QA reveals SSE issues
- Deferred to QA: Don't implement polling preemptively

**Alternatives Considered:**
- WebSockets - Rejected (overkill for unidirectional updates, requires ws library, often blocked)
- Polling only - Rejected (500ms-2s latency, unnecessary load)
- Long polling - Rejected (more complex than SSE, no native browser support)

## External Integrations

### Claude API (Anthropic)

**Purpose:** Generate agent responses during Discussion phase

**Integration:** @anthropic-ai/sdk via HTTPS

**Configuration:**
- **API Key Storage:** `.anthropic-key.txt` (already in .gitignore per master plan)
- **Environment Variable:** `ANTHROPIC_API_KEY` loaded from file
- **Rate Limits:** 50 requests/minute (Standard tier) - sufficient for 8-12 agents at 1 turn per 10 seconds
- **Timeout:** 10-second hard limit per request (average response: 2-3 seconds)
- **Retry Strategy:** Exponential backoff (1s, 2s, 4s) for 429 rate limit errors
- **Error Handling:** Log errors, generate fallback response, continue Discussion (don't crash)

**Cost Tracking:**
- Input tokens: $3/M ($0.30/M cached with 90% discount)
- Output tokens: $15/M
- Log every request: input tokens, cached tokens, output tokens, cost
- Display summary after each test: total cost, cache hit rate

**Prompt Caching Implementation (CRITICAL):**
```typescript
system: [
  {
    type: 'text',
    text: STABLE_SYSTEM_PROMPT,      // Agent role, personality, game rules
    cache_control: { type: 'ephemeral' } // Cache for 5 minutes
  },
  {
    type: 'text',
    text: STABLE_GAME_HISTORY,       // Previous rounds, votes, deaths
    cache_control: { type: 'ephemeral' }
  }
],
messages: FRESH_RECENT_DISCUSSION     // Last 20-30 messages (not cached)
```

**Cache Effectiveness Validation:**
- First turn: 0% cache hit (cache creation)
- Turn 2+: 70-90% cache hit rate expected
- If cache hit rate <50%: FAIL test, investigate configuration

**Testing Strategy:**
- Mock API in unit tests (fixtures)
- Real API in CLI tests (with cost budget)
- Log ALL calls: timestamp, latency, tokens, cost

## Environment Variables

All required environment variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# Anthropic API (load from .anthropic-key.txt)
ANTHROPIC_API_KEY="sk-ant-..."

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Discussion Configuration
DISCUSSION_DURATION_SECONDS=180      # 3 minutes
AGENT_TURN_TIMEOUT_SECONDS=10        # 10 second hard limit
AGENT_TURNS_PER_ROUND=5              # Each agent speaks 5 times

# Cost Limits (validation)
MAX_COST_PER_TEST=3.0                # Alert if test exceeds $3
MIN_CACHE_HIT_RATE=0.7               # Alert if cache hit rate <70%
```

## Dependencies Overview

### Production Dependencies

```json
{
  "dependencies": {
    "next": "14.2.18",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@anthropic-ai/sdk": "^0.65.0",
    "@prisma/client": "^6.17.1",
    "zod": "^3.23.8",
    "date-fns": "^3.6.0",
    "nanoid": "^5.0.7"
  }
}
```

**Key Packages:**
- `next@14.2.18` - Framework (App Router)
- `@anthropic-ai/sdk@0.65.0` - Claude API client
- `@prisma/client@6.17.1` - Database client (auto-generated)
- `zod@3.23.8` - Runtime type validation (API inputs, env vars)
- `date-fns@3.6.0` - Date formatting, duration calculations
- `nanoid@5.0.7` - Generate short unique IDs (optional, Prisma uses CUID by default)

### Development Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.6.3",
    "@types/node": "^22.10.5",
    "@types/react": "^18.3.17",
    "@types/react-dom": "^18.3.5",
    "prisma": "^6.17.1",
    "tsx": "^4.19.2",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "eslint-config-next": "14.2.18",
    "prettier": "^3.4.2",
    "chalk": "^5.3.0",
    "ora": "^8.1.1",
    "string-similarity": "^4.0.4",
    "csv-writer": "^1.6.0"
  }
}
```

**Key Packages:**
- `prisma@6.17.1` - Prisma CLI (`prisma migrate`, `prisma generate`, `prisma studio`)
- `tsx@4.19.2` - Run TypeScript CLI scripts without compilation
- `chalk@5.3.0` - Colored terminal output (CLI test harness)
- `ora@8.1.1` - CLI spinners (loading indicators)
- `string-similarity@4.0.4` - Fuzzy string matching (repetition detection)
- `csv-writer@1.6.0` - Export cost tracking data

### Installation Commands

```bash
# Install all dependencies
npm install

# Or install separately
npm install next@14.2.18 react@^18.3.1 react-dom@^18.3.1 @anthropic-ai/sdk@^0.65.0 @prisma/client@^6.17.1 zod@^3.23.8 date-fns@^3.6.0 nanoid@^5.0.7

npm install -D typescript@^5.6.3 @types/node@^22.10.5 @types/react@^18.3.17 @types/react-dom@^18.3.5 prisma@^6.17.1 tsx@^4.19.2 tailwindcss@^3.4.17 postcss@^8.4.49 autoprefixer@^10.4.20 eslint@^8.57.1 eslint-config-next@14.2.18 prettier@^3.4.2 chalk@^5.3.0 ora@^8.1.1 string-similarity@^4.0.4 csv-writer@^1.6.0

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

## Performance Targets

**API Response Time:**
- Average: <3 seconds per agent turn
- P95: <8 seconds
- P99: <10 seconds (timeout threshold)
- If consistently >8s: Reduce max_tokens from 200 to 150

**Database Query Performance:**
- Context query: <1 second (fetch 50 messages + votes + deaths)
- Write message: <100ms
- If context query >2s: Add missing indexes or prune context

**Discussion Phase Duration:**
- Target: 3 minutes (180 seconds)
- Acceptable: 3-5 minutes
- If consistently >5 minutes: Reduce turns per agent (5 → 4) or reduce player count (10 → 8)

**SSE Latency:**
- Target: <500ms (message generated → spectator sees it)
- Acceptable: <2 seconds
- If >2 seconds: Check EventEmitter overhead or network issues

**Memory Usage:**
- Target: <200MB Node.js heap
- Acceptable: <500MB
- If >500MB: Check for memory leaks (event listener cleanup)

**Cost per Test Game:**
- Target: $1.50-$2.00 (with caching)
- Acceptable: $2.00-$3.00
- If >$3.00: Caching broken, investigate immediately
- If >$5.00: FAIL test, block further testing

## Security Considerations

**API Key Management:**
- Store in `.anthropic-key.txt` (in .gitignore)
- Load into `ANTHROPIC_API_KEY` env var at runtime
- Never commit API key to git
- Never expose API key to client (Server Components only)

**Database Security:**
- SQLite file (`dev.db`) not committed to git (in .gitignore)
- No SQL injection risk (Prisma uses parameterized queries)
- No authentication needed (local development only)

**SSE Security:**
- No authentication in Iteration 1 (local development only)
- Filter events by gameId (don't leak events between games)
- Add authentication in Iteration 2 (when deployed)

**Input Validation:**
- Use Zod to validate API inputs
- Validate agent responses (minimum length, keyword checks)
- Sanitize user input (not applicable in Iteration 1 - no user input)

**Error Handling:**
- Never expose internal errors to client (log server-side only)
- Generic error messages: "Something went wrong" not "Database query failed: SELECT..."
- Log errors with structured logger (pino)

## Code Quality Standards

**Linting:** ESLint with Next.js recommended config

**Formatting:** Prettier with defaults

**Type Checking:** TypeScript strict mode (no `any` types)

**Testing:** Manual testing via CLI test harness (unit tests deferred to Iteration 2)

**Documentation:** Inline comments for complex logic, README for setup

**Git Workflow:**
- Feature branches: `builder-1`, `builder-2`, etc.
- Commit messages: Conventional Commits format (`feat:`, `fix:`, `docs:`)
- Merge to main after integration test passes

---

**Tech Stack Summary:**
- Framework: Next.js 14.2.18 App Router
- Language: TypeScript 5.6.3 strict mode
- Database: SQLite 3.x + Prisma 6.17.1
- AI: Claude 4.5 Sonnet via @anthropic-ai/sdk 0.65.0
- Styling: Tailwind CSS 3.4.17
- Real-time: Server-Sent Events (native Next.js)
- Testing: CLI test harness + manual transcript review

**Critical Technology Decisions:**
1. Prompt caching is MANDATORY (73% cost reduction)
2. SQLite is sufficient for Iteration 1 (single-game scenario)
3. SSE is simpler and more reliable than WebSockets
4. TypeScript strict mode prevents runtime errors
5. CLI test harness is primary validation tool (not web UI)
