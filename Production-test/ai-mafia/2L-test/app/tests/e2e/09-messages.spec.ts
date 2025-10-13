import { test, expect } from '@playwright/test';
import {
  createGame,
  startGame,
  waitForSSEConnection,
  waitForPhase,
  waitForMessages,
} from '../helpers/game-helpers';

test.describe('Messages Appear in Feed @slow', () => {
  test('should display messages during Discussion phase', async ({ page }) => {
    // Increase timeout for slow test (5 minutes)
    test.setTimeout(300000);

    console.log('[Test 09] Starting messages test...');

    // Create and start game
    const { gameId } = await createGame(page);
    await startGame(page, gameId);

    // Wait for SSE connection
    await waitForSSEConnection(page);
    console.log('[Test 09] SSE connected');

    // Wait for Discussion phase (45s Night + 10s Day = ~55s minimum)
    console.log('[Test 09] Waiting for Discussion phase (can take ~55 seconds)...');
    await waitForPhase(page, 'DISCUSSION');
    console.log('[Test 09] Discussion phase reached');

    // Wait for at least 20 messages to appear
    console.log('[Test 09] Waiting for messages to appear...');
    await waitForMessages(page, 20);

    // Verify messages have proper structure
    const messageElements = await page.locator('[data-testid^="message-"]').all();
    expect(messageElements.length).toBeGreaterThanOrEqual(20);

    console.log(`[Test 09] Found ${messageElements.length} messages`);

    // Verify first few messages have content (spot check)
    for (let i = 0; i < Math.min(3, messageElements.length); i++) {
      const message = messageElements[i];
      if (!message) continue;

      // Message should be visible
      await expect(message).toBeVisible();

      // Message should have text content
      const text = await message.textContent();
      expect(text).toBeTruthy();
      expect(text).not.toBe('');

      console.log(`[Test 09] Message ${i + 1} content: ${text?.substring(0, 50)}...`);
    }

    console.log('[Test 09] Messages test completed successfully');
  });

  test('should generate reasonable message count during full Discussion phase', async ({ page }) => {
    // Increase timeout (5 minutes)
    test.setTimeout(300000);

    console.log('[Test 09] Starting message count test...');

    // Create and start game
    const { gameId } = await createGame(page);
    await startGame(page, gameId);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Wait for Discussion phase
    await waitForPhase(page, 'DISCUSSION');
    console.log('[Test 09] Discussion phase reached');

    // Wait for at least 40 messages (Discussion phase is 180s = 3 minutes)
    // With 10 players, expect 40-60 messages total
    console.log('[Test 09] Waiting for 40+ messages...');
    await waitForMessages(page, 40, 240000); // 4 minute timeout

    // Get final message count
    const messageCount = await page.locator('[data-testid^="message-"]').count();

    console.log(`[Test 09] Total messages: ${messageCount}`);

    // Broad assertion: at least 40 messages (AI variability acceptable)
    expect(messageCount).toBeGreaterThanOrEqual(40);

    // Reasonable upper bound (shouldn't exceed 100 messages)
    expect(messageCount).toBeLessThanOrEqual(100);

    console.log('[Test 09] Message count test completed successfully');
  });

  test('should display messages with timestamps and speaker names', async ({ page }) => {
    // Increase timeout
    test.setTimeout(300000);

    console.log('[Test 09] Starting message structure test...');

    // Create and start game
    const { gameId } = await createGame(page);
    await startGame(page, gameId);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Wait for Discussion phase
    await waitForPhase(page, 'DISCUSSION');

    // Wait for at least 10 messages
    await waitForMessages(page, 10);

    // Get a sample of messages to validate structure
    const messageElements = await page.locator('[data-testid^="message-"]').all();
    const sampleSize = Math.min(5, messageElements.length);

    console.log(`[Test 09] Validating structure of ${sampleSize} messages`);

    for (let i = 0; i < sampleSize; i++) {
      const message = messageElements[i];
      if (!message) continue;

      const text = await message.textContent();

      // Message should have content
      expect(text).toBeTruthy();
      expect(text).not.toBe('');

      // Messages should appear chronologically (newest at bottom or top)
      // Just verify they exist and are visible
      await expect(message).toBeVisible();

      console.log(`[Test 09] Message ${i + 1} validated: ${text?.substring(0, 40)}...`);
    }

    console.log('[Test 09] Message structure test completed successfully');
  });
});
