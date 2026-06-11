'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LaunchScreen } from '@/components/launch-screen'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let isActive = true

    async function resolveLaunchRoute() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isActive) {
        return
      }

      router.replace(session?.user ? '/dashboard' : '/login')
    }

    void resolveLaunchRoute()

    return () => {
      isActive = false
    }
  }, [router])

  return <LaunchScreen />
}
