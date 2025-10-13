/**
 * Cost Metrics Component
 *
 * Displays real-time cost tracking metrics for the current game.
 * Collapsible panel showing:
 * - Current game cost
 * - Cache hit rate
 * - Total turns
 * - Average cost per turn
 *
 * Optional component that can be included in the live game view.
 */

'use client';

import { useState, useEffect } from 'react';
import type { CostSummary } from '@/src/lib/types/shared';

interface CostMetricsProps {
  gameId: string;
}

export default function CostMetrics({ gameId }: CostMetricsProps) {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCostData = async () => {
      try {
        const response = await fetch('/api/admin/costs');
        if (!response.ok) {
          throw new Error('Failed to fetch cost data');
        }

        const data = await response.json();
        const gameSummary = data.summaries.find((s: CostSummary) => s.gameId === gameId);
        setSummary(gameSummary || null);
      } catch (err) {
        console.error('Failed to fetch cost metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCostData();

    // Refresh every 10 seconds during active game
    const interval = setInterval(fetchCostData, 10000);
    return () => clearInterval(interval);
  }, [gameId]);

  if (loading || !summary) {
    return null; // Don't show anything if no data yet
  }

  const isHighCost = summary.totalCost > 5.0;
  const isLowCache = summary.cacheHitRate < 0.7 && summary.totalTurns > 5;
  const hasWarning = isHighCost || isLowCache;

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Cost Metrics</span>
          {hasWarning && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              Alert
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="space-y-3 mt-3">
            {/* Total Cost */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Cost:</span>
              <span
                className={`text-sm font-semibold ${
                  isHighCost ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                ${summary.totalCost.toFixed(4)}
              </span>
            </div>

            {/* Cache Hit Rate */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cache Hit Rate:</span>
              <span
                className={`text-sm font-semibold ${
                  isLowCache ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {(summary.cacheHitRate * 100).toFixed(1)}%
              </span>
            </div>

            {/* Total Turns */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Turns:</span>
              <span className="text-sm font-semibold text-gray-900">
                {summary.totalTurns}
              </span>
            </div>

            {/* Avg Cost Per Turn */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Cost/Turn:</span>
              <span className="text-sm font-semibold text-gray-900">
                ${summary.avgCostPerTurn.toFixed(4)}
              </span>
            </div>

            {/* Status */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    summary.status === 'HEALTHY'
                      ? 'bg-green-100 text-green-800'
                      : summary.status === 'COST_EXCEEDED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {summary.status === 'HEALTHY'
                    ? 'Healthy'
                    : summary.status === 'COST_EXCEEDED'
                    ? 'High Cost'
                    : 'Cache Issue'}
                </span>
              </div>
            </div>

            {/* Warnings */}
            {summary.warnings.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-red-600 space-y-1">
                  {summary.warnings.map((warning, idx) => (
                    <div key={idx}>{warning}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
