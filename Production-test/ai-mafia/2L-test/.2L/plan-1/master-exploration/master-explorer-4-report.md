# Master Exploration Report

## Explorer ID
master-explorer-4

## Focus Area
Scalability & Performance Considerations

## Vision Summary
Build an AI Mafia game where 8-12 autonomous Claude AI agents play Mafia with multi-turn strategic conversations, deception, and logical deduction, optimized for real-time spectator experience.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 25+ features (game engine, AI orchestration, multi-turn conversations, real-time UI, state persistence)
- **User stories/acceptance criteria:** 7 critical success criteria including multi-turn discussion, Mafia coordination, villager deduction, natural conversation flow, memory accuracy, complete playthrough, and compelling strategic gameplay
- **Estimated total work:** 40-60 hours across AI orchestration, conversation management, real-time updates, and frontend development

### Complexity Rating
**Overall Complexity: VERY COMPLEX**

**Rationale:**
- 8-12 concurrent AI agents with Claude 4.5 Sonnet requiring sophisticated orchestration
- Multi-turn conversation system with memory, threading, and response chains spanning 3-5 minute discussion phases
- Real-time performance requirements with sub-second latency for spectator experience
- Critical API cost management (estimated $0.50-$2.00 per game with optimization)
- Strategic AI behavior requiring advanced prompt engineering for deception and deduction
- Complex state management across Night (private Mafia coordination) and Discussion (public debate) phases

---

## AI Performance Requirements Analysis

### Claude 4.5 Sonnet Specifications
Based on Anthropic's Claude 4.5 Sonnet (claude-sonnet-4.5-20250929):

**Context Window:**
- **200,000 tokens** input context window
- Sufficient for entire game history (estimated 15,000-30,000 tokens for full 8-round game)
- Allows agents to reference all previous discussions, votes, and events

**Response Characteristics:**
- **Input pricing:** $3.00 per million tokens (MTok)
- **Output pricing:** $15.00 per million tokens (MTok)
- **Cached input pricing:** $0.30/MTok (90% discount for prompt caching)
- **Average response latency:** 2-4 seconds for 150-300 token responses
- **Quality:** Excellent strategic reasoning, natural language, role-play capabilities

### Discussion Phase Performance Requirements

**Target Timeline: 3-5 minutes per Discussion phase**

Assuming 10 players (7 Villagers, 3 Mafia):
- **Speaking turns per agent:** 3-5 turns each
- **Total conversation exchanges:** 30-50 messages
- **Latency budget per response:** 3-6 seconds (including API call + processing)
- **Acceptable max latency:** 8 seconds per response (to maintain flow)

**Performance Math:**
```
Best case: 30 messages × 3 sec/response = 90 seconds (1.5 min)
Target case: 40 messages × 4 sec/response = 160 seconds (2.7 min)
Worst case: 50 messages × 6 sec/response = 300 seconds (5 min)
```

**Critical Performance Requirements:**
1. **Parallel API calls NOT recommended during Discussion** - agents must respond sequentially to maintain conversation coherence
2. **Response timeout:** 10 seconds hard limit per agent turn
3. **Conversation memory:** Full game history (15K-30K tokens) passed in each API call for context
4. **Strategic thinking time:** 2-4 seconds for Claude to reason about deception/deduction

### Night Phase Performance Requirements

**Target Timeline: 30-45 seconds**

Mafia coordination (2-4 Mafia agents):
- **Coordination turns:** 2-3 messages per Mafia member (6-12 total)
- **Victim selection:** Consensus voting mechanism
- **Latency budget:** 3-5 seconds per response
- **Private conversation:** Separate context from public discussion

**Performance Math:**
```
3 Mafia × 3 messages × 4 sec = 36 seconds (within 45-second target)
```

**Optimization: Parallel API calls possible** if consensus algorithm allows simultaneous proposals.

### Conversation Memory Requirements

**Memory Size per Game:**
- **Turn 1 (early game):** ~5,000 tokens input context
- **Turn 4 (mid game):** ~15,000 tokens input context
- **Turn 8 (late game):** ~30,000 tokens input context

**Memory Contents:**
- Complete discussion transcript (all agent statements)
- Vote history (who voted for whom each round)
- Death log (who died when and how)
- Phase transitions (Night → Day → Discussion → Voting timeline)
- Agent-specific memory (accusations received, defenses made, alliances)

**Retrieval Strategy:**
- **Full context passing:** Pass entire game history to each agent (recommended for 200K context window)
- **Selective summarization:** Summarize rounds >5 turns old to reduce tokens (optional optimization)
- **Vector similarity search:** NOT needed for games <10 rounds (full history fits in context)

---

## API Cost Estimation

### Claude 4.5 Sonnet Pricing (as of January 2025)
- **Input tokens:** $3.00 per million tokens (MTok)
- **Output tokens:** $15.00 per million tokens (MTok)
- **Cached input tokens:** $0.30 per MTok (with prompt caching enabled)

### Token Estimation per Game

**Assumptions:**
- 10 players (3 Mafia, 7 Villagers)
- 6 game rounds (Night → Day → Discussion → Voting loop)
- Discussion phase: 40 messages per round
- Night phase: 9 messages per round
- Average agent response: 150 tokens output
- Context growth: 5K tokens/round cumulative

**Discussion Phase API Calls:**
```
Round 1: 40 calls × (5K input + 150 output) = 40 calls
Round 2: 40 calls × (10K input + 150 output)
Round 3: 40 calls × (15K input + 150 output)
Round 4: 40 calls × (20K input + 150 output)
Round 5: 40 calls × (25K input + 150 output)
Round 6: 40 calls × (30K input + 150 output)

Total input tokens: 40×(5K+10K+15K+20K+25K+30K) = 4,200,000 tokens (4.2M)
Total output tokens: 240 calls × 150 tokens = 36,000 tokens (0.036M)
```

**Night Phase API Calls:**
```
6 rounds × 9 calls × (average 12.5K input + 100 output)
Total input tokens: 54 calls × 12,500 = 675,000 tokens (0.675M)
Total output tokens: 54 calls × 100 = 5,400 tokens (0.0054M)
```

**Voting Phase API Calls:**
```
6 rounds × 10 votes × (average 12.5K input + 50 output)
Total input tokens: 60 calls × 12,500 = 750,000 tokens (0.75M)
Total output tokens: 60 calls × 50 = 3,000 tokens (0.003M)
```

**Total Token Usage (WITHOUT prompt caching):**
```
Input: 4.2M + 0.675M + 0.75M = 5.625M tokens
Output: 0.036M + 0.0054M + 0.003M = 0.0444M tokens

Cost calculation:
Input: 5.625M × $3.00/M = $16.88
Output: 0.0444M × $15.00/M = $0.67
TOTAL: $17.55 per game
```

**Total Token Usage (WITH prompt caching optimization):**

Using prompt caching to cache the system prompt + game history:
- First call: Full price for input
- Subsequent calls: 90% discount on cached context

Estimated cache hit rate: 85% of input tokens

```
Cached input: 5.625M × 0.85 = 4.78M tokens at $0.30/M = $1.43
Uncached input: 5.625M × 0.15 = 0.84M tokens at $3.00/M = $2.52
Output: 0.0444M × $15.00/M = $0.67
TOTAL WITH CACHING: $4.62 per game
```

### Cost Optimization Strategies

**1. Prompt Caching (CRITICAL - 73% cost reduction)**
- **Implementation:** Mark game history as cacheable in API calls
- **Expected savings:** $17.55 → $4.62 per game (73% reduction)
- **Strategy:** Use `system` message with cacheable game state
- **Cache TTL:** 5 minutes (sufficient for 15-minute game)

**2. Context Pruning (10-20% additional savings)**
- **Old round summarization:** Rounds >4 turns old get summarized to 30% of original tokens
- **Implementation:** After round 5, summarize rounds 1-2
- **Expected savings:** Reduce input tokens by 15-20%
- **Risk:** Potential loss of strategic memory (test carefully)

**3. Batch Voting (5% savings)**
- **Strategy:** Generate all 10 vote justifications in parallel during Voting phase
- **Implementation:** Single API call with structured output for 10 votes
- **Expected savings:** 60 calls → 6 calls (90% call reduction for Voting phase)
- **Risk:** Less personalized vote justifications

**4. Strategic Response Length Limiting (10% savings)**
- **Implementation:** Prompt agents for concise responses (100-150 tokens max)
- **Expected savings:** Reduce output tokens by 20-30%
- **Risk:** Less natural conversation flow

**Recommended Cost Target:**
- **With prompt caching:** $4.62 per game
- **With caching + pruning:** $3.70 per game
- **Monthly cost (100 games/month):** $370-$462

---

## Real-time Performance Analysis

### Game Phase Timing Constraints

**Phase Timeline Requirements:**

| Phase | Duration | API Calls | Critical Path |
|-------|----------|-----------|---------------|
| NIGHT | 30-45 sec | 6-12 calls | Sequential Mafia coordination |
| DAY_ANNOUNCEMENT | 10 sec | 0 calls | Announce death |
| DISCUSSION | 3-5 min | 30-50 calls | Sequential agent responses |
| VOTING | 45 sec | 10 calls | Parallel vote generation |
| WIN_CHECK | 1 sec | 0 calls | Game state evaluation |

**Total game duration:** 6 rounds × 5.5 min = 33 minutes average

### SSE Throughput for Discussion Feed

**Requirements:**
- Stream each agent message as it's generated (real-time)
- Support 100+ concurrent spectators (Stage 2 consideration)
- Message rate: 0.5-1 message per second during Discussion

**Implementation Strategy:**
```typescript
// SSE endpoint: /api/game/[gameId]/stream
// Message format:
{
  event: "discussion_message",
  data: {
    playerId: string,
    playerName: string,
    message: string,
    timestamp: number,
    inReplyTo?: string  // threading
  }
}
```

**Performance:**
- **Latency:** <100ms from agent response to spectator browser
- **Bandwidth:** ~500 bytes per message × 40 messages = 20KB per Discussion phase
- **Concurrent spectators:** 1-10 for Stage 1 (single game), scales to 100+ with Redis pub/sub in Stage 2

**SSE vs Polling:**
- **SSE (recommended):** Real-time push, efficient for live updates
- **2-second polling fallback:** For browsers without SSE support
- **Hybrid approach:** SSE primary, polling backup (vision requirement met)

### Database Write/Read Performance (SQLite)

**Write Operations per Game:**
- Game creation: 1 write
- Player creation: 8-12 writes
- Discussion messages: 240 writes (40 messages × 6 rounds)
- Votes: 60 writes (10 votes × 6 rounds)
- Deaths: 6 writes
- Phase transitions: 30 writes (5 phases × 6 rounds)

**Total writes:** ~350 writes per game over 33 minutes = 0.18 writes/second

**Read Operations:**
- Game state reads: 300+ reads (every agent API call needs context)
- Discussion feed reads: Real-time streaming queries
- Vote tally reads: 6 reads per game

**SQLite Performance:**
- **Write throughput:** SQLite handles 10,000+ writes/sec (overkill for 0.18/sec)
- **Read throughput:** 100,000+ reads/sec (sufficient for context fetching)
- **Bottleneck:** NOT a concern for single-game concurrency
- **Optimization:** Use `PRAGMA journal_mode=WAL` for concurrent read/write

**Schema Design for Performance:**

```sql
-- Optimized for rapid context retrieval
CREATE TABLE discussion_messages (
  id INTEGER PRIMARY KEY,
  game_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  message TEXT NOT NULL,
  in_reply_to INTEGER NULL,  -- threading
  timestamp INTEGER NOT NULL,

  INDEX idx_game_round (game_id, round_number),
  INDEX idx_thread (in_reply_to)
);

-- Optimized for vote analysis queries
CREATE TABLE votes (
  id INTEGER PRIMARY KEY,
  game_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  voter_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  justification TEXT,
  timestamp INTEGER NOT NULL,

  INDEX idx_game_round (game_id, round_number),
  INDEX idx_voter (voter_id)
);
```

**Query Performance:**
- **Context fetch:** `SELECT * FROM discussion_messages WHERE game_id = ? ORDER BY timestamp` - <10ms
- **Vote history:** `SELECT * FROM votes WHERE game_id = ? AND voter_id = ?` - <5ms
- **Recent messages:** `SELECT * FROM discussion_messages WHERE game_id = ? AND round_number >= ?` - <5ms

### Concurrent Agent Orchestration Patterns

**Sequential Turn-Based (RECOMMENDED for Discussion):**

```typescript
// Pseudo-code for Discussion orchestration
async function runDiscussionPhase(gameId: string, players: Player[]) {
  const aliveAgents = players.filter(p => p.alive);
  const turnOrder = shuffleArray(aliveAgents); // randomize speaking order
  const maxRounds = 5; // each agent speaks 5 times

  for (let round = 1; round <= maxRounds; round++) {
    for (const agent of turnOrder) {
      const context = await buildGameContext(gameId, agent);
      const response = await callClaudeAPI(agent, context);
      await saveMessage(gameId, round, agent.id, response);
      await broadcastSSE(gameId, { agentId: agent.id, message: response });

      // Rate limiting: brief pause between turns
      await sleep(500); // 0.5 second between agents
    }
  }
}
```

**Performance:**
- 10 agents × 5 rounds × 4 sec per call = 200 seconds (3.3 minutes) ✓ Within target
- Sequential ensures agents respond to latest context
- No race conditions or conflicting memories

**Parallel Coordination (for Night Phase):**

```typescript
// Pseudo-code for Night phase optimization
async function runNightPhase(gameId: string, mafiaAgents: Player[]) {
  // Round 1: All Mafia propose targets in parallel
  const proposals = await Promise.all(
    mafiaAgents.map(agent => callClaudeAPI(agent, buildNightContext(gameId, agent)))
  );

  // Round 2: Present proposals, vote sequentially
  for (const agent of mafiaAgents) {
    const vote = await callClaudeAPI(agent, buildVoteContext(proposals));
    await saveNightVote(gameId, agent.id, vote);
  }

  // Select victim by majority
  const victim = selectMajorityTarget(votes);
  return victim;
}
```

**Performance:**
- Round 1 parallel: 3 Mafia × 4 sec (parallel) = 4 seconds
- Round 2 sequential: 3 Mafia × 3 sec = 9 seconds
- Total: 13 seconds ✓ Well within 30-45 second target

### API Rate Limits and Request Queuing

**Claude API Rate Limits (Anthropic):**
- **Tier 1 (default):** 50 requests/minute, 40,000 tokens/minute
- **Tier 2 (after $100 spend):** 1,000 requests/minute, 80,000 tokens/minute
- **Tier 3 (after $1,000 spend):** 2,000 requests/minute, 160,000 tokens/minute

**Rate Limit Analysis for AI Mafia:**

Discussion phase peak load:
- 40 messages over 3-5 minutes = 8-13 requests/minute ✓ Within Tier 1 limits
- Average 20K tokens/minute input ✓ Within 40K token limit

**Request Queue Strategy:**
```typescript
// Simple queue implementation (no library needed)
class APIRequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsThisMinute = 0;
  private tokensThisMinute = 0;

  async enqueue(request: () => Promise<any>, estimatedTokens: number) {
    this.queue.push(request);
    if (!this.processing) {
      await this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;
    while (this.queue.length > 0) {
      // Rate limit check
      if (this.requestsThisMinute >= 45 || this.tokensThisMinute >= 35000) {
        await sleep(60000); // wait 1 minute
        this.requestsThisMinute = 0;
        this.tokensThisMinute = 0;
      }

      const request = this.queue.shift()!;
      await request();
      this.requestsThisMinute++;
    }
    this.processing = false;
  }
}
```

**Recommendation:** Simple sequential processing sufficient for Stage 1 (single game). No complex queue needed.

---

## Resource Considerations

### SQLite Limitations for Conversation Storage

**Current Scale (Stage 1 - Single Game):**
- Database size per game: ~500KB (350 rows × ~1.5KB avg)
- Concurrent read/write: 1 game = negligible load
- Query performance: <10ms for all context fetches

**SQLite Strengths:**
- Zero configuration, file-based, included with Node.js
- Perfect for single-game prototype
- Handles 100+ concurrent reads easily with WAL mode

**SQLite Limitations (Future Stages):**
- **Concurrent games:** 10+ simultaneous games = 1-2 writes/sec (still fine)
- **Long-term storage:** 1,000 games = 500MB database file (manageable)
- **Scalability ceiling:** 100+ concurrent games require PostgreSQL or similar

**Migration Trigger:**
- Stage 2: Multiple concurrent games (5-10 games) ✓ SQLite still sufficient
- Stage 3: 20+ concurrent games + analytics → Migrate to PostgreSQL
- Stage 4: Multi-region deployment → Distributed database (Postgres with replication)

**Recommendation for Stage 1:** SQLite is perfect. No premature optimization needed.

### Agent State Persistence Strategy

**Agent State Components:**
- **Static attributes:** name, role (Mafia/Villager), personality traits
- **Dynamic memory:** conversation history, accusations received, voting patterns observed
- **Ephemeral state:** current phase awareness, active conversation threads

**Persistence Strategy:**

**Option 1: Database-backed state (RECOMMENDED)**
```typescript
interface AgentState {
  id: string;
  gameId: string;
  name: string;
  role: 'Mafia' | 'Villager';
  personality: string; // "suspicious", "logical", "aggressive", etc.
  alive: boolean;

  // Computed from database queries (not stored)
  conversationHistory: Message[]; // fetched on demand
  accusationCount: number; // computed from messages
  votingPattern: VoteRecord[]; // fetched from votes table
}

// State reconstruction per API call
async function buildAgentContext(gameId: string, agentId: string): Promise<string> {
  const agent = await db.player.findUnique({ where: { id: agentId } });
  const messages = await db.message.findMany({ where: { gameId }, orderBy: { timestamp: 'asc' } });
  const votes = await db.vote.findMany({ where: { gameId } });
  const deaths = await db.death.findMany({ where: { gameId } });

  // Build context prompt from database state
  return buildContextPrompt(agent, messages, votes, deaths);
}
```

**Pros:**
- Single source of truth (database)
- No synchronization issues
- Easy to reconstruct state at any point
- Supports game replay/analysis

**Cons:**
- Database query overhead per API call (~10-20ms)

**Option 2: In-memory state with periodic snapshots**
- NOT recommended for Stage 1 (adds complexity without benefits)
- Consider for Stage 3+ with Redis caching layer

### Memory Management for 8-12 Concurrent Agents

**Memory Footprint per Agent (Node.js process):**
- Agent state object: ~2KB
- Conversation history: ~50KB (fetched from DB)
- API response buffer: ~10KB
- Total per active agent: ~62KB

**Concurrent Memory Usage:**
- 12 agents × 62KB = 744KB ✓ Negligible
- Node.js base memory: ~50MB
- Database query cache: ~10MB
- Total application memory: <100MB ✓ Runs on 512MB VPS

**Memory Optimization:**
- NO need for complex memory management
- Garbage collection handles cleanup between API calls
- Database acts as persistent memory layer (no in-memory state needed)

**Monitoring:**
- Log memory usage with `process.memoryUsage()` every minute
- Alert if RSS exceeds 200MB (indicates memory leak)

### Frontend Polling/SSE Efficiency

**SSE Implementation (Real-time):**

```typescript
// Server: /app/api/game/[gameId]/stream/route.ts
export async function GET(req: Request, { params }: { params: { gameId: string } }) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Subscribe to game events
      const unsubscribe = subscribeToGame(params.gameId, (event) => {
        const message = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(message));
      });

      // Keep connection alive
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 15000);

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        unsubscribe();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

**Client: React hook for SSE**

```typescript
function useGameStream(gameId: string) {
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/game/${gameId}/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [...prev, data]);
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Fallback to polling
      startPolling(gameId, setEvents);
    };

    return () => eventSource.close();
  }, [gameId]);

  return events;
}
```

**Polling Fallback (2-second interval):**

```typescript
async function startPolling(gameId: string, callback: (events: GameEvent[]) => void) {
  let lastEventId = 0;

  const poll = async () => {
    const response = await fetch(`/api/game/${gameId}/events?since=${lastEventId}`);
    const newEvents = await response.json();

    if (newEvents.length > 0) {
      callback(newEvents);
      lastEventId = newEvents[newEvents.length - 1].id;
    }
  };

  const intervalId = setInterval(poll, 2000);
  return () => clearInterval(intervalId);
}
```

**Efficiency Comparison:**

| Method | Latency | Bandwidth | Server Load |
|--------|---------|-----------|-------------|
| SSE (real-time) | <100ms | 500 bytes/message | 1 long-lived connection |
| Polling (2-sec) | 0-2 seconds | 500 bytes/message + overhead | 30 requests/minute |

**Recommendation:** SSE primary with polling fallback (exactly as vision specifies).

### When to Scale Beyond SQLite

**Scaling Triggers:**

**Stage 1 (Current): SQLite sufficient**
- Single game at a time
- 1-10 spectators
- <1 write/second
- <100MB database size

**Stage 2: SQLite still works**
- 5-10 concurrent games
- 50-100 spectators (across all games)
- 5-10 writes/second
- Use `PRAGMA journal_mode=WAL` for concurrent read/write
- Consider read replicas (still SQLite)

**Stage 3: Migrate to PostgreSQL**
- 20+ concurrent games
- 500+ spectators
- Analytics queries (game statistics, agent performance metrics)
- Need for horizontal scaling or replication

**Stage 4: Distributed architecture**
- Multi-region deployment
- 1000+ concurrent games
- Real-time leaderboards
- Requires PostgreSQL + Redis for caching + message queue for event distribution

**Migration Path:**
```
Stage 1: SQLite (file-based)
  ↓
Stage 2: SQLite + WAL mode + connection pooling
  ↓
Stage 3: PostgreSQL (single instance) + Redis cache
  ↓
Stage 4: PostgreSQL (replicated) + Redis cluster + RabbitMQ/Kafka
```

**Recommendation for Stage 1:** Stick with SQLite. Prisma ORM abstracts database layer, making future migration to PostgreSQL trivial (change datasource in `schema.prisma`).

---

## Mafia Game Strategy Research

### What Makes Compelling Mafia Gameplay?

**Core Tension:**
- **Information asymmetry:** Mafia knows who's who; Villagers must deduce from behavior
- **Social deduction:** Reading "tells" in speech patterns, voting behavior, defensiveness
- **Psychological manipulation:** Mafia must lie convincingly without appearing suspicious
- **Coalition dynamics:** Alliances form and dissolve based on trust and suspicion

**Key Strategy Elements:**

**1. Mafia Strategies (Deception)**
- **Blend in:** Act like a confused Villager, avoid appearing too knowledgeable
- **Deflection:** When accused, redirect suspicion to another player with logical arguments
- **Bus throwing:** Sacrifice a Mafia teammate to gain Villager trust (advanced)
- **Bandwagoning:** Join accusations against innocent players to appear helpful
- **Fake detective work:** Pretend to analyze voting patterns to seem pro-Village
- **Controlled panic:** Show appropriate confusion when teammates die (act surprised)

**2. Villager Strategies (Deduction)**
- **Voting pattern analysis:** Track who votes for whom, look for coordinated Mafia votes
- **Accusation tracking:** Note who accuses whom (Mafia rarely accuse each other early)
- **Defense analysis:** Overly defensive behavior suggests guilt
- **Consistency checking:** Look for contradictions in players' statements across rounds
- **Coalition testing:** Propose alliances, see who jumps at suspicious partnerships
- **Process of elimination:** Narrow down suspects based on Night kill patterns

**3. Universal Strategic Behaviors**
- **Information gathering:** Ask direct questions to force players to take stances
- **Pressure tactics:** Accuse someone early to see their defensive response
- **Alliance signaling:** Build trust by agreeing with players you believe are Villagers
- **Vote justification:** Always explain votes (silence is suspicious)
- **Meta-gaming awareness:** Reference previous game events to build logical chains

### Common Tells and Behaviors to Encode in Prompts

**Mafia "Tells" (Anti-patterns for Mafia agents to avoid):**
- **Overly agreeable:** Never taking strong stances (looks like avoiding conflict)
- **Defensive without being accused:** Pre-emptive defense signals guilt
- **Too quiet:** Mafia often stay silent to avoid slipping up (pattern agents should vary)
- **Perfectly consistent:** Humans make mistakes; perfect logic can seem inhuman
- **Ignoring teammates' deaths:** Not reacting to Mafia deaths with suspicion (tells)

**Villager "Tells" (Patterns for Villager agents to exhibit):**
- **Aggressive information seeking:** Ask lots of questions, push for discussions
- **Willing to change vote:** Adjust based on new information (flexibility)
- **Openly confused:** Admit uncertainty (innocent players don't have hidden info)
- **Risk-taking accusations:** Make bold claims to force reactions
- **Team-oriented:** Focus on "we need to find Mafia" language (not self-preservation)

### Prompt Engineering Best Practices for Role-Play

**System Prompt Structure (Mafia Agent Example):**

```
You are {AgentName}, a player in a Mafia game. You are secretly a MAFIA member.

CRITICAL RULES:
1. Your goal: Eliminate all Villagers without being caught.
2. You must LIE convincingly - pretend to be a confused Villager.
3. NEVER reveal your role or indicate knowledge of other Mafia members in public discussion.
4. During NIGHT phase, coordinate privately with fellow Mafia to choose a victim.
5. During DISCUSSION phase, deflect suspicion, cast doubt on innocent players, and blend in.

YOUR PERSONALITY: {personality_trait} (e.g., "analytical and calm", "aggressive and confrontational")

STRATEGIC GUIDELINES:
- When accused, respond with logical counterarguments and redirect suspicion elsewhere
- Occasionally make "Villager-like" observations to appear helpful
- Avoid being too quiet (suspicious) or too talkative (draws attention)
- Vote with majority when safe; create chaos when beneficial
- If a fellow Mafia is obviously caught, consider distancing yourself

CURRENT GAME STATE:
{game_history}

Respond naturally as {AgentName}. Keep responses under 150 tokens. Be strategic but sound human.
```

**System Prompt Structure (Villager Agent Example):**

```
You are {AgentName}, a player in a Mafia game. You are a VILLAGER (innocent).

CRITICAL RULES:
1. Your goal: Identify and eliminate all Mafia members through logical deduction.
2. You do NOT know who the Mafia are - you must deduce from behavior and voting patterns.
3. Be honest and collaborative with other players.
4. During DISCUSSION phase, analyze statements, ask questions, and build cases against suspects.

YOUR PERSONALITY: {personality_trait} (e.g., "cautious and detail-oriented", "bold and intuitive")

STRATEGIC GUIDELINES:
- Ask pointed questions to force players to take positions
- Track voting patterns (Mafia often vote together)
- Look for defensive or evasive behavior (signs of guilt)
- Build alliances with players you trust
- Change your mind if presented with compelling evidence (rigidity is suspicious)

CURRENT GAME STATE:
{game_history}

Respond naturally as {AgentName}. Keep responses under 150 tokens. Be logical but show uncertainty when appropriate (you don't have perfect information).
```

**Prompt Engineering Best Practices:**

1. **Personality injection:** Give each agent unique personality traits to create behavioral diversity
   - Examples: "paranoid", "trusting", "analytical", "impulsive", "cautious", "aggressive"

2. **Response length constraints:** Limit to 100-150 tokens to maintain conversational pace and control costs

3. **Explicit role instructions:** Clear goal statements ("You are MAFIA - your goal is to deceive" vs "You are VILLAGER - your goal is to deduce")

4. **Strategic hinting without prescribing:** Suggest strategies ("consider deflecting suspicion") but allow Claude's reasoning to determine execution

5. **Memory integration:** Include full game history in context so agents reference previous events accurately

6. **Emotional cues:** Encourage "human-like" responses ("show confusion", "express frustration when accused")

7. **Anti-pattern warnings:** Explicitly warn Mafia agents against common tells ("Don't be overly agreeable")

### Multi-Turn Conversation Patterns

**Conversation Threading (Response Chains):**

Enable agents to respond to specific statements:

```typescript
interface Message {
  id: string;
  playerId: string;
  message: string;
  inReplyTo?: string;  // ID of message being responded to
  timestamp: number;
}

// Prompt construction with threading
function buildThreadedContext(allMessages: Message[], currentAgentId: string): string {
  // Highlight messages directed at this agent
  const mentioningThisAgent = allMessages.filter(m =>
    m.message.includes(currentAgentId) ||
    (m.inReplyTo && getMessageById(m.inReplyTo).playerId === currentAgentId)
  );

  return `
RECENT DISCUSSION:
${allMessages.map(m => `[${m.playerId}]: ${m.message}`).join('\n')}

MESSAGES DIRECTED AT YOU:
${mentioningThisAgent.map(m => `[${m.playerId}]: ${m.message}`).join('\n')}

You should respond to the most relevant accusation or question directed at you, or make a new strategic statement.
  `;
}
```

**Turn Management Algorithm:**

```typescript
// Balanced turn distribution
function generateTurnOrder(agents: Agent[], round: number): Agent[] {
  // Shuffle agents for first round
  if (round === 1) return shuffleArray(agents);

  // Subsequent rounds: prioritize agents who were accused in previous round
  const accusedAgents = getAccusedAgents(round - 1);
  const otherAgents = agents.filter(a => !accusedAgents.includes(a));

  return [...shuffleArray(accusedAgents), ...shuffleArray(otherAgents)];
}

// Dynamic turn allocation based on conversation flow
async function runDynamicDiscussion(agents: Agent[]): Promise<void> {
  const maxTurns = 50;
  let turnCount = 0;

  // Track who needs to respond
  const needsResponse = new Set<string>(agents.map(a => a.id));

  while (turnCount < maxTurns && needsResponse.size > 0) {
    // Pick agent who needs to respond most urgently
    const nextAgent = selectNextSpeaker(needsResponse, getRecentMessages());

    const response = await getAgentResponse(nextAgent);
    await saveMessage(response);

    // Check if this response provokes new responses
    const mentioned = extractMentions(response.message);
    mentioned.forEach(id => needsResponse.add(id));

    needsResponse.delete(nextAgent.id);
    turnCount++;
  }
}
```

---

## Claude 4.5 Sonnet Considerations

### Context Window Size and Management

**Claude 4.5 Sonnet Context Window: 200,000 tokens**

**Game History Size Estimation:**

| Game Stage | Rounds Played | Messages | Votes | Total Tokens | % of Context |
|------------|---------------|----------|-------|--------------|--------------|
| Early (R1-2) | 2 | 80 | 20 | 8,000 | 4% |
| Mid (R3-4) | 4 | 160 | 40 | 18,000 | 9% |
| Late (R5-6) | 6 | 240 | 60 | 30,000 | 15% |
| Very Long (R10) | 10 | 400 | 100 | 55,000 | 27.5% |

**Context Management Strategy:**

**Option 1: Full History (RECOMMENDED for Stage 1)**
- Pass complete game history in every API call
- Advantages: Perfect memory, agents reference any past event
- Disadvantages: Higher token costs, longer API calls in late game
- Suitable for: Games <10 rounds (context <60K tokens)

**Option 2: Sliding Window with Summarization**
- Keep last 3 rounds in full detail, summarize earlier rounds
- Implementation:
  ```typescript
  function buildContextWithSummarization(gameId: string, currentRound: number): string {
    const recentMessages = getMessages(gameId, currentRound - 2, currentRound); // Full detail
    const oldMessages = getMessages(gameId, 1, currentRound - 3);
    const summary = summarizeOldRounds(oldMessages); // AI-generated summary

    return `
GAME SUMMARY (Rounds 1-${currentRound - 3}):
${summary}

RECENT DISCUSSION (Full detail, Rounds ${currentRound - 2}-${currentRound}):
${formatMessages(recentMessages)}
    `;
  }
  ```
- Advantages: Reduced token usage (30-40% savings)
- Disadvantages: Risk of losing strategic details in summarization
- Suitable for: Games >10 rounds or cost-sensitive deployments

**Recommendation:** Use full history for Stage 1. Context window is large enough, and full memory produces better strategic gameplay.

### Response Quality for Strategic Conversation

**Claude 4.5 Sonnet Strengths:**
- Excellent at role-playing with consistent personality
- Strong logical reasoning for Villager deduction
- Capable of nuanced deception for Mafia lying
- Natural conversation flow (not robotic)
- Understands game theory and strategic behavior

**Quality Optimization Techniques:**

**1. Few-Shot Examples in System Prompt**
```
EXAMPLE MAFIA RESPONSE (when accused):
Accusation: "I think AgentX is Mafia because they voted for every person who died."
Good Response: "Wait, that's not true. I voted for Sarah in Round 2, and she's still alive. You're misremembering. Actually, YOU voted for both victims in Rounds 1 and 3. That's more suspicious to me."

Bad Response: "I'm not Mafia, I'm a Villager!" (too defensive, no counterargument)
```

**2. Temperature and Sampling Settings**
```typescript
const apiConfig = {
  model: "claude-sonnet-4.5-20250929",
  max_tokens: 200,
  temperature: 0.8,  // Higher for creative deception/varied responses
  top_p: 0.9,        // Nucleus sampling for natural variation
};
```

**3. Personality-Driven Diversity**
```typescript
const personalities = [
  { trait: "analytical", behavior: "Uses lots of data and voting statistics" },
  { trait: "intuitive", behavior: "Makes bold accusations based on gut feelings" },
  { trait: "cautious", behavior: "Rarely commits, always hedges statements" },
  { trait: "aggressive", behavior: "Confrontational, pushes others to take stances" },
  { trait: "friendly", behavior: "Builds alliances, uses 'we' language" },
];

// Inject personality into prompt
const systemPrompt = `You are ${agent.name}, a ${agent.personality} player...`;
```

**4. Response Validation and Retry Logic**
```typescript
async function getValidAgentResponse(agent: Agent, context: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const response = await callClaudeAPI(agent, context);

    // Validate response quality
    if (validateResponse(response)) {
      return response;
    }

    // Retry with additional prompt guidance
    context += "\n[Your previous response was too short or off-topic. Please provide a substantial strategic statement.]";
    attempts++;
  }

  throw new Error("Failed to get valid response after 3 attempts");
}

function validateResponse(response: string): boolean {
  // Check minimum length
  if (response.split(' ').length < 15) return false;

  // Check for game-relevant keywords
  const keywords = ['vote', 'mafia', 'villager', 'suspicious', 'trust', 'accuse'];
  const hasKeyword = keywords.some(k => response.toLowerCase().includes(k));

  return hasKeyword;
}
```

### Prompt Engineering Best Practices for Role-Play

**Advanced Prompt Techniques:**

**1. Chain-of-Thought for Strategic Reasoning**
```
Before responding publicly, think through your strategy:

INTERNAL REASONING (do not share publicly):
1. Who are the current suspects?
2. What information do I want to reveal or hide?
3. How can I advance my goal (eliminate Mafia / deceive Villagers)?
4. What would a player in my role say in this situation?

PUBLIC RESPONSE:
{your actual message to other players}
```

**2. Perspective-Taking for Mafia Deception**
```
MAFIA PERSPECTIVE PROMPT:
"Imagine you are a Villager who doesn't know who the Mafia are. What would a confused Villager say in this situation? Respond as that Villager would, with appropriate uncertainty and suspicion toward the wrong players."
```

**3. Dynamic Difficulty Adjustment**
```typescript
// Adjust Mafia deception skill based on game difficulty setting
const mafiaPromptAddons = {
  easy: "You may occasionally slip up or be slightly defensive (you're not a perfect liar).",
  medium: "Lie convincingly but with subtle tells that sharp Villagers might catch.",
  hard: "You are a master manipulator. Lie flawlessly and actively mislead Villagers with false logic."
};
```

**4. Anti-Repetition Techniques**
```
VARIETY REQUIREMENT:
Do not repeat phrases from your previous messages. Vary your language and argument structure.
Avoid saying the same thing twice in different words - bring new information or perspectives to each statement.
```

### Multi-Turn Conversation Patterns

**Conversation Flow Design:**

**Phase 1: Opening Statements (Round 1, 0-30 seconds)**
- Each agent makes initial observation or accusation
- Example: "I find AgentX's silence yesterday suspicious."

**Phase 2: Response Chains (Round 2-3, 30-120 seconds)**
- Agents respond to accusations directed at them
- Example: "AgentY accused me, but I voted for the same person they did in Round 2. Why am I more suspicious?"

**Phase 3: Coalition Building (Round 4-5, 120-240 seconds)**
- Agents form alliances or push for specific eliminations
- Example: "I agree with AgentZ's analysis. I think we should vote together on AgentX."

**Phase 4: Final Arguments (Round 5+, 240-300 seconds)**
- Last-ditch defenses and final accusations before voting
- Example: "This is our last chance to get it right. Here's why AgentX is definitely Mafia: [evidence list]"

**Implementation:**
```typescript
function getPhaseSpecificPromptAddition(phase: number, totalPhases: number): string {
  if (phase === 1) {
    return "This is the opening discussion. Make an initial strategic observation or ask a probing question.";
  } else if (phase < totalPhases - 1) {
    return "Respond to recent accusations or build on previous arguments. Move the discussion forward.";
  } else {
    return "This is the final round of discussion. Make your strongest case or final defense before voting.";
  }
}
```

---

## Recommendations for Master Plan

### 1. API Cost Management is Critical
- **MUST implement prompt caching** from Day 1 to achieve $4-5 per game cost (vs $17 without)
- Budget $5 per game × 50 test games = $250 for development/testing phase
- Monitor token usage in real-time with logging (`console.log(usage.input_tokens, usage.output_tokens)`)
- Implement cost alerts if game exceeds $10 (indicates caching failure or infinite loop)

### 2. Sequential Turn-Based Discussion Required
- DO NOT attempt parallel API calls during Discussion phase (breaks conversation coherence)
- Accept 3-5 minute Discussion duration as target (not a problem - makes gameplay compelling)
- Implement hard timeout of 10 seconds per agent turn (handle API failures gracefully)

### 3. SQLite is Sufficient for Stage 1
- No premature optimization - stick with SQLite for MVP
- Use `PRAGMA journal_mode=WAL` for concurrent read/write
- Plan database migration to PostgreSQL only if Stage 2 launches with 10+ concurrent games

### 4. Strategic Prompt Engineering Over Complex Orchestration
- Invest heavily in prompt quality (personality diversity, strategic hints, few-shot examples)
- Simple sequential turn management is sufficient (no complex conversation threading needed for MVP)
- Test with 5-10 full game runs to refine prompts before launch

### 5. Real-Time Spectator Experience Matters
- SSE implementation is CRITICAL for compelling spectator experience
- Each message should stream to UI within 100ms of agent generating it
- Fallback to 2-second polling for SSE-incompatible browsers (but prioritize SSE)

### 6. Mafia Strategy Research Informs Agent Quality
- Embed Mafia strategy research directly into system prompts (deflection tactics, voting pattern analysis)
- Use personality injection to create behavioral diversity (avoid "clone agents" problem)
- Validate agent quality by watching full games - agents should surprise you with strategy

---

## Technology Recommendations

### Greenfield Stack Recommendations

**Core Framework:**
- **Next.js 14 with App Router** ✓ (as specified in vision)
- **TypeScript strict mode** ✓ (as specified)
- **React 18** for frontend with Server Components for initial page load

**AI Layer:**
- **@anthropic-ai/sdk** (official TypeScript SDK for Claude API)
- **NO "Agent SDK" exists** - we build custom agent orchestration
- Install: `npm install @anthropic-ai/sdk`

**Database:**
- **Prisma ORM** + **SQLite** ✓ (as specified)
- Enable WAL mode: `PRAGMA journal_mode=WAL` in Prisma client
- Schema design optimized for rapid context queries

**API Layer:**
- **tRPC** ✓ (as specified) for type-safe backend communication
- Alternative: Next.js API routes with Zod validation (simpler for MVP)

**Real-Time Updates:**
- **Server-Sent Events (SSE)** via Next.js Route Handlers
- Implementation: `/app/api/game/[gameId]/stream/route.ts`
- No external dependency needed (native Web API)

**Styling:**
- **Tailwind CSS** ✓ (as specified)
- Consider **shadcn/ui** for pre-built components (optional, speeds up UI dev)

**Testing:**
- **Vitest** for unit tests (faster than Jest)
- **Playwright** for E2E testing (simulate full game runs)
- Focus testing on: prompt quality, game state transitions, SSE reliability

**Development Tools:**
- **tsx** for running TypeScript directly (`npm run dev`)
- **dotenv** for `.env` file management (API keys)
- **pino** for structured logging (monitor API costs and performance)

### Recommended Package List

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "@prisma/client": "^6.0.0",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "prisma": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

**Optional but Recommended:**
- **@trpc/server** and **@trpc/client** for type-safe API (if using tRPC)
- **pino** for logging
- **date-fns** for timestamp formatting
- **zustand** for frontend state management (lightweight Redux alternative)

---

## Performance Optimization Roadmap

### Stage 1: MVP (Single Game) - Optimize for Cost
**Focus:** Get one game working with acceptable performance and low cost per game.

**Optimizations:**
1. **Implement prompt caching** (73% cost reduction) - CRITICAL
2. **Response length limits** (100-150 tokens) to reduce output costs
3. **SQLite with WAL mode** for concurrent read/write
4. **SSE for real-time updates** (avoid polling overhead)
5. **Simple sequential turn management** (no premature complexity)

**Performance Targets:**
- Cost per game: $4-5 (with caching)
- Discussion phase: 3-5 minutes
- Agent response latency: 3-6 seconds avg
- Total game duration: 30-40 minutes
- Memory usage: <100MB

**Acceptable Trade-offs:**
- Sequential API calls (not parallel) during Discussion
- Full game history in context (no summarization yet)
- Single game at a time (no concurrency optimization)

---

### Stage 2: Multi-Game Support - Optimize for Concurrency
**Focus:** Support 5-10 concurrent games with multiple spectators.

**Optimizations:**
1. **Connection pooling** for database (Prisma connection pool)
2. **Request queue with rate limiting** (prevent API throttling)
3. **Redis pub/sub** for SSE event distribution (multiple Node.js processes)
4. **Context pruning** (summarize rounds >5 turns old)
5. **Database query optimization** (add indexes for game_id, round_number)

**Performance Targets:**
- 5-10 concurrent games
- 50-100 concurrent spectators
- Cost per game: $3-4 (with pruning + caching)
- Same single-game latency targets

**Infrastructure Changes:**
- Still SQLite (with WAL mode)
- Optional: Redis for event pub/sub if using multi-process Node.js

---

### Stage 3: Analytics & Scalability - Optimize for Scale
**Focus:** Support 20+ concurrent games, add analytics queries, prepare for production.

**Optimizations:**
1. **Migrate to PostgreSQL** (horizontal scaling readiness)
2. **Redis caching layer** for frequently accessed game state
3. **CDN for static assets** (reduce server load)
4. **Database read replicas** (separate analytics queries from live games)
5. **Batch processing for non-critical updates** (e.g., statistics calculation)

**Performance Targets:**
- 20+ concurrent games
- 500+ concurrent spectators
- <50ms query latency for game state fetch
- 99.9% uptime SLA

**Infrastructure Changes:**
- PostgreSQL (single instance with read replicas)
- Redis cluster (caching + pub/sub)
- Load balancer (multiple Next.js instances)

---

### Stage 4: Multi-Region & Advanced Features - Optimize for Global Scale
**Focus:** Global deployment, advanced AI features (voice, multi-modal), high availability.

**Optimizations:**
1. **Multi-region PostgreSQL** (Supabase, PlanetScale, or Neon)
2. **Edge compute for SSE** (Cloudflare Workers, Vercel Edge)
3. **Message queue for event processing** (RabbitMQ, Kafka)
4. **Advanced prompt optimization** (dynamic context pruning with embeddings)
5. **GPU inference for voice/video agents** (if expanding beyond text)

**Performance Targets:**
- 1000+ concurrent games globally
- <100ms latency per region
- 99.99% uptime

**Infrastructure Changes:**
- Distributed database (PostgreSQL with global replication)
- CDN + Edge compute (Cloudflare, Vercel)
- Message queue (Kafka or RabbitMQ)
- Monitoring (Datadog, New Relic)

---

## Monitoring & Observability

### Key Metrics to Track

**AI Performance Metrics:**
- **API latency per call:** p50, p95, p99 (target: p95 <6 seconds)
- **Token usage per game:** input/output tokens (target: 5-6M input, 40K output with caching)
- **Cost per game:** calculated from token usage (target: $4-5)
- **API error rate:** retries, timeouts, rate limits (target: <1% errors)

**Game Performance Metrics:**
- **Discussion phase duration:** actual vs target (target: 3-5 minutes)
- **Messages per Discussion:** count (target: 30-50)
- **Game completion rate:** % of games that reach win condition (target: >95%)
- **Agent response quality:** manual review of random samples (subjective)

**System Performance Metrics:**
- **Database query latency:** p50, p95 for context fetch (target: p95 <20ms)
- **SSE connection count:** active spectators (monitor for leaks)
- **Memory usage:** Node.js process RSS (target: <200MB)
- **CPU usage:** % utilization (target: <50% avg)

**Business Metrics:**
- **Games played:** daily/weekly count
- **Spectator engagement:** avg watch time per game
- **Cost per active user:** total API cost / unique spectators

### Implementation

```typescript
// Logging wrapper for API calls
async function callClaudeAPIWithMetrics(agent: Agent, context: string) {
  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4.5-20250929",
      max_tokens: 200,
      messages: [{ role: "user", content: context }],
      system: agent.systemPrompt,
    });

    const latency = Date.now() - startTime;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = (inputTokens / 1_000_000 * 3.0) + (outputTokens / 1_000_000 * 15.0);

    // Log metrics
    logger.info({
      event: "claude_api_call",
      agentId: agent.id,
      latency,
      inputTokens,
      outputTokens,
      cost,
      cached: response.usage.cache_read_input_tokens > 0,
    });

    return response;
  } catch (error) {
    logger.error({ event: "claude_api_error", agentId: agent.id, error });
    throw error;
  }
}
```

---

## Risk Assessment

### High Risks

**1. API Cost Explosion Without Prompt Caching**
- **Impact:** $17 per game instead of $4-5 (340% cost increase)
- **Likelihood:** HIGH if prompt caching not implemented correctly
- **Mitigation:**
  - Test prompt caching in development with real API calls
  - Monitor `cache_read_input_tokens` in API responses (should be >80% of input tokens after first call)
  - Implement cost alerts (abort game if cost exceeds $10)
- **Recommendation:** Validate caching in first iteration, critical blocker for MVP

**2. Agent Conversation Quality (Strategic Behavior)**
- **Impact:** Boring, predictable, or incoherent agent behavior ruins gameplay
- **Likelihood:** MEDIUM without extensive prompt testing
- **Mitigation:**
  - Run 10+ full test games with different player counts
  - Manually review transcripts for strategic depth
  - Iterate on system prompts based on observed weaknesses
  - Implement personality diversity (5+ personality types)
- **Recommendation:** Allocate 20% of dev time to prompt engineering and testing

**3. Discussion Phase Timing (Too Long or Too Short)**
- **Impact:** 7-minute discussions feel slow; 2-minute discussions lack depth
- **Likelihood:** MEDIUM due to uncertainty in turn management algorithm
- **Mitigation:**
  - Parameterize turn counts (configurable: 3-7 turns per agent)
  - Implement dynamic turn allocation (end early if no new info)
  - Add "speed mode" option (fewer turns, faster games)
- **Recommendation:** Build flexibility into turn management from Day 1

### Medium Risks

**1. Claude API Rate Limiting**
- **Impact:** Game pauses or errors during peak API usage
- **Likelihood:** LOW with sequential turn management (8-13 req/min well below 50 req/min limit)
- **Mitigation:**
  - Implement request queue with rate limit checks
  - Add exponential backoff for 429 errors
  - Monitor requests per minute in logs
- **Recommendation:** Include in MVP but not critical (low traffic expected)

**2. SQLite Concurrent Write Bottlenecks**
- **Impact:** Database locked errors during Discussion phase
- **Likelihood:** LOW with WAL mode enabled
- **Mitigation:**
  - Enable WAL mode: `PRAGMA journal_mode=WAL`
  - Implement retry logic for SQLITE_BUSY errors
  - Test with concurrent writes in development
- **Recommendation:** Enable WAL mode in first iteration

**3. SSE Connection Stability**
- **Impact:** Spectators miss messages due to dropped SSE connections
- **Likelihood:** MEDIUM in production environments (proxy timeouts)
- **Mitigation:**
  - Implement polling fallback (2-second interval)
  - Add reconnection logic on client side
  - Send keepalive messages every 15 seconds
- **Recommendation:** Build fallback in first iteration

### Low Risks

**1. Memory Leaks in Node.js Process**
- **Impact:** Server crashes after long-running games
- **Likelihood:** LOW with proper cleanup
- **Mitigation:**
  - Use `weak` references for event listeners
  - Clear completed game data from memory
  - Monitor `process.memoryUsage()` in logs
- **Recommendation:** Address if memory usage exceeds 200MB in testing

**2. Game State Corruption**
- **Impact:** Invalid game states causing crashes
- **Likelihood:** LOW with Prisma transaction safety
- **Mitigation:**
  - Use database transactions for multi-step state changes
  - Add validation checks before phase transitions
  - Implement game state snapshots for recovery
- **Recommendation:** Add validation in iteration planning phase

---

## Cost-Benefit Analysis Summary

### Development Investment

**Time Investment:**
- Iteration 1 (Foundation): 15-20 hours (database, API setup, basic orchestration)
- Iteration 2 (AI layer): 12-18 hours (agent prompts, conversation management)
- Iteration 3 (Frontend): 8-12 hours (UI, SSE, spectator view)
- Total: 35-50 hours of development

**Financial Investment:**
- Development/testing API costs: $250 (50 test games × $5)
- Infrastructure: $0 (local SQLite + Vercel free tier)
- Total MVP cost: $250

### Operational Costs (Post-Launch)

**Per-Game Costs:**
- Claude API: $4-5 per game (with caching)
- Infrastructure: ~$0 (SQLite + Vercel free tier supports 100 games/day)

**Monthly Costs (100 games/month scenario):**
- API costs: $400-500
- Hosting: $0 (Vercel free tier)
- Total: $400-500/month

**Monthly Costs (1,000 games/month scenario - Stage 2):**
- API costs: $4,000-5,000
- Hosting: $20 (Vercel Pro tier)
- Total: $4,020-5,020/month

### Value Proposition

**Compelling AI Mafia Game Delivers:**
1. **Novel entertainment:** First-of-its-kind AI vs AI Mafia with strategic gameplay
2. **Viral potential:** Shareable spectator experience (Twitch/YouTube potential)
3. **AI research showcase:** Demonstrates advanced Claude prompting and orchestration
4. **Scalable business model:** Low marginal cost per game ($5), monetization potential

**Break-Even Analysis:**
- Cost per game: $5
- Target revenue per game (ads/subscriptions): $0.50-2.00
- Break-even: 500-1,000 active users watching 2-3 games/month

---

## Notes & Observations

### Key Insights from Analysis

1. **Prompt caching is non-negotiable** - Without it, project economics don't work ($17/game unsustainable)

2. **Sequential turn management is optimal** - Parallel API calls during Discussion break conversation coherence, not worth complexity

3. **SQLite is perfect for MVP** - No need for premature PostgreSQL migration; focus on agent quality instead

4. **Discussion phase duration is feature, not bug** - 3-5 minute discussions allow strategic depth; embrace it

5. **Personality diversity is critical** - Without varied agent personalities, gameplay becomes repetitive and boring

6. **Mafia strategy research directly informs prompts** - Embed deflection tactics, voting analysis, and social deduction strategies into system prompts

7. **Real-time spectator experience is make-or-break** - SSE streaming creates compelling "live sports" feel; polling fallback is must-have

8. **Testing budget must be allocated** - $250 for API costs during development is necessary investment for prompt quality

### Technical Decisions Validated

- **Next.js 14 App Router:** ✓ Excellent choice (SSE via Route Handlers, Server Components for initial load)
- **TypeScript:** ✓ Essential for complex game state management and API contracts
- **Prisma + SQLite:** ✓ Perfect for MVP, easy migration path to PostgreSQL later
- **Claude 4.5 Sonnet:** ✓ Ideal model for strategic role-play (200K context, high quality, reasonable cost with caching)
- **tRPC:** ? Optional - Next.js API routes + Zod may be simpler for MVP

### Open Questions for Master Planner

1. **How many test games to run during development?** (Recommend: 10-20 full games to refine prompts)
2. **Should we build admin UI for prompt tuning?** (Recommend: Yes, simple form to edit system prompts without code changes)
3. **Do we need game replay feature for Stage 1?** (Recommend: No, but keep schema compatible for future replay)
4. **Should voting phase be parallelized?** (Recommend: Yes, low risk and saves 30 seconds per round)
5. **Difficulty levels (easy/medium/hard Mafia)?** (Recommend: Stage 2 feature, keep MVP simple)

---

*Exploration completed: 2025-10-12*
*This report informs master planning decisions for AI Mafia game scalability and performance optimization*
