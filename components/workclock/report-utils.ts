import { formatInputDate, formatLongDate, getStartOfWeek } from '@/lib/workclock'
import type { Entry } from './types'

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function getStartOfPreviousMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

export function getEndOfPreviousMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 0)
}

export function getEndOfWeek(date: Date): Date {
  return addDays(getStartOfWeek(date), 4) // Friday
}

export function buildReportPresetRanges() {
  const now = new Date()
  const yesterday = addDays(now, -1)

  return [
    createReportPreset('This week', getStartOfWeek(now), getEndOfWeek(now)),
    createReportPreset('Last 2 weeks', addDays(yesterday, -13), yesterday),
    createReportPreset('Last 4 weeks', addDays(yesterday, -27), yesterday),
    createReportPreset('This month to date', getStartOfMonth(now), now),
    createReportPreset('This month', getStartOfMonth(now), getEndOfMonth(now)),
    createReportPreset('Last month', getStartOfPreviousMonth(now), getEndOfPreviousMonth(now)),
  ]
}

export function createReportPreset(label: string, start: Date, end: Date) {
  return {
    label,
    startDate: formatInputDate(start),
    endDate: formatInputDate(end),
  }
}

export function formatReportRangeLabel(startDate: string, endDate: string): string {
  return `${formatLongDate(new Date(`${startDate}T12:00:00`))} – ${formatLongDate(
    new Date(`${endDate}T12:00:00`)
  )}`
}

export function filterEntriesByRange(entries: Entry[], startDate: string, endDate: string): Entry[] {
  if (!startDate || !endDate || endDate < startDate) return []
  return entries.filter((entry) => {
    const entryDate = formatInputDate(new Date(entry.start))
    return entryDate >= startDate && entryDate <= endDate
  })
}
