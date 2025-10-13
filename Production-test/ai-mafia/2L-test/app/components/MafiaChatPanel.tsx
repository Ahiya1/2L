/**
 * MafiaChatPanel Component
 *
 * Displays Mafia coordination messages during Night phase with:
 * - Real-time updates via SSE (night_message events)
 * - Historical message fetch on mount
 * - Deterministic avatars with player initials
 * - Relative timestamps ("2 minutes ago")
 * - Auto-scroll with toggle
 * - Show/hide based on current phase
 * - Red theme for Mafia coordination
 *
 * Pattern: Copied from DiscussionFeed.tsx and adapted for night messages
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameEvents } from '@/contexts/GameEventsContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import {
  getAvatarColor,
  getAvatarTextColor,
  getAvatarInitial,
} from '@/src/utils/avatar-colors';

interface NightMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
  roundNumber: number;
  turn: number;
}

interface MafiaChatPanelProps {
  gameId: string;
}

export default function MafiaChatPanel({ gameId }: MafiaChatPanelProps) {
  const { events, isConnected } = useGameEvents();
  const [nightMessages, setNightMessages] = useState<NightMessage[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Extract current phase from events
  const currentPhase = useMemo(() => {
    const phaseEvents = events.filter((e) => e.type === 'phase_change');
    if (phaseEvents.length === 0) return null;
    const latest = phaseEvents[phaseEvents.length - 1];
    if (!latest) return null;
    return (latest.payload as any).to;
  }, [events]);

  // Subscribe to night_message events (real-time)
  useEffect(() => {
    const nightMessageEvents = events.filter((e) => e.type === 'night_message');

    if (nightMessageEvents.length === 0) return;

    const messages: NightMessage[] = nightMessageEvents.map((e) => {
      const payload = e.payload as any;
      return {
        id: payload.id,
        playerId: payload.playerId,
        playerName: payload.playerName,
        message: payload.message,
        timestamp: payload.timestamp,
        roundNumber: payload.roundNumber,
        turn: payload.turn,
      };
    });

    setNightMessages((prev) => {
      // Merge with historical messages (deduplicate by id)
      const allMessages = [...prev, ...messages];
      const unique = Array.from(
        new Map(allMessages.map((m) => [m.id, m])).values()
      );
      return unique.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  }, [events]);

  // Fetch historical night messages on mount
  useEffect(() => {
    if (historyLoaded) return;

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/game/${gameId}/night-messages`);
        if (!res.ok) {
          console.warn('[MafiaChatPanel] Failed to fetch history:', res.status);
          setHistoryLoaded(true);
          return;
        }

        const data = await res.json();
        const historicalMessages: NightMessage[] = data.messages || [];

        setNightMessages((prev) => {
          // Merge with real-time messages (deduplicate by id)
          const allMessages = [...historicalMessages, ...prev];
          const unique = Array.from(
            new Map(allMessages.map((m) => [m.id, m])).values()
          );
          return unique.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        setHistoryLoaded(true);
      } catch (error) {
        console.error('[MafiaChatPanel] Failed to fetch history:', error);
        setHistoryLoaded(true);
      }
    }

    fetchHistory();
  }, [gameId, historyLoaded]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [nightMessages, autoScroll]);

  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();

      // For very recent messages, show "just now"
      if (diffMs < 10000) return 'just now';

      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'unknown time';
    }
  };

  // Show/hide based on phase
  const isNightPhase = currentPhase === 'NIGHT';

  // Hide panel completely if no Night phase has occurred yet
  if (!isNightPhase && nightMessages.length === 0) {
    return null;
  }

  return (
    <Card
      className="flex flex-col h-[600px]"
      data-testid="mafia-chat-panel"
      data-phase={currentPhase || 'unknown'}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-red-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-red-700 uppercase tracking-wide">
            🌙 Mafia Chat
          </span>
          <Badge variant="mafia">Private</Badge>
        </div>
        <div className="flex items-center gap-3">
          {!isNightPhase && (
            <Badge variant="phase" className="text-xs">
              No Activity
            </Badge>
          )}
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-2"
      >
        {nightMessages.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            {isNightPhase
              ? 'Waiting for Mafia coordination...'
              : 'No Mafia messages yet'}
          </div>
        ) : (
          nightMessages.map((msg, idx) => {
            const avatarBgColor = getAvatarColor(msg.playerName);
            const avatarTextColor = getAvatarTextColor(msg.playerName);
            const avatarInitial = getAvatarInitial(msg.playerName);

            return (
              <div
                key={msg.id}
                data-testid={`mafia-message-${idx}`}
                data-message-type="night_message"
                className="flex gap-3 p-3 rounded-lg bg-red-50 border border-red-200"
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarBgColor} ${avatarTextColor}`}
                >
                  {avatarInitial}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-red-900">
                      {msg.playerName}
                    </span>
                    <span className="text-xs text-red-600">
                      {formatRelativeTime(msg.timestamp)}
                    </span>
                    <span className="text-xs text-red-500">
                      Round {msg.roundNumber}, Turn {msg.turn}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-red-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{nightMessages.length} message(s)</span>
          <Button
            variant={autoScroll ? 'secondary' : 'primary'}
            onClick={() => setAutoScroll(!autoScroll)}
            className="text-xs px-2 py-1"
          >
            {autoScroll ? '🔒 Lock Scroll' : '▼ Auto-scroll'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
