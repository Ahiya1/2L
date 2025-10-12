import { appRouter } from '@/server'
import { createContext } from '@/server/trpc'

/**
 * Server-side tRPC caller for Server Components
 * Usage: const products = await serverClient.product.getAll()
 */
export const serverClient = appRouter.createCaller(await createContext())
