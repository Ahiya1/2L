import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function enableWAL() {
  try {
    // Enable WAL mode
    const walResult = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>('PRAGMA journal_mode = WAL')
    console.log('Set journal_mode:', walResult[0]?.journal_mode)

    // Enable foreign keys
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON')

    // Verify WAL mode
    const verifyResult = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>('PRAGMA journal_mode')
    console.log('Verified journal mode:', verifyResult[0]?.journal_mode)

    if (verifyResult[0]?.journal_mode === 'wal') {
      console.log('✓ WAL mode enabled successfully')
    } else {
      console.log('✗ WAL mode not enabled')
    }
  } catch (error) {
    console.error('Error enabling WAL:', error)
  } finally {
    await prisma.$disconnect()
  }
}

enableWAL()
