# Code Patterns & Conventions

## File Structure

```
app/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   └── game/
│   │       └── [gameId]/
│   │           ├── start/route.ts    # Game start endpoint
│   │           └── stream/route.ts   # SSE streaming
│   ├── page.tsx             # Home page
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── game/               # Game UI
│   └── __tests__/          # Component tests
├── src/
│   ├── lib/                # Core logic
│   │   ├── claude/         # Claude API integration
│   │   ├── discussion/     # Discussion orchestration
│   │   ├── game/           # Game logic
│   │   ├── db/             # Database client
│   │   └── logger.ts       # Logging setup
│   └── utils/              # Utilities
│       ├── cost-tracker.ts
│       └── repetition-tracker.ts
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
└── scripts/                # Utility scripts
    ├── export-sqlite-data.ts
    └── import-data.ts
```

---

## Naming Conventions

**Components:** PascalCase
```typescript
GameBoard.tsx
DiscussionFeed.tsx
PlayerCard.tsx
```

**Files:** kebab-case
```typescript
master-orchestrator.ts
cost-tracker.ts
context-builder.ts
```

**Functions:** camelCase
```typescript
async function generateAgentResponse() { }
function calculateTurnCost() { }
```

**Types/Interfaces:** PascalCase
```typescript
interface GameState { }
type PlayerRole = 'MAFIA' | 'VILLAGER';
```

**Constants:** SCREAMING_SNAKE_CASE
```typescript
const MAX_RETRIES = 3;
const COST_LIMIT = 10.0;
const API_TIMEOUT_MS = 10000;
```

---

## Import Order Convention

```typescript
// 1. External dependencies
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

// 2. Next.js and React
import { NextRequest, NextResponse } from 'next/server';
import { useState, useEffect } from 'react';

// 3. Internal lib imports (absolute paths)
import { logger, claudeLogger } from '@/lib/logger';
import { prisma } from '@/lib/db/client';
import { generateAgentResponse } from '@/lib/claude/client';

// 4. Internal relative imports
import { buildAgentContextWrapper } from '../turn-executor';
import { GameState } from './types';

// 5. Type-only imports (if not mixed above)
import type { Player, Game } from '@prisma/client';
```

---

## Logging Patterns

### Pattern: Structured Logging

**When to use:** All production code

**Code example:**
```typescript
import { orchestratorLogger } from '@/lib/logger';

async function startGamePhase(gameId: string, phase: string) {
  // ✅ CORRECT: Structured logging with context
  orchestratorLogger.info({
    gameId,
    phase,
    timestamp: new Date().toISOString()
  }, `Starting ${phase} phase`);

  try {
    await executePhase(gameId, phase);

    orchestratorLogger.info({
      gameId,
      phase,
      duration: Date.now() - startTime
    }, `Completed ${phase} phase`);
  } catch (error) {
    orchestratorLogger.error({
      gameId,
      phase,
      error: error.message,
      stack: error.stack
    }, `Failed ${phase} phase`);
    throw error;
  }
}

// ❌ WRONG: console.log
console.log(`[Master Orchestrator] Starting ${phase} phase`);
```

**Key points:**
- First argument: Object with context (gameId, phase, etc.)
- Second argument: Human-readable message
- Use appropriate log level: debug, info, warn, error
- Always include error stack traces

---

### Pattern: Debug Mode Logging

**When to use:** Detailed troubleshooting information

**Code example:**
```typescript
import { discussionLogger } from '@/lib/logger';

async function executeTurn(playerId: string, gameId: string) {
  // Always log at info level for important events
  discussionLogger.info({ playerId, gameId }, 'Executing turn');

  // Debug-level details (only in LOG_LEVEL=debug)
  discussionLogger.debug({
    playerId,
    gameId,
    contextSize: context.messages.length,
    cacheEnabled: true
  }, 'Turn context prepared');

  const response = await generateResponse(context);

  discussionLogger.debug({
    playerId,
    gameId,
    responseLength: response.length,
    tokensUsed: usage.input_tokens
  }, 'Response generated');

  return response;
}
```

**Usage:**
```bash
# Verbose logging
LOG_LEVEL=debug npm run dev

# Production logging
LOG_LEVEL=info npm start
```

---

## Error Handling Patterns

### Pattern: Try-Catch with Structured Logging

**When to use:** Any operation that can fail (API calls, database queries)

**Code example:**
```typescript
import { claudeLogger } from '@/lib/logger';

async function generateAgentResponse(context: AgentContext): Promise<string> {
  const startTime = Date.now();

  try {
    claudeLogger.debug({
      playerId: context.playerId,
      contextSize: context.messages.length
    }, 'Calling Claude API');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      system: context.system,
      messages: context.messages
    });

    const duration = Date.now() - startTime;
    claudeLogger.info({
      playerId: context.playerId,
      duration,
      tokens: response.usage.input_tokens,
      cost: calculateCost(response.usage)
    }, 'Claude API success');

    return response.content[0].text;

  } catch (error: any) {
    const duration = Date.now() - startTime;

    claudeLogger.error({
      playerId: context.playerId,
      duration,
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorCode: error.status,
      stack: error.stack
    }, 'Claude API failure');

    // Decide: throw or return fallback?
    if (error.status === 401) {
      throw new Error('Invalid API key'); // Don't recover from auth errors
    }

    // Return fallback for transient errors
    return generateFallbackResponse(context.player);
  }
}
```

**Key points:**
- Always log errors with full context
- Include error type, message, code, stack trace
- Distinguish recoverable vs non-recoverable errors
- Measure duration for performance tracking

---

### Pattern: Graceful Degradation

**When to use:** Non-critical operations that shouldn't crash the system

**Code example:**
```typescript
async function executeTurn(player: Player, gameId: string): Promise<TurnResult> {
  try {
    // Attempt main functionality
    const response = await generateAgentResponse(context);

    return {
      success: true,
      message: response,
      cost: calculateCost(usage),
      timedOut: false
    };

  } catch (error: any) {
    // Log error but don't crash
    discussionLogger.warn({
      playerId: player.id,
      gameId,
      error: error.message
    }, 'Turn failed, using fallback');

    // Return fallback result
    return {
      success: false,
      message: generateFallbackResponse(player),
      cost: 0,
      timedOut: false,
      error: error.message
    };
  }
}

// Orchestrator continues despite individual turn failures
for (const player of turnSchedule) {
  const result = await executeTurn(player, gameId);

  if (!result.success) {
    errors.push(`Turn failed for ${player.name}: ${result.error}`);
    // Continue to next turn, don't crash entire discussion
  }
}
```

---

## Database Patterns

### Pattern: Prisma Query with Error Handling

**When to use:** All database operations

**Code example:**
```typescript
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logger';

async function getGameState(gameId: string): Promise<Game | null> {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          where: { isAlive: true },
          orderBy: { name: 'asc' }
        },
        discussionMessages: {
          orderBy: { createdAt: 'desc' },
          take: 50  // Limit for performance
        }
      }
    });

    if (!game) {
      logger.warn({ gameId }, 'Game not found');
      return null;
    }

    return game;

  } catch (error: any) {
    logger.error({
      gameId,
      error: error.message,
      stack: error.stack
    }, 'Database query failed');

    throw error;  // Re-throw for caller to handle
  }
}
```

---

### Pattern: Database Transaction

**When to use:** Multiple related database operations that should succeed/fail together

**Code example:**
```typescript
async function eliminatePlayer(gameId: string, playerId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Mark player as eliminated
      await tx.player.update({
        where: { id: playerId },
        data: { isAlive: false }
      });

      // 2. Create game event
      await tx.gameEvent.create({
        data: {
          gameId,
          eventType: 'PLAYER_ELIMINATED',
          playerId,
          timestamp: new Date()
        }
      });

      // 3. Update game state
      await tx.game.update({
        where: { id: gameId },
        data: { lastUpdated: new Date() }
      });
    });

    logger.info({ gameId, playerId }, 'Player eliminated successfully');

  } catch (error: any) {
    logger.error({
      gameId,
      playerId,
      error: error.message
    }, 'Failed to eliminate player');

    throw error;
  }
}
```

**Key points:**
- Use `$transaction` for atomic operations
- All operations succeed or all fail (rollback)
- Keep transactions short for performance

---

## API Patterns

### Pattern: Next.js API Route with Error Handling

**When to use:** All API endpoints

**Code example:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { runGameLoop } from '@/lib/game/master-orchestrator';

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
): Promise<NextResponse> {
  const { gameId } = params;

  try {
    // Validate game exists
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true }
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Game already started' },
        { status: 400 }
      );
    }

    // Start game asynchronously
    logger.info({ gameId }, 'Starting game');

    // Don't await - let game run in background
    runGameLoop(gameId, dependencies).catch((error) => {
      logger.error({
        gameId,
        error: error.message,
        stack: error.stack
      }, 'Game loop crashed');
    });

    return NextResponse.json({
      success: true,
      gameId,
      message: 'Game started'
    });

  } catch (error: any) {
    logger.error({
      gameId,
      error: error.message,
      stack: error.stack
    }, 'API route error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Key points:**
- Validate inputs before processing
- Return appropriate HTTP status codes
- Log all errors with context
- Don't expose internal errors to clients

---

### Pattern: Server-Sent Events (SSE)

**When to use:** Real-time updates (game events, messages)

**Code example:**
```typescript
import { NextRequest } from 'next/server';
import { gameEventEmitter } from '@/lib/game/events';

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
): Promise<Response> {
  const { gameId } = params;

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send keepalive every 15 seconds
      const keepaliveInterval = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 15000);

      // Listen for game events
      const messageHandler = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      gameEventEmitter.on(`game:${gameId}:message`, messageHandler);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        gameEventEmitter.off(`game:${gameId}:message`, messageHandler);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

---

## Testing Patterns

### Pattern: Unit Test with Mocks

**When to use:** Testing individual functions in isolation

**Code example:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAgentResponse, calculateCost } from '../client';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk');

describe('Claude Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAgentResponse', () => {
    it('should return AI response for valid context', async () => {
      // Setup mock
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'I think Alice is suspicious' }],
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          cache_read_input_tokens: 50
        }
      });

      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate }
      } as any));

      // Create test context
      const context = {
        playerId: 'player-1',
        role: 'VILLAGER',
        personality: 'analytical',
        messages: [],
        system: [{ type: 'text', text: 'You are a villager' }]
      };

      // Execute
      const response = await generateAgentResponse(context);

      // Assert
      expect(response).toBe('I think Alice is suspicious');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 200
        })
      );
    });

    it('should retry on API failure', async () => {
      const mockCreate = vi.fn()
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success on retry' }],
          usage: { input_tokens: 100, output_tokens: 20 }
        });

      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate }
      } as any));

      const response = await generateAgentResponse(mockContext);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response).toBe('Success on retry');
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost with cache hit', () => {
      const usage = {
        input_tokens: 1000,
        output_tokens: 200,
        cache_read_input_tokens: 500
      };

      const cost = calculateCost(usage);

      // input: 1000/1M * $3 = $0.003
      // cache_read: 500/1M * $0.3 = $0.00015
      // output: 200/1M * $15 = $0.003
      // Total: $0.00615
      expect(cost).toBeCloseTo(0.00615, 5);
    });
  });
});
```

---

### Pattern: Integration Test

**When to use:** Testing multiple components working together

**Code example:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { runDiscussion } from '../orchestrator';
import * as claudeClient from '@/lib/claude/client';
import { prisma } from '@/lib/db/client';

// Mock Claude API at module level
vi.mock('@/lib/claude/client');

describe('Discussion Orchestration Integration', () => {
  it('should generate messages during discussion', async () => {
    // Mock AI responses
    vi.mocked(claudeClient.generateAgentResponse).mockResolvedValue(
      'This is a test message'
    );

    // Create test game in database
    const game = await prisma.game.create({
      data: {
        status: 'IN_PROGRESS',
        currentPhase: 'DISCUSSION',
        players: {
          create: [
            { name: 'Alice', role: 'VILLAGER', isAlive: true },
            { name: 'Bob', role: 'MAFIA', isAlive: true },
            { name: 'Charlie', role: 'VILLAGER', isAlive: true }
          ]
        }
      },
      include: { players: true }
    });

    // Run discussion for 1 minute
    const result = await runDiscussion(game.id, mockDependencies, {
      durationMinutes: 1,
      turnDelayMs: 100  // Fast for testing
    });

    // Verify messages created
    expect(result.totalMessages).toBeGreaterThan(0);

    const messages = await prisma.discussionMessage.findMany({
      where: { gameId: game.id }
    });

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].message).toBe('This is a test message');

    // Cleanup
    await prisma.game.delete({ where: { id: game.id } });
  });
});
```

---

## Dependency Injection Pattern

### Pattern: Function Dependencies

**When to use:** Passing dependencies to orchestrators (testability)

**CRITICAL: This pattern fixes the signature mismatch bug!**

**Code example:**
```typescript
// types.ts
export interface GameDependencies {
  prisma: PrismaClient;
  generateResponse: (context: AgentContext) => Promise<string>;
  trackCost: (gameId: string, cost: number) => void;
  buildAgentContext: (playerId: string, gameId: string) => Promise<AgentContext>;
  getCostSummary: (gameId: string) => CostSummary;
}

// route.ts - API endpoint
import { buildAgentContextWrapper } from '@/lib/discussion/turn-executor';
import { generateAgentResponse } from '@/lib/claude/client';
import { costTracker } from '@/lib/utils/cost-tracker';

export async function POST(request: NextRequest) {
  const gameId = params.gameId;

  // ✅ CORRECT: Build dependencies with wrapper function
  const dependencies: GameDependencies = {
    prisma,
    generateResponse: generateAgentResponse,
    trackCost: costTracker.track.bind(costTracker),

    // CRITICAL: Use wrapper that converts (playerId, gameId) to (player, history)
    buildAgentContext: (playerId: string, gameId: string) =>
      buildAgentContextWrapper(playerId, gameId, prisma),

    getCostSummary: costTracker.getSummary.bind(costTracker)
  };

  // Start game with injected dependencies
  await runGameLoop(gameId, dependencies);

  return NextResponse.json({ success: true });
}

// master-orchestrator.ts
export async function runGameLoop(
  gameId: string,
  dependencies: GameDependencies
) {
  // Pass dependencies through to discussion phase
  await runDiscussion(gameId, {
    prisma: dependencies.prisma,
    generateResponse: dependencies.generateResponse,
    buildContext: dependencies.buildAgentContext,  // ✅ Correct signature
    trackCost: dependencies.trackCost
  });
}

// turn-executor.ts
export async function executeTurn(
  playerId: string,
  gameId: string,
  dependencies: TurnDependencies
): Promise<TurnResult> {
  // ✅ CORRECT: Call with (playerId, gameId) signature
  const context = await dependencies.buildContext(playerId, gameId);

  const response = await dependencies.generateResponse(context);

  return { success: true, message: response };
}
```

**Key points:**
- Always use wrapper functions to adapt signatures
- Type dependencies explicitly for compile-time checking
- Use `.bind()` for methods that need `this` context
- Document expected signatures in type definitions

---

## Cost Tracking Pattern

### Pattern: Circuit Breaker

**When to use:** Prevent runaway API costs

**Code example:**
```typescript
export class CostTracker {
  private costs: Map<string, number> = new Map();
  private readonly maxCost: number;

  constructor(maxCost: number = 10.0) {
    this.maxCost = maxCost;
  }

  track(gameId: string, cost: number): void {
    const current = this.costs.get(gameId) || 0;
    const newTotal = current + cost;

    if (newTotal >= this.maxCost) {
      throw new Error(
        `Cost limit exceeded for game ${gameId}: $${newTotal.toFixed(2)} >= $${this.maxCost}`
      );
    }

    this.costs.set(gameId, newTotal);

    logger.debug({
      gameId,
      cost,
      totalCost: newTotal,
      remaining: this.maxCost - newTotal
    }, 'Cost tracked');
  }

  checkCostLimitOrThrow(gameId: string): void {
    const current = this.costs.get(gameId) || 0;

    if (current >= this.maxCost) {
      throw new Error(
        `Cost limit already exceeded: $${current.toFixed(2)}`
      );
    }
  }

  getSummary(gameId: string): CostSummary {
    return {
      totalCost: this.costs.get(gameId) || 0,
      limit: this.maxCost,
      remaining: this.maxCost - (this.costs.get(gameId) || 0)
    };
  }
}

// Usage in turn executor
export async function executeTurn(playerId: string, gameId: string, deps: TurnDependencies) {
  // Check limit BEFORE making API call
  deps.checkCostLimit(gameId);

  const response = await deps.generateResponse(context);
  const cost = calculateCost(response.usage);

  // Track cost AFTER successful call
  deps.trackCost(gameId, cost);

  return { success: true, message: response.text, cost };
}
```

---

## Type Safety Pattern

### Pattern: Strict Type Definitions

**When to use:** All shared types and interfaces

**Code example:**
```typescript
// game/types.ts

// ✅ GOOD: Explicit string literal types
export type GameStatus = 'LOBBY' | 'IN_PROGRESS' | 'GAME_OVER';
export type GamePhase = 'NIGHT' | 'DAY' | 'DISCUSSION' | 'VOTING' | 'WIN_CHECK' | null;
export type PlayerRole = 'MAFIA' | 'VILLAGER';

// ✅ GOOD: Required fields explicit
export interface Player {
  id: string;
  gameId: string;
  name: string;
  role: PlayerRole;
  personality: string;
  isAlive: boolean;
  createdAt: Date;
}

// ✅ GOOD: Optional fields explicit
export interface TurnResult {
  success: boolean;
  message: string;
  cost: number;
  timedOut: boolean;
  error?: string;  // Optional, only present on failure
}

// ✅ GOOD: Function signature types
export type GenerateResponseFn = (context: AgentContext) => Promise<string>;
export type TrackCostFn = (gameId: string, cost: number) => void;

// ❌ BAD: Using 'any'
export function processData(data: any) { }  // Don't do this

// ✅ GOOD: Using proper types or generic
export function processData<T>(data: T): T { }

// ✅ GOOD: If truly unknown, use 'unknown' and type guard
export function processData(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    // Now TypeScript knows it's an object
  }
}
```

---

## Prisma Schema Pattern

### Pattern: Model Relationships

**When to use:** Defining database schema

**Code example:**
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"  // ✅ PostgreSQL for dev and prod
  url      = env("DATABASE_URL")
}

model Game {
  id            String   @id @default(cuid())
  status        String   // 'LOBBY' | 'IN_PROGRESS' | 'GAME_OVER'
  currentPhase  String?  // Current game phase
  roundNumber   Int      @default(1)
  winner        String?  // 'MAFIA' | 'VILLAGERS'
  createdAt     DateTime @default(now())
  lastUpdated   DateTime @updatedAt

  // Relations
  players            Player[]
  discussionMessages DiscussionMessage[]
  nightMessages      NightMessage[]
  votes              Vote[]
  events             GameEvent[]
  sharedGames        SharedGame[]

  @@index([status])
  @@index([createdAt])
}

model Player {
  id          String   @id @default(cuid())
  gameId      String
  name        String
  role        String   // 'MAFIA' | 'VILLAGER'
  personality String
  isAlive     Boolean  @default(true)
  createdAt   DateTime @default(now())

  // Relations
  game               Game                @relation(fields: [gameId], references: [id], onDelete: Cascade)
  discussionMessages DiscussionMessage[]
  nightMessages      NightMessage[]
  votes              Vote[]

  @@index([gameId])
  @@index([isAlive])
}

model DiscussionMessage {
  id        String   @id @default(cuid())
  gameId    String
  playerId  String
  message   String
  replyToId String?  // For threading
  createdAt DateTime @default(now())

  // Relations
  game    Game                @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player  Player              @relation(fields: [playerId], references: [id], onDelete: Cascade)
  replyTo DiscussionMessage?  @relation("MessageReplies", fields: [replyToId], references: [id])
  replies DiscussionMessage[] @relation("MessageReplies")

  @@index([gameId, createdAt])
  @@index([playerId])
}
```

**Key points:**
- Use `@id @default(cuid())` for primary keys
- Use `@default(now())` for timestamps
- Use `@updatedAt` for auto-updating timestamps
- Always add `onDelete: Cascade` for foreign keys
- Add indexes for frequently queried fields
- Use `@@index` for composite indexes

---

## Code Quality Standards

### Standard: No console.log in Production

```typescript
// ❌ BAD
console.log('Starting game');
console.log(`Game ${gameId} started`);

// ✅ GOOD
logger.info({ gameId }, 'Game started');
orchestratorLogger.debug({ gameId, phase: 'NIGHT' }, 'Starting NIGHT phase');
```

### Standard: Explicit Error Handling

```typescript
// ❌ BAD
try {
  await riskyOperation();
} catch (e) {
  // Silent failure
}

// ✅ GOOD
try {
  await riskyOperation();
} catch (error: any) {
  logger.error({
    operation: 'riskyOperation',
    error: error.message,
    stack: error.stack
  }, 'Operation failed');
  throw error;  // Re-throw or handle gracefully
}
```

### Standard: Type All Function Parameters

```typescript
// ❌ BAD
function processGame(game) {
  return game.status;
}

// ✅ GOOD
function processGame(game: Game): GameStatus {
  return game.status as GameStatus;
}
```

### Standard: Use Async/Await, Not Callbacks

```typescript
// ❌ BAD
function getData(callback) {
  prisma.game.findFirst().then((game) => {
    callback(null, game);
  }).catch((error) => {
    callback(error);
  });
}

// ✅ GOOD
async function getData(): Promise<Game | null> {
  try {
    return await prisma.game.findFirst();
  } catch (error) {
    logger.error({ error }, 'Failed to get data');
    throw error;
  }
}
```

---

## Performance Patterns

### Pattern: Efficient Database Queries

```typescript
// ❌ BAD: N+1 query problem
const games = await prisma.game.findMany();
for (const game of games) {
  const players = await prisma.player.findMany({
    where: { gameId: game.id }
  });
}

// ✅ GOOD: Include related data
const games = await prisma.game.findMany({
  include: {
    players: true
  }
});

// ✅ GOOD: Limit results
const recentGames = await prisma.game.findMany({
  take: 10,
  orderBy: { createdAt: 'desc' },
  include: {
    players: { where: { isAlive: true } }
  }
});
```

### Pattern: Prompt Caching

```typescript
// ✅ GOOD: Cache static context
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 200,
  system: [
    {
      type: 'text',
      text: systemPrompt,  // Rarely changes
      cache_control: { type: 'ephemeral' }  // Cache for 5 minutes
    },
    {
      type: 'text',
      text: gameStateContext,  // Updates per turn
      cache_control: { type: 'ephemeral' }
    }
  ],
  messages: conversationHistory
});
```

---

## Security Patterns

### Pattern: Input Validation

```typescript
import { z } from 'zod';

// Define schema
const CreateGameSchema = z.object({
  playerCount: z.number().min(6).max(15),
  gameName: z.string().max(100).optional()
});

// Validate in API route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateGameSchema.parse(body);  // Throws if invalid

    // Proceed with validated data
    const game = await createGame(data);

    return NextResponse.json({ success: true, game });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    throw error;
  }
}
```

---

## Summary: Critical Patterns for This Iteration

1. **Dependency Injection**: Use `buildAgentContextWrapper` to fix signature mismatch
2. **Structured Logging**: Replace all `console.log` with `logger.info/debug/error`
3. **Error Handling**: Always log errors with context, decide throw vs fallback
4. **Type Safety**: No `any` types, explicit function signatures
5. **Testing**: Mock external dependencies (Claude API, database)
6. **Cost Tracking**: Check circuit breaker before each API call
7. **Database**: Use transactions for related operations, include relations

---

**Patterns Status**: COMPLETE
**Ready for Implementation**: YES
