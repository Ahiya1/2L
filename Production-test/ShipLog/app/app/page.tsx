import { serverClient } from '@/lib/trpc/server'
import { ProductCard } from '@/components/ProductCard'
import { FilterControls } from '@/components/FilterControls'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Status } from '@prisma/client'

interface HomePageProps {
  searchParams: Promise<{
    status?: string
    sort?: string
    search?: string
    view?: string
  }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams

  // Parse filters from URL
  const statusFilter = params.status
    ? (params.status.split(',') as Status[])
    : []
  const sortBy = (params.sort || 'updatedAt') as 'updatedAt' | 'launchDate' | 'name' | 'status'
  const searchQuery = params.search || ''
  const viewMode = (params.view || 'grid') as 'grid' | 'list'

  // Fetch filtered products
  const products = await serverClient.product.getFiltered({
    statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
    sortBy,
    searchQuery: searchQuery || undefined,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/overview">Portfolio Overview</Link>
          </Button>
          <Button asChild>
            <Link href="/products/new">New Product</Link>
          </Button>
        </div>
      </div>

      {/* Filter Controls (Client Component) */}
      <FilterControls
        currentStatus={statusFilter}
        currentSort={sortBy}
        currentSearch={searchQuery}
        currentView={viewMode}
      />

      {/* Product List/Grid */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No products found</p>
          <Button asChild>
            <Link href="/products/new">Create your first product</Link>
          </Button>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'flex flex-col gap-4'
        }>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} viewMode={viewMode} />
          ))}
        </div>
      )}

      {products.length >= 50 && (
        <p className="text-center text-gray-500 mt-6">
          Showing first 50 results
        </p>
      )}
    </div>
  )
}
