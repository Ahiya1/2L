/**
 * CLI-specific TypeScript type definitions
 *
 * Shared types for CLI test harness, transcript generation,
 * and quality evaluation.
 */

import type { CostSummary } from './shared';

// Re-export shared types for convenience
export type { CostSummary };

/**
 * Complete transcript data structure (JSON format)
 */
export interface TranscriptData {
  gameId: string;
  timestamp: string;
  metadata: TranscriptMetadata;
  players: TranscriptPlayer[];
  messages: TranscriptMessage[];
  votes: TranscriptVote[];
}

export interface TranscriptMetadata {
  playerCount: number;
  mafiaCount: number;
  villagerCount: number;
  totalTurns: number;
  durationSeconds: number;
  avgMessageLength: number;
  cost: CostDetails;
}

export interface CostDetails {
  totalCost: number;
  totalInputTokens: number;
  totalCachedTokens: number;
  totalOutputTokens: number;
  cacheHitRate: number;
  avgCostPerTurn: number;
}

export interface TranscriptPlayer {
  name: string;
  role: string;
  personality: string;
  isAlive: boolean;
  position: number;
}

export interface TranscriptMessage {
  turn: number;
  roundNumber: number;
  playerName: string;
  message: string;
  timestamp: string;
  inReplyToId: string | null;
  inReplyToPlayer: string | null;
}

export interface TranscriptVote {
  roundNumber: number;
  voterName: string;
  targetName: string;
  justification: string;
  timestamp: string;
}

/**
 * Quality evaluation metrics
 */
export interface QualityMetrics {
  memoryAccuracy: MetricResult;
  strategicDepth: MetricResult;
  coherence: MetricResult;
  roleConsistency: MetricResult;
  personalityDiversity: MetricResult;
  antiRepetition: MetricResult;
  engagement: MetricResult;
}

export interface MetricResult {
  score: number;
  threshold: number;
  pass: boolean;
}

/**
 * Overall evaluation result
 */
export interface EvaluationResult {
  metrics: QualityMetrics;
  passCount: number;
  totalMetrics: number;
  overallPass: boolean;
  timestamp: string;
}

/**
 * Test configuration options
 */
export interface TestConfig {
  playerCount: number;
  mafiaCount: number;
  durationMinutes: number;
  personalities: string[];
}

/**
 * CLI display options
 */
export interface DisplayOptions {
  verbose: boolean;
  colors: boolean;
  showTimestamps: boolean;
  showRoles: boolean;
}
