# Iteration 7 Vision: E2E Testing & Polish

**Global Iteration:** 7
**Local Iteration:** 3 of 3
**Plan:** plan-2 (AI Mafia - Full Transparency Frontend & Critical Fixes)

## Mission

Validate everything works: write comprehensive Playwright E2E tests, add visual regression testing, ensure CI/CD pipeline ready.

## Vision Statement

Validate all features work correctly via automated Playwright E2E tests, prevent regressions with visual testing, ensure production readiness.

## Prerequisites

- ✅ Iteration 1 complete: SSE working, timer synced, messages appearing
- ✅ Iteration 2 complete: Transparency features implemented (roles, Mafia chat, enhanced UI)

## Success Criteria

1. **Playwright Tests Pass**
   - Metric: All E2E tests pass on localhost
   - Target: 100% pass rate
   - Validation: `npm run test:e2e` exits with code 0

2. **Test Coverage Comprehensive**
   - Metric: All critical paths covered (lobby → game → messages → phases → votes → results)
   - Target: 11 test scenarios implemented
   - Validation: Test report shows 11 passing tests

3. **Tests Are Stable**
   - Metric: No flaky tests (tests pass consistently)
   - Target: 3 consecutive runs, all tests pass
   - Validation: Run test suite 3 times, zero failures

4. **CI/CD Pipeline Ready**
   - Metric: Tests run in GitHub Actions
   - Target: Workflow configured and passing
   - Validation: GitHub Actions shows green checkmark

5. **Visual Regression Tests Capture Screenshots**
   - Metric: Screenshots exist for key screens
   - Target: 5+ screenshots stored
   - Validation: Check `tests/visual/screenshots/` directory

## Out of Scope

- Load testing - Not needed for local dev
- Security testing - Post-MVP
- Mobile testing - Desktop-first
- Cross-browser testing (beyond Chrome) - Can add Firefox/Safari later

---

**Note:** This is the final iteration of Plan 2. Upon completion, the AI Mafia game will be fully transparent, stable, and validated with comprehensive E2E tests.
