/**
 * Display Helpers for CLI
 *
 * Utilities for formatting colored console output, tables, and visual elements.
 */

import chalk from 'chalk';
import type { CostSummary } from '../lib/types/shared';

/**
 * Format a header with ASCII art border
 */
export function formatHeader(title: string): string {
  const width = 80;
  const border = chalk.blue('═'.repeat(width));
  const padding = ' '.repeat(Math.floor((width - title.length) / 2));

  return `${border}\n${padding}${chalk.bold.cyan(title)}\n${border}`;
}

/**
 * Format an agent message for CLI display
 */
export function formatAgentMessage(
  turnNumber: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any,
  elapsed: string
): string {
  const lines: string[] = [];

  // Turn header
  lines.push('');
  lines.push(chalk.gray(`─── Turn ${turnNumber} (${elapsed}s elapsed) ───`));

  // Agent name (with role color coding)
  const nameColor = message.player.role === 'MAFIA' ? chalk.red : chalk.cyan;
  lines.push(nameColor.bold(`${message.player.name}:`));

  // Message text
  lines.push(chalk.white(`  "${message.message}"`));

  // Reply indicator
  if (message.inReplyTo) {
    lines.push(chalk.gray(`  └─ replying to ${message.inReplyTo.player.name}`));
  }

  return lines.join('\n');
}

/**
 * Format cost summary as a table
 */
export function formatCostSummary(summary: CostSummary): string {
  const lines: string[] = [];

  lines.push(chalk.bold('Cost Summary:'));
  lines.push(chalk.gray('─'.repeat(60)));

  // Tokens
  lines.push(
    chalk.gray('Input tokens:      ') +
    chalk.white(summary.totalInputTokens.toLocaleString())
  );

  lines.push(
    chalk.gray('Cached tokens:     ') +
    chalk.green(summary.totalCachedTokens.toLocaleString()) +
    chalk.gray(` (${(summary.cacheHitRate * 100).toFixed(1)}%)`)
  );

  lines.push(
    chalk.gray('Output tokens:     ') +
    chalk.white(summary.totalOutputTokens.toLocaleString())
  );

  lines.push(chalk.gray('─'.repeat(60)));

  // Cost
  const costColor = summary.totalCost > 3.0 ? chalk.red : chalk.green;
  lines.push(
    chalk.gray('Total cost:        ') +
    costColor.bold(`$${summary.totalCost.toFixed(2)}`)
  );

  lines.push(
    chalk.gray('Avg per turn:      ') +
    chalk.white(`$${summary.avgCostPerTurn.toFixed(4)}`)
  );

  // Cache status
  const cacheColor = summary.cacheHitRate >= 0.7 ? chalk.green : chalk.red;
  lines.push(
    chalk.gray('Cache hit rate:    ') +
    cacheColor(`${(summary.cacheHitRate * 100).toFixed(1)}%`) +
    chalk.gray(` (target: 70%+)`)
  );

  lines.push(chalk.gray('─'.repeat(60)));

  // Status indicator
  if (summary.status === 'HEALTHY') {
    lines.push(chalk.green('✓ Cost and caching: HEALTHY'));
  } else {
    lines.push(chalk.red('⚠️  Cost and caching: ISSUE DETECTED'));
  }

  return lines.join('\n');
}

/**
 * Format a progress bar
 */
export function formatProgressBar(
  current: number,
  total: number,
  width: number = 40
): string {
  const percentage = Math.min(1, current / total);
  const filled = Math.floor(width * percentage);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const label = `${current}/${total} (${(percentage * 100).toFixed(0)}%)`;

  return `${bar} ${label}`;
}

/**
 * Format a warning message
 */
export function formatWarning(message: string, details?: string[]): string {
  const lines: string[] = [];

  lines.push(chalk.yellow('⚠️  ' + message));

  if (details && details.length > 0) {
    for (const detail of details) {
      lines.push(chalk.gray('    ' + detail));
    }
  }

  return lines.join('\n');
}

/**
 * Format an error message
 */
export function formatError(message: string, details?: string[]): string {
  const lines: string[] = [];

  lines.push(chalk.red('✗ ' + message));

  if (details && details.length > 0) {
    for (const detail of details) {
      lines.push(chalk.gray('    ' + detail));
    }
  }

  return lines.join('\n');
}

/**
 * Format a success message
 */
export function formatSuccess(message: string, details?: string[]): string {
  const lines: string[] = [];

  lines.push(chalk.green('✓ ' + message));

  if (details && details.length > 0) {
    for (const detail of details) {
      lines.push(chalk.gray('    ' + detail));
    }
  }

  return lines.join('\n');
}

/**
 * Format a table with aligned columns
 */
export function formatTable(
  headers: string[],
  rows: string[][],
  options: { colors?: string[]; align?: ('left' | 'right' | 'center')[] } = {}
): string {
  const { colors = [], align = [] } = options;

  // Calculate column widths
  const widths = headers.map((header, i) => {
    const cellWidths = rows.map(row => (row[i] || '').length);
    return Math.max(header.length, ...cellWidths);
  });

  const lines: string[] = [];

  // Header
  const headerLine = headers
    .map((header, i) => header.padEnd(widths[i] || 0))
    .join('  ');
  lines.push(chalk.bold(headerLine));

  // Separator
  lines.push(chalk.gray('─'.repeat(headerLine.length)));

  // Rows
  for (const row of rows) {
    const cells = row.map((cell, i) => {
      const alignment = align[i] || 'left';
      const width = widths[i] || 0;
      let aligned = cell;

      if (alignment === 'right') {
        aligned = cell.padStart(width);
      } else if (alignment === 'center') {
        const padding = width - cell.length;
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        aligned = ' '.repeat(leftPad) + cell + ' '.repeat(rightPad);
      } else {
        aligned = cell.padEnd(width);
      }

      // Apply color if specified
      const color = colors[i];
      if (color === 'green') return chalk.green(aligned);
      if (color === 'red') return chalk.red(aligned);
      if (color === 'yellow') return chalk.yellow(aligned);
      if (color === 'cyan') return chalk.cyan(aligned);
      if (color === 'gray') return chalk.gray(aligned);

      return aligned;
    });

    lines.push(cells.join('  '));
  }

  return lines.join('\n');
}

/**
 * Format a key-value list
 */
export function formatKeyValue(
  items: Record<string, string | number>,
  options: { keyColor?: string; valueColor?: string } = {}
): string {
  const { keyColor = 'gray', valueColor = 'white' } = options;

  const maxKeyLength = Math.max(...Object.keys(items).map(k => k.length));

  const lines = Object.entries(items).map(([key, value]) => {
    const paddedKey = key.padEnd(maxKeyLength);

    let coloredKey = paddedKey;
    if (keyColor === 'gray') coloredKey = chalk.gray(paddedKey);
    if (keyColor === 'cyan') coloredKey = chalk.cyan(paddedKey);
    if (keyColor === 'yellow') coloredKey = chalk.yellow(paddedKey);

    let coloredValue = String(value);
    if (valueColor === 'white') coloredValue = chalk.white(coloredValue);
    if (valueColor === 'green') coloredValue = chalk.green(coloredValue);
    if (valueColor === 'yellow') coloredValue = chalk.yellow(coloredValue);
    if (valueColor === 'cyan') coloredValue = chalk.cyan(coloredValue);

    return `${coloredKey}: ${coloredValue}`;
  });

  return lines.join('\n');
}

/**
 * Format a spinner message (used with ora)
 */
export function formatSpinnerMessage(action: string, details?: string): string {
  if (details) {
    return `${action} ${chalk.gray(`(${details})`)}`;
  }
  return action;
}

/**
 * Clear the console and display a title
 */
export function clearAndTitle(title: string): void {
  console.clear();
  console.log(formatHeader(title));
  console.log();
}

/**
 * Format elapsed time (seconds) as human-readable
 */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Format a list with bullet points
 */
export function formatList(
  items: string[],
  options: { bullet?: string; color?: string } = {}
): string {
  const { bullet = '•', color = 'white' } = options;

  const colorFn =
    color === 'gray' ? chalk.gray :
    color === 'cyan' ? chalk.cyan :
    color === 'yellow' ? chalk.yellow :
    color === 'green' ? chalk.green :
    chalk.white;

  return items.map(item => colorFn(`  ${bullet} ${item}`)).join('\n');
}
