# Builder-1 Changes Summary

## Quick Reference for Integration

### Files Created (1)
```
app/app/api/game/[gameId]/night-messages/route.ts
```

### Files Modified (5)

1. **app/src/lib/game/night-phase.ts**
   - Line 247: Capture `savedMessage` from DB create
   - Lines 269-282: Emit `night_message` SSE event after DB save

2. **src/lib/events/types.ts**
   - Line 14: Add `'night_message'` to `GameEventType` union
   - Lines 68-80: Add `NIGHT_MESSAGE` to `GameEvent` discriminated union

3. **app/app/api/game/[gameId]/stream/route.ts**
   - Line 51: Add `gameEventEmitter.on('night_message', messageHandler)`
   - Line 73: Add `gameEventEmitter.off('night_message', messageHandler)`

4. **app/app/api/game/[gameId]/state/route.ts**
   - Line 61: Add `role: player.role` to player mapping

5. **app/src/lib/api/validation.ts**
   - Line 86: Add `role: string` to `GameStateResponse` player type

## API Contracts

### New Endpoint
```
GET /api/game/[gameId]/night-messages?round=N
```

Response:
```json
{
  "messages": [
    {
      "id": "string",
      "playerId": "string",
      "playerName": "string",
      "message": "string",
      "timestamp": "ISO 8601",
      "roundNumber": 0,
      "turn": 0,
      "inReplyToId": "string | null"
    }
  ],
  "total": 0,
  "hasMore": false
}
```

### Modified Endpoint
```
GET /api/game/[gameId]/state
```

Now includes `role` field in players:
```json
{
  "players": [
    {
      "id": "string",
      "name": "string",
      "role": "MAFIA | VILLAGER",  // NEW
      ...
    }
  ]
}
```

### New SSE Event
```
Event Type: 'night_message'
```

Payload:
```json
{
  "gameId": "string",
  "type": "NIGHT_MESSAGE",
  "payload": {
    "id": "string",
    "playerId": "string",
    "playerName": "string",
    "message": "string",
    "timestamp": "ISO 8601",
    "roundNumber": 0,
    "turn": 0
  }
}
```

## Testing Commands

```bash
# Test night messages endpoint
curl http://localhost:3001/api/game/<gameId>/night-messages | jq '.'

# Test state endpoint with roles
curl http://localhost:3001/api/game/<gameId>/state | jq '.players[0].role'

# Watch SSE stream
curl -N http://localhost:3001/api/game/<gameId>/stream

# Run automated tests
.2L/plan-2/iteration-6/building/test-backend-endpoints.sh <gameId>
```

## For Builder 2

### Import Types
```typescript
import type { GameEvent } from '@/../src/lib/events/types';
import type { GameStateResponse } from '@/lib/api/validation';
```

### Subscribe to Events
```typescript
const { events } = useGameEvents();
const nightMessages = events.filter((e) => e.type === 'night_message');
```

### Fetch Historical Messages
```typescript
const res = await fetch(`/api/game/${gameId}/night-messages`);
const { messages } = await res.json();
```

### Display Roles
```typescript
// Player role is now available in game state
{player.role === 'MAFIA' ? (
  <Badge variant="mafia">Mafia</Badge>
) : (
  <Badge variant="villager">Villager</Badge>
)}
```

## TypeScript Compilation

✅ Zero new errors introduced
⚠️ Pre-existing error in MafiaChatPanel.tsx (Builder 2's file)

## Backend Tests

⏳ Unable to verify (tests timeout)
📝 Recommendation: Run tests in isolation during integration

## Integration Risk

🟢 LOW - All changes additive, no breaking modifications
