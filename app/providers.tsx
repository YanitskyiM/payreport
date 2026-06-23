'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { registerServiceWorker } from '@/lib/pwa/register-sw'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    void registerServiceWorker()
  }, [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
