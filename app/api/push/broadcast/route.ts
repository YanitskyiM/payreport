import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendPushNotification, type PushPayload } from '@/lib/pwa/send-push'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: PushPayload = await request.json()
  if (!payload.title || !payload.body) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys_p256dh, keys_auth')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, stale: 0 })
  }

  let sent = 0
  const staleIds: string[] = []

  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, keys_p256dh: sub.keys_p256dh, keys_auth: sub.keys_auth },
        payload
      )
      if (result.success) sent++
      else if (result.stale) staleIds.push(sub.id)
    })
  )

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }

  return NextResponse.json({ ok: true, sent, stale: staleIds.length, total: subscriptions.length })
}
