/**
 * Cost Dashboard API Route
 *
 * GET /api/admin/costs
 *
 * Returns aggregated cost data across all games.
 * Includes per-game summaries, total spend, and average cache hit rate.
 * Used by the cost dashboard page to display cost monitoring information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { costTracker } from '@/src/utils/cost-tracker';
import { logger } from '@/src/lib/logger';

export async function GET(req: NextRequest) {
  try {
    // Get all game summaries
    const summaries = costTracker.getAllGameSummaries();

    // Calculate aggregate metrics
    const totalSpend = summaries.reduce((sum, s) => sum + s.totalCost, 0);
    const avgCacheHitRate = costTracker.getAverageCacheHitRate();
    const totalTurns = summaries.reduce((sum, s) => sum + s.totalTurns, 0);

    // Games with issues
    const highCostGames = summaries.filter((s) => s.totalCost > 5.0).length;
    const lowCacheGames = summaries.filter((s) => s.cacheHitRate < 0.7 && s.totalTurns > 5).length;

    // Sort by cost descending
    const sortedSummaries = summaries.sort((a, b) => b.totalCost - a.totalCost);

    const response = {
      summaries: sortedSummaries,
      aggregates: {
        totalSpend,
        avgCacheHitRate,
        totalGames: summaries.length,
        totalTurns,
        avgCostPerGame: summaries.length > 0 ? totalSpend / summaries.length : 0,
        avgCostPerTurn: totalTurns > 0 ? totalSpend / totalTurns : 0,
        highCostGamesCount: highCostGames,
        lowCacheGamesCount: lowCacheGames,
      },
    };

    logger.info(
      {
        totalGames: summaries.length,
        totalSpend: totalSpend.toFixed(2),
        avgCacheHitRate: (avgCacheHitRate * 100).toFixed(1),
      },
      'Cost dashboard data retrieved'
    );

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to retrieve cost dashboard data'
    );
    return NextResponse.json(
      { error: 'Failed to retrieve cost data' },
      { status: 500 }
    );
  }
}
