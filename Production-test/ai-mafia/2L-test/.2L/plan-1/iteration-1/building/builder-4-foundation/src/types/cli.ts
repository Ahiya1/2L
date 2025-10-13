/**
 * CLI-specific TypeScript type definitions
 *
 * Shared types for CLI test harness, transcript generation,
 * and quality evaluation.
 */

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
 * Cost tracking summary (from cost-tracker utility)
 */
export interface CostSummary {
  totalTurns: number;
  totalInputTokens: number;
  totalCachedTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  cacheHitRate: number;
  avgCostPerTurn: number;
  status: 'HEALTHY' | 'CACHING_ISSUE';
}

/**
 * Game event types (SSE streaming)
 */
export type GameEventType =
  | 'CONNECTED'
  | 'NEW_MESSAGE'
  | 'TURN_START'
  | 'TURN_END'
  | 'PHASE_CHANGE'
  | 'DISCUSSION_COMPLETE';

export interface GameEvent {
  gameId: string;
  type: GameEventType;
  payload: any;
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
