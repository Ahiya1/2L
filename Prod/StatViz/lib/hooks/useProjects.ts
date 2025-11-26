'use client'

import { useQuery } from '@tanstack/react-query'
import type { APIResponse, ProjectsListResponse } from '@/lib/types/admin'

async function fetchProjects(): Promise<ProjectsListResponse> {
  const response = await fetch('/api/admin/projects', {
    credentials: 'include' // Send cookies
  })

  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }

  const result: APIResponse<ProjectsListResponse> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Unknown error')
  }

  return result.data
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 60 * 1000, // 1 minute
    retry: 1
  })
}
