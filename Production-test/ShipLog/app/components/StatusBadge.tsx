import { Status } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: Status
}

const statusConfig = {
  [Status.IDEA]: { label: 'Idea', className: 'bg-gray-100 text-gray-700' },
  [Status.BUILDING]: { label: 'Building', className: 'bg-blue-100 text-blue-700' },
  [Status.SHIPPED]: { label: 'Shipped', className: 'bg-green-100 text-green-700' },
  [Status.VALIDATED]: { label: 'Validated', className: 'bg-purple-100 text-purple-700' },
  [Status.ARCHIVED]: { label: 'Archived', className: 'bg-red-100 text-red-700' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge className={config.className} variant="secondary">
      {config.label}
    </Badge>
  )
}
