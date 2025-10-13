# CLI Test Harness Usage Guide

## Installation

### Prerequisites
- Node.js 18+ installed
- Project dependencies installed (`npm install`)
- Database migrated (`npx prisma migrate dev`)
- Anthropic API key in `.anthropic-key.txt`

### Required Dependencies
```bash
npm install chalk@^5.3.0 ora@^8.1.1 string-similarity@^4.0.4 tsx@^4.19.2
```

### Scripts Configuration
Add to `package.json`:
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

## Running Discussion Tests

### Basic Test (Default Configuration)
```bash
npm run test-discussion
```

**Configuration:**
- 10 agents (3 Mafia, 7 Villagers)
- 3-minute duration
- 5 personalities (analytical, aggressive, cautious, social, suspicious)
- ~50 total turns

**Expected Duration:** 3-5 minutes
**Expected Cost:** $1.50-$2.50 (with caching)

### Quick Test (Faster Iteration)
```bash
npm run test-quick
```

**Configuration:**
- 6 agents (2 Mafia, 4 Villagers)
- 1-minute duration
- Fewer turns (~15-20)

**Use Case:** Rapid prompt iteration when testing specific changes
**Expected Duration:** 1-2 minutes
**Expected Cost:** $0.50-$1.00

### Full Test (Production Validation)
```bash
npm run test-full
```

**Configuration:**
- 12 agents (4 Mafia, 8 Villagers)
- 5-minute duration
- More turns (~80-100)

**Use Case:** Final validation before committing prompts
**Expected Duration:** 5-7 minutes
**Expected Cost:** $2.50-$4.00

---

## CLI Output

### Real-Time Display

The CLI displays messages as they're generated:

```
════════════════════════════════════════════════════════════════════════════════
                           Discussion Phase Test
════════════════════════════════════════════════════════════════════════════════
Testing 10 agents (3 Mafia, 7 Villagers)
Duration: 180 seconds

✓ Game created: game-abc123def456

Starting Discussion Phase...

────────────────────────────────────────────────────────────────────────────────

─── Turn 1 (2.3s elapsed) ───
Agent-Alpha:
  "I think we need to carefully observe voting patterns before making accusations"

─── Turn 2 (4.8s elapsed) ───
Agent-Bravo:
  "I agree with Alpha. Let's focus on facts, not emotions"
  └─ replying to Agent-Alpha

─── Turn 3 (7.1s elapsed) ───
Agent-Charlie:
  "Actually, I find Bravo's quick agreement suspicious. Why so defensive?"
  └─ replying to Agent-Bravo

[... 47 more turns ...]

✓ Discussion phase complete

────────────────────────────────────────────────────────────────────────────────

✓ Transcript saved

════════════════════════════════════════════════════════════════════════════════
                              Test Complete
════════════════════════════════════════════════════════════════════════════════

Duration:       182.4s
Total turns:    50
Avg turn time:  3.65s

Cost Summary:
────────────────────────────────────────────────────────────
Input tokens:      45,230
Cached tokens:     31,450 (69.5%)
Output tokens:     8,120

────────────────────────────────────────────────────────────
Total cost:        $1.87
Avg per turn:      $0.0374
Cache hit rate:    69.5% (target: 70%+)
────────────────────────────────────────────────────────────
⚠️  Cost and caching: ISSUE DETECTED

⚠️  Cache hit rate below 70% - check configuration!
    Current: 69.5% (expected: 70-90%)

Transcripts:
  JSON: /path/to/logs/transcripts/discussion-1697234567.json
  Text: /path/to/logs/transcripts/discussion-1697234567.txt

Next Steps:
  1. Review transcript: cat /path/to/logs/transcripts/discussion-1697234567.txt
  2. Evaluate quality: npm run evaluate /path/to/logs/transcripts/discussion-1697234567.json
  3. Run another test: npm run test-discussion
```

### Color Coding

- **Cyan:** Game IDs, file paths, agent names (Villagers)
- **Red:** Agent names (Mafia), errors, warnings
- **Green:** Success messages, healthy metrics
- **Yellow:** Warnings, manual input prompts
- **Gray:** Metadata, separators, timestamps

---

## Transcript Files

### JSON Format (`discussion-<timestamp>.json`)

Structured data for programmatic analysis:

```json
{
  "gameId": "game-abc123def456",
  "timestamp": "2025-01-15T14:32:10.123Z",
  "metadata": {
    "playerCount": 10,
    "mafiaCount": 3,
    "villagerCount": 7,
    "totalTurns": 50,
    "durationSeconds": 182.4,
    "avgMessageLength": 24.3,
    "cost": {
      "totalCost": 1.87,
      "totalInputTokens": 45230,
      "totalCachedTokens": 31450,
      "totalOutputTokens": 8120,
      "cacheHitRate": 0.695,
      "avgCostPerTurn": 0.0374
    }
  },
  "players": [
    {
      "name": "Agent-Alpha",
      "role": "VILLAGER",
      "personality": "analytical",
      "isAlive": true,
      "position": 0
    },
    ...
  ],
  "messages": [
    {
      "turn": 1,
      "roundNumber": 1,
      "playerName": "Agent-Alpha",
      "message": "I think we need to carefully observe voting patterns...",
      "timestamp": "2025-01-15T14:29:32.456Z",
      "inReplyToId": null,
      "inReplyToPlayer": null
    },
    ...
  ],
  "votes": []
}
```

### Text Format (`discussion-<timestamp>.txt`)

Human-readable format for manual review:

```
═══════════════════════════════════════════════════════════════════════════════
           AI MAFIA - DISCUSSION PHASE TRANSCRIPT
═══════════════════════════════════════════════════════════════════════════════

Game ID: game-abc123def456
Date: 2025-01-15T14:32:10.123Z
Duration: 182.4s

COST SUMMARY:
  Total Cost: $1.87
  Cache Hit Rate: 69.5%
  Avg Cost per Turn: $0.0374
  Input Tokens: 45,230
  Cached Tokens: 31,450
  Output Tokens: 8,120

PLAYERS:
  1. Agent-Alpha  - VILLAGER   (analytical, Alive)
  2. Agent-Bravo  - MAFIA      (aggressive, Alive)
  ...

═══════════════════════════════════════════════════════════════════════════════
CONVERSATION (50 messages)
═══════════════════════════════════════════════════════════════════════════════

[Round 1, Turn 1] 2:29:32 PM
Agent-Alpha:
"I think we need to carefully observe voting patterns..."

[Round 1, Turn 2] 2:29:35 PM
Agent-Bravo:
  (replying to Agent-Alpha)
"I agree with Alpha. Let's focus on facts, not emotions"

[...]

═══════════════════════════════════════════════════════════════════════════════
STATISTICS
═══════════════════════════════════════════════════════════════════════════════

Total Messages: 50
Average Message Length: 24.3 words
Messages per Player: 5.0

Messages per Player:
  Agent-Alpha   6 messages (12.0%)
  Agent-Bravo   5 messages (10.0%)
  ...

═══════════════════════════════════════════════════════════════════════════════
END OF TRANSCRIPT
═══════════════════════════════════════════════════════════════════════════════
```

---

## Quality Evaluation

### Basic Evaluation
```bash
npm run evaluate logs/transcripts/discussion-1697234567.json
```

**Output:**
```
═══════════════════════════════════════════════════════════════════════════════
                    DISCUSSION QUALITY EVALUATION
═══════════════════════════════════════════════════════════════════════════════

Transcript: logs/transcripts/discussion-1697234567.json

Game Summary:
  Players: 10
  Messages: 50
  Cost: $1.87
  Cache hit rate: 69.5%


Calculating Quality Metrics...
────────────────────────────────────────────────────────────────────────────────


Memory Accuracy Validation (3 references)

Reference 1/3:
Agent-Charlie: "Agent-Bravo voted for Agent-Delta in Round 2"
(Round 3, Turn 12)
✓ Auto-validated: Vote record found

Reference 2/3:
Agent-Echo: "Previously, Alpha defended Bravo without reason"
(Round 4, Turn 23)
Is this reference accurate? (y/n/skip): y

[...]


Manual Engagement Evaluation
────────────────────────────────────────────────────────────────────────────────
Rate the conversation on a scale of 1-5:
  1 = Boring, robotic, repetitive
  2 = Somewhat interesting, but lacks depth
  3 = Acceptable, shows strategy and variety
  4 = Engaging, strategic, natural flow
  5 = Fascinating, would watch as entertainment

Enter score (1-5): 3


Evaluation Results
═══════════════════════════════════════════════════════════════════════════════
✓ PASS  Memory Accuracy                  0.85 (threshold: 0.80)
✓ PASS  Strategic Depth                  0.68 (threshold: 0.60)
✓ PASS  Conversation Coherence           0.74 (threshold: 0.70)
✗ FAIL  Role Consistency                 0.76 (threshold: 0.80)
✓ PASS  Personality Diversity            0.60 (threshold: 0.50)
✓ PASS  Anti-Repetition                  0.92 (threshold: 0.90)
✓ PASS  Engagement (Manual)              3.00 (threshold: 3.00)
────────────────────────────────────────────────────────────────────────────────
Overall: 6/7 metrics passed
✓ PASS - Discussion quality meets standards
═══════════════════════════════════════════════════════════════════════════════


Recommendations for Improvement
────────────────────────────────────────────────────────────────────────────────

roleConsistency:
  • Strengthen role-specific strategies in prompt
  • Add explicit "don'ts" for each role
  • Test prompts with role-specific examples

────────────────────────────────────────────────────────────────────────────────

Evaluation saved: logs/transcripts/evaluations/discussion-1697234567-evaluation.json
```

### Batch Evaluation
Evaluate multiple transcripts:

```bash
# Evaluate all transcripts in directory
for file in logs/transcripts/*.json; do
  npm run evaluate "$file"
done
```

---

## Troubleshooting

### Error: "Transcript file not found"

**Cause:** File path incorrect or transcript not generated

**Solution:**
```bash
# List available transcripts
ls -l logs/transcripts/

# Use absolute path
npm run evaluate /full/path/to/transcript.json
```

### Error: "Database query failed"

**Cause:** Database not migrated or schema outdated

**Solution:**
```bash
# Reset database
npx prisma migrate reset

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### Error: "API key not found"

**Cause:** `.anthropic-key.txt` missing or empty

**Solution:**
```bash
# Create API key file
echo "sk-ant-your-key-here" > .anthropic-key.txt

# Verify
cat .anthropic-key.txt
```

### Warning: "Cost exceeded $3"

**Cause:** Prompt caching not working correctly

**Diagnosis:**
1. Check cache hit rate in output (should be 70%+)
2. If <50%, caching is broken

**Solution:**
1. Review system prompt structure (see `patterns.md`)
2. Ensure `cache_control: { type: 'ephemeral' }` on system prompt
3. Verify game state is stable (not changing every turn)
4. Test with single agent first:
   ```bash
   # Manual API test
   npx tsx scripts/test-caching.ts
   ```

### Warning: "Cache hit rate below 70%"

**Cause:** Context changing too much between turns

**Solution:**
1. Reduce "fresh" context (last 20-30 messages, not all)
2. Keep system prompt and game state stable
3. Only include recent messages in non-cached section
4. Review context builder implementation

### CLI hangs during execution

**Cause:** Orchestrator deadlock or API timeout

**Solution:**
1. Press `Ctrl+C` to interrupt
2. Check logs for last message
3. Review orchestrator timeout logic (should be 10s max per turn)
4. Test orchestrator independently:
   ```bash
   npx tsx scripts/test-orchestrator.ts
   ```

### Partial transcript (incomplete test)

**Cause:** Test interrupted or error during execution

**Solution:**
1. Check for error messages in console
2. Review partial transcript in logs
3. Check database for game state:
   ```bash
   npx prisma studio
   # Check games table, messages table
   ```
4. Re-run test from scratch

---

## Best Practices

### Baseline Testing
Before making prompt changes:
1. Run 3 baseline tests
2. Evaluate all 3 transcripts
3. Calculate average scores
4. Document baseline in `docs/prompt-iteration-log.md`

### Iterative Testing
When adjusting prompts:
1. Make ONE change at a time
2. Run 3 tests with new prompt
3. Evaluate and compare to baseline
4. Keep change if metrics improve, revert if not
5. Document change and results

### Cost Monitoring
After every test:
1. Check cost displayed (should be <$2)
2. Check cache hit rate (should be >70%)
3. If costs spike, investigate immediately
4. Track costs in spreadsheet for trends

### Quality Tracking
Maintain a log:
```
Date       | Version | Memory | Strategy | Coherence | Role | Personality | Repetition | Engagement | Pass
-----------|---------|--------|----------|-----------|------|-------------|------------|------------|------
2025-01-15 | v1.0    | 0.85   | 0.68     | 0.74      | 0.76 | 0.60        | 0.92       | 3.0        | 6/7
2025-01-16 | v1.1    | 0.88   | 0.72     | 0.76      | 0.82 | 0.62        | 0.93       | 3.5        | 7/7
```

---

## Integration with Orchestrator

### Event Emitter Integration

The CLI listens to `gameEventEmitter` from Builder-3:

```typescript
import { gameEventEmitter } from '@/lib/events/emitter';

// Listen for messages
gameEventEmitter.on('message', (data) => {
  if (data.gameId === currentGameId && data.type === 'NEW_MESSAGE') {
    console.log(formatAgentMessage(data.payload));
  }
});

// Listen for phase completion
gameEventEmitter.on('phase_complete', (data) => {
  if (data.gameId === currentGameId) {
    console.log('Discussion complete');
  }
});
```

### Orchestrator Invocation

The CLI calls orchestrator directly:

```typescript
import { orchestrateDiscussionPhase } from '@/lib/discussion/turn-scheduler';

// Run Discussion phase
await orchestrateDiscussionPhase(gameId, durationMinutes);
```

### Cost Tracker Integration

The CLI displays cost summary from cost tracker:

```typescript
import { costTracker } from '@/utils/cost-tracker';

// Get summary after Discussion completes
const summary = costTracker.getGameSummary(gameId);

console.log(formatCostSummary(summary));
```

---

## Advanced Usage

### Custom Configuration

Edit `src/cli/test-discussion.ts` to customize:

```typescript
const CUSTOM_CONFIG: TestConfig = {
  playerCount: 8,           // 8 agents
  mafiaCount: 2,            // 2 Mafia
  durationMinutes: 2,       // 2 minutes
  personalities: [          // Custom personalities
    'analytical',
    'aggressive',
    'paranoid',
    'logical',
  ],
};

runTest(CUSTOM_CONFIG);
```

### Automated Test Runs

Run multiple tests in sequence:

```bash
#!/bin/bash
# run-test-suite.sh

for i in {1..5}; do
  echo "Running test $i/5..."
  npm run test-discussion

  # Evaluate latest transcript
  latest=$(ls -t logs/transcripts/*.json | head -1)
  npm run evaluate "$latest"

  # Wait 10 seconds between tests
  sleep 10
done

echo "Test suite complete"
```

### Export Results to CSV

Extract metrics from evaluations:

```bash
# Extract scores from evaluation files
find logs/transcripts/evaluations -name "*.json" -exec jq -r \
  '[.timestamp, .passCount, .overallPass] | @csv' {} \; > results.csv
```

---

## FAQ

**Q: How long should a test take?**
A: 3-minute test = 3-5 minutes real time (API latency), 1-minute test = 1-2 minutes

**Q: How much does each test cost?**
A: With caching: $1.50-$2.50. Without caching: $5-$10 (indicates problem)

**Q: How many tests should I run before iterating prompts?**
A: Run 3 tests minimum to establish consistent baseline

**Q: What if all metrics fail?**
A: Start with basic prompts from `patterns.md`, test one agent first, then scale up

**Q: Can I run tests in parallel?**
A: Not recommended - SQLite WAL mode supports concurrent reads but serial writes safer

**Q: How do I know if caching is working?**
A: Cache hit rate should be 70-90% after first turn. If 0%, caching broken.

**Q: What if engagement score is always low (<3)?**
A: This is hardest metric to fix - requires holistic prompt improvement and iteration

**Q: Can I skip manual evaluation steps?**
A: Memory accuracy and engagement require manual validation - no way to fully automate

---

## Support

**Issues with CLI:**
- Check Builder-4 foundation code in `.2L/plan-1/iteration-1/building/builder-4-foundation/`
- Review this usage guide
- Check `docs/quality-rubric.md` for metric definitions

**Issues with Orchestrator:**
- Check Builder-3 code and integration
- Verify event emitter is working
- Test orchestrator independently

**Issues with Prompts:**
- Check Builder-2 code and system prompts
- Review `patterns.md` for prompt patterns
- Consult `docs/prompt-iteration-log.md` for change history

---

**CLI Version:** 1.0
**Last Updated:** January 2025
**Owner:** Builder-4
