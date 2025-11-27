export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyProjectPassword } from '@/lib/auth/project'
import { VerifyPasswordSchema } from '@/lib/validation/schemas'
import { passwordRateLimiter, checkRateLimit } from '@/lib/security/rate-limiter'

/**
 * POST /api/preview/[id]/verify
 *
 * Verify project password and generate session token.
 *
 * Rate limiting: 10 attempts per hour per project_id
 * Updates view count and last accessed timestamp on successful verification.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    // Rate limiting by project ID (prevent brute force on specific projects)
    const rateLimit = await checkRateLimit(passwordRateLimiter, projectId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'יותר מדי ניסיונות סיסמה. נסה שוב בעוד שעה.',
          }
        },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await req.json()

    // Validate input
    const validated = VerifyPasswordSchema.parse(body)

    // Verify password
    const result = await verifyProjectPassword(projectId, validated.password)

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'סיסמה שגויה. אנא נסה שוב.',
          }
        },
        { status: 401 }
      )
    }

    // Set httpOnly cookie with token
    const response = NextResponse.json({
      success: true,
      data: {
        message: 'Authentication successful',
      }
    })

    response.cookies.set('project_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
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
            message: 'Invalid request format',
            details: error.errors
          }
        },
        { status: 400 }
      )
    }

    console.error('POST /api/preview/[id]/verify error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during authentication'
        }
      },
      { status: 500 }
    )
  }
}
