import { test } from '@playwright/test';

test.describe('Lobby Visual Regression @visual', () => {
  test('captures lobby baseline screenshot', async ({ page }) => {
    // Navigate to lobby page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Wait for UI to settle
    await page.waitForTimeout(1000);

    // Capture full-page screenshot
    await page.screenshot({
      path: 'tests/visual/screenshots/lobby-baseline.png',
      fullPage: true
    });

    console.log('[Test] Lobby baseline screenshot captured');
  });
});
