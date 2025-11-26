import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/client'

export async function POST(_req: NextRequest) {
  try {
    // Get token from cookie
    const token = cookies().get('admin_token')?.value

    if (token) {
      // Delete session from database
      await prisma.adminSession.delete({
        where: { token }
      }).catch(() => {
        // Ignore errors if session doesn't exist
      })
    }

    // Clear cookie
    const response = NextResponse.json({
      success: true,
      data: { message: 'התנתקת בהצלחה' }
    })

    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    })

    return response

  } catch (error) {
    console.error('POST /api/admin/logout error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'שגיאה בניתוק'
        }
      },
      { status: 500 }
    )
  }
}
