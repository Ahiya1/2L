/**
 * Phase configuration and utilities
 *
 * Central configuration for phase display, timing, and styling
 */

import type { GamePhase, PhaseConfig } from './types';

/**
 * Phase display configurations
 */
export const PHASE_CONFIGS: Record<GamePhase, PhaseConfig> = {
  LOBBY: {
    name: 'LOBBY',
    displayName: 'Lobby',
    color: 'gray',
    icon: '⏳',
    duration: 0,
  },
  NIGHT: {
    name: 'NIGHT',
    displayName: 'Night Phase',
    color: 'purple',
    icon: '🌙',
    duration: 45, // 45 seconds
  },
  DAY_ANNOUNCEMENT: {
    name: 'DAY_ANNOUNCEMENT',
    displayName: 'Day Announcement',
    color: 'orange',
    icon: '☀️',
    duration: 10, // 10 seconds
  },
  DISCUSSION: {
    name: 'DISCUSSION',
    displayName: 'Discussion',
    color: 'blue',
    icon: '💬',
    duration: 180, // 3 minutes
  },
  VOTING: {
    name: 'VOTING',
    displayName: 'Voting',
    color: 'red',
    icon: '🗳️',
    duration: 120, // 2 minutes (dynamic based on player count)
  },
  WIN_CHECK: {
    name: 'WIN_CHECK',
    displayName: 'Win Check',
    color: 'yellow',
    icon: '⚖️',
    duration: 5, // 5 seconds
  },
  GAME_OVER: {
    name: 'GAME_OVER',
    displayName: 'Game Over',
    color: 'green',
    icon: '🏁',
    duration: 0,
  },
};

/**
 * Get phase configuration
 */
export function getPhaseConfig(phase: GamePhase | null): PhaseConfig {
  if (!phase) return PHASE_CONFIGS.LOBBY;
  return PHASE_CONFIGS[phase] || PHASE_CONFIGS.LOBBY;
}

/**
 * Get Tailwind color classes for phase
 */
export function getPhaseColorClasses(phase: GamePhase | null): {
  bg: string;
  text: string;
  border: string;
} {
  const config = getPhaseConfig(phase);

  const defaultColors = {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
  };

  const colorMap: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    gray: defaultColors,
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-300',
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
    },
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300',
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
    },
    yellow: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
    },
  };

  return colorMap[config.color] ?? defaultColors;
}

/**
 * Format time as MM:SS
 */
export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate phase end time
 */
export function calculatePhaseEndTime(
  phaseStartTime: Date | null,
  phase: GamePhase | null
): Date | null {
  if (!phaseStartTime || !phase) return null;

  const config = getPhaseConfig(phase);
  if (config.duration === 0) return null;

  return new Date(phaseStartTime.getTime() + config.duration * 1000);
}

/**
 * Calculate time remaining in phase
 */
export function calculateTimeRemaining(
  phaseEndTime: Date | null
): number {
  if (!phaseEndTime) return 0;
  return Math.max(0, Math.floor((phaseEndTime.getTime() - Date.now()) / 1000));
}
