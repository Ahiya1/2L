#!/usr/bin/env node
import { Command } from 'commander';
import { fetchRepoStats } from './lib/api-client.js';
import { formatStats, displayStats } from './lib/formatter.js';

const program = new Command();

program
  .name('ghstats')
  .description('Fetch GitHub repository statistics')
  .version('1.0.0')
  .argument('<repository>', 'Repository in format owner/repo')
  .action(async (repository) => {
    try {
      // Validate input format
      const pattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
      if (!pattern.test(repository)) {
        throw new Error(
          `Invalid repository format: "${repository}"\n` +
          `Expected format: owner/repo\n` +
          `Example: facebook/react`
        );
      }

      // Parse owner/repo
      const [owner, repo] = repository.split('/');

      // Show loading indicator
      console.log('Fetching repository statistics...\n');

      // Fetch stats from GitHub API
      const stats = await fetchRepoStats(owner, repo);

      // Format and display
      const formatted = formatStats(stats);
      displayStats(repository, formatted);

      // Exit successfully
      process.exit(0);

    } catch (error) {
      handleError(error, repository);
    }
  })
  .parse();

// Centralized error handler
function handleError(error, repository) {
  const errorPrefix = '\n✗ Error:';

  // Repository not found (404)
  if (error.message.includes('not found')) {
    console.error(`${errorPrefix} Repository '${repository}' not found`);
    console.error('\nPlease check:');
    console.error('  • Repository name spelling');
    console.error('  • Repository visibility (must be public)');
    console.error('  • Owner username\n');
    process.exit(1);
  }

  // Rate limit exceeded (403)
  if (error.message.includes('Rate limit exceeded')) {
    console.error(`${errorPrefix} ${error.message}`);
    console.error('\nUnauthenticated requests are limited to 60 per hour.');
    console.error('Wait for the reset time or consider authentication.\n');
    process.exit(1);
  }

  // Network timeout
  if (error.message.includes('timeout')) {
    console.error(`${errorPrefix} ${error.message}`);
    console.error('\nPlease check your internet connection and try again.\n');
    process.exit(1);
  }

  // Invalid input format
  if (error.message.includes('Invalid repository format')) {
    console.error(`${errorPrefix} ${error.message}\n`);
    process.exit(1);
  }

  // Generic network/unknown error
  console.error(`${errorPrefix} ${error.message}`);
  console.error('\nIf the problem persists, check GitHub API status.\n');
  process.exit(1);
}
