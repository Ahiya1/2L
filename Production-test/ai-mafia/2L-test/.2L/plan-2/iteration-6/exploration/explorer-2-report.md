# Explorer 2 Report: Backend Events & API Endpoints

## Executive Summary

The backend infrastructure for transparency features is **90% complete**. The NightMessage data model exists, night messages are being saved to the database, and SSE infrastructure is stable (fixed in Iteration 1). **What's missing:** (1) API endpoint to fetch night messages (`/api/game/[gameId]/night-messages`), (2) SSE event emission for real-time night message updates (`night_message` event type), and (3) exposing player roles in game state API. All changes are **LOW-RISK** modifications to existing working systems, with zero impact on Iteration 1's SSE stability.

**Critical findings:**
- NightMessage table exists with all required fields (speaker, content, timestamp, gameId, round)
- Night messages currently saved but NOT emitted via SSE (line 269: "DO NOT emit night_message event")
- SSE endpoint ready to handle new event types (just add listener in `stream/route.ts`)
- Player roles hidden in `/api/game/[gameId]/state` (line 66 comment: "Role intentionally NOT included")
- Zero database schema changes needed
- Backend complexity: **MEDIUM** (3-4 hours of work)

---

## Discoveries

### 1. NightMessage Data Model Analysis

**Status:** COMPLETE - No changes needed

**Prisma Schema Location:** `/app/prisma/schema.prisma` (lines 82-99)

**Schema Definition:**
```prisma
model NightMessage {
  id          String   @id @default(cuid())
  gameId      String
  roundNumber Int
  playerId    String
  message     String
  inReplyToId String?
  timestamp   DateTime @default(now())
  turn        Int      // Turn number within this Night phase

  game      Game           @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player    Player         @relation("NightMessageAuthor", fields: [playerId], references: [id], onDelete: Cascade)
  inReplyTo NightMessage?  @relation("NightReplyThread", fields: [inReplyToId], references: [id], onDelete: SetNull)
  replies   NightMessage[] @relation("NightReplyThread")

  @@index([gameId, roundNumber, timestamp])
  @@index([gameId, playerId])
}
```

**Available Fields (Perfect for transparency):**
- `id` - Unique message identifier
- `gameId` - Game context
- `roundNumber` - Which round (Night 1, Night 2, etc.)
- `playerId` - Mafia agent who sent message
- `message` - Actual text content of coordination
- `timestamp` - When message was generated
- `turn` - Sequence within Night phase (1, 2, 3...)
- `inReplyToId` - Thread support (not critical for MVP)

**Indexes:** Optimized for querying by `(gameId, roundNumber, timestamp)` - perfect for fetching messages by round.

**Comparison with DiscussionMessage:**
```
DiscussionMessage (lines 61-80):     NightMessage (lines 82-99):
- gameId ✓                           - gameId ✓
- roundNumber ✓                      - roundNumber ✓
- playerId ✓                         - playerId ✓
- message ✓                          - message ✓
- timestamp ✓                        - timestamp ✓
- turn ✓                             - turn ✓
- inReplyToId ✓                      - inReplyToId ✓
```

**Data is identical structure** - can use same UI component for both message types!

### 2. Night Message Persistence Logic

**File:** `/app/src/lib/game/night-phase.ts` (417 lines)

**How Night Messages Are Saved (lines 246-256):**

```typescript
// Save to NightMessage table (private, never visible to Villagers)
await prisma.nightMessage.create({
  data: {
    gameId,
    playerId,
    roundNumber,
    message: text,
    turn,
    timestamp: new Date(),
  },
});
```

**Execution Flow:**
1. `runNightPhase()` (line 47) - Main orchestrator
2. Fetches Mafia agents: `role: 'MAFIA', isAlive: true` (line 70)
3. Loops through turns with turn scheduler (line 102)
4. Calls `executeNightTurn()` for each Mafia agent (line 129)
5. Generates response via Claude API with night prompt (line 241)
6. **Saves to database** via `prisma.nightMessage.create()` (line 247)
7. **Does NOT emit SSE event** (line 269 comment confirms)

**Critical Discovery - Line 269:**
```typescript
// DO NOT emit night_message event to SSE (keep private from spectators)
nightLogger.debug({ gameId, playerId, playerName: player.name, message: text }, 'Night message generated');
```

**Why this comment exists:**
- Original design kept night messages PRIVATE from spectators
- Plan 1 was human-playable Mafia (no transparency)
- Plan 2 introduces TRANSPARENCY (all AI, no humans to deceive)
- **Solution:** Remove this restriction, emit events for spectators

### 3. Existing API Endpoints Analysis

#### `/api/game/[gameId]/messages` - Discussion Messages

**File:** `/app/app/api/game/[gameId]/messages/route.ts` (92 lines)

**Pattern to replicate:**
```typescript
// 1. Validate game exists
const game = await prisma.game.findUnique({ where: { id: gameId } });
if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

// 2. Parse query params (optional round filter)
const roundParam = searchParams.get('round');
const where: { gameId: string; roundNumber?: number } = { gameId };
if (roundParam) {
  const round = parseInt(roundParam, 10);
  where.roundNumber = round;
}

// 3. Fetch messages with player join
const messages = await prisma.discussionMessage.findMany({
  where,
  include: {
    player: {
      select: { id: true, name: true },
    },
  },
  orderBy: [{ roundNumber: 'asc' }, { timestamp: 'asc' }],
});

// 4. Map to response format
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
```

**Key observations:**
- Line 6: "Excludes NightMessages (privacy guarantee)" - confirms intentional omission
- Query supports round filtering (`?round=1`)
- Includes player name via join
- Orders by roundNumber, then timestamp
- Simple response format (no pagination complexity)

**Adaptation for night-messages endpoint:**
- Replace `discussionMessage` with `nightMessage`
- Keep same query pattern
- Identical response structure
- **10-15 minute implementation time**

#### `/api/game/[gameId]/state` - Game State

**File:** `/app/app/api/game/[gameId]/state/route.ts` (80 lines)

**Current Response (lines 48-69):**
```typescript
const response: GameStateResponse = {
  game: {
    id: game.id,
    status: game.status,
    currentPhase: game.currentPhase,
    phaseStartTime: game.phaseStartTime?.toISOString() || null,
    roundNumber: game.roundNumber,
    winner: game.winner,
    playerCount: game.playerCount,
  },
  players: game.players.map((player) => ({
    id: player.id,
    name: player.name,
    personality: player.personality,
    isAlive: player.isAlive,
    position: player.position,
    eliminatedInRound: player.eliminatedInRound,
    eliminationType: player.eliminationType,
    // Role intentionally NOT included (hidden until game over)
  })),
  phaseEndTime,
};
```

**Line 66 comment confirms:** "Role intentionally NOT included (hidden until game over)"

**For transparency mode, need to expose:**
```typescript
players: game.players.map((player) => ({
  // ... existing fields ...
  role: player.role, // ADD THIS - "MAFIA" or "VILLAGER"
})),
```

**Player schema has role field (schema.prisma line 41):**
```prisma
role              String // "MAFIA", "VILLAGER"
```

**Risk assessment:**
- LOW RISK - Single field addition
- No database query changes
- TypeScript will require updating `GameStateResponse` type
- Frontend already expects this (transparency requirement)

### 4. SSE Event System Analysis

#### SSE Endpoint Architecture

**File:** `/app/app/api/game/[gameId]/stream/route.ts` (91 lines)

**How SSE works:**
1. Client connects: `GET /api/game/[gameId]/stream`
2. Server creates ReadableStream (line 25)
3. Sends CONNECTED confirmation (line 28)
4. Subscribes to event emitter channels (lines 45-50)
5. Forwards events to client as Server-Sent Events (line 37)
6. Keepalive heartbeat every 15 seconds (line 54)
7. Cleanup on disconnect (line 64)

**Currently subscribed event types (lines 45-50):**
```typescript
gameEventEmitter.on('message', messageHandler);
gameEventEmitter.on('turn_start', messageHandler);
gameEventEmitter.on('turn_end', messageHandler);
gameEventEmitter.on('phase_change', messageHandler);
gameEventEmitter.on('phase_complete', messageHandler);
gameEventEmitter.on('discussion_complete', messageHandler);
```

**What's missing for night messages:**
```typescript
gameEventEmitter.on('night_message', messageHandler); // ADD THIS
```

**Cleanup also needs update (lines 66-71):**
```typescript
gameEventEmitter.off('night_message', messageHandler); // ADD THIS
```

**Risk assessment:**
- LOW RISK - Pattern is already proven stable (Iteration 1)
- Zero changes to event emitter core logic
- Just adding one more listener
- **5-minute change**

#### Event Emitter Core

**File:** `/src/lib/events/emitter.ts` (74 lines)

**GameEventEmitter class:**
- Extends Node.js EventEmitter
- Singleton instance: `gameEventEmitter`
- Max 50 listeners (line 20) - supports multiple SSE connections
- Generic `emitGameEvent(eventType, data)` method (line 28)

**How events are emitted:**
```typescript
gameEventEmitter.emitGameEvent('message', {
  gameId,
  type: 'NEW_MESSAGE',
  payload: discussionMessage,
});
```

**No changes needed to emitter.ts** - it already handles any event type.

#### Event Types Definition

**File:** `/src/lib/events/types.ts` (67 lines)

**Current GameEventType union (lines 7-13):**
```typescript
export type GameEventType =
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete';
```

**GameEvent discriminated union (lines 15-66):**
- `NEW_MESSAGE` - Discussion messages (line 18)
- `TURN_START` - Turn indicators (line 23)
- `TURN_END` - Turn completion (line 32)
- `PHASE_CHANGE` - Phase transitions (line 43)
- `PHASE_COMPLETE` - Phase done (line 50)
- `DISCUSSION_COMPLETE` - Discussion stats (line 59)

**Need to add for night messages:**
```typescript
export type GameEventType =
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete'
  | 'night_message'; // ADD THIS

// And in GameEvent union:
| {
    gameId: string;
    type: 'NIGHT_MESSAGE';
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
```

**Pattern matches existing NEW_MESSAGE event** - proven stable.

### 5. Night Phase Event Emission Points

**File:** `/app/src/lib/game/night-phase.ts` (417 lines)

**Current events emitted:**

**Event 1: night_start (lines 86-94)**
```typescript
gameEventEmitter.emitGameEvent('night_start', {
  gameId,
  type: 'night_start',
  payload: {
    round: roundNumber,
    mafiaCount: mafiaPlayers.length,
  },
});
```

**Event 2: night_complete (lines 170-180)**
```typescript
gameEventEmitter.emitGameEvent('night_complete', {
  gameId,
  type: 'night_complete',
  payload: {
    round: roundNumber,
    totalMessages: turnCount,
    victim: victim?.id || null,
    consensusReached,
  },
});
```

**Missing: night_message event (should be at line 269)**

**Where to add night_message emission:**

In `executeNightTurn()` function, after saving to database (line 256), before line 269:

```typescript
// Save to NightMessage table
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
```

**Risk assessment:**
- LOW RISK - Pattern matches discussion message emission
- Event emitted AFTER database save (consistency guaranteed)
- No changes to night phase logic
- No changes to consensus algorithm
- **10-minute implementation**

### 6. Master Orchestrator Event Emission

**File:** `/app/src/lib/game/master-orchestrator.ts` (477 lines)

**Phase transition events (lines 226-236):**
```typescript
gameEventEmitter.emitGameEvent('phase_change', {
  gameId,
  type: 'phase_change',
  payload: {
    from: previousPhase,
    to: currentPhase,
    round: roundNumber,
    phaseStartTime: phaseStartTime.toISOString(),
    phaseEndTime: phaseEndTime ? phaseEndTime.toISOString() : null,
  },
});
```

**Includes phaseStartTime and phaseEndTime** - This is critical for timer sync (Iteration 1 requirement).

**Other events emitted:**
- `round_start` (line 64) - Round begins with alive counts
- `player_eliminated` (line 327) - Player dies (nightkill or daykill)
- `game_over` (line 421) - Winner announced

**No changes needed to master orchestrator** - Night phase already integrated.

---

## Patterns Identified

### Pattern 1: API Endpoint for Fetching Historical Data

**Description:** REST GET endpoint that fetches messages from database with optional round filtering

**Use Case:** Frontend needs to load night messages when component mounts or when switching rounds

**Example (Discussion Messages):**
```typescript
// Client request:
GET /api/game/abc123/messages?round=1

// Server response:
{
  messages: [
    {
      id: "msg1",
      playerId: "p1",
      playerName: "Agent-1",
      message: "I trust Agent-3",
      timestamp: "2025-10-13T14:30:00Z",
      roundNumber: 1,
      turn: 1
    }
  ],
  total: 40,
  hasMore: false
}
```

**Adaptation for night messages:**
```typescript
// New endpoint:
GET /api/game/abc123/night-messages?round=1

// Response (identical structure):
{
  messages: [
    {
      id: "night1",
      playerId: "mafia1",
      playerName: "Agent-2",
      message: "Let's eliminate Agent-5",
      timestamp: "2025-10-13T14:25:00Z",
      roundNumber: 1,
      turn: 1
    }
  ],
  total: 6,
  hasMore: false
}
```

**Recommendation:** Use this pattern for night messages API

**Implementation File:**
- Create: `/app/app/api/game/[gameId]/night-messages/route.ts`
- Copy from: `/app/app/api/game/[gameId]/messages/route.ts`
- Replace: `discussionMessage` with `nightMessage`
- Time: 10-15 minutes

### Pattern 2: SSE Real-Time Event Emission

**Description:** Emit events immediately after database writes for instant frontend updates

**Use Case:** Spectator sees night message appear in real-time as Mafia coordinates

**Example (Discussion Messages):**
```typescript
// In turn-executor.ts (discussion):
const savedMessage = await prisma.discussionMessage.create({...});

gameEventEmitter.emitGameEvent('message', {
  gameId,
  type: 'NEW_MESSAGE',
  payload: {
    id: savedMessage.id,
    playerId: player.id,
    playerName: player.name,
    message: savedMessage.message,
    timestamp: savedMessage.timestamp.toISOString(),
  },
});
```

**Adaptation for night messages:**
```typescript
// In night-phase.ts (line 256):
const savedMessage = await prisma.nightMessage.create({...});

gameEventEmitter.emitGameEvent('night_message', {
  gameId,
  type: 'NIGHT_MESSAGE',
  payload: {
    id: savedMessage.id,
    playerId: player.id,
    playerName: player.name,
    message: savedMessage.message,
    timestamp: savedMessage.timestamp.toISOString(),
    roundNumber,
    turn,
  },
});
```

**Recommendation:** Emit night_message event immediately after database save

**Implementation:**
- Modify: `/app/src/lib/game/night-phase.ts` (line 269)
- Add: Event emission code after `prisma.nightMessage.create()`
- Update: `/src/lib/events/types.ts` to include `night_message` event type
- Update: `/app/app/api/game/[gameId]/stream/route.ts` to subscribe to `night_message`
- Time: 15-20 minutes

### Pattern 3: Role Exposure in Game State API

**Description:** Include player role field in game state response for transparency mode

**Use Case:** Frontend displays role badges (red "Mafia", blue "Villager") from game start

**Current Pattern (Hidden Roles):**
```typescript
// /api/game/[gameId]/state (line 58):
players: game.players.map((player) => ({
  id: player.id,
  name: player.name,
  personality: player.personality,
  isAlive: player.isAlive,
  // Role intentionally NOT included
}))
```

**Transparency Pattern (Exposed Roles):**
```typescript
// /api/game/[gameId]/state (MODIFIED):
players: game.players.map((player) => ({
  id: player.id,
  name: player.name,
  role: player.role, // ADD THIS: "MAFIA" | "VILLAGER"
  personality: player.personality,
  isAlive: player.isAlive,
}))
```

**Recommendation:** Add role field to game state response

**Implementation:**
- Modify: `/app/app/api/game/[gameId]/state/route.ts` (line 58)
- Update: TypeScript types in `/src/lib/api/validation.ts` (GameStateResponse)
- Time: 5 minutes

---

## Complexity Assessment

### High Complexity Areas

**None** - All changes are additive modifications to proven stable systems.

### Medium Complexity Areas

#### 1. Night Messages API Endpoint (2-3 hours)
- **Why:** New file creation, need to replicate pattern correctly
- **Tasks:**
  - Create `/app/app/api/game/[gameId]/night-messages/route.ts`
  - Copy pattern from `/messages/route.ts`
  - Replace `discussionMessage` with `nightMessage`
  - Test with curl/Postman
  - Verify round filtering works
- **Risk:** LOW (pattern is proven)
- **Dependencies:** None

#### 2. SSE Event Emission for Night Messages (1-2 hours)
- **Why:** Multiple file modifications, event type additions
- **Tasks:**
  - Update `/src/lib/events/types.ts` (add `night_message` to union)
  - Update `/app/app/api/game/[gameId]/stream/route.ts` (add listener)
  - Modify `/app/src/lib/game/night-phase.ts` (emit event at line 269)
  - Test SSE connection receives events
  - Verify event payload structure
- **Risk:** LOW (pattern matches existing events)
- **Dependencies:** None

#### 3. Role Exposure in Game State API (30 minutes)
- **Why:** Simple field addition, type updates
- **Tasks:**
  - Modify `/app/app/api/game/[gameId]/state/route.ts` (add role field)
  - Update TypeScript types (GameStateResponse)
  - Test API response includes role
  - Verify frontend receives role data
- **Risk:** VERY LOW (single field)
- **Dependencies:** None

### Low Complexity Areas

#### Type Definitions Updates (15 minutes)
- Add `night_message` to `GameEventType` union
- Add `NIGHT_MESSAGE` to `GameEvent` discriminated union
- Update `GameStateResponse` to include role field

---

## Integration Points

### External APIs

**None** - All changes are internal to the application.

### Internal Integrations

#### 1. Night Phase Orchestrator ↔ SSE Endpoint
- **Connection:** Night phase emits `night_message` events → SSE streams to clients
- **Data flow:** 
  1. `executeNightTurn()` saves message to DB
  2. Emits event via `gameEventEmitter.emitGameEvent('night_message', payload)`
  3. SSE listener receives event
  4. SSE forwards to client via ReadableStream
- **Complexity:** LOW (proven pattern)
- **Testing:** Watch browser DevTools Network tab for SSE events

#### 2. Game State API ↔ Frontend Role Display
- **Connection:** API returns role field → Frontend displays badges
- **Data flow:**
  1. Frontend calls `/api/game/[gameId]/state`
  2. API includes `role: "MAFIA" | "VILLAGER"` in player objects
  3. Frontend maps role to badge color (red/blue)
- **Complexity:** LOW (single field addition)
- **Testing:** Check API response JSON, verify frontend renders badges

#### 3. Night Messages API ↔ Frontend Chat Panel
- **Connection:** API provides historical messages → Frontend displays in chat UI
- **Data flow:**
  1. Frontend calls `/api/game/[gameId]/night-messages?round=1`
  2. API fetches from NightMessage table
  3. Frontend renders messages in MafiaChatPanel component
- **Complexity:** LOW (copy-paste pattern from discussion messages)
- **Testing:** curl API endpoint, verify JSON response

---

## Risks & Challenges

### Technical Risks

#### Risk 1: Breaking Iteration 1 SSE Stability
- **Impact:** HIGH (would break core real-time functionality)
- **Likelihood:** LOW (5%)
- **Mitigation:**
  - Use proven event emission pattern from discussion messages
  - Add event listener without modifying existing listeners
  - Test SSE connection manually before E2E tests
  - Keep keepalive heartbeat unchanged
  - Preserve event emitter max listeners (50)
- **Fallback:** If SSE breaks, revert changes, emit events only to logs

#### Risk 2: Night Message Event Payload Mismatch
- **Impact:** MEDIUM (frontend won't receive data correctly)
- **Likelihood:** LOW (10%)
- **Mitigation:**
  - Match payload structure to NEW_MESSAGE event (proven format)
  - Include all fields frontend needs (id, playerId, playerName, message, timestamp, roundNumber, turn)
  - Add TypeScript types to catch mismatches at compile time
  - Test with browser DevTools to inspect SSE event data
- **Fallback:** Frontend uses polling fallback (fetch /night-messages every 5 seconds)

#### Risk 3: Database Query Performance
- **Impact:** LOW (slow API response)
- **Likelihood:** VERY LOW (5%)
- **Mitigation:**
  - NightMessage table already has indexes on `[gameId, roundNumber, timestamp]`
  - Night phase generates 6-9 messages max (3 Mafia × 3 turns)
  - Far fewer messages than discussion (40+)
  - Query pattern proven with discussion messages
- **Fallback:** Add pagination if needed (hasMore: true)

### Complexity Risks

#### Risk 1: Frontend Integration Complexity
- **Impact:** HIGH (backend ready but frontend can't consume)
- **Likelihood:** MEDIUM (30%)
- **Mitigation:**
  - Provide clear API documentation for frontend builder
  - Match response format to existing discussion messages
  - Use proven SSE event structure
  - Create example curl commands for testing
- **Fallback:** Builder splits work - Backend first, then Frontend integration

#### Risk 2: Event Type Conflicts
- **Impact:** MEDIUM (TypeScript errors, runtime issues)
- **Likelihood:** LOW (10%)
- **Mitigation:**
  - Use descriptive event names (`night_message` not `message`)
  - Update all type definitions in single commit
  - Run `npm run type-check` before committing
  - Test SSE endpoint manually
- **Fallback:** Rename event type if conflicts arise

---

## Recommendations for Planner

### 1. Backend work is LOW-MEDIUM complexity (3-4 hours total)

**Breakdown:**
- Night messages API endpoint: 2-3 hours (new file, copy pattern, test)
- SSE event emission: 1-2 hours (3 file updates, manual testing)
- Role exposure: 30 minutes (1 field addition, type updates)

**Builder should complete backend first** before frontend integration to unblock parallel work.

### 2. Zero database changes needed

**Schema is complete:**
- NightMessage table exists with all fields
- Player.role field exists
- Indexes are optimal
- No migrations required

**Builder can focus on API/event logic** without database concerns.

### 3. Reuse discussion message patterns everywhere

**Proven patterns:**
- `/api/game/[gameId]/messages` → Copy to `/night-messages`
- `NEW_MESSAGE` event → Copy to `NIGHT_MESSAGE` event
- SSE listener pattern → Add `night_message` listener

**Why:** Iteration 1 validated these patterns work. Don't reinvent the wheel.

### 4. Test SSE manually before E2E tests

**Manual testing workflow:**
1. Start game: `POST /api/game/[gameId]/start`
2. Open SSE connection: `curl -N /api/game/[gameId]/stream`
3. Watch for `night_start`, `night_message`, `night_complete` events
4. Verify payload structure matches TypeScript types
5. Only then write Playwright tests

**Why:** Faster feedback loop, easier debugging than E2E tests.

### 5. Consider feature flag for transparency mode (OPTIONAL)

**Not required for Plan 2**, but future-proofs codebase:

```typescript
// In night-phase.ts:
if (process.env.TRANSPARENCY_MODE === 'true') {
  gameEventEmitter.emitGameEvent('night_message', {...});
}
```

**Why:** If Plan 3 adds human players, can toggle transparency off.

### 6. Backend changes won't break Iteration 1 work

**Validation:**
- SSE endpoint modifications are additive (new listener, no removals)
- Event emitter handles any event type (no core changes)
- Night phase already stable (just adding emission)
- Zero changes to discussion phase
- Zero changes to master orchestrator flow

**Confidence:** 95% - Changes are isolated, low-risk, proven patterns.

---

## Resource Map

### Critical Files/Directories

**Backend API Routes:**
- `/app/app/api/game/[gameId]/messages/route.ts` - Pattern to copy for night messages
- `/app/app/api/game/[gameId]/state/route.ts` - Add role field here (line 58)
- `/app/app/api/game/[gameId]/stream/route.ts` - Add night_message listener (line 50)

**Event System:**
- `/src/lib/events/emitter.ts` - Event emitter singleton (no changes needed)
- `/src/lib/events/types.ts` - Add `night_message` to GameEventType union
- `/src/lib/events/index.ts` - Re-exports (verify no issues)

**Game Logic:**
- `/app/src/lib/game/night-phase.ts` - Add event emission at line 269
- `/app/src/lib/game/master-orchestrator.ts` - No changes needed (already integrated)

**Database:**
- `/app/prisma/schema.prisma` - NightMessage model (lines 82-99, no changes)

**Types:**
- `/src/lib/api/validation.ts` - Update GameStateResponse to include role

### Key Dependencies

**Prisma Client:**
- Used in all API routes
- NightMessage model available via `prisma.nightMessage`
- No version upgrades needed

**gameEventEmitter:**
- Singleton from `/src/lib/events/emitter.ts`
- Already stable (Iteration 1)
- Handles unlimited event types

**EventEmitter (Node.js):**
- Core dependency of gameEventEmitter
- Zero changes needed

### Testing Infrastructure

**Manual Testing Tools:**
- curl for API endpoints: `curl http://localhost:3001/api/game/[gameId]/night-messages`
- curl for SSE: `curl -N http://localhost:3001/api/game/[gameId]/stream`
- Browser DevTools Network tab for SSE inspection

**Automated Testing (Future):**
- Playwright E2E tests (Iteration 3)
- Vitest unit tests for API routes (optional)

**Database Testing:**
- Direct Prisma queries in Node REPL
- Supabase Local dashboard: `http://localhost:54323`

---

## Questions for Planner

### 1. Should night_message events be emitted during NIGHT phase only, or always?

**Context:** Night messages are generated during NIGHT phase (45 seconds), but spectators might want to review them during later phases.

**Options:**
- **A:** Emit events only during NIGHT phase (matches current behavior)
- **B:** Emit events during NIGHT, AND provide historical API endpoint for later phases
- **Recommendation:** Option B (emit real-time + provide API) for full flexibility

### 2. Should role field be exposed only during transparency mode, or always?

**Context:** Plan 2 is transparency-only, but future plans might add human players.

**Options:**
- **A:** Always expose roles (hardcode in API response)
- **B:** Add environment variable `TRANSPARENCY_MODE=true` to control exposure
- **C:** Add field to Game model: `transparencyMode: Boolean`
- **Recommendation:** Option A for Plan 2 (simplest), Option C for future-proofing

### 3. Should night messages API support pagination?

**Context:** Night phase generates 6-9 messages max (3 Mafia × 3 turns). Discussion generates 40+.

**Options:**
- **A:** No pagination (return all night messages)
- **B:** Add pagination (`?limit=20&offset=0`) for consistency
- **Recommendation:** Option A (KISS principle - pagination unnecessary for <10 messages)

### 4. Should SSE keepalive interval be adjusted for night phase?

**Context:** Current keepalive is 15 seconds. Night phase is 45 seconds total.

**Options:**
- **A:** Keep 15-second interval (current behavior)
- **B:** Reduce to 5 seconds for faster timeout detection
- **Recommendation:** Option A (15 seconds is proven stable, no need to change)

### 5. Should night_message event include victim selection result?

**Context:** Night phase ends with consensus algorithm selecting victim. Should this be part of night_message events or separate?

**Options:**
- **A:** Separate event: `night_complete` includes victim (current behavior)
- **B:** Last night_message includes victim selection reasoning
- **Recommendation:** Option A (separation of concerns - coordination vs decision)

---

## Event Emission Strategy Summary

### Where to Emit

**File:** `/app/src/lib/game/night-phase.ts`
**Function:** `executeNightTurn()` (line 202)
**Location:** After `prisma.nightMessage.create()` (line 256)

### When to Emit

**Timing:** Immediately after database save
**Reason:** Guarantees event payload matches saved data

### What Payload

**Event Type:** `night_message`
**Payload Structure:**
```typescript
{
  gameId: string;
  type: 'NIGHT_MESSAGE';
  payload: {
    id: string;              // Message ID
    playerId: string;        // Mafia agent ID
    playerName: string;      // Mafia agent name
    message: string;         // Coordination text
    timestamp: string;       // ISO 8601 timestamp
    roundNumber: number;     // Which round (1, 2, 3...)
    turn: number;            // Turn within Night phase (1, 2, 3)
  };
}
```

**Matches NEW_MESSAGE structure** - Proven stable.

---

## Backend Files That Need Modification

### 1. Create New API Endpoint (HIGH PRIORITY)

**File:** `/app/app/api/game/[gameId]/night-messages/route.ts` (NEW FILE)
**Lines:** ~90 (copy from messages/route.ts)
**Changes:**
- Replace `discussionMessage` with `nightMessage`
- Keep same query pattern, response format
- Update error messages

### 2. Update Event Types (HIGH PRIORITY)

**File:** `/src/lib/events/types.ts`
**Lines to modify:** 7-13 (GameEventType union)
**Changes:**
- Add `| 'night_message'` to union
- Add NIGHT_MESSAGE to GameEvent discriminated union

### 3. Update SSE Endpoint (HIGH PRIORITY)

**File:** `/app/app/api/game/[gameId]/stream/route.ts`
**Lines to modify:** 45-50 (listeners), 66-71 (cleanup)
**Changes:**
- Add `gameEventEmitter.on('night_message', messageHandler);`
- Add `gameEventEmitter.off('night_message', messageHandler);`

### 4. Emit Night Message Events (HIGH PRIORITY)

**File:** `/app/src/lib/game/night-phase.ts`
**Lines to modify:** 256-269 (after database save)
**Changes:**
- Remove line 269 comment restricting emission
- Add `gameEventEmitter.emitGameEvent('night_message', payload)`

### 5. Expose Player Roles (HIGH PRIORITY)

**File:** `/app/app/api/game/[gameId]/state/route.ts`
**Lines to modify:** 58-67 (player mapping)
**Changes:**
- Add `role: player.role,` to player object

### 6. Update API Types (MEDIUM PRIORITY)

**File:** `/src/lib/api/validation.ts`
**Lines to modify:** GameStateResponse type
**Changes:**
- Add `role: string;` to player type definition

---

## Complexity Assessment: MEDIUM

**Total Implementation Time:** 3-4 hours

**Breakdown:**
- Create night-messages API endpoint: 2-3 hours
- Update event types: 15 minutes
- Add SSE listener: 5 minutes
- Emit night_message events: 10 minutes
- Expose player roles: 5 minutes
- Update TypeScript types: 15 minutes
- Manual testing: 30-60 minutes

**Risk Level:** LOW
- All changes follow proven patterns
- Zero database modifications
- Additive changes to stable systems
- Iteration 1 SSE stability preserved

**Confidence:** 90% - Backend ready for transparency features with minimal low-risk changes.

---

**Report Status:** COMPLETE
**Next Step:** Planner synthesizes with Explorer 1 and Explorer 3 reports to create comprehensive iteration plan
**Explorer ID:** explorer-2
**Focus Area:** Backend Events & API Endpoints
**Date:** 2025-10-13
