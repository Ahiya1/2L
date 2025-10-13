# Iteration 3: Code Patterns & Architectural Principles

## Logging Patterns

### Pattern 1: Structured Logging with Context
**Description:** Replace all console.log statements with structured Pino logger calls that include contextual metadata.

**Before (Bad):**
```typescript
console.log(`Agent ${playerId} generated response: ${text}`);
console.error('Failed to execute turn:', error);
```

**After (Good):**
```typescript
logger.info({ gameId, playerId, turn, phase }, 'Agent generated response');
logger.error({ gameId, playerId, error: error.message, stack: error.stack }, 'Failed to execute turn');
```

**Key Principles:**
1. **Always include context:** gameId, playerId, phase, round number
2. **Use appropriate log levels:**
   - `debug`: Detailed tracing (cache hits, query times)
   - `info`: Normal operations (agent responses, phase transitions)
   - `warn`: Recoverable issues (agent timeout with fallback)
   - `error`: Failures requiring attention (API errors, database errors)
3. **Don't log sensitive data:** Anthropic API keys, full error stacks in production
4. **Use child loggers for module isolation:**
   ```typescript
   const discussionLogger = logger.child({ module: 'discussion' });
   discussionLogger.info({ gameId }, 'Starting discussion phase');
   ```

### Pattern 2: Cost Tracking with Circuit Breaker
**Description:** Track costs per game and abort if hard limit exceeded.

**Implementation:**
```typescript
// src/utils/cost-tracker.ts (add this method)
export function checkCostLimitOrThrow(gameId: string, maxCost: number = 10.0): void {
  const summary = costTracker.getGameSummary(gameId);
  
  if (summary.totalCost > maxCost) {
    logger.error({ gameId, totalCost: summary.totalCost, maxCost }, 'Cost limit exceeded, aborting game');
    throw new Error(`Game ${gameId} exceeded cost limit of $${maxCost}`);
  }
}

// In turn-executor.ts (call before every agent turn)
checkCostLimitOrThrow(gameId);
const response = await generateAgentResponse(...);
```

**When to Use:**
- Call before each expensive operation (Claude API calls)
- Hard limit: $10/game (configurable via env var)
- Soft warning: $5/game (log warning but continue)

## Database Patterns

### Pattern 3: PostgreSQL Migration Strategy
**Description:** Maintain dual database support (SQLite dev, PostgreSQL prod) with conditional logic.

**Schema Pattern:**
```prisma
datasource db {
  provider = "postgresql"  // Single provider for simplicity
  url      = env("DATABASE_URL")
}

// SQLite development: DATABASE_URL="file:./dev.db"
// PostgreSQL production: DATABASE_URL="postgresql://..."
```

**Migration Commands:**
```bash
# Development (SQLite)
DATABASE_URL="file:./dev.db" npx prisma migrate dev

# Production (PostgreSQL)
npx prisma migrate deploy  # Uses DATABASE_URL from Railway
```

**Index Optimization:**
```prisma
// Add composite indexes for common query patterns
model DiscussionMessage {
  @@index([gameId, roundNumber, timestamp])  // Chronological within round
  @@index([gameId, timestamp])               // Full game history
  @@index([inReplyToId])                     // Threading support
}

model Player {
  @@index([gameId, isAlive, role])  // Alive players with roles (voting)
}
```

### Pattern 4: Database Query Pagination
**Description:** Limit result sets to prevent memory issues with large games.

**Before (Unbounded):**
```typescript
const messages = await prisma.discussionMessage.findMany({
  where: { gameId },
  orderBy: { timestamp: 'asc' },
  include: { player: { select: { id, name, role, isAlive } } },
});
```

**After (Paginated):**
```typescript
const messages = await prisma.discussionMessage.findMany({
  where: { gameId },
  orderBy: { timestamp: 'asc' },
  take: 50,  // Limit to last 50 messages for context
  skip: Math.max(0, totalMessages - 50),
  include: { player: { select: { id, name, role, isAlive } } },
});
```

**When to Use:**
- Context building (limit to last 30-50 messages)
- Message feed rendering (use SSE for live updates, not bulk fetch)
- Cost dashboard (limit to recent games)

## UI/UX Patterns

### Pattern 5: Deterministic Avatar Colors
**Description:** Generate consistent avatar colors based on player name hash.

**Implementation:**
```typescript
// utils/avatar-colors.ts
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getAvatarColor(playerName: string): string {
  const COLORS = [
    'bg-red-500',    // Alice always red
    'bg-blue-500',   // Bob always blue
    'bg-green-500',  // Charlie always green
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];
  
  const index = hashString(playerName) % COLORS.length;
  return COLORS[index];
}
```

**Usage:**
```tsx
<div className={`w-10 h-10 rounded-full ${getAvatarColor(player.name)}`}>
  {player.name[0].toUpperCase()}
</div>
```

### Pattern 6: Message Type Color-Coding
**Description:** Visually distinguish message types (accusations, defenses, questions) with color-coding.

**Implementation:**
```typescript
// utils/message-classification.ts
export type MessageType = 'accusation' | 'defense' | 'question' | 'alliance' | 'neutral';

export function classifyMessage(message: string, playerId: string, context: GameContext): MessageType {
  const lowerMessage = message.toLowerCase();
  
  // Accusation: "I think X is Mafia", "X is suspicious"
  if (/i (think|believe|suspect) .* is (mafia|suspicious)/.test(lowerMessage)) {
    return 'accusation';
  }
  
  // Defense: Message from accused player responding to accusation
  if (context.recentAccusations.some(acc => acc.targetId === playerId)) {
    return 'defense';
  }
  
  // Question: Ends with "?", contains "why", "what", "who"
  if (lowerMessage.includes('?') || /\b(why|what|who|when)\b/.test(lowerMessage)) {
    return 'question';
  }
  
  // Alliance: "I agree with X", "X is right", "let's work together"
  if (/i agree|is right|let'?s (work|team)|trust/.test(lowerMessage)) {
    return 'alliance';
  }
  
  return 'neutral';
}

export function getMessageStyle(type: MessageType): string {
  switch (type) {
    case 'accusation': return 'text-red-600 font-semibold';
    case 'defense': return 'text-blue-600';
    case 'question': return 'text-yellow-600';
    case 'alliance': return 'text-green-600';
    default: return 'text-gray-900';
  }
}
```

**Usage in DiscussionFeed:**
```tsx
const messageType = classifyMessage(msg.message, msg.playerId, context);
const style = getMessageStyle(messageType);

<p className={style}>{msg.message}</p>
```

### Pattern 7: Conversation Threading (CSS Indentation)
**Description:** Show reply relationships using indentation (no complex graph visualization).

**Implementation:**
```tsx
// components/DiscussionFeed.tsx
function getThreadDepth(messageId: string, messages: Message[]): number {
  let depth = 0;
  let currentId = messageId;
  
  while (depth < 3) {  // Max 3 levels to prevent excessive nesting
    const parent = messages.find(m => m.id === currentId)?.inReplyToId;
    if (!parent) break;
    depth++;
    currentId = parent;
  }
  
  return depth;
}

// Render with indentation
{messages.map((msg) => {
  const depth = getThreadDepth(msg.id, messages);
  const indent = depth * 16; // 16px per level
  
  return (
    <div key={msg.id} style={{ marginLeft: `${indent}px` }} className="border-l-2 border-gray-300 pl-2">
      <MessageContent message={msg} />
    </div>
  );
})}
```

## Prompt Engineering Patterns

### Pattern 8: Personality Expansion (5 → 10 types)
**Description:** Add 5 new distinct personalities with unique traits and speech patterns.

**New Personalities:**
```typescript
// src/lib/prompts/system-prompts.ts (add these)
export const EXTENDED_PERSONALITIES = [
  // Original 5
  'analytical',
  'aggressive',
  'cautious',
  'social',
  'suspicious',
  
  // New 5
  'sarcastic',      // Witty, uses irony, questions everything with humor
  'diplomatic',     // Mediator, seeks consensus, avoids conflict
  'emotional',      // Reacts strongly, expresses feelings, takes things personally
  'logical',        // Hyper-rational, demands proof, ignores gut feelings
  'impulsive',      // Quick to judge, changes mind often, acts on hunches
] as const;

// Detailed descriptions (replace current minimal ones)
export function getPersonalityDescription(type: PersonalityType): string {
  const descriptions = {
    analytical: "You are methodical and data-driven. Cite specific evidence (vote patterns, message counts) and build logical cases. Use phrases like 'Based on the evidence...' and 'The pattern shows...'",
    
    aggressive: "You are bold and confrontational. Make direct accusations and challenge others' reasoning. Use phrases like 'I'm calling it now...' and 'Don't buy your excuses...'",
    
    sarcastic: "You use wit and irony to make points. Question others' logic with humor. Use phrases like 'Oh sure, totally believable...' and 'Interesting how convenient that is...'",
    
    diplomatic: "You seek consensus and mediate conflicts. Try to find common ground. Use phrases like 'Let's consider both sides...' and 'Perhaps we can agree that...'",
    
    emotional: "You react strongly to accusations and form gut-based opinions. Take things personally. Use phrases like 'I have a bad feeling about...' and 'It really bothers me that...'",
    
    // ... define all 10
  };
  
  return descriptions[type];
}
```

### Pattern 9: Anti-Repetition Tracking
**Description:** Track agent's last 3 message phrases and prevent verbatim repetition.

**Implementation:**
```typescript
// src/utils/repetition-tracker.ts
const agentPhrases = new Map<string, string[]>(); // playerId → last 3 phrases

export function extractPhrases(message: string): string[] {
  const words = message.toLowerCase().split(/\s+/);
  const phrases: string[] = [];
  
  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i+1]} ${words[i+2]}`);
  }
  
  return phrases;
}

export function addAgentMessage(playerId: string, message: string): void {
  const phrases = extractPhrases(message);
  const existing = agentPhrases.get(playerId) || [];
  
  // Keep last 3 messages' phrases
  agentPhrases.set(playerId, [...phrases, ...existing].slice(0, 20));
}

export function getProhibitedPhrases(playerId: string): string[] {
  return agentPhrases.get(playerId) || [];
}

// In context-builder.ts (add to system prompt)
const prohibitedPhrases = getProhibitedPhrases(playerId);
if (prohibitedPhrases.length > 0) {
  systemPrompt += `\n\nDon't repeat these exact phrases from your recent messages: ${prohibitedPhrases.slice(0, 5).join(', ')}`;
}
```

## Deployment Patterns

### Pattern 10: Environment-Aware Configuration
**Description:** Conditional behavior based on NODE_ENV (development vs production).

**Implementation:**
```typescript
// src/lib/config.ts
export const config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    pretty: process.env.NODE_ENV === 'development',
  },
  
  database: {
    url: process.env.DATABASE_URL!,
    isPostgres: process.env.DATABASE_URL?.startsWith('postgresql'),
  },
  
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    timeoutMs: 10000,
    maxRetries: 3,
  },
  
  cost: {
    softLimit: 5.0,  // Warn at $5
    hardLimit: 10.0, // Abort at $10
    targetCacheHitRate: 0.70, // 70%
  },
  
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
};

// Usage
if (config.isProduction) {
  logger.info('Running in production mode');
}
```

### Pattern 11: Health Check Endpoint
**Description:** Railway healthcheck endpoint to verify app is running.

**Implementation:**
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db/client';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Anthropic API key exists
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      apiKey: hasApiKey ? 'configured' : 'missing',
      version: process.env.npm_package_version || 'unknown',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

**Railway Config:**
```json
{
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100
  }
}
```

## Error Handling Patterns

### Pattern 12: SSE Reconnection with Exponential Backoff
**Description:** Client-side SSE reconnection logic to handle network failures gracefully.

**Implementation:**
```typescript
// contexts/GameEventsContext.tsx (update)
function useSSEConnection(gameId: string) {
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [retries, setRetries] = useState(0);
  const maxRetries = 5;
  
  const connect = useCallback(() => {
    const es = new EventSource(`/api/game/${gameId}/stream`);
    
    es.onerror = () => {
      es.close();
      
      if (retries < maxRetries) {
        const delay = Math.pow(2, retries) * 1000; // 1s, 2s, 4s, 8s, 16s
        logger.warn({ gameId, retries, delay }, 'SSE connection failed, retrying');
        
        setTimeout(() => {
          setRetries(r => r + 1);
          connect();
        }, delay);
      } else {
        logger.error({ gameId }, 'SSE max retries exceeded, falling back to polling');
        // Fall back to polling (existing implementation)
      }
    };
    
    es.onopen = () => {
      logger.info({ gameId }, 'SSE connection established');
      setRetries(0); // Reset retry count on successful connection
    };
    
    setEventSource(es);
  }, [gameId, retries]);
  
  useEffect(() => {
    connect();
    return () => eventSource?.close();
  }, []);
}
```

## Performance Patterns

### Pattern 13: Lazy Loading Components
**Description:** Code-split optional components to reduce initial bundle size.

**Implementation:**
```typescript
// app/game/[gameId]/page.tsx
import dynamic from 'next/dynamic';

// Lazy load VoteTally (only shown during VOTING phase)
const VoteTally = dynamic(() => import('@/components/VoteTally'), {
  loading: () => <div className="animate-pulse">Loading votes...</div>,
  ssr: false, // No server-side rendering needed
});

// Conditional rendering
{currentPhase === 'VOTING' && (
  <VoteTally gameId={gameId} currentRound={currentRound} />
)}
```

**Bundle Impact:**
- Before: VoteTally in main bundle (94KB)
- After: VoteTally in separate chunk (~5KB, loaded only when needed)
- Savings: ~5% bundle reduction

### Pattern 14: React Performance Optimization
**Description:** Use useMemo and useCallback to prevent unnecessary re-renders.

**Implementation:**
```typescript
// components/DiscussionFeed.tsx
import { useMemo, useCallback } from 'react';

function DiscussionFeed({ messages, playerNames }: Props) {
  // Memoize expensive regex highlighting
  const highlightedMessages = useMemo(() => {
    return messages.map(msg => ({
      ...msg,
      highlighted: highlightAccusations(msg.message, playerNames),
    }));
  }, [messages, playerNames]); // Only recompute when inputs change
  
  // Memoize scroll handler
  const handleScroll = useCallback((e: React.UIEvent) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
    setAutoScroll(isAtBottom);
  }, []); // Stable reference
  
  return (
    <div onScroll={handleScroll}>
      {highlightedMessages.map(msg => (
        <MessageItem key={msg.id} message={msg.highlighted} />
      ))}
    </div>
  );
}
```

## Shareable URL Patterns

### Pattern 15: Permalink Generation
**Description:** Generate short, shareable URLs for completed games.

**Implementation:**
```typescript
// app/api/game/[gameId]/share/route.ts
import { nanoid } from 'nanoid';

export async function POST(req: Request, { params }: { params: { gameId: string } }) {
  const { gameId } = params;
  
  // Verify game is complete
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (game?.status !== 'GAME_OVER') {
    return NextResponse.json({ error: 'Game not complete' }, { status: 400 });
  }
  
  // Check if share already exists
  const existing = await prisma.sharedGame.findUnique({ where: { gameId } });
  if (existing) {
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${existing.id}`;
    return NextResponse.json({ shareUrl });
  }
  
  // Create new share link
  const shareId = nanoid(12); // e.g., "xK9fG2pQ4mN8"
  await prisma.sharedGame.create({
    data: { id: shareId, gameId },
  });
  
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${shareId}`;
  return NextResponse.json({ shareUrl });
}
```

**Database Model:**
```prisma
model SharedGame {
  id        String   @id // nanoid(12)
  gameId    String   @unique
  createdAt DateTime @default(now())
  
  game Game @relation(fields: [gameId], references: [id])
  
  @@index([gameId])
}
```

## Documentation Patterns

### Pattern 16: Inline Code Documentation
**Description:** Document complex logic with JSDoc comments for maintainability.

**Implementation:**
```typescript
/**
 * Generates agent response using Claude API with prompt caching.
 * 
 * @param context - Agent context (system prompt, game state, conversation history)
 * @param config - Claude API configuration (model, temperature, timeout)
 * @returns Agent response text or null if failed after retries
 * 
 * @throws {Error} If API key is missing or invalid
 * 
 * @example
 * const response = await generateAgentResponse(context, config);
 * if (response) {
 *   await saveMessage(gameId, playerId, response);
 * }
 * 
 * Cost optimization:
 * - System prompt (2500 tokens) cached for 5 min → 90% cost reduction
 * - Game state (500 tokens) cached for 5 min → 90% cost reduction
 * - Conversation history (750 tokens) NOT cached (changes every turn)
 * - Expected cache hit rate: 70-80% across sequential turns
 */
export async function generateAgentResponse(
  context: AgentContext,
  config: ClaudeConfig = DEFAULT_CONFIG
): Promise<string | null> {
  // Implementation
}
```

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Console.log in Production
```typescript
// BAD
console.log('User created game:', gameId);

// GOOD
logger.info({ gameId, playerCount }, 'Game created');
```

### ❌ Anti-Pattern 2: Unbounded Database Queries
```typescript
// BAD
const allMessages = await prisma.discussionMessage.findMany({ where: { gameId } });

// GOOD
const recentMessages = await prisma.discussionMessage.findMany({
  where: { gameId },
  orderBy: { timestamp: 'desc' },
  take: 50,
});
```

### ❌ Anti-Pattern 3: Hardcoded Configuration
```typescript
// BAD
const API_KEY = 'sk-ant-api03-...';
const MAX_COST = 5.0;

// GOOD
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_COST = parseFloat(process.env.COST_LIMIT || '10.0');
```

### ❌ Anti-Pattern 4: Ignoring TypeScript Errors
```typescript
// BAD (next.config.mjs)
typescript: {
  ignoreBuildErrors: true,
}

// GOOD
typescript: {
  ignoreBuildErrors: false, // Fix all type errors
}
```

### ❌ Anti-Pattern 5: Synchronous File I/O in Loops
```typescript
// BAD
for (const file of files) {
  const content = fs.readFileSync(file);
  processContent(content);
}

// GOOD
const contents = await Promise.all(
  files.map(file => fs.promises.readFile(file))
);
contents.forEach(processContent);
```

## Code Style Guidelines

1. **File Organization:**
   - Place utilities in `/src/utils/`
   - Place types in `/src/types/`
   - Place shared components in `/components/`
   - Keep API routes in `/app/api/`

2. **Naming Conventions:**
   - Components: PascalCase (`DiscussionFeed.tsx`)
   - Utilities: camelCase (`cost-tracker.ts`)
   - Types: PascalCase (`type GameState = ...`)
   - Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)

3. **Import Order:**
   ```typescript
   // 1. External libraries
   import { useState } from 'react';
   import { prisma } from '@prisma/client';
   
   // 2. Internal modules (absolute imports)
   import { logger } from '@/src/lib/logger';
   import { GameState } from '@/src/types/game';
   
   // 3. Relative imports
   import { LocalComponent } from './LocalComponent';
   ```

4. **Error Handling:**
   - Always log errors with context (gameId, playerId)
   - Use try-catch for external API calls
   - Return structured errors from API routes
   - Never expose stack traces to client in production
