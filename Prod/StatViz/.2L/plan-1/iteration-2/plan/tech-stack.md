# Technology Stack - Iteration 2

## Inherited from Iteration 1

**Core Framework:**
- Next.js 14.2.0+ (App Router, TypeScript, Tailwind CSS)
- React 18.3.0 (Server Components + Client Components)

**Backend:**
- PostgreSQL 14+ (UTF-8 encoding for Hebrew)
- Prisma ORM 5.19+ (type-safe database access)

**Authentication:**
- bcryptjs 2.4.3 (password hashing, 10 rounds)
- jsonwebtoken 9.0.2 (JWT tokens for sessions)

**File Storage:**
- Local filesystem via `fs/promises` (MVP)
- Abstraction layer ready for S3 migration (post-MVP)

**Security:**
- rate-limiter-flexible 3.0.0 (in-memory rate limiting)
- Zod 3.23.8+ (runtime validation)
- Security headers middleware (XSS, CSRF protection)

**Styling:**
- Tailwind CSS 3.4+ (utility-first CSS)
- PostCSS 8.4+ (CSS processing)

**Development:**
- TypeScript 5.5+ (strict mode enabled)
- ESLint (Next.js default config)
- Prisma CLI (database migrations)

---

## New Dependencies - Iteration 2

### Production Dependencies

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

### Development Dependencies

```json
{
  "@tanstack/react-query-devtools": "^5.51.0"
}
```

---

## Detailed Technology Decisions

### 1. Form Management: React Hook Form + Zod

**Decision:** React Hook Form v7.52+ with Zod validation via @hookform/resolvers

**Rationale:**
1. **Performance:** Uncontrolled inputs minimize re-renders (critical for large forms with dual file uploads)
2. **File Upload Support:** Native `File` object handling via `register` - perfect for DOCX/HTML uploads
3. **Type Safety:** Full TypeScript inference from Zod schemas - reuse `CreateProjectSchema` from Iteration 1
4. **Bundle Size:** 9KB gzipped vs Formik 13KB - smaller bundle for better page load
5. **Integration:** `@hookform/resolvers` provides seamless Zod integration with minimal code
6. **Developer Experience:** Excellent error handling, field-level validation, and async validation support

**Alternatives Considered:**
- **Formik:** Larger bundle (13KB), more verbose API, less optimized for file uploads
- **Native React state:** Manual validation logic, no schema reuse, error-prone

**Installation:**
```bash
npm install react-hook-form @hookform/resolvers
```

**Implementation Pattern:**
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateProjectFormSchema } from '@/lib/validation/schemas'

const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting }
} = useForm({
  resolver: zodResolver(CreateProjectFormSchema)
})

// File input registration
<input
  type="file"
  {...register('docx_file')}
  accept=".docx"
/>
```

**Validation Timing:**
- **On blur:** Validate individual fields when user leaves input (immediate feedback)
- **On submit:** Final validation before submission
- **No on-change validation:** Too aggressive for Hebrew typing (IME issues)

---

### 2. State Management: TanStack Query (React Query)

**Decision:** TanStack Query v5.51+ for server state management only

**Rationale:**
1. **Server State Focus:** Project list, project details are server state - not client state
2. **Automatic Caching:** Fetch once, cache, revalidate on stale - reduces API calls
3. **Optimistic Updates:** Delete project immediately in UI, rollback on error - better UX
4. **DevTools:** React Query DevTools for debugging queries and mutations
5. **Zero Client State Needed:** Simple CRUD operations don't require Zustand/Redux
6. **Polling Support:** Optional auto-refresh projects list every 30 seconds (future feature)

**Alternatives Considered:**
- **Zustand:** Overkill for this scope (only server state needed), adds 3KB bundle
- **Redux Toolkit:** Way too complex for simple CRUD, 15KB bundle, steep learning curve
- **Native useState:** No caching, no optimistic updates, manual refetch logic

**Installation:**
```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

**Implementation Pattern:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Fetch projects with automatic caching
const { data: projects, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const res = await fetch('/api/admin/projects')
    return res.json()
  }
})

// Delete with optimistic update
const queryClient = useQueryClient()
const deleteMutation = useMutation({
  mutationFn: (projectId) => fetch(`/api/admin/projects/${projectId}`, { method: 'DELETE' }),
  onMutate: async (projectId) => {
    // Optimistically remove from UI
    await queryClient.cancelQueries({ queryKey: ['projects'] })
    const previousProjects = queryClient.getQueryData(['projects'])
    queryClient.setQueryData(['projects'], (old) =>
      old.filter(p => p.projectId !== projectId)
    )
    return { previousProjects }
  },
  onError: (err, projectId, context) => {
    // Rollback on error
    queryClient.setQueryData(['projects'], context.previousProjects)
    toast.error('שגיאה במחיקת הפרויקט')
  },
  onSuccess: () => {
    toast.success('הפרויקט נמחק בהצלחה')
  }
})
```

**Configuration:**
```typescript
// app/layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    }
  }
})

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

---

### 3. UI Component Library: shadcn/ui

**Decision:** shadcn/ui components (copy-paste approach, NOT npm package)

**Rationale:**
1. **Tailwind Native:** Built specifically for Tailwind CSS - perfect integration with existing setup
2. **RTL Support:** Built on Radix UI which has excellent RTL handling out-of-the-box
3. **Full Customization:** Copy-paste approach means 100% control over styling and behavior
4. **TypeScript First:** Full type safety with TypeScript definitions included
5. **Accessible:** ARIA attributes built-in (keyboard navigation, screen readers)
6. **Tree-Shakeable:** Only include components you actually use - minimal bundle impact
7. **No Runtime Dependency:** Components are copied into your codebase - no breaking changes from npm updates

**Alternatives Considered:**
- **Material-UI (MUI):** Heavy (300KB bundle), CSS-in-JS conflicts with Tailwind, poor RTL
- **Chakra UI:** Good RTL but adds CSS-in-JS overhead, not optimized for Tailwind
- **Ant Design:** Excellent for admin panels but Chinese-first RTL support is weaker
- **Headless UI:** Good but more manual setup, shadcn/ui provides better defaults

**Installation:**
```bash
npx shadcn-ui@latest init

# Configure:
# - TypeScript: Yes
# - Tailwind CSS: Yes
# - Import alias: @/components
# - CSS variables: Yes (for theming)

npx shadcn-ui@latest add button input label textarea table dialog alert toast
```

**Components Needed:**

| Component | Purpose | Used By |
|-----------|---------|---------|
| Button | Primary/secondary/danger buttons | All builders |
| Input | Text inputs (username, email, etc.) | Builder-1, Builder-3 |
| Label | Form field labels | Builder-1, Builder-3 |
| Textarea | Multi-line text (research topic) | Builder-3 |
| Table | Project list display | Builder-2 |
| Dialog | Modals (create, delete confirm, success) | Builder-2, Builder-3 |
| Alert | Error/warning messages | Builder-2, Builder-3 |
| Toast | Notifications (via sonner) | All builders |

**Customization for Hebrew RTL:**
```typescript
// components/ui/button.tsx
// shadcn/ui Button component works out-of-the-box with RTL
// No modifications needed - Radix UI handles dir="rtl" automatically

// For icon placement in RTL:
<Button>
  <Icon className="ml-2" /> {/* Use ml-2 in RTL, it automatically becomes margin-right */}
  Hebrew Text
</Button>
```

---

### 4. File Upload: react-dropzone + XMLHttpRequest

**Decision:** react-dropzone v14.2+ for UI + native XMLHttpRequest for upload

**Rationale:**

**react-dropzone:**
1. **Mature Library:** 16K GitHub stars, actively maintained, battle-tested
2. **Excellent TypeScript:** Full TypeScript support with detailed type definitions
3. **Accessibility:** ARIA attributes, keyboard navigation built-in
4. **File Validation:** Client-side MIME type and size validation before upload
5. **Visual Feedback:** Drag-over states, file rejection states, customizable UI
6. **Mobile-Friendly:** Works on touch devices (though MVP is desktop-only)

**XMLHttpRequest (not fetch):**
1. **Progress Tracking:** `XMLHttpRequest.upload.onprogress` event for real-time progress
2. **Cancellation:** `xhr.abort()` to cancel upload mid-flight
3. **Browser Support:** 100% support across all modern browsers
4. **No Library Needed:** Native browser API - zero bundle cost
5. **React Hook Form Integration:** File objects from `register` work directly with FormData

**Alternatives Considered:**
- **fetch with ReadableStream:** More complex, no advantage for this use case, less browser support
- **axios:** Adds 15KB bundle, XMLHttpRequest is sufficient
- **uppy:** Full-featured uploader but 100KB+ bundle - overkill for 2 files

**Installation:**
```bash
npm install react-dropzone
```

**Implementation Pattern:**
```typescript
import { useDropzone } from 'react-dropzone'

const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
  accept: {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/html': ['.html']
  },
  maxSize: 50 * 1024 * 1024, // 50 MB
  maxFiles: 2,
  onDrop: (acceptedFiles) => {
    // Handle file selection
  }
})

// Upload with progress tracking
function uploadWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100)
        onProgress(progress, event.loaded, event.total)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.response))
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error'))
    xhr.timeout = 300000 // 5 minutes
    xhr.ontimeout = () => reject(new Error('Upload timeout'))

    xhr.open('POST', '/api/admin/projects')
    xhr.send(formData)
  })
}
```

**Progress Calculation:**
```typescript
// Exponential moving average for smooth ETA
let speed = 0 // bytes per second
const alpha = 0.3 // smoothing factor

xhr.upload.onprogress = (event) => {
  const currentSpeed = loadedDiff / timeDiff
  speed = speed === 0 ? currentSpeed : speed * (1 - alpha) + currentSpeed * alpha

  const remaining = event.total - event.loaded
  const eta = Math.round(remaining / speed) // seconds
}
```

---

### 5. Toast Notifications: sonner

**Decision:** sonner v1.5+ for toast notifications

**Rationale:**
1. **Beautiful Defaults:** Best-looking toasts out-of-the-box, minimal configuration needed
2. **Small Bundle:** 3KB gzipped - lightweight
3. **RTL Configurable:** Position set to `top-left` for Hebrew RTL layout
4. **Accessible:** ARIA live regions, keyboard dismissable (Escape key)
5. **Promise Integration:** `toast.promise()` for async operations (loading → success/error)
6. **Stacking:** Automatic stacking of multiple toasts with smooth animations

**Alternatives Considered:**
- **react-hot-toast:** Also good (5KB), but sonner has better default styling
- **react-toastify:** Older (10KB), more configuration needed, heavier bundle

**Installation:**
```bash
npm install sonner
```

**Configuration:**
```typescript
// app/layout.tsx
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        {children}
        <Toaster
          position="top-left" // RTL: top-left instead of top-right
          richColors // Enable colored variants
          closeButton // Show close button
          toastOptions={{
            duration: 4000, // Success toasts: 4 seconds
            style: {
              direction: 'rtl', // Ensure RTL text direction
            }
          }}
        />
      </body>
    </html>
  )
}
```

**Usage Pattern:**
```typescript
import { toast } from 'sonner'

// Success toast
toast.success('הפרויקט נוצר בהצלחה!')

// Error toast
toast.error('שגיאה במחיקת הפרויקט')

// Loading toast (for async operations)
const promise = deleteProject(projectId)
toast.promise(promise, {
  loading: 'מוחק פרויקט...',
  success: 'הפרויקט נמחק בהצלחה',
  error: 'שגיאה במחיקת הפרויקט'
})

// Custom toast with action
toast('קישור הועתק ללוח!', {
  duration: 2000,
  icon: '✓'
})
```

---

### 6. Icons: lucide-react

**Decision:** lucide-react v0.424+ for icon library

**Rationale:**
1. **Tree-Shakeable:** Only import icons you use - minimal bundle impact (~1KB per icon)
2. **RTL-Friendly:** SVG icons work perfectly with RTL (no special handling needed)
3. **Modern Design:** Clean, consistent icon set with 300+ icons
4. **TypeScript:** Full TypeScript support with auto-complete
5. **Customizable:** Size, color, stroke-width easily customizable via props
6. **Active Maintenance:** Frequent updates, responsive maintainers

**Alternatives Considered:**
- **Heroicons:** Good but fewer icons (230 vs 300+)
- **React Icons:** Large bundle if importing from multiple sets
- **Font Awesome:** Heavier, requires font loading

**Installation:**
```bash
npm install lucide-react
```

**Usage Pattern:**
```typescript
import { Eye, EyeOff, Plus, Trash2, Copy, ExternalLink, Loader2 } from 'lucide-react'

// Basic icon
<Plus className="h-5 w-5" />

// Icon in RTL button (icon automatically flips with dir="rtl")
<Button>
  <Plus className="ml-2 h-4 w-4" />
  צור פרויקט חדש
</Button>

// Loading spinner
<Loader2 className="h-4 w-4 animate-spin" />

// Conditional icon (password visibility toggle)
{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
```

**Icons Needed:**
- `Plus` - Create button
- `Trash2` - Delete button
- `Copy` - Copy link/password
- `ExternalLink` - View in new tab
- `Eye`, `EyeOff` - Password visibility toggle
- `Loader2` - Loading spinner
- `AlertTriangle` - Warnings
- `Check` - Success confirmation
- `X` - Close/Cancel
- `Upload` - File upload

---

### 7. Hebrew Font: Rubik

**Decision:** Rubik from Google Fonts

**Rationale:**
1. **Hebrew-Specific:** Designed specifically for Hebrew typography with proper nikud support
2. **Excellent Readability:** Clear at 14-16px sizes (typical admin panel text)
3. **Modern Aesthetic:** Contemporary sans-serif style, professional appearance
4. **Wide Weight Range:** 300-900 weights for typographic hierarchy
5. **Free License:** SIL Open Font License - no usage restrictions
6. **CDN Performance:** Google Fonts CDN is globally cached and fast

**Alternatives Considered:**
- **Heebo:** Lighter, more compact, but less distinct for headings
- **Assistant:** Also excellent, slightly more geometric
- **Noto Sans Hebrew:** Google's fallback font, less character

**Installation:**
```typescript
// app/layout.tsx
import { Rubik } from 'next/font/google'

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-rubik',
  display: 'swap', // Prevent FOIT (Flash of Invisible Text)
})

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

**Tailwind Configuration:**
```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-rubik)', 'Heebo', 'sans-serif'], // Rubik primary, Heebo fallback
      }
    }
  }
}
```

**Font Weights Usage:**
- **300 (Light):** Subtle text, de-emphasized content
- **400 (Regular):** Body text, most UI elements
- **500 (Medium):** Buttons, emphasis, table headers
- **700 (Bold):** Headings, important callouts

---

## Browser Support

**Target Browsers:**
- Chrome/Edge: Latest 2 versions (80%+ of users)
- Firefox: Latest 2 versions (15% of users)
- Safari: Latest 2 versions (5% of users)

**Desktop-Only Scope:**
- **Minimum Width:** 1280px (per master plan line 342)
- **No Mobile Support:** Iteration 2 is desktop-only admin panel
- **Mobile:** Deferred to Iteration 3 (student-facing viewer)

**Browser Feature Requirements:**
- XMLHttpRequest upload progress (100% support in modern browsers)
- Clipboard API (requires HTTPS or localhost - ✓ Vercel provides HTTPS)
- FormData (100% support)
- ES2020+ JavaScript features (transpiled by Next.js if needed)
- CSS Grid and Flexbox (100% support)

**Testing Priority:**
1. **Chrome** (primary dev browser) - test all features
2. **Firefox** (good RTL rendering) - test RTL + file upload
3. **Safari** (macOS only) - spot-check RTL + clipboard

---

## Environment Variables

**New Variables for Iteration 2:**

None - all environment variables already defined in Iteration 1

**Existing Variables (from Iteration 1):**

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/statviz"

# Authentication
JWT_SECRET="<generate with: openssl rand -base64 32>"
ADMIN_USERNAME="ahiya"
ADMIN_PASSWORD_HASH="<generate with bcrypt>"

# File Storage
STORAGE_TYPE="local"
UPLOAD_DIR="./uploads"

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"
```

**Important Notes:**
- `NEXT_PUBLIC_BASE_URL` is used for generating project URLs in success modal
- Local development: `http://localhost:3000`
- Production (Iteration 3): `https://statviz.xyz`

---

## Dependencies Summary

**Total New Dependencies:** 6 production + 1 development

**Bundle Size Impact:**
- @tanstack/react-query: 12KB gzipped
- react-hook-form: 9KB gzipped
- @hookform/resolvers: 2KB gzipped
- react-dropzone: 8KB gzipped
- sonner: 3KB gzipped
- lucide-react: ~1KB per icon (5-10 icons = 5-10KB)

**Total Addition:** ~40KB gzipped (acceptable for admin panel)

**Final Production Dependencies:**
```json
{
  "@hookform/resolvers": "^3.9.0",
  "@prisma/client": "^5.19.0",
  "@tanstack/react-query": "^5.51.0",
  "bcryptjs": "^2.4.3",
  "cheerio": "^1.0.0-rc.12",
  "jsonwebtoken": "^9.0.2",
  "lucide-react": "^0.424.0",
  "multer": "^1.4.5-lts.1",
  "nanoid": "^5.0.7",
  "next": "^14.2.0",
  "next-connect": "^1.0.0",
  "rate-limiter-flexible": "^3.0.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "react-dropzone": "^14.2.0",
  "react-hook-form": "^7.52.0",
  "sonner": "^1.5.0",
  "validator": "^13.11.0",
  "zod": "^3.23.8"
}
```

**Final Development Dependencies:**
```json
{
  "@tanstack/react-query-devtools": "^5.51.0",
  "@types/bcryptjs": "^2.4.6",
  "@types/jsonwebtoken": "^9.0.6",
  "@types/multer": "^1.4.11",
  "@types/node": "^20.14.0",
  "@types/react": "^18.3.0",
  "@types/validator": "^13.11.9",
  "autoprefixer": "^10.4.19",
  "postcss": "^8.4.38",
  "prisma": "^5.19.0",
  "tailwindcss": "^3.4.4",
  "typescript": "^5.5.0"
}
```

---

## Performance Targets

**Page Load:**
- Dashboard initial load: <2 seconds (with 50 projects)
- Login page load: <1 second
- Modal open: <200ms
- Form validation: <100ms per field

**Network:**
- File upload (50MB): <3 minutes total (network-dependent)
- API response time: <500ms (excluding file upload)
- Database query: <100ms (indexed queries)

**Interaction:**
- Button click feedback: <50ms
- Toast notification: appears instantly
- Clipboard copy: <50ms
- Form submission: <1 second (excluding upload)

**Core Web Vitals:**
- LCP (Largest Contentful Paint): <2.5s
- FID (First Input Delay): <100ms
- CLS (Cumulative Layout Shift): <0.1

---

## Security Considerations

**All security measures from Iteration 1 continue to apply:**

1. bcrypt password hashing (10 rounds)
2. JWT tokens with expiration (30 min admin)
3. httpOnly, Secure, SameSite=Strict cookies
4. Rate limiting (5 attempts/15 min admin login)
5. Zod validation on all inputs
6. MIME type whitelisting (.docx, .html only)
7. File size limits (50 MB)
8. SQL injection prevention (Prisma parameterized queries)
9. XSS protection (input escaping, CSP headers)
10. HTTPS enforcement (Vercel automatic SSL)

**New Iteration 2 Considerations:**

**Client-Side Validation:**
- Not a security boundary - always revalidate on server
- Improves UX but can be bypassed via DevTools
- Server validation is source of truth

**Clipboard API:**
- Requires HTTPS or localhost (secure context)
- Works automatically on Vercel (HTTPS enabled)
- Fallback to `document.execCommand('copy')` for older browsers

**File Upload Progress:**
- Progress events are client-side only (don't trust for validation)
- Server must independently verify file size and content
- XMLHttpRequest timeout prevents indefinite hanging (5 min max)

---

**Tech Stack Status:** FINALIZED
**Dependencies:** All versions specified and justified
**Ready for:** Implementation by Builders
