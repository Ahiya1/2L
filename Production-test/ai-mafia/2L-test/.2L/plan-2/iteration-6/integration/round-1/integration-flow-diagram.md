# Integration Flow Diagram

## Visual Overview of Integration Zones

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ITERATION 6 - ROUND 1                            │
│                      3 Builders → 4 Zones → 1 Integrator                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BUILDER OUTPUTS                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │   Builder-1      │  │   Builder-2      │  │   Builder-3      │     │
│  │   (Backend)      │  │  (Frontend UI)   │  │ (Visualization)  │     │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤     │
│  │ ✓ COMPLETE       │  │ ✓ COMPLETE       │  │ ✓ COMPLETE       │     │
│  │                  │  │                  │  │                  │     │
│  │ Created: 1       │  │ Created: 1       │  │ Created: 1       │     │
│  │ Modified: 5      │  │ Modified: 4      │  │ Modified: 3      │     │
│  │                  │  │                  │  │                  │     │
│  │ ⚠ HAS BUG        │  │ No conflicts     │  │ No conflicts     │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│           │                     │                     │                 │
│           └─────────┬───────────┴─────────────────────┘                │
│                     ▼                                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ INTEGRATION ZONES                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ Zone 1: Backend Infrastructure                                │     │
│  │ ────────────────────────────────────────────────────────────  │     │
│  │ Builder: Builder-1                                            │     │
│  │ Risk: LOW (1 critical bug)                                    │     │
│  │ Time: 20 minutes                                              │     │
│  │                                                               │     │
│  │ Files:                                                        │     │
│  │   NEW  app/api/game/[gameId]/night-messages/route.ts        │     │
│  │   MOD  app/src/lib/game/night-phase.ts          [BUG FIX]   │     │
│  │   MOD  app/api/game/[gameId]/stream/route.ts                │     │
│  │   MOD  app/api/game/[gameId]/state/route.ts                 │     │
│  │   MOD  app/src/lib/api/validation.ts                        │     │
│  │                                                               │     │
│  │ ⚠ CRITICAL: Fix event type in night-phase.ts line 272       │     │
│  │   Change: 'NIGHT_MESSAGE' → 'night_message'                 │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ Zone 2: Event Type Definitions                                │     │
│  │ ────────────────────────────────────────────────────────────  │     │
│  │ Builders: Builder-1 + Builder-2                               │     │
│  │ Risk: LOW (simple deduplication)                              │     │
│  │ Time: 10 minutes                                              │     │
│  │                                                               │     │
│  │ Files:                                                        │     │
│  │   MOD  src/lib/events/types.ts               [DUPLICATE]     │     │
│  │                                                               │     │
│  │ Resolution: Keep one copy of IDENTICAL changes               │     │
│  │   - Both added 'night_message' event type                   │     │
│  │   - Changes are 100% identical                              │     │
│  │   - Just deduplicate, no merge conflict                     │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ Zone 3: Frontend Transparency UI                              │     │
│  │ ────────────────────────────────────────────────────────────  │     │
│  │ Builder: Builder-2                                            │     │
│  │ Risk: LOW (no conflicts)                                      │     │
│  │ Time: 20 minutes                                              │     │
│  │                                                               │     │
│  │ Files:                                                        │     │
│  │   NEW  app/components/MafiaChatPanel.tsx                     │     │
│  │   MOD  app/components/PlayerGrid.tsx                         │     │
│  │   MOD  app/app/game/[gameId]/page.tsx        [COORDINATED]  │     │
│  │   MOD  app/components/ui/Badge.tsx                          │     │
│  │                                                               │     │
│  │ Features:                                                     │     │
│  │   - Role badges in PlayerGrid (red/blue)                    │     │
│  │   - MafiaChatPanel for Night phase                          │     │
│  │   - Split-screen layout                                     │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ Zone 4: Enhanced Phase Visualization                          │     │
│  │ ────────────────────────────────────────────────────────────  │     │
│  │ Builder: Builder-3                                            │     │
│  │ Risk: LOW (no conflicts)                                      │     │
│  │ Time: 25 minutes                                              │     │
│  │                                                               │     │
│  │ Files:                                                        │     │
│  │   NEW  app/components/game/PhaseTimeline.tsx                 │     │
│  │   MOD  app/components/PhaseIndicator.tsx                     │     │
│  │   MOD  app/components/VoteTally.tsx                          │     │
│  │   MOD  app/tailwind.config.ts                               │     │
│  │                                                               │     │
│  │ Features:                                                     │     │
│  │   - Enhanced phase styling (large icons, gradients)         │     │
│  │   - PhaseTimeline component                                 │     │
│  │   - Vote tally majority threshold                           │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ EXECUTION FLOW                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  START                                                                   │
│    │                                                                     │
│    ├─► ZONE 1: Backend Infrastructure (20 min)                          │
│    │     │                                                               │
│    │     ├─► Merge Builder-1 files                                      │
│    │     ├─► ⚠ FIX CRITICAL BUG (night-phase.ts line 272)              │
│    │     ├─► Test backend compilation                                   │
│    │     └─► Verify API endpoints                                       │
│    │                                                                     │
│    ├─► ZONE 2: Event Type Definitions (10 min)                          │
│    │     │                                                               │
│    │     ├─► Examine types.ts changes                                   │
│    │     ├─► Verify changes are IDENTICAL                               │
│    │     ├─► Keep one copy, delete duplicate                            │
│    │     └─► Verify TypeScript compiles                                 │
│    │                                                                     │
│    ├─► ZONE 3: Frontend Transparency UI (20 min)                        │
│    │     │                                                               │
│    │     ├─► Copy MafiaChatPanel.tsx                                    │
│    │     ├─► Merge PlayerGrid.tsx                                       │
│    │     ├─► Merge page.tsx (coordinate with Zone 4)                    │
│    │     ├─► Merge Badge.tsx                                            │
│    │     └─► Test role badges and Mafia chat                            │
│    │                                                                     │
│    ├─► ZONE 4: Enhanced Phase Visualization (25 min)                    │
│    │     │                                                               │
│    │     ├─► Copy PhaseTimeline.tsx                                     │
│    │     ├─► Merge PhaseIndicator.tsx                                   │
│    │     ├─► Merge VoteTally.tsx                                        │
│    │     ├─► Merge tailwind.config.ts                                   │
│    │     └─► Test phase enhancements                                    │
│    │                                                                     │
│    └─► FINAL VERIFICATION (17-22 min)                                   │
│          │                                                               │
│          ├─► TypeScript compilation (npx tsc --noEmit)                  │
│          ├─► Backend tests (npm test)                                   │
│          ├─► API endpoint testing (curl)                                │
│          ├─► Browser testing (full game flow)                           │
│          └─► Playwright readiness check                                 │
│                                                                          │
│  END → Hand off to ivalidator                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ FILE CONFLICTS & COORDINATION                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  types.ts (DUPLICATE)                                                    │
│  ──────────────────────                                                  │
│  Builder-1 added:  'night_message' event type                           │
│  Builder-2 added:  'night_message' event type (IDENTICAL)               │
│  Resolution: Keep one copy                                               │
│  Risk: LOW                                                               │
│                                                                          │
│  page.tsx (COORDINATED)                                                  │
│  ────────────────────                                                    │
│  Builder-2 modified: Grid layout (lines 145-194)                        │
│  Builder-3 modified: PhaseIndicator section (lines 140-142)             │
│  Resolution: Merge both (different sections)                            │
│  Risk: LOW                                                               │
│                                                                          │
│  night-phase.ts (CRITICAL BUG)                                           │
│  ──────────────────────────                                              │
│  Builder-1 created: Event emission with WRONG type                      │
│  Issue: type: 'NIGHT_MESSAGE' should be 'night_message'                │
│  Resolution: Fix line 272 during Zone 1                                 │
│  Risk: CRITICAL (blocks functionality if not fixed)                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ DEPENDENCY GRAPH                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        ┌──────────────┐                                 │
│                        │   Zone 1     │                                 │
│                        │  (Backend)   │                                 │
│                        └──────┬───────┘                                 │
│                               │                                          │
│                               │ Provides API + Events                   │
│                               │                                          │
│                        ┌──────▼───────┐                                 │
│                        │   Zone 2     │                                 │
│                        │ (Event Types)│                                 │
│                        └──────┬───────┘                                 │
│                               │                                          │
│                  ┌────────────┴────────────┐                           │
│                  │                         │                            │
│           ┌──────▼───────┐         ┌──────▼───────┐                   │
│           │   Zone 3     │         │   Zone 4     │                   │
│           │(Frontend UI) │         │ (Phase Viz)  │                   │
│           └──────┬───────┘         └──────┬───────┘                   │
│                  │                         │                            │
│                  └────────────┬────────────┘                           │
│                               │                                          │
│                        ┌──────▼───────┐                                 │
│                        │  Validation  │                                 │
│                        │  (Playwright)│                                 │
│                        └──────────────┘                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TIME BREAKDOWN                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Zone 1 (Backend)                    20 min  ████████                   │
│  Zone 2 (Event Types)                10 min  ████                       │
│  Zone 3 (Frontend UI)                20 min  ████████                   │
│  Zone 4 (Phase Visualization)        25 min  ██████████                 │
│  Final Verification                  20 min  ████████                   │
│                                      ─────   ──────────────────────     │
│  TOTAL INTEGRATION TIME              95 min  (1.5-2 hours)              │
│                                                                          │
│  Validation (ivalidator)             15 min  ██████                     │
│                                      ─────   ──────────────────────     │
│  TOTAL TIME TO VALIDATION          110 min  (1.8-2.2 hours)            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ RISK MATRIX                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  HIGH RISK     │ ⚠ Critical bug (night-phase.ts)                       │
│  ─────────────│─────────────────────────────────────────────────────   │
│  Impact: HIGH  │ Fix required: 5 minutes                               │
│  Likelihood: 0%│ Already documented, easy fix                          │
│                │                                                         │
│  MEDIUM RISK   │ • Backend tests timeout                               │
│  ─────────────│───────────────────────────────────────────────────────  │
│  Impact: MED   │ • types.ts deduplication                              │
│  Likelihood: 30%│ Mitigations in place                                 │
│                │                                                         │
│  LOW RISK      │ • All other file merges                               │
│  ─────────────│───────────────────────────────────────────────────────  │
│  Impact: LOW   │ • Layout coordination                                 │
│  Likelihood: 5%│ • Tailwind config merge                               │
│                │                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ SUCCESS CRITERIA                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ☐ Critical bug fixed (night-phase.ts line 272)                         │
│  ☐ types.ts deduplicated (one copy of event definitions)               │
│  ☐ All builder files merged successfully                                │
│  ☐ TypeScript compiles with zero NEW errors                            │
│  ☐ Backend tests pass (47 tests target)                                │
│  ☐ Dev server starts without errors                                    │
│  ☐ Role badges visible (3 red Mafia, 7 blue Villager)                  │
│  ☐ Mafia chat appears during Night phase                               │
│  ☐ Messages update in real-time (SSE working)                          │
│  ☐ Enhanced phase visualization displays                               │
│  ☐ PhaseTimeline component shows                                       │
│  ☐ Vote tally enhancements visible                                     │
│  ☐ No browser console errors                                           │
│  ☐ All Playwright data-testid attributes present                       │
│  ☐ Ready for ivalidator handoff                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

```

---

## Legend

- **NEW** - New file created by builder
- **MOD** - Existing file modified by builder
- **[BUG FIX]** - Critical bug that must be fixed during integration
- **[DUPLICATE]** - Identical changes from multiple builders (deduplication needed)
- **[COORDINATED]** - Multiple builders modified same file (different sections)
- **⚠** - Warning or critical attention required
- **✓** - Complete or verified

---

**Created:** 2025-10-13
**Purpose:** Visual reference for integration flow and dependencies
**Use:** Quick understanding of integration structure
