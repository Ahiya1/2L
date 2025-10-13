/**
 * Integration Test: Full Agent Response Pipeline
 *
 * Tests the complete flow from agent config → context building → API call → validation
 * without requiring the full database setup.
 */

import { generateAgentConfigs } from '../src/lib/agent/manager';
import { buildAgentContext } from '../src/lib/claude/context-builder';
import { generateValidResponse } from '../src/lib/claude/client';
import { costTracker } from '../src/utils/cost-tracker';
import type { GameHistory } from '../src/lib/claude/types';

async function testIntegration() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('INTEGRATION TEST: Full Agent Response Pipeline');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Generate agent configurations
  console.log('Step 1: Generating agent configurations...');
  const agents = generateAgentConfigs(10, 3);

  console.log(`Created ${agents.length} agents:`);
  for (const agent of agents) {
    console.log(`  - ${agent.name}: ${agent.role} (${agent.personality})`);
  }

  // 2. Create mock game history
  console.log('\nStep 2: Creating mock game history...');
  const mockHistory: GameHistory = {
    messages: [
      {
        id: 'msg-1',
        playerId: agents[1].name, // Agent-B
        player: {
          id: agents[1].name,
          name: agents[1].name,
          role: agents[1].role,
          isAlive: true,
        },
        message: 'I think we should watch Agent-C carefully. Their voting pattern is suspicious.',
        roundNumber: 1,
        turn: 1,
        timestamp: new Date(),
        inReplyToId: null,
      },
      {
        id: 'msg-2',
        playerId: agents[2].name, // Agent-C
        player: {
          id: agents[2].name,
          name: agents[2].name,
          role: agents[2].role,
          isAlive: true,
        },
        message: "I haven't even voted yet! What pattern are you talking about?",
        roundNumber: 1,
        turn: 2,
        timestamp: new Date(),
        inReplyToId: 'msg-1',
      },
    ],
    votes: [],
    deaths: [],
    currentRound: 1,
    aliveCount: 10,
  };

  console.log(`Mock history created with ${mockHistory.messages.length} messages`);

  // 3. Test response generation for first agent (Agent-A)
  const testAgent = agents[0];
  console.log(`\nStep 3: Testing response generation for ${testAgent.name}...`);
  console.log(`  Role: ${testAgent.role}`);
  console.log(`  Personality: ${testAgent.personality}`);

  try {
    // Build context
    const context = buildAgentContext(
      {
        id: testAgent.name,
        name: testAgent.name,
        role: testAgent.role,
        personality: testAgent.personality,
        isAlive: true,
      },
      mockHistory
    );

    console.log('\n  Context built successfully:');
    console.log(`  - System prompt: ${context.systemPrompt.length} characters`);
    console.log(`  - Game state: ${context.gameStateContext.length} characters`);
    console.log(`  - Conversation: ${context.conversationContext.length} messages`);

    // Generate response
    console.log('\n  Calling Claude API...');
    const startTime = Date.now();
    const response = await generateValidResponse(context);
    const duration = Date.now() - startTime;

    console.log(`\n  Response generated in ${duration}ms:`);
    console.log(`  "${response.text}"`);

    console.log(`\n  Token usage:`);
    console.log(`    Input: ${response.usage.inputTokens}`);
    console.log(`    Cache creation: ${response.usage.cacheCreationTokens}`);
    console.log(`    Cache read: ${response.usage.cachedTokens}`);
    console.log(`    Output: ${response.usage.outputTokens}`);
    console.log(`    Cost: $${response.usage.cost.toFixed(6)}`);

    console.log(`\n  Validation: ${response.isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (response.validationError) {
      console.log(`  Error: ${response.validationError}`);
    }

    // Track cost
    costTracker.logUsage('test-game', testAgent.name, testAgent.name, 1, response.usage);

    // 4. Test cache hit with second call
    console.log('\nStep 4: Testing prompt caching with second call...');
    const response2 = await generateValidResponse(context);

    console.log(`  Second response: "${response2.text}"`);
    console.log(`  Cache read tokens: ${response2.usage.cachedTokens}`);
    console.log(`  Cost: $${response2.usage.cost.toFixed(6)}`);

    costTracker.logUsage('test-game', testAgent.name, testAgent.name, 2, response2.usage);

    // 5. Print cost summary
    console.log('\nStep 5: Cost summary...');
    costTracker.printSummary('test-game');

    // 6. Validate results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('VALIDATION CHECKS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let passed = true;

    if (response.isValid && response2.isValid) {
      console.log('✅ Both responses passed validation');
    } else {
      console.log('❌ One or more responses failed validation');
      passed = false;
    }

    if (response2.usage.cachedTokens > 0) {
      console.log('✅ Second call used cached tokens');
    } else {
      console.log('❌ Second call did NOT use cached tokens');
      passed = false;
    }

    const summary = costTracker.getGameSummary('test-game');
    if (summary.status === 'HEALTHY') {
      console.log('✅ Cost tracking healthy');
    } else {
      console.log(`⚠️  Cost tracking status: ${summary.status}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (passed) {
      console.log('✅ INTEGRATION TEST PASSED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('All components working correctly! Ready for full system integration.\n');
    } else {
      console.log('❌ INTEGRATION TEST FAILED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('Some components need attention.\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Integration test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

testIntegration();
