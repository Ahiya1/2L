#!/usr/bin/env tsx
/**
 * Export SQLite Data Script
 *
 * Exports all data from SQLite database to JSON for migration to PostgreSQL.
 *
 * Usage:
 *   npx tsx scripts/export-sqlite-data.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Use existing Prisma client with current DATABASE_URL from .env
const prisma = new PrismaClient();

interface ExportData {
  games: any[];
  exportedAt: string;
  stats: {
    gameCount: number;
    playerCount: number;
    discussionMessageCount: number;
    nightMessageCount: number;
    voteCount: number;
    eventCount: number;
  };
}

async function exportData() {
  console.log('🔍 Exporting SQLite data...\n');

  try {
    // Fetch all data with relationships
    const games = await prisma.game.findMany({
      include: {
        players: {
          orderBy: { position: 'asc' }
        },
        discussionMessages: {
          orderBy: { timestamp: 'asc' }
        },
        nightMessages: {
          orderBy: { timestamp: 'asc' }
        },
        votes: {
          orderBy: { timestamp: 'asc' }
        },
        gameEvents: {
          orderBy: { timestamp: 'asc' }
        }
        // sharedGames not in SQLite database
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate stats
    const stats = {
      gameCount: games.length,
      playerCount: games.reduce((sum, g) => sum + g.players.length, 0),
      discussionMessageCount: games.reduce((sum, g) => sum + g.discussionMessages.length, 0),
      nightMessageCount: games.reduce((sum, g) => sum + g.nightMessages.length, 0),
      voteCount: games.reduce((sum, g) => sum + g.votes.length, 0),
      eventCount: games.reduce((sum, g) => sum + g.gameEvents.length, 0)
    };

    const exportData: ExportData = {
      games,
      exportedAt: new Date().toISOString(),
      stats
    };

    // Write to file
    const outputPath = path.join(__dirname, '..', 'data-backup.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

    console.log('✅ Export complete!\n');
    console.log('📊 Statistics:');
    console.log(`   Games: ${stats.gameCount}`);
    console.log(`   Players: ${stats.playerCount}`);
    console.log(`   Discussion Messages: ${stats.discussionMessageCount}`);
    console.log(`   Night Messages: ${stats.nightMessageCount}`);
    console.log(`   Votes: ${stats.voteCount}`);
    console.log(`   Game Events: ${stats.eventCount}\n`);
    console.log(`💾 Data saved to: ${outputPath}\n`);

    await prisma.$disconnect();
  } catch (error: any) {
    console.error('❌ Export failed:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

exportData();
