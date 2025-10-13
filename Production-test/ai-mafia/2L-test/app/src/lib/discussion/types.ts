/**
 * Types for discussion phase orchestration
 */

import type { Player, DiscussionMessage } from '../types/shared';

export interface TurnSchedule {
  totalRounds: number;
  currentRound: number;
  currentTurnIndex: number;
  alivePlayers: Player[];
  turnOrder: Player[];
  startTime: number;
  durationMs: number;
}

export interface TurnResult {
  success: boolean;
  message?: DiscussionMessage;
  error?: string;
  duration: number;
  timedOut: boolean;
  usedFallback: boolean;
}

export interface DiscussionConfig {
  durationMinutes?: number;
  totalRounds?: number;
  turnTimeoutSeconds?: number;
  turnDelayMs?: number;
}

export interface DiscussionResult {
  gameId: string;
  totalMessages: number;
  duration: number;
  totalCost: number;
  cacheHitRate: number;
  completedRounds: number;
  timedOut: boolean;
  errors: string[];
}
