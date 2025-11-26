# Project Vision: StatViz Platform

**Created:** 2025-11-26
**Plan:** plan-1

---

## Problem Statement

Academic researchers (graduate students at Herzog College and other Israeli institutions) need professional statistical analysis for their thesis work, but:

**Current pain points:**
- Analysis results are delivered only in static Word documents (DOCX)
- Students struggle to understand complex statistical findings without interactivity
- No easy way to share analysis results securely with students
- Students lack pedagogical tools to learn statistics while viewing their results
- Manual file sharing via email is cumbersome and insecure
- No centralized platform for managing multiple student projects

---

## Target Users

**Primary user: Ahiya (Statistician/Admin)**
- Conducts statistical analysis using Claude Chat
- Needs to upload and manage analysis reports (DOCX + HTML)
- Shares secure links with students via intermediary (Guy)
- Meets with students to explain results

**Secondary users:**
- **Students:** View interactive reports, download DOCX files for thesis submission
- **Guy (Academic Intermediary):** Forwards links/passwords from Ahiya to students

---

## Core Value Proposition

A secure, web-based platform that delivers both traditional (DOCX) and interactive (HTML) statistical analysis reports to graduate students, with password-protected access and pedagogical features for learning.

**Key benefits:**
1. **Dual Format Delivery:** Students get professional DOCX for thesis + interactive HTML for learning
2. **Secure Sharing:** Password-protected projects with unique shareable links
3. **Pedagogical Value:** Interactive visualizations help students understand statistical concepts
4. **Centralized Management:** Admin panel for organizing all student projects
5. **Hebrew Language Support:** Full RTL support for Israeli academic institutions

---

## Feature Breakdown

### Must-Have (MVP)

1. **Admin Authentication**
   - Description: Secure login for Ahiya to access admin panel
   - User story: As Ahiya, I want to securely log in to the admin panel so that only I can create and manage projects
   - Acceptance criteria:
     - [ ] Username + password login with JWT token
     - [ ] Session timeout after inactivity
     - [ ] HTTPS-only access
     - [ ] Rate limiting on login attempts

2. **Project Creation**
   - Description: Upload DOCX + HTML files and create new project with metadata
   - User story: As Ahiya, I want to create a new project by uploading analysis files so that students can access their results
   - Acceptance criteria:
     - [ ] Form with fields: project name, student name, student email, research topic
     - [ ] Upload DOCX file (findings_hebrew.docx)
     - [ ] Upload HTML file (interactive_report.html)
     - [ ] Auto-generate or custom password
     - [ ] Generate unique project ID
     - [ ] Create shareable URL: statviz.xyz/preview/[project-id]
     - [ ] Display password and link after creation

3. **Project List (Admin)**
   - Description: View all created projects with metadata and actions
   - User story: As Ahiya, I want to see all my projects in one place so that I can manage them efficiently
   - Acceptance criteria:
     - [ ] List view with project name, student name, creation date
     - [ ] Display view count and last accessed timestamp
     - [ ] Actions: View, Delete, Copy Link
     - [ ] Search/filter functionality

4. **Password-Protected Project Access**
   - Description: Students enter password to unlock project view
   - User story: As a student, I want to enter a password to access my analysis report so that my data remains private
   - Acceptance criteria:
     - [ ] Password prompt on /preview/[project-id]
     - [ ] Validate password against hashed version
     - [ ] Create session token on success
     - [ ] Display error message in Hebrew on failure
     - [ ] Session timeout after period of inactivity

5. **Project Viewer Page**
   - Description: Display interactive HTML report and DOCX download button
   - User story: As a student, I want to view my interactive report and download the DOCX file so that I can explore results and submit for my thesis
   - Acceptance criteria:
     - [ ] Embed HTML report in iframe or direct render
     - [ ] All HTML interactions work (Plotly graphs, expandable sections)
     - [ ] Download button for DOCX file
     - [ ] Hebrew RTL layout support
     - [ ] Mobile-responsive design
     - [ ] Track view count

6. **File Storage System**
   - Description: Securely store uploaded DOCX and HTML files
   - User story: As the system, I want to store files securely so that they can be retrieved reliably
   - Acceptance criteria:
     - [ ] Upload files to S3 or local filesystem
     - [ ] Validate file types (.docx, .html only)
     - [ ] Enforce size limits (50 MB max)
     - [ ] Generate signed URLs for downloads
     - [ ] Prevent directory traversal attacks

7. **Database for Metadata**
   - Description: Store project metadata in PostgreSQL
   - User story: As the system, I want to persist project data so that it survives server restarts
   - Acceptance criteria:
     - [ ] Create `projects` table with schema
     - [ ] Store: project_id, project_name, student_name, student_email, research_topic, password_hash, created_at, docx_url, html_url, view_count, last_accessed
     - [ ] Implement CRUD operations

8. **Self-Contained HTML Validation**
   - Description: Ensure uploaded HTML files work offline
   - User story: As Ahiya, I want to verify that HTML files are self-contained so that students can access reports without internet issues
   - Acceptance criteria:
     - [ ] Check for external CSS/JS dependencies
     - [ ] Validate Plotly is embedded
     - [ ] Display warning if external resources detected
     - [ ] Test rendering in iframe

### Should-Have (Post-MVP)

1. **Project Analytics** - Track which sections students spend time on, identify confusion points
2. **Bulk Operations** - Delete multiple projects, export project list as CSV
3. **Password Reset** - Allow Ahiya to reset project passwords
4. **Email Notifications** - Auto-send project links to students (optional)
5. **Project Templates** - Save common project configurations
6. **File Versioning** - Upload revised reports without creating new project

### Could-Have (Future)

1. **Multi-Admin Support** - Multiple statisticians with separate accounts
2. **Direct Claude API Integration** - Auto-generate reports from uploaded data
3. **Comments/Annotations** - Ahiya adds notes to specific sections
4. **Export to PowerPoint** - Generate presentation slides from reports
5. **LMS Integration** - Connect with Learning Management Systems
6. **Advanced Analytics Dashboard** - Cross-project insights and trends

---

## User Flows

### Flow 1: Admin Creates Project

**Steps:**
1. Ahiya opens Claude Chat, uploads student's data.xlsx + codebook.docx
2. Claude generates findings_hebrew.docx + interactive_report.html
3. Ahiya downloads both files to computer
4. Ahiya logs into StatViz admin panel (statviz.xyz/admin)
5. Ahiya clicks "Create New Project"
6. System displays form
7. Ahiya fills in: project name, student name, student email, research topic
8. Ahiya uploads DOCX file
9. Ahiya uploads HTML file
10. Ahiya leaves password field empty (auto-generate) or enters custom password
11. Ahiya clicks "Create Project"
12. System uploads files to storage, creates database record, generates project ID
13. System displays: shareable link + password with copy buttons
14. Ahiya copies link and password
15. Ahiya emails to Guy: "Project ready. Link: [URL], Password: [PASS]"

**Edge cases:**
- **File too large:** Display error "File exceeds 50 MB limit"
- **Wrong file type:** Display error "Only .docx and .html files accepted"
- **Upload fails:** Display error, allow retry
- **Duplicate project name:** Allow (projects identified by unique ID)

**Error handling:**
- Network error during upload: Show retry button
- Database save fails: Roll back file upload, display error

### Flow 2: Student Accesses Project

**Steps:**
1. Guy forwards link + password to student via email
2. Student clicks link, opens statviz.xyz/preview/abc123xyz
3. System displays password prompt in Hebrew
4. Student enters password
5. System validates password against hash
6. On success: System creates session token, redirects to project page
7. System displays: project title, embedded HTML report, download button
8. Student explores interactive report (graphs, expandable sections)
9. Student clicks "Download DOCX"
10. System increments view count, serves DOCX file
11. Student saves file for thesis submission

**Edge cases:**
- **Wrong password:** Display Hebrew error "סיסמה שגויה. אנא נסה שוב"
- **Project deleted:** Display "Project not found"
- **Session expires:** Redirect to password prompt
- **Mobile device:** Responsive layout, simplified interactions

**Error handling:**
- File download fails: Retry mechanism
- HTML rendering issue: Fallback message with contact info

### Flow 3: Admin Manages Projects

**Steps:**
1. Ahiya logs into admin panel
2. System displays project list sorted by creation date (newest first)
3. Ahiya sees: project name, student name, views, last accessed
4. Ahiya searches for specific project by student name
5. Ahiya clicks "Copy Link" to share with another student
6. Ahiya clicks "View" to preview project as student would see it
7. Ahiya clicks "Delete" on outdated project
8. System prompts: "Are you sure? This cannot be undone"
9. Ahiya confirms
10. System deletes files from storage, removes database record

**Edge cases:**
- **No projects:** Display "No projects yet. Create your first one!"
- **Search returns no results:** Display "No matching projects"

**Error handling:**
- Delete fails: Display error, don't remove from list
- File deletion succeeds but DB delete fails: Log inconsistency, retry

---

## Data Model Overview

**Key entities:**

1. **Project**
   - Fields: id (serial), project_id (unique varchar), project_name (varchar), student_name (varchar), student_email (varchar), research_topic (text), password_hash (varchar), created_at (timestamp), created_by (varchar default 'ahiya'), docx_url (text), html_url (text), view_count (integer default 0), last_accessed (timestamp)
   - Relationships: None (single-table design for MVP)

2. **Admin (Future)**
   - Fields: id, username, password_hash, created_at
   - Relationships: Projects (one-to-many)

3. **Session (In-Memory/Cache)**
   - Fields: token, project_id, expires_at
   - Storage: Redis or in-memory for MVP

---

## Technical Requirements

**Must support:**
- Hebrew language (RTL) throughout UI
- File uploads up to 50 MB
- Password hashing (bcrypt)
- Session management (JWT or similar)
- HTTPS-only connections
- Responsive design (mobile-friendly)
- Browser compatibility: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

**Constraints:**
- HTML files must be self-contained (no external dependencies except CDN for Plotly if needed)
- DOCX files must open correctly in Microsoft Word 2016+
- Platform must work in Israel (Hebrew language, Israeli timezone)

**Preferences:**
- Next.js for frontend/backend (API routes)
- PostgreSQL for database
- AWS S3 or local filesystem for file storage
- Vercel for hosting (or traditional Node.js VPS)
- Tailwind CSS for styling

---

## Success Criteria

**The MVP is successful when:**

1. **Ahiya can create 10 projects in < 30 minutes**
   - Metric: Time from login to project creation completion
   - Target: Average < 3 minutes per project

2. **Students can access reports without technical issues**
   - Metric: Successful access rate (password entry → report view)
   - Target: > 95% success rate

3. **Interactive HTML reports function fully**
   - Metric: All Plotly graphs render, all interactive elements work
   - Target: 100% feature parity with standalone HTML file

4. **Platform uptime**
   - Metric: Uptime percentage
   - Target: > 99% uptime

5. **File download success rate**
   - Metric: DOCX download completion rate
   - Target: > 98% success rate

---

## Out of Scope

**Explicitly not included in MVP:**
- Direct Claude API integration (analysis generation happens outside platform)
- Multi-user admin (only Ahiya for now)
- Analytics dashboard (tracking exists, but no visualization)
- Comments/annotations on reports
- Email automation (Ahiya manually shares links)
- Export to other formats (PowerPoint, PDF)
- Student accounts (password-only access, no registration)
- Payment processing
- Integration with existing university systems

**Why:** Focus on core workflow (upload → share → view) first. Additional features can be added based on user feedback after validating core value proposition.

---

## Assumptions

1. Ahiya has technical competence to use admin panel (no training needed)
2. Students have modern browsers and basic internet literacy
3. File sizes will remain under 50 MB (interactive reports with embedded data)
4. Project volume: ~50 projects/month initially
5. Each project accessed by 1-3 users (student + Guy + Ahiya)
6. Claude Chat will continue generating compatible DOCX/HTML formats
7. AWS S3 or local storage will be sufficient for file storage needs
8. No GDPR compliance needed initially (Israeli students only)

---

## Open Questions

1. Should we implement automatic project deletion after X months/years?
2. What level of analytics tracking is acceptable (privacy considerations)?
3. Should Guy have a separate admin account with limited permissions?
4. Do we need audit logs for compliance purposes?
5. Should students be able to request project deletion (right to be forgotten)?
6. What happens if a student loses the password? Manual reset only?
7. Should the platform support English in addition to Hebrew for international students?

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** VISIONED
**Ready for:** Master Planning
