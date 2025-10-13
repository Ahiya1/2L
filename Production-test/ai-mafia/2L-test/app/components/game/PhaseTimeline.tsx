/**
 * PhaseTimeline Component
 *
 * Visual timeline showing phase progression through the round
 * - Displays all phases: Night → Day → Discussion → Voting
 * - Highlights current phase
 * - Shows round progression
 * - Phase-specific icons and colors
 */

'use client';

import { useMemo } from 'react';
import { useGameEvents } from '@/contexts/GameEventsContext';
import { PHASE_CONFIGS } from '@/lib/game/phase-config';
import type { GamePhase } from '@/lib/game/types';

interface PhaseTimelineProps {
  gameId: string;
}

// Timeline phases (excluding LOBBY, WIN_CHECK, GAME_OVER)
const TIMELINE_PHASES: GamePhase[] = [
  'NIGHT',
  'DAY_ANNOUNCEMENT',
  'DISCUSSION',
  'VOTING',
];

export default function PhaseTimeline({ gameId }: PhaseTimelineProps) {
  const { events } = useGameEvents();

  // Extract current phase from events
  const currentPhase = useMemo<GamePhase | null>(() => {
    const phaseEvents = events.filter((e) => e.type === 'phase_change');
    if (phaseEvents.length === 0) return null;
    const latestPhase = phaseEvents[phaseEvents.length - 1];
    if (!latestPhase) return null;
    return (latestPhase.payload as any).to as GamePhase;
  }, [events]);

  // Determine current phase index
  const currentPhaseIndex = useMemo(() => {
    if (!currentPhase) return -1;
    return TIMELINE_PHASES.indexOf(currentPhase);
  }, [currentPhase]);

  // Get phase config for styling
  const getPhaseStyle = (phase: GamePhase, isActive: boolean, isPast: boolean) => {
    const config = PHASE_CONFIGS[phase];

    if (isActive) {
      return {
        border: 'border-4',
        borderColor: `border-${config.color}-500`,
        bg: `bg-${config.color}-100`,
        icon: 'text-3xl',
        opacity: 'opacity-100',
        scale: 'scale-110',
        glow: `shadow-lg shadow-${config.color}-300`,
      };
    } else if (isPast) {
      return {
        border: 'border-2',
        borderColor: `border-${config.color}-400`,
        bg: `bg-${config.color}-50`,
        icon: 'text-2xl',
        opacity: 'opacity-70',
        scale: 'scale-100',
        glow: '',
      };
    } else {
      return {
        border: 'border-2',
        borderColor: 'border-gray-300',
        bg: 'bg-gray-50',
        icon: 'text-2xl',
        opacity: 'opacity-50',
        scale: 'scale-100',
        glow: '',
      };
    }
  };

  return (
    <div
      className="mt-4"
      data-testid="phase-timeline"
      role="navigation"
      aria-label="Phase progression timeline"
    >
      <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3 text-center">
        Round Phase Progression
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-between gap-2">
        {TIMELINE_PHASES.map((phase, index) => {
          const config = PHASE_CONFIGS[phase];
          const isActive = phase === currentPhase;
          const isPast = currentPhaseIndex > index;
          const style = getPhaseStyle(phase, isActive, isPast);

          return (
            <div key={phase} className="flex-1 flex items-center">
              {/* Phase node */}
              <div className="flex-1 flex flex-col items-center">
                <div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center
                    transition-all duration-500 ease-in-out
                    ${style.border} ${style.bg} ${style.opacity} ${style.scale} ${style.glow}
                    ${isActive ? 'animate-pulse-subtle' : ''}
                  `}
                  style={{
                    borderColor: isActive
                      ? config.color === 'purple'
                        ? '#9333ea'
                        : config.color === 'orange'
                        ? '#f97316'
                        : config.color === 'blue'
                        ? '#3b82f6'
                        : config.color === 'red'
                        ? '#ef4444'
                        : '#6b7280'
                      : isPast
                      ? config.color === 'purple'
                        ? '#a855f7'
                        : config.color === 'orange'
                        ? '#fb923c'
                        : config.color === 'blue'
                        ? '#60a5fa'
                        : config.color === 'red'
                        ? '#f87171'
                        : '#9ca3af'
                      : '#d1d5db',
                    backgroundColor: isActive
                      ? config.color === 'purple'
                        ? '#f3e8ff'
                        : config.color === 'orange'
                        ? '#ffedd5'
                        : config.color === 'blue'
                        ? '#dbeafe'
                        : config.color === 'red'
                        ? '#fee2e2'
                        : '#f3f4f6'
                      : isPast
                      ? config.color === 'purple'
                        ? '#faf5ff'
                        : config.color === 'orange'
                        ? '#fff7ed'
                        : config.color === 'blue'
                        ? '#eff6ff'
                        : config.color === 'red'
                        ? '#fef2f2'
                        : '#f9fafb'
                      : '#f9fafb',
                  }}
                  data-phase-step={phase}
                  data-active={isActive}
                >
                  <span className={style.icon}>{config.icon}</span>
                </div>

                {/* Phase name */}
                <div
                  className={`mt-2 text-xs font-semibold text-center transition-all duration-300 ${
                    isActive
                      ? 'text-gray-800 scale-110'
                      : isPast
                      ? 'text-gray-600'
                      : 'text-gray-400'
                  }`}
                >
                  {config.displayName}
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className="mt-1 text-xs text-gray-500 font-medium">
                    ● Active
                  </div>
                )}
              </div>

              {/* Connector line (except after last phase) */}
              {index < TIMELINE_PHASES.length - 1 && (
                <div className="flex-1 h-1 mx-2 mb-8">
                  <div
                    className={`h-full rounded transition-all duration-500 ${
                      isPast ? 'bg-gray-400' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-200" />
          <span>Upcoming</span>
        </div>
      </div>
    </div>
  );
}
