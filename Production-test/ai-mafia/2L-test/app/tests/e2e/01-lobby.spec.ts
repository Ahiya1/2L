import { test, expect } from '@playwright/test';

test.describe('Lobby Page', () => {
  test('should load lobby page successfully', async ({ page }) => {
    // Navigate to lobby
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // Verify page loads (check for any heading or title)
    await expect(page).toHaveTitle(/Mafia|AI Mafia/i);

    // Verify main content is visible
    const mainContent = page.locator('main, [role="main"], body > div');
    await expect(mainContent.first()).toBeVisible();

    console.log('[Test] Lobby page loaded successfully');
  });

  test('should display game creation form', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // Verify "Create Game" button exists
    const createButton = page.locator('button:has-text("Create Game")');
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();

    console.log('[Test] Game creation form is visible');
  });

  test('should create game and redirect to game page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // Click create game
    const createButton = page.locator('button:has-text("Create Game")');
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click();

    // Wait for navigation to game page
    await page.waitForURL(/\/game\/.+/, { timeout: 15000 });

    // Verify URL contains game ID (UUID format)
    const url = page.url();
    expect(url).toMatch(/\/game\/[a-zA-Z0-9_-]+/);

    // Extract and log gameId
    const match = url.match(/\/game\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      console.log(`[Test] Successfully created game with ID: ${match[1]}`);
    }

    // Verify we're on the game page (player grid should be visible)
    const playerGrid = page.locator('[data-testid="player-grid"]');
    await expect(playerGrid).toBeVisible({ timeout: 10000 });
  });
});
