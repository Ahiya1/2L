# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

This report analyzes the technology stack, coding patterns, and dependencies required for StatViz Iteration 1 (Foundation & File Infrastructure). The recommended stack centers on **Next.js 14+ with App Router**, **PostgreSQL + Prisma ORM**, **bcrypt for password hashing**, and **JWT for authentication**. File storage begins with local filesystem using an abstraction layer for future S3 migration. All patterns prioritize security, type safety, and Hebrew RTL compatibility.

**Key Finding:** Iteration 1 is backend-heavy with HIGH security risk. Success depends on robust authentication patterns, secure file handling, and a flexible storage abstraction that won't require refactoring during S3 migration.

---

## Discoveries

### Framework Selection

**Next.js 14+ with App Router (TypeScript)**
- **Why:** Unified frontend/backend, API routes eliminate separate backend, Server Components reduce bundle size, native TypeScript support, Vercel deployment integration
- **Iteration 1 Usage:** API routes for all endpoints, middleware for auth, serverless functions for file uploads
- **Version:** `next@14.2.0` or later (stable App Router)
- **Installation:** `npx create-next-app@latest statviz --typescript --app --tailwind`

**Alternatives Considered:**
- ❌ **Express.js + React SPA:** Requires separate backend deployment, more complex auth flow, no SSR for admin panel
- ❌ **Python Flask + React:** Different language stack, slower file handling, less mature TypeScript integration
- ⚠️ **Next.js Pages Router:** Legacy pattern, App Router is production-ready and recommended for new projects

### Database & ORM

**PostgreSQL 14+ with Prisma ORM**
- **Why PostgreSQL:** ACID compliance for file upload atomicity, superior indexing for project queries, JSON support for metadata, Hebrew text compatibility (UTF-8), free tiers available (Vercel Postgres, Supabase)
- **Why Prisma:** Type-safe queries eliminate SQL injection, migrations are version-controlled, excellent TypeScript integration, connection pooling built-in, introspection for rapid prototyping
- **Installation:** 
  ```bash
  npm install prisma @prisma/client
  npm install -D prisma
  npx prisma init
  ```

**Schema Pattern for Iteration 1:**
```prisma
// prisma/schema.prisma
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

**Indexing Strategy:**
- `projectId`: Unique index for fast lookups (used in every student access)
- `studentEmail`: Index for admin search/filter functionality
- `createdAt`: Index for sorting project list (newest first)
- `token` fields: Unique indexes for session validation

**Connection Pooling:**
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Authentication Libraries

**bcrypt for Password Hashing**
- **Version:** `bcryptjs@2.4.3` (pure JavaScript, works in serverless)
- **Why:** Industry standard, configurable rounds, resistant to rainbow table attacks
- **Installation:** `npm install bcryptjs @types/bcryptjs`
- **Pattern:**
  ```typescript
  import bcrypt from 'bcryptjs'
  
  // Hashing (10 rounds as per spec)
  const SALT_ROUNDS = 10
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  
  // Verification
  const isValid = await bcrypt.compare(password, passwordHash)
  ```

**Alternative Considered:**
- ❌ **Argon2:** Better security but requires native bindings (incompatible with Vercel serverless)
- ❌ **PBKDF2:** Lower-level, requires manual salt management

**jsonwebtoken for JWT Tokens**
- **Version:** `jsonwebtoken@9.0.2`
- **Why:** Stateless authentication, works with Next.js middleware, industry standard
- **Installation:** `npm install jsonwebtoken @types/jsonwebtoken`
- **Pattern:**
  ```typescript
  import jwt from 'jsonwebtoken'
  
  // Admin token generation (30 min expiry)
  const adminToken = jwt.sign(
    { type: 'admin', userId: 'ahiya' },
    process.env.JWT_SECRET!,
    { expiresIn: '30m' }
  )
  
  // Project token generation (24 hour expiry)
  const projectToken = jwt.sign(
    { type: 'project', projectId },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  )
  
  // Verification
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    // Token valid
  } catch (error) {
    // Token expired or invalid
  }
  ```

**Security Consideration:**
- JWT_SECRET must be cryptographically random (min 256 bits)
- Generate using: `openssl rand -base64 32`
- Store in `.env.local` (never commit)

### File Storage Libraries

**Node.js Built-in `fs` (Iteration 1 - Local Filesystem)**
- **Why:** Zero external dependencies, synchronous/async options, works in development
- **Pattern:**
  ```typescript
  import fs from 'fs/promises'
  import path from 'path'
  
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
  
  // Ensure directory exists
  await fs.mkdir(path.join(UPLOAD_DIR, projectId), { recursive: true })
  
  // Write file
  const filePath = path.join(UPLOAD_DIR, projectId, filename)
  await fs.writeFile(filePath, buffer)
  
  // Read file
  const fileBuffer = await fs.readFile(filePath)
  
  // Delete file
  await fs.unlink(filePath)
  ```

**AWS SDK v3 for S3 (Future Migration - Abstraction Layer Now)**
- **Version:** `@aws-sdk/client-s3@3.600.0`
- **Installation:** `npm install @aws-sdk/client-s3 @aws-sdk/lib-storage`
- **Abstraction Pattern:**
  ```typescript
  // lib/storage/interface.ts
  export interface FileStorage {
    upload(projectId: string, filename: string, buffer: Buffer): Promise<string>
    download(projectId: string, filename: string): Promise<Buffer>
    delete(projectId: string, filename: string): Promise<void>
    getUrl(projectId: string, filename: string): string
  }
  
  // lib/storage/local.ts
  export class LocalFileStorage implements FileStorage {
    async upload(projectId: string, filename: string, buffer: Buffer): Promise<string> {
      const filePath = path.join(UPLOAD_DIR, projectId, filename)
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, buffer)
      return `/uploads/${projectId}/${filename}`
    }
    // ... other methods
  }
  
  // lib/storage/s3.ts (future)
  export class S3FileStorage implements FileStorage {
    private s3Client: S3Client
    
    async upload(projectId: string, filename: string, buffer: Buffer): Promise<string> {
      const key = `projects/${projectId}/${filename}`
      await this.s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
      }))
      return key
    }
    // ... other methods
  }
  
  // lib/storage/index.ts
  export const fileStorage: FileStorage = 
    process.env.STORAGE_TYPE === 's3' 
      ? new S3FileStorage() 
      : new LocalFileStorage()
  ```

**File Upload Libraries**

**next-connect for Multipart Handling**
- **Version:** `next-connect@1.0.0`
- **Why:** Middleware pattern for Next.js API routes, works with multer
- **Installation:** `npm install next-connect multer @types/multer`
- **Pattern:**
  ```typescript
  import { NextApiRequest, NextApiResponse } from 'next'
  import nextConnect from 'next-connect'
  import multer from 'multer'
  
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/html']
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error('Invalid file type'))
      }
    }
  })
  
  const handler = nextConnect<NextApiRequest, NextApiResponse>()
  
  handler
    .use(upload.fields([
      { name: 'docx_file', maxCount: 1 },
      { name: 'html_file', maxCount: 1 }
    ]))
    .post(async (req, res) => {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] }
      const docxFile = files.docx_file[0]
      const htmlFile = files.html_file[0]
      // Process files...
    })
  ```

**Alternative Considered:**
- ❌ **formidable:** Less type-safe, no middleware pattern
- ⚠️ **Next.js native body parser:** Doesn't support multipart by default (need to disable and use custom)

### HTML Validation Libraries

**cheerio for HTML Parsing**
- **Version:** `cheerio@1.0.0-rc.12`
- **Why:** jQuery-like syntax, fast, works server-side, perfect for validating external dependencies
- **Installation:** `npm install cheerio`
- **Pattern:**
  ```typescript
  import * as cheerio from 'cheerio'
  
  function validateHtml(htmlContent: string): { warnings: string[] } {
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
    
    // Check if Plotly is embedded (not external)
    const hasPlotlyScript = $('script:contains("Plotly")').length > 0
    if (!hasPlotlyScript) {
      warnings.push('Plotly library not detected (may affect interactive graphs)')
    }
    
    return { warnings }
  }
  ```

### Security Libraries

**helmet for Security Headers**
- **Version:** `helmet@7.1.0`
- **Why:** Sets HTTP headers to prevent common attacks (XSS, clickjacking, etc.)
- **Installation:** `npm install helmet`
- **Pattern (Next.js Middleware):**
  ```typescript
  // middleware.ts
  import { NextResponse } from 'next/server'
  import type { NextRequest } from 'next/server'
  
  export function middleware(request: NextRequest) {
    const response = NextResponse.next()
    
    // Security headers
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    
    // CSP (prepare for Iteration 3)
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    )
    
    return response
  }
  ```

**validator for Input Sanitization**
- **Version:** `validator@13.11.0`
- **Why:** Email validation, string sanitization, prevents XSS
- **Installation:** `npm install validator @types/validator`
- **Pattern:**
  ```typescript
  import validator from 'validator'
  
  // Email validation
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format')
  }
  
  // Sanitize strings (prevent XSS)
  const sanitizedName = validator.escape(projectName)
  
  // Validate length
  if (!validator.isLength(projectName, { min: 1, max: 500 })) {
    throw new Error('Project name must be 1-500 characters')
  }
  ```

**rate-limiter-flexible for Rate Limiting**
- **Version:** `rate-limiter-flexible@3.0.0`
- **Why:** In-memory rate limiting (MVP), Redis support (future), configurable rules
- **Installation:** `npm install rate-limiter-flexible`
- **Pattern:**
  ```typescript
  import { RateLimiterMemory } from 'rate-limiter-flexible'
  
  // Admin login: 5 attempts per 15 minutes
  const loginRateLimiter = new RateLimiterMemory({
    points: 5,
    duration: 15 * 60, // 15 minutes
  })
  
  // In API route
  try {
    await loginRateLimiter.consume(req.socket.remoteAddress || 'unknown')
    // Process login
  } catch (error) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })
  }
  ```

### Utility Libraries

**nanoid for Project ID Generation**
- **Version:** `nanoid@5.0.7`
- **Why:** URL-safe, collision-resistant, shorter than UUID (21 chars vs 36)
- **Installation:** `npm install nanoid`
- **Pattern:**
  ```typescript
  import { nanoid } from 'nanoid'
  
  const projectId = nanoid() // e.g., "V1StGXR8_Z5jdHi6B-myT"
  ```

**crypto (Node.js Built-in) for Password Generation**
- **Pattern:**
  ```typescript
  import crypto from 'crypto'
  
  function generatePassword(length = 8): string {
    return crypto.randomBytes(length)
      .toString('base64')
      .slice(0, length)
      .replace(/\+/g, '0')
      .replace(/\//g, '1')
  }
  
  const password = generatePassword() // e.g., "2R9kPm4L"
  ```

**zod for Runtime Validation**
- **Version:** `zod@3.23.8`
- **Why:** Type-safe validation, great TypeScript integration, runtime checks
- **Installation:** `npm install zod`
- **Pattern:**
  ```typescript
  import { z } from 'zod'
  
  const CreateProjectSchema = z.object({
    project_name: z.string().min(1).max(500),
    student_name: z.string().min(1).max(255),
    student_email: z.string().email(),
    research_topic: z.string(),
    password: z.string().min(6).optional(),
  })
  
  // Validate request body
  try {
    const data = CreateProjectSchema.parse(req.body)
    // Data is type-safe
  } catch (error) {
    return res.status(400).json({ error: error.errors })
  }
  ```

---

## Patterns Identified

### Pattern 1: Secure Authentication Flow

**Description:** Two-tier authentication system with admin JWT and project password sessions

**Use Case:** 
- Admin login for Ahiya (JWT with 30-min expiry)
- Student access to projects (password + 24-hour session token)

**Implementation:**
```typescript
// lib/auth/admin.ts
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export async function verifyAdminLogin(username: string, password: string): Promise<string | null> {
  // In production, fetch from database
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH
  
  if (username !== ADMIN_USERNAME) return null
  
  const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH!)
  if (!isValid) return null
  
  // Generate JWT token
  const token = jwt.sign(
    { type: 'admin', userId: username },
    process.env.JWT_SECRET!,
    { expiresIn: '30m' }
  )
  
  // Store in database
  await prisma.adminSession.create({
    data: {
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      ipAddress: req.socket.remoteAddress,
    }
  })
  
  return token
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    
    // Check if token exists in database
    const session = await prisma.adminSession.findUnique({
      where: { token }
    })
    
    return session !== null && session.expiresAt > new Date()
  } catch (error) {
    return false
  }
}

// lib/auth/project.ts
export async function verifyProjectPassword(projectId: string, password: string): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { projectId },
    select: { passwordHash: true }
  })
  
  if (!project) return null
  
  const isValid = await bcrypt.compare(password, project.passwordHash)
  if (!isValid) return null
  
  // Generate session token
  const token = jwt.sign(
    { type: 'project', projectId },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  )
  
  // Store in database
  await prisma.projectSession.create({
    data: {
      projectId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
  })
  
  return token
}
```

**Recommendation:** CRITICAL - Implement this pattern exactly. Security failures here compromise the entire platform.

### Pattern 2: Atomic File Upload with Transaction Rollback

**Description:** Ensure database record is only created if file uploads succeed (and vice versa)

**Use Case:** Prevent orphaned files or database records when upload fails midway

**Implementation:**
```typescript
// lib/project/create.ts
import { prisma } from '@/lib/db'
import { fileStorage } from '@/lib/storage'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'

export async function createProject(data: CreateProjectInput, files: Files) {
  const projectId = nanoid()
  const passwordHash = await bcrypt.hash(data.password || generatePassword(), 10)
  
  let docxUrl: string | null = null
  let htmlUrl: string | null = null
  
  try {
    // Step 1: Upload files
    docxUrl = await fileStorage.upload(projectId, 'findings.docx', files.docx)
    htmlUrl = await fileStorage.upload(projectId, 'report.html', files.html)
    
    // Step 2: Create database record
    const project = await prisma.project.create({
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
    
    return { projectId, password: data.password }
    
  } catch (error) {
    // Rollback: Delete uploaded files
    if (docxUrl) {
      await fileStorage.delete(projectId, 'findings.docx').catch(() => {})
    }
    if (htmlUrl) {
      await fileStorage.delete(projectId, 'report.html').catch(() => {})
    }
    
    throw error
  }
}
```

**Recommendation:** ESSENTIAL - Without atomicity, platform will accumulate orphaned data. Implement rollback for all multi-step operations.

### Pattern 3: Storage Abstraction Layer

**Description:** Interface-based storage that allows swapping local filesystem for S3 without code changes

**Use Case:** Start with local filesystem (MVP), migrate to S3 (production) seamlessly

**Implementation:** (See "File Storage Libraries" section above for full code)

**Key Benefits:**
- Builder teams implement local storage first (fast iteration)
- Zero refactoring needed for S3 migration
- Easy to add CloudFlare R2 or Google Cloud Storage later
- Testing is easier (mock interface)

**Recommendation:** MANDATORY - This is explicitly required by the master plan ("abstraction layer for future S3 migration"). Don't skip this.

### Pattern 4: Next.js API Route Structure

**Description:** Consistent pattern for API routes with error handling, validation, and auth middleware

**Use Case:** All API endpoints in Iteration 1

**Implementation:**
```typescript
// app/api/admin/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminToken } from '@/lib/auth/admin'
import { prisma } from '@/lib/db'

const CreateProjectSchema = z.object({
  project_name: z.string().min(1).max(500),
  student_name: z.string().min(1).max(255),
  student_email: z.string().email(),
  research_topic: z.string(),
  password: z.string().min(6).optional(),
})

// GET /api/admin/projects
export async function GET(req: NextRequest) {
  try {
    // Auth middleware
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token || !(await verifyAdminToken(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch projects
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        projectId: true,
        projectName: true,
        studentName: true,
        createdAt: true,
        viewCount: true,
        lastAccessed: true,
      }
    })
    
    return NextResponse.json({ projects })
    
  } catch (error) {
    console.error('GET /api/admin/projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/projects
export async function POST(req: NextRequest) {
  try {
    // Auth middleware
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token || !(await verifyAdminToken(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse multipart form data
    const formData = await req.formData()
    const data = {
      project_name: formData.get('project_name') as string,
      student_name: formData.get('student_name') as string,
      student_email: formData.get('student_email') as string,
      research_topic: formData.get('research_topic') as string,
      password: formData.get('password') as string | undefined,
    }
    const docxFile = formData.get('docx_file') as File
    const htmlFile = formData.get('html_file') as File
    
    // Validate
    const validated = CreateProjectSchema.parse(data)
    
    if (!docxFile || !htmlFile) {
      return NextResponse.json(
        { error: 'Both DOCX and HTML files required' },
        { status: 400 }
      )
    }
    
    // Create project (atomic operation)
    const result = await createProject(validated, {
      docx: Buffer.from(await docxFile.arrayBuffer()),
      html: Buffer.from(await htmlFile.arrayBuffer()),
    })
    
    return NextResponse.json({
      success: true,
      project_id: result.projectId,
      project_url: `${process.env.NEXT_PUBLIC_BASE_URL}/preview/${result.projectId}`,
      password: result.password,
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('POST /api/admin/projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Recommendation:** Use this pattern for ALL API routes. Consistency is critical for maintainability.

### Pattern 5: Environment Variable Validation

**Description:** Validate all required environment variables at startup to prevent runtime failures

**Use Case:** Ensure JWT_SECRET, DATABASE_URL, etc. are set before app starts

**Implementation:**
```typescript
// lib/env.ts
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ADMIN_USERNAME: z.string(),
  ADMIN_PASSWORD_HASH: z.string(),
  UPLOAD_DIR: z.string().optional(),
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  
  // Optional S3 variables (required if STORAGE_TYPE === 's3')
  S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
})

export const env = EnvSchema.parse(process.env)

// Conditional validation
if (env.STORAGE_TYPE === 's3') {
  if (!env.S3_BUCKET || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('S3 credentials required when STORAGE_TYPE=s3')
  }
}
```

**Recommendation:** CRITICAL - Add this file and import it in `app/layout.tsx` to validate on startup. Prevents production failures due to missing env vars.

---

## Complexity Assessment

### High Complexity Areas

**1. Multipart File Upload with Atomicity (HIGH - 1 builder, 6-8 hours)**
- Multiple integration points: Next.js API route + multer + storage abstraction + database
- Edge cases: file size limits, MIME type validation, rollback on failure, concurrent uploads
- Testing complexity: Mock file uploads, test rollback scenarios, verify atomicity
- **Recommendation:** Single builder handles end-to-end. DO NOT split file handling across builders.

**2. Authentication Flow (MEDIUM-HIGH - 1 builder, 5-7 hours)**
- Two separate auth patterns (admin JWT vs project password)
- Session management in database + JWT expiry
- Rate limiting integration
- CSRF protection (future, but architecture needed now)
- **Recommendation:** Single builder implements both auth types. They share JWT utilities but have different flows.

**3. Storage Abstraction Layer (MEDIUM - 1 builder, 4-5 hours)**
- Interface design must support both local and S3
- Error handling for file operations
- URL generation (local: `/uploads/...`, S3: signed URLs)
- **Recommendation:** Builder implements local storage fully, creates S3 stub with TODOs for future builder.

### Medium Complexity Areas

**4. Database Schema & Migrations (MEDIUM - 1 builder, 3-4 hours)**
- Prisma schema design
- Migration setup
- Seed data for testing
- Connection pooling configuration
- **Recommendation:** Straightforward with Prisma. Builder should reference schema in this report.

**5. HTML Validation (MEDIUM - 1 builder, 3-4 hours)**
- Cheerio parsing
- External resource detection (CSS, JS, images)
- Plotly detection
- Warning generation (non-blocking)
- **Recommendation:** Can be built independently, integrate into upload flow.

**6. API Endpoints (MEDIUM - 1 builder, 4-6 hours)**
- 6 endpoints total (see spec)
- Consistent error handling
- Request/response validation (Zod)
- **Recommendation:** One builder handles all endpoints for consistency. Use pattern from this report.

### Low Complexity Areas

**7. Environment Configuration (LOW - 1 builder, 1-2 hours)**
- `.env.example` creation
- Environment validation (Zod)
- Documentation
- **Recommendation:** First builder sets this up, others reference it.

**8. Utility Functions (LOW - shared across builders, 2-3 hours total)**
- Password generation (crypto)
- Project ID generation (nanoid)
- Email validation (validator)
- **Recommendation:** Create `lib/utils/` early, all builders use it.

---

## Technology Recommendations

### Primary Stack

**Framework: Next.js 14.2+ (App Router)**
- **Rationale:** Unified frontend/backend eliminates deployment complexity. API routes are serverless-ready for Vercel. App Router is production-stable and future-proof. TypeScript support is first-class. Server Components reduce client bundle (important for Hebrew font loading).
- **Version:** `next@14.2.0` minimum
- **Installation:** `npx create-next-app@latest statviz --typescript --app --tailwind --no-src-dir`
- **Configuration:**
  ```javascript
  // next.config.mjs
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    experimental: {
      serverActions: true,
    },
    // Disable body parser for file uploads
    api: {
      bodyParser: false,
    },
  }
  export default nextConfig
  ```

**Database: PostgreSQL 14+ via Vercel Postgres or Supabase**
- **Rationale:** Free tier for MVP (Vercel Postgres: 60 hours compute/month, 512 MB storage). ACID compliance for file upload transactions. Excellent Prisma support. UTF-8 for Hebrew. Easy upgrade path to paid tier.
- **Recommended Provider:** Vercel Postgres (if using Vercel) or Supabase (if need more storage)
- **Connection:** Connection string in `DATABASE_URL` environment variable

**ORM: Prisma 5.19+**
- **Rationale:** Type-safe queries prevent SQL injection. Migrations are version-controlled. Excellent TypeScript DX. Built-in connection pooling. Introspection for rapid prototyping.
- **Version:** `prisma@5.19.0`, `@prisma/client@5.19.0`
- **Setup:**
  ```bash
  npm install prisma @prisma/client
  npx prisma init
  # Edit schema.prisma
  npx prisma migrate dev --name init
  npx prisma generate
  ```

**Authentication: bcryptjs + jsonwebtoken**
- **Rationale:** Industry standards, work in serverless (no native bindings). bcrypt with 10 rounds balances security and performance. JWT is stateless but we also store in DB for revocation.
- **Versions:** `bcryptjs@2.4.3`, `jsonwebtoken@9.0.2`

**File Storage: Local Filesystem → S3 (via abstraction)**
- **Rationale:** Local filesystem for MVP is zero-cost and fast iteration. Abstraction layer prevents refactoring during S3 migration. S3 in production gives signed URLs, automatic backups, CDN integration.
- **MVP:** Node.js `fs/promises`
- **Future:** `@aws-sdk/client-s3@3.600.0`

**Styling: Tailwind CSS 3.4+**
- **Rationale:** RTL support via `dir="rtl"` attribute. Built-in responsive utilities. Small bundle size. Excellent TypeScript integration. PostCSS plugins for Hebrew font optimization.
- **Version:** `tailwindcss@3.4.0` (included in Next.js setup)
- **RTL Configuration:**
  ```javascript
  // tailwind.config.ts
  import type { Config } from 'tailwindcss'
  
  const config: Config = {
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Rubik', 'Heebo', 'sans-serif'], // Hebrew fonts
        },
      },
    },
    plugins: [],
  }
  export default config
  ```

**Deployment: Vercel**
- **Rationale:** Zero-config Next.js deployment. Automatic HTTPS. Edge network (low latency in Israel/Europe). Free tier for MVP. Environment variable management. Preview deployments for testing.
- **Region:** `iad1` (Washington DC - closest to Israel with good routing) or `fra1` (Frankfurt - EU region)
- **Alternatives:** Railway, Render (if need more control)

### Supporting Libraries

**Validation: Zod 3.23+**
- **Purpose:** Runtime validation for API inputs, environment variables, form data
- **Why:** Type-safe, great error messages, integrates with TypeScript
- **Installation:** `npm install zod`

**File Upload: multer 1.4+**
- **Purpose:** Parse multipart/form-data for file uploads
- **Why:** Industry standard, works with Next.js via next-connect
- **Installation:** `npm install multer @types/multer next-connect`

**HTML Parsing: cheerio 1.0+**
- **Purpose:** Validate HTML for external dependencies
- **Why:** Fast, jQuery-like API, server-side
- **Installation:** `npm install cheerio`

**Security: helmet 7.1+**
- **Purpose:** Set security headers (XSS, clickjacking, etc.)
- **Why:** One-line protection against common attacks
- **Installation:** `npm install helmet`

**Input Sanitization: validator 13.11+**
- **Purpose:** Email validation, string sanitization
- **Why:** Prevents XSS, validates formats
- **Installation:** `npm install validator @types/validator`

**Rate Limiting: rate-limiter-flexible 3.0+**
- **Purpose:** Prevent brute force on login, password endpoints
- **Why:** In-memory for MVP, Redis support for future
- **Installation:** `npm install rate-limiter-flexible`

**Utilities: nanoid 5.0+**
- **Purpose:** Generate project IDs
- **Why:** URL-safe, collision-resistant, shorter than UUID
- **Installation:** `npm install nanoid`

---

## Integration Points

### External APIs

**PostgreSQL Database**
- **Purpose:** Store project metadata, sessions
- **Connection:** Via Prisma Client using `DATABASE_URL`
- **Complexity:** LOW (Prisma handles connection pooling)
- **Considerations:**
  - Connection limit: Vercel Postgres free tier has 60-hour compute limit
  - Migration strategy: Use Prisma migrate (version-controlled)
  - Backup: Vercel provides automatic backups
  - Hebrew text: UTF-8 encoding, test with actual Hebrew strings

**Local Filesystem (Iteration 1)**
- **Purpose:** Store DOCX and HTML files
- **Location:** `process.cwd()/uploads/` or `UPLOAD_DIR` env variable
- **Complexity:** LOW
- **Considerations:**
  - Vercel serverless: Files don't persist across deployments (use S3 in production)
  - File permissions: Ensure write access
  - Cleanup: Manual deletion when project deleted
  - Backup: Not included in Vercel backups (use S3 for persistence)

**AWS S3 (Future, Abstraction Now)**
- **Purpose:** Production file storage
- **Connection:** Via AWS SDK v3
- **Complexity:** MEDIUM
- **Considerations:**
  - Signed URLs for downloads (expires after 1 hour)
  - Bucket policy: Private bucket, no public access
  - CORS: Allow origin from statviz.xyz
  - CDN: CloudFront for faster downloads (optional)
  - Cost: ~$0.023/GB/month storage + data transfer

### Internal Integrations

**File Upload → Storage → Database**
- **Flow:** API route receives files → Validate MIME/size → Upload to storage → Store URLs in database → Return project ID
- **Critical Dependency:** Storage abstraction must return URLs before database insert
- **Rollback:** If database insert fails, delete uploaded files
- **Testing:** Mock storage interface for unit tests

**Authentication → Session Management**
- **Flow:** Login → Verify password → Generate JWT → Store in database → Set cookie → Validate on subsequent requests
- **Critical Dependency:** JWT_SECRET must be set before app starts
- **Session Expiry:** Database cleanup job for expired sessions (cron or manual)
- **Testing:** Mock JWT functions, test expiry scenarios

**Password Verification → Project Access**
- **Flow:** Student enters password → Hash and compare → Generate session token → Store in database → Return token → Use token for file access
- **Critical Dependency:** Project must exist before password verification
- **Rate Limiting:** 5 attempts per 15 minutes per IP
- **Testing:** Test rate limiting, expired tokens, wrong passwords

**HTML Validation → Upload Flow**
- **Flow:** Receive HTML file → Parse with cheerio → Detect external resources → Return warnings → Admin confirms → Upload proceeds
- **Critical Dependency:** Validation is non-blocking (warnings only)
- **Edge Cases:** Malformed HTML, very large files (5-10 MB)
- **Testing:** Test with real Claude-generated HTML

---

## Risks & Challenges

### Technical Risks

**Risk 1: File Upload Size Limits in Serverless**
- **Impact:** Vercel has 4.5 MB body size limit on Hobby plan, 50 MB on Pro
- **Likelihood:** HIGH (spec requires 50 MB uploads)
- **Mitigation:** 
  - Use Vercel Pro plan ($20/month) OR
  - Implement direct S3 upload (client → S3, bypassing API route) OR
  - Use chunked uploads via multipart
- **Recommendation:** Document this in builder tasks. Test with 50 MB file before deployment.

**Risk 2: Hebrew Text Encoding Issues**
- **Impact:** Garbled text in database or UI
- **Likelihood:** MEDIUM (PostgreSQL defaults to UTF-8, but need to verify)
- **Mitigation:**
  - Explicitly set PostgreSQL encoding to UTF-8
  - Test with real Hebrew strings in seed data
  - Verify HTML meta charset: `<meta charset="UTF-8">`
- **Recommendation:** First builder creates seed data with Hebrew text, all others test against it.

**Risk 3: Session Management Edge Cases**
- **Impact:** Students locked out or sessions don't expire
- **Likelihood:** MEDIUM (JWT expiry + database cleanup is complex)
- **Mitigation:**
  - Use both JWT expiry and database expiry checks
  - Create cron job for cleanup (or manual admin cleanup)
  - Test with expired tokens, deleted sessions
- **Recommendation:** Builder implements cleanup script, documents in README.

**Risk 4: File Storage Migration Complexity**
- **Impact:** Refactoring entire codebase when moving to S3
- **Likelihood:** HIGH if abstraction not implemented
- **Mitigation:**
  - Implement storage interface now (see Pattern 3)
  - All file operations go through interface
  - Test local storage thoroughly before migration
- **Recommendation:** MANDATORY abstraction layer. Planner should assign one builder to create `lib/storage/` early.

### Complexity Risks

**Risk 5: Authentication Flow Bugs**
- **Impact:** Security vulnerabilities (unauthorized access)
- **Likelihood:** MEDIUM (two auth types, complex flow)
- **Mitigation:**
  - Single builder owns entire auth system
  - Comprehensive testing (unit + integration)
  - Security audit before production
  - Rate limiting prevents brute force
- **Recommendation:** Assign most experienced builder to authentication. Code review required.

**Risk 6: Atomicity Failures in Upload Flow**
- **Impact:** Orphaned files or database records
- **Likelihood:** MEDIUM (multi-step process with error points)
- **Mitigation:**
  - Implement rollback (see Pattern 2)
  - Test failure scenarios (storage fails, DB fails)
  - Add cleanup script for orphaned data
- **Recommendation:** Builder implements rollback in try-catch, writes tests for both success and failure paths.

**Risk 7: Concurrent Upload Handling**
- **Impact:** File collisions, database conflicts
- **Likelihood:** LOW (single admin user)
- **Mitigation:**
  - Use unique project IDs (nanoid has collision resistance)
  - Database handles concurrency via transactions
  - Test with concurrent uploads (load testing)
- **Recommendation:** LOW priority for MVP. Document for future scaling.

---

## Recommendations for Planner

### 1. Assign Authentication to Experienced Builder
**Rationale:** Security-critical component. Bugs here compromise entire platform. Requires understanding of JWT, bcrypt, rate limiting, and session management.
**Action:** Planner should assign Builder-1 (most experienced) to authentication tasks. Include code review requirement.

### 2. Implement Storage Abstraction in First 25% of Iteration
**Rationale:** All other builders depend on storage interface. If delayed, builders will hard-code local filesystem calls, requiring massive refactoring.
**Action:** Planner creates early task: "Create storage abstraction layer" (Builder-2, 4-5 hours). Other builders wait for this before file operations.

### 3. Require Environment Validation Before Any API Routes
**Rationale:** Missing JWT_SECRET or DATABASE_URL causes runtime failures in production. Catching at startup prevents deployment issues.
**Action:** Planner assigns first task: "Set up environment validation" (Builder-1, 1-2 hours). All subsequent tasks depend on this.

### 4. Use Vercel Pro Plan OR Implement Direct S3 Upload
**Rationale:** Vercel Hobby plan has 4.5 MB body limit, spec requires 50 MB uploads.
**Action:** Planner documents in master plan: "Budget $20/month for Vercel Pro" OR "Implement client → S3 direct upload (adds 8-10 hours)". Decision needed before upload implementation.

### 5. Create Seed Data with Real Hebrew Text
**Rationale:** Builders need to test Hebrew RTL without waiting for real data. Catches encoding issues early.
**Action:** Planner assigns early task: "Create Prisma seed script with Hebrew test data" (Builder-3, 1-2 hours). Include real Claude-generated DOCX/HTML samples.

### 6. Single Builder Owns File Upload End-to-End
**Rationale:** File upload integrates multer + storage + database + rollback. Splitting across builders creates integration hell.
**Action:** Planner assigns "File Upload System" as single builder task (Builder-2, 6-8 hours). Do NOT split into "upload handler" and "storage layer" for different builders.

### 7. Document S3 Migration Path NOW
**Rationale:** Future builders need to understand how to swap local storage for S3. Interface design decisions made now affect migration.
**Action:** Planner requires Builder-2 to create `docs/s3-migration.md` documenting:
  - Storage interface contract
  - How to implement S3FileStorage class
  - Environment variables needed
  - Testing strategy

### 8. Add Security Audit Task in Validation Phase
**Rationale:** Iteration 1 is HIGH RISK (security-critical). Need expert review before production.
**Action:** Planner adds validation task: "Security Audit" (external reviewer or senior builder, 2-3 hours). Checklist:
  - JWT secret strength (min 256 bits)
  - bcrypt rounds (10 or higher)
  - Rate limiting works (test brute force)
  - File upload validation (MIME type spoofing)
  - No SQL injection (Prisma handles this)
  - HTTPS enforced (middleware check)

---

## Resource Map

### Critical Files/Directories

**Configuration Files (Create First):**
- `.env.local` - Environment variables (JWT_SECRET, DATABASE_URL, etc.)
- `.env.example` - Template for environment variables
- `prisma/schema.prisma` - Database schema
- `next.config.mjs` - Next.js configuration (disable body parser for uploads)
- `tailwind.config.ts` - Tailwind CSS with Hebrew fonts
- `tsconfig.json` - TypeScript configuration (strict mode)

**Core Library Files (Implement Early):**
- `lib/db.ts` - Prisma client singleton
- `lib/env.ts` - Environment validation (Zod)
- `lib/storage/interface.ts` - Storage interface definition
- `lib/storage/local.ts` - Local filesystem implementation
- `lib/storage/s3.ts` - S3 implementation (stub for future)
- `lib/storage/index.ts` - Export active storage
- `lib/auth/admin.ts` - Admin authentication
- `lib/auth/project.ts` - Project password verification
- `lib/utils/password.ts` - Password generation
- `lib/utils/validation.ts` - Zod schemas

**API Routes (Implement After Libraries):**
- `app/api/admin/login/route.ts` - Admin login
- `app/api/admin/projects/route.ts` - Create/list projects
- `app/api/admin/projects/[id]/route.ts` - Delete project
- `app/api/preview/[id]/verify/route.ts` - Password verification
- `app/api/preview/[id]/route.ts` - Get project data
- `app/api/download/[id]/route.ts` - Download DOCX

**Middleware (Critical for Security):**
- `middleware.ts` - Security headers, auth checks

**Database:**
- `prisma/migrations/` - Database migrations (version-controlled)
- `prisma/seed.ts` - Seed data with Hebrew test projects

**Storage:**
- `uploads/` - Local file storage (gitignored)
- `.gitignore` - Exclude uploads/, .env.local, node_modules/

**Documentation:**
- `README.md` - Setup instructions, API documentation
- `docs/api.md` - API endpoint documentation
- `docs/s3-migration.md` - S3 migration guide
- `docs/security.md` - Security best practices

### Key Dependencies

**Production Dependencies:**
```json
{
  "dependencies": {
    "@prisma/client": "^5.19.0",
    "bcryptjs": "^2.4.3",
    "cheerio": "^1.0.0-rc.12",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "nanoid": "^5.0.7",
    "next": "^14.2.0",
    "next-connect": "^1.0.0",
    "rate-limiter-flexible": "^3.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "validator": "^13.11.0",
    "zod": "^3.23.8"
  }
}
```

**Development Dependencies:**
```json
{
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/validator": "^13.11.9",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "prisma": "^5.19.0",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.0"
  }
}
```

**Future Dependencies (S3 Migration):**
```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/lib-storage": "^3.600.0"
  }
}
```

### Testing Infrastructure

**Unit Testing: Vitest (Recommended)**
- **Why:** Fast, TypeScript native, Jest-compatible API
- **Installation:** `npm install -D vitest @testing-library/react @testing-library/jest-dom`
- **Config:**
  ```typescript
  // vitest.config.ts
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'
  
  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
    },
  })
  ```

**Integration Testing: Playwright (Optional for Iteration 1)**
- **Why:** Test full upload flow, authentication
- **Installation:** `npm install -D @playwright/test`
- **Defer to Iteration 2:** Focus on unit tests for Iteration 1

**Manual Testing Checklist (Essential for Iteration 1):**
- [ ] Admin login with correct credentials (200 response)
- [ ] Admin login with wrong credentials (401 response)
- [ ] Rate limiting after 5 failed logins (429 response)
- [ ] Create project with valid files (project ID returned)
- [ ] Create project with oversized file (400 error)
- [ ] Create project with wrong MIME type (400 error)
- [ ] List projects (returns array)
- [ ] Delete project (files removed, database record deleted)
- [ ] Password verification with correct password (token returned)
- [ ] Password verification with wrong password (401 error)
- [ ] Download DOCX with valid token (file downloaded)
- [ ] Download DOCX with expired token (401 error)
- [ ] HTML validation detects external CSS (warning returned)
- [ ] Hebrew text in database displays correctly (UTF-8 encoding)

**Load Testing (Defer to Post-MVP):**
- Use Artillery or k6 for concurrent upload testing
- Test with 10 concurrent uploads (simulate multiple students)
- Verify database connection pool doesn't exhaust

---

## Questions for Planner

### 1. Vercel Plan Decision
**Question:** Should we budget $20/month for Vercel Pro (50 MB upload limit) or implement client → S3 direct upload (adds 8-10 hours development)?
**Impact:** Affects upload implementation complexity
**Recommendation:** If budget allows, use Vercel Pro. Simpler implementation.

### 2. Database Provider Choice
**Question:** Vercel Postgres (60 hours compute/month, 512 MB) or Supabase (free tier 500 MB, unlimited compute)?
**Impact:** Supabase has better free tier but requires separate deployment
**Recommendation:** Vercel Postgres if using Vercel, Supabase if need more storage

### 3. S3 Migration Timeline
**Question:** When should we migrate to S3? After Iteration 1? After Iteration 3? Or wait for production load?
**Impact:** Abstraction layer is built now, but actual migration is work
**Recommendation:** After Iteration 3 (MVP complete) but before production launch. Need persistent storage for production.

### 4. Admin Account Management
**Question:** Should admin password be in environment variable (single admin) or database (future multi-admin)?
**Impact:** Environment variable is simpler, database is more flexible
**Recommendation:** Environment variable for Iteration 1, migrate to database in Iteration 2 if needed.

### 5. Session Cleanup Strategy
**Question:** Implement cron job for session cleanup or manual admin cleanup?
**Impact:** Cron adds complexity, manual is fragile
**Recommendation:** Manual cleanup script for MVP (`npm run cleanup:sessions`), automate in production.

### 6. Hebrew Font Hosting
**Question:** Should we self-host Hebrew fonts (Rubik, Heebo) or use Google Fonts CDN?
**Impact:** Self-hosted is faster but larger bundle, CDN is smaller but external dependency
**Recommendation:** Use Google Fonts CDN for MVP (faster iteration), self-host in production optimization.

### 7. Error Monitoring
**Question:** Integrate Sentry or similar error monitoring in Iteration 1?
**Impact:** Adds dependency but provides production visibility
**Recommendation:** Defer to Iteration 3 (production deployment). Use console.error for Iteration 1 development.

### 8. Security Audit Budget
**Question:** Should we budget for external security audit ($500-1000) or use internal code review?
**Impact:** External audit is thorough, internal is faster/cheaper
**Recommendation:** Internal code review for Iteration 1 (HIGH RISK items), external audit before production launch.

---

## Limitations

**MCP Tools Not Used:**
This exploration did not use Playwright MCP, Chrome DevTools MCP, or Supabase Local MCP because:
- No existing application to test (Iteration 1 is greenfield)
- No performance profiling needed yet (backend-only iteration)
- Database schema designed here, not validating existing schema

**These MCPs will be valuable in:**
- Iteration 2: Playwright for testing admin panel UI
- Iteration 3: Chrome DevTools for mobile performance profiling, Supabase MCP for database validation

**Manual Research Recommended:**
- Test bcrypt performance with 10 rounds on Vercel serverless (ensure < 1s login)
- Verify PostgreSQL UTF-8 encoding with real Hebrew strings
- Test Next.js multipart upload with 50 MB file on Vercel Pro
- Research Vercel file storage persistence (confirm files don't survive deployments)

---

## Appendix: Code Snippets for Builders

### Environment Variables Template

```bash
# .env.example
# Copy to .env.local and fill in actual values

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/statviz"

# Authentication
JWT_SECRET="<generate with: openssl rand -base64 32>"
ADMIN_USERNAME="ahiya"
ADMIN_PASSWORD_HASH="<generate with: bcrypt.hash('your_password', 10)>"

# File Storage
STORAGE_TYPE="local"  # or "s3"
UPLOAD_DIR="./uploads"

# S3 (if STORAGE_TYPE=s3)
S3_BUCKET="statviz-files"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"
```

### Generate Admin Password Hash

```bash
# Install bcrypt CLI
npm install -g bcrypt-cli

# Generate hash for password "your_secure_password"
bcryptjs "your_secure_password" 10

# Example output (copy to ADMIN_PASSWORD_HASH):
# $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

### Package Installation Script

```bash
#!/bin/bash
# setup.sh - Run after creating Next.js app

# Production dependencies
npm install \
  @prisma/client \
  bcryptjs \
  cheerio \
  jsonwebtoken \
  multer \
  nanoid \
  next-connect \
  rate-limiter-flexible \
  validator \
  zod

# Development dependencies
npm install -D \
  @types/bcryptjs \
  @types/jsonwebtoken \
  @types/multer \
  @types/validator \
  prisma

# Prisma setup
npx prisma init

echo "Dependencies installed. Next steps:"
echo "1. Edit .env with DATABASE_URL and JWT_SECRET"
echo "2. Edit prisma/schema.prisma with schema from explorer-2-report.md"
echo "3. Run: npx prisma migrate dev --name init"
echo "4. Run: npx prisma generate"
```

### Prisma Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.projectSession.deleteMany()
  await prisma.adminSession.deleteMany()
  await prisma.project.deleteMany()

  // Create test project with Hebrew data
  const projectId = nanoid()
  const passwordHash = await bcrypt.hash('test123', 10)

  await prisma.project.create({
    data: {
      projectId,
      projectName: 'מיכל דהרי - שחיקה',
      studentName: 'מיכל דהרי',
      studentEmail: 'michald2211@gmail.com',
      researchTopic: 'שחיקה בקרב עובדים פרא-רפואיים',
      passwordHash,
      docxUrl: `/uploads/${projectId}/findings.docx`,
      htmlUrl: `/uploads/${projectId}/report.html`,
      viewCount: 0,
    },
  })

  console.log('Seed data created:')
  console.log(`Project ID: ${projectId}`)
  console.log('Password: test123')
  console.log(`URL: http://localhost:3000/preview/${projectId}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

```json
// Add to package.json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  },
  "scripts": {
    "seed": "npx prisma db seed"
  }
}
```

### Testing Utilities

```typescript
// lib/test/helpers.ts
import { PrismaClient } from '@prisma/client'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'

export async function createTestProject(prisma: PrismaClient) {
  const projectId = nanoid()
  const password = 'test123'
  const passwordHash = await bcrypt.hash(password, 10)

  const project = await prisma.project.create({
    data: {
      projectId,
      projectName: 'Test Project',
      studentName: 'Test Student',
      studentEmail: 'test@example.com',
      researchTopic: 'Test Research',
      passwordHash,
      docxUrl: `/uploads/${projectId}/findings.docx`,
      htmlUrl: `/uploads/${projectId}/report.html`,
    },
  })

  return { project, password }
}

export async function cleanupTestData(prisma: PrismaClient) {
  await prisma.projectSession.deleteMany()
  await prisma.adminSession.deleteMany()
  await prisma.project.deleteMany()
}
```

---

**Report Complete. Ready for Planner to synthesize with other explorer reports.**
