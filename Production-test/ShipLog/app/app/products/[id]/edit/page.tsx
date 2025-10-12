'use client'

import { trpc } from '@/lib/trpc/client'
import { ProductForm } from '@/components/ProductForm'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function EditProductPage() {
  const params = useParams()
  const id = params.id as string

  const { data: product, isLoading, error } = trpc.product.getById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Product Not Found</h2>
          <p className="text-gray-600 mb-6">
            The product you're trying to edit doesn't exist or has been deleted.
          </p>
          <Button asChild>
            <Link href="/">Back to Products</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <Button variant="outline" asChild>
          <Link href={`/products/${id}`}>Cancel</Link>
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <ProductForm
          productId={product.id}
          defaultValues={{
            name: product.name,
            description: product.description,
            status: product.status,
            launchDate: product.launchDate
              ? new Date(product.launchDate).toISOString().split('T')[0]
              : '',
            techStack: product.techStack.join(', '),
          }}
        />
      </div>
    </div>
  )
}
