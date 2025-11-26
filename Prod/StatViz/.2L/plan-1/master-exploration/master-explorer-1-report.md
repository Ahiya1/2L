# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
StatViz is a secure web platform for delivering dual-format statistical analysis reports (DOCX + interactive HTML) to graduate students at Israeli academic institutions. The platform enables Ahiya (statistician/admin) to upload analysis files, generate password-protected shareable links, and provide students with interactive learning experiences alongside traditional thesis-ready documents.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 8 must-have features for MVP
- **User stories/acceptance criteria:** 54 acceptance criteria across 8 core features
- **Estimated total work:** 35-45 hours

**Feature breakdown:**
1. Admin Authentication (4 criteria)
2. Project Creation (7 criteria)
3. Project List/Admin Dashboard (4 criteria)
4. Password-Protected Access (5 criteria)
5. Project Viewer Page (6 criteria)
6. File Storage System (6 criteria)
7. Database for Metadata (2 criteria)
8. Self-Contained HTML Validation (4 criteria)

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **15+ distinct features** when accounting for sub-features (auth, file upload, storage, security, validation, RTL support)
- **Multi-layered architecture** requiring frontend (React/Next.js), backend (API routes), database (PostgreSQL), and file storage (S3 or filesystem)
- **Dual authentication patterns**: Admin JWT-based auth + per-project password sessions
- **File handling complexity**: Multi-part uploads, validation, virus scanning, signed URLs, size limits
- **Internationalization requirements**: Full Hebrew RTL support across UI, special considerations for Arabic script rendering
- **Security-critical application**: Password hashing, session management, HTTPS enforcement, rate limiting, secure file storage
- **HTML embedding challenges**: Self-contained validation, iframe security, Plotly compatibility
- **Zero existing codebase**: Greenfield project requiring full stack setup from scratch

---

## Architectural Analysis

### Major Components Identified

1. **Next.js Application Framework**
   - **Purpose:** Unified frontend/backend platform with API routes, server-side rendering, and static generation
   - **Complexity:** MEDIUM
   - **Why critical:** Provides both React UI and Node.js API in single deployment, simplifies hosting on Vercel, enables file-based routing

2. **Authentication & Authorization System**
   - **Purpose:** Dual-layer security (admin JWT + project password sessions)
   - **Complexity:** HIGH
   - **Why critical:** Protects admin panel and student data, requires careful implementation to avoid vulnerabilities
   - **Sub-components:**
     - Admin login with JWT tokens
     - Per-project password validation with bcrypt
     - Session management (Redis or in-memory cache)
     - Rate limiting middleware

3. **File Upload & Storage Infrastructure**
   - **Purpose:** Handle DOCX/HTML uploads, validate, store securely, serve with signed URLs
   - **Complexity:** HIGH
   - **Why critical:** Core workflow depends on reliable file handling, security risks from malicious uploads
   - **Sub-components:**
     - Multi-part form parser
     - File type validation (MIME + extension)
     - Size limit enforcement (50 MB)
     - Virus scanning (optional but recommended)
     - Storage backend (AWS S3 or local filesystem)
     - Signed URL generation for downloads

4. **PostgreSQL Database Layer**
   - **Purpose:** Store project metadata, admin credentials, access logs, analytics
   - **Complexity:** MEDIUM
   - **Why critical:** Single source of truth for project data, must handle concurrent access
   - **Schema:**
     - `projects` table (11 fields)
     - `sessions` table (token management)
     - `admin_users` table (future multi-admin)
     - Indexes on project_id, student_email, created_at

5. **Project Viewer with HTML Embedding**
   - **Purpose:** Display self-contained HTML reports in iframe, enable DOCX downloads
   - **Complexity:** MEDIUM
   - **Why critical:** Student-facing feature, must work flawlessly or entire platform fails
   - **Technical challenges:**
     - Iframe sandbox security
     - Plotly graph rendering
     - Hebrew RTL layout preservation
     - Mobile responsiveness
     - Self-contained validation (no external resources)

6. **Admin Dashboard UI**
   - **Purpose:** CRUD operations for projects, analytics viewing, bulk actions
   - **Complexity:** MEDIUM
   - **Why critical:** Ahiya's primary interface, must be intuitive and fast
   - **Features:**
     - Project list with search/filter
     - Create project modal with file uploads
     - Copy link/password buttons
     - Delete confirmation dialogs
     - View count tracking

7. **Hebrew RTL Support Layer**
   - **Purpose:** Full right-to-left layout, Hebrew text rendering, bidirectional text handling
   - **Complexity:** MEDIUM
   - **Why critical:** Target users are Israeli students and academics
   - **Implementation:**
     - Tailwind CSS RTL directives
     - HTML `dir="rtl"` attribute
     - Form input alignment
     - Date/time formatting (Israeli timezone)
     - Error messages in Hebrew

8. **Security Hardening Suite**
   - **Purpose:** Protect against common web vulnerabilities
   - **Complexity:** HIGH
   - **Why critical:** Handles sensitive student research data
   - **Components:**
     - HTTPS enforcement
     - CSRF protection
     - XSS prevention (Content Security Policy)
     - Directory traversal prevention
     - SQL injection prevention (parameterized queries)
     - Rate limiting (login, upload endpoints)
     - Password strength validation

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 phases)

**Rationale:** The project has clear architectural layers (backend foundation → admin features → student-facing features), distinct user flows, and sufficient complexity to warrant phased delivery. Breaking into 3 iterations allows for:
1. Early validation of core infrastructure
2. Incremental testing of file handling
3. Separate focus on admin vs student UX
4. Risk mitigation (security, storage, RTL support)

### Suggested Iteration Phases

**Iteration 1: Foundation & File Infrastructure**
- **Vision:** "Establish secure backend foundation with database, file storage, and admin authentication"
- **Scope:** Backend-heavy foundational work
  - PostgreSQL database setup with `projects` table
  - AWS S3 or local filesystem configuration
  - Admin authentication (login, JWT, sessions)
  - File upload API endpoint with validation
  - Password hashing utility (bcrypt)
  - Basic API error handling
  - Environment configuration (.env)

- **Why first:** No features can work without database, storage, and auth foundation
- **Estimated duration:** 12-15 hours
- **Risk level:** HIGH (critical foundation, must get security right)
- **Success criteria:**
  - Admin can log in via POST /api/admin/login
  - Files can be uploaded to storage
  - Database schema deployed and accessible
  - All secrets stored in environment variables
  - HTTPS enforced

**Iteration 2: Admin Panel & Project Creation**
- **Vision:** "Build admin interface for creating and managing projects"
- **Scope:** Admin-facing features
  - Admin dashboard UI (Next.js page)
  - Create project form with DOCX/HTML upload
  - Project list view with metadata
  - Copy link/password functionality
  - Delete project endpoint
  - Self-contained HTML validation
  - Success modal after creation
  - Hebrew RTL support for admin panel

- **Dependencies:** Requires Iteration 1
  - Imports: Database client, auth middleware, storage utilities
  - Uses: JWT tokens, file upload endpoints, projects table

- **Estimated duration:** 12-15 hours
- **Risk level:** MEDIUM (UI complexity, file upload UX)
- **Success criteria:**
  - Ahiya can create project in < 3 minutes
  - Files successfully uploaded and stored
  - Shareable link and password displayed
  - Project list shows all created projects
  - Delete removes files and DB record

**Iteration 3: Student Access & Project Viewer**
- **Vision:** "Enable password-protected student access to interactive reports"
- **Scope:** Student-facing features
  - Password prompt page (/preview/[id])
  - Password verification endpoint
  - Session token creation
  - Project viewer page with embedded HTML
  - DOCX download button with signed URLs
  - View count tracking
  - Mobile-responsive design
  - Hebrew error messages
  - Session timeout handling

- **Dependencies:** Requires Iterations 1 & 2
  - Imports: Auth utilities, database client, storage client
  - Uses: Projects table, session management, file retrieval

- **Estimated duration:** 10-12 hours
- **Risk level:** MEDIUM (HTML embedding, mobile support)
- **Success criteria:**
  - Student can access project with password
  - HTML report renders fully (Plotly graphs work)
  - DOCX downloads successfully
  - Session expires after inactivity
  - Works on mobile devices
  - > 95% success rate for password → report flow

---

## Dependency Graph

```
Foundation (Iteration 1)
├── PostgreSQL Database Setup
│   └── Schema: projects, sessions tables
├── File Storage Configuration
│   └── AWS S3 or local filesystem
├── Admin Authentication
│   ├── JWT token generation
│   └── Password hashing utilities
├── Environment Setup
│   └── .env with secrets
└── API Error Handling Middleware
    ↓
Admin Panel (Iteration 2)
├── Admin Dashboard UI (uses JWT from iter 1)
├── Create Project Form (uses storage from iter 1)
├── Project List (queries DB from iter 1)
├── File Upload Endpoint (uses validation from iter 1)
├── HTML Validation (checks self-contained)
└── Hebrew RTL Styling
    ↓
Student Access (Iteration 3)
├── Password Prompt Page (uses projects table from iter 1)
├── Session Management (extends auth from iter 1)
├── Project Viewer UI (retrieves files from iter 2)
├── HTML Embedding (validates HTML from iter 2)
├── Download Handler (uses signed URLs from iter 1)
└── Mobile Responsive Design
```

**Critical Path:**
Database → Auth → Storage → Admin Create → Student Access

---

## Risk Assessment

### High Risks

- **Risk: File Upload Security Vulnerabilities**
  - **Impact:** Malicious files could compromise server, student data leaked
  - **Mitigation:**
    - Implement strict MIME type validation
    - Add virus scanning (ClamAV or cloud service)
    - Use signed URLs with expiration
    - Store files in private S3 bucket (not public)
    - Sanitize filenames (prevent directory traversal)
  - **Recommendation:** Address in Iteration 1, test thoroughly before Iteration 2

- **Risk: Self-Contained HTML Validation Failures**
  - **Impact:** HTML reports with external dependencies break offline, poor UX
  - **Mitigation:**
    - Parse HTML for `<link>`, `<script src>`, `<img src>` tags
    - Warn admin if external resources detected
    - Test rendering in sandboxed iframe
    - Provide fallback message if rendering fails
  - **Recommendation:** Build validation in Iteration 2, test with real Claude-generated HTML

- **Risk: Session Management Vulnerabilities**
  - **Impact:** Session hijacking, unauthorized project access
  - **Mitigation:**
    - Use httpOnly cookies for session tokens
    - Implement CSRF protection
    - Set short expiration times (30 minutes)
    - Regenerate tokens on password change
    - Log all access attempts
  - **Recommendation:** Implement properly in Iteration 1, audit in Iteration 3

### Medium Risks

- **Risk: Database Connection Pool Exhaustion**
  - **Impact:** Platform becomes unavailable under moderate load
  - **Mitigation:** Configure proper connection pooling (pg-pool), implement connection timeout, add monitoring

- **Risk: Hebrew RTL Layout Bugs**
  - **Impact:** Poor UX for primary users, text alignment issues
  - **Mitigation:** Test with real Hebrew text, use Tailwind RTL plugin, QA on multiple browsers

- **Risk: Large File Upload Timeouts**
  - **Impact:** Uploads fail for reports near 50 MB limit
  - **Mitigation:** Increase timeout limits, show upload progress, implement resumable uploads (future)

### Low Risks

- **Risk: Browser Compatibility Issues**
  - **Impact:** Some students can't access reports on older browsers
  - **Mitigation:** Display browser compatibility warning, target modern browsers only (Chrome 90+)

- **Risk: Mobile Plotly Rendering Performance**
  - **Impact:** Slow graph rendering on mobile devices
  - **Mitigation:** Recommend desktop for full experience, optimize Plotly config

---

## Integration Considerations

### Cross-Phase Integration Points

- **File Storage Abstraction Layer**
  - **What:** Interface for upload/download/delete operations
  - **Why spans iterations:** Used in Iteration 1 (setup), Iteration 2 (admin upload), Iteration 3 (student download)
  - **Recommendation:** Design abstract interface in Iteration 1 to support multiple backends (S3, local, future: GCS)

- **Password Hashing Utility**
  - **What:** Bcrypt-based password hashing and verification
  - **Why spans iterations:** Admin auth (Iteration 1), project passwords (Iteration 2), verification (Iteration 3)
  - **Recommendation:** Create reusable utility function, test thoroughly

- **Hebrew Localization Strings**
  - **What:** Centralized error messages and UI text in Hebrew
  - **Why spans iterations:** Admin panel (Iteration 2), student-facing pages (Iteration 3)
  - **Recommendation:** Create `lib/i18n.ts` with all Hebrew strings

### Potential Integration Challenges

- **Challenge: Admin Creates Project → Student Accesses (Cross-Iteration Flow)**
  - **Description:** Project creation in Iteration 2 must produce data that Iteration 3 can consume
  - **Why it matters:** If schema changes between iterations, backward compatibility issues
  - **Solution:** Finalize database schema in Iteration 1, avoid schema migrations between iterations

- **Challenge: File Storage URLs Between Iterations**
  - **Description:** URLs generated in Iteration 2 must remain valid in Iteration 3
  - **Why it matters:** Hardcoded URL patterns could break
  - **Solution:** Use consistent URL generation function, test with Iteration 2 data in Iteration 3

---

## Recommendations for Master Plan

1. **Start with Iteration 1 Foundation**
   - Get database, storage, and auth working perfectly before building features
   - This is the riskiest phase (security-critical), allocate extra QA time
   - Consider security audit after Iteration 1 before proceeding

2. **Treat Iterations 2 & 3 as Parallel-Capable After Iteration 1**
   - Admin panel (Iteration 2) and student viewer (Iteration 3) have minimal dependencies on each other
   - If team has multiple developers, could build concurrently after Iteration 1
   - For solo developer, sequential (2 → 3) makes sense

3. **Plan for a "Polish" Phase After Iteration 3**
   - Mobile optimization, performance tuning, UX refinement
   - Integration testing across all three iterations
   - Security hardening (rate limiting, CSRF, CSP)
   - Estimate: 4-6 hours

4. **Build Self-Contained HTML Validator Early**
   - Critical for validating Claude's output quality
   - Should be built in Iteration 2 but consider prototyping in Iteration 1
   - Test with real Claude-generated HTML files

5. **Consider a "Pre-Iteration 1" Setup Phase**
   - Install Next.js, configure TypeScript, set up Tailwind CSS
   - Configure ESLint, Prettier for code quality
   - Set up Git repository, .gitignore
   - Estimate: 2-3 hours
   - This could be builder-0 or part of Iteration 1

---

## Technology Recommendations

### Existing Codebase Findings
**Stack detected:** None (greenfield project)

### Greenfield Recommendations

**Frontend Framework:**
- **Recommendation:** Next.js 14+ (App Router)
- **Rationale:**
  - Unified frontend/backend in single codebase
  - API routes eliminate need for separate Express server
  - File-based routing simplifies structure
  - Built-in TypeScript support
  - Optimized for Vercel deployment
  - Server components reduce client JS bundle
  - Excellent Hebrew/RTL support with Tailwind

**Styling:**
- **Recommendation:** Tailwind CSS with RTL plugin
- **Rationale:**
  - Native RTL support via `dir="rtl"`
  - Utility-first approach speeds development
  - Responsive design built-in
  - Dark mode support (future feature)
  - Customizable for Hebrew typography

**Database:**
- **Recommendation:** PostgreSQL 14+ (hosted on Vercel Postgres, Supabase, or RDS)
- **Rationale:**
  - Reliable, mature, ACID-compliant
  - Excellent JSON support for future analytics
  - Full-text search for project filtering
  - Connection pooling with pg-pool
  - Well-supported by Next.js

**ORM/Query Builder:**
- **Recommendation:** Prisma
- **Rationale:**
  - Type-safe database queries
  - Auto-generated TypeScript types
  - Migration management
  - Introspection for existing schemas
  - Excellent Next.js integration
  - Connection pooling out of the box

**File Storage:**
- **Recommendation:** AWS S3 (or Vercel Blob for simplicity)
- **Rationale:**
  - Scalable, reliable, industry-standard
  - Signed URLs for secure downloads
  - Lifecycle policies for auto-cleanup
  - CDN integration for faster downloads
  - Alternative: Vercel Blob (simpler setup, tighter Next.js integration)

**Authentication:**
- **Recommendation:** NextAuth.js for admin, custom JWT for projects
- **Rationale:**
  - NextAuth handles admin session management
  - Custom JWT for project-level passwords (simpler than full auth)
  - Built-in CSRF protection
  - Secure cookie handling

**Password Hashing:**
- **Recommendation:** bcrypt
- **Rationale:**
  - Industry-standard for password hashing
  - Configurable work factor (salt rounds)
  - Widely audited and trusted

**File Upload:**
- **Recommendation:** Formidable or Multer for parsing, direct S3 upload
- **Rationale:**
  - Handles multi-part form data
  - Stream-based (memory-efficient for large files)
  - Integrates with Next.js API routes

**Deployment:**
- **Recommendation:** Vercel (primary) with Railway or Render (backup)
- **Rationale:**
  - Zero-config Next.js deployment
  - Automatic HTTPS
  - Edge functions for global performance
  - Preview deployments for testing
  - Israeli region available (low latency)

**Monitoring:**
- **Recommendation:** Vercel Analytics + Sentry for errors
- **Rationale:**
  - Built-in performance monitoring
  - Error tracking with stack traces
  - User session replay (Sentry)
  - Alert on critical errors

---

## Technology Stack Summary

```yaml
Frontend:
  framework: Next.js 14+ (App Router)
  language: TypeScript 5+
  styling: Tailwind CSS 3+ with RTL plugin
  ui_components: Headless UI or Radix UI

Backend:
  runtime: Node.js 20+
  framework: Next.js API Routes
  validation: Zod (schema validation)

Database:
  primary: PostgreSQL 14+
  orm: Prisma
  hosting: Vercel Postgres or Supabase

Storage:
  files: AWS S3 or Vercel Blob
  sessions: Redis (Upstash) or in-memory (MVP)

Authentication:
  admin: NextAuth.js
  projects: Custom JWT with bcrypt

Security:
  https: Enforced (Vercel default)
  csrf: NextAuth built-in
  rate_limiting: Upstash Rate Limit
  password_hashing: bcrypt (10 rounds)

Hosting:
  platform: Vercel
  domain: statviz.xyz
  region: Europe (closest to Israel)

Monitoring:
  analytics: Vercel Analytics
  errors: Sentry
  uptime: Uptime Robot (free tier)
```

---

## Notes & Observations

### Key Architectural Decisions

1. **Monolithic vs Microservices:** Monolithic Next.js app is appropriate
   - Low complexity doesn't justify microservices overhead
   - Single deployment simplifies maintenance
   - All features tightly coupled (file upload → storage → viewer)

2. **Server-Side Rendering (SSR) vs Static Generation (SSG):**
   - Admin panel: SSR with authentication check
   - Password prompt: SSR (dynamic project validation)
   - Project viewer: SSR (dynamic content from database)
   - Landing page (future): SSG for performance

3. **Session Storage: Redis vs In-Memory:**
   - MVP: In-memory (Next.js built-in)
   - Production: Redis (Upstash) for multi-instance deployments
   - Trade-off: Simplicity vs scalability

4. **File Storage: S3 vs Local Filesystem:**
   - Recommendation: S3 for production (scalable, reliable)
   - Alternative: Local filesystem for development (simpler setup)
   - Must implement abstraction layer to swap easily

### Performance Considerations

- **File Upload:** Stream-based upload to avoid memory issues with 50 MB files
- **HTML Rendering:** Lazy-load iframe content to improve initial page load
- **Database Queries:** Index on `project_id`, `student_email`, `created_at` for fast lookups
- **CDN:** Use Vercel Edge Network or CloudFront for static assets and file downloads

### Security Observations

- **Critical:** Virus scanning for uploaded files (not in spec but highly recommended)
- **Critical:** Content Security Policy headers to prevent XSS in embedded HTML
- **Critical:** Sandbox iframe with restricted permissions
- **Important:** Rate limiting on password verification to prevent brute force
- **Important:** Activity logging for audit trail (who accessed what, when)

### UX Considerations

- **Mobile-First Design:** Many students will access on phones
- **Progress Indicators:** File upload progress, validation feedback
- **Error Recovery:** Retry mechanisms for failed uploads/downloads
- **Accessibility:** Screen reader support for visually impaired students (WCAG 2.1 AA)

### Scalability Notes

- **Current Scale:** ~50 projects/month, ~500 views/month (low)
- **Database:** PostgreSQL can handle 10,000+ projects easily
- **Storage:** S3 scales infinitely
- **Bottleneck:** File upload bandwidth (mitigate with client-side compression)
- **Future Scale:** If usage grows 10x, no architecture changes needed

### Open Questions for Planning

1. **Virus Scanning:** Should we integrate ClamAV or use cloud service (e.g., VirusTotal API)?
2. **File Retention:** Auto-delete projects after 2 years or keep indefinitely?
3. **Backup Strategy:** S3 versioning + daily database backups sufficient?
4. **Development Environment:** Local PostgreSQL + S3 LocalStack, or use staging database?
5. **CI/CD:** GitHub Actions for automated testing and deployment?

---

*Exploration completed: 2025-11-26*
*This report informs master planning decisions for StatViz platform*
