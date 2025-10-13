/**
 * Cost Dashboard Page
 *
 * Route: /admin/costs
 *
 * Displays cost tracking and monitoring information across all games.
 * Highlights games that exceed cost thresholds or have low cache hit rates.
 *
 * Features:
 * - Total spend counter
 * - Average cache hit rate
 * - Per-game cost breakdown table
 * - Alerts for games >$5 or cache <70%
 * - Sorting and filtering capabilities
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CostSummary } from '@/src/lib/types/shared';

interface CostDashboardData {
  summaries: CostSummary[];
  aggregates: {
    totalSpend: number;
    avgCacheHitRate: number;
    totalGames: number;
    totalTurns: number;
    avgCostPerGame: number;
    avgCostPerTurn: number;
    highCostGamesCount: number;
    lowCacheGamesCount: number;
  };
}

export default function CostDashboardPage() {
  const [data, setData] = useState<CostDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'cost' | 'cache' | 'turns'>('cost');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/costs');
        if (!response.ok) {
          throw new Error('Failed to fetch cost data');
        }
        const result: CostDashboardData = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading cost data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">{error || 'Cost data not available'}</p>
        </Card>
      </div>
    );
  }

  // Sort summaries based on selected sort
  const sortedSummaries = [...data.summaries].sort((a, b) => {
    switch (sortBy) {
      case 'cost':
        return b.totalCost - a.totalCost;
      case 'cache':
        return a.cacheHitRate - b.cacheHitRate;
      case 'turns':
        return b.totalTurns - a.totalTurns;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cost Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Track API costs and cache performance across all games
            </p>
          </div>
          <a
            href="/"
            className="text-blue-600 hover:underline text-sm"
          >
            Back to Lobby
          </a>
        </div>

        {/* Aggregate Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              ${data.aggregates.totalSpend.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Spend</div>
          </Card>

          <Card className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {data.aggregates.totalGames}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Games</div>
          </Card>

          <Card className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {(data.aggregates.avgCacheHitRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Avg Cache Hit Rate</div>
            {data.aggregates.avgCacheHitRate < 0.7 && (
              <Badge variant="dead" className="mt-2">
                Below Target (70%)
              </Badge>
            )}
          </Card>

          <Card className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              ${data.aggregates.avgCostPerGame.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Avg Cost Per Game</div>
          </Card>
        </div>

        {/* Alerts */}
        {(data.aggregates.highCostGamesCount > 0 || data.aggregates.lowCacheGamesCount > 0) && (
          <Card className="bg-yellow-50 border-yellow-200">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Alerts</h2>
            <div className="space-y-1 text-sm text-yellow-700">
              {data.aggregates.highCostGamesCount > 0 && (
                <p>
                  {data.aggregates.highCostGamesCount} game(s) exceeded $5 cost threshold
                </p>
              )}
              {data.aggregates.lowCacheGamesCount > 0 && (
                <p>
                  {data.aggregates.lowCacheGamesCount} game(s) have cache hit rate below 70%
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Games Table */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Games Breakdown</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('cost')}
                className={`px-3 py-1 text-sm rounded ${
                  sortBy === 'cost'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Sort by Cost
              </button>
              <button
                onClick={() => setSortBy('cache')}
                className={`px-3 py-1 text-sm rounded ${
                  sortBy === 'cache'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Sort by Cache
              </button>
              <button
                onClick={() => setSortBy('turns')}
                className={`px-3 py-1 text-sm rounded ${
                  sortBy === 'turns'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Sort by Turns
              </button>
            </div>
          </div>

          {sortedSummaries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No games tracked yet. Cost data will appear here once games are played.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Game ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Turns
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Cost/Turn
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cache Hit Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedSummaries.map((summary) => {
                    const isHighCost = summary.totalCost > 5.0;
                    const isLowCache = summary.cacheHitRate < 0.7 && summary.totalTurns > 5;
                    const hasIssue = isHighCost || isLowCache;

                    return (
                      <tr
                        key={summary.gameId}
                        className={hasIssue ? 'bg-red-50' : ''}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                          {summary.gameId.slice(0, 12)}...
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {summary.totalTurns}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={isHighCost ? 'font-semibold text-red-600' : 'text-gray-900'}>
                            ${summary.totalCost.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          ${summary.avgCostPerTurn.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={isLowCache ? 'font-semibold text-red-600' : 'text-gray-900'}>
                            {(summary.cacheHitRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {summary.status === 'HEALTHY' ? (
                            <Badge variant="alive">Healthy</Badge>
                          ) : summary.status === 'COST_EXCEEDED' ? (
                            <Badge variant="dead">High Cost</Badge>
                          ) : (
                            <Badge variant="dead">Cache Issue</Badge>
                          )}
                          {summary.warnings.length > 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              {summary.warnings.length} warning(s)
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Token Usage</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Total Turns:</span>
                <span className="font-medium text-gray-900">
                  {data.aggregates.totalTurns.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Avg Cost/Turn:</span>
                <span className="font-medium text-gray-900">
                  ${data.aggregates.avgCostPerTurn.toFixed(4)}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Cache Performance</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Target Hit Rate:</span>
                <span className="font-medium text-gray-900">70%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Current Avg:</span>
                <span
                  className={
                    data.aggregates.avgCacheHitRate >= 0.7
                      ? 'font-medium text-green-600'
                      : 'font-medium text-red-600'
                  }
                >
                  {(data.aggregates.avgCacheHitRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Cost Targets</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Target/Game:</span>
                <span className="font-medium text-gray-900">&lt;$2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Current Avg:</span>
                <span
                  className={
                    data.aggregates.avgCostPerGame <= 2.0
                      ? 'font-medium text-green-600'
                      : 'font-medium text-yellow-600'
                  }
                >
                  ${data.aggregates.avgCostPerGame.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
