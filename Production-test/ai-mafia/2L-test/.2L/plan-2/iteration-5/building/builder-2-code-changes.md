# Builder-2 Code Changes - Exact Diffs

## File 1: PhaseIndicator.tsx

**Location:** `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/components/PhaseIndicator.tsx`

### Change 1: Timer Synchronization Fix (Lines 53-63)

**BEFORE:**
```typescript
  // Extract phase start time from events
  const phaseStartTime = useMemo<Date | null>(() => {
    const phaseEvents = events.filter((e) => e.type === 'phase_change');
    if (phaseEvents.length === 0) return null;
    const latestPhase = phaseEvents[phaseEvents.length - 1];

    // In real implementation, this would come from the phase_change event payload
    // For now, use current time as approximation
    return new Date();
  }, [events]);
```

**AFTER:**
```typescript
  // Extract phase start time from events (server-authoritative)
  const phaseStartTime = useMemo<Date | null>(() => {
    const phaseEvents = events.filter((e) => e.type === 'phase_change');
    if (phaseEvents.length === 0) return null;

    const latestPhase = phaseEvents[phaseEvents.length - 1];
    if (!latestPhase?.payload?.phaseStartTime) return null;

    // Use server-provided phaseStartTime (ISO 8601 string)
    return new Date(latestPhase.payload.phaseStartTime);
  }, [events]);
```

**Key Changes:**
- Line 53: Updated comment to reflect "server-authoritative"
- Line 55: Removed blank line after filter
- Line 58-59: Added null check for phaseStartTime in payload
- Line 61-62: Parse server phaseStartTime instead of using `new Date()`

---

### Change 2: Debug Logging (Lines 83-91) - TEMPORARY

**ADDED AFTER LINE 81:**
```typescript
  // Debug logging for timer sync verification (TEMPORARY - remove after testing)
  useEffect(() => {
    if (phaseStartTime && currentPhase) {
      console.log('[TIMER DEBUG] Phase:', currentPhase);
      console.log('[TIMER DEBUG] phaseStartTime:', phaseStartTime.toISOString());
      console.log('[TIMER DEBUG] phaseEndTime:', phaseEndTime?.toISOString());
      console.log('[TIMER DEBUG] timeRemaining:', timeRemaining, 'seconds');
    }
  }, [phaseStartTime, phaseEndTime, timeRemaining, currentPhase]);
```

**Purpose:** Enable validation during manual testing

**REMEMBER:** Remove these 9 lines after manual testing passes

---

## File 2: GameEventsContext.tsx

**Location:** `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/contexts/GameEventsContext.tsx`

### Change: Late-Joiner Support (Lines 232-255)

**BEFORE:**
```typescript
function stateToEvents(state: any): GameEvent[] {
  const events: GameEvent[] = [];

  // Add phase_change event for current phase
  if (state.game.currentPhase) {
    events.push({
      gameId: state.game.id,
      type: 'phase_change',
      payload: {
        from: 'LOBBY',
        to: state.game.currentPhase,
        round: state.game.roundNumber,
      },
    });
  }

  // TODO: Sub-builders can extend this to include more historical events
  // (e.g., player eliminations, votes cast, etc.)

  return events;
}
```

**AFTER:**
```typescript
function stateToEvents(state: any): GameEvent[] {
  const events: GameEvent[] = [];

  // Add phase_change event for current phase
  if (state.game.currentPhase) {
    events.push({
      gameId: state.game.id,
      type: 'phase_change',
      payload: {
        from: 'LOBBY',
        to: state.game.currentPhase,
        round: state.game.roundNumber,
        // Include phaseStartTime if available from state
        phaseStartTime: state.game.phaseStartTime || new Date().toISOString(),
        phaseEndTime: state.game.phaseEndTime || null,
      },
    });
  }

  // TODO: Sub-builders can extend this to include more historical events
  // (e.g., player eliminations, votes cast, etc.)

  return events;
}
```

**Key Changes:**
- Line 244-246: Added comment and two new fields to payload
  - `phaseStartTime`: Uses state value or fallback to current time
  - `phaseEndTime`: Uses state value or null

**Purpose:** Support users who refresh page mid-game (late-joiners)

---

## File 3: DiscussionFeed.tsx

**Location:** `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/components/DiscussionFeed.tsx`

### Change: Debug Logging (Lines 81-86) - TEMPORARY

**BEFORE (Line 80):**
```typescript
    setMessages(extractedMessages);
  }, [events]);
```

**AFTER (Lines 79-87):**
```typescript
    setMessages(extractedMessages);

    // Debug logging for message count verification (TEMPORARY - remove after testing)
    console.log('[MESSAGE DEBUG] Total message events:', messageEvents.length);
    if (messageEvents.length > 0) {
      const latestMessage = messageEvents[messageEvents.length - 1];
      console.log('[MESSAGE DEBUG] Latest message:', latestMessage?.payload?.message);
    }
  }, [events]);
```

**Key Changes:**
- Line 81-86: Added debug logging (6 lines)

**Purpose:** Enable validation of message display during manual testing

**REMEMBER:** Remove these 6 lines after manual testing passes

---

## Summary of Changes

### Total Lines Changed
- **PhaseIndicator.tsx:** 13 lines (4 implementation + 9 debug)
- **GameEventsContext.tsx:** 3 lines
- **DiscussionFeed.tsx:** 6 lines (all debug)

**Total:** 22 lines changed (7 implementation + 15 debug logging)

### Critical Changes (Permanent)
1. **PhaseIndicator.tsx lines 53-63:** Extract phaseStartTime from events (Pattern 6)
2. **GameEventsContext.tsx lines 244-246:** Add phaseStartTime to initial state

### Temporary Changes (Remove After Testing)
1. **PhaseIndicator.tsx lines 83-91:** Timer debug logging
2. **DiscussionFeed.tsx lines 81-86:** Message debug logging

---

## Verification Commands

### Check TypeScript Errors
```bash
cd /home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app
npm run build
# Expected: ✓ Compiled successfully
```

### Find Debug Statements (For Cleanup)
```bash
grep -n "TIMER DEBUG" app/components/PhaseIndicator.tsx
grep -n "MESSAGE DEBUG" app/components/DiscussionFeed.tsx
```

### View Changes
```bash
# PhaseIndicator
git diff app/components/PhaseIndicator.tsx

# GameEventsContext
git diff app/contexts/GameEventsContext.tsx

# DiscussionFeed
git diff app/components/DiscussionFeed.tsx
```

---

## Integration Checklist

Before merging Builder-2 changes:

- [x] PhaseIndicator.tsx: Lines 53-63 extract phaseStartTime from events
- [x] GameEventsContext.tsx: Lines 244-246 include phaseStartTime in initial state
- [x] DiscussionFeed.tsx: Message extraction logic verified (no changes needed)
- [x] Debug logging added (lines 83-91 PhaseIndicator, 81-86 DiscussionFeed)
- [x] TypeScript builds successfully (zero errors)
- [x] No merge conflicts with Builder-1 changes
- [ ] Manual testing completed (3 games)
- [ ] Debug logging removed (after testing)
- [ ] Backend tests pass (no regressions)

---

## Pattern Compliance

### Pattern 6: Extract phaseStartTime from Events ✅
**Location:** patterns.md lines 368-436

**Implementation:** PhaseIndicator.tsx lines 53-63
```typescript
const latestPhase = phaseEvents[phaseEvents.length - 1];
if (!latestPhase?.payload?.phaseStartTime) return null;
return new Date(latestPhase.payload.phaseStartTime);
```

**Matches pattern exactly:** ✅

### Pattern 7: Verify Message Event Extraction ✅
**Location:** patterns.md lines 456-508

**Implementation:** DiscussionFeed.tsx lines 62-80
```typescript
const messageEvents = events.filter((e) => e.type === 'message');
```

**Already correct, no changes needed:** ✅

### Pattern 13: Add Temporary Debug Logging ✅
**Location:** patterns.md lines 846-866

**Implementation:**
- PhaseIndicator.tsx lines 83-91
- DiscussionFeed.tsx lines 81-86

**Matches pattern exactly:** ✅

---

**Last Updated:** 2025-10-13
**Builder:** Builder-2
**Files Modified:** 3 (22 lines total)
**Status:** Code Complete, Ready for Testing
