/**
 * Shared types for AI Mafia game
 * Used across all builders for consistent interfaces
 */

// Placeholder for Prisma types until Builder-1 completes
// These match the expected database schema from patterns.md
export interface Player {
  id: string;
  gameId: string;
  name: string;
  role: 'MAFIA' | 'VILLAGER';
  personality: string;
  isAlive: boolean;
  position: number;
}

export interface DiscussionMessage {
  id: string;
  gameId: string;
  roundNumber: number;
  playerId: string;
  message: string;
  inReplyToId: string | null;
  timestamp: Date;
  turn: number;
  player: Player;
  inReplyTo?: DiscussionMessage & { player: Player };
}

export interface Vote {
  id: string;
  gameId: string;
  roundNumber: number;
  voterId: string;
  targetId: string;
  justification: string;
  timestamp: Date;
  voter: Player;
  target: Player;
}

export interface Game {
  id: string;
  status: string;
  currentPhase: string | null;
  phaseEndTime: Date | null;
  roundNumber: number;
  winner: string | null;
  playerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Agent context for Claude API (from Builder-2)
export interface AgentContext {
  player: Player;
  systemPrompt: string;
  gameStateContext: string;
  conversationContext: MessageParam[];
}

// Anthropic API message parameter
export interface MessageParam {
  role: 'user' | 'assistant';
  content: string;
}

// Token usage tracking
export interface TokenUsage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  cost: number;
}

// Game history for context building
export interface GameHistory {
  messages: DiscussionMessage[];
  votes: Vote[];
  deaths: Player[];
}

// Turn schedule for orchestration
export interface TurnSchedule {
  totalRounds: number;
  currentRound: number;
  currentTurnIndex: number;
  remainingTime: number;
}

// Discussion statistics
export interface DiscussionStats {
  totalMessages: number;
  duration: number;
  totalCost: number;
  cacheHitRate: number;
  averageMessageLength: number;
  messagesPerAgent: Record<string, number>;
}
