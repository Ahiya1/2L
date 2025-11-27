/**
 * File Storage Factory
 *
 * Exports the active storage implementation based on STORAGE_TYPE environment variable.
 * Switches between local filesystem (dev) and Supabase Storage (production) without code changes.
 */

import { FileStorage } from './interface'
import { LocalFileStorage } from './local'
import { S3FileStorage } from './s3'
import { SupabaseFileStorage } from './supabase'
import env from '@/lib/env'

// Export the active storage implementation based on environment
export const fileStorage: FileStorage =
  env.STORAGE_TYPE === 's3'
    ? new S3FileStorage()
    : env.STORAGE_TYPE === 'supabase'
    ? new SupabaseFileStorage()
    : new LocalFileStorage()

// Re-export interface for type imports
export type { FileStorage } from './interface'
export { LocalFileStorage } from './local'
export { S3FileStorage } from './s3'
export { SupabaseFileStorage } from './supabase'
