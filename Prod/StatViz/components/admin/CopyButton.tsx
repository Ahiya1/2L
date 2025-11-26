'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  text: string
  label?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function CopyButton({ text, label = 'העתק', size = 'sm' }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('הועתק ללוח!')

      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (_error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)

        setCopied(true)
        toast.success('הועתק ללוח!')
        setTimeout(() => setCopied(false), 2000)
      } catch (_fallbackError) {
        toast.error('שגיאה בהעתקה ללוח')
      }
    }
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={copyToClipboard}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-600" />
          הועתק!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}
