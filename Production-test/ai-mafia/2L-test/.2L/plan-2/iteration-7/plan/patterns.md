# Code Patterns & Conventions - E2E Testing

## File Structure

```
app/
├── tests/
│   ├── e2e/
│   │   ├── 01-lobby.spec.ts              # Fast: Lobby loads
│   │   ├── 02-game-page.spec.ts          # Fast: Game page renders
│   │   ├── 03-sse-connection.spec.ts     # Fast: SSE connection
│   │   ├── 04-roles.spec.ts              # Fast: Roles visible
│   │   ├── 05-phase-indicator.spec.ts    # Fast: Phase indicator
│   │   ├── 06-timer.spec.ts              # Fast: Timer countdown
│   │   ├── 07-mafia-chat.spec.ts         # Fast: Mafia chat panel
│   │   ├── 08-vote-tally.spec.ts         # Fast: Vote tally
│   │   ├── 09-messages.spec.ts           # Slow: Messages appear
│   │   ├── 10-full-game.spec.ts          # Slow: Full game flow
│   │   └── 11-game-over.spec.ts          # Slow: Game over screen
│   ├── visual/
│   │   ├── lobby.spec.ts                 # Visual: Lobby screenshot
│   │   ├── game-phases.spec.ts           # Visual: Phase screenshots
│   │   └── game-over.spec.ts             # Visual: Game over screenshot
│   ├── helpers/
│   │   └── game-helpers.ts               # Shared utilities
│   └── fixtures/
│       └── test-data.ts                  # Test constants
├── playwright.config.ts                  # Playwright configuration
└── package.json
```

## Naming Conventions

**Test Files:**
- Pattern: `{number}-{feature-name}.spec.ts`
- Examples: `01-lobby.spec.ts`, `10-full-game.spec.ts`
- Rationale: Numbered prefix ensures execution order visibility

**Test Names:**
- Pattern: `should {action} {expected outcome}`
- Examples:
  - `should load lobby and display player count slider`
  - `should display SSE connection status indicator`
  - `should wait for all votes during Voting phase`

**Describe Blocks:**
- Pattern: `{Feature/Component Name}`
- Examples:
  ```typescript
  describe('Lobby Page', () => { ... });
  describe('Player Grid', () => { ... });
  describe('Full Game Flow', () => { ... });
  ```

**Helper Functions:**
- Pattern: `{verb}{Noun}` (camelCase)
- Examples: `createGame`, `waitForPhase`, `getPlayerNames`

**Constants:**
- Pattern: `SCREAMING_SNAKE_CASE`
- Examples: `SMALL_GAME`, `NIGHT_PHASE_DURATION`

## Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Timeouts
  timeout: 600000, // 10 minutes per test (for slow full-game tests)
  expect: {
    timeout: 30000, // 30s for assertions (wait for elements)
  },

  // Parallelization
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3, // 2 workers in CI, 3 locally

  // Retries
  retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI only

  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'], // Console output
  ],

  // Web server (auto-start dev server)
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI, // Reuse local dev server
  },

  // Global settings
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure', // Capture trace on failure
    screenshot: 'only-on-failure', // Screenshot on failure
    video: 'retain-on-failure', // Video on failure
    viewport: { width: 1920, height: 1080 }, // Desktop viewport
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add Firefox/Safari later if needed
  ],
});
```

## Test Helper Patterns

**File:** `tests/helpers/game-helpers.ts`

```typescript
import { Page, expect } from '@playwright/test';

/**
 * Create a game via API
 * @param playerCount Number of players (default: 10)
 * @returns gameId
 */
export async function createGame(playerCount: number = 10): Promise<string> {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerCount }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create game: ${response.statusText}`);
  }

  const { gameId } = await response.json();
  console.log(`[Test] Created game: ${gameId} with ${playerCount} players`);
  return gameId;
}

/**
 * Start a game via API
 * @param gameId Game ID to start
 */
export async function startGame(gameId: string): Promise<void> {
  const response = await fetch(`http://localhost:3000/api/game/${gameId}/start`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to start game: ${response.statusText}`);
  }

  console.log(`[Test] Started game: ${gameId}`);
}

/**
 * Wait for SSE connection to be established (green indicator)
 * @param page Playwright page
 */
export async function waitForSSEConnection(page: Page): Promise<void> {
  await page.locator('.bg-green-500').waitFor({
    state: 'visible',
    timeout: 5000
  });
  console.log('[Test] SSE connected (green indicator visible)');
}

/**
 * Wait for specific game phase to become active
 * @param page Playwright page
 * @param phase Target phase (e.g., 'NIGHT', 'DISCUSSION', 'VOTING')
 */
export async function waitForPhase(page: Page, phase: string): Promise<void> {
  await page.locator(`[data-testid="phase-indicator"][data-phase="${phase}"]`)
    .waitFor({ state: 'visible', timeout: 300000 }); // 5 min max
  console.log(`[Test] Reached phase: ${phase}`);
}

/**
 * Wait for minimum message count in discussion feed
 * @param page Playwright page
 * @param minCount Minimum number of messages
 */
export async function waitForMessages(page: Page, minCount: number): Promise<void> {
  await page.waitForFunction(
    (min) => {
      const text = document.body.textContent || '';
      const match = text.match(/(\d+) messages/);
      return match && parseInt(match[1]) >= min;
    },
    minCount,
    { timeout: 180000 } // 3 min max (Discussion phase duration)
  );
  console.log(`[Test] ${minCount}+ messages received`);
}

/**
 * Wait for all votes to be cast during Voting phase
 * @param page Playwright page
 */
export async function waitForAllVotes(page: Page): Promise<void> {
  await page.locator('text=/All votes cast!/').waitFor({
    state: 'visible',
    timeout: 120000 // 2 min max (Voting phase duration)
  });
  console.log('[Test] All votes cast');
}

/**
 * Get all player names from player grid
 * @param page Playwright page
 * @returns Array of player names
 */
export async function getPlayerNames(page: Page): Promise<string[]> {
  await page.locator('[data-testid="player-grid"]').waitFor();
  const cards = page.locator('[data-testid^="player-card-"]');
  const count = await cards.count();

  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const testId = await cards.nth(i).getAttribute('data-testid');
    if (testId) {
      names.push(testId.replace('player-card-', ''));
    }
  }

  console.log(`[Test] Found ${names.length} players: ${names.join(', ')}`);
  return names;
}

/**
 * Get current phase from phase indicator
 * @param page Playwright page
 * @returns Current phase (e.g., 'NIGHT', 'DISCUSSION') or null
 */
export async function getCurrentPhase(page: Page): Promise<string | null> {
  const indicator = page.locator('[data-testid="phase-indicator"]');
  const phase = await indicator.getAttribute('data-phase');
  console.log(`[Test] Current phase: ${phase}`);
  return phase;
}

/**
 * Navigate to game page and wait for initial load
 * @param page Playwright page
 * @param gameId Game ID
 */
export async function goToGame(page: Page, gameId: string): Promise<void> {
  await page.goto(`http://localhost:3000/game/${gameId}`);
  await page.waitForLoadState('domcontentloaded');
  console.log(`[Test] Navigated to game: ${gameId}`);
}
```

## Waiting Strategies

### Wait for Element Visibility

**Pattern:**
```typescript
await page.locator('[data-testid="player-grid"]').waitFor({
  state: 'visible',
  timeout: 5000
});
```

**When to use:** Waiting for static elements to appear (no SSE dependency)

### Wait for Attribute Change

**Pattern:**
```typescript
await page.locator('[data-testid="phase-indicator"][data-phase="DISCUSSION"]')
  .waitFor({ state: 'visible', timeout: 300000 });
```

**When to use:** Waiting for phase transitions (SSE event triggers attribute change)

### Wait for Function (Dynamic Conditions)

**Pattern:**
```typescript
await page.waitForFunction(
  () => {
    const text = document.body.textContent || '';
    const match = text.match(/(\d+) messages/);
    return match && parseInt(match[1]) >= 40;
  },
  { timeout: 180000 }
);
```

**When to use:** Complex conditions (message counts, vote tallies, dynamic text)

### Wait for SSE Events (Best Practice)

**Pattern:**
```typescript
// 1. Wait for SSE connection first
await waitForSSEConnection(page);

// 2. Wait for specific phase (SSE phase_change event)
await waitForPhase(page, 'DISCUSSION');

// 3. Now safe to assert on dynamic content
await expect(page.locator('[data-testid="discussion-feed"]')).toBeVisible();
```

**Rationale:** Always validate SSE connection before asserting on real-time data

## Selector Patterns

### Prefer data-testid (Most Stable)

**Pattern:**
```typescript
// Good: Explicit test attribute
await page.locator('[data-testid="player-grid"]');
await page.locator('[data-testid="player-card-Agent-A"]');
await page.locator('[data-testid="mafia-chat-panel"]');
```

**Rationale:** Immune to CSS/styling changes, explicitly marked for testing

### Use data-* Attributes (Component State)

**Pattern:**
```typescript
// Good: State-based attributes
await page.locator('[data-phase="NIGHT"]');
await page.locator('[data-badge="mafia"]');
await page.locator('[data-vote-count="3"]');
```

**Rationale:** Semantic, reflects component state, stable

### Fallback to CSS/Text (Last Resort)

**Pattern:**
```typescript
// Acceptable: Unique CSS class with meaning
await page.locator('.bg-green-500'); // Connection status dot

// Acceptable: Unique text content
await page.locator('text=/All votes cast!/');
await page.locator('button:has-text("Create Game")');
```

**Rationale:** Use only when data-testid unavailable, more fragile

### Avoid Generic Selectors (Brittle)

**Bad Examples:**
```typescript
// Bad: Generic classes (breaks on styling changes)
await page.locator('.p-3.rounded');
await page.locator('.bg-white.border');

// Bad: Element type only (ambiguous)
await page.locator('button'); // Which button?
await page.locator('div'); // Too vague
```

## Assertion Patterns

### Element Visibility

```typescript
await expect(page.locator('[data-testid="player-grid"]')).toBeVisible();
await expect(page.locator('[data-testid="mafia-chat-panel"]')).not.toBeVisible();
```

### Attribute Validation

```typescript
await expect(page.locator('[data-testid="phase-indicator"]'))
  .toHaveAttribute('data-phase', 'NIGHT');

await expect(page.locator('[data-testid="player-card-Agent-A"]'))
  .toHaveAttribute('data-badge', 'mafia');
```

### CSS Classes

```typescript
await expect(page.locator('[data-testid="player-card-Agent-A"]'))
  .toHaveClass(/border-red-300/); // Mafia border

await expect(page.locator('[data-testid="player-card-Agent-B"]'))
  .toHaveClass(/filter-grayscale/); // Eliminated player
```

### Text Content (Broad Matching)

```typescript
// Good: Regex for flexible matching
await expect(page.locator('[data-testid="vote-tally"]'))
  .toContainText(/Majority threshold: \d+ votes/);

await expect(page.locator('[data-testid="discussion-feed"]'))
  .toContainText(/\d+ messages/);

// Avoid: Exact string (brittle with AI variability)
// Bad: await expect(...).toContainText('44 messages');
```

### Count Validation

```typescript
const messageCount = await page.locator('[data-message-type="discussion"]').count();
expect(messageCount).toBeGreaterThanOrEqual(40);

const playerCards = await page.locator('[data-testid^="player-card-"]').count();
expect(playerCards).toBe(10);
```

## Error Handling

### Try-Catch for Non-Critical Assertions

```typescript
test('should handle optional elements gracefully', async ({ page }) => {
  try {
    await page.locator('[data-testid="optional-banner"]').waitFor({ timeout: 2000 });
    console.log('[Test] Optional banner found');
  } catch (error) {
    console.log('[Test] Optional banner not found (OK)');
  }

  // Continue test...
});
```

### Screenshot on Assertion Failure (Automatic)

Playwright automatically captures screenshots on failure if configured:

```typescript
// playwright.config.ts
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

### Manual Screenshot for Debugging

```typescript
test('should debug complex state', async ({ page }) => {
  await waitForPhase(page, 'VOTING');

  // Capture screenshot at critical point
  await page.screenshot({
    path: 'test-results/debug-voting-phase.png',
    fullPage: true
  });

  // Continue test...
});
```

## Test Isolation

### Each Test Creates Unique Game

```typescript
test('should display player grid', async ({ page }) => {
  // Each test gets its own game (no shared state)
  const gameId = await createGame(10);
  await startGame(gameId);
  await goToGame(page, gameId);

  // Test assertions...
});
```

### Cleanup After Each Test (Optional)

```typescript
test.afterEach(async ({ page }, testInfo) => {
  // Optional: Clean up game from database
  if (testInfo.gameId) {
    await fetch(`http://localhost:3000/api/game/${testInfo.gameId}`, {
      method: 'DELETE',
    });
  }
});
```

### Before All: Truncate Database

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

test.beforeAll(async () => {
  await prisma.message.deleteMany({});
  await prisma.vote.deleteMany({});
  await prisma.game.deleteMany({});
  console.log('[Test] Database truncated');
});
```

## Full Test Examples

### Example 1: Fast Test (Lobby Loads)

**File:** `tests/e2e/01-lobby.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Lobby Page', () => {
  test('should load lobby and display player count slider', async ({ page }) => {
    // Navigate to lobby
    await page.goto('http://localhost:3000');

    // Verify page loads
    await expect(page).toHaveTitle(/AI Mafia/);

    // Verify player count slider exists
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    // Verify initial value (default: 10)
    const initialValue = await slider.inputValue();
    expect(parseInt(initialValue)).toBeGreaterThanOrEqual(8);

    // Verify "Create Game" button exists
    const createButton = page.locator('button:has-text("Create Game")');
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
  });

  test('should create game and navigate to game page', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Set player count
    await page.locator('input[type="range"]').fill('10');

    // Click create game
    await page.locator('button:has-text("Create Game")').click();

    // Wait for navigation to game page
    await page.waitForURL(/\/game\/.+/, { timeout: 10000 });

    // Verify URL contains game ID
    const url = page.url();
    expect(url).toContain('/game/');

    console.log(`[Test] Created game and navigated to: ${url}`);
  });
});
```

### Example 2: Fast Test (SSE Connection)

**File:** `tests/e2e/03-sse-connection.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { createGame, startGame, goToGame, waitForSSEConnection } from '../helpers/game-helpers';

test.describe('SSE Connection', () => {
  test('should display green connection status indicator', async ({ page }) => {
    // Create and start game
    const gameId = await createGame(10);
    await startGame(gameId);

    // Navigate to game page
    await goToGame(page, gameId);

    // Wait for SSE connection (green dot)
    await waitForSSEConnection(page);

    // Verify green indicator visible
    const greenDot = page.locator('.bg-green-500');
    await expect(greenDot).toBeVisible();

    // Verify connection text
    await expect(page.locator('text=/Connected/')).toBeVisible();
  });

  test('should maintain connection for 10 seconds', async ({ page }) => {
    const gameId = await createGame(10);
    await startGame(gameId);
    await goToGame(page, gameId);

    // Wait for initial connection
    await waitForSSEConnection(page);

    // Wait 10 seconds
    await page.waitForTimeout(10000);

    // Verify still connected
    const greenDot = page.locator('.bg-green-500');
    await expect(greenDot).toBeVisible();

    console.log('[Test] Connection stable for 10 seconds');
  });
});
```

### Example 3: Slow Test (Full Game Flow)

**File:** `tests/e2e/10-full-game.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import {
  createGame,
  startGame,
  goToGame,
  waitForSSEConnection,
  waitForPhase,
  waitForMessages,
  waitForAllVotes,
  getCurrentPhase
} from '../helpers/game-helpers';

test.describe('Full Game Flow', () => {
  test('should complete full game from start to finish', async ({ page }) => {
    // Increase timeout for full game test (30 minutes)
    test.setTimeout(1800000);

    // Create and start game
    const gameId = await createGame(10);
    await startGame(gameId);
    await goToGame(page, gameId);

    // Wait for SSE connection
    await waitForSSEConnection(page);
    console.log('[Test] Game started, SSE connected');

    // Phase 1: NIGHT
    await waitForPhase(page, 'NIGHT');
    await expect(page.locator('[data-testid="mafia-chat-panel"]')).toBeVisible();
    console.log('[Test] NIGHT phase - Mafia chat visible');

    // Phase 2: DAY_ANNOUNCEMENT
    await waitForPhase(page, 'DAY_ANNOUNCEMENT');
    console.log('[Test] DAY_ANNOUNCEMENT phase');

    // Phase 3: DISCUSSION
    await waitForPhase(page, 'DISCUSSION');
    await expect(page.locator('[data-testid="discussion-feed"]')).toBeVisible();
    console.log('[Test] DISCUSSION phase - waiting for messages...');

    // Wait for messages to appear
    await waitForMessages(page, 10);
    console.log('[Test] 10+ messages received');

    // Phase 4: VOTING
    await waitForPhase(page, 'VOTING');
    await expect(page.locator('[data-testid="vote-tally"]')).toBeVisible();
    console.log('[Test] VOTING phase - waiting for votes...');

    // Wait for all votes
    await waitForAllVotes(page);
    console.log('[Test] All votes cast');

    // Phase 5: WIN_CHECK
    await waitForPhase(page, 'WIN_CHECK');
    console.log('[Test] WIN_CHECK phase');

    // Wait for game to end or next round
    await page.waitForTimeout(5000);
    const finalPhase = await getCurrentPhase(page);

    if (finalPhase === 'GAME_OVER') {
      console.log('[Test] Game ended in Round 1');

      // Verify game over banner
      await expect(page.locator('text=/Mafia Wins!|Villagers Win!/')).toBeVisible();
    } else if (finalPhase === 'NIGHT') {
      console.log('[Test] Round 2 started');

      // Wait for game to eventually end (up to 25 minutes)
      await page.waitForSelector('[data-phase="GAME_OVER"]', { timeout: 1500000 });

      // Verify game over banner
      await expect(page.locator('text=/Mafia Wins!|Villagers Win!/')).toBeVisible();
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/full-game-end.png',
      fullPage: true
    });

    console.log('[Test] Full game completed successfully');
  });
});
```

### Example 4: Visual Regression Test

**File:** `tests/visual/game-phases.spec.ts`

```typescript
import { test } from '@playwright/test';
import { createGame, startGame, goToGame, waitForSSEConnection, waitForPhase } from '../helpers/game-helpers';

test.describe('Visual Regression - Game Phases', () => {
  test('should capture Night phase screenshot', async ({ page }) => {
    const gameId = await createGame(10);
    await startGame(gameId);
    await goToGame(page, gameId);

    await waitForSSEConnection(page);
    await waitForPhase(page, 'NIGHT');

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Capture baseline screenshot
    await page.screenshot({
      path: 'tests/visual/screenshots/baseline/night-phase.png',
      fullPage: true
    });

    console.log('[Test] Night phase screenshot captured');
  });

  test('should capture Discussion phase screenshot', async ({ page }) => {
    const gameId = await createGame(10);
    await startGame(gameId);
    await goToGame(page, gameId);

    await waitForSSEConnection(page);
    await waitForPhase(page, 'DISCUSSION');

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Capture baseline screenshot
    await page.screenshot({
      path: 'tests/visual/screenshots/baseline/discussion-phase.png',
      fullPage: true
    });

    console.log('[Test] Discussion phase screenshot captured');
  });

  test('should capture Voting phase screenshot', async ({ page }) => {
    const gameId = await createGame(10);
    await startGame(gameId);
    await goToGame(page, gameId);

    await waitForSSEConnection(page);
    await waitForPhase(page, 'VOTING');

    // Wait for UI to settle
    await page.waitForTimeout(2000);

    // Capture baseline screenshot
    await page.screenshot({
      path: 'tests/visual/screenshots/baseline/voting-phase.png',
      fullPage: true
    });

    console.log('[Test] Voting phase screenshot captured');
  });
});
```

## Import Order Convention

```typescript
// 1. External dependencies (Node modules)
import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

// 2. Test helpers (relative imports)
import {
  createGame,
  startGame,
  waitForPhase,
  waitForSSEConnection
} from '../helpers/game-helpers';

// 3. Fixtures and test data
import { SMALL_GAME, LARGE_GAME } from '../fixtures/test-data';

// 4. Type definitions (if any)
import type { GamePhase, Player } from '@/types';
```

## Code Quality Standards

**Console Logging:**
- Use `console.log('[Test] ...')` prefix for test logs
- Log critical waits (phase transitions, message counts)
- Log game IDs for debugging

**Error Messages:**
- Throw descriptive errors with context
```typescript
throw new Error(`Failed to create game: ${response.statusText}`);
```

**Timeouts:**
- Always specify explicit timeouts
- Match timeout to expected duration (SSE: 5s, Phase: 5min)
```typescript
await page.locator('...').waitFor({ timeout: 5000 });
```

**Comments:**
- Comment complex waiting logic
- Explain non-obvious assertions
```typescript
// Wait for Discussion phase (can take 45s Night + 10s Day)
await waitForPhase(page, 'DISCUSSION');
```

## Performance Patterns

**Avoid Unnecessary Waits:**
```typescript
// Bad: Arbitrary timeout
await page.waitForTimeout(5000);

// Good: Wait for specific condition
await page.locator('[data-testid="player-grid"]').waitFor();
```

**Use Auto-Waiting:**
```typescript
// Playwright auto-waits for element to be actionable
await page.locator('button:has-text("Create Game")').click();
// No need for explicit waitFor before click
```

**Parallel Execution:**
```typescript
// Fast tests run in parallel (no shared state)
test.describe.configure({ mode: 'parallel' });
```

## Security Patterns

**Never Commit Secrets:**
```typescript
// Bad: Hardcoded API key
const apiKey = 'sk-ant-...';

// Good: Use environment variables
const apiKey = process.env.ANTHROPIC_API_KEY;
```

**Validate Environment:**
```typescript
test.beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set in environment');
  }
});
```

---

**Pattern Summary:**

| Category | Pattern | Purpose |
|----------|---------|---------|
| **Selectors** | `data-testid` > `data-*` > CSS/text | Stability |
| **Waiting** | `waitForFunction` > `waitFor` > `waitForTimeout` | Reliability |
| **Assertions** | Broad regex > Exact strings | Handle AI variability |
| **Isolation** | Unique game per test | Avoid state leakage |
| **Logging** | `[Test]` prefix | Debugging clarity |

**Next Steps:**
- Read `builder-tasks.md` for specific implementation assignments
- Use these patterns consistently across all 11 tests
- Reference helper functions from `game-helpers.ts`
- Follow timeout guidelines to avoid flakiness
