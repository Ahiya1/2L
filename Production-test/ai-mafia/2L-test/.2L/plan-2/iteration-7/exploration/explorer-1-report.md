# Explorer-1 Report: Testing Infrastructure Analysis

## Executive Summary

Playwright E2E testing infrastructure is **90% ready** for implementation. Playwright is installed (`@playwright/test@1.56.0`), basic Vitest unit tests exist, and all components have excellent testability with `data-testid` attributes. The main challenge is managing **real-time SSE updates** and **phase timing** in tests - full game takes ~6 minutes (45s Night + 10s Day + 3m Discussion + 2m Voting per round). Recommend starting with 5 fast component tests (<30s each), then 3 slow integration tests (~5-10 minutes each), plus 3 visual regression tests.

---

## 1. Existing Test Infrastructure

### 1.1 Installed Dependencies

**Playwright Status: INSTALLED & READY**

From `app/package.json`:
```json
"devDependencies": {
  "@playwright/test": "^1.56.0",
  "playwright": "^1.56.0"
}
```

**Vitest Status: ACTIVE (Unit tests)**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### 1.2 Missing Infrastructure

**Critical Gaps:**
1. **No `playwright.config.ts`** - Must create from scratch
2. **No E2E test files** - Zero `*.spec.ts` files exist (only unit tests with `*.test.tsx`)
3. **No test helpers** - Need to create `tests/helpers/game-helpers.ts` for:
   - `createGame(playerCount)` - API helper
   - `waitForPhase(page, phase)` - Phase transition waiter
   - `waitForMessage(page, count)` - Message count waiter
   - `waitForSSEConnection(page)` - SSE ready waiter
4. **No CI/CD integration** - No GitHub Actions workflow for Playwright

### 1.3 Existing Unit Tests (Reference Patterns)

**Location:** `app/components/__tests__/`
- `DiscussionFeed.test.tsx` (300 lines) - Excellent reference for mocking `useGameEvents`
- `VoteTally.test.tsx` - Vote aggregation testing patterns

**Key Pattern from DiscussionFeed.test.tsx:**
```typescript
// Mock useGameEvents hook
const mockUseGameEvents = vi.fn();
vi.spyOn(GameEventsContext, 'useGameEvents').mockImplementation(mockUseGameEvents);

// Inject events
mockUseGameEvents.mockReturnValue({
  events: [
    {
      type: 'message',
      payload: { playerName: 'Agent-A', message: 'Hello' }
    }
  ],
  isConnected: true,
  error: null,
  reconnectAttempts: 0,
});
```

**Implication for E2E tests:** We can't mock SSE in E2E tests - must test real SSE connection with proper waiting strategies.

---

## 2. Component Testability Analysis

### 2.1 Lobby Page (`app/app/page.tsx`)

**Testability: EXCELLENT**

**Key Selectors:**
- Input slider: `input[type="range"]` (player count selector)
- Create button: `button` with text "Create Game"
- Player count display: Text node showing `{playerCount}`
- Error message: `.bg-red-50` (error banner)

**Data Flow:**
1. User adjusts slider → `playerCount` state updates
2. Click "Create Game" → `POST /api/game/create` → Returns `{ gameId }`
3. Auto-start game → `POST /api/game/{gameId}/start`
4. Auto-navigate → `router.push(/game/{gameId})`

**Testing Strategy:**
```typescript
// Fast test (~10 seconds)
await page.goto('http://localhost:3000');
await page.locator('input[type="range"]').fill('10');
await page.locator('button:has-text("Create Game")').click();
await page.waitForURL(/\/game\/.+/); // Wait for navigation
expect(page.url()).toContain('/game/');
```

**No Wait Needed:** Lobby tests are synchronous (API calls complete in <1 second).

---

### 2.2 Main Game Page (`app/app/game/[gameId]/page.tsx`)

**Testability: EXCELLENT**

**Layout Structure:**
```
<GameEventsProvider gameId={gameId}>
  <PhaseIndicator />
  <PlayerGrid />
  <DiscussionFeed />     (Left column)
  <MafiaChatPanel />     (Right column during Night, or hidden)
  <VoteTally />          (Right column during Voting, or hidden)
  <CostMetrics />
</GameEventsProvider>
```

**Key Selectors:**
- Loading state: `div:has-text("Loading game...")`
- Error state: `div:has-text("Error Loading Game")`
- Game ID display: `h1:has-text("Live Game:")`
- Connection status: `ConnectionStatus` component (green/red dot)

**SSE Connection Flow:**
1. `GameEventsProvider` mounts → Fetches `/api/game/{gameId}/state` (initial state)
2. Opens SSE: `new EventSource(/api/game/{gameId}/stream)`
3. Receives events: `phase_change`, `message`, `vote_cast`, `player_eliminated`, `night_message`
4. Updates all child components in real-time

**Critical Wait Point:** Must wait for SSE connection before asserting component state.

**Testing Strategy:**
```typescript
await page.goto(`http://localhost:3000/game/${gameId}`);

// Wait for SSE connection (green dot)
await page.locator('[data-testid="connection-status"]').waitFor({ state: 'visible' });
const connectionDot = page.locator('.bg-green-500'); // Green dot indicator
await connectionDot.waitFor({ state: 'visible', timeout: 5000 });

// Now safe to assert on components
await expect(page.locator('[data-testid="player-grid"]')).toBeVisible();
```

---

### 2.3 PlayerGrid Component (`components/PlayerGrid.tsx`)

**Testability: EXCELLENT**

**Key Selectors:**
```typescript
// Container
'[data-testid="player-grid"]'

// Individual player cards
'[data-testid="player-card-Agent-A"]'
'[data-testid="player-card-Agent-B"]'

// Role badges (Iteration 6 transparency feature)
'[data-testid="player-role-badge-Agent-A"]'

// Alive/dead status
'.filter-none'    // Alive (no grayscale filter)
'.filter-grayscale' // Dead (grayscale)

// Role-based borders (transparency feature)
'.border-red-300.bg-red-50'  // Mafia player
'.border-blue-300.bg-blue-50' // Villager player

// Badge variants
'[data-badge="mafia"]'    // Mafia badge
'[data-badge="villager"]' // Villager badge
```

**Dynamic Updates via SSE:**
- `player_eliminated` event → Card becomes grayscale, shows "Eliminated (R2)" badge

**Testing Strategy:**
```typescript
// Test role visibility (transparency feature)
const mafiaCard = page.locator('[data-testid="player-card-Agent-A"]');
await expect(mafiaCard).toHaveClass(/border-red-300/); // Mafia border

// Test elimination (wait for SSE event)
await page.locator('[data-testid="player-card-Agent-B"]')
  .locator('text=Eliminated')
  .waitFor({ state: 'visible', timeout: 60000 }); // Max 60s wait
```

**Wait Strategy:** Elimination happens during Night phase (45s) - tests must wait up to 60 seconds for `player_eliminated` event.

---

### 2.4 PhaseIndicator Component (`components/PhaseIndicator.tsx`)

**Testability: EXCELLENT**

**Key Selectors:**
```typescript
// Container
'[data-testid="phase-indicator"]'

// Current phase (data attribute)
'[data-testid="phase-indicator"][data-phase="NIGHT"]'
'[data-testid="phase-indicator"][data-phase="DISCUSSION"]'
'[data-testid="phase-indicator"][data-phase="VOTING"]'

// Phase name display
'role=status' // Contains "Night Phase", "Discussion", etc.

// Timer (only visible for timed phases)
'role=progressbar' // Progress bar for time remaining

// Round counter
'text=/Round/'
```

**Phase Timing Configuration (from `lib/game/phase-config.ts`):**
```typescript
NIGHT:            45 seconds
DAY_ANNOUNCEMENT: 10 seconds
DISCUSSION:       180 seconds (3 minutes)
VOTING:           120 seconds (2 minutes)
WIN_CHECK:        5 seconds
```

**Total Round Time:** ~6 minutes per round (45s + 10s + 180s + 120s + 5s = 360s)

**Dynamic Updates:**
- Phase changes every N seconds (automatic)
- Timer counts down (updates every 1 second)
- Progress bar decreases from 100% → 0%

**Testing Strategy:**
```typescript
// Wait for specific phase
async function waitForPhase(page, phase) {
  await page.locator(`[data-testid="phase-indicator"][data-phase="${phase}"]`)
    .waitFor({ state: 'visible', timeout: 300000 }); // 5 min max
}

// Test timer sync (refresh page, timer should persist)
await page.reload();
const timerBefore = await page.locator('[role="progressbar"]').getAttribute('aria-valuenow');
await page.waitForTimeout(2000); // Wait 2 seconds
const timerAfter = await page.locator('[role="progressbar"]').getAttribute('aria-valuenow');
expect(Number(timerAfter)).toBeLessThan(Number(timerBefore)); // Timer decreased
```

**Critical Test:** Timer sync after page refresh (validates Iteration 5 fix).

---

### 2.5 DiscussionFeed Component (`components/DiscussionFeed.tsx`)

**Testability: GOOD** (no explicit data-testid attributes, but accessible via structure)

**Key Selectors:**
```typescript
// Container
'.bg-white.border.border-gray-300.rounded-lg' (generic, fragile)

// Message count
'text=/messages$/' // "44 messages"

// Individual messages (NO data-testid!)
'.p-3.rounded' // Generic message card

// Avatar
'.w-10.h-10.rounded-full' // Avatar circle

// Connection status
'text=/Connected|Connecting.../'

// Auto-scroll toggle
'button:has-text("Lock Scroll")'
'button:has-text("Auto-scroll")'
```

**Recommendation:** ADD `data-testid` attributes to DiscussionFeed for better testability:
```typescript
// Suggested additions:
<div data-testid="discussion-feed">
  {messages.map((msg, idx) => (
    <div key={msg.id} data-testid={`message-${idx}`} data-message-id={msg.id}>
      <div data-testid={`message-player-${msg.player.name}`}>{msg.player.name}</div>
      <div data-testid="message-text">{msg.message}</div>
    </div>
  ))}
</div>
```

**Dynamic Updates:**
- Messages appear via SSE (`message` events)
- Discussion phase generates ~40-50 messages over 3 minutes
- Auto-scroll to bottom on new message (unless locked)

**Testing Strategy:**
```typescript
// Wait for messages to appear
await page.locator('text=/messages$/').waitFor({ state: 'visible' });

// Wait for specific message count (after full game)
await expect(page.locator('text=/messages$/')).toContainText(/4[0-9] messages/); // 40-49 messages

// Test auto-scroll toggle
await page.locator('button:has-text("Lock Scroll")').click();
await expect(page.locator('button:has-text("Auto-scroll")')).toBeVisible();
```

**Wait Strategy:** Messages arrive over 3 minutes - tests must wait for message count to reach expected value.

---

### 2.6 MafiaChatPanel Component (`components/MafiaChatPanel.tsx`)

**Testability: EXCELLENT**

**Key Selectors:**
```typescript
// Container
'[data-testid="mafia-chat-panel"]'

// Phase-aware visibility
'[data-testid="mafia-chat-panel"][data-phase="NIGHT"]'

// Individual messages
'[data-testid="mafia-message-0"]'
'[data-testid="mafia-message-1"]'

// Message type attribute
'[data-message-type="night_message"]'

// Connection status
'.bg-green-500' // Connected dot
'.bg-red-500'   // Disconnected dot

// Auto-scroll toggle
'button:has-text("Lock Scroll")'
```

**Dynamic Updates:**
- Panel visible ONLY during Night phase (45 seconds)
- Mafia agents generate ~3-5 messages per Night phase
- Updates via SSE (`night_message` events)

**Testing Strategy:**
```typescript
// Test visibility during Night phase
await waitForPhase(page, 'NIGHT');
await expect(page.locator('[data-testid="mafia-chat-panel"]')).toBeVisible();

// Wait for Mafia messages
await page.locator('[data-testid="mafia-message-0"]').waitFor({ state: 'visible', timeout: 30000 });

// Test panel hidden during Day phase
await waitForPhase(page, 'DISCUSSION');
await expect(page.locator('[data-testid="mafia-chat-panel"]')).toHaveAttribute('data-phase', 'DISCUSSION');
// Panel may still be visible but shows "No Activity" badge
```

**Wait Strategy:** Night phase is 45 seconds - messages appear within first 30 seconds.

---

### 2.7 VoteTally Component (`components/VoteTally.tsx`)

**Testability: EXCELLENT**

**Key Selectors:**
```typescript
// Container
'[data-testid="vote-tally"]'

// Individual vote entries
'[data-testid="vote-entry"]'

// Vote entry attributes
'[data-testid="vote-entry"][data-target-id="player-123"]'
'[data-testid="vote-entry"][data-vote-count="3"]'

// Vote count badge
'text=/\d+ vote(s)?/'

// Majority indicator
'text=/⚠ MAJORITY/'
'text=/👑 LEADING/'

// Progress bar
'role=progressbar'

// Voter justifications (expandable)
'button:has-text("Voted by:")'
```

**Dynamic Updates:**
- Visible ONLY during Voting phase (120 seconds)
- Votes cast in sequence (agents vote 1 by 1)
- Each vote triggers SSE `vote_cast` event
- Vote count updates in real-time

**Testing Strategy:**
```typescript
// Wait for Voting phase
await waitForPhase(page, 'VOTING');
await expect(page.locator('[data-testid="vote-tally"]')).toBeVisible();

// Wait for all votes (playerCount votes total)
await page.locator('text=/All votes cast!/').waitFor({ state: 'visible', timeout: 120000 }); // Max 2 min

// Verify vote count
const voteEntries = await page.locator('[data-testid="vote-entry"]').count();
expect(voteEntries).toBeGreaterThan(0); // At least 1 player received votes
```

**Wait Strategy:** Voting phase is 2 minutes - all votes cast within that time.

---

### 2.8 PhaseTimeline Component (`components/game/PhaseTimeline.tsx`)

**Testability: EXCELLENT**

**Key Selectors:**
```typescript
// Container
'[data-testid="phase-timeline"]'
'role=navigation'

// Phase step nodes
'[data-phase-step="NIGHT"]'
'[data-phase-step="DAY_ANNOUNCEMENT"]'
'[data-phase-step="DISCUSSION"]'
'[data-phase-step="VOTING"]'

// Active phase indicator
'[data-phase-step="DISCUSSION"][data-active="true"]'

// Phase completion status (CSS classes)
'.bg-gray-400'  // Completed phase
'.bg-blue-500'  // Active phase
'.bg-gray-200'  // Upcoming phase
```

**Dynamic Updates:**
- Highlights current phase (border + background color)
- Shows progression line (completed phases have darker connector)

**Testing Strategy:**
```typescript
// Verify active phase
await expect(page.locator('[data-phase-step="NIGHT"][data-active="true"]')).toBeVisible();

// Verify phase progression (after Discussion starts)
await waitForPhase(page, 'DISCUSSION');
await expect(page.locator('[data-phase-step="DISCUSSION"][data-active="true"]')).toBeVisible();
await expect(page.locator('[data-phase-step="NIGHT"]')).not.toHaveAttribute('data-active', 'true');
```

**No Wait Needed:** Timeline updates immediately when phase changes (shares same SSE events as PhaseIndicator).

---

## 3. Game Flow & Waiting Points

### 3.1 Complete Game Flow (Sequential)

```
1. LOBBY (manual)
   - User creates game (POST /api/game/create)
   - User starts game (POST /api/game/{gameId}/start)
   → Navigate to /game/{gameId}

2. GAME INITIALIZATION (~2 seconds)
   - Fetch /api/game/{gameId}/state (initial player data)
   - Open SSE connection /api/game/{gameId}/stream
   - Render PlayerGrid, PhaseIndicator
   → SSE connected (green dot)

3. ROUND 1 - NIGHT PHASE (45 seconds)
   - Mafia agents coordinate (3-5 night_message events)
   - Kill target selected
   - phase_change event: NIGHT → DAY_ANNOUNCEMENT
   → Wait: 45 seconds

4. ROUND 1 - DAY ANNOUNCEMENT (10 seconds)
   - Moderator announces elimination
   - player_eliminated event (if any)
   - phase_change event: DAY_ANNOUNCEMENT → DISCUSSION
   → Wait: 10 seconds

5. ROUND 1 - DISCUSSION PHASE (180 seconds = 3 minutes)
   - All agents discuss (40-50 message events)
   - Messages appear in DiscussionFeed
   - phase_change event: DISCUSSION → VOTING
   → Wait: 3 minutes

6. ROUND 1 - VOTING PHASE (120 seconds = 2 minutes)
   - Each agent votes (vote_cast events)
   - VoteTally updates in real-time
   - Majority threshold reached
   - phase_change event: VOTING → WIN_CHECK
   → Wait: 2 minutes

7. WIN_CHECK (5 seconds)
   - Check if Mafia = Villagers (Mafia win)
   - Check if Mafia = 0 (Villagers win)
   - If no winner: phase_change → NIGHT (Round 2)
   - If winner: phase_change → GAME_OVER
   → Wait: 5 seconds

8. ROUND 2+ (repeat 3-7)
   - Typical game: 3-5 rounds
   - Max rounds: 40 (MAX_ROUNDS constant)

9. GAME_OVER
   - Display winner
   - Show final statistics
   - No further events
```

**Total Game Time:**
- Minimum: 1 round (~6 minutes) if one faction eliminated early
- Typical: 3-5 rounds (~18-30 minutes)
- Maximum: 40 rounds (~240 minutes = 4 hours) - unlikely, safety limit

---

### 3.2 Waiting Points & Strategies

#### Critical Wait Points

| Event | Max Wait Time | Waiting Strategy |
|-------|--------------|------------------|
| **SSE Connection** | 5 seconds | Wait for green dot (`.bg-green-500`) |
| **Phase Change** | 5 minutes | `waitForPhase(page, phase)` using `data-phase` attribute |
| **Message Appearance** | 3 minutes | Poll message count: `text=/\d+ messages$/` |
| **Vote Cast** | 2 minutes | Wait for vote count to reach expected value |
| **Player Elimination** | 60 seconds | Wait for `text=Eliminated` in player card |
| **Game Over** | 5 minutes | Wait for `data-phase="GAME_OVER"` |

#### Playwright Wait Patterns

**Pattern 1: Wait for Phase Change**
```typescript
async function waitForPhase(page: Page, phase: string) {
  await page.locator(`[data-testid="phase-indicator"][data-phase="${phase}"]`)
    .waitFor({ state: 'visible', timeout: 300000 }); // 5 min max
  console.log(`[Test] Reached phase: ${phase}`);
}
```

**Pattern 2: Wait for Message Count**
```typescript
async function waitForMessages(page: Page, minCount: number) {
  await page.waitForFunction(
    (min) => {
      const text = document.querySelector('text=/messages$/')?.textContent;
      const match = text?.match(/(\d+) messages/);
      return match && parseInt(match[1]) >= min;
    },
    minCount,
    { timeout: 180000 } // 3 min max
  );
}
```

**Pattern 3: Wait for All Votes**
```typescript
async function waitForAllVotes(page: Page) {
  await page.locator('text=/All votes cast!/').waitFor({ 
    state: 'visible', 
    timeout: 120000 // 2 min max
  });
}
```

**Pattern 4: Wait for SSE Connection**
```typescript
async function waitForSSEConnection(page: Page) {
  await page.locator('.bg-green-500').waitFor({ 
    state: 'visible', 
    timeout: 5000 
  });
  console.log('[Test] SSE connected');
}
```

---

## 4. Testing Challenges & Mitigation Strategies

### 4.1 Challenge: Real-Time SSE Events (HIGH RISK)

**Problem:** Tests depend on SSE events arriving in real-time. If SSE connection drops, tests will timeout.

**Mitigation Strategies:**
1. **Always wait for SSE connection before assertions:**
   ```typescript
   await waitForSSEConnection(page);
   await expect(page.locator('[data-testid="player-grid"]')).toBeVisible();
   ```

2. **Use generous timeouts for phase transitions:**
   ```typescript
   { timeout: 300000 } // 5 minutes
   ```

3. **Add retry logic for flaky SSE connections:**
   ```typescript
   await page.reload(); // Retry connection
   await waitForSSEConnection(page);
   ```

4. **Test SSE reconnection behavior:**
   ```typescript
   // Simulate network interruption
   await page.context().setOffline(true);
   await page.waitForTimeout(2000);
   await page.context().setOffline(false);
   
   // Verify reconnection
   await waitForSSEConnection(page);
   ```

**Risk Level:** MEDIUM (mitigated by Iteration 5 SSE stability fixes)

---

### 4.2 Challenge: Long-Running Tests (MEDIUM RISK)

**Problem:** Full game takes ~6 minutes per round, 18-30 minutes for complete game. Slow feedback loop.

**Mitigation Strategies:**
1. **Split into Fast vs Slow test suites:**
   - Fast tests (<30s): Lobby, game page load, SSE connection, component rendering
   - Slow tests (5-10 min): Full game flow, phase progression, message generation

2. **Use Playwright parallelization:**
   ```typescript
   // playwright.config.ts
   export default defineConfig({
     workers: 3, // Run 3 tests in parallel
     fullyParallel: true,
   });
   ```

3. **Early exit on failure:**
   ```typescript
   test.describe('Full Game Flow', () => {
     test.fail(); // Mark slow test, skip if not needed
   });
   ```

4. **Mock time for phase progression (advanced):**
   ```typescript
   // NOT RECOMMENDED - breaks real-time testing
   await page.clock.fastForward(45000); // Skip 45s Night phase
   ```

**Risk Level:** LOW (accept that slow tests are slow, run in CI only)

---

### 4.3 Challenge: Test Isolation & Database Cleanup (MEDIUM RISK)

**Problem:** Each test creates a new game in database. Without cleanup, database fills up.

**Mitigation Strategies:**
1. **Use unique game IDs per test:**
   ```typescript
   const gameId = await createGame(10); // Creates new game each time
   ```

2. **Database cleanup after each test:**
   ```typescript
   test.afterEach(async () => {
     // Delete game from database
     await fetch(`/api/game/${gameId}`, { method: 'DELETE' });
   });
   ```

3. **Use test database (recommended):**
   ```typescript
   // .env.test
   DATABASE_URL="postgresql://localhost:5432/mafia_test"
   ```

4. **Truncate tables before test suite:**
   ```typescript
   test.beforeAll(async () => {
     await prisma.game.deleteMany({});
     await prisma.message.deleteMany({});
     await prisma.vote.deleteMany({});
   });
   ```

**Risk Level:** LOW (standard testing practice)

---

### 4.4 Challenge: Async Operations & Race Conditions (HIGH RISK)

**Problem:** Multiple async operations (SSE events, API calls, React state updates) can cause race conditions.

**Example Race Condition:**
```typescript
// BAD - Races between SSE event and assertion
await page.locator('button:has-text("Create Game")').click();
await expect(page.locator('[data-testid="player-grid"]')).toBeVisible(); // May fail!
```

**Mitigation Strategies:**
1. **Always wait for stable state before assertions:**
   ```typescript
   // GOOD - Wait for SSE connection + phase change
   await waitForSSEConnection(page);
   await waitForPhase(page, 'NIGHT');
   await expect(page.locator('[data-testid="player-grid"]')).toBeVisible();
   ```

2. **Use Playwright's auto-waiting:**
   ```typescript
   // Playwright waits for element to be visible/enabled before clicking
   await page.locator('button').click(); // Auto-waits
   ```

3. **Avoid brittle `waitForTimeout`:**
   ```typescript
   // BAD - Arbitrary timeout
   await page.waitForTimeout(5000);
   
   // GOOD - Wait for specific condition
   await page.locator('[data-testid="phase-indicator"]').waitFor();
   ```

**Risk Level:** MEDIUM (Playwright auto-waiting helps, but SSE events need explicit waits)

---

### 4.5 Challenge: Dev Server Requirements (LOW RISK)

**Problem:** Tests require Next.js dev server + database + backend running.

**Mitigation Strategies:**
1. **Use `webServer` option in Playwright config:**
   ```typescript
   export default defineConfig({
     webServer: {
       command: 'npm run dev',
       port: 3000,
       timeout: 120000,
       reuseExistingServer: true,
     },
   });
   ```

2. **Database setup in CI:**
   ```yaml
   # .github/workflows/test.yml
   - name: Setup database
     run: |
       npm run db:migrate
       npm run db:generate
   ```

3. **Environment variables:**
   ```bash
   # .env.test
   DATABASE_URL="postgresql://localhost:5432/mafia_test"
   ANTHROPIC_API_KEY="test-key-mock"
   ```

**Risk Level:** LOW (standard setup for E2E tests)

---

## 5. Recommended Test Architecture

### 5.1 File Structure

```
app/
├── tests/
│   ├── e2e/
│   │   ├── 01-lobby.spec.ts               # Fast (~10s)
│   │   ├── 02-game-creation.spec.ts       # Fast (~15s)
│   │   ├── 03-game-page-load.spec.ts      # Fast (~10s)
│   │   ├── 04-sse-connection.spec.ts      # Fast (~20s)
│   │   ├── 05-player-grid.spec.ts         # Fast (~15s)
│   │   ├── 06-phase-changes.spec.ts       # Slow (~5min)
│   │   ├── 07-messages.spec.ts            # Slow (~3min)
│   │   ├── 08-votes.spec.ts               # Slow (~2min)
│   │   ├── 09-roles.spec.ts               # Fast (~10s)
│   │   ├── 10-mafia-chat.spec.ts          # Slow (~1min)
│   │   └── 11-full-game.spec.ts           # Slow (~10min)
│   ├── visual/
│   │   ├── lobby.spec.ts
│   │   ├── game-phases.spec.ts
│   │   └── game-over.spec.ts
│   ├── helpers/
│   │   └── game-helpers.ts                # Shared utilities
│   └── fixtures/
│       └── test-data.ts                   # Mock game data
├── playwright.config.ts                   # Playwright configuration
└── package.json
```

---

### 5.2 Playwright Configuration (`playwright.config.ts`)

**Recommended Configuration:**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  
  // Timeouts
  timeout: 600000, // 10 minutes per test (for slow full-game tests)
  expect: {
    timeout: 30000, // 30s for assertions
  },
  
  // Parallelization
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3, // 2 workers in CI, 3 locally
  
  // Retries
  retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI only
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'], // Console output
  ],
  
  // Web server
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
  
  // Base URL
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry', // Capture trace on retry
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  // Browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add Firefox/Safari later if needed
  ],
});
```

---

### 5.3 Test Helpers (`tests/helpers/game-helpers.ts`)

**Core Helper Functions:**

```typescript
import { Page, expect } from '@playwright/test';

/**
 * Create a game via API
 */
export async function createGame(playerCount: number = 10): Promise<string> {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerCount }),
  });
  
  if (!response.ok) throw new Error('Failed to create game');
  
  const { gameId } = await response.json();
  return gameId;
}

/**
 * Start a game via API
 */
export async function startGame(gameId: string): Promise<void> {
  const response = await fetch(`http://localhost:3000/api/game/${gameId}/start`, {
    method: 'POST',
  });
  
  if (!response.ok) throw new Error('Failed to start game');
}

/**
 * Wait for SSE connection to be established
 */
export async function waitForSSEConnection(page: Page): Promise<void> {
  await page.locator('.bg-green-500').waitFor({ 
    state: 'visible', 
    timeout: 5000 
  });
  console.log('[Test] SSE connected');
}

/**
 * Wait for specific game phase
 */
export async function waitForPhase(page: Page, phase: string): Promise<void> {
  await page.locator(`[data-testid="phase-indicator"][data-phase="${phase}"]`)
    .waitFor({ state: 'visible', timeout: 300000 }); // 5 min max
  console.log(`[Test] Reached phase: ${phase}`);
}

/**
 * Wait for minimum message count
 */
export async function waitForMessages(page: Page, minCount: number): Promise<void> {
  await page.waitForFunction(
    (min) => {
      const text = document.body.textContent || '';
      const match = text.match(/(\d+) messages/);
      return match && parseInt(match[1]) >= min;
    },
    minCount,
    { timeout: 180000 } // 3 min max
  );
  console.log(`[Test] ${minCount}+ messages received`);
}

/**
 * Wait for all votes to be cast
 */
export async function waitForAllVotes(page: Page): Promise<void> {
  await page.locator('text=/All votes cast!/').waitFor({ 
    state: 'visible', 
    timeout: 120000 // 2 min max
  });
  console.log('[Test] All votes cast');
}

/**
 * Get player names from page
 */
export async function getPlayerNames(page: Page): Promise<string[]> {
  await page.locator('[data-testid="player-grid"]').waitFor();
  const cards = page.locator('[data-testid^="player-card-"]');
  const count = await cards.count();
  
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const name = await cards.nth(i).getAttribute('data-testid');
    if (name) names.push(name.replace('player-card-', ''));
  }
  
  return names;
}

/**
 * Get current phase
 */
export async function getCurrentPhase(page: Page): Promise<string | null> {
  const indicator = page.locator('[data-testid="phase-indicator"]');
  return await indicator.getAttribute('data-phase');
}

/**
 * Navigate to game page
 */
export async function goToGame(page: Page, gameId: string): Promise<void> {
  await page.goto(`http://localhost:3000/game/${gameId}`);
  await page.waitForLoadState('domcontentloaded');
}
```

---

### 5.4 Fast vs Slow Test Split Strategy

#### Fast Tests (8 scenarios, <5 min total)

**Run in parallel, target <30s each:**

1. **Lobby loads** (`01-lobby.spec.ts`) - 10s
   - Page renders
   - Player count slider works
   - Role distribution updates

2. **Game creation works** (`02-game-creation.spec.ts`) - 15s
   - Click "Create Game"
   - API calls succeed
   - Navigate to game page

3. **Game page renders** (`03-game-page-load.spec.ts`) - 10s
   - Player grid visible
   - Phase indicator visible
   - No error state

4. **SSE connection status** (`04-sse-connection.spec.ts`) - 20s
   - Green dot appears
   - Connection stable for 10s
   - Reconnection after offline

5. **Player grid displays** (`05-player-grid.spec.ts`) - 15s
   - All players visible
   - Role badges correct
   - Alive status correct

6. **Roles visible from start** (`09-roles.spec.ts`) - 10s
   - Mafia cards have red border
   - Villager cards have blue border
   - Role badges display

7. **Phase indicator updates** (partial test, first phase only) - 20s
   - Shows Night phase
   - Timer counts down
   - Round number displays

8. **MafiaChatPanel visibility** (stub test, no wait for messages) - 10s
   - Panel visible during Night
   - Panel structure correct

**Total Fast Tests:** ~2 minutes (with 3 workers = ~40s wall time)

---

#### Slow Tests (3 scenarios, ~15 min total)

**Run sequentially, target <10 min each:**

1. **Phase changes** (`06-phase-changes.spec.ts`) - ~6 min
   - Start game
   - Wait for Night → Day → Discussion → Voting → Win Check
   - Verify each phase transition
   - Verify timer resets on phase change

2. **Messages appear** (`07-messages.spec.ts`) - ~3 min
   - Wait for Discussion phase
   - Verify messages appear in real-time
   - Verify message count reaches 40+
   - Verify auto-scroll works

3. **Votes display** (`08-votes.spec.ts`) - ~5 min
   - Wait for Voting phase
   - Verify vote tally updates
   - Verify all votes cast
   - Verify majority indicator

**Total Slow Tests:** ~14 minutes (sequential, one at a time)

---

#### Very Slow Test (1 scenario, ~10 min)

**Run rarely (nightly CI or manual):**

1. **Full game flow** (`11-full-game.spec.ts`) - ~10 min
   - Complete game from start to finish
   - Verify winner declared
   - Verify all features work together
   - Take screenshots at each phase

**Total Very Slow Tests:** ~10 minutes

---

### 5.5 Visual Regression Tests (3 scenarios, <5 min total)

**Capture screenshots for visual diffing:**

```typescript
// tests/visual/game-phases.spec.ts
import { test } from '@playwright/test';
import { createGame, startGame, goToGame, waitForPhase } from '../helpers/game-helpers';

test('Visual: Night Phase', async ({ page }) => {
  const gameId = await createGame(10);
  await startGame(gameId);
  await goToGame(page, gameId);
  
  await waitForPhase(page, 'NIGHT');
  
  // Take screenshot
  await page.screenshot({ 
    path: 'tests/visual/screenshots/night-phase.png',
    fullPage: true 
  });
});

test('Visual: Discussion Phase', async ({ page }) => {
  const gameId = await createGame(10);
  await startGame(gameId);
  await goToGame(page, gameId);
  
  await waitForPhase(page, 'DISCUSSION');
  
  await page.screenshot({ 
    path: 'tests/visual/screenshots/discussion-phase.png',
    fullPage: true 
  });
});

test('Visual: Voting Phase', async ({ page }) => {
  const gameId = await createGame(10);
  await startGame(gameId);
  await goToGame(page, gameId);
  
  await waitForPhase(page, 'VOTING');
  
  await page.screenshot({ 
    path: 'tests/visual/screenshots/voting-phase.png',
    fullPage: true 
  });
});
```

**Output:** `tests/visual/screenshots/` directory with PNG files

---

## 6. Complexity Assessment

### 6.1 Estimated Effort

**Total Estimated Time: 8-10 hours**

Breakdown:
- **Playwright Configuration** - 30 min
  - Create `playwright.config.ts`
  - Configure web server, timeout, parallelization
  
- **Test Helpers** - 1 hour
  - Write `game-helpers.ts` (8 helper functions)
  - Test helpers manually
  
- **Fast Tests (5 scenarios)** - 2-3 hours
  - 01-lobby.spec.ts - 30 min
  - 02-game-creation.spec.ts - 30 min
  - 03-game-page-load.spec.ts - 20 min
  - 04-sse-connection.spec.ts - 40 min (includes reconnection test)
  - 05-player-grid.spec.ts - 30 min
  - 09-roles.spec.ts - 20 min
  
- **Slow Tests (3 scenarios)** - 3-4 hours
  - 06-phase-changes.spec.ts - 1.5 hours (complex waiting logic)
  - 07-messages.spec.ts - 1 hour
  - 08-votes.spec.ts - 1 hour
  
- **Very Slow Test (1 scenario)** - 1.5-2 hours
  - 11-full-game.spec.ts - 2 hours (end-to-end validation)
  
- **Visual Regression Tests (3 scenarios)** - 30 min
  - game-phases.spec.ts - 30 min (3 screenshots)
  
- **Debugging & Flakiness Fixes** - 1-2 hours
  - Fix timing issues
  - Add retries
  - Improve waiting strategies

---

### 6.2 Risk Level

**Overall Risk: MEDIUM**

**Risk Breakdown:**

| Risk Factor | Level | Mitigation |
|-------------|-------|-----------|
| **SSE Stability** | HIGH | Iteration 5 fixes + retry logic |
| **Test Flakiness** | MEDIUM | Generous timeouts + auto-waiting |
| **Long Test Duration** | LOW | Split fast/slow tests |
| **Database Cleanup** | LOW | afterEach hooks |
| **Dev Server Setup** | LOW | webServer config |
| **Playwright Learning Curve** | LOW | Good documentation + AI assist |

**Confidence Level:** 75% (Medium-High)

---

### 6.3 Critical Dependencies

**Must Be Complete Before Testing:**
1. **Iteration 5 (SSE Stability)** - Tests depend on stable SSE connection
2. **Iteration 6 (Transparency Features)** - Tests validate role badges, Mafia chat
3. **Database Setup** - Test database must exist (`mafia_test`)
4. **Environment Variables** - `.env.test` with test database URL
5. **Backend Running** - Dev server must be running on `localhost:3000`

**Blockers:**
- If SSE still unstable, tests will be flaky (timeout failures)
- If Iteration 6 incomplete, tests 09-roles and 10-mafia-chat will fail

---

## 7. Key Recommendations for Planner

### 7.1 Test Implementation Order (Recommended)

**Phase 1: Setup (30 min)**
1. Create `playwright.config.ts`
2. Create `tests/helpers/game-helpers.ts`
3. Verify Playwright installation: `npx playwright test --version`

**Phase 2: Fast Tests (2-3 hours)**
1. Write 01-lobby.spec.ts
2. Write 02-game-creation.spec.ts
3. Write 03-game-page-load.spec.ts
4. Write 04-sse-connection.spec.ts
5. Write 05-player-grid.spec.ts
6. Write 09-roles.spec.ts
7. Run fast test suite: `npx playwright test tests/e2e/0[1-5]*.spec.ts`

**Phase 3: Slow Tests (3-4 hours)**
1. Write 06-phase-changes.spec.ts
2. Write 07-messages.spec.ts
3. Write 08-votes.spec.ts
4. Write 10-mafia-chat.spec.ts
5. Run slow test suite: `npx playwright test tests/e2e/0[6-8]*.spec.ts`

**Phase 4: Very Slow Test (2 hours)**
1. Write 11-full-game.spec.ts
2. Run full test suite: `npx playwright test`

**Phase 5: Visual Tests (30 min)**
1. Write visual regression tests
2. Capture baseline screenshots

**Phase 6: CI/CD Integration (1 hour)**
1. Create `.github/workflows/playwright.yml`
2. Configure GitHub Actions to run tests on PR

---

### 7.2 Playwright MCP Integration (Optional Enhancement)

**If Playwright MCP is available:**

- Use MCP for browser automation (same commands as Playwright CLI)
- Capture performance profiles during tests
- Generate test reports via MCP

**Example MCP Usage:**
```typescript
// Via MCP
await playwright.goto('http://localhost:3000');
await playwright.click('button:has-text("Create Game")');
await playwright.waitForSelector('[data-testid="player-grid"]');
```

**Benefit:** Potentially easier debugging with MCP trace viewer

**Risk:** MCP availability uncertain - fallback to standard Playwright CLI

---

### 7.3 Component Improvements for Better Testability

**Add `data-testid` attributes to DiscussionFeed:**

```typescript
// components/DiscussionFeed.tsx
<div data-testid="discussion-feed">
  {messages.map((msg, idx) => (
    <div 
      key={msg.id} 
      data-testid={`message-${idx}`}
      data-message-id={msg.id}
      data-player-name={msg.player.name}
    >
      {/* ... */}
    </div>
  ))}
</div>
```

**Add `data-testid` to ConnectionStatus:**

```typescript
// components/ConnectionStatus.tsx
<div data-testid="connection-status">
  <div className={isConnected ? 'bg-green-500' : 'bg-red-500'} />
</div>
```

**Benefit:** More robust selectors, less fragile tests

---

### 7.4 Test Data & Fixtures

**Create test fixtures for predictable games:**

```typescript
// tests/fixtures/test-data.ts
export const SMALL_GAME = {
  playerCount: 8,
  expectedMafia: 2,
  expectedVillagers: 6,
  expectedRounds: 3, // Typical
};

export const LARGE_GAME = {
  playerCount: 12,
  expectedMafia: 4,
  expectedVillagers: 8,
  expectedRounds: 4,
};
```

**Usage in tests:**
```typescript
import { SMALL_GAME } from '../fixtures/test-data';

test('Small game completes', async ({ page }) => {
  const gameId = await createGame(SMALL_GAME.playerCount);
  // ...
});
```

---

### 7.5 CI/CD Pipeline Configuration

**GitHub Actions Workflow (`.github/workflows/playwright.yml`):**

```yaml
name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
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
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup database
        run: |
          npm run db:migrate
          npm run db:generate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/mafia_test
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run Fast Tests
        run: npx playwright test tests/e2e/0[1-5]*.spec.ts
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/mafia_test
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Run Slow Tests (on main branch only)
        if: github.ref == 'refs/heads/main'
        run: npx playwright test tests/e2e/0[6-9]*.spec.ts
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/mafia_test
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

**Strategy:**
- Fast tests run on every PR (~2 min)
- Slow tests run only on main branch (~15 min)
- Very slow test (full game) runs nightly (separate workflow)

---

### 7.6 Acceptance Criteria Checklist

**Iteration 7 Success Criteria:**

- [ ] All 11 Playwright E2E tests written
- [ ] Fast tests (<5 min total) pass consistently
- [ ] Slow tests (~15 min total) pass consistently
- [ ] Visual regression tests capture 3+ screenshots
- [ ] CI/CD pipeline configured (GitHub Actions)
- [ ] Test report generated (HTML + JSON)
- [ ] Zero flaky tests (3 consecutive runs, 100% pass rate)
- [ ] Test helpers documented in README
- [ ] Database cleanup works (no test data leakage)
- [ ] SSE reconnection tested and works

---

## 8. Testing Infrastructure Readiness Summary

### 8.1 Infrastructure Scorecard

| Component | Status | Readiness | Notes |
|-----------|--------|-----------|-------|
| **Playwright Installed** | ✅ Ready | 100% | `@playwright/test@1.56.0` |
| **Test Configuration** | ❌ Missing | 0% | Need `playwright.config.ts` |
| **Test Helpers** | ❌ Missing | 0% | Need `game-helpers.ts` |
| **E2E Test Files** | ❌ Missing | 0% | Need 11 `*.spec.ts` files |
| **Component Testability** | ✅ Excellent | 95% | `data-testid` attributes present |
| **SSE Stability** | ✅ Fixed (Iter 5) | 85% | Stable but needs retry logic |
| **Phase Timing Known** | ✅ Documented | 100% | Clear phase durations |
| **CI/CD Pipeline** | ❌ Missing | 0% | Need GitHub Actions workflow |
| **Database Cleanup** | ⚠️ Needs Setup | 50% | Standard practice, needs hooks |
| **Visual Regression** | ❌ Missing | 0% | Need screenshot tests |

**Overall Readiness: 45%** (Infrastructure exists, implementation needed)

---

### 8.2 Estimated Timeline

**Total Time: 8-10 hours**

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Setup** | Config + helpers | 1 hour |
| **Fast Tests** | 6 tests | 2-3 hours |
| **Slow Tests** | 4 tests | 3-4 hours |
| **Very Slow Test** | 1 test | 2 hours |
| **Visual Tests** | 3 tests | 30 min |
| **CI/CD** | GitHub Actions | 1 hour |
| **Buffer** | Debugging + fixes | 1-2 hours |

**Confidence: 75%** - Timeline is realistic with experienced Playwright developer

---

### 8.3 Critical Success Factors

**Must-Haves:**
1. ✅ Stable SSE connection (Iteration 5 fix)
2. ✅ Transparent features complete (Iteration 6)
3. ✅ Clear phase timing (documented)
4. ⚠️ Generous timeouts (need to configure)
5. ⚠️ Test database setup (need to create)

**Nice-to-Haves:**
- Playwright MCP integration (optional)
- Visual diffing automation (manual review ok)
- Cross-browser testing (Chrome-only ok for MVP)

---

## 9. Final Recommendations

### 9.1 For the Planner

1. **Allocate 10 hours for Iteration 7** (8-hour estimate + 2-hour buffer)
2. **Split into 2 sub-tasks:**
   - Sub-task A: Fast tests + setup (4 hours)
   - Sub-task B: Slow tests + CI/CD (6 hours)
3. **Mark slow tests as optional for CI** (run nightly, not on every PR)
4. **Accept that full game test is slow** (~10 min) - this is expected
5. **Consider adding retry logic** for flaky SSE connection tests
6. **Budget time for debugging** - first E2E tests always reveal edge cases

---

### 9.2 For the Builder

1. **Start with setup + fast tests** - immediate feedback loop
2. **Use test helpers religiously** - don't duplicate waiting logic
3. **Add console.log statements** in helpers for debugging
4. **Run tests individually first** before running full suite
5. **Take screenshots on failure** (built into Playwright)
6. **Don't fight timeouts** - if test needs 5 minutes, give it 5 minutes
7. **Test SSE reconnection explicitly** - this is a critical feature
8. **Document any flakiness** in test comments for future debugging

---

### 9.3 For Future Maintenance

1. **Update timeouts if phase durations change** (e.g., faster discussion)
2. **Add new test when adding features** (test coverage maintenance)
3. **Review visual screenshots regularly** (manual diff checking)
4. **Keep test database clean** (periodic truncation)
5. **Monitor CI test duration** - if >30 min, split further

---

## Appendix A: Test Scenario Breakdown

### Fast Tests (Target: <30s each)

| Test ID | Scenario | Expected Duration | Complexity |
|---------|----------|-------------------|------------|
| 01 | Lobby loads | 10s | LOW |
| 02 | Game creation | 15s | LOW |
| 03 | Game page load | 10s | LOW |
| 04 | SSE connection | 20s | MEDIUM |
| 05 | Player grid | 15s | LOW |
| 09 | Roles visible | 10s | LOW |

**Total Fast Tests: ~2 min (parallel) or ~40s (with 3 workers)**

---

### Slow Tests (Target: <10 min each)

| Test ID | Scenario | Expected Duration | Complexity |
|---------|----------|-------------------|------------|
| 06 | Phase changes | 6 min | HIGH |
| 07 | Messages appear | 3 min | MEDIUM |
| 08 | Votes display | 5 min | MEDIUM |
| 10 | Mafia chat | 1 min | MEDIUM |

**Total Slow Tests: ~15 min (sequential)**

---

### Very Slow Test (Target: ~10 min)

| Test ID | Scenario | Expected Duration | Complexity |
|---------|----------|-------------------|------------|
| 11 | Full game flow | 10 min | VERY HIGH |

**Total Very Slow Tests: ~10 min (run rarely)**

---

## Appendix B: SSE Event Types Reference

**Events emitted during game:**

| Event Type | Frequency | Payload |
|------------|-----------|---------|
| `phase_change` | Every phase (every 45s-3min) | `{ from, to, round, phaseStartTime }` |
| `message` | ~40-50 per game | `{ playerId, playerName, message, turn, roundNumber }` |
| `night_message` | ~3-5 per Night phase | `{ playerId, playerName, message, roundNumber, turn }` |
| `vote_cast` | 8-12 per Voting phase | `{ voterId, voterName, targetId, targetName, justification }` |
| `player_eliminated` | 1-2 per round | `{ playerId, eliminationType, round }` |
| `game_over` | Once per game | `{ winner, reason }` |

**Critical for testing:** All events must arrive via SSE for tests to pass.

---

## Appendix C: Component Data-Testid Reference

**Complete list of `data-testid` attributes available:**

| Component | data-testid | Purpose |
|-----------|-------------|---------|
| PlayerGrid | `player-grid` | Container |
| PlayerGrid | `player-card-{name}` | Individual player card |
| PlayerGrid | `player-role-badge-{name}` | Role badge (Mafia/Villager) |
| PhaseIndicator | `phase-indicator` | Container |
| PhaseTimeline | `phase-timeline` | Timeline container |
| MafiaChatPanel | `mafia-chat-panel` | Container |
| MafiaChatPanel | `mafia-message-{index}` | Individual message |
| VoteTally | `vote-tally` | Container |
| VoteTally | `vote-entry` | Individual vote entry |

**Missing data-testid attributes:**
- DiscussionFeed (needs to be added)
- ConnectionStatus (needs to be added)

---

**End of Explorer-1 Report**

---

**Report Generated:** October 13, 2025
**Explorer:** Explorer-1 (Testing Infrastructure Analysis)
**Plan:** plan-2
**Iteration:** 7 (E2E Testing & Polish)
**Confidence Level:** 75% (Medium-High)
**Risk Assessment:** MEDIUM (mitigated by prior stability fixes)
**Estimated Implementation Time:** 8-10 hours
