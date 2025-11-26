import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db/client'
import env from '@/lib/env'

export async function verifyAdminLogin(
  username: string,
  password: string,
  ipAddress?: string
): Promise<{ token: string } | null> {
  // Validate credentials
  if (username !== env.ADMIN_USERNAME) {
    return null
  }

  const isValid = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH)
  if (!isValid) {
    return null
  }

  // Generate JWT token (30 min expiry)
  const token = jwt.sign(
    { type: 'admin', userId: username },
    env.JWT_SECRET,
    { expiresIn: '30m' }
  )

  // Store session in database
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  await prisma.adminSession.create({
    data: {
      token,
      expiresAt,
      ipAddress,
    }
  })

  return { token }
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    // Verify JWT signature and expiration
    jwt.verify(token, env.JWT_SECRET)

    // Check database session
    const session = await prisma.adminSession.findUnique({
      where: { token }
    })

    if (!session) return false

    // Check expiration
    if (session.expiresAt < new Date()) {
      // Expired - delete session
      await prisma.adminSession.delete({ where: { token } })
      return false
    }

    return true
  } catch (error) {
    console.error('Admin token verification failed:', error)
    return false
  }
}

export async function revokeAdminToken(token: string): Promise<void> {
  await prisma.adminSession.delete({ where: { token } }).catch(() => {})
}
