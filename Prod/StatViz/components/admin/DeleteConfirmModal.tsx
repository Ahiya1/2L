'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
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
          <div className="flex items-center gap-2 justify-center mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-red-600">
            מחיקת פרויקט
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600">
            האם אתה בטוח שברצונך למחוק את הפרויקט <strong className="text-slate-900">{projectName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800 mt-2">
          <p className="font-bold mb-2">אזהרה:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>פעולה זו תמחק את כל הקבצים והנתונים הקשורים לפרויקט</li>
            <li>הסטודנט לא יוכל לגשת לפרויקט יותר</li>
            <li className="font-bold">פעולה זו לא ניתנת לביטול</li>
          </ul>
        </div>

        <DialogFooter className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="hover:bg-slate-50 transition-colors"
          >
            ביטול
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                מוחק...
              </>
            ) : (
              'מחק לצמיתות'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
