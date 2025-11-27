export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { fileStorage } from '@/lib/storage'
import { LocalFileStorage } from '@/lib/storage/local'

/**
 * GET /api/admin/projects/[id] - Get project details
 *
 * Returns full project metadata for a specific project
 * Requires admin authentication
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     project: {
 *       projectId: string,
 *       projectName: string,
 *       studentName: string,
 *       studentEmail: string,
 *       researchTopic: string,
 *       createdAt: string,
 *       createdBy: string,
 *       docxUrl: string,
 *       htmlUrl: string,
 *       viewCount: number,
 *       lastAccessed: string | null,
 *       deletedAt: string | null
 *     }
 *   }
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await requireAdminAuth(req)
    if (authError) return authError

    const projectId = params.id

    // Fetch project
    const project = await prisma.project.findUnique({
      where: { projectId }
    })

    // Check if project exists and is not deleted
    if (!project || project.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found'
          }
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { project }
    })

  } catch (error) {
    console.error(`GET /api/admin/projects/${params.id} error:`, error)
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
 * DELETE /api/admin/projects/[id] - Delete project
 *
 * Soft deletes the project (sets deletedAt timestamp) and removes files from storage
 * Requires admin authentication
 *
 * Process:
 * 1. Soft delete database record (set deletedAt)
 * 2. Delete files from storage (findings.docx, report.html)
 * 3. Delete all project sessions (students can't access anymore)
 *
 * If file deletion fails, logs error but doesn't rollback DB
 * (files can be cleaned up manually)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     message: 'Project deleted successfully'
 *   }
 * }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authError = await requireAdminAuth(req)
    if (authError) return authError

    const projectId = params.id

    // Fetch project first to ensure it exists
    const project = await prisma.project.findUnique({
      where: { projectId }
    })

    if (!project || project.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found or already deleted'
          }
        },
        { status: 404 }
      )
    }

    // Step 1: Soft delete database record
    await prisma.project.update({
      where: { projectId },
      data: { deletedAt: new Date() }
    })

    // Step 2: Delete project sessions (students can't access anymore)
    await prisma.projectSession.deleteMany({
      where: { projectId }
    })

    // Step 3: Delete files from storage
    // Use deleteProject method if available (LocalFileStorage), otherwise delete individual files
    try {
      if (fileStorage instanceof LocalFileStorage) {
        // Delete entire project directory (more efficient)
        await fileStorage.deleteProject(projectId)
      } else {
        // Delete individual files (S3 implementation)
        await fileStorage.delete(projectId, 'findings.docx')
        await fileStorage.delete(projectId, 'report.html')
      }
    } catch (fileError) {
      console.error(`File deletion error for project ${projectId}:`, fileError)
      // Log but don't fail - files can be cleaned up manually
      // The database record is already soft-deleted, which is the critical operation
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Project deleted successfully'
      }
    })

  } catch (error) {
    console.error(`DELETE /api/admin/projects/${params.id} error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete project'
        }
      },
      { status: 500 }
    )
  }
}
