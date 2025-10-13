/**
 * Night Phase Prompts for Mafia Coordination
 *
 * Private Mafia-only prompts for strategic victim selection.
 * These prompts encourage coordination and consensus building.
 */

/**
 * Night phase system prompt for Mafia agents
 *
 * Emphasizes:
 * - Private coordination (Villagers cannot see)
 * - Strategic victim selection
 * - Consensus building
 * - Brief responses (15-30 words)
 */
export const NIGHT_PHASE_PROMPT = `NIGHT PHASE - PRIVATE MAFIA COORDINATION

You are meeting privately with fellow Mafia members to choose tonight's victim.

OBJECTIVE:
Select ONE Villager to eliminate tonight. Coordinate with your Mafia teammates to reach consensus.

STRATEGIC CONSIDERATIONS:
1. TARGET THREATS: Eliminate Villagers who are most likely to identify Mafia
   - Villagers making accurate accusations
   - Logical thinkers building strong cases
   - Players forming voting alliances against you

2. AVOID SUSPICION: Consider how the kill will look tomorrow
   - Killing someone who accused you looks defensive
   - Killing someone random looks strategic
   - Think one step ahead

3. PROTECT ALLIES: Don't suggest eliminating fellow Mafia
   - You know who your teammates are
   - Coordinate to protect each other
   - Build consensus on the best target

INSTRUCTIONS:
- Propose a Villager to eliminate (use their name: "Agent-X")
- Explain your reasoning briefly (1-2 sentences)
- Respond to your teammates' suggestions
- Build consensus - majority agreement determines the target

KEEP IT BRIEF:
- 15-30 words per message
- Be direct and strategic
- No long explanations needed
- Focus on coordination

REMEMBER: Villagers CANNOT see this conversation. Be candid about your strategy. Coordinate efficiently.`;

/**
 * Day announcement reaction prompt
 *
 * Used when agents react to the nightkill reveal
 */
export function generateDayReactionPrompt(
  victimName: string,
  victimRole: 'MAFIA' | 'VILLAGER'
): string {
  return `MORNING ANNOUNCEMENT

Agent ${victimName} was eliminated last night by the Mafia.

React to this news in 1-2 sentences (15-25 words).

IF YOU ARE MAFIA:
- Act surprised and concerned
- Blend in with genuine reactions
- Don't draw attention to yourself
- Suggest who might be responsible (deflect from yourself)

IF YOU ARE VILLAGER:
- Express shock or concern
- Voice suspicions if you have them
- Consider why this player was targeted
- Think about what this reveals about Mafia strategy

Keep your reaction brief and natural. This is just a quick response before the Discussion phase begins.`;
}

/**
 * Consensus voting prompt (if we add explicit voting later)
 *
 * For now, consensus is detected via victim mentions in messages.
 * This prompt can be used in future iterations for explicit voting.
 */
export const NIGHT_VOTING_PROMPT = `NIGHT KILL VOTE

Based on your team's discussion, vote for ONE Villager to eliminate tonight.

Format: "I vote to eliminate Agent-X"

Then provide a brief justification (1 sentence).

Remember: This is a strategic decision. Choose the Villager who poses the greatest threat to your team's survival.`;
