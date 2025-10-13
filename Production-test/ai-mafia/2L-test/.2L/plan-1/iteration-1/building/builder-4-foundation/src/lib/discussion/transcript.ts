/**
 * Transcript Generator
 *
 * Exports Discussion phase transcripts to JSON and text formats.
 * Includes all messages, metadata, cost summary, and game configuration.
 */

import { prisma } from '@/lib/db/client';
import { costTracker } from '@/utils/cost-tracker';
import { TranscriptData } from '@/types/cli';

export async function generateTranscript(
  gameId: string,
  format: 'json' | 'text'
): Promise<string> {
  // Fetch all game data
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
  });

  const players = await prisma.player.findMany({
    where: { gameId },
    orderBy: { position: 'asc' },
  });

  const messages = await prisma.discussionMessage.findMany({
    where: { gameId },
    include: {
      player: true,
      inReplyTo: {
        include: { player: true },
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  const votes = await prisma.vote.findMany({
    where: { gameId },
    include: {
      voter: true,
      target: true,
    },
    orderBy: { timestamp: 'asc' },
  });

  // Get cost summary
  const costSummary = costTracker.getGameSummary(gameId);

  // Calculate summary statistics
  const totalTurns = messages.length;
  const avgMessageLength = messages.length > 0
    ? messages.reduce((sum, msg) => sum + msg.message.split(' ').length, 0) / messages.length
    : 0;

  const duration = messages.length > 0
    ? (messages[messages.length - 1].timestamp.getTime() - messages[0].timestamp.getTime()) / 1000
    : 0;

  // Build transcript data structure
  const transcriptData: TranscriptData = {
    gameId: game.id,
    timestamp: new Date().toISOString(),
    metadata: {
      playerCount: players.length,
      mafiaCount: players.filter(p => p.role === 'MAFIA').length,
      villagerCount: players.filter(p => p.role === 'VILLAGER').length,
      totalTurns,
      durationSeconds: duration,
      avgMessageLength,
      cost: {
        totalCost: costSummary.totalCost,
        totalInputTokens: costSummary.totalInputTokens,
        totalCachedTokens: costSummary.totalCachedTokens,
        totalOutputTokens: costSummary.totalOutputTokens,
        cacheHitRate: costSummary.cacheHitRate,
        avgCostPerTurn: costSummary.avgCostPerTurn,
      },
    },
    players: players.map(p => ({
      name: p.name,
      role: p.role,
      personality: p.personality,
      isAlive: p.isAlive,
      position: p.position,
    })),
    messages: messages.map(msg => ({
      turn: msg.turn,
      roundNumber: msg.roundNumber,
      playerName: msg.player.name,
      message: msg.message,
      timestamp: msg.timestamp.toISOString(),
      inReplyToId: msg.inReplyToId,
      inReplyToPlayer: msg.inReplyTo?.player.name || null,
    })),
    votes: votes.map(v => ({
      roundNumber: v.roundNumber,
      voterName: v.voter.name,
      targetName: v.target.name,
      justification: v.justification,
      timestamp: v.timestamp.toISOString(),
    })),
  };

  if (format === 'json') {
    return JSON.stringify(transcriptData, null, 2);
  } else {
    return formatTextTranscript(transcriptData);
  }
}

function formatTextTranscript(data: TranscriptData): string {
  const lines: string[] = [];

  // Header
  lines.push('═'.repeat(80));
  lines.push('           AI MAFIA - DISCUSSION PHASE TRANSCRIPT');
  lines.push('═'.repeat(80));
  lines.push('');

  // Metadata
  lines.push(`Game ID: ${data.gameId}`);
  lines.push(`Date: ${data.timestamp}`);
  lines.push(`Duration: ${data.metadata.durationSeconds.toFixed(1)}s`);
  lines.push('');

  // Cost summary
  lines.push('COST SUMMARY:');
  lines.push(`  Total Cost: $${data.metadata.cost.totalCost.toFixed(2)}`);
  lines.push(`  Cache Hit Rate: ${(data.metadata.cost.cacheHitRate * 100).toFixed(1)}%`);
  lines.push(`  Avg Cost per Turn: $${data.metadata.cost.avgCostPerTurn.toFixed(4)}`);
  lines.push(`  Input Tokens: ${data.metadata.cost.totalInputTokens.toLocaleString()}`);
  lines.push(`  Cached Tokens: ${data.metadata.cost.totalCachedTokens.toLocaleString()}`);
  lines.push(`  Output Tokens: ${data.metadata.cost.totalOutputTokens.toLocaleString()}`);
  lines.push('');

  // Players
  lines.push('PLAYERS:');
  for (let i = 0; i < data.players.length; i++) {
    const p = data.players[i];
    const status = p.isAlive ? 'Alive' : 'Dead';
    lines.push(`  ${i + 1}. ${p.name.padEnd(12)} - ${p.role.padEnd(10)} (${p.personality}, ${status})`);
  }
  lines.push('');

  // Conversation
  lines.push('═'.repeat(80));
  lines.push(`CONVERSATION (${data.messages.length} messages)`);
  lines.push('═'.repeat(80));
  lines.push('');

  for (const msg of data.messages) {
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();

    lines.push(`[Round ${msg.roundNumber}, Turn ${msg.turn}] ${timestamp}`);
    lines.push(`${msg.playerName}:`);

    if (msg.inReplyToPlayer) {
      lines.push(`  (replying to ${msg.inReplyToPlayer})`);
    }

    lines.push(`"${msg.message}"`);
    lines.push('');
  }

  // Votes (if any)
  if (data.votes.length > 0) {
    lines.push('═'.repeat(80));
    lines.push('VOTES');
    lines.push('═'.repeat(80));
    lines.push('');

    for (const vote of data.votes) {
      const timestamp = new Date(vote.timestamp).toLocaleTimeString();
      lines.push(`[Round ${vote.roundNumber}] ${timestamp}`);
      lines.push(`${vote.voterName} voted for ${vote.targetName}`);
      lines.push(`Justification: "${vote.justification}"`);
      lines.push('');
    }
  }

  // Statistics
  lines.push('═'.repeat(80));
  lines.push('STATISTICS');
  lines.push('═'.repeat(80));
  lines.push('');
  lines.push(`Total Messages: ${data.messages.length}`);
  lines.push(`Average Message Length: ${data.metadata.avgMessageLength.toFixed(1)} words`);
  lines.push(`Messages per Player: ${(data.messages.length / data.players.length).toFixed(1)}`);

  // Message distribution by player
  const messageCounts = new Map<string, number>();
  for (const msg of data.messages) {
    messageCounts.set(msg.playerName, (messageCounts.get(msg.playerName) || 0) + 1);
  }

  lines.push('');
  lines.push('Messages per Player:');
  for (const [name, count] of Array.from(messageCounts.entries()).sort((a, b) => b[1] - a[1])) {
    const percentage = ((count / data.messages.length) * 100).toFixed(1);
    lines.push(`  ${name.padEnd(12)} ${count.toString().padStart(3)} messages (${percentage}%)`);
  }

  lines.push('');
  lines.push('═'.repeat(80));
  lines.push('END OF TRANSCRIPT');
  lines.push('═'.repeat(80));

  return lines.join('\n');
}

/**
 * Export transcript to file with timestamp-based filename
 */
export async function exportTranscript(
  gameId: string,
  outputDir: string = './logs/transcripts'
): Promise<{ jsonPath: string; textPath: string }> {
  const fs = await import('fs');
  const path = await import('path');

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = Date.now();
  const jsonPath = path.join(outputDir, `discussion-${timestamp}.json`);
  const textPath = path.join(outputDir, `discussion-${timestamp}.txt`);

  const jsonContent = await generateTranscript(gameId, 'json');
  const textContent = await generateTranscript(gameId, 'text');

  fs.writeFileSync(jsonPath, jsonContent);
  fs.writeFileSync(textPath, textContent);

  return { jsonPath, textPath };
}
