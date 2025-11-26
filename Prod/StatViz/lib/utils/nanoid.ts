import { nanoid as generateNanoid } from 'nanoid'

/**
 * Generate URL-safe project ID
 * Default length: 12 chars for shorter URLs
 * (21 chars would match UUID collision resistance)
 */
export function generateProjectId(length: number = 12): string {
  return generateNanoid(length)
}
