# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Build an AI Mafia game where 8-12 autonomous AI agents play Mafia while spectators watch, featuring multi-turn strategic conversations with memory, deception mechanics, and logical deduction during Discussion phases.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 35+ distinct features across game engine, AI orchestration, and UI
- **User stories/acceptance criteria:** 7 critical success criteria
- **Estimated total work:** 40-60 hours

**Feature Breakdown:**
1. **Game Configuration System** (4 features): Player count selection, role distribution algorithm, win condition checker, game state initialization
2. **Phase State Machine** (5 features): Night phase, day announcement, discussion phase, voting phase, win check loop
3. **AI Agent System** (12 features): Agent initialization, persistent memory, conversation orchestration, turn management, statement-response threading, Mafia coordination, prompt engineering (Mafia/Villager strategies), personality consistency, time limit enforcement, agent scheduling algorithm, private/public conversation separation, memory recall system
4. **Discussion Orchestration** (6 features): Multi-turn conversation flow, accusation/defense tracking, voting pattern analysis, conversation history, thread visualization, strategic reasoning chains
5. **Database Layer** (4 features): Games table, players table, game_events table, discussion_messages table with threading
6. **Web UI** (8 features): Lobby screen with player count slider, live game screen, phase indicator with timer, player grid with status, discussion feed with threading, vote tally display, game over screen, role reveal
7. **Real-time Updates** (2 features): Server-Sent Events implementation, polling fallback

### Complexity Rating
**Overall Complexity: VERY COMPLEX**

**Rationale:**
- **35+ features** spanning AI orchestration, game logic, real-time UI, and database persistence
- **Critical architectural challenge:** Multi-turn AI conversation orchestration with memory and strategic behavior is novel and technically demanding
- **AI complexity:** Requires sophisticated prompt engineering for Mafia (deception, coordination) vs Villager (deduction, truth-seeking) behaviors
- **State management:** Complex game state with conversation history, voting patterns, agent memory, and phase transitions
- **Real-time requirements:** Discussion phase needs orchestrated turn-taking with responses to specific statements
- **Memory system:** Agents must accurately recall previous statements, votes, and behavioral patterns across multiple game phases
- **Learning curve:** Claude API usage patterns for persistent conversations, memory management, and multi-agent coordination require research and experimentation

---

## Architectural Analysis

### Major Components Identified

#### 1. **Game Engine (State Machine Core)**
   - **Purpose:** Manages game flow through phases (NIGHT → DAY_ANNOUNCEMENT → DISCUSSION → VOTING → WIN_CHECK → Loop)
   - **Complexity:** HIGH
   - **Why critical:** Central orchestrator for all game logic; must coordinate timing, phase transitions, and enforce game rules. Discussion phase orchestration is particularly complex with turn management and conversation threading.
   - **Key challenges:**
     - State machine reliability across async AI responses
     - Timing enforcement (30-45s Night, 3-5min Discussion, 45s Voting)
     - Thread-safe state updates during concurrent AI operations
     - Win condition evaluation and game termination

#### 2. **AI Orchestration Layer**
   - **Purpose:** Manages 8-12 persistent AI agents with conversation memory, strategic prompting, and turn-based communication
   - **Complexity:** VERY HIGH
   - **Why critical:** The heart of the game experience. Must create believable, strategic gameplay with natural conversation flow, accurate memory recall, and differentiated Mafia/Villager behavior.
   - **Key challenges:**
     - **Agent persistence:** Each agent needs identity, role awareness, personality, and growing memory across entire game
     - **Conversation orchestration:** Turn management to prevent chaos, allowing responses to specific statements while maintaining flow
     - **Memory management:** Agents must recall who said what, who voted for whom, and behavioral patterns over dozens of turns
     - **Prompt engineering:** Mafia agents must lie convincingly without obvious coordination; Villagers must detect inconsistencies and build logical cases
     - **Private vs public conversations:** Mafia night coordination must be separate from public Discussion phase
     - **Response generation:** Each agent turn must consider full game context, conversation history, and strategic objectives
   - **Architecture implications:**
     - Need agent manager to handle 8-12 concurrent agent instances
     - Conversation context builder to format game history for each agent
     - Turn scheduler to determine speaking order and enforce time limits
     - Memory store for each agent's accumulated knowledge

#### 3. **Database Persistence Layer**
   - **Purpose:** Store game state, player data, events, and full conversation history with threading metadata
   - **Complexity:** MEDIUM
   - **Why critical:** Provides game state persistence, enables conversation history retrieval, supports UI updates, and allows post-game analysis.
   - **Schema requirements:**
     - `games`: id, status, winner, player_count, created_at, completed_at
     - `players`: id, game_id, name, role, personality_traits, status (alive/dead)
     - `game_events`: id, game_id, event_type (phase_change, death, vote), timestamp, metadata
     - `discussion_messages`: id, game_id, player_id, message, thread_parent_id, turn_number, timestamp
   - **Prisma ORM considerations:** Type-safe queries, relation handling, transaction support for atomic game state updates

#### 4. **Web UI (Spectator Interface)**
   - **Purpose:** Real-time spectator view of AI gameplay with conversation feed, player status, and phase progression
   - **Complexity:** MEDIUM
   - **Why critical:** Makes the AI gameplay fascinating to watch; must display conversation threading, highlight strategic moments, and provide game context.
   - **Key features:**
     - Lobby: Player count slider (8-12) + Start Game button
     - Game screen: Phase indicator with countdown, player grid showing alive/dead/hidden roles, scrolling discussion feed with thread visualization, vote tally
     - Game over: Winner announcement, full role reveal
   - **Real-time challenges:**
     - Server-Sent Events for low-latency discussion updates
     - Conversation threading visualization (who responded to whom)
     - Highlighting accusations, defenses, and key strategic moments
     - 2-second polling fallback for SSE compatibility

#### 5. **API Layer (tRPC)**
   - **Purpose:** Type-safe communication between frontend and backend game engine
   - **Complexity:** LOW-MEDIUM
   - **Why critical:** Provides strongly-typed API contracts, simplifies state synchronization, and enables real-time updates.
   - **Key endpoints:**
     - `game.create(playerCount)` - Initialize new game
     - `game.getStatus(gameId)` - Fetch current game state
     - `game.getDiscussionFeed(gameId)` - Stream conversation messages
     - `game.subscribeToEvents(gameId)` - SSE subscription for real-time updates

---

### Technology Stack Implications

#### **Framework: Next.js 14 App Router**
- **Decision rationale:** Server-side rendering for lobby, client components for real-time game screen, API routes for game engine, SSE support
- **Architecture fit:** App Router enables colocated server/client code, tRPC integration, and SSE via route handlers
- **Complexity implications:** MEDIUM - Team must understand server components vs client components, data fetching patterns, and streaming

#### **Language: TypeScript (strict mode)**
- **Decision rationale:** Type safety critical for complex game state, AI response handling, and tRPC integration
- **Architecture fit:** Enables catching state management errors at compile time, provides intellisense for Prisma schema
- **Complexity implications:** LOW - Standard modern web development

#### **AI: Claude API (NOT SDK - CRITICAL CLARIFICATION)**
- **Decision rationale:** The vision mentions "Claude Agent SDK" but as of January 2025, Anthropic provides a **Claude API**, not a separate Agent SDK. The architecture must use the standard Claude API with custom agent orchestration.
- **Architecture fit:**
  - Use Claude API's Messages endpoint for each agent turn
  - Build custom agent persistence layer (agents are stateless in API)
  - Implement conversation memory by maintaining message history per agent
  - Use system prompts to define agent roles, personalities, and strategic behaviors
- **Complexity implications:** VERY HIGH
  - **No built-in agent persistence:** Must implement custom agent state management
  - **Memory is manual:** Each API call must include relevant conversation history in messages array
  - **Context window management:** Long games may exceed context limits; need truncation strategy
  - **Prompt engineering:** System prompts must encode Mafia strategy (lie, deflect, coordinate secretly) vs Villager strategy (deduce, question, detect inconsistencies)
  - **API cost:** Each agent turn = 1 API call; Discussion phase with 10 agents, 5 turns each = 50+ API calls per round
  - **Latency:** Sequential turn-taking may feel slow; need to balance parallelization (Mafia night coordination) vs turn order (Discussion phase)

**Key architectural decision required:**
```typescript
// Option A: Stateless agents (rebuild context each turn)
function generateAgentResponse(agent: Agent, gameHistory: GameEvent[], conversationHistory: Message[]) {
  const systemPrompt = buildAgentSystemPrompt(agent.role, agent.personality);
  const messages = buildContextMessages(gameHistory, conversationHistory);
  return claudeAPI.messages.create({ system: systemPrompt, messages });
}

// Option B: Maintain agent conversation threads (persistent memory)
class PersistentAgent {
  private conversationHistory: Message[] = [];

  async speak(context: GameContext) {
    const newMessages = buildIncrementalContext(context);
    this.conversationHistory.push(...newMessages);
    const response = await claudeAPI.messages.create({
      system: this.systemPrompt,
      messages: this.conversationHistory
    });
    this.conversationHistory.push(response);
    return response;
  }
}
```

**Recommendation:** Option B (Persistent Agent pattern) for better memory consistency, but requires careful context window management and pruning strategy.

#### **Database: Prisma + SQLite**
- **Decision rationale:** Prisma provides type-safe ORM, SQLite simplifies deployment for Stage 1 (spectator-only)
- **Architecture fit:** Adequate for single-game-at-a-time, no concurrent game support needed yet
- **Complexity implications:** LOW - Standard setup, but schema must support conversation threading

#### **Styling: Tailwind CSS**
- **Decision rationale:** Rapid UI development, component-based styling
- **Architecture fit:** Standard for Next.js projects
- **Complexity implications:** LOW

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 Phases)

**Rationale:**
- **40-60 hours estimated work** - too large for single iteration
- **Natural architectural layers:** Backend game engine, AI orchestration, Frontend UI
- **Critical path dependencies:** Must build game engine before AI orchestration, AI orchestration before compelling UI
- **Risk mitigation:** AI orchestration (Discussion phase) is highest risk; must validate early before full UI investment
- **Testing strategy:** Each iteration produces testable deliverable (CLI game, basic UI, polished UI)

---

### Suggested Iteration Phases

#### **Iteration 1: Game Engine + Basic AI (Foundation)**
- **Vision:** Build the core game engine with state machine, basic AI integration, and CLI-based testing
- **Scope:** Backend-heavy foundation
  - **Game state machine:** NIGHT → DAY_ANNOUNCEMENT → DISCUSSION → VOTING → WIN_CHECK loop
  - **Role distribution algorithm:** Calculate Mafia/Villager counts based on player count (8-12)
  - **Win condition checker:** Mafia >= Villagers (Mafia wins) or all Mafia eliminated (Villagers win)
  - **Database schema:** Prisma setup with games, players, game_events, discussion_messages tables
  - **Agent persistence layer:** PersistentAgent class with conversation memory
  - **Basic Claude API integration:** Single agent can generate responses with system prompt
  - **Night phase:** Mafia coordination (private conversation, victim selection by consensus)
  - **Discussion phase orchestration (SIMPLIFIED):** Turn-based speaking, agents can make statements (no threading yet)
  - **Voting phase:** Each agent votes with brief justification, majority elimination
  - **CLI test harness:** Run full game in terminal, log all agent statements, verify game completes
- **Why first:** Establishes game logic correctness, validates Claude API integration patterns, proves multi-phase orchestration works
- **Estimated duration:** 18-22 hours
- **Risk level:** HIGH
  - **AI prompt engineering risk:** Mafia agents may not lie convincingly, Villagers may not deduce logically
  - **Conversation coherence risk:** Multi-turn discussion may feel robotic or random
  - **Context window risk:** Long games may exceed Claude's context limits
- **Success criteria:**
  1. Full game completes from start to win condition in CLI
  2. Mafia agents coordinate privately during Night phase and choose victim
  3. Discussion phase produces multi-turn conversation (even if simple)
  4. Voting phase results in player elimination
  5. Win conditions correctly trigger game end
  6. Database persists full game history

**Key validation:** If Discussion phase doesn't produce engaging strategic conversation, prompt engineering must be refined before building UI.

---

#### **Iteration 2: Advanced AI + Basic Web UI**
- **Vision:** Enhance AI conversation sophistication and build spectator web interface
- **Scope:** AI intelligence + frontend foundation
  - **Advanced Discussion orchestration:**
    - Statement-response threading (agents reply to specific prior statements)
    - Conversation history awareness (agents reference earlier statements/votes)
    - Accusation/defense mechanics (agents respond when accused)
    - Strategic reasoning chains (agents build cases over multiple turns)
  - **Enhanced prompt engineering:**
    - Mafia: Deflect suspicion, fake confusion, coordinate without obvious patterns
    - Villagers: Pattern recognition, behavioral analysis, voting history examination
  - **Memory optimization:**
    - Conversation summary for long games (truncate context, maintain key facts)
    - Agent "notes" system (extract key observations to preserve memory)
  - **Web UI foundation:**
    - Next.js 14 App Router project structure
    - Lobby screen: Player count slider (8-12), Start Game button
    - Live game screen: Phase indicator with countdown timer, player grid (names, alive/dead status, roles hidden)
    - Basic discussion feed: Scrolling log of agent statements
    - Game over screen: Winner announcement, role reveal
  - **API layer:**
    - tRPC setup with `game.create`, `game.getStatus`, `game.getDiscussionFeed` endpoints
    - Real-time updates via 2-second polling (SSE deferred to Iteration 3)
- **Dependencies:**
  - **Requires Iteration 1:** PersistentAgent class, game state machine, database schema, basic Claude API integration
  - **Imports:** Game engine types, database models, agent orchestration patterns
- **Estimated duration:** 16-20 hours
- **Risk level:** MEDIUM
  - **Conversation threading complexity:** Statement-response relationships may be hard to visualize
  - **Memory management:** Context pruning may lose critical game information
  - **UI/backend sync:** Polling-based updates may feel laggy during fast Discussion phases
- **Success criteria:**
  1. Discussion phase produces natural, strategic conversation with threading
  2. Agents reference previous statements and voting patterns accurately
  3. Mafia agents lie convincingly, Villagers detect suspicious behavior
  4. Web UI displays live game with phase progression
  5. Discussion feed shows all agent statements in order
  6. Game completes successfully through web interface

**Key validation:** Conversation must feel "fascinating to watch" per success criteria. If not, more prompt refinement needed.

---

#### **Iteration 3: Polish + Real-time Features (Enhancements)**
- **Vision:** Production-ready spectator experience with real-time updates and conversation threading visualization
- **Scope:** UI polish + performance optimization
  - **Advanced UI features:**
    - **Discussion feed enhancements:**
      - Visual thread connections (lines/indentation showing who responded to whom)
      - Highlight accusations (red), defenses (blue), key strategic statements (yellow)
      - Agent avatars/icons with personality indicators
    - **Vote tally visualization:** Real-time vote count display, visual breakdown during voting phase
    - **Phase transition animations:** Smooth countdown, dramatic death reveals, win condition animations
  - **Real-time updates:**
    - Server-Sent Events (SSE) for low-latency discussion feed updates
    - 2-second polling fallback for browsers without SSE support
    - Optimistic UI updates (show agent "is typing" indicator)
  - **Performance optimization:**
    - Lazy loading for long conversation histories
    - Database query optimization (indexed lookups for game events)
    - Agent response caching for repeated patterns
  - **UX polish:**
    - Responsive design for mobile/tablet spectators
    - Dark mode support
    - Game replay feature (load past games from database)
    - Keyboard shortcuts for game control
- **Dependencies:**
  - **Requires Iteration 2:** Web UI foundation, advanced AI orchestration, tRPC API layer
  - **Imports:** All UI components, game state hooks, discussion feed logic
- **Estimated duration:** 12-16 hours
- **Risk level:** LOW
  - **SSE implementation:** Straightforward in Next.js route handlers
  - **UI polish:** Mostly styling and animation, no complex logic
  - **Performance:** SQLite adequate for single-game load
- **Success criteria:**
  1. SSE provides sub-second latency for discussion updates
  2. Conversation threading is visually clear and easy to follow
  3. Accusations and defenses are immediately obvious in feed
  4. Vote tally updates in real-time as agents vote
  5. Game feels polished and professional
  6. Mobile/tablet experience is usable

**Key validation:** Spectator experience must be "fascinating to watch" - strategic moments must be visually highlighted.

---

## Dependency Graph

```
Foundation (Iteration 1) - 18-22 hours
├── Game State Machine (NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK)
├── Database Schema (Prisma + SQLite)
│   └── Tables: games, players, game_events, discussion_messages
├── Agent Persistence Layer
│   └── PersistentAgent class with conversation memory
├── Claude API Integration
│   └── System prompts for Mafia/Villager roles
├── Phase Orchestrators
│   ├── Night Phase (Mafia coordination, victim selection)
│   ├── Discussion Phase (simplified turn-taking)
│   └── Voting Phase (agent votes, elimination)
└── CLI Test Harness
    └── Full game playthrough validation
    ↓

Core Features (Iteration 2) - 16-20 hours
├── Advanced Discussion Orchestration
│   ├── Statement-response threading (uses PersistentAgent from Iteration 1)
│   ├── Conversation history awareness (queries discussion_messages table)
│   ├── Accusation/defense mechanics (enhanced prompts)
│   └── Memory optimization (context pruning strategy)
├── Enhanced Prompt Engineering
│   ├── Mafia deception tactics (extends system prompts from Iteration 1)
│   └── Villager deduction logic (extends system prompts from Iteration 1)
└── Web UI Foundation
    ├── Next.js 14 App Router setup
    ├── Lobby Screen (game.create API)
    ├── Live Game Screen (game.getStatus polling)
    ├── Basic Discussion Feed (game.getDiscussionFeed)
    └── Game Over Screen (reads final game state)
    ↓

Polish & Real-time (Iteration 3) - 12-16 hours
├── Advanced UI Features
│   ├── Thread visualization (uses discussion_messages.thread_parent_id from Iteration 1)
│   ├── Accusation highlighting (parses message content)
│   └── Vote tally display (uses game_events voting data)
├── Real-time Updates
│   ├── Server-Sent Events (replaces polling from Iteration 2)
│   └── Optimistic UI updates (client-side state management)
└── Performance & Polish
    ├── Lazy loading (UI optimization)
    ├── Database indexing (query optimization)
    └── Responsive design (Tailwind breakpoints)
```

**Critical Path:** Game Engine → AI Orchestration → Web UI (linear dependencies)

**Parallel Opportunities:**
- Iteration 2: UI development can start once API contracts are defined (tRPC types)
- Iteration 3: SSE implementation and UI polish can proceed independently

---

## Risk Assessment

### High Risks

#### **Risk 1: AI Conversation Quality**
- **Description:** Discussion phase agents may produce robotic, incoherent, or non-strategic conversation. Mafia agents may fail to lie convincingly or coordinate effectively. Villagers may make random accusations instead of logical deductions.
- **Impact:** Game is not "fascinating to watch" (core success criterion fails). Spectators lose interest due to poor AI behavior.
- **Mitigation:**
  1. **Extensive prompt engineering in Iteration 1:** Test multiple system prompt variations with example conversations
  2. **Example-driven prompts:** Provide few-shot examples of strong Mafia deception and Villager reasoning
  3. **Iterative refinement:** Use CLI test harness to rapidly test 10+ full games, identify weak patterns
  4. **Memory architecture:** Ensure agents have full context (previous statements, votes, deaths) in each turn
  5. **Strategic guidance:** Embed Mafia strategy guides (deflect, fake confusion, blend in) and Villager tactics (pattern analysis, voting history) in system prompts
- **Recommendation:** Prioritize in Iteration 1. Do NOT proceed to web UI if Discussion phase is not compelling in CLI. Budget 8-10 hours for prompt engineering experimentation.

#### **Risk 2: Context Window Limits**
- **Description:** Long games (8+ rounds) with 10 agents may generate hundreds of messages, exceeding Claude's 200K token context window. Agents lose memory of early game events.
- **Impact:** Agents make contradictory statements, forget previous accusations, lose strategic continuity. Game feels broken.
- **Mitigation:**
  1. **Conversation summarization:** After each round, generate summary of key events (deaths, accusations, votes) and prepend to agent context
  2. **Selective memory:** Include full last 2 rounds + summaries of earlier rounds
  3. **Agent notes system:** After each turn, agent extracts key observations to preserve (e.g., "Player 3 voted for Player 5 twice - suspicious")
  4. **Context monitoring:** Log token usage per agent turn, alert when approaching 80% of limit
  5. **Graceful degradation:** If context limit hit, transition to summary mode with warning
- **Recommendation:** Implement in Iteration 1 as part of PersistentAgent class. Test with artificially long games (15+ rounds).

#### **Risk 3: API Latency and Cost**
- **Description:** Discussion phase with 10 agents, 5 turns each = 50 API calls. At 2-3 seconds per call, Discussion phase takes 2-3 minutes minimum. At $0.015/1K input tokens, long games may cost $1-2 each.
- **Impact:** Spectators experience slow gameplay. Development/testing costs add up. Demo games are expensive.
- **Mitigation:**
  1. **Turn concurrency (limited):** During Night phase, all Mafia agents can respond in parallel. During Discussion, only sequential for coherence.
  2. **Response caching:** If agent has no new information, reuse prior reasoning pattern (e.g., "I'm still suspicious of Player 3")
  3. **Shorter context:** Aggressive pruning of conversation history reduces input tokens
  4. **Development mode:** Use cached responses for testing UI (mock API calls)
  5. **Cost monitoring:** Log API usage per game, set budget alerts
- **Recommendation:** Accept 3-5 minute Discussion phases as reasonable (matches human Mafia game pacing). Implement caching in Iteration 2.

### Medium Risks

#### **Risk 4: Conversation Threading Complexity**
- **Description:** Tracking statement-response relationships (who replied to whom) requires additional database schema (thread_parent_id) and UI visualization logic. May be complex to implement and display clearly.
- **Impact:** Discussion feed is hard to follow. Spectators miss strategic back-and-forth exchanges.
- **Mitigation:**
  1. **Database design:** `discussion_messages.thread_parent_id` references prior message (nullable)
  2. **UI pattern:** Indentation or visual lines (like email threads) to show responses
  3. **Simplified Iteration 1:** No threading initially, just chronological feed. Add threading in Iteration 2.
  4. **Third-party components:** Consider using existing thread visualization libraries (e.g., react-nested-thread)
- **Recommendation:** Defer to Iteration 2. Validate core AI conversation quality first.

#### **Risk 5: Real-time Synchronization**
- **Description:** Multiple spectators watching same game need synchronized updates. SSE connections may drop, polling may lag, UI state may desync from backend.
- **Impact:** Spectators see different game states. Discussion feed shows messages out of order.
- **Mitigation:**
  1. **Source of truth:** Database is authoritative. UI always queries backend for game state.
  2. **SSE reconnection:** Auto-reconnect on connection drop, fetch missed events
  3. **Polling fallback:** 2-second polling ensures eventual consistency
  4. **Message ordering:** discussion_messages.timestamp + turn_number ensure correct order
  5. **Optimistic UI:** Show "agent is thinking" immediately, fetch actual response when ready
- **Recommendation:** Use polling in Iteration 2, upgrade to SSE in Iteration 3. Test with multiple browser windows.

### Low Risks

#### **Risk 6: Database Performance**
- **Description:** SQLite may struggle with high-frequency writes during Discussion phase (10 agents x 5 turns = 50 message inserts in 3 minutes).
- **Impact:** API latency increases, UI updates lag.
- **Mitigation:** SQLite handles 50 writes/3min easily. Prisma connection pooling. Indexed queries on game_id + timestamp.
- **Recommendation:** Monitor in Iteration 2, unlikely to be bottleneck for single-game load.

#### **Risk 7: Deployment Complexity**
- **Description:** Next.js deployment with Prisma, SQLite, and SSE requires correct configuration (database file persistence, long-running connections).
- **Impact:** Production deployment fails or loses game data on restart.
- **Mitigation:** Vercel deployment (standard for Next.js), persistent SQLite volume, SSE supported in Next.js 14 route handlers.
- **Recommendation:** Standard deployment, document in Iteration 3. Use Vercel's Postgres for production (optional upgrade from SQLite).

---

## Integration Considerations

### Cross-Phase Integration Points

#### **1. Agent System Prompts (spans all iterations)**
- **What:** System prompt templates for Mafia vs Villager roles, personality traits, strategic objectives
- **Why spans iterations:** Iteration 1 establishes basic prompts, Iteration 2 enhances with advanced tactics, Iteration 3 may add meta-strategies based on testing
- **Consistency needed:** Prompt versioning, A/B testing framework, centralized prompt repository
- **Recommendation:** Create `prompts/` directory in Iteration 1, export as TypeScript constants

#### **2. Game State Types (spans all iterations)**
- **What:** TypeScript interfaces for GameState, Player, Agent, GameEvent, DiscussionMessage
- **Why spans iterations:** Backend (Iteration 1), frontend (Iteration 2), and real-time updates (Iteration 3) all use same types
- **Consistency needed:** Single source of truth, Prisma schema generates types, tRPC shares types automatically
- **Recommendation:** `types/game.ts` in Iteration 1, import everywhere via tRPC

#### **3. Discussion Feed Data Format (spans Iterations 2-3)**
- **What:** Structure of discussion messages sent to frontend (message content, threading metadata, speaker info, highlights)
- **Why spans iterations:** Iteration 2 displays basic feed, Iteration 3 adds threading visualization and highlights
- **Consistency needed:** API contract must support future enhancements without breaking changes
- **Recommendation:** Design `DiscussionMessage` type in Iteration 2 with optional fields for threading/highlights (added in Iteration 3)

### Potential Integration Challenges

#### **Challenge 1: Agent State Persistence**
- **Description:** PersistentAgent class (Iteration 1) holds conversation history in memory. If server restarts mid-game, agents lose context. Iteration 2's web UI assumes agents persist across page refreshes.
- **Why it matters:** Games may crash mid-Discussion phase, losing strategic continuity.
- **Solution:**
  - Option A: Store agent conversation history in database (new table: agent_memories)
  - Option B: Rebuild agent context from discussion_messages table on restart
  - **Recommendation:** Option B (simpler, uses existing schema). Implement in Iteration 1.

#### **Challenge 2: Real-time UI State**
- **Description:** Iteration 2 uses polling (2s intervals), Iteration 3 upgrades to SSE. Frontend state management must handle both without rewrite.
- **Why it matters:** SSE upgrade may break polling-based UI components.
- **Solution:** Abstract real-time updates behind custom hook (`useGameUpdates`) that supports both polling and SSE internally. Switch implementation without changing components.
- **Recommendation:** Design abstraction in Iteration 2, swap implementation in Iteration 3.

#### **Challenge 3: Conversation Threading Retroactive**
- **Description:** Iteration 1 doesn't track thread_parent_id, Iteration 2 adds it. Existing games in database won't have threading data.
- **Why it matters:** May need database migration or special handling for pre-threading games.
- **Solution:** Make thread_parent_id nullable, UI gracefully degrades to chronological display if null.
- **Recommendation:** Include thread_parent_id in Iteration 1 schema (even if unused), populate in Iteration 2.

---

## Recommendations for Master Plan

### 1. **Validate AI Conversation Quality in Iteration 1 Before UI Investment**
   - The Discussion phase is the make-or-break feature. If agents don't produce compelling strategic conversation, the web UI is meaningless.
   - **Action:** Budget 8-10 hours in Iteration 1 specifically for prompt engineering experimentation. Run 10+ full CLI games, refine prompts until conversation is "fascinating."
   - **Gate:** Do NOT proceed to Iteration 2 until Iteration 1 games consistently show strategic reasoning, convincing deception, and logical deduction.

### 2. **Start with 3-Iteration Breakdown, Consider Optional 4th Iteration**
   - Current plan: 3 iterations (Foundation, Core+UI, Polish) totaling 46-58 hours
   - If Iteration 1 reveals conversation quality challenges, consider adding Iteration 1.5: "Advanced Prompt Engineering" (8-12 hours) before building UI
   - **Action:** Master planner should prepare contingency iteration for prompt refinement

### 3. **Treat Claude API as Standard API, Not Agent SDK**
   - Vision mentions "Claude Agent SDK" but no such SDK exists. Must use standard Claude Messages API with custom agent orchestration.
   - **Action:** Correct terminology in master plan. Budget time for building PersistentAgent wrapper class.
   - **Research task:** Builders should review Claude API documentation (docs.anthropic.com/en/api) before starting Iteration 1

### 4. **Prioritize Memory Architecture**
   - Agent memory (recalling previous statements, votes, behavior patterns) is critical for strategic gameplay.
   - **Action:** PersistentAgent class (Iteration 1) must include conversation history, game event timeline, and agent notes system.
   - **Testing:** Validate memory accuracy in CLI by checking if agents reference past events correctly

### 5. **Consider Cost and Latency**
   - Full Discussion phase = 50+ API calls at $0.015/1K tokens input, ~2-3 minutes total latency
   - **Action:** Implement token usage logging and cost tracking in Iteration 1. Set budget alert at $50/month for testing.
   - **Optimization:** Aggressive context pruning, response caching for repeated patterns

### 6. **Database Schema: Include Future Fields Now**
   - To avoid migrations, add `discussion_messages.thread_parent_id` in Iteration 1 even if unused until Iteration 2
   - **Action:** Full schema design in Iteration 1 must anticipate Iteration 2-3 needs

### 7. **Real-time Strategy: Abstract Early**
   - Switching from polling (Iteration 2) to SSE (Iteration 3) shouldn't require UI rewrite
   - **Action:** Create `useGameUpdates` custom hook in Iteration 2 that abstracts data fetching. Change implementation in Iteration 3.

---

## Technology Recommendations

### Greenfield Recommendations

#### **Suggested Stack (Confirmed from Vision)**
1. **Framework:** Next.js 14 App Router
   - **Rationale:** SSR for lobby, client components for game screen, API routes for engine, SSE support
   - **Setup:** `npx create-next-app@latest --typescript --tailwind --app`

2. **Database:** Prisma ORM + SQLite (Stage 1) / PostgreSQL (Stage 2)
   - **Rationale:** Type-safe queries, schema migrations, SQLite simplifies deployment for spectator-only mode
   - **Setup:** `npm install prisma @prisma/client`, `npx prisma init --datasource-provider sqlite`
   - **Upgrade path:** Swap to PostgreSQL for Stage 2 (human players, concurrent games) with zero code changes

3. **API Layer:** tRPC
   - **Rationale:** End-to-end type safety, automatic API client generation, integrates with Next.js App Router
   - **Setup:** `npm install @trpc/server @trpc/client @trpc/react-query @tanstack/react-query`
   - **Benefit:** Frontend automatically gets TypeScript types from backend procedures

4. **AI:** Claude Messages API (via @anthropic-ai/sdk)
   - **Rationale:** Official SDK, supports streaming, handles retries
   - **Setup:** `npm install @anthropic-ai/sdk`
   - **Key usage:**
     ```typescript
     import Anthropic from '@anthropic-ai/sdk';
     const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
     const message = await anthropic.messages.create({
       model: 'claude-3-5-sonnet-20241022',
       max_tokens: 1024,
       system: agentSystemPrompt,
       messages: conversationHistory
     });
     ```

5. **Styling:** Tailwind CSS
   - **Rationale:** Rapid prototyping, component-based, responsive utilities
   - **Setup:** Included in Next.js create-next-app

6. **State Management:** Zustand (optional, for complex client state)
   - **Rationale:** Lightweight, TypeScript-first, avoids React Context boilerplate
   - **Use case:** Game screen state (current phase, player list, discussion feed cache)
   - **Setup:** `npm install zustand`

#### **Project Structure Recommendation**
```
ai-mafia/
├── prisma/
│   └── schema.prisma          # Database schema (games, players, game_events, discussion_messages)
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── page.tsx           # Lobby screen
│   │   ├── game/[id]/page.tsx # Live game screen
│   │   └── api/
│   │       ├── trpc/[trpc].ts # tRPC handler
│   │       └── game/events/   # SSE route handler (Iteration 3)
│   ├── server/
│   │   ├── game-engine/       # State machine, orchestrators
│   │   │   ├── GameEngine.ts
│   │   │   ├── phases/
│   │   │   │   ├── NightPhase.ts
│   │   │   │   ├── DiscussionPhase.ts
│   │   │   │   └── VotingPhase.ts
│   │   │   └── WinConditionChecker.ts
│   │   ├── ai/                # Agent orchestration
│   │   │   ├── PersistentAgent.ts
│   │   │   ├── AgentManager.ts
│   │   │   ├── ContextBuilder.ts
│   │   │   └── prompts/
│   │   │       ├── mafia.ts
│   │   │       └── villager.ts
│   │   ├── trpc/              # API layer
│   │   │   ├── routers/
│   │   │   │   └── game.ts    # game.create, game.getStatus, etc.
│   │   │   └── context.ts
│   │   └── db.ts              # Prisma client
│   ├── types/
│   │   └── game.ts            # Shared types (GameState, Player, Agent)
│   └── lib/
│       └── utils.ts           # Helpers
├── .env.local                 # ANTHROPIC_API_KEY
└── package.json
```

#### **Key Dependencies**
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "@prisma/client": "^5.0.0",
    "@trpc/server": "^11.0.0",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@tanstack/react-query": "^5.0.0",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "zod": "^3.22.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "prisma": "^5.0.0",
    "typescript": "^5.2.0",
    "tailwindcss": "^3.3.0"
  }
}
```

---

## Notes & Observations

### Observation 1: "Agent SDK" Terminology Correction
The vision document repeatedly mentions "Claude Agent SDK" but this does not exist as a separate product from Anthropic. The architecture must use the **Claude Messages API** with custom agent orchestration logic. This increases complexity as we must build the agent persistence, memory, and conversation management ourselves.

### Observation 2: Discussion Phase is 80% of Complexity
The Discussion phase orchestration (multi-turn conversation, threading, memory, strategic behavior) represents approximately 80% of the technical risk and complexity. If this works well, the rest of the game is straightforward state management and UI work.

### Observation 3: Testing Strategy Critical
Without human playtesters initially (spectator-only Stage 1), we rely entirely on the quality of AI agents to validate gameplay. Extensive automated testing (running 20-30 full games in CLI) is essential in Iteration 1 to ensure conversation quality meets the "fascinating to watch" criterion.

### Observation 4: Stage 2 Implications
Vision explicitly defers human players to Stage 2. This means:
- No authentication system needed in Stage 1
- No human input validation
- No turn waiting for human responses
- Architecture must be extensible: Design with interfaces (PlayerInterface, HumanPlayer, AIPlayer) to support future human integration

### Observation 5: Cost-Conscious Development
At $0.015/1K input tokens and ~500-1000 tokens per agent turn, a full game (50-100 agent turns) costs approximately $0.75-$1.50. Running 50 test games during development = $37.50-$75. Budget $100-150 for API costs during development.

### Observation 6: Potential Optimization - Batch API
For Night phase where all Mafia agents respond to same context (choosing victim), consider using Claude's Batch API (50% cost reduction, asynchronous processing). Requires careful implementation but could significantly reduce costs.

---

*Exploration completed: 2025-10-12T18:30:00Z*
*This report informs master planning decisions for AI Mafia Spectator Mode (plan-1)*
