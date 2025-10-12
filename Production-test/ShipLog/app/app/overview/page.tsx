import { serverClient } from '@/lib/trpc/server'
import { MetricCard } from '@/components/MetricCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Status } from '@prisma/client'

export default async function OverviewPage() {
  const overview = await serverClient.metrics.getPortfolioOverview()

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  const numberFormatter = new Intl.NumberFormat('en-US')

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Portfolio Overview</h1>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <MetricCard
          title="Total Revenue"
          value={currencyFormatter.format(overview.totalRevenue)}
          subtitle={`Across ${overview.productsWithRevenue} products`}
          icon="💰"
        />

        {/* Products by Status */}
        {Object.entries(overview.statusCounts).map(([status, count]) => (
          <MetricCard
            key={status}
            title={status}
            value={numberFormatter.format(count)}
            subtitle={`${count === 1 ? 'product' : 'products'}`}
            icon={getStatusIcon(status as Status)}
          />
        ))}
      </div>

      {/* Stale Products Warning */}
      {overview.staleProducts.length > 0 && (
        <Card className="mb-8 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">
              ⚠️ Products Needing Updates ({overview.staleProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {overview.staleProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between">
                  <Link
                    href={`/products/${product.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {product.name}
                  </Link>
                  <span className="text-sm text-gray-600">
                    Last updated {new Date(product.updatedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recent Launches */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Launches</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.recentLaunches.length === 0 ? (
            <p className="text-gray-500">No launches yet</p>
          ) : (
            <ul className="space-y-3">
              {overview.recentLaunches.map((launch) => (
                <li key={launch.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <Link
                      href={`/products/${launch.product.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {launch.product.name}
                    </Link>
                    <span className="text-gray-500 mx-2">on</span>
                    <span className="font-medium">{launch.platform}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {launch.launchDate && new Date(launch.launchDate).toLocaleDateString()}
                    </div>
                    {launch.url && (
                      <a
                        href={launch.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusIcon(status: Status): string {
  const icons: Record<Status, string> = {
    [Status.IDEA]: '💡',
    [Status.BUILDING]: '🔨',
    [Status.SHIPPED]: '🚀',
    [Status.VALIDATED]: '✅',
    [Status.ARCHIVED]: '📦',
  }
  return icons[status] || '📊'
}
