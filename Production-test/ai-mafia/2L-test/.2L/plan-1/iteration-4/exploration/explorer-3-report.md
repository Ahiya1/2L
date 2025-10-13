# Explorer-3 Report: Database Migration & Test Infrastructure Analysis

**Explorer:** Explorer-3  
**Focus Area:** Supabase Local Setup & Test Infrastructure  
**Date:** 2025-10-13  
**Status:** COMPLETE

---

## Executive Summary

**System Environment:** Excellent - Docker (v28.5.1) and Supabase CLI (v2.48.3) already installed, Node 20.19.5, 836GB free disk space, port 5432 available.

**Database State:** 164KB SQLite database with real data (8 games, 76 players, 41 messages). Schema has 7 models, 2 migrations, and uses SQLite-specific features (PRAGMA, DATETIME).

**Test Infrastructure:** Tests exist but framework not installed. Vitest tests written for components and utilities, but `vitest` package missing from `package.json`. Node 20+ built-in test runner available as zero-dependency alternative.

**Key Finding:** Supabase Local migration is LOW COMPLEXITY (1-2 hours) because prerequisites are met. Test setup is MEDIUM COMPLEXITY due to need to choose framework and migrate existing tests.

**Recommendation:** Proceed with Supabase Local + Vitest for comprehensive testing strategy.

---

## Discoveries

### System Prerequisites Analysis

**Docker Status:**
- ✅ Installed: Docker 28.5.1
- ✅ Running: Daemon active
- ✅ Port 5432: Available (no conflicts)
- ✅ Disk space: 836GB free (937GB total)

**Supabase CLI Status:**
- ✅ Installed: v2.48.3
- ⚠️ Note: v2.51.0 available (minor update, not blocking)
- ✅ Compatible with Docker version

**Node Environment:**
- ✅ Node v20.19.5 (LTS)
- ✅ Built-in test runner available (`node:test`)
- ✅ TypeScript support via `tsx`

**Verdict:** All prerequisites met. No installation blockers.

### Current Database Analysis

**File Details:**
- Location: `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/prisma/dev.db`
- Size: 164KB
- Provider: SQLite
- Connection: `file:./dev.db`

**Data Inventory:**
| Table | Count | Notes |
|-------|-------|-------|
| Game | 8 | Multiple test games |
| Player | 76 | ~9-10 players per game |
| DiscussionMessage | 41 | Real conversation data |
| Vote | 0 | No voting data yet |
| GameEvent | 0 | Not populated |
| NightMessage | 0 | Not tested yet |
| SharedGame | 0 | Feature unused |

**Verdict:** Real development data exists. Migration needed, not fresh start.

### Schema Compatibility Assessment

**Models:** 7 total
1. Game
2. Player  
3. DiscussionMessage
4. NightMessage
5. Vote
6. GameEvent
7. SharedGame

**SQLite-Specific Features Detected:**

1. **DATETIME Type**
   - SQLite: `DATETIME` (stored as TEXT/INTEGER)
   - PostgreSQL: `TIMESTAMP` or `TIMESTAMPTZ`
   - Impact: Prisma auto-converts, NO MANUAL CHANGES NEEDED

2. **PRAGMA Statements** (in 2nd migration)
   ```sql
   PRAGMA defer_foreign_keys=ON;
   PRAGMA foreign_keys=OFF;
   ```
   - Impact: PostgreSQL ignores PRAGMA, but migration will FAIL
   - Solution: Prisma needs to regenerate migrations for PostgreSQL

3. **TEXT vs VARCHAR**
   - SQLite: All strings are TEXT
   - PostgreSQL: VARCHAR, TEXT (unlimited length)
   - Impact: Prisma auto-converts, no issues

**Migration Strategy Required:**
- ❌ Cannot reuse existing migrations (PRAGMA statements incompatible)
- ✅ Export data → Change provider → Generate new migrations → Import data
- ⚠️ Medium complexity: 2-3 hours with data migration

### Existing Test Infrastructure

**Tests Found:**

1. **Component Tests** (Vitest format)
   - `components/__tests__/DiscussionFeed.test.tsx` (300 lines)
   - `components/__tests__/VoteTally.test.tsx`
   - Coverage: Accusation highlighting, threading, auto-scroll, SSE integration
   - Uses: `@testing-library/react`, mocks, assertions

2. **Utility Tests** (Vitest format)
   - `lib/game/__tests__/phase-config.test.ts` (83 lines)
   - Coverage: Phase timing, color classes, time formatting
   - Uses: Pure unit tests

3. **Console-Based Tests** (Custom runner)
   - `lib/discussion/threading.test.ts` (155 lines)
   - `lib/discussion/turn-scheduler.test.ts`
   - Uses: `console.log` for pass/fail
   - Format: Manual test execution

**Problem:** Tests exist but framework not installed!

```bash
$ grep -E "vitest|@testing-library" package.json
# NO RESULTS
```

**Missing Dependencies:**
- `vitest` - Test runner
- `@testing-library/react` - Component testing
- `@testing-library/dom` - DOM utilities
- `@vitest/ui` - Test UI (optional)
- `jsdom` or `happy-dom` - DOM environment

### Critical Code Needing Tests

**Priority 1: Claude API Integration**
- File: `src/lib/claude/client.ts`
- Functions:
  - `generateAgentResponse()` - Main API call
  - `calculateCost()` - Cost tracking (has formula bugs?)
  - `generateFallbackResponse()` - Timeout handling
  - `loadApiKey()` - File/env key loading
- Test Needs: Mock Anthropic SDK, test retries, timeouts, cost calculation

**Priority 2: Game Orchestration**
- File: `src/lib/game/master-orchestrator.ts`
- Functions: Phase transitions, timing, state management
- Test Needs: Integration test with mocked Claude API

**Priority 3: Discussion Logic**
- Files: 
  - `src/lib/discussion/orchestrator.ts`
  - `src/lib/discussion/threading.ts` (already has tests)
  - `src/lib/discussion/turn-scheduler.ts` (already has tests)
- Test Needs: Message generation, reply detection, turn management

**Priority 4: Utilities** (Lower priority)
- `src/lib/agent/validator.ts`
- `src/lib/game/role-assignment.ts`
- `src/lib/game/win-conditions.ts`

---

## Section 1: Database Strategy Recommendation

### Option A: Supabase Local ⭐ RECOMMENDED

**Description:**
Use Supabase CLI to run local PostgreSQL via Docker, matching production environment exactly.

**Pros:**
- ✅ Same database engine as production (Railway PostgreSQL)
- ✅ No schema drift between dev/prod
- ✅ Supabase CLI already installed
- ✅ Docker already installed and running
- ✅ Full PostgreSQL features available
- ✅ Easy migration to Supabase Cloud later (if needed)
- ✅ Local dashboard at `http://localhost:54323`
- ✅ Includes pgAdmin-like studio

**Cons:**
- ⚠️ Requires Docker to be running (CPU/memory overhead)
- ⚠️ Need to migrate existing SQLite data (2-3 hours)
- ⚠️ Cannot reuse existing migrations (PRAGMA incompatible)
- ⚠️ Slightly slower dev experience vs SQLite (network overhead)

**Setup Complexity:** LOW (prerequisites met)

**Estimated Effort:** 2-3 hours
- 30 min: `supabase init` + `supabase start`
- 1 hour: Export SQLite data, regenerate migrations
- 1 hour: Import data, test full game flow
- 30 min: Document setup in README

**Prerequisites:**
- ✅ Docker installed and running
- ✅ Supabase CLI installed (v2.48.3)
- ✅ Port 5432 available
- ✅ 2GB+ free disk space (for PostgreSQL data)

**Setup Steps:**
```bash
cd /home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app

# 1. Initialize Supabase local
supabase init

# 2. Start local services (PostgreSQL, Studio, Auth, etc.)
supabase start

# 3. Export existing SQLite data
npx tsx scripts/export-sqlite-data.ts > data-backup.json

# 4. Change schema provider to postgresql
# Edit prisma/schema.prisma:
# datasource db {
#   provider = "postgresql"
#   url      = env("DATABASE_URL")
# }

# 5. Reset migrations (Prisma will regenerate for PostgreSQL)
rm -rf prisma/migrations
npx prisma migrate dev --name init

# 6. Import data
npx tsx scripts/import-data.ts data-backup.json

# 7. Update .env
# DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# 8. Verify
npx prisma studio
```

**Recommendation Confidence:** HIGH

---

### Option B: Plain Docker PostgreSQL

**Description:**
Run PostgreSQL directly via Docker Compose without Supabase wrapper.

**Pros:**
- ✅ Simpler setup than Supabase (fewer services)
- ✅ Same database engine as production
- ✅ Lower resource usage than full Supabase stack
- ✅ Full control over PostgreSQL configuration

**Cons:**
- ❌ No Supabase Studio (lose nice UI for data inspection)
- ❌ Still need to migrate SQLite data
- ❌ Still need to regenerate migrations
- ⚠️ Manual Docker Compose configuration needed

**Setup Complexity:** MEDIUM

**Estimated Effort:** 2-3 hours (same as Supabase, but manual Docker Compose setup)

**Docker Compose Example:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: aimafia
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

**Recommendation Confidence:** MEDIUM (less benefits than Supabase)

---

### Option C: Keep SQLite for Dev (Accept Schema Drift)

**Description:**
Continue using SQLite for development, only use PostgreSQL in production.

**Pros:**
- ✅ Zero setup effort
- ✅ Fast dev experience (no Docker overhead)
- ✅ Keep existing data and migrations
- ✅ Familiar workflow

**Cons:**
- ❌ Schema drift risk (SQLite vs PostgreSQL differences)
- ❌ Migrations may fail in production
- ❌ Can't test PostgreSQL-specific features locally
- ❌ Debugging production issues harder
- ❌ False confidence (works in dev, breaks in prod)
- ❌ Already experiencing this problem (vision document mentions schema issues)

**Setup Complexity:** NONE

**Estimated Effort:** 0 hours

**Risks:**
- HIGH: Schema drift already causing issues
- HIGH: Cannot validate production behavior locally
- MEDIUM: Wasted time debugging prod-only issues

**Recommendation Confidence:** LOW (not recommended for healing iteration)

---

### FINAL RECOMMENDATION: Option A (Supabase Local)

**Rationale:**

1. **Prerequisites Met:** Docker and Supabase CLI already installed eliminates main barrier
2. **Critical for Healing:** Schema consistency is core goal of Iteration 4
3. **Production Parity:** Railway uses PostgreSQL, dev should match
4. **Good DX:** Supabase Studio provides excellent data inspection UI
5. **Future-Proof:** Easy to migrate to Supabase Cloud if needed

**Trade-off Accepted:** 2-3 hours migration effort is worth eliminating schema drift permanently.

**Builder-3 Recommendation:** COMPLETE task (no split needed)

---

## Section 2: Migration Assessment

**Current Database Size:** 164KB

**Data Exists:** ✅ YES
- 8 games with 76 total players
- 41 discussion messages with real AI conversations
- Valuable test data for validation

**Migration Needed:** ✅ YES
- Cannot use existing SQLite migrations (PRAGMA incompatible)
- Must regenerate migrations for PostgreSQL
- Data export/import required to preserve test data

**Can Start Fresh:** ⚠️ POSSIBLE BUT NOT RECOMMENDED
- Pros: Simpler (skip export/import)
- Cons: Lose 8 games of test data that could validate fixes

**Migration Complexity:** MEDIUM

**Detailed Migration Plan:**

**Step 1: Export SQLite Data (30 min)**
```typescript
// scripts/export-sqlite-data.ts
import { prisma } from '../src/lib/db/client';
import fs from 'fs';

async function exportData() {
  const data = {
    games: await prisma.game.findMany({ include: { players: true, discussionMessages: true } }),
    // ... other tables
  };
  fs.writeFileSync('data-backup.json', JSON.stringify(data, null, 2));
}
```

**Step 2: Change Schema Provider (5 min)**
```prisma
// Before
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// After
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Step 3: Delete Old Migrations (1 min)**
```bash
rm -rf prisma/migrations
```

**Step 4: Generate New Migrations (10 min)**
```bash
# Supabase provides connection URL
npx prisma migrate dev --name init
```

**Step 5: Import Data (30 min)**
```typescript
// scripts/import-data.ts
import { prisma } from '../src/lib/db/client';
import fs from 'fs';

async function importData() {
  const data = JSON.parse(fs.readFileSync('data-backup.json', 'utf-8'));
  
  // Import games first (foreign key parent)
  for (const game of data.games) {
    await prisma.game.create({
      data: {
        ...game,
        players: { create: game.players },
        // ... handle relations
      }
    });
  }
}
```

**Step 6: Validate (30 min)**
```bash
# Test queries
npx prisma studio

# Run app
npm run dev

# Create test game and verify all phases work
```

**Estimated Total Migration Time:** 2-3 hours

**Risk Level:** LOW-MEDIUM
- Risk: Data export/import bugs
- Mitigation: Keep SQLite backup, test incrementally
- Fallback: Start fresh if import fails (lose test data)

---

## Section 3: Test Framework Recommendation

### Comparison Matrix

| Framework | Setup Effort | Speed | Features | Next.js Compat | Vitest Config | Node Built-in | Recommendation |
|-----------|-------------|-------|----------|----------------|---------------|---------------|----------------|
| **Vitest** | Low | Fast | Rich | Excellent | Already used | ❌ | ⭐⭐⭐⭐⭐ |
| **Jest** | Medium | Slow | Rich | Excellent | Migration needed | ❌ | ⭐⭐⭐ |
| **Node Test Runner** | Very Low | Fast | Basic | Good | Break existing | ✅ | ⭐⭐ |

### Option A: Vitest ⭐ RECOMMENDED

**Description:**
Modern test runner built on Vite, with Jest-compatible API.

**Why Vitest:**
1. **Tests Already Written:** Existing tests use Vitest syntax (`describe`, `it`, `expect`, `vi.fn()`)
2. **Zero Migration:** Just install packages, tests work immediately
3. **Fast:** ~10x faster than Jest (ES modules, Vite caching)
4. **Great DX:** Watch mode, UI, coverage built-in
5. **Next.js Compatible:** Works with Next.js App Router
6. **Modern:** TypeScript first-class, ES modules native

**Cons:**
- One more dependency (but small)
- Slightly different from Jest (but very similar API)

**Setup Steps:**

```bash
cd /home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app

# 1. Install dependencies
npm install -D vitest @vitest/ui @testing-library/react @testing-library/dom happy-dom

# 2. Create vitest.config.ts
cat > vitest.config.ts << 'VITEST_EOF'
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
    },
  },
});
VITEST_EOF

# 3. Create setup file
cat > vitest.setup.ts << 'SETUP_EOF'
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});
SETUP_EOF

# 4. Add test scripts to package.json
npm pkg set scripts.test="vitest"
npm pkg set scripts.test:ui="vitest --ui"
npm pkg set scripts.test:coverage="vitest --coverage"

# 5. Run tests
npm test
```

**Estimated Setup Time:** 1 hour
- 15 min: Install dependencies
- 30 min: Configure vitest.config.ts and setup
- 15 min: Verify existing tests pass

**Recommendation Confidence:** VERY HIGH

---

### Option B: Jest

**Description:**
Industry standard test framework with massive ecosystem.

**Why NOT Jest:**
1. ❌ Tests already use Vitest syntax (`vi.fn()` not `jest.fn()`)
2. ❌ Slower than Vitest (especially for watch mode)
3. ❌ Requires babel/ts-jest for TypeScript
4. ❌ ES modules support requires experimental flag
5. ❌ More configuration needed

**When to Use Jest:**
- Only if Vitest has breaking issues
- If team strongly prefers Jest

**Setup Effort:** MEDIUM (need to migrate existing tests + configure)

**Recommendation Confidence:** LOW (use Vitest instead)

---

### Option C: Node Test Runner

**Description:**
Built-in test runner in Node 20+, zero dependencies.

**Why NOT Node Test Runner:**
1. ❌ Existing tests use Vitest API (need full rewrite)
2. ❌ No built-in React component testing
3. ❌ No built-in mocking (`vi.fn()` equivalent)
4. ❌ No built-in coverage
5. ❌ Less mature than Vitest/Jest

**When to Use:**
- Minimalist projects with no UI testing
- Backend-only services

**Setup Effort:** HIGH (rewrite all existing tests)

**Recommendation Confidence:** VERY LOW (not suitable for this project)

---

### FINAL RECOMMENDATION: Vitest

**Key Reasons:**
1. ✅ Tests already written in Vitest syntax
2. ✅ Just install and run (no migration)
3. ✅ Fast, modern, great DX
4. ✅ Perfect for React + Next.js
5. ✅ Built-in coverage, UI, watch mode

**Builder-5 Task:** Install Vitest, configure, and run existing tests (1 hour) + Add new tests (3-5 hours)

---

## Section 4: Test Coverage Plan

### Priority 1: MUST HAVE (Critical Path)

#### Test 1: Claude API Client - `generateAgentResponse()`

**File:** `src/lib/claude/client.ts`

**Why Critical:** Core AI interaction - if this fails, entire game breaks

**Test Cases:**
```typescript
// src/lib/claude/__tests__/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAgentResponse, calculateCost } from '../client';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk');

describe('Claude Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAgentResponse', () => {
    it('should return AI response for valid context', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'I think Alice is suspicious' }],
        usage: { input_tokens: 100, output_tokens: 20 },
      });
      
      Anthropic.prototype.messages.create = mockCreate;

      const context = {
        role: 'VILLAGER',
        personality: 'analytical',
        messages: [],
        systemPrompt: 'You are a villager',
      };

      const response = await generateAgentResponse(context);

      expect(response).toBe('I think Alice is suspicious');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 200,
        })
      );
    });

    it('should retry on API failure', async () => {
      const mockCreate = vi.fn()
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success on retry' }],
          usage: { input_tokens: 100, output_tokens: 20 },
        });

      Anthropic.prototype.messages.create = mockCreate;

      const response = await generateAgentResponse(mockContext);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response).toBe('Success on retry');
    });

    it('should return fallback after max retries', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('API Down'));
      Anthropic.prototype.messages.create = mockCreate;

      const response = await generateAgentResponse(mockContext);

      expect(mockCreate).toHaveBeenCalledTimes(3); // MAX_RETRIES
      expect(response).toContain('carefully observes'); // fallback phrase
    });

    it('should timeout after 10 seconds', async () => {
      const mockCreate = vi.fn().mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 15000)) // 15s delay
      );

      Anthropic.prototype.messages.create = mockCreate;

      const start = Date.now();
      const response = await generateAgentResponse(mockContext);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(11000); // ~10s timeout
      expect(response).toContain('carefully observes'); // fallback
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly with cache hit', () => {
      const usage = {
        input_tokens: 1000,
        output_tokens: 200,
        cache_read_input_tokens: 500,
        cache_creation_input_tokens: 0,
      };

      const cost = calculateCost(usage);

      // input: 1000/1M * $3 = $0.003
      // cache_read: 500/1M * $0.3 = $0.00015
      // output: 200/1M * $15 = $0.003
      // Total: $0.00615
      expect(cost).toBeCloseTo(0.00615, 5);
    });

    it('should calculate cache creation cost', () => {
      const usage = {
        input_tokens: 1000,
        output_tokens: 200,
        cache_creation_input_tokens: 1000,
        cache_read_input_tokens: 0,
      };

      const cost = calculateCost(usage);

      // cache_creation: 1000/1M * $3.75 = $0.00375
      expect(cost).toBeGreaterThan(0.006); // cache creation adds 25% markup
    });
  });
});
```

**Estimated Effort:** 2 hours

---

#### Test 2: Game Orchestrator Integration Test

**File:** `src/lib/game/master-orchestrator.ts`

**Why Critical:** Orchestrates entire game flow - phase transitions, timing, state

**Test Cases:**
```typescript
// src/lib/game/__tests__/master-orchestrator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createGame, startGame, getGameState } from '../master-orchestrator';
import * as claudeClient from '../../claude/client';

// Mock Claude API
vi.mock('../../claude/client');

describe('Game Orchestrator Integration', () => {
  it('should create game and transition through phases', async () => {
    // Mock AI responses
    vi.mocked(claudeClient.generateAgentResponse).mockResolvedValue(
      'This is a test message'
    );

    // Create game
    const game = await createGame({ playerCount: 6 });
    expect(game.status).toBe('LOBBY');
    expect(game.players).toHaveLength(6);

    // Start game
    await startGame(game.id);

    // Verify NIGHT phase started
    const nightState = await getGameState(game.id);
    expect(nightState.currentPhase).toBe('NIGHT');

    // Wait for phase transition (or trigger manually for testing)
    await waitForPhase(game.id, 'DAY', 60000); // 60s timeout

    // Verify DAY phase
    const dayState = await getGameState(game.id);
    expect(dayState.currentPhase).toBe('DAY');
  });

  it('should generate messages during DISCUSSION', async () => {
    // Setup game in DISCUSSION phase
    const game = await setupGameInPhase('DISCUSSION');

    // Verify messages being generated
    const messages = await pollMessages(game.id, 5000); // 5s

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].message).toBeTruthy();
  });

  it('should complete full game with winner', async () => {
    // Mock API to return strategic responses
    vi.mocked(claudeClient.generateAgentResponse).mockImplementation(
      (context) => Promise.resolve(`I vote for Player-${Math.floor(Math.random() * 10)}`)
    );

    const game = await createGame({ playerCount: 10 });
    await startGame(game.id);

    // Wait for game to complete (max 10 minutes)
    const finalState = await waitForGameEnd(game.id, 600000);

    expect(finalState.status).toBe('GAME_OVER');
    expect(finalState.winner).toMatch(/MAFIA|VILLAGERS/);
    expect(finalState.currentPhase).toBeNull();
  }, 600000); // 10 minute timeout for full game
});
```

**Estimated Effort:** 3 hours

---

#### Test 3: Cost Tracker - Circuit Breaker

**File:** (Assuming `src/lib/claude/cost-tracker.ts` exists per vision doc)

**Why Critical:** Prevents runaway costs - if broken, could spend $100s by accident

**Test Cases:**
```typescript
describe('Cost Tracker', () => {
  it('should allow calls below budget', () => {
    const tracker = new CostTracker({ maxBudget: 5.0 });
    
    expect(tracker.canMakeCall(0.10)).toBe(true);
    tracker.recordCall(0.10);
    expect(tracker.getTotalCost()).toBe(0.10);
  });

  it('should block calls exceeding budget', () => {
    const tracker = new CostTracker({ maxBudget: 1.0 });
    tracker.recordCall(0.95);

    expect(tracker.canMakeCall(0.10)).toBe(false);
    expect(() => tracker.recordCall(0.10)).toThrow('Budget exceeded');
  });

  it('should track cache hit rate', () => {
    const tracker = new CostTracker({ maxBudget: 10.0 });
    
    tracker.recordCall(0.10, { cacheHit: true });
    tracker.recordCall(0.20, { cacheHit: false });
    tracker.recordCall(0.15, { cacheHit: true });

    const stats = tracker.getStats();
    expect(stats.cacheHitRate).toBeCloseTo(0.67, 2); // 2/3
  });
});
```

**Estimated Effort:** 1 hour

---

**Priority 1 Total Effort:** 6 hours

---

### Priority 2: SHOULD HAVE (Important but Not Blocking)

#### Test 4: Repetition Tracker

**File:** (Assuming `src/lib/discussion/repetition-tracker.ts` per vision doc)

**Why Important:** Prevents AI from repeating same phrases (quality issue)

**Test Cases:**
```typescript
describe('Repetition Tracker', () => {
  it('should detect repeated phrases', () => {
    const tracker = new RepetitionTracker();
    
    tracker.addMessage('I think Alice is Mafia');
    tracker.addMessage('I think Bob is Mafia');
    tracker.addMessage('I think Alice is Mafia'); // Repeat

    const repeated = tracker.getRepeatedPhrases();
    expect(repeated).toContain('I think * is Mafia');
  });

  it('should allow similar but not identical phrases', () => {
    const tracker = new RepetitionTracker();
    
    tracker.addMessage('Alice seems suspicious');
    tracker.addMessage('Alice looks suspicious');

    expect(tracker.isRepetitive('Alice appears suspicious')).toBe(false);
  });
});
```

**Estimated Effort:** 1 hour

---

#### Test 5: Message Classification

**File:** (Assuming `src/lib/discussion/message-classification.ts`)

**Why Important:** Detects accusations, defenses, agreements for game logic

**Test Cases:**
```typescript
describe('Message Classification', () => {
  it('should classify accusations', () => {
    expect(classifyMessage('I think Alice is Mafia')).toBe('ACCUSATION');
    expect(classifyMessage('I suspect Bob')).toBe('ACCUSATION');
  });

  it('should classify defenses', () => {
    expect(classifyMessage('I am innocent!')).toBe('DEFENSE');
    expect(classifyMessage('That accusation is false')).toBe('DEFENSE');
  });

  it('should classify neutral statements', () => {
    expect(classifyMessage('Let us analyze the evidence')).toBe('NEUTRAL');
  });
});
```

**Estimated Effort:** 1 hour

---

#### Test 6: Full Game with Mocks

**Why Important:** End-to-end validation without API costs

**Test Cases:**
```typescript
describe('Full Game E2E', () => {
  it('should complete game with all phases', async () => {
    // Mock all API calls
    setupMockedAPI();

    const game = await createGame({ playerCount: 10 });
    const result = await runGameToCompletion(game.id);

    expect(result.phases).toEqual([
      'LOBBY', 'NIGHT', 'DAY', 'DISCUSSION', 'VOTING', 'GAME_OVER'
    ]);
    expect(result.messages).toBeGreaterThan(40);
    expect(result.votes).toBeGreaterThan(6);
  });
});
```

**Estimated Effort:** 2 hours

---

**Priority 2 Total Effort:** 5 hours

---

### Priority 3: NICE TO HAVE (Future Iteration)

#### Test 7: E2E Browser Tests (Playwright)

**Why Defer:** Requires Playwright MCP setup, more complex

**Scope:**
- Full browser automation
- Create game → Start → Watch phases
- Validate UI updates
- Test SSE real-time updates

**Estimated Effort:** 4-6 hours (defer to Iteration 5)

---

#### Test 8: Performance Tests

**Scope:**
- Memory leak detection
- Cost optimization validation
- Load testing (multiple concurrent games)

**Estimated Effort:** 3-4 hours (defer to Iteration 5)

---

### Test Coverage Summary

| Priority | Tests | Effort | Coverage Target |
|----------|-------|--------|-----------------|
| P1 (Must Have) | 3 tests | 6 hours | >70% critical paths |
| P2 (Should Have) | 3 tests | 5 hours | >60% overall |
| P3 (Nice to Have) | 2 tests | 7-10 hours | >80% with E2E |

**Iteration 4 Target:** P1 + P2 = 11 hours, >60% coverage

---

## Section 5: Mocking Strategy

### Claude API Mocking

**Recommended Approach:** Mock at SDK level using Vitest mocks

**Why This Approach:**
- ✅ Fast tests (no network)
- ✅ Deterministic (no API flakiness)
- ✅ No API costs
- ✅ Test error scenarios (rate limits, timeouts)

**Implementation:**

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
      },
    });
  });

  vi.spyOn(Anthropic.prototype, 'messages').mockReturnValue({
    create: mockCreate,
  } as any);

  return mockCreate;
}

export function mockClaudeError(error: Error) {
  vi.spyOn(Anthropic.prototype, 'messages').mockReturnValue({
    create: vi.fn().mockRejectedValue(error),
  } as any);
}

export function mockClaudeTimeout() {
  vi.spyOn(Anthropic.prototype, 'messages').mockReturnValue({
    create: vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 15000))
    ),
  } as any);
}
```

**Usage:**
```typescript
import { mockClaudeAPI } from './__tests__/mocks';

it('should handle API responses', async () => {
  mockClaudeAPI(['Response 1', 'Response 2']);
  
  const result = await generateAgentResponse(context);
  expect(result).toBe('Response 1');
});
```

---

### Database Mocking

**Recommended Approach:** Use in-memory SQLite for tests (Prisma supports this)

**Why:**
- ✅ Fast (no PostgreSQL needed)
- ✅ Isolated (each test gets fresh DB)
- ✅ Same Prisma schema works

**Implementation:**

```typescript
// vitest.setup.ts
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';

export let prismaMock: DeepMockProxy<PrismaClient>;

beforeEach(() => {
  prismaMock = mockDeep<PrismaClient>();
  mockReset(prismaMock);
});

// Usage in tests
it('should fetch game', async () => {
  prismaMock.game.findUnique.mockResolvedValue({
    id: 'test-game',
    status: 'LOBBY',
    // ...
  });

  const game = await getGame('test-game');
  expect(game.status).toBe('LOBBY');
});
```

**Alternative:** Test against actual PostgreSQL (slower but more realistic)

---

### SSE (Server-Sent Events) Mocking

**Recommended Approach:** Mock EventSource in tests

**Implementation:**

```typescript
// components/__tests__/mocks/sse.ts
export class MockEventSource {
  url: string;
  listeners: Map<string, Function[]> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  // Test helper: trigger event
  emit(event: string, data: any) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((handler) => handler({ data: JSON.stringify(data) }));
  }

  close() {}
}

global.EventSource = MockEventSource as any;
```

**Usage:**
```typescript
it('should update on SSE message', async () => {
  render(<DiscussionFeed gameId="test" />);

  // Simulate SSE message
  const eventSource = getLastEventSource(); // Helper to get mock instance
  eventSource.emit('message', {
    type: 'message',
    payload: { message: 'New message' },
  });

  await waitFor(() => {
    expect(screen.getByText('New message')).toBeDefined();
  });
});
```

---

## Section 6: Builder Task Breakdown

### Builder-3: Supabase Local Setup

**Objective:** Migrate development environment from SQLite to PostgreSQL via Supabase Local

**Prerequisites:**
- ✅ Docker installed and running
- ✅ Supabase CLI installed (v2.48.3)
- ✅ Port 5432 available

**Subtasks:**

1. **Initialize Supabase Project** (30 min)
   - Run `supabase init` in app directory
   - Review generated `supabase/config.toml`
   - Start services: `supabase start`
   - Verify Studio accessible: `http://localhost:54323`

2. **Export SQLite Data** (1 hour)
   - Create `scripts/export-sqlite-data.ts`
   - Export all 7 models: Game, Player, DiscussionMessage, etc.
   - Handle relations (gameId foreign keys)
   - Save to `data-backup.json`
   - Verify export: 8 games, 76 players, 41 messages

3. **Update Prisma Schema** (15 min)
   - Change `provider = "sqlite"` to `provider = "postgresql"`
   - Update `DATABASE_URL` in `.env` to Supabase local URL
   - Delete old migrations: `rm -rf prisma/migrations`

4. **Generate PostgreSQL Migrations** (30 min)
   - Run `npx prisma migrate dev --name init`
   - Verify migrations created without PRAGMA statements
   - Check schema in Supabase Studio

5. **Import Data** (1 hour)
   - Create `scripts/import-data.ts`
   - Import in correct order (respect foreign keys)
   - Verify data: `npx prisma studio`

6. **Test Full Game Flow** (30 min)
   - Run `npm run dev`
   - Create new game with 10 players
   - Start game and verify NIGHT phase
   - Check messages being saved to PostgreSQL

7. **Document Setup** (30 min)
   - Create `docs/supabase-local-setup.md`
   - Include: Installation, connection URL, common issues
   - Add to main README.md

**Dependencies:**
- None (can run in parallel with other builders)

**Estimated Total:** 4 hours

**Risk:** LOW
- Mitigation: Keep SQLite backup, can rollback if issues
- Fallback: Start with fresh PostgreSQL (lose test data)

**Validation Criteria:**
- [ ] `supabase status` shows all services running
- [ ] Prisma Studio connects to PostgreSQL
- [ ] 8 games migrated successfully
- [ ] New game can be created and played
- [ ] No SQLite references in code

---

### Builder-5: Test Infrastructure

**Objective:** Set up Vitest framework and create critical path tests

**Prerequisites:**
- ✅ Node 20.19.5 installed
- ⏳ Builder-2 completes runtime fixes (so there's working code to test)

**Subtasks:**

1. **Install Vitest Dependencies** (15 min)
   ```bash
   npm install -D vitest @vitest/ui @testing-library/react @testing-library/dom happy-dom @testing-library/jest-dom vitest-mock-extended
   ```

2. **Configure Vitest** (30 min)
   - Create `vitest.config.ts` with React plugin, path aliases
   - Create `vitest.setup.ts` for test utilities
   - Add test scripts to `package.json`
   - Verify existing tests run: `npm test`

3. **Test: Claude API Client** (2 hours)
   - File: `src/lib/claude/__tests__/client.test.ts`
   - Mock Anthropic SDK
   - Test: Success response, retries, timeout, fallback, cost calculation
   - Coverage target: >80% of `client.ts`

4. **Test: Game Orchestrator Integration** (3 hours)
   - File: `src/lib/game/__tests__/master-orchestrator.test.ts`
   - Mock Claude API
   - Test: Create game → Start → Phase transitions
   - Test: Full game completion with winner
   - Timeout: 10 minutes for full game test

5. **Test: Cost Tracker** (1 hour)
   - File: `src/lib/claude/__tests__/cost-tracker.test.ts`
   - Test: Budget limits, circuit breaker, cache hit tracking
   - Coverage target: 100% (critical for cost safety)

6. **Run Coverage Report** (15 min)
   ```bash
   npm run test:coverage
   ```
   - Verify >60% coverage overall
   - Verify >80% on critical paths (claude/, game/)

7. **Document Testing** (30 min)
   - Create `docs/testing-guide.md`
   - Include: Running tests, writing new tests, mocking patterns
   - Add CI/CD recommendations (GitHub Actions)

**Dependencies:**
- Builder-2: Need working runtime to test (can start in parallel but may need adjustments)

**Estimated Total:** 7 hours

**Risk:** MEDIUM
- Risk: Builder-2 changes break tests (need re-testing)
- Mitigation: Start with isolated unit tests, save integration tests for later

**Validation Criteria:**
- [ ] `npm test` runs all tests and passes
- [ ] Coverage report shows >60% overall
- [ ] Claude API mocking works correctly
- [ ] Integration test completes full game
- [ ] Tests run in <60 seconds (excluding full game E2E)

---

## Section 7: Recommendations for Planner

### 1. Prioritize Supabase Local Setup Early

**Rationale:** Database consistency is foundational. Builder-3 should start immediately and complete before integration phase.

**Impact:** Prevents schema drift issues during Builder-2 runtime fixes.

**Action:** Schedule Builder-3 in Phase 1 (parallel to Builder-1 SDK research).

---

### 2. Split Test Infrastructure into Two Phases

**Recommendation:**

**Phase 1: Setup + Unit Tests** (Builder-5a, 4 hours)
- Install Vitest
- Configure framework
- Write unit tests (Claude client, cost tracker)

**Phase 2: Integration Tests** (Builder-5b, 3 hours)
- Depends on Builder-2 completion
- Full game orchestration tests
- E2E with mocked API

**Rationale:** Unit tests can start immediately. Integration tests need working runtime from Builder-2.

**Action:** Create Builder-5a and Builder-5b subtasks.

---

### 3. Consider Migration Data Loss Acceptable

**Alternative Strategy:** Skip data export/import, start fresh PostgreSQL

**Pros:**
- ✅ Saves 1.5 hours (no export/import scripts)
- ✅ Cleaner migration (no data compatibility issues)
- ✅ Simpler for Builder-3

**Cons:**
- ❌ Lose 8 games of test data
- ❌ Can't validate data migration process

**Recommendation:** If timeline is tight, start fresh. Otherwise, migrate data.

**Action:** Let Builder-3 decide based on migration complexity during execution.

---

### 4. MCP Tools Not Needed for This Iteration

**Assessment:**

**Playwright MCP:** Not needed
- Reason: E2E browser tests deferred to Priority 3
- Alternative: Use integration tests with mocked API

**Chrome DevTools MCP:** Not needed
- Reason: Performance testing deferred to Iteration 5
- Alternative: Use `console.time()` and Pino logs for profiling

**Supabase Local MCP:** Not needed
- Reason: Supabase CLI via Bash is sufficient
- Alternative: Direct `psql` commands if needed

**Action:** Do not spawn MCP-based explorers. Use direct tooling.

---

### 5. Testing Framework Decision is Final

**Strong Recommendation:** Use Vitest

**Rationale:**
1. Tests already written in Vitest syntax
2. Zero migration effort
3. Best DX and performance
4. Industry momentum (Vite ecosystem)

**Risk of Changing:** 2-3 hours to rewrite existing tests + lower developer satisfaction

**Action:** Lock in Vitest. Do not reconsider Jest unless critical blocker discovered.

---

### 6. Document Migration Rollback Plan

**Risk:** PostgreSQL migration fails or causes issues

**Rollback Plan:**
1. Stop Supabase: `supabase stop`
2. Revert `prisma/schema.prisma` to `provider = "sqlite"`
3. Restore `.env` to `DATABASE_URL="file:./dev.db"`
4. Run `npm run dev` (SQLite still intact)

**Action:** Builder-3 should create rollback script: `scripts/rollback-to-sqlite.sh`

---

### 7. Cost Tracker Must Be Tested First

**Critical Priority:** Builder-5 should test cost tracker BEFORE full game tests

**Rationale:** Full game tests make API calls (even if mocked). If cost tracker broken, could waste money on accidental real API calls.

**Action:** Enforce test order:
1. Cost tracker unit tests (with mocks)
2. Claude client unit tests (with mocks)
3. Integration tests (with mocked API)

---

## Section 8: Resource Map

### Critical Files for Testing

**High Priority (Must Test):**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/claude/client.ts` - Claude API integration
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/game/master-orchestrator.ts` - Game flow
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/discussion/orchestrator.ts` - Discussion logic

**Medium Priority:**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/discussion/threading.ts` - Already has tests
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/game/phase-config.ts` - Already has tests

**Low Priority (Defer):**
- UI components (already have some tests)
- Utility functions (low risk)

### Database Files

**Schema:**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/prisma/schema.prisma` - 7 models, SQLite provider

**Current Database:**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/prisma/dev.db` - 164KB, 8 games

**Migrations:**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/prisma/migrations/20251012180206_init/` - Initial schema
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/prisma/migrations/20251012212038_iteration_2_phases/` - Phase updates

### Existing Tests

**Component Tests (Need Vitest):**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/components/__tests__/DiscussionFeed.test.tsx` - 300 lines
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/components/__tests__/VoteTally.test.tsx`

**Utility Tests (Need Vitest):**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/lib/game/__tests__/phase-config.test.ts` - 83 lines

**Console Tests (Need Migration):**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/discussion/threading.test.ts` - 155 lines
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/discussion/turn-scheduler.test.ts`

### Key Dependencies

**Must Install for Testing:**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/dom": "^9.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "happy-dom": "^12.0.0",
    "vitest-mock-extended": "^1.3.0"
  }
}
```

**Already Installed:**
- `@anthropic-ai/sdk` - Need to mock
- `@prisma/client` - Can use real or mock
- `next` - Vitest has Next.js plugin

### Testing Infrastructure Needed

**Config Files to Create:**
1. `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/vitest.config.ts` - Main config
2. `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/vitest.setup.ts` - Test setup
3. `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/claude/__tests__/mocks.ts` - Claude mocks

**Documentation to Create:**
1. `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/docs/supabase-local-setup.md`
2. `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/docs/testing-guide.md`

---

## Section 9: Questions for Planner

### Q1: Should we migrate SQLite data or start fresh?

**Option A:** Migrate data (recommended)
- Pros: Keep 8 games of test data, validate migration process
- Cons: +1.5 hours effort, potential bugs in export/import

**Option B:** Start fresh
- Pros: Simpler, faster (-1.5 hours)
- Cons: Lose test data

**Recommendation:** Migrate data. 8 games of test data valuable for validating Builder-2 fixes.

---

### Q2: Split Builder-5 into two subtasks?

**Proposal:**
- Builder-5a: Setup Vitest + Unit Tests (4 hours, no dependencies)
- Builder-5b: Integration Tests (3 hours, depends on Builder-2)

**Rationale:** Allow unit testing to start immediately while Builder-2 fixes runtime.

**Recommendation:** Split. Better parallelization and risk management.

---

### Q3: Should Builder-3 create rollback script?

**Context:** If PostgreSQL migration fails, need quick rollback to SQLite

**Options:**
- Yes: Add `scripts/rollback-to-sqlite.sh` (+30 min)
- No: Manual rollback if needed (risk of downtime)

**Recommendation:** Yes. 30 minutes well spent for safety net.

---

### Q4: Priority of console test migration?

**Context:** Two console-based tests exist (`threading.test.ts`, `turn-scheduler.test.ts`)

**Options:**
- High: Migrate to Vitest in Builder-5 (add 1 hour)
- Low: Keep as-is, migrate later
- Skip: Delete and rewrite if needed

**Recommendation:** Low priority. Keep as-is. They work with `tsx` and provide value. Migrate in Iteration 5.

---

### Q5: Should we test with real API key?

**Context:** Vision doc mentions "never ran with real Claude API"

**Testing Strategy:**
- Unit tests: Always use mocks (fast, free)
- Integration tests: Use mocks (deterministic)
- Validation tests: Use real API (costly, final check)

**Recommendation:** 
- Builder-5 uses mocks only
- Validator (separate step) tests with real API
- Budget $1-2 for validation tests

---

## Section 10: Risk Assessment & Mitigation

### Risk 1: Supabase Local Docker Issues

**Likelihood:** LOW (Docker already installed and running)

**Impact:** MEDIUM (blocks PostgreSQL migration)

**Symptoms:**
- Docker daemon not running
- Port 5432 already in use
- Insufficient memory for PostgreSQL container

**Mitigation:**
```bash
# Check Docker
docker info

# Check port
lsof -i :5432

# Free up memory if needed
docker system prune
```

**Fallback:** Use plain Docker PostgreSQL (Option B) or keep SQLite (Option C - not recommended)

---

### Risk 2: Data Migration Bugs

**Likelihood:** MEDIUM (relation handling can be tricky)

**Impact:** LOW (can start fresh if needed)

**Symptoms:**
- Foreign key violations during import
- Missing data after migration
- Timestamp format issues

**Mitigation:**
- Test export script with one game first
- Verify data in Supabase Studio before deleting SQLite
- Keep SQLite backup until validation complete

**Fallback:** Start fresh PostgreSQL (acceptable for development)

---

### Risk 3: Vitest Config Issues with Next.js

**Likelihood:** LOW (Vitest has official Next.js support)

**Impact:** MEDIUM (delays test setup)

**Symptoms:**
- Path alias (@/) not resolving
- React components fail to render in tests
- ES modules import errors

**Mitigation:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './components'),
    },
  },
});
```

**Fallback:** Use Jest if Vitest has breaking issues (requires test rewrites)

---

### Risk 4: Builder-2 Changes Break Tests

**Likelihood:** MEDIUM (runtime fixes may change interfaces)

**Impact:** MEDIUM (tests need updates)

**Symptoms:**
- Integration tests fail after Builder-2 merge
- Function signatures changed
- Expected behavior differs

**Mitigation:**
- Builder-5a writes unit tests first (less likely to break)
- Builder-5b coordinates with Builder-2 on interfaces
- Use loose mocks where possible

**Fallback:** Update tests after Builder-2 completes (add 1-2 hours)

---

### Risk 5: PostgreSQL Migrations Fail Validation

**Likelihood:** LOW (Prisma handles schema conversion)

**Impact:** HIGH (blocks production deployment)

**Symptoms:**
- `npx prisma validate` fails
- Migrations don't apply to Railway PostgreSQL
- Schema mismatch errors

**Mitigation:**
- Test migrations locally before pushing
- Compare schemas: `pg_dump` local vs Railway
- Validate with `npx prisma migrate resolve`

**Fallback:** Manual schema fixes or regenerate migrations

---

## Section 11: Success Criteria Checklist

### Supabase Local Setup (Builder-3)

- [ ] `supabase status` shows all services healthy
- [ ] Prisma Studio connects to `postgresql://localhost:54322`
- [ ] 8 games migrated (or fresh start documented)
- [ ] `npx prisma validate` passes
- [ ] `npx prisma migrate dev` runs without errors
- [ ] Full game test completes with PostgreSQL
- [ ] Documentation created: `docs/supabase-local-setup.md`
- [ ] Rollback script created: `scripts/rollback-to-sqlite.sh`

### Test Infrastructure (Builder-5)

- [ ] Vitest installed and configured
- [ ] `npm test` runs all tests
- [ ] Existing tests migrated and passing (DiscussionFeed, phase-config)
- [ ] New test: `claude/client.test.ts` with >80% coverage
- [ ] New test: `cost-tracker.test.ts` with 100% coverage
- [ ] New test: `master-orchestrator.test.ts` integration
- [ ] Coverage report shows >60% overall
- [ ] Tests run in <60s (excluding full game E2E)
- [ ] Documentation created: `docs/testing-guide.md`

### Integration Validation

- [ ] Builder-3 + Builder-5 merged without conflicts
- [ ] All tests pass after integration
- [ ] Full game works with PostgreSQL + real API key
- [ ] Cost tracking accurate (validate against Anthropic dashboard)
- [ ] No schema drift warnings

---

## Appendices

### Appendix A: Supabase Local URL Format

**Default Supabase Local Connection:**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

**Components:**
- User: `postgres`
- Password: `postgres`
- Host: `localhost`
- Port: `54322` (NOT 5432 - Supabase uses different port)
- Database: `postgres`

**Verify Connection:**
```bash
supabase status | grep DB
# Output: DB URL: postgresql://postgres:postgres@localhost:54322/postgres
```

---

### Appendix B: Vitest vs Jest API Differences

**Mostly Compatible, but key differences:**

| Feature | Jest | Vitest |
|---------|------|--------|
| Mock function | `jest.fn()` | `vi.fn()` |
| Mock module | `jest.mock()` | `vi.mock()` |
| Spy | `jest.spyOn()` | `vi.spyOn()` |
| Timers | `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| Globals | Auto (describe, it) | Auto (if `globals: true`) |

**Migration Example:**
```typescript
// Jest
jest.mock('./client');
const mockFn = jest.fn();

// Vitest
vi.mock('./client');
const mockFn = vi.fn();
```

**Existing tests already use Vitest API!** No migration needed.

---

### Appendix C: PostgreSQL vs SQLite Data Type Mapping

| Prisma Type | SQLite | PostgreSQL |
|------------|--------|-----------|
| `String` | TEXT | TEXT or VARCHAR |
| `Int` | INTEGER | INTEGER |
| `Boolean` | INTEGER (0/1) | BOOLEAN |
| `DateTime` | TEXT (ISO8601) | TIMESTAMP |
| `Json` | TEXT | JSONB |
| `@id @default(cuid())` | TEXT | TEXT |

**Key Differences:**
- DateTime: SQLite stores as TEXT/INTEGER, PostgreSQL as TIMESTAMP
- Boolean: SQLite uses INTEGER, PostgreSQL has native BOOLEAN
- JSON: PostgreSQL has native JSONB (faster queries)

**Prisma handles conversion automatically.** No manual schema changes needed.

---

### Appendix D: Estimated Timeline

**Sequential Path (worst case):**
```
Builder-3 (Supabase): 4 hours
  ↓
Builder-5a (Vitest setup): 2 hours
  ↓
Builder-2 (Runtime fixes): 6 hours
  ↓
Builder-5b (Integration tests): 3 hours
  ↓
Validation: 2 hours
───────────────────────
Total: 17 hours (2 days)
```

**Parallel Path (best case):**
```
Day 1:
  Builder-3 (Supabase): 4 hours
  Builder-5a (Vitest + unit tests): 4 hours
  
Day 2:
  Builder-2 (Runtime fixes): 6 hours
  
Day 3:
  Builder-5b (Integration tests): 3 hours
  Validation: 2 hours
───────────────────────
Total: 19 hours (3 days) but better parallelization
```

**Recommendation:** Parallel path with overlap.

---

## Final Recommendations Summary

### Top 5 Recommendations for Planner

1. **Use Supabase Local (Option A)** - Prerequisites met, best long-term solution
2. **Use Vitest** - Tests already written, zero migration effort
3. **Split Builder-5** - Unit tests (5a) can start immediately, integration tests (5b) wait for Builder-2
4. **Migrate SQLite data** - 8 games of test data valuable for validation
5. **Create rollback script** - Safety net for database migration

### Builder Task Summary

**Builder-3: Supabase Local Setup**
- Effort: 4 hours
- Risk: LOW
- Dependencies: None
- Validation: Full game with PostgreSQL

**Builder-5a: Test Infrastructure Setup**
- Effort: 4 hours
- Risk: LOW
- Dependencies: None
- Validation: Existing tests pass

**Builder-5b: Integration Tests**
- Effort: 3 hours
- Risk: MEDIUM
- Dependencies: Builder-2
- Validation: Full game test passes

### Success Metrics

**Database Migration:**
- ✅ PostgreSQL running locally
- ✅ Schema validated
- ✅ Data migrated (or fresh start documented)
- ✅ Full game works

**Test Infrastructure:**
- ✅ Vitest installed and configured
- ✅ >60% code coverage overall
- ✅ >80% coverage on critical paths
- ✅ All tests pass in <60 seconds

---

**Explorer-3 Report Status:** COMPLETE  
**Confidence Level:** HIGH  
**Ready for Planning:** YES

---
