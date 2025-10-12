import { initTRPC } from '@trpc/server'
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'

/**
 * Create context for tRPC requests
 * Contains Prisma client and request metadata
 */
export const createContext = async (opts?: FetchCreateContextFnOptions) => {
  return {
    prisma,
    headers: opts?.req.headers,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>

/**
 * Initialize tRPC with context, transformers, and error formatting
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * Export reusable router and procedure builders
 */
export const router = t.router
export const publicProcedure = t.procedure

/**
 * Logging middleware for slow query detection
 */
const loggingMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now()
  const result = await next()
  const duration = Date.now() - start

  if (duration > 1000) {
    console.warn(`[SLOW QUERY] ${type} ${path} took ${duration}ms`)
  } else if (process.env.NODE_ENV === 'development') {
    console.log(`[tRPC] ${type} ${path} - ${duration}ms`)
  }

  return result
})

export const loggedProcedure = publicProcedure.use(loggingMiddleware)
