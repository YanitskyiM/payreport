import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (data?.claims?.sub) {
    // Remove all push subscriptions for this user before signing out
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', data.claims.sub)

    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')

  return NextResponse.redirect(new URL('/login', request.url), {
    status: 302
  })
}
