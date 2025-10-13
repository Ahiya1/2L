/**
 * Message Classification Utilities
 *
 * Classifies discussion messages into types for color-coding:
 * - Accusations: "I think X is Mafia"
 * - Defenses: Responses from accused players
 * - Questions: Messages ending with "?" or containing question words
 * - Alliances: "I agree with X", "Let's work together"
 * - Neutral: Default category
 *
 * Pattern: Regex-based classification + context awareness
 */

export type MessageType = 'accusation' | 'defense' | 'question' | 'alliance' | 'neutral';

interface GameContext {
  // Recent accusations for defense detection
  recentAccusations?: Array<{
    targetId: string;
    targetName: string;
    accuserId: string;
  }>;
  // All player names for pattern matching
  playerNames?: string[];
}

/**
 * Classify a message into one of 5 types based on content and context
 * @param message - Message text to classify
 * @param playerId - ID of player who sent the message
 * @param context - Game context (accusations, player names)
 * @returns MessageType enum value
 */
export function classifyMessage(
  message: string,
  playerId: string,
  context: GameContext = {}
): MessageType {
  const lowerMessage = message.toLowerCase();

  // Priority 1: Accusation detection
  // Patterns: "I think X is Mafia", "I suspect X", "X is suspicious", "I vote for X"
  const accusationPatterns = [
    /i (think|believe|suspect) .* is (mafia|suspicious)/i,
    /i suspect /i,
    / is (suspicious|mafia|the mafia|definitely mafia)/i,
    /i vote for /i,
    /vote for /i,
    /accuse /i,
  ];

  for (const pattern of accusationPatterns) {
    if (pattern.test(lowerMessage)) {
      return 'accusation';
    }
  }

  // Priority 2: Defense detection
  // If this player was recently accused, defensive language = defense
  const wasAccused = context.recentAccusations?.some(
    (acc) => acc.targetId === playerId
  );

  if (wasAccused) {
    const defensePatterns = [
      /i('m| am) not/i,
      /that'?s not true/i,
      /i didn'?t/i,
      /i'?m innocent/i,
      /i'?m (a )?villager/i,
      /why would i/i,
      /that doesn'?t make sense/i,
    ];

    for (const pattern of defensePatterns) {
      if (pattern.test(lowerMessage)) {
        return 'defense';
      }
    }
  }

  // Priority 3: Question detection
  // Ends with "?" or contains question words
  if (
    lowerMessage.includes('?') ||
    /\b(why|what|who|when|where|how|can|should|do you|does|did)\b/i.test(lowerMessage)
  ) {
    return 'question';
  }

  // Priority 4: Alliance detection
  // "I agree", "X is right", "let's work together", "trust"
  const alliancePatterns = [
    /i agree/i,
    / is right/i,
    /let'?s (work|team|cooperate)/i,
    /i trust/i,
    /we should (work|team|cooperate)/i,
    /good point/i,
    /i support/i,
  ];

  for (const pattern of alliancePatterns) {
    if (pattern.test(lowerMessage)) {
      return 'alliance';
    }
  }

  // Default: Neutral
  return 'neutral';
}

/**
 * Get Tailwind CSS styling classes for a message type
 * @param type - Message type enum
 * @returns CSS class string for text styling
 */
export function getMessageStyle(type: MessageType): string {
  switch (type) {
    case 'accusation':
      return 'text-red-600 font-semibold'; // Bold red for accusations
    case 'defense':
      return 'text-blue-600'; // Blue for defenses
    case 'question':
      return 'text-yellow-600'; // Yellow for questions
    case 'alliance':
      return 'text-green-600'; // Green for alliances
    case 'neutral':
    default:
      return 'text-gray-900'; // Default dark gray
  }
}

/**
 * Get a human-readable label for a message type
 * @param type - Message type enum
 * @returns Display label string
 */
export function getMessageTypeLabel(type: MessageType): string {
  switch (type) {
    case 'accusation':
      return 'Accusation';
    case 'defense':
      return 'Defense';
    case 'question':
      return 'Question';
    case 'alliance':
      return 'Alliance';
    case 'neutral':
    default:
      return 'Neutral';
  }
}

/**
 * Extract recent accusations from message history for context building
 * @param messages - Array of discussion messages
 * @param maxRecent - Number of recent messages to scan (default: 10)
 * @returns Array of accusation objects
 */
export function extractRecentAccusations(
  messages: Array<{
    id: string;
    playerId: string;
    playerName: string;
    message: string;
  }>,
  maxRecent: number = 10
): Array<{ targetId: string; targetName: string; accuserId: string }> {
  const accusations: Array<{
    targetId: string;
    targetName: string;
    accuserId: string;
  }> = [];

  // Scan last N messages for accusations
  const recentMessages = messages.slice(-maxRecent);

  recentMessages.forEach((msg) => {
    const lowerMessage = msg.message.toLowerCase();

    // Try to extract accused player name from patterns
    // Pattern: "I think [Name] is Mafia"
    const thinkPattern = /i think (\w+) is (mafia|suspicious)/i;
    const suspectPattern = /i suspect (\w+)/i;
    const votePattern = /i vote for (\w+)/i;

    const patterns = [thinkPattern, suspectPattern, votePattern];

    for (const pattern of patterns) {
      const match = pattern.exec(msg.message);
      if (match) {
        const targetName = match[1];

        // Find target player ID from message history (best effort)
        const targetMessage = messages.find(
          (m) => m.playerName.toLowerCase() === targetName?.toLowerCase()
        );

        if (targetMessage && targetName) {
          accusations.push({
            targetId: targetMessage.playerId,
            targetName: targetMessage.playerName,
            accuserId: msg.playerId,
          });
        }

        break; // Only one accusation per message
      }
    }
  });

  return accusations;
}
