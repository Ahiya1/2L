# Master Exploration Report

## Explorer ID
master-explorer-2

## Focus Area
Dependencies & Risk Assessment

## Vision Summary
Build an AI Mafia game where 8-12 autonomous Claude-powered agents engage in strategic multi-turn conversations, with the critical challenge being the Discussion phase where agents debate, accuse, defend, and build cases based on conversational memory.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 18 must-have features
  1. Game configuration (player count 8-12)
  2. Role distribution algorithm
  3. NIGHT phase (Mafia coordination)
  4. DAY announcement phase
  5. DISCUSSION phase orchestration (THE COMPLEX PART)
  6. VOTING phase with justifications
  7. Win condition checking
  8. Multi-turn conversation system
  9. Agent memory and state management
  10. Turn-based speaking control
  11. Conversation threading
  12. Private Mafia coordination
  13. Public deception mechanics
  14. Lobby UI (player count selection)
  15. Live game UI (phase indicator, player grid, discussion feed)
  16. Real-time updates (SSE)
  17. Database persistence (games, players, events, messages)
  18. Game state machine

- **User stories/acceptance criteria:** 7 critical success criteria
  1. Multi-turn discussion with logical responses
  2. Private Mafia coordination + public lying
  3. Villager deduction and pattern recognition
  4. Natural conversation flow (not robotic)
  5. Accurate memory references
  6. Complete playthrough to win condition
  7. Fascinating strategic gameplay

- **Estimated total work:** 35-50 hours (VERY HIGH complexity)

### Complexity Rating
**Overall Complexity: VERY COMPLEX**

**Rationale:**
- **18+ distinct features** spanning AI orchestration, real-time communication, and game logic
- **Critical unknown:** No "Claude Agent SDK" exists - must build agentic system using Claude Messages API
- **Novel coordination challenge:** Managing 8-12 concurrent AI agents with individual memory and personalities
- **Real-time complexity:** Discussion phase requires sophisticated turn management, threading, and state synchronization
- **AI behavior engineering:** Distinct prompt strategies for Mafia (deceptive) vs Villager (truthful) agents

---

## CRITICAL RESEARCH FINDING: "Claude Agent SDK" Does Not Exist

### What We Learned

**THE BIG RISK:** The vision document references "Claude Agent SDK" but this is NOT a real product.

**What Actually Exists:**
- **`@anthropic-ai/sdk`** (v0.65.0): Official TypeScript SDK for Claude Messages API
  - Provides stateless conversation API
  - No built-in agent framework
  - No persistent memory management
  - No multi-agent orchestration
  - Developer must build agent abstractions

**Alternative Options:**
1. **Build custom agent system** using `@anthropic-ai/sdk`
   - Most control, highest complexity
   - Need to implement: state management, memory, conversation history, turn orchestration

2. **Use LangChain.js** with Anthropic integration
   - Provides agent abstractions, memory modules, conversation chains
   - Package: `@langchain/anthropic`
   - Adds dependency but reduces custom code

3. **Use Vercel AI SDK** with Anthropic provider
   - Package: `@ai-sdk/anthropic`
   - Lighter weight than LangChain
   - Good for streaming, tool use, but less agent-focused

### Recommendation
**Use `@anthropic-ai/sdk` + custom agent orchestration layer**

**Why:**
- LangChain adds significant overhead for this use case
- We need very specific conversation orchestration (turn-based, threaded)
- Custom implementation gives full control over memory and state
- Performance-critical for managing 8-12 concurrent agents

**What We Must Build:**
- Agent state manager (name, role, personality, memory)
- Conversation history manager (per-agent view of discussion)
- Turn orchestrator (who speaks when, response threading)
- Memory system (who said what, voting patterns, suspicious behaviors)
- Prompt engineering framework (role-specific system prompts)

---

## Dependency Graph

```
Foundation Layer (Must Build First)
├── Database Schema + Prisma ORM
│   └── games, players, game_events, discussion_messages tables
├── Claude API Integration
│   └── @anthropic-ai/sdk setup, API key configuration
└── Agent Orchestration Core
    ├── Agent State Manager (memory, role, personality)
    ├── Conversation History Manager
    └── System Prompt Templates (Mafia vs Villager)
        ↓
Game Engine Layer (Depends on Foundation)
├── Game State Machine
│   └── Phase transitions: NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK
├── NIGHT Phase Handler
│   └── Private Mafia agent conversation (isolated from villagers)
├── DAY Phase Handler
│   └── Death announcement, brief reactions
├── DISCUSSION Phase Orchestrator ← THE CRITICAL COMPONENT
│   ├── Turn management algorithm
│   ├── Statement-response threading
│   ├── Agent scheduling (prevent domination)
│   ├── Time limits per turn
│   └── Conversation history aggregation
├── VOTING Phase Handler
│   └── Vote collection, justification, tie-breaking
└── Win Condition Checker
    └── Mafia count vs Villager count
        ↓
API Layer (Depends on Game Engine)
├── tRPC Router Setup
├── Game Management Procedures
│   ├── createGame (player count)
│   ├── startGame (role assignment, state machine init)
│   ├── getGameState (current phase, players, timer)
│   └── getDiscussionFeed (paginated messages)
└── Real-time Event Emitter
    └── SSE endpoint for live discussion updates
        ↓
UI Layer (Depends on API)
├── Lobby Screen
│   └── Player count slider (8-12), Start Game button
└── Live Game Screen
    ├── Phase indicator with countdown timer
    ├── Player grid (alive/dead status)
    ├── Discussion feed (scrolling, threading visualization)
    └── Vote tally (voting phase only)
```

### Critical Path Analysis

**Phase 1 Dependencies (Foundation - MUST COMPLETE FIRST):**
1. Prisma schema design
2. Claude API integration (`@anthropic-ai/sdk`)
3. Agent state manager
4. Conversation history manager

**Why these first:** Without agent orchestration core, cannot test any game logic.

**Phase 2 Dependencies (Game Engine):**
5. Game state machine
6. NIGHT phase (test Mafia coordination)
7. DISCUSSION phase orchestrator (test multi-turn conversations)
8. VOTING phase
9. WIN_CHECK logic

**Why this order:** NIGHT phase is simpler (3-4 agents, private) - validates agent system. DISCUSSION phase is most complex - needs NIGHT phase patterns proven first.

**Phase 3 Dependencies (API + UI):**
10. tRPC setup
11. Game procedures
12. SSE real-time updates
13. UI components

**Why last:** UI cannot function without working game engine. Can test game logic via direct function calls before adding API layer.

---

## Technology Dependencies

### Core Stack (from vision.md)
- **Framework:** Next.js 14 App Router
  - **Risk:** LOW (stable, well-documented)
  - **Dependency:** React 18+

- **Language:** TypeScript (strict mode)
  - **Risk:** LOW (team familiar)
  - **Setup:** tsconfig.json with strict flags

- **Database:** Prisma + SQLite
  - **Risk:** LOW (good for single-instance game)
  - **Limitation:** Not suitable for multi-game concurrency (out of scope)

- **API:** tRPC
  - **Risk:** MEDIUM (type safety excellent, but adds complexity)
  - **Alternative:** Could use Next.js Route Handlers (simpler)
  - **Recommendation:** Stick with tRPC for type safety across API boundary

- **Styling:** Tailwind CSS
  - **Risk:** LOW (standard)

### AI Dependencies

**Primary: `@anthropic-ai/sdk` (v0.65.0+)**
- **Installation:** `npm install @anthropic-ai/sdk`
- **API Key:** Required (env variable: `ANTHROPIC_API_KEY`)
- **Rate Limits:**
  - Free tier: Very limited (not suitable)
  - Paid tier: Check limits (may need throttling for 8-12 concurrent agents)
- **Cost Estimate:**
  - Discussion phase: 3-5 minutes = ~60-100 agent turns
  - Each turn: ~500-1000 tokens input + 100-200 tokens output
  - Per game: ~50K-100K tokens total
  - Cost: ~$2-4 per game (Claude Sonnet 4.5)
  - **RISK:** Budget consideration for testing/demos

**Conversation Management Strategy:**
```typescript
// Agent will receive:
// 1. System prompt (role, personality, game rules)
// 2. Conversation history (filtered per agent knowledge)
// 3. Current phase and game state
// 4. Prompt for action

// Example flow:
const agentResponse = await anthropic.messages.create({
  model: "claude-sonnet-4.5-20250929",
  max_tokens: 200,
  system: `You are ${agent.name}, a ${agent.role} in a Mafia game. ${rolePrompt}`,
  messages: agentConversationHistory, // filtered by what this agent can see
});
```

### Real-time Dependencies

**Server-Sent Events (SSE):**
- **Implementation:** Next.js Route Handler with `ReadableStream`
- **Risk:** LOW (built-in browser support)
- **Fallback:** 2-second polling (as specified)
- **Challenge:** Keep connections alive during long discussion phases

**Polling Fallback:**
- **Endpoint:** tRPC procedure: `discussion.getLatestMessages`
- **Risk:** LOW (simple HTTP polling)

---

## Risk Assessment

### Critical Risks (Project-Threatening)

#### 1. **No Agent SDK - Must Build Custom Orchestration**
- **Impact:** 15-20 hours of unexpected work building agent framework
- **Probability:** CERTAIN (already identified)
- **Mitigation:**
  - Allocate entire first iteration to agent orchestration core
  - Build minimal proof-of-concept: 3 agents, simple conversation
  - Validate memory and turn management before adding game logic
- **Recommendation:** Prototype agent system FIRST, in isolation from game logic

#### 2. **Discussion Phase Conversation Quality**
- **Impact:** Agents may produce robotic, repetitive, or illogical responses
- **Probability:** HIGH (complex prompt engineering challenge)
- **Mitigation:**
  - Research Mafia game strategy (what makes good deduction/deception)
  - Create prompt library: accusation templates, defense patterns, question styles
  - Implement conversation quality checks (detect repetition, encourage variety)
  - Add "personality" dimension to agents (suspicious, analytical, trusting, etc.)
  - Test with different Claude models (Opus for quality vs Haiku for cost)
- **Recommendation:** Budget 8-10 hours for prompt iteration and testing

#### 3. **Agent Memory Management at Scale**
- **Impact:** 12 agents × 50 turns = 600 messages. Each agent needs filtered view.
- **Probability:** HIGH (performance + accuracy challenge)
- **Mitigation:**
  - Design efficient conversation history filtering (per-agent perspective)
  - Example: Villagers don't see NIGHT phase Mafia conversations
  - Implement message relevance scoring (recent messages weighted higher)
  - Consider token limit management (summarize old messages if too long)
  - Database indexes on `game_id`, `phase`, `timestamp`
- **Recommendation:** Implement history truncation strategy (keep last 20 messages full, summarize older)

#### 4. **Claude API Cost & Rate Limits**
- **Impact:** $2-4 per game × 50 test games = $100-200 budget for development
- **Probability:** CERTAIN
- **Mitigation:**
  - Use Claude Haiku for development/testing (75% cost savings)
  - Switch to Sonnet only for quality validation
  - Implement game state checkpointing (resume after errors without re-running)
  - Cache common conversation patterns where possible
  - Add `max_tokens` limits per agent turn (100-150 tokens)
- **Recommendation:** Start with Haiku, accept lower quality during development

#### 5. **Turn Management Deadlocks**
- **Impact:** Agent waits for response, orchestrator waits for agent, infinite loop
- **Probability:** MEDIUM (concurrency challenge)
- **Mitigation:**
  - Implement turn timeouts (15-30 seconds max per agent response)
  - Fallback: if agent times out, skip turn and log error
  - Use queue-based turn scheduling (not free-for-all)
  - Add orchestrator state machine to prevent race conditions
- **Recommendation:** Build timeout handling from day one

### High Risks

#### 6. **Mafia Coordination Leakage**
- **Impact:** Private Mafia conversation accidentally visible to Villagers
- **Probability:** MEDIUM (data filtering bug)
- **Mitigation:**
  - Separate `phase` field in `discussion_messages`: "NIGHT" vs "DISCUSSION"
  - Query filtering: villagers query `WHERE phase != 'NIGHT'`
  - Unit tests for conversation history filtering per role
  - Manual QA: verify villager agents never reference night conversations
- **Recommendation:** Add integration test that validates data isolation

#### 7. **SSE Connection Stability**
- **Impact:** Spectators miss discussion messages if connection drops
- **Probability:** MEDIUM (network issues)
- **Mitigation:**
  - Implement sequence numbers on messages
  - Client reconnects and requests missed messages
  - Fallback to polling after 3 SSE failures
  - Keep message history in DB for replay
- **Recommendation:** Build polling fallback early, don't rely solely on SSE

#### 8. **Game State Consistency**
- **Impact:** Race condition: vote counted twice, player eliminated but still speaking
- **Probability:** MEDIUM (async operations)
- **Mitigation:**
  - Use database transactions for phase transitions
  - Lock game state during critical operations (voting, elimination)
  - Validate agent eligibility before accepting their action (check alive status)
  - Add state machine validation (prevent invalid phase transitions)
- **Recommendation:** Use Prisma transactions for all state mutations

### Medium Risks

#### 9. **Prompt Injection / Agent Manipulation**
- **Impact:** Agent "breaks character" or references meta-information
- **Probability:** LOW-MEDIUM (Claude has good guardrails)
- **Mitigation:**
  - Strong system prompts emphasizing in-character behavior
  - Don't expose internal game state in prompts (just observable facts)
  - Filter agent responses for meta-commentary
  - Accept some imperfection (agents may occasionally slip)
- **Recommendation:** Good system prompts + acceptance testing

#### 10. **Performance: 12 Agents × 50 Turns**
- **Impact:** Discussion phase takes 10+ minutes (unacceptable for spectators)
- **Probability:** MEDIUM
- **Mitigation:**
  - Parallel agent requests where possible (but maintain turn order)
  - Reduce per-agent response time: `max_tokens: 150`
  - Optimize conversation history: only send last 30 messages
  - Stream agent responses to UI (don't wait for full completion)
- **Recommendation:** Target 5-8 second per agent turn (3-5 min total discussion)

#### 11. **Database Schema Evolution**
- **Impact:** Schema changes mid-development require migrations
- **Probability:** MEDIUM (requirements clarification)
- **Mitigation:**
  - Design schema upfront with all identified fields
  - Use Prisma migrations (version control friendly)
  - Keep SQLite file separate from code (don't commit to git)
- **Recommendation:** Spend 2 hours on schema design before coding

### Low Risks

#### 12. **Next.js 14 App Router Compatibility**
- **Impact:** tRPC + SSE may have edge cases in App Router
- **Probability:** LOW (both are well-supported)
- **Mitigation:** Use official examples from tRPC and Next.js docs

#### 13. **Tailwind CSS Styling**
- **Impact:** UI polish takes longer than expected
- **Probability:** LOW (well-understood technology)
- **Mitigation:** Use component library (shadcn/ui) for rapid prototyping

---

## External Integration Points

### Claude API (Anthropic)
- **Endpoint:** `https://api.anthropic.com/v1/messages`
- **Authentication:** API Key (Bearer token)
- **Rate Limits:**
  - Tier 1: 50 requests/minute (insufficient for 12 concurrent agents)
  - Tier 2+: Contact Anthropic for upgrade
- **Error Handling:**
  - 429 (rate limit): Implement exponential backoff
  - 500 (server error): Retry with backoff
  - 400 (invalid request): Log and skip agent turn
- **Dependency:** Network connectivity, Anthropic service uptime
- **Fallback:** None (game cannot proceed without Claude API)

### No Other External Services
- **Database:** SQLite (local file, no external dependency)
- **Hosting:** Not specified (out of scope for Stage 1)

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 phases)

**Rationale:**
- **VERY COMPLEX** project (35-50 hours estimated)
- **High-risk unknowns** (agent orchestration, conversation quality)
- **Clear dependency layers** (foundation → game engine → UI)
- **Need for incremental validation** (test agent system before adding game logic)

### Suggested Iteration Phases

---

### **Iteration 1: Agent Orchestration Foundation**
- **Vision:** Build and validate custom AI agent orchestration system
- **Scope:** Core agent framework, minimal game logic
  - Database schema (Prisma + SQLite)
  - Claude API integration (`@anthropic-ai/sdk`)
  - Agent state manager (name, role, personality, memory)
  - Conversation history manager (per-agent filtered views)
  - System prompt templates (Mafia vs Villager)
  - Turn orchestrator (basic round-robin speaking order)
  - Proof-of-concept: 3 agents, 10-turn conversation
  - Unit tests for memory filtering and turn management

- **Why first:** Cannot build game logic without proven agent system. High-risk unknown must be validated.

- **Estimated duration:** 18-22 hours
  - Schema design: 2h
  - Claude SDK setup: 2h
  - Agent state manager: 4h
  - Conversation history manager: 4h
  - Turn orchestrator: 5h
  - Prompt engineering: 3h
  - Testing: 3h

- **Risk level:** HIGH
  - Unknown: Custom agent framework complexity
  - Unknown: Conversation quality with basic prompts
  - Unknown: Performance with concurrent API calls

- **Success criteria:**
  - 3 agents can hold 10-turn conversation
  - Each agent maintains individual memory
  - Conversation history correctly filtered per agent
  - Turn orchestrator prevents simultaneous speaking
  - No API rate limit issues
  - Agent responses feel distinct (personalities work)

- **Deliverables:**
  - `/src/lib/agent/` - Agent orchestration code
  - `/src/lib/claude/` - Claude API wrapper
  - `/prisma/schema.prisma` - Database schema
  - `/src/lib/prompts/` - System prompt templates
  - Proof-of-concept script demonstrating agent conversation

---

### **Iteration 2: Game Engine & Core Phases**
- **Vision:** Implement Mafia game state machine and all game phases
- **Scope:** Complete game logic, no UI yet
  - Game state machine (phase transitions)
  - Role assignment algorithm
  - NIGHT phase handler (private Mafia conversation)
  - DAY announcement phase (death reveal + reactions)
  - DISCUSSION phase orchestrator (multi-turn, threaded)
  - VOTING phase handler (vote collection + elimination)
  - Win condition checker
  - Game loop integration (play full game)
  - Enhanced prompt engineering (role-specific strategies)
  - CLI test harness (play game from terminal)

- **Dependencies:**
  - Requires: Iteration 1 agent orchestration system
  - Imports: Agent state manager, conversation history, turn orchestrator

- **Estimated duration:** 16-20 hours
  - State machine: 2h
  - Role assignment: 1h
  - NIGHT phase: 3h
  - DAY phase: 2h
  - DISCUSSION phase: 6h (most complex)
  - VOTING phase: 2h
  - Win checker: 1h
  - Integration + testing: 4h

- **Risk level:** MEDIUM-HIGH
  - Unknown: Discussion phase conversation quality (will agents strategize?)
  - Challenge: Mafia deception vs Villager deduction balance
  - Challenge: Conversation threading and response targeting

- **Success criteria:**
  - Complete game playthrough (start to win condition)
  - Mafia agents coordinate privately during NIGHT
  - Discussion phase produces logical accusations and defenses
  - Agents reference previous statements and votes
  - Voting reflects discussion reasoning
  - Win conditions correctly detected
  - Game completes in reasonable time (10-15 minutes)

- **Deliverables:**
  - `/src/lib/game/` - Game engine code
  - `/src/lib/game/phases/` - Phase handlers
  - `/src/lib/game/state-machine.ts` - State transitions
  - CLI test script: `npm run test-game`
  - Enhanced prompt templates with Mafia strategy

---

### **Iteration 3: API Layer + Spectator UI**
- **Vision:** Build web interface for game control and spectating
- **Scope:** tRPC API, real-time updates, full UI
  - tRPC router setup
  - Game management procedures (create, start, getState)
  - Discussion feed procedure (paginated messages)
  - SSE endpoint for real-time updates
  - Lobby screen (player count selection, start button)
  - Live game screen (phase indicator, player grid, discussion feed)
  - Phase countdown timers (client-side display)
  - Vote tally visualization
  - Game over screen (winner + role reveal)
  - Responsive design (desktop + tablet)

- **Dependencies:**
  - Requires: Iteration 2 game engine
  - Imports: Game state machine, phase handlers, all game logic

- **Estimated duration:** 12-16 hours
  - tRPC setup: 2h
  - Game procedures: 3h
  - SSE endpoint: 2h
  - Lobby UI: 1h
  - Live game UI: 5h (discussion feed, player grid, timers)
  - Styling + polish: 2h
  - Integration testing: 2h

- **Risk level:** LOW-MEDIUM
  - Known: UI implementation is straightforward
  - Challenge: SSE connection stability
  - Challenge: Discussion feed performance with 100+ messages

- **Success criteria:**
  - Spectator can create game with 8-12 player selection
  - Game starts, assigns roles, begins play
  - Discussion feed updates in real-time (<3 second latency)
  - Phase transitions visible with countdown timer
  - Player status (alive/dead) updates correctly
  - Vote tally displays during voting phase
  - Game over shows winner and reveals all roles
  - Polling fallback works if SSE fails

- **Deliverables:**
  - `/src/server/api/` - tRPC router
  - `/src/app/` - Next.js pages
  - `/src/components/` - React components
  - `/src/app/api/sse/` - SSE route handler
  - Fully functional web UI

---

## Dependency Matrix

| Feature | Depends On | Blocks | Iteration |
|---------|-----------|--------|-----------|
| Database schema | None | Everything | 1 |
| Claude SDK setup | None | Agent system | 1 |
| Agent state manager | Schema, Claude SDK | Game phases | 1 |
| Conversation history | Schema, Agent manager | Discussion phase | 1 |
| Turn orchestrator | Agent manager | All phases | 1 |
| NIGHT phase | Turn orchestrator | Discussion phase | 2 |
| DISCUSSION phase | NIGHT phase validation | Voting | 2 |
| VOTING phase | Discussion phase | Win check | 2 |
| Win checker | Voting phase | Game loop | 2 |
| tRPC API | Game engine | UI | 3 |
| SSE endpoint | tRPC | Real-time UI | 3 |
| Discussion feed UI | SSE | Spectator experience | 3 |

---

## Technology Recommendations

### Existing Codebase Findings
**N/A - Greenfield project** (only `.2L` planning directory exists)

### Greenfield Recommendations

#### Core Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.65.0",
    "@prisma/client": "^6.0.0",
    "@trpc/server": "^11.0.0",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@trpc/next": "^11.0.0",
    "@tanstack/react-query": "^5.0.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^14.2.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0"
  }
}
```

#### Optional Enhancements
- **shadcn/ui**: Pre-built Tailwind components (button, card, etc.)
- **date-fns**: Date formatting for timestamps
- **clsx**: Conditional className management

#### Environment Variables
```bash
# .env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sk-ant-..."
NODE_ENV="development"
```

#### File Structure Recommendation
```
/src
  /lib
    /agent
      state-manager.ts      # Agent memory and state
      conversation.ts       # Conversation history manager
      orchestrator.ts       # Turn management
    /claude
      client.ts             # Claude API wrapper
      types.ts              # API response types
    /prompts
      mafia.ts              # Mafia agent prompts
      villager.ts           # Villager agent prompts
      system.ts             # Base system prompt
    /game
      state-machine.ts      # Phase transitions
      /phases
        night.ts            # NIGHT phase logic
        day.ts              # DAY phase logic
        discussion.ts       # DISCUSSION phase logic
        voting.ts           # VOTING phase logic
      win-checker.ts        # Win condition logic
    /db
      client.ts             # Prisma client
  /server
    /api
      /routers
        game.ts             # Game management procedures
        discussion.ts       # Discussion feed procedures
      root.ts               # tRPC root router
  /app
    /page.tsx               # Lobby screen
    /game/[id]/page.tsx     # Live game screen
    /api
      /sse/route.ts         # SSE endpoint
  /components
    /lobby
    /game
      PhaseIndicator.tsx
      PlayerGrid.tsx
      DiscussionFeed.tsx
      VoteTally.tsx
/prisma
  schema.prisma
```

---

## Integration Considerations

### Cross-Phase Integration Points

#### 1. **Conversation History Continuity**
- Agents must remember across phases (NIGHT → DISCUSSION → VOTING)
- Implementation: Single conversation history per agent, filtered by phase visibility
- Challenge: Mafia agents remember private coordination during public discussion

#### 2. **Agent State Persistence**
- Agent personality and strategy must remain consistent across phases
- Implementation: Immutable agent config (name, role, personality traits)
- Challenge: "Alive" status changes during game (must exclude dead agents from turns)

#### 3. **Time Synchronization**
- Phase timers must coordinate with turn orchestrator
- Implementation: Phase timeout interrupts current turn, forces transition
- Challenge: Don't cut off agent mid-response (grace period)

#### 4. **Real-time UI Updates**
- UI must reflect game state changes immediately
- Implementation: SSE broadcasts phase changes, new messages, votes
- Challenge: SSE connection may drop during long discussion phase

### Potential Integration Challenges

#### 1. **Agent Context Window Limits**
- Claude has 200K token context, but sending full game history is inefficient
- Solution: Send last 30 messages + relevant earlier messages (mentions of agent)
- Risk: Agent may miss important earlier discussion points

#### 2. **Concurrent Agent Requests**
- Can't send 12 simultaneous requests to Claude API (rate limits)
- Solution: Queue-based orchestrator with max 3 concurrent requests
- Risk: Adds latency (longer discussion phase)

#### 3. **Database Write Contention**
- Multiple agents generating messages simultaneously
- Solution: Use Prisma connection pooling + transaction isolation
- Risk: Message ordering may not match actual generation time

#### 4. **Game State Snapshot for API**
- UI needs consistent game state (don't show intermediate states)
- Solution: tRPC procedure returns atomic game state snapshot
- Risk: State changes between UI polls (SSE mitigates this)

---

## Recommendations for Master Plan

1. **Accept the "No Agent SDK" Reality Early**
   - Allocate first iteration entirely to building custom agent orchestration
   - Don't underestimate this work - it's 15-20 hours minimum
   - Validate agent conversation quality before adding game complexity

2. **Prototype Discussion Phase Before Full Implementation**
   - After Iteration 1, run 10-20 test conversations to evaluate quality
   - If agents produce poor deduction/deception, iterate on prompts
   - May need to switch to Claude Opus for better strategic reasoning

3. **Plan for Cost Management**
   - Development/testing budget: $100-200 for Claude API usage
   - Use Haiku during development, Sonnet for validation
   - Implement game state checkpointing to avoid re-running full games

4. **Build Incremental Validation**
   - Iteration 1: Validate agent conversation (3 agents, 10 turns)
   - Iteration 2: Validate game logic (full game, CLI test)
   - Iteration 3: Validate UI (end-to-end web experience)
   - Don't proceed to next iteration without success criteria met

5. **Prioritize Discussion Phase Quality Over Feature Completeness**
   - If time is limited, cut UI polish (Iteration 3)
   - Discussion phase must be "fascinating to watch" (success criteria #7)
   - A working CLI game is better than a beautiful UI with robotic agents

6. **Consider Iteration 2 as Potential MVP Stopping Point**
   - After Iteration 2, game is fully playable via CLI
   - Could demo game logic without UI
   - Iteration 3 (UI) is important but not critical to core experience

7. **Implement Robust Error Handling from Start**
   - Claude API will fail occasionally (rate limits, timeouts)
   - Turn orchestrator must handle agent errors gracefully
   - Game should checkpoint and be resumable after crashes

8. **Accept Imperfect Agent Behavior**
   - Agents will sometimes break character or make illogical statements
   - Perfect Mafia gameplay is unrealistic expectation
   - Goal: "Fascinating to watch" not "Perfect AI players"

---

## Notes & Observations

### Mafia Game Strategy Research

**What makes good Mafia gameplay:**

**Mafia agents should:**
- Coordinate target selection during NIGHT (reach consensus)
- Publicly defend each other subtly during DISCUSSION (without being obvious)
- Deflect suspicion by accusing villagers
- Avoid contradicting each other's alibis
- Vote strategically to eliminate suspicious villagers

**Villager agents should:**
- Analyze voting patterns (who voted for eliminated players)
- Look for inconsistencies in statements
- Form theories about Mafia composition
- Question suspicious behaviors
- Trust some players and suspect others (not uniform suspicion)

**Prompt engineering implications:**
- Mafia agents need "team awareness" (know who their partners are)
- Villager agents need "pattern recognition" instructions
- All agents need "character consistency" enforcement
- Conversation should reference past statements ("Earlier you said...")

### Potential Future Enhancements (Out of Scope)

- **Special roles:** Detective (investigate player), Doctor (save player)
- **Human player integration:** Mixed human/AI games
- **Multiple concurrent games:** Requires PostgreSQL, game isolation
- **AI detection challenge:** Can humans identify which players are AI?
- **Replay system:** Watch previous games with commentary
- **Agent personality customization:** Let users design agent personalities
- **Voice synthesis:** Audio version of text discussion

### Known Limitations

- **Single game at a time:** SQLite + synchronous game loop
- **No authentication:** Open access (fine for demo/prototype)
- **No game history UI:** Can only view current game
- **Fixed phase timers:** Not configurable via UI
- **No pause/resume:** Game must complete in one session

---

## Final Risk Summary

| Risk Category | Count | Critical Path Impact |
|---------------|-------|---------------------|
| Critical | 5 | Blocks all progress |
| High | 3 | Blocks specific features |
| Medium | 3 | Degrades quality |
| Low | 2 | Minor inconvenience |

**Highest Priority Mitigation:**
1. Build agent orchestration prototype (Iteration 1 POC)
2. Validate conversation quality early (before game logic)
3. Plan for API cost management (use Haiku for dev)
4. Implement turn timeouts from start (prevent deadlocks)
5. Design schema carefully upfront (avoid mid-dev migrations)

**Project Viability:** HIGH (with proper iteration breakdown and risk mitigation)

**Estimated Timeline:** 35-50 hours across 3 iterations

**Recommendation:** Proceed with 3-iteration approach, validate each phase before moving forward.

---

*Exploration completed: 2025-10-12*
*This report informs master planning decisions*
