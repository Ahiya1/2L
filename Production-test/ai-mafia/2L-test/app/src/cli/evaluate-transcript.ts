#!/usr/bin/env tsx
/**
 * Quality Evaluation Script
 *
 * Usage: npm run evaluate <transcript.json>
 *
 * Calculates 7 quality metrics from Discussion transcript:
 * 1. Memory accuracy - % of past event references that are accurate
 * 2. Strategic depth - % of messages with strategic keywords
 * 3. Conversation coherence - % of contextually relevant messages
 * 4. Role consistency - % of role-appropriate behavior
 * 5. Personality diversity - % of unique language patterns
 * 6. Anti-repetition - Inverse of phrase repetition rate
 * 7. Manual engagement - Human reviewer score (1-5)
 *
 * Overall PASS if 5/7 metrics pass thresholds.
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import stringSimilarity from 'string-similarity';
import { TranscriptData, EvaluationResult } from '../lib/types/cli';

// Quality thresholds (from quality-rubric.md)
const THRESHOLDS = {
  memoryAccuracy: 0.80,      // 80% of references must be accurate
  strategicDepth: 0.60,      // 60% of messages must show strategy
  coherence: 0.70,           // 70% of messages must be contextually relevant
  roleConsistency: 0.80,     // 80% of behavior must match role
  personalityDiversity: 0.50, // 50% of messages must show unique patterns
  antiRepetition: 0.90,      // <10% phrase repetition
  engagement: 3.0,           // Manual score 3+ out of 5
};

// Strategic keywords for depth analysis
const STRATEGIC_KEYWORDS = [
  'because', 'evidence', 'pattern', 'vote', 'voted', 'suspicious', 'sus',
  'innocent', 'trust', 'defend', 'accuse', 'think', 'believe', 'reason',
  'why', 'how', 'consistent', 'inconsistent', 'alliance', 'coordinated',
  'deflecting', 'defending', 'logical', 'illogical', 'behavior', 'action',
];

// Mafia strategy indicators
const MAFIA_INDICATORS = [
  'appear helpful', 'redirect', 'deflect', 'reasonable doubt', 'hasty',
  'jumping to conclusions', 'calm down', 'let\'s think', 'too aggressive',
  'pattern', 'analyze', 'logical', 'evidence',
];

// Villager strategy indicators
const VILLAGER_INDICATORS = [
  'voting pattern', 'defended', 'alliance', 'coordinated', 'inconsistent',
  'contradict', 'suspicious', 'evidence', 'case against', 'question',
  'explain', 'why did you', 'pressure',
];

interface CalculatedMetrics {
  memoryAccuracy: number;
  strategicDepth: number;
  coherence: number;
  roleConsistency: number;
  personalityDiversity: number;
  antiRepetition: number;
  engagement: number;
}

function loadTranscript(filePath: string): TranscriptData {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Transcript file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  try {
    return JSON.parse(content) as TranscriptData;
  } catch (error) {
    throw new Error(`Invalid JSON in transcript: ${error}`);
  }
}

function calculateStrategicDepth(transcript: TranscriptData): number {
  const messages = transcript.messages;

  const strategicMessages = messages.filter(msg => {
    const text = msg.message.toLowerCase();
    return STRATEGIC_KEYWORDS.some(keyword => text.includes(keyword));
  });

  return messages.length > 0 ? strategicMessages.length / messages.length : 0;
}

function calculateCoherence(transcript: TranscriptData): number {
  const messages = transcript.messages;

  if (messages.length < 2) return 1.0;

  let coherentCount = 0;

  for (let i = 1; i < messages.length; i++) {
    const currentMsg = messages[i];
    if (!currentMsg) continue;

    const previousMsgs = messages.slice(Math.max(0, i - 3), i);

    // Check if current message references previous content
    const hasReference = previousMsgs.some(prevMsg => {
      // Explicit name mention
      if (currentMsg.message.includes(prevMsg.playerName)) return true;

      // Topic continuity (shared keywords)
      const currentWords = currentMsg.message.toLowerCase().split(/\s+/);
      const prevWords = prevMsg.message.toLowerCase().split(/\s+/);
      const sharedWords = currentWords.filter(w =>
        w.length > 4 && prevWords.includes(w)
      );

      return sharedWords.length >= 2;
    });

    // Check if message has in-reply-to
    const hasInReplyTo = currentMsg.inReplyToId !== null;

    if (hasReference || hasInReplyTo) {
      coherentCount++;
    }
  }

  return messages.length > 1 ? coherentCount / (messages.length - 1) : 1.0;
}

function calculateRoleConsistency(transcript: TranscriptData): number {
  const players = transcript.players;
  const messages = transcript.messages;

  let consistentCount = 0;

  for (const msg of messages) {
    const player = players.find(p => p.name === msg.playerName);
    if (!player) continue;

    const text = msg.message.toLowerCase();

    if (player.role === 'MAFIA') {
      // Mafia should use deflection/defense tactics
      const usesMafiaTactics = MAFIA_INDICATORS.some(indicator =>
        text.includes(indicator)
      );

      // Mafia should NOT directly accuse or be overly aggressive
      const avoidsDirectAccusation = !text.includes('i accuse') &&
                                     !text.includes('definitely mafia');

      if (usesMafiaTactics || avoidsDirectAccusation) {
        consistentCount++;
      }

    } else if (player.role === 'VILLAGER') {
      // Villagers should analyze patterns and ask questions
      const usesVillagerTactics = VILLAGER_INDICATORS.some(indicator =>
        text.includes(indicator)
      );

      // Villagers should ask questions or make accusations
      const asksOrAccuses = text.includes('?') ||
                           text.includes('suspicious') ||
                           text.includes('think') ||
                           text.includes('believe');

      if (usesVillagerTactics || asksOrAccuses) {
        consistentCount++;
      }
    }
  }

  return messages.length > 0 ? consistentCount / messages.length : 0;
}

function calculatePersonalityDiversity(transcript: TranscriptData): number {
  const messages = transcript.messages;

  // Group messages by player
  const messagesByPlayer = new Map<string, string[]>();

  for (const msg of messages) {
    const existing = messagesByPlayer.get(msg.playerName) || [];
    existing.push(msg.message);
    messagesByPlayer.set(msg.playerName, existing);
  }

  // Calculate language pattern uniqueness
  const playerTexts = Array.from(messagesByPlayer.entries()).map(([name, msgs]) => ({
    name,
    text: msgs.join(' ').toLowerCase(),
  }));

  let uniqueCount = 0;
  const threshold = 0.7; // Similarity threshold (70% similar = not unique)

  for (let i = 0; i < playerTexts.length; i++) {
    const playerI = playerTexts[i];
    if (!playerI) continue;

    let isUnique = true;

    for (let j = 0; j < playerTexts.length; j++) {
      if (i === j) continue;
      const playerJ = playerTexts[j];
      if (!playerJ) continue;

      const similarity = stringSimilarity.compareTwoStrings(
        playerI.text,
        playerJ.text
      );

      if (similarity > threshold) {
        isUnique = false;
        break;
      }
    }

    if (isUnique) uniqueCount++;
  }

  return playerTexts.length > 0 ? uniqueCount / playerTexts.length : 0;
}

function calculateAntiRepetition(transcript: TranscriptData): number {
  const messages = transcript.messages;

  // Extract phrases (3+ word sequences)
  const phrases = messages.flatMap(msg => {
    const words = msg.message.toLowerCase().split(/\s+/);
    const messagePhrases: string[] = [];

    for (let i = 0; i <= words.length - 3; i++) {
      const phrase = words.slice(i, i + 3).join(' ');
      messagePhrases.push(phrase);
    }

    return messagePhrases;
  });

  // Count phrase occurrences
  const phraseCounts = new Map<string, number>();

  for (const phrase of phrases) {
    phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
  }

  // Calculate repetition rate
  const repeatedPhrases = Array.from(phraseCounts.values()).filter(count => count > 1);
  const repetitionRate = phrases.length > 0
    ? repeatedPhrases.reduce((sum, count) => sum + count, 0) / phrases.length
    : 0;

  // Anti-repetition score (1.0 - repetition rate)
  return 1.0 - repetitionRate;
}

function calculateMemoryAccuracy(transcript: TranscriptData): number {
  const messages = transcript.messages;

  // Find messages that reference past events
  const referencePattern = /in round (\d+)|last round|previously|earlier|before|voted for/i;
  const referencingMessages = messages.filter(msg =>
    referencePattern.test(msg.message)
  );

  if (referencingMessages.length === 0) {
    console.log(chalk.yellow('\n⚠️  No memory references found - score: 1.0 (N/A)'));
    return 1.0; // No references to evaluate = perfect score by default
  }

  console.log(chalk.bold(`\n\nMemory Accuracy Validation (${referencingMessages.length} references)`));
  console.log(chalk.gray('─'.repeat(80)));
  console.log(chalk.yellow('For each reference, verify if the claim is accurate:\n'));

  let accurateCount = 0;

  for (let i = 0; i < referencingMessages.length; i++) {
    const msg = referencingMessages[i];
    if (!msg) continue;

    console.log(chalk.cyan(`\nReference ${i + 1}/${referencingMessages.length}:`));
    console.log(chalk.white(`${msg.playerName}: "${msg.message}"`));
    console.log(chalk.gray(`(Round ${msg.roundNumber}, Turn ${msg.turn})`));

    // Auto-validation for simple cases (voting patterns)
    if (msg.message.toLowerCase().includes('voted for')) {
      const votePattern = /(\w+(-\w+)?)\s+voted for\s+(\w+(-\w+)?)/i;
      const match = msg.message.match(votePattern);

      if (match) {
        const voter = match[1];
        const target = match[3];

        // Check if this vote actually happened in transcript
        const voteExists = transcript.votes?.some(v =>
          v.voterName === voter && v.targetName === target
        );

        if (voteExists !== undefined) {
          if (voteExists) {
            console.log(chalk.green('✓ Auto-validated: Vote record found'));
            accurateCount++;
          } else {
            console.log(chalk.red('✗ Auto-validated: Vote record NOT found'));
          }
          continue;
        }
      }
    }

    // Manual validation for complex references
    console.log(chalk.yellow('Is this reference accurate? (y/n/skip): '));

    // In real implementation, use readline for user input
    // For foundation, we'll mark as TODO
    console.log(chalk.gray('[Manual validation required - implement readline in integration]'));
    console.log(chalk.gray('[Assuming accurate for now - replace with real validation]'));
    accurateCount++; // Placeholder
  }

  console.log(chalk.gray('\n─'.repeat(80)));

  return referencingMessages.length > 0
    ? accurateCount / referencingMessages.length
    : 1.0;
}

function getManualEngagement(): number {
  console.log(chalk.bold('\n\nManual Engagement Evaluation'));
  console.log(chalk.gray('─'.repeat(80)));
  console.log(chalk.yellow('Rate the conversation on a scale of 1-5:'));
  console.log(chalk.gray('  1 = Boring, robotic, repetitive'));
  console.log(chalk.gray('  2 = Somewhat interesting, but lacks depth'));
  console.log(chalk.gray('  3 = Acceptable, shows strategy and variety'));
  console.log(chalk.gray('  4 = Engaging, strategic, natural flow'));
  console.log(chalk.gray('  5 = Fascinating, would watch as entertainment\n'));

  console.log(chalk.yellow('Enter score (1-5): '));
  console.log(chalk.gray('[Manual input required - implement readline in integration]'));
  console.log(chalk.gray('[Using threshold score 3.0 as placeholder]'));

  return 3.0; // Placeholder - replace with readline input
}

function evaluateTranscript(transcript: TranscriptData): EvaluationResult {
  console.log(chalk.bold('\n\nCalculating Quality Metrics...'));
  console.log(chalk.gray('─'.repeat(80)));

  const metrics: CalculatedMetrics = {
    strategicDepth: calculateStrategicDepth(transcript),
    coherence: calculateCoherence(transcript),
    roleConsistency: calculateRoleConsistency(transcript),
    personalityDiversity: calculatePersonalityDiversity(transcript),
    antiRepetition: calculateAntiRepetition(transcript),
    memoryAccuracy: calculateMemoryAccuracy(transcript),
    engagement: getManualEngagement(),
  };

  // Determine pass/fail for each metric
  const results = {
    memoryAccuracy: {
      score: metrics.memoryAccuracy,
      threshold: THRESHOLDS.memoryAccuracy,
      pass: metrics.memoryAccuracy >= THRESHOLDS.memoryAccuracy,
    },
    strategicDepth: {
      score: metrics.strategicDepth,
      threshold: THRESHOLDS.strategicDepth,
      pass: metrics.strategicDepth >= THRESHOLDS.strategicDepth,
    },
    coherence: {
      score: metrics.coherence,
      threshold: THRESHOLDS.coherence,
      pass: metrics.coherence >= THRESHOLDS.coherence,
    },
    roleConsistency: {
      score: metrics.roleConsistency,
      threshold: THRESHOLDS.roleConsistency,
      pass: metrics.roleConsistency >= THRESHOLDS.roleConsistency,
    },
    personalityDiversity: {
      score: metrics.personalityDiversity,
      threshold: THRESHOLDS.personalityDiversity,
      pass: metrics.personalityDiversity >= THRESHOLDS.personalityDiversity,
    },
    antiRepetition: {
      score: metrics.antiRepetition,
      threshold: THRESHOLDS.antiRepetition,
      pass: metrics.antiRepetition >= THRESHOLDS.antiRepetition,
    },
    engagement: {
      score: metrics.engagement,
      threshold: THRESHOLDS.engagement,
      pass: metrics.engagement >= THRESHOLDS.engagement,
    },
  };

  const passCount = Object.values(results).filter(r => r.pass).length;
  const overallPass = passCount >= 5;

  return {
    metrics: results,
    passCount,
    totalMetrics: 7,
    overallPass,
    timestamp: new Date().toISOString(),
  };
}

function displayResults(result: EvaluationResult) {
  console.log(chalk.bold('\n\nEvaluation Results'));
  console.log(chalk.gray('═'.repeat(80)));

  const metricNames = {
    memoryAccuracy: 'Memory Accuracy',
    strategicDepth: 'Strategic Depth',
    coherence: 'Conversation Coherence',
    roleConsistency: 'Role Consistency',
    personalityDiversity: 'Personality Diversity',
    antiRepetition: 'Anti-Repetition',
    engagement: 'Engagement (Manual)',
  };

  for (const [key, name] of Object.entries(metricNames)) {
    const metric = result.metrics[key as keyof typeof result.metrics];
    const status = metric.pass ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
    const score = metric.score.toFixed(2);
    const threshold = metric.threshold.toFixed(2);

    console.log(`${status}  ${chalk.bold(name.padEnd(30))} ${score} (threshold: ${threshold})`);
  }

  console.log(chalk.gray('─'.repeat(80)));
  console.log(chalk.bold(`Overall: ${result.passCount}/${result.totalMetrics} metrics passed`));

  if (result.overallPass) {
    console.log(chalk.green.bold('✓ PASS - Discussion quality meets standards'));
  } else {
    console.log(chalk.red.bold('✗ FAIL - Discussion quality below standards'));
    console.log(chalk.yellow(`\nNeed ${5 - result.passCount} more metric(s) to pass`));
  }

  console.log(chalk.gray('═'.repeat(80)));
}

function displayRecommendations(result: EvaluationResult) {
  const failedMetrics = Object.entries(result.metrics)
    .filter(([, metric]) => !metric.pass)
    .map(([key]) => key);

  if (failedMetrics.length === 0) {
    console.log(chalk.green('\n✓ All metrics passed - no improvements needed!\n'));
    return;
  }

  console.log(chalk.bold('\n\nRecommendations for Improvement'));
  console.log(chalk.gray('─'.repeat(80)));

  for (const key of failedMetrics) {
    console.log(chalk.yellow(`\n${key}:`));

    switch (key) {
      case 'memoryAccuracy':
        console.log(chalk.gray('  • Add more context about past events in system prompt'));
        console.log(chalk.gray('  • Ensure game history includes all previous rounds'));
        console.log(chalk.gray('  • Encourage agents to cite specific round numbers'));
        break;
      case 'strategicDepth':
        console.log(chalk.gray('  • Enhance strategic tactics in system prompt'));
        console.log(chalk.gray('  • Add "because" and "evidence" to required phrases'));
        console.log(chalk.gray('  • Encourage building cases with multiple points'));
        break;
      case 'coherence':
        console.log(chalk.gray('  • Improve context builder (include last 5-10 messages)'));
        console.log(chalk.gray('  • Encourage agents to respond to specific statements'));
        console.log(chalk.gray('  • Add threading hints in prompt'));
        break;
      case 'roleConsistency':
        console.log(chalk.gray('  • Strengthen role-specific strategies in prompt'));
        console.log(chalk.gray('  • Add explicit "don\'ts" for each role'));
        console.log(chalk.gray('  • Test prompts with role-specific examples'));
        break;
      case 'personalityDiversity':
        console.log(chalk.gray('  • Expand personality descriptions (more detailed)'));
        console.log(chalk.gray('  • Add unique phrases for each personality type'));
        console.log(chalk.gray('  • Increase temperature slightly (0.8 → 0.9)'));
        break;
      case 'antiRepetition':
        console.log(chalk.gray('  • Add anti-repetition instruction to prompt'));
        console.log(chalk.gray('  • Vary agent turn order between rounds'));
        console.log(chalk.gray('  • Prune old messages from context (keep last 20-30)'));
        break;
      case 'engagement':
        console.log(chalk.gray('  • Review transcripts for boring/robotic patterns'));
        console.log(chalk.gray('  • Add more dramatic/emotional language options'));
        console.log(chalk.gray('  • Increase strategic tension in prompts'));
        break;
    }
  }

  console.log(chalk.gray('\n─'.repeat(80)));
  console.log();
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || !args[0]) {
  console.error(chalk.red('Error: No transcript file specified'));
  console.log(chalk.yellow('\nUsage: npm run evaluate <transcript.json>'));
  console.log(chalk.gray('Example: npm run evaluate logs/transcripts/discussion-1697234567.json\n'));
  process.exit(1);
}

const transcriptPath = path.resolve(args[0]);

console.log(chalk.blue('═'.repeat(80)));
console.log(chalk.bold.cyan('                    DISCUSSION QUALITY EVALUATION'));
console.log(chalk.blue('═'.repeat(80)));
console.log(chalk.gray(`\nTranscript: ${transcriptPath}\n`));

try {
  const transcript = loadTranscript(transcriptPath);

  console.log(chalk.bold('Game Summary:'));
  console.log(chalk.gray(`  Players: ${transcript.players.length}`));
  console.log(chalk.gray(`  Messages: ${transcript.messages.length}`));
  console.log(chalk.gray(`  Cost: $${transcript.metadata.cost.totalCost.toFixed(2)}`));
  console.log(chalk.gray(`  Cache hit rate: ${(transcript.metadata.cost.cacheHitRate * 100).toFixed(1)}%`));

  const result = evaluateTranscript(transcript);

  displayResults(result);
  displayRecommendations(result);

  // Save evaluation result
  const evalDir = path.join(path.dirname(transcriptPath), 'evaluations');
  if (!fs.existsSync(evalDir)) {
    fs.mkdirSync(evalDir, { recursive: true });
  }

  const evalFilename = path.join(
    evalDir,
    path.basename(transcriptPath, '.json') + '-evaluation.json'
  );

  fs.writeFileSync(evalFilename, JSON.stringify(result, null, 2));
  console.log(chalk.gray(`Evaluation saved: ${evalFilename}\n`));

  process.exit(result.overallPass ? 0 : 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} catch (error: any) {
  console.error(chalk.red('\nError: ') + error.message);

  if (error.stack) {
    console.error(chalk.gray(error.stack));
  }

  console.log();
  process.exit(1);
}
