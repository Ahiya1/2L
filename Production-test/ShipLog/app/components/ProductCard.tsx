'use client'

import { type Product, type Launch, type Metrics } from '@prisma/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

type ProductWithRelations = Omit<Product, 'techStack'> & {
  launches: Launch[]
  metrics: Metrics | null
  techStack: string[] // tRPC router parses JSON string to array
}

interface ProductCardProps {
  product: ProductWithRelations
  viewMode?: 'grid' | 'list'
}

export function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const launchedPlatforms = product.launches.filter(l => l.launched).length
  const totalPlatforms = 7 // Fixed platform count

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  if (viewMode === 'list') {
    return (
      <Link href={`/products/${product.id}`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {/* Left: Name + Status */}
              <div className="flex items-center gap-4 flex-1">
                <div>
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-1">{product.description}</p>
                </div>
              </div>

              {/* Middle: Metrics */}
              <div className="flex items-center gap-6 mx-6">
                {product.metrics && (
                  <>
                    <div className="text-center">
                      <div className="text-sm font-medium">{product.metrics.signups}</div>
                      <div className="text-xs text-gray-500">Signups</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">
                        {currencyFormatter.format(product.metrics.revenue)}
                      </div>
                      <div className="text-xs text-gray-500">Revenue</div>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Status + Launches */}
              <div className="flex items-center gap-4">
                <StatusBadge status={product.status} />
                <div className="text-sm text-gray-600">
                  {launchedPlatforms}/{totalPlatforms} launched
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Grid view (existing code)
  return (
    <Link href={`/products/${product.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl">{product.name}</CardTitle>
            <StatusBadge status={product.status} />
          </div>
          <CardDescription className="line-clamp-2">
            {product.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Tech Stack */}
            {product.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.techStack.slice(0, 3).map((tech) => (
                  <Badge key={tech} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
                {product.techStack.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{product.techStack.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Metrics */}
            {product.metrics && (
              <div className="flex gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-semibold">{product.metrics.signups}</span>
                  {' '}signups
                </div>
                <div>
                  <span className="font-semibold">
                    ${product.metrics.revenue.toFixed(2)}
                  </span>
                  {' '}revenue
                </div>
              </div>
            )}

            {/* Launch Progress */}
            <div className="text-sm text-gray-600">
              Launched on {launchedPlatforms} / {totalPlatforms} platforms
            </div>

            {/* Launch Date */}
            {product.launchDate && (
              <div className="text-sm text-gray-500">
                Launch: {new Date(product.launchDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
