import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('profiles')
    .update({
      clock_in_reminder_enabled: false,
      clock_out_reminder_enabled: false,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[Push Reminders Disable] DB error:', error.message)
    return NextResponse.json({ error: 'Failed to disable reminder settings' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
