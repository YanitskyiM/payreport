import { redirect } from 'next/navigation'
import { WorkClockApp } from '@/components/workclock-app'
import { createClient } from '@/lib/supabase/server'
import type { View } from '@/lib/workclock'

export async function renderDashboardPage(currentView: View) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims?.sub) {
    redirect('/login')
  }

  return (
    <WorkClockApp
      currentView={currentView}
      userEmail={typeof claims.email === 'string' ? claims.email : ''}
      userId={claims.sub}
    />
  )
}
