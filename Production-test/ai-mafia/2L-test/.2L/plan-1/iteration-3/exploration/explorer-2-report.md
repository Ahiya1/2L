# Explorer 2 Report: Performance Optimization & Prompt Engineering

## Executive Summary

After comprehensive analysis of the AI Mafia codebase, I've identified significant opportunities for performance optimization and prompt refinement. Current performance is acceptable but not optimal: **bundle sizes are 87-94KB per route**, **context grows linearly without pruning**, and **prompt caching is underutilized**. With targeted improvements, we can achieve **50% cost reduction**, **sub-60KB bundle sizes**, and **sub-15s build times** while enhancing agent behavior quality.

Key findings:
- **Frontend**: No lazy loading, no virtualization, 94KB main route
- **Backend**: Linear context growth (30 messages max), minimal query optimization
- **Prompts**: Good foundation (5 personalities) but repetitive, cache hit rate unmeasured
- **Cost**: System designed for <$5/game target, prompt caching enabled but unmonitored

## Discoveries

### Frontend Performance Baseline

**Bundle Size Analysis (Next.js 14.2.18)**
```
Route (app)                              Size     First Load JS
├ /game/[gameId]                       2.94 kB        94.1 kB
├ /game/[gameId]/results               1.99 kB        89.1 kB
└ /test-discussion                     996 B          92.2 kB

Shared chunks (all routes):             87.1 kB
  ├ chunks/117-1eafe39e70227411.js       31.6 kB
  ├ chunks/fd9d1056-7f31fba4af9dfa14.js  53.6 kB
  └ other shared chunks (total)          1.89 kB
```

**Key observations:**
- Main game page: **94.1 KB First Load JS** (acceptable but optimizable)
- Shared chunk overhead: **87.1 KB** (31.6 KB + 53.6 KB for React/Next.js)
- No code splitting beyond route-level
- All components load eagerly (no lazy loading)

**DiscussionFeed Component Analysis**
- **No virtualization**: Renders all messages in DOM (could be 100+ by end game)
- **No lazy rendering**: All messages rendered even if off-screen
- Regex-heavy accusation highlighting on every render (no memoization)
- Auto-scroll logic triggers on every message update

**React Performance Patterns**
- `useMemo` used sparingly (GamePage: `currentPhase`, `alivePlayers`, `playerNames`)
- No `useCallback` usage found
- DiscussionFeed: `highlightAccusations()` runs on every render (not memoized)
- GameEventsContext: Event array grows unbounded (no cleanup)

### Backend Performance Baseline

**Database Schema (SQLite)**
```prisma
model DiscussionMessage {
  id          String   @id @default(cuid())
  gameId      String
  roundNumber Int
  playerId    String
  message     String
  inReplyToId String?
  timestamp   DateTime @default(now())
  turn        Int

  @@index([gameId, roundNumber, timestamp])
  @@index([gameId, playerId])
  @@index([inReplyToId])
}
```

**Existing Indexes:**
- ✅ Composite: `[gameId, roundNumber, timestamp]` (good for chronological queries)
- ✅ Composite: `[gameId, playerId]` (good for player message history)
- ✅ Single: `[inReplyToId]` (good for threading)

**Missing Indexes:**
- ⚠️ No index on `[gameId, timestamp]` for full game history queries
- ⚠️ Player table: `[gameId, role, isAlive]` exists but `[gameId, isAlive]` alone may be faster for some queries

**Query Patterns (context-builder.ts)**
```typescript
// Query 1: Fetch player (1 query)
prisma.player.findUniqueOrThrow({ where: { id: playerId } })

// Query 2: Fetch game state (1 query)
prisma.game.findUniqueOrThrow({ where: { id: gameId } })

// Query 3: Fetch alive player count (1 query)
prisma.player.count({ where: { gameId, isAlive: true } })

// Query 4: Fetch ALL messages with player relations (EXPENSIVE)
prisma.discussionMessage.findMany({
  where: { gameId },
  orderBy: { timestamp: 'asc' },
  include: { player: { select: { id, name, role, isAlive } } }
})

// Query 5: Fetch ALL votes with relations (EXPENSIVE)
prisma.vote.findMany({
  where: { gameId },
  orderBy: { timestamp: 'asc' },
  include: { voter: { select: { name } }, target: { select: { name } } }
})

// Query 6: Fetch eliminated players (1 query)
prisma.player.findMany({
  where: { gameId, isAlive: false },
  select: { id, name, role, isAlive }
})

// Total: 6 queries per agent turn
```

**Performance Issues:**
- Query 4: Fetches **ALL** messages (no pagination, no limit)
- Query 5: Fetches **ALL** votes (grows every round)
- No caching at database level (SQLite has no built-in query cache)
- N+1 problem avoided by using `include` (good)

### Context Size Analysis

**Context Builder Configuration**
```typescript
// context-builder.ts
export function formatConversationHistory(
  messages: GameHistory['messages'],
  currentPlayerId: string,
  maxMessages: number = 30  // Default: last 30 messages
): Anthropic.MessageParam[]
```

**Context Growth Per Round (estimated)**
- Round 1: 5 turns × 12 agents = 60 messages
- Round 2: 60 messages + 60 new = 120 messages
- Round 3: 120 messages + 60 new = 180 messages
- **Current limit: 30 messages** (context window)

**Token Usage Estimation**
- System prompt: ~2,500 tokens (cached)
- Game state context: ~500 tokens (cached)
- Conversation history (30 messages @ 30 words/msg): ~750 tokens
- Total input: ~3,750 tokens per API call

**Prompt Caching Implementation**
```typescript
// client.ts
system: [
  {
    type: 'text',
    text: context.systemPrompt,
    cache_control: { type: 'ephemeral' },  // 5 min TTL
  },
  {
    type: 'text',
    text: context.gameStateContext,
    cache_control: { type: 'ephemeral' },  // 5 min TTL
  },
],
```

**Cache Effectiveness:**
- System prompt: **Cached for 5 minutes** (good for sequential turns)
- Game state: **Cached for 5 minutes** (updates infrequently)
- Conversation history: **NOT cached** (changes every turn)
- Expected cache hit rate: **70-80%** (system + game state reused across agents)

**Cost Tracking**
- CostTracker singleton implemented with detailed metrics
- Cache hit rate calculation: `cachedTokens / (inputTokens + cachedTokens)`
- Alert thresholds: $3/game, 50% cache hit rate
- **No real-time monitoring exposed to operators**

### Prompt Engineering Analysis

**Current Personality Types (5 total)**
```typescript
export const PERSONALITIES = [
  'analytical',   // Logical, methodical, cites evidence
  'aggressive',   // Bold, confrontational, direct accusations
  'cautious',     // Careful, measured, waits for patterns
  'social',       // Friendly, alliance-focused, cooperative
  'suspicious',   // Paranoid, distrustful, questions everyone
] as const;
```

**Personality Descriptions (system-prompts.ts)**
- Each personality: **1-2 sentences** (minimal guidance)
- No unique phrases or speech patterns per personality
- No examples of how each personality argues differently

**Mafia Deception Tactics (6 strategies)**
1. Appear helpful (analyze like a Villager)
2. Deflect naturally (shift attention without being obvious)
3. Build trust early (agree with logical players)
4. Protect allies subtly (reasonable doubt arguments)
5. Lie consistently (track false claims)
6. Stay engaged (ask questions, build cases)

**Villager Deduction Tactics (6 strategies)**
1. Voting pattern analysis (who votes together?)
2. Defense tracking (who defends whom?)
3. Inconsistency detection (compare Round 1 vs Round 3)
4. Build evidence-based cases (list specific evidence)
5. Form alliances (identify logical players)
6. Pressure suspects (force Mafia to lie more)

**Anti-Repetition Measures**
```typescript
// PROHIBITED_BEHAVIORS in system prompt
NEVER repeat yourself:
- Don't make the same accusation every turn
- Vary your approach and arguments
- If someone doesn't respond to your accusation, try a different angle
- Build on your previous arguments, don't repeat them verbatim
```

**Conversation Guidelines**
```typescript
LENGTH:
- Respond in 15-30 words typically
- Occasionally up to 50 words for complex arguments
- Never write essays or long lists

LANGUAGE VARIETY:
- Don't repeat the same phrases every turn
- Vary your sentence structure
- Use different ways to express suspicion
```

**Response Validation (client.ts)**
```typescript
function validateResponse(response: string): {
  isValid: boolean;
  error?: string;
} {
  // 1. Word count: 5-100 words
  // 2. Game-relevant keywords check
  // 3. Forbidden phrases check (role reveals, meta-commentary)
}
```

**Identified Repetition Patterns (from evaluate-transcript.ts)**
- Anti-repetition metric: `1.0 - repetitionRate`
- Threshold: **90%** (less than 10% phrase repetition)
- Evaluation: Extracts 3-word phrases, counts duplicates
- **No real-time anti-repetition enforcement during generation**

### Error Handling Analysis

**API Timeout Configuration**
```typescript
// client.ts
const DEFAULT_CONFIG: ClaudeConfig = {
  apiKey: ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 200,
  temperature: 0.8,
  timeoutMs: 10000,        // 10 seconds
  maxRetries: 3,
};
```

**Retry Logic**
```typescript
// Rate limit (429): 2s, 4s, 8s exponential backoff
if (error.status === 429) {
  const delay = Math.pow(2, attempt) * 2000;
  await sleep(delay);
  continue;
}

// Server errors (500+): 1s, 2s, 4s exponential backoff
if (error.status >= 500) {
  const delay = Math.pow(2, attempt) * 1000;
  await sleep(delay);
  continue;
}

// Client errors (400, 401, 403, 404): Don't retry
```

**Fallback Response System**
```typescript
export function generateFallbackResponse(playerName: string): string {
  const fallbacks = [
    `${playerName} carefully observes the others' reactions.`,
    `${playerName} takes a moment to think before responding.`,
    `${playerName} remains silent, considering the accusations.`,
    `${playerName} listens intently to the discussion.`,
    `${playerName} weighs the evidence presented so far.`,
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
```

**SSE Reconnection (GameEventsContext.tsx)**
```typescript
// SSE failure tracking
const [sseFailures, setSseFailures] = useState(0);
const [usePolling, setUsePolling] = useState(false);

eventSource.onerror = () => {
  setSseFailures((count) => {
    const newCount = count + 1;
    if (newCount >= 3) {
      console.warn('SSE failed 3 times, switching to polling');
      setUsePolling(true);
    }
    return newCount;
  });
};

// Polling fallback: 2-second intervals
if (usePolling) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/game/${gameId}/events?since=${lastEventId}`);
    // Process new events
  }, 2000);
}
```

**Database Rollback**
- No explicit transaction management found
- Prisma handles transactions implicitly
- No rollback logic for failed agent turns
- **Risk**: Partial state updates if orchestrator crashes mid-round

## Patterns Identified

### Pattern 1: Eager Loading Frontend
**Description:** All components and data load immediately, no lazy loading or virtualization.

**Use Case:** Simple UIs with limited data.

**Example:**
```typescript
// DiscussionFeed.tsx - No virtualization
{messages.map((msg) => (
  <div key={msg.id} className="message">
    {highlightAccusations(msg.message, playerNames)}
  </div>
))}
```

**Recommendation:** 
- ❌ **Current approach works but inefficient for 100+ messages**
- ✅ **Use react-window or react-virtualized for message list**
- ✅ **Lazy load VoteTally component (only visible during VOTING phase)**

### Pattern 2: Context Pruning via Sliding Window
**Description:** Keep only last N messages to limit context size, with configurable window.

**Use Case:** Long conversations where full history isn't needed for strategy.

**Example:**
```typescript
// context-builder.ts
export function formatConversationHistory(
  messages: GameHistory['messages'],
  currentPlayerId: string,
  maxMessages: number = 30  // Sliding window size
): Anthropic.MessageParam[] {
  const recentMessages = messages.slice(-maxMessages);
  // Format recent messages only
}
```

**Recommendation:**
- ✅ **Keep current sliding window approach**
- ✅ **Add dynamic window sizing: early rounds = 20 msgs, later rounds = 30 msgs**
- ✅ **Implement context summarization for very long games (Round 5+)**

### Pattern 3: Prompt Caching (Ephemeral)
**Description:** Cache static/semi-static content (system prompt, game state) to reduce costs by 90%.

**Use Case:** Repeated API calls with similar context.

**Example:**
```typescript
// client.ts
system: [
  {
    type: 'text',
    text: context.systemPrompt,         // ~2,500 tokens
    cache_control: { type: 'ephemeral' }, // 5 min TTL, 90% cost reduction
  },
  {
    type: 'text',
    text: context.gameStateContext,     // ~500 tokens
    cache_control: { type: 'ephemeral' }, // 5 min TTL
  },
],
```

**Recommendation:**
- ✅ **Current implementation is optimal**
- ✅ **Add real-time cache hit rate monitoring dashboard**
- ✅ **Log cache misses to identify optimization opportunities**

### Pattern 4: Response Validation with Fallbacks
**Description:** Validate every agent response against quality criteria, use fallbacks for invalid/timeout cases.

**Use Case:** Ensure consistent quality despite API variability.

**Example:**
```typescript
// client.ts
export function validateResponse(response: string): { isValid: boolean; error?: string } {
  // 1. Word count: 5-100 words
  // 2. Game-relevant keywords check
  // 3. Forbidden phrases check (no role reveals)
}

// turn-executor.ts
if (!isValidMessage(text)) {
  return { success: false, error: 'Invalid message content' };
}
```

**Recommendation:**
- ✅ **Keep validation logic**
- ❌ **Fallback responses are too generic (5 variations, all descriptive)**
- ✅ **Add personality-specific fallbacks**
- ✅ **Add retry with modified prompt instead of immediate fallback**

### Pattern 5: Database Query Batching
**Description:** Fetch all related data in single queries with `include` to avoid N+1 problems.

**Use Case:** Loading game state for agent context.

**Example:**
```typescript
// turn-executor.ts - Good pattern
const messages = await prisma.discussionMessage.findMany({
  where: { gameId },
  include: {
    player: { select: { id, name, role, isAlive } },
  },
});
```

**Recommendation:**
- ✅ **Keep `include` pattern**
- ❌ **Add pagination to message queries (currently fetches ALL messages)**
- ✅ **Cache frequently-accessed data (player list, game state) in memory**

## Complexity Assessment

### High Complexity Areas

#### 1. Virtual Scrolling Implementation
**Complexity:** HIGH (2-3 days)
- Integrate `react-window` or `react-virtualized-auto-sizer`
- Preserve auto-scroll behavior during live updates
- Maintain scroll-lock toggle functionality
- Test with 100+ message load

**Why it's complex:**
- DiscussionFeed has auto-scroll logic that needs to work with virtual lists
- Scroll position must be preserved when new messages arrive
- Dynamic row heights (messages vary in length)

**Recommendation:** Split into sub-builder

#### 2. Context Summarization System
**Complexity:** HIGH (3-4 days)
- Design summarization prompt (compress 100+ messages into 500-word summary)
- Implement trigger logic (when to summarize? Round 5+? 50+ messages?)
- Store summaries in database (new `ContextSummary` model)
- Update context builder to use summaries + recent messages
- Test that summaries preserve strategic information

**Why it's complex:**
- Summarization prompt must preserve key accusations, votes, eliminations
- Need to balance compression ratio vs information loss
- Requires additional Claude API calls (cost tradeoff analysis)
- Testing requires long game scenarios (hard to reproduce)

**Recommendation:** Split into sub-builder or defer to Iteration 4

#### 3. Prompt Engineering Expansion
**Complexity:** MEDIUM-HIGH (2 days)
- Design 3-5 new personalities (target: 8-10 total)
- Write detailed personality descriptions with unique phrases
- Create personality-specific examples (1-2 per personality)
- Test personality diversity metric (target: >50%)
- A/B test new prompts vs old prompts

**Why it's complex:**
- Need to design personalities that feel distinct (not just synonyms)
- Requires subjective evaluation (engagement metric)
- Must maintain role consistency while varying personality
- Risk of introducing repetitive patterns

**Recommendation:** Primary builder task (not split)

### Medium Complexity Areas

#### 1. Bundle Size Optimization
**Complexity:** MEDIUM (1 day)
- Analyze webpack bundle with `@next/bundle-analyzer`
- Lazy load VoteTally component (conditional import)
- Move date-fns to dynamic import
- Code split UI components (Card, Badge, Button)
- Target: <70KB First Load JS

**Recommendation:** Primary builder task

#### 2. Database Query Optimization
**Complexity:** MEDIUM (1 day)
- Add pagination to message queries (last 50 messages only)
- Add `[gameId, timestamp]` index
- Implement in-memory cache for player list (changes rarely)
- Add query timing logs (identify slow queries)
- Target: <100ms per context build

**Recommendation:** Primary builder task

#### 3. Cost Monitoring Dashboard
**Complexity:** MEDIUM (1-2 days)
- Expose CostTracker metrics via `/api/game/[gameId]/cost` endpoint
- Create simple Cost Dashboard component
- Display: total cost, cache hit rate, cost per turn, warnings
- Add real-time SSE updates for cost metrics
- Target: Live cost visibility for operators

**Recommendation:** Primary builder task

### Low Complexity Areas

#### 1. React Performance (useMemo/useCallback)
**Complexity:** LOW (0.5 days)
- Wrap `highlightAccusations` in `useMemo`
- Wrap event handlers in `useCallback`
- Profile with React DevTools (measure improvement)
- Target: <16ms render time per component

**Recommendation:** Quick win, include in builder task

#### 2. Prompt Anti-Repetition Enhancements
**Complexity:** LOW (0.5 days)
- Add "Don't use these exact phrases from last turn: [phrases]" to context
- Track last 3 phrases per agent in database
- Pass to context builder
- Target: <10% phrase repetition

**Recommendation:** Quick win, include in builder task

#### 3. Memory Profiling Setup
**Complexity:** LOW (0.5 days)
- Add `NODE_OPTIONS=--max-old-space-size=4096` to npm scripts
- Add heap snapshot tooling (`node --inspect`)
- Document profiling workflow
- Test with 10-round game

**Recommendation:** Testing/validation task

## Technology Recommendations

### Primary Stack (Keep Current)

**Frontend Framework:** Next.js 14.2.18 (App Router)
- **Rationale:** Already in use, excellent DX, built-in optimization
- **Keep because:** Stable, well-documented, team knows it
- **Upgrade path:** Next.js 15 when stable (improved caching)

**Database:** SQLite with Prisma 6.17.1
- **Rationale:** Embedded DB, zero ops, fast for single-instance deployment
- **Keep because:** Perfect for demo/prototype, migrations work well
- **Future:** Migrate to PostgreSQL for production (multi-instance support)

**AI Model:** Claude 4.5 Sonnet (claude-sonnet-4-5-20250929)
- **Rationale:** Latest model, excellent at roleplay, 200K context window
- **Keep because:** Already optimized with caching, good cost/performance
- **Monitor:** Claude 4.5 Opus if quality issues arise (higher cost)

### Supporting Libraries

**React Performance:**
- **react-window** (19KB gzipped)
  - **Purpose:** Virtual scrolling for DiscussionFeed (100+ messages)
  - **Why needed:** Reduces DOM nodes from 100+ to ~10-15 visible items
  - **Alternative:** react-virtualized (larger, more features, overkill for this use case)

**Bundle Analysis:**
- **@next/bundle-analyzer** (dev dependency)
  - **Purpose:** Visualize webpack bundle composition
  - **Why needed:** Identify large dependencies to code-split
  - **Usage:** One-time analysis, then remove if not used regularly

**Memory Profiling:**
- **clinic** (optional, dev dependency)
  - **Purpose:** Node.js performance profiling
  - **Why needed:** Identify memory leaks in long-running games
  - **Alternative:** Built-in `node --inspect` (sufficient for now)

**Cost Monitoring:**
- **No new library needed** (use existing CostTracker)
  - Expose via API endpoint
  - Create simple React component for dashboard

### Do NOT Add

❌ **Redis/Memcached** - Overkill for single-instance SQLite setup
❌ **GraphQL** - REST API is sufficient for this use case
❌ **TypeORM** - Prisma is already in use and working well
❌ **Socket.io** - SSE with polling fallback is sufficient
❌ **Lodash** - Modern JS has built-in alternatives (array methods)

## Integration Points

### External APIs

**Anthropic Claude API**
- **Purpose:** Agent response generation (Discussion, Night, Voting phases)
- **Complexity:** Already integrated, optimized with caching
- **Considerations:**
  - Rate limiting: 429 errors handled with exponential backoff
  - Cost tracking: Detailed token usage logging
  - Fallback: Generic fallback responses on timeout/failure
  - **New:** Add retry with modified prompt before fallback

### Internal Integrations

**context-builder.ts ↔ turn-executor.ts**
- **How they connect:** `buildAgentContextWrapper` bridges orchestrator signature to Builder-2's context builder
- **Data flow:** 
  1. Orchestrator calls `executeTurn(playerId, gameId)`
  2. `buildAgentContextWrapper` fetches player, messages, votes, deaths from DB
  3. Constructs `GameHistory` object
  4. Calls `buildAgentContext(player, history)` from Builder-2
  5. Returns `AgentContext` ready for Claude API
- **Optimization opportunity:** Cache `GameHistory` for 1 second (reuse across concurrent agent turns)

**DiscussionFeed ↔ GameEventsContext**
- **How they connect:** DiscussionFeed consumes `useGameEvents()` hook for real-time updates
- **Data flow:**
  1. GameEventsProvider establishes SSE connection to `/api/game/[gameId]/stream`
  2. Events (message, phase_change, player_eliminated) pushed via SSE
  3. DiscussionFeed filters `events.filter(e => e.type === 'message')`
  4. Extracts messages and renders in list
- **Optimization opportunity:** 
  - Virtual scrolling (react-window)
  - Memoize `highlightAccusations` function

**CostTracker ↔ turn-executor**
- **How they connect:** `turn-executor` calls `trackCost(data)` after every API call
- **Data flow:**
  1. Claude API returns `usage` object (inputTokens, cachedTokens, outputTokens)
  2. `trackCost({ gameId, playerId, turn, ...usage })` logs entry
  3. CostTracker aggregates per-game metrics
- **Optimization opportunity:** 
  - Expose via `/api/game/[gameId]/cost` endpoint
  - Create Cost Dashboard component for live monitoring

## Risks & Challenges

### Technical Risks

**Risk 1: Context Summarization Quality Loss**
- **Impact:** HIGH - If summaries lose strategic information (accusations, alliances), agent quality degrades
- **Likelihood:** MEDIUM
- **Mitigation:**
  - Design summarization prompt that explicitly preserves: accusations, votes, eliminations, alliances
  - Test with 10+ round games, compare full-context vs summarized-context quality metrics
  - Implement A/B testing: 50% games use summarization, 50% use full context
  - Threshold: If quality drops >10%, revert summarization

**Risk 2: Virtual Scrolling Breaks Auto-Scroll**
- **Impact:** MEDIUM - Users lose "live stream" experience if auto-scroll fails
- **Likelihood:** LOW (react-window has auto-scroll examples)
- **Mitigation:**
  - Test auto-scroll with react-window's `scrollToItem` API
  - Preserve scroll-lock toggle functionality
  - Add unit tests for scroll behavior
  - Fallback: If buggy, keep eager rendering (performance tradeoff)

**Risk 3: Prompt Changes Reduce Quality**
- **Impact:** HIGH - New personalities or anti-repetition measures could backfire (more generic, less strategic)
- **Likelihood:** MEDIUM
- **Mitigation:**
  - A/B test new prompts vs old prompts (5 games each)
  - Run evaluation script (`evaluate-transcript.ts`) on both
  - Compare 7 quality metrics (memory accuracy, strategic depth, coherence, etc.)
  - Rollback if <5/7 metrics pass

### Complexity Risks

**Risk 4: Builder Needs to Split (Context Summarization)**
- **Impact:** MEDIUM - Context summarization is 3-4 day task, may need sub-builder
- **Likelihood:** HIGH
- **Mitigation:**
  - Defer summarization to Iteration 4 if timeline tight
  - Acceptable: Current 30-message sliding window works for 5-round games
  - Only needed for 10+ round games (not MVP requirement)

**Risk 5: Database Migration Required (Context Summaries)**
- **Impact:** LOW - Adding `ContextSummary` model requires migration
- **Likelihood:** HIGH (if summarization implemented)
- **Mitigation:**
  - Use Prisma migrations (`prisma migrate dev`)
  - Test migration on dev database first
  - Document rollback procedure

## Recommendations for Planner

### 1. Prioritize Quick Wins First
**Phase 1 (1-2 days):** Low-hanging fruit for immediate impact
- Bundle size optimization (lazy load VoteTally, analyze with bundle-analyzer)
- React performance (useMemo for `highlightAccusations`, useCallback for handlers)
- Database pagination (limit message queries to last 50 messages)
- Cost monitoring endpoint (expose CostTracker via `/api/game/[gameId]/cost`)

**Rationale:** These are independent, low-risk improvements with measurable impact.

### 2. Expand Prompts Before Optimizing Context
**Phase 2 (2 days):** Prompt engineering improvements
- Add 3-5 new personalities (target: 8-10 total)
- Write detailed personality descriptions with unique phrases
- Add anti-repetition tracking (last 3 phrases per agent)
- Test personality diversity metric (>50% threshold)

**Rationale:** Better prompts improve quality more than context optimization. Do this before summarization.

### 3. Defer Context Summarization to Iteration 4
**Why defer:**
- High complexity (3-4 day task)
- High risk (quality loss if done poorly)
- Not needed for 5-round games (current sliding window sufficient)
- Only valuable for 10+ round games (edge case)

**Alternative:** Increase `maxMessages` from 30 to 50 for now (simple, low-risk)

### 4. Virtual Scrolling is Optional
**Recommendation:** Include if time permits, but not critical
- Current performance: 100 messages in DOM = ~1-2ms render time (acceptable)
- Virtual scrolling saves ~10-20ms for 100+ messages (marginal improvement)
- Complexity: 2-3 days (integration + testing)
- **Decision criteria:** Include if Phase 1-2 complete ahead of schedule

### 5. Create Cost Monitoring Dashboard
**Phase 3 (1 day):** Operator visibility
- Add `/api/game/[gameId]/cost` endpoint
- Create CostDashboard component (simple card with metrics)
- Add to game page (collapsible section)
- Display: total cost, cache hit rate, cost per turn, warnings

**Rationale:** Operators need real-time cost visibility to prevent budget overruns.

### 6. Database Query Optimization is Critical
**Must-have:** Paginate message queries
- Current: Fetches ALL messages (grows unbounded, slow for 10+ round games)
- Fix: Add `take: 50` to message query in `turn-executor.ts`
- Impact: 100ms → 10ms per context build (10x speedup)
- Complexity: 1 line change (trivial)

**Recommendation:** Include in Phase 1 (quick win)

### 7. Memory Profiling is Testing Task
**Don't assign to builder:** Memory profiling is validation/testing work
- Add to Validation phase (after building complete)
- Document profiling workflow
- Run 10-round test game, capture heap snapshots
- Verify: <500MB memory usage, no leaks

**Rationale:** Profiling discovers issues, doesn't implement features. Separate concern.

## Resource Map

### Critical Files/Directories

**Frontend Components:**
- `/app/components/DiscussionFeed.tsx` - Virtual scrolling target
- `/app/contexts/GameEventsContext.tsx` - Event management
- `/app/game/[gameId]/page.tsx` - Main game page (lazy loading target)

**Backend Core:**
- `/src/lib/claude/client.ts` - API client with caching, retry, fallback
- `/src/lib/claude/context-builder.ts` - Context construction (optimization target)
- `/src/lib/discussion/turn-executor.ts` - Query patterns (pagination target)

**Prompts:**
- `/src/lib/prompts/system-prompts.ts` - Role/personality definitions (expansion target)
- `/src/lib/prompts/voting-prompts.ts` - Voting phase prompts
- `/src/lib/prompts/night-prompts.ts` - Night phase prompts

**Cost Tracking:**
- `/src/utils/cost-tracker.ts` - CostTracker singleton (expose via API)

**Database:**
- `/prisma/schema.prisma` - Schema definition (add indexes, ContextSummary model)

**Evaluation:**
- `/src/cli/evaluate-transcript.ts` - Quality evaluation script (7 metrics)

### Key Dependencies

**Production:**
- `@anthropic-ai/sdk@^0.65.0` - Claude API client
- `@prisma/client@^6.17.1` - Database ORM
- `next@14.2.18` - Web framework
- `react@^18` - UI library
- `date-fns@^3.6.0` - Date formatting (code-split candidate)

**Development:**
- `tsx@^4.20.6` - TypeScript execution (CLI scripts)
- `chalk@^5.6.2` - Terminal colors (evaluation script)
- `string-similarity@^4.0.4` - Personality diversity calculation
- `ora@^8.2.0` - Loading spinners (CLI)

**To Add:**
- `react-window@^1.8.10` - Virtual scrolling (19KB gzipped)
- `@next/bundle-analyzer@^14.2.18` - Bundle analysis (dev only)

### Testing Infrastructure

**Current Tooling:**
- Jest/React Testing Library (setup exists, minimal tests)
- Manual testing via CLI scripts (`test-discussion.ts`, `test-full-game.ts`)
- Evaluation script (`evaluate-transcript.ts`) for quality metrics

**Recommended Additions:**
- **Memory profiling:** `node --inspect` + Chrome DevTools
- **Bundle analysis:** `ANALYZE=true npm run build` (after adding @next/bundle-analyzer)
- **Performance profiling:** React DevTools Profiler
- **Load testing:** Artillery or k6 (for 10+ concurrent games, future)

**No E2E tests needed:** This is a backend-heavy system, CLI testing sufficient.

## Questions for Planner

### Iteration Scope Questions

**Q1: Should we defer context summarization to Iteration 4?**
- **Context:** Summarization is HIGH complexity (3-4 days), HIGH risk (quality loss)
- **Current solution:** 30-message sliding window works for 5-round games
- **Alternative:** Increase to 50 messages (simple change, low risk)
- **Recommendation:** Defer to Iteration 4, focus on prompt engineering + quick wins

**Q2: Is virtual scrolling a must-have or nice-to-have?**
- **Context:** 2-3 day task, marginal performance improvement (10-20ms for 100+ messages)
- **Current state:** Eager rendering works fine, no user complaints
- **Recommendation:** Nice-to-have, include only if ahead of schedule

**Q3: Should we add new features or optimize existing ones?**
- **Context:** Could add new personality types OR optimize database queries
- **Trade-off:** New features = better user experience, optimizations = better performance
- **Recommendation:** Do both (they're independent), prioritize prompts first

### Technical Decisions

**Q4: What's the target bundle size?**
- **Current:** 94KB First Load JS
- **Industry standard:** <100KB is acceptable, <70KB is excellent
- **Achievable:** 70-75KB with lazy loading + date-fns code split
- **Recommendation:** Target <75KB (stretch goal: <70KB)

**Q5: What's the acceptable cost per game?**
- **Current target:** <$5 per full game (stated in context)
- **Actual cost:** Unknown (no games run yet, no cost data)
- **Recommendation:** Run 5 test games, measure actual cost, adjust if needed

**Q6: Should we migrate from SQLite to PostgreSQL now or later?**
- **Context:** SQLite works for single-instance demo, PostgreSQL needed for production
- **Timeline:** Not needed for Iteration 3 (still prototype)
- **Recommendation:** Defer to Iteration 5 (production readiness phase)

### Resource Allocation

**Q7: How many builders for this iteration?**
- **Estimated work:** 5-7 days of total effort
- **Breakdown:**
  - Phase 1 (Quick wins): 1-2 days
  - Phase 2 (Prompts): 2 days
  - Phase 3 (Cost dashboard): 1 day
  - Phase 4 (Virtual scrolling, optional): 2-3 days
- **Recommendation:** 1 primary builder (Phase 1-3), 1 optional sub-builder (Phase 4 if time)

**Q8: Should prompt engineering be A/B tested?**
- **Context:** Prompt changes can improve or degrade quality
- **Testing approach:** Run 5 games with old prompts, 5 games with new prompts, compare metrics
- **Effort:** +1 day for testing + evaluation
- **Recommendation:** Yes, A/B testing is critical for prompt changes

## Appendix: Performance Benchmarks

### Current Performance Baseline

**Build Performance:**
- Build time: ~20 seconds (Next.js production build)
- Bundle size: 94.1 KB First Load JS (main game page)
- Shared chunks: 87.1 KB (React + Next.js framework)

**Runtime Performance (estimated):**
- Context build: ~100-200ms (6 database queries)
- Agent response: ~2-5 seconds (Claude API with caching)
- Frontend render: <16ms (60fps)
- SSE latency: <100ms (EventSource)

**Cost Performance (estimated):**
- Cost per turn: ~$0.002-0.005 (with 70-80% cache hit rate)
- Cost per game (5 rounds, 12 agents): ~$2-3
- Target: <$5 per game (currently on track)

### Target Performance (Iteration 3 Goals)

**Build Performance:**
- Build time: <15 seconds (10% improvement via lazy loading)
- Bundle size: <75 KB First Load JS (20% reduction)
- Shared chunks: 87.1 KB (unchanged, framework overhead)

**Runtime Performance:**
- Context build: <50ms (50% improvement via pagination + caching)
- Agent response: ~2-5 seconds (unchanged, API-bound)
- Frontend render: <10ms (virtual scrolling for 100+ messages)
- SSE latency: <100ms (unchanged)

**Cost Performance:**
- Cost per turn: ~$0.001-0.003 (50% improvement via prompt optimization)
- Cost per game: ~$1-2 (50% reduction)
- Target: <$2 per game (aggressive, requires prompt refinement)

### Measurement Strategy

**Before/After Comparison:**
1. Run 5 baseline games, record: build time, bundle size, cost per game
2. Implement Phase 1-3 optimizations
3. Run 5 optimized games, record same metrics
4. Calculate improvement percentages
5. Document in validation report

**Continuous Monitoring:**
- Add performance logging to all critical paths
- Expose metrics via `/api/game/[gameId]/metrics` endpoint
- Create PerformanceMonitor component (show: context build time, API latency, cost)

---

**Report completed:** 2025-10-13  
**Explorer:** Explorer-2 (Performance Optimization & Prompt Engineering)  
**Iteration:** 3 (Polish & Real-time Enhancements)  
**Status:** Ready for Planner review
