# Zone Execution Checklist - Round 1

Use this checklist to execute each integration zone systematically.

---

## Zone 1: Backend Infrastructure

**Assigned to:** Integrator-1
**Estimated time:** 20 minutes
**Risk level:** LOW (1 critical bug to fix)

### Pre-Integration
- [ ] Read Builder-1 report thoroughly
- [ ] Review conflict-resolution-guide.md for critical bug details
- [ ] Understand event type pattern (lowercase with underscores)

### File Integration

#### 1.1 Create New API Endpoint
- [ ] Copy `app/api/game/[gameId]/night-messages/route.ts` from Builder-1 output
- [ ] Verify file compiles (no immediate errors)

#### 1.2 Modify night-phase.ts (CRITICAL BUG FIX)
- [ ] Open `app/src/lib/game/night-phase.ts`
- [ ] Navigate to line 272
- [ ] **CRITICAL:** Change `type: 'NIGHT_MESSAGE'` to `type: 'night_message'`
- [ ] Verify surrounding code matches Builder-1 report (lines 269-282)
- [ ] Save file

#### 1.3 Modify stream endpoint
- [ ] Open `app/api/game/[gameId]/stream/route.ts`
- [ ] Line 51: Add `gameEventEmitter.on('night_message', messageHandler);`
- [ ] Line 73: Add `gameEventEmitter.off('night_message', messageHandler);`
- [ ] Verify listener and cleanup match pattern

#### 1.4 Modify state endpoint
- [ ] Open `app/api/game/[gameId]/state/route.ts`
- [ ] Line 61: Add `role: player.role` to player mapping
- [ ] Remove old comment about hiding roles (if present)
- [ ] Verify response structure includes role field

#### 1.5 Modify validation types
- [ ] Open `app/src/lib/api/validation.ts`
- [ ] Line 86: Add `role: string` to GameStateResponse player type
- [ ] Remove old comment about role privacy (if present)

### Testing
- [ ] Run TypeScript compilation: `npx tsc --noEmit`
- [ ] Verify zero NEW TypeScript errors
- [ ] Note any pre-existing errors (acceptable)

### Verification
- [ ] All Builder-1 files integrated
- [ ] Critical bug fixed (event type is lowercase)
- [ ] No new compilation errors
- [ ] Ready to proceed to Zone 2

**Zone 1 Status:** ☐ Complete

---

## Zone 2: Event Type Definitions

**Assigned to:** Integrator-1
**Estimated time:** 10 minutes
**Risk level:** LOW (simple deduplication)

### Pre-Integration
- [ ] Read conflict-resolution-guide.md section on types.ts
- [ ] Understand that both builders made IDENTICAL changes
- [ ] Plan to keep one copy, discard duplicate

### File Integration

#### 2.1 Deduplicate types.ts
- [ ] Open `src/lib/events/types.ts`
- [ ] Check Builder-1 changes:
  - [ ] Line 14: `'night_message'` in GameEventType union
  - [ ] Lines 68-80: NIGHT_MESSAGE in GameEvent union
- [ ] Check Builder-2 changes:
  - [ ] Line 29: `'night_message'` in GameEventType union (IDENTICAL)
  - [ ] Lines 177-190: night_message in GameEvent union (IDENTICAL)
- [ ] **Resolution:** Keep ONE copy (doesn't matter which)
- [ ] Delete duplicate lines if present

#### 2.2 Verify Final Structure
- [ ] GameEventType union has `'night_message'` (ONE occurrence)
- [ ] GameEvent union has NIGHT_MESSAGE event definition (ONE occurrence)
- [ ] Event payload structure matches:
  ```typescript
  {
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: string;
    roundNumber: number;
    turn: number;
  }
  ```

### Testing
- [ ] Run TypeScript compilation: `npx tsc --noEmit`
- [ ] Verify zero duplicate union member errors
- [ ] Verify event type is recognized

### Verification
- [ ] types.ts has single copy of night_message definitions
- [ ] No TypeScript errors
- [ ] Ready to proceed to Zone 3

**Zone 2 Status:** ☐ Complete

---

## Zone 3: Frontend Transparency UI

**Assigned to:** Integrator-1
**Estimated time:** 20 minutes
**Risk level:** LOW (no conflicts)

### Pre-Integration
- [ ] Read Builder-2 report thoroughly
- [ ] Review data-testid attributes added
- [ ] Understand split-screen layout changes

### File Integration

#### 3.1 Create MafiaChatPanel Component
- [ ] Copy `app/components/MafiaChatPanel.tsx` from Builder-2 output
- [ ] Verify component imports correctly
- [ ] Check data-testid attributes present:
  - [ ] `data-testid="mafia-chat-panel"`
  - [ ] `data-phase="{currentPhase}"`
  - [ ] `data-testid="mafia-message-{index}"`
  - [ ] `data-message-type="night_message"`

#### 3.2 Modify PlayerGrid Component
- [ ] Open `app/components/PlayerGrid.tsx`
- [ ] Line 100: Add `data-testid="player-grid"`
- [ ] Lines 111-122: Add role-based border colors
  - [ ] Red border for Mafia: `border-red-300 bg-red-50`
  - [ ] Blue border for Villager: `border-blue-300 bg-blue-50`
  - [ ] Add `data-badge` attribute
- [ ] Lines 156-161: Add visible role badges
  - [ ] Mafia: 🔴 Mafia badge
  - [ ] Villager: 🔵 Villager badge
  - [ ] Add `data-testid="player-role-badge-{playerName}"`

#### 3.3 Modify Game Page Layout
- [ ] Open `app/app/game/[gameId]/page.tsx`
- [ ] Line 20: Add `import MafiaChatPanel from '@/components/MafiaChatPanel'`
- [ ] Lines 145-194: Update grid layout to 12-column system
  - [ ] Player Grid: 3 columns (left)
  - [ ] During Night: Discussion Feed (4 cols) | Mafia Chat (5 cols)
  - [ ] During other phases: Discussion Feed (5 cols) | Vote Tally (4 cols)
- [ ] Verify responsive design: `grid-cols-1 md:grid-cols-2 lg:grid-cols-12`
- [ ] **Important:** Check for Builder-3 changes (PhaseIndicator) - should be in different section

#### 3.4 Modify Badge Component
- [ ] Open `app/components/ui/Badge.tsx`
- [ ] Lines 19-20: Update color scheme
  - [ ] Mafia: `bg-red-100 text-red-700`
  - [ ] Villager: `bg-blue-100 text-blue-700`

### Testing
- [ ] Run TypeScript compilation: `npx tsc --noEmit`
- [ ] Verify zero NEW errors in Builder-2 files
- [ ] Start dev server: `npm run dev`
- [ ] Create game and verify:
  - [ ] Role badges visible in PlayerGrid
  - [ ] Player cards have colored borders (red/blue)
  - [ ] Wait for Night phase
  - [ ] Mafia chat panel appears on right side
  - [ ] Layout switches correctly

### Verification
- [ ] All Builder-2 files integrated
- [ ] Role badges visible
- [ ] MafiaChatPanel component functional
- [ ] Split-screen layout works
- [ ] Playwright data-testid attributes present
- [ ] Ready to proceed to Zone 4

**Zone 3 Status:** ☐ Complete

---

## Zone 4: Enhanced Phase Visualization

**Assigned to:** Integrator-1
**Estimated time:** 25 minutes
**Risk level:** LOW (no conflicts)

### Pre-Integration
- [ ] Read Builder-3 report thoroughly
- [ ] Review PhaseTimeline component features
- [ ] Understand tailwind.config.ts changes

### File Integration

#### 4.1 Create PhaseTimeline Component
- [ ] Copy `app/components/game/PhaseTimeline.tsx` from Builder-3 output
- [ ] Verify component imports correctly
- [ ] Check data-testid attributes present:
  - [ ] `data-testid="phase-timeline"`
  - [ ] `data-phase-step="{phase}"`
  - [ ] `data-active="{isActive}"`

#### 4.2 Modify PhaseIndicator Component
- [ ] Open `app/components/PhaseIndicator.tsx`
- [ ] Lines 15-26: Update imports (add PhaseTimeline)
- [ ] Lines 126-212: Enhanced styling changes
  - [ ] Larger icons (5xl size)
  - [ ] Gradient progress bars
  - [ ] Smooth 700ms transitions
  - [ ] Timer urgency (red when <10 seconds)
  - [ ] Shadow effects
- [ ] Accessibility additions:
  - [ ] `role="region"`
  - [ ] `aria-label` attributes
  - [ ] `role="status"` with `aria-live="polite"`
  - [ ] `role="progressbar"` with aria-value attributes
- [ ] Data attributes:
  - [ ] `data-testid="phase-indicator"`
  - [ ] `data-phase="{currentPhase}"`
- [ ] Lines 200-202: PhaseTimeline integration at bottom

#### 4.3 Modify VoteTally Component
- [ ] Open `app/components/VoteTally.tsx`
- [ ] Lines 82-111: Enhanced vote bar rendering
  - [ ] Gradient fills (blue-500 to blue-600)
  - [ ] Increased height (h-3)
  - [ ] Majority threshold line (red vertical line with dot)
- [ ] Lines 113-142: Enhanced threshold card
  - [ ] Gradient background
  - [ ] Mini progress bar
  - [ ] "votes needed" counter
- [ ] Lines 157-191: Enhanced vote entries
  - [ ] Rounded borders (rounded-lg with border-2)
  - [ ] Shadow effects
  - [ ] Better badge styling
- [ ] Accessibility:
  - [ ] `role="region"`
  - [ ] `aria-label="Voting results"`
- [ ] Data attributes:
  - [ ] `data-testid="vote-tally"`
  - [ ] `data-testid="vote-entry"`
  - [ ] `data-target-id`
  - [ ] `data-vote-count`

#### 4.4 Modify Tailwind Config
- [ ] Open `app/tailwind.config.ts`
- [ ] Lines 3-28: Add custom animation
  - [ ] Add `animate-pulse-subtle` animation definition
  - [ ] Add `pulse-subtle` keyframes (opacity 1 → 0.85 → 1)
- [ ] Verify no conflicts with existing config
- [ ] Check if other builders modified this file (unlikely)

### Testing
- [ ] Run TypeScript compilation: `npx tsc --noEmit`
- [ ] Verify zero NEW errors in Builder-3 files
- [ ] Rebuild Tailwind: `npm run build:css` (if needed)
- [ ] Start dev server: `npm run dev`
- [ ] Create game and verify:
  - [ ] PhaseIndicator has enhanced styling (large icons, gradients)
  - [ ] PhaseTimeline displays at bottom of PhaseIndicator
  - [ ] Phase transitions are smooth (700ms)
  - [ ] Timer pulses when <10 seconds
  - [ ] Wait for Voting phase
  - [ ] Vote tally shows majority threshold line
  - [ ] Vote bars have gradient fills

### Verification
- [ ] All Builder-3 files integrated
- [ ] PhaseTimeline component displays
- [ ] PhaseIndicator enhancements visible
- [ ] VoteTally enhancements visible
- [ ] Tailwind custom animation working
- [ ] Animations smooth and polished
- [ ] Ready for final verification

**Zone 4 Status:** ☐ Complete

---

## Final Integration Verification

**Estimated time:** 17-22 minutes

### TypeScript Compilation
- [ ] Run full compilation: `npx tsc --noEmit`
- [ ] Verify zero NEW errors
- [ ] Document any pre-existing errors (acceptable)
- [ ] Confirm all imports resolve correctly

### Backend Tests
- [ ] Navigate to app directory: `cd app`
- [ ] Run test suite: `npm test`
- [ ] Target: All 47 tests pass (Iteration 1 baseline)
- [ ] If timeout occurs:
  - [ ] Run tests in isolation
  - [ ] Verify no regressions in affected modules
- [ ] Document test results

### API Endpoint Testing
- [ ] Start dev server: `npm run dev`
- [ ] Create game via UI
- [ ] Get game ID from URL
- [ ] Test night messages API:
  ```bash
  curl http://localhost:3001/api/game/<gameId>/night-messages | jq '.'
  ```
  - [ ] Verify JSON response with empty messages array (before Night)
- [ ] Test state API with roles:
  ```bash
  curl http://localhost:3001/api/game/<gameId>/state | jq '.players[0].role'
  ```
  - [ ] Verify role field present: "MAFIA" or "VILLAGER"
- [ ] Test SSE stream:
  ```bash
  curl -N http://localhost:3001/api/game/<gameId>/stream
  ```
  - [ ] Verify connection established
  - [ ] Wait for Night phase
  - [ ] Verify `night_message` events appear (lowercase type)

### Browser Testing
- [ ] Start dev server: `npm run dev`
- [ ] Navigate to http://localhost:3001/
- [ ] Create game with 10 players
- [ ] Start game
- [ ] **Role Display:**
  - [ ] Role badges visible immediately (3 red Mafia, 7 blue Villager)
  - [ ] Player cards have colored borders (red for Mafia, blue for Villager)
  - [ ] Dead players grayed out but role visible
- [ ] **Enhanced Phase Indicator:**
  - [ ] Large phase icons (5xl size)
  - [ ] Gradient progress bar
  - [ ] Smooth animations (700ms transitions)
  - [ ] PhaseTimeline displays at bottom
- [ ] **Wait for Night Phase (~45 seconds):**
  - [ ] Mafia chat panel appears on right side
  - [ ] Split-screen layout active (Discussion | Mafia Chat)
  - [ ] Wait for Mafia messages to appear
  - [ ] Verify messages update in real-time
  - [ ] Check SSE connection status (should be "connected")
- [ ] **Timer Urgency:**
  - [ ] Wait for timer <10 seconds
  - [ ] Verify timer pulses and turns red
- [ ] **Wait for Day Phase:**
  - [ ] Mafia chat panel hides
  - [ ] Layout returns to normal
- [ ] **Wait for Voting Phase:**
  - [ ] Vote tally displays
  - [ ] Majority threshold line visible (red vertical line)
  - [ ] Threshold card shows progress
  - [ ] Vote bars have gradient fills
- [ ] **Browser Console:**
  - [ ] No JavaScript errors
  - [ ] No React warnings
  - [ ] SSE connection logs (optional debug output)

### Responsive Testing
- [ ] Open browser DevTools
- [ ] Resize to mobile width (375px)
- [ ] Verify components stack vertically
- [ ] Check no layout overflow issues
- [ ] Verify touch targets are adequate

### Playwright Validation Readiness
- [ ] Verify all data-testid attributes present:
  - [ ] `data-testid="player-grid"`
  - [ ] `data-testid="player-role-badge-{playerName}"`
  - [ ] `data-badge="mafia"` or `data-badge="villager"`
  - [ ] `data-testid="mafia-chat-panel"`
  - [ ] `data-phase="{currentPhase}"`
  - [ ] `data-message-type="night_message"`
  - [ ] `data-testid="phase-indicator"`
  - [ ] `data-testid="phase-timeline"`
  - [ ] `data-testid="vote-tally"`
- [ ] Document any missing attributes

### Documentation
- [ ] Create integrator report (integrator-report.md)
- [ ] Document all changes merged
- [ ] Note any issues encountered
- [ ] List all verification results
- [ ] Provide handoff notes for ivalidator

---

## Integration Complete Checklist

- [ ] Zone 1: Backend Infrastructure - COMPLETE
- [ ] Zone 2: Event Type Definitions - COMPLETE
- [ ] Zone 3: Frontend Transparency UI - COMPLETE
- [ ] Zone 4: Enhanced Phase Visualization - COMPLETE
- [ ] Critical bug fixed (night-phase.ts line 272)
- [ ] types.ts deduplicated
- [ ] TypeScript compilation passes
- [ ] Backend tests pass (or documented timeout)
- [ ] API endpoints tested and functional
- [ ] Browser testing complete - all features verified
- [ ] Playwright data-testid attributes present
- [ ] No console errors
- [ ] Integrator report created
- [ ] Ready for ivalidator

---

## Handoff to ivalidator

When all zones complete and verification passes:

1. [ ] Create integration report
2. [ ] Document any issues or warnings
3. [ ] Note dev server port (3001)
4. [ ] Provide game creation steps
5. [ ] List all Playwright selectors
6. [ ] Specify expected screenshots
7. [ ] Hand off to ivalidator for Playwright testing

**Expected Validation Time:** 10-15 minutes

---

**Checklist Status:** ☐ All Zones Complete
**Created:** 2025-10-13
**Ready for:** Integrator-1 Execution
**Estimated Total Time:** 1.5-2 hours
