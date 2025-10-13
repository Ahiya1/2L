# Prompt Testing Guide

This document provides a methodology for testing and evaluating prompt changes in the AI Mafia game.

## Overview

When making significant changes to system prompts (personalities, tactics, strategies), it's critical to validate that the changes improve (or at least maintain) game quality without introducing regressions.

## A/B Testing Methodology

### Setup

1. **Baseline (Control Group)**
   - Run 5 games with the **original prompts** (5 personalities, 6 tactics/strategies)
   - Use consistent game configuration:
     - 5 players total
     - 2 Mafia, 3 Villagers
     - Same seed for random personality assignment (if applicable)
     - 40 turns per discussion phase

2. **Treatment Group**
   - Run 5 games with the **new prompts** (10 personalities, 10 tactics/strategies)
   - Use the same game configuration as baseline
   - Keep all other variables identical

### Running Tests

**Baseline Games:**
```bash
# Tag games for tracking
cd app
npm run test:full-game  # Run 5 times, record game IDs
# Example: game-baseline-1, game-baseline-2, ...
```

**Treatment Games:**
```bash
# After deploying new prompts
npm run test:full-game  # Run 5 times, record game IDs
# Example: game-treatment-1, game-treatment-2, ...
```

### Data Collection

For each game, collect:
- **Game ID** - Unique identifier
- **Winner** - Mafia or Villagers
- **Duration** - Total game time (minutes)
- **Cost** - Total API cost ($)
- **Cache hit rate** - Percentage of cached tokens
- **Transcript** - Full game log for qualitative analysis

## Evaluation Metrics

### Quantitative Metrics

Use the `evaluate-transcript.ts` script to measure the 7 success criteria:

```bash
npm run evaluate -- <game-id>
```

**Metrics Evaluated:**

1. **Multi-turn discussion with logical responses**
   - Score: 0-10 (consistency of reasoning)
   - Threshold: ≥7/10

2. **Mafia coordination (private) + convincing lies (public)**
   - Score: 0-10 (deception quality)
   - Threshold: ≥7/10

3. **Villager deduction detects patterns and builds cases**
   - Score: 0-10 (deduction depth)
   - Threshold: ≥7/10

4. **Natural conversation flow (not robotic)**
   - Score: 0-10 (human-like dialogue)
   - Threshold: ≥7/10

5. **Memory accuracy (agents reference past events correctly)**
   - Score: 0-10 (consistency of references)
   - Threshold: ≥8/10

6. **Complete playthrough (game reaches win condition reliably)**
   - Binary: Pass/Fail
   - Threshold: 100% pass rate

7. **Fascinating to watch (spectators engaged, strategy visible)**
   - Score: 0-10 (subjective engagement)
   - Threshold: ≥7/10

**Aggregate Scoring:**
- Calculate **average score** across all 7 metrics per game
- **Pass threshold:** ≥5 out of 7 metrics meet their individual thresholds

### Qualitative Metrics

Manual review of transcripts to assess:

1. **Personality Diversity**
   - Are the 10 personalities distinguishable?
   - Do new personalities (sarcastic, diplomatic, emotional, logical, impulsive) exhibit unique traits?
   - Metric: % of messages where personality is identifiable (target: >50%)

2. **Anti-Repetition Effectiveness**
   - Count instances of verbatim phrase repetition (3-word phrases)
   - Baseline: Expected repetition rate ~15-20% without tracking
   - Target: <10% repetition rate with anti-repetition tracking

3. **Strategic Depth**
   - Do agents use the expanded tactics/strategies effectively?
   - Are new Mafia tactics (7-10) observable in gameplay?
   - Are new Villager strategies (7-10) observable in gameplay?

4. **Game Balance**
   - Win rate: Mafia vs Villagers
   - Baseline: ~50/50 (balanced game)
   - Treatment: Should remain ~50/50 (no significant shift)

### Performance Metrics

Compare baseline vs treatment:

1. **Cost per game**
   - Baseline: $X.XX (measured)
   - Treatment: $X.XX (measured)
   - Target: <$5 per game, ideally <$2

2. **Cache hit rate**
   - Baseline: X% (measured)
   - Treatment: X% (measured)
   - Target: ≥70% (optimal cost efficiency)

3. **Game duration**
   - Baseline: X minutes (measured)
   - Treatment: X minutes (measured)
   - Expected: Similar duration (±10%)

## Evaluation Script Usage

### Running Evaluation

```bash
# Evaluate a single game
npm run evaluate -- game-abc123

# Batch evaluate multiple games
for game_id in game-baseline-{1..5}; do
  npm run evaluate -- $game_id >> baseline-results.txt
done

for game_id in game-treatment-{1..5}; do
  npm run evaluate -- $game_id >> treatment-results.txt
done
```

### Analyzing Results

```bash
# Compare average scores
cat baseline-results.txt | grep "Overall Score" | awk '{sum+=$NF; count+=1} END {print "Baseline Avg:", sum/count}'
cat treatment-results.txt | grep "Overall Score" | awk '{sum+=$NF; count+=1} END {print "Treatment Avg:", sum/count}'
```

## Rollback Criteria

**Trigger rollback if ANY of the following occur:**

1. **Critical Regressions**
   - <3 out of 7 metrics pass thresholds (down from ≥5 baseline)
   - Complete playthrough failure rate >20% (1+ games don't finish)
   - Natural conversation score drops below 5/10 (robotic responses)

2. **Cost Explosion**
   - Cost per game exceeds $10 (double the hard limit)
   - Cache hit rate drops below 50% (significant cost impact)

3. **Game Balance Disruption**
   - Mafia win rate shifts to <30% or >70% (game becomes unfair)
   - Average game duration increases >50% (games drag on)

4. **User Experience Degradation**
   - "Fascinating to watch" score drops below 5/10
   - Personality diversity <30% (personalities indistinguishable)
   - Repetition rate >20% (worse than baseline)

**Rollback Procedure:**

1. Revert `src/lib/prompts/system-prompts.ts` to previous commit:
   ```bash
   git checkout HEAD~1 -- src/lib/prompts/system-prompts.ts
   ```

2. Remove anti-repetition tracking if causing issues:
   ```bash
   git checkout HEAD~1 -- src/utils/repetition-tracker.ts
   git checkout HEAD~1 -- src/lib/claude/context-builder.ts
   git checkout HEAD~1 -- src/lib/discussion/turn-executor.ts
   ```

3. Redeploy to production:
   ```bash
   npm run build
   railway up
   ```

4. Run verification game to confirm rollback succeeded:
   ```bash
   npm run test:full-game
   npm run evaluate -- <verification-game-id>
   ```

## Iteration and Refinement

If rollback is triggered, analyze failure modes:

### Common Issues and Fixes

**Issue: Personalities not distinct**
- **Cause:** Descriptions too similar
- **Fix:** Add more unique phrases per personality, emphasize contrasts
- **Re-test:** Run 2-3 games to validate personality diversity >50%

**Issue: Anti-repetition too aggressive**
- **Cause:** Prohibited phrases too restrictive
- **Fix:** Reduce tracked phrases from 5 to 3, or increase window from 20 to 30 phrases
- **Re-test:** Check repetition rate (target: 10-15%)

**Issue: Cost increase**
- **Cause:** System prompt length increased (10 personalities vs 5)
- **Fix:** Compress personality descriptions, remove redundant examples
- **Re-test:** Measure cache hit rate and cost per game

**Issue: Game balance shift**
- **Cause:** New tactics favor one role over the other
- **Fix:** Adjust Mafia/Villager strategy balance (e.g., add counter-tactics)
- **Re-test:** Run 10 games to measure win rate (target: 40-60%)

## Best Practices

1. **Always test locally first**
   - Run at least 3 local games before deploying to production
   - Use `npm run test:full-game` to validate end-to-end

2. **Deploy during low-traffic periods**
   - Schedule prompt changes when few users are active
   - Monitor first 5 production games closely

3. **Keep baselines for comparison**
   - Archive baseline game transcripts
   - Save evaluation results for future reference

4. **Document changes**
   - Record what changed in prompts
   - Note why changes were made
   - Track which metrics improved/regressed

5. **Gradual rollout**
   - If making multiple changes, deploy one at a time
   - Example: Deploy 10 personalities first, then anti-repetition in next iteration
   - Isolate which change caused improvement/regression

## Example Workflow

### Phase 1: Baseline Measurement
```bash
# Run 5 baseline games (original prompts)
for i in {1..5}; do
  npm run test:full-game
  # Record game ID: game-baseline-$i
done

# Evaluate baseline
for i in {1..5}; do
  npm run evaluate -- game-baseline-$i >> baseline-results.txt
done
```

### Phase 2: Deploy New Prompts
```bash
# Deploy changes to staging
git checkout -b prompt-expansion-test
# (Make prompt changes)
git commit -m "Expand personalities to 10, add anti-repetition"
git push origin prompt-expansion-test

# Build and test locally
npm run build
npm run test:full-game
```

### Phase 3: Treatment Measurement
```bash
# Run 5 treatment games (new prompts)
for i in {1..5}; do
  npm run test:full-game
  # Record game ID: game-treatment-$i
done

# Evaluate treatment
for i in {1..5}; do
  npm run evaluate -- game-treatment-$i >> treatment-results.txt
done
```

### Phase 4: Analysis
```bash
# Compare results
echo "=== Baseline Average ==="
cat baseline-results.txt | grep "Overall Score" | awk '{sum+=$NF; count+=1} END {print sum/count}'

echo "=== Treatment Average ==="
cat treatment-results.txt | grep "Overall Score" | awk '{sum+=$NF; count+=1} END {print sum/count}'

# If treatment >= baseline, proceed to production
# If treatment < baseline, analyze and rollback
```

### Phase 5: Production Deployment (if tests pass)
```bash
# Merge to main
git checkout main
git merge prompt-expansion-test
git push origin main

# Deploy to Railway
railway up

# Monitor first 5 production games
# Run evaluation on each to validate
```

## Summary

- **Test rigorously:** 5 baseline + 5 treatment games minimum
- **Measure objectively:** Use `evaluate-transcript.ts` for all 7 metrics
- **Set clear thresholds:** ≥5/7 metrics passing, cost <$5, cache ≥70%
- **Rollback decisively:** If critical criteria fail, revert immediately
- **Iterate thoughtfully:** Analyze failures, fix root cause, re-test

**Goal:** Improve game quality (personalities, anti-repetition, tactics) while maintaining cost efficiency and game balance.
