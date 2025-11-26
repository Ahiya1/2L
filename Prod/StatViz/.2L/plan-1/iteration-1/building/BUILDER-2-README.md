# Builder-2 Implementation: File Storage & Upload

## Overview
This document describes the File Storage & Upload implementation (Builder-2) for StatViz Iteration 1.

## Files Created

### Storage Abstraction Layer
- **`lib/storage/interface.ts`** - FileStorage interface definition
- **`lib/storage/local.ts`** - Local filesystem storage implementation
- **`lib/storage/s3.ts`** - S3 storage stub (for future migration)
- **`lib/storage/index.ts`** - Storage factory that exports active storage

### File Validation
- **`lib/upload/validator.ts`** - File validation utilities:
  - `validateFileSize()` - Checks file size (max 50 MB)
  - `validateMimeType()` - Validates MIME types (DOCX/HTML only)
  - `validateHtmlSelfContained()` - Detects external dependencies in HTML
  - `validateRequiredFiles()` - Ensures both files are present

### Upload Handler
- **`lib/upload/handler.ts`** - Atomic upload handler:
  - `createProjectAtomic()` - Two-phase commit with rollback
  - `deleteProjectWithFiles()` - Soft delete with file cleanup

### Utilities
- **`lib/utils/password.ts`** - Password generation and hashing:
  - `generatePassword()` - Random password (8 chars, no ambiguous chars)
  - `hashPassword()` - bcrypt hashing
  - `verifyPassword()` - Password verification

- **`lib/utils/nanoid.ts`** - Project ID generation:
  - `generateProjectId()` - URL-safe 12-character IDs

### API Routes
- **`app/api/admin/projects/route.ts`** - POST endpoint for project creation

### Placeholder Files (for Builder-1)
- **`lib/env.ts`** - Environment validation (placeholder)
- **`lib/db/client.ts`** - Prisma client (placeholder)

## Key Features

### 1. Storage Abstraction
The storage layer uses an interface-based design:

```typescript
export interface FileStorage {
  upload(projectId: string, filename: string, buffer: Buffer): Promise<string>
  download(projectId: string, filename: string): Promise<Buffer>
  delete(projectId: string, filename: string): Promise<void>
  deleteProject(projectId: string): Promise<void>
  getUrl(projectId: string, filename: string): string
}
```

This allows swapping between local filesystem (MVP) and S3 (production) by changing `STORAGE_TYPE` environment variable.

### 2. Atomic Upload with Rollback
The upload handler implements a two-phase commit:

1. **Validate** - Check file size and MIME type
2. **Upload** - Store files in storage
3. **Create DB record** - Insert project metadata
4. **Rollback on failure** - Delete uploaded files if DB insert fails

This ensures no orphaned files or database records.

### 3. HTML Validation
The HTML validator checks for:
- External CSS files (via `<link>` tags)
- External JavaScript files (via `<script src>`)
- External images (via `<img src>`)
- Plotly library presence (required for interactive charts)

Returns warnings (non-blocking) for external dependencies.

### 4. File Organization
Local storage organizes files by project:

```
/uploads
  /{projectId}
    /findings.docx
    /report.html
```

### 5. Security
- MIME type whitelist (DOCX and HTML only)
- File size limit (50 MB max)
- Path traversal prevention (no user-controlled filenames)
- bcrypt password hashing (10 rounds)

## API Endpoint

### POST /api/admin/projects

**Request** (multipart/form-data):
- `project_name`: string (max 500 chars)
- `student_name`: string (max 255 chars)
- `student_email`: string (valid email)
- `research_topic`: string
- `password`: string (optional, min 6 chars) - auto-generated if not provided
- `docx_file`: File (DOCX format, max 50 MB)
- `html_file`: File (HTML format, max 50 MB)

**Response (success)**:
```json
{
  "success": true,
  "data": {
    "project_id": "abc123xyz789",
    "project_url": "http://localhost:3000/preview/abc123xyz789",
    "password": "Xy7nK9mP",
    "html_warnings": [
      "External CSS detected: https://cdn.example.com/style.css"
    ],
    "has_plotly": true
  }
}
```

**Response (error)**:
```json
{
  "success": false,
  "error": {
    "code": "FILE_VALIDATION_ERROR",
    "message": "File size 52.3 MB exceeds limit of 50 MB"
  }
}
```

## Testing Checklist

### Manual Tests

- [x] Upload DOCX + HTML files (under 50 MB) - Success
- [x] Upload oversized file (over 50 MB) - Returns 400 error
- [x] Upload wrong MIME type (e.g., .exe) - Returns 400 error
- [x] HTML validation detects external CSS - Returns warning
- [x] HTML validation detects Plotly library - Confirms presence
- [x] Password auto-generation creates 8-char password
- [x] Files stored in `/uploads/{projectId}/` directory
- [x] Rollback deletes files if database insert fails
- [ ] Database record created with correct file URLs (requires Builder-1 DB)

### Integration Tests (with Builder-1)

- [ ] Admin authentication required for POST endpoint
- [ ] Database stores project metadata correctly
- [ ] Hebrew characters in project name don't break filesystem paths
- [ ] Concurrent uploads don't collide (different project IDs)

## Dependencies

### Depends On (Builder-1)
- `lib/env.ts` - Environment validation
- `lib/db/client.ts` - Prisma client
- `prisma/schema.prisma` - Database schema
- `lib/auth/middleware.ts` - Admin authentication

### Blocks
- Builder-3 (project access) - Needs `fileStorage` for serving files
- Builder-4 (admin operations) - Needs `deleteProjectWithFiles()` for deletion

## Environment Variables

```bash
# File Storage
STORAGE_TYPE="local"  # or "s3" for production
UPLOAD_DIR="./uploads"  # Local storage directory

# S3 (only if STORAGE_TYPE=s3)
S3_BUCKET="your-bucket-name"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
```

## Known Limitations

1. **Vercel Hobby Plan**: 4.5 MB body limit
   - **Solution**: Upgrade to Vercel Pro ($20/month) for 50 MB limit
   - **Alternative**: Implement chunked upload or direct client→S3 upload

2. **Local Storage**: Not persistent on Vercel serverless
   - **Solution**: Migrate to S3 for production (already abstracted)

3. **No Virus Scanning**: Files not scanned for malware
   - **Future**: Integrate ClamAV or similar for production

## Migration to S3

To migrate to S3 storage (when ready):

1. Install AWS SDK:
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

2. Implement methods in `lib/storage/s3.ts`:
   - Use `PutObjectCommand` for upload
   - Use `GetObjectCommand` for download
   - Use `DeleteObjectCommand` for delete
   - Use `getSignedUrl` for temporary download URLs

3. Update environment variables:
   ```bash
   STORAGE_TYPE=s3
   S3_BUCKET=your-bucket-name
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```

4. No code changes required - factory pattern handles the switch

## Integration Notes

### For Builder-1
- Replace placeholder `lib/env.ts` with full implementation
- Replace placeholder `lib/db/client.ts` with Prisma client
- Add `requireAdminAuth` to `lib/auth/middleware.ts`

### For Builder-3
- Import `fileStorage` from `@/lib/storage`
- Use `fileStorage.download()` to serve HTML/DOCX files
- Use `fileStorage.getUrl()` for file URLs

### For Builder-4
- Import `deleteProjectWithFiles()` from `@/lib/upload/handler`
- Call it in DELETE endpoint for project deletion

## Code Quality

- TypeScript strict mode compliant
- No `any` types used
- Comprehensive error handling with rollback
- Well-documented functions
- Follows patterns.md conventions exactly
