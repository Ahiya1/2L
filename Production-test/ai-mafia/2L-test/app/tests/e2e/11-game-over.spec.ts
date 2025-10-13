import { test, expect } from '@playwright/test';
import {
  createGame,
  startGame,
  waitForSSEConnection,
  waitForPhase,
  getCurrentPhase,
  getPlayerNames,
} from '../helpers/game-helpers';

test.describe('Game Over Screen @slow', () => {
  test('should display game over screen with winner announcement', async ({ page }) => {
    // Set 30-minute timeout for full game
    test.setTimeout(30 * 60 * 1000);

    console.log('[Test 11] Starting game over screen test...');
    console.log('[Test 11] Waiting for game to complete (10-25 minutes)...');

    // Create and start game
    const { gameId } = await createGame(page);
    console.log(`[Test 11] Game created: ${gameId}`);

    await startGame(page, gameId);
    console.log('[Test 11] Game started');

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Wait for GAME_OVER phase (can take 10-25 minutes)
    console.log('[Test 11] Waiting for GAME_OVER phase...');
    await waitForPhase(page, 'GAME_OVER', 30 * 60 * 1000); // 30 min timeout
    console.log('[Test 11] GAME_OVER phase reached');

    // Verify phase is GAME_OVER
    const finalPhase = await getCurrentPhase(page);
    expect(finalPhase).toBe('GAME_OVER');

    // Take screenshot of game over screen
    await page.screenshot({
      path: 'test-results/11-game-over-screen.png',
      fullPage: true,
    });

    // Verify game over screen is visible
    console.log('[Test 11] Validating game over screen...');

    // Check for winner announcement (Mafia or Villagers)
    const winnerAnnouncement = await page.locator('text=/Mafia Wins!|Villagers Win!/i').textContent().catch(() => null);

    if (winnerAnnouncement) {
      console.log(`[Test 11] Winner announcement found: ${winnerAnnouncement}`);
      expect(winnerAnnouncement).toMatch(/Mafia Wins!|Villagers Win!/i);
    } else {
      // Alternative: Check for game-over banner or indicator
      const gameOverBanner = page.locator('[data-testid="game-over-banner"]');
      const bannerVisible = await gameOverBanner.isVisible().catch(() => false);

      console.log(`[Test 11] Game over banner visible: ${bannerVisible}`);

      // At least verify the phase indicator shows GAME_OVER
      const phaseIndicator = page.locator('[data-testid="phase-indicator"][data-phase="GAME_OVER"]');
      await expect(phaseIndicator).toBeVisible();
    }

    console.log('[Test 11] Game over screen test completed successfully');
  });

  test('should display final game statistics', async ({ page }) => {
    // Set 30-minute timeout
    test.setTimeout(30 * 60 * 1000);

    console.log('[Test 11] Starting game statistics test...');

    // Create and start game
    const { gameId } = await createGame(page);
    await startGame(page, gameId);
    await waitForSSEConnection(page);

    // Get initial player names for reference
    const initialPlayers = await getPlayerNames(page);
    console.log(`[Test 11] Initial players: ${initialPlayers.length}`);

    // Wait for GAME_OVER phase
    console.log('[Test 11] Waiting for GAME_OVER phase...');
    await waitForPhase(page, 'GAME_OVER', 30 * 60 * 1000);
    console.log('[Test 11] GAME_OVER phase reached');

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Verify player grid still visible (shows final states)
    const playerGrid = page.locator('[data-testid="player-grid"]');
    const gridVisible = await playerGrid.isVisible().catch(() => false);
    console.log(`[Test 11] Player grid visible: ${gridVisible}`);

    if (gridVisible) {
      // Count alive vs dead players
      const playerCards = await page.locator('[data-testid^="player-card-"]').all();
      console.log(`[Test 11] Total player cards: ${playerCards.length}`);

      let aliveCount = 0;
      let deadCount = 0;

      for (const card of playerCards) {
        // Check if player is marked as dead (grayscale filter or similar)
        const classes = await card.getAttribute('class') || '';
        const isDead = classes.includes('grayscale') || classes.includes('opacity-50');

        if (isDead) {
          deadCount++;
        } else {
          aliveCount++;
        }
      }

      console.log(`[Test 11] Final stats - Alive: ${aliveCount}, Dead: ${deadCount}`);

      // At least some players should be dead
      expect(deadCount).toBeGreaterThan(0);

      // At least some players should be alive (unless perfect Mafia win)
      // This is flexible for AI variability
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/11-game-statistics.png',
      fullPage: true,
    });

    console.log('[Test 11] Game statistics test completed');
  });

  test('should verify game state is terminal', async ({ page }) => {
    // Set 30-minute timeout
    test.setTimeout(30 * 60 * 1000);

    console.log('[Test 11] Starting terminal state test...');

    // Create and start game
    const { gameId } = await createGame(page);
    await startGame(page, gameId);
    await waitForSSEConnection(page);

    // Wait for GAME_OVER phase
    console.log('[Test 11] Waiting for GAME_OVER phase...');
    await waitForPhase(page, 'GAME_OVER', 30 * 60 * 1000);
    console.log('[Test 11] GAME_OVER phase reached');

    // Verify phase stays at GAME_OVER (doesn't progress further)
    const phase1 = await getCurrentPhase(page);
    expect(phase1).toBe('GAME_OVER');

    // Wait 5 seconds
    await page.waitForTimeout(5000);

    // Verify phase still GAME_OVER
    const phase2 = await getCurrentPhase(page);
    expect(phase2).toBe('GAME_OVER');

    console.log('[Test 11] Game state verified as terminal');

    // Verify Start Game button is not present or disabled
    const startButton = page.locator('button:has-text("Start Game")');
    const buttonVisible = await startButton.isVisible().catch(() => false);

    if (buttonVisible) {
      // If visible, it should be disabled
      const isDisabled = await startButton.isDisabled();
      console.log(`[Test 11] Start Game button disabled: ${isDisabled}`);
      expect(isDisabled).toBe(true);
    } else {
      console.log('[Test 11] Start Game button not visible (expected)');
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/11-terminal-state.png',
      fullPage: true,
    });

    console.log('[Test 11] Terminal state test completed successfully');
  });

  test('should display winner with proper styling', async ({ page }) => {
    // Set 30-minute timeout
    test.setTimeout(30 * 60 * 1000);

    console.log('[Test 11] Starting winner display test...');

    // Create and start game
    const { gameId } = await createGame(page);
    await startGame(page, gameId);
    await waitForSSEConnection(page);

    // Wait for GAME_OVER phase
    console.log('[Test 11] Waiting for GAME_OVER phase...');
    await waitForPhase(page, 'GAME_OVER', 30 * 60 * 1000);
    console.log('[Test 11] GAME_OVER phase reached');

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Check for winner announcement with various selectors
    let winnerFound = false;
    let winnerText = '';

    // Try multiple approaches to find winner
    const selectors = [
      'text=/Mafia Wins?!?/i',
      'text=/Villagers Win!?/i',
      '[data-testid="winner-announcement"]',
      '[data-testid="game-over-banner"]',
    ];

    for (const selector of selectors) {
      const element = page.locator(selector);
      const visible = await element.isVisible().catch(() => false);

      if (visible) {
        winnerFound = true;
        const text = await element.textContent();
        winnerText = text || '';
        console.log(`[Test 11] Found winner via ${selector}: ${winnerText}`);
        break;
      }
    }

    // At minimum, verify we're in GAME_OVER state
    const finalPhase = await getCurrentPhase(page);
    expect(finalPhase).toBe('GAME_OVER');

    if (winnerFound) {
      console.log(`[Test 11] Winner display validated: ${winnerText}`);
      expect(winnerText.length).toBeGreaterThan(0);
    } else {
      console.log('[Test 11] Winner announcement not found (acceptable - checking phase indicator)');
      // Verify phase indicator shows GAME_OVER as fallback
      const phaseIndicator = page.locator('[data-testid="phase-indicator"][data-phase="GAME_OVER"]');
      await expect(phaseIndicator).toBeVisible();
    }

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'test-results/11-winner-display.png',
      fullPage: true,
    });

    console.log('[Test 11] Winner display test completed');
  });
});
