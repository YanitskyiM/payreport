import { DEFAULT_SETTINGS } from '@/lib/workclock'
import type { Entry, EntryRow, ProfileRow, Settings } from './types'

export function toInputTime(date: Date): string {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
}

export function mapRowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    start: row.start_at,
    end: row.end_at,
    source: row.source,
    note: row.note ?? undefined,
  }
}

export function mapProfileToSettings(profile: ProfileRow): Settings {
  return {
    workerName: profile.worker_name,
    hourlyRate: profile.hourly_rate,
    weeklyGoalHours: profile.weekly_goal_hours,
    overworksRate: profile.overworks_rate ?? DEFAULT_SETTINGS.overworksRate,
    activeShiftStart: profile.active_shift_start,
  }
}
