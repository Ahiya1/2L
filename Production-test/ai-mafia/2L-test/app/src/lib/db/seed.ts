// Seed function for test game setup
// Creates a test game with configurable player count, roles, and personalities

import { prisma } from './client';

export interface SeedGameConfig {
  playerCount: number;
  mafiaCount: number;
  personalities: string[];
}

/**
 * Creates a test game with specified configuration
 * @param config - Game configuration (player count, mafia count, personalities)
 * @returns Game ID
 */
export async function seedTestGame(config: SeedGameConfig): Promise<string> {
  const { playerCount, mafiaCount, personalities } = config;

  // Validate configuration
  if (mafiaCount >= playerCount) {
    throw new Error('Mafia count must be less than player count');
  }

  if (personalities.length === 0) {
    throw new Error('At least one personality type is required');
  }

  // 1. Create game
  const game = await prisma.game.create({
    data: {
      status: 'DISCUSSION',
      currentPhase: 'DISCUSSION',
      phaseEndTime: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes from now
      roundNumber: 1,
      playerCount,
    },
  });

  // 2. Assign roles (randomly)
  const roles: string[] = [];
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('MAFIA');
  }
  for (let i = 0; i < playerCount - mafiaCount; i++) {
    roles.push('VILLAGER');
  }

  // Shuffle roles using Fisher-Yates algorithm
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i]!, roles[j]!] = [roles[j]!, roles[i]!];
  }

  // 3. Create players with personalities
  const players = [];
  for (let i = 0; i < playerCount; i++) {
    const player = await prisma.player.create({
      data: {
        gameId: game.id,
        name: `Agent-${String.fromCharCode(65 + i)}`, // Agent-A, Agent-B, etc.
        role: roles[i]!,
        personality: personalities[i % personalities.length]!,
        isAlive: true,
        position: i,
      },
    });
    players.push(player);
  }

  console.log(`\n✓ Test game created: ${game.id}`);
  console.log(`✓ Players: ${playerCount} (${mafiaCount} Mafia, ${playerCount - mafiaCount} Villagers)`);
  console.log(`✓ Roles assigned randomly`);
  console.log('\nPlayer Roster:');
  for (const player of players) {
    console.log(`  - ${player.name}: ${player.role} (${player.personality})`);
  }

  return game.id;
}

/**
 * Clear all game data (useful for testing)
 */
export async function clearAllGames(): Promise<void> {
  await prisma.gameEvent.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.discussionMessage.deleteMany();
  await prisma.player.deleteMany();
  await prisma.game.deleteMany();
  console.log('✓ All game data cleared');
}

/**
 * Get default test configuration
 */
export function getDefaultTestConfig(): SeedGameConfig {
  return {
    playerCount: 10,
    mafiaCount: 3,
    personalities: ['analytical', 'aggressive', 'cautious', 'social', 'suspicious'],
  };
}
