/**
 * Night Phase Orchestrator - Iteration 2
 *
 * Implements private Mafia coordination phase:
 * - Only Mafia agents participate
 * - Messages saved to NightMessage table (never visible to Villagers)
 * - Consensus algorithm selects victim
 * - Fallback to random victim if no consensus
 * - 45 seconds duration (configurable)
 *
 * Pattern: Reuses 70-80% of Discussion orchestrator code
 */

import type { PrismaClient } from '@prisma/client';
import { gameEventEmitter } from '../events/emitter';
import { nightLogger } from '../logger';
import {
  createTurnSchedule,
  getNextPlayer,
  advanceToNextTurn,
  shouldContinue,
  getScheduleStats,
  sleep,
} from '../discussion/turn-scheduler';
import type { Player } from '../types/shared';
import type { NightPhaseResult, MasterOrchestratorDependencies } from './types';
import { NIGHT_PHASE_PROMPT } from '../prompts/night-prompts';

/**
 * Night phase configuration
 */
export interface NightPhaseConfig {
  durationMinutes?: number; // Default: 0.75 (45 seconds)
  totalRounds?: number; // Default: 3 (3 turns per Mafia agent)
  turnDelayMs?: number; // Default: 500ms
}

/**
 * Run complete night phase
 *
 * @param gameId Game ID
 * @param roundNumber Current round number
 * @param dependencies Injected dependencies
 * @param config Night phase configuration
 * @returns Night phase result with victim selection
 */
export async function runNightPhase(
  gameId: string,
  roundNumber: number,
  dependencies: MasterOrchestratorDependencies,
  config: NightPhaseConfig = {}
): Promise<NightPhaseResult> {
  const {
    durationMinutes = 0.75, // 45 seconds
    totalRounds = 3,
    turnDelayMs = 500,
  } = config;

  const { prisma } = dependencies;

  nightLogger.info(
    { gameId, roundNumber, durationMinutes, totalRounds },
    'Starting night phase'
  );

  const startTime = Date.now();

  try {
    // Fetch Mafia agents only
    const mafiaPlayers: Player[] = await prisma.player.findMany({
      where: { gameId, isAlive: true, role: 'MAFIA' },
      orderBy: { position: 'asc' },
    });

    if (mafiaPlayers.length === 0) {
      nightLogger.warn({ gameId, roundNumber }, 'No alive Mafia players found');
      return {
        victim: null,
        totalMessages: 0,
        consensusReached: false,
      };
    }

    nightLogger.info({ gameId, roundNumber, mafiaCount: mafiaPlayers.length }, 'Found alive Mafia players');

    // Emit night start event
    gameEventEmitter.emitGameEvent('night_start', {
      gameId,
      type: 'night_start',
      payload: {
        round: roundNumber,
        mafiaCount: mafiaPlayers.length,
      },
    });

    // Create turn schedule (reuse Discussion scheduler)
    let schedule = createTurnSchedule(mafiaPlayers, totalRounds, durationMinutes);

    let turnCount = 0;

    // Main coordination loop
    while (shouldContinue(schedule)) {
      const player = getNextPlayer(schedule);

      if (!player) {
        nightLogger.info({ gameId, roundNumber, turnCount }, 'Night phase time expired or no more players');
        break;
      }

      try {
        turnCount++;

        const stats = getScheduleStats(schedule, turnCount);
        nightLogger.debug(
          {
            gameId,
            roundNumber,
            turnCount,
            currentRound: stats.currentRound,
            totalRounds: stats.totalRounds,
            playerName: player.name,
            elapsedSeconds: Math.floor(stats.elapsedTime / 1000),
            totalSeconds: Math.floor((stats.elapsedTime + stats.remainingTime) / 1000),
          },
          'Executing night turn'
        );

        // Execute turn
        await executeNightTurn(
          player.id,
          gameId,
          roundNumber,
          turnCount,
          dependencies
        );

        // Small delay between turns
        if (turnDelayMs > 0) {
          await sleep(turnDelayMs);
        }
      } catch (error: unknown) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        nightLogger.error({ gameId, roundNumber, turnCount, error: errorMsg }, 'Night turn failed');
        // Continue to next turn (don't crash entire night phase)
      }

      // Advance to next turn
      schedule = advanceToNextTurn(schedule);
    }

    const duration = Date.now() - startTime;
    const durationSeconds = Math.floor(duration / 1000);

    nightLogger.info(
      { gameId, roundNumber, turnCount, durationSeconds },
      'Night phase complete'
    );

    // Detect consensus on nightkill target
    const victim = await selectVictim(gameId, roundNumber, prisma);

    const consensusReached = victim !== null;

    nightLogger.info(
      { gameId, roundNumber, victimId: victim?.id, victimName: victim?.name, consensusReached },
      'Victim selected'
    );

    // Emit night complete event
    gameEventEmitter.emitGameEvent('night_complete', {
      gameId,
      type: 'night_complete',
      payload: {
        round: roundNumber,
        totalMessages: turnCount,
        victim: victim?.id || null,
        consensusReached,
      },
    });

    return {
      victim: victim?.id || null,
      totalMessages: turnCount,
      consensusReached,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    nightLogger.error({ gameId, roundNumber, error: errorMsg }, 'Fatal error in night phase');

    return {
      victim: null,
      totalMessages: 0,
      consensusReached: false,
    };
  }
}

/**
 * Execute single night turn for a Mafia agent
 */
async function executeNightTurn(
  playerId: string,
  gameId: string,
  roundNumber: number,
  turn: number,
  dependencies: MasterOrchestratorDependencies
): Promise<void> {
  const { prisma, buildAgentContext, generateResponse, trackCost } = dependencies;

  const player = await prisma.player.findUnique({ where: { id: playerId } });

  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }

  // Build context (night messages + game history)
  const baseContext = await buildAgentContext(playerId, gameId);

  // Fetch night messages for this round
  const nightMessages = await prisma.nightMessage.findMany({
    where: { gameId, roundNumber },
    include: { player: true },
    orderBy: { timestamp: 'asc' },
  });

  // Override system prompt with night-specific prompt
  const context = {
    ...baseContext,
    systemPrompt: NIGHT_PHASE_PROMPT,
    nightMessages: nightMessages.map((msg: {
      player: { name: string };
      message: string;
    }) => ({
      playerName: msg.player.name,
      message: msg.message,
    })),
  };

  // Generate response with timeout
  const { text, usage } = await generateWithTimeout(
    () => generateResponse(context),
    10000 // 10 second timeout
  );

  // Save to NightMessage table (private, never visible to Villagers)
  await prisma.nightMessage.create({
    data: {
      gameId,
      playerId,
      roundNumber,
      message: text,
      turn,
      timestamp: new Date(),
    },
  });

  // Track cost
  trackCost({
    gameId,
    phase: 'NIGHT',
    playerId,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    cachedTokens: usage.cache_read_input_tokens || 0,
    cost: calculateCost(usage),
  });

  // DO NOT emit night_message event to SSE (keep private from spectators)
  nightLogger.debug({ gameId, playerId, playerName: player.name, message: text }, 'Night message generated');
}

/**
 * Select victim based on consensus algorithm
 *
 * Algorithm:
 * 1. Count mentions of each Villager in night messages
 * 2. If majority (>50%) of Mafia mention same player, select that player
 * 3. Otherwise, select random Villager
 */
export async function selectVictim(
  gameId: string,
  roundNumber: number,
  prisma: PrismaClient
): Promise<{ id: string; name: string } | null> {
  // Fetch night messages for this round
  const nightMessages = await prisma.nightMessage.findMany({
    where: { gameId, roundNumber },
    include: { player: true },
  });

  if (nightMessages.length === 0) {
    nightLogger.warn({ gameId, roundNumber }, 'No night messages found for consensus');
    // Select random villager
    return await selectRandomVillager(gameId, prisma);
  }

  // Fetch all alive Villagers
  const villagers = await prisma.player.findMany({
    where: { gameId, isAlive: true, role: 'VILLAGER' },
  });

  if (villagers.length === 0) {
    nightLogger.warn({ gameId, roundNumber }, 'No alive Villagers found');
    return null;
  }

  // Count mentions of each Villager
  const mentions = new Map<string, number>();

  for (const msg of nightMessages) {
    for (const villager of villagers) {
      // Check if message mentions this villager's name
      if (msg.message.includes(villager.name)) {
        mentions.set(villager.id, (mentions.get(villager.id) || 0) + 1);
      }
    }
  }

  // Find player mentioned by majority of Mafia
  const uniqueMafia = new Set(nightMessages.map((m: { playerId: string }) => m.playerId)).size;
  const threshold = Math.ceil(uniqueMafia / 2);

  nightLogger.debug({ gameId, roundNumber, threshold, uniqueMafia }, 'Calculating consensus threshold');

  for (const [playerId, count] of mentions.entries()) {
    if (count >= threshold) {
      const player = villagers.find((p) => p.id === playerId);
      if (player) {
        nightLogger.info(
          { gameId, roundNumber, playerId: player.id, playerName: player.name, mentions: count },
          'Consensus reached on victim'
        );
        return { id: player.id, name: player.name };
      }
    }
  }

  // No consensus: random Villager
  nightLogger.info({ gameId, roundNumber }, 'No consensus reached - selecting random victim');
  return await selectRandomVillager(gameId, prisma);
}

/**
 * Select random alive Villager
 */
async function selectRandomVillager(
  gameId: string,
  prisma: PrismaClient
): Promise<{ id: string; name: string } | null> {
  const villagers = await prisma.player.findMany({
    where: { gameId, isAlive: true, role: 'VILLAGER' },
  });

  if (villagers.length === 0) {
    return null;
  }

  const randomVillager = villagers[Math.floor(Math.random() * villagers.length)];

  if (!randomVillager) {
    return null;
  }

  nightLogger.debug({ playerId: randomVillager.id, playerName: randomVillager.name }, 'Random victim selected');
  return { id: randomVillager.id, name: randomVillager.name };
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
