import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendPushNotification } from '@/lib/pwa/send-push'

// Force Node.js runtime — web-push requires Node crypto APIs
export const runtime = 'nodejs'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns { hours, minutes, dateStr: "YYYY-MM-DD" } in the given IANA timezone. */
function getLocalDateTime(timezone: string): { hours: number; minutes: number; dateStr: string } {
  try {
    const now = new Date()
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now)

    const get = (type: string) => dateParts.find((p) => p.type === type)?.value ?? '0'
    const hours = parseInt(get('hour'), 10)
    const minutes = parseInt(get('minute'), 10)
    const dateStr = `${get('year')}-${get('month')}-${get('day')}`
    return { hours, minutes, dateStr }
  } catch {
    // Fallback to UTC on invalid timezone
    const now = new Date()
    return {
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
      dateStr: now.toISOString().slice(0, 10),
    }
  }
}

/**
 * Returns true if current local time is within [reminderTime, reminderTime + windowMinutes).
 * reminderTime format: "HH:MM"
 */
function isInWindow(
  localHours: number,
  localMinutes: number,
  reminderTime: string,
  windowMinutes = 5
): boolean {
  const [remH, remM] = reminderTime.split(':').map(Number)
  const current = localHours * 60 + localMinutes
  const reminder = remH * 60 + remM
  return current >= reminder && current < reminder + windowMinutes
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check required env vars up front so the error is obvious
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('your-')) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }

  try {
    const supabase = createServiceClient()

    // Fetch all users with at least one enabled reminder that also have push subscriptions.
    // Falls back gracefully if reminder columns don't exist yet (migration not run).
    const { data: rows, error } = await supabase
      .from('profiles')
      .select(
        `
        user_id,
        timezone,
        active_shift_start,
        clock_in_reminder_enabled,
        clock_in_reminder_time,
        clock_in_notified_date,
        clock_out_reminder_enabled,
        clock_out_reminder_time,
        clock_out_notified_date,
        push_subscriptions ( id, endpoint, keys_p256dh, keys_auth )
      `
      )
      .or('clock_in_reminder_enabled.eq.true,clock_out_reminder_enabled.eq.true')

    if (error) {
      console.error('[Push Cron] DB error:', error)
      // If reminder columns don't exist (migration not run), return helpful message
      return NextResponse.json(
        { error: error.message, hint: 'Have you run the reminder_settings_migration.sql?' },
        { status: 500 }
      )
    }

    let clockInSent = 0
    let clockOutSent = 0
    const staleIds: string[] = []

    for (const profile of rows ?? []) {
      const subs = (profile.push_subscriptions as {
        id: string
        endpoint: string
        keys_p256dh: string
        keys_auth: string
      }[]) ?? []

      if (subs.length === 0) continue

      const tz = profile.timezone ?? 'UTC'
      const { hours, minutes, dateStr } = getLocalDateTime(tz)
      const hasActiveShift = Boolean(profile.active_shift_start)

      // ── Clock-in reminder ────────────────────────────────────────────────────
      if (
        profile.clock_in_reminder_enabled &&
        !hasActiveShift &&
        profile.clock_in_notified_date !== dateStr &&
        isInWindow(hours, minutes, profile.clock_in_reminder_time)
      ) {
        for (const sub of subs) {
          const result = await sendPushNotification(sub, {
            title: '⏰ Time to clock in!',
            body: "Don't forget to start your shift for today.",
            url: '/dashboard',
            tag: 'clock-in-reminder',
          })
          if (result.success) clockInSent++
          else if (result.stale) staleIds.push(sub.id)
        }
        await supabase
          .from('profiles')
          .update({ clock_in_notified_date: dateStr })
          .eq('user_id', profile.user_id)
      }

      // ── Clock-out / log-time reminder ────────────────────────────────────────
      if (
        profile.clock_out_reminder_enabled &&
        !hasActiveShift &&
        profile.clock_out_notified_date !== dateStr &&
        isInWindow(hours, minutes, profile.clock_out_reminder_time)
      ) {
        for (const sub of subs) {
          const result = await sendPushNotification(sub, {
            title: '📋 Log your time!',
            body: "End of day — don't forget to record your hours.",
            url: '/dashboard',
            tag: 'clock-out-reminder',
          })
          if (result.success) clockOutSent++
          else if (result.stale) staleIds.push(sub.id)
        }
        await supabase
          .from('profiles')
          .update({ clock_out_notified_date: dateStr })
          .eq('user_id', profile.user_id)
      }
    }

    if (staleIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleIds)
    }

    return NextResponse.json({ ok: true, clockInSent, clockOutSent, stale: staleIds.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Push Cron] Unexpected error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Vercel also calls cron via POST in some configurations
export const POST = GET
