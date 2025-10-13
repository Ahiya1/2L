/**
 * Zod validation schemas for API endpoints
 *
 * Provides type-safe validation for all request/response types
 */

import { z } from 'zod';

/**
 * POST /api/game/create
 */
export const CreateGameSchema = z.object({
  playerCount: z.number().int().min(8).max(12),
});

export type CreateGameRequest = z.infer<typeof CreateGameSchema>;

export type CreateGameResponse = {
  gameId: string;
};

/**
 * GET /api/game/[gameId]/messages
 */
export const GetMessagesSchema = z.object({
  round: z.string().optional(),
});

export type GetMessagesQuery = z.infer<typeof GetMessagesSchema>;

export type GetMessagesResponse = {
  messages: Array<{
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: string;
    roundNumber: number;
    turn: number;
    inReplyToId: string | null;
  }>;
  total: number;
  hasMore: boolean;
};

/**
 * GET /api/game/[gameId]/votes
 */
export const GetVotesSchema = z.object({
  round: z.string().optional(),
});

export type GetVotesQuery = z.infer<typeof GetVotesSchema>;

export type GetVotesResponse = {
  votes: Array<{
    id: string;
    voterId: string;
    voterName: string;
    targetId: string;
    targetName: string;
    justification: string;
    voteOrder: number;
    timestamp: string;
  }>;
  tally: Record<string, number>;
  round: number;
};

/**
 * GET /api/game/[gameId]/state
 */
export type GameStateResponse = {
  game: {
    id: string;
    status: string;
    currentPhase: string | null;
    phaseStartTime: string | null;
    roundNumber: number;
    winner: string | null;
    playerCount: number;
  };
  players: Array<{
    id: string;
    name: string;
    role: string;
    personality: string;
    isAlive: boolean;
    position: number;
    eliminatedInRound: number | null;
    eliminationType: string | null;
  }>;
  phaseEndTime: string | null;
};

/**
 * GET /api/game/[gameId]/results
 */
export type GameResultsResponse = {
  game: {
    id: string;
    status: string;
    winner: string;
    roundNumber: number;
    playerCount: number;
    createdAt: string;
  };
  players: Array<{
    id: string;
    name: string;
    role: string; // Revealed after game over
    personality: string;
    isAlive: boolean;
    position: number;
    eliminatedInRound: number | null;
    eliminationType: string | null;
  }>;
  messages: Array<{
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: string;
    roundNumber: number;
    turn: number;
  }>;
  votes: Array<{
    id: string;
    voterId: string;
    voterName: string;
    targetId: string;
    targetName: string;
    justification: string;
    voteOrder: number;
    roundNumber: number;
    timestamp: string;
  }>;
  nightMessages: Array<{
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: string;
    roundNumber: number;
    turn: number;
  }>;
};

/**
 * POST /api/game/[gameId]/start
 */
export type StartGameResponse = {
  success: true;
  gameId: string;
  message: string;
};
