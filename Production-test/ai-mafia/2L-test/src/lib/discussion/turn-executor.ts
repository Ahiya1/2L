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
import type { TurnResult, DiscussionMessage, Player, TokenUsage } from '../types/shared';

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
    prisma: any; // Placeholder until Builder-1 completes
    buildContext: (playerId: string, gameId: string) => Promise<any>;
    generateResponse: (context: any) => Promise<{ text: string; usage: TokenUsage }>;
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
      type: 'TURN_START',
      payload: {
        playerId: player.id,
        playerName: player.name,
        turn,
        roundNumber,
      },
    });

    // Step 1: Build agent context
    const context = await buildContext(playerId, gameId);

    // Step 2: Generate response with 10-second timeout
    const { text, usage, timedOut, usedFallback } = await generateWithTimeout(
      () => generateResponse(context),
      10000,
      player
    );

    // Step 3: Validate response
    if (!isValidMessage(text)) {
      console.warn(
        `[Turn Executor] Invalid response from ${player.name}: "${text.substring(0, 50)}..."`
      );

      const duration = Date.now() - startTime;

      // Emit turn end event
      gameEventEmitter.emitGameEvent('turn_end', {
        gameId,
        type: 'TURN_END',
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

    // Step 4: Determine threading (reply-to logic)
    const recentMessages: DiscussionMessage[] = await prisma.discussionMessage.findMany({
      where: { gameId },
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: { player: true },
    });

    const inReplyToId = determineReplyTarget(text, recentMessages);

    // Step 5: Save message to database
    const savedMessage: DiscussionMessage = await prisma.discussionMessage.create({
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

    // Step 6: Emit event for SSE streaming
    gameEventEmitter.emitGameEvent('message', {
      gameId,
      type: 'NEW_MESSAGE',
      payload: savedMessage,
    });

    // Step 7: Track cost
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
      type: 'TURN_END',
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
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error(`[Turn Executor] Error executing turn for player ${playerId}:`, error);

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
  } catch (error: any) {
    if (error.message === 'Agent response timeout') {
      console.warn(`[Turn Executor] Agent ${player.name} timed out, using fallback`);

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
    console.warn(
      `[Turn Executor] Agent ${player.name} encountered error: ${error.message}, using fallback`
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

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
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
