/**
 * Tests for Claude API Client
 *
 * Validates response generation, retry logic, timeout handling,
 * cost calculation, and response validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentContext } from '../types';

// Set mock API key BEFORE importing client
process.env.ANTHROPIC_API_KEY = 'test-api-key-for-testing';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk');

// Mock fs module to avoid file system access during tests
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn(),
}));

// Import after mocks are set up
import Anthropic from '@anthropic-ai/sdk';
import {
  generateAgentResponse,
  generateWithTimeout,
  generateValidResponse,
  calculateCost,
  validateResponse,
  generateFallbackResponse,
} from '../client';

describe('Claude Client', () => {
  // Test context
  const mockContext: AgentContext = {
    player: {
      id: 'player-1',
      name: 'Agent-Alpha',
      role: 'VILLAGER',
      personality: 'analytical',
      isAlive: true,
    },
    systemPrompt: 'You are a villager in a Mafia game.',
    gameStateContext: 'Round 1, 10 players alive.',
    conversationContext: [
      {
        role: 'user',
        content: 'What do you think about the accusations?',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateCost', () => {
    it('should calculate cost with only input and output tokens', () => {
      const usage: Anthropic.Messages.Usage = {
        input_tokens: 1000,
        output_tokens: 200,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      };

      const cost = calculateCost(usage);

      // input: 1000/1M * $3 = $0.003
      // output: 200/1M * $15 = $0.003
      // Total: $0.006
      expect(cost).toBeCloseTo(0.006, 6);
    });

    it('should calculate cost with cache read (90% discount)', () => {
      const usage: Anthropic.Messages.Usage = {
        input_tokens: 1000,
        output_tokens: 200,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 5000,
      };

      const cost = calculateCost(usage);

      // input: 1000/1M * $3 = $0.003
      // cache_read: 5000/1M * $0.3 = $0.0015
      // output: 200/1M * $15 = $0.003
      // Total: $0.0075
      expect(cost).toBeCloseTo(0.0075, 6);
    });

    it('should calculate cost with cache creation (25% markup)', () => {
      const usage: Anthropic.Messages.Usage = {
        input_tokens: 1000,
        output_tokens: 200,
        cache_creation_input_tokens: 3000,
        cache_read_input_tokens: 0,
      };

      const cost = calculateCost(usage);

      // input: 1000/1M * $3 = $0.003
      // cache_creation: 3000/1M * $3.75 = $0.01125
      // output: 200/1M * $15 = $0.003
      // Total: $0.01725
      expect(cost).toBeCloseTo(0.01725, 6);
    });

    it('should handle all token types together', () => {
      const usage: Anthropic.Messages.Usage = {
        input_tokens: 500,
        output_tokens: 100,
        cache_creation_input_tokens: 1000,
        cache_read_input_tokens: 2000,
      };

      const cost = calculateCost(usage);

      // input: 500/1M * $3 = $0.0015
      // cache_creation: 1000/1M * $3.75 = $0.00375
      // cache_read: 2000/1M * $0.3 = $0.0006
      // output: 100/1M * $15 = $0.0015
      // Total: $0.0069
      expect(cost).toBeCloseTo(0.0069, 6);
    });
  });

  describe('validateResponse', () => {
    it('should validate a good response', () => {
      const response = 'I think Agent-Bravo is suspicious because they voted strangely.';
      const result = validateResponse(response);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty responses', () => {
      const result = validateResponse('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Empty response');
    });

    it('should reject responses that are too short', () => {
      const result = validateResponse('I agree');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Too short');
    });

    it('should reject responses that are too long', () => {
      const longResponse = 'word '.repeat(101).trim(); // 101 words
      const result = validateResponse(longResponse);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Too long');
    });

    it('should reject responses without game-relevant keywords', () => {
      const result = validateResponse(
        'Hello everyone, nice weather today is not it really.'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No game-relevant keywords');
    });

    it('should reject responses with forbidden role reveals', () => {
      const result = validateResponse('I am a villager and I want to help.');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('forbidden phrase');
    });

    it('should accept responses with valid game keywords', () => {
      const responses = [
        'I vote for Agent-Bravo because they are suspicious.',
        'The evidence suggests Agent-Charlie is mafia.',
        'I think we should question Agent-Delta about their behavior.',
        'Who do you believe is the most suspicious?',
      ];

      for (const response of responses) {
        const result = validateResponse(response);
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('generateFallbackResponse', () => {
    it('should generate fallback response with player name', () => {
      const response = generateFallbackResponse('Agent-Alpha');

      expect(response).toContain('Agent-Alpha');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should generate different fallbacks (randomness)', () => {
      const responses = new Set<string>();
      for (let i = 0; i < 20; i++) {
        responses.add(generateFallbackResponse('Agent-Test'));
      }

      // Should have at least 2 different responses in 20 tries
      expect(responses.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('generateAgentResponse', () => {
    it('should return AI response for valid context', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'I think Agent-Bravo is suspicious.' }],
        usage: {
          input_tokens: 1000,
          output_tokens: 50,
          cache_read_input_tokens: 500,
          cache_creation_input_tokens: 0,
        },
      } as Anthropic.Message);

      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic
      );

      const response = await generateAgentResponse(mockContext);

      expect(response.text).toBe('I think Agent-Bravo is suspicious.');
      expect(response.usage.inputTokens).toBe(1000);
      expect(response.usage.outputTokens).toBe(50);
      expect(response.usage.cachedTokens).toBe(500);
      expect(response.usage.cost).toBeGreaterThan(0);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 200,
        })
      );
    });

    it('should retry on rate limit error (429)', async () => {
      vi.useFakeTimers();

      const error = new Error('Rate limited') as Error & { status: number };
      error.status = 429;

      const mockCreate = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success on retry' }],
          usage: {
            input_tokens: 1000,
            output_tokens: 50,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
        } as Anthropic.Message);

      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic
      );

      const responsePromise = generateAgentResponse(mockContext);

      // Advance timers to trigger retry
      await vi.advanceTimersByTimeAsync(4000); // Exponential backoff: 2^1 * 2000 = 4000ms

      const response = await responsePromise;

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response.text).toBe('Success on retry');

      vi.useRealTimers();
    });

    it('should retry on server error (500)', async () => {
      vi.useFakeTimers();

      const error = new Error('Server error') as Error & { status: number };
      error.status = 500;

      const mockCreate = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success on retry' }],
          usage: {
            input_tokens: 1000,
            output_tokens: 50,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
        } as Anthropic.Message);

      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic
      );

      const responsePromise = generateAgentResponse(mockContext);

      // Advance timers to trigger retry
      await vi.advanceTimersByTimeAsync(2000); // Exponential backoff: 2^1 * 1000 = 2000ms

      const response = await responsePromise;

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response.text).toBe('Success on retry');

      vi.useRealTimers();
    });

    it('should not retry on client error (401)', async () => {
      const error = new Error('Unauthorized') as Error & { status: number };
      error.status = 401;

      const mockCreate = vi.fn().mockRejectedValue(error);

      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic
      );

      await expect(generateAgentResponse(mockContext)).rejects.toThrow('Unauthorized');

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      vi.useFakeTimers();

      const error = new Error('Server error') as Error & { status: number };
      error.status = 500;

      const mockCreate = vi.fn().mockRejectedValue(error);

      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic
      );

      const responsePromise = generateAgentResponse(mockContext, { maxRetries: 3 });

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(2000); // Retry 1
      await vi.advanceTimersByTimeAsync(4000); // Retry 2
      await vi.advanceTimersByTimeAsync(8000); // Retry 3

      await expect(responsePromise).rejects.toThrow('Failed after 3 retries');

      expect(mockCreate).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });

  describe('generateWithTimeout', () => {
    it('should return response before timeout', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Quick response' }],
        usage: {
          input_tokens: 1000,
          output_tokens: 50,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      } as Anthropic.Message);

      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic
      );

      const response = await generateWithTimeout(mockContext);

      expect(response.text).toBe('Quick response');
      expect(response.usage.cost).toBeGreaterThan(0);
    });

    it('should return fallback on timeout', async () => {
      vi.useFakeTimers();

      const mockCreate = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                content: [{ type: 'text', text: 'Too late' }],
                usage: {
                  input_tokens: 1000,
                  output_tokens: 50,
                  cache_read_input_tokens: 0,
                  cache_creation_input_tokens: 0,
                },
              } as Anthropic.Message);
            }, 15000); // 15 seconds (longer than timeout)
          })
      );

      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic
      );

      const responsePromise = generateWithTimeout(mockContext, { timeoutMs: 10000 });

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(10001);

      const response = await responsePromise;

      expect(response.text).toContain('Agent-Alpha');
      expect(response.usage.cost).toBe(0); // Fallback has 0 cost
      expect(response.isValid).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('generateValidResponse', () => {
    it('should return valid response on first try', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'I think Agent-Bravo is suspicious based on their voting pattern.',
          },
        ],
        usage: {
          input_tokens: 1000,
          output_tokens: 50,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      } as Anthropic.Message);

      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic
      );

      const response = await generateValidResponse(mockContext);

      expect(response.text).toContain('Agent-Bravo');
      expect(response.isValid).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should retry on validation failure', async () => {
      vi.useFakeTimers();

      const mockCreate = vi
        .fn()
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Too short' }], // Invalid (< 5 words)
          usage: {
            input_tokens: 1000,
            output_tokens: 50,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
        } as Anthropic.Message)
        .mockResolvedValueOnce({
          content: [
            {
              type: 'text',
              text: 'I think Agent-Charlie is suspicious based on evidence.',
            },
          ], // Valid
          usage: {
            input_tokens: 1000,
            output_tokens: 50,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
        } as Anthropic.Message);

      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic
      );

      const responsePromise = generateValidResponse(mockContext);

      // Advance timer for retry delay
      await vi.advanceTimersByTimeAsync(500);

      const response = await responsePromise;

      expect(response.text).toContain('Agent-Charlie');
      expect(response.isValid).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should return invalid response after max attempts', async () => {
      vi.useFakeTimers();

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Short' }], // Always invalid
        usage: {
          input_tokens: 1000,
          output_tokens: 50,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      } as Anthropic.Message);

      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic
      );

      const responsePromise = generateValidResponse(mockContext, {}, 3);

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(500); // Retry 1
      await vi.advanceTimersByTimeAsync(500); // Retry 2

      const response = await responsePromise;

      expect(response.isValid).toBe(false);
      expect(response.validationError).toBeDefined();
      expect(mockCreate).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });
});
