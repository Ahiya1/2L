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
  errors?: string[]
}

export interface FileSizeValidationResult {
  isValid: boolean
  warning?: string
  error?: string
  sizeMB: number
}

/**
 * Validate HTML file size for mobile performance
 *
 * - Files >10MB are blocked (exceeds reasonable mobile load time)
 * - Files >5MB show warning (may load slowly on 3G)
 * - Files <=5MB are optimal
 *
 * @param buffer - HTML file buffer
 * @returns Validation result with size information and warnings/errors
 */
export function validateHtmlFileSize(buffer: Buffer): FileSizeValidationResult {
  const sizeMB = buffer.length / 1024 / 1024

  if (sizeMB > 10) {
    return {
      isValid: false,
      error: `קובץ HTML גדול מדי (${sizeMB.toFixed(1)}MB). מקסימום: 10MB`,
      sizeMB,
    }
  }

  if (sizeMB > 5) {
    return {
      isValid: true,
      warning: `קובץ גדול (${sizeMB.toFixed(1)}MB) - עשוי לטעון לאט במובייל (מומלץ <5MB)`,
      sizeMB,
    }
  }

  return {
    isValid: true,
    sizeMB,
  }
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
  const errors: string[] = []

  // Check for external CSS - ERROR (not warning)
  $('link[rel="stylesheet"]').each((i, el) => {
    const href = $(el).attr('href')
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      errors.push(`הקובץ מכיל CSS חיצוני - חייב להיות עצמאי (selfcontained=TRUE ב-R)`)
    }
  })

  // Check for external JavaScript - ERROR (not warning)
  // Exception: Allow Plotly CDN (trusted library for statistical visualizations)
  const ALLOWED_CDN_PATTERNS = [
    /^https:\/\/cdn\.plot\.ly\/plotly-[\d.]+\.min\.js$/,  // Plotly CDN
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/plotly\.js@[\d.]+\/dist\/plotly\.min\.js$/,  // Plotly via jsDelivr
  ]

  $('script[src]').each((i, el) => {
    const src = $(el).attr('src')
    if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
      // Check if it matches allowed CDN patterns
      const isAllowed = ALLOWED_CDN_PATTERNS.some(pattern => pattern.test(src))
      if (!isAllowed) {
        errors.push(`הקובץ מכיל JavaScript חיצוני לא מורשה: ${src}`)
      }
    }
  })

  // Check for external images - ERROR (not warning)
  $('img[src]').each((i, el) => {
    const src = $(el).attr('src')
    if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
      errors.push(`הקובץ מכיל תמונות חיצוניות - חייב להיות עצמאי (selfcontained=TRUE ב-R)`)
    }
  })

  // Check if Plotly is embedded
  const hasPlotly = $('script:contains("Plotly")').length > 0 ||
                    htmlContent.includes('plotly.min.js') ||
                    htmlContent.includes('plotly-latest.min.js')

  if (!hasPlotly) {
    warnings.push('ספריית Plotly לא זוהתה - גרפים אינטראקטיביים עשויים לא לעבוד')
  }

  return {
    warnings,
    hasPlotly,
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
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
