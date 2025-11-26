'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteConfirmModal({
  open,
  onOpenChange,
  projectName,
  onConfirm,
  isDeleting = false
}: Props) {
  function handleConfirm() {
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>מחיקת פרויקט</DialogTitle>
          <DialogDescription>
            האם אתה בטוח שברצונך למחוק את הפרויקט <strong>{projectName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
          <p className="font-medium">אזהרה:</p>
          <p>פעולה זו תמחק את כל הקבצים והנתונים הקשורים לפרויקט.</p>
          <p className="font-bold mt-2">פעולה זו לא ניתנת לביטול.</p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            ביטול
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'מוחק...' : 'מחק'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
