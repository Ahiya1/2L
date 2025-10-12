import { z } from 'zod'
import { router, loggedProcedure } from '../trpc'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { Status } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Cached portfolio overview - executes aggregation queries
const getCachedPortfolioOverview = unstable_cache(
  async () => {
    const [statusCounts, revenueData, staleProducts, recentLaunches] = await Promise.all([
      // Count products by status (exclude archived)
      prisma.product.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { status: { not: Status.ARCHIVED } },
      }),

      // Sum total revenue
      prisma.metrics.aggregate({
        _sum: { revenue: true },
        _count: { id: true },
      }),

      // Find stale products (>30 days no update)
      prisma.product.findMany({
        where: {
          updatedAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
          status: { not: Status.ARCHIVED },
        },
        select: {
          id: true,
          name: true,
          updatedAt: true,
          status: true,
        },
        take: 10,
        orderBy: { updatedAt: 'asc' },
      }),

      // Recent launches (last 10)
      prisma.launch.findMany({
        where: {
          launched: true,
          launchDate: { lte: new Date() },
        },
        select: {
          id: true,
          platform: true,
          launchDate: true,
          url: true,
          product: {
            select: { name: true, id: true },
          },
        },
        orderBy: { launchDate: 'desc' },
        take: 10,
      }),
    ])

    // Transform statusCounts to object
    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count._all
      return acc
    }, {} as Record<Status, number>)

    return {
      statusCounts: statusMap,
      totalRevenue: revenueData._sum.revenue || 0,
      productsWithRevenue: revenueData._count,
      staleProducts,
      recentLaunches,
    }
  },
  ['portfolio-overview'],
  {
    revalidate: 30, // 30 second TTL
    tags: ['metrics', 'portfolio'],
  }
)

export const metricsRouter = router({
  // Upsert metrics
  upsert: loggedProcedure
    .input(z.object({
      productId: z.string().cuid(),
      signups: z.number().int().min(0).optional(),
      revenue: z.number().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const metrics = await ctx.prisma.metrics.upsert({
        where: { productId: input.productId },
        update: {
          ...(input.signups !== undefined && { signups: input.signups }),
          ...(input.revenue !== undefined && { revenue: input.revenue }),
          lastUpdate: new Date(),
        },
        create: {
          productId: input.productId,
          signups: input.signups || 0,
          revenue: input.revenue || 0,
        },
      })

      // Invalidate portfolio cache
      revalidateTag('metrics')

      return metrics
    }),

  // Get portfolio overview (cached)
  getPortfolioOverview: loggedProcedure.query(async () => {
    return getCachedPortfolioOverview()
  }),

  // Get metrics by product ID
  getByProductId: loggedProcedure
    .input(z.object({ productId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.metrics.findUnique({
        where: { productId: input.productId },
      })
    }),

  // Delete metrics
  delete: loggedProcedure
    .input(z.object({ productId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.metrics.delete({
        where: { productId: input.productId },
      })
      revalidateTag('metrics')
    }),
})
