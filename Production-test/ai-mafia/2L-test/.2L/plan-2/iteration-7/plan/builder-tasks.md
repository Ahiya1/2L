# Builder Task Assignments - Iteration 7 (E2E Testing & Polish)

## Overview

3 builders will work on E2E testing implementation with strategic parallelization:
- **Builder-1:** Test infrastructure + 8 fast tests (6-8 hours) - CRITICAL PATH
- **Builder-2:** 3 slow integration tests (6-8 hours) - Depends on Builder-1 helpers
- **Builder-3:** Visual regression + CI/CD (3-4 hours) - Can run parallel with Builder-2

**Total Estimated Time:** 16-20 hours (parallel execution reduces wall time to ~12-14 hours)

**Execution Strategy:** Builder-1 → (Builder-2 || Builder-3) → Integration

---

## Builder-1: Test Infrastructure & Fast Tests

### Scope

Establish Playwright test infrastructure and implement 8 fast tests (<5 min total) covering lobby, game page, SSE connection, roles, phase indicator, timer, Mafia chat, and vote tally. These tests provide quick feedback and validate component rendering without waiting for full game flow.

### Complexity Estimate

**MEDIUM** (6-8 hours)

While individual tests are straightforward, the infrastructure setup requires careful configuration of Playwright, and the test helpers library is critical for all builders.

### Success Criteria

- [ ] `playwright.config.ts` created with optimal parallelization (3 workers for fast tests)
- [ ] `tests/helpers/game-helpers.ts` implemented with 8 helper functions
- [ ] `tests/fixtures/test-data.ts` created with test constants
- [ ] All 8 fast tests written and passing locally
- [ ] Fast test suite completes in <5 minutes (with parallel execution)
- [ ] Test helpers documented with JSDoc comments
- [ ] Zero flakiness: 3 consecutive runs pass at 100%

### Files to Create

**Configuration:**
- `app/playwright.config.ts` - Playwright configuration (timeouts, parallelization, reporters)

**Helpers:**
- `app/tests/helpers/game-helpers.ts` - Shared test utilities (8 functions)
- `app/tests/fixtures/test-data.ts` - Test constants (player counts, phase durations)

**Fast Tests (8 files):**
1. `app/tests/e2e/01-lobby.spec.ts` - Lobby loads, game creation
2. `app/tests/e2e/02-game-page.spec.ts` - Game page renders player grid
3. `app/tests/e2e/03-sse-connection.spec.ts` - SSE connection status
4. `app/tests/e2e/04-roles.spec.ts` - Player roles visible from start
5. `app/tests/e2e/05-phase-indicator.spec.ts` - Phase indicator displays
6. `app/tests/e2e/06-timer.spec.ts` - Timer countdown works
7. `app/tests/e2e/07-mafia-chat.spec.ts` - Mafia chat panel visibility
8. `app/tests/e2e/08-vote-tally.spec.ts` - Vote tally structure

**Update package.json:**
- Add test scripts: `test:e2e`, `test:e2e:fast`, `test:e2e:slow`, `test:e2e:visual`

### Dependencies

**Exploration Reports:**
- Explorer-1: Infrastructure analysis (Playwright already installed, `data-testid` attributes documented)
- Explorer-2: Fast test scenarios (8 scenarios designed, <5 min execution target)

**External:**
- Playwright 1.56.0 (already in `app/package.json`)
- Dev server running on `localhost:3000`
- Test database configured (`DATABASE_URL` in `.env.test`)

### Implementation Notes

**Critical: Test Helpers Must Be Complete Before Builder-2 Starts**

Builder-2 depends on these helper functions. Prioritize helper implementation in first 1-2 hours.

**Helper Functions Priority:**
1. `createGame()` - Essential for all tests
2. `startGame()` - Essential for game page tests
3. `waitForSSEConnection()` - Critical for reliable assertions
4. `waitForPhase()` - Required by Builder-2 slow tests
5. `waitForMessages()` - Required by Builder-2
6. `waitForAllVotes()` - Required by Builder-2
7. `getPlayerNames()` - Nice-to-have
8. `getCurrentPhase()` - Nice-to-have

**Playwright Config Priorities:**
- Set `timeout: 600000` (10 minutes) for full game tests
- Set `workers: 3` for fast tests (parallel execution)
- Enable `screenshot: 'only-on-failure'` (debugging)
- Configure `webServer` to auto-start dev server

**Fast Test Implementation Order:**
1. Start with simplest: 01-lobby (no game needed)
2. Then: 02-game-page (uses createGame, startGame)
3. Then: 03-sse-connection (uses waitForSSEConnection)
4. Parallel: 04-08 (all use similar patterns)

**Avoiding Flakiness:**
- Always call `waitForSSEConnection()` before assertions
- Use `waitFor()` instead of `waitForTimeout()`
- Use generous timeouts (30s for assertions)
- Test on 3 consecutive runs before marking complete

### Patterns to Follow

Reference patterns from `patterns.md`:

**Playwright Configuration:**
- Use pattern from `patterns.md` section "Playwright Configuration"
- Copy exact config, customize `testDir` to `./tests`

**Helper Functions:**
- Follow JSDoc documentation pattern
- Add `console.log('[Test] ...')` for debugging
- Return Promise for async operations
- Throw descriptive errors on API failures

**Test Structure:**
```typescript
import { test, expect } from '@playwright/test';
import { createGame, startGame, goToGame, waitForSSEConnection } from '../helpers/game-helpers';

test.describe('Feature Name', () => {
  test('should do something specific', async ({ page }) => {
    // Setup: Create game
    const gameId = await createGame(10);
    await startGame(gameId);
    await goToGame(page, gameId);

    // Wait for SSE
    await waitForSSEConnection(page);

    // Assert
    await expect(page.locator('[data-testid="..."]')).toBeVisible();
  });
});
```

**Selector Priority:**
1. `data-testid` attributes (most stable)
2. `data-phase`, `data-badge` attributes (semantic)
3. CSS classes (fallback)
4. Text content (last resort)

### Testing Requirements

**Unit Test for Helpers (Optional but Recommended):**
```typescript
// Test createGame helper
test('createGame should return valid gameId', async () => {
  const gameId = await createGame(10);
  expect(gameId).toMatch(/^[a-z0-9-]+$/);
});
```

**Integration Test for Full Suite:**
```bash
# Run fast tests 3 times
npm run test:e2e:fast
npm run test:e2e:fast
npm run test:e2e:fast

# Verify: All runs pass, <5 min each
```

**Coverage Target:**
- All 8 fast tests pass consistently
- Test helpers cover all critical waiting scenarios
- Playwright config optimized for speed and reliability

### Task Breakdown (6-8 hours)

**Hour 1: Infrastructure Setup**
- [ ] Create `playwright.config.ts` (30 min)
- [ ] Create directory structure (`tests/e2e/`, `tests/helpers/`, `tests/fixtures/`) (10 min)
- [ ] Add npm scripts to `package.json` (10 min)
- [ ] Verify Playwright installation: `npx playwright --version` (5 min)
- [ ] Install Chromium browser: `npx playwright install chromium` (5 min)

**Hour 2: Test Helpers Library**
- [ ] Implement `createGame()` (15 min)
- [ ] Implement `startGame()` (10 min)
- [ ] Implement `waitForSSEConnection()` (15 min)
- [ ] Implement `waitForPhase()` (20 min)
- [ ] Test helpers manually with simple script (10 min)

**Hour 3: More Helpers + Fixtures**
- [ ] Implement `waitForMessages()` (15 min)
- [ ] Implement `waitForAllVotes()` (15 min)
- [ ] Implement `getPlayerNames()` (15 min)
- [ ] Implement `getCurrentPhase()` (10 min)
- [ ] Create `test-data.ts` fixtures (15 min)

**Hours 4-5: Fast Tests (Tests 1-4)**
- [ ] 01-lobby.spec.ts (30 min)
- [ ] 02-game-page.spec.ts (30 min)
- [ ] 03-sse-connection.spec.ts (45 min)
- [ ] 04-roles.spec.ts (30 min)

**Hours 6-7: Fast Tests (Tests 5-8)**
- [ ] 05-phase-indicator.spec.ts (30 min)
- [ ] 06-timer.spec.ts (45 min)
- [ ] 07-mafia-chat.spec.ts (30 min)
- [ ] 08-vote-tally.spec.ts (30 min)

**Hour 8: Testing & Stabilization**
- [ ] Run full fast test suite 3 times (30 min)
- [ ] Fix any flakiness issues (30 min)
- [ ] Add JSDoc comments to helpers (20 min)
- [ ] Create README for test helpers (10 min)

**Buffer:** 1-2 hours for debugging and unexpected issues

---

## Builder-2: Slow Integration Tests

### Scope

Implement 3 slow integration tests that validate full game flow, message generation, and game over screen. These tests require waiting for multiple game phases (6-30 minutes per test) and validate end-to-end integration of SSE events, AI generation, and database updates.

### Complexity Estimate

**HIGH** (6-8 hours)

Slow tests require complex waiting logic for phase transitions, handling AI generation variability, and validating full game flow (multiple rounds). High risk of flakiness if not implemented carefully.

### Success Criteria

- [ ] Test 09 (messages) written and passing: Validates 40+ messages appear during Discussion phase
- [ ] Test 10 (full game) written and passing: Validates complete game flow from start to game over
- [ ] Test 11 (game over) written and passing: Validates winner announcement and final results
- [ ] Slow test suite completes in <20 minutes (sequential execution)
- [ ] Broad assertions handle AI variability (no exact text matching)
- [ ] Screenshots captured on failure (automatic via Playwright config)
- [ ] 3 consecutive runs pass at 100% (zero flakiness)

### Files to Create

1. `app/tests/e2e/09-messages.spec.ts` - Messages appear in feed
2. `app/tests/e2e/10-full-game.spec.ts` - Full game flow validation
3. `app/tests/e2e/11-game-over.spec.ts` - Game over screen

### Dependencies

**Hard Dependency on Builder-1:**
- Must wait for Builder-1 to complete test helpers (`game-helpers.ts`)
- Specifically needs: `waitForPhase()`, `waitForMessages()`, `waitForAllVotes()`
- Cannot start until Builder-1 commits helpers (coordinate via Git or shared directory)

**External:**
- Real backend running (no mocks for E2E tests)
- Database initialized with migrations
- Anthropic API key configured (`ANTHROPIC_API_KEY` in `.env.test`)

### Implementation Notes

**Start AFTER Builder-1 Completes Helpers (Critical)**

Do not start implementation until Builder-1 has committed `game-helpers.ts`. Review helper functions before starting to ensure understanding.

**Phase Timing Reference (from Explorer-1):**
- NIGHT: 45 seconds
- DAY_ANNOUNCEMENT: 10 seconds
- DISCUSSION: 180 seconds (3 minutes)
- VOTING: 120 seconds (2 minutes)
- WIN_CHECK: 5 seconds
- **Total Round:** ~6 minutes

**Expected Game Duration:**
- Minimum: 1 round (~6 min) - rare
- Typical: 3-5 rounds (~18-30 min)
- Maximum: Allow 40 minutes for safety

**Handling AI Variability:**
- Use broad assertions: `messageCount >= 40` (not `=== 44`)
- Test structure, not content: Check elements exist, not exact text
- Avoid regex matching on AI-generated messages
- Focus on data attributes: `data-testid`, `data-phase`, `data-vote-count`

**Timeouts:**
- Per-test timeout: 30 minutes (`test.setTimeout(1800000)`)
- Phase wait timeout: 5 minutes (already in `waitForPhase()`)
- Message wait timeout: 3 minutes (already in `waitForMessages()`)

**Debugging Long Tests:**
- Add `console.log('[Test] ...')` at each phase transition
- Take screenshots at critical points (before assertions)
- Use `page.screenshot({ fullPage: true })` for debugging

### Patterns to Follow

Reference patterns from `patterns.md`:

**Slow Test Pattern:**
```typescript
test('should complete full game flow', async ({ page }) => {
  // Increase timeout for slow test
  test.setTimeout(1800000); // 30 minutes

  // Create game
  const gameId = await createGame(10);
  await startGame(gameId);
  await goToGame(page, gameId);

  // Wait for SSE
  await waitForSSEConnection(page);

  // Phase progression
  await waitForPhase(page, 'NIGHT');
  console.log('[Test] NIGHT phase');

  await waitForPhase(page, 'DISCUSSION');
  console.log('[Test] DISCUSSION phase');

  // Broad assertions
  const messageCount = await page.locator('[data-message-type="discussion"]').count();
  expect(messageCount).toBeGreaterThanOrEqual(10);

  // Continue through phases...
});
```

**Waiting for Dynamic Content:**
```typescript
// Wait for messages to appear (up to 3 minutes)
await waitForMessages(page, 40);

// Assert on count (broad)
const messages = await page.locator('[data-message-type="discussion"]').count();
expect(messages).toBeGreaterThanOrEqual(40);
```

**Game Over Detection:**
```typescript
// Wait for GAME_OVER phase or timeout
try {
  await page.waitForSelector('[data-phase="GAME_OVER"]', { timeout: 1500000 }); // 25 min
} catch (error) {
  // Take screenshot on timeout
  await page.screenshot({ path: 'test-results/game-timeout.png' });
  throw new Error('Game did not complete within 25 minutes');
}

// Verify winner announcement
await expect(page.locator('text=/Mafia Wins!|Villagers Win!/')).toBeVisible();
```

### Testing Requirements

**Pre-Test Validation:**
- Verify `ANTHROPIC_API_KEY` is set
- Verify database is accessible
- Verify dev server is running

**During Test:**
- Log each phase transition
- Capture screenshots at key points (optional)
- Handle timeouts gracefully

**Post-Test:**
- Verify test completes within expected time (<20 min per test)
- Review console logs for errors
- Check screenshots on failure

### Task Breakdown (6-8 hours)

**Hour 1: Setup & Review**
- [ ] Review Builder-1's helper functions (20 min)
- [ ] Test helper functions manually (20 min)
- [ ] Set up test environment (API key, database) (10 min)
- [ ] Create test file templates (10 min)

**Hours 2-3: Test 09 (Messages)**
- [ ] Implement test structure (30 min)
- [ ] Add phase progression waits (30 min)
- [ ] Add message count assertions (20 min)
- [ ] Test and debug (30 min)
- [ ] Run 3 times to verify stability (20 min)

**Hours 4-6: Test 10 (Full Game)**
- [ ] Implement test structure (45 min)
- [ ] Add all phase transitions (NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK → GAME_OVER) (60 min)
- [ ] Add assertions for each phase (45 min)
- [ ] Handle game over detection (30 min)
- [ ] Test and debug (1 hour)
- [ ] Run 3 times to verify stability (30 min)

**Hours 7-8: Test 11 (Game Over) + Stabilization**
- [ ] Implement test structure (30 min)
- [ ] Add game over screen assertions (30 min)
- [ ] Verify winner announcement (20 min)
- [ ] Test and debug (30 min)
- [ ] Run all slow tests 3 times (60 min)
- [ ] Fix any flakiness (1 hour)

**Buffer:** 1-2 hours for debugging AI variability issues

---

## Builder-3: Visual Regression & CI/CD

### Scope

Capture 7 baseline screenshots for visual regression testing and configure GitHub Actions workflow for CI/CD. Visual tests validate UI layout integrity across phases, while CI/CD ensures tests run automatically on every commit.

### Complexity Estimate

**LOW-MEDIUM** (3-4 hours)

Visual regression is straightforward (capture screenshots), but CI/CD configuration requires understanding of GitHub Actions and database setup in CI environment.

### Success Criteria

- [ ] 7 baseline screenshots captured in `tests/visual/screenshots/baseline/`
- [ ] 3 visual regression test files written
- [ ] Screenshots stored in Git repository (baseline tracking)
- [ ] `.github/workflows/e2e-tests.yml` created and configured
- [ ] CI workflow runs successfully on test PR
- [ ] Fast tests run on all PRs (<10 min)
- [ ] Slow tests run on main branch only (avoid CI overload)
- [ ] Test artifacts (screenshots, videos, HTML report) uploaded on failure

### Files to Create

**Visual Tests:**
1. `app/tests/visual/lobby.spec.ts` - Lobby screenshot
2. `app/tests/visual/game-phases.spec.ts` - Night, Discussion, Voting screenshots
3. `app/tests/visual/game-over.spec.ts` - Game over screenshot

**CI/CD:**
4. `.github/workflows/e2e-tests.yml` - GitHub Actions workflow

**Documentation:**
5. `app/tests/visual/README.md` - Visual regression testing guide

### Dependencies

**Soft Dependency on Builder-1:**
- Uses same helper functions (`createGame`, `startGame`, `waitForPhase`)
- Can start in parallel with Builder-2 if helpers are complete

**External:**
- GitHub repository with Actions enabled
- GitHub secrets configured (`ANTHROPIC_API_KEY`)

### Implementation Notes

**Screenshot Capture Strategy:**

1. **Navigate to screen**
2. **Wait for stable state** (phase loaded, SSE connected, UI settled)
3. **Wait 2 seconds** (ensure animations complete)
4. **Capture full-page screenshot**
5. **Store in `tests/visual/screenshots/baseline/`**

**Screenshot Naming Convention:**
- `lobby-baseline.png`
- `game-start-roles-visible.png`
- `night-phase-split-screen.png`
- `discussion-phase-messages.png`
- `voting-phase-tally.png`
- `phase-timeline-round-3.png`
- `game-over-villagers-win.png`

**Viewport Consistency:**
- Always use 1920x1080 (Desktop Chrome)
- Configured in `playwright.config.ts`

**Manual Comparison (MVP Scope):**
- Visual regression is **manual** for MVP
- Reviewer diffs screenshots on UI changes
- Automated diffing (pixelmatch) deferred to post-MVP

**CI/CD Configuration:**

**Two Jobs:**
1. **fast-tests:** Runs on all PRs (5-10 min)
2. **slow-tests:** Runs on main branch only (20-30 min)

**Database Setup:**
- Use PostgreSQL service in GitHub Actions
- Create test database before running tests
- Run migrations: `npm run db:migrate`

**Secrets:**
- `ANTHROPIC_API_KEY`: Set in repository secrets

**Artifacts:**
- Upload on failure: screenshots, videos, HTML report
- Retention: 30 days

### Patterns to Follow

Reference patterns from `patterns.md`:

**Visual Test Pattern:**
```typescript
test('should capture Night phase screenshot', async ({ page }) => {
  // Create and start game
  const gameId = await createGame(10);
  await startGame(gameId);
  await goToGame(page, gameId);

  // Wait for SSE and phase
  await waitForSSEConnection(page);
  await waitForPhase(page, 'NIGHT');

  // Wait for UI to settle
  await page.waitForTimeout(2000);

  // Capture screenshot
  await page.screenshot({
    path: 'tests/visual/screenshots/baseline/night-phase.png',
    fullPage: true
  });

  console.log('[Test] Night phase screenshot captured');
});
```

**CI/CD Workflow Pattern:**
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
    # ... (see tech-stack.md for full config)
```

### Testing Requirements

**Visual Test Validation:**
- Verify all 7 screenshots captured successfully
- Check screenshot file sizes (should be 100-500 KB each)
- Manually review screenshots for completeness

**CI/CD Validation:**
- Create test PR to trigger workflow
- Verify fast tests run and pass
- Merge to main, verify slow tests run
- Check artifacts uploaded on failure

### Task Breakdown (3-4 hours)

**Hour 1: Visual Test Setup**
- [ ] Create `tests/visual/` directory (5 min)
- [ ] Create `tests/visual/screenshots/baseline/` directory (5 min)
- [ ] Create `lobby.spec.ts` template (10 min)
- [ ] Capture lobby screenshot (10 min)
- [ ] Create `game-phases.spec.ts` template (10 min)
- [ ] Review screenshot quality (10 min)

**Hour 2: Phase Screenshots**
- [ ] Capture Night phase screenshot (15 min)
- [ ] Capture Discussion phase screenshot (20 min)
- [ ] Capture Voting phase screenshot (20 min)
- [ ] Verify all screenshots captured (5 min)

**Hour 2.5: Remaining Screenshots**
- [ ] Capture phase timeline screenshot (15 min)
- [ ] Capture game over screenshot (20 min)
- [ ] Create visual regression README (15 min)

**Hour 3: CI/CD Configuration**
- [ ] Create `.github/workflows/` directory (5 min)
- [ ] Create `e2e-tests.yml` workflow (30 min)
- [ ] Configure PostgreSQL service (15 min)
- [ ] Configure test database setup (10 min)
- [ ] Configure artifact upload (10 min)

**Hour 4: CI/CD Testing**
- [ ] Commit workflow file (5 min)
- [ ] Create test PR (5 min)
- [ ] Monitor workflow execution (15 min)
- [ ] Fix any CI issues (20 min)
- [ ] Verify artifacts uploaded (10 min)
- [ ] Document CI/CD setup in README (15 min)

**Buffer:** 30 min for CI/CD debugging

---

## Coordination Notes

### Builder Execution Order

**Phase 1: Builder-1 Solo (Hours 1-3)**
- Builder-1 works on infrastructure and helpers
- Builder-2 and Builder-3 wait (or work on other tasks)
- **Milestone:** Test helpers committed to Git

**Phase 2: Builder-2 || Builder-3 (Hours 4-8)**
- Builder-1 continues with fast tests
- Builder-2 starts slow tests (depends on helpers)
- Builder-3 starts visual tests (depends on helpers)
- All builders work in parallel (no conflicts)

**Phase 3: Integration (30 min)**
- All builders merge their branches
- Run full test suite end-to-end
- Resolve any conflicts (unlikely - separate files)

### Communication Protocol

**Builder-1 → Builder-2/3:**
- Notify when helpers are complete and committed
- Share `game-helpers.ts` location and API

**Builder-2 ↔ Builder-3:**
- No dependencies, work independently
- Can share debugging tips for SSE/phase waits

**All Builders → Integration:**
- Commit test files to separate branches
- Merge to main after individual validation

### Shared Resources

**Test Helpers:**
- Owner: Builder-1
- Consumers: Builder-2, Builder-3
- Location: `app/tests/helpers/game-helpers.ts`

**Playwright Config:**
- Owner: Builder-1
- Consumers: Builder-2, Builder-3 (read-only)
- Location: `app/playwright.config.ts`

**Test Database:**
- Each test creates unique game (no conflicts)
- All builders use same test database
- No cleanup needed (unique gameIds)

### Conflict Resolution

**If Builder-2/3 Start Before Helpers Ready:**
- Copy placeholder implementations from `patterns.md`
- Replace with Builder-1's implementations when ready
- Risk: Wasted effort if APIs differ

**If CI/CD Fails:**
- Builder-3 debugs CI configuration
- Builder-1/2 verify tests pass locally
- Coordinate on Slack/GitHub Issues

**If Tests Are Flaky:**
- Review timeout configuration (too short?)
- Review waiting strategies (using `waitForTimeout` instead of `waitForFunction`?)
- Add retry logic (last resort)

---

## Integration Checklist

After all builders complete:

- [ ] Merge Builder-1 branch (infrastructure + fast tests)
- [ ] Merge Builder-2 branch (slow tests)
- [ ] Merge Builder-3 branch (visual tests + CI/CD)
- [ ] Run full test suite locally: `npm run test:e2e`
- [ ] Verify all 11 tests pass
- [ ] Run 3 consecutive times (zero flakiness)
- [ ] Trigger CI/CD pipeline (push to main)
- [ ] Verify GitHub Actions workflow passes
- [ ] Review test report (HTML)
- [ ] Verify screenshots captured on failure
- [ ] Document test suite in project README

---

## Final Validation Criteria

**Test Suite Completeness:**
- [ ] 11 E2E tests implemented (8 fast + 3 slow)
- [ ] 7 visual regression screenshots captured
- [ ] Test helpers library complete (8 functions)
- [ ] CI/CD pipeline configured and passing

**Test Quality:**
- [ ] Zero flakiness (3 consecutive runs, 100% pass rate)
- [ ] Fast tests complete in <5 minutes
- [ ] Slow tests complete in <20 minutes
- [ ] Broad assertions handle AI variability

**Documentation:**
- [ ] Test helpers documented with JSDoc
- [ ] Visual regression README created
- [ ] CI/CD setup documented
- [ ] Project README updated with test commands

**Production Readiness:**
- [ ] Tests run automatically on every PR (fast tests)
- [ ] Tests run on main branch (slow tests)
- [ ] Test failures block deployment
- [ ] Test artifacts available for debugging

---

**Builder Task Summary:**

| Builder | Tasks | Hours | Dependency | Priority |
|---------|-------|-------|------------|----------|
| Builder-1 | Infrastructure + 8 fast tests | 6-8 | None | CRITICAL |
| Builder-2 | 3 slow integration tests | 6-8 | Builder-1 helpers | HIGH |
| Builder-3 | Visual tests + CI/CD | 3-4 | Builder-1 helpers (soft) | MEDIUM |

**Total:** 16-20 hours (parallel execution reduces to ~12-14 hours wall time)

**Success Metric:** All 11 tests passing, CI/CD green, zero flakiness

---

**Next Steps:**
1. Builder-1 starts immediately (critical path)
2. Builder-2/3 review exploration reports and patterns.md
3. All builders coordinate helper completion milestone
4. Integration and validation after all complete
