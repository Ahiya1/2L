/**
 * Event types for game orchestration and SSE streaming
 *
 * NOTE: Event type strings use lowercase with underscores (e.g., 'message', 'turn_start')
 * This is the canonical format used by the event emitter.
 */

import type { DiscussionMessage } from '../types/shared';

export type GameEventType =
  // Iteration 1 events (unchanged)
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete'
  // Iteration 2 new events
  | 'night_start'
  | 'night_complete'
  | 'nightkill'
  | 'day_reaction'
  | 'vote_cast'
  | 'voting_complete'
  | 'player_eliminated'
  | 'round_start'
  | 'game_over';

export type GameEvent =
  // Iteration 1 events
  | {
      gameId: string;
      type: 'message';
      payload: DiscussionMessage;
    }
  | {
      gameId: string;
      type: 'turn_start';
      payload: {
        playerId: string;
        playerName: string;
        turn: number;
        roundNumber: number;
      };
    }
  | {
      gameId: string;
      type: 'turn_end';
      payload: {
        playerId: string;
        playerName: string;
        turn: number;
        duration: number;
      };
    }
  | {
      gameId: string;
      type: 'phase_change';
      payload: {
        from: string;
        to: string;
        round?: number;
        phaseStartTime?: string; // ISO 8601 timestamp
        phaseEndTime?: string | null; // ISO 8601 timestamp or null for phases with no duration
      };
    }
  | {
      gameId: string;
      type: 'phase_complete';
      payload: {
        phase: string;
        duration: number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stats?: any;
      };
    }
  | {
      gameId: string;
      type: 'discussion_complete';
      payload: {
        totalMessages: number;
        duration: number;
        totalCost: number;
      };
    }
  // Iteration 2 new events
  | {
      gameId: string;
      type: 'night_start';
      payload: {
        round: number;
        mafiaCount: number;
      };
    }
  | {
      gameId: string;
      type: 'night_complete';
      payload: {
        round: number;
        totalMessages: number;
        victim: string | null;
        consensusReached: boolean;
      };
    }
  | {
      gameId: string;
      type: 'nightkill';
      payload: {
        victimId: string;
        victimName: string;
        round: number;
      };
    }
  | {
      gameId: string;
      type: 'day_reaction';
      payload: {
        playerId: string;
        playerName: string;
        message: string;
        round: number;
      };
    }
  | {
      gameId: string;
      type: 'vote_cast';
      payload: {
        voterId: string;
        voterName: string;
        targetId: string;
        targetName: string;
        justification: string;
        voteOrder: number;
        round: number;
      };
    }
  | {
      gameId: string;
      type: 'voting_complete';
      payload: {
        round: number;
        eliminatedPlayer: string | null;
        eliminatedPlayerName: string | null;
        tally: Record<string, number>;
      };
    }
  | {
      gameId: string;
      type: 'player_eliminated';
      payload: {
        playerId: string;
        playerName: string;
        eliminationType: 'NIGHTKILL' | 'DAYKILL';
        round: number;
      };
    }
  | {
      gameId: string;
      type: 'round_start';
      payload: {
        round: number;
        mafiaAlive: number;
        villagersAlive: number;
      };
    }
  | {
      gameId: string;
      type: 'game_over';
      payload: {
        winner: 'MAFIA' | 'VILLAGERS';
        finalRound: number;
        reason: string;
      };
    };
