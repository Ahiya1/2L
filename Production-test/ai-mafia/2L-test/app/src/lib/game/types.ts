/**
 * Core game phase types for Iteration 2
 *
 * Defines the game state machine and phase-specific types
 */

export type GamePhase =
  | 'NIGHT'
  | 'DAY_ANNOUNCEMENT'
  | 'DISCUSSION'
  | 'VOTING'
  | 'WIN_CHECK'
  | 'GAME_OVER';

/**
 * Phase durations in milliseconds
 */
export const PHASE_DURATIONS = {
  NIGHT: 45 * 1000, // 45 seconds
  DAY_ANNOUNCEMENT: 10 * 1000, // 10 seconds
  DISCUSSION: 3 * 60 * 1000, // 3 minutes
  VOTING: 0, // Sequential, no fixed duration
  WIN_CHECK: 0, // Instant check
} as const;

/**
 * Phase durations in minutes (for Discussion orchestrator)
 */
export const PHASE_DURATIONS_MINUTES = {
  NIGHT: 0.75, // 45 seconds
  DAY_ANNOUNCEMENT: 0.17, // 10 seconds
  DISCUSSION: 3, // 3 minutes
} as const;

/**
 * Maximum rounds before forcing game end
 */
export const MAX_ROUNDS = 10;

/**
 * Win condition result
 */
export interface WinConditionResult {
  hasWinner: boolean;
  winner: 'MAFIA' | 'VILLAGERS' | null;
  reason: string;
  mafiaCount: number;
  villagerCount: number;
}

/**
 * Game result after completion
 */
export interface GameResult {
  winner: 'MAFIA' | 'VILLAGERS';
  finalRound: number;
  reason: string;
  totalDuration: number; // in seconds
}

/**
 * Phase transition metadata
 */
export interface PhaseTransition {
  from: GamePhase;
  to: GamePhase;
  round: number;
  timestamp: Date;
}

/**
 * Night phase result
 */
export interface NightPhaseResult {
  victim: string | null; // Player ID
  totalMessages: number;
  consensusReached: boolean;
}

/**
 * Day announcement phase result
 */
export interface DayAnnouncementResult {
  victimId: string | null;
  victimName: string | null;
  totalReactions: number;
}

/**
 * Voting phase result
 */
export interface VotingPhaseResult {
  eliminatedPlayer: string | null; // Player ID
  votes: Array<{ voterId: string; targetId: string }>;
  tally: Record<string, number>;
}

/**
 * Phase orchestrator interface
 * All phase orchestrators implement this interface
 */
export interface PhaseOrchestrator {
  run(gameId: string, dependencies: MasterOrchestratorDependencies): Promise<PhaseResult>;
}

/**
 * Generic phase result
 */
export interface PhaseResult {
  success: boolean;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

/**
 * Master orchestrator dependencies
 * Injected by game initialization
 */
export interface MasterOrchestratorDependencies {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateResponse: (context: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackCost: (data: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildAgentContext: (playerId: string, gameId: string) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCostSummary?: (gameId: string) => any;
}
