'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Status } from '@prisma/client'

interface FilterControlsProps {
  currentStatus: Status[]
  currentSort: string
  currentSearch: string
  currentView: string
}

export function FilterControls({
  currentStatus,
  currentSort,
  currentSearch,
  currentView,
}: FilterControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchTerm, setSearchTerm] = useState(currentSearch)
  const debouncedSearch = useDebounce(searchTerm, 300)

  const statuses = [Status.IDEA, Status.BUILDING, Status.SHIPPED, Status.VALIDATED, Status.ARCHIVED]

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`/?${params.toString()}`)
  }

  const toggleStatus = (status: Status) => {
    const newStatuses = currentStatus.includes(status)
      ? currentStatus.filter(s => s !== status)
      : [...currentStatus, status]

    updateParams({ status: newStatuses.length > 0 ? newStatuses.join(',') : undefined })
  }

  const toggleView = () => {
    const newView = currentView === 'grid' ? 'list' : 'grid'
    updateParams({ view: newView })
  }

  // Update search param when debounced value changes
  useEffect(() => {
    updateParams({ search: debouncedSearch || undefined })
  }, [debouncedSearch])

  return (
    <div className="bg-white rounded-lg border p-4 mb-6 space-y-4">
      {/* Status Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Filter by Status</label>
        <div className="flex flex-wrap gap-2">
          {statuses.map(status => (
            <Badge
              key={status}
              variant={currentStatus.includes(status) ? 'default' : 'outline'}
              onClick={() => toggleStatus(status)}
              className="cursor-pointer hover:opacity-80"
            >
              {status}
            </Badge>
          ))}
        </div>
      </div>

      {/* Search + Sort + View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className="text-sm font-medium mb-2 block">Search</label>
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Sort */}
        <div>
          <label className="text-sm font-medium mb-2 block">Sort by</label>
          <Select value={currentSort} onValueChange={(value) => updateParams({ sort: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
              <SelectItem value="launchDate">Launch Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle */}
        <div>
          <label className="text-sm font-medium mb-2 block">View</label>
          <Button
            variant="outline"
            onClick={toggleView}
            className="w-full"
          >
            {currentView === 'grid' ? 'List View' : 'Grid View'}
          </Button>
        </div>
      </div>

      {/* Clear Filters */}
      {(currentStatus.length > 0 || searchTerm || currentSort !== 'updatedAt') && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/')}
        >
          Clear Filters
        </Button>
      )}
    </div>
  )
}
