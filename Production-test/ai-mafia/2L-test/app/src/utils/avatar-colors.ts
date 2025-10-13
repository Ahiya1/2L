/**
 * Avatar Color Utilities
 *
 * Generates deterministic avatar colors based on player name hashing.
 * Same player name always produces the same color.
 *
 * Pattern: Hash string → map to color palette (10 colors)
 */

/**
 * Hash a string to a consistent number using simple hash algorithm
 * @param str - String to hash (player name)
 * @returns Positive integer hash value
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get deterministic avatar background color for a player
 * @param playerName - Player name to hash
 * @returns Tailwind CSS background color class (e.g., 'bg-red-500')
 */
export function getAvatarColor(playerName: string): string {
  const COLORS = [
    'bg-red-500',      // Index 0
    'bg-blue-500',     // Index 1
    'bg-green-500',    // Index 2
    'bg-yellow-500',   // Index 3
    'bg-purple-500',   // Index 4
    'bg-pink-500',     // Index 5
    'bg-indigo-500',   // Index 6
    'bg-teal-500',     // Index 7
    'bg-orange-500',   // Index 8
    'bg-cyan-500',     // Index 9
  ];

  const hash = hashString(playerName);
  const index = hash % COLORS.length;
  const color = COLORS[index];
  return color || 'bg-gray-500';
}

/**
 * Get deterministic avatar text color (for contrast)
 * @param playerName - Player name to hash
 * @returns Tailwind CSS text color class (always white for visibility)
 */
export function getAvatarTextColor(playerName: string): string {
  // All our background colors are vibrant (500 level), so white text works best
  return 'text-white';
}

/**
 * Get player initials for avatar display
 * @param playerName - Player name
 * @returns First letter capitalized (e.g., "Alice" → "A")
 */
export function getAvatarInitial(playerName: string): string {
  return playerName[0]?.toUpperCase() || '?';
}
