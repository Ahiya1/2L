'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileUploadZoneProps {
  label: string
  accept: {
    [key: string]: string[]
  }
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
  error?: string
}

export function FileUploadZone({
  label,
  accept,
  onFileSelect,
  selectedFile,
  error,
}: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50 MB
  })

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFileSelect(null)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const rejectionError = fileRejections[0]?.errors[0]?.message

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : selectedFile
            ? 'border-green-500 bg-green-50'
            : error || rejectionError
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />

        {selectedFile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-right flex-1">
              <File className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="mr-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-gray-600">
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600 font-medium">שחרר לבחירת הקובץ</p>
            ) : (
              <>
                <p className="font-medium">גרור קובץ לכאן או לחץ לבחירה</p>
                <p className="text-sm mt-1">מקסימום 50 MB</p>
              </>
            )}
          </div>
        )}
      </div>

      {(error || rejectionError) && (
        <p className="text-red-600 text-sm mt-1">{error || rejectionError}</p>
      )}
    </div>
  )
}
