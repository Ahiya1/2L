import { ProductForm } from '@/components/ProductForm'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NewProductPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Add Product</h1>
        <Button variant="outline" asChild>
          <Link href="/">Cancel</Link>
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <ProductForm />
      </div>
    </div>
  )
}
