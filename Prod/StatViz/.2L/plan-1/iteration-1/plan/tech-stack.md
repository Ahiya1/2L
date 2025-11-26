# Technology Stack

## Core Framework

**Decision:** Next.js 14.2.0+ (App Router)

**Rationale:**
- **Unified Frontend/Backend:** Eliminates deployment complexity with single codebase. API routes are serverless-ready for Vercel.
- **TypeScript Native:** First-class TypeScript support with strict mode. Type-safe development prevents runtime errors.
- **Production-Ready App Router:** Stable and recommended for new projects. Server Components reduce client bundle size.
- **Multipart Upload Support:** Built-in API route handling for file uploads via body parser configuration.
- **Vercel Deployment:** One-click deploy, automatic HTTPS, edge functions, preview deployments.
- **Hebrew RTL Foundation:** CSS-in-JS with RTL utilities prepare for Iteration 2 UI work.

**Alternatives Considered:**
- **Express.js + React SPA:** Rejected - requires separate backend deployment, more complex auth flow, no SSR benefits
- **Python Flask + React:** Rejected - different language stack, slower file handling, less mature TypeScript integration
- **Next.js Pages Router:** Rejected - legacy pattern, App Router is future-proof and recommended

**Installation:**
```bash
npx create-next-app@latest statviz --typescript --app --tailwind --no-src-dir
```

**Configuration:**
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // Allow larger body sizes for file uploads (requires Vercel Pro for 50MB)
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
}
export default nextConfig
```

---

## Database

**Decision:** PostgreSQL 14+ with Prisma ORM 5.19+

**Rationale:**
- **ACID Compliance:** Transaction support critical for two-phase commit pattern in file uploads. Rollback on failure prevents data corruption.
- **Prisma Type Safety:** Auto-generated TypeScript types from schema eliminate SQL injection by design. Parameterized queries prevent attacks.
- **Migration System:** Version-controlled schema evolution via `prisma migrate`. Git-trackable database changes.
- **Connection Pooling:** Built-in with PgBouncer support. Prevents connection exhaustion under load.
- **Hebrew UTF-8 Support:** Native UTF-8 encoding for Hebrew text. Tested with real data from requirements.
- **Free Hosting:** Vercel Postgres (60 hours compute/month, 512 MB) or Supabase (500 MB, unlimited compute) for MVP.

**Alternatives Considered:**
- **MongoDB + Mongoose:** Rejected - NoSQL lacks ACID transactions needed for atomic file uploads. Schema-less problematic for structured data.
- **MySQL + TypeORM:** Rejected - Prisma has better TypeScript DX, MySQL UTF-8 handling less robust
- **Raw SQL:** Rejected - no type safety, manual connection pooling, higher SQL injection risk

**Schema Strategy:**
- Three core tables: `projects`, `admin_sessions`, `project_sessions`
- Soft delete support via `deleted_at` field (safety net for accidental deletion)
- Indexes on high-query fields: `projectId`, `studentEmail`, `createdAt`
- Foreign key constraints for referential integrity (session → project)
- Prisma migrations for all schema changes (no manual SQL)

**Installation:**
```bash
npm install prisma @prisma/client
npm install -D prisma
npx prisma init
```

**Prisma Client Pattern:**
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

---

## Authentication

**Decision:** bcryptjs 2.4.3 + jsonwebtoken 9.0.2

**Rationale:**
- **Industry Standard Security:** bcrypt with 10 rounds balances security (resistant to brute force) and performance (<1s login time).
- **Serverless Compatible:** bcryptjs is pure JavaScript (no native bindings), works in Vercel serverless functions. Native bcrypt would fail.
- **Dual Authentication Pattern:** JWT for admin (stateless, 30-min expiry), session tokens for projects (stateful, 24-hour expiry, revocable).
- **Password Hashing NOT Encryption:** bcrypt one-way hash prevents password recovery (security best practice). Explorers suggested AES-256 encryption for "view password" feature - REJECTED for security reasons. Admin can reset passwords, not view them.
- **Stateless + Stateful Hybrid:** JWT stored in httpOnly cookies (XSS protection). Database also stores sessions for immediate revocation.

**Alternatives Considered:**
- **Argon2:** Rejected - better security but requires native bindings (incompatible with Vercel serverless)
- **PBKDF2:** Rejected - lower-level, requires manual salt management, less secure than bcrypt
- **NextAuth.js:** Rejected - overkill for single admin, adds unnecessary complexity, custom implementation gives full control

**Implementation:**
```typescript
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Password hashing (10 rounds per security spec)
const SALT_ROUNDS = 10
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

// Password verification
const isValid = await bcrypt.compare(password, passwordHash)

// JWT token generation (admin - 30 min)
const adminToken = jwt.sign(
  { type: 'admin', userId: 'ahiya' },
  process.env.JWT_SECRET!,
  { expiresIn: '30m' }
)

// JWT token generation (project - 24 hours)
const projectToken = jwt.sign(
  { type: 'project', projectId },
  process.env.JWT_SECRET!,
  { expiresIn: '24h' }
)

// Token verification
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!)
  // Token valid
} catch (error) {
  // Token expired or invalid
}
```

**Security Notes:**
- JWT_SECRET must be cryptographically random (min 256 bits): `openssl rand -base64 32`
- Store in environment variables, NEVER commit to git
- Backup encryption key securely (offline, encrypted) for disaster recovery

---

## API Layer

**Decision:** Next.js App Router API Routes (RESTful)

**Rationale:**
- **Native Integration:** No separate backend framework needed. API routes colocated with frontend.
- **RESTful Design:** Standard HTTP methods (GET, POST, DELETE) for predictable API.
- **Type-Safe:** TypeScript throughout API layer, Zod validation for runtime checks.
- **Middleware Support:** Authentication, rate limiting, error handling via Next.js middleware.
- **Serverless:** Automatic scaling on Vercel. No server management.

**Endpoint Structure:**
```
Admin Endpoints (Authentication Required):
  POST   /api/admin/login           → JWT token
  GET    /api/admin/projects        → List all projects
  POST   /api/admin/projects        → Create project (multipart)
  DELETE /api/admin/projects/[id]   → Delete project
  GET    /api/admin/projects/[id]   → Get project details

Public Endpoints (Project Authentication):
  POST   /api/preview/[id]/verify   → Validate password, return token
  GET    /api/preview/[id]          → Get project data
  GET    /api/preview/[id]/html     → Serve HTML content
  GET    /api/preview/[id]/download → Download DOCX
```

**Error Response Format:**
```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    code: "INVALID_PASSWORD",
    message: "סיסמה שגויה. אנא נסה שוב.",
    details: { ... } // optional
  }
}
```

**Error Codes:**
- `AUTH_FAILED` - Authentication failed
- `INVALID_PASSWORD` - Project password incorrect
- `PROJECT_NOT_FOUND` - Project doesn't exist
- `FILE_TOO_LARGE` - Upload exceeds 50 MB
- `INVALID_FILE_TYPE` - Not .docx or .html
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## File Storage

**Decision:** Local Filesystem (Iteration 1) → AWS S3 (Production) via Abstraction Layer

**Rationale:**
- **MVP Simplicity:** Local storage (`fs/promises`) reduces infrastructure complexity. Zero cost, fast iteration.
- **Abstraction Layer Required:** Master plan explicitly requires "abstraction layer for future S3 migration". Interface-based design enables swapping storage without code changes.
- **S3 Benefits:** Durability (99.999999999%), scalability, signed URLs for secure downloads, automatic backups, CDN integration.
- **Cost:** S3 is ~$0.023/GB/month. MVP <100 GB = <$5/month.
- **Vercel Limitation:** Serverless filesystem doesn't persist across deployments. S3 required for production.

**Abstraction Interface:**
```typescript
// lib/storage/interface.ts
export interface FileStorage {
  upload(projectId: string, filename: string, buffer: Buffer): Promise<string>
  download(projectId: string, filename: string): Promise<Buffer>
  delete(projectId: string, filename: string): Promise<void>
  getUrl(projectId: string, filename: string): string
}
```

**Local Implementation (Iteration 1):**
```typescript
// lib/storage/local.ts
export class LocalFileStorage implements FileStorage {
  private uploadDir: string

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
  }

  async upload(projectId: string, filename: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.uploadDir, projectId, filename)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
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

  getUrl(projectId: string, filename: string): string {
    return `/uploads/${projectId}/${filename}`
  }
}
```

**S3 Implementation (Future):**
```typescript
// lib/storage/s3.ts (stub for now)
export class S3FileStorage implements FileStorage {
  // TODO: Implement with @aws-sdk/client-s3
  // - PutObjectCommand for upload
  // - GetObjectCommand for download
  // - DeleteObjectCommand for delete
  // - getSignedUrl for temporary download URLs (1 hour expiry)
}
```

**Storage Selection:**
```typescript
// lib/storage/index.ts
import { FileStorage } from './interface'
import { LocalFileStorage } from './local'
import { S3FileStorage } from './s3'

export const fileStorage: FileStorage =
  process.env.STORAGE_TYPE === 's3'
    ? new S3FileStorage()
    : new LocalFileStorage()
```

**File Organization:**
```
/uploads
  /{project_id}
    /findings.docx
    /report.html
  /{project_id_2}
    /findings.docx
    /report.html
```

---

## Frontend (Iteration 1 - Minimal)

**Decision:** No frontend in Iteration 1 (API-only)

**Rationale:** Backend-heavy iteration focuses on security and data integrity. UI comes in Iteration 2.

**Styling (Iteration 2+):** Tailwind CSS 3.4+ with RTL support

**UI Component Library (Iteration 2+):** Headless UI or Radix UI (accessible, customizable)

**Styling Preparation:**
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

---

## External Integrations

### File Upload Handling

**Library:** multer 1.4.5 + next-connect 1.0.0

**Purpose:** Parse multipart/form-data for file uploads up to 50 MB

**Why:** Next.js API routes don't parse multipart by default. multer is industry standard.

**Pattern:**
```typescript
import multer from 'multer'
import nextConnect from 'next-connect'
import type { NextApiRequest, NextApiResponse } from 'next'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/html'
    ]
    if (allowed.includes(file.mimetype)) {
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

### HTML Parsing

**Library:** cheerio 1.0.0-rc.12

**Purpose:** Validate HTML for external dependencies (CSS, JS, images)

**Why:** jQuery-like syntax, fast, server-side, perfect for parsing uploaded HTML

**Pattern:**
```typescript
import * as cheerio from 'cheerio'

function validateHtml(htmlContent: string): { warnings: string[] } {
  const $ = cheerio.load(htmlContent)
  const warnings: string[] = []

  // External CSS
  $('link[rel="stylesheet"]').each((i, el) => {
    const href = $(el).attr('href')
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      warnings.push(`External CSS: ${href}`)
    }
  })

  // External JS
  $('script[src]').each((i, el) => {
    const src = $(el).attr('src')
    if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
      warnings.push(`External JS: ${src}`)
    }
  })

  // External images
  $('img[src]').each((i, el) => {
    const src = $(el).attr('src')
    if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
      warnings.push(`External image: ${src}`)
    }
  })

  // Check Plotly
  const hasPlotly = $('script:contains("Plotly")').length > 0
  if (!hasPlotly) {
    warnings.push('Plotly library not detected')
  }

  return { warnings }
}
```

---

## Development Tools

### Testing

**Framework:** Manual testing with Postman/curl (Iteration 1)

**Coverage target:** N/A (no automated tests in Iteration 1)

**Strategy:**
- Postman collection for all API endpoints
- Manual security testing (OWASP ZAP)
- Test with real Hebrew data
- Edge case validation (oversized files, wrong MIME types)

**Future (Post-MVP):**
- Unit tests: Vitest (fast, Jest-compatible)
- Integration tests: Playwright (E2E testing)
- Load tests: Artillery (concurrent requests)

### Code Quality

**Linter:** ESLint (included with Next.js)

**Config:**
```javascript
// .eslintrc.json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

**Formatter:** Prettier (optional, standardizes code style)

**Type Checking:** TypeScript strict mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Build & Deploy

**Build tool:** Next.js built-in (Turbopack for dev, Webpack for prod)

**Deployment target:** Vercel (Iteration 3), Local development (Iteration 1)

**CI/CD:** N/A for Iteration 1 (manual deployment)

---

## Environment Variables

List all required env vars:

**Database:**
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/statviz`)

**Authentication:**
- `JWT_SECRET`: Cryptographically random string (min 32 chars) - Generate: `openssl rand -base64 32`
- `ADMIN_USERNAME`: Admin username (default: `ahiya`)
- `ADMIN_PASSWORD_HASH`: bcrypt hash of admin password - Generate: `bcrypt.hash('password', 10)`

**File Storage:**
- `STORAGE_TYPE`: `local` or `s3` (default: `local`)
- `UPLOAD_DIR`: Local storage path (default: `./uploads`) - only if STORAGE_TYPE=local
- `S3_BUCKET`: AWS S3 bucket name - only if STORAGE_TYPE=s3
- `AWS_ACCESS_KEY_ID`: AWS access key - only if STORAGE_TYPE=s3
- `AWS_SECRET_ACCESS_KEY`: AWS secret key - only if STORAGE_TYPE=s3
- `AWS_REGION`: AWS region (default: `us-east-1`) - only if STORAGE_TYPE=s3

**Application:**
- `NEXT_PUBLIC_BASE_URL`: Base URL for application (e.g., `http://localhost:3000`)
- `NODE_ENV`: `development`, `production`, or `test`

**Example .env.local:**
```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/statviz"

# Authentication
JWT_SECRET="<generate with: openssl rand -base64 32>"
ADMIN_USERNAME="ahiya"
ADMIN_PASSWORD_HASH="<generate with bcrypt>"

# File Storage
STORAGE_TYPE="local"
UPLOAD_DIR="./uploads"

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## Dependencies Overview

**Production Dependencies:**
```json
{
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
```

**Development Dependencies:**
```json
{
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
```

**Why Each Dependency:**
- `next`: Framework for API routes and future frontend
- `@prisma/client`: Type-safe database access
- `bcryptjs`: Password hashing (serverless-compatible)
- `jsonwebtoken`: JWT token generation and validation
- `multer`: Multipart form parsing for file uploads
- `next-connect`: Middleware pattern for Next.js API routes
- `nanoid`: Short, URL-safe project IDs (12 chars)
- `zod`: Runtime type validation for API requests
- `cheerio`: HTML parsing for external dependency detection
- `rate-limiter-flexible`: Rate limiting (in-memory for MVP, Redis-ready)
- `validator`: Input sanitization (email, strings)
- `tailwindcss`: Utility-first CSS (preparation for Iteration 2)

---

## Performance Targets

- **Admin Login:** < 1 second (bcrypt with 10 rounds)
- **File Upload (50 MB):** < 60 seconds (depends on network speed)
- **Database Query:** < 100ms (indexed queries)
- **Password Verification:** < 1 second (bcrypt comparison)
- **API Response Time:** < 500ms (excluding file upload)

**Performance Optimizations:**
- Prisma connection pooling (reuse connections)
- Database indexes on high-query fields
- Efficient file streaming (no full buffer in memory)
- Rate limiting prevents DoS attacks

---

## Security Considerations

**1. Authentication Security:**
- bcrypt with 10 rounds (resistant to brute force)
- JWT tokens with expiration (30 min admin, 24 hour project)
- httpOnly cookies (prevents XSS token theft)
- Secure flag on cookies (HTTPS only)
- SameSite=Strict (CSRF protection)
- Rate limiting (5 attempts/15 min admin, 10 attempts/hour project)

**2. Input Validation:**
- Zod schemas for all API inputs
- MIME type validation (whitelist only)
- File size limits (50 MB hard limit)
- Email format validation
- String length limits (prevent buffer overflow)
- HTML sanitization (escape user input)

**3. SQL Injection Prevention:**
- Prisma ORM uses parameterized queries (no string concatenation)
- No raw SQL in application code
- Database user has minimal permissions

**4. XSS Protection:**
- Escape HTML entities in user-generated content
- Content Security Policy headers (prepare for iframe embedding)
- Sanitize all text inputs with validator library

**5. File Upload Security:**
- MIME type whitelist (only .docx and .html)
- Path traversal prevention (no user-controlled filenames)
- Virus scanning (optional ClamAV for production)
- Isolated storage (project-based directories)
- Sandboxed iframe rendering (Iteration 3)

**6. HTTPS Enforcement:**
- Vercel provides automatic SSL certificates
- Redirect HTTP → HTTPS in production
- HSTS headers (HTTP Strict Transport Security)

**7. Security Headers:**
```typescript
// middleware.ts
response.headers.set('X-Frame-Options', 'SAMEORIGIN')
response.headers.set('X-Content-Type-Options', 'nosniff')
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
response.headers.set('Content-Security-Policy',
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
)
```

**8. Rate Limiting:**
- Admin login: 5 attempts per 15 minutes per IP
- Project password: 10 attempts per hour per project_id
- API endpoints: 100 requests per minute per IP

**9. Session Management:**
- Token expiration enforced (JWT + database check)
- Immediate revocation via database deletion
- Graceful timeout with redirect to login
- No refresh tokens (re-authentication required)

---

**Tech Stack Status:** FINALIZED
**Ready for:** Pattern Definition and Builder Task Breakdown
