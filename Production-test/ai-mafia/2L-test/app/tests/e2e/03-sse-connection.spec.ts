import { test, expect } from '@playwright/test';
import { createGame, waitForSSEConnection } from '../helpers/game-helpers';

test.describe('SSE Connection', () => {
  test('should establish SSE connection and display status', async ({ page }) => {
    // Create game
    const { gameId } = await createGame(page);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Verify green connection indicator is visible
    const greenDot = page.locator('.bg-green-500');
    await expect(greenDot).toBeVisible();

    console.log('[Test] SSE connection established (green indicator visible)');
  });

  test('should maintain stable connection for 30 seconds', async ({ page }) => {
    // Create game
    const { gameId } = await createGame(page);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Verify connection is established
    const greenDot = page.locator('.bg-green-500');
    await expect(greenDot).toBeVisible();

    // Wait 30 seconds
    await page.waitForTimeout(30000);

    // Verify connection is still active
    await expect(greenDot).toBeVisible();

    console.log('[Test] SSE connection remained stable for 30 seconds');
  });

  test('should display connection status text', async ({ page }) => {
    // Create game
    const { gameId } = await createGame(page);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Check for "Connected" text or similar status indicator
    const hasConnectedText = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return text.includes('Connected') || text.includes('connected');
    });

    expect(hasConnectedText).toBe(true);

    console.log('[Test] Connection status text is displayed');
  });
});
