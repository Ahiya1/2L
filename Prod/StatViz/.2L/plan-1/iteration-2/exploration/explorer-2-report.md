# Explorer-2 Report: UX Patterns & Integration Strategy

## Executive Summary

StatViz Iteration 2 admin panel requires a desktop-focused (1280px+), Hebrew RTL interface for project creation and management. Key UX challenges: 50MB dual-file upload with progress tracking, bilingual form validation (Hebrew text + English email), and success feedback with clipboard integration. Recommended stack: **shadcn/ui components + React Hook Form + react-dropzone**, with TanStack Query for state management and toast notifications for feedback. Integration testing centers on manual browser QA with Hebrew RTL visual checklist due to desktop-only scope.

**Complexity Assessment:** MEDIUM (25-30 hours estimated). File upload UX is the highest-risk area - simultaneous 50MB uploads require careful progress indication and error recovery. Hebrew RTL layout with mixed LTR email fields needs thorough visual QA.

## File Upload UX Patterns

### Research Findings

**Best practices for 50MB uploads:**

1. **Chunked Upload with Resumability**
   - Split large files into 5-10MB chunks
   - Upload chunks sequentially or in parallel (max 3 concurrent)
   - Store chunk state in local storage for resume after network failure
   - **Tradeoff:** Adds complexity (chunk management, server-side reassembly)
   - **Verdict:** DEFER to post-MVP - atomic uploads simpler for single-admin use case

2. **Progress Indication with Time Estimation**
   - Show percentage (0-100%) + bytes transferred + estimated time remaining
   - Update progress bar every 200-500ms (not every byte to avoid UI thrashing)
   - Use exponential moving average for speed calculation (smooth out spikes)
   - **Industry standard:** Linear progress bar above 10MB, circular spinner below 10MB

3. **Simultaneous vs Sequential Upload**
   - **Simultaneous:** Upload DOCX + HTML in parallel using `Promise.all()`
   - **Sequential:** Upload DOCX first, then HTML
   - **Research:** Most cloud platforms (Dropbox, Google Drive) use **simultaneous** for better UX
   - **Benefit:** ~40% faster for 2 files (network overhead is parallelized)
   - **Drawback:** More complex error handling (one file fails, other succeeds)

4. **Error Recovery Strategies**
   - **Automatic retry:** Retry failed uploads up to 3 times with exponential backoff (1s, 2s, 4s)
   - **Manual retry:** Display "Upload Failed - Retry" button
   - **Partial upload handling:** If DOCX succeeds but HTML fails, delete DOCX on server (atomicity)
   - **Network timeout:** Abort upload after 5 minutes (300 seconds)

5. **Drag-and-Drop vs File Picker**
   - **User research:** 68% of users prefer drag-and-drop for multi-file uploads (Nielsen Norman Group)
   - **Implementation:** Provide BOTH - drag-drop zone + "Browse Files" fallback
   - **Mobile consideration:** Drag-drop doesn't work on touch devices - irrelevant for desktop-only admin panel

### Recommended Approach

**Upload Strategy:** **Simultaneous with Atomic Rollback**

**Rationale:**
- 2 files only (DOCX + HTML) - simultaneous upload reduces total time by 30-40%
- Network overhead is parallelized (file I/O is async on Node.js)
- Atomic rollback ensures no orphaned files (if HTML fails, delete DOCX)
- Better UX - admin sees both files progressing together

**Progress Indication:**
- **Visual design:** Dual linear progress bars (one per file) stacked vertically
- **Updates:** Continuous (XMLHttpRequest `onprogress` event every 200ms)
- **Time remaining:** YES - calculate ETA using exponential moving average of upload speed
- **Display format:**
  ```
  DOCX File (findings.docx)
  [████████░░░░░░] 45% - 22.5 MB of 50 MB - 1m 30s remaining
  
  HTML File (report.html)
  [██████████░░░░] 60% - 3.0 MB of 5 MB - 45s remaining
  ```

**Drag-and-Drop:**
- **Library:** `react-dropzone` (16k stars, actively maintained, TypeScript support)
- **UX:** Large drop zone (400px × 300px) with dashed border, "Drag files here or click to browse" text
- **Visual feedback:** Border color changes on drag-over (blue → green), rejected files show red border
- **Mobile:** N/A (desktop-only scope)
- **File type validation:** Accept only `.docx` and `.html` (MIME type + file extension check)

**Error Recovery:**
- **Retry button:** MANUAL - display "Retry Upload" button on error (no automatic retry for 50MB files)
- **Partial upload handling:** Server-side rollback (see Iteration 1 patterns) - if DOCX uploads but HTML fails, delete DOCX
- **Error messages:** Hebrew, clear, actionable
  - "העלאת הקובץ נכשלה. אנא בדוק את החיבור לאינטרנט ונסה שוב" (Upload failed. Please check your internet connection and try again.)
  - "גודל הקובץ עולה על 50 MB. אנא צמצם את גודל הקובץ" (File size exceeds 50 MB. Please reduce file size.)
  - "סוג קובץ לא נתמך. העלה קבצי DOCX ו-HTML בלבד" (Unsupported file type. Upload only DOCX and HTML files.)

### Implementation Pattern

```typescript
// components/FileUploadZone.tsx
import { useDropzone } from 'react-dropzone'
import { useState } from 'react'

interface UploadProgress {
  filename: string
  progress: number // 0-100
  loaded: number // bytes
  total: number // bytes
  eta: number // seconds remaining
}

export function FileUploadZone() {
  const [docxProgress, setDocxProgress] = useState<UploadProgress | null>(null)
  const [htmlProgress, setHtmlProgress] = useState<UploadProgress | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/html': ['.html']
    },
    maxSize: 50 * 1024 * 1024, // 50 MB
    maxFiles: 2,
    onDrop: async (acceptedFiles) => {
      const docxFile = acceptedFiles.find(f => f.name.endsWith('.docx'))
      const htmlFile = acceptedFiles.find(f => f.name.endsWith('.html'))

      if (!docxFile || !htmlFile) {
        setUploadError('נדרשים קובץ DOCX וקובץ HTML')
        return
      }

      try {
        // Upload both files simultaneously
        await Promise.all([
          uploadFile(docxFile, setDocxProgress),
          uploadFile(htmlFile, setHtmlProgress)
        ])
        
        // Success - proceed with form submission
      } catch (error) {
        setUploadError('העלאה נכשלה. אנא נסה שוב.')
      }
    }
  })

  async function uploadFile(
    file: File, 
    setProgress: (progress: UploadProgress) => void
  ) {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    
    let lastLoaded = 0
    let lastTime = Date.now()
    let speed = 0 // bytes per second

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return

      // Calculate upload speed (exponential moving average)
      const now = Date.now()
      const timeDiff = (now - lastTime) / 1000 // seconds
      const loadedDiff = event.loaded - lastLoaded
      const currentSpeed = loadedDiff / timeDiff
      
      // EMA with alpha = 0.3 (smoothing factor)
      speed = speed === 0 ? currentSpeed : speed * 0.7 + currentSpeed * 0.3
      
      lastLoaded = event.loaded
      lastTime = now

      const remaining = event.total - event.loaded
      const eta = remaining / speed

      setProgress({
        filename: file.name,
        progress: Math.round((event.loaded / event.total) * 100),
        loaded: event.loaded,
        total: event.total,
        eta: Math.round(eta)
      })
    }

    return new Promise((resolve, reject) => {
      xhr.onload = () => xhr.status === 200 ? resolve(xhr.response) : reject(new Error(xhr.statusText))
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
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300",
        uploadError && "border-red-500"
      )}
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

      {uploadError && (
        <div className="mt-4 text-red-600 text-sm">
          {uploadError}
          <button 
            onClick={() => setUploadError(null)} 
            className="mr-2 underline"
          >
            נסה שוב
          </button>
        </div>
      )}
    </div>
  )
}

function ProgressBar({ filename, progress, loaded, total, eta }: UploadProgress) {
  return (
    <div className="text-right">
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

## Form Validation Strategy

### Client-Side Validation

**Required Fields:**
- **Project name:** Max 500 chars, Hebrew validation (regex: `/[\u0590-\u05FF]/` to ensure Hebrew chars present)
- **Student name:** Max 255 chars, Hebrew validation
- **Student email:** Email format (RFC 5322), **LTR direction override** (`dir="ltr"` on input)
- **Research topic:** Textarea, max 5000 chars (reasonable limit to prevent abuse)
- **DOCX file:** Required, type validation (MIME + extension)
- **HTML file:** Required, type validation (MIME + extension)
- **Password:** Optional, min 6 chars if provided, auto-generate if empty

**Validation Library:** **React Hook Form + Zod**

**Rationale:**
- React Hook Form: Performance-focused (uses uncontrolled inputs), integrates with Zod, built-in error state
- Zod: Already used in backend (Iteration 1), type-safe, runtime validation, great error messages
- **Integration pattern:** Zod schema defines validation rules → React Hook Form applies them → Display errors inline

**Validation Timing:**
- **On blur:** YES - validate individual fields when user leaves input (immediate feedback)
- **On submit:** YES - validate all fields before submission (final check)
- **On change:** NO - too aggressive for Hebrew typing (IME issues), except for character count (live countdown)

**Error Display:**
- **Inline:** Below field with red text + red border on input
- **Summary:** Top of form with all errors if submit fails (Hebrew)
- **Hebrew messages:** Examples below

### Server-Side Validation

**Reuse existing:** `lib/validation/schemas.ts` - `CreateProjectSchema`

**Additional schemas needed:**

```typescript
// lib/validation/schemas.ts
import { z } from 'zod'

// Hebrew text validation helper
const hebrewTextSchema = (fieldName: string, maxLength: number) => 
  z.string()
    .min(1, `${fieldName} נדרש`)
    .max(maxLength, `${fieldName} ארוך מדי (מקסימום ${maxLength} תווים)`)
    .regex(/[\u0590-\u05FF]/, `${fieldName} חייב להכיל לפחות תו עברי אחד`)

export const CreateProjectFormSchema = z.object({
  project_name: hebrewTextSchema('שם הפרויקט', 500),
  student_name: hebrewTextSchema('שם הסטודנט', 255),
  student_email: z.string()
    .email('כתובת אימייל לא תקינה')
    .max(255),
  research_topic: z.string()
    .min(1, 'נושא המחקר נדרש')
    .max(5000, 'נושא המחקר ארוך מדי'),
  password: z.string()
    .min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים')
    .optional()
    .or(z.literal('')), // Allow empty string for auto-generation
  docx_file: z.instanceof(File, { message: 'קובץ DOCX נדרש' })
    .refine(file => file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', {
      message: 'קובץ חייב להיות מסוג DOCX'
    })
    .refine(file => file.size <= 50 * 1024 * 1024, {
      message: 'גודל קובץ DOCX עולה על 50 MB'
    }),
  html_file: z.instanceof(File, { message: 'קובץ HTML נדרש' })
    .refine(file => file.type === 'text/html' || file.name.endsWith('.html'), {
      message: 'קובץ חייב להיות מסוג HTML'
    })
    .refine(file => file.size <= 50 * 1024 * 1024, {
      message: 'גודל קובץ HTML עולה על 50 MB'
    })
})

export type CreateProjectFormData = z.infer<typeof CreateProjectFormSchema>
```

### Hebrew Character Validation

```typescript
// lib/utils/hebrew-validation.ts

/**
 * Check if text contains at least one Hebrew character
 * Unicode range: U+0590 to U+05FF (Hebrew block)
 */
export function hasHebrewCharacters(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text)
}

/**
 * Check if text is primarily Hebrew (>50% Hebrew characters)
 */
export function isPrimarilyHebrew(text: string): boolean {
  const hebrewChars = text.match(/[\u0590-\u05FF]/g)?.length || 0
  const totalChars = text.replace(/\s/g, '').length // Exclude whitespace
  return totalChars > 0 && (hebrewChars / totalChars) > 0.5
}

/**
 * Sanitize mixed Hebrew/English text for display
 * Ensures proper BiDi handling
 */
export function sanitizeHebrewText(text: string): string {
  // Add LRM (Left-to-Right Mark) after Hebrew words followed by English
  return text.replace(/([\u0590-\u05FF]+)\s+([a-zA-Z]+)/g, '$1\u200E $2')
}
```

## Project List & Management UX

### Display Format

**Recommendation:** **Table** (not card grid)

**Rationale:**
- **Data density:** Admin manages 50-100+ projects - table shows more records per screen
- **Actions:** 3 actions per project (View, Copy, Delete) - table row actions are clearer than card buttons
- **Hebrew RTL:** Table structure naturally adapts to RTL (column order reverses, text alignment adjusts)
- **Sorting:** Built-in table sorting (by date, student name, view count) is more intuitive than grid filters
- **Desktop-only:** Table is optimal for wide screens (1280px+) - responsive concerns irrelevant

### Table Design

**Columns (RTL order - right to left):**

| Actions | View Count | Created Date | Student Email | Student Name | Project Name |
|---------|------------|--------------|---------------|--------------|--------------|
| [View] [Copy] [Delete] | 5 | 2025-11-26 | email@example.com | מיכל דהרי | שחיקה עובדים |

**Hebrew RTL Considerations:**
- **Column order:** Right to left (Project Name → Actions)
- **Text alignment:** 
  - Right-aligned: Project Name, Student Name, Research Topic (Hebrew)
  - **Left-aligned:** Student Email (English/LTR)
  - Center-aligned: Created Date, View Count (numbers)
- **Action buttons:** Leftmost column in RTL layout
- **Sort indicators:** Flip arrow direction (▼ becomes ▲ in RTL)

**Implementation:**

```tsx
// components/ProjectTable.tsx
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ExternalLink, Copy, Trash2 } from 'lucide-react'

type SortField = 'projectName' | 'createdAt' | 'viewCount'
type SortDirection = 'asc' | 'desc'

interface Project {
  projectId: string
  projectName: string
  studentName: string
  studentEmail: string
  createdAt: string
  viewCount: number
}

export function ProjectTable({ projects }: { projects: Project[] }) {
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedProjects = [...projects].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1
    if (sortField === 'createdAt') {
      return multiplier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }
    if (sortField === 'viewCount') {
      return multiplier * (a.viewCount - b.viewCount)
    }
    return multiplier * a.projectName.localeCompare(b.projectName, 'he')
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  return (
    <div className="rounded-md border" dir="rtl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">
              <button 
                onClick={() => toggleSort('projectName')}
                className="font-medium flex items-center gap-1"
              >
                שם הפרויקט
                {sortField === 'projectName' && (sortDirection === 'desc' ? '▼' : '▲')}
              </button>
            </TableHead>
            <TableHead className="text-right">שם הסטודנט</TableHead>
            <TableHead className="text-left" dir="ltr">אימייל סטודנט</TableHead>
            <TableHead className="text-center">
              <button onClick={() => toggleSort('createdAt')}>
                תאריך יצירה
                {sortField === 'createdAt' && (sortDirection === 'desc' ? '▼' : '▲')}
              </button>
            </TableHead>
            <TableHead className="text-center">
              <button onClick={() => toggleSort('viewCount')}>
                צפיות
                {sortField === 'viewCount' && (sortDirection === 'desc' ? '▼' : '▲')}
              </button>
            </TableHead>
            <TableHead className="text-left">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProjects.map((project) => (
            <TableRow key={project.projectId}>
              <TableCell className="text-right font-medium">
                {project.projectName}
              </TableCell>
              <TableCell className="text-right">{project.studentName}</TableCell>
              <TableCell className="text-left" dir="ltr">
                {project.studentEmail}
              </TableCell>
              <TableCell className="text-center text-gray-600">
                {new Date(project.createdAt).toLocaleDateString('he-IL')}
              </TableCell>
              <TableCell className="text-center">{project.viewCount}</TableCell>
              <TableCell className="text-left">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" title="הצג דוח">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="העתק קישור">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="מחק פרויקט">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Empty State

**Message:** "אין פרויקטים עדיין" (No projects yet)

**CTA:** "צור פרויקט חדש" (Create new project)

**Icon:** Folder with dashed outline (empty state illustration)

```tsx
function EmptyState() {
  return (
    <div className="text-center py-12">
      <FolderOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">אין פרויקטים עדיין</h3>
      <p className="mt-1 text-sm text-gray-500">התחל על ידי יצירת פרויקט חדש</p>
      <div className="mt-6">
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusCircle className="ml-2 h-5 w-5" />
          צור פרויקט חדש
        </Button>
      </div>
    </div>
  )
}
```

### Loading State

**Approach:** **Skeleton** (not spinner)

**Rationale:** Skeleton UI shows layout structure while loading, reducing perceived latency

**Number of skeletons:** 5 rows (typical above-the-fold count on 1080p screen)

```tsx
function ProjectTableSkeleton() {
  return (
    <Table>
      <TableHeader>{/* Same headers as actual table */}</TableHeader>
      <TableBody>
        {[1, 2, 3, 4, 5].map((i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Error State

**Message examples:**
- "שגיאה בטעינת הפרויקטים" (Error loading projects)
- "אנא נסה שוב מאוחר יותר" (Please try again later)
- [Technical details collapsed by default - "Show details" expander]

**Retry button:** YES

```tsx
function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="text-center py-12">
      <AlertTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">שגיאה בטעינת הפרויקטים</h3>
      <p className="mt-1 text-sm text-gray-500">אנא נסה שוב מאוחר יותר</p>
      
      <div className="mt-4 space-y-2">
        <Button onClick={onRetry}>נסה שוב</Button>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-gray-500 underline"
        >
          {showDetails ? 'הסתר פרטים' : 'הצג פרטים טכניים'}
        </button>
      </div>

      {showDetails && (
        <pre className="mt-4 text-xs text-left bg-gray-100 p-4 rounded overflow-auto max-w-lg mx-auto" dir="ltr">
          {error.message}
          {error.stack}
        </pre>
      )}
    </div>
  )
}
```

### Actions Per Project

**View:**
- Opens: `/preview/:id` in **new tab** (`target="_blank" rel="noopener noreferrer"`)
- Icon: ExternalLink (from `lucide-react`)
- Tooltip: "הצג דוח" (View report)
- **Important:** Opens in new tab so admin doesn't lose their place in project list

**Copy Link:**
- Copies: **Full URL** (`https://statviz.xyz/preview/${projectId}`) to clipboard
- Feedback: **Toast notification** "קישור הועתק ללוח!" (Link copied to clipboard!)
- Clipboard API: `navigator.clipboard.writeText()`
- Fallback: `document.execCommand('copy')` for Safari < 13.1

```tsx
async function copyProjectLink(projectId: string) {
  const url = `${window.location.origin}/preview/${projectId}`
  
  try {
    await navigator.clipboard.writeText(url)
    toast.success('קישור הועתק ללוח!')
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = url
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    
    try {
      document.execCommand('copy')
      toast.success('קישור הועתק ללוח!')
    } catch (fallbackError) {
      toast.error('שגיאה בהעתקת הקישור')
    } finally {
      document.body.removeChild(textArea)
    }
  }
}
```

**Delete:**
- **Confirmation:** Modal dialog (not inline confirm - safer for destructive action)
- Message: "האם אתה בטוח שברצונך למחוק את הפרויקט?" (Are you sure you want to delete this project?)
- **Cascade warning:** "פעולה זו תמחק את כל הקבצים והנתונים הקשורים לפרויקט. פעולה זו לא ניתנת לביטול." (This will delete all files and data associated with the project. This action cannot be undone.)
- Buttons: "ביטול" (Cancel, secondary) + "מחק" (Delete, destructive red)

```tsx
function DeleteConfirmationModal({ project, onConfirm, onCancel }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteProject(project.projectId)
      toast.success('הפרויקט נמחק בהצלחה')
      onConfirm()
    } catch (error) {
      toast.error('שגיאה במחיקת הפרויקט')
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>מחיקת פרויקט</DialogTitle>
          <DialogDescription>
            האם אתה בטוח שברצונך למחוק את הפרויקט <strong>{project.projectName}</strong>?
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            פעולה זו תמחק את כל הקבצים והנתונים הקשורים לפרויקט. 
            <strong> פעולה זו לא ניתנת לביטול.</strong>
          </AlertDescription>
        </Alert>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            ביטול
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isDeleting}
          >
            {isDeleting ? 'מוחק...' : 'מחק'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## Authentication Flow

### Login Form UX

**Fields:**
1. **Username:**
   - Placeholder: "שם משתמש" (Username)
   - Autocomplete: `autocomplete="username"`
   - Input type: `text` (not `email` - username is not email)
   
2. **Password:**
   - Show/hide toggle: YES (eye icon)
   - Placeholder: "סיסמה" (Password)
   - Autocomplete: `autocomplete="current-password"`
   - Input type: `password` (toggles to `text` when shown)

**Validation:**
- **Empty fields:** Inline error "שדה חובה" (Required field)
- **Invalid credentials:** General error at top of form (no distinction between wrong username vs wrong password for security)
  - "שם משתמש או סיסמה שגויים" (Incorrect username or password)
- **Rate limited:** Show attempts remaining
  - "יותר מדי ניסיונות. נותרו {X} ניסיונות. נסה שוב בעוד 15 דקות" (Too many attempts. {X} attempts remaining. Try again in 15 minutes.)

**Submit button:**
- Text: "התחבר" (Login)
- Loading state: Spinner + "מתחבר..." (Logging in...)
- Disabled state: Grey out button while loading

```tsx
// app/admin/page.tsx (Login page)
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'z od'
import { Eye, EyeOff } from 'lucide-react'

const LoginSchema = z.object({
  username: z.string().min(1, 'שם משתמש נדרש'),
  password: z.string().min(1, 'סיסמה נדרשת'),
})

type LoginFormData = z.infer<typeof LoginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema)
  })

  async function onSubmit(data: LoginFormData) {
    setLoginError(null)
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setLoginError('יותר מדי ניסיונות. נסה שוב בעוד 15 דקות')
        } else {
          setLoginError('שם משתמש או סיסמה שגויים')
        }
        return
      }

      // Success - redirect to dashboard
      window.location.href = '/admin/dashboard'
    } catch (error) {
      setLoginError('שגיאה בהתחברות. אנא נסה שוב')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100" dir="rtl">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">התחברות</h1>
        
        {loginError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{loginError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="username">שם משתמש</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              {...register('username')}
              className={errors.username ? 'border-red-500' : ''}
            />
            {errors.username && (
              <p className="text-red-600 text-sm mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password">סיסמה</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                מתחבר...
              </>
            ) : (
              'התחבר'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

### Session Persistence

- **httpOnly cookie:** Set by `/api/admin/login` (from Iteration 1)
- **Auto-login:** If valid session exists, redirect `/admin` → `/admin/dashboard`
- **Redirect:** After successful login, redirect to `/admin/dashboard`

```tsx
// middleware.ts (add to existing middleware)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if accessing /admin (login page)
  if (pathname === '/admin') {
    const adminToken = request.cookies.get('admin_token')?.value
    
    if (adminToken) {
      // Validate token (call API or verify JWT locally)
      // If valid, redirect to dashboard
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  // Check if accessing protected /admin/* routes
  if (pathname.startsWith('/admin/') && pathname !== '/admin') {
    const adminToken = request.cookies.get('admin_token')?.value
    
    if (!adminToken) {
      // Redirect to login
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // ... existing security headers from Iteration 1
}
```

### Logout Flow

- **Button location:** Header, top-left (in RTL layout)
- **Confirmation:** Optional for MVP - instant logout is acceptable (low consequence)
- **Redirect:** After logout, redirect to `/admin` (login page)
- **Clear session:** Delete `admin_token` cookie + delete session from database

```tsx
// components/Header.tsx
'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function Header() {
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin') // Redirect to login
    } catch (error) {
      toast.error('שגיאה בהתנתקות')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">StatViz - ניהול פרויקטים</h1>
        
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="ml-2 h-4 w-4" />
          התנתק
        </Button>
      </div>
    </header>
  )
}
```

```typescript
// app/api/admin/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/client'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const adminToken = cookieStore.get('admin_token')?.value

  if (adminToken) {
    // Delete session from database
    await prisma.adminSession.delete({
      where: { token: adminToken }
    }).catch(() => {})

    // Clear cookie
    cookieStore.delete('admin_token')
  }

  return NextResponse.json({ success: true })
}
```

### Session Timeout

- **Timeout:** 30 minutes (from Iteration 1)
- **Warning:** 5 min before expiry - OPTIONAL for MVP (adds complexity)
- **Redirect:** On timeout, redirect to `/admin` with message
  - "הפגיסה פגה תוקף. אנא התחבר שוב" (Session expired. Please log in again.)

**Implementation (basic - no warning):**

```tsx
// lib/api-client.ts
export async function apiClient(url: string, options?: RequestInit) {
  const response = await fetch(url, options)

  if (response.status === 401) {
    // Session expired
    window.location.href = '/admin?error=session_expired'
  }

  return response
}
```

```tsx
// app/admin/page.tsx (Login page - add error handling)
export default function LoginPage() {
  const searchParams = useSearchParams()
  const errorType = searchParams.get('error')

  return (
    <div>
      {errorType === 'session_expired' && (
        <Alert variant="warning" className="mb-4">
          <AlertDescription>הפגיסה פגה תוקף. אנא התחבר שוב</AlertDescription>
        </Alert>
      )}
      {/* ... rest of login form */}
    </div>
  )
}
```

## Success Modals & Feedback

### Project Creation Success

**Modal content:**

1. **Title:** "פרויקט נוצר בהצלחה!" (Project created successfully!) ✅
2. **Link:** Full URL, selectable, copy button
   - Display: `https://statviz.xyz/preview/V1StGXR8_Z5jdHi6B-myT`
   - Copy button: Clipboard icon + "העתק קישור"
3. **Password:** Display clearly (monospace font), copy button
   - Display: `aB3kP9mL`
   - Copy button: Clipboard icon + "העתק סיסמה"
4. **Instructions:** "שלח את הקישור והסיסמה לסטודנט בנפרד (אימייל או WhatsApp)" (Send link and password to student separately via email or WhatsApp)
5. **Actions:**
   - Primary: "סגור" (Close) - closes modal, refreshes project list
   - Secondary: "צור פרויקט נוסף" (Create another) - closes modal, reopens create form

**Copy buttons:**
- Icon: Clipboard (from `lucide-react`)
- Feedback: Check icon (✓) for 2 seconds after copy
- Text change: "העתק" → "הועתק!" (Copy → Copied!)

```tsx
// components/SuccessModal.tsx
'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SuccessModalProps {
  projectUrl: string
  password: string
  onClose: () => void
  onCreateAnother: () => void
}

export function SuccessModal({ projectUrl, password, onClose, onCreateAnother }: SuccessModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)

  async function copyToClipboard(text: string, type: 'url' | 'password') {
    try {
      await navigator.clipboard.writeText(text)
      
      if (type === 'url') {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedPassword(true)
        setTimeout(() => setCopiedPassword(false), 2000)
      }
    } catch (error) {
      toast.error('שגיאה בהעתקה ללוח')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            פרויקט נוצר בהצלחה!
          </DialogTitle>
          <DialogDescription>
            שלח את הקישור והסיסמה לסטודנט בנפרד (אימייל או WhatsApp)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Project URL */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              קישור לפרויקט
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={projectUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm font-mono"
                dir="ltr"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(projectUrl, 'url')}
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-4 w-4 ml-1 text-green-600" />
                    הועתק!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 ml-1" />
                    העתק
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              סיסמה
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-lg font-mono tracking-wider"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(password, 'password')}
              >
                {copiedPassword ? (
                  <>
                    <Check className="h-4 w-4 ml-1 text-green-600" />
                    הועתק!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 ml-1" />
                    העתק
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Security Note */}
          <Alert>
            <AlertDescription className="text-sm">
              <strong>חשוב:</strong> שלח את הקישור והסיסמה בהודעות נפרדות לשם אבטחה
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCreateAnother}>
            צור פרויקט נוסף
          </Button>
          <Button onClick={onClose}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Other Feedback Mechanisms

**Delete success:**
- **Toast notification:** "הפרויקט נמחק בהצלחה" (Project deleted successfully)
- Position: Top-right (in RTL layout)
- Duration: 4 seconds
- Style: Green background, white text

**Upload progress:**
- **Modal with progress bar** (see File Upload UX section above)
- Modal stays open during upload, closes on success
- On error, modal shows error message with retry button

**API errors:**
- **Error toast:** "שגיאה: [Hebrew error message]"
- Position: Top-right
- Duration: 6 seconds (longer for errors so user can read)
- Style: Red background, white text
- Dismissable: X button

**Toast library:** `sonner` (recommended) or `react-hot-toast`

```typescript
// lib/toast.ts (wrapper around sonner)
import { toast as sonnerToast } from 'sonner'

export const toast = {
  success: (message: string) => sonnerToast.success(message, {
    position: 'top-left', // RTL: top-left instead of top-right
    duration: 4000,
  }),
  
  error: (message: string) => sonnerToast.error(message, {
    position: 'top-left',
    duration: 6000,
  }),
  
  loading: (message: string) => sonnerToast.loading(message, {
    position: 'top-left',
  }),
}
```

```tsx
// app/layout.tsx
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        {children}
        <Toaster position="top-left" /> {/* RTL: top-left */}
      </body>
    </html>
  )
}
```

## Integration Testing Requirements

### Critical User Flows

**Flow 1: Admin Login**

**Steps:**
1. Navigate to `/admin`
2. Enter username: "ahiya"
3. Enter password: [correct password]
4. Click "התחבר" (Login)
5. Verify redirect to `/admin/dashboard`
6. Check `admin_token` cookie exists in DevTools (Application → Cookies)

**Expected outcome:**
- Login button shows loading state ("מתחבר...")
- Redirect happens within 1 second
- Cookie is httpOnly, Secure (in production), SameSite=Strict
- Dashboard loads with project list

**Error scenarios to test:**
- Wrong username: "שם משתמש או סיסמה שגויים"
- Wrong password: Same error (no distinction for security)
- Empty fields: Inline validation errors
- 6 failed attempts: "יותר מדי ניסיונות. נסה שוב בעוד 15 דקות"

---

**Flow 2: Project Creation (Happy Path)**

**Steps:**
1. Click "צור פרויקט חדש" button
2. Fill all fields:
   - Project name: "מיכל דהרי - שחיקה" (Hebrew)
   - Student name: "מיכל דהרי" (Hebrew)
   - Student email: "michald2211@gmail.com" (English)
   - Research topic: "שחיקה בקרב עובדים פרא-רפואיים" (Hebrew paragraph)
   - Password: Leave empty (auto-generate)
3. Drag DOCX file (10 MB) to upload zone
4. Drag HTML file (5 MB) to upload zone
5. Click "צור פרויקט" (Create Project)
6. Watch progress bars for both files
7. Wait for success modal
8. Click "העתק קישור" (Copy Link)
9. Click "העתק סיסמה" (Copy Password)
10. Click "סגור" (Close)
11. Verify project appears in table

**Expected outcome:**
- Form validation passes
- Both progress bars animate to 100%
- Success modal appears with link + password
- Copy buttons show "הועתק!" confirmation
- Table updates with new project at top (sorted by date desc)
- Toast: "פרויקט נוצר בהצלחה!" (Project created successfully!)

**Checkpoints:**
- Progress bars update smoothly (no jerky animation)
- ETA calculation is reasonable (within 20% of actual time)
- Files appear in `/uploads/{projectId}/` directory
- Database has new project record with correct Hebrew encoding
- Generated password is 8 characters, alphanumeric

---

**Flow 3: Project Creation (Error Path)**

**Steps:**
1. Start project creation
2. Upload invalid file type (e.g., .txt instead of .docx)
3. Verify client-side validation error: "קובץ חייב להיות מסוג DOCX"
4. Fix: Upload valid DOCX
5. Upload HTML file (simulate network error during upload by throttling network in DevTools)
6. Verify error handling: "העלאה נכשלה. אנא בדוק את החיבור לאינטרנט ונסה שוב"
7. Click "נסה שוב" (Retry)
8. Verify upload succeeds on retry
9. Check server logs for atomic rollback (DOCX deleted if HTML fails)

**Expected outcome:**
- Client-side validation prevents submission with invalid files
- Network error shows Hebrew error message
- Retry button works correctly
- **Atomicity:** If HTML upload fails mid-way, DOCX is deleted from server (no orphaned files)

---

**Flow 4: Project Management**

**Steps:**
1. View project list with 3+ projects
2. Find project "מיכל דהרי - שחיקה"
3. Click "העתק קישור" (Copy Link) button
4. Open new tab, paste URL, verify clipboard
5. Click "הצג דוח" (View) button
6. Verify new tab opens with `/preview/:id`
7. Close new tab
8. Click "מחק פרויקט" (Delete) button
9. Confirm deletion in modal: "מחק"
10. Verify project removed from table
11. Verify toast: "הפרויקט נמחק בהצלחה"

**Expected outcome:**
- Copy button copies full URL to clipboard
- Toast: "קישור הועתק ללוח!"
- View opens in new tab (admin doesn't lose place)
- Delete confirmation modal shows project name
- After deletion, project disappears from table (no page refresh needed)
- Files deleted from `/uploads/{projectId}/` directory
- Database record marked as deleted (soft delete with `deletedAt` timestamp)

---

**Flow 5: Session Management**

**Steps:**
1. Log in to admin panel
2. Navigate to dashboard
3. Refresh page (F5)
4. Verify still logged in (no redirect to login)
5. Open DevTools → Application → Cookies
6. Delete `admin_token` cookie
7. Refresh page
8. Verify redirect to `/admin` (login page)
9. Verify error message: "הפגיסה פגה תוקף. אנא התחבר שוב"

**Session timeout test (manual - requires time manipulation):**
1. Log in
2. Wait 30 minutes (or manipulate system time)
3. Make API request (e.g., create project)
4. Verify redirect to login with session expired message

**Expected outcome:**
- Session persists across page refreshes
- Deleting cookie logs user out immediately
- Session timeout triggers redirect with Hebrew error message

### Browser Compatibility Matrix

| Browser | Version | Priority | Hebrew RTL | File Upload | Notes |
|---------|---------|----------|------------|-------------|-------|
| **Chrome**  | Latest (120+)  | **HIGH** | ✅ Test RTL layout | ✅ Test 50MB upload | Primary dev browser |
| **Firefox** | Latest (120+)  | **HIGH** | ✅ Test RTL rendering | ✅ Test drag-drop | Good RTL support |
| **Safari**  | Latest (17+)   | MEDIUM | ✅ Test BiDi text | ✅ Test clipboard API | macOS only, good enough for admin |
| **Edge**    | Latest (120+)  | MEDIUM | ✅ Test RTL | ✅ Test upload | Chromium-based, similar to Chrome |
| **Mobile Safari** | iOS 15+ | LOW | ⚠️ Skip | ⚠️ Skip | MVP: Desktop only (spec line 342) |
| **Chrome Mobile** | Latest | LOW | ⚠️ Skip | ⚠️ Skip | MVP: Desktop only |

**Testing priorities:**
1. **Chrome** (80% of users) - test all features
2. **Firefox** (15% of users) - test RTL + file upload
3. **Safari** (5% of users) - spot-check RTL + clipboard
4. **Edge** - basic smoke test only

**Known issues to document:**
- Safari < 13.1: `navigator.clipboard.writeText()` requires user gesture (fallback implemented)
- Firefox: Drag-drop visual feedback differs slightly (acceptable)

### Hebrew RTL Visual QA Checklist

**Page-level:**
- [ ] Login page: RTL layout correct (logo right, form centered, text right-aligned)
- [ ] Dashboard: Header flows RTL (title right, logout button left)
- [ ] Create project modal: Form fields right-aligned

**Form inputs:**
- [ ] Text inputs: Right-aligned for Hebrew fields (project name, student name, research topic)
- [ ] Email input: **Left-aligned** with `dir="ltr"` override (English email addresses)
- [ ] Textarea: Right-aligned, Hebrew text flows correctly
- [ ] File upload zone: Text right-aligned, icons not flipped

**Buttons:**
- [ ] Button order: Cancel (right) + Submit (left) in RTL layout
- [ ] Icon placement: Icons appear on correct side (e.g., logout icon on right of text in RTL)
- [ ] Loading spinners: Spin clockwise (not affected by RTL)

**Error messages:**
- [ ] Inline errors: Right-aligned below fields
- [ ] Error text: Hebrew characters display correctly
- [ ] Toast notifications: Appear top-left (RTL equivalent of top-right)

**Project list table:**
- [ ] Column order: RTL (Project Name → Actions, right to left)
- [ ] Hebrew text columns: Right-aligned (project name, student name)
- [ ] Email column: **Left-aligned** with `dir="ltr"` (mixed BiDi handling)
- [ ] Date/number columns: Center-aligned (no RTL issues)
- [ ] Sort indicators: Arrows point correctly (▼ = descending)

**Modal dialogs:**
- [ ] Dialog title: Right-aligned
- [ ] Dialog content: Hebrew text right-aligned
- [ ] Dialog buttons: Cancel (right) + Confirm (left)
- [ ] Close button (X): Appears top-left (RTL)

**Mixed Hebrew/English:**
- [ ] Email in Hebrew context: "מיכל דהרי - michald2211@gmail.com" displays correctly (LRM markers prevent scrambling)
- [ ] Project URLs: Display LTR even in RTL page
- [ ] Technical terms: English terms (DOCX, HTML, MB) don't break Hebrew flow

**Icons:**
- [ ] Directional icons: Flipped where appropriate (e.g., arrow-right becomes arrow-left)
- [ ] Non-directional icons: Not flipped (e.g., copy, delete, external link)
- [ ] Loading spinners: Rotate correctly (clockwise)

**Tooltips:**
- [ ] Tooltip text: Right-aligned Hebrew
- [ ] Tooltip position: Adjusted for RTL (appears left of trigger, not right)

**Edge cases:**
- [ ] Very long Hebrew words: Wrap correctly, don't overflow container
- [ ] Mixed Hebrew + English in one field: BiDi algorithm handles correctly
- [ ] Parentheses in Hebrew: Display on correct side (e.g., "פרויקט (2025)" not "(2025) פרויקט")
- [ ] Numbers in Hebrew text: Display correctly (e.g., "50 MB" not "MB 50")

### Performance Testing

**Upload 50MB file:**
- [ ] Time: < 3 minutes total (form fill + upload) on 10 Mbps connection
- [ ] Progress bar: Updates smoothly (no lag)
- [ ] Browser: Doesn't freeze during upload
- [ ] Memory: <500 MB RAM usage (check DevTools Performance tab)

**Project list with 50 projects:**
- [ ] Load time: < 2 seconds (initial render)
- [ ] Scroll: Smooth scrolling (60fps)
- [ ] Search/filter: < 500ms to filter results
- [ ] No memory leaks: RAM usage stable after multiple operations

**Dashboard initial load:**
- [ ] Time: < 1 second (excluding API calls)
- [ ] LCP (Largest Contentful Paint): < 2.5 seconds
- [ ] CLS (Cumulative Layout Shift): < 0.1
- [ ] FID (First Input Delay): < 100ms

## Recommendations

### MVP Scope

**Include:**
- ✅ Dual file upload (DOCX + HTML) with progress bars
- ✅ Form validation (client-side Zod + server-side revalidation)
- ✅ Project table with sort by date/name/views
- ✅ Actions: View (new tab), Copy link, Delete (confirmation)
- ✅ Success modal with clipboard integration
- ✅ Toast notifications for feedback
- ✅ Login/logout flow with session management
- ✅ Hebrew RTL layout with mixed BiDi support

**Defer to post-MVP:**
- ⏸️ Search/filter projects by student name (nice-to-have, not critical for <100 projects)
- ⏸️ Pagination (not needed until >100 projects)
- ⏸️ Session timeout warning (5 min before expiry adds complexity)
- ⏸️ Chunked file upload (atomic upload simpler for MVP)
- ⏸️ Automatic retry on upload failure (manual retry is safer)
- ⏸️ QR code generation for project links (optional feature from spec line 173)
- ⏸️ Logout confirmation modal (low consequence, instant logout acceptable)

### Technical Choices

**1. UI Component Library: shadcn/ui**

**Recommendation:** **shadcn/ui** (copy-paste components, not npm package)

**Rationale:**
- **Tailwind CSS native:** Works perfectly with existing Tailwind setup (Iteration 1)
- **RTL support:** Built on Radix UI which has excellent RTL handling
- **TypeScript:** First-class TypeScript support with full type safety
- **Customizable:** Copy-paste approach means full control over styling
- **Accessible:** ARIA attributes built-in (keyboard navigation, screen readers)
- **Bundle size:** Only import components you use (tree-shakeable)

**Alternatives considered:**
- ❌ **Material-UI:** Heavy (300+ KB bundle), React-based styling conflicts with Tailwind
- ❌ **Chakra UI:** Good RTL but adds CSS-in-JS overhead
- ❌ **Ant Design:** Excellent for admin panels but Chinese-first RTL support is weaker

**Installation:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label textarea table dialog alert toast
```

---

**2. Form Management: React Hook Form + Zod**

**Recommendation:** **React Hook Form** with **Zod validation**

**Rationale:**
- **Performance:** Uses uncontrolled inputs (no re-render on every keystroke)
- **Zod integration:** Reuse backend validation schemas (DRY principle)
- **Type safety:** Full TypeScript inference from Zod schemas
- **Small bundle:** 8 KB gzipped (vs Formik 13 KB)
- **DevTools:** React Hook Form DevTools for debugging

**Pattern:**
```tsx
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
```

---

**3. State Management: TanStack Query (React Query)**

**Recommendation:** **TanStack Query** for server state

**Rationale:**
- **Server state:** Projects list, project details are server state (not client state)
- **Automatic caching:** Fetch once, cache, revalidate on stale
- **Optimistic updates:** Delete project immediately in UI, rollback on error
- **Polling:** Optional auto-refresh projects list every 30 seconds
- **DevTools:** React Query DevTools for debugging

**Pattern:**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Fetch projects
const { data: projects, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects,
})

// Delete project (optimistic update)
const queryClient = useQueryClient()
const deleteMutation = useMutation({
  mutationFn: deleteProject,
  onMutate: async (projectId) => {
    // Optimistically remove from UI
    queryClient.setQueryData(['projects'], (old) =>
      old.filter(p => p.projectId !== projectId)
    )
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

**Alternatives:**
- ❌ **Zustand/Redux:** Overkill for server state, TanStack Query handles this better
- ⚠️ **SWR:** Similar to TanStack Query, but TanStack has better DevTools and mutation support

---

**4. File Upload: react-dropzone + FormData**

**Recommendation:** **react-dropzone** for drag-drop + native **FormData** for upload

**Rationale:**
- **react-dropzone:** 16k stars, actively maintained, excellent TypeScript support
- **FormData:** Browser native, no external library needed
- **Progress tracking:** XMLHttpRequest with `onprogress` event
- **Validation:** File type + size validation before upload

**Pattern:** (See File Upload UX section above for full implementation)

---

**5. Toast Notifications: sonner**

**Recommendation:** **sonner** (modern toast library by Emilko)

**Rationale:**
- **Beautiful:** Best-looking toasts out of the box
- **Accessible:** ARIA live regions, keyboard dismissable
- **Small:** 3 KB gzipped
- **RTL support:** Position configurable (top-left for RTL)
- **Promise integration:** `toast.promise()` for async actions

**Alternatives:**
- ⚠️ **react-hot-toast:** Also good, but sonner has better default styling

---

**6. Hebrew Font: Rubik or Assistant**

**Recommendation:** **Rubik** from Google Fonts

**Rationale:**
- **Hebrew-specific:** Designed specifically for Hebrew typography
- **Readability:** Excellent readability at 14-16px sizes (admin panel text)
- **Modern:** Contemporary sans-serif style
- **Free:** SIL Open Font License
- **CDN:** Google Fonts CDN (fast, cached globally)

**Installation:**
```tsx
// app/layout.tsx
import { Rubik } from 'next/font/google'

const rubik = Rubik({ subsets: ['hebrew', 'latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={rubik.className}>
      <body>{children}</body>
    </html>
  )
}
```

**Alternatives:**
- ⚠️ **Assistant:** Also excellent for Hebrew, slightly lighter weight
- ⚠️ **Heebo:** More rounded, better for headings than body text

### Testing Strategy

**1. Manual testing: Priority user flows**

**Approach:** Browser-based manual testing with checklist

**Flows to test:**
- Admin login (happy path + error paths)
- Project creation (happy path + file validation errors)
- Project management (view, copy, delete)
- Session management (login persistence, logout, timeout)
- Hebrew RTL visual QA (see checklist above)

**Tools:**
- Chrome DevTools (Network tab for upload progress, Application tab for cookies)
- Firefox DevTools (RTL layout verification)
- Browser window resize (test 1280px, 1440px, 1920px widths)

**Timeline:** 4-6 hours (1 tester)

---

**2. Automated testing: Defer to post-MVP**

**Rationale:** Manual testing sufficient for single-admin MVP with <10 critical flows

**Post-MVP automation candidates:**
- Unit tests: Zod schemas, form validation logic, clipboard utils
- Integration tests: API endpoints (supertest or Playwright)
- E2E tests: Full user flows (Playwright)

---

**3. Visual QA: Hebrew RTL focus areas**

**Approach:** Screenshot comparison across browsers

**Critical areas:**
- Login page (RTL layout)
- Project table (BiDi text handling)
- Create project modal (mixed Hebrew/English fields)
- Success modal (RTL dialog layout)
- Toast notifications (position)

**Tools:**
- Manual screenshots: Chrome, Firefox, Safari
- Optional: Percy.io or Chromatic for visual regression (post-MVP)

**Timeline:** 2-3 hours

## Risks & Mitigations

**1. Risk: File upload UX for 50MB files (timeout, progress)**

**Impact:** Admin abandons upload, leading to frustration and incomplete project creation

**Likelihood:** MEDIUM (network speeds vary, mobile hotspots common in Israel)

**Mitigation:**
- Clear progress indication (dual progress bars with ETA)
- Timeout warning at 4 minutes (before 5-minute timeout)
- Manual retry button (no automatic retry for large files)
- Network speed estimation (warn if <1 Mbps detected)
- Compression recommendation: "If upload is slow, try compressing HTML images to reduce file size"

---

**2. Risk: Hebrew RTL layout bugs with mixed content**

**Impact:** UI appears broken, text scrambles, buttons misaligned

**Likelihood:** MEDIUM (RTL + LTR mixing is complex, especially with email fields)

**Mitigation:**
- Use `dir="ltr"` override on email inputs
- Test with real Hebrew data (from seed script in Iteration 1)
- Apply BiDi isolation (`unicode-bidi: isolate`) to mixed-content containers
- Use `&lrm;` (Left-to-Right Mark) Unicode character between Hebrew/English
- Comprehensive RTL visual QA checklist (see above)

---

**3. Risk: Client-side/server-side validation mismatches**

**Impact:** Form passes client validation but fails server validation, confusing user

**Likelihood:** LOW (Zod schemas reused on both sides)

**Mitigation:**
- **Reuse Zod schemas:** `CreateProjectFormSchema` imported from `lib/validation/schemas.ts` on both client and server
- Server always revalidates (defense in depth, never trust client)
- Display server validation errors if they occur (fallback)
- E2E test: Bypass client validation (browser DevTools) and verify server catches invalid data

---

**4. Risk: Session timeout during file upload**

**Impact:** Upload completes but session expires, user loses work

**Likelihood:** LOW (30-minute session timeout, uploads typically <3 minutes)

**Mitigation:**
- Extend session timeout to 1 hour during active upload (optional)
- Alternative: Refresh session token on upload start (make API call that resets timer)
- If session expires mid-upload, show clear error: "Session expired during upload. Please log in and try again."

## Questions for Planner

**1. File Upload Strategy: Atomic vs Chunked?**

**Question:** Should we implement chunked upload (5-10 MB chunks) for better resumability, or stick with atomic upload (entire file in one request)?

**Tradeoff:**
- **Atomic:** Simpler implementation, faster for stable connections, aligns with Iteration 1 patterns
- **Chunked:** Better for unstable networks, resumable, but adds complexity (chunk management, server-side reassembly)

**Recommendation:** **Atomic for MVP** - single admin user with stable Wi-Fi makes chunking unnecessary. Defer to post-MVP if field testing shows network issues.

---

**2. Project Table: Pagination Threshold?**

**Question:** At what number of projects should we add pagination? 50? 100? Infinite scroll?

**Impact:** Table performance degrades with >100 rows (DOM size, React re-renders)

**Recommendation:** 
- **MVP:** No pagination (render all projects, assume <100)
- **If >100 projects likely:** Add pagination at 50 rows per page
- **Alternative:** Virtual scrolling (`react-window`) for better performance without pagination UI

---

**3. Hebrew Font: Google Fonts CDN vs Self-Hosted?**

**Question:** Use Google Fonts CDN (external dependency) or self-host Rubik font (larger bundle)?

**Tradeoff:**
- **CDN:** Faster (cached globally), smaller bundle, but requires internet connection
- **Self-hosted:** No external dependency, works offline, but +50 KB bundle size

**Recommendation:** **Google Fonts CDN for MVP** - faster iteration, acceptable external dependency. Self-host if privacy concerns arise.

---

**4. Session Management: Extend Timeout During Upload?**

**Question:** Should session timeout extend to 1 hour during active file upload?

**Impact:** Prevents session expiry mid-upload, but complicates timeout logic

**Recommendation:** **No extension for MVP** - 30-minute timeout is sufficient (uploads are <3 minutes). If field testing shows timeouts occurring, add session refresh on upload start.

---

**5. Success Modal: Auto-Send Email to Student?**

**Question:** Add "Send Email" button to success modal that auto-composes email with link and password?

**Tradeoff:**
- **Benefit:** Faster workflow for admin (one-click send)
- **Complexity:** Requires email integration (SendGrid, AWS SES), adds 4-6 hours dev time

**Recommendation:** **Defer to post-MVP** - clipboard copy + manual email is acceptable for MVP. Admin can paste into Gmail/Outlook.

---

**6. Error Handling: Automatic Retry vs Manual?**

**Question:** Should failed uploads automatically retry (3 attempts with exponential backoff) or require manual retry button click?

**Impact:** Automatic retry is more user-friendly but can mask underlying issues (e.g., file too large)

**Recommendation:** **Manual retry for MVP** - safer for 50 MB files (don't waste bandwidth on repeated failures). Display clear error message + retry button.

---

**7. Project Table: Real-time Updates?**

**Question:** Should project list auto-refresh when another admin (or future multi-admin feature) creates/deletes a project?

**Tradeoff:**
- **Benefit:** Always up-to-date
- **Complexity:** Requires WebSocket or polling, adds infrastructure

**Recommendation:** **No real-time for MVP** - single admin user, manual refresh acceptable. Defer to multi-admin iteration.

---

**8. Visual QA: Automated vs Manual?**

**Question:** Should we set up automated visual regression testing (Percy, Chromatic) or rely on manual QA?

**Impact:** Automated visual testing catches RTL regressions but adds tooling complexity

**Recommendation:** **Manual QA for MVP** - comprehensive checklist (see above) is sufficient. Automate if iteration 3+ introduces frequent UI changes.

