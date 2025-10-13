/**
 * Repetition Tracker
 *
 * Tracks agent message phrases to prevent verbatim repetition.
 * Monitors the last 3 messages per agent and extracts common phrases
 * to include in prompts as prohibited phrases.
 */

/** Map of playerId to their recent message phrases */
const agentPhrases = new Map<string, string[]>();

/**
 * Extract 3-word phrases from a message
 *
 * Splits message into lowercase words and creates sliding window
 * of 3-word phrases for pattern detection.
 *
 * @param message - Agent message text
 * @returns Array of 3-word phrases
 *
 * @example
 * extractPhrases("I think Agent-Alpha is suspicious")
 * // Returns: ["i think agent", "think agent alpha", "agent alpha is", "alpha is suspicious"]
 */
export function extractPhrases(message: string): string[] {
  // Normalize: lowercase and split on whitespace
  const words = message.toLowerCase().split(/\s+/);
  const phrases: string[] = [];

  // Extract 3-word sliding window phrases
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    phrases.push(phrase);
  }

  return phrases;
}

/**
 * Add agent message to repetition tracker
 *
 * Extracts phrases from the message and stores them for the agent.
 * Keeps only the last 20 phrases (approximately 3 messages' worth)
 * to maintain a rolling window of recent speech patterns.
 *
 * @param playerId - Agent's player ID
 * @param message - Message text from the agent
 *
 * @example
 * addAgentMessage("player-123", "I think Agent-Alpha is suspicious");
 * // Stores 4 phrases: ["i think agent", "think agent alpha", ...]
 */
export function addAgentMessage(playerId: string, message: string): void {
  const phrases = extractPhrases(message);
  const existing = agentPhrases.get(playerId) || [];

  // Keep last 20 phrases (rolling window of ~3 messages)
  const updated = [...phrases, ...existing].slice(0, 20);
  agentPhrases.set(playerId, updated);
}

/**
 * Get prohibited phrases for an agent
 *
 * Returns the top 5 most recent phrases that should be avoided
 * in the agent's next response to prevent repetitive language.
 *
 * @param playerId - Agent's player ID
 * @returns Array of prohibited phrases (max 5)
 *
 * @example
 * getProhibitedPhrases("player-123")
 * // Returns: ["i think agent", "agent alpha is", "is suspicious because", ...]
 */
export function getProhibitedPhrases(playerId: string): string[] {
  const phrases = agentPhrases.get(playerId) || [];

  // Return top 5 most recent phrases to avoid
  return phrases.slice(0, 5);
}

/**
 * Clear repetition tracker for a player
 *
 * Useful when a player is eliminated or a game ends.
 *
 * @param playerId - Agent's player ID
 */
export function clearPlayerPhrases(playerId: string): void {
  agentPhrases.delete(playerId);
}

/**
 * Clear all repetition tracking data
 *
 * Useful for resetting between games.
 */
export function clearAllPhrases(): void {
  agentPhrases.clear();
}

/**
 * Get phrase count for a player (for testing/debugging)
 *
 * @param playerId - Agent's player ID
 * @returns Number of tracked phrases
 */
export function getPhraseCount(playerId: string): number {
  return (agentPhrases.get(playerId) || []).length;
}
