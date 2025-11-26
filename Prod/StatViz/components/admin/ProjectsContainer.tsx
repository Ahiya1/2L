'use client'

import { useProjects } from '@/lib/hooks/useProjects'
import { ProjectTable } from './ProjectTable'
import { EmptyState } from './EmptyState'
import { TableSkeleton } from './TableSkeleton'
import { AdminProvider } from './AdminProvider'
import { CreateProjectButton } from './CreateProjectButton'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProjectsContainer() {
  const { data, isLoading, error, refetch } = useProjects()

  if (isLoading) {
    return (
      <AdminProvider>
        <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
          <TableSkeleton />
        </div>
      </AdminProvider>
    )
  }

  if (error) {
    return (
      <AdminProvider>
        <div className="bg-white rounded-lg shadow border border-slate-200 p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-red-100 p-6 mb-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              שגיאה בטעינת הפרויקטים
            </h3>
            <p className="text-slate-600 text-center max-w-md mb-4">
              {error instanceof Error ? error.message : 'אירעה שגיאה לא צפויה'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              נסה שוב
            </Button>
          </div>
        </div>
      </AdminProvider>
    )
  }

  const projects = data?.projects || []

  return (
    <AdminProvider>
      <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-900">
            {projects.length === 0 ? 'פרויקטים' : `סה״כ ${projects.length} פרויקטים`}
          </h3>
          <CreateProjectButton onSuccess={refetch} />
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <ProjectTable projects={projects} />
        )}
      </div>
    </AdminProvider>
  )
}
