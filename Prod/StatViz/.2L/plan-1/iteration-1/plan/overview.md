# 2L Iteration Plan - StatViz Foundation & File Infrastructure

## Project Vision
StatViz is a secure, web-based platform delivering both traditional (DOCX) and interactive (HTML) statistical analysis reports to graduate students. Iteration 1 establishes the bulletproof backend foundation with database, file storage, authentication, and core APIs - the security-critical infrastructure that must be correct before any UI is built.

## Success Criteria
Specific, measurable criteria for MVP completion:
- [ ] Admin can authenticate via API endpoint (POST /api/admin/login returns JWT token)
- [ ] Project creation succeeds with DOCX + HTML files up to 50 MB
- [ ] Database stores and retrieves project metadata with Hebrew UTF-8 text
- [ ] Password hashing (bcrypt, 10 rounds) and verification works correctly
- [ ] Project password authentication generates 24-hour session tokens
- [ ] HTML validation detects external dependencies and returns warnings
- [ ] File storage abstraction layer supports local filesystem (S3-ready interface)
- [ ] All API endpoints return standardized JSON responses with proper status codes
- [ ] Rate limiting prevents brute force attacks (5 attempts/15 min on admin login, 10 attempts/hour on project password)
- [ ] Atomic file upload with transaction rollback on failure (no orphaned files or DB records)
- [ ] Security headers configured (HTTPS enforcement, XSS protection, CSP preparation)
- [ ] No SQL injection vulnerabilities (Prisma ORM parameterized queries)
- [ ] Environment variable validation prevents startup with missing configuration

## MVP Scope

**In Scope:**
- PostgreSQL database with Prisma ORM (projects, admin_sessions, project_sessions tables)
- Local filesystem storage with abstraction layer for S3 migration
- Admin authentication (JWT tokens, 30-min sessions)
- Project password authentication (session tokens, 24-hour duration)
- File upload handling (multipart form data, 50 MB limit)
- File validation (MIME type, size limits, HTML external dependency detection)
- Core API endpoints (6 total - admin login, project CRUD, password verification, file download)
- Security layer (HTTPS enforcement, rate limiting, input sanitization, CSRF protection)
- Environment configuration and validation
- Atomic operations with rollback (two-phase commit for file uploads)
- Password hashing (bcrypt) for admin and project passwords
- Error handling and structured JSON responses

**Out of Scope (Post-MVP):**
- Admin panel UI (Iteration 2)
- Project viewer UI (Iteration 3)
- Hebrew RTL frontend components (Iteration 2)
- Direct S3 implementation (abstraction only, migration post-MVP)
- Email notifications
- Multi-admin support
- Analytics/reporting dashboard
- Automated testing suite (manual testing only)
- Production deployment (development environment only)

## Development Phases
1. **Exploration** - Complete
2. **Planning** - Current
3. **Building** - 18-22 hours (4 parallel builders)
4. **Integration** - 2-3 hours
5. **Validation** - 3-4 hours
6. **Deployment** - N/A (local development only)

## Timeline Estimate
- Exploration: Complete
- Planning: Complete
- Building: 18-22 hours (parallel builders working independently)
- Integration: 2-3 hours (merge builder outputs, resolve conflicts)
- Validation: 3-4 hours (manual testing, security audit)
- Total: ~25-30 hours

## Risk Assessment

### High Risks

**Risk 1: Authentication Implementation Vulnerabilities**
- Impact: CRITICAL - Security compromise allows unauthorized access to all projects
- Mitigation:
  - Assign most experienced builder to authentication
  - Implement comprehensive unit and integration tests
  - Use industry-standard libraries (bcrypt, jsonwebtoken)
  - Security audit before integration
  - Rate limiting prevents brute force
  - Code review required

**Risk 2: File Upload Security (XSS, Malware, Path Traversal)**
- Impact: HIGH - Malicious files could compromise server or student browsers
- Mitigation:
  - Strict MIME type validation (whitelist only)
  - File size enforcement (50 MB hard limit)
  - HTML parsing for external dependencies (cheerio)
  - Storage isolation (project-based directories)
  - Path traversal prevention (no user-controlled filenames)
  - Sandboxed iframe rendering (Iteration 3)
  - Optional virus scanning (ClamAV) for production

**Risk 3: Database Schema Design Errors**
- Impact: HIGH - Schema changes after UI integration require complex migrations
- Mitigation:
  - Comprehensive schema design based on all 3 iterations
  - Prisma migration system (version-controlled)
  - Soft delete support (deleted_at field)
  - Index optimization for performance
  - Test with real Hebrew data early
  - Schema review before builder implementation

**Risk 4: File Storage Atomicity Failures**
- Impact: HIGH - Orphaned files or incomplete database records corrupt data integrity
- Mitigation:
  - Two-phase commit pattern (upload → validate → create DB → commit)
  - Comprehensive rollback in try-catch blocks
  - Transaction support via Prisma
  - Cleanup script for orphaned data
  - Integration tests for failure scenarios

**Risk 5: Serverless File Upload Size Limits**
- Impact: HIGH - Vercel Hobby plan has 4.5 MB limit, spec requires 50 MB
- Mitigation:
  - Use Vercel Pro plan ($20/month) for 50 MB limit OR
  - Implement chunked multipart upload OR
  - Use direct client → S3 upload (bypasses API route)
  - Document in setup guide

### Medium Risks

**Risk 6: Session Management Edge Cases**
- Impact: MEDIUM - Students locked out or sessions don't expire correctly
- Mitigation:
  - Dual validation (JWT expiry + database expiry check)
  - Graceful session timeout with redirect
  - Manual cleanup script for expired sessions
  - Test with expired tokens, deleted sessions
  - Document session behavior

**Risk 7: Hebrew Text Encoding Issues**
- Impact: MEDIUM - Garbled text in database or corrupted DOCX downloads
- Mitigation:
  - PostgreSQL UTF-8 encoding (explicit configuration)
  - Test with real Hebrew strings in seed data
  - Verify HTML meta charset in uploaded files
  - Hebrew-specific validation tests

**Risk 8: Database Connection Pool Exhaustion**
- Impact: MEDIUM - API requests fail under concurrent load
- Mitigation:
  - Configure Prisma connection pool (default 10, increase if needed)
  - Use PgBouncer (Vercel Postgres includes it)
  - Connection timeout (30s max)
  - Monitor connection count in production

### Low Risks

**Risk 9: Environment Variable Misconfiguration**
- Impact: LOW - App fails to start, caught immediately
- Mitigation:
  - Zod validation on startup
  - Detailed error messages for missing variables
  - .env.example template with all required variables
  - Setup documentation

## Integration Strategy

**Builder Coordination:**
- Builders work on isolated components with minimal dependencies
- Shared interfaces defined upfront (storage abstraction, auth middleware, error responses)
- Integration happens in two phases:
  1. **Phase 1 (Early):** Merge foundation files (env validation, database client, storage interface)
  2. **Phase 2 (Final):** Merge API routes, authentication logic, file upload handlers

**Shared Dependencies (Create First):**
- `lib/db.ts` - Prisma client singleton (Builder-1)
- `lib/env.ts` - Environment validation (Builder-1)
- `lib/storage/interface.ts` - Storage abstraction (Builder-2)
- `lib/utils/validation.ts` - Zod schemas (Builder-3)
- `prisma/schema.prisma` - Database schema (Builder-1)

**Integration Checkpoints:**
1. **Day 1:** All builders commit foundation files (env, db, storage interface, schemas)
2. **Day 2:** Integration test 1 - Verify all imports resolve, no circular dependencies
3. **Day 3:** Complete API routes, authentication, file handling
4. **Day 4:** Integration test 2 - End-to-end flows (create project, authenticate, download file)
5. **Day 5:** Security audit, manual testing, bug fixes

**Conflict Prevention:**
- Each builder owns specific directories (no overlap):
  - Builder-1: `lib/db/`, `lib/env.ts`, `prisma/`, `lib/auth/admin.ts`
  - Builder-2: `lib/storage/`, `lib/upload/`, API routes for file upload
  - Builder-3: `lib/auth/project.ts`, `lib/validation/`, API routes for project access
  - Builder-4: API routes for admin operations, rate limiting, security middleware
- Naming conventions enforced (see patterns.md)
- Import order standardized (external → internal → types)

**Merge Strategy:**
- Git feature branches for each builder (`builder-1-foundation`, `builder-2-storage`, etc.)
- Pull requests with checklist:
  - [ ] All tests pass
  - [ ] No console.log statements
  - [ ] TypeScript strict mode passes
  - [ ] Follows patterns.md conventions
  - [ ] Environment variables documented
- Integration branch: `iteration-1-integration`
- Final merge to `main` after validation

## Deployment Plan

**Iteration 1 Deployment: Local Development Only**
- No production deployment in Iteration 1
- Developers run locally with `npm run dev`
- PostgreSQL via Docker or local installation
- File storage in `./uploads` directory (gitignored)
- Test with Postman or curl for API endpoints

**Environment Setup:**
```bash
# 1. Clone repository
git clone <repo-url>
cd statviz

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Configure environment variables
# Edit .env.local with DATABASE_URL, JWT_SECRET, etc.

# 5. Initialize database
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed

# 6. Start development server
npm run dev

# 7. Test API endpoints
# POST http://localhost:3000/api/admin/login
# POST http://localhost:3000/api/admin/projects
# etc.
```

**Production Deployment (Iteration 3):**
- Vercel deployment with PostgreSQL (Vercel Postgres or Supabase)
- Migrate to AWS S3 for file storage
- HTTPS-only enforcement
- Environment variables in Vercel dashboard
- Database migrations via Vercel build process
- Israeli/European region selection for low latency

## Testing Strategy

**Manual Testing (Iteration 1):**
- Postman collection with all API endpoints
- Test cases for success and failure scenarios
- Hebrew text validation (UTF-8 encoding)
- File upload edge cases (oversized, wrong MIME type)
- Authentication flows (login, token expiry, rate limiting)
- Atomicity testing (rollback on failure)

**Security Testing:**
- OWASP ZAP automated vulnerability scan
- Manual penetration testing:
  - SQL injection attempts (Prisma should prevent)
  - XSS attacks (test with malicious HTML in project names)
  - Path traversal (test with `../../etc/passwd` in filenames)
  - CSRF attacks (verify future middleware works)
  - Brute force (verify rate limiting)
  - Session hijacking (test token validation)

**Automated Testing (Future):**
- Unit tests with Vitest (defer to post-MVP)
- Integration tests with Playwright (Iteration 2-3)
- Load testing with Artillery (production readiness)

## Key Decisions

**Architecture:**
- Next.js 14+ App Router (unified frontend/backend)
- PostgreSQL + Prisma ORM (type-safe, ACID compliant)
- Local filesystem → S3 abstraction (future-proof)
- JWT for admin auth, session tokens for project auth (dual pattern)

**Security:**
- bcrypt password hashing (10 rounds, industry standard)
- Rate limiting (in-memory Map for MVP, Redis for production)
- HTTPS-only in production (Vercel automatic SSL)
- httpOnly cookies for token storage (XSS protection)
- Content Security Policy headers (iframe embedding support)

**Data:**
- Soft delete for projects (deleted_at field, safety net)
- Password encryption (AES-256) NOT hashing (supports password recovery UX)
- Project IDs via nanoid (URL-safe, collision-resistant)
- Session storage in database (survives restarts, supports revocation)

**Development:**
- TypeScript strict mode (no `any` types)
- Prisma migrations (version-controlled schema)
- Environment validation on startup (Zod)
- Structured error responses (consistent JSON format)

## Next Steps

1. Planner creates builder-tasks.md with detailed task breakdown
2. Builders read all plan files before starting work
3. Builder-1 creates foundation (env, db, schema) - others wait for this
4. Builders work in parallel on isolated features
5. Integration phase merges all outputs
6. Validation phase tests end-to-end flows
7. Iteration 1 complete - ready for Iteration 2 (Admin Panel UI)

---

**Plan Status:** READY FOR BUILDING
**Risk Level:** HIGH (security-critical foundation)
**Estimated Completion:** 25-30 hours
**Critical Path:** Builder-1 foundation → Parallel building → Integration → Validation
