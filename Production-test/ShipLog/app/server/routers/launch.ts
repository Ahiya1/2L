import { z } from 'zod'
import { router, loggedProcedure } from '../trpc'

// Validation schema for launch updates
const updateLaunchSchema = z.object({
  productId: z.string().cuid(),
  platform: z.string(),
  launched: z.boolean().optional(),
  launchDate: z.date().optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('')),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().nullable(),
})

export const launchRouter = router({
  // Update or create launch (upsert)
  update: loggedProcedure
    .input(updateLaunchSchema)
    .mutation(async ({ ctx, input }) => {
      const { productId, platform, ...updateData } = input

      // Handle empty string for URL (convert to null)
      const cleanedData = {
        ...updateData,
        url: updateData.url === '' ? null : updateData.url,
        notes: updateData.notes === '' ? null : updateData.notes,
      }

      const launch = await ctx.prisma.launch.upsert({
        where: {
          productId_platform: { productId, platform },
        },
        update: cleanedData,
        create: {
          productId,
          platform,
          ...cleanedData,
        },
      })

      return launch
    }),

  // Get all launches for a product
  getByProductId: loggedProcedure
    .input(z.object({ productId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.launch.findMany({
        where: { productId: input.productId },
        orderBy: { platform: 'asc' },
      })
    }),

  // Delete launch
  delete: loggedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.launch.delete({
        where: { id: input.id },
      })
    }),
})
