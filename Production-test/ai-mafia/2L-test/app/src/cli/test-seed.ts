// Test script to verify database setup and seed function
// Run with: npx tsx src/cli/test-seed.ts

import { seedTestGame, getDefaultTestConfig, clearAllGames } from '../lib/db/seed';
import { prisma } from '../lib/db/client';

async function testSeed() {
  console.log('\n=== Testing Database Setup ===\n');

  try {
    // Clear existing data
    console.log('Clearing existing game data...');
    await clearAllGames();

    // Create test game
    console.log('\nCreating test game...');
    const gameId = await seedTestGame(getDefaultTestConfig());

    // Verify game created
    console.log('\nVerifying game in database...');
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
      },
    });

    if (!game) {
      throw new Error('Game not found in database!');
    }

    console.log('\n✓ Database verification successful!');
    console.log(`✓ Game status: ${game.status}`);
    console.log(`✓ Player count: ${game.players.length}`);
    console.log(`✓ Mafia count: ${game.players.filter(p => p.role === 'MAFIA').length}`);
    console.log(`✓ Villager count: ${game.players.filter(p => p.role === 'VILLAGER').length}`);

    // Test database client import
    console.log('\n✓ Prisma client import working');
    console.log('✓ Database queries working');

    console.log('\n=== All Tests Passed! ===\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSeed();
