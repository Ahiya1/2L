/**
 * Unit tests for threading inference
 */

import {
  determineReplyTarget,
  extractAccusationTargets,
  calculateThreadingStats,
} from './threading';
import type { DiscussionMessage } from '../types/shared';

// Mock message creator
function createMockMessage(
  id: string,
  playerName: string,
  message: string,
  inReplyToId: string | null = null
): DiscussionMessage {
  return {
    id,
    gameId: 'test-game',
    roundNumber: 1,
    playerId: id,
    message,
    inReplyToId,
    timestamp: new Date(),
    turn: 1,
    player: {
      id,
      gameId: 'test-game',
      name: playerName,
      role: 'VILLAGER',
      personality: 'analytical',
      isAlive: true,
      position: 0,
    },
  };
}

// Test: Explicit mention detection
console.log('\n=== Test 1: Explicit Mention Detection ===');
{
  const recentMessages: DiscussionMessage[] = [
    createMockMessage('1', 'Agent-A', 'I think we should analyze patterns'),
    createMockMessage('2', 'Agent-B', 'I agree with the analysis'),
  ];

  const testMessage = 'Agent-A makes a good point about patterns';
  const result = determineReplyTarget(testMessage, recentMessages);

  console.log(`Message: "${testMessage}"`);
  console.log(`Reply target: ${result === '1' ? '✓ PASS' : '✗ FAIL'} (expected: 1, got: ${result})`);
}

// Test: Response phrase detection
console.log('\n=== Test 2: Response Phrase Detection ===');
{
  const recentMessages: DiscussionMessage[] = [
    createMockMessage('1', 'Agent-A', 'I think Agent-B is suspicious'),
  ];

  const testMessage = 'I disagree with that assessment';
  const result = determineReplyTarget(testMessage, recentMessages);

  console.log(`Message: "${testMessage}"`);
  console.log(`Reply target: ${result === '1' ? '✓ PASS' : '✗ FAIL'} (expected: 1, got: ${result})`);
}

// Test: Accusation targets extraction
console.log('\n=== Test 3: Accusation Target Extraction ===');
{
  const testCases = [
    {
      message: 'I think Agent-A is Mafia',
      expected: ['Agent-A'],
    },
    {
      message: 'Agent-B and Agent-C are suspicious',
      expected: ['Agent-B', 'Agent-C'],
    },
    {
      message: 'Vote for Agent-D',
      expected: ['Agent-D'],
    },
    {
      message: 'I accuse Agent-E',
      expected: ['Agent-E'],
    },
  ];

  for (const testCase of testCases) {
    const result = extractAccusationTargets(testCase.message);
    const pass = JSON.stringify(result) === JSON.stringify(testCase.expected);

    console.log(`\nMessage: "${testCase.message}"`);
    console.log(`Expected: [${testCase.expected.join(', ')}]`);
    console.log(`Got: [${result.join(', ')}]`);
    console.log(`Result: ${pass ? '✓ PASS' : '✗ FAIL'}`);
  }
}

// Test: Threading statistics
console.log('\n=== Test 4: Threading Statistics ===');
{
  const messages: DiscussionMessage[] = [
    createMockMessage('1', 'Agent-A', 'First message', null),
    createMockMessage('2', 'Agent-B', 'Reply to A', '1'),
    createMockMessage('3', 'Agent-C', 'Another message', null),
    createMockMessage('4', 'Agent-D', 'Reply to B', '2'),
    createMockMessage('5', 'Agent-E', 'Reply to C', '3'),
  ];

  const stats = calculateThreadingStats(messages);

  console.log(`\nTotal messages: ${stats.totalMessages}`);
  console.log(`Threaded messages: ${stats.threadedMessages}`);
  console.log(`Threading rate: ${(stats.threadingRate * 100).toFixed(1)}%`);
  console.log(`Average depth: ${stats.averageThreadDepth.toFixed(2)}`);

  const pass =
    stats.totalMessages === 5 &&
    stats.threadedMessages === 3 &&
    stats.threadingRate === 0.6;

  console.log(`Result: ${pass ? '✓ PASS' : '✗ FAIL'}`);
}

// Test: Default reply behavior
console.log('\n=== Test 5: Default Reply Behavior ===');
{
  const recentMessages: DiscussionMessage[] = [
    createMockMessage('1', 'Agent-A', 'Some random statement'),
  ];

  const testMessage = 'I think we should focus on evidence';
  const result = determineReplyTarget(testMessage, recentMessages);

  console.log(`Message: "${testMessage}"`);
  console.log(`Reply target: ${result === '1' ? '✓ PASS' : '✗ FAIL'} (expected: 1, got: ${result})`);
}

// Test: Empty messages list
console.log('\n=== Test 6: Empty Messages List ===');
{
  const recentMessages: DiscussionMessage[] = [];

  const testMessage = 'First message in discussion';
  const result = determineReplyTarget(testMessage, recentMessages);

  console.log(`Message: "${testMessage}"`);
  console.log(`Reply target: ${result === null ? '✓ PASS' : '✗ FAIL'} (expected: null, got: ${result})`);
}

console.log('\n=== All Threading Tests Complete ===\n');
