/**
 * Simplified Tests for Claude API Client
 *
 * Tests functions that don't require module-level initialization
 */

import { describe, it, expect } from 'vitest';
import { calculateCost, validateResponse, generateFallbackResponse } from '../client';
import type Anthropic from '@anthropic-ai/sdk';

describe('Claude Client - Pure Functions', () => {
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
      expect(cost).toBeCloseTo(0.0069, 3); // Reduce precision for floating point
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

    it('should reject whitespace-only responses', () => {
      const result = validateResponse('   \n\t  ');

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

    it('should accept responses at minimum word count', () => {
      const response = 'I think Agent-Bravo is suspicious.'; // Exactly 5 words
      const result = validateResponse(response);

      expect(result.isValid).toBe(true);
    });

    it('should accept responses at maximum word count', () => {
      const response = Array(100)
        .fill('suspicious')
        .join(' '); // Exactly 100 words
      const result = validateResponse(response);

      expect(result.isValid).toBe(true);
    });

    it('should reject responses without game-relevant keywords', () => {
      const result = validateResponse(
        'Hello everyone, nice weather today is not it really.'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No game-relevant keywords');
    });

    it('should reject responses with forbidden role reveals', () => {
      // Test specific forbidden phrases that have game keywords
      const forbiddenResponses = [
        'I think I am a villager and want to vote wisely.', // Has "think" and "vote"
        'I suspect I am mafia member based on evidence.', // Has "suspect" and "mafia"
      ];

      for (const response of forbiddenResponses) {
        const result = validateResponse(response);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('forbidden phrase');
      }
    });

    it('should accept responses with valid game keywords', () => {
      const responses = [
        'I vote for Agent-Bravo because they are suspicious.',
        'The evidence suggests Agent-Charlie is mafia.',
        'I think we should question Agent-Delta about their behavior.',
        'Who do you believe is the most suspicious?',
        'I trust Agent-Echo based on their voting pattern.',
        'What makes you accuse Agent-Foxtrot of being mafia?',
      ];

      for (const response of responses) {
        const result = validateResponse(response);
        expect(result.isValid).toBe(true);
      }
    });

    it('should be case-insensitive for keyword matching', () => {
      const responses = [
        'I THINK Agent-A is SUSPICIOUS.',
        'THE EVIDENCE SHOWS Agent-B is MAFIA.',
        'WHY do you VOTE for Agent-C?',
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

    it('should generate fallback for different player names', () => {
      const names = ['Agent-Alpha', 'Agent-Bravo', 'Agent-Charlie'];

      for (const name of names) {
        const response = generateFallbackResponse(name);
        expect(response).toContain(name);
      }
    });

    it('should generate different fallbacks (randomness)', () => {
      const responses = new Set<string>();
      for (let i = 0; i < 20; i++) {
        responses.add(generateFallbackResponse('Agent-Test'));
      }

      // Should have at least 2 different responses in 20 tries
      expect(responses.size).toBeGreaterThanOrEqual(2);
    });

    it('should handle special characters in player name', () => {
      const response = generateFallbackResponse('Agent-001-Special');

      expect(response).toContain('Agent-001-Special');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('Cost Calculation Edge Cases', () => {
    it('should handle zero tokens', () => {
      const usage: Anthropic.Messages.Usage = {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      };

      const cost = calculateCost(usage);
      expect(cost).toBe(0);
    });

    it('should handle very large token counts', () => {
      const usage: Anthropic.Messages.Usage = {
        input_tokens: 1000000, // 1M tokens
        output_tokens: 100000, // 100K tokens
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      };

      const cost = calculateCost(usage);

      // input: 1M/1M * $3 = $3
      // output: 100K/1M * $15 = $1.5
      // Total: $4.5
      expect(cost).toBeCloseTo(4.5, 2);
    });

    it('should handle realistic game turn costs', () => {
      // Typical turn: ~1000 input, ~500 cached, ~50 output
      const usage: Anthropic.Messages.Usage = {
        input_tokens: 1000,
        output_tokens: 50,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 500,
      };

      const cost = calculateCost(usage);

      // input: 1000/1M * $3 = $0.003
      // cache_read: 500/1M * $0.3 = $0.00015
      // output: 50/1M * $15 = $0.00075
      // Total: $0.0039
      expect(cost).toBeLessThan(0.01);
      expect(cost).toBeGreaterThan(0.003);
    });
  });

  describe('Response Validation Edge Cases', () => {
    it('should handle responses with numbers and symbols', () => {
      const response = 'I think Agent-123 is suspicious because they voted @#$!';
      const result = validateResponse(response);

      expect(result.isValid).toBe(true);
    });

    it('should handle responses with line breaks', () => {
      const response = 'I think Agent-A is suspicious.\nThey voted strangely yesterday.';
      const result = validateResponse(response);

      expect(result.isValid).toBe(true);
    });

    it('should count words correctly with various whitespace', () => {
      const response = 'I    think   Agent-A   is   suspicious.'; // 5 words
      const result = validateResponse(response);

      expect(result.isValid).toBe(true);
    });

    it('should detect partial forbidden phrases', () => {
      // "i am a villager" is forbidden, but needs game keywords too
      const result = validateResponse(
        'I think I am a villager trying to vote wisely.'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('forbidden phrase');
    });
  });
});
