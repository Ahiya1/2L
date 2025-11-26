# Explorer 1 Report: Architecture & Structure

## Executive Summary

StatViz is a **backend-heavy, security-critical** platform that requires a layered architecture with dual authentication patterns (admin JWT + project password tokens), file handling up to 50MB, Hebrew RTL support, and HTML iframe embedding. The architecture must prioritize **security-by-design**, **data isolation**, and **atomic file operations**. This is a **COMPLEX** foundation (20-25 hours estimated) with HIGH risk due to authentication implementation, file upload security, and database schema design that must be correct from day one.

**Key Finding:** Iteration 1 must establish bulletproof security and data integrity patterns before any UI is built, as fixing authentication/storage bugs after UI integration is exponentially costlier.

---

## Discoveries

### Discovery Category 1: Dual Authentication Architecture

**Finding 1: Two Separate Authentication Flows Required**
- **Admin Flow:** Username/password → JWT token → httpOnly cookie → 30-min timeout
- **Project Flow:** project_id + password → Session token → httpOnly cookie → 24-hour timeout
- **Critical Insight:** These must be COMPLETELY isolated - different token types, different session stores, different middleware chains

**Finding 2: Session Management Complexity**
- Admin sessions need automatic renewal (UX consideration)
- Project sessions should NOT auto-renew (security consideration - students shouldn't stay logged in indefinitely)
- Need graceful session expiration (redirect to login, preserve intended destination)

**Finding 3: Rate Limiting Must Be Layered**
- Admin login: 5 attempts per 15 minutes per IP
- Project password: 10 attempts per hour per project_id (prevent brute force)
- API endpoints: 100 requests per minute per IP (prevent DoS)
- **Storage:** In-memory Map for MVP (simple), Redis for production (distributed, persistent)

---

### Discovery Category 2: File Storage Architecture

**Finding 1: Atomic Upload Pattern Required**
- **Problem:** If DOCX uploads but HTML fails, database record is invalid
- **Solution:** Two-phase commit pattern:
  1. Upload both files to temporary directory
  2. Validate both files (MIME type, size, HTML parsing)
  3. Create database record
  4. Move files to permanent storage (atomic rename)
  5. On ANY failure: rollback all (delete temp files, rollback DB transaction)

**Finding 2: File Organization Strategy**
```
/uploads
  /{project_id}
    /findings.docx
    /report.html
  /{project_id_2}
    /findings.docx
    /report.html
```
- **Rationale:** Project-based folders enable atomic deletion (delete entire folder)
- **Alternative (S3):** Use project_id as prefix: `projects/{project_id}/findings.docx`

**Finding 3: File Validation Requirements**
- **DOCX:** MIME type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **HTML:** MIME type `text/html` (but also accept `application/octet-stream` from browsers)
- **Size Limit:** 50 MB per file (configurable via env)
- **HTML Validation:** Parse for external dependencies (`<link href>`, `<script src>`, `<img src>`)
- **Security:** Disable executable uploads (`.exe`, `.sh`, `.bat`)

**Finding 4: Virus Scanning Consideration**
- **Recommended:** ClamAV integration (open-source, works on Linux)
- **MVP Decision:** OPTIONAL - warn user to scan files before upload
- **Future:** Automated scanning via `clamscan` command before storage

---

### Discovery Category 3: Database Schema Design

**Finding 1: Projects Table Schema**
```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(12) UNIQUE NOT NULL,  -- nanoid(12) for URL-safe IDs
  project_name VARCHAR(500) NOT NULL,
  student_name VARCHAR(255),
  student_email VARCHAR(255),
  research_topic TEXT,
  password_encrypted TEXT NOT NULL,  -- AES-256 encryption (not hash!)
  password_salt VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255) DEFAULT 'ahiya',
  docx_path TEXT NOT NULL,  -- Relative path: /{project_id}/findings.docx
  html_path TEXT NOT NULL,  -- Relative path: /{project_id}/report.html
  view_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,  -- Soft delete support
  
  -- Indexes for performance
  INDEX idx_project_id (project_id),
  INDEX idx_student_email (student_email),
  INDEX idx_created_at (created_at DESC)
);
```

**Critical Decision: Password Storage Strategy**
- **NOT bcrypt/hash:** Need password recovery (Ahiya may forget, students need reminders)
- **USE AES-256 encryption:** Encrypt with key from environment variable
- **Rationale:** Supports "view password" feature in admin panel
- **Trade-off:** Slightly less secure than hashing, but necessary for UX

**Finding 2: Session Management Options**

**Option A: In-Memory Session Store (MVP)**
```typescript
// Simple Map-based storage
const adminSessions = new Map<string, { userId: string, expiresAt: Date }>();
const projectSessions = new Map<string, { projectId: string, expiresAt: Date }>();
```
**Pros:** Simple, fast, zero infrastructure
**Cons:** Lost on server restart, doesn't scale horizontally

**Option B: Database Session Store (Production)**
```sql
CREATE TABLE admin_sessions (
  token VARCHAR(255) PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_expires (expires_at)
);

CREATE TABLE project_sessions (
  token VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(12) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  INDEX idx_expires (expires_at)
);
```
**Pros:** Survives restarts, centralized, supports cleanup job
**Cons:** Database overhead for every auth check

**Recommendation:** Start with Option A (in-memory), migrate to Option B when scaling

**Finding 3: Data Migration Strategy**
- Use Prisma migrations for schema evolution
- Seed script for initial admin account
- Environment-based configuration (dev/staging/production)

---

### Discovery Category 4: API Architecture

**Finding 1: RESTful Endpoint Design**

**Admin Endpoints (Prefix: `/api/admin`)**
```
POST   /api/admin/login           → JWT token
GET    /api/admin/projects        → List all projects
POST   /api/admin/projects        → Create new project (multipart)
DELETE /api/admin/projects/:id    → Delete project
GET    /api/admin/projects/:id    → Get project details
PATCH  /api/admin/projects/:id    → Update project (optional MVP)
```

**Public Endpoints (Prefix: `/api`)**
```
POST   /api/preview/:id/verify    → Validate password, return token
GET    /api/preview/:id           → Get project data (requires token)
GET    /api/preview/:id/html      → Serve HTML content (requires token)
GET    /api/preview/:id/download  → Download DOCX (requires token)
```

**Finding 2: Middleware Chain Architecture**
```
Request
  ↓
[CORS Middleware] → Enable cross-origin for future integrations
  ↓
[Rate Limiter] → Per-IP/per-endpoint throttling
  ↓
[Body Parser] → JSON + Multipart (for file uploads)
  ↓
[Authentication Middleware] → Validate JWT/session token
  ↓
[Authorization Middleware] → Check permissions (admin vs project viewer)
  ↓
[Route Handler] → Business logic
  ↓
[Error Handler] → Catch all errors, return structured JSON
  ↓
Response
```

**Finding 3: Error Response Structure**
```typescript
// Success response
{
  success: true,
  data: { ... }
}

// Error response
{
  success: false,
  error: {
    code: "INVALID_PASSWORD",
    message: "סיסמה שגויה. אנא נסה שוב.",
    details: { /* optional */ }
  }
}
```

**Error Codes Taxonomy:**
- `AUTH_FAILED`: Authentication error
- `INVALID_PASSWORD`: Project password incorrect
- `PROJECT_NOT_FOUND`: Project doesn't exist
- `FILE_TOO_LARGE`: Upload exceeds 50 MB
- `INVALID_FILE_TYPE`: Not .docx or .html
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

---

### Discovery Category 5: Security Architecture

**Finding 1: HTTPS Enforcement**
```typescript
// Middleware to redirect HTTP → HTTPS
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.redirect(301, `https://${req.headers.host}${req.url}`);
}
```

**Finding 2: Security Headers**
```typescript
// Helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // For Plotly in iframe
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      frameSrc: ["'self'"],  // Allow iframe embedding
      connectSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Finding 3: Input Sanitization**
- **User Inputs:** Sanitize all text fields (project name, student name, research topic)
- **Library:** Use `validator.js` or `DOMPurify`
- **SQL Injection:** Prevented by Prisma ORM (parameterized queries)
- **XSS Prevention:** Escape HTML entities in user-generated content

**Finding 4: CSRF Protection**
- **Problem:** Forms vulnerable to cross-site request forgery
- **Solution:** CSRF tokens for admin panel (using `csurf` middleware)
- **Implementation:**
  ```typescript
  // Generate token
  const csrfToken = req.csrfToken();
  
  // Validate on POST/DELETE requests
  if (!req.body._csrf || req.body._csrf !== req.session.csrfToken) {
    throw new Error('CSRF validation failed');
  }
  ```

**Finding 5: Rate Limiting Implementation**
```typescript
import rateLimit from 'express-rate-limit';

// Admin login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts
  message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות.',
  standardHeaders: true,
  legacyHeaders: false
});

// Project password rate limiter
const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,  // 10 attempts per project
  keyGenerator: (req) => req.params.projectId,  // Per-project limit
  message: 'יותר מדי ניסיונות סיסמה. נסה שוב בעוד שעה.'
});
```

---

### Discovery Category 6: HTML Validation Architecture

**Finding 1: External Dependency Detection**
```typescript
import { parse } from 'node-html-parser';

function validateHTMLSelfContained(htmlContent: string): ValidationResult {
  const root = parse(htmlContent);
  
  const warnings: string[] = [];
  
  // Check for external CSS
  const externalCSS = root.querySelectorAll('link[rel="stylesheet"]');
  if (externalCSS.length > 0) {
    warnings.push(`נמצאו ${externalCSS.length} קובצי CSS חיצוניים`);
  }
  
  // Check for external JS
  const externalJS = root.querySelectorAll('script[src]');
  if (externalJS.length > 0) {
    warnings.push(`נמצאו ${externalJS.length} קובצי JavaScript חיצוניים`);
  }
  
  // Check for external images
  const externalImages = root.querySelectorAll('img[src^="http"]');
  if (externalImages.length > 0) {
    warnings.push(`נמצאו ${externalImages.length} תמונות חיצוניות`);
  }
  
  // Check for Plotly
  const plotlyFound = htmlContent.includes('Plotly.newPlot') || 
                       htmlContent.includes('plotly.min.js');
  
  return {
    isValid: warnings.length === 0,
    warnings,
    hasPlotly: plotlyFound
  };
}
```

**Finding 2: Non-Blocking Validation**
- **Strategy:** Warn user but allow upload (since Claude may use CDN for Plotly)
- **UI Flow:**
  1. User uploads HTML
  2. System validates
  3. If warnings found: Display in modal "קיימות תלויות חיצוניות. להמשיך בכל זאת?"
  4. User clicks "כן, העלה בכל זאת"
  5. Upload proceeds

---

## Patterns Identified

### Pattern Type: Two-Phase Commit for File Uploads

**Description:** Ensure atomicity when creating project with multiple files

**Use Case:** Prevent orphaned files or incomplete database records

**Implementation:**
```typescript
async function createProject(data: ProjectData, files: Files): Promise<Project> {
  const tempDir = `/tmp/${nanoid()}`;
  let dbRecord: Project | null = null;
  
  try {
    // Phase 1: Upload to temporary storage
    await fs.mkdir(tempDir);
    await fs.writeFile(`${tempDir}/findings.docx`, files.docx);
    await fs.writeFile(`${tempDir}/report.html`, files.html);
    
    // Phase 2: Validate files
    validateFileSize(files.docx, 50 * 1024 * 1024);
    validateFileSize(files.html, 50 * 1024 * 1024);
    const htmlValidation = validateHTMLSelfContained(files.html.toString());
    
    // Phase 3: Create database record
    dbRecord = await prisma.project.create({
      data: {
        projectId: nanoid(12),
        projectName: data.projectName,
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        researchTopic: data.researchTopic,
        passwordEncrypted: encryptPassword(data.password),
        docxPath: `/${dbRecord.projectId}/findings.docx`,
        htmlPath: `/${dbRecord.projectId}/report.html`
      }
    });
    
    // Phase 4: Move to permanent storage (atomic)
    const permanentDir = `/uploads/${dbRecord.projectId}`;
    await fs.mkdir(permanentDir);
    await fs.rename(`${tempDir}/findings.docx`, `${permanentDir}/findings.docx`);
    await fs.rename(`${tempDir}/report.html`, `${permanentDir}/report.html`);
    
    // Phase 5: Cleanup temp
    await fs.rmdir(tempDir);
    
    return dbRecord;
    
  } catch (error) {
    // Rollback: Delete temp files
    await fs.rmdir(tempDir, { recursive: true });
    
    // Rollback: Delete database record
    if (dbRecord) {
      await prisma.project.delete({ where: { id: dbRecord.id } });
    }
    
    throw error;
  }
}
```

**Recommendation:** MUST implement this pattern to prevent data corruption

---

### Pattern Type: Middleware-Based Authentication

**Description:** Reusable authentication middleware for protected routes

**Use Case:** Enforce authentication on admin and project endpoints

**Implementation:**
```typescript
// Admin authentication middleware
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.admin_token;
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' }
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    });
  }
}

// Project authentication middleware
export function requireProjectAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.project_token;
  const projectId = req.params.id;
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'AUTH_REQUIRED', message: 'סיסמה נדרשת' }
    });
  }
  
  const session = projectSessions.get(token);
  
  if (!session || session.projectId !== projectId || session.expiresAt < new Date()) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'SESSION_EXPIRED', message: 'הפגיסה פגה תוקף. נא להזין סיסמה שוב' }
    });
  }
  
  req.project = { projectId: session.projectId };
  next();
}
```

**Recommendation:** Use this pattern consistently across all protected endpoints

---

### Pattern Type: Environment-Based Configuration

**Description:** Centralized configuration with environment variables

**Use Case:** Different settings for dev/staging/production

**Implementation:**
```typescript
// config/index.ts
export const config = {
  env: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL!,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10')
  },
  
  storage: {
    type: process.env.STORAGE_TYPE || 'local',  // 'local' | 's3'
    localPath: process.env.STORAGE_PATH || '/uploads',
    s3Bucket: process.env.AWS_S3_BUCKET,
    s3Region: process.env.AWS_REGION || 'eu-central-1'
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    adminSessionTimeout: 30 * 60 * 1000,  // 30 minutes
    projectSessionTimeout: 24 * 60 * 60 * 1000,  // 24 hours
    encryptionKey: process.env.ENCRYPTION_KEY!  // AES-256 key
  },
  
  security: {
    httpsOnly: process.env.NODE_ENV === 'production',
    rateLimitEnabled: true,
    csrfEnabled: true
  },
  
  files: {
    maxSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '50'),
    allowedTypes: {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      html: 'text/html'
    }
  }
};

// Validation: Ensure required env vars exist
function validateConfig() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY'
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

validateConfig();
```

**Recommendation:** Centralize ALL configuration in one file, validate on startup

---

## Complexity Assessment

### High Complexity Areas

**1. Authentication & Session Management (HIGH - Split recommended)**
- **Why Complex:**
  - Dual authentication flows (admin vs project)
  - Token generation, validation, expiration
  - Rate limiting per endpoint/IP/project
  - Session cleanup jobs
  - httpOnly cookie handling
  - CSRF protection
- **Estimated Builder Splits:** 2 sub-builders
  - **Sub-builder A:** Admin authentication (JWT, login endpoint, middleware)
  - **Sub-builder B:** Project authentication (password verification, session tokens)

**2. File Upload & Storage (HIGH - Split recommended)**
- **Why Complex:**
  - Multipart form parsing (50 MB files)
  - Two-phase commit pattern
  - Atomic rollback on failure
  - HTML validation (parse, detect external deps)
  - File type validation (MIME check)
  - Size limit enforcement
  - Abstraction layer (local vs S3)
- **Estimated Builder Splits:** 2 sub-builders
  - **Sub-builder A:** Upload handling & validation
  - **Sub-builder B:** Storage abstraction & cleanup

**3. Database Schema & Migrations (MEDIUM)**
- **Why Complex:**
  - Password encryption (AES-256) vs hashing
  - Prisma ORM setup
  - Migration scripts
  - Seed data
  - Connection pooling
  - Soft delete implementation
- **Estimated Builder Splits:** 1 builder (manageable with Prisma)

---

### Medium Complexity Areas

**1. API Endpoint Implementation (MEDIUM)**
- Standard RESTful patterns
- Error handling middleware
- Request validation (Zod schemas)
- Response formatting

**2. Security Headers & HTTPS (MEDIUM)**
- Helmet.js configuration
- CSP headers for iframe support
- HTTPS redirect middleware
- Security audit checklist

**3. HTML Validation Logic (MEDIUM)**
- HTML parsing (node-html-parser)
- External dependency detection
- Warning generation (non-blocking)

---

### Low Complexity Areas

**1. Environment Configuration (LOW)**
- .env file setup
- Config validation
- Type-safe config object

**2. Error Response Structure (LOW)**
- Standardized JSON format
- Error code taxonomy
- Hebrew error messages

**3. Logging Infrastructure (LOW)**
- Winston or Pino logger
- Structured logging
- Log levels (error, warn, info, debug)

---

## Technology Recommendations

### Primary Stack

**Framework: Next.js 14+ (App Router)**
- **Rationale:**
  1. **API Routes + Frontend in One:** Simplifies deployment (single codebase)
  2. **TypeScript Native:** Type-safe development
  3. **Vercel Deployment:** One-click deploy, edge functions, automatic HTTPS
  4. **Server Components:** Performance benefits for admin dashboard
  5. **File Upload Support:** Built-in API route handling for multipart
  6. **Hebrew RTL Support:** CSS-in-JS with RTL utilities

**Database: PostgreSQL 14+ with Prisma ORM**
- **Rationale:**
  1. **ACID Compliance:** Transaction support for two-phase commits
  2. **Prisma Type Safety:** Auto-generated TypeScript types from schema
  3. **Migration System:** Version-controlled schema evolution
  4. **Connection Pooling:** Built-in with PgBouncer support
  5. **JSON Support:** Store metadata flexibly
  6. **Free Hosting:** Vercel Postgres (free tier) or Supabase

**File Storage: Local Filesystem (MVP) → AWS S3 (Production)**
- **Rationale:**
  1. **MVP Simplicity:** Local storage reduces infrastructure complexity
  2. **Abstraction Layer:** Design for easy S3 migration
  3. **S3 Benefits:** Durability (99.999999999%), scalability, signed URLs
  4. **Cost:** S3 is pennies for MVP scale (<100 GB/month)

**Authentication: JWT (Admin) + Custom Session Tokens (Projects)**
- **Rationale:**
  1. **JWT for Admin:** Stateless, works across server restarts
  2. **Session Tokens for Projects:** Stateful, allows immediate revocation
  3. **No External Auth:** NextAuth.js is overkill for single admin
  4. **Custom Implementation:** Full control over expiration logic

**Styling: Tailwind CSS with RTL Plugin**
- **Rationale:**
  1. **RTL Support:** `tailwindcss-rtl` plugin for Hebrew
  2. **Utility-First:** Fast development, small bundle size
  3. **Responsive:** Mobile-first approach
  4. **Hebrew Fonts:** Easy integration with Google Fonts (Rubik, Heebo)

---

### Supporting Libraries

**File Upload: `multer` (multipart form parsing)**
- **Purpose:** Handle DOCX and HTML file uploads up to 50 MB
- **Why Needed:** Next.js API routes don't parse multipart by default

**Password Encryption: `crypto` (Node.js built-in)**
- **Purpose:** AES-256-GCM encryption for project passwords
- **Why Needed:** Allow password recovery (can't use bcrypt hashing)

**HTML Parsing: `node-html-parser`**
- **Purpose:** Detect external dependencies in uploaded HTML
- **Why Needed:** Validate self-contained reports

**Rate Limiting: `express-rate-limit` (or custom implementation)**
- **Purpose:** Prevent brute force attacks on login/password endpoints
- **Why Needed:** Security best practice

**Input Validation: `zod`**
- **Purpose:** Type-safe request validation
- **Why Needed:** Ensure data integrity, prevent injection attacks

**Logging: `winston`**
- **Purpose:** Structured logging with levels (error, warn, info)
- **Why Needed:** Debug production issues, audit trail

**Security Headers: `helmet`**
- **Purpose:** Set HTTP security headers automatically
- **Why Needed:** CSP, HSTS, XSS protection

**ID Generation: `nanoid`**
- **Purpose:** Generate short, URL-safe project IDs
- **Why Needed:** User-friendly URLs (statviz.xyz/preview/abc123xyz)

---

## Integration Points

### External APIs

**None for MVP** - All functionality is self-contained

**Future Integration: Claude API**
- **Purpose:** Auto-generate reports from uploaded data
- **Complexity:** HIGH - requires data processing pipeline
- **Considerations:** API costs, rate limits, error handling

---

### Internal Integrations

**API Layer ↔ Database**
- **Connection:** Prisma ORM
- **Pattern:** Repository pattern (encapsulate DB queries)
- **Error Handling:** Catch Prisma errors, return structured responses

**API Layer ↔ File Storage**
- **Connection:** Storage abstraction layer
- **Pattern:** Strategy pattern (local vs S3 implementation)
- **Error Handling:** Retry logic for transient failures

**Admin Panel UI ↔ Admin API**
- **Connection:** Fetch API with JWT token in httpOnly cookie
- **Pattern:** Client-side state management (React useState)
- **Error Handling:** Display Hebrew error messages, retry on network failure

**Project Viewer UI ↔ Public API**
- **Connection:** Fetch API with session token in httpOnly cookie
- **Pattern:** Session persistence across page refreshes
- **Error Handling:** Redirect to password prompt on session expiration

---

## Risks & Challenges

### Technical Risks

**Risk 1: File Upload Timeout for Large Files (50 MB)**
- **Impact:** HIGH - Users can't create projects if uploads timeout
- **Mitigation Strategy:**
  1. Increase Next.js API route timeout (default 10s → 60s)
  2. Implement chunked upload for files >10 MB
  3. Show progress bar to manage user expectations
  4. Add retry logic with exponential backoff

**Risk 2: Database Connection Pool Exhaustion**
- **Impact:** MEDIUM - API requests fail under load
- **Mitigation Strategy:**
  1. Configure Prisma connection pool size (default 10)
  2. Use PgBouncer for connection pooling (Vercel Postgres includes it)
  3. Implement connection timeout (30s max)
  4. Monitor connection count in production

**Risk 3: Session Token Leakage**
- **Impact:** HIGH - Unauthorized access to projects
- **Mitigation Strategy:**
  1. Use httpOnly cookies (not localStorage - XSS protection)
  2. Secure flag on cookies (HTTPS only)
  3. SameSite=Strict (CSRF protection)
  4. Short expiration (24 hours max)
  5. Token rotation on password change

**Risk 4: HTML Iframe Rendering Failures**
- **Impact:** MEDIUM - Students can't view reports
- **Mitigation Strategy:**
  1. Sandbox iframe (`sandbox="allow-scripts allow-same-origin"`)
  2. Test with actual Claude-generated HTML samples
  3. Fallback: "Open in new tab" button
  4. CSP headers allow inline scripts (Plotly requirement)

---

### Complexity Risks

**Risk 1: Authentication Implementation Bugs**
- **Likelihood:** HIGH - Complex logic with edge cases
- **Impact:** CRITICAL - Security vulnerabilities
- **Mitigation:**
  1. Unit test all authentication flows
  2. Integration tests for session expiration
  3. Security audit before production
  4. Consider sub-builder split (see "High Complexity Areas")

**Risk 2: Two-Phase Commit Rollback Failures**
- **Likelihood:** MEDIUM - Edge cases in error handling
- **Impact:** HIGH - Orphaned files or database records
- **Mitigation:**
  1. Comprehensive error handling with try/catch
  2. Transaction support in Prisma
  3. Cleanup job for orphaned files (cron)
  4. Manual rollback procedure documented

**Risk 3: Password Encryption Key Management**
- **Likelihood:** MEDIUM - Key rotation, backup/restore
- **Impact:** CRITICAL - Lost key = unrecoverable passwords
- **Mitigation:**
  1. Store encryption key in secure secret manager (Vercel env vars)
  2. Never commit key to git
  3. Backup key securely (offline, encrypted)
  4. Document key rotation procedure

---

## Recommendations for Planner

### Recommendation 1: Split Authentication into Two Sub-Builders

**Rationale:** Admin authentication and project authentication are sufficiently different in implementation (JWT vs session tokens, timeout logic, rate limiting patterns) that splitting them reduces cognitive load and allows parallel development.

**Builder Assignment:**
- **Sub-builder 1A (Admin Auth):**
  - `/api/admin/login` endpoint
  - JWT token generation
  - Admin authentication middleware
  - Rate limiting for login endpoint
  - httpOnly cookie handling
- **Sub-builder 1B (Project Auth):**
  - `/api/preview/:id/verify` endpoint
  - Session token generation and storage
  - Project authentication middleware
  - Rate limiting per project
  - Session expiration logic

**Integration Point:** Both share common middleware patterns, but logic is independent

---

### Recommendation 2: Use Prisma for Database Abstraction

**Rationale:** Prisma provides:
1. Type-safe database queries (prevents SQL injection by design)
2. Migration system (version-controlled schema)
3. Connection pooling (built-in)
4. Developer experience (auto-complete in IDE)

**Implementation:**
```bash
npx prisma init
npx prisma migrate dev --name init
npx prisma generate  # Generate TypeScript types
```

**Alternative (NOT recommended):** Raw SQL queries - higher risk, no type safety

---

### Recommendation 3: Implement Storage Abstraction Layer from Day 1

**Rationale:** Even if MVP uses local filesystem, design for S3 migration to avoid refactoring later

**Interface:**
```typescript
interface StorageProvider {
  upload(path: string, content: Buffer): Promise<void>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

class LocalStorageProvider implements StorageProvider {
  // Implementation using fs.promises
}

class S3StorageProvider implements StorageProvider {
  // Implementation using AWS SDK
}

// Dependency injection
const storage: StorageProvider = 
  process.env.STORAGE_TYPE === 's3' 
    ? new S3StorageProvider() 
    : new LocalStorageProvider();
```

**Benefit:** Swap storage providers without changing business logic

---

### Recommendation 4: Prioritize Security Testing

**Rationale:** Security bugs in authentication/file upload are CRITICAL - fixing them after launch is exponentially harder

**Test Checklist:**
- [ ] SQL injection attempts (Prisma should prevent, but verify)
- [ ] XSS attacks (test with malicious HTML in project names)
- [ ] CSRF attacks (verify token validation)
- [ ] Path traversal (test with `../../etc/passwd` in filenames)
- [ ] File upload bombs (test with 100 MB file, verify rejection)
- [ ] Brute force attacks (test rate limiting on login/password)
- [ ] Session hijacking (test token validation, expiration)
- [ ] HTTPS enforcement (test HTTP → HTTPS redirect)

**Tools:**
- OWASP ZAP (automated security scanner)
- Postman (manual API testing)
- curl (test raw HTTP requests)

---

### Recommendation 5: Document API with OpenAPI Spec

**Rationale:** Clear API documentation helps future integrators and serves as contract for builders

**Tool:** Use `@anatine/zod-openapi` to generate OpenAPI spec from Zod validation schemas

**Example:**
```typescript
import { z } from 'zod';
import { generateSchema } from '@anatine/zod-openapi';

const CreateProjectSchema = z.object({
  project_name: z.string().max(500),
  student_name: z.string().max(255),
  student_email: z.string().email(),
  research_topic: z.string(),
  password: z.string().min(8).optional()
});

const openApiSpec = generateSchema(CreateProjectSchema);
```

**Benefit:** Auto-generated docs, client SDK generation, API testing

---

### Recommendation 6: Use Environment-Based Configuration Validation

**Rationale:** Fail fast on startup if required environment variables are missing

**Implementation:**
```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().length(32),  // AES-256 requires 32 bytes
  STORAGE_PATH: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  MAX_FILE_SIZE_MB: z.string().transform(Number).default('50')
});

// Validate on startup
const env = EnvSchema.parse(process.env);

export default env;
```

**Benefit:** Catch configuration errors before deployment

---

## Resource Map

### Critical Files/Directories

**Next.js Project Structure (Recommended):**
```
/statviz
  /app                          # Next.js App Router
    /api                        # API routes
      /admin                    # Admin endpoints
        /login
          route.ts              # POST /api/admin/login
        /projects
          route.ts              # GET, POST /api/admin/projects
          /[id]
            route.ts            # DELETE /api/admin/projects/:id
      /preview                  # Public endpoints
        /[id]
          /verify
            route.ts            # POST /api/preview/:id/verify
          /html
            route.ts            # GET /api/preview/:id/html
          /download
            route.ts            # GET /api/preview/:id/download
          route.ts              # GET /api/preview/:id
    /admin                      # Admin panel UI (Iteration 2)
    /preview                    # Project viewer UI (Iteration 3)
      /[id]
        page.tsx
  /lib                          # Shared utilities
    /auth
      admin.ts                  # Admin authentication logic
      project.ts                # Project authentication logic
      middleware.ts             # Authentication middleware
    /db
      client.ts                 # Prisma client instance
      seed.ts                   # Database seed script
    /storage
      index.ts                  # Storage abstraction interface
      local.ts                  # Local filesystem implementation
      s3.ts                     # S3 implementation (future)
    /validation
      files.ts                  # File validation (MIME, size, HTML)
      schemas.ts                # Zod validation schemas
    /utils
      encryption.ts             # AES-256 encryption/decryption
      password.ts               # Password generation
      nanoid.ts                 # Project ID generation
  /prisma
    schema.prisma               # Database schema
    /migrations                 # Migration files
  /uploads                      # Local file storage (dev only)
  /public                       # Static assets
  /.env.example                 # Environment variable template
  /.env.local                   # Local environment variables (gitignored)
  /next.config.js               # Next.js configuration
  /tsconfig.json                # TypeScript configuration
  /package.json                 # Dependencies
```

---

### Key Dependencies

**Production Dependencies:**
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@prisma/client": "^5.0.0",
    "nanoid": "^5.0.0",
    "zod": "^3.22.0",
    "multer": "^1.4.5-lts.1",
    "node-html-parser": "^6.1.0",
    "winston": "^3.11.0",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.0",
    "tailwindcss": "^3.4.0",
    "tailwindcss-rtl": "^0.9.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/multer": "^1.4.11"
  }
}
```

**Why Each Dependency:**
- `next`: Framework for frontend + API routes
- `@prisma/client`: Type-safe database access
- `nanoid`: Short, URL-safe project IDs (12 chars)
- `zod`: Runtime type validation for API requests
- `multer`: Multipart form parsing for file uploads
- `node-html-parser`: HTML validation for external dependencies
- `winston`: Structured logging
- `helmet`: Security headers
- `express-rate-limit`: Rate limiting for login/password endpoints
- `tailwindcss`: Utility-first CSS framework
- `tailwindcss-rtl`: RTL support for Hebrew

---

### Testing Infrastructure

**Unit Testing: Jest + React Testing Library**
- **Purpose:** Test individual functions (auth, validation, encryption)
- **Example:**
  ```typescript
  describe('encryptPassword', () => {
    it('should encrypt and decrypt password correctly', () => {
      const password = 'MySecretPass123';
      const encrypted = encryptPassword(password);
      const decrypted = decryptPassword(encrypted);
      expect(decrypted).toBe(password);
    });
  });
  ```

**Integration Testing: Supertest**
- **Purpose:** Test API endpoints end-to-end
- **Example:**
  ```typescript
  describe('POST /api/admin/login', () => {
    it('should return JWT token on valid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: 'ahiya', password: 'correct_password' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });
  });
  ```

**Security Testing: OWASP ZAP**
- **Purpose:** Automated security vulnerability scanning
- **Setup:**
  ```bash
  docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000
  ```

**Manual Testing Checklist (Iteration 1):**
- [ ] Admin login with correct credentials → Success
- [ ] Admin login with wrong credentials → Error
- [ ] Admin login with 6 failed attempts → Rate limited
- [ ] Create project with valid files → Success
- [ ] Create project with 60 MB file → Error (file too large)
- [ ] Create project with .exe file → Error (invalid type)
- [ ] Project password verification (correct) → Session token
- [ ] Project password verification (wrong) → Error
- [ ] Session token expiration after 24 hours → Redirect to password
- [ ] HTML validation detects external CSS → Warning
- [ ] Database rollback on upload failure → No orphaned records

---

## Questions for Planner

### Question 1: Storage Strategy for Production

**Context:** MVP uses local filesystem, but production needs durable storage

**Options:**
- **Option A:** Migrate to AWS S3 before production launch
- **Option B:** Stay with local filesystem + daily backups to S3
- **Option C:** Use Vercel Blob Storage (built-in, zero config)

**Recommendation:** Option C (Vercel Blob) - simplest, integrated with Vercel hosting

**Question:** Does builder need to implement S3 abstraction in Iteration 1, or defer to future iteration?

---

### Question 2: Admin Account Seeding

**Context:** Admin login requires username/password, but how is first admin created?

**Options:**
- **Option A:** Hardcode in seed script (`prisma db seed`)
- **Option B:** Environment variable (`ADMIN_PASSWORD_HASH`)
- **Option C:** Setup wizard on first launch

**Recommendation:** Option B (environment variable) - most secure, no hardcoded secrets

**Question:** Should seed script create admin account, or assume it exists from env vars?

---

### Question 3: Password Recovery Mechanism

**Context:** If Ahiya forgets admin password, how does she recover?

**Options:**
- **Option A:** Manual database reset (requires DB access)
- **Option B:** Recovery email (requires email integration)
- **Option C:** Secondary recovery password (stored separately)

**Recommendation:** Option A (manual DB reset) - simplest for single admin

**Question:** Is manual recovery acceptable, or should builder implement automated recovery?

---

### Question 4: Project Password Reset by Admin

**Context:** Student forgets project password - can Ahiya reset it?

**Options:**
- **Option A:** Yes, admin can view/reset any project password (since encrypted, not hashed)
- **Option B:** No, passwords are hashed - must delete and recreate project

**Recommendation:** Option A - better UX, why we chose encryption over hashing

**Question:** Should builder implement "View Password" button in admin panel (Iteration 2)?

---

### Question 5: Session Cleanup Job

**Context:** Expired sessions accumulate in memory/database

**Options:**
- **Option A:** Cron job runs every hour, deletes expired sessions
- **Option B:** Lazy cleanup on session access (delete if expired)
- **Option C:** No cleanup (sessions auto-expire, memory freed by GC)

**Recommendation:** Option B (lazy cleanup) for in-memory, Option A (cron) for database

**Question:** Should builder implement cleanup job in Iteration 1, or defer?

---

### Question 6: File Deletion Strategy

**Context:** When admin deletes project, what happens to files?

**Options:**
- **Option A:** Hard delete immediately (permanent)
- **Option B:** Soft delete (mark as deleted, cleanup after 30 days)
- **Option C:** Move to trash folder, manual cleanup

**Recommendation:** Option B (soft delete) - safety net for accidental deletion

**Question:** Should builder implement soft delete in Iteration 1, or hard delete + manual restore?

---

### Question 7: Hebrew Error Messages in API

**Context:** Should API responses use Hebrew messages, or English?

**Options:**
- **Option A:** Hebrew only (align with student-facing UI)
- **Option B:** English only (standard for APIs)
- **Option C:** Both (send `message` in Hebrew, `message_en` in English)

**Recommendation:** Option C - supports future internationalization

**Question:** Which option aligns with project vision?

---

## Limitations

**MCP Availability:**
- **Playwright MCP:** NOT APPLICABLE (no E2E testing in Iteration 1 - backend only)
- **Chrome DevTools MCP:** NOT APPLICABLE (no frontend in Iteration 1)
- **Supabase Local MCP:** AVAILABLE - could validate database schema

**Database Validation Recommendation:**
If Supabase MCP is available, use it to:
1. Validate `projects` table schema correctness
2. Test CRUD operations (create, read, update, delete)
3. Verify indexes on `project_id`, `student_email`, `created_at`
4. Test foreign key constraints (if `admin_sessions` table added)
5. Validate password encryption/decryption roundtrip

**If MCP unavailable:** Manual testing with Postman + Prisma Studio

---

## Conclusion

Iteration 1 is a **HIGH-RISK, HIGH-COMPLEXITY** foundation that requires:
1. **Security-first architecture** (dual authentication, rate limiting, HTTPS)
2. **Atomic file operations** (two-phase commit, rollback)
3. **Robust database design** (Prisma ORM, migrations, password encryption)
4. **Scalable API patterns** (middleware, error handling, validation)

**Critical Success Factors:**
- Implement authentication correctly (consider sub-builder split)
- Design storage abstraction for future S3 migration
- Validate ALL inputs (Zod schemas)
- Test security thoroughly (OWASP ZAP, manual penetration testing)

**Builder Guidance:**
- Prioritize correctness over speed (security bugs are expensive)
- Write comprehensive tests (unit + integration)
- Document API endpoints (OpenAPI spec)
- Use TypeScript strictly (no `any` types)

**Estimated Timeline:** 20-25 hours (single builder) OR 15-18 hours (with sub-builder split)

---

**Report Status:** COMPLETE  
**Next Phase:** Planning (synthesize with Explorer 2 & 3 reports)  
**Delivery:** `/home/ahiya/Ahiya/2L/Prod/StatViz/.2L/plan-1/iteration-1/exploration/explorer-1-report.md`
