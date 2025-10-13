# Visual Regression Testing

This directory contains visual regression tests that capture baseline screenshots of key UI screens.

## Overview

Visual regression tests help prevent UI breakage by capturing screenshots of critical screens and comparing them across changes. For MVP, comparison is manual - reviewers should diff screenshots when UI changes are made.

## Test Files

### 1. `lobby.spec.ts`
Captures the lobby page baseline screenshot.

**Screenshots:**
- `screenshots/lobby-baseline.png` - Lobby page with game creation form

### 2. `game-phases.spec.ts`
Captures screenshots of different game phases.

**Screenshots:**
- `screenshots/game-start-roles.png` - Game start with player grid showing role badges
- `screenshots/night-phase-mafia-chat.png` - Night phase split-screen layout with Mafia chat
- `screenshots/discussion-phase-messages.png` - Discussion phase with message feed
- `screenshots/voting-phase-tally.png` - Voting phase with vote tally
- `screenshots/phase-timeline.png` - Phase timeline progression component

### 3. `game-over.spec.ts`
Captures game over screen after a full game completes.

**Screenshots:**
- `screenshots/game-over-final.png` - Game over screen with winner announcement

**Note:** This test takes 10-15 minutes as it waits for a full game to complete.

## Running Visual Tests

### Run all visual tests:
```bash
npm run test:visual
```

### Run specific test:
```bash
npx playwright test tests/visual/lobby.spec.ts
```

### Run with UI mode (recommended for debugging):
```bash
npx playwright test tests/visual/ --ui
```

## Screenshot Location

All screenshots are stored in: `tests/visual/screenshots/`

Baseline screenshots are committed to Git for version tracking.

## Manual Comparison Workflow

1. **Baseline Capture:** Run visual tests to capture baseline screenshots
2. **Make UI Changes:** Update components, styles, or layout
3. **Re-capture:** Run visual tests again to capture new screenshots
4. **Compare:** Use a diff tool (e.g., `git diff`, image viewer) to compare old vs new
5. **Review:**
   - If changes are intentional: Update baseline screenshots and commit
   - If changes are unintentional: Fix the UI issue and re-test

## Automated Diffing (Future Enhancement)

For post-MVP, consider integrating:
- **pixelmatch**: Pixel-level screenshot comparison
- **@playwright/test toMatchSnapshot**: Built-in snapshot testing
- **Percy** or **Chromatic**: Visual testing services

## Test Tags

Visual tests are tagged with `@visual` for easy filtering:

```bash
# Run only visual tests
npx playwright test --grep @visual

# Exclude visual tests
npx playwright test --grep-invert @visual
```

Slow visual tests (game-over) are also tagged with `@slow`:

```bash
# Run only slow visual tests
npx playwright test --grep "@visual @slow"
```

## CI/CD Integration

Visual tests run in the CI pipeline:
- **Fast visual tests** (lobby, early phases): Run on all PRs (~5 minutes)
- **Slow visual tests** (game-over): Run on main branch only (~15 minutes)

Screenshots are uploaded as artifacts on test failure for debugging.

## Viewport Consistency

All screenshots use a consistent viewport (1920x1080 Desktop Chrome) configured in `playwright.config.ts`. This ensures consistent screenshot dimensions across runs.

## Troubleshooting

### Screenshots not captured
- Check that the target element exists: `await page.locator('[data-testid="..."]').waitFor()`
- Increase wait time for UI to settle: `await page.waitForTimeout(2000)`
- Check console logs for test helper errors

### Screenshots differ unexpectedly
- Verify viewport size is consistent (1920x1080)
- Check for dynamic content (timestamps, AI-generated text)
- Ensure browser is consistent (Chromium)

### Tests timeout
- Increase test timeout: `test.setTimeout(600000)` for phase-dependent tests
- Check that SSE connection is established: `await waitForSSEConnection(page)`
- Verify backend is running and responsive

## Best Practices

1. **Wait for stable state:** Always wait for SSE connection and phase transitions before capturing
2. **Full-page screenshots:** Use `fullPage: true` to capture entire layout
3. **Component screenshots:** For specific components, use `locator.screenshot()`
4. **Descriptive names:** Use clear, descriptive screenshot filenames
5. **Commit baselines:** Always commit baseline screenshots to Git
6. **Review diffs:** Manually review screenshot diffs on UI changes

## Related Documentation

- Test Helpers: `../helpers/README.md`
- Playwright Configuration: `../../playwright.config.ts`
- CI/CD Workflow: `../../../.github/workflows/e2e-tests.yml`
