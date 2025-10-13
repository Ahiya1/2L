/**
 * ConnectionStatus Component
 *
 * Displays real-time connection status for SSE connection
 *
 * States:
 * - Connected (green): SSE active
 * - Reconnecting (yellow): Connection lost, attempting reconnect
 * - Polling Fallback (orange): SSE failed, using polling
 * - Disconnected (red): No connection
 */

'use client';

import { useGameEvents } from '@/contexts/GameEventsContext';

export default function ConnectionStatus() {
  const { isConnected, error, reconnectAttempts } = useGameEvents();

  // Determine connection state
  const getConnectionState = () => {
    if (isConnected && !error) {
      return {
        label: 'Connected',
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    }

    if (reconnectAttempts >= 3) {
      return {
        label: 'Polling Fallback',
        color: 'bg-orange-500',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
      };
    }

    if (reconnectAttempts > 0) {
      return {
        label: 'Reconnecting...',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
      };
    }

    return {
      label: 'Disconnected',
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    };
  };

  const state = getConnectionState();

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${state.bgColor} ${state.borderColor}`}
    >
      {/* Status indicator dot */}
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${state.color}`} />
        {reconnectAttempts > 0 && reconnectAttempts < 3 && (
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${state.color} animate-ping`} />
        )}
      </div>

      {/* Status text */}
      <div className={`text-sm font-medium ${state.textColor}`}>
        {state.label}
      </div>

      {/* Reconnect attempts indicator */}
      {reconnectAttempts > 0 && reconnectAttempts < 3 && (
        <div className="text-xs text-gray-500">
          (Attempt {reconnectAttempts})
        </div>
      )}

      {/* Error message (tooltip on hover) */}
      {error && (
        <div className="group relative">
          <svg
            className="w-4 h-4 text-red-500 cursor-help"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
