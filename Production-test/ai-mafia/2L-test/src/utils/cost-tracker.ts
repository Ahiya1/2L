/**
 * Cost Tracking System
 *
 * Tracks token usage and costs for all Claude API calls.
 * Calculates cache hit rates and aggregates per-game costs.
 * Provides alerts when costs exceed thresholds.
 */

import type { TokenUsage } from '../lib/claude/types';

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
 * Aggregated cost summary for a game
 */
export interface CostSummary {
  gameId: string;
  totalTurns: number;
  totalInputTokens: number;
  totalCacheCreationTokens: number;
  totalCachedTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  cacheHitRate: number;
  avgCostPerTurn: number;
  status: 'HEALTHY' | 'CACHING_ISSUE' | 'COST_EXCEEDED';
  warnings: string[];
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
      cacheCreationTokens: usage.cacheCreationTokens,
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

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('COST TRACKING SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Game ID: ${summary.gameId}`);
    console.log(`Total turns: ${summary.totalTurns}`);
    console.log(`\nToken Usage:`);
    console.log(`  Input tokens: ${summary.totalInputTokens.toLocaleString()}`);
    console.log(
      `  Cache creation tokens: ${summary.totalCacheCreationTokens.toLocaleString()}`
    );
    console.log(`  Cached tokens (read): ${summary.totalCachedTokens.toLocaleString()}`);
    console.log(`  Output tokens: ${summary.totalOutputTokens.toLocaleString()}`);
    console.log(`\nCosts:`);
    console.log(`  Total cost: $${summary.totalCost.toFixed(4)}`);
    console.log(`  Avg cost per turn: $${summary.avgCostPerTurn.toFixed(4)}`);
    console.log(`  Cache hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`\nStatus: ${summary.status}`);

    if (summary.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const warning of summary.warnings) {
        console.log(`  ⚠️  ${warning}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// Export singleton instance
export const costTracker = new CostTracker();
