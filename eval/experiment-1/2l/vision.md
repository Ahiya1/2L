# Vision: Bookmark Manager

Build a simple bookmark manager web application.

## Core Features

### 1. Bookmark CRUD
- Create bookmarks with: URL, title, description (optional)
- Auto-fetch page title if not provided
- Edit bookmark details
- Delete bookmarks with confirmation
- List all bookmarks with search

### 2. Tags
- Add multiple tags to bookmarks
- Filter bookmarks by tag
- Tag management (create, rename, delete)
- Show tag count

### 3. UI Requirements
- Clean, minimal design
- Responsive (mobile + desktop)
- Loading states for async operations
- Error messages for failures
- Empty states when no bookmarks/results

## Technical Requirements

### Stack
- Next.js 14 with App Router
- TypeScript (strict mode)
- Tailwind CSS
- SQLite database (local file, simple setup)
- Zod for validation

### Quality
- Tests for API routes (create, read, update, delete)
- Tests for tag filtering logic
- Form validation with error messages
- No TypeScript errors
- Build must succeed

## Out of Scope
- User authentication (single user app)
- Import/export
- Browser extension
- Favicon fetching
