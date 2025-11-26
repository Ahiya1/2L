'use client'

import { createContext, useContext } from 'react'

export interface AdminContextValue {
  refetchProjects: () => void
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (open: boolean) => void
}

export const AdminContext = createContext<AdminContextValue | undefined>(undefined)

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider')
  }
  return context
}
