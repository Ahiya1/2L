/**
 * Game Over Screen
 *
 * Route: /game/[gameId]/results
 *
 * Displays final game results:
 * - Winner announcement
 * - All player roles revealed
 * - Full game transcript (messages + votes)
 * - "New Game" button to return to lobby
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { GameResultsResponse } from '@/lib/api/validation';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const [results, setResults] = useState<GameResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/game/${gameId}/results`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch results');
        }

        const data: GameResultsResponse = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [gameId]);

  const handleShare = async () => {
    setShareLoading(true);
    setShareError(null);

    try {
      const response = await fetch(`/api/game/${gameId}/share`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate share link');
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading results...</div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error || 'Results not available'}</p>
          <Button onClick={() => router.push('/')}>
            Return to Lobby
          </Button>
        </Card>
      </div>
    );
  }

  const mafiaPlayers = results.players.filter(p => p.role === 'MAFIA');
  const villagerPlayers = results.players.filter(p => p.role === 'VILLAGER');

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Winner Banner */}
        <Card className="text-center py-8">
          <h1 className="text-4xl font-bold mb-4">
            {results.game.winner === 'MAFIA' ? (
              <span className="text-purple-600">Mafia Wins!</span>
            ) : (
              <span className="text-blue-600">Villagers Win!</span>
            )}
          </h1>
          <p className="text-gray-600">
            Game completed after {results.game.roundNumber} rounds
          </p>
        </Card>

        {/* Player Roles Revealed */}
        <Card>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Player Roles Revealed
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mafia */}
            <div>
              <h3 className="text-lg font-semibold text-purple-700 mb-3">
                Mafia ({mafiaPlayers.length})
              </h3>
              <div className="space-y-2">
                {mafiaPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between bg-purple-50 p-3 rounded"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {player.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {player.personality}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="mafia">Mafia</Badge>
                      {player.isAlive ? (
                        <Badge variant="alive">Alive</Badge>
                      ) : (
                        <Badge variant="dead">
                          {player.eliminationType === 'NIGHTKILL' ? 'Killed' : 'Voted Out'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Villagers */}
            <div>
              <h3 className="text-lg font-semibold text-blue-700 mb-3">
                Villagers ({villagerPlayers.length})
              </h3>
              <div className="space-y-2">
                {villagerPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between bg-blue-50 p-3 rounded"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {player.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {player.personality}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="villager">Villager</Badge>
                      {player.isAlive ? (
                        <Badge variant="alive">Alive</Badge>
                      ) : (
                        <Badge variant="dead">
                          {player.eliminationType === 'NIGHTKILL' ? 'Killed' : 'Voted Out'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Full Transcript */}
        <Card>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Full Transcript
          </h2>

          <div className="space-y-6">
            {/* Group by round */}
            {Array.from({ length: results.game.roundNumber }).map((_, roundIdx) => {
              const round = roundIdx + 1;
              const roundMessages = results.messages.filter(
                (m) => m.roundNumber === round
              );
              const roundVotes = results.votes.filter(
                (v) => v.roundNumber === round
              );
              const roundNightMessages = results.nightMessages.filter(
                (m) => m.roundNumber === round
              );

              return (
                <div key={round} className="border-l-4 border-gray-300 pl-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Round {round}
                  </h3>

                  {/* Night Messages (Mafia only) */}
                  {roundNightMessages.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-purple-600 mb-2">
                        Night Phase (Mafia Coordination)
                      </h4>
                      <div className="space-y-2 bg-purple-50 p-3 rounded">
                        {roundNightMessages.map((msg) => (
                          <div key={msg.id} className="text-sm">
                            <span className="font-medium text-purple-700">
                              {msg.playerName}:
                            </span>{' '}
                            <span className="text-gray-700">{msg.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discussion Messages */}
                  {roundMessages.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">
                        Discussion Phase
                      </h4>
                      <div className="space-y-2 bg-gray-50 p-3 rounded">
                        {roundMessages.map((msg) => (
                          <div key={msg.id} className="text-sm">
                            <span className="font-medium text-gray-900">
                              {msg.playerName}:
                            </span>{' '}
                            <span className="text-gray-700">{msg.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Votes */}
                  {roundVotes.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">
                        Voting Phase
                      </h4>
                      <div className="space-y-2 bg-red-50 p-3 rounded">
                        {roundVotes.map((vote) => (
                          <div key={vote.id} className="text-sm">
                            <span className="font-medium text-gray-900">
                              {vote.voterName}
                            </span>{' '}
                            voted for{' '}
                            <span className="font-medium text-red-600">
                              {vote.targetName}
                            </span>
                            <div className="text-xs text-gray-600 mt-1">
                              {vote.justification}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Share Game Section */}
        <Card>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Share This Game</h2>

          {!shareUrl ? (
            <div>
              <p className="text-gray-600 mb-4">
                Generate a shareable link to show this game to others. The link will display
                the full transcript with all roles revealed.
              </p>
              <Button
                onClick={handleShare}
                disabled={shareLoading}
                className="w-full sm:w-auto"
              >
                {shareLoading ? 'Generating Link...' : 'Generate Share Link'}
              </Button>
              {shareError && (
                <p className="text-red-600 text-sm mt-2">{shareError}</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-3">
                Share this link with anyone to let them view this game:
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700 font-mono text-sm"
                />
                <Button onClick={handleCopyToClipboard} className="whitespace-nowrap">
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm mt-2 inline-block"
              >
                Open shared view
              </a>
            </div>
          )}
        </Card>

        {/* New Game Button */}
        <div className="flex justify-center pb-8">
          <Button onClick={() => router.push('/')} className="px-8">
            New Game
          </Button>
        </div>
      </div>
    </div>
  );
}
