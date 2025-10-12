'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Status } from '@prisma/client'
import { trpc } from '@/lib/trpc/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  status: z.nativeEnum(Status).default(Status.IDEA),
  launchDate: z.string().optional(),
  techStack: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface ProductFormProps {
  productId?: string
  defaultValues?: Partial<FormData>
}

export function ProductForm({ productId, defaultValues }: ProductFormProps) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const createMutation = trpc.product.create.useMutation({
    onSuccess: () => {
      toast.success('Product created successfully')
      utils.product.getAll.invalidate()
      router.push('/')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create product')
    },
  })

  const updateMutation = trpc.product.update.useMutation({
    onSuccess: () => {
      toast.success('Product updated successfully')
      utils.product.getAll.invalidate()
      utils.product.getById.invalidate({ id: productId! })
      router.push('/')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update product')
    },
  })

  const onSubmit = (data: FormData) => {
    const techStack = data.techStack
      ? data.techStack.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const launchDate = data.launchDate ? new Date(data.launchDate) : null

    if (productId) {
      updateMutation.mutate({
        id: productId,
        ...data,
        launchDate,
        techStack,
      })
    } else {
      createMutation.mutate({
        ...data,
        launchDate,
        techStack,
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const status = watch('status')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="name">Product Name</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., ShipLog"
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="What does your product do?"
          rows={3}
          disabled={isLoading}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          onValueChange={(value) => setValue('status', value as Status)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={Status.IDEA}>Idea</SelectItem>
            <SelectItem value={Status.BUILDING}>Building</SelectItem>
            <SelectItem value={Status.SHIPPED}>Shipped</SelectItem>
            <SelectItem value={Status.VALIDATED}>Validated</SelectItem>
            <SelectItem value={Status.ARCHIVED}>Archived</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && (
          <p className="text-sm text-red-500 mt-1">{errors.status.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="launchDate">Launch Date (optional)</Label>
        <Input
          id="launchDate"
          type="date"
          {...register('launchDate')}
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="techStack">Tech Stack (comma-separated, optional)</Label>
        <Input
          id="techStack"
          {...register('techStack')}
          placeholder="e.g., Next.js, React, TypeScript"
          disabled={isLoading}
        />
        <p className="text-sm text-gray-500 mt-1">
          Separate technologies with commas
        </p>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : productId ? 'Update Product' : 'Create Product'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
