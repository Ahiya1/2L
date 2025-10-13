/**
 * SSE (Server-Sent Events) endpoint for streaming game events
 *
 * Streams real-time game events to spectators:
 * - NEW_MESSAGE: Discussion messages
 * - TURN_START/TURN_END: Turn indicators
 * - DISCUSSION_COMPLETE: Phase completion
 *
 * Pattern: Next.js Route Handler with ReadableStream
 */

import { NextRequest } from 'next/server';
import { gameEventEmitter } from '@/../src/lib/events/emitter';
import type { GameEvent } from '@/../src/lib/events/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const encoder = new TextEncoder();
  const gameId = params.gameId;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send connection confirmation
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', gameId })}\n\n`)
      );

      // 2. Listen for all game event types
      const messageHandler = (data: GameEvent) => {
        if (data.gameId === gameId) {
          try {
            const payload = JSON.stringify(data);
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          } catch (error) {
            console.error('Failed to serialize event:', error);
          }
        }
      };

      // Subscribe to all event types
      gameEventEmitter.on('message', messageHandler);
      gameEventEmitter.on('turn_start', messageHandler);
      gameEventEmitter.on('turn_end', messageHandler);
      gameEventEmitter.on('phase_change', messageHandler);
      gameEventEmitter.on('phase_complete', messageHandler);
      gameEventEmitter.on('discussion_complete', messageHandler);

      // 3. Keepalive heartbeat (15-second interval)
      // Prevents connection timeout, especially on proxies
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          // Client disconnected, clear interval
          clearInterval(keepalive);
        }
      }, 15000);

      // 4. Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(keepalive);
        gameEventEmitter.off('message', messageHandler);
        gameEventEmitter.off('turn_start', messageHandler);
        gameEventEmitter.off('turn_end', messageHandler);
        gameEventEmitter.off('phase_change', messageHandler);
        gameEventEmitter.off('phase_complete', messageHandler);
        gameEventEmitter.off('discussion_complete', messageHandler);

        try {
          controller.close();
        } catch {
          // Already closed, ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
