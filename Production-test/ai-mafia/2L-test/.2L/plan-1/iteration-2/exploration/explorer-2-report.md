# Explorer 2 Report: Night Phase, Voting Phase, and Win Conditions

## Executive Summary

This report explores the implementation approach for the remaining game phases: Night Phase (Mafia coordination), Voting Phase (elimination decisions), and Win Condition checking. Key findings: (1) Night phase can reuse 80% of Discussion orchestrator with privacy modifications, (2) Voting requires sequential execution with consensus algorithm, (3) Win conditions need atomic checking after each elimination, (4) Role assignment follows standard Mafia ratios (25-33% Mafia).

## Discoveries

### Night Phase Architecture

**Pattern:** Private discussion phase restricted to Mafia agents only

**Key Characteristics:**
- Duration: 30-45 seconds (shorter than day discussion)
- Participants: Only Mafia agents (2-4 agents depending on player count)
- Output: Consensus vote on victim (Villager to eliminate)
- Privacy: Messages never exposed to Villagers or spectator UI
- Optimization: Can parallelize initial proposals, then sequential voting

**Storage Strategy:**
- Use existing `DiscussionMessage` table with new field or flag
- Add `isPrivate: Boolean @default(false)` to schema
- Alternative: Separate `NightMessage` table (cleaner separation)
- Query pattern: `WHERE gameId AND roundNumber AND isPrivate = true`

**Orchestration Reuse:**
- Reuse `turn-scheduler.ts` logic with filtered player list
- Reuse `turn-executor.ts` with modified context builder
- Reuse event emitter pattern (but don't broadcast to spectators)
- NEW: Add consensus voting algorithm at end of night phase

### Voting Phase Architecture

**Pattern:** Sequential voting where each agent casts one vote with justification

**Key Characteristics:**
- Duration: 45-60 seconds total
- Execution: Sequential (not parallel) to allow agents to see prior votes
- Context: Full Discussion history + voting history from all previous rounds
- Output: Vote justification (50-100 tokens) explaining reasoning
- Tally: Simple majority, ties broken randomly (MVP) or revote (Stage 2)

**Vote Storage:**
- Use existing `Vote` table (already in schema from Iteration 1)
- Fields: `voterId`, `targetId`, `justification`, `roundNumber`, `timestamp`
- Index: `(gameId, roundNumber)` for fast round-specific queries
- Index: `(gameId, targetId)` for accusation pattern analysis

**Voting Algorithm:**
```typescript
// Pseudo-code for voting phase
async function runVotingPhase(gameId: string, roundNumber: number) {
  const alivePlayers = await getAlivePlayers(gameId);
  
  // Sequential voting (each agent sees prior votes)
  for (const voter of alivePlayers) {
    const context = await buildVotingContext(voter.id, gameId);
    const { targetId, justification } = await generateVote(context);
    
    await prisma.vote.create({
      data: { gameId, roundNumber, voterId: voter.id, targetId, justification }
    });
    
    // Broadcast vote to spectators in real-time
    gameEventEmitter.emit('vote_cast', { gameId, voter, target, justification });
  }
  
  // Tally votes
  const tally = await tallyVotes(gameId, roundNumber);
  const eliminated = tally.majority || selectRandom(tally.ties);
  
  // Mark player as dead
  await prisma.player.update({
    where: { id: eliminated.id },
    data: { isAlive: false }
  });
  
  // Broadcast elimination
  gameEventEmitter.emit('player_eliminated', { gameId, eliminated });
  
  return eliminated;
}
```

**Tie-Breaking Strategy:**
- **MVP (Iteration 2):** Random selection from tied players
- **Stage 2 (Iteration 3):** Revote with only tied players as options
- Implementation: Use `Math.floor(Math.random() * tiedPlayers.length)`
- Rationale: Random is simpler, revote adds complexity without major gameplay benefit

### Day Announcement Phase

**Pattern:** Brief phase to reveal night victim and collect reactions

**Key Characteristics:**
- Duration: 10-15 seconds
- Execution: Sequential agent reactions (1-2 sentences each)
- Context: "Agent X was eliminated last night. React briefly."
- Output: Short emotional/strategic reactions from each alive agent
- Database: Mark victim as `isAlive = false`

**Implementation Approach:**
```typescript
async function runDayAnnouncementPhase(gameId: string, victim: Player) {
  // Mark victim as dead
  await prisma.player.update({
    where: { id: victim.id },
    data: { isAlive: false }
  });
  
  // Broadcast death event
  gameEventEmitter.emit('player_eliminated', { 
    gameId, 
    player: victim, 
    cause: 'NIGHT_KILL' 
  });
  
  // Get brief reactions from alive players
  const alivePlayers = await getAlivePlayers(gameId);
  for (const player of alivePlayers) {
    const reaction = await generateReaction(player.id, gameId, victim);
    
    await prisma.discussionMessage.create({
      data: {
        gameId,
        playerId: player.id,
        roundNumber,
        message: reaction.text,
        turn: getTurnNumber(),
        isPrivate: false
      }
    });
  }
}
```

**Agent Prompt for Reactions:**
```
System: Agent {victim.name} was eliminated last night by the Mafia.

Instruction: React to this news in 1-2 sentences. If you're Mafia, act surprised 
and blend in. If you're a Villager, express shock or suspicion. Keep it brief.
```

### Win Condition Logic

**Conditions:**
1. **Villagers Win:** All Mafia eliminated (`mafiaCount === 0`)
2. **Mafia Wins:** Mafia count >= Villager count (`mafiaCount >= villagerCount`)

**Checking Algorithm:**
```typescript
async function checkWinCondition(gameId: string): Promise<{
  hasWinner: boolean;
  winner: 'MAFIA' | 'VILLAGERS' | null;
  reason: string;
}> {
  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true }
  });
  
  const mafiaCount = alivePlayers.filter(p => p.role === 'MAFIA').length;
  const villagerCount = alivePlayers.filter(p => p.role === 'VILLAGER').length;
  
  // Villagers win: All Mafia eliminated
  if (mafiaCount === 0) {
    return {
      hasWinner: true,
      winner: 'VILLAGERS',
      reason: 'All Mafia members have been eliminated'
    };
  }
  
  // Mafia wins: Mafia count >= Villager count
  if (mafiaCount >= villagerCount) {
    return {
      hasWinner: true,
      winner: 'MAFIA',
      reason: 'Mafia now equals or outnumbers Villagers'
    };
  }
  
  // Game continues
  return {
    hasWinner: false,
    winner: null,
    reason: ''
  };
}
```

**When to Check:**
- After Day Announcement Phase (night victim revealed)
- After Voting Phase (day elimination completed)
- NOT during Discussion or Night phases (no eliminations occur)

**State Update on Win:**
```typescript
async function handleGameOver(gameId: string, winner: 'MAFIA' | 'VILLAGERS') {
  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'GAME_OVER',
      winner,
      currentPhase: 'GAME_OVER'
    }
  });
  
  gameEventEmitter.emit('game_over', { 
    gameId, 
    winner,
    players: await getPlayers(gameId) // Include role reveals
  });
}
```

### Role Assignment Strategy

**Standard Mafia Ratios (25-33% Mafia):**

| Player Count | Mafia Count | Villager Count | Mafia % |
|--------------|-------------|----------------|---------|
| 8            | 2           | 6              | 25%     |
| 9            | 3           | 6              | 33%     |
| 10           | 3           | 7              | 30%     |
| 11           | 3           | 8              | 27%     |
| 12           | 4           | 8              | 33%     |

**Implementation:**
```typescript
function calculateMafiaCount(totalPlayers: number): number {
  // Use 25-33% ratio
  if (totalPlayers <= 8) return 2;
  if (totalPlayers <= 10) return 3;
  return 4; // 11-12 players
}

async function assignRoles(gameId: string, playerCount: number) {
  const mafiaCount = calculateMafiaCount(playerCount);
  
  // Create role pool
  const roles: ('MAFIA' | 'VILLAGER')[] = [];
  for (let i = 0; i < mafiaCount; i++) roles.push('MAFIA');
  for (let i = 0; i < playerCount - mafiaCount; i++) roles.push('VILLAGER');
  
  // Fisher-Yates shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  // Assign to players
  const players = await prisma.player.findMany({
    where: { gameId },
    orderBy: { position: 'asc' }
  });
  
  for (let i = 0; i < players.length; i++) {
    await prisma.player.update({
      where: { id: players[i].id },
      data: { role: roles[i] }
    });
  }
}
```

**Role Hiding:**
- Roles stored in database but NEVER sent to client until game over
- UI shows "???" or hidden role until `status === 'GAME_OVER'`
- API endpoint: `GET /api/game/[gameId]/roles` returns 403 unless game over

## Patterns Identified

### Pattern 1: Phase Orchestration State Machine

**Description:** Game progresses through phases with automatic transitions

**State Transitions:**
```
LOBBY → NIGHT → DAY_ANNOUNCEMENT → DISCUSSION → VOTING → WIN_CHECK
                    ↑___________________|
                    (if no winner)
```

**Implementation:**
```typescript
type GamePhase = 
  | 'LOBBY' 
  | 'NIGHT' 
  | 'DAY_ANNOUNCEMENT' 
  | 'DISCUSSION' 
  | 'VOTING' 
  | 'WIN_CHECK' 
  | 'GAME_OVER';

async function transitionToNextPhase(gameId: string, currentPhase: GamePhase) {
  const nextPhase = getNextPhase(currentPhase);
  
  await prisma.game.update({
    where: { id: gameId },
    data: { 
      currentPhase: nextPhase,
      phaseEndTime: calculatePhaseEndTime(nextPhase)
    }
  });
  
  gameEventEmitter.emit('phase_change', { 
    gameId, 
    from: currentPhase, 
    to: nextPhase 
  });
  
  // Execute phase logic
  switch (nextPhase) {
    case 'NIGHT':
      await runNightPhase(gameId);
      break;
    case 'DAY_ANNOUNCEMENT':
      await runDayAnnouncementPhase(gameId);
      break;
    case 'DISCUSSION':
      await runDiscussionPhase(gameId);
      break;
    case 'VOTING':
      await runVotingPhase(gameId);
      break;
    case 'WIN_CHECK':
      await checkAndHandleWinCondition(gameId);
      break;
  }
}
```

**Use Case:** Automatic game loop progression

**Recommendation:** Use this pattern - clean separation of phases

### Pattern 2: Consensus Voting Algorithm

**Description:** Mafia agents vote on victim, majority determines target

**Algorithm:**
```typescript
interface VoteResult {
  target: Player | null;
  voteCount: Map<string, number>;
  isTie: boolean;
  tiedPlayers?: Player[];
}

async function runMafiaVoting(gameId: string, roundNumber: number): Promise<VoteResult> {
  const mafiaAgents = await prisma.player.findMany({
    where: { gameId, role: 'MAFIA', isAlive: true }
  });
  
  const votes: Map<string, number> = new Map();
  
  // Each Mafia votes sequentially
  for (const mafia of mafiaAgents) {
    const targetId = await getMafiaVote(mafia.id, gameId);
    votes.set(targetId, (votes.get(targetId) || 0) + 1);
  }
  
  // Find majority
  let maxVotes = 0;
  let winners: string[] = [];
  
  for (const [playerId, count] of votes.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      winners = [playerId];
    } else if (count === maxVotes) {
      winners.push(playerId);
    }
  }
  
  // Handle ties
  if (winners.length > 1) {
    const randomIndex = Math.floor(Math.random() * winners.length);
    return {
      target: await prisma.player.findUnique({ where: { id: winners[randomIndex] } }),
      voteCount: votes,
      isTie: true,
      tiedPlayers: await prisma.player.findMany({ where: { id: { in: winners } } })
    };
  }
  
  return {
    target: await prisma.player.findUnique({ where: { id: winners[0] } }),
    voteCount: votes,
    isTie: false
  };
}
```

**Use Case:** Night phase victim selection

**Recommendation:** Use sequential voting to allow agents to coordinate

### Pattern 3: Context Builder Extension for Voting

**Description:** Extend context builder to include voting-specific context

**Implementation:**
```typescript
function buildVotingContext(playerId: string, gameId: string): Promise<AgentContext> {
  const baseContext = await buildAgentContext(playerId, gameId);
  
  // Add voting-specific context
  const votingPrompt = `
VOTING PHASE:

You must now vote to eliminate one player. Choose the player you think is most 
likely to be Mafia based on the Discussion phase.

Instructions:
1. State who you're voting for
2. Provide 2-3 sentence justification citing specific evidence
3. Be decisive - you must vote for someone

Format your response as:
"I vote for Agent-X because [justification]."
`;
  
  return {
    ...baseContext,
    conversationContext: [
      ...baseContext.conversationContext,
      { role: 'user', content: votingPrompt }
    ]
  };
}
```

**Use Case:** Generate agent votes with justifications

**Recommendation:** Use this pattern to inject phase-specific instructions

### Pattern 4: Night Phase Privacy Filter

**Description:** Filter messages by privacy flag to prevent leaks

**Database Addition:**
```prisma
model DiscussionMessage {
  // ... existing fields
  isPrivate Boolean @default(false)  // NEW: Mark night phase messages
  phase     String  @default("DISCUSSION")  // NEW: Track which phase
  
  @@index([gameId, isPrivate])  // NEW: Optimize private message queries
}
```

**Query Pattern:**
```typescript
// Fetch only public messages for spectator UI
const publicMessages = await prisma.discussionMessage.findMany({
  where: { 
    gameId, 
    isPrivate: false  // Exclude night phase coordination
  },
  orderBy: { timestamp: 'asc' }
});

// Fetch night messages for Mafia agent context only
const nightMessages = await prisma.discussionMessage.findMany({
  where: { 
    gameId, 
    roundNumber,
    isPrivate: true,
    player: { role: 'MAFIA' }  // Only visible to Mafia
  },
  orderBy: { timestamp: 'asc' }
});
```

**Use Case:** Keep Mafia coordination private

**Recommendation:** Use `isPrivate` flag - simpler than separate table

## Complexity Assessment

### High Complexity Areas

**Phase Orchestration State Machine (HIGH - 3 sub-builders recommended)**
- Complexity: Managing phase transitions, timers, and error recovery
- Components: Phase state manager, transition logic, timer scheduling
- Estimated effort: 4-6 hours
- Split recommendation:
  - Sub-builder A: State machine core + phase transitions
  - Sub-builder B: Night phase orchestration
  - Sub-builder C: Voting phase orchestration

**Night Phase Implementation (MEDIUM-HIGH - 2 sub-builders)**
- Complexity: Privacy filtering, consensus algorithm, context modifications
- Components: Privacy filter, Mafia-only orchestrator, victim selection
- Estimated effort: 3-4 hours
- Split recommendation:
  - Sub-builder A: Privacy filtering + database changes
  - Sub-builder B: Night orchestration + consensus voting

**Voting Phase with Sequential Execution (MEDIUM)**
- Complexity: Sequential voting, tally algorithm, tie-breaking
- Components: Vote context builder, sequential executor, tally calculator
- Estimated effort: 2-3 hours
- Split recommendation: Single builder can handle (use Discussion orchestrator as template)

### Medium Complexity Areas

**Win Condition Checker (LOW-MEDIUM)**
- Complexity: Simple counting logic, atomic state updates
- Effort: 1-2 hours
- Recommendation: Single builder, straightforward implementation

**Day Announcement Phase (LOW-MEDIUM)**
- Complexity: Brief reactions, death reveal
- Effort: 1-2 hours
- Recommendation: Single builder, reuse Discussion executor pattern

**Role Assignment (LOW)**
- Complexity: Simple Fisher-Yates shuffle, standard ratios
- Effort: 30-60 minutes
- Recommendation: Single builder, can be part of game initialization

### Low Complexity Areas

**Vote Tally UI Component (LOW)**
- Complexity: Display vote counts, highlight majority
- Effort: 1 hour
- Recommendation: Single builder, straightforward React component

**Game Over Screen (LOW)**
- Complexity: Display winner, reveal roles
- Effort: 1 hour
- Recommendation: Single builder, basic UI rendering

## Technology Recommendations

### Primary Stack (Iteration 1 Validated)

**Framework:** Next.js 14 App Router
- Rationale: Already validated in Iteration 1, no change needed
- Server Components for game state, Client Components for real-time UI

**Database:** SQLite + Prisma
- Rationale: Proven in Iteration 1, excellent performance for single-game scenario
- Add `isPrivate` field to `DiscussionMessage` (no new tables needed)
- Add `phase` field to track message origin

**Claude API:** claude-sonnet-4.5-20250929
- Rationale: Same model as Iteration 1, maintain consistency
- Reuse prompt caching strategy (73% cost reduction verified)
- Temperature: 0.8 (same as Discussion phase)
- Max tokens: 150-200 (same for voting, 50-75 for reactions)

### Supporting Libraries

**No New Dependencies Required:**
- Reuse existing Discussion orchestrator (80% code reuse for Night phase)
- Reuse event emitter pattern (add 'vote_cast', 'player_eliminated' events)
- Reuse turn executor pattern (modify context for voting/night phases)

**Potential Addition (Optional):**
- `date-fns` for phase timer calculations (if not already included)
- Rationale: Better date manipulation than raw Date objects

## Integration Points

### Internal Integrations

**Discussion Orchestrator ↔ Phase State Machine**
- Connection: Discussion phase is one state in game loop
- Integration: `runDiscussionPhase()` called by state machine
- Data flow: State machine passes `gameId`, orchestrator returns stats
- Challenge: Integrate Iteration 1 Discussion as isolated phase

**Voting Phase ↔ Win Condition Checker**
- Connection: After voting, check if game is over
- Integration: Sequential execution, blocking
- Data flow: Voting phase marks player dead → Win checker counts roles
- Challenge: Atomic transaction to prevent race conditions

**Night Phase ↔ Day Announcement**
- Connection: Night victim revealed in Day phase
- Integration: Night phase stores victim ID → Day phase fetches and reveals
- Data flow: `nightVictim` field in Game table or separate NightAction table
- Challenge: Privacy - ensure victim not leaked before Day phase

### Database Integration Points

**Game State Management:**
```prisma
model Game {
  // ... existing fields
  currentPhase  String?   // NEW: Track current phase
  phaseEndTime  DateTime? // EXISTING: Phase timer
  nightVictim   String?   // NEW: Store night victim ID (cleared after Day reveal)
  
  // Add relation
  nightVictimPlayer Player? @relation("NightVictim", fields: [nightVictim], references: [id])
}
```

**Message Privacy:**
```prisma
model DiscussionMessage {
  // ... existing fields
  isPrivate Boolean @default(false)  // NEW
  phase     String  @default("DISCUSSION")  // NEW: "DISCUSSION" | "NIGHT" | "DAY"
  
  @@index([gameId, isPrivate])  // NEW
}
```

**Vote Tracking (Already Exists):**
```prisma
model Vote {
  // No changes needed - schema already supports voting phase
  // Just add type field to distinguish day votes from night votes
  voteType  String @default("DAY")  // NEW: "DAY" | "NIGHT"
}
```

## Risks & Challenges

### Technical Risks

**Risk: Phase Transition Deadlocks**
- Impact: HIGH - Game stuck in phase, can't progress
- Likelihood: MEDIUM - Complex state machine with async operations
- Mitigation Strategy:
  - Implement phase timeout (force transition after max duration)
  - Add manual reset endpoint for testing (`POST /api/game/[gameId]/reset-phase`)
  - Use database transactions for atomic phase transitions
  - Log all phase transitions for debugging

**Risk: Night Phase Privacy Leaks**
- Impact: CRITICAL - Spoils game if Villagers see Mafia coordination
- Likelihood: LOW - Simple boolean flag check
- Mitigation Strategy:
  - Always filter by `isPrivate: false` in spectator queries
  - Add unit tests for privacy filter
  - Code review: Ensure no SSE events broadcast night messages
  - Audit all message query patterns

**Risk: Vote Tally Calculation Errors**
- Impact: MEDIUM - Wrong player eliminated, breaks game logic
- Likelihood: LOW - Simple counting algorithm
- Mitigation Strategy:
  - Write comprehensive unit tests (ties, unanimous votes, close votes)
  - Log full vote tally before elimination
  - Add validation: Ensure eliminated player exists and is alive

### Complexity Risks

**Risk: State Machine Complexity**
- Challenge: Managing 7 phases with timers, errors, and edge cases
- Builder Split Recommendation: YES - Split into 3 sub-builders
  - Sub-builder 1: Core state machine (transitions, timers)
  - Sub-builder 2: Night phase orchestration
  - Sub-builder 3: Voting phase orchestration
- Rationale: Each sub-builder focuses on one phase type, reduces cognitive load

**Risk: Sequential Voting Performance**
- Challenge: 8-12 sequential API calls takes 40-120 seconds
- Impact: Voting phase may feel slow
- Mitigation:
  - Use timeouts (10s per agent, 5s for voting context)
  - Parallelize context building (fetch history once, reuse for all agents)
  - Optimize: Batch vote display updates (update UI every 3 votes)

## Recommendations for Planner

### 1. Reuse Discussion Orchestrator Architecture for Night Phase

**Rationale:** 80% code overlap - both are timed conversation phases

**Implementation:**
- Create `runNightPhase(gameId)` function that calls Discussion orchestrator
- Pass `mafiaOnly: true` flag to filter players
- Use `isPrivate: true` when saving messages
- Modify system prompt: "Coordinate with fellow Mafia to choose victim"
- Add consensus voting at end of night phase

**Code Reuse:**
```typescript
// Night phase is just Discussion with different players and context
async function runNightPhase(gameId: string) {
  const mafiaPlayers = await prisma.player.findMany({
    where: { gameId, role: 'MAFIA', isAlive: true }
  });
  
  // Reuse Discussion orchestrator with Mafia-only players
  const result = await runDiscussion(
    gameId,
    dependencies,
    {
      durationMinutes: 0.75,  // 45 seconds
      totalRounds: 2,         // Fewer rounds than day discussion
      players: mafiaPlayers,  // Only Mafia
      isPrivate: true         // NEW: Mark messages private
    }
  );
  
  // After discussion, run consensus vote
  const victim = await selectNightVictim(gameId);
  
  // Store victim for Day reveal
  await prisma.game.update({
    where: { id: gameId },
    data: { nightVictim: victim.id }
  });
}
```

### 2. Implement Voting Phase as Sequential Turn Execution

**Rationale:** Agents should see prior votes to make strategic decisions

**Sequential Benefits:**
- Agents can change strategy based on vote momentum
- Creates dramatic tension (vote reveals one-by-one)
- Mirrors real Mafia gameplay

**Implementation:**
```typescript
async function runVotingPhase(gameId: string, roundNumber: number) {
  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true },
    orderBy: { position: 'asc' }
  });
  
  // Sequential voting
  for (const voter of alivePlayers) {
    const { targetId, justification } = await generateVote(voter.id, gameId);
    
    await prisma.vote.create({
      data: { gameId, roundNumber, voterId: voter.id, targetId, justification }
    });
    
    // Real-time broadcast
    gameEventEmitter.emit('vote_cast', { voter, target: targetId, justification });
    
    // Small delay for dramatic effect
    await sleep(500);
  }
  
  // Tally and eliminate
  const eliminated = await tallyVotesAndEliminate(gameId, roundNumber);
  return eliminated;
}
```

### 3. Add `isPrivate` Flag to DiscussionMessage (Don't Create Separate Table)

**Rationale:** Simpler schema, easier queries, same data structure

**Schema Change:**
```prisma
model DiscussionMessage {
  // ... existing fields
  isPrivate Boolean @default(false)
  phase     String  @default("DISCUSSION")  // Track message origin
  
  @@index([gameId, isPrivate])
}
```

**Query Patterns:**
```typescript
// Public messages only (for spectators)
const publicMessages = await prisma.discussionMessage.findMany({
  where: { gameId, isPrivate: false }
});

// Night messages (for Mafia context only)
const nightMessages = await prisma.discussionMessage.findMany({
  where: { gameId, roundNumber, isPrivate: true }
});
```

### 4. Use Random Tie-Breaking for MVP (Defer Revote to Stage 2)

**Rationale:** Simpler implementation, same outcome quality

**MVP Implementation:**
```typescript
function selectFromTie(tiedPlayers: Player[]): Player {
  const randomIndex = Math.floor(Math.random() * tiedPlayers.length);
  return tiedPlayers[randomIndex];
}
```

**Stage 2 Enhancement (Optional):**
```typescript
async function runRevote(gameId: string, tiedPlayers: Player[]) {
  // Second voting round with only tied players as options
  // More complex, questionable gameplay benefit
}
```

### 5. Check Win Conditions Immediately After Each Elimination

**Rationale:** Atomic check prevents race conditions, immediate feedback

**Implementation:**
```typescript
async function handleElimination(gameId: string, eliminatedPlayer: Player) {
  // 1. Mark player dead
  await prisma.player.update({
    where: { id: eliminatedPlayer.id },
    data: { isAlive: false }
  });
  
  // 2. Immediately check win condition
  const { hasWinner, winner } = await checkWinCondition(gameId);
  
  // 3. If winner, end game
  if (hasWinner) {
    await prisma.game.update({
      where: { id: gameId },
      data: { status: 'GAME_OVER', winner }
    });
    
    gameEventEmitter.emit('game_over', { gameId, winner });
    return { gameOver: true, winner };
  }
  
  // 4. If no winner, continue to next phase
  return { gameOver: false, winner: null };
}
```

### 6. Phase Orchestrator Pattern: Single Master Controller

**Rationale:** Centralized control flow, easier debugging

**Architecture:**
```typescript
class GameOrchestrator {
  async startGame(gameId: string) {
    await this.transitionTo('NIGHT');
  }
  
  private async transitionTo(phase: GamePhase) {
    await updateGamePhase(gameId, phase);
    
    switch (phase) {
      case 'NIGHT':
        await this.runNightPhase();
        await this.transitionTo('DAY_ANNOUNCEMENT');
        break;
      
      case 'DAY_ANNOUNCEMENT':
        await this.runDayAnnouncement();
        await this.transitionTo('DISCUSSION');
        break;
      
      case 'DISCUSSION':
        await this.runDiscussion();
        await this.transitionTo('VOTING');
        break;
      
      case 'VOTING':
        const { gameOver, winner } = await this.runVoting();
        if (gameOver) {
          await this.transitionTo('GAME_OVER');
        } else {
          await this.transitionTo('NIGHT');  // Next round
        }
        break;
      
      case 'GAME_OVER':
        await this.handleGameOver();
        break;
    }
  }
}
```

### 7. Modify Agent Prompts for Night Phase and Voting

**Night Phase Prompt (Mafia-only):**
```typescript
const MAFIA_NIGHT_PROMPT = `
NIGHT PHASE - PRIVATE COORDINATION

You are meeting privately with your fellow Mafia members to choose tonight's victim.

Instructions:
1. Propose a Villager to eliminate (avoid Mafia teammates)
2. Discuss strategic reasoning (which Villager is most dangerous?)
3. Build consensus - you'll vote shortly

Keep messages brief (15-30 words). Coordinate efficiently.

Remember: Villagers cannot see this conversation. Be candid about your strategy.
`;
```

**Voting Phase Prompt:**
```typescript
const VOTING_PHASE_PROMPT = `
VOTING PHASE

Based on the Discussion, you must now vote to eliminate one player.

Instructions:
1. State: "I vote for Agent-X"
2. Provide 2-3 sentence justification citing specific evidence from Discussion
3. Be decisive - you cannot abstain

If you're Mafia: Vote strategically to eliminate Villagers and deflect suspicion from allies
If you're a Villager: Vote for who you believe is Mafia based on evidence
`;
```

### 8. Database Schema Additions

**Minimal Changes Required:**
```prisma
model Game {
  // Add these fields:
  currentPhase  String?   // Track phase state
  nightVictim   String?   // Store victim ID for Day reveal
  
  nightVictimPlayer Player? @relation("NightVictim", fields: [nightVictim], references: [id])
}

model DiscussionMessage {
  // Add these fields:
  isPrivate Boolean @default(false)
  phase     String  @default("DISCUSSION")  // "DISCUSSION" | "NIGHT" | "DAY"
  
  @@index([gameId, isPrivate])
}

model Vote {
  // Add this field:
  voteType String @default("DAY")  // "DAY" | "NIGHT"
}
```

**Migration Strategy:**
- Run `prisma migrate dev` to add new fields
- Existing Iteration 1 data compatible (new fields have defaults)

### 9. Event System Extensions

**Add New Event Types:**
```typescript
type GameEventType =
  | 'message'              // EXISTING
  | 'turn_start'           // EXISTING
  | 'turn_end'             // EXISTING
  | 'phase_change'         // EXISTING
  | 'phase_complete'       // EXISTING
  | 'discussion_complete'  // EXISTING
  | 'vote_cast'            // NEW: Agent voted
  | 'player_eliminated'    // NEW: Someone died
  | 'night_victim_revealed'// NEW: Day announcement
  | 'game_over';           // NEW: Win condition met
```

**Usage:**
```typescript
// In voting phase
gameEventEmitter.emit('vote_cast', {
  gameId,
  voter: { id, name },
  target: { id, name },
  justification,
  currentTally: { ... }
});

// After elimination
gameEventEmitter.emit('player_eliminated', {
  gameId,
  player: { id, name, role },  // Role revealed on death
  cause: 'VOTE' | 'NIGHT_KILL'
});
```

### 10. Testing Strategy

**Unit Tests:**
- Win condition checker (all edge cases)
- Vote tally algorithm (ties, unanimous, close votes)
- Role assignment (correct ratios, randomness)
- Privacy filter (ensure night messages never leak)

**Integration Tests:**
- Full game loop: LOBBY → NIGHT → DAY → DISCUSSION → VOTING → WIN
- Multiple rounds (ensure state persists correctly)
- Both win conditions (Mafia win, Villager win)

**Manual Testing:**
- Run 5+ full games with different player counts (8, 10, 12)
- Verify Mafia wins and Villager wins both occur
- Inspect night phase logs (ensure privacy maintained)
- Check spectator UI (no night messages visible)

## Resource Map

### Critical Files/Directories

**New Files (Iteration 2):**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/game/orchestrator.ts` - Main game loop controller
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/game/night-phase.ts` - Night phase orchestration
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/game/voting-phase.ts` - Voting phase orchestration
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/game/win-conditions.ts` - Win checker
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/game/day-announcement.ts` - Day phase

**Modified Files (Extend from Iteration 1):**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/prisma/schema.prisma` - Add `isPrivate`, `currentPhase` fields
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/events/types.ts` - Add new event types
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/prompts/system-prompts.ts` - Add night/voting prompts
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/claude/context-builder.ts` - Add voting context variant

**Reused Files (No Changes):**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/discussion/orchestrator.ts` - Reuse for Night phase
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/discussion/turn-executor.ts` - Reuse for all phases
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/claude/client.ts` - No changes needed

### Key Dependencies

**External:**
- `@anthropic-ai/sdk` - EXISTING (from Iteration 1)
- `@prisma/client` - EXISTING (from Iteration 1)
- `next` - EXISTING (from Iteration 1)

**Internal:**
- Iteration 1 Discussion orchestrator (HIGH dependency)
- Iteration 1 Event emitter (HIGH dependency)
- Iteration 1 Database schema (MEDIUM dependency - extend, don't replace)

### Testing Infrastructure

**Unit Test Files:**
- `app/src/lib/game/win-conditions.test.ts` - Test all win scenarios
- `app/src/lib/game/voting-phase.test.ts` - Test vote tally algorithm
- `app/src/lib/agent/manager.test.ts` - Test role assignment (EXISTING, extend)

**Integration Test:**
- `app/src/lib/game/full-game.test.ts` - NEW: End-to-end game flow test

**CLI Test Harness:**
- Extend `app/src/cli/test-discussion.ts` to run full game
- Add `app/src/cli/test-full-game.ts` - Run complete game from start to finish

## Questions for Planner

### 1. Should Night Phase Messages Be Stored in Separate Table or Use Flag?

**Option A: `isPrivate` flag on `DiscussionMessage`**
- Pros: Simpler schema, unified message queries
- Cons: Risk of accidental leaks if filter forgotten

**Option B: Separate `NightMessage` table**
- Pros: Stronger privacy guarantee, cleaner separation
- Cons: More complex queries, schema duplication

**Recommendation:** Option A (flag) - simpler, well-tested filter pattern

### 2. Should Voting Be Sequential or Parallel?

**Option A: Sequential (agents see prior votes)**
- Pros: Strategic depth, dramatic tension, natural flow
- Cons: Slower (40-120 seconds total)

**Option B: Parallel (all vote simultaneously)**
- Pros: Faster (10-20 seconds total)
- Cons: Less strategic, less dramatic

**Recommendation:** Option A (sequential) - matches real Mafia gameplay

### 3. How to Handle Night Phase Duration?

**Current Plan:** 30-45 seconds

**Question:** Is this enough time for meaningful Mafia coordination?

**Analysis:**
- 2 Mafia agents: ~4 turns each (8 total turns)
- 3 Mafia agents: ~3 turns each (9 total turns)
- At 5s/turn: 40-45 seconds total

**Recommendation:** Start with 45 seconds, adjust based on playtesting

### 4. Should Day Announcement Phase Collect Agent Reactions?

**Option A: Just reveal death, no reactions**
- Pros: Faster phase transition (instant)
- Cons: Less immersive, misses opportunity for strategic signaling

**Option B: Collect brief reactions (1-2 sentences each)**
- Pros: More immersive, agents can signal suspicions
- Cons: Adds 10-15 seconds, more API calls

**Recommendation:** Option B (with reactions) - adds depth for low cost

### 5. When to Increment Round Number?

**Option A: After each full cycle (NIGHT → DAY → DISCUSSION → VOTING)**
- Pros: Intuitive (Round 1, Round 2, etc.)
- Cons: May confuse message queries

**Option B: After each phase**
- Pros: Granular tracking
- Cons: "Round 7" sounds like more happened than it did

**Recommendation:** Option A (full cycle) - matches player mental model

### 6. Should Tie-Breaking in Voting Trigger Revote?

**Current Plan:** Random selection from tied players

**Alternative:** Revote round with only tied players

**Trade-offs:**
- Random: Simpler, faster, still fair
- Revote: More strategic, more complex, longer game

**Recommendation:** Random for MVP (Iteration 2), revote for Polish (Iteration 3)

---

**Explorer 2 Report Complete**

This exploration provides comprehensive guidance for implementing Night Phase, Voting Phase, and Win Conditions in Iteration 2. Key takeaways: Reuse Discussion orchestrator architecture (80% overlap), use sequential voting for strategic depth, add minimal schema changes (isPrivate flag), and implement clean state machine for phase management.
