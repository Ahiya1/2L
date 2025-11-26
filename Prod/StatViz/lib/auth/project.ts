import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db/client'
import env from '@/lib/env'

/**
 * Project Password Authentication
 *
 * Handles password verification, session token generation, and token validation
 * for student project access. Uses JWT tokens with 24-hour expiry stored in
 * httpOnly cookies.
 */

export async function verifyProjectPassword(
  projectId: string,
  password: string
): Promise<{ token: string } | null> {
  // Fetch project
  const project = await prisma.project.findUnique({
    where: { projectId },
    select: { passwordHash: true, deletedAt: true }
  })

  // Check existence and soft delete
  if (!project || project.deletedAt) {
    return null
  }

  // Verify password
  const isValid = await bcrypt.compare(password, project.passwordHash)
  if (!isValid) {
    return null
  }

  // Generate session token (24 hour expiry)
  const token = jwt.sign(
    { type: 'project', projectId },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  )

  // Store session in database
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.projectSession.create({
    data: {
      projectId,
      token,
      expiresAt,
    }
  })

  // Update view count and last accessed
  await prisma.project.update({
    where: { projectId },
    data: {
      viewCount: { increment: 1 },
      lastAccessed: new Date(),
    }
  })

  return { token }
}

export async function verifyProjectToken(
  token: string,
  projectId: string
): Promise<boolean> {
  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, env.JWT_SECRET) as { type: string; projectId: string }

    // Ensure token is for correct project
    if (decoded.projectId !== projectId) {
      return false
    }

    // Check database session
    const session = await prisma.projectSession.findUnique({
      where: { token }
    })

    if (!session) return false

    // Check expiration
    if (session.expiresAt < new Date()) {
      // Expired - delete session
      await prisma.projectSession.delete({ where: { token } })
      return false
    }

    return true
  } catch (error) {
    console.error('Project token verification failed:', error)
    return false
  }
}

export async function revokeProjectToken(token: string): Promise<void> {
  await prisma.projectSession.delete({ where: { token } }).catch(() => {})
}
