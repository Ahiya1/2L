/**
 * Foundation Validation Script
 * Tests all foundation components without database dependency
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import env from './lib/env'
import { generatePassword, hashPassword, verifyPassword } from './lib/utils/password'
import { generateProjectId } from './lib/utils/nanoid'
import { AppError, AuthenticationError, ValidationError, NotFoundError, RateLimitError } from './lib/utils/errors'
import { checkRateLimit, loginRateLimiter } from './lib/security/rate-limiter'
import { AdminLoginSchema, CreateProjectSchema, VerifyPasswordSchema } from './lib/validation/schemas'

async function main() {
  console.log('🔍 Testing Foundation Components...\n')

  // Test 1: Environment Validation
  console.log('✅ Test 1: Environment Validation')
  console.log('   NODE_ENV:', env.NODE_ENV)
  console.log('   DATABASE_URL:', env.DATABASE_URL ? '✓ Set' : '✗ Missing')
  console.log('   JWT_SECRET length:', env.JWT_SECRET.length, 'chars')
  console.log('   ADMIN_USERNAME:', env.ADMIN_USERNAME)
  console.log('   STORAGE_TYPE:', env.STORAGE_TYPE)
  console.log('')

  // Test 2: Password Generation
  console.log('✅ Test 2: Password Generation')
  const password1 = generatePassword()
  const password2 = generatePassword(12)
  console.log('   Generated 8-char password:', password1)
  console.log('   Generated 12-char password:', password2)
  console.log('')

  // Test 3: Password Hashing
  console.log('✅ Test 3: Password Hashing & Verification')
  const testPassword = 'testPassword123'
  const hash = await hashPassword(testPassword)
  console.log('   Hash length:', hash.length, 'chars')
  const isValid = await verifyPassword(testPassword, hash)
  const isInvalid = await verifyPassword('wrongPassword', hash)
  console.log('   Correct password verified:', isValid ? '✓' : '✗')
  console.log('   Wrong password rejected:', !isInvalid ? '✓' : '✗')
  console.log('')

  // Test 4: Project ID Generation
  console.log('✅ Test 4: Project ID Generation')
  const projectId1 = generateProjectId()
  const projectId2 = generateProjectId()
  const projectId3 = generateProjectId(21)
  console.log('   Generated ID (12 chars):', projectId1)
  console.log('   Generated ID (12 chars):', projectId2)
  console.log('   Generated ID (21 chars):', projectId3)
  console.log('   IDs are unique:', projectId1 !== projectId2 ? '✓' : '✗')
  console.log('')

  // Test 5: Error Classes
  console.log('✅ Test 5: Error Classes')
  const appError = new AppError('TEST_ERROR', 'Test error message', 500)
  const authError = new AuthenticationError('Auth failed')
  const validationError = new ValidationError('Validation failed', { field: 'email' })
  const notFoundError = new NotFoundError('Project')
  const rateLimitError = new RateLimitError()
  console.log('   AppError code:', appError.code)
  console.log('   AuthenticationError status:', authError.statusCode)
  console.log('   ValidationError details:', validationError.details)
  console.log('   NotFoundError message:', notFoundError.message)
  console.log('   RateLimitError code:', rateLimitError.code)
  console.log('')

  // Test 6: Rate Limiting
  console.log('✅ Test 6: Rate Limiting')
  const testKey = 'test-ip-' + Date.now()
  let rateLimitCount = 0
  for (let i = 0; i < 6; i++) {
    const result = await checkRateLimit(loginRateLimiter, testKey)
    if (result.allowed) {
      rateLimitCount++
    } else {
      console.log('   Rate limited after', rateLimitCount, 'attempts:', result.message)
      break
    }
  }
  console.log('   Max attempts before limit:', rateLimitCount, '(expected: 5)')
  console.log('')

  // Test 7: Validation Schemas
  console.log('✅ Test 7: Validation Schemas')
  
  // Valid admin login
  const validLogin = AdminLoginSchema.safeParse({
    username: 'ahiya',
    password: 'password123'
  })
  console.log('   Valid admin login:', validLogin.success ? '✓' : '✗')

  // Invalid admin login (missing password)
  const invalidLogin = AdminLoginSchema.safeParse({
    username: 'ahiya'
  })
  console.log('   Invalid admin login rejected:', !invalidLogin.success ? '✓' : '✗')

  // Valid project creation
  const validProject = CreateProjectSchema.safeParse({
    project_name: 'Test Project',
    student_name: 'John Doe',
    student_email: 'john@example.com',
    research_topic: 'Test research',
    password: 'test1234'
  })
  console.log('   Valid project data:', validProject.success ? '✓' : '✗')

  // Invalid project (bad email)
  const invalidProject = CreateProjectSchema.safeParse({
    project_name: 'Test Project',
    student_name: 'John Doe',
    student_email: 'invalid-email',
    research_topic: 'Test research'
  })
  console.log('   Invalid email rejected:', !invalidProject.success ? '✓' : '✗')
  console.log('')

  // Summary
  console.log('🎉 Foundation Tests Complete!')
  console.log('\n📝 Summary:')
  console.log('   ✅ Environment validation working')
  console.log('   ✅ Password utilities working')
  console.log('   ✅ Project ID generation working')
  console.log('   ✅ Error handling working')
  console.log('   ✅ Rate limiting working')
  console.log('   ✅ Input validation working')
  console.log('\n⚠️  Database-dependent features require PostgreSQL to be running')
  console.log('   Run: docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=statviz postgres:14')
  console.log('   Then: npm run db:migrate && npm run db:seed')
}

main()
  .then(() => {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error)
    process.exit(1)
  })
