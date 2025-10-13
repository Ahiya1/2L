/**
 * Cost Tracking System
 *
 * Tracks token usage and costs for all Claude API calls.
 * Calculates cache hit rates and aggregates per-game costs.
 * Provides alerts when costs exceed thresholds.
 */

import type { TokenUsage } from '../lib/claude/types';
import type { CostSummary } from '../lib/types/shared';
import { logger } from '../lib/logger';

/**
 * Cost log entry for a single API call
 */
export interface CostLog {
  gameId: string;
  playerId: string;
  playerName?: string;
  turn: number;
  inputTokens: number;
  cacheCreationTokens: number;
  cachedTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

/**
 * Cost tracker singleton
 *
 * Tracks all API calls and provides aggregated summaries.
 */
class CostTracker {
  private logs: CostLog[] = [];
  private readonly COST_THRESHOLD = 3.0; // Alert if game exceeds $3
  private readonly MIN_CACHE_HIT_RATE = 0.5; // Alert if cache hit rate <50%
  private readonly SOFT_LIMIT = 5.0; // Warn at $5
  private readonly HARD_LIMIT = parseFloat(process.env.COST_HARD_LIMIT || '10.0'); // Abort at $10

  /**
   * Log a single API call
   */
  log(entry: CostLog): void {
    this.logs.push(entry);
  }

  /**
   * Log from TokenUsage object (convenience method)
   */
  logUsage(
    gameId: string,
    playerId: string,
    playerName: string,
    turn: number,
    usage: TokenUsage
  ): void {
    this.log({
      gameId,
      playerId,
      playerName,
      turn,
      inputTokens: usage.inputTokens,
      cacheCreationTokens: usage.cacheCreationTokens || 0,
      cachedTokens: usage.cachedTokens,
      outputTokens: usage.outputTokens,
      cost: usage.cost,
      timestamp: new Date(),
    });
  }

  /**
   * Get all logs for a specific game
   */
  getGameLogs(gameId: string): CostLog[] {
    return this.logs.filter((log) => log.gameId === gameId);
  }

  /**
   * Get cost summary for a game
   */
  getGameSummary(gameId: string): CostSummary {
    const gameLogs = this.getGameLogs(gameId);

    if (gameLogs.length === 0) {
      return {
        gameId,
        totalTurns: 0,
        totalInputTokens: 0,
        totalCacheCreationTokens: 0,
        totalCachedTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        cacheHitRate: 0,
        avgCostPerTurn: 0,
        status: 'HEALTHY',
        warnings: [],
      };
    }

    const totalInputTokens = gameLogs.reduce((sum, log) => sum + log.inputTokens, 0);
    const totalCacheCreationTokens = gameLogs.reduce(
      (sum, log) => sum + log.cacheCreationTokens,
      0
    );
    const totalCachedTokens = gameLogs.reduce((sum, log) => sum + log.cachedTokens, 0);
    const totalOutputTokens = gameLogs.reduce((sum, log) => sum + log.outputTokens, 0);
    const totalCost = gameLogs.reduce((sum, log) => sum + log.cost, 0);

    // Calculate cache hit rate
    // Cache hit rate = cached tokens / (input tokens + cached tokens)
    const totalCacheableTokens = totalInputTokens + totalCachedTokens;
    const cacheHitRate = totalCacheableTokens > 0 ? totalCachedTokens / totalCacheableTokens : 0;

    const avgCostPerTurn = gameLogs.length > 0 ? totalCost / gameLogs.length : 0;

    // Determine status and warnings
    const warnings: string[] = [];
    let status: 'HEALTHY' | 'CACHING_ISSUE' | 'COST_EXCEEDED' = 'HEALTHY';

    if (totalCost > this.COST_THRESHOLD) {
      status = 'COST_EXCEEDED';
      warnings.push(`Total cost ($${totalCost.toFixed(2)}) exceeds threshold ($${this.COST_THRESHOLD})`);
    }

    if (cacheHitRate < this.MIN_CACHE_HIT_RATE && gameLogs.length > 5) {
      // Only warn about cache if we have enough data
      if (status === 'HEALTHY') {
        status = 'CACHING_ISSUE';
      }
      warnings.push(
        `Cache hit rate (${(cacheHitRate * 100).toFixed(1)}%) is below minimum (${this.MIN_CACHE_HIT_RATE * 100}%)`
      );
    }

    return {
      gameId,
      totalTurns: gameLogs.length,
      totalInputTokens,
      totalCacheCreationTokens,
      totalCachedTokens,
      totalOutputTokens,
      totalCost,
      cacheHitRate,
      avgCostPerTurn,
      status,
      warnings,
    };
  }

  /**
   * Get total costs across all games
   */
  getTotalCost(): number {
    return this.logs.reduce((sum, log) => sum + log.cost, 0);
  }

  /**
   * Get total cache hit rate across all games
   */
  getTotalCacheHitRate(): number {
    if (this.logs.length === 0) return 0;

    const totalInputTokens = this.logs.reduce((sum, log) => sum + log.inputTokens, 0);
    const totalCachedTokens = this.logs.reduce((sum, log) => sum + log.cachedTokens, 0);
    const totalCacheableTokens = totalInputTokens + totalCachedTokens;

    return totalCacheableTokens > 0 ? totalCachedTokens / totalCacheableTokens : 0;
  }

  /**
   * Export logs to CSV format
   */
  exportCSV(gameId?: string): string {
    const logsToExport = gameId ? this.getGameLogs(gameId) : this.logs;

    const header =
      'timestamp,gameId,playerId,playerName,turn,inputTokens,cacheCreationTokens,cachedTokens,outputTokens,cost\n';

    const rows = logsToExport.map((log) =>
      [
        log.timestamp.toISOString(),
        log.gameId,
        log.playerId,
        log.playerName || '',
        log.turn,
        log.inputTokens,
        log.cacheCreationTokens,
        log.cachedTokens,
        log.outputTokens,
        log.cost.toFixed(6),
      ].join(',')
    );

    return header + rows.join('\n');
  }

  /**
   * Clear all logs (useful for testing)
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Clear logs for a specific game
   */
  clearGame(gameId: string): void {
    this.logs = this.logs.filter((log) => log.gameId !== gameId);
  }

  /**
   * Get logs grouped by player
   */
  getPlayerStats(gameId: string): Map<string, { turns: number; cost: number }> {
    const gameLogs = this.getGameLogs(gameId);
    const playerStats = new Map<string, { turns: number; cost: number }>();

    for (const log of gameLogs) {
      const existing = playerStats.get(log.playerId) || { turns: 0, cost: 0 };
      playerStats.set(log.playerId, {
        turns: existing.turns + 1,
        cost: existing.cost + log.cost,
      });
    }

    return playerStats;
  }

  /**
   * Print formatted summary to console
   */
  printSummary(gameId: string): void {
    const summary = this.getGameSummary(gameId);

    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('COST TRACKING SUMMARY');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    logger.info(`Game ID: ${summary.gameId}`);
    logger.info(`Total turns: ${summary.totalTurns}`);
    logger.info(`\nToken Usage:`);
    logger.info(`  Input tokens: ${summary.totalInputTokens.toLocaleString()}`);
    logger.info(
      `  Cache creation tokens: ${summary.totalCacheCreationTokens.toLocaleString()}`
    );
    logger.info(`  Cached tokens (read): ${summary.totalCachedTokens.toLocaleString()}`);
    logger.info(`  Output tokens: ${summary.totalOutputTokens.toLocaleString()}`);
    logger.info(`\nCosts:`);
    logger.info(`  Total cost: $${summary.totalCost.toFixed(4)}`);
    logger.info(`  Avg cost per turn: $${summary.avgCostPerTurn.toFixed(4)}`);
    logger.info(`  Cache hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`);
    logger.info(`\nStatus: ${summary.status}`);

    if (summary.warnings.length > 0) {
      logger.info('\nWarnings:');
      for (const warning of summary.warnings) {
        logger.warn(`  ⚠️  ${warning}`);
      }
    }

    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Check if game cost exceeds hard limit and throw error (Circuit Breaker)
   */
  checkCostLimitOrThrow(gameId: string, maxCost?: number): void {
    const limit = maxCost || this.HARD_LIMIT;
    const summary = this.getGameSummary(gameId);

    if (summary.totalCost > limit) {
      logger.error({ gameId, totalCost: summary.totalCost, maxCost: limit }, 'Cost limit exceeded, aborting game');
      throw new Error(`Game ${gameId} exceeded cost limit of $${limit.toFixed(2)} (current: $${summary.totalCost.toFixed(2)})`);
    }

    // Soft limit warning
    if (summary.totalCost > this.SOFT_LIMIT && summary.totalCost <= limit) {
      logger.warn({ gameId, totalCost: summary.totalCost, softLimit: this.SOFT_LIMIT }, 'Game cost approaching limit');
    }
  }

  /**
   * Get summaries for all games
   */
  getAllGameSummaries(): CostSummary[] {
    const gameIds = [...new Set(this.logs.map(log => log.gameId))];
    return gameIds.map(gameId => this.getGameSummary(gameId));
  }

  /**
   * Get average cache hit rate across all games
   */
  getAverageCacheHitRate(): number {
    const summaries = this.getAllGameSummaries();
    if (summaries.length === 0) return 0;

    const totalHitRate = summaries.reduce((sum, s) => sum + s.cacheHitRate, 0);
    return totalHitRate / summaries.length;
  }
}

// Export singleton instance
export const costTracker = new CostTracker();
