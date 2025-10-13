/**
 * GET /api/game/[gameId]/results
 *
 * Returns complete game results including:
 * - Winner and final statistics
 * - All players with ROLES REVEALED
 * - Full transcript (discussion messages, votes, night messages)
 *
 * Only accessible after game is in GAME_OVER status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import type { GameResultsResponse } from '@/lib/api/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;

    // Fetch game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Enforce game over requirement
    if (game.status !== 'GAME_OVER') {
      return NextResponse.json(
        {
          error: 'Game not finished',
          message: 'Results are only available after the game ends',
        },
        { status: 403 }
      );
    }

    // Fetch all players with roles revealed
    const players = await prisma.player.findMany({
      where: { gameId },
      orderBy: { position: 'asc' },
    });

    // Fetch all discussion messages
    const discussionMessages = await prisma.discussionMessage.findMany({
      where: { gameId },
      include: {
        player: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ roundNumber: 'asc' }, { timestamp: 'asc' }],
    });

    // Fetch all votes
    const votes = await prisma.vote.findMany({
      where: { gameId },
      include: {
        voter: {
          select: {
            name: true,
          },
        },
        target: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ roundNumber: 'asc' }, { voteOrder: 'asc' }],
    });

    // Fetch night messages (for post-game analysis)
    const nightMessages = await prisma.nightMessage.findMany({
      where: { gameId },
      include: {
        player: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ roundNumber: 'asc' }, { timestamp: 'asc' }],
    });

    // Build response
    const response: GameResultsResponse = {
      game: {
        id: game.id,
        status: game.status,
        winner: game.winner || '',
        roundNumber: game.roundNumber,
        playerCount: game.playerCount,
        createdAt: game.createdAt.toISOString(),
      },
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        role: player.role, // ROLES REVEALED (game is over)
        personality: player.personality,
        isAlive: player.isAlive,
        position: player.position,
        eliminatedInRound: player.eliminatedInRound,
        eliminationType: player.eliminationType,
      })),
      messages: discussionMessages.map((msg) => ({
        id: msg.id,
        playerId: msg.playerId,
        playerName: msg.player.name,
        message: msg.message,
        timestamp: msg.timestamp.toISOString(),
        roundNumber: msg.roundNumber,
        turn: msg.turn,
      })),
      votes: votes.map((vote) => ({
        id: vote.id,
        voterId: vote.voterId,
        voterName: vote.voter.name,
        targetId: vote.targetId,
        targetName: vote.target.name,
        justification: vote.justification,
        voteOrder: vote.voteOrder,
        roundNumber: vote.roundNumber,
        timestamp: vote.timestamp.toISOString(),
      })),
      nightMessages: nightMessages.map((msg) => ({
        id: msg.id,
        playerId: msg.playerId,
        playerName: msg.player.name,
        message: msg.message,
        timestamp: msg.timestamp.toISOString(),
        roundNumber: msg.roundNumber,
        turn: msg.turn,
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[API ERROR] Get results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
