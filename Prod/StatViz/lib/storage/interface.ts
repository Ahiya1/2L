/**
 * Storage Abstraction Interface
 *
 * This interface defines the contract for file storage implementations.
 * It enables swapping between local filesystem storage (MVP) and S3 (production)
 * without changing application code.
 */

export interface FileStorage {
  /**
   * Upload a file to storage
   * @param projectId - Unique project identifier
   * @param filename - File name (e.g., 'findings.docx', 'report.html')
   * @param buffer - File contents as Buffer
   * @returns URL or path to uploaded file
   */
  upload(projectId: string, filename: string, buffer: Buffer): Promise<string>

  /**
   * Download a file from storage
   * @param projectId - Unique project identifier
   * @param filename - File name
   * @returns File contents as Buffer
   */
  download(projectId: string, filename: string): Promise<Buffer>

  /**
   * Delete a file from storage
   * @param projectId - Unique project identifier
   * @param filename - File name
   */
  delete(projectId: string, filename: string): Promise<void>

  /**
   * Delete all files for a project
   * @param projectId - Unique project identifier
   */
  deleteProject(projectId: string): Promise<void>

  /**
   * Get public URL for a file
   * @param projectId - Unique project identifier
   * @param filename - File name
   * @returns URL to access file
   */
  getUrl(projectId: string, filename: string): string
}
