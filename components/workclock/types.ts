import type { ReactNode } from 'react'
import type { Entry, ManualFormState, Settings, View } from '@/lib/workclock'

export type NavItemConfig = {
  view: View
  href: string
  label: string
  icon: ReactNode
}

export type ProfileRow = {
  user_id: string
  worker_name: string
  hourly_rate: number
  weekly_goal_hours: number
  overworks_rate: number
  active_shift_start: string | null
}

export type EntryRow = {
  id: string
  start_at: string
  end_at: string
  source: Entry['source']
  note: string | null
}

export type PayReportAppProps = {
  userEmail: string
  userId: string
}

export type PendingShift = {
  start: string
  end: string
}

export type SummaryCardProps = {
  title: string
  value: string
  hint?: string
  icon: ReactNode
  tone?: 'indigo' | 'amber' | 'emerald' | 'slate'
  progress?: number
}

export type { Entry, ManualFormState, Settings, View }
