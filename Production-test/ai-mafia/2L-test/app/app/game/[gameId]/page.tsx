/**
 * Live Game Page
 *
 * Main page for spectating a live game with:
 * - Phase indicator at top
 * - Player grid on left
 * - Discussion feed in center
 * - Vote tally on right (conditional during VOTING phase)
 *
 * Uses GameEventsProvider for shared SSE connection
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { GameEventsProvider, useGameEvents } from '@/contexts/GameEventsContext';
import PhaseIndicator from '@/components/PhaseIndicator';
import PlayerGrid from '@/components/PlayerGrid';
import DiscussionFeed from '@/components/DiscussionFeed';
import VoteTally from '@/components/VoteTally';
import ConnectionStatus from '@/components/ConnectionStatus';
import CostMetrics from '@/components/CostMetrics';
import type { GamePhase, UIPlayer } from '@/lib/game/types';

interface LiveGamePageProps {
  params: {
    gameId: string;
  };
}

/**
 * Inner component that uses useGameEvents hook
 */
function LiveGameContent({ gameId }: { gameId: string }) {
  const { events, error } = useGameEvents();
  const [players, setPlayers] = useState<UIPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch initial player data
  useEffect(() => {
    async function fetchPlayers() {
      try {
        const response = await fetch(`/api/game/${gameId}/state`);
        if (!response.ok) {
          throw new Error(`Failed to fetch game state: ${response.status}`);
        }

        const data = await response.json();
        setPlayers(data.players || []);
        setLoading(false);
      } catch (err) {
        console.error('[LiveGamePage] Failed to fetch players:', err);
        setFetchError(err instanceof Error ? err.message : 'Failed to load game state');
        setLoading(false);
      }
    }

    fetchPlayers();
  }, [gameId]);

  // Extract current phase from events
  const currentPhase = useMemo<GamePhase | null>(() => {
    const phaseEvents = events.filter((e) => e.type === 'phase_change');
    if (phaseEvents.length === 0) return null;
    const latestPhase = phaseEvents[phaseEvents.length - 1];
    if (!latestPhase) return null;
    return (latestPhase.payload as any).to as GamePhase;
  }, [events]);

  // Update player status based on elimination events
  useEffect(() => {
    const eliminationEvents = events.filter((e) => e.type === 'player_eliminated');

    eliminationEvents.forEach((event: any) => {
      const { playerId, eliminationType, round } = event.payload;

      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId
            ? {
                ...p,
                isAlive: false,
                eliminatedInRound: round,
                eliminationType,
              }
            : p
        )
      );
    });
  }, [events]);

  // Calculate alive players
  const alivePlayers = useMemo(() => players.filter((p) => p.isAlive), [players]);
  const playerNames = useMemo(() => players.map((p) => p.name), [players]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading game...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (fetchError || error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl font-bold mb-2">Error Loading Game</div>
          <div className="text-gray-600 mb-4">{fetchError || error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Page title with connection status */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            Live Game: {gameId.substring(0, 8)}
          </h1>
          <ConnectionStatus />
        </div>

        {/* Phase indicator (full width) */}
        <div className="mb-4">
          <PhaseIndicator gameId={gameId} />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Left column - Player Grid */}
          <div className="md:col-span-1 lg:col-span-1">
            <PlayerGrid gameId={gameId} />
          </div>

          {/* Center column - Discussion Feed */}
          <div className="md:col-span-1 lg:col-span-1">
            <DiscussionFeed gameId={gameId} playerNames={playerNames} />
          </div>

          {/* Right column - Vote Tally (conditional during VOTING phase) */}
          <div className="md:col-span-2 lg:col-span-1 space-y-4">
            {currentPhase === 'VOTING' ? (
              <VoteTally gameId={gameId} playerCount={alivePlayers.length} />
            ) : (
              <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm h-[600px]">
                <div className="text-sm text-gray-500 uppercase tracking-wide mb-3">
                  Vote Tally
                </div>
                <div className="text-gray-600 text-sm text-center mt-10">
                  {currentPhase === 'DISCUSSION'
                    ? 'Vote tally will appear when voting phase begins...'
                    : currentPhase
                    ? `Current phase: ${currentPhase}`
                    : 'Waiting for game to start...'}
                </div>
              </div>
            )}

            {/* Cost Metrics Panel */}
            <CostMetrics gameId={gameId} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveGamePage({ params }: LiveGamePageProps) {
  const { gameId } = params;

  return (
    <GameEventsProvider gameId={gameId}>
      <LiveGameContent gameId={gameId} />
    </GameEventsProvider>
  );
}
