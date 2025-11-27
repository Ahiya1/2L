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
      <Button
        onClick={() => setOpen(true)}
        variant="gradient"
        size="lg"
        className="gap-2 shadow-lg hover:shadow-xl"
      >
        <Plus className="h-5 w-5" />
        צור פרויקט חדש
      </Button>

      <CreateProjectDialog open={open} onOpenChange={setOpen} onSuccess={handleSuccess} />
    </>
  )
}
