# STATVIZ PLATFORM SPECIFICATION
# ==============================
# Version: 1.0
# Date: November 26, 2025
# Platform: Statistical Analysis Visualization & Reporting System for Academic Research

---

## EXECUTIVE SUMMARY

**StatViz** is a platform for delivering interactive statistical analysis reports to graduate students at Herzog College and other Israeli academic institutions. The system bridges between Ahiya (statistician), Guy (academic intermediary), and students (end users).

**Core Value Proposition:**
- Students get professional statistical analysis
- Results presented in both traditional (DOCX) and interactive (HTML) formats
- Hebrew language support throughout
- Pedagogical focus: Students learn while viewing results
- Secure, password-protected project access

---

## SYSTEM ARCHITECTURE

### **High-Level Overview**

```
┌─────────────┐
│   Student   │ Collects data, sends to Guy
└──────┬──────┘
       │
       ↓ Email with files
┌─────────────┐
│     Guy     │ Forwards to Ahiya
└──────┬──────┘
       │
       ↓ Email with data.xlsx + codebook.docx
┌─────────────┐
│    Ahiya    │ Statistician
└──────┬──────┘
       │
       ↓ Opens Claude Chat + Uploads files
┌─────────────┐
│   Claude    │ Processes with system_prompt.md
└──────┬──────┘
       │
       ↓ Generates 2 files
┌─────────────┐
│  Downloads  │ • findings_hebrew.docx
└──────┬──────┘ • interactive_report.html
       │
       ↓ Uploads to StatViz
┌─────────────┐
│   StatViz   │ Creates project with ID
│   Admin     │ Generates: statviz.xyz/preview/[project-id]
└──────┬──────┘
       │
       ↓ Sends link + password
┌─────────────┐
│     Guy     │ Shares with student
└──────┬──────┘
       │
       ↓ Access via link
┌─────────────┐
│   Student   │ Views HTML + Downloads DOCX
└─────────────┘
       │
       ↓ Meets for explanation
┌─────────────┐
│    Ahiya    │ Explains results using interactive features
└─────────────┘
```

---

## USER ROLES

### **Role 1: Admin (Ahiya)**
**Capabilities:**
- ✅ Create new projects
- ✅ Upload files (DOCX + HTML)
- ✅ Generate shareable links
- ✅ Set/reset passwords
- ✅ View all projects
- ✅ Delete projects
- ✅ View analytics (optional future feature)

**Access Level:** Full platform access

### **Role 2: Project Viewer (Student + Guy)**
**Capabilities:**
- ✅ View specific project via link
- ✅ Interact with HTML report
- ✅ Download DOCX file
- ❌ Cannot see other projects
- ❌ Cannot modify anything
- ❌ Cannot create projects

**Access Level:** Single project, password-protected

---

## WORKFLOW DOCUMENTATION

### **Phase 1: Data Collection (Outside Platform)**
```
Student → Collects data via questionnaires
        → Prepares Excel/CSV file
        → Writes codebook in Word
        → Emails to Guy
Guy     → Forwards to Ahiya
```

### **Phase 2: Analysis (Claude Chat)**
```
Ahiya   → Opens Claude Chat
        → Pastes system_prompt.md
        → Uploads data.xlsx + codebook.docx
        
Claude  → Validates files
        → Warns about issues
        → Asks for confirmation
        
Ahiya   → Confirms "go ahead"
        
Claude  → Processes data
        → Runs statistical analyses
        → Generates Hebrew DOCX
        → Generates self-contained HTML
        → Provides download links
        
Ahiya   → Downloads both files to computer
```

### **Phase 3: Upload to StatViz (Admin Panel)**
```
Ahiya → Logs into StatViz admin panel (statviz.xyz/admin)
      → Clicks "Create New Project"
      
Form fields:
├── Project Name: [e.g., "מיכל דהרי - שחיקה"]
├── Student Name: [e.g., "מיכל דהרי"]  
├── Student Email: [e.g., "michald2211@gmail.com"]
├── Research Topic: [e.g., "שחיקה בקרב עובדים פרא-רפואיים"]
├── Upload DOCX: [Choose file]
├── Upload HTML: [Choose file]
└── Password: [Auto-generated or custom]

Ahiya → Clicks "Create Project"

System → Uploads files to storage
       → Creates unique project ID
       → Generates link: statviz.xyz/preview/[project-id]
       → Displays: "Project created! Share link and password"
```

### **Phase 4: Share with Student (Email/SMS)**
```
Ahiya → Copies link and password
      → Emails to Guy:
      
"היי גיא,
הניתוח הסטטיסטי של מיכל דהרי מוכן.

לינק: https://statviz.xyz/preview/abc123xyz
סיסמה: 2R9kPm4L

הקובץ להגשה (DOCX) ניתן להורדה מהלינק.
הדוח האינטראקטיבי זמין לצפייה ישירה.

בהצלחה!
אחיה"

Guy   → Forwards to student with context
```

### **Phase 5: Student Access (Web Browser)**
```
Student → Opens link in browser
        → Sees password prompt
        → Enters password
        → Granted access to project page

Project Page shows:
├── Project title
├── Interactive HTML report (embedded, viewable)
├── Download button for DOCX
└── Nothing else (no other projects visible)

Student → Explores interactive report
        → Downloads DOCX for thesis
```

### **Phase 6: Explanation Session (In-Person or Zoom)**
```
Ahiya + Student → Meet for explanation
                → Open StatViz link together
                → Ahiya walks through:
                  • Executive summary
                  • Each hypothesis with graphs
                  • Interactive simulations
                  • Calculations (expandable)
                  • Teaching scripts section
                
Student → Asks questions
        → Ahiya answers using prepared scripts
        → Student gains statistical literacy
```

---

## FILE FORMAT SPECIFICATIONS

### **Input Files (From Student → Ahiya)**

#### **1. Data File**
**Format:** Excel (.xlsx) or CSV (.csv)
**Structure:**
```
Row 1: Column headers (variable names)
Rows 2-N: Participant data

Example:
| age | seniority | training | item1 | item2 | item3 | ... |
|-----|-----------|----------|-------|-------|-------|-----|
| 32  | 5         | 1        | 4     | 3     | 5     | ... |
| 45  | 12        | 2        | 2     | 4     | 3     | ... |
```

**Requirements:**
- ✅ Headers in English or Hebrew
- ✅ Numeric data in cells
- ✅ One participant per row
- ✅ No merged cells
- ✅ No formulas (values only)
- ⚠️ Missing data acceptable (< 30%)

#### **2. Codebook File**
**Format:** Word Document (.docx)
**Language:** Hebrew
**Structure:**
```
1. נספח לניתוח הנתונים
2. קידוד נתונים (reference to data file)
3. פרטים אישיים (researcher info)
4. נושא והשערות המחקר (topic and hypotheses)
5. תיאור משתנים (variable descriptions)
   - Scale name
   - Number of items
   - Subscales
   - Reverse-coded items
   - Scoring (e.g., 1-5 Likert)
6. מקראה (legend with value labels)
```

**Requirements:**
- ✅ Hebrew text
- ✅ Clear variable mappings
- ✅ Value labels for categorical variables
- ✅ Reverse coding specified
- ⚠️ Can be incomplete (Claude will infer)

### **Output Files (From Claude → Ahiya → StatViz)**

#### **1. Hebrew DOCX**
**Filename:** `findings_hebrew.docx`
**Format:** Microsoft Word 2016+ (.docx)
**Language:** Hebrew (RTL)
**Size:** Typically 5-15 KB
**Content:**
- Section 1: אוכלוסיית המחקר
- Section 2: מהימנות
- Section 3: תוצאות המחקר
- Graph specifications (not actual graphs)

**Requirements:**
- ✅ Opens in Microsoft Word
- ✅ Hebrew text displays correctly (RTL)
- ✅ Follows Guy's exact format
- ✅ Professional academic style
- ✅ No embedded objects or external links

#### **2. Self-Contained HTML**
**Filename:** `interactive_report.html`
**Format:** Single HTML5 file
**Language:** Hebrew (RTL)
**Size:** 1-5 MB (including embedded data)
**Content:**
- 7 interactive sections
- Embedded Plotly graphs
- Inline CSS and JavaScript
- All data as JSON
- No external dependencies

**CRITICAL REQUIREMENT: Self-Contained**
```html
<!-- Everything must be inline -->
<html>
<head>
    <style>
        /* All CSS here */
    </style>
</head>
<body>
    <!-- All content here -->
    
    <script>
        // All JavaScript here
        // All data embedded as JSON
        var data = {
            participants: [...],
            results: {...}
        };
        
        // Plotly charts
        Plotly.newPlot('div1', traces, layout);
    </script>
</body>
</html>
```

**Testing Checklist:**
- [ ] Disconnect internet
- [ ] Open file in browser
- [ ] All graphs render?
- [ ] All interactions work?
- [ ] Hebrew displays correctly?
- [ ] File downloads successfully?

---

## PLATFORM TECHNICAL SPECIFICATION

### **Technology Stack (Suggested)**

**Frontend:**
- React.js or Next.js
- Tailwind CSS for styling
- Responsive design (mobile-friendly)

**Backend:**
- Node.js + Express (or Python + Flask)
- RESTful API

**Database:**
- PostgreSQL for metadata
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
```

**File Storage:**
- AWS S3 or similar object storage
- Or: Local filesystem with backups

**Authentication:**
- Admin: Username + Password (Ahiya's account)
- Projects: Per-project passwords

**Hosting:**
- Vercel (recommended for Next.js)
- AWS / Google Cloud / Azure
- Or any Node.js-compatible host

---

## API ENDPOINTS

### **Admin Endpoints (Authenticated)**

#### **POST /api/admin/login**
```json
Request:
{
    "username": "ahiya",
    "password": "secure_password"
}

Response:
{
    "token": "jwt_token_here",
    "expires": "2025-11-27T00:00:00Z"
}
```

#### **POST /api/admin/projects**
```json
Request (multipart/form-data):
{
    "project_name": "מיכל דהרי - שחיקה",
    "student_name": "מיכל דהרי",
    "student_email": "michald2211@gmail.com",
    "research_topic": "שחיקה בקרב עובדים פרא-רפואיים",
    "password": "2R9kPm4L",  // Optional, auto-generate if empty
    "docx_file": <file>,
    "html_file": <file>
}

Response:
{
    "success": true,
    "project_id": "abc123xyz",
    "project_url": "https://statviz.xyz/preview/abc123xyz",
    "password": "2R9kPm4L"
}
```

#### **GET /api/admin/projects**
```json
Response:
{
    "projects": [
        {
            "project_id": "abc123xyz",
            "project_name": "מיכל דהרי - שחיקה",
            "student_name": "מיכל דהרי",
            "created_at": "2025-11-26T14:30:00Z",
            "view_count": 12,
            "last_accessed": "2025-11-26T18:45:00Z"
        },
        ...
    ]
}
```

#### **DELETE /api/admin/projects/:project_id**
```json
Response:
{
    "success": true,
    "message": "Project deleted"
}
```

### **Public Endpoints (No Auth)**

#### **GET /api/preview/:project_id**
```json
Request Headers:
{
    "Authorization": "Bearer [hashed_password]"
}

Response:
{
    "project_name": "מיכל דהרי - שחיקה",
    "student_name": "מיכל דהרי",
    "research_topic": "שחיקה בקרב עובדים פרא-רפואיים",
    "html_content": "<html>...</html>",  // Or URL to HTML
    "docx_download_url": "https://statviz.xyz/download/abc123xyz.docx"
}
```

#### **POST /api/preview/:project_id/verify**
```json
Request:
{
    "password": "2R9kPm4L"
}

Response (success):
{
    "valid": true,
    "token": "session_token"
}

Response (failure):
{
    "valid": false,
    "message": "סיסמה שגויה"
}
```

#### **GET /api/download/:project_id**
```
Downloads the DOCX file
Requires valid session token
```

---

## UI/UX SPECIFICATIONS

### **Admin Panel (/admin)**

**Layout:**
```
┌────────────────────────────────────────┐
│ StatViz - Admin Panel                  │
│                         [Logout] [Help] │
├────────────────────────────────────────┤
│                                        │
│  [+ Create New Project]                │
│                                        │
│  📊 Projects (12 total)                │
│  ┌──────────────────────────────────┐ │
│  │ 🔹 מיכל דהרי - שחיקה            │ │
│  │    Created: 26/11/2025           │ │
│  │    Views: 12                     │ │
│  │    [View] [Delete] [Copy Link]   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🔹 שירן ועדי - מסוגלות הורית    │ │
│  │    Created: 20/11/2025           │ │
│  │    Views: 8                      │ │
│  │    [View] [Delete] [Copy Link]   │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

**Create Project Modal:**
```
┌────────────────────────────────────────┐
│ Create New Project              [X]    │
├────────────────────────────────────────┤
│                                        │
│  Project Name (Hebrew):                │
│  [מיכל דהרי - שחיקה              ]    │
│                                        │
│  Student Name:                         │
│  [מיכל דהרי                      ]    │
│                                        │
│  Student Email:                        │
│  [michald2211@gmail.com          ]    │
│                                        │
│  Research Topic:                       │
│  [שחיקה בקרב עובדים פרא-רפואיים ]    │
│                                        │
│  Upload DOCX:                          │
│  [Choose File] findings_hebrew.docx   │
│                                        │
│  Upload HTML:                          │
│  [Choose File] interactive_report.html│
│                                        │
│  Password: (leave empty to generate)  │
│  [                              ]      │
│                                        │
│  [Cancel]            [Create Project] │
└────────────────────────────────────────┘
```

**After Creation:**
```
┌────────────────────────────────────────┐
│ ✅ Project Created Successfully!       │
├────────────────────────────────────────┤
│                                        │
│  Project Link:                         │
│  https://statviz.xyz/preview/abc123xyz│
│  [Copy Link]                           │
│                                        │
│  Password:                             │
│  2R9kPm4L                             │
│  [Copy Password]                       │
│                                        │
│  Share both with Guy/Student           │
│                                        │
│  [Close]                [Open Project] │
└────────────────────────────────────────┘
```

### **Project Viewer (/preview/:project_id)**

**Password Screen:**
```
┌────────────────────────────────────────┐
│        StatViz                         │
│   Statistical Analysis Platform        │
├────────────────────────────────────────┤
│                                        │
│         🔒 Protected Project           │
│                                        │
│  Please enter the password to view     │
│  this project:                         │
│                                        │
│  [________________]                    │
│                                        │
│  [Cancel]              [Enter]         │
│                                        │
└────────────────────────────────────────┘
```

**Project View (After Authentication):**
```
┌────────────────────────────────────────┐
│ StatViz - מיכל דהרי: שחיקה             │
│                         [⬇ Download]   │
├────────────────────────────────────────┤
│                                        │
│  📊 Interactive Report                 │
│  ┌──────────────────────────────────┐ │
│  │                                  │ │
│  │  [Embedded HTML Report]          │ │
│  │  • Fully interactive             │ │
│  │  • Scrollable                    │ │
│  │  • All features functional       │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  📄 Download for Thesis                │
│  [⬇ Download DOCX (findings.docx)]   │
│                                        │
└────────────────────────────────────────┘
```

---

## SECURITY CONSIDERATIONS

### **Admin Security**
- ✅ Strong password requirement (min 12 chars)
- ✅ JWT tokens with expiration
- ✅ HTTPS only (no HTTP)
- ✅ Rate limiting on login endpoint
- ✅ Session timeout after inactivity
- ✅ Activity logging

### **Project Security**
- ✅ Per-project passwords
- ✅ Password hashing (bcrypt)
- ✅ No project listing (direct links only)
- ✅ Token-based access after password entry
- ✅ Session expiration
- ✅ Optional: IP-based rate limiting

### **File Security**
- ✅ Virus scanning on upload
- ✅ File type validation
- ✅ Size limits (50 MB max)
- ✅ Secure storage (private buckets)
- ✅ Signed URLs for downloads
- ✅ No directory traversal attacks

### **Data Privacy**
- ✅ Student data encrypted at rest
- ✅ SSL/TLS for all connections
- ✅ No analytics tracking (optional)
- ✅ GDPR compliance (if EU students)
- ✅ Right to be forgotten (delete project)
- ✅ Access logs for audit

---

## DEPLOYMENT GUIDE

### **Option 1: Vercel (Recommended for Next.js)**

**Step 1: Prepare Repository**
```bash
# Initialize Next.js project
npx create-next-app@latest statviz
cd statviz

# Add dependencies
npm install @aws-sdk/client-s3
npm install bcryptjs
npm install jsonwebtoken
npm install pg  # PostgreSQL client

# Structure:
/pages
  /api
    /admin
      login.js
      projects.js
    /preview
      [id].js
      verify.js
  /admin
    index.js
  /preview
    [id].js
/components
/lib
  db.js
  auth.js
  storage.js
```

**Step 2: Environment Variables**
```env
DATABASE_URL=postgresql://...
AWS_S3_BUCKET=statviz-files
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
JWT_SECRET=...
ADMIN_PASSWORD_HASH=...
```

**Step 3: Deploy**
```bash
# Connect to Vercel
vercel login

# Deploy
vercel --prod

# Result: https://statviz.vercel.app
# Add custom domain: statviz.xyz
```

### **Option 2: Traditional Hosting (Node.js)**

**Requirements:**
- VPS or dedicated server
- Node.js 18+
- PostgreSQL 14+
- Nginx (reverse proxy)
- SSL certificate (Let's Encrypt)

**Setup:**
```bash
# Clone repository
git clone https://github.com/ahiya/statviz.git
cd statviz

# Install dependencies
npm install

# Set up database
psql -U postgres < schema.sql

# Configure environment
cp .env.example .env
# Edit .env with actual values

# Build
npm run build

# Start with PM2
pm2 start npm --name "statviz" -- start
pm2 save
pm2 startup
```

**Nginx Configuration:**
```nginx
server {
    listen 443 ssl;
    server_name statviz.xyz;

    ssl_certificate /etc/letsencrypt/live/statviz.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/statviz.xyz/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## FUTURE ENHANCEMENTS (Phase 2+)

### **Priority 1: Analytics**
- Track which sections students spend most time on
- Identify common confusion points
- Improve teaching materials based on data

### **Priority 2: Collaboration**
- Allow Ahiya to add comments/annotations
- Version control (upload revised reports)
- Discussion threads between Ahiya and student

### **Priority 3: Automation**
- Direct API integration with Claude
- Student uploads → Auto-analysis → Auto-delivery
- No manual intervention needed

### **Priority 4: Multi-User Admin**
- Multiple statisticians (not just Ahiya)
- Role-based access control
- Team collaboration features

### **Priority 5: Advanced Features**
- Export to PowerPoint
- Comparative analysis across projects
- Template library (common research types)
- Integration with LMS (Learning Management Systems)

---

## COST ESTIMATE

### **Development Costs (One-Time)**
```
Frontend Development:      $3,000 - $5,000
Backend Development:       $3,000 - $5,000
Database Setup:            $500 - $1,000
Security Implementation:   $1,000 - $2,000
Testing & QA:             $1,000 - $2,000
Deployment:               $500 - $1,000
───────────────────────────────────────
Total:                    $9,000 - $16,000
```

### **Monthly Operating Costs**
```
Hosting (Vercel/AWS):     $20 - $100/month
Database (Postgres):      $15 - $50/month
Storage (S3):             $5 - $20/month
Domain:                   $1/month
SSL Certificate:          Free (Let's Encrypt)
───────────────────────────────────────
Total:                    $41 - $171/month
```

**Assumptions:**
- ~50 projects/month
- Average 10 views per project
- 5 MB average file size

---

## MAINTENANCE PLAN

### **Weekly:**
- Monitor error logs
- Check for failed uploads
- Verify backups

### **Monthly:**
- Review storage usage
- Analyze access patterns
- Update dependencies
- Security patches

### **Quarterly:**
- Database optimization
- User feedback review
- Feature prioritization
- Performance audit

### **Annually:**
- Major version upgrades
- Security audit (external)
- Disaster recovery test
- Cost optimization review

---

## SUCCESS METRICS

### **Usage Metrics:**
- Number of projects created per month
- Average views per project
- Student satisfaction (survey)
- Time to complete analysis (Ahiya)
- File download rate

### **Technical Metrics:**
- Uptime (target: 99.9%)
- Page load time (target: < 2s)
- Error rate (target: < 0.1%)
- Storage usage trend

### **Business Metrics:**
- Number of active students
- Repeat usage rate
- Referrals to other institutions
- Cost per project

---

## SUPPORT & DOCUMENTATION

### **For Ahiya:**
- Admin panel user guide
- Troubleshooting FAQ
- Contact: support@statviz.xyz
- Emergency phone: [TBD]

### **For Students:**
- How to access your project
- How to download files
- Browser requirements
- FAQ: "Password not working"

### **For Guy:**
- How to share links with students
- What to tell students
- Common issues and solutions

---

## LEGAL & COMPLIANCE

### **Terms of Service:**
- Platform for educational use only
- No guarantee of statistical accuracy
- User responsible for data privacy
- No commercial use without permission

### **Privacy Policy:**
- What data is collected
- How long files are stored
- Who has access
- How to delete data

### **Data Retention:**
- Projects stored indefinitely by default
- Student can request deletion anytime
- Automatic deletion after 2 years (optional)
- Backups retained for 30 days

---

## CONTACT & SUPPORT

**Platform Owner:** Ahiya (Statistician)
**Technical Contact:** [TBD]
**Academic Contact:** Guy Halevi (Herzog College)

**Support Channels:**
- Email: support@statviz.xyz
- Phone: [TBD]
- Hours: Sunday-Thursday, 9 AM - 5 PM IST

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-26 | Initial specification |

---

## APPENDIX A: FILE NAMING CONVENTIONS

**Uploaded Files:**
```
Data file: {studentname}_data.xlsx
Codebook: {studentname}_codebook.docx
```

**Generated Files:**
```
DOCX: findings_hebrew_{project_id}.docx
HTML: interactive_report_{project_id}.html
```

**Stored Files:**
```
S3 Path: /projects/{project_id}/findings.docx
         /projects/{project_id}/report.html
```

---

## APPENDIX B: BROWSER COMPATIBILITY

**Supported Browsers:**
- ✅ Chrome 90+ (recommended)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ Internet Explorer: Not supported

**Mobile:**
- ✅ iOS Safari 14+
- ✅ Chrome Mobile
- ⚠️ Limited on small screens

---

## APPENDIX C: ERROR HANDLING

**Common Errors & Solutions:**

**Error: Password Incorrect**
```
Message: "סיסמה שגויה. אנא נסה שוב."
Solution: Check password, case-sensitive
Contact: Ahiya if forgotten
```

**Error: File Not Found**
```
Message: "הקובץ לא נמצא"
Solution: Project may be deleted
Contact: Ahiya
```

**Error: Upload Failed**
```
Message: "העלאה נכשלה. גודל הקובץ גדול מדי?"
Solution: Check file size (< 50 MB)
Contact: support@statviz.xyz
```

---

**END OF SPECIFICATION**
**Ready for implementation! 🚀**
