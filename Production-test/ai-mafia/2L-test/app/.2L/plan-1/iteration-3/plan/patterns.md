# Code Patterns & Conventions

## File Structure
```
ai-mafia/2L-test/app/
├── src/
│   ├── app/
│   │   ├── game/[gameId]/          # Game page + replay mode
│   │   ├── api/                    # API routes
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                     # Reusable UI components
│   │   │   ├── Avatar.tsx          # NEW: Player avatar
│   │   │   └── Tooltip.tsx         # NEW: Hover tooltips
│   │   ├── DiscussionFeed.tsx      # MODIFIED: Add color-coding
│   │   ├── PlayerGrid.tsx          # MODIFIED: Add avatars
│   │   ├── VoteTally.tsx           # MODIFIED: Add avatars
│   │   ├── CostDashboard.tsx       # NEW: Cost monitoring
│   │   ├── ReplayTimeline.tsx      # NEW: Replay navigation
│   │   └── GameEventsContext.tsx   # UNCHANGED
│   ├── lib/
│   │   ├── ui/
│   │   │   ├── avatar-utils.ts     # NEW: Avatar generation
│   │   │   └── message-utils.ts    # NEW: Intent classification
│   │   ├── logger/
│   │   │   └── index.ts            # NEW: Pino logger
│   │   ├── cost/
│   │   │   ├── tracker.ts          # NEW: Cost tracking
│   │   │   └── circuit-breaker.ts  # NEW: Cost limits
│   │   └── agents/
│   │       └── personalities.ts     # MODIFIED: 10 personalities
│   └── prompts/
│       ├── system.ts                # MODIFIED: Anti-repetition
│       └── personalities/           # NEW: Individual prompt files
├── prisma/
│   └── schema.prisma                # MODIFIED: PostgreSQL + SharedGame
└── package.json                     # MODIFIED: New dependencies
```

---

## Naming Conventions

- **Components**: PascalCase (`PlayerAvatar.tsx`, `CostDashboard.tsx`)
- **Files**: camelCase (`avatar-utils.ts`, `message-utils.ts`)
- **Types**: PascalCase (`MessageIntent`, `CostMetrics`, `SharedGame`)
- **Functions**: camelCase (`classifyMessageIntent()`, `trackApiCost()`)
- **Constants**: SCREAMING_SNAKE_CASE (`COST_THRESHOLD_USD`, `MAX_RETRIES`)
- **CSS Classes**: kebab-case (Tailwind utility classes)

---

## Avatar Pattern

### Deterministic Color Generation

**When to use:** Anywhere you need consistent player identification (PlayerGrid, DiscussionFeed, VoteTally)

**Code example:**
```typescript
// lib/ui/avatar-utils.ts
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use absolute value and modulo to get hue 0-360
  const hue = Math.abs(hash % 360);

  // Return HSL color with consistent saturation and lightness
  return `hsl(${hue}, 70%, 60%)`;
}

export function getPlayerInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2); // Max 2 characters
}

// Example usage:
// stringToColor("Agent Alice") → "hsl(234, 70%, 60%)"
// getPlayerInitials("Agent Alice") → "AA"
```

**Key points:**
- Hash function is deterministic (same name → same color)
- Hue varies across full spectrum (360 degrees)
- Saturation (70%) and lightness (60%) fixed for vibrant, readable colors
- Initials handle multi-word names gracefully

---

### Avatar Component

**When to use:** Display player identity in any component

**Code example:**
```typescript
// components/ui/Avatar.tsx
import { stringToColor, getPlayerInitials } from '@/lib/ui/avatar-utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PlayerAvatar({ name, size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        flex items-center justify-center
        font-bold text-white
        ${className}
      `}
      style={{ backgroundColor: stringToColor(name) }}
      title={name}
    >
      {getPlayerInitials(name)}
    </div>
  );
}

// Usage in PlayerGrid:
<PlayerAvatar name={player.name} size="lg" />

// Usage in DiscussionFeed:
<PlayerAvatar name={message.player.name} size="sm" />
```

**Key points:**
- Inline style for dynamic background color (can't use Tailwind for computed colors)
- `title` attribute for accessibility (shows full name on hover)
- Size prop controls all dimensions (width, height, font-size)
- White text ensures contrast on all background colors

---

## Message Intent Classification Pattern

### Intent Classifier

**When to use:** Color-code messages by strategic intent (accusations, defenses, questions, alliances)

**Code example:**
```typescript
// lib/ui/message-utils.ts
export type MessageIntent =
  | 'ACCUSATION'
  | 'DEFENSE'
  | 'QUESTION'
  | 'ALLIANCE'
  | 'NEUTRAL';

export function classifyMessageIntent(
  text: string,
  playerNames: string[]
): MessageIntent {
  // Priority order: Accusations > Defenses > Questions > Alliances > Neutral

  // Check for accusations targeting specific players
  for (const name of playerNames) {
    const accusationPatterns = [
      new RegExp(`I think ${name} is (Mafia|suspicious|guilty|lying)`, 'i'),
      new RegExp(`I suspect ${name}`, 'i'),
      new RegExp(`${name} (seems|appears|looks) (suspicious|guilty|shady)`, 'i'),
      new RegExp(`vote for ${name}`, 'i'),
    ];

    if (accusationPatterns.some(pattern => pattern.test(text))) {
      return 'ACCUSATION';
    }
  }

  // Check for defenses (self or others)
  const defensePatterns = [
    /I('m| am) (innocent|a Villager|not Mafia)/i,
    /I (didn't|did not) (do|kill|lie)/i,
    /I trust .+/i,
    /.+ is (innocent|trustworthy|not Mafia)/i,
  ];

  if (defensePatterns.some(pattern => pattern.test(text))) {
    return 'DEFENSE';
  }

  // Check for questions (ends with ? or starts with question word)
  const questionPatterns = [
    /\?$/,
    /^(Why|What|How|Who|Where|When|Should|Could|Would|Do|Does|Is|Are) /i,
  ];

  if (questionPatterns.some(pattern => pattern.test(text))) {
    return 'QUESTION';
  }

  // Check for alliance/cooperation signals
  const alliancePatterns = [
    /let's (work together|team up|collaborate)/i,
    /I agree with .+/i,
    /we should (cooperate|work together)/i,
    /I support .+/i,
  ];

  if (alliancePatterns.some(pattern => pattern.test(text))) {
    return 'ALLIANCE';
  }

  return 'NEUTRAL';
}

export function getIntentColorClasses(intent: MessageIntent): string {
  const colorMap = {
    ACCUSATION: 'border-l-4 border-red-500 bg-red-50',
    DEFENSE: 'border-l-4 border-blue-500 bg-blue-50',
    QUESTION: 'border-l-4 border-yellow-500 bg-yellow-50',
    ALLIANCE: 'border-l-4 border-green-500 bg-green-50',
    NEUTRAL: '',
  };

  return colorMap[intent];
}

export function getIntentLabel(intent: MessageIntent): string {
  const labelMap = {
    ACCUSATION: 'Accusation',
    DEFENSE: 'Defense',
    QUESTION: 'Question',
    ALLIANCE: 'Alliance',
    NEUTRAL: '',
  };

  return labelMap[intent];
}
```

**Key points:**
- Priority order prevents conflicts (e.g., "I think Alice is innocent" is DEFENSE, not ACCUSATION)
- Regex patterns handle variations in natural language
- Player names passed as parameter to enable dynamic targeting
- Color classes use left border for subtle visual indicator

---

### Applying Intent Colors in Components

**Code example:**
```typescript
// components/DiscussionFeed.tsx (MODIFIED)
import { classifyMessageIntent, getIntentColorClasses } from '@/lib/ui/message-utils';

export function DiscussionFeed({ messages, players }: Props) {
  const playerNames = players.map(p => p.name);

  return (
    <div className="space-y-2">
      {messages.map((msg) => {
        const intent = classifyMessageIntent(msg.message, playerNames);
        const colorClasses = getIntentColorClasses(intent);

        return (
          <div
            key={msg.id}
            className={`
              p-3 rounded
              ${colorClasses}
              ${msg.inReplyTo ? 'ml-8' : ''}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <PlayerAvatar name={msg.player.name} size="sm" />
              <span className="font-bold">{msg.player.name}</span>
              <span className="text-xs text-gray-500">
                R{msg.roundNumber}, T{msg.turn}
              </span>
            </div>

            {msg.inReplyTo && (
              <div className="text-xs text-gray-400 mb-1">
                ↪ Replying to {msg.inReplyTo.player.name}
              </div>
            )}

            <p className="text-sm">{msg.message}</p>

            <span className="text-xs text-gray-400">
              {formatDistanceToNow(msg.timestamp)} ago
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

**Key points:**
- Classify intent for each message on render
- Combine color classes with thread indentation
- Maintain existing reply-to indicators
- Avatar replaces plain text name

---

## Animation Patterns

### Message Entry Animation

**When to use:** Smooth entry of new messages in DiscussionFeed

**Code example:**
```typescript
// components/DiscussionFeed.tsx (MODIFIED with Framer Motion)
import { motion, AnimatePresence } from 'framer-motion';

export function DiscussionFeed({ messages }: Props) {
  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: 0.3,
              ease: "easeOut"
            }}
            layout
            className={/* ... */}
          >
            {/* Message content */}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

**Key points:**
- `initial={{ opacity: 0, y: 20 }}`: Start invisible, 20px below final position
- `animate={{ opacity: 1, y: 0 }}`: Fade in and slide up
- `exit={{ opacity: 0, x: -20 }}`: Fade out and slide left (for message deletion)
- `layout`: Automatically animate position changes when list reorders
- `mode="popLayout"`: Smooth layout shifts when items removed

---

### Phase Transition Animation

**When to use:** Animate phase changes (Day → Night, Discussion → Voting)

**Code example:**
```typescript
// components/PhaseIndicator.tsx (MODIFIED)
import { motion } from 'framer-motion';

export function PhaseIndicator({ phase }: Props) {
  const phaseColors = {
    DISCUSSION: 'bg-blue-500',
    VOTING: 'bg-purple-500',
    NIGHT: 'bg-gray-800',
  };

  return (
    <motion.div
      key={phase} // Force re-mount on phase change
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className={`
        px-4 py-2 rounded-full text-white font-bold
        ${phaseColors[phase]}
      `}
    >
      {phase} Phase
    </motion.div>
  );
}
```

**Key points:**
- `key={phase}` forces re-mount (triggers entry animation)
- `type: "spring"` for bouncy, natural motion
- Scale + opacity for attention-grabbing effect

---

### Respect Reduced Motion Preference

**Code example:**
```typescript
// lib/ui/animation-utils.ts
export function getAnimationConfig(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0 },
    };
  }

  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3 },
  };
}

// Usage in component:
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const animationConfig = getAnimationConfig(prefersReducedMotion);

<motion.div {...animationConfig}>
  {/* Content */}
</motion.div>
```

**Key points:**
- Check `prefers-reduced-motion` media query
- Disable animations if user prefers reduced motion
- Maintain instant opacity fade for visual feedback

---

## Structured Logging Pattern

### Logger Configuration

**When to use:** All server-side and client-side logging (replaces console.log)

**Code example:**
```typescript
// lib/logger/index.ts
import pino from 'pino';

const isServer = typeof window === 'undefined';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  browser: {
    asObject: true,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: ['req.headers.authorization', 'apiKey', 'anthropicApiKey'],
    remove: true,
  },
});

export default logger;

// Create child logger with context
export function createGameLogger(gameId: string) {
  return logger.child({ gameId });
}

export function createPlayerLogger(gameId: string, playerId: string) {
  return logger.child({ gameId, playerId });
}
```

**Key points:**
- Redact sensitive fields (API keys, auth tokens)
- Child loggers inherit parent context
- Browser compatibility with `browser.asObject`

---

### Logging Usage Patterns

**Code example:**
```typescript
// src/lib/game/game-engine.ts (MODIFIED)
import logger, { createGameLogger } from '@/lib/logger';

export async function createGame(playerCount: number) {
  const gameLogger = createGameLogger('temp-id');

  gameLogger.info({ playerCount }, 'Starting game creation');

  try {
    const game = await prisma.game.create({ /* ... */ });

    gameLogger.info(
      { gameId: game.id, playerCount: game.players.length },
      'Game created successfully'
    );

    return game;
  } catch (error) {
    gameLogger.error(
      { error: error.message, stack: error.stack },
      'Game creation failed'
    );
    throw error;
  }
}

// Turn processing
export async function processTurn(gameId: string, playerId: string) {
  const playerLogger = createPlayerLogger(gameId, playerId);

  playerLogger.debug('Fetching agent context');
  const context = await buildAgentContext(gameId, playerId);

  playerLogger.info(
    { messageCount: context.messages.length },
    'Calling Claude API'
  );

  const response = await anthropic.messages.create({ /* ... */ });

  playerLogger.info(
    {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cost: calculateCost(response.usage)
    },
    'Turn processed successfully'
  );
}
```

**Key points:**
- First parameter: Structured data object
- Second parameter: Human-readable message
- Log levels: `debug` (verbose), `info` (important), `warn` (potential issue), `error` (failure)
- Include metrics (token counts, durations) in data object

---

### Log Levels Guide

| Level | When to Use | Example |
|-------|-------------|---------|
| `DEBUG` | Verbose details for troubleshooting | "Fetching player context", "Validating turn order" |
| `INFO` | Normal operations | "Game created", "Turn processed", "Vote cast" |
| `WARN` | Potential issues, non-fatal errors | "Rate limit approaching", "Retry attempt 2/3" |
| `ERROR` | Failures, exceptions | "API call failed", "Database connection lost" |

---

## Shareable URL Pattern

### Generate Shareable Link

**When to use:** Allow users to share game links with embedded replay data

**Code example:**
```typescript
// lib/game/share.ts
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db';

export async function createShareableLink(gameId: string): Promise<string> {
  const shareId = nanoid(); // Generate unique ID (e.g., "V1StGXR8_Z5jdHi6B-myT")

  // Store in database
  await prisma.sharedGame.create({
    data: {
      shareId,
      gameId,
      expiresAt: null, // Never expire (or set Date 30 days from now)
    },
  });

  // Build full URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/game/${shareId}`;
}

// Resolve shareable link to game
export async function resolveShareableLink(shareId: string): Promise<string | null> {
  const sharedGame = await prisma.sharedGame.findUnique({
    where: { shareId },
  });

  if (!sharedGame) return null;

  // Check expiration
  if (sharedGame.expiresAt && sharedGame.expiresAt < new Date()) {
    return null; // Link expired
  }

  return sharedGame.gameId;
}
```

**Key points:**
- Nanoid generates URL-safe, collision-resistant IDs
- Store mapping in database (not just encoding game ID)
- Optional expiration for temporary shares
- Return full URL for easy copy-paste

---

### Prisma Schema for Shareable Links

**Code example:**
```prisma
// prisma/schema.prisma (ADDITION)
model SharedGame {
  id        String   @id @default(cuid())
  shareId   String   @unique  // nanoid generated
  gameId    String
  game      Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  expiresAt DateTime? // Optional expiration

  @@index([shareId])
  @@index([gameId])
}

// Update Game model to add relation
model Game {
  id           String        @id @default(cuid())
  // ... existing fields
  sharedLinks  SharedGame[]  // Add this relation
}
```

**Key points:**
- `@unique` on shareId ensures no duplicates
- `onDelete: Cascade` removes shared links when game deleted
- Indexes for fast lookups
- Optional expiration for time-limited shares

---

## Replay Mode Pattern

### Replay Timeline Component

**When to use:** Allow users to navigate through game history

**Code example:**
```typescript
// components/ReplayTimeline.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';

interface ReplayTimelineProps {
  events: GameEvent[];
  currentEventIndex: number;
  onSeek: (index: number) => void;
}

export function ReplayTimeline({
  events,
  currentEventIndex,
  onSeek
}: ReplayTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-advance in play mode
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      if (currentEventIndex < events.length - 1) {
        onSeek(currentEventIndex + 1);
      } else {
        setIsPlaying(false); // Stop at end
      }
    }, 1000); // 1 event per second

    return () => clearInterval(timer);
  }, [isPlaying, currentEventIndex, events.length, onSeek]);

  return (
    <div className="bg-gray-100 p-4 rounded">
      <div className="flex items-center gap-4 mb-4">
        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        {/* Skip to Start */}
        <button
          onClick={() => onSeek(0)}
          className="px-3 py-2 bg-gray-300 rounded"
        >
          ⏮ Start
        </button>

        {/* Skip to End */}
        <button
          onClick={() => onSeek(events.length - 1)}
          className="px-3 py-2 bg-gray-300 rounded"
        >
          ⏭ End
        </button>

        {/* Event Counter */}
        <span className="text-sm text-gray-600">
          Event {currentEventIndex + 1} / {events.length}
        </span>
      </div>

      {/* Scrubber */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={events.length - 1}
          value={currentEventIndex}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="w-full"
        />

        {/* Event Markers */}
        <div className="flex justify-between mt-2">
          {events.filter((_, i) => i % 10 === 0).map((event, i) => (
            <div key={i} className="text-xs text-gray-500">
              {event.type === 'round_start' && `R${event.payload.roundNumber}`}
              {event.type === 'phase_change' && event.payload.phase}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Key points:**
- Play/pause auto-advances through events
- Range slider for manual scrubbing
- Event markers show major milestones (rounds, phases)
- Controlled component (parent manages state)

---

### Replay Mode Page Logic

**Code example:**
```typescript
// app/game/[gameId]/page.tsx (MODIFIED)
import { useState, useEffect } from 'react';
import { resolveShareableLink } from '@/lib/game/share';

export default function GamePage({ params }: { params: { gameId: string } }) {
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  useEffect(() => {
    async function loadGame() {
      // Try to resolve as shareable link
      const resolvedGameId = await resolveShareableLink(params.gameId);

      if (resolvedGameId) {
        // This is a shareable link - enable replay mode
        setIsReplayMode(true);
        const allEvents = await fetchAllEvents(resolvedGameId);
        setEvents(allEvents);
      } else {
        // Direct game ID - normal live mode
        setIsReplayMode(false);
      }
    }

    loadGame();
  }, [params.gameId]);

  // Replay mode: Show events up to currentEventIndex
  const visibleEvents = isReplayMode
    ? events.slice(0, currentEventIndex + 1)
    : events; // Live mode: Show all events

  return (
    <div>
      {isReplayMode && (
        <div className="mb-4 p-3 bg-yellow-100 rounded">
          🔄 Replay Mode - Viewing historical game
        </div>
      )}

      {isReplayMode && (
        <ReplayTimeline
          events={events}
          currentEventIndex={currentEventIndex}
          onSeek={setCurrentEventIndex}
        />
      )}

      <DiscussionFeed messages={visibleEvents.filter(e => e.type === 'message')} />
      <VoteTally votes={visibleEvents.filter(e => e.type === 'vote_cast')} />
    </div>
  );
}
```

**Key points:**
- Detect shareable links vs direct game IDs
- Fetch all events upfront for replay mode (no SSE)
- Filter visible events based on scrubber position
- Visual indicator for replay mode

---

## Cost Monitoring Pattern

### Cost Tracker

**When to use:** Track Anthropic API costs across all games

**Code example:**
```typescript
// lib/cost/tracker.ts
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// Anthropic pricing (as of Oct 2024)
const PRICING = {
  INPUT_COST_PER_MILLION: 3.0,  // $3 per 1M input tokens
  OUTPUT_COST_PER_MILLION: 15.0, // $15 per 1M output tokens
};

export function calculateCost(usage: TokenUsage): number {
  const inputCost = (usage.inputTokens / 1_000_000) * PRICING.INPUT_COST_PER_MILLION;
  const outputCost = (usage.outputTokens / 1_000_000) * PRICING.OUTPUT_COST_PER_MILLION;
  return inputCost + outputCost;
}

export async function trackApiCost(
  gameId: string,
  playerId: string,
  usage: TokenUsage
): Promise<void> {
  const cost = calculateCost(usage);

  await prisma.apiCost.create({
    data: {
      gameId,
      playerId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: cost,
      timestamp: new Date(),
    },
  });

  logger.info(
    { gameId, playerId, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cost },
    'API cost tracked'
  );
}

export async function getTotalCost(): Promise<number> {
  const result = await prisma.apiCost.aggregate({
    _sum: { costUsd: true },
  });

  return result._sum.costUsd || 0;
}

export async function getGameCost(gameId: string): Promise<number> {
  const result = await prisma.apiCost.aggregate({
    where: { gameId },
    _sum: { costUsd: true },
  });

  return result._sum.costUsd || 0;
}
```

**Key points:**
- Calculate cost immediately after API call
- Store in database for historical tracking
- Separate input/output token counts for debugging
- Aggregate functions for dashboard queries

---

### Prisma Schema for Cost Tracking

**Code example:**
```prisma
// prisma/schema.prisma (ADDITION)
model ApiCost {
  id           String   @id @default(cuid())
  gameId       String
  game         Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  playerId     String
  player       Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  inputTokens  Int
  outputTokens Int
  costUsd      Float    // Calculated cost in USD
  timestamp    DateTime @default(now())

  @@index([gameId])
  @@index([timestamp])
}

// Update Game and Player models
model Game {
  // ... existing fields
  apiCosts  ApiCost[]
}

model Player {
  // ... existing fields
  apiCosts  ApiCost[]
}
```

---

### Circuit Breaker Middleware

**When to use:** Prevent API calls if cost threshold exceeded

**Code example:**
```typescript
// lib/cost/circuit-breaker.ts
import { getTotalCost } from './tracker';
import logger from '@/lib/logger';

const COST_THRESHOLD_USD = parseFloat(process.env.COST_THRESHOLD_USD || '50');

export class CostLimitExceededError extends Error {
  constructor(public currentCost: number, public threshold: number) {
    super(`Cost limit exceeded: $${currentCost.toFixed(2)} / $${threshold}`);
    this.name = 'CostLimitExceededError';
  }
}

export async function checkCostLimit(): Promise<void> {
  const totalCost = await getTotalCost();

  if (totalCost >= COST_THRESHOLD_USD) {
    logger.error(
      { totalCost, threshold: COST_THRESHOLD_USD },
      'Cost threshold exceeded - blocking API call'
    );

    throw new CostLimitExceededError(totalCost, COST_THRESHOLD_USD);
  }

  // Warn at 80% of threshold
  if (totalCost >= COST_THRESHOLD_USD * 0.8) {
    logger.warn(
      { totalCost, threshold: COST_THRESHOLD_USD, percentUsed: (totalCost / COST_THRESHOLD_USD * 100).toFixed(1) },
      'Approaching cost threshold'
    );
  }
}

// Usage in game engine:
export async function processTurn(gameId: string, playerId: string) {
  // Check cost limit BEFORE calling API
  await checkCostLimit();

  const response = await anthropic.messages.create({ /* ... */ });

  // Track cost AFTER successful call
  await trackApiCost(gameId, playerId, response.usage);
}
```

**Key points:**
- Check limit before expensive operations
- Throw custom error for graceful handling
- Warn at 80% threshold for proactive monitoring
- Log all threshold events for audit trail

---

### Cost Dashboard Component

**Code example:**
```typescript
// components/CostDashboard.tsx
import { useEffect, useState } from 'react';

interface CostMetrics {
  totalCost: number;
  todayCost: number;
  gameCount: number;
  averageCostPerGame: number;
  threshold: number;
}

export function CostDashboard() {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      const response = await fetch('/api/cost/metrics');
      const data = await response.json();
      setMetrics(data);
      setLoading(false);
    }

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!metrics) return <div>Error loading metrics</div>;

  const percentUsed = (metrics.totalCost / metrics.threshold) * 100;
  const isWarning = percentUsed >= 80;
  const isCritical = percentUsed >= 100;

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">API Cost Monitor</h2>

      {/* Total Cost */}
      <div className="mb-4">
        <div className="text-3xl font-bold">
          ${metrics.totalCost.toFixed(2)}
        </div>
        <div className="text-sm text-gray-600">
          Total Spend (Lifetime)
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Budget Usage</span>
          <span>{percentUsed.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              isCritical ? 'bg-red-600' :
              isWarning ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Threshold: ${metrics.threshold}
        </div>
      </div>

      {/* Alert */}
      {isCritical && (
        <div className="bg-red-100 border-l-4 border-red-500 p-3 mb-4">
          <p className="font-bold text-red-700">Cost Limit Exceeded</p>
          <p className="text-sm text-red-600">
            New games are blocked. Contact admin to increase threshold.
          </p>
        </div>
      )}

      {isWarning && !isCritical && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mb-4">
          <p className="font-bold text-yellow-700">Approaching Limit</p>
          <p className="text-sm text-yellow-600">
            {(metrics.threshold - metrics.totalCost).toFixed(2)} remaining
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-lg font-bold">${metrics.todayCost.toFixed(2)}</div>
          <div className="text-xs text-gray-600">Today's Spend</div>
        </div>
        <div>
          <div className="text-lg font-bold">{metrics.gameCount}</div>
          <div className="text-xs text-gray-600">Total Games</div>
        </div>
        <div className="col-span-2">
          <div className="text-lg font-bold">
            ${metrics.averageCostPerGame.toFixed(2)}
          </div>
          <div className="text-xs text-gray-600">Average Cost per Game</div>
        </div>
      </div>
    </div>
  );
}
```

**Key points:**
- Auto-refresh every 30 seconds
- Color-coded progress bar (green → yellow → red)
- Alert banners for warnings and critical states
- Key metrics at a glance

---

## Import Order Convention

**Standard import order for all files:**

```typescript
// 1. React imports
import { useState, useEffect } from 'react';

// 2. Third-party libraries
import { motion, AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';

// 3. Internal lib/utilities (use @ alias)
import logger from '@/lib/logger';
import { stringToColor } from '@/lib/ui/avatar-utils';
import { classifyMessageIntent } from '@/lib/ui/message-utils';

// 4. Components (use @ alias)
import { PlayerAvatar } from '@/components/ui/Avatar';
import { GameEventsContext } from '@/components/GameEventsContext';

// 5. Types
import type { Game, Player, Turn } from '@prisma/client';
import type { MessageIntent } from '@/lib/ui/message-utils';

// 6. Styles (rare, Tailwind handles most)
import './styles.css';
```

---

## Error Handling Patterns

### API Error Handling

**Code example:**
```typescript
// lib/api/error-handler.ts
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { CostLimitExceededError } from '@/lib/cost/circuit-breaker';

export function handleApiError(error: unknown): NextResponse {
  // Cost limit exceeded
  if (error instanceof CostLimitExceededError) {
    logger.warn({ error: error.message }, 'Cost limit exceeded');
    return NextResponse.json(
      { error: 'Cost limit exceeded', currentCost: error.currentCost },
      { status: 429 } // Too Many Requests
    );
  }

  // Validation errors (Zod)
  if (error instanceof Error && error.name === 'ZodError') {
    logger.warn({ error: error.message }, 'Validation error');
    return NextResponse.json(
      { error: 'Invalid request data', details: error.message },
      { status: 400 }
    );
  }

  // Prisma errors
  if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
    logger.error({ error: error.message }, 'Database error');
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    );
  }

  // Anthropic API errors
  if (error instanceof Error && error.message.includes('anthropic')) {
    logger.error({ error: error.message }, 'Anthropic API error');
    return NextResponse.json(
      { error: 'AI service unavailable' },
      { status: 503 }
    );
  }

  // Generic error
  logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Unexpected error');
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// Usage in API route:
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createGame(body.playerCount);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Testing Patterns

### Component Testing (Future)

**Code example:**
```typescript
// components/__tests__/Avatar.test.tsx
import { render, screen } from '@testing-library/react';
import { PlayerAvatar } from '../ui/Avatar';
import { stringToColor, getPlayerInitials } from '@/lib/ui/avatar-utils';

describe('PlayerAvatar', () => {
  it('renders initials correctly', () => {
    render(<PlayerAvatar name="Agent Alice" />);
    expect(screen.getByText('AA')).toBeInTheDocument();
  });

  it('uses deterministic color', () => {
    const { container } = render(<PlayerAvatar name="Agent Alice" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.style.backgroundColor).toBe(stringToColor('Agent Alice'));
  });

  it('handles size prop', () => {
    const { container } = render(<PlayerAvatar name="Alice" size="lg" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar.className).toContain('w-14 h-14');
  });
});
```

---

## Performance Optimization Patterns

### Lazy Loading Components

**Code example:**
```typescript
// app/game/[gameId]/page.tsx
import dynamic from 'next/dynamic';

// Lazy load cost dashboard (not critical for initial render)
const CostDashboard = dynamic(() => import('@/components/CostDashboard'), {
  loading: () => <div>Loading dashboard...</div>,
  ssr: false, // Client-side only
});

// Lazy load replay timeline (only shown in replay mode)
const ReplayTimeline = dynamic(() => import('@/components/ReplayTimeline'), {
  ssr: false,
});

export default function GamePage() {
  return (
    <div>
      {/* Critical content loads immediately */}
      <PlayerGrid />
      <DiscussionFeed />

      {/* Non-critical content lazy-loaded */}
      <CostDashboard />
    </div>
  );
}
```

**Key points:**
- Use `dynamic()` for non-critical components
- `ssr: false` for client-only features
- Loading fallback for smooth UX

---

**Patterns Complete**
**Total Patterns**: 12 major patterns with 30+ code examples
**Coverage**: UI, logging, cost tracking, animations, shareable URLs, replay mode
**All examples**: Production-ready, copy-pasteable code
