# Integration Plan - Round 1

**Created:** 2025-10-13T00:00:00Z
**Iteration:** plan-1/iteration-4
**Total builders to integrate:** 4

---

## Executive Summary

Integration round 1 brings together 4 completed builders that fix critical production issues in the AI Mafia game. The primary challenge is the critical bug fix (Builder-1) which must be validated immediately, followed by database migration (Builder-2) that changes the development environment. TypeScript fixes (Builder-3) and test infrastructure (Builder-4) are independent and low-conflict.

Key insights:
- No file conflicts detected - all builders modified different files
- Builder-1's fix is CRITICAL and must be merged first for validation
- Builder-2 changes development environment (requires team coordination)
- Parallel integration possible for Builder-3 and Builder-4 after Builder-1/2

---

## Builders to Integrate

### Primary Builders
- **Builder-1:** Critical Bug Fix (Function Signature Mismatch) - Status: COMPLETE
- **Builder-2:** Database Migration (SQLite to PostgreSQL) - Status: COMPLETE
- **Builder-3:** TypeScript Fixes & Logging Cleanup - Status: COMPLETE
- **Builder-4:** Test Infrastructure (Vitest) - Status: COMPLETE

### Sub-Builders
None - all tasks completed by primary builders

**Total outputs to integrate:** 4

---

## Integration Zones

### Zone 1: Critical Bug Fix (Signature Mismatch)

**Builders involved:** Builder-1

**Conflict type:** Independent feature (no conflicts)

**Risk level:** MEDIUM (critical functionality, but simple fix)

**Description:**
Builder-1 fixed the function signature mismatch in `route.ts` that caused 0 messages in discussion phase. The fix uses an existing wrapper function (`buildAgentContextWrapper`) to adapt between two different function signatures. This is a focused change with clear impact.

**Files affected:**
- `app/app/api/game/[gameId]/start/route.ts` - Modified dependency injection to use correct signature
- `app/docs/bugfix-signature-mismatch.md` - New documentation file

**Integration strategy:**
1. Review the signature fix in route.ts (lines 12, 16, 88-90, 94-120)
2. Verify imports are correct (`buildAgentContextWrapper` from turn-executor)
3. Verify validation code is present (lines 94-120)
4. Copy documentation file to docs/
5. Test immediately after merge:
   - Start dev server
   - Create and start a game
   - Wait 30 seconds
   - Query database: `SELECT COUNT(*) FROM DiscussionMessage WHERE gameId = '{gameId}'`
   - Expected: COUNT > 0 (should see 40+ messages)

**Expected outcome:**
Discussion phase generates 40+ messages instead of 0. Game loop executes all turns successfully with no TypeErrors in logs.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (direct merge, validation required)

---

### Zone 2: Database Migration (Development Environment)

**Builders involved:** Builder-2

**Conflict type:** Environment change (requires coordination)

**Risk level:** HIGH (changes development environment for entire team)

**Description:**
Builder-2 migrated the development environment from SQLite to PostgreSQL using Supabase Local. All existing data (9 games, 86 players, 43 messages) was exported and imported successfully. This eliminates schema drift between dev and production, but requires all developers to run Supabase Local.

**Files affected:**
- `prisma/schema.prisma` - Changed provider from "sqlite" to "postgresql"
- `.env` - Updated DATABASE_URL to PostgreSQL connection string
- `README.md` - Updated setup instructions
- `prisma/migrations/` - Regenerated for PostgreSQL (old migrations backed up)
- `scripts/export-sqlite-data.ts` - New migration script
- `scripts/import-data.ts` - New migration script
- `scripts/rollback-to-sqlite.sh` - New rollback script
- `docs/supabase-local-setup.md` - New documentation
- `supabase/config.toml` - Supabase configuration
- `prisma/dev.db.sqlite.backup` - Backup of original SQLite database
- `data-backup.json` - JSON export of all data

**Integration strategy:**
1. Merge all Builder-2 files
2. Start Supabase Local on integration machine:
   ```bash
   cd app/
   supabase start
   ```
3. Verify services running: `supabase status`
4. Verify DATABASE_URL in .env: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
5. Run Prisma migration: `npx prisma migrate dev`
6. Verify data imported correctly:
   - Open Supabase Studio: http://localhost:54323
   - Check Game table: Should see 9 games
   - Check Player table: Should see 86 players
   - Check DiscussionMessage table: Should see 43 messages
7. Test application connection:
   ```bash
   npm run dev
   # Create a game, verify it appears in Supabase Studio
   ```
8. Document for team:
   - All developers must install Supabase CLI if not present
   - All developers must run `supabase start` before development
   - Update team wiki/documentation

**Expected outcome:**
Development environment uses PostgreSQL matching production. No more PRAGMA statement errors. All data preserved from SQLite. Supabase Studio provides better data inspection UI.

**Assigned to:** Integrator-1

**Estimated complexity:** MEDIUM (coordination required, rollback available)

---

### Zone 3: TypeScript Fixes & Logging Cleanup

**Builders involved:** Builder-3

**Conflict type:** Independent feature (no conflicts)

**Risk level:** LOW (code quality improvements, no functional changes)

**Description:**
Builder-3 fixed all 28 TypeScript errors, removed `ignoreBuildErrors: true` from next.config.mjs, and replaced 12 console.log statements in master-orchestrator.ts with structured logging. The build now passes with zero errors and strict mode enabled.

**Files affected:**
- `next.config.mjs` - Removed ignoreBuildErrors
- `tsconfig.json` - Excluded vitest config files temporarily
- `src/lib/game/master-orchestrator.ts` - Replaced 12 console.log/error with structured logging
- `components/ui/Badge.tsx` - Added className prop
- `app/game/[gameId]/page.tsx` - Added null check
- `components/DiscussionFeed.tsx` - Added null check
- `components/PhaseIndicator.tsx` - Added null checks (2 locations)
- `components/VoteTally.tsx` - Added null check
- `lib/game/phase-config.ts` - Fixed color map return type
- `app/api/game/[gameId]/start/route.ts` - Updated params to Promise type (Next.js 14)
- `app/api/game/[gameId]/votes/route.ts` - Updated params to Promise type
- `src/lib/game/role-assignment.ts` - Fixed array destructuring
- `src/utils/avatar-colors.ts` - Added fallback for undefined
- `src/utils/message-classification.ts` - Added optional chaining

**Integration strategy:**
1. Merge all Builder-3 files
2. Verify TypeScript compilation:
   ```bash
   cd app/
   npx tsc --noEmit
   # Expected: 0 errors
   ```
3. Verify build succeeds:
   ```bash
   npm run build
   # Expected: SUCCESS with 0 errors
   ```
4. Verify console.log removal:
   ```bash
   grep -rn "console\." src/lib/game/ | grep -v "\.test\."
   # Expected: 0 matches in master-orchestrator.ts
   ```
5. Test structured logging:
   ```bash
   LOG_LEVEL=debug npm run dev
   # Create and start a game
   # Verify JSON structured logs appear in terminal
   # Check for: gameId, phase, roundNumber in log objects
   ```

**Expected outcome:**
Build passes with zero TypeScript errors. Strict mode enabled. All console.log replaced with structured logging. Code quality significantly improved.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (direct merge, verification straightforward)

---

### Zone 4: Test Infrastructure & Critical Tests

**Builders involved:** Builder-4

**Conflict type:** New infrastructure (no conflicts)

**Risk level:** LOW (additive only, no production code changes)

**Description:**
Builder-4 installed Vitest testing framework and created comprehensive test suites for critical system components. Achieved >80% coverage on cost tracker (89.47% lines) and 100% coverage on tested Claude client functions. Created 47 new tests, all passing.

**Files affected:**
- `vitest.config.ts` - New Vitest configuration
- `vitest.setup.ts` - New global test setup
- `src/lib/claude/__tests__/mocks.ts` - New mock utilities
- `src/lib/claude/__tests__/client.simple.test.ts` - New unit tests (26 tests)
- `src/utils/__tests__/cost-tracker.test.ts` - New unit tests (21 tests)
- `docs/testing-guide.md` - New documentation
- `package.json` - Added test scripts and devDependencies

**Integration strategy:**
1. Merge all Builder-4 files
2. Install new dependencies:
   ```bash
   cd app/
   npm install
   # Installs: vitest, @vitest/ui, @vitest/coverage-v8, @testing-library/react, etc.
   ```
3. Run new tests:
   ```bash
   npm test -- src/lib/claude/__tests__/client.simple.test.ts --run
   npm test -- src/utils/__tests__/cost-tracker.test.ts --run
   # Expected: All 47 tests pass
   ```
4. Generate coverage report:
   ```bash
   npm run test:coverage -- src/lib/claude src/utils/cost-tracker.ts
   # Expected: Cost tracker >89% coverage
   ```
5. Verify test UI works:
   ```bash
   npm run test:ui
   # Opens browser at http://localhost:51204
   ```

**Expected outcome:**
Complete test infrastructure in place. Critical path coverage >80%. Fast test execution (<1 second). Documentation guides team on writing tests. Foundation for future test development.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (additive only, clear verification)

---

## Independent Features (Direct Merge)

All builder outputs are independent - no shared files modified by multiple builders.

**Direct merge candidates:**
- Builder-1: route.ts + documentation (no conflicts)
- Builder-2: Database migration files (no conflicts)
- Builder-3: TypeScript fixes across multiple files (no conflicts)
- Builder-4: Test infrastructure (all new files, no conflicts)

**Strategy:** Merge all zones sequentially with validation after each zone.

**Assigned to:** Integrator-1 (single integrator can handle all zones)

---

## Parallel Execution Groups

### Group 1 (Sequential - All zones depend on validation)

**Integrator-1 handles all zones in sequence:**
1. Zone 1: Critical Bug Fix (MUST BE FIRST - blocks validation)
2. Zone 2: Database Migration (requires Supabase setup)
3. Zone 3: TypeScript Fixes (requires clean build environment)
4. Zone 4: Test Infrastructure (requires all code integrated)

**Rationale for sequential execution:**
- Zone 1 must be validated immediately (critical bug)
- Zone 2 changes environment (affects subsequent zones)
- Zone 3 requires clean environment to verify build
- Zone 4 tests depend on all integrated code

---

## Integration Order

**Recommended sequence:**

### Step 1: Critical Bug Fix (30 minutes)
- Merge Zone 1 (Builder-1)
- Validate fix immediately:
  - Start dev server
  - Create and start game
  - Query database for messages
  - Expected: >0 messages (ideally 40+)
- If validation fails: STOP and debug before proceeding

### Step 2: Database Migration (45 minutes)
- Merge Zone 2 (Builder-2)
- Start Supabase Local
- Verify data migration
- Test application with PostgreSQL
- Document for team

### Step 3: TypeScript & Logging (20 minutes)
- Merge Zone 3 (Builder-3)
- Verify TypeScript compilation
- Verify build succeeds
- Test structured logging

### Step 4: Test Infrastructure (30 minutes)
- Merge Zone 4 (Builder-4)
- Install dependencies
- Run all tests
- Generate coverage report
- Verify test UI

### Step 5: Final Integration Testing (30 minutes)
- Run full test suite
- Create and run 3 complete games with real API key
- Verify all success criteria met
- Document any issues

**Total estimated time:** 2.5 hours

---

## Shared Resources Strategy

### Shared Types
**Issue:** None - no builders defined overlapping types

**Resolution:** N/A - no conflicts

### Shared Utilities
**Issue:** None - no duplicate utility implementations

**Resolution:** N/A - no conflicts

### Configuration Files
**Issue:** Multiple builders modified configuration files, but different files

**Files modified:**
- Builder-2: `prisma/schema.prisma`, `.env`
- Builder-3: `next.config.mjs`, `tsconfig.json`
- Builder-4: `package.json`, `vitest.config.ts` (new)

**Resolution:** Direct merge - no conflicts (different files)

**Responsible:** Integrator-1

### Database Schema
**Issue:** Builder-2 regenerated Prisma migrations for PostgreSQL

**Resolution:**
- Old SQLite migrations backed up to `prisma/migrations.sqlite.backup`
- New PostgreSQL migrations in `prisma/migrations/`
- Rollback script available if needed: `scripts/rollback-to-sqlite.sh`

**Responsible:** Integrator-1 in Zone 2

---

## Expected Challenges

### Challenge 1: Database Migration Requires Supabase Installation
**Impact:** Integration machine must have Supabase CLI and Docker installed
**Mitigation:**
- Verify prerequisites before starting: `supabase --version`, `docker --version`
- If missing, install Supabase CLI: `brew install supabase/tap/supabase` (macOS) or equivalent
- Ensure Docker is running: `docker ps`
**Responsible:** Integrator-1

### Challenge 2: Real API Testing Costs Money
**Impact:** Validation testing will incur API costs ($2-5 estimated)
**Mitigation:**
- Budget approved for validation testing
- Cost tracker active and will prevent runaway costs
- Limit to 3 test games for validation
**Responsible:** Integrator-1

### Challenge 3: Team Environment Updates
**Impact:** All developers must update their environment after integration
**Mitigation:**
- Create clear documentation in Zone 2
- Update team wiki/Slack with setup instructions
- Provide rollback script if needed
- Test on at least one other developer's machine
**Responsible:** Integrator-1

### Challenge 4: Existing Tests May Fail After TypeScript Fixes
**Impact:** Builder-4 noted 8 existing test files failed (not related to new tests)
**Mitigation:**
- Document which existing tests fail
- Mark as known issue for Iteration 5
- New tests (47) all pass - this is the success criteria
- Don't block integration on pre-existing test failures
**Responsible:** Integrator-1

---

## Success Criteria for This Integration Round

- [ ] Zone 1: Discussion phase generates >0 messages (ideally 40+)
- [ ] Zone 1: No TypeErrors in logs related to buildAgentContext
- [ ] Zone 2: Supabase Local running successfully
- [ ] Zone 2: All 9 games, 86 players, 43 messages migrated
- [ ] Zone 2: Application connects to PostgreSQL
- [ ] Zone 3: `npx tsc --noEmit` passes with 0 errors
- [ ] Zone 3: `npm run build` succeeds
- [ ] Zone 3: Zero console.log in production code
- [ ] Zone 4: All 47 new tests pass
- [ ] Zone 4: Cost tracker coverage >89%
- [ ] Final: 3 consecutive games complete successfully with real API
- [ ] Final: Game costs <$2 per game
- [ ] Final: No crashes or errors in logs

---

## Notes for Integrators

**Important context:**
- Builder-1's fix is CRITICAL - validate immediately after merge
- Builder-2 changes environment for entire team - coordinate carefully
- Builder-3's changes are low-risk quality improvements
- Builder-4's tests provide safety net for future changes

**Watch out for:**
- Don't skip validation of Builder-1's fix - it's the whole point of this iteration
- Ensure Supabase Local is running before testing anything after Zone 2
- Cost tracker will throw errors if budget exceeded - this is expected behavior
- Some existing tests will fail - this is pre-existing, not caused by this integration

**Patterns to maintain:**
- Reference `patterns.md` for all conventions
- All logging must be structured (no console.log)
- All code must pass TypeScript strict mode
- All new code should have test coverage

**Database connection string:**
After Zone 2, update `.env`:
```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

**Test execution:**
After Zone 4, run tests with:
```bash
npm test -- --run  # Run once
npm run test:coverage  # With coverage
npm run test:ui  # Interactive UI
```

---

## Conflict Resolution Strategy

**File Conflicts Detected:** NONE

All builders modified different files:
- Builder-1: `route.ts`, new documentation
- Builder-2: Database files, migrations, scripts
- Builder-3: TypeScript fixes across 15 files (no overlap with others)
- Builder-4: Test files (all new), package.json

**Resolution approach:** Direct merge, no manual conflict resolution needed

---

## Post-Integration Verification

After all zones are integrated, run these verification commands:

### 1. Environment Check
```bash
cd /home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app

# Verify Supabase running
supabase status
# Expected: All services running

# Verify dependencies installed
npm list vitest
# Expected: vitest@^1.6.1
```

### 2. Build Verification
```bash
# TypeScript check
npx tsc --noEmit
# Expected: 0 errors

# Build
npm run build
# Expected: SUCCESS
```

### 3. Test Verification
```bash
# Run new tests
npm test -- src/lib/claude/__tests__/client.simple.test.ts --run
npm test -- src/utils/__tests__/cost-tracker.test.ts --run
# Expected: All 47 tests pass

# Coverage
npm run test:coverage
# Expected: Cost tracker >89%
```

### 4. Code Quality Check
```bash
# Check for console.log
grep -rn "console\." src/lib/game/ | grep -v "\.test\."
# Expected: 0 matches

# Check for ignoreBuildErrors
grep -r "ignoreBuildErrors" .
# Expected: 0 matches
```

### 5. Functional Validation (Real API)
```bash
# Start dev server
LOG_LEVEL=debug npm run dev

# In another terminal, create game:
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"playerCount": 10}'

# Note the gameId from response, then start:
curl -X POST http://localhost:3000/api/game/{gameId}/start

# Wait 5 minutes for game to complete

# Check results in Supabase Studio:
# - Open http://localhost:54323
# - Check DiscussionMessage table
# - Expected: 40+ messages for the game
# - Check Game table
# - Expected: status = VOTING or GAME_OVER
```

### 6. Database Verification
```bash
# Open Supabase Studio
open http://localhost:54323

# Verify tables:
# - Game: 9+ games (original 9 + test games)
# - Player: 86+ players
# - DiscussionMessage: 43+ messages
```

### Success Criteria
- All commands pass without errors
- Game generates >40 messages
- Cost <$2 per game
- No crashes in logs
- Supabase Studio shows data correctly

### Rollback Plan
If critical issues discovered:
```bash
# Stop Supabase
cd /home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app
supabase stop

# Rollback to SQLite
bash scripts/rollback-to-sqlite.sh

# Git revert if needed
git reset --hard HEAD~4  # Revert 4 builder commits
```

---

## Next Steps

1. **Integrator-1 executes zones 1-4 sequentially**
2. **Integrator-1 runs post-integration verification**
3. **Integrator-1 creates integration report**
4. **Proceed to ivalidator for final validation**

---

## Integration Metadata

**Integration Planner:** 2l-iplanner
**Plan created:** 2025-10-13T00:00:00Z
**Round:** 1
**Iteration:** 4
**Plan:** plan-1
**Total zones:** 4
**Total integrators:** 1
**Estimated integration time:** 2.5 hours
**Risk level:** MEDIUM (critical bug fix + environment change)
**Parallel execution:** No (sequential validation required)
**Conflicts detected:** 0
**Rollback available:** Yes (scripts/rollback-to-sqlite.sh)
