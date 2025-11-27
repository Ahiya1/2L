'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/admin/DashboardShell'
import { ProjectsContainer } from '@/components/admin/ProjectsContainer'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check authentication on mount
    async function checkAuth() {
      try {
        const response = await fetch('/api/admin/projects', {
          credentials: 'include',
        })

        if (!response.ok) {
          // Not authenticated, redirect to login
          router.push('/admin')
        }
      } catch {
        // Error checking auth, redirect to login
        router.push('/admin')
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
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
