export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { verifyProjectToken } from '@/lib/auth/project'
import { fileStorage } from '@/lib/storage'

/**
 * GET /api/preview/[id]/download
 *
 * Download DOCX findings file.
 * Requires valid project session token in cookie.
 *
 * Returns DOCX file with attachment headers to trigger browser download.
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
      select: {
        deletedAt: true,
        docxUrl: true,
        projectName: true,
      }
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

    // Download DOCX file from storage
    const docxBuffer = await fileStorage.download(projectId, 'findings.docx')

    // Generate filename with project name (sanitize for filesystem)
    const sanitizedName = project.projectName
      .replace(/[^a-zA-Z0-9\u0590-\u05FF\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50) || 'findings'

    const filename = `${sanitizedName}_findings.docx`

    // Return DOCX with download headers (convert Buffer to Uint8Array)
    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('GET /api/preview/[id]/download error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while downloading file'
        }
      },
      { status: 500 }
    )
  }
}
