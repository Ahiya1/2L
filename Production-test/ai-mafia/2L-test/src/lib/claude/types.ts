/**
 * Claude API Integration Types
 *
 * Type definitions for Claude API interactions, token usage tracking,
 * and agent context management.
 */

import type Anthropic from '@anthropic-ai/sdk';

/**
 * Token usage and cost information for a single API call
 */
export interface TokenUsage {
  /** Total input tokens (fresh content) */
  inputTokens: number;

  /** Input tokens that were created in cache */
  cacheCreationTokens: number;

  /** Input tokens that were read from cache (90% cost savings) */
  cachedTokens: number;

  /** Output tokens generated */
  outputTokens: number;

  /** Total cost in USD for this API call */
  cost: number;
}

/**
 * Complete context needed for an agent to generate a response
 */
export interface AgentContext {
  /** Player information from database */
  player: {
    id: string;
    name: string;
    role: 'MAFIA' | 'VILLAGER';
    personality: string;
    isAlive: boolean;
  };

  /** System prompt (role-specific strategy, personality, guidelines) */
  systemPrompt: string;

  /** Game state context (current round, alive players, votes, deaths) */
  gameStateContext: string;

  /** Conversation history formatted for Claude */
  conversationContext: Anthropic.MessageParam[];
}

/**
 * Game history data used to build agent context
 */
export interface GameHistory {
  /** All discussion messages in chronological order */
  messages: Array<{
    id: string;
    playerId: string;
    player: {
      id: string;
      name: string;
      role: string;
      isAlive: boolean;
    };
    message: string;
    roundNumber: number;
    turn: number;
    timestamp: Date;
    inReplyToId: string | null;
  }>;

  /** All votes cast (may be empty in Iteration 1) */
  votes: Array<{
    id: string;
    voterId: string;
    targetId: string;
    voter: { name: string };
    target: { name: string };
    justification: string;
    roundNumber: number;
    timestamp: Date;
  }>;

  /** Players who have been eliminated */
  deaths: Array<{
    id: string;
    name: string;
    role: string;
    isAlive: boolean;
  }>;

  /** Current round number */
  currentRound: number;

  /** Total number of alive players */
  aliveCount: number;
}

/**
 * Response from Claude API with validation
 */
export interface AgentResponse {
  /** Generated text response */
  text: string;

  /** Token usage and cost information */
  usage: TokenUsage;

  /** Whether response passed validation */
  isValid: boolean;

  /** Validation failure reason (if any) */
  validationError?: string;
}

/**
 * Configuration for Claude API client
 */
export interface ClaudeConfig {
  /** Anthropic API key */
  apiKey: string;

  /** Model to use (claude-sonnet-4-5-20250929) */
  model: string;

  /** Maximum tokens to generate */
  maxTokens: number;

  /** Temperature for generation (0.8 for creative deception) */
  temperature: number;

  /** Timeout in milliseconds (10 seconds) */
  timeoutMs: number;

  /** Maximum retry attempts for rate limits/server errors */
  maxRetries: number;
}
