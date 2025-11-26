import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateProjectId } from '../lib/utils/nanoid'

const prisma = new PrismaClient()

const SALT_ROUNDS = 10

async function main() {
  console.log('🌱 Seeding database...')

  // Create test project 1 - Burnout research (Hebrew)
  const project1Id = generateProjectId()
  const project1Password = 'test1234'
  const project1Hash = await bcrypt.hash(project1Password, SALT_ROUNDS)

  const project1 = await prisma.project.create({
    data: {
      projectId: project1Id,
      projectName: 'מיכל דהרי - שחיקה',
      studentName: 'מיכל דהרי',
      studentEmail: 'michal.dahari@example.com',
      researchTopic: 'מחקר על שחיקה (burnout) בקרב אנשי מקצוע בתחום הבריאות',
      passwordHash: project1Hash,
      docxUrl: `/uploads/${project1Id}/findings.docx`,
      htmlUrl: `/uploads/${project1Id}/report.html`,
      viewCount: 0,
    }
  })

  console.log(`✅ Created project: ${project1.projectName}`)
  console.log(`   Project ID: ${project1Id}`)
  console.log(`   Password: ${project1Password}`)
  console.log(`   URL: http://localhost:3000/preview/${project1Id}`)

  // Create test project 2 - Anxiety research (Hebrew)
  const project2Id = generateProjectId()
  const project2Password = 'test5678'
  const project2Hash = await bcrypt.hash(project2Password, SALT_ROUNDS)

  const project2 = await prisma.project.create({
    data: {
      projectId: project2Id,
      projectName: 'יוסי כהן - חרדה',
      studentName: 'יוסי כהן',
      studentEmail: 'yossi.cohen@example.com',
      researchTopic: 'מחקר על רמות חרדה בקרב סטודנטים לתואר שני',
      passwordHash: project2Hash,
      docxUrl: `/uploads/${project2Id}/findings.docx`,
      htmlUrl: `/uploads/${project2Id}/report.html`,
      viewCount: 0,
    }
  })

  console.log(`✅ Created project: ${project2.projectName}`)
  console.log(`   Project ID: ${project2Id}`)
  console.log(`   Password: ${project2Password}`)
  console.log(`   URL: http://localhost:3000/preview/${project2Id}`)

  // Create placeholder files for both projects
  const fs = await import('fs/promises')
  const path = await import('path')

  for (const projectId of [project1Id, project2Id]) {
    const uploadDir = path.join(process.cwd(), 'uploads', projectId)
    await fs.mkdir(uploadDir, { recursive: true })

    // Create placeholder DOCX (just a text file for now)
    const docxPath = path.join(uploadDir, 'findings.docx')
    await fs.writeFile(
      docxPath,
      'This is a placeholder DOCX file. Replace with actual DOCX during testing.'
    )

    // Create placeholder HTML
    const htmlPath = path.join(uploadDir, 'report.html')
    const projectName = projectId === project1Id ? 'שחיקה' : 'חרדה'
    await fs.writeFile(
      htmlPath,
      `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>דוח מחקר - ${projectName}</title>
  <style>
    body {
      font-family: 'Heebo', 'Rubik', Arial, sans-serif;
      direction: rtl;
      text-align: right;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
    }
  </style>
</head>
<body>
  <h1>דוח מחקר - ${projectName}</h1>
  <p>זהו דוח מחקר לדוגמה עם טקסט בעברית.</p>
  <p>הקובץ נוצר אוטומטית על ידי סקריפט ה-seed.</p>
  <p>החלף קובץ זה עם דוח HTML אמיתי עם גרפים של Plotly.</p>
</body>
</html>`
    )

    console.log(`📁 Created placeholder files in /uploads/${projectId}/`)
  }

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📝 Test Credentials:')
  console.log(`Project 1: ${project1Password}`)
  console.log(`Project 2: ${project2Password}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
