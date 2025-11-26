/**
 * Atomic Upload Handler
 *
 * Implements two-phase commit pattern for file uploads:
 * 1. Validate files
 * 2. Upload to storage
 * 3. Create database record
 * 4. Rollback on failure
 *
 * This ensures no orphaned files or database records.
 */

import { generateProjectId } from '@/lib/utils/nanoid'
import { generatePassword, hashPassword } from '@/lib/utils/password'
import { prisma } from '@/lib/db/client'
import { fileStorage } from '@/lib/storage'
import {
  validateFileSize,
  validateHtmlSelfContained
} from './validator'
import env from '@/lib/env'

export interface CreateProjectInput {
  project_name: string
  student_name: string
  student_email: string
  research_topic: string
  password?: string
}

export interface UploadedFiles {
  docx: Buffer
  html: Buffer
}

export interface CreateProjectResult {
  projectId: string
  password: string
  url: string
  htmlWarnings: string[]
  hasPlotly: boolean
}

/**
 * Create a new project with file uploads (atomic operation)
 *
 * This function implements a two-phase commit:
 * - Phase 1: Validate and upload files
 * - Phase 2: Create database record
 * - Rollback: Delete uploaded files if database insert fails
 *
 * @param data - Project metadata
 * @param files - Uploaded DOCX and HTML files
 * @returns Project creation result with URL and password
 * @throws FileValidationError if validation fails
 * @throws Error if upload or database insert fails
 */
export async function createProjectAtomic(
  data: CreateProjectInput,
  files: UploadedFiles
): Promise<CreateProjectResult> {
  const projectId = generateProjectId()
  const password = data.password || generatePassword()
  const passwordHash = await hashPassword(password)

  let docxUrl: string | null = null
  let htmlUrl: string | null = null

  try {
    // Step 1: Validate files
    validateFileSize(files.docx)
    validateFileSize(files.html)

    // Step 2: Validate HTML for external dependencies
    const htmlValidation = validateHtmlSelfContained(files.html.toString('utf-8'))

    // Step 3: Upload files to storage
    docxUrl = await fileStorage.upload(projectId, 'findings.docx', files.docx)
    htmlUrl = await fileStorage.upload(projectId, 'report.html', files.html)

    // Step 4: Create database record
    await prisma.project.create({
      data: {
        projectId,
        projectName: data.project_name,
        studentName: data.student_name,
        studentEmail: data.student_email,
        researchTopic: data.research_topic,
        passwordHash,
        docxUrl,
        htmlUrl,
      }
    })

    return {
      projectId,
      password,
      url: `${env.NEXT_PUBLIC_BASE_URL}/preview/${projectId}`,
      htmlWarnings: htmlValidation.warnings,
      hasPlotly: htmlValidation.hasPlotly,
    }

  } catch (error) {
    // Rollback: Delete uploaded files
    if (docxUrl) {
      await fileStorage.delete(projectId, 'findings.docx').catch(() => {
        // Ignore deletion errors during rollback
        console.error('Failed to delete DOCX during rollback:', error)
      })
    }
    if (htmlUrl) {
      await fileStorage.delete(projectId, 'report.html').catch(() => {
        // Ignore deletion errors during rollback
        console.error('Failed to delete HTML during rollback:', error)
      })
    }

    // Re-throw original error
    throw error
  }
}

/**
 * Delete a project and all associated files
 *
 * This is a soft delete - sets deletedAt timestamp in database.
 * Also deletes physical files from storage.
 *
 * @param projectId - Project to delete
 * @throws Error if project not found or deletion fails
 */
export async function deleteProjectWithFiles(projectId: string): Promise<void> {
  // Soft delete in database
  const project = await prisma.project.update({
    where: { projectId },
    data: { deletedAt: new Date() }
  })

  if (!project) {
    throw new Error('Project not found')
  }

  // Delete physical files (best effort - log errors but don't fail)
  try {
    await fileStorage.deleteProject(projectId)
  } catch (error) {
    console.error(`Failed to delete files for project ${projectId}:`, error)
    // Don't throw - soft delete already succeeded
  }

  // Delete project sessions (students can no longer access)
  await prisma.projectSession.deleteMany({
    where: { projectId }
  }).catch((error) => {
    console.error(`Failed to delete sessions for project ${projectId}:`, error)
  })
}
