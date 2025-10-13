# Explorer 1 Report: Project Setup & Database Schema

## Executive Summary

This greenfield AI Mafia project requires a Next.js 14 App Router foundation with Prisma + SQLite for data persistence and @anthropic-ai/sdk for Claude 4.5 Sonnet integration. The critical technical challenge is orchestrating 8-12 AI agents in strategic multi-turn conversations with persistent memory. The database schema must efficiently store conversation threads, voting history, and game events with optimized indexes for context retrieval. Project structure should separate concerns: agent orchestration, Claude API integration, Discussion phase logic, and UI components. Key success factor: Enable sub-2 second context queries for 50+ message histories to maintain conversation flow.

## Discoveries

### Current Environment Analysis
- **Project State**: Greenfield (only .2L planning directory exists)
- **API Key Location**: Confirmed at `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/.anthropic-key.txt`
- **Git Repository**: Initialized (git status shows existing commits)
- **Platform**: Linux (Ubuntu/Debian-based) with Node.js available
- **No Existing Code**: Clean slate for implementation

### Technology Version Research
- **Next.js**: Latest stable is 15.5.4, but Next.js 14.2.x recommended for App Router stability
- **Prisma**: Latest is 6.17.1 (full support for SQLite WAL mode)
- **@anthropic-ai/sdk**: Latest is 0.65.0 (supports Claude 4.5 Sonnet with prompt caching)
- **TypeScript**: 5.6.x recommended for strictest type checking
- **Node.js**: Project should target Node 18.x+ for native fetch support

### Critical Technical Decisions from Master Plan
- **NO Agent SDK exists** - must build custom orchestration
- **Claude 4.5 Sonnet** model: `claude-sonnet-4.5-20250929`
- **200K context window** available for full game history
- **Prompt caching REQUIRED** - 73% cost reduction ($17.55 → $4.62 per game)
- **Sequential turn management** during Discussion (parallel breaks coherence)
- **Server-Sent Events** for real-time spectator updates

## Patterns Identified

### Pattern 1: Next.js 14 App Router Structure
**Description:** Hybrid server/client component architecture with API routes and streaming

**Use Case:** 
- Server Components for data fetching and AI orchestration (no client bundle cost)
- Client Components for real-time UI updates (SSE listeners, interactive elements)
- Route Handlers for tRPC endpoints and SSE streams

**Example Structure:**
```
app/
├── layout.tsx                    # Root layout (Tailwind, metadata)
├── page.tsx                      # Lobby screen (Server Component)
├── test-discussion/
│   └── page.tsx                  # Discussion test viewer (Client Component)
├── game/
│   └── [gameId]/
│       ├── page.tsx              # Live game viewer (Client Component)
│       └── results/
│           └── page.tsx          # Game over screen
└── api/
    ├── game/
    │   ├── create/
    │   │   └── route.ts          # POST /api/game/create
    │   ├── start/
    │   │   └── route.ts          # POST /api/game/start
    │   └── [gameId]/
    │       ├── stream/
    │       │   └── route.ts      # GET /api/game/:id/stream (SSE)
    │       └── state/
    │           └── route.ts      # GET /api/game/:id/state
    └── discussion/
        └── test/
            └── route.ts          # POST /api/discussion/test
```

**Recommendation:** YES - Use App Router for native streaming and server component benefits

### Pattern 2: Prisma Schema with Strategic Indexes
**Description:** SQLite database with Prisma ORM optimized for conversation context queries

**Use Case:**
- Fast retrieval of full game history for agent context building
- Efficient filtering by gameId + roundNumber for multi-round games
- Timestamp-based ordering for chronological event reconstruction

**Example Schema:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Game {
  id           String   @id @default(cuid())
  status       String   // LOBBY, NIGHT, DAY, DISCUSSION, VOTING, GAME_OVER
  currentPhase String?
  phaseEndTime DateTime?
  roundNumber  Int      @default(1)
  winner       String?  // MAFIA, VILLAGERS, null
  playerCount  Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  players            Player[]
  discussionMessages DiscussionMessage[]
  votes              Vote[]
  gameEvents         GameEvent[]

  @@index([status])
  @@index([createdAt])
}

model Player {
  id          String  @id @default(cuid())
  gameId      String
  name        String
  role        String  // MAFIA, VILLAGER
  personality String  // JSON: {traits: ["analytical", "aggressive"], ...}
  isAlive     Boolean @default(true)
  position    Int     // Display order: 0-11

  game               Game                @relation(fields: [gameId], references: [id], onDelete: Cascade)
  messages           DiscussionMessage[] @relation("MessageAuthor")
  votesGiven         Vote[]              @relation("Voter")
  votesReceived      Vote[]              @relation("Target")
  repliesReceived    DiscussionMessage[] @relation("ReplyTarget")

  @@unique([gameId, position])
  @@index([gameId, isAlive])
  @@index([gameId, role])
}

model DiscussionMessage {
  id           String   @id @default(cuid())
  gameId       String
  roundNumber  Int
  playerId     String
  message      String   @db.Text
  inReplyToId  String?
  timestamp    DateTime @default(now())
  turn         Int      // Turn number within this Discussion phase

  game        Game                @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player      Player              @relation("MessageAuthor", fields: [playerId], references: [id], onDelete: Cascade)
  inReplyTo   DiscussionMessage?  @relation("ReplyThread", fields: [inReplyToId], references: [id], onDelete: SetNull)
  replies     DiscussionMessage[] @relation("ReplyThread")
  replyTarget Player?             @relation("ReplyTarget", fields: [inReplyToId], references: [id])

  @@index([gameId, roundNumber, timestamp])
  @@index([gameId, playerId])
  @@index([playerId, timestamp])
  @@index([inReplyToId])
}

model Vote {
  id            String   @id @default(cuid())
  gameId        String
  roundNumber   Int
  voterId       String
  targetId      String
  justification String   @db.Text
  timestamp     DateTime @default(now())

  game   Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
  voter  Player @relation("Voter", fields: [voterId], references: [id], onDelete: Cascade)
  target Player @relation("Target", fields: [targetId], references: [id], onDelete: Cascade)

  @@index([gameId, roundNumber])
  @@index([gameId, voterId])
  @@index([gameId, targetId])
}

model GameEvent {
  id        String   @id @default(cuid())
  gameId    String
  type      String   // PHASE_CHANGE, PLAYER_ELIMINATED, VOTE_CAST, GAME_START, GAME_END
  data      String   @db.Text // JSON: {phase: "NIGHT", eliminatedPlayer: "Agent-1", ...}
  timestamp DateTime @default(now())

  game Game @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@index([gameId, timestamp])
  @@index([type, timestamp])
}
```

**Recommendation:** YES - This schema supports all Iteration 1 requirements with efficient indexes

### Pattern 3: Agent Orchestration Layer
**Description:** Separation of concerns between agent management, context building, and Claude API calls

**Use Case:**
- Maintain agent state (role, personality, memory) separately from conversation logic
- Build context from database queries before each agent turn
- Isolate Claude API integration for easy testing and prompt iteration

**Example Structure:**
```
src/
├── lib/
│   ├── agent/
│   │   ├── types.ts              # Agent interfaces, role enums
│   │   ├── manager.ts            # AgentManager: create, get, list agents
│   │   ├── personality.ts        # Personality generation (5+ traits)
│   │   └── prompts.ts            # System prompts (Mafia vs Villager)
│   ├── claude/
│   │   ├── client.ts             # Anthropic SDK wrapper
│   │   ├── context-builder.ts   # Build conversation context from DB
│   │   ├── prompt-cache.ts      # Prompt caching implementation
│   │   └── types.ts              # Claude API types
│   ├── discussion/
│   │   ├── orchestrator.ts      # Discussion phase controller
│   │   ├── turn-scheduler.ts   # Round-robin turn management
│   │   └── types.ts              # Discussion phase types
│   ├── game/
│   │   ├── state-machine.ts     # Game phase transitions (Iteration 2)
│   │   └── role-assignment.ts   # Role distribution algorithm
│   └── db/
│       ├── client.ts             # Prisma client singleton
│       └── seed.ts               # Test data generation
```

**Recommendation:** YES - Clear separation enables independent testing of AI logic vs game logic

### Pattern 4: Server-Sent Events for Real-time Updates
**Description:** Unidirectional streaming from server to client for live game updates

**Use Case:**
- Push new discussion messages to spectators instantly (<1 second latency)
- Stream phase changes, votes, eliminations without polling
- Fallback to polling if SSE connection fails

**Example Implementation:**
```typescript
// app/api/game/[gameId]/stream/route.ts
export async function GET(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`));

      // Set up database listener or polling
      const interval = setInterval(async () => {
        const latestMessage = await getLatestMessage(params.gameId);
        if (latestMessage) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'MESSAGE', payload: latestMessage })}\n\n`)
          );
        }
      }, 500);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
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
```

**Recommendation:** YES - Native Next.js support, simple implementation, perfect for spectator use case

### Pattern 5: Prompt Caching Strategy
**Description:** Cache game history context to reduce token costs by 73%

**Use Case:**
- Cache static game history (previous rounds, deaths, votes) that doesn't change
- Only send new Discussion messages as uncached content
- Critical for cost control: $17.55 → $4.62 per game

**Example Implementation:**
```typescript
// src/lib/claude/context-builder.ts
interface AgentContext {
  cached: {
    gameRules: string;
    roleDescription: string;
    personalityProfile: string;
    previousRounds: ConversationRound[];
    voteHistory: VoteRecord[];
    deathLog: DeathRecord[];
  };
  current: {
    currentRound: number;
    aliveAgents: string[];
    recentMessages: Message[];
  };
}

async function buildContextWithCaching(
  gameId: string,
  agentId: string,
  roundNumber: number
): Promise<AgentContext> {
  // Fetch static context (cacheable)
  const cachedContext = {
    gameRules: MAFIA_RULES_TEXT,
    roleDescription: await getAgentRole(agentId),
    personalityProfile: await getAgentPersonality(agentId),
    previousRounds: await getPreviousRounds(gameId, roundNumber - 1),
    voteHistory: await getVoteHistory(gameId),
    deathLog: await getDeathLog(gameId),
  };

  // Fetch dynamic context (not cached)
  const currentContext = {
    currentRound: roundNumber,
    aliveAgents: await getAliveAgents(gameId),
    recentMessages: await getRecentMessages(gameId, roundNumber),
  };

  return { cached: cachedContext, current: currentContext };
}

// Claude API call with caching headers
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4.5-20250929',
  max_tokens: 200,
  system: [
    {
      type: 'text',
      text: formatCachedContext(context.cached),
      cache_control: { type: 'ephemeral' }
    },
    {
      type: 'text',
      text: formatCurrentContext(context.current)
    }
  ],
  messages: [{ role: 'user', content: 'Generate your next Discussion statement.' }],
});
```

**Recommendation:** CRITICAL - Must implement from Day 1 to avoid runaway costs

## Complexity Assessment

### High Complexity Areas

#### 1. Discussion Phase Orchestrator (HIGHEST RISK)
**Complexity Factors:**
- Sequential turn management across 8-12 agents
- Multi-round system (each agent speaks 3-5 times)
- 10-second timeout per turn with graceful fallback
- Context building from 50+ messages, votes, deaths
- Real-time broadcasting via SSE

**Estimated Builder Effort:** 8-10 hours

**Recommendation:** Builder should implement in phases:
1. Phase 1: Basic turn scheduler (round-robin, no timeouts)
2. Phase 2: Add context building and database queries
3. Phase 3: Add timeout handling and error recovery
4. Phase 4: Add SSE broadcasting

**Potential Split:** If builder struggles with concurrent concerns, split into:
- Sub-builder A: Turn scheduler + database queries
- Sub-builder B: SSE integration + real-time updates

#### 2. Context Builder with Prompt Caching
**Complexity Factors:**
- Query optimization for sub-2-second context retrieval
- Proper cache boundary detection (what's static vs dynamic)
- Formatting conversation history for Claude API
- Token counting to stay within 200K context window
- Implementing ephemeral cache headers correctly

**Estimated Builder Effort:** 6-8 hours

**Recommendation:** Builder should:
1. Start without caching to validate query performance
2. Add caching once queries are optimized
3. Log cache hit rates to verify caching is working
4. Test with 100+ message scenarios to ensure performance

**Potential Split:** Unlikely to need split (focused problem domain)

#### 3. Agent System Prompts (Mafia vs Villager)
**Complexity Factors:**
- Balancing deception vs believability for Mafia agents
- Logical deduction without being too robotic for Villagers
- Personality injection without overwhelming role instructions
- Anti-repetition constraints (agents don't repeat themselves)
- Strategic thinking instructions (vote based on evidence)

**Estimated Builder Effort:** 6-8 hours (including iteration)

**Recommendation:** Builder should:
1. Start with basic role prompts (2-3 paragraphs each)
2. Run 5+ test games, manually review transcripts
3. Identify weaknesses (too repetitive, not strategic, etc.)
4. Iterate on prompts 3-5 times until quality gates met

**Potential Split:** NOT recommended - prompt engineering requires tight feedback loop

### Medium Complexity Areas

#### 4. Database Schema Implementation
**Complexity:** Schema design is straightforward, but index optimization requires testing
**Estimated Builder Effort:** 3-4 hours
**Recommendation:** Implement schema exactly as specified, add indexes from Day 1

#### 5. Claude API Integration
**Complexity:** SDK is well-documented, but retry logic and error handling adds complexity
**Estimated Builder Effort:** 4-5 hours
**Recommendation:** Implement exponential backoff retry, log all API errors for debugging

#### 6. CLI Test Harness
**Complexity:** Simple Node.js script, but needs proper output formatting
**Estimated Builder Effort:** 3-4 hours
**Recommendation:** Use `chalk` for colored terminal output, `ora` for spinners

### Low Complexity Areas

#### 7. Basic Web UI (Discussion Viewer)
**Complexity:** Simple Next.js page with SSE listener
**Estimated Builder Effort:** 3-4 hours
**Recommendation:** Focus on functionality over aesthetics in Iteration 1

#### 8. Project Setup (Next.js, TypeScript, Prisma, Tailwind)
**Complexity:** Standard Next.js setup, well-documented
**Estimated Builder Effort:** 1-2 hours
**Recommendation:** Use `create-next-app` with TypeScript template, add dependencies

## Technology Recommendations

### Primary Stack

#### Framework: Next.js 14.2.x (App Router)
**Rationale:**
- App Router provides native Server Components (reduce client bundle for AI logic)
- Built-in API routes for tRPC endpoints and SSE streams
- Native streaming support for real-time updates
- Excellent TypeScript support
- Vercel deployment is one-click (production readiness)

**Version:** `14.2.18` (latest stable 14.x, avoid 15.x beta issues)

**Alternative Considered:** Next.js 13 - Rejected (App Router less mature)

#### Database: SQLite with Prisma ORM
**Rationale:**
- SQLite perfect for single-game Stage 1 scenario (no concurrent game support needed)
- WAL mode enables concurrent reads during Discussion phase
- Zero configuration (no separate database server)
- Prisma provides type-safe queries and migrations
- Easy migration to PostgreSQL in Stage 2 if needed

**Version:** Prisma `6.17.1`, SQLite `3.x` (system default)

**Configuration:**
```env
DATABASE_URL="file:./dev.db?connection_limit=1&pool_timeout=10"
```

**Alternative Considered:** PostgreSQL - Rejected (overkill for Stage 1, adds deployment complexity)

#### AI: Claude 4.5 Sonnet via @anthropic-ai/sdk
**Rationale:**
- Claude 4.5 Sonnet is latest model (superior strategic reasoning vs 4.0)
- 200K context window supports full game history (50+ messages, votes, deaths)
- Prompt caching reduces cost 73% ($17.55 → $4.62 per game)
- @anthropic-ai/sdk has native TypeScript support
- Excellent documentation and examples

**Version:** `@anthropic-ai/sdk@0.65.0`

**Model:** `claude-sonnet-4.5-20250929`

**Configuration:**
- Temperature: `0.8` (creative deception, varied responses)
- Max tokens: `150-200` (control output length and cost)
- Top P: Default (no override needed)

**Alternative Considered:** Claude Opus - Rejected (3x cost, marginal quality gain for this use case)

#### Language: TypeScript 5.6.x (Strict Mode)
**Rationale:**
- Strict mode catches errors at compile time (null checks, type safety)
- Essential for complex agent orchestration logic
- Excellent IDE support (autocomplete, refactoring)
- Prisma generates types automatically

**Configuration:**
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

#### Styling: Tailwind CSS 3.x
**Rationale:**
- Rapid prototyping for Iteration 1 basic UI
- No CSS-in-JS runtime cost
- Excellent with Next.js (built-in support)
- Easy to customize for Iteration 3 polish

**Version:** `3.4.x` (latest stable)

**Alternative Considered:** Styled Components - Rejected (adds client-side runtime)

#### Real-time: Server-Sent Events (Native)
**Rationale:**
- Native Next.js Route Handlers support SSE
- Unidirectional (server → client) perfect for spectator mode
- No external dependencies (WebSockets require separate server)
- Automatic reconnection in modern browsers
- 2-second polling fallback for edge cases

**Implementation:** Next.js Route Handler with ReadableStream

**Alternative Considered:** WebSockets - Rejected (overkill for unidirectional updates, requires ws library)

### Supporting Libraries

#### 1. @prisma/client (Database Client)
**Purpose:** Auto-generated type-safe database client
**Version:** `6.17.1` (matches Prisma CLI version)
**Installation:** Auto-installed with `prisma generate`

#### 2. zod (Schema Validation)
**Purpose:** Runtime validation for API inputs, environment variables
**Version:** `3.23.x`
**Use Case:**
```typescript
// Validate API input
const CreateGameSchema = z.object({
  playerCount: z.number().min(8).max(12),
});

// Validate environment variables
const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
});
```

#### 3. chalk (CLI Colored Output)
**Purpose:** Colored terminal output for CLI test harness
**Version:** `5.3.x`
**Use Case:** Highlight agent names, phases, errors in terminal

#### 4. ora (CLI Spinners)
**Purpose:** Loading indicators for CLI test harness
**Version:** `8.1.x`
**Use Case:** Show "Agent thinking..." while waiting for Claude API response

#### 5. date-fns (Date Utilities)
**Purpose:** Timestamp formatting, duration calculations
**Version:** `3.6.x`
**Use Case:** Format timestamps for discussion feed, calculate phase durations

#### 6. nanoid (ID Generation)
**Purpose:** Generate short unique IDs (alternative to UUIDs)
**Version:** `5.0.x`
**Use Case:** Agent naming (Agent-abc123), event IDs
**Note:** Prisma default is CUID, but nanoid is shorter for display

### Development Dependencies

#### 1. typescript (Compiler)
**Version:** `5.6.x`

#### 2. @types/node (Node.js Type Definitions)
**Version:** `22.x` (matches Node 18+ LTS)

#### 3. prisma (CLI Tool)
**Version:** `6.17.1`
**Use Case:** `prisma migrate dev`, `prisma studio`, `prisma generate`

#### 4. eslint + prettier (Code Quality)
**Version:** ESLint `8.x`, Prettier `3.x`
**Configuration:** Next.js recommended config

#### 5. tsx (TypeScript Execution)
**Version:** `4.19.x`
**Use Case:** Run CLI test harness without compilation (`tsx src/cli/test-discussion.ts`)

## Integration Points

### External APIs

#### Claude API (Anthropic)
**Purpose:** Generate agent responses during Discussion phase
**Complexity:** MEDIUM
**Considerations:**
- **Rate Limits:** 50 requests/minute (Standard tier) - sufficient for 8-12 agents at 1 turn per 10 seconds
- **Retry Strategy:** Exponential backoff (1s, 2s, 4s) for 429 rate limit errors
- **Timeout:** 10-second hard limit per agent turn (average response: 2-3 seconds)
- **Error Handling:** Fallback responses if API fails ("Agent-X is thinking carefully..." placeholder)
- **Cost Tracking:** Log input/output tokens per request, calculate cost per game
- **Prompt Caching:** MUST enable to achieve 73% cost reduction

**Integration Pattern:**
```typescript
// src/lib/claude/client.ts
export async function generateAgentResponse(
  context: AgentContext,
  retries = 3
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4.5-20250929',
      max_tokens: 200,
      temperature: 0.8,
      system: formatContextWithCaching(context),
      messages: [{ role: 'user', content: 'Generate your next statement.' }],
    });

    logTokenUsage(response.usage);
    return response.content[0].text;
  } catch (error) {
    if (error.status === 429 && retries > 0) {
      await delay(Math.pow(2, 4 - retries) * 1000);
      return generateAgentResponse(context, retries - 1);
    }
    throw error;
  }
}
```

**Testing Strategy:**
- Mock API responses in unit tests
- Use real API in integration tests with small token limits
- Monitor API latency in production (target: <3 seconds per turn)

### Internal Integrations

#### 1. Discussion Orchestrator ↔ Database
**Connection:** Orchestrator queries database for context, writes messages after each turn
**Data Flow:**
```
Orchestrator → DB: Query previous messages, votes, deaths
DB → Orchestrator: Return conversation history
Orchestrator → Claude API: Build context, generate response
Claude API → Orchestrator: Return agent message
Orchestrator → DB: Write new message
Orchestrator → SSE: Broadcast message to spectators
```

**Complexity:** HIGH (critical path for conversation flow)

**Performance Requirement:** Context query must complete in <1 second to maintain conversation pace

**Optimization:**
- Use composite indexes on (gameId, roundNumber, timestamp)
- Limit query to last 100 messages (sufficient context, fast retrieval)
- Cache alive agent list (updated only on eliminations)

#### 2. Context Builder ↔ Prisma Client
**Connection:** Context builder formats database query results into Claude API context
**Data Flow:**
```
Context Builder → Prisma: Query messages, votes, events
Prisma → Context Builder: Raw database records
Context Builder → Formatter: Convert to natural language
Formatter → Cache Manager: Mark cacheable content
Cache Manager → Claude API: Format with cache headers
```

**Complexity:** MEDIUM (mostly data transformation logic)

**Key Challenge:** Detect cache boundaries (what changed since last turn vs what's static)

**Implementation:**
```typescript
interface FormattedContext {
  cached: {
    systemPrompt: string;
    roleDescription: string;
    previousRounds: string;
  };
  current: {
    currentRound: string;
    recentMessages: string;
  };
}

async function formatContext(gameId: string, agentId: string): Promise<FormattedContext> {
  const [agent, previousRounds, currentMessages] = await Promise.all([
    prisma.player.findUnique({ where: { id: agentId } }),
    prisma.discussionMessage.findMany({
      where: { gameId, roundNumber: { lt: currentRound } },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.discussionMessage.findMany({
      where: { gameId, roundNumber: currentRound },
      orderBy: { timestamp: 'asc' },
    }),
  ]);

  return {
    cached: {
      systemPrompt: getSystemPrompt(agent.role),
      roleDescription: `You are ${agent.name}, a ${agent.role}.`,
      previousRounds: formatPreviousRounds(previousRounds),
    },
    current: {
      currentRound: `Round ${currentRound}`,
      recentMessages: formatMessages(currentMessages),
    },
  };
}
```

#### 3. SSE Stream ↔ Discussion Orchestrator
**Connection:** Orchestrator broadcasts new messages to all connected spectators
**Data Flow:**
```
Orchestrator → EventEmitter: Emit MESSAGE event
EventEmitter → SSE Route Handler: Receive event
SSE Route Handler → HTTP Stream: Encode and send
HTTP Stream → Client Browser: Receive via EventSource
```

**Complexity:** LOW (Next.js handles HTTP streaming)

**Key Challenge:** Ensure all spectators receive message before next turn starts

**Implementation:**
```typescript
// Simple in-memory event emitter for Iteration 1
export const gameEventEmitter = new EventEmitter();

// Orchestrator emits after writing to DB
await prisma.discussionMessage.create({ data: newMessage });
gameEventEmitter.emit('message', { gameId, message: newMessage });

// SSE route handler listens
gameEventEmitter.on('message', (data) => {
  if (data.gameId === currentGameId) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  }
});
```

**Scaling Consideration:** In-memory EventEmitter works for single-game Stage 1. Stage 2 multi-game needs Redis pub/sub or similar.

## Risks & Challenges

### Technical Risks

#### Risk 1: Claude API Response Time Variability
**Impact:** HIGH - Slow responses break conversation flow, frustrate spectators
**Likelihood:** MEDIUM - API latency ranges 1-5 seconds (occasionally spikes to 10s+)

**Mitigation Strategy:**
1. **10-second hard timeout** per agent turn with fallback response
2. **Async turn execution** - orchestrator doesn't block on API calls
3. **Latency logging** - track P50, P95, P99 response times
4. **Fallback responses** - pre-written generic statements if timeout occurs

**Builder Guidance:** Implement timeout from Day 1, don't wait until QA to discover API latency issues

#### Risk 2: Prompt Caching Implementation Errors
**Impact:** HIGH - Without caching, game costs $17.55 (vs $4.62), making testing expensive
**Likelihood:** MEDIUM - Cache headers must be exact format, easy to misconfigure

**Mitigation Strategy:**
1. **Test caching on Day 1** - verify cache hit rate >50% in logs
2. **Cache validation script** - automated check that cached content is static
3. **Cost alerting** - fail test if single Discussion costs >$2 (indicates caching not working)
4. **Documentation** - clear examples in builder guide

**Builder Guidance:** Review Anthropic prompt caching documentation before implementing, test with single agent first

#### Risk 3: Database Query Performance Degradation
**Impact:** MEDIUM - Slow context queries delay turns, break conversation pace
**Likelihood:** MEDIUM - SQLite performs well for 100-500 messages, but suboptimal indexes cause O(n) scans

**Mitigation Strategy:**
1. **Indexes on Day 1** - implement all recommended indexes in initial migration
2. **Query profiling** - use `EXPLAIN QUERY PLAN` to verify index usage
3. **Load testing** - test with 200+ message scenarios (simulating long games)
4. **Query time alerts** - fail test if context query takes >2 seconds

**Builder Guidance:** Run `prisma studio` to inspect query plans, optimize before adding complexity

### Complexity Risks

#### Risk 4: Discussion Orchestrator Deadlocks
**Impact:** CRITICAL - Orchestrator hangs, game never completes, no error messages
**Likelihood:** MEDIUM - Sequential turn logic with async operations prone to race conditions

**Mitigation Strategy:**
1. **State machine validation** - ensure every turn transitions to next state
2. **Timeout at orchestrator level** - if no turn completes in 30 seconds, abort Discussion
3. **Deadlock detection** - log turn start/end, alert if turn duration >15 seconds
4. **Graceful degradation** - if turn fails, skip agent and continue

**Builder Guidance:** Use explicit state tracking (`currentTurn`, `nextTurn`), avoid relying on implicit ordering

#### Risk 5: SSE Connection Drops
**Impact:** LOW - Spectators miss messages, but game continues
**Likelihood:** HIGH - SSE connections drop on network issues, browser tab switches

**Mitigation Strategy:**
1. **Auto-reconnect logic** - EventSource automatically reconnects in modern browsers
2. **State catchup** - on reconnect, fetch all messages since last received timestamp
3. **Polling fallback** - after 3 SSE failures, switch to 2-second polling
4. **Connection status UI** - show "Reconnecting..." banner to user

**Builder Guidance:** Test SSE by throttling network in Chrome DevTools, verify reconnection works

#### Risk 6: Agent Prompt Quality (Boring Conversation)
**Impact:** CRITICAL - If Discussion isn't compelling, entire game fails success criteria
**Likelihood:** MEDIUM - Prompts require iteration, initial attempts often produce robotic responses

**Mitigation Strategy:**
1. **Manual review protocol** - Run 5+ test games, read transcripts, identify weaknesses
2. **Prompt iteration budget** - Allocate 6-8 hours for prompt refinement (not just 2 hours)
3. **Quality metrics** - Track repetition rate, keyword diversity, strategic keyword usage
4. **Mafia strategy research** - Review real Mafia game transcripts for authentic language patterns

**Builder Guidance:** Don't optimize orchestrator before validating prompt quality. 80% of "fascinating" comes from prompts, 20% from orchestration.

## Recommendations for Planner

### 1. Prioritize Prompt Caching Implementation
**Rationale:** Without caching, testing is prohibitively expensive ($17.55 per test game). This blocks iteration on prompt quality, the highest-risk success criterion.

**Action:** Ensure builder implements caching FIRST (before orchestrator complexity), validates it's working, then proceeds to multi-turn logic.

**Validation:** Builder must show logs proving >50% cache hit rate on second agent turn.

### 2. Split Discussion Orchestrator if Builder Signals Overwhelm
**Rationale:** Orchestrator has 4 concurrent concerns (turn scheduling, database queries, API calls, SSE broadcasting). If builder struggles after 6 hours, split is warranted.

**Split Recommendation:**
- **Sub-builder A:** Turn scheduler + database integration (focus on sequential logic)
- **Sub-builder B:** SSE broadcasting + real-time updates (focus on streaming)

**Validation:** Monitor builder progress at 6-hour mark. If <50% complete or expressing confusion, initiate split.

### 3. Require Prompt Quality Gate Before Orchestrator Completion
**Rationale:** Orchestrator complexity is wasted if prompts produce boring conversation. Better to iterate prompts with basic orchestrator than build complex orchestrator with bad prompts.

**Action:** After basic turn scheduler works (round-robin, 40-50 total turns), run 5 test games. If conversation is robotic/repetitive, PAUSE orchestrator work and iterate on prompts.

**Quality Gate:** At least 3/5 test games must have:
- Mafia agents deflecting suspicion (not confessing)
- Villagers questioning specific agents (not generic statements)
- Agents referencing prior statements (not monologuing)

### 4. Defer CLI Test Harness Polish Until Prompts Validated
**Rationale:** Fancy CLI output (colors, spinners, formatting) is low-value until prompts produce quality conversation. Focus on validation, not presentation.

**Action:** Initial CLI should be minimal (`console.log` of agent messages). Add polish only after prompt quality gate passes.

**Time Saved:** 2-3 hours reallocated to prompt iteration.

### 5. Design Database Schema for Iteration 2 Extension
**Rationale:** Iteration 2 adds Night phase (private Mafia messages), Voting phase (different from Discussion messages), and game state machine. Schema should accommodate these without breaking changes.

**Action:** Add tables now that aren't used in Iteration 1:
- `night_messages` table (for private Mafia coordination)
- `phase_transitions` table (for game state logging)

**Benefit:** Iteration 2 builder doesn't waste time on schema migrations, focuses on phase logic.

### 6. Validate SQLite Performance with 200+ Message Load Test
**Rationale:** Long games can generate 200-300 messages (10 agents * 5 rounds * 4-6 messages each). SQLite should handle this, but must verify.

**Action:** Builder creates seed script to generate 300 messages, runs context query, measures time. If >2 seconds, optimize indexes or switch to PostgreSQL.

**Timing:** After database schema implemented, before orchestrator complexity added.

### 7. Implement Turn Timeout as Hard Requirement (Not Nice-to-Have)
**Rationale:** Without timeouts, single slow API response (10s+) breaks entire Discussion flow. Spectators lose patience, test iterations slow down.

**Action:** 10-second timeout per turn is NON-NEGOTIABLE. Fallback response must be implemented from Day 1.

**Fallback Strategy:** Simple generic statements ("Agent-X carefully considers the accusations..." or "Agent-X remains silent, observing others' reactions.") Better than hanging forever.

### 8. Use EventEmitter for SSE (Not Database Polling)
**Rationale:** Polling database every 500ms adds unnecessary load and latency. EventEmitter provides instant broadcast with zero database queries.

**Action:** Implement in-memory EventEmitter pattern for Iteration 1. Document that Iteration 2 multi-game needs Redis pub/sub.

**Performance Impact:** Reduces SSE latency from 500ms (polling) to <50ms (event-driven).

### 9. Create Separate `test-discussion` Command for Rapid Iteration
**Rationale:** Running full game (lobby → start → Discussion) adds friction to prompt testing. Direct Discussion command enables 5-10 tests per hour.

**Action:** Implement `npm run test-discussion` that:
1. Creates game in database
2. Seeds 10 agents with random personalities
3. Runs Discussion phase
4. Logs transcript to file
5. Reports cost and duration

**Time Saved:** 30-60 seconds per test iteration (vs manual UI testing).

### 10. Document Expected Cost Per Test in Builder Guide
**Rationale:** Builders need to know if they're on track financially. Without cost visibility, they may accidentally run $50 in tests.

**Action:** Builder guide should state:
- Expected cost per Discussion test: $1.50-$2.00 (with caching)
- Expected cost per Discussion test: $6-$8 (without caching)
- Total Iteration 1 testing budget: $30-$50 (assuming 20-30 test runs)

**Safety Net:** If builder reports costs >$10 per test, STOP and debug caching immediately.

## Resource Map

### Critical Files/Directories

#### Project Root
```
/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/
├── .anthropic-key.txt              # API key (confirmed exists, in .gitignore)
├── .env                            # Environment variables (DATABASE_URL, etc.)
├── .gitignore                      # Already exists, ensure includes: .env, *.db, node_modules
├── package.json                    # Dependencies list (see Dependencies section)
├── tsconfig.json                   # TypeScript config (strict mode)
├── next.config.js                  # Next.js config (minimal for Iteration 1)
├── tailwind.config.ts              # Tailwind CSS config
├── postcss.config.js               # PostCSS config (for Tailwind)
├── prisma/
│   ├── schema.prisma               # Database schema (see Pattern 2)
│   └── migrations/                 # Prisma migrations (auto-generated)
├── src/
│   ├── lib/                        # Core business logic
│   │   ├── agent/                  # Agent management
│   │   ├── claude/                 # Claude API integration
│   │   ├── discussion/             # Discussion orchestrator
│   │   └── db/                     # Database utilities
│   ├── cli/                        # CLI test harness
│   │   └── test-discussion.ts     # Main CLI script
│   └── utils/                      # Shared utilities
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Lobby (placeholder for Iteration 1)
│   ├── test-discussion/            # Discussion viewer
│   │   └── page.tsx
│   └── api/                        # API routes
│       ├── discussion/
│       │   └── test/
│       │       └── route.ts
│       └── game/
│           └── [gameId]/
│               └── stream/
│                   └── route.ts    # SSE endpoint
└── public/                         # Static assets
```

#### Key Environment Variables (.env)
```env
# Database
DATABASE_URL="file:./dev.db?connection_limit=1&pool_timeout=10"

# Anthropic API (loaded from .anthropic-key.txt)
ANTHROPIC_API_KEY="sk-ant-..."

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Discussion Configuration
DISCUSSION_DURATION_SECONDS=180      # 3 minutes
AGENT_TURN_TIMEOUT_SECONDS=10        # 10 second hard limit
AGENT_TURNS_PER_ROUND=5              # Each agent speaks 5 times
```

#### Prisma Configuration (prisma/schema.prisma)
See Pattern 2 for full schema. Key configuration:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "fullTextIndex"]  # Optional for search
}
```

#### TypeScript Configuration (tsconfig.json)
```json
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
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Key Dependencies

#### package.json (Production Dependencies)
```json
{
  "name": "ai-mafia",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "test-discussion": "tsx src/cli/test-discussion.ts"
  },
  "dependencies": {
    "next": "14.2.18",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@anthropic-ai/sdk": "^0.65.0",
    "@prisma/client": "^6.17.1",
    "zod": "^3.23.8",
    "date-fns": "^3.6.0",
    "nanoid": "^5.0.7"
  },
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
    "ora": "^8.1.1"
  }
}
```

**Installation Command:**
```bash
npm install next@14.2.18 react@^18.3.1 react-dom@^18.3.1 @anthropic-ai/sdk@^0.65.0 @prisma/client@^6.17.1 zod@^3.23.8 date-fns@^3.6.0 nanoid@^5.0.7

npm install -D typescript@^5.6.3 @types/node@^22.10.5 @types/react@^18.3.17 @types/react-dom@^18.3.5 prisma@^6.17.1 tsx@^4.19.2 tailwindcss@^3.4.17 postcss@^8.4.49 autoprefixer@^10.4.20 eslint@^8.57.1 eslint-config-next@14.2.18 prettier@^3.4.2 chalk@^5.3.0 ora@^8.1.1
```

### Testing Infrastructure

#### CLI Test Harness (src/cli/test-discussion.ts)
**Purpose:** Run isolated Discussion phase tests for prompt validation

**Features:**
- Manual game setup (10 agents: 3 Mafia, 7 Villagers)
- Random personality assignment
- Run 5-minute Discussion (40-50 agent responses)
- Log full transcript to file (`/logs/discussion-test-{timestamp}.txt`)
- Display real-time conversation in terminal
- Cost tracking (total tokens, API cost)

**Usage:**
```bash
npm run test-discussion
```

**Expected Output:**
```
Discussion Test Starting...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Setup:
  Game ID: game-abc123
  Players: 10 (3 Mafia, 7 Villagers)
  Duration: 180 seconds
  Turns per agent: 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Turn 1/50 - Agent-Alpha (VILLAGER):
"I think we need to carefully observe voting patterns from previous rounds..."

Turn 2/50 - Agent-Bravo (MAFIA):
"I agree with Agent-Alpha. Let's focus on facts, not speculation..."

[... 48 more turns ...]

Discussion Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Statistics:
  Duration: 182.4 seconds
  Total turns: 50
  API calls: 50
  Total tokens: 38,450 (input: 32,200, output: 6,250)
  Cost: $1.87 (73% cache hit rate)
  Transcript: /logs/discussion-test-1697234567.txt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Unit Testing (Optional for Iteration 1)
**Recommendation:** Defer unit tests to Iteration 2. Focus on manual testing via CLI harness and QA gates.

**Rationale:** Prompt engineering requires rapid iteration. Writing Jest tests for AI responses slows down experimentation.

**Iteration 2 Testing:** Once orchestrator is stable, add unit tests for:
- Turn scheduler logic
- Context builder formatting
- Database query performance
- SSE stream reliability

#### Load Testing (Required Before Iteration 2)
**Purpose:** Validate database performance and API rate limits

**Test Scenarios:**
1. **200+ message context query** - Simulate long game, measure query time
2. **10 concurrent spectators** - Connect 10 SSE clients, verify all receive messages
3. **50 agent turns in 5 minutes** - Verify no API rate limit errors
4. **Cost validation** - Run 10 tests, average cost should be $1.50-$2.00 per test

**Tooling:** Manual scripting (Node.js), no need for k6/Artillery in Iteration 1

## Questions for Planner

### 1. Should builder implement Night phase database schema in Iteration 1?
**Context:** Iteration 2 adds Night phase (private Mafia messages). Schema could be added now (unused) or later (requires migration).

**Trade-off:**
- **Add now:** Iteration 2 builder has complete schema, no migration disruption
- **Add later:** Cleaner Iteration 1 scope, but Iteration 2 needs schema migration

**Recommendation:** Add `night_messages` table now (empty), document it's for Iteration 2. Cost: 15 minutes, benefit: smoother Iteration 2 handoff.

### 2. What's the threshold for builder split decision on Discussion orchestrator?
**Context:** Orchestrator is 8-10 hour task. If builder struggles, split into turn scheduler + SSE integration is possible.

**Decision Point:** Should planner monitor at 6-hour mark and split if <50% complete, or wait until builder explicitly requests help?

**Recommendation:** Proactive monitoring at 6 hours. Builders may not request split even when needed (ego/uncertainty). Planner should observe progress and suggest split.

### 3. Should Iteration 1 use tRPC or plain Next.js API routes?
**Context:** Vision mentions tRPC for type-safe APIs, but Iteration 1 has minimal API surface (1-2 endpoints).

**Trade-off:**
- **tRPC:** Type safety, better DX, but adds dependency + learning curve
- **Plain API routes:** Simpler, faster to implement, but manual type maintenance

**Recommendation:** Plain API routes for Iteration 1 (faster), add tRPC in Iteration 2 when API surface expands (10+ endpoints). Time saved: 2-3 hours.

### 4. Should prompt caching be validated via automated test or manual review?
**Context:** Prompt caching success requires >50% cache hit rate. Can be validated by:
- **Automated test:** Script checks response headers for cache_creation_input_tokens
- **Manual review:** Builder inspects logs and calculates hit rate

**Recommendation:** Both. Automated test catches obvious failures (0% hit rate), manual review validates hit rate is optimal (>70%).

### 5. What's the fallback if Discussion transcripts are boring after 10 test runs?
**Context:** Prompt quality is highest risk. If after 10 tests (6-8 hours of iteration), transcripts are still robotic/boring, what's next?

**Options:**
- **Extend Iteration 1:** Add 5-10 more hours for prompt research and experimentation
- **Escalate to expert:** Bring in prompt engineering specialist
- **Pivot to simpler prompts:** Accept "good enough" conversation, focus on game completion

**Recommendation:** Plan for 15-hour prompt engineering budget (not just 6-8). If still boring after 15 hours, escalate to expert or pivot.

### 6. Should CLI test harness output transcript in JSON or plain text?
**Context:** Transcript file can be:
- **JSON:** Structured data, easy to parse for analytics, but harder to read manually
- **Plain text:** Easy to skim/review for prompt iteration, but not machine-parseable

**Recommendation:** Both. JSON for programmatic analysis, plain text for human review. Export both formats: `discussion-{id}.json` and `discussion-{id}.txt`.

### 7. Should Iteration 1 implement personality diversity (5+ traits) or use fixed personalities?
**Context:** Vision specifies 5+ personality traits (analytical, aggressive, cautious, etc.) for agent diversity. Iteration 1 could:
- **Implement diversity:** Randomly assign personalities, test variation
- **Fixed personalities:** All agents use same prompt for consistency

**Trade-off:**
- **Diversity:** More realistic, but adds prompt complexity, harder to debug
- **Fixed:** Simpler, easier to iterate on single prompt, but less interesting conversation

**Recommendation:** Implement 3 basic personalities in Iteration 1 (analytical, aggressive, cautious), expand to 8-10 in Iteration 3. Balance between diversity and iteration speed.

### 8. What's the maximum acceptable Discussion phase duration for quality gate?
**Context:** Vision specifies 3-5 minute Discussion. Quality gate requires "fascinating to watch" rating, but doesn't specify duration.

**Question:** If Discussion takes 7-8 minutes due to API latency, is that acceptable if conversation quality is high? Or is 5-minute hard limit?

**Recommendation:** 5-minute soft limit, 7-minute hard limit. If consistently exceeds 5 minutes, optimize (reduce turns per agent from 5 to 4, or lower max_tokens from 200 to 150).

### 9. Should SSE fallback to polling be automatic or user-triggered?
**Context:** Vision specifies 2-second polling fallback if SSE fails. Should this be:
- **Automatic:** After 3 SSE failures, auto-switch to polling
- **User-triggered:** Show "Connection issues. Switch to polling?" prompt

**Recommendation:** Automatic. Spectators shouldn't need to understand SSE vs polling. Silently fallback, show "Reconnecting..." banner briefly, then continue.

### 10. Should builder use Prisma migrations or db push for Iteration 1?
**Context:** Prisma offers two workflows:
- **Migrations:** Track schema changes, git-committable, production-ready
- **DB push:** Fast prototyping, no migration files, simpler but non-trackable

**Recommendation:** Migrations from Day 1. Even in Iteration 1, schema changes should be tracked. Cost: 5 minutes extra per schema change, benefit: clean handoff to Iteration 2.

## Limitations

### MCP Tool Availability
**Status:** MCP tools (Playwright, Chrome DevTools, Supabase) were NOT used in this exploration.

**Rationale:**
- **Greenfield project:** No existing code to profile or test
- **Database validation:** Schema design doesn't require live database validation yet
- **Performance profiling:** No application to profile until builder implements

**Recommendation for Future Iterations:**
- **Iteration 2:** Use Playwright MCP to test full game flow end-to-end
- **Iteration 3:** Use Chrome DevTools MCP to profile Discussion phase performance, identify bottlenecks

### Research Limitations
**Claude Agent SDK:** Confirmed from master plan that no official "Agent SDK" exists. We're building custom orchestration using @anthropic-ai/sdk.

**Mafia Strategy Research:** This exploration focused on technical architecture. Builder should research optimal Mafia game strategies (common accusations, defense tactics, voting patterns) to inform prompt engineering.

---

**Report completed: 2025-10-12**
**Explorer ID:** explorer-1
**Focus Area:** Project Setup & Database Schema
**Status:** COMPLETE - Ready for Planner synthesis
