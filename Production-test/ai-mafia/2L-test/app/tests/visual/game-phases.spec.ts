import { test } from '@playwright/test';
import { createGame, startGame, waitForSSEConnection, waitForPhase, waitForMessages } from '../helpers/game-helpers';

test.describe('Game Phases Visual Regression @visual', () => {
  test('captures game start with roles visible', async ({ page }) => {
    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    // Wait for SSE connection and first phase
    await waitForSSEConnection(page);

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Capture screenshot showing player grid with role badges
    await page.screenshot({
      path: 'tests/visual/screenshots/game-start-roles.png',
      fullPage: true
    });

    console.log('[Test] Game start with roles screenshot captured');
  });

  test('captures night phase split-screen layout', async ({ page }) => {
    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Wait for Night phase
    await waitForPhase(page, 'NIGHT');

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Capture screenshot showing Mafia chat panel
    await page.screenshot({
      path: 'tests/visual/screenshots/night-phase-mafia-chat.png',
      fullPage: true
    });

    console.log('[Test] Night phase Mafia chat screenshot captured');
  });

  test('captures discussion phase message feed', async ({ page }) => {
    // Increase timeout for this test (Discussion phase takes time)
    test.setTimeout(600000); // 10 minutes

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Wait for Discussion phase
    await waitForPhase(page, 'DISCUSSION');

    // Wait for at least 10 messages
    await waitForMessages(page, 10);

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Capture screenshot of discussion feed
    await page.screenshot({
      path: 'tests/visual/screenshots/discussion-phase-messages.png',
      fullPage: true
    });

    console.log('[Test] Discussion phase messages screenshot captured');
  });

  test('captures voting phase vote tally', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(600000); // 10 minutes

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Wait for Voting phase
    await waitForPhase(page, 'VOTING');

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Capture screenshot of vote tally
    await page.screenshot({
      path: 'tests/visual/screenshots/voting-phase-tally.png',
      fullPage: true
    });

    console.log('[Test] Voting phase tally screenshot captured');
  });

  test('captures phase timeline progression', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(600000); // 10 minutes

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    // Wait for SSE connection
    await waitForSSEConnection(page);

    // Wait for Discussion phase (shows timeline with multiple phases)
    await waitForPhase(page, 'DISCUSSION');

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Capture screenshot of PhaseTimeline component
    const phaseTimeline = page.locator('[data-testid="phase-timeline"]');

    // Check if timeline exists, if not capture full page
    const timelineExists = await phaseTimeline.count() > 0;

    if (timelineExists) {
      await phaseTimeline.screenshot({
        path: 'tests/visual/screenshots/phase-timeline.png'
      });
    } else {
      // If specific timeline component doesn't exist, capture full page showing phase info
      await page.screenshot({
        path: 'tests/visual/screenshots/phase-timeline.png',
        fullPage: true
      });
    }

    console.log('[Test] Phase timeline screenshot captured');
  });
});
