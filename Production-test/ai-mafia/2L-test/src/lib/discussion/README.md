# Discussion Phase Orchestrator

This module implements the discussion phase orchestration system for AI Mafia.

## Architecture

The discussion orchestrator coordinates agent turns through a sequential round-robin pattern:

```
Game Start → Turn Scheduler → Turn Executor → Save to DB → Emit Event → Next Turn
              ↑_______________________________________________________________|
              (Repeat until time expires or rounds complete)
```

## Components

### 1. Orchestrator (`orchestrator.ts`)
**Main entry point** for running discussion phase.

- Creates turn schedule
- Executes turns sequentially
- Handles errors gracefully (continue on failure)
- Emits events for SSE streaming
- Calculates statistics

**Usage:**
```typescript
import { runDiscussion } from './orchestrator';

const result = await runDiscussion(gameId, {
  prisma,              // From Builder-1
  buildContext,        // From Builder-2
  generateResponse,    // From Builder-2
  trackCost,          // From Builder-2
  getCostSummary      // From Builder-2
}, {
  durationMinutes: 3,
  totalRounds: 5,
  turnDelayMs: 500
});
```

### 2. Turn Scheduler (`turn-scheduler.ts`)
**Turn management** with round-robin scheduling.

- Sequential turn order (no parallelization)
- Shuffle agent order each round
- Track progress and time remaining
- Stop conditions (time limit, round limit)

**Features:**
- `createTurnSchedule()` - Initialize schedule
- `getNextPlayer()` - Get next player to speak
- `advanceToNextTurn()` - Move to next turn
- `shouldContinue()` - Check if discussion should continue
- `getScheduleStats()` - Progress statistics

### 3. Turn Executor (`turn-executor.ts`)
**Execute single agent turn** with timeout and fallback.

Flow:
1. Build agent context (from Builder-2)
2. Call Claude API with 10-second timeout
3. Validate response (5-100 words, relevant content)
4. Determine threading (reply-to logic)
5. Save message to database
6. Emit event for SSE
7. Track cost

**Features:**
- 10-second timeout (MANDATORY)
- Fallback response on timeout/error
- Retry logic with exponential backoff
- Validation (word count, keywords)

### 4. Threading (`threading.ts`)
**Conversation threading** through pattern matching.

Detects:
- Explicit mentions: "Agent-X", "@Agent-X"
- Response phrases: "responding to", "I disagree with"
- Accusation responses: Defending after accusation
- Default: Reply to most recent message

**Target:** >30% of messages threaded

### 5. Event Emitter (`events/emitter.ts`)
**Real-time event broadcasting** for SSE.

Events:
- `message` - New discussion message
- `turn_start` - Agent starting turn
- `turn_end` - Turn completed
- `phase_change` - Phase transition
- `phase_complete` - Discussion complete

## Configuration

Default settings (can be overridden):
```typescript
{
  durationMinutes: 3,        // Discussion duration
  totalRounds: 5,            // Rounds per agent
  turnTimeoutSeconds: 10,    // Max time per turn
  turnDelayMs: 500          // Delay between turns
}
```

## Integration

### Dependencies
- **Builder-1:** Prisma client for database operations
- **Builder-2:** Claude client, context builder, cost tracker

### Exports
- `runDiscussion()` - Main orchestrator function
- `gameEventEmitter` - Event emitter instance
- Threading utilities for testing

### Usage by Builder-4
Builder-4 (CLI/UI) imports:
```typescript
import { runDiscussion } from '@/lib/discussion/orchestrator';
import { gameEventEmitter } from '@/lib/events/emitter';
```

## Error Handling

The orchestrator follows "graceful degradation":

1. **Turn timeout** → Use fallback response, continue
2. **API error** → Retry with backoff, then fallback
3. **Validation error** → Skip turn, log warning, continue
4. **Database error** → Log error, skip turn, continue
5. **Fatal error** → Return partial results, don't crash

**Never crash entire discussion due to single turn failure.**

## Testing

Run unit tests:
```bash
npm test src/lib/discussion
```

Run integration test:
```bash
tsx src/lib/discussion/test-orchestrator.ts
```

## Success Criteria

- [ ] Discussion completes 40-50 agent turns in 3-5 minutes
- [ ] All messages saved to database correctly
- [ ] Threading inference sets inReplyTo for >30% of messages
- [ ] No deadlocks or infinite loops
- [ ] Event emitter broadcasts all messages
- [ ] 10-second timeout enforced strictly
- [ ] Graceful error handling (continue on failure)

## Performance Targets

- **Average turn duration:** <3 seconds
- **P95 turn duration:** <8 seconds
- **Timeout threshold:** 10 seconds (hard limit)
- **Turn delay:** 500ms (readability)
- **Discussion duration:** 3 minutes (configurable)

## Known Limitations

1. **Sequential execution:** Turns execute one at a time (by design, for conversation coherence)
2. **No mid-discussion pausing:** Discussion runs to completion
3. **No dynamic player changes:** Player list fixed at start
4. **Basic threading:** Pattern matching only (no AI inference)

## Future Enhancements (Iteration 2)

- Parallel turn execution within same round
- Dynamic player elimination handling
- Advanced threading (AI-based)
- Turn prioritization (active speakers first)
- Adaptive timeout (faster players get more turns)
