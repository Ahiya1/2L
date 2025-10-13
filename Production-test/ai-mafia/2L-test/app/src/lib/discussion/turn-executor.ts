/**
 * Turn executor for discussion phase
 *
 * Executes a single agent turn:
 * 1. Build agent context (from Builder-2)
 * 2. Call Claude API with 10-second timeout
 * 3. Validate response
 * 4. Determine threading (reply-to)
 * 5. Save message to database
 * 6. Emit event for SSE streaming
 * 7. Track cost
 *
 * Features:
 * - 10-second timeout (MANDATORY)
 * - Fallback response on timeout
 * - Error handling (retry + graceful degradation)
 * - Integration with Builder-2 Claude client
 */

import { gameEventEmitter } from '../events/emitter';
import { determineReplyTarget } from './threading';
import type { TurnResult, DiscussionMessage, Player, TokenUsage, GameHistory } from '../types/shared';
import { buildAgentContext as buildContextFromHistory } from '../claude/context-builder';
import type { AgentContext } from '../claude/types';
import { costTracker } from '../../utils/cost-tracker';
import { discussionLogger } from '../logger';
import { addAgentMessage } from '@/src/utils/repetition-tracker';

/**
 * Wrapper function that bridges orchestrator's signature with Builder-2's context builder
 *
 * Orchestrator provides: (playerId: string, gameId: string)
 * Builder-2 expects: (player: Player, history: GameHistory)
 *
 * This function:
 * 1. Fetches Player from database
 * 2. Constructs GameHistory by querying messages, votes, game state
 * 3. Calls Builder-2's buildAgentContext with proper types
 *
 * @param playerId - Player ID (what orchestrator has)
 * @param gameId - Game ID (what orchestrator has)
 * @param prisma - Prisma client for database queries
 * @returns Agent context ready for Claude API
 */
export async function buildAgentContextWrapper(
  playerId: string,
  gameId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<AgentContext> {
  // Step 1: Fetch player with required fields
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: playerId },
    select: {
      id: true,
      name: true,
      role: true,
      personality: true,
      isAlive: true,
    },
  });

  // Step 2: Fetch game state for current round and alive count
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    select: {
      roundNumber: true,
    },
  });

  const aliveCount = await prisma.player.count({
    where: {
      gameId,
      isAlive: true,
    },
  });

  // Step 3: Fetch all messages with player relations
  const messages = await prisma.discussionMessage.findMany({
    where: { gameId },
    orderBy: { timestamp: 'asc' },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          role: true,
          isAlive: true,
        },
      },
    },
  });

  // Step 4: Fetch all votes with voter and target relations
  const votes = await prisma.vote.findMany({
    where: { gameId },
    orderBy: { timestamp: 'asc' },
    include: {
      voter: {
        select: {
          name: true,
        },
      },
      target: {
        select: {
          name: true,
        },
      },
    },
  });

  // Step 5: Fetch eliminated players (deaths)
  const deaths = await prisma.player.findMany({
    where: {
      gameId,
      isAlive: false,
    },
    select: {
      id: true,
      name: true,
      role: true,
      isAlive: true,
    },
  });

  // Step 6: Construct GameHistory object
  const history: GameHistory = {
    messages,
    votes,
    deaths,
    currentRound: game.roundNumber,
    aliveCount,
  };

  // Step 7: Call Builder-2's original function
  // Cast player.role from string to 'MAFIA' | 'VILLAGER' (safe at runtime)
  return buildContextFromHistory(
    {
      id: player.id,
      name: player.name,
      role: player.role as 'MAFIA' | 'VILLAGER',
      personality: player.personality,
      isAlive: player.isAlive,
    },
    history
  );
}

/**
 * Execute a single agent turn
 *
 * @param playerId Agent player ID
 * @param gameId Game ID
 * @param roundNumber Current round number
 * @param turn Turn number within discussion
 * @param prisma Prisma client (from Builder-1)
 * @param buildContext Context builder function (from Builder-2)
 * @param generateResponse Claude API function (from Builder-2)
 * @param trackCost Cost tracking function (from Builder-2)
 * @returns Turn result with success status and message
 */
export async function executeTurn(
  playerId: string,
  gameId: string,
  roundNumber: number,
  turn: number,
  dependencies: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma: any; // Placeholder until Builder-1 completes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildContext: (playerId: string, gameId: string) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generateResponse: (context: any) => Promise<{ text: string; usage: TokenUsage }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trackCost: (data: any) => void;
  }
): Promise<TurnResult> {
  const startTime = Date.now();
  const { prisma, buildContext, generateResponse, trackCost } = dependencies;

  try {
    // Get player info for event emission
    const player: Player = await prisma.player.findUniqueOrThrow({
      where: { id: playerId },
    });

    // Emit turn start event
    gameEventEmitter.emitGameEvent('turn_start', {
      gameId,
      type: 'turn_start',
      payload: {
        playerId: player.id,
        playerName: player.name,
        turn,
        roundNumber,
      },
    });

    // Step 1: Check cost limit (circuit breaker)
    costTracker.checkCostLimitOrThrow(gameId);

    // Step 2: Build agent context
    const context = await buildContext(playerId, gameId);

    // Step 3: Generate response with 10-second timeout
    const { text, usage, timedOut, usedFallback } = await generateWithTimeout(
      () => generateResponse(context),
      10000,
      player
    );

    // Step 4: Validate response
    if (!isValidMessage(text)) {
      discussionLogger.warn(
        { gameId, playerId: player.id, playerName: player.name, turn, roundNumber, message: text.substring(0, 50) },
        'Invalid response from agent'
      );

      const duration = Date.now() - startTime;

      // Emit turn end event
      gameEventEmitter.emitGameEvent('turn_end', {
        gameId,
        type: 'turn_end',
        payload: {
          playerId: player.id,
          playerName: player.name,
          turn,
          duration,
        },
      });

      return {
        success: false,
        error: 'Invalid message content',
        duration,
        timedOut: false,
        usedFallback: false,
      };
    }

    // Step 5: Determine threading (reply-to logic)
    const recentMessages = await prisma.discussionMessage.findMany({
      where: { gameId },
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: { player: true },
    });

    // Type assertion: Prisma includes player relation
    const messagesWithPlayer = recentMessages as Array<DiscussionMessage & { player: Player }>;
    const inReplyToId = determineReplyTarget(text, messagesWithPlayer);

    // Step 6: Save message to database
    const savedMessage = await prisma.discussionMessage.create({
      data: {
        gameId,
        playerId,
        roundNumber,
        message: text,
        inReplyToId,
        turn,
        timestamp: new Date(),
      },
      include: {
        player: true,
        inReplyTo: {
          include: { player: true },
        },
      },
    });

    // Step 6b: Track message phrases for anti-repetition
    addAgentMessage(playerId, text);

    // Step 7: Emit event for SSE streaming
    gameEventEmitter.emitGameEvent('message', {
      gameId,
      type: 'message',
      payload: savedMessage,
    });

    // Step 8: Track cost
    trackCost({
      gameId,
      playerId,
      turn,
      ...usage,
      timestamp: new Date(),
    });

    const duration = Date.now() - startTime;

    // Emit turn end event
    gameEventEmitter.emitGameEvent('turn_end', {
      gameId,
      type: 'turn_end',
      payload: {
        playerId: player.id,
        playerName: player.name,
        turn,
        duration,
      },
    });

    return {
      success: true,
      message: savedMessage,
      duration,
      timedOut,
      usedFallback,
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const duration = Date.now() - startTime;

    discussionLogger.error(
      { gameId, playerId, turn, roundNumber, error: error.message, stack: error.stack },
      'Error executing turn'
    );

    return {
      success: false,
      error: error.message || 'Unknown error',
      duration,
      timedOut: false,
      usedFallback: false,
    };
  }
}

/**
 * Execute function with timeout
 * Returns fallback response if timeout exceeded
 */
async function generateWithTimeout(
  fn: () => Promise<{ text: string; usage: TokenUsage }>,
  timeoutMs: number,
  player: Player
): Promise<{ text: string; usage: TokenUsage; timedOut: boolean; usedFallback: boolean }> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Agent response timeout')), timeoutMs)
  );

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    return {
      ...result,
      timedOut: false,
      usedFallback: false,
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.message === 'Agent response timeout') {
      discussionLogger.warn(
        { playerId: player.id, playerName: player.name },
        'Agent timed out, using fallback'
      );

      return {
        text: generateFallbackResponse(player),
        usage: {
          inputTokens: 0,
          cachedTokens: 0,
          outputTokens: 0,
          cost: 0,
        },
        timedOut: true,
        usedFallback: true,
      };
    }

    // For other errors, still use fallback
    discussionLogger.warn(
      { playerId: player.id, playerName: player.name, error: error.message },
      'Agent encountered error, using fallback'
    );

    return {
      text: generateFallbackResponse(player),
      usage: {
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        cost: 0,
      },
      timedOut: false,
      usedFallback: true,
    };
  }
}

/**
 * Generate fallback response when agent times out or fails
 */
function generateFallbackResponse(player: Player): string {
  const fallbacks = [
    `${player.name} carefully observes the others' reactions.`,
    `${player.name} takes a moment to think before responding.`,
    `${player.name} remains silent, considering the accusations.`,
    `${player.name} listens intently to the discussion.`,
    `${player.name} weighs the evidence presented so far.`,
  ];

  const index = Math.floor(Math.random() * fallbacks.length);
  return fallbacks[index] || fallbacks[0]!;
}

/**
 * Validate message content
 * Requirements:
 * - Minimum 5 words
 * - Maximum 100 words
 * - Contains game-relevant keywords
 */
function isValidMessage(message: string): boolean {
  // Minimum length (prevent empty responses)
  const words = message.trim().split(/\s+/);
  const wordCount = words.length;

  if (wordCount < 5) {
    return false;
  }

  // Maximum length (prevent runaway generation)
  if (wordCount > 100) {
    return false;
  }

  // Must contain some text (not just punctuation)
  if (message.trim().length < 10) {
    return false;
  }

  // Optional: Check for game-relevant content
  // This is lenient to allow natural conversation
  const relevantKeywords = [
    'vote',
    'mafia',
    'suspicious',
    'innocent',
    'think',
    'believe',
    'accuse',
    'defend',
    'trust',
    'observe',
    'pattern',
    'evidence',
    'round',
    'night',
    'day',
    'eliminated',
    'agent',
    'player',
  ];

  const lowerMessage = message.toLowerCase();
  const hasRelevantContent = relevantKeywords.some((kw) => lowerMessage.includes(kw));

  // If message is descriptive (fallback), allow it
  const isFallback = /carefully observes|takes a moment|remains silent|listens intently|weighs the evidence/.test(
    message
  );

  return hasRelevantContent || isFallback;
}
