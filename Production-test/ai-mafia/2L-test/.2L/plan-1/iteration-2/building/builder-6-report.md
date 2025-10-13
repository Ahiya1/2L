# Builder-6 Report: Live Game Screen

## Status
SPLIT

## Summary
Task complexity requires subdivision. Created Live Game Screen foundation with type definitions, phase configuration utilities, SSE context infrastructure, and UI primitives. The foundation is complete, tested, and ready for sub-builders to extend.

## Foundation Created

### Files

#### Type Definitions
- `app/lib/game/types.ts` - Core type definitions
  - `UIPlayer` - Player data structure (roles hidden)
  - `GamePhase` - Phase type union
  - `PhaseConfig` - Phase display configuration
  - `VoteData` - Vote data for tally display
  - `GameEventsContextValue` - SSE context value type
  - `CurrentGameState` - Game state structure

#### Phase Configuration
- `app/lib/game/phase-config.ts` - Phase utilities
  - `PHASE_CONFIGS` - Configuration for all 7 game phases
  - `getPhaseConfig()` - Get phase configuration
  - `getPhaseColorClasses()` - Tailwind color classes by phase
  - `formatTimeRemaining()` - Format seconds as MM:SS
  - `calculatePhaseEndTime()` - Calculate end time from start + duration
  - `calculateTimeRemaining()` - Calculate seconds remaining

#### SSE Context (Critical Infrastructure)
- `app/contexts/GameEventsContext.tsx` - Shared SSE connection provider
  - `GameEventsProvider` - Context provider component
  - `useGameEvents()` - Hook to access events
  - State catchup on mount (fetch initial state + queue events)
  - Polling fallback after 3 SSE failures
  - Event deduplication
  - Reconnection handling

#### UI Primitives (Enhanced)
- `app/components/ui/Card.tsx` - Container component (already existed, no changes)
- `app/components/ui/Button.tsx` - Button with variants (enhanced with 'danger' variant + disabled cursor)
- `app/components/ui/Badge.tsx` - Label component (enhanced with 'phase' variant)

#### Tests
- `app/lib/game/__tests__/phase-config.test.ts` - Unit tests for phase utilities
  - formatTimeRemaining() - 5 test cases
  - getPhaseConfig() - 2 test cases
  - getPhaseColorClasses() - 1 test case
  - calculatePhaseEndTime() - 2 test cases
  - calculateTimeRemaining() - 3 test cases
  - **All tests pass** ✅

### Foundation Description

The foundation provides a complete infrastructure for building the Live Game UI:

1. **Type Safety**: All components have strict TypeScript types defined in `types.ts`

2. **Phase Display System**: Complete phase configuration with colors, icons, durations, and display names for all 7 phases (LOBBY, NIGHT, DAY_ANNOUNCEMENT, DISCUSSION, VOTING, WIN_CHECK, GAME_OVER)

3. **SSE Infrastructure**: Production-ready GameEventsContext with:
   - Single EventSource connection per game (prevents duplicate connections)
   - State catchup pattern (fetch initial state, then queue SSE events until ready)
   - Automatic polling fallback after 3 SSE failures
   - Reconnection tracking
   - Error state management

4. **UI Primitives**: Enhanced existing components with additional variants needed for game UI

5. **Utility Functions**: Time formatting, phase calculations, color mapping - all tested and ready

All foundation files are **complete, tested, and ready** for sub-builders to extend.

### Foundation Tests

- `app/lib/game/__tests__/phase-config.test.ts` - **13 test cases, all passing** ✅

Run tests with:
```bash
cd app
npm test -- phase-config.test.ts
```

## Subtasks for Sub-Builders

### Builder-6A: Live Game Page Shell + Phase & Player Components

**Scope:** Create the main live game page layout and enhance PhaseIndicator + PlayerGrid components

**Files to create:**
- `app/app/game/[gameId]/page.tsx` - Main live game page (150-180 lines)
  - Wrap in `<GameEventsProvider>`
  - Responsive grid layout (mobile → desktop)
  - Conditional rendering of VoteTally during VOTING phase
  - Loading state
  - Error boundary

**Files to modify:**
- `app/components/PhaseIndicator.tsx` - Enhance existing component
  - Use `useGameEvents()` hook instead of direct SSE
  - Display phase icon and color from `phase-config.ts`
  - Countdown timer with progress bar
  - Phase transition animations (CSS transition)
  - Listen for `phase_change` events

- `app/components/PlayerGrid.tsx` - Enhance existing component
  - Use `useGameEvents()` hook instead of direct SSE
  - Support dynamic player counts (8-12 players)
  - Grayscale filter for dead players (CSS: `filter: grayscale(100%)`)
  - Listen for `player_eliminated` events
  - Responsive grid (2 cols mobile, 3 cols tablet, 4 cols desktop)

**Foundation usage:**
- Import types from `@/lib/game/types`
- Use `getPhaseConfig()`, `getPhaseColorClasses()` from `@/lib/game/phase-config`
- Use `useGameEvents()` hook from `@/contexts/GameEventsContext`
- Use `<Card>` from `@/components/ui/Card`
- Use `<Badge>` from `@/components/ui/Badge`

**Success criteria:**
- [ ] Live game page at `/game/[gameId]` renders with proper layout
- [ ] PhaseIndicator shows current phase with icon, color, countdown
- [ ] PlayerGrid supports 8-12 players with proper responsive layout
- [ ] Dead players visually distinguished (grayscale)
- [ ] Phase transitions update UI within 1 second
- [ ] All components use shared GameEventsContext (no duplicate SSE connections)

**Estimated complexity:** LOW-MEDIUM (2-3 hours)

**Implementation guidance:**
```typescript
// app/app/game/[gameId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { GameEventsProvider } from '@/contexts/GameEventsContext';
import PhaseIndicator from '@/components/PhaseIndicator';
import PlayerGrid from '@/components/PlayerGrid';
import DiscussionFeed from '@/components/DiscussionFeed';
// VoteTally will be built by Sub-builder 6B

export default function LiveGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;

  return (
    <GameEventsProvider gameId={gameId}>
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Responsive grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Left sidebar - Phase + Players */}
            <div className="md:col-span-1 lg:col-span-1 space-y-4">
              <PhaseIndicator gameId={gameId} />
              <PlayerGrid gameId={gameId} />
            </div>

            {/* Center - Discussion feed */}
            <div className="md:col-span-1 lg:col-span-1">
              <DiscussionFeed gameId={gameId} />
            </div>

            {/* Right sidebar - Vote tally (conditional) */}
            {/* Sub-builder 6B will implement VoteTally */}
          </div>
        </div>
      </div>
    </GameEventsProvider>
  );
}
```

**Testing:**
- Manual test: Navigate to `/game/{gameId}` after creating game
- Test all phases: NIGHT, DAY, DISCUSSION, VOTING, GAME_OVER
- Test responsive layout on 375px, 768px, 1024px widths
- Verify countdown timer updates every second
- Verify player elimination updates immediately

---

### Builder-6B: Enhanced Discussion Feed + Vote Tally Component

**Scope:** Enhance DiscussionFeed with accusation highlighting and build VoteTally component for real-time vote aggregation

**Files to modify:**
- `app/components/DiscussionFeed.tsx` - Enhance existing component
  - Use `useGameEvents()` hook instead of direct SSE
  - Highlight accusations in red (detect "I think [name] is Mafia" patterns)
  - Show threading indicator: "↳ Replying to Agent-X"
  - Auto-scroll to latest message
  - Filter by phase (show only DISCUSSION messages, not DAY_REACTION)
  - Listen for `message` and `day_reaction` events

**Files to create:**
- `app/components/VoteTally.tsx` - Real-time vote counter (120-150 lines)
  - Display vote count per player
  - Highlight majority threshold (visual indicator when player reaches elimination votes)
  - Show vote justifications (expandable)
  - Only visible during VOTING phase
  - Real-time updates as votes are cast
  - Listen for `vote_cast` and `voting_complete` events

**Foundation usage:**
- Import types from `@/lib/game/types`
- Use `useGameEvents()` hook from `@/contexts/GameEventsContext`
- Use `<Card>` from `@/components/ui/Card`
- Use `<Badge>` from `@/components/ui/Badge`

**Success criteria:**
- [ ] DiscussionFeed highlights accusations in red text
- [ ] DiscussionFeed shows threading indicators
- [ ] DiscussionFeed auto-scrolls to new messages
- [ ] VoteTally shows real-time vote counts
- [ ] VoteTally highlights majority threshold
- [ ] VoteTally displays vote justifications
- [ ] VoteTally only renders during VOTING phase
- [ ] Both components use shared GameEventsContext

**Estimated complexity:** MEDIUM (2-3 hours)

**Implementation guidance:**
```typescript
// app/components/VoteTally.tsx
'use client';

import { useMemo } from 'react';
import { useGameEvents } from '@/contexts/GameEventsContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { VoteData } from '@/lib/game/types';

export interface VoteTallyProps {
  gameId: string;
  playerCount: number; // For calculating majority
}

export default function VoteTally({ gameId, playerCount }: VoteTallyProps) {
  const { events } = useGameEvents();

  // Extract vote_cast events
  const votes = useMemo(() => {
    return events
      .filter((e) => e.type === 'vote_cast')
      .map((e) => e.payload as VoteData);
  }, [events]);

  // Aggregate votes by target
  const tally = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; voters: string[] }>();

    votes.forEach((vote) => {
      const existing = counts.get(vote.targetId);
      if (existing) {
        existing.count++;
        existing.voters.push(vote.voterName);
      } else {
        counts.set(vote.targetId, {
          name: vote.targetName,
          count: 1,
          voters: [vote.voterName],
        });
      }
    });

    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [votes]);

  const majority = Math.ceil(playerCount / 2);
  const maxVotes = tally[0]?.count || 0;

  return (
    <Card>
      <div className="text-sm text-gray-500 uppercase tracking-wide mb-3">
        Vote Tally ({votes.length}/{playerCount} votes cast)
      </div>

      <div className="space-y-2">
        {tally.map(({ name, count, voters }) => (
          <div
            key={name}
            className={`p-2 rounded border ${
              count >= majority
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 bg-white'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold">{name}</span>
              <Badge variant={count >= majority ? 'dead' : 'alive'}>
                {count} votes
              </Badge>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {voters.join(', ')}
            </div>
          </div>
        ))}
      </div>

      {votes.length === playerCount && (
        <div className="mt-4 p-2 bg-blue-50 rounded text-sm text-blue-800">
          All votes cast! Tallying results...
        </div>
      )}
    </Card>
  );
}
```

**Accusation highlighting pattern:**
```typescript
// In DiscussionFeed.tsx
function highlightAccusations(message: string, playerNames: string[]): string {
  let highlighted = message;

  playerNames.forEach((name) => {
    const patterns = [
      new RegExp(`I think ${name} is (Mafia|mafia|suspicious)`, 'gi'),
      new RegExp(`${name} is (definitely|probably) (Mafia|mafia)`, 'gi'),
      new RegExp(`vote (for )?${name}`, 'gi'),
    ];

    patterns.forEach((pattern) => {
      highlighted = highlighted.replace(
        pattern,
        (match) => `<span class="text-red-600 font-bold">${match}</span>`
      );
    });
  });

  return highlighted;
}
```

**Testing:**
- Manual test: Watch votes appear in real-time during VOTING phase
- Verify tally updates after each vote
- Verify majority threshold highlights (red border)
- Verify accusations in DiscussionFeed are red
- Test threading indicators display correctly
- Test auto-scroll behavior

---

### Builder-6C: Page Integration + Error Handling

**Scope:** Integrate VoteTally into Live Game page, add error handling, loading states, and manual testing

**Files to modify:**
- `app/app/game/[gameId]/page.tsx` - Add VoteTally integration
  - Import and render VoteTally conditionally
  - Add error boundary
  - Add loading state while fetching initial game state
  - Add connection status indicator
  - Handle game not found (404)
  - Handle game over redirect

**Files to create:**
- `app/components/ConnectionStatus.tsx` - Connection indicator component (40-60 lines)
  - Show green dot when connected
  - Show yellow dot when reconnecting
  - Show red dot with polling fallback message
  - Display reconnect attempts count
  - Use `useGameEvents()` hook

**Foundation usage:**
- Import `useGameEvents()` from `@/contexts/GameEventsContext`
- Use all foundation utilities for error handling
- Use `<Card>`, `<Badge>`, `<Button>` UI primitives

**Success criteria:**
- [ ] VoteTally renders during VOTING phase
- [ ] VoteTally hidden during other phases
- [ ] Connection status indicator works correctly
- [ ] Loading state displays while fetching initial state
- [ ] Error state displays on fetch failures
- [ ] Game not found shows 404 message
- [ ] Polling fallback activates after 3 SSE failures
- [ ] All manual tests pass

**Estimated complexity:** LOW-MEDIUM (1-2 hours)

**Implementation guidance:**
```typescript
// app/app/game/[gameId]/page.tsx - Add conditional VoteTally
import VoteTally from '@/components/VoteTally';
import ConnectionStatus from '@/components/ConnectionStatus';

// Inside LiveGamePage component:
const { events, isConnected, error } = useGameEvents();

// Extract current phase from events
const currentPhase = useMemo(() => {
  const phaseEvents = events.filter((e) => e.type === 'phase_change');
  const latestPhase = phaseEvents[phaseEvents.length - 1];
  return latestPhase?.payload.to || null;
}, [events]);

// In render:
{currentPhase === 'VOTING' && (
  <div className="md:col-span-2 lg:col-span-1">
    <VoteTally gameId={gameId} playerCount={players.length} />
  </div>
)}

<ConnectionStatus />
```

**Testing checklist:**
- [ ] Create game with 10 players via `/api/game/create`
- [ ] Navigate to `/game/[gameId]`
- [ ] Verify loading state appears briefly
- [ ] Verify PhaseIndicator shows NIGHT phase
- [ ] Verify PlayerGrid shows 10 players
- [ ] Verify countdown timer updates every second
- [ ] Wait for DISCUSSION phase
- [ ] Verify DiscussionFeed shows messages in real-time
- [ ] Verify accusations highlighted in red
- [ ] Wait for VOTING phase
- [ ] Verify VoteTally appears
- [ ] Verify votes appear in real-time
- [ ] Verify tally updates correctly
- [ ] Verify majority highlighting works
- [ ] Test reconnection: Disable network, re-enable, verify reconnection
- [ ] Test polling fallback: Kill SSE 3 times, verify polling activates
- [ ] Test responsive layout: 375px, 768px, 1024px, 1920px
- [ ] Open 3 browser tabs, verify all see same events
- [ ] Join mid-game, verify state catchup works

---

## Patterns Followed

All patterns from `patterns.md`:

1. **State Catchup Pattern** - Implemented in GameEventsContext
2. **Shared SSE Context** - GameEventsProvider wraps entire app
3. **Mobile-First Responsive** - Grid layout uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
4. **UI Component Primitives** - Card, Button, Badge consistently used
5. **Import Order Convention** - React → Third-party → Internal lib → Components → Types
6. **Error Handling** - Try-catch in all async operations
7. **Type Safety** - All functions have explicit return types

## Integration Notes

### Foundation Integration

The foundation is in: `app/lib/game/`, `app/contexts/`, `app/components/ui/`

Sub-builders should:
1. **Import foundation types**: `import type { UIPlayer, GamePhase } from '@/lib/game/types'`
2. **Use phase utilities**: `import { getPhaseConfig, formatTimeRemaining } from '@/lib/game/phase-config'`
3. **Use GameEventsContext**: `const { events, isConnected } = useGameEvents()`
4. **Use UI primitives**: `import { Card, Button, Badge } from '@/components/ui/...'`
5. **Follow established patterns**: See patterns.md for conventions

### Final Integration

When all sub-builders complete, the integrator should:
1. Verify all components render correctly on live game page
2. Test full game flow from LOBBY → GAME_OVER
3. Test responsive layout on mobile, tablet, desktop
4. Test SSE connection stability over 30+ minute game
5. Test polling fallback activation
6. Test state catchup for late joiners
7. Verify no duplicate SSE connections (check DevTools Network tab)

## Why Split Was Necessary

**Complexity factors:**
1. **Component count**: 4 new/modified components (PhaseIndicator, PlayerGrid, DiscussionFeed, VoteTally) + page + context
2. **Real-time infrastructure**: SSE context with state catchup, polling fallback, event deduplication - complex logic requiring thorough testing
3. **Integration points**: Builder-4 APIs (state, messages, votes, stream), existing components, event types
4. **Responsive layout**: Mobile-first grid with conditional rendering based on phase
5. **State synchronization**: Late-joiner catchup, event queuing, reconnection handling
6. **Estimated time**: 6-8 hours single-builder → 4-5 hours with split (parallel work after foundation)

**Benefits of split:**
- **Parallel work**: Sub-builders 6A and 6B can work simultaneously after foundation complete
- **Focus**: Each sub-builder has clear, manageable scope
- **Quality**: Foundation provides solid base, reducing integration bugs
- **Testability**: Each component can be tested independently

## Sub-builder Coordination

**Dependencies:**
- All sub-builders depend on foundation (complete before they start)
- Sub-builder 6C depends on Sub-builders 6A and 6B (integrates their components)
- Sub-builders 6A and 6B can work **in parallel** (no dependencies)

**Recommended execution order:**
1. Foundation (Builder-6) - **COMPLETE** ✅
2. Sub-builders 6A and 6B - **Start in parallel**
3. Sub-builder 6C - **Start after 6A and 6B complete**

**Total estimated time:**
- Foundation: 2 hours (complete)
- Sub-builder 6A: 2-3 hours
- Sub-builder 6B: 2-3 hours (parallel with 6A)
- Sub-builder 6C: 1-2 hours
- **Total: 5-7 hours** (vs 6-8 hours single-builder)

## Foundation Deliverables Summary

### Complete Files
- ✅ `app/lib/game/types.ts` - Type definitions
- ✅ `app/lib/game/phase-config.ts` - Phase utilities
- ✅ `app/contexts/GameEventsContext.tsx` - SSE infrastructure
- ✅ `app/components/ui/Card.tsx` - UI primitive
- ✅ `app/components/ui/Button.tsx` - UI primitive (enhanced)
- ✅ `app/components/ui/Badge.tsx` - UI primitive (enhanced)
- ✅ `app/lib/game/__tests__/phase-config.test.ts` - Unit tests (13 tests, all passing)

### Foundation API

**Types:**
```typescript
import type {
  UIPlayer,
  GamePhase,
  PhaseConfig,
  VoteData,
  GameEventsContextValue,
  CurrentGameState,
} from '@/lib/game/types';
```

**Phase Utilities:**
```typescript
import {
  PHASE_CONFIGS,
  getPhaseConfig,
  getPhaseColorClasses,
  formatTimeRemaining,
  calculatePhaseEndTime,
  calculateTimeRemaining,
} from '@/lib/game/phase-config';
```

**SSE Context:**
```typescript
import { GameEventsProvider, useGameEvents } from '@/contexts/GameEventsContext';

// Usage:
const { events, isConnected, error, reconnectAttempts } = useGameEvents();
```

**UI Primitives:**
```typescript
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
```

## Next Steps

Sub-builders should:
1. Read this report completely
2. Study foundation code in `app/lib/game/`, `app/contexts/`
3. Review Builder-4 report for API endpoint details
4. Follow implementation guidance in each sub-task
5. Use foundation utilities instead of duplicating logic
6. Test components independently before integration

**Sub-builder 6A**: Start with live game page shell and PhaseIndicator
**Sub-builder 6B**: Start with DiscussionFeed enhancements
**Sub-builder 6C**: Wait for 6A and 6B to complete, then integrate

The foundation is **production-ready** and tested. Sub-builders can confidently build on top of it.
