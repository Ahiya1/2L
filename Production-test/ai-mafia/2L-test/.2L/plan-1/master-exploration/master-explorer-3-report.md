# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points

## Vision Summary
Build an AI Mafia game where 8-12 autonomous AI agents play Mafia while spectators watch live. The game emphasizes natural multi-turn conversations during a 3-5 minute Discussion phase where agents debate, accuse, defend, and strategize based on memory of previous interactions.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 18 must-have features
  - 5 game engine features (phase management, state machine, turn orchestration, vote tallying, win detection)
  - 4 AI layer features (agent initialization, conversation orchestration, memory management, role-based prompting)
  - 5 UI features (lobby setup, live game viewer, discussion feed, phase indicators, game over screen)
  - 4 data/integration features (database schema, SSE real-time updates, event logging, conversation threading)
- **User stories/acceptance criteria:** 7 critical success criteria
- **Estimated total work:** 18-24 hours

### Complexity Rating
**Overall Complexity: VERY COMPLEX**

**Rationale:**
- **Multi-agent orchestration**: 8-12 concurrent AI agents with persistent memory and turn-based conversation management
- **Real-time integration**: SSE for live updates, synchronized phase timers, coordinated agent turns across frontend/backend
- **Conversation threading**: Response chains, statement-reply mapping, conversational context maintenance across 3-5 minute discussions
- **Dual communication modes**: Public discussion (all agents) vs private Mafia coordination (subset coordination)
- **Memory requirements**: Each agent must recall all previous statements, votes, and events to build logical cases
- **Natural language quality bar**: Success criteria demands "fascinating to watch" and "natural conversation flow" - high quality threshold

---

## Spectator Experience Analysis

### 1. Primary User Journey: Watching a Live Game

**Critical User Flow:**
```
Lobby Setup (30 sec)
  → Game Start
  → Night Phase (spectator sees "Mafia coordinating..." - 45s)
  → Morning Announcement (death reveal - 10s)
  → Discussion Phase (MAIN EXPERIENCE - 3-5 min)
    - Live scrolling conversation feed
    - Multiple agents speaking in turns
    - Visual threading of accusations/defenses
    - Strategy emergence visibility
  → Voting Phase (agents vote with reasoning - 45s)
  → Elimination announcement
  → Win check
  → Loop or Game Over
```

**Discussion Phase as Primary UI (THE CRITICAL 3-5 MINUTES):**

The success of this game lives or dies on the Discussion phase spectator experience. This is where:
- Spectators spend 70%+ of their time
- Strategic gameplay emerges
- AI agents demonstrate intelligence
- Entertainment value is delivered

**Required UI Elements for Discussion Phase:**
1. **Live conversation feed** (scrolling, auto-scroll to latest)
   - Clear speaker identification (name, alive/dead status)
   - Message content with natural formatting
   - Timestamp or turn number
   - Visual distinction for accusations vs defenses vs questions vs analyses

2. **Conversation threading visualization**
   - When Agent B responds to Agent A's accusation, show the connection
   - Enable spectators to follow logical chains: "X accused Y → Y defended → Z questioned Y's defense"
   - Color coding or indentation for thread depth

3. **Strategic pattern highlights**
   - Accusations: Red/warning color with "Agent X accuses Agent Y"
   - Defenses: Blue/info color with "Agent Y defends"
   - Questions: Yellow/attention color
   - Alliance signals: Green/positive color

4. **Turn indicator**
   - "Now speaking: Agent 5 (Sarah)"
   - "Waiting: 3 agents want to respond"
   - Progress through discussion time (e.g., "2:15 remaining")

### 2. Secondary UI Requirements

**Phase Indicator with Timer:**
- Large, always-visible phase banner (NIGHT / DAY / DISCUSSION / VOTING / GAME OVER)
- Countdown timer synchronized across all spectators
- Visual cues for phase transitions (animations, sounds optional but helpful)

**Player Grid/Status Panel:**
- 8-12 player cards showing:
  - Agent name
  - Alive/Dead status (clear visual difference - grayscale for dead?)
  - Role HIDDEN until game over
  - Voting history (who voted for whom) - optional enhancement
- Persistent sidebar or top panel
- Updates in real-time as eliminations occur

**Vote Tally (Voting Phase):**
- Live vote counter: "Agent 3 (Tom): 4 votes"
- Show which agents voted for whom
- Highlight majority threshold
- Brief justifications from each agent for their vote

**Game Over Screen:**
- Winner announcement (Mafia wins / Villagers win)
- Full role reveal for all agents
- Option to view complete game transcript
- Replay or "New Game" button

### 3. UX Quality Requirements for "Fascinating to Watch"

**What makes it fascinating:**
- **Visible strategy emergence**: Spectators can SEE agents building cases, forming theories, detecting lies
- **Narrative tension**: Close votes, dramatic accusations, clever defenses
- **Character consistency**: Each agent maintains personality across game
- **Logical coherence**: Agents reference specific past events, votes, statements

**UX implementations to support this:**
- **Highlight callbacks**: When Agent X says "Earlier, Agent Y claimed...", visually link to that previous statement
- **Pattern detection UI**: Show when multiple agents target the same player (pile-on effect)
- **Mafia coordination hints**: During Night phase, show "Mafia coordinating..." without revealing content (builds suspense)
- **Reaction shots**: Brief reactions from all alive agents after Morning Announcement death reveal

### 4. Responsive Design Requirements

**Primary viewport: Desktop (laptop/monitor)**
- Discussion feed takes 60-70% of screen width
- Player grid: 20-30% sidebar
- Phase indicator: top banner

**Mobile considerations (nice-to-have for Stage 1):**
- Stack vertically: phase → players → discussion
- Collapsible player grid
- Tap to expand conversation threads

---

## Integration Points Analysis

### 1. Game Engine ↔ AI Agents Integration

**Critical Integration: Discussion Orchestrator ↔ Individual Agents**

**Data flow for a single discussion turn:**
```
1. Discussion Orchestrator (backend)
   - Determines next speaker (turn scheduling algorithm)
   - Compiles conversation context for that agent

2. → Agent Context Payload
   {
     agentId: "agent-5",
     role: "VILLAGER",
     conversationHistory: [last 20 messages],
     currentPhase: "DISCUSSION",
     timeRemaining: "3:22",
     livingPlayers: ["agent-1", "agent-3", "agent-5"...],
     lastSpeaker: "agent-3",
     lastStatement: "I think Agent 7 is suspicious because..."
   }

3. → Claude Agent SDK (Agent 5 instance)
   - Receives context
   - Generates response based on role prompts + memory + current discussion

4. ← Agent Response
   {
     message: "That's interesting Agent 3, but I disagree because Agent 7 voted with the majority last round, which is typical Villager behavior. I'm more suspicious of Agent 2 who stayed quiet.",
     threadParent: "msg-789", // replying to Agent 3's statement
     accusationTarget: "agent-2" | null,
     confidence: 0.7
   }

5. Discussion Orchestrator
   - Stores message in database
   - Broadcasts via SSE to all spectators
   - Updates conversation history
   - Determines next speaker
   - Loop until discussion time expires
```

**Integration Complexity: VERY HIGH**

**Challenges:**
- **Turn scheduling algorithm**: Who speaks next? Random? Round-robin? Priority to accused agents?
- **Context compilation**: How much history to include? Full game or last N messages?
- **Response threading**: How to ensure agents respond to relevant statements vs random rambling?
- **Time management**: What if agent takes 15 seconds to respond? Timeout handling?
- **Conversation coherence**: How to prevent agents from talking past each other?

**Integration Requirements:**
- Agent SDK must support:
  - Persistent agent instances (don't recreate each turn)
  - Memory injection (conversation history)
  - Tool use for structured responses (vote, accuse, defend actions)
  - Timeout handling (max 10 seconds per turn?)
- Discussion orchestrator must:
  - Queue agent responses
  - Handle concurrent agent processing (prepare next agent while current speaks)
  - Enforce turn limits (max 2-3 turns per agent in 5-minute window)
  - Allow interruptions (if agent is accused, they get priority response slot)

### 2. Mafia Private Coordination (Night Phase)

**Integration: Subset Agent Communication**

**Data flow for Mafia night coordination:**
```
1. Game Engine: NIGHT phase begins
   - Identifies Mafia agents: ["agent-2", "agent-7", "agent-11"]

2. Mafia Private Discussion Orchestrator
   - Similar to main discussion but:
     - Only Mafia agents participate
     - Spectators see "Mafia coordinating..." (no content)
     - Goal: Choose victim by consensus

3. → Each Mafia Agent Context
   {
     role: "MAFIA",
     mafiaTeammates: ["agent-2", "agent-7", "agent-11"],
     conversationHistory: [previous Mafia coordination messages],
     livingVillagers: [...],
     objective: "Choose victim for tonight"
   }

4. Multi-turn Mafia conversation (30-45 seconds)
   - Agent 2: "I suggest we eliminate Agent 5, they've been very analytical"
   - Agent 7: "Agreed, Agent 5 is dangerous. Agent 11, thoughts?"
   - Agent 11: "Makes sense. Let's vote Agent 5."

5. Consensus detection algorithm
   - Extract vote targets from Mafia statements
   - When majority agrees → lock victim
   - Store decision in game state
```

**Integration Complexity: HIGH**

**Challenges:**
- **Dual orchestrators**: Need separate discussion orchestrator for Mafia vs public
- **Privacy enforcement**: Mafia messages never exposed in public discussion history
- **Consensus detection**: Parse natural language for vote targets ("I suggest Agent X" → vote)
- **Time pressure**: 30-45 seconds for consensus is tight - need fast agent responses

### 3. Backend ↔ Frontend Real-time Integration

**Critical Integration: SSE for Live Discussion Feed**

**Data flow for real-time updates:**
```
BACKEND:
1. Game Engine emits events:
   - NEW_MESSAGE: agent spoke
   - PHASE_CHANGE: night → day
   - VOTE_CAST: agent voted
   - PLAYER_ELIMINATED: someone died
   - GAME_OVER: win condition met

2. SSE Broadcaster
   - Maintains open connections to all spectator clients
   - Pushes events as Server-Sent Events

FRONTEND:
3. EventSource connection to /api/games/{gameId}/events

4. Event handlers:
   - onMessage: append to discussion feed, auto-scroll
   - onPhaseChange: update phase banner, reset timer
   - onVoteCast: update vote tally
   - onElimination: gray out player card
   - onGameOver: show winner screen
```

**Integration Complexity: MEDIUM-HIGH**

**Challenges:**
- **Connection reliability**: What if SSE disconnects? Reconnect logic + state catchup
- **Fallback mechanism**: 2-second polling if SSE not supported
- **State synchronization**: New spectators joining mid-game need full state snapshot
- **Performance**: Broadcasting to multiple spectators without backend bottleneck

**Integration Requirements:**
- Backend:
  - Event queue/bus for game events
  - SSE endpoint with game state snapshot on connect
  - Heartbeat/keepalive to detect disconnections
- Frontend:
  - EventSource client with auto-reconnect
  - State management (React Context or Zustand) to merge SSE events
  - Optimistic UI updates (assume message will arrive, rollback if timeout)

### 4. AI Agents ↔ Database (Conversation History & Memory)

**Critical Integration: Agent Memory Persistence**

**Data flow for agent memory:**
```
1. Agent needs to speak in Discussion phase

2. Backend queries database:
   - Fetch all discussion_messages for this game
   - Fetch all game_events (votes, deaths)
   - Compile into chronological context

3. → Agent Context with full history
   {
     allMessages: [
       {speaker: "agent-3", message: "...", turn: 5},
       {speaker: "agent-7", message: "...", turn: 6}
     ],
     voteHistory: [
       {round: 1, voter: "agent-3", target: "agent-8"}
     ],
     deathHistory: [
       {round: 1, victim: "agent-8", cause: "VOTED"}
     ]
   }

4. Agent uses memory to build response:
   - "Agent 3 voted for Agent 8 last round, but now they're quiet about Agent 2..."
   - References specific past statements
   - Detects pattern changes
```

**Integration Complexity: MEDIUM**

**Challenges:**
- **Memory scale**: 5-minute discussion = 50+ messages. How much to include in agent context?
- **Query performance**: Fetching full conversation history on every turn could be slow
- **Context window limits**: Claude has token limits. Need to summarize if conversation too long?
- **Relevance filtering**: Should agents see ALL messages or only last N + messages directed at them?

**Integration Requirements:**
- Database schema:
  - `discussion_messages`: full text, speaker, timestamp, thread_parent_id, accusation_target
  - `game_events`: type, data (JSON), timestamp
  - Indexes on game_id, timestamp for fast chronological queries
- Agent context compiler:
  - Fetch recent history (last 30 messages?)
  - Include all messages where agent was mentioned/accused
  - Include agent's own previous statements
  - Summarize older messages if needed
- Memory injection:
  - Format as conversation transcript for Agent SDK
  - Include metadata (who's alive, who's dead, current votes)

---

## Real-time Requirements

### 1. Server-Sent Events (SSE) for Live Discussion Feed

**SSE Event Types:**

```typescript
type GameEvent =
  | { type: 'MESSAGE', data: {
      messageId: string,
      speaker: string,
      content: string,
      timestamp: string,
      threadParent?: string,
      accusationTarget?: string
    }}
  | { type: 'PHASE_CHANGE', data: {
      newPhase: 'NIGHT' | 'DAY' | 'DISCUSSION' | 'VOTING' | 'GAME_OVER',
      duration: number,
      context?: string // e.g., "Agent 5 was eliminated"
    }}
  | { type: 'VOTE_CAST', data: {
      voter: string,
      target: string,
      justification: string
    }}
  | { type: 'PLAYER_ELIMINATED', data: {
      playerId: string,
      cause: 'VOTED' | 'MAFIA_KILL',
      round: number
    }}
  | { type: 'GAME_OVER', data: {
      winner: 'MAFIA' | 'VILLAGERS',
      finalRoles: Record<string, 'MAFIA' | 'VILLAGER'>
    }}
  | { type: 'TIMER_UPDATE', data: {
      remaining: number // seconds
    }}
```

**Implementation Requirements:**
- Next.js API route: `GET /api/games/[gameId]/events`
- Keep-alive heartbeat every 30 seconds
- On connection: Send SNAPSHOT event with full current game state
- On disconnect: Client auto-reconnects within 3 seconds
- Fallback: If SSE fails, switch to 2-second polling to `GET /api/games/[gameId]/state`

**Real-time Performance Targets:**
- Message latency: <500ms from agent response to spectator UI
- Phase transition latency: <200ms
- Connection recovery: <3 seconds after disconnect

### 2. Phase Timer Synchronization

**Challenge:** All spectators must see the same countdown timer

**Implementation:**
```typescript
// Backend: Store absolute end time, not duration
{
  currentPhase: 'DISCUSSION',
  phaseStartTime: '2025-10-12T18:30:00Z',
  phaseEndTime: '2025-10-12T18:35:00Z' // 5 minutes later
}

// Frontend: Calculate remaining time client-side
const remaining = phaseEndTime.getTime() - Date.now()

// Update every second
setInterval(() => {
  const remaining = phaseEndTime.getTime() - Date.now()
  setTimerDisplay(formatDuration(remaining))
}, 1000)

// On PHASE_CHANGE event: Reset timer with new phaseEndTime
```

**Avoids drift:** Client calculates against server-provided absolute time, so even if SSE has slight delay, timer stays synchronized.

### 3. Agent Turn Management (Discussion Orchestration)

**Challenge:** Coordinate 8-12 agents speaking in turns without chaos

**Turn Scheduling Algorithm Options:**

**Option A: Round-Robin**
- Each agent gets equal turns
- Predictable but may feel robotic
- Agents speak even if they have nothing to add

**Option B: Priority Queue**
- Agents "raise hand" to speak (indicate they want to respond)
- Priority factors:
  1. Accused agents get immediate response slot
  2. Agents who haven't spoken recently
  3. Agents responding to specific statements (threading)
- More natural flow but complex to implement

**Option C: Hybrid (RECOMMENDED)**
- First round: Round-robin (everyone introduces position)
- Subsequent rounds: Priority queue for responses
- Final round: Round-robin for closing statements

**Implementation Requirements:**
- Backend maintains turn queue:
  ```typescript
  {
    currentSpeaker: 'agent-5',
    waitingQueue: ['agent-3', 'agent-7'], // priority queue
    turnHistory: ['agent-1', 'agent-2', ...],
    turnLimits: { 'agent-1': 2, 'agent-2': 3, ... } // max turns per agent
  }
  ```
- When agent finishes speaking:
  1. Store message in database
  2. Broadcast via SSE
  3. Update turn queue
  4. Select next speaker
  5. Prepare context for next agent
  6. Invoke next agent (async)

**Time Limits:**
- Max 10 seconds per agent turn (timeout if agent doesn't respond)
- Max 3 turns per agent in 5-minute discussion
- If timer expires mid-turn, finish current turn then move to voting

### 4. Vote Tally Updates (Voting Phase)

**Real-time vote display:**

```
VOTING PHASE (45 seconds remaining)

Agent 1 votes for Agent 3: "They were too defensive"
Agent 2 votes for Agent 7: "Suspicious voting pattern"
Agent 3 votes for Agent 2: "Self-defense vote"
...

Current Tally:
Agent 3: ||||| (5 votes) ← MAJORITY
Agent 7: || (2 votes)
Agent 2: | (1 vote)
```

**Implementation:**
- Each vote is a VOTE_CAST SSE event
- Frontend maintains vote tally map
- Highlight majority threshold (e.g., 5 out of 9 votes = elimination)
- When voting phase ends:
  1. Backend determines elimination target
  2. Broadcast PLAYER_ELIMINATED event
  3. Update player grid
  4. Move to win check phase

---

## Success Criteria Mapping

### 1. "Fascinating to Watch"

**How to achieve this:**

**UI-level contributions:**
- **Conversation threading visualization**: Show logical chains of reasoning
  - Agent A accuses Agent B → Agent B defends → Agent C questions defense → Agent A rebuts
  - Visual lines or indentation connecting related statements
- **Strategic pattern highlights**: Color-code accusations (red), defenses (blue), analyses (yellow)
- **Progress indicators**: Show discussion is building toward conclusion
  - "5 agents have spoken, 3 waiting"
  - "2 clear factions emerging: Team Anti-Agent-3 vs Team Defend-Agent-3"
- **Tension builders**:
  - Close vote tallies
  - Countdown timer adding urgency
  - Dramatic phase transitions (fade to black for Night phase)

**Backend/AI contributions (not my focus but relevant to UX):**
- High-quality agent responses that actually engage with prior statements
- Visible strategic thinking: "I'm voting Agent X because they did Y and Z"
- Plot twists: Mafia members defending each other subtly
- Pattern emergence: Villagers slowly converging on correct Mafia suspects

**Measurement:**
- Post-game survey: "Did you feel engaged watching?" (1-5 scale)
- Spectator retention: % of spectators who watch full game vs drop off
- Replay value: Do people want to watch another game?

### 2. "Natural Conversation Flow"

**How to achieve this:**

**UI-level contributions:**
- **Smooth scrolling**: Discussion feed auto-scrolls as new messages arrive
- **Pacing indicators**: Show who's speaking now, who's next
- **Context preservation**: Keep last 5 messages visible while new ones arrive
- **Thread continuity**: When Agent B responds to Agent A, show Agent A's original message nearby (popup, highlight, or inline quote)

**Backend/orchestration contributions:**
- **Turn management**: Not too fast (agents need thinking time), not too slow (spectators get bored)
  - Target: 1 message every 5-10 seconds (natural conversation pace)
- **Response relevance**: Agents actually respond to previous statements vs monologuing
  - Use thread_parent_id to link responses
  - Agent context includes "Last statement was from Agent X saying Y"
- **Interruptions allowed**: If Agent B is accused, they get priority to defend
  - Feels natural like real conversation

**Anti-patterns to avoid:**
- Robotic round-robin where agents ignore each other's statements
- Simultaneous messages (breaks turn-based flow)
- Long pauses with no activity (feels dead)
- Agents repeating themselves without adding new info

**Measurement:**
- Manual review: Do agent messages reference prior statements?
- Threading usage: % of messages that have thread_parent_id set
- Conversation coherence score (human evaluation)

### 3. "Actual Strategy Emerges"

**How to achieve this:**

**UI-level contributions:**
- **Make strategy VISIBLE to spectators:**
  - Highlight when Agent X references Agent Y's voting history
  - Show pattern recognition: "Agent 3 has accused only Villagers so far" (game over reveal proves it)
  - Display agent reasoning: Not just "I vote Agent 5" but "I vote Agent 5 BECAUSE..."
- **Track strategic metrics:**
  - Who's been accused most? (potential Mafia target OR actual Mafia)
  - Who's staying quiet? (hiding OR inactive)
  - Voting blocs: Which agents consistently vote together?
- **Post-game analysis:**
  - Show timeline of when Villagers identified real Mafia
  - Highlight clever Mafia lies that worked
  - Show turning points (e.g., "Agent 3's accusation in Round 2 changed the game")

**Backend/AI contributions:**
- Agent prompts that encourage strategic thinking:
  - Mafia: "Deflect suspicion, build trust, protect teammates subtly"
  - Villagers: "Analyze voting patterns, detect inconsistencies, build cases"
- Memory enables strategy: Agents recall "Agent 7 voted for Agent 4 who was innocent, suspicious!"
- Strategy diversity: Not all Villagers use same approach (some aggressive, some analytical)

**Measurement:**
- Win rate balance: If Mafia wins 90% → Villagers not strategic enough
- Strategy variety: Do agents use different approaches each game?
- Emergent behavior: Do unexpected alliances form? Do Mafia turn on each other accidentally?

### 4. "Memory Works: Agents Reference Previous Statements and Votes Accurately"

**How to validate via UX:**

**UI-level validation:**
- **Callback highlights**: When agent says "Earlier, Agent X said...", show link to that message
  - Click link → scroll to original statement
  - Verify accuracy: Did Agent X actually say that?
- **Fact-checking UI**:
  - Spectators can click "Verify" on claims
  - System highlights the referenced statement
  - If inaccurate, show discrepancy
- **Vote history panel**:
  - Show all previous votes
  - When agent references voting pattern, spectators can verify

**Backend validation:**
- Memory injection: Ensure agents receive accurate conversation history
- Statement extraction: Parse agent claims like "Agent 3 voted for Agent 8" and validate against game_events
- Consistency scoring: If agent makes false claim, flag it (helps improve prompts)

**Measurement:**
- Accuracy rate: % of agent claims that are factually correct
- Memory utilization: % of agent statements that reference past events
- False claim detection: Track inaccuracies to improve agent prompts

---

## MVP Scope Validation

### What's Truly Needed for Stage 1?

**MUST-HAVE (Core MVP):**

1. **Game engine with 5 phases working** (NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK)
   - Phase transitions automated
   - Timers enforced
   - State machine reliable

2. **Discussion orchestration that produces watchable gameplay**
   - Turn-based agent responses (don't need perfect algorithm, round-robin sufficient)
   - Agents receive conversation history
   - 3-5 minutes of multi-turn conversation happens
   - Messages stored in database

3. **AI agents with basic strategic behavior**
   - Mafia agents lie/deflect (doesn't have to be perfect)
   - Villager agents analyze/question (basic level acceptable)
   - Agents reference at least SOME past events (memory works)

4. **Spectator UI that shows the game**
   - Discussion feed with scrolling messages
   - Phase indicator with timer
   - Player grid showing alive/dead
   - Vote tally during voting
   - Game over screen with winner

5. **Real-time updates that work**
   - SSE for live discussion feed
   - Messages appear <1 second after agent speaks
   - Phase changes reflected immediately
   - Fallback polling if SSE fails

6. **Database persistence**
   - Game state saved
   - Full conversation history stored
   - Can view game transcript after completion

**NICE-TO-HAVE (Can Defer to Later Iterations):**

1. **Advanced conversation threading**
   - Visual lines connecting responses (can start with simple indentation)
   - Popup previews of referenced statements
   - Complex thread navigation

2. **Strategic pattern detection UI**
   - Voting bloc visualization
   - Suspicion heatmaps
   - Post-game analysis dashboard
   - Can start with basic vote history list

3. **Polish and animations**
   - Smooth phase transitions
   - Agent "typing..." indicators
   - Dramatic reveals
   - Sound effects
   - Can launch with minimal animations

4. **Sophisticated turn scheduling**
   - Priority queues for accused agents
   - Dynamic turn allocation
   - Can start with simple round-robin

5. **Mobile responsiveness**
   - Works on desktop first
   - Mobile can be Phase 2

6. **Multiple concurrent games**
   - Stage 1: One game at a time
   - Stage 2: Multiple games

### What Can Be Simplified Without Losing Magic?

**Simplification Opportunities:**

1. **Conversation Threading:**
   - **Full vision**: Complex visual graph with lines connecting statements
   - **MVP**: Simple indentation or "Replying to Agent X" text prefix
   - **Magic preserved**: Spectators can still follow conversation flow

2. **Turn Scheduling:**
   - **Full vision**: Priority queue with accused agents, relevance scoring, dynamic allocation
   - **MVP**: Round-robin with 2-3 rounds (everyone speaks, round 2, round 3)
   - **Magic preserved**: All agents get to speak, conversation still coherent

3. **Strategic Highlights:**
   - **Full vision**: Color-coded messages, accusation/defense badges, pattern analysis
   - **MVP**: Bold text for accusations, basic color coding
   - **Magic preserved**: Spectators can still identify key moments

4. **Mafia Coordination:**
   - **Full vision**: Full multi-turn Mafia discussion during Night
   - **MVP**: Single-turn voting (each Mafia agent votes for target, majority wins)
   - **Magic preserved**: Mafia still coordinates, just faster/simpler

5. **Real-time Updates:**
   - **Full vision**: SSE with <200ms latency, perfect synchronization
   - **MVP**: SSE with 1-second latency + 3-second polling fallback
   - **Magic preserved**: Still feels live, slight delay acceptable

6. **Agent Memory:**
   - **Full vision**: Agents recall every statement, perfect accuracy
   - **MVP**: Agents receive last 30 messages + vote history
   - **Magic preserved**: Agents still reference past events, limited scope acceptable

### Where Should Quality Be Uncompromising?

**CRITICAL QUALITY AREAS (Cannot Compromise):**

1. **Discussion Phase Orchestration**
   - **Why critical**: This is the heart of the game. If discussion is boring/broken, game fails.
   - **Quality bar**: Multi-turn conversation MUST happen, agents MUST engage with each other
   - **Cannot ship if**: Agents monologue randomly, ignore each other, or don't build logical arguments

2. **Agent Response Quality**
   - **Why critical**: Success criteria demands "natural conversation" and "fascinating to watch"
   - **Quality bar**: Agent messages must be coherent, relevant, strategic (not gibberish)
   - **Cannot ship if**: Agents produce robotic/repetitive responses, make zero sense, or ignore game context

3. **Memory Accuracy**
   - **Why critical**: Explicit success criterion "agents reference previous statements accurately"
   - **Quality bar**: When agent claims "Agent X said Y", it must be true most of the time (>80% accuracy)
   - **Cannot ship if**: Agents make false claims frequently (breaks immersion)

4. **Real-time Feed Reliability**
   - **Why critical**: Live spectating is the entire UX. If feed breaks, game unwatchable.
   - **Quality bar**: Messages arrive within 2 seconds, no missing messages, reconnection works
   - **Cannot ship if**: Messages lost, feed freezes, spectators see inconsistent game state

5. **Game Completion**
   - **Why critical**: Explicit success criterion "game completes from start to win condition"
   - **Quality bar**: Game must reach natural conclusion (Mafia wins or Villagers win) without crashes
   - **Cannot ship if**: Game hangs mid-Discussion, phase transitions break, infinite loops occur

**ACCEPTABLE COMPROMISES (Can Improve Later):**

1. **Visual Polish**: Basic styling acceptable, doesn't need to be beautiful
2. **Thread Visualization**: Simple implementation fine (indentation vs complex graph)
3. **Turn Scheduling Sophistication**: Round-robin acceptable vs complex priority system
4. **Mobile UI**: Desktop-only for Stage 1 acceptable
5. **Post-game Analysis**: Basic game-over screen fine, detailed analytics can wait

---

## Integration Challenges

### Cross-Phase Integration Points

**1. Conversation History Continuity (Spans All Phases)**

**Challenge**: Agents must remember events across phases
- Night Phase: Mafia coordinates
- Day Phase: Death announced
- Discussion Phase: Agents reference Night/Day events
- Voting Phase: Agents reference Discussion arguments

**Integration requirement**:
- Unified event log combining all phases
- Agent context includes events from all phases
- Frontend displays phase-specific UI but maintains continuity

**Example flow**:
```
Night: Mafia kills Agent 5
Day: "Agent 5 was eliminated"
Discussion: Agent 3 says "Agent 5 was very analytical, Mafia probably feared them"
  → This requires Agent 3 to remember:
    - Agent 5's previous Discussion messages (analytical)
    - Agent 5's death in current Night
    - Implied reasoning about why Mafia targeted them
```

**2. Role Knowledge Separation (Security/Privacy)**

**Challenge**: Mafia agents know each other, Villagers don't. UI must respect this.

**Integration requirement**:
- Agent context: Mafia receive `mafiaTeammates: [...]`, Villagers receive `role: "VILLAGER"` only
- Database: Roles stored, never exposed in public game events until game over
- Frontend: Roles hidden during game, revealed on game over
- Mafia Night discussion: Private conversation log separate from public discussion log

**Security concern**:
- API endpoints must not leak role information
- `/api/games/[gameId]/events` should NOT include Mafia coordination messages
- Separate endpoint `/api/games/[gameId]/mafia-chat` only accessible by backend, not exposed to spectators

**3. Timer Synchronization Across Backend/Frontend**

**Challenge**: Phase transitions must be synchronized
- Backend game engine manages phase timers
- Frontend displays countdown
- SSE may have latency
- Multiple spectators must see consistent timers

**Integration solution**:
- Backend stores absolute timestamps (not durations)
- Frontend calculates remaining time client-side
- On PHASE_CHANGE event, frontend resets timer with new end time
- Even if SSE delayed by 2 seconds, timer still correct (calculated from absolute time)

**Edge case**:
- Spectator joins mid-phase: Need to send current phase + end time in SNAPSHOT event

**4. Agent State Persistence (Across Turns)**

**Challenge**: Agent SDK instances must persist across turns
- Agent speaks in Discussion turn 1 (context: 10 messages)
- Agent speaks in Discussion turn 2 (context: 30 messages + memory of turn 1)
- Agent votes in Voting phase (context: full Discussion)
- Agent speaks in next round Discussion (context: previous round + new round)

**Integration requirement**:
- **Option A: Stateless** - Recreate agent each turn, inject full history
  - Simpler backend
  - Higher token usage (full history each time)
  - Potential inconsistency if agent "forgets" personality

- **Option B: Stateful** - Persistent agent instances
  - Complex backend (manage agent lifecycle)
  - Lower token usage (incremental context)
  - Better personality consistency

**Recommendation**: Start with Option A (stateless) for MVP simplicity, migrate to Option B if token costs too high

### Potential Integration Challenges

**Challenge 1: Agent Response Latency**

**Problem**: Claude API may take 5-15 seconds to respond
- Discussion phase = 5 minutes = 300 seconds
- 8 agents * 3 turns = 24 agent responses
- If each takes 10 seconds = 240 seconds of agent processing
- Only 60 seconds left for spectator viewing!

**Impact on UX**:
- Discussion feels slow
- Spectators get bored waiting
- Doesn't feel "live"

**Mitigation strategies**:
1. **Parallel processing**: Prepare next agent context while current agent generates
2. **Streaming**: Stream agent responses token-by-token (show typing effect)
3. **Time limits**: Timeout agents at 8 seconds, use fallback response
4. **Concurrency**: If Agent SDK allows, process 2-3 agents in parallel (for separate conversation threads)

**Challenge 2: Conversation Coherence at Scale**

**Problem**: With 8-12 agents, conversation can diverge into multiple threads
- Agent A accuses Agent B
- Agent C accuses Agent D (different thread)
- Agent E responds to Agent A (thread 1)
- Agent F responds to Agent C (thread 2)
- Spectators confused: Which thread to follow?

**Impact on UX**:
- Fragmented conversation
- Hard to follow
- Strategic narratives get lost

**Mitigation strategies**:
1. **Thread grouping in UI**: Group related messages visually (indent thread 1 vs thread 2)
2. **Thread completion**: Orchestrator prioritizes finishing one thread before starting another
   - Agent A accuses → Agent B defends → Agent A rebuts → Thread closed
   - Then Agent C can start new thread
3. **Turn scheduling**: Limit active threads to 1-2 at a time

**Challenge 3: SSE Connection Stability**

**Problem**: SSE connections can drop (network issues, timeouts, server restarts)
- Spectator loses connection mid-Discussion
- Misses 10 messages
- Reconnects but state inconsistent

**Impact on UX**:
- Broken experience
- Spectators see gaps in conversation
- Vote tallies incorrect

**Mitigation strategies**:
1. **Auto-reconnect with state catchup**:
   - On reconnect, send SNAPSHOT event with:
     - All messages since last received message ID
     - Current phase and timer
     - Updated player status
2. **Local state reconciliation**:
   - Frontend stores last received message ID
   - On reconnect, request messages after that ID
3. **Polling fallback**:
   - If SSE fails 3 times, switch to polling `/api/games/[gameId]/state` every 2 seconds
   - Less efficient but more reliable

**Challenge 4: Database Write Contention**

**Problem**: During Discussion phase, high write volume
- 24+ messages written to `discussion_messages` in 5 minutes
- Multiple game_events (phase changes, votes)
- Concurrent reads for agent context compilation
- Potential lock contention in SQLite

**Impact on UX**:
- Slow message delivery
- Agent context compilation delays
- SSE broadcast delays

**Mitigation strategies**:
1. **Write batching**: Buffer messages and write in batches (trade-off: slight delay)
2. **Read optimization**: Cache recent conversation history in memory
3. **Database tuning**: Enable WAL mode in SQLite for better concurrency
4. **Future scaling**: Consider PostgreSQL if SQLite becomes bottleneck (Stage 2)

**Challenge 5: Agent Context Compilation Performance**

**Problem**: Before each agent turn, must compile context:
- Fetch all discussion_messages for game (50+ messages by end)
- Fetch all game_events (20+ events)
- Format as conversation transcript
- Inject into agent prompt
- If this takes 2 seconds per agent * 24 agents = 48 seconds wasted

**Impact on UX**:
- Slow conversation pace
- Spectators wait longer between messages
- Discussion phase feels sluggish

**Mitigation strategies**:
1. **Incremental context**: Cache base context, append only new messages
2. **Query optimization**: Index on game_id + timestamp, fetch only after last_fetched_time
3. **Context size limits**: Only include last 30 messages (not full history) to reduce processing
4. **Pre-fetch**: While Agent A is generating response, compile context for Agent B (pipeline)

---

## Recommendations for Master Plan

### 1. Prioritize Discussion Phase Orchestration in Iteration 1

**Rationale**: This is the highest-risk, highest-complexity component. If Discussion doesn't work, the entire game fails.

**Recommendation**:
- **Iteration 1 Focus**: Build Discussion orchestrator + basic AI agent integration
- **Success metric**: Can run 5-minute Discussion with 8 agents producing coherent multi-turn conversation
- **Defer**: Full game phases (Night, Voting) can be simplified/mocked initially
- **Validate early**: Test Discussion quality before building full game loop

**Suggested Iteration 1 scope**:
- Game engine: Discussion phase only (manual triggers, no full game loop yet)
- AI layer: Agent initialization, conversation orchestration, memory injection
- Database: discussion_messages table + game_events for Discussion
- Frontend: Discussion feed UI + basic player grid
- Real-time: SSE for live message delivery
- **Goal**: Prove we can create fascinating multi-agent conversation

### 2. Start with Simplified Turn Scheduling, Iterate Based on Quality

**Rationale**: Complex priority queues are engineering-heavy. Simple round-robin may suffice for MVP.

**Recommendation**:
- **Iteration 1**: Round-robin turn scheduling (agent 1, agent 2, ..., agent 8, repeat)
  - Simple to implement
  - Guarantees all agents speak
  - Acceptable for initial testing
- **Iteration 2**: If conversation feels robotic, add priority for accused agents
- **Iteration 3**: If needed, implement full priority queue with relevance scoring

**Decision gate**: After Iteration 1, evaluate conversation quality
- If natural and engaging → keep round-robin
- If feels mechanical → invest in sophisticated scheduling

### 3. Use Stateless Agent Architecture for MVP, Migrate if Needed

**Rationale**: Stateful agent management adds backend complexity. Stateless simpler for initial development.

**Recommendation**:
- **Iteration 1**: Stateless agents
  - Recreate agent each turn
  - Inject full conversation history in context
  - Simpler error handling (no state corruption)
  - Trade-off: Higher token usage
- **Iteration 2+**: If token costs prohibitive, migrate to stateful
  - Persistent agent instances
  - Incremental context updates
  - More complex lifecycle management

**Cost estimation**:
- 5-minute Discussion, 24 agent turns, 30 messages context each turn
- ~500 tokens input per turn * 24 = 12k tokens input
- ~200 tokens output per turn * 24 = 5k tokens output
- Total: ~17k tokens per game (~$0.08 per game at current Claude pricing)
- Acceptable for MVP

### 4. Implement SSE with Polling Fallback from Day 1

**Rationale**: Real-time updates are critical to spectator experience. SSE can be unreliable.

**Recommendation**:
- **Primary**: Server-Sent Events for live updates
  - Low latency (<500ms)
  - Push model (efficient)
- **Fallback**: Polling every 2-3 seconds if SSE unavailable
  - Detect SSE support on client
  - Automatic fallback
  - Degrades gracefully
- **Implementation**: Build both in Iteration 1 (not much extra work, critical for reliability)

### 5. Define Discussion Quality Gates Before Building Full Game

**Rationale**: No point building Night/Voting phases if Discussion isn't engaging.

**Recommendation**:
- **Quality gates for Discussion (Iteration 1)**:
  1. Agents produce coherent responses (not gibberish)
  2. Agents reference past statements at least 50% of the time (memory works)
  3. Agents engage with each other (thread_parent_id used)
  4. Conversation builds toward conclusion (suspicions converge)
  5. Human evaluator rates conversation as "interesting to watch" (3+ out of 5)

- **Decision point**: Only proceed to full game loop if Discussion passes gates
- **Risk mitigation**: If Discussion quality poor after Iteration 1, pivot to improving agent prompts / orchestration before adding more features

### 6. Plan for 3 Iterations with Clear Validation Milestones

**Recommended iteration breakdown**:

**Iteration 1: Discussion Core (40% of effort)**
- Discussion orchestrator
- AI agent integration
- Basic memory management
- Discussion feed UI
- SSE real-time updates
- **Validation**: Can produce engaging 5-minute Discussion

**Iteration 2: Full Game Loop (35% of effort)**
- Night phase (Mafia coordination)
- Day announcement
- Voting phase
- Win condition checking
- Phase transitions
- Complete UI (lobby, phase indicators, game over)
- **Validation**: Full game playthrough works end-to-end

**Iteration 3: Polish & Strategic Depth (25% of effort)**
- Conversation threading visualization
- Strategic pattern highlights
- Agent prompt refinement (improve quality)
- Performance optimization
- Edge case handling
- **Validation**: Meets all 7 success criteria

**Rationale**: Front-load the hardest problem (Discussion), validate before expanding scope, finish with polish.

---

## Technology Recommendations

### Greenfield Recommendations

**Frontend Stack:**
- **Framework**: Next.js 14 App Router
  - Server components for initial page load
  - Client components for real-time UI
  - API routes for SSE endpoints
- **State Management**: Zustand
  - Lightweight, good for SSE event handling
  - Simpler than Redux for this use case
  - Easy to merge events into state
- **Real-time**: EventSource (native SSE) + polling fallback
- **Styling**: Tailwind CSS
  - Rapid prototyping
  - Good for Discussion feed layout (flexbox, grid)
- **UI Components**: shadcn/ui (Tailwind-based)
  - Timer component
  - Player cards
  - Phase banners

**Backend Stack:**
- **API Layer**: tRPC
  - Type-safe API (matches vision requirements)
  - Good DX with TypeScript
  - Easy to add new endpoints
- **Database**: Prisma + SQLite
  - Fast setup for MVP
  - Prisma migrations for schema evolution
  - Good for single-game-at-a-time (Stage 1)
  - Can migrate to PostgreSQL in Stage 2 if needed
- **Real-time**: Next.js API route with SSE
  - Native support, no external dependencies
  - Example: `/app/api/games/[gameId]/events/route.ts`

**AI Integration:**
- **Claude Agent SDK**:
  - CRITICAL: Must research before implementation (vision requirement)
  - Likely: `@anthropic-ai/sdk` with Agent features
  - Need to validate: Persistent agents vs stateless
- **Alternative if Agent SDK not mature**: Claude API with custom memory management
  - Build agent abstraction layer
  - Manage conversation history manually
  - Use system prompts for role/personality

**Data Schema (Prisma):**

```typescript
model Game {
  id            String   @id @default(cuid())
  status        String   // LOBBY, NIGHT, DAY, DISCUSSION, VOTING, GAME_OVER
  currentPhase  String
  phaseEndTime  DateTime?
  winner        String?  // MAFIA, VILLAGERS
  createdAt     DateTime @default(now())
  players       Player[]
  events        GameEvent[]
  messages      DiscussionMessage[]
}

model Player {
  id           String  @id @default(cuid())
  gameId       String
  agentName    String
  role         String  // MAFIA, VILLAGER
  personality  String  // optional: "analytical", "aggressive", etc.
  isAlive      Boolean @default(true)
  game         Game    @relation(fields: [gameId], references: [id])
}

model GameEvent {
  id        String   @id @default(cuid())
  gameId    String
  type      String   // PHASE_CHANGE, PLAYER_ELIMINATED, VOTE_CAST, etc.
  data      Json     // flexible event data
  timestamp DateTime @default(now())
  game      Game     @relation(fields: [gameId], references: [id])
}

model DiscussionMessage {
  id              String   @id @default(cuid())
  gameId          String
  speaker         String   // player ID
  content         String
  threadParentId  String?  // if replying to another message
  accusationTarget String? // if accusing another player
  timestamp       DateTime @default(now())
  game            Game     @relation(fields: [gameId], references: [id])
}
```

**Deployment:**
- **MVP**: Vercel (Next.js native, easy SSE support)
- **Database**: Vercel Postgres or Railway (if migrate from SQLite)
- **Future**: If Agent SDK requires long-running processes, may need dedicated backend (e.g., Railway, Fly.io)

---

## Notes & Observations

### Key UX Insights

1. **The Discussion Feed IS the Product**
   - 70%+ of spectator time spent watching Discussion
   - Quality bar for this UI must be extremely high
   - Investment in Discussion UI > other UI elements

2. **Conversation Threading is Critical but Can Start Simple**
   - Visual threading (lines, indentation) enhances experience significantly
   - BUT simple "Replying to Agent X" text also works for MVP
   - Can iterate from simple → sophisticated without breaking core experience

3. **Real-time Reliability > Real-time Speed**
   - Better to have 1-second latency with perfect delivery than 100ms latency with dropped messages
   - Fallback mechanisms (polling) are not optional, they're essential
   - Reconnection logic must be robust

4. **Agent Response Quality Determines Success**
   - No amount of UI polish can save poor agent responses
   - If agents produce gibberish or ignore context → game fails
   - Suggests iteration 1 should focus heavily on agent quality validation
   - Consider manual testing of agent responses before building full automation

### Integration Complexity Assessment

**Highest Complexity Integrations (Need Extra Attention):**
1. Discussion Orchestrator ↔ AI Agents (VERY HIGH)
   - Multi-turn coordination
   - Context compilation
   - Response threading
   - Time management

2. AI Agents ↔ Database Memory (HIGH)
   - Query performance at scale
   - Context size limits
   - Relevance filtering

3. Backend ↔ Frontend Real-time (MEDIUM-HIGH)
   - SSE reliability
   - State synchronization
   - Reconnection logic

**Lower Complexity Integrations (More Straightforward):**
1. Frontend State Management (MEDIUM)
   - Event handlers for SSE
   - UI state updates
   - Standard React patterns

2. Database Schema Design (LOW-MEDIUM)
   - Straightforward relational model
   - Prisma abstracts complexity

### Risk Flags

**Risk 1: Agent SDK Maturity Unknown**
- Vision requires "research Claude Agent SDK before planning"
- If SDK immature/missing features → may need to build custom agent layer
- Mitigation: Research phase MUST happen before iteration 1 starts

**Risk 2: Discussion Quality Depends on Prompts**
- Agent prompt engineering is high-skill, iterative work
- Poor prompts → boring/incoherent conversation → game fails
- Mitigation: Allocate time for prompt iteration, not just implementation

**Risk 3: Conversation Latency Kills Live Feel**
- If each agent takes 15 seconds → Discussion feels slow/dead
- Spectators may drop off
- Mitigation: Optimize agent response time, use streaming, parallel processing

**Risk 4: SQLite May Not Handle Write Volume**
- Discussion phase: 24+ writes in 5 minutes + concurrent reads
- SQLite write locks could cause delays
- Mitigation: Enable WAL mode, consider PostgreSQL if issues arise

### Success Factor Dependencies

Looking at the 7 success criteria, here are the dependencies:

1. **"Discussion phase works"** ← FOUNDATIONAL
   - Everything depends on this
   - If this fails, game fails

2. **"Mafia coordination"** ← Depends on Discussion orchestration
   - Reuse same orchestrator for private Mafia chat
   - Lower stakes (only 2-4 agents)

3. **"Villager deduction"** ← Depends on Memory + Agent Prompts
   - Needs accurate memory
   - Needs well-crafted Villager prompts

4. **"Natural conversation flow"** ← Depends on Turn Scheduling + Agent Quality
   - Turn management affects pacing
   - Agent responses affect naturalness

5. **"Memory works"** ← Depends on Database + Context Compilation
   - Database stores history
   - Context compilation provides history to agents
   - Agent prompts encourage memory usage

6. **"Game completes"** ← Depends on Full Game Loop
   - Phase transitions
   - Win condition checking
   - Error handling

7. **"Fascinating to watch"** ← Depends on ALL of the above + UI Quality
   - Highest-level goal
   - Composite of all other factors

**Implication**: Iteration 1 should focus on #1 (Discussion), #5 (Memory), and partially #4 (Flow). This validates the core magic before building full game.

---

## Data Flow Map

### End-to-End Data Flow for Single Discussion Turn

```
[1. TURN SCHEDULER]
├─ Input: Current game state (who's alive, who spoke last, timer)
├─ Logic: Determine next speaker (round-robin or priority)
├─ Output: Agent ID to speak next
     ↓
[2. CONTEXT COMPILER]
├─ Input: Agent ID, Game ID
├─ Queries Database:
│   ├─ discussion_messages (last 30, WHERE gameId = X)
│   ├─ game_events (WHERE gameId = X, type = VOTE_CAST)
│   ├─ players (WHERE gameId = X)
├─ Builds Context Object:
│   {
│     agentId: "agent-5",
│     role: "VILLAGER",
│     conversationHistory: [...],
│     voteHistory: [...],
│     livingPlayers: [...],
│     currentPhase: "DISCUSSION",
│     timeRemaining: 180
│   }
├─ Output: Agent context object
     ↓
[3. AGENT INVOCATION]
├─ Input: Context object
├─ Call: Claude Agent SDK / API
├─ Prompt: System prompt (role, personality) + context
├─ Wait: 5-15 seconds for response
├─ Output: Agent response
│   {
│     message: "I think Agent 3 is suspicious because...",
│     threadParent: "msg-123",
│     accusationTarget: "agent-3"
│   }
     ↓
[4. MESSAGE PERSISTENCE]
├─ Input: Agent response
├─ Write to Database:
│   INSERT INTO discussion_messages (
│     gameId, speaker, content, threadParentId, accusationTarget, timestamp
│   )
├─ Output: Message ID
     ↓
[5. SSE BROADCAST]
├─ Input: Message object
├─ Format SSE event:
│   event: message
│   data: {type: "MESSAGE", data: {...}}
├─ Broadcast to: All connected spectators
├─ Output: Event sent to N spectator clients
     ↓
[6. FRONTEND UPDATE]
├─ Input: SSE event received
├─ State Update:
│   messages.push(newMessage)
├─ UI Update:
│   - Append message to discussion feed
│   - Auto-scroll to bottom
│   - Highlight if accusation
│   - Update thread visualization
├─ Output: UI reflects new message
     ↓
[7. TURN SCHEDULER] (loop back to step 1)
├─ Check: Is discussion time expired?
│   ├─ No → Select next speaker (back to step 1)
│   └─ Yes → Transition to VOTING phase
```

### Data Flow for Phase Transition (Discussion → Voting)

```
[DISCUSSION TIMER EXPIRES]
     ↓
[GAME ENGINE]
├─ Update game state: phase = "VOTING"
├─ Calculate phase end time: now + 45 seconds
├─ Write to Database:
│   UPDATE games SET currentPhase = "VOTING", phaseEndTime = X
├─ Emit event: PHASE_CHANGE
     ↓
[SSE BROADCAST]
├─ Send to all spectators:
│   {type: "PHASE_CHANGE", data: {newPhase: "VOTING", duration: 45}}
     ↓
[FRONTEND UPDATE]
├─ Update phase indicator: "VOTING"
├─ Reset timer: 45 seconds
├─ Change UI: Show vote tally panel
     ↓
[VOTING ORCHESTRATOR]
├─ For each alive agent:
│   ├─ Compile context (full Discussion history)
│   ├─ Invoke agent with "Vote for one player to eliminate"
│   ├─ Agent responds: {vote: "agent-3", justification: "..."}
│   ├─ Store vote in game_events
│   ├─ Broadcast VOTE_CAST event
│   └─ Update vote tally UI
     ↓
[VOTE RESOLUTION]
├─ Count votes
├─ Determine majority
├─ Eliminate player
├─ Broadcast PLAYER_ELIMINATED event
├─ Update player status: isAlive = false
├─ Check win condition
     ↓
[NEXT PHASE or GAME OVER]
```

---

*Exploration completed: 2025-10-12T18:35:00Z*

*This report informs master planning decisions with focus on User Experience & Integration Points*
