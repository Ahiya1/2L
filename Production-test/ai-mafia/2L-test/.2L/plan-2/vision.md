# Project Vision: AI Mafia - Full Transparency Frontend & Critical Fixes

**Created:** 2025-10-13T13:45:00Z
**Plan:** plan-2
**Status:** VISIONED

---

## Problem Statement

The AI Mafia game (Plan 1/Iteration 4) has **critical frontend issues** preventing spectators from experiencing the game properly:

**Current pain points:**
- **SSE completely broken** - No real-time updates, phases only change on manual refresh
- **Messages not appearing** - Discussion feed empty despite 44 messages being generated in backend
- **Timer resets on refresh** - Frontend timer doesn't sync with server game state
- **Pino logging crashes** - Worker thread exits causing server instability and broken SSE connections
- **No transparency** - Spectators can't see Mafia coordination, role distribution, or full game strategy
- **No end-to-end tests** - No way to validate frontend functionality works correctly

**Impact:** The game backend works perfectly (validated in Iteration 4), but the frontend is unusable.

---

## Target Users

**Primary user:** Spectators watching AI Mafia game
- Want to see strategic gameplay unfold in real-time
- Interested in both public discussion AND private Mafia coordination
- Need full transparency since all players are AI (no human deception to preserve)

**Secondary users:** Developers (us)
- Need stable logging for debugging
- Need automated tests to prevent regressions

---

## Core Value Proposition

**"Watch AI agents play Mafia with full strategic transparency and real-time updates that actually work."**

**Key benefits:**
1. **Real-time experience** - See messages, votes, and phase changes as they happen (no refresh needed)
2. **Full transparency** - Watch Mafia strategy in private chat, see all roles from start
3. **Stable system** - No crashes, proper logging, tested functionality
4. **Rich spectator UI** - Beautiful visualizations of strategy, votes, roles, and game flow

---

## Feature Breakdown

### Must-Have (Critical Fixes - Priority 1)

#### 1. **Fix Logging System**
   - **Description:** Replace broken Pino logger that causes worker thread crashes
   - **User story:** As a developer, I need stable logging so the server doesn't crash and SSE connections work
   - **Acceptance criteria:**
     - [ ] No "worker has exited" errors in logs
     - [ ] Server runs without uncaught exceptions
     - [ ] SSE connections stable for 10+ minutes
     - [ ] Logs are readable and structured (JSON or similar)
   - **Solution:** Revert to console.log temporarily OR fix Pino configuration OR switch to Winston/simpler logger
   - **Priority:** CRITICAL (blocks everything else)

#### 2. **Fix Server-Sent Events (SSE)**
   - **Description:** Restore real-time updates for phases, messages, votes, and game events
   - **User story:** As a spectator, I want to see the game update in real-time without refreshing
   - **Acceptance criteria:**
     - [ ] SSE endpoint `/api/game/[gameId]/stream` works reliably
     - [ ] Messages appear in discussion feed immediately when generated
     - [ ] Phase changes trigger UI updates automatically
     - [ ] Vote tallies update in real-time during voting phase
     - [ ] Connection status indicator shows "Connected" (green)
     - [ ] Reconnection works if connection drops
     - [ ] No polling fallback needed (or fallback works if SSE fails)
   - **Priority:** CRITICAL

#### 3. **Fix Timer Synchronization**
   - **Description:** Phase timers should sync with server state, not reset on refresh
   - **User story:** As a spectator, I want to see accurate time remaining in each phase
   - **Acceptance criteria:**
     - [ ] Timer displays time remaining from server-side phase end time
     - [ ] Refreshing page shows same time remaining (syncs with server)
     - [ ] Timer countdown is smooth (1-second intervals)
     - [ ] Timer shows correct phase duration (Night: 45s, Discussion: 5min, etc.)
   - **Priority:** HIGH

#### 4. **Verify Message Display**
   - **Description:** Discussion feed should show all generated messages
   - **User story:** As a spectator, I want to read every agent's discussion messages
   - **Acceptance criteria:**
     - [ ] All 40+ messages appear in feed during discussion phase
     - [ ] Messages show speaker name, message text, timestamp
     - [ ] Messages are properly ordered (chronological)
     - [ ] Scroll behavior works (auto-scroll to new messages)
     - [ ] Can scroll up to read previous messages
   - **Priority:** CRITICAL

#### 5. **Fix API Endpoints**
   - **Description:** Ensure all API routes work without errors
   - **User story:** As a developer, I need all APIs to return correct data
   - **Acceptance criteria:**
     - [ ] `/api/game/create` creates game successfully
     - [ ] `/api/game/[gameId]/start` starts game without crashes
     - [ ] `/api/game/[gameId]/state` returns current game state
     - [ ] `/api/game/[gameId]/messages` returns discussion messages
     - [ ] `/api/game/[gameId]/votes` returns vote data
     - [ ] No 500 errors in any endpoint
   - **Priority:** HIGH

---

### Must-Have (Transparency Features - Priority 2)

#### 6. **Display Player Roles from Start**
   - **Description:** Show each player's role (Mafia/Villager) from the beginning
   - **User story:** As a spectator, I want to know who's Mafia so I can evaluate their strategy
   - **Acceptance criteria:**
     - [ ] Player grid shows role badges (red "Mafia" badge, blue "Villager" badge)
     - [ ] Roles visible immediately when game starts
     - [ ] Role assignment shown in game start announcement
     - [ ] Player cards color-coded (red border for Mafia, blue for Villager)
   - **Priority:** MEDIUM
   - **Design decision:** Full transparency - no hidden roles since it's spectator-only

#### 7. **Show Mafia Private Night Chat**
   - **Description:** Display Mafia coordination during Night phase to spectators
   - **User story:** As a spectator, I want to see Mafia agents coordinate their kill target
   - **Acceptance criteria:**
     - [ ] "Mafia Chat" panel visible during Night phase
     - [ ] Shows Mafia agents' private discussion messages
     - [ ] Updates in real-time as Mafia agents strategize
     - [ ] Shows final kill target decision
     - [ ] Panel hidden/collapsed during Day phases (or grayed out with "No Mafia activity")
   - **Priority:** MEDIUM
   - **UI Layout:**
     - **Option A (Recommended):** Split screen during Night - Discussion feed on left, Mafia chat on right
     - **Option B:** Tabbed view - Toggle between "Public Discussion" and "Mafia Coordination"
     - **Option C:** Inline with special styling - Mafia messages in main feed with red background

#### 8. **Enhanced Phase Visualization**
   - **Description:** Better visual indicators for game phases and transitions
   - **User story:** As a spectator, I want to easily see what phase the game is in
   - **Acceptance criteria:**
     - [ ] Large phase banner at top showing current phase
     - [ ] Visual timeline showing phase progression (Night → Day → Discussion → Voting)
     - [ ] Phase transitions have smooth animations
     - [ ] Round number prominently displayed
     - [ ] Phase icons/colors (Night=moon, Day=sun, Discussion=chat, Voting=ballot)
   - **Priority:** MEDIUM

#### 9. **Role-Colored Player Cards**
   - **Description:** Visual distinction between Mafia and Villagers in player grid
   - **User story:** As a spectator, I want to quickly identify who's Mafia at a glance
   - **Acceptance criteria:**
     - [ ] Mafia player cards have red border/background
     - [ ] Villager player cards have blue border/background
     - [ ] Dead players are grayed out but role color still visible
     - [ ] Personality traits shown on hover/click
     - [ ] Speaking indicator when agent is generating message
   - **Priority:** LOW

#### 10. **Enhanced Vote Visualization**
   - **Description:** Better display of voting patterns and results
   - **User story:** As a spectator, I want to understand voting dynamics and see patterns
   - **Acceptance criteria:**
     - [ ] Vote tally shows votes in real-time as agents vote
     - [ ] Visual indicators for majority threshold (e.g., "5 votes needed")
     - [ ] Vote history panel showing all previous rounds' votes
     - [ ] Highlight voting patterns (who votes together frequently)
     - [ ] Show vote justifications inline with vote counts
   - **Priority:** LOW

---

### Must-Have (Testing - Priority 3)

#### 11. **Playwright End-to-End Tests**
   - **Description:** Automated tests using Playwright MCP to validate frontend functionality
   - **User story:** As a developer, I need automated tests to catch regressions
   - **Acceptance criteria:**
     - [ ] Test: Lobby loads and game can be created
     - [ ] Test: Game page loads and shows player grid
     - [ ] Test: Messages appear in discussion feed during game
     - [ ] Test: Phase changes are reflected in UI
     - [ ] Test: Vote tally displays correctly
     - [ ] Test: Game over screen shows final results and roles
     - [ ] Test: Timer countdown works
     - [ ] Test: SSE connection status indicator
     - [ ] All tests pass in CI/CD pipeline
   - **Priority:** HIGH
   - **Tools:** Playwright MCP (already available), run against localhost dev server

#### 12. **Visual Regression Testing**
   - **Description:** Screenshot-based tests to catch UI layout issues
   - **User story:** As a developer, I want to ensure UI looks correct across changes
   - **Acceptance criteria:**
     - [ ] Playwright screenshots of lobby, game page, results page
     - [ ] Visual diff detection for layout changes
     - [ ] Screenshots for each phase (Night, Day, Discussion, Voting)
   - **Priority:** LOW

---

### Should-Have (Post-MVP Enhancements)

1. **Game Replay Mode** - Scrub through completed game timeline
2. **Accusation Network Graph** - Visual graph of who accused whom
3. **Strategic Highlights** - AI-detected "key moments" in game
4. **Player Performance Stats** - Aggregate stats across multiple games
5. **Export Transcript** - Download game transcript as PDF/JSON
6. **Multiple Concurrent Games** - Watch multiple games side-by-side

---

### Could-Have (Future Ideas)

1. **Voice Narration** - AI narrator describes key events
2. **Betting/Predictions** - Spectators guess who will win
3. **Custom Agent Personalities** - User-defined personality traits
4. **Special Roles** - Detective, Doctor, etc.
5. **Mobile Responsive Design** - Watch on phone/tablet

---

## User Flows

### Flow 1: Happy Path - Watch Full Game

**Steps:**
1. User navigates to lobby (`http://localhost:3001/`)
2. User selects player count (10) and clicks "Start Game"
3. System creates game and navigates to `/game/[gameId]`
4. User sees:
   - Player grid with 10 players, roles visible (3 Mafia in red, 7 Villagers in blue)
   - Phase indicator: "NIGHT" with moon icon and 45s timer
   - Mafia Chat panel showing Mafia coordination
5. After 45s, phase changes to "DAY_ANNOUNCEMENT"
   - Banner: "Agent X was eliminated by the Mafia"
   - Agent X card grayed out
6. Phase changes to "DISCUSSION" (3-5 min timer)
   - Messages start appearing in discussion feed in real-time
   - User sees agents accusing each other, building cases
   - 40+ messages over 5 minutes
7. Phase changes to "VOTING"
   - Vote tally appears showing live vote counts
   - Each agent votes with justification
   - Majority vote eliminates a player
8. Phase changes to "WIN_CHECK"
   - If win condition met: Navigate to results page
   - If not: Next round starts (back to NIGHT)
9. Game over screen shows:
   - Winner announcement (Mafia or Villagers won)
   - Full role reveal (redundant since visible from start)
   - Complete game transcript

**Edge cases:**
- SSE connection drops: Reconnection indicator appears, system retries connection
- User refreshes during game: Page reloads, syncs with server state (correct phase, timer, messages)
- Very long game (10+ rounds): Performance stays stable, message scrolling works

**Error handling:**
- Game not found: "Game not found" error page with back to lobby button
- Server error: Error banner with "Refresh" button
- API timeout: Retry with exponential backoff, show loading spinner

---

### Flow 2: Developer Testing with Playwright

**Steps:**
1. Developer runs `npm run test:e2e` (triggers Playwright tests)
2. Test suite starts:
   - Opens browser via Playwright MCP
   - Navigates to localhost:3001
   - Creates game via UI
   - Waits for game to start
   - Validates player grid renders
   - Waits for messages to appear (polls every 2s for 30s)
   - Validates phase transitions
   - Checks vote tally display
   - Waits for game over
   - Validates results page
3. Test suite reports:
   - All tests pass: Green checkmark
   - Any test fails: Screenshot + error log

**Edge cases:**
- Dev server not running: Test fails immediately with clear error
- Game takes too long: Test has timeout (10 min max)
- Flaky test: Retry logic (up to 3 retries)

---

## Data Model Overview

**No changes to existing schema** - all data structures already exist from Plan 1.

**Key entities used:**
1. **Game** - Tracks phase, round, status
2. **Player** - Name, role, isAlive, personality
3. **DiscussionMessage** - Agent messages during discussion
4. **NightMessage** - Mafia private coordination (already exists, just needs frontend display)
5. **Vote** - Vote records with justifications
6. **GameEvent** - Phase transitions, eliminations

**New data needed:**
- None - all transparency features use existing data

---

## Technical Requirements

### Must Support

**Logging:**
- Structured logging (JSON or similar format)
- No worker thread crashes
- Performant (doesn't slow down server)

**Real-time Updates:**
- SSE endpoint stability for 10+ minute games
- Automatic reconnection with state catchup
- Polling fallback if SSE unavailable

**Frontend Framework:**
- Next.js 14 App Router (existing)
- React Server Components + Client Components
- Tailwind CSS for styling

**Testing:**
- Playwright MCP for E2E tests
- Vitest for unit tests (from Iteration 4)
- Test coverage >70% for new frontend code

### Constraints

- Must work with existing PostgreSQL database
- Must use existing API endpoints (fix, don't rebuild)
- Must maintain Iteration 4 backend code (don't break critical bug fix)
- Dev environment: Supabase Local + Next.js dev server

### Preferences

- **Logging solution:** Revert to console.log for stability, can improve later
- **SSE implementation:** Keep existing structure, just fix bugs
- **UI framework:** No new frameworks - use existing Tailwind + shadcn/ui components
- **Testing strategy:** Focus on critical paths first, expand coverage later

---

## Success Criteria

### The MVP is successful when:

1. **Real-time Updates Work Flawlessly**
   - Metric: SSE connection stays alive for full 10-minute game
   - Target: 100% uptime, no reconnections needed
   - Validation: Run 5 full games, no SSE drops

2. **All Messages Display Correctly**
   - Metric: Message count in UI matches database count
   - Target: 100% of messages appear in feed
   - Validation: Game generates 44 messages, UI shows all 44

3. **Timer Syncs with Server**
   - Metric: Time remaining matches server calculation (±2 seconds)
   - Target: Timer never resets on refresh
   - Validation: Refresh page 10 times during game, timer stays consistent

4. **Transparency Features Visible**
   - Metric: Roles visible, Mafia chat visible during Night phase
   - Target: All spectators can see full game state
   - Validation: Manual inspection of 3 games

5. **No Server Crashes**
   - Metric: Zero uncaught exceptions during game
   - Target: Server runs full game without crashes
   - Validation: Run 10 consecutive games, no crashes

6. **Playwright Tests Pass**
   - Metric: All E2E tests pass on localhost
   - Target: 100% pass rate
   - Validation: `npm run test:e2e` exits with code 0

7. **Frontend Performance**
   - Metric: Page load time, message rendering speed
   - Target: <2s initial load, <100ms per message render
   - Validation: Lighthouse performance score >80

---

## Out of Scope

**Explicitly not included in Plan 2:**

- Human players (still 100% AI agents)
- Mobile responsive design (desktop-first)
- Multiple concurrent games
- Game replay mode with timeline scrubbing
- Advanced analytics/visualizations (accusation graphs, voting patterns)
- Special roles (Detective, Doctor, etc.)
- Deployment to production (Railway/Vercel) - still local dev only
- Agent SDK migration (that was a false premise from Iteration 4)

**Why:** Focus on fixing core functionality and adding transparency. Advanced features come later.

---

## Assumptions

1. Iteration 4 backend code is stable (critical bug fix works)
2. PostgreSQL database schema is correct and complete
3. Playwright MCP is available and working
4. Dev environment (Supabase Local) is stable
5. Real Claude API key is available for testing

---

## Open Questions

1. **Logging solution:** Revert to console.log OR fix Pino OR switch to Winston?
   - **Decision:** Will be made during planning/exploration phase

2. **Mafia chat UI layout:** Split screen OR tabs OR inline?
   - **Decision:** Will be prototyped during building, likely split screen

3. **Test coverage target:** How much Playwright testing is enough?
   - **Decision:** Critical paths first (lobby → game → results), expand if time allows

---

## Iteration Strategy (Preliminary)

**Expected Complexity:** HIGH (frontend + testing + fixes)

**Estimated Time:** 25-35 hours

**Suggested Iterations:**
- **Iteration 1:** Fix logging + SSE + timer (critical fixes)
- **Iteration 2:** Add transparency features (Mafia chat, role display, enhanced UI)
- **Iteration 3:** Playwright testing + polish

**OR Single Iteration:**
- If explorers determine fixes are straightforward, could be done in 1 comprehensive iteration

**Dependencies:**
- Must not break Iteration 4 backend code
- Must maintain database schema compatibility

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning (or `/2l-mvp` to auto-plan)
- [ ] Explore codebase to understand SSE implementation
- [ ] Determine logging solution (quick test: revert Pino vs fix config)
- [ ] Create Playwright test scaffold

---

**Vision Status:** VISIONED
**Ready for:** Master Planning
**Plan ID:** plan-2
**Depends on:** plan-1 (backend must remain stable)
