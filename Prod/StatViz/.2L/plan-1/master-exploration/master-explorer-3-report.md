# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points

## Vision Summary
StatViz is a secure platform for delivering interactive statistical analysis reports to graduate students at Israeli institutions, bridging statistician (Ahiya), academic intermediary (Guy), and students through password-protected web access with dual-format delivery (DOCX + HTML).

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 8 must-have MVP features
- **User stories/acceptance criteria:** 47 acceptance criteria across 8 core features
- **Estimated total work:** 16-24 hours

### Complexity Rating
**Overall Complexity: MEDIUM**

**Rationale:**
- **Frontend/backend separation:** Admin panel + public viewer + API layer (3 distinct UX contexts)
- **Dual authentication flows:** Admin JWT + per-project password sessions (2 different auth patterns)
- **File handling complexity:** Upload, storage, validation, and download flows with security constraints
- **Hebrew RTL requirements:** Entire UI must support right-to-left layout (unique UX constraint)
- **Responsive design across contexts:** Admin panel (desktop-focused) + project viewer (mobile-critical)

---

## User Experience Analysis

### User Journey Map

#### Journey 1: Admin Project Creation Flow
**User:** Ahiya (Statistician/Admin)

**Entry Point:** Already authenticated to admin panel

**Steps:**
1. **Dashboard view** → Click "Create New Project" button
2. **Modal opens** → Form with 6 input fields + 2 file uploads
3. **Fill metadata** → Project name, student name, email, research topic (all Hebrew)
4. **Upload DOCX** → File picker, validates .docx extension, shows preview
5. **Upload HTML** → File picker, validates .html extension, checks self-contained
6. **Password decision** → Leave blank (auto-generate) OR enter custom
7. **Submit** → Loading state, backend processing (upload + DB + validation)
8. **Success modal** → Display link + password with copy buttons
9. **Exit** → Return to dashboard with new project visible

**Critical UX Points:**
- **Form validation feedback:** Real-time validation for file types, size limits (50 MB), required fields
- **Upload progress indicators:** File upload can take 10-30 seconds for large HTML files
- **Error recovery:** If upload fails mid-process, allow retry without re-entering metadata
- **Copy-to-clipboard UX:** One-click copy for both link and password (avoid manual selection)
- **Success state clarity:** Clear visual confirmation that project is ready to share

**Edge Cases:**
- **Network interruption during upload:** Resume capability OR clear error + retry button
- **HTML validation warnings:** Display warning if external resources detected, allow override
- **Duplicate project names:** Allow (projects use unique IDs), show disambiguation in list
- **Session timeout during form fill:** Auto-save draft OR extend session on activity

**Complexity Rating: MEDIUM**
- 8-step flow with multiple decision points
- File upload UI with progress tracking
- Validation logic across multiple fields
- Success state requires displaying credentials securely

---

#### Journey 2: Student Project Access Flow
**User:** Student (end user)

**Entry Point:** Receives link via email from Guy

**Steps:**
1. **Click link** → Lands on /preview/[project-id]
2. **Password prompt** → Clean, Hebrew UI, single input field
3. **Enter password** → Validation on submit (not real-time)
4. **Loading state** → Backend verifies password, creates session
5. **Project page loads** → HTML report renders + metadata display
6. **Explore report** → Scroll, interact with Plotly graphs, expand sections
7. **Download DOCX** → Click button, file downloads via browser
8. **Session persists** → Can refresh page without re-entering password

**Critical UX Points:**
- **Password screen simplicity:** Minimal UI, no distractions, clear Hebrew instructions
- **Error messaging:** Hebrew error "סיסמה שגויה. אנא נסה שוב" with retry (no lockout initially)
- **HTML rendering quality:** Iframe OR direct embed must preserve all interactive features
- **Mobile responsiveness:** Students may access on phones (critical for report viewing)
- **Download UX:** Clear button, file naming (findings_hebrew.docx), success feedback
- **Session management:** Token stored in cookie/localStorage, expires after inactivity

**Edge Cases:**
- **Wrong password (3+ attempts):** Consider rate limiting after repeated failures
- **Project deleted:** Display "Project not found" in Hebrew with contact info
- **Session expires mid-view:** Gentle redirect to password screen with context
- **HTML too large for mobile:** Fallback to simplified view OR download-only option
- **Download fails:** Retry mechanism with error feedback

**Complexity Rating: LOW-MEDIUM**
- 8-step flow but mostly linear
- Password validation is simple pass/fail
- HTML embedding can be complex (Plotly compatibility)
- Mobile optimization critical

---

#### Journey 3: Admin Project Management Flow
**User:** Ahiya (Statistician/Admin)

**Entry Point:** Authenticated admin dashboard

**Steps:**
1. **View project list** → Table/card view, sorted by creation date
2. **Search/filter** → By student name, date range (optional MVP feature)
3. **Select project** → Click row OR action buttons
4. **Actions available:**
   - **View:** Opens project in new tab (as student would see)
   - **Copy Link:** Copies shareable URL to clipboard
   - **Delete:** Shows confirmation modal → Deletes files + DB record
5. **Confirmation feedback** → Toast notifications for success/error

**Critical UX Points:**
- **List view clarity:** Essential metadata visible (name, student, date, views)
- **Action discoverability:** Buttons clearly labeled, appropriate visual hierarchy
- **Delete confirmation:** "Are you sure? This cannot be undone" with cancel option
- **Optimistic UI:** Update list immediately after action, revert if fails
- **Empty state:** "No projects yet. Create your first one!" when list is empty

**Edge Cases:**
- **Delete fails (file deletion succeeds but DB fails):** Log inconsistency, show error, retry
- **View project (password required?):** Admin should bypass password OR auto-enter
- **No projects:** Display helpful empty state with CTA to create

**Complexity Rating: LOW**
- CRUD operations with standard patterns
- List view is straightforward
- Delete flow is standard with confirmation

---

## Integration Point Analysis

### Integration 1: Frontend ↔ Backend API

**API Contracts Required:**

#### Admin Authentication Flow
```
POST /api/admin/login
Request: { username, password }
Response: { token, expires }
Error States: 401 (invalid), 429 (rate limited), 500 (server error)
```

**Frontend Integration:**
- Store JWT token in httpOnly cookie OR localStorage
- Attach token to all admin API requests via Authorization header
- Handle token expiration with refresh OR redirect to login
- Display login errors in Hebrew

**Complexity: LOW**
- Standard JWT authentication pattern
- Clear success/failure states

---

#### Project Creation Flow
```
POST /api/admin/projects
Request: multipart/form-data
  - project_name (text)
  - student_name (text)
  - student_email (text)
  - research_topic (text)
  - password (text, optional)
  - docx_file (file, max 50MB)
  - html_file (file, max 50MB)
Response: { success, project_id, project_url, password }
Error States:
  - 400 (validation: file type, size)
  - 401 (unauthorized)
  - 413 (payload too large)
  - 500 (upload/DB failure)
```

**Frontend Integration:**
- Use FormData API for multipart uploads
- Show upload progress with XMLHttpRequest.upload.onprogress
- Validate files client-side BEFORE upload (type, size)
- Display server validation errors inline on form
- Handle partial failures (one file uploads, other fails)

**Data Flow:**
```
User fills form → Client validation → FormData construction →
Upload with progress → Server validation → File storage (S3) →
Database insert → Response with credentials → Display success modal
```

**Complexity: MEDIUM-HIGH**
- Multipart file upload with progress tracking
- Multiple failure points requiring different error handling
- Large file transfers (up to 50MB) can timeout
- Need to coordinate file upload + metadata submission atomically

---

#### Project List Retrieval
```
GET /api/admin/projects
Query Params: ?search=, ?sortBy=, ?page=
Response: { projects: [...] }
Error States: 401 (unauthorized), 500 (server error)
```

**Frontend Integration:**
- Fetch on mount + after create/delete operations
- Implement client-side search/filter OR server-side query params
- Paginate if project count exceeds ~50 (not critical for MVP)
- Display loading skeleton while fetching

**Complexity: LOW**
- Standard GET request with array response
- Optional search/filter adds minor complexity

---

#### Project Deletion
```
DELETE /api/admin/projects/:project_id
Response: { success, message }
Error States: 401 (unauthorized), 404 (not found), 500 (server error)
```

**Frontend Integration:**
- Show confirmation dialog before DELETE request
- Optimistic UI: Remove from list immediately, revert if fails
- Toast notification for success/error
- Handle case where file deletion succeeds but DB delete fails

**Complexity: LOW**
- Standard DELETE with confirmation pattern

---

### Integration 2: Public Password Verification Flow

```
POST /api/preview/:project_id/verify
Request: { password }
Response (success): { valid: true, token }
Response (failure): { valid: false, message }
Error States: 404 (project not found), 429 (rate limited), 500 (server error)
```

**Frontend Integration:**
- Submit password on form submit
- Store session token in cookie (httpOnly, secure, sameSite)
- Redirect to project view on success
- Display Hebrew error message on failure ("סיסמה שגויה")
- Implement client-side rate limiting (prevent rapid retries)

**Data Flow:**
```
User enters password → Submit → Backend validates hash →
Session token created → Cookie set → Redirect to /preview/:id
```

**Complexity: LOW-MEDIUM**
- Simple password validation
- Session management via cookies
- Hebrew error messaging

---

### Integration 3: Project Data Retrieval

```
GET /api/preview/:project_id
Headers: Authorization: Bearer [session_token]
Response: {
  project_name,
  student_name,
  research_topic,
  html_content (or html_url),
  docx_download_url
}
Error States: 401 (invalid session), 404 (not found), 500 (server error)
```

**Frontend Integration:**
- Send session token from cookie automatically
- Render HTML content in iframe OR direct DOM injection
- Display metadata (project name, student name)
- Provide download button linked to docx_download_url

**HTML Rendering Approaches:**

**Option A: Iframe (SAFER)**
```html
<iframe src="[html_url]" sandbox="allow-scripts allow-same-origin" />
```
- Pros: Isolated environment, security boundary
- Cons: Sizing challenges, communication complexity

**Option B: Direct Injection (SIMPLER)**
```javascript
<div dangerouslySetInnerHTML={{ __html: html_content }} />
```
- Pros: Full responsiveness, easier styling
- Cons: XSS risk if HTML not sanitized, global CSS conflicts

**Recommendation: Iframe with dynamic height adjustment**
- Use postMessage for iframe ↔ parent communication
- Adjust iframe height based on content
- Preserve all Plotly interactivity

**Complexity: MEDIUM**
- HTML embedding with security constraints
- Need to preserve interactive features
- Mobile responsiveness critical

---

### Integration 4: File Download Flow

```
GET /api/download/:project_id
Headers: Authorization: Bearer [session_token]
Response: Binary file (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
```

**Frontend Integration:**
- Simple anchor tag with download attribute OR fetch + blob
- Track download analytics (increment view count)
- Display success feedback ("Download started")
- Handle download failures with retry

**Implementation:**
```javascript
<a href="/api/download/:project_id" download="findings_hebrew.docx">
  Download DOCX
</a>
```

**Complexity: LOW**
- Standard file download pattern
- Browser handles file saving

---

### Integration 5: File Storage (S3 or Filesystem)

**Storage Decision:**

**Option A: AWS S3**
- **Pros:** Scalable, reliable, CDN integration, signed URLs
- **Cons:** Additional cost, requires AWS account, more complex setup
- **Use Case:** Production deployment, high file volume

**Option B: Local Filesystem**
- **Pros:** Simple, no external dependencies, no recurring cost
- **Cons:** Not scalable, no redundancy, requires server disk space
- **Use Case:** MVP testing, low file volume (<100 projects)

**Recommendation for MVP: Start with local filesystem, migrate to S3 later**

**File Upload Flow (Filesystem):**
```
1. Backend receives multipart/form-data
2. Validate file type, size
3. Generate unique filename: ${project_id}_findings.docx
4. Save to /uploads/${project_id}/ directory
5. Store file path in database
6. Return URL: /api/download/${project_id}
```

**Security Considerations:**
- Validate MIME type, not just extension
- Scan for viruses (optional for MVP)
- Prevent directory traversal attacks (sanitize filenames)
- Serve files through API endpoint, not direct filesystem access

**Complexity: LOW (filesystem), MEDIUM (S3)**
- Filesystem: Simple file I/O operations
- S3: Requires SDK integration, signed URLs, error handling

---

### Integration 6: Database (PostgreSQL)

**Schema:**
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) UNIQUE NOT NULL,
    project_name VARCHAR(500) NOT NULL,
    student_name VARCHAR(255),
    student_email VARCHAR(255),
    research_topic TEXT,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'ahiya',
    docx_url TEXT NOT NULL,
    html_url TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP
);

CREATE TABLE admin_sessions (
    id SERIAL PRIMARY KEY,
    token VARCHAR(500) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE project_sessions (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) REFERENCES projects(project_id),
    token VARCHAR(500) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);
```

**ORM vs Raw SQL:**
- **ORM (Prisma, TypeORM):** Type safety, migrations, easier development
- **Raw SQL (pg library):** More control, less abstraction, simpler for small schema

**Recommendation: Prisma for Next.js**
- Type-safe queries
- Built-in migrations
- Great developer experience

**Complexity: LOW**
- Simple schema with minimal relationships
- Standard CRUD operations

---

## Data Flow Patterns

### Pattern 1: Admin Project Creation (Full Cycle)

```
┌─────────────────┐
│   Admin Form    │ User fills fields + selects files
└────────┬────────┘
         │
         ↓ Client-side validation (file type, size)
┌─────────────────┐
│  FormData API   │ Construct multipart payload
└────────┬────────┘
         │
         ↓ POST /api/admin/projects (with Authorization header)
┌─────────────────┐
│  API Handler    │ Verify JWT, extract form data
└────────┬────────┘
         │
         ↓ Validate files (MIME type, size, virus scan)
┌─────────────────┐
│ File Validator  │ Check for self-contained HTML
└────────┬────────┘
         │
         ↓ Upload to storage (S3 or filesystem)
┌─────────────────┐
│ Storage Layer   │ Save files, return URLs
└────────┬────────┘
         │
         ↓ Hash password (bcrypt)
┌─────────────────┐
│  Auth Utils     │ Generate password if empty
└────────┬────────┘
         │
         ↓ Insert into database
┌─────────────────┐
│   PostgreSQL    │ Create project record
└────────┬────────┘
         │
         ↓ Generate unique project_id
┌─────────────────┐
│  ID Generator   │ nanoid or uuid
└────────┬────────┘
         │
         ↓ Return success response
┌─────────────────┐
│  API Response   │ { project_id, project_url, password }
└────────┬────────┘
         │
         ↓ Display success modal
┌─────────────────┐
│  Success UI     │ Show link + password with copy buttons
└─────────────────┘
```

**Critical Integration Points:**
1. **Frontend → Backend:** FormData with progress tracking
2. **Backend → Storage:** File upload with error handling
3. **Backend → Database:** Atomic transaction (rollback if any step fails)
4. **Backend → Frontend:** Success response with credentials

**Error Handling Strategy:**
- **File too large:** Catch before upload, display error
- **Upload fails:** Retry mechanism OR clear error message
- **DB insert fails:** Delete uploaded files, rollback transaction
- **Network timeout:** Frontend timeout (60s), backend timeout (120s)

**Complexity: HIGH**
- 8 distinct integration points
- Multiple failure scenarios requiring rollback
- File upload adds latency (10-30 seconds for large files)

---

### Pattern 2: Student Authentication & Access (Session Flow)

```
┌─────────────────┐
│  Click Link     │ /preview/:project_id
└────────┬────────┘
         │
         ↓ Check for existing session token (cookie)
┌─────────────────┐
│ Session Check   │ If valid token exists, skip to project view
└────────┬────────┘
         │
         ↓ No valid session → Show password prompt
┌─────────────────┐
│ Password Form   │ User enters password
└────────┬────────┘
         │
         ↓ POST /api/preview/:project_id/verify
┌─────────────────┐
│  API Handler    │ Fetch project from DB
└────────┬────────┘
         │
         ↓ Compare hash (bcrypt.compare)
┌─────────────────┐
│  Auth Service   │ Validate password
└────────┬────────┘
         │
         ↓ If valid, create session
┌─────────────────┐
│ Session Store   │ Generate JWT, store in DB + cookie
└────────┬────────┘
         │
         ↓ Increment view_count, update last_accessed
┌─────────────────┐
│   PostgreSQL    │ Update project record
└────────┬────────┘
         │
         ↓ Return session token
┌─────────────────┐
│  API Response   │ { valid: true, token }
└────────┬────────┘
         │
         ↓ Set httpOnly cookie
┌─────────────────┐
│  Frontend       │ Store token, redirect to project view
└────────┬────────┘
         │
         ↓ Fetch project data
┌─────────────────┐
│  GET /api/      │ Fetch with session token
│  preview/:id    │
└────────┬────────┘
         │
         ↓ Render project page
┌─────────────────┐
│  Project UI     │ Display HTML + download button
└─────────────────┘
```

**Critical Integration Points:**
1. **Frontend → Backend:** Password verification with rate limiting
2. **Backend → Database:** Session creation + project update (atomic)
3. **Backend → Frontend:** Cookie-based session management
4. **Frontend → Backend:** Authenticated request for project data

**Session Management Strategy:**
- **Token storage:** httpOnly cookie (prevents XSS)
- **Token expiration:** 24 hours OR on browser close
- **Token refresh:** Not needed for MVP (one-time access pattern)
- **Multi-device:** Same password works on multiple devices (new session each)

**Security Considerations:**
- **Rate limiting:** Max 5 password attempts per 15 minutes (by IP + project_id)
- **Token invalidation:** Delete on logout OR session timeout
- **HTTPS only:** Session cookies require secure flag

**Complexity: MEDIUM**
- Standard authentication flow
- Session management adds state complexity
- Rate limiting requires additional logic

---

### Pattern 3: HTML Report Rendering (Iframe Approach)

```
┌─────────────────┐
│  Project View   │ Authenticated user on /preview/:id
└────────┬────────┘
         │
         ↓ Fetch project data
┌─────────────────┐
│  GET /api/      │ { html_url, docx_url, metadata }
│  preview/:id    │
└────────┬────────┘
         │
         ↓ Render iframe with html_url
┌─────────────────┐
│  <iframe>       │ src="/api/html/:project_id"
│                 │ sandbox="allow-scripts allow-same-origin"
└────────┬────────┘
         │
         ↓ Iframe requests HTML content
┌─────────────────┐
│  GET /api/      │ Serve HTML file from storage
│  html/:id       │ Validate session token
└────────┬────────┘
         │
         ↓ Storage retrieval
┌─────────────────┐
│  S3 or FS       │ Read HTML file
└────────┬────────┘
         │
         ↓ Return HTML content
┌─────────────────┐
│  API Response   │ Content-Type: text/html
└────────┬────────┘
         │
         ↓ Browser renders in iframe
┌─────────────────┐
│  HTML Render    │ Plotly graphs load, interactions work
└────────┬────────┘
         │
         ↓ Adjust iframe height (postMessage)
┌─────────────────┐
│  Parent Window  │ Resize iframe to fit content
└─────────────────┘
```

**Iframe Communication (for height adjustment):**

**Inside HTML file (injected script):**
```javascript
window.addEventListener('load', () => {
  const height = document.body.scrollHeight;
  window.parent.postMessage({ type: 'resize', height }, '*');
});
```

**Parent page:**
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'resize') {
    iframe.style.height = event.data.height + 'px';
  }
});
```

**Alternative: Direct Injection (if HTML is fully trusted)**
```javascript
// Fetch HTML content as string
const html = await fetch('/api/html/:id').then(r => r.text());

// Inject into DOM
<div dangerouslySetInnerHTML={{ __html: html }} />
```

**Pros/Cons:**

| Approach | Pros | Cons |
|----------|------|------|
| **Iframe** | Security isolation, no CSS conflicts | Height management complexity, slower load |
| **Direct** | Simpler, faster, better responsive | XSS risk, CSS conflicts, global scope pollution |

**Recommendation: Iframe for MVP (security first)**

**Complexity: MEDIUM**
- Iframe sizing requires postMessage communication
- Need to ensure Plotly libraries work in iframe
- Mobile responsiveness testing critical

---

## Form Handling & Validation Strategy

### Admin Project Creation Form

**Client-Side Validation (Pre-Submit):**
```javascript
// Required fields
✓ project_name: not empty, max 500 chars
✓ student_name: not empty, max 255 chars
✓ student_email: valid email format (regex)
✓ research_topic: not empty
✓ docx_file: .docx extension, size < 50 MB
✓ html_file: .html extension, size < 50 MB
✓ password: optional, but if provided, min 8 chars

// Real-time feedback
- Show error message below field on blur
- Disable submit button until all valid
- Display file size and preview after selection
```

**Server-Side Validation (Post-Submit):**
```javascript
// Security validation
✓ JWT token valid and not expired
✓ MIME type matches extension (prevent file spoofing)
✓ File content scan (check for scripts in DOCX)
✓ HTML self-containment check (warn if external resources)
✓ Password hash generation (bcrypt rounds: 10)

// Business validation
✓ Project name not too long for display
✓ Email format (secondary check)
✓ Unique project_id generation (retry if collision)
```

**Error Display Strategy:**
```javascript
// Field-level errors (inline)
<input name="student_email" />
<span class="error">Invalid email format</span>

// Form-level errors (banner)
<div class="alert alert-error">
  File upload failed. Please try again.
</div>

// Success feedback (modal)
<dialog>
  ✓ Project created successfully!
  Link: [copy button]
  Password: [copy button]
</dialog>
```

**Complexity: MEDIUM**
- 8 fields with different validation rules
- File validation requires MIME type checking
- Hebrew text input (RTL) requires special handling

---

### Password Entry Form (Student)

**Client-Side Validation:**
```javascript
✓ password: not empty
✓ No real-time validation (single field)
```

**Server-Side Validation:**
```javascript
✓ Project exists (404 if not)
✓ Password matches hash (bcrypt.compare)
✓ Rate limiting check (429 if exceeded)
```

**Error Display:**
```html
<!-- Hebrew error message -->
<div class="error-message" dir="rtl">
  סיסמה שגויה. אנא נסה שוב.
</div>

<!-- Attempt counter (optional) -->
<div class="info-message" dir="rtl">
  נותרו 3 ניסיונות
</div>
```

**UX Considerations:**
- **No "Forgot Password":** Students must contact Ahiya
- **No account lockout (MVP):** Rate limiting prevents brute force
- **Clear password visibility toggle:** Eye icon to show/hide (accessibility)

**Complexity: LOW**
- Single field validation
- Hebrew error messaging
- Rate limiting adds minor complexity

---

## Navigation & State Management

### Admin Panel Navigation

```
/admin (login page if not authenticated)
  ↓
/admin/dashboard (project list)
  ├─→ [Create Project] → Modal (stays on dashboard)
  ├─→ [View Project] → Opens /preview/:id in new tab
  ├─→ [Delete Project] → Confirmation modal → Refresh list
  └─→ [Logout] → Clear session → /admin (login)
```

**State Requirements:**
- **Authentication state:** JWT token (localStorage OR cookie)
- **Project list state:** Array of projects (refetch after create/delete)
- **Form state:** Project creation modal (controlled inputs)
- **UI state:** Loading, error messages, modals

**State Management Approach:**
- **Simple (MVP):** React useState + useEffect
- **Advanced:** React Query for server state + Zustand for client state

**Complexity: LOW-MEDIUM**
- Linear navigation, no deep nesting
- State mostly server-driven (refetch after mutations)

---

### Student Project Viewer Navigation

```
/preview/:project_id (password prompt)
  ↓ (after authentication)
/preview/:project_id (project view)
  ├─→ Scroll/interact with HTML report
  └─→ [Download DOCX] → Initiates download
```

**State Requirements:**
- **Session state:** Token (cookie, managed by browser)
- **Project data:** HTML content, metadata (fetch once)
- **UI state:** Loading, error (if fetch fails)

**State Management Approach:**
- **Simple:** React useState for project data
- **No global state needed** (single page app)

**Complexity: LOW**
- Single page, minimal state
- Session managed by cookies (stateless on client)

---

## Error Handling & Edge Cases

### Error Taxonomy

#### Category 1: User Input Errors (400-level)

**Scenario:** Invalid file type
```
User Action: Upload .pdf instead of .docx
Client Detection: File extension check
Server Detection: MIME type validation
Error Message: "Only .docx and .html files are accepted"
Recovery: Allow user to select different file
```

**Scenario:** File too large
```
User Action: Upload 75 MB HTML file
Client Detection: File.size > 50 * 1024 * 1024
Server Detection: Request payload size check
Error Message: "File exceeds 50 MB limit. Please compress or split."
Recovery: User must reduce file size externally
```

**Scenario:** Wrong password
```
User Action: Enter incorrect password
Server Detection: bcrypt.compare returns false
Error Message (Hebrew): "סיסמה שגויה. אנא נסה שוב."
Recovery: Allow retry (with rate limiting)
```

---

#### Category 2: Network/Infrastructure Errors (500-level)

**Scenario:** Upload timeout
```
Cause: Large file + slow connection
Detection: Frontend timeout (60s), backend timeout (120s)
Error Message: "Upload timed out. Please check your connection and try again."
Recovery: Retry mechanism with exponential backoff
```

**Scenario:** Storage failure (S3 down)
```
Cause: AWS S3 service outage
Detection: Upload API returns 503
Error Message: "File storage temporarily unavailable. Please try again in a few minutes."
Recovery: Retry with delay OR fallback to local storage
```

**Scenario:** Database connection lost
```
Cause: PostgreSQL server restart
Detection: Query timeout or connection error
Error Message: "Service temporarily unavailable. Please try again."
Recovery: Backend retries connection, frontend shows retry button
```

---

#### Category 3: Authentication/Authorization Errors

**Scenario:** Session expired
```
Cause: Token expired (24 hours)
Detection: JWT verification fails (401 response)
User Impact: Student viewing project, session expires mid-session
Error Message: "Your session has expired. Please enter the password again."
Recovery: Redirect to password prompt with context
```

**Scenario:** Admin token expired
```
Cause: Inactivity timeout (30 minutes)
Detection: API returns 401 on admin request
Error Message: "Session expired. Please log in again."
Recovery: Redirect to /admin (login) with redirect_to parameter
```

---

#### Category 4: Data Integrity Errors

**Scenario:** Project deleted while student viewing
```
Cause: Admin deletes project while student has active session
Detection: GET /api/preview/:id returns 404
Error Message (Hebrew): "הפרויקט לא נמצא. אנא פנה לסטטיסטיקאי."
Recovery: Display contact information for Ahiya
```

**Scenario:** File corrupted in storage
```
Cause: Storage system error, incomplete upload
Detection: File retrieval returns partial/corrupted data
Error Message: "File is corrupted. Please contact support."
Recovery: Admin re-uploads files
```

---

### Edge Case Handling

#### Edge Case 1: HTML with External Dependencies
```
Scenario: Uploaded HTML references external CSS/JS
Detection: Server scans HTML for <link> and <script src="http...">
Warning Message: "⚠️ HTML contains external resources. Report may not work offline."
Options:
  [Cancel Upload] [Upload Anyway] [Learn More]
Recommendation: Display warning but allow upload (non-blocking)
```

#### Edge Case 2: Mobile Access for Large HTML
```
Scenario: Student accesses 5 MB HTML report on mobile (slow 3G)
Detection: User-Agent header indicates mobile + performance API
Optimization:
  - Show loading skeleton while HTML loads
  - Display "Loading large report..." progress bar
  - Offer "Download to view later" option
Fallback: If load fails, show download-only option
```

#### Edge Case 3: Multiple Sessions (Same Project)
```
Scenario: Student accesses same project from phone + laptop
Expected Behavior: Both sessions valid simultaneously
Implementation: Session tokens stored per-device (different cookies)
View Count: Increment only on first access per unique session
```

#### Edge Case 4: Hebrew + English Mixed Content
```
Scenario: Student name is "John Smith" (English) but project in Hebrew
Expected Behavior: Text direction handles mixed content gracefully
Implementation: Use CSS unicode-bidi and dir="auto" attributes
Testing: Verify with mixed-direction test cases
```

---

## Authentication Flows

### Flow 1: Admin Login

```
┌─────────────────┐
│  /admin         │ Landing page (login form)
└────────┬────────┘
         │
         ↓ User enters username + password
┌─────────────────┐
│  Login Form     │ Client-side validation (not empty)
└────────┬────────┘
         │
         ↓ POST /api/admin/login
┌─────────────────┐
│  API Handler    │ Validate credentials (bcrypt)
└────────┬────────┘
         │
         ↓ If valid, generate JWT
┌─────────────────┐
│  JWT Service    │ Sign token with secret, set expiration
└────────┬────────┘
         │
         ↓ Store session in DB (optional, for revocation)
┌─────────────────┐
│  PostgreSQL     │ INSERT INTO admin_sessions
└────────┬────────┘
         │
         ↓ Return token
┌─────────────────┐
│  API Response   │ { token, expires }
└────────┬────────┘
         │
         ↓ Store in localStorage OR httpOnly cookie
┌─────────────────┐
│  Frontend       │ Save token, redirect to /admin/dashboard
└─────────────────┘
```

**Security Considerations:**
- **Password storage:** Never store plaintext, always bcrypt hash
- **JWT secret:** Strong random string (min 32 chars), environment variable
- **Token expiration:** 30 minutes for admin (shorter = more secure)
- **Refresh token:** Not needed for MVP (re-login acceptable)
- **Rate limiting:** Max 5 login attempts per 15 minutes (by IP)

**Complexity: LOW**
- Standard JWT authentication
- Single admin user (no roles)

---

### Flow 2: Per-Project Password Access

```
┌─────────────────┐
│ /preview/:id    │ Student lands on password prompt
└────────┬────────┘
         │
         ↓ Enter password
┌─────────────────┐
│ Password Form   │ Submit on Enter or button click
└────────┬────────┘
         │
         ↓ POST /api/preview/:id/verify
┌─────────────────┐
│  API Handler    │ Fetch project from DB
└────────┬────────┘
         │
         ↓ Check rate limit (by IP + project_id)
┌─────────────────┐
│ Rate Limiter    │ Redis or in-memory store
└────────┬────────┘
         │
         ↓ If allowed, verify password
┌─────────────────┐
│  bcrypt.compare │ Compare input with password_hash
└────────┬────────┘
         │
         ↓ If valid, create session
┌─────────────────┐
│ Session Service │ Generate token (JWT or random string)
└────────┬────────┘
         │
         ↓ Store session in DB
┌─────────────────┐
│  PostgreSQL     │ INSERT INTO project_sessions
└────────┬────────┘
         │
         ↓ Set httpOnly cookie
┌─────────────────┐
│  Set-Cookie     │ session_token, secure, sameSite
└────────┬────────┘
         │
         ↓ Return success
┌─────────────────┐
│  API Response   │ { valid: true }
└────────┬────────┘
         │
         ↓ Redirect to project view
┌─────────────────┐
│  Frontend       │ Navigate to /preview/:id (project page)
└─────────────────┘
```

**Session Token Strategy:**
- **Token type:** JWT (self-contained) OR random string (DB lookup)
- **Token storage:** httpOnly cookie (prevents XSS)
- **Token expiration:** 24 hours OR on browser close
- **Token refresh:** Not needed (students access once)

**Rate Limiting Strategy:**
- **Key:** Composite key (IP + project_id)
- **Limit:** 5 attempts per 15 minutes
- **Storage:** Redis (ideal) OR in-memory Map (MVP)
- **Error:** 429 Too Many Requests after limit

**Complexity: MEDIUM**
- Password verification is simple
- Session management adds complexity
- Rate limiting requires additional state store

---

### Flow 3: Session Validation (Every Request)

```
┌─────────────────┐
│  API Request    │ Any authenticated endpoint
└────────┬────────┘
         │
         ↓ Extract token from cookie or header
┌─────────────────┐
│  Middleware     │ Parse Authorization header or cookie
└────────┬────────┘
         │
         ↓ Verify token
┌─────────────────┐
│  JWT.verify     │ Check signature, expiration
└────────┬────────┘
         │
         ↓ If valid, decode payload
┌─────────────────┐
│  Token Payload  │ { user_id, role, project_id }
└────────┬────────┘
         │
         ↓ Attach to request context
┌─────────────────┐
│  req.user       │ Request handler has access to user info
└────────┬────────┘
         │
         ↓ Proceed to route handler
┌─────────────────┐
│  Route Logic    │ Execute business logic
└─────────────────┘
```

**Token Validation Errors:**
- **Token missing:** 401 Unauthorized
- **Token expired:** 401 Unauthorized (redirect to login)
- **Token invalid:** 401 Unauthorized (tampered or wrong secret)
- **Token revoked:** 403 Forbidden (DB lookup shows revoked)

**Complexity: LOW**
- Standard middleware pattern
- JWT libraries handle verification

---

## Responsive Design Requirements

### Desktop (Admin Panel)
**Target Screen Size:** 1280px - 1920px

**Layout:**
- **Header:** Logo + "Create Project" button + Logout
- **Project List:** Table view OR card grid (3-4 columns)
- **Create Modal:** Centered overlay, 600px width
- **Actions:** Visible buttons (View, Delete, Copy Link)

**Typography:**
- **Hebrew fonts:** Use Rubik, Heebo, or Noto Sans Hebrew
- **Font size:** 16px base, 24px headings
- **Line height:** 1.6 (better readability for Hebrew)

---

### Tablet (Hybrid Use)
**Target Screen Size:** 768px - 1024px

**Layout:**
- **Header:** Stacked OR horizontal with smaller logo
- **Project List:** 2-column grid OR single column
- **Create Modal:** Full width with padding
- **Actions:** Smaller buttons OR dropdown menu

---

### Mobile (Student Viewer - CRITICAL)
**Target Screen Size:** 320px - 768px

**Layout:**
- **Password Screen:** Centered, single input, large button
- **Project View:**
  - Sticky header with project name
  - Full-width HTML iframe
  - Fixed-bottom download button OR floating action button
- **HTML Report:** Must be fully scrollable and interactive

**Interactive Elements:**
- **Plotly graphs:** Touch-friendly zoom/pan
- **Expandable sections:** Large tap targets (min 44px)
- **Download button:** Fixed position for easy access

**Performance:**
- **Loading states:** Skeleton screens while HTML loads
- **Image optimization:** Compress embedded images in HTML
- **Lazy loading:** Load graphs as user scrolls (if possible)

**Testing Checklist:**
- [ ] iPhone SE (375px width) - smallest target
- [ ] iPhone 12/13/14 (390px width) - common
- [ ] Android (360px width) - common
- [ ] iPad (768px width) - tablet

**Complexity: MEDIUM-HIGH**
- HTML iframe responsiveness is challenging
- Plotly graphs need touch optimization
- Hebrew RTL layout on mobile requires extra testing

---

## Hebrew RTL Support Strategy

### CSS Direction Handling

**Global RTL:**
```css
html[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

/* Flip flex/grid layouts */
.row {
  flex-direction: row-reverse;
}

/* Flip margins/padding */
.card {
  margin-right: 0;
  margin-left: auto;
}
```

**Mixed Content (Hebrew + English):**
```html
<!-- Auto-detect direction per element -->
<p dir="auto">John Smith - חוקר</p>

<!-- Force LTR for email addresses -->
<span dir="ltr">michald2211@gmail.com</span>
```

---

### Form Input RTL

**Text Inputs:**
```html
<input type="text" dir="rtl" placeholder="שם הסטודנט" />
```

**Email Inputs (Force LTR):**
```html
<input type="email" dir="ltr" placeholder="student@example.com" />
```

**Textareas (Auto-detect):**
```html
<textarea dir="auto" placeholder="נושא המחקר"></textarea>
```

---

### Icon & Button Placement

**Arrow Icons (Flip for RTL):**
```css
/* Flip horizontally */
.icon-arrow {
  transform: scaleX(-1);
}
```

**Action Buttons (Right-to-Left Order):**
```html
<!-- In RTL, Cancel appears on right, Submit on left -->
<div class="button-group" dir="rtl">
  <button>ביטול</button>
  <button>שלח</button>
</div>
```

---

### Testing Strategy

**Manual Testing:**
- [ ] All Hebrew text displays correctly (no gibberish)
- [ ] Text alignment is right-to-left
- [ ] Buttons/icons are mirrored appropriately
- [ ] Mixed Hebrew/English displays properly
- [ ] Email addresses remain left-to-right

**Browser Testing:**
- [ ] Chrome (desktop + mobile)
- [ ] Firefox (desktop + mobile)
- [ ] Safari (iOS)
- [ ] Edge

**Complexity: MEDIUM**
- CSS RTL is well-supported
- Mixed content requires careful direction attributes
- Icon flipping needs case-by-case decisions

---

## Recommendations for Master Plan

1. **Prioritize Mobile-First for Student Viewer**
   - Students will primarily access reports on mobile devices (WhatsApp links)
   - HTML iframe responsiveness is non-negotiable
   - Test on real devices early (not just browser DevTools)

2. **Use Iframe for HTML Embedding (Security First)**
   - Direct DOM injection has XSS risks with user-uploaded content
   - Iframe provides security boundary despite complexity
   - Invest in proper iframe height adjustment (postMessage)

3. **Start with Filesystem Storage, Migrate to S3 Later**
   - MVP can use local filesystem (simpler, no AWS setup)
   - Migration to S3 is straightforward (change storage layer only)
   - Defer S3 until file volume justifies cost/complexity

4. **Implement Rate Limiting Early (Essential for Security)**
   - Password brute-force attacks are primary security risk
   - Use simple in-memory Map for MVP (Redis for production)
   - 5 attempts per 15 minutes is reasonable balance

5. **Hebrew RTL Should Be Design-First (Not Retrofit)**
   - Build all components with RTL support from day one
   - Use CSS logical properties (margin-inline-start vs margin-left)
   - Test with Hebrew content during development, not after

6. **Session Management: Cookie-Based (Not localStorage)**
   - httpOnly cookies prevent XSS token theft
   - Simpler than manual header management
   - Automatic expiration on browser close (better security)

7. **Admin Panel Can Be Desktop-Only for MVP**
   - Ahiya uses desktop for file uploads (mobile upload UX is poor)
   - Responsive admin panel adds complexity with minimal value
   - Focus mobile optimization effort on student viewer

8. **File Upload Progress Is Critical UX**
   - 50 MB files can take 10-30 seconds to upload
   - Users will abandon without progress feedback
   - Use XMLHttpRequest.upload.onprogress (not fetch)

9. **Error Messages Must Be Hebrew (Student-Facing)**
   - All student-visible errors in Hebrew
   - Admin panel can be English OR bilingual
   - Maintain error message translations in constants file

10. **HTML Self-Containment Check Is Low Priority**
    - Claude generates self-contained HTML reliably
    - Warning is nice-to-have, not blocker
    - Can be added post-MVP if needed

---

## Integration Complexity Summary

| Integration Point | Complexity | Critical Path | Risk Level |
|-------------------|------------|---------------|------------|
| Admin Login (JWT) | LOW | Yes | LOW |
| Project Creation API | MEDIUM-HIGH | Yes | MEDIUM |
| File Upload (multipart) | HIGH | Yes | MEDIUM |
| Storage (Filesystem) | LOW | Yes | LOW |
| Storage (S3) | MEDIUM | No (defer) | LOW |
| Database (PostgreSQL) | LOW | Yes | LOW |
| Password Verification | LOW-MEDIUM | Yes | LOW |
| Session Management | MEDIUM | Yes | MEDIUM |
| HTML Rendering (iframe) | MEDIUM | Yes | HIGH |
| DOCX Download | LOW | Yes | LOW |
| Rate Limiting | MEDIUM | No (MVP) | MEDIUM |
| Hebrew RTL Support | MEDIUM | Yes | MEDIUM |
| Mobile Responsiveness | MEDIUM-HIGH | Yes | HIGH |

**Critical Path (Must-Have for MVP):**
1. Admin login + project creation
2. File upload with progress
3. Password-protected access
4. HTML iframe rendering (mobile-optimized)
5. DOCX download
6. Hebrew RTL support

**Defer to Post-MVP:**
- AWS S3 migration
- Advanced rate limiting (Redis)
- Search/filter in project list
- Analytics tracking
- Admin panel mobile optimization

---

## Technology Recommendations

### Frontend Framework
**Recommendation: Next.js 14+ with App Router**

**Rationale:**
- Server-side rendering for password prompt (better UX)
- API routes for backend (monorepo simplicity)
- Built-in optimization (images, fonts)
- TypeScript support (type safety)
- Excellent Hebrew font handling

**Alternative: React + Express**
- More flexibility, but requires separate backend setup
- Not recommended for solo developer (Ahiya)

---

### Styling
**Recommendation: Tailwind CSS**

**Rationale:**
- RTL support via `dir="rtl"` on html tag
- Responsive utilities (mobile-first)
- Fast development (utility classes)
- Consistent design system

**RTL Configuration:**
```javascript
// tailwind.config.js
module.exports = {
  plugins: [require('tailwindcss-rtl')],
}
```

---

### State Management
**Recommendation: React Query + Zustand**

**React Query (Server State):**
- Automatic refetching after mutations
- Loading/error states handled
- Cache management

**Zustand (Client State):**
- Lightweight (1 KB)
- Simple API (no boilerplate)
- TypeScript support

**Alternative: Just useState + useEffect (simpler for MVP)**

---

### File Upload
**Recommendation: XMLHttpRequest (not fetch)**

**Rationale:**
- Progress tracking via `upload.onprogress`
- Abort capability (cancel upload)
- Fetch API doesn't support upload progress yet

**Implementation:**
```javascript
const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (e) => {
  const percent = (e.loaded / e.total) * 100;
  setProgress(percent);
};
xhr.open('POST', '/api/admin/projects');
xhr.send(formData);
```

---

### Authentication
**Recommendation: jose (JWT library)**

**Rationale:**
- Modern, lightweight JWT library
- Async API (non-blocking)
- Better security than jsonwebtoken

**Alternative: next-auth (if multi-provider needed later)**

---

### Database ORM
**Recommendation: Prisma**

**Rationale:**
- Type-safe queries (TypeScript)
- Migration system built-in
- Great developer experience
- Excellent Next.js integration

**Schema Example:**
```prisma
model Project {
  id            Int      @id @default(autoincrement())
  projectId     String   @unique
  projectName   String
  studentName   String?
  studentEmail  String?
  passwordHash  String
  docxUrl       String
  htmlUrl       String
  viewCount     Int      @default(0)
  createdAt     DateTime @default(now())
  lastAccessed  DateTime?
}
```

---

### File Storage (MVP)
**Recommendation: Local Filesystem**

**Rationale:**
- Zero configuration
- No external dependencies
- Fast local development
- Easy migration to S3 later

**Directory Structure:**
```
/uploads
  /{project_id}
    /findings.docx
    /report.html
```

---

### Session Storage
**Recommendation: httpOnly Cookies**

**Rationale:**
- XSS protection (JavaScript can't access)
- Automatic expiration
- Browser handles storage

**Configuration:**
```javascript
res.setHeader('Set-Cookie', serialize('session_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24, // 24 hours
  path: '/'
}));
```

---

### Rate Limiting (MVP)
**Recommendation: In-Memory Map**

**Rationale:**
- Simple implementation
- No external dependencies
- Sufficient for MVP (<100 projects)

**Implementation:**
```javascript
const attempts = new Map(); // key: IP_projectId, value: count

function checkRateLimit(ip, projectId) {
  const key = `${ip}_${projectId}`;
  const count = attempts.get(key) || 0;
  if (count >= 5) return false;
  attempts.set(key, count + 1);
  setTimeout(() => attempts.delete(key), 15 * 60 * 1000);
  return true;
}
```

**Production:** Migrate to Redis for multi-instance support

---

## Notes & Observations

### Observation 1: Student-Centric Mobile Experience
The platform's success hinges on mobile UX for students. Hebrew-speaking graduate students in Israel primarily access web content via smartphones (WhatsApp link sharing is dominant). The HTML iframe rendering on mobile with Plotly graphs is the highest technical risk.

**Mitigation:**
- Early mobile testing on real devices (iPhone, Android)
- Fallback to download-only if iframe fails on mobile
- Consider progressive enhancement (simplified view for slow connections)

---

### Observation 2: File Upload Flow Is Critical Path
The admin project creation flow involves uploading 50 MB files, which is slow and error-prone. This is Ahiya's primary interaction with the platform.

**Key UX Enhancements:**
- Prominent progress bar (percentage + estimated time remaining)
- Ability to cancel upload
- Resume capability if upload fails mid-transfer
- Client-side file preview before upload (thumbnail for HTML)

---

### Observation 3: Hebrew RTL Impacts Every Component
RTL support is not a checkbox feature - it affects layout, icons, text alignment, and form design across the entire platform. Building with RTL-first mindset saves significant refactoring later.

**Design System Decisions:**
- Use CSS logical properties (start/end instead of left/right)
- All icons should have RTL variants
- Test every component with Hebrew text during development

---

### Observation 4: Security Model Is Simple But Sufficient
The platform has two authentication layers:
1. Admin: Single user (Ahiya) with JWT
2. Projects: Per-project passwords (no accounts)

This simplicity is appropriate for MVP. No need for OAuth, RBAC, or complex permission systems.

**Future Consideration:**
- If Guy needs admin access (view-only), add role-based permissions
- If platform scales to multiple statisticians, add user management

---

### Observation 5: HTML Self-Containment Is Assumed
The vision assumes Claude generates fully self-contained HTML (inline CSS, embedded Plotly, no external resources). This is critical for offline access.

**Validation Strategy:**
- Server-side HTML parsing (check for `<link>`, `<script src="http">`)
- Display warning if external resources detected
- Allow upload anyway (trust Claude, but verify)

**Edge Case:**
- If Claude behavior changes (starts using CDN links), admin sees warning
- Ahiya can manually inline resources OR contact Claude support

---

### Observation 6: Session Management Can Be Simple
Students access projects once (or a few times during thesis period). No need for complex session refresh, remember-me, or multi-device sync.

**Session Strategy:**
- 24-hour expiration (generous for student use)
- No refresh token (re-enter password is acceptable)
- Single session per device (multiple devices = multiple sessions)

---

### Observation 7: Admin Panel Desktop-Only Is Reasonable
Ahiya uploads files from a desktop/laptop (file selection UX is poor on mobile). Admin panel mobile responsiveness is low ROI for MVP.

**Recommendation:**
- Build admin panel for 1280px+ screens
- Add "Best viewed on desktop" notice if accessed on mobile
- Focus mobile optimization effort on student viewer

---

### Observation 8: Download Analytics Are Valuable
Tracking view_count and last_accessed helps Ahiya understand project usage (did student actually view report?).

**Enhanced Analytics (Post-MVP):**
- Time spent on each section (heatmap)
- Which graphs students interact with most
- Bounce rate (students who enter password but don't view)

**Implementation:**
- MVP: Simple counters (view_count, last_accessed)
- Post-MVP: Event tracking with timestamps

---

### Observation 9: Error Recovery Is More Important Than Prevention
File uploads, network requests, and external storage introduce many failure points. Graceful error recovery is more valuable than trying to prevent all errors.

**Error Recovery Patterns:**
- **Retry buttons:** Allow user to retry failed action
- **Partial rollback:** If file upload succeeds but DB insert fails, delete files
- **Clear error messages:** Explain what went wrong and what user should do
- **Contact info:** Provide Ahiya's email for unrecoverable errors

---

### Observation 10: Platform Is Workflow Tool, Not Report Generator
The platform's scope is limited to delivery and access management. Statistical analysis happens outside (Claude Chat). This is intentional - keep platform focused on what it does best.

**Out of Scope (Correctly):**
- Direct Claude API integration (complexity explosion)
- Data analysis capabilities (not platform's job)
- Report editing (generated reports are final)

**Future Consideration:**
- If Ahiya wants to automate report generation, that's a separate project
- Platform API could accept programmatic uploads (via CLI or script)

---

*Exploration completed: 2025-11-26*
*This report informs master planning decisions for User Experience & Integration Points*
