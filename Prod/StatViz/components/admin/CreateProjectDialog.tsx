'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProjectForm } from './ProjectForm'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  function handleSuccess() {
    onOpenChange(false)
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-right">
            צור פרויקט חדש
          </DialogTitle>
          <DialogDescription className="text-right text-slate-600">
            הזן את פרטי הפרויקט והעלה את קבצי ה-DOCX וה-HTML.
          </DialogDescription>
        </DialogHeader>

        <ProjectForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
