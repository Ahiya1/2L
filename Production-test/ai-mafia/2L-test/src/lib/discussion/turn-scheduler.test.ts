/**
 * Unit tests for turn scheduler
 */

import {
  createTurnSchedule,
  getNextPlayer,
  advanceToNextTurn,
  shouldContinue,
  getRemainingTime,
  getProgress,
  getScheduleStats,
} from './turn-scheduler';
import type { Player } from '../types/shared';

// Mock players
const mockPlayers: Player[] = [
  {
    id: '1',
    gameId: 'test',
    name: 'Agent-A',
    role: 'VILLAGER',
    personality: 'analytical',
    isAlive: true,
    position: 0,
  },
  {
    id: '2',
    gameId: 'test',
    name: 'Agent-B',
    role: 'MAFIA',
    personality: 'aggressive',
    isAlive: true,
    position: 1,
  },
  {
    id: '3',
    gameId: 'test',
    name: 'Agent-C',
    role: 'VILLAGER',
    personality: 'cautious',
    isAlive: true,
    position: 2,
  },
];

// Test: Create turn schedule
console.log('\n=== Test 1: Create Turn Schedule ===');
{
  const schedule = createTurnSchedule(mockPlayers, 5, 3);

  console.log(`Total rounds: ${schedule.totalRounds}`);
  console.log(`Current round: ${schedule.currentRound}`);
  console.log(`Current turn index: ${schedule.currentTurnIndex}`);
  console.log(`Alive players: ${schedule.alivePlayers.length}`);
  console.log(`Turn order length: ${schedule.turnOrder.length}`);
  console.log(`Duration (ms): ${schedule.durationMs}`);

  const pass =
    schedule.totalRounds === 5 &&
    schedule.currentRound === 0 &&
    schedule.currentTurnIndex === 0 &&
    schedule.alivePlayers.length === 3 &&
    schedule.turnOrder.length === 3 &&
    schedule.durationMs === 3 * 60 * 1000;

  console.log(`Result: ${pass ? '✓ PASS' : '✗ FAIL'}`);
}

// Test: Get next player
console.log('\n=== Test 2: Get Next Player ===');
{
  const schedule = createTurnSchedule(mockPlayers, 5, 3);
  const player = getNextPlayer(schedule);

  console.log(`Next player: ${player?.name || 'null'}`);

  const pass = player !== null && mockPlayers.some((p) => p.id === player.id);

  console.log(`Result: ${pass ? '✓ PASS' : '✗ FAIL'}`);
}

// Test: Advance through round
console.log('\n=== Test 3: Advance Through Round ===');
{
  let schedule = createTurnSchedule(mockPlayers, 5, 3);

  console.log(`\nInitial state:`);
  console.log(`  Round: ${schedule.currentRound}, Turn Index: ${schedule.currentTurnIndex}`);

  // Advance through all players in first round
  for (let i = 0; i < mockPlayers.length; i++) {
    schedule = advanceToNextTurn(schedule);
    console.log(`  After advance ${i + 1}: Round ${schedule.currentRound}, Turn Index: ${schedule.currentTurnIndex}`);
  }

  const pass = schedule.currentRound === 1 && schedule.currentTurnIndex === 0;

  console.log(`\nExpected: Round 1, Turn Index 0`);
  console.log(`Got: Round ${schedule.currentRound}, Turn Index ${schedule.currentTurnIndex}`);
  console.log(`Result: ${pass ? '✓ PASS' : '✗ FAIL'}`);
}

// Test: Should continue (time limit)
console.log('\n=== Test 4: Should Continue (Time Limit) ===');
{
  // Create schedule with very short duration
  const schedule = createTurnSchedule(mockPlayers, 5, 0.0001); // 6ms duration

  // Wait for time to expire
  const startTime = Date.now();
  while (Date.now() - startTime < 10) {
    // Wait 10ms
  }

  const shouldCont = shouldContinue(schedule);

  console.log(`Duration (ms): ${schedule.durationMs}`);
  console.log(`Should continue: ${shouldCont}`);

  const pass = !shouldCont;

  console.log(`Result: ${pass ? '✓ PASS' : '✗ FAIL'}`);
}

// Test: Should continue (round limit)
console.log('\n=== Test 5: Should Continue (Round Limit) ===');
{
  let schedule = createTurnSchedule(mockPlayers, 2, 10); // 2 rounds only

  // Advance to end of round 2
  schedule = { ...schedule, currentRound: 2 };

  const shouldCont = shouldContinue(schedule);

  console.log(`Current round: ${schedule.currentRound}`);
  console.log(`Total rounds: ${schedule.totalRounds}`);
  console.log(`Should continue: ${shouldCont}`);

  const pass = !shouldCont;

  console.log(`Result: ${pass ? '✓ PASS' : '✗ FAIL'}`);
}

// Test: Get schedule stats
console.log('\n=== Test 6: Get Schedule Stats ===');
{
  const schedule = createTurnSchedule(mockPlayers, 5, 3);
  const stats = getScheduleStats(schedule, 10); // 10 turns completed

  console.log(`Current round: ${stats.currentRound}`);
  console.log(`Total rounds: ${stats.totalRounds}`);
  console.log(`Total turns: ${stats.totalTurns}`);
  console.log(`Elapsed time: ${stats.elapsedTime}ms`);
  console.log(`Remaining time: ${stats.remainingTime}ms`);
  console.log(`Progress: ${stats.progress.toFixed(1)}%`);
  console.log(`Estimated turns remaining: ${stats.estimatedTurnsRemaining}`);

  const pass =
    stats.currentRound === 1 && // 1-indexed
    stats.totalRounds === 5 &&
    stats.totalTurns === 10 &&
    stats.elapsedTime >= 0 &&
    stats.remainingTime > 0 &&
    stats.progress >= 0;

  console.log(`Result: ${pass ? '✓ PASS' : '✗ FAIL'}`);
}

// Test: Get remaining time
console.log('\n=== Test 7: Get Remaining Time ===');
{
  const schedule = createTurnSchedule(mockPlayers, 5, 3);
  const remaining = getRemainingTime(schedule);

  console.log(`Duration (ms): ${schedule.durationMs}`);
  console.log(`Remaining time (ms): ${remaining}`);

  const pass = remaining > 0 && remaining <= schedule.durationMs;

  console.log(`Result: ${pass ? '✓ PASS' : '✗ FAIL'}`);
}

// Test: Get progress
console.log('\n=== Test 8: Get Progress ===');
{
  const schedule = createTurnSchedule(mockPlayers, 5, 3);
  const progress = getProgress(schedule);

  console.log(`Progress: ${progress.toFixed(2)}%`);

  const pass = progress >= 0 && progress <= 100;

  console.log(`Result: ${pass ? '✓ PASS' : '✗ FAIL'}`);
}

// Test: Turn order is shuffled
console.log('\n=== Test 9: Turn Order Shuffling ===');
{
  let schedule = createTurnSchedule(mockPlayers, 5, 3);

  const firstRoundOrder = schedule.turnOrder.map((p) => p.id);
  console.log(`First round order: ${firstRoundOrder.join(', ')}`);

  // Advance to next round
  for (let i = 0; i < mockPlayers.length; i++) {
    schedule = advanceToNextTurn(schedule);
  }

  const secondRoundOrder = schedule.turnOrder.map((p) => p.id);
  console.log(`Second round order: ${secondRoundOrder.join(', ')}`);

  // Note: Shuffling is random, so we can't guarantee order changes
  // But we can check that all players are present
  const allPlayersPresent =
    secondRoundOrder.length === mockPlayers.length &&
    mockPlayers.every((p) => secondRoundOrder.includes(p.id));

  console.log(`All players present in second round: ${allPlayersPresent}`);
  console.log(`Result: ${allPlayersPresent ? '✓ PASS' : '✗ FAIL'}`);
}

console.log('\n=== All Turn Scheduler Tests Complete ===\n');
