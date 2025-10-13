/**
 * Share Game API Route
 *
 * POST /api/game/[gameId]/share
 *
 * Generates a shareable URL for a completed game.
 * Creates a SharedGame record with a unique short ID (nanoid).
 * Returns the shareable URL for social media or direct sharing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db/client';
import { logger } from '@/src/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const { gameId } = params;

  try {
    // Verify game exists and is complete
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, status: true, winner: true },
    });

    if (!game) {
      logger.warn({ gameId }, 'Share request for non-existent game');
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.status !== 'GAME_OVER') {
      logger.warn({ gameId, status: game.status }, 'Share request for incomplete game');
      return NextResponse.json(
        { error: 'Game not complete. Only completed games can be shared.' },
        { status: 400 }
      );
    }

    // Check if share already exists
    const existing = await prisma.sharedGame.findUnique({
      where: { gameId },
      select: { id: true },
    });

    if (existing) {
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${existing.id}`;
      logger.info({ gameId, shareId: existing.id }, 'Returning existing share link');
      return NextResponse.json({ shareUrl, shareId: existing.id });
    }

    // Create new share link
    const shareId = nanoid(12); // e.g., "xK9fG2pQ4mN8"
    await prisma.sharedGame.create({
      data: {
        id: shareId,
        gameId,
      },
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareId}`;

    logger.info({ gameId, shareId, shareUrl }, 'Created new share link');

    return NextResponse.json({ shareUrl, shareId });
  } catch (error) {
    logger.error({ gameId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to create share link');
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    );
  }
}
