'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/admin/LoginForm'

export default function AdminLoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if already logged in
    async function checkAuth() {
      try {
        const response = await fetch('/api/admin/projects', {
          credentials: 'include',
        })

        if (response.ok) {
          // Already authenticated, redirect to dashboard
          router.push('/admin/dashboard')
        }
      } catch (_error) {
        // Not authenticated, stay on login page
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="bg-white rounded-lg shadow-xl p-8 border border-slate-200">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          StatViz
        </h1>
        <p className="text-slate-600">
          פאנל ניהול דוחות סטטיסטיים
        </p>
      </div>

      <LoginForm />

      <div className="mt-6 text-center text-sm text-slate-500">
        <p>מערכת מאובטחת למנהלים בלבד</p>
      </div>
    </div>
  )
}
