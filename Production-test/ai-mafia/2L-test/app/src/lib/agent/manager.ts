/**
 * Agent Manager
 *
 * Manages agent creation, personality assignment, and agent state.
 * Provides utilities for generating diverse agent personalities.
 */

import { PERSONALITIES, type PersonalityType } from '../prompts/system-prompts';

/**
 * Agent configuration for game setup
 */
export interface AgentConfig {
  name: string;
  role: 'MAFIA' | 'VILLAGER';
  personality: PersonalityType;
  position: number;
}

/**
 * Generate agent name from position
 *
 * @param position - Agent position (0-indexed)
 * @returns Agent name (e.g., "Agent-A", "Agent-B", ...)
 */
export function generateAgentName(position: number): string {
  // Use letters A-Z for first 26 agents
  if (position < 26) {
    return `Agent-${String.fromCharCode(65 + position)}`;
  }

  // Use double letters for agents beyond 26: AA, AB, etc.
  const firstLetter = String.fromCharCode(65 + Math.floor(position / 26) - 1);
  const secondLetter = String.fromCharCode(65 + (position % 26));
  return `Agent-${firstLetter}${secondLetter}`;
}

/**
 * Assign roles randomly to agents
 *
 * @param totalAgents - Total number of agents
 * @param mafiaCount - Number of Mafia agents
 * @returns Array of roles in random order
 */
export function assignRoles(totalAgents: number, mafiaCount: number): Array<'MAFIA' | 'VILLAGER'> {
  if (mafiaCount > totalAgents) {
    throw new Error('Mafia count cannot exceed total agents');
  }

  if (mafiaCount < 1) {
    throw new Error('Must have at least 1 Mafia agent');
  }

  if (mafiaCount >= totalAgents / 2) {
    console.warn('Warning: Mafia count is >= 50% of agents. Game may be unbalanced.');
  }

  // Create role array
  const roles: Array<'MAFIA' | 'VILLAGER'> = [];

  for (let i = 0; i < mafiaCount; i++) {
    roles.push('MAFIA');
  }

  for (let i = 0; i < totalAgents - mafiaCount; i++) {
    roles.push('VILLAGER');
  }

  // Shuffle using Fisher-Yates algorithm
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = roles[i];
    if (temp && roles[j]) {
      roles[i] = roles[j];
      roles[j] = temp;
    }
  }

  return roles;
}

/**
 * Assign personalities to agents with diversity
 *
 * Ensures good distribution of personality types across agents.
 * Cycles through all personalities before repeating.
 *
 * @param agentCount - Number of agents to assign personalities
 * @param shuffle - Whether to shuffle personality order (default: true)
 * @returns Array of personality types
 */
export function assignPersonalities(agentCount: number, shuffle: boolean = true): PersonalityType[] {
  const personalities: PersonalityType[] = [];

  // Create base personality distribution (cycle through all types)
  for (let i = 0; i < agentCount; i++) {
    const personalityIndex = i % PERSONALITIES.length;
    const personality = PERSONALITIES[personalityIndex];
    if (personality) {
      personalities.push(personality);
    }
  }

  // Shuffle to avoid predictable patterns
  if (shuffle) {
    for (let i = personalities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = personalities[i];
      if (temp && personalities[j]) {
        personalities[i] = personalities[j];
        personalities[j] = temp;
      }
    }
  }

  return personalities;
}

/**
 * Generate complete agent configurations for a game
 *
 * @param totalAgents - Total number of agents (8-12 recommended)
 * @param mafiaCount - Number of Mafia agents (typically 25-30% of total)
 * @returns Array of agent configurations
 */
export function generateAgentConfigs(totalAgents: number, mafiaCount: number): AgentConfig[] {
  const roles = assignRoles(totalAgents, mafiaCount);
  const personalities = assignPersonalities(totalAgents);

  const configs: AgentConfig[] = [];

  for (let i = 0; i < totalAgents; i++) {
    const role = roles[i];
    const personality = personalities[i];
    if (role && personality) {
      configs.push({
        name: generateAgentName(i),
        role,
        personality,
        position: i,
      });
    }
  }

  return configs;
}

/**
 * Calculate recommended Mafia count for game balance
 *
 * Standard Mafia game balance: 25-30% Mafia, 70-75% Villagers
 *
 * @param totalAgents - Total number of agents
 * @returns Recommended Mafia count
 */
export function calculateRecommendedMafiaCount(totalAgents: number): number {
  // Use 25% as baseline (rounded)
  const baseCount = Math.floor(totalAgents * 0.25);

  // Ensure at least 1 Mafia
  if (baseCount < 1) return 1;

  // Ensure Mafia is minority (less than 50%)
  const maxMafia = Math.floor(totalAgents / 2) - 1;
  if (baseCount > maxMafia) return maxMafia;

  return baseCount;
}

/**
 * Validate game configuration
 *
 * @param totalAgents - Total agents
 * @param mafiaCount - Mafia count
 * @returns Validation result
 */
export function validateGameConfig(totalAgents: number, mafiaCount: number): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum agents
  if (totalAgents < 5) {
    errors.push('Minimum 5 agents required for a playable game');
  }

  // Check maximum agents (for performance)
  if (totalAgents > 20) {
    warnings.push('More than 20 agents may cause performance issues');
  }

  // Check minimum Mafia
  if (mafiaCount < 1) {
    errors.push('At least 1 Mafia agent required');
  }

  // Check Mafia not majority
  if (mafiaCount >= totalAgents / 2) {
    errors.push('Mafia must be less than 50% of total agents');
  }

  // Check Mafia count reasonable
  const recommendedMafia = calculateRecommendedMafiaCount(totalAgents);
  if (mafiaCount < recommendedMafia - 1 || mafiaCount > recommendedMafia + 1) {
    warnings.push(
      `Mafia count (${mafiaCount}) differs from recommended (${recommendedMafia}). Game may be unbalanced.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get personality distribution for logging
 *
 * @param agents - Agent configurations
 * @returns Map of personality -> count
 */
export function getPersonalityDistribution(agents: AgentConfig[]): Map<PersonalityType, number> {
  const distribution = new Map<PersonalityType, number>();

  for (const personality of PERSONALITIES) {
    distribution.set(personality, 0);
  }

  for (const agent of agents) {
    distribution.set(agent.personality, (distribution.get(agent.personality) || 0) + 1);
  }

  return distribution;
}

/**
 * Get role distribution for logging
 *
 * @param agents - Agent configurations
 * @returns Object with Mafia and Villager counts
 */
export function getRoleDistribution(agents: AgentConfig[]): { mafia: number; villagers: number } {
  let mafia = 0;
  let villagers = 0;

  for (const agent of agents) {
    if (agent.role === 'MAFIA') {
      mafia++;
    } else {
      villagers++;
    }
  }

  return { mafia, villagers };
}
