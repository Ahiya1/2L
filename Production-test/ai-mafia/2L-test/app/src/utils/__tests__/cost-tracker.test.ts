/**
 * Tests for Cost Tracker
 *
 * Validates cost logging, aggregation, cache hit rate calculation,
 * circuit breaker functionality, and summary generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { costTracker } from '../cost-tracker';
import type { CostLog } from '../cost-tracker';

describe('Cost Tracker', () => {
  beforeEach(() => {
    // Clear all tracking data before each test
    costTracker.clear();
  });

  describe('log and logUsage', () => {
    it('should log a single API call', () => {
      const entry: CostLog = {
        gameId: 'game-1',
        playerId: 'player-1',
        playerName: 'Agent-Alpha',
        turn: 1,
        inputTokens: 1000,
        cacheCreationTokens: 0,
        cachedTokens: 500,
        outputTokens: 50,
        cost: 0.005,
        timestamp: new Date(),
      };

      costTracker.log(entry);

      const logs = costTracker.getGameLogs('game-1');
      expect(logs.length).toBe(1);
      expect(logs[0]).toMatchObject({
        gameId: 'game-1',
        playerId: 'player-1',
        cost: 0.005,
      });
    });

    it('should log usage from TokenUsage object', () => {
      const usage = {
        inputTokens: 1000,
        cacheCreationTokens: 100,
        cachedTokens: 500,
        outputTokens: 50,
        cost: 0.006,
      };

      costTracker.logUsage('game-1', 'player-1', 'Agent-Alpha', 1, usage);

      const logs = costTracker.getGameLogs('game-1');
      expect(logs.length).toBe(1);
      expect(logs[0].cost).toBe(0.006);
      expect(logs[0].cachedTokens).toBe(500);
    });

    it('should track multiple games independently', () => {
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 50,
          cost: 0.005,
        }
      );

      costTracker.logUsage(
        'game-2',
        'player-2',
        'Agent-Bravo',
        1,
        {
          inputTokens: 1500,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 75,
          cost: 0.008,
        }
      );

      expect(costTracker.getGameLogs('game-1').length).toBe(1);
      expect(costTracker.getGameLogs('game-2').length).toBe(1);
    });
  });

  describe('getGameSummary', () => {
    it('should return empty summary for unknown game', () => {
      const summary = costTracker.getGameSummary('unknown-game');

      expect(summary.totalTurns).toBe(0);
      expect(summary.totalCost).toBe(0);
      expect(summary.cacheHitRate).toBe(0);
      expect(summary.status).toBe('HEALTHY');
    });

    it('should calculate total costs and tokens', () => {
      // Turn 1: No cache
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 2000,
          cachedTokens: 0,
          outputTokens: 50,
          cost: 0.01,
        }
      );

      // Turn 2: With cache hit
      costTracker.logUsage(
        'game-1',
        'player-2',
        'Agent-Bravo',
        2,
        {
          inputTokens: 500,
          cacheCreationTokens: 0,
          cachedTokens: 2000,
          outputTokens: 50,
          cost: 0.005,
        }
      );

      const summary = costTracker.getGameSummary('game-1');

      expect(summary.totalTurns).toBe(2);
      expect(summary.totalInputTokens).toBe(1500);
      expect(summary.totalCacheCreationTokens).toBe(2000);
      expect(summary.totalCachedTokens).toBe(2000);
      expect(summary.totalOutputTokens).toBe(100);
      expect(summary.totalCost).toBe(0.015);
      expect(summary.avgCostPerTurn).toBe(0.0075);
    });

    it('should calculate cache hit rate correctly', () => {
      // Total cacheable = input (1000) + cached (3000) = 4000
      // Cache hit rate = 3000 / 4000 = 75%
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 3000,
          outputTokens: 50,
          cost: 0.005,
        }
      );

      const summary = costTracker.getGameSummary('game-1');

      expect(summary.cacheHitRate).toBeCloseTo(0.75, 2);
    });

    it('should mark status as COST_EXCEEDED when threshold crossed', () => {
      // Log high cost
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 10000,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 1000,
          cost: 3.5, // Above $3 threshold
        }
      );

      const summary = costTracker.getGameSummary('game-1');

      expect(summary.status).toBe('COST_EXCEEDED');
      expect(summary.warnings.length).toBeGreaterThan(0);
      expect(summary.warnings[0]).toContain('exceeds threshold');
    });

    it('should mark status as CACHING_ISSUE when cache hit rate is low', () => {
      // Multiple turns with low cache hit rate
      for (let i = 1; i <= 10; i++) {
        costTracker.logUsage(
          'game-1',
          `player-${i}`,
          `Agent-${i}`,
          i,
          {
            inputTokens: 1000,
            cacheCreationTokens: 0,
            cachedTokens: 200, // Only 20% cache hit
            outputTokens: 50,
            cost: 0.005,
          }
        );
      }

      const summary = costTracker.getGameSummary('game-1');

      // Cache hit rate = 2000 / (10000 + 2000) = 16.6% < 50% threshold
      expect(summary.status).toBe('CACHING_ISSUE');
      expect(summary.warnings.length).toBeGreaterThan(0);
      expect(summary.warnings.some(w => w.includes('Cache hit rate'))).toBe(true);
    });
  });

  describe('getTotalCost and getTotalCacheHitRate', () => {
    it('should calculate total cost across all games', () => {
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 50,
          cost: 0.01,
        }
      );

      costTracker.logUsage(
        'game-2',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 50,
          cost: 0.015,
        }
      );

      expect(costTracker.getTotalCost()).toBe(0.025);
    });

    it('should calculate total cache hit rate across all games', () => {
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 1000,
          outputTokens: 50,
          cost: 0.005,
        }
      );

      costTracker.logUsage(
        'game-2',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 2000,
          cacheCreationTokens: 0,
          cachedTokens: 2000,
          outputTokens: 50,
          cost: 0.008,
        }
      );

      // Total: input (3000) + cached (3000) = 6000
      // Cache hit: 3000 / 6000 = 50%
      expect(costTracker.getTotalCacheHitRate()).toBeCloseTo(0.5, 2);
    });
  });

  describe('checkCostLimitOrThrow (Circuit Breaker)', () => {
    it('should not throw when under hard limit', () => {
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 50,
          cost: 2.0, // Under $10 default limit
        }
      );

      expect(() => costTracker.checkCostLimitOrThrow('game-1')).not.toThrow();
    });

    it('should throw when exceeding hard limit', () => {
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 50,
          cost: 11.0, // Over $10 default limit
        }
      );

      expect(() => costTracker.checkCostLimitOrThrow('game-1')).toThrow(
        'exceeded cost limit'
      );
    });

    it('should respect custom cost limit', () => {
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 50,
          cost: 3.0,
        }
      );

      // Should throw with custom limit of $2
      expect(() => costTracker.checkCostLimitOrThrow('game-1', 2.0)).toThrow();

      // Should not throw with custom limit of $5
      expect(() => costTracker.checkCostLimitOrThrow('game-1', 5.0)).not.toThrow();
    });
  });

  describe('getPlayerStats', () => {
    it('should group logs by player', () => {
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 50,
          cost: 0.01,
        }
      );

      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        2,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 50,
          cost: 0.01,
        }
      );

      costTracker.logUsage(
        'game-1',
        'player-2',
        'Agent-Bravo',
        3,
        {
          inputTokens: 1000,
          cacheCreationTokens: 0,
          cachedTokens: 0,
          outputTokens: 50,
          cost: 0.01,
        }
      );

      const playerStats = costTracker.getPlayerStats('game-1');

      expect(playerStats.get('player-1')).toEqual({
        turns: 2,
        cost: 0.02,
      });

      expect(playerStats.get('player-2')).toEqual({
        turns: 1,
        cost: 0.01,
      });
    });
  });

  describe('exportCSV', () => {
    it('should export logs as CSV format', () => {
      costTracker.logUsage(
        'game-1',
        'player-1',
        'Agent-Alpha',
        1,
        {
          inputTokens: 1000,
          cacheCreationTokens: 100,
          cachedTokens: 500,
          outputTokens: 50,
          cost: 0.005,
        }
      );

      const csv = costTracker.exportCSV('game-1');

      expect(csv).toContain('timestamp,gameId,playerId');
      expect(csv).toContain('game-1');
      expect(csv).toContain('player-1');
      expect(csv).toContain('Agent-Alpha');
      expect(csv).toContain('1000'); // inputTokens
      expect(csv).toContain('500'); // cachedTokens
    });

    it('should export all games when gameId not specified', () => {
      costTracker.logUsage('game-1', 'player-1', 'Agent-Alpha', 1, {
        inputTokens: 1000,
        cacheCreationTokens: 0,
        cachedTokens: 0,
        outputTokens: 50,
        cost: 0.005,
      });

      costTracker.logUsage('game-2', 'player-2', 'Agent-Bravo', 1, {
        inputTokens: 1500,
        cacheCreationTokens: 0,
        cachedTokens: 0,
        outputTokens: 75,
        cost: 0.008,
      });

      const csv = costTracker.exportCSV();

      expect(csv).toContain('game-1');
      expect(csv).toContain('game-2');
    });
  });

  describe('clear and clearGame', () => {
    it('should clear all logs', () => {
      costTracker.logUsage('game-1', 'player-1', 'Agent-Alpha', 1, {
        inputTokens: 1000,
        cacheCreationTokens: 0,
        cachedTokens: 0,
        outputTokens: 50,
        cost: 0.005,
      });

      costTracker.clear();

      expect(costTracker.getGameLogs('game-1').length).toBe(0);
      expect(costTracker.getTotalCost()).toBe(0);
    });

    it('should clear logs for specific game only', () => {
      costTracker.logUsage('game-1', 'player-1', 'Agent-Alpha', 1, {
        inputTokens: 1000,
        cacheCreationTokens: 0,
        cachedTokens: 0,
        outputTokens: 50,
        cost: 0.005,
      });

      costTracker.logUsage('game-2', 'player-2', 'Agent-Bravo', 1, {
        inputTokens: 1500,
        cacheCreationTokens: 0,
        cachedTokens: 0,
        outputTokens: 75,
        cost: 0.008,
      });

      costTracker.clearGame('game-1');

      expect(costTracker.getGameLogs('game-1').length).toBe(0);
      expect(costTracker.getGameLogs('game-2').length).toBe(1);
    });
  });

  describe('getAllGameSummaries and getAverageCacheHitRate', () => {
    it('should get summaries for all games', () => {
      costTracker.logUsage('game-1', 'player-1', 'Agent-Alpha', 1, {
        inputTokens: 1000,
        cacheCreationTokens: 0,
        cachedTokens: 500,
        outputTokens: 50,
        cost: 0.005,
      });

      costTracker.logUsage('game-2', 'player-2', 'Agent-Bravo', 1, {
        inputTokens: 2000,
        cacheCreationTokens: 0,
        cachedTokens: 2000,
        outputTokens: 100,
        cost: 0.01,
      });

      const summaries = costTracker.getAllGameSummaries();

      expect(summaries.length).toBe(2);
      expect(summaries.find(s => s.gameId === 'game-1')).toBeDefined();
      expect(summaries.find(s => s.gameId === 'game-2')).toBeDefined();
    });

    it('should calculate average cache hit rate across games', () => {
      // Game 1: 50% cache hit rate
      costTracker.logUsage('game-1', 'player-1', 'Agent-Alpha', 1, {
        inputTokens: 1000,
        cacheCreationTokens: 0,
        cachedTokens: 1000,
        outputTokens: 50,
        cost: 0.005,
      });

      // Game 2: 75% cache hit rate
      costTracker.logUsage('game-2', 'player-2', 'Agent-Bravo', 1, {
        inputTokens: 1000,
        cacheCreationTokens: 0,
        cachedTokens: 3000,
        outputTokens: 50,
        cost: 0.008,
      });

      // Average: (50% + 75%) / 2 = 62.5%
      const avgHitRate = costTracker.getAverageCacheHitRate();

      expect(avgHitRate).toBeCloseTo(0.625, 2);
    });
  });

  describe('Integration Test: Full Game Tracking', () => {
    it('should track a complete game with multiple turns', () => {
      const gameId = 'game-test-integration';
      const players = ['player-1', 'player-2', 'player-3'];

      // Simulate 10 turns with increasing cache hits
      for (let turn = 1; turn <= 10; turn++) {
        const player = players[turn % players.length];
        const cacheHit = turn > 3; // Cache starts working after turn 3

        costTracker.logUsage(gameId, player, `Agent-${player}`, turn, {
          inputTokens: 1000,
          cacheCreationTokens: cacheHit ? 0 : 2000,
          cachedTokens: cacheHit ? 2000 : 0,
          outputTokens: 50,
          cost: cacheHit ? 0.005 : 0.01,
        });
      }

      const summary = costTracker.getGameSummary(gameId);

      expect(summary.totalTurns).toBe(10);
      expect(summary.totalCost).toBeGreaterThan(0);
      expect(summary.cacheHitRate).toBeGreaterThan(0.5); // Should be >50% after cache warmup
      expect(summary.status).toBe('HEALTHY'); // Should be under threshold

      const playerStats = costTracker.getPlayerStats(gameId);
      expect(playerStats.size).toBe(3); // 3 different players
    });
  });
});
