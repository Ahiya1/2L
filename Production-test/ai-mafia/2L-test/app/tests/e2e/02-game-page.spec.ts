import { test, expect } from '@playwright/test';
import { createGame, getPlayerNames } from '../helpers/game-helpers';
import { STANDARD_GAME } from '../fixtures/test-data';

test.describe('Game Page', () => {
  test('should render player grid with all players', async ({ page }) => {
    // Create game via lobby
    const { gameId } = await createGame(page);

    // Wait for SSE connection
    await page.waitForFunction(
      () => {
        const greenDot = document.querySelector('.bg-green-500');
        return greenDot !== null;
      },
      { timeout: 10000 }
    );

    // Verify player grid is visible
    const playerGrid = page.locator('[data-testid="player-grid"]');
    await expect(playerGrid).toBeVisible();

    // Get all player names
    const playerNames = await getPlayerNames(page);

    // Verify we have 10 players
    expect(playerNames.length).toBe(STANDARD_GAME.playerCount);

    console.log(`[Test] Game page rendered with ${playerNames.length} players`);
  });

  test('should display player cards with names', async ({ page }) => {
    const { gameId } = await createGame(page);

    // Wait for player grid
    const playerGrid = page.locator('[data-testid="player-grid"]');
    await expect(playerGrid).toBeVisible();

    // Get all player cards
    const playerCards = page.locator('[data-testid^="player-card-"]');
    const cardCount = await playerCards.count();

    // Verify all cards are visible
    for (let i = 0; i < cardCount; i++) {
      await expect(playerCards.nth(i)).toBeVisible();
    }

    console.log(`[Test] All ${cardCount} player cards are visible`);
  });

  test('should display Start Game button', async ({ page }) => {
    const { gameId } = await createGame(page);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify Start Game button is visible and enabled
    const startButton = page.locator('button:has-text("Start Game")');
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await expect(startButton).toBeEnabled();

    console.log('[Test] Start Game button is visible and enabled');
  });
});
