import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import jwt from 'jsonwebtoken'
import { DashboardShell } from '@/components/admin/DashboardShell'
import { ProjectsContainer } from '@/components/admin/ProjectsContainer'

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    // Verify JWT signature and expiration
    jwt.verify(token, process.env.JWT_SECRET!)

    // Check database session
    const session = await prisma.adminSession.findUnique({
      where: { token }
    })

    if (!session) return false

    // Check expiration
    if (session.expiresAt < new Date()) {
      // Expired - delete session
      await prisma.adminSession.delete({ where: { token } })
      return false
    }

    return true
  } catch (_error) {
    return false
  }
}

export default async function DashboardPage() {
  // Server-side auth check
  const token = cookies().get('admin_token')?.value

  if (!token || !(await verifyAdminToken(token))) {
    redirect('/admin')
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            לוח הבקרה
          </h2>
          <p className="text-slate-600 mt-1">
            ניהול פרויקטים וצפייה בנתונים
          </p>
        </div>

        <ProjectsContainer />
      </div>
    </DashboardShell>
  )
}
