/**
 * Tests for Repetition Tracker
 *
 * Validates phrase extraction, tracking, and retrieval functionality.
 */

import {
  extractPhrases,
  addAgentMessage,
  getProhibitedPhrases,
  clearPlayerPhrases,
  clearAllPhrases,
  getPhraseCount,
} from './repetition-tracker';

describe('Repetition Tracker', () => {
  beforeEach(() => {
    // Clear all tracking data before each test
    clearAllPhrases();
  });

  describe('extractPhrases', () => {
    it('should extract 3-word phrases from a message', () => {
      const message = 'I think Agent-Alpha is suspicious';
      const phrases = extractPhrases(message);

      expect(phrases).toEqual([
        'i think agent',
        'think agent alpha',
        'agent alpha is',
        'alpha is suspicious',
      ]);
    });

    it('should handle short messages with fewer than 3 words', () => {
      const message = 'I agree';
      const phrases = extractPhrases(message);

      expect(phrases).toEqual([]);
    });

    it('should normalize to lowercase', () => {
      const message = 'I THINK Agent-Alpha IS SUSPICIOUS';
      const phrases = extractPhrases(message);

      expect(phrases[0]).toBe('i think agent');
    });

    it('should handle multiple spaces', () => {
      const message = 'I  think   Agent-Alpha    is suspicious';
      const phrases = extractPhrases(message);

      // Multiple spaces should be normalized to single space
      expect(phrases).toContain('i think agent');
    });
  });

  describe('addAgentMessage', () => {
    it('should track phrases for a player', () => {
      const playerId = 'player-123';
      const message = 'I think Agent-Alpha is suspicious';

      addAgentMessage(playerId, message);

      const count = getPhraseCount(playerId);
      expect(count).toBe(4); // 4 phrases extracted
    });

    it('should keep only last 20 phrases', () => {
      const playerId = 'player-123';

      // Add 3 messages with 4 phrases each (12 total)
      addAgentMessage(playerId, 'I think Agent-Alpha is suspicious');
      addAgentMessage(playerId, 'Agent-Bravo voted for Agent-Charlie yesterday');
      addAgentMessage(playerId, 'The evidence points to Agent-Delta clearly');

      // 12 phrases so far
      expect(getPhraseCount(playerId)).toBe(12);

      // Add another 3 messages (12 more phrases = 24 total)
      addAgentMessage(playerId, 'I agree with Agent-Echo completely');
      addAgentMessage(playerId, 'Agent-Foxtrot is very suspicious today');
      addAgentMessage(playerId, 'We should vote for Agent-Golf now');

      // Should keep only 20 most recent
      expect(getPhraseCount(playerId)).toBe(20);
    });

    it('should track different players separately', () => {
      addAgentMessage('player-1', 'I think Agent-Alpha is suspicious');
      addAgentMessage('player-2', 'Agent-Bravo voted for Agent-Charlie yesterday');

      expect(getPhraseCount('player-1')).toBe(4);
      expect(getPhraseCount('player-2')).toBe(4);
    });
  });

  describe('getProhibitedPhrases', () => {
    it('should return top 5 most recent phrases', () => {
      const playerId = 'player-123';
      addAgentMessage(playerId, 'I think Agent-Alpha is suspicious because');

      const prohibited = getProhibitedPhrases(playerId);
      expect(prohibited.length).toBe(5);
      expect(prohibited[0]).toBe('i think agent');
    });

    it('should return empty array for unknown player', () => {
      const prohibited = getProhibitedPhrases('unknown-player');
      expect(prohibited).toEqual([]);
    });

    it('should return fewer than 5 if player has fewer phrases', () => {
      const playerId = 'player-123';
      addAgentMessage(playerId, 'I agree totally'); // Only 1 phrase

      const prohibited = getProhibitedPhrases(playerId);
      expect(prohibited.length).toBe(1);
    });
  });

  describe('clearPlayerPhrases', () => {
    it('should clear phrases for specific player', () => {
      addAgentMessage('player-1', 'I think Agent-Alpha is suspicious');
      addAgentMessage('player-2', 'Agent-Bravo voted for Agent-Charlie yesterday');

      clearPlayerPhrases('player-1');

      expect(getPhraseCount('player-1')).toBe(0);
      expect(getPhraseCount('player-2')).toBe(4);
    });
  });

  describe('clearAllPhrases', () => {
    it('should clear all tracking data', () => {
      addAgentMessage('player-1', 'I think Agent-Alpha is suspicious');
      addAgentMessage('player-2', 'Agent-Bravo voted for Agent-Charlie yesterday');

      clearAllPhrases();

      expect(getPhraseCount('player-1')).toBe(0);
      expect(getPhraseCount('player-2')).toBe(0);
    });
  });

  describe('Integration Test: Full Message Flow', () => {
    it('should track and prohibit repeated phrases', () => {
      const playerId = 'player-123';

      // Agent sends first message
      addAgentMessage(playerId, 'I think Agent-Alpha is suspicious');
      let prohibited = getProhibitedPhrases(playerId);
      expect(prohibited).toContain('i think agent');

      // Agent sends second message (should avoid "i think agent")
      addAgentMessage(playerId, 'Agent-Alpha voted suspiciously in Round 2');
      prohibited = getProhibitedPhrases(playerId);

      // Should now have phrases from both messages
      expect(prohibited.length).toBe(5);
      expect(prohibited).toContain('i think agent'); // Still in recent phrases
      expect(prohibited).toContain('agent alpha voted'); // New phrase
    });
  });
});
