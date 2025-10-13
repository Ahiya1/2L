/**
 * Role assignment and player initialization
 *
 * Handles random role distribution following standard Mafia ratios (25-33%)
 */

import type { PrismaClient } from '@prisma/client';
import { gameLogger } from '../logger';

const AGENT_NAMES = [
  'Agent-A',
  'Agent-B',
  'Agent-C',
  'Agent-D',
  'Agent-E',
  'Agent-F',
  'Agent-G',
  'Agent-H',
  'Agent-I',
  'Agent-J',
  'Agent-K',
  'Agent-L',
];

const PERSONALITIES = [
  'analytical',
  'aggressive',
  'cautious',
  'charismatic',
  'paranoid',
  'logical',
  'emotional',
  'strategic',
  'methodical',
  'impulsive',
  'diplomatic',
  'suspicious',
];

/**
 * Calculate Mafia count based on player count
 * Standard Mafia ratios: 25-33%
 *
 * @param totalPlayers Total number of players (8-12)
 * @returns Number of Mafia players
 */
export function calculateMafiaCount(totalPlayers: number): number {
  if (totalPlayers <= 8) return 2; // 25%
  if (totalPlayers === 9) return 3; // 33%
  if (totalPlayers === 10) return 3; // 30%
  if (totalPlayers === 11) return 3; // 27%
  return 4; // 33% for 12 players
}

/**
 * Fisher-Yates shuffle algorithm
 * Randomly shuffles array in-place
 *
 * @param array Array to shuffle
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    const swapItem = array[j];
    if (temp !== undefined && swapItem !== undefined) {
      array[i] = swapItem;
      array[j] = temp;
    }
  }
}

/**
 * Assign roles and create players for a game
 *
 * @param gameId Game ID
 * @param playerCount Number of players (8-12)
 * @param prisma Prisma client
 */
export async function assignRolesAndCreatePlayers(
  gameId: string,
  playerCount: number,
  prisma: PrismaClient
): Promise<void> {
  if (playerCount < 8 || playerCount > 12) {
    throw new Error('Player count must be between 8 and 12');
  }

  // Calculate Mafia count
  const mafiaCount = calculateMafiaCount(playerCount);
  const villagerCount = playerCount - mafiaCount;

  gameLogger.info(
    { gameId, playerCount, mafiaCount, villagerCount },
    'Creating players with role distribution'
  );

  // Create role pool
  const roles: ('MAFIA' | 'VILLAGER')[] = [];
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('MAFIA');
  }
  for (let i = 0; i < villagerCount; i++) {
    roles.push('VILLAGER');
  }

  // Shuffle roles for randomness
  shuffleArray(roles);

  // Create players
  const playerPromises = [];
  for (let i = 0; i < playerCount; i++) {
    const name = AGENT_NAMES[i];
    const role = roles[i];
    const personality = PERSONALITIES[i % PERSONALITIES.length];

    if (name && role && personality) {
      playerPromises.push(
        prisma.player.create({
          data: {
            gameId,
            name,
            role,
            personality,
            position: i,
            isAlive: true,
          },
        })
      );
    }
  }

  await Promise.all(playerPromises);

  gameLogger.info({ gameId, playerCount }, 'Players created successfully');
}

/**
 * Get role distribution for a player count
 * Useful for displaying game setup information
 *
 * @param playerCount Number of players
 * @returns Object with Mafia and Villager counts
 */
export function getRoleDistribution(playerCount: number): {
  mafia: number;
  villagers: number;
  mafiaPercentage: number;
} {
  const mafia = calculateMafiaCount(playerCount);
  const villagers = playerCount - mafia;
  const mafiaPercentage = Math.round((mafia / playerCount) * 100);

  return { mafia, villagers, mafiaPercentage };
}
