# Technology Stack - E2E Testing & Polish

## Testing Framework

**Decision:** Playwright 1.56.0

**Rationale:**
- Already installed in project (`@playwright/test@1.56.0` in `app/package.json`)
- Superior SSE/WebSocket support compared to Cypress (critical for real-time testing)
- Auto-waiting reduces flakiness (waits for elements to be actionable)
- Built-in screenshot/video capture for debugging
- Parallel test execution out of the box (3-4 workers)
- Native TypeScript support (matches project stack)
- Mature trace viewer for debugging failures

**Alternatives Considered:**
- **Cypress:** Rejected - poor SSE support, no true parallelization, slower execution
- **Puppeteer:** Rejected - lower-level API, no test runner, requires more boilerplate
- **Selenium:** Rejected - outdated, slow, complex setup

**Version Pinning:**
```json
{
  "devDependencies": {
    "@playwright/test": "1.56.0",
    "playwright": "1.56.0"
  }
}
```

## Test Runner

**Decision:** Playwright Test Runner (built-in)

**Configuration:**
- **Parallel execution:** 3 workers for fast tests (optimize for 8 fast tests)
- **Sequential execution:** 1 worker for slow tests (avoid game state conflicts)
- **Timeout:** 10 minutes per test (generous for full game tests)
- **Retries:** 2 retries in CI only (local: 0 retries for fast feedback)

**Test Execution Commands:**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:fast": "playwright test tests/e2e/0[1-8]*.spec.ts",
    "test:e2e:slow": "playwright test tests/e2e/0[9]*.spec.ts tests/e2e/1[0-1]*.spec.ts",
    "test:e2e:visual": "playwright test tests/visual/",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  }
}
```

## Test Helpers

**Decision:** Custom helper library (`tests/helpers/game-helpers.ts`)

**Functions to Create:**

1. **`createGame(playerCount: number): Promise<string>`**
   - Creates game via API call to `/api/game/create`
   - Returns `gameId`
   - Purpose: Isolate each test with unique game

2. **`startGame(gameId: string): Promise<void>`**
   - Starts game via API call to `/api/game/{gameId}/start`
   - Purpose: Trigger game initialization

3. **`waitForSSEConnection(page: Page): Promise<void>`**
   - Waits for green connection indicator (`.bg-green-500`)
   - Timeout: 5 seconds
   - Purpose: Ensure SSE connected before assertions

4. **`waitForPhase(page: Page, phase: string): Promise<void>`**
   - Waits for `data-phase` attribute to match target phase
   - Timeout: 5 minutes (phase transitions can take 45s-3m)
   - Purpose: Synchronize tests with game state

5. **`waitForMessages(page: Page, minCount: number): Promise<void>`**
   - Polls message count until >= `minCount`
   - Timeout: 3 minutes (Discussion phase duration)
   - Purpose: Validate message generation

6. **`waitForAllVotes(page: Page): Promise<void>`**
   - Waits for "All votes cast!" indicator
   - Timeout: 2 minutes (Voting phase duration)
   - Purpose: Ensure voting phase completes

7. **`getPlayerNames(page: Page): Promise<string[]>`**
   - Extracts player names from `data-testid` attributes
   - Purpose: Validate player count and names

8. **`getCurrentPhase(page: Page): Promise<string | null>`**
   - Returns current phase from `data-phase` attribute
   - Purpose: Assert phase transitions

**Rationale:**
- Centralize waiting logic (avoid duplication in 11 tests)
- Encapsulate SSE timing complexity
- Provide consistent timeouts across tests
- Improve test readability

## Assertions

**Decision:** Playwright expect API (extended from Jest)

**Assertion Patterns:**

**Element Visibility:**
```typescript
await expect(page.locator('[data-testid="player-grid"]')).toBeVisible();
```

**Attribute Validation:**
```typescript
await expect(page.locator('[data-testid="phase-indicator"]'))
  .toHaveAttribute('data-phase', 'NIGHT');
```

**Count Validation:**
```typescript
const messageCount = await page.locator('[data-message-type="discussion"]').count();
expect(messageCount).toBeGreaterThanOrEqual(40);
```

**Text Content (Broad):**
```typescript
await expect(page.locator('[data-testid="vote-tally"]'))
  .toContainText(/Majority threshold: \d+ votes/);
```

**CSS Classes:**
```typescript
await expect(page.locator('[data-testid="player-card-Agent-A"]'))
  .toHaveClass(/border-red-300/); // Mafia border
```

**Rationale:**
- Use broad assertions for AI-generated content (reduce flakiness)
- Prefer `data-testid` attributes over CSS selectors (stability)
- Use regex for flexible text matching
- Avoid exact string matching for AI responses

## Mocking Strategy

**Decision:** Use real backend (no mocking for E2E tests)

**Rationale:**
- E2E tests validate full integration (frontend + backend + database + AI)
- Mocking defeats the purpose of end-to-end validation
- SSE behavior cannot be reliably mocked (EventSource API complexity)
- AI generation variability is acceptable with broad assertions

**What NOT to Mock:**
- API endpoints (`/api/game/create`, `/api/game/{gameId}/state`)
- SSE connection (`/api/game/{gameId}/stream`)
- Database (use test database, not mocks)
- AI responses (use real Claude API with prompt caching)

**Cost Implications:**
- Estimated: $1-2 per 10-player game test
- Mitigation: Run slow tests (full game) infrequently (nightly or on main branch only)

## Database Management

**Decision:** Separate test database with cleanup hooks

**Test Database Configuration:**
```bash
# .env.test
DATABASE_URL="postgresql://localhost:5432/mafia_test"
```

**Setup Strategy:**

1. **Before All Tests:** Truncate tables
```typescript
test.beforeAll(async () => {
  await prisma.game.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.vote.deleteMany({});
  await prisma.player.deleteMany({});
});
```

2. **Each Test:** Create unique game (no cleanup needed)
```typescript
test('Game loads', async ({ page }) => {
  const gameId = await createGame(10); // Unique game per test
  // Test logic...
});
```

3. **After Each Test (Optional):** Delete game
```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.gameId) {
    await prisma.game.delete({ where: { id: testInfo.gameId } });
  }
});
```

**Rationale:**
- Test isolation (no state leakage between tests)
- Real database validates Prisma queries
- Cleanup prevents database bloat

## CI/CD

**Decision:** GitHub Actions workflow

**Workflow Strategy:**

**File:** `.github/workflows/e2e-tests.yml`

**Triggers:**
- `push` to `main` branch → Run all tests (fast + slow)
- `pull_request` → Run fast tests only (quick feedback)

**Job Configuration:**

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  fast-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: mafia_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/mafia_test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e:fast
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/mafia_test
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: fast-test-results
          path: playwright-report/

  slow-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 120
    if: github.ref == 'refs/heads/main'

    steps:
      # Similar to fast-tests, but runs slow test suite
      - run: npm run test:e2e:slow
```

**Rationale:**
- Fast tests on PR (5-10 min) provide quick feedback
- Slow tests on main branch only (avoid CI overload)
- Separate jobs allow fast tests to fail fast
- Artifact upload preserves screenshots/videos for debugging

## Visual Regression

**Decision:** Playwright native screenshots (manual comparison initially)

**Screenshot Strategy:**

1. **Baseline Capture:**
```typescript
await page.screenshot({
  path: 'tests/visual/screenshots/baseline/night-phase.png',
  fullPage: true
});
```

2. **Storage:**
- Location: `tests/visual/screenshots/baseline/`
- Naming: `<screen-name>.png`
- Version control: Commit baselines to Git

3. **Comparison (Manual for MVP):**
- Reviewer manually diffs screenshots on UI changes
- Future: Integrate `pixelmatch` or `playwright-snapshot` for automated diffing

4. **Update Workflow:**
- UI change → Capture new screenshot → Replace baseline → Commit

**Pixel Diff Threshold (Future):**
```typescript
expect(await page.screenshot()).toMatchSnapshot('night-phase.png', {
  threshold: 0.1, // 0.1% pixel difference tolerance
});
```

**Rationale:**
- Manual comparison sufficient for MVP (7 screenshots)
- Automated diffing adds complexity (defer to post-MVP)
- Playwright native screenshots are reliable
- Full-page screenshots capture layout issues

## Dependencies

**New Packages to Install:**

**None required** - Playwright already installed

**Verify Installation:**
```bash
cd app
npx playwright --version
# Expected: Version 1.56.0
```

**Install Browsers (One-time):**
```bash
npx playwright install chromium
```

**Optional (Post-MVP):**
```bash
npm install --save-dev pixelmatch      # Pixel-level screenshot diffing
npm install --save-dev @playwright/snapshot  # Snapshot testing
```

## Environment Variables

**Required for Tests:**

```bash
# .env.test
DATABASE_URL="postgresql://localhost:5432/mafia_test"
ANTHROPIC_API_KEY="sk-ant-..."  # Required for full game tests
```

**CI/CD Secrets:**
- `ANTHROPIC_API_KEY`: Set in GitHub repository secrets

**Local Setup:**
```bash
cp .env .env.test
# Edit .env.test to point to test database
```

## Performance Targets

**Fast Test Suite:**
- Total execution time: <5 minutes (with 3 workers in parallel)
- Per-test timeout: 5 minutes
- Target: 8 tests × 30s avg / 3 workers = ~80 seconds

**Slow Test Suite:**
- Total execution time: <20 minutes (sequential, 1 worker)
- Per-test timeout: 30 minutes
- Target: 3 tests × 5-10 min each = 15-30 minutes

**Visual Test Suite:**
- Total execution time: <5 minutes
- Per-test timeout: 5 minutes
- Target: 7 screenshots × 30s each = ~3.5 minutes

**CI/CD Pipeline:**
- Fast tests on PR: <10 minutes (acceptable)
- Slow tests on main: <30 minutes (acceptable for nightly)
- Artifact upload: <1 minute

## Security Considerations

**Test API Keys:**
- Use separate Anthropic API key for testing (isolate billing)
- Rotate API keys regularly
- Never commit API keys to Git (use `.env.test` + `.gitignore`)

**Test Database:**
- Isolate test database from production/dev databases
- Drop and recreate test database weekly (prevent data buildup)
- No sensitive user data in test database

**Screenshot Privacy:**
- Screenshots may contain game state (no PII)
- Safe to commit to Git repository
- No sensitive data exposure risk

## Browser Configuration

**Decision:** Chromium only (initial scope)

**Playwright Project Configuration:**
```typescript
// playwright.config.ts
projects: [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1920, height: 1080 },
    },
  },
  // Firefox and Safari deferred to post-MVP
],
```

**Rationale:**
- Chromium covers 80% of users (sufficient for MVP)
- Single browser reduces test execution time
- Cross-browser testing can be added later (5-10% additional effort)

---

**Technology Decisions Summary:**

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Test Framework** | Playwright 1.56.0 | Already installed, superior SSE support |
| **Test Runner** | Playwright Test Runner | Built-in, parallel execution |
| **Mocking** | Real backend (no mocks) | E2E tests validate full integration |
| **Database** | Separate test database | Test isolation, real queries |
| **CI/CD** | GitHub Actions | Free for public repos, easy setup |
| **Visual Regression** | Playwright screenshots (manual diff) | Simple, sufficient for MVP |
| **Browsers** | Chromium only | 80% coverage, single browser for speed |
| **Assertions** | Broad assertions | Handle AI variability |

**Next Steps for Builders:**
1. Read `patterns.md` for implementation examples
2. Reference `builder-tasks.md` for specific assignments
3. Use `game-helpers.ts` functions consistently
4. Follow timeout and retry strategies from this document
