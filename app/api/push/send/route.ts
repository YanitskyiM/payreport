import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification, type PushPayload } from '@/lib/pwa/send-push'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: PushPayload = await request.json()

    if (!payload.title || !payload.body) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
    }

    // Fetch all subscriptions for this user
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, keys_p256dh, keys_auth')
      .eq('user_id', userId)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
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
        if (result.success) {
          sent++
        } else if (result.stale) {
          staleIds.push(sub.id)
        }
      })
    )

    // Remove stale subscriptions
    if (staleIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleIds)
    }

    return NextResponse.json({ ok: true, sent, stale: staleIds.length })
  } catch (error) {
    console.error('[Push Send] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
