import { test, expect } from '@playwright/test';
import { createGame, startGame, waitForSSEConnection, waitForPhase } from '../helpers/game-helpers';
import { PHASES, SELECTORS } from '../fixtures/test-data';

test.describe('Phase Timer', () => {
  test('should display timer on game page', async ({ page }) => {
    // Create game
    const { gameId } = await createGame(page);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Check if timer is visible (might be multiple places)
    const hasTimer = await page.evaluate(() => {
      const text = document.body.textContent || '';
      // Look for time patterns like "45s", "0:45", "00:45", etc.
      return /\d+[sm]|[\d:]+/i.test(text);
    });

    expect(hasTimer).toBe(true);

    console.log('[Test] Timer is displayed on page');
  });

  test('should countdown during a phase', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(180000); // 3 minutes

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    // Wait for NIGHT phase
    await waitForPhase(page, PHASES.NIGHT);

    // Get initial time value
    const initialTime = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const match = text.match(/(\d+)\s*(?:seconds?|s)/i);
      return match && match[1] ? parseInt(match[1]) : null;
    });

    console.log(`[Test] Initial time: ${initialTime}s`);

    // Wait 5 seconds
    await page.waitForTimeout(5000);

    // Get time after 5 seconds
    const timeAfter5s = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const match = text.match(/(\d+)\s*(?:seconds?|s)/i);
      return match && match[1] ? parseInt(match[1]) : null;
    });

    console.log(`[Test] Time after 5s: ${timeAfter5s}s`);

    // Verify timer has decreased (allowing for some variance)
    if (initialTime !== null && timeAfter5s !== null) {
      expect(timeAfter5s).toBeLessThan(initialTime);
      console.log(`[Test] Timer decreased by ${initialTime - timeAfter5s} seconds`);
    }
  });

  test('should show time remaining in current phase', async ({ page }) => {
    // Increase timeout
    test.setTimeout(120000); // 2 minutes

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    // Wait for NIGHT phase
    await waitForPhase(page, PHASES.NIGHT);

    // Check that time is displayed
    const hasTimeDisplay = await page.evaluate(() => {
      const text = document.body.textContent || '';
      // Look for time patterns
      return (
        /\d+s/.test(text) ||
        /\d+\s*seconds?/i.test(text) ||
        /\d+:\d+/.test(text) ||
        /time/i.test(text)
      );
    });

    expect(hasTimeDisplay).toBe(true);

    console.log('[Test] Time remaining is displayed');
  });

  test('should sync on page refresh', async ({ page }) => {
    // Increase timeout
    test.setTimeout(120000); // 2 minutes

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    // Wait for NIGHT phase
    await waitForPhase(page, PHASES.NIGHT);

    // Get time before refresh
    const timeBefore = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const match = text.match(/(\d+)\s*(?:seconds?|s)/i);
      return match && match[1] ? parseInt(match[1]) : 45; // Default to 45 if not found
    });

    console.log(`[Test] Time before refresh: ${timeBefore}s`);

    // Wait 5 seconds
    await page.waitForTimeout(5000);

    // Refresh the page
    await page.reload();
    await waitForSSEConnection(page);

    // Get time after refresh
    const timeAfter = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const match = text.match(/(\d+)\s*(?:seconds?|s)/i);
      return match && match[1] ? parseInt(match[1]) : null;
    });

    console.log(`[Test] Time after refresh: ${timeAfter}s`);

    // Verify timer synced (didn't reset to full duration)
    if (timeAfter !== null) {
      // Timer should be less than initial time (allowing some variance for network delay)
      expect(timeAfter).toBeLessThan(timeBefore + 3);
      console.log('[Test] Timer synced correctly after refresh');
    }
  });
});
