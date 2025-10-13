// Shared types and interfaces used across the application
// Integrator-1: Merged types from Builder-1, Builder-2, and Builder-3
// Iteration 2: Extended by Builder-1 with game phase types

import type { Player, DiscussionMessage, Vote, Game, NightMessage } from '@prisma/client';
import type Anthropic from '@anthropic-ai/sdk';

// Re-export Prisma types for convenience
export type { Player, DiscussionMessage, Vote, Game, NightMessage };

/**
 * Game history context for agents (Builder-2)
 */
export interface GameHistory {
  messages: (DiscussionMessage & { player: Player })[];
  votes: (Vote & { voter: Player; target: Player })[];
  deaths: Player[];
  currentRound: number;
  aliveCount: number;
}

/**
 * Agent context for Claude API (Builder-2)
 */
export interface AgentContext {
  player: Player;
  systemPrompt: string;
  gameStateContext: string;
  conversationContext: Anthropic.MessageParam[];
}

/**
 * Token usage tracking (Builder-2)
 */
export interface TokenUsage {
  inputTokens: number;
  cacheCreationTokens?: number;
  cachedTokens: number;
  outputTokens: number;
  cost: number;
}

/**
 * Agent response with usage stats (Builder-2)
 */
export interface AgentResponse {
  text: string;
  usage: TokenUsage;
}

// NOTE: GameEventType and GameEvent are now defined in lib/events/types.ts
// Import from there if you need them. This avoids duplication and ensures
// consistency with the actual event emitter implementation.

/**
 * Turn schedule for orchestrator (Builder-3)
 */
export interface TurnSchedule {
  totalRounds: number;
  currentRound: number;
  currentTurnIndex: number;
  totalTurns: number;
  alivePlayers: Player[];
  turnOrder: Player[];
  startTime: number;
  durationMs: number;
}

/**
 * Turn execution result (Builder-3)
 */
export interface TurnResult {
  success: boolean;
  message?: DiscussionMessage & { player: Player };
  error?: string;
  duration?: number; // Duration in milliseconds
  timedOut?: boolean;
  usedFallback?: boolean;
  cost?: number;
}

/**
 * Discussion configuration (Builder-3)
 */
export interface DiscussionConfig {
  durationSeconds?: number;
  durationMinutes?: number;
  turnsPerAgent?: number;
  maxRounds?: number;
  totalRounds?: number;
  turnTimeoutSeconds?: number;
  turnDelayMs?: number;
}

/**
 * Discussion statistics (Builder-3)
 */
export interface DiscussionStats {
  totalMessages: number;
  totalTurns: number;
  duration: number;
  totalCost: number;
  cacheHitRate: number;
  averageMessageLength: number;
  messagesPerAgent: Record<string, number>;
  threadingRate: number;
  successfulTurns: number;
  failedTurns: number;
  timedOutTurns: number;
}

/**
 * Discussion result (Builder-3)
 * Matches orchestrator.ts actual return structure
 */
export interface DiscussionResult {
  gameId: string;
  totalMessages: number;
  duration: number; // Duration in seconds
  totalTurns?: number; // Optional: total turns executed (if tracked)
  totalCost: number;
  cacheHitRate: number;
  completedRounds: number;
  timedOut: boolean;
  errors: string[];
}

/**
 * Cost tracking summary (Builder-2)
 * Consolidated from cost-tracker.ts - single source of truth
 */
export interface CostSummary {
  gameId: string;
  totalTurns: number;
  totalInputTokens: number;
  totalCacheCreationTokens: number;
  totalCachedTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  cacheHitRate: number;
  avgCostPerTurn: number;
  status: 'HEALTHY' | 'CACHING_ISSUE' | 'COST_EXCEEDED';
  warnings: string[];
}
