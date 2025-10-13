/**
 * Day Announcement Phase Orchestrator - Iteration 2
 *
 * Reveals nightkill victim and collects brief reactions from alive agents.
 *
 * Responsibilities:
 * - Emit nightkill event with victim details
 * - Generate 1-2 sentence reactions from all alive agents
 * - Save reactions to DiscussionMessage (visible to all)
 * - Update victim's isAlive status
 *
 * Duration: ~10 seconds (brief reactions only)
 */

import type { PrismaClient } from '@prisma/client';
import { gameEventEmitter } from '../events/emitter';
import type { MasterOrchestratorDependencies, DayAnnouncementResult } from './types';
import { generateDayReactionPrompt } from '../prompts/night-prompts';
import { gameLogger } from '../logger';

/**
 * Day announcement phase configuration
 */
export interface DayAnnouncementConfig {
  durationSeconds?: number; // Default: 10 seconds
  turnDelayMs?: number; // Default: 500ms between reactions
}

/**
 * Run complete day announcement phase
 *
 * @param gameId Game ID
 * @param nightVictimId Player ID of night kill victim (or null if no kill)
 * @param roundNumber Current round number
 * @param dependencies Injected dependencies
 * @param config Day announcement configuration
 * @returns Day announcement result
 */
export async function runDayAnnouncement(
  gameId: string,
  nightVictimId: string | null,
  roundNumber: number,
  dependencies: MasterOrchestratorDependencies,
  config: DayAnnouncementConfig = {}
): Promise<DayAnnouncementResult> {
  const { turnDelayMs = 500 } = config;

  const { prisma } = dependencies;

  gameLogger.info({ gameId, roundNumber, nightVictimId }, 'Starting day announcement phase');

  try {
    let victimName: string | null = null;
    let victimRole: 'MAFIA' | 'VILLAGER' | null = null;

    // Emit nightkill event if there was a victim
    if (nightVictimId) {
      const victim = await prisma.player.findUnique({ where: { id: nightVictimId } });

      if (victim) {
        victimName = victim.name;
        victimRole = victim.role;

        // Emit nightkill event
        gameEventEmitter.emitGameEvent('nightkill', {
          gameId,
          type: 'nightkill',
          payload: {
            victimId: victim.id,
            victimName: victim.name,
            round: roundNumber,
          },
        });

        gameLogger.info(
          { gameId, roundNumber, victimId: victim.id, victimName: victim.name, victimRole: victim.role },
          'Night victim announced'
        );
      }
    } else {
      gameLogger.info({ gameId, roundNumber }, 'No night victim - Mafia did not reach consensus');
    }

    // Get alive players for reactions
    const alivePlayers = await prisma.player.findMany({
      where: { gameId, isAlive: true },
      orderBy: { position: 'asc' },
    });

    if (alivePlayers.length === 0) {
      gameLogger.warn({ gameId, roundNumber }, 'No alive players to react');
      return {
        victimId: nightVictimId,
        victimName,
        totalReactions: 0,
      };
    }

    gameLogger.info({ gameId, roundNumber, playerCount: alivePlayers.length }, 'Generating reactions from alive players');

    let reactionCount = 0;

    // Generate brief reactions from each alive player
    for (const player of alivePlayers) {
      try {
        const reaction = await generateReaction(
          player.id,
          gameId,
          victimName || 'Unknown',
          victimRole || 'VILLAGER',
          roundNumber,
          dependencies
        );

        reactionCount++;

        // Emit day_reaction event
        gameEventEmitter.emitGameEvent('day_reaction', {
          gameId,
          type: 'day_reaction',
          payload: {
            playerId: player.id,
            playerName: player.name,
            message: reaction,
            round: roundNumber,
          },
        });

        // Small delay between reactions
        if (turnDelayMs > 0) {
          await sleep(turnDelayMs);
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        gameLogger.error(
          { gameId, roundNumber, playerId: player.id, playerName: player.name, error: errorMsg },
          'Failed to generate reaction'
        );
        // Continue to next player
      }
    }

    gameLogger.info({ gameId, roundNumber, reactionCount }, 'Day announcement phase complete');

    return {
      victimId: nightVictimId,
      victimName,
      totalReactions: reactionCount,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    gameLogger.error({ gameId, roundNumber, error: errorMsg }, 'Fatal error in day announcement phase');

    return {
      victimId: nightVictimId,
      victimName: null,
      totalReactions: 0,
    };
  }
}

/**
 * Generate brief reaction from a player
 */
async function generateReaction(
  playerId: string,
  gameId: string,
  victimName: string,
  victimRole: 'MAFIA' | 'VILLAGER',
  roundNumber: number,
  dependencies: MasterOrchestratorDependencies
): Promise<string> {
  const { prisma, buildAgentContext, generateResponse, trackCost } = dependencies;

  const player = await prisma.player.findUnique({ where: { id: playerId } });

  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }

  // Build context
  const baseContext = await buildAgentContext(playerId, gameId);

  // Generate day reaction prompt
  const dayPrompt = generateDayReactionPrompt(victimName, victimRole);

  // Override system prompt with day-specific prompt
  const context = {
    ...baseContext,
    systemPrompt: baseContext.systemPrompt + '\n\n' + dayPrompt,
  };

  // Generate response with timeout (shorter for reactions)
  const { text, usage } = await generateWithTimeout(
    () => generateResponse(context),
    8000 // 8 second timeout (shorter for brief reactions)
  );

  // Get current turn count for this round
  const existingMessages = await prisma.discussionMessage.findMany({
    where: { gameId, roundNumber },
  });
  const turnNumber = existingMessages.length + 1;

  // Save to DiscussionMessage (public, visible to all)
  await prisma.discussionMessage.create({
    data: {
      gameId,
      playerId,
      roundNumber,
      message: text,
      turn: turnNumber,
      timestamp: new Date(),
    },
  });

  // Track cost
  trackCost({
    gameId,
    phase: 'DAY_ANNOUNCEMENT',
    playerId,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    cachedTokens: usage.cache_read_input_tokens || 0,
    cost: calculateCost(usage),
  });

  gameLogger.debug({ gameId, playerId, playerName: player.name, reaction: text }, 'Generated day reaction');

  return text;
}

/**
 * Generate response with timeout
 */
function generateWithTimeout(
  fn: () => Promise<{
    text: string;
    usage: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
    };
  }>,
  timeout: number
): Promise<{
  text: string;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
  };
}> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    ),
  ]);
}

/**
 * Calculate cost from usage
 */
function calculateCost(usage: {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
}): number {
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cachedTokens = usage.cache_read_input_tokens || 0;

  // Claude 4.5 Sonnet pricing
  const inputCost = inputTokens * 0.000003; // $3 per 1M tokens
  const outputCost = outputTokens * 0.000015; // $15 per 1M tokens
  const cacheCost = cachedTokens * 0.0000003; // $0.30 per 1M tokens (90% discount)

  return inputCost + outputCost + cacheCost;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
