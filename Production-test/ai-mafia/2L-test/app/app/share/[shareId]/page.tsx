/**
 * Shareable Game View
 *
 * Route: /share/[shareId]
 *
 * Public, standalone page displaying a completed game transcript.
 * Accessible without authentication.
 * Includes Open Graph meta tags for social sharing.
 *
 * Features:
 * - Winner announcement
 * - All player roles revealed
 * - Full transcript (night messages, discussion, votes)
 * - Standalone view (no navigation to lobby)
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface SharePageProps {
  params: {
    shareId: string;
  };
}

/**
 * Generate Open Graph metadata for social sharing
 */
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { shareId } = params;

  try {
    const sharedGame = await prisma.sharedGame.findUnique({
      where: { id: shareId },
      include: {
        game: {
          include: {
            players: {
              select: { id: true, name: true, role: true, isAlive: true },
            },
          },
        },
      },
    });

    if (!sharedGame) {
      return {
        title: 'Game Not Found - AI Mafia',
      };
    }

    const { game } = sharedGame;
    const winner = game.winner === 'MAFIA' ? 'Mafia' : 'Villagers';
    const playerCount = game.players.length;

    return {
      title: `AI Mafia Game - ${winner} Won!`,
      description: `Watch AI agents play Mafia. ${playerCount} players, ${game.roundNumber} rounds. ${winner} emerged victorious!`,
      openGraph: {
        title: `AI Mafia Game - ${winner} Won!`,
        description: `Watch AI agents play Mafia. ${playerCount} players, ${game.roundNumber} rounds.`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `AI Mafia Game - ${winner} Won!`,
        description: `${playerCount} AI agents, ${game.roundNumber} rounds of deception and deduction.`,
      },
    };
  } catch (error) {
    return {
      title: 'AI Mafia Game',
    };
  }
}

/**
 * Shareable Game Page Component
 */
export default async function ShareGamePage({ params }: SharePageProps) {
  const { shareId } = params;

  // Fetch shared game data
  const sharedGame = await prisma.sharedGame.findUnique({
    where: { id: shareId },
    include: {
      game: {
        include: {
          players: {
            orderBy: { position: 'asc' },
          },
          discussionMessages: {
            orderBy: { timestamp: 'asc' },
            include: {
              player: {
                select: { id: true, name: true, role: true },
              },
            },
          },
          nightMessages: {
            orderBy: { timestamp: 'asc' },
            include: {
              player: {
                select: { id: true, name: true, role: true },
              },
            },
          },
          votes: {
            orderBy: { timestamp: 'asc' },
            include: {
              voter: {
                select: { id: true, name: true, role: true },
              },
              target: {
                select: { id: true, name: true, role: true },
              },
            },
          },
        },
      },
    },
  });

  if (!sharedGame) {
    notFound();
  }

  const { game } = sharedGame;
  const mafiaPlayers = game.players.filter((p) => p.role === 'MAFIA');
  const villagerPlayers = game.players.filter((p) => p.role === 'VILLAGER');

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-800">AI Mafia Game</h1>
          <p className="text-gray-600 mt-2">Watch AI agents play social deduction</p>
        </div>

        {/* Winner Banner */}
        <Card className="text-center py-8">
          <h2 className="text-4xl font-bold mb-4">
            {game.winner === 'MAFIA' ? (
              <span className="text-purple-600">Mafia Wins!</span>
            ) : (
              <span className="text-blue-600">Villagers Win!</span>
            )}
          </h2>
          <p className="text-gray-600">
            Game completed after {game.roundNumber} rounds
          </p>
        </Card>

        {/* Player Roles Revealed */}
        <Card>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Player Roles Revealed</h2>

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
                      <div className="font-medium text-gray-900">{player.name}</div>
                      <div className="text-sm text-gray-600">{player.personality}</div>
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
                      <div className="font-medium text-gray-900">{player.name}</div>
                      <div className="text-sm text-gray-600">{player.personality}</div>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Full Transcript</h2>

          <div className="space-y-6">
            {/* Group by round */}
            {Array.from({ length: game.roundNumber }).map((_, roundIdx) => {
              const round = roundIdx + 1;
              const roundMessages = game.discussionMessages.filter(
                (m) => m.roundNumber === round
              );
              const roundVotes = game.votes.filter((v) => v.roundNumber === round);
              const roundNightMessages = game.nightMessages.filter(
                (m) => m.roundNumber === round
              );

              return (
                <div key={round} className="border-l-4 border-gray-300 pl-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Round {round}</h3>

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
                              {msg.player.name}:
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
                              {msg.player.name}:
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
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Voting Phase</h4>
                      <div className="space-y-2 bg-red-50 p-3 rounded">
                        {roundVotes.map((vote) => (
                          <div key={vote.id} className="text-sm">
                            <span className="font-medium text-gray-900">
                              {vote.voter.name}
                            </span>{' '}
                            voted for{' '}
                            <span className="font-medium text-red-600">
                              {vote.target.name}
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

        {/* Footer */}
        <div className="text-center pb-8 text-gray-600">
          <p className="text-sm">
            Want to play? Create your own AI Mafia game at{' '}
            <a
              href={process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
              className="text-blue-600 hover:underline"
            >
              AI Mafia
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
