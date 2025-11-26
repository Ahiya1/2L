# Builder-3 API Reference

## Project Authentication & Access Endpoints

This document describes the API endpoints implemented by Builder-3 for student project access.

---

## Authentication Flow

1. **Student enters password** → POST `/api/preview/{id}/verify`
2. **System validates password** → Returns session token in httpOnly cookie
3. **Student accesses project** → GET `/api/preview/{id}` (requires token)
4. **Student views HTML** → GET `/api/preview/{id}/html` (requires token)
5. **Student downloads DOCX** → GET `/api/preview/{id}/download` (requires token)

Session tokens expire after 24 hours. Students must re-enter password after expiration.

---

## Endpoints

### 1. Verify Project Password

**Endpoint:** `POST /api/preview/{id}/verify`

**Description:** Validate project password and generate 24-hour session token.

**Authentication:** None (public endpoint)

**Rate Limiting:** 10 attempts per hour per project ID

**URL Parameters:**
- `id` (string, required) - Project ID (from project URL)

**Request Body:**
```json
{
  "password": "string (required, min 1 char)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Authentication successful"
  }
}
```

**Response Headers:**
```
Set-Cookie: project_token={JWT}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
```

**Side Effects:**
- Increments `viewCount` by 1
- Updates `lastAccessed` to current timestamp
- Creates session record in `project_sessions` table

**Error Responses:**

```json
// Wrong password or project not found (401 Unauthorized)
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "סיסמה שגויה. אנא נסה שוב."
  }
}

// Rate limit exceeded (429 Too Many Requests)
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "יותר מדי ניסיונות סיסמה. נסה שוב בעוד שעה."
  }
}

// Invalid request format (400 Bad Request)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request format",
    "details": [...]
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/preview/abc123xyz/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "studentpass"}' \
  -c cookies.txt
```

---

### 2. Get Project Data

**Endpoint:** `GET /api/preview/{id}`

**Description:** Retrieve project metadata (name, student info, research topic).

**Authentication:** Required - Valid project session token in cookie

**URL Parameters:**
- `id` (string, required) - Project ID

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "abc123xyz",
      "name": "מיכל דהרי - שחיקה",
      "student": {
        "name": "מיכל דהרי",
        "email": "michal@example.com"
      },
      "research_topic": "בדיקת שחיקה בקרב אחיות",
      "created_at": "2024-11-26T10:00:00.000Z",
      "view_count": 5,
      "last_accessed": "2024-11-26T15:30:00.000Z"
    }
  }
}
```

**Error Responses:**

```json
// No authentication token (401 Unauthorized)
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "סיסמה נדרשת"
  }
}

// Session expired or invalid (401 Unauthorized)
{
  "success": false,
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "הפגישה פגה תוקף. נא להזין סיסמה שוב."
  }
}

// Project not found or deleted (404 Not Found)
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "פרויקט לא נמצא"
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/preview/abc123xyz \
  -b cookies.txt
```

---

### 3. Get HTML Content

**Endpoint:** `GET /api/preview/{id}/html`

**Description:** Serve interactive HTML report for browser rendering.

**Authentication:** Required - Valid project session token in cookie

**URL Parameters:**
- `id` (string, required) - Project ID

**Success Response (200 OK):**
- Content-Type: `text/html; charset=utf-8`
- Body: HTML file content (raw bytes)
- Cache-Control: `private, max-age=3600` (1 hour cache)

**Error Responses:**
Same as "Get Project Data" endpoint above.

**Example:**
```bash
# View in browser
curl http://localhost:3000/api/preview/abc123xyz/html \
  -b cookies.txt \
  -o report.html
open report.html

# Or direct browser access (cookie sent automatically):
# http://localhost:3000/api/preview/abc123xyz/html
```

**Notes:**
- HTML files may contain embedded Plotly.js for interactive charts
- External dependencies (CDN links) may not load if user is offline
- Files are served as-is (no sanitization in Iteration 1)
- Iteration 3 will add sandboxed iframe rendering

---

### 4. Download DOCX File

**Endpoint:** `GET /api/preview/{id}/download`

**Description:** Download statistical findings document (DOCX format).

**Authentication:** Required - Valid project session token in cookie

**URL Parameters:**
- `id` (string, required) - Project ID

**Success Response (200 OK):**
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename="{sanitized_name}_findings.docx"`
- Body: DOCX file content (binary)
- Cache-Control: `private, max-age=3600` (1 hour cache)

**Filename Generation:**
- Project name sanitized (Hebrew allowed, special chars removed)
- Max 50 characters
- Suffix: `_findings.docx`
- Example: `מיכל_דהרי_שחיקה_findings.docx`

**Error Responses:**
Same as "Get Project Data" endpoint above.

**Example:**
```bash
curl http://localhost:3000/api/preview/abc123xyz/download \
  -b cookies.txt \
  -o findings.docx
```

**Notes:**
- Files up to 50 MB supported
- Large files may take 30-60 seconds to download
- Hebrew filenames may display incorrectly in some browsers (encoding issue)
- DOCX opens in Microsoft Word, LibreOffice, Google Docs

---

## Authentication Details

### Session Token

- **Type:** JWT (JSON Web Token)
- **Expiry:** 24 hours
- **Storage:** httpOnly cookie (prevents JavaScript access)
- **Validation:** Dual check (JWT signature + database session record)
- **Revocation:** Delete database session record (immediate effect)

**Token Payload:**
```json
{
  "type": "project",
  "projectId": "abc123xyz",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### Security Features

1. **httpOnly Cookie:** Prevents XSS token theft
2. **Secure Flag:** HTTPS-only in production
3. **SameSite=Strict:** CSRF protection
4. **Rate Limiting:** 10 password attempts per hour per project
5. **Database Validation:** Token can be revoked server-side
6. **Soft Delete Check:** Deleted projects inaccessible even with valid token

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PASSWORD` | 401 | Password incorrect or project not found/deleted |
| `AUTH_REQUIRED` | 401 | No session token provided |
| `SESSION_EXPIRED` | 401 | Token expired, invalid, or for wrong project |
| `PROJECT_NOT_FOUND` | 404 | Project doesn't exist or was deleted |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many password attempts (10/hour) |
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `INTERNAL_ERROR` | 500 | Server error (logged for debugging) |

---

## Hebrew Error Messages

All student-facing errors use Hebrew (RTL language):

- **Wrong password:** "סיסמה שגויה. אנא נסה שוב."
- **Auth required:** "סיסמה נדרשת"
- **Session expired:** "הפגישה פגה תוקף. נא להזין סיסמה שוב."
- **Project not found:** "פרויקט לא נמצא"
- **Rate limited:** "יותר מדי ניסיונות סיסמה. נסה שוב בעוד שעה."

---

## Integration Notes

### For Frontend Developers (Iteration 2-3)

1. **Password Form:**
   - POST to `/api/preview/{id}/verify` with password
   - On success (200), cookies are set automatically
   - On 401, show error message (from `error.message`)
   - On 429, disable form for 1 hour

2. **Project Page:**
   - GET `/api/preview/{id}` to fetch metadata
   - Display project name, student info, research topic
   - Show view count and last accessed (optional)

3. **HTML Viewer:**
   - Embed `/api/preview/{id}/html` in iframe
   - Or fetch and display in div (requires CORS handling)
   - Iteration 3 will use sandboxed iframe

4. **Download Button:**
   - Direct link: `<a href="/api/preview/{id}/download">Download DOCX</a>`
   - Or use fetch() and trigger browser download

### For Admin Panel (Iteration 2)

Admin endpoints (Builder-4) will provide:
- `GET /api/admin/projects` - List all projects
- `GET /api/admin/projects/{id}` - Get project with password hash
- `DELETE /api/admin/projects/{id}` - Soft delete project

---

## Database Schema Dependencies

Builder-3 depends on these tables (created by Builder-1):

### `projects` table
```sql
- projectId (String, unique) - Primary identifier
- projectName (String) - Project name (Hebrew)
- studentName (String) - Student name (Hebrew)
- studentEmail (String) - Student email
- researchTopic (Text) - Research topic (Hebrew)
- passwordHash (String) - bcrypt hash of password
- docxUrl (Text) - Path to DOCX file
- htmlUrl (Text) - Path to HTML file
- viewCount (Int) - Number of times password verified
- lastAccessed (DateTime) - Last password verification time
- deletedAt (DateTime?) - Soft delete timestamp
- createdAt (DateTime) - Creation timestamp
```

### `project_sessions` table
```sql
- id (Int, auto-increment)
- projectId (String, indexed) - Reference to project
- token (String, unique, indexed) - JWT token
- createdAt (DateTime) - Session creation time
- expiresAt (DateTime, indexed) - Session expiration time
```

---

## Postman Collection

Import this collection for testing:

```json
{
  "info": {
    "name": "StatViz - Project Authentication",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Verify Password",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/preview/{{project_id}}/verify",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"password\": \"{{project_password}}\"}"
        }
      }
    },
    {
      "name": "Get Project Data",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/preview/{{project_id}}"
      }
    },
    {
      "name": "Get HTML Content",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/preview/{{project_id}}/html"
      }
    },
    {
      "name": "Download DOCX",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/preview/{{project_id}}/download"
      }
    }
  ],
  "variable": [
    {"key": "base_url", "value": "http://localhost:3000"},
    {"key": "project_id", "value": "test-project-1"},
    {"key": "project_password", "value": "testpass123"}
  ]
}
```

---

## Performance Considerations

- **Password verification:** ~800ms (bcrypt with 10 rounds)
- **Project data retrieval:** ~50ms (indexed query)
- **HTML serving:** ~200ms for 5MB file
- **DOCX download:** ~30s for 50MB file (network-dependent)

**Optimization opportunities (future):**
- Redis cache for project metadata (reduce DB queries)
- CDN for file serving (reduce server load)
- Streaming download for large files (reduce memory usage)

---

**Builder-3 Implementation Status:** COMPLETE
**Dependencies:** Builder-1 (database, auth), Builder-2 (file storage)
**Integration Phase:** Ready for merge after dependency completion
