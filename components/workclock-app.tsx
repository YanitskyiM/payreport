'use client'

import {
  BanknotesIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  PlayIcon,
  QueueListIcon,
  Squares2X2Icon,
  StopCircleIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  HOUR_MS,
  DEFAULT_SETTINGS,
  buildDailyDurations,
  buildWeeklyChartData,
  calculatePayFromHours,
  createDefaultManualForm,
  createId,
  formatCurrency,
  formatDuration,
  formatElapsedTimer,
  formatEntryDate,
  formatInputDate,
  formatLongDate,
  formatShortHours,
  formatTime,
  formatTimeRange,
  getViewFromPathname,
  getEntryDurationMs,
  getPageTitle,
  getStartOfWeek,
  goalHint,
  isDateInCurrentBiWeeklyPeriod,
  isDateInPreviousBiWeeklyPeriod,
  isDateInCurrentWeek,
  isSameDay,
  type Entry,
  type ManualFormState,
  type Settings,
  type View,
} from '@/lib/workclock'

type NavItemConfig = {
  view: View
  href: string
  label: string
  icon: ReactNode
}

type ProfileRow = {
  user_id: string
  worker_name: string
  hourly_rate: number
  weekly_goal_hours: number
  overworks_rate: number
  active_shift_start: string | null
}

type EntryRow = {
  id: string
  start_at: string
  end_at: string
  source: Entry['source']
  note: string | null
}

type PayReportAppProps = {
  userEmail: string
  userId: string
}

type PendingShift = {
  start: string
  end: string
}

type SummaryCardProps = {
  title: string
  value: string
  hint?: string
  icon: ReactNode
  tone?: 'indigo' | 'amber' | 'emerald' | 'slate'
  progress?: number
}

const NAV_ITEMS: NavItemConfig[] = [
  { view: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: <Squares2X2Icon className="h-5 w-5" /> },
  { view: 'reports', href: '/dashboard/reports', label: 'Reports', icon: <ChartBarIcon className="h-5 w-5" /> },
  { view: 'entries', href: '/dashboard/entries', label: 'Entries', icon: <QueueListIcon className="h-5 w-5" /> },
  { view: 'settings', href: '/dashboard/settings', label: 'Settings', icon: <Cog6ToothIcon className="h-5 w-5" /> }
]

const inputClassName =
  'h-12 min-w-0 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

export function PayReportApp({ userEmail, userId }: PayReportAppProps) {
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const routeLoadingTimeoutRef = useRef<number | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<Entry | null>(null)
  const [isDeletingEntry, setIsDeletingEntry] = useState(false)
  const [isBusy, setIsBusy] = useState(true)
  const [isRouteLoading, setIsRouteLoading] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [pendingShift, setPendingShift] = useState<PendingShift | null>(null)
  const [manualForm, setManualForm] = useState<ManualFormState>(() =>
    createDefaultManualForm(new Date())
  )
  const currentView = getViewFromPathname(pathname)
  const isOverlayOpen = isManualEntryOpen || deleteEntryTarget !== null

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isManualEntryOpen) {
      setEditingEntryId(null)
      setManualForm(createDefaultManualForm(now))
      setManualError(null)
    }
  }, [isManualEntryOpen, now])

  useEffect(() => {
    void loadData()
  }, [userId])

  useEffect(() => {
    return () => {
      if (routeLoadingTimeoutRef.current !== null) {
        window.clearTimeout(routeLoadingTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (routeLoadingTimeoutRef.current !== null) {
      window.clearTimeout(routeLoadingTimeoutRef.current)
      routeLoadingTimeoutRef.current = null
    }

    setIsRouteLoading(false)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  useEffect(() => {
    if (!isOverlayOpen) {
      return
    }

    const scrollY = window.scrollY
    const { body } = document
    const originalOverflow = body.style.overflow
    const originalPosition = body.style.position
    const originalTop = body.style.top
    const originalWidth = body.style.width

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'

    return () => {
      body.style.overflow = originalOverflow
      body.style.position = originalPosition
      body.style.top = originalTop
      body.style.width = originalWidth
      window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' })
    }
  }, [isOverlayOpen])

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (left, right) => new Date(right.start).getTime() - new Date(left.start).getTime()
      ),
    [entries]
  )

  const currentWeekEntries = useMemo(
    () => sortedEntries.filter((entry) => isDateInCurrentWeek(new Date(entry.start), now)),
    [now, sortedEntries]
  )


  const currentBiWeeklyEntries = useMemo(
    () => sortedEntries.filter((entry) => isDateInCurrentBiWeeklyPeriod(new Date(entry.start), now)),
    [now, sortedEntries]
  )

  const lastBiWeeklyEntries = useMemo(
    () => sortedEntries.filter((entry) => isDateInPreviousBiWeeklyPeriod(new Date(entry.start), now)),
    [now, sortedEntries]
  )

  const activeShiftDurationMs = settings.activeShiftStart
    ? Math.max(0, now.getTime() - new Date(settings.activeShiftStart).getTime())
    : pendingShift
      ? Math.max(0, new Date(pendingShift.end).getTime() - new Date(pendingShift.start).getTime())
      : 0

  const todayHours = useMemo(() => {
    const totalMs = sortedEntries
      .filter((entry) => isSameDay(new Date(entry.start), now))
      .reduce((sum, entry) => sum + getEntryDurationMs(entry), 0)

    return (totalMs + activeShiftDurationMs) / HOUR_MS
  }, [activeShiftDurationMs, now, sortedEntries])

  const weekHours = useMemo(() => {
    const totalMs = currentWeekEntries.reduce((sum, entry) => sum + getEntryDurationMs(entry), 0)
    return (totalMs + activeShiftDurationMs) / HOUR_MS
  }, [activeShiftDurationMs, currentWeekEntries])


  const biWeeklyHours = useMemo(() => {
    const totalMs = currentBiWeeklyEntries.reduce((sum, entry) => sum + getEntryDurationMs(entry), 0)
    return (totalMs + activeShiftDurationMs) / HOUR_MS
  }, [activeShiftDurationMs, currentBiWeeklyEntries])

  const lastBiWeeklyHours = useMemo(
    () => lastBiWeeklyEntries.reduce((sum, entry) => sum + getEntryDurationMs(entry), 0) / HOUR_MS,
    [lastBiWeeklyEntries]
  )

  const biWeeklyGoalHours = settings.weeklyGoalHours * 2
  const projectedBiWeeklyPay = calculatePayFromHours(
    biWeeklyHours,
    biWeeklyGoalHours,
    settings.hourlyRate,
    settings.overworksRate
  )
  const earningsTrend =
    lastBiWeeklyHours <= 0 ? null : ((biWeeklyHours - lastBiWeeklyHours) / lastBiWeeklyHours) * 100
  const weeklyGoalProgress =
    settings.weeklyGoalHours <= 0 ? 0 : weekHours / settings.weeklyGoalHours
  const recentEntries = sortedEntries.slice(0, 6)

  const pageTitle = getPageTitle(currentView)

  function handleNavigationStart(href: string) {
    if (href !== pathname) {
      if (routeLoadingTimeoutRef.current !== null) {
        window.clearTimeout(routeLoadingTimeoutRef.current)
      }

      routeLoadingTimeoutRef.current = window.setTimeout(() => {
        setIsRouteLoading(true)
        routeLoadingTimeoutRef.current = null
      }, 180)
    }
  }

  async function loadData() {
    setIsBusy(true)
    setLoadError(null)

    try {
      const profile = await fetchOrCreateProfile()
      const { data: entryRows, error: entryError } = await supabase
        .from('time_entries')
        .select('id, start_at, end_at, source, note')
        .eq('user_id', userId)
        .order('start_at', { ascending: false })

      if (entryError) {
        throw entryError
      }

      setSettings(mapProfileToSettings(profile))
      setEntries((entryRows ?? []).map(mapRowToEntry))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load Supabase data.'
      setLoadError(message)
    } finally {
      setIsBusy(false)
    }
  }

  async function fetchOrCreateProfile(): Promise<ProfileRow> {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, worker_name, hourly_rate, weekly_goal_hours, overworks_rate, active_shift_start')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      return data
    }

    const workerName =
      userEmail.split('@')[0]?.replace(/[._-]+/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase()) ||
      DEFAULT_SETTINGS.workerName

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        worker_name: workerName,
        hourly_rate: DEFAULT_SETTINGS.hourlyRate,
        weekly_goal_hours: DEFAULT_SETTINGS.weeklyGoalHours,
        overworks_rate: DEFAULT_SETTINGS.overworksRate,
        active_shift_start: null
      })
      .select('user_id, worker_name, hourly_rate, weekly_goal_hours, overworks_rate, active_shift_start')
      .single()

    if (insertError) {
      throw insertError
    }

    return inserted
  }

  async function handleStartShift() {
    setSettingsNotice(null)

    const nextStart = now.toISOString()
    const { error } = await supabase
      .from('profiles')
      .update({ active_shift_start: nextStart })
      .eq('user_id', userId)

    if (error) {
      setSettingsNotice(error.message)
      return
    }

    setPendingShift(null)
    setSettings((current) => ({ ...current, activeShiftStart: nextStart }))
  }

  async function handleStopShift() {
    if (!settings.activeShiftStart) {
      return
    }

    setSettingsNotice(null)

    const end = now.toISOString()
    const { error } = await supabase
      .from('profiles')
      .update({ active_shift_start: null })
      .eq('user_id', userId)

    if (error) {
      setSettingsNotice(error.message)
      return
    }

    setPendingShift({
      start: settings.activeShiftStart,
      end
    })
    setSettings((current) => ({ ...current, activeShiftStart: null }))
  }

  async function handleContinueShift() {
    if (!pendingShift) {
      return
    }

    setSettingsNotice(null)

    const { error } = await supabase
      .from('profiles')
      .update({ active_shift_start: pendingShift.start })
      .eq('user_id', userId)

    if (error) {
      setSettingsNotice(error.message)
      return
    }

    setPendingShift(null)
    setSettings((current) => ({ ...current, activeShiftStart: pendingShift.start }))
  }

  async function handleSavePendingShift() {
    if (!pendingShift) {
      return
    }

    setSettingsNotice(null)

    const nextEntry: Entry = {
      id: createId(),
      start: pendingShift.start,
      end: pendingShift.end,
      source: 'timer',
      note: 'Tracked shift'
    }

    const { error } = await supabase.from('time_entries').insert({
      id: nextEntry.id,
      user_id: userId,
      start_at: nextEntry.start,
      end_at: nextEntry.end,
      source: nextEntry.source,
      note: nextEntry.note ?? null
    })

    if (error) {
      setSettingsNotice(error.message)
      return
    }

    setEntries((currentEntries) => [nextEntry, ...currentEntries])
    setPendingShift(null)
  }

  function handleRequestDeleteEntry(entry: Entry) {
    setDeleteEntryTarget(entry)
  }

  async function handleDeleteEntry(id: string) {
    const previousEntries = entries
    setIsDeletingEntry(true)
    setEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== id))

    const { error } = await supabase.from('time_entries').delete().eq('id', id).eq('user_id', userId)

    if (error) {
      setEntries(previousEntries)
      setSettingsNotice(error.message)
    }

    setIsDeletingEntry(false)
    setDeleteEntryTarget(null)
  }

  function handleOpenNewManualEntry() {
    setEditingEntryId(null)
    setManualError(null)
    setManualForm(createDefaultManualForm(now))
    setIsManualEntryOpen(true)
  }

  function handleEditEntry(entry: Entry) {
    const start = new Date(entry.start)
    const end = new Date(entry.end)

    setEditingEntryId(entry.id)
    setManualError(null)
    setManualForm({
      date: formatInputDate(start),
      startTime: toInputTime(start),
      endTime: toInputTime(end),
      note: entry.note ?? ''
    })
    setIsManualEntryOpen(true)
  }

  async function handleSubmitManualEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const start = new Date(`${manualForm.date}T${manualForm.startTime}`)
    const end = new Date(`${manualForm.date}T${manualForm.endTime}`)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setManualError('Enter a valid date and time range.')
      return
    }

    if (end <= start) {
      setManualError('End time must be after start time.')
      return
    }

    const nextEntry: Entry = {
      id: editingEntryId ?? createId(),
      start: start.toISOString(),
      end: end.toISOString(),
      source: editingEntryId
        ? entries.find((entry) => entry.id === editingEntryId)?.source ?? 'manual'
        : 'manual',
      note: manualForm.note.trim() || 'Manual entry'
    }

    const { error } = editingEntryId
      ? await supabase
          .from('time_entries')
          .update({
            start_at: nextEntry.start,
            end_at: nextEntry.end,
            source: nextEntry.source,
            note: nextEntry.note ?? null
          })
          .eq('id', editingEntryId)
          .eq('user_id', userId)
      : await supabase.from('time_entries').insert({
          id: nextEntry.id,
          user_id: userId,
          start_at: nextEntry.start,
          end_at: nextEntry.end,
          source: nextEntry.source,
          note: nextEntry.note ?? null
        })

    if (error) {
      setManualError(error.message)
      return
    }

    setEntries((currentEntries) =>
      editingEntryId
        ? currentEntries.map((entry) => (entry.id === editingEntryId ? nextEntry : entry))
        : [nextEntry, ...currentEntries]
    )
    setIsManualEntryOpen(false)
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (settings.hourlyRate < 0 || settings.weeklyGoalHours <= 0 || settings.overworksRate < 1) {
      setSettingsNotice('Hourly rate must be positive, weekly goal above zero, and overworks rate at least 1.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        worker_name: settings.workerName.trim() || DEFAULT_SETTINGS.workerName,
        hourly_rate: settings.hourlyRate,
        weekly_goal_hours: settings.weeklyGoalHours,
        overworks_rate: settings.overworksRate
      })
      .eq('user_id', userId)

    if (error) {
      setSettingsNotice(error.message)
      return
    }

    setSettingsNotice('Settings saved to Supabase.')
    window.setTimeout(() => setSettingsNotice(null), 2500)
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {(isBusy || isRouteLoading) && <DashboardLoadingOverlay />}
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
        <aside className="hidden w-[280px] shrink-0 lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:h-[calc(100dvh-3rem)]">
          <div className="flex h-full w-full flex-col rounded-[32px] border border-slate-200 bg-white px-6 py-8 shadow-sm">
            <Brand />

            <nav className="mt-10" aria-label="Desktop navigation">
              <p className="px-4 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-slate-400">
                Navigation
              </p>
              <div className="mt-4 space-y-2">
                {NAV_ITEMS.map((item) => (
                  <SidebarNavItem
                    key={item.view}
                    active={currentView === item.view}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    onNavigate={handleNavigationStart}
                  />
                ))}
              </div>
            </nav>

            <section className="mt-auto rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-500 p-5 text-white shadow-[0_20px_50px_rgba(67,56,202,0.25)]">
              <p className="text-sm font-semibold text-indigo-100">Active status</p>
              <p className="mt-2 text-2xl font-extrabold">
                {settings.activeShiftStart
                  ? formatElapsedTimer(activeShiftDurationMs)
                  : 'Off shift'}
              </p>
              <p className="mt-2 text-sm text-indigo-100">
                {settings.activeShiftStart
                  ? `Started ${formatTime(new Date(settings.activeShiftStart))}`
                  : 'Start a shift to track hours live.'}
              </p>
            </section>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="px-4 pb-4 pt-4 sm:px-6 lg:px-8">
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center justify-between gap-4 sm:block">
                  <div className="sm:hidden">
                    <Brand compact />
                  </div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-slate-500 sm:mt-1">
                    {formatLongDate(now)}
                  </p>
                </div>

                <div className="flex-1 text-left sm:text-center">
                  <h1 className="text-3xl font-extrabold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                    {pageTitle}
                  </h1>
                </div>

                <div className="hidden min-w-[220px] rounded-2xl bg-slate-50 px-4 py-3 text-right sm:block">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Account
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">{userEmail}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-8">
            {loadError ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {loadError}
              </div>
            ) : null}

            {currentView === 'dashboard' ? (
              <DashboardView
                activeShiftDurationMs={activeShiftDurationMs}
                activeShiftStart={settings.activeShiftStart}
                pendingShift={pendingShift}
                earningsTrend={earningsTrend}
                entries={sortedEntries}
                now={now}
                onAddManualEntry={handleOpenNewManualEntry}
                onContinueShift={() => void handleContinueShift()}
                onSaveShift={() => void handleSavePendingShift()}
                onStartShift={() => void handleStartShift()}
                onStopShift={() => void handleStopShift()}
                projectedWeeklyPay={projectedBiWeeklyPay}
                recentEntries={recentEntries}
                settings={settings}
                todayHours={todayHours}
                weekHours={weekHours}
                weeklyGoalProgress={weeklyGoalProgress}
                onDeleteEntry={handleRequestDeleteEntry}
                onEditEntry={handleEditEntry}
              />
            ) : null}

            {currentView === 'entries' ? (
              <EntriesView
                entries={sortedEntries}
                onAddManualEntry={handleOpenNewManualEntry}
                onDeleteEntry={handleRequestDeleteEntry}
                onEditEntry={handleEditEntry}
              />
            ) : null}

            {currentView === 'reports' ? (
              <ReportsView
                entries={sortedEntries}
                hourlyRate={settings.hourlyRate}
                weeklyGoalHours={settings.weeklyGoalHours}
                overworksRate={settings.overworksRate}
                workerName={settings.workerName}
              />
            ) : null}

            {currentView === 'settings' ? (
              <SettingsView
                notice={settingsNotice}
                onSave={(event) => void handleSaveSettings(event)}
                settings={settings}
                setSettings={setSettings}
                userEmail={userEmail}
              />
            ) : null}
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-2">
          {NAV_ITEMS.map((item) => (
            <MobileNavItem
              key={item.view}
              active={currentView === item.view}
              href={item.href}
              icon={item.icon}
              label={item.label}
              onNavigate={handleNavigationStart}
            />
          ))}
        </div>
      </nav>

      {isManualEntryOpen ? (
        <ManualEntryModal
          entryLabel={editingEntryId ? 'Edit entry' : 'Create entry'}
          error={manualError}
          form={manualForm}
          isEditing={Boolean(editingEntryId)}
          onChange={setManualForm}
          onClose={() => setIsManualEntryOpen(false)}
          onSubmit={(event) => void handleSubmitManualEntry(event)}
        />
      ) : null}

      {deleteEntryTarget ? (
        <DeleteEntryModal
          entry={deleteEntryTarget}
          isDeleting={isDeletingEntry}
          onCancel={() => {
            if (!isDeletingEntry) {
              setDeleteEntryTarget(null)
            }
          }}
          onConfirm={() => void handleDeleteEntry(deleteEntryTarget.id)}
        />
      ) : null}
    </main>
  )

  function mapProfileToSettings(profile: ProfileRow): Settings {
    return {
      workerName: profile.worker_name,
      hourlyRate: profile.hourly_rate,
      weeklyGoalHours: profile.weekly_goal_hours,
      overworksRate: profile.overworks_rate ?? DEFAULT_SETTINGS.overworksRate,
      activeShiftStart: profile.active_shift_start
    }
  }

  function mapRowToEntry(row: EntryRow): Entry {
    return {
      id: row.id,
      start: row.start_at,
      end: row.end_at,
      source: row.source,
      note: row.note ?? undefined
    }
  }
}

function DashboardView({
  activeShiftDurationMs,
  activeShiftStart,
  pendingShift,
  entries,
  now,
  onAddManualEntry,
  onContinueShift,
  onSaveShift,
  onStartShift,
  onStopShift,
  recentEntries,
  settings,
  weekHours,
  weeklyGoalProgress,
  onDeleteEntry,
  onEditEntry
}: {
  activeShiftDurationMs: number
  activeShiftStart: string | null
  pendingShift: PendingShift | null
  earningsTrend: number | null
  entries: Entry[]
  now: Date
  onAddManualEntry: () => void
  onContinueShift: () => void
  onSaveShift: () => void
  onStartShift: () => void
  onStopShift: () => void
  projectedWeeklyPay: number
  recentEntries: Entry[]
  settings: Settings
  todayHours: number
  weekHours: number
  weeklyGoalProgress: number
  onDeleteEntry: (entry: Entry) => void
  onEditEntry: (entry: Entry) => void
}) {
  const [weekOffset, setWeekOffset] = useState(0)

  const chartNow = useMemo(() => {
    if (weekOffset === 0) return now
    const d = new Date(now)
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [now, weekOffset])

  const weeklyBars = useMemo(
    () => buildWeeklyChartData(entries, chartNow, weekOffset === 0 ? activeShiftDurationMs : 0),
    [activeShiftDurationMs, chartNow, entries, weekOffset]
  )

  const weekLabel = useMemo(() => {
    const start = getStartOfWeek(chartNow)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    if (weekOffset === 0) return 'This week'
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(start)} – ${fmt(end)}`
  }, [chartNow, weekOffset])

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="rounded-[26px] bg-slate-50 p-4 sm:p-5 lg:min-w-[280px]">
                <div className="flex items-center gap-4">
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-indigo-100 text-indigo-600">
                    <ClockIcon className="h-10 w-10" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Live Timer
                    </p>
                    <p className="mt-2 text-4xl font-extrabold tracking-[-0.06em] text-slate-900 sm:text-5xl">
                      {formatElapsedTimer(activeShiftDurationMs)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {activeShiftStart ? 'Running now' : pendingShift ? 'Paused' : 'Starts at 0:00'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {activeShiftStart ? (
                <>
                  <button
                    type="button"
                    onClick={onStopShift}
                    className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-rose-500 px-6 text-lg font-bold text-white shadow-[0_14px_35px_rgba(67,56,202,0.2)] transition hover:bg-rose-600"
                  >
                    <StopCircleIcon className="h-5 w-5" />
                    Stop Shift
                  </button>

                  <button
                    type="button"
                    onClick={onAddManualEntry}
                    className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    <CalendarDaysIcon className="h-5 w-5" />
                    Add Manual Entry
                  </button>
                </>
              ) : pendingShift ? (
                <>
                  <button
                    type="button"
                    onClick={onContinueShift}
                    className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-6 text-lg font-bold text-white shadow-[0_14px_35px_rgba(67,56,202,0.2)] transition hover:bg-indigo-700"
                  >
                    <PlayIcon className="h-5 w-5" />
                    Continue
                  </button>

                  <button
                    type="button"
                    onClick={onSaveShift}
                    className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-6 text-lg font-bold text-white shadow-[0_14px_35px_rgba(16,185,129,0.2)] transition hover:bg-emerald-600"
                  >
                    <CheckIcon className="h-5 w-5" />
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onStartShift}
                    className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-6 text-lg font-bold text-white shadow-[0_14px_35px_rgba(67,56,202,0.2)] transition hover:bg-indigo-700"
                  >
                    <PlayIcon className="h-5 w-5" />
                    Start Shift
                  </button>

                  <button
                    type="button"
                    onClick={onAddManualEntry}
                    className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    <CalendarDaysIcon className="h-5 w-5" />
                    Add Manual Entry
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <SummaryCard
            title={`Weekly Goal (${settings.weeklyGoalHours}h)`}
            value={formatDuration(weekHours)}
            hint={goalHint(weeklyGoalProgress)}
            icon={<BoltIcon className="h-5 w-5" />}
            tone="amber"
            progress={weeklyGoalProgress}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Weekly Activity</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
                Hours by day
              </h2>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 py-1">
              <button
                type="button"
                onClick={() => { setWeekOffset((o) => o - 1) }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-800"
                aria-label="Previous week"
              >
                ‹
              </button>
              <span className="min-w-[80px] text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                {weekLabel}
              </span>
              <button
                type="button"
                onClick={() => { setWeekOffset((o) => Math.min(o + 1, 0)) }}
                disabled={weekOffset === 0}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Next week"
              >
                ›
              </button>
            </div>
          </div>

          <div className="mt-8">
            <div className="grid h-[220px] grid-cols-7 items-end gap-3 sm:h-[260px]">
              {weeklyBars.map((bar) => (
                <div key={bar.label} className="flex h-full w-full items-end justify-center rounded-2xl bg-slate-50 p-2">
                  <div
                    className="w-full rounded-2xl bg-gradient-to-t from-indigo-600 to-indigo-400"
                    style={{ height: `${Math.max(bar.heightPercent, 8)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-3">
              {weeklyBars.map((bar) => (
                <div key={bar.label} className="text-center">
                  <p className="text-xs font-bold text-slate-600">{bar.label}</p>
                  <p className="text-[10px] text-slate-500">{bar.fullDate}</p>
                  <p className="text-[10px] text-slate-400">{formatShortHours(bar.hours)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Recent Entries</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
                Latest tracked work
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {recentEntries.length} items
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {entry.note || 'Shift entry'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatEntryDate(new Date(entry.start))} • {formatTimeRange(entry)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {formatDuration(getEntryDurationMs(entry) / HOUR_MS)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {entry.source}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditEntry(entry)}
                    aria-label="Edit recent entry"
                    title="Edit entry"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-700"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(entry)}
                    aria-label="Delete recent entry"
                    title="Delete entry"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-100 hover:text-rose-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function EntriesView({
  entries,
  onAddManualEntry,
  onDeleteEntry,
  onEditEntry
}: {
  entries: Entry[]
  onAddManualEntry: () => void
  onDeleteEntry: (entry: Entry) => void
  onEditEntry: (entry: Entry) => void
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Work log</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
            All entries
          </h2>
        </div>
        <button
          type="button"
          onClick={onAddManualEntry}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          <CalendarDaysIcon className="h-4.5 w-4.5" />
          Add Manual Entry
        </button>
      </div>

      <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['Date', 'Time', 'Duration', 'Source', 'Note', ''].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                  {formatEntryDate(new Date(entry.start))}
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">{formatTimeRange(entry)}</td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                  {formatDuration(getEntryDurationMs(entry) / HOUR_MS)}
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                    {entry.source}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">{entry.note || '—'}</td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEditEntry(entry)}
                    aria-label="Edit entry"
                    title="Edit entry"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(entry)}
                    aria-label="Delete entry"
                    title="Delete entry"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3 lg:hidden">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {formatEntryDate(new Date(entry.start))}
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatTimeRange(entry)}</p>
              </div>
              <button
                type="button"
                onClick={() => onEditEntry(entry)}
                aria-label="Edit entry"
                title="Edit entry"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-700"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-extrabold tracking-[-0.04em] text-slate-900">
                  {formatDuration(getEntryDurationMs(entry) / HOUR_MS)}
                </p>
                <p className="mt-1 text-sm text-slate-500">{entry.note || 'Shift entry'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  {entry.source}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(entry)}
                  aria-label="Delete entry"
                  title="Delete entry"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-100 hover:text-rose-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ReportsView({
  entries,
  hourlyRate,
  weeklyGoalHours,
  overworksRate,
  workerName
}: {
  entries: Entry[]
  hourlyRate: number
  weeklyGoalHours: number
  overworksRate: number
  workerName: string
}) {
  const [startDate, setStartDate] = useState(() => defaultReportStartDate())
  const [endDate, setEndDate] = useState(() => formatInputDate(new Date()))
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filteredEntries = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) {
      return []
    }

    return entries.filter((entry) => {
      const entryDate = formatInputDate(new Date(entry.start))
      return entryDate >= startDate && entryDate <= endDate
    })
  }, [endDate, entries, startDate])

  const rangeIsValid = Boolean(startDate && endDate && endDate >= startDate)
  const currentPeriodHours = useMemo(
    () => filteredEntries.reduce((sum, entry) => sum + getEntryDurationMs(entry), 0) / HOUR_MS,
    [filteredEntries]
  )
  const longestShiftHours = useMemo(
    () =>
      filteredEntries.reduce((longest, entry) => {
        const durationHours = getEntryDurationMs(entry) / HOUR_MS
        return Math.max(longest, durationHours)
      }, 0),
    [filteredEntries]
  )
  const averageDailyHours = useMemo(() => {
    const dailyDurations = buildDailyDurations(filteredEntries)
    const values = Object.values(dailyDurations)
    if (values.length === 0) return 0
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }, [filteredEntries])
  const overtimeHours = useMemo(() => {
    const dailyDurations = buildDailyDurations(filteredEntries)
    return Object.values(dailyDurations).reduce((sum, hours) => sum + Math.max(0, hours - 8), 0)
  }, [filteredEntries])
  const shortestShiftHours = useMemo(
    () =>
      filteredEntries.length === 0
        ? 0
        : filteredEntries.reduce((shortest, entry) => {
            const durationHours = getEntryDurationMs(entry) / HOUR_MS
            return Math.min(shortest, durationHours)
          }, Infinity),
    [filteredEntries]
  )
  const regularTrackedHours = useMemo(() => {
    const dailyDurations = buildDailyDurations(filteredEntries)
    return Object.values(dailyDurations).reduce((sum, hours) => sum + Math.min(hours, 8), 0)
  }, [filteredEntries])
  const regularPay = regularTrackedHours * hourlyRate
  const overtimePay = overtimeHours * hourlyRate * overworksRate
  const periodGoalHours = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return weeklyGoalHours
    const start = new Date(`${startDate}T12:00:00`)
    const end = new Date(`${endDate}T12:00:00`)
    let workdays = 0
    const cursor = new Date(start)
    while (cursor <= end) {
      const dow = cursor.getDay()
      if (dow !== 0 && dow !== 6) workdays++
      cursor.setDate(cursor.getDate() + 1)
    }
    return (workdays / 5) * weeklyGoalHours
  }, [startDate, endDate, weeklyGoalHours])
  const expectedRegularHours = Math.min(currentPeriodHours, periodGoalHours)
  const expectedOvertimeHours = Math.max(0, currentPeriodHours - periodGoalHours)
  const expectedRegularPay = expectedRegularHours * hourlyRate
  const expectedOvertimePay = expectedOvertimeHours * hourlyRate * overworksRate
  const periodBars = useMemo(() => {
    const dailyDurations = buildDailyDurations(filteredEntries)

    return Object.entries(dailyDurations)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([dateKey, hours]) => {
        const d = new Date(`${dateKey}T12:00:00`)
        return {
          dateKey,
          hours,
          fullDate: formatEntryDate(d),
          weekday: d.toLocaleDateString('en-US', { weekday: 'short' })
        }
      })
  }, [filteredEntries])
  const reportRangeLabel = rangeIsValid ? formatReportRangeLabel(startDate, endDate) : 'Select a valid range'
  const periodLabel = activePresetLabel ?? reportRangeLabel
  const presetRanges = useMemo(() => buildReportPresetRanges(), [])

  function handleGeneratePdf() {
    if (!rangeIsValid) {
      return
    }

    const reportBytes = createPayPeriodPdf({
      endDate,
      entries: filteredEntries,
      startDate,
      workerName
    })

  }

  return (
    <section className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-slate-500">Pay period</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
              Report range
            </h2>
            <p className="mt-1 text-sm text-slate-500">{periodLabel}</p>
          </div>
          <ChevronDownIcon
            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {filtersOpen && (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:min-w-[420px]">
              <Field label="Start date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => { setStartDate(event.target.value); setActivePresetLabel(null) }}
                  className={inputClassName}
                />
              </Field>
              <Field label="End date">
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => { setEndDate(event.target.value); setActivePresetLabel(null) }}
                  className={inputClassName}
                />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {presetRanges.map((preset) => {
                const isActive = activePresetLabel === preset.label

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setStartDate(preset.startDate)
                      setEndDate(preset.endDate)
                      setActivePresetLabel(preset.label)
                    }}
                    className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={!rangeIsValid}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Download PDF Report
              </button>
            </div>
          </>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PayBreakdownCard
          regularHours={regularTrackedHours}
          overtimeHours={overtimeHours}
          regularPay={regularPay}
          overtimePay={overtimePay}
          hourlyRate={hourlyRate}
          overworksRate={overworksRate}
          hint={periodLabel}
        />
        <PayBreakdownCard
          title="Expected Salary"
          regularHours={expectedRegularHours}
          overtimeHours={expectedOvertimeHours}
          regularPay={expectedRegularPay}
          overtimePay={expectedOvertimePay}
          hourlyRate={hourlyRate}
          overworksRate={overworksRate}
          hint={periodLabel}
        />
        <SummaryCard
          title="Pay Period Hours"
          value={formatDuration(currentPeriodHours)}
          hint={periodLabel}
          icon={<ClockIcon className="h-5 w-5" />}
          tone="indigo"
        />
        <SummaryCard
          title="Average Day"
          value={formatDuration(averageDailyHours)}
          hint={periodLabel}
          icon={<ChartBarIcon className="h-5 w-5" />}
          tone="slate"
        />
        <SummaryCard
          title="Longest Shift"
          value={formatDuration(longestShiftHours)}
          hint={periodLabel}
          icon={<BoltIcon className="h-5 w-5" />}
          tone="amber"
        />
        <SummaryCard
          title="Shortest Shift"
          value={filteredEntries.length === 0 ? '—' : formatDuration(shortestShiftHours)}
          hint={periodLabel}
          icon={<ClockIcon className="h-5 w-5" />}
          tone="slate"
        />
        <SummaryCard
          title="Overtime Hours"
          value={formatDuration(overtimeHours)}
          hint={periodLabel}
          icon={<BoltIcon className="h-5 w-5" />}
          tone="amber"
        />
        <SummaryCard
          title="Entries"
          value={rangeIsValid ? String(filteredEntries.length) : '—'}
          hint={periodLabel}
          icon={<QueueListIcon className="h-5 w-5" />}
          tone="indigo"
        />
      </div>

      {rangeIsValid && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">{periodLabel}</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
                Period Goal
              </h2>
            </div>
            <p className="text-right text-sm font-bold text-slate-500">
              {formatShortHours(periodGoalHours)} goal
            </p>
          </div>

          {(() => {
            const total = currentPeriodHours
            const remainingHours = Math.max(0, periodGoalHours - total)
            const totalPct = periodGoalHours > 0 ? Math.min((total / periodGoalHours) * 100, 100) : 0
            const regularPct = total > 0 ? (regularTrackedHours / total) * totalPct : 0
            const overtimePct = totalPct - regularPct

            return (
              <>
                <div className="mt-6 h-5 overflow-hidden rounded-full bg-slate-100">
                  <div className="flex h-full">
                    <div
                      className="h-full rounded-l-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${regularPct}%` }}
                    />
                    {overtimePct > 0 && (
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${overtimePct}%` }}
                      />
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600" />
                    <span className="font-semibold text-slate-700">{formatShortHours(regularTrackedHours)}</span>
                    <span className="text-slate-500">regular</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="font-semibold text-slate-700">{formatShortHours(overtimeHours)}</span>
                    <span className="text-slate-500">overtime</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="font-semibold text-slate-700">{formatShortHours(total)}</span>
                    <span className="text-slate-500">total</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="font-semibold text-slate-700">{formatShortHours(remainingHours)}</span>
                    <span className="text-slate-500">remaining</span>
                  </span>
                </div>
              </>
            )
          })()}
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-slate-500">Pay period distribution</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
          Hours by day
        </h2>

        {periodBars.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No entries found for the selected range.</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div
              className="grid h-[240px] items-end gap-2 sm:h-[280px]"
              style={{
                gridTemplateColumns: `repeat(${periodBars.length}, minmax(44px, 1fr))`,
                minWidth: `${Math.max(periodBars.length * 52, 100)}px`
              }}
            >
              {(() => {
                const peak = Math.max(...periodBars.map((b) => b.hours), 1)
                return periodBars.map((bar) => (
                  <div key={bar.dateKey} className="flex h-full flex-col items-center justify-end gap-2">
                    <div className="flex h-full w-full items-end justify-center rounded-xl bg-slate-50 p-1">
                      <div
                        className="w-full rounded-xl bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-300"
                        style={{ height: `${Math.max((bar.hours / peak) * 100, 6)}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-600">{bar.weekday}</p>
                      <p className="text-[10px] text-slate-500">{new Date(`${bar.dateKey}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      <p className="text-[10px] text-slate-400">{formatShortHours(bar.hours)}</p>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-slate-500">Pay period distribution</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
          Daily breakdown
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {periodBars.map((bar) => (
            <div key={bar.dateKey} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{bar.fullDate}</p>
                  <p className="mt-1 text-xs text-slate-500">{bar.dateKey}</p>
                </div>
                <p className="text-lg font-extrabold tracking-[-0.04em] text-slate-900">
                  {formatShortHours(bar.hours)}
                </p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden">
                {(() => {
                  const peak = Math.max(...periodBars.map((item) => item.hours), 1)
                  const normalHours = Math.min(bar.hours, 8)
                  const overtimeHours = Math.max(bar.hours - 8, 0)
                  const normalWidth = periodBars.length > 0 ? (normalHours / peak) * 100 : 0
                  const overtimeWidth = periodBars.length > 0 ? (overtimeHours / peak) * 100 : 0
                  return (
                    <div className="flex h-full">
                      <div className="h-full bg-indigo-600" style={{ width: `${Math.max(normalWidth, bar.hours > 0 ? 8 : 0)}%` }} />
                      {overtimeHours > 0 && (
                        <div className="h-full bg-amber-500" style={{ width: `${overtimeWidth}%` }} />
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          ))}
          {periodBars.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              No entries found for the selected range.
            </div>
          ) : null}
        </div>
      </section>
    </section>
  )
}

function SettingsView({
  notice,
  onSave,
  settings,
  setSettings,
  userEmail
}: {
  notice: string | null
  onSave: (event: FormEvent<HTMLFormElement>) => void
  settings: Settings
  setSettings: Dispatch<SetStateAction<Settings>>
  userEmail: string
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={onSave} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-slate-500">Preferences</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
          Time tracking settings
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Worker name">
            <input
              value={settings.workerName}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  workerName: event.target.value
                }))
              }
              className={inputClassName}
              placeholder="Your name"
            />
          </Field>

          <Field label="Hourly rate">
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.hourlyRate}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  hourlyRate: Number(event.target.value)
                }))
              }
              className={inputClassName}
            />
          </Field>

          <Field label="Weekly goal (hours)">
            <input
              type="number"
              min="1"
              step="0.5"
              value={settings.weeklyGoalHours}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  weeklyGoalHours: Number(event.target.value)
                }))
              }
              className={inputClassName}
            />
          </Field>

          <Field label="Overworks rate (×)">
            <input
              type="number"
              min="1"
              step="0.05"
              value={settings.overworksRate}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  overworksRate: Number(event.target.value)
                }))
              }
              className={inputClassName}
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Save Settings
          </button>
        </div>

        {notice ? <p className="mt-4 text-sm font-semibold text-emerald-600">{notice}</p> : null}
      </form>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-slate-500">Profile summary</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
          Active configuration
        </h2>
        <div className="mt-6 space-y-4">
          <SettingsMetric label="Email" value={userEmail || 'Not available'} />
          <SettingsMetric label="Worker" value={settings.workerName || 'Not set'} />
          <SettingsMetric label="Hourly rate" value={formatCurrency(settings.hourlyRate)} />
          <SettingsMetric label="Weekly goal" value={`${settings.weeklyGoalHours.toFixed(1)} hours`} />
          <SettingsMetric label="Overworks rate" value={`${settings.overworksRate.toFixed(2)}×`} />
          <SettingsMetric label="Storage" value="Supabase cloud database" />
        </div>

        <div className="mt-6 rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-500">Session</p>
          <form action="/auth/signout" method="post" className="mt-3">
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Sign Out
            </button>
          </form>
        </div>
      </section>
    </section>
  )
}

function ManualEntryModal({
  entryLabel,
  error,
  form,
  isEditing,
  onChange,
  onClose,
  onSubmit
}: {
  entryLabel: string
  error: string | null
  form: ManualFormState
  isEditing: boolean
  onChange: Dispatch<SetStateAction<ManualFormState>>
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-3">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">{entryLabel}</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
              {isEditing ? 'Update time entry' : 'Add manual time'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  onChange((current) => ({ ...current, date: event.target.value }))
                }
                className={inputClassName}
                required
              />
            </Field>
            <Field label="Start">
              <input
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  onChange((current) => ({ ...current, startTime: event.target.value }))
                }
                className={inputClassName}
                required
              />
            </Field>
            <Field label="End">
              <input
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  onChange((current) => ({ ...current, endTime: event.target.value }))
                }
                className={inputClassName}
                required
              />
            </Field>
          </div>

          <Field label="Note">
            <input
              type="text"
              value={form.note}
              onChange={(event) =>
                onChange((current) => ({ ...current, note: event.target.value }))
              }
              className={inputClassName}
              placeholder="What was this shift for?"
            />
          </Field>

          {error ? <p className="text-sm font-semibold text-rose-500">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white"
            >
              {isEditing ? 'Save Changes' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteEntryModal({
  entry,
  isDeleting,
  onCancel,
  onConfirm
}: {
  entry: Entry
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-3">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-rose-500">Delete entry</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-slate-900">
              Confirm deletion
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-6 text-sm text-slate-600">
          Delete the entry for {formatEntryDate(new Date(entry.start))} ({formatTimeRange(entry)})?
          This action cannot be undone.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-500 px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function defaultReportStartDate() {
  const date = new Date()
  const day = date.getDay()
  const diff = day === 0 ? -13 : 1 - day - 7
  date.setDate(date.getDate() + diff)
  return formatInputDate(date)
}

function getEndOfWeek(date: Date): Date {
  return addDays(getStartOfWeek(date), 4) // Friday
}

function buildReportPresetRanges() {
  const now = new Date()

  const yesterday = addDays(now, -1)

  return [
    createReportPreset('This week', getStartOfWeek(now), getEndOfWeek(now)),
    createReportPreset('Last 2 weeks', addDays(yesterday, -13), yesterday),
    createReportPreset('Last 4 weeks', addDays(yesterday, -27), yesterday),
    createReportPreset('This month to date', getStartOfMonth(now), now),
    createReportPreset('This month', getStartOfMonth(now), getEndOfMonth(now)),
    createReportPreset('Last month', getStartOfPreviousMonth(now), getEndOfPreviousMonth(now))
  ]
}

function createReportPreset(label: string, start: Date, end: Date) {
  return {
    label,
    startDate: formatInputDate(start),
    endDate: formatInputDate(end)
  }
}

function formatReportRangeLabel(startDate: string, endDate: string) {
  return `${formatLongDate(new Date(`${startDate}T12:00:00`))} – ${formatLongDate(
    new Date(`${endDate}T12:00:00`)
  )}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getEndOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function getStartOfPreviousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

function getEndOfPreviousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 0)
}

function openPdfReport(reportBytes: Uint8Array) {
  const reportBuffer = new Uint8Array(reportBytes).buffer as ArrayBuffer
  const reportBlob = new Blob([reportBuffer], { type: 'application/pdf' })
  const reportUrl = URL.createObjectURL(reportBlob)
  const previewWindow = window.open(reportUrl, '_blank', 'noopener,noreferrer')

  if (!previewWindow) {
    window.setTimeout(() => URL.revokeObjectURL(reportUrl), 1000)
    return false
  }

  window.setTimeout(() => URL.revokeObjectURL(reportUrl), 60_000)
  return true
}

function createPayPeriodPdf({
  endDate,
  entries,
  startDate,
  workerName
}: {
  endDate: string
  entries: Entry[]
  startDate: string
  workerName: string
}) {
  const pageWidth = 612
  const pageHeight = 792
  const marginLeft = 44
  const marginRight = 44
  const topStart = 730
  const bottomMargin = 52
  const rowHeight = 34
  const contentWidth = pageWidth - marginLeft - marginRight
  const dateColumnX = marginLeft + 16
  const timeColumnX = marginLeft + 200
  const durationColumnX = marginLeft + 430
  const totalHours = entries.reduce((sum, entry) => sum + getEntryDurationMs(entry), 0) / HOUR_MS

  const rows = entries.map((entry) => ({
    date: formatEntryDate(new Date(entry.start)),
    time: formatPdfTimeRange(entry),
    duration: formatDuration(getEntryDurationMs(entry) / HOUR_MS)
  }))

  const pages: string[] = []
  let rowIndex = 0

  while (rowIndex < rows.length || pages.length === 0) {
    let cursorY = topStart
    let content = ''

    content += pdfRect(marginLeft, cursorY - 56, contentWidth, 78, '0.12 0.16 0.28 rg')
    content += pdfText('Pay Period Report', marginLeft + 20, cursorY - 22, 22, {
      color: '1 1 1 rg',
      font: 'bold'
    })
    cursorY -= 108

    content += pdfRect(marginLeft, cursorY - 8, contentWidth / 2 - 8, 48, '0.96 0.97 0.99 rg')
    content += pdfRect(marginLeft + contentWidth / 2 + 8, cursorY - 8, contentWidth / 2 - 8, 48, '0.96 0.97 0.99 rg')
    content += pdfText('WORKER', marginLeft + 16, cursorY + 22, 9, {
      color: '0.39 0.45 0.58 rg',
      font: 'bold'
    })
    content += pdfText(workerName || 'Not set', marginLeft + 16, cursorY + 6, 12, {
      font: 'bold'
    })
    content += pdfText('RANGE', marginLeft + contentWidth / 2 + 24, cursorY + 22, 9, {
      color: '0.39 0.45 0.58 rg',
      font: 'bold'
    })
    content += pdfText(formatPdfDateRange(startDate, endDate), marginLeft + contentWidth / 2 + 24, cursorY + 6, 12, {
      font: 'bold'
    })
    cursorY -= 40
    content += pdfStrokeLine(marginLeft, cursorY - 8, pageWidth - marginRight, cursorY - 8, '0.84 G')
    cursorY -= 38

    content += pdfRect(marginLeft, cursorY - 24, contentWidth, 34, '0.21 0.27 0.40 rg')
    content += pdfText('DATE', dateColumnX, cursorY - 4, 10, {
      color: '1 1 1 rg',
      font: 'bold'
    })
    content += pdfText('TIME', timeColumnX, cursorY - 4, 10, {
      color: '1 1 1 rg',
      font: 'bold'
    })
    content += pdfText('HOURS', durationColumnX, cursorY - 4, 10, {
      color: '1 1 1 rg',
      font: 'bold'
    })
    cursorY -= 42

    while (rowIndex < rows.length && cursorY > bottomMargin + rowHeight * 2) {
      const row = rows[rowIndex]
      if (rowIndex % 2 === 0) {
        content += pdfRect(marginLeft, cursorY - 20, contentWidth, 28, '0.985 0.988 0.995 rg')
      }

      content += pdfText(row.date, dateColumnX, cursorY, 10, {
        font: 'bold'
      })
      content += pdfText(row.time, timeColumnX, cursorY, 10)
      content += pdfText(row.duration, durationColumnX, cursorY, 10, {
        font: 'bold'
      })
      content += pdfStrokeLine(marginLeft, cursorY - 14, pageWidth - marginRight, cursorY - 14, '0.88 G')
      cursorY -= rowHeight
      rowIndex += 1
    }

    if (rowIndex >= rows.length) {
      const totalBoxY = Math.max(cursorY - 38, 58)
      content += pdfRect(marginLeft, totalBoxY, contentWidth, 56, '0.89 0.93 0.99 rg')
      content += pdfText('TOTAL HOURS', marginLeft + 18, totalBoxY + 33, 11, {
        color: '0.21 0.27 0.40 rg',
        font: 'bold'
      })
      content += pdfText(formatDuration(totalHours), durationColumnX, totalBoxY + 33, 14, {
        font: 'bold'
      })
    }

    pages.push(content)
  }

  return buildPdfDocument({
    pageHeight,
    pageWidth,
    pages
  })
}

function buildPdfDocument({
  pageHeight,
  pageWidth,
  pages
}: {
  pageHeight: number
  pageWidth: number
  pages: string[]
}) {
  const objects: string[] = []
  const pageObjectNumbers: number[] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('')

  for (const pageContent of pages) {
    const contentObjectNumber = objects.length + 1
    const contentStream = toPdfBytes(pageContent)
    objects.push(
      `<< /Length ${contentStream.length} >>\nstream\n${pageContent}\nendstream`
    )

    const pageObjectNumber = objects.length + 1
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectNumber} 0 R >>`
    )
    pageObjectNumbers.push(pageObjectNumber)
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((value) => `${value} 0 R`).join(' ')}] /Count ${pageObjectNumbers.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return toPdfBytes(pdf)
}

function pdfText(
  value: string,
  x: number,
  y: number,
  fontSize: number,
  options?: {
    color?: string
    font?: 'regular' | 'bold'
  }
) {
  const fontName = options?.font === 'bold' ? 'F2' : 'F1'
  const colorCommand = options?.color ? `${options.color} ` : ''
  return `q ${colorCommand}BT /${fontName} ${fontSize} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(value)}) Tj ET Q\n`
}

function pdfRect(x: number, y: number, width: number, height: number, fillColorCommand: string) {
  return `q ${fillColorCommand} ${x} ${y} ${width} ${height} re f Q\n`
}

function pdfStrokeLine(startX: number, startY: number, endX: number, endY: number, strokeColorCommand: string) {
  return `q ${strokeColorCommand} ${startX} ${startY} m ${endX} ${endY} l S Q\n`
}

function escapePdfText(value: string) {
  return sanitizePdfText(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
}

function sanitizePdfText(value: string) {
  return value.replaceAll(/[^\x20-\x7E]/g, '?')
}

function toPdfBytes(value: string) {
  return new TextEncoder().encode(value)
}

function formatPdfTimeRange(entry: Entry) {
  return `${formatTime(new Date(entry.start))} - ${formatTime(new Date(entry.end))}`
}

function formatPdfDateRange(startDate: string, endDate: string) {
  return `${formatEntryDate(new Date(`${startDate}T12:00:00`))} - ${formatEntryDate(
    new Date(`${endDate}T12:00:00`)
  )}`
}

function toInputTime(date: Date) {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-full border border-indigo-200 text-indigo-600">
        <ClockIcon className="h-4.5 w-4.5" />
      </div>
      <span
        className={`font-extrabold leading-none tracking-[-0.03em] text-indigo-600 ${
          compact ? 'text-2xl' : 'text-[1.9rem]'
        }`}
      >
        PayReport
      </span>
    </div>
  )
}

function PayBreakdownCard({
  title = 'Pay Breakdown',
  regularHours,
  overtimeHours,
  regularPay,
  overtimePay,
  hourlyRate,
  overworksRate,
  hint
}: {
  title?: string
  regularHours: number
  overtimeHours: number
  regularPay: number
  overtimePay: number
  hourlyRate: number
  overworksRate: number
  hint?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const totalPay = regularPay + overtimePay

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <BanknotesIcon className="h-5 w-5" />
        </div>
        {hint ? <p className="text-right text-xs font-bold text-slate-500">{hint}</p> : null}
      </div>
      <button
        onClick={() => setIsOpen(o => !o)}
        className="mt-5 flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={isOpen}
      >
        <h2 className="text-sm font-semibold text-slate-500">{title}</h2>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <p className="mt-2 text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-slate-900">
        {formatCurrency(totalPay)}
      </p>
      {isOpen && (
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <span className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
              <span>
                <span className="font-medium text-slate-700">Regular</span>
                <span className="mt-0.5 block text-xs text-slate-400">{formatShortHours(regularHours)} × {formatCurrency(hourlyRate)}</span>
              </span>
            </span>
            <span className="font-semibold text-slate-800">{formatCurrency(regularPay)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <span>
                <span className="font-medium text-slate-700">Overtime</span>
                <span className="mt-0.5 block text-xs text-slate-400">{formatShortHours(overtimeHours)} × {formatCurrency(hourlyRate * overworksRate)}</span>
              </span>
            </span>
            <span className="font-semibold text-slate-800">{formatCurrency(overtimePay)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <span className="font-semibold text-slate-700">Total</span>
            <span className="text-base font-bold text-slate-900">{formatCurrency(totalPay)}</span>
          </div>
        </div>
      )}
    </section>
  )
}

function SummaryCard({
  title,
  value,
  hint,
  icon,
  tone = 'slate',
  progress
}: SummaryCardProps) {
  const toneClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-600'
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${toneClasses[tone]}`}>
          {icon}
        </div>
        {hint ? <p className="text-right text-xs font-bold text-slate-500">{hint}</p> : null}
      </div>
      <h2 className="mt-5 text-sm font-semibold text-slate-500">{title}</h2>
      <p className="mt-2 text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-slate-900">
        {value}
      </p>
      {typeof progress === 'number' ? (
        <div className="mt-5 h-2 rounded-full bg-indigo-100">
          <div
            className="h-full rounded-full bg-indigo-600"
            style={{ width: `${Math.max(0, Math.min(progress, 1)) * 100}%` }}
          />
        </div>
      ) : null}
    </section>
  )
}

function SidebarNavItem({
  active,
  href,
  icon,
  label,
  onNavigate
}: {
  active: boolean
  href: string
  icon: ReactNode
  label: string
  onNavigate: (href: string) => void
}) {
  return (
    <Link
      href={href}
      scroll
      onClick={() => onNavigate(href)}
      className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-bold transition ${
        active
          ? 'border-indigo-500/30 bg-indigo-600 text-white shadow-[0_12px_30px_rgba(67,56,202,0.24)]'
          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
          active
            ? 'bg-white/15 text-white'
            : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full transition ${
          active ? 'bg-white' : 'bg-slate-200 group-hover:bg-indigo-200'
        }`}
      />
    </Link>
  )
}

function MobileNavItem({
  active,
  href,
  icon,
  label,
  onNavigate
}: {
  active: boolean
  href: string
  icon: ReactNode
  label: string
  onNavigate: (href: string) => void
}) {
  return (
    <Link
      href={href}
      scroll
      onClick={() => onNavigate(href)}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[0.7rem] font-semibold ${
        active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function DashboardLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[32px] border border-white/60 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-indigo-600">
          PayReport
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.05em] text-slate-900">
          Loading workspace
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Menu stays mounted while the next page loads.
        </p>
      </div>
    </div>
  )
}

function SettingsMetric({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold tracking-[-0.04em] text-slate-900">{value}</p>
    </div>
  )
}
