# Builder Task Breakdown - Iteration 6

**Iteration:** 6 (Global Iteration 6)
**Plan:** plan-2
**Total Builders:** 3 (parallel execution)

---

## Overview

3 primary builders will work in parallel to deliver transparency features. Builder 1 (Backend) provides API and events that Builder 2 (Frontend - Roles & Mafia Chat) consumes. Builder 3 (Frontend - Enhanced Visualizations) works independently.

**Estimated Total Time:** 8-12 hours

**Complexity Distribution:**
- Builder 1: MEDIUM (3-4 hours)
- Builder 2: MEDIUM-HIGH (5-6 hours)
- Builder 3: MEDIUM (3-4 hours)

**Dependencies:**
- Builder 2 depends on Builder 1 (needs API endpoints and SSE events)
- Builder 3 independent (pure UI enhancements)

**CRITICAL:** All builders must build for Playwright validation. The validator will use Playwright MCP to observe features in a real browser and determine PASS/FAIL.

---

## Builder-1: Backend - API & Events

### Scope

Create night messages API endpoint, emit night_message SSE events, and expose player roles in game state API. Provide the backend infrastructure for transparency features.

### Complexity Estimate

**MEDIUM** (3-4 hours)

### Success Criteria

- [ ] `/api/game/[gameId]/night-messages` endpoint created and returns correct data
- [ ] `night_message` SSE events emitted during Night phase
- [ ] `night_message` event type added to TypeScript types
- [ ] Player `role` field exposed in `/api/game/[gameId]/state` endpoint
- [ ] SSE endpoint subscribes to `night_message` events
- [ ] All 47 backend tests still passing (`npm test`)
- [ ] Manual curl testing validates endpoints work
- [ ] SSE events visible in browser DevTools Network tab

### Files to Create

1. **`app/app/api/game/[gameId]/night-messages/route.ts`** (NEW)
   - Purpose: REST endpoint to fetch night messages for a game
   - Pattern: Copy from `messages/route.ts`, replace `discussionMessage` with `nightMessage`
   - Estimated: 90 lines
   - Time: 1-1.5 hours

### Files to Modify

2. **`src/lib/events/types.ts`** (MODIFY)
   - Add `'night_message'` to `GameEventType` union (line ~10)
   - Add `NIGHT_MESSAGE` event to `GameEvent` discriminated union (line ~66)
   - Estimated: 15 lines added
   - Time: 15 minutes

3. **`app/app/api/game/[gameId]/stream/route.ts`** (MODIFY)
   - Add `gameEventEmitter.on('night_message', messageHandler);` (line ~50)
   - Add `gameEventEmitter.off('night_message', messageHandler);` (line ~70)
   - Estimated: 2 lines added
   - Time: 5 minutes

4. **`app/src/lib/game/night-phase.ts`** (MODIFY)
   - Emit `night_message` event after `prisma.nightMessage.create()` (line ~269)
   - Replace line 269 comment with event emission code
   - Estimated: 10 lines added
   - Time: 10 minutes

5. **`app/app/api/game/[gameId]/state/route.ts`** (MODIFY)
   - Add `role: player.role` to player mapping (line ~58)
   - Estimated: 1 line added
   - Time: 5 minutes

6. **`src/lib/api/validation.ts`** (MODIFY - if types exist)
   - Add `role: string;` to player type in GameStateResponse
   - Estimated: 1 line added
   - Time: 5 minutes

### Dependencies

**Depends on:**
- Iteration 1 complete (SSE stable, event emitter working)

**Blocks:**
- Builder 2 (Frontend) - needs API endpoints and SSE events

### Implementation Notes

**Critical Path:**
1. Create night-messages API endpoint first (test with curl)
2. Add event types to types.ts (TypeScript must compile)
3. Emit night_message events in night-phase.ts (test SSE with browser DevTools)
4. Add SSE listener in stream/route.ts (test events received)
5. Expose role field in state API (test response includes role)

**Testing Workflow:**
```bash
# 1. Start dev server
npm run dev

# 2. Create and start a game (via UI or API)
curl -X POST http://localhost:3001/api/game/create
curl -X POST http://localhost:3001/api/game/{gameId}/start

# 3. Test night-messages endpoint
curl http://localhost:3001/api/game/{gameId}/night-messages

# 4. Test SSE endpoint (watch for night_message events)
curl -N http://localhost:3001/api/game/{gameId}/stream

# 5. Test state endpoint (verify role field)
curl http://localhost:3001/api/game/{gameId}/state | jq '.players[0].role'

# 6. Run backend tests
npm test
```

**Gotchas:**
- Event emission must happen AFTER database save (consistency)
- Payload structure must match NEW_MESSAGE format (proven stable)
- TypeScript types must be updated BEFORE emitting events (compilation)
- SSE listener cleanup required (prevent memory leaks)

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Pattern 1:** Create Night Messages API Endpoint
- **Pattern 2:** Expose Player Roles in State API
- **Pattern 3:** Add night_message Event Type
- **Pattern 4:** Emit night_message SSE Events
- **Pattern 5:** Subscribe to night_message in SSE Endpoint

### Testing Requirements

- **Manual testing:** curl all API endpoints, verify responses
- **SSE testing:** Open browser DevTools Network tab, watch for events
- **Backend tests:** Run `npm test` - All 47 tests must pass
- **Type checking:** Run `npm run type-check` - Zero errors

### Potential Split Strategy

**Not recommended** - Complexity is MEDIUM, single builder can complete in 3-4 hours. If issues arise, consider splitting into:

**Builder 1A: API Endpoint** (1-1.5 hours)
- Create night-messages endpoint
- Test with curl

**Builder 1B: SSE Events** (1.5-2 hours)
- Add event types
- Emit night_message events
- Add SSE listener
- Test with browser

---

## Builder-2: Frontend - Roles & Mafia Chat

### Scope

Display player roles in PlayerGrid component, create MafiaChatPanel component to show Mafia coordination, and add split screen layout to game page. Consume API endpoints and SSE events from Builder 1.

### Complexity Estimate

**MEDIUM-HIGH** (5-6 hours)

**Rationale:** Largest feature (MafiaChatPanel is ~300 lines), layout changes, SSE integration. Can copy patterns from DiscussionFeed but requires adaptation.

### Success Criteria

- [ ] Player roles visible in PlayerGrid (red "Mafia" badge, blue "Villager" badge)
- [ ] Role-colored player cards (red border for Mafia, blue for Villager)
- [ ] MafiaChatPanel component created and functional
- [ ] Mafia chat panel displays during Night phase
- [ ] Mafia messages update in real-time via SSE
- [ ] Split screen layout added to game page (DiscussionFeed | MafiaChatPanel)
- [ ] Panel hides/grays out during non-Night phases
- [ ] Auto-scroll to new messages works
- [ ] Historical night messages loaded on component mount
- [ ] **Playwright validation ready** (data-testid attributes added)

### Files to Create

1. **`app/components/MafiaChatPanel.tsx`** (NEW)
   - Purpose: Display Mafia coordination messages during Night phase
   - Pattern: Copy from `DiscussionFeed.tsx`, adapt for night messages
   - Estimated: 300 lines
   - Time: 3-4 hours

### Files to Modify

2. **`app/components/PlayerGrid.tsx`** (MODIFY)
   - Add role badges (lines 154-156)
   - Add role-based border colors (lines 90-100)
   - Add `data-testid` attributes for Playwright
   - Estimated: 20 lines modified/added
   - Time: 30 minutes

3. **`app/app/game/[gameId]/page.tsx`** (MODIFY)
   - Add MafiaChatPanel to layout
   - Create split screen grid (DiscussionFeed | MafiaChatPanel)
   - Estimated: 30 lines modified/added
   - Time: 30 minutes

### Dependencies

**Depends on:**
- Builder 1 complete (needs `/night-messages` API and `night_message` SSE events)

**Blocks:**
- None (Builder 3 is independent)

### Implementation Notes

**Critical Path:**
1. Update PlayerGrid with role badges (quick win, test immediately)
2. Create MafiaChatPanel skeleton (copy DiscussionFeed structure)
3. Add SSE subscription for night_message events
4. Add historical message fetch from `/night-messages` API
5. Implement show/hide logic based on currentPhase
6. Add split screen layout to game page
7. Test full flow: Create game → Wait for Night → Verify Mafia chat appears

**Testing Workflow:**
```bash
# 1. Start dev server
npm run dev

# 2. Open browser: http://localhost:3001/

# 3. Create game (10 players)

# 4. Start game

# 5. Verify role badges visible in player grid
# - Should see red "Mafia" badges (3 players)
# - Should see blue "Villager" badges (7 players)

# 6. Wait for Night phase (45 seconds)

# 7. Verify Mafia chat panel appears on right side

# 8. Verify Mafia messages appear in real-time

# 9. Wait for Day phase

# 10. Verify Mafia chat panel hides or grays out

# 11. Check browser console for errors
```

**Gotchas:**
- SSE events must be filtered by type: `events.filter((e) => e.type === 'night_message')`
- Historical messages must be deduplicated with real-time messages (use Map by id)
- Auto-scroll should be toggleable (reuse pattern from DiscussionFeed)
- Phase detection must extract latest phase_change event
- Split screen must be responsive (stack vertically on mobile: `grid-cols-1 md:grid-cols-2`)

**Playwright Data Attributes:**
Add these attributes for validator:
```tsx
// PlayerGrid.tsx
<div data-testid="player-grid">
  <div data-badge={player.role === 'MAFIA' ? 'mafia' : 'villager'}>
    {/* ... */}
  </div>
</div>

// MafiaChatPanel.tsx
<div data-testid="mafia-chat-panel" data-phase={currentPhase}>
  <div data-message-type="night_message">
    {/* ... */}
  </div>
</div>
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Pattern 6:** Display Role Badges in PlayerGrid
- **Pattern 7:** Create MafiaChatPanel Component
- **Pattern 8:** Add MafiaChatPanel to Game Layout
- **Pattern 9:** SSE Event Subscription Hook
- **Pattern 11:** Deterministic Avatar Colors
- **Pattern 12:** Relative Timestamps

### Testing Requirements

- **Manual testing:** Create game, wait for Night phase, verify Mafia chat
- **Visual inspection:** Role badges, Mafia chat panel, split screen layout
- **Responsive testing:** Test on narrow screen (mobile: <768px)
- **Browser console:** No JavaScript errors
- **Playwright readiness:** data-testid attributes present

### Potential Split Strategy

**If complexity proves too high, split into:**

**Foundation (Builder 2 - Primary):** 2-3 hours
- Create MafiaChatPanel skeleton
- Add SSE subscription (basic display)
- Add to game layout (split screen)

**Sub-builder 2A: Role Display** (1 hour)
- Scope: Add role badges and colors to PlayerGrid
- Files: `PlayerGrid.tsx` only
- Estimate: LOW complexity

**Sub-builder 2B: Mafia Chat Polish** (1.5-2 hours)
- Scope: Historical message fetch, auto-scroll, styling
- Files: `MafiaChatPanel.tsx` enhancements
- Estimate: MEDIUM complexity

---

## Builder-3: Frontend - Enhanced Visualizations

### Scope

Enhance phase visualization with improved styling, icons, and optional phase timeline. Improve vote tally display (optional vote history panel). Pure UI polish work - no API or SSE integration.

### Complexity Estimate

**MEDIUM** (3-4 hours)

### Success Criteria

- [ ] Enhanced PhaseIndicator with better styling
- [ ] Phase icons prominent (moon, sun, chat, ballot)
- [ ] Phase colors consistent (purple Night, orange Day, blue Discussion, red Voting)
- [ ] Phase timeline component showing progression (optional)
- [ ] Vote tally enhancements (optional: vote history panel)
- [ ] Smooth phase transition animations
- [ ] Round number prominently displayed
- [ ] **Playwright validation ready** (data-phase attributes)

### Files to Create

1. **`app/components/PhaseTimeline.tsx`** (NEW - OPTIONAL)
   - Purpose: Horizontal timeline showing phase progression
   - Pattern: Simple horizontal flex layout with phase dots
   - Estimated: 100 lines
   - Time: 1-2 hours

2. **`app/components/VoteHistory.tsx`** (NEW - OPTIONAL)
   - Purpose: Display historical votes from previous rounds
   - Pattern: Accordion/collapsible component
   - Estimated: 150 lines
   - Time: 2-3 hours

### Files to Modify

3. **`app/components/PhaseIndicator.tsx`** (MODIFY)
   - Enhance styling (larger icons, better colors, clearer labels)
   - Add phase timeline if created
   - Add `data-phase` attribute for Playwright
   - Estimated: 20 lines modified/added
   - Time: 30 minutes

4. **`app/components/VoteTally.tsx`** (MODIFY - OPTIONAL)
   - Add "Show History" toggle button
   - Integrate VoteHistory component if created
   - Estimated: 10 lines added
   - Time: 15 minutes

### Dependencies

**Depends on:**
- None (independent UI work)

**Blocks:**
- None

### Implementation Notes

**Critical Path:**
1. Enhance PhaseIndicator styling (low-hanging fruit)
2. Create PhaseTimeline component (optional)
3. Test phase transitions visually
4. Create VoteHistory component (optional, time permitting)
5. Polish and accessibility improvements

**Testing Workflow:**
```bash
# 1. Start dev server
npm run dev

# 2. Open browser: http://localhost:3001/

# 3. Create game

# 4. Observe phase indicator styling
# - Should see large phase icon (emoji or SVG)
# - Should see phase color (purple/orange/blue/red)
# - Should see round number prominently

# 5. Wait for phase transitions
# - Night → Day → Discussion → Voting
# - Verify smooth animations
# - Verify timeline updates (if implemented)

# 6. Check vote tally during Voting phase
# - Should see vote counts
# - Should see majority threshold indicator
# - Check vote history (if implemented)

# 7. Verify no layout issues on mobile (responsive)
```

**Gotchas:**
- Phase colors already defined in phase-config.ts (reuse, don't redefine)
- Timeline must show current phase highlighted
- Animations should be subtle (not distracting)
- VoteHistory is optional (only if time permits)

**Playwright Data Attributes:**
```tsx
// PhaseIndicator.tsx
<div data-testid="phase-indicator" data-phase={currentPhase}>
  {/* ... */}
</div>

// PhaseTimeline.tsx (optional)
<div data-testid="phase-timeline">
  <div data-phase-step="NIGHT" data-active={currentPhase === 'NIGHT'}>
    {/* ... */}
  </div>
</div>
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Pattern 10:** Enhanced Phase Visualization
- Use existing phase-config.ts for metadata
- Follow Tailwind CSS conventions
- Responsive design patterns

### Testing Requirements

- **Manual testing:** Observe phase transitions, verify styling
- **Visual inspection:** Phase indicator, timeline (if implemented)
- **Responsive testing:** Test on narrow screen (mobile)
- **Accessibility:** Test keyboard navigation
- **Browser console:** No JavaScript errors

### Potential Split Strategy

**If VoteHistory proves complex, defer to future iteration:**

**Builder 3 (Core):** 1-2 hours
- Enhance PhaseIndicator styling
- Create PhaseTimeline (optional)

**Future Iteration:**
- VoteHistory component (2-3 hours)

---

## Builder Execution Order

### Parallel Group 1 (No dependencies)

**Start immediately:**
- **Builder 1** (Backend - API & Events)
- **Builder 3** (Frontend - Enhanced Visualizations)

### Parallel Group 2 (Depends on Group 1)

**Start after Builder 1 completes:**
- **Builder 2** (Frontend - Roles & Mafia Chat)

**OR** (if Builder 1 is fast):
- Builder 2 can start PlayerGrid changes immediately (role display)
- Builder 2 waits for Builder 1 before starting MafiaChatPanel

---

## Integration Notes

### Integration Points

**Builder 1 → Builder 2:**
- **API Contract:** `/api/game/[gameId]/night-messages` response structure
- **Event Contract:** `night_message` event payload structure
- **Type Definitions:** Shared types in `types.ts`

**Builder 2 → Builder 3:**
- **Shared Layout:** `app/game/[gameId]/page.tsx`
- **Conflict Prevention:** Builder 2 works on grid layout (split screen), Builder 3 works on phase header (no overlap)

### Shared Files to Coordinate

**`app/game/[gameId]/page.tsx`** - Game layout
- Builder 2: Adds MafiaChatPanel to right column
- Builder 3: Enhances PhaseIndicator at top
- **Resolution:** Different sections, no conflicts expected

**`contexts/GameEventsContext.tsx`** - SSE context
- Builder 1: Adds event types
- Builder 2: Subscribes to events
- **Resolution:** Additive changes, no conflicts

**`src/lib/events/types.ts`** - Event types
- Builder 1: Adds `night_message` type
- **Resolution:** Single builder owns this file

### Integration Testing Checklist

After all builders complete:

- [ ] Run `npm test` - All 47 backend tests pass
- [ ] Run `npm run type-check` - Zero TypeScript errors
- [ ] Create game in browser - No console errors
- [ ] Verify role badges visible
- [ ] Wait for Night phase - Mafia chat panel appears
- [ ] Verify Mafia messages appear in real-time
- [ ] Verify enhanced phase visualization displays
- [ ] Test responsive layout on mobile width
- [ ] Run Playwright validation (validator does this)

---

## Playwright Validation Requirements

**CRITICAL:** All builders must prepare for Playwright validation.

### Data Attributes to Add

**Builder 2 (PlayerGrid):**
```tsx
<div data-testid="player-grid">
  <div data-badge={player.role === 'MAFIA' ? 'mafia' : 'villager'}>
    {/* ... */}
  </div>
</div>
```

**Builder 2 (MafiaChatPanel):**
```tsx
<div data-testid="mafia-chat-panel" data-phase={currentPhase}>
  <div data-message-type="night_message">
    {/* ... */}
  </div>
</div>
```

**Builder 3 (PhaseIndicator):**
```tsx
<div data-testid="phase-indicator" data-phase={currentPhase}>
  {/* ... */}
</div>
```

**Builder 1 (Backend):**
- No visual changes, but SSE events must be emitted correctly
- Validator will check browser DevTools Network tab for events

### Validation Scenarios

**Scenario 1: Role Display**
- Validator opens game page
- Validator waits for player grid to load
- Validator counts role badges: `page.locator('[data-badge="mafia"]').count()`
- Validator captures screenshot: `roles.png`

**Scenario 2: Mafia Chat**
- Validator waits for Night phase: `page.waitForSelector('[data-phase="NIGHT"]')`
- Validator waits for Mafia chat panel: `page.waitForSelector('[data-testid="mafia-chat-panel"]')`
- Validator waits for first message: `page.waitForSelector('[data-message-type="night_message"]')`
- Validator captures screenshot: `mafia-chat.png`

**Scenario 3: Phase Visualization**
- Validator observes phase transitions
- Validator verifies phase indicator updates
- Validator captures screenshot: `phase-visualization.png`

**Scenario 4: SSE Connection**
- Validator checks connection status: `page.locator('[data-connection-status]').getAttribute('data-connection-status')`
- Expected: "connected"

### Validation Deliverables

Validator will provide:
- Screenshots of all features
- PASS/FAIL determination
- List of validated features
- Console log (no errors expected)
- Test execution time

---

## Risk Mitigation

### Risk: Builder 1 delays Builder 2

**Mitigation:**
- Builder 2 starts with PlayerGrid changes (no Builder 1 dependency)
- Builder 2 creates MafiaChatPanel skeleton (can test with mock data)
- Builder 1 communicates API contract early (response structure)

### Risk: MafiaChatPanel too complex

**Mitigation:**
- Copy DiscussionFeed.tsx exactly, then adapt incrementally
- Test SSE subscription independently first
- Split into 2A (role display) and 2B (Mafia chat) if needed

### Risk: Playwright validation fails

**Mitigation:**
- Builders add data-testid attributes proactively
- Manual testing before validation
- Builder 1 manually tests SSE with curl
- Builder 2 manually tests in browser DevTools

### Risk: SSE breaks during integration

**Mitigation:**
- Preserve existing SSE listeners (additive changes only)
- Run backend tests after each change
- Test SSE connection manually before Playwright

---

## Communication Protocol

### Builder 1 → Builder 2 Handoff

**When Builder 1 completes, communicate:**
1. API endpoint is live: `GET /api/game/[gameId]/night-messages`
2. Response structure:
   ```json
   {
     "messages": [
       {
         "id": "string",
         "playerId": "string",
         "playerName": "string",
         "message": "string",
         "timestamp": "ISO 8601",
         "roundNumber": number,
         "turn": number
       }
     ],
     "total": number
   }
   ```
3. SSE event type: `night_message`
4. Event payload structure (same as API response message object)
5. Backend tests passing: `npm test` (47 tests)

### Integration Meeting (15 minutes)

**After Builder 1 & 2 complete:**
- Review shared files: `page.tsx` (layout changes)
- Resolve any conflicts
- Test full flow together
- Verify Playwright data attributes present

---

## Builder Success Checklist

### Builder 1: Backend ✓

- [ ] `/api/game/[gameId]/night-messages` endpoint created
- [ ] `night_message` SSE events emitted
- [ ] Event types updated in `types.ts`
- [ ] Player `role` field exposed in state API
- [ ] All 47 backend tests passing
- [ ] Manual curl testing successful
- [ ] SSE events visible in browser DevTools

### Builder 2: Frontend - Roles & Mafia Chat ✓

- [ ] Role badges visible in PlayerGrid
- [ ] Role-colored player cards
- [ ] MafiaChatPanel component created
- [ ] Mafia chat displays during Night phase
- [ ] Real-time message updates via SSE
- [ ] Historical messages loaded on mount
- [ ] Split screen layout implemented
- [ ] Responsive design (mobile stacks vertically)
- [ ] Playwright data attributes added

### Builder 3: Frontend - Enhanced Visualizations ✓

- [ ] PhaseIndicator styling enhanced
- [ ] Phase icons prominent
- [ ] Phase timeline component (optional)
- [ ] Vote tally enhancements (optional)
- [ ] Responsive design
- [ ] Playwright data attributes added

---

## Notes for Validator

### Validation Workflow

1. **Start dev server:** `npm run dev` (localhost:3001)
2. **Use Playwright MCP to launch browser**
3. **Create game:** Navigate to lobby, create 10-player game
4. **Validate role display:**
   - Wait for player grid to load
   - Count role badges (3 Mafia, 7 Villagers)
   - Capture screenshot: `roles.png`
5. **Wait for Night phase:** (45 seconds)
6. **Validate Mafia chat:**
   - Verify panel appears
   - Wait for first message
   - Capture screenshot: `mafia-chat.png`
7. **Validate phase visualization:**
   - Observe phase transitions
   - Capture screenshot: `phase-visualization.png`
8. **Check SSE connection:**
   - Verify connection status: "connected"
9. **Check console:**
   - No JavaScript errors
10. **Determine PASS/FAIL:**
    - PASS if all features visible and working
    - FAIL if any feature missing or broken

### Expected Validation Time

- Game creation: 1 minute
- Wait for Night phase: 1-2 minutes
- Observation and screenshots: 3-5 minutes
- Total: ~10 minutes per validation run

---

## Out of Scope Reminders

**Not in this iteration:**
- Mobile optimization (desktop-first, basic responsive only)
- Vote pattern analysis (simple vote history only, optional)
- Multiple concurrent games
- Game replay mode
- Advanced analytics
- Deployment to production

---

**Builder Tasks Status:** COMPLETE
**Ready for:** Builder Spawning
**Total Estimated Time:** 8-12 hours
**Critical Path:** Builder 1 → Builder 2 (Builder 3 independent)
**Validation:** Playwright MCP Required
