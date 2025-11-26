# Code Patterns & Conventions

## File Structure

```
statviz/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── login/
│   │   │   │   └── route.ts              # POST /api/admin/login
│   │   │   └── projects/
│   │   │       ├── route.ts              # GET, POST /api/admin/projects
│   │   │       └── [id]/
│   │   │           └── route.ts          # DELETE /api/admin/projects/[id]
│   │   └── preview/
│   │       └── [id]/
│   │           ├── verify/
│   │           │   └── route.ts          # POST /api/preview/[id]/verify
│   │           ├── html/
│   │           │   └── route.ts          # GET /api/preview/[id]/html
│   │           ├── download/
│   │           │   └── route.ts          # GET /api/preview/[id]/download
│   │           └── route.ts              # GET /api/preview/[id]
│   ├── layout.tsx                        # Root layout
│   └── page.tsx                          # Homepage (placeholder)
├── lib/
│   ├── auth/
│   │   ├── admin.ts                      # Admin authentication logic
│   │   ├── project.ts                    # Project authentication logic
│   │   └── middleware.ts                 # Auth middleware functions
│   ├── db/
│   │   ├── client.ts                     # Prisma client singleton
│   │   └── seed.ts                       # Database seed script
│   ├── storage/
│   │   ├── interface.ts                  # Storage abstraction interface
│   │   ├── local.ts                      # Local filesystem implementation
│   │   ├── s3.ts                         # S3 implementation (stub)
│   │   └── index.ts                      # Export active storage
│   ├── upload/
│   │   ├── validator.ts                  # File validation (MIME, size, HTML)
│   │   └── handler.ts                    # File upload handler with rollback
│   ├── utils/
│   │   ├── password.ts                   # Password generation
│   │   ├── nanoid.ts                     # Project ID generation
│   │   └── errors.ts                     # Error classes and helpers
│   ├── validation/
│   │   └── schemas.ts                    # Zod validation schemas
│   └── env.ts                            # Environment variable validation
├── prisma/
│   ├── schema.prisma                     # Database schema
│   ├── migrations/                       # Migration files
│   └── seed.ts                           # Seed data
├── middleware.ts                         # Next.js middleware (security headers)
├── uploads/                              # Local file storage (gitignored)
├── .env.example                          # Environment variable template
├── .env.local                            # Local environment (gitignored)
├── next.config.mjs                       # Next.js configuration
├── tsconfig.json                         # TypeScript configuration
└── package.json                          # Dependencies
```

---

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `AccountCard.tsx`) - Iteration 2+
- Utilities: `camelCase.ts` (e.g., `formatCurrency.ts`)
- API routes: `route.ts` (Next.js App Router convention)
- Database: `schema.prisma`, `seed.ts`

**Types:**
- Interfaces: `PascalCase` (e.g., `FileStorage`, `Project`)
- Types: `PascalCase` (e.g., `CreateProjectInput`)
- Enums: `PascalCase` (e.g., `StorageType`)

**Functions:**
- Functions: `camelCase` (e.g., `validatePassword`, `createProject`)
- React components: `PascalCase` (e.g., `LoginForm`) - Iteration 2+

**Variables:**
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`, `SALT_ROUNDS`)
- Variables: `camelCase` (e.g., `projectId`, `passwordHash`)

**Database:**
- Tables: `camelCase` (Prisma convention: `project`, `adminSession`)
- Columns: `camelCase` (e.g., `projectId`, `createdAt`)

---

## Environment Configuration Pattern

**When to use:** Centralize ALL configuration, validate on startup

**File:** `lib/env.ts`

**Code:**
```typescript
import { z } from 'zod'

const EnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ADMIN_USERNAME: z.string().min(1, 'ADMIN_USERNAME is required'),
  ADMIN_PASSWORD_HASH: z.string().min(1, 'ADMIN_PASSWORD_HASH is required'),

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
export const env = EnvSchema.parse(process.env)

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
```

**Usage in other files:**
```typescript
import env from '@/lib/env'

// Type-safe access
const jwtSecret = env.JWT_SECRET
const isDevelopment = env.NODE_ENV === 'development'
```

**Key Points:**
- Import in `app/layout.tsx` to validate on startup
- Zod provides runtime validation (catches missing vars before app runs)
- Clear error messages for developers
- Type-safe access throughout application

---

## Database Patterns

### Prisma Schema Convention

**File:** `prisma/schema.prisma`

**Code:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Project {
  id             Int       @id @default(autoincrement())
  projectId      String    @unique @db.VarChar(255)
  projectName    String    @db.VarChar(500)
  studentName    String    @db.VarChar(255)
  studentEmail   String    @db.VarChar(255)
  researchTopic  String    @db.Text
  passwordHash   String    @db.VarChar(255)
  createdAt      DateTime  @default(now())
  createdBy      String    @default("ahiya") @db.VarChar(255)
  docxUrl        String    @db.Text
  htmlUrl        String    @db.Text
  viewCount      Int       @default(0)
  lastAccessed   DateTime?
  deletedAt      DateTime? // Soft delete

  @@index([projectId])
  @@index([studentEmail])
  @@index([createdAt])
}

model AdminSession {
  id        Int      @id @default(autoincrement())
  token     String   @unique @db.VarChar(500)
  createdAt DateTime @default(now())
  expiresAt DateTime
  ipAddress String?  @db.VarChar(45)

  @@index([token])
  @@index([expiresAt])
}

model ProjectSession {
  id        Int      @id @default(autoincrement())
  projectId String   @db.VarChar(255)
  token     String   @unique @db.VarChar(500)
  createdAt DateTime @default(now())
  expiresAt DateTime

  @@index([token])
  @@index([projectId])
}
```

**Key Points:**
- Use `@db.VarChar(N)` for explicit column types
- Index on all lookup fields (`projectId`, `studentEmail`, `token`)
- Soft delete via `deletedAt` field (NULL = not deleted)
- `createdAt` defaults to current timestamp
- `viewCount` defaults to 0

### Prisma Client Singleton

**File:** `lib/db/client.ts`

**Code:**
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Usage:**
```typescript
import { prisma } from '@/lib/db/client'

// Create project
const project = await prisma.project.create({
  data: {
    projectId: 'abc123',
    projectName: 'Test Project',
    // ... other fields
  }
})

// Find project
const project = await prisma.project.findUnique({
  where: { projectId: 'abc123' }
})

// List projects (excluding soft-deleted)
const projects = await prisma.project.findMany({
  where: { deletedAt: null },
  orderBy: { createdAt: 'desc' }
})

// Soft delete
await prisma.project.update({
  where: { projectId: 'abc123' },
  data: { deletedAt: new Date() }
})
```

**Key Points:**
- Singleton pattern prevents connection leaks
- Development logs queries for debugging
- Production only logs errors
- Global variable prevents hot-reload duplication

### Database Transaction Pattern

**When to use:** Multi-step operations that must be atomic (e.g., file upload + DB insert)

**Code:**
```typescript
import { prisma } from '@/lib/db/client'

async function createProjectAtomic(data: CreateProjectInput, files: Files) {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Create database record
    const project = await tx.project.create({
      data: {
        projectId: data.projectId,
        projectName: data.projectName,
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        researchTopic: data.researchTopic,
        passwordHash: data.passwordHash,
        docxUrl: data.docxUrl,
        htmlUrl: data.htmlUrl,
      }
    })

    // Step 2: Create admin session log
    await tx.adminSession.create({
      data: {
        token: data.adminToken,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        ipAddress: data.ipAddress,
      }
    })

    return project
  })
}
```

**Key Points:**
- Prisma `$transaction` ensures atomicity
- If any step fails, entire transaction rolls back
- Use for operations with multiple database writes

---

## Authentication Patterns

### Admin Authentication

**File:** `lib/auth/admin.ts`

**Code:**
```typescript
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db/client'
import env from '@/lib/env'

const SALT_ROUNDS = 10

export async function verifyAdminLogin(
  username: string,
  password: string,
  ipAddress?: string
): Promise<{ token: string } | null> {
  // Validate credentials
  if (username !== env.ADMIN_USERNAME) {
    return null
  }

  const isValid = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH)
  if (!isValid) {
    return null
  }

  // Generate JWT token (30 min expiry)
  const token = jwt.sign(
    { type: 'admin', userId: username },
    env.JWT_SECRET,
    { expiresIn: '30m' }
  )

  // Store session in database
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  await prisma.adminSession.create({
    data: {
      token,
      expiresAt,
      ipAddress,
    }
  })

  return { token }
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    // Verify JWT signature and expiration
    jwt.verify(token, env.JWT_SECRET)

    // Check database session
    const session = await prisma.adminSession.findUnique({
      where: { token }
    })

    if (!session) return false

    // Check expiration
    if (session.expiresAt < new Date()) {
      // Expired - delete session
      await prisma.adminSession.delete({ where: { token } })
      return false
    }

    return true
  } catch (error) {
    return false
  }
}

export async function revokeAdminToken(token: string): Promise<void> {
  await prisma.adminSession.delete({ where: { token } }).catch(() => {})
}
```

**Usage:**
```typescript
// In API route
const result = await verifyAdminLogin(username, password, req.ip)
if (result) {
  // Set httpOnly cookie
  res.setHeader('Set-Cookie', `admin_token=${result.token}; HttpOnly; Secure; SameSite=Strict; Max-Age=1800`)
  return res.json({ success: true })
}
```

### Project Password Authentication

**File:** `lib/auth/project.ts`

**Code:**
```typescript
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db/client'
import env from '@/lib/env'

export async function verifyProjectPassword(
  projectId: string,
  password: string
): Promise<{ token: string } | null> {
  // Fetch project
  const project = await prisma.project.findUnique({
    where: { projectId },
    select: { passwordHash: true, deletedAt: true }
  })

  // Check existence and soft delete
  if (!project || project.deletedAt) {
    return null
  }

  // Verify password
  const isValid = await bcrypt.compare(password, project.passwordHash)
  if (!isValid) {
    return null
  }

  // Generate session token (24 hour expiry)
  const token = jwt.sign(
    { type: 'project', projectId },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  )

  // Store session in database
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.projectSession.create({
    data: {
      projectId,
      token,
      expiresAt,
    }
  })

  // Update view count and last accessed
  await prisma.project.update({
    where: { projectId },
    data: {
      viewCount: { increment: 1 },
      lastAccessed: new Date(),
    }
  })

  return { token }
}

export async function verifyProjectToken(
  token: string,
  projectId: string
): Promise<boolean> {
  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, env.JWT_SECRET) as { type: string; projectId: string }

    // Ensure token is for correct project
    if (decoded.projectId !== projectId) {
      return false
    }

    // Check database session
    const session = await prisma.projectSession.findUnique({
      where: { token }
    })

    if (!session) return false

    // Check expiration
    if (session.expiresAt < new Date()) {
      // Expired - delete session
      await prisma.projectSession.delete({ where: { token } })
      return false
    }

    return true
  } catch (error) {
    return false
  }
}
```

### Authentication Middleware

**File:** `lib/auth/middleware.ts`

**Code:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken, verifyProjectToken } from '@/lib/auth'

export async function requireAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get('admin_token')?.value

  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const isValid = await verifyAdminToken(token)
  if (!isValid) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } },
      { status: 401 }
    )
  }

  return null // Success - continue to handler
}

export async function requireProjectAuth(
  request: NextRequest,
  projectId: string
): Promise<NextResponse | null> {
  const token = request.cookies.get('project_token')?.value

  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'סיסמה נדרשת' } },
      { status: 401 }
    )
  }

  const isValid = await verifyProjectToken(token, projectId)
  if (!isValid) {
    return NextResponse.json(
      { success: false, error: { code: 'SESSION_EXPIRED', message: 'הפגיסה פגה תוקף. נא להזין סיסמה שוב' } },
      { status: 401 }
    )
  }

  return null // Success - continue to handler
}
```

**Usage in API route:**
```typescript
// app/api/admin/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth/middleware'

export async function GET(req: NextRequest) {
  // Check authentication
  const authError = await requireAdminAuth(req)
  if (authError) return authError

  // Authentication passed - continue with handler
  // ... fetch projects ...
}
```

---

## File Storage Patterns

### Storage Abstraction Interface

**File:** `lib/storage/interface.ts`

**Code:**
```typescript
export interface FileStorage {
  /**
   * Upload a file to storage
   * @param projectId - Unique project identifier
   * @param filename - File name (e.g., 'findings.docx')
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
   * Get public URL for a file
   * @param projectId - Unique project identifier
   * @param filename - File name
   * @returns URL to access file
   */
  getUrl(projectId: string, filename: string): string
}
```

### Local Filesystem Storage

**File:** `lib/storage/local.ts`

**Code:**
```typescript
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
    await fs.unlink(filePath)
  }

  async deleteProject(projectId: string): Promise<void> {
    const projectDir = path.join(this.uploadDir, projectId)
    await fs.rm(projectDir, { recursive: true, force: true })
  }

  getUrl(projectId: string, filename: string): string {
    return `/uploads/${projectId}/${filename}`
  }
}
```

### S3 Storage (Stub)

**File:** `lib/storage/s3.ts`

**Code:**
```typescript
import { FileStorage } from './interface'

export class S3FileStorage implements FileStorage {
  async upload(projectId: string, filename: string, buffer: Buffer): Promise<string> {
    // TODO: Implement with @aws-sdk/client-s3
    // const key = `projects/${projectId}/${filename}`
    // await s3Client.send(new PutObjectCommand({ Bucket, Key: key, Body: buffer }))
    // return key
    throw new Error('S3 storage not implemented yet')
  }

  async download(projectId: string, filename: string): Promise<Buffer> {
    // TODO: Implement with GetObjectCommand
    throw new Error('S3 storage not implemented yet')
  }

  async delete(projectId: string, filename: string): Promise<void> {
    // TODO: Implement with DeleteObjectCommand
    throw new Error('S3 storage not implemented yet')
  }

  getUrl(projectId: string, filename: string): string {
    // TODO: Generate signed URL with getSignedUrl
    throw new Error('S3 storage not implemented yet')
  }
}
```

### Storage Factory

**File:** `lib/storage/index.ts`

**Code:**
```typescript
import { FileStorage } from './interface'
import { LocalFileStorage } from './local'
import { S3FileStorage } from './s3'
import env from '@/lib/env'

export const fileStorage: FileStorage =
  env.STORAGE_TYPE === 's3'
    ? new S3FileStorage()
    : new LocalFileStorage()

export { FileStorage } from './interface'
```

**Usage:**
```typescript
import { fileStorage } from '@/lib/storage'

// Upload file
const url = await fileStorage.upload('abc123', 'findings.docx', buffer)

// Download file
const buffer = await fileStorage.download('abc123', 'findings.docx')

// Delete file
await fileStorage.delete('abc123', 'findings.docx')
```

---

## File Upload Patterns

### File Validation

**File:** `lib/upload/validator.ts`

**Code:**
```typescript
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

export function validateFileSize(buffer: Buffer, maxSize: number = MAX_FILE_SIZE): void {
  if (buffer.length > maxSize) {
    throw new FileValidationError(
      `File size ${(buffer.length / 1024 / 1024).toFixed(2)} MB exceeds limit of ${maxSize / 1024 / 1024} MB`
    )
  }
}

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
}

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
                    htmlContent.includes('plotly.min.js')

  return { warnings, hasPlotly }
}
```

### Atomic Upload Handler

**File:** `lib/upload/handler.ts`

**Code:**
```typescript
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/client'
import { fileStorage } from '@/lib/storage'
import { validateFileSize, validateMimeType, validateHtmlSelfContained } from './validator'

const SALT_ROUNDS = 10

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
}

export async function createProjectAtomic(
  data: CreateProjectInput,
  files: UploadedFiles
): Promise<CreateProjectResult> {
  const projectId = nanoid()
  const password = data.password || generatePassword()
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  let docxUrl: string | null = null
  let htmlUrl: string | null = null

  try {
    // Step 1: Validate files
    validateFileSize(files.docx)
    validateFileSize(files.html)

    // Note: MIME type validation should happen in multer fileFilter
    // This is a backup validation

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
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/preview/${projectId}`,
      htmlWarnings: htmlValidation.warnings,
    }

  } catch (error) {
    // Rollback: Delete uploaded files
    if (docxUrl) {
      await fileStorage.delete(projectId, 'findings.docx').catch(() => {})
    }
    if (htmlUrl) {
      await fileStorage.delete(projectId, 'report.html').catch(() => {})
    }

    // Re-throw error
    throw error
  }
}

function generatePassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
```

**Key Points:**
- Atomic operation: if any step fails, rollback uploaded files
- Password auto-generation if not provided
- HTML validation returns warnings (non-blocking)
- Uses storage abstraction (works with local or S3)

---

## API Route Patterns

### Standard API Route Structure

**Pattern:** All API routes follow consistent structure with error handling

**Example:** `app/api/admin/projects/route.ts`

**Code:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { createProjectAtomic } from '@/lib/upload/handler'

// Request validation schema
const CreateProjectSchema = z.object({
  project_name: z.string().min(1).max(500),
  student_name: z.string().min(1).max(255),
  student_email: z.string().email(),
  research_topic: z.string(),
  password: z.string().min(6).optional(),
})

// GET /api/admin/projects - List all projects
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const authError = await requireAdminAuth(req)
    if (authError) return authError

    // Fetch projects (exclude soft-deleted)
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        projectId: true,
        projectName: true,
        studentName: true,
        studentEmail: true,
        createdAt: true,
        viewCount: true,
        lastAccessed: true,
      }
    })

    return NextResponse.json({
      success: true,
      data: { projects }
    })

  } catch (error) {
    console.error('GET /api/admin/projects error:', error)
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

// POST /api/admin/projects - Create new project
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authError = await requireAdminAuth(req)
    if (authError) return authError

    // Parse multipart form data
    const formData = await req.formData()

    const data = {
      project_name: formData.get('project_name') as string,
      student_name: formData.get('student_name') as string,
      student_email: formData.get('student_email') as string,
      research_topic: formData.get('research_topic') as string,
      password: (formData.get('password') as string) || undefined,
    }

    const docxFile = formData.get('docx_file') as File
    const htmlFile = formData.get('html_file') as File

    // Validate text data
    const validated = CreateProjectSchema.parse(data)

    // Validate files exist
    if (!docxFile || !htmlFile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILES',
            message: 'Both DOCX and HTML files are required'
          }
        },
        { status: 400 }
      )
    }

    // Convert files to buffers
    const files = {
      docx: Buffer.from(await docxFile.arrayBuffer()),
      html: Buffer.from(await htmlFile.arrayBuffer()),
    }

    // Create project (atomic operation with rollback)
    const result = await createProjectAtomic(validated, files)

    return NextResponse.json({
      success: true,
      data: {
        project_id: result.projectId,
        project_url: result.url,
        password: result.password,
        html_warnings: result.htmlWarnings,
      }
    })

  } catch (error) {
    // Zod validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors
          }
        },
        { status: 400 }
      )
    }

    console.error('POST /api/admin/projects error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create project'
        }
      },
      { status: 500 }
    )
  }
}
```

**Key Points:**
- Consistent success/error response format
- Authentication check first (early return pattern)
- Zod validation for type safety
- Structured error handling with specific error codes
- Logging for debugging

---

## Validation Patterns

### Zod Schema Definitions

**File:** `lib/validation/schemas.ts`

**Code:**
```typescript
import { z } from 'zod'

// Admin login
export const AdminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// Create project
export const CreateProjectSchema = z.object({
  project_name: z.string().min(1, 'Project name is required').max(500, 'Project name too long'),
  student_name: z.string().min(1, 'Student name is required').max(255, 'Student name too long'),
  student_email: z.string().email('Invalid email format'),
  research_topic: z.string().min(1, 'Research topic is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
})

// Verify project password
export const VerifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

// Environment variables
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ADMIN_USERNAME: z.string(),
  ADMIN_PASSWORD_HASH: z.string(),
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
})
```

**Usage:**
```typescript
import { CreateProjectSchema } from '@/lib/validation/schemas'

// Validate and parse
try {
  const validated = CreateProjectSchema.parse(data)
  // validated is type-safe
} catch (error) {
  if (error instanceof z.ZodError) {
    // Return validation errors to client
    return { errors: error.errors }
  }
}
```

---

## Error Handling Patterns

### Custom Error Classes

**File:** `lib/utils/errors.ts`

**Code:**
```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super('AUTH_FAILED', message, 401)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super('RATE_LIMIT_EXCEEDED', message, 429)
  }
}
```

### Error Response Helper

**File:** `lib/utils/errors.ts` (continued)

**Code:**
```typescript
import { NextResponse } from 'next/server'

export function errorResponse(error: unknown): NextResponse {
  // Known AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        }
      },
      { status: error.statusCode }
    )
  }

  // Unexpected error
  console.error('Unexpected error:', error)
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    },
    { status: 500 }
  )
}
```

**Usage:**
```typescript
import { errorResponse, NotFoundError } from '@/lib/utils/errors'

export async function GET(req: NextRequest) {
  try {
    const project = await prisma.project.findUnique({ where: { projectId } })
    if (!project) {
      throw new NotFoundError('Project')
    }
    // ... continue
  } catch (error) {
    return errorResponse(error)
  }
}
```

---

## Import Order Convention

**Pattern:** Consistent import order across all files

**Code:**
```typescript
// 1. External libraries (npm packages)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// 2. Internal libraries (absolute imports with @/ alias)
import { prisma } from '@/lib/db/client'
import { fileStorage } from '@/lib/storage'
import { requireAdminAuth } from '@/lib/auth/middleware'

// 3. Types
import type { FileStorage } from '@/lib/storage/interface'
import type { Project } from '@prisma/client'

// 4. Relative imports (same directory)
import { localHelper } from './helper'
```

---

## Utility Patterns

### Password Generation

**File:** `lib/utils/password.ts`

**Code:**
```typescript
export function generatePassword(length: number = 8): string {
  // Exclude ambiguous characters (0, O, 1, l, I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return password
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}
```

### Project ID Generation

**File:** `lib/utils/nanoid.ts`

**Code:**
```typescript
import { nanoid as generateNanoid } from 'nanoid'

/**
 * Generate URL-safe project ID
 * Default length: 21 chars (same as UUID collision resistance)
 * Custom length: 12 chars for shorter URLs
 */
export function generateProjectId(length: number = 12): string {
  return generateNanoid(length)
}
```

---

## Security Patterns

### Rate Limiting

**File:** `lib/security/rate-limiter.ts`

**Code:**
```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible'

// Admin login: 5 attempts per 15 minutes per IP
export const loginRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60, // 15 minutes in seconds
})

// Project password: 10 attempts per hour per project
export const passwordRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60 * 60, // 1 hour in seconds
})

// API endpoints: 100 requests per minute per IP
export const apiRateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60, // 1 minute
})

export async function checkRateLimit(
  limiter: RateLimiterMemory,
  key: string
): Promise<{ allowed: boolean; message?: string }> {
  try {
    await limiter.consume(key)
    return { allowed: true }
  } catch (error) {
    return {
      allowed: false,
      message: 'Too many requests. Please try again later.'
    }
  }
}
```

**Usage:**
```typescript
import { loginRateLimiter, checkRateLimit } from '@/lib/security/rate-limiter'

const ipAddress = req.ip || 'unknown'
const rateLimit = await checkRateLimit(loginRateLimiter, ipAddress)

if (!rateLimit.allowed) {
  return NextResponse.json(
    { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: rateLimit.message } },
    { status: 429 }
  )
}
```

### Security Headers Middleware

**File:** `middleware.ts`

**Code:**
```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // Content Security Policy (prepare for iframe embedding)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  )

  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'http:') {
    const httpsUrl = request.nextUrl.clone()
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, 301)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - uploads (uploaded files)
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
  ],
}
```

---

## Code Quality Standards

**TypeScript Strict Mode:**
- No `any` types (use `unknown` if type is truly unknown, then narrow)
- Enable `strictNullChecks` (handle null/undefined explicitly)
- Enable `noUncheckedIndexedAccess` (array access returns `T | undefined`)

**Error Handling:**
- Always use try-catch for async operations
- Log errors to console (production: use error monitoring service)
- Return structured error responses (never expose stack traces)

**Code Organization:**
- One export per file (easier to understand and test)
- Small functions (<50 lines)
- Descriptive variable names (no abbreviations)
- Comments for complex logic only (code should be self-documenting)

**Testing Preparation:**
- Write testable code (pure functions, dependency injection)
- Avoid global state
- Mock external dependencies (database, file storage)

---

**Patterns Status:** COMPLETE
**Ready for:** Builder Task Breakdown
