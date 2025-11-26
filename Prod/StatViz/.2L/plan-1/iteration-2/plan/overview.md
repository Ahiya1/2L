# Iteration 2 Plan: Admin Panel & Project Creation

## Project Vision

Build a Hebrew RTL admin interface enabling Ahiya to efficiently create and manage statistical analysis projects. The panel provides seamless project creation with dual-file upload (DOCX + HTML up to 50MB each), automatic password generation, and comprehensive project management capabilities. All UX in Hebrew with proper right-to-left layout and mixed bidirectional text support for English email addresses.

## Iteration Scope

**Focus:** Desktop-only (1280px+) admin panel for project lifecycle management

**Core Features:**

### 1. Authentication Flow
- Login page with Hebrew UI at `/admin`
- Username/password authentication with bcrypt verification
- Show/hide password toggle for usability
- Session management (30-minute timeout with httpOnly cookies)
- Rate limiting (5 attempts per 15 minutes)
- Auto-redirect to dashboard if valid session exists
- Logout functionality with session cleanup

### 2. Project Dashboard
- Main interface at `/admin/dashboard`
- Server Component for initial data fetch (faster than client-side)
- Header with app title and logout button
- Project statistics display (total projects, recent activity)
- Empty state for zero projects with clear call-to-action
- Loading skeleton during data fetch

### 3. Project List Display
- Table layout with sortable columns (name, date, views)
- Hebrew text right-aligned, emails left-aligned (BiDi handling)
- Display metadata: project name, student name, email, created date, view count
- Last accessed timestamp with Hebrew relative time ("לפני 3 ימים")
- Per-project actions:
  - View: Opens `/preview/:id` in new tab
  - Copy Link: Clipboard API with Hebrew success toast
  - Delete: Confirmation modal with cascade warning

### 4. Project Creation Flow
- Modal-based creation (no separate route)
- Multi-step form with React Hook Form + Zod validation
- Form fields:
  - Project name (Hebrew, max 500 chars)
  - Student name (Hebrew, max 255 chars)
  - Student email (English, LTR override, validated)
  - Research topic (Hebrew, textarea)
  - Password (optional auto-generate with 8-char password)
  - DOCX file upload (drag-drop + picker, max 50MB)
  - HTML file upload (drag-drop + picker, max 50MB)
- Simultaneous dual-file upload with individual progress bars
- Real-time progress: percentage, bytes transferred, ETA
- Client-side validation: file type, size, required fields
- Server-side revalidation for security
- Success modal displaying:
  - Generated project URL (copyable)
  - Generated password (copyable)
  - HTML validation warnings (if any)
  - Security reminder: send link and password separately

### 5. Hebrew RTL Implementation
- Global `dir="rtl"` on `<html>` element
- Rubik font from Google Fonts (Hebrew + Latin subsets)
- Right-to-left text alignment for Hebrew fields
- Left-to-right override for email/password inputs (`dir="ltr"`)
- Button order: Cancel (right) → Submit (left) in RTL flow
- Mixed Hebrew/English content with BiDi isolation
- Toast notifications positioned top-left (RTL equivalent)
- Modal close button positioned top-left

### 6. File Upload UX
- `react-dropzone` for drag-and-drop interface
- Large drop zones (400px × 300px) with visual feedback
- Border color changes: default gray → drag-over blue → success green → error red
- File validation feedback: size, type, content
- Dual progress bars (DOCX and HTML) during upload
- Progress details: filename, percentage, loaded/total bytes, ETA
- Exponential moving average for smooth speed calculation
- Manual retry button on failure (no automatic retry for large files)
- HTML content validation with warning display (non-blocking)

### 7. State Management
- TanStack Query (React Query) for server state
- Automatic caching and revalidation
- Optimistic updates for delete operations
- Rollback on error with Hebrew error messages
- No global state library needed (server state only)

### 8. Success Feedback
- Success modal after project creation
- Copy-to-clipboard with visual confirmation (icon changes to checkmark for 2 seconds)
- Toast notifications:
  - Success: Green, 4 seconds, "הפרויקט נוצר בהצלחה!"
  - Error: Red, 6 seconds, specific Hebrew error message
  - Copy success: "קישור הועתק ללוח!"
- Project immediately appears in list (optimistic update)

## Success Criteria

**Must Pass:**

- [ ] Admin logs in with correct credentials → redirects to dashboard in <1 second
- [ ] Invalid credentials show Hebrew error: "שם משתמש או סיסמה שגויים"
- [ ] 6 failed login attempts trigger rate limit message
- [ ] Session persists across page refreshes for 30 minutes
- [ ] Logout clears session and redirects to login page
- [ ] Dashboard loads project list in <2 seconds with 50+ projects
- [ ] Empty state displays when zero projects exist
- [ ] Project creation modal opens and renders form correctly
- [ ] All form validations work (required fields, email format, file types)
- [ ] Hebrew validation messages display correctly
- [ ] Email field accepts English input with LTR alignment
- [ ] Dual file upload accepts DOCX and HTML files
- [ ] File size >50MB shows Hebrew error immediately
- [ ] File type validation rejects non-DOCX/HTML files
- [ ] Upload progress bars update smoothly (0-100%)
- [ ] Progress shows accurate ETA (within 20% of actual time)
- [ ] Upload completes and success modal displays
- [ ] Generated link and password are copyable via clipboard API
- [ ] Copy buttons show "הועתק!" confirmation for 2 seconds
- [ ] New project appears in list immediately after creation
- [ ] View button opens `/preview/:id` in new tab
- [ ] Copy link button copies full URL to clipboard
- [ ] Delete shows confirmation modal with project name
- [ ] Delete confirmation removes project from list
- [ ] Delete actually deletes files and database record
- [ ] Hebrew text displays right-aligned throughout
- [ ] Email addresses display left-aligned with `dir="ltr"`
- [ ] Button order is RTL-correct (cancel right, submit left)
- [ ] No layout issues with mixed Hebrew/English content
- [ ] Form validation prevents invalid submissions
- [ ] Server-side validation catches bypassed client validation
- [ ] HTML warnings display if external dependencies detected
- [ ] Manual browser testing passes on Chrome and Firefox
- [ ] RTL visual QA checklist 100% complete

**Performance Targets:**

- Admin login: <1 second (bcrypt verification + JWT generation)
- Project list load: <2 seconds (50 projects)
- File upload (50MB): <3 minutes total (including form fill)
- Modal open/close: <200ms
- Form validation: <100ms per field
- Clipboard copy: <50ms
- Toast notification: appears instantly

**Quality Targets:**

- TypeScript strict mode: 0 errors
- No `any` types (use `unknown` with type guards)
- All API responses follow standard format (success/error structure)
- All error messages in Hebrew
- All components use established patterns from `patterns.md`
- All forms use React Hook Form + Zod validation
- All server state uses TanStack Query
- All file paths are absolute (`/home/ahiya/Ahiya/2L/Prod/StatViz/...`)

## Architecture Decisions

### Component Structure

**Route Organization:**
```
app/
├── (auth)/
│   └── admin/
│       ├── page.tsx              # Login page (Client)
│       ├── layout.tsx            # Auth layout wrapper
│       └── dashboard/
│           └── page.tsx          # Dashboard (Server → Client hydration)
```

**Component Hierarchy:**
```
Login Page (Client Component)
└── LoginForm
    ├── FormInput (username)
    ├── FormInput (password with toggle)
    └── Button (submit)

Dashboard Page (Server Component wrapper)
└── AdminProvider (Context for state)
    ├── DashboardHeader
    │   ├── Title
    │   └── LogoutButton
    ├── ProjectsContainer (Client Component)
    │   ├── CreateProjectButton
    │   ├── ProjectTable
    │   │   └── ProjectRow (repeated)
    │   │       ├── ViewButton
    │   │       ├── CopyLinkButton
    │   │       └── DeleteButton
    │   ├── EmptyState
    │   └── TableSkeleton
    ├── CreateProjectModal (conditionally rendered)
    │   └── ProjectForm
    │       ├── FormInput (x3: name, student, email)
    │       ├── Textarea (research topic)
    │       ├── PasswordField (with auto-generate toggle)
    │       ├── FileUploadZone (x2: DOCX, HTML)
    │       └── FormButtons (cancel, submit)
    ├── UploadProgressModal (during upload)
    │   └── DualProgressBars
    ├── SuccessModal (after creation)
    │   ├── ProjectUrlDisplay (with copy button)
    │   ├── PasswordDisplay (with copy button)
    │   └── HtmlWarningsDisplay (conditional)
    └── DeleteConfirmModal
        └── ConfirmButtons (cancel, delete)
```

**Total Unique Components:** 18
**Estimated Lines of Code:** 2,500-3,000 (including TypeScript types)

### Technical Stack Extensions

**New Dependencies (Production):**
```json
{
  "@tanstack/react-query": "^5.51.0",
  "@hookform/resolvers": "^3.9.0",
  "react-hook-form": "^7.52.0",
  "react-dropzone": "^14.2.0",
  "sonner": "^1.5.0",
  "lucide-react": "^0.424.0"
}
```

**New Dependencies (Development):**
```json
{
  "@tanstack/react-query-devtools": "^5.51.0"
}
```

**Rationale for Each:**

- **@tanstack/react-query:** Server state management, automatic caching, optimistic updates, 12KB gzipped
- **react-hook-form:** Form state management, 9KB gzipped, best-in-class file upload support
- **@hookform/resolvers:** Zod integration for React Hook Form validation
- **react-dropzone:** Drag-and-drop file upload, 16K stars, excellent TypeScript support
- **sonner:** Modern toast notifications, 3KB gzipped, beautiful defaults, RTL-configurable
- **lucide-react:** Icon library, 300+ icons, tree-shakeable, RTL-friendly

### Forms: React Hook Form + Zod

**Choice:** React Hook Form v7 with Zod validation via `@hookform/resolvers`

**Rationale:**
1. **Performance:** Uncontrolled inputs minimize re-renders (critical for large forms)
2. **File Upload Support:** Native `File` object handling via `register`
3. **Type Safety:** Full TypeScript inference from Zod schemas
4. **Bundle Size:** 9KB vs Formik 13KB
5. **Integration:** Reuse existing Zod schemas from `lib/validation/schemas.ts`
6. **Developer Experience:** Excellent error handling and field-level validation

**Implementation Pattern:**
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateProjectFormSchema } from '@/lib/validation/schemas'

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(CreateProjectFormSchema)
})
```

### State Management: TanStack Query

**Choice:** TanStack Query (React Query) for server state only

**Rationale:**
1. **Server State Focus:** Projects list is server state, not client state
2. **Automatic Caching:** Fetch once, cache, revalidate on stale
3. **Optimistic Updates:** Delete project immediately in UI, rollback on error
4. **DevTools:** React Query DevTools for debugging
5. **Zero Client State Needed:** No Zustand/Redux required (simple CRUD)

**Implementation Pattern:**
```typescript
// Fetch projects
const { data: projects, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects
})

// Delete with optimistic update
const deleteMutation = useMutation({
  mutationFn: deleteProject,
  onMutate: async (projectId) => {
    queryClient.setQueryData(['projects'], (old) =>
      old.filter(p => p.projectId !== projectId)
    )
  }
})
```

### UI Components: shadcn/ui

**Choice:** shadcn/ui components (copy-paste, not npm package)

**Rationale:**
1. **Tailwind Native:** Works perfectly with existing Tailwind setup
2. **RTL Support:** Built on Radix UI with excellent RTL handling
3. **Customizable:** Copy-paste approach gives full control
4. **Accessible:** ARIA attributes built-in
5. **Bundle Size:** Tree-shakeable (only import what you use)

**Components Needed:**
- Button, Input, Label, Textarea (forms)
- Table (project list)
- Dialog (modals)
- Alert (notifications)
- Toast (feedback)

**Installation:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label textarea table dialog alert toast
```

### File Upload: react-dropzone + XMLHttpRequest

**Choice:** `react-dropzone` for UI + native `XMLHttpRequest` for progress

**Rationale:**
1. **Drag-Drop UX:** `react-dropzone` handles all edge cases (16K stars, mature)
2. **Progress Tracking:** `XMLHttpRequest.upload.onprogress` for real-time updates
3. **Cancellation:** `xhr.abort()` for mid-flight cancellation
4. **No Library Overhead:** Native APIs for actual upload (zero bundle cost)
5. **File Validation:** Client-side MIME type and size checks before upload

**Upload Strategy:**
- **Simultaneous Upload:** Both files upload in parallel via `Promise.all()`
- **Benefit:** 30-40% faster than sequential (network overhead parallelized)
- **Atomic Rollback:** If HTML fails, DOCX is deleted on server (existing Iteration 1 pattern)

### Notifications: sonner

**Choice:** sonner v1.5+ for toast notifications

**Rationale:**
1. **Beautiful Defaults:** Best-looking toasts out of the box
2. **Small Bundle:** 3KB gzipped
3. **RTL Configurable:** Position set to `top-left` for Hebrew RTL
4. **Accessible:** ARIA live regions, keyboard dismissable
5. **Promise Integration:** `toast.promise()` for async actions

**Configuration:**
```typescript
import { Toaster } from 'sonner'

<Toaster position="top-left" /> // RTL: top-left instead of top-right
```

### Hebrew RTL Strategy

**Global Setup:**
```typescript
// app/layout.tsx
import { Rubik } from 'next/font/google'

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '700']
})

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={rubik.className}>
      <body>{children}</body>
    </html>
  )
}
```

**Mixed Content Handling:**
```typescript
// Hebrew fields (inherit RTL)
<input type="text" placeholder="שם הפרויקט" />

// English fields (LTR override)
<input type="email" dir="ltr" className="text-left" placeholder="student@example.com" />
```

**Button Order (RTL):**
```typescript
<div className="flex gap-3 justify-end">
  <Button variant="secondary">ביטול</Button>  {/* Cancel - right */}
  <Button variant="primary">שמור</Button>      {/* Save - left */}
</div>
```

### API Integration

**Endpoints Used (from Iteration 1):**

```typescript
// Authentication
POST /api/admin/login
  → Body: { username, password }
  → Returns: Sets admin_token cookie, returns { success: true }

POST /api/admin/logout
  → Clears admin_token cookie

// Project Management
GET /api/admin/projects
  → Requires: admin_token cookie
  → Returns: { success: true, data: { projects: [...] } }

POST /api/admin/projects
  → Requires: admin_token cookie
  → Content-Type: multipart/form-data
  → Fields: project_name, student_name, student_email, research_topic, password, docx_file, html_file
  → Returns: { success: true, data: { project_id, project_url, password, html_warnings } }

DELETE /api/admin/projects/:id
  → Requires: admin_token cookie
  → Returns: { success: true }
```

**Client-Side Fetch Pattern:**
```typescript
// Using fetch with cookie credentials
const response = await fetch('/api/admin/projects', {
  method: 'GET',
  credentials: 'include' // Send cookies
})

const result = await response.json()
if (!result.success) {
  throw new Error(result.error.message)
}
```

## Builder Task Breakdown

**Strategy:** 3 builders in sequence (Builder-1 foundation) then parallel (Builder-2 + Builder-3)

**Builder-1: Authentication & Layout Foundation**
- **Estimated:** 6-8 hours
- **Deliverables:** Login page, dashboard layout shell, reusable UI components (Input, Button, Label)
- **Blocks:** Builder-2 and Builder-3 (they need foundational components)

**Builder-2: Project List & Management**
- **Estimated:** 8-10 hours
- **Deliverables:** Project table, empty/loading states, delete confirmation, AdminProvider context
- **Depends on:** Builder-1 components

**Builder-3: Project Creation Flow**
- **Estimated:** 10-12 hours
- **Deliverables:** Create modal, dual file upload, progress tracking, success modal, HTML warnings
- **Depends on:** Builder-1 components, Builder-2 AdminProvider

**Total Estimated:** 24-30 hours (matches master plan estimate)

## Risk Mitigation

### Risk 1: File Upload Timeout (50MB files)

**Impact:** HIGH - Admin abandons upload, loses work, frustrated

**Mitigation:**
- Clear progress indication (dual progress bars with ETA)
- Network speed estimation (warn if <1 Mbps detected)
- Timeout set to 5 minutes (abort after 300 seconds)
- Manual retry button (no automatic retry for large files)
- Session timeout extension during upload (refresh token on upload start)
- Vercel Pro requirement documented prominently (50MB limit)

**Builder Responsibility:** Builder-3

### Risk 2: Hebrew RTL Layout Bugs

**Impact:** MEDIUM - UI appears broken, text scrambles, buttons misaligned

**Mitigation:**
- Use `dir="ltr"` override on email/password inputs
- Test with real Hebrew data early (use seed script from Iteration 1)
- Apply `unicode-bidi: isolate` to mixed-content containers
- Comprehensive RTL visual QA checklist (25+ items)
- Test on Firefox (stricter RTL rendering than Chrome)

**Builder Responsibility:** All builders (each validates their components)

### Risk 3: Client/Server Validation Mismatch

**Impact:** LOW - Form passes client but fails server, confusing user

**Mitigation:**
- Reuse Zod schemas on client and server (DRY principle)
- Server always revalidates (never trust client)
- Display server validation errors as fallback
- E2E test: Bypass client validation (DevTools) and verify server catches it

**Builder Responsibility:** Builder-3 (owns form validation)

### Risk 4: Vercel Hobby Plan Body Size Limit

**Impact:** CRITICAL - Cannot upload 50MB files on Vercel Hobby (4.5MB limit)

**Mitigation:**
- Document Vercel Pro requirement ($20/month) in setup guide
- Add environment check and clear error if file exceeds platform limit
- Alternative for local testing: `npm run dev` has no limit
- Future: Implement chunked upload OR direct S3 upload

**Builder Responsibility:** Builder-3 (document in integration notes)

### Risk 5: Session Timeout During Upload

**Impact:** LOW - Upload completes but session expires, user loses work

**Mitigation:**
- 30-minute session timeout is sufficient (uploads typically <3 minutes)
- Optional: Extend timeout to 1 hour during active upload
- Alternative: Refresh session token on upload start (reset 30-min timer)
- Clear error if session expires mid-upload

**Builder Responsibility:** Builder-3 (implement session refresh on upload start)

## Estimated Timeline

**Phase Breakdown:**

1. **Exploration:** ✅ Complete (Explorer-1 and Explorer-2 reports finalized)
2. **Planning:** 🔄 Current (this document)
3. **Building:** ⏳ 24-30 hours
   - Builder-1: 6-8 hours (foundation)
   - Builder-2: 8-10 hours (parallel with Builder-3)
   - Builder-3: 10-12 hours (parallel with Builder-2)
4. **Integration:** ⏳ 2-3 hours
   - Merge Builder-1, Builder-2, Builder-3 outputs
   - Resolve any conflicts (minimal expected due to clear boundaries)
   - Test end-to-end flow
5. **Validation:** ⏳ 4-6 hours
   - Manual browser testing (Chrome, Firefox, Safari)
   - Hebrew RTL visual QA (comprehensive checklist)
   - Edge case testing (file size limits, network errors, validation)
6. **Deployment:** ⏳ Final (Iteration 3 scope)

**Total Iteration 2 Time:** 30-41 hours (planning → validation complete)

**Parallel Execution:**
- Builder-1 must complete FIRST (foundation components)
- Builder-2 and Builder-3 can run in parallel AFTER Builder-1
- Integration phase merges all three builders
- Validation tests complete system

## Integration Strategy

**Shared Components:**
- Builder-1 creates: `Button`, `Input`, `Label`, `Textarea` (reusable UI primitives)
- Builder-2 uses: Button for action buttons, Input for search (future)
- Builder-3 uses: Input, Button, Label, Textarea for form fields

**State Management:**
- Builder-2 creates: `AdminProvider` context with `useAdmin()` hook
- Builder-3 uses: `useAdmin()` hook to trigger project list refetch after creation

**File Organization:**
- All builders follow `patterns.md` structure to avoid conflicts
- Components go in `components/admin/` directory
- Hooks go in `lib/hooks/` directory
- Types go in `lib/types/admin.ts` (shared file)

**Integration Testing:**
After all builders complete, test full flow:
1. Login → Dashboard (Builder-1)
2. View project list (Builder-2)
3. Create new project (Builder-3)
4. Verify new project appears in list (Builder-2 + Builder-3 integration)
5. Delete project (Builder-2)
6. Logout (Builder-1)

## Deployment Plan

**Iteration 2 Scope:** Local development only (no deployment yet)

**Requirements for Local Testing:**
1. PostgreSQL database running (Supabase or local instance)
2. `.env.local` file configured with all environment variables
3. Prisma migrations applied: `npx prisma migrate dev`
4. Dependencies installed: `npm install`
5. Development server: `npm run dev`

**Vercel Deployment:** Deferred to Iteration 3

**Important Notes:**
- Vercel Pro required for 50MB file uploads (Hobby plan limit is 4.5MB)
- Local development has no file size limit (test with real 50MB files)
- Document Vercel Pro requirement in README and setup guide

---

**Plan Status:** COMPREHENSIVE
**Ready for:** Builder Task Assignment
**Next Step:** Builder-1 begins with authentication and layout foundation
