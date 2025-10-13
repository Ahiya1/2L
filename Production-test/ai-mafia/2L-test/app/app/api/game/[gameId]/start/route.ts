/**
 * POST /api/game/[gameId]/start
 *
 * Starts the game loop asynchronously.
 * Triggers the master orchestrator to run all phases.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { runGameLoop } from '@/lib/game/master-orchestrator';
import type { StartGameResponse } from '@/lib/api/validation';
import { logger } from '@/src/lib/logger';

// Import dependencies for game loop
import { generateAgentResponse } from '@/lib/claude/client';
import { buildAgentContextWrapper } from '@/src/lib/discussion/turn-executor';

// Simple cost tracking (can be enhanced later)
const costTracker = {
  costs: {} as Record<string, { total: number; calls: number }>,
  track(data: {
    gameId: string;
    phase: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }) {
    if (!this.costs[data.gameId]) {
      this.costs[data.gameId] = { total: 0, calls: 0 };
    }
    const gameCosts = this.costs[data.gameId];
    if (gameCosts) {
      gameCosts.total += data.cost;
      gameCosts.calls += 1;
    }
  },
  getSummary(gameId: string) {
    return this.costs[gameId] || { total: 0, calls: 0 };
  },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    console.log(`[API] Starting game: ${gameId}`);

    // Check if game exists
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Game already started' },
        { status: 400 }
      );
    }

    if (game.players.length === 0) {
      return NextResponse.json(
        { error: 'No players in game' },
        { status: 400 }
      );
    }

    // Update game status to NIGHT (first phase)
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'NIGHT',
        currentPhase: 'NIGHT',
        roundNumber: 1,
        phaseStartTime: new Date(),
      },
    });

    // Run game loop asynchronously (don't await)
    const dependencies = {
      prisma,
      generateResponse: generateAgentResponse,
      trackCost: costTracker.track.bind(costTracker),
      // Use wrapper function that converts (playerId, gameId) to (player, history)
      buildAgentContext: (playerId: string, gameId: string) =>
        buildAgentContextWrapper(playerId, gameId, prisma),
      getCostSummary: costTracker.getSummary.bind(costTracker),
    };

    // Validate dependencies at runtime to prevent signature mismatches
    if (typeof dependencies.buildAgentContext !== 'function') {
      throw new Error('buildAgentContext dependency must be a function');
    }

    // Test signature with first player to catch issues early
    const firstPlayer = game.players[0];
    if (firstPlayer) {
      try {
        await dependencies.buildAgentContext(firstPlayer.id, gameId);
        logger.info({ gameId }, 'Dependency validation passed');
      } catch (error: any) {
        logger.error(
          {
            gameId,
            error: error.message,
            stack: error.stack,
          },
          'Dependency validation failed'
        );

        return NextResponse.json(
          { error: `Invalid buildAgentContext signature: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Start game loop in background
    runGameLoop(gameId, dependencies)
      .then((result) => {
        console.log(
          `[API] Game ${gameId} completed: ${result.winner} won in ${result.finalRound} rounds`
        );
      })
      .catch((err) => {
        console.error(`[API] Game ${gameId} error:`, err);
      });

    const response: StartGameResponse = {
      success: true,
      gameId,
      message: 'Game started successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[API ERROR] Start game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
