# Project Authentication Testing Guide

## Manual Testing Checklist

This guide provides manual testing steps for Builder-3's project authentication implementation.

### Prerequisites

1. Database running with seed data (Builder-1's responsibility)
2. At least one test project with known password
3. Postman or curl for API testing

### Test Data

Assuming seed data includes:
- Project ID: `test-project-1`
- Password: `testpass123`
- Student: Michal Dahari

---

## Test 1: Password Verification - Success Case

**Endpoint:** `POST /api/preview/{id}/verify`

**Request:**
```bash
curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "testpass123"}' \
  -c cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Authentication successful"
  }
}
```

**Expected Behavior:**
- Status: 200 OK
- Set-Cookie header with `project_token` (httpOnly, secure in production)
- Database: `viewCount` incremented by 1
- Database: `lastAccessed` updated to current timestamp
- Database: New record in `project_sessions` table

**Validation:**
```sql
SELECT viewCount, lastAccessed FROM projects WHERE projectId = 'test-project-1';
SELECT * FROM project_sessions WHERE projectId = 'test-project-1';
```

---

## Test 2: Password Verification - Wrong Password

**Request:**
```bash
curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "wrongpassword"}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "סיסמה שגויה. אנא נסה שוב."
  }
}
```

**Expected Behavior:**
- Status: 401 Unauthorized
- No cookie set
- viewCount NOT incremented
- No session created

---

## Test 3: Password Verification - Non-existent Project

**Request:**
```bash
curl -X POST http://localhost:3000/api/preview/fake-project-id/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "testpass123"}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "סיסמה שגויה. אנא נסה שוב."
  }
}
```

**Expected Behavior:**
- Status: 401 Unauthorized
- Same error as wrong password (security: don't reveal project existence)

---

## Test 4: Password Verification - Soft-Deleted Project

**Setup:**
```sql
UPDATE projects SET deletedAt = NOW() WHERE projectId = 'test-project-1';
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "testpass123"}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "סיסמה שגויה. אנא נסה שוב."
  }
}
```

**Cleanup:**
```sql
UPDATE projects SET deletedAt = NULL WHERE projectId = 'test-project-1';
```

---

## Test 5: Rate Limiting

**Request:** Make 11 failed password attempts in quick succession

```bash
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
    -H "Content-Type: application/json" \
    -d '{"password": "wrongpass"}' \
    -w "\nAttempt $i: %{http_code}\n"
done
```

**Expected Behavior:**
- Attempts 1-10: Status 401, "סיסמה שגויה" message
- Attempt 11+: Status 429, Rate limit error

**Expected Response (11th attempt):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "יותר מדי ניסיונות סיסמה. נסה שוב בעוד שעה."
  }
}
```

**Wait Time:** Rate limit resets after 1 hour

---

## Test 6: Get Project Data - With Valid Session

**Request:**
```bash
curl http://localhost:3000/api/preview/test-project-1 \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "test-project-1",
      "name": "מיכל דהרי - שחיקה",
      "student": {
        "name": "מיכל דהרי",
        "email": "michal@example.com"
      },
      "research_topic": "בדיקת שחיקה בקרב אחיות",
      "created_at": "2024-11-26T...",
      "view_count": 1,
      "last_accessed": "2024-11-26T..."
    }
  }
}
```

**Expected Behavior:**
- Status: 200 OK
- Hebrew text displayed correctly (UTF-8 encoding)

---

## Test 7: Get Project Data - Without Session

**Request:**
```bash
curl http://localhost:3000/api/preview/test-project-1
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "סיסמה נדרשת"
  }
}
```

**Expected Behavior:**
- Status: 401 Unauthorized

---

## Test 8: Get Project Data - Expired Session

**Setup:** Manually set session expiration to past
```sql
UPDATE project_sessions
SET expiresAt = NOW() - INTERVAL '1 hour'
WHERE projectId = 'test-project-1';
```

**Request:**
```bash
curl http://localhost:3000/api/preview/test-project-1 \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "הפגישה פגה תוקף. נא להזין סיסמה שוב."
  }
}
```

**Expected Behavior:**
- Status: 401 Unauthorized
- Database: Expired session deleted from `project_sessions`

---

## Test 9: Get HTML Content - With Valid Session

**Request:**
```bash
curl http://localhost:3000/api/preview/test-project-1/html \
  -b cookies.txt \
  -o output.html
```

**Expected Behavior:**
- Status: 200 OK
- Content-Type: `text/html; charset=utf-8`
- File downloaded successfully
- HTML contains expected content (verify manually)
- Hebrew characters rendered correctly

---

## Test 10: Download DOCX - With Valid Session

**Request:**
```bash
curl http://localhost:3000/api/preview/test-project-1/download \
  -b cookies.txt \
  -o findings.docx
```

**Expected Behavior:**
- Status: 200 OK
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename="..."`
- File downloaded successfully
- DOCX opens in Word/LibreOffice without errors
- Hebrew text displays correctly

**Filename Format:**
- Should be: `{sanitized_project_name}_findings.docx`
- Example: `מיכל_דהרי_שחיקה_findings.docx`

---

## Test 11: Download DOCX - Without Session

**Request:**
```bash
curl http://localhost:3000/api/preview/test-project-1/download
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "סיסמה נדרשת"
  }
}
```

---

## Test 12: Token Security - Wrong Project ID

**Setup:** Get token for project A, try to access project B

```bash
# Get token for test-project-1
curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "testpass123"}' \
  -c cookies.txt

# Try to access test-project-2 with test-project-1's token
curl http://localhost:3000/api/preview/test-project-2 \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "הפגישה פגה תוקף. נא להזין סיסמה שוב."
  }
}
```

**Expected Behavior:**
- Status: 401 Unauthorized
- Token validation fails because projectId in JWT doesn't match requested project

---

## Test 13: Concurrent Sessions

**Test:** Multiple password verifications create separate sessions

```bash
# First verification
curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "testpass123"}' \
  -c cookies1.txt

# Second verification (different session)
curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "testpass123"}' \
  -c cookies2.txt
```

**Expected Behavior:**
- Both requests succeed
- Two different tokens generated
- Both tokens work independently
- Database has 2 session records for same project

**Validation:**
```sql
SELECT COUNT(*) FROM project_sessions WHERE projectId = 'test-project-1';
-- Should return 2
```

---

## Test 14: View Count Increment

**Test:** View count only increments on password verification, not on subsequent requests

```bash
# Verify password (should increment viewCount)
curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "testpass123"}' \
  -c cookies.txt

# Check viewCount
curl http://localhost:3000/api/preview/test-project-1 \
  -b cookies.txt | jq '.data.project.view_count'

# Access HTML (should NOT increment viewCount)
curl http://localhost:3000/api/preview/test-project-1/html \
  -b cookies.txt -o /dev/null

# Check viewCount again (should be same)
curl http://localhost:3000/api/preview/test-project-1 \
  -b cookies.txt | jq '.data.project.view_count'
```

**Expected Behavior:**
- viewCount increments only once (on password verification)
- Subsequent authenticated requests don't increment it

---

## Edge Cases

### EC1: Empty Password

```bash
curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
  -H "Content-Type: application/json" \
  -d '{"password": ""}'
```

**Expected:** 400 Bad Request (Zod validation error)

### EC2: Missing Password Field

```bash
curl -X POST http://localhost:3000/api/preview/test-project-1/verify \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** 400 Bad Request (Zod validation error)

### EC3: Hebrew Characters in HTML File

**Expected:** HTML endpoint serves Hebrew text correctly with UTF-8 encoding

### EC4: Large DOCX File (50 MB)

**Expected:** Download succeeds without timeout (may take 30-60 seconds)

---

## Integration Testing

After Builder-1 and Builder-2 complete their work:

1. **Full Flow Test:**
   - Admin creates project → Get project ID
   - Student verifies password → Gets session token
   - Student views HTML → Content loads
   - Student downloads DOCX → File downloads
   - Student accesses project data → Metadata displays

2. **Database Integrity:**
   - All Hebrew text stored/retrieved correctly
   - Timestamps in correct timezone
   - Soft-deleted projects inaccessible

3. **Security Audit:**
   - JWT tokens expire after 24 hours
   - httpOnly cookies prevent JavaScript access
   - Rate limiting works across API restarts
   - No SQL injection vulnerabilities

---

## Performance Benchmarks

- Password verification: < 1 second (bcrypt with 10 rounds)
- Project data retrieval: < 100ms
- HTML serving: < 500ms (10 MB file)
- DOCX download: < 60 seconds (50 MB file)

---

## Cleanup After Testing

```sql
-- Delete test sessions
DELETE FROM project_sessions WHERE projectId = 'test-project-1';

-- Reset view count
UPDATE projects SET viewCount = 0 WHERE projectId = 'test-project-1';

-- Remove rate limit data (in-memory, auto-clears on restart)
```
