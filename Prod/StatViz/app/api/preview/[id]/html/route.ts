export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { verifyProjectToken } from '@/lib/auth/project'
import { fileStorage } from '@/lib/storage'

/**
 * GET /api/preview/[id]/html
 *
 * Serve HTML report content.
 * Requires valid project session token in cookie.
 *
 * Returns HTML file with proper Content-Type header for browser rendering.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    // Get token from cookie
    const token = req.cookies.get('project_token')?.value

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'סיסמה נדרשת',
          }
        },
        { status: 401 }
      )
    }

    // Verify token
    const isValid = await verifyProjectToken(token, projectId)
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'הפגישה פגה תוקף. נא להזין סיסמה שוב.',
          }
        },
        { status: 401 }
      )
    }

    // Check project exists and not deleted
    const project = await prisma.project.findUnique({
      where: { projectId },
      select: { deletedAt: true, htmlUrl: true }
    })

    if (!project || project.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'פרויקט לא נמצא',
          }
        },
        { status: 404 }
      )
    }

    // Download HTML file from storage
    const htmlBuffer = await fileStorage.download(projectId, 'report.html')

    // Return HTML with proper headers
    return new NextResponse(htmlBuffer.toString('utf-8'), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('GET /api/preview/[id]/html error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while serving HTML content'
        }
      },
      { status: 500 }
    )
  }
}
