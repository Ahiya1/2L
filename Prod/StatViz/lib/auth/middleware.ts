import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth/admin'
import { verifyProjectToken } from '@/lib/auth/project'

/**
 * Authentication Middleware Functions
 *
 * Provides authentication middleware for both admin and project routes.
 * Returns NextResponse with error for auth failures, null for success.
 */

export async function requireAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get('admin_token')?.value

  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const isValid = await verifyAdminToken(token)
  if (!isValid) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } },
      { status: 401 }
    )
  }

  return null // Success - continue to handler
}

export async function requireProjectAuth(
  request: NextRequest,
  projectId: string
): Promise<NextResponse | null> {
  const token = request.cookies.get('project_token')?.value

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'נדרשת הזדהות. אנא הזן את סיסמת הפרויקט.'
        }
      },
      { status: 401 }
    )
  }

  const isValid = await verifyProjectToken(token, projectId)
  if (!isValid) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'טוקן לא תקין או פג תוקף. אנא הזן את הסיסמה שוב.'
        }
      },
      { status: 401 }
    )
  }

  return null // Success - continue to handler
}
