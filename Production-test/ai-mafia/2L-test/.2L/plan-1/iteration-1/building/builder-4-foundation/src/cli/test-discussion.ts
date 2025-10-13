#!/usr/bin/env tsx
/**
 * CLI Test Harness for Discussion Phase
 *
 * Usage: npm run test-discussion
 *
 * Creates a test game with 10 agents (3 Mafia, 7 Villagers),
 * runs a 3-minute Discussion phase, displays real-time output,
 * and generates a transcript file.
 */

import chalk from 'chalk';
import ora from 'ora';
import { orchestrateDiscussionPhase } from '@/lib/discussion/turn-scheduler';
import { seedTestGame } from '@/lib/db/seed';
import { gameEventEmitter } from '@/lib/events/emitter';
import { costTracker } from '@/utils/cost-tracker';
import { generateTranscript } from '@/lib/discussion/transcript';
import { formatCostSummary, formatHeader, formatAgentMessage } from '@/utils/display-helpers';
import fs from 'fs';
import path from 'path';

interface TestConfig {
  playerCount: number;
  mafiaCount: number;
  durationMinutes: number;
  personalities: string[];
}

const DEFAULT_CONFIG: TestConfig = {
  playerCount: 10,
  mafiaCount: 3,
  durationMinutes: 3,
  personalities: ['analytical', 'aggressive', 'cautious', 'social', 'suspicious'],
};

async function runTest(config: TestConfig = DEFAULT_CONFIG) {
  console.clear();

  // Header
  console.log(formatHeader('Discussion Phase Test'));
  console.log(chalk.gray(`Testing ${config.playerCount} agents (${config.mafiaCount} Mafia, ${config.playerCount - config.mafiaCount} Villagers)`));
  console.log(chalk.gray(`Duration: ${config.durationMinutes} minutes\n`));

  const spinner = ora('Setting up test game...').start();

  try {
    // 1. Create game and seed agents
    const gameId = await seedTestGame({
      playerCount: config.playerCount,
      mafiaCount: config.mafiaCount,
      personalities: config.personalities,
    });

    spinner.succeed(`Game created: ${chalk.cyan(gameId)}`);
    console.log();

    // 2. Set up event listeners for real-time logging
    let turnCount = 0;
    const startTime = Date.now();

    gameEventEmitter.on('message', (data) => {
      if (data.gameId === gameId && data.type === 'NEW_MESSAGE') {
        turnCount++;
        const msg = data.payload;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(formatAgentMessage(turnCount, msg, elapsed));
      }
    });

    gameEventEmitter.on('turn_start', (data) => {
      if (data.gameId === gameId) {
        process.stdout.write(chalk.gray(`  [${data.payload.playerName} is thinking...] `));
      }
    });

    gameEventEmitter.on('phase_complete', (data) => {
      if (data.gameId === gameId) {
        console.log(chalk.green('\n✓ Discussion phase complete\n'));
      }
    });

    // 3. Run Discussion phase
    console.log(chalk.bold('Starting Discussion Phase...\n'));
    console.log(chalk.gray('─'.repeat(80)) + '\n');

    await orchestrateDiscussionPhase(gameId, config.durationMinutes);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // 4. Generate transcript
    console.log(chalk.gray('─'.repeat(80)) + '\n');
    spinner.start('Generating transcript...');

    const transcriptJson = await generateTranscript(gameId, 'json');
    const transcriptText = await generateTranscript(gameId, 'text');

    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs', 'transcripts');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const jsonFilename = path.join(logsDir, `discussion-${timestamp}.json`);
    const textFilename = path.join(logsDir, `discussion-${timestamp}.txt`);

    fs.writeFileSync(jsonFilename, transcriptJson);
    fs.writeFileSync(textFilename, transcriptText);

    spinner.succeed('Transcript saved');

    // 5. Display summary
    console.log();
    console.log(formatHeader('Test Complete'));

    const summary = costTracker.getGameSummary(gameId);

    console.log(chalk.bold('Duration:       ') + chalk.yellow(`${duration}s`));
    console.log(chalk.bold('Total turns:    ') + chalk.yellow(turnCount.toString()));
    console.log(chalk.bold('Avg turn time:  ') + chalk.yellow(`${(parseFloat(duration) / turnCount).toFixed(2)}s`));
    console.log();

    console.log(formatCostSummary(summary));
    console.log();

    console.log(chalk.bold('Transcripts:'));
    console.log(chalk.gray('  JSON: ') + chalk.cyan(jsonFilename));
    console.log(chalk.gray('  Text: ') + chalk.cyan(textFilename));
    console.log();

    // Warnings
    if (summary.totalCost > 3.0) {
      console.log(chalk.red('⚠️  Cost exceeded $3.00 - investigate caching!'));
      console.log(chalk.red('    Expected: <$2.00 with 70%+ cache hit rate'));
      console.log();
    }

    if (summary.cacheHitRate < 0.7) {
      console.log(chalk.red('⚠️  Cache hit rate below 70% - check configuration!'));
      console.log(chalk.red(`    Current: ${(summary.cacheHitRate * 100).toFixed(1)}% (expected: 70-90%)`));
      console.log();
    }

    if (summary.totalCost <= 3.0 && summary.cacheHitRate >= 0.7) {
      console.log(chalk.green('✓ Cost and caching within acceptable range'));
      console.log();
    }

    // Next steps
    console.log(chalk.bold('Next Steps:'));
    console.log(chalk.gray('  1. Review transcript: ') + chalk.cyan(`cat ${textFilename}`));
    console.log(chalk.gray('  2. Evaluate quality: ') + chalk.cyan(`npm run evaluate ${jsonFilename}`));
    console.log(chalk.gray('  3. Run another test: ') + chalk.cyan('npm run test-discussion'));
    console.log();

    process.exit(0);

  } catch (error: any) {
    spinner.fail('Test failed');
    console.error(chalk.red('\nError: ') + error.message);

    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }

    console.log();
    console.log(chalk.yellow('Troubleshooting:'));
    console.log(chalk.gray('  - Ensure database is migrated: ') + chalk.cyan('npx prisma migrate dev'));
    console.log(chalk.gray('  - Check API key is set: ') + chalk.cyan('cat .anthropic-key.txt'));
    console.log(chalk.gray('  - Verify orchestrator is working: ') + chalk.cyan('Check Builder-3 integration'));
    console.log();

    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nTest interrupted by user'));
  console.log(chalk.gray('Partial transcript may be incomplete\n'));
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\nTest terminated'));
  process.exit(143);
});

// Parse command-line arguments (optional config override)
const args = process.argv.slice(2);
let config = DEFAULT_CONFIG;

if (args.includes('--quick')) {
  config = {
    ...DEFAULT_CONFIG,
    playerCount: 6,
    mafiaCount: 2,
    durationMinutes: 1,
  };
  console.log(chalk.yellow('Running quick test (6 agents, 1 minute)\n'));
}

if (args.includes('--full')) {
  config = {
    ...DEFAULT_CONFIG,
    playerCount: 12,
    mafiaCount: 4,
    durationMinutes: 5,
  };
  console.log(chalk.yellow('Running full test (12 agents, 5 minutes)\n'));
}

// Run the test
runTest(config).catch((error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
