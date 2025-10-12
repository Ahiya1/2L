// lib/formatter.js

/**
 * Format statistics numbers with thousand separators
 * @param {Object} stats - Raw statistics object
 * @returns {Object} Formatted statistics with string numbers
 */
export function formatStats(stats) {
  return {
    stars: stats.stars.toLocaleString('en-US'),
    forks: stats.forks.toLocaleString('en-US'),
    issues: stats.issues.toLocaleString('en-US'),
    watchers: stats.watchers.toLocaleString('en-US')
  };
}

/**
 * Display formatted statistics to terminal
 * @param {string} repository - Repository identifier (owner/repo)
 * @param {Object} formatted - Formatted statistics object
 */
export function displayStats(repository, formatted) {
  const separator = '─'.repeat(40);

  console.log(`\nRepository: ${repository}`);
  console.log(separator);
  console.log(`Stars:        ${formatted.stars.padStart(10)}`);
  console.log(`Forks:        ${formatted.forks.padStart(10)}`);
  console.log(`Open Issues:  ${formatted.issues.padStart(10)}`);
  console.log(`Watchers:     ${formatted.watchers.padStart(10)}`);
  console.log(separator);
  console.log(); // Extra newline for spacing
}
