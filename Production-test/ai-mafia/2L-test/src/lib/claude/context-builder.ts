/**
 * Context Builder for AI Agents
 *
 * Builds agent context by fetching game history from database and formatting
 * it for Claude API consumption. Handles conversation history formatting,
 * game state summarization, and context size management.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { AgentContext, GameHistory } from './types';
import { generateSystemPrompt } from '../prompts/system-prompts';

/**
 * Format game state context for caching
 *
 * Creates a structured summary of the current game state that can be cached
 * by Claude API. This includes votes, eliminations, and round information.
 *
 * @param history - Game history data
 * @param playerRole - Current player's role (for context relevance)
 * @returns Formatted game state string
 */
export function formatGameState(history: GameHistory, playerRole: string): string {
  const voteSummary =
    history.votes.length > 0
      ? history.votes
          .map(
            (v) =>
              `- Round ${v.roundNumber}: ${v.voter.name} voted for ${v.target.name} ("${v.justification}")`
          )
          .join('\n')
      : '- No votes have been cast yet';

  const deathSummary =
    history.deaths.length > 0
      ? history.deaths.map((d) => `- ${d.name} (${d.role}) has been eliminated`).join('\n')
      : '- No players have been eliminated yet';

  return `CURRENT GAME STATE:
- Round: ${history.currentRound}
- Players alive: ${history.aliveCount}
- Total messages: ${history.messages.length}

PREVIOUS VOTES:
${voteSummary}

ELIMINATED PLAYERS:
${deathSummary}

DISCUSSION PHASE:
You are currently in the Discussion phase. All players are debating who they suspect might be Mafia. Listen carefully to accusations, defenses, and reasoning. Build or challenge cases based on evidence from the conversation.`;
}

/**
 * Format conversation messages for Claude API
 *
 * Converts database messages to Claude's message format. Maps player messages
 * to user/assistant roles (current player = assistant, others = user).
 *
 * @param messages - Discussion messages from database
 * @param currentPlayerId - ID of the player generating response
 * @param maxMessages - Maximum number of recent messages to include (default: 30)
 * @returns Formatted message history
 */
export function formatConversationHistory(
  messages: GameHistory['messages'],
  currentPlayerId: string,
  maxMessages: number = 30
): Anthropic.MessageParam[] {
  // Take only the most recent messages to stay within context limits
  const recentMessages = messages.slice(-maxMessages);

  // Convert to Claude message format
  const formattedMessages: Anthropic.MessageParam[] = [];

  for (const msg of recentMessages) {
    // Determine role: current player's past messages = assistant, others = user
    const role = msg.playerId === currentPlayerId ? 'assistant' : 'user';

    // Format with player name for clarity
    const content = `${msg.player.name}: ${msg.message}`;

    // Combine consecutive messages from same role
    const lastMessage = formattedMessages[formattedMessages.length - 1];
    if (lastMessage && lastMessage.role === role) {
      lastMessage.content += `\n${content}`;
    } else {
      formattedMessages.push({ role, content });
    }
  }

  // Claude requires first message to be from user
  if (formattedMessages.length > 0 && formattedMessages[0].role === 'assistant') {
    formattedMessages.shift();
  }

  // If no messages yet, provide initial context
  if (formattedMessages.length === 0) {
    formattedMessages.push({
      role: 'user',
      content:
        'The Discussion phase has begun. Share your initial thoughts or observations about the game.',
    });
  }

  return formattedMessages;
}

/**
 * Build complete agent context from game history
 *
 * This is the main function that orchestrates context building. It:
 * 1. Generates role-specific system prompt
 * 2. Formats game state for caching
 * 3. Formats conversation history
 *
 * @param player - Player information (id, name, role, personality)
 * @param history - Complete game history
 * @returns Complete agent context ready for Claude API
 */
export function buildAgentContext(
  player: {
    id: string;
    name: string;
    role: 'MAFIA' | 'VILLAGER';
    personality: string;
    isAlive: boolean;
  },
  history: GameHistory
): AgentContext {
  // Generate system prompt with role-specific strategy
  const systemPrompt = generateSystemPrompt(player.name, player.role, player.personality);

  // Format game state (cached for cost optimization)
  const gameStateContext = formatGameState(history, player.role);

  // Format conversation history (not cached, changes frequently)
  const conversationContext = formatConversationHistory(history.messages, player.id);

  return {
    player,
    systemPrompt,
    gameStateContext,
    conversationContext,
  };
}

/**
 * Calculate total context size in approximate tokens
 *
 * Rough estimation: 1 token ≈ 4 characters for English text
 *
 * @param context - Agent context
 * @returns Approximate token count
 */
export function estimateContextTokens(context: AgentContext): number {
  const systemPromptTokens = Math.ceil(context.systemPrompt.length / 4);
  const gameStateTokens = Math.ceil(context.gameStateContext.length / 4);

  const conversationTokens = context.conversationContext.reduce((sum, msg) => {
    const contentLength = typeof msg.content === 'string' ? msg.content.length : 0;
    return sum + Math.ceil(contentLength / 4);
  }, 0);

  return systemPromptTokens + gameStateTokens + conversationTokens;
}

/**
 * Validate context size
 *
 * Ensures context doesn't exceed Claude's limits (200K tokens for Sonnet 4.5).
 * In practice, we want to stay well below this for cost optimization.
 *
 * @param context - Agent context
 * @param maxTokens - Maximum allowed tokens (default: 150K for safety margin)
 * @returns Validation result
 */
export function validateContextSize(
  context: AgentContext,
  maxTokens: number = 150_000
): { isValid: boolean; tokenCount: number; error?: string } {
  const tokenCount = estimateContextTokens(context);

  if (tokenCount > maxTokens) {
    return {
      isValid: false,
      tokenCount,
      error: `Context size (${tokenCount} tokens) exceeds maximum (${maxTokens} tokens)`,
    };
  }

  return {
    isValid: true,
    tokenCount,
  };
}
