import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { verifyProjectToken } from '@/lib/auth/project'

/**
 * GET /api/preview/[id]
 *
 * Get project metadata (name, student info, research topic).
 * Requires valid project session token in cookie.
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

    // Fetch project data
    const project = await prisma.project.findUnique({
      where: { projectId },
      select: {
        projectId: true,
        projectName: true,
        studentName: true,
        studentEmail: true,
        researchTopic: true,
        createdAt: true,
        viewCount: true,
        lastAccessed: true,
      }
    })

    if (!project) {
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

    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: project.projectId,
          name: project.projectName,
          student: {
            name: project.studentName,
            email: project.studentEmail,
          },
          research_topic: project.researchTopic,
          created_at: project.createdAt,
          view_count: project.viewCount,
          last_accessed: project.lastAccessed,
        }
      }
    })

  } catch (error) {
    console.error('GET /api/preview/[id] error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching project data'
        }
      },
      { status: 500 }
    )
  }
}
