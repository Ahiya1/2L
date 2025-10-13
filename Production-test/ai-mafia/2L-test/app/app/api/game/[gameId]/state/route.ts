/**
 * GET /api/game/[gameId]/state
 *
 * Returns current game state for spectators.
 * Includes game info, players (roles hidden), current phase, and timer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import type { GameStateResponse } from '@/lib/api/validation';
import { PHASE_DURATIONS } from '@/lib/game/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;

    // Fetch game with players
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Calculate phase end time
    let phaseEndTime: string | null = null;
    if (game.phaseStartTime && game.currentPhase) {
      const phaseDuration =
        PHASE_DURATIONS[game.currentPhase as keyof typeof PHASE_DURATIONS];
      if (phaseDuration && phaseDuration > 0) {
        const endTime = new Date(
          game.phaseStartTime.getTime() + phaseDuration
        );
        phaseEndTime = endTime.toISOString();
      }
    }

    // Build response (roles NOT included unless game over)
    const response: GameStateResponse = {
      game: {
        id: game.id,
        status: game.status,
        currentPhase: game.currentPhase,
        phaseStartTime: game.phaseStartTime?.toISOString() || null,
        roundNumber: game.roundNumber,
        winner: game.winner,
        playerCount: game.playerCount,
      },
      players: game.players.map((player) => ({
        id: player.id,
        name: player.name,
        role: player.role,
        personality: player.personality,
        isAlive: player.isAlive,
        position: player.position,
        eliminatedInRound: player.eliminatedInRound,
        eliminationType: player.eliminationType,
      })),
      phaseEndTime,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[API ERROR] Get game state:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
