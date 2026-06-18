import { redirect } from 'next/navigation'
import { PayReportApp } from '@/components/workclock-app'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims?.sub) {
    redirect('/login')
  }

  return (
    <PayReportApp
      userEmail={typeof claims.email === 'string' ? claims.email : ''}
      userId={claims.sub}
    />
  )
}
