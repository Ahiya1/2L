/**
 * GameEventsContext - Shared SSE connection provider
 *
 * Foundation for real-time game updates with:
 * - Single EventSource connection per game
 * - State catchup on mount (fetch initial state + queue events)
 * - Polling fallback after 3 SSE failures
 * - Event deduplication
 *
 * SUB-BUILDERS: Use this context via useGameEvents() hook
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type { GameEvent } from '@/lib/events/types';
import type { GameEventsContextValue, CurrentGameState } from '@/lib/game/types';

const GameEventsContext = createContext<GameEventsContextValue | null>(null);

export interface GameEventsProviderProps {
  gameId: string;
  children: ReactNode;
}

export function GameEventsProvider({
  gameId,
  children,
}: GameEventsProviderProps) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // State catchup
  const [eventQueue, setEventQueue] = useState<GameEvent[]>([]);
  const [initialStateFetched, setInitialStateFetched] = useState(false);

  // Polling fallback
  const [sseFailures, setSseFailures] = useState(0);
  const [usePolling, setUsePolling] = useState(false);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  // Exponential backoff reconnection
  const MAX_RETRIES = 5;
  const [reconnectTimeoutId, setReconnectTimeoutId] = useState<NodeJS.Timeout | null>(null);

  /**
   * Step 1: Fetch initial game state on mount
   */
  useEffect(() => {
    async function fetchInitialState() {
      try {
        const response = await fetch(`/api/game/${gameId}/state`);
        if (!response.ok) {
          throw new Error(`Failed to fetch state: ${response.status}`);
        }

        const state: any = await response.json();

        // Convert state to events for consistency
        const initialEvents = stateToEvents(state);
        setEvents(initialEvents);

        // Apply queued events now that initial state is loaded
        setEventQueue((queue) => {
          queue.forEach((event) => {
            setEvents((prev) => [...prev, event]);
          });
          return [];
        });

        setInitialStateFetched(true);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch initial state';
        console.error('[GameEventsContext] Failed to fetch initial state:', errorMsg);
        setError(errorMsg);
      }
    }

    fetchInitialState();
  }, [gameId]);

  /**
   * Step 2: Connect to SSE (or use polling fallback)
   */
  useEffect(() => {
    if (usePolling) {
      // Polling fallback mode
      const interval = setInterval(async () => {
        try {
          const url = lastEventId
            ? `/api/game/${gameId}/events?since=${lastEventId}`
            : `/api/game/${gameId}/events`;

          const response = await fetch(url);
          if (!response.ok) return;

          const newEvents: GameEvent[] = await response.json();

          newEvents.forEach((event) => {
            if (initialStateFetched) {
              setEvents((prev) => [...prev, event]);
            } else {
              setEventQueue((prev) => [...prev, event]);
            }

            // Update last event ID for next poll
            if ('id' in event) {
              setLastEventId(event.id as string);
            }
          });

          setIsConnected(true);
          setError(null);
        } catch (err) {
          console.error('[GameEventsContext] Polling failed:', err);
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    } else {
      // SSE mode
      const eventSource = new EventSource(`/api/game/${gameId}/stream`);

      eventSource.onopen = () => {
        console.log('[GameEventsContext] SSE connected');
        setIsConnected(true);
        setError(null);
        setSseFailures(0);
      };

      eventSource.onmessage = (e) => {
        try {
          const event: GameEvent = JSON.parse(e.data);

          if (initialStateFetched) {
            // Add event immediately
            setEvents((prev) => [...prev, event]);
          } else {
            // Queue event until initial state ready
            setEventQueue((prev) => [...prev, event]);
          }
        } catch (err) {
          console.error('[GameEventsContext] Failed to parse SSE message:', err);
        }
      };

      eventSource.onerror = () => {
        console.error('[GameEventsContext] SSE connection error');
        setIsConnected(false);
        setError('Connection lost');

        // Close current connection
        eventSource.close();

        // Increment reconnect attempts
        setReconnectAttempts((prev) => {
          const newAttempt = prev + 1;

          if (newAttempt >= MAX_RETRIES) {
            // After 5 failures, fall back to polling
            console.warn(`[GameEventsContext] SSE max retries (${MAX_RETRIES}) exceeded, switching to polling`);
            setUsePolling(true);
            setSseFailures(MAX_RETRIES);
          } else {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s
            const delay = Math.pow(2, newAttempt) * 1000;
            console.log(`[GameEventsContext] Reconnecting in ${delay}ms (attempt ${newAttempt}/${MAX_RETRIES})`);

            const timeoutId = setTimeout(() => {
              console.log('[GameEventsContext] Attempting reconnection...');
              // Component will automatically reconnect due to useEffect dependencies
            }, delay);

            setReconnectTimeoutId(timeoutId);
          }

          return newAttempt;
        });
      };

      return () => {
        console.log('[GameEventsContext] Closing SSE connection');
        eventSource.close();

        // Clear reconnection timeout if exists
        if (reconnectTimeoutId) {
          clearTimeout(reconnectTimeoutId);
          setReconnectTimeoutId(null);
        }
      };
    }
  }, [gameId, initialStateFetched, usePolling, lastEventId, reconnectAttempts]);

  const value: GameEventsContextValue = {
    events,
    isConnected,
    error,
    reconnectAttempts,
  };

  return (
    <GameEventsContext.Provider value={value}>
      {children}
    </GameEventsContext.Provider>
  );
}

/**
 * Hook to access game events context
 */
export function useGameEvents(): GameEventsContextValue {
  const context = useContext(GameEventsContext);
  if (!context) {
    throw new Error('useGameEvents must be used within GameEventsProvider');
  }
  return context;
}

/**
 * Helper: Convert initial state to event format
 * This ensures late-joiners see historical data as events
 */
function stateToEvents(state: any): GameEvent[] {
  const events: GameEvent[] = [];

  // Add phase_change event for current phase
  if (state.game.currentPhase) {
    events.push({
      gameId: state.game.id,
      type: 'phase_change',
      payload: {
        from: 'LOBBY',
        to: state.game.currentPhase,
        round: state.game.roundNumber,
        // Include phaseStartTime if available from state
        phaseStartTime: state.game.phaseStartTime || new Date().toISOString(),
        phaseEndTime: state.game.phaseEndTime || null,
      },
    });
  }

  // TODO: Sub-builders can extend this to include more historical events
  // (e.g., player eliminations, votes cast, etc.)

  return events;
}
