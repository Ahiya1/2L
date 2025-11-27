'use client'

import { useState } from 'react'
import { CheckCircle2, Copy, Check, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface SuccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectUrl: string
  password: string
  htmlWarnings?: string[]
  onCreateAnother: () => void
}

export function SuccessModal({
  open,
  onOpenChange,
  projectUrl,
  password,
  htmlWarnings,
  onCreateAnother,
}: SuccessModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)

  async function copyToClipboard(text: string, type: 'url' | 'password') {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'url') {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedPassword(true)
        setTimeout(() => setCopiedPassword(false), 2000)
      }
      toast.success('הועתק ללוח!')
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        toast.success('הועתק ללוח!')
        if (type === 'url') {
          setCopiedUrl(true)
          setTimeout(() => setCopiedUrl(false), 2000)
        } else {
          setCopiedPassword(true)
          setTimeout(() => setCopiedPassword(false), 2000)
        }
      } catch {
        toast.error('שגיאה בהעתקה ללוח')
      }
      document.body.removeChild(textArea)
    }
  }

  function handleCreateAnother() {
    onOpenChange(false)
    onCreateAnother()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2 justify-center mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            הפרויקט נוצר בהצלחה!
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600">
            הפרטים להלן. שלח את הקישור והסיסמה לסטודנט (בערוצים נפרדים למען האבטחה).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Project URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 block">קישור לפרויקט</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={projectUrl}
                readOnly
                dir="ltr"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-left text-sm font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(projectUrl, 'url')}
                className="gap-2 hover:bg-slate-50 transition-colors"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    הועתק!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    העתק
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 block">סיסמה</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                readOnly
                dir="ltr"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-left font-mono text-lg tracking-wider"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(password, 'password')}
                className="gap-2 hover:bg-slate-50 transition-colors"
              >
                {copiedPassword ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    הועתק!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    העתק
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* HTML Warnings */}
          {htmlWarnings && htmlWarnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-800 mb-2">אזהרות HTML</p>
                  <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                    {htmlWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-yellow-700 mt-2">
                    הקובץ עשוי להיות תלוי במשאבים חיצוניים. ודא שהקובץ מוצג כראוי.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security reminder */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">תזכורת אבטחה:</p>
            <p>שלח את הקישור והסיסמה בערוצים נפרדים (למשל: קישור במייל, סיסמה בווטסאפ).</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="hover:bg-slate-50 transition-colors"
          >
            סגור
          </Button>
          <Button
            variant="gradient"
            onClick={handleCreateAnother}
            className="shadow-lg"
          >
            צור פרויקט נוסף
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
