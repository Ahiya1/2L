# Explorer 2 Report: Logging System & Dependencies Analysis

## Executive Summary

The Pino logging system with pino-pretty transport is causing worker thread crashes that break SSE connections, making the frontend unusable. **Root cause:** Pino v10 uses `thread-stream` which spawns worker threads for logging transports, and these threads exit unexpectedly under high logging volume. **Recommended fix:** Remove pino-pretty transport and use basic Pino JSON output (5-minute fix), which eliminates worker threads entirely while preserving all 97 structured logging calls across 10 files. This is the safest approach that won't break Iteration 4's backend code.

**Key findings:**
- 10 files import logger utilities (orchestrator, discussion, claude, etc.)
- 97 total logger method calls across codebase (info, error, warn, debug)
- Pino v10.0.0 uses thread-stream v3.1.0 for transport worker threads
- pino-pretty v13.1.2 relies on sonic-boom v4.2.0 for async output
- 47 backend tests currently passing - MUST preserve
- Zero frontend tests exist (E2E testing infrastructure missing)

---

## Discoveries

### Current Logging Implementation

**File:** `src/lib/logger.ts` (28 lines)

**Configuration Analysis:**
```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',           // ← PROBLEM: Spawns worker thread
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
});
```

**Child Loggers Exported (8 total):**
1. `discussionLogger` - Discussion phase orchestration
2. `gameLogger` - Game state management
3. `claudeLogger` - Claude API interactions
4. `orchestratorLogger` - Master orchestrator (13 calls in master-orchestrator.ts)
5. `dbLogger` - Database operations
6. `agentLogger` - Agent behavior
7. `votingLogger` - Voting phase
8. `nightLogger` - Night phase

**Dependency Chain:**
```
Pino v10.0.0
  ├── thread-stream v3.1.0 ← Worker thread manager
  └── sonic-boom v4.2.0    ← Async file writer

pino-pretty v13.1.2
  ├── colorette v2.0.7     ← Terminal coloring
  ├── dateformat v4.6.3    ← Timestamp formatting
  ├── fast-copy v3.0.2     ← Object cloning
  └── sonic-boom v4.2.0    ← Shared with Pino
```

### Root Cause: Worker Thread Crashes

**Technical Deep Dive:**

**What is pino-pretty?**
- Pretty-printing transport for Pino logs
- Converts JSON logs to human-readable colorized output
- Examples:
  ```
  # Without pino-pretty (JSON):
  {"level":"info","time":1697200000000,"module":"orchestrator","msg":"Starting NIGHT phase"}
  
  # With pino-pretty (pretty):
  [14:30:00] INFO (orchestrator): Starting NIGHT phase
  ```

**Why does it cause crashes?**

Pino v9+ introduced **transport workers** to avoid blocking the main thread:

1. **Main thread** (game orchestrator):
   - Calls `orchestratorLogger.info({gameId, phase: 'NIGHT'}, 'Starting NIGHT phase')`
   - Serializes log object to JSON
   - Sends to worker thread via IPC (inter-process communication)

2. **Worker thread** (pino-pretty):
   - Receives JSON log payload
   - Formats with colorette, dateformat
   - Writes to stdout via sonic-boom
   - **IF worker crashes:** Main thread loses logging, SSE connections break

**Crash Triggers (Observed in AI Mafia):**
- **High volume logging:** Discussion phase generates 40+ messages over 5 minutes
- **Rapid event emission:** 13 orchestrator log calls per round × multiple rounds
- **SSE keepalive:** 15-second heartbeat + phase change events
- **Worker thread exits:** "worker has exited" error → server instability → SSE drops

**Evidence from Vision Document:**
```
- "Pino logging crashes - Worker thread exits causing server instability and broken SSE connections"
- Acceptance criteria: "No 'worker has exited' errors in logs"
- Impact: "SSE completely broken - No real-time updates, phases only change on manual refresh"
```

### Logger Usage Patterns Across Codebase

**10 files import logger:**
1. `src/lib/game/master-orchestrator.ts` - 13 calls (orchestratorLogger)
2. `src/lib/discussion/orchestrator.ts` - 17 calls (orchestratorLogger, discussionLogger)
3. `src/lib/discussion/turn-executor.ts` - 5 calls (discussionLogger)
4. `src/lib/game/night-phase.ts` - 17 calls (nightLogger)
5. `src/lib/game/voting-phase.ts` - 12 calls (votingLogger)
6. `src/lib/game/day-announcement.ts` - 10 calls (orchestratorLogger)
7. `src/lib/game/role-assignment.ts` - 3 calls (gameLogger)
8. `src/lib/game/win-conditions.ts` - 5 calls (gameLogger)
9. `src/lib/claude/client.ts` - 6 calls (claudeLogger)
10. `src/utils/cost-tracker.ts` - 9 calls (logger)

**Total: 97 structured logging calls**

**Sample Usage Patterns:**

**Pattern 1: Structured Context Logging**
```typescript
orchestratorLogger.info({ gameId, roundNumber, phase: 'NIGHT' }, 'Starting NIGHT phase');
```
- **Context object:** `{gameId, roundNumber, phase}`
- **Message:** `'Starting NIGHT phase'`
- **Benefit:** Queryable JSON logs (can filter by gameId, roundNumber, phase)

**Pattern 2: Error Logging with Stack Traces**
```typescript
orchestratorLogger.error({ gameId, error: error.message }, 'Failed to run Night phase');
```

**Pattern 3: Cost Tracking Summary**
```typescript
logger.info(`Total cost: $${summary.totalCost.toFixed(4)}`);
logger.info(`Cache hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`);
```

**Critical Observation:**
- Iteration 4 **explicitly removed all console.log statements** (12 replacements)
- Replaced with structured Pino logging for better observability
- **Cannot revert to console.log without breaking Iteration 4 success criteria**
- **Must preserve logger API:** `logger.info()`, `logger.error()`, `logger.warn()`, `logger.debug()`

---

## Patterns Identified

### Logging Fix Patterns (3 Options)

### Pattern 1: Remove pino-pretty Transport (RECOMMENDED)

**Description:** Disable pino-pretty to eliminate worker threads, keep Pino JSON output

**Implementation:**
```typescript
// src/lib/logger.ts (BEFORE)
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

// src/lib/logger.ts (AFTER)
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  // REMOVED: transport configuration
  // Pino now writes JSON directly to stdout (no worker threads)
});
```

**Use Case:** Development and production environments

**Example Output:**
```json
{"level":"info","time":1697200000000,"module":"orchestrator","gameId":"abc123","roundNumber":1,"phase":"NIGHT","msg":"Starting NIGHT phase"}
```

**Pros:**
- ✅ **Zero code changes:** All 97 logger calls work unchanged
- ✅ **Zero worker threads:** Eliminates crash root cause
- ✅ **Structured logs:** JSON output still queryable
- ✅ **Fast fix:** 5 minutes (remove 7 lines from logger.ts)
- ✅ **Preserves Iteration 4:** No console.log regression

**Cons:**
- ❌ **Less readable:** JSON logs harder to scan manually
- ❌ **No colors:** Terminal output is plain JSON

**Mitigation for readability:**
- Developers can pipe output to `pino-pretty` CLI: `npm run dev | pino-pretty`
- Production: Use log aggregation (Datadog, CloudWatch) with JSON parsing

**Recommendation:** Use this for MVP, improve readability in future iteration

---

### Pattern 2: Conditional pino-pretty with Environment Flag

**Description:** Only enable pino-pretty when explicitly requested

**Implementation:**
```typescript
// src/lib/logger.ts
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Only use pino-pretty if explicitly enabled
  ...(process.env.USE_PRETTY_LOGS === 'true' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    }
  } : {}),
});
```

**Use Case:** Developers who want pretty logs can enable manually

**Example Usage:**
```bash
# Default: JSON logs (no worker threads)
npm run dev

# Pretty logs (with worker threads - use at own risk)
USE_PRETTY_LOGS=true npm run dev
```

**Pros:**
- ✅ **Zero code changes:** All logger calls work unchanged
- ✅ **Opt-in pretty logs:** Developers choose readability vs stability
- ✅ **Default stable:** JSON output by default (no crashes)
- ✅ **Preserves Iteration 4:** No console.log regression

**Cons:**
- ❌ **Still has worker thread risk:** If enabled, crashes can still occur
- ❌ **Environment complexity:** One more env var to document

**Recommendation:** Use if team wants pretty logs option, but Pattern 1 is simpler

---

### Pattern 3: Logger Abstraction Layer (FALLBACK)

**Description:** Create adapter interface to switch between Pino, console.log, Winston

**Implementation:**
```typescript
// src/lib/logger.ts
interface Logger {
  debug: (obj: any, msg?: string) => void;
  info: (obj: any, msg?: string) => void;
  warn: (obj: any, msg?: string) => void;
  error: (obj: any, msg?: string) => void;
  child: (bindings: any) => Logger;
}

class ConsoleLogger implements Logger {
  private bindings: any = {};

  constructor(bindings: any = {}) {
    this.bindings = bindings;
  }

  debug(obj: any, msg?: string) {
    console.log('[DEBUG]', JSON.stringify(this.bindings), JSON.stringify(obj), msg);
  }

  info(obj: any, msg?: string) {
    console.log('[INFO]', JSON.stringify(this.bindings), JSON.stringify(obj), msg);
  }

  warn(obj: any, msg?: string) {
    console.warn('[WARN]', JSON.stringify(this.bindings), JSON.stringify(obj), msg);
  }

  error(obj: any, msg?: string) {
    console.error('[ERROR]', JSON.stringify(this.bindings), JSON.stringify(obj), msg);
  }

  child(bindings: any): Logger {
    return new ConsoleLogger({ ...this.bindings, ...bindings });
  }
}

// Switch based on environment
export const logger: Logger = process.env.USE_CONSOLE_LOGGER === 'true'
  ? new ConsoleLogger()
  : pino({ /* config */ });

// Child loggers work with both implementations
export const orchestratorLogger = logger.child({ module: 'orchestrator' });
export const discussionLogger = logger.child({ module: 'discussion' });
// ... etc.
```

**Use Case:** When Pino continues crashing even after config fix

**Pros:**
- ✅ **Fallback option:** Can switch to console.log if Pino unfixable
- ✅ **Zero logger call changes:** All 97 calls work unchanged
- ✅ **Preserves API:** logger.info(), logger.child() signatures identical
- ✅ **Maintains structured logging:** JSON.stringify() for context objects

**Cons:**
- ❌ **Complexity:** 50+ lines of abstraction code
- ❌ **Maintenance burden:** Two logger implementations
- ❌ **Not needed if Pattern 1 works:** Over-engineering for simple fix

**Recommendation:** Only implement if Pattern 1 fails (unlikely)

---

## Complexity Assessment

### Logging Fix Complexity: SIMPLE

**Rationale:**
- **Pattern 1 (Recommended):** 5-minute fix (remove 7 lines from logger.ts)
- **No code refactoring:** All 97 logger calls work unchanged
- **No breaking changes:** Child logger exports identical
- **Minimal testing:** Run game, verify no "worker has exited" errors

**Estimated Time:**
- Implementation: 5 minutes
- Testing (manual): 30 minutes (run full game, monitor logs)
- Testing (automated): 10 minutes (run 47 existing tests)
- **Total: 45 minutes**

**Risk Level: LOW**
- Well-understood problem (Pino transport worker threads)
- Well-tested solution (basic Pino without transport is stable)
- Zero API changes (backward compatible)

---

### Backend Dependency Complexity: MEDIUM

**Why medium?**
- 10 files depend on logger
- 97 logger calls across codebase
- Must preserve all existing functionality
- Must maintain 47 passing tests

**Dependency Map:**
```
src/lib/logger.ts (exports)
  ├── orchestratorLogger (used in 3 files: master-orchestrator, discussion/orchestrator, day-announcement)
  ├── discussionLogger (used in 2 files: orchestrator, turn-executor)
  ├── nightLogger (used in 1 file: night-phase)
  ├── votingLogger (used in 1 file: voting-phase)
  ├── gameLogger (used in 2 files: role-assignment, win-conditions)
  ├── claudeLogger (used in 1 file: claude/client)
  ├── dbLogger (used in 0 files: reserved for future)
  └── agentLogger (used in 0 files: reserved for future)
```

**Critical Files (High Dependency):**
1. **master-orchestrator.ts** (13 orchestratorLogger calls)
   - Status: WORKING (Iteration 4 validated)
   - Risk: HIGH if logger API changes
   - Constraint: Must not break Iteration 4 fix

2. **discussion/orchestrator.ts** (17 logger calls)
   - Status: WORKING (44 messages generated)
   - Risk: HIGH if logger API changes
   - Constraint: buildAgentContextWrapper signature unchanged

3. **cost-tracker.ts** (9 logger calls)
   - Status: WORKING (cost tracking functional)
   - Risk: MEDIUM
   - Constraint: Preserve cost summary format

**Validation Strategy:**
1. Run `npm test` (47 tests must pass)
2. Start dev server: `npm run dev`
3. Create game: `curl -X POST http://localhost:3001/api/game/create`
4. Start game: `curl -X POST http://localhost:3001/api/game/{gameId}/start`
5. Monitor logs for 10 minutes
6. Expected: Zero "worker has exited" errors, all phases complete successfully

---

### Testing Infrastructure Complexity: COMPLEX

**Current State:**
- **Backend tests:** 47 tests (Vitest) - PASSING
- **Frontend tests:** 0 tests - MISSING
- **E2E tests:** 0 tests - MISSING
- **Visual tests:** 0 tests - MISSING

**Test Files Inventory (9 files):**
1. `lib/game/__tests__/phase-config.test.ts` (9 tests)
2. `src/lib/discussion/threading.test.ts`
3. `src/lib/discussion/turn-scheduler.test.ts`
4. `src/utils/__tests__/avatar-colors.test.ts`
5. `src/utils/__tests__/message-classification.test.ts`
6. `src/utils/repetition-tracker.test.ts`
7. `src/lib/claude/__tests__/client.test.ts` (cost tracking tests)
8. `src/utils/__tests__/cost-tracker.test.ts`
9. `src/lib/claude/__tests__/client.simple.test.ts`

**Gap Analysis:**
- ❌ **No SSE endpoint tests:** Cannot validate SSE stability
- ❌ **No GameEventsContext tests:** Frontend state management untested
- ❌ **No PhaseIndicator tests:** Timer sync logic untested
- ❌ **No DiscussionFeed tests:** Message display untested
- ❌ **No E2E tests:** Full game flow never validated
- ❌ **No Playwright setup:** E2E infrastructure missing

**Vision Requirements (Feature 11: Playwright E2E Tests):**
- Test 1: Lobby loads and game can be created
- Test 2: Game page loads and shows player grid
- Test 3: Messages appear in discussion feed during game
- Test 4: Phase changes are reflected in UI
- Test 5: Vote tally displays correctly
- Test 6: Game over screen shows final results and roles
- Test 7: Timer countdown works
- Test 8: SSE connection status indicator
- **Total: 8 fast tests + 3 slow tests = 11 scenarios**

**Why COMPLEX?**
- Playwright not installed (needs `@playwright/test` + browser binaries)
- No existing E2E test patterns to follow
- Real-time SSE testing inherently flaky (timing, race conditions)
- 11 test scenarios = 10-15 hours estimated (per Master Explorer 2)

**Recommendation for Iteration 5:**
- ✅ **DO:** Fix logging (foundation for SSE stability)
- ✅ **DO:** Manually test SSE after logging fix
- ❌ **DEFER:** Playwright E2E tests to Iteration 6 or 7 (separate iteration)

---

## Integration Points

### Logging System Integration

**Internal Integrations:**
- **Master Orchestrator** ← orchestratorLogger
- **Discussion Orchestrator** ← orchestratorLogger, discussionLogger
- **Turn Executor** ← discussionLogger
- **Night Phase** ← nightLogger
- **Voting Phase** ← votingLogger
- **Day Announcement** ← orchestratorLogger
- **Role Assignment** ← gameLogger
- **Win Conditions** ← gameLogger
- **Claude Client** ← claudeLogger
- **Cost Tracker** ← logger (base logger)

**External Integrations:**
- **stdout/stderr** ← Pino writes JSON logs (no files, no network)
- **Docker/Railway** ← Captures stdout for log aggregation
- **Developer terminal** ← Displays logs during `npm run dev`

**SSE Integration:**
- **Server stability** ← Logging must not crash main thread
- **Event emission** ← orchestrator.info() calls happen before gameEventEmitter.emit()
- **Keepalive** ← No logging during SSE keepalive (avoids congestion)

**Database Integration:**
- **No direct dependency:** Logger does not write to database
- **Indirect:** Orchestrator logs database query results
- **Risk: NONE** (logging changes don't affect Prisma)

---

### SSE System Integration (Context for Logging Fix)

**Why logging stability matters for SSE:**

**SSE Architecture (from Master Explorer 1):**
```
Backend Orchestrator (Node.js main thread)
  ├── orchestratorLogger.info() ← Logs to Pino
  ├── gameEventEmitter.emit('phase_change', ...) ← Emits events
  │
  ↓
SSE Route Handler (/api/game/[gameId]/stream)
  ├── Listens to gameEventEmitter
  ├── Serializes events to JSON
  └── Streams via text/event-stream
  │
  ↓
Frontend EventSource (GameEventsContext.tsx)
  ├── Connects to /stream endpoint
  ├── Receives SSE messages
  └── Updates React state
```

**Problem Flow:**
1. **Orchestrator logs:** `orchestratorLogger.info({...}, 'Starting NIGHT phase')`
2. **Pino serializes:** JSON payload sent to worker thread
3. **Worker thread crashes:** "worker has exited" error
4. **Main thread destabilizes:** Event loop blocked, exceptions propagate
5. **SSE connection drops:** EventSource disconnects, no reconnection
6. **Frontend freezes:** No phase changes, no messages, timer resets

**Solution Flow (after logging fix):**
1. **Orchestrator logs:** `orchestratorLogger.info({...}, 'Starting NIGHT phase')`
2. **Pino writes JSON:** Directly to stdout (no worker thread)
3. **No crashes:** Main thread stable
4. **SSE stays connected:** gameEventEmitter delivers events reliably
5. **Frontend updates:** Phase changes, messages appear, timer syncs

---

## Risks & Challenges

### High Risks

**Risk 1: Breaking Iteration 4 Backend Code**

**Description:** Changing logger.ts could break 97 logger calls across 10 files

**Impact:** CATASTROPHIC (backend crashes, no games can run, 47 tests fail)

**Likelihood:** LOW (if using Pattern 1 - no API changes)

**Mitigation:**
1. **Use Pattern 1 (Remove transport):** Zero API changes, all calls work unchanged
2. **Test immediately:** Run `npm test` after changing logger.ts
3. **Manual validation:** Start game, verify all phases complete
4. **Rollback plan:** Revert logger.ts change if tests fail

**Validation Checklist:**
- [ ] All 47 backend tests pass
- [ ] Game can be created via API
- [ ] Game can be started via API
- [ ] Discussion phase generates messages
- [ ] Night phase runs without crashes
- [ ] Voting phase completes
- [ ] Win condition check works
- [ ] Cost tracking functional

---

**Risk 2: Pino JSON Logs Unreadable for Developers**

**Description:** JSON logs harder to read than pretty-printed logs

**Impact:** MEDIUM (developer experience degraded, debugging slower)

**Likelihood:** HIGH (JSON logs are verbose)

**Example:**
```json
{"level":"info","time":1697200000000,"module":"orchestrator","gameId":"abc123","roundNumber":1,"phase":"NIGHT","msg":"Starting NIGHT phase"}
{"level":"info","time":1697200005000,"module":"discussion","gameId":"abc123","turn":1,"playerId":"player-1","msg":"Agent speaking"}
```

**Mitigation:**
1. **Pipe to pino-pretty CLI:** `npm run dev | pino-pretty` (developer choice)
2. **Update README.md:** Document how to enable pretty logs
3. **Future iteration:** Add pino-pretty as CLI tool (not transport)
4. **Log aggregation:** Use Datadog/CloudWatch with JSON parsing (production)

**Example README Update:**
```markdown
## Logging

By default, logs are output as JSON (stable, no worker threads).

### Pretty Logs (Development)
To enable human-readable logs during development:
```bash
npm run dev | npx pino-pretty
```

Or create an npm script:
```json
"scripts": {
  "dev:pretty": "npm run dev | pino-pretty"
}
```

**Recommendation:** Accept JSON logs for MVP, improve later

---

**Risk 3: Test Flakiness with Real-Time SSE (Future E2E Tests)**

**Description:** E2E tests with SSE are inherently flaky (timing, race conditions)

**Impact:** MEDIUM (tests fail randomly, CI/CD unreliable)

**Likelihood:** HIGH (per Master Explorer 2 analysis)

**Mitigation:**
1. **Start simple:** 3 fast tests first (lobby, SSE connection, timer)
2. **Use Playwright waiters:** `waitForSelector()`, `waitForTimeout()`
3. **Increase timeouts:** 30s for first message, 5s per message
4. **Retry logic:** 3 retries max for flaky assertions
5. **Mock Claude API:** Use test doubles, not real API (10x faster)

**Recommendation for Iteration 5:**
- ❌ **DO NOT** build E2E tests in this iteration (defer to Iteration 6/7)
- ✅ **DO** fix logging and manually validate SSE stability

---

### Medium Risks

**Risk 4: Missing Environment Variable Documentation**

**Description:** New USE_PRETTY_LOGS env var (Pattern 2) needs documentation

**Impact:** LOW (developers confused, use wrong config)

**Likelihood:** MEDIUM (if Pattern 2 chosen)

**Mitigation:**
1. Update `.env.example` with USE_PRETTY_LOGS=false
2. Update README.md with logging configuration section
3. Add comments in logger.ts explaining env var

---

**Risk 5: Log Volume Overwhelming Stdout**

**Description:** JSON logs with high verbosity could fill terminal/logs

**Impact:** LOW (developer annoyance, log storage costs)

**Likelihood:** LOW (LOG_LEVEL=info is reasonable default)

**Mitigation:**
1. Use LOG_LEVEL=info in production (not debug)
2. Rotate logs in production (Docker/Railway handles this)
3. Consider log sampling (1 in 10 debug logs)

---

## Recommendations for Planner

### 1. Use Pattern 1 (Remove pino-pretty Transport) for Iteration 5

**Rationale:**
- ✅ **Fastest fix:** 5 minutes (remove 7 lines)
- ✅ **Zero risk:** No API changes, all 97 logger calls work unchanged
- ✅ **Proven solution:** Basic Pino without transport is stable
- ✅ **Preserves Iteration 4:** No console.log regression
- ✅ **Foundation for SSE:** Stable server = stable SSE

**Implementation:**
```diff
// src/lib/logger.ts
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
-  transport: process.env.NODE_ENV === 'development' ? {
-    target: 'pino-pretty',
-    options: {
-      colorize: true,
-      translateTime: 'HH:MM:ss',
-      ignore: 'pid,hostname',
-    },
-  } : undefined,
});
```

**Validation Steps:**
1. Change logger.ts (5 min)
2. Run `npm test` (verify 47 tests pass)
3. Start dev server: `npm run dev`
4. Create + start game via API
5. Monitor logs for 10 minutes
6. Expected: Zero "worker has exited" errors

**Success Criteria:**
- [ ] Zero "worker has exited" errors during 10-minute game
- [ ] All 47 backend tests still passing
- [ ] SSE connection stays alive (manual test: check Network tab)
- [ ] All game phases complete (NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK)

---

### 2. Defer Playwright E2E Tests to Separate Iteration

**Rationale:**
- ❌ **Too complex for Iteration 5:** 10-15 hours estimated
- ❌ **Requires Playwright setup:** Not currently installed
- ❌ **Test flakiness risk:** Real-time SSE testing is hard
- ✅ **Logging fix is foundation:** Must stabilize server first
- ✅ **Manual testing sufficient:** Can validate SSE stability manually

**Recommendation:**
- **Iteration 5 scope:** Fix logging + manual SSE validation
- **Iteration 6/7 scope:** Build Playwright E2E infrastructure + 11 test scenarios

**Manual Testing Plan for Iteration 5:**
1. **SSE Connection Test:**
   - Open game page in browser
   - Check DevTools → Network → EventStream
   - Verify connection status: "Connected" (green)
   - Leave connection open for 10+ minutes
   - Expected: No disconnections

2. **Message Display Test:**
   - Start game
   - Wait for Discussion phase
   - Count messages in UI
   - Expected: 40+ messages appear (matching database count)

3. **Timer Sync Test:**
   - Start game
   - Note timer value during Discussion phase
   - Refresh page
   - Expected: Timer shows same value (±2 seconds)

4. **Phase Change Test:**
   - Start game
   - Watch phase indicator
   - Expected: NIGHT → DAY_ANNOUNCEMENT → DISCUSSION → VOTING transitions

---

### 3. Update README.md with Logging Configuration

**Add section:**
```markdown
## Logging Configuration

AI Mafia uses [Pino](https://getpino.io/) for structured JSON logging.

### Default Logging (Stable)
By default, logs are output as JSON to stdout:
```bash
npm run dev
# Output: {"level":"info","time":1697200000000,"module":"orchestrator","msg":"Starting game"}
```

### Pretty Logs (Development)
For human-readable logs during development, pipe output to pino-pretty:
```bash
npm run dev | npx pino-pretty
# Output: [14:30:00] INFO (orchestrator): Starting game
```

### Log Levels
- **Production:** `LOG_LEVEL=info` (default)
- **Development:** `LOG_LEVEL=debug` (verbose)
- **Quiet:** `LOG_LEVEL=warn` (errors only)

Example:
```bash
LOG_LEVEL=debug npm run dev
```

### Troubleshooting
If you see "worker has exited" errors, ensure pino-pretty is NOT configured as a transport (use CLI piping instead).
```

---

### 4. Preserve Backend Stability (Gate for Iteration 5)

**Critical Constraint:** All 47 backend tests MUST keep passing

**Gate Definition:**
- ✅ **PASS:** All 47 tests passing → Proceed to next phase
- ❌ **FAIL:** Any test fails → STOP, debug, fix before continuing

**Test Command:**
```bash
npm test
```

**Expected Output:**
```
 ✓ lib/game/__tests__/phase-config.test.ts (9 tests)
 ✓ src/lib/discussion/threading.test.ts
 ✓ src/lib/discussion/turn-scheduler.test.ts
 ✓ src/utils/__tests__/avatar-colors.test.ts
 ✓ src/utils/__tests__/message-classification.test.ts
 ✓ src/utils/repetition-tracker.test.ts
 ✓ src/lib/claude/__tests__/client.test.ts
 ✓ src/utils/__tests__/cost-tracker.test.ts
 ✓ src/lib/claude/__tests__/client.simple.test.ts

Test Files  9 passed (9)
     Tests  47 passed (47)
```

---

### 5. Consider Pattern 2 as Backup (If Team Wants Pretty Logs Option)

**Only if:** Team feedback indicates JSON logs too hard to read

**Implementation:** See Pattern 2 above (conditional pino-pretty with USE_PRETTY_LOGS flag)

**Trade-off:**
- ✅ **Pro:** Developers can opt-in to pretty logs
- ❌ **Con:** Worker thread risk still exists if enabled
- ❌ **Con:** One more env var to document

**Recommendation:** Start with Pattern 1 (JSON only), add Pattern 2 if complaints arise

---

## Resource Map

### Critical Files for Logging Fix

**Primary:**
- `src/lib/logger.ts` (28 lines) - **MODIFY THIS FILE**
  - Purpose: Pino logger configuration
  - Change: Remove `transport` config (7 lines)
  - Risk: LOW (only config, no API changes)

**Dependent Files (DO NOT MODIFY):**
1. `src/lib/game/master-orchestrator.ts` (300+ lines)
   - Uses: `orchestratorLogger` (13 calls)
   - Risk: HIGH if logger API changes (must preserve)

2. `src/lib/discussion/orchestrator.ts` (200+ lines)
   - Uses: `orchestratorLogger`, `discussionLogger` (17 calls)
   - Risk: HIGH if logger API changes (must preserve)

3. `src/lib/discussion/turn-executor.ts` (150+ lines)
   - Uses: `discussionLogger` (5 calls)
   - Risk: MEDIUM (fewer calls)

4. `src/lib/game/night-phase.ts`
   - Uses: `nightLogger` (17 calls)
   - Risk: MEDIUM

5. `src/lib/game/voting-phase.ts`
   - Uses: `votingLogger` (12 calls)
   - Risk: MEDIUM

6. `src/lib/game/day-announcement.ts`
   - Uses: `orchestratorLogger` (10 calls)
   - Risk: MEDIUM

7. `src/lib/game/role-assignment.ts`
   - Uses: `gameLogger` (3 calls)
   - Risk: LOW

8. `src/lib/game/win-conditions.ts`
   - Uses: `gameLogger` (5 calls)
   - Risk: LOW

9. `src/lib/claude/client.ts`
   - Uses: `claudeLogger` (6 calls)
   - Risk: MEDIUM (cost tracking depends on this)

10. `src/utils/cost-tracker.ts`
    - Uses: `logger` (9 calls)
    - Risk: MEDIUM (cost summary format must be preserved)

---

### Key Dependencies

**NPM Packages (Logging):**
- `pino@10.0.0` - Core logging library (KEEP)
- `pino-pretty@13.1.2` - Pretty-printing transport (KEEP, but don't use as transport)
- `thread-stream@3.1.0` - Worker thread manager (transitive dependency from Pino)
- `sonic-boom@4.2.0` - Async file writer (transitive dependency)

**NPM Packages (Testing):**
- `vitest@1.6.1` - Unit test runner (ALREADY INSTALLED)
- `@playwright/test` - E2E test framework (NOT INSTALLED - defer to Iteration 6/7)
- `@testing-library/react@14.3.1` - React component testing (ALREADY INSTALLED, but unused)

**NPM Packages (Core):**
- `next@14.2.18` - Framework
- `react@18` - UI library
- `@prisma/client@6.17.1` - Database ORM
- `@anthropic-ai/sdk@0.65.0` - Claude API client

---

### Testing Infrastructure

**Current Test Files (9 files, 47 tests):**
1. `lib/game/__tests__/phase-config.test.ts` (9 tests) - **MUST PASS**
2. `src/lib/discussion/threading.test.ts` - **MUST PASS**
3. `src/lib/discussion/turn-scheduler.test.ts` - **MUST PASS**
4. `src/utils/__tests__/avatar-colors.test.ts` - **MUST PASS**
5. `src/utils/__tests__/message-classification.test.ts` - **MUST PASS**
6. `src/utils/repetition-tracker.test.ts` - **MUST PASS**
7. `src/lib/claude/__tests__/client.test.ts` - **MUST PASS**
8. `src/utils/__tests__/cost-tracker.test.ts` - **MUST PASS**
9. `src/lib/claude/__tests__/client.simple.test.ts` - **MUST PASS**

**Missing Test Infrastructure (Defer to Iteration 6/7):**
- Playwright configuration (`playwright.config.ts`)
- E2E test directory (`tests/e2e/`)
- E2E test helpers (`tests/e2e/setup.ts`)
- Browser binaries (Chromium, Firefox)
- CI/CD workflow (`.github/workflows/e2e-tests.yml`)

---

## Questions for Planner

### 1. Should we use Pattern 1 or Pattern 2 for logging fix?

**Pattern 1 (Recommended):** Remove pino-pretty transport entirely
- **Pro:** Simplest, fastest, zero risk
- **Con:** JSON logs less readable

**Pattern 2 (Alternative):** Conditional pino-pretty with USE_PRETTY_LOGS flag
- **Pro:** Developers can opt-in to pretty logs
- **Con:** Worker thread risk still exists if enabled

**My Recommendation:** Start with Pattern 1, add Pattern 2 only if team feedback indicates JSON logs too hard to read

---

### 2. Should Iteration 5 include E2E testing or defer to Iteration 6/7?

**Option A (Defer E2E):** Iteration 5 = logging fix + manual SSE validation
- **Pro:** Faster iteration (1-2 hours vs 10-15 hours)
- **Pro:** Focus on foundation (stable logging → stable SSE)
- **Pro:** Less risk (manual testing sufficient to validate fix)
- **Con:** No automated regression prevention

**Option B (Include E2E):** Iteration 5 = logging fix + Playwright setup + 11 test scenarios
- **Pro:** Automated validation, regression prevention
- **Con:** Slower iteration (15-20 hours)
- **Con:** High flakiness risk with real-time SSE tests
- **Con:** Playwright not installed (setup overhead)

**My Recommendation:** **Option A (Defer E2E to Iteration 6/7)**
- Rationale: Logging fix is foundation, must stabilize first
- Manual testing sufficient to validate SSE stability
- E2E testing deserves dedicated iteration (complex, flaky, time-consuming)

---

### 3. Should we update package.json to add "dev:pretty" script?

**Proposed:**
```json
"scripts": {
  "dev": "next dev",
  "dev:pretty": "npm run dev | pino-pretty",
  "test": "vitest",
  "test:e2e": "playwright test"  // Future iteration
}
```

**Pro:**
- Easy for developers to enable pretty logs
- Self-documenting (visible in `npm run`)

**Con:**
- One more script to maintain
- May confuse developers (which to use?)

**My Recommendation:** Add `dev:pretty` script + document in README.md

---

### 4. Should we add LOG_LEVEL env var to .env.example?

**Proposed .env.example:**
```bash
# Claude API
ANTHROPIC_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Logging
LOG_LEVEL=info  # Options: debug, info, warn, error
```

**Pro:**
- Documents available env vars
- Self-documenting configuration

**Con:**
- Not critical (defaults work fine)

**My Recommendation:** Yes, add LOG_LEVEL to .env.example (low effort, high documentation value)

---

### 5. What is the success criteria for "logging fix complete"?

**Proposed Success Criteria:**
1. [ ] Zero "worker has exited" errors during 10-minute game
2. [ ] All 47 backend tests still passing (`npm test` exits with code 0)
3. [ ] SSE connection stays alive for full game (manual test in browser)
4. [ ] All game phases complete (NIGHT → DAY → DISCUSSION → VOTING → WIN_CHECK)
5. [ ] Logs are readable (JSON or pretty, developer choice)
6. [ ] README.md updated with logging configuration section

**My Recommendation:** Use these 6 criteria as gate for "Iteration 5 complete"

---

## Complexity Rating: SIMPLE (Logging Fix) + COMPLEX (Full Testing Infrastructure)

**Iteration 5 Scope (Recommended):**
- **Logging fix:** SIMPLE (5 minutes implementation, 30 minutes testing)
- **Manual SSE validation:** SIMPLE (30 minutes testing)
- **Total:** 1-2 hours

**Deferred to Iteration 6/7:**
- **Playwright E2E setup:** COMPLEX (2 hours setup)
- **11 test scenarios:** COMPLEX (10-15 hours implementation)
- **Test stabilization:** COMPLEX (3-5 hours flakiness fixes)
- **Total:** 15-22 hours

**Overall Assessment:**
- **If Iteration 5 = logging fix only:** SIMPLE (1-2 hours)
- **If Iteration 5 = logging fix + E2E tests:** COMPLEX (15-20 hours)

**My Recommendation:** Keep Iteration 5 SIMPLE (logging fix + manual validation), defer E2E to separate iteration

---

## Exploration Completed

**Timestamp:** 2025-10-13T15:15:00Z

**Summary:**
- ✅ **Root cause identified:** Pino pino-pretty transport spawns worker threads that crash
- ✅ **Solution identified:** Remove transport, use basic Pino JSON output (5-minute fix)
- ✅ **Risk assessment:** LOW risk (zero API changes, all 97 logger calls preserved)
- ✅ **Backend stability:** 47 tests must keep passing (validation gate)
- ✅ **Recommendation:** Pattern 1 (remove transport) for Iteration 5, defer E2E testing to Iteration 6/7

**Key Takeaway:** Logging fix is a **SIMPLE tactical fix** (not complex refactoring). Focus Iteration 5 on stabilizing the foundation (logging → SSE), then build E2E testing infrastructure in dedicated iteration.

---

**Files Referenced:**
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/logger.ts` (PRIMARY TARGET)
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/package.json` (NPM dependencies)
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/game/master-orchestrator.ts` (13 logger calls)
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/app/src/lib/discussion/orchestrator.ts` (17 logger calls)
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/.2L/plan-2/vision.md` (Problem statement)
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/.2L/plan-2/master-plan.yaml` (Iteration 1 scope)
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/.2L/plan-2/master-exploration/master-explorer-1-report.md` (Architecture analysis)
- `/home/ahiya/Ahiya/2L/Production-test/ai-mafia/2L-test/.2L/plan-2/master-exploration/master-explorer-2-report.md` (Testing strategy)
