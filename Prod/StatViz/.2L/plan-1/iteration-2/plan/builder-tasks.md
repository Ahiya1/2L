# Builder Task Breakdown - Iteration 2

## Overview

3 primary builders will work sequentially then in parallel to implement the admin panel.

**Execution Order:**
1. **Builder-1** creates foundation (MUST complete first)
2. **Builder-2** and **Builder-3** work in parallel (depend on Builder-1)

**Estimated Total Time:** 24-30 hours

**Complexity Distribution:**
- Builder-1: MEDIUM (foundational work, authentication, layout)
- Builder-2: MEDIUM (table display, state management, delete flow)
- Builder-3: HIGH (complex form, dual file upload, progress tracking)

---

## Builder-1: Authentication & Layout Foundation

### Scope

Build the login flow, authentication guard, dashboard layout shell, and foundational reusable UI components that Builder-2 and Builder-3 will use.

### Complexity Estimate

**MEDIUM** (6-8 hours)

**Rationale:**
- Moderate UI complexity (login form + dashboard shell)
- Straightforward integration with existing auth APIs
- Reusable components require careful design for future use
- Not complex enough to warrant splitting

### Success Criteria

- [ ] Admin can log in with username "ahiya" and correct password
- [ ] Invalid credentials show Hebrew error: "שם משתמש או סיסמה שגויים"
- [ ] Rate limit (6 failed attempts) shows Hebrew message
- [ ] Session persists across page refreshes (httpOnly cookie)
- [ ] Direct access to `/admin/dashboard` without login redirects to `/admin`
- [ ] Dashboard shell renders with header and logout button
- [ ] Logout clears session and redirects to `/admin`
- [ ] Password visibility toggle works (show/hide)
- [ ] All UI displays correctly in Hebrew RTL
- [ ] Reusable components (Button, Input, Label) follow patterns.md exactly

### Files to Create

**Routes:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/app/(auth)/admin/page.tsx` - Login page (Client Component)
- `/home/ahiya/Ahiya/2L/Prod/StatViz/app/(auth)/admin/layout.tsx` - Auth layout wrapper
- `/home/ahiya/Ahiya/2L/Prod/StatViz/app/(auth)/admin/dashboard/page.tsx` - Dashboard shell (Server Component)

**Components:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/LoginForm.tsx` - Login form with validation
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/DashboardHeader.tsx` - Header with logout button
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/DashboardShell.tsx` - Dashboard layout wrapper (Client)

**UI Components (shadcn/ui):**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/ui/button.tsx` - Reusable button component
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/ui/input.tsx` - Reusable input component
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/ui/label.tsx` - Reusable label component

**Providers:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/Providers.tsx` - TanStack Query provider

**Hooks:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/hooks/useAuth.ts` - Authentication helper hook

**API Routes (new):**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/app/api/admin/logout/route.ts` - Logout endpoint (clears session)

**Types:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/types/admin.ts` - Shared types for admin UI

### Dependencies

**From Iteration 1:**
- `POST /api/admin/login` - Authentication endpoint
- `lib/auth/middleware.ts` - `requireAdminAuth()` function
- `lib/auth/admin.ts` - `verifyAdminToken()` function
- Prisma client for session verification
- Environment variables (JWT_SECRET, ADMIN_USERNAME, etc.)

**New NPM Packages:**
```bash
npm install @tanstack/react-query @hookform/resolvers react-hook-form sonner lucide-react
npm install -D @tanstack/react-query-devtools

# Install shadcn/ui components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label
```

### Implementation Notes

**Login Form Validation:**
- Use React Hook Form with Zod validation
- Schema: `{ username: z.string().min(1), password: z.string().min(1) }`
- Display errors inline below inputs
- Submit button disabled during submission

**Password Visibility Toggle:**
- Use lucide-react `Eye` and `EyeOff` icons
- Toggle between `type="password"` and `type="text"`
- Button positioned inside input field (absolute right)

**Session Management:**
- Check for `admin_token` cookie on dashboard page load
- Use Server Component for initial auth check (faster than client)
- Redirect using Next.js `redirect()` from `next/navigation`

**Logout Flow:**
1. Call `POST /api/admin/logout` to delete database session
2. Cookie is cleared server-side
3. Redirect to `/admin` login page
4. No confirmation modal needed (low-consequence action)

**Dashboard Shell:**
- Server Component fetches auth status (no data yet - Builder-2 adds data)
- Passes authenticated flag to Client Component
- Client Component renders header + empty content area
- Wrap with TanStack Query provider in layout

**RTL Considerations:**
- Set `dir="rtl"` on all Hebrew forms
- Password input inherits RTL but content can be mixed
- Logout button positioned top-left (RTL equivalent of top-right)
- Hebrew title positioned top-right

### Patterns to Follow

Reference `/home/ahiya/Ahiya/2L/Prod/StatViz/.2L/plan-1/iteration-2/plan/patterns.md`:

**Client Component Structure:**
- Use `'use client'` directive
- Define TypeScript interfaces for props
- Handle loading states with `useState`
- Use try-catch for error handling

**Form Handling:**
- Use `useForm` from react-hook-form
- Use `zodResolver` for validation
- Check `formState.errors` for error display
- Use `formState.isSubmitting` for loading state

**Server Component Pattern:**
- Use `cookies()` from `next/headers`
- Use `redirect()` for server-side redirects
- Fetch data directly with Prisma
- Pass data to client components as props

**Hebrew RTL:**
- Login form: `dir="rtl"` on form element
- Button order: Cancel (right) → Submit (left)
- Text alignment: right-aligned for Hebrew

### Testing Requirements

**Unit Tests:** None (manual testing sufficient for MVP)

**Manual Testing:**
1. Login with correct credentials → dashboard
2. Login with wrong password → Hebrew error
3. 6 failed attempts → rate limit message (wait 15 min or test with mock)
4. Page refresh on dashboard → stays logged in
5. Logout → redirects to login
6. Direct `/admin/dashboard` access without login → redirects to `/admin`
7. Password toggle shows/hides password
8. All Hebrew text displays correctly (no encoding issues)
9. RTL layout is correct (title right, logout left)

**Browser Testing:**
- Chrome (primary)
- Firefox (RTL validation)

**Coverage Target:** N/A (no automated tests)

### Integration Points for Other Builders

**Exports for Builder-2:**
- `Button` component (for table actions)
- `Input` component (for future search)
- `Label` component (for form fields)
- `Providers` component (TanStack Query context)
- `useAuth` hook (for auth state)

**Exports for Builder-3:**
- `Button` component (for form submit/cancel)
- `Input` component (for form fields)
- `Label` component (for form labels)
- All UI primitives from shadcn/ui

**Dashboard Shell:**
- Provides authenticated layout wrapper
- Builder-2 adds project list inside shell
- Builder-3 adds create button and modals

### Potential Issues

**Issue 1: Session token verification on every page load**
- **Problem:** Server Component calls `verifyAdminToken()` on every render
- **Solution:** Cache result in React cache (Next.js automatic with fetch)
- **Mitigation:** Database query is indexed and fast (<100ms)

**Issue 2: Password input RTL display**
- **Problem:** Password dots may display LTR in RTL context
- **Solution:** This is browser default behavior, acceptable for MVP
- **Note:** Password content is masked anyway (dots/asterisks)

**Issue 3: Logout button accessibility**
- **Problem:** No keyboard navigation for logout button
- **Solution:** Use shadcn/ui Button which has proper ARIA attributes
- **Testing:** Verify Tab key can focus logout button

---

## Builder-2: Project List & Management

### Scope

Build the project table display with sortable columns, empty/loading/error states, view/copy/delete actions, and TanStack Query state management. Create the AdminProvider context for sharing state with Builder-3.

### Complexity Estimate

**MEDIUM** (8-10 hours)

**Rationale:**
- Table UI is straightforward but requires careful RTL handling
- TanStack Query setup adds complexity (mutations, optimistic updates)
- Delete confirmation flow with rollback is moderately complex
- State management needs to integrate with Builder-3
- Not complex enough to warrant splitting

### Success Criteria

- [ ] Project list displays in table format with sortable columns
- [ ] Empty state shows when zero projects: "אין פרויקטים עדיין"
- [ ] Loading skeleton displays during initial fetch
- [ ] Hebrew text (project name, student name) is right-aligned
- [ ] Email addresses are left-aligned with `dir="ltr"`
- [ ] Created date displays in Hebrew format: "26 בנובמבר 2025"
- [ ] View count displays correctly: "5 צפיות" or "0 צפיות"
- [ ] Last accessed shows relative time: "לפני 3 ימים" or "טרם נצפה"
- [ ] Sort by date works (newest first by default)
- [ ] Sort by name works (Hebrew alphabetical order)
- [ ] View button opens `/preview/:id` in new tab
- [ ] Copy link button copies full URL to clipboard
- [ ] Copy success shows Hebrew toast: "קישור הועתק ללוח!"
- [ ] Delete button shows confirmation modal with project name
- [ ] Delete confirmation removes project from list immediately (optimistic update)
- [ ] Delete actually deletes project from database (verified by refetch)
- [ ] Error on delete shows Hebrew toast and rolls back UI
- [ ] AdminProvider context works for Builder-3 integration
- [ ] Table is responsive at 1280px+ width

### Files to Create

**Components:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/ProjectTable.tsx` - Main table component
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/ProjectRow.tsx` - Individual row (optional - can inline)
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/EmptyState.tsx` - No projects state
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/TableSkeleton.tsx` - Loading skeleton
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/DeleteConfirmModal.tsx` - Delete confirmation
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/CopyButton.tsx` - Reusable copy button
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/AdminProvider.tsx` - Context provider
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/ProjectsContainer.tsx` - Main container (Client)

**UI Components (shadcn/ui):**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/ui/table.tsx` - Table components
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/ui/dialog.tsx` - Modal components
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/ui/alert.tsx` - Alert components

**Hooks:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/hooks/useProjects.ts` - Projects fetch hook
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/hooks/useDeleteProject.ts` - Delete mutation hook
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/hooks/useAdmin.ts` - AdminProvider hook

**Utilities:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/utils/dates.ts` - Hebrew date formatting

**Updates:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/app/(auth)/admin/dashboard/page.tsx` - Add ProjectsContainer

### Dependencies

**From Builder-1:**
- `Button` component (for actions)
- `Providers` component (TanStack Query)
- Dashboard shell layout

**From Iteration 1:**
- `GET /api/admin/projects` - Fetch projects list
- `DELETE /api/admin/projects/:id` - Delete project
- `requireAdminAuth` middleware (already implemented)

**New NPM Packages:**
```bash
# Install shadcn/ui components
npx shadcn-ui@latest add table dialog alert
```

### Implementation Notes

**Table Structure:**
- Use shadcn/ui `Table` component (built on Radix UI)
- Columns (RTL order, right to left):
  1. Project Name (right-aligned, Hebrew)
  2. Student Name (right-aligned, Hebrew)
  3. Student Email (left-aligned, `dir="ltr"`)
  4. Created Date (center-aligned, Hebrew format)
  5. View Count (center-aligned, number)
  6. Actions (left-aligned, button group)

**Sorting:**
- Default: `createdAt DESC` (newest first)
- Clickable column headers
- Toggle between ascending/descending on click
- Use Hebrew collation for name sorting: `localeCompare('he')`
- Store sort state in component state (not URL params for MVP)

**Empty State:**
- Centered layout with icon (FolderOpen from lucide-react)
- Hebrew text: "אין פרויקטים עדיין"
- Subtext: "צור פרויקט חדש כדי להתחיל"
- Large "צור פרויקט חדש" button (disabled until Builder-3 completes)

**Loading Skeleton:**
- Show 5 skeleton rows (typical above-the-fold count)
- Shimmer animation using Tailwind
- Same table structure as actual data

**TanStack Query Setup:**
- Use `useQuery` for fetching projects
- Query key: `['projects']`
- Stale time: 60 seconds (1 minute)
- Retry: 1 attempt
- Enable refetch on window focus (keep data fresh)

**Delete Flow with Optimistic Update:**
1. User clicks "מחק" button
2. Show confirmation modal with project name
3. User confirms "מחק" in modal
4. **Optimistic update:** Immediately remove from UI
5. Call DELETE API endpoint
6. On success: Show success toast, invalidate query
7. On error: Rollback UI, show error toast

**AdminProvider Context:**
- Wrap dashboard with context provider
- Store modal state: `isCreateModalOpen`
- Store callback: `refetchProjects()` function
- Export `useAdmin()` hook for child components

**Copy to Clipboard:**
- Use `navigator.clipboard.writeText()`
- Fallback to `document.execCommand('copy')` for older browsers
- Show Hebrew toast: "קישור הועתק ללוח!"
- Visual feedback: Icon changes to checkmark for 2 seconds

**Hebrew Date Formatting:**
- Use `Intl.DateTimeFormat('he-IL')` for created date
- Relative time for last accessed:
  - "היום" (today)
  - "אתמול" (yesterday)
  - "לפני X ימים" (X days ago)
  - "טרם נצפה" (never accessed)

### Patterns to Follow

Reference `/home/ahiya/Ahiya/2L/Prod/StatViz/.2L/plan-1/iteration-2/plan/patterns.md`:

**TanStack Query Patterns:**
- Use `useQuery` for data fetching
- Use `useMutation` for delete operation
- Implement optimistic updates in `onMutate`
- Implement rollback in `onError`
- Invalidate queries in `onSettled`

**Modal Patterns:**
- Use shadcn/ui `Dialog` component
- Controlled state with `open` and `onOpenChange`
- RTL content with `dir="rtl"`
- Button order: Cancel (right) → Delete (left)

**Toast Patterns:**
- Success toasts: 4 seconds
- Error toasts: 6 seconds
- Position: `top-left` (RTL)

**Clipboard Patterns:**
- Primary: `navigator.clipboard.writeText()`
- Fallback: `document.execCommand('copy')`
- Visual feedback with icon change
- Hebrew toast notification

### Testing Requirements

**Manual Testing:**
1. Dashboard loads with empty state (if zero projects)
2. Dashboard loads with project list (if projects exist)
3. Loading skeleton appears briefly on initial load
4. Table columns display correctly (Hebrew right, email left)
5. Created date in Hebrew: "26 בנובמבר 2025"
6. View count: "5 צפיות"
7. Last accessed: "לפני 3 ימים" or "טרם נצפה"
8. Sort by name works (Hebrew alphabetical)
9. Sort by date works (newest first → oldest first)
10. View button opens new tab with `/preview/:id`
11. Copy link copies to clipboard (verify with paste)
12. Copy toast appears: "קישור הועתק ללוח!"
13. Delete shows confirmation with project name
14. Delete confirmation removes from list immediately
15. Delete confirmation actually deletes (verify by refresh)
16. Delete error shows toast and rolls back UI (test by disconnecting network)
17. Table is responsive at 1280px width

**Edge Cases:**
- Very long project names (test truncation or wrapping)
- Project with zero views (shows "0 צפיות")
- Project never accessed (shows "טרם נצפה")
- Multiple simultaneous deletes (test race conditions)

**Browser Testing:**
- Chrome (primary)
- Firefox (RTL + table layout)

### Integration Points for Other Builders

**Exports for Builder-3:**
- `AdminProvider` component (wrap dashboard)
- `useAdmin()` hook (access refetch function)
- `CopyButton` component (reuse in success modal)

**Integration with Builder-1:**
- Uses `Button` from Builder-1
- Renders inside dashboard shell from Builder-1
- Uses `Providers` from Builder-1 (TanStack Query)

**Integration with Builder-3:**
- Builder-3 calls `refetchProjects()` after successful creation
- Builder-3 uses `CopyButton` in success modal

### Potential Issues

**Issue 1: Hebrew table column sorting**
- **Problem:** JavaScript default sort doesn't handle Hebrew correctly
- **Solution:** Use `localeCompare('he')` for Hebrew alphabetical order
- **Example:** `a.projectName.localeCompare(b.projectName, 'he')`

**Issue 2: Mixed BiDi in table cells**
- **Problem:** Email addresses in RTL context may scramble
- **Solution:** Set `dir="ltr"` on email cell and `text-left` class
- **Example:** `<TableCell dir="ltr" className="text-left">{email}</TableCell>`

**Issue 3: Delete optimistic update race condition**
- **Problem:** User deletes, API succeeds, but refetch fails (network issue)
- **Solution:** Use `onSettled` to always invalidate query (triggers retry)
- **Fallback:** User can manually refresh page

**Issue 4: Clipboard API requires HTTPS**
- **Problem:** Clipboard API only works on localhost or HTTPS
- **Solution:** Works fine in development (localhost) and production (Vercel HTTPS)
- **Fallback:** `document.execCommand('copy')` for edge cases

**Issue 5: Table performance with 100+ projects**
- **Problem:** Large DOM size slows rendering
- **Solution:** Acceptable for MVP (<100 projects expected)
- **Future:** Implement pagination or virtual scrolling if needed

---

## Builder-3: Project Creation Flow

### Scope

Build the complete project creation flow: modal with multi-field form, dual file upload with drag-drop, progress tracking with ETA, success modal with clipboard integration, and HTML validation warnings. Most complex builder due to file upload UX.

### Complexity Estimate

**HIGH** (10-12 hours)

**Rationale:**
- Complex form with 7 fields (text, email, textarea, password, 2 files)
- Dual file upload with simultaneous progress tracking
- Progress calculation with ETA (exponential moving average)
- XMLHttpRequest implementation (not fetch)
- Success modal with multiple copy buttons
- HTML validation warnings display
- Integration with Builder-2 state management
- **Borderline VERY HIGH** - could split if needed

### Success Criteria

- [ ] "צור פרויקט חדש" button opens modal
- [ ] All form fields validate correctly:
  - [ ] Project name (Hebrew, max 500 chars)
  - [ ] Student name (Hebrew, max 255 chars)
  - [ ] Email (valid format, English)
  - [ ] Research topic (Hebrew, textarea)
  - [ ] Password (optional, min 6 chars if provided)
  - [ ] DOCX file (required, .docx only, max 50MB)
  - [ ] HTML file (required, .html only, max 50MB)
- [ ] Hebrew validation messages display inline
- [ ] Email field accepts English input with `dir="ltr"`
- [ ] Auto-generate password checkbox works (generates 8-char password)
- [ ] Generated password displays in readonly field
- [ ] Drag-and-drop accepts DOCX and HTML files
- [ ] File picker button works as fallback
- [ ] File type validation rejects non-DOCX/HTML
- [ ] File size validation rejects >50MB with Hebrew error
- [ ] Selected files display with name and size
- [ ] Remove file button clears selection
- [ ] Submit button disabled until all validations pass
- [ ] Dual progress bars appear during upload
- [ ] Progress updates smoothly (0-100%)
- [ ] Progress shows: filename, percentage, bytes loaded/total, ETA
- [ ] ETA calculation is reasonable (within 20% of actual)
- [ ] Upload completes and success modal appears
- [ ] Success modal displays:
  - [ ] Generated project URL (full path)
  - [ ] Generated password
  - [ ] Copy buttons for URL and password
  - [ ] HTML warnings (if any detected)
  - [ ] "סגור" and "צור פרויקט נוסף" buttons
- [ ] Copy buttons work and show "הועתק!" confirmation
- [ ] "צור פרויקט נוסף" clears form and reopens create modal
- [ ] "סגור" closes modal and shows new project in list
- [ ] New project appears at top of list (newest first)
- [ ] Form clears after successful submission
- [ ] Error during upload shows Hebrew message with retry button
- [ ] Retry button restarts upload (manual retry, not automatic)
- [ ] Modal close (X button) asks for confirmation if form has data
- [ ] All RTL layout is correct (button order, text alignment)

### Files to Create

**Components:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/CreateProjectButton.tsx` - Button to open modal
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/CreateProjectModal.tsx` - Modal wrapper
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/ProjectForm.tsx` - Main form component
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/FileUploadZone.tsx` - Drag-drop upload UI
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/PasswordField.tsx` - Password with auto-generate
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/UploadProgressModal.tsx` - Progress during upload
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/DualProgressBars.tsx` - DOCX + HTML progress
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/SuccessModal.tsx` - Success feedback
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/HtmlWarningsDisplay.tsx` - Validation warnings

**UI Components (shadcn/ui):**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/ui/textarea.tsx` - Textarea component

**Hooks:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/hooks/useCreateProject.ts` - Create mutation hook
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/hooks/useFileUpload.ts` - Upload progress hook

**Utilities:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/utils/upload.ts` - XMLHttpRequest upload with progress
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/utils/password-generator.ts` - Auto-generate password

**Validation:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/validation/schemas.ts` - Extend with `CreateProjectFormSchema`

**Updates:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/ProjectsContainer.tsx` - Add CreateProjectButton

### Dependencies

**From Builder-1:**
- `Button` component (submit, cancel, copy)
- `Input` component (form fields)
- `Label` component (field labels)

**From Builder-2:**
- `AdminProvider` context (for refetch)
- `useAdmin()` hook
- `CopyButton` component (reuse in success modal)

**From Iteration 1:**
- `POST /api/admin/projects` - Create project endpoint
- Zod schemas in `lib/validation/schemas.ts`
- Password generation logic in `lib/utils/password.ts` (if exists, else create)

**New NPM Packages:**
```bash
# Install shadcn/ui components
npx shadcn-ui@latest add textarea
```

### Implementation Notes

**Form Schema:**
```typescript
const CreateProjectFormSchema = z.object({
  project_name: z.string()
    .min(1, 'שם הפרויקט נדרש')
    .max(500, 'שם הפרויקט ארוך מדי')
    .regex(/[\u0590-\u05FF]/, 'שם הפרויקט חייב להכיל לפחות תו עברי אחד'),
  student_name: z.string()
    .min(1, 'שם הסטודנט נדרש')
    .max(255, 'שם הסטודנט ארוך מדי'),
  student_email: z.string()
    .email('כתובת אימייל לא תקינה')
    .max(255),
  research_topic: z.string()
    .min(1, 'נושא המחקר נדרש')
    .max(5000, 'נושא המחקר ארוך מדי'),
  password: z.string()
    .min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים')
    .optional()
    .or(z.literal('')), // Allow empty for auto-generation
  docx_file: z.instanceof(File, { message: 'קובץ DOCX נדרש' })
    .refine(file => file.size <= 50 * 1024 * 1024, 'גודל קובץ DOCX עולה על 50 MB')
    .refine(file => file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'קובץ חייב להיות מסוג DOCX'),
  html_file: z.instanceof(File, { message: 'קובץ HTML נדרש' })
    .refine(file => file.size <= 50 * 1024 * 1024, 'גודל קובץ HTML עולה על 50 MB')
    .refine(file => file.type === 'text/html' || file.name.endsWith('.html'), 'קובץ חייב להיות מסוג HTML')
})
```

**Auto-Generate Password:**
- Checkbox: "צור סיסמה אוטומטית"
- When checked: Generate 8-char password (alphanumeric, no ambiguous chars)
- Display generated password in readonly input field
- Use existing `generatePassword()` from Iteration 1 if available, else create

**File Upload with Progress:**
- Use `react-dropzone` for drag-drop UI
- Use `XMLHttpRequest` for actual upload (not fetch - need progress events)
- Upload both files **simultaneously** with `Promise.all()`
- Track progress for each file independently
- Calculate ETA using exponential moving average:
  ```typescript
  speed = speed === 0 ? currentSpeed : speed * 0.7 + currentSpeed * 0.3
  eta = (totalBytes - loadedBytes) / speed
  ```
- Update progress every 200-500ms (not every byte - performance)
- Show dual progress bars (DOCX and HTML) side by side

**Upload Error Handling:**
- Network error: "שגיאת רשת. אנא בדוק את החיבור לאינטרנט"
- Timeout (5 min): "העלאה חרגה מזמן. אנא נסה שוב"
- Server error: Display error message from API response
- **Manual Retry:** Show "נסה שוב" button (no automatic retry for 50MB files)
- **No Resume:** Full re-upload on retry (MVP simplification)

**Success Modal:**
- Display project URL: `https://statviz.xyz/preview/{projectId}` or `http://localhost:3000/preview/{projectId}`
- Use `NEXT_PUBLIC_BASE_URL` environment variable
- Display generated password
- Two copy buttons with individual "הועתק!" feedback
- HTML warnings section (collapsible if warnings exist)
- "סגור" button: Close modal, show project in list
- "צור פרויקט נוסף" button: Clear form, reopen create modal

**HTML Warnings Display:**
- Only show if warnings array is not empty
- Yellow warning icon (AlertTriangle from lucide-react)
- Title: "אזהרות HTML"
- List warnings with bullets
- Explanation: "הקובץ עשוי להיות תלוי במשאבים חיצוניים"
- "הבנתי" button to dismiss section

**Integration with Builder-2:**
- After successful creation, call `refetchProjects()` from AdminProvider
- This updates the project list to show the new project
- Use optimistic update: Don't wait for refetch to close modal

**Session Timeout During Upload:**
- Uploads typically take <3 minutes (within 30-min session timeout)
- Optional enhancement: Refresh session token on upload start
- If session expires mid-upload, show clear error: "הפגיסה פגה תוקף. נא להתחבר שוב"

**Vercel Body Size Limit:**
- Vercel Hobby: 4.5MB limit (insufficient for 50MB spec)
- **Vercel Pro Required:** $20/month for 50MB limit
- Document this prominently in setup guide
- Add warning in error message if upload fails due to size limit

### Patterns to Follow

Reference `/home/ahiya/Ahiya/2L/Prod/StatViz/.2L/plan-1/iteration-2/plan/patterns.md`:

**Form Handling:**
- Use React Hook Form with Zod validation
- Validate on blur for immediate feedback
- Display errors inline below fields

**File Upload:**
- Use `react-dropzone` for UI
- Use `XMLHttpRequest` for upload with progress
- Implement exponential moving average for ETA

**Modal Patterns:**
- Use shadcn/ui Dialog component
- Set `dir="rtl"` for Hebrew content
- Button order: Cancel right, Submit left

**Clipboard Patterns:**
- Use `navigator.clipboard.writeText()`
- Fallback to `document.execCommand('copy')`
- Visual feedback with icon change

**State Management:**
- Use TanStack Query `useMutation` for create
- Call `refetchProjects()` after success
- Handle errors with Hebrew toast messages

### Testing Requirements

**Manual Testing:**

**Form Validation:**
1. Submit empty form → All required field errors display
2. Enter invalid email → Hebrew error: "כתובת אימייל לא תקינה"
3. Enter short password (<6 chars) → "הסיסמה חייבת להכיל לפחות 6 תווים"
4. Upload .txt file as DOCX → "קובץ חייב להיות מסוג DOCX"
5. Upload 60MB file → "גודל קובץ עולה על 50 MB"

**Auto-Generate Password:**
6. Check "צור סיסמה אוטומטית" → Password appears in field
7. Uncheck → Field clears
8. Generated password is 8 characters, alphanumeric

**File Upload:**
9. Drag DOCX and HTML files → Both appear in upload zones
10. Click "Browse" button → File picker opens, selection works
11. Remove file button → Clears selection
12. Drag multiple files → Only 2 accepted (DOCX + HTML)

**Upload Progress:**
13. Submit form with valid data → Progress modal appears
14. DOCX and HTML progress bars update (0-100%)
15. Percentage, bytes loaded/total, ETA display
16. ETA is reasonable (within 20% of actual time)
17. Upload completes → Success modal appears

**Success Modal:**
18. Project URL displays correctly
19. Generated password displays
20. Copy URL button → Copies to clipboard, shows "הועתק!"
21. Copy password button → Copies to clipboard, shows "הועתק!"
22. HTML warnings display if present
23. "צור פרויקט נוסף" → Clears form, reopens create modal
24. "סגור" → Closes modal, project appears in list

**Error Handling:**
25. Disconnect network during upload → Error message + retry button
26. Retry button → Restarts upload
27. Server error (500) → Hebrew error message displays
28. Session timeout during upload → Clear error message

**RTL Layout:**
29. All Hebrew text right-aligned
30. Email field left-aligned with `dir="ltr"`
31. Button order: "ביטול" (right) → "צור פרויקט" (left)
32. Icons appear on correct side
33. Modal close button (X) top-left

**Edge Cases:**
34. Very long project name (500 chars) → Displays without overflow
35. Special characters in Hebrew → Displays correctly
36. Multiple rapid submissions → Only one proceeds (button disabled)

**Browser Testing:**
- Chrome (primary)
- Firefox (RTL + file upload)

### Integration Points

**Integration with Builder-1:**
- Uses `Button`, `Input`, `Label` components
- Renders inside dashboard shell

**Integration with Builder-2:**
- Uses `AdminProvider` context
- Calls `refetchProjects()` after successful creation
- Uses `CopyButton` component in success modal
- New project appears at top of table

### Potential Split Strategy

**If complexity proves too high, split into:**

**Builder-3 Foundation (Primary):**
- Create project modal shell
- Form with all fields (no file upload yet)
- Submit button (mock file upload for now)
- Success modal (basic version)

**Sub-Builder 3A: File Upload & Progress**
- FileUploadZone component
- XMLHttpRequest with progress tracking
- Dual progress bars
- Upload error handling and retry

**Sub-Builder 3B: Success & Integration**
- Complete success modal with copy buttons
- HTML warnings display
- Integration with AdminProvider
- Project list refetch

**Decision Point:** If after 4 hours, file upload progress tracking is taking too long, split at that point.

### Potential Issues

**Issue 1: File upload timeout (50MB files)**
- **Problem:** 50MB files may take >5 minutes on slow connections
- **Solution:** Set XMLHttpRequest timeout to 5 minutes (300 seconds)
- **Mitigation:** Show clear error message with retry button

**Issue 2: Vercel Hobby plan body size limit**
- **Problem:** Cannot upload 50MB files on Vercel Hobby (4.5MB limit)
- **Solution:** Document Vercel Pro requirement in setup guide
- **Testing:** Test with real 50MB files locally (`npm run dev` has no limit)

**Issue 3: Session timeout during upload**
- **Problem:** 30-min session timeout might expire during long upload
- **Solution:** Refresh session token on upload start (reset 30-min timer)
- **Implementation:** Make GET request to `/api/admin/projects` before upload

**Issue 4: Hebrew character validation edge cases**
- **Problem:** Regex `/[\u0590-\u05FF]/` might miss some Hebrew characters
- **Solution:** This regex covers standard Hebrew block (sufficient for MVP)
- **Future:** Add nikud support if needed (U+0591-U+05C7)

**Issue 5: Simultaneous upload race conditions**
- **Problem:** DOCX succeeds but HTML fails (partial upload)
- **Solution:** Server-side atomic rollback already implemented (Iteration 1)
- **Verification:** Server deletes DOCX if HTML fails (check server logs)

**Issue 6: Progress bar UI thrashing**
- **Problem:** Updating progress every byte causes UI to re-render too frequently
- **Solution:** Throttle updates to every 200-500ms
- **Implementation:** Use `lastTime` check in `onprogress` handler

**Issue 7: Mixed BiDi in textarea (research topic)**
- **Problem:** Hebrew text with English words may scramble
- **Solution:** Use `dir="auto"` on textarea for automatic BiDi handling
- **Testing:** Test with mixed Hebrew/English content

---

## Integration Strategy

### Shared File Locations

**Components Shared by Multiple Builders:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/ui/*` - shadcn/ui components (Builder-1 creates, all use)
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/CopyButton.tsx` - Builder-2 creates, Builder-3 uses
- `/home/ahiya/Ahiya/2L/Prod/StatViz/lib/types/admin.ts` - All builders contribute types

**Potential Conflicts:**
- `/home/ahiya/Ahiya/2L/Prod/StatViz/app/(auth)/admin/dashboard/page.tsx` - Builder-1 creates shell, Builder-2 adds content
- `/home/ahiya/Ahiya/2L/Prod/StatViz/components/admin/ProjectsContainer.tsx` - Builder-2 creates, Builder-3 adds CreateProjectButton

**Conflict Resolution:**
- Builder-1 creates file with placeholder comment: `{/* Builder-2: Add ProjectsContainer here */}`
- Builder-2 replaces placeholder with actual component
- Builder-3 adds button to existing Builder-2 component

### State Flow

**AdminProvider Context (Builder-2):**
```typescript
interface AdminContextValue {
  refetchProjects: () => void
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (open: boolean) => void
}
```

**Usage in Builder-3:**
```typescript
const { refetchProjects, setIsCreateModalOpen } = useAdmin()

async function handleSuccess() {
  await refetchProjects() // Refresh project list
  setIsCreateModalOpen(false) // Close modal
  toast.success('הפרויקט נוצר בהצלחה!')
}
```

### Integration Testing Checklist

**After all builders complete:**

1. **End-to-End Flow:**
   - [ ] Login → Dashboard → Create Project → Success → Project in List
   - [ ] All steps complete without errors
   - [ ] Hebrew text displays correctly throughout
   - [ ] RTL layout is consistent

2. **Component Integration:**
   - [ ] Builder-1 components (Button, Input) work in Builder-2 and Builder-3
   - [ ] Builder-2 AdminProvider works in Builder-3
   - [ ] Builder-2 CopyButton works in Builder-3 success modal

3. **State Management:**
   - [ ] TanStack Query provider from Builder-1 wraps all components
   - [ ] AdminProvider from Builder-2 wraps dashboard
   - [ ] Builder-3 create triggers Builder-2 refetch
   - [ ] New project appears in list immediately (optimistic update)

4. **Error Handling:**
   - [ ] Network errors show Hebrew messages
   - [ ] Validation errors display inline
   - [ ] Delete errors rollback UI
   - [ ] Upload errors show retry button

5. **RTL Consistency:**
   - [ ] All Hebrew text right-aligned
   - [ ] All email fields left-aligned
   - [ ] Button order consistent (cancel right, action left)
   - [ ] Icons on correct side
   - [ ] Modal close buttons top-left

### Execution Order

**Phase 1: Foundation (Sequential)**
1. Builder-1 completes all deliverables
2. Integration test: Login and dashboard shell work
3. Validate: RTL layout, reusable components, auth flow

**Phase 2: Parallel Building**
1. Builder-2 starts (uses Builder-1 components)
2. Builder-3 starts (uses Builder-1 components)
3. Both builders work independently
4. Communication channel for shared types (admin.ts)

**Phase 3: Integration**
1. Merge Builder-2 and Builder-3 outputs
2. Connect Builder-3 to Builder-2 AdminProvider
3. Test create → refetch → list update flow
4. Resolve any conflicts in shared files

**Phase 4: Validation**
1. Full manual testing (see Iteration 2 overview success criteria)
2. Hebrew RTL visual QA checklist
3. Browser compatibility testing (Chrome, Firefox)
4. Edge case testing (large files, network errors, validation)

**Estimated Timeline:**
- Phase 1: 6-8 hours (Builder-1)
- Phase 2: 10-12 hours (Builder-2 and Builder-3 in parallel, longer one dictates)
- Phase 3: 2-3 hours (integration)
- Phase 4: 4-6 hours (validation)
- **Total: 22-29 hours**

---

## Risk Summary

**High-Priority Risks:**

1. **File Upload Timeout (Builder-3)**
   - Mitigation: 5-min timeout, manual retry, clear error messages
   - Responsibility: Builder-3

2. **Vercel Body Size Limit (Builder-3)**
   - Mitigation: Document Vercel Pro requirement, test locally
   - Responsibility: Builder-3

3. **Hebrew RTL Layout Bugs (All Builders)**
   - Mitigation: Visual QA checklist, test with real Hebrew data
   - Responsibility: All builders

4. **Session Timeout During Upload (Builder-3)**
   - Mitigation: Refresh token on upload start, clear error message
   - Responsibility: Builder-3

**Medium-Priority Risks:**

5. **Client/Server Validation Mismatch (Builder-3)**
   - Mitigation: Reuse Zod schemas, server revalidation
   - Responsibility: Builder-3

6. **Component Integration Conflicts (All Builders)**
   - Mitigation: Clear file structure, sequential then parallel execution
   - Responsibility: Orchestrator

7. **Hebrew Table Sorting (Builder-2)**
   - Mitigation: Use `localeCompare('he')` for Hebrew alphabetical order
   - Responsibility: Builder-2

**Low-Priority Risks:**

8. **Clipboard API Browser Support**
   - Mitigation: Fallback to `document.execCommand('copy')`
   - Responsibility: Builder-2, Builder-3

9. **Progress Bar UI Thrashing**
   - Mitigation: Throttle updates to 200-500ms
   - Responsibility: Builder-3

10. **Mixed BiDi in Form Fields**
    - Mitigation: Use `dir="auto"` for textareas, `dir="ltr"` for email
    - Responsibility: Builder-3

---

**Builder Tasks Status:** COMPREHENSIVE
**Estimated Total Time:** 24-30 hours (Builder-1: 6-8h, Builder-2: 8-10h, Builder-3: 10-12h)
**Ready for:** Builder Assignment and Execution
**Integration Strategy:** Clear dependencies, minimal conflicts expected
