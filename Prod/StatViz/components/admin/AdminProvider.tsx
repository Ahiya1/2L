'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AdminContext, type AdminContextValue } from '@/lib/hooks/useAdmin'

interface Props {
  children: React.ReactNode
}

export function AdminProvider({ children }: Props) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const refetchProjects = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }

  const value: AdminContextValue = {
    refetchProjects,
    isCreateModalOpen,
    setIsCreateModalOpen
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}
