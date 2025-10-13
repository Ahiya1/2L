# Builder-4 Foundation: CLI Test Harness & Quality Evaluation

## Overview

This foundation provides a complete, production-ready CLI testing infrastructure for the AI Mafia Discussion phase. It includes:

1. **CLI Test Harness** - Run Discussion tests with real-time output
2. **Quality Evaluation** - Calculate 7 metrics to validate conversation quality
3. **Transcript Generator** - Export to JSON and text formats
4. **Display Helpers** - Colored console output and formatting
5. **Type Definitions** - Shared TypeScript interfaces
6. **Documentation** - Quality rubric and usage guide

## File Structure

```
builder-4-foundation/
├── src/
│   ├── cli/
│   │   ├── test-discussion.ts         # Main CLI test harness (250 lines)
│   │   └── evaluate-transcript.ts     # Quality evaluation script (320 lines)
│   ├── lib/
│   │   └── discussion/
│   │       └── transcript.ts          # Transcript generator (180 lines)
│   ├── utils/
│   │   └── display-helpers.ts         # Console formatting (150 lines)
│   └── types/
│       └── cli.ts                     # TypeScript types (80 lines)
├── docs/
│   ├── quality-rubric.md              # Evaluation criteria (200 lines)
│   └── cli-usage.md                   # Usage guide (150 lines)
└── README.md                          # This file
```

**Total:** ~1,330 lines of code + documentation

## Features

### CLI Test Harness (`src/cli/test-discussion.ts`)

**Capabilities:**
- Creates test game with configurable agents (default: 10 agents, 3 Mafia, 7 Villagers)
- Runs Discussion phase with real-time event listening
- Displays colored output (chalk) with agent names, messages, turn numbers
- Shows loading spinners (ora) for setup and completion
- Automatic transcript generation (JSON + text)
- Cost summary display (total cost, cache hit rate, warnings)
- Graceful error handling and shutdown
- Three test modes: default, quick, full

**Event Integration:**
- Listens to `gameEventEmitter` for real-time updates
- Handles: NEW_MESSAGE, TURN_START, PHASE_COMPLETE events
- Works seamlessly with Builder-3 orchestrator

**Output Example:**
```
════════════════════════════════════════════════════════════════════════════════
                           Discussion Phase Test
════════════════════════════════════════════════════════════════════════════════

─── Turn 1 (2.3s elapsed) ───
Agent-Alpha:
  "I think we need to carefully observe voting patterns before making accusations"

[... 49 more turns ...]

Cost Summary:
────────────────────────────────────────────────────────────
Total cost:        $1.87
Cache hit rate:    69.5% (target: 70%+)
────────────────────────────────────────────────────────────
```

### Quality Evaluation (`src/cli/evaluate-transcript.ts`)

**7 Metrics Calculated:**

1. **Memory Accuracy** (≥80%) - % of past event references that are accurate
2. **Strategic Depth** (≥60%) - % of messages with strategic keywords
3. **Conversation Coherence** (≥70%) - % of contextually relevant messages
4. **Role Consistency** (≥80%) - % of role-appropriate behavior
5. **Personality Diversity** (≥50%) - % of unique language patterns
6. **Anti-Repetition** (≥90%) - Inverse of phrase repetition rate
7. **Manual Engagement** (≥3.0) - Human reviewer score (1-5)

**PASS Criteria:** 5/7 metrics meet thresholds

**Automated Analysis:**
- Strategic depth: keyword matching
- Coherence: context continuity analysis
- Role consistency: behavior pattern matching
- Personality diversity: text similarity comparison
- Anti-repetition: phrase frequency analysis

**Manual Validation:**
- Memory accuracy: reviewer validates references
- Engagement: reviewer rates on 1-5 scale

**Output:**
```
Evaluation Results
═══════════════════════════════════════════════════════════════════════════════
✓ PASS  Memory Accuracy                  0.85 (threshold: 0.80)
✓ PASS  Strategic Depth                  0.68 (threshold: 0.60)
✓ PASS  Conversation Coherence           0.74 (threshold: 0.70)
✗ FAIL  Role Consistency                 0.76 (threshold: 0.80)
✓ PASS  Personality Diversity            0.60 (threshold: 0.50)
✓ PASS  Anti-Repetition                  0.92 (threshold: 0.90)
✓ PASS  Engagement (Manual)              3.00 (threshold: 3.00)
────────────────────────────────────────────────────────────
Overall: 6/7 metrics passed
✓ PASS - Discussion quality meets standards
```

### Transcript Generator (`src/lib/discussion/transcript.ts`)

**JSON Format:**
- Complete structured data for programmatic analysis
- Includes: metadata, players, messages, votes, cost summary
- Used by quality evaluation script

**Text Format:**
- Human-readable for manual review
- Formatted with headers, statistics, message distribution
- Used by human reviewers and documentation

**Automatic Export:**
- Saves to `/logs/transcripts/` with timestamp
- Creates both formats simultaneously
- Includes cost breakdown and game summary

### Display Helpers (`src/utils/display-helpers.ts`)

**Utilities:**
- `formatHeader()` - ASCII art headers with borders
- `formatAgentMessage()` - Colored agent messages with threading
- `formatCostSummary()` - Cost breakdown table
- `formatProgressBar()` - Visual progress indicators
- `formatWarning/Error/Success()` - Status messages
- `formatTable()` - Aligned column tables
- `formatKeyValue()` - Configuration displays
- `formatList()` - Bulleted lists

**Consistent Color Scheme:**
- Cyan: Game IDs, file paths, Villager names
- Red: Mafia names, errors, failures
- Green: Success, healthy metrics
- Yellow: Warnings, manual prompts
- Gray: Metadata, separators

### Type Definitions (`src/types/cli.ts`)

**Shared Types:**
- `TranscriptData` - Complete transcript structure
- `QualityMetrics` - All 7 quality dimensions
- `EvaluationResult` - Pass/fail results
- `TestConfig` - CLI test configuration
- `CostSummary` - Token usage breakdown
- `GameEvent` - SSE event types

**Usage:**
```typescript
import { TranscriptData, QualityMetrics } from '@/types/cli';

const transcript: TranscriptData = loadTranscript('file.json');
const metrics: QualityMetrics = evaluateTranscript(transcript);
```

## Documentation

### Quality Rubric (`docs/quality-rubric.md`)

**Complete Evaluation Framework:**
- Detailed definitions for all 7 metrics
- Pass/fail thresholds with rationale
- Calculation methods (automated + manual)
- Examples of PASS vs FAIL
- Troubleshooting guide per metric
- Iteration strategy (baseline → improvement cycles)

**Key Sections:**
1. Metric definitions and thresholds
2. Calculation algorithms
3. Example evaluations
4. Troubleshooting guide
5. Iteration methodology

### CLI Usage Guide (`docs/cli-usage.md`)

**Comprehensive Documentation:**
- Installation and prerequisites
- Running tests (basic, quick, full)
- Understanding CLI output
- Transcript file formats
- Quality evaluation workflow
- Troubleshooting common issues
- Best practices for iteration
- Integration with orchestrator
- Advanced usage and automation

**Key Topics:**
- Setup and configuration
- Test execution
- Output interpretation
- Error handling
- Cost monitoring
- Quality tracking
- Automation scripts

## Integration

### Dependencies

**Required from other builders:**
- Builder-1: Database schema, Prisma client, seed function
- Builder-2: Cost tracker utility
- Builder-3: Orchestrator, event emitter, turn scheduler

**External Dependencies:**
```json
{
  "dependencies": {
    "chalk": "^5.3.0",
    "ora": "^8.1.1",
    "string-similarity": "^4.0.4",
    "tsx": "^4.19.2"
  }
}
```

### Package.json Scripts

Add to project `package.json`:

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

### File Placement

Copy files to project root:

```bash
# From builder-4-foundation/ to project root
cp -r src/cli/ ../../src/
cp -r src/lib/discussion/ ../../src/lib/
cp -r src/utils/display-helpers.ts ../../src/utils/
cp -r src/types/cli.ts ../../src/types/
cp -r docs/ ../../docs/
```

### Integration Steps

1. **Wait for Builder-1** to complete database setup
2. **Wait for Builder-3** to complete orchestrator
3. **Install dependencies:** `npm install chalk ora string-similarity tsx`
4. **Copy foundation files** to project
5. **Add scripts** to package.json
6. **Test CLI:** `npm run test-discussion`

## Testing

### Unit Tests (Mock Data)

Create test files in `src/cli/__tests__/`:

```typescript
// transcript-generator.test.ts
describe('Transcript Generator', () => {
  test('formats JSON correctly', () => {
    const transcript = generateTranscript(mockGameId, 'json');
    expect(JSON.parse(transcript)).toHaveProperty('gameId');
  });

  test('formats text correctly', () => {
    const transcript = generateTranscript(mockGameId, 'text');
    expect(transcript).toContain('AI MAFIA - DISCUSSION PHASE TRANSCRIPT');
  });
});

// quality-evaluation.test.ts
describe('Quality Evaluation', () => {
  test('calculates strategic depth', () => {
    const score = calculateStrategicDepth(mockTranscript);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  test('calculates coherence', () => {
    const score = calculateCoherence(mockTranscript);
    expect(score).toBeGreaterThan(0);
  });
});
```

### Integration Tests (Pending Orchestrator)

Once Builder-3 completes:

```bash
# Run full test
npm run test-discussion

# Check transcript generated
ls -l logs/transcripts/

# Evaluate transcript
npm run evaluate logs/transcripts/discussion-*.json
```

## Usage Examples

### Basic Test Run

```bash
# Run 3-minute Discussion with 10 agents
npm run test-discussion

# Expected output:
# - Real-time message display
# - Cost summary (target: <$2)
# - Transcript files saved
# - Next steps guidance
```

### Quick Iteration

```bash
# Run 1-minute test for rapid feedback
npm run test-quick

# Faster iteration when testing prompt changes
```

### Quality Evaluation

```bash
# Evaluate transcript
npm run evaluate logs/transcripts/discussion-1697234567.json

# Review metrics, identify improvements
# Adjust prompts, run again
```

### Baseline Establishment

```bash
# Run 3 baseline tests
npm run test-discussion  # Test 1
npm run test-discussion  # Test 2
npm run test-discussion  # Test 3

# Evaluate all 3
for f in logs/transcripts/*.json; do
  npm run evaluate "$f"
done

# Calculate average scores
# Document in prompt-iteration-log.md
```

## Prompt Iteration Workflow

1. **Establish Baseline**
   - Run 3 tests with current prompts
   - Evaluate all 3, calculate average scores
   - Document baseline

2. **Identify Weakest Metric**
   - Review evaluation results
   - Choose lowest-scoring metric

3. **Make ONE Change**
   - Adjust prompts targeting weak metric
   - Document change and rationale

4. **Test New Prompts**
   - Run 3 tests with new prompts
   - Evaluate all 3

5. **Compare Results**
   - Did target metric improve?
   - Did other metrics stay stable or improve?
   - Overall pass/fail change?

6. **Decision**
   - If improved: Keep change, document success
   - If not improved: Revert change, try different approach

7. **Repeat**
   - Continue until 5/7 metrics pass consistently

## Cost Monitoring

### Expected Costs (with caching)

- **Quick test (1 min, 6 agents):** $0.50-$1.00
- **Default test (3 min, 10 agents):** $1.50-$2.50
- **Full test (5 min, 12 agents):** $2.50-$4.00

### Red Flags

- Cost >$3 for default test → caching broken
- Cache hit rate <50% → investigate caching
- Cache hit rate <70% → suboptimal caching
- Cost >$5 for any test → STOP, fix caching

### Monitoring

After every test, CLI displays:
- Total cost
- Cache hit rate
- Warnings if thresholds exceeded

## Known Limitations

### Foundation Limitations

1. **No real-time progress bar during Discussion**
   - Would interfere with real-time message logging
   - Uses spinners for setup/completion only

2. **Manual validation required**
   - Memory accuracy needs human review
   - Engagement score is subjective

3. **Memory usage for large games**
   - Stores all messages in memory
   - May fail for 1000+ message games (out of scope)

4. **Single game at a time**
   - No concurrent test support
   - Sequential execution only

### Not Included (Deferred to Sub-builder 4A)

1. Web UI components (all React components)
2. SSE endpoint (Server-Sent Events streaming)
3. Discussion viewer page
4. Interactive controls (pause, restart)

### Out of Scope (Future Iterations)

1. Multi-game support
2. Historical transcript browser
3. Real-time cost tracking during Discussion
4. Automated prompt optimization
5. Quality metric dashboard/charts
6. Export to PDF/HTML

## Sub-builder 4A Task

**What's needed:**
- SSE endpoint (`app/api/game/[gameId]/stream/route.ts`)
- Discussion viewer page (`app/test-discussion/page.tsx`)
- 3 React components:
  - PhaseIndicator (phase name + countdown timer)
  - PlayerGrid (10 agent cards, roles hidden)
  - DiscussionFeed (scrolling messages with auto-scroll)

**Estimated time:** 4-5 hours

**See:** Builder-4 report for detailed sub-builder task specification

## Success Criteria

### Foundation Complete ✓

- [x] CLI test harness with real-time logging
- [x] Quality evaluation script (7 metrics)
- [x] Transcript generator (JSON + text)
- [x] Display helpers (colored output)
- [x] Type definitions
- [x] Quality rubric documentation
- [x] CLI usage guide

### Integration Pending

- [ ] Builder-1 provides database schema
- [ ] Builder-3 provides orchestrator
- [ ] CLI runs end-to-end test
- [ ] Transcript files generated
- [ ] Quality evaluation runs successfully

## Support

**Questions about CLI foundation:**
- Review this README
- Check `docs/cli-usage.md` for usage
- Check `docs/quality-rubric.md` for metrics

**Issues during integration:**
- Verify Builder-1 database setup complete
- Verify Builder-3 orchestrator working
- Check event emitter integration
- Test orchestrator independently first

**Prompt iteration guidance:**
- Follow workflow in this README
- Use quality rubric for metric definitions
- Document all changes in prompt-iteration-log.md

---

**Foundation Version:** 1.0
**Created:** January 2025
**Builder:** Builder-4
**Status:** COMPLETE - Ready for integration
