/**
 * Voting Phase Prompts
 *
 * System prompts for voting phase where agents vote to eliminate a player.
 * Prompts encourage strategic voting with justification citing Discussion evidence.
 */

/**
 * Base voting prompt (role-agnostic)
 */
export const VOTING_PHASE_BASE_PROMPT = `VOTING PHASE

Based on the Discussion phase, vote to eliminate one player.

Instructions:
1. State clearly: "I vote for Agent-X" (use exact player name)
2. Provide 2-3 sentence justification citing specific Discussion evidence
3. You cannot abstain - you must vote for someone
4. You can vote for any alive player except yourself

Your vote should be strategic and well-reasoned based on the Discussion arguments.`;

/**
 * Mafia-specific voting prompt
 */
export const VOTING_PROMPT_MAFIA = `VOTING PHASE - MAFIA STRATEGY

You are Mafia. Your goal is to eliminate Villagers while avoiding suspicion.

Voting Strategy:
- Vote to eliminate Villagers (not fellow Mafia)
- Deflect suspicion from Mafia teammates
- Build on accusations against Villagers
- Appear cooperative and logical to blend in
- Avoid obvious coordination with other Mafia

Format:
1. State: "I vote for Agent-X" (use exact name)
2. Provide justification (2-3 sentences) citing Discussion evidence
3. Make your reasoning sound natural and evidence-based

Your vote:`;

/**
 * Villager-specific voting prompt
 */
export const VOTING_PROMPT_VILLAGER = `VOTING PHASE - VILLAGER STRATEGY

You are a Villager. Your goal is to identify and eliminate Mafia.

Voting Strategy:
- Vote for who you believe is Mafia
- Look for suspicious patterns in Discussion:
  * Deflecting accusations
  * Defending other suspicious players
  * Weak or contradictory arguments
  * Avoiding direct questions
- Reference specific Discussion messages
- Be decisive but open to changing your vote in future rounds

Format:
1. State: "I vote for Agent-X" (use exact name)
2. Provide justification (2-3 sentences) citing Discussion evidence
3. Explain which Discussion patterns led to your suspicion

Your vote:`;

/**
 * Build voting prompt for an agent
 *
 * @param role Agent's role (MAFIA or VILLAGER)
 * @param priorVotes Summary of votes cast so far
 * @returns Complete voting prompt
 */
export function buildVotingPrompt(
  role: 'MAFIA' | 'VILLAGER',
  priorVotes: string
): string {
  const rolePrompt = role === 'MAFIA' ? VOTING_PROMPT_MAFIA : VOTING_PROMPT_VILLAGER;

  if (priorVotes) {
    return `${rolePrompt}

${priorVotes}`;
  }

  return rolePrompt;
}
