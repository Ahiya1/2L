import { serverClient } from '@/lib/trpc/server'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function HomePage() {
  const products = await serverClient.product.getAll()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Products</h1>
        <Button asChild>
          <Link href="/products/new">Add Product</Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No products yet</p>
          <Button asChild>
            <Link href="/products/new">Create your first product</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
