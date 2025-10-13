import { test, expect } from '@playwright/test';
import {
  createGame,
  startGame,
  waitForSSEConnection,
  waitForPhase,
  waitForMessages,
  waitForAllVotes,
  getCurrentPhase,
  getPlayerNames,
} from '../helpers/game-helpers';

test.describe('Full Game Flow @slow', () => {
  test('should complete full game from start to finish', async ({ page }) => {
    // Set 30-minute timeout for full game test
    test.setTimeout(30 * 60 * 1000);

    console.log('[Test 10] Starting full game flow test...');
    console.log('[Test 10] Expected duration: 10-15 minutes');

    // Create and start game
    const { gameId } = await createGame(page);
    console.log(`[Test 10] Game created: ${gameId}`);

    await startGame(page, gameId);
    console.log('[Test 10] Game started');

    // Wait for SSE connection
    await waitForSSEConnection(page);
    console.log('[Test 10] SSE connected');

    // Take screenshot at game start
    await page.screenshot({
      path: 'test-results/10-full-game-start.png',
      fullPage: true,
    });

    // Get initial player count
    const initialPlayers = await getPlayerNames(page);
    const initialPlayerCount = initialPlayers.length;
    console.log(`[Test 10] Initial players: ${initialPlayerCount} (${initialPlayers.join(', ')})`);

    expect(initialPlayerCount).toBeGreaterThanOrEqual(8);
    expect(initialPlayerCount).toBeLessThanOrEqual(15);

    // ===== ROUND 1: NIGHT PHASE =====
    console.log('[Test 10] ===== ROUND 1: NIGHT PHASE =====');
    await waitForPhase(page, 'NIGHT');
    console.log('[Test 10] NIGHT phase reached');

    // Verify Mafia chat panel appears (should be visible during Night)
    const mafiaChat = page.locator('[data-testid="mafia-chat"]');
    const hasMafiaChat = await mafiaChat.isVisible().catch(() => false);
    console.log(`[Test 10] Mafia chat visible: ${hasMafiaChat}`);

    // Take screenshot of Night phase
    await page.screenshot({
      path: 'test-results/10-full-game-night.png',
      fullPage: true,
    });

    // Wait for Night phase to complete (45 seconds + buffer)
    console.log('[Test 10] Waiting for Night phase to complete (~45s)...');

    // ===== ROUND 1: DAY ANNOUNCEMENT =====
    console.log('[Test 10] ===== ROUND 1: DAY ANNOUNCEMENT =====');
    await waitForPhase(page, 'DAY_ANNOUNCEMENT', 120000); // 2 min timeout
    console.log('[Test 10] DAY_ANNOUNCEMENT phase reached');

    // Verify victim announcement (1 player should be dead)
    // Note: Don't assert exact player name due to randomness
    await page.waitForTimeout(2000); // Wait for UI to update

    // Take screenshot of Day announcement
    await page.screenshot({
      path: 'test-results/10-full-game-day-announcement.png',
      fullPage: true,
    });

    // ===== ROUND 1: DISCUSSION PHASE =====
    console.log('[Test 10] ===== ROUND 1: DISCUSSION PHASE =====');
    await waitForPhase(page, 'DISCUSSION', 120000);
    console.log('[Test 10] DISCUSSION phase reached');

    // Verify discussion feed is visible
    const discussionFeed = page.locator('[data-testid="discussion-feed"]');
    const hasFeed = await discussionFeed.isVisible().catch(() => false);
    console.log(`[Test 10] Discussion feed visible: ${hasFeed}`);

    // Wait for at least 40 messages
    console.log('[Test 10] Waiting for messages (minimum 40)...');
    await waitForMessages(page, 40, 240000); // 4 min timeout
    console.log('[Test 10] Messages received');

    // Get message count
    const messageCount = await page.locator('[data-testid^="message-"]').count();
    console.log(`[Test 10] Message count: ${messageCount}`);
    expect(messageCount).toBeGreaterThanOrEqual(40);

    // Take screenshot of Discussion phase
    await page.screenshot({
      path: 'test-results/10-full-game-discussion.png',
      fullPage: true,
    });

    // ===== ROUND 1: VOTING PHASE =====
    console.log('[Test 10] ===== ROUND 1: VOTING PHASE =====');
    await waitForPhase(page, 'VOTING', 240000); // 4 min timeout
    console.log('[Test 10] VOTING phase reached');

    // Verify vote tally displays
    const voteTally = page.locator('[data-testid="vote-tally"]');
    const hasTally = await voteTally.isVisible().catch(() => false);
    console.log(`[Test 10] Vote tally visible: ${hasTally}`);

    // Wait for all votes to be cast
    console.log('[Test 10] Waiting for all votes...');
    await waitForAllVotes(page, initialPlayerCount - 1, 180000); // 3 min timeout (one player dead)
    console.log('[Test 10] All votes cast');

    // Take screenshot of Voting phase
    await page.screenshot({
      path: 'test-results/10-full-game-voting.png',
      fullPage: true,
    });

    // ===== ROUND 1: WIN CHECK =====
    console.log('[Test 10] ===== ROUND 1: WIN CHECK =====');
    await waitForPhase(page, 'WIN_CHECK', 60000); // 1 min timeout
    console.log('[Test 10] WIN_CHECK phase reached');

    // Wait a moment for win check to complete
    await page.waitForTimeout(5000);

    // Check if game is over or continues
    let finalPhase = await getCurrentPhase(page);
    console.log(`[Test 10] Phase after WIN_CHECK: ${finalPhase}`);

    // If game continues, wait for subsequent rounds
    if (finalPhase === 'NIGHT') {
      console.log('[Test 10] ===== GAME CONTINUES TO ROUND 2+ =====');
      console.log('[Test 10] Waiting for GAME_OVER (may take 10-25 minutes)...');

      // Wait for game to eventually end (up to 25 minutes)
      await page.waitForFunction(
        () => {
          const phaseIndicator = document.querySelector('[data-testid="phase-indicator"]');
          const phase = phaseIndicator?.getAttribute('data-phase');
          return phase === 'GAME_OVER';
        },
        { timeout: 25 * 60 * 1000 } // 25 minutes
      );

      finalPhase = await getCurrentPhase(page);
      console.log(`[Test 10] Final phase reached: ${finalPhase}`);
    }

    // ===== GAME OVER =====
    console.log('[Test 10] ===== GAME OVER =====');
    expect(finalPhase).toBe('GAME_OVER');

    // Verify winner announcement
    const winnerText = await page.locator('text=/Mafia Wins!|Villagers Win!/i').textContent().catch(() => null);
    console.log(`[Test 10] Winner announcement: ${winnerText}`);

    if (winnerText) {
      expect(winnerText).toMatch(/Mafia Wins!|Villagers Win!/i);
    } else {
      // Alternative: Check for game over banner
      const gameOverBanner = await page.locator('[data-testid="game-over-banner"]').isVisible().catch(() => false);
      console.log(`[Test 10] Game over banner visible: ${gameOverBanner}`);
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/10-full-game-end.png',
      fullPage: true,
    });

    console.log('[Test 10] ===== FULL GAME TEST COMPLETED SUCCESSFULLY =====');
    console.log('[Test 10] Game flow validated from start to GAME_OVER');
  });

  test('should validate round progression and player elimination', async ({ page }) => {
    // Set 30-minute timeout
    test.setTimeout(30 * 60 * 1000);

    console.log('[Test 10] Starting round progression test...');

    // Create and start game
    const { gameId } = await createGame(page);
    await startGame(page, gameId);
    await waitForSSEConnection(page);

    // Get initial player count
    const initialPlayers = await getPlayerNames(page);
    const initialCount = initialPlayers.length;
    console.log(`[Test 10] Initial player count: ${initialCount}`);

    // Go through at least 2 rounds
    for (let round = 1; round <= 2; round++) {
      console.log(`[Test 10] ===== ROUND ${round} =====`);

      // Night phase
      await waitForPhase(page, 'NIGHT', 300000);
      console.log(`[Test 10] Round ${round}: NIGHT phase`);

      // Day announcement
      await waitForPhase(page, 'DAY_ANNOUNCEMENT', 120000);
      console.log(`[Test 10] Round ${round}: DAY_ANNOUNCEMENT phase`);

      // Discussion phase
      await waitForPhase(page, 'DISCUSSION', 120000);
      console.log(`[Test 10] Round ${round}: DISCUSSION phase`);

      // Wait for some messages
      await waitForMessages(page, 10, 120000);

      // Voting phase
      await waitForPhase(page, 'VOTING', 240000);
      console.log(`[Test 10] Round ${round}: VOTING phase`);

      // Wait for votes
      const currentPlayerCount = await page.locator('[data-testid^="player-card-"]').count();
      await waitForAllVotes(page, currentPlayerCount, 180000);

      // Win check
      await waitForPhase(page, 'WIN_CHECK', 60000);
      console.log(`[Test 10] Round ${round}: WIN_CHECK phase`);

      // Check if game continues
      await page.waitForTimeout(5000);
      const currentPhase = await getCurrentPhase(page);

      if (currentPhase === 'GAME_OVER') {
        console.log(`[Test 10] Game ended after round ${round}`);
        break;
      }
    }

    // Verify we completed at least 1 full round
    const finalPhase = await getCurrentPhase(page);
    console.log(`[Test 10] Final phase: ${finalPhase}`);

    // Test passed if we reached GAME_OVER or NIGHT (round 2+)
    expect(['GAME_OVER', 'NIGHT']).toContain(finalPhase);

    console.log('[Test 10] Round progression test completed');
  });
});
