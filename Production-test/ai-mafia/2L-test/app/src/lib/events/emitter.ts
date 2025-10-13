/**
 * Global event emitter for game orchestration
 *
 * Used for real-time communication between:
 * - Discussion orchestrator (emits events)
 * - SSE endpoint (listens and streams to clients)
 * - CLI test harness (displays real-time updates)
 *
 * Pattern: In-memory pub/sub with EventEmitter
 */

import { EventEmitter } from 'events';
import type { GameEvent, GameEventType } from './types';

class GameEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners for multiple spectators
    // Default is 10, we may have more SSE connections
    this.setMaxListeners(50);
  }

  /**
   * Emit a game event
   * @param eventType Type of event (message, turn_start, etc.)
   * @param data Event payload
   */
  emitGameEvent(eventType: GameEventType, data: GameEvent): void {
    this.emit(eventType, data);
    // Also emit to 'all' channel for debugging/logging
    this.emit('all', { eventType, data });
  }

  /**
   * Listen for specific game events
   * @param eventType Type of event to listen for
   * @param listener Callback function
   */
  onGameEvent(
    eventType: GameEventType,
    listener: (data: GameEvent) => void
  ): void {
    this.on(eventType, listener);
  }

  /**
   * Remove event listener
   * @param eventType Type of event
   * @param listener Callback function to remove
   */
  offGameEvent(
    eventType: GameEventType,
    listener: (data: GameEvent) => void
  ): void {
    this.off(eventType, listener);
  }

  /**
   * Listen to all events (for debugging)
   * @param listener Callback function
   */
  onAllEvents(
    listener: (data: { eventType: GameEventType; data: GameEvent }) => void
  ): void {
    this.on('all', listener);
  }
}

// Export singleton instance
export const gameEventEmitter = new GameEventEmitter();

// Export class for testing
export { GameEventEmitter };
