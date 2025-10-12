import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          ShipLog
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Products
          </Link>
          <Button asChild size="sm">
            <Link href="/products/new">Add Product</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
