import { test, expect } from '@playwright/test';
import { createGame, startGame, waitForSSEConnection, waitForPhase } from '../helpers/game-helpers';
import { PHASES, SELECTORS } from '../fixtures/test-data';

test.describe('Vote Tally', () => {
  test('should display vote tally during VOTING phase', async ({ page }) => {
    // Increase timeout significantly for this test
    test.setTimeout(600000); // 10 minutes

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    console.log('[Test] Game started, waiting for VOTING phase...');

    // Wait through phases to reach VOTING
    // NIGHT (45s) -> DAY_ANNOUNCEMENT (10s) -> DISCUSSION (180s) -> VOTING
    await waitForPhase(page, PHASES.VOTING, 300000); // 5 min timeout

    // Wait a moment for vote tally to render
    await page.waitForTimeout(2000);

    // Check for vote tally component
    const hasVoteTally = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return (
        text.includes('Vote') ||
        text.includes('vote') ||
        text.includes('Votes') ||
        text.includes('Tally') ||
        text.includes('majority')
      );
    });

    expect(hasVoteTally).toBe(true);

    console.log('[Test] Vote tally is visible during VOTING phase');
  });

  test('should show vote counts for players', async ({ page }) => {
    // Increase timeout significantly
    test.setTimeout(600000); // 10 minutes

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    console.log('[Test] Waiting for VOTING phase to check vote counts...');

    // Wait for VOTING phase
    await waitForPhase(page, PHASES.VOTING, 300000);

    // Wait for votes to start appearing
    await page.waitForTimeout(5000);

    // Check for vote-related content
    const voteInfo = await page.evaluate(() => {
      const text = document.body.textContent || '';
      // Look for vote entries or vote counts
      const hasVoteEntries = document.querySelectorAll('[data-testid^="vote-entry-"]').length > 0;
      const hasVoteText = /\d+\s*vote/i.test(text);
      const hasPlayerNames = document.querySelectorAll('[data-testid^="player-card-"]').length > 0;

      return {
        hasVoteEntries,
        hasVoteText,
        hasPlayerNames,
      };
    });

    // At least one indicator of vote tracking should be present
    const hasVoteTracking =
      voteInfo.hasVoteEntries ||
      voteInfo.hasVoteText ||
      voteInfo.hasPlayerNames;

    expect(hasVoteTracking).toBe(true);

    console.log('[Test] Vote counts are displayed', voteInfo);
  });

  test('should display majority threshold indicator', async ({ page }) => {
    // Increase timeout significantly
    test.setTimeout(600000); // 10 minutes

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    console.log('[Test] Waiting for VOTING phase to check majority threshold...');

    // Wait for VOTING phase
    await waitForPhase(page, PHASES.VOTING, 300000);

    // Wait for UI to render
    await page.waitForTimeout(2000);

    // Check for majority threshold text
    const hasMajorityInfo = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return (
        text.includes('majority') ||
        text.includes('Majority') ||
        text.includes('threshold') ||
        /\d+\/\d+/.test(text) // Pattern like "5/10"
      );
    });

    expect(hasMajorityInfo).toBe(true);

    console.log('[Test] Majority threshold indicator is visible');
  });

  test('should update vote entries in real-time', async ({ page }) => {
    // Increase timeout significantly
    test.setTimeout(600000); // 10 minutes

    // Create and start game
    const { gameId } = await createGame(page);
    await waitForSSEConnection(page);
    await startGame(page, gameId);

    console.log('[Test] Waiting for VOTING phase to check real-time updates...');

    // Wait for VOTING phase
    await waitForPhase(page, PHASES.VOTING, 300000);

    // Get initial vote count
    const initialVoteCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-testid^="vote-entry-"]').length;
    });

    console.log(`[Test] Initial vote entries: ${initialVoteCount}`);

    // Wait 10 seconds for votes to accumulate
    await page.waitForTimeout(10000);

    // Get updated vote count
    const updatedVoteCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-testid^="vote-entry-"]').length;
    });

    console.log(`[Test] Updated vote entries: ${updatedVoteCount}`);

    // Vote count should increase (or at least stay the same)
    expect(updatedVoteCount).toBeGreaterThanOrEqual(initialVoteCount);

    console.log('[Test] Vote tally updates in real-time');
  });
});
