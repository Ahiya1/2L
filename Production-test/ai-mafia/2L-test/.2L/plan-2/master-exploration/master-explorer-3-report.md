# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points (Transparency Features)

## Vision Summary
Fix critical frontend SSE issues and add full transparency features (roles, Mafia chat, enhanced phase visualization) to make AI Mafia game spectator-friendly.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 12 features (5 critical fixes + 5 transparency features + 2 testing features)
- **User stories/acceptance criteria:** 87 acceptance criteria across all features
- **Estimated total work:** 25-35 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **15 distinct features** with clear separation between critical fixes (Priority 1) and transparency enhancements (Priority 2)
- **Frontend-heavy work** requiring both real-time data flow fixes and new UI components
- **Requires debugging existing SSE infrastructure** rather than building from scratch
- **Data model already complete** - all transparency data exists in database (NightMessage table, Player.role field)
- **No backend changes required** - purely frontend integration work

---

## Architectural Analysis

### Major Components Identified

1. **SSE (Server-Sent Events) System**
   - **Purpose:** Real-time updates for game state, messages, votes, and phase transitions
   - **Complexity:** HIGH
   - **Why critical:** Entire frontend experience depends on SSE reliability. Currently broken with "worker has exited" errors.
   - **Current state:** Infrastructure exists (`/api/game/[gameId]/stream`, GameEventsContext) but connection drops, messages don't appear
   - **Integration points:**
     - Backend: gameEventEmitter (emits events)
     - Frontend: GameEventsContext (consumes SSE stream)
     - Components: All game components (PhaseIndicator, DiscussionFeed, VoteTally, PlayerGrid)

2. **Logging System**
   - **Purpose:** Debugging and production monitoring
   - **Complexity:** LOW
   - **Why critical:** Broken Pino logger causes worker thread crashes which breaks SSE connections
   - **Current state:** Using Pino with pino-pretty transport, causing instability
   - **Integration points:**
     - All backend modules (28 files import logger)
     - SSE endpoint stability depends on logger not crashing

3. **Timer Synchronization**
   - **Purpose:** Display accurate phase countdown timers
   - **Complexity:** MEDIUM
   - **Why critical:** Poor UX when timer resets on refresh
   - **Current state:** PhaseIndicator exists but calculates time client-side, doesn't sync with server phaseEndTime
   - **Integration points:**
     - Backend: Game.phaseStartTime, Game.phaseEndTime fields exist
     - Frontend: PhaseIndicator component needs to fetch and use server times

4. **Transparency Display System (NEW)**
   - **Purpose:** Show roles, Mafia chat, and enhanced visualizations to spectators
   - **Complexity:** MEDIUM
   - **Why critical:** Core value proposition of Plan 2 - full transparency for AI-only games
   - **Current state:** Data exists in database, components need transparency mode
   - **Integration points:**
     - PlayerGrid: Add role badges (currently shows "Role: ?")
     - New component: MafiaChatPanel (displays NightMessage table during Night phase)
     - PhaseIndicator: Enhanced with better icons and descriptions (already partially done)

5. **API Endpoints for Night Messages (NEW)**
   - **Purpose:** Fetch Mafia private chat for transparency
   - **Complexity:** LOW
   - **Why critical:** No existing endpoint to fetch NightMessages for live game (only in results)
   - **Current state:**
     - `/api/game/[gameId]/messages` - excludes NightMessages (privacy guarantee for non-transparency mode)
     - `/api/game/[gameId]/results` - includes NightMessages but only after game over
   - **Integration points:** Need new endpoint `/api/game/[gameId]/night-messages` or query param `?includeNight=true`

6. **Playwright Testing Infrastructure (NEW)**
   - **Purpose:** Automated E2E tests to prevent regressions
   - **Complexity:** MEDIUM
   - **Why critical:** Manual testing insufficient, need CI/CD validation
   - **Current state:** Playwright MCP available, no tests written yet
   - **Integration points:**
     - Test against localhost:3001
     - Create game, start game, validate messages appear
     - Screenshot tests for visual regression

---

## User Experience Analysis

### Critical User Flows

#### Flow 1: Real-Time Updates (BROKEN - Priority 1)

**Current Experience (BROKEN):**
1. User navigates to `/game/[gameId]`
2. SSE connection drops immediately or never connects
3. Phase shows "NIGHT" but never updates
4. Discussion feed shows "Waiting for discussion..." forever
5. User refreshes → timer resets, no messages appear
6. User sees connection status: "Disconnected" (red)

**Target Experience (FIXED):**
1. User navigates to `/game/[gameId]`
2. SSE connects (connection status: green "Connected")
3. Phase changes: NIGHT → DAY_ANNOUNCEMENT → DISCUSSION
4. Messages stream in real-time (44+ messages appear over 3-5 minutes)
5. Vote tally updates live during VOTING phase
6. User refreshes → same phase, same timer value, same messages (synced with server)

**Integration Points:**
- GameEventsContext: Manages SSE connection lifecycle
- PhaseIndicator: Subscribes to phase_change events
- DiscussionFeed: Subscribes to message events
- VoteTally: Subscribes to vote_cast events
- ConnectionStatus: Shows SSE connection state

**Complexity Drivers:**
- Debugging SSE drops (Pino logger crashes)
- Ensuring reconnection logic works
- State catchup on mount (fetch initial state + queue events)
- Timer sync with server

---

#### Flow 2: Transparency - Mafia Chat Visibility (NEW - Priority 2)

**Current Experience:**
- Mafia coordination is hidden
- Spectators can't understand Mafia strategy
- Game feels one-sided (only see public discussion)

**Target Experience:**
1. Game starts → Player grid shows role badges (3 red "Mafia", 7 blue "Villager")
2. Night phase begins → Mafia Chat panel appears (split screen layout)
3. Mafia agents strategize in private → Messages appear in real-time
4. Mafia selects kill target → Final decision shown in chat
5. Day phase begins → Mafia Chat panel grays out ("No Mafia activity during day")
6. Next night → Mafia Chat reactivates

**Integration Points:**
- New API endpoint: `/api/game/[gameId]/night-messages` OR add `?includeNight=true` to existing messages endpoint
- New component: MafiaChatPanel (similar to DiscussionFeed but filters NightMessages)
- GameEventsContext: Emit night_message events (similar to message events)
- Layout: Split screen during Night (Discussion feed left, Mafia chat right)

**UI Layout Decision:**
- **Option A (Recommended):** Split screen during Night phase
  - Left: Discussion feed (may be empty during night)
  - Right: Mafia Chat panel
  - Pro: Both visible simultaneously, easy to compare
  - Con: Tight on mobile

- **Option B:** Tabbed view
  - Toggle between "Public Discussion" and "Mafia Coordination"
  - Pro: More space per panel
  - Con: Must switch tabs, can't see both at once

- **Option C:** Inline with special styling
  - Mafia messages in main feed with red background
  - Pro: Single feed, chronological order
  - Con: Confusing distinction, cluttered

**Recommendation:** Split screen (Option A) for desktop, stack vertically for mobile

**Complexity Drivers:**
- New API endpoint design
- SSE event emission for night messages
- Layout changes (responsive split screen)
- State management (show/hide Mafia panel based on phase)

---

#### Flow 3: Enhanced Phase Visualization (NEW - Priority 2)

**Current Experience:**
- PhaseIndicator shows phase name, icon, timer
- Basic styling, minimal context
- Phase descriptions exist but generic

**Target Experience:**
1. Large phase banner with animated transitions
2. Visual timeline: NIGHT → DAY → DISCUSSION → VOTING (progress indicator)
3. Round counter: "Round 1 / 40" with progress bar
4. Phase-specific colors: Purple (Night), Orange (Day), Blue (Discussion), Red (Voting)
5. Icons: Moon (Night), Sun (Day), Chat (Discussion), Ballot (Voting)
6. Descriptions: "Mafia coordinates their strategy in private" (Night phase)

**Integration Points:**
- PhaseIndicator component (already exists, needs enhancement)
- Phase config (already exists at `/app/src/lib/game/phase-config.ts`)
- CSS animations for transitions
- Timeline component (new, shows all phases with current highlighted)

**Complexity Drivers:**
- LOW - mostly CSS and UI enhancements
- Phase config already comprehensive
- Timeline component is simple progress bar
- Animations can be CSS transitions (no JS needed)

---

### Data Flow Mapping

#### Real-Time Data Flow (SSE)

```
Backend (Game Loop)
  ↓
gameEventEmitter.emit('message', { gameId, type: 'message', payload: {...} })
  ↓
SSE Route Handler (/api/game/[gameId]/stream)
  ↓ (text/event-stream)
Frontend EventSource
  ↓
GameEventsContext (receives SSE message)
  ↓
setEvents([...prev, newEvent])
  ↓
useGameEvents() hook (components subscribe)
  ↓
DiscussionFeed filters message events → displays messages
PhaseIndicator filters phase_change events → updates phase
VoteTally filters vote_cast events → updates vote counts
PlayerGrid filters player_eliminated events → grays out players
```

**Critical Dependency:** Logging system must not crash worker thread, or SSE connection breaks

---

#### Transparency Data Flow (Roles)

```
Database (Player table)
  role: "MAFIA" | "VILLAGER"
  ↓
API: /api/game/[gameId]/state
  ↓
Frontend: Initial fetch in PlayerGrid component
  ↓
Display: Badge component with role color
  Red badge: "Mafia"
  Blue badge: "Villager"
```

**Key Decision:** Show roles from game start (not just after game over)

---

#### Transparency Data Flow (Mafia Chat)

```
Database (NightMessage table)
  gameId, roundNumber, playerId, message, timestamp
  ↓
NEW API: /api/game/[gameId]/night-messages?round=N
  ↓
Frontend: MafiaChatPanel component fetches
  ↓
SSE: night_message events for real-time updates
  ↓
Display: Chat feed similar to DiscussionFeed
  "Agent-3 (Mafia): Let's target Agent-7, they're too vocal"
```

**Critical Dependency:** Need to emit night_message events from backend (currently not emitted)

---

#### Timer Synchronization Data Flow

```
Database (Game table)
  phaseStartTime: DateTime
  phaseEndTime: DateTime
  ↓
API: /api/game/[gameId]/state
  ↓
Frontend: PhaseIndicator calculates timeRemaining
  timeRemaining = phaseEndTime - Date.now()
  ↓
Update every 1 second (setInterval)
  ↓
Display: "3:42" countdown
```

**Fix Required:** Currently PhaseIndicator uses approximation (phase event timestamp), needs to use server's phaseEndTime

---

## Integration Complexity Assessment

### 1. SSE Fixes Integration

**Complexity: HIGH**

**Why Complex:**
- Root cause unclear (Pino logger vs SSE implementation vs EventEmitter)
- Multiple integration points (all components depend on SSE)
- Reconnection logic already exists but needs debugging
- State catchup on mount adds complexity

**Dependencies:**
- Logging fix MUST come before SSE fix (logger crashes break SSE)
- Timer sync depends on SSE working (needs phase_change events)
- All transparency features depend on SSE (real-time updates)

**Integration Strategy:**
1. Fix logging (Builder 1)
2. Verify SSE connects without crashes
3. Test message emission (are events being emitted at all?)
4. Test message reception (is GameEventsContext receiving events?)
5. Test component subscriptions (do components filter events correctly?)

**Risk:** If SSE issue is deeper than logging, may need to rewrite SSE implementation

---

### 2. Transparency Features Integration

**Complexity: MEDIUM**

**Why Medium:**
- Data already exists (NightMessage table, Player.role field)
- UI components follow existing patterns (DiscussionFeed → MafiaChatPanel)
- API endpoints are straightforward (query NightMessage table)
- Layout changes are CSS-based

**Dependencies:**
- Role display depends on API returning role field (already exists)
- Mafia chat depends on new API endpoint (need to add)
- Mafia chat real-time updates depend on SSE working (critical path)
- Enhanced phase visualization independent (can work without SSE)

**Integration Strategy:**
1. Role display first (easy win, no SSE required)
2. Enhanced phase visualization second (CSS work, no SSE required)
3. Mafia chat API endpoint third (backend work)
4. Mafia chat UI fourth (depends on SSE working)
5. Real-time Mafia chat updates last (requires SSE + event emission)

**Risk:** LOW - all components are additive, don't break existing functionality

---

### 3. Playwright Testing Integration

**Complexity: MEDIUM**

**Why Medium:**
- Playwright MCP available and working
- Need to write tests from scratch (no examples exist)
- Game is stateful (need to wait for phases to complete)
- Timing-sensitive (messages appear over time, not instantly)

**Dependencies:**
- SSE fixes MUST work before tests can validate real-time updates
- Tests depend on localhost dev server running
- Tests depend on real Claude API key (or need to mock)

**Integration Strategy:**
1. Write scaffold test (navigate to lobby, create game)
2. Write basic validation (player grid renders, phase indicator shows)
3. Write SSE validation (wait for messages, assert count > 0)
4. Write phase transition validation (wait for DISCUSSION → VOTING)
5. Write screenshot tests (visual regression)

**Risk:** MEDIUM - flaky tests if timing assumptions are wrong

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 phases)

**Rationale:**
- **15 distinct features** with clear priority separation
- **Critical fixes (Priority 1)** must be stable before adding transparency features
- **Testing infrastructure** needs SSE fixes to be validated
- **Natural separation:** Fixes → Features → Testing

---

### Suggested Iteration Phases

**Iteration 1: Critical Fixes (Frontend Stability)**
- **Vision:** Make the frontend actually work - SSE, messages, and timer sync
- **Scope:** Fix the 5 Priority 1 critical issues
  - Feature 1: Fix Logging System (Pino worker crash)
  - Feature 2: Fix SSE (real-time updates)
  - Feature 3: Fix Timer Synchronization
  - Feature 4: Verify Message Display (ensure all 44 messages appear)
  - Feature 5: Fix API Endpoints (no 500 errors)
- **Why first:** Nothing else matters if SSE doesn't work. Transparency features are useless without real-time updates.
- **Estimated duration:** 8-12 hours
- **Risk level:** HIGH
- **Success criteria:**
  - SSE connection stays alive for 10+ minute game
  - 100% of messages appear in feed (44/44)
  - Timer never resets on refresh (±2 seconds accuracy)
  - No server crashes during game
  - Connection status shows "Connected" (green)

**Dependencies:** None (this is the foundation)

**Deliverables:**
- Logging fix (console.log or fixed Pino config)
- SSE stability (connection stays alive)
- Timer sync with server (phaseEndTime-based calculation)
- Message display verified (44 messages in feed)
- API endpoint validation (no 500 errors)

---

**Iteration 2: Transparency Features (Spectator Experience)**
- **Vision:** Add full transparency - roles, Mafia chat, enhanced UI
- **Scope:** Implement the 5 Priority 2 transparency features
  - Feature 6: Display Player Roles from Start (role badges)
  - Feature 7: Show Mafia Private Night Chat (split screen)
  - Feature 8: Enhanced Phase Visualization (timeline, icons, animations)
  - Feature 9: Role-Colored Player Cards (red/blue borders)
  - Feature 10: Enhanced Vote Visualization (real-time tally, history)
- **Dependencies:** MUST have working SSE from Iteration 1
  - Requires: SSE connection stability
  - Requires: Message display working
  - Imports: GameEventsContext, event filtering patterns
- **Estimated duration:** 10-12 hours
- **Risk level:** MEDIUM
- **Success criteria:**
  - Roles visible from game start (badges on player cards)
  - Mafia chat panel appears during Night phase
  - Mafia messages stream in real-time (5+ messages per night)
  - Phase timeline shows progression (visual indicator)
  - Vote tally updates live (vote counts increase as agents vote)

**Deliverables:**
- Role badges in PlayerGrid (red "Mafia", blue "Villager")
- New API endpoint: `/api/game/[gameId]/night-messages`
- MafiaChatPanel component (split screen layout)
- Enhanced PhaseIndicator (timeline, better icons)
- Vote visualization improvements (history panel)

---

**Iteration 3: Testing & Polish (Quality Assurance)**
- **Vision:** Automate validation and prevent regressions
- **Scope:** Implement the 2 Priority 3 testing features + polish
  - Feature 11: Playwright E2E Tests (8 test scenarios)
  - Feature 12: Visual Regression Testing (screenshots)
  - Polish: Bug fixes, UX improvements, performance optimization
- **Dependencies:** MUST have Iterations 1 & 2 complete
  - Requires: Stable SSE (from Iteration 1)
  - Requires: All transparency features (from Iteration 2)
  - Imports: All components and API endpoints
- **Estimated duration:** 6-8 hours
- **Risk level:** LOW
- **Success criteria:**
  - 8 Playwright tests passing (lobby → game → results flow)
  - Tests validate SSE connection status
  - Tests validate message count (40+ messages)
  - Tests validate phase transitions (NIGHT → DISCUSSION → VOTING)
  - Screenshots for visual regression (lobby, game, results pages)

**Deliverables:**
- Playwright test suite (8 scenarios)
- Visual regression baseline screenshots
- CI/CD integration (GitHub Actions or similar)
- Test documentation (running tests, adding new tests)
- Performance optimizations (lazy loading, code splitting)

---

## Dependency Graph

```
Iteration 1: Critical Fixes (Frontend Stability)
├── Logging Fix (console.log or Pino fix)
├── SSE Stability (connection reliability)
│   └── Depends on: Logging fix (no crashes)
├── Timer Sync (server phaseEndTime)
│   └── Depends on: SSE working (phase_change events)
├── Message Display (44/44 messages)
│   └── Depends on: SSE working (message events)
└── API Validation (no 500 errors)
    ↓
Iteration 2: Transparency Features
├── Role Badges (independent, no SSE required)
├── Mafia Chat API (backend endpoint)
├── MafiaChatPanel UI (depends on API + SSE)
│   └── Depends on: SSE working (night_message events)
├── Enhanced Phase UI (independent, CSS-based)
└── Vote Visualization (depends on SSE vote events)
    ↓
Iteration 3: Testing & Polish
├── Playwright Tests (depends on ALL features working)
│   └── Requires: Stable SSE + Transparency features
├── Visual Regression (screenshot baseline)
└── Performance Optimization (polish)
```

---

## Risk Assessment

### High Risks

**Risk 1: SSE Root Cause Unclear**
- **Description:** Pino logging may not be the only cause of SSE failures. Could be EventEmitter issues, Next.js streaming bugs, or network configuration.
- **Impact:** If logging fix doesn't resolve SSE issues, Iteration 1 fails. All downstream work blocked.
- **Mitigation:**
  - Test SSE immediately after logging fix (don't wait for full iteration)
  - Have fallback plan: polling mode (already exists in GameEventsContext)
  - Consider alternative SSE libraries (e.g., `better-sse`, `sse-z`)
- **Recommendation:** Tackle SSE fix in first 2-3 hours of Iteration 1. If still broken after logging fix, escalate to polling mode and investigate deeper.

**Risk 2: Mafia Chat Event Emission Missing**
- **Description:** Backend may not emit `night_message` events (only `message` events for discussion). Need to add event emission to night-phase.ts.
- **Impact:** Mafia chat won't update in real-time, only on page load.
- **Mitigation:**
  - Check night-phase.ts for event emission (likely missing)
  - Add gameEventEmitter.emit('night_message', ...) after each Mafia message
  - Follow same pattern as discussion-phase.ts message emission
- **Recommendation:** Include event emission fix in Iteration 2 scope (backend work required).

---

### Medium Risks

**Risk 3: Timer Sync Accuracy**
- **Description:** phaseEndTime may not be set correctly in database, or client clock drift may cause inaccuracies.
- **Impact:** Timer shows wrong countdown, refreshing page shows different time.
- **Mitigation:**
  - Verify phaseEndTime is set when phase starts (check master-orchestrator.ts)
  - Add server clock sync (send server time with state API)
  - Use ±5 second tolerance (acceptable for spectators)
- **Recommendation:** Test timer sync with multiple devices, different timezones.

**Risk 4: Mafia Chat UI Layout on Mobile**
- **Description:** Split screen layout may be too tight on mobile (both panels cramped).
- **Impact:** Poor mobile UX, Mafia chat unreadable.
- **Mitigation:**
  - Stack panels vertically on mobile (responsive design)
  - Add collapsible panels (expand/collapse Mafia chat)
  - Test on multiple screen sizes (Playwright viewport tests)
- **Recommendation:** Design for desktop first, mobile second. Use Tailwind breakpoints (md:, lg:).

---

### Low Risks

**Risk 5: Playwright Test Flakiness**
- **Description:** Tests may fail intermittently due to timing issues (messages appear slowly, phases transition at unpredictable times).
- **Impact:** CI/CD fails randomly, reduces confidence in tests.
- **Mitigation:**
  - Use Playwright's auto-waiting (waitForSelector, waitForEvent)
  - Add generous timeouts (30s for message appearance, 5s for phase change)
  - Retry failed tests (up to 3 retries)
- **Recommendation:** Run tests multiple times locally before committing. Use Playwright's built-in retry mechanism.

---

## Technology Stack Implications

### Frontend Framework: Next.js 14 (App Router)

**Implications:**
- **SSE compatibility:** Next.js App Router supports streaming responses (Route Handlers with ReadableStream)
- **Client components:** All game UI is 'use client' (GameEventsContext, PlayerGrid, PhaseIndicator)
- **Server components:** Could use for static content (lobby, results page)
- **Trade-off:** App Router is newer, fewer SSE examples than Pages Router

**Recommendation:** Keep using App Router. SSE implementation is correct, issue is likely logging/EventEmitter, not Next.js.

---

### Real-Time: Server-Sent Events (SSE)

**Current Implementation:**
- Route Handler: `/app/app/api/game/[gameId]/stream/route.ts`
- Event Source: GameEventsContext uses `new EventSource()`
- Event Emitter: `gameEventEmitter` (Node.js EventEmitter)

**Alternatives Considered:**
- **WebSockets:** Overkill for one-way updates (server → client only)
- **Polling:** Already exists as fallback (after 5 SSE failures)
- **GraphQL Subscriptions:** Too heavy, adds complexity

**Implications:**
- **Browser support:** SSE works in all modern browsers (Chrome, Firefox, Safari)
- **Proxy issues:** Some proxies buffer SSE responses (X-Accel-Buffering header already set)
- **Reconnection:** Browser auto-reconnects, but GameEventsContext adds exponential backoff

**Recommendation:** Stick with SSE. Add detailed logging to debug connection drops. Consider `better-sse` library if EventEmitter issues persist.

---

### UI Components: shadcn/ui (Tailwind CSS)

**Current Usage:**
- Card component (containers)
- Badge component (role badges, status indicators)
- Button component (actions)

**Missing Components:**
- Timeline component (for enhanced phase visualization)
- Tabs component (if choosing tabbed Mafia chat layout)
- Collapsible component (for mobile Mafia chat)

**Implications:**
- **Consistency:** All components use Tailwind utility classes
- **Reusability:** Badge variants already exist (alive, dead, mafia, villager)
- **Customization:** Easy to add new variants (e.g., night-phase badge)

**Recommendation:**
- Build custom Timeline component (progress bar with icons)
- Use existing Badge component for role display (add "mafia" and "villager" variants)
- Consider adding Collapsible from shadcn/ui for mobile layout

---

### Database: PostgreSQL (Supabase Local)

**Current State:**
- Schema complete (Game, Player, DiscussionMessage, NightMessage, Vote, GameEvent)
- All transparency data exists (Player.role, NightMessage table)
- No schema changes required for Plan 2

**Implications:**
- **NightMessage table:** Already has gameId, roundNumber, playerId, message, timestamp, turn
- **Player.role field:** Already stores "MAFIA" or "VILLAGER"
- **Indexes:** NightMessage has index on [gameId, roundNumber, timestamp] for efficient queries

**API Query Performance:**
- Fetching NightMessages for current round: O(n) where n = ~5-10 messages per night (fast)
- Fetching all NightMessages for game: O(n) where n = ~50-100 messages for 10-round game (acceptable)

**Recommendation:** No schema changes needed. Add API endpoint to query NightMessage table with same pattern as `/api/game/[gameId]/messages`.

---

### Testing: Playwright MCP

**Implications:**
- **MCP availability:** Playwright MCP is available and working (confirmed in vision)
- **Browser automation:** Can test SSE connection, message display, phase transitions
- **Screenshot testing:** Built-in screenshot comparison for visual regression
- **CI/CD integration:** Can run in GitHub Actions (headless mode)

**Test Strategy:**
- **Critical path first:** Lobby → Game → Messages appear → Phase transitions
- **Transparency second:** Roles visible → Mafia chat appears → Vote tally updates
- **Edge cases third:** SSE reconnection → Timer sync → Refresh behavior

**Recommendation:** Use Playwright's auto-waiting features (reduces flakiness). Run tests against localhost, not production (avoid API costs).

---

## Recommendations for Master Plan

1. **Start with Iteration 1 (Critical Fixes) as highest priority**
   - SSE stability is the foundation. Nothing else matters if real-time updates don't work.
   - Logging fix is 1-2 hours max (revert to console.log or fix Pino config).
   - SSE debugging is the hard part (4-6 hours to isolate root cause).
   - Timer sync is straightforward once SSE works (2 hours).

2. **Iteration 2 can be split into sub-builders**
   - Sub-builder 2A: Role display + Enhanced phase UI (independent, no SSE required)
   - Sub-builder 2B: Mafia chat API + MafiaChatPanel (depends on SSE)
   - Sub-builder 2C: Vote visualization enhancements (depends on SSE)
   - This allows parallel work if SSE takes longer than expected.

3. **Iteration 3 is optional polish**
   - If budget is tight, skip Iteration 3 and test manually.
   - Playwright tests are valuable for CI/CD but not critical for MVP.
   - Consider Iteration 3 only if Iterations 1 & 2 finish ahead of schedule.

4. **Fallback plan if SSE can't be fixed**
   - Switch to polling mode (already exists in GameEventsContext)
   - Poll every 2 seconds (acceptable for spectators, not ideal)
   - Document that SSE is preferred but polling works as backup.

5. **Data flow is simpler than expected**
   - All transparency data exists in database (no schema changes)
   - API endpoints follow existing patterns (minimal backend work)
   - Components follow existing patterns (DiscussionFeed → MafiaChatPanel)
   - Risk is in SSE stability, not data complexity.

---

## Integration Considerations

### Cross-Phase Integration Points

**SSE Infrastructure (spans all iterations):**
- Iteration 1: Fix SSE connection stability
- Iteration 2: Extend SSE to emit night_message events
- Iteration 3: Test SSE with Playwright (validate connection status)

**GameEventsContext (shared across all components):**
- All components use useGameEvents() hook
- Consistent event filtering pattern (events.filter(e => e.type === 'message'))
- State management is centralized (no prop drilling)

**API Endpoint Patterns (consistency across features):**
- `/api/game/[gameId]/messages` (existing)
- `/api/game/[gameId]/night-messages` (new, follows same pattern)
- `/api/game/[gameId]/state` (existing, returns roles)
- Same error handling, same response format

---

### Potential Integration Challenges

**Challenge 1: SSE Event Emission Order**
- **Description:** If night_message events are emitted out of order, Mafia chat may show messages in wrong sequence.
- **Solution:** Add sequence numbers to events, sort by sequence in MafiaChatPanel.
- **Likelihood:** LOW (events are emitted synchronously in turn order)

**Challenge 2: Phase-Specific UI State**
- **Description:** Need to show/hide Mafia chat panel based on current phase. Multiple components need to know current phase.
- **Solution:** useGameEvents() hook already provides phase via events. Extract current phase in parent component, pass as prop.
- **Likelihood:** MEDIUM (requires careful state management)

**Challenge 3: Role Display Privacy Toggle**
- **Description:** Future requirement may be to toggle role visibility (hide roles for human players).
- **Solution:** Add `showRoles` prop to PlayerGrid. For Plan 2, always true (full transparency).
- **Likelihood:** LOW (Plan 2 is AI-only, no privacy needed)

**Challenge 4: Mobile Layout Responsiveness**
- **Description:** Split screen Mafia chat may be too cramped on mobile.
- **Solution:** Use Tailwind breakpoints (stack vertically on mobile, side-by-side on desktop).
- **Likelihood:** HIGH (needs testing on multiple screen sizes)

---

## User Experience Principles

### Transparency-First Design

**Principle:** Since all players are AI, there's no reason to hide information from spectators.

**Implications:**
- **Roles visible from start:** No mystery about who's Mafia (unlike human games)
- **Mafia chat public:** Spectators see Mafia strategy in real-time (like poker hole card reveal)
- **Vote justifications visible:** Understand why agents vote the way they do

**Trade-off:** Reduces suspense but increases strategic interest (see the chess game unfold).

---

### Real-Time vs Batch Updates

**Principle:** Spectators expect real-time updates (not page refreshes).

**Implications:**
- **SSE is critical:** Without real-time updates, game feels broken
- **Polling is acceptable fallback:** 2-second polling is good enough for spectators
- **Batch updates NOT acceptable:** Requiring page refresh is poor UX

**Trade-off:** Real-time adds complexity (SSE reliability, event emission) but is worth it for engagement.

---

### Information Density vs Clarity

**Principle:** Show all relevant information without overwhelming spectators.

**Implications:**
- **Split screen for Mafia chat:** Two panels is manageable (public + private)
- **Phase timeline is visual:** Icons and progress bar are clearer than text
- **Role badges are color-coded:** Red/blue is faster to scan than reading "Mafia"/"Villager"

**Trade-off:** Dense UI on desktop, need to simplify for mobile (stack panels, collapsible sections).

---

## Notes & Observations

### Observation 1: Data Model is Complete
The vision document states "No changes to existing schema" and this is accurate. All transparency data exists:
- `Player.role` field (MAFIA/VILLAGER)
- `NightMessage` table (full Mafia chat history)
- `GameEvent` table (phase transitions, eliminations)

This significantly reduces complexity. No migrations, no schema design, just API endpoints and UI.

---

### Observation 2: SSE is the Critical Path
Every transparency feature depends on real-time updates:
- Role display: Can work without SSE (static on page load)
- Mafia chat: Useless without real-time updates (need to see strategy unfold)
- Enhanced phase UI: Needs real-time phase transitions
- Vote visualization: Needs real-time vote counts

If SSE is unfixable, polling fallback must work perfectly.

---

### Observation 3: Iteration 1 is a Healing Iteration
Similar to Plan 1 Iteration 4 (which was also a healing iteration for backend bugs), Plan 2 Iteration 1 is healing frontend bugs. The parallel is striking:
- Iteration 4 fixed: Function signature mismatch, type errors, test infrastructure
- Iteration 1 (Plan 2) fixes: Logging crashes, SSE drops, timer sync

Both are "make it work" iterations, not "add features" iterations.

---

### Observation 4: Transparency is Low-Risk
Unlike SSE fixes (HIGH risk, unclear root cause), transparency features are LOW risk:
- Data exists, just need to display it
- Components follow existing patterns (DiscussionFeed → MafiaChatPanel)
- CSS-based enhancements (phase timeline, role colors)
- No tricky algorithms or complex state management

If Iteration 1 succeeds, Iteration 2 should be smooth sailing.

---

### Observation 5: Playwright Testing is Deferred
Vision document lists testing as Priority 3, which is correct. Need working features before testing them. However, testing is valuable for CI/CD and preventing regressions in future iterations.

Recommendation: If budget allows, do Iteration 3. If not, rely on manual testing and add Playwright tests in future plan.

---

## Technology Recommendations

### Logging Solution: Console.log (Simplest Fix)

**Recommendation:** Revert to `console.log` temporarily for Iteration 1.

**Rationale:**
- Pino is causing worker thread crashes (documented in vision)
- Console.log is stable, no dependencies, no worker threads
- Sufficient for debugging SSE issues during development
- Can revisit structured logging later (Winston, Pino with proper config)

**Trade-off:** Lose structured logging (JSON format, log levels), but gain stability.

**Implementation:**
1. Remove Pino imports from all files (28 files)
2. Replace `logger.info()` with `console.log('[INFO]', ...)`
3. Replace `logger.error()` with `console.error('[ERROR]', ...)`
4. Test SSE connection (should be stable without worker crashes)

**Time estimate:** 2 hours

---

### Mafia Chat API: New Endpoint (Cleanest Separation)

**Recommendation:** Create `/api/game/[gameId]/night-messages` endpoint.

**Rationale:**
- Clean separation from discussion messages
- No risk of breaking existing `/messages` endpoint (which explicitly excludes night messages)
- Can add filtering by round: `?round=N`
- Matches RESTful pattern

**Alternative:** Add query param `?includeNight=true` to existing `/messages` endpoint
- Pro: Single endpoint for all messages
- Con: Breaks existing API contract (currently guarantees NO night messages)

**Recommendation:** New endpoint is safer. Doesn't break existing behavior.

**Implementation:**
1. Copy `/api/game/[gameId]/messages/route.ts`
2. Change query: `prisma.nightMessage.findMany()` instead of `discussionMessage`
3. Same pagination, same error handling
4. Return NightMessage[] with playerName included

**Time estimate:** 1 hour

---

### Mafia Chat Layout: Split Screen (Option A)

**Recommendation:** Split screen during Night phase (Discussion feed left, Mafia chat right).

**Rationale:**
- Spectators can see both public and private activity simultaneously
- Night phase is usually quiet in public (all agents inactive), so left panel can be sparse
- Allows comparison: "Mafia is coordinating while everyone else is asleep"
- Desktop-friendly (most spectators watch on desktop)

**Mobile handling:** Stack vertically (Mafia chat above, discussion feed below).

**Implementation:**
1. Conditional layout in `/game/[gameId]/page.tsx`
2. If `currentPhase === 'NIGHT'`: Render two columns (DiscussionFeed + MafiaChatPanel)
3. If other phase: Render single column (DiscussionFeed only)
4. Use Tailwind grid: `grid grid-cols-1 lg:grid-cols-2 gap-4`

**Time estimate:** 3 hours (including MafiaChatPanel component)

---

## Final Complexity Estimate

**Overall Complexity: COMPLEX**

**Breakdown by Iteration:**
- Iteration 1 (Critical Fixes): HIGH complexity (SSE debugging is hard)
- Iteration 2 (Transparency Features): MEDIUM complexity (additive work, clear patterns)
- Iteration 3 (Testing): MEDIUM complexity (new test infrastructure, timing-sensitive)

**Total Estimated Time:** 25-35 hours
- Iteration 1: 8-12 hours (SSE fix is the wildcard)
- Iteration 2: 10-12 hours (Mafia chat, enhanced UI)
- Iteration 3: 6-8 hours (Playwright tests, polish)

**Confidence Level: 80%**
- HIGH confidence in Iteration 2 & 3 (patterns are clear, data exists)
- MEDIUM confidence in Iteration 1 (SSE root cause unclear until debugging)

---

*Exploration completed: 2025-10-13*
*This report informs master planning decisions for Plan 2*
