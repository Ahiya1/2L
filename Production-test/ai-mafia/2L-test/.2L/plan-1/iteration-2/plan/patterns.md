# Code Patterns & Conventions - Iteration 2

## File Structure

```
ai-mafia/
├── app/
│   ├── app/
│   │   ├── page.tsx                     # Lobby screen (NEW)
│   │   ├── game/
│   │   │   └── [gameId]/
│   │   │       ├── page.tsx             # Live Game screen (NEW)
│   │   │       └── results/
│   │   │           └── page.tsx         # Results screen (NEW)
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Card.tsx             # (NEW)
│   │   │   │   ├── Button.tsx           # (NEW)
│   │   │   │   └── Badge.tsx            # (NEW)
│   │   │   ├── PhaseIndicator.tsx       # (Existing, enhance)
│   │   │   ├── PlayerGrid.tsx           # (Existing, enhance)
│   │   │   ├── DiscussionFeed.tsx       # (Existing)
│   │   │   ├── VoteTally.tsx            # (NEW)
│   │   │   └── GameOverBanner.tsx       # (NEW)
│   │   ├── contexts/
│   │   │   └── GameEventsContext.tsx    # (NEW) Shared SSE connection
│   │   └── api/
│   │       └── game/
│   │           ├── create/
│   │           │   └── route.ts         # (NEW)
│   │           └── [gameId]/
│   │               ├── start/
│   │               │   └── route.ts     # (NEW)
│   │               ├── state/
│   │               │   └── route.ts     # (NEW)
│   │               ├── messages/
│   │               │   └── route.ts     # (NEW)
│   │               ├── votes/
│   │               │   └── route.ts     # (NEW)
│   │               ├── results/
│   │               │   └── route.ts     # (NEW)
│   │               └── stream/
│   │                   └── route.ts     # (Existing)
│   └── prisma/
│       └── schema.prisma                # (Extend)
├── src/
│   └── lib/
│       ├── game/
│       │   ├── master-orchestrator.ts   # (NEW)
│       │   ├── role-assignment.ts       # (NEW)
│       │   └── win-checker.ts           # (NEW)
│       ├── night/
│       │   ├── orchestrator.ts          # (NEW)
│       │   └── consensus.ts             # (NEW)
│       ├── voting/
│       │   ├── orchestrator.ts          # (NEW)
│       │   └── vote-parser.ts           # (NEW)
│       ├── day/
│       │   └── orchestrator.ts          # (NEW)
│       ├── discussion/
│       │   ├── orchestrator.ts          # (Existing, no changes)
│       │   ├── turn-executor.ts         # (Existing, no changes)
│       │   └── turn-scheduler.ts        # (Existing, no changes)
│       └── events/
│           ├── emitter.ts               # (Existing)
│           └── types.ts                 # (Extend)
└── logs/
    └── full-game-{timestamp}.txt        # CLI test output
```

## Naming Conventions

- **Components:** PascalCase (`VoteTally.tsx`, `GameOverBanner.tsx`)
- **Files:** camelCase (`master-orchestrator.ts`, `vote-parser.ts`)
- **Types:** PascalCase (`GamePhase`, `VotingResult`, `WinCondition`)
- **Functions:** camelCase (`runVotingPhase()`, `checkWinCondition()`)
- **Constants:** SCREAMING_SNAKE_CASE (`NIGHT_PHASE_DURATION`, `MAX_PLAYERS`)
- **Directories:** lowercase (`night/`, `voting/`, `day/`)

## Master Orchestrator Pattern

**When to use:** Coordinate all game phases from start to completion

**Code example:**

```typescript
// src/lib/game/master-orchestrator.ts
import { runNightPhase } from '@/lib/night/orchestrator';
import { runDayAnnouncement } from '@/lib/day/orchestrator';
import { runDiscussion } from '@/lib/discussion/orchestrator';
import { runVotingPhase } from '@/lib/voting/orchestrator';
import { checkWinCondition } from '@/lib/game/win-checker';
import { gameEventEmitter } from '@/lib/events/emitter';
import { prisma } from '@/lib/db/client';

export type GamePhase =
  | 'NIGHT'
  | 'DAY_ANNOUNCEMENT'
  | 'DISCUSSION'
  | 'VOTING'
  | 'WIN_CHECK'
  | 'GAME_OVER';

export interface MasterOrchestratorDependencies {
  prisma: typeof prisma;
  generateResponse: Function;
  trackCost: Function;
  buildAgentContext: Function;
}

export async function runGameLoop(
  gameId: string,
  dependencies: MasterOrchestratorDependencies
): Promise<{ winner: 'MAFIA' | 'VILLAGERS'; finalRound: number }> {
  let currentPhase: GamePhase = 'NIGHT';
  let roundNumber = 1;
  const MAX_ROUNDS = 10; // Force end after 10 rounds

  try {
    while (roundNumber <= MAX_ROUNDS) {
      // Update database with current phase
      await updateGamePhase(gameId, currentPhase, roundNumber);

      // Execute phase logic
      switch (currentPhase) {
        case 'NIGHT': {
          console.log(`[ROUND ${roundNumber}] Starting NIGHT phase`);
          const nightResult = await runNightPhase(gameId, dependencies, {
            durationMinutes: 0.75, // 45 seconds
          });

          if (nightResult.victim) {
            await markPlayerDead(gameId, nightResult.victim, 'NIGHTKILL', roundNumber);
          }

          currentPhase = 'DAY_ANNOUNCEMENT';
          break;
        }

        case 'DAY_ANNOUNCEMENT': {
          console.log(`[ROUND ${roundNumber}] Starting DAY_ANNOUNCEMENT phase`);
          await runDayAnnouncement(gameId, dependencies, {
            durationSeconds: 10,
          });

          // Check win condition after nightkill
          const winCheck1 = await checkWinCondition(gameId);
          if (winCheck1.hasWinner) {
            await finalizeGame(gameId, winCheck1.winner!);
            return { winner: winCheck1.winner!, finalRound: roundNumber };
          }

          currentPhase = 'DISCUSSION';
          break;
        }

        case 'DISCUSSION': {
          console.log(`[ROUND ${roundNumber}] Starting DISCUSSION phase`);
          await runDiscussion(gameId, dependencies, {
            durationMinutes: 3,
            totalRounds: 5,
          });

          currentPhase = 'VOTING';
          break;
        }

        case 'VOTING': {
          console.log(`[ROUND ${roundNumber}] Starting VOTING phase`);
          const votingResult = await runVotingPhase(gameId, dependencies);

          if (votingResult.eliminatedPlayer) {
            await markPlayerDead(
              gameId,
              votingResult.eliminatedPlayer,
              'DAYKILL',
              roundNumber
            );
          }

          currentPhase = 'WIN_CHECK';
          break;
        }

        case 'WIN_CHECK': {
          console.log(`[ROUND ${roundNumber}] Checking win condition`);
          const winCheck2 = await checkWinCondition(gameId);

          if (winCheck2.hasWinner) {
            await finalizeGame(gameId, winCheck2.winner!);
            return { winner: winCheck2.winner!, finalRound: roundNumber };
          }

          // Continue to next round
          roundNumber++;
          currentPhase = 'NIGHT';
          break;
        }

        default:
          throw new Error(`Unknown phase: ${currentPhase}`);
      }

      // Emit phase transition event
      gameEventEmitter.emit('phase_change', {
        gameId,
        type: 'phase_change',
        payload: {
          from: getPreviousPhase(currentPhase),
          to: currentPhase,
          round: roundNumber
        },
      });

      // Small delay between phases for stability
      await sleep(500);
    }

    // Force end if max rounds reached
    const alivePlayers = await prisma.player.findMany({
      where: { gameId, isAlive: true },
    });
    const mafiaCount = alivePlayers.filter(p => p.role === 'MAFIA').length;
    const winner = mafiaCount > 0 ? 'MAFIA' : 'VILLAGERS';

    await finalizeGame(gameId, winner);
    return { winner, finalRound: roundNumber };

  } catch (error) {
    console.error(`[GAME ERROR] ${error}`);
    throw error;
  }
}

async function updateGamePhase(
  gameId: string,
  phase: GamePhase,
  round: number
): Promise<void> {
  await prisma.game.update({
    where: { id: gameId },
    data: {
      currentPhase: phase,
      phaseStartTime: new Date(),
      roundNumber: round,
    },
  });
}

async function markPlayerDead(
  gameId: string,
  playerId: string,
  eliminationType: 'NIGHTKILL' | 'DAYKILL',
  round: number
): Promise<void> {
  await prisma.player.update({
    where: { id: playerId },
    data: {
      isAlive: false,
      eliminatedInRound: round,
      eliminationType,
    },
  });

  const player = await prisma.player.findUnique({ where: { id: playerId } });

  gameEventEmitter.emit('player_eliminated', {
    gameId,
    type: 'player_eliminated',
    payload: {
      playerId,
      playerName: player!.name,
      eliminationType,
      round,
    },
  });
}

async function finalizeGame(
  gameId: string,
  winner: 'MAFIA' | 'VILLAGERS'
): Promise<void> {
  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'GAME_OVER',
      currentPhase: 'GAME_OVER',
      winner,
    },
  });

  gameEventEmitter.emit('game_over', {
    gameId,
    type: 'game_over',
    payload: { winner },
  });
}

function getPreviousPhase(current: GamePhase): GamePhase {
  const sequence: GamePhase[] = [
    'NIGHT',
    'DAY_ANNOUNCEMENT',
    'DISCUSSION',
    'VOTING',
    'WIN_CHECK',
  ];
  const idx = sequence.indexOf(current);
  return idx > 0 ? sequence[idx - 1] : 'NIGHT';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Key points:**
- Single while loop coordinates all phases
- Database state updated before each phase execution
- Win condition checked after eliminations (not during phases)
- Error handling at top level
- Phase transitions logged for debugging

## Phase Execution Pattern (Reuse from Discussion)

**When to use:** Night phase, Voting phase (any turn-based phase)

**Code example:**

```typescript
// src/lib/night/orchestrator.ts
import { createTurnSchedule, getNextPlayer, advanceToNextTurn, shouldContinue } from '@/lib/discussion/turn-scheduler';
import { gameEventEmitter } from '@/lib/events/emitter';
import { prisma } from '@/lib/db/client';

export interface NightPhaseConfig {
  durationMinutes: number; // 0.75 = 45 seconds
}

export interface NightPhaseResult {
  victim: string | null; // Player ID
  totalMessages: number;
  consensusReached: boolean;
}

export async function runNightPhase(
  gameId: string,
  dependencies: any,
  config: NightPhaseConfig
): Promise<NightPhaseResult> {
  // Fetch Mafia agents only
  const mafiaPlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true, role: 'MAFIA' },
    orderBy: { position: 'asc' },
  });

  if (mafiaPlayers.length === 0) {
    return { victim: null, totalMessages: 0, consensusReached: false };
  }

  // Emit night start event
  gameEventEmitter.emit('night_start', {
    gameId,
    type: 'night_start',
    payload: { mafiaCount: mafiaPlayers.length },
  });

  // REUSE turn scheduler from Discussion
  let schedule = createTurnSchedule(mafiaPlayers, {
    totalRounds: 3, // 3 turns per Mafia agent
    durationMinutes: config.durationMinutes,
  });

  let turnCount = 0;

  while (shouldContinue(schedule)) {
    const player = getNextPlayer(schedule);
    if (!player) break;

    turnCount++;

    // Execute turn (similar to Discussion turn executor)
    await executeNightTurn(player.id, gameId, schedule.currentRound, turnCount, dependencies);

    schedule = advanceToNextTurn(schedule);
  }

  // Detect consensus on nightkill target
  const victim = await detectNightKillConsensus(gameId);

  // Emit night complete event
  gameEventEmitter.emit('night_complete', {
    gameId,
    type: 'night_complete',
    payload: {
      totalMessages: turnCount,
      victim: victim?.id || null,
      consensusReached: victim !== null,
    },
  });

  return {
    victim: victim?.id || null,
    totalMessages: turnCount,
    consensusReached: victim !== null,
  };
}

async function executeNightTurn(
  playerId: string,
  gameId: string,
  round: number,
  turn: number,
  dependencies: any
): Promise<void> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  const player = await prisma.player.findUnique({ where: { id: playerId } });

  // Build context (night messages + game history)
  const context = await buildNightContext(playerId, gameId, dependencies);

  // Generate response with timeout
  const { text, usage } = await generateWithTimeout(
    () => dependencies.generateResponse(context),
    10000 // 10 second timeout
  );

  // Save to NightMessage table (private)
  const message = await prisma.nightMessage.create({
    data: {
      gameId,
      playerId,
      roundNumber: game!.roundNumber,
      message: text,
      turn,
      timestamp: new Date(),
    },
  });

  // Track cost
  dependencies.trackCost({
    gameId,
    phase: 'NIGHT',
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cost: calculateCost(usage),
  });

  // DO NOT emit night_message event (keep private from spectators)
  console.log(`[NIGHT] ${player!.name}: ${text}`);
}

async function buildNightContext(
  playerId: string,
  gameId: string,
  dependencies: any
): Promise<any> {
  // Fetch night messages (Mafia-only)
  const nightMessages = await prisma.nightMessage.findMany({
    where: { gameId },
    include: { player: true },
    orderBy: { timestamp: 'asc' },
  });

  // Fetch full game history (discussion, votes, deaths)
  const baseContext = await dependencies.buildAgentContext(playerId, gameId);

  return {
    ...baseContext,
    nightMessages, // Add private Mafia conversation
    systemPrompt: NIGHT_PHASE_PROMPT, // Override with night-specific prompt
  };
}

async function detectNightKillConsensus(
  gameId: string
): Promise<{ id: string; name: string } | null> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  const nightMessages = await prisma.nightMessage.findMany({
    where: { gameId, roundNumber: game!.roundNumber },
    include: { player: true },
  });

  // Extract player name mentions from messages
  const allPlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true, role: 'VILLAGER' },
  });

  const mentions = new Map<string, number>();

  for (const msg of nightMessages) {
    for (const player of allPlayers) {
      if (msg.message.includes(player.name)) {
        mentions.set(player.id, (mentions.get(player.id) || 0) + 1);
      }
    }
  }

  // Find player mentioned by majority of Mafia
  const mafiaCount = new Set(nightMessages.map(m => m.playerId)).size;
  const threshold = Math.ceil(mafiaCount / 2);

  for (const [playerId, count] of mentions.entries()) {
    if (count >= threshold) {
      const player = allPlayers.find(p => p.id === playerId);
      return player ? { id: player.id, name: player.name } : null;
    }
  }

  // No consensus: random Villager
  const randomVillager = allPlayers[Math.floor(Math.random() * allPlayers.length)];
  return randomVillager ? { id: randomVillager.id, name: randomVillager.name } : null;
}

const NIGHT_PHASE_PROMPT = `
NIGHT PHASE - PRIVATE MAFIA COORDINATION

You are meeting privately with fellow Mafia members to choose tonight's victim.

Instructions:
1. Propose a Villager to eliminate (avoid targeting Mafia teammates)
2. Discuss strategic reasoning (which Villager poses greatest threat?)
3. Build consensus - you'll vote after coordination

Keep responses brief (15-30 words). Coordinate efficiently.

Remember: Villagers cannot see this conversation. Be candid.
`;

function generateWithTimeout(
  fn: () => Promise<any>,
  timeout: number
): Promise<any> {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    ),
  ]);
}

function calculateCost(usage: any): number {
  // Same cost calculation as Iteration 1
  return (usage.input_tokens * 0.000003) + (usage.output_tokens * 0.000015);
}
```

**Key points:**
- Reuse `createTurnSchedule`, `getNextPlayer`, `shouldContinue` from Discussion
- Filter players to Mafia-only before scheduling
- Save to `NightMessage` table (not `DiscussionMessage`)
- DO NOT emit messages to SSE (keep private)
- Consensus algorithm simple: majority mentions = target

## Privacy Pattern (isPrivate Flag)

**When to use:** Ensure Mafia coordination never leaks to Villagers

**Code example:**

```typescript
// Querying public messages only (for Villager context or spectator UI)
const publicMessages = await prisma.discussionMessage.findMany({
  where: {
    gameId,
    isPrivate: false, // CRITICAL: Exclude night messages
  },
  include: { player: true },
  orderBy: { timestamp: 'asc' },
});

// Querying night messages (for Mafia agent context only)
const nightMessages = await prisma.nightMessage.findMany({
  where: {
    gameId,
    roundNumber,
  },
  include: { player: true },
  orderBy: { timestamp: 'asc' },
});

// NEVER join NightMessage when building Villager context
async function buildVillagerContext(playerId: string, gameId: string) {
  const messages = await prisma.discussionMessage.findMany({
    where: { gameId }, // No isPrivate filter - safe because DiscussionMessage is always public
    include: { player: true },
  });

  // NightMessage table is completely separate - no risk of leak
  return { messages };
}

// When building Mafia context, include night messages
async function buildMafiaContext(playerId: string, gameId: string) {
  const publicMessages = await prisma.discussionMessage.findMany({
    where: { gameId },
    include: { player: true },
  });

  const nightMessages = await prisma.nightMessage.findMany({
    where: { gameId },
    include: { player: true },
  });

  return { publicMessages, nightMessages };
}
```

**Key points:**
- Use separate `NightMessage` table (not `isPrivate` flag) - cleaner separation
- NEVER join `NightMessage` in Villager queries
- Unit test: Verify Villager context contains zero night messages

## SSE Event Extensions

**When to use:** Emit real-time events for all game phases

**Code example:**

```typescript
// src/lib/events/types.ts - Extended event types

export type GameEventType =
  // Iteration 1 events (unchanged)
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete'
  // Iteration 2 new events
  | 'night_start'
  | 'night_complete'
  | 'nightkill'
  | 'day_reaction'
  | 'vote_cast'
  | 'voting_complete'
  | 'player_eliminated'
  | 'round_start'
  | 'game_over';

export type GameEvent =
  | { gameId: string; type: 'message'; payload: { playerId: string; playerName: string; message: string; } }
  | { gameId: string; type: 'vote_cast'; payload: { voterId: string; voterName: string; targetId: string; targetName: string; justification: string; voteOrder: number; } }
  | { gameId: string; type: 'player_eliminated'; payload: { playerId: string; playerName: string; eliminationType: 'NIGHTKILL' | 'DAYKILL'; round: number; } }
  | { gameId: string; type: 'game_over'; payload: { winner: 'MAFIA' | 'VILLAGERS'; finalRound: number; } }
  | { gameId: string; type: 'nightkill'; payload: { victimId: string; victimName: string; round: number; } }
  | { gameId: string; type: 'phase_change'; payload: { from: string; to: string; round: number; } };

// Usage in voting phase
gameEventEmitter.emit('vote_cast', {
  gameId,
  type: 'vote_cast',
  payload: {
    voterId: vote.voterId,
    voterName: voter.name,
    targetId: vote.targetId,
    targetName: target.name,
    justification: vote.justification,
    voteOrder: vote.voteOrder,
  },
});

// Usage in day announcement
gameEventEmitter.emit('nightkill', {
  gameId,
  type: 'nightkill',
  payload: {
    victimId: victim.id,
    victimName: victim.name,
    round: game.roundNumber,
  },
});

// Usage at game end
gameEventEmitter.emit('game_over', {
  gameId,
  type: 'game_over',
  payload: {
    winner: winResult.winner,
    finalRound: game.roundNumber,
  },
});
```

**Key points:**
- All events use discriminated unions for type safety
- Include relevant IDs and names in payloads
- Emit immediately after database updates
- SSE endpoint subscribes to all event types

## State Catchup Pattern

**When to use:** Late-joining spectator needs current game state + future events

**Code example:**

```typescript
// app/contexts/GameEventsContext.tsx - Shared SSE connection with catchup

'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { GameEvent } from '@/lib/events/types';

interface GameEventsContextValue {
  events: GameEvent[];
  isConnected: boolean;
  error: string | null;
}

const GameEventsContext = createContext<GameEventsContextValue>({
  events: [],
  isConnected: false,
  error: null,
});

export function GameEventsProvider({
  gameId,
  children
}: {
  gameId: string;
  children: ReactNode
}) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventQueue, setEventQueue] = useState<GameEvent[]>([]);
  const [initialStateFetched, setInitialStateFetched] = useState(false);

  // Step 1: Fetch initial game state
  useEffect(() => {
    fetch(`/api/game/${gameId}/state`)
      .then(res => res.json())
      .then(state => {
        // Convert state to event format for consistency
        const initialEvents = stateToEvents(state);
        setEvents(initialEvents);
        setInitialStateFetched(true);

        // Apply queued events
        setEventQueue(queue => {
          queue.forEach(event => {
            setEvents(prev => [...prev, event]);
          });
          return [];
        });
      })
      .catch(err => setError(err.message));
  }, [gameId]);

  // Step 2: Connect to SSE (queue events until initial state fetched)
  useEffect(() => {
    const es = new EventSource(`/api/game/${gameId}/stream`);

    es.onopen = () => setIsConnected(true);

    es.onmessage = (e) => {
      const event: GameEvent = JSON.parse(e.data);

      if (initialStateFetched) {
        // Add event immediately
        setEvents(prev => [...prev, event]);
      } else {
        // Queue event until initial state ready
        setEventQueue(prev => [...prev, event]);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      setError('SSE connection failed');
    };

    return () => es.close();
  }, [gameId, initialStateFetched]);

  return (
    <GameEventsContext.Provider value={{ events, isConnected, error }}>
      {children}
    </GameEventsContext.Provider>
  );
}

export function useGameEvents(): GameEventsContextValue {
  return useContext(GameEventsContext);
}

// Helper: Convert initial state to event format
function stateToEvents(state: any): GameEvent[] {
  const events: GameEvent[] = [];

  // Add phase_change event for current phase
  events.push({
    gameId: state.game.id,
    type: 'phase_change',
    payload: {
      from: 'LOBBY',
      to: state.currentPhase,
      round: state.roundNumber,
    },
  });

  // Add message events for existing discussion messages
  state.messages?.forEach((msg: any) => {
    events.push({
      gameId: state.game.id,
      type: 'message',
      payload: {
        playerId: msg.playerId,
        playerName: msg.player.name,
        message: msg.message,
      },
    });
  });

  return events;
}
```

**Key points:**
- Fetch initial state first, then connect SSE
- Queue SSE events until initial state loaded
- Merge queued events after initial state ready
- Prevents race condition where event arrives before state fetch completes

## Voting Phase Pattern

**When to use:** Sequential voting with structured vote parsing

**Code example:**

```typescript
// src/lib/voting/orchestrator.ts

import { prisma } from '@/lib/db/client';
import { gameEventEmitter } from '@/lib/events/emitter';

export interface VotingResult {
  eliminatedPlayer: string | null; // Player ID
  votes: Array<{ voterId: string; targetId: string; }>;
  tally: Record<string, number>;
}

export async function runVotingPhase(
  gameId: string,
  dependencies: any
): Promise<VotingResult> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true },
    orderBy: { position: 'asc' },
  });

  let voteOrder = 0;
  const votes: Array<{ voterId: string; targetId: string; }> = [];

  // Sequential voting (each agent sees prior votes)
  for (const voter of alivePlayers) {
    voteOrder++;

    // Build context with full game history + votes so far
    const context = await buildVotingContext(voter.id, gameId, votes);

    // Generate vote + justification
    const { text, usage } = await generateWithTimeout(
      () => dependencies.generateResponse(context),
      10000
    );

    // Parse vote target from response
    const { targetId, justification } = parseVote(text, alivePlayers);

    // Save vote
    const vote = await prisma.vote.create({
      data: {
        gameId,
        roundNumber: game!.roundNumber,
        voterId: voter.id,
        targetId,
        justification,
        phaseType: 'VOTING',
        voteOrder,
      },
    });

    votes.push({ voterId: voter.id, targetId });

    // Track cost
    dependencies.trackCost({
      gameId,
      phase: 'VOTING',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cost: calculateCost(usage),
    });

    // Emit vote event in real-time
    const target = alivePlayers.find(p => p.id === targetId);
    gameEventEmitter.emit('vote_cast', {
      gameId,
      type: 'vote_cast',
      payload: {
        voterId: voter.id,
        voterName: voter.name,
        targetId,
        targetName: target!.name,
        justification,
        voteOrder,
      },
    });

    // Small delay for dramatic effect
    await sleep(500);
  }

  // Tally votes
  const tally = tallyVotes(votes);
  const eliminatedPlayer = determineElimination(tally, alivePlayers);

  // Emit voting complete event
  gameEventEmitter.emit('voting_complete', {
    gameId,
    type: 'voting_complete',
    payload: { tally, eliminatedPlayer },
  });

  return { eliminatedPlayer, votes, tally };
}

async function buildVotingContext(
  voterId: string,
  gameId: string,
  votesSoFar: Array<{ voterId: string; targetId: string; }>
): Promise<any> {
  const baseContext = await dependencies.buildAgentContext(voterId, gameId);

  const votesSummary = votesSoFar.length > 0
    ? `\n\nVotes cast so far:\n${votesSoFar.map(v => `- ${v.voterId} voted for ${v.targetId}`).join('\n')}`
    : '';

  return {
    ...baseContext,
    systemPrompt: VOTING_PHASE_PROMPT + votesSummary,
  };
}

function parseVote(
  response: string,
  alivePlayers: any[]
): { targetId: string; justification: string } {
  // Regex: "I vote for Agent-X" or "Vote: Agent-X"
  const voteRegex = /(?:I vote for|Vote:)\s+([A-Z][a-z]+-[A-Z])/i;
  const match = response.match(voteRegex);

  if (match) {
    const targetName = match[1];
    const target = alivePlayers.find(p => p.name === targetName);

    if (target && target.isAlive) {
      return {
        targetId: target.id,
        justification: response,
      };
    }
  }

  // Fallback: random valid target
  const validTargets = alivePlayers.filter(p => p.isAlive);
  const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];

  return {
    targetId: randomTarget.id,
    justification: `${response} [Failed to parse - random vote]`,
  };
}

function tallyVotes(
  votes: Array<{ voterId: string; targetId: string; }>
): Record<string, number> {
  const tally: Record<string, number> = {};

  for (const vote of votes) {
    tally[vote.targetId] = (tally[vote.targetId] || 0) + 1;
  }

  return tally;
}

function determineElimination(
  tally: Record<string, number>,
  alivePlayers: any[]
): string | null {
  const entries = Object.entries(tally);
  if (entries.length === 0) return null;

  // Find max votes
  let maxVotes = 0;
  let winners: string[] = [];

  for (const [playerId, count] of entries) {
    if (count > maxVotes) {
      maxVotes = count;
      winners = [playerId];
    } else if (count === maxVotes) {
      winners.push(playerId);
    }
  }

  // Random tie-breaking
  if (winners.length > 1) {
    const randomIdx = Math.floor(Math.random() * winners.length);
    return winners[randomIdx];
  }

  return winners[0];
}

const VOTING_PHASE_PROMPT = `
VOTING PHASE

Based on the Discussion phase, vote to eliminate one player.

Instructions:
1. State: "I vote for Agent-X"
2. Provide 2-3 sentence justification citing specific Discussion evidence
3. You cannot abstain

Strategy:
- If Mafia: Vote to eliminate Villagers, deflect suspicion
- If Villager: Vote for who you believe is Mafia
`;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateWithTimeout(fn: () => Promise<any>, timeout: number): Promise<any> {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
  ]);
}

function calculateCost(usage: any): number {
  return (usage.input_tokens * 0.000003) + (usage.output_tokens * 0.000015);
}
```

**Key points:**
- Sequential voting allows agents to see prior votes
- Regex parsing with fallback to random vote
- Real-time SSE event emission after each vote
- Tie-breaking via random selection
- Vote justification stored for UI display

## Win Condition Pattern

**When to use:** Check after each elimination (nightkill or daykill)

**Code example:**

```typescript
// src/lib/game/win-checker.ts

import { prisma } from '@/lib/db/client';

export interface WinConditionResult {
  hasWinner: boolean;
  winner: 'MAFIA' | 'VILLAGERS' | null;
  reason: string;
  mafiaCount: number;
  villagerCount: number;
}

export async function checkWinCondition(
  gameId: string
): Promise<WinConditionResult> {
  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true },
  });

  const mafiaCount = alivePlayers.filter(p => p.role === 'MAFIA').length;
  const villagerCount = alivePlayers.filter(p => p.role === 'VILLAGER').length;

  // Villagers win: All Mafia eliminated
  if (mafiaCount === 0) {
    return {
      hasWinner: true,
      winner: 'VILLAGERS',
      reason: 'All Mafia members have been eliminated',
      mafiaCount,
      villagerCount,
    };
  }

  // Mafia wins: Mafia count >= Villager count (Mafia controls vote)
  if (mafiaCount >= villagerCount) {
    return {
      hasWinner: true,
      winner: 'MAFIA',
      reason: 'Mafia now equals or outnumbers Villagers',
      mafiaCount,
      villagerCount,
    };
  }

  // Game continues
  return {
    hasWinner: false,
    winner: null,
    reason: '',
    mafiaCount,
    villagerCount,
  };
}
```

**Key points:**
- Simple counting logic (no complex state)
- Check immediately after eliminations
- Return detailed result for logging/events
- Mafia wins when >= Villagers (not just >)

## Role Assignment Pattern

**When to use:** Game initialization (before starting Night phase)

**Code example:**

```typescript
// src/lib/game/role-assignment.ts

import { prisma } from '@/lib/db/client';

const AGENT_NAMES = [
  'Agent-A', 'Agent-B', 'Agent-C', 'Agent-D',
  'Agent-E', 'Agent-F', 'Agent-G', 'Agent-H',
  'Agent-I', 'Agent-J', 'Agent-K', 'Agent-L',
];

const PERSONALITIES = [
  'analytical', 'aggressive', 'cautious', 'charismatic',
  'paranoid', 'logical', 'emotional', 'strategic',
];

export async function assignRolesAndCreatePlayers(
  gameId: string,
  playerCount: number
): Promise<void> {
  // Calculate Mafia count (25-33% ratio)
  const mafiaCount = calculateMafiaCount(playerCount);

  // Create role pool
  const roles: ('MAFIA' | 'VILLAGER')[] = [];
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('MAFIA');
  }
  for (let i = 0; i < playerCount - mafiaCount; i++) {
    roles.push('VILLAGER');
  }

  // Fisher-Yates shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  // Create players
  for (let i = 0; i < playerCount; i++) {
    await prisma.player.create({
      data: {
        gameId,
        name: AGENT_NAMES[i],
        role: roles[i],
        personality: PERSONALITIES[i % PERSONALITIES.length],
        position: i,
        isAlive: true,
      },
    });
  }
}

function calculateMafiaCount(totalPlayers: number): number {
  // Standard Mafia ratios
  if (totalPlayers <= 8) return 2;  // 25%
  if (totalPlayers === 9) return 3;  // 33%
  if (totalPlayers === 10) return 3; // 30%
  if (totalPlayers === 11) return 3; // 27%
  return 4; // 33% for 12 players
}
```

**Key points:**
- Standard Mafia ratios (25-33%)
- Fisher-Yates shuffle for randomness
- Assign personalities for diversity
- Position field for display order

## API Route Pattern

**When to use:** All new API endpoints

**Code example:**

```typescript
// app/api/game/create/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { assignRolesAndCreatePlayers } from '@/lib/game/role-assignment';

const CreateGameSchema = z.object({
  playerCount: z.number().int().min(8).max(12),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerCount } = CreateGameSchema.parse(body);

    // Create game
    const game = await prisma.game.create({
      data: {
        status: 'LOBBY',
        currentPhase: null,
        playerCount,
      },
    });

    // Create players with roles
    await assignRolesAndCreatePlayers(game.id, playerCount);

    return NextResponse.json({ gameId: game.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[API ERROR] Create game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export type for client
export type CreateGameResponse = { gameId: string };
```

**Key points:**
- Zod validation at entry point
- Structured error responses
- Export response type for client
- Log errors with context

## Import Order Convention

```typescript
// 1. React/Next imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { z } from 'zod';

// 3. Internal lib imports
import { prisma } from '@/lib/db/client';
import { gameEventEmitter } from '@/lib/events/emitter';

// 4. Component imports
import { Card } from '@/components/ui/Card';
import { PlayerGrid } from '@/components/PlayerGrid';

// 5. Type imports
import type { GameEvent } from '@/lib/events/types';

// 6. Relative imports
import { helper } from './helper';
```

## Code Quality Standards

- **Error Handling:** Wrap phase execution in try-catch, log errors with context
- **Logging:** Use `console.log` with phase prefix: `[NIGHT] Starting phase`
- **Type Safety:** All functions have explicit return types
- **Null Safety:** Use optional chaining (`player?.name`) and null checks
- **Async/Await:** Prefer async/await over `.then()` chains
- **Database Transactions:** Use for multi-step operations (e.g., phase transitions)

## Performance Patterns

- **Batch API calls:** Fetch all players once per phase, not per turn
- **Parallel where safe:** Fetch game state + players in parallel (`Promise.all`)
- **Timeout all Claude calls:** 10-second max, fallback on timeout
- **Index database queries:** Add indexes on frequent WHERE clauses

## Security Patterns

- **Never expose API key:** Server-side only, never in client code
- **Hide roles until game over:** API returns `role: null` unless `status === 'GAME_OVER'`
- **Validate all inputs:** Use Zod schemas on API routes
- **Filter night messages:** NEVER include `NightMessage` in public queries
