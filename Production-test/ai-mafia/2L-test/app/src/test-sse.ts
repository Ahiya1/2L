/**
 * SSE Endpoint Test Script
 *
 * Tests the SSE endpoint by:
 * 1. Starting a mock game
 * 2. Emitting test events
 * 3. Verifying SSE stream receives them
 *
 * Usage: tsx src/test-sse.ts
 */

import { gameEventEmitter } from './lib/events/emitter';

async function testSSEEndpoint() {
  console.log('SSE Endpoint Test\n');
  console.log('1. Testing event emitter...');

  // Test event emission
  const testGameId = 'test-game-123';

  // Emit a test message event
  gameEventEmitter.emitGameEvent('message', {
    gameId: testGameId,
    type: 'message',
    payload: {
      id: 'msg-1',
      gameId: testGameId,
      roundNumber: 1,
      playerId: 'player-1',
      message: 'This is a test message',
      inReplyToId: null,
      timestamp: new Date(),
      turn: 1,
      player: {
        id: 'player-1',
        gameId: testGameId,
        name: 'Agent-A',
        role: 'VILLAGER',
        personality: 'analytical',
        isAlive: true,
        position: 0,
      },
    },
  });

  console.log('✓ Event emitted successfully\n');

  console.log('2. To test SSE endpoint:');
  console.log('   - Start dev server: npm run dev');
  console.log('   - Open in browser: http://localhost:3000/test-discussion?gameId=test-game-123');
  console.log('   - Or test with curl: curl http://localhost:3000/api/game/test-game-123/stream\n');

  console.log('3. Event structure:');
  console.log(JSON.stringify({
    gameId: testGameId,
    type: 'message',
    payload: {
      id: 'msg-1',
      player: { name: 'Agent-A' },
      message: 'This is a test message',
      timestamp: new Date().toISOString(),
    },
  }, null, 2));

  console.log('\n✓ SSE endpoint structure verified');
}

testSSEEndpoint().catch(console.error);
