/**
 * PhaseIndicator Component (Enhanced)
 *
 * Displays:
 * - Current phase name with icon
 * - Countdown timer (updates every second)
 * - Phase-specific colors
 * - Phase transition animations
 *
 * Uses shared GameEventsContext for SSE updates
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGameEvents } from '@/contexts/GameEventsContext';
import {
  getPhaseConfig,
  getPhaseColorClasses,
  formatTimeRemaining,
  calculatePhaseEndTime,
  calculateTimeRemaining,
} from '@/lib/game/phase-config';
import type { GamePhase } from '@/lib/game/types';
import { Card } from '@/components/ui/Card';

interface PhaseIndicatorProps {
  gameId: string;
}

export default function PhaseIndicator({ gameId }: PhaseIndicatorProps) {
  const { events } = useGameEvents();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Extract current phase from events
  const currentPhase = useMemo<GamePhase | null>(() => {
    const phaseEvents = events.filter((e) => e.type === 'phase_change');
    if (phaseEvents.length === 0) return null;
    const latestPhase = phaseEvents[phaseEvents.length - 1];
    if (!latestPhase) return null;
    return (latestPhase.payload as any).to as GamePhase;
  }, [events]);

  // Extract current round number from events
  const currentRound = useMemo<number>(() => {
    const phaseEvents = events.filter((e) => e.type === 'phase_change');
    if (phaseEvents.length === 0) return 1;
    const latestPhase = phaseEvents[phaseEvents.length - 1];
    if (!latestPhase) return 1;
    return (latestPhase.payload as any).round || 1;
  }, [events]);

  // Extract phase start time from events (server-authoritative)
  const phaseStartTime = useMemo<Date | null>(() => {
    const phaseEvents = events.filter((e) => e.type === 'phase_change');
    if (phaseEvents.length === 0) return null;

    const latestPhase = phaseEvents[phaseEvents.length - 1];
    if (!latestPhase?.payload?.phaseStartTime) return null;

    // Use server-provided phaseStartTime (ISO 8601 string)
    return new Date(latestPhase.payload.phaseStartTime);
  }, [events]);

  // Calculate phase end time
  const phaseEndTime = useMemo(() => {
    return calculatePhaseEndTime(phaseStartTime, currentPhase);
  }, [phaseStartTime, currentPhase]);

  // Countdown timer (update every second)
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(phaseEndTime);
      setTimeRemaining(remaining);
    }, 1000);

    // Update immediately
    setTimeRemaining(calculateTimeRemaining(phaseEndTime));

    return () => clearInterval(interval);
  }, [phaseEndTime]);

  // Debug logging for timer sync verification (TEMPORARY - remove after testing)
  useEffect(() => {
    if (phaseStartTime && currentPhase) {
      console.log('[TIMER DEBUG] Phase:', currentPhase);
      console.log('[TIMER DEBUG] phaseStartTime:', phaseStartTime.toISOString());
      console.log('[TIMER DEBUG] phaseEndTime:', phaseEndTime?.toISOString());
      console.log('[TIMER DEBUG] timeRemaining:', timeRemaining, 'seconds');
    }
  }, [phaseStartTime, phaseEndTime, timeRemaining, currentPhase]);

  // Get phase configuration
  const phaseConfig = getPhaseConfig(currentPhase);
  const colorClasses = getPhaseColorClasses(currentPhase);

  // Calculate progress percentage for progress bar
  const progressPercentage = useMemo(() => {
    if (phaseConfig.duration === 0) return 0;
    return Math.min(100, (timeRemaining / phaseConfig.duration) * 100);
  }, [timeRemaining, phaseConfig.duration]);

  // Get phase description
  const getPhaseDescription = (phase: GamePhase | null): string => {
    switch (phase) {
      case 'NIGHT':
        return 'Mafia coordinates their strategy in private';
      case 'DAY_ANNOUNCEMENT':
        return 'Morning briefing - reviewing last night\'s events';
      case 'DISCUSSION':
        return 'Public debate - players share suspicions and build cases';
      case 'VOTING':
        return 'Democratic elimination - vote for the most suspicious player';
      case 'WIN_CHECK':
        return 'Checking victory conditions';
      case 'GAME_OVER':
        return 'Game has concluded';
      default:
        return 'Waiting for game to start...';
    }
  };

  const phaseDescription = getPhaseDescription(currentPhase);

  return (
    <Card
      className={`transition-colors duration-500 ${colorClasses.bg} border-2 ${colorClasses.border}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <div className="text-sm text-gray-500 uppercase tracking-wide">
            Current Phase
          </div>
          <div
            className={`text-2xl font-bold flex items-center gap-2 ${colorClasses.text}`}
          >
            <span className="text-3xl">{phaseConfig.icon}</span>
            <span>{phaseConfig.displayName}</span>
          </div>

          {/* Phase description */}
          <div className="text-sm text-gray-600 mt-1 italic">
            {phaseDescription}
          </div>
        </div>

        <div className="text-right ml-4">
          {/* Turn/Round counter */}
          <div className="text-sm text-gray-500 uppercase tracking-wide">
            Round
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {currentRound} <span className="text-sm text-gray-500">/ 40</span>
          </div>

          {/* Time remaining (if timed phase) */}
          {phaseConfig.duration > 0 && (
            <>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-2">
                Time Left
              </div>
              <div className="text-lg font-mono font-bold text-gray-800">
                {formatTimeRemaining(timeRemaining)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress bar (only show if phase has duration) */}
      {phaseConfig.duration > 0 && (
        <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              currentPhase === 'NIGHT'
                ? 'bg-purple-500'
                : currentPhase === 'DAY_ANNOUNCEMENT'
                ? 'bg-orange-500'
                : currentPhase === 'DISCUSSION'
                ? 'bg-blue-500'
                : currentPhase === 'VOTING'
                ? 'bg-red-500'
                : currentPhase === 'WIN_CHECK'
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{
              width: `${progressPercentage}%`,
            }}
          />
        </div>
      )}
    </Card>
  );
}
