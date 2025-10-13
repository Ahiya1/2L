# Explorer 1 Report: Game State Machine & Phase Orchestration

## Executive Summary

Iteration 2 must build a complete game state machine orchestrating 5 distinct phases (NIGHT → DAY_ANNOUNCEMENT → DISCUSSION → VOTING → WIN_CHECK) while seamlessly integrating the validated Discussion orchestrator from Iteration 1. The core challenge is coordinating multiple phase orchestrators with different timing mechanisms (Night: 45s AI coordination, Day: 10s reaction, Discussion: 3min debate, Voting: 45s decision-making) while maintaining conversation coherence across rounds. The existing Discussion orchestrator provides an excellent reusable pattern: sequential turn execution, event emission, timeout handling, and cost tracking can be adapted for Night and Voting phases. Database schema requires minimal changes (add phaseType, nightMessages table, eliminationType fields) to support multi-phase game flow. **Critical Success Factor:** Phase transitions must preserve game context across rounds, enabling agents to reference Night phase deaths, previous Discussion arguments, and cumulative voting patterns.

## Discoveries

### Iteration 1 Foundation Analysis

**Validated Components Ready for Integration:**
- **Discussion Orchestrator** (`src/lib/discussion/orchestrator.ts`): 247 lines, PASS status
  - Sequential turn scheduler with round-robin execution
  - Event emission pattern via `gameEventEmitter`
  - Graceful error handling (continue on turn failure)
  - Cost tracking integration
  - Configurable timing: `durationMinutes`, `totalRounds`, `turnTimeoutSeconds`
  
- **Turn Execution Pattern** (`src/lib/discussion/turn-executor.ts`): 320 lines
  - 10-second timeout with Promise.race
  - Fallback response generation on failure
  - Message validation (5-100 words, game-relevant keywords)
  - Threading logic via `determineReplyTarget`
  - Integration with Claude API via dependency injection
  
- **Event System** (`src/lib/events/emitter.ts` + types): Working EventEmitter
  - 7 event types: message, turn_start, turn_end, phase_change, phase_complete, discussion_complete
  - Max listeners: 50 (supports multiple spectators)
  - Typed event payloads with discriminated unions
  
- **Database Schema** (`app/prisma/schema.prisma`): Already includes ALL Iteration 2 tables
  - `Game.status`: "LOBBY", "NIGHT", "DAY", "DISCUSSION", "VOTING", "GAME_OVER"
  - `Game.currentPhase`, `Game.phaseEndTime`, `Game.roundNumber` - ready for state machine
  - `Vote` table: structure exists (unused in Iteration 1)
  - `GameEvent` table: structure exists with type + JSON data field
  - **Missing:** Night phase private messages table (needs creation)

**Code Reuse Opportunities:**
- Turn scheduler logic: Adapt for Night (Mafia-only turns) and Voting (one turn per player)
- Timeout handling: Same 10s limit pattern applicable to Voting phase
- Event emission: Extend event types for NIGHT, DAY_ANNOUNCEMENT, VOTING phases
- Cost tracking: Already supports gameId-based aggregation across phases

### State Machine Design Requirements

**Phase Flow:**
```
LOBBY (manual start)
  ↓
NIGHT (30-45s, Mafia private coordination)
  ↓
DAY_ANNOUNCEMENT (10s, reveal nightkill + reactions)
  ↓
DISCUSSION (3min, Iteration 1 orchestrator - REUSE)
  ↓
VOTING (45s, each agent votes + justifies)
  ↓
WIN_CHECK (instant, evaluate conditions)
  ↓ if no winner
NIGHT (round += 1, repeat)
  ↓ if winner found
GAME_OVER (persist winner, show results)
```

**Timing Mechanisms:**
- **NIGHT**: Duration-based (45 seconds max) OR completion-based (Mafia reach consensus early)
- **DAY_ANNOUNCEMENT**: Fixed duration (10 seconds) + sequential agent reactions
- **DISCUSSION**: Duration-based (3 minutes) - existing Iteration 1 implementation
- **VOTING**: Turn-based (one vote per alive player) with 10s timeout per turn
- **WIN_CHECK**: Synchronous evaluation (no timing, pure logic)

**Automatic vs Manual Transitions:**
- NIGHT → DAY_ANNOUNCEMENT: Automatic (timer expires or consensus reached)
- DAY_ANNOUNCEMENT → DISCUSSION: Automatic (10s timer expires)
- DISCUSSION → VOTING: Automatic (3min timer expires)
- VOTING → WIN_CHECK: Automatic (all votes cast)
- WIN_CHECK → NIGHT or GAME_OVER: Automatic (based on win condition)
- LOBBY → NIGHT: **Manual** (user clicks "Start Game")

### Database Schema Changes Required

**New Table: Night Phase Private Messages**
```prisma
model NightMessage {
  id          String   @id @default(cuid())
  gameId      String
  roundNumber Int
  playerId    String   // Mafia agent only
  message     String
  inReplyToId String?
  timestamp   DateTime @default(now())
  turn        Int

  game      Game          @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player    Player        @relation("NightMessageAuthor", fields: [playerId], references: [id], onDelete: Cascade)
  inReplyTo NightMessage? @relation("NightReplyThread", fields: [inReplyToId], references: [id], onDelete: SetNull)
  replies   NightMessage[] @relation("NightReplyThread")

  @@index([gameId, roundNumber, timestamp])
  @@index([gameId, playerId])
}
```

**Rationale:** Separate table prevents Villagers from accessing Mafia coordination in context queries. `DiscussionMessage` remains public, `NightMessage` is role-restricted.

**Schema Modifications to Existing Tables:**

1. **Game Table - Add Phase State Tracking:**
```prisma
model Game {
  // Existing fields...
  currentPhase      String?       // Current phase name
  phaseEndTime      DateTime?     // When current phase should end
  phaseStartTime    DateTime?     // NEW: When current phase started (for duration tracking)
  
  // NEW: Phase history for debugging
  nightMessages     NightMessage[]
}
```

2. **Player Table - Add Elimination Tracking:**
```prisma
model Player {
  // Existing fields...
  eliminatedInRound Int?          // NEW: Which round player was eliminated
  eliminationType   String?       // NEW: "NIGHTKILL", "DAYKILL", null
  
  // NEW: Relationships
  nightMessages     NightMessage[] @relation("NightMessageAuthor")
}
```

3. **Vote Table - Add Phase Context:**
```prisma
model Vote {
  // Existing fields...
  phaseType         String        // NEW: "VOTING" (distinguish from Night consensus votes if implemented)
  voteOrder         Int           // NEW: Order within voting phase (for UI display)
}
```

4. **GameEvent Table - Expand Event Types:**
```prisma
model GameEvent {
  // Existing fields...
  // type: Add "NIGHT_COMPLETE", "NIGHTKILL", "VOTING_COMPLETE", "VOTE_CAST", "ROUND_START"
  // data JSON examples:
  //   NIGHTKILL: {"victimId": "player-123", "victimName": "Agent-C", "round": 2}
  //   VOTE_CAST: {"voterId": "player-456", "targetId": "player-789", "justification": "..."}
  //   PHASE_CHANGE: {"from": "DISCUSSION", "to": "VOTING", "round": 3}
}
```

**Index Additions:**
```prisma
// For efficient Night phase queries (Mafia-only messages)
@@index([gameId, role, isAlive]) // on Player table

// For vote tallying
@@index([gameId, roundNumber, targetId]) // on Vote table
```

### Code Reuse Strategy from Iteration 1

**Pattern 1: Night Phase Orchestrator (Adapt Discussion Orchestrator)**

**Similarities to Discussion:**
- Sequential turn execution (Mafia agents take turns speaking)
- Duration-based timing (30-45 seconds vs 3 minutes)
- Event emission (turn_start, message, turn_end)
- Fallback on timeout
- Cost tracking

**Differences:**
- **Player filtering:** Only fetch Mafia agents (`role = "MAFIA"`)
- **Database table:** Save to `NightMessage` instead of `DiscussionMessage`
- **Consensus detection:** Stop early if Mafia agree on target (optional MVP enhancement)
- **Context visibility:** Mafia see Night history, Villagers DO NOT

**Reusable Functions:**
```typescript
// FROM: src/lib/discussion/turn-scheduler.ts
createTurnSchedule()      // Reuse with mafiaPlayers instead of alivePlayers
getNextPlayer()           // Same logic
advanceToNextTurn()       // Same round-robin logic
shouldContinue()          // Same time/round checks
shuffleArray()            // Same randomization
sleep()                   // Same delay utility

// FROM: src/lib/discussion/turn-executor.ts
executeTurn()             // 90% reusable, change table name
generateWithTimeout()     // 100% reusable
generateFallbackResponse() // 100% reusable
isValidMessage()          // 100% reusable (same validation rules)
```

**Implementation Strategy:**
```typescript
// NEW: src/lib/night/orchestrator.ts
import { 
  createTurnSchedule, 
  getNextPlayer, 
  advanceToNextTurn, 
  shouldContinue 
} from '@/lib/discussion/turn-scheduler'; // REUSE

export async function runNightPhase(
  gameId: string,
  dependencies: Dependencies,
  config: { durationMinutes: 0.75 } // 45 seconds
): Promise<NightResult> {
  // Fetch MAFIA players only
  const mafiaPlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true, role: 'MAFIA' },
    orderBy: { position: 'asc' },
  });

  // REUSE turn scheduler
  let schedule = createTurnSchedule(mafiaPlayers, totalRounds: 3, durationMinutes: 0.75);

  while (shouldContinue(schedule)) {
    const player = getNextPlayer(schedule);
    if (!player) break;

    // ADAPT turn executor for Night phase
    await executeNightTurn(player.id, gameId, schedule.currentRound + 1, turnCount, dependencies);

    schedule = advanceToNextTurn(schedule);
  }

  // NEW: Detect consensus on nightkill target
  const target = await detectNightKillConsensus(gameId);
  
  return { target, totalMessages: turnCount };
}
```

**Pattern 2: Voting Phase Orchestrator (Simplified Discussion Pattern)**

**Differences from Discussion:**
- **One turn per player** (no multiple rounds)
- **Structured output:** Vote target + justification (not free-form discussion)
- **Vote aggregation:** Tally votes after all cast
- **Tie-breaking:** Random selection if no majority

**Reusable Functions:**
```typescript
// FROM: src/lib/discussion/turn-executor.ts
executeTurn()             // Adapt to parse vote from response
generateWithTimeout()     // Same timeout logic
isValidMessage()          // Same validation

// NEW: Voting-specific logic
parseVoteFromResponse()   // Extract target player from Claude response
tallyVotes()              // Count votes per player
determineMajority()       // Find player with most votes
breakTie()                // Random selection among tied players
```

**Implementation Strategy:**
```typescript
// NEW: src/lib/voting/orchestrator.ts
export async function runVotingPhase(
  gameId: string,
  dependencies: Dependencies
): Promise<VotingResult> {
  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true },
    orderBy: { position: 'asc' },
  });

  let voteOrder = 0;

  // One turn per player (no rounds)
  for (const player of alivePlayers) {
    voteOrder++;
    
    // Build context with full game history
    const context = await buildVotingContext(player.id, gameId);
    
    // Generate vote + justification
    const { text, usage } = await generateWithTimeout(
      () => generateResponse(context),
      10000
    );

    // Parse vote target
    const { targetId, justification } = parseVoteFromResponse(text, alivePlayers);

    // Save vote
    await prisma.vote.create({
      data: {
        gameId,
        roundNumber: game.roundNumber,
        voterId: player.id,
        targetId,
        justification,
        phaseType: 'VOTING',
        voteOrder,
      },
    });

    // Emit vote event
    gameEventEmitter.emitGameEvent('vote_cast', { /* ... */ });
  }

  // Tally votes
  const eliminatedPlayer = await tallyVotes(gameId);

  return { eliminatedPlayer };
}
```

**Pattern 3: Event Emission Extension**

**New Event Types:**
```typescript
// ADD to src/lib/events/types.ts
export type GameEventType =
  | 'message'              // Existing
  | 'turn_start'           // Existing
  | 'turn_end'             // Existing
  | 'phase_change'         // Existing
  | 'phase_complete'       // Existing
  | 'discussion_complete'  // Existing
  | 'night_start'          // NEW
  | 'night_message'        // NEW (not exposed to UI)
  | 'night_complete'       // NEW
  | 'nightkill'            // NEW
  | 'day_reaction'         // NEW
  | 'vote_cast'            // NEW
  | 'voting_complete'      // NEW
  | 'player_eliminated'    // NEW
  | 'round_start'          // NEW
  | 'game_over';           // NEW

export type GameEvent =
  | { /* existing events */ }
  | {
      gameId: string;
      type: 'NIGHTKILL';
      payload: {
        victimId: string;
        victimName: string;
        round: number;
      };
    }
  | {
      gameId: string;
      type: 'VOTE_CAST';
      payload: {
        voterId: string;
        voterName: string;
        targetId: string;
        targetName: string;
        justification: string;
        voteOrder: number;
      };
    }
  | {
      gameId: string;
      type: 'PLAYER_ELIMINATED';
      payload: {
        playerId: string;
        playerName: string;
        eliminationType: 'NIGHTKILL' | 'DAYKILL';
        round: number;
      };
    }
  | {
      gameId: string;
      type: 'GAME_OVER';
      payload: {
        winner: 'MAFIA' | 'VILLAGERS';
        finalRound: number;
        survivingMafia: string[];
        survivingVillagers: string[];
      };
    };
```

**Pattern 4: Cost Tracking Across Phases**

**Existing Cost Tracker:** (`src/utils/cost-tracker.ts`)
- Already supports gameId-based aggregation
- Tracks inputTokens, cachedTokens, outputTokens, cost per turn
- `getGameSummary(gameId)` returns total cost across all phases

**Extension Required:**
```typescript
// ADD phase-based breakdown
getGameSummary(gameId) {
  // Existing aggregation...
  
  // NEW: Per-phase breakdown
  const phaseBreakdown = {
    night: this.logs.filter(log => log.phase === 'NIGHT').reduce((sum, log) => sum + log.cost, 0),
    discussion: this.logs.filter(log => log.phase === 'DISCUSSION').reduce((sum, log) => sum + log.cost, 0),
    voting: this.logs.filter(log => log.phase === 'VOTING').reduce((sum, log) => sum + log.cost, 0),
  };

  return {
    totalCost,
    cacheHitRate,
    phaseBreakdown,
  };
}
```

### Integration Strategy with Discussion Orchestrator

**Approach 1: Master Game Orchestrator (RECOMMENDED)**

Create top-level orchestrator that manages phase transitions and delegates to phase-specific orchestrators:

```typescript
// NEW: src/lib/game/master-orchestrator.ts
import { runNightPhase } from '@/lib/night/orchestrator';
import { runDayAnnouncement } from '@/lib/day/orchestrator';
import { runDiscussion } from '@/lib/discussion/orchestrator'; // Iteration 1
import { runVotingPhase } from '@/lib/voting/orchestrator';
import { checkWinCondition } from '@/lib/game/win-checker';

export async function runGameLoop(
  gameId: string,
  dependencies: Dependencies
): Promise<GameResult> {
  let currentPhase = 'NIGHT';
  let roundNumber = 1;

  while (true) {
    // Update game state
    await updateGamePhase(gameId, currentPhase, roundNumber);

    switch (currentPhase) {
      case 'NIGHT':
        const nightResult = await runNightPhase(gameId, dependencies, {
          durationMinutes: 0.75, // 45 seconds
        });
        
        // Mark nightkill victim
        if (nightResult.target) {
          await eliminatePlayer(gameId, nightResult.target, 'NIGHTKILL', roundNumber);
        }
        
        currentPhase = 'DAY_ANNOUNCEMENT';
        break;

      case 'DAY_ANNOUNCEMENT':
        await runDayAnnouncement(gameId, dependencies, {
          durationSeconds: 10,
        });
        currentPhase = 'DISCUSSION';
        break;

      case 'DISCUSSION':
        // INTEGRATE Iteration 1 orchestrator
        await runDiscussion(gameId, dependencies, {
          durationMinutes: 3,
          totalRounds: 5,
        });
        currentPhase = 'VOTING';
        break;

      case 'VOTING':
        const votingResult = await runVotingPhase(gameId, dependencies);
        
        // Mark daykill victim
        if (votingResult.eliminatedPlayer) {
          await eliminatePlayer(gameId, votingResult.eliminatedPlayer, 'DAYKILL', roundNumber);
        }
        
        currentPhase = 'WIN_CHECK';
        break;

      case 'WIN_CHECK':
        const winner = await checkWinCondition(gameId);
        
        if (winner) {
          await finalizeGame(gameId, winner);
          return { winner, finalRound: roundNumber };
        }
        
        // Continue to next round
        roundNumber++;
        currentPhase = 'NIGHT';
        break;
    }

    // Emit phase transition event
    gameEventEmitter.emitGameEvent('phase_change', {
      gameId,
      type: 'PHASE_CHANGE',
      payload: { from: previousPhase, to: currentPhase, round: roundNumber },
    });
  }
}
```

**Approach 2: State Machine Class (Alternative)**

```typescript
// Alternative: src/lib/game/state-machine.ts
export class GameStateMachine {
  private gameId: string;
  private currentPhase: Phase;
  private roundNumber: number;

  async transition(): Promise<void> {
    const nextPhase = this.getNextPhase();
    await this.executePhase(nextPhase);
    this.currentPhase = nextPhase;
  }

  private async executePhase(phase: Phase): Promise<void> {
    switch (phase) {
      case 'NIGHT': return this.runNight();
      case 'DAY_ANNOUNCEMENT': return this.runDay();
      case 'DISCUSSION': return this.runDiscussion();
      case 'VOTING': return this.runVoting();
      case 'WIN_CHECK': return this.checkWin();
    }
  }
}
```

**Recommendation:** Use Approach 1 (Master Orchestrator) because:
- Simpler control flow (explicit state transitions)
- Easier to debug (linear execution trace)
- Better matches existing Discussion orchestrator pattern
- No need for OOP complexity

## Complexity Assessment

### High Complexity Areas

**1. Master Game Orchestrator (Phase Coordination)**
- **Complexity:** Managing 5 phase transitions with different timing mechanisms
- **Lines of Code Estimate:** 250-300 lines
- **Builder Splits:** Single builder (phase coordination is tightly coupled)
- **Risks:** 
  - Phase transition failures (e.g., Discussion crashes, blocks entire game)
  - State synchronization issues (database phase vs in-memory phase)
  - Timer overlap bugs (phase ends before agents finish turns)
- **Mitigation:**
  - Wrap each phase in try-catch with graceful degradation
  - Always update database phase state before executing phase logic
  - Add buffer time between phases (500ms delay)

**2. Night Phase Orchestrator (Mafia Coordination + Consensus)**
- **Complexity:** Filtering Mafia-only, consensus detection, private message storage
- **Lines of Code Estimate:** 200-250 lines
- **Builder Splits:** Single builder (can reuse 70% of Discussion orchestrator code)
- **Risks:**
  - Consensus algorithm complexity (when do Mafia agree on target?)
  - Mafia count edge cases (1 Mafia left = no coordination needed)
  - Private message leak (Villagers must NEVER see Night messages)
- **Mitigation:**
  - MVP: Simple consensus = most recent unanimous target mentioned
  - Skip Night phase if only 1 Mafia alive
  - Separate `NightMessage` table with role-based access control

**3. Voting Phase Orchestrator (Vote Parsing + Tallying)**
- **Complexity:** Parsing votes from Claude responses, tie-breaking logic
- **Lines of Code Estimate:** 180-220 lines
- **Builder Splits:** Single builder
- **Risks:**
  - Vote parsing failures (Claude doesn't follow format)
  - Self-voting or voting for dead players
  - Tie-breaking randomness reproducibility
- **Mitigation:**
  - Structured prompts: "Vote for exactly one alive player: [name]"
  - Validate vote target: must be alive, not self
  - Seed random generator with gameId + round for reproducible ties

### Medium Complexity Areas

**4. Day Announcement Phase (Death Reveal + Reactions)**
- **Complexity:** Generate brief reactions from all alive agents
- **Lines of Code Estimate:** 120-150 lines
- **Builder Splits:** Single builder
- **Risks:** None (simplest phase, just sequential agent turns with short responses)

**5. Win Condition Checker (Game End Logic)**
- **Complexity:** Count alive Mafia vs Villagers, determine winner
- **Lines of Code Estimate:** 80-100 lines
- **Builder Splits:** Single builder
- **Risks:**
  - Edge case: All players die simultaneously (impossible with current rules)
  - Mafia >= Villagers count (should be >= not >)

**6. Database Schema Migration (Add Night Table + Fields)**
- **Complexity:** Add 1 new table, 5 new fields, 3 new indexes
- **Lines of Code Estimate:** 60-80 lines (Prisma schema + migration)
- **Builder Splits:** Single builder
- **Risks:** Migration conflicts with existing data (mitigated: Iteration 1 has test data only)

### Low Complexity Areas

**7. Event Type Extensions (Add 8 New Event Types)**
- **Complexity:** Add discriminated union variants
- **Lines of Code Estimate:** 40-60 lines
- **Builder Splits:** Can be done by any builder
- **Risks:** None (pure type additions)

**8. Cost Tracker Phase Breakdown (Add Phase Field)**
- **Complexity:** Add `phase` field to cost logs
- **Lines of Code Estimate:** 20-30 lines
- **Builder Splits:** Can be done by any builder
- **Risks:** None (backward compatible addition)

## Technology Recommendations

### Primary Stack (Unchanged from Iteration 1)

**Framework:** Next.js 14.2.18 (App Router)
- **Rationale:** Already validated in Iteration 1, stable foundation
- **No changes needed**

**Database:** SQLite 3.x + Prisma 6.17.1
- **Rationale:** Sufficient for single-game scenario, WAL mode handles concurrent reads
- **Changes needed:** Add `NightMessage` table, modify existing tables with new fields

**AI Model:** Claude 4.5 Sonnet (`claude-sonnet-4.5-20250929`)
- **Rationale:** Validated in Iteration 1 Discussion phase
- **Prompt caching:** CRITICAL - extend to Night and Voting phases
- **Cost estimate:** 
  - Night: $0.50/round (2-4 Mafia agents × 3 turns × 45s)
  - Discussion: $1.50/round (existing validated cost)
  - Voting: $0.80/round (8-12 agents × 1 turn each)
  - **Total per game:** ~$3-4 per game (3 rounds × $2.80/round)

**Language:** TypeScript 5.6.3 (Strict Mode)
- **No changes needed**

**Real-time Updates:** Server-Sent Events (SSE)
- **Extension needed:** Add event types for NIGHT, VOTING, GAME_OVER phases
- **No architectural changes**

### Supporting Libraries (New for Iteration 2)

**None required** - All Iteration 1 dependencies sufficient for Iteration 2.

Optional enhancements (defer to Iteration 3):
- `zod` for vote parsing validation (if Claude response validation becomes complex)
- `date-fns` for phase timer formatting (already in package.json from Iteration 1)

## Integration Points

### Internal Integrations

**1. Discussion Orchestrator Integration**
- **Integration Point:** Master orchestrator calls `runDiscussion(gameId, dependencies, config)`
- **Data Flow:** Master orchestrator → Discussion orchestrator → Turn executor → Claude API
- **Shared Context:** Game history (messages, votes, deaths) passed via dependencies
- **Backward Compatibility:** Discussion orchestrator UNCHANGED (Iteration 1 code preserved)
- **Testing Strategy:** Run full game loop, verify Discussion phase executes identically to Iteration 1

**2. Event Emitter Extension**
- **Integration Point:** All phase orchestrators emit events via `gameEventEmitter`
- **Data Flow:** Phase orchestrator → Event emitter → SSE endpoint → UI
- **New Events:** NIGHTKILL, VOTE_CAST, PLAYER_ELIMINATED, GAME_OVER
- **Backward Compatibility:** Existing Discussion events unchanged
- **Testing Strategy:** Listen for all events in CLI, verify event sequence

**3. Cost Tracker Phase Breakdown**
- **Integration Point:** Each phase orchestrator calls `trackCost({ phase: 'NIGHT', ... })`
- **Data Flow:** Phase orchestrator → Cost tracker → Summary display
- **New Field:** `phase: 'NIGHT' | 'DISCUSSION' | 'VOTING'`
- **Backward Compatibility:** Existing Discussion cost tracking unchanged (add phase field with default)
- **Testing Strategy:** Run full game, verify cost breakdown shows per-phase costs

**4. Database Schema Migration**
- **Integration Point:** Prisma schema changes → migrate database → update queries
- **Data Flow:** Prisma CLI → SQLite → Prisma Client regeneration
- **Changes:** Add `NightMessage` table, add fields to `Player`, `Vote`, `Game`
- **Backward Compatibility:** Existing tables unchanged (only additions)
- **Testing Strategy:** Run migration, verify existing Iteration 1 queries still work

### External Integrations

**Claude API (No Changes from Iteration 1)**
- **Integration:** Same @anthropic-ai/sdk patterns
- **New Prompts:** Night phase prompts (Mafia coordination), Voting prompts (vote + justify)
- **Prompt Caching:** Extend to Night and Voting phases (same structure as Discussion)
- **Testing Strategy:** Verify cache hit rate >70% across all phases

## Risks & Challenges

### Technical Risks

**Risk 1: Phase Transition Failures Crash Entire Game**
- **Impact:** HIGH - One phase failure blocks all subsequent phases
- **Likelihood:** MEDIUM - Error handling in Iteration 1 is good, but multi-phase adds complexity
- **Mitigation Strategy:**
  1. Wrap each phase execution in try-catch with graceful degradation
  2. Log phase failures to database (GameEvent table)
  3. Allow manual phase skip via CLI command (debugging tool)
  4. Implement phase restart mechanism (if Night fails, retry Night once)
- **Detection:** Monitor GameEvent table for PHASE_FAILED events
- **Fallback:** Skip failed phase, continue to next phase (e.g., if Night fails, skip to Day with random nightkill)

**Risk 2: Timer Synchronization Issues (Phase Overlaps)**
- **Impact:** MEDIUM - Agents receive stale context if phase transitions before their turn completes
- **Likelihood:** MEDIUM - Discussion phase already has this risk (mitigated in Iteration 1)
- **Mitigation Strategy:**
  1. Add 500ms buffer between phases (wait for in-flight API calls to complete)
  2. Set phase timeout 5 seconds BEFORE actual duration expires (early warning)
  3. Cancel pending turns when phase transition occurs (abort Promise)
  4. Emit PHASE_ENDING event 10 seconds before phase ends (UI warning)
- **Detection:** Count incomplete turns (turn started but no message saved)
- **Fallback:** Use fallback responses for incomplete turns

**Risk 3: Night Message Privacy Leak**
- **Impact:** CRITICAL - If Villagers see Night messages, game integrity destroyed
- **Likelihood:** LOW - Separate table design prevents leak
- **Mitigation Strategy:**
  1. **NEVER** join `NightMessage` in Villager context queries
  2. Add database-level check: `WHERE role = 'MAFIA'` when querying NightMessage
  3. Add unit test: Verify Villager context contains zero Night messages
  4. Code review checklist: Grep codebase for `NightMessage` references
- **Detection:** Automated test: Create game with Mafia Night coordination, verify Villager context excludes Night data
- **Fallback:** If leak detected in production, immediately mark game as invalid, restart

**Risk 4: Vote Parsing Failures (Claude Doesn't Follow Format)**
- **Impact:** MEDIUM - Invalid votes disrupt voting phase, may cause game crash
- **Likelihood:** MEDIUM - Claude 4.5 Sonnet is good at following structured prompts, but not 100%
- **Mitigation Strategy:**
  1. Use structured prompt: "You must vote for exactly one player. Format: VOTE: [player name]"
  2. Regex parsing: `/VOTE:\s*([A-Z][a-z]+-[A-Z])/` to extract player name
  3. Validation: Check if parsed name matches alive player list
  4. Fallback: If parsing fails, random vote + log warning
  5. Retry: If vote is invalid (self-vote, dead player), retry Claude call once with clarification
- **Detection:** Count vote parsing failures per game
- **Fallback:** Random vote for unparseable responses (better than crashing)

### Complexity Risks

**Risk 5: Master Orchestrator Becomes Too Complex (300+ Lines)**
- **Impact:** MEDIUM - Hard to debug, test, and maintain
- **Likelihood:** MEDIUM - 5 phases + error handling + event emission = 250-300 lines
- **Mitigation Strategy:**
  1. Extract helper functions: `updateGamePhase()`, `eliminatePlayer()`, `finalizeGame()`
  2. Use switch statement (not nested if-else) for phase transitions
  3. Add comprehensive logging at phase boundaries
  4. Create state diagram documentation (visual reference)
  5. Unit test each phase in isolation before integration
- **Builder Split Candidate:** NO - Master orchestrator is tightly coupled, splitting would increase complexity

**Risk 6: Consensus Algorithm Complexity in Night Phase**
- **Impact:** MEDIUM - Complex consensus logic increases Night phase development time
- **Likelihood:** MEDIUM - "When do Mafia agree?" is ambiguous without formal algorithm
- **Mitigation Strategy:**
  1. **MVP Consensus:** Last unanimous target mentioned by ALL Mafia (simple string matching)
  2. Defer sophisticated consensus (weighted voting, negotiation) to Iteration 3
  3. Timeout fallback: If 45s expires without consensus, random nightkill
  4. Log consensus detection events for manual review
- **Builder Split Candidate:** NO - Consensus logic is <50 lines, not worth splitting

## Recommendations for Planner

### 1. Prioritize Code Reuse from Iteration 1

**Recommendation:** Reuse 70% of Discussion orchestrator code for Night and Voting phases.

**Rationale:**
- Turn scheduler, timeout handling, event emission, cost tracking patterns are identical
- Only differences: player filtering (Mafia-only), database table name, consensus detection
- Reduces implementation time from 12 hours to 6 hours per phase
- Increases consistency (same error handling, logging, event structure)

**Implementation:**
- Extract shared logic into `src/lib/orchestration/shared/` directory:
  - `turn-scheduler.ts` (already exists, move to shared)
  - `turn-executor-base.ts` (extract common logic from discussion/turn-executor.ts)
  - `timeout-handler.ts` (extract Promise.race pattern)
- Create phase-specific wrappers:
  - `src/lib/night/orchestrator.ts` (imports shared scheduler)
  - `src/lib/voting/orchestrator.ts` (imports shared timeout handler)

### 2. Build Master Orchestrator First (Before Individual Phases)

**Recommendation:** Implement master orchestrator skeleton before building Night/Voting phases.

**Rationale:**
- Defines interfaces for all phase orchestrators (contract-first design)
- Allows parallel builder work (Builder A: Night, Builder B: Voting, Builder C: Day+Win)
- Enables early integration testing with mocked phase orchestrators
- Reduces integration risk (interfaces defined upfront)

**Implementation:**
- Builder 1: Master orchestrator with mocked phase functions
- Builder 2: Night phase orchestrator (implements interface)
- Builder 3: Voting + Day + Win checker (implements interfaces)
- Integration: Replace mocks with real implementations

### 3. Extend Database Schema Incrementally (Not All at Once)

**Recommendation:** Add `NightMessage` table first, then add fields to existing tables in second migration.

**Rationale:**
- Reduces risk of migration conflicts
- Allows testing Night phase in isolation before integrating with Discussion
- Easier to roll back small migrations
- Matches incremental builder workflow (Builder 1: Night table, Builder 2: Vote fields)

**Implementation:**
- Migration 1: Add `NightMessage` table only
- Test Night phase orchestrator
- Migration 2: Add `eliminationType`, `phaseType`, `voteOrder` fields
- Test Voting phase orchestrator

### 4. Use Discussion Orchestrator As-Is (No Modifications)

**Recommendation:** Import Iteration 1 Discussion orchestrator without changes.

**Rationale:**
- Discussion phase is VALIDATED (Iteration 1 passed quality gates)
- Any changes introduce regression risk
- Modification complexity > wrapper complexity
- Easier to maintain two separate codebases (Discussion vs Night) than merged codebase

**Implementation:**
- Master orchestrator calls `runDiscussion(gameId, dependencies, config)` unchanged
- If additional context needed (e.g., Night phase deaths), pass via `dependencies.buildContext` function
- NO changes to `src/lib/discussion/orchestrator.ts`

### 5. Implement Comprehensive Event Logging (Phase Transitions Critical)

**Recommendation:** Emit events at EVERY phase boundary (start, end, transition).

**Rationale:**
- Phase transitions are highest risk for bugs (timing issues, state desync)
- Events enable debugging via event log inspection
- Events support UI real-time updates
- Events enable post-game analysis (which phase failed?)

**Implementation:**
```typescript
// At start of each phase
gameEventEmitter.emitGameEvent('phase_start', {
  gameId,
  type: 'PHASE_START',
  payload: { phase: 'NIGHT', round: 2, timestamp: Date.now() },
});

// At end of each phase
gameEventEmitter.emitGameEvent('phase_complete', {
  gameId,
  type: 'PHASE_COMPLETE',
  payload: { phase: 'NIGHT', duration: 45.2, stats: { messages: 12, consensus: true } },
});

// At phase transition
gameEventEmitter.emitGameEvent('phase_change', {
  gameId,
  type: 'PHASE_CHANGE',
  payload: { from: 'NIGHT', to: 'DAY_ANNOUNCEMENT', round: 2 },
});
```

### 6. Build CLI Test Harness for Full Game Loop (Not Just Phases)

**Recommendation:** Extend Iteration 1 CLI harness to run full game (3 rounds, 5 phases each).

**Rationale:**
- Integration testing requires full game execution
- Manual testing via web UI is slow and hard to debug
- CLI provides full event log for inspection
- Cost tracking across all phases (not just Discussion)

**Implementation:**
```bash
# NEW: src/cli/test-full-game.ts
npm run test-full-game
# Runs: NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK (repeat 3 rounds)
# Logs: Full transcript, cost per phase, event sequence
# Output: logs/full-game-test-{timestamp}.txt
```

### 7. Define Clear Builder Task Boundaries (Prevent Overlap)

**Recommendation:** Assign phases to builders based on dependency graph.

**Builder 1 (Foundation):**
- Database schema migration (add `NightMessage` table + new fields)
- Master orchestrator skeleton (with mocked phases)
- Event type extensions

**Builder 2 (Night Phase):**
- Night phase orchestrator
- Night consensus detection algorithm
- Night phase prompts (Mafia coordination)

**Builder 3 (Voting + Day + Win):**
- Voting phase orchestrator
- Day announcement phase
- Win condition checker
- Vote parsing logic

**Builder 4 (Integration + Testing):**
- Integrate all phases into master orchestrator
- CLI test harness for full game loop
- Event emission verification
- Cost tracking phase breakdown

**Dependency Chain:**
1. Builder 1 completes → Builder 2 and Builder 3 can start in parallel
2. Builder 2 and Builder 3 complete → Builder 4 integrates
3. Builder 4 validates → Iteration 2 complete

### 8. Defer Consensus Algorithm Complexity to Future Iteration

**Recommendation:** Use simple majority-based consensus for Night phase MVP.

**Rationale:**
- Complex negotiation algorithms (weighted voting, multi-round negotiation) are Iteration 3 scope
- Simple consensus: Most recent player mentioned by >50% of Mafia = nightkill target
- If no consensus after 45s, random target from all mentioned players
- Reduces Night phase complexity from HIGH to MEDIUM

**Implementation:**
```typescript
// MVP Consensus Algorithm
function detectNightKillConsensus(nightMessages: NightMessage[]): Player | null {
  // Extract all player name mentions from messages
  const mentions: Map<string, number> = new Map();
  
  for (const msg of nightMessages) {
    const names = extractPlayerNames(msg.message);
    for (const name of names) {
      mentions.set(name, (mentions.get(name) || 0) + 1);
    }
  }

  // Find player mentioned by majority (>50% of Mafia)
  const mafiaCount = new Set(nightMessages.map(m => m.playerId)).size;
  const threshold = Math.ceil(mafiaCount / 2);

  for (const [name, count] of mentions.entries()) {
    if (count >= threshold) {
      return getPlayerByName(name);
    }
  }

  // No consensus: random target
  return null;
}
```

## Resource Map

### Critical Files/Directories

**Iteration 1 Files (DO NOT MODIFY):**
- `src/lib/discussion/orchestrator.ts` - Discussion phase orchestrator (247 lines, VALIDATED)
- `src/lib/discussion/turn-executor.ts` - Turn execution logic (320 lines, VALIDATED)
- `src/lib/discussion/turn-scheduler.ts` - Turn scheduling (223 lines, VALIDATED)
- `src/lib/events/emitter.ts` - Event emitter (74 lines, VALIDATED)
- `src/lib/events/types.ts` - Event type definitions (67 lines, EXTEND ONLY)

**New Files Required for Iteration 2:**
- `src/lib/game/master-orchestrator.ts` - Main game loop coordinator (250-300 lines, HIGH COMPLEXITY)
- `src/lib/night/orchestrator.ts` - Night phase orchestrator (200-250 lines, HIGH COMPLEXITY)
- `src/lib/voting/orchestrator.ts` - Voting phase orchestrator (180-220 lines, MEDIUM COMPLEXITY)
- `src/lib/day/orchestrator.ts` - Day announcement phase (120-150 lines, LOW COMPLEXITY)
- `src/lib/game/win-checker.ts` - Win condition logic (80-100 lines, LOW COMPLEXITY)
- `src/lib/night/consensus.ts` - Nightkill consensus algorithm (60-80 lines, MEDIUM COMPLEXITY)
- `src/lib/voting/vote-parser.ts` - Parse votes from Claude responses (50-70 lines, MEDIUM COMPLEXITY)

**Database Files:**
- `app/prisma/schema.prisma` - Add `NightMessage` table, modify existing tables (60-80 lines changes)
- `app/prisma/migrations/` - New migration file (auto-generated)

**Testing Files:**
- `src/cli/test-full-game.ts` - Full game loop CLI test harness (200-250 lines)

### Key Dependencies

**External Dependencies (Unchanged from Iteration 1):**
- `@anthropic-ai/sdk@0.65.0` - Claude API client
- `@prisma/client@6.17.1` - Database ORM
- `next@14.2.18` - Web framework
- `zod@3.23.8` - Type validation (optional for vote parsing)

**Internal Dependencies (Iteration 1 → Iteration 2):**
- Discussion orchestrator → Master orchestrator (import)
- Turn scheduler → Night orchestrator (reuse)
- Turn executor → Voting orchestrator (adapt)
- Event emitter → All phase orchestrators (extend)
- Cost tracker → All phase orchestrators (extend)

### Testing Infrastructure

**Unit Testing (Recommended for Iteration 2):**
- **Tool:** Vitest (fast, TypeScript native, zero config)
- **Coverage:** Win checker, vote parser, consensus algorithm
- **Rationale:** Simple logic functions, easy to test in isolation

**Integration Testing:**
- **Tool:** CLI test harness (extend from Iteration 1)
- **Coverage:** Full game loop (NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK × 3 rounds)
- **Rationale:** End-to-end validation, matches production usage

**Manual Testing:**
- **Tool:** Web UI spectator interface
- **Coverage:** Event emission, UI updates, phase transitions
- **Rationale:** Visual verification of real-time updates

## Questions for Planner

### 1. Should Night Phase Support Early Termination on Consensus?

**Question:** If Mafia reach consensus on nightkill target after 20 seconds, should Night phase end early (save time + cost)?

**Implications:**
- **Pros:** Faster games, lower API cost, more realistic (Mafia stop talking once decided)
- **Cons:** More complex state management, risk of premature termination (false positive consensus)

**Recommendation:** **YES** - Implement early termination with conservative consensus threshold (all Mafia must mention same target).

### 2. How Should Tie-Breaking Work in Voting Phase?

**Question:** If two players receive equal votes (e.g., Agent-A: 4 votes, Agent-B: 4 votes), how should we resolve?

**Options:**
- **Random selection** among tied players (simple, unpredictable)
- **Revote** with only tied players as options (more realistic, adds complexity)
- **No elimination** if tie (simplest, but slows game)

**Recommendation:** **Random selection** for MVP - simplest implementation, acceptable for Iteration 2.

### 3. Should Day Announcement Include Agent Reactions or Just Reveal?

**Question:** Should Day phase be:
- **Option A:** Just reveal nightkill ("Agent-C was eliminated") - 0 seconds, pure data
- **Option B:** Reveal + brief reactions from all alive agents - 10 seconds, more engaging

**Implications:**
- **Option A:** Faster, simpler, lower cost
- **Option B:** More realistic, agents build narrative ("I suspected Agent-C was Villager"), higher cost

**Recommendation:** **Option B** - Reactions add strategic value (agents can fake surprise, build alibis), worth 10s + $0.30 cost.

### 4. Should Database Store Raw Claude Responses or Only Parsed Data?

**Question:** Should we store full Claude API responses in database for debugging?

**Implications:**
- **Pros:** Easier debugging (see exact API response), post-game analysis
- **Cons:** Larger database size, privacy concerns (system prompts visible)

**Recommendation:** **NO** for Iteration 2 - Store parsed data only (message text, vote target). Add raw response logging to Iteration 3 if needed.

### 5. How Should We Handle Games That Never End (Edge Case)?

**Question:** If game runs >10 rounds without win condition (rare but possible with balanced play), should we:
- **Force end** after N rounds (declare draw or remaining team wins)
- **Continue indefinitely** (risk infinite loop)
- **Add round limit UI** (show "Round 8/10")

**Recommendation:** **Force end after 10 rounds** - Declare Mafia winner (they survived longer than expected), prevents infinite games.

### 6. Should Builders Implement All Phases in Parallel or Sequentially?

**Question:** Should we:
- **Parallel:** Builder A (Night) + Builder B (Voting) + Builder C (Day+Win) work simultaneously
- **Sequential:** Complete Night → Test → Then Voting → Test → Then Day+Win

**Implications:**
- **Parallel:** Faster completion (12 hours vs 18 hours), higher integration risk
- **Sequential:** Slower, lower risk, easier debugging

**Recommendation:** **Parallel with foundation-first** - Builder 1 completes master orchestrator skeleton, then Builders 2-4 work in parallel on phases.

### 7. Should We Implement Spectator UI in Iteration 2 or Iteration 3?

**Question:** Iteration 2 vision mentions "Full Spectator UI" but also says "CLI-first testing". Should we:
- **Full UI now:** Lobby, live game screen, game over screen (16-20 hours total)
- **Minimal UI now:** Just extend Iteration 1 Discussion viewer to show all phases (4-6 hours)
- **CLI only:** Defer all UI to Iteration 3, focus on game engine (0 hours UI)

**Current Scope Estimate:** 16-20 hours total for Iteration 2 (includes UI)

**Recommendation:** **Minimal UI extension** - Extend Iteration 1 viewer to display all phases, defer polished lobby/results to Iteration 3. Reduces scope to 10-12 hours.

---

**Report Status:** COMPLETE
**Exploration Duration:** 2.5 hours (architecture analysis + pattern research + risk assessment)
**Confidence Level:** HIGH - Iteration 1 foundation is solid, reuse strategy is clear, risks are mitigated
**Recommendation:** PROCEED to planning phase - Game state machine architecture is well-defined and feasible within 16-20 hour budget.
