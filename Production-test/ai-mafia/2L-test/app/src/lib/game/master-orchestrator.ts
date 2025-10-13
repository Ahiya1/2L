/**
 * Master Game Orchestrator - Iteration 2
 *
 * Coordinates all game phases from LOBBY to GAME_OVER:
 * NIGHT → DAY_ANNOUNCEMENT → DISCUSSION → VOTING → WIN_CHECK (repeat until win)
 *
 * Responsibilities:
 * - Phase sequencing and transitions
 * - Win condition checking after eliminations
 * - Database state management
 * - Event emission for SSE
 * - Error handling and recovery
 */

import type { PrismaClient } from '@prisma/client';
import { gameEventEmitter } from '../events/emitter';
import { runDiscussion } from '../discussion/orchestrator';
import { orchestratorLogger } from '../logger';
import { runNightPhase } from './night-phase';
import { runDayAnnouncement } from './day-announcement';
import { runVotingPhase } from './voting-phase';
import { checkWinCondition as checkWinConditionReal } from './win-conditions';
import {
  type GamePhase,
  type GameResult,
  type WinConditionResult,
  type MasterOrchestratorDependencies,
  PHASE_DURATIONS_MINUTES,
  MAX_ROUNDS,
} from './types';

/**
 * Run complete game loop from start to finish
 *
 * @param gameId Game ID
 * @param dependencies Injected dependencies
 * @returns Game result with winner and statistics
 */
export async function runGameLoop(
  gameId: string,
  dependencies: MasterOrchestratorDependencies
): Promise<GameResult> {
  let currentPhase: GamePhase = 'NIGHT';
  let roundNumber = 1;
  const startTime = Date.now();

  const { prisma } = dependencies;

  orchestratorLogger.info({ gameId, maxRounds: MAX_ROUNDS }, 'Starting game loop');

  try {
    while (roundNumber <= MAX_ROUNDS) {
      orchestratorLogger.info({ gameId, roundNumber }, '========== ROUND START ==========');

      // Emit round start event
      const alivePlayers = await prisma.player.findMany({
        where: { gameId, isAlive: true },
      });
      const mafiaCount = alivePlayers.filter((p: { role: string }) => p.role === 'MAFIA').length;
      const villagerCount = alivePlayers.filter(
        (p: { role: string }) => p.role === 'VILLAGER'
      ).length;

      gameEventEmitter.emitGameEvent('round_start', {
        gameId,
        type: 'round_start',
        payload: {
          round: roundNumber,
          mafiaAlive: mafiaCount,
          villagersAlive: villagerCount,
        },
      });

      // Update database with current phase
      await updateGamePhase(gameId, currentPhase, roundNumber, prisma);

      // Execute phase logic
      switch (currentPhase) {
        case 'NIGHT': {
          orchestratorLogger.info({ gameId, roundNumber, phase: 'NIGHT' }, 'Starting NIGHT phase');

          // Use real Night orchestrator (Builder-2)
          const nightResult = await runNightPhase(gameId, roundNumber, dependencies);

          // Store nightVictim in game for Day announcement
          if (nightResult.victim) {
            await prisma.game.update({
              where: { id: gameId },
              data: { nightVictim: nightResult.victim },
            });

            await markPlayerDead(
              gameId,
              nightResult.victim,
              'NIGHTKILL',
              roundNumber,
              prisma
            );
          }

          currentPhase = 'DAY_ANNOUNCEMENT';
          break;
        }

        case 'DAY_ANNOUNCEMENT': {
          orchestratorLogger.info({
            gameId,
            roundNumber,
            phase: 'DAY_ANNOUNCEMENT'
          }, 'Starting DAY_ANNOUNCEMENT phase');

          // Get nightVictim from game
          const game = await prisma.game.findUnique({ where: { id: gameId } });
          const nightVictimId = game?.nightVictim || null;

          // Use real Day Announcement orchestrator (Builder-2)
          await runDayAnnouncement(gameId, nightVictimId, roundNumber, dependencies);

          // Clear nightVictim after announcement
          await prisma.game.update({
            where: { id: gameId },
            data: { nightVictim: null },
          });

          // Check win condition after nightkill
          const winCheck1 = await checkWinConditionReal(gameId, prisma);
          if (winCheck1.hasWinner) {
            await finalizeGame(gameId, winCheck1.winner!, winCheck1.reason, prisma);
            const duration = Math.floor((Date.now() - startTime) / 1000);
            return {
              winner: winCheck1.winner!,
              finalRound: roundNumber,
              reason: winCheck1.reason,
              totalDuration: duration,
            };
          }

          currentPhase = 'DISCUSSION';
          break;
        }

        case 'DISCUSSION': {
          orchestratorLogger.info({
            gameId,
            roundNumber,
            phase: 'DISCUSSION'
          }, 'Starting DISCUSSION phase');

          // Use real Discussion orchestrator from Iteration 1
          // Cast dependencies to match Discussion orchestrator interface
          await runDiscussion(
            gameId,
            {
              ...dependencies,
              buildContext: dependencies.buildAgentContext,
            },
            {
              durationMinutes: PHASE_DURATIONS_MINUTES.DISCUSSION,
              totalRounds: 5,
            }
          );

          currentPhase = 'VOTING';
          break;
        }

        case 'VOTING': {
          orchestratorLogger.info({
            gameId,
            roundNumber,
            phase: 'VOTING'
          }, 'Starting VOTING phase');

          // Use real Voting orchestrator (Builder-3)
          const votingResult = await runVotingPhase(gameId, roundNumber, dependencies);

          if (votingResult.eliminatedPlayer) {
            await markPlayerDead(
              gameId,
              votingResult.eliminatedPlayer,
              'DAYKILL',
              roundNumber,
              prisma
            );
          }

          currentPhase = 'WIN_CHECK';
          break;
        }

        case 'WIN_CHECK': {
          orchestratorLogger.info({
            gameId,
            roundNumber,
            phase: 'WIN_CHECK'
          }, 'Checking win condition');

          const winCheck2 = await checkWinConditionReal(gameId, prisma);

          if (winCheck2.hasWinner) {
            await finalizeGame(gameId, winCheck2.winner!, winCheck2.reason, prisma);
            const duration = Math.floor((Date.now() - startTime) / 1000);
            return {
              winner: winCheck2.winner!,
              finalRound: roundNumber,
              reason: winCheck2.reason,
              totalDuration: duration,
            };
          }

          // Continue to next round
          roundNumber++;
          currentPhase = 'NIGHT';
          break;
        }

        default:
          throw new Error(`Unknown phase: ${currentPhase}`);
      }

      // Emit phase transition event with timing information
      const previousPhase = getPreviousPhase(currentPhase);
      const phaseStartTime = new Date();
      const phaseEndTime = calculatePhaseEndTimeFromPhase(currentPhase);

      gameEventEmitter.emitGameEvent('phase_change', {
        gameId,
        type: 'phase_change',
        payload: {
          from: previousPhase,
          to: currentPhase,
          round: roundNumber,
          phaseStartTime: phaseStartTime.toISOString(),
          phaseEndTime: phaseEndTime ? phaseEndTime.toISOString() : null,
        },
      });

      // Small delay between phases for stability
      await sleep(500);
    }

    // Force end if max rounds reached
    orchestratorLogger.warn({
      gameId,
      roundNumber,
      maxRounds: MAX_ROUNDS
    }, 'Max rounds reached, forcing game end');
    const alivePlayers = await prisma.player.findMany({
      where: { gameId, isAlive: true },
    });
    const mafiaCount = alivePlayers.filter((p: { role: string }) => p.role === 'MAFIA').length;
    const winner = mafiaCount > 0 ? 'MAFIA' : 'VILLAGERS';
    const reason = `Max rounds (${MAX_ROUNDS}) reached`;

    await finalizeGame(gameId, winner, reason, prisma);
    const duration = Math.floor((Date.now() - startTime) / 1000);

    return {
      winner,
      finalRound: roundNumber,
      reason,
      totalDuration: duration,
    };
  } catch (error: any) {
    orchestratorLogger.error({
      gameId,
      error: error.message,
      stack: error.stack
    }, 'Fatal error in game loop');
    throw error;
  }
}

/**
 * Update game phase in database
 */
async function updateGamePhase(
  gameId: string,
  phase: GamePhase,
  round: number,
  prisma: PrismaClient
): Promise<void> {
  await prisma.game.update({
    where: { id: gameId },
    data: {
      currentPhase: phase,
      phaseStartTime: new Date(),
      roundNumber: round,
      status: phase === 'GAME_OVER' ? 'GAME_OVER' : phase,
    },
  });

  orchestratorLogger.debug({
    gameId,
    phase,
    round
  }, 'Updated game phase');
}

/**
 * Mark player as dead and emit event
 */
async function markPlayerDead(
  gameId: string,
  playerId: string,
  eliminationType: 'NIGHTKILL' | 'DAYKILL',
  round: number,
  prisma: PrismaClient
): Promise<void> {
  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      isAlive: false,
      eliminatedInRound: round,
      eliminationType,
    },
  });

  orchestratorLogger.info({
    gameId,
    playerId,
    playerName: player.name,
    eliminationType,
    round
  }, 'Player eliminated');

  gameEventEmitter.emitGameEvent('player_eliminated', {
    gameId,
    type: 'player_eliminated',
    payload: {
      playerId,
      playerName: player.name,
      eliminationType,
      round,
    },
  });
}

/**
 * Check win condition
 */
export async function checkWinCondition(
  gameId: string,
  prisma: PrismaClient
): Promise<WinConditionResult> {
  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true },
  });

  const mafiaCount = alivePlayers.filter((p: { role: string }) => p.role === 'MAFIA').length;
  const villagerCount = alivePlayers.filter(
    (p: { role: string }) => p.role === 'VILLAGER'
  ).length;

  orchestratorLogger.debug({
    gameId,
    mafiaCount,
    villagerCount
  }, 'Checking win conditions');

  // Villagers win: All Mafia eliminated
  if (mafiaCount === 0) {
    return {
      hasWinner: true,
      winner: 'VILLAGERS',
      reason: 'All Mafia members have been eliminated',
      mafiaCount,
      villagerCount,
    };
  }

  // Mafia wins: Mafia count >= Villager count
  if (mafiaCount >= villagerCount) {
    return {
      hasWinner: true,
      winner: 'MAFIA',
      reason: 'Mafia now equals or outnumbers Villagers',
      mafiaCount,
      villagerCount,
    };
  }

  // Game continues
  return {
    hasWinner: false,
    winner: null,
    reason: '',
    mafiaCount,
    villagerCount,
  };
}

/**
 * Finalize game and emit game_over event
 */
async function finalizeGame(
  gameId: string,
  winner: 'MAFIA' | 'VILLAGERS',
  reason: string,
  prisma: PrismaClient
): Promise<void> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });

  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'GAME_OVER',
      currentPhase: 'GAME_OVER',
      winner,
    },
  });

  orchestratorLogger.info({
    gameId,
    winner,
    reason,
    finalRound: game!.roundNumber,
    duration: Date.now() - (game!.phaseStartTime?.getTime() || Date.now())
  }, 'Game over');

  gameEventEmitter.emitGameEvent('game_over', {
    gameId,
    type: 'game_over',
    payload: {
      winner,
      finalRound: game!.roundNumber,
      reason,
    },
  });
}

/**
 * Get previous phase in sequence
 */
function getPreviousPhase(current: GamePhase): GamePhase | 'LOBBY' {
  const sequence: GamePhase[] = [
    'NIGHT',
    'DAY_ANNOUNCEMENT',
    'DISCUSSION',
    'VOTING',
    'WIN_CHECK',
  ];
  const idx = sequence.indexOf(current);
  if (idx > 0) {
    const prev = sequence[idx - 1];
    return prev || 'LOBBY';
  }
  return 'LOBBY';
}

/**
 * Calculate phase end time based on phase duration
 */
function calculatePhaseEndTimeFromPhase(phase: GamePhase): Date | null {
  const durations: Record<GamePhase, number> = {
    NIGHT: 45,
    DAY_ANNOUNCEMENT: 10,
    DISCUSSION: 180,
    VOTING: 120,
    WIN_CHECK: 5,
    GAME_OVER: 0,
  };

  const durationSeconds = durations[phase];
  if (durationSeconds === 0) return null;

  return new Date(Date.now() + durationSeconds * 1000);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

