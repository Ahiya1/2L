'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/useAuth'

export function DashboardHeader() {
  const { logout, isLoading } = useAuth()

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              StatViz
            </h1>
            <span className="text-slate-500 text-sm">
              • פאנל ניהול
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            disabled={isLoading}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {isLoading ? 'מתנתק...' : 'התנתק'}
          </Button>
        </div>
      </div>
    </header>
  )
}
