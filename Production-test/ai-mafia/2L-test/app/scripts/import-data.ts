#!/usr/bin/env tsx
/**
 * Import Data to PostgreSQL Script
 *
 * Imports data from JSON backup to PostgreSQL database.
 *
 * Usage:
 *   npx tsx scripts/import-data.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

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

async function importData() {
  console.log('🔄 Importing data to PostgreSQL...\n');

  try {
    // Read backup file
    const dataPath = path.join(__dirname, '..', 'data-backup.json');

    if (!fs.existsSync(dataPath)) {
      console.error('❌ Backup file not found:', dataPath);
      console.log('   Run export-sqlite-data.ts first');
      process.exit(1);
    }

    const backupContent = fs.readFileSync(dataPath, 'utf-8');
    const backup: ExportData = JSON.parse(backupContent);

    console.log(`📦 Backup created at: ${backup.exportedAt}`);
    console.log(`📊 Records to import:`);
    console.log(`   Games: ${backup.stats.gameCount}`);
    console.log(`   Players: ${backup.stats.playerCount}`);
    console.log(`   Discussion Messages: ${backup.stats.discussionMessageCount}`);
    console.log(`   Night Messages: ${backup.stats.nightMessageCount}`);
    console.log(`   Votes: ${backup.stats.voteCount}`);
    console.log(`   Game Events: ${backup.stats.eventCount}\n`);

    let importedGames = 0;
    let importedPlayers = 0;
    let importedMessages = 0;
    let importedNightMessages = 0;
    let importedVotes = 0;
    let importedEvents = 0;

    // Import each game with all its relationships
    for (const gameData of backup.games) {
      const {
        players,
        discussionMessages,
        nightMessages,
        votes,
        gameEvents,
        ...game
      } = gameData;

      console.log(`⏳ Importing game ${game.id}...`);

      try {
        // Create game with all relationships in a single transaction
        await prisma.game.create({
          data: {
            id: game.id,
            status: game.status,
            currentPhase: game.currentPhase,
            phaseStartTime: game.phaseStartTime ? new Date(game.phaseStartTime) : null,
            phaseEndTime: game.phaseEndTime ? new Date(game.phaseEndTime) : null,
            roundNumber: game.roundNumber,
            winner: game.winner,
            nightVictim: game.nightVictim,
            playerCount: game.playerCount,
            createdAt: new Date(game.createdAt),
            updatedAt: new Date(game.updatedAt),
            players: {
              create: players.map((p: any) => ({
                id: p.id,
                name: p.name,
                role: p.role,
                personality: p.personality,
                isAlive: p.isAlive,
                position: p.position,
                eliminatedInRound: p.eliminatedInRound,
                eliminationType: p.eliminationType
              }))
            },
            discussionMessages: {
              create: discussionMessages.map((m: any) => ({
                id: m.id,
                playerId: m.playerId,
                roundNumber: m.roundNumber,
                message: m.message,
                inReplyToId: m.inReplyToId,
                timestamp: new Date(m.timestamp),
                turn: m.turn
              }))
            },
            nightMessages: {
              create: nightMessages.map((m: any) => ({
                id: m.id,
                playerId: m.playerId,
                roundNumber: m.roundNumber,
                message: m.message,
                inReplyToId: m.inReplyToId,
                timestamp: new Date(m.timestamp),
                turn: m.turn
              }))
            },
            votes: {
              create: votes.map((v: any) => ({
                id: v.id,
                roundNumber: v.roundNumber,
                voterId: v.voterId,
                targetId: v.targetId,
                justification: v.justification,
                phaseType: v.phaseType,
                voteOrder: v.voteOrder,
                timestamp: new Date(v.timestamp)
              }))
            },
            gameEvents: {
              create: gameEvents.map((e: any) => ({
                id: e.id,
                type: e.type,
                data: e.data,
                timestamp: new Date(e.timestamp)
              }))
            }
          }
        });

        importedGames++;
        importedPlayers += players.length;
        importedMessages += discussionMessages.length;
        importedNightMessages += nightMessages.length;
        importedVotes += votes.length;
        importedEvents += gameEvents.length;

        console.log(`   ✅ Game ${game.id} imported`);
      } catch (error: any) {
        console.error(`   ❌ Failed to import game ${game.id}:`, error.message);
        // Continue with next game
      }
    }

    console.log('\n✅ Import complete!\n');
    console.log('📊 Imported records:');
    console.log(`   Games: ${importedGames}/${backup.stats.gameCount}`);
    console.log(`   Players: ${importedPlayers}/${backup.stats.playerCount}`);
    console.log(`   Discussion Messages: ${importedMessages}/${backup.stats.discussionMessageCount}`);
    console.log(`   Night Messages: ${importedNightMessages}/${backup.stats.nightMessageCount}`);
    console.log(`   Votes: ${importedVotes}/${backup.stats.voteCount}`);
    console.log(`   Game Events: ${importedEvents}/${backup.stats.eventCount}\n`);

    await prisma.$disconnect();
  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

importData();
