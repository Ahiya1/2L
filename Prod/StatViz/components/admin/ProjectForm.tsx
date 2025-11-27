'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RefreshCw, Loader2 } from 'lucide-react'
import { CreateProjectFormSchema, CreateProjectFormData } from '@/lib/validation/schemas'
import { generatePassword } from '@/lib/utils/password'
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
        <div className="space-y-2">
          <Label htmlFor="project_name" className="text-sm font-medium text-slate-700">
            שם הפרויקט
          </Label>
          <Input
            id="project_name"
            {...register('project_name')}
            placeholder="הזן שם פרויקט בעברית"
            className={errors.project_name ? 'border-destructive focus-visible:ring-destructive' : ''}
            disabled={isSubmitting || isUploading}
          />
          {errors.project_name && (
            <p className="text-sm text-destructive">{errors.project_name.message}</p>
          )}
        </div>

        {/* Student Name */}
        <div className="space-y-2">
          <Label htmlFor="student_name" className="text-sm font-medium text-slate-700">
            שם הסטודנט
          </Label>
          <Input
            id="student_name"
            {...register('student_name')}
            placeholder="שם מלא של הסטודנט"
            className={errors.student_name ? 'border-destructive focus-visible:ring-destructive' : ''}
            disabled={isSubmitting || isUploading}
          />
          {errors.student_name && (
            <p className="text-sm text-destructive">{errors.student_name.message}</p>
          )}
        </div>

        {/* Student Email */}
        <div className="space-y-2">
          <Label htmlFor="student_email" className="text-sm font-medium text-slate-700">
            אימייל סטודנט
          </Label>
          <Input
            id="student_email"
            type="email"
            dir="ltr"
            className={`text-left ${errors.student_email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            {...register('student_email')}
            placeholder="student@example.com"
            disabled={isSubmitting || isUploading}
          />
          {errors.student_email && (
            <p className="text-sm text-destructive">{errors.student_email.message}</p>
          )}
        </div>

        {/* Research Topic */}
        <div className="space-y-2">
          <Label htmlFor="research_topic" className="text-sm font-medium text-slate-700">
            נושא המחקר
          </Label>
          <Textarea
            id="research_topic"
            {...register('research_topic')}
            placeholder="תאור קצר של נושא המחקר"
            rows={4}
            className={errors.research_topic ? 'border-destructive focus-visible:ring-destructive' : ''}
            disabled={isSubmitting || isUploading}
          />
          {errors.research_topic && (
            <p className="text-sm text-destructive">{errors.research_topic.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">סיסמה</Label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={autoGeneratePassword}
                onChange={handleAutoGenerateToggle}
                className="rounded"
              />
              <span>צור סיסמה אוטומטית</span>
            </label>
          </div>

          {autoGeneratePassword ? (
            <div className="flex gap-2">
              <Input
                value={currentPassword}
                readOnly
                dir="ltr"
                className="text-left bg-slate-50 font-mono"
                disabled={isSubmitting || isUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegeneratePassword}
                className="gap-2 hover:bg-slate-50 transition-colors"
                disabled={isSubmitting || isUploading}
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
              className={`text-left ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              placeholder="לפחות 6 תווים"
              disabled={isSubmitting || isUploading}
            />
          )}
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
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
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || isUploading}
            className="hover:bg-slate-50 transition-colors"
          >
            ביטול
          </Button>
          <Button
            type="submit"
            variant="gradient"
            disabled={isSubmitting || isUploading || !docxFile || !htmlFile}
            className="gap-2"
          >
            {isUploading || isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isUploading ? 'מעלה...' : 'יוצר...'}
              </>
            ) : (
              'צור פרויקט'
            )}
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
