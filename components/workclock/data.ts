import { getStartOfWeek } from '@/lib/workclock'
import type { createClient } from '@/lib/supabase/client'
import type { Entry } from './types'
import { mapRowToEntry } from './utils'

const TIME_ENTRY_COLUMNS = 'id, start_at, end_at, source, note'

type SupabaseBrowserClient = ReturnType<typeof createClient>

export type EntryRange = {
  endExclusiveIso: string
  startIso: string
}

export function createWeekRange(date: Date): EntryRange {
  const start = getStartOfWeek(date)
  const endExclusive = new Date(start)
  endExclusive.setDate(endExclusive.getDate() + 7)

  return {
    endExclusiveIso: endExclusive.toISOString(),
    startIso: start.toISOString(),
  }
}

export function createInputDateRange(startDate: string, endDate: string): EntryRange {
  const start = new Date(`${startDate}T00:00:00`)
  const endExclusive = new Date(`${endDate}T00:00:00`)
  endExclusive.setDate(endExclusive.getDate() + 1)

  return {
    endExclusiveIso: endExclusive.toISOString(),
    startIso: start.toISOString(),
  }
}

export async function fetchEntries(
  supabase: SupabaseBrowserClient,
  userId: string
): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(TIME_ENTRY_COLUMNS)
    .eq('user_id', userId)
    .order('start_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(mapRowToEntry)
}

export async function fetchEntriesInRange(
  supabase: SupabaseBrowserClient,
  userId: string,
  range: EntryRange
): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(TIME_ENTRY_COLUMNS)
    .eq('user_id', userId)
    .gte('start_at', range.startIso)
    .lt('start_at', range.endExclusiveIso)
    .order('start_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(mapRowToEntry)
}

export async function fetchRecentEntries(
  supabase: SupabaseBrowserClient,
  userId: string,
  limit = 4
): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(TIME_ENTRY_COLUMNS)
    .eq('user_id', userId)
    .order('start_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map(mapRowToEntry)
}
