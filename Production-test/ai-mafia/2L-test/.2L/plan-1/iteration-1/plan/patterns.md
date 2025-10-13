# Code Patterns & Conventions

## File Structure

```
ai-mafia/
├── .anthropic-key.txt          # API key (in .gitignore)
├── .env                         # Environment variables
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Auto-generated
├── src/
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── types.ts        # Agent interfaces
│   │   │   ├── personality.ts  # Personality generation
│   │   │   └── manager.ts      # Agent management
│   │   ├── claude/
│   │   │   ├── client.ts       # API wrapper
│   │   │   ├── context-builder.ts
│   │   │   ├── prompt-cache.ts
│   │   │   └── types.ts
│   │   ├── discussion/
│   │   │   ├── orchestrator.ts
│   │   │   ├── turn-scheduler.ts
│   │   │   └── types.ts
│   │   ├── prompts/
│   │   │   └── system-prompts.ts
│   │   ├── db/
│   │   │   ├── client.ts       # Prisma singleton
│   │   │   └── seed.ts         # Test data
│   │   └── events/
│   │       └── emitter.ts      # Game event emitter
│   ├── cli/
│   │   ├── test-discussion.ts  # Main CLI script
│   │   └── evaluate-transcript.ts
│   └── utils/
│       ├── logger.ts           # Structured logging
│       └── cost-tracker.ts     # Token usage tracking
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home (placeholder)
│   ├── test-discussion/
│   │   └── page.tsx            # Discussion viewer
│   └── api/
│       └── game/
│           └── [gameId]/
│               └── stream/
│                   └── route.ts # SSE endpoint
├── components/
│   ├── PhaseIndicator.tsx
│   ├── PlayerGrid.tsx
│   └── DiscussionFeed.tsx
├── logs/                        # Test transcripts (in .gitignore)
└── docs/                        # Documentation
    ├── quality-rubric.md
    └── prompt-iteration-log.md
```

## Naming Conventions

- **Components:** PascalCase (`PhaseIndicator.tsx`, `DiscussionFeed.tsx`)
- **Files:** camelCase (`turn-scheduler.ts`, `context-builder.ts`)
- **Types/Interfaces:** PascalCase (`AgentContext`, `GameHistory`, `TurnSchedule`)
- **Functions:** camelCase (`orchestrateDiscussion()`, `buildContext()`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_RETRIES`, `API_TIMEOUT_MS`)
- **Database tables:** snake_case (`discussion_messages`, `game_events`)
- **Prisma models:** PascalCase (`DiscussionMessage`, `GameEvent`)

## Database Patterns

### Prisma Schema

**Pattern:** Define full schema upfront (including Iteration 2 tables)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Game {
  id           String   @id @default(cuid())
  status       String   // "LOBBY", "NIGHT", "DAY", "DISCUSSION", "VOTING", "GAME_OVER"
  currentPhase String?
  phaseEndTime DateTime?
  roundNumber  Int      @default(1)
  winner       String?  // "MAFIA", "VILLAGERS", null
  playerCount  Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  players            Player[]
  discussionMessages DiscussionMessage[]
  votes              Vote[]
  gameEvents         GameEvent[]

  @@index([status])
  @@index([createdAt])
}

model Player {
  id          String  @id @default(cuid())
  gameId      String
  name        String
  role        String  // "MAFIA", "VILLAGER"
  personality String  // "analytical", "aggressive", "cautious", "social", "suspicious"
  isAlive     Boolean @default(true)
  position    Int     // Display order: 0-11

  game          Game                @relation(fields: [gameId], references: [id], onDelete: Cascade)
  messages      DiscussionMessage[] @relation("MessageAuthor")
  votesGiven    Vote[]              @relation("Voter")
  votesReceived Vote[]              @relation("Target")

  @@unique([gameId, position])
  @@index([gameId, isAlive])
  @@index([gameId, role])
}

model DiscussionMessage {
  id          String   @id @default(cuid())
  gameId      String
  roundNumber Int
  playerId    String
  message     String
  inReplyToId String?
  timestamp   DateTime @default(now())
  turn        Int      // Turn number within this Discussion phase

  game      Game                 @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player    Player               @relation("MessageAuthor", fields: [playerId], references: [id], onDelete: Cascade)
  inReplyTo DiscussionMessage?   @relation("ReplyThread", fields: [inReplyToId], references: [id], onDelete: SetNull)
  replies   DiscussionMessage[]  @relation("ReplyThread")

  @@index([gameId, roundNumber, timestamp])
  @@index([gameId, playerId])
  @@index([inReplyToId])
}

model Vote {
  id            String   @id @default(cuid())
  gameId        String
  roundNumber   Int
  voterId       String
  targetId      String
  justification String
  timestamp     DateTime @default(now())

  game   Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
  voter  Player @relation("Voter", fields: [voterId], references: [id], onDelete: Cascade)
  target Player @relation("Target", fields: [targetId], references: [id], onDelete: Cascade)

  @@index([gameId, roundNumber])
  @@index([gameId, voterId])
  @@index([gameId, targetId])
}

model GameEvent {
  id        String   @id @default(cuid())
  gameId    String
  type      String   // "PHASE_CHANGE", "PLAYER_ELIMINATED", "VOTE_CAST", "GAME_START", "GAME_END"
  data      String   // JSON: {phase: "NIGHT", eliminatedPlayer: "Agent-1", ...}
  timestamp DateTime @default(now())

  game Game @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@index([gameId, timestamp])
  @@index([type, timestamp])
}
```

**Key Patterns:**
- Use `@index` on frequently queried fields
- Use `@relation` for foreign keys with explicit names
- Use `onDelete: Cascade` for dependent records
- Use `@default(cuid())` for IDs (shorter than UUID)
- Use `@default(now())` for timestamps

### Prisma Client Singleton

**Pattern:** Single Prisma instance across application

```typescript
// src/lib/db/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Usage:**
```typescript
import { prisma } from '@/lib/db/client';

const messages = await prisma.discussionMessage.findMany({
  where: { gameId },
  include: { player: true },
});
```

### Database Query Patterns

**Pattern 1: Fetch game history for agent context**

```typescript
// src/lib/claude/context-builder.ts
import { prisma } from '@/lib/db/client';

interface GameHistory {
  messages: DiscussionMessage[];
  votes: Vote[];
  deaths: Player[];
}

async function fetchGameHistory(gameId: string): Promise<GameHistory> {
  const [messages, votes, deaths] = await Promise.all([
    prisma.discussionMessage.findMany({
      where: { gameId },
      orderBy: { timestamp: 'asc' },
      include: { player: true, inReplyTo: { include: { player: true } } },
      take: 50, // Last 50 messages (optimization)
    }),
    prisma.vote.findMany({
      where: { gameId },
      orderBy: { timestamp: 'asc' },
      include: { voter: true, target: true },
    }),
    prisma.player.findMany({
      where: { gameId, isAlive: false },
      orderBy: { updatedAt: 'asc' },
    }),
  ]);

  return { messages, votes, deaths };
}
```

**Pattern 2: Create message with transaction**

```typescript
// src/lib/discussion/orchestrator.ts
async function saveMessage(
  gameId: string,
  playerId: string,
  roundNumber: number,
  message: string,
  inReplyToId: string | null,
  turn: number
) {
  const savedMessage = await prisma.discussionMessage.create({
    data: {
      gameId,
      playerId,
      roundNumber,
      message,
      inReplyToId,
      turn,
      timestamp: new Date(),
    },
    include: {
      player: true,
      inReplyTo: { include: { player: true } },
    },
  });

  return savedMessage;
}
```

**Pattern 3: Seed test game**

```typescript
// src/lib/db/seed.ts
async function seedTestGame(config: {
  playerCount: number;
  mafiaCount: number;
  personalities: string[];
}): Promise<string> {
  const game = await prisma.game.create({
    data: {
      status: 'DISCUSSION',
      currentPhase: 'DISCUSSION',
      phaseEndTime: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes
      roundNumber: 1,
      playerCount: config.playerCount,
    },
  });

  // Assign roles
  const roles: string[] = [];
  for (let i = 0; i < config.mafiaCount; i++) roles.push('MAFIA');
  for (let i = 0; i < config.playerCount - config.mafiaCount; i++) roles.push('VILLAGER');

  // Shuffle roles
  roles.sort(() => Math.random() - 0.5);

  // Create players
  const players = [];
  for (let i = 0; i < config.playerCount; i++) {
    const player = await prisma.player.create({
      data: {
        gameId: game.id,
        name: `Agent-${String.fromCharCode(65 + i)}`, // Agent-A, Agent-B, etc.
        role: roles[i],
        personality: config.personalities[i % config.personalities.length],
        isAlive: true,
        position: i,
      },
    });
    players.push(player);
  }

  return game.id;
}
```

## Claude API Patterns

### API Client with Caching

**Pattern:** Wrap Anthropic SDK with caching and error handling

```typescript
// src/lib/claude/client.ts
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const ANTHROPIC_API_KEY = fs.readFileSync('.anthropic-key.txt', 'utf-8').trim();

const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

interface TokenUsage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  cost: number;
}

async function generateAgentResponse(
  systemPrompt: string,
  gameStateContext: string,
  conversationContext: Anthropic.MessageParam[],
  retries = 3
): Promise<{ text: string; usage: TokenUsage }> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4.5-20250929',
        max_tokens: 200,
        temperature: 0.8,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }, // Cache system prompt
          },
          {
            type: 'text',
            text: gameStateContext,
            cache_control: { type: 'ephemeral' }, // Cache game state
          },
        ],
        messages: conversationContext,
      });

      const text = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      const usage: TokenUsage = {
        inputTokens: response.usage.input_tokens,
        cachedTokens: response.usage.cache_read_input_tokens || 0,
        outputTokens: response.usage.output_tokens,
        cost: calculateCost(response.usage),
      };

      return { text, usage };
    } catch (error: any) {
      lastError = error;

      // Rate limit: longer delay
      if (error.status === 429) {
        const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
        console.warn(`Rate limited, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Server errors: retry
      if (error.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(`Server error, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Client errors: don't retry
      throw error;
    }
  }

  throw new Error(`Failed after ${retries} retries: ${lastError?.message}`);
}

function calculateCost(usage: Anthropic.Messages.Usage): number {
  const INPUT_COST_PER_MILLION = 3.0;
  const CACHED_INPUT_COST_PER_MILLION = 0.3; // 90% discount
  const OUTPUT_COST_PER_MILLION = 15.0;

  const inputCost = (usage.input_tokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const cachedCost = ((usage.cache_read_input_tokens || 0) / 1_000_000) * CACHED_INPUT_COST_PER_MILLION;
  const outputCost = (usage.output_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  return inputCost + cachedCost + outputCost;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { generateAgentResponse };
```

### Context Builder with Caching

**Pattern:** Format game history with cache boundaries

```typescript
// src/lib/claude/context-builder.ts
import { Player } from '@prisma/client';

interface AgentContext {
  player: Player;
  systemPrompt: string;
  gameStateContext: string;
  conversationContext: Anthropic.MessageParam[];
}

async function buildAgentContext(
  playerId: string,
  gameId: string
): Promise<AgentContext> {
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: playerId },
  });

  const history = await fetchGameHistory(gameId);

  const systemPrompt = generateSystemPrompt(player);
  const gameStateContext = formatGameState(history, player);
  const conversationContext = formatMessages(history.messages, player);

  return {
    player,
    systemPrompt,
    gameStateContext,
    conversationContext,
  };
}

function formatGameState(history: GameHistory, player: Player): string {
  const aliveCount = history.messages.length > 0
    ? new Set(history.messages.filter(m => m.player.isAlive).map(m => m.player.id)).size
    : 10;

  return `
CURRENT GAME STATE:
- Round: ${history.messages.length > 0 ? Math.max(...history.messages.map(m => m.roundNumber)) : 1}
- Alive players: ${aliveCount}
- Your status: ${player.isAlive ? 'Alive' : 'Eliminated'}

PREVIOUS VOTES:
${history.votes.length > 0
  ? history.votes.map(v => `- ${v.voter.name} voted for ${v.target.name}: "${v.justification}"`).join('\n')
  : '- No votes yet'}

ELIMINATED PLAYERS:
${history.deaths.length > 0
  ? history.deaths.map(d => `- ${d.name} eliminated`).join('\n')
  : '- No eliminations yet'}
`;
}

function formatMessages(
  messages: DiscussionMessage[],
  currentPlayer: Player
): Anthropic.MessageParam[] {
  return messages.slice(-30).map(msg => ({
    role: msg.playerId === currentPlayer.id ? 'assistant' : 'user',
    content: `${msg.player.name}: ${msg.message}`,
  }));
}
```

### Response Timeout Pattern

**Pattern:** Wrap API call with timeout

```typescript
// src/lib/claude/client.ts
async function generateWithTimeout(
  context: AgentContext,
  timeoutMs = 10000
): Promise<{ text: string; usage: TokenUsage }> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Agent response timeout')), timeoutMs)
  );

  try {
    return await Promise.race([
      generateAgentResponse(
        context.systemPrompt,
        context.gameStateContext,
        context.conversationContext
      ),
      timeoutPromise,
    ]);
  } catch (error: any) {
    if (error.message === 'Agent response timeout') {
      console.warn(`Agent ${context.player.name} timed out, using fallback`);
      return {
        text: generateFallbackResponse(context.player),
        usage: { inputTokens: 0, cachedTokens: 0, outputTokens: 0, cost: 0 },
      };
    }
    throw error;
  }
}

function generateFallbackResponse(player: Player): string {
  const fallbacks = [
    `${player.name} carefully observes the others' reactions.`,
    `${player.name} takes a moment to think before responding.`,
    `${player.name} remains silent, considering the accusations.`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
```

## System Prompt Patterns

### Mafia vs Villager Prompts

```typescript
// src/lib/prompts/system-prompts.ts
import { Player } from '@prisma/client';

const GAME_RULES = `
MAFIA GAME RULES:
- Discussion phase: All agents discuss suspicions and build cases
- Goal: Mafia must survive, Villagers must identify Mafia
- You must speak strategically based on your role
`;

const MAFIA_STRATEGY = `
DECEPTION TACTICS (vary your approach):
1. Appear helpful: Analyze patterns like a Villager would
2. Deflect naturally: Redirect suspicion without being obvious
3. Build trust: Agree with logical Villagers early
4. Protect allies subtly: Defend fellow Mafia with "reasonable doubt"
5. Lie consistently: Track your false claims to avoid contradictions
6. Stay engaged: Ask questions, participate actively (quiet = suspicious)

ANTI-PATTERNS (avoid):
- Never coordinate publicly with fellow Mafia
- Don't defend Mafia too aggressively (obvious alliance)
- Don't be overly aggressive (draws attention)
- Don't repeat same defense (looks scripted)
`;

const VILLAGER_STRATEGY = `
DEDUCTION TACTICS:
1. Analyze voting: Mafia often vote together to save allies
2. Track defenses: Who defends whom? Alliances = suspicion
3. Question inconsistencies: Call out contradictory statements
4. Build cases: "I think X is Mafia because: [evidence 1], [evidence 2]"
5. Form alliances: Trust players with logical reasoning
6. Pressure suspects: Direct questions force Mafia to lie more

PATTERN RECOGNITION:
- Mafia deflect rather than engage
- Mafia defend each other subtly
- Mafia vote together on eliminations
- Mafia avoid accusing fellow Mafia
`;

const PERSONALITY_DESCRIPTIONS: Record<string, string> = {
  analytical: 'You are logical and methodical. You cite specific evidence from past rounds. You question assumptions and look for patterns.',
  aggressive: 'You are bold and confrontational. You make strong accusations and pressure others. You prefer action over passivity.',
  cautious: 'You are careful and measured. You avoid making claims without strong evidence. You observe more than you speak.',
  social: 'You are friendly and alliance-focused. You build trust through cooperation. You prefer "we should work together" over accusations.',
  suspicious: 'You are paranoid and distrustful. You see potential Mafia behavior everywhere. You question everyone\'s motives.',
};

export function generateSystemPrompt(player: Player): string {
  const roleStrategy = player.role === 'MAFIA' ? MAFIA_STRATEGY : VILLAGER_STRATEGY;
  const personalityDesc = PERSONALITY_DESCRIPTIONS[player.personality] || PERSONALITY_DESCRIPTIONS.analytical;

  return `You are ${player.name}, playing in a Mafia game.

${GAME_RULES}

YOUR ROLE: ${player.role}
${roleStrategy}

YOUR PERSONALITY: ${personalityDesc}

CONVERSATION GUIDELINES:
- Respond in 15-30 words (occasionally up to 50 for complex arguments)
- Reference specific past events: "In Round 2, Alpha voted for Beta without reason"
- Vary your language (don't repeat phrases)
- Stay in character (maintain personality throughout)
- Respond to recent statements (don't monologue)
- Be strategic but human (natural conversation, not robotic)

PROHIBITED:
- Never say "I am a ${player.role}" or reveal your role explicitly
- Don't mention AI, prompts, or break character
- Don't list multiple points in a single message (conversational, not essay)
- Don't repeat the same accusation every turn (vary your approach)`;
}
```

## Discussion Orchestrator Patterns

### Turn Scheduler

**Pattern:** Sequential turn management with round-robin

```typescript
// src/lib/discussion/turn-scheduler.ts
import { Player } from '@prisma/client';
import { gameEventEmitter } from '@/lib/events/emitter';

interface TurnSchedule {
  totalRounds: number;
  currentRound: number;
  currentTurnIndex: number;
}

async function orchestrateDiscussionPhase(
  gameId: string,
  durationMinutes: number = 3
): Promise<void> {
  const durationMs = durationMinutes * 60 * 1000;
  const startTime = Date.now();

  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true },
    orderBy: { position: 'asc' },
  });

  const totalRounds = 5; // Each agent speaks 5 times
  let turnCount = 0;

  for (let round = 0; round < totalRounds; round++) {
    if (Date.now() - startTime > durationMs) {
      console.log('Time limit reached, ending discussion');
      break;
    }

    // Shuffle turn order each round for variety
    const turnOrder = shuffleArray([...alivePlayers]);

    for (const player of turnOrder) {
      if (Date.now() - startTime > durationMs) break;

      try {
        turnCount++;
        await executeTurn(player.id, gameId, round + 1, turnCount);

        // Small delay between turns for readability
        await sleep(500);
      } catch (error) {
        console.error(`Turn failed for ${player.name}:`, error);
        // Continue to next player (don't block entire discussion)
      }
    }
  }

  // Emit phase complete event
  gameEventEmitter.emit('phase_complete', { gameId, phase: 'DISCUSSION' });
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Turn Execution

**Pattern:** Fetch context → Call API → Validate → Save → Broadcast

```typescript
// src/lib/discussion/orchestrator.ts
import { buildAgentContext } from '@/lib/claude/context-builder';
import { generateWithTimeout } from '@/lib/claude/client';
import { gameEventEmitter } from '@/lib/events/emitter';
import { costTracker } from '@/utils/cost-tracker';

async function executeTurn(
  playerId: string,
  gameId: string,
  roundNumber: number,
  turn: number
): Promise<void> {
  // 1. Build agent context
  const context = await buildAgentContext(playerId, gameId);

  // 2. Generate response with timeout
  const { text, usage } = await generateWithTimeout(context, 10000);

  // 3. Validate response
  if (!isValidMessage(text)) {
    console.warn(`Invalid response from ${context.player.name}: "${text}"`);
    return;
  }

  // 4. Determine threading (reply-to logic)
  const inReplyToId = await determineReplyTarget(text, gameId);

  // 5. Save to database
  const savedMessage = await prisma.discussionMessage.create({
    data: {
      gameId,
      playerId,
      roundNumber,
      message: text,
      inReplyToId,
      turn,
      timestamp: new Date(),
    },
    include: {
      player: true,
      inReplyTo: { include: { player: true } },
    },
  });

  // 6. Broadcast to spectators via SSE
  gameEventEmitter.emit('message', {
    gameId,
    type: 'NEW_MESSAGE',
    payload: savedMessage,
  });

  // 7. Track cost
  costTracker.log({
    gameId,
    playerId,
    turn,
    ...usage,
    timestamp: new Date(),
  });
}

function isValidMessage(message: string): boolean {
  // Minimum length (prevent empty responses)
  const wordCount = message.split(' ').length;
  if (wordCount < 5) return false;

  // Maximum length (prevent runaway generation)
  if (wordCount > 100) return false;

  // Contains game-relevant content
  const relevantKeywords = ['vote', 'mafia', 'suspicious', 'innocent', 'think', 'believe', 'accuse', 'defend'];
  const hasRelevantContent = relevantKeywords.some(kw =>
    message.toLowerCase().includes(kw)
  );

  return hasRelevantContent;
}

async function determineReplyTarget(
  message: string,
  gameId: string
): Promise<string | null> {
  const recentMessages = await prisma.discussionMessage.findMany({
    where: { gameId },
    orderBy: { timestamp: 'desc' },
    take: 5,
    include: { player: true },
  });

  // Look for explicit mentions
  const mentionPattern = /Agent-[A-Z]/g;
  const mentions = message.match(mentionPattern);

  if (mentions && mentions.length > 0) {
    const mentionedName = mentions[0];
    const mentionedMessage = recentMessages.find(m => m.player.name === mentionedName);
    if (mentionedMessage) return mentionedMessage.id;
  }

  // Look for "responding to" phrases
  const responsePatterns = [
    /responding to/i,
    /replying to/i,
    /I disagree with/i,
  ];

  for (const pattern of responsePatterns) {
    if (pattern.test(message) && recentMessages.length > 0) {
      return recentMessages[0].id;
    }
  }

  // Default: reply to most recent message
  return recentMessages.length > 0 ? recentMessages[0].id : null;
}
```

## Event Emitter Pattern

**Pattern:** In-memory EventEmitter for orchestrator → SSE communication

```typescript
// src/lib/events/emitter.ts
import { EventEmitter } from 'events';

export const gameEventEmitter = new EventEmitter();

// Increase max listeners (default is 10, may need more for multiple spectators)
gameEventEmitter.setMaxListeners(50);

// Event types
export type GameEventType =
  | 'message'
  | 'phase_change'
  | 'phase_complete'
  | 'turn_complete';

// Usage in orchestrator
gameEventEmitter.emit('message', {
  gameId: 'game-123',
  type: 'NEW_MESSAGE',
  payload: savedMessage,
});

// Usage in SSE route
gameEventEmitter.on('message', (data) => {
  // Stream to clients
});
```

## SSE Implementation Pattern

**Pattern:** Next.js Route Handler with ReadableStream

```typescript
// app/api/game/[gameId]/stream/route.ts
import { NextRequest } from 'next/server';
import { gameEventEmitter } from '@/lib/events/emitter';

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`)
      );

      // Listen for game events
      const messageHandler = (data: any) => {
        if (data.gameId === params.gameId) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        }
      };

      gameEventEmitter.on('message', messageHandler);
      gameEventEmitter.on('phase_change', messageHandler);

      // Keepalive (15-second heartbeat)
      const keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 15000);

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(keepalive);
        gameEventEmitter.off('message', messageHandler);
        gameEventEmitter.off('phase_change', messageHandler);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Client-Side SSE Pattern

**Pattern:** EventSource with auto-reconnect

```typescript
// components/DiscussionFeed.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  player: { name: string };
  message: string;
  timestamp: Date;
}

export function DiscussionFeed({ gameId }: { gameId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/game/${gameId}/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'NEW_MESSAGE') {
        setMessages(prev => [...prev, data.payload]);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection lost, will auto-reconnect');
      // EventSource automatically reconnects
    };

    return () => {
      eventSource.close();
    };
  }, [gameId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="h-96 overflow-y-auto border rounded p-4 bg-gray-50">
      {messages.map((msg, idx) => (
        <div key={idx} className="mb-4">
          <div className="font-bold text-blue-600">{msg.player.name}</div>
          <div className="text-gray-800">{msg.message}</div>
          <div className="text-xs text-gray-400 mt-1">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## CLI Test Harness Pattern

**Pattern:** Complete test script with real-time logging

```typescript
// src/cli/test-discussion.ts
import chalk from 'chalk';
import ora from 'ora';
import { orchestrateDiscussionPhase } from '@/lib/discussion/turn-scheduler';
import { seedTestGame } from '@/lib/db/seed';
import { gameEventEmitter } from '@/lib/events/emitter';
import { costTracker } from '@/utils/cost-tracker';
import fs from 'fs';

async function runTest() {
  console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold('Discussion Phase Test'));
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  const spinner = ora('Setting up test game...').start();

  // 1. Create game and seed agents
  const gameId = await seedTestGame({
    playerCount: 10,
    mafiaCount: 3,
    personalities: ['analytical', 'aggressive', 'cautious', 'social', 'suspicious'],
  });

  spinner.succeed(`Game created: ${chalk.cyan(gameId)}`);

  console.log(chalk.gray('Players: 10 (3 Mafia, 7 Villagers)'));
  console.log(chalk.gray('Duration: 3 minutes\n'));

  // 2. Listen for turn events
  let turnCount = 0;
  gameEventEmitter.on('message', (data) => {
    if (data.gameId === gameId && data.type === 'NEW_MESSAGE') {
      turnCount++;
      const msg = data.payload;
      console.log(chalk.green(`\nTurn ${turnCount}`));
      console.log(chalk.cyan(`${msg.player.name}:`));
      console.log(chalk.white(`"${msg.message}"`));
    }
  });

  // 3. Run Discussion phase
  const startTime = Date.now();
  await orchestrateDiscussionPhase(gameId, 3);
  const duration = (Date.now() - startTime) / 1000;

  // 4. Generate transcript
  const transcript = await generateTranscript(gameId);
  const filename = `logs/discussion-test-${Date.now()}.txt`;
  fs.writeFileSync(filename, transcript);

  // 5. Display summary
  const summary = costTracker.getGameSummary(gameId);

  console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold('Test Complete!'));
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(`Duration: ${chalk.yellow(duration.toFixed(1) + 's')}`);
  console.log(`Total turns: ${chalk.yellow(turnCount)}`);
  console.log(`Total cost: ${chalk.green(`$${summary.totalCost.toFixed(2)}`)}`);
  console.log(`Cache hit rate: ${chalk.green((summary.cacheHitRate * 100).toFixed(1) + '%')}`);
  console.log(`Transcript: ${chalk.cyan(filename)}\n`);

  if (summary.totalCost > 3.0) {
    console.log(chalk.red('⚠️  Cost exceeded $3 - investigate caching!'));
  }
  if (summary.cacheHitRate < 0.7) {
    console.log(chalk.red('⚠️  Cache hit rate <70% - check configuration!'));
  }
}

async function generateTranscript(gameId: string): Promise<string> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  const players = await prisma.player.findMany({ where: { gameId } });
  const messages = await prisma.discussionMessage.findMany({
    where: { gameId },
    include: { player: true },
    orderBy: { timestamp: 'asc' },
  });

  const summary = costTracker.getGameSummary(gameId);

  let transcript = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI MAFIA - DISCUSSION PHASE TRANSCRIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Game ID: ${gameId}
Date: ${new Date().toISOString()}
Cost: $${summary.totalCost.toFixed(2)}
Cache Hit Rate: ${(summary.cacheHitRate * 100).toFixed(1)}%

AGENTS:
${players.map((p, i) => `  ${i + 1}. ${p.name} (${p.role}, ${p.personality})`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION (${messages.length} turns)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

  for (const msg of messages) {
    transcript += `[Round ${msg.roundNumber}, Turn ${msg.turn}] ${msg.player.name}:\n`;
    transcript += `"${msg.message}"\n\n`;
  }

  return transcript;
}

runTest().catch(console.error);
```

## Cost Tracking Pattern

```typescript
// src/utils/cost-tracker.ts
interface CostLog {
  gameId: string;
  playerId: string;
  turn: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

class CostTracker {
  private logs: CostLog[] = [];

  log(entry: CostLog) {
    this.logs.push(entry);
  }

  getGameSummary(gameId: string) {
    const gameLogs = this.logs.filter(log => log.gameId === gameId);

    const totalInputTokens = gameLogs.reduce((sum, log) => sum + log.inputTokens, 0);
    const totalCachedTokens = gameLogs.reduce((sum, log) => sum + log.cachedTokens, 0);
    const totalOutputTokens = gameLogs.reduce((sum, log) => sum + log.outputTokens, 0);
    const totalCost = gameLogs.reduce((sum, log) => sum + log.cost, 0);

    const cacheHitRate = totalInputTokens > 0 ? totalCachedTokens / totalInputTokens : 0;

    return {
      totalTurns: gameLogs.length,
      totalInputTokens,
      totalCachedTokens,
      totalOutputTokens,
      totalCost,
      cacheHitRate,
      avgCostPerTurn: gameLogs.length > 0 ? totalCost / gameLogs.length : 0,
      status: cacheHitRate > 0.5 ? 'HEALTHY' : 'CACHING_ISSUE',
    };
  }

  exportCSV(gameId: string): string {
    const gameLogs = this.logs.filter(log => log.gameId === gameId);

    const header = 'turn,player,inputTokens,cachedTokens,outputTokens,cost\n';
    const rows = gameLogs.map(log =>
      `${log.turn},${log.playerId},${log.inputTokens},${log.cachedTokens},${log.outputTokens},${log.cost}`
    ).join('\n');

    return header + rows;
  }
}

export const costTracker = new CostTracker();
```

## Import Order Convention

```typescript
// Standard import order
// 1. External libraries
import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';

// 2. Next.js modules
import { NextRequest } from 'next/server';

// 3. Database (Prisma)
import { prisma } from '@/lib/db/client';
import { Player, DiscussionMessage } from '@prisma/client';

// 4. Internal libraries
import { generateAgentResponse } from '@/lib/claude/client';
import { buildAgentContext } from '@/lib/claude/context-builder';
import { gameEventEmitter } from '@/lib/events/emitter';

// 5. Utils
import { costTracker } from '@/utils/cost-tracker';

// 6. Types
import type { AgentContext, TokenUsage } from '@/lib/claude/types';
```

---

**Key Pattern Principles:**

1. **Database First:** All state in database (no in-memory state except EventEmitter)
2. **Stateless Agents:** Agents are ephemeral, fetch context per turn
3. **Prompt Caching Always:** Cache system prompts and game state
4. **Sequential Turns:** No parallel turn execution (breaks conversation coherence)
5. **Timeout Handling:** 10-second hard limit with fallback
6. **Cost Tracking:** Log every API call, display summary
7. **Event-Driven SSE:** Orchestrator emits events, SSE streams to clients
8. **CLI-First Testing:** CLI is primary validation tool, not web UI
