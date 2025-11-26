# Builder-3 Integration Checklist

Quick reference for integrating Builder-3's work into the main codebase.

## Pre-Integration Verification

- [ ] Builder-1 has completed foundation work
- [ ] Builder-2 has completed file storage
- [ ] Database is running
- [ ] Environment variables configured

## File Replacements

### Replace These Placeholder Files:

1. **lib/db/client.ts**
   - Current: Placeholder with basic Prisma client
   - Replace with: Builder-1's actual implementation
   - Keep: Same interface (exports `prisma`)

2. **lib/env.ts**
   - Current: Placeholder with Zod schema
   - Replace with: Builder-1's actual implementation
   - Keep: Same exports (default export `env`)

3. **lib/security/rate-limiter.ts**
   - Current: Placeholder with rate limiter instances
   - Replace with: Builder-1's actual implementation
   - Keep: Exports `passwordRateLimiter`, `checkRateLimit`

4. **lib/auth/admin.ts**
   - Current: Placeholder with stub functions
   - Replace with: Builder-1's actual implementation
   - Keep: Export `verifyAdminToken`

5. **lib/storage/index.ts**
   - Current: Placeholder with interface
   - Replace with: Builder-2's actual implementation
   - Keep: Exports `fileStorage`, `FileStorage` interface

## Merge Conflicts

### lib/auth/middleware.ts

**Builder-1 adds:**
```typescript
export async function requireAdminAuth(request: NextRequest): Promise<NextResponse | null>
```

**Builder-3 adds:**
```typescript
export async function requireProjectAuth(request: NextRequest, projectId: string): Promise<NextResponse | null>
```

**Resolution:** Keep both functions in same file

**Final file should have:**
- Import `verifyAdminToken` from `@/lib/auth/admin`
- Import `verifyProjectToken` from `@/lib/auth/project`
- Export both `requireAdminAuth` and `requireProjectAuth`

## Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed test data
npx prisma db seed
```

## Environment Variables

Ensure `.env.local` contains:

```bash
# Required by Builder-3
DATABASE_URL="postgresql://..."
JWT_SECRET="<32+ character secret>"
NODE_ENV="development"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Optional (for file storage)
STORAGE_TYPE="local"
UPLOAD_DIR="./uploads"
```

## Dependencies to Install

```bash
npm install bcryptjs jsonwebtoken zod rate-limiter-flexible @prisma/client
npm install -D @types/bcryptjs @types/jsonwebtoken prisma
```

## Post-Integration Tests

### 1. Quick Smoke Test

```bash
# Start dev server
npm run dev

# Test password verification
curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "testpass123"}' \
  -c cookies.txt

# Test authenticated access
curl http://localhost:3000/api/preview/test-project-1 \
  -b cookies.txt
```

### 2. Full Test Suite

Run all tests from `lib/auth/__tests__/project.test.md`:
- [ ] Test 1: Password verification - success
- [ ] Test 2: Password verification - wrong password
- [ ] Test 3: Password verification - non-existent project
- [ ] Test 4: Password verification - soft-deleted project
- [ ] Test 5: Rate limiting (11 attempts)
- [ ] Test 6: Get project data - with valid session
- [ ] Test 7: Get project data - without session
- [ ] Test 8: Get project data - expired session
- [ ] Test 9: Get HTML content
- [ ] Test 10: Download DOCX
- [ ] Test 11: Download without session
- [ ] Test 12: Token security - wrong project
- [ ] Test 13: Concurrent sessions
- [ ] Test 14: View count increment

### 3. Security Checks

- [ ] JWT tokens expire after 24 hours
- [ ] httpOnly cookies set correctly
- [ ] Rate limiting works
- [ ] Soft-deleted projects inaccessible
- [ ] Cross-project access denied

## Verification Commands

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check Prisma client generated
ls -la node_modules/.prisma/client

# Check database tables
psql $DATABASE_URL -c "\dt"

# Check environment validation
node -e "require('./lib/env.ts')"
```

## Integration Order

1. ✅ Merge Builder-1 (foundation)
2. ✅ Merge Builder-2 (file storage)
3. ✅ Merge Builder-3 (this builder)
4. ✅ Replace placeholder files
5. ✅ Resolve middleware conflict
6. ✅ Install dependencies
7. ✅ Setup database
8. ✅ Run tests
9. ✅ Security audit

## Common Issues & Solutions

### Issue: Prisma client not found
```bash
npx prisma generate
```

### Issue: Database tables missing
```bash
npx prisma migrate dev
```

### Issue: JWT_SECRET validation error
```bash
# Generate secure secret
openssl rand -base64 32
# Add to .env.local
```

### Issue: Rate limiter not working
```bash
npm install rate-limiter-flexible
```

### Issue: File storage error
Wait for Builder-2 to complete implementation

### Issue: Hebrew text garbled
Check database encoding:
```sql
SHOW SERVER_ENCODING; -- Should be UTF8
```

## Files Modified by Builder-3

### New Files (Safe to merge)
- `lib/auth/project.ts`
- `lib/validation/schemas.ts`
- `app/api/preview/[id]/verify/route.ts`
- `app/api/preview/[id]/route.ts`
- `app/api/preview/[id]/html/route.ts`
- `app/api/preview/[id]/download/route.ts`

### Modified Files (Merge carefully)
- `lib/auth/middleware.ts` - Added `requireProjectAuth` function

### Placeholder Files (Replace)
- `lib/db/client.ts`
- `lib/env.ts`
- `lib/security/rate-limiter.ts`
- `lib/auth/admin.ts`
- `lib/storage/index.ts`

## Success Criteria

✅ All TypeScript files compile without errors
✅ All API endpoints return expected responses
✅ Database queries execute successfully
✅ Hebrew text displays correctly
✅ Rate limiting prevents brute force
✅ Session tokens work correctly
✅ File downloads work
✅ Security audit passes

## Documentation Reference

- **Full Report:** `.2L/plan-1/iteration-1/building/builder-3-report.md`
- **API Reference:** `docs/builder-3-api-reference.md`
- **Integration Guide:** `docs/builder-3-integration-guide.md`
- **Testing Guide:** `lib/auth/__tests__/project.test.md`
- **Flow Diagrams:** `docs/builder-3-flow-diagram.md`
- **Quick Summary:** `BUILDER-3-SUMMARY.md`

## Contact

Questions about Builder-3 integration? Check:
1. This checklist
2. Integration guide (`docs/builder-3-integration-guide.md`)
3. API reference (`docs/builder-3-api-reference.md`)
4. Team chat

---

**Integration Status:** Ready for merge
**Estimated Integration Time:** 30 minutes
**Blocking Issues:** None (all dependencies documented)
