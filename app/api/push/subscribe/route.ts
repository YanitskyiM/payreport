import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } =
      await request.json()

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
    }

    // Delete stale row for this device first (avoids needing UPDATE RLS policy)
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', body.endpoint)

    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      endpoint: body.endpoint,
      keys_p256dh: body.keys.p256dh,
      keys_auth: body.keys.auth,
    })

    if (error) {
      console.error('[Push Subscribe] DB error:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Push Subscribe] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
