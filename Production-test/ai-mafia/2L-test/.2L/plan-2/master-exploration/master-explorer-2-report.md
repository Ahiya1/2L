# Master Exploration Report

## Explorer ID
master-explorer-2

## Focus Area
Testing Strategy & Dependencies Analysis

## Vision Summary
Fix critical frontend issues (SSE completely broken, messages not appearing, timer resets, Pino crashes) and add full transparency features (Mafia chat visibility, role display) with comprehensive Playwright E2E testing for validation.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 12 must-have features (5 critical fixes + 5 transparency + 2 testing)
- **User stories/acceptance criteria:** 70+ individual criteria across all features
- **Estimated total work:** 25-35 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **15+ distinct features** with complex interdependencies (SSE → logging → timer → messages)
- **Critical frontend debugging** required (SSE, timer sync, message display) with no existing tests
- **Playwright E2E testing infrastructure** must be built from scratch (11 test scenarios)
- **Real-time system complexity** (SSE, event emitters, WebSocket-like patterns)
- **Logging migration decision** (Pino vs console.log vs Winston) with production stability implications
- **Cannot break Iteration 4 backend** (strict backward compatibility constraint)

---

## Dependency Analysis

### Current System State (Post-Iteration 4)

#### Backend Dependencies (STABLE - Must Preserve)
From iteration 4 validation report, the backend is **FUNCTIONAL** with 44 messages generated:

**Critical Backend Components (DO NOT MODIFY):**
1. **Master Orchestrator** (`src/lib/game/master-orchestrator.ts`)
   - Status: WORKING (Iteration 4 healing successful)
   - Dependencies: 14 structured logging calls (Pino)
   - Risk: HIGH if logging changes affect this file
   - Constraint: Zero console.log statements (must maintain)

2. **Discussion Phase** (`src/lib/discussion/orchestrator.ts`, `turn-executor.ts`)
   - Status: WORKING (wrapper function fix validated)
   - Dependencies: Agent context builder, Claude API client
   - Risk: MEDIUM (SSE changes could affect event emission)
   - Constraint: buildAgentContextWrapper signature must not change

3. **Database Layer** (`prisma/schema.prisma`)
   - Status: STABLE (PostgreSQL via Supabase Local)
   - Dependencies: Prisma client, migrations
   - Risk: LOW (no schema changes needed)
   - Constraint: Maintain compatibility with existing tables

4. **Claude API Integration** (`src/lib/claude/client.ts`)
   - Status: WORKING (47 tests passing, 100% coverage)
   - Dependencies: @anthropic-ai/sdk, cost-tracker
   - Risk: LOW (no changes needed)
   - Constraint: Cost tracking must continue working

#### Frontend Dependencies (BROKEN - Must Fix)

**1. Server-Sent Events (SSE) System**

**Current State:** BROKEN
- File: `app/api/game/[gameId]/stream/route.ts`
- Status: Endpoint exists but not delivering events
- Dependencies:
  - Event emitter: `src/lib/events/emitter.ts` (singleton, 50 max listeners)
  - Event types: `src/lib/events/types.ts` (GameEvent interface)
  - Context: `contexts/GameEventsContext.tsx` (React EventSource wrapper)
- Event types subscribed: message, turn_start, turn_end, phase_change, phase_complete, discussion_complete
- Keepalive: 15-second heartbeat
- Reconnection: Exponential backoff (5 max retries → polling fallback)

**Root Cause Analysis:**
- Vision states: "SSE completely broken - No real-time updates"
- Iteration 4 focused on backend only (orchestrator, API, DB)
- Frontend SSE client (`GameEventsContext.tsx`) exists but likely never tested
- Possible issues:
  1. Event emitter not firing events from backend
  2. SSE response headers incorrect
  3. Frontend EventSource not connecting
  4. Logging crashes interrupting SSE connections (Pino worker thread exits)

**2. Logging System (CRITICAL BLOCKER)**

**Current State:** CRASHING
- File: `src/lib/logger.ts`
- Implementation: Pino with pino-pretty transport (development mode)
- Vision problem: "Worker thread exits causing server instability and broken SSE connections"
- Dependencies:
  - pino: v10.0.0 (production dependency)
  - pino-pretty: v13.1.2 (development dependency)
  - Transport: pino-pretty with colorize, translateTime, ignore pid/hostname
- Usage: 14 structured logging calls in master-orchestrator.ts alone
- Child loggers: discussionLogger, gameLogger, claudeLogger, dbLogger, orchestratorLogger, agentLogger, votingLogger, nightLogger

**Risk Assessment:**
- **HIGH RISK:** Pino is deeply integrated (14 calls in orchestrator, more across codebase)
- **CRITICAL:** Iteration 4 explicitly removed all console.log (12 replacements)
- **BLOCKER:** If Pino crashes, SSE connections break (no server events)

**3. Frontend Component Dependencies**

**Existing Components (Need Testing):**
- `components/GameEventsContext.tsx` - SSE connection provider
- `components/PhaseIndicator.tsx` - Phase display with timer
- `components/PlayerGrid.tsx` - Player cards
- `components/DiscussionFeed.tsx` - Message display
- `components/VoteTally.tsx` - Vote display
- `components/ConnectionStatus.tsx` - SSE status indicator
- `components/CostMetrics.tsx` - Cost tracking display
- `app/game/[gameId]/page.tsx` - Main game page

**UI Framework Stack:**
- Next.js 14 App Router
- React 18 (Server + Client Components)
- Tailwind CSS
- TypeScript (strict mode, 0 errors post-iteration 4)

**4. Test Infrastructure**

**Current State:** MINIMAL (Backend only)
- Vitest: Installed and configured
- Test count: 47 tests (cost-tracker, claude client)
- Coverage: 89.47% on critical paths (backend only)
- Frontend tests: ZERO
- E2E tests: ZERO
- Playwright: NOT INSTALLED

**Test Dependencies Needed:**
- @playwright/test (E2E testing framework)
- Browser automation (Chromium, Firefox, WebKit)
- MCP integration: Playwright MCP (already available per vision)
- Test environment: localhost:3001 dev server + Supabase Local

### Dependency Chain Map

```
Critical Path: Fix Logging → Fix SSE → Fix Timer → Test Everything

1. LOGGING SYSTEM (FOUNDATION)
   ├── Pino (current, crashing)
   ├── console.log (simple, stable, temporary)
   └── Winston (alternative, more complex)
   ↓
2. SSE SYSTEM (DEPENDS ON STABLE LOGGING)
   ├── SSE Endpoint (route.ts)
   ├── Event Emitter (emitter.ts)
   ├── Game Events Context (GameEventsContext.tsx)
   └── Backend Event Emission (orchestrator, discussion, voting)
   ↓
3. FRONTEND COMPONENTS (DEPEND ON SSE)
   ├── PhaseIndicator (timer sync depends on SSE phase events)
   ├── DiscussionFeed (messages depend on SSE message events)
   ├── VoteTally (votes depend on SSE vote events)
   └── PlayerGrid (eliminations depend on SSE player events)
   ↓
4. TESTING INFRASTRUCTURE (VALIDATES ALL ABOVE)
   ├── Playwright E2E setup
   ├── Test scenarios (11 critical tests)
   └── CI/CD integration

Parallel Path: Transparency Features (INDEPENDENT of SSE fixes)
5. TRANSPARENCY FEATURES
   ├── Role display (read from existing Player.role field)
   ├── Mafia chat display (read from existing NightMessage table)
   ├── Enhanced phase visualization (styling only)
   └── Role-colored player cards (styling only)
```

### External Dependencies

**Third-Party Services:**
1. Supabase Local (PostgreSQL database)
   - Status: STABLE (iteration 4 validated)
   - Port: 54322
   - Migration: 100% data integrity confirmed

2. Claude API (Anthropic)
   - Status: WORKING (44 messages generated)
   - Cost tracking: Functional
   - Cache hit rate: Target >70%

3. Playwright MCP (Testing)
   - Status: AVAILABLE (per vision)
   - Integration: TBD
   - Chrome DevTools MCP: Also available

**NPM Dependencies:**
- Total dependencies: 32 (production) + 26 (dev) = 58 packages
- Key packages:
  - next: 14.2.18 (stable)
  - react: 18 (stable)
  - prisma: 6.17.1 (stable)
  - @anthropic-ai/sdk: 0.65.0 (stable)
  - vitest: 1.6.1 (stable)
  - pino: 10.0.0 (PROBLEMATIC)
  - pino-pretty: 13.1.2 (PROBLEMATIC)

---

## Risk Assessment

### High Risks

**Risk 1: Logging Migration Breaking Backend**
- **Description:** Changing Pino to console.log or Winston could break 14+ logging calls in orchestrator
- **Impact:** Master orchestrator crashes, no games can run (CATASTROPHIC)
- **Likelihood:** MEDIUM (if not careful with refactoring)
- **Mitigation Strategy:**
  1. Option A (RECOMMENDED): Fix Pino configuration (remove pino-pretty in production)
  2. Option B: Create logger abstraction layer (logger.info() → console.log or Pino)
  3. Option C: Gradual migration (test each file individually)
  4. ALL OPTIONS: Preserve existing logger.info/error/warn/debug signature
- **Testing:** Run full game after any logging changes to validate backend stability
- **Recommendation:** Start with Option A (Pino config fix), fallback to Option B if crashes persist

**Risk 2: SSE Implementation Complexity**
- **Description:** SSE is inherently tricky (browser compatibility, reconnection, keepalive)
- **Impact:** Real-time updates don't work, timer resets, messages delayed (HIGH)
- **Likelihood:** MEDIUM (no existing tests to validate current state)
- **Mitigation Strategy:**
  1. Test SSE endpoint manually first (curl + curl -N for streaming)
  2. Add extensive SSE debugging logs (connection open, message sent, error)
  3. Validate event emitter firing events (test-sse.ts already exists)
  4. Implement polling fallback (already in GameEventsContext, line 96-128)
  5. Test in multiple browsers (Chrome, Firefox, Safari)
- **Testing:** Playwright E2E test specifically for SSE connection + message delivery
- **Recommendation:** Add SSE connection test as FIRST E2E test (validates foundation)

**Risk 3: Playwright Test Flakiness**
- **Description:** E2E tests are notoriously flaky (timing, async, race conditions)
- **Impact:** Tests fail randomly, CI/CD unreliable (MEDIUM)
- **Likelihood:** HIGH (11 tests with real-time updates = high flakiness potential)
- **Mitigation Strategy:**
  1. Use Playwright's built-in waiting mechanisms (waitForSelector, waitForTimeout)
  2. Increase timeouts for SSE message arrival (2-5 seconds per message)
  3. Add retry logic for flaky assertions (3 retries max)
  4. Use data-testid attributes for stable selectors (not CSS classes)
  5. Mock Claude API for E2E tests (use test doubles, not real API)
- **Testing:** Run each E2E test 10 times to identify flakiness patterns
- **Recommendation:** Start with 3-5 critical tests, expand after stability confirmed

### Medium Risks

**Risk 4: Timer Synchronization Edge Cases**
- **Description:** Timer sync requires server state + client calculation (complex)
- **Impact:** Timer shows wrong value, resets on refresh (MEDIUM)
- **Likelihood:** MEDIUM (depends on SSE working correctly)
- **Mitigation Strategy:**
  1. Use server-provided phaseEndTime (not client-side timer)
  2. Calculate remaining time: phaseEndTime - Date.now()
  3. Update every second, but recalculate from server time
  4. Fetch fresh phase state on component mount (already in GameEventsContext)
- **Testing:** Playwright test: Refresh page mid-phase, verify timer continues from correct time
- **Recommendation:** Build timer sync test AFTER SSE is working

**Risk 5: Mafia Chat Data Privacy**
- **Description:** Mafia chat should only be visible to spectators, not logged publicly
- **Impact:** Privacy leak if Mafia messages appear in wrong context (LOW for spectator-only game)
- **Likelihood:** LOW (no security concern for AI-only game)
- **Mitigation Strategy:**
  1. Query NightMessage table separately from DiscussionMessage
  2. Add UI toggle/panel for Mafia chat (only show during Night phase)
  3. Validate schema: NightMessage.isPrivate flag exists
- **Testing:** Manual verification (no E2E test needed)
- **Recommendation:** Low priority, handle in transparency features iteration

### Low Risks

**Risk 6: Playwright MCP Integration**
- **Description:** Playwright MCP may have learning curve or setup issues
- **Impact:** E2E tests harder to write (LOW - can use standard Playwright if needed)
- **Likelihood:** LOW (Playwright MCP is mature, well-documented)
- **Mitigation Strategy:** Start with standard Playwright, add MCP integration if beneficial
- **Testing:** N/A
- **Recommendation:** Defer MCP complexity unless clear benefit emerges

**Risk 7: Visual Regression Testing Complexity**
- **Description:** Screenshot-based testing is complex (pixel differences, font rendering)
- **Impact:** Tests fail due to irrelevant visual changes (LOW)
- **Likelihood:** MEDIUM (listed as "LOW priority" in vision)
- **Mitigation Strategy:** Defer to future iteration (not required for MVP)
- **Testing:** N/A
- **Recommendation:** Skip visual regression for plan-2 (focus on functional tests)

---

## Testing Strategy

### Testing Priorities (Ordered by Dependency)

**Phase 1: Foundation Testing (Before E2E)**
1. **Logging System Validation** (Manual)
   - Start dev server with LOG_LEVEL=debug
   - Trigger game start
   - Verify no worker crashes
   - Verify SSE connection stays alive 10+ minutes
   - Expected: Zero "worker has exited" errors

2. **SSE Endpoint Testing** (Manual + Basic Automation)
   - Test 1: `curl http://localhost:3001/api/game/{gameId}/stream` (should stream)
   - Test 2: `node src/test-sse.ts` (verify event emitter works)
   - Test 3: Open game page in browser, check Network tab for SSE connection
   - Expected: SSE connection status = "Connected" (green indicator)

3. **Backend Event Emission** (Backend Integration Test)
   - Use existing `src/cli/test-full-game.ts` or create new test
   - Start game programmatically
   - Monitor event emitter for phase_change, message, vote events
   - Expected: Events fired for each game action

**Phase 2: Playwright E2E Tests (Critical Path)**

**Test Environment Setup:**
- Dev server: `npm run dev` on port 3001
- Database: Supabase Local running
- API key: Mock Claude API responses (use test doubles)
- Browser: Chromium (primary), Firefox (secondary), WebKit (optional)

**Critical Test Scenarios (11 tests from vision):**

**Test 1: Lobby & Game Creation** (2-3 minutes)
```typescript
test('Lobby loads and game can be created', async ({ page }) => {
  await page.goto('http://localhost:3001/');
  await expect(page.locator('h1')).toContainText('AI Mafia');

  // Select player count
  await page.locator('input[type="range"]').fill('10');

  // Create game
  await page.click('button:has-text("Start Game")');

  // Verify navigation to game page
  await page.waitForURL('**/game/**');
  await expect(page.locator('[data-testid="game-page"]')).toBeVisible();
});
```

**Test 2: Game Page Loads with Player Grid** (1-2 minutes)
```typescript
test('Game page loads and shows player grid', async ({ page }) => {
  const gameId = await createTestGame(); // Helper function

  await page.goto(`http://localhost:3001/game/${gameId}`);

  // Verify player grid
  await expect(page.locator('[data-testid="player-grid"]')).toBeVisible();
  await expect(page.locator('[data-testid="player-card"]')).toHaveCount(10);

  // Verify phase indicator
  await expect(page.locator('[data-testid="phase-indicator"]')).toContainText('LOBBY');
});
```

**Test 3: SSE Connection Status Indicator** (CRITICAL - 2-3 minutes)
```typescript
test('SSE connection status indicator shows connected', async ({ page }) => {
  const gameId = await createTestGame();

  await page.goto(`http://localhost:3001/game/${gameId}`);

  // Wait for SSE connection
  await page.waitForTimeout(2000);

  // Verify connection status
  const status = page.locator('[data-testid="connection-status"]');
  await expect(status).toContainText('Connected');
  await expect(status).toHaveClass(/.*connected.*/); // Green indicator
});
```

**Test 4: Messages Appear in Discussion Feed** (CRITICAL - 10-15 minutes)
```typescript
test('Messages appear in discussion feed during game', async ({ page }) => {
  const gameId = await createTestGame();
  await startTestGame(gameId); // Triggers game start API

  await page.goto(`http://localhost:3001/game/${gameId}`);

  // Wait for phase change to DISCUSSION
  await page.waitForSelector('[data-testid="phase-indicator"]:has-text("DISCUSSION")', {
    timeout: 60000 // 1 minute for Night + Day phases
  });

  // Wait for first message (SSE delivery)
  await page.waitForSelector('[data-testid="message-item"]', {
    timeout: 30000 // 30 seconds for first message
  });

  // Wait 5 minutes for discussion phase
  await page.waitForTimeout(300000);

  // Verify message count
  const messages = page.locator('[data-testid="message-item"]');
  const count = await messages.count();

  expect(count).toBeGreaterThan(40); // Vision target: 40+ messages
});
```

**Test 5: Phase Changes Reflected in UI** (5-7 minutes)
```typescript
test('Phase changes are reflected in UI', async ({ page }) => {
  const gameId = await createTestGame();
  await startTestGame(gameId);

  await page.goto(`http://localhost:3001/game/${gameId}`);

  // Verify phase progression
  await expect(page.locator('[data-testid="phase-indicator"]')).toContainText('NIGHT');

  await page.waitForSelector('[data-testid="phase-indicator"]:has-text("DAY_ANNOUNCEMENT")', {
    timeout: 60000
  });

  await expect(page.locator('[data-testid="phase-indicator"]')).toContainText('DAY_ANNOUNCEMENT');

  await page.waitForSelector('[data-testid="phase-indicator"]:has-text("DISCUSSION")', {
    timeout: 30000
  });

  await expect(page.locator('[data-testid="phase-indicator"]')).toContainText('DISCUSSION');
});
```

**Test 6: Vote Tally Displays Correctly** (3-5 minutes)
```typescript
test('Vote tally displays correctly', async ({ page }) => {
  const gameId = await createTestGame();
  await startTestGame(gameId);

  await page.goto(`http://localhost:3001/game/${gameId}`);

  // Wait for VOTING phase
  await page.waitForSelector('[data-testid="phase-indicator"]:has-text("VOTING")', {
    timeout: 600000 // 10 minutes max
  });

  // Verify vote tally panel visible
  await expect(page.locator('[data-testid="vote-tally"]')).toBeVisible();

  // Wait for votes to appear (SSE)
  await page.waitForSelector('[data-testid="vote-item"]', {
    timeout: 60000
  });

  // Verify vote count
  const votes = page.locator('[data-testid="vote-item"]');
  const count = await votes.count();

  expect(count).toBeGreaterThan(0);
});
```

**Test 7: Timer Countdown Works** (2-3 minutes)
```typescript
test('Timer countdown works', async ({ page }) => {
  const gameId = await createTestGame();
  await startTestGame(gameId);

  await page.goto(`http://localhost:3001/game/${gameId}`);

  // Wait for DISCUSSION phase (has timer)
  await page.waitForSelector('[data-testid="phase-indicator"]:has-text("DISCUSSION")');

  // Get initial timer value
  const timer1 = await page.locator('[data-testid="phase-timer"]').textContent();
  const time1 = parseTimeString(timer1); // e.g., "4:55" → 295 seconds

  // Wait 5 seconds
  await page.waitForTimeout(5000);

  // Get updated timer value
  const timer2 = await page.locator('[data-testid="phase-timer"]').textContent();
  const time2 = parseTimeString(timer2);

  // Verify timer decreased by ~5 seconds (±2 seconds tolerance)
  expect(time1 - time2).toBeGreaterThanOrEqual(3);
  expect(time1 - time2).toBeLessThanOrEqual(7);
});
```

**Test 8: Timer Syncs on Refresh** (CRITICAL - 3-4 minutes)
```typescript
test('Refreshing page shows same time remaining (syncs with server)', async ({ page }) => {
  const gameId = await createTestGame();
  await startTestGame(gameId);

  await page.goto(`http://localhost:3001/game/${gameId}`);

  // Wait for DISCUSSION phase
  await page.waitForSelector('[data-testid="phase-indicator"]:has-text("DISCUSSION")');

  // Get timer value before refresh
  const timer1 = await page.locator('[data-testid="phase-timer"]').textContent();
  const time1 = parseTimeString(timer1);

  // Refresh page
  await page.reload();

  // Get timer value after refresh
  const timer2 = await page.locator('[data-testid="phase-timer"]').textContent();
  const time2 = parseTimeString(timer2);

  // Timer should be within 5 seconds of previous value (accounting for reload time)
  expect(Math.abs(time1 - time2)).toBeLessThanOrEqual(5);
});
```

**Test 9: Game Over Screen Shows Results** (15-20 minutes - LONG TEST)
```typescript
test.slow('Game over screen shows final results and roles', async ({ page }) => {
  const gameId = await createTestGame();
  await startTestGame(gameId);

  await page.goto(`http://localhost:3001/game/${gameId}`);

  // Wait for game to complete (could be 10-20 minutes)
  await page.waitForSelector('[data-testid="game-over-banner"]', {
    timeout: 1200000 // 20 minutes max
  });

  // Navigate to results page
  await page.click('a[href*="/results"]');

  // Verify results page
  await expect(page.locator('h1')).toContainText('Game Over');
  await expect(page.locator('[data-testid="winner-announcement"]')).toBeVisible();
  await expect(page.locator('[data-testid="role-reveal"]')).toHaveCount(10); // All player roles
});
```

**Test 10: Lobby → Game → Results (E2E Flow)** (20-25 minutes - VERY LONG)
```typescript
test.slow('Complete flow: Lobby → Game → Results', async ({ page }) => {
  // Create game from lobby
  await page.goto('http://localhost:3001/');
  await page.locator('input[type="range"]').fill('10');
  await page.click('button:has-text("Start Game")');

  // Extract gameId from URL
  await page.waitForURL('**/game/**');
  const url = page.url();
  const gameId = url.match(/game\/([^\/]+)/)[1];

  // Wait for game to complete
  await page.waitForSelector('[data-testid="game-over-banner"]', {
    timeout: 1200000
  });

  // Navigate to results
  await page.click('a[href*="/results"]');

  // Verify complete game data
  await expect(page.locator('[data-testid="winner-announcement"]')).toBeVisible();
  await expect(page.locator('[data-testid="message-transcript"]')).toContainText('Round 1');
});
```

**Test 11: SSE Reconnection After Disconnect** (3-5 minutes)
```typescript
test('SSE reconnects after connection drop', async ({ page, context }) => {
  const gameId = await createTestGame();

  await page.goto(`http://localhost:3001/game/${gameId}`);

  // Verify initial connection
  await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

  // Simulate network disconnect (close SSE connection)
  await context.setOffline(true);

  // Verify disconnected status
  await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');

  // Restore network
  await context.setOffline(false);

  // Verify reconnection (exponential backoff: 1s, 2s, 4s...)
  await page.waitForSelector('[data-testid="connection-status"]:has-text("Connected")', {
    timeout: 15000 // Max 15 seconds for reconnect
  });

  await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
});
```

**Test Execution Strategy:**
- **Fast tests first:** Tests 1-3, 6-8 (2-5 minutes each) → ~20 minutes total
- **Slow tests separate:** Tests 4, 9-10 (10-25 minutes each) → Mark with test.slow()
- **CI/CD:** Run fast tests on every PR, slow tests nightly or on deploy
- **Parallel execution:** Run tests 1-3 in parallel (independent), tests 4-10 sequential (game state dependent)

**Mock Strategy:**
- **Mock Claude API:** Use test doubles for generateAgentResponse (instant responses)
- **Benefit:** Reduces test time from 20 minutes to 2-3 minutes
- **Trade-off:** Doesn't test real API integration
- **Recommendation:** Fast tests use mocks, 1-2 slow tests use real API

**Phase 3: Visual Regression (DEFERRED)**
- Vision states: "Priority: LOW"
- Recommendation: Skip for plan-2 (defer to plan-3)
- Rationale: Focus on functional correctness first, visual polish later

### Test Coverage Targets

**Frontend Coverage (New):**
- Target: >70% coverage on frontend components
- Priority components:
  1. GameEventsContext.tsx (SSE connection logic) - 90%+
  2. PhaseIndicator.tsx (timer sync) - 80%+
  3. DiscussionFeed.tsx (message display) - 70%+
  4. VoteTally.tsx (vote display) - 70%+

**Backend Coverage (Maintain):**
- Current: 89.47% on critical paths (iteration 4)
- Target: Maintain >80% (no regression)
- Critical: Do NOT break existing 47 tests

**E2E Coverage:**
- Target: 11 critical scenarios (100% of vision requirements)
- Actual: Start with 8 fast tests (tests 1-8), expand to 11 if time allows
- CI/CD: 8 fast tests (~30 minutes total) on every PR

---

## Testing Infrastructure Recommendations

### Playwright Setup

**Installation:**
```bash
npm install --save-dev @playwright/test
npx playwright install chromium firefox webkit
```

**Configuration:** `playwright.config.ts`
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000, // 1 minute per test (except slow tests)
  retries: 2, // Retry flaky tests
  workers: 1, // Sequential execution (game state dependencies)

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'npm run dev',
    port: 3001,
    timeout: 120000, // 2 minutes for server start
    reuseExistingServer: !process.env.CI,
  },
});
```

**Test Structure:**
```
app/
├── tests/
│   ├── e2e/
│   │   ├── setup.ts (helper functions: createTestGame, startTestGame)
│   │   ├── 01-lobby.spec.ts (Test 1-2)
│   │   ├── 02-sse-connection.spec.ts (Test 3, 11)
│   │   ├── 03-discussion-phase.spec.ts (Test 4)
│   │   ├── 04-phase-changes.spec.ts (Test 5)
│   │   ├── 05-voting-phase.spec.ts (Test 6)
│   │   ├── 06-timer-sync.spec.ts (Test 7-8)
│   │   ├── 07-game-over.spec.ts (Test 9)
│   │   └── 08-full-flow.spec.ts (Test 10)
│   └── unit/
│       └── (existing vitest tests)
└── package.json (add "test:e2e": "playwright test")
```

**Helper Functions:** `tests/e2e/setup.ts`
```typescript
import { request } from '@playwright/test';

export async function createTestGame(playerCount = 10): Promise<string> {
  const context = await request.newContext({
    baseURL: 'http://localhost:3001',
  });

  const response = await context.post('/api/game/create', {
    data: { playerCount },
  });

  const data = await response.json();
  return data.gameId;
}

export async function startTestGame(gameId: string): Promise<void> {
  const context = await request.newContext({
    baseURL: 'http://localhost:3001',
  });

  await context.post(`/api/game/${gameId}/start`);
}

export function parseTimeString(time: string): number {
  // "4:55" → 295 seconds
  const [minutes, seconds] = time.split(':').map(Number);
  return minutes * 60 + seconds;
}
```

### CI/CD Integration (Optional)

**GitHub Actions:** `.github/workflows/e2e-tests.yml`
```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Setup Supabase Local
        run: |
          npx supabase start
          npx prisma migrate deploy

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Logging Solution Analysis & Recommendation

### Option A: Fix Pino Configuration (RECOMMENDED)

**Diagnosis:** Pino crashes due to pino-pretty worker thread issues in production-like environments.

**Solution:**
```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  // REMOVE pino-pretty transport (causes worker crashes)
  // Use basic pino output (JSON logs) or conditional transport
  ...(process.env.NODE_ENV === 'development' && process.env.USE_PRETTY_LOGS === 'true' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    }
  } : {}),
});
```

**Changes:**
1. Only use pino-pretty if explicitly enabled via `USE_PRETTY_LOGS=true`
2. Default: JSON structured logs (no transport, no worker threads)
3. Preserves all existing logger.info/error/warn/debug calls (NO CODE CHANGES)

**Pros:**
- Minimal change (5 lines modified)
- Preserves all 14+ structured logging calls
- No refactoring needed
- Maintains compatibility with iteration 4 code
- Still get structured logs (just JSON instead of pretty)

**Cons:**
- JSON logs less human-readable in development
- Developers must enable pretty logs manually if desired

**Testing:**
1. Start dev server without USE_PRETTY_LOGS: `npm run dev`
2. Start game: `curl -X POST http://localhost:3001/api/game/{gameId}/start`
3. Monitor logs for 10 minutes
4. Expected: Zero "worker has exited" errors

**Risk:** LOW (well-tested Pino pattern)

---

### Option B: Abstract Logger Interface (FALLBACK)

**Description:** Create logger abstraction that can switch between Pino, console.log, Winston.

**Solution:**
```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (obj: any, msg?: string) => void;
  info: (obj: any, msg?: string) => void;
  warn: (obj: any, msg?: string) => void;
  error: (obj: any, msg?: string) => void;
  child: (bindings: any) => Logger;
}

class ConsoleLogger implements Logger {
  private bindings: any = {};

  constructor(bindings: any = {}) {
    this.bindings = bindings;
  }

  debug(obj: any, msg?: string) {
    console.log('[DEBUG]', this.bindings, obj, msg);
  }

  info(obj: any, msg?: string) {
    console.log('[INFO]', this.bindings, obj, msg);
  }

  warn(obj: any, msg?: string) {
    console.warn('[WARN]', this.bindings, obj, msg);
  }

  error(obj: any, msg?: string) {
    console.error('[ERROR]', this.bindings, obj, msg);
  }

  child(bindings: any): Logger {
    return new ConsoleLogger({ ...this.bindings, ...bindings });
  }
}

// Switch based on environment
export const logger: Logger = process.env.USE_CONSOLE_LOGGER === 'true'
  ? new ConsoleLogger()
  : pino({ /* existing config */ });

// Preserve child loggers
export const discussionLogger = logger.child({ module: 'discussion' });
export const gameLogger = logger.child({ module: 'game' });
// ... etc.
```

**Pros:**
- Can switch between Pino and console.log without code changes
- Fallback if Pino continues crashing
- Maintains existing API (logger.info, logger.error, etc.)

**Cons:**
- More code to maintain (Logger interface, ConsoleLogger implementation)
- Adds complexity
- Still need to test both implementations

**Risk:** MEDIUM (new abstraction layer could introduce bugs)

**When to use:** Only if Option A fails (Pino still crashes after config fix)

---

### Option C: Revert to console.log (NOT RECOMMENDED)

**Description:** Replace all logger.info/error calls with console.log/error.

**Pros:**
- Simplest solution
- Zero crashes (console.log never fails)

**Cons:**
- **HIGH RISK:** Must change 14+ files (every logger call)
- Loses structured logging (no context objects)
- Violates iteration 4 success criterion (zero console.log statements)
- Large refactoring (could break backend)

**Recommendation:** AVOID unless Option A and B both fail

---

### Recommended Logging Solution

**Decision: Option A (Fix Pino Configuration)**

**Rationale:**
1. Minimal change (5 lines, 1 file)
2. Preserves iteration 4 work (no console.log regression)
3. Maintains structured logging
4. Low risk (well-tested pattern)
5. Fast to implement (30 minutes)

**Fallback: Option B (Logger Abstraction)** if Pino continues crashing after config fix.

**Testing Priority:** Test Option A fix BEFORE any other work (foundation for SSE stability)

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 iterations)

**Complexity: COMPLEX**
- 15+ features with critical dependencies (logging → SSE → timer → testing)
- Playwright infrastructure must be built from scratch
- SSE debugging requires careful investigation
- Cannot break iteration 4 backend code (strict constraint)

**Rationale:**
- **Too complex for single iteration:** 25-35 hours estimated
- **Natural separation:** Fixes vs transparency vs testing
- **Risk mitigation:** Validate fixes work before adding features
- **Dependency chain:** Logging → SSE → timer (must be sequential)

---

### Iteration 1: Critical Fixes (Logging, SSE, Timer)

**Vision:** Fix the foundation - stable logging, working SSE, synced timer. Make real-time updates actually work.

**Scope:**
- Feature 1: Fix logging system (Pino config fix)
- Feature 2: Fix SSE endpoint (event delivery)
- Feature 3: Fix timer synchronization (server-based calculation)
- Feature 4: Verify message display (40+ messages appear)
- Feature 5: Fix API endpoints (all routes return correct data)

**Estimated Duration:** 12-16 hours

**Risk Level:** HIGH (critical debugging, no existing tests)

**Success Criteria:**
- SSE connection stays alive 10+ minutes (no crashes)
- Messages appear in real-time (40+ during discussion)
- Timer syncs on refresh (within 2 seconds tolerance)
- All API endpoints return 200 OK
- Zero "worker has exited" errors
- Iteration 4 backend still works (47 tests passing)

**Dependencies:** None (this is the foundation)

**Why First:**
- MUST fix logging before SSE will work
- MUST fix SSE before timer/messages will update
- MUST validate fixes work before building on top

---

### Iteration 2: Transparency Features

**Vision:** Make the game fascinating to watch - show Mafia strategy, role distribution, enhanced visualizations.

**Scope:**
- Feature 6: Display player roles from start
- Feature 7: Show Mafia private Night chat
- Feature 8: Enhanced phase visualization
- Feature 9: Role-colored player cards
- Feature 10: Enhanced vote visualization

**Dependencies:**
- **Requires:** Iteration 1 SSE fixes (transparency features use real-time updates)
- **Imports:** Working SSE connection, GameEventsContext, API endpoints

**Estimated Duration:** 8-12 hours

**Risk Level:** MEDIUM (mostly frontend styling, data already exists)

**Success Criteria:**
- Roles visible immediately when game starts
- Mafia chat panel shows during Night phase
- Phase banner with icons (Night=moon, Day=sun, etc.)
- Player cards have red borders (Mafia) or blue (Villagers)
- Vote tally shows real-time updates with justifications

**Why Second:**
- Depends on SSE working (iteration 1)
- Independent features (can parallelize builders)
- Lower risk (styling changes, not core logic)

---

### Iteration 3: Playwright Testing & Validation

**Vision:** Prevent regressions with comprehensive E2E tests. Validate all fixes and features work end-to-end.

**Scope:**
- Feature 11: Playwright E2E tests (11 scenarios)
- Feature 12: Visual regression testing (OPTIONAL/LOW PRIORITY)
- Test infrastructure setup (Playwright config, helpers)
- CI/CD integration (GitHub Actions)

**Dependencies:**
- **Requires:** Iteration 1 + 2 complete (test what was built)
- **Validates:** All fixes and features from iteration 1 + 2

**Estimated Duration:** 10-12 hours

**Risk Level:** MEDIUM (test flakiness, timing issues)

**Success Criteria:**
- 11 E2E tests passing (100%)
- Tests run in <30 minutes (fast tests)
- CI/CD pipeline working (automated on PR)
- Zero flaky tests (consistent results)
- Test coverage >70% on frontend components

**Why Third:**
- MUST have working features before writing tests
- Tests validate entire system (iteration 1 + 2)
- Can be done in parallel with iteration 2 (some overlap OK)

---

## Dependency Graph

```
Iteration 1: Critical Fixes (FOUNDATION)
├── Fix Logging (Pino config) - 2 hours
│   └── Enables stable SSE connections
├── Fix SSE Endpoint - 4 hours
│   ├── Requires: Stable logging
│   └── Enables real-time updates
├── Fix Timer Sync - 3 hours
│   ├── Requires: Working SSE
│   └── Uses server phaseEndTime
├── Verify Messages Display - 2 hours
│   ├── Requires: Working SSE
│   └── Validates 40+ messages
└── Fix API Endpoints - 1 hour
    └── Edge case handling

Total: 12 hours (optimistic), 16 hours (realistic)

↓ GATES: SSE connection stable, messages appearing, timer synced

Iteration 2: Transparency Features (BUILDS ON ITERATION 1)
├── Display Roles - 2 hours
│   ├── Requires: Player data API
│   └── Frontend component changes
├── Mafia Chat Panel - 3 hours
│   ├── Requires: Working SSE
│   └── Query NightMessage table
├── Enhanced Phase Visualization - 2 hours
│   └── Styling changes (icons, colors)
├── Role-Colored Cards - 2 hours
│   └── CSS + conditional styling
└── Enhanced Vote Viz - 3 hours
    ├── Requires: Working SSE
    └── Vote tally improvements

Total: 12 hours (optimistic), 16 hours (realistic with debugging)

↓ GATES: All transparency features visible, UI looks good

Iteration 3: E2E Testing (VALIDATES ITERATION 1 + 2)
├── Playwright Setup - 2 hours
│   └── Config, dependencies, helpers
├── Fast Tests (1-8) - 4 hours
│   ├── Lobby, game load, SSE, timer
│   └── 8 tests × 30 minutes each
├── Slow Tests (9-11) - 3 hours
│   ├── Full game flow, results
│   └── 3 tests × 1 hour each
├── CI/CD Integration - 2 hours
│   └── GitHub Actions workflow
└── Test Stabilization - 3 hours
    └── Fix flakiness, improve reliability

Total: 14 hours (optimistic), 18 hours (realistic with flaky tests)

↓ FINAL VALIDATION: All tests passing, CI/CD working
```

---

## Integration Considerations

### Cross-Iteration Integration Points

**Shared Components (Iteration 1 → Iteration 2):**
- GameEventsContext.tsx (SSE connection provider)
  - Iteration 1: Fixes SSE connection logic
  - Iteration 2: Uses for Mafia chat real-time updates
  - Integration: Ensure event types include "night_message" for Mafia chat

- PhaseIndicator.tsx (phase display + timer)
  - Iteration 1: Fixes timer sync
  - Iteration 2: Adds phase icons and enhanced styling
  - Integration: Preserve timer logic, enhance visual only

- API Routes
  - Iteration 1: Fixes `/api/game/[gameId]/state` to return correct data
  - Iteration 2: Uses state API to fetch roles and Mafia messages
  - Integration: Add role visibility flag to state response

**Shared Patterns (All Iterations):**
- Structured logging (maintain Pino pattern from iteration 4)
- TypeScript strict mode (maintain 0 errors)
- Prisma database queries (no schema changes)
- Cost tracking (preserve existing cost-tracker.ts)

### Potential Integration Challenges

**Challenge 1: Event Emitter Event Types**
- **Issue:** Iteration 2 Mafia chat needs "night_message" event type
- **Current:** Event types defined in `src/lib/events/types.ts`
- **Solution:** Add "night_message" to GameEventType union in iteration 1
- **Risk:** LOW (additive change)

**Challenge 2: API Response Schemas**
- **Issue:** Iteration 2 needs role data in `/api/game/[gameId]/state`
- **Current:** State API may hide roles until game over
- **Solution:** Add `includeRoles` query parameter (always true for spectators)
- **Risk:** LOW (backward compatible)

**Challenge 3: Playwright Test Data**
- **Issue:** Iteration 3 tests need consistent game state
- **Current:** Games are random (roles, personalities)
- **Solution:** Add `seed` parameter to game creation for deterministic tests
- **Risk:** MEDIUM (requires game logic changes)

**Challenge 4: Timer Component Refactor**
- **Issue:** Iteration 1 fixes timer, iteration 2 enhances UI
- **Current:** Timer logic mixed with display logic
- **Solution:** Separate timer calculation (iteration 1) from timer display (iteration 2)
- **Risk:** LOW (clean separation of concerns)

---

## Technology Recommendations

### Testing Framework Stack

**Primary:** Playwright (E2E testing)
- **Why:** Best for modern web apps, excellent debugging, MCP support
- **Alternative:** Cypress (more beginner-friendly but slower)

**Secondary:** Vitest (unit testing - already in place)
- **Why:** Fast, compatible with Vite/Next.js, already configured
- **Maintain:** Keep existing 47 tests passing

**Mock Strategy:** MSW (Mock Service Worker)
- **Why:** Mock Claude API calls for fast tests
- **Install:** `npm install --save-dev msw`
- **Usage:** Intercept `/api/claude/*` requests, return test data

### SSE Debugging Tools

**Tool 1:** Browser DevTools Network Tab
- Purpose: Inspect SSE connection status
- Usage: Filter by "EventStream" type

**Tool 2:** curl with streaming
- Purpose: Test SSE endpoint manually
- Command: `curl -N http://localhost:3001/api/game/{gameId}/stream`

**Tool 3:** SSE Client Testing Script
- Purpose: Automated SSE endpoint validation
- File: `src/test-sse.ts` (already exists)
- Enhancement: Add reconnection testing

### Logging Strategy

**Development:**
- Pino with JSON output (no pino-pretty)
- LOG_LEVEL=debug for verbose output
- Pretty logs optional: `USE_PRETTY_LOGS=true npm run dev`

**Production:**
- Pino with JSON output (structured logging)
- LOG_LEVEL=info (minimal noise)
- No transport (no worker threads)

**Monitoring:**
- Log to stdout (Docker/Railway captures)
- Optional: Add Datadog/Sentry integration (future iteration)

---

## Notes & Observations

### Strengths of Current Codebase

1. **Solid Backend Foundation (Iteration 4)**
   - 47 tests passing (100%)
   - 89.47% coverage on critical paths
   - Zero TypeScript errors
   - Excellent code quality (per validation report)

2. **Existing Frontend Components**
   - All UI components already built
   - GameEventsContext for SSE already exists
   - Just needs fixing, not rebuilding

3. **Clear Architecture**
   - Clean separation (backend vs frontend)
   - Well-documented (6.6 KB bugfix doc)
   - Supabase Local setup complete

### Weaknesses / Gaps

1. **No Frontend Tests**
   - Zero E2E tests
   - Zero component tests
   - Vision explicitly calls this out

2. **SSE Never Tested**
   - Backend works, frontend SSE never validated
   - Likely source of "completely broken" issue

3. **Logging Instability**
   - Pino-pretty worker crashes documented
   - Critical blocker for SSE stability

### Key Insights

**Insight 1: Iteration 4 Did Not Touch Frontend**
- Validation report shows: "Functional test incomplete"
- Backend validated (44 messages generated)
- Frontend SSE never tested
- **Implication:** All frontend issues (SSE, timer, messages) are pre-iteration 4 bugs

**Insight 2: Logging is the Root Cause**
- Vision states: "Worker thread exits causing server instability and broken SSE connections"
- SSE requires stable server (no crashes)
- **Implication:** Fix logging FIRST, everything else depends on it

**Insight 3: Testing is Critical for Success**
- Iteration 4 had zero functional tests (documented as "UNCERTAIN" status)
- Cannot validate fixes without tests
- **Implication:** Build E2E tests in parallel with fixes (not after)

**Insight 4: Backend is Solid, Frontend Needs Love**
- Backend: WORKING (44 messages, 47 tests passing)
- Frontend: BROKEN (SSE, timer, display)
- **Implication:** 80% of plan-2 effort is frontend fixes + tests

---

## Recommendations for Master Plan

### 1. Start with Iteration 1 (Critical Fixes)

**Why:**
- Logging fix is FOUNDATION (everything depends on stable server)
- SSE fix unblocks timer and message display
- MUST validate fixes work before building transparency features

**Builder Allocation:**
- Builder-1: Fix logging (Pino config) - 2 hours
- Builder-2: Fix SSE endpoint + event emission - 4 hours
- Builder-3: Fix timer sync - 3 hours
- Builder-4: Verify message display + API fixes - 3 hours

**Total:** 4 builders, 12 hours (optimistic), 16 hours (realistic)

### 2. Consider Parallel Testing (Iteration 1 + 3)

**Strategy:**
- Start Playwright setup DURING iteration 1 (not after)
- Write SSE connection test FIRST (validates logging fix)
- Use tests to validate fixes in real-time

**Benefits:**
- Faster feedback loop (test fixes as they're built)
- Prevents "UNCERTAIN" status (like iteration 4)
- Reduces overall timeline (parallel vs sequential)

**Risk:**
- Tests may fail initially (features not ready)
- Need clear communication between builders (test builder + fix builders)

**Recommendation:** IF team has 5+ builders available, run testing in parallel. Otherwise, sequential is safer.

### 3. Defer Visual Regression to Plan-3

**Rationale:**
- Vision explicitly marks as "LOW priority"
- Functional tests more important than visual tests
- Can add visual regression after MVP stable

**Decision:** Remove visual regression from plan-2 scope (saves 2-3 hours)

### 4. Monitor Iteration 4 Test Regression

**Risk:**
- Plan-2 changes could break iteration 4 backend
- 47 tests currently passing (must maintain)

**Mitigation:**
- Run `npm test` after every iteration
- If tests fail, stop and fix immediately
- Do NOT proceed if backend regression detected

**Gate:** ALL existing tests passing BEFORE moving to next iteration

### 5. Set Conservative Timeboxes

**Complexity:** COMPLEX (not VERY COMPLEX)
- Estimated: 25-35 hours
- Realistic (with debugging): 30-40 hours
- Pessimistic (with flaky tests): 35-45 hours

**Recommendation:**
- Plan for 35 hours (realistic)
- Allow 10 hours buffer (flaky tests, debugging)
- Total: 45 hours (3 iterations × 15 hours each)

---

## Open Questions for Planning

1. **Should we run iteration 3 (testing) in parallel with iteration 1 (fixes)?**
   - Pro: Faster overall timeline, real-time validation
   - Con: Tests fail until fixes complete (noisy)
   - Decision: TBD based on builder availability

2. **Should we mock Claude API for E2E tests or use real API?**
   - Pro (mock): Fast tests (2-3 min vs 20 min), no API costs
   - Con (mock): Doesn't validate real API integration
   - Decision: Recommend mix (fast tests use mocks, 1-2 slow tests use real API)

3. **Should we fix Pino or revert to console.log?**
   - Recommendation: Fix Pino first (Option A), fallback to abstraction (Option B) if fails
   - Decision: TBD based on initial testing results

4. **Should we add "night_message" event type in iteration 1 or iteration 2?**
   - Pro (iteration 1): Available when needed for Mafia chat
   - Con (iteration 1): Not needed until iteration 2 (premature)
   - Recommendation: Add in iteration 2 (when actually used)

5. **How should we handle test flakiness if it's excessive?**
   - Strategy: Start with 3 fast tests (lobby, SSE, timer), expand if stable
   - Fallback: Reduce to 6 critical tests instead of 11 (cut slow tests)
   - Decision: TBD based on initial test results

---

**Exploration completed:** 2025-10-13T15:00:00Z
**This report informs master planning decisions for plan-2**
