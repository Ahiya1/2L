# Integration Plan - Round 1

**Created:** 2025-11-26T12:00:00Z
**Iteration:** plan-1/iteration-1
**Total builders to integrate:** 4

---

## Executive Summary

Integration of 4 complete builder outputs for StatViz backend foundation. All builders completed successfully with comprehensive implementations. The integration challenge is relatively low-risk due to good isolation between builders, but requires careful attention to shared files (middleware, validation schemas) and ensuring proper import resolution.

Key insights:
- Builder-1 created all foundation files that others depend on - no blocking issues
- Builder-2 created placeholder files that need to be replaced with Builder-1's implementations
- Builder-3 extends Builder-1's middleware file - requires careful merge
- Builder-4 adds GET endpoint to Builder-2's POST-only route file - straightforward merge
- All builders followed patterns.md conventions closely

---

## Builders to Integrate

### Primary Builders
- **Builder-1:** Foundation & Database - Status: COMPLETE
- **Builder-2:** File Storage & Upload - Status: COMPLETE
- **Builder-3:** Project Authentication & Access - Status: COMPLETE
- **Builder-4:** Admin Operations & Security - Status: COMPLETE

### Sub-Builders
None - all builders completed without splitting.

**Total outputs to integrate:** 4

---

## Integration Zones

### Zone 1: Foundation File Replacement

**Builders involved:** Builder-1, Builder-2, Builder-3

**Conflict type:** Placeholder replacements

**Risk level:** LOW

**Description:**
Builder-2 and Builder-3 created placeholder files for Builder-1's foundation files to allow their code to compile. These placeholders must be replaced with Builder-1's full implementations. The placeholders are clearly marked and simple to replace.

**Files affected:**
- `lib/db/client.ts` - Builder-1 has full Prisma client singleton, Builder-2 and Builder-3 have placeholders
- `lib/env.ts` - Builder-1 has full Zod validation, Builder-2 and Builder-3 have placeholders
- `lib/security/rate-limiter.ts` - Builder-1 has full implementation, Builder-3 has placeholder
- `lib/auth/admin.ts` - Builder-1 has full implementation, Builder-3 has placeholder

**Integration strategy:**
1. Keep Builder-1's implementations for all foundation files (they are complete and tested)
2. Delete placeholder files from Builder-2 and Builder-3 directories
3. Verify all imports in Builder-2 and Builder-3 code resolve to Builder-1's files
4. No code changes needed - placeholders were designed to match Builder-1's interfaces

**Expected outcome:**
All builders import from Builder-1's foundation files with no compilation errors. Environment validation works on startup, database client is shared correctly, rate limiting utilities are available.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW

---

### Zone 2: Authentication Middleware Extension

**Builders involved:** Builder-1, Builder-3

**Conflict type:** File modifications

**Risk level:** MEDIUM

**Description:**
Both Builder-1 and Builder-3 work on `lib/auth/middleware.ts`. Builder-1 creates `requireAdminAuth` function, Builder-3 adds `requireProjectAuth` function. These are separate functions that should coexist in the same file.

**Files affected:**
- `lib/auth/middleware.ts` - Builder-1 implements `requireAdminAuth`, Builder-3 adds `requireProjectAuth`

**Integration strategy:**
1. Start with Builder-1's version of `lib/auth/middleware.ts` (has `requireAdminAuth`)
2. Add Builder-3's `requireProjectAuth` function to the same file
3. Ensure both functions are exported
4. Verify imports in both builders' API routes resolve correctly
5. Check that both functions follow the same pattern (return `NextResponse | null`)

**Expected outcome:**
Single `lib/auth/middleware.ts` file with two exported functions:
- `requireAdminAuth(request: NextRequest): Promise<NextResponse | null>`
- `requireProjectAuth(request: NextRequest, projectId: string): Promise<NextResponse | null>`

Both functions coexist without conflict, follow same error response format, and work correctly in their respective API routes.

**Assigned to:** Integrator-1

**Estimated complexity:** MEDIUM

---

### Zone 3: Admin Projects Route Merge

**Builders involved:** Builder-2, Builder-4

**Conflict type:** File modifications

**Risk level:** LOW

**Description:**
Both Builder-2 and Builder-4 work on `app/api/admin/projects/route.ts`. Builder-2 implements POST endpoint (file upload), Builder-4 implements GET endpoint (list projects). Next.js allows multiple HTTP method exports in same route file.

**Files affected:**
- `app/api/admin/projects/route.ts` - Builder-2 has POST handler, Builder-4 has GET handler

**Integration strategy:**
1. Merge both HTTP methods into single file
2. Builder-2's POST function exports as `export async function POST(req: NextRequest)`
3. Builder-4's GET function exports as `export async function GET(req: NextRequest)`
4. Ensure both functions import all their dependencies correctly
5. Verify both use `requireAdminAuth` middleware
6. Check that both follow standard API route structure from patterns.md

**Expected outcome:**
Single route file with two exported functions (GET and POST), both protected by admin authentication, both returning structured JSON responses.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW

---

### Zone 4: Validation Schemas Consolidation

**Builders involved:** Builder-1, Builder-3

**Conflict type:** Shared type definitions

**Risk level:** LOW

**Description:**
Builder-1 and Builder-3 both create Zod validation schemas. Builder-1 creates `AdminLoginSchema` and `CreateProjectSchema`, Builder-3 creates `VerifyPasswordSchema` and potentially duplicates `CreateProjectSchema`. Need to consolidate into single source of truth.

**Files affected:**
- `lib/validation/schemas.ts` - Both builders define Zod schemas

**Integration strategy:**
1. Review all schemas from both builders
2. Create unified `lib/validation/schemas.ts` with all unique schemas:
   - `AdminLoginSchema` (from Builder-1)
   - `CreateProjectSchema` (from Builder-1 or Builder-3, verify they match)
   - `VerifyPasswordSchema` (from Builder-3)
3. Remove duplicate definitions
4. Verify all API routes import from consolidated file
5. Run TypeScript compiler to ensure no type errors

**Expected outcome:**
Single `lib/validation/schemas.ts` file with all Zod schemas, no duplicates, all API routes importing correctly.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW

---

### Zone 5: Shared Utilities Consolidation

**Builders involved:** Builder-1, Builder-2

**Conflict type:** Duplicate implementations

**Risk level:** LOW

**Description:**
Both Builder-1 and Builder-2 implement password utilities (`lib/utils/password.ts`) and potentially other utilities. Need to verify implementations match and consolidate.

**Files affected:**
- `lib/utils/password.ts` - Both builders implement password generation, hashing, verification
- `lib/utils/nanoid.ts` - Builder-2 implements project ID generation

**Integration strategy:**
1. Compare implementations of shared utilities between Builder-1 and Builder-2
2. If identical, keep one version (prefer Builder-1 as foundation builder)
3. If different, analyze differences and choose best implementation
4. Verify all builders import from unified location
5. Check that password generation excludes ambiguous characters (0, O, 1, l, I)
6. Verify bcrypt rounds = 10 in all implementations

**Expected outcome:**
Unified utility files with single implementation of each function, all builders importing correctly, consistent behavior across codebase.

**Assigned to:** Integrator-2

**Estimated complexity:** LOW

---

### Zone 6: Storage Integration Testing

**Builders involved:** Builder-2, Builder-3, Builder-4

**Conflict type:** Shared dependencies

**Risk level:** MEDIUM

**Description:**
Builder-3 and Builder-4 depend on Builder-2's file storage abstraction (`lib/storage/index.ts`) to serve and delete files. Need to ensure storage interface is correctly implemented and integrated.

**Files affected:**
- `lib/storage/interface.ts` - Storage interface definition (Builder-2)
- `lib/storage/local.ts` - Local filesystem implementation (Builder-2)
- `lib/storage/index.ts` - Storage factory export (Builder-2)
- `app/api/preview/[id]/html/route.ts` - Uses `fileStorage.download()` (Builder-3)
- `app/api/preview/[id]/download/route.ts` - Uses `fileStorage.download()` (Builder-3)
- `app/api/admin/projects/[id]/route.ts` - Uses `fileStorage.delete()` (Builder-4)

**Integration strategy:**
1. Verify Builder-2's storage interface matches what Builder-3 and Builder-4 expect
2. Check that `fileStorage` is properly exported from `lib/storage/index.ts`
3. Ensure all imports use `import { fileStorage } from '@/lib/storage'` (not direct imports)
4. Create `uploads/` directory in project root (gitignored)
5. Test file upload → file download → file delete flow end-to-end
6. Verify error handling when files don't exist

**Expected outcome:**
File storage abstraction works seamlessly across all builders. Files can be uploaded (Builder-2), downloaded (Builder-3), and deleted (Builder-4) without errors. Storage interface correctly abstracts local filesystem details.

**Assigned to:** Integrator-2

**Estimated complexity:** MEDIUM

---

### Zone 7: Database Schema & Migrations

**Builders involved:** Builder-1, Builder-2, Builder-3

**Conflict type:** Shared database schema

**Risk level:** LOW

**Description:**
All builders depend on Builder-1's database schema. Need to ensure schema is correctly defined, migrations run successfully, and all builders use correct table/column names.

**Files affected:**
- `prisma/schema.prisma` - Database schema (Builder-1)
- `prisma/migrations/` - Migration files (Builder-1)
- `prisma/seed.ts` - Seed script (Builder-1)

**Integration strategy:**
1. Use Builder-1's schema as source of truth
2. Run `npx prisma generate` to generate Prisma client
3. Run `npx prisma migrate dev` to apply migrations
4. Run `npx prisma db seed` to populate test data
5. Verify all table names match what builders expect:
   - `Project` (not `project` or `projects`)
   - `AdminSession` (not `admin_session`)
   - `ProjectSession` (not `project_session`)
6. Check indexes are created correctly
7. Verify soft delete works (queries filter `deletedAt: null`)

**Expected outcome:**
Database schema applied successfully, all tables created with correct indexes, seed data inserted, all builders can query database without errors.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW

---

### Zone 8: API Route Authentication

**Builders involved:** Builder-1, Builder-2, Builder-3, Builder-4

**Conflict type:** Shared authentication pattern

**Risk level:** MEDIUM

**Description:**
All builders implement API routes that require authentication. Need to ensure consistent authentication pattern across all routes, proper error responses, and httpOnly cookie handling.

**Files affected:**
- `app/api/admin/login/route.ts` - Admin login (Builder-1)
- `app/api/admin/projects/route.ts` - Admin project operations (Builder-2, Builder-4)
- `app/api/admin/projects/[id]/route.ts` - Admin project details/delete (Builder-4)
- `app/api/preview/[id]/verify/route.ts` - Project password verification (Builder-3)
- `app/api/preview/[id]/route.ts` - Project data (Builder-3)
- `app/api/preview/[id]/html/route.ts` - HTML serving (Builder-3)
- `app/api/preview/[id]/download/route.ts` - DOCX download (Builder-3)

**Integration strategy:**
1. Verify all admin routes use `requireAdminAuth(request)` at start of handler
2. Verify all project routes use `requireProjectAuth(request, projectId)` at start of handler
3. Check httpOnly cookie names are consistent:
   - Admin: `admin_token`
   - Project: `project_token`
4. Ensure error responses follow standard format from `lib/utils/errors.ts`
5. Verify Hebrew error messages in project routes
6. Test authentication flow: login → access protected route → logout/expire → access fails

**Expected outcome:**
Consistent authentication across all API routes, proper error responses, httpOnly cookies working correctly, Hebrew error messages displaying properly.

**Assigned to:** Integrator-2

**Estimated complexity:** MEDIUM

---

### Zone 9: Environment Configuration

**Builders involved:** Builder-1, Builder-2, Builder-3, Builder-4

**Conflict type:** Shared configuration

**Risk level:** LOW

**Description:**
All builders depend on environment variables. Need to ensure `.env.example` is complete, `.env.local` has all required variables, and startup validation works correctly.

**Files affected:**
- `.env.example` - Environment variable template (Builder-1)
- `.env.local` - Local environment (not in git, created by developers)
- `lib/env.ts` - Environment validation (Builder-1)
- `app/layout.tsx` - Imports env validation on startup (Builder-1)

**Integration strategy:**
1. Use Builder-1's `.env.example` as source of truth
2. Verify it includes all variables needed by all builders:
   - `DATABASE_URL` (required by all)
   - `JWT_SECRET` (required by Builder-1, Builder-3)
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (required by Builder-1)
   - `STORAGE_TYPE`, `UPLOAD_DIR` (required by Builder-2)
   - `NEXT_PUBLIC_BASE_URL` (required by Builder-2)
3. Create `.env.local` from template with actual values
4. Generate JWT secret: `openssl rand -base64 32`
5. Generate admin password hash: Use Builder-1's password hashing utility
6. Test startup validation by removing required variable

**Expected outcome:**
Complete `.env.example` template, working `.env.local` configuration, startup validation catches missing variables with clear error messages.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW

---

## Independent Features (Direct Merge)

These builder outputs have no conflicts and can be merged directly:

- **Builder-1:** Admin login API route, error utilities, rate limiting utilities
- **Builder-2:** File upload handler with rollback, file validation utilities
- **Builder-3:** Project password verification, file serving routes
- **Builder-4:** Security headers middleware, README documentation

**Assigned to:** Integrator-1 (quick merge alongside Zone work)

---

## Parallel Execution Groups

### Group 1 (Parallel)
- **Integrator-1:** Zone 1, Zone 2, Zone 3, Zone 4, Zone 7, Zone 9, Independent features
- **Integrator-2:** Zone 5, Zone 6, Zone 8

### Group 2 (Sequential - runs after Group 1)
No dependent zones - all work can be done in Group 1.

---

## Integration Order

**Recommended sequence:**

1. **Parallel execution of Group 1**
   - Integrator-1 handles foundation files, middleware merge, route merge, schema consolidation
   - Integrator-2 handles utilities consolidation, storage integration, authentication patterns
   - Wait for both to complete

2. **Final consistency check**
   - All integrators complete
   - Run `npm run build` to verify TypeScript compilation
   - Run database migrations
   - Test all API endpoints with Postman
   - Move to ivalidator

---

## Shared Resources Strategy

### Shared Types
**Issue:** Multiple builders defined overlapping types and schemas

**Resolution:**
- Consolidate all Zod schemas into `lib/validation/schemas.ts` (Zone 4)
- Keep Prisma-generated types as single source of truth (Zone 7)
- Remove duplicate type definitions

**Responsible:** Integrator-1 in Zone 4

### Shared Utilities
**Issue:** Duplicate utility implementations (password, nanoid)

**Resolution:**
- Compare implementations between Builder-1 and Builder-2
- Keep best implementation (or merge if different)
- Ensure all imports point to unified location

**Responsible:** Integrator-2 in Zone 5

### Configuration Files
**Issue:** Multiple builders referenced environment variables

**Resolution:**
- Use Builder-1's `.env.example` as master template
- Verify all variables needed by all builders are present
- Test environment validation on startup

**Responsible:** Integrator-1 in Zone 9

---

## Expected Challenges

### Challenge 1: Middleware File Merge
**Impact:** Both `requireAdminAuth` and `requireProjectAuth` must coexist correctly
**Mitigation:** Follow exact pattern from patterns.md for both functions, ensure consistent error response format
**Responsible:** Integrator-1

### Challenge 2: Storage Interface Compatibility
**Impact:** Builder-3 and Builder-4 must use storage exactly as Builder-2 implemented
**Mitigation:** Verify interface matches expectations, test file operations end-to-end
**Responsible:** Integrator-2

### Challenge 3: Database Connection Setup
**Impact:** PostgreSQL must be running before any testing
**Mitigation:** Document PostgreSQL setup in integration checklist, use Docker for consistency
**Responsible:** Integrator-1

### Challenge 4: Hebrew Text Encoding
**Impact:** UTF-8 encoding must work correctly for Hebrew text in database and files
**Mitigation:** Test with seed data that includes Hebrew text, verify DOCX download preserves Hebrew
**Responsible:** Integrator-2

---

## Success Criteria for This Integration Round

- [ ] All zones successfully resolved
- [ ] No duplicate code remaining
- [ ] All imports resolve correctly
- [ ] TypeScript compiles with no errors (`npm run build`)
- [ ] Consistent patterns across integrated code
- [ ] No conflicts in shared files
- [ ] All builder functionality preserved
- [ ] Database migrations run successfully
- [ ] Seed data creates test projects with Hebrew text
- [ ] All 9 API endpoints functional (tested with Postman/curl)
- [ ] Admin authentication works (login → access protected route)
- [ ] Project authentication works (verify password → access files)
- [ ] File upload → download → delete flow works end-to-end
- [ ] Rate limiting prevents brute force attacks
- [ ] Security headers present in all responses
- [ ] Hebrew error messages display correctly

---

## Notes for Integrators

**Important context:**
- All builders followed patterns.md closely - expect high code quality
- Builder-1's foundation work is comprehensive - trust it as source of truth
- Builder-2's placeholders are clearly marked - straightforward to replace
- Builder-3's middleware extension is well-documented in integration notes
- Builder-4's README is comprehensive - use it for testing checklist

**Watch out for:**
- Don't accidentally overwrite Builder-1's foundation files with placeholders
- Ensure both middleware functions (admin and project auth) are exported
- Verify storage interface matches what Builder-3/Builder-4 expect
- Test with Hebrew text early to catch encoding issues
- Run database migrations before testing API endpoints

**Patterns to maintain:**
- Reference `patterns.md` for all conventions
- Ensure error handling is consistent (use `errorResponse` helper)
- Keep naming conventions aligned (camelCase for functions, PascalCase for types)
- Maintain import order: External → Internal → Types → Relative
- Preserve httpOnly cookie pattern for security

---

## Next Steps

1. Spawn integrators according to parallel groups
2. Integrators execute their assigned zones
3. All integrators complete and create reports
4. Run full integration test suite
5. Proceed to ivalidator for validation phase

---

**Integration Planner:** 2l-iplanner
**Plan created:** 2025-11-26T12:00:00Z
**Round:** 1
**Total zones:** 9
**Parallel integrators:** 2
**Estimated integration time:** 2-3 hours
**Risk level:** LOW-MEDIUM (good isolation, clear dependencies)
