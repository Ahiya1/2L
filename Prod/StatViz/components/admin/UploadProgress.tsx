'use client'

import { UploadProgress as UploadProgressType } from '@/lib/types/admin'

interface UploadProgressProps {
  docxProgress: UploadProgressType | null
  htmlProgress: UploadProgressType | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds} שניות`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')} דקות`
}

function ProgressBar({ filename, progress, loaded, total, eta }: UploadProgressType) {
  return (
    <div className="text-right" dir="rtl">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{formatTime(eta)} נותרו</span>
        <span className="font-medium">{filename}</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{progress}%</span>
        <span>
          {formatBytes(loaded)} מתוך {formatBytes(total)}
        </span>
      </div>
    </div>
  )
}

export function UploadProgress({ docxProgress, htmlProgress }: UploadProgressProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium">מעלה קבצים...</h3>
        <p className="text-sm text-gray-600 mt-1">אנא אל תסגור את החלון</p>
      </div>

      {docxProgress && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">קובץ DOCX</p>
          <ProgressBar {...docxProgress} />
        </div>
      )}

      {htmlProgress && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">קובץ HTML</p>
          <ProgressBar {...htmlProgress} />
        </div>
      )}
    </div>
  )
}
