'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Project, ProjectsListResponse } from '@/lib/types/admin'

async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`/api/admin/projects/${projectId}`, {
    method: 'DELETE',
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to delete project')
  }
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProject,
    onMutate: async (projectId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects'] })

      // Snapshot previous value
      const previousData = queryClient.getQueryData<ProjectsListResponse>(['projects'])

      // Optimistically update UI
      queryClient.setQueryData<ProjectsListResponse>(['projects'], (old) => {
        if (!old) return old
        return {
          ...old,
          projects: old.projects.filter((p: Project) => p.projectId !== projectId)
        }
      })

      return { previousData }
    },
    onError: (_error, _projectId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['projects'], context.previousData)
      }
      toast.error('שגיאה במחיקת הפרויקט')
    },
    onSuccess: () => {
      toast.success('הפרויקט נמחק בהצלחה')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}
