import { serverClient } from '@/lib/trpc/server'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MetricsEditor } from '@/components/MetricsEditor'
import { LaunchChecklist } from '@/components/LaunchChecklist'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface ProductDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params

  try {
    const product = await serverClient.product.getById({ id })

    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/">Back</Link>
            </Button>
            <Button asChild>
              <Link href={`/products/${product.id}/edit`}>Edit</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Product Details</CardTitle>
                  <StatusBadge status={product.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Description</h3>
                  <p className="text-gray-600">{product.description}</p>
                </div>

                {product.launchDate && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-1">Launch Date</h3>
                    <p className="text-gray-600">
                      {new Date(product.launchDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                {product.techStack.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Tech Stack</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.techStack.map((tech) => (
                        <Badge key={tech} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Launches */}
            <Card>
              <CardHeader>
                <CardTitle>Launch Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                {product.launches.length === 0 ? (
                  <p className="text-gray-500 text-sm">No launch platforms configured</p>
                ) : (
                  <LaunchChecklist productId={product.id} launches={product.launches} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Metrics */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricsEditor productId={product.id} initialMetrics={product.metrics} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Last Updated</p>
                  <p className="font-medium">
                    {new Date(product.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
}
