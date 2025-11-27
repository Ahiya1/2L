'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/useAuth'
import { Logo } from '@/components/shared/Logo'

export function DashboardHeader() {
  const { logout, isLoading } = useAuth()

  return (
    <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-slate-500 text-sm">
              • פאנל ניהול
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            disabled={isLoading}
            className="gap-2 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {isLoading ? 'מתנתק...' : 'התנתק'}
          </Button>
        </div>
      </div>
    </header>
  )
}
