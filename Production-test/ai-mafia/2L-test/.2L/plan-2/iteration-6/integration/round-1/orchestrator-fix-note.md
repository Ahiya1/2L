# Orchestrator Fix Note

## Context

During the orchestration phase (after builders completed), the orchestrator identified a type mismatch in Builder-1's code and reported it in the task description provided to the Integration Planner.

---

## Issue Identified by Orchestrator

**File:** `app/src/lib/game/night-phase.ts`
**Line:** 272
**Problem:** Type mismatch in event emission

### Current Code (INCORRECT)
```typescript
gameEventEmitter.emitGameEvent('night_message', {
  gameId,
  type: 'NIGHT_MESSAGE',  // <-- WRONG: Uppercase
  payload: { /* ... */ }
});
```

### Should Be (CORRECT)
```typescript
gameEventEmitter.emitGameEvent('night_message', {
  gameId,
  type: 'night_message',  // <-- CORRECT: Lowercase with underscore
  payload: { /* ... */ }
});
```

---

## Orchestrator's Fix Intent

The orchestrator stated:
> "**Orchestrator Fix:**
> - **MODIFIED:** `app/src/lib/game/night-phase.ts` - Fixed type mismatch (line 272: 'NIGHT_MESSAGE' → 'night_message')"

However, this fix has NOT been applied yet. The orchestrator only identified the issue and documented it for the integrator to fix during integration.

---

## Integration Plan Status

The Integration Planner (Iplanner) has **accounted for this issue** in the integration plan:

### Zone 1: Backend Infrastructure
**Strategy includes:**
1. Merge all Builder-1 files
2. **FIX CRITICAL BUG:** Change `type: 'NIGHT_MESSAGE'` to `type: 'night_message'` in night-phase.ts line 272
3. Verify backend compiles
4. Test API endpoints

### Conflict Resolution Guide
Detailed fix instructions provided in `conflict-resolution-guide.md`:
- Exact location (file, line)
- Current incorrect code
- Correct fixed code
- Why it matters
- Verification steps

### Zone Execution Checklist
Step-by-step fix instructions provided in `zone-execution-checklist.md`:
- Pre-integration note about critical bug
- Specific checkbox: "**CRITICAL:** Change `type: 'NIGHT_MESSAGE'` to `type: 'night_message'`"
- Verification after fix

---

## Why This Fix Is Critical

### Impact if Not Fixed
- Event emitter uses lowercase: `'night_message'`
- TypeScript union uses lowercase: `'night_message'`
- Frontend filters by lowercase: `events.filter((e) => e.type === 'night_message')`
- **Result:** MafiaChatPanel won't receive real-time messages during Night phase

### Pattern Violation
All other events follow lowercase with underscore pattern:
- `'message'`
- `'turn_start'`
- `'turn_end'`
- `'phase_change'`
- `'phase_complete'`
- `'discussion_complete'`
- `'night_message'` ← Should match this pattern

Builder-1 incorrectly used uppercase `'NIGHT_MESSAGE'` which breaks the established convention.

---

## Integrator Action Required

**Priority:** CRITICAL (must fix before testing)
**Time:** 5 minutes
**Difficulty:** TRIVIAL (single line change)

### Steps
1. Open `app/src/lib/game/night-phase.ts`
2. Navigate to line 272
3. Change `type: 'NIGHT_MESSAGE'` to `type: 'night_message'`
4. Save file
5. Verify TypeScript compiles
6. Test SSE events in browser

### Verification
```bash
# After fix, verify events emit correctly
curl -N http://localhost:3001/api/game/<gameId>/stream

# During Night phase, should see:
data: {"gameId":"...","type":"night_message","payload":{...}}
#                             ^^^^^^^^^^^^^^ (lowercase)
```

---

## Builder-1 vs Builder-2 Awareness

### Builder-1 Report
Builder-1's report does NOT mention this issue. Builder-1 believed the implementation was correct:
> "Event Structure:
> ```typescript
> {
>   gameId: string,
>   type: 'NIGHT_MESSAGE',  // <-- Builder-1 thought this was correct
>   payload: { /* ... */ }
> }
> ```"

### Builder-2 Report
Builder-2 identified this issue and documented it:
> "⚠️ **TYPE MISMATCH:** Builder-1 used `type: 'NIGHT_MESSAGE'` but should be `type: 'night_message'` (lowercase with underscore to match GameEventType pattern)
> - File: `src/lib/game/night-phase.ts` line 272
> - Current: `type: 'NIGHT_MESSAGE'`
> - Should be: `type: 'night_message'`
> - This causes a TypeScript error that Builder-1 needs to fix"

Builder-2 correctly understood the pattern but couldn't fix Builder-1's code.

---

## TypeScript Error Expected

If the fix is NOT applied, TypeScript will show an error because:
- `'NIGHT_MESSAGE'` (uppercase) is not in the `GameEventType` union
- Only `'night_message'` (lowercase) is defined

Expected error:
```
Type '"NIGHT_MESSAGE"' is not assignable to type 'GameEventType'.
```

This will appear when running `npx tsc --noEmit` after integration.

---

## Integration Plan Accounts for This

The Integration Planner has thoroughly documented this issue across multiple files:

1. **integration-plan.md** - Zone 1 includes fix strategy
2. **integration-summary.md** - Listed as CRITICAL BUG #1
3. **conflict-resolution-guide.md** - Detailed fix instructions
4. **zone-execution-checklist.md** - Step-by-step fix procedure
5. **README.md** - Listed under "MUST FIX BEFORE TESTING"
6. **orchestrator-fix-note.md** (this file) - Full context

---

## Conclusion

The orchestrator correctly identified the type mismatch bug but did NOT apply the fix. The fix is deferred to the integrator during Zone 1 execution. The Integration Planner has provided comprehensive documentation and instructions to ensure the integrator can easily identify and fix this critical issue.

**Status:** Issue documented, fix deferred to integrator
**Priority:** CRITICAL
**Difficulty:** TRIVIAL
**Time:** 5 minutes
**Integration Stage:** Zone 1 execution

---

**Note Created:** 2025-10-13
**Purpose:** Context for orchestrator's role vs integrator's role
**Integration Status:** Ready for integrator to apply fix
