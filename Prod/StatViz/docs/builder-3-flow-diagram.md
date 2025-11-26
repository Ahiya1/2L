# Builder-3 Authentication Flow Diagram

## Student Authentication Flow

```
┌─────────────┐
│   Student   │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Enter password on project page
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  POST /api/preview/{projectId}/verify                   │
│  Body: { "password": "student_password" }               │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 2. Rate limit check (10 attempts/hour)
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Rate Limiter (lib/security/rate-limiter.ts)            │
│  Key: projectId                                         │
│  Limit: 10 attempts per hour                            │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 3. If rate limit OK, validate password
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  verifyProjectPassword() - lib/auth/project.ts          │
│  - Fetch project from database                          │
│  - Check soft delete (deletedAt IS NULL)                │
│  - Compare password with bcrypt                         │
└──────┬──────────────────────────────────────────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼ Password OK     ▼ Password WRONG
┌─────────────┐    ┌──────────────┐
│  Generate   │    │  Return 401  │
│  JWT Token  │    │  "סיסמה      │
│  (24h exp)  │    │  שגויה"      │
└──────┬──────┘    └──────────────┘
       │
       │ 4. Store session in database
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Database: project_sessions                             │
│  INSERT { projectId, token, expiresAt }                 │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 5. Update project statistics
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Database: projects                                     │
│  UPDATE viewCount +1, lastAccessed = NOW()              │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 6. Return success with cookie
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Response: 200 OK                                       │
│  Set-Cookie: project_token=JWT; HttpOnly; Secure        │
│  Body: { success: true, data: { ... } }                 │
└──────┬──────────────────────────────────────────────────┘
       │
       │ Cookie stored in browser
       │
       ▼
   ┌────────┐
   │Student │
   │has     │
   │session │
   └────────┘
```

## Authenticated Request Flow

```
┌─────────────┐
│   Student   │
│  (Browser)  │
│  + Cookie   │
└──────┬──────┘
       │
       │ Request project data / HTML / DOCX
       │ Cookie: project_token=JWT
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  GET /api/preview/{projectId}                           │
│  OR /api/preview/{projectId}/html                       │
│  OR /api/preview/{projectId}/download                   │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 1. Extract token from cookie
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  verifyProjectToken() - lib/auth/project.ts             │
│  - Verify JWT signature                                 │
│  - Check expiration (24h)                               │
│  - Validate projectId matches                           │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 2. Check database session
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Database: project_sessions                             │
│  SELECT * WHERE token = JWT                             │
│  - Check exists                                         │
│  - Check expiresAt > NOW()                              │
└──────┬──────────────────────────────────────────────────┘
       │
       ├───────────────────┐
       │                   │
       ▼ Valid            ▼ Invalid/Expired
┌─────────────┐      ┌──────────────┐
│  Continue   │      │  Return 401  │
│  to API     │      │  "הפגישה     │
│  handler    │      │  פגה תוקף"   │
└──────┬──────┘      └──────┬───────┘
       │                    │
       │                    │ Delete expired session
       │                    │
       │                    ▼
       │             ┌─────────────┐
       │             │  DELETE     │
       │             │  session    │
       │             └─────────────┘
       │
       │ 3. Fetch data based on endpoint
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  API Handler Logic:                                     │
│                                                         │
│  /api/preview/{id}          → Fetch project metadata   │
│  /api/preview/{id}/html     → Download HTML from       │
│                                storage, serve with      │
│                                Content-Type: text/html  │
│  /api/preview/{id}/download → Download DOCX from       │
│                                storage, serve with      │
│                                Content-Disposition      │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 4. Return response
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Response: 200 OK                                       │
│  - Project data (JSON)                                  │
│  - HTML content (text/html)                             │
│  - DOCX file (binary)                                   │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
   ┌────────┐
   │Student │
   │views   │
   │content │
   └────────┘
```

## Session Lifecycle

```
┌───────────────────────────────────────────────────────────┐
│                    Session Created                        │
│  - Password verification successful                       │
│  - JWT generated (exp: 24h from now)                      │
│  - Database record created                                │
│  - Cookie set in browser                                  │
└───────────────────────┬───────────────────────────────────┘
                        │
                        │ Session valid for 24 hours
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Student     │ │  Student     │ │  Student     │
│  views HTML  │ │  downloads   │ │  gets        │
│              │ │  DOCX        │ │  metadata    │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                        │ Each request validates token
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Token still valid?           │
        │  - JWT not expired?           │
        │  - Session in database?       │
        │  - Session not expired?       │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │ YES           │               │ NO
        ▼               │               ▼
┌──────────────┐        │        ┌──────────────┐
│  Allow       │        │        │  Return 401  │
│  access      │        │        │  Delete      │
│              │        │        │  session     │
└──────────────┘        │        └──────────────┘
                        │
                        │ After 24 hours
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│                    Session Expired                        │
│  - JWT exp timestamp < NOW()                              │
│  - OR Database expiresAt < NOW()                          │
│  - Session deleted from database                          │
│  - Student must re-enter password                         │
└───────────────────────────────────────────────────────────┘
```

## Rate Limiting Flow

```
┌─────────────┐
│  Student    │
│  attempts   │
│  password   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Rate Limiter Check                                     │
│  Key: projectId (e.g., "abc123xyz")                     │
│  Window: 1 hour                                         │
│  Limit: 10 attempts                                     │
└──────┬──────────────────────────────────────────────────┘
       │
       ├───────────────────┐
       │                   │
       ▼ Attempts < 10    ▼ Attempts >= 10
┌─────────────┐      ┌──────────────┐
│  Increment  │      │  Return 429  │
│  counter    │      │  "יותר מדי   │
│  Allow      │      │  ניסיונות"   │
└──────┬──────┘      └──────────────┘
       │                    │
       │                    │ Student must wait 1 hour
       │                    │
       ▼                    ▼
┌─────────────┐      ┌──────────────┐
│  Continue   │      │  Counter     │
│  with       │      │  resets      │
│  password   │      │  after 1h    │
│  check      │      └──────────────┘
└─────────────┘

Counter Example:
  Attempt 1-10:  ✓ Allowed (even if password wrong)
  Attempt 11:    ✗ Rate limited (429 error)
  After 1 hour:  Counter resets to 0
```

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────┐
│  projects                                               │
├─────────────────────────────────────────────────────────┤
│  id (PK)              Int                               │
│  projectId (unique)   String   ←─────────┐              │
│  projectName          String            │              │
│  studentName          String            │              │
│  studentEmail         String            │              │
│  researchTopic        Text              │              │
│  passwordHash         String            │              │
│  docxUrl              String            │              │
│  htmlUrl              String            │              │
│  viewCount            Int               │              │
│  lastAccessed         DateTime?         │              │
│  deletedAt            DateTime?         │              │
│  createdAt            DateTime          │              │
└─────────────────────────────────────────┼──────────────┘
                                          │
                                          │ Foreign Key
                                          │
┌─────────────────────────────────────────┼──────────────┐
│  project_sessions                       │              │
├─────────────────────────────────────────┼──────────────┤
│  id (PK)              Int               │              │
│  projectId            String   ─────────┘              │
│  token (unique)       String                           │
│  createdAt            DateTime                         │
│  expiresAt            DateTime                         │
└─────────────────────────────────────────────────────────┘

Indexes:
  projects: projectId, studentEmail, createdAt
  project_sessions: token, projectId, expiresAt
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Rate Limiting                                 │
│  - 10 attempts per hour per project                     │
│  - Prevents brute force attacks                         │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Password Hashing                              │
│  - bcrypt with 10 rounds                                │
│  - One-way hash (cannot recover password)               │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 3: JWT Signature                                 │
│  - HMAC-SHA256 signature                                │
│  - Prevents token tampering                             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Database Session Validation                   │
│  - Dual check (JWT + database)                          │
│  - Allows immediate revocation                          │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 5: httpOnly Cookies                              │
│  - Prevents XSS token theft                             │
│  - SameSite=Strict (CSRF protection)                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 6: Project ID Binding                            │
│  - Token includes projectId                             │
│  - Prevents cross-project access                        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 7: Soft Delete Check                             │
│  - Deleted projects inaccessible                        │
│  - Generic error (no info leak)                         │
└─────────────────────────────────────────────────────────┘
```

## Error Flow

```
┌─────────────┐
│  Student    │
│  request    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  API Endpoint                                           │
└──────┬──────────────────────────────────────────────────┘
       │
       │ Error occurred?
       │
       ├────────────────────┐
       │                    │
       ▼ No Error          ▼ Error
┌─────────────┐      ┌──────────────────────────────────┐
│  Return     │      │  Identify error type:            │
│  200 OK     │      │  - Zod validation error → 400    │
│  with data  │      │  - Auth error → 401              │
└─────────────┘      │  - Not found → 404               │
                     │  - Rate limit → 429              │
                     │  - Other → 500                   │
                     └──────────┬───────────────────────┘
                                │
                                │ Log error (console.error)
                                │
                                ▼
                     ┌──────────────────────────────────┐
                     │  Return structured error:        │
                     │  {                               │
                     │    success: false,               │
                     │    error: {                      │
                     │      code: "ERROR_CODE",         │
                     │      message: "Hebrew message"   │
                     │    }                             │
                     │  }                               │
                     └──────────┬───────────────────────┘
                                │
                                ▼
                          ┌──────────┐
                          │ Student  │
                          │ sees     │
                          │ error    │
                          └──────────┘
```

---

**Key Takeaways:**

1. **Two-Stage Authentication:** Password verification → Session token
2. **Dual Validation:** JWT signature + database session record
3. **Rate Limiting:** Project-specific (not IP-based)
4. **Security Layers:** 7 independent security mechanisms
5. **Hebrew UX:** All student-facing errors in Hebrew
6. **Performance:** Indexed queries, cached responses
7. **Soft Deletes:** Deleted projects handled gracefully

**Flow Diagram Status:** COMPLETE
**Use Case:** Understanding Builder-3's authentication system
