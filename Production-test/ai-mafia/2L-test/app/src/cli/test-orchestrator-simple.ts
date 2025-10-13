/**
 * Simple CLI Test for Master Orchestrator
 *
 * Tests phase transitions and win condition checking without full Discussion phase.
 * Run with: npx tsx src/cli/test-orchestrator-simple.ts
 */

import { PrismaClient } from '@prisma/client';
import { checkWinCondition } from '../lib/game/master-orchestrator';

const prisma = new PrismaClient();

/**
 * Test win condition logic
 */
async function testWinConditions() {
  console.log('\n========================================');
  console.log('Testing Win Condition Logic');
  console.log('========================================');

  try {
    // Create test game
    const game = await prisma.game.create({
      data: {
        status: 'LOBBY',
        playerCount: 8,
      },
    });

    // Create players: 2 Mafia, 6 Villagers
    await prisma.player.createMany({
      data: [
        {
          gameId: game.id,
          name: 'Mafia-1',
          role: 'MAFIA',
          personality: 'aggressive',
          position: 0,
          isAlive: true,
        },
        {
          gameId: game.id,
          name: 'Mafia-2',
          role: 'MAFIA',
          personality: 'analytical',
          position: 1,
          isAlive: true,
        },
        {
          gameId: game.id,
          name: 'Villager-1',
          role: 'VILLAGER',
          personality: 'cautious',
          position: 2,
          isAlive: true,
        },
        {
          gameId: game.id,
          name: 'Villager-2',
          role: 'VILLAGER',
          personality: 'logical',
          position: 3,
          isAlive: true,
        },
        {
          gameId: game.id,
          name: 'Villager-3',
          role: 'VILLAGER',
          personality: 'charismatic',
          position: 4,
          isAlive: true,
        },
        {
          gameId: game.id,
          name: 'Villager-4',
          role: 'VILLAGER',
          personality: 'paranoid',
          position: 5,
          isAlive: true,
        },
        {
          gameId: game.id,
          name: 'Villager-5',
          role: 'VILLAGER',
          personality: 'emotional',
          position: 6,
          isAlive: true,
        },
        {
          gameId: game.id,
          name: 'Villager-6',
          role: 'VILLAGER',
          personality: 'strategic',
          position: 7,
          isAlive: true,
        },
      ],
    });

    console.log(`\nTest 1: Initial state (2 Mafia, 6 Villagers)`);
    let result = await checkWinCondition(game.id, prisma);
    console.log(`  Has winner: ${result.hasWinner}`);
    console.log(`  Winner: ${result.winner || 'none'}`);
    console.log(`  Reason: ${result.reason || 'game continues'}`);
    console.log(`  Mafia: ${result.mafiaCount}, Villagers: ${result.villagerCount}`);

    if (result.hasWinner) {
      console.log('  ✗ FAIL: Should not have winner yet');
      process.exit(1);
    }
    console.log('  ✓ PASS');

    // Test 2: All Mafia eliminated (Villagers win)
    console.log(`\nTest 2: All Mafia eliminated (Villagers win)`);
    await prisma.player.updateMany({
      where: { gameId: game.id, role: 'MAFIA' },
      data: { isAlive: false },
    });

    result = await checkWinCondition(game.id, prisma);
    console.log(`  Has winner: ${result.hasWinner}`);
    console.log(`  Winner: ${result.winner}`);
    console.log(`  Reason: ${result.reason}`);
    console.log(`  Mafia: ${result.mafiaCount}, Villagers: ${result.villagerCount}`);

    if (!result.hasWinner || result.winner !== 'VILLAGERS') {
      console.log('  ✗ FAIL: Villagers should win');
      process.exit(1);
    }
    console.log('  ✓ PASS');

    // Reset for Test 3
    await prisma.player.updateMany({
      where: { gameId: game.id },
      data: { isAlive: true },
    });

    // Test 3: Mafia equals Villagers (Mafia wins)
    console.log(`\nTest 3: Mafia equals Villagers (Mafia wins)`);
    await prisma.player.updateMany({
      where: { gameId: game.id, role: 'VILLAGER', position: { gte: 4 } },
      data: { isAlive: false },
    });

    result = await checkWinCondition(game.id, prisma);
    console.log(`  Has winner: ${result.hasWinner}`);
    console.log(`  Winner: ${result.winner}`);
    console.log(`  Reason: ${result.reason}`);
    console.log(`  Mafia: ${result.mafiaCount}, Villagers: ${result.villagerCount}`);

    if (!result.hasWinner || result.winner !== 'MAFIA') {
      console.log('  ✗ FAIL: Mafia should win');
      process.exit(1);
    }
    console.log('  ✓ PASS');

    // Test 4: Mafia outnumbers Villagers (Mafia wins)
    console.log(`\nTest 4: Mafia outnumbers Villagers (Mafia wins)`);
    const villager1 = await prisma.player.findFirst({
      where: { gameId: game.id, role: 'VILLAGER', isAlive: true },
    });
    if (villager1) {
      await prisma.player.update({
        where: { id: villager1.id },
        data: { isAlive: false },
      });
    }

    result = await checkWinCondition(game.id, prisma);
    console.log(`  Has winner: ${result.hasWinner}`);
    console.log(`  Winner: ${result.winner}`);
    console.log(`  Reason: ${result.reason}`);
    console.log(`  Mafia: ${result.mafiaCount}, Villagers: ${result.villagerCount}`);

    if (!result.hasWinner || result.winner !== 'MAFIA') {
      console.log('  ✗ FAIL: Mafia should win');
      process.exit(1);
    }
    console.log('  ✓ PASS');

    console.log('\n========================================');
    console.log('✓ All tests passed!');
    console.log('========================================');

    // Cleanup
    await prisma.player.deleteMany({ where: { gameId: game.id } });
    await prisma.game.delete({ where: { id: game.id } });

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testWinConditions();
