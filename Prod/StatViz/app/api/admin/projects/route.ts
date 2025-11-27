export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { createProjectAtomic } from '@/lib/upload/handler'
import { validateRequiredFiles, FileValidationError } from '@/lib/upload/validator'

/**
 * GET /api/admin/projects - List all projects
 *
 * Returns list of all non-deleted projects ordered by creation date (newest first)
 * Requires admin authentication
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     projects: [
 *       {
 *         projectId: string,
 *         projectName: string,
 *         studentName: string,
 *         studentEmail: string,
 *         createdAt: string,
 *         viewCount: number,
 *         lastAccessed: string | null
 *       }
 *     ]
 *   }
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const authError = await requireAdminAuth(req)
    if (authError) return authError

    // Fetch all non-deleted projects
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        projectId: true,
        projectName: true,
        studentName: true,
        studentEmail: true,
        createdAt: true,
        viewCount: true,
        lastAccessed: true,
      }
    })

    return NextResponse.json({
      success: true,
      data: { projects }
    })

  } catch (error) {
    console.error('GET /api/admin/projects error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/projects - Create new project
 *
 * Implemented by Builder-2 (file upload handler)
 * Handles multipart form data with DOCX and HTML files
 * Implements atomic operation with rollback on failure
 *
 * Request (multipart/form-data):
 * - project_name: string (max 500 chars)
 * - student_name: string (max 255 chars)
 * - student_email: string (valid email)
 * - research_topic: string
 * - password: string (optional, min 6 chars) - auto-generated if not provided
 * - docx_file: File (DOCX format, max 50 MB)
 * - html_file: File (HTML format, max 50 MB)
 *
 * Response:
 * - 200: { success: true, data: { project_id, project_url, password, html_warnings, has_plotly } }
 * - 400: { success: false, error: { code, message, details } } - Validation error
 * - 500: { success: false, error: { code, message } } - Server error
 *
 * Note: Vercel Hobby plan has 4.5 MB body limit.
 * Requires Vercel Pro ($20/month) for 50 MB uploads.
 * Alternative: Implement chunked upload or direct client→S3 upload.
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const authError = await requireAdminAuth(req)
    if (authError) return authError

    // Request validation schema
    const CreateProjectSchema = z.object({
      project_name: z.string().min(1, 'Project name is required').max(500, 'Project name too long'),
      student_name: z.string().min(1, 'Student name is required').max(255, 'Student name too long'),
      student_email: z.string().email('Invalid email format'),
      research_topic: z.string().min(1, 'Research topic is required'),
      password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    })

    // Parse multipart form data
    const formData = await req.formData()

    const data = {
      project_name: formData.get('project_name') as string,
      student_name: formData.get('student_name') as string,
      student_email: formData.get('student_email') as string,
      research_topic: formData.get('research_topic') as string,
      password: (formData.get('password') as string) || undefined,
    }

    const docxFile = formData.get('docx_file') as File | null
    const htmlFile = formData.get('html_file') as File | null

    // Validate files exist
    if (!docxFile || !htmlFile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILES',
            message: 'Both DOCX and HTML files are required'
          }
        },
        { status: 400 }
      )
    }

    // Validate text data
    const validated = CreateProjectSchema.parse(data)

    // Convert files to buffers
    const files = {
      docx: Buffer.from(await docxFile.arrayBuffer()),
      html: Buffer.from(await htmlFile.arrayBuffer()),
    }

    // Validate required files
    const fileError = validateRequiredFiles(files)
    if (fileError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILES',
            message: fileError
          }
        },
        { status: 400 }
      )
    }

    // Create project (atomic operation with rollback)
    const result = await createProjectAtomic(validated, files)

    return NextResponse.json({
      success: true,
      data: {
        project_id: result.projectId,
        project_url: result.url,
        password: result.password,
        html_warnings: result.htmlWarnings,
        has_plotly: result.hasPlotly,
      }
    })

  } catch (error) {
    // File validation error
    if (error instanceof FileValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_VALIDATION_ERROR',
            message: error.message
          }
        },
        { status: 400 }
      )
    }

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

    // Unexpected error
    console.error('POST /api/admin/projects error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create project'
        }
      },
      { status: 500 }
    )
  }
}
