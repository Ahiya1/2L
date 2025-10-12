'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toast } from 'sonner'
import type { Launch } from '@prisma/client'

interface LaunchChecklistItemProps {
  productId: string
  launch: Launch
}

export function LaunchChecklistItem({ productId, launch }: LaunchChecklistItemProps) {
  const utils = trpc.useUtils()

  // Local state for form fields
  const [launched, setLaunched] = useState(launch.launched)
  const [launchDate, setLaunchDate] = useState(
    launch.launchDate ? new Date(launch.launchDate).toISOString().split('T')[0] : ''
  )
  const [url, setUrl] = useState(launch.url || '')
  const [notes, setNotes] = useState(launch.notes || '')

  // Debounce text fields (500ms)
  const debouncedUrl = useDebounce(url, 500)
  const debouncedNotes = useDebounce(notes, 500)

  // Update mutation with optimistic updates
  const updateMutation = trpc.launch.update.useMutation({
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await utils.product.getById.cancel({ id: productId })

      // Snapshot previous value
      const previousProduct = utils.product.getById.getData({ id: productId })

      // Optimistically update cache
      utils.product.getById.setData({ id: productId }, (old) => {
        if (!old) return old
        return {
          ...old,
          launches: old.launches.map(l =>
            l.platform === launch.platform
              ? { ...l, ...newData }
              : l
          )
        }
      })

      return { previousProduct }
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousProduct) {
        utils.product.getById.setData({ id: productId }, context.previousProduct)
      }
      toast.error(`Failed to save ${launch.platform} launch`)
    },
    onSuccess: () => {
      // Optional: Show subtle success feedback
      // toast.success('Saved') // Can be too noisy
    },
    onSettled: () => {
      // Refetch to sync with server
      utils.product.getById.invalidate({ id: productId })
    },
  })

  // Auto-save on checkbox change (immediate)
  useEffect(() => {
    if (launched !== launch.launched) {
      updateMutation.mutate({
        productId,
        platform: launch.platform,
        launched,
      })
    }
  }, [launched])

  // Auto-save on date change (immediate)
  useEffect(() => {
    const newDate = launchDate ? new Date(launchDate) : null
    const oldDate = launch.launchDate ? new Date(launch.launchDate).toISOString().split('T')[0] : ''

    if (launchDate !== oldDate) {
      updateMutation.mutate({
        productId,
        platform: launch.platform,
        launchDate: newDate,
      })
    }
  }, [launchDate])

  // Auto-save on URL change (debounced)
  useEffect(() => {
    if (debouncedUrl !== (launch.url || '')) {
      updateMutation.mutate({
        productId,
        platform: launch.platform,
        url: debouncedUrl || null,
      })
    }
  }, [debouncedUrl])

  // Auto-save on notes change (debounced)
  useEffect(() => {
    if (debouncedNotes !== (launch.notes || '')) {
      updateMutation.mutate({
        productId,
        platform: launch.platform,
        notes: debouncedNotes || null,
      })
    }
  }, [debouncedNotes])

  // Prevent navigation while saving
  useEffect(() => {
    if (updateMutation.isPending) {
      window.onbeforeunload = () => 'Changes are being saved...'
    } else {
      window.onbeforeunload = null
    }
    return () => { window.onbeforeunload = null }
  }, [updateMutation.isPending])

  return (
    <div className="space-y-3 pt-2">
      {/* Checkbox + Status */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={launched}
          onChange={(e) => setLaunched(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label className="text-sm font-medium">
          {launched ? 'Launched' : 'Not launched yet'}
        </label>
        {updateMutation.isPending && (
          <span className="text-xs text-gray-500 animate-pulse">Saving...</span>
        )}
      </div>

      {/* Date, URL, Notes (only show if launched) */}
      {launched && (
        <div className="space-y-2 pl-7">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Launch Date</label>
            <input
              type="date"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Launch URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Got 250 upvotes, reached #3"
              rows={2}
              maxLength={500}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {notes.length}/500
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
