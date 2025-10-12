import { router } from './trpc'
import { productRouter } from './routers/product'

export const appRouter = router({
  product: productRouter,
  // launch: launchRouter,     // Iteration 2
  // metrics: metricsRouter,   // Iteration 2
})

export type AppRouter = typeof appRouter
