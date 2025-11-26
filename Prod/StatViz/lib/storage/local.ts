/**
 * Local Filesystem Storage Implementation
 *
 * Stores files in local filesystem organized by project ID.
 * File structure: /uploads/{projectId}/{filename}
 *
 * This is the MVP storage solution. Production should migrate to S3.
 */

import fs from 'fs/promises'
import path from 'path'
import { FileStorage } from './interface'
import env from '@/lib/env'

export class LocalFileStorage implements FileStorage {
  private uploadDir: string

  constructor() {
    this.uploadDir = env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
  }

  async upload(projectId: string, filename: string, buffer: Buffer): Promise<string> {
    const projectDir = path.join(this.uploadDir, projectId)
    const filePath = path.join(projectDir, filename)

    // Create project directory if not exists
    await fs.mkdir(projectDir, { recursive: true })

    // Write file
    await fs.writeFile(filePath, buffer)

    return `/uploads/${projectId}/${filename}`
  }

  async download(projectId: string, filename: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, projectId, filename)
    return await fs.readFile(filePath)
  }

  async delete(projectId: string, filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, projectId, filename)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      // Ignore error if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    const projectDir = path.join(this.uploadDir, projectId)
    try {
      await fs.rm(projectDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore error if directory doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  getUrl(projectId: string, filename: string): string {
    return `/uploads/${projectId}/${filename}`
  }
}
