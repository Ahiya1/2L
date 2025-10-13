/**
 * Win Condition Checker
 *
 * Determines if game has reached a win condition after eliminations.
 * Called atomically after each nightkill and daykill.
 *
 * Win conditions:
 * - Villagers win: All Mafia eliminated (mafiaCount === 0)
 * - Mafia wins: Mafia count >= Villager count (Mafia controls voting)
 */

import type { PrismaClient } from '@prisma/client';
import { gameLogger } from '../logger';

export interface WinConditionResult {
  hasWinner: boolean;
  winner: 'MAFIA' | 'VILLAGERS' | null;
  reason: string;
  mafiaCount: number;
  villagerCount: number;
}

/**
 * Check win condition for a game
 *
 * @param gameId Game ID
 * @param prisma Prisma client
 * @returns Win condition result
 */
export async function checkWinCondition(
  gameId: string,
  prisma: PrismaClient
): Promise<WinConditionResult> {
  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true },
  });

  const mafiaCount = alivePlayers.filter((p) => p.role === 'MAFIA').length;
  const villagerCount = alivePlayers.filter((p) => p.role === 'VILLAGER').length;

  gameLogger.info(
    { gameId, mafiaCount, villagerCount },
    'Checking win condition'
  );

  // Villagers win: All Mafia eliminated
  if (mafiaCount === 0) {
    gameLogger.info({ gameId, mafiaCount, villagerCount }, 'VILLAGERS WIN - All Mafia eliminated');
    return {
      hasWinner: true,
      winner: 'VILLAGERS',
      reason: 'All Mafia members have been eliminated',
      mafiaCount,
      villagerCount,
    };
  }

  // Mafia wins: Mafia count >= Villager count (Mafia controls vote)
  if (mafiaCount >= villagerCount) {
    gameLogger.info({ gameId, mafiaCount, villagerCount }, 'MAFIA WIN - Mafia equals or outnumbers Villagers');
    return {
      hasWinner: true,
      winner: 'MAFIA',
      reason: 'Mafia now equals or outnumbers Villagers',
      mafiaCount,
      villagerCount,
    };
  }

  // Game continues
  gameLogger.debug({ gameId, mafiaCount, villagerCount }, 'Game continues - no winner yet');
  return {
    hasWinner: false,
    winner: null,
    reason: '',
    mafiaCount,
    villagerCount,
  };
}
