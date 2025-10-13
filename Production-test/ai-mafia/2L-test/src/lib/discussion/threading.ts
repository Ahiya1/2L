/**
 * Threading inference for discussion messages
 *
 * Implements basic pattern matching to determine if a message
 * is replying to another message. Sets inReplyTo field for
 * conversation threading visualization.
 *
 * Features:
 * - Explicit mention detection ("Agent X", "@Agent X")
 * - Response phrase detection ("responding to", "I disagree with")
 * - Accusation target extraction ("I think X is Mafia")
 * - Simple pattern matching (no AI needed)
 *
 * Target: >30% of messages should have threading
 */

import type { DiscussionMessage } from '../types/shared';

/**
 * Determine if a message should be threaded to another message
 *
 * @param message The message text to analyze
 * @param recentMessages Last 5-10 messages for context
 * @returns Message ID to reply to, or null
 */
export function determineReplyTarget(
  message: string,
  recentMessages: DiscussionMessage[]
): string | null {
  if (recentMessages.length === 0) {
    return null;
  }

  // Priority 1: Explicit mentions
  const mentionedMessageId = findExplicitMention(message, recentMessages);
  if (mentionedMessageId) {
    return mentionedMessageId;
  }

  // Priority 2: Response phrases
  const responseMessageId = findResponsePhrase(message, recentMessages);
  if (responseMessageId) {
    return responseMessageId;
  }

  // Priority 3: Accusation response
  const accusationMessageId = findAccusationResponse(message, recentMessages);
  if (accusationMessageId) {
    return accusationMessageId;
  }

  // Default: Reply to most recent message (within last 3 turns)
  return recentMessages.length > 0 ? recentMessages[0].id : null;
}

/**
 * Find explicit mentions in message
 * Patterns: "Agent-X", "@Agent-X", "Agent X"
 */
function findExplicitMention(
  message: string,
  recentMessages: DiscussionMessage[]
): string | null {
  // Pattern: Agent-[A-Z] or @Agent-[A-Z] or Agent [A-Z]
  const mentionPatterns = [
    /Agent-([A-Z])/gi,
    /@Agent-([A-Z])/gi,
    /Agent\s+([A-Z])/gi,
  ];

  for (const pattern of mentionPatterns) {
    const matches = Array.from(message.matchAll(pattern));
    if (matches.length > 0) {
      // Get the mentioned name (e.g., "Agent-A")
      const mentionedName = matches[0][0].replace('@', '').trim();

      // Find the most recent message from that agent
      const mentionedMessage = recentMessages.find(
        (m) => m.player.name === mentionedName || m.player.name.includes(mentionedName)
      );

      if (mentionedMessage) {
        return mentionedMessage.id;
      }
    }
  }

  return null;
}

/**
 * Find response phrases indicating a reply
 * Patterns: "responding to", "replying to", "I disagree with", etc.
 */
function findResponsePhrase(
  message: string,
  recentMessages: DiscussionMessage[]
): string | null {
  const responsePatterns = [
    /responding to/i,
    /replying to/i,
    /I disagree with/i,
    /I agree with/i,
    /as .* said/i,
    /what .* said/i,
    /in response to/i,
    /that's not true/i,
    /you're wrong/i,
  ];

  for (const pattern of responsePatterns) {
    if (pattern.test(message)) {
      // Reply to most recent message (likely the one being referenced)
      return recentMessages.length > 0 ? recentMessages[0].id : null;
    }
  }

  return null;
}

/**
 * Find if this is responding to an accusation
 * Pattern: Someone accused this agent, now they're defending
 */
function findAccusationResponse(
  message: string,
  recentMessages: DiscussionMessage[]
): string | null {
  // Defense phrases
  const defensePatterns = [
    /I'm not Mafia/i,
    /I am innocent/i,
    /I'm a Villager/i,
    /that's false/i,
    /not true/i,
  ];

  const isDefending = defensePatterns.some((pattern) => pattern.test(message));

  if (!isDefending) {
    return null;
  }

  // Look for recent accusation against any agent in last 3 messages
  const recentAccusations = recentMessages.slice(0, 3);

  for (const msg of recentAccusations) {
    const accusationPatterns = [
      /I think .* is Mafia/i,
      /.*is suspicious/i,
      /.*must be Mafia/i,
      /vote for/i,
    ];

    if (accusationPatterns.some((pattern) => pattern.test(msg.message))) {
      return msg.id;
    }
  }

  return null;
}

/**
 * Extract accusation targets from a message
 * Returns array of player names that are being accused
 *
 * @param message The message text
 * @returns Array of accused player names
 */
export function extractAccusationTargets(message: string): string[] {
  const targets: string[] = [];

  // Pattern: "I think Agent-X is Mafia"
  const accusationPatterns = [
    /I think (Agent-[A-Z]|Agent\s+[A-Z]) is (?:Mafia|suspicious)/gi,
    /(Agent-[A-Z]|Agent\s+[A-Z]) (?:is|must be) (?:Mafia|suspicious)/gi,
    /vote (?:for )?(Agent-[A-Z]|Agent\s+[A-Z])/gi,
    /accuse (Agent-[A-Z]|Agent\s+[A-Z])/gi,
  ];

  for (const pattern of accusationPatterns) {
    const matches = Array.from(message.matchAll(pattern));
    for (const match of matches) {
      // Extract agent name from capture group
      const agentName = match[1].replace(/\s+/g, '-').trim();
      if (!targets.includes(agentName)) {
        targets.push(agentName);
      }
    }
  }

  return targets;
}

/**
 * Calculate threading statistics for a discussion
 *
 * @param messages All messages in the discussion
 * @returns Threading stats
 */
export function calculateThreadingStats(messages: DiscussionMessage[]): {
  totalMessages: number;
  threadedMessages: number;
  threadingRate: number;
  averageThreadDepth: number;
} {
  const totalMessages = messages.length;
  const threadedMessages = messages.filter((m) => m.inReplyToId !== null).length;
  const threadingRate = totalMessages > 0 ? threadedMessages / totalMessages : 0;

  // Calculate average thread depth (how many levels deep threads go)
  const threadDepths = messages.map((m) => {
    let depth = 0;
    let current = m;
    const visited = new Set<string>();

    while (current.inReplyToId && !visited.has(current.id)) {
      visited.add(current.id);
      depth++;
      const parent = messages.find((msg) => msg.id === current.inReplyToId);
      if (!parent) break;
      current = parent;
    }

    return depth;
  });

  const averageThreadDepth =
    threadDepths.length > 0
      ? threadDepths.reduce((sum, d) => sum + d, 0) / threadDepths.length
      : 0;

  return {
    totalMessages,
    threadedMessages,
    threadingRate,
    averageThreadDepth,
  };
}
