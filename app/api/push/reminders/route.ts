import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

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

  if (error) {
    console.error('[Push Reminders GET] DB error:', error.message)
    return NextResponse.json({ error: 'Failed to load reminder settings' }, { status: 500 })
  }
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

  const clockInTime = body.clockInTime ?? '09:00'
  const clockOutTime = body.clockOutTime ?? '18:00'

  if (!TIME_RE.test(clockInTime)) {
    return NextResponse.json({ error: 'Invalid clockInTime format — expected HH:MM' }, { status: 400 })
  }
  if (!TIME_RE.test(clockOutTime)) {
    return NextResponse.json({ error: 'Invalid clockOutTime format — expected HH:MM' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      clock_in_reminder_enabled: body.clockInEnabled ?? false,
      clock_in_reminder_time: clockInTime,
      clock_out_reminder_enabled: body.clockOutEnabled ?? false,
      clock_out_reminder_time: clockOutTime,
      timezone: body.timezone ?? 'UTC',
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[Push Reminders PUT] DB error:', error.message)
    return NextResponse.json({ error: 'Failed to save reminder settings' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

