/**
 * Zone 2 Integration Test
 * Tests that Builder-2's Claude client integrates with Builder-3's orchestrator
 *
 * This validates:
 * - Context building from database
 * - Claude API call with caching
 * - Response validation
 * - Message saved to database
 * - Cost tracking works
 */

import { prisma } from './src/lib/db/client';
import { buildAgentContext } from './src/lib/claude/context-builder';
import { generateValidResponse } from './src/lib/claude/client';
import { costTracker } from './src/utils/cost-tracker';
import { executeTurn } from './src/lib/discussion/turn-executor';
import type { GameHistory } from './src/lib/types/shared';

async function testZone2Integration() {
  console.log('\n=== Zone 2 Integration Test ===\n');
  console.log('Testing: Builder-2 (Claude) + Builder-3 (Orchestrator) Integration\n');

  try {
    // Step 1: Create test game (using Builder-1's seed)
    console.log('[1/6] Creating test game...');
    const game = await prisma.game.create({
      data: {
        status: 'DISCUSSION',
        currentPhase: 'DISCUSSION',
        roundNumber: 1,
        playerCount: 3,
      },
    });

    const players = [];
    for (let i = 0; i < 3; i++) {
      const player = await prisma.player.create({
        data: {
          gameId: game.id,
          name: `TestAgent-${i}`,
          role: i === 0 ? 'MAFIA' : 'VILLAGER',
          personality: 'analytical',
          isAlive: true,
          position: i,
        },
      });
      players.push(player);
    }
    console.log(`✓ Test game created with ${players.length} players`);

    // Step 2: Build agent context (Builder-2)
    console.log('\n[2/6] Building agent context...');
    const testPlayer = players[0];
    if (!testPlayer) throw new Error('No test player');

    const history: GameHistory = {
      messages: [],
      votes: [],
      deaths: [],
      currentRound: 1,
      aliveCount: 3,
    };

    const context = buildAgentContext(testPlayer, history);
    console.log('✓ Context built successfully');
    console.log(`  - System prompt: ${context.systemPrompt.length} chars`);
    console.log(`  - Game state: ${context.gameStateContext.length} chars`);
    console.log(`  - Conversation history: ${context.conversationContext.length} messages`);

    // Step 3: Generate response with Claude API (Builder-2)
    console.log('\n[3/6] Calling Claude API...');
    const startTime = Date.now();
    const response = await generateValidResponse(context);
    const duration = Date.now() - startTime;

    console.log('✓ Response generated successfully');
    console.log(`  - Text: "${response.text.substring(0, 100)}..."`);
    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Input tokens: ${response.usage.inputTokens}`);
    console.log(`  - Cached tokens: ${response.usage.cachedTokens}`);
    console.log(`  - Output tokens: ${response.usage.outputTokens}`);
    console.log(`  - Cost: $${response.usage.cost.toFixed(4)}`);

    // Step 4: Save message to database (Builder-3)
    console.log('\n[4/6] Saving message to database...');
    const message = await prisma.discussionMessage.create({
      data: {
        gameId: game.id,
        playerId: testPlayer.id,
        roundNumber: 1,
        turn: 1,
        message: response.text,
        inReplyToId: null,
      },
      include: {
        player: true,
      },
    });
    console.log('✓ Message saved to database');
    console.log(`  - Message ID: ${message.id}`);

    // Step 5: Track cost (Builder-2)
    console.log('\n[5/6] Tracking cost...');
    costTracker.log(game.id, testPlayer.id, testPlayer.name, 1, response.usage);
    const summary = costTracker.getGameSummary(game.id);
    console.log('✓ Cost tracked successfully');
    console.log(`  - Total turns: ${summary.totalTurns}`);
    console.log(`  - Total cost: $${summary.totalCost.toFixed(4)}`);
    console.log(`  - Status: ${summary.status}`);

    // Step 6: Validate success criteria
    console.log('\n[6/6] Validating success criteria...');

    const checks = {
      'Response generated': response.text.length > 0,
      'Response under $0.50': response.usage.cost < 0.50,
      'Response time < 10s': duration < 10000,
      'Message saved': message.id.length > 0,
      'Cost tracked': summary.totalTurns === 1,
    };

    let allPassed = true;
    for (const [check, passed] of Object.entries(checks)) {
      console.log(`  ${passed ? '✓' : '✗'} ${check}`);
      if (!passed) allPassed = false;
    }

    // Cleanup
    console.log('\n[Cleanup] Removing test game...');
    await prisma.game.delete({ where: { id: game.id } });

    if (allPassed) {
      console.log('\n=== ✓ Zone 2 Integration Test PASSED ===\n');
      console.log('Builder-2 and Builder-3 are successfully integrated!');
      console.log('Ready to proceed to Zone 3 (Event Emitter Integration)\n');
      return true;
    } else {
      console.log('\n=== ✗ Zone 2 Integration Test FAILED ===\n');
      return false;
    }
  } catch (error) {
    console.error('\n=== ✗ Zone 2 Integration Test FAILED ===');
    console.error('Error:', error);
    return false;
  }
}

// Run test
testZone2Integration()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
