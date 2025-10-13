# Iteration 2: Full Game Loop & Spectator UI

## Vision

Build complete Mafia game loop (Night → Day → Discussion → Voting → Win Check) with full spectator web interface. Integrate Discussion phase from Iteration 1 into full game flow.

## Scope

**Phase: Complete Game Engine + Web UI**

This iteration builds on validated Discussion phase to create the complete Mafia game experience. We add all remaining game phases, implement the full state machine, and build the polished spectator interface.

## Core Deliverables

### 1. Game State Machine
- Phase transitions: NIGHT → DAY_ANNOUNCEMENT → DISCUSSION → VOTING → WIN_CHECK → Loop
- Phase timing: Night (30-45s), Day (10s), Discussion (3-5min), Voting (45s)
- State management: Current phase, phase end time, round counter, alive players
- Phase orchestrator: Automatic phase transitions based on timers or completion

### 2. Night Phase (Mafia Private Coordination)
- Isolate Mafia agents (2-4 agents depending on player count)
- Private conversation: Similar to Discussion but Mafia-only, 30-45 seconds
- Victim selection: Consensus voting algorithm (majority vote determines target)
- Agent prompts: "Coordinate with fellow Mafia to choose tonight's victim"
- Store private messages separately (never exposed to Villagers or UI)
- Optimize: Can parallelize first round of proposals, then sequential voting

### 3. Day Announcement Phase
- Reveal victim from Night phase: "Agent X was eliminated"
- Brief reactions from alive agents (1-2 sentences each)
- Update player isAlive status in database
- Broadcast death event via SSE to spectator UI
- Duration: 10 seconds

### 4. Voting Phase
- Each alive agent votes to eliminate one player
- Agent context: Full Discussion history + voting history
- Vote justification: Agents explain their vote (50-100 tokens)
- Store votes in database with justification
- Vote tally: Count votes, determine majority
- Tie-breaking: Random selection or revote (implement random for MVP)
- Elimination: Mark target as isAlive=false
- Broadcast votes in real-time via SSE

### 5. Win Condition Checker
- After each elimination, check win conditions:
  * Villagers win: All Mafia eliminated
  * Mafia wins: Mafia count >= Villager count
- If win condition met, transition to GAME_OVER phase
- Store winner in database
- Broadcast GAME_OVER event

### 6. Role Assignment Algorithm
- Player count input: 8-12 (from lobby)
- Role distribution:
  * 8 players: 2 Mafia, 6 Villagers
  * 9 players: 3 Mafia, 6 Villagers
  * 10 players: 3 Mafia, 7 Villagers
  * 11 players: 3 Mafia, 8 Villagers
  * 12 players: 4 Mafia, 8 Villagers
- Random role assignment at game start
- Store roles in database (never exposed until game over)

### 7. Full Spectator UI

**Lobby Screen** (`/`)
- Player count slider: 8-12 players
- "Start Game" button
- Game rules summary (optional)

**Live Game Screen** (`/game/[gameId]`)
- **Phase Indicator:** Large banner showing current phase + countdown timer
- **Player Grid:** 8-12 player cards showing:
  * Agent name
  * Alive/dead status (grayscale for dead)
  * Roles HIDDEN until game over
- **Discussion Feed** (main UI element):
  * Scrolling conversation log with auto-scroll
  * Speaker name + message for each turn
  * Basic threading: "Replying to [Agent X]" text if inReplyTo set
  * Highlight accusations (red text for "I think [name] is Mafia")
  * Timestamp for each message
- **Vote Tally** (Voting phase only):
  * Show vote count per player
  * Highlight majority threshold
  * Display vote justifications
- **Phase Transitions:** Smooth visual updates when phase changes

**Game Over Screen** (`/game/[gameId]/results`)
- Winner announcement (Mafia or Villagers)
- Full role reveal for all players
- Complete game transcript (all messages)
- "New Game" button

### 8. Enhanced Real-time Updates (SSE)
- Event types:
  * MESSAGE: New discussion message
  * PHASE_CHANGE: Phase transition
  * VOTE_CAST: Agent voted
  * PLAYER_ELIMINATED: Someone died
  * GAME_OVER: Win condition met
- SSE endpoint: `/api/game/[gameId]/stream`
- Keepalive: 15-second heartbeat
- Reconnection: Auto-reconnect with state catchup
- Polling fallback: Switch to 2-second polling after 3 SSE failures

### 9. API Layer
- `game.create(playerCount)`: Initialize new game
- `game.start(gameId)`: Start game (assign roles, begin Night phase)
- `game.getState(gameId)`: Fetch current game state
- `game.getMessages(gameId, round)`: Paginated discussion feed
- Type-safe API with Zod validation

### 10. Integration of Iteration 1 Discussion
- Import Discussion orchestrator from Iteration 1
- Integrate into DISCUSSION phase of state machine
- Pass full game context (previous rounds, deaths, votes) to Discussion
- Agents now have full game memory (not just single Discussion)

## Quality Gates

✓ **Full Game Completion:** Game runs from start to win condition without crashes
✓ **Mafia Coordination Works:** Mafia agents coordinate privately, Villagers unaware
✓ **Voting Reflects Discussion:** Agents vote based on Discussion arguments (not random)
✓ **Win Conditions Trigger:** Game correctly detects Mafia/Villager victory
✓ **UI Displays Game State:** All phases visible, timers sync, votes display correctly
✓ **Real-time Updates Work:** SSE delivers messages <1 second, fallback polling works
✓ **Memory Across Rounds:** Agents reference previous rounds (not just current round)

## Out of Scope

- Advanced conversation threading visualization (lines/graphs)
- Strategic pattern highlights (voting blocs, accusation networks)
- Agent "typing" indicators
- Post-game analytics dashboard
- Multiple concurrent games
- Mobile responsive design (desktop-first)

## Dependencies

- Iteration 1 Discussion orchestrator
- Iteration 1 AI agent system
- Iteration 1 Database schema

## Estimated Hours

16-20 hours
