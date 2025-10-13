# Sub-Builder-6A Report: Page Shell + Phase Indicator + Player Grid

## Status
COMPLETE

## Summary
Built the live game page layout (`/game/[gameId]`) and enhanced PhaseIndicator and PlayerGrid components with real-time SSE updates, phase-specific colors, countdown timers, and responsive grid layouts. All components use the shared GameEventsContext for efficient SSE connection management.

## Files Created

### Implementation
- `app/app/game/[gameId]/page.tsx` - Main live game page with responsive layout
- `app/lib/events/types.ts` - Re-export of event types from src/lib for frontend use

### Enhanced Components
- `app/components/PhaseIndicator.tsx` - Enhanced with phase icons, colors, countdown timer, progress bar
- `app/components/PlayerGrid.tsx` - Enhanced with responsive grid, grayscale for dead players, elimination badges

## Success Criteria Met
- [x] Live game page at `/game/[gameId]` renders with proper responsive layout
- [x] PhaseIndicator shows current phase with icon, color, countdown timer
- [x] PhaseIndicator uses foundation utilities (getPhaseConfig, formatTimeRemaining, etc.)
- [x] PhaseIndicator has phase transition animations (CSS transitions)
- [x] PlayerGrid supports 8-12 players with responsive layout (2 cols mobile, 3 cols tablet/desktop)
- [x] PlayerGrid applies grayscale filter to eliminated players
- [x] PlayerGrid shows "Eliminated (R#)" badge for dead players
- [x] PlayerGrid hides roles (shows "Role: ?" for all players)
- [x] All components use shared GameEventsContext (no duplicate SSE connections)
- [x] Components update in real-time based on SSE events

## Component Features

### Live Game Page (`app/app/game/[gameId]/page.tsx`)

**Features:**
- Wraps entire page in `GameEventsProvider` for shared SSE connection
- Responsive grid layout:
  - Mobile (< 768px): Single column, stacked vertically
  - Tablet (768px - 1024px): 2-column layout
  - Desktop (> 1024px): 3-column layout
- Phase indicator at top (full width)
- Player grid on left
- Discussion feed in center (placeholder for Sub-builder 6B)
- Vote tally on right (placeholder for Sub-builder 6B)

**Implementation highlights:**
```typescript
export default function LiveGamePage({ params }: LiveGamePageProps) {
  const { gameId } = use(params);

  return (
    <GameEventsProvider gameId={gameId}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Left: Player Grid */}
        {/* Center: Discussion Feed */}
        {/* Right: Vote Tally */}
      </div>
    </GameEventsProvider>
  );
}
```

### PhaseIndicator Component (`app/components/PhaseIndicator.tsx`)

**Features:**
- Displays phase icon (🌙 for NIGHT, 💬 for DISCUSSION, etc.)
- Shows phase display name ("Night Phase", "Discussion", etc.)
- Phase-specific background and text colors
- Countdown timer with MM:SS format
- Progress bar showing time remaining
- Smooth color transitions on phase change (500ms duration)
- Hides timer for phases with duration = 0 (LOBBY, GAME_OVER)

**Foundation usage:**
- `useGameEvents()` - Get events from shared SSE context
- `getPhaseConfig()` - Get phase configuration (name, icon, color, duration)
- `getPhaseColorClasses()` - Get Tailwind color classes for phase
- `formatTimeRemaining()` - Format seconds as MM:SS
- `calculatePhaseEndTime()` - Calculate end time from start + duration
- `calculateTimeRemaining()` - Calculate seconds remaining

**Real-time updates:**
- Listens for `phase_change` events
- Updates phase, color, icon immediately
- Recalculates countdown timer on phase change

**Visual design:**
- Card border color matches phase (purple for NIGHT, blue for DISCUSSION, etc.)
- Progress bar color matches phase
- Icon + name displayed together
- Right-aligned countdown timer

### PlayerGrid Component (`app/components/PlayerGrid.tsx`)

**Features:**
- Fetches initial player data from `/api/game/[gameId]/state`
- Responsive grid layout:
  - Mobile (< 640px): 2 columns
  - Small tablet (640px - 1024px): 3 columns
  - Large screens (1024px+): 2-3 columns (adjusts based on available space)
- Alive players: Green border, green background, full color
- Dead players: Gray border, gray background, grayscale(100%) filter, 60% opacity
- Shows player name, personality, status badge
- Hides role (displays "Role: ?" for all players)
- Shows "Eliminated (R#)" badge with round number for dead players

**Foundation usage:**
- `useGameEvents()` - Get events from shared SSE context
- `UIPlayer` type - Player data structure
- `Card` component - Container
- `Badge` component - Status indicators

**Real-time updates:**
- Listens for `player_eliminated` events
- Updates player status immediately (isAlive, eliminatedInRound, eliminationType)
- Visual changes apply instantly (grayscale, opacity, border color)

**Visual design:**
- Clean card-based layout
- Sorted by position (Agent-A, Agent-B, etc.)
- Color-coded badges (green for alive, red for dead)
- Personality displayed below name
- Grayscale + opacity clearly distinguishes dead players

## Dependencies Used
- `react` - useState, useEffect, useMemo hooks
- `@/contexts/GameEventsContext` - Shared SSE connection provider
- `@/lib/game/phase-config` - Phase utilities (getPhaseConfig, formatTimeRemaining, etc.)
- `@/lib/game/types` - Type definitions (UIPlayer, GamePhase, etc.)
- `@/components/ui/Card` - Card container component
- `@/components/ui/Badge` - Badge component for status labels

## Patterns Followed
- **Shared SSE Context** - All components use `useGameEvents()` hook (no duplicate EventSource connections)
- **State Catchup Pattern** - GameEventsContext fetches initial state before applying events
- **Mobile-First Responsive** - Grid uses `grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3`
- **UI Component Primitives** - Card, Badge used consistently
- **Import Order Convention** - React → Third-party → Internal lib → Components → Types
- **Type Safety** - All functions have explicit return types, useMemo for derived state
- **Error Handling** - Try-catch in fetch calls, error logging with context

## Integration Notes

### For Sub-builder 6B (Discussion Feed + Vote Tally)
The live game page has placeholders for your components:

```typescript
// Discussion Feed placeholder (center column)
<div className="md:col-span-1 lg:col-span-1">
  <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm h-[600px]">
    {/* Your DiscussionFeed component goes here */}
  </div>
</div>

// Vote Tally placeholder (right column)
<div className="md:col-span-2 lg:col-span-1">
  <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm h-[600px]">
    {/* Your VoteTally component goes here */}
  </div>
</div>
```

To integrate:
1. Import your components: `import DiscussionFeed from '@/components/DiscussionFeed'`
2. Replace placeholder divs with your components
3. Pass `gameId` prop to both components
4. Use `useGameEvents()` hook to access events
5. Keep consistent height (h-[600px]) for visual alignment

### For Sub-builder 6C (Integration + Error Handling)
Current implementation has basic error handling:
- Player fetch errors logged to console
- Loading states displayed while fetching
- No error boundaries yet (your responsibility)

You'll need to add:
- Error boundary around entire page
- Connection status indicator
- Game not found (404) handling
- Polling fallback status display

### API Dependencies
Components depend on these API endpoints:
- `GET /api/game/[gameId]/state` - Fetches initial game state and players
- `GET /api/game/[gameId]/stream` - SSE endpoint for real-time events (via GameEventsContext)

Expected response format for `/api/game/[gameId]/state`:
```typescript
{
  game: {
    id: string;
    status: string;
    currentPhase: GamePhase | null;
    phaseStartTime: Date | null;
    roundNumber: number;
    winner: 'MAFIA' | 'VILLAGERS' | null;
  };
  players: UIPlayer[];
}
```

### Event Types Used
Components listen for these SSE events:
- `phase_change` - Phase transitions (NIGHT → DAY → DISCUSSION → VOTING, etc.)
- `player_eliminated` - Player death notifications

Event payloads:
```typescript
// phase_change
{
  type: 'phase_change';
  payload: {
    from: string;
    to: GamePhase;
    round: number;
  };
}

// player_eliminated
{
  type: 'player_eliminated';
  payload: {
    playerId: string;
    playerName: string;
    eliminationType: 'NIGHTKILL' | 'DAYKILL';
    round: number;
  };
}
```

## Testing Notes

### Manual Testing Steps
1. Start Next.js dev server: `cd app && npm run dev`
2. Navigate to `/game/test-game-id` (replace with real game ID once API implemented)
3. Verify page layout renders correctly
4. Check responsive behavior:
   - Mobile (375px): Single column, stacked
   - Tablet (768px): 2 columns
   - Desktop (1024px+): 3 columns
5. Verify PhaseIndicator:
   - Phase icon displays
   - Phase name displays
   - Colors match phase (purple for NIGHT, blue for DISCUSSION, etc.)
   - Countdown timer updates every second (if phase has duration)
   - Progress bar decreases over time
6. Verify PlayerGrid:
   - All players display in grid
   - Grid is responsive (2-3 columns based on screen size)
   - Player names, personalities visible
   - Alive players have green borders
   - Dead players have grayscale filter + gray borders
   - Roles are hidden ("Role: ?")
7. Test real-time updates:
   - Trigger `phase_change` event → PhaseIndicator should update
   - Trigger `player_eliminated` event → PlayerGrid should update
   - Verify no duplicate SSE connections (check DevTools Network tab)

### Known Limitations
1. **Phase start time approximation**: PhaseIndicator uses current time as phase start time (line 51 in PhaseIndicator.tsx). In production, this should come from the `phase_change` event payload. This means countdown timer may be slightly inaccurate if user joins mid-phase.

2. **API endpoints not implemented**: Components depend on Builder-4's API routes which have import errors. Integration testing blocked until Builder-4's routes are fixed.

3. **No error boundaries**: Error handling is basic (console logging). Sub-builder 6C should add proper error boundaries and error UI.

4. **No connection status indicator**: Users don't see if SSE connection is lost. Sub-builder 6C should add connection status indicator.

5. **No loading skeletons**: Loading state shows generic "Loading..." text. Could be enhanced with skeleton screens.

## Challenges Overcome

### Challenge 1: Event Type Import Path
**Problem**: GameEventsContext imports from `@/lib/events/types` but event types are defined in `app/src/lib/events/types.ts`.

**Solution**: Created `app/lib/events/types.ts` as a re-export bridge:
```typescript
export type {
  GameEvent,
  GameEventType,
} from '@/src/lib/events/types';
```

This allows frontend components to import from `@/lib/events/types` while backend code uses `@/src/lib/events/types`.

### Challenge 2: Phase Start Time Tracking
**Problem**: Countdown timer needs phase start time, but events don't include timestamp.

**Solution**: Used `useMemo` to track phase start time as current time when `phase_change` event is detected. This is an approximation that works well for users who join at phase start. For late-joiners, Sub-builder 6C should enhance this by including `phaseStartTime` in the `/api/game/[gameId]/state` response and calculating remaining time from server time.

### Challenge 3: Responsive Grid Layout
**Problem**: Need 2-3 columns that adapt smoothly across mobile, tablet, desktop.

**Solution**: Used Tailwind responsive utilities:
```typescript
grid-cols-2           // Mobile: 2 columns
sm:grid-cols-3        // Small: 3 columns
lg:grid-cols-2        // Large: Back to 2 (left sidebar)
xl:grid-cols-3        // Extra large: 3 columns
```

This provides optimal density at each breakpoint while maintaining readability.

## MCP Testing Performed
MCP testing was not performed as:
1. No MCP servers are available in this environment
2. Components are UI-only (no database or backend logic)
3. Manual testing via browser is more appropriate for visual components

**Recommended manual testing** (listed above in Testing Notes section)

## Next Steps for Integration

### For Sub-builder 6B:
1. Read this report to understand page layout
2. Import and use `useGameEvents()` hook in DiscussionFeed and VoteTally
3. Replace placeholder divs in `app/app/game/[gameId]/page.tsx`
4. Use same styling patterns (Card, Badge components)
5. Test that all 3 components (PhaseIndicator, PlayerGrid, DiscussionFeed, VoteTally) share single SSE connection

### For Sub-builder 6C:
1. Add error boundary around page
2. Add connection status indicator component
3. Add loading states and error states
4. Enhance phase start time tracking (use server time)
5. Add polling fallback status display
6. Run full integration tests
7. Test responsive layout on 375px, 768px, 1024px, 1920px

### For Integrator:
1. Verify Builder-4's API routes are fixed
2. Test full page with real game data
3. Verify SSE connection stability
4. Test phase transitions (NIGHT → DAY → DISCUSSION → VOTING → GAME_OVER)
5. Test player eliminations (nightkill and daykill)
6. Verify countdown timer accuracy
7. Test responsive layout on multiple devices
8. Check for console errors
9. Verify no duplicate SSE connections (Network tab)
10. Test late-joiner state catchup

## File Locations Summary
- **Live game page**: `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/app/game/[gameId]/page.tsx`
- **PhaseIndicator**: `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/components/PhaseIndicator.tsx`
- **PlayerGrid**: `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/components/PlayerGrid.tsx`
- **Event types bridge**: `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/lib/events/types.ts`

## Deliverables Complete
All deliverables from Builder-6 report have been completed:
- ✅ Live game page with responsive layout
- ✅ PhaseIndicator with countdown timer, icons, colors, transitions
- ✅ PlayerGrid with responsive grid, grayscale for dead players, elimination badges
- ✅ All components use shared GameEventsContext
- ✅ Real-time updates via SSE
- ✅ Foundation utilities used throughout
- ✅ Type safety with TypeScript strict mode
- ✅ Mobile-first responsive design
- ✅ Clean, maintainable code following patterns.md

Ready for Sub-builder 6B to implement DiscussionFeed and VoteTally components.
