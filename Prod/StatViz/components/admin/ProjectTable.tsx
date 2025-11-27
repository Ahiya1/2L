'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProjectRow } from './ProjectRow'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Project } from '@/lib/types/admin'

interface Props {
  projects: Project[]
}

type SortField = 'projectName' | 'studentName' | 'createdAt' | 'viewCount'
type SortDirection = 'asc' | 'desc'

export function ProjectTable({ projects }: Props) {
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  function handleSort(field: SortField) {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to descending
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedProjects = [...projects].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case 'projectName':
        comparison = a.projectName.localeCompare(b.projectName, 'he')
        break
      case 'studentName':
        comparison = a.studentName.localeCompare(b.studentName, 'he')
        break
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'viewCount':
        comparison = a.viewCount - b.viewCount
        break
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  return (
    <div className="rounded-lg border border-slate-200 shadow-sm bg-white overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow className="hover:bg-slate-50">
            <TableHead className="text-right font-semibold text-slate-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('projectName')}
                className="gap-2 hover:bg-slate-100 transition-colors"
              >
                שם הפרויקט
                {sortField === 'projectName' && <ArrowUpDown className="h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead className="text-right font-semibold text-slate-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('studentName')}
                className="gap-2 hover:bg-slate-100 transition-colors"
              >
                שם הסטודנט
                {sortField === 'studentName' && <ArrowUpDown className="h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead className="text-left font-semibold text-slate-700" dir="ltr">
              אימייל סטודנט
            </TableHead>
            <TableHead className="text-center font-semibold text-slate-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('createdAt')}
                className="gap-2 hover:bg-slate-100 transition-colors"
              >
                נוצר בתאריך
                {sortField === 'createdAt' && <ArrowUpDown className="h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead className="text-center font-semibold text-slate-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('viewCount')}
                className="gap-2 hover:bg-slate-100 transition-colors"
              >
                צפיות
                {sortField === 'viewCount' && <ArrowUpDown className="h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead className="text-left font-semibold text-slate-700">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProjects.map((project) => (
            <ProjectRow key={project.projectId} project={project} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
