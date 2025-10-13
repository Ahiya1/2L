/**
 * Tests for phase-config utilities
 *
 * Foundation tests to ensure phase configuration is correct
 */

import {
  PHASE_CONFIGS,
  getPhaseConfig,
  getPhaseColorClasses,
  formatTimeRemaining,
  calculatePhaseEndTime,
  calculateTimeRemaining,
} from '../phase-config';

describe('phase-config', () => {
  describe('formatTimeRemaining', () => {
    it('formats seconds correctly', () => {
      expect(formatTimeRemaining(0)).toBe('0:00');
      expect(formatTimeRemaining(30)).toBe('0:30');
      expect(formatTimeRemaining(60)).toBe('1:00');
      expect(formatTimeRemaining(125)).toBe('2:05');
      expect(formatTimeRemaining(180)).toBe('3:00');
    });
  });

  describe('getPhaseConfig', () => {
    it('returns correct config for each phase', () => {
      expect(getPhaseConfig('NIGHT').displayName).toBe('Night Phase');
      expect(getPhaseConfig('DISCUSSION').displayName).toBe('Discussion');
      expect(getPhaseConfig('VOTING').displayName).toBe('Voting');
    });

    it('returns LOBBY config for null', () => {
      expect(getPhaseConfig(null).name).toBe('LOBBY');
    });
  });

  describe('getPhaseColorClasses', () => {
    it('returns correct color classes', () => {
      const nightColors = getPhaseColorClasses('NIGHT');
      expect(nightColors.bg).toBe('bg-purple-100');
      expect(nightColors.text).toBe('text-purple-800');
      expect(nightColors.border).toBe('border-purple-300');
    });
  });

  describe('calculatePhaseEndTime', () => {
    it('calculates end time correctly', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      const endTime = calculatePhaseEndTime(startTime, 'NIGHT');

      expect(endTime).not.toBeNull();
      expect(endTime!.getTime()).toBe(startTime.getTime() + 45000); // 45 seconds
    });

    it('returns null for phases with 0 duration', () => {
      const startTime = new Date();
      expect(calculatePhaseEndTime(startTime, 'LOBBY')).toBeNull();
      expect(calculatePhaseEndTime(startTime, 'GAME_OVER')).toBeNull();
    });
  });

  describe('calculateTimeRemaining', () => {
    it('calculates remaining time correctly', () => {
      const futureTime = new Date(Date.now() + 10000); // 10 seconds in future
      const remaining = calculateTimeRemaining(futureTime);

      expect(remaining).toBeGreaterThanOrEqual(9);
      expect(remaining).toBeLessThanOrEqual(10);
    });

    it('returns 0 for past times', () => {
      const pastTime = new Date(Date.now() - 10000);
      expect(calculateTimeRemaining(pastTime)).toBe(0);
    });

    it('returns 0 for null', () => {
      expect(calculateTimeRemaining(null)).toBe(0);
    });
  });
});
