# Builder Task Breakdown - Iteration 4

## Overview

4 builders will work on healing the AI Mafia production system. Tasks are prioritized by criticality and designed for parallel execution where possible.

**Total Estimated Effort**: 12-16 hours
**Expected Splits**: None (all tasks are LOW-MEDIUM complexity)

---

## Builder-1: Critical Bug Fix (Signature Mismatch)

### Goal

Fix the CRITICAL function signature mismatch that causes 0 messages in discussion phase. This is the highest priority task that unblocks validation.

### Scope

- Fix dependency injection in `route.ts` to use correct function signature
- Add validation to prevent future signature mismatches
- Test fix immediately with database queries
- Document the bug and fix for future reference

### Complexity Estimate

**LOW**

This is a focused fix with clear root cause identified by Explorer-2.

### Success Criteria

- [ ] Discussion phase generates at least 1 message (verify with database query)
- [ ] Full game completes with 40+ messages
- [ ] No TypeErrors in logs related to `buildAgentContext`
- [ ] Dependencies use correct signature: `(playerId: string, gameId: string) => Promise<AgentContext>`
- [ ] Validation code prevents invalid dependencies

### Files to Modify

**Primary:**
- `app/api/game/[gameId]/start/route.ts` (line 87) - Fix dependency injection

**Supporting:**
- `src/lib/discussion/turn-executor.ts` (verify wrapper exists and is exported)

**New Files:**
- `docs/bugfix-signature-mismatch.md` - Document the bug and resolution

### Dependencies

**Depends on:** None (can start immediately)

**Blocks:** Validation phase (must complete before real API testing)

### Integration Points

- Integrator should verify game generates messages after merge
- Builder-4 should test this fix in integration tests

### Implementation Notes

**Root Cause (from Explorer-2):**
Line 87 in `route.ts` passes `buildAgentContext` directly, but it expects `(player: object, history: object)` signature. Turn executor calls it with `(playerId: string, gameId: string)` causing TypeError.

**Solution:**
Use the existing `buildAgentContextWrapper` function that converts signatures.

**Before (WRONG):**
```typescript
// app/api/game/[gameId]/start/route.ts
import { buildAgentContext } from '@/lib/claude/context-builder';

const dependencies = {
  prisma,
  generateResponse: generateAgentResponse,
  trackCost: costTracker.track.bind(costTracker),
  buildAgentContext,  // ❌ WRONG SIGNATURE
  getCostSummary: costTracker.getSummary.bind(costTracker),
};
```

**After (CORRECT):**
```typescript
// app/api/game/[gameId]/start/route.ts
import { buildAgentContextWrapper } from '@/lib/discussion/turn-executor';

const dependencies = {
  prisma,
  generateResponse: generateAgentResponse,
  trackCost: costTracker.track.bind(costTracker),

  // ✅ Use wrapper that adapts signatures
  buildAgentContext: (playerId: string, gameId: string) =>
    buildAgentContextWrapper(playerId, gameId, prisma),

  getCostSummary: costTracker.getSummary.bind(costTracker),
};
```

**Validation Code:**
Add this after dependencies are created to catch future issues:

```typescript
// Validate dependencies at runtime
if (typeof dependencies.buildAgentContext !== 'function') {
  throw new Error('buildAgentContext dependency must be a function');
}

// Test signature with first player
const firstPlayer = game.players[0];
if (firstPlayer) {
  try {
    await dependencies.buildAgentContext(firstPlayer.id, gameId);
  } catch (error: any) {
    logger.error({
      gameId,
      error: error.message,
      stack: error.stack
    }, 'Dependency validation failed');

    throw new Error(`Invalid buildAgentContext signature: ${error.message}`);
  }
}
```

### Testing Strategy

**Immediate Testing (Manual):**
```bash
# 1. Start dev server
npm run dev

# 2. Create a game
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"playerCount": 10}'

# 3. Start the game (returns gameId)
curl -X POST http://localhost:3000/api/game/{gameId}/start

# 4. Wait 30 seconds, then check messages
psql -d dev.db -c "SELECT COUNT(*) FROM DiscussionMessage WHERE gameId = '{gameId}';"

# Expected: COUNT > 0 (at least 1 message)
```

**Integration Testing:**
Builder-4 will create automated tests for this fix.

### Patterns to Follow

Reference `patterns.md`:
- **Dependency Injection Pattern** (critical for this fix)
- **Structured Logging Pattern** (log fix validation)
- **Error Handling Pattern** (proper error messages)

### Documentation Requirements

Create `docs/bugfix-signature-mismatch.md`:
```markdown
# Bug Fix: Function Signature Mismatch in Discussion Phase

## Problem
Discussion phase generated 0 messages due to incorrect dependency injection.

## Root Cause
Line 87 in `route.ts` passed `buildAgentContext` function expecting `(player, history)` signature, but turn executor called it with `(playerId, gameId)`.

## Solution
Used `buildAgentContextWrapper` that adapts signatures correctly.

## Verification
Game now generates 40+ messages in discussion phase.

## Prevention
Added runtime validation to catch signature mismatches early.

## Related
- Explorer-2 Report: Root cause analysis
- Issue: #[if tracked]
```

### Estimated Effort

- Code fix: 10 minutes
- Validation code: 10 minutes
- Testing: 20 minutes
- Documentation: 20 minutes

**Total: 1 hour**

### Risk Assessment

**Risk:** LOW

The fix is simple and well-understood. The wrapper function already exists and works correctly.

**Mitigation:** Test immediately after implementing to verify messages are generated.

---

## Builder-2: Database Migration (Supabase Local)

### Goal

Migrate development environment from SQLite to PostgreSQL using Supabase Local, eliminating schema drift between dev and production.

### Scope

- Initialize Supabase Local with Docker
- Export existing SQLite data (8 games, 76 players, 41 messages)
- Regenerate Prisma migrations for PostgreSQL
- Import data to PostgreSQL
- Update `.env` and documentation
- Create rollback script for safety

### Complexity Estimate

**MEDIUM**

Prerequisites are met (Docker, Supabase CLI installed) but data migration adds complexity.

### Success Criteria

- [ ] `supabase status` shows all services running
- [ ] Supabase Studio accessible at http://localhost:54323
- [ ] Prisma schema uses `provider = "postgresql"`
- [ ] `npx prisma validate` passes
- [ ] `npx prisma migrate dev` succeeds
- [ ] 8 games migrated successfully (or fresh start documented)
- [ ] Full game works with PostgreSQL
- [ ] Documentation created: `docs/supabase-local-setup.md`
- [ ] Rollback script: `scripts/rollback-to-sqlite.sh`

### Files to Create/Modify

**Create:**
- `scripts/export-sqlite-data.ts` - Export current data
- `scripts/import-data.ts` - Import to PostgreSQL
- `scripts/rollback-to-sqlite.sh` - Rollback script
- `supabase/config.toml` - Generated by `supabase init`
- `docs/supabase-local-setup.md` - Setup documentation

**Modify:**
- `prisma/schema.prisma` - Change provider to postgresql
- `.env` - Update DATABASE_URL
- `README.md` - Add setup instructions

**Delete:**
- `prisma/migrations/*` - Regenerate for PostgreSQL

### Dependencies

**Depends on:** None (can run in parallel with Builder-1)

**Blocks:** None (other builders can continue with their tasks)

### Integration Points

- Other builders should update `.env` after PostgreSQL is ready
- Builder-4's tests should work with PostgreSQL

### Implementation Notes

**Step 1: Initialize Supabase (30 min)**
```bash
cd /home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app

# Initialize Supabase project
supabase init

# Start local services (PostgreSQL, Studio, Auth, etc.)
supabase start

# Note the connection URL from output:
# DATABASE_URL: postgresql://postgres:postgres@localhost:54322/postgres
```

**Step 2: Export SQLite Data (1 hour)**
```typescript
// scripts/export-sqlite-data.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

async function exportData() {
  console.log('Exporting SQLite data...');

  const data = {
    games: await prisma.game.findMany({
      include: {
        players: true,
        discussionMessages: {
          orderBy: { createdAt: 'asc' }
        },
        nightMessages: true,
        votes: true,
        events: true
      }
    })
  };

  const outputPath = path.join(__dirname, '..', 'data-backup.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Exported ${data.games.length} games to ${outputPath}`);
  console.log(`Total players: ${data.games.reduce((sum, g) => sum + g.players.length, 0)}`);
  console.log(`Total messages: ${data.games.reduce((sum, g) => sum + g.discussionMessages.length, 0)}`);

  await prisma.$disconnect();
}

exportData().catch(console.error);
```

**Step 3: Update Schema (15 min)**
```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}

// Models remain the same - Prisma handles type conversion
```

**Step 4: Regenerate Migrations (30 min)**
```bash
# Backup old migrations
mv prisma/migrations prisma/migrations.sqlite.backup

# Create new PostgreSQL migrations
npx prisma migrate dev --name init

# Verify schema
npx prisma validate
```

**Step 5: Import Data (1 hour)**
```typescript
// scripts/import-data.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importData() {
  console.log('Importing data to PostgreSQL...');

  const dataPath = path.join(__dirname, '..', 'data-backup.json');
  const backup = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  for (const gameData of backup.games) {
    const { players, discussionMessages, nightMessages, votes, events, ...game } = gameData;

    await prisma.game.create({
      data: {
        ...game,
        players: {
          create: players.map((p: any) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            personality: p.personality,
            isAlive: p.isAlive,
            createdAt: new Date(p.createdAt)
          }))
        },
        discussionMessages: {
          create: discussionMessages.map((m: any) => ({
            id: m.id,
            playerId: m.playerId,
            message: m.message,
            replyToId: m.replyToId,
            createdAt: new Date(m.createdAt)
          }))
        },
        // ... nightMessages, votes, events
      }
    });

    console.log(`Imported game: ${game.id}`);
  }

  console.log('Import complete!');
  await prisma.$disconnect();
}

importData().catch(console.error);
```

**Step 6: Create Rollback Script (30 min)**
```bash
#!/bin/bash
# scripts/rollback-to-sqlite.sh

echo "Rolling back to SQLite..."

# Stop Supabase
supabase stop

# Restore SQLite schema
cd prisma
rm -rf migrations
mv migrations.sqlite.backup migrations

# Update schema.prisma
sed -i 's/provider = "postgresql"/provider = "sqlite"/' schema.prisma

# Update .env
sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./prisma/dev.db"|' ../.env

echo "Rollback complete. SQLite database restored."
```

**Step 7: Documentation (30 min)**
Create `docs/supabase-local-setup.md` with:
- Prerequisites (Docker, Supabase CLI)
- Setup instructions
- Connection URL format
- Common issues and solutions
- Rollback procedure

### Testing Strategy

```bash
# Verify Supabase running
supabase status

# Check database connection
npx prisma studio

# Test full game
npm run dev
# Create game → Start → Verify messages in Supabase Studio
```

### Patterns to Follow

Reference `patterns.md`:
- **Database Patterns** - Prisma queries
- **Error Handling Pattern** - Migration errors
- **Structured Logging Pattern** - Migration progress

### Alternative: Start Fresh (If Migration Fails)

If data import proves too complex:
1. Skip export/import steps
2. Start with empty PostgreSQL
3. Document decision in `docs/supabase-local-setup.md`
4. Trade-off: Lose 8 games of test data (acceptable)

### Estimated Effort

- Supabase init: 30 min
- Export script: 1 hour
- Schema update: 15 min
- Regenerate migrations: 30 min
- Import script: 1 hour
- Rollback script: 30 min
- Documentation: 30 min

**Total: 4 hours** (or 2.5 hours if starting fresh)

### Risk Assessment

**Risk:** MEDIUM

Data migration can have edge cases (foreign keys, timestamps).

**Mitigation:**
- Keep SQLite backup
- Test import incrementally
- Rollback script ready

**Fallback:** Start fresh PostgreSQL (lose test data)

---

## Builder-3: TypeScript Fixes & Logging Cleanup

### Goal

Fix all 28 TypeScript errors, enable strict mode, and replace remaining console.log statements with structured logging.

### Scope

- Fix TypeScript errors identified by `npx tsc --noEmit`
- Remove `ignoreBuildErrors: true` from next.config.mjs
- Replace 12 console.log statements in master-orchestrator.ts
- Enable strict mode in tsconfig.json
- Ensure clean build with zero errors

### Complexity Estimate

**MEDIUM**

28 TypeScript errors may have cascading effects, but most are likely straightforward type annotations.

### Success Criteria

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npm run build` succeeds
- [ ] No `ignoreBuildErrors` config anywhere
- [ ] Zero console.log statements in src/ (excluding test files)
- [ ] All `any` types have `// @ts-expect-error` with reason OR proper types
- [ ] Strict mode enabled in tsconfig.json
- [ ] No type-related runtime errors

### Files to Modify

**TypeScript Config:**
- `next.config.mjs` - Remove ignoreBuildErrors
- `tsconfig.json` - Enable strict mode

**Logging Fixes:**
- `src/lib/game/master-orchestrator.ts` - Replace 12 console.log statements (lines 106, 108, 141, 162, 182, 224, 242, 266, 288, 320, 376, 377, 379)

**Type Fixes:**
- Various files with TypeScript errors (identify with `npx tsc --noEmit`)

### Dependencies

**Depends on:** None (can run in parallel)

**Blocks:** None (but clean types help Builder-4's tests)

### Integration Points

- Type fixes may require updates in Builder-4's tests
- Coordinate on shared type definitions

### Implementation Notes

**Step 1: Identify TypeScript Errors (15 min)**
```bash
npx tsc --noEmit > typescript-errors.txt

# Review errors
cat typescript-errors.txt | head -50
```

**Step 2: Fix Common Error Types (2 hours)**

**Error Type 1: Implicit any**
```typescript
// Before (ERROR)
function processPlayer(player) {  // Implicit any
  return player.name;
}

// After (FIXED)
function processPlayer(player: Player): string {
  return player.name;
}
```

**Error Type 2: Missing null checks**
```typescript
// Before (ERROR)
const game = await prisma.game.findUnique({ where: { id } });
game.status;  // Error: game might be null

// After (FIXED)
const game = await prisma.game.findUnique({ where: { id } });
if (!game) {
  throw new Error('Game not found');
}
game.status;  // OK
```

**Error Type 3: Component prop types**
```typescript
// Before (ERROR)
export default function PlayerCard({ player }) {  // Implicit any
  return <div>{player.name}</div>;
}

// After (FIXED)
interface PlayerCardProps {
  player: Player;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return <div>{player.name}</div>;
}
```

**Error Type 4: Incorrect generic usage**
```typescript
// Before (ERROR)
const items = [];  // any[]
items.push(player);

// After (FIXED)
const items: Player[] = [];
items.push(player);
```

**Step 3: Replace console.log (1 hour)**

**Pattern for replacement:**
```typescript
// Before (WRONG)
console.log(`[Master Orchestrator] [ROUND ${roundNumber}] Starting DISCUSSION phase`);

// After (CORRECT)
orchestratorLogger.info({
  gameId,
  roundNumber,
  phase: 'DISCUSSION'
}, 'Starting DISCUSSION phase');
```

**All 12 locations to fix:**
```typescript
// Line 106 - DAY_ANNOUNCEMENT start
orchestratorLogger.info({ gameId, roundNumber, phase: 'DAY_ANNOUNCEMENT' }, 'Starting DAY_ANNOUNCEMENT phase');

// Line 141 - DISCUSSION start
orchestratorLogger.info({ gameId, roundNumber, phase: 'DISCUSSION' }, 'Starting DISCUSSION phase');

// Line 162 - VOTING start
orchestratorLogger.info({ gameId, roundNumber, phase: 'VOTING' }, 'Starting VOTING phase');

// Line 182 - WIN_CHECK start
orchestratorLogger.info({ gameId, roundNumber, phase: 'WIN_CHECK' }, 'Starting WIN_CHECK phase');

// Line 224 - Max rounds reached
orchestratorLogger.warn({ gameId, roundNumber, maxRounds: 10 }, 'Max rounds reached, ending game');

// Line 242 - Fatal error (console.error)
orchestratorLogger.error({ gameId, error: error.message, stack: error.stack }, 'Fatal error in game loop');

// Line 266 - Phase update
orchestratorLogger.debug({ gameId, phase: currentPhase }, 'Updated game phase');

// Line 288 - Player elimination
orchestratorLogger.info({ gameId, playerId, playerName }, 'Player eliminated');

// Line 320 - Win check
orchestratorLogger.debug({ gameId, aliveMafia, aliveVillagers }, 'Checking win conditions');

// Lines 376-379 - Game over summary
orchestratorLogger.info({
  gameId,
  winner,
  totalRounds: roundNumber,
  duration: Date.now() - startTime
}, 'Game over');
```

**Step 4: Enable Strict Mode (15 min)**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Step 5: Remove ignoreBuildErrors (5 min)**
```javascript
// next.config.mjs
const nextConfig = {
  // Remove this entirely:
  // typescript: {
  //   ignoreBuildErrors: true
  // }
};
```

**Step 6: Verify Build (15 min)**
```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Run tests (if Builder-4 complete)
npm test
```

### Testing Strategy

```bash
# Continuous type checking during fixes
npx tsc --noEmit --watch

# Check for console.log
grep -r "console\." src/ --exclude-dir=__tests__

# Verify logging
LOG_LEVEL=debug npm run dev
# Check that structured logs appear in output
```

### Patterns to Follow

Reference `patterns.md`:
- **Type Safety Pattern** - Explicit types everywhere
- **Structured Logging Pattern** - Replace console.log
- **Error Handling Pattern** - Null checks, error types

### Estimated Effort

- Identify errors: 15 min
- Fix TypeScript errors: 2 hours
- Replace console.log: 1 hour
- Enable strict mode: 15 min
- Remove ignoreBuildErrors: 5 min
- Verify build: 15 min
- Documentation: 10 min

**Total: 4 hours**

### Risk Assessment

**Risk:** MEDIUM

Some TypeScript errors may require refactoring.

**Mitigation:**
- Fix incrementally
- Test after each batch of fixes
- Use `// @ts-expect-error` with justification for truly intractable cases

**Fallback:** Keep ignoreBuildErrors for specific files if absolutely needed (document why)

---

## Builder-4: Test Infrastructure & Critical Tests

### Goal

Install Vitest framework and create critical path tests to validate fixes and prevent regressions.

### Scope

- Install Vitest and testing dependencies
- Configure Vitest for Next.js App Router
- Create unit tests for Claude client and cost tracker
- Create integration test for game orchestration
- Verify existing tests pass
- Generate coverage report (>60% overall, >80% critical paths)

### Complexity Estimate

**MEDIUM-HIGH**

Testing setup is straightforward, but writing comprehensive tests takes time.

### Success Criteria

- [ ] `npm test` runs all tests successfully
- [ ] Vitest config works with Next.js App Router
- [ ] Unit test: `claude/client.test.ts` with >80% coverage
- [ ] Unit test: `cost-tracker.test.ts` with 100% coverage
- [ ] Integration test: Full game with mocked API completes
- [ ] Existing tests migrated and passing
- [ ] Coverage report shows >60% overall, >80% on critical paths
- [ ] Tests run in <60 seconds (excluding full game E2E)
- [ ] Documentation: `docs/testing-guide.md`

### Files to Create

**Config:**
- `vitest.config.ts` - Main Vitest configuration
- `vitest.setup.ts` - Test setup and globals

**Tests:**
- `src/lib/claude/__tests__/client.test.ts` - Claude API client tests
- `src/lib/claude/__tests__/cost-tracker.test.ts` - Cost tracker tests
- `src/lib/game/__tests__/master-orchestrator.test.ts` - Integration test
- `src/lib/claude/__tests__/mocks.ts` - Mock utilities

**Documentation:**
- `docs/testing-guide.md` - How to run and write tests

### Files to Modify

**Package.json:**
- Add test dependencies
- Add test scripts

### Dependencies

**Depends on:** Builder-1 (signature fix to test)

**Blocks:** None (tests can be written in parallel)

### Integration Points

- Should test Builder-1's signature fix
- May need updates after Builder-3's type fixes

### Implementation Notes

**Step 1: Install Dependencies (15 min)**
```bash
npm install -D vitest@^1.0.0 \
  @vitest/ui@^1.0.0 \
  @testing-library/react@^14.0.0 \
  @testing-library/dom@^9.0.0 \
  @testing-library/jest-dom@^6.0.0 \
  happy-dom@^12.0.0 \
  vitest-mock-extended@^1.3.0
```

**Step 2: Configure Vitest (30 min)**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
});
```

```typescript
// vitest.setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

**Step 3: Create Mock Utilities (30 min)**
```typescript
// src/lib/claude/__tests__/mocks.ts
import { vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';

export function mockClaudeAPI(responses: string[]) {
  let callIndex = 0;

  const mockCreate = vi.fn().mockImplementation(() => {
    const response = responses[callIndex % responses.length];
    callIndex++;

    return Promise.resolve({
      content: [{ type: 'text', text: response }],
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_read_input_tokens: 50,
        cache_creation_input_tokens: 0
      }
    });
  });

  vi.spyOn(Anthropic.prototype.messages, 'create').mockImplementation(mockCreate);

  return mockCreate;
}

export function mockClaudeError(error: Error) {
  vi.spyOn(Anthropic.prototype.messages, 'create').mockRejectedValue(error);
}
```

**Step 4: Claude Client Tests (2 hours)**
```typescript
// src/lib/claude/__tests__/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAgentResponse, calculateCost } from '../client';
import { mockClaudeAPI, mockClaudeError } from './mocks';

vi.mock('@anthropic-ai/sdk');

describe('Claude Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAgentResponse', () => {
    it('should return AI response for valid context', async () => {
      mockClaudeAPI(['I think Alice is suspicious']);

      const context = {
        playerId: 'player-1',
        role: 'VILLAGER',
        personality: 'analytical',
        messages: [],
        system: [{ type: 'text', text: 'You are a villager' }]
      };

      const response = await generateAgentResponse(context);

      expect(response).toBe('I think Alice is suspicious');
    });

    it('should retry on API failure', async () => {
      const mockCreate = vi.fn()
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success on retry' }],
          usage: { input_tokens: 100, output_tokens: 20 }
        });

      vi.spyOn(Anthropic.prototype.messages, 'create').mockImplementation(mockCreate);

      const response = await generateAgentResponse(mockContext);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response).toBe('Success on retry');
    });

    it('should return fallback after max retries', async () => {
      mockClaudeError(new Error('API Down'));

      const response = await generateAgentResponse(mockContext);

      expect(response).toContain('carefully observes');
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost with cache hit', () => {
      const usage = {
        input_tokens: 1000,
        output_tokens: 200,
        cache_read_input_tokens: 500
      };

      const cost = calculateCost(usage);

      expect(cost).toBeCloseTo(0.00615, 5);
    });
  });
});
```

**Step 5: Cost Tracker Tests (1 hour)**
```typescript
// src/lib/claude/__tests__/cost-tracker.test.ts
import { describe, it, expect } from 'vitest';
import { CostTracker } from '../../utils/cost-tracker';

describe('Cost Tracker', () => {
  it('should allow calls below budget', () => {
    const tracker = new CostTracker(5.0);

    expect(tracker.canMakeCall(0.10)).toBe(true);
    tracker.track('game-1', 0.10);
    expect(tracker.getSummary('game-1').totalCost).toBe(0.10);
  });

  it('should block calls exceeding budget', () => {
    const tracker = new CostTracker(1.0);
    tracker.track('game-1', 0.95);

    expect(() => tracker.track('game-1', 0.10)).toThrow('Cost limit exceeded');
  });

  it('should track multiple games independently', () => {
    const tracker = new CostTracker(10.0);

    tracker.track('game-1', 2.0);
    tracker.track('game-2', 3.0);

    expect(tracker.getSummary('game-1').totalCost).toBe(2.0);
    expect(tracker.getSummary('game-2').totalCost).toBe(3.0);
  });
});
```

**Step 6: Integration Test (2 hours)**
```typescript
// src/lib/game/__tests__/master-orchestrator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runGameLoop } from '../master-orchestrator';
import * as claudeClient from '@/lib/claude/client';
import { prisma } from '@/lib/db/client';

vi.mock('@/lib/claude/client');

describe('Game Orchestrator Integration', () => {
  it('should generate messages during game', async () => {
    vi.mocked(claudeClient.generateAgentResponse).mockResolvedValue(
      'This is a test message'
    );

    const game = await prisma.game.create({
      data: {
        status: 'LOBBY',
        players: {
          create: Array.from({ length: 10 }, (_, i) => ({
            name: `Player-${i + 1}`,
            role: i < 3 ? 'MAFIA' : 'VILLAGER',
            personality: 'analytical',
            isAlive: true
          }))
        }
      }
    });

    await runGameLoop(game.id, mockDependencies);

    // Wait for discussion phase
    await new Promise(resolve => setTimeout(resolve, 5000));

    const messages = await prisma.discussionMessage.count({
      where: { gameId: game.id }
    });

    expect(messages).toBeGreaterThan(0);

    await prisma.game.delete({ where: { id: game.id } });
  });
});
```

**Step 7: Documentation (30 min)**
Create `docs/testing-guide.md` with:
- Running tests: `npm test`
- Writing tests: Examples and patterns
- Mocking strategies
- Coverage reports

### Testing Strategy

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage

# UI mode
npm run test:ui
```

### Patterns to Follow

Reference `patterns.md`:
- **Testing Patterns** - Mock setup, assertions
- **Type Safety Pattern** - Proper test types
- **Error Handling Pattern** - Test error scenarios

### Estimated Effort

- Install dependencies: 15 min
- Configure Vitest: 30 min
- Mock utilities: 30 min
- Claude client tests: 2 hours
- Cost tracker tests: 1 hour
- Integration test: 2 hours
- Documentation: 30 min
- Verify existing tests: 15 min

**Total: 6.5 hours**

### Risk Assessment

**Risk:** MEDIUM

Integration tests may break if Builder-1's fix changes interfaces.

**Mitigation:**
- Start with unit tests (isolated)
- Coordinate with Builder-1 on interfaces
- Update tests after integration

**Fallback:** Focus on unit tests if integration proves complex, defer E2E to Iteration 5

---

## Builder Execution Order

### Parallel Group 1 (No dependencies)

**Can start immediately:**
- Builder-1: Critical Bug Fix
- Builder-2: Database Migration
- Builder-3: TypeScript & Logging

### Parallel Group 2 (After Builder-1)

**Wait for Builder-1 to merge:**
- Builder-4: Test Infrastructure (needs working code to test)

### Integration Phase

After all builders complete:
1. Merge Builder-1 (critical bug fix)
2. Verify game generates messages
3. Merge Builder-2 (database migration)
4. Update .env for other developers
5. Merge Builder-3 (TypeScript fixes)
6. Merge Builder-4 (tests)
7. Run full test suite
8. Test 3 games with real API key

---

## Integration Notes

### Shared Files to Watch

**Conflicts possible:**
- `next.config.mjs` - Builder-3 modifies (no conflict expected)
- `tsconfig.json` - Builder-3 modifies (no conflict expected)
- `package.json` - Builder-4 adds dependencies (no conflict expected)

**No conflicts expected** - all builders modify different files or create new files.

### Coordination Points

1. **Builder-1 → Builder-4**: Share signature fix details for testing
2. **Builder-2 → All**: Notify when PostgreSQL ready, share new DATABASE_URL
3. **Builder-3 → Builder-4**: Type fixes may affect test type annotations

### Post-Integration Checklist

- [ ] All builders merged without conflicts
- [ ] `npm install` runs successfully (new dependencies)
- [ ] `npm run build` succeeds
- [ ] `npm test` passes all tests
- [ ] Game generates 40+ messages in discussion
- [ ] Cost <$2 per game with real API
- [ ] Supabase Studio shows data correctly
- [ ] No console.log in production code
- [ ] Documentation updated

---

## Summary

**Total Builders:** 4
**Total Estimated Time:** 15.5 hours
**Parallelization:** 3 builders can run simultaneously

**Critical Path:**
1. Builder-1 (1 hour) → CRITICAL, must complete first
2. Builder-4 (6.5 hours) → Depends on Builder-1
3. **Total critical path: 7.5 hours**

**Parallel Work:**
- Builder-2 (4 hours) - Can run anytime
- Builder-3 (4 hours) - Can run anytime

**Expected Completion:** 8-10 hours with good parallelization

---

**Builder Tasks Status**: COMPLETE
**Ready for Execution**: YES
