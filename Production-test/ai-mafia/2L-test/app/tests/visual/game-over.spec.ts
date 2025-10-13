import { test, expect } from '@playwright/test';
import { createGame, startGame, waitForSSEConnection, waitForPhase } from '../helpers/game-helpers';

test.describe('Game Over Visual Regression @visual @slow', () => {
  test('captures game over final screenshot', async ({ page }) => {
    // Increase timeout for full game (30 minutes)
    test.setTimeout(1800000);

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    console.log('[Test] Game started, waiting for GAME_OVER phase...');

    // Wait for GAME_OVER phase (timeout: 30 minutes)
    try {
      await waitForPhase(page, 'GAME_OVER', 1800000); // 30 minutes
    } catch (error) {
      console.error('[Test] Game did not reach GAME_OVER within 30 minutes');

      // Capture screenshot of current state for debugging
      await page.screenshot({
        path: 'tests/visual/screenshots/game-timeout-debug.png',
        fullPage: true
      });

      throw error;
    }

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Verify winner announcement is visible
    const winnerBanner = page.locator('text=/Mafia Wins!|Villagers Win!/');
    await expect(winnerBanner).toBeVisible({ timeout: 10000 });

    // Capture full-page screenshot
    await page.screenshot({
      path: 'tests/visual/screenshots/game-over-final.png',
      fullPage: true
    });

    console.log('[Test] Game over final screenshot captured');
  });
});
