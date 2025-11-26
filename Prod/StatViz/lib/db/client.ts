/**
 * Prisma Client Singleton
 *
 * DEPENDENCY: This file should be created by Builder-1
 *
 * This is a placeholder to enable Builder-3 development.
 * Builder-1 will replace this with the actual implementation.
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
