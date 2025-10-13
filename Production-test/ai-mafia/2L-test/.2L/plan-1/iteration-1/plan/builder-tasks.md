# Builder Task Breakdown

## Overview

**Total Builders:** 4 primary builders working in parallel

**Estimated Iteration 1 Duration:** 18-22 hours (building) + 5 hours (testing runtime) + 8-10 hours (prompt iteration)

**Builder Assignment Strategy:**
- Builders work on isolated features when possible (minimize merge conflicts)
- Dependencies noted explicitly (execution order)
- Complexity estimated to help builders decide on splitting
- Each builder has clear success criteria and deliverables

---

## Builder-1: Project Setup & Database Schema

### Scope
Create Next.js 14 project foundation, configure all tooling, implement complete database schema with Prisma, and establish shared types/utilities that other builders will import.

### Complexity Estimate
**MEDIUM**

Foundation work is straightforward but critical. All other builders depend on this completion.

### Success Criteria
- [ ] Next.js 14.2.18 project initialized with TypeScript strict mode
- [ ] All dependencies installed (see tech-stack.md)
- [ ] Tailwind CSS configured and working
- [ ] Prisma schema created with all 5 tables (games, players, discussion_messages, votes, game_events)
- [ ] Database migrations run successfully, WAL mode enabled
- [ ] Prisma client generated and importable
- [ ] Environment variables configured (.env file, .anthropic-key.txt loaded)
- [ ] Git repository initialized with .gitignore (dev.db, node_modules, .env, logs/)
- [ ] Seed function created for test game setup
- [ ] Other builders can import `@/lib/db/client` and run queries

### Files to Create

**Configuration Files:**
- `package.json` - Dependencies (see tech-stack.md)
- `tsconfig.json` - TypeScript strict config
- `next.config.js` - Minimal Next.js config
- `tailwind.config.ts` - Tailwind configuration
- `postcss.config.js` - PostCSS for Tailwind
- `.env` - Environment variables template
- `.gitignore` - Ignore dev.db, node_modules, logs/, .env

**Database:**
- `prisma/schema.prisma` - Complete schema (see patterns.md)
- `src/lib/db/client.ts` - Prisma singleton pattern
- `src/lib/db/seed.ts` - Seed test game function

**Shared Types:**
- `src/lib/types/shared.ts` - Shared interfaces (AgentContext, GameHistory, etc.)

### Dependencies
**Depends on:** None (foundation builder)
**Blocks:** Builders 2, 3, 4 (all need database schema)

### Implementation Notes

**Critical Steps:**
1. Use `create-next-app` with TypeScript template
2. Install ALL dependencies from tech-stack.md in single command
3. Enable SQLite WAL mode: `sqlite3 dev.db "PRAGMA journal_mode=WAL;"`
4. Run `npx prisma generate` after schema creation
5. Test seed function before marking complete

**Prisma Schema Gotchas:**
- Use `@db.Text` for message field (not varchar limit)
- Use composite indexes: `@@index([gameId, roundNumber, timestamp])`
- Use `onDelete: Cascade` for all foreign keys
- Include Iteration 2 tables (votes, game_events) even if unused now

**Environment Variables:**
```env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sk-ant-..." # Load from .anthropic-key.txt
NODE_ENV="development"
DISCUSSION_DURATION_SECONDS=180
AGENT_TURN_TIMEOUT_SECONDS=10
AGENT_TURNS_PER_ROUND=5
MAX_COST_PER_TEST=3.0
MIN_CACHE_HIT_RATE=0.7
```

**Seed Function Pattern:**
```typescript
// src/lib/db/seed.ts
export async function seedTestGame(config: {
  playerCount: number;
  mafiaCount: number;
  personalities: string[];
}): Promise<string> {
  // 1. Create game
  // 2. Assign roles randomly
  // 3. Create players with personalities
  // 4. Return gameId
}
```

### Testing Requirements
- Run `npm install` successfully
- Run `npx prisma migrate dev` successfully
- Run `npx prisma studio` (verify tables exist)
- Import prisma client: `import { prisma } from '@/lib/db/client'`
- Call seed function, verify game created in database

### Potential Split Strategy
**Unlikely to need split** (focused, well-defined scope)

If builder struggles after 3 hours with database schema:
- **Primary builder:** Project setup + basic schema (games, players, messages)
- **Sub-builder 1A:** Add indexes, votes table, game_events table

---

## Builder-2: AI Agent Orchestration & Claude Integration

### Scope
Build custom AI agent orchestration system, Claude API client with prompt caching, context builder, system prompt generation, and cost tracking. This is the "brain" of the agents.

### Complexity Estimate
**VERY HIGH**

This is the most complex builder task due to prompt engineering iteration requirements and caching implementation. High likelihood of needing split for prompt engineering.

### Success Criteria
- [ ] Claude API client working with retry logic and timeout handling
- [ ] Prompt caching implemented and validated (>70% cache hit rate)
- [ ] Context builder fetches game history and formats for Claude
- [ ] System prompts for Mafia and Villager roles (detailed strategies)
- [ ] Personality descriptions implemented (5 types minimum)
- [ ] Response validation (minimum length, keyword checks)
- [ ] Fallback response generation for timeouts
- [ ] Token usage logging (input, cached, output tokens + cost)
- [ ] Cost tracking system aggregates per game
- [ ] Integration test: Single agent generates valid response

### Files to Create

**Claude Integration:**
- `src/lib/claude/client.ts` - API wrapper with retry logic
- `src/lib/claude/context-builder.ts` - Format game history for Claude
- `src/lib/claude/prompt-cache.ts` - Caching utilities
- `src/lib/claude/types.ts` - Claude API types (TokenUsage, AgentContext)

**Prompts:**
- `src/lib/prompts/system-prompts.ts` - Mafia/Villager strategy prompts
- `src/lib/prompts/personalities.ts` - Personality descriptions

**Agent Management:**
- `src/lib/agent/manager.ts` - Agent creation/retrieval functions
- `src/lib/agent/types.ts` - Agent interfaces

**Utilities:**
- `src/utils/cost-tracker.ts` - Token usage tracking and aggregation
- `src/utils/logger.ts` - Structured logging (pino)

### Dependencies
**Depends on:** Builder-1 (database schema, Prisma client)
**Blocks:** Builder-3 (orchestrator needs agent system)

### Implementation Notes

**Critical Path:**
1. **Start with prompt caching validation** (Day 1) - If caching doesn't work, everything else is blocked
2. Implement single-agent test BEFORE building full system
3. Allocate 6-8 hours for prompt iteration (not just 2 hours)
4. Use A/B testing methodology (one prompt change at a time)

**Prompt Caching Validation:**
```typescript
// First API call
const response1 = await client.messages.create({
  system: [{ type: 'text', text: PROMPT, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: 'Test' }],
});
console.log('First call - cache creation:', response1.usage.cache_creation_input_tokens);

// Second API call (should hit cache)
const response2 = await client.messages.create({
  system: [{ type: 'text', text: PROMPT, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: 'Test 2' }],
});
console.log('Second call - cache read:', response2.usage.cache_read_input_tokens);
// Should see cache_read_input_tokens > 0
```

**System Prompt Strategy:**
- Start with detailed prompts from patterns.md (Explorer 2 provided excellent base)
- MAFIA_STRATEGY: 6 deception tactics + 4 anti-patterns
- VILLAGER_STRATEGY: 6 deduction tactics + 4 pattern recognition rules
- PERSONALITY: 5 types minimum (analytical, aggressive, cautious, social, suspicious)
- Keep system prompt under 1500 tokens (cache efficiently)

**Response Validation:**
- Minimum 5 words (prevent empty responses)
- Maximum 100 words (prevent runaway generation)
- Contains game-relevant keywords: ['vote', 'mafia', 'suspicious', 'innocent', 'think', 'believe', 'accuse', 'defend']
- No forbidden phrases: Don't say "I am MAFIA" or mention "AI" or "prompt"

**Cost Tracking:**
```typescript
// After each API call
costTracker.log({
  gameId,
  playerId,
  turn,
  inputTokens: usage.input_tokens,
  cachedTokens: usage.cache_read_input_tokens || 0,
  outputTokens: usage.output_tokens,
  cost: calculateCost(usage),
  timestamp: new Date(),
});

// At end of game
const summary = costTracker.getGameSummary(gameId);
console.log(`Total cost: $${summary.totalCost.toFixed(2)}`);
console.log(`Cache hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`);
```

### Testing Requirements
- Unit test: Context builder formats messages correctly
- Integration test: Single agent generates response (no orchestration)
- Validation test: Response validator works (valid and invalid examples)
- Caching test: Second API call has >0 cache_read_input_tokens
- Cost test: Cost tracking logs all fields correctly

### Potential Split Strategy (RECOMMENDED if >8 hours spent)

**If prompt engineering requires extensive iteration:**

**Foundation (Primary Builder):**
- Claude API client with retry logic
- Context builder (database → Claude format)
- Prompt caching implementation
- Response validation
- Cost tracking
- Basic system prompts (1-2 paragraphs per role)

**Sub-builder 2A: Prompt Engineering Specialist**
- Iterate on Mafia strategy prompts
- Iterate on Villager strategy prompts
- Expand personality descriptions (5 → 8 types)
- Run 10+ test games, manually evaluate quality
- A/B test prompt changes systematically
- Document prompt iteration log

**Split Trigger:** If after 8 hours, prompts don't produce strategic conversation (quality gates failing)

---

## Builder-3: Discussion Phase Orchestrator

### Scope
Build Discussion phase orchestration logic: turn scheduler, turn execution, event emission, threading inference, and phase timing. This is the "conductor" that coordinates agent turns.

### Complexity Estimate
**HIGH**

Complex orchestration logic with multiple concurrent concerns (turn management, timeout handling, event emission, database writes), but well-defined problem domain.

### Success Criteria
- [ ] Turn scheduler implements sequential round-robin (3-5 rounds per agent)
- [ ] Turn execution: fetch context → call API → validate → save → broadcast
- [ ] 10-second timeout per turn with fallback response
- [ ] Event emission via EventEmitter (orchestrator → SSE)
- [ ] Basic threading inference (reply-to logic)
- [ ] Phase timer (3-5 minute duration with graceful completion)
- [ ] Error handling (continue on single turn failure, don't crash entire discussion)
- [ ] Integration test: Full Discussion phase completes with 10 agents

### Files to Create

**Orchestrator:**
- `src/lib/discussion/orchestrator.ts` - Main orchestration logic
- `src/lib/discussion/turn-scheduler.ts` - Turn scheduling algorithm
- `src/lib/discussion/types.ts` - Discussion types (TurnSchedule, etc.)

**Events:**
- `src/lib/events/emitter.ts` - Game event emitter (EventEmitter instance)
- `src/lib/events/types.ts` - Event type definitions

**Utilities:**
- `src/lib/discussion/threading.ts` - Reply-to inference logic

### Dependencies
**Depends on:**
- Builder-1 (database schema)
- Builder-2 (agent system, Claude client)

**Blocks:** Builder-4 (CLI harness needs orchestrator)

### Implementation Notes

**Turn Scheduler Algorithm:**
```typescript
// Pseudocode
for (round = 0; round < totalRounds; round++) {
  if (timeExceeded) break;

  turnOrder = shuffleArray(alivePlayers);

  for (player of turnOrder) {
    if (timeExceeded) break;

    try {
      await executeTurn(player);
      await sleep(500); // Small delay for readability
    } catch (error) {
      logError(error);
      continue; // Don't crash, continue to next turn
    }
  }
}
```

**Turn Execution Flow:**
1. Build agent context (from Builder-2)
2. Generate response with timeout (from Builder-2)
3. Validate response (from Builder-2)
4. Determine reply target (threading logic)
5. Save message to database
6. Emit event to SSE
7. Track cost

**Threading Inference (Basic Version):**
- Check for explicit mentions: "Agent-Alpha" in message → reply to Agent-Alpha's last message
- Check for "responding to" phrases → reply to last message
- Default: reply to most recent message (within last 3 turns)
- Store inReplyToId in database

**Error Handling Strategy:**
- Turn timeout: Log warning, use fallback response, continue
- API error: Log error, retry with backoff, if fails use fallback
- Database error: Log error, skip turn, continue
- Validation error: Log warning, skip turn, continue
- NEVER crash entire Discussion due to single turn failure

**Event Emission:**
```typescript
// After saving message
gameEventEmitter.emit('message', {
  gameId,
  type: 'NEW_MESSAGE',
  payload: savedMessage,
});

// After phase complete
gameEventEmitter.emit('phase_complete', {
  gameId,
  phase: 'DISCUSSION',
});
```

**Timeout Handling:**
```typescript
async function executeWithTimeout(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );

  return Promise.race([fn(), timeoutPromise]);
}

// Usage
try {
  const response = await executeWithTimeout(
    () => generateAgentResponse(context),
    10000
  );
} catch (error) {
  if (error.message === 'Timeout') {
    return generateFallbackResponse(player);
  }
  throw error;
}
```

### Testing Requirements
- Unit test: Turn scheduler generates correct turn order
- Unit test: Threading inference detects mentions correctly
- Integration test: Run Discussion with 2 agents (minimal scenario)
- Integration test: Run Discussion with 10 agents (full scenario)
- Stress test: Simulate API timeout, verify fallback works
- Stress test: Simulate API error, verify retry + fallback works

### Potential Split Strategy

**If builder struggles after 6 hours:**

**Primary Builder (Core Orchestration):**
- Turn scheduler (round-robin, shuffling)
- Basic turn execution (call API, save to DB)
- Error handling (continue on failure)
- Integration with Builder-2 (agent system)

**Sub-builder 3A (Real-time & Events):**
- Event emission (EventEmitter setup)
- SSE integration (work with Builder-4)
- Threading inference
- Phase timing logic

**Split Trigger:** If orchestrator + SSE + threading exceeds 10 hours

---

## Builder-4: CLI Test Harness & Basic UI

### Scope
Build CLI test harness for rapid iteration, basic Discussion viewer web UI with SSE, and quality evaluation tools. This is the "validation layer" that proves the system works.

### Complexity Estimate
**MEDIUM-HIGH**

CLI harness is straightforward, but web UI SSE requires careful implementation. Quality evaluation adds complexity.

### Success Criteria
- [ ] CLI command `npm run test-discussion` runs successfully
- [ ] CLI displays real-time agent turns with colored output
- [ ] CLI generates transcript file after test completes
- [ ] CLI displays cost summary (total cost, cache hit rate)
- [ ] Web UI page `/test-discussion` displays live Discussion
- [ ] SSE streaming works (messages appear <2 seconds after generation)
- [ ] PhaseIndicator component shows countdown timer
- [ ] PlayerGrid component displays 8-12 agent cards
- [ ] DiscussionFeed component auto-scrolls with new messages
- [ ] Basic threading UI ("Replying to X" text)
- [ ] Quality evaluation script calculates 3-7 metrics from transcript

### Files to Create

**CLI:**
- `src/cli/test-discussion.ts` - Main CLI script
- `src/cli/evaluate-transcript.ts` - Quality evaluation script
- `package.json` - Add scripts: `"test-discussion": "tsx src/cli/test-discussion.ts"`

**Web UI:**
- `app/test-discussion/page.tsx` - Discussion viewer page
- `components/PhaseIndicator.tsx` - Phase + countdown
- `components/PlayerGrid.tsx` - Agent cards
- `components/DiscussionFeed.tsx` - Scrolling message feed

**API:**
- `app/api/game/[gameId]/stream/route.ts` - SSE endpoint

**Documentation:**
- `docs/quality-rubric.md` - Quality evaluation criteria
- `docs/setup-guide.md` - How to run tests
- `logs/` directory - Store test transcripts

### Dependencies
**Depends on:**
- Builder-1 (database schema)
- Builder-2 (agent system for cost tracking display)
- Builder-3 (orchestrator to run)

**Blocks:** None (validation layer)

### Implementation Notes

**CLI Harness Key Features:**
1. **Colored output:** Use chalk for colored agent names, messages, costs
2. **Real-time logging:** Listen to gameEventEmitter, display turns as they happen
3. **Transcript generation:** Fetch all messages after completion, format as text
4. **Cost summary:** Display total cost, cache hit rate, alert if >$3
5. **Spinner/progress:** Use ora for loading indicators

**CLI Output Format:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Discussion Phase Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Setup:
  Game ID: game-abc123
  Players: 10 (3 Mafia, 7 Villagers)
  Duration: 180 seconds

Turn 1/50 - Agent-Alpha (VILLAGER):
"I think we need to carefully observe voting patterns..."

Turn 2/50 - Agent-Bravo (MAFIA):
"I agree with Alpha. Let's focus on facts..."

[... 48 more turns ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Duration: 182.4 seconds
Total turns: 50
Total cost: $1.87 (cache hit rate: 73%)
Transcript: logs/discussion-test-1697234567.txt
```

**SSE Implementation:**
- Use Next.js ReadableStream (see patterns.md)
- Filter events by gameId (don't leak between games)
- Implement keepalive (15-second heartbeat)
- Handle client disconnection (cleanup listeners)
- Defer polling fallback to QA (only if SSE unreliable)

**Web UI Styling (Minimal):**
- Use default Tailwind classes only
- No custom CSS
- Functional layout: 3-column grid (phase indicator + player grid on left, discussion feed on right)
- Auto-scroll: `scrollTop = scrollHeight` on new message
- No animations except auto-scroll
- Desktop-only (no responsive design)

**Quality Evaluation (Start with 3 Core Metrics):**
```typescript
// src/cli/evaluate-transcript.ts
interface QualityMetrics {
  strategicDepth: number;      // % statements with evidence keywords
  memoryAccuracy: number;       // % references that are accurate (manual)
  engagementRating: number;     // 1-5 scale (manual)
}

function calculateStrategicDepth(messages: Message[]): number {
  const keywords = ['because', 'evidence', 'pattern', 'vote', 'suspicious'];
  const strategic = messages.filter(m =>
    keywords.some(kw => m.message.toLowerCase().includes(kw))
  );
  return strategic.length / messages.length;
}

// Manual memory validation
function validateMemoryReferences(messages: Message[]): number {
  const references = messages.filter(m =>
    /in round \d+|last vote|previously/i.test(m.message)
  );

  console.log('\nValidate Memory References:');
  let accurate = 0;
  for (const msg of references) {
    console.log(`\n${msg.player.name}: "${msg.message}"`);
    const answer = prompt('Accurate? (y/n): ');
    if (answer === 'y') accurate++;
  }

  return references.length > 0 ? accurate / references.length : 1.0;
}
```

**Transcript Format (see patterns.md for full example):**
- Header: Game ID, date, cost, config
- Agent list: Names, roles, personalities
- Conversation: All turns with round/turn numbers
- Footer: Quality metrics (if evaluation run)

### Testing Requirements
- Run CLI: `npm run test-discussion` completes successfully
- Verify transcript file created in `logs/` directory
- Verify cost displayed and <$3
- Open web UI: `http://localhost:3000/test-discussion`
- Verify SSE messages appear within 2 seconds
- Verify auto-scroll works (feed scrolls to bottom)
- Test SSE disconnection (kill server, verify auto-reconnect)

### Potential Split Strategy

**If builder struggles after 6 hours:**

**Primary Builder (CLI Focus):**
- CLI test harness (setup, run, log, transcript)
- Cost tracking display
- Quality evaluation script (3 core metrics)
- Documentation (quality rubric, setup guide)

**Sub-builder 4A (UI Focus):**
- SSE endpoint implementation
- Discussion viewer page
- All UI components (PhaseIndicator, PlayerGrid, DiscussionFeed)
- Basic threading UI

**Split Trigger:** If CLI + UI + SSE exceeds 8 hours

---

## Builder Execution Order

### Phase 1: Foundation (Sequential)
**Builder-1 must complete first** (database schema blocks all others)

Estimated: 4-5 hours

Deliverable: Database schema, Prisma client, seed function

### Phase 2: Parallel Development (3 builders)

**Builder-2, Builder-3, Builder-4 work in parallel**

**Builder-2 (8-10 hours):**
- Claude API client
- Context builder
- System prompts (initial version)
- Cost tracking

**Builder-3 (8-10 hours):**
- Turn scheduler
- Turn execution
- Event emission
- Threading logic

**Builder-4 (6-8 hours):**
- CLI test harness
- SSE endpoint
- Basic web UI
- Quality evaluation

### Phase 3: Integration (All builders)

**Estimated: 30 minutes**

Process:
1. Builder-3 imports Builder-2's agent system
2. Builder-4 imports Builder-3's orchestrator
3. Run CLI test harness end-to-end
4. Fix any integration issues
5. Commit to main

### Phase 4: Prompt Iteration (Builder-2 or Sub-builder 2A)

**Estimated: 8-10 hours**

Process:
1. Baseline tests (3 games)
2. Iteration cycle 1 (adjust prompts, 3 games)
3. Iteration cycle 2 (adjust prompts, 3 games)
4. Iteration cycle 3 (adjust prompts, 3 games)
5. Final validation (3 games)
6. Lock prompts, document changes

---

## Integration Notes

### Shared Interfaces

All builders import from shared types:

```typescript
// src/lib/types/shared.ts
export interface AgentContext {
  player: Player;
  systemPrompt: string;
  gameStateContext: string;
  conversationContext: Anthropic.MessageParam[];
}

export interface TokenUsage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  cost: number;
}

export interface GameHistory {
  messages: DiscussionMessage[];
  votes: Vote[];
  deaths: Player[];
}
```

### Event Payload Structure

All builders agree on event format:

```typescript
// src/lib/events/types.ts
export type GameEvent =
  | { gameId: string; type: 'NEW_MESSAGE'; payload: DiscussionMessage }
  | { gameId: string; type: 'PHASE_CHANGE'; payload: { phase: string } }
  | { gameId: string; type: 'PHASE_COMPLETE'; payload: { phase: string } };
```

### Database Access Pattern

All builders use singleton:

```typescript
import { prisma } from '@/lib/db/client';

// Query example
const messages = await prisma.discussionMessage.findMany({
  where: { gameId },
  include: { player: true },
});
```

### Cost Tracking Integration

Builder-2 provides, Builder-3 uses, Builder-4 displays:

```typescript
// Builder-2 provides
export const costTracker = new CostTracker();

// Builder-3 uses
import { costTracker } from '@/utils/cost-tracker';
costTracker.log({ gameId, playerId, turn, ...usage });

// Builder-4 displays
const summary = costTracker.getGameSummary(gameId);
console.log(`Cost: $${summary.totalCost.toFixed(2)}`);
```

---

## Conflict Prevention

### File Ownership

- **Builder-1 owns:** `prisma/`, `src/lib/db/`, `.env`, config files
- **Builder-2 owns:** `src/lib/claude/`, `src/lib/prompts/`, `src/utils/cost-tracker.ts`
- **Builder-3 owns:** `src/lib/discussion/`, `src/lib/events/`
- **Builder-4 owns:** `src/cli/`, `app/`, `components/`, `docs/`

### Shared Files (Coordination Required)

- `src/lib/types/shared.ts` - Builder-1 creates, others add interfaces as needed
- `src/lib/events/types.ts` - Builder-3 creates, Builder-4 adds event types if needed
- `package.json` - Builder-1 installs deps, Builder-4 adds CLI scripts

### Merge Strategy

1. Each builder creates feature branch: `builder-1`, `builder-2`, `builder-3`, `builder-4`
2. Builder-1 merges to main FIRST (foundation)
3. Builders 2, 3, 4 merge to main after integration test passes
4. Resolve conflicts by file ownership (owner's version wins unless bug)

---

## Success Metrics (Iteration 1 Complete)

All 4 builders complete when:

1. CLI command works: `npm run test-discussion`
2. Discussion completes: 10 agents × 5 rounds = 50 turns
3. Cost acceptable: <$3 per test, cache hit rate >70%
4. Quality gates pass: 5/7 dimensions meet thresholds
5. Web UI functional: `/test-discussion` displays live conversation
6. Transcripts saved: 10+ test runs in `logs/` directory
7. Documentation complete: Quality rubric, setup guide, prompt iteration log

**Handoff to Iteration 2:** All 7 success criteria met, prompt quality validated, transcripts demonstrate strategic conversation.
