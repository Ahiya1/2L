/**
 * GET /api/game/[gameId]/messages
 *
 * Returns paginated discussion messages for a game.
 * Can filter by round using ?round=N query parameter.
 * Excludes NightMessages (privacy guarantee).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import type { GetMessagesResponse } from '@/lib/api/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;
    const { searchParams } = new URL(req.url);
    const roundParam = searchParams.get('round');

    // Check if game exists
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Build where clause
    const where: {
      gameId: string;
      roundNumber?: number;
    } = {
      gameId,
    };

    if (roundParam) {
      const round = parseInt(roundParam, 10);
      if (isNaN(round) || round < 1) {
        return NextResponse.json(
          { error: 'Invalid round parameter' },
          { status: 400 }
        );
      }
      where.roundNumber = round;
    }

    // Fetch discussion messages (NOT NightMessages - privacy guaranteed)
    const messages = await prisma.discussionMessage.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ roundNumber: 'asc' }, { timestamp: 'asc' }],
    });

    // Count total messages for pagination
    const total = messages.length;

    // Build response
    const response: GetMessagesResponse = {
      messages: messages.map((msg) => ({
        id: msg.id,
        playerId: msg.playerId,
        playerName: msg.player.name,
        message: msg.message,
        timestamp: msg.timestamp.toISOString(),
        roundNumber: msg.roundNumber,
        turn: msg.turn,
        inReplyToId: msg.inReplyToId,
      })),
      total,
      hasMore: false, // For MVP, return all messages (pagination can be added later)
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[API ERROR] Get messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
