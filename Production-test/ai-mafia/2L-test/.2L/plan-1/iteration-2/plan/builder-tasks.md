# Builder Task Breakdown - Iteration 2

## Overview

6 primary builders will work to complete the full game loop and spectator UI. Builders 2-3 can work in parallel after Builder-1 completes the foundation. Builders 4-6 can work in parallel with game logic builders once APIs are defined.

**Estimated Total Duration:** 14-16 hours

---

## Builder-1: Master Orchestrator & Database Foundation

### Scope

Core game state machine that coordinates all phases, plus database schema changes to support multi-phase gameplay.

### Complexity Estimate

**HIGH**

This is the architectural foundation. Single builder recommended (splitting would increase coordination overhead).

### Success Criteria

- [ ] Master orchestrator executes phase sequence: NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK
- [ ] Database migration adds `NightMessage` table and extends existing tables
- [ ] Phase transitions update database state atomically
- [ ] Event types extended with 6 new types (night_start, vote_cast, etc.)
- [ ] CLI test harness runs mock game with stub phases
- [ ] All phase orchestrator interfaces defined (contract-first design)

### Files to Create

- `src/lib/game/master-orchestrator.ts` - Main game loop coordinator (250-300 lines)
- `app/prisma/schema.prisma` - Add NightMessage table, extend Game/Player/Vote models
- `app/prisma/migrations/XXXXXX_iteration-2-phases/migration.sql` - Auto-generated migration
- `src/lib/events/types.ts` - Extend with 6 new event types (MODIFY existing file)
- `src/cli/test-full-game.ts` - CLI harness to run full game loop

### Dependencies

**Depends on:** Iteration 1 Discussion orchestrator (already exists, no changes)

**Blocks:** All other builders (defines interfaces and database schema)

### Implementation Notes

**Phase Orchestrator Interfaces:**

Define clear contracts for each phase orchestrator before implementation:

```typescript
// Interfaces for other builders to implement
export interface PhaseOrchestrator {
  run(gameId: string, dependencies: Dependencies): Promise<PhaseResult>;
}

export interface NightPhaseResult {
  victim: string | null;
  totalMessages: number;
  consensusReached: boolean;
}

export interface VotingPhaseResult {
  eliminatedPlayer: string | null;
  votes: Vote[];
  tally: Record<string, number>;
}

export interface WinConditionResult {
  hasWinner: boolean;
  winner: 'MAFIA' | 'VILLAGERS' | null;
  reason: string;
}
```

**Database Schema Changes:**

1. New table `NightMessage` - Separate from DiscussionMessage for privacy guarantee
2. Extend `Game` with `currentPhase`, `phaseStartTime`, `nightVictim`
3. Extend `Player` with `eliminatedInRound`, `eliminationType`
4. Extend `Vote` with `phaseType`, `voteOrder`

**Critical:** Run migration on copy of Iteration 1 database first to verify no breaking changes.

**Master Orchestrator Pattern:**

Use switch statement for phase execution (not nested if-else). Example:

```typescript
while (roundNumber <= MAX_ROUNDS) {
  await updateGamePhase(gameId, currentPhase, roundNumber);

  switch (currentPhase) {
    case 'NIGHT':
      const nightResult = await runNightPhase(gameId, deps, config);
      // ... handle result
      currentPhase = 'DAY_ANNOUNCEMENT';
      break;

    case 'DAY_ANNOUNCEMENT':
      await runDayAnnouncement(gameId, deps);
      // ... check win condition
      currentPhase = 'DISCUSSION';
      break;

    // ... other phases
  }

  await sleep(500); // Buffer between phases
}
```

**Mocking Strategy for Testing:**

Create stub implementations for phase orchestrators that return mock data:

```typescript
// Mock implementations for initial testing
async function runNightPhase(gameId: string, deps: any, config: any) {
  console.log('[MOCK] Night phase - selecting random victim');
  const villagers = await prisma.player.findMany({
    where: { gameId, role: 'VILLAGER', isAlive: true }
  });
  return {
    victim: villagers[0]?.id || null,
    totalMessages: 12,
    consensusReached: true
  };
}
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use **Master Orchestrator Pattern** (section: Master Orchestrator Pattern)
- Follow **Import Order Convention** (section: Import Order Convention)
- Use **Error Handling** standards (wrap all phase execution in try-catch)

### Testing Requirements

- Unit tests: Phase transition logic (if time permits)
- Integration test: CLI harness runs full mock game (5 phases × 1 round)
- Manual test: Verify database state after each phase transition
- Coverage target: 80% for critical path (phase transitions, error handling)

### Potential Split Strategy

**NOT RECOMMENDED** - Master orchestrator is tightly coupled. Splitting would require:
- Sub-builder 1A: Phase state machine + database changes
- Sub-builder 1B: Event system extensions + CLI harness

Better to keep as single builder (4 hours estimated).

---

## Builder-2: Night Phase Orchestration

### Scope

Implement private Mafia coordination phase with consensus-based victim selection. Reuse 70-80% of Discussion orchestrator patterns.

### Complexity Estimate

**MEDIUM-HIGH**

Single builder recommended. Reusing Discussion patterns reduces complexity significantly.

### Success Criteria

- [ ] Night phase runs for 45 seconds (configurable duration)
- [ ] Only Mafia agents participate (filtered by role)
- [ ] Messages saved to `NightMessage` table (never visible to Villagers)
- [ ] Consensus algorithm selects victim (majority mentions = target)
- [ ] Fallback to random victim if no consensus after timeout
- [ ] Events emitted: `night_start`, `night_complete`, `nightkill`
- [ ] Cost tracking includes `phase: 'NIGHT'` field

### Files to Create

- `src/lib/night/orchestrator.ts` - Night phase coordinator (200-250 lines)
- `src/lib/night/consensus.ts` - Victim selection algorithm (60-80 lines)
- `src/lib/prompts/night-prompts.ts` - Mafia coordination prompts

### Dependencies

**Depends on:** Builder-1 (master orchestrator skeleton, database schema)

**Blocks:** None (can work in parallel with Builder-3)

### Implementation Notes

**Code Reuse from Discussion Orchestrator:**

Import and reuse these functions:

```typescript
import {
  createTurnSchedule,
  getNextPlayer,
  advanceToNextTurn,
  shouldContinue
} from '@/lib/discussion/turn-scheduler';
```

**Key Differences from Discussion:**

1. **Player filtering:** Only fetch Mafia (`WHERE role = 'MAFIA' AND isAlive = true`)
2. **Database table:** Save to `NightMessage` instead of `DiscussionMessage`
3. **Event privacy:** DO NOT emit `message` events to SSE (keep private)
4. **Duration:** 45 seconds (vs 3 minutes for Discussion)
5. **Consensus detection:** After phase completes, analyze messages for victim mentions

**Consensus Algorithm (MVP):**

Simple majority-based approach:

```typescript
// Extract player name mentions from all night messages
const mentions = new Map<string, number>();
for (const msg of nightMessages) {
  for (const villager of villagers) {
    if (msg.message.includes(villager.name)) {
      mentions.set(villager.id, (mentions.get(villager.id) || 0) + 1);
    }
  }
}

// Find player mentioned by majority (>50% of Mafia)
const threshold = Math.ceil(mafiaCount / 2);
for (const [playerId, count] of mentions.entries()) {
  if (count >= threshold) {
    return playerId; // Consensus reached
  }
}

// No consensus: random villager
return randomVillager.id;
```

**Privacy Guarantee:**

Critical: NEVER query `NightMessage` when building Villager context. Separate table ensures no accidental leaks.

Audit all context builders:

```typescript
// CORRECT: Villager context excludes night messages
async function buildVillagerContext(playerId: string, gameId: string) {
  const messages = await prisma.discussionMessage.findMany({
    where: { gameId }
  });
  // NightMessage table not touched - safe
}

// CORRECT: Mafia context includes night messages
async function buildMafiaContext(playerId: string, gameId: string) {
  const publicMessages = await prisma.discussionMessage.findMany({
    where: { gameId }
  });
  const nightMessages = await prisma.nightMessage.findMany({
    where: { gameId }
  });
  return { publicMessages, nightMessages };
}
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use **Phase Execution Pattern** (section: Phase Execution Pattern)
- Use **Privacy Pattern** (section: Privacy Pattern)
- Follow **Timeout Handling** from Discussion (10-second max per turn)

### Testing Requirements

- Unit test: Consensus algorithm with various scenarios (unanimous, split, tie)
- Unit test: Privacy filter (verify Villager context has zero night messages)
- Integration test: Full night phase with 3 Mafia agents
- Manual test: Inspect database - verify `NightMessage` entries exist, not in SSE stream
- Coverage target: 90% for consensus algorithm (critical logic)

### Potential Split Strategy

If complexity proves HIGH, consider:

**Foundation (Builder-2):** Core night orchestrator
- Reuse turn scheduler
- Message generation and storage
- Event emission

**Sub-builder 2A:** Consensus algorithm
- Victim selection logic
- Mention extraction
- Fallback random selection

Estimated split savings: 1 hour (not worth overhead unless struggling)

---

## Builder-3: Voting, Day Announcement & Win Conditions

### Scope

Implement three related phases: Day Announcement (brief reactions to nightkill), Voting (sequential elimination votes), and Win Condition checking (after eliminations).

### Complexity Estimate

**MEDIUM**

Single builder can handle all three phases (related logic, sequential flow).

### Success Criteria

- [ ] Day Announcement phase reveals nightkill victim and collects brief reactions (1-2 sentences per agent)
- [ ] Voting phase runs sequentially (each agent sees prior votes)
- [ ] Vote parsing extracts target from Claude response with fallback to random
- [ ] Vote tally determines elimination (random tie-breaking for MVP)
- [ ] Win condition checker runs after eliminations (Mafia >= Villagers or all Mafia dead)
- [ ] Events emitted: `nightkill`, `day_reaction`, `vote_cast`, `voting_complete`, `game_over`
- [ ] Cost tracking includes `phase: 'VOTING'` and `phase: 'DAY'` fields

### Files to Create

- `src/lib/voting/orchestrator.ts` - Voting phase coordinator (180-220 lines)
- `src/lib/voting/vote-parser.ts` - Parse votes from Claude responses (50-70 lines)
- `src/lib/day/orchestrator.ts` - Day announcement phase (120-150 lines)
- `src/lib/game/win-checker.ts` - Win condition logic (80-100 lines)
- `src/lib/prompts/voting-prompts.ts` - Voting phase prompts
- `src/lib/prompts/day-prompts.ts` - Day reaction prompts

### Dependencies

**Depends on:** Builder-1 (master orchestrator skeleton, database schema)

**Blocks:** None (can work in parallel with Builder-2)

### Implementation Notes

**Day Announcement Phase:**

Simple sequential turn execution (similar to Discussion):

```typescript
async function runDayAnnouncement(gameId: string, deps: any, config: any) {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  const victim = await prisma.player.findUnique({ where: { id: game!.nightVictim! } });

  // Emit nightkill event
  gameEventEmitter.emit('nightkill', {
    gameId,
    type: 'nightkill',
    payload: { victimId: victim!.id, victimName: victim!.name, round: game!.roundNumber }
  });

  // Get brief reactions from alive players
  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true }
  });

  for (const player of alivePlayers) {
    const reaction = await generateReaction(player.id, gameId, victim!);
    // Save to DiscussionMessage (public, visible to all)
    await prisma.discussionMessage.create({
      data: { gameId, playerId: player.id, message: reaction, turn: i++ }
    });
  }
}
```

**Voting Phase - Sequential Execution:**

Critical: Each agent must see prior votes for strategic depth.

```typescript
const votes = [];
for (const voter of alivePlayers) {
  // Build context with votes cast so far
  const context = await buildVotingContext(voter.id, gameId, votes);
  const { text, usage } = await generateWithTimeout(() => generateResponse(context), 10000);

  // Parse vote target
  const { targetId, justification } = parseVote(text, alivePlayers);

  // Save vote
  const vote = await prisma.vote.create({
    data: { gameId, roundNumber, voterId: voter.id, targetId, justification, voteOrder: votes.length + 1 }
  });

  votes.push(vote);

  // Real-time SSE emission
  gameEventEmitter.emit('vote_cast', { /* ... */ });

  await sleep(500); // Dramatic pause between votes
}
```

**Vote Parsing:**

Use regex with fallback:

```typescript
function parseVote(response: string, alivePlayers: Player[]): { targetId: string; justification: string } {
  // Regex: "I vote for Agent-X" or "Vote: Agent-X"
  const voteRegex = /(?:I vote for|Vote:)\s+([A-Z][a-z]+-[A-Z])/i;
  const match = response.match(voteRegex);

  if (match) {
    const targetName = match[1];
    const target = alivePlayers.find(p => p.name === targetName && p.isAlive);
    if (target) return { targetId: target.id, justification: response };
  }

  // Fallback: random valid target
  const validTargets = alivePlayers.filter(p => p.isAlive);
  const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
  return { targetId: randomTarget.id, justification: `${response} [Parse failed - random]` };
}
```

**Tie-Breaking:**

Simple random selection for MVP:

```typescript
function determineElimination(tally: Record<string, number>): string | null {
  const entries = Object.entries(tally);
  if (entries.length === 0) return null;

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

  // Random selection from tied players
  return winners[Math.floor(Math.random() * winners.length)];
}
```

**Win Condition Logic:**

Simple counting after each elimination:

```typescript
export async function checkWinCondition(gameId: string): Promise<WinConditionResult> {
  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true }
  });

  const mafiaCount = alivePlayers.filter(p => p.role === 'MAFIA').length;
  const villagerCount = alivePlayers.filter(p => p.role === 'VILLAGER').length;

  if (mafiaCount === 0) {
    return { hasWinner: true, winner: 'VILLAGERS', reason: 'All Mafia eliminated' };
  }

  if (mafiaCount >= villagerCount) {
    return { hasWinner: true, winner: 'MAFIA', reason: 'Mafia equals or outnumbers Villagers' };
  }

  return { hasWinner: false, winner: null, reason: '' };
}
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use **Voting Phase Pattern** (section: Voting Phase Pattern)
- Use **Win Condition Pattern** (section: Win Condition Pattern)
- Follow **Sequential Execution** (not parallel) for voting

### Testing Requirements

- Unit test: Vote parsing with various response formats (success, failure, edge cases)
- Unit test: Tie-breaking with 2-way, 3-way, 4-way ties
- Unit test: Win condition checker (all scenarios: Mafia win, Villager win, continue)
- Integration test: Full voting phase with 8 agents
- Manual test: Verify votes appear in real-time on UI
- Coverage target: 90% for win checker (critical game logic)

### Potential Split Strategy

If complexity proves HIGH, consider:

**Foundation (Builder-3):** Day + Win checker
- Day announcement phase (simple)
- Win condition checker (simple)

**Sub-builder 3A:** Voting orchestrator
- Sequential voting logic
- Context building with prior votes
- Event emission

**Sub-builder 3B:** Vote parsing
- Regex parsing
- Validation
- Fallback logic

Estimated split savings: 1 hour (not worth overhead unless struggling)

---

## Builder-4: API Layer & Game Initialization

### Scope

Create 6 new Next.js Route Handlers for game creation, state fetching, and results. Implement game initialization (role assignment, player creation).

### Complexity Estimate

**MEDIUM**

Single builder can handle all API endpoints (similar patterns, straightforward CRUD).

### Success Criteria

- [ ] POST `/api/game/create` creates game with N players and assigns roles
- [ ] POST `/api/game/[gameId]/start` triggers master orchestrator to begin game loop
- [ ] GET `/api/game/[gameId]/state` returns current game state for spectators
- [ ] GET `/api/game/[gameId]/messages?round=N` returns paginated discussion messages
- [ ] GET `/api/game/[gameId]/votes?round=N` returns votes for specific round
- [ ] GET `/api/game/[gameId]/results` returns full game data (roles revealed) after GAME_OVER
- [ ] All endpoints use Zod validation
- [ ] All endpoints return structured errors (400 for validation, 500 for server errors)
- [ ] Role assignment follows standard Mafia ratios (25-33%)

### Files to Create

- `app/api/game/create/route.ts` - Game creation endpoint (80-100 lines)
- `app/api/game/[gameId]/start/route.ts` - Start game endpoint (60-80 lines)
- `app/api/game/[gameId]/state/route.ts` - Current state endpoint (100-120 lines)
- `app/api/game/[gameId]/messages/route.ts` - Messages endpoint (80-100 lines)
- `app/api/game/[gameId]/votes/route.ts` - Votes endpoint (80-100 lines)
- `app/api/game/[gameId]/results/route.ts` - Results endpoint (120-150 lines)
- `src/lib/game/role-assignment.ts` - Role distribution logic (80-100 lines)

### Dependencies

**Depends on:** Builder-1 (database schema), Builders 2-3 (game logic for `/start` endpoint)

**Blocks:** Builders 5-6 (UI needs API endpoints)

### Implementation Notes

**API Pattern:**

All endpoints follow this structure:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';

const SchemaName = z.object({
  // validation rules
});

export async function METHOD(req: NextRequest) {
  try {
    // Parse and validate
    const data = SchemaName.parse(await req.json());

    // Business logic
    const result = await performOperation(data);

    // Return success
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[API ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export response type
export type ResponseType = { /* ... */ };
```

**Role Assignment Algorithm:**

Standard Mafia ratios:

- 8 players: 2 Mafia (25%)
- 9 players: 3 Mafia (33%)
- 10 players: 3 Mafia (30%)
- 11 players: 3 Mafia (27%)
- 12 players: 4 Mafia (33%)

```typescript
function calculateMafiaCount(totalPlayers: number): number {
  if (totalPlayers <= 8) return 2;
  if (totalPlayers === 9) return 3;
  if (totalPlayers === 10) return 3;
  if (totalPlayers === 11) return 3;
  return 4; // 12 players
}
```

Use Fisher-Yates shuffle for random role assignment.

**Start Game Endpoint:**

This endpoint kicks off the game loop (runs asynchronously):

```typescript
export async function POST(req: NextRequest, { params }: { params: { gameId: string } }) {
  const { gameId } = params;

  // Update game status
  await prisma.game.update({
    where: { id: gameId },
    data: { status: 'NIGHT', currentPhase: 'NIGHT', roundNumber: 1 }
  });

  // Run game loop asynchronously (don't await)
  runGameLoop(gameId, dependencies).catch(err => {
    console.error('[GAME ERROR]', err);
  });

  return NextResponse.json({ success: true, gameId });
}
```

**Results Endpoint - Role Reveal:**

Only return roles if game is over:

```typescript
export async function GET(req: NextRequest, { params }: { params: { gameId: string } }) {
  const game = await prisma.game.findUnique({ where: { id: params.gameId } });

  if (game?.status !== 'GAME_OVER') {
    return NextResponse.json(
      { error: 'Game not finished' },
      { status: 403 }
    );
  }

  // Safe to return roles now
  const players = await prisma.player.findMany({
    where: { gameId: params.gameId },
    include: { role: true } // Roles revealed
  });

  // ... return full game data
}
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use **API Route Pattern** (section: API Route Pattern)
- Use **Role Assignment Pattern** (section: Role Assignment Pattern)
- Follow **Error Handling** standards (structured errors)

### Testing Requirements

- Manual test: Call each endpoint via curl or Postman
- Unit test: Role assignment algorithm (verify ratios for 8-12 players)
- Integration test: Full flow (create → start → fetch state → results)
- Manual test: Verify error responses for invalid inputs
- Coverage target: 80% for role assignment (critical logic)

### Potential Split Strategy

**NOT RECOMMENDED** - All endpoints follow same pattern. Splitting would be:

**Foundation (Builder-4):** Game creation + start
- `/api/game/create`
- `/api/game/[gameId]/start`
- Role assignment logic

**Sub-builder 4A:** State + results
- `/api/game/[gameId]/state`
- `/api/game/[gameId]/results`

**Sub-builder 4B:** Messages + votes
- `/api/game/[gameId]/messages`
- `/api/game/[gameId]/votes`

Better to keep as single builder (2-3 hours estimated).

---

## Builder-5: Lobby & Game Over Screens

### Scope

Build two simple screens: Lobby (game creation with player count slider) and Game Over (winner announcement, role reveal, full transcript).

### Complexity Estimate

**LOW**

Single builder can handle both screens (simple forms and data display).

### Success Criteria

- [ ] Lobby screen (`/`) with player count slider (8-12) and "Create Game" button
- [ ] Lobby creates game via POST `/api/game/create` and navigates to `/game/[gameId]`
- [ ] Game Over screen (`/game/[gameId]/results`) fetches results and displays winner
- [ ] Game Over shows all player roles revealed
- [ ] Game Over shows full transcript (all discussion messages + votes)
- [ ] "New Game" button navigates back to lobby
- [ ] Both screens are responsive (mobile-first)

### Files to Create

- `app/app/page.tsx` - Lobby screen (120-150 lines)
- `app/app/game/[gameId]/results/page.tsx` - Game Over screen (200-250 lines)
- `app/components/GameOverBanner.tsx` - Winner announcement component (60-80 lines)

### Dependencies

**Depends on:** Builder-4 (API endpoints)

**Blocks:** None (can work in parallel with Builder-6)

### Implementation Notes

**Lobby Screen:**

Simple form with slider:

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function LobbyPage() {
  const [playerCount, setPlayerCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateGame = async () => {
    setLoading(true);
    const res = await fetch('/api/game/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerCount }),
    });
    const { gameId } = await res.json();

    // Start game
    await fetch(`/api/game/${gameId}/start`, { method: 'POST' });

    // Navigate to live game
    router.push(`/game/${gameId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-96">
        <h1 className="text-2xl font-bold mb-4">AI Mafia</h1>

        <label className="block mb-2">Players: {playerCount}</label>
        <input
          type="range"
          min="8"
          max="12"
          value={playerCount}
          onChange={e => setPlayerCount(Number(e.target.value))}
          className="w-full mb-4"
        />

        <Button onClick={handleCreateGame} disabled={loading}>
          {loading ? 'Creating...' : 'Create Game'}
        </Button>
      </Card>
    </div>
  );
}
```

**Game Over Screen:**

Fetch results and display:

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameOverBanner } from '@/components/GameOverBanner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/game/${gameId}/results`)
      .then(res => res.json())
      .then(setResults);
  }, [gameId]);

  if (!results) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <GameOverBanner winner={results.game.winner} />

      <Card className="mt-8">
        <h2 className="text-xl font-bold mb-4">Player Roles</h2>
        <div className="grid grid-cols-2 gap-4">
          {results.players.map((player: any) => (
            <div key={player.id} className="flex justify-between items-center">
              <span>{player.name}</span>
              <Badge variant={player.role === 'MAFIA' ? 'mafia' : 'villager'}>
                {player.role}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-8">
        <h2 className="text-xl font-bold mb-4">Full Transcript</h2>
        <div className="space-y-2">
          {results.messages.map((msg: any) => (
            <div key={msg.id}>
              <strong>{msg.player.name}:</strong> {msg.message}
            </div>
          ))}
        </div>
      </Card>

      <Button onClick={() => router.push('/')} className="mt-8">
        New Game
      </Button>
    </div>
  );
}
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use **UI Component Primitives** (Card, Button, Badge)
- Follow **Page-Level Data Fetching** pattern
- Use **Mobile-First Responsive** design

### Testing Requirements

- Manual test: Create game with different player counts (8, 10, 12)
- Manual test: Navigate from lobby to game to results
- Manual test: Verify roles revealed only on results page
- Visual test: Check responsive layout on mobile (375px width)
- Coverage target: N/A (UI components, manual testing sufficient)

### Potential Split Strategy

**NOT RECOMMENDED** - Both screens are simple. Keep as single builder (2-3 hours).

---

## Builder-6: Live Game Screen (HIGH COMPLEXITY - CONSIDER SPLIT)

### Scope

Build the main spectator interface showing all game phases in real-time: phase indicator, player grid, discussion feed, vote tally panel. This is the most complex UI component.

### Complexity Estimate

**HIGH**

Recommend considering split into 3 sub-builders if single builder struggles after 2 hours.

### Success Criteria

- [ ] Live Game screen (`/game/[gameId]`) displays current phase with countdown timer
- [ ] Player grid shows 8-12 players with alive/dead status (dynamic count)
- [ ] Discussion feed scrolls automatically as messages arrive
- [ ] Vote tally panel appears during VOTING phase, updates in real-time
- [ ] Phase transitions visible within 1 second via SSE
- [ ] Late-joining spectators see current state + future events (state catchup)
- [ ] SSE connection with polling fallback after 3 failures
- [ ] Shared SSE context (single EventSource per spectator)
- [ ] Mobile-first responsive layout (vertical stack → 3-column on desktop)

### Files to Create

- `app/app/game/[gameId]/page.tsx` - Live Game screen (250-300 lines)
- `app/contexts/GameEventsContext.tsx` - Shared SSE connection provider (150-180 lines)
- `app/components/VoteTally.tsx` - Vote counter panel (120-150 lines)
- Modify `app/components/PhaseIndicator.tsx` - Enhance with phase-specific colors/icons
- Modify `app/components/PlayerGrid.tsx` - Support 8-12 dynamic player count
- Modify `app/components/DiscussionFeed.tsx` - Add accusation highlighting (optional enhancement)

### Dependencies

**Depends on:** Builder-4 (API endpoints), Builders 2-3 (game logic emitting SSE events)

**Blocks:** None (last UI builder)

### Implementation Notes

**Layout Strategy:**

Mobile-first responsive grid:

```typescript
<div className="min-h-screen bg-gray-100 p-4">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Phase indicator + Player grid */}
    <div className="md:col-span-1 lg:col-span-1 space-y-4">
      <PhaseIndicator gameId={gameId} />
      <PlayerGrid gameId={gameId} />
    </div>

    {/* Discussion feed */}
    <div className="md:col-span-1 lg:col-span-1">
      <DiscussionFeed gameId={gameId} />
    </div>

    {/* Vote tally (conditional) */}
    {currentPhase === 'VOTING' && (
      <div className="md:col-span-2 lg:col-span-1">
        <VoteTally gameId={gameId} />
      </div>
    )}
  </div>
</div>
```

**Shared SSE Context Pattern:**

Create context to share single EventSource connection:

```typescript
// app/contexts/GameEventsContext.tsx
export function GameEventsProvider({ gameId, children }) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // 1. Fetch initial state
  useEffect(() => {
    fetch(`/api/game/${gameId}/state`)
      .then(res => res.json())
      .then(state => {
        setEvents(stateToEvents(state));
        setInitialStateFetched(true);
      });
  }, [gameId]);

  // 2. Connect SSE
  useEffect(() => {
    const es = new EventSource(`/api/game/${gameId}/stream`);
    es.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setEvents(prev => [...prev, event]);
    };
    return () => es.close();
  }, [gameId]);

  return (
    <GameEventsContext.Provider value={{ events, isConnected }}>
      {children}
    </GameEventsContext.Provider>
  );
}

// Usage in components
const { events } = useGameEvents();
const phaseEvents = events.filter(e => e.type === 'phase_change');
```

**State Catchup:**

Queue events during initial state fetch to prevent race condition:

```typescript
const [eventQueue, setEventQueue] = useState<GameEvent[]>([]);
const [initialStateFetched, setInitialStateFetched] = useState(false);

// Queue events until initial state ready
es.onmessage = (e) => {
  const event = JSON.parse(e.data);
  if (initialStateFetched) {
    setEvents(prev => [...prev, event]);
  } else {
    setEventQueue(prev => [...prev, event]);
  }
};

// Apply queued events after initial state loads
useEffect(() => {
  if (initialStateFetched) {
    eventQueue.forEach(event => setEvents(prev => [...prev, event]));
    setEventQueue([]);
  }
}, [initialStateFetched]);
```

**Polling Fallback:**

Switch to polling after 3 SSE failures:

```typescript
const [sseFailures, setSseFailures] = useState(0);
const [usePolling, setUsePolling] = useState(false);

useEffect(() => {
  if (usePolling) {
    const interval = setInterval(() => {
      fetch(`/api/game/${gameId}/events?since=${lastEventId}`)
        .then(res => res.json())
        .then(events => events.forEach(applyEvent));
    }, 2000);
    return () => clearInterval(interval);
  } else {
    const es = new EventSource(`/api/game/${gameId}/stream`);
    es.onerror = () => {
      setSseFailures(f => {
        if (f + 1 >= 3) setUsePolling(true);
        return f + 1;
      });
    };
    return () => es.close();
  }
}, [usePolling]);
```

**Vote Tally Component:**

Real-time vote aggregation:

```typescript
export function VoteTally({ gameId }: { gameId: string }) {
  const { events } = useGameEvents();
  const voteEvents = events.filter(e => e.type === 'vote_cast');

  // Aggregate votes
  const tally = voteEvents.reduce((acc, event) => {
    const targetId = event.payload.targetId;
    acc[targetId] = (acc[targetId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxVotes = Math.max(...Object.values(tally));

  return (
    <Card>
      <h3 className="text-lg font-bold mb-2">Vote Tally</h3>
      {Object.entries(tally).map(([playerId, count]) => (
        <div key={playerId} className="flex justify-between mb-2">
          <span>{getPlayerName(playerId)}</span>
          <span className={count === maxVotes ? 'text-red-600 font-bold' : ''}>
            {count} votes
          </span>
        </div>
      ))}
    </Card>
  );
}
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use **State Catchup Pattern** (section: State Catchup Pattern)
- Use **Shared SSE Context** (GameEventsProvider)
- Follow **Mobile-First Responsive** design
- Use **UI Component Primitives** (Card, Button, Badge)

### Testing Requirements

- Manual test: Open 3 browser tabs, verify all see same events
- Manual test: Join mid-game, verify state catchup works
- Manual test: Block SSE in DevTools, verify polling fallback activates
- Visual test: Test responsive layout on mobile (375px), tablet (768px), desktop (1920px)
- Performance test: Monitor memory usage over 1-hour game (check for leaks)
- Coverage target: N/A (UI components, manual testing sufficient)

### Potential Split Strategy (RECOMMENDED)

If complexity proves too high after 2 hours, split into 3 sub-builders:

**Sub-builder 6A: Layout + Phase + Players (Foundation)**
- Page shell with responsive grid
- PhaseIndicator enhancements (colors, icons)
- PlayerGrid dynamic count (8-12 players)
- Estimated: 1.5 hours

**Sub-builder 6B: Discussion Feed + Vote Tally**
- Enhanced DiscussionFeed (accusation highlighting)
- VoteTally component (real-time aggregation)
- Conditional rendering (show VoteTally in VOTING phase)
- Estimated: 1.5 hours

**Sub-builder 6C: SSE Infrastructure**
- GameEventsContext provider
- State catchup logic
- Polling fallback
- Connection status indicator
- Estimated: 1.5 hours

**Coordination:**
- All sub-builders import `useGameEvents()` hook from Sub-builder 6C
- Sub-builder 6C completes context first, provides hook interface
- Sub-builders 6A and 6B work in parallel after 6C completes

**Total time with split:** 3-4 hours (slightly longer than single builder due to coordination, but reduces risk)

---

## Builder Execution Order

### Parallel Group 1: Foundation (Sequential)

**Builder-1 (4 hours):** Master orchestrator, database migration, event types

Must complete before other builders can start.

### Parallel Group 2: Game Logic (Parallel)

**Builder-2 (3-4 hours):** Night phase orchestration
**Builder-3 (3-4 hours):** Voting, Day, Win conditions

Can work simultaneously after Builder-1 completes.

### Parallel Group 3: API & UI (Parallel)

**Builder-4 (2-3 hours):** API endpoints, role assignment
**Builder-5 (2-3 hours):** Lobby + Results screens
**Builder-6 (2-3 hours or SPLIT to 3-4 hours):** Live Game screen

Can work simultaneously after Builder-1 completes (Builder-4 needs Builders 2-3 for `/start` endpoint, but can stub initially).

### Integration Phase (1-2 hours)

**Integrator:** Replace mocked phases in master orchestrator with real implementations. Run full game tests.

**Order:**
1. Integrate Builder-2 (Night phase)
2. Integrate Builder-3 (Voting + Day + Win)
3. Test full game loop via CLI
4. Connect UI builders (4, 5, 6)
5. End-to-end test via browser

---

## Integration Notes

**Critical Integration Points:**

1. **Builder-1 → Builders 2-3:** Phase orchestrator interfaces must match exactly
2. **Builders 2-3 → Builder-1:** Event emissions must use correct event types
3. **Builder-4 → Builders 5-6:** API response types must match UI expectations
4. **Builder-6 → Builders 2-3:** SSE event types must match emitted events

**Shared Files (Coordination Required):**

- `src/lib/events/types.ts` - Builder-1 extends, all others consume
- `app/prisma/schema.prisma` - Builder-1 modifies, all others use
- `src/lib/events/emitter.ts` - All builders use same instance

**Testing Strategy:**

- Builder-1: Test with mocked phases first
- Builders 2-3: Test phases in isolation via CLI
- Builder-4: Test API endpoints via curl/Postman
- Builders 5-6: Test UI with mock data initially
- Integration: Test full flow end-to-end

**Risk Mitigation:**

- Define interfaces early (Builder-1 responsibility)
- Daily sync between parallel builders
- Integration builder validates compatibility
- CLI test harness catches issues before UI testing

---

## Timeline Summary

**Sequential Foundation (4 hours):**
- Builder-1: 4 hours

**Parallel Phase 1 (3-4 hours max, parallel):**
- Builder-2: 3-4 hours
- Builder-3: 3-4 hours

**Parallel Phase 2 (2-3 hours max, parallel):**
- Builder-4: 2-3 hours
- Builder-5: 2-3 hours
- Builder-6: 2-3 hours (or 3-4 if split)

**Integration (1-2 hours):**
- Replace mocks, connect components, test end-to-end

**Total Duration:** 14-16 hours (accounting for parallel work)

**Critical Path:** Builder-1 → Builder-2/3 → Integration → Validation

---

## Success Validation

**Before declaring iteration complete:**

- [ ] Run CLI test harness: `npm run test-full-game` - completes successfully
- [ ] Play 5 full games via UI with different player counts (8, 10, 12)
- [ ] Verify both win conditions triggered (Mafia wins at least once, Villagers win at least once)
- [ ] Verify agents reference previous rounds in later discussions (memory test)
- [ ] Verify cost per game under $5 (check prompt caching hit rate >70%)
- [ ] Verify SSE delivers messages under 1 second latency
- [ ] Verify Night phase messages never visible to Villagers or spectators
- [ ] Load test: 10 concurrent spectators via SSE - no crashes
- [ ] Database integrity check: No orphaned records, all foreign keys valid

**Quality Gates:**

- [ ] At least 70% of votes reference Discussion arguments (not random)
- [ ] Zero Night message leaks to Villagers (audit all queries)
- [ ] Zero crashes during 5 consecutive full games
- [ ] Phase transitions visible on UI within 1 second
- [ ] All event types emitted correctly (check SSE logs)
