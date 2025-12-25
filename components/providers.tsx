'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorSuppressor } from './error-suppressor'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error: any) => {
              // Don't retry on auth errors
              if (error?.message?.includes('Invalid Refresh Token')) {
                return false
              }
              return failureCount < 3
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorSuppressor />
      {children}
    </QueryClientProvider>
  )
}
