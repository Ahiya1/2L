/**
 * Environment Variable Validation
 *
 * DEPENDENCY: This file should be created by Builder-1
 *
 * This is a placeholder to enable Builder-3 development.
 * Builder-1 will replace this with the actual implementation.
 */

import { z } from 'zod'

const EnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ADMIN_USERNAME: z.string().min(1, 'ADMIN_USERNAME is required'),
  ADMIN_PASSWORD_HASH_BASE64: z.string().min(1, 'ADMIN_PASSWORD_HASH_BASE64 is required'),

  // File Storage
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().optional(),

  // S3 (conditional - required if STORAGE_TYPE === 's3')
  S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),

  // Application
  NEXT_PUBLIC_BASE_URL: z.string().url('NEXT_PUBLIC_BASE_URL must be a valid URL'),
})

// Parse and validate environment variables
const parsedEnv = EnvSchema.parse(process.env)

// Decode base64-encoded admin password hash
const adminPasswordHash = Buffer.from(parsedEnv.ADMIN_PASSWORD_HASH_BASE64, 'base64').toString('utf-8')

// Export environment with decoded hash
export const env = {
  ...parsedEnv,
  ADMIN_PASSWORD_HASH: adminPasswordHash,
}

// Conditional validation for S3
if (env.STORAGE_TYPE === 's3') {
  if (!env.S3_BUCKET || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      'S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are required when STORAGE_TYPE=s3'
    )
  }
}

// Export typed environment variables
export default env
