/**
 * PlayerGrid Component (Enhanced)
 *
 * Displays:
 * - All players (8-12) in responsive grid layout
 * - Deterministic avatar circles with initials
 * - Alive players: full color
 * - Dead players: grayscale + "Eliminated" badge
 * - Roles HIDDEN (show "?" or nothing)
 * - Real-time updates via shared GameEventsContext
 *
 * Layout: 2 columns mobile, 3 columns tablet, 4 columns desktop
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGameEvents } from '@/contexts/GameEventsContext';
import type { UIPlayer } from '@/lib/game/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  getAvatarColor,
  getAvatarTextColor,
  getAvatarInitial,
} from '@/src/utils/avatar-colors';

interface PlayerGridProps {
  gameId: string;
}

export default function PlayerGrid({ gameId }: PlayerGridProps) {
  const { events } = useGameEvents();
  const [players, setPlayers] = useState<UIPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial player data from state API
  useEffect(() => {
    async function fetchPlayers() {
      try {
        const response = await fetch(`/api/game/${gameId}/state`);
        if (!response.ok) {
          throw new Error(`Failed to fetch state: ${response.status}`);
        }

        const state = await response.json();
        setPlayers(state.players || []);
        setLoading(false);
      } catch (error) {
        console.error('[PlayerGrid] Failed to fetch players:', error);
        setLoading(false);
      }
    }

    fetchPlayers();
  }, [gameId]);

  // Listen for player elimination events
  useEffect(() => {
    const eliminationEvents = events.filter(
      (e) => e.type === 'player_eliminated'
    );

    eliminationEvents.forEach((event) => {
      const payload = event.payload as any;
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === payload.playerId
            ? {
                ...p,
                isAlive: false,
                eliminatedInRound: payload.round,
                eliminationType: payload.eliminationType,
              }
            : p
        )
      );
    });
  }, [events]);

  // Count alive players
  const aliveCount = useMemo(() => {
    return players.filter((p) => p.isAlive).length;
  }, [players]);

  if (loading) {
    return (
      <Card>
        <div className="text-center text-gray-500">Loading players...</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="text-sm text-gray-500 uppercase tracking-wide mb-3">
        Players ({aliveCount}/{players.length} Alive)
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2" data-testid="player-grid">
        {players
          .sort((a, b) => a.position - b.position)
          .map((player) => {
            const avatarBgColor = getAvatarColor(player.name);
            const avatarTextColor = getAvatarTextColor(player.name);
            const avatarInitial = getAvatarInitial(player.name);

            return (
              <div
                key={player.id}
                data-testid={`player-card-${player.name}`}
                data-badge={player.role === 'MAFIA' ? 'mafia' : 'villager'}
                className={`border rounded-lg p-3 transition-all ${
                  // Role-based border colors (transparency feature)
                  player.role === 'MAFIA'
                    ? 'border-red-300 bg-red-50'
                    : 'border-blue-300 bg-blue-50'
                }`}
                style={{
                  filter: player.isAlive ? 'none' : 'grayscale(100%)',
                  opacity: player.isAlive ? 1 : 0.6,
                }}
              >
                {/* Avatar + Player info */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Avatar circle */}
                  <div
                    className={`w-12 h-12 rounded-full ${avatarBgColor} ${avatarTextColor} flex items-center justify-center font-bold text-lg flex-shrink-0`}
                  >
                    {avatarInitial}
                  </div>

                  {/* Player name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-800 truncate">
                      {player.name}
                    </div>
                    {/* Personality */}
                    <div className="text-xs text-gray-600 capitalize truncate">
                      {player.personality}
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <div className="mt-2">
                  {player.isAlive ? (
                    <Badge variant="alive">Alive</Badge>
                  ) : (
                    <Badge variant="dead">
                      Eliminated (R{player.eliminatedInRound})
                    </Badge>
                  )}
                </div>

                {/* Role badge - NOW VISIBLE (Transparency Feature) */}
                <div className="mt-2" data-testid={`player-role-badge-${player.name}`}>
                  <Badge variant={player.role === 'MAFIA' ? 'mafia' : 'villager'}>
                    {player.role === 'MAFIA' ? '🔴 Mafia' : '🔵 Villager'}
                  </Badge>
                </div>
              </div>
            );
          })}
      </div>
    </Card>
  );
}
