# 2L Iteration Plan - AI Mafia Transparency Features

**Iteration:** 6 (Global Iteration 6)
**Plan:** plan-2
**Status:** PLANNED
**Created:** 2025-10-13

---

## Project Vision

Build full transparency features for AI Mafia spectator experience, allowing viewers to see player roles from game start and observe Mafia coordination in real-time during Night phases. This iteration delivers the core spectator value proposition: watching AI agents strategize with complete transparency.

**Core Value:** "Watch AI agents play Mafia with full strategic transparency - see roles, watch Mafia coordinate, understand the game flow in real-time."

---

## Success Criteria

Specific, measurable criteria for MVP completion:

### Functional Requirements
- [ ] Player roles (Mafia/Villager) visible in player grid from game start
- [ ] Role badges color-coded (red for Mafia, blue for Villager)
- [ ] Mafia Chat panel appears during Night phase
- [ ] Mafia coordination messages display in real-time via SSE
- [ ] Mafia Chat panel hidden/grayed out during non-Night phases
- [ ] Enhanced phase visualization with icons and timeline
- [ ] Vote tally enhancements (optional: vote history panel)
- [ ] All 47 backend tests still passing (preserve Iteration 1 stability)

### Playwright Validation Requirements (CRITICAL)
- [ ] Validator uses Playwright MCP to open real browser
- [ ] Validator creates and starts a game programmatically
- [ ] Validator captures screenshot of player grid with visible role badges
- [ ] Validator waits for Night phase and verifies Mafia chat panel appears
- [ ] Validator verifies Mafia messages display in real-time (SSE working)
- [ ] Validator captures screenshot of Mafia chat panel during Night phase
- [ ] Validator verifies enhanced phase visualization displays correctly
- [ ] Validator takes screenshots as evidence of functionality
- [ ] Validation result: PASS/FAIL based on actual browser observation

### Performance Criteria
- [ ] SSE connection remains stable (no disconnects during 10-min game)
- [ ] Night messages appear with <500ms latency
- [ ] Page load time <2s
- [ ] No JavaScript errors in browser console

---

## MVP Scope

### In Scope (Iteration 6)

**Feature 6: Display Player Roles from Start**
- Show role badges (red "Mafia", blue "Villager") in PlayerGrid
- Expose Player.role field in `/api/game/[gameId]/state` endpoint
- Color-coded player cards with role borders

**Feature 7: Show Mafia Private Night Chat**
- Create `/api/game/[gameId]/night-messages` API endpoint
- Create MafiaChatPanel component (displays during Night phase)
- Emit `night_message` SSE events from backend
- Split screen layout: DiscussionFeed (left) | MafiaChatPanel (right) during Night

**Feature 8: Enhanced Phase Visualization**
- Phase timeline component showing progression (Night → Day → Discussion → Voting)
- Enhanced phase indicators with icons (moon, sun, chat, ballot)
- Smooth phase transition animations

**Feature 9: Role-Colored Player Cards**
- Red border/background for Mafia players
- Blue border/background for Villager players
- Dead players grayed out but role color visible

**Feature 10: Enhanced Vote Visualization (Optional)**
- Vote history panel showing previous rounds
- Visual majority threshold indicator
- Vote pattern highlighting (optional)

### Out of Scope (Post-MVP)
- Mobile responsive optimization (desktop-first)
- Vote pattern analysis/graphs
- Replay mode with timeline scrubbing
- Multiple concurrent games
- Custom agent personalities
- Special roles (Detective, Doctor)

---

## Development Phases

1. **Exploration** ✓ Complete (2 explorers analyzed UI components and backend APIs)
2. **Planning** 🔄 Current (this document)
3. **Building** ⏳ 8-12 hours (3 parallel builders)
4. **Integration** ⏳ 30 minutes (merge builder outputs)
5. **Validation** ⏳ 60 minutes (Playwright MCP testing - CRITICAL)
6. **Commit** ⏳ Final

---

## Timeline Estimate

- **Exploration:** Complete (Explorer 1 + Explorer 2 reports)
- **Planning:** Complete (this plan)
- **Building:** 8-12 hours
  - Builder 1 (Backend): 3-4 hours
  - Builder 2 (Frontend - Roles & Mafia Chat): 5-6 hours
  - Builder 3 (Frontend - Enhanced Visualizations): 3-4 hours
- **Integration:** 30 minutes (merge, resolve conflicts)
- **Validation:** 60 minutes (Playwright MCP browser testing)
- **Total:** ~10-14 hours

---

## Risk Assessment

### High Risks

**Risk: Playwright validation reveals SSE not emitting night_message events**
- **Impact:** Mafia chat won't update in real-time
- **Mitigation:** Builder 1 manually tests SSE with curl before integration
- **Fallback:** Add polling fallback for night messages (fetch every 5 seconds)

**Risk: Browser testing shows layout issues on mobile**
- **Impact:** Poor mobile UX (split screen cramped)
- **Mitigation:** Use responsive Tailwind classes (stack vertically on mobile: `grid-cols-1 md:grid-cols-2`)
- **Validation:** Playwright tests responsive breakpoints

### Medium Risks

**Risk: Breaking Iteration 1 SSE stability**
- **Impact:** Real-time updates stop working
- **Mitigation:** Preserve existing SSE listeners, add new `night_message` listener only
- **Validation:** Run backend tests (`npm test` - 47 tests must pass)

**Risk: MafiaChatPanel component too complex**
- **Impact:** Builder 2 takes longer than estimated
- **Mitigation:** Reuse DiscussionFeed component pattern (copy and adapt)
- **Fallback:** Builder 2 splits into 2A (backend API) and 2B (frontend component)

### Low Risks

**Risk: Role badges don't match color theme**
- **Impact:** Visual inconsistency
- **Mitigation:** Use existing Badge component variants (mafia, villager already defined)

---

## Integration Strategy

### How Builder Outputs Merge

**Builder 1 (Backend) → Builder 2 (Frontend):**
- Builder 1 creates `/api/game/[gameId]/night-messages` endpoint
- Builder 1 emits `night_message` SSE events
- Builder 2 consumes these in MafiaChatPanel component
- Integration point: API contract (response structure must match)

**Builder 1 (Backend) → Builder 2 (Frontend):**
- Builder 1 exposes `role` field in `/api/game/[gameId]/state`
- Builder 2 displays role badges in PlayerGrid
- Integration point: Type definitions (GameStateResponse)

**Builder 2 (Roles & Mafia Chat) → Builder 3 (Visualizations):**
- Shared layout file: `app/game/[gameId]/page.tsx`
- Builder 2 adds MafiaChatPanel to layout
- Builder 3 enhances PhaseIndicator and adds PhaseTimeline
- Integration point: Layout grid (avoid conflicting CSS classes)

### Shared Files to Coordinate

**`app/game/[gameId]/page.tsx`** - Main game layout
- Builder 2: Adds MafiaChatPanel to right column during Night phase
- Builder 3: Enhances PhaseIndicator at top
- Conflict prevention: Builder 2 works on grid layout, Builder 3 works on phase header

**`components/PlayerGrid.tsx`** - Player display
- Builder 2: Adds role badges (lines 154-156)
- Builder 2: Adds role-based styling (lines 90-100)
- No conflicts: Single builder owns this file

**`contexts/GameEventsContext.tsx`** - SSE event handling
- Builder 1: Updates event types (add `night_message`)
- Builder 2: Subscribes to `night_message` events in MafiaChatPanel
- No conflicts: Type additions are additive

---

## Deployment Plan

### Local Development Testing

1. **Start Supabase Local:** `npm run supabase:start`
2. **Start Next.js dev server:** `npm run dev` (localhost:3001)
3. **Run game creation flow:**
   - Navigate to `http://localhost:3001/`
   - Create game with 10 players
   - Start game
4. **Validate transparency features:**
   - Verify role badges visible in player grid
   - Wait for Night phase (45 seconds)
   - Verify Mafia chat panel appears
   - Verify Mafia messages update in real-time
5. **Run Playwright validation:**
   - Validator opens browser via Playwright MCP
   - Validator automates game creation and observation
   - Validator captures screenshots
   - Validator determines PASS/FAIL

### Validation Deliverables

- **Screenshots:**
  - Player grid with role badges (red/blue)
  - Mafia chat panel during Night phase
  - Enhanced phase visualization
  - Vote tally with enhancements
- **Test report:**
  - PASS/FAIL determination
  - List of validated features
  - Any issues discovered
- **Browser console log:**
  - No JavaScript errors
  - SSE connection status: Connected

---

## Dependencies

### External Dependencies
- None - All changes use existing Next.js, Prisma, and SSE infrastructure

### Internal Dependencies

**Iteration 1 (Complete):**
- SSE endpoint stability (`/api/game/[gameId]/stream`)
- Timer synchronization with server
- Message display in DiscussionFeed
- Backend tests passing (47 tests)

**Builder Dependencies:**
- Builder 2 depends on Builder 1 (needs `/night-messages` API and SSE events)
- Builder 3 independent (pure UI enhancements)

---

## Success Validation

### Functional Validation (Manual + Playwright)

1. **Role Display:**
   - Open game page → Roles visible from start
   - Mafia players have red badges
   - Villager players have blue badges
   - Screenshot captured by validator

2. **Mafia Chat:**
   - Wait for Night phase (45s)
   - Mafia Chat panel appears on right side
   - Mafia messages display in real-time
   - Panel hides/grays out during Day phases
   - Screenshot captured by validator

3. **Phase Visualization:**
   - Phase indicator shows current phase (Night, Day, Discussion, Voting)
   - Phase icons display correctly (moon, sun, chat, ballot)
   - Timeline shows progression
   - Screenshot captured by validator

4. **SSE Stability:**
   - Connection status shows "Connected" (green)
   - No reconnections during 10-minute game
   - Night messages appear with <500ms latency

### Technical Validation

1. **Backend Tests:**
   - Run `npm test`
   - All 47 tests pass (no regressions)

2. **API Endpoints:**
   - `GET /api/game/[gameId]/state` includes `role` field
   - `GET /api/game/[gameId]/night-messages?round=1` returns night messages
   - SSE endpoint emits `night_message` events

3. **Browser Console:**
   - No JavaScript errors
   - No TypeScript type errors
   - No React warnings

---

## Notes for Builders

### Critical Patterns to Follow

1. **Reuse existing component patterns:**
   - MafiaChatPanel should mirror DiscussionFeed structure
   - Use same avatar-colors utility for consistency
   - Follow Card + Badge UI pattern

2. **SSE event subscription:**
   - Filter events by type: `events.filter((e) => e.type === 'night_message')`
   - Extract currentPhase from events for conditional rendering
   - Use `useGameEvents()` hook (proven stable)

3. **API response structure:**
   - Match discussion messages format for consistency
   - Include player name via join
   - Order by roundNumber, then timestamp

4. **Testing focus:**
   - Manual test SSE with curl before integration
   - Verify backend tests pass after changes
   - Test responsive layout on narrow screens
   - **Playwright validation is mandatory** - must see features in real browser

### Integration Points

- Builder 1 provides API contract (response structure)
- Builder 2 consumes API and implements UI
- Builder 3 enhances existing UI independently
- Integration meeting: Quick review of layout changes

---

## Out of Scope Reminders

- No mobile optimization (desktop-first, stack vertically on mobile is acceptable)
- No vote pattern analysis/graphs (simple vote history only)
- No database schema changes (all data exists)
- No backend logic changes (preserve Iteration 1 work)
- No deployment to production (local dev only)

---

**Plan Status:** COMPLETE
**Ready for:** Builder Spawning
**Estimated Completion:** 10-14 hours
**Risk Level:** LOW-MEDIUM
**Dependencies:** Iteration 1 complete (SSE stable)
