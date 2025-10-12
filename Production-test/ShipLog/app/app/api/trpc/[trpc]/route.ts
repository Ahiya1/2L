import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server'
import { createContext } from '@/server/trpc'

/**
 * Next.js App Router handler for tRPC requests
 * Handles both GET (queries) and POST (mutations)
 */
const handler = (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  })
}

export { handler as GET, handler as POST }
