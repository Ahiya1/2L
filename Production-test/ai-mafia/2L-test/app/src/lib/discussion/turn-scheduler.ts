/**
 * Turn scheduler for discussion phase
 *
 * Implements sequential round-robin turn management:
 * - 3-5 rounds per agent (configurable)
 * - Shuffle agent order at start of each round
 * - Track who has spoken, how many turns remaining
 * - Stop after duration expires (3-5 minutes)
 *
 * Pattern: Sequential execution (no parallel turns)
 * Each agent speaks once per round, rounds repeat until time expires
 */

import type { Player, TurnSchedule } from '../types/shared';

/**
 * Create initial turn schedule
 *
 * @param alivePlayers Array of alive players
 * @param totalRounds Number of rounds (default 5)
 * @param durationMinutes Discussion duration in minutes (default 3)
 * @returns Turn schedule object
 */
export function createTurnSchedule(
  alivePlayers: Player[],
  totalRounds: number = 5,
  durationMinutes: number = 3
): TurnSchedule {
  // Calculate estimated total turns (players * rounds)
  const estimatedTotalTurns = alivePlayers.length * totalRounds;

  return {
    totalRounds,
    currentRound: 0,
    currentTurnIndex: 0,
    totalTurns: estimatedTotalTurns,
    alivePlayers,
    turnOrder: shuffleArray([...alivePlayers]),
    startTime: Date.now(),
    durationMs: durationMinutes * 60 * 1000,
  };
}

/**
 * Get next player in turn order
 * Returns null if time expired or all rounds complete
 *
 * @param schedule Current turn schedule
 * @returns Next player to take turn, or null if done
 */
export function getNextPlayer(schedule: TurnSchedule): Player | null {
  // Check if time expired
  const elapsed = Date.now() - schedule.startTime;
  if (elapsed >= schedule.durationMs) {
    return null;
  }

  // Check if all rounds complete
  if (schedule.currentRound >= schedule.totalRounds) {
    return null;
  }

  // Get current player
  const player = schedule.turnOrder[schedule.currentTurnIndex];

  return player || null;
}

/**
 * Advance to next turn
 * Handles round transitions and reshuffling
 *
 * @param schedule Current turn schedule
 * @returns Updated turn schedule
 */
export function advanceToNextTurn(schedule: TurnSchedule): TurnSchedule {
  const nextTurnIndex = schedule.currentTurnIndex + 1;

  // If we've gone through all players in current round
  if (nextTurnIndex >= schedule.turnOrder.length) {
    // Start new round
    const nextRound = schedule.currentRound + 1;

    // Shuffle turn order for variety
    const newTurnOrder = shuffleArray([...schedule.alivePlayers]);

    return {
      ...schedule,
      currentRound: nextRound,
      currentTurnIndex: 0,
      turnOrder: newTurnOrder,
    };
  }

  // Continue in current round
  return {
    ...schedule,
    currentTurnIndex: nextTurnIndex,
  };
}

/**
 * Check if discussion should continue
 *
 * @param schedule Current turn schedule
 * @returns True if should continue, false if done
 */
export function shouldContinue(schedule: TurnSchedule): boolean {
  // Check time limit
  const elapsed = Date.now() - schedule.startTime;
  if (elapsed >= schedule.durationMs) {
    return false;
  }

  // Check round limit
  if (schedule.currentRound >= schedule.totalRounds) {
    return false;
  }

  // Check if there are players
  if (schedule.alivePlayers.length === 0) {
    return false;
  }

  return true;
}

/**
 * Get remaining time in milliseconds
 *
 * @param schedule Current turn schedule
 * @returns Remaining time in ms
 */
export function getRemainingTime(schedule: TurnSchedule): number {
  const elapsed = Date.now() - schedule.startTime;
  const remaining = schedule.durationMs - elapsed;
  return Math.max(0, remaining);
}

/**
 * Get total elapsed time in milliseconds
 *
 * @param schedule Current turn schedule
 * @returns Elapsed time in ms
 */
export function getElapsedTime(schedule: TurnSchedule): number {
  return Date.now() - schedule.startTime;
}

/**
 * Calculate progress percentage (0-100)
 *
 * @param schedule Current turn schedule
 * @returns Progress as percentage
 */
export function getProgress(schedule: TurnSchedule): number {
  const elapsed = Date.now() - schedule.startTime;
  const progress = (elapsed / schedule.durationMs) * 100;
  return Math.min(100, progress);
}

/**
 * Get schedule statistics
 *
 * @param schedule Current turn schedule
 * @param totalTurns Total turns executed so far
 * @returns Statistics object
 */
export function getScheduleStats(
  schedule: TurnSchedule,
  totalTurns: number
): {
  currentRound: number;
  totalRounds: number;
  totalTurns: number;
  elapsedTime: number;
  remainingTime: number;
  progress: number;
  estimatedTurnsRemaining: number;
} {
  const elapsedTime = getElapsedTime(schedule);
  const remainingTime = getRemainingTime(schedule);
  const progress = getProgress(schedule);

  // Estimate turns remaining based on current pace
  const avgTimePerTurn = totalTurns > 0 ? elapsedTime / totalTurns : 5000; // Assume 5s default
  const estimatedTurnsRemaining = Math.floor(remainingTime / avgTimePerTurn);

  return {
    currentRound: schedule.currentRound + 1, // Display as 1-indexed
    totalRounds: schedule.totalRounds,
    totalTurns,
    elapsedTime,
    remainingTime,
    progress,
    estimatedTurnsRemaining,
  };
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * Creates new array (doesn't mutate original)
 *
 * @param array Array to shuffle
 * @returns Shuffled copy of array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    if (temp !== undefined && shuffled[j] !== undefined) {
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
  }

  return shuffled;
}

/**
 * Sleep utility for delays between turns
 *
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
