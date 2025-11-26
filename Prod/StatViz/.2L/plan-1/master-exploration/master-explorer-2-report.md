# Master Exploration Report

## Explorer ID
master-explorer-2

## Focus Area
Dependencies & Risk Assessment

## Vision Summary
Build a secure web platform (StatViz) for delivering password-protected statistical analysis reports to graduate students in both traditional (DOCX) and interactive (HTML) formats, with admin panel for project management and Hebrew language support.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 8 must-have features
- **User stories/acceptance criteria:** 51 acceptance criteria across core features
- **Estimated total work:** 60-80 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- 8 core features with tight integration requirements (auth → upload → storage → delivery → tracking)
- Both backend (API, database, file storage) and frontend (admin panel, viewer UI) development needed
- Security-critical application (password hashing, session management, file validation, rate limiting)
- Multi-format file handling (DOCX binary, HTML rendering, iframe embedding)
- Hebrew RTL UI requirements add 15-20% complexity to frontend work
- External dependencies: AWS S3 (or filesystem), PostgreSQL, JWT, bcrypt, file validation libraries

---

## Dependency Chain Analysis

### Critical Path Dependencies

**Phase 1: Foundation (Must Complete First)**
1. **Database Schema** → All features depend on this
2. **Admin Authentication** → Required before any admin operations
3. **File Storage System** → Must exist before project creation can work

**Phase 2: Core Operations (Depend on Phase 1)**
4. **Project Creation** → Depends on: Auth + Database + Storage
5. **Password-Protected Access** → Depends on: Database (password lookup)
6. **HTML Validation** → Depends on: File upload mechanism

**Phase 3: Presentation Layer (Depend on Phase 2)**
7. **Project Viewer Page** → Depends on: Password Access + File Storage
8. **Project List (Admin)** → Depends on: Auth + Database queries

### Dependency Graph

```
Foundation Layer (Phase 1)
├── Database Schema (projects table)
├── Auth System (JWT + bcrypt)
└── File Storage (S3 client or filesystem)
    ↓
Core Business Logic (Phase 2)
├── Project Creation (uses: Auth, DB, Storage)
│   ├── File Upload Handler
│   ├── Password Generation
│   ├── URL Generation
│   └── HTML Validation
├── Password Verification (uses: DB, bcrypt)
└── Session Management (uses: JWT)
    ↓
Presentation Layer (Phase 3)
├── Admin Panel UI
│   ├── Login Form
│   ├── Project List View
│   └── Create Project Modal
└── Student Viewer UI
    ├── Password Prompt
    ├── HTML Report Embed
    └── DOCX Download Button
```

### Cross-Feature Dependencies

**Project Creation depends on:**
- Admin Auth (must be logged in)
- Database connection (to save metadata)
- Storage system (to upload files)
- Password hashing library (bcrypt)
- File validation (type/size checks)

**Project Viewer depends on:**
- Password validation (against database)
- Session token generation (JWT)
- File retrieval (from storage)
- Database query (get project metadata)
- View tracking (increment counter)

**Admin List depends on:**
- Admin Auth (JWT validation)
- Database query (SELECT all projects)
- Sorting/filtering logic
- Copy-to-clipboard functionality

### Integration Points

**Frontend ↔ Backend:**
- API endpoint calls (8+ endpoints)
- File upload (multipart/form-data handling)
- Session token passing (headers or cookies)
- Error message localization (Hebrew)

**Backend ↔ Database:**
- Connection pooling
- Transaction management (file upload + DB insert must be atomic)
- Query optimization (project list can grow large)
- Migration scripts (schema evolution)

**Backend ↔ Storage:**
- File upload to S3 or local filesystem
- Signed URL generation (secure downloads)
- File deletion (cleanup when project deleted)
- Validation before storage (virus scan, type check)

**Frontend ↔ Browser:**
- HTML iframe rendering (CSP policies)
- DOCX file download handling
- Hebrew RTL layout (CSS direction)
- Responsive design (mobile vs desktop)

---

## Risk Assessment

### High Risks

**RISK 1: File Upload Atomicity**
- **Description:** DOCX and HTML must both upload successfully, or neither should be saved to database
- **Impact:** Partial project creation could leave orphaned files or broken database records
- **Likelihood:** MEDIUM (network interruptions, storage failures)
- **Mitigation:**
  - Implement two-phase commit: upload files first, then create DB record
  - If DB insert fails, delete uploaded files (rollback)
  - Add transaction wrapper around file + DB operations
  - Store upload status in temporary table until fully complete
- **Recommendation:** Tackle in Iteration 1 (foundation phase)
- **Estimated effort to mitigate:** 4-6 hours

**RISK 2: HTML Security (XSS Attacks)**
- **Description:** User-uploaded HTML files could contain malicious scripts that execute in student browsers
- **Impact:** HIGH - Could steal session tokens, redirect users, display fake content
- **Likelihood:** LOW (Ahiya is trusted user, not public uploads)
- **Mitigation:**
  - Sanitize HTML on upload (strip <script> tags, event handlers)
  - Use iframe with sandbox attribute: `<iframe sandbox="allow-scripts allow-same-origin">`
  - Content Security Policy headers (restrict inline scripts)
  - Display warning if external resources detected
  - Consider: Render in separate subdomain (e.g., content.statviz.xyz)
- **Recommendation:** CRITICAL - Must implement in Iteration 1
- **Estimated effort to mitigate:** 6-8 hours (research + testing)

**RISK 3: Password Reset Mechanism**
- **Description:** Vision does not specify how students recover access if they lose password
- **Impact:** MEDIUM - Students locked out, Ahiya must manually share password again
- **Likelihood:** HIGH (students will lose passwords)
- **Mitigation:**
  - Option 1: Admin can view/reset passwords from project list
  - Option 2: Store passwords reversibly encrypted (not just hashed)
  - Option 3: No recovery - Ahiya re-shares password manually
  - Document this in user guide
- **Recommendation:** Decide strategy in planning phase, implement in Iteration 2
- **Estimated effort to mitigate:** 2-3 hours

**RISK 4: Hebrew RTL Layout Complexity**
- **Description:** RTL (right-to-left) CSS can conflict with LTR English elements (emails, URLs)
- **Impact:** MEDIUM - UI looks broken, poor user experience
- **Likelihood:** HIGH (common issue with mixed RTL/LTR content)
- **Mitigation:**
  - Use `dir="rtl"` on Hebrew containers only (not global)
  - Use `direction: ltr` for email/URL inputs
  - Test on multiple browsers (Safari, Chrome, Firefox)
  - Use Tailwind CSS RTL plugin or manual utilities
  - Design with bidirectional text in mind from start
- **Recommendation:** Address in Iteration 1 (UI foundation)
- **Estimated effort to mitigate:** 3-4 hours

### Medium Risks

**RISK 5: File Size Limits (50 MB)**
- **Description:** HTML files with embedded Plotly data can exceed 50 MB for large datasets
- **Impact:** Upload fails, frustrating user experience
- **Likelihood:** MEDIUM (depends on data size)
- **Mitigation:**
  - Test with actual generated files before setting limit
  - Allow configurable limit via environment variable
  - Display progress bar during upload (manage expectations)
  - Provide helpful error message with instructions
  - Consider compression before upload
- **Recommendation:** Monitor in early testing, adjust limit as needed
- **Estimated effort to mitigate:** 2 hours

**RISK 6: Database Password Storage**
- **Description:** Storing hashed passwords prevents admins from viewing them later
- **Impact:** Students lose password → No recovery → Manual re-creation
- **Likelihood:** HIGH (students will forget passwords)
- **Mitigation:**
  - Decision: Hash vs Encrypt vs Plaintext (encrypted at rest)
  - If hashed: Admin can reset to new password
  - If encrypted: Admin can view original password
  - If plaintext: Admin can view, but security risk if DB compromised
  - Recommendation: Encrypt with key stored in env variable
- **Recommendation:** Decide in planning, implement in Iteration 1
- **Estimated effort to mitigate:** 3-4 hours

**RISK 7: Session Timeout Strategy**
- **Description:** Vision specifies "session timeout after inactivity" but no duration defined
- **Impact:** Students mid-viewing report get kicked out (bad UX) OR Sessions stay open too long (security risk)
- **Likelihood:** HIGH (will definitely encounter this)
- **Mitigation:**
  - Define timeout durations:
    - Admin session: 30 minutes inactivity
    - Student session: 2 hours inactivity (report viewing takes time)
  - Implement sliding window (activity extends session)
  - Show warning 2 minutes before timeout
  - Allow easy re-authentication (password remembered in browser)
- **Recommendation:** Define in planning, implement in Iteration 2
- **Estimated effort to mitigate:** 4-5 hours

**RISK 8: Iframe Rendering Issues**
- **Description:** Some HTML reports may not render correctly in iframe due to CSP, viewport, or script restrictions
- **Impact:** Students see broken report, cannot use interactive features
- **Likelihood:** MEDIUM (depends on how Claude generates HTML)
- **Mitigation:**
  - Test multiple generated HTML files in iframe during development
  - Use `srcdoc` attribute instead of `src` for inline content
  - Ensure iframe has proper dimensions (responsive)
  - Provide "Open in new tab" fallback option
  - Validate HTML structure before accepting upload
- **Recommendation:** Test thoroughly in Iteration 2, provide fallback
- **Estimated effort to mitigate:** 3-4 hours

**RISK 9: Third-Party Library Dependencies (Plotly)**
- **Description:** Vision requires self-contained HTML, but Plotly may be CDN-linked instead of embedded
- **Impact:** Reports don't work offline or if CDN goes down
- **Likelihood:** MEDIUM (depends on Claude's generation method)
- **Mitigation:**
  - HTML validation step checks for external <script> tags
  - Warn Ahiya if Plotly is CDN-linked
  - Document requirement clearly for Claude prompt
  - Consider: Automatically inline CDN resources during upload
  - Test offline functionality as part of upload validation
- **Recommendation:** Implement validation in Iteration 1
- **Estimated effort to mitigate:** 3-4 hours

### Low Risks

**RISK 10: Concurrent File Uploads**
- **Description:** If Ahiya uploads multiple projects simultaneously, file name collisions or race conditions could occur
- **Impact:** LOW - Files overwrite each other or DB insert fails
- **Likelihood:** LOW (Ahiya is single user, unlikely to multi-task)
- **Mitigation:**
  - Generate unique project IDs (UUID or nanoid) before upload
  - Use project ID in file path: `/projects/{uuid}/findings.docx`
  - Database constraints (UNIQUE on project_id)
- **Recommendation:** Address in Iteration 1 (foundation)
- **Estimated effort to mitigate:** 1-2 hours

**RISK 11: Storage Costs (S3 vs Filesystem)**
- **Description:** AWS S3 costs could grow unexpectedly with many large files
- **Impact:** LOW - Budget overrun, but predictable
- **Likelihood:** LOW (~50 projects/month, 5-10 MB avg = $1-5/month)
- **Mitigation:**
  - Start with local filesystem for MVP (zero cost)
  - Monitor storage usage via admin dashboard
  - Implement automatic deletion after N months (optional)
  - Migrate to S3 only if filesystem becomes problematic
- **Recommendation:** Use filesystem for MVP, plan S3 migration for later
- **Estimated effort to mitigate:** 0 hours (decision only)

**RISK 12: Browser Compatibility**
- **Description:** Older browsers may not support modern HTML5/CSS3 features
- **Impact:** LOW - Students see broken layout
- **Likelihood:** LOW (spec requires Chrome 90+, most users have updated browsers)
- **Mitigation:**
  - Test on target browsers (Chrome 90+, Firefox 88+, Safari 14+)
  - Display warning for unsupported browsers
  - Use progressive enhancement (fallbacks for missing features)
  - Document browser requirements in student instructions
- **Recommendation:** Test in Iteration 2, document in user guide
- **Estimated effort to mitigate:** 2-3 hours

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 phases)

**Rationale:**
- 8 core features with complex interdependencies
- Security-critical functionality requires careful implementation
- Frontend + Backend + Database + Storage = 4 distinct layers
- Natural separation between foundation, core features, and polish
- Allows validation at each stage before proceeding

---

## Suggested Iteration Phases

### Iteration 1: Foundation & Security

**Vision:** Establish secure backend infrastructure with authentication, database, and file storage

**Scope:**
- Database schema setup (projects table with all fields)
- Admin authentication system (JWT + bcrypt)
- File storage system (local filesystem with validation)
- Project creation API (upload files, generate URLs, store metadata)
- Basic HTML validation (check for external resources)
- Password hashing and verification logic
- API error handling and logging

**Why first:**
- Everything else depends on this foundation
- Security must be built in from the start (not bolted on)
- Database schema changes are risky later (migrations)
- File storage decisions affect all subsequent work

**Estimated duration:** 20-25 hours

**Risk level:** HIGH (security-critical, must get right)

**Success criteria:**
- Admin can authenticate via API endpoint
- Files upload successfully to storage
- Database stores project metadata correctly
- Passwords hash and verify properly
- HTML validation detects external dependencies
- All API endpoints return proper error codes

**Dependencies:** None (foundation layer)

---

### Iteration 2: Core Features & UI

**Vision:** Build admin panel and project viewer interfaces with full user flows

**Scope:**
- Admin panel UI (Next.js pages)
  - Login page with error handling
  - Project list view (sortable, searchable)
  - Create project modal with file upload
  - Project actions (delete, copy link)
- Student viewer UI
  - Password prompt page (Hebrew)
  - Project view page with embedded HTML
  - DOCX download button
  - View tracking (increment counter)
- Session management (JWT tokens, timeout logic)
- Hebrew RTL layout implementation
- Responsive design (mobile-friendly)
- Integration testing (admin flow + student flow)

**Why second:**
- Requires foundation from Iteration 1 (APIs, database, storage)
- UI is what users interact with (validates entire system)
- Can test end-to-end workflows
- Hebrew RTL needs careful implementation

**Dependencies:**
- Requires: All APIs from Iteration 1
- Imports: Database schema, auth logic, file storage utilities
- Uses: JWT token generation, password verification

**Estimated duration:** 25-30 hours

**Risk level:** MEDIUM (UI complexity, RTL layout challenges)

**Success criteria:**
- Ahiya can log in and see project list
- Ahiya can create new project with file uploads
- Student can access project with password
- HTML report renders correctly in iframe
- DOCX downloads successfully
- Hebrew text displays correctly (RTL)
- Mobile view is functional

---

### Iteration 3: Polish & Production Readiness

**Vision:** Add security hardening, monitoring, and deployment configuration

**Scope:**
- Security enhancements
  - Rate limiting on login endpoint
  - HTTPS enforcement
  - CSRF protection
  - Input sanitization
  - Virus scanning (optional)
- Production deployment
  - Environment configuration (Vercel or VPS)
  - PostgreSQL setup (connection pooling)
  - SSL certificate (Let's Encrypt)
  - Error monitoring (Sentry or similar)
- Analytics tracking
  - View count tracking (already in DB)
  - Last accessed timestamp
  - Admin activity logs
- User documentation
  - Admin guide (how to create projects)
  - Student guide (how to access reports)
  - Troubleshooting FAQ
- Testing & QA
  - Manual testing checklist
  - Edge case validation
  - Performance testing (50+ projects)

**Why third:**
- Production concerns are lower priority than core functionality
- Deployment is easier once all features are working
- Documentation requires complete system to document
- Testing is most effective with all features implemented

**Dependencies:**
- Requires: All features from Iterations 1 & 2
- Imports: Complete application codebase
- Uses: All components, APIs, and database tables

**Estimated duration:** 15-20 hours

**Risk level:** LOW (refinement and deployment)

**Success criteria:**
- Application deployed to production URL (statviz.xyz)
- HTTPS working correctly
- Rate limiting prevents brute force attacks
- Error monitoring captures issues
- Documentation covers all user flows
- Manual testing passes 100% checklist
- Performance acceptable with 50+ projects

---

## Technology Recommendations

### Existing Codebase Findings
**Status:** Greenfield project (no existing codebase)

### Greenfield Recommendations

**Backend Framework:**
- **Suggested:** Next.js API Routes
- **Rationale:** Single codebase for frontend + backend, serverless-friendly, excellent TypeScript support, easy Vercel deployment

**Frontend Framework:**
- **Suggested:** Next.js 14+ with App Router
- **Rationale:** React-based, excellent for forms/admin panels, built-in routing, server components for better performance

**Database:**
- **Suggested:** PostgreSQL (hosted on Railway, Supabase, or Neon)
- **Rationale:** Reliable, excellent for structured data, JSON support for metadata, free tiers available

**Database ORM:**
- **Suggested:** Prisma
- **Rationale:** Type-safe queries, excellent migrations, great TypeScript integration, easy schema management

**File Storage:**
- **Suggested:** Start with local filesystem, migrate to S3 later
- **Rationale:**
  - Local: Zero cost, simple for MVP, fast for development
  - S3: Scalable, reliable, but adds complexity and cost
  - Recommendation: Build abstraction layer to switch easily

**Authentication:**
- **Suggested:** NextAuth.js with Credentials provider
- **Rationale:** Handles JWT, sessions, CSRF protection, well-maintained, integrates with Next.js

**Password Hashing:**
- **Suggested:** bcrypt
- **Rationale:** Industry standard, slow by design (prevents brute force), well-tested

**File Upload:**
- **Suggested:** next-connect + multer
- **Rationale:** Handles multipart/form-data, file size limits, type validation

**Styling:**
- **Suggested:** Tailwind CSS + shadcn/ui components
- **Rationale:** RTL support built-in, rapid development, consistent design system

**Deployment:**
- **Suggested:** Vercel (Next.js optimized)
- **Rationale:**
  - Zero-config deployment
  - Free tier sufficient for MVP
  - Built-in HTTPS
  - Easy environment variables
  - Excellent DX (developer experience)

**Alternative (Traditional VPS):**
- **Suggested:** DigitalOcean or Linode + PM2 + Nginx
- **Rationale:** More control, predictable pricing, easier to debug, no vendor lock-in

---

## Critical Path Analysis

### What Must Happen First (Sequential Dependencies)

**Step 1: Database Schema**
- Cannot create projects without schema
- Cannot store passwords without users table
- Cannot track views without view_count field

**Step 2: Authentication System**
- Cannot access admin panel without auth
- Cannot create projects without being logged in
- All admin features blocked until auth works

**Step 3: File Storage**
- Cannot save files without storage mechanism
- Cannot retrieve files for viewing without storage
- Project creation meaningless without files

**Step 4: Project Creation API**
- Core business logic depends on steps 1-3
- Cannot test full workflow without this
- All other features depend on projects existing

**Step 5: Password Verification**
- Students cannot access without this
- Depends on database (password lookup)
- Depends on bcrypt (hash comparison)

**Step 6: UI Layer**
- Last because it's a wrapper around APIs
- Can mock APIs during development
- Visual testing requires working backend

### Parallelizable Work (Can Be Done Simultaneously)

**After Iteration 1 Foundation:**
- Admin UI + Student UI (separate developers could work in parallel)
- Hebrew RTL styling + API integration (separate concerns)
- Documentation + Testing (can start before all features complete)

**Within Iteration 2:**
- Admin panel components + Student viewer components (independent)
- Session management + View tracking (separate features)
- Desktop layout + Mobile responsive design (parallel tracks)

---

## Timeline Estimates

### Best Case Scenario
- Iteration 1: 20 hours (2.5 days full-time)
- Iteration 2: 25 hours (3 days full-time)
- Iteration 3: 15 hours (2 days full-time)
- **Total: 60 hours (7.5 days full-time)**

### Realistic Scenario
- Iteration 1: 25 hours (includes security research, testing)
- Iteration 2: 30 hours (RTL complexity, iframe testing, debugging)
- Iteration 3: 20 hours (deployment issues, documentation polish)
- **Total: 75 hours (9-10 days full-time)**

### Worst Case Scenario
- Iteration 1: 30 hours (security issues, database migrations, file upload bugs)
- Iteration 2: 35 hours (cross-browser issues, RTL edge cases, iframe CSP problems)
- Iteration 3: 25 hours (deployment complexity, performance optimization)
- **Total: 90 hours (11-12 days full-time)**

**Recommendation:** Budget 75-80 hours, expect 60-90 hour range

---

## Resource Requirements

### Development Resources
- 1 Full-stack developer (Next.js + PostgreSQL experience)
- Hebrew language support (RTL layout testing)
- Access to sample DOCX + HTML files from Claude
- Development environment (Node.js 18+, PostgreSQL 14+)

### Infrastructure Resources
- **MVP:** Free tier Vercel + Supabase (PostgreSQL) = $0/month
- **Production:** Vercel Pro ($20/mo) + Railway Postgres ($5/mo) = $25/month
- **Domain:** statviz.xyz (~$12/year)
- **SSL:** Free (Let's Encrypt via Vercel)

### Testing Resources
- Multiple browsers (Chrome, Firefox, Safari)
- Mobile devices (iOS + Android)
- Sample data files (10+ test projects)
- Hebrew-speaking tester (validate RTL UX)

---

## Integration Complexity Assessment

### High Complexity Integrations

**File Upload + Storage + Database (Atomic Transaction)**
- **Complexity:** HIGH
- **Why:** Must ensure files and DB record are both created or both rolled back
- **Estimated effort:** 6-8 hours
- **Risk:** Data inconsistency if partial failure

**HTML Iframe Rendering + CSP (Security)**
- **Complexity:** HIGH
- **Why:** Balance security (sandbox, CSP) with functionality (allow scripts, interactions)
- **Estimated effort:** 6-8 hours
- **Risk:** Reports don't work or security vulnerabilities

**Password Encryption/Hashing + Recovery**
- **Complexity:** MEDIUM-HIGH
- **Why:** Trade-off between security (hashing) and usability (recovery)
- **Estimated effort:** 4-6 hours
- **Risk:** Students locked out permanently

### Medium Complexity Integrations

**Session Management + JWT + Timeout**
- **Complexity:** MEDIUM
- **Why:** Multiple moving parts (token generation, validation, expiration, refresh)
- **Estimated effort:** 5-6 hours
- **Risk:** Session bugs, security issues

**Hebrew RTL + Mixed LTR Content**
- **Complexity:** MEDIUM
- **Why:** Bidirectional text, email/URL display, CSS conflicts
- **Estimated effort:** 4-5 hours
- **Risk:** Broken layout, poor UX

**File Validation + Virus Scanning**
- **Complexity:** MEDIUM
- **Why:** Must validate type, size, content, malware without blocking uploads
- **Estimated effort:** 4-5 hours
- **Risk:** False positives or missed malicious files

### Low Complexity Integrations

**View Count Tracking**
- **Complexity:** LOW
- **Why:** Simple database UPDATE query on page load
- **Estimated effort:** 1-2 hours
- **Risk:** Race conditions (minor issue)

**Copy to Clipboard (Link/Password)**
- **Complexity:** LOW
- **Why:** Browser API well-supported, simple JavaScript
- **Estimated effort:** 1 hour
- **Risk:** Unsupported browsers (fallback: manual copy)

---

## Recommendations for Master Plan

1. **Start with Iteration 1 as pure backend/foundation**
   - No UI yet, just API endpoints and database
   - Test with Postman/curl to validate all logic
   - Ensures security is built in from day one
   - Reduces risk of rework later

2. **Use TypeScript throughout**
   - Type safety prevents runtime errors
   - Especially important for database operations
   - Prisma + TypeScript = excellent DX

3. **Build file storage abstraction from start**
   - Interface: `FileStorage` with methods `upload()`, `download()`, `delete()`
   - Implementation 1: `LocalFileStorage` (MVP)
   - Implementation 2: `S3FileStorage` (future)
   - Makes migration seamless

4. **Decide password storage strategy early**
   - Recommendation: Encrypt with AES-256, key in environment variable
   - Allows admin to view passwords (better UX for students)
   - Still secure (requires access to env vars)
   - Alternative: Hash with bcrypt (more secure, but no recovery)

5. **Test Hebrew RTL early and often**
   - Don't wait until Iteration 2 to discover layout issues
   - Create RTL design system in parallel with Iteration 1
   - Use real Hebrew text in all mockups/testing

6. **Plan for iteration 2 and 3 validation phases**
   - Iteration 2: User acceptance testing with Ahiya + test student
   - Iteration 3: Load testing with 50+ projects
   - Budget time for bug fixes between iterations

7. **Document security decisions**
   - Why bcrypt? Why JWT? Why sandbox iframe?
   - Helps with audits later
   - Useful for onboarding future developers

8. **Consider "Should-Have" features as Iteration 4**
   - Password reset (Admin can change passwords)
   - Bulk operations (Delete multiple projects)
   - Project analytics (Time spent on sections)
   - Email notifications (Auto-send links to students)
   - These add value but not critical for MVP

---

## Open Questions for Planning Phase

1. **Password Storage Decision:**
   - Hash (secure, no recovery) vs Encrypt (viewable, less secure) vs Plaintext (bad idea)?
   - Recommendation: Encrypt with env key

2. **File Storage Strategy:**
   - Start with filesystem or S3 from day one?
   - Recommendation: Filesystem for MVP, plan S3 migration

3. **Session Timeout Durations:**
   - Admin: 30 minutes? 1 hour? 2 hours?
   - Student: 1 hour? 2 hours? 24 hours?
   - Recommendation: Admin 30min, Student 2 hours

4. **Project Deletion:**
   - Soft delete (mark as deleted) or hard delete (remove from DB)?
   - Recommendation: Hard delete (simpler), but ask for confirmation

5. **File Size Limit:**
   - 50 MB confirmed? Or test with real files first?
   - Recommendation: Start with 50 MB, make configurable

6. **Deployment Target:**
   - Vercel (serverless) or VPS (traditional)?
   - Recommendation: Vercel for MVP (faster iteration), VPS if budget is concern

7. **Analytics Tracking:**
   - What level of detail? Time per section? Scroll depth?
   - Recommendation: Start minimal (view count, last accessed), expand later

8. **Automatic Project Cleanup:**
   - Delete projects older than 2 years? Or keep forever?
   - Recommendation: Keep forever for MVP, add cleanup in future iteration

---

## Notes & Observations

**Strengths of this Vision:**
- Clear user flows with detailed edge cases
- Well-defined technical stack preferences
- Security considerations thought through upfront
- Hebrew language requirements explicit
- Realistic scope for MVP (no feature creep)

**Potential Challenges:**
- HTML security is non-trivial (need iframe sandbox + CSP expert)
- Hebrew RTL requires testing across browsers and devices
- File upload atomicity needs careful transaction management
- Password recovery mechanism not specified (UX gap)

**Opportunities:**
- Build as SaaS later (multi-tenant for other statisticians)
- Direct Claude API integration (automate analysis generation)
- Export to PowerPoint (presentations for thesis defense)
- Analytics dashboard (improve teaching materials based on student behavior)

**Technical Debt to Watch:**
- Local filesystem doesn't scale beyond single server
- No database migrations strategy specified (Prisma will help)
- Session management in-memory won't work with multiple servers (use Redis later)
- No error monitoring/logging strategy (add Sentry in Iteration 3)

---

*Exploration completed: 2025-11-26*

*This report informs master planning decisions for StatViz platform development*
