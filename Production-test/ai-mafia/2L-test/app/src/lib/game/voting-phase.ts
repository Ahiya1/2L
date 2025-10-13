/**
 * Voting Phase Orchestrator
 *
 * Implements sequential voting where each agent sees prior votes for strategic depth.
 * Agents provide 50-100 token justifications citing Discussion evidence.
 *
 * Responsibilities:
 * - Sequential voting execution (agents vote one by one)
 * - Vote parsing from Claude responses
 * - Vote tallying and elimination determination
 * - Tie-breaking (random selection for MVP)
 * - Event emission for SSE
 */

import type { PrismaClient } from '@prisma/client';
import { gameEventEmitter } from '../events/emitter';
import type { TokenUsage } from '../types/shared';
import { votingLogger } from '../logger';

export interface VotingPhaseResult {
  eliminatedPlayer: string | null; // Player ID
  votes: Array<{ voterId: string; targetId: string; justification: string }>;
  tally: Record<string, number>;
}

export interface VotingPhaseDependencies {
  prisma: PrismaClient;
  buildAgentContext: (playerId: string, gameId: string) => Promise<any>;
  generateResponse: (context: any) => Promise<{ text: string; usage: TokenUsage }>;
  trackCost: (data: any) => void;
}

/**
 * Run voting phase with sequential voting
 *
 * Each agent sees prior votes to inform their strategic decision.
 * Vote justifications reference Discussion phase arguments.
 *
 * @param gameId Game ID
 * @param roundNumber Current round number
 * @param dependencies Injected dependencies
 * @returns Voting result with eliminated player and vote tally
 */
export async function runVotingPhase(
  gameId: string,
  roundNumber: number,
  dependencies: VotingPhaseDependencies
): Promise<VotingPhaseResult> {
  const { prisma, buildAgentContext, generateResponse, trackCost } = dependencies;

  votingLogger.info({ gameId, roundNumber }, 'Starting voting phase');

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  const alivePlayers = await prisma.player.findMany({
    where: { gameId, isAlive: true },
    orderBy: { position: 'asc' },
  });

  votingLogger.info({ gameId, roundNumber, playerCount: alivePlayers.length }, 'Players ready to vote');

  let voteOrder = 0;
  const votes: Array<{ voterId: string; targetId: string; justification: string }> = [];

  // Sequential voting (each agent sees prior votes)
  for (const voter of alivePlayers) {
    voteOrder++;

    votingLogger.debug(
      { gameId, roundNumber, voteOrder, totalVoters: alivePlayers.length, voterName: voter.name },
      'Processing vote'
    );

    // Build context with full game history + votes so far
    const context = await buildVotingContext(
      voter.id,
      gameId,
      votes,
      alivePlayers,
      buildAgentContext
    );

    // Generate vote + justification with 10-second timeout
    const { text, usage } = await generateWithTimeout(
      () => generateResponse(context),
      10000,
      voter
    );

    // Parse vote target from response
    const { targetId, justification } = parseVote(text, alivePlayers, voter);

    // Save vote to database
    const vote = await prisma.vote.create({
      data: {
        gameId,
        roundNumber: game!.roundNumber,
        voterId: voter.id,
        targetId,
        justification,
        phaseType: 'VOTING',
        voteOrder,
      },
    });

    votes.push({ voterId: voter.id, targetId, justification });

    // Track cost
    trackCost({
      gameId,
      playerId: voter.id,
      phase: 'VOTING',
      inputTokens: usage.inputTokens,
      cachedTokens: usage.cachedTokens,
      outputTokens: usage.outputTokens,
      cost: usage.cost,
      timestamp: new Date(),
    });

    // Emit vote event in real-time
    const target = alivePlayers.find((p) => p.id === targetId);
    gameEventEmitter.emitGameEvent('vote_cast', {
      gameId,
      type: 'vote_cast',
      payload: {
        voterId: voter.id,
        voterName: voter.name,
        targetId,
        targetName: target!.name,
        justification,
        voteOrder,
        round: roundNumber,
      },
    });

    votingLogger.info(
      { gameId, roundNumber, voterId: voter.id, voterName: voter.name, targetId, targetName: target!.name },
      'Vote cast'
    );

    // Small delay for dramatic effect
    await sleep(500);
  }

  // Tally votes
  const tally = tallyVotes(votes);
  const eliminatedPlayer = determineElimination(tally, alivePlayers);

  votingLogger.info({ gameId, roundNumber, tally }, 'Vote tally complete');
  if (eliminatedPlayer) {
    const eliminated = alivePlayers.find((p) => p.id === eliminatedPlayer);
    votingLogger.info(
      { gameId, roundNumber, eliminatedPlayerId: eliminatedPlayer, eliminatedPlayerName: eliminated!.name },
      'Player eliminated by vote'
    );
  } else {
    votingLogger.warn({ gameId, roundNumber }, 'No elimination - no votes cast');
  }

  // Emit voting complete event
  const eliminatedPlayerName = eliminatedPlayer
    ? alivePlayers.find((p) => p.id === eliminatedPlayer)?.name || null
    : null;

  gameEventEmitter.emitGameEvent('voting_complete', {
    gameId,
    type: 'voting_complete',
    payload: {
      round: roundNumber,
      eliminatedPlayer,
      eliminatedPlayerName,
      tally,
    },
  });

  return { eliminatedPlayer, votes, tally };
}

/**
 * Build voting context with prior votes visible
 */
async function buildVotingContext(
  voterId: string,
  gameId: string,
  votesSoFar: Array<{ voterId: string; targetId: string; justification: string }>,
  alivePlayers: any[],
  buildAgentContext: (playerId: string, gameId: string) => Promise<any>
): Promise<any> {
  // Get base context (game history, messages, etc.)
  const baseContext = await buildAgentContext(voterId, gameId);

  // Build votes summary
  let votesSummary = '';
  if (votesSoFar.length > 0) {
    votesSummary = '\n\n## Votes Cast So Far:\n';
    for (const vote of votesSoFar) {
      const voter = alivePlayers.find((p) => p.id === vote.voterId);
      const target = alivePlayers.find((p) => p.id === vote.targetId);
      votesSummary += `- ${voter?.name} voted for ${target?.name}\n`;
    }
  }

  // Override system prompt with voting-specific instructions
  const votingPrompt = `VOTING PHASE

Based on the Discussion phase, vote to eliminate one player.

Instructions:
1. State clearly: "I vote for Agent-X" (use exact player name)
2. Provide 2-3 sentence justification citing specific Discussion evidence
3. You cannot abstain - you must vote for someone
4. You can vote for any alive player except yourself

Strategy:
- If Mafia: Vote to eliminate Villagers, deflect suspicion from allies
- If Villager: Vote for who you believe is Mafia based on Discussion patterns

${votesSummary}

Your vote:`;

  return {
    ...baseContext,
    systemPrompt: votingPrompt,
  };
}

/**
 * Parse vote from Claude response
 *
 * Attempts regex matching for "I vote for Agent-X" pattern.
 * Falls back to random valid target on parse failure.
 */
function parseVote(
  response: string,
  alivePlayers: any[],
  voter: any
): { targetId: string; justification: string } {
  // Regex: "I vote for Agent-X" or "Vote: Agent-X" or "Vote for Agent-X"
  const voteRegex = /(?:I vote for|Vote:?)\s+([A-Z][a-z]+-[A-Z])/i;
  const match = response.match(voteRegex);

  if (match) {
    const targetName = match[1];
    const target = alivePlayers.find((p) => p.name === targetName);

    if (target && target.isAlive && target.id !== voter.id) {
      return {
        targetId: target.id,
        justification: response,
      };
    }
  }

  // Fallback: random valid target (exclude self)
  const validTargets = alivePlayers.filter((p) => p.isAlive && p.id !== voter.id);
  if (validTargets.length === 0) {
    // Should never happen, but handle gracefully
    return {
      targetId: alivePlayers[0].id,
      justification: `${response} [Failed to parse - emergency fallback]`,
    };
  }

  const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];

  votingLogger.warn({ voterId: voter.id, voterName: voter.name, response }, 'Failed to parse vote - using random target');

  return {
    targetId: randomTarget.id,
    justification: `${response} [Failed to parse - random vote]`,
  };
}

/**
 * Tally votes by target
 */
function tallyVotes(
  votes: Array<{ voterId: string; targetId: string; justification: string }>
): Record<string, number> {
  const tally: Record<string, number> = {};

  for (const vote of votes) {
    tally[vote.targetId] = (tally[vote.targetId] || 0) + 1;
  }

  return tally;
}

/**
 * Determine elimination based on vote tally
 *
 * Uses random tie-breaking for MVP (no revoting).
 */
function determineElimination(tally: Record<string, number>, alivePlayers: any[]): string | null {
  const entries = Object.entries(tally);
  if (entries.length === 0) return null;

  // Find max votes
  let maxVotes = 0;
  let winners: string[] = [];

  for (const [playerId, count] of entries) {
    if (count > maxVotes) {
      maxVotes = count;
      winners = [playerId];
    } else if (count === maxVotes) {
      winners.push(playerId);
    }
  }

  // Random tie-breaking
  if (winners.length > 1) {
    const randomIdx = Math.floor(Math.random() * winners.length);
    const chosen = winners[randomIdx];
    const chosenPlayer = alivePlayers.find((p) => p.id === chosen);
    votingLogger.info(
      { tieCount: winners.length, maxVotes, chosenPlayerId: chosen, chosenPlayerName: chosenPlayer?.name },
      'Tie detected - random selection applied'
    );
    return chosen || null;
  }

  return winners[0] || null;
}

/**
 * Generate response with timeout
 */
async function generateWithTimeout(
  fn: () => Promise<{ text: string; usage: TokenUsage }>,
  timeoutMs: number,
  voter: any
): Promise<{ text: string; usage: TokenUsage }> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Vote generation timeout')), timeoutMs)
  );

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    return result;
  } catch (error: any) {
    if (error.message === 'Vote generation timeout') {
      votingLogger.warn({ voterId: voter.id, voterName: voter.name }, 'Agent timed out - using fallback vote');

      return {
        text: `I vote for Agent-A. [Timeout - using fallback]`,
        usage: {
          inputTokens: 0,
          cachedTokens: 0,
          outputTokens: 0,
          cost: 0,
        },
      };
    }

    // For other errors, still use fallback
    votingLogger.warn(
      { voterId: voter.id, voterName: voter.name, error: error.message },
      'Agent encountered error - using fallback vote'
    );

    return {
      text: `I vote for Agent-A. [Error - using fallback]`,
      usage: {
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        cost: 0,
      },
    };
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
