import { z } from 'zod'
import { router, loggedProcedure } from '../trpc'
import { Status } from '@prisma/client'
import { LAUNCH_PLATFORMS } from '@/lib/constants'

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  status: z.nativeEnum(Status).default(Status.IDEA),
  launchDate: z.date().optional().nullable(),
  techStack: z.array(z.string()).default([]),
})

const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().cuid(),
})

export const productRouter = router({
  // Get all products with relations
  getAll: loggedProcedure.query(async ({ ctx }) => {
    const products = await ctx.prisma.product.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        launches: {
          where: { launched: true },
          take: 3,
          orderBy: { launchDate: 'desc' },
        },
        metrics: true,
      },
    })

    // Parse techStack JSON
    return products.map((product) => ({
      ...product,
      techStack: JSON.parse(product.techStack) as string[],
    }))
  }),

  // Get single product by ID
  getById: loggedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { id: input.id },
        include: {
          launches: {
            orderBy: { platform: 'asc' },
          },
          metrics: true,
        },
      })

      if (!product) {
        throw new Error('Product not found')
      }

      return {
        ...product,
        techStack: JSON.parse(product.techStack) as string[],
      }
    }),

  // Create product
  create: loggedProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      const { techStack, ...data } = input

      const product = await ctx.prisma.product.create({
        data: {
          ...data,
          techStack: JSON.stringify(techStack),
          launches: {
            createMany: {
              data: LAUNCH_PLATFORMS.map(platform => ({
                platform,
                launched: false,
              })),
            },
          },
        },
        include: {
          launches: true,
        },
      })

      return {
        ...product,
        techStack: JSON.parse(product.techStack) as string[],
      }
    }),

  // Update product
  update: loggedProcedure
    .input(updateProductSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, techStack, ...data } = input

      const product = await ctx.prisma.product.update({
        where: { id },
        data: {
          ...data,
          ...(techStack && { techStack: JSON.stringify(techStack) }),
        },
      })

      return {
        ...product,
        techStack: JSON.parse(product.techStack) as string[],
      }
    }),

  // Delete product
  delete: loggedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.product.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Get filtered products (with status, sort, search)
  getFiltered: loggedProcedure
    .input(z.object({
      statusFilter: z.array(z.nativeEnum(Status)).optional(),
      sortBy: z.enum(['updatedAt', 'launchDate', 'name', 'status']).default('updatedAt'),
      searchQuery: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Helper function for dynamic sorting
      const getSortOrder = (sortBy: string) => {
        switch (sortBy) {
          case 'launchDate':
            return { launchDate: 'desc' as const }
          case 'name':
            return { name: 'asc' as const }
          case 'status':
            return { status: 'asc' as const }
          case 'updatedAt':
          default:
            return { updatedAt: 'desc' as const }
        }
      }

      const products = await ctx.prisma.product.findMany({
        where: {
          ...(input.statusFilter?.length && {
            status: { in: input.statusFilter }
          }),
          ...(input.searchQuery && {
            OR: [
              { name: { contains: input.searchQuery } },
              { description: { contains: input.searchQuery } },
            ]
          }),
        },
        orderBy: getSortOrder(input.sortBy),
        include: {
          launches: true,
          metrics: true,
        },
        take: 50, // Limit results
      })

      return products.map((product) => ({
        ...product,
        techStack: JSON.parse(product.techStack) as string[],
      }))
    }),
})
