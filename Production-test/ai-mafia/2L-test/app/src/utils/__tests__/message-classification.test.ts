/**
 * Manual Tests for Message Classification Utilities
 *
 * Run these tests manually:
 *
 * import { classifyMessage, getMessageStyle } from '@/src/utils/message-classification';
 *
 * // Test 1: Accusation detection
 * console.assert(
 *   classifyMessage('I think Alice is Mafia', 'player-1', {}) === 'accusation',
 *   'Should detect accusation'
 * );
 *
 * // Test 2: Question detection
 * console.assert(
 *   classifyMessage('What do you think about Bob?', 'player-1', {}) === 'question',
 *   'Should detect question'
 * );
 *
 * // Test 3: Alliance detection
 * console.assert(
 *   classifyMessage('I agree with Charlie', 'player-1', {}) === 'alliance',
 *   'Should detect alliance'
 * );
 *
 * // Test 4: Defense detection (context-aware)
 * const context = {
 *   recentAccusations: [
 *     { targetId: 'player-1', targetName: 'Alice', accuserId: 'player-2' }
 *   ]
 * };
 * console.assert(
 *   classifyMessage("I'm not Mafia!", 'player-1', context) === 'defense',
 *   'Should detect defense when player was accused'
 * );
 *
 * // Test 5: Color styling
 * console.log('Accusation style:', getMessageStyle('accusation'));
 * console.log('Defense style:', getMessageStyle('defense'));
 * console.log('Question style:', getMessageStyle('question'));
 * console.log('Alliance style:', getMessageStyle('alliance'));
 */

// Placeholder for future automated tests
export {};
