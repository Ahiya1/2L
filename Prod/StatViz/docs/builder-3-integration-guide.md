# Builder-3 Integration Guide

## Overview

This document describes how Builder-3's project authentication and access implementation integrates with other builders' work.

---

## Files Created by Builder-3

### Authentication Logic
- `lib/auth/project.ts` - Project password verification and token management
- `lib/auth/middleware.ts` - Authentication middleware (adds `requireProjectAuth` function)

### Validation
- `lib/validation/schemas.ts` - Zod schemas for API validation

### API Routes
- `app/api/preview/[id]/verify/route.ts` - Password verification endpoint
- `app/api/preview/[id]/route.ts` - Project data endpoint
- `app/api/preview/[id]/html/route.ts` - HTML content serving
- `app/api/preview/[id]/download/route.ts` - DOCX download endpoint

### Testing & Documentation
- `lib/auth/__tests__/project.test.md` - Manual testing guide
- `docs/builder-3-api-reference.md` - API endpoint documentation
- `docs/builder-3-integration-guide.md` - This file

### Placeholder Files (To be replaced by other builders)
- `lib/db/client.ts` - Prisma client (Builder-1)
- `lib/env.ts` - Environment validation (Builder-1)
- `lib/storage/index.ts` - File storage abstraction (Builder-2)
- `lib/security/rate-limiter.ts` - Rate limiting (Builder-1)
- `lib/auth/admin.ts` - Admin authentication (Builder-1)

---

## Dependencies

### Builder-1 (Foundation & Database)

**Critical Dependencies:**

1. **Database Schema** (`prisma/schema.prisma`)
   - `Project` model with all fields
   - `ProjectSession` model for session management
   - Indexes on `projectId`, `token`, `expiresAt`

2. **Prisma Client** (`lib/db/client.ts`)
   - Singleton pattern
   - Connection pooling configured
   - Query logging in development

3. **Environment Validation** (`lib/env.ts`)
   - `JWT_SECRET` validation (min 32 chars)
   - `DATABASE_URL` validation
   - `NODE_ENV` validation

4. **Rate Limiter** (`lib/security/rate-limiter.ts`)
   - `passwordRateLimiter` export (10 attempts/hour)
   - `checkRateLimit` function

5. **Admin Authentication** (`lib/auth/admin.ts`)
   - `verifyAdminToken` function (used by middleware)

**Integration Steps:**

1. Replace `lib/db/client.ts` with actual Prisma client
2. Replace `lib/env.ts` with actual environment validation
3. Replace `lib/security/rate-limiter.ts` with actual rate limiter
4. Replace `lib/auth/admin.ts` with actual admin auth
5. Verify all imports resolve correctly

**Merge Conflict: `lib/auth/middleware.ts`**
- Builder-1 creates `requireAdminAuth` function
- Builder-3 adds `requireProjectAuth` function
- **Resolution:** Merge both functions into same file
- **No conflict if:** Builder-1 creates file with both function stubs

---

### Builder-2 (File Storage & Upload)

**Critical Dependencies:**

1. **File Storage Interface** (`lib/storage/index.ts`)
   - `FileStorage` interface exported
   - `fileStorage` singleton exported
   - `download()` method implemented

2. **Storage Implementation** (`lib/storage/local.ts` or `lib/storage/s3.ts`)
   - `download(projectId, filename)` returns Buffer
   - Handles both `findings.docx` and `report.html`
   - Error handling for missing files

**Integration Steps:**

1. Replace `lib/storage/index.ts` with actual storage factory
2. Verify `fileStorage.download()` works with test projects
3. Test error handling (file not found, permission errors)

**Testing:**
```typescript
// Verify storage integration
const docx = await fileStorage.download('test-project-1', 'findings.docx')
const html = await fileStorage.download('test-project-1', 'report.html')
console.log('DOCX size:', docx.length, 'bytes')
console.log('HTML size:', html.length, 'bytes')
```

---

## Integration Checklist

### Pre-Integration (Builder-3 Responsibility)

- [x] All API routes created
- [x] Authentication logic implemented
- [x] Validation schemas defined
- [x] Middleware functions added
- [x] Documentation written
- [x] Placeholder files created for dependencies
- [x] Testing guide written

### Integration Phase 1 (With Builder-1)

- [ ] Replace `lib/db/client.ts` with actual implementation
- [ ] Replace `lib/env.ts` with actual implementation
- [ ] Replace `lib/security/rate-limiter.ts` with actual implementation
- [ ] Replace `lib/auth/admin.ts` with actual implementation
- [ ] Merge `lib/auth/middleware.ts` (combine both auth functions)
- [ ] Run `npm install` to install dependencies
- [ ] Run `npx prisma generate` to generate Prisma client
- [ ] Run `npx prisma migrate dev` to create database tables
- [ ] Run `npx prisma db seed` to create test data
- [ ] Verify environment variables in `.env.local`

### Integration Phase 2 (With Builder-2)

- [ ] Replace `lib/storage/index.ts` with actual implementation
- [ ] Upload test files to storage (DOCX + HTML)
- [ ] Verify `fileStorage.download()` works
- [ ] Test HTML and DOCX endpoints with real files

### Integration Phase 3 (Testing)

- [ ] Run manual tests from `lib/auth/__tests__/project.test.md`
- [ ] Test all 4 API endpoints with Postman
- [ ] Verify Hebrew text displays correctly
- [ ] Test rate limiting (11 failed attempts)
- [ ] Test session expiration (24 hour timeout)
- [ ] Test soft-deleted projects (inaccessible)
- [ ] Verify view count increments correctly
- [ ] Test concurrent sessions
- [ ] Test large file download (50 MB DOCX)

### Integration Phase 4 (Security Audit)

- [ ] Verify JWT tokens expire after 24 hours
- [ ] Verify httpOnly cookies prevent JavaScript access
- [ ] Test CSRF protection (SameSite=Strict)
- [ ] Test token reuse across different projects (should fail)
- [ ] Verify database sessions can be revoked
- [ ] Test rate limiting reset after 1 hour
- [ ] Verify soft-deleted projects return generic error (no info leak)

---

## Potential Integration Issues

### Issue 1: Prisma Client Not Generated

**Symptom:** Import error `@prisma/client` not found

**Solution:**
```bash
npx prisma generate
```

### Issue 2: Database Tables Not Created

**Symptom:** Prisma error "Table doesn't exist"

**Solution:**
```bash
npx prisma migrate dev --name init
```

### Issue 3: JWT_SECRET Missing

**Symptom:** Zod validation error on startup

**Solution:** Add to `.env.local`:
```bash
JWT_SECRET="your-32-character-secret-here"
```

Generate secure secret:
```bash
openssl rand -base64 32
```

### Issue 4: File Storage Not Configured

**Symptom:** Error "Not implemented - waiting for Builder-2"

**Solution:** Wait for Builder-2 to complete `lib/storage/` implementation

### Issue 5: Rate Limiter Import Error

**Symptom:** Import error `rate-limiter-flexible` not found

**Solution:**
```bash
npm install rate-limiter-flexible
```

### Issue 6: Hebrew Text Garbled

**Symptom:** Hebrew displays as ????????

**Solution:** Verify database UTF-8 encoding:
```sql
SHOW SERVER_ENCODING; -- Should be UTF8
```

And verify response headers include:
```
Content-Type: text/html; charset=utf-8
```

### Issue 7: Session Cookie Not Set

**Symptom:** Cookie missing in browser

**Solution:** Check response headers include:
```
Set-Cookie: project_token=...; HttpOnly; Secure; SameSite=Strict
```

In development, `Secure` flag may prevent cookie in HTTP (use HTTPS or disable flag in dev)

### Issue 8: File Download Timeout

**Symptom:** Large DOCX download times out

**Solution:** Increase Next.js timeout in `next.config.mjs`:
```javascript
export default {
  api: {
    responseLimit: false,
    bodyParser: false, // For file uploads
  },
}
```

---

## Shared Types

Builder-3 uses these types that other builders should be aware of:

### Project Type (from Prisma)
```typescript
type Project = {
  id: number
  projectId: string
  projectName: string
  studentName: string
  studentEmail: string
  researchTopic: string
  passwordHash: string
  docxUrl: string
  htmlUrl: string
  viewCount: number
  lastAccessed: Date | null
  deletedAt: Date | null
  createdAt: Date
  createdBy: string
}
```

### ProjectSession Type (from Prisma)
```typescript
type ProjectSession = {
  id: number
  projectId: string
  token: string
  createdAt: Date
  expiresAt: Date
}
```

### JWT Payload
```typescript
type ProjectTokenPayload = {
  type: 'project'
  projectId: string
  iat: number // Issued at
  exp: number // Expires at
}
```

---

## API Response Formats

All Builder-3 endpoints follow this format:

**Success:**
```typescript
{
  success: true,
  data: { ... }
}
```

**Error:**
```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: unknown
  }
}
```

This format should be consistent across all builders for frontend integration.

---

## Environment Variables Used

Builder-3 expects these environment variables (configured by Builder-1):

- `JWT_SECRET` - JWT signing key (min 32 chars)
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - 'development' | 'production' | 'test'

---

## Database Queries

Builder-3 performs these database operations:

### Password Verification
```typescript
// Find project and check soft delete
await prisma.project.findUnique({
  where: { projectId },
  select: { passwordHash: true, deletedAt: true }
})

// Create session
await prisma.projectSession.create({
  data: { projectId, token, expiresAt }
})

// Update view count and last accessed
await prisma.project.update({
  where: { projectId },
  data: {
    viewCount: { increment: 1 },
    lastAccessed: new Date()
  }
})
```

### Token Validation
```typescript
// Find session
await prisma.projectSession.findUnique({
  where: { token }
})

// Delete expired session
await prisma.projectSession.delete({
  where: { token }
})
```

### Project Data Retrieval
```typescript
// Fetch project metadata
await prisma.project.findUnique({
  where: { projectId },
  select: {
    projectId: true,
    projectName: true,
    studentName: true,
    studentEmail: true,
    researchTopic: true,
    createdAt: true,
    viewCount: true,
    lastAccessed: true
  }
})
```

**Performance Considerations:**
- All queries use indexed fields (`projectId`, `token`)
- Soft delete check (`deletedAt IS NULL`) included in all queries
- `viewCount` increment uses atomic operation (no race conditions)

---

## Testing Integration

After integration is complete, run these tests:

### 1. End-to-End Flow Test

```bash
# Step 1: Create test project (Builder-1/Builder-2)
# Assume project ID: test-proj-123
# Assume password: SecurePass2024

# Step 2: Verify password (Builder-3)
curl -X POST http://localhost:3000/api/preview/test-proj-123/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "SecurePass2024"}' \
  -c cookies.txt

# Step 3: Get project data (Builder-3)
curl http://localhost:3000/api/preview/test-proj-123 \
  -b cookies.txt | jq '.'

# Step 4: Get HTML content (Builder-3)
curl http://localhost:3000/api/preview/test-proj-123/html \
  -b cookies.txt -o report.html

# Step 5: Download DOCX (Builder-3)
curl http://localhost:3000/api/preview/test-proj-123/download \
  -b cookies.txt -o findings.docx

# Verify files
ls -lh report.html findings.docx
file report.html findings.docx
```

### 2. Database Integrity Test

```sql
-- Check session created
SELECT * FROM project_sessions WHERE projectId = 'test-proj-123';

-- Check view count incremented
SELECT viewCount, lastAccessed FROM projects WHERE projectId = 'test-proj-123';

-- Check session expiry
SELECT expiresAt > NOW() AS is_valid FROM project_sessions WHERE projectId = 'test-proj-123';
```

### 3. Security Test

```bash
# Test rate limiting
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/preview/test-proj-123/verify \
    -H "Content-Type: application/json" \
    -d '{"password": "WrongPassword"}' \
    -w "\nStatus: %{http_code}\n"
done
# Expect: First 10 return 401, 11th returns 429

# Test token isolation
curl -X POST http://localhost:3000/api/preview/test-proj-123/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "SecurePass2024"}' \
  -c cookies1.txt

curl http://localhost:3000/api/preview/different-project-456 \
  -b cookies1.txt
# Expect: 401 Unauthorized (token for wrong project)
```

---

## Deployment Considerations

### Vercel Deployment

Builder-3's endpoints work seamlessly on Vercel with these considerations:

1. **Environment Variables:** Set in Vercel dashboard
   - `JWT_SECRET`
   - `DATABASE_URL`
   - `NEXT_PUBLIC_BASE_URL`

2. **Database Connection:** Use Vercel Postgres or external PostgreSQL
   - Connection pooling required (PgBouncer)
   - Timeout set to 30 seconds

3. **File Storage:** Must use S3 (Vercel filesystem is ephemeral)
   - Builder-2 implements S3 storage
   - Set `STORAGE_TYPE=s3` in environment

4. **Rate Limiting:** In-memory rate limiter won't work in serverless
   - Future: Use Redis for persistent rate limiting
   - MVP: Accept limitation (rate limits reset per cold start)

---

## Future Enhancements (Post-MVP)

1. **Password Reset:** Allow students to request password reset via email
2. **Multi-Factor Authentication:** Optional 2FA for high-security projects
3. **Session Management UI:** Admin panel to view/revoke active sessions
4. **Download Analytics:** Track which students download DOCX files
5. **Expiring Links:** Generate time-limited download links (e.g., 7-day access)
6. **Access Logs:** Detailed logs of all project access (compliance)

---

## Contact & Support

**Builder-3 Questions:**
- Check this integration guide first
- Review API reference (`docs/builder-3-api-reference.md`)
- Check testing guide (`lib/auth/__tests__/project.test.md`)
- Ask in team chat for integration issues

**Builder-3 Responsibilities:**
- Project password authentication
- Session token management
- Project data API
- File download endpoints

**Not Builder-3's Responsibility:**
- Admin authentication (Builder-1)
- File upload (Builder-2)
- Project creation (Builder-2)
- Admin CRUD operations (Builder-4)

---

**Integration Status:** Ready for Builder-1 and Builder-2 completion
**Last Updated:** 2024-11-26
**Builder:** Builder-3
