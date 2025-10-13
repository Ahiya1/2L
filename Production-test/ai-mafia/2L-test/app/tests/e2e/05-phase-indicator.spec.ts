import { test, expect } from '@playwright/test';
import { createGame, startGame, waitForSSEConnection, getCurrentPhase, waitForPhase } from '../helpers/game-helpers';
import { PHASES } from '../fixtures/test-data';

test.describe('Phase Indicator', () => {
  test('should display phase indicator on game page', async ({ page }) => {
    // Create game
    const { gameId } = await createGame(page);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Verify phase indicator exists
    const phaseIndicator = page.locator('[data-testid="phase-indicator"]');
    await expect(phaseIndicator).toBeVisible({ timeout: 10000 });

    console.log('[Test] Phase indicator is visible');
  });

  test('should show START phase before game starts', async ({ page }) => {
    // Create game
    const { gameId } = await createGame(page);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Get current phase
    const phase = await getCurrentPhase(page);

    // Verify we're in START phase
    expect(phase).toBe(PHASES.START);

    console.log(`[Test] Current phase: ${phase}`);
  });

  test('should transition to NIGHT phase after starting game', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(120000); // 2 minutes

    // Create game
    const { gameId } = await createGame(page);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Start the game
    await startGame(page, gameId);

    // Wait for NIGHT phase
    await waitForPhase(page, PHASES.NIGHT, 60000); // 1 min timeout

    // Verify phase indicator shows NIGHT
    const phaseIndicator = page.locator('[data-testid="phase-indicator"]');
    await expect(phaseIndicator).toHaveAttribute('data-phase', PHASES.NIGHT);

    console.log('[Test] Phase successfully transitioned to NIGHT');
  });

  test('should update phase indicator attribute on phase change', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(120000); // 2 minutes

    // Create game
    const { gameId } = await createGame(page);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Check initial phase
    const initialPhase = await getCurrentPhase(page);
    expect(initialPhase).toBe(PHASES.START);

    // Start the game
    await startGame(page, gameId);

    // Wait for phase change
    await page.waitForFunction(
      () => {
        const indicator = document.querySelector('[data-testid="phase-indicator"]');
        return indicator?.getAttribute('data-phase') !== 'START';
      },
      { timeout: 60000 }
    );

    // Check new phase
    const newPhase = await getCurrentPhase(page);
    expect(newPhase).not.toBe(PHASES.START);

    console.log(`[Test] Phase changed from ${initialPhase} to ${newPhase}`);
  });
});
