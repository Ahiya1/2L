/**
 * Manual Tests for Avatar Color Utilities
 *
 * Run these tests manually in a browser console or Node REPL:
 *
 * import { getAvatarColor, getAvatarInitial } from '@/src/utils/avatar-colors';
 *
 * // Test 1: Same name produces same color
 * console.assert(getAvatarColor('Alice') === getAvatarColor('Alice'), 'Same name should produce same color');
 *
 * // Test 2: Different names produce different colors (most of the time)
 * const color1 = getAvatarColor('Alice');
 * const color2 = getAvatarColor('Bob');
 * console.log('Alice:', color1, 'Bob:', color2);
 *
 * // Test 3: Initial extraction
 * console.assert(getAvatarInitial('Alice') === 'A', 'Should extract first letter');
 * console.assert(getAvatarInitial('bob') === 'B', 'Should uppercase first letter');
 *
 * // Test 4: All 10 colors are valid Tailwind classes
 * const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
 * names.forEach(name => {
 *   const color = getAvatarColor(name);
 *   console.log(`${name}: ${color}`);
 * });
 */

// Placeholder for future automated tests
export {};
