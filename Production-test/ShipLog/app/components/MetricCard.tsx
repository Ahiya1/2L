import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: string
  onClick?: () => void
}

export function MetricCard({ title, value, subtitle, icon, onClick }: MetricCardProps) {
  return (
    <Card
      className={`${onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}
