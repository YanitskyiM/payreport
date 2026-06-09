import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntriesShell } from './EntriesShell'

const PAGE_SIZE = 20

export default async function DashboardEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  const userId = authData?.claims?.sub

  if (!userId) redirect('/login')

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: entries, count, error } = await supabase
    .from('time_entries')
    .select('id, start_at, end_at, source, note', { count: 'exact' })
    .eq('user_id', userId)
    .order('start_at', { ascending: false })
    .range(from, to)

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
        Failed to load entries: {error.message}
      </div>
    )
  }

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  return (
    <EntriesShell
      entries={entries ?? []}
      page={safePage}
      totalPages={totalPages}
      totalCount={totalCount}
      userId={userId}
    />
  )
}
