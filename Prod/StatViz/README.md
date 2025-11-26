# StatViz - Statistical Reports Platform

Secure, web-based platform for delivering statistical analysis reports (DOCX + interactive HTML) to graduate students.

## Iteration 1: Foundation & Database

This iteration establishes the backend infrastructure:
- PostgreSQL database with Prisma ORM
- Admin authentication (JWT + bcrypt)
- Project password authentication
- File storage abstraction layer
- Core API endpoints
- Security layer (HTTPS, rate limiting, input validation)

## Setup Instructions

### Prerequisites
- Node.js 20+
- Supabase CLI (`brew install supabase/tap/supabase` or `npm install -g supabase`)
- npm or yarn

### Installation

1. Clone repository
```bash
git clone <repo-url>
cd statviz
```

2. Install dependencies
```bash
npm install
```

3. Start Supabase local development
```bash
supabase start
```

This will output connection details (DB on port 54322).

4. Configure environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local` with Supabase connection string:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

Generate JWT secret and admin password hash:
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate admin password hash (base64-encoded to avoid .env parsing issues)
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(hash => { console.log('Hash:', hash); console.log('Base64:', Buffer.from(hash).toString('base64')); })"
```

Copy the **Base64** value to `ADMIN_PASSWORD_HASH_BASE64` in your `.env.local` file.

**Why Base64 encoding?** Bcrypt hashes contain `$` characters (e.g., `$2a$10$...`) which can be misinterpreted as variable substitution in `.env` files, causing the hash to become truncated or corrupted. Base64 encoding eliminates this issue while maintaining security.

5. Initialize database
```bash
# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed test data
npm run db:seed
```

5. Start development server
```bash
npm run dev
```

Visit http://localhost:3000

## API Endpoints

### Admin Endpoints (Authentication Required)

#### POST /api/admin/login
Login as admin and receive JWT token.

**Request:**
```json
{
  "username": "ahiya",
  "password": "your-password"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "התחברת בהצלחה"
  }
}
```

Sets `admin_token` httpOnly cookie (30 min expiry).

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "שם משתמש או סיסמה שגויים"
  }
}
```

**Rate Limit:** 5 attempts per 15 minutes per IP

## Database Schema

### Projects Table
- `projectId` (unique): URL-safe identifier (nanoid)
- `projectName`: Project name (Hebrew supported)
- `studentName`: Student name
- `studentEmail`: Student email
- `researchTopic`: Research topic description
- `passwordHash`: bcrypt hash of project password
- `docxUrl`: Path to DOCX file
- `htmlUrl`: Path to HTML report
- `viewCount`: Number of times accessed
- `lastAccessed`: Last access timestamp
- `deletedAt`: Soft delete timestamp (NULL = active)

### AdminSession Table
- `token`: JWT token
- `expiresAt`: Expiration timestamp
- `ipAddress`: Client IP address

### ProjectSession Table
- `projectId`: Associated project
- `token`: JWT token
- `expiresAt`: Expiration timestamp (24 hours)

## Testing

### Manual Testing with curl

#### Admin Login
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ahiya","password":"your-password"}' \
  -c cookies.txt
```

#### Test Rate Limiting (6+ requests)
```bash
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"ahiya","password":"wrong"}'
  echo "\n"
done
```

Expected: 429 error on 6th request.

### Test Data

After running `npm run db:seed`, two test projects are created:

**Project 1:**
- Name: מיכל דהרי - שחיקה
- Email: michal.dahari@example.com
- Password: `test1234`

**Project 2:**
- Name: יוסי כהן - חרדה
- Email: yossi.cohen@example.com
- Password: `test5678`

## Security Features

- bcrypt password hashing (10 rounds)
- JWT token authentication
- httpOnly cookies (XSS protection)
- Rate limiting (brute force prevention)
- HTTPS enforcement (production)
- Security headers (CSP, X-Frame-Options, etc.)
- Input validation (Zod schemas)
- Soft delete (data recovery)
- Database session storage (immediate revocation)

## File Structure

```
statviz/
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── login/
│   │           └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── auth/
│   │   ├── admin.ts
│   │   └── middleware.ts
│   ├── db/
│   │   └── client.ts
│   ├── security/
│   │   └── rate-limiter.ts
│   ├── utils/
│   │   ├── errors.ts
│   │   ├── password.ts
│   │   └── nanoid.ts
│   ├── validation/
│   │   └── schemas.ts
│   └── env.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts
├── .env.example
├── package.json
└── README.md
```

## Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Cryptographically random string (min 32 chars)
- `ADMIN_USERNAME`: Admin username
- `ADMIN_PASSWORD_HASH_BASE64`: Base64-encoded bcrypt hash of admin password (see Setup Instructions)
- `NEXT_PUBLIC_BASE_URL`: Application base URL

### Optional
- `STORAGE_TYPE`: `local` (default) or `s3`
- `UPLOAD_DIR`: Local upload directory (default: `./uploads`)
- `NODE_ENV`: `development`, `production`, or `test`

### S3 (Optional)
- `S3_BUCKET`: AWS S3 bucket name
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region

## Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed test data
npm run db:reset     # Reset database (CAUTION: destroys all data)
```

## Next Steps (Iteration 2)

- Admin panel UI (React + Tailwind)
- Project creation form with file upload
- Project management (list, delete)
- Hebrew RTL layout
- File upload progress indicator

## License

Proprietary - All Rights Reserved
