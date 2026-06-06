import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { WorkClockApp } from '@/components/workclock-app'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children
}: Readonly<{
  children: ReactNode
}>) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims?.sub) {
    redirect('/login')
  }

  return (
    <>
      <WorkClockApp
        userEmail={typeof claims.email === 'string' ? claims.email : ''}
        userId={claims.sub}
      />
      <div className="hidden">{children}</div>
    </>
  )
}
