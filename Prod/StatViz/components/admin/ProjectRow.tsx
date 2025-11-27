'use client'

import { useState } from 'react'
import { ExternalLink, Trash2, KeyRound } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CopyButton } from './CopyButton'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { RegeneratePasswordModal } from './RegeneratePasswordModal'
import { useDeleteProject } from '@/lib/hooks/useDeleteProject'
import { useRegeneratePassword } from '@/lib/hooks/useRegeneratePassword'
import { formatHebrewDate, formatViewCount } from '@/lib/utils/dates'
import { toast } from 'sonner'
import type { Project } from '@/lib/types/admin'

interface Props {
  project: Project
}

export function ProjectRow({ project }: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState<string>('')
  const deleteProject = useDeleteProject()
  const regeneratePassword = useRegeneratePassword()

  const projectUrl = `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/preview/${project.projectId}`

  function handleDelete() {
    deleteProject.mutate(project.projectId)
    setShowDeleteModal(false)
  }

  function handleView() {
    window.open(projectUrl, '_blank', 'noopener,noreferrer')
  }

  function handleRegeneratePassword() {
    regeneratePassword.mutate(project.projectId, {
      onSuccess: (data) => {
        setNewPassword(data.password)
        setShowPasswordModal(true)
        toast.success('סיסמה חדשה נוצרה בהצלחה!')
      }
    })
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium text-right">
          {project.projectName}
        </TableCell>
        <TableCell className="text-right">
          {project.studentName}
        </TableCell>
        <TableCell className="text-left" dir="ltr">
          {project.studentEmail}
        </TableCell>
        <TableCell className="text-center">
          {formatHebrewDate(project.createdAt)}
        </TableCell>
        <TableCell className="text-center">
          {formatViewCount(project.viewCount)}
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              צפה
            </Button>
            <CopyButton text={projectUrl} label="העתק קישור" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegeneratePassword}
              disabled={regeneratePassword.isPending}
              className="gap-2"
            >
              <KeyRound className="h-4 w-4" />
              {regeneratePassword.isPending ? 'יוצר...' : 'סיסמה חדשה'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              מחק
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <DeleteConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        projectName={project.projectName}
        onConfirm={handleDelete}
        isDeleting={deleteProject.isPending}
      />

      <RegeneratePasswordModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
        password={newPassword}
        projectName={project.projectName}
      />
    </>
  )
}
