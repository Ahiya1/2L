# Code Patterns & Conventions - Iteration 4

**Created:** 2025-10-13
**Plan:** plan-1
**Iteration:** 4
**Status:** REFERENCE

---

## Purpose

This document defines code patterns and conventions that ALL builders must follow during Iteration 4. Consistency prevents integration conflicts and maintains code quality.

---

## Critical Pattern: Context Builder Usage

### THE BUG (Line 87)

**Wrong Pattern (CURRENT - CAUSES BUG):**
```typescript
// app/api/game/[gameId]/start/route.ts (line 87)
import { buildAgentContext } from '@/lib/claude/context-builder';

const dependencies = {
  prisma,
  generateResponse: generateAgentResponse,
  trackCost: costTracker.track.bind(costTracker),
  buildAgentContext,  // ❌ WRONG - expects (player, history)
  getCostSummary: costTracker.getSummary.bind(costTracker),
};
```

**Why This Fails:**
- `buildAgentContext` expects: `(player: Player, history: GameHistory) => AgentContext`
- Turn executor calls it with: `(playerId: string, gameId: string) => Promise<AgentContext>`
- Type mismatch causes immediate TypeError
- All turns fail, discussion generates 0 messages

---

### RIGHT PATTERN (Builder-1 MUST USE)

**Correct Pattern:**
```typescript
// app/api/game/[gameId]/start/route.ts (line 87)
import { buildAgentContextWrapper } from '@/lib/discussion/turn-executor';

const dependencies = {
  prisma,
  generateResponse: generateAgentResponse,
  trackCost: costTracker.track.bind(costTracker),
  buildAgentContext: (playerId: string, gameId: string) =>
    buildAgentContextWrapper(playerId, gameId, prisma),  // ✅ CORRECT
  getCostSummary: costTracker.getSummary.bind(costTracker),
};
```

**Why This Works:**
- `buildAgentContextWrapper` expects: `(playerId: string, gameId: string, prisma: PrismaClient)`
- Fetches player and game data from database
- Constructs `GameHistory` object
- Calls `buildAgentContext` with correct signature
- Returns `AgentContext`

---

### Pattern Explanation

**Two Functions, Two Use Cases:**

#### 1. buildAgentContext (Core Logic)
**Location:** `src/lib/claude/context-builder.ts`
**Signature:** `(player: Player, history: GameHistory) => AgentContext`
**Use Case:** When you ALREADY have player and history objects

**Example Usage:**
```typescript
import { buildAgentContext } from '@/lib/claude/context-builder';

const player = await prisma.player.findUnique({ where: { id: playerId } });
const messages = await prisma.discussionMessage.findMany({ where: { gameId } });
const history = constructHistory(messages);

const context = buildAgentContext(player, history);
```

---

#### 2. buildAgentContextWrapper (Dependency Injection)
**Location:** `src/lib/discussion/turn-executor.ts` (lines 45-147)
**Signature:** `(playerId: string, gameId: string, prisma: PrismaClient) => Promise<AgentContext>`
**Use Case:** When you only have IDs and need to fetch data

**Example Usage:**
```typescript
import { buildAgentContextWrapper } from '@/lib/discussion/turn-executor';

const context = await buildAgentContextWrapper(playerId, gameId, prisma);
```

**What It Does:**
1. Fetches player from database
2. Fetches game and discussion messages
3. Constructs `GameHistory` object
4. Calls `buildAgentContext` internally
5. Returns result

---

### Rule for Builders

**IF** you need to inject a context builder function into dependencies:
- **USE** `buildAgentContextWrapper` (async, takes IDs + prisma)

**IF** you are writing code that already has player and history:
- **USE** `buildAgentContext` (sync, takes objects)

**Builder-1 MUST FIX:** Line 87 in `app/api/game/[gameId]/start/route.ts`

---

## Dependency Injection Pattern

### Good Dependency Injection

**Pattern:**
```typescript
// API Route or Orchestrator Entry Point
const dependencies = {
  prisma,                                              // Database client
  generateResponse: generateAgentResponse,             // Function reference
  trackCost: costTracker.track.bind(costTracker),     // Bound method
  buildAgentContext: (playerId, gameId) =>             // Wrapper/adapter
    buildAgentContextWrapper(playerId, gameId, prisma),
  getCostSummary: costTracker.getSummary.bind(costTracker),
};

await runGameLoop(gameId, dependencies);
```

**Key Principles:**
1. **Function References:** Pass functions, not results
2. **Bound Methods:** Use `.bind()` for class methods
3. **Adapters:** Wrap functions to match expected signatures
4. **Explicit:** Clear what each dependency provides

---

### Bad Dependency Injection (DO NOT DO)

**Anti-Pattern 1: Wrong Signature**
```typescript
// ❌ WRONG
const dependencies = {
  buildAgentContext,  // Expects (player, history), will be called with (playerId, gameId)
};
```

**Anti-Pattern 2: Calling Function Instead of Passing Reference**
```typescript
// ❌ WRONG
const dependencies = {
  generateResponse: generateAgentResponse(context),  // Called immediately!
};

// ✅ CORRECT
const dependencies = {
  generateResponse: generateAgentResponse,  // Function reference
};
```

**Anti-Pattern 3: Unbound Class Methods**
```typescript
// ❌ WRONG (loses 'this' context)
const dependencies = {
  trackCost: costTracker.track,
};

// ✅ CORRECT
const dependencies = {
  trackCost: costTracker.track.bind(costTracker),
};
```

---

## Logging Pattern

### Structured Logging (USE THIS)

**Pattern:**
```typescript
import { createLogger } from '@/lib/logger';

const myLogger = createLogger('module-name');

// Good: Structured with context
myLogger.info({ gameId, playerId, phase: 'DISCUSSION' }, 'Starting turn');
myLogger.error({ gameId, error: error.message, stack: error.stack }, 'Turn failed');

// Good: Debug logs with data
myLogger.debug({ context, tokenCount: 1500 }, 'Sending to Claude API');
```

**Benefits:**
- Searchable (can grep for `gameId: "xyz"`)
- Parseable (JSON format in production)
- Contextual (rich metadata attached)
- Configurable (LOG_LEVEL controls verbosity)

---

### Console Logging (DO NOT USE)

**Anti-Pattern:**
```typescript
// ❌ WRONG - Builder-4 will remove these
console.log(`[Master Orchestrator] Starting DISCUSSION phase`);
console.error('Error:', error);
```

**Exception:** CLI tools and scripts can use console.log (not production code).

---

### Logger Child Pattern

**Pattern:**
```typescript
// Parent logger
const orchestratorLogger = createLogger('orchestrator');

// Child logger with additional context
const gameLogger = orchestratorLogger.child({ gameId });

// All logs from gameLogger include gameId automatically
gameLogger.info('Phase started');
// Output: { gameId: "xyz", msg: "Phase started", level: "info" }
```

---

## Error Handling Pattern

### Graceful Degradation

**Pattern:**
```typescript
try {
  const response = await generateAgentResponse(context);
  return { success: true, message: response };
} catch (error: any) {
  // Log error with full context
  logger.error({
    playerId,
    gameId,
    error: error.message,
    stack: error.stack
  }, 'Failed to generate response');

  // Return fallback (don't crash entire game)
  return {
    success: false,
    message: generateFallbackResponse(player),
    error: error.message
  };
}
```

**Key Principles:**
1. **Log errors fully** (message + stack trace)
2. **Don't throw unless fatal** (use fallbacks)
3. **Return status** (success/failure flag)
4. **Preserve context** (include gameId, playerId, etc.)

---

### When to Throw vs Return Error

**Throw (Fatal Errors):**
```typescript
// These should crash the operation
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY not configured');
}

if (totalCost > costLimit) {
  throw new Error(`Cost limit exceeded: $${totalCost} >= $${costLimit}`);
}
```

**Return Error (Recoverable):**
```typescript
// These should be handled gracefully
try {
  const response = await claudeAPI.call();
} catch (error) {
  return { success: false, error: error.message };  // Don't throw
}
```

---

## TypeScript Pattern

### Strict Type Safety (Builder-4 Task)

**Pattern:**
```typescript
// Good: Explicit types
interface TurnResult {
  success: boolean;
  message?: string;
  error?: string;
  cost?: number;
}

async function executeTurn(playerId: string, gameId: string): Promise<TurnResult> {
  // Implementation
}

// Good: Type guards
function isValidPlayer(player: any): player is Player {
  return player && typeof player.id === 'string' && typeof player.role === 'string';
}

// Good: Zod validation for external data
const GameConfigSchema = z.object({
  playerCount: z.number().min(6).max(15),
  durationMinutes: z.number().min(3).max(10),
});

type GameConfig = z.infer<typeof GameConfigSchema>;
```

---

### Type Safety Anti-Patterns (AVOID)

**Anti-Pattern 1: any Without Justification**
```typescript
// ❌ WRONG
function processData(data: any) {
  return data.something;
}

// ✅ CORRECT
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'something' in data) {
    return (data as { something: any }).something;
  }
  throw new Error('Invalid data structure');
}

// ✅ ALSO CORRECT (if any truly necessary)
function processData(data: any) {  // eslint-disable-line @typescript-eslint/no-explicit-any
  // Reason: External library returns untyped data
  return data.something;
}
```

**Anti-Pattern 2: Type Assertions Without Validation**
```typescript
// ❌ WRONG
const player = result as Player;  // What if result is null?

// ✅ CORRECT
if (!result) {
  throw new Error('Player not found');
}
const player: Player = result;
```

---

## Database Pattern

### Prisma Query Pattern

**Good Patterns:**
```typescript
// Include relations
const game = await prisma.game.findUnique({
  where: { id: gameId },
  include: {
    players: true,
    discussionMessages: {
      orderBy: { createdAt: 'asc' },
      take: 50  // Limit results
    }
  },
});

// Transaction for consistency
await prisma.$transaction(async (tx) => {
  await tx.player.update({ where: { id: playerId }, data: { isAlive: false } });
  await tx.game.update({ where: { id: gameId }, data: { roundNumber: { increment: 1 } } });
});

// Batch operations
await prisma.discussionMessage.createMany({
  data: messages.map(m => ({ ...m, gameId })),
  skipDuplicates: true,
});
```

---

### Database Anti-Patterns (AVOID)

**Anti-Pattern 1: N+1 Queries**
```typescript
// ❌ WRONG
const players = await prisma.player.findMany({ where: { gameId } });
for (const player of players) {
  const messages = await prisma.discussionMessage.findMany({
    where: { playerId: player.id }
  });  // N queries!
}

// ✅ CORRECT
const players = await prisma.player.findMany({
  where: { gameId },
  include: { discussionMessages: true },  // 1 query
});
```

**Anti-Pattern 2: Unhandled Unique Violations**
```typescript
// ❌ WRONG
await prisma.game.create({ data: { id: existingId } });  // Might crash

// ✅ CORRECT
try {
  await prisma.game.create({ data: { id: existingId } });
} catch (error) {
  if (error.code === 'P2002') {  // Unique constraint
    logger.warn({ id: existingId }, 'Game already exists');
    return existingGame;
  }
  throw error;
}
```

---

## Async/Await Pattern

### Good Async Patterns

**Pattern:**
```typescript
// Sequential when order matters
const player = await prisma.player.findUnique({ where: { id: playerId } });
const context = await buildAgentContextWrapper(playerId, gameId, prisma);
const response = await generateAgentResponse(context);

// Parallel when independent
const [player, game, messages] = await Promise.all([
  prisma.player.findUnique({ where: { id: playerId } }),
  prisma.game.findUnique({ where: { id: gameId } }),
  prisma.discussionMessage.findMany({ where: { gameId } }),
]);

// With timeout
const response = await Promise.race([
  generateAgentResponse(context),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 10000)
  ),
]);
```

---

### Async Anti-Patterns (AVOID)

**Anti-Pattern 1: Missing await**
```typescript
// ❌ WRONG
const player = prisma.player.findUnique({ where: { id: playerId } });
console.log(player.name);  // player is a Promise!

// ✅ CORRECT
const player = await prisma.player.findUnique({ where: { id: playerId } });
console.log(player?.name);
```

**Anti-Pattern 2: Sequential When Could Be Parallel**
```typescript
// ❌ SLOW
const player = await prisma.player.findUnique({ where: { id: playerId } });
const game = await prisma.game.findUnique({ where: { id: gameId } });

// ✅ FAST
const [player, game] = await Promise.all([
  prisma.player.findUnique({ where: { id: playerId } }),
  prisma.game.findUnique({ where: { id: gameId } }),
]);
```

---

## Testing Pattern (Builder-3)

### Unit Test Pattern

**Pattern:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAgentResponse } from '../client';
import Anthropic from '@anthropic-ai/sdk';

// Mock at module level
vi.mock('@anthropic-ai/sdk');

describe('Claude Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return response for valid context', async () => {
    // Arrange
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Test response' }],
      usage: { input_tokens: 100, output_tokens: 20 },
    });
    vi.mocked(Anthropic.prototype.messages.create).mockImplementation(mockCreate);

    // Act
    const response = await generateAgentResponse(mockContext);

    // Assert
    expect(response).toBe('Test response');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
```

---

### Integration Test Pattern

**Pattern:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createGame, startGame } from '../orchestrator';
import * as claudeClient from '@/lib/claude/client';

// Mock Claude API
vi.mock('@/lib/claude/client');

describe('Game Orchestrator Integration', () => {
  it('should complete full game', async () => {
    // Mock AI responses
    vi.mocked(claudeClient.generateAgentResponse).mockResolvedValue('Test message');

    // Create and start game
    const game = await createGame({ playerCount: 10 });
    await startGame(game.id);

    // Wait for completion
    const finalState = await waitForGameEnd(game.id, 60000);

    // Verify
    expect(finalState.status).toBe('GAME_OVER');
    expect(finalState.winner).toBeTruthy();
  });
});
```

---

## Supabase Local Pattern (Builder-2)

### Database Connection

**Development:**
```typescript
// .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

**Production:**
```typescript
// Railway provides this automatically
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

**Code (No Changes Needed):**
```typescript
// Prisma client works with both automatically
import { prisma } from '@/lib/db/client';
const games = await prisma.game.findMany();
```

---

### Migration Pattern

**Generate Migration:**
```bash
# After changing schema.prisma
npx prisma migrate dev --name descriptive_name
```

**Apply Migration (Production):**
```bash
npx prisma migrate deploy
```

**Reset Database (Dev Only):**
```bash
npx prisma migrate reset  # ⚠️ Deletes all data
```

---

## File Organization Pattern

### Module Structure

**Pattern:**
```
src/lib/module-name/
├── index.ts           # Public exports
├── types.ts           # Type definitions
├── client.ts          # Main implementation
├── utils.ts           # Helper functions
└── __tests__/
    ├── client.test.ts
    └── utils.test.ts
```

**Example:**
```
src/lib/claude/
├── index.ts           # export { generateAgentResponse }
├── types.ts           # AgentContext, ClaudeConfig
├── client.ts          # generateAgentResponse()
├── context-builder.ts # buildAgentContext()
└── __tests__/
    ├── client.test.ts
    └── context-builder.test.ts
```

---

### Import Pattern

**Barrel Exports (index.ts):**
```typescript
// src/lib/claude/index.ts
export { generateAgentResponse } from './client';
export { buildAgentContext, buildAgentContextWrapper } from './context-builder';
export type { AgentContext, ClaudeConfig } from './types';
```

**Importing:**
```typescript
// ✅ GOOD: Import from barrel
import { generateAgentResponse, buildAgentContext } from '@/lib/claude';

// ⚠️ OK: Import specific file (if needed)
import { buildAgentContextWrapper } from '@/lib/discussion/turn-executor';

// ❌ AVOID: Relative imports from parent
import { something } from '../../../lib/claude';
```

---

## Environment Variables Pattern

### Loading Pattern

**Pattern:**
```typescript
// src/lib/config.ts
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

export const config = {
  anthropicApiKey: getEnvVar('ANTHROPIC_API_KEY'),
  databaseUrl: getEnvVar('DATABASE_URL'),
  logLevel: getEnvVar('LOG_LEVEL', 'info'),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
};
```

---

### .env Files

**Development:**
```bash
# .env.local (not committed)
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
LOG_LEVEL=debug
NODE_ENV=development
```

**Production:**
```bash
# Railway dashboard (not in code)
ANTHROPIC_API_KEY=<from Railway secrets>
DATABASE_URL=<Railway provides automatically>
LOG_LEVEL=info
NODE_ENV=production
```

---

## Cost Tracking Pattern

### Track API Calls

**Pattern:**
```typescript
import { costTracker } from '@/lib/cost-tracker';

async function makeAPICall(gameId: string, context: AgentContext) {
  // Check budget before call
  costTracker.checkCostLimitOrThrow(gameId);

  // Make call
  const response = await claudeAPI.messages.create({ ... });

  // Track cost
  const cost = calculateCost(response.usage);
  costTracker.track(gameId, {
    cost,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedTokens: response.usage.cache_read_input_tokens || 0,
  });

  return response;
}
```

---

## Event Emission Pattern

### SSE Events

**Pattern:**
```typescript
import { eventEmitter } from '@/lib/events';

// Emit event
eventEmitter.emit('discussion:message', {
  type: 'message',
  payload: {
    gameId,
    playerId,
    message: response.text,
    timestamp: new Date(),
  },
});

// Subscribe (in API route)
eventEmitter.on('discussion:message', (data) => {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
});
```

**Event Types:**
- `game:created`
- `game:started`
- `game:phase_change`
- `discussion:turn_start`
- `discussion:message`
- `discussion:turn_end`
- `voting:vote_cast`
- `game:ended`

---

## Summary: Key Patterns for Builders

### Builder-1: Bug Fix
- **USE** `buildAgentContextWrapper` in dependency injection
- **TEST** with real API key immediately
- **LOG** cost and performance metrics

### Builder-2: Supabase Setup
- **FOLLOW** migration pattern (export → change provider → import)
- **CREATE** rollback script
- **VERIFY** full game works with PostgreSQL

### Builder-3: Testing
- **USE** Vitest patterns (vi.fn(), vi.mock())
- **MOCK** Claude API at SDK level
- **ACHIEVE** >50% coverage on critical paths

### Builder-4: TypeScript + Logging
- **REPLACE** console.log with structured logger
- **FIX** TypeScript errors incrementally
- **ENABLE** strict mode

---

**Pattern Document Status:** COMPLETE
**Binding:** ALL builders must follow
**Updates:** Only via Iplanner approval
