/**
 * DiscussionFeed Component
 *
 * Enhanced with:
 * - Conversation threading (CSS indentation, max 3 levels)
 * - Message type color-coding (accusations, defenses, questions, alliances)
 * - Deterministic avatars with player initials
 * - Relative timestamps ("2 minutes ago")
 * - Auto-scroll with toggle to pause/resume
 * - Scroll lock button for reviewing history
 * - Uses shared GameEventsContext
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameEvents } from '@/contexts/GameEventsContext';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import {
  classifyMessage,
  getMessageStyle,
  extractRecentAccusations,
  type MessageType,
} from '@/src/utils/message-classification';
import {
  getAvatarColor,
  getAvatarTextColor,
  getAvatarInitial,
} from '@/src/utils/avatar-colors';

interface Message {
  id: string;
  turn: number;
  roundNumber: number;
  player: {
    id: string;
    name: string;
  };
  message: string;
  timestamp: Date;
  inReplyToId?: string | null;
  inReplyTo?: {
    player: {
      name: string;
    };
  };
}

interface DiscussionFeedProps {
  gameId: string;
  playerNames?: string[]; // For accusation highlighting
}

export default function DiscussionFeed({ gameId, playerNames = [] }: DiscussionFeedProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { events, isConnected } = useGameEvents();

  // Extract message events from GameEventsContext
  useEffect(() => {
    const messageEvents = events.filter((e) => e.type === 'message');

    const extractedMessages: Message[] = messageEvents.map((e: any) => ({
      id: e.payload.id || `${e.payload.playerId}-${Date.now()}`,
      turn: e.payload.turn || 0,
      roundNumber: e.payload.roundNumber || 0,
      player: {
        id: e.payload.playerId,
        name: e.payload.playerName,
      },
      message: e.payload.message,
      timestamp: e.payload.timestamp ? new Date(e.payload.timestamp) : new Date(),
      inReplyToId: e.payload.inReplyToId || null,
      inReplyTo: e.payload.inReplyTo,
    }));

    setMessages(extractedMessages);
  }, [events]);

  // Auto-scroll to bottom when new messages arrive (only if autoScroll enabled)
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Calculate thread depth for indentation (max 3 levels)
  const getThreadDepth = (messageId: string, messages: Message[]): number => {
    let depth = 0;
    let currentId: string | null | undefined = messageId;
    const visited = new Set<string>(); // Prevent infinite loops

    while (depth < 3 && currentId) {
      if (visited.has(currentId)) break; // Circular reference protection
      visited.add(currentId);

      const currentMsg = messages.find((m) => m.id === currentId);
      if (!currentMsg?.inReplyToId) break;

      depth++;
      currentId = currentMsg.inReplyToId;
    }

    return depth;
  };

  // Format relative time using date-fns
  const formatRelativeTime = (date: Date): string => {
    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();

      // For very recent messages, show "just now"
      if (diffMs < 10000) return 'just now';

      // Use date-fns for relative formatting
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      // Fallback to absolute time if formatting fails
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // Build context for message classification (recent accusations)
  const messageContext = useMemo(() => {
    const recentAccusations = extractRecentAccusations(
      messages.map((m) => ({
        id: m.id,
        playerId: m.player.id,
        playerName: m.player.name,
        message: m.message,
      })),
      10 // Last 10 messages
    );

    return {
      recentAccusations,
      playerNames,
    };
  }, [messages, playerNames]);

  // Highlight accusations in message text (kept for backward compatibility)
  const highlightAccusations = (message: string, names: string[]): React.ReactNode => {
    if (names.length === 0) {
      return <span>{message}</span>;
    }

    // Build regex patterns for accusation detection
    const patterns: RegExp[] = [];
    names.forEach((name) => {
      // Pattern 1: "I think [name] is Mafia/suspicious"
      patterns.push(new RegExp(`(I think ${name} is (?:Mafia|mafia|suspicious))`, 'gi'));

      // Pattern 2: "I suspect [name]"
      patterns.push(new RegExp(`(I suspect ${name})`, 'gi'));

      // Pattern 3: "[name] is suspicious/Mafia"
      patterns.push(new RegExp(`(${name} is (?:suspicious|Mafia|mafia))`, 'gi'));

      // Pattern 4: "I vote for [name]"
      patterns.push(new RegExp(`(I vote for ${name})`, 'gi'));
    });

    // Find all matches across all patterns
    const matches: Array<{ start: number; end: number; text: string }> = [];
    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        });
      }
    });

    // If no matches, return plain text
    if (matches.length === 0) {
      return <span>{message}</span>;
    }

    // Sort matches by start position and merge overlapping
    matches.sort((a, b) => a.start - b.start);
    const mergedMatches: typeof matches = [];
    matches.forEach((match) => {
      if (mergedMatches.length === 0) {
        mergedMatches.push(match);
      } else {
        const last = mergedMatches[mergedMatches.length - 1];
        if (last && match.start <= last.end) {
          // Overlapping - extend the last match
          last.end = Math.max(last.end, match.end);
          last.text = message.substring(last.start, last.end);
        } else {
          mergedMatches.push(match);
        }
      }
    });

    // Build JSX with highlighted segments
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    mergedMatches.forEach((match, idx) => {
      // Add text before the match
      if (match.start > lastIndex) {
        segments.push(
          <span key={`text-${idx}`}>{message.substring(lastIndex, match.start)}</span>
        );
      }

      // Add highlighted match
      segments.push(
        <span key={`match-${idx}`} className="text-red-600 font-bold">
          {match.text}
        </span>
      );

      lastIndex = match.end;
    });

    // Add remaining text after last match
    if (lastIndex < message.length) {
      segments.push(
        <span key="text-end">{message.substring(lastIndex)}</span>
      );
    }

    return <>{segments}</>;
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-sm flex flex-col h-[600px]">
      {/* Header */}
      <div className="border-b border-gray-300 p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500 uppercase tracking-wide">
            Discussion Feed
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {messages.length} messages
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Scroll lock toggle */}
          <Button
            variant={autoScroll ? 'secondary' : 'primary'}
            onClick={() => setAutoScroll(!autoScroll)}
            className="text-xs px-2 py-1"
          >
            {autoScroll ? '🔒 Lock Scroll' : '▼ Auto-scroll'}
          </Button>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <div className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            Waiting for discussion to start...
          </div>
        ) : (
          messages.map((msg, idx) => {
            const threadDepth = getThreadDepth(msg.id, messages);
            const indentPx = threadDepth * 16; // 16px per level
            const messageType = classifyMessage(
              msg.message,
              msg.player.id,
              messageContext
            );
            const messageStyle = getMessageStyle(messageType);
            const avatarBgColor = getAvatarColor(msg.player.name);
            const avatarTextColor = getAvatarTextColor(msg.player.name);
            const avatarInitial = getAvatarInitial(msg.player.name);

            return (
              <div
                key={msg.id}
                style={{ marginLeft: `${indentPx}px` }}
                className={`p-3 rounded ${
                  idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                } ${threadDepth > 0 ? 'border-l-2 border-gray-300 pl-2' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar circle */}
                  <div
                    className={`w-10 h-10 rounded-full ${avatarBgColor} ${avatarTextColor} flex items-center justify-center font-bold text-lg flex-shrink-0`}
                  >
                    {avatarInitial}
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    {/* Threading indicator */}
                    {msg.inReplyTo && (
                      <div className="text-xs text-gray-400 mb-1">
                        ↪ Replying to {msg.inReplyTo.player.name}
                      </div>
                    )}

                    {/* Message header */}
                    <div className="flex items-baseline justify-between mb-1">
                      <div className="font-bold text-gray-900">
                        {msg.player.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        Round {msg.roundNumber}, Turn {msg.turn}
                      </div>
                    </div>

                    {/* Message content with color-coding */}
                    <div className={`text-sm ${messageStyle}`}>
                      {msg.message}
                    </div>

                    {/* Timestamp (relative) */}
                    <div className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
