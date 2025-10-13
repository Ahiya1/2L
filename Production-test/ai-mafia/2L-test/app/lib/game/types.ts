/**
 * Type definitions for Live Game UI components
 *
 * Shared types used across all game UI components
 */

import type { GameEvent } from '@/lib/events/types';

// Re-export backend types for API routes
export {
  PHASE_DURATIONS,
  PHASE_DURATIONS_MINUTES,
  MAX_ROUNDS,
  type WinConditionResult,
  type GameResult,
  type MasterOrchestratorDependencies,
} from '@/src/lib/game/types';

/**
 * Player data structure (roles hidden until game over)
 */
export interface UIPlayer {
  id: string;
  name: string;
  personality: string;
  isAlive: boolean;
  position: number;
  eliminatedInRound: number | null;
  eliminationType: 'NIGHTKILL' | 'DAYKILL' | null;
  role?: 'MAFIA' | 'VILLAGER'; // Only present in results page
}

/**
 * Game phase types
 */
export type GamePhase =
  | 'LOBBY'
  | 'NIGHT'
  | 'DAY_ANNOUNCEMENT'
  | 'DISCUSSION'
  | 'VOTING'
  | 'WIN_CHECK'
  | 'GAME_OVER';

/**
 * Phase display configuration
 */
export interface PhaseConfig {
  name: string;
  displayName: string;
  color: string;
  icon: string;
  duration: number; // seconds
}

/**
 * Vote data for tally display
 */
export interface VoteData {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
  justification: string;
  voteOrder: number;
}

/**
 * Game events context value
 */
export interface GameEventsContextValue {
  events: GameEvent[];
  isConnected: boolean;
  error: string | null;
  reconnectAttempts: number;
}

/**
 * Current game state
 */
export interface CurrentGameState {
  gameId: string;
  status: string;
  currentPhase: GamePhase | null;
  phaseStartTime: Date | null;
  roundNumber: number;
  winner: 'MAFIA' | 'VILLAGERS' | null;
  players: UIPlayer[];
}
