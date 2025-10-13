/**
 * GET /api/game/[gameId]/votes
 *
 * Returns votes for a specific round with tally.
 * Can filter by round using ?round=N query parameter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import type { GetVotesResponse } from '@/lib/api/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const { searchParams } = new URL(req.url);
    const roundParam = searchParams.get('round');

    // Check if game exists
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Determine round to fetch
    let round: number;
    if (roundParam) {
      round = parseInt(roundParam, 10);
      if (isNaN(round) || round < 1) {
        return NextResponse.json(
          { error: 'Invalid round parameter' },
          { status: 400 }
        );
      }
    } else {
      // Default to current round
      round = game.roundNumber;
    }

    // Fetch votes for the round
    const votes = await prisma.vote.findMany({
      where: {
        gameId,
        roundNumber: round,
      },
      include: {
        voter: {
          select: {
            id: true,
            name: true,
          },
        },
        target: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { voteOrder: 'asc' },
    });

    // Calculate tally
    const tally: Record<string, number> = {};
    for (const vote of votes) {
      if (!tally[vote.targetId]) {
        tally[vote.targetId] = 0;
      }
      const count = tally[vote.targetId];
      if (count !== undefined) {
        tally[vote.targetId] = count + 1;
      }
    }

    // Build response
    const response: GetVotesResponse = {
      votes: votes.map((vote) => ({
        id: vote.id,
        voterId: vote.voterId,
        voterName: vote.voter.name,
        targetId: vote.targetId,
        targetName: vote.target.name,
        justification: vote.justification,
        voteOrder: vote.voteOrder,
        timestamp: vote.timestamp.toISOString(),
      })),
      tally,
      round,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[API ERROR] Get votes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
