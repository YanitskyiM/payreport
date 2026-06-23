import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'timezone, clock_in_reminder_enabled, clock_in_reminder_time, clock_out_reminder_enabled, clock_out_reminder_time'
    )
    .eq('user_id', userId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminders: profile })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: {
    clockInEnabled?: boolean
    clockInTime?: string
    clockOutEnabled?: boolean
    clockOutTime?: string
    timezone?: string
  } = await request.json()

  const { error } = await supabase
    .from('profiles')
    .update({
      clock_in_reminder_enabled: body.clockInEnabled ?? false,
      clock_in_reminder_time: body.clockInTime ?? '09:00',
      clock_out_reminder_enabled: body.clockOutEnabled ?? false,
      clock_out_reminder_time: body.clockOutTime ?? '18:00',
      timezone: body.timezone ?? 'UTC',
    })
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

