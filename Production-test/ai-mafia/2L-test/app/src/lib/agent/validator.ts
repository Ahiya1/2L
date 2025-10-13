/**
 * Response Validator
 *
 * Validates agent responses to ensure they meet quality criteria.
 * Checks minimum length, game-relevant keywords, and forbidden content.
 */

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Check if response contains game-relevant keywords
 */
function hasGameRelevantContent(response: string): boolean {
  const relevantKeywords = [
    'vote',
    'voting',
    'mafia',
    'suspicious',
    'suspect',
    'innocent',
    'think',
    'believe',
    'accuse',
    'defend',
    'pattern',
    'evidence',
    'round',
    'agent',
    'trust',
    'question',
    'why',
    'who',
    'what',
    'how',
    'when',
    'notice',
    'observe',
    'interesting',
  ];

  const lowerResponse = response.toLowerCase();
  return relevantKeywords.some((keyword) => lowerResponse.includes(keyword));
}

/**
 * Check for forbidden phrases that reveal role or break character
 */
function hasForbiddenContent(response: string): string | null {
  const forbiddenPhrases = [
    'i am a villager',
    'i am a mafia',
    'i am mafia',
    'we villagers',
    'we mafia',
    'as a villager',
    'as a mafia',
    'as mafia',
    'my role is',
    'my role:',
    'my prompt',
    'my instructions',
    'i am an ai',
    'i am programmed',
    'i was designed',
    'as an ai',
  ];

  const lowerResponse = response.toLowerCase();
  return forbiddenPhrases.find((phrase) => lowerResponse.includes(phrase)) || null;
}

/**
 * Check for excessive repetition
 */
function hasExcessiveRepetition(response: string): boolean {
  // Check for repeated words (same word 3+ times in a row)
  const words = response.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length - 2; i++) {
    if (words[i] === words[i + 1] && words[i] === words[i + 2]) {
      return true;
    }
  }

  // Check for repeated phrases (5+ words repeated)
  const phrases = response.match(/\b\w+(?:\s+\w+){4,}\b/g);
  if (phrases) {
    const phraseCounts = new Map<string, number>();
    for (const phrase of phrases) {
      const normalized = phrase.toLowerCase();
      phraseCounts.set(normalized, (phraseCounts.get(normalized) || 0) + 1);
      if (phraseCounts.get(normalized)! > 1) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate agent response with comprehensive checks
 *
 * @param response - Generated response text
 * @param minWords - Minimum word count (default: 5)
 * @param maxWords - Maximum word count (default: 100)
 * @returns Validation result with errors and warnings
 */
export function validateAgentResponse(
  response: string,
  minWords: number = 5,
  maxWords: number = 100
): ValidationResult {
  const warnings: string[] = [];

  // Empty check
  if (!response || response.trim().length === 0) {
    return { isValid: false, error: 'Empty response' };
  }

  // Word count check
  const words = response.trim().split(/\s+/);
  const wordCount = words.length;

  if (wordCount < minWords) {
    return {
      isValid: false,
      error: `Too short (${wordCount} words, minimum ${minWords})`,
    };
  }

  if (wordCount > maxWords) {
    return {
      isValid: false,
      error: `Too long (${wordCount} words, maximum ${maxWords})`,
    };
  }

  // Warn if response is very short (but still above minimum)
  if (wordCount < 10) {
    warnings.push(`Response is quite short (${wordCount} words)`);
  }

  // Game-relevant content check
  if (!hasGameRelevantContent(response)) {
    return {
      isValid: false,
      error: 'No game-relevant keywords found',
    };
  }

  // Forbidden content check
  const forbiddenPhrase = hasForbiddenContent(response);
  if (forbiddenPhrase) {
    return {
      isValid: false,
      error: `Contains forbidden phrase: "${forbiddenPhrase}"`,
    };
  }

  // Repetition check
  if (hasExcessiveRepetition(response)) {
    warnings.push('Response contains excessive repetition');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Calculate repetition rate between current response and previous responses
 *
 * Useful for detecting if an agent is repeating the same accusations/defenses
 * across multiple turns.
 *
 * @param currentResponse - Current response
 * @param previousResponses - Previous responses from same player
 * @returns Repetition rate (0.0 to 1.0)
 */
export function calculateRepetitionRate(
  currentResponse: string,
  previousResponses: string[]
): number {
  if (previousResponses.length === 0) return 0;

  // Extract significant words (3+ characters, not common words)
  const commonWords = new Set([
    'the',
    'and',
    'but',
    'for',
    'are',
    'this',
    'that',
    'with',
    'have',
    'from',
    'they',
    'been',
    'were',
    'what',
    'when',
    'where',
    'which',
    'who',
    'will',
    'can',
    'all',
    'you',
    'your',
  ]);

  const currentWords = currentResponse
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !commonWords.has(w));

  if (currentWords.length === 0) return 0;

  // Calculate overlap with each previous response
  let maxOverlap = 0;
  for (const prevResponse of previousResponses) {
    const prevWords = new Set(
      prevResponse
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !commonWords.has(w))
    );

    const overlappingWords = currentWords.filter((w) => prevWords.has(w));
    const overlap = overlappingWords.length / currentWords.length;

    maxOverlap = Math.max(maxOverlap, overlap);
  }

  return maxOverlap;
}

/**
 * Check if response is on-topic (responds to recent conversation)
 *
 * Simple heuristic: response should share at least one player name or
 * keyword with recent messages.
 *
 * @param response - Current response
 * @param recentMessages - Recent messages from other players
 * @returns true if response appears on-topic
 */
export function isOnTopic(response: string, recentMessages: string[]): boolean {
  if (recentMessages.length === 0) return true; // Can't be off-topic if no context

  const responseWords = new Set(
    response
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  );

  // Extract player names (Agent-X pattern)
  const playerNamePattern = /agent-[a-z]+/gi;
  const responsePlayerNames = new Set(
    Array.from(response.matchAll(playerNamePattern)).map((m) => m[0].toLowerCase())
  );

  // Check recent messages for overlap
  for (const msg of recentMessages) {
    const msgWords = new Set(
      msg
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3)
    );

    const msgPlayerNames = new Set(
      Array.from(msg.matchAll(playerNamePattern)).map((m) => m[0].toLowerCase())
    );

    // Check for player name overlap
    for (const name of responsePlayerNames) {
      if (msgPlayerNames.has(name)) return true;
    }

    // Check for significant word overlap (at least 2 words in common)
    let wordOverlap = 0;
    for (const word of responseWords) {
      if (msgWords.has(word)) wordOverlap++;
      if (wordOverlap >= 2) return true;
    }
  }

  return false;
}
