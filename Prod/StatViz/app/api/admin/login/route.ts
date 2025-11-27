export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminLogin } from '@/lib/auth/admin'
import { loginRateLimiter, checkRateLimit } from '@/lib/security/rate-limiter'
import { errorResponse } from '@/lib/utils/errors'

// Request validation schema
const AdminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// POST /api/admin/login - Admin login
export async function POST(req: NextRequest) {
  try {
    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Check rate limit
    const rateLimit = await checkRateLimit(loginRateLimiter, ipAddress)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות.'
          }
        },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { username, password } = AdminLoginSchema.parse(body)

    // Verify credentials
    const result = await verifyAdminLogin(username, password, ipAddress)

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'שם משתמש או סיסמה שגויים'
          }
        },
        { status: 401 }
      )
    }

    // Create response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      data: { message: 'התחברת בהצלחה' }
    })

    // Set httpOnly cookie
    response.cookies.set('admin_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60, // 30 minutes
      path: '/',
    })

    return response

  } catch (error) {
    // Zod validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors
          }
        },
        { status: 400 }
      )
    }

    return errorResponse(error)
  }
}
