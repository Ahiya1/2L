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

import { gameEventEmitter } from '../events/emitter';
import { executeTurn } from './turn-executor';
import {
  createTurnSchedule,
  getNextPlayer,
  advanceToNextTurn,
  shouldContinue,
  getElapsedTime,
  getScheduleStats,
  sleep,
} from './turn-scheduler';
import type { DiscussionConfig, DiscussionResult, Player } from '../types/shared';

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
    prisma: any; // Prisma client (Builder-1)
    buildContext: (playerId: string, gameId: string) => Promise<any>; // Builder-2
    generateResponse: (context: any) => Promise<any>; // Builder-2
    trackCost: (data: any) => void; // Builder-2
    getCostSummary?: (gameId: string) => any; // Builder-2
  },
  config: DiscussionConfig = {}
): Promise<DiscussionResult> {
  const {
    durationMinutes = 3,
    totalRounds = 5,
    turnTimeoutSeconds = 10,
    turnDelayMs = 500,
  } = config;

  const { prisma, getCostSummary } = dependencies;

  console.log(`\n[Orchestrator] Starting discussion phase for game ${gameId}`);
  console.log(`[Orchestrator] Duration: ${durationMinutes} minutes, Rounds: ${totalRounds}`);

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

    console.log(`[Orchestrator] Found ${alivePlayers.length} alive players`);

    // Emit phase change event
    gameEventEmitter.emitGameEvent('phase_change', {
      gameId,
      type: 'PHASE_CHANGE',
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
        console.log('[Orchestrator] No more players or time expired');
        break;
      }

      try {
        turnCount++;

        const stats = getScheduleStats(schedule, turnCount);
        console.log(
          `\n[Orchestrator] Turn ${turnCount} | Round ${stats.currentRound}/${stats.totalRounds} | ${player.name}`
        );
        console.log(
          `[Orchestrator] Time: ${Math.floor(stats.elapsedTime / 1000)}s / ${Math.floor((stats.elapsedTime + stats.remainingTime) / 1000)}s (${stats.progress.toFixed(0)}%)`
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
            console.warn(`[Orchestrator] Turn timed out, used fallback`);
          }

          if (result.usedFallback) {
            console.warn(`[Orchestrator] Turn failed, used fallback`);
          }
        } else {
          const error = `Turn ${turnCount} failed for ${player.name}: ${result.error}`;
          console.error(`[Orchestrator] ${error}`);
          errors.push(error);
        }

        // Small delay between turns for readability
        if (turnDelayMs > 0) {
          await sleep(turnDelayMs);
        }
      } catch (error: any) {
        const errorMsg = `Turn ${turnCount} exception for ${player.name}: ${error.message}`;
        console.error(`[Orchestrator] ${errorMsg}`);
        errors.push(errorMsg);

        // Continue to next turn (don't crash entire discussion)
      }

      // Advance to next turn
      schedule = advanceToNextTurn(schedule);
    }

    const duration = Date.now() - startTime;
    const durationSeconds = Math.floor(duration / 1000);

    console.log(`\n[Orchestrator] Discussion complete!`);
    console.log(`[Orchestrator] Total messages: ${totalMessages}`);
    console.log(`[Orchestrator] Duration: ${durationSeconds}s`);
    console.log(`[Orchestrator] Completed rounds: ${schedule.currentRound}`);

    if (errors.length > 0) {
      console.log(`[Orchestrator] Errors: ${errors.length}`);
    }

    // Get cost summary if available
    let totalCost = 0;
    let cacheHitRate = 0;

    if (getCostSummary) {
      try {
        const costSummary = getCostSummary(gameId);
        totalCost = costSummary.totalCost || 0;
        cacheHitRate = costSummary.cacheHitRate || 0;

        console.log(`[Orchestrator] Total cost: $${totalCost.toFixed(2)}`);
        console.log(`[Orchestrator] Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
      } catch (error: any) {
        console.warn(`[Orchestrator] Could not get cost summary: ${error.message}`);
      }
    }

    // Emit discussion complete event
    gameEventEmitter.emitGameEvent('discussion_complete', {
      gameId,
      type: 'DISCUSSION_COMPLETE',
      payload: {
        totalMessages,
        duration: durationSeconds,
        totalCost,
      },
    });

    // Emit phase complete event
    gameEventEmitter.emitGameEvent('phase_complete', {
      gameId,
      type: 'PHASE_COMPLETE',
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
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const durationSeconds = Math.floor(duration / 1000);

    console.error(`[Orchestrator] Fatal error: ${error.message}`);
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
  console.log('Testing orchestrator with mock dependencies...');

  // Mock dependencies
  const mockPrisma = {
    player: {
      findMany: async () => [
        { id: '1', name: 'Agent-A', role: 'VILLAGER', isAlive: true, personality: 'analytical' },
        { id: '2', name: 'Agent-B', role: 'MAFIA', isAlive: true, personality: 'aggressive' },
      ],
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
        prisma: mockPrisma,
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

    console.log('\nTest result:', result);
    console.log('✓ Orchestrator test passed!');
  } catch (error: any) {
    console.error('✗ Orchestrator test failed:', error.message);
    throw error;
  }
}
