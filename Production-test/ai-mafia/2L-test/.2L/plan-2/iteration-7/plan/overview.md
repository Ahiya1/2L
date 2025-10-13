# 2L Iteration Plan - AI Mafia E2E Testing & Polish

## Project Vision

Implement comprehensive Playwright E2E tests to validate all features of the AI Mafia game (Iterations 5-6), establish visual regression testing to prevent UI breakage, and configure CI/CD pipeline for automated test execution. This is the final iteration of Plan 2, ensuring production readiness through 11 test scenarios covering 92% of critical paths.

## Success Criteria

Specific, measurable criteria for iteration completion:

- [ ] All 11 Playwright E2E tests written and passing locally
- [ ] Fast test suite (<5 min) runs consistently without flakiness
- [ ] Slow test suite (~15 min) validates full game flow
- [ ] Visual regression tests capture 7 baseline screenshots
- [ ] Test helpers library (`game-helpers.ts`) implemented with 8+ functions
- [ ] Playwright configuration optimized for parallel/sequential execution
- [ ] CI/CD pipeline configured in GitHub Actions
- [ ] Test reports generated (HTML + JSON) with failure screenshots
- [ ] Zero flakiness: 3 consecutive test runs pass at 100%
- [ ] Test coverage documented: 92% of features validated

## MVP Scope

**In Scope:**

- **Test Infrastructure**
  - Playwright configuration (`playwright.config.ts`)
  - Test helpers library (`tests/helpers/game-helpers.ts`)
  - Test fixtures for game data

- **Fast Tests (8 tests, <5 min total)**
  1. Lobby loads and game creation works
  2. Game page renders player grid correctly
  3. SSE connection status indicator displays
  4. Player roles visible from game start (transparency feature)
  5. Phase indicator displays current phase
  6. Timer countdown works and decrements
  7. Mafia chat panel visible during Night phase
  8. Vote tally displays during Voting phase

- **Slow Tests (3 tests, ~15 min total)**
  9. Full game flow validation (all phases)
  10. Messages appear in feed (40+ messages)
  11. Game over screen displays winner

- **Visual Regression Tests (7 screenshots)**
  - Lobby baseline
  - Game start with visible roles
  - Night phase split-screen layout
  - Discussion phase with messages
  - Voting phase with tally
  - Phase timeline progression
  - Game over screen

- **CI/CD Integration**
  - GitHub Actions workflow
  - Test database setup
  - Artifact upload (screenshots, videos, traces)

**Out of Scope (Post-MVP):**

- SSE reconnection handling tests (manual testing)
- Load/performance testing
- Cross-browser testing (Firefox, Safari)
- Mobile viewport testing
- Security testing
- Specific win condition scenarios (non-deterministic)

## Development Phases

1. **Exploration** ✅ Complete
   - Explorer-1: Infrastructure analysis (90% ready, 45s-3m phase timing documented)
   - Explorer-2: Test scenarios designed (11 scenarios, 92% coverage achievable)

2. **Planning** 🔄 Current
   - Synthesizing exploration reports
   - Creating builder task breakdown
   - Defining tech stack and patterns

3. **Building** ⏳ 16-20 hours (3 parallel builders)
   - Builder-1: Infrastructure + Fast Tests (6-8 hours)
   - Builder-2: Slow Integration Tests (6-8 hours)
   - Builder-3: Visual Regression + CI/CD (3-4 hours)

4. **Integration** ⏳ 30 minutes
   - Merge all test files
   - Verify test suite runs end-to-end
   - Resolve any test conflicts

5. **Validation** ⏳ 1 hour
   - Run full test suite 3 times
   - Verify zero flakiness
   - Generate test report

6. **Deployment** ⏳ Final
   - Commit test suite to repository
   - Trigger CI/CD pipeline
   - Verify tests pass in GitHub Actions

## Timeline Estimate

- **Exploration:** ✅ Complete (4 hours)
- **Planning:** ✅ Complete (2 hours)
- **Building:** 16-20 hours total (parallel execution)
  - Builder-1: 6-8 hours (Infrastructure + Fast Tests)
  - Builder-2: 6-8 hours (Slow Tests, starts after Builder-1 completes helpers)
  - Builder-3: 3-4 hours (Visual + CI/CD, parallel with Builder-2)
- **Integration:** 30 minutes
- **Validation:** 1 hour
- **Total:** ~20-24 hours wall time (with 3 builders working in parallel/sequence)

## Risk Assessment

### High Risks

**Risk: Test Flakiness from SSE Timing**
- **Likelihood:** Medium (25%)
- **Impact:** High (blocks CI/CD reliability)
- **Mitigation Strategy:**
  - Use generous timeouts (300s for phase transitions)
  - Implement `waitForFunction` instead of fixed delays
  - Add retry logic in Playwright config (2 retries in CI)
  - Use deterministic `data-testid` attributes (already present in components)
  - Validate SSE connection before assertions (`waitForSSEConnection` helper)

**Risk: Long Test Execution Times**
- **Likelihood:** High (100% - full game takes 25-30 minutes)
- **Impact:** Medium (slow feedback loop)
- **Mitigation Strategy:**
  - Split tests into fast (<5 min) and slow (~15 min) categories
  - Run fast tests on every PR (quick feedback)
  - Run slow tests only on main branch or nightly
  - Use Playwright parallelization (3 workers for fast tests)
  - Accept that integration tests are inherently slow

### Medium Risks

**Risk: AI Generation Variability**
- **Likelihood:** Medium (20%)
- **Impact:** Medium (tests fail due to unexpected AI responses)
- **Mitigation Strategy:**
  - Use broad assertions (e.g., "message count > 40" not "exactly 44")
  - Test data attributes, not AI-generated content
  - Avoid exact text matching for messages/votes
  - Focus on structural validation (elements exist, correct count)

**Risk: Database State Pollution**
- **Likelihood:** Low (10%)
- **Impact:** Medium (tests interfere with each other)
- **Mitigation Strategy:**
  - Each test creates unique game via `createGame()` helper
  - Use test database (separate from dev database)
  - Implement `afterEach` cleanup hooks
  - Truncate tables before test suite runs

### Low Risks

**Risk: Dev Server Not Running**
- **Likelihood:** Low (5%)
- **Impact:** Low (tests fail to connect)
- **Mitigation Strategy:**
  - Use Playwright `webServer` config to auto-start dev server
  - Set `reuseExistingServer: true` for local dev
  - Increase startup timeout to 120 seconds

## Integration Strategy

### Builder Dependencies

**Sequential Dependencies:**
1. Builder-1 must complete test helpers before Builder-2 starts slow tests
2. All builders must complete before Integration phase

**Parallel Execution:**
- Builder-3 (Visual + CI/CD) can work in parallel with Builder-2
- No conflicts expected (separate files)

### File Organization

```
app/
├── tests/
│   ├── e2e/
│   │   ├── 01-lobby.spec.ts           (Builder-1)
│   │   ├── 02-game-page.spec.ts       (Builder-1)
│   │   ├── 03-sse-connection.spec.ts  (Builder-1)
│   │   ├── 04-roles.spec.ts           (Builder-1)
│   │   ├── 05-phase-indicator.spec.ts (Builder-1)
│   │   ├── 06-timer.spec.ts           (Builder-1)
│   │   ├── 07-mafia-chat.spec.ts      (Builder-1)
│   │   ├── 08-vote-tally.spec.ts      (Builder-1)
│   │   ├── 09-messages.spec.ts        (Builder-2)
│   │   ├── 10-full-game.spec.ts       (Builder-2)
│   │   └── 11-game-over.spec.ts       (Builder-2)
│   ├── visual/
│   │   ├── lobby.spec.ts              (Builder-3)
│   │   ├── game-phases.spec.ts        (Builder-3)
│   │   └── game-over.spec.ts          (Builder-3)
│   ├── helpers/
│   │   └── game-helpers.ts            (Builder-1)
│   └── fixtures/
│       └── test-data.ts               (Builder-1)
├── playwright.config.ts               (Builder-1)
└── .github/
    └── workflows/
        └── e2e-tests.yml              (Builder-3)
```

### Conflict Resolution

**No conflicts expected** - each builder works on isolated files.

**If conflicts occur:**
1. Test helpers are shared - Builder-1 completes first
2. Playwright config is owned by Builder-1 - Builder-3 references it
3. Visual tests use same helpers - Builder-3 waits for Builder-1 completion

## Deployment Plan

### Local Deployment (Developer Testing)

1. **Prerequisites:**
   - Dev server running (`npm run dev`)
   - Database initialized (`npm run db:migrate`)
   - Playwright installed (`npx playwright install`)

2. **Run Fast Tests:**
   ```bash
   npx playwright test tests/e2e/0[1-8]*.spec.ts
   ```
   Expected: <5 minutes, all pass

3. **Run Slow Tests:**
   ```bash
   npx playwright test tests/e2e/0[9]*.spec.ts tests/e2e/1[0-1]*.spec.ts
   ```
   Expected: ~15 minutes, all pass

4. **Run Visual Tests:**
   ```bash
   npx playwright test tests/visual/
   ```
   Expected: <5 minutes, baseline screenshots captured

5. **View Report:**
   ```bash
   npx playwright show-report
   ```

### CI/CD Deployment (GitHub Actions)

1. **Trigger:** On push to `main` or pull request

2. **Workflow Steps:**
   - Checkout code
   - Setup Node.js 20
   - Install dependencies
   - Setup PostgreSQL test database
   - Install Playwright browsers (Chromium only)
   - Run fast tests (on all PRs)
   - Run slow tests (on main branch only)
   - Upload artifacts (screenshots, videos, HTML report)

3. **Success Criteria:**
   - Green checkmark in GitHub Actions
   - Test report accessible via artifacts
   - Screenshots available on failure

4. **Failure Handling:**
   - Screenshots auto-captured on test failure
   - Video recordings available for slow tests
   - Playwright trace viewer link in report

## Acceptance Criteria

### Builder-1 Completion
- [ ] `playwright.config.ts` created with proper timeouts and parallelization
- [ ] `tests/helpers/game-helpers.ts` implemented with 8 functions
- [ ] All 8 fast tests written and passing locally
- [ ] Fast test suite runs in <5 minutes
- [ ] Test helpers documented with JSDoc comments

### Builder-2 Completion
- [ ] Test 09 (messages) written and passing
- [ ] Test 10 (full game) written and passing
- [ ] Test 11 (game over) written and passing
- [ ] Slow test suite runs in <20 minutes
- [ ] Broad assertions handle AI variability

### Builder-3 Completion
- [ ] 7 baseline screenshots captured in `tests/visual/screenshots/`
- [ ] Visual regression tests written
- [ ] `.github/workflows/e2e-tests.yml` configured
- [ ] CI/CD pipeline runs successfully on test PR

### Integration Completion
- [ ] Full test suite runs without conflicts
- [ ] `npm run test:e2e` runs all tests
- [ ] Test report shows 11 passing tests

### Validation Completion
- [ ] 3 consecutive test runs, 100% pass rate
- [ ] Zero flakiness detected
- [ ] Test coverage documented at 92%
- [ ] All acceptance criteria met

---

**Plan Created:** 2025-10-13
**Iteration:** 7 (Global), 3 (Local within Plan 2)
**Estimated Completion:** 20-24 hours wall time
**Risk Level:** Medium (manageable with proper timeouts and retry logic)
**Confidence:** 80% (high confidence in test infrastructure, medium confidence in avoiding flakiness)
