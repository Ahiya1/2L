# Conflict Resolution Guide - Round 1

## Overview

This guide provides detailed instructions for resolving the 2 integration points that require attention:
1. **Critical Bug:** Event type mismatch in night-phase.ts
2. **Duplicate Changes:** Identical event type additions in types.ts

---

## Issue 1: Event Type Mismatch (CRITICAL)

### Problem
Builder-1 used uppercase event type in night-phase.ts, but the event emitter pattern requires lowercase with underscores.

### Location
**File:** `app/src/lib/game/night-phase.ts`
**Line:** 272

### Current Code (INCORRECT)
```typescript
// Emit night_message event to SSE for spectators (TRANSPARENCY MODE)
gameEventEmitter.emitGameEvent('night_message', {
  gameId,
  type: 'NIGHT_MESSAGE',  // <-- WRONG: Should be lowercase
  payload: {
    id: savedMessage.id,
    playerId: player.id,
    playerName: player.name,
    message: text,
    timestamp: savedMessage.timestamp.toISOString(),
    roundNumber,
    turn,
  },
});
```

### Fixed Code (CORRECT)
```typescript
// Emit night_message event to SSE for spectators (TRANSPARENCY MODE)
gameEventEmitter.emitGameEvent('night_message', {
  gameId,
  type: 'night_message',  // <-- CORRECT: Lowercase with underscore
  payload: {
    id: savedMessage.id,
    playerId: player.id,
    playerName: player.name,
    message: text,
    timestamp: savedMessage.timestamp.toISOString(),
    roundNumber,
    turn,
  },
});
```

### Why This Matters
- Event emitter uses lowercase: `'night_message'`
- TypeScript union includes lowercase: `'night_message'`
- Frontend filters by lowercase: `events.filter((e) => e.type === 'night_message')`
- Pattern: See other events (message, turn_start, phase_change)
- **Impact if not fixed:** MafiaChatPanel won't receive real-time messages

### How to Fix
1. Open `app/src/lib/game/night-phase.ts`
2. Navigate to line 272
3. Change `type: 'NIGHT_MESSAGE'` to `type: 'night_message'`
4. Save file
5. Verify TypeScript compilation passes
6. Test SSE events in browser

### Verification
```bash
# Start dev server
npm run dev

# In browser DevTools Network tab:
# Filter by "stream"
# Watch for events with type: "night_message" (lowercase)
# Should appear during Night phase
```

---

## Issue 2: Duplicate Event Type Definitions (LOW PRIORITY)

### Problem
Both Builder-1 and Builder-2 added the same event type to `src/lib/events/types.ts`. The changes are IDENTICAL, so this is not a real conflict - just a deduplication task.

### Location
**File:** `src/lib/events/types.ts`

### Builder-1 Changes
**Line 14:** Added `'night_message'` to GameEventType union
```typescript
export type GameEventType =
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete'
  | 'night_message'; // Builder-1 added this
```

**Lines 68-80:** Added NIGHT_MESSAGE to GameEvent union
```typescript
export type GameEvent =
  | {
      gameId: string;
      type: 'NEW_MESSAGE';
      payload: { /* ... */ };
    }
  // ... other events ...
  | {
      gameId: string;
      type: 'NIGHT_MESSAGE'; // Builder-1 added this
      payload: {
        id: string;
        playerId: string;
        playerName: string;
        message: string;
        timestamp: string;
        roundNumber: number;
        turn: number;
      };
    };
```

### Builder-2 Changes
**Line 29:** Added `'night_message'` to GameEventType union (IDENTICAL to Builder-1)
```typescript
export type GameEventType =
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete'
  | 'night_message'; // Builder-2 added this (SAME AS BUILDER-1)
```

**Lines 177-190:** Added night_message event to GameEvent union (IDENTICAL to Builder-1)
```typescript
// ... same structure as Builder-1 ...
```

### Resolution Strategy

**Option 1: Accept Both (Git merge will show conflict)**
```bash
# During git merge, you'll see:
<<<<<<< HEAD (Builder-1)
  | 'night_message';
=======
  | 'night_message';
>>>>>>> Builder-2

# Resolution: Keep one, delete the other (they're identical)
```

**Option 2: Manual Merge**
1. Open `src/lib/events/types.ts`
2. Verify Builder-1's changes are present (lines 14, 68-80)
3. Check if Builder-2's changes are identical (they are)
4. Keep Builder-1's version (or Builder-2's - doesn't matter)
5. Don't duplicate the lines

**Option 3: Use Integrator Tool**
Most integration tools will automatically detect identical changes and keep one copy.

### Expected Final Result
```typescript
// Line 14 (or 29, depending on which builder's numbering)
export type GameEventType =
  | 'message'
  | 'turn_start'
  | 'turn_end'
  | 'phase_change'
  | 'phase_complete'
  | 'discussion_complete'
  | 'night_message'; // ONE copy only

// Lines 68-80 (or 177-190, depending on numbering)
export type GameEvent =
  | {
      gameId: string;
      type: 'NEW_MESSAGE';
      payload: { /* ... */ };
    }
  // ... other events ...
  | {
      gameId: string;
      type: 'NIGHT_MESSAGE'; // ONE copy only
      payload: {
        id: string;
        playerId: string;
        playerName: string;
        message: string;
        timestamp: string;
        roundNumber: number;
        turn: number;
      };
    };
```

### Verification
```bash
# Run TypeScript compilation
npx tsc --noEmit

# Should pass with zero errors
# If errors about duplicate union members, you have both copies
```

---

## Non-Conflicting Coordination Point: page.tsx

### Situation
Both Builder-2 and Builder-3 modified `app/app/game/[gameId]/page.tsx`, but in different sections with NO overlap.

### Builder-2 Changes
**Lines 145-194:** Modified main grid layout for split-screen
- Changed from 3-column to 12-column grid
- Added split-screen layout: Discussion Feed (4 cols) | Mafia Chat Panel (5 cols) during Night
- Added MafiaChatPanel import and component

### Builder-3 Changes
**Lines 140-142:** Enhanced PhaseIndicator section only
- No grid changes
- Just enhanced PhaseIndicator component styling

### Resolution
**NO CONFLICT - MERGE BOTH DIRECTLY**

Both changes work together:
- Builder-2's grid layout (lines 145-194)
- Builder-3's PhaseIndicator (lines 140-142)
- Different sections, no overlap

### Verification
After merge:
1. Verify PhaseIndicator has enhanced styling
2. Verify MafiaChatPanel import is present
3. Verify grid layout is 12-column system
4. Test in browser: both features should work

---

## Integration Testing After Resolution

### Test 1: Event Type Fix
```bash
# Start dev server
npm run dev

# Create game, wait for Night phase
# Open browser DevTools Network tab
# Filter by "stream"
# Verify events show: type: "night_message" (lowercase)
```

### Test 2: Types Deduplication
```bash
# Run TypeScript compilation
npx tsc --noEmit

# Should pass with zero new errors
# Check: No duplicate union member errors
```

### Test 3: Layout Coordination
```bash
# In browser:
# - Verify PhaseIndicator is enhanced (large icons, animations)
# - Wait for Night phase
# - Verify Mafia chat panel appears on right side
# - Verify split-screen layout works
```

---

## Rollback Plan

If issues arise during integration:

### Rollback Event Type Fix
```bash
# If SSE events break:
git checkout app/src/lib/game/night-phase.ts
# Fix the bug again manually
```

### Rollback Types Deduplication
```bash
# If TypeScript errors occur:
git checkout src/lib/events/types.ts
# Manually merge again, keeping one copy
```

### Rollback Layout Changes
```bash
# If layout breaks:
git checkout app/app/game/[gameId]/page.tsx
# Merge Builder-2 and Builder-3 changes again
```

---

## Summary

**Total Issues:** 2
1. **Critical Bug:** Event type mismatch (5 minute fix)
2. **Duplicate Changes:** types.ts deduplication (5 minute fix)

**Coordination Points:** 1
- page.tsx (no conflict, just verification)

**Estimated Resolution Time:** 15 minutes total

**Risk Level:** LOW
- Both issues are straightforward
- No complex merge conflicts
- Clear resolution strategies
- Easy to verify

---

**Created:** 2025-10-13
**Integrator:** Use this guide during Zone 1 & 2 execution
**Status:** READY FOR USE
