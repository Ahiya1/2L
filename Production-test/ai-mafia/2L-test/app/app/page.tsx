/**
 * Lobby Screen
 *
 * Route: /
 *
 * Game creation interface with:
 * - Player count slider (8-12)
 * - "Create Game" button
 * - Game rules display
 * - Navigation to live game after creation
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { CreateGameResponse } from '@/lib/api/validation';

export default function LobbyPage() {
  const [playerCount, setPlayerCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateGame = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create game
      const createRes = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerCount }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.error || 'Failed to create game');
      }

      const { gameId }: CreateGameResponse = await createRes.json();

      // Start game
      const startRes = await fetch(`/api/game/${gameId}/start`, {
        method: 'POST',
      });

      if (!startRes.ok) {
        const errorData = await startRes.json();
        throw new Error(errorData.error || 'Failed to start game');
      }

      // Navigate to live game
      router.push(`/game/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const mafiaCount = calculateMafiaCount(playerCount);
  const villagerCount = playerCount - mafiaCount;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-2xl">
        <Card className="mb-6">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI Mafia
            </h1>
            <p className="text-gray-600">
              Watch AI agents play the classic social deduction game
            </p>
          </div>

          <div className="space-y-6">
            {/* Player Count Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Players: <span className="font-bold text-blue-600">{playerCount}</span>
              </label>
              <input
                type="range"
                min="8"
                max="12"
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>8 players</span>
                <span>12 players</span>
              </div>
            </div>

            {/* Role Distribution */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Role Distribution
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded p-3">
                  <div className="text-2xl font-bold text-purple-700">
                    {mafiaCount}
                  </div>
                  <div className="text-sm text-purple-600">Mafia</div>
                </div>
                <div className="bg-blue-50 rounded p-3">
                  <div className="text-2xl font-bold text-blue-700">
                    {villagerCount}
                  </div>
                  <div className="text-sm text-blue-600">Villagers</div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Create Game Button */}
            <Button
              onClick={handleCreateGame}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating Game...' : 'Create Game'}
            </Button>
          </div>
        </Card>

        {/* Game Rules */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            How to Play
          </h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong className="text-gray-900">Night Phase:</strong> Mafia members coordinate privately to choose a victim.
            </div>
            <div>
              <strong className="text-gray-900">Day Announcement:</strong> The victim is revealed and players react.
            </div>
            <div>
              <strong className="text-gray-900">Discussion:</strong> All players debate who might be Mafia.
            </div>
            <div>
              <strong className="text-gray-900">Voting:</strong> Players vote to eliminate one suspect.
            </div>
            <div>
              <strong className="text-gray-900">Win Conditions:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Villagers win if all Mafia are eliminated</li>
                <li>Mafia wins if they equal or outnumber Villagers</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function calculateMafiaCount(totalPlayers: number): number {
  if (totalPlayers <= 8) return 2;  // 25%
  if (totalPlayers === 9) return 3;  // 33%
  if (totalPlayers === 10) return 3; // 30%
  if (totalPlayers === 11) return 3; // 27%
  return 4; // 33% for 12 players
}
