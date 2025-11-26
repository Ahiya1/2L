/**
 * File Validation Utilities
 *
 * Provides functions for validating uploaded files:
 * - File size limits (50 MB max)
 * - MIME type validation (DOCX and HTML only)
 * - HTML self-contained validation (detects external dependencies)
 */

import * as cheerio from 'cheerio'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

const ALLOWED_MIME_TYPES = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  html: 'text/html',
}

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
  }
}

/**
 * Validate file size
 * @param buffer - File buffer
 * @param maxSize - Maximum allowed size in bytes (default: 50 MB)
 * @throws FileValidationError if file exceeds max size
 */
export function validateFileSize(buffer: Buffer, maxSize: number = MAX_FILE_SIZE): void {
  if (buffer.length > maxSize) {
    throw new FileValidationError(
      `File size ${(buffer.length / 1024 / 1024).toFixed(2)} MB exceeds limit of ${maxSize / 1024 / 1024} MB`
    )
  }
}

/**
 * Validate MIME type
 * @param mimetype - File MIME type from upload
 * @param expectedType - Expected file type ('docx' or 'html')
 * @throws FileValidationError if MIME type doesn't match
 */
export function validateMimeType(mimetype: string, expectedType: 'docx' | 'html'): void {
  const allowed = ALLOWED_MIME_TYPES[expectedType]

  // HTML can sometimes be detected as application/octet-stream by browsers
  if (expectedType === 'html' && mimetype === 'application/octet-stream') {
    return // Allow
  }

  if (mimetype !== allowed) {
    throw new FileValidationError(
      `Invalid MIME type: ${mimetype}. Expected: ${allowed}`
    )
  }
}

export interface HtmlValidationResult {
  warnings: string[]
  hasPlotly: boolean
  isValid: boolean
}

/**
 * Validate HTML for self-contained content
 *
 * Checks for external dependencies that might break offline viewing:
 * - External CSS files
 * - External JavaScript files
 * - External images
 *
 * Also checks if Plotly library is embedded (required for interactive charts).
 *
 * @param htmlContent - HTML file content as string
 * @returns Validation result with warnings and Plotly detection
 */
export function validateHtmlSelfContained(htmlContent: string): HtmlValidationResult {
  const $ = cheerio.load(htmlContent)
  const warnings: string[] = []

  // Check for external CSS
  $('link[rel="stylesheet"]').each((i, el) => {
    const href = $(el).attr('href')
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      warnings.push(`External CSS detected: ${href}`)
    }
  })

  // Check for external JavaScript
  $('script[src]').each((i, el) => {
    const src = $(el).attr('src')
    if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
      warnings.push(`External JS detected: ${src}`)
    }
  })

  // Check for external images
  $('img[src]').each((i, el) => {
    const src = $(el).attr('src')
    if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
      warnings.push(`External image detected: ${src}`)
    }
  })

  // Check if Plotly is embedded
  const hasPlotly = $('script:contains("Plotly")').length > 0 ||
                    htmlContent.includes('plotly.min.js') ||
                    htmlContent.includes('plotly-latest.min.js')

  if (!hasPlotly) {
    warnings.push('Plotly library not detected - interactive charts may not work')
  }

  return {
    warnings,
    hasPlotly,
    isValid: warnings.length === 0 || warnings.every(w => w.includes('Plotly'))
  }
}

/**
 * Validate that required files are present
 * @param files - Object containing uploaded files
 * @returns Error message if validation fails, null if success
 */
export function validateRequiredFiles(files: {
  docx?: Buffer | null
  html?: Buffer | null
}): string | null {
  if (!files.docx) {
    return 'DOCX file is required'
  }
  if (!files.html) {
    return 'HTML file is required'
  }
  return null
}
