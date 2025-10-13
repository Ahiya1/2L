import { Page, expect } from '@playwright/test';

/**
 * Create a new game via the lobby UI
 * @param page Playwright page
 * @returns Object containing gameId
 */
export async function createGame(page: Page): Promise<{ gameId: string }> {
  console.log('[Test] Creating game via lobby...');

  try {
    // Navigate to lobby
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // Wait for Create Game button to be visible and enabled
    const createButton = page.locator('button:has-text("Create Game")');
    await createButton.waitFor({ state: 'visible', timeout: 10000 });

    // Click create game
    await createButton.click();

    // Wait for navigation to game page
    await page.waitForURL(/\/game\/.+/, { timeout: 15000 });

    // Extract gameId from URL
    const url = page.url();
    const match = url.match(/\/game\/([a-zA-Z0-9_-]+)/);

    if (!match || !match[1]) {
      throw new Error(`Failed to extract gameId from URL: ${url}`);
    }

    const gameId = match[1];
    console.log(`[Test] Created game: ${gameId}`);

    return { gameId };
  } catch (error) {
    console.error('[Test] Failed to create game:', error);
    throw error;
  }
}

/**
 * Start a game (click Start Game button)
 * @param page Playwright page
 * @param gameId Game ID to start
 */
export async function startGame(page: Page, gameId: string): Promise<void> {
  console.log(`[Test] Starting game: ${gameId}`);

  try {
    // Navigate to game page if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes(gameId)) {
      await page.goto(`http://localhost:3000/game/${gameId}`);
      await page.waitForLoadState('domcontentloaded');
    }

    // Wait for Start Game button
    const startButton = page.locator('button:has-text("Start Game")');
    await startButton.waitFor({ state: 'visible', timeout: 10000 });

    // Click Start Game
    await startButton.click();

    // Wait for phase to change from START to NIGHT or DAY
    await page.waitForFunction(
      () => {
        const phaseIndicator = document.querySelector('[data-testid="phase-indicator"]');
        const phase = phaseIndicator?.getAttribute('data-phase');
        return phase && phase !== 'START';
      },
      { timeout: 60000 }
    );

    console.log(`[Test] Game started: ${gameId}`);
  } catch (error) {
    console.error(`[Test] Failed to start game ${gameId}:`, error);
    throw error;
  }
}

/**
 * Wait for specific game phase to become active
 * @param page Playwright page
 * @param phase Target phase (e.g., 'NIGHT', 'DISCUSSION', 'VOTING')
 * @param timeout Timeout in milliseconds (default: 300s)
 */
export async function waitForPhase(page: Page, phase: string, timeout: number = 300000): Promise<void> {
  console.log(`[Test] Waiting for phase: ${phase} (timeout: ${timeout}ms)`);

  try {
    await page.locator(`[data-testid="phase-indicator"][data-phase="${phase}"]`)
      .waitFor({ state: 'visible', timeout });

    console.log(`[Test] Reached phase: ${phase}`);
  } catch (error) {
    console.error(`[Test] Failed to reach phase ${phase}:`, error);
    throw error;
  }
}

/**
 * Wait for minimum message count in discussion feed
 * @param page Playwright page
 * @param minCount Minimum number of messages
 * @param timeout Timeout in milliseconds (default: 300s)
 */
export async function waitForMessages(page: Page, minCount: number, timeout: number = 300000): Promise<void> {
  console.log(`[Test] Waiting for ${minCount}+ messages (timeout: ${timeout}ms)`);

  try {
    await page.waitForFunction(
      (min) => {
        // Try multiple selectors to find messages
        const messageElements = document.querySelectorAll('[data-testid^="message-"]');
        if (messageElements.length >= min) {
          return true;
        }

        // Also check for message count display
        const text = document.body.textContent || '';
        const match = text.match(/(\d+)\s*messages?/i);
        if (match && match[1]) {
          return parseInt(match[1]) >= min;
        }
        return false;
      },
      minCount,
      { timeout }
    );

    console.log(`[Test] ${minCount}+ messages received`);
  } catch (error) {
    console.error(`[Test] Failed to reach ${minCount} messages:`, error);
    throw error;
  }
}

/**
 * Wait for all votes to be cast during Voting phase
 * @param page Playwright page
 * @param expectedVotes Expected number of votes (default: 10 for 10-player game)
 * @param timeout Timeout in milliseconds (default: 120s)
 */
export async function waitForAllVotes(page: Page, expectedVotes: number = 10, timeout: number = 120000): Promise<void> {
  console.log(`[Test] Waiting for all votes (expected: ${expectedVotes}) (timeout: ${timeout}ms)`);

  try {
    // Wait for "All votes cast!" indicator or vote count to match expected
    await page.waitForFunction(
      (expected) => {
        // Check for "All votes cast!" text
        const allVotesText = document.body.textContent?.includes('All votes cast!');
        if (allVotesText) {
          return true;
        }

        // Check vote entries
        const voteEntries = document.querySelectorAll('[data-testid^="vote-entry-"]');
        return voteEntries.length >= expected;
      },
      expectedVotes,
      { timeout }
    );

    console.log('[Test] All votes cast');
  } catch (error) {
    console.error('[Test] Failed to wait for all votes:', error);
    throw error;
  }
}

/**
 * Wait for SSE connection to be established (green indicator)
 * @param page Playwright page
 * @param timeout Timeout in milliseconds (default: 10s)
 */
export async function waitForSSEConnection(page: Page, timeout: number = 10000): Promise<void> {
  console.log(`[Test] Waiting for SSE connection (timeout: ${timeout}ms)`);

  try {
    // Wait for connection status indicator to show "Connected"
    await page.waitForFunction(
      () => {
        // Look for green indicator
        const greenDot = document.querySelector('.bg-green-500');
        if (greenDot) return true;

        // Or check for "Connected" text
        const text = document.body.textContent || '';
        return text.includes('Connected');
      },
      { timeout }
    );

    console.log('[Test] SSE connected');
  } catch (error) {
    console.error('[Test] Failed to establish SSE connection:', error);
    throw error;
  }
}

/**
 * Get all player names from player grid
 * @param page Playwright page
 * @returns Array of player names
 */
export async function getPlayerNames(page: Page): Promise<string[]> {
  console.log('[Test] Extracting player names...');

  try {
    // Wait for player grid to be visible
    await page.locator('[data-testid="player-grid"]').waitFor({ state: 'visible', timeout: 10000 });

    // Get all player cards
    const cards = page.locator('[data-testid^="player-card-"]');
    const count = await cards.count();

    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const testId = await cards.nth(i).getAttribute('data-testid');
      if (testId) {
        // Extract name from data-testid="player-card-Agent-A"
        const name = testId.replace('player-card-', '');
        names.push(name);
      }
    }

    console.log(`[Test] Found ${names.length} players: ${names.join(', ')}`);
    return names;
  } catch (error) {
    console.error('[Test] Failed to extract player names:', error);
    throw error;
  }
}

/**
 * Get current phase from phase indicator
 * @param page Playwright page
 * @returns Current phase (e.g., 'NIGHT', 'DISCUSSION') or null
 */
export async function getCurrentPhase(page: Page): Promise<string | null> {
  console.log('[Test] Getting current phase...');

  try {
    const indicator = page.locator('[data-testid="phase-indicator"]');
    await indicator.waitFor({ state: 'visible', timeout: 5000 });

    const phase = await indicator.getAttribute('data-phase');
    console.log(`[Test] Current phase: ${phase}`);

    return phase;
  } catch (error) {
    console.error('[Test] Failed to get current phase:', error);
    return null;
  }
}
