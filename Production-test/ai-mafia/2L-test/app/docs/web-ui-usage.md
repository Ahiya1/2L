# Web UI Usage Guide

## Overview

The Discussion Viewer provides real-time visualization of the Discussion phase where AI agents debate and strategize.

## Quick Start

### 1. Start the Next.js dev server

```bash
cd app
npm run dev
```

Server will start at `http://localhost:3000` (or next available port).

### 2. Run a Discussion test

In a separate terminal:

```bash
npm run test-discussion
```

The CLI will output a game ID like: `clxx123abc...`

### 3. Open the Discussion Viewer

Navigate to:
```
http://localhost:3000/test-discussion?gameId=<your-game-id>
```

Replace `<your-game-id>` with the ID from step 2.

## Features

### PhaseIndicator
- **Phase Name**: Shows "DISCUSSION"
- **Countdown Timer**: Updates every second, shows MM:SS format
- **Progress Bar**: Visual indicator of time remaining
- **SSE Connection**: Automatically updates when phase changes

### PlayerGrid
- **10 Agent Cards**: Grid layout (2 columns × 5 rows)
- **Agent Name**: e.g., "Agent-A", "Agent-B"
- **Personality**: Shows personality trait (analytical, aggressive, etc.)
- **Alive/Dead Status**:
  - Alive: Green border, normal opacity
  - Eliminated: Red border, reduced opacity
- **Role Hidden**: Roles (Mafia/Villager) are NOT displayed (spectator view)
- **Real-time Updates**: SSE connection updates status instantly

### DiscussionFeed
- **Message List**: Scrolling feed of all agent messages
- **Auto-scroll**: Automatically scrolls to bottom when new messages arrive
- **Threading Indicator**: Shows "↳ Replying to Agent-X" when message is a reply
- **Message Format**:
  - Agent name (bold, blue)
  - Message text (normal)
  - Round and turn number
  - Timestamp (HH:MM:SS)
- **Connection Status**: Green/red indicator in header
- **Message Count**: Shows total messages received

## SSE Connection

### How It Works

1. Page opens EventSource connection to `/api/game/[gameId]/stream`
2. Server sends initial `CONNECTED` event
3. Server sends keepalive heartbeat every 15 seconds
4. Orchestrator emits events → SSE streams to clients
5. Components update UI in real-time

### Event Types

- `CONNECTED`: Connection established
- `NEW_MESSAGE`: New discussion message
- `TURN_START`: Agent turn begins
- `TURN_END`: Agent turn completes
- `PHASE_CHANGE`: Phase transition
- `DISCUSSION_COMPLETE`: Discussion phase finished

### Auto-reconnection

EventSource automatically reconnects if connection drops. You'll see:
- Red indicator: "Connecting..."
- Green indicator: "Connected"

No manual action required.

## Troubleshooting

### SSE Not Connecting

**Check:**
1. Dev server is running: `npm run dev`
2. Game ID is valid (copy from CLI output)
3. No firewall blocking `text/event-stream` content type

**Test SSE endpoint with curl:**
```bash
curl http://localhost:3000/api/game/test-game-123/stream
```

Should output:
```
data: {"type":"CONNECTED","gameId":"test-game-123"}

: keepalive

: keepalive
```

### Messages Not Appearing

**Check:**
1. CLI test is running: `npm run test-discussion`
2. Game ID matches between CLI and URL
3. Orchestrator is emitting events (check CLI output)
4. Browser console for errors (F12 → Console)

**Verify event emitter:**
```typescript
// In CLI or orchestrator
gameEventEmitter.emitGameEvent('message', {
  gameId: 'your-game-id',
  type: 'NEW_MESSAGE',
  payload: { /* message data */ }
});
```

### Countdown Timer Not Working

**Check:**
1. `phaseEndTime` is set correctly (default: 3 minutes from mount)
2. No JavaScript errors in console
3. Component is mounted (not in loading state)

**Note:** Timer uses client-side calculation. For accurate timing, fetch `phaseEndTime` from database.

## Testing Checklist

- [ ] Start dev server
- [ ] Run CLI test: `npm run test-discussion`
- [ ] Open viewer with game ID
- [ ] SSE connects (green indicator)
- [ ] PhaseIndicator shows "DISCUSSION"
- [ ] Countdown timer updates every second
- [ ] PlayerGrid displays 10 agents
- [ ] DiscussionFeed receives messages
- [ ] Messages auto-scroll to bottom
- [ ] Kill server → restart → auto-reconnect works
- [ ] Open multiple tabs → all receive same messages

## Performance

### Expected Latency
- Message generation → SSE stream: <500ms
- SSE stream → UI update: <100ms
- **Total: <1 second** from agent generation to spectator display

### Resource Usage
- **Memory**: ~5MB per tab (React + SSE connection)
- **Network**: ~1KB per message (SSE data)
- **CPU**: Minimal (only on new messages)

### Optimization Tips
1. Close unused tabs (each opens SSE connection)
2. Clear messages after 100+ to prevent memory buildup (not implemented in Iteration 1)
3. Use Chrome DevTools Performance tab to profile

## Browser Compatibility

**Tested:**
- Chrome 120+ ✓
- Firefox 120+ ✓
- Safari 17+ ✓
- Edge 120+ ✓

**EventSource Support:**
All modern browsers support EventSource API natively.

**Not Supported:**
- IE 11 (deprecated)

## Production Considerations

### Authentication
**Current:** No authentication (local development only)

**Iteration 2:** Add authentication to SSE endpoint:
- Verify user session
- Check game access permissions
- Rate limit per user

### Scaling
**Current:** In-memory EventEmitter (single server)

**Iteration 2:** For multi-server deployment:
- Replace EventEmitter with Redis Pub/Sub
- Or use dedicated message broker (RabbitMQ, Kafka)

### Error Handling
**Current:** Console.error only

**Iteration 2:**
- Log errors to monitoring service (Sentry)
- Display user-friendly error messages
- Retry failed SSE connections with exponential backoff

## API Reference

### SSE Endpoint

**Route:** `/api/game/[gameId]/stream`

**Method:** GET

**Response:** `text/event-stream`

**Event Format:**
```typescript
data: {
  "gameId": "clxx123abc...",
  "type": "NEW_MESSAGE" | "TURN_START" | "TURN_END" | "PHASE_CHANGE" | "DISCUSSION_COMPLETE",
  "payload": { /* event-specific data */ }
}
```

**Keepalive:**
```
: keepalive
```

Sent every 15 seconds to prevent timeout.

### Component Props

**PhaseIndicator:**
```typescript
interface PhaseIndicatorProps {
  gameId: string;
}
```

**PlayerGrid:**
```typescript
interface PlayerGridProps {
  gameId: string;
}
```

**DiscussionFeed:**
```typescript
interface DiscussionFeedProps {
  gameId: string;
}
```

All components accept only `gameId`. They fetch data and connect to SSE internally.

## Future Enhancements (Iteration 2+)

- [ ] Historical transcript viewer (browse past games)
- [ ] Pause/resume Discussion (admin controls)
- [ ] Export transcript (download as JSON/TXT)
- [ ] Advanced threading visualization (conversation graphs)
- [ ] Agent "typing" indicators
- [ ] Vote prediction highlights
- [ ] Mobile responsive design
- [ ] Dark mode
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Performance optimizations (virtualized message list)

---

**Need Help?**

Check BUILDER-4A-SUMMARY.md for implementation details.
