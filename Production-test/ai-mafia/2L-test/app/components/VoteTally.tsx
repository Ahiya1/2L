/**
 * VoteTally Component
 *
 * Real-time vote aggregation and display for VOTING phase
 *
 * Features:
 * - Vote count per player (visual bar + count)
 * - Highlight player with most votes
 * - Show majority threshold
 * - Display vote justifications (hover)
 * - Only visible during VOTING phase
 * - Real-time updates via useGameEvents()
 */

'use client';

import { useMemo, useState } from 'react';
import { useGameEvents } from '@/contexts/GameEventsContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { VoteData } from '@/lib/game/types';

export interface VoteTallyProps {
  gameId: string;
  playerCount: number; // For calculating majority threshold
}

interface TallyEntry {
  targetId: string;
  targetName: string;
  count: number;
  voters: Array<{ name: string; justification: string }>;
}

export default function VoteTally({ gameId, playerCount }: VoteTallyProps) {
  const { events } = useGameEvents();
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  // Extract vote_cast events from context
  const votes = useMemo(() => {
    return events
      .filter((e) => e.type === 'vote_cast')
      .map((e) => e.payload as VoteData);
  }, [events]);

  // Aggregate votes by target player
  const tally = useMemo((): TallyEntry[] => {
    const tallyMap = new Map<string, TallyEntry>();

    votes.forEach((vote) => {
      const existing = tallyMap.get(vote.targetId);
      if (existing) {
        existing.count++;
        existing.voters.push({
          name: vote.voterName,
          justification: vote.justification,
        });
      } else {
        tallyMap.set(vote.targetId, {
          targetId: vote.targetId,
          targetName: vote.targetName,
          count: 1,
          voters: [
            {
              name: vote.voterName,
              justification: vote.justification,
            },
          ],
        });
      }
    });

    // Sort by vote count (descending)
    return Array.from(tallyMap.values()).sort((a, b) => b.count - a.count);
  }, [votes]);

  // Calculate majority threshold (simple majority)
  const majority = Math.ceil(playerCount / 2);
  const maxVotes = tally.length > 0 && tally[0] ? tally[0].count : 0;

  // Render vote bar (visual representation with majority threshold indicator)
  const renderVoteBar = (count: number): React.ReactNode => {
    const percentage = playerCount > 0 ? (count / playerCount) * 100 : 0;
    const majorityPercentage = playerCount > 0 ? (majority / playerCount) * 100 : 0;
    const barWidth = Math.min(percentage, 100);

    return (
      <div className="w-full relative">
        {/* Background track */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              count >= majority
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}
            style={{ width: `${barWidth}%` }}
          />
        </div>

        {/* Majority threshold line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-700 opacity-60"
          style={{ left: `${majorityPercentage}%` }}
          title={`Majority: ${majority} votes`}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-700 rounded-full" />
        </div>
      </div>
    );
  };

  return (
    <Card
      className="h-fit"
      data-testid="vote-tally"
      role="region"
      aria-label="Voting results"
    >
      {/* Header */}
      <div className="text-sm text-gray-500 uppercase tracking-wide mb-3 flex items-center justify-between">
        <span className="font-semibold">🗳️ Vote Tally</span>
        <Badge variant="phase">
          {votes.length}/{playerCount} votes
        </Badge>
      </div>

      {/* Threshold indicator with visual bar */}
      <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-300 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-600">
            <span className="font-bold">Majority threshold:</span> {majority} votes
          </div>
          <div className="text-xs text-gray-500">
            {maxVotes >= majority ? '✓ Reached' : `${majority - maxVotes} needed`}
          </div>
        </div>
        {/* Mini progress bar toward majority */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              maxVotes >= majority ? 'bg-red-500' : 'bg-blue-400'
            }`}
            style={{ width: `${Math.min((maxVotes / majority) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Vote tally list */}
      <div className="space-y-3">
        {tally.length === 0 ? (
          <div className="text-center text-gray-400 py-4 text-sm">
            No votes cast yet...
          </div>
        ) : (
          tally.map((entry, idx) => {
            const isLeader = idx === 0 && entry.count > 0;
            const hasReachedMajority = entry.count >= majority;
            const isExpanded = expandedPlayer === entry.targetId;

            return (
              <div
                key={entry.targetId}
                className={`p-3 rounded-lg border-2 transition-all duration-500 shadow-sm ${
                  hasReachedMajority
                    ? 'border-red-500 bg-red-50 shadow-red-200'
                    : isLeader
                    ? 'border-yellow-500 bg-yellow-50 shadow-yellow-200'
                    : 'border-gray-300 bg-white'
                }`}
                data-testid="vote-entry"
                data-target-id={entry.targetId}
                data-vote-count={entry.count}
              >
                {/* Player name + vote count */}
                <div className="flex justify-between items-center mb-2">
                  <div className="font-bold text-gray-800 flex items-center gap-2">
                    <span>{entry.targetName}</span>
                    {hasReachedMajority && (
                      <span className="text-red-600 text-xs font-semibold bg-red-100 px-2 py-0.5 rounded">
                        ⚠ MAJORITY
                      </span>
                    )}
                    {isLeader && !hasReachedMajority && (
                      <span className="text-yellow-600 text-xs font-semibold bg-yellow-100 px-2 py-0.5 rounded">
                        👑 LEADING
                      </span>
                    )}
                  </div>
                  <Badge variant={hasReachedMajority ? 'dead' : 'alive'}>
                    {entry.count} {entry.count === 1 ? 'vote' : 'votes'}
                  </Badge>
                </div>

                {/* Vote bar with majority threshold */}
                {renderVoteBar(entry.count)}

                {/* Voter names (clickable to expand justifications) */}
                <div className="mt-2">
                  <button
                    onClick={() =>
                      setExpandedPlayer(isExpanded ? null : entry.targetId)
                    }
                    className="text-xs text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {isExpanded ? '▼' : '▶'} Voted by:{' '}
                    {entry.voters.map((v) => v.name).join(', ')}
                  </button>
                </div>

                {/* Expanded justifications */}
                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-gray-200 pt-2">
                    {entry.voters.map((voter, vIdx) => (
                      <div
                        key={vIdx}
                        className="text-xs bg-white p-2 rounded border border-gray-200"
                      >
                        <div className="font-semibold text-gray-700 mb-1">
                          {voter.name}:
                        </div>
                        <div className="text-gray-600 italic">
                          "{voter.justification}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* All votes cast indicator */}
      {votes.length === playerCount && votes.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 text-sm text-blue-800 text-center">
          ✓ All votes cast! Tallying results...
        </div>
      )}

      {/* Voting in progress */}
      {votes.length > 0 && votes.length < playerCount && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Waiting for {playerCount - votes.length} more{' '}
          {playerCount - votes.length === 1 ? 'vote' : 'votes'}...
        </div>
      )}
    </Card>
  );
}
