import { router } from './trpc'
import { productRouter } from './routers/product'
import { launchRouter } from './routers/launch'
import { metricsRouter } from './routers/metrics'

export const appRouter = router({
  product: productRouter,
  launch: launchRouter,
  metrics: metricsRouter,
})

export type AppRouter = typeof appRouter
