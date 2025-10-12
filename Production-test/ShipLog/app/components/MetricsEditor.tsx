'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Metrics } from '@prisma/client'

interface MetricsEditorProps {
  productId: string
  initialMetrics?: Metrics | null
}

export function MetricsEditor({ productId, initialMetrics }: MetricsEditorProps) {
  const utils = trpc.useUtils()

  const [signups, setSignups] = useState(initialMetrics?.signups?.toString() || '0')
  const [revenue, setRevenue] = useState(initialMetrics?.revenue?.toString() || '0')

  const updateMutation = trpc.metrics.upsert.useMutation({
    onMutate: async (newMetrics) => {
      // Cancel outgoing refetches
      await utils.product.getById.cancel({ id: productId })

      // Snapshot previous value
      const previous = utils.product.getById.getData({ id: productId })

      // Optimistically update cache
      utils.product.getById.setData({ id: productId }, (old) => {
        if (!old) return old
        return {
          ...old,
          metrics: {
            ...(old.metrics || {}),
            ...newMetrics,
            id: old.metrics?.id || 'temp',
            productId,
            lastUpdate: new Date(),
            createdAt: old.metrics?.createdAt || new Date(),
            updatedAt: new Date(),
          } as Metrics,
        }
      })

      return { previous }
    },
    onError: (err, newMetrics, context) => {
      // Rollback on error
      if (context?.previous) {
        utils.product.getById.setData({ id: productId }, context.previous)
      }
      toast.error('Failed to update metrics')
    },
    onSuccess: () => {
      toast.success('Metrics updated')
    },
    onSettled: () => {
      // Refetch to sync with server
      utils.product.getById.invalidate({ id: productId })
      utils.metrics.getPortfolioOverview.invalidate()
    },
  })

  const handleSave = () => {
    const signupsNum = parseInt(signups, 10) || 0
    const revenueNum = parseFloat(revenue) || 0

    if (signupsNum < 0 || revenueNum < 0) {
      toast.error('Values must be positive')
      return
    }

    updateMutation.mutate({
      productId,
      signups: signupsNum,
      revenue: revenueNum,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="signups">Signups / Users</Label>
        <Input
          id="signups"
          type="number"
          min="0"
          value={signups}
          onChange={(e) => setSignups(e.target.value)}
          placeholder="0"
        />
      </div>

      <div>
        <Label htmlFor="revenue">Revenue ($)</Label>
        <Input
          id="revenue"
          type="number"
          min="0"
          step="0.01"
          value={revenue}
          onChange={(e) => setRevenue(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full"
      >
        {updateMutation.isPending ? 'Saving...' : 'Save Metrics'}
      </Button>

      {initialMetrics?.lastUpdate && (
        <p className="text-xs text-gray-500">
          Last updated: {new Date(initialMetrics.lastUpdate).toLocaleString()}
        </p>
      )}
    </div>
  )
}
