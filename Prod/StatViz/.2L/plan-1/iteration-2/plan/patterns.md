# Code Patterns for Iteration 2

## Extend Iteration 1 Patterns

**All patterns from Iteration 1 continue to apply:**
- API client patterns → Reference `/home/ahiya/Ahiya/2L/Prod/StatViz/.2L/plan-1/iteration-1/plan/patterns.md`
- Error handling → Use `errorResponse()` helper from `lib/utils/errors.ts`
- TypeScript types → Extend types in `lib/types/admin.ts`
- Database queries → Use Prisma client from `lib/db/client.ts`
- Authentication → Consume endpoints from Iteration 1 (`POST /api/admin/login`, etc.)

---

## New UI Patterns for Iteration 2

### Client Component Structure

**When to use:** All interactive UI (forms, buttons, modals)

**Pattern:**
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  projectId: string
  onSuccess?: () => void
}

export function ComponentName({ projectId, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleAction() {
    setIsLoading(true)
    try {
      // API call
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include' // Important: send cookies
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Unknown error')
      }

      toast.success('הפרויקט נמחק בהצלחה')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה לא ידועה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleAction} disabled={isLoading}>
      {isLoading ? 'טוען...' : 'מחק'}
    </Button>
  )
}
```

**Key Points:**
- Always use `'use client'` directive at top
- Define TypeScript interface for props
- Handle loading states with `useState`
- Use try-catch for error handling
- Display Hebrew error messages via `toast.error()`
- Call optional callbacks (`onSuccess?.()`) for parent coordination

---

### Server Component Pattern

**When to use:** Initial data fetching, authentication checks

**Pattern:**
```typescript
// app/admin/dashboard/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { verifyAdminToken } from '@/lib/auth/admin'
import { DashboardClient } from '@/components/admin/DashboardClient'

export default async function DashboardPage() {
  // Server-side auth check
  const token = cookies().get('admin_token')?.value
  if (!token || !(await verifyAdminToken(token))) {
    redirect('/admin')
  }

  // Fetch initial data (faster than client-side fetch)
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

  // Pass data to client component
  return <DashboardClient initialProjects={projects} />
}
```

**Key Points:**
- No `'use client'` directive (server component by default)
- Use `cookies()` from `next/headers` for cookie access
- Use `redirect()` for server-side redirects
- Fetch data directly with Prisma (faster than API route)
- Pass data as props to client components

---

## Form Handling Patterns

### React Hook Form with Zod Validation

**When to use:** All forms (login, project creation)

**Pattern:**
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Define Zod schema (or import from lib/validation/schemas.ts)
const FormSchema = z.object({
  project_name: z.string()
    .min(1, 'שם הפרויקט נדרש')
    .max(500, 'שם הפרויקט ארוך מדי'),
  student_email: z.string()
    .email('כתובת אימייל לא תקינה'),
  docx_file: z.instanceof(File, { message: 'קובץ DOCX נדרש' })
    .refine(file => file.size <= 50 * 1024 * 1024, 'קובץ גדול מדי (מקסימום 50MB)')
})

type FormData = z.infer<typeof FormSchema>

export function ProjectForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema)
  })

  async function onSubmit(data: FormData) {
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value)
      })

      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'שגיאה ביצירת הפרויקט')
      }

      const result = await response.json()
      toast.success('הפרויקט נוצר בהצלחה!')
      reset() // Clear form
      return result.data
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה לא ידועה')
      throw error
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
      {/* Hebrew text field */}
      <div>
        <Label htmlFor="project_name">שם הפרויקט</Label>
        <Input
          id="project_name"
          {...register('project_name')}
          placeholder="הזן שם פרויקט"
          className={errors.project_name ? 'border-red-500' : ''}
        />
        {errors.project_name && (
          <p className="text-red-600 text-sm mt-1">{errors.project_name.message}</p>
        )}
      </div>

      {/* Email field (LTR override) */}
      <div>
        <Label htmlFor="student_email">אימייל סטודנט</Label>
        <Input
          id="student_email"
          type="email"
          dir="ltr"
          className={`text-left ${errors.student_email ? 'border-red-500' : ''}`}
          {...register('student_email')}
          placeholder="student@example.com"
        />
        {errors.student_email && (
          <p className="text-red-600 text-sm mt-1">{errors.student_email.message}</p>
        )}
      </div>

      {/* File input */}
      <div>
        <Label htmlFor="docx_file">קובץ DOCX</Label>
        <Input
          id="docx_file"
          type="file"
          accept=".docx"
          {...register('docx_file')}
          className={errors.docx_file ? 'border-red-500' : ''}
        />
        {errors.docx_file && (
          <p className="text-red-600 text-sm mt-1">{errors.docx_file.message}</p>
        )}
      </div>

      {/* RTL button order: Cancel (right) → Submit (left) */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline">ביטול</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'יוצר...' : 'צור פרויקט'}
        </Button>
      </div>
    </form>
  )
}
```

**Key Points:**
- Use `zodResolver` to connect Zod schema to React Hook Form
- Define schema inline or import from `lib/validation/schemas.ts`
- Infer TypeScript types from Zod schema: `z.infer<typeof Schema>`
- Use `{...register('field_name')}` to bind inputs
- Check `errors.field_name` to display validation errors
- Set `dir="ltr"` and `className="text-left"` for email/password fields
- Use `formState.isSubmitting` for loading state
- Call `reset()` to clear form after successful submission
- RTL button order: Cancel right, Submit left

---

### File Upload with Progress

**When to use:** Dual file upload (DOCX + HTML)

**Pattern:**
```typescript
'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface UploadProgress {
  filename: string
  progress: number // 0-100
  loaded: number // bytes
  total: number // bytes
  eta: number // seconds
}

export function FileUploadZone() {
  const [docxProgress, setDocxProgress] = useState<UploadProgress | null>(null)
  const [htmlProgress, setHtmlProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/html': ['.html']
    },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 2,
    onDrop: async (acceptedFiles) => {
      const docxFile = acceptedFiles.find(f => f.name.endsWith('.docx'))
      const htmlFile = acceptedFiles.find(f => f.name.endsWith('.html'))

      if (!docxFile || !htmlFile) {
        setError('נדרשים קובץ DOCX וקובץ HTML')
        return
      }

      try {
        // Upload both files simultaneously
        await Promise.all([
          uploadFile(docxFile, setDocxProgress),
          uploadFile(htmlFile, setHtmlProgress)
        ])

        // Success - handle completion
      } catch (err) {
        setError('העלאה נכשלה. אנא נסה שוב.')
      }
    }
  })

  async function uploadFile(
    file: File,
    setProgress: (progress: UploadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)

      let lastLoaded = 0
      let lastTime = Date.now()
      let speed = 0 // bytes per second

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return

        // Calculate upload speed with exponential moving average
        const now = Date.now()
        const timeDiff = (now - lastTime) / 1000 // seconds
        const loadedDiff = event.loaded - lastLoaded
        const currentSpeed = loadedDiff / timeDiff

        // EMA with alpha = 0.3 (smoothing)
        speed = speed === 0 ? currentSpeed : speed * 0.7 + currentSpeed * 0.3

        lastLoaded = event.loaded
        lastTime = now

        const remaining = event.total - event.loaded
        const eta = Math.round(remaining / speed)

        setProgress({
          filename: file.name,
          progress: Math.round((event.loaded / event.total) * 100),
          loaded: event.loaded,
          total: event.total,
          eta: eta
        })
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error('Network error'))
      xhr.ontimeout = () => reject(new Error('Upload timeout'))
      xhr.timeout = 300000 // 5 minutes

      xhr.open('POST', '/api/admin/upload')
      xhr.send(formData)
    })
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      } ${error ? 'border-red-500' : ''}`}
    >
      <input {...getInputProps()} />

      {docxProgress || htmlProgress ? (
        <div className="space-y-4">
          {docxProgress && <ProgressBar {...docxProgress} />}
          {htmlProgress && <ProgressBar {...htmlProgress} />}
        </div>
      ) : (
        <div className="text-gray-600">
          <p className="text-lg font-medium">גרור קבצים לכאן או לחץ לבחירה</p>
          <p className="text-sm mt-2">DOCX + HTML (עד 50 MB לכל קובץ)</p>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm mt-4">{error}</p>
      )}
    </div>
  )
}

function ProgressBar({ filename, progress, loaded, total, eta }: UploadProgress) {
  return (
    <div className="text-right" dir="rtl">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{formatTime(eta)} נותרו</span>
        <span className="font-medium">{filename}</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{progress}%</span>
        <span>{formatBytes(loaded)} מתוך {formatBytes(total)}</span>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds} שניות`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')} דקות`
}
```

**Key Points:**
- Use `react-dropzone` for drag-and-drop UI
- Upload files with `XMLHttpRequest` (not fetch) for progress tracking
- Use exponential moving average for smooth ETA calculation
- Upload both files simultaneously with `Promise.all()`
- Handle progress updates every 200-500ms (not every byte)
- Display Hebrew progress labels with RTL text direction
- Set 5-minute timeout to prevent indefinite hanging

---

## State Management Patterns

### TanStack Query for Server State

**When to use:** Fetching and mutating server data (projects list)

**Setup:**
```typescript
// app/layout.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      }
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

**Fetch Pattern:**
```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

interface Project {
  projectId: string
  projectName: string
  studentName: string
  studentEmail: string
  createdAt: Date
  viewCount: number
}

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/admin/projects', {
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }

  const result = await response.json()
  return result.data.projects
}

export function ProjectList() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects
  })

  if (isLoading) return <div>טוען...</div>
  if (error) return <div>שגיאה: {error.message}</div>
  if (!projects || projects.length === 0) return <EmptyState />

  return (
    <div>
      {projects.map(project => (
        <ProjectCard key={project.projectId} project={project} />
      ))}
    </div>
  )
}
```

**Mutation with Optimistic Update:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`/api/admin/projects/${projectId}`, {
    method: 'DELETE',
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Failed to delete project')
  }
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProject,
    onMutate: async (projectId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects'] })

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData(['projects'])

      // Optimistically update UI
      queryClient.setQueryData(['projects'], (old: Project[]) =>
        old.filter(p => p.projectId !== projectId)
      )

      return { previousProjects }
    },
    onError: (err, projectId, context) => {
      // Rollback on error
      queryClient.setQueryData(['projects'], context?.previousProjects)
      toast.error('שגיאה במחיקת הפרויקט')
    },
    onSuccess: () => {
      toast.success('הפרויקט נמחק בהצלחה')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

// Usage in component
function ProjectCard({ project }: { project: Project }) {
  const deleteProject = useDeleteProject()

  function handleDelete() {
    deleteProject.mutate(project.projectId)
  }

  return (
    <div>
      <h3>{project.projectName}</h3>
      <Button onClick={handleDelete}>מחק</Button>
    </div>
  )
}
```

**Key Points:**
- Use `useQuery` for fetching data with automatic caching
- Use `useMutation` for modifying data (create, update, delete)
- Implement optimistic updates for better UX (immediate feedback)
- Always provide rollback logic in `onError`
- Use `invalidateQueries` in `onSettled` to refetch after mutation
- Display Hebrew toast messages for success/error feedback

---

## Hebrew RTL Patterns

### Global RTL Setup

**Root Layout:**
```typescript
// app/layout.tsx
import { Rubik } from 'next/font/google'
import './globals.css'

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap'
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.className}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

**Tailwind RTL Utilities:**
```typescript
// Use margin/padding logical properties
<div className="ms-4 me-2"> {/* ms = margin-start (right in RTL), me = margin-end (left in RTL) */}

// Text alignment (inherits RTL)
<h1 className="text-right">כותרת בעברית</h1> {/* Redundant - RTL is default */}

// Override to LTR for specific elements
<input dir="ltr" className="text-left" type="email" />
```

### Mixed Hebrew/English Content

**Email Field (LTR Override):**
```typescript
<div>
  <Label htmlFor="email">אימייל</Label>
  <Input
    id="email"
    type="email"
    dir="ltr"
    className="text-left"
    placeholder="student@example.com"
    {...register('student_email')}
  />
</div>
```

**Button Order (RTL):**
```typescript
// Cancel (right) → Submit (left) in RTL
<div className="flex gap-3 justify-end" dir="rtl">
  <Button variant="outline">ביטול</Button>
  <Button type="submit">שמור</Button>
</div>
```

**Icon Placement:**
```typescript
import { Plus } from 'lucide-react'

// Icon automatically flips with RTL
<Button>
  <Plus className="ml-2 h-4 w-4" /> {/* ml-2 becomes margin-right in RTL */}
  צור פרויקט חדש
</Button>
```

**Table Headers (Mixed BiDi):**
```typescript
<TableHead className="text-right">שם הפרויקט</TableHead> {/* Hebrew - right aligned */}
<TableHead className="text-left" dir="ltr">אימייל סטודנט</TableHead> {/* Email - left aligned */}
<TableHead className="text-center">צפיות</TableHead> {/* Numbers - center aligned */}
```

**Key Points:**
- Set `dir="rtl"` on `<html>` element globally
- Hebrew text naturally aligns right (no explicit `text-right` needed)
- Override with `dir="ltr"` and `text-left` for English content
- Use Tailwind logical properties (`ms`, `me`, `ps`, `pe`)
- Button order in RTL: Cancel right, Submit left
- Icons automatically flip with `ml-*` (becomes `mr-*` in RTL)

---

## Modal Patterns

### Dialog with shadcn/ui

**When to use:** Create project modal, delete confirmation, success modal

**Pattern:**
```typescript
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  onConfirm: () => void
}

export function DeleteConfirmModal({ open, onOpenChange, projectName, onConfirm }: Props) {
  function handleConfirm() {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>מחיקת פרויקט</DialogTitle>
          <DialogDescription>
            האם אתה בטוח שברצונך למחוק את הפרויקט <strong>{projectName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
          <p className="font-medium">אזהרה:</p>
          <p>פעולה זו תמחק את כל הקבצים והנתונים הקשורים לפרויקט.</p>
          <p className="font-bold mt-2">פעולה זו לא ניתנת לביטול.</p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            מחק
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Usage in parent component
function ProjectCard({ project }: { project: Project }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  return (
    <>
      <Button onClick={() => setShowDeleteModal(true)}>מחק</Button>

      <DeleteConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        projectName={project.projectName}
        onConfirm={() => handleDelete(project.projectId)}
      />
    </>
  )
}
```

**Key Points:**
- Use shadcn/ui `Dialog` component for modals
- Set `dir="rtl"` on `DialogContent` for Hebrew text
- Use `open` and `onOpenChange` props for controlled state
- DialogFooter: Cancel (right) → Confirm (left) in RTL
- Close modal in `onConfirm` callback
- Use destructive variant for delete actions

---

## Toast Notification Patterns

### Sonner Toast Usage

**When to use:** Success/error feedback, clipboard confirmation

**Setup:**
```typescript
// app/layout.tsx
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        {children}
        <Toaster
          position="top-left" // RTL: top-left instead of top-right
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: { direction: 'rtl' }
          }}
        />
      </body>
    </html>
  )
}
```

**Usage in Components:**
```typescript
import { toast } from 'sonner'

// Success toast
toast.success('הפרויקט נוצר בהצלחה!')

// Error toast
toast.error('שגיאה במחיקת הפרויקט')

// Custom duration
toast.success('קישור הועתק ללוח!', {
  duration: 2000 // 2 seconds
})

// With action button
toast('האם למחוק פרויקט?', {
  action: {
    label: 'מחק',
    onClick: () => handleDelete()
  }
})

// Promise toast (loading → success/error)
const promise = createProject(data)
toast.promise(promise, {
  loading: 'יוצר פרויקט...',
  success: 'הפרויקט נוצר בהצלחה!',
  error: 'שגיאה ביצירת הפרויקט'
})
```

**Key Points:**
- Position toasts at `top-left` for RTL layout
- Set `style: { direction: 'rtl' }` for Hebrew text
- Success toasts: 4 seconds duration
- Error toasts: 6 seconds duration (longer to read)
- Use `toast.promise()` for async operations

---

## Clipboard API Pattern

**When to use:** Copy project URL, copy password

**Pattern:**
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  text: string
  label?: string
}

export function CopyButton({ text, label = 'העתק' }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('הועתק ללוח!')

      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)

        setCopied(true)
        toast.success('הועתק ללוח!')
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackError) {
        toast.error('שגיאה בהעתקה ללוח')
      }
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copyToClipboard}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-600" />
          הועתק!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}

// Usage
<CopyButton text={projectUrl} label="העתק קישור" />
<CopyButton text={password} label="העתק סיסמה" />
```

**Key Points:**
- Use `navigator.clipboard.writeText()` (modern API)
- Provide fallback `document.execCommand('copy')` for older browsers
- Show visual confirmation (icon changes to checkmark for 2 seconds)
- Display Hebrew toast message
- Requires HTTPS or localhost (secure context)

---

## Date Formatting Patterns

### Hebrew Date Display

**When to use:** Display project creation date, last accessed

**Pattern:**
```typescript
// lib/utils/dates.ts
export function formatHebrewDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
  // Output: "26 בנובמבר 2025"
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInMs = now.getTime() - d.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return 'היום'
  if (diffInDays === 1) return 'אתמול'
  if (diffInDays < 7) return `לפני ${diffInDays} ימים`
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `לפני ${weeks} ${weeks === 1 ? 'שבוע' : 'שבועות'}`
  }
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `לפני ${months} ${months === 1 ? 'חודש' : 'חודשים'}`
  }

  return formatHebrewDate(d)
}

export function formatLastAccessed(date: Date | null): string {
  if (!date) return 'טרם נצפה'
  return formatRelativeTime(date)
}
```

**Usage:**
```typescript
import { formatHebrewDate, formatRelativeTime, formatLastAccessed } from '@/lib/utils/dates'

function ProjectCard({ project }: { project: Project }) {
  return (
    <div>
      <p>נוצר: {formatHebrewDate(project.createdAt)}</p>
      <p>גישה אחרונה: {formatLastAccessed(project.lastAccessed)}</p>
    </div>
  )
}
```

---

## File Organization

**Structure for Iteration 2:**
```
/home/ahiya/Ahiya/2L/Prod/StatViz/
├── app/
│   ├── (auth)/
│   │   └── admin/
│   │       ├── page.tsx              # Login page (Builder-1)
│   │       ├── layout.tsx            # Auth layout wrapper (Builder-1)
│   │       └── dashboard/
│   │           └── page.tsx          # Dashboard (Builder-1 shell, Builder-2 content)
│   ├── layout.tsx                    # Root layout with RTL + Providers
│   └── globals.css                   # Global styles
├── components/
│   ├── admin/
│   │   ├── LoginForm.tsx             # Builder-1
│   │   ├── DashboardHeader.tsx       # Builder-1
│   │   ├── ProjectTable.tsx          # Builder-2
│   │   ├── ProjectCard.tsx           # Builder-2 (if using cards)
│   │   ├── EmptyState.tsx            # Builder-2
│   │   ├── TableSkeleton.tsx         # Builder-2
│   │   ├── DeleteConfirmModal.tsx    # Builder-2
│   │   ├── CreateProjectButton.tsx   # Builder-3
│   │   ├── CreateProjectModal.tsx    # Builder-3
│   │   ├── ProjectForm.tsx           # Builder-3
│   │   ├── FileUploadZone.tsx        # Builder-3
│   │   ├── UploadProgress.tsx        # Builder-3
│   │   └── SuccessModal.tsx          # Builder-3
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── textarea.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   └── alert.tsx
│   └── Providers.tsx                 # TanStack Query provider
├── lib/
│   ├── hooks/
│   │   ├── useAuth.ts                # Builder-1
│   │   ├── useProjects.ts            # Builder-2
│   │   └── useDeleteProject.ts       # Builder-2
│   ├── types/
│   │   └── admin.ts                  # Shared TypeScript types
│   ├── utils/
│   │   └── dates.ts                  # Hebrew date formatting
│   └── validation/
│       └── schemas.ts                # Zod schemas (extend from Iteration 1)
└── [... Iteration 1 files remain unchanged ...]
```

---

## Import Order Convention

**Same as Iteration 1:**
```typescript
// 1. External libraries (npm packages)
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// 2. Internal libraries (absolute imports with @/)
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

// 3. Types
import type { Project } from '@/lib/types/admin'

// 4. Relative imports (same directory)
import { formatHebrewDate } from './dates'
```

---

## Testing Patterns

### Manual Testing Checklist

**Authentication Flow:**
```
[ ] Login with correct credentials → redirects to dashboard
[ ] Login with wrong password → shows Hebrew error
[ ] 6 failed attempts → rate limit message
[ ] Session persists on page refresh
[ ] Logout clears session
```

**Project List:**
```
[ ] Empty state shows when zero projects
[ ] Projects display in table
[ ] Hebrew text right-aligned
[ ] Email text left-aligned
[ ] View button opens new tab
[ ] Copy link copies to clipboard
[ ] Delete shows confirmation modal
```

**Project Creation:**
```
[ ] Form validates all fields
[ ] Hebrew validation messages display
[ ] Email field accepts English
[ ] File upload accepts DOCX and HTML
[ ] File size >50MB shows error
[ ] Progress bars update smoothly
[ ] Success modal displays link and password
[ ] New project appears in list
```

**Hebrew RTL:**
```
[ ] All Hebrew text right-aligned
[ ] Button order: Cancel right, Submit left
[ ] Email inputs left-aligned with dir="ltr"
[ ] Icons appear on correct side
[ ] Modal close button top-left
```

---

**Patterns Status:** COMPREHENSIVE
**Ready for:** Builder Implementation
**All patterns include working code examples**
