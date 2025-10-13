/**
 * CLI Test Harness for Full Game Loop
 *
 * Tests the master orchestrator with mock phase implementations.
 * Run with: npx tsx src/cli/test-full-game.ts
 */

import { PrismaClient } from '@prisma/client';
import { runGameLoop } from '../lib/game/master-orchestrator';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Create a test game with players
 */
async function createTestGame(playerCount: number): Promise<string> {
  console.log(`\n[Test] Creating test game with ${playerCount} players...`);

  // Create game
  const game = await prisma.game.create({
    data: {
      status: 'LOBBY',
      playerCount,
    },
  });

  // Create players
  const playerNames = [
    'Agent-A',
    'Agent-B',
    'Agent-C',
    'Agent-D',
    'Agent-E',
    'Agent-F',
    'Agent-G',
    'Agent-H',
  ];

  const personalities = [
    'analytical',
    'aggressive',
    'cautious',
    'charismatic',
    'paranoid',
    'logical',
    'emotional',
    'strategic',
  ];

  // Calculate Mafia count (25-33%)
  const mafiaCount = playerCount <= 8 ? 2 : 3;
  const roles: ('MAFIA' | 'VILLAGER')[] = [];

  for (let i = 0; i < mafiaCount; i++) {
    roles.push('MAFIA');
  }
  for (let i = 0; i < playerCount - mafiaCount; i++) {
    roles.push('VILLAGER');
  }

  // Shuffle roles (Fisher-Yates)
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = roles[i]!;
    roles[i] = roles[j]!;
    roles[j] = temp;
  }

  // Create players
  for (let i = 0; i < playerCount; i++) {
    const role = roles[i];
    const name = playerNames[i];
    const personality = personalities[i % personalities.length];

    if (!role || !name || !personality) {
      throw new Error(`Missing data for player ${i}`);
    }

    await prisma.player.create({
      data: {
        gameId: game.id,
        name,
        role,
        personality,
        position: i,
        isAlive: true,
      },
    });
  }

  console.log(`[Test] Game created: ${game.id}`);
  console.log(`[Test] Mafia: ${mafiaCount}, Villagers: ${playerCount - mafiaCount}`);

  return game.id;
}

/**
 * Mock dependencies for testing
 */
function createMockDependencies() {
  return {
    prisma,
    generateResponse: async () => ({
      text: 'I think we should analyze the voting patterns carefully.',
      usage: {
        inputTokens: 100,
        cachedTokens: 50,
        outputTokens: 20,
        cost: 0.01,
      },
    }),
    trackCost: () => {},
    buildAgentContext: async () => ({
      player: { name: 'Agent-A' },
      systemPrompt: 'You are an agent',
      gameStateContext: 'Game state',
      conversationContext: [],
    }),
    getCostSummary: () => ({
      totalCost: 0.5,
      cacheHitRate: 0.7,
    }),
  };
}

/**
 * Main test function
 */
async function main() {
  console.log('========================================');
  console.log('Full Game Loop Test Harness');
  console.log('========================================');

  const startTime = Date.now();
  const logLines: string[] = [];

  try {
    // Create test game
    const gameId = await createTestGame(8);

    // Capture console.log output
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      const line = args.map((arg) => String(arg)).join(' ');
      logLines.push(line);
      originalLog(...args);
    };

    // Run game loop
    console.log('\n[Test] Starting game loop...\n');

    const dependencies = createMockDependencies();
    const result = await runGameLoop(gameId, dependencies);

    // Restore console.log
    console.log = originalLog;

    // Display results
    console.log('\n========================================');
    console.log('Game Complete!');
    console.log('========================================');
    console.log(`Winner: ${result.winner}`);
    console.log(`Final Round: ${result.finalRound}`);
    console.log(`Reason: ${result.reason}`);
    console.log(`Total Duration: ${result.totalDuration}s`);

    // Fetch final game state
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
      },
    });

    console.log('\n========================================');
    console.log('Final Player Status');
    console.log('========================================');

    for (const player of game!.players) {
      const status = player.isAlive ? '✓ ALIVE' : '✗ DEAD';
      const elimination = player.eliminationType
        ? `(${player.eliminationType}, Round ${player.eliminatedInRound})`
        : '';
      console.log(`${player.name} [${player.role}]: ${status} ${elimination}`);
    }

    // Save log to file
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logDir = path.join(__dirname, '..', '..', '..', 'logs');
    const logFile = path.join(logDir, `full-game-${timestamp}.txt`);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logContent = [
      '========================================',
      'Full Game Loop Test Log',
      '========================================',
      `Timestamp: ${new Date().toISOString()}`,
      `Game ID: ${gameId}`,
      `Winner: ${result.winner}`,
      `Final Round: ${result.finalRound}`,
      `Total Duration: ${duration}ms`,
      '',
      '========================================',
      'Game Log',
      '========================================',
      ...logLines,
      '',
      '========================================',
      'Final Player Status',
      '========================================',
      ...game!.players.map((p) => {
        const status = p.isAlive ? '✓ ALIVE' : '✗ DEAD';
        const elimination = p.eliminationType
          ? `(${p.eliminationType}, Round ${p.eliminatedInRound})`
          : '';
        return `${p.name} [${p.role}]: ${status} ${elimination}`;
      }),
    ].join('\n');

    fs.writeFileSync(logFile, logContent);
    console.log(`\n[Test] Log saved to: ${logFile}`);

    console.log('\n[Test] ✓ Test passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n[Test] ✗ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
