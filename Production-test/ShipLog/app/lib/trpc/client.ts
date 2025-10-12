import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server'

/**
 * tRPC React hooks for Client Components
 * Usage: trpc.product.getAll.useQuery()
 */
export const trpc = createTRPCReact<AppRouter>()
