/**
 * POST /api/game/create
 *
 * Creates a new game with specified number of players.
 * Assigns roles (Mafia/Villager) randomly using standard ratios.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { assignRolesAndCreatePlayers } from '@/lib/game/role-assignment';
import {
  CreateGameSchema,
  type CreateGameResponse,
} from '@/lib/api/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerCount } = CreateGameSchema.parse(body);

    console.log(`[API] Creating game with ${playerCount} players`);

    // Create game in LOBBY state
    const game = await prisma.game.create({
      data: {
        status: 'LOBBY',
        currentPhase: null,
        playerCount,
        roundNumber: 1,
      },
    });

    // Create players with assigned roles
    await assignRolesAndCreatePlayers(game.id, playerCount, prisma);

    console.log(`[API] Game created: ${game.id}`);

    const response: CreateGameResponse = {
      gameId: game.id,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[API ERROR] Create game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
