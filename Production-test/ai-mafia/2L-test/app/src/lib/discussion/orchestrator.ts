/**
 * Discussion phase orchestrator
 *
 * Main entry point for running discussion phase:
 * - Creates turn schedule (3-5 rounds)
 * - Executes turns sequentially with round-robin
 * - Stops after duration expires (3-5 minutes)
 * - Emits events for SSE streaming
 * - Calculates discussion statistics
 *
 * Usage:
 *   const result = await runDiscussion(gameId, {
 *     prisma,
 *     buildContext,
 *     generateResponse,
 *     trackCost
 *   });
 *
 * Features:
 * - Sequential turn execution (no parallelization)
 * - Graceful error handling (continue on failure)
 * - Real-time event emission
 * - Cost tracking and statistics
 */

import type { PrismaClient } from '@prisma/client';
import { gameEventEmitter } from '../events/emitter';
import { executeTurn } from './turn-executor';
import {
  createTurnSchedule,
  getNextPlayer,
  advanceToNextTurn,
  shouldContinue,
  getScheduleStats,
  sleep,
} from './turn-scheduler';
import type { DiscussionConfig, DiscussionResult, Player } from '../types/shared';
import { orchestratorLogger } from '../logger';

/**
 * Run complete discussion phase
 *
 * @param gameId Game ID
 * @param dependencies Injected dependencies from other builders
 * @param config Discussion configuration
 * @returns Discussion result with statistics
 */
export async function runDiscussion(
  gameId: string,
  dependencies: {
    prisma: PrismaClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildContext: (playerId: string, gameId: string) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generateResponse: (context: any) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trackCost: (data: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getCostSummary?: (gameId: string) => any;
  },
  config: DiscussionConfig = {}
): Promise<DiscussionResult> {
  const {
    durationMinutes = 3,
    totalRounds = 5,
    turnDelayMs = 500,
  } = config;

  const { prisma, getCostSummary } = dependencies;

  orchestratorLogger.info({ gameId, durationMinutes, totalRounds }, 'Starting discussion phase');

  const errors: string[] = [];
  let totalMessages = 0;
  const startTime = Date.now();

  try {
    // Fetch alive players
    const alivePlayers: Player[] = await prisma.player.findMany({
      where: { gameId, isAlive: true },
      orderBy: { position: 'asc' },
    });

    if (alivePlayers.length === 0) {
      throw new Error('No alive players found');
    }

    orchestratorLogger.info({ gameId, aliveCount: alivePlayers.length }, 'Found alive players');

    // Emit phase change event
    gameEventEmitter.emitGameEvent('phase_change', {
      gameId,
      type: 'phase_change',
      payload: {
        from: 'SETUP',
        to: 'DISCUSSION',
      },
    });

    // Create turn schedule
    let schedule = createTurnSchedule(alivePlayers, totalRounds, durationMinutes);

    let turnCount = 0;

    // Main orchestration loop
    while (shouldContinue(schedule)) {
      const player = getNextPlayer(schedule);

      if (!player) {
        orchestratorLogger.info({ gameId }, 'No more players or time expired');
        break;
      }

      try {
        turnCount++;

        const stats = getScheduleStats(schedule, turnCount);
        orchestratorLogger.info(
          {
            gameId,
            turn: turnCount,
            round: stats.currentRound,
            totalRounds: stats.totalRounds,
            playerName: player.name,
            playerId: player.id,
            elapsedSeconds: Math.floor(stats.elapsedTime / 1000),
            progress: stats.progress,
          },
          'Executing turn'
        );

        // Execute turn
        const result = await executeTurn(
          player.id,
          gameId,
          schedule.currentRound + 1,
          turnCount,
          dependencies
        );

        if (result.success) {
          totalMessages++;

          if (result.timedOut) {
            orchestratorLogger.warn({ gameId, playerId: player.id, playerName: player.name, turn: turnCount }, 'Turn timed out, used fallback');
          }

          if (result.usedFallback) {
            orchestratorLogger.warn({ gameId, playerId: player.id, playerName: player.name, turn: turnCount }, 'Turn failed, used fallback');
          }
        } else {
          const error = `Turn ${turnCount} failed for ${player.name}: ${result.error}`;
          orchestratorLogger.error({ gameId, playerId: player.id, playerName: player.name, turn: turnCount, error: result.error }, 'Turn failed');
          errors.push(error);
        }

        // Small delay between turns for readability
        if (turnDelayMs > 0) {
          await sleep(turnDelayMs);
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        const errorMsg = `Turn ${turnCount} exception for ${player.name}: ${error.message}`;
        orchestratorLogger.error({ gameId, playerId: player.id, playerName: player.name, turn: turnCount, error: error.message, stack: error.stack }, 'Turn exception');
        errors.push(errorMsg);

        // Continue to next turn (don't crash entire discussion)
      }

      // Advance to next turn
      schedule = advanceToNextTurn(schedule);
    }

    const duration = Date.now() - startTime;
    const durationSeconds = Math.floor(duration / 1000);

    orchestratorLogger.info(
      {
        gameId,
        totalMessages,
        durationSeconds,
        completedRounds: schedule.currentRound,
        errorCount: errors.length,
      },
      'Discussion complete'
    );

    // Get cost summary if available
    let totalCost = 0;
    let cacheHitRate = 0;

    if (getCostSummary) {
      try {
        const costSummary = getCostSummary(gameId);
        totalCost = costSummary.totalCost || 0;
        cacheHitRate = costSummary.cacheHitRate || 0;

        orchestratorLogger.info({ gameId, totalCost, cacheHitRate }, 'Cost summary');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        orchestratorLogger.warn({ gameId, error: error.message }, 'Could not get cost summary');
      }
    }

    // Emit discussion complete event
    gameEventEmitter.emitGameEvent('discussion_complete', {
      gameId,
      type: 'discussion_complete',
      payload: {
        totalMessages,
        duration: durationSeconds,
        totalCost,
      },
    });

    // Emit phase complete event
    gameEventEmitter.emitGameEvent('phase_complete', {
      gameId,
      type: 'phase_complete',
      payload: {
        phase: 'DISCUSSION',
        duration: durationSeconds,
        stats: {
          totalMessages,
          completedRounds: schedule.currentRound,
          totalCost,
          cacheHitRate,
        },
      },
    });

    return {
      gameId,
      totalMessages,
      duration: durationSeconds,
      totalCost,
      cacheHitRate,
      completedRounds: schedule.currentRound,
      timedOut: !shouldContinue(schedule),
      errors,
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const durationSeconds = Math.floor(duration / 1000);

    orchestratorLogger.error({ gameId, error: error.message, stack: error.stack }, 'Fatal error');
    errors.push(`Fatal error: ${error.message}`);

    return {
      gameId,
      totalMessages,
      duration: durationSeconds,
      totalCost: 0,
      cacheHitRate: 0,
      completedRounds: 0,
      timedOut: false,
      errors,
    };
  }
}

/**
 * Quick test function for development
 * Tests orchestrator with mock dependencies
 */
export async function testOrchestrator(): Promise<void> {
  orchestratorLogger.info('Testing orchestrator with mock dependencies...');

  // Mock dependencies
  const mockPrisma = {
    player: {
      findMany: async () => [
        { id: '1', name: 'Agent-A', role: 'VILLAGER', isAlive: true, personality: 'analytical' },
        { id: '2', name: 'Agent-B', role: 'MAFIA', isAlive: true, personality: 'aggressive' },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findUniqueOrThrow: async ({ where }: any) => ({
        id: where.id,
        name: `Agent-${where.id}`,
        role: 'VILLAGER',
        isAlive: true,
        personality: 'analytical',
      }),
    },
    discussionMessage: {
      findMany: async () => [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async ({ data }: any) => ({
        id: Math.random().toString(),
        ...data,
        player: { name: 'Agent-A' },
      }),
    },
  };

  const mockBuildContext = async () => ({
    player: { name: 'Agent-A' },
    systemPrompt: 'You are an agent',
    gameStateContext: 'Game state',
    conversationContext: [],
  });

  const mockGenerateResponse = async () => ({
    text: 'I think we should analyze the voting patterns carefully.',
    usage: { inputTokens: 100, cachedTokens: 50, outputTokens: 20, cost: 0.01 },
  });

  const mockTrackCost = () => {};

  const mockGetCostSummary = () => ({
    totalCost: 0.5,
    cacheHitRate: 0.7,
  });

  try {
    const result = await runDiscussion(
      'test-game-123',
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prisma: mockPrisma as any,
        buildContext: mockBuildContext,
        generateResponse: mockGenerateResponse,
        trackCost: mockTrackCost,
        getCostSummary: mockGetCostSummary,
      },
      {
        durationMinutes: 0.05, // 3 seconds
        totalRounds: 2,
        turnDelayMs: 100,
      }
    );

    orchestratorLogger.info({ result }, 'Test result');
    orchestratorLogger.info('✓ Orchestrator test passed!');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    orchestratorLogger.error({ error: error.message }, '✗ Orchestrator test failed');
    throw error;
  }
}
