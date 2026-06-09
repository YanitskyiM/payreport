export type View = 'dashboard' | 'entries' | 'reports' | 'settings'

export type Entry = {
  id: string
  start: string
  end: string
  source: 'timer' | 'manual'
  note?: string
}

export type Settings = {
  workerName: string
  hourlyRate: number
  weeklyGoalHours: number
  overworksRate: number
  activeShiftStart: string | null
}

export type ManualFormState = {
  date: string
  startTime: string
  endTime: string
  note: string
}

export type WeeklyBar = {
  dayName: string
  fullDate: string
  heightPercent: number
  hours: number
  label: string
}

export const DEFAULT_SETTINGS: Settings = {
  workerName: 'Alex Johnson',
  hourlyRate: 28,
  weeklyGoalHours: 40,
  overworksRate: 1.5,
  activeShiftStart: null
}

export const HOUR_MS = 1000 * 60 * 60

export function buildWeeklyChartData(
  entries: Entry[],
  now: Date,
  activeShiftDurationMs: number
): WeeklyBar[] {
  const startOfWeek = getStartOfWeek(now)
  const dailyHours: WeeklyBar[] = []
  const entriesByDate = buildDailyDurations(entries)

  for (let index = 0; index < 7; index += 1) {
    const currentDate = new Date(startOfWeek)
    currentDate.setDate(startOfWeek.getDate() + index)
    const key = formatDateKey(currentDate)
    let hours = entriesByDate[key] ?? 0

    if (isSameDay(currentDate, now) && activeShiftDurationMs > 0) {
      hours += activeShiftDurationMs / HOUR_MS
    }

    dailyHours.push({
      dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
      fullDate: currentDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      heightPercent: 0,
      hours,
      label: currentDate.toLocaleDateString('en-US', { weekday: 'short' })
    })
  }

  const peak = Math.max(...dailyHours.map((day) => day.hours), 1)

  return dailyHours.map((day) => ({
    ...day,
    heightPercent: (day.hours / peak) * 100
  }))
}

export function buildDailyDurations(entries: Entry[]): Record<string, number> {
  return entries.reduce<Record<string, number>>((accumulator, entry) => {
    const key = formatDateKey(new Date(entry.start))
    accumulator[key] = (accumulator[key] ?? 0) + getEntryDurationMs(entry) / HOUR_MS
    return accumulator
  }, {})
}

export function getEntryDurationMs(entry: Entry): number {
  return Math.max(0, new Date(entry.end).getTime() - new Date(entry.start).getTime())
}

export function createDefaultManualForm(date: Date): ManualFormState {
  return {
    date: formatInputDate(date),
    startTime: '09:00',
    endTime: '18:00',
    note: ''
  }
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getPageTitle(view: View): string {
  switch (view) {
    case 'dashboard':
      return 'Daily Overview'
    case 'entries':
      return 'Time Entries'
    case 'reports':
      return 'Reports'
    case 'settings':
      return 'Settings'
  }
}

export function getViewFromPathname(pathname: string): View {
  if (pathname === '/dashboard/entries') {
    return 'entries'
  }

  if (pathname === '/dashboard/reports') {
    return 'reports'
  }

  if (pathname === '/dashboard/settings') {
    return 'settings'
  }

  return 'dashboard'
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.max(0, Math.round(hours * 60))
  const wholeHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (wholeHours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${wholeHours}h`
  }

  return `${wholeHours}h ${minutes}m`
}

export function formatElapsedTimer(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatShortHours(hours: number): string {
  return formatDuration(hours)
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatEntryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function formatTimeRange(entry: Entry): string {
  return `${formatTime(new Date(entry.start))} – ${formatTime(new Date(entry.end))}`
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatInputDate(date: Date): string {
  return formatDateKey(date)
}

export function calculatePayFromHours(
  totalHours: number,
  goalHours: number,
  hourlyRate: number,
  overworksRate: number
): number {
  const regularHours = Math.min(totalHours, goalHours)
  const overtimeHours = Math.max(0, totalHours - goalHours)
  return regularHours * hourlyRate + overtimeHours * hourlyRate * overworksRate
}


export function goalHint(progress: number): string {
  if (progress >= 1) {
    return 'Goal reached'
  }

  if (progress >= 0.75) {
    return 'On track'
  }

  if (progress >= 0.4) {
    return 'In progress'
  }

  return 'Needs focus'
}

export function getStartOfWeek(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

// Fixed Monday anchor used to align all bi-weekly pay periods consistently.
const BI_WEEKLY_ANCHOR = new Date('2024-01-01T00:00:00')

export function getBiWeeklyPeriodStart(date: Date): Date {
  const anchor = new Date(BI_WEEKLY_ANCHOR)
  const daysDiff = Math.floor((date.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24))
  const periodIndex = Math.floor(daysDiff / 14)
  const result = new Date(anchor)
  result.setDate(anchor.getDate() + periodIndex * 14)
  result.setHours(0, 0, 0, 0)
  return result
}

export function isDateInCurrentBiWeeklyPeriod(date: Date, now: Date): boolean {
  const start = getBiWeeklyPeriodStart(now)
  const end = new Date(start)
  end.setDate(end.getDate() + 14)
  return date >= start && date < end
}

export function isDateInPreviousBiWeeklyPeriod(date: Date, now: Date): boolean {
  const currentStart = getBiWeeklyPeriodStart(now)
  const prevStart = new Date(currentStart)
  prevStart.setDate(prevStart.getDate() - 14)
  return date >= prevStart && date < currentStart
}

export function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function isDateInCurrentWeek(date: Date, now: Date): boolean {
  const start = getStartOfWeek(now)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return date >= start && date < end
}
