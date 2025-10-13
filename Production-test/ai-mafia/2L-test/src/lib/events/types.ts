/**
 * Event types for game orchestration and SSE streaming
 */

import type { DiscussionMessage } from '../types/shared';

export type GameEventType =
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete';

export type GameEvent =
  | {
      gameId: string;
      type: 'NEW_MESSAGE';
      payload: DiscussionMessage;
    }
  | {
      gameId: string;
      type: 'TURN_START';
      payload: {
        playerId: string;
        playerName: string;
        turn: number;
        roundNumber: number;
      };
    }
  | {
      gameId: string;
      type: 'TURN_END';
      payload: {
        playerId: string;
        playerName: string;
        turn: number;
        duration: number;
      };
    }
  | {
      gameId: string;
      type: 'PHASE_CHANGE';
      payload: {
        from: string;
        to: string;
      };
    }
  | {
      gameId: string;
      type: 'PHASE_COMPLETE';
      payload: {
        phase: string;
        duration: number;
        stats?: any;
      };
    }
  | {
      gameId: string;
      type: 'DISCUSSION_COMPLETE';
      payload: {
        totalMessages: number;
        duration: number;
        totalCost: number;
      };
    };
