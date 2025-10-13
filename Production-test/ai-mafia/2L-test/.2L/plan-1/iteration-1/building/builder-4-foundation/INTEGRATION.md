# Builder-4 Foundation Integration Guide

## Quick Start

### Prerequisites Checklist

Before integrating Builder-4 foundation:

- [ ] Builder-1 complete: Database schema created, Prisma client working
- [ ] Builder-3 complete: Orchestrator working, event emitter functional
- [ ] Project has Next.js 14 setup with TypeScript
- [ ] API key in `.anthropic-key.txt`

### Installation (5 minutes)

```bash
# 1. Install CLI dependencies
npm install chalk@^5.3.0 ora@^8.1.1 string-similarity@^4.0.4 tsx@^4.19.2

# 2. Copy foundation files to project
cd /path/to/ai-mafia/2L-test
cp -r .2L/plan-1/iteration-1/building/builder-4-foundation/src/* src/
cp -r .2L/plan-1/iteration-1/building/builder-4-foundation/docs/* docs/

# 3. Add scripts to package.json
# (See "Package.json Updates" section below)

# 4. Create logs directory
mkdir -p logs/transcripts

# 5. Verify installation
npm run test-discussion --help
```

### Package.json Updates

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test-discussion": "tsx src/cli/test-discussion.ts",
    "test-quick": "tsx src/cli/test-discussion.ts --quick",
    "test-full": "tsx src/cli/test-discussion.ts --full",
    "evaluate": "tsx src/cli/evaluate-transcript.ts"
  }
}
```

---

## Integration Steps

### Step 1: Verify Dependencies (2 minutes)

Test that all builder dependencies are working:

```bash
# Test Builder-1 (database)
npx prisma studio
# Should open Prisma Studio showing tables: games, players, discussion_messages

# Test Builder-2 (cost tracker)
# Check that src/utils/cost-tracker.ts exists

# Test Builder-3 (orchestrator)
# Check that src/lib/events/emitter.ts exists
# Check that src/lib/discussion/turn-scheduler.ts exists
```

**If any missing:**
- Wait for respective builder to complete
- DO NOT proceed until all dependencies ready

### Step 2: Copy Foundation Files (1 minute)

```bash
# From project root
cp -r .2L/plan-1/iteration-1/building/builder-4-foundation/src/cli src/
cp -r .2L/plan-1/iteration-1/building/builder-4-foundation/src/lib/discussion/transcript.ts src/lib/discussion/
cp -r .2L/plan-1/iteration-1/building/builder-4-foundation/src/utils/display-helpers.ts src/utils/
cp -r .2L/plan-1/iteration-1/building/builder-4-foundation/src/types/cli.ts src/types/
cp -r .2L/plan-1/iteration-1/building/builder-4-foundation/docs docs/
```

**File locations after copy:**
```
src/
├── cli/
│   ├── test-discussion.ts
│   └── evaluate-transcript.ts
├── lib/
│   └── discussion/
│       └── transcript.ts
├── utils/
│   └── display-helpers.ts
└── types/
    └── cli.ts

docs/
├── quality-rubric.md
└── cli-usage.md
```

### Step 3: Verify Imports (2 minutes)

Check that all imports resolve correctly:

```bash
# TypeScript type checking
npx tsc --noEmit

# If errors about missing imports:
# - Verify Builder-1 provided @/lib/db/client
# - Verify Builder-1 provided @/lib/db/seed
# - Verify Builder-2 provided @/utils/cost-tracker
# - Verify Builder-3 provided @/lib/discussion/turn-scheduler
# - Verify Builder-3 provided @/lib/events/emitter
```

**Expected imports in CLI files:**

From Builder-1:
- `@/lib/db/client` (prisma singleton)
- `@/lib/db/seed` (seedTestGame function)

From Builder-2:
- `@/utils/cost-tracker` (costTracker singleton)

From Builder-3:
- `@/lib/discussion/turn-scheduler` (orchestrateDiscussionPhase)
- `@/lib/events/emitter` (gameEventEmitter)

From Foundation:
- `@/lib/discussion/transcript` (generateTranscript)
- `@/utils/display-helpers` (formatting functions)
- `@/types/cli` (TypeScript types)

### Step 4: First Test Run (5 minutes)

```bash
# Run quick test (1 minute)
npm run test-quick

# Expected: Test runs, messages display, transcript saved
# If errors, see "Troubleshooting" section
```

**Success indicators:**
- ✓ Game created message appears
- ✓ Messages display in real-time with colors
- ✓ Cost summary shows at end
- ✓ Transcript files created in logs/transcripts/

**If test hangs:**
- Check orchestrator is working (Builder-3)
- Check event emitter is firing events
- Press Ctrl+C to interrupt, review logs

### Step 5: Quality Evaluation Test (2 minutes)

```bash
# Find latest transcript
latest=$(ls -t logs/transcripts/*.json | head -1)

# Run evaluation
npm run evaluate "$latest"

# Expected: Metrics calculated, PASS/FAIL displayed
```

**Success indicators:**
- ✓ All 7 metrics calculated
- ✓ Manual prompts appear (memory accuracy, engagement)
- ✓ Overall PASS/FAIL determined
- ✓ Recommendations displayed

### Step 6: Baseline Tests (30 minutes)

Run 3 baseline tests to establish quality benchmark:

```bash
# Test 1
npm run test-discussion
# Wait ~3 minutes for completion

# Test 2
npm run test-discussion
# Wait ~3 minutes

# Test 3
npm run test-discussion
# Wait ~3 minutes

# Evaluate all 3
for f in logs/transcripts/*.json; do
  echo "Evaluating $f"
  npm run evaluate "$f"
done
```

**Document baseline:**
- Average scores for each metric
- Pass/fail count (e.g., "2/3 tests passed")
- Cost per test
- Cache hit rate

---

## Troubleshooting

### Error: "Cannot find module '@/lib/db/client'"

**Cause:** Builder-1 files not in place

**Fix:**
```bash
# Check if file exists
ls src/lib/db/client.ts

# If missing, wait for Builder-1 to complete
# If exists, check tsconfig.json paths configuration
```

### Error: "Cannot find module '@/lib/discussion/turn-scheduler'"

**Cause:** Builder-3 files not in place

**Fix:**
```bash
# Check if file exists
ls src/lib/discussion/turn-scheduler.ts

# If missing, wait for Builder-3 to complete
```

### Error: "seedTestGame is not a function"

**Cause:** Builder-1 seed function not exported correctly

**Fix:**
```typescript
// In src/lib/db/seed.ts, ensure export:
export async function seedTestGame(config: {...}) {
  // ...
}
```

### Test hangs (no messages appearing)

**Cause:** Orchestrator not emitting events or event emitter not working

**Diagnosis:**
```bash
# Add debug logging to CLI
# In src/cli/test-discussion.ts, add:
console.log('Listening for events on gameId:', gameId);

gameEventEmitter.on('message', (data) => {
  console.log('Event received:', data.type);
  // ...
});
```

**Fix:**
1. Verify Builder-3 orchestrator is calling `gameEventEmitter.emit('message', ...)`
2. Verify event payload includes `gameId` and `type` fields
3. Test orchestrator independently first

### Cost exceeds $5

**Cause:** Prompt caching not working

**Diagnosis:**
```bash
# Check cache hit rate in CLI output
# Should be 70%+ after first turn
# If 0%, caching completely broken
```

**Fix:**
1. Review Builder-2 Claude client implementation
2. Verify `cache_control: { type: 'ephemeral' }` on system prompt
3. Ensure system prompt is stable (not changing every turn)
4. Test single-agent caching first

### Evaluation script fails with "Invalid JSON"

**Cause:** Transcript JSON malformed

**Diagnosis:**
```bash
# Validate JSON
jq . logs/transcripts/discussion-*.json

# If error, check transcript generator
```

**Fix:**
1. Review transcript generator implementation
2. Ensure all fields are properly serialized
3. Check for circular references in data structures

### Memory accuracy validation hangs

**Cause:** Readline input not working in foundation placeholder

**Fix:**
```typescript
// In src/cli/evaluate-transcript.ts
// Replace placeholder with actual readline input:

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Use in validation:
const answer = await askQuestion('Is this reference accurate? (y/n): ');
```

---

## Validation Checklist

After integration, verify all features work:

### CLI Test Harness
- [ ] `npm run test-discussion` completes successfully
- [ ] Real-time messages display with colors
- [ ] Agent names colored (cyan for Villagers, red for Mafia)
- [ ] Turn numbers increment correctly
- [ ] Cost summary displays at end
- [ ] Cache hit rate shown (should be >70%)
- [ ] Warnings appear if cost >$3 or cache <70%
- [ ] Transcript files saved to logs/transcripts/
- [ ] Both JSON and text formats generated

### Quality Evaluation
- [ ] `npm run evaluate <file>` runs successfully
- [ ] All 7 metrics calculated
- [ ] Memory accuracy validation prompts appear
- [ ] Engagement rating prompt appears
- [ ] PASS/FAIL determined correctly (5/7 to pass)
- [ ] Recommendations displayed for failed metrics
- [ ] Evaluation JSON saved to evaluations/ subdirectory

### Display and Formatting
- [ ] Headers display with ASCII art borders
- [ ] Agent messages formatted with indentation
- [ ] Reply threading indicated ("replying to X")
- [ ] Cost table formatted correctly
- [ ] Colors work in terminal (not broken on Windows/Mac)
- [ ] Progress spinners work (ora)

### Integration Points
- [ ] Event emitter receives messages from orchestrator
- [ ] Cost tracker provides accurate summaries
- [ ] Database queries work (transcript fetches all data)
- [ ] Seed function creates test games correctly
- [ ] Orchestrator completes Discussion phase

---

## Next Steps

### 1. Establish Baseline (Day 1)

```bash
# Run 3 baseline tests
npm run test-discussion  # ~3 minutes each
npm run test-discussion
npm run test-discussion

# Evaluate all
for f in logs/transcripts/*.json; do
  npm run evaluate "$f"
done

# Document baseline scores
# Create: docs/prompt-iteration-log.md
```

**Document:**
- Average score per metric
- Pass count (X/3 tests passed)
- Average cost per test
- Average cache hit rate

### 2. Identify Improvements (Day 1)

Review baseline results:
- Which metrics are failing most often?
- Which are closest to passing?
- What patterns appear in failed transcripts?

### 3. Prompt Iteration (Days 2-5)

**Iteration Cycle:**
1. Choose lowest metric
2. Adjust Builder-2 prompts (ONE change)
3. Run 3 tests
4. Evaluate and compare to baseline
5. Keep if improved, revert if not
6. Document in prompt-iteration-log.md
7. Repeat

**Target:** 5/7 metrics passing in 3 consecutive tests

### 4. Sub-builder 4A (Parallel)

While prompt iteration happens, assign Sub-builder 4A:
- Build SSE endpoint
- Build 3 React components
- Build Discussion viewer page

**See:** Builder-4 report for detailed sub-builder task

### 5. Final Validation (Day 6)

Once prompts stabilized:
```bash
# Lock prompts (no more changes)
# Run 3 final validation tests
npm run test-discussion
npm run test-discussion
npm run test-discussion

# All 3 must pass 5/7 metrics
# All 3 must have cost <$2
# All 3 must have cache >70%
```

**Success = Ready for Iteration 2**

---

## Cost Budget

### Expected Costs (with working cache)

| Test Type | Duration | Agents | Approx Cost |
|-----------|----------|--------|-------------|
| Quick     | 1 min    | 6      | $0.50-$1.00 |
| Default   | 3 min    | 10     | $1.50-$2.50 |
| Full      | 5 min    | 12     | $2.50-$4.00 |

### Test Budget for Iteration 1

- Baseline: 3 tests × $2 = $6
- Iteration Cycle 1: 3 tests × $2 = $6
- Iteration Cycle 2: 3 tests × $2 = $6
- Iteration Cycle 3: 3 tests × $2 = $6
- Final Validation: 3 tests × $2 = $6

**Total: ~$30 for 15 tests**

**If costs exceed budget:**
- Use `npm run test-quick` more often ($1 instead of $2)
- Investigate caching issues
- Reduce agent count or duration temporarily

---

## Quality Gates

Before proceeding to Iteration 2, ALL must be true:

- [ ] 5/7 metrics passing in 3 consecutive tests
- [ ] Engagement ≥3.0 in all 3 tests (MANDATORY)
- [ ] Cost <$2.00 per test (average)
- [ ] Cache hit rate >70% (average)
- [ ] 10+ transcripts archived in logs/
- [ ] Quality rubric validated by manual review
- [ ] Prompt changes documented in prompt-iteration-log.md

**DO NOT proceed if:**
- Engagement consistently <3.0 (even if 5/7 metrics pass)
- Cost consistently >$3.00 (caching broken)
- Only 4/7 metrics passing (need 5/7)
- Results inconsistent across tests (need stability)

---

## Integration Complete!

Once all validation steps pass:

1. **Commit transcripts** to git (examples)
   ```bash
   git add logs/transcripts/discussion-*.txt
   git commit -m "Add example Discussion transcripts"
   ```

2. **Commit documentation**
   ```bash
   git add docs/quality-rubric.md docs/cli-usage.md
   git commit -m "Add CLI test harness documentation"
   ```

3. **Update main README**
   - Add CLI usage section
   - Link to quality rubric
   - Link to example transcripts

4. **Handoff to Iteration 2**
   - Provide: Working CLI, validated prompts, quality benchmarks
   - Deliver: Prompt iteration log, baseline metrics, example transcripts

---

## Support Contacts

**CLI Foundation Issues:**
- Check: Builder-4 report
- Review: README.md in builder-4-foundation/
- Reference: docs/cli-usage.md

**Orchestrator Integration:**
- Contact: Builder-3
- Check: Event emitter implementation
- Test: Orchestrator independently

**Prompt Quality:**
- Contact: Builder-2 or Sub-builder 2A
- Review: System prompts in src/lib/prompts/
- Reference: docs/quality-rubric.md

**Database Issues:**
- Contact: Builder-1
- Check: Prisma schema and migrations
- Test: Prisma Studio

---

**Integration Guide Version:** 1.0
**Last Updated:** January 2025
**Builder:** Builder-4
