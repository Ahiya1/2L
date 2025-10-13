# Code Patterns & Conventions - Iteration 6

**Iteration:** 6 (Global Iteration 6)
**Plan:** plan-2
**Focus:** Transparency Features

**CRITICAL:** This file contains copy-pasteable code patterns. All examples are working code from the existing codebase or proven patterns. Builders should copy and adapt these patterns.

---

## File Structure

```
ai-mafia/
├── app/
│   ├── app/
│   │   ├── api/
│   │   │   └── game/
│   │   │       └── [gameId]/
│   │   │           ├── messages/
│   │   │           │   └── route.ts          # Copy for night-messages
│   │   │           ├── night-messages/       # NEW
│   │   │           │   └── route.ts          # NEW API endpoint
│   │   │           ├── state/
│   │   │           │   └── route.ts          # Modify: Add role field
│   │   │           └── stream/
│   │   │               └── route.ts          # Modify: Add night_message listener
│   │   └── game/
│   │       └── [gameId]/
│   │           └── page.tsx                  # Modify: Add MafiaChatPanel
│   ├── components/
│   │   ├── PlayerGrid.tsx                    # Modify: Add role badges
│   │   ├── DiscussionFeed.tsx                # Reference for MafiaChatPanel
│   │   ├── MafiaChatPanel.tsx                # NEW component
│   │   ├── PhaseIndicator.tsx                # Modify: Enhanced styling
│   │   ├── PhaseTimeline.tsx                 # NEW component (optional)
│   │   ├── VoteTally.tsx                     # Reference (no changes)
│   │   └── ui/
│   │       ├── Badge.tsx                     # Existing (mafia, villager variants)
│   │       └── Card.tsx                      # Existing
│   ├── contexts/
│   │   └── GameEventsContext.tsx             # Reference (SSE hook)
│   └── lib/
│       ├── game/
│       │   ├── phase-config.ts               # Reference (phase metadata)
│       │   └── avatar-colors.ts              # Utility for consistent colors
│       └── utils/
│           └── message-classification.ts     # Utility for message types
├── src/
│   └── lib/
│       ├── events/
│       │   ├── emitter.ts                    # Reference (no changes)
│       │   └── types.ts                      # Modify: Add night_message type
│       └── game/
│           └── night-phase.ts                # Modify: Emit night_message events
└── prisma/
    └── schema.prisma                         # Reference (no changes)
```

---

## Naming Conventions

- **Components:** PascalCase (`MafiaChatPanel.tsx`)
- **Files:** camelCase (`avatar-colors.ts`)
- **Types:** PascalCase (`NightMessagePayload`, `GameEventType`)
- **Functions:** camelCase (`emitGameEvent()`, `getAvatarColor()`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_NIGHT_TURNS`)
- **CSS Classes:** kebab-case or Tailwind utilities
- **API Routes:** kebab-case (`night-messages/`)

---

## Backend Patterns

### Pattern 1: Create Night Messages API Endpoint

**When to use:** Fetch historical night messages for a game

**File:** `/app/app/api/game/[gameId]/night-messages/route.ts` (NEW)

**Code:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;
    const { searchParams } = new URL(req.url);

    // Validate game exists
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Parse optional round filter
    const roundParam = searchParams.get('round');
    const where: { gameId: string; roundNumber?: number } = { gameId };

    if (roundParam) {
      const round = parseInt(roundParam, 10);
      if (!isNaN(round)) {
        where.roundNumber = round;
      }
    }

    // Fetch night messages with player join
    const messages = await prisma.nightMessage.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { roundNumber: 'asc' },
        { timestamp: 'asc' },
      ],
    });

    // Format response
    return NextResponse.json({
      messages: messages.map((msg) => ({
        id: msg.id,
        playerId: msg.playerId,
        playerName: msg.player.name,
        message: msg.message,
        timestamp: msg.timestamp.toISOString(),
        roundNumber: msg.roundNumber,
        turn: msg.turn,
        inReplyToId: msg.inReplyToId,
      })),
      total: messages.length,
      hasMore: false,
    });
  } catch (error) {
    console.error('Error fetching night messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch night messages' },
      { status: 500 }
    );
  }
}
```

**Key Points:**
- Copy from `/app/app/api/game/[gameId]/messages/route.ts`
- Replace `discussionMessage` with `nightMessage`
- Keep same response structure (consistency)
- Support round filtering via query param

---

### Pattern 2: Expose Player Roles in State API

**When to use:** Include role field in game state response

**File:** `/app/app/api/game/[gameId]/state/route.ts` (MODIFY)

**Code:**
```typescript
// Find this section (around line 58):
players: game.players.map((player) => ({
  id: player.id,
  name: player.name,
  personality: player.personality,
  isAlive: player.isAlive,
  position: player.position,
  eliminatedInRound: player.eliminatedInRound,
  eliminationType: player.eliminationType,
  // Role intentionally NOT included (hidden until game over) ← REMOVE THIS COMMENT
})),

// Change to:
players: game.players.map((player) => ({
  id: player.id,
  name: player.name,
  role: player.role, // ADD THIS: "MAFIA" | "VILLAGER"
  personality: player.personality,
  isAlive: player.isAlive,
  position: player.position,
  eliminatedInRound: player.eliminatedInRound,
  eliminationType: player.eliminationType,
})),
```

**Key Points:**
- Single field addition
- No database query changes
- Update TypeScript types (see Pattern 7)

---

### Pattern 3: Add night_message Event Type

**When to use:** Define new SSE event type for night messages

**File:** `/src/lib/events/types.ts` (MODIFY)

**Code:**
```typescript
// Add to GameEventType union (around line 7):
export type GameEventType =
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete'
  | 'night_message'; // ADD THIS

// Add to GameEvent discriminated union (around line 66):
export type GameEvent =
  | {
      gameId: string;
      type: 'NEW_MESSAGE';
      payload: {
        id: string;
        playerId: string;
        playerName: string;
        message: string;
        timestamp: string;
        roundNumber: number;
        turn: number;
      };
    }
  // ... other event types ...
  | {
      gameId: string;
      type: 'NIGHT_MESSAGE'; // ADD THIS
      payload: {
        id: string;
        playerId: string;
        playerName: string;
        message: string;
        timestamp: string;
        roundNumber: number;
        turn: number;
      };
    };
```

**Key Points:**
- Payload structure matches NEW_MESSAGE (proven stable)
- TypeScript discriminated union for type safety

---

### Pattern 4: Emit night_message SSE Events

**When to use:** Send night messages to spectators in real-time

**File:** `/app/src/lib/game/night-phase.ts` (MODIFY)

**Location:** After `prisma.nightMessage.create()` (around line 269)

**Code:**
```typescript
// Existing code (around line 246):
const savedMessage = await prisma.nightMessage.create({
  data: {
    gameId,
    playerId,
    roundNumber,
    message: text,
    turn,
    timestamp: new Date(),
  },
});

// ADD THIS (replace line 269 comment):
// Emit night_message event to SSE for spectators (TRANSPARENCY MODE)
gameEventEmitter.emitGameEvent('night_message', {
  gameId,
  type: 'NIGHT_MESSAGE',
  payload: {
    id: savedMessage.id,
    playerId: player.id,
    playerName: player.name,
    message: text,
    timestamp: savedMessage.timestamp.toISOString(),
    roundNumber,
    turn,
  },
});

nightLogger.debug(
  { gameId, playerId, playerName: player.name, message: text },
  'Night message generated and emitted'
);
```

**Key Points:**
- Emit AFTER database save (consistency)
- Payload includes all frontend needs
- Matches NEW_MESSAGE emission pattern

---

### Pattern 5: Subscribe to night_message in SSE Endpoint

**When to use:** Stream night messages to connected clients

**File:** `/app/app/api/game/[gameId]/stream/route.ts` (MODIFY)

**Code:**
```typescript
// Add listener (around line 50):
gameEventEmitter.on('message', messageHandler);
gameEventEmitter.on('turn_start', messageHandler);
gameEventEmitter.on('turn_end', messageHandler);
gameEventEmitter.on('phase_change', messageHandler);
gameEventEmitter.on('phase_complete', messageHandler);
gameEventEmitter.on('discussion_complete', messageHandler);
gameEventEmitter.on('night_message', messageHandler); // ADD THIS

// Add cleanup (around line 70):
gameEventEmitter.off('message', messageHandler);
gameEventEmitter.off('turn_start', messageHandler);
gameEventEmitter.off('turn_end', messageHandler);
gameEventEmitter.off('phase_change', messageHandler);
gameEventEmitter.off('phase_complete', messageHandler);
gameEventEmitter.off('discussion_complete', messageHandler);
gameEventEmitter.off('night_message', messageHandler); // ADD THIS
```

**Key Points:**
- Add listener to existing SSE endpoint
- Add cleanup to prevent memory leaks
- No changes to event emitter core

---

## Frontend Patterns

### Pattern 6: Display Role Badges in PlayerGrid

**When to use:** Show player roles with color-coded badges

**File:** `/app/components/PlayerGrid.tsx` (MODIFY)

**Code:**
```typescript
import { Badge } from '@/components/ui/Badge';

// In PlayerGrid component (around line 154):
{players.map((player) => (
  <div
    key={player.id}
    className={cn(
      'rounded-lg border p-4 transition-all',
      // Role-based border colors
      player.role === 'MAFIA'
        ? 'border-red-300 bg-red-50'
        : 'border-blue-300 bg-blue-50',
      // Dead player styling
      !player.isAlive && 'opacity-50 grayscale'
    )}
  >
    <div className="flex items-center justify-between mb-2">
      {/* Avatar with deterministic color */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold',
          getAvatarColor(player.name)
        )}
      >
        {getAvatarInitial(player.name)}
      </div>

      {/* Status badge */}
      <Badge variant={player.isAlive ? 'alive' : 'dead'}>
        {player.isAlive ? 'Alive' : 'Eliminated'}
      </Badge>
    </div>

    {/* Player name */}
    <div className="font-semibold text-sm mb-1">{player.name}</div>

    {/* Role badge - ADD THIS */}
    <Badge variant={player.role === 'MAFIA' ? 'mafia' : 'villager'}>
      {player.role === 'MAFIA' ? 'Mafia' : 'Villager'}
    </Badge>

    {/* Position */}
    <div className="text-xs text-gray-500 mt-1">
      Position {player.position}
    </div>
  </div>
))}
```

**Key Points:**
- Use existing Badge component (mafia, villager variants)
- Role-based border colors (red for Mafia, blue for Villager)
- Dead players grayed out but role color visible

---

### Pattern 7: Create MafiaChatPanel Component

**When to use:** Display Mafia coordination during Night phase

**File:** `/app/components/MafiaChatPanel.tsx` (NEW)

**Code:**
```typescript
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useGameEvents } from '@/contexts/GameEventsContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getAvatarColor, getAvatarInitial } from '@/lib/game/avatar-colors';
import { formatDistanceToNow } from 'date-fns';

interface NightMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
  roundNumber: number;
  turn: number;
}

export function MafiaChatPanel({ gameId }: { gameId: string }) {
  const { events } = useGameEvents();
  const [nightMessages, setNightMessages] = useState<NightMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Extract current phase from events
  const currentPhase = useMemo(() => {
    const phaseEvents = events.filter((e) => e.type === 'phase_change');
    if (phaseEvents.length === 0) return null;
    const latest = phaseEvents[phaseEvents.length - 1];
    return (latest.payload as any).to;
  }, [events]);

  // Subscribe to night_message events
  useEffect(() => {
    const nightMessageEvents = events.filter((e) => e.type === 'night_message');
    const messages: NightMessage[] = nightMessageEvents.map((e) => {
      const payload = e.payload as any;
      return {
        id: payload.id,
        playerId: payload.playerId,
        playerName: payload.playerName,
        message: payload.message,
        timestamp: payload.timestamp,
        roundNumber: payload.roundNumber,
        turn: payload.turn,
      };
    });
    setNightMessages(messages);
  }, [events]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [nightMessages, autoScroll]);

  // Fetch historical night messages on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/game/${gameId}/night-messages`);
        if (res.ok) {
          const data = await res.json();
          const historicalMessages: NightMessage[] = data.messages || [];
          setNightMessages((prev) => {
            // Merge with real-time messages (deduplicate by id)
            const allMessages = [...historicalMessages, ...prev];
            const unique = Array.from(
              new Map(allMessages.map((m) => [m.id, m])).values()
            );
            return unique.sort(
              (a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        }
      } catch (error) {
        console.error('Failed to fetch night messages:', error);
      }
    }
    fetchHistory();
  }, [gameId]);

  // Show/hide based on phase
  const isNightPhase = currentPhase === 'NIGHT';

  if (!isNightPhase && nightMessages.length === 0) {
    return null; // Hide panel if no Night phase yet
  }

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            🌙 Mafia Chat
          </span>
          <Badge variant="mafia">Private</Badge>
        </div>
        {!isNightPhase && (
          <Badge variant="phase" className="text-xs">
            No Activity
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {nightMessages.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            {isNightPhase
              ? 'Waiting for Mafia coordination...'
              : 'No Mafia messages yet'}
          </div>
        ) : (
          nightMessages.map((msg) => (
            <div
              key={msg.id}
              className="flex gap-3 p-3 rounded-lg bg-red-50 border border-red-200"
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(
                  msg.playerName
                )}`}
              >
                {getAvatarInitial(msg.playerName)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-sm text-red-900">
                    {msg.playerName}
                  </span>
                  <span className="text-xs text-red-600">
                    {formatDistanceToNow(new Date(msg.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                  <span className="text-xs text-red-500">
                    Turn {msg.turn}
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {msg.message}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{nightMessages.length} message(s)</span>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            {autoScroll ? '🔒 Auto-scroll' : '🔓 Scroll unlocked'}
          </button>
        </div>
      </div>
    </Card>
  );
}
```

**Key Points:**
- Copy pattern from DiscussionFeed.tsx
- Subscribe to `night_message` events via `useGameEvents()`
- Fetch historical messages on mount
- Show/hide based on `currentPhase === 'NIGHT'`
- Auto-scroll to new messages
- Red styling theme (Mafia coordination)

---

### Pattern 8: Add MafiaChatPanel to Game Layout

**When to use:** Display Mafia chat panel in game page

**File:** `/app/app/game/[gameId]/page.tsx` (MODIFY)

**Code:**
```typescript
import { MafiaChatPanel } from '@/components/MafiaChatPanel';

// In game page component (around line 50):
export default function GamePage({ params }: { params: { gameId: string } }) {
  const { gameId } = params;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Phase Indicator */}
      <PhaseIndicator gameId={gameId} />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Left: Player Grid */}
        <div className="lg:col-span-1">
          <PlayerGrid gameId={gameId} />
        </div>

        {/* Center/Right: Discussion Feed & Mafia Chat */}
        <div className="lg:col-span-2">
          {/* Split screen during Night phase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Discussion Feed (always visible) */}
            <div className="md:col-span-1">
              <DiscussionFeed gameId={gameId} />
            </div>

            {/* Mafia Chat Panel (visible during Night phase) */}
            <div className="md:col-span-1">
              <MafiaChatPanel gameId={gameId} />
            </div>
          </div>

          {/* Vote Tally (conditionally shown during VOTING phase) */}
          <VoteTally gameId={gameId} />
        </div>
      </div>
    </div>
  );
}
```

**Key Points:**
- Split screen layout: `grid-cols-1 md:grid-cols-2`
- Stack vertically on mobile, side-by-side on desktop
- MafiaChatPanel handles show/hide logic internally
- VoteTally separate (already conditionally rendered)

---

### Pattern 9: SSE Event Subscription Hook

**When to use:** Subscribe to real-time game events

**File:** `/app/contexts/GameEventsContext.tsx` (REFERENCE)

**Usage:**
```typescript
'use client';

import { useGameEvents } from '@/contexts/GameEventsContext';

export function MyComponent({ gameId }: { gameId: string }) {
  const { events, connectionStatus } = useGameEvents();

  // Filter events by type
  const nightMessages = events.filter((e) => e.type === 'night_message');
  const phaseChanges = events.filter((e) => e.type === 'phase_change');

  // Extract current phase
  const currentPhase = useMemo(() => {
    if (phaseChanges.length === 0) return null;
    const latest = phaseChanges[phaseChanges.length - 1];
    return (latest.payload as any).to;
  }, [phaseChanges]);

  // Connection status indicator
  const isConnected = connectionStatus === 'connected';

  return (
    <div>
      <div>Status: {connectionStatus}</div>
      <div>Phase: {currentPhase}</div>
      <div>Night messages: {nightMessages.length}</div>
    </div>
  );
}
```

**Key Points:**
- `useGameEvents()` hook provides events array and connection status
- Filter events by `type` field
- Extract latest event for current state
- Reactive to new events (useEffect dependencies)

---

### Pattern 10: Enhanced Phase Visualization

**When to use:** Improve phase indicator styling

**File:** `/app/components/PhaseIndicator.tsx` (MODIFY)

**Code:**
```typescript
// Enhanced phase config (existing pattern)
import { phaseConfig } from '@/lib/game/phase-config';

// In PhaseIndicator component:
const config = phaseConfig[currentPhase];

return (
  <div className="bg-white rounded-lg shadow-md p-6 mb-4">
    {/* Phase Header with Icon */}
    <div className="flex items-center gap-3 mb-4">
      <span className="text-3xl">{config.icon}</span>
      <div className="flex-1">
        <h2 className="text-2xl font-bold" style={{ color: config.color }}>
          {config.label}
        </h2>
        <p className="text-sm text-gray-600">{config.description}</p>
      </div>
      <Badge variant="phase">
        Round {roundNumber} / 40
      </Badge>
    </div>

    {/* Timer with Progress Bar */}
    <div className="mb-2 flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">Time Remaining</span>
      <span className="text-lg font-bold" style={{ color: config.color }}>
        {formatTime(timeRemaining)}
      </span>
    </div>

    {/* Progress Bar */}
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className="h-full transition-all duration-1000"
        style={{
          width: `${(timeRemaining / phaseDuration) * 100}%`,
          backgroundColor: config.color,
        }}
      />
    </div>

    {/* Phase Timeline (Optional - NEW) */}
    <PhaseTimeline currentPhase={currentPhase} roundNumber={roundNumber} />
  </div>
);
```

**Key Points:**
- Use phase-config.ts for icons, colors, descriptions
- Progress bar with phase-specific color
- Timer synced with server (phaseStartTime from events)

---

## Utility Patterns

### Pattern 11: Deterministic Avatar Colors

**When to use:** Consistent player colors across components

**File:** `/app/lib/game/avatar-colors.ts` (REFERENCE)

**Usage:**
```typescript
import { getAvatarColor, getAvatarInitial } from '@/lib/game/avatar-colors';

// Get consistent background color class
const bgColor = getAvatarColor('Agent-1'); // "bg-blue-500"

// Get initial letter
const initial = getAvatarInitial('Agent-1'); // "A"

// Example in component:
<div className={`w-10 h-10 rounded-full ${bgColor}`}>
  {initial}
</div>
```

**Key Points:**
- Deterministic (same name always same color)
- Used in PlayerGrid, DiscussionFeed, MafiaChatPanel

---

### Pattern 12: Relative Timestamps

**When to use:** Display human-readable time differences

**Library:** `date-fns`

**Usage:**
```typescript
import { formatDistanceToNow } from 'date-fns';

// Format timestamp
const relativeTime = formatDistanceToNow(new Date(message.timestamp), {
  addSuffix: true,
});

// Output: "2 minutes ago"
```

---

## Testing Patterns

### Pattern 13: Manual API Testing with curl

**When to use:** Verify API endpoints before frontend integration

**Night Messages Endpoint:**
```bash
# Fetch all night messages for a game
curl http://localhost:3001/api/game/abc123/night-messages

# Fetch night messages for specific round
curl http://localhost:3001/api/game/abc123/night-messages?round=1
```

**State Endpoint (with roles):**
```bash
# Fetch game state (should include role field)
curl http://localhost:3001/api/game/abc123/state | jq '.players[0].role'
```

**SSE Endpoint:**
```bash
# Watch SSE events (including night_message)
curl -N http://localhost:3001/api/game/abc123/stream
```

---

### Pattern 14: Playwright Browser Validation

**When to use:** Validate transparency features in real browser

**File:** `.2L/plan-2/iteration-6/validation/validation-script.md` (validator creates)

**Example Code:**
```typescript
import { chromium } from 'playwright';

async function validateTransparencyFeatures() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to lobby
  await page.goto('http://localhost:3001/');

  // Create game
  await page.click('button:has-text("Start Game")');
  await page.waitForURL(/\/game\/[a-z0-9]+/);

  // Wait for player grid to load
  await page.waitForSelector('[data-testid="player-grid"]');

  // Validate role badges exist
  const mafiaCount = await page.locator('[data-badge="mafia"]').count();
  const villagerCount = await page.locator('[data-badge="villager"]').count();

  console.log(`✓ Role badges: ${mafiaCount} Mafia, ${villagerCount} Villagers`);

  // Take screenshot
  await page.screenshot({
    path: '.2L/plan-2/iteration-6/validation/screenshots/roles.png',
    fullPage: true,
  });

  // Wait for Night phase (45 seconds)
  await page.waitForSelector('[data-phase="NIGHT"]', { timeout: 60000 });
  console.log('✓ Night phase started');

  // Wait for Mafia chat panel
  await page.waitForSelector('[data-testid="mafia-chat-panel"]', { timeout: 10000 });
  console.log('✓ Mafia chat panel visible');

  // Wait for first night message
  const firstMessage = await page.waitForSelector(
    '[data-message-type="night_message"]',
    { timeout: 30000 }
  );
  console.log('✓ Night message received');

  // Take screenshot of Mafia chat
  await page.screenshot({
    path: '.2L/plan-2/iteration-6/validation/screenshots/mafia-chat.png',
    fullPage: true,
  });

  // Verify no console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Validate SSE connection
  const connectionStatus = await page.locator('[data-connection-status]').getAttribute('data-connection-status');
  console.log(`✓ SSE connection: ${connectionStatus}`);

  await browser.close();

  // PASS/FAIL determination
  const passed =
    mafiaCount > 0 &&
    villagerCount > 0 &&
    connectionStatus === 'connected' &&
    consoleErrors.length === 0;

  return {
    passed,
    screenshots: ['roles.png', 'mafia-chat.png'],
    errors: consoleErrors,
  };
}
```

**Key Points:**
- Use Playwright MCP to launch browser
- Wait for elements with `waitForSelector`
- Capture screenshots as evidence
- Check connection status
- Monitor console for errors
- Determine PASS/FAIL based on observations

---

## Import Order Convention

```typescript
// 1. External packages (React, Next.js)
import { useEffect, useState, useMemo } from 'react';
import { NextRequest, NextResponse } from 'next/server';

// 2. Internal utilities (lib)
import prisma from '@/lib/prisma';
import { getAvatarColor, getAvatarInitial } from '@/lib/game/avatar-colors';

// 3. Contexts/hooks
import { useGameEvents } from '@/contexts/GameEventsContext';

// 4. Components
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// 5. Types
import type { GameEvent, NightMessagePayload } from '@/lib/events/types';

// 6. Third-party utilities
import { formatDistanceToNow } from 'date-fns';
```

---

## Code Quality Standards

### TypeScript Strict Mode
- All files must pass `npm run type-check`
- No `any` types without comment explaining why
- Use discriminated unions for event types

### Error Handling
```typescript
try {
  const data = await fetchData();
  return data;
} catch (error) {
  console.error('Error fetching data:', error);
  return null; // or throw
}
```

### Responsive Design
```typescript
// Mobile-first, then larger screens
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Accessibility
- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Include ARIA labels where needed
- Test keyboard navigation (tab, enter)

---

## Performance Patterns

### Memoization
```typescript
const currentPhase = useMemo(() => {
  const phaseEvents = events.filter((e) => e.type === 'phase_change');
  return phaseEvents[phaseEvents.length - 1]?.payload.to || null;
}, [events]);
```

### Conditional Rendering
```typescript
// Hide component when not needed (save React rendering)
if (!isNightPhase && nightMessages.length === 0) {
  return null;
}
```

### Debouncing
```typescript
// For auto-scroll (avoid excessive DOM operations)
useEffect(() => {
  const timer = setTimeout(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
  return () => clearTimeout(timer);
}, [nightMessages, autoScroll]);
```

---

## Security Patterns

### API Input Validation
```typescript
// Validate game ID format
if (!gameId || typeof gameId !== 'string') {
  return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
}

// Validate game exists
const game = await prisma.game.findUnique({ where: { id: gameId } });
if (!game) {
  return NextResponse.json({ error: 'Game not found' }, { status: 404 });
}
```

### SQL Injection Prevention
```typescript
// Prisma handles parameterization automatically
await prisma.nightMessage.findMany({
  where: { gameId }, // Safe - parameterized query
});
```

### XSS Prevention
```typescript
// React auto-escapes text content
<p>{message.message}</p> // Safe - React escapes HTML

// For HTML content, use dangerouslySetInnerHTML (avoid unless necessary)
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
```

---

## Debugging Patterns

### Console Logging
```typescript
// Backend logging
console.log('[NightPhase] Emitting night_message event:', {
  gameId,
  playerId,
  message: text,
});

// Frontend logging
console.debug('[MafiaChatPanel] Received night message:', msg);
```

### DevTools Network Tab
- Check SSE connection: Filter by "stream"
- Verify events received: Look for `data:` lines
- Check API responses: Status codes, payload structure

### React DevTools
- Inspect component props
- Check context values (GameEventsContext)
- Monitor re-renders (Profiler)

---

## Summary

**All patterns are copy-pasteable working code.**

**Key takeaways for builders:**
1. Reuse existing patterns (DiscussionFeed → MafiaChatPanel)
2. Follow event emission structure (NEW_MESSAGE → NIGHT_MESSAGE)
3. Use TypeScript for type safety
4. Test APIs with curl before frontend integration
5. Validate with Playwright MCP (mandatory for this iteration)

**Integration checklist:**
- [ ] Backend emits night_message events
- [ ] Frontend subscribes to night_message events
- [ ] API endpoints return correct structure
- [ ] TypeScript types updated
- [ ] Backend tests still pass (47 tests)
- [ ] Playwright validation screenshots captured
- [ ] No console errors in browser

---

**Patterns Status:** COMPLETE
**Ready for:** Builder Implementation
**Validation:** Playwright MCP Required
