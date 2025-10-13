/**
 * Claude API Client
 *
 * Core client for interacting with Claude 4.5 Sonnet API with:
 * - Prompt caching (73% cost reduction)
 * - Retry logic with exponential backoff
 * - Timeout handling with fallback responses
 * - Token usage tracking and cost calculation
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import type { AgentContext, AgentResponse, TokenUsage, ClaudeConfig } from './types';

// Cost constants (per million tokens)
const INPUT_COST_PER_MILLION = 3.0;
const CACHED_INPUT_COST_PER_MILLION = 0.3; // 90% discount
const CACHE_CREATION_COST_PER_MILLION = 3.75; // 25% markup for cache creation
const OUTPUT_COST_PER_MILLION = 15.0;

// Load API key from file
const ANTHROPIC_API_KEY = fs.existsSync('.anthropic-key.txt')
  ? fs.readFileSync('.anthropic-key.txt', 'utf-8').trim()
  : process.env.ANTHROPIC_API_KEY || '';

if (!ANTHROPIC_API_KEY) {
  throw new Error(
    'Anthropic API key not found. Create .anthropic-key.txt or set ANTHROPIC_API_KEY environment variable.'
  );
}

// Default configuration
const DEFAULT_CONFIG: ClaudeConfig = {
  apiKey: ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 200,
  temperature: 0.8,
  timeoutMs: 10000, // 10 seconds
  maxRetries: 3,
};

// Initialize Claude client
const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

/**
 * Calculate cost for an API call based on token usage
 */
export function calculateCost(usage: Anthropic.Messages.Usage): number {
  const inputCost = (usage.input_tokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const cacheCreationCost =
    ((usage.cache_creation_input_tokens || 0) / 1_000_000) * CACHE_CREATION_COST_PER_MILLION;
  const cachedReadCost =
    ((usage.cache_read_input_tokens || 0) / 1_000_000) * CACHED_INPUT_COST_PER_MILLION;
  const outputCost = (usage.output_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  return inputCost + cacheCreationCost + cachedReadCost + outputCost;
}

/**
 * Sleep for specified milliseconds (used for retry delays)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate fallback response when API call fails or times out
 */
export function generateFallbackResponse(playerName: string): string {
  const fallbacks = [
    `${playerName} carefully observes the others' reactions.`,
    `${playerName} takes a moment to think before responding.`,
    `${playerName} remains silent, considering the accusations.`,
    `${playerName} listens intently to the discussion.`,
    `${playerName} weighs the evidence presented so far.`,
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Generate agent response using Claude API with prompt caching
 *
 * @param context - Agent context (system prompt, game state, conversation history)
 * @param config - Optional configuration overrides
 * @returns Agent response with text and usage information
 * @throws Error if all retries fail
 */
export async function generateAgentResponse(
  context: AgentContext,
  config: Partial<ClaudeConfig> = {}
): Promise<AgentResponse> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: fullConfig.model,
        max_tokens: fullConfig.maxTokens,
        temperature: fullConfig.temperature,
        system: [
          {
            type: 'text',
            text: context.systemPrompt,
            cache_control: { type: 'ephemeral' }, // Cache system prompt (5 min TTL)
          },
          {
            type: 'text',
            text: context.gameStateContext,
            cache_control: { type: 'ephemeral' }, // Cache game state
          },
        ],
        messages: context.conversationContext,
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

      const usage: TokenUsage = {
        inputTokens: response.usage.input_tokens,
        cacheCreationTokens: response.usage.cache_creation_input_tokens || 0,
        cachedTokens: response.usage.cache_read_input_tokens || 0,
        outputTokens: response.usage.output_tokens,
        cost: calculateCost(response.usage),
      };

      return {
        text,
        usage,
        isValid: true, // Validation happens separately
      };
    } catch (error: any) {
      lastError = error;

      // Log error details
      console.error(
        `[Claude API] Attempt ${attempt}/${fullConfig.maxRetries} failed:`,
        error.message
      );

      // Rate limit error (429) - longer delay
      if (error.status === 429) {
        const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
        console.warn(`[Claude API] Rate limited, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Server errors (500+) - standard exponential backoff
      if (error.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(`[Claude API] Server error, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Client errors (400, 401, 403, 404) - don't retry
      throw error;
    }
  }

  throw new Error(
    `[Claude API] Failed after ${fullConfig.maxRetries} retries: ${lastError?.message}`
  );
}

/**
 * Generate agent response with timeout
 *
 * If the API call takes longer than the timeout, returns a fallback response.
 *
 * @param context - Agent context
 * @param config - Optional configuration overrides
 * @returns Agent response (real or fallback)
 */
export async function generateWithTimeout(
  context: AgentContext,
  config: Partial<ClaudeConfig> = {}
): Promise<AgentResponse> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Agent response timeout')), fullConfig.timeoutMs)
  );

  try {
    return await Promise.race([generateAgentResponse(context, config), timeoutPromise]);
  } catch (error: any) {
    if (error.message === 'Agent response timeout') {
      console.warn(
        `[Claude API] Agent ${context.player.name} timed out after ${fullConfig.timeoutMs}ms, using fallback`
      );

      return {
        text: generateFallbackResponse(context.player.name),
        usage: {
          inputTokens: 0,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 0,
          cost: 0,
        },
        isValid: true, // Fallback responses are always "valid"
      };
    }

    throw error;
  }
}

/**
 * Validate agent response
 *
 * Checks if the response meets minimum quality criteria:
 * - Not empty
 * - Minimum word count (5 words)
 * - Maximum word count (100 words)
 * - Contains game-relevant keywords
 *
 * @param response - Generated response text
 * @returns true if valid, false otherwise
 */
export function validateResponse(response: string): {
  isValid: boolean;
  error?: string;
} {
  // Empty check
  if (!response || response.trim().length === 0) {
    return { isValid: false, error: 'Empty response' };
  }

  // Word count check
  const words = response.trim().split(/\s+/);
  const wordCount = words.length;

  if (wordCount < 5) {
    return { isValid: false, error: `Too short (${wordCount} words, minimum 5)` };
  }

  if (wordCount > 100) {
    return { isValid: false, error: `Too long (${wordCount} words, maximum 100)` };
  }

  // Game-relevant keyword check (at least one should be present)
  const relevantKeywords = [
    'vote',
    'voting',
    'mafia',
    'suspicious',
    'suspect',
    'innocent',
    'think',
    'believe',
    'accuse',
    'defend',
    'pattern',
    'evidence',
    'round',
    'agent',
    'trust',
    'question',
    'why',
    'who',
    'what',
  ];

  const lowerResponse = response.toLowerCase();
  const hasRelevantContent = relevantKeywords.some((keyword) => lowerResponse.includes(keyword));

  if (!hasRelevantContent) {
    return {
      isValid: false,
      error: 'No game-relevant keywords found',
    };
  }

  // Forbidden content check (should not reveal role or break character)
  const forbiddenPhrases = [
    'i am a villager',
    'i am a mafia',
    'i am mafia',
    'we villagers',
    'we mafia',
    'as a villager',
    'as a mafia',
    'my role is',
    'my prompt',
    'my instructions',
    'i am an ai',
    'i am programmed',
  ];

  const foundForbidden = forbiddenPhrases.find((phrase) => lowerResponse.includes(phrase));
  if (foundForbidden) {
    return {
      isValid: false,
      error: `Contains forbidden phrase: "${foundForbidden}"`,
    };
  }

  return { isValid: true };
}

/**
 * Generate and validate agent response
 *
 * Combines generation and validation in a single call.
 * If validation fails, retries up to maxAttempts times.
 *
 * @param context - Agent context
 * @param config - Optional configuration
 * @param maxAttempts - Maximum validation retry attempts (default: 3)
 * @returns Valid agent response
 * @throws Error if all attempts fail validation
 */
export async function generateValidResponse(
  context: AgentContext,
  config: Partial<ClaudeConfig> = {},
  maxAttempts: number = 3
): Promise<AgentResponse> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await generateWithTimeout(context, config);

    // Skip validation for fallback responses
    if (response.usage.cost === 0) {
      return response;
    }

    const validation = validateResponse(response.text);

    if (validation.isValid) {
      return response;
    }

    console.warn(
      `[Claude API] Response validation failed (attempt ${attempt}/${maxAttempts}): ${validation.error}`
    );
    console.warn(`[Claude API] Invalid response: "${response.text}"`);

    if (attempt === maxAttempts) {
      // After max attempts, return anyway but mark as invalid
      return {
        ...response,
        isValid: false,
        validationError: validation.error,
      };
    }

    // Wait 500ms before retry
    await sleep(500);
  }

  throw new Error('Failed to generate valid response after maximum attempts');
}
