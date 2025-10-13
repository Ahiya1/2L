/**
 * Test Data Fixtures
 * Constants and configurations for E2E tests
 */

// Game configurations
export const SMALL_GAME = {
  playerCount: 8,
  mafiaCount: 2,
  villagerCount: 6,
};

export const STANDARD_GAME = {
  playerCount: 10,
  mafiaCount: 3,
  villagerCount: 7,
};

export const LARGE_GAME = {
  playerCount: 12,
  mafiaCount: 3,
  villagerCount: 9,
};

// Phase durations (in seconds) - reference from Explorer-1
export const PHASE_DURATIONS = {
  NIGHT: 45,
  DAY_ANNOUNCEMENT: 10,
  DISCUSSION: 180,
  VOTING: 120,
  WIN_CHECK: 5,
};

// Expected message counts (broad ranges for AI variability)
export const MESSAGE_COUNTS = {
  DISCUSSION_MIN: 40, // Minimum messages in Discussion phase
  DISCUSSION_TYPICAL: 44, // Typical count
  NIGHT_MIN: 8, // Minimum night messages
};

// Timeout configurations (in milliseconds)
export const TIMEOUTS = {
  SSE_CONNECTION: 10000, // 10s
  PHASE_TRANSITION: 300000, // 5 min
  MESSAGE_GENERATION: 180000, // 3 min
  VOTING_COMPLETION: 120000, // 2 min
  FULL_GAME: 1800000, // 30 min
};

// Test game IDs (for debugging/manual testing)
export const TEST_GAME_IDS = {
  SAMPLE: 'test-game-id-placeholder',
};

// Selector constants
export const SELECTORS = {
  PLAYER_GRID: '[data-testid="player-grid"]',
  PLAYER_CARD: '[data-testid^="player-card-"]',
  PHASE_INDICATOR: '[data-testid="phase-indicator"]',
  MAFIA_CHAT_PANEL: '[data-testid="mafia-chat-panel"]',
  DISCUSSION_FEED: '[data-testid="discussion-feed"]',
  VOTE_TALLY: '[data-testid="vote-tally"]',
  PHASE_TIMER: '[data-testid="phase-timer"]',
  SSE_STATUS: '[data-testid="sse-status"]',
  CREATE_GAME_BUTTON: 'button:has-text("Create Game")',
  START_GAME_BUTTON: 'button:has-text("Start Game")',
};

// Badge types
export const BADGES = {
  MAFIA: 'MAFIA',
  VILLAGER: 'VILLAGER',
  ELIMINATED: 'ELIMINATED',
};

// Phase names
export const PHASES = {
  START: 'START',
  NIGHT: 'NIGHT',
  DAY_ANNOUNCEMENT: 'DAY_ANNOUNCEMENT',
  DISCUSSION: 'DISCUSSION',
  VOTING: 'VOTING',
  WIN_CHECK: 'WIN_CHECK',
  GAME_OVER: 'GAME_OVER',
};
