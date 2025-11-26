'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateProjectDialog } from './CreateProjectDialog'

interface CreateProjectButtonProps {
  onSuccess?: () => void
}

export function CreateProjectButton({ onSuccess }: CreateProjectButtonProps) {
  const [open, setOpen] = useState(false)

  function handleSuccess() {
    setOpen(false)
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        צור פרויקט חדש
      </Button>

      <CreateProjectDialog open={open} onOpenChange={setOpen} onSuccess={handleSuccess} />
    </>
  )
}
