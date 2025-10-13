# AI Mafia - API Reference

## Base URL
Development: `http://localhost:3000`

## Endpoints

### 1. Create Game
**POST** `/api/game/create`

Creates a new game with specified number of players and assigns roles randomly.

**Request Body:**
```json
{
  "playerCount": 10
}
```

**Validation:**
- `playerCount`: integer, 8-12

**Response (201):**
```json
{
  "gameId": "clxxx..."
}
```

**Errors:**
- `400` - Invalid player count
- `500` - Server error

---

### 2. Start Game
**POST** `/api/game/[gameId]/start`

Starts the game loop asynchronously. Game transitions from LOBBY to NIGHT phase.

**Response (200):**
```json
{
  "success": true,
  "gameId": "clxxx...",
  "message": "Game started successfully"
}
```

**Errors:**
- `400` - Game already started or no players
- `404` - Game not found
- `500` - Server error

---

### 3. Get Game State
**GET** `/api/game/[gameId]/state`

Returns current game state for spectators. Roles are hidden until game over.

**Response (200):**
```json
{
  "game": {
    "id": "clxxx...",
    "status": "NIGHT",
    "currentPhase": "NIGHT",
    "phaseStartTime": "2025-10-13T00:00:00.000Z",
    "roundNumber": 1,
    "winner": null,
    "playerCount": 10
  },
  "players": [
    {
      "id": "clxxx...",
      "name": "Agent-A",
      "personality": "analytical",
      "isAlive": true,
      "position": 0,
      "eliminatedInRound": null,
      "eliminationType": null
    }
  ],
  "phaseEndTime": "2025-10-13T00:00:45.000Z"
}
```

**Notes:**
- `role` field NOT included (privacy guarantee)
- `phaseEndTime` calculated from phase duration

**Errors:**
- `404` - Game not found
- `500` - Server error

---

### 4. Get Messages
**GET** `/api/game/[gameId]/messages?round=N`

Returns discussion messages. Night messages are excluded (privacy guarantee).

**Query Parameters:**
- `round` (optional): Filter messages by round number

**Response (200):**
```json
{
  "messages": [
    {
      "id": "clxxx...",
      "playerId": "clxxx...",
      "playerName": "Agent-A",
      "message": "I suspect Agent-C is acting suspiciously...",
      "timestamp": "2025-10-13T00:05:00.000Z",
      "roundNumber": 1,
      "turn": 5,
      "inReplyToId": null
    }
  ],
  "total": 45,
  "hasMore": false
}
```

**Errors:**
- `400` - Invalid round parameter
- `404` - Game not found
- `500` - Server error

---

### 5. Get Votes
**GET** `/api/game/[gameId]/votes?round=N`

Returns votes with automatic tally calculation.

**Query Parameters:**
- `round` (optional): Filter votes by round (defaults to current round)

**Response (200):**
```json
{
  "votes": [
    {
      "id": "clxxx...",
      "voterId": "clxxx...",
      "voterName": "Agent-A",
      "targetId": "clxxx...",
      "targetName": "Agent-C",
      "justification": "I vote for Agent-C because...",
      "voteOrder": 1,
      "timestamp": "2025-10-13T00:10:00.000Z"
    }
  ],
  "tally": {
    "clxxx-player-c-id": 3,
    "clxxx-player-d-id": 2
  },
  "round": 1
}
```

**Notes:**
- Votes returned in sequential order (`voteOrder`)
- Tally maps player IDs to vote counts

**Errors:**
- `400` - Invalid round parameter
- `404` - Game not found
- `500` - Server error

---

### 6. Get Results
**GET** `/api/game/[gameId]/results`

Returns complete game results including roles revealed. Only accessible after game over.

**Response (200):**
```json
{
  "game": {
    "id": "clxxx...",
    "status": "GAME_OVER",
    "winner": "VILLAGERS",
    "roundNumber": 3,
    "playerCount": 10,
    "createdAt": "2025-10-13T00:00:00.000Z"
  },
  "players": [
    {
      "id": "clxxx...",
      "name": "Agent-A",
      "role": "MAFIA",
      "personality": "analytical",
      "isAlive": false,
      "position": 0,
      "eliminatedInRound": 2,
      "eliminationType": "DAYKILL"
    }
  ],
  "messages": [...],
  "votes": [...],
  "nightMessages": [...]
}
```

**Notes:**
- **Roles revealed** (safe after game over)
- Includes full transcript: discussion, votes, night messages
- Night messages visible for post-game analysis

**Errors:**
- `403` - Game not finished
- `404` - Game not found
- `500` - Server error

---

## Error Format

All errors follow this structure:

```json
{
  "error": "Error message",
  "details": []  // Optional: Zod validation errors
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `500` - Internal Server Error

---

## Type Definitions

All request/response types are exported from:
```typescript
import type {
  CreateGameResponse,
  StartGameResponse,
  GameStateResponse,
  GetMessagesResponse,
  GetVotesResponse,
  GameResultsResponse
} from '@/lib/api/validation';
```

---

## Testing

Use the provided test script:
```bash
cd app
npm run dev  # Start server
./test-api.sh
```

Or manually with curl:
```bash
# Create game
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"playerCount": 10}'

# Start game
curl -X POST http://localhost:3000/api/game/[gameId]/start

# Get state
curl http://localhost:3000/api/game/[gameId]/state

# Get messages
curl http://localhost:3000/api/game/[gameId]/messages?round=1

# Get votes
curl http://localhost:3000/api/game/[gameId]/votes?round=1

# Get results
curl http://localhost:3000/api/game/[gameId]/results
```

---

## Privacy & Security

### Privacy Guarantees
1. **Roles hidden** until game status is GAME_OVER
2. **Night messages excluded** from `/messages` endpoint
3. **Night messages included** in `/results` only after game over

### Security Features
1. **Zod validation** on all inputs
2. **Parameterized queries** via Prisma (SQL injection safe)
3. **Structured errors** (no stack traces to client)
4. **cuid game IDs** (cryptographically random)

---

## Integration Examples

### React Component
```typescript
'use client';
import { useState } from 'react';
import type { CreateGameResponse, GameStateResponse } from '@/lib/api/validation';

export default function CreateGameButton() {
  const [loading, setLoading] = useState(false);

  const createGame = async () => {
    setLoading(true);

    const res = await fetch('/api/game/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerCount: 10 }),
    });

    const data: CreateGameResponse = await res.json();

    // Start game
    await fetch(`/api/game/${data.gameId}/start`, { method: 'POST' });

    // Navigate to game
    window.location.href = `/game/${data.gameId}`;
  };

  return (
    <button onClick={createGame} disabled={loading}>
      {loading ? 'Creating...' : 'Create Game'}
    </button>
  );
}
```

### Polling State
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/game/${gameId}/state`);
    const state: GameStateResponse = await res.json();
    setGameState(state);
  }, 2000);

  return () => clearInterval(interval);
}, [gameId]);
```

---

## Notes for UI Builders

1. Use SSE endpoint for real-time updates (not polling)
2. All timestamps are ISO 8601 format
3. Phase end times are calculated, not stored in DB
4. Vote tally is calculated on-demand, always current
5. Messages are ordered by timestamp within round
6. Votes are ordered by voteOrder (sequential)

---

**Builder-4 Implementation Complete**
API Layer ready for UI builders (5-6) to consume.
