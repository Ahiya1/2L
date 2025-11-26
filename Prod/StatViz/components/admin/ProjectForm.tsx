'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RefreshCw } from 'lucide-react'
import { CreateProjectFormSchema, CreateProjectFormData } from '@/lib/validation/schemas'
import { generatePassword } from '@/lib/utils/password-generator'
import { uploadWithProgress } from '@/lib/upload/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FileUploadZone } from './FileUploadZone'
import { UploadProgress } from './UploadProgress'
import { SuccessModal } from './SuccessModal'
import { toast } from 'sonner'
import type { UploadProgress as UploadProgressType, CreateProjectResponse } from '@/lib/types/admin'

interface ProjectFormProps {
  onSuccess?: () => void
}

export function ProjectForm({ onSuccess }: ProjectFormProps) {
  const [docxFile, setDocxFile] = useState<File | null>(null)
  const [htmlFile, setHtmlFile] = useState<File | null>(null)
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [docxProgress, setDocxProgress] = useState<UploadProgressType | null>(null)
  const [htmlProgress, setHtmlProgress] = useState<UploadProgressType | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdProject, setCreatedProject] = useState<CreateProjectResponse | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(CreateProjectFormSchema),
    defaultValues: {
      password: generatePassword(),
    },
  })

  const currentPassword = watch('password')

  function handleAutoGenerateToggle() {
    const newValue = !autoGeneratePassword
    setAutoGeneratePassword(newValue)
    if (newValue) {
      setValue('password', generatePassword())
    } else {
      setValue('password', '')
    }
  }

  function handleRegeneratePassword() {
    setValue('password', generatePassword())
  }

  async function onSubmit(data: CreateProjectFormData) {
    if (!docxFile || !htmlFile) {
      toast.error('נדרשים שני קבצים: DOCX ו-HTML')
      return
    }

    // Manual file size validation
    if (docxFile.size > 50 * 1024 * 1024) {
      toast.error('גודל קובץ DOCX עולה על 50 MB')
      return
    }

    if (htmlFile.size > 50 * 1024 * 1024) {
      toast.error('גודל קובץ HTML עולה על 50 MB')
      return
    }

    setIsUploading(true)
    setDocxProgress(null)
    setHtmlProgress(null)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('project_name', data.project_name)
      formData.append('student_name', data.student_name)
      formData.append('student_email', data.student_email)
      formData.append('research_topic', data.research_topic)
      formData.append('password', data.password || generatePassword())
      formData.append('docx_file', docxFile)
      formData.append('html_file', htmlFile)

      // Upload with progress tracking
      const result = await uploadWithProgress(docxFile, formData, {
        onProgress: (progress) => {
          // Track both files (simplified - both use same progress for demo)
          setDocxProgress(progress)
          setHtmlProgress({
            ...progress,
            filename: htmlFile.name,
          })
        },
      })

      const response = result as { success: boolean; data: CreateProjectResponse }

      if (response.success && response.data) {
        setCreatedProject(response.data)
        setShowSuccessModal(true)
        toast.success('הפרויקט נוצר בהצלחה!')
      } else {
        throw new Error('שגיאה ביצירת הפרויקט')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת הפרויקט')
    } finally {
      setIsUploading(false)
      setDocxProgress(null)
      setHtmlProgress(null)
    }
  }

  function handleCreateAnother() {
    reset({
      password: generatePassword(),
    })
    setDocxFile(null)
    setHtmlFile(null)
    setAutoGeneratePassword(true)
    setCreatedProject(null)
  }

  function handleSuccessClose() {
    setShowSuccessModal(false)
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        {/* Project Name */}
        <div>
          <Label htmlFor="project_name">שם הפרויקט</Label>
          <Input
            id="project_name"
            {...register('project_name')}
            placeholder="הזן שם פרויקט בעברית"
            className={errors.project_name ? 'border-red-500' : ''}
          />
          {errors.project_name && (
            <p className="text-red-600 text-sm mt-1">{errors.project_name.message}</p>
          )}
        </div>

        {/* Student Name */}
        <div>
          <Label htmlFor="student_name">שם הסטודנט</Label>
          <Input
            id="student_name"
            {...register('student_name')}
            placeholder="שם מלא של הסטודנט"
            className={errors.student_name ? 'border-red-500' : ''}
          />
          {errors.student_name && (
            <p className="text-red-600 text-sm mt-1">{errors.student_name.message}</p>
          )}
        </div>

        {/* Student Email */}
        <div>
          <Label htmlFor="student_email">אימייל סטודנט</Label>
          <Input
            id="student_email"
            type="email"
            dir="ltr"
            className={`text-left ${errors.student_email ? 'border-red-500' : ''}`}
            {...register('student_email')}
            placeholder="student@example.com"
          />
          {errors.student_email && (
            <p className="text-red-600 text-sm mt-1">{errors.student_email.message}</p>
          )}
        </div>

        {/* Research Topic */}
        <div>
          <Label htmlFor="research_topic">נושא המחקר</Label>
          <Textarea
            id="research_topic"
            {...register('research_topic')}
            placeholder="תאור קצר של נושא המחקר"
            rows={4}
            className={errors.research_topic ? 'border-red-500' : ''}
          />
          {errors.research_topic && (
            <p className="text-red-600 text-sm mt-1">{errors.research_topic.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>סיסמה</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGeneratePassword}
                onChange={handleAutoGenerateToggle}
                className="rounded"
              />
              <span className="text-sm">צור סיסמה אוטומטית</span>
            </label>
          </div>

          {autoGeneratePassword ? (
            <div className="flex gap-2">
              <Input
                value={currentPassword}
                readOnly
                dir="ltr"
                className="text-left bg-gray-50 font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegeneratePassword}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                חדש
              </Button>
            </div>
          ) : (
            <Input
              {...register('password')}
              type="text"
              dir="ltr"
              className={`text-left ${errors.password ? 'border-red-500' : ''}`}
              placeholder="לפחות 6 תווים"
            />
          )}
          {errors.password && (
            <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* DOCX File Upload */}
        <FileUploadZone
          label="קובץ DOCX"
          accept={{
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
          }}
          onFileSelect={setDocxFile}
          selectedFile={docxFile}
        />

        {/* HTML File Upload */}
        <FileUploadZone
          label="קובץ HTML"
          accept={{
            'text/html': ['.html'],
          }}
          onFileSelect={setHtmlFile}
          selectedFile={htmlFile}
        />

        {/* Upload Progress */}
        {isUploading && <UploadProgress docxProgress={docxProgress} htmlProgress={htmlProgress} />}

        {/* Form Actions */}
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="outline" disabled={isSubmitting || isUploading}>
            ביטול
          </Button>
          <Button type="submit" disabled={isSubmitting || isUploading || !docxFile || !htmlFile}>
            {isUploading ? 'מעלה...' : isSubmitting ? 'יוצר...' : 'צור פרויקט'}
          </Button>
        </div>
      </form>

      {/* Success Modal */}
      {createdProject && (
        <SuccessModal
          open={showSuccessModal}
          onOpenChange={handleSuccessClose}
          projectUrl={createdProject.projectUrl}
          password={createdProject.password}
          htmlWarnings={createdProject.htmlWarnings}
          onCreateAnother={handleCreateAnother}
        />
      )}
    </>
  )
}
