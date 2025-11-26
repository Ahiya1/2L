'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { LoginFormData, APIResponse, LoginResponse } from '@/lib/types/admin'

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function login(data: LoginFormData): Promise<boolean> {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      })

      const result: APIResponse<LoginResponse> = await response.json()

      if (!result.success) {
        toast.error(result.error?.message || 'שגיאה בהתחברות')
        return false
      }

      toast.success('התחברת בהצלחה!')
      router.push('/admin/dashboard')
      return true
    } catch (_error) {
      toast.error('שגיאת רשת. אנא בדוק את החיבור לאינטרנט')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function logout(): Promise<void> {
    setIsLoading(true)
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      })

      toast.success('התנתקת בהצלחה')
      router.push('/admin')
    } catch (_error) {
      toast.error('שגיאה בניתוק')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    login,
    logout,
    isLoading,
  }
}
