# AI Mafia - Spectator Mode with Autonomous AI Agents

## Overview

Build Stage 1 of AI Mafia game where AI agents play Mafia autonomously while spectators watch. The game features 8-12 AI agents engaging in multi-turn conversations, strategic deception, and logical deduction. The critical complexity is the Discussion phase where agents must debate, accuse, defend, and build cases based on memory of previous interactions.

## Core Requirements

### Game Configuration
- **Players**: 8-12 AI agents (configurable)
- **Role Distribution** (auto-calculated):
  - 8 players: 2 Mafia, 6 Villagers
  - 9 players: 3 Mafia, 6 Villagers
  - 10 players: 3 Mafia, 7 Villagers
  - 11 players: 3 Mafia, 8 Villagers
  - 12 players: 4 Mafia, 8 Villagers
- **Win Conditions**:
  - Villagers win if all Mafia eliminated
  - Mafia wins if Mafia >= Villagers

### Game Phases (The Critical Flow)

#### 1. NIGHT Phase (30-45 seconds)
- Mafia agents coordinate privately in separate conversation
- Choose victim by consensus
- All other players "asleep" (inactive)

#### 2. DAY - Morning Announcement (10 seconds)
- Reveal overnight death
- All agents see the announcement
- Brief reactions from alive agents

#### 3. DISCUSSION Phase (3-5 minutes) ← **THE COMPLEX PART**
This is where the AI magic happens:
- **Multi-turn conversation** between ALL alive agents
- **Agent capabilities**:
  - Make accusations with reasoning
  - Defend themselves when accused
  - Question other players
  - Analyze previous voting patterns
  - Build cases against suspicious behavior
  - Form alliances or suspicions
- **Conversation orchestration**:
  - Turn-based speaking (prevent chaos)
  - Agents respond to specific statements
  - Build reasoning chains based on history
  - Mafia must lie convincingly without public coordination
  - Villagers detect inconsistencies
  - Each agent gets multiple speaking turns
  - Memory: agents remember who said what, who voted for whom

#### 4. VOTING Phase (45 seconds)
- Each agent votes to eliminate based on discussion
- Agents justify their vote briefly
- Majority vote eliminates player
- Ties: random elimination or revote

#### 5. WIN CHECK → Loop or Game Over

## AI Layer - CRITICAL RESEARCH REQUIRED

**IMPORTANT: Explorers MUST research Claude Agent SDK before planning:**

### Research Tasks
- **Web search**: "Claude Agent SDK documentation" and "Claude Agent SDK examples"
- **Understand**:
  - Agent SDK vs Claude API differences
  - Agent persistence and state management
  - Memory management across conversations
  - Tool use capabilities
  - Multi-turn conversation handling
- **Find**:
  - Installation and setup procedures
  - Agent initialization patterns
  - Conversation handling best practices
  - Memory management strategies
- **Research Mafia strategy** to inform agent prompting

### AI Architecture Requirements
- **Persistent agents** with conversation memory
- **Agent state**: name, role, personality, memory of all game events
- **Conversation orchestration**:
  - Turn management: control who speaks when
  - Allow responses: agents reply to specific statements
  - Conversation threading: track response chains
  - Time limits per turn (prevent domination)
  - Mafia coordination: private during Night, deceptive during Discussion
- **Prompt engineering**:
  - Mafia agents: Lie naturally, blend in, deflect suspicion
  - Villager agents: Logical deduction, pattern recognition, truth-seeking
  - All agents: Maintain character and personality consistency

## Game Engine

### State Machine
`NIGHT → DAY_ANNOUNCEMENT → DISCUSSION → VOTING → WIN_CHECK → Loop`

### Discussion Orchestration (The Hard Part)
- Turn management system
- Statement-response threading
- Conversation history tracking
- Time limits enforcement
- Agent scheduling algorithm

### Game State
- Players (alive/dead status, roles)
- Current phase and timers
- Complete conversation history
- Vote history
- Death log
- Event timeline

## Web UI (Spectator Mode)

### Lobby Screen
- Player count slider: 8-12
- "Start Game" button

### Live Game Screen
- **Phase indicator** with countdown timer
- **Player grid**: names, status (alive/dead), roles hidden until game over
- **DISCUSSION FEED** (main UI element):
  - Scrolling conversation log
  - Show speaker name and message
  - Highlight accusations and defenses
  - Visual thread connections (responses)
- **Vote tally** during voting phase
- **Game over screen**: winner announcement, role reveal

## Real-time Updates
- Server-Sent Events (SSE) for live discussion feed
- 2-second polling fallback

## Data Storage
- **Database**: SQLite + Prisma ORM
- **Schema**:
  - `games`: game metadata, status, winner
  - `players`: agent name, role, personality, game_id
  - `game_events`: phase changes, deaths, votes (timestamped)
  - `discussion_messages`: all agent statements, threading data

## Technology Stack
- **Framework**: Next.js 14 App Router
- **Language**: TypeScript (strict mode)
- **AI**: Claude Agent SDK (research required)
- **Database**: Prisma + SQLite
- **Styling**: Tailwind CSS
- **API**: tRPC for type-safe API layer

## Success Criteria

The following MUST work for this to be considered complete:

1. **Discussion phase works**: Multi-turn conversation with logical agent responses
2. **Mafia coordination**: Private night coordination + convincing public lies
3. **Villager deduction**: Agents detect inconsistencies and build cases
4. **Natural conversation flow**: Not robotic, feels like real Mafia game
5. **Memory works**: Agents reference previous statements and votes accurately
6. **Game completes**: Full playthrough from start to win condition
7. **Fascinating to watch**: Actual strategy emerges, not random behavior

## Out of Scope (Stage 2 Features)
- Human players
- Multiple concurrent games
- Special roles (Detective, Doctor, etc.)
- AI detection challenge mode
- Voice/audio integration

## Focus Area
**The Discussion phase is the heart of this game.** The orchestration, memory, and agent prompting must create compelling strategic gameplay that's fascinating to watch.

---

*Plan ID: plan-1*
*Created: 2025-10-12*
*Status: VISIONED*
