# Explorer-1 Report: Admin Panel UI Architecture

## Executive Summary
Iteration 1 has successfully established a robust backend foundation with complete authentication, file storage, and API infrastructure. Iteration 2 requires building a Hebrew RTL admin interface with 3 main pages (login, dashboard, project creation modal) leveraging existing APIs. The UI layer is moderately complex, requiring ~12-15 React components with form handling, file upload UX, and Hebrew RTL layout. Existing backend patterns are excellent and ready for integration. Primary technical decisions needed: form library selection, upload progress tracking approach, and component state management strategy.

## Existing Backend Integration Points

### API Endpoints Available

**Authentication:**
- **POST /api/admin/login**
  - Request: `{ username: string, password: string }`
  - Response: Sets `admin_token` httpOnly cookie (30 min expiry)
  - Returns: `{ success: true, data: { message: "התחברת בהצלחה" } }`
  - Rate limited: 5 attempts per 15 minutes per IP
  - Hebrew error messages already implemented

**Project Management:**
- **GET /api/admin/projects**
  - Requires: `admin_token` cookie
  - Returns: `{ success: true, data: { projects: [...] } }`
  - Projects array includes: `projectId, projectName, studentName, studentEmail, createdAt, viewCount, lastAccessed`
  - Automatically excludes soft-deleted projects
  - Ordered by `createdAt DESC` (newest first)

- **POST /api/admin/projects**
  - Requires: `admin_token` cookie
  - Content-Type: `multipart/form-data`
  - Fields:
    * `project_name` (string, max 500 chars, required)
    * `student_name` (string, max 255 chars, required)
    * `student_email` (string, email format, required)
    * `research_topic` (string, required)
    * `password` (string, min 6 chars, optional - auto-generated if empty)
    * `docx_file` (File, DOCX format, max 50 MB, required)
    * `html_file` (File, HTML format, max 50 MB, required)
  - Response: `{ success: true, data: { project_id, project_url, password, html_warnings, has_plotly } }`
  - Atomic operation with rollback on failure
  - Returns HTML validation warnings (non-blocking)

- **DELETE /api/admin/projects/[id]**
  - Requires: `admin_token` cookie
  - Soft deletes project (sets `deletedAt`)
  - Deletes files from storage
  - Removes all project sessions
  - Returns: `{ success: true, data: { message: "Project deleted successfully" } }`

### Authentication Middleware

**Location:** `lib/auth/middleware.ts`

**Usage Pattern:**
```typescript
import { requireAdminAuth } from '@/lib/auth/middleware'

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req)
  if (authError) return authError
  
  // Authentication passed - continue with handler
}
```

**Session Management:**
- Token stored in `admin_token` httpOnly cookie
- 30-minute expiration
- Automatic cleanup of expired sessions
- Validates both JWT signature and database session
- Hebrew error messages: `"Authentication required"` / `"Invalid or expired token"`

### File Upload Infrastructure

**Handler:** `lib/upload/handler.ts`
- **Function:** `createProjectAtomic(data, files)`
- Implements two-phase commit (upload → validate → DB → rollback on failure)
- Auto-generates password if not provided (8 chars, excludes ambiguous characters)
- Returns: `{ projectId, password, url, htmlWarnings, hasPlotly }`

**Validator:** `lib/upload/validator.ts`
- **validateFileSize:** Max 50 MB (configurable)
- **validateHtmlSelfContained:** Detects external CSS/JS/images, checks for Plotly
- Returns warnings array (non-blocking - allows upload with warnings)

**Storage:** `lib/storage/index.ts`
- Uses `fileStorage` abstraction (currently local filesystem)
- Project files stored in `./uploads/{projectId}/`
- Filenames: `findings.docx`, `report.html`
- Interface ready for S3 migration (future)

**Max File Size:** 50 MB (from validator.ts)
- **Critical Note:** Vercel Hobby plan has 4.5 MB limit
- Requires Vercel Pro ($20/month) for 50 MB OR chunked upload implementation
- Recommendation: Document this requirement in setup guide

### Database Schema

**Prisma Model:** `Project`

Fields:
- `id` - Int (auto-increment, primary key)
- `projectId` - String (unique, 255 chars, indexed) - nanoid 12 chars
- `projectName` - String (500 chars max, Hebrew)
- `studentName` - String (255 chars max, Hebrew)
- `studentEmail` - String (255 chars max, LTR)
- `researchTopic` - String (Text, Hebrew)
- `passwordHash` - String (255 chars, bcrypt hash)
- `createdAt` - DateTime (auto, indexed)
- `createdBy` - String (default "ahiya", 255 chars)
- `docxUrl` - String (Text, file path or S3 URL)
- `htmlUrl` - String (Text, file path or S3 URL)
- `viewCount` - Int (default 0)
- `lastAccessed` - DateTime (nullable)
- `deletedAt` - DateTime (nullable, soft delete flag)

**Indexes:**
- `projectId` (unique lookup)
- `studentEmail` (search/filter)
- `createdAt` (sorting)

**Constraints:**
- All Hebrew fields are UTF-8 safe (PostgreSQL encoding verified)
- Email validation via Zod schema before DB insert
- Password stored as bcrypt hash (10 rounds)

## Admin Dashboard Architecture

### Route Structure

```
/admin                → Login page (Client Component)
/admin/dashboard      → Main dashboard (Hybrid - Server for data, Client for interactions)
```

**No nested routes needed** - Modal-based project creation keeps UI simple

### Page Components Breakdown

#### /admin (Login Page)

**Purpose:** Single-purpose authentication page with Hebrew UI

**Components Needed:**

1. **LoginPage** (Client Component)
   - Container with centered card layout
   - Hebrew title: "התחברות למערכת"
   - Subtitle: "StatViz - ניהול דוחות סטטיסטיים"
   - Renders LoginForm
   - Redirects to /admin/dashboard on success

2. **LoginForm** (Client Component)
   - Form with username + password fields
   - Submit button: "התחבר"
   - Client-side validation (required fields)
   - Calls POST /api/admin/login
   - Displays Hebrew error messages from API
   - Loading state during authentication
   - Rate limit error handling: "יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות."

3. **FormInput** (Reusable Client Component)
   - Label + input wrapper
   - RTL-aware direction handling
   - Error message display
   - Focus states and accessibility
   - Variants: text, password, email

4. **Button** (Reusable Client Component)
   - Primary, secondary, danger variants
   - Loading state with spinner
   - Disabled state
   - RTL-aware icon placement
   - Size variants: sm, md, lg

**Layout:** 
- Centered card (max-w-md)
- White background with shadow
- Blue accent color (#0066CC)
- Hebrew font: Rubik (already in tailwind.config)
- Mobile-responsive (320px+)

#### /admin/dashboard (Main Dashboard)

**Purpose:** Project list view with create/delete actions

**Components Needed:**

1. **DashboardLayout** (Server Component wrapper)
   - Checks authentication (server-side)
   - Fetches initial projects data
   - Passes data to client components
   - RTL layout wrapper

2. **DashboardHeader** (Client Component)
   - App title: "StatViz - ניהול פרויקטים"
   - Logout button (clears cookie, redirects to /admin)
   - User indicator: "שלום, {ADMIN_USERNAME}"
   - Fixed top position with shadow

3. **ProjectsContainer** (Client Component)
   - Main content area
   - Manages projects state (from server initial data)
   - Handles create/delete actions
   - Re-fetches data after mutations
   - Shows EmptyState if no projects

4. **CreateProjectButton** (Client Component)
   - Large prominent button: "+ פרויקט חדש"
   - Opens CreateProjectModal
   - Fixed position or in header
   - Icon: Plus sign (RTL-flipped)

5. **ProjectList** (Client Component)
   - Grid layout (1 col mobile, 2-3 cols desktop)
   - Maps projects to ProjectCard
   - Handles loading state
   - Handles error state

6. **ProjectCard** (Client Component)
   - Displays project metadata:
     * Project name (Hebrew, truncated if long)
     * Student name (Hebrew)
     * Created date (Hebrew format: "12 ינואר 2025")
     * View count: "{viewCount} צפיות"
     * Last accessed (relative: "לפני 3 ימים" or "טרם נצפה")
   - Action buttons:
     * "צפה" (View - opens /preview/{projectId} in new tab)
     * "העתק קישור" (Copy link - clipboard API)
     * "מחק" (Delete - confirmation modal)
   - Hover effects
   - Border with subtle shadow

7. **EmptyState** (Client Component)
   - Shown when projects array is empty
   - Icon: Document with plus
   - Text: "אין פרויקטים עדיין"
   - Subtext: "צור פרויקט חדש כדי להתחיל"
   - Large "צור פרויקט" button

8. **LoadingState** (Client Component)
   - Skeleton cards (3-4 placeholders)
   - Shimmer animation
   - Shown during initial load and refetch

**Data Flow:**
- Server Component fetches projects via direct Prisma call (faster than API route)
- Client components use React state for real-time updates
- After create/delete, refetch GET /api/admin/projects

#### Project Creation Flow

**Components Needed:**

1. **CreateProjectModal** (Client Component)
   - Full-screen overlay with dark backdrop
   - Centered modal card (max-w-2xl)
   - Header: "פרויקט חדש"
   - Close button (X) in top-left (RTL)
   - Renders ProjectForm
   - Closes on successful creation
   - Shows SuccessModal after creation

2. **ProjectForm** (Client Component)
   - Multi-field form with validation
   - Fields:
     * שם הפרויקט (Project name - Hebrew input)
     * שם הסטודנט (Student name - Hebrew input)
     * אימייל (Email - LTR input with dir="ltr")
     * נושא המחקר (Research topic - Hebrew textarea)
     * סיסמה (Password - optional with "צור סיסמה אוטומטית" checkbox)
     * קובץ DOCX (DOCX file - FileUpload component)
     * קובץ HTML (HTML file - FileUpload component)
   - Submit button: "צור פרויקט"
   - Cancel button: "ביטול"
   - Client-side validation before submit
   - Shows UploadProgress during upload

3. **FileUpload** (Reusable Client Component)
   - Drag-and-drop zone
   - File picker button
   - Shows selected filename
   - Displays file size (MB)
   - Remove button (X)
   - Validation: file type, size limit
   - Error display: "הקובץ גדול מדי (מקסימום 50MB)"
   - Preview icon (document icon for DOCX, HTML icon for HTML)

4. **PasswordField** (Client Component)
   - Password input with show/hide toggle
   - Auto-generate checkbox: "צור סיסמה אוטומטית"
   - Generated password display (if auto)
   - Character requirements hint (min 6 chars)

5. **UploadProgress** (Client Component)
   - Progress bar (0-100%)
   - Current step indicator:
     * "מעלה קבצים..." (0-50%)
     * "בודק תקינות..." (50-75%)
     * "יוצר פרויקט..." (75-100%)
   - Cancel button (aborts upload)
   - File size uploaded / total
   - Estimated time remaining

6. **SuccessModal** (Client Component)
   - Green checkmark icon
   - Title: "הפרויקט נוצר בהצלחה!"
   - Project URL display: `{NEXT_PUBLIC_BASE_URL}/preview/{projectId}`
   - Password display (if auto-generated)
   - Copy buttons:
     * "העתק קישור" (clipboard API)
     * "העתק סיסמה" (clipboard API)
   - HTML warnings display (if any):
     * "⚠️ תלויות חיצוניות זוהו:"
     * List of warnings
   - Close button: "סגור"

7. **DeleteConfirmationModal** (Reusable Client Component)
   - Warning icon
   - Title: "מחק פרויקט?"
   - Project name display: "{projectName}"
   - Warning: "הפעולה אינה ניתנת לביטול. כל הנתונים והקבצים יימחקו."
   - Cancel button: "ביטול"
   - Delete button: "מחק" (red/danger color)
   - Loading state during deletion

8. **HtmlWarningsDisplay** (Client Component)
   - Collapsible section in SuccessModal
   - Yellow warning icon
   - Title: "אזהרות HTML"
   - List of warnings with icons
   - Explanation: "הקובץ עשוי להיות תלוי במשאבים חיצוניים"
   - "הבנתי" button to dismiss

## Hebrew RTL Implementation

### Tailwind Configuration

**RTL Plugin:** Not needed - Next.js native RTL support sufficient

**Changes to `tailwind.config.ts`:**
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', 'Heebo', 'sans-serif'], // Already configured
      },
      colors: {
        primary: {
          50: '#E6F0FF',
          100: '#CCE0FF',
          500: '#0066CC',
          600: '#0052A3',
          700: '#003D7A',
        },
        danger: {
          500: '#DC2626',
          600: '#B91C1C',
        },
      },
    },
  },
  plugins: [],
}
export default config
```

**Direction Handling:**
- Root layout already sets `dir="rtl"` on `<html>` (verified in `app/layout.tsx`)
- No additional RTL plugin needed
- Use CSS logical properties where possible:
  * `margin-inline-start` instead of `margin-left`
  * `padding-inline-end` instead of `padding-right`
  * Tailwind utilities: `ms-4` (margin-start), `pe-2` (padding-end)

### Font Selection

**Recommendation:** Rubik (already configured)

**Rationale:**
- Rubik is already in `tailwind.config.ts`
- Excellent Hebrew support with proper nikud rendering
- Wide weight range (300-900) for hierarchy
- Modern, professional appearance
- Google Fonts CDN available (next/font/google)

**Implementation:**
```typescript
// app/layout.tsx
import { Rubik } from 'next/font/google'

const rubik = Rubik({ 
  subsets: ['latin', 'hebrew'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-rubik',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

**Fallback:** Heebo (if Rubik issues)
- Lighter weight, more compact
- Better for dense text content

### Form Direction Strategy

**Mixed Content Handling:**

1. **Hebrew Fields** (default RTL):
   - Project name, student name, research topic
   - No explicit `dir` attribute needed (inherits RTL)
   - Text-align: right (automatic)

2. **LTR Fields** (email, passwords):
   ```typescript
   <input 
     type="email" 
     dir="ltr" 
     className="text-left" 
     placeholder="student@example.com"
   />
   ```
   - Explicit `dir="ltr"` on input
   - `text-left` class for left alignment
   - Placeholder in English (email format is LTR)

3. **Auto-Direction Fields** (not needed in this app):
   - `dir="auto"` for user-controlled content
   - Not applicable - all fields have known direction

**Button Order:**
- Cancel button on RIGHT (first in visual order)
- Submit/Action button on LEFT (last in visual order)
- Matches Hebrew reading direction
- Example:
  ```tsx
  <div className="flex gap-3 justify-end">
    <Button variant="secondary">ביטול</Button>
    <Button variant="primary">שמור</Button>
  </div>
  ```

### Icon Handling

**Icons Needing Flip:**
- Chevron left/right (navigation)
- Arrow left/right (back/forward)
- Not applicable: Plus, X, checkmark, document icons (symmetric)

**Approach:** CSS Transform
```css
/* For RTL-aware icons */
.rtl-flip {
  transform: scaleX(-1);
}
```

**Recommendation:** Use Heroicons or Lucide (both RTL-friendly)
- Install: `npm install lucide-react`
- Usage:
  ```tsx
  import { ChevronLeft, Plus, X } from 'lucide-react'
  
  <ChevronLeft className="rtl:rotate-180" />
  ```

## Component Hierarchy

```
App Layout (RTL wrapper, Rubik font)
└── Admin Routes
    ├── LoginPage (Client)
    │   └── LoginForm (Client)
    │       ├── FormInput (x2: username, password)
    │       └── Button (submit)
    │
    └── DashboardLayout (Server - fetches data)
        ├── DashboardHeader (Client)
        │   ├── LogoutButton
        │   └── UserDisplay
        │
        ├── ProjectsContainer (Client - state management)
        │   ├── CreateProjectButton
        │   │
        │   ├── ProjectList (Client)
        │   │   └── ProjectCard (repeated, Client)
        │   │       ├── ViewButton
        │   │       ├── CopyLinkButton
        │   │       └── DeleteButton
        │   │
        │   ├── EmptyState (Client)
        │   └── LoadingState (Client)
        │
        ├── CreateProjectModal (Client - conditionally rendered)
        │   └── ProjectForm (Client)
        │       ├── FormInput (x3: name, student, email)
        │       ├── Textarea (research topic)
        │       ├── PasswordField (optional)
        │       ├── FileUpload (x2: DOCX, HTML)
        │       └── Buttons (cancel, submit)
        │
        ├── UploadProgress (Client - shown during upload)
        │
        ├── SuccessModal (Client - after creation)
        │   ├── CopyButtons (x2: URL, password)
        │   └── HtmlWarningsDisplay (conditional)
        │
        └── DeleteConfirmationModal (Client - before delete)
            └── Buttons (cancel, delete)
```

**Total Components:** 15 unique, ~20 instances

## Technical Stack Recommendations

### Form Handling

**Recommendation:** React Hook Form v7

**Rationale:**
1. **File Upload Support:** Native support for `File` objects via `register`
2. **Validation:** Built-in validation + Zod integration (`@hookform/resolvers/zod`)
3. **Performance:** Uncontrolled inputs minimize re-renders (critical for large forms)
4. **Error Handling:** Field-level error display (`formState.errors`)
5. **Async Validation:** Server-side validation integration
6. **Small Bundle:** 9KB gzipped (vs Formik 13KB)
7. **TypeScript:** Full type safety with Zod schemas

**Installation:**
```bash
npm install react-hook-form @hookform/resolvers
```

**Example Usage:**
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  project_name: z.string().min(1).max(500),
  student_name: z.string().min(1).max(255),
  student_email: z.string().email(),
  research_topic: z.string().min(1),
  password: z.string().min(6).optional(),
  docx_file: z.instanceof(File),
  html_file: z.instanceof(File),
})

type CreateProjectForm = z.infer<typeof CreateProjectSchema>

function ProjectForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateProjectForm>({
    resolver: zodResolver(CreateProjectSchema),
  })

  const onSubmit = async (data: CreateProjectForm) => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value)
    })
    
    await fetch('/api/admin/projects', { 
      method: 'POST', 
      body: formData 
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('project_name')} />
      {errors.project_name && <span>{errors.project_name.message}</span>}
    </form>
  )
}
```

**Alternative:** Formik (if team prefers)
- Larger bundle (13KB vs 9KB)
- More verbose API
- Better for simple forms

### File Upload

**Approach:** Native FormData + XMLHttpRequest with progress tracking

**Rationale:**
1. **Progress Events:** XMLHttpRequest `upload.onprogress` for real-time progress bar
2. **Cancellation:** `xhr.abort()` to cancel upload mid-flight
3. **No External Libraries:** Native browser APIs (zero bundle cost)
4. **React Hook Form Integration:** `File` objects from `register` work directly with FormData

**Implementation Pattern:**
```typescript
function uploadWithProgress(
  formData: FormData,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Progress tracking
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    // Completion
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Response(xhr.response, { status: xhr.status }))
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }

    // Error handling
    xhr.onerror = () => reject(new Error('Network error'))
    
    // Cancellation support
    signal?.addEventListener('abort', () => xhr.abort())

    // Send request
    xhr.open('POST', '/api/admin/projects')
    xhr.send(formData)
  })
}
```

**Progress Tracking:**
- Display percentage: 0-100%
- Show file size uploaded / total
- Estimated time remaining: `(totalBytes - loadedBytes) / bytesPerSecond`

**Error Recovery:**
- Retry button (manual retry, not automatic)
- Clear error message: "העלאה נכשלה. אנא נסה שוב."
- No resume support (MVP - full re-upload on retry)

**Alternative:** `fetch` with ReadableStream (more complex, no advantage for this use case)

### State Management

**Recommendation:** React Context + useState (no external library)

**Rationale:**
1. **Scope:** State is local to admin dashboard (no global state needed)
2. **Complexity:** Simple CRUD operations (list, create, delete)
3. **Zero Bundle Cost:** Native React (vs Zustand 3KB, Redux 15KB)
4. **Server Component Integration:** Can pass initial data from Server Components

**State Structure:**
```typescript
interface AdminState {
  projects: Project[]
  isLoading: boolean
  error: string | null
  isCreateModalOpen: boolean
  isUploadInProgress: boolean
  uploadProgress: number
}
```

**Context Provider:**
```typescript
'use client'

import { createContext, useContext, useState } from 'react'

const AdminContext = createContext<AdminState & AdminActions | null>(null)

export function AdminProvider({ 
  children, 
  initialProjects 
}: { 
  children: React.ReactNode
  initialProjects: Project[] 
}) {
  const [projects, setProjects] = useState(initialProjects)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  const refetchProjects = async () => {
    const res = await fetch('/api/admin/projects')
    const data = await res.json()
    setProjects(data.data.projects)
  }
  
  const deleteProject = async (projectId: string) => {
    await fetch(`/api/admin/projects/${projectId}`, { method: 'DELETE' })
    await refetchProjects()
  }

  return (
    <AdminContext.Provider value={{ 
      projects, 
      isCreateModalOpen, 
      setIsCreateModalOpen,
      refetchProjects,
      deleteProject,
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (!context) throw new Error('useAdmin must be used within AdminProvider')
  return context
}
```

**Alternative:** Zustand (if team prefers)
- Simpler API than Context
- Better DevTools support
- 3KB bundle cost
- Overkill for this scope

### Client vs Server Components

**Login Page:** Client Component
- Needs form state, event handlers, API calls
- No server-side data fetching needed
- Interactive: form submission, loading states

**Dashboard:** Hybrid (Server wrapper + Client children)
- **Server Component (DashboardLayout):**
  - Fetches initial projects via Prisma (faster than API route)
  - Checks authentication server-side (security)
  - Passes data to client components
  
- **Client Components (everything else):**
  - ProjectList, ProjectCard, Modals, Forms
  - Interactive: create, delete, copy to clipboard
  - State management: modal open/close, upload progress

**Pattern:**
```typescript
// app/admin/dashboard/page.tsx (Server Component)
import { prisma } from '@/lib/db/client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAdminToken } from '@/lib/auth/admin'
import { AdminProvider } from '@/components/AdminProvider'
import { DashboardClient } from '@/components/DashboardClient'

export default async function DashboardPage() {
  // Server-side auth check
  const token = cookies().get('admin_token')?.value
  if (!token || !(await verifyAdminToken(token))) {
    redirect('/admin')
  }

  // Fetch initial data
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      projectId: true,
      projectName: true,
      studentName: true,
      studentEmail: true,
      createdAt: true,
      viewCount: true,
      lastAccessed: true,
    }
  })

  return (
    <AdminProvider initialProjects={projects}>
      <DashboardClient />
    </AdminProvider>
  )
}
```

**Rationale:**
- Server Component for initial data (faster, no loading state)
- Client Components for interactivity (modals, forms, actions)
- Hybrid approach leverages best of both worlds

## Builder Task Breakdown

Based on component hierarchy and dependencies, recommend **3 builder tasks**:

### Builder-1: Authentication & Layout Foundation
**Scope:** Login page, layout wrapper, authentication flow

**Components:**
- LoginPage (route: `app/admin/page.tsx`)
- LoginForm
- FormInput (reusable)
- Button (reusable)
- DashboardLayout (Server Component wrapper)
- DashboardHeader

**Routes:**
- `/admin` (login)
- `/admin/dashboard` (shell, no content yet)

**Dependencies:**
- Iteration 1: POST /api/admin/login, requireAdminAuth middleware
- NPM: react-hook-form, @hookform/resolvers

**Deliverables:**
- Working login flow (username/password → dashboard redirect)
- RTL layout configured (Rubik font loaded)
- Reusable form components (Input, Button)
- Dashboard header with logout
- Authentication guard on dashboard route

**Estimated Time:** 6-8 hours

---

### Builder-2: Project List & Dashboard UI
**Scope:** Project display, empty states, loading states

**Components:**
- ProjectsContainer (state management)
- ProjectList
- ProjectCard
- EmptyState
- LoadingState
- DeleteConfirmationModal
- AdminProvider (context)

**Routes:**
- Complete `/admin/dashboard` with project list

**Dependencies:**
- Builder-1: DashboardLayout, Button component
- Iteration 1: GET /api/admin/projects, DELETE /api/admin/projects/[id]
- NPM: lucide-react (icons)

**Deliverables:**
- Project list displaying all metadata
- View button (opens /preview/{id} in new tab)
- Copy link button (clipboard API)
- Delete functionality with confirmation
- Empty state for zero projects
- Skeleton loading state
- React Context for state management

**Estimated Time:** 8-10 hours

---

### Builder-3: Project Creation Flow
**Scope:** Create modal, file uploads, success feedback

**Components:**
- CreateProjectButton
- CreateProjectModal
- ProjectForm (with React Hook Form)
- FileUpload (reusable)
- PasswordField
- UploadProgress
- SuccessModal
- HtmlWarningsDisplay

**Routes:**
- Modal overlay on `/admin/dashboard`

**Dependencies:**
- Builder-1: FormInput, Button
- Builder-2: AdminProvider (context)
- Iteration 1: POST /api/admin/projects, file upload handler
- NPM: react-hook-form, @hookform/resolvers

**Deliverables:**
- Full project creation form with validation
- Drag-and-drop file upload UI
- Upload progress tracking (0-100%)
- Auto-generated password option
- Success modal with copy buttons
- HTML warnings display
- Error handling and retry logic
- Integration with AdminProvider (refetch after create)

**Estimated Time:** 10-12 hours

---

**Total Estimated Time:** 24-30 hours (matches master plan estimate)

**Parallelization:**
- Builder-1 creates foundation (must complete first)
- Builder-2 and Builder-3 can work in parallel after Builder-1
- Builder-3 imports components from Builder-1 (Input, Button)
- Integration phase: Connect all parts, test end-to-end flow

## Complexity Assessment

**Estimated UI Components:** 15 unique components

**New NPM Packages Needed:**
- `react-hook-form` (form state management)
- `@hookform/resolvers` (Zod integration)
- `lucide-react` (icons)
- `next/font/google` (already in Next.js, no install needed)

**Integration Complexity:** MEDIUM
- Backend APIs are well-designed and ready to use
- Existing auth middleware simplifies security
- File upload handler has atomic operations (safe)
- Challenge: Multipart form data with progress tracking (solvable with XMLHttpRequest)

**Hebrew RTL Complexity:** LOW
- Root layout already configured with `dir="rtl"`
- Tailwind supports RTL utilities natively
- Rubik font already in config
- Only need explicit `dir="ltr"` for email/password fields
- Icon flipping is minimal (most icons are symmetric)

**File Upload UX Complexity:** MEDIUM-HIGH
- Progress tracking requires XMLHttpRequest (not fetch)
- Cancellation requires AbortController integration
- 50 MB files need Vercel Pro plan (deployment consideration)
- Success feedback with copy-to-clipboard (Clipboard API straightforward)
- HTML warnings display (data already from API, just UI)

**Overall Complexity:** MEDIUM
- UI is straightforward CRUD with good backend support
- RTL is mostly configured (minimal additional work)
- File upload is the most complex piece (progress + error handling)
- No complex state management (Context is sufficient)

## Risks & Challenges

### Risk 1: File Upload Size Limits on Vercel

**Impact:** HIGH - Cannot upload 50 MB files on Vercel Hobby plan (4.5 MB limit)

**Mitigation:**
- Document Vercel Pro requirement ($20/month) in setup guide
- Alternative: Implement chunked multipart upload (complex, deferred to future)
- Alternative: Direct client → S3 upload (bypasses Next.js API route)
- For MVP: Use Vercel Pro OR test locally with `npm run dev`

**Builder Note:** Add environment check and clear error message if file exceeds platform limit

---

### Risk 2: Hebrew Text Rendering in Form Inputs

**Impact:** MEDIUM - Input fields might not align properly with mixed Hebrew/English content

**Mitigation:**
- Test early with real Hebrew text
- Explicit `dir="ltr"` on email/password fields
- Use `text-right` for Hebrew fields, `text-left` for LTR fields
- Test on Firefox (stricter RTL rendering than Chrome)

**Builder Note:** Create test project with long Hebrew names and special characters

---

### Risk 3: File Upload Progress Tracking Browser Compatibility

**Impact:** LOW-MEDIUM - `XMLHttpRequest.upload.onprogress` not supported in very old browsers

**Mitigation:**
- Check browser support on load, fallback to simple "Uploading..." message
- All modern browsers support this (IE11+ already supported, now deprecated)
- Mobile browsers (iOS Safari, Android Chrome) fully support
- No action needed for MVP (modern browser requirement is acceptable)

**Browser Support:**
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile: Full support

---

### Risk 4: Copy to Clipboard API Requires HTTPS

**Impact:** MEDIUM - Clipboard API only works on HTTPS (or localhost)

**Mitigation:**
- Works on `localhost` during development (no issue)
- Works on Vercel deployment (automatic HTTPS)
- Fallback: Display "copy failed" message with manual select-and-copy instructions
- Implementation:
  ```typescript
  async function copyToClipboard(text: string) {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback: Create temporary textarea
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }
  ```

**Browser Support:** Full support (all modern browsers)

---

### Risk 5: Modal Scroll Lock on Mobile

**Impact:** LOW - Background page scrolls when modal is open on iOS

**Mitigation:**
- Use `overflow-hidden` on `<body>` when modal opens
- Restore original overflow when modal closes
- Implementation:
  ```typescript
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isModalOpen])
  ```

**Testing:** Verify on real iOS device (Safari Mobile)

---

### Risk 6: React Hook Form + File Input Validation

**Impact:** LOW - File size validation happens after selection, not before

**Mitigation:**
- Client-side validation via Zod schema (checks `File.size` property)
- Server-side validation as backup (iteration 1 already has this)
- Display error immediately after file selection
- Example:
  ```typescript
  const FileSchema = z.instanceof(File).refine(
    (file) => file.size <= 50 * 1024 * 1024,
    'File size exceeds 50 MB limit'
  )
  ```

**Builder Note:** Test with files >50 MB to ensure error displays correctly

## Recommendations for Planner

### 1. Prioritize Builder-1 Foundation
**Rationale:** All other builders depend on:
- FormInput and Button components (reused in Builder-3)
- DashboardLayout and authentication guard (used by Builder-2)
- RTL setup and font configuration (impacts all UI)

**Action:** Builder-1 must complete before Builder-2/3 start
- Estimated: 2-3 days for Builder-1
- Then Builder-2 and Builder-3 can work in parallel

---

### 2. Install Dependencies Early (Before Builders Start)
**Recommended Packages:**
```bash
npm install react-hook-form @hookform/resolvers lucide-react
```

**Rationale:** Prevents version conflicts and allows builders to start immediately

**Versions:**
- `react-hook-form`: ^7.50.0 (latest stable)
- `@hookform/resolvers`: ^3.3.0 (Zod integration)
- `lucide-react`: ^0.300.0 (icon library)

---

### 3. Create Shared Type Definitions File
**Location:** `lib/types/admin.ts`

**Content:**
```typescript
export interface Project {
  projectId: string
  projectName: string
  studentName: string
  studentEmail: string
  createdAt: Date
  viewCount: number
  lastAccessed: Date | null
}

export interface CreateProjectData {
  project_name: string
  student_name: string
  student_email: string
  research_topic: string
  password?: string
  docx_file: File
  html_file: File
}

export interface CreateProjectResponse {
  project_id: string
  project_url: string
  password: string
  html_warnings: string[]
  has_plotly: boolean
}
```

**Rationale:** Prevents type duplication across builders, ensures consistency

---

### 4. Document Vercel Pro Requirement Prominently
**Locations:**
- `.2L/plan-1/iteration-2/plan/tech-stack.md`
- README.md deployment section
- `.env.example` comments

**Message:**
```
# IMPORTANT: File Upload Size Limits
# - Vercel Hobby: 4.5 MB limit (insufficient for 50 MB spec)
# - Vercel Pro: 50 MB limit (required for production)
# - Local dev: No limit (npm run dev)
# 
# For MVP deployment, either:
#   1. Upgrade to Vercel Pro ($20/month)
#   2. Implement chunked upload (future iteration)
#   3. Use direct S3 upload (future iteration)
```

---

### 5. Designate Integration Testing Responsibility
**Who:** Builder-3 (Project Creation) should also handle integration testing

**Rationale:**
- Builder-3 completes last (depends on Builder-1 components)
- Project creation flow touches all parts (auth, list, create, delete)
- Natural to test end-to-end after completing creation flow

**Integration Checklist:**
- [ ] Login → Dashboard flow works
- [ ] Project list loads correctly
- [ ] Create project with all fields → Success modal
- [ ] Copy link and password buttons work
- [ ] New project appears in list after creation
- [ ] Delete project with confirmation → Removed from list
- [ ] Logout → Redirect to login
- [ ] Auth guard works (direct access to /admin/dashboard redirects if not logged in)
- [ ] Hebrew text displays correctly (no encoding issues)
- [ ] RTL layout is consistent (no LTR leaks)
- [ ] Mobile responsive (test on 375px width)

---

### 6. Create Component Storybook or Style Guide (Optional, Future)
**Not for MVP, but recommended for iteration 3:**
- Document Button variants (primary, secondary, danger)
- Document FormInput usage and props
- Show FileUpload examples
- Helps with consistency and onboarding new developers

**Tool:** Storybook (defer to post-MVP)

---

### 7. Plan for Hebrew Date Formatting
**Current Iteration 1:** No date formatting utility exists

**Need:** Display dates in Hebrew format

**Recommendation:** Create utility function
```typescript
// lib/utils/dates.ts
export function formatHebrewDate(date: Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return 'היום'
  if (diffInDays === 1) return 'אתמול'
  if (diffInDays < 7) return `לפני ${diffInDays} ימים`
  if (diffInDays < 30) return `לפני ${Math.floor(diffInDays / 7)} שבועות`
  return formatHebrewDate(date)
}
```

**Who:** Builder-2 (ProjectCard displays dates)

---

### 8. Error Boundary for Production Robustness
**Current State:** No error boundaries exist

**Recommendation:** Add error boundary wrapper

**Location:** `components/ErrorBoundary.tsx`

**Usage:**
```typescript
// app/admin/dashboard/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DashboardLayout({ children }) {
  return (
    <ErrorBoundary fallback={<div>שגיאה. אנא טען מחדש את הדף.</div>}>
      {children}
    </ErrorBoundary>
  )
}
```

**Who:** Builder-1 (creates layout foundation)

## Resource Map

### Critical Files/Directories

**Existing (Iteration 1):**
- `app/api/admin/login/route.ts` - Admin authentication endpoint
- `app/api/admin/projects/route.ts` - GET (list) and POST (create) endpoints
- `app/api/admin/projects/[id]/route.ts` - DELETE endpoint
- `lib/auth/middleware.ts` - `requireAdminAuth` function
- `lib/upload/handler.ts` - `createProjectAtomic` function
- `lib/upload/validator.ts` - File validation utilities
- `prisma/schema.prisma` - Database schema
- `tailwind.config.ts` - Tailwind configuration (Rubik font)
- `app/layout.tsx` - Root layout (RTL already configured)

**New (Iteration 2):**
- `app/admin/page.tsx` - Login page (Builder-1)
- `app/admin/dashboard/page.tsx` - Dashboard Server Component (Builder-1)
- `components/admin/` - All admin UI components (Builders 1-3)
  - `LoginForm.tsx` (Builder-1)
  - `FormInput.tsx` (Builder-1, reusable)
  - `Button.tsx` (Builder-1, reusable)
  - `DashboardHeader.tsx` (Builder-1)
  - `ProjectsContainer.tsx` (Builder-2)
  - `ProjectList.tsx` (Builder-2)
  - `ProjectCard.tsx` (Builder-2)
  - `EmptyState.tsx` (Builder-2)
  - `LoadingState.tsx` (Builder-2)
  - `DeleteConfirmationModal.tsx` (Builder-2)
  - `AdminProvider.tsx` (Builder-2, context)
  - `CreateProjectButton.tsx` (Builder-3)
  - `CreateProjectModal.tsx` (Builder-3)
  - `ProjectForm.tsx` (Builder-3)
  - `FileUpload.tsx` (Builder-3, reusable)
  - `PasswordField.tsx` (Builder-3)
  - `UploadProgress.tsx` (Builder-3)
  - `SuccessModal.tsx` (Builder-3)
  - `HtmlWarningsDisplay.tsx` (Builder-3)
- `lib/types/admin.ts` - Shared TypeScript types
- `lib/utils/dates.ts` - Hebrew date formatting (Builder-2)
- `lib/utils/upload.ts` - Upload progress tracking utility (Builder-3)

### Key Dependencies

**From Iteration 1 (Backend):**
- Authentication: JWT tokens, bcrypt hashing, session management
- File storage: Local filesystem (abstraction ready for S3)
- Database: Prisma ORM, PostgreSQL
- Validation: Zod schemas, file size/type validators

**New Dependencies (Iteration 2):**
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Zod integration for React Hook Form
- `lucide-react` - Icon library (RTL-friendly)
- `next/font/google` - Rubik font loading (already available)

**Browser APIs:**
- `XMLHttpRequest` - File upload progress tracking
- `navigator.clipboard` - Copy to clipboard
- `FormData` - Multipart form submission
- `AbortController` - Upload cancellation

### Testing Infrastructure

**Manual Testing Checklist (for Validators):**

**Authentication Flow:**
- [ ] Login with correct credentials → Redirect to dashboard
- [ ] Login with wrong password → Error message in Hebrew
- [ ] Login with 5+ failed attempts → Rate limit message
- [ ] Logout → Cookie cleared, redirect to /admin
- [ ] Direct access to /admin/dashboard without token → Redirect to /admin

**Project List:**
- [ ] Empty state shows when zero projects
- [ ] Projects display in descending order (newest first)
- [ ] Hebrew names display correctly (no encoding issues)
- [ ] View count shows "0 צפיות" for new projects
- [ ] Last accessed shows "טרם נצפה" for never-viewed projects
- [ ] Last accessed shows "לפני X ימים" for recently viewed

**Project Actions:**
- [ ] View button opens /preview/{id} in new tab
- [ ] Copy link button copies URL to clipboard, shows success toast
- [ ] Delete button shows confirmation modal
- [ ] Delete confirmation → Project removed from list
- [ ] Cancel delete → Modal closes, project remains

**Project Creation:**
- [ ] All fields required except password (validation)
- [ ] Email field validates format (xxx@yyy.zzz)
- [ ] File size >50 MB shows error
- [ ] File type validation (only DOCX and HTML accepted)
- [ ] Auto-generate password option works
- [ ] Upload progress shows 0-100%
- [ ] Success modal displays project URL and password
- [ ] Copy buttons work (URL and password)
- [ ] HTML warnings display if external resources detected
- [ ] New project appears in list after creation
- [ ] Cancel during upload stops request

**RTL & Hebrew:**
- [ ] All text is right-aligned (except email field)
- [ ] Buttons are in correct order (cancel right, submit left)
- [ ] Icons are not flipped (except arrows/chevrons if used)
- [ ] Hebrew text wraps correctly in long project names
- [ ] Mixed Hebrew/English content aligns properly

**Responsive (Mobile):**
- [ ] Login page works on 375px width
- [ ] Dashboard header stays fixed on scroll
- [ ] Project cards stack vertically on mobile
- [ ] Modal is full-screen or near-full-screen on mobile
- [ ] File upload tap targets are >44px
- [ ] Buttons are large enough for touch (min 44px height)

**Browser Compatibility:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Performance:**
- [ ] Dashboard loads in <2 seconds with 50 projects
- [ ] Project creation completes in <10 seconds (50 MB files)
- [ ] No layout shift during loading
- [ ] Images/icons load without flicker

---

**Explorer-1 Report Complete**

**Key Takeaways:**
1. Backend is excellent - APIs are well-designed and ready for UI integration
2. RTL is mostly configured - minimal additional work needed
3. React Hook Form is best choice for complex forms with file uploads
4. 3 builder tasks with clear dependencies (Builder-1 → Builder-2/3 parallel)
5. Main complexity: File upload progress tracking (solvable with XMLHttpRequest)
6. Vercel Pro required for 50 MB uploads (document prominently)
7. Total estimated time: 24-30 hours (matches master plan)

**Recommended Next Steps for Planner:**
1. Create builder-tasks.md with detailed component breakdowns
2. Install dependencies (react-hook-form, lucide-react) before builders start
3. Create shared types file (lib/types/admin.ts)
4. Document Vercel Pro requirement in tech-stack.md
5. Assign Builder-1 first, then Builder-2/3 in parallel
6. Designate Builder-3 for integration testing
