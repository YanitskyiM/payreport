import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only client using the service role key.
 * Bypasses RLS — only use in trusted server routes (e.g. cron).
 * Never expose to the client.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

