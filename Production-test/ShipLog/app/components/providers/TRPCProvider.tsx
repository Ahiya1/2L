'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'
import superjson from 'superjson'
import { trpc } from '@/lib/trpc/client'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 1000,        // 10 seconds
            gcTime: 5 * 60 * 1000,       // 5 minutes (formerly cacheTime)
            retry: 3,                     // Retry failed queries 3 times
            refetchOnWindowFocus: false,  // Local DB, no external staleness
          },
          mutations: {
            retry: false,                 // Never retry mutations (avoid duplicates)
          },
        },
      })
  )

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
