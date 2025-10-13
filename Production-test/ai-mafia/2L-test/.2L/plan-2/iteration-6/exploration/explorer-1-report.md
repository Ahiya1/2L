# Explorer 1 Report: UI Components & Transparency Features

## Executive Summary

Analyzed current frontend UI components to understand how to add transparency features (role display, Mafia chat panel, enhanced phase visualization, vote enhancements). All necessary data exists in database - only UI changes needed. **Complexity: MEDIUM** - straightforward component enhancements following existing patterns. Iteration 1 achieved SSE stability, providing solid foundation for transparency features.

## Discoveries

### Current UI Component Architecture

#### 1. **PlayerGrid Component** (`app/components/PlayerGrid.tsx`)
- **Current state:** Displays 8-12 players in responsive grid (2/3/4 columns), deterministic avatar circles with initials
- **Data available:** Fetches from `/api/game/[gameId]/state` which includes Player.role field in database
- **Role display:** Currently shows "Role: ?" (line 155) - intentionally hidden during game
- **Status badges:** "Alive" (green) / "Eliminated" (gray) badges already implemented
- **Styling:** Uses Tailwind utility classes, Card wrapper, deterministic avatar colors
- **Real-time updates:** Listens to player_eliminated events via useGameEvents() hook
- **Key finding:** Role field exists but API response excludes it (state/route.ts line 66: "Role intentionally NOT included")

#### 2. **VoteTally Component** (`app/components/VoteTally.tsx`)
- **Current state:** Real-time vote aggregation during VOTING phase
- **Features implemented:**
  - Vote count per player with visual bar chart
  - Majority threshold indicator (calculated from playerCount)
  - Vote justifications (expandable/collapsible per player)
  - Leading player highlight (yellow) vs majority reached (red)
  - Progress indicator: "X/Y votes cast"
- **Data flow:** Subscribes to vote_cast events via useGameEvents()
- **Styling:** Card wrapper, color-coded bars (blue → red when majority reached)
- **Key finding:** Already has sophisticated vote visualization - minimal enhancements needed

#### 3. **PhaseIndicator Component** (`app/components/PhaseIndicator.tsx`)
- **Current state:** Enhanced in Iteration 1 with timer sync, phase colors, progress bar
- **Features implemented:**
  - Phase name with emoji icon (🌙 Night, ☀️ Day, 💬 Discussion, 🗳️ Voting)
  - Countdown timer synced with server phaseStartTime (fixed in Iteration 1)
  - Progress bar visualization (colored by phase)
  - Round counter (X / 40)
  - Phase-specific colors (purple, orange, blue, red)
  - Phase descriptions ("Mafia coordinates their strategy in private")
- **Data source:** phase-config.ts provides icons, colors, descriptions
- **Key finding:** Phase visualization already comprehensive - can enhance with timeline

#### 4. **DiscussionFeed Component** (`app/components/DiscussionFeed.tsx`)
- **Current state:** Real-time message display with threading, avatars, timestamps
- **Features implemented:**
  - Conversation threading (CSS indentation, max 3 levels)
  - Message type color-coding (accusations, defenses, questions)
  - Deterministic avatars with initials
  - Relative timestamps ("2 minutes ago")
  - Auto-scroll with lock toggle
  - Connection status indicator
- **Data flow:** Subscribes to message events via useGameEvents()
- **Key finding:** Can reuse pattern for MafiaChatPanel (night_message events)

#### 5. **Game Page Layout** (`app/app/game/[gameId]/page.tsx`)
- **Current structure:**
  - Phase indicator (full width)
  - 3-column grid: PlayerGrid (left) | DiscussionFeed (center) | VoteTally (right)
  - VoteTally conditionally shown during VOTING phase
  - Responsive: 1 column mobile → 2 tablet → 3 desktop
- **Key finding:** Right column empty during non-voting phases - perfect for Mafia chat panel

### Database Schema Analysis

#### Player Table (schema.prisma lines 37-59)
```prisma
role: String // "MAFIA", "VILLAGER"
isAlive: Boolean
eliminatedInRound: Int?
eliminationType: String? // "NIGHTKILL", "DAYKILL"
```
- **Key finding:** Role field exists and populated - just need to include in API response

#### NightMessage Table (schema.prisma lines 82-99)
```prisma
gameId: String
roundNumber: Int
playerId: String
message: String
timestamp: DateTime
turn: Int
```
- **Key finding:** Full Mafia chat history available - need new API endpoint to fetch

### API Endpoint Analysis

#### Current Endpoints
1. **`/api/game/[gameId]/state`** (state/route.ts)
   - Returns: game info, players, current phase
   - **Issue:** Intentionally excludes Player.role (line 66: "Role intentionally NOT included")
   - **Fix needed:** Add query param `?includeRoles=true` for transparency mode

2. **`/api/game/[gameId]/messages`** (messages/route.ts)
   - Returns: DiscussionMessages only (excludes NightMessages)
   - Comment: "Excludes NightMessages (privacy guarantee)" (line 6)
   - **Fix needed:** Create new endpoint `/api/game/[gameId]/night-messages`

3. **`/api/game/[gameId]/stream`** (SSE endpoint)
   - Emits: phase_change, message, vote_cast, player_eliminated events
   - **Issue:** Does not emit night_message events
   - **Fix needed:** Backend must emit night_message events during Night phase

### Shared UI Components (shadcn/ui style)

#### Badge Component (`app/components/ui/Badge.tsx`)
- **Variants:** alive, dead, mafia, villager, phase
- **Colors:**
  - mafia: purple background, purple text (line 19)
  - villager: blue background, blue text (line 20)
- **Key finding:** Badge variants already defined for role display

#### Card Component (`app/components/ui/Card.tsx`)
- Standard wrapper with white bg, gray border, rounded corners, shadow
- Used consistently across all game components

#### Button Component (exists in ui folder)
- Primary/secondary variants used in DiscussionFeed for scroll lock

## Patterns Identified

### Pattern 1: SSE Event Subscription
**Description:** All components subscribe to real-time events via useGameEvents() hook

**Use Case:** Real-time UI updates (messages, votes, phase changes, eliminations)

**Example:**
```tsx
const { events } = useGameEvents();

useEffect(() => {
  const messageEvents = events.filter((e) => e.type === 'message');
  // Process events...
}, [events]);
```

**Recommendation:** Use for MafiaChatPanel - filter events by type 'night_message'

### Pattern 2: Deterministic Avatar Colors
**Description:** Consistent avatar colors/initials based on player name (avatar-colors.ts utility)

**Use Case:** Visual player identification across all components

**Example:**
```tsx
const avatarBgColor = getAvatarColor(player.name); // "bg-blue-500"
const avatarInitial = getAvatarInitial(player.name); // "A"
```

**Recommendation:** Reuse in MafiaChatPanel for consistency

### Pattern 3: Phase-Conditional Rendering
**Description:** Components show/hide based on currentPhase extracted from events

**Use Case:** VoteTally only during VOTING, MafiaChatPanel only during NIGHT

**Example:**
```tsx
const currentPhase = useMemo<GamePhase | null>(() => {
  const phaseEvents = events.filter((e) => e.type === 'phase_change');
  const latestPhase = phaseEvents[phaseEvents.length - 1];
  return (latestPhase.payload as any).to as GamePhase;
}, [events]);

{currentPhase === 'VOTING' && <VoteTally />}
```

**Recommendation:** Show MafiaChatPanel when currentPhase === 'NIGHT'

### Pattern 4: Card + Badge UI Structure
**Description:** Consistent layout using Card wrapper with section header and Badge indicators

**Use Case:** All game panels (PlayerGrid, VoteTally, DiscussionFeed)

**Example:**
```tsx
<Card>
  <div className="text-sm text-gray-500 uppercase tracking-wide mb-3">
    Players ({aliveCount}/{players.length} Alive)
  </div>
  {/* Content */}
</Card>
```

**Recommendation:** Use same structure for MafiaChatPanel

## Complexity Assessment

### Feature 6: Display Player Roles from Start

**Complexity: SIMPLE**

**Rationale:**
- Player.role field exists in database (schema.prisma line 41)
- Badge variants already defined (mafia, villager)
- Only changes needed:
  1. Modify `/api/game/[gameId]/state` to include role field (state/route.ts line 66)
  2. Update PlayerGrid to display role badge (line 154-156)

**Files to modify:**
- `app/app/api/game/[gameId]/state/route.ts` - Include role in response (1 line change)
- `app/components/PlayerGrid.tsx` - Replace "Role: ?" with Badge component (3 lines)

**Estimated time:** 30 minutes

**Risk:** NONE - additive change, no breaking changes

### Feature 7: Show Mafia Private Night Chat

**Complexity: MEDIUM**

**Rationale:**
- NightMessage table exists with full data (schema.prisma lines 82-99)
- Need new API endpoint (simple query, follow messages/route.ts pattern)
- Need new component (copy DiscussionFeed.tsx, filter for Mafia players)
- Need backend event emission (add night_message events to night-phase.ts)
- Need layout changes (split screen or conditional panel)

**Files to create:**
1. `app/app/api/game/[gameId]/night-messages/route.ts` - Fetch NightMessages (NEW)
2. `app/components/MafiaChatPanel.tsx` - Display Mafia chat (NEW, 200 lines, copy DiscussionFeed)

**Files to modify:**
3. `app/app/game/[gameId]/page.tsx` - Add MafiaChatPanel to layout (10 lines)
4. Backend: night-phase.ts - Emit night_message events (5 lines)

**Estimated time:** 3-4 hours

**Risk:** LOW - follows existing patterns, no breaking changes

### Feature 8: Enhanced Phase Visualization

**Complexity: SIMPLE**

**Rationale:**
- PhaseIndicator already comprehensive (icons, colors, progress bar)
- Phase config already detailed (phase-config.ts)
- Enhancement: Add timeline visualization showing all phases

**Files to create:**
1. `app/components/PhaseTimeline.tsx` - Horizontal timeline component (NEW, 100 lines)

**Files to modify:**
2. `app/components/PhaseIndicator.tsx` - Integrate timeline (5 lines)
3. `app/lib/game/phase-config.ts` - Add phase order array (optional)

**Estimated time:** 1-2 hours

**Risk:** NONE - pure CSS, no logic changes

### Feature 9: Role-Colored Player Cards

**Complexity: SIMPLE**

**Rationale:**
- Already have role data (Feature 6 dependency)
- Just need conditional border/background colors in PlayerGrid

**Files to modify:**
1. `app/components/PlayerGrid.tsx` - Add role-based styling (5 lines, conditional className)

**Estimated time:** 30 minutes

**Risk:** NONE - styling change only

**Dependency:** Requires Feature 6 complete (role data available)

### Feature 10: Enhanced Vote Visualization

**Complexity: SIMPLE**

**Rationale:**
- VoteTally already sophisticated (majority threshold, justifications, progress)
- Enhancements are incremental (vote history, pattern highlighting)

**Vote History Panel:**
- Query Vote table with roundNumber filter
- Display in accordion/collapsible component
- Show who voted for whom in previous rounds

**Files to create:**
1. `app/components/VoteHistory.tsx` - Historical vote display (NEW, 150 lines)

**Files to modify:**
2. `app/components/VoteTally.tsx` - Add "Show History" toggle (10 lines)

**Estimated time:** 2-3 hours

**Risk:** LOW - additive feature, optional enhancement

## Integration Points

### External APIs

**None** - All data from PostgreSQL database via Prisma

### Internal Integrations

#### 1. PlayerGrid ↔ GameEventsContext
**Connection:** Subscribes to player_eliminated events
**Data flow:** Event → Update player.isAlive state
**Challenge:** Need to also display role from initial state fetch

#### 2. MafiaChatPanel ↔ GameEventsContext
**Connection:** Subscribe to night_message events (NEW)
**Data flow:** Backend emits → SSE delivers → MafiaChatPanel displays
**Challenge:** Backend does not currently emit night_message events

#### 3. MafiaChatPanel ↔ Game Page Layout
**Connection:** Conditionally render during NIGHT phase
**Data flow:** currentPhase extracted from events → show/hide panel
**Challenge:** Layout must accommodate split screen or collapsible panel

#### 4. State API ↔ PlayerGrid
**Connection:** Initial state fetch includes role data (once modified)
**Data flow:** API returns role → PlayerGrid displays badge
**Challenge:** API currently excludes role - need to add includeRoles param

## Risks & Challenges

### Technical Risks

**Risk 1: Backend Night Message Event Emission**
- **Description:** Backend may not emit night_message events during Night phase
- **Impact:** Mafia chat won't update in real-time, only on page refresh
- **Mitigation:** Add gameEventEmitter.emit('night_message', ...) in night-phase.ts (backend work)
- **Likelihood:** HIGH - event emission likely missing

**Risk 2: Split Screen Layout on Mobile**
- **Description:** Split screen (DiscussionFeed + MafiaChatPanel) may be cramped on mobile
- **Impact:** Poor mobile UX, text truncation
- **Mitigation:** Stack vertically on mobile (Tailwind: md:grid-cols-2), test on multiple screen sizes
- **Likelihood:** MEDIUM - responsive design needed

### Complexity Risks

**Risk 3: MafiaChatPanel Component Size**
- **Description:** Copying DiscussionFeed (350 lines) and adapting for night messages
- **Impact:** Large component to test and debug
- **Mitigation:** Reuse existing utilities (avatar-colors, message-classification), copy-paste proven patterns
- **Likelihood:** LOW - straightforward adaptation

**Risk 4: Vote History Performance**
- **Description:** Querying Vote table for all rounds may be slow for long games (10+ rounds)
- **Impact:** UI lag when opening vote history
- **Mitigation:** Lazy load vote history (fetch on demand), cache results
- **Likelihood:** LOW - vote count is small (10-20 votes per round)

## Recommendations for Planner

### 1. **Feature 6 (Role Display) is Quick Win - Start Here**
- Only 2 file changes, 30 minutes, zero risk
- Provides immediate transparency value
- No dependencies

### 2. **Feature 7 (Mafia Chat) is Critical Path**
- Requires backend event emission (coordinate with backend team)
- Split screen layout recommended (Desktop: side-by-side, Mobile: stacked)
- Reuse DiscussionFeed component pattern for consistency

### 3. **Feature 8 (Phase Timeline) is Optional Enhancement**
- PhaseIndicator already good - timeline is nice-to-have
- Can defer if time constrained
- Pure CSS, no logic complexity

### 4. **Features 9 & 10 are Incremental Polish**
- Role-colored cards: 30 minutes after Feature 6
- Vote history: 2-3 hours, optional for MVP
- Both are additive, no breaking changes

### 5. **Split Screen Layout Strategy**
```tsx
// During NIGHT phase:
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <DiscussionFeed /> {/* Left: Public (may be empty) */}
  <MafiaChatPanel /> {/* Right: Mafia coordination */}
</div>

// During other phases:
<DiscussionFeed /> {/* Full width */}
```

### 6. **Backend Coordination Required**
- **File:** src/lib/phases/night-phase.ts (or similar)
- **Change:** Add event emission after each Mafia message
```ts
gameEventEmitter.emit('night_message', {
  gameId,
  type: 'night_message',
  payload: {
    id: message.id,
    playerId: player.id,
    playerName: player.name,
    message: message.message,
    timestamp: message.timestamp,
    roundNumber: game.roundNumber,
    turn: message.turn,
  },
});
```

## Resource Map

### Critical Files/Directories

#### Components (app/components/)
- **PlayerGrid.tsx** - 164 lines, modify for role display (Feature 6, 9)
- **VoteTally.tsx** - 215 lines, enhance for vote history (Feature 10)
- **PhaseIndicator.tsx** - 196 lines, add timeline (Feature 8)
- **DiscussionFeed.tsx** - 357 lines, copy for MafiaChatPanel (Feature 7)

#### API Routes (app/app/api/game/[gameId]/)
- **state/route.ts** - 80 lines, modify to include roles (Feature 6)
- **messages/route.ts** - 92 lines, copy for night-messages endpoint (Feature 7)

#### UI Components (app/components/ui/)
- **Badge.tsx** - 32 lines, already has mafia/villager variants (Feature 6, 9)
- **Card.tsx** - 23 lines, used for all panels (Feature 7, 8, 10)

#### Game Page Layout
- **app/app/game/[gameId]/page.tsx** - 192 lines, add MafiaChatPanel (Feature 7)

#### Configuration
- **app/lib/game/phase-config.ts** - 161 lines, already comprehensive (Feature 8)

#### Context
- **app/contexts/GameEventsContext.tsx** - 150+ lines (not fully read), SSE event subscription

### Key Dependencies

**React Hooks:**
- `useGameEvents()` - Subscribe to SSE events (all components)
- `useMemo()` - Extract currentPhase from events (conditional rendering)
- `useEffect()` - Event processing, initial state fetch

**UI Libraries:**
- Tailwind CSS - All styling (responsive grid, colors, spacing)
- date-fns - Relative timestamps ("2 minutes ago")

**Database:**
- Prisma Client - All API endpoints query PostgreSQL
- Player.role field - Already exists, just need to expose
- NightMessage table - Already exists, need API endpoint

**Event System:**
- gameEventEmitter - Backend emits events (need night_message events)
- EventSource - Frontend subscribes to SSE stream

### Testing Infrastructure

**Manual Testing:**
- Create game with 10 players (3 Mafia, 7 Villagers)
- Watch Night phase → Verify Mafia chat appears
- Check role badges → Verify red/blue colors
- Refresh page → Verify roles persist

**Playwright E2E (Iteration 3):**
- Test: Roles visible from game start
- Test: Mafia chat panel appears during Night phase
- Test: Phase timeline shows current phase highlighted
- Test: Vote history displays previous rounds

## Questions for Planner

1. **Backend coordination:** Who handles night_message event emission in night-phase.ts? (Estimated: 30 minutes backend work)

2. **Split screen vs tabs:** Confirm split screen layout for Mafia chat (recommended) or consider tabbed view? (Split screen better for transparency)

3. **Vote history priority:** Is vote history panel required for Iteration 6, or defer to future iteration? (2-3 hours work, optional for MVP)

4. **Mobile responsive:** Should we optimize for mobile in Iteration 6, or desktop-first? (Recommendation: Desktop-first, stack vertically on mobile)

5. **Role toggle future-proofing:** Should we add `showRoles` prop to PlayerGrid for future non-transparency mode? (5 minutes, good for extensibility)

---

**Exploration completed:** 2025-10-13  
**Iteration:** 6 (Global Iteration 6)  
**Plan:** plan-2  
**Explorer:** explorer-1  
**Complexity:** MEDIUM (5 features, 8-12 hours total)
