# Builder Task Breakdown

## Overview
4 primary builders will work in parallel with minimal dependencies.
Estimated completion: 18-22 hours total (parallel execution).

## Builder Assignment Strategy
- Builders work on isolated features when possible
- Foundation builder (Builder-1) creates shared infrastructure first
- Dependencies noted explicitly with recommended wait times
- Complexity estimated to help builders decide on task management
- Code review required for security-critical components

---

## Builder-1: Foundation & Database

### Scope
Establish core infrastructure that all other builders depend on: database schema, Prisma client, environment validation, and admin authentication.

### Complexity Estimate
**MEDIUM-HIGH**

This is foundational work with HIGH criticality - all other builders depend on this. Authentication is security-critical.

### Success Criteria
- [ ] PostgreSQL database running locally or via Docker
- [ ] Prisma schema created with all three tables (projects, admin_sessions, project_sessions)
- [ ] Database migrations applied successfully
- [ ] Seed script creates Hebrew test data
- [ ] Environment validation catches missing variables on startup
- [ ] Admin login endpoint returns JWT token
- [ ] Admin authentication middleware validates tokens correctly
- [ ] Rate limiting prevents brute force on admin login (5 attempts/15 min)

### Files to Create

**Database & ORM:**
- `prisma/schema.prisma` - Database schema (projects, admin_sessions, project_sessions)
- `prisma/seed.ts` - Seed script with Hebrew test data
- `lib/db/client.ts` - Prisma client singleton

**Environment:**
- `.env.example` - Environment variable template
- `lib/env.ts` - Environment validation with Zod

**Authentication:**
- `lib/auth/admin.ts` - Admin login, token verification, token revocation
- `lib/auth/middleware.ts` - `requireAdminAuth` middleware function

**API Routes:**
- `app/api/admin/login/route.ts` - POST endpoint for admin login

**Security:**
- `lib/security/rate-limiter.ts` - Rate limiting utilities

**Utilities:**
- `lib/utils/errors.ts` - Custom error classes and error response helper

**Configuration:**
- `next.config.mjs` - Next.js configuration (update for file uploads)
- `tsconfig.json` - TypeScript strict mode configuration

### Dependencies
**Depends on:** None (first builder to start)
**Blocks:** All other builders (must complete foundation files first)

**Recommended Wait Points:**
- **After Day 1 (4-5 hours):** Complete `lib/env.ts`, `lib/db/client.ts`, `prisma/schema.prisma`
  - Other builders can then start importing these shared files
- **After Day 2 (8-10 hours):** Complete admin authentication
  - Builder-4 can start implementing API routes that need auth

### Implementation Notes

**Database Schema:**
- Use exact schema from `patterns.md` (Prisma Schema Convention section)
- Create indexes on `projectId`, `studentEmail`, `createdAt`, `token`
- Include soft delete support (`deletedAt` field)
- Set up connection pooling in `lib/db/client.ts`

**Environment Validation:**
- Use Zod schema from `patterns.md` (Environment Configuration Pattern section)
- Import in `app/layout.tsx` to validate on startup
- Clear error messages for missing variables

**Admin Authentication:**
- bcrypt with 10 rounds for password hashing
- JWT with 30-minute expiry
- Store sessions in database (dual validation: JWT + database check)
- httpOnly cookies for token storage

**Seed Data:**
- Create at least 2 test projects with Hebrew text:
  - Project 1: "מיכל דהרי - שחיקה" (burnout research)
  - Project 2: "יוסי כהן - חרדה" (anxiety research)
- Generate test DOCX/HTML files (simple placeholders for now)
- Hash test passwords with bcrypt
- Document passwords in seed output

**Rate Limiting:**
- In-memory `RateLimiterMemory` for MVP
- Admin login: 5 attempts / 15 minutes per IP
- Clear error messages in Hebrew for rate limit errors

### Patterns to Follow
Reference patterns from `patterns.md`:
- **Environment Configuration Pattern** - for `lib/env.ts`
- **Prisma Schema Convention** - for `prisma/schema.prisma`
- **Prisma Client Singleton** - for `lib/db/client.ts`
- **Admin Authentication** - for `lib/auth/admin.ts`
- **Authentication Middleware** - for `lib/auth/middleware.ts`
- **Standard API Route Structure** - for `app/api/admin/login/route.ts`
- **Rate Limiting** - for rate limiter implementation

### Testing Requirements
- **Manual Testing:**
  - [ ] Database migrations run without errors
  - [ ] Seed script creates projects with Hebrew text
  - [ ] Admin login with correct credentials returns JWT token
  - [ ] Admin login with wrong credentials returns 401 error
  - [ ] Admin login with 6 failed attempts returns 429 (rate limited)
  - [ ] Authentication middleware rejects invalid tokens
  - [ ] Authentication middleware accepts valid tokens
  - [ ] Environment validation throws error for missing JWT_SECRET

- **Security Testing:**
  - [ ] JWT tokens expire after 30 minutes
  - [ ] Database sessions are deleted when expired
  - [ ] httpOnly cookies prevent JavaScript access
  - [ ] Rate limiting resets after 15 minutes

### Estimated Time
**8-10 hours**

**Breakdown:**
- Database schema & Prisma setup: 2 hours
- Seed script with Hebrew data: 1 hour
- Environment validation: 1 hour
- Admin authentication logic: 2-3 hours
- Admin login API route: 1 hour
- Rate limiting: 1 hour
- Testing & debugging: 1-2 hours

---

## Builder-2: File Storage & Upload

### Scope
Implement file storage abstraction layer, file validation, and atomic file upload handler with rollback on failure.

### Complexity Estimate
**HIGH**

File upload atomicity is critical - must prevent orphaned files or database records. Storage abstraction required for future S3 migration.

### Success Criteria
- [ ] Storage interface defined (`FileStorage`)
- [ ] Local filesystem storage fully implemented
- [ ] S3 storage stubbed for future implementation
- [ ] Storage factory exports active storage based on `STORAGE_TYPE` env var
- [ ] File validation checks MIME type, size (50 MB limit)
- [ ] HTML validation detects external dependencies (CSS, JS, images)
- [ ] Atomic upload handler creates project with rollback on failure
- [ ] No orphaned files if database insert fails
- [ ] No database records if file upload fails

### Files to Create

**Storage Abstraction:**
- `lib/storage/interface.ts` - `FileStorage` interface definition
- `lib/storage/local.ts` - Local filesystem implementation
- `lib/storage/s3.ts` - S3 implementation stub (future)
- `lib/storage/index.ts` - Storage factory (exports `fileStorage`)

**File Validation:**
- `lib/upload/validator.ts` - MIME type, size, HTML validation functions
- `lib/upload/handler.ts` - Atomic upload handler with rollback

**Utilities:**
- `lib/utils/password.ts` - Password generation utility
- `lib/utils/nanoid.ts` - Project ID generation utility

**API Routes:**
- `app/api/admin/projects/route.ts` - POST endpoint for project creation (multipart upload)

### Dependencies
**Depends on:**
- Builder-1 foundation files (env, db client, Prisma schema)
- Wait for Builder-1 to complete `lib/env.ts`, `lib/db/client.ts`, `prisma/schema.prisma`

**Blocks:**
- Builder-3 and Builder-4 API routes that need file access

**Recommended Start:**
- After Builder-1 completes Day 1 work (4-5 hours into iteration)

### Implementation Notes

**Storage Abstraction Layer:**
- Follow exact interface from `patterns.md` (Storage Abstraction Interface section)
- Local storage organizes files: `/uploads/{projectId}/findings.docx` and `/uploads/{projectId}/report.html`
- S3 stub throws `Error('S3 storage not implemented yet')`
- Document S3 migration path in code comments

**File Validation:**
- MIME type whitelist: DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`) and HTML (`text/html`)
- Accept `application/octet-stream` for HTML (browser quirk)
- Size limit: 50 MB (configurable via env, but hardcoded for MVP)
- HTML validation uses `cheerio` to parse and detect external `<link>`, `<script src>`, `<img src>`
- Return warnings (non-blocking) for external dependencies

**Atomic Upload Handler:**
- Use exact pattern from `patterns.md` (Atomic Upload Handler section)
- Two-phase commit:
  1. Validate files (MIME, size)
  2. Upload to storage
  3. Create database record
  4. On failure: rollback uploaded files
- Use try-catch with comprehensive rollback in catch block
- Generate password if not provided (8 chars, no ambiguous chars)
- Hash password with bcrypt (10 rounds)

**Multipart Form Handling:**
- Use `multer` with `next-connect` for parsing
- Memory storage (buffer in RAM, max 50 MB)
- File filter rejects non-DOCX/HTML files early
- Extract files from `req.files` as `{ docx_file: [File], html_file: [File] }`

**Critical Gotchas:**
- Vercel Hobby plan has 4.5 MB body limit - requires Vercel Pro for 50 MB uploads
- Document this limitation in API route comments
- Consider chunked upload for future if Vercel Pro not viable

### Patterns to Follow
Reference patterns from `patterns.md`:
- **Storage Abstraction Interface** - for interface definition
- **Local Filesystem Storage** - for local implementation
- **S3 Storage (Stub)** - for future S3 implementation
- **Storage Factory** - for storage selection
- **File Validation** - for validation functions
- **Atomic Upload Handler** - for upload with rollback
- **Standard API Route Structure** - for POST /api/admin/projects

### Testing Requirements
- **Manual Testing:**
  - [ ] Upload DOCX + HTML files (under 50 MB) succeeds
  - [ ] Upload oversized file (over 50 MB) returns 400 error
  - [ ] Upload wrong MIME type (e.g., .exe) returns 400 error
  - [ ] HTML validation detects external CSS and returns warning
  - [ ] HTML validation detects Plotly library
  - [ ] Password auto-generation creates 8-char password
  - [ ] Files stored in `/uploads/{projectId}/` directory
  - [ ] Database record created with correct file URLs
  - [ ] Rollback deletes files if database insert fails (simulate by causing DB error)
  - [ ] Rollback prevents DB record if file upload fails (simulate by filling disk)

- **Edge Cases:**
  - [ ] Concurrent uploads don't collide (different project IDs via nanoid)
  - [ ] Hebrew characters in project name don't break filesystem paths
  - [ ] Very large HTML files (10 MB) parse correctly with cheerio

### Estimated Time
**6-8 hours**

**Breakdown:**
- Storage interface & local implementation: 2 hours
- S3 stub & factory: 1 hour
- File validation (MIME, size, HTML): 2 hours
- Atomic upload handler with rollback: 2-3 hours
- Multipart form parsing setup: 1 hour
- Testing & debugging: 2 hours

---

## Builder-3: Project Authentication & Access

### Scope
Implement project password verification, session management, and API endpoints for student access (password verification, project data, file downloads).

### Complexity Estimate
**MEDIUM**

Project authentication is simpler than admin auth (no rate limiting complexity), but session management and file serving require careful implementation.

### Success Criteria
- [ ] Password verification endpoint validates project passwords
- [ ] Session tokens generated with 24-hour expiry
- [ ] Session tokens stored in database
- [ ] Authentication middleware validates project tokens
- [ ] Project data endpoint returns metadata (name, student, topic)
- [ ] HTML content endpoint serves HTML file with proper headers
- [ ] DOCX download endpoint serves file with attachment headers
- [ ] View count increments on first password verification
- [ ] Last accessed timestamp updates on password verification

### Files to Create

**Authentication:**
- `lib/auth/project.ts` - Password verification, token generation, token validation

**Validation:**
- `lib/validation/schemas.ts` - Zod schemas for all API requests

**API Routes:**
- `app/api/preview/[id]/verify/route.ts` - POST endpoint for password verification
- `app/api/preview/[id]/route.ts` - GET endpoint for project data
- `app/api/preview/[id]/html/route.ts` - GET endpoint for HTML content
- `app/api/preview/[id]/download/route.ts` - GET endpoint for DOCX download

### Dependencies
**Depends on:**
- Builder-1 foundation files (env, db client, Prisma schema, auth middleware pattern)
- Builder-2 file storage (to serve HTML and DOCX files)

**Blocks:** None

**Recommended Start:**
- After Builder-1 completes foundation (Day 1-2)
- Can work in parallel with Builder-2 (just stub file storage calls initially)

### Implementation Notes

**Project Authentication:**
- Similar to admin auth but with project-specific logic
- Verify password against `passwordHash` in database
- Check for soft delete (`deletedAt IS NULL`)
- Generate JWT with 24-hour expiry (vs. 30 min for admin)
- Store session in `project_sessions` table
- Update `viewCount` and `lastAccessed` on successful verification

**Session Management:**
- JWT token in httpOnly cookie (`project_token`)
- Database session validates token hasn't been revoked
- Expired sessions deleted on verification attempt (cleanup)
- No auto-renewal (students must re-enter password after 24 hours)

**File Serving:**
- HTML endpoint:
  - Read file from storage (`fileStorage.download()`)
  - Set `Content-Type: text/html; charset=utf-8`
  - Return file buffer as response
- DOCX endpoint:
  - Read file from storage
  - Set `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Set `Content-Disposition: attachment; filename="findings_hebrew.docx"`
  - Return file buffer as response

**Rate Limiting:**
- Password verification: 10 attempts per hour per project_id
- Use `passwordRateLimiter` from `lib/security/rate-limiter.ts`
- Key by `projectId` (not IP) to prevent brute force on specific projects

**Hebrew Error Messages:**
- Password incorrect: "סיסמה שגויה. אנא נסה שוב."
- Session expired: "הפגישה פגה תוקף. נא להזין סיסמה שוב."
- Project not found: "פרויקט לא נמצא"
- Rate limited: "יותר מדי ניסיונות סיסמה. נסה שוב בעוד שעה."

### Patterns to Follow
Reference patterns from `patterns.md`:
- **Project Password Authentication** - for `lib/auth/project.ts`
- **Authentication Middleware** - for `requireProjectAuth` (add to `lib/auth/middleware.ts`)
- **Standard API Route Structure** - for all API routes
- **Zod Schema Definitions** - for validation schemas
- **Rate Limiting** - for password attempts

### Testing Requirements
- **Manual Testing:**
  - [ ] Password verification with correct password returns token
  - [ ] Password verification with wrong password returns 401 error
  - [ ] Password verification for non-existent project returns 404 error
  - [ ] Password verification for soft-deleted project returns 404 error
  - [ ] Session token validates correctly in subsequent requests
  - [ ] Expired token (after 24 hours) redirects to password prompt
  - [ ] View count increments only once per project (not on every request)
  - [ ] Last accessed timestamp updates on password verification
  - [ ] HTML content endpoint serves HTML file correctly
  - [ ] DOCX download endpoint triggers browser download
  - [ ] Rate limiting after 10 failed password attempts

- **Edge Cases:**
  - [ ] Concurrent password verifications create separate sessions
  - [ ] Hebrew characters in HTML file serve correctly (UTF-8)
  - [ ] Large DOCX files (50 MB) download without timeout

### Estimated Time
**5-6 hours**

**Breakdown:**
- Project authentication logic: 2 hours
- Validation schemas: 1 hour
- API routes (verify, project data, HTML, download): 2 hours
- Rate limiting integration: 30 minutes
- Testing & debugging: 1.5 hours

---

## Builder-4: Admin Operations & Security

### Scope
Implement admin API routes for listing and deleting projects, security middleware, and Next.js global middleware for security headers.

### Complexity Estimate
**MEDIUM**

Standard CRUD operations with security considerations. Must handle soft delete and file cleanup correctly.

### Success Criteria
- [ ] List projects endpoint returns all non-deleted projects
- [ ] List projects ordered by creation date (newest first)
- [ ] Delete project endpoint soft-deletes database record
- [ ] Delete project endpoint removes files from storage
- [ ] Get project details endpoint returns full project metadata
- [ ] Security headers middleware sets all required headers
- [ ] HTTPS redirect in production (middleware)
- [ ] All admin endpoints require authentication
- [ ] Error responses follow standardized format

### Files to Create

**API Routes:**
- `app/api/admin/projects/route.ts` - GET endpoint for listing projects (add to existing file from Builder-2)
- `app/api/admin/projects/[id]/route.ts` - GET (project details), DELETE (soft delete + file cleanup)

**Security:**
- `middleware.ts` - Next.js middleware for security headers and HTTPS redirect

**Documentation:**
- `README.md` - Setup instructions, API documentation, testing guide

### Dependencies
**Depends on:**
- Builder-1 foundation (auth middleware)
- Builder-2 file storage (for file deletion)

**Blocks:** None

**Recommended Start:**
- After Builder-1 completes admin auth (Day 2)
- Can work in parallel with Builder-2 and Builder-3

### Implementation Notes

**List Projects:**
- Query all projects with `deletedAt: null` (exclude soft-deleted)
- Order by `createdAt DESC` (newest first)
- Select fields: `projectId`, `projectName`, `studentName`, `studentEmail`, `createdAt`, `viewCount`, `lastAccessed`
- Return as JSON array in `data.projects`

**Get Project Details:**
- Fetch single project by `projectId`
- Check soft delete (`deletedAt IS NULL`)
- Return 404 if not found or deleted
- Return all fields (for admin to view/edit)

**Delete Project:**
- **Soft delete:** Set `deletedAt` to current timestamp
- **File cleanup:** Delete files from storage using `fileStorage.delete()`
- **Order:**
  1. Soft delete database record first
  2. Delete files second
  3. If file deletion fails, log error but don't rollback DB (files can be cleaned up manually)
- **Sessions:** Delete all project sessions for this project (students can't access anymore)

**Security Headers Middleware:**
- Use exact pattern from `patterns.md` (Security Headers Middleware section)
- Set headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`
- HTTPS redirect: Check `request.nextUrl.protocol === 'http:'` in production, redirect to HTTPS
- Matcher config: Exclude `_next/static`, `_next/image`, `favicon.ico`, `uploads`

**Error Handling:**
- Use `errorResponse` helper from `lib/utils/errors.ts`
- Structured error codes: `PROJECT_NOT_FOUND`, `INTERNAL_ERROR`, etc.
- Log all errors to console (production: use error monitoring)

**README Documentation:**
- Setup instructions (clone, install, env setup, database migration, seed, run)
- API endpoint documentation (all 9 endpoints with request/response examples)
- Testing guide (manual testing checklist)
- Environment variable reference

### Patterns to Follow
Reference patterns from `patterns.md`:
- **Standard API Route Structure** - for all API routes
- **Authentication Middleware** - for `requireAdminAuth`
- **Security Headers Middleware** - for `middleware.ts`
- **Error Response Helper** - for error handling
- **Database Transaction Pattern** - for delete operation (if needed)

### Testing Requirements
- **Manual Testing:**
  - [ ] List projects returns all non-deleted projects
  - [ ] List projects excludes soft-deleted projects
  - [ ] List projects ordered newest first
  - [ ] Get project details returns correct data
  - [ ] Get project details returns 404 for non-existent project
  - [ ] Get project details returns 404 for soft-deleted project
  - [ ] Delete project sets `deletedAt` timestamp
  - [ ] Delete project removes files from storage
  - [ ] Delete project removes project sessions
  - [ ] Security headers present in all responses
  - [ ] HTTP redirects to HTTPS in production mode

- **Edge Cases:**
  - [ ] Delete project with already-deleted files doesn't throw error
  - [ ] List projects handles empty database gracefully
  - [ ] Concurrent delete requests don't cause race condition

### Estimated Time
**4-5 hours**

**Breakdown:**
- List projects endpoint: 1 hour
- Get project details endpoint: 30 minutes
- Delete project endpoint with file cleanup: 1.5 hours
- Security headers middleware: 1 hour
- README documentation: 1 hour
- Testing & debugging: 1 hour

---

## Builder Execution Order

### Phase 1: Foundation (Day 1)
**Builder-1 ONLY**
- Create database schema, env validation, Prisma client
- Other builders WAIT for this to complete
- **Duration:** 4-5 hours
- **Deliverables:** `lib/env.ts`, `lib/db/client.ts`, `prisma/schema.prisma`, `.env.example`

### Phase 2: Parallel Development (Day 2-3)
**All builders work in parallel:**
- **Builder-1:** Continue with admin auth, rate limiting, login endpoint (4-5 hours)
- **Builder-2:** Storage abstraction, file validation, upload handler (6-8 hours)
- **Builder-3:** Project auth, password verification, file serving (5-6 hours)
- **Builder-4:** Admin CRUD operations, security middleware, documentation (4-5 hours)

**Duration:** 12-15 hours (parallel execution)

### Phase 3: Integration (Day 4)
**All builders together:**
- Merge all branches to `iteration-1-integration` branch
- Resolve conflicts (minimal due to isolated work)
- Run full integration tests
- Fix integration bugs

**Duration:** 2-3 hours

### Phase 4: Validation (Day 4-5)
**All builders together:**
- Complete manual testing checklist (all endpoints)
- Security audit (OWASP ZAP, manual penetration testing)
- Performance testing (50 MB file upload)
- Hebrew text validation (UTF-8 encoding)
- Fix validation bugs

**Duration:** 3-4 hours

---

## Integration Notes

### Shared Files (Create Once, Use Everywhere)

**Created by Builder-1 (others import):**
- `lib/env.ts` - Environment validation
- `lib/db/client.ts` - Prisma client singleton
- `prisma/schema.prisma` - Database schema
- `lib/auth/middleware.ts` - Auth middleware functions
- `lib/utils/errors.ts` - Error classes and helpers
- `lib/security/rate-limiter.ts` - Rate limiting utilities

**Created by Builder-2 (others import):**
- `lib/storage/index.ts` - File storage abstraction (exports `fileStorage`)
- `lib/utils/password.ts` - Password generation utility
- `lib/utils/nanoid.ts` - Project ID generation utility

**Created by Builder-3 (others import):**
- `lib/validation/schemas.ts` - Zod validation schemas

### Potential Conflicts

**Conflict 1: `lib/auth/middleware.ts`**
- **Cause:** Builder-1 creates `requireAdminAuth`, Builder-3 adds `requireProjectAuth`
- **Resolution:** Builder-3 adds function to existing file (no conflict if done carefully)
- **Prevention:** Builder-1 creates file with both function stubs, Builder-3 implements project auth

**Conflict 2: `app/api/admin/projects/route.ts`**
- **Cause:** Builder-2 creates POST endpoint, Builder-4 adds GET endpoint
- **Resolution:** Merge both HTTP methods in same file (Next.js allows multiple exports)
- **Prevention:** Builder-2 creates file with GET stub, Builder-4 implements it

**Conflict 3: `lib/security/rate-limiter.ts`**
- **Cause:** Builder-1 creates admin limiters, Builder-3 adds project limiters
- **Resolution:** Merge both limiters in same file
- **Prevention:** Builder-1 creates file with all limiter exports

### Integration Checklist

**Before Integration:**
- [ ] All builders push to feature branches
- [ ] Each builder completes testing checklist
- [ ] Each builder commits with descriptive messages
- [ ] No uncommitted changes

**During Integration:**
- [ ] Create `iteration-1-integration` branch
- [ ] Merge Builder-1 first (foundation)
- [ ] Merge Builder-2 second (storage)
- [ ] Merge Builder-3 third (project auth)
- [ ] Merge Builder-4 last (admin ops)
- [ ] Resolve conflicts (pair programming recommended)
- [ ] Run `npm run build` (TypeScript type checking)
- [ ] Run database migrations
- [ ] Run seed script
- [ ] Test all API endpoints with Postman

**After Integration:**
- [ ] Full manual testing (all endpoints)
- [ ] Security audit
- [ ] Performance testing
- [ ] Documentation review
- [ ] Merge to `main` branch

---

## Risk Mitigation

### Risk 1: Builder-1 Delays Block Everyone
**Mitigation:**
- Builder-1 prioritizes foundation files (Day 1)
- Other builders review patterns.md during wait time
- Builder-1 commits foundation files ASAP (don't wait for full completion)

### Risk 2: File Upload Timeout on Vercel Hobby
**Mitigation:**
- Document Vercel Pro requirement in README
- Test locally with 50 MB files first
- Consider chunked upload as fallback (future iteration)

### Risk 3: Database Connection Pool Exhaustion
**Mitigation:**
- Configure Prisma pool size in `lib/db/client.ts`
- Use PgBouncer (Vercel Postgres includes it)
- Monitor connection count during testing

### Risk 4: Hebrew Text Encoding Issues
**Mitigation:**
- Builder-1 creates seed data with Hebrew text (catches issues early)
- Test DOCX download with Hebrew filenames
- Verify HTML renders Hebrew correctly (UTF-8 meta tag)

### Risk 5: Integration Conflicts
**Mitigation:**
- Clear file ownership (see "Builder Assignment Strategy")
- Shared files created by Builder-1 first
- Use Git feature branches (easy to resolve conflicts)
- Pair programming during integration phase

---

## Success Metrics

**Iteration 1 is successful when:**
- [ ] All 9 API endpoints functional (tested with Postman)
- [ ] Admin can log in and create projects
- [ ] Students can access projects with passwords
- [ ] Files upload and download correctly (up to 50 MB)
- [ ] Database stores Hebrew text without corruption
- [ ] Security audit passes (no critical vulnerabilities)
- [ ] Rate limiting prevents brute force attacks
- [ ] Atomic upload prevents orphaned data
- [ ] All builders' code merged to main branch
- [ ] Documentation complete (README, API docs)

---

## Builder Resources

**Before You Start:**
1. Read `overview.md` - Understand iteration goals
2. Read `tech-stack.md` - Understand technology decisions
3. Read `patterns.md` - Study code patterns (CRITICAL - copy patterns exactly)
4. Read this file - Understand your task and dependencies
5. Clone repository, set up local environment
6. Review `.env.example`, create `.env.local` with your values

**During Development:**
- Follow patterns.md code examples (copy-paste and adapt)
- Use TypeScript strict mode (no `any` types)
- Log errors to console for debugging
- Commit frequently with descriptive messages
- Test your endpoints with Postman/curl
- Ask questions in team chat (don't assume)

**Before Integration:**
- Complete your testing checklist
- Review your code for security issues
- Update documentation (README, code comments)
- Push to your feature branch
- Notify team you're ready for integration

---

**Builder Tasks Status:** READY FOR EXECUTION
**Next Phase:** Building (4 builders in parallel)
**Estimated Completion:** 18-22 hours (parallel execution), 25-30 hours total with integration/validation
